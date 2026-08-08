export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export function BrandCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 60%, #6366f1 100%)",
        fontFamily: "sans-serif",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "rgba(255, 255, 255, 0.14)",
          fontSize: 56,
        }}
      >
        🛣️
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1,
          display: "flex",
        }}
      >
        Bantay Kalsada
      </div>
      <div
        style={{
          fontSize: 28,
          opacity: 0.9,
          display: "flex",
        }}
      >
        Report road hazards and help keep your community safe.
      </div>
    </div>
  );
}
