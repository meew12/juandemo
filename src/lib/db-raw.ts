// ════════════════════════════════════════════════════════════
//  Cliente libsql DIRECTO (sin Prisma) — Data Access Layer
// ════════════════════════════════════════════════════════════
//  Usa @libsql/client directamente para bypassar Prisma cuando
//  hay problemas con env("DATABASE_URL") en Vercel serverless.
//
//  SQLite/Turso almacena:
//   - Boolean como INTEGER (0/1)
//   - DateTime como TEXT (ISO 8601 string)
//   - JSON como TEXT (hay que parse/stringify manualmente)
//
//  Todos los helpers devuelven objetos JS limpios con tipos
//  correctos (boolean, Date, number, etc.)
// ════════════════════════════════════════════════════════════

import { createClient, type Client } from "@libsql/client";

// ─── Conexión (singleton) ─────────────────────────────────────

let _client: Client | undefined;
let _initFailed = false;
let _initError = "";

function parseDbUrl(rawUrl: string): { url: string; authToken?: string } {
  let url = rawUrl;
  let authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.includes("?authToken=") || url.includes("&authToken=")) {
    try {
      const u = new URL(url);
      authToken = u.searchParams.get("authToken") ?? authToken;
      u.searchParams.delete("authToken");
      url = u.toString();
    } catch {
      url = url.replace(/\?authToken=.*$/, "").replace(/&authToken=[^&]*/, "");
    }
  }

  return { url, authToken };
}

function createDbClient(): Client {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl || databaseUrl === "undefined") {
    console.warn("[db-raw] ⚠️ DATABASE_URL no configurada, usando SQLite local");
    return createClient({ url: "file:./db/custom.db" });
  }

  const { url, authToken } = parseDbUrl(databaseUrl);
  const isTurso = url.startsWith("libsql://") || url.startsWith("libsql+ws://");

  console.log(`[db-raw] Conectando a ${isTurso ? "Turso" : "SQLite"}: ${url}`);
  console.log(`[db-raw] authToken: ${authToken ? "***presente***" : "(ninguno)"}`);

  return createClient({
    url,
    authToken: isTurso ? authToken : undefined,
  });
}

export function getRawClient(): Client {
  if (_client) return _client;
  if (_initFailed) {
    throw new Error(`db-raw init failed previously: ${_initError}`);
  }

  try {
    _client = createDbClient();
    return _client;
  } catch (e: any) {
    _initFailed = true;
    _initError = e.message;
    console.error("[db-raw] ❌ Error creando cliente libsql:", e.message);
    throw e;
  }
}

// ─── Utilidades ───────────────────────────────────────────────

/** Genera un ID tipo CUID (sin dependencia externa). */
export function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const counter = Math.floor(Math.random() * 1000000).toString(36);
  return `c${timestamp}${random}${counter}`;
}

/** Devuelve la fecha actual como ISO string (formato SQLite DateTime). */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Convierte cualquier valor de BD a boolean (0/1 → boolean). */
function toBool(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return Boolean(v);
}

/** Convierte cualquier valor a number (maneja BigInt de libsql). */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return parseFloat(v) || 0;
  return Number(v);
}

/** Convierte cualquier valor a string | null. */
function toStrOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

/**
 * Normaliza un valor de fecha a ISO string.
 * Maneja 3 formatos que pueden existir en la BD:
 *  1. ISO string ("2025-01-15T10:30:00.000Z") — el formato correcto
 *  2. Epoch ms como número (1785711010969) — de código viejo
 *  3. Epoch ms como string ("1785711010969") — de código viejo
 *  4. Fecha SQLite ("2025-01-15 10:30:00") — sin el T y Z
 */
