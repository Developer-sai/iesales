import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import type {
  Api, Comment, Deal, Feed, FlagReason, FlagTarget, Me, ModItem, MyVotes, NewDeal, NewNotice,
  Notice, VoteType,
} from "../types";

type Row = Record<string, unknown>;
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

const TABLE: Record<FlagTarget, string> = {
  deal: "deals", comment: "comments", poll: "polls", discussion: "discussions", reply: "discussion_replies",
};

function friendly(error: { code?: string; message: string } | null): Error | null {
  if (!error) return null;
  if (error.code === "42501") return new Error("You need to be signed in to do that.");
  if (error.code === "23505") return new Error("That already exists.");
  if (error.code === "23514") return new Error("Some details were not valid. Please check the form.");
  return new Error(error.message);
}

export class LiveApi implements Api {
  mode = "live" as const;
  private sb: SupabaseClient = getSupabase();

  private async buildMe(id: string, email: string | null): Promise<Me | null> {
    const [{ data: p }, { data: mod }] = await Promise.all([
      this.sb.from("profiles").select("username, avatar_color").eq("id", id).maybeSingle(),
      this.sb.rpc("is_moderator"),
    ]);
    if (!p) return null;
    return { id, email, username: p.username as string, avatar_color: p.avatar_color as string, isModerator: mod === true };
  }

  async getMe(): Promise<Me | null> {
    const { data } = await this.sb.auth.getSession();
    const u = data.session?.user;
    return u ? this.buildMe(u.id, u.email ?? null) : null;
  }

