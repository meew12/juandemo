// ════════════════════════════════════════════════════════════
//  /api/diagnostico — Página de diagnóstico visual
//  Abre esta URL en el navegador para ver el estado del deploy
// ════════════════════════════════════════════════════════════
//  Muestra en HTML claro:
//   - Variables de entorno configuradas (DATABASE_URL, etc)
//   - Si falta el authToken de Turso (causa del HTTP 401)
//   - Estado de la conexión a la base de datos
//   - Próximos pasos recomendados
// ════════════════════════════════════════════════════════════

import { createClient } from "@libsql/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseAuth(rawUrl: string | undefined) {
  if (!rawUrl) return { hasUrl: false, url: "", hasToken: false, tokenSource: "" };
  let url = rawUrl;
  let hasToken = false;
  let tokenSource = "";

  if (url.includes("authToken=")) {
    try {
      const u = new URL(url);
      if (u.searchParams.get("authToken")) {
        hasToken = true;
        tokenSource = "URL (?authToken=)";
      }
      u.searchParams.delete("authToken");
      url = u.toString();
    } catch {
      /* ignore */
    }
  }

  if (!hasToken && process.env.TURSO_AUTH_TOKEN) {
    hasToken = true;
    tokenSource = "Variable TURSO_AUTH_TOKEN";
  }

  return { hasUrl: true, url, hasToken, tokenSource };
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;
  const { hasUrl, url, hasToken, tokenSource } = parseAuth(rawUrl);

  const isTurso = url.startsWith("libsql://") || url.startsWith("libsql+ws://");
  const isSqlite = url.startsWith("file:");
  const isMysql = url.startsWith("mysql://");

  const nextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL || "(no configurada)";
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "(no configurado)";
  const mpMode = mpToken.includes("placeholder") ? "Demo (sin token real)" : "Token real";

  // ─── Probar conexión real a la DB ───
  let dbStatus: "ok" | "fail" | "skip" = "skip";
  let dbError = "";
  let userCount: number | null = null;
  let tableCount: number | null = null;
  let listingCount: number | null = null;
  let planCount: number | null = null;
  let categoryCount: number | null = null;
  let partialLoad = false;

  if (hasUrl && (!isTurso || hasToken)) {
    try {
      const client = createClient({
        url,
        authToken: isTurso ? process.env.TURSO_AUTH_TOKEN ?? extractTokenFromUrl(rawUrl!) : undefined,
      });
      // Probar un query simple
      const r = await client.execute("SELECT COUNT(*) as n FROM User");
      userCount = Number(r.rows[0].n);
      const t = await client.execute(
        "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table'"
      );
      tableCount = Number(t.rows[0].n);
      try { listingCount = Number((await client.execute("SELECT COUNT(*) as n FROM Listing")).rows[0].n); } catch { listingCount = null; }
      try { planCount = Number((await client.execute("SELECT COUNT(*) as n FROM Plan")).rows[0].n); } catch { planCount = null; }
      try { categoryCount = Number((await client.execute("SELECT COUNT(*) as n FROM Category")).rows[0].n); } catch { categoryCount = null; }
      dbStatus = "ok";
      // Detectar carga parcial: hay users pero no listings/planes/categorías
      if (userCount > 0 && (listingCount === 0 || planCount === 0 || categoryCount === 0)) {
        partialLoad = true;
      }
    } catch (e: any) {
      dbStatus = "fail";
      dbError = e.message || String(e);
    }
  }

  // ─── Determinar diagnóstico principal ───
  let diagnostico: { tipo: "ok" | "warn" | "error"; titulo: string; descripcion: string; pasos: string[] } = {
    tipo: "ok",
    titulo: "Todo configurado correctamente",
    descripcion: "Tu deploy debería funcionar. Si tenés algún otro problema, revisá los logs en Vercel.",
    pasos: [],
  };

  if (!hasUrl) {
    diagnostico = {
      tipo: "error",
      titulo: "Falta DATABASE_URL",
      descripcion: "No configuraste la variable DATABASE_URL en Vercel.",
      pasos: [
        "1. Andá a Vercel → tu proyecto → Settings → Environment Variables",
        "2. Agregá: DATABASE_URL = libsql://umpi-softw.aws-us-west-2.turso.io?authToken=TU_TOKEN",
        "3. Obtené tu token en https://app.turso.com/app/tatabases → tu DB → Settings → Tokens",
        "4. Esperá 1-2 min y volvé a cargar esta página",
      ],
    };
  } else if (isTurso && !hasToken) {
    diagnostico = {
      tipo: "error",
      titulo: "Falta el authToken de Turso (HTTP 401)",
      descripcion:
        "Tu DATABASE_URL tiene la URL de Turso pero FALTA el token de autenticación. Por eso Turso devuelve 401 y no te deja hacer login, registro ni setup.",
      pasos: [
        "1. Andá a https://app.turso.com/app/tatabases",
        "2. Hacé clic en tu DB (umpi-softw)",
        "3. Andá a la pestaña Settings → Tokens",
        "4. Hacé clic en 'Create Token' y copialo (empieza con 'eyJ...')",
        "5. En Vercel → Settings → Environment Variables, editá DATABASE_URL:",
        `   ${url}?authToken=eyJ...TU_TOKEN_AQUI`,
        "   (o creá otra variable TURSO_AUTH_TOKEN = eyJ...TU_TOKEN_AQUI)",
        "6. Guardá y esperá 1-2 min a que Vercel redeploye",
        "7. Volvé a cargar esta página y también /api/setup",
      ],
    };
  } else if (dbStatus === "fail") {
    const is401 = dbError.includes("401") || dbError.includes("Unauthorized");
    diagnostico = {
      tipo: "error",
      titulo: is401 ? "authToken inválido o expirado (HTTP 401)" : "Error de conexión a la DB",
      descripcion: is401
        ? "El token de Turso que pusiste es inválido o expiró. Generá uno nuevo."
        : dbError.substring(0, 200),
      pasos: is401
        ? [
            "1. Andá a https://app.turso.com/app/tatabases",
            "2. Seleccioná tu DB (umpi-softw)",
            "3. Settings → Tokens → Create Token",
            "4. Copiá el token nuevo (empieza con 'eyJ...')",
            "5. En Vercel → Settings → Environment Variables:",
            "   Editá DATABASE_URL reemplazando el token viejo, O",
            "   Editá TURSO_AUTH_TOKEN con el token nuevo",
            "6. Esperá 1-2 min y recargá esta página",
          ]
        : [
            "Revisá el mensaje de error de arriba",
            "Si el problema persiste, consultá los logs en Vercel → Functions",
          ],
    };
  } else if (partialLoad) {
    diagnostico = {
      tipo: "warn",
      titulo: "Carga parcial detectada — Schema desactualizado",
      descripcion:
        "Hay usuarios cargados pero faltan listings/planes/categorías. Esto pasa porque las tablas se crearon con un schema viejo. Necesitás forzar reset para recrearlas con el schema correcto.",
      pasos: [
        "1. Descargá el ZIP nuevo desde /downloads/umpi-marketplace.zip (si aún no lo hiciste)",
        "2. Subí los archivos a GitHub (reemplazando los viejos)",
        "3. Esperá a que Vercel redeploye (1-2 min)",
        "4. Abrí en el navegador: /api/setup?force=1",
        "5. Eso borrará todas las tablas viejas y las recreará con el schema correcto + cargará los 299 registros",
        "6. Después probá loguearte: admin@umpi.com.ar / admin123",
      ],
    };
  } else if (!nextAuthSecret) {
    diagnostico = {
      tipo: "error",
      titulo: "Falta NEXTAUTH_SECRET",
      descripcion:
        "Sin NEXTAUTH_SECRET, las sesiones no se pueden encriptar y login/registro fallan con 'jwe decryption failed'.",
      pasos: [
        "1. Generá un secreto aleatorio ejecutando en tu terminal: openssl rand -base64 32",
        "2. En Vercel → Settings → Environment Variables, agregá:",
        "   NEXTAUTH_SECRET = <valor que generaste>",
        "3. Esperá 1-2 min y recargá",
      ],
    };
  }

  // ─── Construir HTML ───
  const statusBadge = (ok: boolean, labelOk: string, labelBad: string) =>
    `<span class="badge ${ok ? "badge-ok" : "badge-bad"}">${ok ? "✓ " + labelOk : "✗ " + labelBad}</span>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UMPI · Diagnóstico de Deploy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f5f3ef;
      color: #1a1612;
      line-height: 1.6;
      min-height: 100vh;
      padding: 24px 16px;
    }
    .container {
      max-width: 880px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding: 24px;
      background: linear-gradient(135deg, #e84c1e 0%, #c49a2a 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 30px rgba(232, 76, 30, 0.2);
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.95;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #ece8e1;
    }
    .card h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1a1612;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f5f3ef;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .diagnostico {
      border-left: 4px solid;
      padding-left: 20px;
    }
    .diagnostico.ok { border-color: #1a7a4a; }
    .diagnostico.warn { border-color: #c49a2a; }
    .diagnostico.error { border-color: #e84c1e; }
    .diagnostico h3 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .diagnostico.ok h3 { color: #1a7a4a; }
    .diagnostico.warn h3 { color: #c49a2a; }
    .diagnostico.error h3 { color: #e84c1e; }
    .diagnostico p {
      color: #5a534a;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .pasos {
      list-style: none;
      padding: 0;
    }
    .pasos li {
      padding: 10px 14px;
      margin: 8px 0;
      background: #f5f3ef;
      border-radius: 8px;
      font-family: "SF Mono", Monaco, Consolas, monospace;
      font-size: 13px;
      color: #1a1612;
      word-break: break-all;
    }
    .pasos li a {
      color: #e84c1e;
      text-decoration: none;
      font-weight: 600;
    }
    .pasos li a:hover { text-decoration: underline; }
    .env-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f5f3ef;
      gap: 12px;
    }
    .env-row:last-child { border-bottom: none; }
    .env-name {
      font-family: "SF Mono", Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 600;
      color: #1a1612;
      min-width: 200px;
    }
    .env-value {
      font-family: "SF Mono", Monaco, Consolas, monospace;
      font-size: 12px;
      color: #5a534a;
      flex: 1;
      word-break: break-all;
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-ok { background: #d4edda; color: #1a7a4a; }
    .badge-bad { background: #f8d7da; color: #e84c1e; }
    .badge-warn { background: #fff3cd; color: #c49a2a; }
    .footer {
      text-align: center;
      padding: 24px;
      color: #5a534a;
      font-size: 12px;
    }
    .footer a { color: #e84c1e; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 16px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #e84c1e;
      color: white;
    }
    .btn-primary:hover { background: #c93d15; }
    .btn-secondary {
      background: white;
      color: #1a1612;
      border: 1px solid #ece8e1;
    }
    .btn-secondary:hover { background: #f5f3ef; }
    .code-block {
      background: #1a1612;
      color: #f5f3ef;
      padding: 14px;
      border-radius: 8px;
      font-family: "SF Mono", Monaco, Consolas, monospace;
      font-size: 12px;
      margin: 10px 0;
      overflow-x: auto;
      word-break: break-all;
    }
    @media (max-width: 600px) {
      .env-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .env-value { text-align: left; }
      .header h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>UMPI · Diagnóstico de Deploy</h1>
      <p>Estado actual de tu aplicación en Vercel</p>
    </div>

    <div class="card">
      <h2>📊 Resumen</h2>
      <div class="diagnostico ${diagnostico.tipo}">
        <h3>${diagnostico.tipo === "ok" ? "✅" : diagnostico.tipo === "warn" ? "⚠️" : "❌"} ${diagnostico.titulo}</h3>
        <p>${diagnostico.descripcion}</p>
        ${diagnostico.pasos.length > 0 ? `
          <ol class="pasos">
            ${diagnostico.pasos.map((p) => `<li>${p}</li>`).join("")}
          </ol>
        ` : ""}
        <div class="actions">
          <a href="/api/setup" class="btn btn-primary">Ir a /api/setup →</a>
          <a href="/" class="btn btn-secondary">Volver al inicio</a>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>🔧 Variables de Entorno</h2>
      <div class="env-row">
        <span class="env-name">DATABASE_URL</span>
        <span class="env-value">${hasUrl ? url : "(no configurada)"} ${statusBadge(hasUrl, "OK", "FALTA")}</span>
      </div>
      <div class="env-row">
        <span class="env-name">authToken (Turso)</span>
        <span class="env-value">${hasToken ? "Fuente: " + tokenSource : "—"} ${isTurso ? statusBadge(hasToken, "OK", "FALTA") : '<span class="badge badge-warn">N/A</span>'}</span>
      </div>
      <div class="env-row">
        <span class="env-name">NEXTAUTH_SECRET</span>
        <span class="env-value">${statusBadge(nextAuthSecret, "OK", "FALTA")}</span>
      </div>
      <div class="env-row">
        <span class="env-name">NEXTAUTH_URL</span>
        <span class="env-value">${nextAuthUrl}</span>
      </div>
      <div class="env-row">
        <span class="env-name">MP_ACCESS_TOKEN</span>
        <span class="env-value">${mpMode} ${mpToken.includes("placeholder") ? '<span class="badge badge-warn">DEMO</span>' : '<span class="badge badge-ok">OK</span>'}</span>
      </div>
      <div class="env-row">
        <span class="env-name">Tipo de DB</span>
        <span class="env-value">${
          isTurso ? "Turso (libSQL) — producción" :
          isSqlite ? "SQLite local — desarrollo" :
          isMysql ? "MySQL — producción" :
          "desconocido"
        }</span>
      </div>
    </div>

    <div class="card">
      <h2>🔌 Conexión a la Base de Datos</h2>
      ${
        dbStatus === "ok"
          ? `<p style="color:#1a7a4a; font-weight:600;">✓ Conexión exitosa</p>
             <div class="env-row">
               <span class="env-name">Usuarios en la DB</span>
               <span class="env-value">${userCount} ${userCount && userCount > 0 ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-warn">vacío</span>'}</span>
             </div>
             <div class="env-row">
               <span class="env-name">Publicaciones (Listing)</span>
               <span class="env-value">${listingCount === null ? "—" : listingCount} ${listingCount && listingCount > 0 ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-bad">FALTA</span>'}</span>
             </div>
             <div class="env-row">
               <span class="env-name">Planes (Plan)</span>
               <span class="env-value">${planCount === null ? "—" : planCount} ${planCount && planCount > 0 ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-bad">FALTA</span>'}</span>
             </div>
             <div class="env-row">
               <span class="env-name">Categorías</span>
               <span class="env-value">${categoryCount === null ? "—" : categoryCount} ${categoryCount && categoryCount > 0 ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-bad">FALTA</span>'}</span>
             </div>
             <div class="env-row">
               <span class="env-name">Tablas creadas</span>
               <span class="env-value">${tableCount} / 19</span>
             </div>
             ${
               partialLoad
                 ? `<div style="margin-top:16px;padding:14px;background:#fff3cd;border-radius:8px;border-left:4px solid #c49a2a;">
                      <p style="color:#c49a2a;font-weight:700;margin:0 0 8px 0;">⚠️ CARGA PARCIAL DETECTADA</p>
                      <p style="color:#5a534a;font-size:13px;margin:0 0 12px 0;">Hay usuarios pero faltan tablas con datos. Esto significa que el schema está desactualizado.</p>
                      <p style="color:#1a1612;font-size:13px;margin:0 0 8px 0;"><strong>Solución:</strong> visitá <a href="/api/setup?force=1" style="color:#e84c1e;font-weight:600;text-decoration:underline;">/api/setup?force=1</a> para recrear todas las tablas con el schema correcto + recargar los 299 registros.</p>
                      <p style="color:#5a534a;font-size:12px;margin:0;">⚠️ Esto borrará TODOS los datos actuales y los volverá a cargar desde umpi_turso.sql</p>
                   </div>`
                 : userCount === 0
                 ? `<p style="margin-top:12px;color:#c49a2a;font-weight:600;">⚠️ La DB está vacía. Visitá <a href="/api/setup" style="color:#e84c1e;font-weight:600;">/api/setup</a> para cargar los datos iniciales.</p>`
                 : `<p style="margin-top:12px;color:#1a7a4a;font-weight:600;">✓ La DB ya tiene datos completos. Todo listo para usar.</p>`
             }`
          : dbStatus === "fail"
          ? `<p style="color:#e84c1e; font-weight:600;">✗ Error de conexión</p>
             <div class="code-block">${dbError}</div>`
          : `<p style="color:#5a534a;">⏭️ Conexión omitida (configuración incompleta)</p>`
      }
    </div>

    ${
      hasUrl && isTurso && !hasToken
        ? `<div class="card">
            <h2>📋 Formato correcto de DATABASE_URL</h2>
            <p>Tu DATABASE_URL actual es:</p>
            <div class="code-block">${url}</div>
            <p style="margin-top:12px;">Debería ser:</p>
            <div class="code-block">${url}?authToken=eyJhbGciOiJFZERTQSIs...TU_TOKEN_AQUI</div>
            <p style="margin-top:12px; font-size:13px; color:#5a534a;">
              Obtené tu token en <a href="https://app.turso.com/app/tatabases" target="_blank" style="color:#e84c1e;font-weight:600;">app.turso.com</a> → tu DB → Settings → Tokens → Create Token
            </p>
          </div>`
        : ""
    }

    <div class="footer">
      <p>UMPI Marketplace · Diagnóstico de deploy · <a href="https://app.turso.com" target="_blank">Turso Panel</a> · <a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a></p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function extractTokenFromUrl(rawUrl: string): string | undefined {
  try {
    const u = new URL(rawUrl);
    return u.searchParams.get("authToken") ?? undefined;
  } catch {
    return undefined;
  }
}
