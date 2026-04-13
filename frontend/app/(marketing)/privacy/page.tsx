import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | AI Transformation Platform" };

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0B1120", color: "rgba(255,230,200,0.55)", fontFamily: "'DM Sans', 'Outfit', sans-serif" },
  container: { maxWidth: 760, margin: "0 auto", padding: "64px 24px 80px" },
  back: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "rgba(255,200,150,0.4)", textDecoration: "none", marginBottom: 40 },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const, color: "rgba(212,134,10,0.5)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12 },
  h1: { fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.5px", marginBottom: 8 },
  updated: { fontSize: 14, color: "rgba(255,200,150,0.3)", marginBottom: 48 },
  h2: { fontSize: 22, fontWeight: 700, color: "rgba(255,245,235,0.85)", fontFamily: "'Outfit', sans-serif", marginTop: 48, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(212,134,10,0.08)" },
  p: { fontSize: 15, lineHeight: 1.85, marginBottom: 16 },
  ul: { paddingLeft: 20, marginBottom: 16 },
  li: { fontSize: 15, lineHeight: 1.85, marginBottom: 8 },
  strong: { color: "rgba(255,245,235,0.75)" },
  callout: { padding: "16px 20px", borderRadius: 12, background: "rgba(212,134,10,0.04)", border: "1px solid rgba(212,134,10,0.1)", borderLeft: "3px solid #D4860A", marginBottom: 24, fontSize: 14, lineHeight: 1.8 },
  footer: { marginTop: 64, paddingTop: 24, borderTop: "1px solid rgba(212,134,10,0.06)", textAlign: "center" as const, fontSize: 13, color: "rgba(255,200,150,0.2)" },
};

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <a href="/" style={S.back}>&larr; Back to Platform</a>
        <div style={S.badge}>Legal</div>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.updated}>Last updated: April 12, 2026</p>

        <p style={S.p}>HR Digital Playground (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the AI Transformation Platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our platform.</p>

        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}><strong style={S.strong}>Account Information:</strong> When you create an account, we collect your username, email address, and an encrypted password hash. We never store plaintext passwords.</p>
        <p style={S.p}><strong style={S.strong}>Uploaded Data:</strong> Files you upload (Excel workbooks, CSV files) are processed to power the platform&apos;s analytics. These files may contain workforce data including employee names, job titles, organizational structures, compensation data, and skills inventories.</p>
        <p style={S.p}><strong style={S.strong}>Usage Analytics:</strong> We collect usage data to improve the platform, including:</p>
        <ul style={S.ul}>
          <li style={S.li}>Modules visited and features used</li>
          <li style={S.li}>Design decisions and simulation configurations</li>
          <li style={S.li}>Flight recorder audit logs (actions taken within projects)</li>
          <li style={S.li}>Error reports for debugging and reliability</li>
        </ul>
        <p style={S.p}><strong style={S.strong}>AI Interactions:</strong> When you use AI-powered features (NLQ bar, AI Co-Pilot, Story Builder), your queries and the context provided are sent to our AI provider (Anthropic Claude) for processing. We do not use your data to train AI models.</p>

        <h2 style={S.h2}>2. How We Store Your Data</h2>
        <p style={S.p}>We take data security seriously and employ industry-standard practices:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Database:</strong> Account and project data is stored in PostgreSQL with encrypted connections (TLS/SSL)</li>
          <li style={S.li}><strong style={S.strong}>File Storage:</strong> Uploaded files are stored in Cloudflare R2 with server-side encryption</li>
          <li style={S.li}><strong style={S.strong}>Passwords:</strong> Hashed using bcrypt with per-user salts &mdash; never stored in plaintext</li>
          <li style={S.li}><strong style={S.strong}>Authentication:</strong> JWT tokens with 7-day expiration</li>
          <li style={S.li}><strong style={S.strong}>Transport:</strong> All data transmitted over HTTPS</li>
        </ul>

        <h2 style={S.h2}>3. Data Retention & Deletion</h2>
        <p style={S.p}>We retain your data only as long as your account is active and as needed to provide our services:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Account data:</strong> Retained until you delete your account</li>
          <li style={S.li}><strong style={S.strong}>Uploaded files:</strong> Retained until you delete the associated project or account</li>
          <li style={S.li}><strong style={S.strong}>Usage logs:</strong> Retained for 12 months, then automatically purged</li>
          <li style={S.li}><strong style={S.strong}>AI interaction logs:</strong> Not permanently stored &mdash; processed in real-time and discarded</li>
        </ul>
        <p style={S.p}>You may request complete deletion of all your data at any time by contacting us at <strong style={S.strong}>merchanthiral@gmail.com</strong>. We will process deletion requests within 30 days.</p>

        <h2 style={S.h2}>4. Third-Party Data Sharing</h2>
        <div style={S.callout}>
          <strong style={S.strong}>We do not sell, rent, or trade your personal information or uploaded data to any third party.</strong> Your workforce data is yours. Period.
        </div>
        <p style={S.p}>We share data only in these limited circumstances:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>AI Processing:</strong> Queries sent to Anthropic Claude for AI features. Anthropic does not use this data for model training per their enterprise data policy.</li>
          <li style={S.li}><strong style={S.strong}>Infrastructure:</strong> Data stored on Cloudflare (R2, CDN), Railway (hosting), and Vercel (frontend) as necessary to operate the platform.</li>
          <li style={S.li}><strong style={S.strong}>Legal Compliance:</strong> If required by law, court order, or governmental regulation.</li>
        </ul>

        <h2 style={S.h2}>5. Cookies & Local Storage</h2>
        <p style={S.p}>We use minimal cookies and browser storage:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Authentication token:</strong> Stored in localStorage to maintain your session</li>
          <li style={S.li}><strong style={S.strong}>Theme preference:</strong> Stored in localStorage for your display settings</li>
          <li style={S.li}><strong style={S.strong}>Project state:</strong> Design decisions, simulation configurations, and UI preferences are stored in localStorage for instant loading</li>
        </ul>
        <p style={S.p}>We do not use third-party tracking cookies or advertising cookies. We do not use Google Analytics or similar tracking services.</p>

        <h2 style={S.h2}>6. Your Rights</h2>
        <p style={S.p}>You have the right to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Access all personal data we hold about you</li>
          <li style={S.li}>Correct inaccurate information in your account</li>
          <li style={S.li}>Export your data in standard formats (Excel, CSV)</li>
          <li style={S.li}>Delete your account and all associated data</li>
          <li style={S.li}>Withdraw consent for data processing at any time</li>
        </ul>

        <h2 style={S.h2}>7. Children&apos;s Privacy</h2>
        <p style={S.p}>The platform is designed for business professionals and is not intended for users under 18 years of age. We do not knowingly collect data from children.</p>

        <h2 style={S.h2}>8. Changes to This Policy</h2>
        <p style={S.p}>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>

        <h2 style={S.h2}>9. Contact Us</h2>
        <p style={S.p}>For privacy-related questions, data requests, or concerns:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Email:</strong> merchanthiral@gmail.com</li>
          <li style={S.li}><strong style={S.strong}>Company:</strong> HR Digital Playground</li>
          <li style={S.li}><strong style={S.strong}>Location:</strong> New York, NY</li>
        </ul>

        <div style={S.footer}>
          <p>&copy; 2026 HR Digital Playground. All rights reserved.</p>
          <p style={{ marginTop: 8 }}><a href="/terms" style={{ color: "rgba(212,134,10,0.4)", textDecoration: "none" }}>Terms of Service</a></p>
        </div>
      </div>
    </div>
  );
}
