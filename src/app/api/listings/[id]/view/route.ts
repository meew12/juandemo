import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// In-memory rate limiting: tracks IP+listingId with TTL of 1 hour
const viewTracker = new Map<string, number>(); // key -> timestamp
const ONE_HOUR_MS = 60 * 60 * 1000;

// Periodically clean up expired entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewTracker) {
    if (now - timestamp > ONE_HOUR_MS) {
      viewTracker.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limiting: 1 view increment per IP per listing per hour
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const trackerKey = `${ip}-${id}`;
    const now = Date.now();

    const lastView = viewTracker.get(trackerKey);
    if (lastView && now - lastView < ONE_HOUR_MS) {
      // Already tracked within the hour, return current view count
      const listing = await db.listing.findUnique({
        where: { id },
        select: { views: true },
      });
      return NextResponse.json({
        success: true,
        views: listing?.views ?? 0,
        rateLimited: true,
      });
    }

    // Increment views
    const updated = await db.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });

    // Mark this IP as having viewed this listing
    viewTracker.set(trackerKey, now);

    return NextResponse.json({ success: true, views: updated.views });
  } catch (err: any) {
    console.error("POST /api/listings/[id]/view error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
