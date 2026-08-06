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

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ─── ESQUEMA: CREATE TABLE ───


-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `lastName` VARCHAR(100) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `image` VARCHAR(500) NULL,
    `phone` VARCHAR(30) NULL,
    `zone` VARCHAR(100) NULL,
    `bio` TEXT NULL,
    `avatarInitials` VARCHAR(5) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'user',
    `plan` VARCHAR(20) NOT NULL DEFAULT 'basico',
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `memberSince` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerAccountId` VARCHAR(100) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(50) NULL,
    `scope` VARCHAR(255) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(255) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(30) NOT NULL,
    `sessionToken` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `icon` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subcategory` (
    `id` VARCHAR(30) NOT NULL,
    `categoryId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subcategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `Subcategory_categoryId_slug_key`(`categoryId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `categoryType` VARCHAR(20) NOT NULL,
    `categoryId` VARCHAR(30) NULL,
    `subcategoryId` VARCHAR(30) NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'ARS',
    `priceUnit` VARCHAR(20) NULL,
    `location` VARCHAR(255) NULL,
    `zone` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `images` TEXT NOT NULL DEFAULT '[]',
    `thumbs` TEXT NOT NULL DEFAULT '[]',
    `attrs` TEXT NOT NULL DEFAULT '{}',
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,
    `contactCount` INTEGER NOT NULL DEFAULT 0,
    `badge` VARCHAR(20) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `featuredUntil` DATETIME(3) NULL,
    `boostLevel` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `rejectionReason` TEXT NULL,
    `sellerId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Listing_slug_key`(`slug`),
    INDEX `Listing_categoryType_idx`(`categoryType`),
    INDEX `Listing_sellerId_idx`(`sellerId`),
    INDEX `Listing_status_idx`(`status`),
    INDEX `Listing_featured_idx`(`featured`),
    INDEX `Listing_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(30) NOT NULL,
    `listingId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Review_listingId_idx`(`listingId`),
    INDEX `Review_userId_idx`(`userId`),
    UNIQUE INDEX `Review_listingId_userId_key`(`listingId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `listingId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Favorite_userId_idx`(`userId`),
    UNIQUE INDEX `Favorite_userId_listingId_key`(`userId`, `listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(30) NOT NULL,
    `listingId` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Conversation_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(30) NOT NULL,
    `conversationId` VARCHAR(30) NOT NULL,
    `senderId` VARCHAR(30) NOT NULL,
    `content` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_conversationId_idx`(`conversationId`),
    INDEX `Message_senderId_idx`(`senderId`),
    INDEX `Message_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `plan` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `currentPeriodEnd` DATETIME(3) NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `mercadopagoId` VARCHAR(100) NULL,
    `mercadopagoPreapprovalId` VARCHAR(100) NULL,
    `amount` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subscription_userId_idx`(`userId`),
    INDEX `Subscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Boost` (
    `id` VARCHAR(30) NOT NULL,
    `listingId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `mercadopagoPaymentId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Boost_listingId_idx`(`listingId`),
    INDEX `Boost_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(30) NOT NULL,
    `txId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `subscriptionId` VARCHAR(30) NULL,
    `boostId` VARCHAR(30) NULL,
    `concept` VARCHAR(255) NOT NULL,
    `method` VARCHAR(30) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'ARS',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `mercadopagoPaymentId` VARCHAR(100) NULL,
    `mercadopagoPreferenceId` VARCHAR(100) NULL,
    `invoiceType` VARCHAR(5) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transaction_txId_key`(`txId`),
    INDEX `Transaction_userId_idx`(`userId`),
    INDEX `Transaction_status_idx`(`status`),
    INDEX `Transaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(30) NOT NULL,
    `reporterId` VARCHAR(30) NOT NULL,
    `reportedUserId` VARCHAR(30) NULL,
    `listingId` VARCHAR(30) NULL,
    `reason` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `resolution` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_status_idx`(`status`),
    INDEX `Report_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(255) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_read_idx`(`userId`, `read`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(30) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'ARS',
    `interval` VARCHAR(20) NOT NULL DEFAULT 'month',
    `description` TEXT NULL,
    `features` TEXT NOT NULL DEFAULT '[]',
    `maxListings` INTEGER NOT NULL DEFAULT 1,
    `maxFeatured` INTEGER NOT NULL DEFAULT 0,
    `badgeVerified` BOOLEAN NOT NULL DEFAULT false,
    `top10Access` BOOLEAN NOT NULL DEFAULT false,
    `multiUser` INTEGER NOT NULL DEFAULT 1,
    `apiAccess` BOOLEAN NOT NULL DEFAULT false,
    `prioritySupport` BOOLEAN NOT NULL DEFAULT false,
    `monthlyReport` BOOLEAN NOT NULL DEFAULT false,
    `invoiceType` VARCHAR(5) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteConfig` (
    `id` VARCHAR(30) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` LONGTEXT NOT NULL,

    UNIQUE INDEX `SiteConfig_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(50) NULL,
    `entityId` VARCHAR(30) NULL,
    `details` TEXT NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ConvParticipants` (
    `A` VARCHAR(30) NOT NULL,
    `B` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `_ConvParticipants_AB_unique`(`A`, `B`),
    INDEX `_ConvParticipants_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ─── DATOS: INSERT ───

-- ─── User (16 registros) ───
DELETE FROM `User`;
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8acs000trjggkktemzc6', 'admin@umpi.com.ar', 'Admin', 'UMPI', '$2b$10$QrKgA126HHAFDeTefZDmauezb4hrawPZutPcVqF8twZA7hAHzGqhm', NULL, '+54 11 5555-5555', 'CABA — Microcentro', 'Administrador de UMPI', 'AU', 'admin', 'business', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-04 02:07:22');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8act000urjgg798i5gq7', 'juan.garcia@email.com', 'Juan', 'García', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 1234-5669', 'CABA — Palermo', 'Desarrollador web freelance especializado en React y Next.js.', 'JG', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-04 03:22:42');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8acv000vrjgg6eg5yw2w', 'maria.gonzalez@email.com', 'María', 'González', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 5817-7652', 'CABA — Belgrano', NULL, 'MG', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8acw000wrjgg704tj46r', 'carlos.mendez@email.com', 'Carlos', 'Méndez', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 7830-4791', 'GBA Norte', NULL, 'CM', 'user', 'business', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8acx000xrjgg3jtt623a', 'ana.rodriguez@email.com', 'Ana', 'Rodríguez', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 8857-8457', 'CABA — Caballito', NULL, 'AR', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-03 23:07:04');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8acz000yrjggprul5rkx', 'pablo.fernandez@email.com', 'Pablo', 'Fernández', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 4425-1540', 'Córdoba Capital', NULL, 'PF', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad0000zrjggpq3fciu8', 'lucia.sosa@email.com', 'Lucía', 'Sosa', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 3371-2770', 'Rosario', NULL, 'LS', 'user', 'basico', 0, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad10010rjgg1tl366u5', 'diego.lopez@email.com', 'Diego', 'López', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 7067-4230', 'GBA Sur', NULL, 'DL', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad20011rjggf0wdn6lz', 'sofia.romero@email.com', 'Sofía', 'Romero', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 1265-9287', 'Mendoza Capital', NULL, 'SR', 'user', 'business', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad30012rjggcflesy0r', 'martin.perez@email.com', 'Martín', 'Pérez', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 6376-1034', 'CABA — Palermo Soho', NULL, 'MP', 'user', 'pro', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad40013rjggn4me9ibl', 'claudia.lopez@email.com', 'Claudia', 'López', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 4341-4602', 'CABA — Puerto Madero', NULL, 'CL', 'user', 'business', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad50014rjggzi4pju3w', 'fernando.diaz@email.com', 'Fernando', 'Díaz', '$2b$10$3KBiuMYtTfCcNTMSxjRRXucV/pjSqx1KCnxGeV9CGEd8bt4azAPPu', NULL, '+54 11 9817-9045', 'GBA Oeste', NULL, 'FD', 'user', 'basico', 1, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10', '2026-08-02 23:07:00');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsd9nlm10000q8vplcrt7oc3', 'testusuario@gmail.com', 'Test', 'usuario', '$2b$10$t/1FVBaWCcahHvkZOivkqeJdJbLWjufO2yYQjkwtLq9gRRSCrdlde', NULL, NULL, NULL, NULL, 'TU', 'user', 'basico', 0, 0, '2026-08-03 13:29:53', '2026-08-03 13:29:53', '2026-08-03 13:29:53');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsd9r1k20001q8vp5xycpklj', 'demouser@gmail.com', 'demo', 'user', '$2b$10$oaGFeQTTbWlCuTRx1UyK8O.oGkb3kSNHXao2FrrQlbRyS7OOnbwbO', NULL, NULL, NULL, NULL, 'DU', 'user', 'basico', 0, 0, '2026-08-03 13:32:34', '2026-08-03 13:32:34', '2026-08-03 13:32:34');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsdf76o30007q88zd51tads3', 'usertest@test.com', 'user', 'test', '$2b$10$7BmBpmZRERKGq2dIuo/lROuL27C4q5weAxz73XNxYvW8Lh2b0LCQW', NULL, NULL, NULL, NULL, 'UT', 'user', 'basico', 0, 0, '2026-08-03 16:05:05', '2026-08-03 16:05:05', '2026-08-03 16:05:05');
INSERT INTO `User` (`id`, `email`, `name`, `lastName`, `passwordHash`, `image`, `phone`, `zone`, `bio`, `avatarInitials`, `role`, `plan`, `verified`, `banned`, `memberSince`, `createdAt`, `updatedAt`) VALUES ('cmsdzv3gs0000ujtt1iy12ufw', 'pepedemo@gmail.com', 'pepe', 'demo', '$2b$10$tswe9BcwYoycnGs5H0HfruGBHXPMxwavjpM6Avg7yCnqTWSQl5QuW', NULL, NULL, NULL, NULL, 'PD', 'user', 'basico', 0, 0, '2026-08-04 01:43:33', '2026-08-04 01:43:33', '2026-08-04 01:43:33');

-- Account: sin datos
-- Session: sin datos
-- VerificationToken: sin datos
-- ─── Category (27 registros) ───
DELETE FROM `Category`;
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a860003rjggg4t70egy', 'tecnologia', 'Tecnología', 'servicio', NULL, NULL, 342, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a860004rjggpc81ctsg', 'diseno', 'Diseño', 'servicio', NULL, NULL, 218, 1, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a870005rjgg7ncohvlp', 'marketing', 'Marketing', 'servicio', NULL, NULL, 189, 2, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a880006rjggs8qyhrhp', 'plomeria', 'Plomería', 'servicio', NULL, NULL, 97, 3, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a890007rjggoxvqmdlg', 'electricidad', 'Electricidad', 'servicio', NULL, NULL, 134, 4, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8a0008rjggmwfn9mfd', 'carpinteria', 'Carpintería', 'servicio', NULL, NULL, 76, 5, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8b0009rjgg3nz7f3j2', 'educacion', 'Clases y Educación', 'servicio', NULL, NULL, 203, 6, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8b000arjgg2q8cigq2', 'fotografia', 'Fotografía', 'servicio', NULL, NULL, 89, 7, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8c000brjgg8cr4ub8q', 'contabilidad', 'Contabilidad', 'servicio', NULL, NULL, 112, 8, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8d000crjggerglap1c', 'musica', 'Música', 'servicio', NULL, NULL, 64, 9, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8e000drjggzw5ce48b', 'toyota', 'Toyota', 'auto', NULL, NULL, 428, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8e000erjgg7y96xsu1', 'volkswagen', 'Volkswagen', 'auto', NULL, NULL, 312, 1, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8f000frjggdxnmijam', 'ford', 'Ford', 'auto', NULL, NULL, 289, 2, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8g000grjggwj4feb8a', 'renault', 'Renault', 'auto', NULL, NULL, 254, 3, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8h000hrjggsrdwe974', 'peugeot', 'Peugeot', 'auto', NULL, NULL, 198, 4, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8i000irjggh27ywpav', 'honda', 'Honda', 'auto', NULL, NULL, 176, 5, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8j000jrjggh4vhsnbc', 'chevrolet', 'Chevrolet', 'auto', NULL, NULL, 143, 6, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8k000krjggd7n41m54', 'jeep', 'Jeep', 'auto', NULL, NULL, 87, 7, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8k000lrjggu57tsbjg', 'departamento', 'Departamento', 'propiedad', NULL, NULL, 2840, 0, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8l000mrjggvfbarxms', 'casa', 'Casa', 'propiedad', NULL, NULL, 1920, 1, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8m000nrjgglhi9sedv', 'ph', 'PH', 'propiedad', NULL, NULL, 890, 2, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8m000orjggsvdi7ku8', 'local-comercial', 'Local comercial', 'propiedad', NULL, NULL, 340, 3, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8n000prjggd7sdvyn0', 'terreno', 'Terreno', 'propiedad', NULL, NULL, 110, 4, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8n000qrjggrac38zbs', 'oficina', 'Oficina', 'propiedad', NULL, NULL, 220, 5, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8o000rrjgg37sv3scv', 'quinta', 'Quinta', 'propiedad', NULL, NULL, 95, 6, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a8o000srjgg6ap35k1y', 'studio', 'Studio', 'propiedad', NULL, NULL, 78, 7, '2026-08-02 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Category` (`id`, `slug`, `name`, `type`, `icon`, `description`, `count`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsde4gjo0000q88z37nqbnqd', 'jardineria', 'Jardinería', 'servicio', NULL, 'Servicios de jardinería, paisajismo y diseño de jardines', 0, 0, '2026-08-03 15:34:58', '2026-08-03 20:42:52');

-- Subcategory: sin datos
-- ─── Listing (33 registros) ───
DELETE FROM `Listing`;
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ad90016rjggfqws8gbk', 'desarrollo-web-a-medida-en-react-y-nextjs-45zmw', 'Desarrollo web a medida en React y Next.js', 'Desarrollo de aplicaciones web modernas con React, Next.js y TypeScript. Incluye diseño responsivo, SEO optimizado y deployment. Más de 8 años de experiencia.', 'servicio', 'cmsce8a860003rjggg4t70egy', NULL, 18000, 'ARS', 'hora', 'CABA — Palermo', 'CABA', 'CABA', '["/uploads/desarrollo-web-a-medida-en-react-y-nextjs-45zmw-0.jpg","/uploads/desarrollo-web-a-medida-en-react-y-nextjs-45zmw-1.jpg"]', '["/uploads/desarrollo-web-a-medida-en-react-y-nextjs-45zmw-0.jpg","/uploads/desarrollo-web-a-medida-en-react-y-nextjs-45zmw-1.jpg"]', '{"Experiencia":"8 años","Stack":"React, Next.js, TypeScript","Disponibilidad":"Remoto o presencial"}', 5, 47, 1263, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8acw000wrjgg704tj46r', '2026-08-02 22:50:10', '2026-08-03 04:21:43');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adb0018rjggb9svkqs7', 'diseno-de-marca-e-identidad-visual-completa-5vgff', 'Diseño de marca e identidad visual completa', 'Diseño de logo, paleta de colores, tipografías y manual de marca. Incluye 3 propuestas y rondas de ajustes.', 'servicio', 'cmsce8a860004rjggpc81ctsg', NULL, 85000, 'ARS', 'unico', 'CABA — Palermo Soho', 'CABA', 'CABA', '["/uploads/diseno-2.jpg","/uploads/diseno-de-marca-e-identidad-visual-completa-5vgff-1.jpg"]', '["/uploads/diseno-2.jpg","/uploads/diseno-de-marca-e-identidad-visual-completa-5vgff-1.jpg"]', '{"Entrega":"7-10 días","Formatos":"AI, PDF, PNG, SVG","Revisiones":"3 incluidas"}', 4.9, 32, 892, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8ad40013rjggn4me9ibl', '2026-08-02 22:50:10', '2026-08-02 23:27:00');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adc001arjggb1k9mq05', 'marketing-digital-y-campanas-en-redes-sociales-s55ib', 'Marketing digital y campañas en redes sociales', 'Gestión completa de redes sociales, Meta Ads y Google Ads. Estrategia de contenido, community management y reportes mensuales.', 'servicio', 'cmsce8a870005rjgg7ncohvlp', NULL, 65000, 'ARS', 'mes', 'Remoto', 'Remoto', 'Remoto', '["/uploads/marketing-digital-y-campanas-en-redes-sociales-s55ib-0.jpg","/uploads/marketing-digital-y-campanas-en-redes-sociales-s55ib-1.jpg"]', '["/uploads/marketing-digital-y-campanas-en-redes-sociales-s55ib-0.jpg","/uploads/marketing-digital-y-campanas-en-redes-sociales-s55ib-1.jpg"]', '{"Plataformas":"Instagram, Facebook, Google","Incluye":"3 publicaciones/semana","Reportes":"Mensual"}', 4.8, 28, 654, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8acv000vrjgg6eg5yw2w', '2026-08-02 22:50:10', '2026-08-02 23:26:36');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ade001crjggeiytx4dc', 'plomero-matriculado-urgencias-24hs-eo8aa', 'Plomero matriculado — Urgencias 24hs', 'Servicio de plomería para reparaciones, destapaciones e instalaciones. Atiendo urgencias las 24 horas. Presupuesto sin cargo.', 'servicio', 'cmsce8a880006rjggs8qyhrhp', NULL, 12000, 'ARS', 'unico', 'CABA — Caballito', 'CABA', 'CABA', '["/uploads/plomero-matriculado-urgencias-24hs-eo8aa-0.jpg","/uploads/plomero-matriculado-urgencias-24hs-eo8aa-1.jpg"]', '["/uploads/plomero-matriculado-urgencias-24hs-eo8aa-0.jpg","/uploads/plomero-matriculado-urgencias-24hs-eo8aa-1.jpg"]', '{"Disponibilidad":"24 horas","Matrículado":"Sí","Zona":"CABA y GBA"}', 4.9, 156, 2103, 0, 'new', 0, NULL, 0, 'active', NULL, 'cmsce8act000urjgg798i5gq7', '2026-08-02 22:50:10', '2026-08-02 23:26:36');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adg001erjgg344rh146', 'electricista-certificado-instalaciones-y-reparaciones-m3pe3', 'Electricista certificado — Instalaciones y reparaciones', 'Instalaciones eléctricas domiciliarias y comerciales. Tableros, iluminación LED, aire acondicionado. Garantía escrita.', 'servicio', 'cmsce8a890007rjggoxvqmdlg', NULL, 15000, 'ARS', 'unico', 'GBA Norte — San Isidro', 'GBA Norte', 'GBA Norte', '["/uploads/electricista-certificado-instalaciones-y-reparaciones-m3pe3-0.jpg","/uploads/electricista-certificado-instalaciones-y-reparaciones-m3pe3-1.jpg"]', '["/uploads/electricista-certificado-instalaciones-y-reparaciones-m3pe3-0.jpg","/uploads/electricista-certificado-instalaciones-y-reparaciones-m3pe3-1.jpg"]', '{"Certificado":"Matrícula N° 4521","Garantía":"6 meses","Urgencias":"Sí"}', 4.7, 89, 1567, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8acx000xrjgg3jtt623a', '2026-08-02 22:50:10', '2026-08-02 23:26:36');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adh001grjgg2n2te3em', 'carpinteria-a-medida-muebles-y-amoblamientos-3af3g', 'Carpintería a medida — Muebles y amoblamientos', 'Diseño y fabricación de muebles a medida. Cocinas, placares, escritorios. Trabajo en melamina, madera maciza y MDF.', 'servicio', 'cmsce8a8a0008rjggmwfn9mfd', NULL, 250000, 'ARS', 'unico', 'GBA Oeste — Morón', 'GBA Oeste', 'GBA Oeste', '["/uploads/carpinteria.jpg","/uploads/carpinteria-2.jpg"]', '["/uploads/carpinteria.jpg","/uploads/carpinteria-2.jpg"]', '{"Materiales":"Melamina, Madera, MDF","Entrega":"15-20 días","Garantía":"1 año"}', 5, 41, 790, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8ad10010rjgg1tl366u5', '2026-08-02 22:50:10', '2026-08-03 02:45:00');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adj001irjggidlf5d6c', 'clases-particulares-de-matematicas-y-fisica-x7dqe', 'Clases particulares de matemáticas y física', 'Profesor universitario dicta clases particulares de matemática y física para secundario y CBC. Material incluido, clases online o presenciales.', 'servicio', 'cmsce8a8b0009rjgg3nz7f3j2', NULL, 4500, 'ARS', 'hora', 'CABA — Belgrano', 'CABA', 'CABA', '["/uploads/educacion-1.jpg","/uploads/clases-particulares-de-matematicas-y-fisica-x7dqe-1.jpg"]', '["/uploads/educacion-1.jpg","/uploads/clases-particulares-de-matematicas-y-fisica-x7dqe-1.jpg"]', '{"Nivel":"Secundario y Universitario","Modalidad":"Online o presencial","Material":"Incluido"}', 4.9, 67, 1102, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad50014rjggzi4pju3w', '2026-08-02 22:50:10', '2026-08-02 23:27:00');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adk001krjgg4jtpg89l', 'fotografia-profesional-para-eventos-y-productos-imlen', 'Fotografía profesional para eventos y productos', 'Sesiones de fotos para casamientos, cumpleaños, productos para e-commerce y contenido para redes. Edición incluida.', 'servicio', 'cmsce8a8b000arjgg2q8cigq2', NULL, 45000, 'ARS', 'unico', 'CABA — Microcentro', 'CABA', 'CABA', '["/uploads/fotografia-profesional-para-eventos-y-productos-imlen-0.jpg","/uploads/fotografia-profesional-para-eventos-y-productos-imlen-1.jpg"]', '["/uploads/fotografia-profesional-para-eventos-y-productos-imlen-0.jpg","/uploads/fotografia-profesional-para-eventos-y-productos-imlen-1.jpg"]', '{"Equipos":"Canon R5, lentes profesionales","Entrega":"5-7 días","Fotos":"200+ editadas"}', 4.8, 54, 689, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8acv000vrjgg6eg5yw2w', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adl001mrjggjp96vwqx', 'contador-publico-impuestos-y-monotributo-5u0rm', 'Contador público — Impuestos y monotributo', 'Asesoramiento impositivo, contable y laboral. Monotributo, IVA, ganancias, sueldos. Facturación y balances.', 'servicio', 'cmsce8a8c000brjgg8cr4ub8q', NULL, 35000, 'ARS', 'mes', 'CABA — Microcentro', 'CABA', 'CABA', '["/uploads/contador-publico-impuestos-y-monotributo-5u0rm-0.jpg","/uploads/contador-publico-impuestos-y-monotributo-5u0rm-1.jpg"]', '["/uploads/contador-publico-impuestos-y-monotributo-5u0rm-0.jpg","/uploads/contador-publico-impuestos-y-monotributo-5u0rm-1.jpg"]', '{"Servicios":"Impositivo, Contable, Laboral","Matriculado":"CPCECABA","Software":"Incluido"}', 4.9, 112, 1834, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad10010rjgg1tl366u5', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adm001orjgggqvgsdso', 'profesor-de-guitarra-y-produccion-musical-jd47k', 'Profesor de guitarra y producción musical', 'Clases de guitarra eléctrica y acústica para todos los niveles. Producción musical en home studio. Blues, rock, jazz.', 'servicio', 'cmsce8a8d000crjggerglap1c', NULL, 3800, 'ARS', 'hora', 'Remoto', 'Remoto', 'Remoto', '["/uploads/profesor-de-guitarra-y-produccion-musical-jd47k-0.jpg","/uploads/profesor-de-guitarra-y-produccion-musical-jd47k-1.jpg"]', '["/uploads/profesor-de-guitarra-y-produccion-musical-jd47k-0.jpg","/uploads/profesor-de-guitarra-y-produccion-musical-jd47k-1.jpg"]', '{"Niveles":"Inicial a avanzado","Estilos":"Rock, Blues, Jazz","Modalidad":"Online o presencial"}', 5, 23, 412, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad50014rjggzi4pju3w', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ado001qrjggzzgqq8bp', 'desarrollo-de-e-commerce-con-shopify-y-woocommerce-pdtxi', 'Desarrollo de e-commerce con Shopify y WooCommerce', 'Tiendas online completas con Shopify o WooCommerce. Integración con Mercado Pago, pasarelas de pago y logística.', 'servicio', 'cmsce8a860003rjggg4t70egy', NULL, 320000, 'ARS', 'unico', 'Remoto', 'Remoto', 'Remoto', '["/uploads/desarrollo-de-e-commerce-con-shopify-y-woocommerce-pdtxi-0.jpg","/uploads/desarrollo-de-e-commerce-con-shopify-y-woocommerce-pdtxi-1.jpg"]', '["/uploads/desarrollo-de-e-commerce-con-shopify-y-woocommerce-pdtxi-0.jpg","/uploads/desarrollo-de-e-commerce-con-shopify-y-woocommerce-pdtxi-1.jpg"]', '{"Plataformas":"Shopify, WooCommerce","Incluye":"Diseño + Desarrollo","Soporte":"30 días"}', 4.9, 38, 921, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad20011rjggf0wdn6lz', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adq001srjgglfct0x80', 'toyota-corolla-xei-2022-7ctje', 'Toyota Corolla XEI 2022', 'Toyota Corolla XEI 2022. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8e000drjggzw5ce48b', NULL, 28500000, 'ARS', 'unico', 'CABA — Villa Urquiza', 'CABA', 'CABA', '["/uploads/toyota-corolla-xei-2022-7ctje-0.jpg","/uploads/toyota-corolla-xei-2022-7ctje-1.jpg","/uploads/toyota-corolla-xei-2022-7ctje-2.jpg","/uploads/toyota-corolla-xei-2022-7ctje-3.jpg"]', '["/uploads/toyota-corolla-xei-2022-7ctje-0.jpg","/uploads/toyota-corolla-xei-2022-7ctje-1.jpg","/uploads/toyota-corolla-xei-2022-7ctje-2.jpg","/uploads/toyota-corolla-xei-2022-7ctje-3.jpg"]', '{"Marca":"Toyota","Modelo":"Corolla XEI","Año":2022,"Km":28000,"Combustible":"Nafta","Caja":"Automática"}', 5, 12, 3423, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8acw000wrjgg704tj46r', '2026-08-02 22:50:10', '2026-08-03 16:03:58');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adr001urjggvwwo5mh9', 'volkswagen-golf-gti-2021-dshvg', 'Volkswagen Golf GTI 2021', 'Volkswagen Golf GTI 2021. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8e000erjgg7y96xsu1', NULL, 32000000, 'ARS', 'unico', 'GBA Norte — San Isidro', 'GBA Norte', 'GBA Norte', '["/uploads/volkswagen-golf-gti-2021-dshvg-0.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-1.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-2.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-3.jpg"]', '["/uploads/volkswagen-golf-gti-2021-dshvg-0.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-1.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-2.jpg","/uploads/volkswagen-golf-gti-2021-dshvg-3.jpg"]', '{"Marca":"Volkswagen","Modelo":"Golf GTI","Año":2021,"Km":35000,"Combustible":"Nafta","Caja":"Automática"}', 4.9, 8, 2876, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8acx000xrjgg3jtt623a', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ads001wrjgglpe2xndn', 'ford-ecosport-se-2020-2kwu6', 'Ford EcoSport SE 2020', 'Ford EcoSport SE 2020. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8f000frjggdxnmijam', NULL, 18900000, 'ARS', 'unico', 'CABA — Caballito', 'CABA', 'CABA', '["/uploads/ford-ecosport-se-2020-2kwu6-0.jpg","/uploads/ford-ecosport-se-2020-2kwu6-1.jpg","/uploads/ford-ecosport-se-2020-2kwu6-2.jpg","/uploads/ford-ecosport-se-2020-2kwu6-3.jpg"]', '["/uploads/ford-ecosport-se-2020-2kwu6-0.jpg","/uploads/ford-ecosport-se-2020-2kwu6-1.jpg","/uploads/ford-ecosport-se-2020-2kwu6-2.jpg","/uploads/ford-ecosport-se-2020-2kwu6-3.jpg"]', '{"Marca":"Ford","Modelo":"EcoSport SE","Año":2020,"Km":52000,"Combustible":"Nafta","Caja":"Manual"}', 4.7, 5, 1543, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8acx000xrjgg3jtt623a', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adt001yrjggwb2qd044', 'renault-sandero-stepway-2023-pwij2', 'Renault Sandero Stepway 2023', 'Renault Sandero Stepway 2023. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8g000grjggwj4feb8a', NULL, 22000000, 'ARS', 'unico', 'GBA Sur — Quilmes', 'GBA Sur', 'GBA Sur', '["/uploads/renault-sandero-stepway-2023-pwij2-0.jpg","/uploads/renault-sandero-stepway-2023-pwij2-1.jpg","/uploads/renault-sandero-stepway-2023-pwij2-2.jpg","/uploads/renault-sandero-stepway-2023-pwij2-3.jpg"]', '["/uploads/renault-sandero-stepway-2023-pwij2-0.jpg","/uploads/renault-sandero-stepway-2023-pwij2-1.jpg","/uploads/renault-sandero-stepway-2023-pwij2-2.jpg","/uploads/renault-sandero-stepway-2023-pwij2-3.jpg"]', '{"Marca":"Renault","Modelo":"Sandero Stepway","Año":2023,"Km":12000,"Combustible":"Nafta","Caja":"Manual"}', 5, 3, 987, 0, 'new', 0, NULL, 0, 'active', NULL, 'cmsce8ad0000zrjggpq3fciu8', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adv0020rjggfb2lz3mx', 'peugeot-208-allure-2022-91w7c', 'Peugeot 208 Allure 2022', 'Peugeot 208 Allure 2022. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8h000hrjggsrdwe974', NULL, 24000000, 'ARS', 'unico', 'CABA — Belgrano', 'CABA', 'CABA', '["/uploads/peugeot-208-allure-2022-91w7c-0.jpg","/uploads/peugeot-208-allure-2022-91w7c-1.jpg","/uploads/peugeot-208-allure-2022-91w7c-2.jpg","/uploads/peugeot-208-allure-2022-91w7c-3.jpg"]', '["/uploads/peugeot-208-allure-2022-91w7c-0.jpg","/uploads/peugeot-208-allure-2022-91w7c-1.jpg","/uploads/peugeot-208-allure-2022-91w7c-2.jpg","/uploads/peugeot-208-allure-2022-91w7c-3.jpg"]', '{"Marca":"Peugeot","Modelo":"208 Allure","Año":2022,"Km":24000,"Combustible":"Nafta","Caja":"Automática"}', 4.8, 9, 1234, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad40013rjggn4me9ibl', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adw0022rjggh2intliy', 'honda-cr-v-exl-2021-mz769', 'Honda CR-V EXL 2021', 'Honda CR-V EXL 2021. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8i000irjggh27ywpav', NULL, 38500000, 'ARS', 'unico', 'GBA Norte — San Isidro', 'GBA Norte', 'GBA Norte', '["/uploads/honda-cr-v-exl-2021-mz769-0.jpg","/uploads/honda-cr-v-exl-2021-mz769-1.jpg","/uploads/honda-cr-v-exl-2021-mz769-2.jpg","/uploads/honda-cr-v-exl-2021-mz769-3.jpg"]', '["/uploads/honda-cr-v-exl-2021-mz769-0.jpg","/uploads/honda-cr-v-exl-2021-mz769-1.jpg","/uploads/honda-cr-v-exl-2021-mz769-2.jpg","/uploads/honda-cr-v-exl-2021-mz769-3.jpg"]', '{"Marca":"Honda","Modelo":"CR-V EXL","Año":2021,"Km":41000,"Combustible":"Nafta","Caja":"Automática CVT"}', 5, 7, 1876, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8acv000vrjgg6eg5yw2w', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adx0024rjggq89znyx3', 'chevrolet-onix-ltz-2022-86cda', 'Chevrolet Onix LTZ 2022', 'Chevrolet Onix LTZ 2022. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8j000jrjggh4vhsnbc', NULL, 21500000, 'ARS', 'unico', 'CABA — Palermo', 'CABA', 'CABA', '["/uploads/chevrolet-onix-ltz-2022-86cda-0.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-1.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-2.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-3.jpg"]', '["/uploads/chevrolet-onix-ltz-2022-86cda-0.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-1.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-2.jpg","/uploads/chevrolet-onix-ltz-2022-86cda-3.jpg"]', '{"Marca":"Chevrolet","Modelo":"Onix LTZ","Año":2022,"Km":31000,"Combustible":"Nafta","Caja":"Automática"}', 4.8, 11, 1456, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8acw000wrjgg704tj46r', '2026-08-02 22:50:10', '2026-08-02 23:26:37');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ady0026rjgg7m7ekfqp', 'jeep-renegade-longitude-2023-3o2zj', 'Jeep Renegade Longitude 2023', 'Jeep Renegade Longitude 2023. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8k000krjggd7n41m54', NULL, 41000000, 'ARS', 'unico', 'GBA Oeste — Morón', 'GBA Oeste', 'GBA Oeste', '["/uploads/jeep-renegade-longitude-2023-3o2zj-0.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-1.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-2.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-3.jpg"]', '["/uploads/jeep-renegade-longitude-2023-3o2zj-0.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-1.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-2.jpg","/uploads/jeep-renegade-longitude-2023-3o2zj-3.jpg"]', '{"Marca":"Jeep","Modelo":"Renegade Longitude","Año":2023,"Km":8000,"Combustible":"Diésel","Caja":"Automática"}', 5, 4, 2345, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8ad0000zrjggpq3fciu8', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8adz0028rjggrm96dbwc', 'toyota-hilux-srv-4x4-2022-ut139', 'Toyota Hilux SRV 4x4 2022', 'Toyota Hilux SRV 4x4 2022. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8e000drjggzw5ce48b', NULL, 52000000, 'ARS', 'unico', 'Córdoba Capital', 'Córdoba', 'Córdoba', '["/uploads/toyota-hilux-srv-4x4-2022-ut139-0.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-1.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-2.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-3.jpg"]', '["/uploads/toyota-hilux-srv-4x4-2022-ut139-0.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-1.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-2.jpg","/uploads/toyota-hilux-srv-4x4-2022-ut139-3.jpg"]', '{"Marca":"Toyota","Modelo":"Hilux SRV 4x4","Año":2022,"Km":35000,"Combustible":"Diésel","Caja":"Automática"}', 4.9, 6, 1987, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8ad30012rjggcflesy0r', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae0002arjgg71xtbwtv', 'honda-civic-ex-2020-hi2ni', 'Honda Civic EX 2020', 'Honda Civic EX 2020. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.', 'auto', 'cmsce8a8i000irjggh27ywpav', NULL, 26500000, 'ARS', 'unico', 'Rosario', 'Santa Fe', 'Santa Fe', '["/uploads/honda-civic-ex-2020-hi2ni-0.jpg","/uploads/honda-civic-ex-2020-hi2ni-1.jpg","/uploads/honda-civic-ex-2020-hi2ni-2.jpg","/uploads/honda-civic-ex-2020-hi2ni-3.jpg"]', '["/uploads/honda-civic-ex-2020-hi2ni-0.jpg","/uploads/honda-civic-ex-2020-hi2ni-1.jpg","/uploads/honda-civic-ex-2020-hi2ni-2.jpg","/uploads/honda-civic-ex-2020-hi2ni-3.jpg"]', '{"Marca":"Honda","Modelo":"Civic EX","Año":2020,"Km":48000,"Combustible":"Nafta","Caja":"CVT"}', 4.7, 8, 1123, 0, 'featured', 1, '2026-09-02 23:03:33', 3, 'active', NULL, 'cmsce8act000urjgg798i5gq7', '2026-08-02 22:50:10', '2026-08-03 23:03:33');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae3002crjggmn5oznzi', 'departamento-2-ambientes-en-palermo-sgdix', 'Departamento 2 ambientes en Palermo', 'Departamento 2 ambientes en Palermo. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8k000lrjggu57tsbjg', NULL, 95000, 'ARS', 'mes', 'CABA — Palermo', 'CABA', 'CABA', '["/uploads/departamento-2-ambientes-en-palermo-sgdix-0.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-1.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-2.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-3.jpg"]', '["/uploads/departamento-2-ambientes-en-palermo-sgdix-0.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-1.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-2.jpg","/uploads/departamento-2-ambientes-en-palermo-sgdix-3.jpg"]', '{"Tipo":"Departamento","Operación":"Alquiler","Superficie":"55 m²","Ambientes":2,"Baños":1,"Piso":"3°"}', 5, 18, 4521, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8ad20011rjggf0wdn6lz', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae6002erjgg479i2b5l', 'casa-4-ambientes-con-jardin-en-san-isidro-zy8d7', 'Casa 4 ambientes con jardín en San Isidro', 'Casa 4 ambientes con jardín en San Isidro. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8l000mrjggvfbarxms', NULL, 285000000, 'ARS', 'unico', 'GBA Norte — San Isidro', 'GBA Norte', 'GBA Norte', '["/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-0.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-1.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-2.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-3.jpg"]', '["/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-0.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-1.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-2.jpg","/uploads/casa-4-ambientes-con-jardin-en-san-isidro-zy8d7-3.jpg"]', '{"Tipo":"Casa","Operación":"Venta","Superficie":"220 m²","Ambientes":4,"Baños":3,"Jardín":"Sí","Cochera":"2 autos"}', 4.9, 12, 3878, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8acz000yrjggprul5rkx', '2026-08-02 22:50:10', '2026-08-03 20:38:06');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae7002grjgg2tojomy4', 'ph-3-ambientes-con-patio-en-caballito-d8eke', 'PH 3 ambientes con patio en Caballito', 'PH 3 ambientes con patio en Caballito. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8m000nrjgglhi9sedv', NULL, 145000000, 'ARS', 'unico', 'CABA — Caballito', 'CABA', 'CABA', '["/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-0.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-1.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-2.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-3.jpg"]', '["/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-0.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-1.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-2.jpg","/uploads/ph-3-ambientes-con-patio-en-caballito-d8eke-3.jpg"]', '{"Tipo":"PH","Operación":"Venta","Superficie":"110 m²","Ambientes":3,"Baños":2,"Patio":"Sí"}', 4.8, 7, 2345, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad20011rjggf0wdn6lz', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae8002irjgg59hc1ag1', 'local-comercial-en-zona-centrica-6k03p', 'Local comercial en zona céntrica', 'Local comercial en zona céntrica. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8m000orjggsvdi7ku8', NULL, 350000, 'ARS', 'mes', 'CABA — Microcentro', 'CABA', 'CABA', '["/uploads/local-comercial-en-zona-centrica-6k03p-0.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-1.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-2.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-3.jpg"]', '["/uploads/local-comercial-en-zona-centrica-6k03p-0.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-1.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-2.jpg","/uploads/local-comercial-en-zona-centrica-6k03p-3.jpg"]', '{"Tipo":"Local comercial","Operación":"Alquiler","Superficie":"80 m²","Frente":"8 m","Depósito":"Sí"}', 4.7, 5, 1876, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8ad40013rjggn4me9ibl', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ae9002krjggfrfj7dvj', 'terreno-500m-para-construir-x6emz', 'Terreno 500m² para construir', 'Terreno 500m² para construir. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8n000prjggd7sdvyn0', NULL, 89000000, 'ARS', 'unico', 'GBA Sur — Ezeiza', 'GBA Sur', 'GBA Sur', '["/uploads/terreno-500m-para-construir-x6emz-0.jpg","/uploads/terreno-500m-para-construir-x6emz-1.jpg","/uploads/terreno-500m-para-construir-x6emz-2.jpg","/uploads/terreno-500m-para-construir-x6emz-3.jpg"]', '["/uploads/terreno-500m-para-construir-x6emz-0.jpg","/uploads/terreno-500m-para-construir-x6emz-1.jpg","/uploads/terreno-500m-para-construir-x6emz-2.jpg","/uploads/terreno-500m-para-construir-x6emz-3.jpg"]', '{"Tipo":"Terreno","Operación":"Venta","Superficie":"500 m²","Servicios":"Todos"}', 4.6, 4, 1234, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8ad30012rjggcflesy0r', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8aea002mrjggahb7vg51', 'oficina-moderna-en-puerto-madero-5a6vk', 'Oficina moderna en Puerto Madero', 'Oficina moderna en Puerto Madero. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8n000qrjggrac38zbs', NULL, 1200000, 'ARS', 'mes', 'CABA — Puerto Madero', 'CABA', 'CABA', '["/uploads/oficina-moderna-en-puerto-madero-5a6vk-0.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-1.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-2.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-3.jpg"]', '["/uploads/oficina-moderna-en-puerto-madero-5a6vk-0.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-1.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-2.jpg","/uploads/oficina-moderna-en-puerto-madero-5a6vk-3.jpg"]', '{"Tipo":"Oficina","Operación":"Alquiler","Superficie":"150 m²","Piso":"12°","Cochera":"3 espacios"}', 5, 9, 2991, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8ad10010rjgg1tl366u5', '2026-08-02 22:50:10', '2026-08-03 22:46:15');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8aec002orjggt2yhvykz', 'quinta-con-pileta-en-tigre-v96u0', 'Quinta con pileta en Tigre', 'Quinta con pileta en Tigre. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8o000rrjgg37sv3scv', NULL, 195000000, 'ARS', 'unico', 'GBA Norte — Tigre', 'GBA Norte', 'GBA Norte', '["/uploads/quinta-con-pileta-en-tigre-v96u0-0.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-1.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-2.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-3.jpg"]', '["/uploads/quinta-con-pileta-en-tigre-v96u0-0.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-1.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-2.jpg","/uploads/quinta-con-pileta-en-tigre-v96u0-3.jpg"]', '{"Tipo":"Quinta","Operación":"Venta","Superficie":"450 m²","Pileta":"Sí","Asador":"Sí"}', 4.9, 8, 2156, 0, 'hot', 0, NULL, 0, 'active', NULL, 'cmsce8acv000vrjgg6eg5yw2w', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8aed002qrjggwvvb9pja', 'studio-amoblado-en-san-telmo-7uzd4', 'Studio amoblado en San Telmo', 'Studio amoblado en San Telmo. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8o000srjgg6ap35k1y', NULL, 65000, 'ARS', 'mes', 'CABA — San Telmo', 'CABA', 'CABA', '["/uploads/studio-amoblado-en-san-telmo-7uzd4-0.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-1.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-2.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-3.jpg"]', '["/uploads/studio-amoblado-en-san-telmo-7uzd4-0.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-1.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-2.jpg","/uploads/studio-amoblado-en-san-telmo-7uzd4-3.jpg"]', '{"Tipo":"Studio","Operación":"Alquiler temporal","Superficie":"32 m²","Amoblado":"Sí","WiFi":"Sí","Vista":"A la calle"}', 4.8, 11, 1678, 0, 'new', 0, NULL, 0, 'active', NULL, 'cmsce8ad0000zrjggpq3fciu8', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8aeg002srjggjdmp4z49', 'departamento-3-ambientes-en-belgrano-8vbjm', 'Departamento 3 ambientes en Belgrano', 'Departamento 3 ambientes en Belgrano. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8k000lrjggu57tsbjg', NULL, 165000000, 'ARS', 'unico', 'CABA — Belgrano', 'CABA', 'CABA', '["/uploads/departamento-3-ambientes-en-belgrano-8vbjm-0.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-1.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-2.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-3.jpg"]', '["/uploads/departamento-3-ambientes-en-belgrano-8vbjm-0.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-1.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-2.jpg","/uploads/departamento-3-ambientes-en-belgrano-8vbjm-3.jpg"]', '{"Tipo":"Departamento","Operación":"Venta","Superficie":"78 m²","Ambientes":3,"Baños":2,"Piso":"5°","Expensas":85000}', 4.8, 14, 2890, 0, NULL, 0, NULL, 0, 'active', NULL, 'cmsce8acv000vrjgg6eg5yw2w', '2026-08-02 22:50:10', '2026-08-02 23:26:38');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmsce8aei002urjggc4i9k7p5', 'casa-de-campo-en-cordoba-6605h', 'Casa de campo en Córdoba', 'Casa de campo en Córdoba. Excelente ubicación, todos los servicios. Listo para habitar.', 'propiedad', 'cmsce8a8l000mrjggvfbarxms', NULL, 225000000, 'ARS', 'unico', 'Córdoba Capital', 'Córdoba', 'Córdoba', '["/uploads/casa-de-campo-en-cordoba-6605h-0.jpg","/uploads/casa-de-campo-en-cordoba-6605h-1.jpg","/uploads/casa-de-campo-en-cordoba-6605h-2.jpg","/uploads/casa-de-campo-en-cordoba-6605h-3.jpg"]', '["/uploads/casa-de-campo-en-cordoba-6605h-0.jpg","/uploads/casa-de-campo-en-cordoba-6605h-1.jpg","/uploads/casa-de-campo-en-cordoba-6605h-2.jpg","/uploads/casa-de-campo-en-cordoba-6605h-3.jpg"]', '{"Tipo":"Casa","Operación":"Venta","Superficie":"320 m²","Ambientes":5,"Baños":4,"Jardín":"Sí 2000m²","Cochera":"Sí"}', 5, 6, 2001, 0, 'featured', 1, '2026-09-01 22:50:10', 2, 'active', NULL, 'cmsce8acw000wrjgg704tj46r', '2026-08-02 22:50:10', '2026-08-03 01:42:51');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmse3bkch000mujx02z3seimh', 'pagina-web-test-8d6dd', 'Pagina web test', 'pagina web test asdasdasdasdasdasd', 'servicio', 'cmsce8a860003rjggg4t70egy', NULL, 5200, 'ARS', 'unico', 'palermo', 'CABA', 'CABA', '["/uploads/154-29-1b0f994520e6.png"]', '["/uploads/154-29-1b0f994520e6.png"]', '{"experiencia":"5 años","disponibilidad":"Full time"}', 0, 0, 3, 0, 'new', 0, NULL, 0, 'active', NULL, 'cmsce8act000urjgg798i5gq7', '2026-08-04 03:20:20', '2026-08-04 03:22:01');
INSERT INTO `Listing` (`id`, `slug`, `title`, `description`, `categoryType`, `categoryId`, `subcategoryId`, `price`, `currency`, `priceUnit`, `location`, `zone`, `province`, `images`, `thumbs`, `attrs`, `rating`, `reviewCount`, `views`, `contactCount`, `badge`, `featured`, `featuredUntil`, `boostLevel`, `status`, `rejectionReason`, `sellerId`, `createdAt`, `updatedAt`) VALUES ('cmse3d7i2000oujx0xbw2uo46', 'pagina-web-paga-test-1fvns', 'pagina web paga test', 'sdasdsadsadsadsadasdasdasda sadasdasdasdasdasdadasd', 'servicio', 'cmsce8a860003rjggg4t70egy', NULL, 2000, 'ARS', 'unico', 'palermo', 'CABA', 'CABA', '["/uploads/12360-clvq-cd20e1b172d1.png"]', '["/uploads/12360-clvq-cd20e1b172d1.png"]', '{}', 0, 0, 2, 0, 'new', 0, NULL, 0, 'active', NULL, 'cmsce8act000urjgg798i5gq7', '2026-08-04 03:21:37', '2026-08-04 03:22:52');

