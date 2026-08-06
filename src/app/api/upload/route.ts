import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
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
      return NextResponse.json({ error: "No se enviaron archivos" }, { status: 400 });
    }

    if (files.length > 8) {
      return NextResponse.json({ error: "Máximo 8 imágenes" }, { status: 400 });
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_SIZE = 10 * 1024 * 1024;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Archivo "${file.name}": solo JPG, PNG, WebP` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Archivo "${file.name}": máx 10MB` },
          { status: 400 }
        );
      }
    }

    const urls: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      try {
        const processed = await sharp(buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();

        const base64 = processed.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        urls.push(dataUrl);
      } catch (sharpError: any) {
        const base64 = buffer.toString("base64");
        const mime = file.type === "image/png" ? "image/png" : "image/webp";
        const dataUrl = `data:${mime};base64,${base64}`;
        urls.push(dataUrl);
      }
    }

    return NextResponse.json({ success: true, urls, count: urls.length });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    return NextResponse.json(
      { error: "Error al subir imágenes: " + err.message },
      { status: 500 }
    );
  }
}
