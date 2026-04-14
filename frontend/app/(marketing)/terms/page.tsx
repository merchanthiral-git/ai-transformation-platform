import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | AI Transformation Platform" };

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
  callout: { padding: "16px 20px", borderRadius: 12, background: "rgba(212,134,10,0.04)", border: "1px solid rgba(212,134,10,0.1)", borderLeft: "3px solid var(--accent-primary)", marginBottom: 24, fontSize: 14, lineHeight: 1.8 },
  footer: { marginTop: 64, paddingTop: 24, borderTop: "1px solid rgba(212,134,10,0.06)", textAlign: "center" as const, fontSize: 13, color: "rgba(255,200,150,0.2)" },
};

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <a href="/" style={S.back}>&larr; Back to Platform</a>
        <div style={S.badge}>Legal</div>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.updated}>Last updated: April 12, 2026</p>

        <p style={S.p}>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the AI Transformation Platform operated by HR Digital Playground (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account or using the platform, you agree to these Terms.</p>

        <h2 style={S.h2}>1. Acceptable Use</h2>
        <p style={S.p}>You agree to use the platform only for lawful business purposes related to workforce analysis, organizational design, and transformation planning. You agree not to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Upload data you do not have authorization to use</li>
          <li style={S.li}>Attempt to access other users&apos; data or accounts</li>
          <li style={S.li}>Use the platform to make discriminatory employment decisions</li>
          <li style={S.li}>Reverse-engineer, decompile, or disassemble any part of the platform</li>
          <li style={S.li}>Use automated tools to scrape or extract data from the platform</li>
          <li style={S.li}>Upload malicious files or attempt to compromise platform security</li>
          <li style={S.li}>Resell, sublicense, or redistribute the platform without authorization</li>
        </ul>

        <h2 style={S.h2}>2. Account Responsibilities</h2>
        <p style={S.p}>You are responsible for:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Account security:</strong> Maintaining the confidentiality of your login credentials. Notify us immediately of any unauthorized access.</li>
          <li style={S.li}><strong style={S.strong}>Data accuracy:</strong> Ensuring that data you upload is accurate, current, and that you have the right to use it.</li>
          <li style={S.li}><strong style={S.strong}>Compliance:</strong> Ensuring your use of the platform complies with applicable laws, regulations, and your organization&apos;s policies, including data protection and employment laws.</li>
          <li style={S.li}><strong style={S.strong}>User conduct:</strong> All activity under your account, whether or not authorized by you.</li>
        </ul>

        <h2 style={S.h2}>3. Intellectual Property</h2>
        <div style={S.callout}>
          <strong style={S.strong}>Your data remains your property.</strong> We claim no ownership over the workforce data, analyses, designs, or reports you create using the platform.
        </div>
        <p style={S.p}><strong style={S.strong}>Your Content:</strong> You retain all rights to data you upload and content you create. By uploading data, you grant us a limited license to process it solely for the purpose of providing platform services to you. This license terminates when you delete the data or your account.</p>
        <p style={S.p}><strong style={S.strong}>Our Platform:</strong> The AI Transformation Platform, including its design, code, methodologies, frameworks, and documentation, is the intellectual property of HR Digital Playground. These Terms do not grant you any rights to our intellectual property beyond the right to use the platform as intended.</p>
        <p style={S.p}><strong style={S.strong}>Exports:</strong> Reports, presentations, and analyses you generate using the platform are yours to use for any lawful purpose. You may share them with clients, stakeholders, and colleagues without restriction.</p>

        <h2 style={S.h2}>4. AI-Powered Features</h2>
        <p style={S.p}>The platform uses artificial intelligence (currently Anthropic Claude) to power certain features including the NLQ Bar, AI Co-Pilot, Story Builder, and analytical recommendations. You acknowledge that:</p>
        <ul style={S.ul}>
          <li style={S.li}>AI outputs are suggestions and should be validated by qualified professionals before acting on them</li>
          <li style={S.li}>AI recommendations do not constitute professional consulting, legal, or HR advice</li>
          <li style={S.li}>You are responsible for all decisions made based on platform outputs, including AI-generated content</li>
          <li style={S.li}>AI capabilities may change as underlying models are updated</li>
        </ul>

        <h2 style={S.h2}>5. Service Availability</h2>
        <p style={S.p}>We strive to maintain high availability but do not guarantee uninterrupted access. The platform may be temporarily unavailable due to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Scheduled maintenance (we will provide advance notice when possible)</li>
          <li style={S.li}>Infrastructure issues with our hosting providers</li>
          <li style={S.li}>Force majeure events beyond our reasonable control</li>
        </ul>
        <p style={S.p}>We will make commercially reasonable efforts to minimize downtime and will communicate service disruptions promptly.</p>

        <h2 style={S.h2}>6. Limitation of Liability</h2>
        <p style={S.p}>To the maximum extent permitted by applicable law:</p>
        <ul style={S.ul}>
          <li style={S.li}>The platform is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied</li>
          <li style={S.li}>We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform</li>
          <li style={S.li}>Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim</li>
          <li style={S.li}>We are not responsible for decisions you make based on platform outputs, including workforce restructuring, headcount changes, or organizational redesign decisions</li>
        </ul>
        <p style={S.p}>This limitation does not apply to liability that cannot be excluded by law.</p>

        <h2 style={S.h2}>7. Indemnification</h2>
        <p style={S.p}>You agree to indemnify and hold harmless HR Digital Playground from any claims, losses, or damages arising from your use of the platform, your violation of these Terms, or your violation of any third party&apos;s rights.</p>

        <h2 style={S.h2}>8. Termination</h2>
        <p style={S.p}><strong style={S.strong}>By you:</strong> You may terminate your account at any time by contacting us. Upon termination, we will delete your account data within 30 days.</p>
        <p style={S.p}><strong style={S.strong}>By us:</strong> We may suspend or terminate your account if you violate these Terms, engage in abusive behavior, or if we reasonably believe your use poses a security risk. We will provide notice before termination except in cases of severe violations.</p>
        <p style={S.p}><strong style={S.strong}>Effect of termination:</strong> Upon termination, your right to use the platform ceases immediately. We will retain your data for 30 days to allow for export, after which it will be permanently deleted.</p>

        <h2 style={S.h2}>9. Governing Law</h2>
        <p style={S.p}>These Terms are governed by the laws of the State of New York, United States. Any disputes arising from these Terms shall be resolved in the courts of New York County, New York.</p>

        <h2 style={S.h2}>10. Changes to These Terms</h2>
        <p style={S.p}>We may update these Terms from time to time. We will notify registered users of material changes via email at least 30 days before they take effect. Continued use of the platform after changes constitutes acceptance.</p>

        <h2 style={S.h2}>11. Contact Us</h2>
        <p style={S.p}>For questions about these Terms:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={S.strong}>Email:</strong> merchanthiral@gmail.com</li>
          <li style={S.li}><strong style={S.strong}>Company:</strong> HR Digital Playground</li>
          <li style={S.li}><strong style={S.strong}>Location:</strong> New York, NY</li>
        </ul>

        <div style={S.footer}>
          <p>&copy; 2026 HR Digital Playground. All rights reserved.</p>
          <p style={{ marginTop: 8 }}><a href="/privacy" style={{ color: "rgba(212,134,10,0.4)", textDecoration: "none" }}>Privacy Policy</a></p>
        </div>
      </div>
    </div>
  );
}
