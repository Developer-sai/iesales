"use client";

import { Flag, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { COUNTIES } from "@/lib/constants";
import { timeAgo } from "@/lib/hotScore";
import type { Deal, Discussion } from "@/lib/types";

function Pulse({ deals, now }: { deals: Deal[]; now: number }) {
  const stats = useMemo(() => {
    const dayAgo = now - 24 * 3_600_000;
    const today = deals.filter((d) => new Date(d.created_at).getTime() > dayAgo).length;
    const verified = deals.filter((d) => {
      const t = d.legit_votes + d.fake_votes;
      return t >= 5 && d.legit_votes / t >= 0.7;
    }).length;
    const counties = new Set(deals.map((d) => d.county).filter(Boolean)).size;
    return { today, verified, counties, total: deals.length };
  }, [deals, now]);
  const cell = (n: number, label: string) => (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{n}</div>
      <div className="text-[11px] leading-tight text-slate-600">{label}</div>
    </div>
  );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-bold text-slate-900">🇮🇪 Live Irish pulse</h2>
      <div className="grid grid-cols-3 gap-2">
        {cell(stats.today, "posted in 24h")}
        {cell(stats.verified, "well-voted bargains")}
        {cell(stats.counties, "counties active")}
      </div>
      <p className="mt-2 text-xs text-slate-500">{stats.total} deals listed. Prices are community-reported and unverified.</p>
    </section>
  );
}

function Thread({ d }: { d: Discussion }) {
  const { addReply, requireAuth, openModal, me } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth() || !text.trim()) return;
    setBusy(true);
    try { await addReply(d.id, text.trim()); setText(""); } catch { /* toast shown */ } finally { setBusy(false); }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{d.question}</p>
        <button onClick={() => requireAuth() && openModal({ type: "report", target: "discussion", id: d.id })} aria-label="Report question" className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600">
          <Flag size={12} />
        </button>
      </div>
      <p className="text-xs text-slate-500">{d.username}{d.county ? ` · ${d.county}` : ""} · <span suppressHydrationWarning>{timeAgo(d.created_at)}</span></p>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 text-xs font-semibold text-emerald-700">
        {open ? "Hide replies" : `Reply / ${d.replies.length} repl${d.replies.length === 1 ? "y" : "ies"}`}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {d.replies.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 rounded bg-slate-50 p-2">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{r.body}</p>
                <p className="text-[11px] text-slate-500">{r.username} · <span suppressHydrationWarning>{timeAgo(r.created_at)}</span></p>
              </div>
              <button onClick={() => requireAuth() && openModal({ type: "report", target: "reply", id: r.id })} aria-label="Report reply" className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-600">
                <Flag size={11} />
              </button>
            </div>
          ))}
          <form onSubmit={send} className="flex gap-1.5">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={me ? "Write a reply" : "Sign in to reply"} aria-label="Reply" onFocus={() => { if (!me) requireAuth(); }}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            <button disabled={busy || !text.trim()} aria-label="Send reply" className="rounded-lg bg-emerald-600 px-2.5 text-white disabled:opacity-50"><Send size={14} /></button>
          </form>
        </div>
      )}
    </li>
  );
}

function Ask({ discussions }: { discussions: Discussion[] }) {
  const { createDiscussion, requireAuth, me } = useApp();
  const [q, setQ] = useState("");
  const [county, setCounty] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth() || q.trim().length < 5) return;
    setBusy(true);
    try { await createDiscussion(q.trim(), county || null); setQ(""); } catch { /* toast shown */ } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-bold text-slate-900">💬 Ask the community</h2>
      <p className="mb-2 text-xs text-slate-500">Queues, stock, returns. Everything here is shopper opinion, so check with the shop.</p>
      <form onSubmit={submit} className="space-y-1.5">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} maxLength={280} rows={2} aria-label="Your question"
          onFocus={() => { if (!me) requireAuth(); }}
          placeholder="e.g. Is the queue long at Kildare Village right now?"
          className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        <div className="flex gap-1.5">
          <select value={county} onChange={(e) => setCounty(e.target.value)} aria-label="County (optional)" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
            <option value="">Any county</option>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button disabled={busy || q.trim().length < 5} className="rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50">Ask</button>
        </div>
      </form>
      <ul className="mt-3 space-y-2">
        {discussions.length === 0 && <li className="text-sm text-slate-500">No questions yet. Ask the first one.</li>}
        {discussions.slice(0, 8).map((d) => <Thread key={d.id} d={d} />)}
      </ul>
    </section>
  );
}

export function Sidebar({ deals, discussions, now }: { deals: Deal[]; discussions: Discussion[]; now: number }) {
  return (
    <div className="space-y-3">
      <Pulse deals={deals} now={now} />
      <Ask discussions={discussions} />
    </div>
  );
}
