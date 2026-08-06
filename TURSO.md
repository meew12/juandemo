# 🌐 Despliegue en Vercel + Turso — UMPI Marketplace

> **¿Por qué Turso?** Es SQLite en la nube (libSQL). Como tu app **ya estaba
> diseñada con SQLite**, no cambiás nada del código ni del schema.
> Solo agregás 2 variables (URL + token) y listo.

---

## 📋 Resumen del flujo (15 minutos)

```
   ┌─────────────────────────────────────────────────────┐
   │ 1. Crear cuenta y base en Turso                      │  ⬅ 3 min
   ├─────────────────────────────────────────────────────┤
   │ 2. Crear tablas y cargar datos                       │  ⬅ 5 min
   ├─────────────────────────────────────────────────────┤
   │ 3. Subir código a GitHub                             │  ⬅ 4 min
   ├─────────────────────────────────────────────────────┤
   │ 4. Importar repo en Vercel                           │  ⬅ 1 min
   ├─────────────────────────────────────────────────────┤
   │ 5. Pegar 4 variables de entorno                     │  ⬅ 2 min
   ├─────────────────────────────────────────────────────┤
   │ 6. Deploy automático                                 │  ⬅ 3 min
   ├─────────────────────────────────────────────────────┤
   │ 7. (Opcional) Conectar dominio juanumpi.com.mialias.net │ ⬅ 5 min
   └─────────────────────────────────────────────────────┘
```

---

## 🎯 ¿Por qué Turso es más fácil que TiDB?

| | TiDB (MySQL) | **Turso (libSQL/SQLite)** |
|---|---|---|
| Cambios en código | Ninguno | Ninguno |
| Cambios en schema | Renombrar schema.mysql.prisma | **Ninguno** (ya es SQLite) |
| Paquetes a instalar | Ninguno | Ya están instalados (`@prisma/adapter-libsql`) |
| Formato de datos | SQL MySQL | **SQL SQLite** (igual que tu dev local) |
| SSL/TLS | Manual con `?sslaccept=accept` | Automático (va en el token) |
| Plan gratis | 5 GB | 9 GB (más generoso) |
| Latencia desde Vercel | EE.UU./Europa solo | **Edge global** (más rápido) |

---

## 🗄️ PASO 1: Crear la base en Turso

### 1.1 — Crear cuenta

1. Andá a https://turso.tech → click **"Start free"** o "Sign up"
2. Podés registrarte con GitHub, Google o email
3. Verificá el email si te lo piden

### 1.2 — Crear la base de datos

Tenés 2 opciones para crearla:

#### Opción A — Desde la web (más simple)

1. Después de loguearte, vas a https://app.turso.tech
2. Click en **"New Database"**
3. Completá:
   - **Name:** `umpi`
   - **Location:** `bue` (Buenos Aires — recomendado por cercanía) o cualquier otra
   - **Type:** **Free** (el plan gratuito)
4. Click **"Create"**

#### Opción B — Desde la terminal (CLI, opcional)

```bash
# Instalar Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login (abre el navegador)
turso auth login

# Crear base
turso db create umpi --location bue
```

### 1.3 — Conseguir la URL y el token

En la web https://app.turso.tech:

1. Hacé click en tu base **`umpi`**
2. Vas a ver 2 datos importantes:

   **Database URL:**
   ```
   libsql://umpi-<tu-usuario>.turso.io
   ```

   **Auth Token:** (click en "Create auth token" si no lo ves)
   ```
   eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnc...  (string largo)
   ```

3. **Anotá los dos valores** — los vas a necesitar para Vercel.

> ⚠️ El token solo se muestra una vez cuando lo creás. Si lo perdés, tenés que
> generar uno nuevo (los viejos se pueden revocar).

---

## 📥 PASO 2: Crear tablas y cargar datos

### 2.1 — Crear las tablas (con Prisma)

Turso expone una consola web para ejecutar SQL. Tenés 2 caminos:

#### Camino A — Usar Prisma desde tu compu (RECOMENDADO)

1. En tu compu, en la raíz del proyecto descomprimido, editá el archivo `.env`:
   ```env
   # Reemplazá la línea de DATABASE_URL por:
   DATABASE_URL="libsql://umpi-<tu-usuario>.turso.io?authToken=<tu-token>"
   ```
   (Reemplazá `<tu-usuario>` y `<tu-token>` con tus valores reales)

2. Ejecutá:
   ```bash
   # Generar el cliente Prisma
   npx prisma generate

   # Crear las tablas en Turso
   npx prisma db push
   ```
   Vas a ver: `🚀 Your database is now in sync with your Prisma schema.`