-- ─── Review (100 registros) ───
DELETE FROM `Review`;
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aej002wrjgg4za7eivm', 'cmsce8ad90016rjggfqws8gbk', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-17 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aek002yrjggb4wpk8uf', 'cmsce8ad90016rjggfqws8gbk', 'cmsce8acx000xrjgg3jtt623a', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-07 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ael0030rjggwk4i0b6j', 'cmsce8ad90016rjggfqws8gbk', 'cmsce8ad50014rjggzi4pju3w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-11 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ael0032rjggbn21ayyr', 'cmsce8ad90016rjggfqws8gbk', 'cmsce8act000urjgg798i5gq7', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-21 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ael0034rjggpgrrtigw', 'cmsce8adb0018rjggb9svkqs7', 'cmsce8ad50014rjggzi4pju3w', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-22 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aeq0038rjgg6ihwv9mb', 'cmsce8adb0018rjggb9svkqs7', 'cmsce8acx000xrjgg3jtt623a', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-18 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aeq003arjggokvor4u4', 'cmsce8adb0018rjggb9svkqs7', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-28 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aer003crjggflm85vrd', 'cmsce8adc001arjggb1k9mq05', 'cmsce8act000urjgg798i5gq7', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-16 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aer003erjggt57pz420', 'cmsce8adc001arjggb1k9mq05', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-28 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aes003grjggjywymlsl', 'cmsce8adc001arjggb1k9mq05', 'cmsce8ad10010rjgg1tl366u5', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-07 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aes003irjggr017p6ba', 'cmsce8adc001arjggb1k9mq05', 'cmsce8ad40013rjggn4me9ibl', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-22 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aet003krjggn9qnwr9q', 'cmsce8ade001crjggeiytx4dc', 'cmsce8acx000xrjgg3jtt623a', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-06 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aeu003mrjgg4n2flqhl', 'cmsce8ade001crjggeiytx4dc', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-07 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aeu003orjgguuzd1qsu', 'cmsce8ade001crjggeiytx4dc', 'cmsce8ad30012rjggcflesy0r', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-21 22:50:10', '2026-08-02 22:50:10');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aew003srjggh98d8klt', 'cmsce8adg001erjgg344rh146', 'cmsce8ad10010rjgg1tl366u5', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-23 22:50:10', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aew003urjggv2bayrh0', 'cmsce8adg001erjgg344rh146', 'cmsce8acw000wrjgg704tj46r', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aex003wrjggfw0u9gtu', 'cmsce8adg001erjgg344rh146', 'cmsce8ad50014rjggzi4pju3w', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-29 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aex003yrjggflfbl6i6', 'cmsce8adh001grjgg2n2te3em', 'cmsce8ad30012rjggcflesy0r', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-22 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aey0040rjggindtseds', 'cmsce8adh001grjgg2n2te3em', 'cmsce8acx000xrjgg3jtt623a', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-22 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aez0044rjggckh6gb91', 'cmsce8adh001grjgg2n2te3em', 'cmsce8acw000wrjgg704tj46r', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af00046rjggi8jxq1op', 'cmsce8adj001irjggidlf5d6c', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-17 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af10048rjgg9pokvzyy', 'cmsce8adj001irjggidlf5d6c', 'cmsce8ad40013rjggn4me9ibl', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af1004arjgg3awhh5cf', 'cmsce8adj001irjggidlf5d6c', 'cmsce8ad30012rjggcflesy0r', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-21 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af1004crjgg07x3dt11', 'cmsce8adk001krjgg4jtpg89l', 'cmsce8acw000wrjgg704tj46r', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-19 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af2004erjggl2o3hai7', 'cmsce8adk001krjgg4jtpg89l', 'cmsce8ad30012rjggcflesy0r', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af2004grjgg75ihfyo2', 'cmsce8adk001krjgg4jtpg89l', 'cmsce8ad40013rjggn4me9ibl', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-16 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af2004irjggtuopbkp5', 'cmsce8adl001mrjggjp96vwqx', 'cmsce8acw000wrjgg704tj46r', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-10 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af3004krjggapchio1f', 'cmsce8adm001orjgggqvgsdso', 'cmsce8acx000xrjgg3jtt623a', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-07 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af3004mrjgghbc4quxe', 'cmsce8adm001orjgggqvgsdso', 'cmsce8act000urjgg798i5gq7', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-11 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af4004orjgg3098xxg0', 'cmsce8adm001orjgggqvgsdso', 'cmsce8ad20011rjggf0wdn6lz', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-31 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af5004qrjggodaqufrr', 'cmsce8ado001qrjggzzgqq8bp', 'cmsce8ad40013rjggn4me9ibl', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af6004srjggrchbdd89', 'cmsce8ado001qrjggzzgqq8bp', 'cmsce8acx000xrjgg3jtt623a', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-21 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af7004wrjgglzd2le73', 'cmsce8adq001srjgglfct0x80', 'cmsce8ad30012rjggcflesy0r', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-17 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af8004yrjggw4fyy4pe', 'cmsce8adq001srjgglfct0x80', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-13 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8af90050rjggzcfhg269', 'cmsce8adq001srjgglfct0x80', 'cmsce8ad40013rjggn4me9ibl', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-08 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afa0052rjgg7z9jbppv', 'cmsce8adr001urjggvwwo5mh9', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-15 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afa0054rjggjkwuh908', 'cmsce8adr001urjggvwwo5mh9', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-22 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afa0056rjggrm9pu8k0', 'cmsce8adr001urjggvwwo5mh9', 'cmsce8acz000yrjggprul5rkx', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afq0058rjggenmn0ae8', 'cmsce8adr001urjggvwwo5mh9', 'cmsce8ad20011rjggf0wdn6lz', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afq005arjgg08d9eo2e', 'cmsce8ads001wrjgglpe2xndn', 'cmsce8ad40013rjggn4me9ibl', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-22 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afr005crjgg5khu5vyl', 'cmsce8ads001wrjgglpe2xndn', 'cmsce8ad10010rjgg1tl366u5', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-28 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afs005erjggcqmzkdze', 'cmsce8ads001wrjgglpe2xndn', 'cmsce8ad50014rjggzi4pju3w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afs005grjggzlewp0jd', 'cmsce8ads001wrjgglpe2xndn', 'cmsce8ad0000zrjggpq3fciu8', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aft005irjggtyym3npc', 'cmsce8adt001yrjggwb2qd044', 'cmsce8acz000yrjggprul5rkx', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-09 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aft005krjgg1pw4n3ag', 'cmsce8adt001yrjggwb2qd044', 'cmsce8ad40013rjggn4me9ibl', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-19 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afu005mrjggxcbciudw', 'cmsce8adt001yrjggwb2qd044', 'cmsce8acx000xrjgg3jtt623a', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-23 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afv005orjggmtl8g7m1', 'cmsce8adv0020rjggfb2lz3mx', 'cmsce8act000urjgg798i5gq7', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-09 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afw005qrjggdqshmd52', 'cmsce8adv0020rjggfb2lz3mx', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afx005srjggcxrwj5oo', 'cmsce8adw0022rjggh2intliy', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afx005urjgg5cl6gg4s', 'cmsce8adw0022rjggh2intliy', 'cmsce8ad40013rjggn4me9ibl', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-30 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afy005wrjgg5kj2stko', 'cmsce8adw0022rjggh2intliy', 'cmsce8ad10010rjgg1tl366u5', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-08 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8afz005yrjggga3bh589', 'cmsce8adx0024rjggq89znyx3', 'cmsce8ad30012rjggcflesy0r', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-27 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag00060rjggan32z7x1', 'cmsce8adx0024rjggq89znyx3', 'cmsce8acx000xrjgg3jtt623a', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag10064rjgg2xuvg2it', 'cmsce8adx0024rjggq89znyx3', 'cmsce8act000urjgg798i5gq7', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag10066rjgg4oqm03mb', 'cmsce8ady0026rjgg7m7ekfqp', 'cmsce8ad10010rjgg1tl366u5', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag20068rjgg1rsnlk9i', 'cmsce8ady0026rjgg7m7ekfqp', 'cmsce8ad40013rjggn4me9ibl', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-09 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag3006arjgg5d6bv20g', 'cmsce8ady0026rjgg7m7ekfqp', 'cmsce8acw000wrjgg704tj46r', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-11 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag3006crjgghxams495', 'cmsce8ady0026rjgg7m7ekfqp', 'cmsce8act000urjgg798i5gq7', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-21 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag4006erjggro95rjr5', 'cmsce8adz0028rjggrm96dbwc', 'cmsce8acx000xrjgg3jtt623a', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag6006grjggswiykve0', 'cmsce8adz0028rjggrm96dbwc', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-25 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag7006irjggltl28v4f', 'cmsce8adz0028rjggrm96dbwc', 'cmsce8act000urjgg798i5gq7', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-21 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag7006krjggbmnz5rgw', 'cmsce8adz0028rjggrm96dbwc', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-11 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag8006mrjgg3nev240s', 'cmsce8ae0002arjgg71xtbwtv', 'cmsce8ad10010rjgg1tl366u5', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-24 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ag8006orjgghliu1sxz', 'cmsce8ae0002arjgg71xtbwtv', 'cmsce8acx000xrjgg3jtt623a', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-23 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aga006srjggwfxjjzcw', 'cmsce8ae0002arjgg71xtbwtv', 'cmsce8acw000wrjgg704tj46r', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-08 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8aga006urjggn14h23ec', 'cmsce8ae3002crjggmn5oznzi', 'cmsce8act000urjgg798i5gq7', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-07 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agb006wrjgg6j3lqlqc', 'cmsce8ae3002crjggmn5oznzi', 'cmsce8acw000wrjgg704tj46r', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agc006yrjggeiqdsjqc', 'cmsce8ae3002crjggmn5oznzi', 'cmsce8acz000yrjggprul5rkx', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-13 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agc0070rjgg43vu23nz', 'cmsce8ae3002crjggmn5oznzi', 'cmsce8ad40013rjggn4me9ibl', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-07 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agd0072rjgglktxs5jo', 'cmsce8ae6002erjgg479i2b5l', 'cmsce8acw000wrjgg704tj46r', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-26 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agd0074rjgggoi59hgc', 'cmsce8ae6002erjgg479i2b5l', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-10 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8age0076rjggcfpkoux3', 'cmsce8ae6002erjgg479i2b5l', 'cmsce8ad30012rjggcflesy0r', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-07 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8age0078rjgg45zivfk5', 'cmsce8ae6002erjgg479i2b5l', 'cmsce8ad10010rjgg1tl366u5', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-24 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agf007arjggpxzyje7u', 'cmsce8ae7002grjgg2tojomy4', 'cmsce8ad30012rjggcflesy0r', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agf007crjggl6l76vcn', 'cmsce8ae7002grjgg2tojomy4', 'cmsce8acz000yrjggprul5rkx', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agg007erjgg71p2xcf8', 'cmsce8ae7002grjgg2tojomy4', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-15 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agh007grjgglwadg91c', 'cmsce8ae8002irjgg59hc1ag1', 'cmsce8ad50014rjggzi4pju3w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-19 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agi007krjggv29yeinm', 'cmsce8ae8002irjgg59hc1ag1', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agj007mrjggphvhs00s', 'cmsce8ae8002irjgg59hc1ag1', 'cmsce8acz000yrjggprul5rkx', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-27 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agj007orjgg4w07tmeo', 'cmsce8ae9002krjggfrfj7dvj', 'cmsce8ad10010rjgg1tl366u5', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agk007qrjggfobh5syc', 'cmsce8ae9002krjggfrfj7dvj', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-13 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agk007srjggpal75649', 'cmsce8ae9002krjggfrfj7dvj', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-26 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agl007urjggk3l6jcvk', 'cmsce8aea002mrjggahb7vg51', 'cmsce8acz000yrjggprul5rkx', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-18 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agm007wrjgge0jpyq2r', 'cmsce8aea002mrjggahb7vg51', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-30 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agm007yrjggxsto0j3w', 'cmsce8aea002mrjggahb7vg51', 'cmsce8ad0000zrjggpq3fciu8', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agn0080rjggtistg85o', 'cmsce8aea002mrjggahb7vg51', 'cmsce8act000urjgg798i5gq7', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-10 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ago0082rjgg0dshcg51', 'cmsce8aec002orjggt2yhvykz', 'cmsce8ad10010rjgg1tl366u5', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-08-01 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ago0084rjggkw8fu3a0', 'cmsce8aec002orjggt2yhvykz', 'cmsce8acz000yrjggprul5rkx', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-28 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agp0086rjgglahweqnl', 'cmsce8aec002orjggt2yhvykz', 'cmsce8ad50014rjggzi4pju3w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-16 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agp0088rjggod4gvysh', 'cmsce8aec002orjggt2yhvykz', 'cmsce8ad20011rjggf0wdn6lz', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-14 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agq008arjgg1gy7o691', 'cmsce8aed002qrjggwvvb9pja', 'cmsce8ad30012rjggcflesy0r', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-09 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agr008crjgglr1576iz', 'cmsce8aed002qrjggwvvb9pja', 'cmsce8act000urjgg798i5gq7', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-08 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agr008erjggnu9k4klo', 'cmsce8aed002qrjggwvvb9pja', 'cmsce8ad50014rjggzi4pju3w', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-06 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ags008grjggdr9d1z4k', 'cmsce8aeg002srjggjdmp4z49', 'cmsce8acz000yrjggprul5rkx', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-19 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8ags008irjggsjk4vfjh', 'cmsce8aeg002srjggjdmp4z49', 'cmsce8acw000wrjgg704tj46r', 5, 'Gran experiencia, superó mis expectativas. Volveré a contratarlo.', 'active', '2026-07-17 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agt008krjggo4y0aqoc', 'cmsce8aeg002srjggjdmp4z49', 'cmsce8ad50014rjggzi4pju3w', 5, 'Muy buen trato y calidad. Precios accesibles.', 'active', '2026-07-23 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agt008mrjggm44pxprx', 'cmsce8aei002urjggc4i9k7p5', 'cmsce8ad20011rjggf0wdn6lz', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-15 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agu008orjgg7604c87p', 'cmsce8aei002urjggc4i9k7p5', 'cmsce8ad40013rjggn4me9ibl', 5, '100% recomendable. Serio, responsable y de confianza.', 'active', '2026-07-12 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agu008qrjggkeoulb1r', 'cmsce8aei002urjggc4i9k7p5', 'cmsce8acv000vrjgg6eg5yw2w', 5, 'Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.', 'active', '2026-07-30 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Review` (`id`, `listingId`, `userId`, `rating`, `comment`, `status`, `createdAt`, `updatedAt`) VALUES ('cmsce8agv008srjgg02sz63os', 'cmsce8aei002urjggc4i9k7p5', 'cmsce8ad0000zrjggpq3fciu8', 5, 'Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.', 'active', '2026-07-20 22:50:11', '2026-08-02 22:50:11');

