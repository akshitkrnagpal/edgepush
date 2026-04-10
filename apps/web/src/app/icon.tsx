import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981, #06b6d4)",
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          borderRadius: 6,
          fontFamily: "system-ui",
        }}
      >
        ep
      </div>
    ),
    {
      ...size,
    },
  );
}
