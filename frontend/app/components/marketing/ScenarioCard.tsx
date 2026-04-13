"use client";
import Link from "next/link";

interface ScenarioCardProps {
  title: string;
  quote: string;
  href?: string;
}

export default function ScenarioCard({ title, quote, href }: ScenarioCardProps) {
  return (
    <div
      style={{
        padding: "32px 28px", borderRadius: 12,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
        {title}
      </div>
      <p style={{ fontSize: 17, color: "rgba(247,245,240,0.75)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
        &ldquo;{quote}&rdquo;
      </p>
      {href && (
        <Link href={href} style={{ display: "inline-block", marginTop: 20, fontSize: 14, fontWeight: 600, color: "rgba(247,245,240,0.4)", textDecoration: "none" }}>
          See your scenario →
        </Link>
      )}
    </div>
  );
}
