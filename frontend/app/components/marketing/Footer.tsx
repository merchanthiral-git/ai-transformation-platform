import Link from "next/link";

const NAV_LINKS = [
  { label: "The Part Everyone Gets Wrong", href: "/the-part-everyone-gets-wrong" },
  { label: "The Tool Nobody Else Built", href: "/the-tool-nobody-else-built" },
  { label: "The Scenario That Sounds Like Yours", href: "/the-scenario-that-sounds-like-yours" },
  { label: "The Number That Changes the Conversation", href: "/the-number-that-changes-the-conversation" },
  { label: "What I Saw From the Inside", href: "/what-i-saw-from-the-inside" },
];

export default function Footer() {
  return (
    <footer style={{ background: "#0F1C2A", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 32px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F7F5F0", letterSpacing: -0.5 }}>AI Transformation</div>
          <div style={{ fontSize: 11, color: "rgba(247,245,240,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>Platform</div>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{ fontSize: 13, color: "rgba(247,245,240,0.4)", textDecoration: "none" }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(247,245,240,0.2)" }}>
        Built at the intersection of AI and people.
      </div>
    </footer>
  );
}