  onAuthChange(cb: (me: Me | null) => void): () => void {
    const { data } = this.sb.auth.onAuthStateChange((_event, session) => {
      // Defer: never call supabase inside the auth callback itself.
      setTimeout(async () => {
        const u = session?.user;
        cb(u ? await this.buildMe(u.id, u.email ?? null) : null);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }

  async signInGoogle() {
    const next = encodeURIComponent(window.location.pathname);
    const { error } = await this.sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (error) throw error;
  }

  async signInMagicLink(email: string) {
    const next = encodeURIComponent(window.location.pathname);
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (error) throw error;
  }

  async signInDemo() {
    throw new Error("Demo sign-in is only available in demo mode.");
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  /** One request for the whole home screen, served from the CDN. */
  async loadFeed(fresh = false): Promise<Feed> {
    const res = await fetch(fresh ? `/api/feed?fresh=${Date.now()}` : "/api/feed");
    if (!res.ok) throw new Error("The deal feed is temporarily unavailable. Showing the last version we have.");
    return (await res.json()) as Feed;
  }

  async myHiddenDeals(): Promise<Deal[]> {
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) return [];
    const { data, error } = await this.sb.from("deal_feed").select("*").eq("is_hidden", true).eq("user_id", u.user.id);
    if (error) throw friendly(error);
    return (data ?? []) as unknown as Deal[];
  }

  async getMyVotes(): Promise<MyVotes> {
    const out: MyVotes = { deals: {}, polls: {} };
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) return out;
    const [d, p] = await Promise.all([
      this.sb.from("deal_votes").select("deal_id, vote_type"),
      this.sb.from("poll_votes").select("poll_id, option_index"),
    ]);
    (d.data ?? []).forEach((r) => { out.deals[r.deal_id as string] = r.vote_type as VoteType; });
    (p.data ?? []).forEach((r) => { out.polls[r.poll_id as string] = r.option_index as number; });
    return out;
  }

  async createDeal(input: NewDeal, photo: Blob | null): Promise<Deal> {
    let path: string | null = null;
    if (photo) {
      const { data: u } = await this.sb.auth.getUser();
      if (!u.user) throw new Error("You need to be signed in to do that.");
      path = `${u.user.id}/${crypto.randomUUID()}.jpg`;
      const up = await this.sb.storage.from("deal-photos").upload(path, photo, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error("Photo upload failed: " + up.error.message);
    }
    // Client-generated id = idempotency key: a retried submit hits the primary key
    // instead of creating a duplicate deal.
    const id = crypto.randomUUID();
    const { error } = await this.sb.from("deals").insert({ id, ...input, image_path: path });
    if (error && error.code !== "23505") {
      if (path) await this.sb.storage.from("deal-photos").remove([path]);
      throw friendly(error);
    }
    const { data } = await this.sb.from("deal_feed").select("*").eq("id", id).maybeSingle();
    if (!data) throw new Error("Your deal was saved but could not be loaded yet. It will appear shortly.");
    return data as unknown as Deal;
  }

  async deleteDeal(deal: Deal) {
    const { data } = await this.sb.from("deals").select("image_path").eq("id", deal.id).maybeSingle();
    const path = (data?.image_path as string | null) ?? null;
    const { error } = await this.sb.from("deals").delete().eq("id", deal.id);
    if (error) throw friendly(error);
    if (path) await this.sb.storage.from("deal-photos").remove([path]);
  }

  async voteDeal(dealId: string, vote: VoteType | null, previous: VoteType | null) {
    if (vote === null) {
      const { error } = await this.sb.from("deal_votes").delete().eq("deal_id", dealId);
      if (error) throw friendly(error);
    } else if (previous) {
      const { error } = await this.sb.from("deal_votes").update({ vote_type: vote }).eq("deal_id", dealId);
      if (error) throw friendly(error);
    } else {
      const { error } = await this.sb.from("deal_votes").insert({ deal_id: dealId, vote_type: vote });
      if (error) throw friendly(error);
    }
  }

  async listComments(dealId: string): Promise<Comment[]> {
    const { data, error } = await this.sb.from("comments")
      .select("id, deal_id, user_id, body, created_at, profiles(username, avatar_color)")
      .eq("deal_id", dealId).eq("is_hidden", false).order("created_at", { ascending: true }).limit(100);
    if (error) throw friendly(error);
    return ((data ?? []) as unknown as Row[]).map((r) => {
      const p = one(r.profiles as { username: string; avatar_color: string } | null);
      return {
        id: r.id as string, deal_id: r.deal_id as string, user_id: r.user_id as string,
        body: r.body as string, created_at: r.created_at as string,
        username: p?.username ?? "Shopper", avatar_color: p?.avatar_color ?? "#059669",
      };
    });
  }

  async addComment(dealId: string, body: string) {
    const { error } = await this.sb.from("comments").insert({ deal_id: dealId, body });
    if (error) throw friendly(error);
  }

  async createPoll(question: string, options: string[]) {
    const { error } = await this.sb.from("polls").insert({ question, options });
    if (error) throw friendly(error);
  }

  async votePoll(pollId: string, optionIndex: number) {
    const { error } = await this.sb.from("poll_votes").insert({ poll_id: pollId, option_index: optionIndex });
    if (error) throw friendly(error);
  }

  async createDiscussion(question: string, county: string | null) {
    const { error } = await this.sb.from("discussions").insert({ question, county });
    if (error) throw friendly(error);
  }

  async addReply(discussionId: string, body: string) {
    const { error } = await this.sb.from("discussion_replies").insert({ discussion_id: discussionId, body });
    if (error) throw friendly(error);
  }

  async flag(target: FlagTarget, id: string, reason: FlagReason, explanation: string | null) {
    const { error } = await this.sb.from("post_flags").insert({ target_type: target, target_id: id, reason, explanation });
    if (error) {
      if (error.code === "23505") throw new Error("You have already reported this.");
      throw friendly(error);
    }
  }

  async updateUsername(username: string) {
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) throw new Error("You need to be signed in to do that.");
    const { error } = await this.sb.from("profiles").update({ username }).eq("id", u.user.id);
    if (error) {
      if (error.code === "23505") throw new Error("That username is taken.");
      if (error.code === "23514") throw new Error("Use 3-24 letters, numbers or underscores.");
      throw friendly(error);
    }
  }

  async deleteAccount() {
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) throw new Error("You need to be signed in to do that.");
    const bucket = this.sb.storage.from("deal-photos");
    const { data: files } = await bucket.list(u.user.id, { limit: 1000 });
    if (files && files.length) await bucket.remove(files.map((f) => `${u.user!.id}/${f.name}`));
    const { error } = await this.sb.rpc("delete_my_account");
    if (error) throw friendly(error);
    await this.sb.auth.signOut();
  }

  async submitNotice(n: NewNotice) {
    const { error } = await this.sb.from("takedown_notices").insert({ ...n, good_faith: true });
    if (error) throw friendly(error);
  }

  /**
   * Polling instead of Realtime sockets: the poll hits the CDN-cached /api/feed, so
   * it costs the database nothing, and it never hits connection limits in a spike.
   * Jitter spreads clients out (no thundering herd); hidden tabs do not poll.
   */
  subscribe(cb: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { timer = setTimeout(tick, 30_000 + Math.random() * 20_000); };
    const tick = () => { if (document.visibilityState === "visible") cb(); schedule(); };
    const onVisible = () => { if (document.visibilityState === "visible") cb(); };
    document.addEventListener("visibilitychange", onVisible);
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }

  photoUrl(path: string) {
    return this.sb.storage.from("deal-photos").getPublicUrl(path).data.publicUrl;
  }

  async modQueue(): Promise<{ items: ModItem[]; notices: Notice[] }> {
    const items: ModItem[] = [];
    const text: Record<FlagTarget, string> = { deal: "title", comment: "body", poll: "question", discussion: "question", reply: "body" };
    await Promise.all((Object.keys(TABLE) as FlagTarget[]).map(async (t) => {
      const cols = ["id", text[t], "moderation_reason", "flag_count"].concat(t === "deal" ? ["image_path"] : []).join(",");
      const { data } = await this.sb.from(TABLE[t]).select(cols).eq("is_hidden", true).limit(100);
      ((data ?? []) as unknown as Row[]).forEach((r) => items.push({
        type: t, id: r.id as string, text: String(r[text[t]]), reason: (r.moderation_reason as string | null) ?? null,
        flag_count: Number(r.flag_count ?? 0), image_path: (r.image_path as string | null) ?? null,
      }));
    }));
    const since = new Date(Date.now() - 72 * 3_600_000).toISOString();
    const { data: photos } = await this.sb.from("deals").select("id, title, flag_count, image_path")
      .not("image_path", "is", null).eq("photo_approved", false).eq("is_hidden", false).gte("created_at", since).limit(50);
    ((photos ?? []) as unknown as Row[]).forEach((r) => items.push({
      type: "deal", id: r.id as string, text: String(r.title), reason: null, flag_count: Number(r.flag_count ?? 0),
      image_path: r.image_path as string, photo_pending: true,
    }));
    const { data: notices } = await this.sb.from("takedown_notices").select("*").eq("status", "open")
      .order("created_at", { ascending: false }).limit(50);
    return { items, notices: (notices ?? []) as unknown as Notice[] };
  }

  async moderate(type: FlagTarget, id: string, hide: boolean, reason: string | null) {
    const { error } = await this.sb.rpc("moderate_content", { p_type: type, p_id: id, p_hide: hide, p_reason: reason });
    if (error) throw friendly(error);
  }

  async removeContent(type: FlagTarget, id: string, imagePath?: string | null) {
    if (imagePath) await this.sb.storage.from("deal-photos").remove([imagePath]);
    const { error } = await this.sb.from(TABLE[type]).delete().eq("id", id);
    if (error) throw friendly(error);
  }

  async approvePhoto(dealId: string, ok: boolean) {
    const { error } = await this.sb.rpc("set_photo_approved", { p_deal: dealId, p_ok: ok });
    if (error) throw friendly(error);
  }

  async setNoticeStatus(id: string, status: "actioned" | "rejected") {
    const { error } = await this.sb.from("takedown_notices").update({ status }).eq("id", id);
    if (error) throw friendly(error);
  }
}
