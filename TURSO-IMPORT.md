# 📥 Importar datos a Turso — 3 opciones

> **Problema:** Pegaste todo el SQL en https://app.turso.tech/.../data y te salió:
> ```
> To run statements in a transaction - select multiple statements and run,
> SQL Console will automatically wrap them in a transaction (batch).
> ```
>
> **Causa:** El SQL Editor web de Turso no ejecuta muchas sentencias juntas por defecto.
> Solo ejecuta la sentencia donde está el cursor. Para ejecutar todo, tenés que
> seleccionar todo (Ctrl+A) y click en "Run Selection".

---

## 🎯 SOLUCIÓN MÁS FÁCIL: Usar Turso CLI (recomendada)

La CLI de Turso ejecuta archivos SQL completos sin problema.

### Paso 1 — Instalar Turso CLI

En tu compu, abrí una terminal (Windows: PowerShell o CMD; Mac/Linux: Terminal):

**Mac/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://get.tur.so/install.ps1 | iex
```

> Si tenés problema con la instalación, también podés usar:
> - npm: `npm install -g @turso-tech/turso`
> - Scoop (Windows): `scoop install tursod`
> - Homebrew (Mac): `brew install tursodatabase/tap/turso`

### Paso 2 — Hacer login

```bash
turso auth login
```
Esto abre el navegador. Iniciá sesión con la misma cuenta que usaste en la web.

### Paso 3 — Ubicarte en la carpeta del proyecto

```bash
# Cambiá la ruta a donde descomprimiste el ZIP
cd /ruta/a/tu/carpeta/umpi-marketplace
```

Verificá que el archivo existe:
```bash
ls database/umpi_turso.sql
```

### Paso 4 — Verificar que tu base existe

```bash
turso db list
```
Debe aparecer tu base `umpi`:
```
NAME   LOCATION  TYPE    SIZE
umpi   bue       primary 12 MB
```

### Paso 5 — Crear las tablas primero (CRÍTICO)

```bash
npx prisma generate
npx prisma db push
```

> Asegurate de tener tu `.env` configurado con la URL de Turso:
> ```
> DATABASE_URL="libsql://umpi-TU-USUARIO.turso.io?authToken=TU-TOKEN"
> ```

Verificá que se crearon las tablas:
```bash
turso db shell umpi ".tables"
```
Deberías ver: User, Account, Session, Category, Listing, Plan, etc.

### Paso 6 — Importar los datos

```bash
turso db shell umpi < database/umpi_turso.sql
```

Vas a ver algo así:
```
Connected to umpi at libsql://umpi-xxx.turso.io
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
-- ─── User (16 registros) ───
DELETE FROM `User`;
INSERT INTO `User` ...
...
COMMIT;
PRAGMA foreign_keys = ON;
```

### Paso 7 — Verificar que se cargó

```bash
turso db shell umpi "SELECT COUNT(*) FROM User;"
turso db shell umpi "SELECT COUNT(*) FROM Listing;"
turso db shell umpi "SELECT COUNT(*) FROM Plan;"
```

✅ Deberías ver:
- User: **16**
- Listing: **33**
- Plan: **3**

¡Listo! Ya tenés todos los datos cargados en Turso.

---

## 🌐 ALTERNATIVA A: Pegar SQL en la web (con el truco)

Si NO querés instalar la CLI, podés usar la web con este truco:

### Paso 1 — Crear las tablas primero

Saltéate este paso si ya las creaste con `npx prisma db push` desde tu compu.

Si NO tenés Node.js instalado y necesitás crear las tablas desde la web:
1. Andá a https://app.turso.tech → tu base `umpi` → pestaña **SQL**
2. Pegá el contenido de `database/umpi_schema_sqlite.sql` (uno por uno, los CREATE TABLE)
3. Seleccioná todo (Ctrl+A) → click **"Run Selection"** (no "Run")
4. Repetí hasta que estén las 19 tablas

### Paso 2 — Importar datos tabla por tabla

El archivo `database/umpi_turso.sql` tiene los datos divididos por tabla con comentarios `-- ─── User (16 registros) ───`.

**Por cada tabla:**

1. En https://app.turso.tech → tu base → pestaña **SQL**
2. Pegá **solamente el bloque de UNA tabla** (del comentario `-- ─── User` hasta el `;` final de los INSERT)
3. Seleccioná todo lo que pegaste (Ctrl+A dentro del editor)
4. Click en **"Run Selection"** (o "Run Selected")
5. Vas a ver "Query executed successfully"

Ejemplo para la tabla User (primer bloque del SQL):
```sql
DELETE FROM `User`;
INSERT INTO `User` (`id`, `email`, ...) VALUES
  ('cmsce8acs000trjggkktemzc6', 'admin@umpi.com.ar', ...),
  ('cmsce8act000urjgg798i5gq7', 'juan.garcia@email.com', ...),
  ...
  ('cmsce8adq001srjgglfct0x80', 'pepedemo@gmail.com', ...);
