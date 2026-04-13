"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "The Part Everyone Gets Wrong", href: "/the-part-everyone-gets-wrong" },
  { label: "The Tool Nobody Else Built", href: "/the-tool-nobody-else-built" },
  { label: "The Scenario That Sounds Like Yours", href: "/the-scenario-that-sounds-like-yours" },
  { label: "The Number That Changes the Conversation", href: "/the-number-that-changes-the-conversation" },
  { label: "What I Saw From the Inside", href: "/what-i-saw-from-the-inside" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(15,28,42,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", gap: 24 }}>
        {/* Logo */}
        <Link href="/home" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F7F5F0", letterSpacing: -0.5 }}>AI Transformation</div>
          <div style={{ fontSize: 11, color: "rgba(247,245,240,0.35)", letterSpacing: 1.5, textTransform: "uppercase" }}>Platform</div>
        </Link>

        {/* Desktop nav links */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 8 }} className="marketing-nav-desktop">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontSize: 13, fontWeight: 500, color: "rgba(247,245,240,0.55)", textDecoration: "none",
              padding: "6px 12px", borderRadius: 6, transition: "color 0.2s",
            }} onMouseEnter={e => (e.currentTarget.style.color = "#F97316")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(247,245,240,0.55)")}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link href="/start" style={{
          padding: "10px 24px", borderRadius: 8, background: "#F97316", color: "#fff",
          fontSize: 14, fontWeight: 700, textDecoration: "none", flexShrink: 0,
          transition: "background 0.2s",
        }} onMouseEnter={e => (e.currentTarget.style.background = "#EA580C")} onMouseLeave={e => (e.currentTarget.style.background = "#F97316")}>
          Start Here →
        </Link>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="marketing-nav-mobile" style={{
          display: "none", background: "none", border: "none", color: "#F7F5F0",
          fontSize: 24, cursor: "pointer", padding: 4,
        }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="marketing-nav-mobile" style={{
          display: "none", padding: "16px 32px 24px", background: "rgba(15,28,42,0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{
              display: "block", padding: "12px 0", fontSize: 15, fontWeight: 500,
              color: "rgba(247,245,240,0.7)", textDecoration: "none",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .marketing-nav-desktop { display: none !important; }
          .marketing-nav-mobile { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
