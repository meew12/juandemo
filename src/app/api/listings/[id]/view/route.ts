import { NextResponse } from "next/server";
import { getListingById, incrementListingViews } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      const listing = await getListingById(id);
      return NextResponse.json({
        success: true,
        views: listing?.views ?? 0,
        rateLimited: true,
      });
    }

    // Increment views
    const newViews = await incrementListingViews(id);

    // Mark this IP as having viewed this listing
    viewTracker.set(trackerKey, now);

    return NextResponse.json({ success: true, views: newViews });
  } catch (err: any) {
    console.error("POST /api/listings/[id]/view error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