function toDateISO(v: unknown): string {
  if (v === null || v === undefined) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const s = String(v);
  // Pure number string = epoch ms
  if (/^\d+$/.test(s)) {
    const d = new Date(parseInt(s, 10));
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  // Try parsing as-is (handles ISO and SQLite formats)
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
}

/** Convierte cualquier valor a string. */
function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** Parsea un campo JSON (TEXT) de forma segura. */
export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  try {
    const s = typeof raw === "string" ? raw : String(raw);
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Ejecuta una consulta SQL y devuelve las filas. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  const client = getRawClient();
  const result = await client.execute({ sql, args });
  return result.rows as T[];
}

/** Ejecuta una consulta y devuelve la primera fila o null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

/** Ejecuta una consulta y devuelve el count (asumiendo columna `count` o `c` o `n`). */
export async function queryCount(
  sql: string,
  args: unknown[] = []
): Promise<number> {
  const row = await queryOne<Record<string, unknown>>(sql, args);
  if (!row) return 0;
  if ("count" in row) return toNum(row.count);
  if ("c" in row) return toNum(row.c);
  if ("n" in row) return toNum(row.n);
  const firstVal = Object.values(row)[0];
  return toNum(firstVal);
}

/** Ejecuta un INSERT/UPDATE/DELETE sin esperar resultados. */
export async function execute(
  sql: string,
  args: unknown[] = []
): Promise<{ changes: number; lastInsertRowid: string | null }> {
  const client = getRawClient();
  const result = await client.execute({ sql, args });
  return {
    changes: toNum(result.rowsAffected),
    lastInsertRowid:
      result.lastInsertRowid !== null && result.lastInsertRowid !== undefined
        ? String(result.lastInsertRowid)
        : null,
  };
}

/** Ejecuta múltiples statements en una transacción. */
export async function executeBatch(
  statements: { sql: string; args: unknown[] }[]
): Promise<void> {
  const client = getRawClient();
  await client.batch(statements, "write");
}

// ════════════════════════════════════════════════════════════
//  TIPOS DE ENTIDADES (reflejan schema.prisma)
// ════════════════════════════════════════════════════════════

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  passwordHash: string | null;
  image: string | null;
  role: string;
  plan: string;
  banned: boolean;
  verified: boolean;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  passwordHash: string | null;
  image: string | null;
  phone: string | null;
  zone: string | null;
  bio: string | null;
  avatarInitials: string | null;
  role: string;
  plan: string;
  verified: boolean;
  banned: boolean;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryType: string;
  categoryId: string | null;
  subcategoryId: string | null;
  price: number;
  currency: string;
  priceUnit: string | null;
  location: string | null;
  zone: string | null;
  province: string | null;
  images: string;
  thumbs: string;
  attrs: string;
  rating: number;
  reviewCount: number;
  views: number;
  contactCount: number;
  badge: string | null;
  featured: boolean;
  featuredUntil: string | null;
  boostLevel: number;
  status: string;
  rejectionReason: string | null;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  icon: string | null;
  description: string | null;
  count: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRow {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRow {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  listingId: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRow {
  id: string;
  txId: string;
  userId: string;
  subscriptionId: string | null;
  boostId: string | null;
  concept: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  mercadopagoPaymentId: string | null;
  mercadopagoPreferenceId: string | null;
  invoiceType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  mercadopagoId: string | null;
  mercadopagoPreapprovalId: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string | null;
  features: string;
  maxListings: number;
  maxFeatured: number;
  badgeVerified: boolean;
  top10Access: boolean;
  multiUser: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  monthlyReport: boolean;
  invoiceType: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteConfigRow {
  id: string;
  key: string;
  value: string;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface BoostRow {
  id: string;
  listingId: string;
  userId: string;
  type: string;
  durationDays: number;
  amount: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  mercadopagoPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════
//  PARSERS (de fila cruda a objeto tipado)
// ════════════════════════════════════════════════════════════

type AnyRow = Record<string, unknown>;

function parseUser(r: AnyRow): UserRow {
  return {
    id: toStr(r.id),
    email: toStr(r.email),
    name: toStrOrNull(r.name),
    lastName: toStrOrNull(r.lastName),
    passwordHash: toStrOrNull(r.passwordHash),
    image: toStrOrNull(r.image),
    phone: toStrOrNull(r.phone),
    zone: toStrOrNull(r.zone),
    bio: toStrOrNull(r.bio),
    avatarInitials: toStrOrNull(r.avatarInitials),
    role: toStr(r.role) || "user",
    plan: toStr(r.plan) || "basico",
    verified: toBool(r.verified),
    banned: toBool(r.banned),
    memberSince: toDateISO(r.memberSince),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseListing(r: AnyRow): ListingRow {
  return {
    id: toStr(r.id),
    slug: toStr(r.slug),
    title: toStr(r.title),
    description: toStr(r.description),
    categoryType: toStr(r.categoryType),
    categoryId: toStrOrNull(r.categoryId),
    subcategoryId: toStrOrNull(r.subcategoryId),
    price: toNum(r.price),
    currency: toStr(r.currency) || "ARS",
    priceUnit: toStrOrNull(r.priceUnit),
    location: toStrOrNull(r.location),
    zone: toStrOrNull(r.zone),
    province: toStrOrNull(r.province),
    images: toStr(r.images) || "[]",
    thumbs: toStr(r.thumbs) || "[]",
    attrs: toStr(r.attrs) || "{}",
    rating: toNum(r.rating),
    reviewCount: toNum(r.reviewCount),
    views: toNum(r.views),
    contactCount: toNum(r.contactCount),
    badge: toStrOrNull(r.badge),
    featured: toBool(r.featured),
    featuredUntil: r.featuredUntil ? toDateISO(r.featuredUntil) : null,
    boostLevel: toNum(r.boostLevel),
    status: toStr(r.status) || "active",
    rejectionReason: toStrOrNull(r.rejectionReason),
    sellerId: toStr(r.sellerId),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseCategory(r: AnyRow): CategoryRow {
  return {
    id: toStr(r.id),
    slug: toStr(r.slug),
    name: toStr(r.name),
    type: toStr(r.type),
    icon: toStrOrNull(r.icon),
    description: toStrOrNull(r.description),
    count: toNum(r.count),
    order: toNum(r.order),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseReview(r: AnyRow): ReviewRow {
  return {
    id: toStr(r.id),
    listingId: toStr(r.listingId),
    userId: toStr(r.userId),
    rating: toNum(r.rating),
    comment: toStr(r.comment),
    status: toStr(r.status) || "active",
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseReport(r: AnyRow): ReportRow {
  return {
    id: toStr(r.id),
    reporterId: toStr(r.reporterId),
    reportedUserId: toStrOrNull(r.reportedUserId),
    listingId: toStrOrNull(r.listingId),
    reason: toStr(r.reason),
    description: toStrOrNull(r.description),
    status: toStr(r.status) || "open",
    resolution: toStrOrNull(r.resolution),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseTransaction(r: AnyRow): TransactionRow {
  return {
    id: toStr(r.id),
    txId: toStr(r.txId),
    userId: toStr(r.userId),
    subscriptionId: toStrOrNull(r.subscriptionId),
    boostId: toStrOrNull(r.boostId),
    concept: toStr(r.concept),
    method: toStr(r.method),
    amount: toNum(r.amount),
    currency: toStr(r.currency) || "ARS",
    status: toStr(r.status) || "pending",
    mercadopagoPaymentId: toStrOrNull(r.mercadopagoPaymentId),
    mercadopagoPreferenceId: toStrOrNull(r.mercadopagoPreferenceId),
    invoiceType: toStrOrNull(r.invoiceType),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseSubscription(r: AnyRow): SubscriptionRow {
  return {
    id: toStr(r.id),
    userId: toStr(r.userId),
    plan: toStr(r.plan),
    status: toStr(r.status) || "active",
    startDate: toDateISO(r.startDate),
    currentPeriodEnd: r.currentPeriodEnd ? toDateISO(r.currentPeriodEnd) : null,
    cancelAtPeriodEnd: toBool(r.cancelAtPeriodEnd),
    mercadopagoId: toStrOrNull(r.mercadopagoId),
    mercadopagoPreapprovalId: toStrOrNull(r.mercadopagoPreapprovalId),
    amount: toNum(r.amount),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parsePlan(r: AnyRow): PlanRow {
  return {
    id: toStr(r.id),
    slug: toStr(r.slug),
    name: toStr(r.name),
    price: toNum(r.price),
    currency: toStr(r.currency) || "ARS",
    interval: toStr(r.interval) || "month",
    description: toStrOrNull(r.description),
    features: toStr(r.features) || "[]",
    maxListings: toNum(r.maxListings) || 1,
    maxFeatured: toNum(r.maxFeatured),
    badgeVerified: toBool(r.badgeVerified),
    top10Access: toBool(r.top10Access),
    multiUser: toNum(r.multiUser) || 1,
    apiAccess: toBool(r.apiAccess),
    prioritySupport: toBool(r.prioritySupport),
    monthlyReport: toBool(r.monthlyReport),
    invoiceType: toStrOrNull(r.invoiceType),
    active: toBool(r.active),
    order: toNum(r.order),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseSiteConfig(r: AnyRow): SiteConfigRow {
  return {
    id: toStr(r.id),
    key: toStr(r.key),
    value: toStr(r.value),
  };
}

function parseAuditLog(r: AnyRow): AuditLogRow {
  return {
    id: toStr(r.id),
    userId: toStrOrNull(r.userId),
    action: toStr(r.action),
    entity: toStrOrNull(r.entity),
    entityId: toStrOrNull(r.entityId),
    details: toStrOrNull(r.details),
    ip: toStrOrNull(r.ip),
    createdAt: toDateISO(r.createdAt),
  };
}

function parseBoost(r: AnyRow): BoostRow {
  return {
    id: toStr(r.id),
    listingId: toStr(r.listingId),
    userId: toStr(r.userId),
    type: toStr(r.type),
    durationDays: toNum(r.durationDays),
    amount: toNum(r.amount),
    status: toStr(r.status) || "pending",
    startDate: r.startDate ? toDateISO(r.startDate) : null,
    endDate: r.endDate ? toDateISO(r.endDate) : null,
    mercadopagoPaymentId: toStrOrNull(r.mercadopagoPaymentId),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

// ════════════════════════════════════════════════════════════
//  USERS — operaciones de base de datos
// ════════════════════════════════════════════════════════════

/** Busca un usuario por email (para auth). */
export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const rows = await query<AnyRow>(
    `SELECT id, email, name, lastName, passwordHash, image, role, plan, banned, verified
     FROM User WHERE email = ? LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: toStr(r.id),
    email: toStr(r.email),
    name: toStrOrNull(r.name),
    lastName: toStrOrNull(r.lastName),
    passwordHash: toStrOrNull(r.passwordHash),
    image: toStrOrNull(r.image),
    role: toStr(r.role) || "user",
    plan: toStr(r.plan) || "basico",
    banned: toBool(r.banned),
    verified: toBool(r.verified),
  };
}

/** Busca un usuario por ID (para refresh de sesión). */
export async function findUserById(
  id: string
): Promise<{ plan: string; role: string; banned: boolean } | null> {
  const rows = await query<AnyRow>(
    `SELECT plan, role, banned FROM User WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    plan: toStr(r.plan) || "basico",
    role: toStr(r.role) || "user",
    banned: toBool(r.banned),
  };
}

/** Busca un usuario completo por ID. */
export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await query<AnyRow>(
    `SELECT * FROM User WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows.length > 0 ? parseUser(rows[0]) : null;
}

/** Crea un usuario (para registro). */
export async function createUser(params: {
  email: string;
  name?: string | null;
  lastName?: string | null;
  passwordHash: string;
  role?: string;
  plan?: string;
  avatarInitials?: string | null;
}): Promise<UserRow> {
  const id = generateCuid();
  const now = nowISO();
  const email = params.email.toLowerCase().trim();

  await execute(
    `INSERT INTO User (id, email, name, lastName, passwordHash, role, plan, verified, banned, avatarInitials, memberSince, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    [
      id,
      email,
      params.name ?? null,
      params.lastName ?? null,
      params.passwordHash,
      params.role ?? "user",
      params.plan ?? "basico",
      params.avatarInitials ?? null,
      now,
      now,
      now,
    ]
  );

  const user = await getUserById(id);
  if (!user) throw new Error("User creation failed - not found after insert");
  return user;
}

export interface UserListFilter {
  q?: string;
  role?: string;
  plan?: string;
  verified?: boolean;
  banned?: boolean;
}

/** Lista usuarios con filtros y paginación. */
export async function findUsers(
  filter: UserListFilter,
  opts: { orderBy?: string; limit?: number; offset?: number } = {}
): Promise<UserRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filter.q) {
    where.push("(name LIKE ? OR lastName LIKE ? OR email LIKE ?)");
    const term = `%${filter.q}%`;
    args.push(term, term, term);
  }
  if (filter.role) {
    where.push("role = ?");
    args.push(filter.role);
  }
  if (filter.plan) {
    where.push("plan = ?");
    args.push(filter.plan);
  }
  if (filter.verified !== undefined) {
    where.push("verified = ?");
    args.push(filter.verified ? 1 : 0);
  }
  if (filter.banned !== undefined) {
    where.push("banned = ?");
    args.push(filter.banned ? 1 : 0);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy = opts.orderBy ?? "createdAt DESC";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await query<AnyRow>(
    `SELECT * FROM User ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseUser);
}

/** Cuenta usuarios con filtros. */
export async function countUsers(filter: UserListFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filter.q) {
    where.push("(name LIKE ? OR lastName LIKE ? OR email LIKE ?)");
    const term = `%${filter.q}%`;
    args.push(term, term, term);
  }
  if (filter.role) {
    where.push("role = ?");
    args.push(filter.role);
  }
  if (filter.plan) {
    where.push("plan = ?");
    args.push(filter.plan);
  }
  if (filter.verified !== undefined) {
    where.push("verified = ?");
    args.push(filter.verified ? 1 : 0);
  }
  if (filter.banned !== undefined) {
    where.push("banned = ?");
    args.push(filter.banned ? 1 : 0);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM User ${whereClause}`, args);
}

/** Distribución de usuarios por plan. */
export async function userCountByPlan(): Promise<{ plan: string; count: number }[]> {
  const rows = await query<AnyRow>(
    `SELECT plan, COUNT(*) as count FROM User GROUP BY plan`
  );
  return rows.map((r) => ({ plan: toStr(r.plan), count: toNum(r.count) }));
}

/** Actualiza campos de un usuario. */
export async function updateUser(
  id: string,
  data: Partial<{
    name: string | null;
    lastName: string | null;
    image: string | null;
    phone: string | null;
    zone: string | null;
    bio: string | null;
    avatarInitials: string | null;
    role: string;
    plan: string;
    verified: boolean;
    banned: boolean;
  }>
): Promise<UserRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.lastName !== undefined) { sets.push("lastName = ?"); args.push(data.lastName); }
  if (data.image !== undefined) { sets.push("image = ?"); args.push(data.image); }
  if (data.phone !== undefined) { sets.push("phone = ?"); args.push(data.phone); }
  if (data.zone !== undefined) { sets.push("zone = ?"); args.push(data.zone); }
  if (data.bio !== undefined) { sets.push("bio = ?"); args.push(data.bio); }
  if (data.avatarInitials !== undefined) { sets.push("avatarInitials = ?"); args.push(data.avatarInitials); }
  if (data.role !== undefined) { sets.push("role = ?"); args.push(data.role); }
  if (data.plan !== undefined) { sets.push("plan = ?"); args.push(data.plan); }
  if (data.verified !== undefined) { sets.push("verified = ?"); args.push(data.verified ? 1 : 0); }
  if (data.banned !== undefined) { sets.push("banned = ?"); args.push(data.banned ? 1 : 0); }

  if (sets.length === 0) return getUserById(id);

  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);

  await execute(`UPDATE User SET ${sets.join(", ")} WHERE id = ?`, args);
  return getUserById(id);
}

// ════════════════════════════════════════════════════════════
//  LISTINGS — operaciones de base de datos
// ════════════════════════════════════════════════════════════

export interface ListingFilter {
  ids?: string[];
  categoryType?: string;
  categorySlug?: string;
  categoryId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  zone?: string;
  minRating?: number;
  featured?: boolean;
  featuredOnly?: boolean;
  verifiedOnly?: boolean;
  withPhoto?: boolean;
  sellerId?: string;
  status?: string;
  boostLevelGte?: number;
}

/** Construye la cláusula WHERE + args para listings. */
function buildListingWhere(filter: ListingFilter): { where: string; args: unknown[] } {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filter.ids && filter.ids.length > 0) {
    const placeholders = filter.ids.map(() => "?").join(",");
    where.push(`id IN (${placeholders})`);
    args.push(...filter.ids);
  }
  if (filter.categoryType) {
    where.push("categoryType = ?");
    args.push(filter.categoryType);
  }
  if (filter.categoryId) {
    where.push("categoryId = ?");
    args.push(filter.categoryId);
  }
  if (filter.categorySlug) {
    // Join con Category para filtrar por slug
    if (filter.categorySlug.startsWith("c")) {
      where.push("categoryId = ?");
      args.push(filter.categorySlug);
    } else {
      where.push("categoryId IN (SELECT id FROM Category WHERE slug = ?)");
      args.push(filter.categorySlug);
    }
  }
  if (filter.q) {
    where.push("(title LIKE ? OR description LIKE ? OR location LIKE ?)");
    const term = `%${filter.q}%`;
    args.push(term, term, term);
  }
  if (filter.minPrice !== undefined) {
    where.push("price >= ?");
    args.push(filter.minPrice);
  }
  if (filter.maxPrice !== undefined) {
    where.push("price <= ?");
    args.push(filter.maxPrice);
  }
  if (filter.zone && filter.zone !== "all") {
    where.push("(zone LIKE ? OR province LIKE ? OR location LIKE ?)");
    const term = `%${filter.zone}%`;
    args.push(term, term, term);
  }
  if (filter.minRating !== undefined) {
    where.push("rating >= ?");
    args.push(filter.minRating);
  }
  if (filter.featured !== undefined || filter.featuredOnly !== undefined) {
    where.push("featured = ?");
    args.push((filter.featured || filter.featuredOnly) ? 1 : 0);
  }
  if (filter.withPhoto) {
    where.push("images != ''");
    where.push("images != '[]'");
  }
  if (filter.sellerId) {
    where.push("sellerId = ?");
    args.push(filter.sellerId);
  }
  if (filter.status) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.boostLevelGte !== undefined) {
    where.push("boostLevel >= ?");
    args.push(filter.boostLevelGte);
  }
  if (filter.verifiedOnly) {
    where.push("sellerId IN (SELECT id FROM User WHERE verified = 1)");
  }

  return {
    where: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    args,
  };
}

const LISTING_ORDER_MAP: Record<string, string> = {
  relevance: "featured DESC, boostLevel DESC, createdAt DESC",
  price_asc: "featured DESC, price ASC",
  price_desc: "featured DESC, price DESC",
  rating: "featured DESC, rating DESC",
  newest: "featured DESC, createdAt DESC",
  views: "featured DESC, views DESC",
};

/** Lista listings con filtros, orden y paginación. */
export async function findListings(
  filter: ListingFilter,
  opts: { sort?: string; limit?: number; offset?: number } = {}
): Promise<ListingRow[]> {
  const { where, args } = buildListingWhere(filter);
  const orderBy = LISTING_ORDER_MAP[opts.sort ?? "relevance"] ?? LISTING_ORDER_MAP.relevance;
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const rows = await query<AnyRow>(
    `SELECT * FROM Listing ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseListing);
}

/** Cuenta listings con filtros. */
export async function countListings(filter: ListingFilter = {}): Promise<number> {
  const { where, args } = buildListingWhere(filter);
  return queryCount(`SELECT COUNT(*) as count FROM Listing ${where}`, args);
}

/** Busca listing por id. */
export async function getListingById(id: string): Promise<ListingRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Listing WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseListing(rows[0]) : null;
}

/** Busca listing por slug o id. */
export async function getListingBySlug(slug: string): Promise<ListingRow | null> {
  const rows = await query<AnyRow>(
    `SELECT * FROM Listing WHERE slug = ? OR id = ? LIMIT 1`,
    [slug, slug]
  );
  return rows.length > 0 ? parseListing(rows[0]) : null;
}

export interface ListingCreateInput {
  slug: string;
  title: string;
  description: string;
  categoryType: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  price: number;
  currency?: string;
  priceUnit?: string | null;
  location?: string | null;
  zone?: string | null;
  province?: string | null;
  images?: string;
  thumbs?: string;
  attrs?: string;
  featured?: boolean;
  featuredUntil?: string | null;
  boostLevel?: number;
  badge?: string | null;
  status?: string;
  sellerId: string;
}

/** Crea un nuevo listing. */
export async function createListing(input: ListingCreateInput): Promise<ListingRow> {
  const id = generateCuid();
  const now = nowISO();

  await execute(
    `INSERT INTO Listing (
      id, slug, title, description, categoryType, categoryId, subcategoryId,
      price, currency, priceUnit, location, zone, province,
      images, thumbs, attrs, rating, reviewCount, views, contactCount,
      badge, featured, featuredUntil, boostLevel, status, rejectionReason,
      sellerId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.title,
      input.description,
      input.categoryType,
      input.categoryId ?? null,
      input.subcategoryId ?? null,
      input.price,
      input.currency ?? "ARS",
      input.priceUnit ?? null,
      input.location ?? null,
      input.zone ?? null,
      input.province ?? null,
      input.images ?? "[]",
      input.thumbs ?? "[]",
      input.attrs ?? "{}",
      input.badge ?? null,
      input.featured ? 1 : 0,
      input.featuredUntil ?? null,
      input.boostLevel ?? 0,
      input.status ?? "active",
      input.sellerId,
      now,
      now,
    ]
  );

  const listing = await getListingById(id);
  if (!listing) throw new Error("Listing creation failed - not found after insert");
  return listing;
}

export interface ListingUpdateInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  priceUnit?: string | null;
  location?: string | null;
  zone?: string | null;
  province?: string | null;
  status?: string;
  attrs?: string;
  images?: string;
  thumbs?: string;
  featured?: boolean;
  featuredUntil?: string | null;
  boostLevel?: number;
  badge?: string | null;
  rejectionReason?: string | null;
}

/** Actualiza un listing. */
export async function updateListing(
  id: string,
  data: ListingUpdateInput
): Promise<ListingRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];

  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.price !== undefined) { sets.push("price = ?"); args.push(data.price); }
  if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
  if (data.priceUnit !== undefined) { sets.push("priceUnit = ?"); args.push(data.priceUnit); }
  if (data.location !== undefined) { sets.push("location = ?"); args.push(data.location); }
  if (data.zone !== undefined) { sets.push("zone = ?"); args.push(data.zone); }
  if (data.province !== undefined) { sets.push("province = ?"); args.push(data.province); }
  if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
  if (data.attrs !== undefined) { sets.push("attrs = ?"); args.push(data.attrs); }
  if (data.images !== undefined) { sets.push("images = ?"); args.push(data.images); }
  if (data.thumbs !== undefined) { sets.push("thumbs = ?"); args.push(data.thumbs); }
  if (data.featured !== undefined) { sets.push("featured = ?"); args.push(data.featured ? 1 : 0); }
  if (data.featuredUntil !== undefined) { sets.push("featuredUntil = ?"); args.push(data.featuredUntil); }
  if (data.boostLevel !== undefined) { sets.push("boostLevel = ?"); args.push(data.boostLevel); }
  if (data.badge !== undefined) { sets.push("badge = ?"); args.push(data.badge); }
  if (data.rejectionReason !== undefined) { sets.push("rejectionReason = ?"); args.push(data.rejectionReason); }

  if (sets.length === 0) return getListingById(id);

  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);

  await execute(`UPDATE Listing SET ${sets.join(", ")} WHERE id = ?`, args);
  return getListingById(id);
}

/** Elimina un listing. */
export async function deleteListing(id: string): Promise<void> {
  await execute(`DELETE FROM Listing WHERE id = ?`, [id]);
}

/** Incrementa el contador de vistas. */
export async function incrementListingViews(id: string): Promise<number> {
  await execute(
    `UPDATE Listing SET views = views + 1 WHERE id = ?`,
    [id]
  );
  const row = await queryOne<AnyRow>(
    `SELECT views FROM Listing WHERE id = ? LIMIT 1`,
    [id]
  );
  return row ? toNum(row.views) : 0;
}

/** Distribución de listings por categoryType. */
export async function listingCountByType(): Promise<{ type: string; count: number }[]> {
  const rows = await query<AnyRow>(
    `SELECT categoryType as type, COUNT(*) as count FROM Listing GROUP BY categoryType`
  );
  return rows.map((r) => ({ type: toStr(r.type), count: toNum(r.count) }));
}

/** Cuenta listings por sellerId (para conteo por usuario). */
export async function listingCountBySeller(
  sellerIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (sellerIds.length === 0) return map;
  const placeholders = sellerIds.map(() => "?").join(",");
  const rows = await query<AnyRow>(
    `SELECT sellerId, COUNT(*) as count FROM Listing WHERE sellerId IN (${placeholders}) GROUP BY sellerId`,
    sellerIds
  );
  for (const r of rows) {
    map.set(toStr(r.sellerId), toNum(r.count));
  }
  return map;
}

// ════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════

export async function findCategories(filter: { type?: string } = {}): Promise<CategoryRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.type) {
    where.push("type = ?");
    args.push(filter.type);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await query<AnyRow>(
    `SELECT * FROM Category ${whereClause} ORDER BY \`order\` ASC, name ASC`,
    args
  );
  return rows.map(parseCategory);
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Category WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseCategory(rows[0]) : null;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Category WHERE slug = ? LIMIT 1`, [slug]);
  return rows.length > 0 ? parseCategory(rows[0]) : null;
}

export async function createCategory(input: {
  slug: string;
  name: string;
  type: string;
  icon?: string | null;
  description?: string | null;
  order?: number;
}): Promise<CategoryRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Category (id, slug, name, type, icon, description, count, \`order\`, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.name,
      input.type,
      input.icon ?? null,
      input.description ?? null,
      input.order ?? 0,
      now,
      now,
    ]
  );
  const cat = await getCategoryById(id);
  if (!cat) throw new Error("Category creation failed");
  return cat;
}

export async function updateCategory(
  id: string,
  data: Partial<{
    slug: string;
    name: string;
    type: string;
    icon: string | null;
    description: string | null;
    order: number;
  }>
): Promise<CategoryRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.slug !== undefined) { sets.push("slug = ?"); args.push(data.slug); }
  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
  if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.order !== undefined) { sets.push("`order` = ?"); args.push(data.order); }

  if (sets.length === 0) return getCategoryById(id);

  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);

  await execute(`UPDATE Category SET ${sets.join(", ")} WHERE id = ?`, args);
  return getCategoryById(id);
}

export async function deleteCategory(id: string): Promise<void> {
  await execute(`DELETE FROM Subcategory WHERE categoryId = ?`, [id]);
  await execute(`DELETE FROM Category WHERE id = ?`, [id]);
}

export async function countListingsByCategory(categoryId: string): Promise<number> {
  return queryCount(
    `SELECT COUNT(*) as count FROM Listing WHERE categoryId = ?`,
    [categoryId]
  );
}

export async function countSubcategoriesByCategory(categoryId: string): Promise<number> {
  return queryCount(
    `SELECT COUNT(*) as count FROM Subcategory WHERE categoryId = ?`,
    [categoryId]
  );
}

// ════════════════════════════════════════════════════════════
//  REVIEWS
// ════════════════════════════════════════════════════════════

export interface ReviewFilter {
  rating?: number;
  status?: string;
  listingId?: string;
  userId?: string;
}

export async function findReviews(
  filter: ReviewFilter,
  opts: { limit?: number; offset?: number; orderBy?: string } = {}
): Promise<ReviewRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.rating !== undefined) { where.push("rating = ?"); args.push(filter.rating); }
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.listingId) { where.push("listingId = ?"); args.push(filter.listingId); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy = opts.orderBy ?? "createdAt DESC";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await query<AnyRow>(
    `SELECT * FROM Review ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseReview);
}

export async function countReviews(filter: ReviewFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.rating !== undefined) { where.push("rating = ?"); args.push(filter.rating); }
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.listingId) { where.push("listingId = ?"); args.push(filter.listingId); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM Review ${whereClause}`, args);
}

export async function updateReview(
  id: string,
  data: Partial<{ status: string }>
): Promise<ReviewRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
  if (sets.length === 0) return null;
  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);
  await execute(`UPDATE Review SET ${sets.join(", ")} WHERE id = ?`, args);
  const rows = await query<AnyRow>(`SELECT * FROM Review WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseReview(rows[0]) : null;
}

export async function deleteReview(id: string): Promise<void> {
  await execute(`DELETE FROM Review WHERE id = ?`, [id]);
}

// ════════════════════════════════════════════════════════════
//  REPORTS
// ════════════════════════════════════════════════════════════

export interface ReportFilter {
  status?: string;
  reporterId?: string;
  reportedUserId?: string;
}

export async function findReports(
  filter: ReportFilter,
  opts: { limit?: number; offset?: number } = {}
): Promise<ReportRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.reporterId) { where.push("reporterId = ?"); args.push(filter.reporterId); }
  if (filter.reportedUserId) { where.push("reportedUserId = ?"); args.push(filter.reportedUserId); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await query<AnyRow>(
    `SELECT * FROM Report ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseReport);
}

export async function countReports(filter: ReportFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.reporterId) { where.push("reporterId = ?"); args.push(filter.reporterId); }
  if (filter.reportedUserId) { where.push("reportedUserId = ?"); args.push(filter.reportedUserId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM Report ${whereClause}`, args);
}

export async function getReportById(id: string): Promise<ReportRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Report WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseReport(rows[0]) : null;
}

export async function updateReport(
  id: string,
  data: Partial<{ status: string; resolution: string | null }>
): Promise<ReportRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
  if (data.resolution !== undefined) { sets.push("resolution = ?"); args.push(data.resolution); }
  if (sets.length === 0) return null;
  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);
  await execute(`UPDATE Report SET ${sets.join(", ")} WHERE id = ?`, args);
  const rows = await query<AnyRow>(`SELECT * FROM Report WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseReport(rows[0]) : null;
}

// ════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ════════════════════════════════════════════════════════════

export interface TransactionFilter {
  status?: string;
  method?: string;
  userId?: string;
  subscriptionId?: string;
  boostId?: string;
  dateGte?: string;
  dateLte?: string;
}

export async function findTransactions(
  filter: TransactionFilter,
  opts: { limit?: number; offset?: number } = {}
): Promise<TransactionRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.method) { where.push("method = ?"); args.push(filter.method); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  if (filter.subscriptionId) { where.push("subscriptionId = ?"); args.push(filter.subscriptionId); }
  if (filter.boostId) { where.push("boostId = ?"); args.push(filter.boostId); }
  if (filter.dateGte) { where.push("createdAt >= ?"); args.push(filter.dateGte); }
  if (filter.dateLte) { where.push("createdAt <= ?"); args.push(filter.dateLte); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await query<AnyRow>(
    `SELECT * FROM \`Transaction\` ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseTransaction);
}

export async function countTransactions(filter: TransactionFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.method) { where.push("method = ?"); args.push(filter.method); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  if (filter.subscriptionId) { where.push("subscriptionId = ?"); args.push(filter.subscriptionId); }
  if (filter.boostId) { where.push("boostId = ?"); args.push(filter.boostId); }
  if (filter.dateGte) { where.push("createdAt >= ?"); args.push(filter.dateGte); }
  if (filter.dateLte) { where.push("createdAt <= ?"); args.push(filter.dateLte); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM \`Transaction\` ${whereClause}`, args);
}

export async function sumTransactionAmounts(filter: TransactionFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.method) { where.push("method = ?"); args.push(filter.method); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  if (filter.subscriptionId) {
    if (filter.subscriptionId === "__not_null__") {
      where.push("subscriptionId IS NOT NULL");
    } else {
      where.push("subscriptionId = ?"); args.push(filter.subscriptionId);
    }
  }
  if (filter.boostId) {
    if (filter.boostId === "__not_null__") {
      where.push("boostId IS NOT NULL");
    } else {
      where.push("boostId = ?"); args.push(filter.boostId);
    }
  }
  if (filter.dateGte) { where.push("createdAt >= ?"); args.push(filter.dateGte); }
  if (filter.dateLte) { where.push("createdAt <= ?"); args.push(filter.dateLte); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const row = await queryOne<AnyRow>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` ${whereClause}`,
    args
  );
  return row ? toNum(row.total) : 0;
}

export async function createTransaction(input: {
  txId: string;
  userId: string;
  subscriptionId?: string | null;
  boostId?: string | null;
  concept: string;
  method: string;
  amount: number;
  currency?: string;
  status?: string;
  mercadopagoPaymentId?: string | null;
  mercadopagoPreferenceId?: string | null;
  invoiceType?: string | null;
}): Promise<TransactionRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO \`Transaction\` (
      id, txId, userId, subscriptionId, boostId, concept, method, amount, currency,
      status, mercadopagoPaymentId, mercadopagoPreferenceId, invoiceType, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.txId,
      input.userId,
      input.subscriptionId ?? null,
      input.boostId ?? null,
      input.concept,
      input.method,
      input.amount,
      input.currency ?? "ARS",
      input.status ?? "pending",
      input.mercadopagoPaymentId ?? null,
      input.mercadopagoPreferenceId ?? null,
      input.invoiceType ?? null,
      now,
      now,
    ]
  );
  const rows = await query<AnyRow>(`SELECT * FROM \`Transaction\` WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Transaction creation failed");
  return parseTransaction(rows[0]);
}

export async function getTransactionById(id: string): Promise<TransactionRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM \`Transaction\` WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseTransaction(rows[0]) : null;
}

export async function updateTransaction(
  id: string,
  data: Partial<{ status: string }>
): Promise<TransactionRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
  if (sets.length === 0) return null;
  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);
  await execute(`UPDATE \`Transaction\` SET ${sets.join(", ")} WHERE id = ?`, args);
  const rows = await query<AnyRow>(`SELECT * FROM \`Transaction\` WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseTransaction(rows[0]) : null;
}

// ════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════

export interface SubscriptionFilter {
  plan?: string;
  status?: string;
  userId?: string;
}

export async function findSubscriptions(
  filter: SubscriptionFilter,
  opts: { limit?: number; offset?: number } = {}
): Promise<SubscriptionRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.plan) { where.push("plan = ?"); args.push(filter.plan); }
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const rows = await query<AnyRow>(
    `SELECT * FROM Subscription ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseSubscription);
}

export async function countSubscriptions(filter: SubscriptionFilter = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.plan) { where.push("plan = ?"); args.push(filter.plan); }
  if (filter.status) { where.push("status = ?"); args.push(filter.status); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM Subscription ${whereClause}`, args);
}

export async function subscriptionCountByPlan(): Promise<{ plan: string; count: number }[]> {
  const rows = await query<AnyRow>(
    `SELECT plan, COUNT(*) as count FROM Subscription GROUP BY plan`
  );
  return rows.map((r) => ({ plan: toStr(r.plan), count: toNum(r.count) }));
}

export async function updateSubscription(
  id: string,
  data: Partial<{ status: string; cancelAtPeriodEnd: boolean }>
): Promise<SubscriptionRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
  if (data.cancelAtPeriodEnd !== undefined) { sets.push("cancelAtPeriodEnd = ?"); args.push(data.cancelAtPeriodEnd ? 1 : 0); }
  if (sets.length === 0) return null;
  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);
  await execute(`UPDATE Subscription SET ${sets.join(", ")} WHERE id = ?`, args);
  const rows = await query<AnyRow>(`SELECT * FROM Subscription WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parseSubscription(rows[0]) : null;
}

// ════════════════════════════════════════════════════════════
//  PLANS
// ════════════════════════════════════════════════════════════

export async function findPlans(): Promise<PlanRow[]> {
  const rows = await query<AnyRow>(
    `SELECT * FROM Plan ORDER BY \`order\` ASC, price ASC`
  );
  return rows.map(parsePlan);
}

export async function getPlanById(id: string): Promise<PlanRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Plan WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0 ? parsePlan(rows[0]) : null;
}

export async function getPlanBySlug(slug: string): Promise<PlanRow | null> {
  const rows = await query<AnyRow>(`SELECT * FROM Plan WHERE slug = ? LIMIT 1`, [slug]);
  return rows.length > 0 ? parsePlan(rows[0]) : null;
}

export async function createPlan(input: {
  slug: string;
  name: string;
  price: number;
  currency?: string;
  interval?: string;
  description?: string | null;
  features?: string;
  maxListings?: number;
  maxFeatured?: number;
  badgeVerified?: boolean;
  top10Access?: boolean;
  multiUser?: number;
  apiAccess?: boolean;
  prioritySupport?: boolean;
  monthlyReport?: boolean;
  invoiceType?: string | null;
  active?: boolean;
  order?: number;
}): Promise<PlanRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Plan (
      id, slug, name, price, currency, interval, description, features,
      maxListings, maxFeatured, badgeVerified, top10Access, multiUser,
      apiAccess, prioritySupport, monthlyReport, invoiceType, active, \`order\`,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.name,
      input.price,
      input.currency ?? "ARS",
      input.interval ?? "month",
      input.description ?? null,
      input.features ?? "[]",
      input.maxListings ?? 1,
      input.maxFeatured ?? 0,
      input.badgeVerified ? 1 : 0,
      input.top10Access ? 1 : 0,
      input.multiUser ?? 1,
      input.apiAccess ? 1 : 0,
      input.prioritySupport ? 1 : 0,
      input.monthlyReport ? 1 : 0,
      input.invoiceType ?? null,
      input.active !== false ? 1 : 0,
      input.order ?? 0,
      now,
      now,
    ]
  );
  const plan = await getPlanById(id);
  if (!plan) throw new Error("Plan creation failed");
  return plan;
}

export async function updatePlan(
  id: string,
  data: Partial<{
    slug: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    description: string | null;
    features: string;
    maxListings: number;
    maxFeatured: number;
    badgeVerified: boolean;
    top10Access: boolean;
    multiUser: number;
    apiAccess: boolean;
    prioritySupport: boolean;
    monthlyReport: boolean;
    invoiceType: string | null;
    active: boolean;
    order: number;
  }>
): Promise<PlanRow | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (data.slug !== undefined) { sets.push("slug = ?"); args.push(data.slug); }
  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.price !== undefined) { sets.push("price = ?"); args.push(data.price); }
  if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
  if (data.interval !== undefined) { sets.push("interval = ?"); args.push(data.interval); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.features !== undefined) { sets.push("features = ?"); args.push(data.features); }
  if (data.maxListings !== undefined) { sets.push("maxListings = ?"); args.push(data.maxListings); }
  if (data.maxFeatured !== undefined) { sets.push("maxFeatured = ?"); args.push(data.maxFeatured); }
  if (data.badgeVerified !== undefined) { sets.push("badgeVerified = ?"); args.push(data.badgeVerified ? 1 : 0); }
  if (data.top10Access !== undefined) { sets.push("top10Access = ?"); args.push(data.top10Access ? 1 : 0); }
  if (data.multiUser !== undefined) { sets.push("multiUser = ?"); args.push(data.multiUser); }
  if (data.apiAccess !== undefined) { sets.push("apiAccess = ?"); args.push(data.apiAccess ? 1 : 0); }
  if (data.prioritySupport !== undefined) { sets.push("prioritySupport = ?"); args.push(data.prioritySupport ? 1 : 0); }
  if (data.monthlyReport !== undefined) { sets.push("monthlyReport = ?"); args.push(data.monthlyReport ? 1 : 0); }
  if (data.invoiceType !== undefined) { sets.push("invoiceType = ?"); args.push(data.invoiceType); }
  if (data.active !== undefined) { sets.push("active = ?"); args.push(data.active ? 1 : 0); }
  if (data.order !== undefined) { sets.push("`order` = ?"); args.push(data.order); }

  if (sets.length === 0) return getPlanById(id);

  sets.push("updatedAt = ?");
  args.push(nowISO());
  args.push(id);

  await execute(`UPDATE Plan SET ${sets.join(", ")} WHERE id = ?`, args);
  return getPlanById(id);
}

export async function deletePlan(id: string): Promise<void> {
  await execute(`DELETE FROM Plan WHERE id = ?`, [id]);
}

// ════════════════════════════════════════════════════════════
//  SITE CONFIG
// ════════════════════════════════════════════════════════════

export async function findAllSiteConfig(): Promise<SiteConfigRow[]> {
  const rows = await query<AnyRow>(`SELECT * FROM SiteConfig`);
  return rows.map(parseSiteConfig);
}

export async function findSiteConfigByKeys(keys: string[]): Promise<SiteConfigRow[]> {
  if (keys.length === 0) return [];
  const placeholders = keys.map(() => "?").join(",");
  const rows = await query<AnyRow>(
    `SELECT * FROM SiteConfig WHERE key IN (${placeholders})`,
    keys
  );
  return rows.map(parseSiteConfig);
}

export async function upsertSiteConfig(key: string, value: string): Promise<void> {
  // SQLite UPSERT (ON CONFLICT) — funciona en Turso también
  await execute(
    `INSERT INTO SiteConfig (id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [generateCuid(), key, value]
  );
}

export async function deleteSiteConfig(key: string): Promise<void> {
  await execute(`DELETE FROM SiteConfig WHERE key = ?`, [key]);
}

// ════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ════════════════════════════════════════════════════════════

export async function createAuditLog(input: {
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  ip?: string | null;
}): Promise<void> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO AuditLog (id, userId, action, entity, entityId, details, ip, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId ?? null,
      input.action,
      input.entity ?? null,
      input.entityId ?? null,
      input.details ?? null,
      input.ip ?? null,
      now,
    ]
  );
}

