// ════════════════════════════════════════════════════════════
//  app.js — Punto de entrada para Phusion Passenger (cPanel/GoDaddy)
// ════════════════════════════════════════════════════════════
//  Versión con diagnóstico: muestra mensajes claros si falta algo,
//  en vez de crashear con error 500 silencioso.
// ════════════════════════════════════════════════════════════

const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// ─── Función para devolver una página HTML con error diagnóstico ───
function sendDiagnosticPage(res, title, steps) {
  const stepsHtml = steps.map((s, i) => `<li><strong>${s.cmd || ''}</strong> — ${s.desc}</li>`).join('');
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UMPI - ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fef2f2; color: #1f2937; margin: 0; padding: 40px 20px; }
    .container { max-width: 720px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    h1 { color: #dc2626; margin: 0 0 8px 0; font-size: 24px; }
    .subtitle { color: #6b7280; margin: 0 0 24px 0; }
    ol { padding-left: 20px; line-height: 1.8; }
    code { background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; color: #be185d; }
    .cmd { display: inline-block; background: #1e293b; color: #fbbf24; padding: 4px 10px; border-radius: 4px; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ ${title}</h1>
    <p class="subtitle">La aplicación UMPI no puede arrancar todavía. Seguí estos pasos:</p>
    <ol>${stepsHtml}</ol>
    <div class="footer">
      Después de completar los pasos, volvé a <strong>Setup Node.js App → Restart</strong> en cPanel y recargá esta página.
    </div>
  </div>
</body>
</html>`;
  res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ─── Handler provisional mientras no esté listo el build ───
// Passenger llama a este handler si la app no exportó nada válido.
const diagnosticHandler = (req, res) => {
  const serverPath = path.join(__dirname, 'server.js');
  const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

  if (!fs.existsSync(serverPath) && !fs.existsSync(standalonePath)) {
    sendDiagnosticPage(res, 'Falta compilar el proyecto', [
      { cmd: 'npm install', desc: 'Instalar dependencias ( desde cPanel → Setup Node.js App → Run NPM Install )' },
      { cmd: 'npx prisma generate', desc: 'Generar el cliente Prisma' },
      { cmd: 'npm run build', desc: 'Compilar el proyecto para producción (esto crea server.js)' },
      { cmd: 'cp -r .next/standalone/. .', desc: 'Copiar el build standalone a la raíz de la app' }
    ]);
    return;
  }

  if (!fs.existsSync(path.join(__dirname, '.next', 'static'))) {
    sendDiagnosticPage(res, 'Faltan archivos estáticos', [
      { cmd: 'cp -r .next/static .next/standalone/.next/', desc: 'Copiar assets JS/CSS al build standalone' },
      { cmd: 'cp -r public .next/standalone/', desc: 'Copiar carpeta public/ al build standalone' }
    ]);
    return;
  }

  // Si llegó acá, algo más falló
  sendDiagnosticPage(res, 'Error desconocido', [
    { cmd: 'Revisar logs', desc: 'En cPanel → Setup Node.js App → View logs (buscá el error al final del archivo)' },
    { cmd: 'Verificar .env', desc: 'El archivo .env debe existir en la raíz de la app con DATABASE_URL, NEXTAUTH_SECRET, etc.' },
    { cmd: 'Verificar schema.prisma', desc: 'Debe usar provider="mysql" (copiá schema.mysql.prisma a schema.prisma)' }
  ]);
};

// ─── Intentar arrancar el server real ───
let nextHandler = null;

try {
  // Producción: server.js al lado de app.js
  nextHandler = require('./server.js');
} catch (e1) {
  try {
    // Fallback: server.js en .next/standalone/
    nextHandler = require('./.next/standalone/server.js');
  } catch (e2) {
    // No hay build todavía. Registrar el error y usar el handler de diagnóstico.
    console.error('═══════════════════════════════════════════════════════');
    console.error('  ❌ No se pudo cargar server.js — falta npm install + build');
    console.error('═══════════════════════════════════════════════════════');
    console.error('  Buscado en:');
    console.error('    ./server.js                  →', e1.code || e1.message);
    console.error('    ./.next/standalone/server.js  →', e2.code || e2.message);
    console.error('');
    console.error('  SOLUCIÓN:');
    console.error('    1. cPanel → Setup Node.js App → Run NPM Install');
    console.error('    2. cPanel → Setup Node.js App → Run script: build');
    console.error('    3. cp -r .next/standalone/. .');
    console.error('    4. Restart la app');
    console.error('═══════════════════════════════════════════════════════');
    nextHandler = null;
  }
}

// ─── Exportar para Passenger ───
if (nextHandler && typeof nextHandler === 'function') {
  // Caso ideal: server.js exportó un handler de función
  module.exports = nextHandler;
} else if (nextHandler && nextHandler.default && typeof nextHandler.default === 'function') {
  // server.js exportó con default
  module.exports = nextHandler.default;
} else if (nextHandler) {
  // server.js arrancó su propio HTTP server (caso típico de Next.js standalone)
  // En este modo, ya está escuchando en process.env.PORT.
  // Passenger detecta la app viva.
  module.exports = nextHandler;
} else {
  // Modo diagnóstico: devolver página explicativa
  module.exports = diagnosticHandler;
}
