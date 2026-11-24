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

  return (
    <article id={`deal-${deal.id}`} style={defaultOpen ? undefined : { contentVisibility: "auto", containIntrinsicSize: "auto 320px" }}
      className={`relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4 ${expired ? "opacity-70" : ""}`}>
      {expired && (
        <span className="absolute right-3 top-3 rotate-3 rounded border-2 border-rose-500 px-2 py-0.5 text-xs font-extrabold tracking-wide text-rose-600">
          EXPIRED / SOLD OUT
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${pillClass(deal.retailer)}`}>{deal.retailer}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
          {deal.location_type === "online" ? <Globe size={12} /> : <MapPin size={12} />}{place}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
          <CategoryIcon category={deal.category} size={12} />{catLabel}
        </span>
        <span className="text-slate-500" suppressHydrationWarning>{deal.location_type === "online" ? "Posted" : "Spotted"} {timeAgo(deal.created_at)}</span>
        {trending && !expired && <span className="rounded bg-orange-100 px-1.5 py-0.5 font-bold text-orange-800">🔥 Trending</span>}
        {deal.is_demo && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">DEMO</span>}
      </div>

      <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900">{deal.title}</h3>
      <p className="text-sm text-slate-600">
        {deal.brand} · posted by <span className="font-medium">{deal.username ?? "a former member"}</span>
        {deal.is_editor && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-800" title="Posted by the iesales.ie editor team">
            <BadgeCheck size={11} /> Editor
          </span>
        )}
      </p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-3xl font-extrabold tracking-tight text-emerald-700">{formatEuro(deal.sale_price)}</span>
        {deal.prior_price && (
          <>
            <span className="text-base text-slate-500 line-through">{formatEuro(deal.prior_price)}</span>
            {off !== null && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{off}% OFF</span>}
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Sale price {formatEuro(deal.sale_price)}{deal.prior_price ? ` · claimed 30-day-low ${formatEuro(deal.prior_price)}` : ""} · community-reported, unverified
        {deal.prior_evidence_url && (
          <> · <a href={deal.prior_evidence_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-emerald-700 underline">price history evidence</a></>
        )}
      </p>
      {deal.prior_price && !deal.prior_evidence_url && (
        <p className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">No evidence for the prior price. Check the shop&apos;s own page.</p>
      )}

      {deal.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{deal.note}</p>}

      {deal.image_path && (
        <figure className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={api.photoUrl(deal.image_path)} alt={`Shopper's own photo of the shelf price for ${deal.title}`} loading="lazy" className="max-h-72 w-full rounded-lg border border-slate-200 object-cover" />
          <figcaption className="mt-1 text-xs text-slate-500">Photo taken and uploaded by a shopper.</figcaption>
        </figure>
      )}

      {deal.promo_code && (
        <button onClick={copyCode} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-500 bg-emerald-50 px-2.5 py-1 font-mono text-sm font-semibold text-emerald-800">
          {copied ? <Check size={14} /> : <Copy size={14} />} {deal.promo_code} <span className="font-sans text-xs font-normal text-emerald-700">{copied ? "copied" : "tap to copy"}</span>
        </button>
      )}

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={v.label}>
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: voted ? `${legitPct}%` : "0%" }} />
        </div>
        <p className={`mt-1 text-xs font-medium ${v.tone === "good" ? "text-emerald-700" : v.tone === "bad" ? "text-rose-700" : "text-slate-500"}`}>{v.label}</p>
        <div className="mt-2 flex gap-1.5">
          {btn("legit", <Flame size={14} />, "Legit bargain", deal.legit_votes, "border-emerald-600 bg-emerald-600 text-white")}
          {btn("fake", <Flag size={14} />, "Misleading price", deal.fake_votes, "border-rose-600 bg-rose-600 text-white")}
          {btn("expired", <AlertTriangle size={14} />, "Expired", deal.expired_votes, "border-amber-500 bg-amber-500 text-white")}
          <button
            onClick={() => { toggleSaved(deal.id); notify(saved ? "Removed from saved." : "Saved on this device."); }}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved deals" : "Save this deal on this device"}
            className={`flex shrink-0 items-center justify-center rounded-lg border px-2.5 py-2 ${saved ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm">
        {deal.deal_url && (
          <a href={deal.deal_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-700">
            <Store size={14} /> View deal <ExternalLink size={12} />
          </a>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
          <MessageCircle size={14} /> Discuss ({deal.comment_count})
        </button>
        <a href={whatsappLink(deal)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 font-semibold text-white hover:brightness-95">
          <Send size={14} /> WhatsApp
        </a>
        <button onClick={() => void share()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50" aria-label="Share this deal">
          <Share2 size={14} /> Share
        </button>
        <span className="ml-auto flex items-center gap-1">
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
            className="inline-flex items-center gap-1 rounded p-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Report this deal"
          >
            <Flag size={14} /> Report
          </button>
        </span>
      </div>

      {open && <CommentsPanel dealId={deal.id} />}
    </article>
  );
}
