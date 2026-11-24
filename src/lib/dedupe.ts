import type { Deal } from "./types";

const STOP = new Set(["the", "and", "for", "with", "new", "deal", "sale", "off", "in", "at", "of", "a", "an", "to", "ie"]);

export function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

/** Jaccard similarity of two token sets: |A ∩ B| / |A ∪ B|. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Canonical form so https://www.shop.ie/p/1/?utm=x#top and http://shop.ie/p/1 match. */
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u.trim());
    return (url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Possible duplicates among current deals: same normalised link, or same shop with a
 * very similar title. Linear scan: fine for a few hundred deals (use MinHash/LSH if this grows).
 */
export function findDuplicates(deals: Deal[], c: { title: string; retailer: string; url: string }, max = 3): Deal[] {
  const url = c.url ? normalizeUrl(c.url) : "";
  const title = tokens(c.title);
  const shop = c.retailer.trim().toLowerCase();
  if (!url && title.size < 2) return [];
  const scored: { d: Deal; s: number }[] = [];
  for (const d of deals) {
    if (url && d.deal_url && normalizeUrl(d.deal_url) === url) { scored.push({ d, s: 2 }); continue; }
    if (shop && d.retailer.toLowerCase() === shop) {
      const s = jaccard(title, tokens(d.title));
      if (s >= 0.6) scored.push({ d, s });
    }
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, max).map((x) => x.d);
}
