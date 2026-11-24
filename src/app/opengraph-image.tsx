import { ImageResponse } from "next/og";

export const alt = "iesales.ie: free Irish Black Friday deal tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#064e3b", padding: 64, fontFamily: "sans-serif", color: "white" }}>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>iesales<span style={{ color: "#6ee7b7" }}>.ie</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>Which Irish Black Friday deals are actually worth it?</div>
          <div style={{ display: "flex", fontSize: 36, color: "#a7f3d0", marginTop: 28 }}>Shoppers vote. Free. Zero ads. Zero affiliate links.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#6ee7b7" }}>Community-reported prices, unverified. Check before you buy.</div>
      </div>
    ),
    { ...size },
  );
}
