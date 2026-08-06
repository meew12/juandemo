// Script: generate-full-mysql-sql.ts
// Genera database/umpi_full.sql con CREATE TABLE + INSERT en un solo archivo
// para importar directamente desde phpMyAdmin sin necesidad de Node/Prisma.

import { db } from "../src/lib/db";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return isNaN(val) ? "NULL" : String(val);
  if (val instanceof Date) return `'${val.toISOString().replace("T", " ").replace(/\.\d+Z$/, "")}'`;
  const s = String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${s}'`;
}

function generateInserts(tableName: string, rows: Record<string, any>[], columns: string[]): string {
  if (rows.length === 0) return `-- ${tableName}: sin datos\n`;
  let out = `-- ─── ${tableName} (${rows.length} registros) ───\n`;
  out += `DELETE FROM \`${tableName}\`;\n`;
  for (const row of rows) {
    const vals = columns.map((c) => sqlEscape(row[c]));
    out += `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES (${vals.join(", ")});\n`;
  }
  return out + "\n";
}

// ─── CREATE TABLE statements (MySQL 5.7+/8.0) ───
const SCHEMA_SQL = `-- ════════════════════════════════════════════════════════════════════
-- UMPI Marketplace — Schema + Datos para MySQL (un solo archivo)
-- Generado para importar directamente desde phpMyAdmin
-- Compatible con MySQL 5.7+ y 8.0
-- ════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET sql_mode = '';

-- ─── Drop tables si existen (orden inverso para evitar FK errors) ───
DROP TABLE IF EXISTS \`_ConversationToUser\`;
DROP TABLE IF EXISTS \`AuditLog\`;
DROP TABLE IF EXISTS \`SiteConfig\`;
DROP TABLE IF EXISTS \`Plan\`;
DROP TABLE IF EXISTS \`Notification\`;
DROP TABLE IF EXISTS \`Report\`;
DROP TABLE IF EXISTS \`Transaction\`;
DROP TABLE IF EXISTS \`Boost\`;
DROP TABLE IF EXISTS \`Subscription\`;
DROP TABLE IF EXISTS \`Message\`;
DROP TABLE IF EXISTS \`Conversation\`;
DROP TABLE IF EXISTS \`Favorite\`;
DROP TABLE IF EXISTS \`Review\`;
DROP TABLE IF EXISTS \`Listing\`;
DROP TABLE IF EXISTS \`Subcategory\`;
DROP TABLE IF EXISTS \`Category\`;
DROP TABLE IF EXISTS \`VerificationToken\`;
DROP TABLE IF EXISTS \`Session\`;
DROP TABLE IF EXISTS \`Account\`;
DROP TABLE IF EXISTS \`User\`;

-- ─────────────────────────── USUARIOS ───────────────────────────
CREATE TABLE \`User\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`name\` VARCHAR(100) NULL,
  \`lastName\` VARCHAR(100) NULL,
  \`passwordHash\` VARCHAR(255) NULL,
  \`image\` VARCHAR(500) NULL,
  \`phone\` VARCHAR(30) NULL,
  \`zone\` VARCHAR(100) NULL,
  \`bio\` TEXT NULL,
  \`avatarInitials\` VARCHAR(5) NULL,
  \`role\` VARCHAR(20) NOT NULL DEFAULT 'user',
  \`plan\` VARCHAR(20) NOT NULL DEFAULT 'basico',
  \`verified\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`banned\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`memberSince\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`User_email_key\`(\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── NEXTAUTH ───────────────────────────
CREATE TABLE \`Account\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`type\` VARCHAR(50) NOT NULL,
  \`provider\` VARCHAR(50) NOT NULL,
  \`providerAccountId\` VARCHAR(100) NOT NULL,
  \`refresh_token\` TEXT NULL,
  \`access_token\` TEXT NULL,
  \`expires_at\` INT NULL,
  \`token_type\` VARCHAR(50) NULL,
  \`scope\` VARCHAR(255) NULL,
  \`id_token\` TEXT NULL,
  \`session_state\` VARCHAR(255) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Account_provider_providerAccountId_key\`(\`provider\`, \`providerAccountId\`),
  INDEX \`Account_userId_idx\`(\`userId\`),
  CONSTRAINT \`Account_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`Session\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`sessionToken\` VARCHAR(255) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`expires\` DATETIME(3) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Session_sessionToken_key\`(\`sessionToken\`),
  INDEX \`Session_userId_idx\`(\`userId\`),
  CONSTRAINT \`Session_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`VerificationToken\` (
  \`identifier\` VARCHAR(255) NOT NULL,
  \`token\` VARCHAR(255) NOT NULL,
  \`expires\` DATETIME(3) NOT NULL,
  UNIQUE INDEX \`VerificationToken_identifier_token_key\`(\`identifier\`, \`token\`),
  UNIQUE INDEX \`VerificationToken_token_key\`(\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── CATEGORÍAS ───────────────────────────
CREATE TABLE \`Category\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`type\` VARCHAR(20) NOT NULL,
  \`icon\` VARCHAR(50) NULL,
  \`description\` TEXT NULL,
  \`count\` INT NOT NULL DEFAULT 0,
  \`order\` INT NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Category_slug_key\`(\`slug\`),
  INDEX \`Category_type_idx\`(\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`Subcategory\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`categoryId\` VARCHAR(30) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`count\` INT NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Subcategory_categoryId_slug_key\`(\`categoryId\`, \`slug\`),
  INDEX \`Subcategory_categoryId_idx\`(\`categoryId\`),
  CONSTRAINT \`Subcategory_categoryId_fkey\` FOREIGN KEY (\`categoryId\`) REFERENCES \`Category\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── PUBLICACIONES ───────────────────────────
CREATE TABLE \`Listing\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` LONGTEXT NOT NULL,
  \`categoryType\` VARCHAR(20) NOT NULL,
  \`categoryId\` VARCHAR(30) NULL,
  \`subcategoryId\` VARCHAR(30) NULL,
  \`price\` DOUBLE NOT NULL,
  \`currency\` VARCHAR(10) NOT NULL DEFAULT 'ARS',
  \`priceUnit\` VARCHAR(20) NULL,
  \`location\` VARCHAR(255) NULL,
  \`zone\` VARCHAR(100) NULL,
  \`province\` VARCHAR(100) NULL,
  \`images\` TEXT NOT NULL DEFAULT '[]',
  \`thumbs\` TEXT NOT NULL DEFAULT '[]',
  \`attrs\` TEXT NOT NULL DEFAULT '{}',
  \`rating\` DOUBLE NOT NULL DEFAULT 0,
  \`reviewCount\` INT NOT NULL DEFAULT 0,
  \`views\` INT NOT NULL DEFAULT 0,
  \`contactCount\` INT NOT NULL DEFAULT 0,
  \`badge\` VARCHAR(20) NULL,
  \`featured\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`featuredUntil\` DATETIME(3) NULL,
  \`boostLevel\` INT NOT NULL DEFAULT 0,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
  \`rejectionReason\` TEXT NULL,
  \`sellerId\` VARCHAR(30) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Listing_slug_key\`(\`slug\`),
  INDEX \`Listing_categoryType_idx\`(\`categoryType\`),
  INDEX \`Listing_sellerId_idx\`(\`sellerId\`),
  INDEX \`Listing_status_idx\`(\`status\`),
  INDEX \`Listing_featured_idx\`(\`featured\`),
  INDEX \`Listing_createdAt_idx\`(\`createdAt\`),
  INDEX \`Listing_categoryId_idx\`(\`categoryId\`),
  INDEX \`Listing_subcategoryId_idx\`(\`subcategoryId\`),
  CONSTRAINT \`Listing_sellerId_fkey\` FOREIGN KEY (\`sellerId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Listing_categoryId_fkey\` FOREIGN KEY (\`categoryId\`) REFERENCES \`Category\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`Listing_subcategoryId_fkey\` FOREIGN KEY (\`subcategoryId\`) REFERENCES \`Subcategory\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── RESEÑAS ───────────────────────────
CREATE TABLE \`Review\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`listingId\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`rating\` INT NOT NULL,
  \`comment\` TEXT NOT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Review_listingId_userId_key\`(\`listingId\`, \`userId\`),
  INDEX \`Review_listingId_idx\`(\`listingId\`),
  INDEX \`Review_userId_idx\`(\`userId\`),
  CONSTRAINT \`Review_listingId_fkey\` FOREIGN KEY (\`listingId\`) REFERENCES \`Listing\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Review_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── FAVORITOS ───────────────────────────
CREATE TABLE \`Favorite\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`listingId\` VARCHAR(30) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Favorite_userId_listingId_key\`(\`userId\`, \`listingId\`),
  INDEX \`Favorite_userId_idx\`(\`userId\`),
  INDEX \`Favorite_listingId_idx\`(\`listingId\`),
  CONSTRAINT \`Favorite_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Favorite_listingId_fkey\` FOREIGN KEY (\`listingId\`) REFERENCES \`Listing\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── MENSAJERÍA ───────────────────────────
CREATE TABLE \`Conversation\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`listingId\` VARCHAR(30) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Conversation_listingId_idx\`(\`listingId\`),
  CONSTRAINT \`Conversation_listingId_fkey\` FOREIGN KEY (\`listingId\`) REFERENCES \`Listing\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`Message\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`conversationId\` VARCHAR(30) NOT NULL,
  \`senderId\` VARCHAR(30) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Message_conversationId_idx\`(\`conversationId\`),
  INDEX \`Message_senderId_idx\`(\`senderId\`),
  INDEX \`Message_createdAt_idx\`(\`createdAt\`),
  CONSTRAINT \`Message_conversationId_fkey\` FOREIGN KEY (\`conversationId\`) REFERENCES \`Conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Message_senderId_fkey\` FOREIGN KEY (\`senderId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla intermedia many-to-many Conversation ↔ User
CREATE TABLE \`_ConversationToUser\` (
  \`A\` VARCHAR(30) NOT NULL,
  \`B\` VARCHAR(30) NOT NULL,
  UNIQUE INDEX \`_ConversationToUser_AB_unique\`(\`A\`, \`B\`),
  INDEX \`_ConversationToUser_B_index\`(\`B\`),
  CONSTRAINT \`_ConversationToUser_A_fkey\` FOREIGN KEY (\`A\`) REFERENCES \`Conversation\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`_ConversationToUser_B_fkey\` FOREIGN KEY (\`B\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── PLANES PREMIUM ───────────────────────────
CREATE TABLE \`Plan\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`slug\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`price\` DOUBLE NOT NULL,
  \`currency\` VARCHAR(10) NOT NULL DEFAULT 'ARS',
  \`interval\` VARCHAR(20) NOT NULL DEFAULT 'month',
  \`description\` TEXT NULL,
  \`features\` TEXT NOT NULL DEFAULT '[]',
  \`maxListings\` INT NOT NULL DEFAULT 1,
  \`maxFeatured\` INT NOT NULL DEFAULT 0,
  \`badgeVerified\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`top10Access\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`multiUser\` INT NOT NULL DEFAULT 1,
  \`apiAccess\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`prioritySupport\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`monthlyReport\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`invoiceType\` VARCHAR(5) NULL,
  \`active\` BOOLEAN NOT NULL DEFAULT TRUE,
  \`order\` INT NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Plan_slug_key\`(\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── SUSCRIPCIONES ───────────────────────────
CREATE TABLE \`Subscription\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`plan\` VARCHAR(20) NOT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
  \`startDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`currentPeriodEnd\` DATETIME(3) NULL,
  \`cancelAtPeriodEnd\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`mercadopagoId\` VARCHAR(100) NULL,
  \`mercadopagoPreapprovalId\` VARCHAR(100) NULL,
  \`amount\` DOUBLE NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Subscription_userId_idx\`(\`userId\`),
  INDEX \`Subscription_status_idx\`(\`status\`),
  CONSTRAINT \`Subscription_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── BOOSTS ───────────────────────────
CREATE TABLE \`Boost\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`listingId\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`type\` VARCHAR(30) NOT NULL,
  \`durationDays\` INT NOT NULL,
  \`amount\` DOUBLE NOT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  \`startDate\` DATETIME(3) NULL,
  \`endDate\` DATETIME(3) NULL,
  \`mercadopagoPaymentId\` VARCHAR(100) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Boost_listingId_idx\`(\`listingId\`),
  INDEX \`Boost_status_idx\`(\`status\`),
  INDEX \`Boost_userId_idx\`(\`userId\`),
  CONSTRAINT \`Boost_listingId_fkey\` FOREIGN KEY (\`listingId\`) REFERENCES \`Listing\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Boost_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── TRANSACCIONES ───────────────────────────
CREATE TABLE \`Transaction\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`txId\` VARCHAR(50) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`subscriptionId\` VARCHAR(30) NULL,
  \`boostId\` VARCHAR(30) NULL,
  \`concept\` VARCHAR(255) NOT NULL,
  \`method\` VARCHAR(30) NOT NULL,
  \`amount\` DOUBLE NOT NULL,
  \`currency\` VARCHAR(10) NOT NULL DEFAULT 'ARS',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  \`mercadopagoPaymentId\` VARCHAR(100) NULL,
  \`mercadopagoPreferenceId\` VARCHAR(100) NULL,
  \`invoiceType\` VARCHAR(5) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Transaction_txId_key\`(\`txId\`),
  INDEX \`Transaction_userId_idx\`(\`userId\`),
  INDEX \`Transaction_status_idx\`(\`status\`),
  INDEX \`Transaction_createdAt_idx\`(\`createdAt\`),
  INDEX \`Transaction_subscriptionId_idx\`(\`subscriptionId\`),
  INDEX \`Transaction_boostId_idx\`(\`boostId\`),
  CONSTRAINT \`Transaction_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Transaction_subscriptionId_fkey\` FOREIGN KEY (\`subscriptionId\`) REFERENCES \`Subscription\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`Transaction_boostId_fkey\` FOREIGN KEY (\`boostId\`) REFERENCES \`Boost\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── REPORTES ───────────────────────────
CREATE TABLE \`Report\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`reporterId\` VARCHAR(30) NOT NULL,
  \`reportedUserId\` VARCHAR(30) NULL,
  \`listingId\` VARCHAR(30) NULL,
  \`reason\` VARCHAR(50) NOT NULL,
  \`description\` TEXT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'open',
  \`resolution\` TEXT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Report_status_idx\`(\`status\`),
  INDEX \`Report_listingId_idx\`(\`listingId\`),
  INDEX \`Report_reporterId_idx\`(\`reporterId\`),
  INDEX \`Report_reportedUserId_idx\`(\`reportedUserId\`),
  CONSTRAINT \`Report_reporterId_fkey\` FOREIGN KEY (\`reporterId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`Report_reportedUserId_fkey\` FOREIGN KEY (\`reportedUserId\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`Report_listingId_fkey\` FOREIGN KEY (\`listingId\`) REFERENCES \`Listing\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── NOTIFICACIONES ───────────────────────────
CREATE TABLE \`Notification\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NOT NULL,
  \`type\` VARCHAR(30) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`body\` TEXT NOT NULL,
  \`link\` VARCHAR(255) NULL,
  \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Notification_userId_read_idx\`(\`userId\`, \`read\`),
  INDEX \`Notification_createdAt_idx\`(\`createdAt\`),
  INDEX \`Notification_userId_idx\`(\`userId\`),
  CONSTRAINT \`Notification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── CONFIGURACIÓN SITIO ───────────────────────────
CREATE TABLE \`SiteConfig\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`key\` VARCHAR(100) NOT NULL,
  \`value\` LONGTEXT NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`SiteConfig_key_key\`(\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────── LOGS DE AUDITORÍA ───────────────────────────
CREATE TABLE \`AuditLog\` (
  \`id\` VARCHAR(30) NOT NULL,
  \`userId\` VARCHAR(30) NULL,
  \`action\` VARCHAR(100) NOT NULL,
  \`entity\` VARCHAR(50) NULL,
  \`entityId\` VARCHAR(30) NULL,
  \`details\` TEXT NULL,
  \`ip\` VARCHAR(45) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`AuditLog_userId_idx\`(\`userId\`),
  INDEX \`AuditLog_action_idx\`(\`action\`),
  INDEX \`AuditLog_createdAt_idx\`(\`createdAt\`),
  CONSTRAINT \`AuditLog_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ════════════════════════════════════════════════════════════════════
-- FIN DEL SCHEMA — A continuación los INSERTs con los datos
-- ════════════════════════════════════════════════════════════════════

`;

