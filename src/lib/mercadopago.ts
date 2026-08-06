import { MercadoPagoConfig } from "mercadopago";
import { db } from "@/lib/db";

/**
 * MercadoPago credentials are stored in the SiteConfig table so the admin
 * can change them from the admin panel without touching .env.
 *
 * Keys:
 *  - mp.access_token   → MERCADOPAGO_ACCESS_TOKEN
 *  - mp.public_key     → MERCADOPAGO_PUBLIC_KEY
 *  - mp.webhook_secret → MERCADOPAGO_WEBHOOK_SECRET (optional, for signature validation)
 *  - mp.webhook_url    → MERCADOPAGO_WEBHOOK_URL (optional override)
 *
 * Falls back to process.env.* if not set in DB.
 */

// ─── In-memory cache (60s TTL) ───────────────────────────────────────────────
// Reading SiteConfig on every MP API call would add ~5-10ms of DB latency.
// Cache the resolved credentials for 60 seconds.
let cachedCreds: {
  accessToken: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
  webhookUrl: string | null;
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000;

async function readCredsFromDb(): Promise<Record<string, string>> {
  try {
    const rows = await db.siteConfig.findMany({
      where: { key: { startsWith: "mp." } },
    });
    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return map;
  } catch {
    // DB might not be ready during seed/migration — fail gracefully.
    return {};
  }
}

export interface MpCredentials {
  accessToken: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
  webhookUrl: string | null;
  /** true if the access token starts with "TEST-" (sandbox mode) */
  isSandbox: boolean;
  /** "configured" | "missing" | "placeholder" */
  status: "configured" | "missing" | "placeholder";
}

export async function getMpCredentials(): Promise<MpCredentials> {
  const now = Date.now();
  if (cachedCreds && now - cachedCreds.fetchedAt < CACHE_TTL_MS) {
    return toCredentials(cachedCreds);
  }

  const dbCreds = await readCredsFromDb();
  const accessToken = dbCreds["mp.access_token"] || process.env.MERCADOPAGO_ACCESS_TOKEN || null;
  const publicKey = dbCreds["mp.public_key"] || process.env.MERCADOPAGO_PUBLIC_KEY || null;
  const webhookSecret =
    dbCreds["mp.webhook_secret"] || process.env.MERCADOPAGO_WEBHOOK_SECRET || null;
  const webhookUrl =
    dbCreds["mp.webhook_url"] || process.env.MERCADOPAGO_WEBHOOK_URL || null;

  cachedCreds = {
    accessToken,
    publicKey,
    webhookSecret,
    webhookUrl,
    fetchedAt: now,
  };

  return toCredentials(cachedCreds);
}

function toCredentials(c: {
  accessToken: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
  webhookUrl: string | null;
}): MpCredentials {
  const token = c.accessToken;
  const isSandbox = (token || "").startsWith("TEST-");
  // Heuristic: the default placeholder we ship in .env
  const isPlaceholder =
    !token ||
    token.includes("placeholder") ||
    token === "TEST-umpi-placeholder-replace-with-real-test-token";
  const status: MpCredentials["status"] = isPlaceholder
    ? "placeholder"
    : token
      ? "configured"
      : "missing";
  return {
    accessToken: token,
    publicKey: c.publicKey,
    webhookSecret: c.webhookSecret,
    webhookUrl: c.webhookUrl,
    isSandbox,
    status,
  };
}

/** Force-refresh the cache (used after admin saves new credentials). */
export function invalidateMpCache(): void {
  cachedCreds = null;
}

/** Returns a MercadoPagoConfig client, or throws with a helpful message. */
export async function getMpClient(): Promise<MercadoPagoConfig> {
  const creds = await getMpCredentials();
  if (!creds.accessToken || creds.status !== "configured") {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN no configurado. Pedile al administrador que configure el token desde Panel Admin → Sistema → MercadoPago."
    );
  }
  return new MercadoPagoConfig({ accessToken: creds.accessToken });
}

/** Picks sandbox_init_point for TEST- tokens, otherwise init_point. */
export function pickInitPoint(result: any): string | null {
  const creds = cachedCreds;
  const isSandbox =
    (creds?.accessToken || "").startsWith("TEST-") ||
    (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
  if (isSandbox) return result.sandbox_init_point || result.init_point || null;
  return result.init_point || result.sandbox_init_point || null;
}

/** Resolves the webhook URL: DB override → NEXTAUTH_URL-derived → undefined. */
export async function getWebhookUrl(): Promise<string | undefined> {
  const creds = await getMpCredentials();
  if (creds.webhookUrl) return creds.webhookUrl;
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (base) return `${base.replace(/\/$/, "")}/api/mercadopago/webhook`;
  return undefined;
}

/**
 * Validates an access token by making a lightweight call to the MP API.
 * Returns { valid: boolean, accountId?: string, message: string }.
 */
export async function validateMpToken(accessToken: string): Promise<{
  valid: boolean;
  message: string;
  detail?: string;
}> {
  if (!accessToken) {
    return { valid: false, message: "Token vacío" };
  }
  if (accessToken.includes("placeholder")) {
    return {
      valid: false,
      message: "Token placeholder — reemplazalo con un token real de MercadoPago",
    };
  }
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        valid: true,
        message: `Token válido — cuenta: ${data.nickname || data.email || data.id}`,
        detail: JSON.stringify({ id: data.id, nickname: data.nickname, email: data.email }),
      };
    }
    if (res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => ({}));
      return {
        valid: false,
        message: "Token inválido o expirado",
        detail: err?.message || `HTTP ${res.status}`,
      };
    }
    return {
      valid: false,
      message: `Error al validar token (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return {
      valid: false,
      message: "No se pudo conectar con MercadoPago",
      detail: err?.message,
    };
  }
}
