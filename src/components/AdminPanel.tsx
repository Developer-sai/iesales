"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/hotScore";
import type { ModItem, Notice } from "@/lib/types";
import { btnGhost } from "./Modal";

export function AdminPanel() {
  const { api, me, mode, ready, notify } = useApp();
  const [items, setItems] = useState<ModItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const q = await api.modQueue();
      setItems(q.items);
      setNotices(q.notices);
    } catch (e) { notify(e instanceof Error ? e.message : "Could not load the queue.", "err"); }
    finally { setLoading(false); }
  }, [api, notify]);

  useEffect(() => {
    if (!me?.isModerator) return;
    let alive = true;
    api.modQueue()
      .then((q) => { if (alive) { setItems(q.items); setNotices(q.notices); } })
      .catch((e) => notify(e instanceof Error ? e.message : "Could not load the queue.", "err"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [me, api, notify]);

  async function act(fn: () => Promise<void>, ok: string) {
    try { await fn(); notify(ok); await load(); } catch (e) { notify(e instanceof Error ? e.message : "Action failed.", "err"); }
  }

  if (!ready) return <div className="p-6 text-slate-500">Loading…</div>;
  if (mode === "demo") return <Wrap><p>The moderation queue works once Supabase is connected.</p></Wrap>;
  if (!me?.isModerator) {
    return <Wrap><p>You need to be signed in as a moderator to see this page.</p><p className="mt-2 text-sm text-slate-500">Add yourself with the SQL snippet at the bottom of <code>supabase/schema.sql</code>.</p></Wrap>;
  }

  return (
    <Wrap>
      <h1 className="text-xl font-extrabold text-slate-900">Moderation queue</h1>
      <p className="mb-4 text-sm text-slate-600">Hidden content awaiting review, recent photos, and takedown notices. Always record a reason when you keep something hidden: the author sees it.</p>

      <h2 className="mt-4 font-bold">Hidden or pending ({items.length})</h2>
      {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-sm text-slate-500">Nothing to review.</p> : (
        <ul className="mt-2 space-y-3">
          {items.map((it) => (
            <li key={`${it.type}-${it.id}-${it.photo_pending ? "p" : "h"}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{it.type}{it.photo_pending ? " · photo awaiting approval" : ` · ${it.flag_count} flags`}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{it.text}</p>
              {it.reason && <p className="mt-1 text-xs text-slate-500">Reason: {it.reason}</p>}
              {it.image_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={api.photoUrl(it.image_path)} alt="Uploaded photo for review" className="mt-2 max-h-48 rounded border border-slate-200" />
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {it.photo_pending ? (
                  <button className={btnGhost} onClick={() => act(() => api.approvePhoto(it.id, true), "Photo approved.")}>Approve photo</button>
                ) : (
                  <button className={btnGhost} onClick={() => act(() => api.moderate(it.type, it.id, false, null), "Restored.")}>Restore</button>
                )}
                {!it.photo_pending && (
                  <button className={btnGhost} onClick={() => {
                    const reason = window.prompt("Reason shown to the author:", it.reason ?? "");
                    if (reason) void act(() => api.moderate(it.type, it.id, true, reason), "Kept hidden with reason.");
                  }}>Keep hidden…</button>
                )}
                <button className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => {
                  if (window.confirm("Permanently delete this?")) void act(() => api.removeContent(it.type, it.id, it.image_path), "Deleted.");
                }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-bold">Takedown notices ({notices.length})</h2>
      {notices.length === 0 ? <p className="text-sm text-slate-500">No open notices.</p> : (
        <ul className="mt-2 space-y-3">
          {notices.map((n) => (
            <li key={n.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs text-slate-500">{timeAgo(n.created_at)} · {n.notifier_name ?? "Anonymous"} · {n.notifier_email}</p>
              <p className="mt-1 break-all font-medium">{n.target_url}</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{n.explanation}</p>
              <div className="mt-2 flex gap-2">
                <button className={btnGhost} onClick={() => act(() => api.setNoticeStatus(n.id, "actioned"), "Marked actioned.")}>Mark actioned</button>
                <button className={btnGhost} onClick={() => act(() => api.setNoticeStatus(n.id, "rejected"), "Marked rejected.")}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="mb-3 inline-block text-sm font-semibold text-emerald-700">← Back to deals</Link>
      <div>{children}</div>
    </div>
  );
}
