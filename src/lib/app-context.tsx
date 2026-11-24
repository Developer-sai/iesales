"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DemoApi } from "./api/demo";
import { LiveApi } from "./api/live";
import { IS_LIVE } from "./constants";
import type {
  Api, Deal, Discussion, FlagReason, FlagTarget, Me, MyVotes, NewDeal, Poll, VoteType,
} from "./types";

export type ModalState =
  | null
  | { type: "auth" }
  | { type: "post" }
  | { type: "poll" }
  | { type: "profile" }
  | { type: "pledge" }
  | { type: "terms" }
  | { type: "privacy" }
  | { type: "notice" }
  | { type: "report"; target: FlagTarget; id: string };

export interface Toast { id: number; msg: string; kind: "ok" | "err" }

interface AppState {
  api: Api;
  mode: "demo" | "live";
  me: Me | null;
  ready: boolean;
  loadError: string | null;
  deals: Deal[];
  polls: Poll[];
  discussions: Discussion[];
  myVotes: MyVotes;
  query: string;
  setQuery: (q: string) => void;
  modal: ModalState;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  toast: Toast | null;
  notify: (msg: string, kind?: "ok" | "err") => void;
  requireAuth: () => boolean;
  refresh: (fresh?: boolean) => Promise<void>;
  voteDeal: (deal: Deal, vote: VoteType) => Promise<void>;
  votePoll: (poll: Poll, index: number) => Promise<void>;
  createDeal: (input: NewDeal, photo: Blob | null) => Promise<void>;
  deleteDeal: (deal: Deal) => Promise<void>;
  createPoll: (q: string, options: string[]) => Promise<void>;
  createDiscussion: (q: string, county: string | null) => Promise<void>;
  addReply: (id: string, body: string) => Promise<void>;
  addComment: (dealId: string, body: string) => Promise<void>;
  report: (target: FlagTarget, id: string, reason: FlagReason, explanation: string | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

const msgOf = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

interface VoteEntry { at: number; vote: VoteType | null }

export function AppProvider({ children }: { children: ReactNode }) {
  const [api] = useState<Api>(() => (IS_LIVE ? new LiveApi() : new DemoApi()));
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [myVotes, setMyVotes] = useState<MyVotes>({ deals: {}, polls: {} });
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read-your-writes bookkeeping. The CDN copy of the feed can be a few seconds
  // older than the user's own vote, so we replay local votes on top of any snapshot
  // that was generated before them.
  const voteLog = useRef<Record<string, VoteEntry[]>>({});
  const pollLog = useRef<Record<string, { at: number; index: number }>>({});
  // Monotonic reads: never let an older snapshot overwrite a newer one.
  const lastSnapshot = useRef(0);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const refresh = useCallback(async (fresh = false) => {
    try {
      const [feed, v] = await Promise.all([api.loadFeed(fresh), api.getMyVotes()]);
      const g = Date.parse(feed.generatedAt);
      if (g < lastSnapshot.current) return; // stale response arrived late
      lastSnapshot.current = g;

      const adjusted = feed.deals.map((d): Deal => {
        const log = voteLog.current[d.id];
        if (!log || log.length === 0) return d;
        const current = log[log.length - 1].vote;
        let inSnapshot: VoteType | null = log[0].vote;
        for (const e of log) if (e.at <= g) inSnapshot = e.vote;
        if (log[log.length - 1].at <= g) delete voteLog.current[d.id]; // snapshot already includes everything
        if (inSnapshot === current) return d;
        const n = { ...d };
        if (inSnapshot) n[`${inSnapshot}_votes` as "legit_votes"] = Math.max(0, n[`${inSnapshot}_votes` as "legit_votes"] - 1);
        if (current) n[`${current}_votes` as "legit_votes"] += 1;
        return n;
      });

      const adjustedPolls = feed.polls.map((p): Poll => {
        const log = pollLog.current[p.id];
        if (!log) return p;
        if (log.at <= g) { delete pollLog.current[p.id]; return p; }
        return { ...p, option_counts: p.option_counts.map((c, i) => (i === log.index ? c + 1 : c)) };
      });

      // My own votes are per-user and always read live from the database.
      const mine: MyVotes = { deals: { ...v.deals }, polls: { ...v.polls } };
      for (const [id, log] of Object.entries(voteLog.current)) {
        const cur = log[log.length - 1].vote;
        if (cur) mine.deals[id] = cur; else delete mine.deals[id];
      }
      for (const [id, l] of Object.entries(pollLog.current)) mine.polls[id] = l.index;

      setDeals(adjusted);
      setPolls(adjustedPolls);
      setDiscussions(feed.discussions);
      setMyVotes(mine);
      setLoadError(null);
    } catch (e) {
      setLoadError(msgOf(e));
    } finally {
      setReady(true);
    }
  }, [api]);

  // auth
  useEffect(() => {
    let alive = true;
    api.getMe().then((m) => { if (alive) setMe(m); }).catch(() => undefined);
    const off = api.onAuthChange((m) => { if (alive) setMe(m); });
    return () => { alive = false; off(); };
  }, [api]);

  // data
  const meId = me?.id ?? null;
  useEffect(() => { void refresh(); }, [refresh, meId]); // CDN-cached read; only per-user votes hit the DB

  // background refresh (CDN-cached polling in live mode)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = api.subscribe(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void refresh(), 500 + Math.random() * 1500); // jitter
    });
    return () => { off(); if (t) clearTimeout(t); };
  }, [api, refresh]);

  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);

  const requireAuth = useCallback(() => {
    if (me) return true;
    setModal({ type: "auth" });
    return false;
  }, [me]);

  const guard = useCallback(async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) notify(ok);
    } catch (e) {
      notify(msgOf(e), "err");
      throw e;
    }
  }, [notify]);

  const voteDeal = useCallback(async (deal: Deal, vote: VoteType) => {
    if (!requireAuth()) return;
    const prev = myVotes.deals[deal.id] ?? null;
    const next = prev === vote ? null : vote;
    const log = (voteLog.current[deal.id] ??= [{ at: 0, vote: prev }]);
    log.push({ at: Date.now(), vote: next });
    setDeals((ds) => ds.map((d) => {
      if (d.id !== deal.id) return d;
      const n = { ...d };
      if (prev) n[`${prev}_votes` as "legit_votes"] = Math.max(0, n[`${prev}_votes` as "legit_votes"] - 1);
      if (next) n[`${next}_votes` as "legit_votes"] += 1;
      return n;
    }));
    setMyVotes((v) => {
      const deals2 = { ...v.deals };
      if (next) deals2[deal.id] = next; else delete deals2[deal.id];
      return { ...v, deals: deals2 };
    });
    try {
      await api.voteDeal(deal.id, next, prev);
    } catch (e) {
      notify(msgOf(e), "err");
      delete voteLog.current[deal.id];
      void refresh(true);
    }
  }, [api, myVotes.deals, notify, refresh, requireAuth]);

  const votePoll = useCallback(async (poll: Poll, index: number) => {
    if (!requireAuth()) return;
    if (myVotes.polls[poll.id] !== undefined) return;
    pollLog.current[poll.id] = { at: Date.now(), index };
    setPolls((ps) => ps.map((p) => (p.id === poll.id ? { ...p, option_counts: p.option_counts.map((c, i) => (i === index ? c + 1 : c)) } : p)));
    setMyVotes((v) => ({ ...v, polls: { ...v.polls, [poll.id]: index } }));
    try {
      await api.votePoll(poll.id, index);
    } catch (e) {
      notify(msgOf(e), "err");
      delete pollLog.current[poll.id];
      void refresh(true);
    }
  }, [api, myVotes.polls, notify, refresh, requireAuth]);

  const value = useMemo<AppState>(() => ({
    api, mode: api.mode, me, ready, loadError, deals, polls, discussions, myVotes, query, setQuery,
    modal, openModal, closeModal, toast, notify, requireAuth, refresh, voteDeal, votePoll,
    createDeal: (input, photo) => guard(async () => { await api.createDeal(input, photo); await refresh(true); }, "Deal posted. Thanks for helping other shoppers!"),
    deleteDeal: (deal) => guard(async () => { await api.deleteDeal(deal); await refresh(true); }, "Deal deleted."),
    createPoll: (q, options) => guard(async () => { await api.createPoll(q, options); await refresh(true); }, "Poll created."),
    createDiscussion: (q, county) => guard(async () => { await api.createDiscussion(q, county); await refresh(true); }, "Question posted."),
    addReply: (id, body) => guard(async () => { await api.addReply(id, body); await refresh(true); }),
    addComment: (dealId, body) => guard(async () => { await api.addComment(dealId, body); await refresh(true); }),
    report: (target, id, reason, explanation) => guard(async () => { await api.flag(target, id, reason, explanation); }, "Thanks, your report was received. We review reports promptly."),
    signOut: async () => { await api.signOut(); setMe(null); setMyVotes({ deals: {}, polls: {} }); voteLog.current = {}; pollLog.current = {}; notify("Signed out."); },
  }), [api, me, ready, loadError, deals, polls, discussions, myVotes, query, modal, openModal, closeModal, toast, notify, requireAuth, refresh, voteDeal, votePoll, guard]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
