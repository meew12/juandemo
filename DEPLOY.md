# 🚀 Guía de Despliegue — UMPI Marketplace en GoDaddy cPanel

> **PROBLEMA ACTUAL:** Ves "Forbidden - You don't have permission to access this resource."
> **CAUSA:** Subiste los archivos a `public_html/` pero Next.js **NO es PHP** — necesita un proceso Node.js corriendo. Apache no encuentra `index.php`/`index.html` y devuelve 403.
> **SOLUCIÓN:** Seguir esta guía completa para configurar la app Node.js en cPanel.

---

## ⚠️ REQUISITO CRÍTICO: Tu plan de GoDaddy debe soportar Node.js

Antes de seguir, abrí tu cPanel y buscá el ícono **"Setup Node.js App"** (o "Administrador de Node.js").

| Si VES este ícono... | Si NO lo ves... |
|----------------------|------------------|
| ✅ Tu plan soporta Node.js. Continuá con esta guía. | ❌ Tu plan es solo PHP/MySQL. Opciones: |
| | 1. **Migrar a Vercel** (gratis, 15 min) — ver al final |
| | 2. **Actualizar a VPS de GoDaddy** |
| | 3. **Cambiar a Hostinger** (plan VPS barato) |

> 💡 **Alternativa gratuita y recomendada: Vercel**. Next.js fue creado por Vercel, deployment en 3 clicks. Ver sección al final.

---

## 📋 RESUMEN DEL FLUJO CORRECTO

```
   ┌──────────────────────────────────────────────────────┐
   │  1. Base MySQL creada + datos importados             │  ✅ (ya lo hiciste)
   ├──────────────────────────────────────────────────────┤
   │  2. Crear App Node.js en cPanel (NO subir a public_html) │  ⬅ TE FALTA ESTO
   ├──────────────────────────────────────────────────────┤
   │  3. Subir archivos a la carpeta de la App            │  ⬅ TE FALTA ESTO
   ├──────────────────────────────────────────────────────┤
   │  4. npm install + npm run build (vía cPanel o SSH)   │  ⬅ TE FALTA ESTO
   ├──────────────────────────────────────────────────────┤
   │  5. Configurar .env con tus datos MySQL              │  ⬅ TE FALTA ESTO
   ├──────────────────────────────────────────────────────┤
   │  6. Reiniciar la App desde cPanel                    │  ⬅ TE FALTA ESTO
   └──────────────────────────────────────────────────────┘
```

---

## 🗄️ PARTE 1: Base de Datos (ya lo hiciste ✅)

Tu base `umpidata` ya está creada en GoDaddy y tiene los datos importados desde `umpi_full.sql`. Si todavía no la importaste, hacelo ahora:

1. cPanel → **phpMyAdmin** → seleccioná base `umpidata`
2. Pestaña **Importar** → elegí `umpi_full.sql` (del ZIP `umpi-database.zip`)
3. Click **Continuar**
4. Verificá que veas 20 tablas (User, Listing, Plan, Category, etc.)

**Datos que vas a necesitar después:**
- Host MySQL: `localhost`
- Usuario: `myjuanumpi56`
- Password: `123456789$$aN`
- Base de datos: `umpidata`

---

## 🔧 PARTE 2: Crear la App Node.js en cPanel (PASO CRÍTICO)

Este es el paso que te faltó. **NO subas los archivos a `public_html/` directamente.**

### Paso 2.1 — Abrir el gestor de Node.js

1. Entrá a tu **cPanel** de GoDaddy (`https://tudominio.com:2083`)
2. Buscá la sección **Software** → click en **"Setup Node.js App"** (o "Administrador de Node.js")

### Paso 2.2 — Crear la aplicación

Click en **"Create Application"** y completá:

| Campo | Valor |
|-------|-------|
| **Node.js version** | `20.x` o `22.x` (la más alta disponible) |
| **Application mode** | `Production` |
| **Application root** | `umpi` (carpeta relativa a tu home, ej: `/home/miusuario/umpi`) |
| **Application URL** | `juanumpi.com.mialias.net` (tu dominio) |
| **Application startup file** | `app.js` |
| **Application log file** | `logs/umpi.log` (lo dejá como está) |

