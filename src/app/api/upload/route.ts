// ════════════════════════════════════════════════════════════
//  /api/upload — Subida de imágenes (compatible con Vercel)
//  Convierte imágenes a base64 data URLs (sin escribir archivos)
//  Esto funciona en Vercel serverless (filesystem de solo lectura)
//
//  IMPORTANTE: Turso/libSQL tiene un límite de ~4MB por query HTTP.
//  El base64 agrega ~33% de overhead. Para 8 imágenes, cada una debe
//  ser <= ~350KB base64 (≈260KB binario).
//  Por eso redimensionamos a 800x800 calidad 65 → ~50-100KB c/u.
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Límite total de base64 en la respuesta (3MB para dejar margen)
const MAX_TOTAL_BASE64 = 3 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    // ─── Verificar autenticación ───
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debés iniciar sesión para subir imágenes" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron archivos" },
        { status: 400 }
      );
    }

    if (files.length > 8) {
      return NextResponse.json(
        { error: "Máximo 8 imágenes por publicación" },
        { status: 400 }
      );
    }

    // ─── Validar tipos y tamaños ───
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Archivo "${file.name}": tipo no permitido. Solo JPG, PNG, WebP` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Archivo "${file.name}": demasiado grande (máx 10MB)` },
          { status: 400 }
        );
      }
    }

    // ─── Procesar cada imagen y convertir a base64 data URL ───
    const urls: string[] = [];
    let totalBase64Size = 0;

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      try {
        // Redimensionar a máximo 800x800 y comprimir a calidad 65
        // Esto da ~50-100KB por imagen (base64 ~70-130KB)
        let processed = await sharp(buffer)
          .resize(800, 800, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 65, progressive: true })
          .toBuffer();

        // Si aún es muy grande (> 300KB binario), reducir más
        if (processed.length > 300 * 1024) {
          processed = await sharp(buffer)
            .resize(600, 600, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 55, progressive: true })
            .toBuffer();
        }

        const base64 = processed.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        // Verificar límite total acumulado
        totalBase64Size += base64.length;
        if (totalBase64Size > MAX_TOTAL_BASE64) {
          return NextResponse.json(
            {
              error: `Las imágenes son demasiado grandes en total (${(totalBase64Size / 1024 / 1024).toFixed(1)}MB). Subí menos imágenes o más pequeñas (máx 3MB total).`,
            },
            { status: 413 }
          );
        }

        urls.push(dataUrl);
      } catch (sharpError: any) {
        // Fallback: si sharp falla, usar base64 sin procesar (solo PNG/JPEG pequeño)
        console.warn("[upload] sharp failed, using raw base64:", sharpError.message);
        const base64 = buffer.toString("base64");
        const mime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
        const dataUrl = `data:${mime};base64,${base64}`;

        totalBase64Size += base64.length;
        if (totalBase64Size > MAX_TOTAL_BASE64) {
          return NextResponse.json(
            { error: "Las imágenes son demasiado grandes. Subí imágenes más pequeñas." },
            { status: 413 }
          );
        }

        urls.push(dataUrl);
      }
    }

    return NextResponse.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    return NextResponse.json(
      { error: "Error al subir imágenes: " + err.message },
      { status: 500 }
    );
  }
}
