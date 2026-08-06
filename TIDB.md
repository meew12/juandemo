# 🌐 Despliegue en Vercel + TiDB Cloud — UMPI Marketplace

> **¿Por qué TiDB?** Es 100% compatible con MySQL, así que **no cambiás nada del código**.
> Solo cambiás el `DATABASE_URL`. Plan gratis de 5 GB (suficiente para arrancar).
>
> cdmon gratuito no permite acceso MySQL remoto, por eso necesitamos TiDB para que
> Vercel pueda conectarse a una base de datos.

---

## 📋 Resumen del flujo (20 minutos)

```
   ┌─────────────────────────────────────────────────────┐
   │ 1. Crear cuenta y cluster en TiDB Cloud             │  ⬅ 5 min
   ├─────────────────────────────────────────────────────┤
   │ 2. Importar datos a TiDB (con umpi_tidb.sql)        │  ⬅ 5 min
   ├─────────────────────────────────────────────────────┤
   │ 3. Subir código a GitHub                            │  ⬅ 5 min
   ├─────────────────────────────────────────────────────┤
   │ 4. Importar repo en Vercel                          │  ⬅ 1 min
   ├─────────────────────────────────────────────────────┤
   │ 5. Configurar variables de entorno (DATABASE_URL TiDB) │  ⬅ 3 min
   ├─────────────────────────────────────────────────────┤
   │ 6. Deploy automático                                │  ⬅ 3 min
   ├─────────────────────────────────────────────────────┤
   │ 7. (Opcional) Conectar dominio juanumpi.com.mialias.net │  ⬅ 5 min
   └─────────────────────────────────────────────────────┘
```

---

## 🗄️ PASO 1: Crear cluster en TiDB Cloud (gratis)

### 1.1 — Crear cuenta

1. Andá a https://tidbcloud.com → click **"Sign up"** (o "Get Started for Free")
2. Podés registrarte con Google, GitHub, o email + password
3. Verificá el email (te mandan un link)

### 1.2 — Crear el cluster Serverless (gratis)

1. Después de loguearte, click en **"Create Cluster"**
2. Elegí el plan **"Serverless"** (es el gratis, el otro es de pago)
3. Completá:

   | Campo | Valor |
   |-------|-------|
   | **Cluster Name** | `umpi-marketplace` |
   | **Cloud Provider** | `AWS` (recomendado) o `GCP` |
   | **Region** | `US East - Northern Virginia` (la más cercana a Vercel) |

4. Click **"Create"** — tarda 30 segundos en provisionarse

### 1.3 — Crear usuario y password de la base

1. En el cluster recién creado, andá a la pestaña **"SQL Editor"** o **"Connect"**
2. Te va a pedir crear un usuario root y password:
   - **Username:** `umpi_user` (o el que quieras)
   - **Password:** inventate una contraseña segura (anotala, la vas a necesitar)
3. Después de crearlo, te van a mostrar los datos de conexión:
   ```
   Host:     gateway01.us-east-1.prod.aws.tidbcloud.com
   Port:     4000
   User:     umpi_user
   Password: <la-que-elegiste>
   Database: test  (la default)
   ```

### 1.4 — Crear la base de datos `umpidata`

1. En TiDB Cloud, abrí el **"SQL Editor"** (botón a la izquierda)
2. En el editor SQL, ejecutá (click en "Run" o Ctrl+Enter):
   ```sql
   CREATE DATABASE umpidata;
   USE umpidata;
   ```
3. Vas a ver "Query OK" — la base está creada

> 💡 En TiDB Serverless, por defecto tenés una base `test`. Podrías usar esa,
> pero es más prolijo crear `umpidata` para mantener el mismo nombre que tenías.

---

## 📥 PASO 2: Importar los datos a TiDB

### 2.1 — Conseguir el archivo SQL

En el ZIP que descargaste (`umpi-marketplace.zip`), buscá el archivo:

```
database/umpi_tidb.sql   ← USÁ ESTE (optimizado para TiDB)
```

> Si por algún motivo no está, también podés usar `database/umpi_full.sql`
> (versión MySQL estándar, también compatible con TiDB).

### 2.2 — Importar el SQL

TiDB Cloud tiene 2 formas de importar SQL:

#### Opción A — SQL Editor (recomendado para SQL < 5 MB)

1. En TiDB Cloud → **SQL Editor**
2. Asegurate de estar en la base `umpidata` (selector arriba a la izquierda)
3. Abrí el archivo `umpi_tidb.sql` con un editor de texto en tu compu (Notepad++, VSCode, o hasta el bloc de notas)
4. Seleccioná TODO el contenido (Ctrl+A) → copialo (Ctrl+C)
5. Pegalo en el SQL Editor de TiDB (Ctrl+V)
6. Click en **"Run"** (botón arriba a la derecha)
7. Esperá 10-30 segundos hasta ver "Query OK"

