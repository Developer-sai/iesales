"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Field, Modal, btnPrimary, inputCls } from "../Modal";

export function PollModal() {
  const { closeModal, createPoll } = useApp();
  const [mode, setMode] = useState<"buy" | "poll">("buy");
  const [item, setItem] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let q: string;
    let opts: string[];
    if (mode === "buy") {
      if (item.trim().length < 3) { setErr("Tell us what you're thinking of buying."); return; }
      q = `Should I buy: ${item.trim()}?`;
      opts = ["✅ Worth it", "❌ Skip / overpriced"];
    } else {
      q = question.trim();
      opts = options.map((o) => o.trim()).filter(Boolean);
      if (q.length < 5) { setErr("Add a question (at least 5 characters)."); return; }
      if (opts.length < 2) { setErr("Add at least two options."); return; }
    }
    setBusy(true);
    setErr(null);
    try { await createPoll(q.slice(0, 140), opts); closeModal(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Could not create the poll."); setBusy(false); }
  }

  return (
    <Modal title="Start a poll" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-1.5">
          {([["buy", "Should I buy this?"], ["poll", "Custom poll"]] as const).map(([id, label]) => (
            <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium ${mode === id ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>{label}</button>
          ))}
        </div>
        {mode === "buy" ? (
          <Field label="What are you thinking of buying?" hint="Name the item and the price, e.g. “Sony WH-1000XM5 for €249 at a named shop”. Keep it to text, no links.">
            <input className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} maxLength={110} />
          </Field>
        ) : (
          <>
            <Field label="Question"><input className={inputCls} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} /></Field>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Options (2 to 6)</span>
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={o} aria-label={`Option ${i + 1}`} maxLength={80} onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))} />
                  {options.length > 2 && (
                    <button type="button" aria-label="Remove option" onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} className="rounded-lg border border-slate-300 px-2 text-slate-500"><X size={16} /></button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button" onClick={() => setOptions((os) => [...os, ""])} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Plus size={14} /> Add option</button>
              )}
            </div>
          </>
        )}
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "Creating…" : "Create poll"}</button>
      </form>
    </Modal>
  );
}
