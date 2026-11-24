"use client";

import { Plus } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, COUNTIES, HOTSPOTS } from "@/lib/constants";
import { eventStatus } from "@/lib/events";
import { hotScore, percentOff } from "@/lib/hotScore";
import { useSaved } from "@/lib/saved";
import type { Category, Deal, Feed } from "@/lib/types";
import { DealCard } from "./DealCard";
import { PollStrip } from "./PollStrip";
import { Sidebar } from "./Sidebar";

type Sort = "hot" | "latest" | "biggest" | "saved" | "instore" | "disputed";
const SORTS: { id: Sort; label: string }[] = [
  { id: "hot", label: "🔥 Hottest" },
  { id: "biggest", label: "💸 Biggest saving" },
  { id: "latest", label: "🆕 Latest" },
  { id: "saved", label: "🔖 Saved" },
  { id: "instore", label: "📍 In-store sightings" },
  { id: "disputed", label: "🚩 Disputed prices" },
];

const chip = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;

function matches(d: Deal, q: string): boolean {
  if (!q) return true;
  const hay = [d.title, d.brand, d.retailer, d.county, d.note, d.store_branch].filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function Home({ initial }: { initial: Feed | null }) {
  const ctx = useApp();
  const { ready, loadError, query: rawQuery, openModal, requireAuth, refresh } = ctx;
  // First paint comes from the server-rendered (ISR) snapshot; the live feed takes over once loaded.
  const seeded = !ready && initial !== null;
  const deals = seeded ? initial.deals : ctx.deals;
  const polls = seeded ? initial.polls : ctx.polls;
  const discussions = seeded ? initial.discussions : ctx.discussions;
  const query = useDeferredValue(rawQuery);
  const [sort, setSort] = useState<Sort>("hot");
  const [cat, setCat] = useState<Category | "all">("all");
  const [loc, setLoc] = useState("all");
  const [spot, setSpot] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [proofOnly, setProofOnly] = useState(false);
  const saved = useSaved();
  const [limit, setLimit] = useState(20);
  // Start from the snapshot time so server and client render identically, then tick.
  const [now, setNow] = useState(() => (initial ? Date.parse(initial.generatedAt) : Date.now()));

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0); // sync to the real clock right after hydration
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  // "Trending" = most votes + comments among deals posted in the last 6 hours (needs real activity).
  const trending = useMemo(() => {
    const scored = deals
      .filter((d) => now - new Date(d.created_at).getTime() < 6 * 3_600_000 && d.expired_votes < 3)
      .map((d) => ({ id: d.id, a: d.legit_votes + d.fake_votes + d.comment_count * 2 }))
      .filter((x) => x.a >= 5)
      .sort((a, b) => b.a - a.a)
      .slice(0, 3);
    return new Set(scored.map((x) => x.id));
  }, [deals, now]);

  const list = useMemo(() => {
    let out = deals.filter((d) => matches(d, query));
    if (cat !== "all") out = out.filter((d) => d.category === cat);
    if (loc === "online") out = out.filter((d) => d.location_type !== "in-store");
    else if (loc !== "all") out = out.filter((d) => d.county === loc);
    if (shop) out = out.filter((d) => d.retailer === shop);
    if (proofOnly) out = out.filter((d) => !d.prior_price || d.prior_evidence_url);
    if (sort === "saved") out = out.filter((d) => saved.includes(d.id));
    if (spot) {
      const s = spot.toLowerCase();
      out = out.filter((d) => d.location_type !== "online" && [d.store_branch, d.title, d.note, d.county].filter(Boolean).join(" ").toLowerCase().includes(s));
    }
    if (sort === "instore") out = out.filter((d) => d.location_type !== "online");
    if (sort === "disputed") out = out.filter((d) => d.fake_votes >= 2 && d.fake_votes >= d.legit_votes);
    const byTime = (a: Deal, b: Deal) => b.created_at.localeCompare(a.created_at);
    if (sort === "hot") out = [...out].sort((a, b) => hotScore(b, now) - hotScore(a, now) || byTime(a, b));
    else if (sort === "biggest") out = [...out].sort((a, b) => (percentOff(b.sale_price, b.prior_price) ?? -1) - (percentOff(a.sale_price, a.prior_price) ?? -1) || byTime(a, b));
    else if (sort === "disputed") out = [...out].sort((a, b) => b.fake_votes - a.fake_votes || byTime(a, b));
    else out = [...out].sort(byTime);
    return out;
  }, [deals, query, cat, loc, spot, shop, proofOnly, saved, sort, now]);

  const shops = useMemo(() => {
    const n = new Map<string, number>();
    for (const d of deals) n.set(d.retailer, (n.get(d.retailer) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([r]) => r);
  }, [deals]);
  const event = eventStatus(now);

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {event && (
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
            <p className="text-base font-extrabold">{event.label}</p>
            <p className="text-sm text-slate-300">{event.sub} · <a href="/guide" className="font-semibold text-emerald-300 underline">Is this deal genuine?</a></p>
          </div>
        )}
        <PollStrip polls={polls} show={ready || seeded} />

        {/* Pinned sort row: a direct child of the feed column so it stays stuck while the feed scrolls. */}
        <div className="sticky top-[var(--header-h)] z-30 -mx-3 bg-slate-50/95 px-3 py-2 backdrop-blur sm:mx-0 sm:px-0">
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Sort deals">
            {SORTS.map((s) => (
              <button key={s.id} role="tab" aria-selected={sort === s.id} onClick={() => { setSort(s.id); setLimit(20); }} className={chip(sort === s.id)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Categories">
            <button onClick={() => setCat("all")} className={chip(cat === "all")}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" aria-label="In-store hotspots">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Spotted at</span>
            {HOTSPOTS.map((h) => (
              <button key={h} onClick={() => setSpot(spot === h ? null : h)} aria-pressed={spot === h} className={chip(spot === h)}>{h}</button>
            ))}
          </div>
          {shops.length > 1 && (
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto" aria-label="Shops">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Shop</span>
              {shops.map((r) => (
                <button key={r} onClick={() => setShop(shop === r ? null : r)} aria-pressed={shop === r} className={chip(shop === r)}>{r}</button>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={proofOnly} onChange={(e) => setProofOnly(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Hide deals with an unproven &ldquo;was&rdquo; price
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="loc" className="text-sm font-medium text-slate-600">Where</label>
            <select id="loc" value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base">
              <option value="all">All Ireland</option>
              <option value="online">Online (ships to Ireland)</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="ml-auto text-xs text-slate-500">{ready || seeded ? `${list.length} deal${list.length === 1 ? "" : "s"}` : ""}</span>
          </div>
        </div>

        <details className="rounded-xl border border-slate-200 bg-white lg:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Irish Pulse &amp; Ask the community</summary>
          <div className="px-3 pb-3"><Sidebar deals={deals} discussions={discussions} now={now} /></div>
        </details>

        {!ready && !seeded ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading deals">
            {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-200" />)}
          </div>
        ) : loadError && deals.length === 0 ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Could not load deals: {loadError}{" "}
            <button onClick={() => void refresh()} className="font-semibold underline">Try again</button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-800">{sort === "saved" ? "Nothing saved yet. Tap the bookmark on a deal." : "No deals match yet."}</p>
            <p className="mt-1 text-sm text-slate-600">Seen a real bargain or a suspicious price? Be the first to post it.</p>
            <button onClick={() => requireAuth() && openModal({ type: "post" })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              <Plus size={16} /> Post a deal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.slice(0, limit).map((d) => <DealCard key={d.id} deal={d} trending={trending.has(d.id)} />)}
            {list.length > limit && (
              <button onClick={() => setLimit((l) => l + 20)} className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Show more deals
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="hidden lg:block"><div className="sticky top-[calc(var(--header-h)+1rem)]"><Sidebar deals={deals} discussions={discussions} now={now} /></div></aside>
    </div>
  );
}