3. ✅ Las 20 tablas están creadas en Turso.

#### Camino B — Desde la consola web de Turso

Si no tenés Node.js instalado en tu compu:

1. https://app.turso.tech → click en tu base `umpi`
2. Andá a la pestaña **"SQL"** o **"Console"**
3. Pegá el contenido de `database/umpi_schema_sqlite.sql` (que generaremos abajo)
4. Click **"Run"**

> 💡 El camino A es mejor porque te asegura que las tablas son idénticas a las
> que Prisma espera. Si usás el camino B, después igual tenés que correr
> `npx prisma db push` para sincronizar.

### 2.2 — Cargar los datos (16 usuarios, 33 publicaciones, etc.)

#### Camino A — Con Prisma + script

Desde tu compu, con el `.env` ya configurado:

```bash
# Ejecutar el script de exportación (genera database/umpi_turso.sql)
bun run scripts/export-sqlite-to-turso.ts

# O si usás npm:
npx tsx scripts/export-sqlite-to-turso.ts

# Cargar los datos a Turso
npx prisma db seed
# O si no tenés seed configurado, ejecutá el SQL directamente:
turso db shell umpi < database/umpi_turso.sql
```

#### Camino B — Pegar SQL en la consola web

1. Abrí el archivo `database/umpi_turso.sql` del ZIP con un editor de texto
2. Seleccioná TODO (Ctrl+A) → copiá (Ctrl+C)
3. En https://app.turso.tech → tu base → pestaña **SQL**
4. Pegá el contenido (Ctrl+V) → click **"Run"**
5. Vas a ver "Query executed successfully"

### 2.3 — Verificar que se cargó bien

En la consola SQL de Turso, ejecutá:

```sql
SELECT COUNT(*) FROM User;
```
✅ Debe devolver **16**

```sql
SELECT email, role FROM User WHERE role = 'ADMIN';
```
✅ Debe devolver `admin@umpi.com.ar` con rol `ADMIN`

```sql
SELECT COUNT(*) FROM Listing;
SELECT COUNT(*) FROM Plan;
SELECT COUNT(*) FROM Category;
```
✅ Deben devolver **33**, **3**, y **27** respectivamente.

---

## 📤 PASO 3: Subir el código a GitHub

### 3.1 — Si no tenés cuenta de GitHub

Creá una gratis en https://github.com/signup (1 minuto).

### 3.2 — Crear el repositorio

1. Andá a https://github.com/new
2. **Repository name:** `umpi-marketplace`
3. **Visibility:** Private (recomendado) o Public
4. ✅ Marcá "Add a README file"
5. Click **Create repository**

### 3.3 — Subir los archivos

1. Descomprimí el ZIP `umpi-marketplace.zip` en una carpeta en tu compu
2. **NO necesitás cambiar el schema.prisma** (ya está en SQLite, perfecto para Turso) ✅
3. En GitHub, en tu repo → click en **"uploading an existing file"**
4. Arrastrá **TODOS** los archivos y carpetas de la carpeta descomprimida
5. Esperá a que suban todos (1-2 min)
6. **Commit message:** "Initial commit" → click **Commit changes**

> ⚠️ **NO subas** estos archivos/carpetas:
> - `node_modules/` (Vercel lo instala solo)
> - `.next/` (Vercel lo genera solo)
> - `.env` (las variables van directo en Vercel, NO en GitHub)
> - `db/*.db` (bases SQLite locales con datos de desarrollo)
> - `dev.log`, `server.log`

### 3.4 — Verificar el schema

En GitHub, hacé click en `prisma/schema.prisma`. Las primeras líneas deben decir:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

✅ Si dice `provider = "sqlite"` → perfecto, no cambiás nada.

---

## 🚀 PASO 4: Importar el repo en Vercel

1. Andá a https://vercel.com → **Sign Up** / **Log In** (podés entrar con GitHub)
2. Click en **"Add New..." → "Project"**
3. En la lista, buscá tu repo `umpi-marketplace` → click **"Import"**
4. Vercel detecta automáticamente Next.js:
   - **Framework Preset:** Next.js ✅
   - **Build Command:** `next build` ✅
   - **Output Directory:** `.next` ✅
   - **Install Command:** `npm install` ✅

5. **NO hagas click en Deploy todavía** — primero configurá las variables (Paso 5)

---

## ⚙️ PASO 5: Configurar variables de entorno

En la misma página, desplegá **"Environment Variables"**.

Agregá estas **4 variables** (muchas menos que con MySQL/TiDB):

