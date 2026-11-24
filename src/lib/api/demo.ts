import type {
  Api, Comment, Deal, Discussion, Feed, FlagReason, FlagTarget, Me, ModItem, MyVotes, NewDeal, NewNotice,
  Notice, Poll, VoteType,
} from "../types";

/**
 * Demo backend: in-memory, resets on reload. Every demo deal is sample data
 * using fictional retailers; it is NOT real price information and is labelled
 * as such throughout the UI.
 */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const nowMs = Date.now();
const ago = (mins: number) => new Date(nowMs - mins * 60_000).toISOString();

function demoDeal(p: Partial<Deal> & Pick<Deal, "title" | "retailer" | "category" | "sale_price">): Deal {
  return {
    id: uid(), user_id: "demo-seed", username: "Demo_Editor", avatar_color: "#0ea5e9", is_editor: true, is_demo: true,
    brand: "Sample", location_type: "online", county: null, store_branch: null, deal_url: "https://example.com/",
    prior_price: null, prior_evidence_url: null, promo_code: null, note: null, image_path: null,
    legit_votes: 0, fake_votes: 0, expired_votes: 0, comment_count: 0, created_at: ago(30), ...p,
  };
}

let deals: Deal[] = [
  demoDeal({ title: "Sample wireless headphones", brand: "Acme Audio", retailer: "Demo Electronics", category: "tech", sale_price: 89, prior_price: 129, prior_evidence_url: "https://example.com/history", legit_votes: 14, fake_votes: 2, comment_count: 2, created_at: ago(18), note: "Sample data for demo mode only." }),
  demoDeal({ title: "Sample air fryer 5L", brand: "Acme Home", retailer: "Example Home", category: "home", sale_price: 59, prior_price: 89, prior_evidence_url: "https://example.com/history", legit_votes: 9, fake_votes: 1, created_at: ago(55), promo_code: "SAMPLE10" }),
  demoDeal({ title: "Sample kids building set", brand: "Acme Toys", retailer: "Placeholder Toys", category: "kids", sale_price: 24.99, prior_price: 39.99, prior_evidence_url: "https://example.com/history", legit_votes: 3, fake_votes: 6, created_at: ago(120), note: "Demo of a price that voters dispute." }),
  demoDeal({ title: "Sample winter jacket", brand: "Acme Outdoor", retailer: "Sample Mart", category: "fashion", sale_price: 65, location_type: "in-store", county: "Dublin", store_branch: "Sample branch, Dublin 1", deal_url: null, legit_votes: 5, fake_votes: 0, created_at: ago(8) }),
  demoDeal({ title: "Sample 4K TV 55\"", brand: "Acme Vision", retailer: "Demo Electronics", category: "tech", sale_price: 399, prior_price: 549, prior_evidence_url: "https://example.com/history", location_type: "both", county: "Cork", legit_votes: 22, fake_votes: 4, expired_votes: 3, created_at: ago(300) }),
  demoDeal({ title: "Sample coffee machine", brand: "Acme Brew", retailer: "Example Home", category: "home", sale_price: 119, location_type: "in-store", county: "Galway", store_branch: "Sample branch, Galway", deal_url: null, legit_votes: 2, fake_votes: 0, created_at: ago(3) }),
  demoDeal({ title: "Sample weekend city break", brand: "Acme Travel", retailer: "Sample Travel", category: "travel", sale_price: 149, legit_votes: 6, fake_votes: 1, created_at: ago(200) }),
  demoDeal({ title: "Sample trail running shoes", brand: "Acme Sport", retailer: "Sample Mart", category: "fashion", sale_price: 54, prior_price: 85, prior_evidence_url: "https://example.com/history", legit_votes: 7, fake_votes: 2, created_at: ago(95), location_type: "both", county: "Limerick" }),
];

let polls: Poll[] = [
  { id: uid(), user_id: "demo-seed", question: "What are you mainly hunting for this Black Friday? (demo poll)", options: ["Tech", "Home", "Toys", "Fashion"], option_counts: [12, 7, 9, 4], is_pinned: true, created_at: ago(240) },
  { id: uid(), user_id: "demo-seed", question: "Do you check the price history before buying? (demo poll)", options: ["Always", "Sometimes", "Never"], option_counts: [10, 14, 3], is_pinned: false, created_at: ago(90) },
];

let discussions: Discussion[] = [
  { id: uid(), user_id: "demo-seed", username: "Demo_Shopper", county: "Dublin", question: "Any games consoles in stock in Dublin city centre? (demo question)", created_at: ago(40), replies: [{ id: uid(), discussion_id: "", user_id: "demo-seed", username: "Demo_Editor", body: "Sample reply: check the retailer's own stock checker first.", created_at: ago(20) }] },
  { id: uid(), user_id: "demo-seed", username: "Demo_Shopper", county: "Cork", question: "Which shops take returns on sale items? (demo question)", created_at: ago(150), replies: [] },
];

const commentsByDeal: Record<string, Comment[]> = {};
const myVotes: MyVotes = { deals: {}, polls: {} };
let me: Me | null = null;
const authListeners = new Set<(m: Me | null) => void>();
const setMe = (m: Me | null) => { me = m; authListeners.forEach((l) => l(m)); };

