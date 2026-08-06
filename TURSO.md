# 🌐 Despliegue en Vercel + Turso — UMPI Marketplace (SIMPLE)

> **¿Por qué esta guía es la más simple?**
> Porque configuré el proyecto para que **Vercel cree las tablas Y cargue los datos
> automáticamente durante el build**. Vos solo ponés el token de Turso y deployas.

---

## 🎯 Flujo simplificado (10 minutos)

```
   ┌──────────────────────────────────────────────────┐
   │ 1. Crear base en Turso (web) — copiar URL+token  │  ⬅ 3 min
   ├──────────────────────────────────────────────────┤
   │ 2. Subir código a GitHub                         │  ⬅ 4 min
   ├──────────────────────────────────────────────────┤
   │ 3. Importar en Vercel + pegar DATABASE_URL       │  ⬅ 2 min
   ├──────────────────────────────────────────────────┤
   │ 4. Deploy → Vercel crea tablas + carga datos     │  ⬅ 3 min (automático)
   ├──────────────────────────────────────────────────┤
   │ 5. ¡Listo! Tu app está online con datos          │  ✅
   └──────────────────────────────────────────────────┘
```

> **NO necesitás instalar:**
> - ❌ Turso CLI
> - ❌ Node.js en tu compu
> - ❌ Ejecutar `prisma db push` manualmente
> - ❌ Pegar SQL en la consola de Turso
>
> **Todo lo hace Vercel automáticamente durante el build.**

---

## 🗄️ PASO 1: Crear base en Turso (3 min)

### 1.1 — Crear cuenta

1. Andá a https://turso.tech → click **"Start free"**
2. Registráte con GitHub, Google o email

### 1.2 — Crear la base de datos

1. Después de loguearte, vas a https://app.turso.tech
2. Click en **"New Database"**
3. Completá:
   - **Name:** `umpi`
   - **Location:** `bue` (Buenos Aires — recomendado) o cualquier otra
   - **Type:** Free
4. Click **"Create"**

### 1.3 — Conseguir URL y token

1. Hacé click en tu base **`umpi`**
2. Vas a ver:
   - **Database URL:** `libsql://umpi-TU-USUARIO.turso.io`
   - **Auth Token:** click en "Create auth token" → copia el string largo `eyJ...`

3. **Combiná los dos en una sola URL** (pegá el token después de `?authToken=`):
   ```
   libsql://umpi-TU-USUARIO.turso.io?authToken=eyJhbGciOiJFZERTQSIs...
   ```

4. **Anotá esta URL completa** — es la única variable que necesitás.

---

## 📤 PASO 2: Subir código a GitHub (4 min)

### 2.1 — Crear cuenta de GitHub (si no tenés)

https://github.com/signup — gratis, 1 minuto.

### 2.2 — Crear repositorio

1. https://github.com/new
2. **Repository name:** `umpi-marketplace`
3. **Visibility:** Private (recomendado)
4. ✅ Marcá "Add a README file"
5. Click **Create repository**

### 2.3 — Subir archivos

1. Descargá el ZIP **`umpi-marketplace.zip`** (23 MB) desde el preview → `/downloads/umpi-marketplace.zip`
2. Descomprimilo en una carpeta en tu compu
3. **NO cambiés nada** — el schema ya está en SQLite (perfecto para Turso) ✅
4. En GitHub → tu repo → click **"uploading an existing file"**
5. Arrastrá **TODOS** los archivos y carpetas
6. Esperá a que suban (1-2 min)
7. **Commit message:** "Initial commit" → click **Commit changes**

> ⚠️ **NO subas** estos archivos:
> - `node_modules/` (Vercel lo instala solo)
> - `.next/` (Vercel lo genera solo)
> - `.env` (las variables van directo en Vercel)
> - `db/*.db` (bases SQLite locales)
> - `dev.log`, `server.log`

---

## 🚀 PASO 3: Importar en Vercel + configurar (2 min)

### 3.1 — Importar repo

1. https://vercel.com → **Sign Up** / **Log In** (podés entrar con GitHub)
2. Click **"Add New..." → "Project"**
3. Buscá tu repo `umpi-marketplace` → click **"Import"**
4. Vercel detecta Next.js automáticamente (no toques nada en Build Settings)

### 3.2 — Configurar variables de entorno

