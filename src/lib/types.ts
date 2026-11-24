export type Category = "tech" | "home" | "fashion" | "grocery" | "kids" | "travel" | "other";
export type LocationType = "online" | "in-store" | "both";
export type VoteType = "legit" | "fake" | "expired";
export type FlagTarget = "deal" | "comment" | "poll" | "discussion" | "reply";
export type FlagReason = "illegal" | "misleading" | "spam" | "personal_data" | "copyright" | "other";

export interface Deal {
  id: string;
  user_id: string | null;
  username: string | null;
  avatar_color: string | null;
  is_editor: boolean;
  is_demo?: boolean;
  title: string;
  brand: string;
  category: Category;
  retailer: string;
  location_type: LocationType;
  county: string | null;
  store_branch: string | null;
  deal_url: string | null;
  sale_price: number;
  prior_price: number | null;
  prior_evidence_url: string | null;
  promo_code: string | null;
  note: string | null;
  image_path: string | null;
  legit_votes: number;
  fake_votes: number;
  expired_votes: number;
  comment_count: number;
  is_hidden?: boolean;
  moderation_reason?: string | null;
  created_at: string;
}

export interface NewDeal {
  title: string;
  brand: string;
  category: Category;
  retailer: string;
  location_type: LocationType;
  county: string | null;
  store_branch: string | null;
  deal_url: string | null;
  sale_price: number;
  prior_price: number | null;
  prior_evidence_url: string | null;
  promo_code: string | null;
  note: string | null;
}

export interface Comment {
  id: string;
  deal_id: string;
  user_id: string;
  username: string;
  avatar_color: string;
  body: string;
  created_at: string;
}

export interface Poll {
  id: string;
  user_id: string | null;
  question: string;
  options: string[];
  option_counts: number[];
  is_pinned: boolean;
  created_at: string;
}

export interface Reply {
  id: string;
  discussion_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

export interface Discussion {
  id: string;
  user_id: string;
  username: string;
  county: string | null;
  question: string;
  created_at: string;
  replies: Reply[];
}

export interface Me {
  id: string;
  email: string | null;
  username: string;
  avatar_color: string;
  isModerator: boolean;
}

export interface MyVotes {
  deals: Record<string, VoteType>;
  polls: Record<string, number>;
}

export interface ModItem {
  type: FlagTarget;
  id: string;
  text: string;
  reason: string | null;
  flag_count: number;
  image_path?: string | null;
  /** true for a recent photo awaiting approval (not hidden) */
  photo_pending?: boolean;
}

export interface Notice {
  id: string;
  notifier_name: string | null;
  notifier_email: string;
  target_url: string;
  explanation: string;
  status: string;
  created_at: string;
}

export interface NewNotice {
  notifier_name: string | null;
  notifier_email: string;
  target_url: string;
  explanation: string;
}

/** One aggregated, cacheable read model for the whole home screen (BFF pattern). */
export interface Feed {
  deals: Deal[];
  polls: Poll[];
  discussions: Discussion[];
  /** ISO time the server built this snapshot (used for read-your-writes reconciliation). */
  generatedAt: string;
}

export interface Api {
  mode: "demo" | "live";
  getMe(): Promise<Me | null>;
  onAuthChange(cb: (me: Me | null) => void): () => void;
  signInGoogle(): Promise<void>;
  signInMagicLink(email: string): Promise<void>;
  signInDemo(): Promise<void>;
  signOut(): Promise<void>;
  /** fresh=true bypasses the CDN copy (used right after the user's own writes). */
  loadFeed(fresh?: boolean): Promise<Feed>;
  getMyVotes(): Promise<MyVotes>;
  createDeal(input: NewDeal, photo: Blob | null): Promise<Deal>;
  deleteDeal(deal: Deal): Promise<void>;
  voteDeal(dealId: string, vote: VoteType | null, previous: VoteType | null): Promise<void>;
  listComments(dealId: string): Promise<Comment[]>;
  addComment(dealId: string, body: string): Promise<void>;
  createPoll(question: string, options: string[]): Promise<void>;
  votePoll(pollId: string, optionIndex: number): Promise<void>;
  createDiscussion(question: string, county: string | null): Promise<void>;
  addReply(discussionId: string, body: string): Promise<void>;
  flag(target: FlagTarget, id: string, reason: FlagReason, explanation: string | null): Promise<void>;
  updateUsername(username: string): Promise<void>;
  deleteAccount(): Promise<void>;
  submitNotice(n: NewNotice): Promise<void>;
  subscribe(cb: () => void): () => void;
  photoUrl(path: string): string;
  myHiddenDeals(): Promise<Deal[]>;
  // moderation (live mode only)
  modQueue(): Promise<{ items: ModItem[]; notices: Notice[] }>;
  moderate(type: FlagTarget, id: string, hide: boolean, reason: string | null): Promise<void>;
  removeContent(type: FlagTarget, id: string, imagePath?: string | null): Promise<void>;
  approvePhoto(dealId: string, ok: boolean): Promise<void>;
  setNoticeStatus(id: string, status: "actioned" | "rejected"): Promise<void>;
}
