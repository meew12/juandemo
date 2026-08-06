// Script: export-sqlite-to-mysql.ts
// Exporta todos los datos de la base SQLite a un archivo SQL compatible con MySQL.
// Uso: bun run scripts/export-sqlite-to-mysql.ts
// Genera: database/umpi_data.sql

import { db } from "../src/lib/db";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

// ─── Helper: escapa strings para SQL de MySQL ───
function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return isNaN(val) ? "NULL" : String(val);
  if (val instanceof Date) return `'${val.toISOString().replace("T", " ").replace(/\.\d+Z$/, "")}'`;
  // String: escapar comillas simples y backslashes
  const s = String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${s}'`;
}

// ─── Helper: genera INSERTs para una tabla ───
function generateInserts(tableName: string, rows: Record<string, any>[], columns: string[]): string {
  if (rows.length === 0) return `-- ${tableName}: sin datos\n`;
  let out = `-- ─── ${tableName} (${rows.length} registros) ───\n`;
  out += `DELETE FROM \`${tableName}\`;\n`;
  // Desactivar foreign checks temporalmente para evitar errores de orden
  for (const row of rows) {
    const vals = columns.map((c) => sqlEscape(row[c]));
    out += `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES (${vals.join(", ")});\n`;
  }
  return out + "\n";
}

