// ════════════════════════════════════════════════════════════
//  /api/auth-debug — Diagnóstico específico de login
//  Visita /api/auth-debug?email=admin@umpi.com.ar&password=admin123
//  para ver exactamente POR QUÉ falla el login
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "admin@umpi.com.ar").toLowerCase().trim();
  const password = searchParams.get("password") || "admin123";

  const steps: { step: string; ok: boolean; detail: string }[] = [];

  // ─── Paso 1: ¿Existe el usuario en la DB? ───
  let user: any = null;
  try {
    user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        banned: true,
        verified: true,
        passwordHash: true,
      },
    });

    if (user) {
      steps.push({
        step: "1. Buscar usuario en DB",
        ok: true,
        detail: `Encontrado: id=${user.id.substring(0, 12)}..., email=${user.email}, role=${user.role}, plan=${user.plan}`,
      });
    } else {
      steps.push({
        step: "1. Buscar usuario en DB",
        ok: false,
        detail: `No se encontró ningún usuario con email "${email}"`,
      });
      return NextResponse.json({ email, steps, conclusion: "USER_NOT_FOUND" });
    }
  } catch (e: any) {
    steps.push({
      step: "1. Buscar usuario en DB",
      ok: false,
      detail: `Error de DB: ${e.message}`,
    });
    return NextResponse.json({ email, steps, conclusion: "DB_ERROR", error: e.message });
  }

  // ─── Paso 2: ¿Está baneado? ───
  if (user.banned) {
    steps.push({
      step: "2. Verificar si está baneado",
      ok: false,
      detail: `Usuario BANEADO. El login falla porque user.banned = true`,
    });
    return NextResponse.json({ email, steps, conclusion: "USER_BANNED" });
  }
  steps.push({
    step: "2. Verificar si está baneado",
    ok: true,
    detail: "user.banned = false ✓",
  });

  // ─── Paso 3: ¿Tiene passwordHash? ───
  if (!user.passwordHash) {
    steps.push({
      step: "3. Verificar passwordHash",
      ok: false,
      detail: "passwordHash es NULL. El usuario no tiene contraseña configurada.",
    });
    return NextResponse.json({ email, steps, conclusion: "NO_PASSWORD_HASH" });
  }
  steps.push({
    step: "3. Verificar passwordHash",
    ok: true,
    detail: `passwordHash presente: ${user.passwordHash.substring(0, 20)}... (longitud: ${user.passwordHash.length})`,
  });

  // ─── Paso 4: ¿El formato del hash es válido? ───
  const hashFormat = /^\$2[abxy]\$\d+\$/.test(user.passwordHash);
  if (!hashFormat) {
    steps.push({
      step: "4. Validar formato bcrypt",
      ok: false,
      detail: `El hash NO tiene formato bcrypt válido. Debería empezar con $2b$10$... pero empieza con: ${user.passwordHash.substring(0, 10)}`,
    });
    return NextResponse.json({ email, steps, conclusion: "INVALID_HASH_FORMAT" });
  }
  steps.push({
    step: "4. Validar formato bcrypt",
    ok: true,
    detail: "Formato bcrypt válido ✓",
  });

  // ─── Paso 5: ¿bcrypt.compare da true? ───
  try {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      steps.push({
        step: "5. Comparar contraseña",
        ok: false,
        detail: `bcrypt.compare("${password}", hash) = FALSE. La contraseña NO coincide con el hash.`,
      });
      // Probar también con variantes por las dudas
      const variants = [
        password.toLowerCase(),
        password.toUpperCase(),
        "admin123",
        "user123",
        "umpi123",
      ];
      const tried = [];
      for (const v of variants) {
        const matches = await bcrypt.compare(v, user.passwordHash);
        tried.push(`${v}=${matches ? "✓" : "✗"}`);
      }
      steps.push({
        step: "5b. Probar variantes de contraseña",
        ok: false,
        detail: `Probé: ${tried.join(", ")}`,
      });
      return NextResponse.json({ email, steps, conclusion: "PASSWORD_MISMATCH" });
    }
    steps.push({
      step: "5. Comparar contraseña",
      ok: true,
      detail: `bcrypt.compare("${password}", hash) = TRUE ✓`,
    });
  } catch (e: any) {
    steps.push({
      step: "5. Comparar contraseña",
      ok: false,
      detail: `Error en bcrypt.compare: ${e.message}`,
    });
    return NextResponse.json({ email, steps, conclusion: "BCRYPT_ERROR", error: e.message });
  }

  // ─── Paso 6: ¿NEXTAUTH_SECRET está configurado? ───
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  if (!hasSecret) {
    steps.push({
      step: "6. Verificar NEXTAUTH_SECRET",
      ok: false,
      detail: "NEXTAUTH_SECRET NO está configurado. Esto causa JWEDecryptionFailed.",
    });
    return NextResponse.json({ email, steps, conclusion: "NO_NEXTAUTH_SECRET" });
  }
  steps.push({
    step: "6. Verificar NEXTAUTH_SECRET",
    ok: true,
    detail: `NEXTAUTH_SECRET configurado ✓ (${process.env.NEXTAUTH_SECRET.substring(0, 4)}***, longitud: ${process.env.NEXTAUTH_SECRET.length})`,
  });

  // ─── Conclusión ───
  steps.push({
    step: "✓ Conclusión",
    ok: true,
    detail: "TODO BIEN. El login DEBERÍA funcionar. Si sigue fallando, el problema es del browser (sesión cacheada). Probá en modo incógnito o limpiá cookies.",
  });

  return NextResponse.json({
    email,
    password: password,
    steps,
    conclusion: "ALL_CHECKS_PASSED",
    hint:
      "Si el login sigue fallando en el browser, abrí una ventana de incógnito y probá ahí. Las cookies viejas de NextAuth pueden causar problemas.",
  });
}
