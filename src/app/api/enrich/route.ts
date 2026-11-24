import { NextResponse } from "next/server";
import { enrichConfigured, enrichPhoto, enrichUrl, EnrichError, isJpegDataUrl, safeProductUrl } from "@/lib/enrich";
import { allow, cacheGet, cacheSet } from "@/lib/enrich-guard";
import type { Enriched, EnrichResponse } from "@/lib/enrich-types";
import { createSessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, message: string) =>
  NextResponse.json<EnrichResponse>({ ok: false, error, message }, { status, headers: NO_STORE });

/** Signed-in shoppers only: every call costs money and reads a third-party page. */
export async function POST(req: Request) {
  if (!enrichConfigured() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "not_configured", "Auto-fill is not available here.");

  let userId: string | null = null;
  try {
    const { data } = await (await createSessionClient()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch { /* fall through to 401 */ }
  if (!userId) return fail(401, "auth", "Sign in to use auto-fill.");

  if (Number(req.headers.get("content-length") ?? 0) > 3_000_000) return fail(413, "too_big", "That photo is too large.");
  let body: { url?: unknown; image?: unknown };
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Send a link or a photo."); }

  const isPhoto = body.image !== undefined;
  const url = isPhoto ? null : typeof body.url === "string" ? safeProductUrl(body.url) : null;
  if (isPhoto && !isJpegDataUrl(body.image)) return fail(400, "bad_image", "Use a JPEG photo.");
  if (!isPhoto && !url) return fail(400, "bad_url", "That link can't be read. Use a public https:// product page.");

  const cached = url ? cacheGet<Enriched>(url) : null;
  if (cached) return NextResponse.json<EnrichResponse>({ ok: true, data: cached }, { headers: NO_STORE });

  const gate = allow(userId);
  if (gate === "user_limit") return fail(429, "rate", "You've used auto-fill a lot this hour. Please fill in the rest by hand.");
  if (gate === "daily_cap") return fail(503, "busy", "Auto-fill is busy today. Please fill in the form by hand.");

  try {
    const data = isPhoto ? await enrichPhoto(body.image as string) : await enrichUrl(url as string);
    if (url && data.page_ok) cacheSet(url, data);
    return NextResponse.json<EnrichResponse>({ ok: true, data }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof EnrichError && e.code === "timeout") return fail(504, "timeout", "The shop's page took too long. Fill in the form by hand.");
    return fail(502, "upstream", "Couldn't read that page. Fill in the form by hand.");
  }
}
