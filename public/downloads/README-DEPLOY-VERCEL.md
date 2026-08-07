# UMPI Marketplace — Deploy en Vercel (VERSIÓN CORREGIDA)

> **Código 100% migrado a libsql directo** — ya NO usa Prisma en runtime.
> Esto resuelve el error `URL_INVALID: The URL 'undefined'` que rompía el
> panel de admin, la creación de publicaciones y el editor del sitio.

---

## 1. ¿Qué incluye este ZIP?

- ✅ **38 endpoints API** migrados a `@/lib/db-raw.ts` (cliente libsql directo)
- ✅ **Auth** self-contained (login + registro funcionan sin Prisma)
- ✅ **Subida de imágenes** vía base64 data URLs (sin escritura en filesystem — funciona en Vercel read-only)
- ✅ **Panel de admin** completo (dashboard, usuarios, categorías, reseñas, reportes, transacciones, suscripciones, site-config, planes, audit, mercadopago)
- ✅ **Editor del sitio** (site-config) funcional
- ✅ **Publicar aviso** funcional (POST /api/listings)
- ✅ **Todo lo que se haga en la plataforma se refleja en el panel de admin**
- ✅ Esquema Prisma incluido (solo para `prisma generate` en build, NO se usa en runtime)
- ✅ Script SQL completo para Turso (`public/downloads/umpi_full.sql`)

---

## 2. Pasos para deployar en Vercel

### PASO 1 — Reemplazar el repositorio

**Sí, borrá el repositorio actual de Vercel y subí este código nuevo.**
La forma más limpia es:

1. Descargá `umpi-vercel-fix.zip` y descomprimilo en una carpeta local.
2. Inicializá un repo nuevo:
   ```bash
   cd umpi-vercel-fix
   git init
   git add .
   git commit -m "UMPI marketplace - migración a libsql directo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/umpi-marketplace.git
   git push -u origin main
   ```
3. En Vercel: **New Project → Import** el repo nuevo.
   - O si querés reutilizar el proyecto existente: **Settings → Git → disconnect** y reconectá el repo nuevo.

> **Alternativa rápida (sin Git):** Usá `vercel` CLI:
> ```bash
> npm i -g vercel
> cd umpi-vercel-fix
> vercel --prod
> ```

### PASO 2 — Configurar variables de entorno en Vercel

En **Vercel → Settings → Environment Variables**, agregá TODAS estas:

| Variable | Valor | Obligatoria |
|----------|-------|-------------|
| `DATABASE_URL` | `libsql://umpi-softw.aws-us-west-2.aws.turso.io?authToken=TU_TOKEN_AQUI` | ✅ SÍ |
| `TURSO_AUTH_TOKEN` | Tu token de Turso (ej. `eyJhbGciOi...`) | ⚠️ Recomendada |
| `NEXTAUTH_URL` | `https://tu-dominio.vercel.app` | ✅ SÍ |
| `NEXTAUTH_SECRET` | Generá con: `openssl rand -base64 32` | ✅ SÍ |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` | ✅ SÍ |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de MercadoPago (production o test) | Para pagos |
| `MERCADOPAGO_PUBLIC_KEY` | Public key de MercadoPago | Para pagos |
| `MERCADOPAGO_WEBHOOK_URL` | `https://tu-dominio.vercel.app/api/mercadopago/webhook` | Para pagos |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret del webhook | Para pagos |

> **IMPORTANTE sobre DATABASE_URL:**
> - El `authToken` puede ir embebido en la URL (`?authToken=...`) O como variable separada `TURSO_AUTH_TOKEN`.
> - El código maneja ambos casos automáticamente.
> - Obtené tus credenciales en https://app.turso.app

### PASO 3 — Configurar Build & Development Settings

En **Vercel → Settings → Build & Development Settings**:

- **Build Command:** dejá el default (`next build`) — NO uses `vercel-build` personalizado.
- **Install Command:** `npm install` o `bun install` (default).
- **Framework Preset:** Next.js (auto-detectado).

> Si el build falla por `prisma generate`, el `postinstall` hook ya lo ejecuta automáticamente.

### PASO 4 — Deploy

1. Hacé **push** a `main` (o usá **Redeploy** en Vercel).
2. Esperá a que termine el build (≈2-3 min).
3. Abrí tu URL de Vercel.

### PASO 5 — Inicializar la base de datos Turso (si está vacía)

Si tu Turso DB está vacía o querés resetearla con datos de prueba:

```bash
# Instalar turso CLI si no la tenés
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Aplicar el schema SQL completo (incluido en el zip)
turso db shell umpi-softw < public/downloads/umpi_full.sql
```

El SQL incluye:
- Esquema completo (todas las tablas)
- 11 usuarios (admin + vendedores + compradores)
- 26 categorías
- 31 publicaciones de ejemplo
- Reseñas, conversaciones, transacciones, reportes
- **Credenciales demo:**
  - Admin: `admin@umpi.com.ar` / `admin123`
  - Usuario: `juan.garcia@email.com` / `user123`

---

## 3. Verificación post-deploy

Una vez deployado, probá estos endpoints:

| Endpoint | Debe devolver |
|----------|---------------|
| `GET /api/db-test` | JSON con `conclusion: "LIBSQL_OK"` |
| `GET /api/site-config` | Config del sitio (no error) |
| `GET /api/listings?featured=true&limit=8` | Array de publicaciones |
| `GET /api/categories` | Lista de categorías |
| `GET /api/plans` | Lista de planes |

Si `/api/db-test` sigue diciendo `PRISMA_BROKEN`, revisá que `DATABASE_URL` esté bien seteada en Vercel.

---

## 4. ¿Qué estaba roto y qué se arregló?

| Antes (ROTO) | Ahora (FIXED) |
|--------------|---------------|
| Login funcionaba pero Prisma fallaba en todo lo demás | ✅ Todo usa libsql directo |
| Panel de admin vacío (sin datos) | ✅ Todos los endpoints admin migrados |
| "Error interno" al publicar aviso | ✅ POST /api/listings migrado |
| Usuarios registrados no aparecen | ✅ GET /api/admin/users migrado |
| Editor del sitio no guardaba | ✅ PUT /api/admin/site-config migrado |
| Imágenes fallaban (EROFS) | ✅ Subida vía base64 data URLs |

---

## 5. Notas técnicas

- **Por qué no usar Prisma en runtime:** Prisma v6 con `driverAdapters` tiene un bug en Vercel serverless donde `env("DATABASE_URL")` del `schema.prisma` devuelve `undefined` aunque la variable esté configurada. La solución es bypassar Prisma completamente y usar `@libsql/client` directo.
- **Prisma SÍ se mantiene** en `devDependencies` y en el build (`prisma generate`) porque los tipos de TypeScript (`@prisma/client`) se usan para tipado, pero en runtime NUNCA se instancia `PrismaClient`.
- **`src/lib/db.ts`** todavía existe (con el Proxy lazy-init) pero ya NINGÚN endpoint lo importa. Solo `db-test` lo usa para diagnóstico comparativo.
- **`src/lib/db-raw.ts`** es el módulo que todos usan ahora (≈77KB con todas las query functions).

---

## 6. Soporte

Si algo no funciona después del deploy:

1. Revisá los logs en **Vercel → Functions → Logs**.
2. Visitá `/api/db-test` para ver el diagnóstico.
3. Verificá que TODAS las variables de entorno estén configuradas.
4. Asegurate de que el build haya ejecutado `prisma generate` (debería salir en el log de build).
