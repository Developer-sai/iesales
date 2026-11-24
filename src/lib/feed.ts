import { createPublicClient } from "./supabase/server";
import type { Deal, Discussion, Feed, Poll } from "./types";

type Row = Record<string, unknown>;
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

export const FEED_DEAL_LIMIT = 120;

export function mapDiscussions(rows: Row[]): Discussion[] {
  return rows.map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    username: one(r.profiles as { username: string } | null)?.username ?? "Shopper",
    county: (r.county as string | null) ?? null,
    question: r.question as string,
    created_at: r.created_at as string,
    replies: ((r.discussion_replies as Row[]) ?? [])
      .filter((x) => !x.is_hidden)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((x) => ({
        id: x.id as string,
        discussion_id: x.discussion_id as string,
        user_id: x.user_id as string,
        body: x.body as string,
        created_at: x.created_at as string,
        username: one(x.profiles as { username: string } | null)?.username ?? "Shopper",
      })),
  }));
}

/**
 * Builds the public home-screen snapshot with 3 parallel indexed queries.
 * Returns null when Supabase is not configured (demo mode). Throws on DB errors.
 */
export async function loadFeed(): Promise<Feed | null> {
  const sb = createPublicClient();
  if (!sb) return null;
  const [d, p, q] = await Promise.all([
    sb.from("deal_feed").select("*").eq("is_hidden", false).order("created_at", { ascending: false }).limit(FEED_DEAL_LIMIT),
    sb.from("polls").select("id, user_id, question, options, option_counts, is_pinned, created_at")
      .eq("is_hidden", false).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20),
    sb.from("discussions")
      .select("id, user_id, county, question, created_at, profiles(username), discussion_replies(id, discussion_id, user_id, body, created_at, is_hidden, profiles(username))")
      .eq("is_hidden", false).order("created_at", { ascending: false }).limit(30),
  ]);
  const err = d.error ?? p.error ?? q.error;
  if (err) throw new Error(err.message);
  return {
    deals: (d.data ?? []) as unknown as Deal[],
    polls: (p.data ?? []) as unknown as Poll[],
    discussions: mapDiscussions((q.data ?? []) as unknown as Row[]),
    generatedAt: new Date().toISOString(),
  };
}