-- Favorite: sin datos
-- ─── Conversation (3 registros) ───
DELETE FROM `Conversation`;
INSERT INTO `Conversation` (`id`, `listingId`, `createdAt`, `updatedAt`) VALUES ('cmsce8agx008urjggvogsk1vv', 'cmsce8adq001srjgglfct0x80', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Conversation` (`id`, `listingId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah00090rjggxwczt7w9', 'cmsce8ae3002crjggmn5oznzi', '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Conversation` (`id`, `listingId`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah40096rjgg4zyrnah9', 'cmsce8adb0018rjggb9svkqs7', '2026-08-02 22:50:11', '2026-08-02 22:50:11');

-- ─── Message (6 registros) ───
DELETE FROM `Message`;
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8agy008wrjgg89phm5yx', 'cmsce8agx008urjggvogsk1vv', 'cmsce8acv000vrjgg6eg5yw2w', '¿Aún está disponible?', 0, '2026-08-02 20:50:11');
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8agy008yrjggrnlwo4ig', 'cmsce8agx008urjggvogsk1vv', 'cmsce8act000urjgg798i5gq7', 'Gracias por tu mensaje, te respondo a la brevedad.', 0, '2026-08-02 21:50:11');
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8ah20092rjgglslwzw5l', 'cmsce8ah00090rjggxwczt7w9', 'cmsce8act000urjgg798i5gq7', 'Perfecto, lo veo mañana', 0, '2026-08-02 20:50:11');
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8ah20094rjgg8crn6x5r', 'cmsce8ah00090rjggxwczt7w9', 'cmsce8acw000wrjgg704tj46r', 'Gracias por tu mensaje, te respondo a la brevedad.', 0, '2026-08-02 21:50:11');
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8ah50098rjggv9lk890a', 'cmsce8ah40096rjgg4zyrnah9', 'cmsce8act000urjgg798i5gq7', 'Te envío el brief por mail', 0, '2026-08-02 20:50:11');
INSERT INTO `Message` (`id`, `conversationId`, `senderId`, `content`, `read`, `createdAt`) VALUES ('cmsce8ah6009arjgg6vi2tizh', 'cmsce8ah40096rjgg4zyrnah9', 'cmsce8ad20011rjggf0wdn6lz', 'Gracias por tu mensaje, te respondo a la brevedad.', 0, '2026-08-02 21:50:11');

-- ─── Plan (3 registros) ───
DELETE FROM `Plan`;
INSERT INTO `Plan` (`id`, `slug`, `name`, `price`, `currency`, `interval`, `description`, `features`, `maxListings`, `maxFeatured`, `badgeVerified`, `top10Access`, `multiUser`, `apiAccess`, `prioritySupport`, `monthlyReport`, `invoiceType`, `active`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a810000rjgga4geq295', 'basico', 'Básico', 0, 'ARS', 'month', 'Plan base para empezar en UMPI — editado desde UI', '["Publicaciones estándar","Búsqueda y filtros básicos","Mensajes ilimitados","1 publicación activa"]', 3, 0, 0, 0, 1, 0, 0, 0, 'null', 1, 0, '2026-08-02 22:50:10', '2026-08-03 20:43:18');
INSERT INTO `Plan` (`id`, `slug`, `name`, `price`, `currency`, `interval`, `description`, `features`, `maxListings`, `maxFeatured`, `badgeVerified`, `top10Access`, `multiUser`, `apiAccess`, `prioritySupport`, `monthlyReport`, `invoiceType`, `active`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a830001rjggx70lra6g', 'pro', 'Pro Test', 7990, 'ARS', 'month', 'Para profesionales que quieren crecer', '["Todo lo de Básico","Acceso al Top 10 semanal","5 publicaciones activas","2 destacados por mes","Alertas por email","Badge verificado en tu perfil","Estadísticas avanzadas","Soporte prioritario por chat"]', 5, 2, 1, 1, 1, 0, 1, 0, 'B', 1, 1, '2026-08-02 22:50:10', '2026-08-03 16:02:20');
INSERT INTO `Plan` (`id`, `slug`, `name`, `price`, `currency`, `interval`, `description`, `features`, `maxListings`, `maxFeatured`, `badgeVerified`, `top10Access`, `multiUser`, `apiAccess`, `prioritySupport`, `monthlyReport`, `invoiceType`, `active`, `order`, `createdAt`, `updatedAt`) VALUES ('cmsce8a840002rjggxny37wxp', 'business', 'Business', 24990, 'ARS', 'month', 'Para empresas y vendedores profesionales', '["Todo lo de Pro","Publicaciones ilimitadas","10 destacados por mes","Panel multi-usuario (5 usuarios)","Acceso a la API","Reportes mensuales","Gerente dedicado","Factura A"]', 9999, 10, 1, 1, 5, 1, 1, 1, 'A', 1, 2, '2026-08-02 22:50:10', '2026-08-02 22:50:10');

-- ─── Subscription (10 registros) ───
DELETE FROM `Subscription`;
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdfb3s1000fq88zbqmpiem0', 'cmsdf76o30007q88zd51tads3', 'pro', 'pending', '2026-08-03 16:08:08', '2026-09-02 16:08:08', 0, NULL, NULL, 7990, '2026-08-03 16:08:08', '2026-08-03 16:08:08');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdfzl7h000lq88z5s75onp7', 'cmsce8acs000trjggkktemzc6', 'pro', 'pending', '2026-08-03 16:27:10', '2026-09-02 16:27:10', 0, NULL, NULL, 7990, '2026-08-03 16:27:10', '2026-08-03 16:27:10');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdp343o0006uakh5tij121m', 'cmsce8acs000trjggkktemzc6', 'pro', 'pending', '2026-08-03 20:41:51', '2026-09-02 20:41:51', 0, NULL, NULL, 7990, '2026-08-03 20:41:51', '2026-08-03 20:41:51');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdp5imt000cuakh8ymrb3as', 'cmsce8acs000trjggkktemzc6', 'pro', 'pending', '2026-08-03 20:43:43', '2026-09-02 20:43:43', 0, NULL, NULL, 7990, '2026-08-03 20:43:43', '2026-08-03 20:43:43');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdtj73i000guakhlsyybxj8', 'cmsce8act000urjgg798i5gq7', 'business', 'pending', '2026-08-03 22:46:20', '2026-09-02 22:46:20', 0, NULL, NULL, 24990, '2026-08-03 22:46:20', '2026-08-03 22:46:20');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdtsk2m000ouakhfzq1tkm6', 'cmsce8acs000trjggkktemzc6', 'plantest', 'pending', '2026-08-03 22:53:37', '2026-09-02 22:53:37', 0, NULL, NULL, 500, '2026-08-03 22:53:37', '2026-08-03 22:53:37');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdu3ehd000wuakhp0vipe8w', 'cmsce8acs000trjggkktemzc6', 'pro', 'canceled', '2026-08-03 23:02:15', '2026-09-02 23:02:15', 1, NULL, NULL, 7990, '2026-08-03 23:02:03', '2026-08-04 02:01:59');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmsdu9kd4001ouakh4ny0gidg', 'cmsce8acx000xrjgg3jtt623a', 'pro', 'active', '2026-08-03 23:07:04', '2026-09-02 23:07:04', 0, NULL, NULL, 7990, '2026-08-03 23:06:50', '2026-08-03 23:07:04');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmse0it2q0001ujx0tkmzeni9', 'cmsce8acs000trjggkktemzc6', 'pro', 'pending', '2026-08-04 02:01:59', '2026-09-03 02:01:59', 0, NULL, NULL, 7990, '2026-08-04 02:01:59', '2026-08-04 02:01:59');
INSERT INTO `Subscription` (`id`, `userId`, `plan`, `status`, `startDate`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `mercadopagoId`, `mercadopagoPreapprovalId`, `amount`, `createdAt`, `updatedAt`) VALUES ('cmse0phd7000bujx0gsfkvgkx', 'cmsce8acs000trjggkktemzc6', 'business', 'active', '2026-08-04 02:07:22', '2026-09-03 02:07:22', 0, NULL, NULL, 24990, '2026-08-04 02:07:10', '2026-08-04 02:07:22');

-- ─── Boost (4 registros) ───
DELETE FROM `Boost`;
INSERT INTO `Boost` (`id`, `listingId`, `userId`, `type`, `durationDays`, `amount`, `status`, `startDate`, `endDate`, `mercadopagoPaymentId`, `createdAt`, `updatedAt`) VALUES ('cmsdu507m0014uakh735ljebd', 'cmsce8ade001crjggeiytx4dc', 'cmsce8act000urjgg798i5gq7', 'destacado', 30, 4990, 'pending', NULL, NULL, NULL, '2026-08-03 23:03:17', '2026-08-03 23:03:17');
INSERT INTO `Boost` (`id`, `listingId`, `userId`, `type`, `durationDays`, `amount`, `status`, `startDate`, `endDate`, `mercadopagoPaymentId`, `createdAt`, `updatedAt`) VALUES ('cmsdu5a5g001auakhahgcyu50', 'cmsce8ae0002arjgg71xtbwtv', 'cmsce8act000urjgg798i5gq7', 'premium_destacado', 30, 9990, 'active', '2026-08-03 23:03:33', '2026-09-02 23:03:33', 'DEMO-1785798213696', '2026-08-03 23:03:30', '2026-08-03 23:03:33');
INSERT INTO `Boost` (`id`, `listingId`, `userId`, `type`, `durationDays`, `amount`, `status`, `startDate`, `endDate`, `mercadopagoPaymentId`, `createdAt`, `updatedAt`) VALUES ('cmsdu5jc4001guakh5ipb6l1k', 'cmsce8ade001crjggeiytx4dc', 'cmsce8act000urjgg798i5gq7', 'top', 7, 2990, 'pending', NULL, NULL, NULL, '2026-08-03 23:03:42', '2026-08-03 23:03:42');
INSERT INTO `Boost` (`id`, `listingId`, `userId`, `type`, `durationDays`, `amount`, `status`, `startDate`, `endDate`, `mercadopagoPaymentId`, `createdAt`, `updatedAt`) VALUES ('cmse3d80w000qujx0gq5fhz4k', 'cmse3d7i2000oujx0xbw2uo46', 'cmsce8act000urjgg798i5gq7', 'destacado', 30, 4990, 'pending', NULL, NULL, NULL, '2026-08-04 03:21:37', '2026-08-04 03:21:37');

-- ─── Transaction (25 registros) ───
DELETE FROM `Transaction`;
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah7009crjgggiw8bjx9', 'TXN-808087', 'cmsce8ad0000zrjggpq3fciu8', NULL, NULL, 'Suscripción Pro - Mensual', 'mercadopago', 7990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah8009erjgg6vtzb10y', 'TXN-986021', 'cmsce8ad30012rjggcflesy0r', NULL, NULL, 'Suscripción Business - Mensual', 'mercadopago', 24990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-02 16:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah9009grjgg7k31oitq', 'TXN-519635', 'cmsce8ad30012rjggcflesy0r', NULL, NULL, 'Boost Destacado 30 días', 'mercadopago', 4990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-02 10:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ah9009irjggxl0f1lx1', 'TXN-840543', 'cmsce8ad50014rjggzi4pju3w', NULL, NULL, 'Suscripción Pro - Mensual', 'tarjeta', 7990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-02 04:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8aha009krjgg3ao1azrm', 'TXN-442371', 'cmsce8ad0000zrjggpq3fciu8', NULL, NULL, 'Boost Top 7 días', 'mercadopago', 2990, 'ARS', 'pending', NULL, NULL, NULL, '2026-08-01 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8aha009mrjgg2spgfnk6', 'TXN-842140', 'cmsce8acx000xrjgg3jtt623a', NULL, NULL, 'Suscripción Business - Mensual', 'transferencia', 24990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-01 16:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahb009orjggig909xfr', 'TXN-336437', 'cmsce8acz000yrjggprul5rkx', NULL, NULL, 'Boost Premium Destacado', 'mercadopago', 9990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-01 10:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahc009qrjgggxq2dt35', 'TXN-422804', 'cmsce8ad0000zrjggpq3fciu8', NULL, NULL, 'Suscripción Pro - Mensual', 'tarjeta', 7990, 'ARS', 'rejected', NULL, NULL, NULL, '2026-08-01 04:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahc009srjggf8kzvgb4', 'TXN-784677', 'cmsce8ad30012rjggcflesy0r', NULL, NULL, 'Suscripción Pro - Mensual', 'mercadopago', 7990, 'ARS', 'refunded', NULL, NULL, NULL, '2026-07-31 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahd009urjggy2zxv4f9', 'TXN-999897', 'cmsce8ad30012rjggcflesy0r', NULL, NULL, 'Boost Destacado 30 días', 'mercadopago', 4990, 'ARS', 'approved', NULL, NULL, NULL, '2026-07-31 16:50:11', '2026-08-02 22:50:11');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdf9mpi000dq88z628q45ge', 'TXN-357731', 'cmsdf76o30007q88zd51tads3', NULL, NULL, 'Boost Destacado 30 días', 'mercadopago', 4990, 'ARS', 'approved', NULL, NULL, NULL, '2026-08-03 16:06:59', '2026-08-03 16:06:59');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdfb3s2000hq88zh8r1nxwq', 'TXN-TCGXMG', 'cmsdf76o30007q88zd51tads3', 'cmsdfb3s1000fq88zbqmpiem0', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'pending', NULL, NULL, 'B', '2026-08-03 16:08:08', '2026-08-03 16:08:08');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdfzl7i000nq88zfj4tnn4w', 'TXN-QATLTA', 'cmsce8acs000trjggkktemzc6', 'cmsdfzl7h000lq88z5s75onp7', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'pending', NULL, NULL, 'B', '2026-08-03 16:27:10', '2026-08-03 16:27:10');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdp343q0008uakhaie1ymws', 'TXN-YSJM7S', 'cmsce8acs000trjggkktemzc6', 'cmsdp343o0006uakh5tij121m', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'pending', NULL, NULL, 'B', '2026-08-03 20:41:51', '2026-08-03 20:41:51');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdp5imv000euakh8dtz068g', 'TXN-MSUFY7', 'cmsce8acs000trjggkktemzc6', 'cmsdp5imt000cuakh8ymrb3as', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'pending', NULL, NULL, 'B', '2026-08-03 20:43:43', '2026-08-03 20:43:43');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdtj73j000iuakhgkgdvc01', 'TXN-QW5PPE', 'cmsce8act000urjgg798i5gq7', 'cmsdtj73i000guakhlsyybxj8', NULL, 'Suscripción Business — mensual', 'mercadopago', 24990, 'ARS', 'pending', NULL, NULL, 'A', '2026-08-03 22:46:20', '2026-08-03 22:46:20');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdtsk2o000quakh09p8yqz8', 'TXN-ARALWF', 'cmsce8acs000trjggkktemzc6', 'cmsdtsk2m000ouakhfzq1tkm6', NULL, 'Suscripción Plan test — mensual', 'mercadopago', 500, 'ARS', 'pending', NULL, NULL, NULL, '2026-08-03 22:53:37', '2026-08-03 22:53:37');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdu3ehg000yuakh08qk1u56', 'TXN-MCGCAK', 'cmsce8acs000trjggkktemzc6', 'cmsdu3ehd000wuakhp0vipe8w', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'approved', 'DEMO-1785798135234', NULL, 'B', '2026-08-03 23:02:03', '2026-08-03 23:02:15');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdu507p0016uakhnqsjxjig', 'TXN-GZ58N8', 'cmsce8act000urjgg798i5gq7', NULL, 'cmsdu507m0014uakh735ljebd', 'Boost Destacado (30 días)', 'mercadopago', 4990, 'ARS', 'rejected', 'DEMO-1785798200790', NULL, NULL, '2026-08-03 23:03:17', '2026-08-03 23:03:20');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdu5a5i001cuakhdci90lot', 'TXN-Q46E6K', 'cmsce8act000urjgg798i5gq7', NULL, 'cmsdu5a5g001auakhahgcyu50', 'Boost Premium Destacado (30 días + top placement)', 'mercadopago', 9990, 'ARS', 'approved', 'DEMO-1785798213696', NULL, NULL, '2026-08-03 23:03:30', '2026-08-03 23:03:33');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdu5jc5001iuakhsdem1nv5', 'TXN-YRDTJJ', 'cmsce8act000urjgg798i5gq7', NULL, 'cmsdu5jc4001guakh5ipb6l1k', 'Boost Top (7 días)', 'mercadopago', 2990, 'ARS', 'pending', 'DEMO-1785798225602', NULL, NULL, '2026-08-03 23:03:42', '2026-08-03 23:03:45');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmsdu9kd7001quakh9ok9csa2', 'TXN-GY4DTE', 'cmsce8acx000xrjgg3jtt623a', 'cmsdu9kd4001ouakh4ny0gidg', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'approved', 'DEMO-1785798424770', NULL, 'B', '2026-08-03 23:06:50', '2026-08-03 23:07:04');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmse0it2r0003ujx0mezd1vk1', 'TXN-CQDQGC', 'cmsce8acs000trjggkktemzc6', 'cmse0it2q0001ujx0tkmzeni9', NULL, 'Suscripción Pro Test — mensual', 'mercadopago', 7990, 'ARS', 'pending', NULL, NULL, 'B', '2026-08-04 02:01:59', '2026-08-04 02:01:59');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmse0phd9000dujx02vcl6ukg', 'TXN-XRD5HA', 'cmsce8acs000trjggkktemzc6', 'cmse0phd7000bujx0gsfkvgkx', NULL, 'Suscripción Business — mensual', 'mercadopago', 24990, 'ARS', 'approved', 'DEMO-1785809242751', NULL, 'A', '2026-08-04 02:07:10', '2026-08-04 02:07:22');
INSERT INTO `Transaction` (`id`, `txId`, `userId`, `subscriptionId`, `boostId`, `concept`, `method`, `amount`, `currency`, `status`, `mercadopagoPaymentId`, `mercadopagoPreferenceId`, `invoiceType`, `createdAt`, `updatedAt`) VALUES ('cmse3d80y000sujx0lfvhe63q', 'TXN-6UD2BW', 'cmsce8act000urjgg798i5gq7', NULL, 'cmse3d80w000qujx0gq5fhz4k', 'Boost Destacado (30 días)', 'mercadopago', 4990, 'ARS', 'pending', NULL, NULL, NULL, '2026-08-04 03:21:37', '2026-08-04 03:21:37');

-- ─── Report (4 registros) ───
DELETE FROM `Report`;
INSERT INTO `Report` (`id`, `reporterId`, `reportedUserId`, `listingId`, `reason`, `description`, `status`, `resolution`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahe009wrjggsqkbgah9', 'cmsce8ad50014rjggzi4pju3w', NULL, 'cmsce8adg001erjgg344rh146', 'contenido inapropiado', 'Reporte automático de prueba para validar el sistema de moderación.', 'open', NULL, '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Report` (`id`, `reporterId`, `reportedUserId`, `listingId`, `reason`, `description`, `status`, `resolution`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahf009yrjgg3nu1dvei', 'cmsce8ad40013rjggn4me9ibl', NULL, 'cmsce8adg001erjgg344rh146', 'estafa', 'Reporte automático de prueba para validar el sistema de moderación.', 'open', NULL, '2026-08-02 22:50:11', '2026-08-02 22:50:11');
INSERT INTO `Report` (`id`, `reporterId`, `reportedUserId`, `listingId`, `reason`, `description`, `status`, `resolution`, `createdAt`, `updatedAt`) VALUES ('cmsce8ahf00a0rjggph5dsskg', 'cmsce8ad30012rjggcflesy0r', NULL, 'cmsce8adc001arjggb1k9mq05', 'otro', 'Reporte automático de prueba para validar el sistema de moderación.', 'reviewing', NULL, '2026-08-02 22:50:11', '2026-08-04 03:16:54');
INSERT INTO `Report` (`id`, `reporterId`, `reportedUserId`, `listingId`, `reason`, `description`, `status`, `resolution`, `createdAt`, `updatedAt`) VALUES ('cmscmp5hw0001rjn0n2rqsp5s', 'cmsce8act000urjgg798i5gq7', 'cmsce8acw000wrjgg704tj46r', 'cmsce8ad90016rjggfqws8gbk', 'Es spam o engaño', NULL, 'resolved', NULL, '2026-08-03 02:47:14', '2026-08-04 03:16:43');

-- ─── Notification (42 registros) ───
DELETE FROM `Notification`;
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1ent0001rjq8ovbz1v3g', 'cmsce8acs000trjggkktemzc6', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1enu0003rjq8f18m0mv2', 'cmsce8acs000trjggkktemzc6', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1enw0005rjq8fdj8ggme', 'cmsce8acs000trjggkktemzc6', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 0, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eny0007rjq8meo3hn4u', 'cmsce8act000urjgg798i5gq7', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 1, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1enz0009rjq89h2i1azv', 'cmsce8act000urjgg798i5gq7', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo0000brjq8u4znykpe', 'cmsce8act000urjgg798i5gq7', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo1000drjq8fjocd4va', 'cmsce8acv000vrjgg6eg5yw2w', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo2000frjq8t1xf9e15', 'cmsce8acv000vrjgg6eg5yw2w', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo2000hrjq89d3nzn5x', 'cmsce8acv000vrjgg6eg5yw2w', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo4000jrjq8c9fo7k12', 'cmsce8acw000wrjgg704tj46r', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo5000lrjq893jkjh3b', 'cmsce8acw000wrjgg704tj46r', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo6000nrjq8i00q94ag', 'cmsce8acw000wrjgg704tj46r', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo8000prjq8ilfjeh6u', 'cmsce8acx000xrjgg3jtt623a', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo9000rrjq89c3j5tf7', 'cmsce8acx000xrjgg3jtt623a', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eo9000trjq81ettik2e', 'cmsce8acx000xrjgg3jtt623a', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eob000vrjq821hqto8b', 'cmsce8acz000yrjggprul5rkx', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoc000xrjq84g29aofn', 'cmsce8acz000yrjggprul5rkx', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoc000zrjq8jkayil9q', 'cmsce8acz000yrjggprul5rkx', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoe0011rjq8sbnd0cmz', 'cmsce8ad0000zrjggpq3fciu8', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eof0013rjq8hftd7msr', 'cmsce8ad0000zrjggpq3fciu8', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eof0015rjq8arzwezs5', 'cmsce8ad0000zrjggpq3fciu8', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eog0017rjq807ekrikt', 'cmsce8ad10010rjgg1tl366u5', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eog0019rjq86xz09pga', 'cmsce8ad10010rjgg1tl366u5', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoh001brjq8gmp5prmt', 'cmsce8ad10010rjgg1tl366u5', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 0, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoj001drjq8023y9k2y', 'cmsce8ad20011rjggf0wdn6lz', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eok001frjq8o7dx16xa', 'cmsce8ad20011rjggf0wdn6lz', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eol001hrjq8ijyw1q3f', 'cmsce8ad20011rjggf0wdn6lz', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eom001jrjq8led3w2t8', 'cmsce8ad30012rjggcflesy0r', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eon001lrjq812pb9esk', 'cmsce8ad30012rjggcflesy0r', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 0, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoo001nrjq8vdyuifid', 'cmsce8ad30012rjggcflesy0r', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 0, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoo001prjq8igau1ryn', 'cmsce8ad40013rjggn4me9ibl', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eop001rrjq8f8kbw492', 'cmsce8ad40013rjggn4me9ibl', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eoq001trjq8dlfy5tia', 'cmsce8ad40013rjggn4me9ibl', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eor001vrjq8yua9ihch', 'cmsce8ad50014rjggzi4pju3w', 'system', '¡Bienvenido a UMPI! 🎉', 'Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.', '/?page=home', 0, '2026-07-31 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eos001xrjq8h9m6h2ex', 'cmsce8ad50014rjggzi4pju3w', 'review', 'Nueva reseña recibida ⭐', 'Un usuario dejó una reseña de 5★ en tu publicación', '/?page=perfil', 1, '2026-08-01 23:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmscg1eot001zrjq8ajsztsww', 'cmsce8ad50014rjggzi4pju3w', 'message', 'Nuevo mensaje recibido 💬', 'Tenés un nuevo mensaje sobre tu publicación', '/?page=mensajes', 1, '2026-08-02 20:40:49');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmsdu3l4b0010uakhgampwmc7', 'cmsce8acs000trjggkktemzc6', 'subscription', 'Pago aprobado', 'Tu pago de $7990 fue aprobado. ¡Gracias por confiar en UMPI!', '/?page=perfil', 0, '2026-08-03 23:02:11');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmsdu3nxg0012uakhjhuogava', 'cmsce8acs000trjggkktemzc6', 'subscription', 'Pago aprobado', 'Tu pago de $7990 fue aprobado. ¡Gracias por confiar en UMPI!', '/?page=perfil', 0, '2026-08-03 23:02:15');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmsdu52hn0018uakhby7pcqb6', 'cmsce8act000urjgg798i5gq7', 'subscription', 'Pago rechazado', 'Tu pago de $4990 fue rechazado. Reintentá desde la sección Suscripciones.', '/?page=suscripciones', 0, '2026-08-03 23:03:20');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmsdu5cg8001euakhoq0z15iq', 'cmsce8act000urjgg798i5gq7', 'subscription', 'Pago aprobado', 'Tu pago de $9990 fue aprobado. ¡Gracias por confiar en UMPI!', '/?page=perfil', 1, '2026-08-03 23:03:33');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmsdu9vbu001suakh6fn0051q', 'cmsce8acx000xrjgg3jtt623a', 'subscription', 'Pago aprobado', 'Tu pago de $7990 fue aprobado. ¡Gracias por confiar en UMPI!', '/?page=perfil', 0, '2026-08-03 23:07:04');
INSERT INTO `Notification` (`id`, `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`) VALUES ('cmse0pqix000fujx0hh0zfnxw', 'cmsce8acs000trjggkktemzc6', 'subscription', 'Pago aprobado', 'Tu pago de $24990 fue aprobado. ¡Gracias por confiar en UMPI!', '/?page=perfil', 0, '2026-08-04 02:07:22');

