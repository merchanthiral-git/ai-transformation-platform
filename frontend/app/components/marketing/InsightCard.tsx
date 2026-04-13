"use client";

interface InsightCardProps {
  title: string;
  category: string;
  readTime: string;
  content: string;
}

export default function InsightCard({ title, category, readTime, content }: InsightCardProps) {
  return (
    <div
      style={{
        padding: "32px 28px", borderRadius: 12, background: "#FFFFFF",
        border: "1px solid #E5E2D9", transition: "all 0.25s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: "rgba(249,115,22,0.08)", color: "#F97316" }}>{category}</span>
        <span style={{ fontSize: 12, color: "rgba(28,43,58,0.35)" }}>{readTime}</span>
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1C2B3A", lineHeight: 1.3, margin: "0 0 16px" }}>{title}</h3>
      <p style={{ fontSize: 15, color: "rgba(28,43,58,0.6)", lineHeight: 1.7, margin: 0 }}>{content}</p>
    </div>
  );
}
