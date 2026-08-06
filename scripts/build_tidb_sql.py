#!/usr/bin/env python3
"""
Build a TiDB-compatible SQL dump from the MySQL dump (umpi_full.sql).

Differences vs MySQL dump:
  - Updated header to mention TiDB Cloud
  - ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY statements are wrapped in
    /* ... */ block comments (TiDB ignores FK constraints anyway; this avoids
    any parser warnings/errors).
  - Everything else (CREATE TABLE, DELETE, INSERT, SET statements) is kept
    verbatim from the MySQL source.
"""

from pathlib import Path

SRC = Path("/home/z/my-project/database/umpi_full.sql")
DST = Path("/home/z/my-project/database/umpi_tidb.sql")

# New TiDB header (replaces the first 22 lines of the source)
TIDB_HEADER = """\
-- ════════════════════════════════════════════════════════════
--  UMPI Marketplace — Volcado COMPLETO para TiDB Cloud
--  (Compatible con MySQL, optimizado para TiDB Serverless)
--  Importar con: TiDB Cloud → SQL Editor → pegar y ejecutar
--  Tablas: ~20 | Registros: 16 usuarios, 33 publicaciones, etc.
-- ════════════════════════════════════════════════════════════
--
--  CÓMO USAR:
--    1) En TiDB Cloud, entrá a tu cluster Serverless.
--    2) Andá a "SQL Editor" (o "Chat2Query").
--    3) Pegá todo este archivo y ejecutá (Ctrl+Enter o botón "Run").
--    4) ¡Listo! Este archivo crea TODAS las tablas y carga TODOS los datos.
--
--  CREDENCIALES DE ACCESO:
--    Admin: admin@umpi.com.ar / admin123   (contraseña hasheada con bcrypt)
--
--  NOTAS SOBRE TiDB:
--    · TiDB es 100% compatible con MySQL pero NO soporta FOREIGN KEY
--      constraints (acepta la sintaxis pero la ignora). Por eso los
--      ALTER TABLE ... ADD CONSTRAINT están comentados con /* ... */.
--    · SET FOREIGN_KEY_CHECKS es aceptado (no hace nada) y se mantiene
--      por compatibilidad con MySQL.
--    · El charset utf8mb4 ya es el default en todas las tablas.
--    · Los IDs (CUID) están harcodeados en los INSERT para preservar
--      las referencias entre tablas.
--
--  Estructura del archivo:
--    · SET FOREIGN_KEY_CHECKS = 0;
--    · CREATE TABLE                          (esquema, 20 tablas)
--    · DELETE + INSERT                       (datos: usuarios, listings, etc.)
--    · /* ALTER TABLE ... ADD CONSTRAINT */  (foreign keys comentados)
--    · SET FOREIGN_KEY_CHECKS = 1;
-- ════════════════════════════════════════════════════════════
"""

src_lines = SRC.read_text(encoding="utf-8").splitlines(keepends=True)

def find_line(needle, start=0):
    for i in range(start, len(src_lines)):
        if src_lines[i].rstrip("\n") == needle:
            return i  # 0-indexed
    raise RuntimeError(f"marker not found: {needle!r}")

idx_set_fkc0   = find_line("SET FOREIGN_KEY_CHECKS = 0;")
idx_set_names  = find_line("SET NAMES utf8mb4;")
idx_set_sqlmode = find_line("SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';")
idx_schema_cmt = find_line("-- ─── ESQUEMA: CREATE TABLE ───")
idx_data_cmt   = find_line("-- ─── DATOS: INSERT ───")
idx_set_fkc1   = find_line("SET FOREIGN_KEY_CHECKS = 1;")

# Find the first "ALTER TABLE ... ADD CONSTRAINT" line (after CREATE TABLEs)
idx_first_alter = None
for i in range(idx_schema_cmt, idx_data_cmt):
    if src_lines[i].startswith("ALTER TABLE ") and "ADD CONSTRAINT" in src_lines[i]:
        idx_first_alter = i
        break
assert idx_first_alter is not None, "no ALTER TABLE ... ADD CONSTRAINT found"

# The "-- AddForeignKey" comment line that PRECEDES the first ALTER TABLE
# logically belongs to the FK section, not to the CREATE TABLE section.
# Find it so we can include it in the FK block (and exclude it from CREATEs).
idx_fk_block_start = idx_first_alter
if idx_first_alter > 0 and src_lines[idx_first_alter - 1].startswith("-- AddForeignKey"):
    idx_fk_block_start = idx_first_alter - 1

