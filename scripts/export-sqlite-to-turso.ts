// ════════════════════════════════════════════════════════════
//  export-sqlite-to-turso.ts
//  Exporta la base SQLite local a un formato importable por Turso (libSQL)
// ════════════════════════════════════════════════════════════
//  Uso:
//    bun run scripts/export-sqlite-to-turso.ts
//
//  Genera: database/umpi_turso.sql
//  Importación: turso db shell umpi < database/umpi_turso.sql
//               o pegar el contenido en Turso SQL Editor
// ════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const db = new PrismaClient();

// ─── Helpers ───
function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") {
    // BigInt, Decimal, etc.
    if (typeof val.toString === "function") {
      return `'${sqlEscapeString(val.toString())}'`;
    }
    return "NULL";
  }
  // string
  return `'${sqlEscapeString(String(val))}'`;
}

function sqlEscapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\x00/g, "")
    .replace(/\n/g, "\n")
    .replace(/\r/g, "\r");
}

function getColumns(model: any): string[] {
  // Prisma exposes fields via _meta or we hardcode from known models
  // Simpler: just fetch one record and use Object.keys
  return [];
}

async function exportTable(
  modelName: string,
  prismaModel: any
): Promise<{ name: string; count: number; sql: string }> {
  const records = await prismaModel.findMany();
  if (records.length === 0) {
    return { name: modelName, count: 0, sql: `-- ${modelName}: (sin datos)\n` };
  }

  // Columnas a partir del primer record
  const columns = Object.keys(records[0]);
  const colList = columns.map((c) => `\`${c}\``).join(", ");

  const blocks: string[] = [];
  blocks.push(`-- ─── ${modelName} (${records.length} registros) ───`);
  blocks.push(`DELETE FROM \`${modelName}\`;`);

  // Insertar en bloques de 50 para no saturar
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const values = batch
      .map((r: any) => {
        const vals = columns.map((c) => sqlEscape(r[c]));
        return `(${vals.join(", ")})`;
      })
      .join(",\n  ");
    blocks.push(
      `INSERT INTO \`${modelName}\` (${colList}) VALUES\n  ${values};`
    );
  }

  return {
    name: modelName,
    count: records.length,
    sql: blocks.join("\n") + "\n",
  };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Exportando SQLite → Turso (libSQL)                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  // Orden: tablas padres primero, dependientes después
  // (aunque con SET foreign_keys=OFF no importa)
  const tables: Array<[string, any]> = [
    ["User", db.user],
    ["Account", db.account],
    ["Session", db.session],
    ["VerificationToken", db.verificationToken],
    ["Category", db.category],
    ["Subcategory", db.subcategory],
    ["Plan", db.plan],
    ["Listing", db.listing],
    ["Subscription", db.subscription],
    ["Transaction", db.transaction],
    ["Boost", db.boost],
    ["Review", db.review],
    ["Notification", db.notification],
    ["SiteConfig", db.siteConfig],
    ["Conversation", db.conversation],
    ["Message", db.message],
    ["Favorite", db.favorite],
    ["Report", db.report],
    ["AuditLog", db.auditLog],
  ];

  const header = `-- ════════════════════════════════════════════════════════════
--  UMPI Marketplace — Datos para Turso (libSQL)
--  Compatible con SQLite / libSQL / Turso
--
--  Importar con:
--    turso db shell umpi < database/umpi_turso.sql
--  O pegar directamente en el Turso SQL Editor web.
--
--  NOTA: Este archivo SOLO contiene datos (INSERT).
--  Las tablas se crean automáticamente con:  npx prisma db push
-- ════════════════════════════════════════════════════════════

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

`;

  const footer = `
COMMIT;
PRAGMA foreign_keys = ON;

-- ════════════════════════════════════════════════════════════
--  FIN del dump
-- ════════════════════════════════════════════════════════════
`;

  let totalRecords = 0;
  const sections: string[] = [header];
  console.log("Tablas a exportar:", tables.length);
  console.log("");

  for (const [name, model] of tables) {
    try {
      const result = await exportTable(name, model);
      sections.push(result.sql);
      totalRecords += result.count;
      console.log(
        `  ✓ ${name.padEnd(22)} ${String(result.count).padStart(5)} registros`
      );
    } catch (e: any) {
      console.error(`  ✗ ${name}: ${e.message}`);
      sections.push(`-- ERROR exportando ${name}: ${e.message}\n`);
    }
  }

  sections.push(footer);

  // Escribir archivo
  mkdirSync(join(process.cwd(), "database"), { recursive: true });
  const outPath = join(process.cwd(), "database", "umpi_turso.sql");
  writeFileSync(outPath, sections.join("\n"));

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`✅ Exportación completada: ${outPath}`);
  console.log(`📊 Total de registros: ${totalRecords}`);
  console.log("═══════════════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