### 1. `DATABASE_URL`

```
libsql://umpi-<tu-usuario>.turso.io?authToken=<tu-token>
```

Reemplazá `<tu-usuario>` y `<tu-token>` por los valores del PASO 1.3.

Ejemplo:
```
libsql://umpi-juanperez.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnc...
```

> 🔑 El token va DENTRO de la URL como query param `?authToken=`.
> Esto es lo más cómodo: una sola variable y listo.

### 2. `NEXTAUTH_SECRET`

```
3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8=
```

### 3. `NEXTAUTH_URL`

```
https://umpi.vercel.app
```

> Cambiala después por tu dominio real (`https://juanumpi.com.mialias.net`) cuando lo conectes.

### 4. `MERCADOPAGO_ACCESS_TOKEN`

```
TEST-umpi-placeholder-replace-with-real-test-token
```

### 5. `MERCADOPAGO_PUBLIC_KEY`

```
TEST-umpi-placeholder-pk
```

### 6. `NODE_ENV`

```
production
```

> 💡 **NO necesitás** `TURSO_AUTH_TOKEN` como variable separada — el token va
> embebido en el `DATABASE_URL`. Más simple.

---

## ▶️ PASO 6: Deploy

1. Click en el botón azul **"Deploy"** (abajo de todo)
2. Esperá 3-5 minutos mientras Vercel:
   - Instala dependencias (`npm install`)
   - Genera el cliente Prisma con el adapter libSQL
   - Compila el proyecto (`npm run build`)
   - Despliega a su CDN global
3. Cuando termine vas a ver confeti 🎉 y un botón **"Visit"**
4. Click **Visit** → tu app está online en `https://umpi-marketplace-xxxxx.vercel.app`

### Verificar que funciona:

1. Entrá a la URL de Vercel
2. Probá loguearte como admin:
   - Email: `admin@umpi.com.ar`
   - Password: `admin123`
3. Andá al **Panel Admin** → deberías ver los 16 usuarios, 33 publicaciones, etc.
4. Si todo carga → ✅ **Conexión Vercel ↔ Turso funcionando perfecta**

### Posibles errores:

| Error | Causa | Fix |
|-------|-------|-----|
| `PrismaClientInitializationError: Can't reach database` | URL Turso mal copiada | Verificá que tenga `?authToken=` |
| `Authentication failed` | Token incorrecto o expirado | Generá un token nuevo en Turso |
| `LIBSQL_SQL_ERROR: no such table: User` | No creaste las tablas | Ejecutá `npx prisma db push` (Paso 2.1) |
| `Build failed: Cannot find module '@prisma/adapter-libsql'` | Falta el paquete | Ya está en `package.json`, Vercel lo instala solo |
| `Build failed: error TS2691` | Errores de TypeScript | Ya está `ignoreBuildErrors: true` en next.config |

> 💡 Si el build falla, en Vercel → **Deployments** → click en el deploy fallido →
> **"Build Logs"** → andá al final → copiame el error y te digo cómo arreglarlo.

---

## 🌐 PASO 7 (Opcional): Conectar tu dominio `juanumpi.com.mialias.net`

### 7.1 — En Vercel:

1. Tu proyecto → pestaña **"Settings" → "Domains"**
2. Escribí `juanumpi.com.mialias.net` → click **"Add"**
3. Vercel te va a mostrar:
   ```
   Type:  CNAME
   Name:  juanumpi (o el subdominio)
   Value: cname.vercel-dns.com
   ```

### 7.2 — En cdmon (cambiar DNS):

1. Entrá al panel de cdmon → **DNS / Zone Editor**
2. Buscá el registro existente para `juanumpi.com.mialias.net`
3. **Eliminá ese registro** y agregá uno nuevo:
   - **Tipo:** `CNAME`
   - **Nombre/Alias:** `juanumpi` (o el subdominio)
   - **Valor/Destino:** `cname.vercel-dns.com`
   - **TTL:** Default / 3600
4. Guardá los cambios

> ⚠️ Si tenés un registro A para `juanumpi.com.mialias.net` apuntando a cdmon,
> **tenés que borrarlo primero** antes de agregar el CNAME. No pueden coexistir.

### 7.3 — Esperar propagación DNS

- Tarda de **5 minutos a 2 horas**
- Verificá en https://dnschecker.org poniendo `juanumpi.com.mialias.net`
- Cuando todas las IPs resuelvan a Vercel, volvé a la pestaña Domains → ✅ verde

### 7.4 — Actualizar NEXTAUTH_URL

