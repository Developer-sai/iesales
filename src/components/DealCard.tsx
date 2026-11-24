"use client";

import {
  AlertTriangle, BadgeCheck, Bookmark, Check, Copy, ExternalLink, Flag, Flame, Globe, MapPin, MessageCircle, Send, Share2, Store, Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, pillClass } from "@/lib/constants";
import { formatEuro, isExpired, percentOff, timeAgo, verdict } from "@/lib/hotScore";
import { toggleSaved, useSaved } from "@/lib/saved";
import { dealUrl, shareText, whatsappLink } from "@/lib/share";
import type { Comment, Deal } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

function CommentsPanel({ dealId }: { dealId: string }) {
  const { api, me, addComment, requireAuth, openModal } = useApp();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setComments(await api.listComments(dealId)); } catch { setComments([]); }
  }, [api, dealId]);

  useEffect(() => {
    let alive = true;
    api.listComments(dealId).then((c) => { if (alive) setComments(c); }).catch(() => { if (alive) setComments([]); });
    return () => { alive = false; };
  }, [api, dealId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    setBusy(true);
    try {
      await addComment(dealId, body.trim());
      setBody("");
      await load();
    } catch { /* toast already shown */ } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      {comments === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet. Share what you know, like a price history link or stock check.</p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: c.avatar_color }}>
                {c.username.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{c.username}</span> · {timeAgo(c.created_at)}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{c.body}</p>
              </div>
              <button
                onClick={() => requireAuth() && openModal({ type: "report", target: "comment", id: c.id })}
                aria-label="Report comment"
                className="self-start rounded p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-600"
              >
                <Flag size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder={me ? "Add a comment (no personal details)" : "Sign in to comment"}
          aria-label="Add a comment"
          onFocus={() => { if (!me) requireAuth(); }}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button disabled={busy || !body.trim()} className="rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50" aria-label="Send comment">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export function DealCard({ deal, defaultOpen = false, trending = false }: { deal: Deal; defaultOpen?: boolean; trending?: boolean }) {
  const { api, me, myVotes, voteDeal, openModal, requireAuth, notify, deleteDeal } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const saved = useSaved().includes(deal.id);
  const mine = myVotes.deals[deal.id];
  const off = percentOff(deal.sale_price, deal.prior_price);
  const v = verdict(deal);
  const expired = isExpired(deal);
  const voted = deal.legit_votes + deal.fake_votes;
  const legitPct = voted ? (deal.legit_votes / voted) * 100 : 0;
  const catLabel = CATEGORIES.find((c) => c.id === deal.category)?.label ?? "Other";
  const place = deal.location_type === "online"
    ? "Online"
    : `In-store: ${deal.county ?? "Ireland"}${deal.store_branch ? ` - ${deal.store_branch}` : ""}${deal.location_type === "both" ? " + online" : ""}`;

  async function copyCode() {
    if (!deal.promo_code) return;
    try { await navigator.clipboard.writeText(deal.promo_code); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { notify("Could not copy. Long-press the code to copy it.", "err"); }
  }

  async function share() {
    const text = shareText(deal);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: deal.title, text }); } catch { /* user cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(text); notify("Link copied. Paste it anywhere."); } catch { notify(dealUrl(deal.id)); }
  }

  const btn = (type: "legit" | "fake" | "expired", icon: React.ReactNode, label: string, count: number, active: string) => (
    <button
      onClick={() => void voteDeal(deal, type)}
      aria-pressed={mine === type}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold sm:text-sm ${mine === type ? active : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}<span className="whitespace-nowrap">{label}</span><span className="tabular-nums opacity-80">({count})</span>
    </button>
  );

  const stat = (label: string, n: number) => (
    <span className="text-[11px] text-slate-500"><b className="tabular-nums text-slate-700">{n}</b> {label}</span>
  );

  return (
    <article id={`deal-${deal.id}`} style={defaultOpen ? undefined : { contentVisibility: "auto", containIntrinsicSize: "auto 520px" }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 ${expired ? "opacity-70" : ""}`}>
      <div className={`relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 ${defaultOpen ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        {deal.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={api.photoUrl(deal.image_path)} alt={`Shopper's own photo of the shelf price for ${deal.title}`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
            <CategoryIcon category={deal.category} size={52} />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{catLabel}</span>
          </div>
        )}
        {off !== null && (
          <span className="absolute left-0 top-3 rounded-r-lg bg-gradient-to-r from-rose-600 to-rose-500 px-3 py-1 text-sm font-extrabold tracking-tight text-white shadow-md">
            {off}% OFF
          </span>
        )}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {trending && !expired && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">🔥 Trending</span>}
          {deal.is_demo && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow">DEMO</span>}
          <button
            onClick={() => { toggleSaved(deal.id); notify(saved ? "Removed from saved." : "Saved on this device."); }}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved deals" : "Save this deal on this device"}
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur transition ${saved ? "bg-rose-500 text-white" : "bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500"}`}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <span className={`absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-xs font-bold shadow ring-1 ${pillClass(deal.retailer)}`}>{deal.retailer}</span>
        {expired && (
          <span className="absolute inset-x-0 bottom-0 bg-rose-600/95 py-1 text-center text-xs font-extrabold tracking-widest text-white">EXPIRED / SOLD OUT</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide text-slate-600">{deal.brand}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">{deal.location_type === "online" ? <Globe size={12} /> : <MapPin size={12} />}{place}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-slate-900">{deal.title}</h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">{formatEuro(deal.sale_price)}</span>
          {deal.prior_price && <span className="text-sm text-slate-400 line-through">{formatEuro(deal.prior_price)}</span>}
          {deal.prior_price && off !== null && <span className="text-sm font-bold text-emerald-600">Save {formatEuro(deal.prior_price - deal.sale_price)}</span>}
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Community-reported, unverified{deal.prior_price ? " · claimed 30-day-low" : ""}
          {deal.prior_evidence_url && (
            <> · <a href={deal.prior_evidence_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-emerald-700 underline">price history</a></>
          )}
        </p>
        {deal.prior_price && !deal.prior_evidence_url && (
          <p className="mt-1 inline-block self-start rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">No evidence for the prior price. Check the shop&apos;s own page.</p>
        )}

        {deal.note && <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-600">{deal.note}</p>}

        {deal.promo_code && (
          <button onClick={copyCode} className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg border border-dashed border-emerald-500 bg-emerald-50 px-2.5 py-1 font-mono text-sm font-semibold text-emerald-800">
            {copied ? <Check size={14} /> : <Copy size={14} />} {deal.promo_code} <span className="font-sans text-xs font-normal text-emerald-700">{copied ? "copied" : "tap to copy"}</span>
          </button>
        )}

        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={v.label}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: voted ? `${legitPct}%` : "0%" }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className={`text-xs font-semibold ${v.tone === "good" ? "text-emerald-700" : v.tone === "bad" ? "text-rose-700" : "text-slate-500"}`}>{v.label}</p>
            <span className="flex gap-2">{stat("legit", deal.legit_votes)}{stat("disputed", deal.fake_votes)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {btn("legit", <Flame size={14} />, "Legit", deal.legit_votes, "border-emerald-600 bg-emerald-600 text-white")}
            {btn("fake", <Flag size={14} />, "Misleading", deal.fake_votes, "border-rose-600 bg-rose-600 text-white")}
            {btn("expired", <AlertTriangle size={14} />, "Expired", deal.expired_votes, "border-amber-500 bg-amber-500 text-white")}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm">
          {deal.deal_url && (
            <a href={deal.deal_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 font-bold text-slate-900 shadow-sm hover:bg-amber-300">
              <Store size={14} /> View deal <ExternalLink size={12} />
            </a>
          )}
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Discuss, ${deal.comment_count} comments`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            <MessageCircle size={14} /> {deal.comment_count}
          </button>
          <a href={whatsappLink(deal)} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="inline-flex items-center justify-center rounded-lg bg-[#25D366] px-2.5 py-2 text-white hover:brightness-95">
            <Send size={14} />
          </a>
          <button onClick={() => void share()} className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-2.5 py-2 text-slate-700 hover:bg-slate-50" aria-label="Share this deal">
            <Share2 size={14} />
          </button>
          {me && deal.user_id === me.id && (
            <button
              onClick={() => { if (window.confirm("Delete this deal?")) void deleteDeal(deal); }}
              aria-label="Delete my deal"
              className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={() => requireAuth() && openModal({ type: "report", target: "deal", id: deal.id })}
            className="ml-auto inline-flex items-center gap-1 rounded p-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Report this deal"
          >
            <Flag size={14} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
          <span className="truncate">by {deal.username ?? "a former member"}</span>
          {deal.is_editor && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 font-bold text-sky-800" title="Posted by the iesales.ie editor team">
              <BadgeCheck size={11} /> Editor
            </span>
          )}
          <span aria-hidden>·</span>
          <span className="shrink-0" suppressHydrationWarning>{deal.location_type === "online" ? "Posted" : "Spotted"} {timeAgo(deal.created_at)}</span>
        </p>

        {open && <CommentsPanel dealId={deal.id} />}
      </div>
    </article>
  );
}
