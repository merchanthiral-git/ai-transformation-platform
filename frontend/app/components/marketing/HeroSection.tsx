import Link from "next/link";

interface HeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  children?: React.ReactNode;
  dark?: boolean;
}

export default function HeroSection({ eyebrow, headline, subheadline, primaryCta, secondaryCta, children, dark = true }: HeroProps) {
  const bg = dark ? "#0F1C2A" : "#F7F5F0";
  const textColor = dark ? "#F7F5F0" : "#1C2B3A";
  const mutedColor = dark ? "rgba(247,245,240,0.55)" : "rgba(28,43,58,0.6)";

  return (
    <section style={{
      background: bg, position: "relative", overflow: "hidden",
      minHeight: primaryCta ? "100vh" : "auto",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "120px 32px 80px",
    }}>
      {/* Dot grid background */}
      {dark && <div style={{
        position: "absolute", inset: 0, opacity: 0.12,
        backgroundImage: "radial-gradient(rgba(247,245,240,0.3) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, textAlign: "center" }}>
        {eyebrow && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 20 }}>
            {eyebrow}
          </div>
        )}

        <h1 style={{
          fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 800, color: textColor,
          lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 24px",
        }}>
          {headline}
        </h1>

        {subheadline && (
          <p style={{ fontSize: "clamp(18px, 2.2vw, 22px)", color: mutedColor, lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 600 }}>
            {subheadline}
          </p>
        )}

        {(primaryCta || secondaryCta) && (
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {primaryCta && (
              <Link href={primaryCta.href} style={{
                padding: "16px 36px", borderRadius: 8, background: "#F97316", color: "#fff",
                fontSize: 16, fontWeight: 700, textDecoration: "none", transition: "background 0.2s",
              }}>
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href} style={{
                padding: "16px 36px", borderRadius: 8, background: "transparent",
                border: dark ? "1px solid rgba(247,245,240,0.2)" : "1px solid rgba(28,43,58,0.2)",
                color: textColor, fontSize: 16, fontWeight: 600, textDecoration: "none",
              }}>
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
