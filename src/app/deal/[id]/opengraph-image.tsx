import { ImageResponse } from "next/og";
import { formatEuro, percentOff, verdict } from "@/lib/hotScore";
import { createPublicClient } from "@/lib/supabase/server";

export const alt = "Deal on iesales.ie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let d: { title: string; retailer: string; sale_price: number; prior_price: number | null; legit_votes: number; fake_votes: number } | null = null;
  try {
    const sb = createPublicClient();
    if (sb) {
      const { data } = await sb.from("deal_feed").select("title, retailer, sale_price, prior_price, legit_votes, fake_votes")
        .eq("id", id).eq("is_hidden", false).maybeSingle();
      if (data) d = { ...data, sale_price: Number(data.sale_price), prior_price: data.prior_price == null ? null : Number(data.prior_price) };
    }
  } catch { /* use fallback card */ }

  const off = d ? percentOff(d.sale_price, d.prior_price) : null;
  const v = d ? verdict(d) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8fafc", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#0f172a" }}>
            iesales<span style={{ color: "#059669" }}>.ie</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#047857", background: "#d1fae5", padding: "8px 18px", borderRadius: 999 }}>
            Free • Zero ads • Community-reported
          </div>
        </div>
        {d ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#475569", marginBottom: 12 }}>{d.retailer}</div>
            <div style={{ display: "flex", fontSize: 62, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{d.title.slice(0, 80)}</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
              <div style={{ display: "flex", fontSize: 110, fontWeight: 800, color: "#047857" }}>{formatEuro(d.sale_price)}</div>
              {d.prior_price && (
                <div style={{ display: "flex", fontSize: 44, color: "#64748b", textDecoration: "line-through", marginLeft: 28 }}>{formatEuro(d.prior_price)}</div>
              )}
              {off !== null && (
                <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "#065f46", background: "#a7f3d0", padding: "6px 20px", borderRadius: 999, marginLeft: 28 }}>{off}% OFF</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            Irish Black Friday deals, checked by shoppers
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#475569" }}>
          <div style={{ display: "flex" }}>{v ? v.label : "Vote: legit bargain or misleading price?"}</div>
          <div style={{ display: "flex" }}>Prices are unverified. Check before you buy.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
