# 🌐 Despliegue en Vercel — UMPI Marketplace

> **¿Por qué Vercel?** Es del mismo creador que Next.js. Subís los archivos a GitHub,
> Vercel detecta el proyecto, lo compila y lo despliega **automáticamente**.
> No necesitás `app.js`, ni `.htaccess`, ni configurar Passenger. Cero complicaciones.

---

## 📋 Resumen del flujo (15 minutos)

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. Habilitar Remote MySQL en GoDaddy cPanel            │  ⬅ permite que Vercel se conecte
   ├────────────────────────────────────────────────────────┤
   │ 2. Conseguir la IP pública del server MySQL            │  ⬅ para usarla en DATABASE_URL
   ├────────────────────────────────────────────────────────┤
   │ 3. Subir código a GitHub                               │  ⬅ arrastrás archivos a la web
   ├────────────────────────────────────────────────────────┤
   │ 4. Importar repo en Vercel                             │  ⬅ 3 clicks
   ├────────────────────────────────────────────────────────┤
   │ 5. Configurar variables de entorno                     │  ⬅ pegar 6 valores
   ├────────────────────────────────────────────────────────┤
   │ 6. Deploy automático (3 min)                           │  ⬅ solo esperar
   ├────────────────────────────────────────────────────────┤
   │ 7. Conectar tu dominio juanumpi.com.mialias.net        │  ⬅ opcional
   └────────────────────────────────────────────────────────┘
```

---

## 🗄️ PASO 1: Habilitar Remote MySQL en GoDaddy

Por defecto, MySQL de cPanel solo acepta conexiones desde `localhost`. Para que Vercel pueda conectarse desde sus servidores en la nube, tenés que habilitar acceso remoto:

1. Entrá a tu **cPanel** de GoDaddy
2. Buscá la sección **Bases de datos → Remote MySQL** (o "MySQL remoto")
3. En **"Add Access Host"** escribí: `%`
   - El `%` significa "permitir cualquier IP" — necesario porque Vercel usa IPs dinámicas
4. Click **Add Host**
5. ✅ Vas a ver `%` en la lista de hosts permitidos

> 🔒 **¿Es seguro?** Sí, mientras tu contraseña MySQL sea fuerte. La alternativa es listar
> las IPs de Vercel una por una, pero cambian seguido y rompe la conexión.

---

## 🔍 PASO 2: Conseguir la IP pública del server MySQL

Necesitás la IP del servidor MySQL de GoDaddy (para reemplazar `localhost` en tu connection string).

### Cómo encontrarla:

1. En cPanel, andá a **Server Information** (o "Información del servidor")
2. Buscá el campo **"Shared IP Address"** o **"IP Address"**
3. Anotá esa IP — es la IP pública de tu servidor
4. Probablemente sea algo como `107.180.XX.XX` o `160.153.XX.XX`

### Alternativa: si tu dominio ya apunta a GoDaddy:

```bash
# En tu computadora, abrí una terminal y ejecutá:
ping juanumpi.com.mialias.net
# o
nslookup juanumpi.com.mialias.net
```

La IP que aparece es la del servidor de GoDaddy (la misma que la de MySQL).

> ⚠️ **Anotá esa IP** — la vas a necesitar en el PASO 5.

---

## 📤 PASO 3: Subir el código a GitHub

### Si NO tenés cuenta de GitHub:
1. Creá una gratis en https://github.com/signup (1 minuto, solo email y password)

### Crear el repositorio:

1. Andá a https://github.com/new
2. **Repository name:** `umpi-marketplace`
3. **Private** (recomendado) o Public
4. ✅ Marcá **"Add a README file"** (opcional)
5. Click **Create repository**

### Subir los archivos:

1. Descargá el ZIP **`umpi-marketplace.zip`** (23 MB) desde el preview → `/downloads/umpi-marketplace.zip`
2. Descomprimilo en una carpeta en tu compu
3. **ANTES DE SUBIR**, hacé este cambio crítico:
   - Entrá en la carpeta `prisma/`
   - Borrá el archivo `schema.prisma` (el que dice SQLite)
   - Renombrá `schema.mysql.prisma` → `schema.prisma`
   - Ahora el schema principal usa MySQL ✅
4. En GitHub, en tu repo recién creado:
   - Click en **"uploading an existing file"** (link arriba de la lista de archivos)
   - Arrastrá **TODOS los archivos y carpetas** del ZIP descomprimido
   - Esperá a que suban todos (puede tardar 1-2 min por la cantidad)
   - Abajo: **Commit changes** → mensaje: "Initial commit" → click **Commit changes**

> ⚠️ **NO subas** estos archivos (ya están excluidos del ZIP pero por las dudas):
> - `node_modules/` (se genera solo en Vercel)
> - `.next/` (se genera solo en Vercel)
> - `.env` (las variables van directamente en Vercel, NO en GitHub por seguridad)
> - `*.db` (bases SQLite locales)
> - `dev.log`, `server.log`

### Verificar que el archivo `prisma/schema.prisma` diga MySQL:

Abrí el archivo en GitHub (click sobre él). Las primeras líneas deben decir:

```prisma
datasource db {
  provider = "mysql"     ← DEBE decir mysql
  url      = env("DATABASE_URL")
}
```

Si dice `sqlite`, repetí el cambio del Paso 3 (borrar y renombrar).

---

## 🚀 PASO 4: Importar el repo en Vercel

1. Andá a https://vercel.com → **Sign Up** / **Log In** (podés entrar con GitHub)
2. Click en **"Add New..." → "Project"**
3. En la lista, buscá tu repo `umpi-marketplace` → click **"Import"**
4. Vercel detecta automáticamente que es Next.js (no tenés que configurar nada):
   - **Framework Preset:** Next.js (automático)
   - **Build Command:** `next build` (automático)
   - **Output Directory:** `.next` (automático)
   - **Install Command:** `npm install` (automático)

> No toques nada en la sección "Build and Output Settings" — Vercel hace todo solo.

5. **NO hagas click en Deploy todavía** — primero configurá las variables (Paso 5)

---

## ⚙️ PASO 5: Configurar variables de entorno

En la misma página de "Configure Project", desplegá la sección **"Environment Variables"**.

Agregá **una por una** estas 6 variables (click en "Add" después de cada una):

| Name | Value |
|------|-------|
| `DATABASE_URL` | `mysql://myjuanumpi56:123456789%24%24aN@<IP-GODADDY>:3306/umpidata` |
| `NEXTAUTH_SECRET` | `3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8=` |
| `NEXTAUTH_URL` | `https://umpi.vercel.app` *(cambiala después por tu dominio)* |
| `MERCADOPAGO_ACCESS_TOKEN` | `TEST-umpi-placeholder-replace-with-real-test-token` |
| `MERCADOPAGO_PUBLIC_KEY` | `TEST-umpi-placeholder-pk` |
| `NODE_ENV` | `production` |