# Walk backwards from idx_data_cmt to find the last ALTER TABLE line
idx_last_alter = None
for i in range(idx_data_cmt - 1, idx_first_alter - 1, -1):
    if src_lines[i].startswith("ALTER TABLE ") and "ADD CONSTRAINT" in src_lines[i]:
        idx_last_alter = i
        break
assert idx_last_alter is not None, "no last ALTER TABLE found"

# Build the ALTER-block-as-comment: preserve the "-- AddForeignKey"
# comment lines, but wrap each ALTER TABLE statement in /* ... */.
fk_comment_lines = []
for i in range(idx_fk_block_start, idx_last_alter + 1):
    line = src_lines[i]
    stripped = line.rstrip("\n")
    if line.startswith("ALTER TABLE "):
        # Wrap the ALTER TABLE statement in /* */ to disable it.
        fk_comment_lines.append("/* " + stripped + " */\n")
    elif line.startswith("-- "):
        # Preserve "-- AddForeignKey" comments as-is
        fk_comment_lines.append(line)
    elif stripped == "":
        # Preserve blank lines between statements
        fk_comment_lines.append("\n")
    else:
        # Anything else: pass through (shouldn't really happen)
        fk_comment_lines.append(line)

# Count ALTER TABLE ADD CONSTRAINT statements that we commented out
n_alter = sum(1 for l in fk_comment_lines if l.startswith("/* ALTER TABLE "))

# Build the new file content
out = []
out.append(TIDB_HEADER)
out.append("\n")
# SET statements
out.append(src_lines[idx_set_fkc0])    # SET FOREIGN_KEY_CHECKS = 0;
out.append(src_lines[idx_set_names])   # SET NAMES utf8mb4;
out.append(src_lines[idx_set_sqlmode]) # SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
out.append("\n")
# Schema section header + all CREATE TABLEs
out.append(src_lines[idx_schema_cmt])  # -- ─── ESQUEMA: CREATE TABLE ───
out.append("\n")
# CREATE TABLE block: from line after schema_cmt to line before the FK
# section starts (so we exclude the "-- AddForeignKey" comment that
# precedes the first ALTER TABLE).
for i in range(idx_schema_cmt + 1, idx_fk_block_start):
    out.append(src_lines[i])

# Data section header + DELETE + INSERT statements.
out.append("\n")
out.append(src_lines[idx_data_cmt])  # -- ─── DATOS: INSERT ───
# Everything from line after data_cmt up to (but not including) SET FOREIGN_KEY_CHECKS = 1;
for i in range(idx_data_cmt + 1, idx_set_fkc1):
    out.append(src_lines[i])

# FK section (commented out)
out.append("\n")
out.append("-- ─── FOREIGN KEYS (comentados — TiDB no los soporta, los ignora) ───\n")
out.append("\n")
out.extend(fk_comment_lines)
out.append("\n")

# Final SET
out.append(src_lines[idx_set_fkc1])  # SET FOREIGN_KEY_CHECKS = 1;
out.append("\n")  # trailing newline

DST.write_text("".join(out), encoding="utf-8")

# Verify
text = DST.read_text(encoding="utf-8")
n_create = sum(1 for l in text.splitlines() if l.startswith("CREATE TABLE "))
n_insert = sum(1 for l in text.splitlines() if l.startswith("INSERT INTO "))
n_delete = sum(1 for l in text.splitlines() if l.startswith("DELETE FROM "))
n_alter_commented = sum(1 for l in text.splitlines() if l.startswith("/* ALTER TABLE "))
n_alter_active = sum(1 for l in text.splitlines() if l.startswith("ALTER TABLE "))

size_bytes = DST.stat().st_size

print(f"OK  Wrote {DST}")
print(f"    Size:              {size_bytes} bytes ({size_bytes/1024:.1f} KB)")
print(f"    CREATE TABLE:      {n_create}")
print(f"    INSERT INTO:       {n_insert}")
print(f"    DELETE FROM:       {n_delete}")
print(f"    ALTER commented:   {n_alter_commented}")
print(f"    ALTER active:      {n_alter_active}  (should be 0)")