async function main() {
  console.log("Exportando datos de SQLite a MySQL...");

  // Orden de tablas respetando foreign keys (padres antes que hijos)
  const [
    users, accounts, sessions, verificationTokens,
    categories, subcategories,
    listings, reviews, favorites,
    conversations, messages,
    plans, subscriptions, boosts, transactions,
    reports, notifications, siteConfig, auditLogs,
  ] = await Promise.all([
    db.user.findMany(),
    db.account.findMany(),
    db.session.findMany(),
    db.verificationToken.findMany(),
    db.category.findMany(),
    db.subcategory.findMany(),
    db.listing.findMany(),
    db.review.findMany(),
    db.favorite.findMany(),
    db.conversation.findMany(),
    db.message.findMany(),
    db.plan.findMany(),
    db.subscription.findMany(),
    db.boost.findMany(),
    db.transaction.findMany(),
    db.report.findMany(),
    db.notification.findMany(),
    db.siteConfig.findMany(),
    db.auditLog.findMany(),
  ]);

  let sql = `-- ════════════════════════════════════════════════════════════════════
-- UMPI Marketplace — Dump de datos para MySQL (Producción)
-- Generado: ${new Date().toISOString()}
-- 
-- INSTRUCCIONES DE USO:
-- 1. Crear la base de datos y las tablas primero con Prisma:
--    npx prisma db push  (usando prisma/schema.mysql.prisma)
-- 2. Importar este archivo:
--    mysql -u USUARIO -p NOMBRE_DB < umpi_data.sql
--    O desde phpMyAdmin: pestaña "Importar" → seleccionar este archivo
-- 3. Las contraseñas de usuarios ya están hasheadas con bcrypt.
--    Admin: admin@umpi.com.ar / admin123
-- ════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

`;

  sql += generateInserts("User", users as any[], [
    "id","email","name","lastName","passwordHash","image","phone","zone","bio",
    "avatarInitials","role","plan","verified","banned","memberSince","createdAt","updatedAt"
  ]);

  sql += generateInserts("Account", accounts as any[], [
    "id","userId","type","provider","providerAccountId","refresh_token","access_token",
    "expires_at","token_type","scope","id_token","session_state"
  ]);

  sql += generateInserts("Session", sessions as any[], [
    "id","sessionToken","userId","expires"
  ]);

  sql += generateInserts("VerificationToken", verificationTokens as any[], [
    "identifier","token","expires"
  ]);

  sql += generateInserts("Category", categories as any[], [
    "id","slug","name","type","icon","description","count","order","createdAt","updatedAt"
  ]);

  sql += generateInserts("Subcategory", subcategories as any[], [
    "id","categoryId","name","slug","count","createdAt","updatedAt"
  ]);

  sql += generateInserts("Listing", listings as any[], [
    "id","slug","title","description","categoryType","categoryId","subcategoryId",
    "price","currency","priceUnit","location","zone","province","images","thumbs",
    "attrs","rating","reviewCount","views","contactCount","badge","featured",
    "featuredUntil","boostLevel","status","rejectionReason","sellerId","createdAt","updatedAt"
  ]);

  sql += generateInserts("Review", reviews as any[], [
    "id","listingId","userId","rating","comment","status","createdAt","updatedAt"
  ]);

  sql += generateInserts("Favorite", favorites as any[], [
    "id","userId","listingId","createdAt"
  ]);

  sql += generateInserts("Conversation", conversations as any[], [
    "id","listingId","createdAt","updatedAt"
  ]);

  // Conversación ↔ Usuarios (tabla intermedia many-to-many)
  const convUsers: any[] = [];
  for (const c of conversations) {
    for (const u of (c as any).participants || []) {
      convUsers.push({ A: c.id, B: u.id });
    }
  }
  if (convUsers.length > 0) {
    sql += `-- ─── _ConversationToUser (${convUsers.length} registros) ───\n`;
    sql += `DELETE FROM \`_ConversationToUser\`;\n`;
    for (const r of convUsers) {
      sql += `INSERT INTO \`_ConversationToUser\` (\`A\`, \`B\`) VALUES (${sqlEscape(r.A)}, ${sqlEscape(r.B)});\n`;
    }
    sql += "\n";
  }

  sql += generateInserts("Message", messages as any[], [
    "id","conversationId","senderId","content","read","createdAt"
  ]);

  sql += generateInserts("Plan", plans as any[], [
    "id","slug","name","price","currency","interval","description","features",
    "maxListings","maxFeatured","badgeVerified","top10Access","multiUser",
    "apiAccess","prioritySupport","monthlyReport","invoiceType","active","order",
    "createdAt","updatedAt"
  ]);

  sql += generateInserts("Subscription", subscriptions as any[], [
    "id","userId","plan","status","startDate","currentPeriodEnd","cancelAtPeriodEnd",
    "mercadopagoId","mercadopagoPreapprovalId","amount","createdAt","updatedAt"
  ]);

  sql += generateInserts("Boost", boosts as any[], [
    "id","listingId","userId","type","durationDays","amount","status",
    "startDate","endDate","mercadopagoPaymentId","createdAt","updatedAt"
  ]);

  sql += generateInserts("Transaction", transactions as any[], [
    "id","txId","userId","subscriptionId","boostId","concept","method","amount",
    "currency","status","mercadopagoPaymentId","mercadopagoPreferenceId",
    "invoiceType","createdAt","updatedAt"
  ]);

  sql += generateInserts("Report", reports as any[], [
    "id","reporterId","reportedUserId","listingId","reason","description",
    "status","resolution","createdAt","updatedAt"
  ]);

  sql += generateInserts("Notification", notifications as any[], [
    "id","userId","type","title","body","link","read","createdAt"
  ]);

  sql += generateInserts("SiteConfig", siteConfig as any[], [
    "id","key","value"
  ]);

  sql += generateInserts("AuditLog", auditLogs as any[], [
    "id","userId","action","entity","entityId","details","ip","createdAt"
  ]);

  sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `\n-- ════════════════════════════════════════════════════════════════════\n`;
  sql += `-- Fin del dump. Total de tablas exportadas: 20\n`;
  sql += `-- Resumen: ${users.length} usuarios, ${listings.length} publicaciones, ${plans.length} planes, ${categories.length} categorías\n`;
  sql += `-- ════════════════════════════════════════════════════════════════════\n`;

  // Crear directorio database/
  const dbDir = path.join(process.cwd(), "database");
  mkdirSync(dbDir, { recursive: true });

  const outPath = path.join(dbDir, "umpi_data.sql");
  writeFileSync(outPath, sql, "utf-8");

  console.log(`✅ Exportado a: ${outPath}`);
  console.log(`   Tamaño: ${(sql.length / 1024).toFixed(1)} KB`);
  console.log(`   Usuarios: ${users.length}`);
  console.log(`   Publicaciones: ${listings.length}`);
  console.log(`   Planes: ${plans.length}`);
  console.log(`   Categorías: ${categories.length}`);
  console.log(`   Suscripciones: ${subscriptions.length}`);
  console.log(`   Transacciones: ${transactions.length}`);
  console.log(`   Reseñas: ${reviews.length}`);
  console.log(`   Notificaciones: ${notifications.length}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
