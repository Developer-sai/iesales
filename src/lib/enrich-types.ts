import type { Category } from "./types";

/** What the AI read from the shop's page. Every field is a suggestion the shopper must check. */
export interface Enriched {
  url: string;
  page_ok: boolean;
  title: string | null;
  brand: string | null;
  category: Category | null;
  retailer: string | null;
  sale_price: number | null;
  prior_price: number | null;
  promo_code: string | null;
  in_stock: boolean | null;
  notes: string | null;
  /** Things the shopper should fix before posting (people or personal details visible in a photo). */
  warnings: string[];
  source: "link" | "photo";
  comparisons: { retailer: string; price: number; url: string }[];
  checked_at: string;
}

export type EnrichResponse = { ok: true; data: Enriched } | { ok: false; error: string; message: string };
