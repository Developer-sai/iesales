"use client";

import { Flag } from "lucide-react";
import { useApp } from "@/lib/app-context";
import type { Poll } from "@/lib/types";

function PollCard({ poll }: { poll: Poll }) {
  const { myVotes, votePoll, requireAuth, openModal } = useApp();
  const mine = myVotes.polls[poll.id];
  const voted = mine !== undefined;
  const total = poll.option_counts.reduce((a, b) => a + b, 0);

  return (
    <div className="w-[270px] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:w-[320px] sm:p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{poll.is_pinned && "📌 "}{poll.question}</p>
        <button
          onClick={() => requireAuth() && openModal({ type: "report", target: "poll", id: poll.id })}
          aria-label="Report this poll"
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Flag size={14} />
        </button>
      </div>
      <div className={voted ? "space-y-1.5" : "flex flex-wrap gap-1.5"}>
        {poll.options.map((opt, i) => {
          const count = poll.option_counts[i] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return voted ? (
            <div key={i} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ${mine === i ? "bg-emerald-200" : "bg-slate-200"}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex justify-between gap-2">
                <span className={mine === i ? "font-semibold" : ""}>{opt}</span>
                <span className="tabular-nums text-slate-600">{pct}% · {count}</span>
              </div>
            </div>
          ) : (
            <button
              key={i}
              onClick={() => void votePoll(poll, i)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-left text-sm hover:border-emerald-500 hover:bg-emerald-50"
            >
              {opt}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">{total} vote{total === 1 ? "" : "s"}{!voted && " · sign in to vote once"}</p>
    </div>
  );
}

export function PollStrip({ polls, show }: { polls: Poll[]; show: boolean }) {
  if (!show || polls.length === 0) return null;
  return (
    <section aria-label="Live polls" className="-mx-3 sm:mx-0">
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:px-0">
        {polls.map((p) => <PollCard key={p.id} poll={p} />)}
      </div>
    </section>
  );
}
