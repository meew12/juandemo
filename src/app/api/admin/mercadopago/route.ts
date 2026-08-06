import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateMpCache, validateMpToken } from "@/lib/mercadopago";

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

// SiteConfig keys managed by this endpoint
const MP_KEYS = [
  "mp.access_token",
  "mp.public_key",
  "mp.webhook_secret",
  "mp.webhook_url",
] as const;

const KEY_LABELS: Record<string, string> = {
  "mp.access_token": "Access Token",
  "mp.public_key": "Public Key",
  "mp.webhook_secret": "Webhook Secret (opcional)",
  "mp.webhook_url": "Webhook URL override (opcional)",
};

// ─── GET /api/admin/mercadopago ───
// Returns the current MP credentials. Tokens are masked for security
// (we only show the last 4 chars of the access token).
export async function GET() {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const rows = await db.siteConfig.findMany({
      where: { key: { in: [...MP_KEYS] } },
    });

    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });

    // Merge with env fallbacks
    const accessToken =
      map["mp.access_token"] || process.env.MERCADOPAGO_ACCESS_TOKEN || "";
    const publicKey =
      map["mp.public_key"] || process.env.MERCADOPAGO_PUBLIC_KEY || "";
    const webhookSecret =
      map["mp.webhook_secret"] || process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    const webhookUrl =
      map["mp.webhook_url"] || process.env.MERCADOPAGO_WEBHOOK_URL || "";

    // Determine source (db or env)
    const sourceOf = (key: string, dbVal: string | undefined, envVal: string | undefined) =>
      dbVal !== undefined ? "db" : envVal !== undefined ? "env" : "none";

    // Mask tokens: show only prefix + last 4 chars
    const mask = (val: string) => {
      if (!val) return "";
      if (val.length <= 12) return val;
      const prefix = val.slice(0, val.indexOf("-") + 1 || 6);
      const last4 = val.slice(-4);
      return `${prefix}••••••••••••${last4}`;
    };

    return NextResponse.json({
      credentials: {
        accessToken: {
          value: accessToken,
          masked: mask(accessToken),
          source: sourceOf("mp.access_token", map["mp.access_token"], process.env.MERCADOPAGO_ACCESS_TOKEN),
          isSandbox: accessToken.startsWith("TEST-"),
          isPlaceholder:
            !accessToken ||
            accessToken.includes("placeholder") ||
            accessToken === "TEST-umpi-placeholder-replace-with-real-test-token",
        },
        publicKey: {
          value: publicKey,
          masked: mask(publicKey),
          source: sourceOf("mp.public_key", map["mp.public_key"], process.env.MERCADOPAGO_PUBLIC_KEY),
          isSandbox: publicKey.startsWith("TEST-"),
        },
        webhookSecret: {
          value: webhookSecret,
          masked: webhookSecret ? mask(webhookSecret) : "",
          source: sourceOf(
            "mp.webhook_secret",
            map["mp.webhook_secret"],
            process.env.MERCADOPAGO_WEBHOOK_SECRET
          ),
        },
        webhookUrl: {
          value: webhookUrl,
          source: sourceOf(
            "mp.webhook_url",
            map["mp.webhook_url"],
            process.env.MERCADOPAGO_WEBHOOK_URL
          ),
        },
      },
      labels: KEY_LABELS,
    });
  } catch (err: any) {
    console.error("GET /api/admin/mercadopago error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── PUT /api/admin/mercadopago ───
// Body: { credentials: { "mp.access_token": "...", "mp.public_key": "...", ... } }
// Empty string values are ignored (keep existing). To clear a value, send null.
export async function PUT(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { credentials, action } = body as {
      credentials?: Record<string, string | null>;
      action?: "save" | "test";
    };

    // ─── Test mode: validate the provided token without saving ───
    if (action === "test") {
      const token = credentials?.["mp.access_token"];
      if (!token) {
        return NextResponse.json(
          { error: "Falta access_token para validar" },
          { status: 400 }
        );
      }
      const result = await validateMpToken(token);
      return NextResponse.json(result);
    }

    // ─── Save mode ───
    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json({ error: "Falta credentials" }, { status: 400 });
    }

    const entries = Object.entries(credentials).filter(([k]) =>
      (MP_KEYS as readonly string[]).includes(k)
    );

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No hay claves válidas para actualizar" },
        { status: 400 }
      );
    }

    let saved = 0;
    let cleared = 0;
    for (const [key, value] of entries) {
      if (value === null) {
        // Clear: delete from DB (will fall back to env)
        await db.siteConfig
          .delete({ where: { key } })
          .catch(() => {}); // ignore if not exists
        cleared++;
      } else if (typeof value === "string" && value.trim() !== "") {
        await db.siteConfig.upsert({
          where: { key },
          update: { value: value.trim() },
          create: { key, value: value.trim() },
        });
        saved++;
      }
      // Empty string = no-op (skip)
    }

    // Invalidate the in-memory cache so the new token is used immediately
    invalidateMpCache();

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mercadopago_config_update",
        entity: "site_config",
        details: JSON.stringify({
          keys: entries.map(([k]) => k),
          saved,
          cleared,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      saved,
      cleared,
      message: `${saved} credencial(es) guardada(s)${cleared ? `, ${cleared} borrada(s)` : ""}`,
    });
  } catch (err: any) {
    console.error("PUT /api/admin/mercadopago error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