> 🔑 **IMPORTANTE — Reemplazá `<IP-GODADDY>`** por la IP pública que conseguiste en el PASO 2.
>
> Ejemplo: si la IP es `107.180.50.28`, tu DATABASE_URL quedaría:
> ```
> mysql://myjuanumpi56:123456789%24%24aN@107.180.50.28:3306/umpidata
> ```
>
> ⚠️ **NOTA sobre la contraseña:** Tu password MySQL es `123456789$$aN`. Los `$$` se
> codifican como `%24%24` dentro de una URL. Por eso aparece como `123456789%24%24aN`.
> Esto es correcto y necesario — no lo cambies.

### Para NEXTAUTH_URL:
- Al principio usá la URL que te dé Vercel (algo como `https://umpi-marketplace-xxxxx.vercel.app`)
- Después de conectar tu dominio (Paso 7), volvés y la cambiás a `https://juanumpi.com.mialias.net`

---

## ▶️ PASO 6: Deploy

1. Click en el botón azul **"Deploy"** (abajo de todo)
2. Esperá 2-5 minutos mientras Vercel:
   - Instala dependencias (`npm install`)
   - Genera el cliente Prisma automáticamente (detecta el `postinstall` hook)
   - Compila el proyecto (`npm run build`)
   - Despliega a sus servidores globales (CDN)
3. Cuando termine vas a ver confeti 🎉 y un botón **"Visit"**
4. Click **Visit** → tu app está online en `https://umpi-marketplace-xxxxx.vercel.app`

### Posibles errores en el deploy:

| Error | Solución |
|-------|----------|
| `PrismaClientInitializationError` | La IP de GoDaddy está mal, o Remote MySQL no está habilitado (Paso 1) |
| `JWEDecryptionFailed` | Faltó agregar `NEXTAUTH_SECRET` en variables de entorno |
| `Can't reach database server` | Remote MySQL no está habilitado, o la IP pública es incorrecta |
| `Build failed: out of memory` | Raro en Vercel free, pero si pasa, contactá soporte Vercel |

> 💡 Si te aparece **"Build completed but with errors"**, click en **"Logs"** en la
> sección de build para ver el detalle del error. Copiá el último error y decímelo.

---

## 🌐 PASO 7: Conectar tu dominio `juanumpi.com.mialias.net`

### En Vercel:

1. Entrá a tu proyecto → pestaña **"Settings"** → **"Domains"**
2. Escribí `juanumpi.com.mialias.net` → click **"Add"**
3. Vercel te va a mostrar algo así:
   ```
   Add the following records to your DNS:
   ─────────────────────────────────────
   Type: CNAME
   Name: @  (o vacío)
   Value: cname.vercel-dns.com
   ```
4. Anotá esos valores (CNAME → `cname.vercel-dns.com`)