3. Click **"Create"** 

> 📝 cPanel crea automáticamente:
> - La carpeta `/home/miusuario/umpi/`
> - Un archivo `.htaccess` en `public_html/` que redirige el tráfico a tu app
> - Un entorno Node.js aislado para tu app

### Paso 2.3 — Limpiar lo que subiste mal antes

Si subiste archivos a `public_html/`, **BORRALOS** (o movelos a otra parte). `public_html/` solo debe tener el `.htaccess` que cPanel acaba de crear automáticamente.

---

## 📤 PARTE 3: Subir los archivos a la carpeta de la App

### Opción A: Vía File Manager de cPanel (más fácil)

1. cPanel → **File Manager**
2. Navegá a la carpeta `/home/miusuario/umpi/` (la que se creó en el paso 2.2)
3. Subí el archivo `umpi-marketplace.zip` ahí
4. Click derecho sobre el ZIP → **Extract**
5. Vas a ver una carpeta `umpi-marketplace/` con todos los archivos dentro
6. **MOVÉ todo el contenido** de `umpi-marketplace/` a la carpeta `umpi/` (un nivel arriba)
7. Borrá la carpeta vacía `umpi-marketplace/` y el ZIP

La estructura final en `/home/miusuario/umpi/` debe ser:
```
umpi/
├── app.js                 ← Punto de entrada Passenger
├── server.js              ← (se genera después del build)
├── .next/                 ← (se genera después del build)
│   └── standalone/
├── public/
│   └── uploads/
├── src/
├── prisma/
│   ├── schema.prisma      ← CAMBIAR a MySQL (ver Paso 5.1)
│   └── schema.mysql.prisma
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
└── .env                   ← (lo creamos en el Paso 5.2)
```

### Opción B: Vía FTP (recomendado para archivos grandes)

Usá FileZilla o WinSCP:
- **Host:** `ftp.tudominio.com` (o la IP del server)
- **Usuario:** tu usuario de cPanel
- **Password:** tu password de cPanel
- **Puerto:** 21

Conectate y subí el contenido a `/home/miusuario/umpi/`.

---

## 🔨 PARTE 4: Instalar dependencias y compilar

### Opción A: Desde la interfaz de cPanel (más fácil)

1. Volvé a **"Setup Node.js App"** en cPanel
2. Al lado de tu app, click en **Edit** (lápiz)
3. En la sección **"Run NPM Install"**, click en el botón → ejecuta `npm install`
4. En el campo **"Run script"**, escribí `build` y click en **"Run script"** → ejecuta `npm run build`
5. Esperá a que termine (puede tardar 2-5 minutos)

### Opción B: Vía SSH (si tenés acceso SSH)

```bash
ssh miusuario@tudominio.com
cd ~/umpi

# Instalar dependencias
npm install

# Generar el cliente Prisma
npx prisma generate

# Compilar para producción
npm run build
```

> ⚠️ Si el build falla por falta de memoria (común en planes baratos), bajá el uso de RAM:
> ```bash
> NODE_OPTIONS="--max-old-space-size=512" npm run build
> ```

### Verificar que el build funcionó

Después del build, deben existir:
- `~/umpi/.next/standalone/server.js` ← el servidor Node.js standalone
- `~/umpi/.next/static/` ← assets JS/CSS
- `~/umpi/public/` ← imágenes, etc.

**Paso crítico:** copiá el standalone al lugar correcto:
```bash
cd ~/umpi
cp -r .next/standalone/. .
# Esto copia server.js y node_modules a la raíz de la app
```

---

## ⚙️ PARTE 5: Configurar variables de entorno

### Paso 5.1 — Cambiar Prisma a MySQL

Por defecto, el proyecto viene con SQLite (para desarrollo local). En producción tenés que usar MySQL:

