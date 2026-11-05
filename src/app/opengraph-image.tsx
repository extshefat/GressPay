import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GressPay — collect bKash, Nagad and USDT into your wallets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#F4F3EE",
          color: "#081525",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#077C73",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#A7F0E3",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>GressPay</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Collect bKash, Nagad and USDT into your own wallets.
          </div>
          <div style={{ fontSize: 24, color: "#536563", lineHeight: 1.4 }}>
            Non-custodial verification. SMS evidence matched server-side. HMAC webhooks.
          </div>
        </div>
        <div style={{ fontSize: 18, color: "#0E8F80", fontWeight: 600 }}>Never holds your money</div>
      </div>
    ),
    { ...size }
  );
}
