"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { Deal } from "@/lib/types";
import { Field, Modal, btnGhost, btnPrimary, inputCls } from "../Modal";

export function ProfileModal() {
  const { api, me, closeModal, signOut, notify, refresh } = useApp();
  const [username, setUsername] = useState(me?.username ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Deal[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { api.myHiddenDeals().then(setHidden).catch(() => setHidden([])); }, [api]);

  if (!me) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try { await api.updateUsername(username.trim()); notify("Username updated."); await refresh(true); }
    catch (x) { setErr(x instanceof Error ? x.message : "Could not update."); } finally { setBusy(false); }
  }

  async function del() {
    setBusy(true);
    setErr(null);
    try {
      await api.deleteAccount();
      notify("Your account and data have been deleted.");
      closeModal();
      await refresh(true);
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not delete the account."); setBusy(false); }
  }

  return (
    <Modal title="Your profile" onClose={closeModal}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: me.avatar_color }}>{me.username.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{me.username}</p>
            <p className="truncate text-sm text-slate-500">{me.email ?? "Demo account"}</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-2">
          <Field label="Username" hint="3-24 letters, numbers or underscores. This is public.">
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
          </Field>
          <button className={btnPrimary} disabled={busy || username.trim() === me.username}>Save username</button>
        </form>

        {hidden.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Your posts that are hidden</p>
            <ul className="mt-1 space-y-2">
              {hidden.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.title}</span>: {d.moderation_reason ?? "Hidden pending review."}{" "}
                  <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Appeal: " + d.title)}`}>Appeal this decision</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {me.isModerator && <Link href="/admin" onClick={closeModal} className={btnGhost}>Moderation queue</Link>}
          <button className={btnGhost} onClick={() => { void signOut(); closeModal(); }}>Sign out</button>
        </div>

        <div className="border-t border-slate-200 pt-3">
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="text-sm font-semibold text-rose-700 underline">Delete my account &amp; data</button>
          ) : (
            <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-900">
                This permanently deletes your account, deals, photos, votes, comments, polls, questions and reports. It cannot be undone.
                Type <strong>DELETE</strong> to confirm.
              </p>
              <input className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" />
              <div className="flex gap-2">
                <button disabled={confirmText !== "DELETE" || busy} onClick={() => void del()} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? "Deleting…" : "Delete everything"}
                </button>
                <button className={btnGhost} onClick={() => { setShowDelete(false); setConfirmText(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        {err && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800">{err}</p>}
      </div>
    </Modal>
  );
}
