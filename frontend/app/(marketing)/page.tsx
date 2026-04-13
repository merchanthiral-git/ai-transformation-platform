import Link from "next/link";
import HeroSection from "../components/marketing/HeroSection";
import ModuleCard from "../components/marketing/ModuleCard";
import ScenarioCard from "../components/marketing/ScenarioCard";
import StatRow from "../components/marketing/StatRow";

const MODULES = [
  { icon: "📊", name: "Overview", desc: "See where your organization actually stands right now." },
  { icon: "🔍", name: "Diagnose", desc: "Find out what is exposed. Which roles, which skills, which gaps." },
  { icon: "✏️", name: "Design", desc: "Build what the future organization looks like. Rebuilt, not patched." },
  { icon: "⚡", name: "Simulate", desc: "Test what happens if you move fast, move slow, or do not move." },
  { icon: "🚀", name: "Mobilize", desc: "Plan who gets reskilled, redeployed, and on what timeline." },
  { icon: "📤", name: "Export", desc: "Produce the deliverable your board needs Monday morning." },
];

const SCENARIOS = [
  { title: "The CHRO", quote: "I have 90 days to tell the board what AI means for our people. I do not have a credible answer yet." },
  { title: "The Business Unit Leader", quote: "My team keeps asking if their jobs are safe. I keep saying we are figuring it out. That is not good enough anymore." },
  { title: "The Transformation Lead", quote: "We have a strategy. We do not have a plan. Everyone in the room knows the difference." },
  { title: "The Consultant", quote: "My client needs a workforce assessment in six weeks. Nothing that exists was built for this moment." },
];

export default function MarketingHome() {
  return (
    <>
      {/* HERO */}
      <HeroSection
        eyebrow="AI Transformation Platform"
        headline="Most organizations will get AI wrong."
        subheadline="Not because the technology failed. Because nobody had a clear plan for the people."
        primaryCta={{ label: "Start Here →", href: "/start" }}
        secondaryCta={{ label: "See the Platform", href: "/the-tool-nobody-else-built" }}
      >
        {/* What does it do box */}
        <div style={{
          marginTop: 48, padding: "24px 32px", borderRadius: 12,
          border: "1px solid rgba(247,245,240,0.12)", background: "rgba(247,245,240,0.04)",
          maxWidth: 600, marginLeft: "auto", marginRight: "auto",
        }}>
          <p style={{ fontSize: 15, color: "rgba(247,245,240,0.6)", lineHeight: 1.6, margin: 0, textAlign: "left" }}>
            <span style={{ fontWeight: 700, color: "rgba(247,245,240,0.8)" }}>What does it do?</span> It tells you which roles are changing, how fast, and what your organization needs to do about it. You leave with a plan, not a presentation.
          </p>
        </div>
        <StatRow stats={[{ value: "6 Modules" }, { value: "20+ Views" }, { value: "One End to End System" }]} />
      </HeroSection>

      {/* PLATFORM STRIP */}
      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>The System</div>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, color: "#1C2B3A", lineHeight: 1.15, letterSpacing: -1, margin: "0 0 48px", maxWidth: 600 }}>
            Six steps between not knowing and having the answer.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {MODULES.map(m => <ModuleCard key={m.name} icon={m.icon} name={m.name} description={m.desc} />)}
          </div>
        </div>
      </section>

      {/* SCENARIO SECTION */}
      <section style={{ background: "#0F1C2A", padding: "80px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, color: "#F7F5F0", lineHeight: 1.15, letterSpacing: -1, margin: "0 0 48px", textAlign: "center" }}>
            One of these is keeping you up tonight.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {SCENARIOS.map(s => <ScenarioCard key={s.title} title={s.title} quote={s.quote} href="/the-scenario-that-sounds-like-yours" />)}
          </div>
        </div>
      </section>

      {/* THE NUMBER SECTION */}
      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, color: "#1C2B3A", lineHeight: 1.15, letterSpacing: -1, margin: "0 0 20px" }}>
            Seven out of ten AI transformations stall.
          </h2>
          <p style={{ fontSize: 20, color: "rgba(28,43,58,0.6)", margin: "0 0 32px" }}>The technology works. The workforce plan did not.</p>
          <p style={{ fontSize: 18, color: "rgba(28,43,58,0.45)", margin: "0 0 40px" }}>Most organizations are 18 months behind where they think they are.</p>
          <Link href="/the-number-that-changes-the-conversation" style={{ fontSize: 16, fontWeight: 700, color: "#F97316", textDecoration: "none" }}>
            See the research →
          </Link>
        </div>
      </section>

      {/* MISSION STRIP */}
      <section style={{ background: "#0F1C2A", padding: "64px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, color: "#F7F5F0", lineHeight: 1.4, margin: "0 0 16px", fontStyle: "italic" }}>
            &ldquo;The firms that charge millions for this kind of clarity have had it to themselves long enough.&rdquo;
          </p>
          <p style={{ fontSize: 14, color: "rgba(247,245,240,0.3)" }}>Built by someone who sat in the room where these decisions get made.</p>
        </div>
      </section>
    </>
  );
}
