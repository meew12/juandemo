import { NextResponse } from "next/server";
import { query } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch reviews with rating >= 4, joined with user and listing
    const rows = await query<Record<string, unknown>>(
      `SELECT r.id, r.rating, r.comment, r.createdAt,
              u.name, u.lastName, u.avatarInitials,
              l.title as listingTitle
       FROM Review r
       INNER JOIN User u ON u.id = r.userId
       LEFT JOIN Listing l ON l.id = r.listingId
       WHERE r.rating >= 4 AND r.status = 'active'
       ORDER BY r.createdAt DESC
       LIMIT 8`
    );

    const testimonials = rows.map((r) => {
      const userName =
        [r.name as string, r.lastName as string].filter(Boolean).join(" ") ||
        "Usuario";
      const initials =
        (r.avatarInitials as string) || userName.substring(0, 2).toUpperCase();

      return {
        id: String(r.id),
        userName,
        userInitials: initials,
        rating: Number(r.rating),
        comment: String(r.comment),
        listingTitle: (r.listingTitle as string) || "Servicio",
        createdAt: String(r.createdAt),
      };
    });

    return NextResponse.json({ testimonials });
  } catch (err: any) {
    console.error("GET /api/testimonials error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