> ⚠️ El archivo tiene ~300 INSERT. Puede que el SQL Editor tarde un poco o que
> te pida confirmar "Are you sure you want to run multiple statements?" → Decile que sí.

#### Opción B — Import (para SQL > 5 MB)

1. En TiDB Cloud → tu cluster → pestaña **"Import"**
2. Click **"Import Data"** → **"SQL File"**
3. Subí el archivo `umpi_tidb.sql`
4. Target database: `umpidata`
5. Click **"Start Import"**

### 2.3 — Verificar que se importó bien

En el SQL Editor, ejecutá estas consultas una por una:

```sql
USE umpidata;
SHOW TABLES;
```

✅ Deberías ver 20 tablas (User, Listing, Plan, Category, etc.)

```sql
SELECT COUNT(*) FROM User;
SELECT COUNT(*) FROM Listing;
SELECT COUNT(*) FROM Plan;
```

✅ Deberías ver:
- User: **16**
- Listing: **33**
- Plan: **3**

```sql
SELECT email, role FROM User WHERE role = 'ADMIN';
```

✅ Deberías ver `admin@umpi.com.ar` con rol `ADMIN`.

### 2.4 — Conseguir el connection string

1. En TiDB Cloud → tu cluster → pestaña **"Connect"**
2. En "Connect to" elegí **"General"** (o "Prisma" si está disponible)
3. Te va a mostrar algo así:
   ```
   mysql://umpi_user:<PASSWORD>@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/umpidata
   ```
   o en formato separado:
   ```
   host: gateway01.us-east-1.prod.aws.tidbcloud.com
   port: 4000
   user: umpi_user
   password: ********
   database: umpidata
   ```

4. **Anotá todo esto** — lo vas a necesitar para Vercel.

> 🔒 TiDB **requiere SSL** para conectarse. El connection string debe llevar
> `?sslaccept=accept` al final (o el parámetro equivalente). En el próximo paso
> te paso el string completo ya armado.

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

### 3.3 — Cambiar Prisma a MySQL (CRÍTICO)

Antes de subir los archivos, hacé esto en tu compu:

1. Descomprimí el ZIP `umpi-marketplace.zip` en una carpeta
2. Entrá a la carpeta `prisma/`
3. **Borrá** el archivo `schema.prisma` (es el de SQLite, no nos sirve)
4. **Renombrá** `schema.mysql.prisma` → `schema.prisma`
5. ✅ Ahora el schema principal usa MySQL (compatible con TiDB)

Verificá abriendo el archivo `prisma/schema.prisma` — debe decir:

```prisma
datasource db {
  provider = "mysql"     ← DEBE decir mysql
  url      = env("DATABASE_URL")
}
```

### 3.4 — Subir los archivos a GitHub

1. En GitHub, en tu repo recién creado → click en **"uploading an existing file"**
2. Arrastrá **TODOS** los archivos y carpetas de la carpeta descomprimida
3. Esperá a que terminen de subir (puede tardar 1-2 min)
4. Abajo: **Commit message:** "Initial commit" → click **Commit changes**

> ⚠️ **NO subas** estos archivos/carpetas (no están en el ZIP, pero verificá):
> - `node_modules/` (Vercel lo instala solo)
> - `.next/` (Vercel lo genera solo)
> - `.env` (las variables van directo en Vercel, NO en GitHub)
> - `*.db` (bases SQLite locales)
> - `dev.log`, `server.log`

### 3.5 — Verificar que `prisma/schema.prisma` está en MySQL

En GitHub, hacé click en el archivo `prisma/schema.prisma`. Las primeras líneas deben decir:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

Si dice `sqlite`, volvé al Paso 3.3.

---

## 🚀 PASO 4: Importar el repo en Vercel

1. Andá a https://vercel.com → **Sign Up** / **Log In** (podés entrar con GitHub)
2. Click en **"Add New..." → "Project"**
3. En la lista, buscá tu repo `umpi-marketplace` → click **"Import"**
4. Vercel detecta automáticamente que es Next.js:
   - **Framework Preset:** Next.js ✅ (automático)
   - **Build Command:** `next build` ✅ (automático)
   - **Output Directory:** `.next` ✅ (automático)
   - **Install Command:** `npm install` ✅ (automático)

5. **NO hagas click en Deploy todavía** — primero configurá las variables (Paso 5)

---

## ⚙️ PASO 5: Configurar variables de entorno