export async function findAuditLogs(
  filter: { action?: string; userId?: string },
  opts: { limit?: number; offset?: number } = {}
): Promise<AuditLogRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.action) { where.push("action = ?"); args.push(filter.action); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const rows = await query<AnyRow>(
    `SELECT * FROM AuditLog ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseAuditLog);
}

export async function countAuditLogs(filter: { action?: string; userId?: string } = {}): Promise<number> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.action) { where.push("action = ?"); args.push(filter.action); }
  if (filter.userId) { where.push("userId = ?"); args.push(filter.userId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return queryCount(`SELECT COUNT(*) as count FROM AuditLog ${whereClause}`, args);
}

// ════════════════════════════════════════════════════════════
//  BOOSTS
// ════════════════════════════════════════════════════════════

export async function createBoost(input: {
  listingId: string;
  userId: string;
  type: string;
  durationDays: number;
  amount: number;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  mercadopagoPaymentId?: string | null;
}): Promise<BoostRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Boost (
      id, listingId, userId, type, durationDays, amount, status,
      startDate, endDate, mercadopagoPaymentId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.listingId,
      input.userId,
      input.type,
      input.durationDays,
      input.amount,
      input.status ?? "pending",
      input.startDate ?? null,
      input.endDate ?? null,
      input.mercadopagoPaymentId ?? null,
      now,
      now,
    ]
  );
  const rows = await query<AnyRow>(`SELECT * FROM Boost WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Boost creation failed");
  return parseBoost(rows[0]);
}

// ════════════════════════════════════════════════════════════
//  FAVORITES
// ════════════════════════════════════════════════════════════

export interface FavoriteRow {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

function parseFavorite(r: AnyRow): FavoriteRow {
  return {
    id: toStr(r.id),
    userId: toStr(r.userId),
    listingId: toStr(r.listingId),
    createdAt: toDateISO(r.createdAt),
  };
}

/** Lista los favoritos de un usuario (con listing + seller + category hydratados). */
export async function findFavoritesByUser(userId: string): Promise<Array<{
  favorite: FavoriteRow;
  listing: ListingRow | null;
  seller: UserRow | null;
  category: CategoryRow | null;
}>> {
  const rows = await query<AnyRow>(
    `SELECT f.* FROM Favorite f WHERE f.userId = ? ORDER BY f.createdAt DESC`,
    [userId]
  );
  const favorites = rows.map(parseFavorite);
  if (favorites.length === 0) return [];

  const listingIds = Array.from(new Set(favorites.map((f) => f.listingId)));
  const listings = await Promise.all(listingIds.map((id) => getListingById(id)));
  const listingMap = new Map(listingIds.map((id, i) => [id, listings[i]]));

  const sellerIds = Array.from(new Set(
    listings.filter(Boolean).map((l) => (l as ListingRow).sellerId)
  ));
  const categoryIds = Array.from(new Set(
    listings.filter(Boolean).map((l) => (l as ListingRow).categoryId).filter(Boolean) as string[]
  ));

  const [sellers, categories] = await Promise.all([
    Promise.all(sellerIds.map((id) => getUserById(id))),
    Promise.all(categoryIds.map((id) => getCategoryById(id))),
  ]);

  const sellerMap = new Map(sellerIds.map((id, i) => [id, sellers[i]]));
  const categoryMap = new Map(categoryIds.map((id, i) => [id, categories[i]]));

  return favorites.map((f) => {
    const listing = listingMap.get(f.listingId) ?? null;
    return {
      favorite: f,
      listing,
      seller: listing ? sellerMap.get(listing.sellerId) ?? null : null,
      category: listing?.categoryId ? categoryMap.get(listing.categoryId) ?? null : null,
    };
  });
}

/** Busca un favorito por (userId, listingId). */
export async function findFavorite(
  userId: string,
  listingId: string
): Promise<FavoriteRow | null> {
  const rows = await query<AnyRow>(
    `SELECT * FROM Favorite WHERE userId = ? AND listingId = ? LIMIT 1`,
    [userId, listingId]
  );
  return rows.length > 0 ? parseFavorite(rows[0]) : null;
}

/** Crea un favorito. */
export async function createFavorite(userId: string, listingId: string): Promise<FavoriteRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Favorite (id, userId, listingId, createdAt) VALUES (?, ?, ?, ?)`,
    [id, userId, listingId, now]
  );
  const rows = await query<AnyRow>(`SELECT * FROM Favorite WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Favorite creation failed");
  return parseFavorite(rows[0]);
}

/** Elimina un favorito por id. */
export async function deleteFavorite(id: string): Promise<void> {
  await execute(`DELETE FROM Favorite WHERE id = ?`, [id]);
}

// ════════════════════════════════════════════════════════════
//  REVIEWS (creación con unique check + recálculo de rating)
// ════════════════════════════════════════════════════════════

export interface ReviewCreateInput {
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
}

/** Crea una reseña. Lanza error si ya existe (listingId, userId). */
export async function createReview(input: ReviewCreateInput): Promise<ReviewRow> {
  // Check existing (UNIQUE(listingId, userId))
  const existing = await queryOne<AnyRow>(
    `SELECT id FROM Review WHERE listingId = ? AND userId = ? LIMIT 1`,
    [input.listingId, input.userId]
  );
  if (existing) {
    throw new Error("ALREADY_REVIEWED");
  }

  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Review (id, listingId, userId, rating, comment, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, input.listingId, input.userId, input.rating, input.comment, now, now]
  );

  // Recalcular rating + reviewCount del listing
  const stats = await queryOne<AnyRow>(
    `SELECT AVG(rating) as avg, COUNT(*) as cnt FROM Review WHERE listingId = ?`,
    [input.listingId]
  );
  if (stats) {
    const avg = toNum(stats.avg);
    const cnt = toNum(stats.cnt);
    await execute(
      `UPDATE Listing SET rating = ?, reviewCount = ?, updatedAt = ? WHERE id = ?`,
      [Math.round(avg * 10) / 10, cnt, now, input.listingId]
    );
  }

  const rows = await query<AnyRow>(`SELECT * FROM Review WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Review creation failed");
  return parseReview(rows[0]);
}

// ════════════════════════════════════════════════════════════
//  REPORTS (creación pública)
// ════════════════════════════════════════════════════════════

export interface ReportCreateInput {
  reporterId: string;
  reportedUserId?: string | null;
  listingId?: string | null;
  reason: string;
  description?: string | null;
}

export async function createReport(input: ReportCreateInput): Promise<ReportRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Report (id, reporterId, reportedUserId, listingId, reason, description, status, resolution, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'open', NULL, ?, ?)`,
    [
      id,
      input.reporterId,
      input.reportedUserId ?? null,
      input.listingId ?? null,
      input.reason,
      input.description ?? null,
      now,
      now,
    ]
  );
  const rows = await query<AnyRow>(`SELECT * FROM Report WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Report creation failed");
  return parseReport(rows[0]);
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function parseNotification(r: AnyRow): NotificationRow {
  return {
    id: toStr(r.id),
    userId: toStr(r.userId),
    type: toStr(r.type),
    title: toStr(r.title),
    body: toStr(r.body),
    link: toStrOrNull(r.link),
    read: toBool(r.read),
    createdAt: toDateISO(r.createdAt),
  };
}

export async function findNotificationsByUser(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<NotificationRow[]> {
  const where: string[] = ["userId = ?"];
  const args: unknown[] = [userId];
  if (opts.unreadOnly) {
    where.push("read = 0");
  }
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const rows = await query<AnyRow>(
    `SELECT * FROM Notification WHERE ${where.join(" AND ")} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  return rows.map(parseNotification);
}

export async function countNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<number> {
  const where: string[] = ["userId = ?"];
  const args: unknown[] = [userId];
  if (unreadOnly) where.push("read = 0");
  return queryCount(
    `SELECT COUNT(*) as count FROM Notification WHERE ${where.join(" AND ")}`,
    args
  );
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<NotificationRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Notification (id, userId, type, title, body, link, read, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, input.userId, input.type, input.title, input.body, input.link ?? null, now]
  );
  const rows = await query<AnyRow>(`SELECT * FROM Notification WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Notification creation failed");
  return parseNotification(rows[0]);
}

export async function markNotificationRead(id: string): Promise<void> {
  await execute(`UPDATE Notification SET read = 1 WHERE id = ?`, [id]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await execute(`UPDATE Notification SET read = 1 WHERE userId = ?`, [userId]);
}

// ════════════════════════════════════════════════════════════
//  CONVERSATIONS & MESSAGES
// ════════════════════════════════════════════════════════════

export interface ConversationRow {
  id: string;
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

function parseConversation(r: AnyRow): ConversationRow {
  return {
    id: toStr(r.id),
    listingId: toStrOrNull(r.listingId),
    createdAt: toDateISO(r.createdAt),
    updatedAt: toDateISO(r.updatedAt),
  };
}

function parseMessage(r: AnyRow): MessageRow {
  return {
    id: toStr(r.id),
    conversationId: toStr(r.conversationId),
    senderId: toStr(r.senderId),
    content: toStr(r.content),
    read: toBool(r.read),
    createdAt: toDateISO(r.createdAt),
  };
}

/** Tabla puente Conversation-Participant (Prisma la genera como _ConversationParticipants). */
export async function findConversationsByUser(userId: string): Promise<Array<{
  conversation: ConversationRow;
  participants: UserRow[];
  lastMessage: MessageRow | null;
  listing: ListingRow | null;
}>> {
  // Prisma genera tabla _ConversationParticipants con A=conversationId, B=userId
  const rows = await query<AnyRow>(
    `SELECT c.* FROM Conversation c
     INNER JOIN _ConversationParticipants cp ON cp.A = c.id
     WHERE cp.B = ?
     ORDER BY c.updatedAt DESC`,
    [userId]
  );
  const conversations = rows.map(parseConversation);
  if (conversations.length === 0) return [];

  // Para cada conversación, buscar participantes, último mensaje y listing
  const result = await Promise.all(
    conversations.map(async (conv) => {
      const participantRows = await query<AnyRow>(
        `SELECT u.* FROM User u
         INNER JOIN _ConversationParticipants cp ON cp.B = u.id
         WHERE cp.A = ?`,
        [conv.id]
      );
      const participants = participantRows.map(parseUser);

      const lastMsgRows = await query<AnyRow>(
        `SELECT * FROM Message WHERE conversationId = ? ORDER BY createdAt DESC LIMIT 1`,
        [conv.id]
      );
      const lastMessage = lastMsgRows.length > 0 ? parseMessage(lastMsgRows[0]) : null;

      const listing = conv.listingId ? await getListingById(conv.listingId) : null;

      return { conversation: conv, participants, lastMessage, listing };
    })
  );

  return result;
}

export async function findMessagesByConversation(
  conversationId: string,
  opts: { limit?: number } = {}
): Promise<MessageRow[]> {
  const limit = opts.limit ?? 200;
  const rows = await query<AnyRow>(
    `SELECT * FROM Message WHERE conversationId = ? ORDER BY createdAt ASC LIMIT ?`,
    [conversationId, limit]
  );
  return rows.map(parseMessage);
}

export async function createMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
}): Promise<MessageRow> {
  const id = generateCuid();
  const now = nowISO();
  await execute(
    `INSERT INTO Message (id, conversationId, senderId, content, read, createdAt)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [id, input.conversationId, input.senderId, input.content, now]
  );
  // Actualizar updatedAt de la conversación
  await execute(`UPDATE Conversation SET updatedAt = ? WHERE id = ?`, [now, input.conversationId]);
  const rows = await query<AnyRow>(`SELECT * FROM Message WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new Error("Message creation failed");
  return parseMessage(rows[0]);
}

// ════════════════════════════════════════════════════════════
//  PLANS (público - solo activos)
// ════════════════════════════════════════════════════════════

export async function findActivePlans(): Promise<PlanRow[]> {
  const rows = await query<AnyRow>(
    `SELECT * FROM Plan WHERE active = 1 ORDER BY \`order\` ASC, price ASC`
  );
  return rows.map(parsePlan);
}

