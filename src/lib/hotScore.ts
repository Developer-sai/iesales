import type { Deal } from "./types";

/**
 * Lower bound of the Wilson score interval (95%): the confidence-adjusted share of
 * positive votes. Same idea Reddit uses for "best" and review sites use for ranking:
 * 1 vote of 1 does not outrank 90 of 100.
 */
export function wilsonLower(positive: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = positive / n;
  const z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}

/**
 * Hot rank = quality x engagement / time decay (the HN/Reddit gravity form, with
 * a confidence-adjusted quality term instead of the raw legit-minus-disputed count).
 * Two pseudo-legit and two pseudo-disputed votes act as a neutral prior, so a brand-new
 * deal starts mid-pack and tiny samples (or a handful of coordinated votes) cannot spike it.
 */
export function hotScore(
  d: Pick<Deal, "legit_votes" | "fake_votes" | "created_at"> & { comment_count?: number },
  now = Date.now(),
): number {
  const hours = Math.max(0, (now - new Date(d.created_at).getTime()) / 3_600_000);
  const total = d.legit_votes + d.fake_votes;
  const quality = wilsonLower(d.legit_votes + 2, total + 4);
  const engagement = Math.log2(2 + total + 2 * (d.comment_count ?? 0));
  return (quality * engagement) / Math.pow(hours + 2, 1.5);
}

export function percentOff(sale: number, prior: number | null): number | null {
  if (!prior || prior <= sale) return null;
  return Math.round(((prior - sale) / prior) * 100);
}

export function formatEuro(n: number): string {
  const whole = Number.isInteger(n);
  return "€" + n.toLocaleString("en-IE", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Honest verdict: no percentage until there are enough votes. */
export function verdict(d: Pick<Deal, "legit_votes" | "fake_votes">): { label: string; tone: "good" | "bad" | "neutral" } {
  const total = d.legit_votes + d.fake_votes;
  if (total < 5) return { label: total === 0 ? "No votes yet" : `${total} vote${total === 1 ? "" : "s"} so far`, tone: "neutral" };
  const pct = Math.round((d.legit_votes / total) * 100);
  if (pct >= 70) return { label: `${pct}% of ${total} voters say legit`, tone: "good" };
  if (pct <= 30) return { label: `${100 - pct}% of ${total} voters dispute this price`, tone: "bad" };
  return { label: `Mixed: ${d.legit_votes} legit, ${d.fake_votes} disputed`, tone: "neutral" };
}

export function isExpired(d: Pick<Deal, "expired_votes">): boolean {
  return d.expired_votes >= 3;
}