En la misma página, desplegá **"Environment Variables"**.

Agregá estas **6 variables** una por una (click "Add" después de cada una):

### 1. `DATABASE_URL`

Reemplazá `<PASSWORD_TIDB>` por la contraseña que creaste en TiDB (Paso 1.3):

```
mysql://umpi_user:<PASSWORD_TIDB>@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/umpidata?sslaccept=accept
```

Ejemplo: si tu password es `mipass123`, queda:
```
mysql://umpi_user:mipass123@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/umpidata?sslaccept=accept
```

> 🔑 **IMPORTANTE sobre la contraseña:**
> - Si tu password tiene caracteres especiales (`@`, `#`, `$`, `&`, `?`), tenés que codificarlos:
>   - `@` → `%40`
>   - `#` → `%23`
>   - `$` → `%24`
>   - `&` → `%26`
>   - `?` → `%3F`
> - Ejemplo: si password es `hola$123`, en el string va como `hola%24123`
> - Si tu password **no** tiene caracteres especiales, pegala tal cual.
> - El parámetro `?sslaccept=accept` al final es **OBLIGATORIO** para TiDB (requiere SSL).

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

---

## ▶️ PASO 6: Deploy

1. Click en el botón azul **"Deploy"** (abajo de todo)
2. Esperá 3-5 minutos mientras Vercel:
   - Instala dependencias (`npm install`)
   - Genera el cliente Prisma (detecta el postinstall automáticamente)
   - Compila el proyecto (`npm run build`)
   - Despliega a su CDN global
3. Cuando termine vas a ver confeti 🎉 y un botón **"Visit"**
4. Click **Visit** → tu app está online en `https://umpi-marketplace-xxxxx.vercel.app`

### Verificar que funciona:

1. Entrá a la URL de Vercel
2. Probá loguearte como admin:
   - Email: `admin@umpi.com.ar`
   - Password: `admin123`
3. Andá al **Panel Admin** → deberías ver los usuarios, publicaciones, planes, etc.
4. Si todo carga bien → ✅ La conexión Vercel ↔ TiDB funciona perfecta

### Posibles errores en el deploy:

| Error | Causa | Fix |
|-------|-------|-----|
| `PrismaClientInitializationError: Can't reach database server` | Credenciales TiDB mal o sin SSL | Verificá `?sslaccept=accept` al final del DATABASE_URL |
| `Authentication failed` | Password incorrecta o mal codificada | Revisá el Paso 5.1 sobre codificación de caracteres |
| `Unknown database 'umpidata'` | No creaste la base en TiDB | Ejecutá `CREATE DATABASE umpidata;` en SQL Editor (Paso 1.4) |
| `TLS connection error` | Falta parámetro SSL | Asegurate de tener `?sslaccept=accept` |
| `Build failed` | Error de código | Click en "Logs" → copiame el último error del build |

> 💡 Si te aparece algún error raro, en Vercel → pestaña **"Deployments"** → click
> en el deploy fallido → **"Build Logs"** → andá al final → copiame el error y te digo cómo arreglarlo.

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

1. Entrá al panel de cdmon → **DNS / Zone Editor** (o "Gestión DNS")
2. Buscá el registro existente para `juanumpi.com.mialias.net` (probablemente un A record a cdmon)
3. **Eliminá ese registro** y agregá uno nuevo:
   - **Tipo:** `CNAME`
   - **Nombre/Alias:** `juanumpi` (o el subdominio)
   - **Valor/Destino:** `cname.vercel-dns.com`
   - **TTL:** Default / 3600
4. Guardá los cambios

> ⚠️ Importante: si tenés un registro A para `juanumpi.com.mialias.net` apuntando a cdmon,
> **tenés que borrarlo primero** antes de agregar el CNAME. No pueden coexistir ambos para el mismo host.

### 7.3 — Esperar propagación DNS

- Tarda de **5 minutos a 2 horas**
- Verificá en https://dnschecker.org poniendo `juanumpi.com.mialias.net`
- Cuando todas las IPs resuelvan a Vercel, volvé a la pestaña Domains en Vercel → debería mostrar ✅ verde

### 7.4 — Actualizar NEXTAUTH_URL

IMPORTANTE: cuando el dominio funcione, actualizá la variable en Vercel:

1. Vercel → **Settings → Environment Variables**
2. Editá `NEXTAUTH_URL`
3. Cambiá el valor a: `https://juanumpi.com.mialias.net`
4. Click **Save**
5. Hacé un **Redeploy**: Deployments → click en los 3 puntos del último deploy → **Redeploy**

---

## 💳 Configurar MercadoPago (después del deploy)

