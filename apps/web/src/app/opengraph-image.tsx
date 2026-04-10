import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "edgepush - Open source push notifications at the edge";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "28px",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              display: "flex",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            ep
          </div>
          edgepush
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: "900px",
            }}
          >
            Push notifications at the edge.
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#a1a1aa",
              lineHeight: 1.3,
              maxWidth: "900px",
            }}
          >
            Open source alternative to Expo Push Notification Service. Built
            on Cloudflare Workers.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "22px",
            color: "#71717a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
            Free
          </div>
          <div>MIT licensed</div>
          <div>APNs + FCM</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