deals.forEach((d) => {
  if (d.comment_count) {
    commentsByDeal[d.id] = Array.from({ length: d.comment_count }, (_, i) => ({
      id: uid(), deal_id: d.id, user_id: "demo-seed", username: i ? "Demo_Shopper" : "Demo_Editor", avatar_color: "#0ea5e9",
      body: i ? "Sample comment: evidence link looks fine." : "Sample comment for demo mode.", created_at: ago(10 + i),
    }));
  }
});
discussions.forEach((d) => d.replies.forEach((r) => { r.discussion_id = d.id; }));

function needMe(): Me {
  if (!me) throw new Error("You need to be signed in to do that.");
  return me;
}

export class DemoApi implements Api {
  mode = "demo" as const;

  async getMe() { return me; }
  onAuthChange(cb: (m: Me | null) => void) { authListeners.add(cb); return () => { authListeners.delete(cb); }; }
  async signInGoogle() { throw new Error("Connect Supabase to enable Google sign-in. Use demo sign-in for now."); }
  async signInMagicLink() { throw new Error("Connect Supabase to enable email sign-in. Use demo sign-in for now."); }
  async signInDemo() {
    setMe({ id: "demo-user", email: null, username: "Demo_Shopper", avatar_color: "#059669", isModerator: false });
  }
  async signOut() { setMe(null); myVotes.deals = {}; myVotes.polls = {}; }

  async loadFeed(): Promise<Feed> {
    return {
      deals: [...deals],
      polls: [...polls].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.created_at.localeCompare(a.created_at)),
      discussions: discussions.map((d) => ({ ...d, replies: [...d.replies] })),
      generatedAt: new Date().toISOString(),
    };
  }
  async myHiddenDeals() { return []; }
  async getMyVotes() { return { deals: { ...myVotes.deals }, polls: { ...myVotes.polls } }; }

  async createDeal(input: NewDeal, photo: Blob | null): Promise<Deal> {
    const m = needMe();
    const d: Deal = {
      ...input, id: uid(), user_id: m.id, username: m.username, avatar_color: m.avatar_color, is_editor: false, is_demo: true,
      image_path: photo ? URL.createObjectURL(photo) : null, legit_votes: 0, fake_votes: 0, expired_votes: 0,
      comment_count: 0, created_at: new Date().toISOString(),
    };
    deals = [d, ...deals];
    emit();
    return d;
  }
  async deleteDeal(deal: Deal) { deals = deals.filter((d) => d.id !== deal.id); emit(); }

  async voteDeal(dealId: string, vote: VoteType | null, previous: VoteType | null) {
    needMe();
    deals = deals.map((d) => {
      if (d.id !== dealId) return d;
      const n = { ...d };
      if (previous) n[`${previous}_votes` as "legit_votes"] -= 1;
      if (vote) n[`${vote}_votes` as "legit_votes"] += 1;
      return n;
    });
    if (vote) myVotes.deals[dealId] = vote; else delete myVotes.deals[dealId];
    emit();
  }

  async listComments(dealId: string) { return [...(commentsByDeal[dealId] ?? [])]; }
  async addComment(dealId: string, body: string) {
    const m = needMe();
    (commentsByDeal[dealId] ??= []).push({ id: uid(), deal_id: dealId, user_id: m.id, username: m.username, avatar_color: m.avatar_color, body, created_at: new Date().toISOString() });
    deals = deals.map((d) => (d.id === dealId ? { ...d, comment_count: d.comment_count + 1 } : d));
    emit();
  }

  async createPoll(question: string, options: string[]) {
    const m = needMe();
    polls = [{ id: uid(), user_id: m.id, question, options, option_counts: options.map(() => 0), is_pinned: false, created_at: new Date().toISOString() }, ...polls];
    emit();
  }
  async votePoll(pollId: string, optionIndex: number) {
    needMe();
    if (myVotes.polls[pollId] !== undefined) throw new Error("You have already voted in this poll.");
    polls = polls.map((p) => (p.id === pollId ? { ...p, option_counts: p.option_counts.map((c, i) => (i === optionIndex ? c + 1 : c)) } : p));
    myVotes.polls[pollId] = optionIndex;
    emit();
  }

  async createDiscussion(question: string, county: string | null) {
    const m = needMe();
    discussions = [{ id: uid(), user_id: m.id, username: m.username, county, question, created_at: new Date().toISOString(), replies: [] }, ...discussions];
    emit();
  }
  async addReply(discussionId: string, body: string) {
    const m = needMe();
    discussions = discussions.map((d) => d.id === discussionId
      ? { ...d, replies: [...d.replies, { id: uid(), discussion_id: discussionId, user_id: m.id, username: m.username, body, created_at: new Date().toISOString() }] }
      : d);
    emit();
  }

  async flag(target: FlagTarget, id: string, reason: FlagReason) {
    void [target, id, reason];
    needMe();
    // Demo mode only acknowledges the report; live mode stores it and auto-hides at 5 weighted flags.
  }
  async updateUsername(username: string) {
    const m = needMe();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) throw new Error("Use 3-24 letters, numbers or underscores.");
    setMe({ ...m, username });
  }
  async deleteAccount() { deals = deals.filter((d) => d.user_id !== "demo-user"); setMe(null); emit(); }
  async submitNotice(notice: NewNotice) { void notice; /* demo: nothing stored */ }

  subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
  photoUrl(path: string) { return path; }

  async modQueue(): Promise<{ items: ModItem[]; notices: Notice[] }> { return { items: [], notices: [] }; }
  async moderate() { /* live only */ }
  async removeContent() { /* live only */ }
  async approvePhoto() { /* live only */ }
  async setNoticeStatus() { /* live only */ }
}
