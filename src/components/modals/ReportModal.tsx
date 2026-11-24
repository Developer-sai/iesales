"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { FlagReason, FlagTarget } from "@/lib/types";
import { Field, Modal, btnPrimary, inputCls } from "../Modal";

const REASONS: { id: FlagReason; label: string }[] = [
  { id: "misleading", label: "Misleading or false information" },
  { id: "illegal", label: "Illegal content" },
  { id: "personal_data", label: "Shows personal data or identifiable people" },
  { id: "copyright", label: "Copyright or trademark problem" },
  { id: "spam", label: "Spam or self-promotion" },
  { id: "other", label: "Something else" },
];

export function ReportModal({ target, id }: { target: FlagTarget; id: string }) {
  const { closeModal, report, openModal } = useApp();
  const [reason, setReason] = useState<FlagReason>("misleading");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try { await report(target, id, reason, text.trim() || null); closeModal(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Could not send the report."); setBusy(false); }
  }

  return (
    <Modal title="Report this content" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Why are you reporting it?">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as FlagReason)}>
            {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Details (optional)" hint="Explain briefly. Posts with several independent reports are hidden until a person reviews them.">
          <textarea className={inputCls} rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
        <p className="text-center text-xs text-slate-500">
          Need a formal notice about illegal content?{" "}
          <button type="button" className="font-semibold text-emerald-700 underline" onClick={() => openModal({ type: "notice" })}>Submit a takedown notice</button>
        </p>
      </form>
    </Modal>
  );
}
