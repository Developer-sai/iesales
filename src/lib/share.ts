import { SITE_URL } from "./constants";
import { formatEuro, verdict } from "./hotScore";
import type { Deal } from "./types";

export function dealUrl(id: string): string {
  return `${SITE_URL}/deal/${id}`;
}

export function shareText(d: Deal): string {
  const price = d.prior_price
    ? `${formatEuro(d.sale_price)} (reported was ${formatEuro(d.prior_price)})`
    : formatEuro(d.sale_price);
  const where = d.location_type === "online" ? "online" : d.county ? `in ${d.county}` : "in store";
  return `🔥 Spotted on iesales.ie (free Irish deal tracker, zero ads): ${d.title} at ${d.retailer} ${where}: ${price}. Community-reported, so check before you buy. ${verdict(d).label}. ${dealUrl(d.id)}`;
}

export function whatsappLink(d: Deal): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText(d))}`;
}

export const SITE_SHARE_TEXT =
  "Free Irish Black Friday deal tracker: community-reported prices, no ads, no affiliate links. Vote on what's genuinely cheap.";