```

Repetí esto para cada tabla:
1. User (16 registros) ✅
2. Category (27 registros) ✅
3. Plan (3 registros) ✅
4. Listing (33 registros) ✅
5. Subscription (10 registros) ✅
6. Transaction (25 registros) ✅
7. Boost (4 registros) ✅
8. Review (100 registros) ✅
9. Notification (42 registros) ✅
10. SiteConfig (1 registro) ✅
11. Conversation (3 registros) ✅
12. Message (6 registros) ✅
13. Report (4 registros) ✅
14. AuditLog (25 registros) ✅

(Las tablas con 0 registros: Account, Session, VerificationToken, Subcategory, Favorite — pueden omitirse, no hay datos que cargar)

> ⏱️ Tarda unos 10-15 minutos en total. La CLI lo hace en 5 segundos.

---

## 🌐 ALTERNATIVA B: Usar un script de Node.js

Si ya tenés Node.js instalado en tu compu pero no querés instalar la CLI de Turso:

### Paso 1 — Configurar `.env`

En la raíz del proyecto, editá `.env`:
```env
DATABASE_URL="libsql://umpi-TU-USUARIO.turso.io?authToken=TU-TOKEN"
```

### Paso 2 — Crear las tablas

```bash
npx prisma generate
npx prisma db push
```

### Paso 3 — Importar los datos con un script

Creá un archivo `import-turso.ts` en la raíz del proyecto:

```typescript
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL!;
const client = createClient({ url });

const sql = readFileSync("./database/umpi_turso.sql", "utf8");

// Dividir en statements individuales
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith("--") && s !== "BEGIN TRANSACTION" && s !== "COMMIT" && !s.startsWith("PRAGMA"));

(async () => {
  console.log(`Ejecutando ${statements.length} statements...`);
  let i = 0;
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      i++;
      if (i % 10 === 0) console.log(`  ${i}/${statements.length}...`);
    } catch (e) {
      console.error(`Error en statement ${i}:`, e.message);
    }
  }
  console.log(`✅ ${i} statements ejecutados`);

  // Verificar
  const r = await client.execute("SELECT COUNT(*) as n FROM User");
  console.log("Usuarios en Turso:", r.rows[0].n);
})();
```

Ejecutá:
```bash
npx tsx import-turso.ts
```

---

## ✅ Verificar que la importación funcionó

Sin importar qué método uses, después verificá:

### En la web:
https://app.turso.tech → tu base `umpi` → pestaña **SQL** → ejecutá:

```sql
SELECT COUNT(*) FROM User;
```
→ debe decir **16**

```sql
SELECT email, role FROM User WHERE role = 'admin' OR role = 'ADMIN';
```
→ debe mostrar `admin@umpi.com.ar`

```sql
SELECT COUNT(*) FROM Listing;
```
→ debe decir **33**

```sql
SELECT name, price FROM Plan;
```
→ debe mostrar 3 planes (básico, pro, business)

```sql
SELECT COUNT(*) FROM Category;
```
→ debe decir **27**

---

## 🆘 Solución de problemas

### "no such table: User"
No creaste las tablas primero. Ejecutá:
```bash
npx prisma db push
```

### "UNIQUE constraint failed: User.email"
Los datos ya estaban cargados. Ejecutá primero:
```sql
DELETE FROM User;
DELETE FROM Listing;
DELETE FROM Category;
-- etc para todas las tablas
```
Y volvé a importar.

### "FOREIGN KEY constraint failed"
Estás importando tablas en el orden equivocado. El archivo `umpi_turso.sql` ya las
tiene en el orden correcto (padres antes que hijas). NO cambiés el orden.

### "syntax error near `<?`"
El archivo SQL está corrupto o lo guardaste con encoding incorrecto. Volvé a
descargar el ZIP y usá el archivo `database/umpi_turso.sql` tal cual.

### El web editor no ejecuta nada cuando hago "Run"
Asegurate de **seleccionar** el texto antes de hacer click en Run.
Si hacés click en Run sin seleccionar, solo ejecuta la línea del cursor.

---

## 📞 ¿Qué método usar?

| Tu situación | Método recomendado |
|--------------|---------------------|
| Tengo compu con terminal | **Turso CLI** (Paso 1-7 de arriba) ⭐ |
| No quiero instalar nada | Web editor con "Run Selection" (Alternativa A) |
| Tengo Node.js pero no la CLI | Script Node.js (Alternativa B) |
| No tengo Node.js ni CLI | Solo web editor — pero primero pedí ayuda para crear las tablas |

> 💡 **Mi recomendación:** Instalate la CLI. Son 30 segundos y te ahorra 15 minutos
> de pegar SQL a mano. Además te sirve para cualquier otra cosa que necesites hacer
> con Turso en el futuro.
