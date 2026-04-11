import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "edgepush — Open source push notifications at the edge";
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
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f5f3ee",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              width: "36px",
              height: "36px",
              border: "1.5px solid #ff6b1a",
              color: "#ff6b1a",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            ep
          </div>
          edgepush
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          <div
            style={{
              fontSize: "104px",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 0.92,
              maxWidth: "1040px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            push from the&nbsp;
            <span style={{ color: "#ff6b1a" }}>edge</span>.
          </div>
          <div
            style={{
              fontSize: "26px",
              color: "#9a9a9a",
              lineHeight: 1.4,
              maxWidth: "900px",
              fontFamily:
                "'Satoshi', -apple-system, system-ui, sans-serif",
            }}
          >
            Open source alternative to Expo Push Notification Service. Built on
            Cloudflare Workers. BYO APNs and FCM credentials, MIT licensed.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
            fontSize: "18px",
            color: "#6b6b6b",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#ff6b1a", fontSize: "18px" }}>●</span>
            open source alpha
          </div>
          <div>mit licensed</div>
          <div>apns + fcm</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