1. Vercel → **Settings → Environment Variables**
2. Editá `NEXTAUTH_URL`
3. Cambiá a: `https://juanumpi.com.mialias.net`
4. Click **Save**
5. **Redeploy**: Deployments → ⋮ → Redeploy

---

## 💳 Configurar MercadoPago (después del deploy)

1. https://www.mercadopago.com.ar/developers/panel → creá una app
2. URLs de retorno:
   - Success: `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - Failure: `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - Pending: `https://juanumpi.com.mialias.net/dashboard/subscriptions`
3. Copiá Access Token y Public Key (`TEST-...`)
4. En tu sitio → login admin → **Panel Admin → MercadoPago** → pegá credenciales → Guardar
5. Click **Validar token**

> Mientras tanto, modo demo: las compras se simulan sin cobrar.

---

## 🔒 Checklist final

- [ ] Base Turso creada (https://app.turso.tech)
- [ ] Token anotado (no se puede recuperar si lo perdés)
- [ ] Tablas creadas con `npx prisma db push`
- [ ] Datos importados (verificaste `SELECT COUNT(*) FROM User` = 16)
- [ ] `schema.prisma` dice `provider = "sqlite"` y tiene `previewFeatures = ["driverAdapters"]`
- [ ] Código subido a GitHub
- [ ] 6 variables de entorno en Vercel
- [ ] Deploy exitoso
- [ ] Login admin funciona
- [ ] Dominio conectado (CNAME → cname.vercel-dns.com)
- [ ] `NEXTAUTH_URL` actualizada a `https://juanumpi.com.mialias.net`
- [ ] Cambiar password del admin
- [ ] Configurar MercadoPago cuando estés listo

---

## ❓ Preguntas frecuentes

### ¿Turso es gratis?
Sí, el plan **Free** incluye:
- ✅ **500 bases de datos** (puede crear muchas)
- ✅ **9 GB total** de almacenamiento
- ✅ **500 bases de datos primarias**
- ✅ **1 billón de filas leídas/mes**
- ✅ **25 millones de filas escritas/mes**
- ✅ Ubicaciones edge globales (incluida `bue` Buenos Aires)

Para un marketplace pequeño/mediano, este plan **alcanza y sobra**.

### ¿Tengo que instalar algo en mi compu?
Solo Node.js (si querés correr `npx prisma db push` localmente). Si no lo tenés,
podés hacer todo desde la consola web de Turso (pegando el SQL).

### ¿Cómo hago para editar un dato después?
En https://app.turso.tech → tu base → pestaña **SQL** → ejecutás:
```sql
UPDATE User SET email = 'nuevo@email.com' WHERE id = 'xxx';
```

### ¿Funciona el chat en tiempo real (socket.io)?
Igual que con TiDB: socket.io necesita un proceso siempre activo, Vercel no lo soporta.
Para esa función específica, deployar el mini-servicio `mini-services/chat-service/` en Railway.app o Render.com (gratis).

### ¿Qué pasa si supero el plan gratis?
Turso te avisa por email. Podés:
1. Borrar datos viejos para liberar espacio (gratis)
2. Migrar a TiDB (también gratis)
3. Upgradear a Turso Developer ($29/mes, 100 GB)

### ¿Puedo usar varias bases (dev, staging, prod)?
Sí, en el plan gratis tenés 500 bases. Podés crear:
- `umpi-dev` → para pruebas
- `umpi-prod` → producción
Y apuntar cada una con un `DATABASE_URL` distinto en Vercel (por environment).

---

## 📞 Datos que vas a necesitar tener a mano

| Dato | Valor |
|------|-------|
| Turso DB URL | `libsql://umpi-<tu-usuario>.turso.io` |
| Turso Auth Token | `<token-largo-eyJ...>` (NO lo pierdas) |
| Database name | `umpi` (o el que elegiste) |
| Region recomendada | `bue` (Buenos Aires) |
| Admin login app | `admin@umpi.com.ar` / `admin123` |
| URL final deseada | `http://juanumpi.com.mialias.net` |

---

## 🆘 Si algo falla

| Dónde falla | Qué pegarme |
|-------------|-------------|
| `turso db create` o web | Screenshot o error exacto |
| `npx prisma db push` | Output completo del comando |
| Import de SQL en Turso | Mensaje de error |
| Build en Vercel | Deployments → build fallido → Logs → último error |
| App en runtime | Vercel → Deployments → click → Logs → último error |
| Login admin no funciona | SQL: `SELECT email, role FROM User WHERE email='admin@umpi.com.ar';` |
