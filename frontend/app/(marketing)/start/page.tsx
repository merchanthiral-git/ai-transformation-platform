"use client";
import Link from "next/link";

const MODULES = [
  { name: "Overview", desc: "See where your organization stands right now.", icon: "📊" },
  { name: "Diagnose", desc: "Find which roles, skills, and structures are most exposed.", icon: "🔍" },
  { name: "Design", desc: "Rebuild roles around the work that remains uniquely human.", icon: "✏️" },
  { name: "Simulate", desc: "Test what happens under different transformation scenarios.", icon: "⚡" },
  { name: "Mobilize", desc: "Build the phased roadmap with reskilling and change management.", icon: "🚀" },
  { name: "Export", desc: "Produce the deliverable your board needs.", icon: "📤" },
];

export default function StartPage() {
  return (
    <>
      <section style={{ background: "#0F1C2A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 32px 80px", position: "relative" }}>
        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(rgba(247,245,240,0.3) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 800, color: "#F7F5F0", lineHeight: 1.15, letterSpacing: -1, margin: "0 0 16px" }}>
            You are about to see everything.
          </h1>
          <p style={{ fontSize: 18, color: "rgba(247,245,240,0.5)", margin: "0 auto 56px", maxWidth: 540 }}>
            The platform has six modules. Start anywhere. Every tab gives you something you can act on.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, textAlign: "left" }}>
            {MODULES.map(m => (
              <Link key={m.name} href="/app" style={{
                display: "block", padding: "28px 24px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none", transition: "all 0.25s ease",
              }} onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { const t = e.currentTarget; t.style.borderColor = "rgba(249,115,22,0.3)"; t.style.transform = "translateY(-2px)"; t.style.background = "rgba(249,115,22,0.06)"; }} onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { const t = e.currentTarget; t.style.borderColor = "rgba(255,255,255,0.08)"; t.style.transform = "none"; t.style.background = "rgba(255,255,255,0.04)"; }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{m.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F7F5F0", marginBottom: 8 }}>{m.name}</div>
                <p style={{ fontSize: 14, color: "rgba(247,245,240,0.5)", lineHeight: 1.6, margin: "0 0 16px" }}>{m.desc}</p>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F97316" }}>Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