En la misma página, desplegá **"Environment Variables"** y agregá estas 6:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `libsql://umpi-TU-USUARIO.turso.io?authToken=TU-TOKEN` |
| `NEXTAUTH_SECRET` | `3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8=` |
| `NEXTAUTH_URL` | `https://umpi.vercel.app` (cambiala después por tu dominio) |
| `MERCADOPAGO_ACCESS_TOKEN` | `TEST-umpi-placeholder-replace-with-real-test-token` |
| `MERCADOPAGO_PUBLIC_KEY` | `TEST-umpi-placeholder-pk` |
| `NODE_ENV` | `production` |

> 🔑 En `DATABASE_URL`, reemplazá `TU-USUARIO` y `TU-TOKEN` por los valores reales de Turso.
>
> Ejemplo:
> ```
> libsql://umpi-juanperez.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnc...
> ```

> ⚠️ **IMPORTANTE:** Asegurate de que las variables estén disponibles en **Build time** (no solo Runtime).
> En Vercel, por defecto las variables están disponibles en ambos. Si ves un checkbox
> "Available at Build Time" → dejalo marcado.

### 3.3 — Deploy

Click en el botón azul **"Deploy"** (abajo de todo).

---

## ⚙️ PASO 4: ¿Qué hace Vercel automáticamente? (3 min)

Durante el build, Vercel ejecuta esto en orden (gracias a los scripts que configuré):

```
1. npm install          → instala dependencias
2. postinstall          → ejecuta "prisma generate" (genera el cliente Prisma)
3. build:
   a. prisma generate   → regenera el cliente (por las dudas)
   b. prisma db push    → CREA LAS 20 TABLAS en Turso automáticamente
   c. npm run seed      → CARGA LOS 299 REGISTROS en Turso automáticamente
   d. next build        → compila la app Next.js
4. Deploy a CDN global  → tu app está online
```

> 🎉 **No tenés que hacer nada manual.** Todo se ejecuta solo.
>
> Si los datos ya existen (por ejemplo, en un redeploy), el script detecta que
> hay 16 usuarios y NO vuelve a cargar nada (es idempotente).

---

## ✅ PASO 5: Verificar que todo funcionó

1. Cuando el deploy termine (3-5 min), vas a ver confeti 🎉
2. Click en **"Visit"** → tu app carga en `https://umpi-marketplace-xxxxx.vercel.app`
3. Probá loguearte como admin:
   - Email: `admin@umpi.com.ar`
   - Password: `admin123`
4. Andá al **Panel Admin** → deberías ver:
   - 16 usuarios ✅
   - 33 publicaciones ✅
   - 27 categorías ✅
   - 3 planes ✅

### Si los datos no se cargaron (caso alternativo)

Si por algún motivo el build no cargó los datos (por ejemplo, si DATABASE_URL
no estaba disponible en build time), podés cargarlos manualmente:

1. Abrí en el navegador:
   ```
   https://TU-URL-DE-VERCEL.vercel.app/api/setup
   ```
2. Vas a ver un JSON con el resultado:
   ```json
   {
     "status": "success",
     "message": "299 statements ejecutados, 0 errores",
     "stats": {
       "User": 16,
       "Listing": 33,
       "Plan": 3,
       "Category": 27,
       "Review": 100
     }
   }
   ```
3. ✅ Datos cargados. Recargá la app y debería funcionar.

> Si ya estaba cargada, vas a ver:
> ```json
> {"status":"already_seeded","message":"La base ya tiene 16 usuarios..."}
> ```

---

## 🚨 CARGA PARCIAL DETECTADA (después de arreglar el 401)

Si después de arreglar el token, `/api/setup` te devuelve algo como:

```json
{"status":"partial","message":"18 statements ejecutados, 11 errores",
 "stats":{"User":16,"Listing":0,"Plan":0,"Category":0,...},
 "errors":["Stmt 4: ...table Category has no column named type",
           "Stmt 6: ...table Plan has no column named description", ...]}
```

Y el login te dice "usuario o contraseña incorrecto" y el registro falla con 500...

**Causa:** Las tablas se crearon con un schema viejo (faltan columnas como `type` en Category, `description` en Plan, etc.). Los usuarios se cargaron pero las publicaciones, planes y categorías no.

### Solución (2 pasos)

**Paso 1: Actualizá el código en GitHub**

   Descargá el ZIP nuevo del **Preview Panel → `/downloads/umpi-marketplace.zip`** y subí los archivos a GitHub (reemplazando los viejos).

   > ⚠️ IMPORTANTE: Necesitás el código nuevo porque tiene el schema correcto + la función de force-reset.

