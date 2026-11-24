"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { CONTACT_EMAIL } from "@/lib/constants";
import { Field, Modal, btnPrimary, inputCls } from "../Modal";

/** EU DSA Art. 16-style notice form. Anyone can submit, signed in or not. */
export function NoticeModal() {
  const { api, closeModal, notify } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  const [good, setGood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (why.trim().length < 20) { setErr("Please explain the problem in at least 20 characters."); return; }
    if (!good) { setErr("Please confirm the statement of good faith."); return; }
    setBusy(true);
    setErr(null);
    try {
      await api.submitNotice({ notifier_name: name.trim() || null, notifier_email: email.trim(), target_url: url.trim(), explanation: why.trim() });
      notify("Notice received. We will review it and may contact you by email.");
      closeModal();
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not send the notice."); setBusy(false); }
  }

  return (
    <Modal title="Notice of illegal content" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-slate-600">Use this form to tell us about content you believe is illegal. You can also email <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        <Field label="Your name (optional)"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
        <Field label="Your email"><input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></Field>
        <Field label="Address (URL) of the content"><input className={inputCls} required value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://iesales.ie/deal/…" /></Field>
        <Field label="Why is it illegal?" hint="Explain clearly which law or right you think is affected."><textarea className={inputCls} rows={4} required minLength={20} maxLength={2000} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={good} onChange={(e) => setGood(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>I confirm I am submitting this notice in good faith and that the information is accurate and complete.</span>
        </label>
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "Sending…" : "Submit notice"}</button>
      </form>
    </Modal>
  );
}
