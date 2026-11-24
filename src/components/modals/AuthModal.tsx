"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { MIN_AGE } from "@/lib/constants";
import { Modal, btnGhost, btnPrimary, inputCls } from "../Modal";

export function AuthModal() {
  const { api, mode, closeModal, openModal, notify } = useApp();
  const [agree, setAgree] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<void>, after?: () => void) {
    if (!agree) { setErr(`Please confirm you are ${MIN_AGE} or over and agree to the Terms and Privacy Policy.`); return; }
    setBusy(true);
    setErr(null);
    try { await fn(); after?.(); } catch (e) { setErr(e instanceof Error ? e.message : "Sign-in failed."); } finally { setBusy(false); }
  }

  return (
    <Modal title="Sign in to iesales.ie" onClose={closeModal}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Browsing is always open. You only need an account to post, vote, comment or report. We store just your email and a username.</p>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            I&apos;m {MIN_AGE} or over and I agree to the{" "}
            <button type="button" onClick={() => openModal({ type: "terms" })} className="font-semibold text-emerald-700 underline">Terms</button> and{" "}
            <button type="button" onClick={() => openModal({ type: "privacy" })} className="font-semibold text-emerald-700 underline">Privacy Policy</button>.
          </span>
        </label>

        {mode === "demo" ? (
          <>
            <button className={`${btnPrimary} w-full`} disabled={busy} onClick={() => run(() => api.signInDemo(), () => { notify("Signed in to the demo."); closeModal(); })}>
              Continue in demo mode
            </button>
            <p className="text-xs text-slate-500">Google and email sign-in switch on once Supabase keys are added.</p>
          </>
        ) : sent ? (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Check your inbox for a sign-in link. Open it in this same browser.</p>
        ) : (
          <>
            <button className={`${btnGhost} w-full`} disabled={busy} onClick={() => run(() => api.signInGoogle())}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
            <form onSubmit={(e) => { e.preventDefault(); void run(() => api.signInMagicLink(email.trim()), () => setSent(true)); }} className="space-y-2">
              <input className={inputCls} type="email" required autoComplete="email" placeholder="you@example.ie" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
              <button className={`${btnPrimary} w-full`} disabled={busy || !email.includes("@")}><Mail size={16} /> Email me a sign-in link</button>
            </form>
          </>
        )}
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
      </div>
    </Modal>
  );
}