**Paso 2: Forzar reset de la DB**

   Esperá a que Vercel redeploye (1-2 min) y abrí en el navegador:

   ```
   https://TU-URL.vercel.app/api/setup?force=1
   ```

   Esto:
   1. Borra TODAS las tablas viejas con schema desactualizado
   2. Las recrea con el schema correcto (todas las columnas)
   3. Carga los 299 registros (16 usuarios, 33 publicaciones, 3 planes, 27 categorías)

   Vas a ver un JSON así:

   ```json
   {"status":"success","message":"29 statements ejecutados, 0 errores",
    "stats":{"User":16,"Listing":33,"Plan":3,"Category":27,...}}
   ```

**Paso 3: Verificar**

   - Abrí `https://TU-URL.vercel.app/api/diagnostico` → debe decir ✅ todo verde
   - Abrí `https://TU-URL.vercel.app/` → la home debe cargar con publicaciones
   - Probá loguearte: `admin@umpi.com.ar` / `admin123` → debe funcionar ✅

---

## 🚨 ERROR HTTP 401 (el más común)

Si al abrir tu deploy en Vercel ves:
- Pantalla que no carga datos (vacia)
- Login/registro que NO funciona
- `/api/setup` devuelve `"Server returned HTTP status 401"`
- Mensaje `"No autenticado"` en cualquier endpoint

**Causa casi segura:** Tu `DATABASE_URL` en Vercel NO tiene el `?authToken=xxx`.

### Cómo diagnosticarlo (1 click)

Abrí en el navegador:
```
https://TU-URL.vercel.app/api/diagnostico
```

Te va a mostrar una página clara con:
- ✅/❌ Estado de cada variable de entorno
- ✅/❌ Si la conexión a Turso funciona
- 📋 El formato correcto de DATABASE_URL
- 📋 Pasos exactos para arreglarlo

### Cómo arreglarlo (2 minutos)

**1. Conseguir tu token de Turso**

   a. Andá a https://app.turso.com/app/tatabases
   b. Hacé clic en tu base de datos (ej: `umpi-softw`)
   c. Andá a la pestaña **Settings** → **Tokens**
   d. Click **Create Token** → copiá el string largo que empieza con `eyJ...`

**2. Actualizar variable en Vercel**

   a. Andá a https://vercel.com → tu proyecto → **Settings** → **Environment Variables**
   b. Buscá la variable `DATABASE_URL`
   c. Editá su valor. Tiene que quedar así:

   ```
   libsql://umpi-softw.aws-us-west-2.turso.io?authToken=eyJ...TU_TOKEN_AQUI
   ```

   > ⚠️ **MUY IMPORTANTE:** Entre la URL y `?authToken=` NO tiene que haber espacios.

   d. Click **Save**
   e. Andá a **Deployments** → ⋮ del último deploy → **Redeploy**

**3. Verificar**

Esperá 1-2 min y abrí:
```
https://TU-URL.vercel.app/api/diagnostico
```

Debería decir ✅ "Conexión exitosa" + cantidad de usuarios.

Después abrí:
```
https://TU-URL.vercel.app/api/setup
```

Va a crear las tablas y cargar los 299 registros.

### Alternativa: variable separada

Si preferís no tocar DATABASE_URL, podés agregar otra variable:

| Name | Value |
|------|-------|
| `TURSO_AUTH_TOKEN` | `eyJ...TU_TOKEN_AQUI` |

Y dejar `DATABASE_URL` solo con la URL (sin `?authToken=`).

---

## 🆘 Si el deploy falla

### Error más común: Build fallido

En Vercel → **Deployments** → click en el deploy fallido → **"Build Logs"**

| Error | Causa | Solución |
|-------|-------|----------|
| `Environment variable "DATABASE_URL" not found` | No configuraste la variable en Vercel | Settings → Environment Variables → agregarla |
| `Can't reach database server` | URL de Turso mal copiada | Verificá que tenga `?authToken=` |
| `Authentication failed` | Token incorrecto | Generá un token nuevo en Turso |
| `prisma db push failed` | No hay conexión a Turso | Verificá DATABASE_URL en Vercel |
| `Error reading database/umpi_turso.sql` | El archivo no está en GitHub | Verificá que subiste la carpeta `database/` al repo |
| `Module not found: @prisma/adapter-libsql` | Falta paquete | Ya está en package.json, Vercel lo instala. Si falla, hacé un nuevo commit |

