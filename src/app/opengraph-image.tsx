import { ImageResponse } from "next/og";

// Default Open Graph image for pages that do not supply their own.
export const alt = "Vercel Swag Store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#ffffff",
        color: "#0a0a0a",
        fontSize: 64,
        fontWeight: 700,
      }}
    >
      <svg width="160" height="160" viewBox="0 0 24 24">
        <title>Vercel Swag Store logo</title>
        <path d="M12 3 L22 20 L2 20 Z" fill="#0a0a0a" />
      </svg>
      <div style={{ marginTop: 32 }}>Vercel Swag Store</div>
      <div style={{ marginTop: 16, fontSize: 32, fontWeight: 400, color: "#525252" }}>
        Wear the framework you ship with.
      </div>
    </div>,
    { ...size }
  );
}
