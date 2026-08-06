// ════════════════════════════════════════════════════════════
//  scripts/seed-turso.js
//  Carga los datos iniciales a Turso/SQLite automáticamente
//  Se ejecuta durante el build de Vercel (npm run build)
// ════════════════════════════════════════════════════════════

const { createClient } = require("@libsql/client");
const { readFileSync } = require("fs");
const { join } = require("path");

// ─── Parser: divide el SQL en statements individuales ───
function parseSql(sql) {
  // Remover comentarios (líneas que empiezan con --)
  const lines = sql.split("\n");
  const cleanLines = lines.filter((line) => !line.trim().startsWith("--"));
  const cleanSql = cleanLines.join("\n");

  // Dividir por punto y coma
  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // Saltar PRAGMA, BEGIN, COMMIT (no son necesarios via libsql client)
    .filter((s) => {
      const upper = s.toUpperCase();
      return (
        !upper.startsWith("PRAGMA") &&
        !upper.startsWith("BEGIN") &&
        !upper.startsWith("COMMIT") &&
        !upper.startsWith("SET ")
      );
    });

  return statements;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  🌱 Seed script — Cargando datos a Turso/libSQL");
  console.log("═══════════════════════════════════════════════════════");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL no está configurada");
    console.error("   Configurá la variable de entorno antes de correr este script.");
    process.exit(1);
  }

  console.log("📍 URL de BD:", url.replace(/authToken=[^&]+/, "authToken=***"));

  const client = createClient({ url });

  // ─── Verificar si ya hay datos ───
  try {
    const result = await client.execute("SELECT COUNT(*) as count FROM User");
    const count = Number(result.rows[0].count);

    if (count > 0) {
      console.log(`✅ La base ya tiene ${count} usuarios. NO se carga nada (ya está seedeada).`);
      console.log("   Si querés forzar re-seed, borrá los datos primero:");
      console.log('   turso db shell umpi "DELETE FROM User;"');
      return;
    }

    console.log("📊 Base vacía. Procediendo a cargar datos...");
  } catch (e) {
    // Si la tabla no existe, es porque prisma db push no corrió
    console.error("❌ No se puede consultar la tabla User.");
    console.error("   ¿Ejecutaste 'npx prisma db push' primero?");
    console.error("   Error:", e.message);
    process.exit(1);
  }

  // ─── Leer el archivo SQL ───
  const sqlPath = join(process.cwd(), "database", "umpi_turso.sql");
  let sql;
  try {
    sql = readFileSync(sqlPath, "utf8");
    console.log("📄 Archivo SQL leído:", sqlPath);
  } catch (e) {
    console.error("❌ No se pudo leer database/umpi_turso.sql");
    console.error("   Asegurate de que el archivo exista en el repo.");
    process.exit(1);
  }

  // ─── Parsear y ejecutar ───
  const statements = parseSql(sql);
  console.log(`📋 ${statements.length} statements a ejecutar...`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.execute(stmt);
      success++;
      if ((i + 1) % 20 === 0) {
        console.log(`   ${i + 1}/${statements.length} ejecutados...`);
      }
    } catch (e) {
      errors++;
      if (errors <= 5) {
        console.error(`   ⚠️  Statement ${i + 1} falló: ${e.message.substring(0, 100)}`);
      }
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`✅ ${success} statements ejecutados correctamente`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} statements fallaron (revisá los errores arriba)`);
  }

  // ─── Verificar resultado ───
  const checks = [
    { table: "User", expected: 16 },
    { table: "Listing", expected: 33 },
    { table: "Plan", expected: 3 },
    { table: "Category", expected: 27 },
    { table: "Review", expected: 100 },
    { table: "Notification", expected: 42 },
  ];

  console.log("");
  console.log("📊 Verificación:");
  for (const { table, expected } of checks) {
    try {
      const r = await client.execute(`SELECT COUNT(*) as n FROM ${table}`);
      const n = Number(r.rows[0].n);
      const ok = n === expected ? "✅" : "⚠️";
      console.log(`   ${ok} ${table}: ${n} (esperado: ${expected})`);
    } catch (e) {
      console.log(`   ❌ ${table}: no se pudo verificar`);
    }
  }
  console.log("═══════════════════════════════════════════════════════");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
