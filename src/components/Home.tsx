"use client";

import { ArrowRight, Plus, ShieldCheck, Tag, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, COUNTIES, HOTSPOTS } from "@/lib/constants";
import { eventStatus, saleCalendar } from "@/lib/events";
import { formatEuro, hotScore, isExpired, percentOff } from "@/lib/hotScore";
import { useSaved } from "@/lib/saved";
import type { Category, Deal, Feed } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
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
  `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${active ? "border-slate-900 bg-slate-900 text-white shadow" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`;

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
  const calendar = useMemo(() => saleCalendar(now, 6), [now]);
  const stats = useMemo(() => {
    const offs = deals.map((d) => percentOff(d.sale_price, d.prior_price)).filter((n): n is number => n !== null);
    return { total: deals.length, avg: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : 0, shops: new Set(deals.map((d) => d.retailer)).size };
  }, [deals]);
  const topPicks = useMemo(
    () => [...deals].filter((d) => !isExpired(d) && percentOff(d.sale_price, d.prior_price) !== null).sort((a, b) => hotScore(b, now) - hotScore(a, now)).slice(0, 10),
    [deals, now],
  );
  const catCount = useMemo(() => {
    const n = new Map<string, number>();
    for (const d of deals) n.set(d.category, (n.get(d.category) ?? 0) + 1);
    return n;
  }, [deals]);
  const filtered = cat !== "all" || loc !== "all" || spot !== null || shop !== null || proofOnly || query !== "" || sort !== "hot";


  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131921] via-[#1d2b3a] to-emerald-900 p-5 text-white shadow-lg sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative">
            {event && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">{event.emoji} {event.label}</span>}
            <h1 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Real Irish deals, checked by real shoppers.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
              {event ? `${event.sub} ` : ""}Spot a bargain, vote on whether it is legit, and skip the fake &ldquo;was&rdquo; prices. Free, ad-free, no affiliate links.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button onClick={() => requireAuth() && openModal({ type: "post" })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900 shadow hover:bg-amber-300">
                <Plus size={16} /> Post a deal
              </button>
              <Link href="/guide" className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                Is this deal genuine? <ArrowRight size={14} />
              </Link>
            </div>
            <dl className="mt-5 grid max-w-xl grid-cols-3 gap-2 text-center">
              {[
                { icon: <Tag size={14} />, v: stats.total, l: "live deals" },
                { icon: <TrendingUp size={14} />, v: stats.avg ? `${stats.avg}%` : "-", l: "avg. saving" },
                { icon: <Users size={14} />, v: stats.shops, l: "shops covered" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
                  <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-300">{x.icon}{x.l}</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{x.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <ul className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 sm:grid-cols-4">
          {["Community-verified votes", "Evidence for “was” prices", "Zero ads, zero affiliate links", "Online and in-store, all 26 counties"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" /><span>{t}</span>
            </li>
          ))}
        </ul>

        <section aria-label="Sale calendar">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">🗓️ Irish sale calendar</h2>
            <span className="text-xs text-slate-500">Deals all year round</span>
          </div>
          <div className="no-scrollbar -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {calendar.map((e) => (
              <div key={e.id} className={`w-44 shrink-0 rounded-xl border p-3 shadow-sm ${e.live ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <p className="text-2xl" aria-hidden>{e.emoji}</p>
                <p className="mt-1 text-sm font-bold leading-tight text-slate-900">{e.name}</p>
                <p className={`mt-1 text-xs font-semibold ${e.live ? "text-rose-600" : "text-slate-500"}`}>
                  {e.live ? (e.days <= 1 ? "Live, ends today" : `Live, ${e.days} days left`) : e.days <= 1 ? "Starts tomorrow" : `Starts in ${e.days} days`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Shop by category">
          <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {[{ id: "all" as const, label: "All deals" }, ...CATEGORIES].map((c) => {
              const active = cat === c.id;
              return (
                <button key={c.id} onClick={() => { setCat(c.id); setLimit(20); }} aria-pressed={active} className="group flex w-20 shrink-0 flex-col items-center gap-1.5 text-center sm:w-24">
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-sm transition sm:h-[4.5rem] sm:w-[4.5rem] ${active ? "border-amber-400 bg-amber-50 text-slate-900 ring-4 ring-amber-200" : "border-slate-200 bg-white text-slate-600 group-hover:border-amber-300 group-hover:shadow-md"}`}>
                    {c.id === "all" ? <Tag size={24} /> : <CategoryIcon category={c.id} size={26} />}
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${active ? "text-slate-900" : "text-slate-600"}`}>{c.label}</span>
                  {c.id !== "all" && catCount.get(c.id) ? <span className="-mt-1 text-[10px] text-slate-400">{catCount.get(c.id)} deals</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        {!filtered && topPicks.length >= 4 && (
          <section aria-label="Top picks">
            <div className="mb-2 flex items-end justify-between">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">🔥 Top picks right now</h2>
              <button onClick={() => setSort("biggest")} className="text-sm font-semibold text-emerald-700 hover:underline">See biggest savings</button>
            </div>
            <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
              {topPicks.map((d) => {
                const off = percentOff(d.sale_price, d.prior_price);
                return (
                  <Link key={d.id} href={`/deal/${d.id}`} className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:w-48">
                    <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
                      <CategoryIcon category={d.category} size={40} />
                      {off !== null && <span className="absolute left-0 top-2 rounded-r-md bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">{off}% OFF</span>}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{d.retailer}</p>
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-slate-900">{d.title}</p>
                      <p className="mt-1 flex items-baseline gap-1.5"><span className="text-lg font-extrabold text-slate-900">{formatEuro(d.sale_price)}</span>{d.prior_price && <span className="text-xs text-slate-400 line-through">{formatEuro(d.prior_price)}</span>}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
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
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading deals">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-slate-200" />)}
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
          <div className="grid gap-4 sm:grid-cols-2">
            {list.slice(0, limit).map((d) => <DealCard key={d.id} deal={d} trending={trending.has(d.id)} />)}
            {list.length > limit && (
              <button onClick={() => setLimit((l) => l + 20)} className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-2">
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