```bash
cd ~/umpi
cp prisma/schema.mysql.prisma prisma/schema.prisma
```

O desde File Manager: renombrá `schema.mysql.prisma` a `schema.prisma` (sobreescribiendo el existente).

### Paso 5.2 — Crear el archivo `.env`

En la carpeta `~/umpi/`, creá un archivo llamado `.env` (con el punto al inicio) con este contenido:

```env
# Base de datos MySQL (GoDaddy)
DATABASE_URL="mysql://myjuanumpi56:123456789%24%24aN@localhost:3306/umpidata"

# NextAuth (autenticación)
NEXTAUTH_SECRET="3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8="
NEXTAUTH_URL="http://juanumpi.com.mialias.net"

# MercadoPago (placeholder = modo demo, sin cobros reales)
MERCADOPAGO_ACCESS_TOKEN="TEST-umpi-placeholder-replace-with-real-test-token"
MERCADOPAGO_PUBLIC_KEY="TEST-umpi-placeholder-pk"

# Entorno
NODE_ENV="production"
```

> 🔑 **NOTA sobre la contraseña:** Tu password MySQL es `123456789$$aN`. Como está dentro de una URL, los `$$` se codifican como `%24%24`. Por eso aparece como `123456789%24%24aN`. Esto es correcto y necesario.

### Paso 5.3 — Cargar variables en cPanel

IMPORTANTE: Para que Passenger (el gestor de Node.js de cPanel) lea tu `.env`, tenés que cargarlas en la interfaz:

1. **Setup Node.js App** → click en **Edit** (tu app)
2. Buscá la sección **"Environment variables"**
3. Agregá cada variable manualmente:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `mysql://myjuanumpi56:123456789%24%24aN@localhost:3306/umpidata` |
| `NEXTAUTH_SECRET` | `3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8=` |
| `NEXTAUTH_URL` | `http://juanumpi.com.mialias.net` |
| `MERCADOPAGO_ACCESS_TOKEN` | `TEST-umpi-placeholder-replace-with-real-test-token` |
| `MERCADOPAGO_PUBLIC_KEY` | `TEST-umpi-placeholder-pk` |
| `NODE_ENV` | `production` |

4. Click **Save** o **Run** para aplicar.

---

## ▶️ PARTE 6: Reiniciar la App y verificar

1. En **"Setup Node.js App"**, click en **"Restart"** (botón circular ↻)
2. Esperá 5-10 segundos
3. Abrí en el navegador: **http://juanumpi.com.mialias.net**
4. Deberías ver la página principal de UMPI Marketplace

### Si ves error 500 o pantalla en blanco:

- Click en **"View logs"** o abrí `~/umpi/logs/umpi.log` en File Manager
- Buscá el error al final del archivo

**Errores comunes:**

| Error | Solución |
|-------|----------|
| `Cannot find module 'next'` | Ejecutá `npm install` (Paso 4) |
| `Cannot find module '.prisma/client'` | Ejecutá `npx prisma generate` |
| `Database connection refused` | Verificá credenciales MySQL en `.env` |
| `JWEDecryptionFailed` | Verificá que `NEXTAUTH_SECRET` esté cargado en cPanel |
| `EADDRINUSE` | Click en **Restart** de la app |
| `404 en /uploads/...` | Creá carpeta `public/uploads/` con permisos 755 |

---

## 🆘 SOLUCIÓN AL ERROR "Forbidden" (lo que te pasó)

El error 403 Forbidden que ves ahora ocurre porque subiste los archivos a `public_html/` directamente. Apache no sabe qué hacer con código Node.js — solo sirve archivos estáticos (HTML, PHP, imágenes).

### Fix inmediato:

1. **Borrá todo lo que subiste a `public_html/`** (excepto el `.htaccess` que creó cPanel automáticamente al hacer el Paso 2)
2. Seguí los pasos 2 a 6 de esta guía
3. La estructura correcta es:
   - `public_html/` → solo contiene `.htaccess` (creado por cPanel)
   - `/home/miusuario/umpi/` → contiene TODO el código de la app