1. Entrá a https://www.mercadopago.com.ar/developers/panel
2. Creá una aplicación
3. En la configuración, agregá URLs de retorno:
   - **Success:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - **Failure:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
   - **Pending:** `https://juanumpi.com.mialias.net/dashboard/subscriptions`
4. Copiá el **Access Token** y la **Public Key** (las de `TEST-` para pruebas)
5. En tu sitio → entrá como admin (`admin@umpi.com.ar` / `admin123`)
6. **Panel Admin → MercadoPago** → pegá las credenciales → **Guardar**
7. Click **Validar token**

> Mientras tanto, el sistema funciona en **modo demo**: las compras se simulan sin cobrar de verdad.

---

## 🔒 Checklist final

- [ ] Cluster TiDB creado (plan Serverless gratis)
- [ ] Base `umpidata` creada en TiDB
- [ ] Datos importados (verificaste que User tiene 16 registros)
- [ ] `schema.prisma` dice `provider = "mysql"` en GitHub
- [ ] 6 variables de entorno configuradas en Vercel
- [ ] Deploy exitoso en Vercel
- [ ] Login admin funciona (`admin@umpi.com.ar` / `admin123`)
- [ ] Dominio `juanumpi.com.mialias.net` apuntando a Vercel (CNAME → cname.vercel-dns.com)
- [ ] `NEXTAUTH_URL` actualizada a `https://juanumpi.com.mialias.net`
- [ ] **Cambiar password del admin** (importante por seguridad)
- [ ] Configurar MercadoPago cuando estés listo para vender

---

## ❓ Preguntas frecuentes

### ¿TiDB Cloud es gratis?
Sí, el plan **Serverless** es gratis para siempre con estos límites:
- ✅ 5 GB de almacenamiento
- ✅ 1 cluster serverless
- ✅ Acceso remoto (Vercel puede conectarse sin problemas)
- ✅ SSL incluido

Si algún día excedés los 5 GB, podés upgradearte al plan Dedicated por USD/mes.

### ¿Tengo que migrar todos los datos de cdmon a TiDB?
Sí, pero ya te lo dejé listo en `database/umpi_tidb.sql`. Solo lo importás en TiDB y ya tenés los 16 usuarios, 33 publicaciones, 27 categorías, 3 planes, etc.

### ¿Puedo seguir usando phpMyAdmin?
No — TiDB no usa phpMyAdmin. Usás el **SQL Editor** que viene incluido en TiDB Cloud (es una web con resaltado de sintaxis, muy similar a phpMyAdmin pero más moderno).

### ¿La base sigue siendo accesible desde mi app cdmon?
No es necesario. Tu app cdmon (si tenías algo ahí) ya no se usa — todo el tráfico va a Vercel, y Vercel se conecta a TiDB. cdmon queda fuera de la arquitectura.

### ¿Qué pasa si quiero editar un dato de la BD?
Entras a TiDB Cloud → SQL Editor → ejecutás la consulta:
```sql
UPDATE User SET email = 'nuevo@email.com' WHERE id = 'xxx';
```
Los cambios se reflejan instantáneamente en tu app Vercel.

### ¿Vercel + TiDB tienen costo?
Para arrancar: **0 (cero)**. Ambos tienen plan gratis generoso.
Cuando tu tráfico crezca mucho, Vercel Pro es $20/mes y TiDB Dedicated es desde $0.012/hora.

### ¿Funciona el chat en tiempo real (socket.io)?
Sí, pero socket.io necesita un servidor Node.js siempre activo, lo cual Vercel no soporta bien.
Para esa funcionalidad específica, deployar el mini-servicio `mini-services/chat-service/` en un host como Railway.app (gratis) o Render.com (gratis).

---

## 📞 Datos que vas a necesitar tener a mano

| Dato | Valor |
|------|-------|
| Host TiDB | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
| Port TiDB | `4000` |
| User TiDB | `umpi_user` (o el que creaste) |
| Password TiDB | `<la-que-inventaste>` ⚠️ NO la pierdas |
| Database | `umpidata` |
| Admin login app | `admin@umpi.com.ar` / `admin123` |
| URL final deseada | `http://juanumpi.com.mialias.net` |

---

## 🆘 Si algo falla

1. **Error en build de Vercel** → copiame el log del build
2. **Error de conexión a BD** → verificá que el connection string tenga `?sslaccept=accept`
3. **Error de login admin** → ejecutá en TiDB SQL Editor:
   ```sql
   SELECT email, role, password FROM User WHERE email = 'admin@umpi.com.ar';
   ```
   Pegame el resultado y veo qué pasa.

En cualquier caso, decime qué error ves y te ayudo a resolverlo.