### En GoDaddy (cambiar DNS):

1. cPanel → **Domains → Zone Editor** (o "Advanced DNS" en GoDaddy domain manager)
2. Buscá el registro existente para `juanumpi.com.mialias.net` (probablemente un A record)
3. **Editá o agregá un registro CNAME:**
   - **Name/Alias:** `juanumpi` (o el subdominio que corresponda)
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** Default
4. Guardá los cambios

> ⏳ La propagación DNS puede tardar de **5 minutos a 2 horas**. Podés verificar el estado
> en https://dnschecker.org poniendo `juanumpi.com.mialias.net`.

### En Vercel (después de la propagación):

1. Volvé a **Settings → Domains**
2. Cuando Vercel detecte que el DNS apunta correctamente, va a mostrar ✅ verde
3. **IMPORTANTE:** actualizá la variable `NEXTAUTH_URL` en Vercel:
   - Settings → Environment Variables → editá `NEXTAUTH_URL`
   - Cambiá a: `https://juanumpi.com.mialias.net`
   - Click Save
4. Hacé un **Redeploy** (Deployments → click en los 3 puntos → Redeploy)

---

## 💳 Configurar MercadoPago (después del deploy)

1. Entrá a https://www.mercadopago.com.ar/developers/panel
2. Creá una aplicación
3. En la configuración de la app, agregá tu URL de retorno:
   - **Success URL:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - **Failure URL:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - **Pending URL:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
4. Copiá el **Access Token** y la **Public Key** (las de TEST- para pruebas)
5. En tu sitio, entrá como admin:
   - Email: `admin@umpi.com.ar`
   - Password: `admin123`
6. **Panel Admin → MercadoPago** → pegá las credenciales → **Guardar**
7. Click **Validar token**

> Mientras tanto, el sistema funciona en **modo demo**: las compras se simulan sin cobrar.

---

## 🔒 Checklist final

- [ ] Remote MySQL habilitado en GoDaddy (`%`)
- [ ] Código subido a GitHub con `schema.prisma` en MySQL
- [ ] 6 variables de entorno configuradas en Vercel
- [ ] Deploy exitoso (verde en Vercel)
- [ ] Dominio `juanumpi.com.mialias.net` apuntando a Vercel
- [ ] `NEXTAUTH_URL` actualizada al dominio final
- [ ] Cambiar password del admin (`admin123` → una segura)
- [ ] Configurar MercadoPago cuando estés listo

---

## ❓ Preguntas frecuentes

### ¿Vercel es gratis?
Sí, el plan **Hobby** es gratis para proyectos personales. Incluye:
- 100 GB de bandwidth/mes
- 100 GB de build time/mes
- Deploy automático en cada push a GitHub
- Certificado SSL gratuito automático (HTTPS)

### ¿Y si mi sitio crece mucho?
Si llegás a tener mucho tráfico (>100k visitas/mes), el plan **Pro** es USD 20/mes. Para un marketplace pequeño/mediano, el plan gratis alcanza.

### ¿La base de datos también está en Vercel?
**No** — Vercel no tiene MySQL. Tu BD sigue en GoDaddy (por eso habilitamos Remote MySQL). Vercel solo hospeda la app Next.js, y se conecta por red a tu MySQL de GoDaddy.

### ¿Qué pasa si GoDaddy se cae?
Tu BD no estaría disponible, y la app mostraría errores. Si querés más confiabilidad, podés migrar la BD a PlanetScale (gratis hasta 5GB) o a TiDB Cloud. Pero para empezar, GoDaddy está bien.

### ¿Puedo editar el código después?
Sí — cada vez que hagas un cambio en GitHub (commit), Vercel **re-despliega automáticamente** en 2-3 minutos. No tenés que hacer nada manual.

### ¿Cómo subo imágenes (uploads)?
Vercel tiene un filesystem **efímero** — los archivos subidos se borran en cada deploy. Para producción real, necesitás un servicio de almacenamiento (S3 de AWS, Cloudinary, Vercel Blob, etc.). Mientras tanto, las imágenes subidas funcionan, pero se pierden si Vercel reinicia el server.

> 💡 Si querés que configure Vercel Blob o Cloudinary para uploads persistentes, decímelo.

---

## 📞 Datos que ya tenés configurados

| Variable | Valor |
|----------|-------|
| Usuario MySQL GoDaddy | `myjuanumpi56` |
| Password MySQL GoDaddy | `123456789$$aN` (URL-encoded: `123456789%24%24aN`) |
| Base de datos | `umpidata` |
| URL final deseada | `http://juanumpi.com.mialias.net` |
| Admin login | `admin@umpi.com.ar` / `admin123` |
| GitHub repo name sugerido | `umpi-marketplace` |

**El único dato que te falta conseguir:**
- ❓ **IP pública de tu server GoDaddy** (Paso 2)