-- ─── SiteConfig (1 registros) ───
DELETE FROM `SiteConfig`;
INSERT INTO `SiteConfig` (`id`, `key`, `value`) VALUES ('cmsde5jft0002q88zwuu9w04k', 'hero.title', 'UMPI — Marketplace de Argentina');

-- ─── AuditLog (25 registros) ───
DELETE FROM `AuditLog`;
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmscetxon0000rjwhk17k96b6', 'cmsce8acs000trjggkktemzc6', 'user_verify', 'user', 'cmsce8ad50014rjggzi4pju3w', '{"action":"verify"}', NULL, '2026-08-02 23:07:00');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsde4gjw0001q88zctme8iyp', 'cmsce8acs000trjggkktemzc6', 'category_create', 'category', 'cmsde4gjo0000q88z37nqbnqd', '{"name":"Jardinería","type":"servicio","slug":"jardineria"}', NULL, '2026-08-03 15:34:58');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsde5jg10003q88z4ax6t87i', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 15:35:48');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsde6bf70005q88zs3zj21wy', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 15:36:25');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdf3n5a0006q88zcwjsowtd', 'cmsce8acs000trjggkktemzc6', 'plan_update', 'plan', 'cmsce8a830001rjggx70lra6g', '{"planId":"cmsce8a830001rjggx70lra6g","slug":"pro","name":"Pro Test","price":7990,"currency":"ARS","interval":"month","description":"Para profesionales que quieren crecer","maxListings":5,"maxFeatured":2,"badgeVerified":true,"top10Access":true,"multiUser":1,"apiAccess":false,"prioritySupport":true,"monthlyReport":false,"invoiceType":"B","active":true,"order":1,"features":["Todo lo de Básico","Acceso al Top 10 semanal","5 publicaciones activas","2 destacados por mes","Alertas por email","Badge verificado en tu perfil","Estadísticas avanzadas","Soporte prioritario por chat"]}', NULL, '2026-08-03 16:02:20');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdfx6gf000jq88zmpgchi0e', 'cmsce8acs000trjggkktemzc6', 'mercadopago_config_update', 'site_config', NULL, '{"keys":["mp.access_token"],"saved":1,"cleared":0}', NULL, '2026-08-03 16:25:18');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp2w0i0001uakhy20a57bj', 'cmsce8acs000trjggkktemzc6', 'category_create', 'category', 'cmsdp2w0h0000uakhjgvubzut', '{"name":"Jardinería Test","type":"servicio","slug":"jardineria-test"}', NULL, '2026-08-03 20:41:41');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp2w160002uakh3bkhbtef', 'cmsce8acs000trjggkktemzc6', 'category_update', 'category', 'cmsdp2w0h0000uakhjgvubzut', '{"categoryId":"cmsdp2w0h0000uakhjgvubzut","name":"Jardinería Pro","description":"Editado por admin"}', NULL, '2026-08-03 20:41:41');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp2w260003uakhl1u7xv3o', 'cmsce8acs000trjggkktemzc6', 'plan_update', 'plan', 'cmsce8a810000rjgga4geq295', '{"planId":"cmsce8a810000rjgga4geq295","description":"Editado por admin en test"}', NULL, '2026-08-03 20:41:41');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp2w2p0004uakh7o7fk4ia', 'cmsce8acs000trjggkktemzc6', 'category_delete', 'category', 'cmsdp2w0h0000uakhjgvubzut', '{"name":"Jardinería Pro","slug":"jardineria-test"}', NULL, '2026-08-03 20:41:41');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp4fiz0009uakhgabluqxv', 'cmsce8acs000trjggkktemzc6', 'category_update', 'category', 'cmsde4gjo0000q88z37nqbnqd', '{"categoryId":"cmsde4gjo0000q88z37nqbnqd","name":"Jardinería","type":"servicio","slug":"jardineria","icon":"","description":"Servicios de jardinería, paisajismo y diseño de jardines","order":0}', NULL, '2026-08-03 20:42:52');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdp4zid000auakhyllgd4ku', 'cmsce8acs000trjggkktemzc6', 'plan_update', 'plan', 'cmsce8a810000rjgga4geq295', '{"planId":"cmsce8a810000rjgga4geq295","slug":"basico","name":"Básico","price":0,"currency":"ARS","interval":"month","description":"Plan base para empezar en UMPI — editado desde UI","maxListings":3,"maxFeatured":0,"badgeVerified":false,"top10Access":false,"multiUser":1,"apiAccess":false,"prioritySupport":false,"monthlyReport":false,"invoiceType":null,"active":true,"order":0,"features":["Publicaciones estándar","Búsqueda y filtros básicos","Mensajes ilimitados","1 publicación activa"]}', NULL, '2026-08-03 20:43:18');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdtreni000kuakhxtncl3q7', 'cmsce8acs000trjggkktemzc6', 'plan_create', 'plan', 'cmsdtrenh000juakhd9m58dl0', '{"slug":"plantest","name":"Plan test","price":500}', NULL, '2026-08-03 22:52:43');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdts0fz000muakhr3n8pmso', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 22:53:11');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdu2pnt000suakhtos90zvk', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 23:01:30');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdu327r000uuakhcftledre', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 23:01:47');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdu8f77001kuakhwhog4mcp', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 23:05:57');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmsdu8q3d001muakh8bcc8yey', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-03 23:06:11');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse0jbmz0006ujx0fh0yw5qo', 'cmsce8acs000trjggkktemzc6', 'mercadopago_config_update', 'site_config', NULL, '{"keys":["mp.access_token","mp.public_key"],"saved":2,"cleared":0}', NULL, '2026-08-04 02:02:23');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse0ji0c0007ujx0ebrigdwg', 'cmsce8acs000trjggkktemzc6', 'mercadopago_config_update', 'site_config', NULL, '{"keys":["mp.access_token","mp.public_key"],"saved":0,"cleared":2}', NULL, '2026-08-04 02:02:31');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse0nifo0009ujx09632dxrf', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-04 02:05:38');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse36h8m000gujx03gai77e3', 'cmsce8acs000trjggkktemzc6', 'plan_delete', 'plan', 'cmsdtrenh000juakhd9m58dl0', '{"slug":"plantest","name":"Plan test"}', NULL, '2026-08-04 03:16:23');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse36x05000hujx08guck251', 'cmsce8acs000trjggkktemzc6', 'report_resolve', 'report', 'cmscmp5hw0001rjn0n2rqsp5s', '{"status":"resolved"}', NULL, '2026-08-04 03:16:43');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse375ol000iujx0zzzu0262', 'cmsce8acs000trjggkktemzc6', 'report_review', 'report', 'cmsce8ahf00a0rjggph5dsskg', '{"status":"reviewing"}', NULL, '2026-08-04 03:16:54');
INSERT INTO `AuditLog` (`id`, `userId`, `action`, `entity`, `entityId`, `details`, `ip`, `createdAt`) VALUES ('cmse38ntr000kujx0kp0wlicz', 'cmsce8acs000trjggkktemzc6', 'site_config_update', 'site_config', NULL, '{"keys":["hero.title"]}', NULL, '2026-08-04 03:18:04');



-- ─── FOREIGN KEYS (comentados — TiDB no los soporta, los ignora) ───

-- AddForeignKey
/* ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Subcategory` ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Listing` ADD CONSTRAINT `Listing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Listing` ADD CONSTRAINT `Listing_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Listing` ADD CONSTRAINT `Listing_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `Subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Review` ADD CONSTRAINT `Review_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Boost` ADD CONSTRAINT `Boost_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Boost` ADD CONSTRAINT `Boost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_boostId_fkey` FOREIGN KEY (`boostId`) REFERENCES `Boost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Report` ADD CONSTRAINT `Report_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `_ConvParticipants` ADD CONSTRAINT `_ConvParticipants_A_fkey` FOREIGN KEY (`A`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

-- AddForeignKey
/* ALTER TABLE `_ConvParticipants` ADD CONSTRAINT `_ConvParticipants_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; */

SET FOREIGN_KEY_CHECKS = 1;