### ¿Cómo funciona?

```
   Navegador ──HTTP──> Apache (public_html/.htaccess)
                            │
                            └──redirige──> Passenger
                                              │
                                              └──ejecuta──> Node.js (app.js → server.js)
                                                                │
                                                                └──consulta──> MySQL (umpidata)
```

Passenger mantiene el proceso Node.js vivo y Apache le redirige el tráfico. Sin esto, Apache solo ve archivos sueltos y no sabe ejecutarlos.

---

## 🌐 ALTERNATIVA: Vercel (gratis, más fácil)

Si cPanel te resulta complicado o tu plan no soporta Node.js, **Vercel** es la mejor opción para Next.js:

1. Creá cuenta en https://vercel.com (podés entrar con GitHub/Google)
2. Subí el proyecto a un repo de GitHub (arrastrando los archivos a https://github.com/new)
3. En Vercel: **Add New → Project → Import** tu repo
4. En **"Environment Variables"**, agregá:
   ```
   DATABASE_URL = mysql://myjuanumpi56:123456789%24%24aN@<IP-DE-GODADDY>:3306/umpidata
   NEXTAUTH_SECRET = 3WL0unwbzE9gHHHnqzyfmC+RqhSfuKzRE4IftsNThK8=
   NEXTAUTH_URL = https://umpi.vercel.app  (la URL que te dé Vercel)
   MERCADOPAGO_ACCESS_TOKEN = TEST-umpi-placeholder-replace-with-real-test-token
   MERCADOPAGO_PUBLIC_KEY = TEST-umpi-placeholder-pk
   ```
5. Antes del deploy: en tu repo, reemplazá `prisma/schema.prisma` con el contenido de `prisma/schema.mysql.prisma`
6. **Deploy** → Vercel compila automáticamente
7. Para conectar tu dominio de GoDaddy: **Settings → Domains → Add** → `juanumpi.com.mialias.net`

> ⚠️ Para que Vercel se conecte a MySQL de GoDaddy:
> - En cPanel → **Remote MySQL** → agregá `%` (permitir todas las IPs) o los rangos de IP de Vercel
> - En `DATABASE_URL`, reemplazá `localhost` por la **IP pública** del servidor MySQL de GoDaddy (la encontrás en cPanel → Server Information)

---

## 💳 Configurar MercadoPago (cuando esté online)

1. Entrá a https://www.mercadopago.com.ar/developers/panel
2. Creá una aplicación
3. Copiá **Access Token** y **Public Key**
4. En tu sitio (ya deployado), entrá como admin:
   - Email: `admin@umpi.com.ar`
   - Password: `admin123`
5. **Panel Admin → MercadoPago** → pegá las credenciales → **Guardar**
6. Click **Validar token**

> Mientras no lo configures, el sistema funciona en **modo demo**: las compras se simulan sin cobrar de verdad.

---

## 🔒 Checklist de seguridad

- [ ] Cambiar password del admin (`admin123` es solo de prueba)
- [ ] Generar un NEXTAUTH_SECRET nuevo (en SSH: `openssl rand -base64 32`)
- [ ] Instalar certificado SSL (cPanel → SSL/TLS → Let's Encrypt gratis)
- [ ] Actualizar `NEXTAUTH_URL` a `https://...` después de instalar SSL
- [ ] Backups automáticos de MySQL (cPanel → Backups)
- [ ] Cambiar tokens de MercadoPago de `TEST-` a producción cuando vendas de verdad
- [ ] Permisos correctos en `public/uploads/` (755 o 775)

---

## 📞 Datos de acceso de prueba

| Rol | Email | Password |
|-----|-------|----------|
| 👑 Admin | `admin@umpi.com.ar` | `admin123` |
| 👤 Usuario | `pepedemo@gmail.com` | `demo123` |

**⚠️ Cambiá la contraseña del admin inmediatamente después del primer login.**
