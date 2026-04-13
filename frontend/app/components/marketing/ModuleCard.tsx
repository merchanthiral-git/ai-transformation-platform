"use client";
import Link from "next/link";

interface ModuleCardProps {
  icon: string;
  name: string;
  description: string;
  href?: string;
}

export default function ModuleCard({ icon, name, description, href }: ModuleCardProps) {
  const content = (
    <div
      style={{
        padding: "28px 24px", borderRadius: 12, background: "#FFFFFF",
        border: "1px solid #E5E2D9", transition: "all 0.25s ease",
        cursor: href ? "pointer" : "default", position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderLeftColor = "#F97316"; e.currentTarget.style.borderLeftWidth = "3px"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderLeftColor = "#E5E2D9"; e.currentTarget.style.borderLeftWidth = "1px"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1C2B3A", marginBottom: 8 }}>{name}</div>
      <p style={{ fontSize: 15, color: "rgba(28,43,58,0.6)", lineHeight: 1.6, margin: 0 }}>{description}</p>
      {href && <div style={{ fontSize: 14, fontWeight: 600, color: "#F97316", marginTop: 16 }}>Open {name} →</div>}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: "none" }}>{content}</Link> : content;
}