async function main() {
  console.log("Generando dump completo (schema + datos)...");

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
    db.conversation.findMany({ include: { participants: { select: { id: true } } } }),
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

  let dataSql = "\n-- ═════════════════════════════════ DATOS ═════════════════════════════════\n\n";

  dataSql += generateInserts("User", users as any[], [
    "id","email","name","lastName","passwordHash","image","phone","zone","bio",
    "avatarInitials","role","plan","verified","banned","memberSince","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Account", accounts as any[], [
    "id","userId","type","provider","providerAccountId","refresh_token","access_token",
    "expires_at","token_type","scope","id_token","session_state"
  ]);
  dataSql += generateInserts("Session", sessions as any[], ["id","sessionToken","userId","expires"]);
  dataSql += generateInserts("VerificationToken", verificationTokens as any[], ["identifier","token","expires"]);
  dataSql += generateInserts("Category", categories as any[], [
    "id","slug","name","type","icon","description","count","order","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Subcategory", subcategories as any[], [
    "id","categoryId","name","slug","count","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Listing", listings as any[], [
    "id","slug","title","description","categoryType","categoryId","subcategoryId",
    "price","currency","priceUnit","location","zone","province","images","thumbs",
    "attrs","rating","reviewCount","views","contactCount","badge","featured",
    "featuredUntil","boostLevel","status","rejectionReason","sellerId","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Review", reviews as any[], [
    "id","listingId","userId","rating","comment","status","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Favorite", favorites as any[], ["id","userId","listingId","createdAt"]);
  dataSql += generateInserts("Conversation", conversations as any[], ["id","listingId","createdAt","updatedAt"]);

  // Tabla many-to-many _ConversationToUser
  const convUsers: any[] = [];
  for (const c of conversations) {
    for (const p of (c as any).participants) {
      convUsers.push({ A: c.id, B: p.id });
    }
  }
  if (convUsers.length > 0) {
    dataSql += `-- ─── _ConversationToUser (${convUsers.length} registros) ───\n`;
    dataSql += `DELETE FROM \`_ConversationToUser\`;\n`;
    for (const r of convUsers) {
      dataSql += `INSERT INTO \`_ConversationToUser\` (\`A\`, \`B\`) VALUES (${sqlEscape(r.A)}, ${sqlEscape(r.B)});\n`;
    }
    dataSql += "\n";
  }

  dataSql += generateInserts("Message", messages as any[], [
    "id","conversationId","senderId","content","read","createdAt"
  ]);
  dataSql += generateInserts("Plan", plans as any[], [
    "id","slug","name","price","currency","interval","description","features",
    "maxListings","maxFeatured","badgeVerified","top10Access","multiUser",
    "apiAccess","prioritySupport","monthlyReport","invoiceType","active","order",
    "createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Subscription", subscriptions as any[], [
    "id","userId","plan","status","startDate","currentPeriodEnd","cancelAtPeriodEnd",
    "mercadopagoId","mercadopagoPreapprovalId","amount","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Boost", boosts as any[], [
    "id","listingId","userId","type","durationDays","amount","status",
    "startDate","endDate","mercadopagoPaymentId","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Transaction", transactions as any[], [
    "id","txId","userId","subscriptionId","boostId","concept","method","amount",
    "currency","status","mercadopagoPaymentId","mercadopagoPreferenceId",
    "invoiceType","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Report", reports as any[], [
    "id","reporterId","reportedUserId","listingId","reason","description",
    "status","resolution","createdAt","updatedAt"
  ]);
  dataSql += generateInserts("Notification", notifications as any[], [
    "id","userId","type","title","body","link","read","createdAt"
  ]);
  dataSql += generateInserts("SiteConfig", siteConfig as any[], ["id","key","value"]);
  dataSql += generateInserts("AuditLog", auditLogs as any[], [
    "id","userId","action","entity","entityId","details","ip","createdAt"
  ]);

  dataSql += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  dataSql += `\n-- ════════════════════════════════════════════════════════════════════\n`;
  dataSql += `-- ✅ Importación completa!\n`;
  dataSql += `-- Resumen: ${users.length} usuarios, ${listings.length} publicaciones, ${plans.length} planes, ${categories.length} categorías, ${reviews.length} reseñas\n`;
  dataSql += `-- Admin: admin@umpi.com.ar / admin123\n`;
  dataSql += `-- ════════════════════════════════════════════════════════════════════\n`;

  const fullSql = SCHEMA_SQL + dataSql;

  const dbDir = path.join(process.cwd(), "database");
  mkdirSync(dbDir, { recursive: true });
  const outPath = path.join(dbDir, "umpi_full.sql");
  writeFileSync(outPath, fullSql, "utf-8");

  console.log(`✅ Generado: ${outPath}`);
  console.log(`   Tamaño: ${(fullSql.length / 1024).toFixed(1)} KB`);
  console.log(`   Tablas creadas: 20 (+ 1 many-to-many)`);
  console.log(`   Datos: ${users.length} usuarios, ${listings.length} publicaciones, ${plans.length} planes, ${categories.length} categorías`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
