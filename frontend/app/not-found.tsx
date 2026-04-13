export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1120", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: "rgba(212,134,10,0.15)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1, marginBottom: 16 }}>404</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Page Not Found</h1>
        <p style={{ fontSize: 16, color: "rgba(255,230,200,0.4)", lineHeight: 1.7, marginBottom: 32 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Head back to the platform to continue your transformation journey.
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: "rgba(212,134,10,0.12)", border: "1px solid rgba(212,134,10,0.3)",
            color: "#e09040", textDecoration: "none", transition: "all 0.2s",
          }}
        >
          &larr; Back to Platform
        </a>
        <div style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 20, fontSize: 13, color: "rgba(255,200,150,0.2)" }}>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
        </div>
      </div>
    </div>
  );
}