### Error en runtime (pantalla en blanco o 500)

1. Vercel → tu proyecto → pestaña **"Logs"** (no "Build Logs", sino "Runtime Logs")
2. Buscá el error más reciente

| Error | Solución |
|-------|----------|
| `PrismaClientInitializationError` | DATABASE_URL mal configurada en Runtime |
| `Unknown table: User` | Visitá `/api/setup` para crear las tablas |
| `JWEDecryptionFailed` | NEXTAUTH_SECRET no configurada |

### Si no sabés qué error es

Decime:
1. ¿Qué URL intentaste abrir?
2. ¿Qué ves? (pantalla en blanco, error 500, error 404, mensaje de error)
3. Copiame el último error del log de Vercel (Deployments → click → Logs)

---

## 🌐 PASO 6 (Opcional): Conectar tu dominio `juanumpi.com.mialias.net`

1. Vercel → **Settings → Domains → Add** → `juanumpi.com.mialias.net`
2. Vercel muestra: `CNAME → cname.vercel-dns.com`
3. En cdmon → **DNS / Zone Editor**:
   - Borrrá el registro A existente para `juanumpi`
   - Agregá CNAME: `juanumpi` → `cname.vercel-dns.com`
4. Esperá propagación DNS (5 min - 2 hs)
5. En Vercel → Settings → Environment Variables → editá `NEXTAUTH_URL`:
   ```
   https://juanumpi.com.mialias.net
   ```
6. Deployments → ⋮ → **Redeploy**

---

## 💳 Configurar MercadoPago (después del deploy)

1. https://www.mercadopago.com.ar/developers/panel → creá una app
2. URLs de retorno: `https://juanumpi.com.mialias.net/dashboard/subscriptions`
3. Copiá Access Token y Public Key (`TEST-...`)
4. En tu sitio → login admin → **Panel Admin → MercadoPago** → pegá credenciales → Guardar
5. Click **Validar token**

> Mientras tanto, modo demo: las compras se simulan sin cobrar.

---

## ❓ Preguntas frecuentes

### "¿Solo con poner el token anda?"
**SÍ.** Configuré el proyecto para que durante el build de Vercel:
- Se creen las 20 tablas automáticamente (`prisma db push`)
- Se carguen los 299 registros automáticamente (`npm run seed`)

Vos solo ponés el `DATABASE_URL` con el token y deployas. Todo lo demás es automático.

### "¿Por qué mi deploy anterior no se veía?"
Probablemente porque:
1. Faltaban variables de entorno (NEXTAUTH_SECRET, etc.)
2. Las tablas no existían en Turso (no había `prisma db push` en el build)
3. Los datos no estaban cargados (no había `seed` en el build)

Esta nueva versión del código **resuelve los 3 problemas** automáticamente.

### "¿Necesito instalar algo en mi compu?"
**NO.** Todo se hace desde el navegador:
- GitHub web para subir archivos
- Vercel web para deployar
- Turso web para crear la base

### "¿Qué pasa si hago un nuevo deploy?"
El script de seed detecta si ya hay datos (16 usuarios) y **NO los vuelve a cargar**.
Así que podés hacer redéploys sin perder datos nuevos que hayas creado.

### "¿Puedo forzar re-cargar los datos?"
Sí. En Turso web → SQL Editor → ejecutá:
```sql
DELETE FROM User;
```
Y luego visitá `https://tu-url.vercel.app/api/setup` → se vuelven a cargar todos los datos.

### "¿Funciona el chat en tiempo real?"
Socket.io necesita un proceso siempre activo, Vercel no lo soporta.
Para esa función, deployar el mini-servicio en Railway.app o Render.com (gratis).

---

## 📞 Datos que vas a necesitar

| Dato | Valor |
|------|-------|
| Turso DB URL | `libsql://umpi-TU-USUARIO.turso.io` |
| Turso Auth Token | `eyJ...` (string largo) |
| Admin login app | `admin@umpi.com.ar` / `admin123` |
| URL final deseada | `http://juanumpi.com.mialias.net` |

---

## 🆘 Soporte

Si algo falla, decime:
1. URL de tu deploy en Vercel
2. Qué ves al abrirlo (pantalla en blanco, error, etc.)
3. Último error del log de Vercel

Con eso te puedo decir exactamente qué arreglar. 🚀
