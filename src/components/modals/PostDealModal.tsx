"use client";

import { Camera, Link2, Loader2, Sparkles, X } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, COUNTIES, HOTSPOTS, IS_LIVE, RETAILER_SUGGESTIONS } from "@/lib/constants";
import { findDuplicates } from "@/lib/dedupe";
import type { Enriched, EnrichResponse } from "@/lib/enrich-types";
import { formatEuro } from "@/lib/hotScore";
import { processPhoto } from "@/lib/image";
import type { Category, LocationType, NewDeal } from "@/lib/types";
import { Field, Modal, btnPrimary, inputCls } from "../Modal";

const isHttps = (s: string) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(s.trim());
const num = (s: string) => parseFloat(s.replace(",", "."));

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(blob);
  });
}

type Ai = { status: "idle" | "loading" | "done" | "error"; source?: "link" | "photo"; forUrl?: string; data?: Enriched; msg?: string; filled?: string[] };

export function PostDealModal() {
  const { closeModal, createDeal, deals } = useApp();
  const [f, setF] = useState({
    title: "", brand: "", category: "other" as Category, retailer: "", location_type: "online" as LocationType,
    county: "", branch: "", url: "", sale: "", prior: "", evidence: "", promo: "", note: "",
  });
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [own, setOwn] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [ai, setAi] = useState<Ai>({ status: "idle" });
  const linkRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const dTitle = useDeferredValue(f.title);
  const dUrl = useDeferredValue(f.url);
  const dupes = useMemo(() => findDuplicates(deals, { title: dTitle, retailer: f.retailer, url: dUrl }), [deals, dTitle, f.retailer, dUrl]);

  const inStore = f.location_type !== "online";
  const needsUrl = f.location_type !== "in-store";
  const linkVisible = needsUrl || showLink;

  /** Fills only the boxes the shopper left empty, then remembers what it did. */
  function apply(d: Enriched, source: "link" | "photo", forUrl?: string) {
    const filled: string[] = [];
    setF((cur) => {
      const next = { ...cur };
      if (!cur.title.trim() && d.title) { next.title = d.title; filled.push("product"); }
      if (!cur.brand.trim() && d.brand) next.brand = d.brand;
      if (!cur.retailer.trim() && d.retailer) { next.retailer = d.retailer; filled.push("shop"); }
      if (!cur.sale.trim() && d.sale_price) { next.sale = String(d.sale_price); filled.push("price"); }
      if (!cur.promo.trim() && d.promo_code) next.promo = d.promo_code;
      if (!cur.note.trim() && d.notes) next.note = d.notes;
      if (d.category && cur.category === "other") next.category = d.category;
      return next;
    });
    setAi({ status: "done", source, forUrl, data: d, filled });
  }

  async function ask(payload: { url: string } | { image: string }, source: "link" | "photo", forUrl?: string) {
    setAi({ status: "loading", source, forUrl });
    setWarn(null);
    try {
      const res = await fetch("/api/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = (await res.json()) as EnrichResponse;
      if (!json.ok) { setAi({ status: "error", source, forUrl, msg: json.message }); return; }
      if (!json.data.page_ok) {
        setAi({ status: "error", source, forUrl, msg: source === "photo" ? "We couldn't read a product or price in that photo. Fill in the boxes by hand." : "That doesn't look like a product page we can read. Fill in the boxes by hand." });
        return;
      }
      apply(json.data, source, forUrl);
    } catch {
      setAi({ status: "error", source, forUrl, msg: "Couldn't read that. Fill in the boxes by hand." });
    }
  }

  function readLink() {
    const url = f.url.trim();
    if (!IS_LIVE || !isHttps(url) || ai.status === "loading" || (ai.forUrl === url && ai.status !== "error")) return;
    void ask({ url }, "link", url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setErr(null);
      const blob = await processPhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setOwn(false);
      if (!f.url.trim()) set("location_type", "in-store"); // a snapped price tag is almost always in a shop
      if (IS_LIVE) void ask({ image: await toDataUrl(blob) }, "photo");
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not use that photo.");
    }
  }

  function validate(): string | null {
    if (f.title.trim().length < 3) return "What is it? Add the product name.";
    const sale = num(f.sale);
    if (!(sale > 0)) return "Enter the price in euro.";
    if (!f.retailer.trim()) return "Which shop is it in?";
    if (needsUrl && !isHttps(f.url)) return "Online deals need a link starting with https://";
    if (f.url.trim() && !isHttps(f.url)) return "The link must start with https://";
    if (inStore && !f.county) return "Which county is the shop in?";
    if (f.prior.trim()) {
      const prior = num(f.prior);
      if (!(prior > sale)) return "The old price must be higher than the sale price.";
      if (!isHttps(f.evidence) && !photo) return "For an old price, add a price-history link or a photo of the old price (in More details).";
    }
    if (f.evidence.trim() && !isHttps(f.evidence)) return "The evidence link must start with https://";
    if (photo && !own) return "Tick the box to confirm you took the photo, or remove it.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setErr(null);
    // Gentle price check against what the shop page showed when we read it (advice, never a block).
    const page = ai.status === "done" && ai.source === "link" && ai.forUrl === f.url.trim() ? ai.data?.sale_price : null;
    if (page && !warn && Math.abs(num(f.sale) - page) / page > 0.1) {
      setWarn(`The shop page showed ${formatEuro(page)} when we read it, but you entered ${formatEuro(num(f.sale))}. If yours is a different size, colour, store or time, post it and say so in the note. Otherwise check the price and press Post again.`);
      return;
    }
    setBusy(true);
    const input: NewDeal = {
      title: f.title.trim(), brand: f.brand.trim() || "Unbranded", category: f.category, retailer: f.retailer.trim(),
      location_type: f.location_type, county: inStore ? f.county : null, store_branch: inStore ? f.branch.trim() || null : null,
      deal_url: f.url.trim() || null, sale_price: num(f.sale), prior_price: f.prior.trim() ? num(f.prior) : null,
      prior_evidence_url: f.evidence.trim() || null, promo_code: f.promo.trim() || null, note: f.note.trim() || null,
    };
    try {
      await createDeal(input, photo?.blob ?? null);
      closeModal();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not post the deal.");
      setBusy(false);
    }
  }

  const tile = "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50 px-3 py-4 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-100";

  return (
    <Modal title="Post a deal" onClose={closeModal} wide>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="flex gap-2">
          <label className={`${tile} cursor-pointer`}>
            <Camera size={22} /> Snap the price tag
            <span className="text-xs font-normal text-emerald-700">{IS_LIVE ? "We'll read it for you" : "Add a photo"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFile} className="sr-only" />
          </label>
          <button type="button" className={tile} onClick={() => { setShowLink(true); setTimeout(() => linkRef.current?.focus(), 0); }}>
            <Link2 size={22} /> Paste a link
            <span className="text-xs font-normal text-emerald-700">{IS_LIVE ? "We'll fill it in" : "Online deals"}</span>
          </button>
        </div>

        {ai.status === "loading" && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">
            <Loader2 size={15} className="animate-spin" /> {ai.source === "photo" ? "Reading your photo and checking Irish prices…" : "Reading the shop's page and checking Irish prices…"}
          </p>
        )}
        {ai.status === "error" && ai.msg && <p role="status" className="rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">{ai.msg}</p>}
        {ai.status === "done" && ai.data && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-950">
            <p className="font-semibold"><Sparkles size={14} className="mr-1 inline" />{ai.source === "photo" ? "Read from your photo." : "Read from the shop's page."} Please check it.</p>
            {ai.data.warnings.map((w) => <p key={w} className="mt-1 rounded bg-amber-100 p-1.5 text-xs text-amber-900">{w}</p>)}
            {ai.data.in_stock === false && <p className="mt-0.5 text-xs">The page says it is out of stock.</p>}
            {ai.data.prior_price && ai.data.sale_price && !f.prior.trim() && (
              <p className="mt-1 text-xs">
                An old price of {formatEuro(ai.data.prior_price)} is shown.{" "}
                <button type="button" className="font-semibold underline" onClick={() => set("prior", String(ai.data?.prior_price ?? ""))}>Use as old price</button>
                {" "}(you must still add proof it was the lowest price in the last 30 days).
              </p>
            )}
            {ai.data.comparisons.length > 0 && (
              <div className="mt-1.5 text-xs">
                <p className="font-semibold">Other Irish prices found:</p>
                <ul className="list-disc pl-5">
                  {ai.data.comparisons.map((c) => (
                    <li key={c.url}><a className="underline" href={c.url} target="_blank" rel="noopener noreferrer nofollow">{c.retailer}: {formatEuro(c.price)}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {linkVisible && (
          <Field label={needsUrl ? "Link to the deal" : "Link (optional)"}>
            <input ref={linkRef} className={inputCls} type="url" inputMode="url" value={f.url} onChange={(e) => set("url", e.target.value)} onBlur={readLink}
              onPaste={() => setTimeout(readLink, 50)} maxLength={500} placeholder="https://" />
          </Field>
        )}

        <Field label="What is it?"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="e.g. 55-inch 4K TV" /></Field>
        {dupes.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900" role="status">
            <p className="font-semibold">This might already be posted:</p>
            <ul className="mt-1 list-disc pl-5">
              {dupes.map((d) => (
                <li key={d.id}><a className="underline" href={`/deal/${d.id}`} target="_blank" rel="noopener noreferrer">{d.title} at {d.retailer} ({formatEuro(d.sale_price)})</a></li>
              ))}
            </ul>
            <p className="mt-1 text-xs">A vote or comment on the existing deal helps more than a duplicate.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (€)"><input className={`${inputCls} text-lg font-bold`} inputMode="decimal" value={f.sale} onChange={(e) => set("sale", e.target.value)} placeholder="249" /></Field>
          <Field label="Shop">
            <input className={inputCls} list="retailers" value={f.retailer} onChange={(e) => set("retailer", e.target.value)} maxLength={60} placeholder="e.g. Harvey Norman" />
            <datalist id="retailers">{RETAILER_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Where?</legend>
          <div className="flex gap-1.5">
            {(["online", "in-store", "both"] as const).map((t) => (
              <button type="button" key={t} aria-pressed={f.location_type === t} onClick={() => set("location_type", t)}
                className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium ${f.location_type === t ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                {t === "online" ? "Online" : t === "in-store" ? "In a shop" : "Both"}
              </button>
            ))}
          </div>
        </fieldset>
        {inStore && (
          <Field label="County">
            <select className={inputCls} value={f.county} onChange={(e) => set("county", e.target.value)}>
              <option value="">Choose…</option>
              {COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        )}

        {photo && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Your photo preview" className="h-20 w-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => { setPhoto(null); setOwn(false); }} className="inline-flex items-center gap-1 text-sm text-rose-700"><X size={14} /> Remove photo</button>
                <label className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>I took this photo myself. It shows no identifiable people and no copied graphics, and iesales.ie may display it with this deal. Location data is removed.</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">More details (optional)</summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand"><input className={inputCls} value={f.brand} onChange={(e) => set("brand", e.target.value)} maxLength={60} /></Field>
              <Field label="Category">
                <select className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value as Category)}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            </div>
            {inStore && (
              <Field label="Shop or centre">
                <input className={inputCls} list="spots" value={f.branch} onChange={(e) => set("branch", e.target.value)} maxLength={80} placeholder="e.g. Kildare Village" />
                <datalist id="spots">{HOTSPOTS.map((h) => <option key={h} value={h} />)}</datalist>
              </Field>
            )}
            <Field label="Old price (€)" hint="Irish law: the old price must be the lowest price in the 30 days before the sale. Add proof below.">
              <input className={inputCls} inputMode="decimal" value={f.prior} onChange={(e) => set("prior", e.target.value)} placeholder="379" />
            </Field>
            {f.prior.trim() && (
              <Field label="Proof of the old price" hint="A price-history link (https://), or add a photo of the old price.">
                <input className={inputCls} type="url" inputMode="url" value={f.evidence} onChange={(e) => set("evidence", e.target.value)} maxLength={500} placeholder="https://" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Promo code"><input className={inputCls} value={f.promo} onChange={(e) => set("promo", e.target.value)} maxLength={40} /></Field>
              <Field label="Note"><input className={inputCls} value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={280} placeholder="Stock, queue, conditions…" /></Field>
            </div>
          </div>
        </details>

        {warn && <p role="status" className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">{warn}</p>}
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "Posting…" : "Post deal"}</button>
        <p className="text-center text-xs text-slate-500">
          Only post prices you have seen yourself, with no names, phone numbers or photos of people. Prices are community-reported and unverified. You can delete your deal any time.
          {IS_LIVE ? " Auto-fill sends only your photo or link to an AI reader and may be wrong." : ""}
        </p>
      </form>
    </Modal>
  );
}
