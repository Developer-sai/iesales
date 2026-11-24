import { NextResponse } from "next/server";
import { loadFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

/**
 * Edge-cached read model. Visitors share one CDN entry, so database load stays
 * flat however many people open the site:
 *  - s-maxage=15: fresh for 15s at the edge
 *  - stale-while-revalidate=120: serve instantly while one request refreshes it
 *  - stale-if-error=86400: if Supabase is down, keep serving the last good copy
 */
const CACHE = "public, s-maxage=15, stale-while-revalidate=120, stale-if-error=86400";

export async function GET() {
  try {
    const feed = await loadFeed();
    if (!feed) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(feed, { headers: { "Cache-Control": CACHE } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
