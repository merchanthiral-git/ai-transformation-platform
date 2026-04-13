import Link from "next/link";
import HeroSection from "../../components/marketing/HeroSection";

const MODULES = [
  { name: "Overview", bg: "#F7F5F0", text: "#1C2B3A", desc: "Before you can plan a transformation, you need to know where you stand. The Overview module gives you a complete picture of your workforce: headcount by function, tenure distributions, cost structure, and organizational health scores. It does not guess. It reads your data and tells you what is there. Every metric is filterable by function, job family, career level, and geography. You start here because every decision that follows depends on this baseline.", capabilities: "Workforce snapshot with real time filtering across every dimension. Organizational health scoring across six pillars from span of control to skills concentration. Transformation dashboard that tracks progress from baseline to target state.", href: "/start" },
  { name: "Diagnose", bg: "#0F1C2A", text: "#F7F5F0", desc: "The Diagnose module answers the question every transformation team asks first: where are we most exposed? It scans your workforce for AI automation potential, identifies which roles are most affected, scores each function on change readiness, and flags the structural issues that will slow you down. This is not a generic industry analysis. It uses your data, your roles, your specific organizational structure.", capabilities: "AI opportunity scanning that scores every role by automation and augmentation potential. Change readiness assessment that segments your workforce into Champions, Training Needs, and High Risk. Manager capability analysis that identifies which leaders can drive transformation and which will need support.", href: "/start" },
  { name: "Design", bg: "#F7F5F0", text: "#1C2B3A", desc: "This is where strategy becomes architecture. The Design module takes the diagnostic findings and helps you redesign roles, restructure teams, and build the future operating model. For each role, it decomposes tasks, scores them for AI impact, and reconstructs the role around the work that remains uniquely human. You are not eliminating roles. You are redesigning them so people do more of what only people can do.", capabilities: "Work Design Lab that decomposes every role into tasks, scores each task for AI potential, and rebuilds the role. Org Design Studio for restructuring teams and reporting lines. Operating Model Lab for designing the governance and capability architecture.", href: "/start" },
  { name: "Simulate", bg: "#0F1C2A", text: "#F7F5F0", desc: "Before you commit to a plan, you need to know what happens. The Simulate module builds three scenarios, Conservative, Moderate, and Aggressive, and shows you the financial impact, headcount changes, reskilling investment, and timeline for each. It connects your design decisions to financial outcomes so you can present a board ready business case, not a set of assumptions.", capabilities: "Three scenario projections with different adoption rates and investment levels. Financial modeling that calculates ROI, payback period, and net present value. Risk adjusted analysis that shows what happens when adoption is slower or faster than planned.", href: "/start" },
  { name: "Mobilize", bg: "#F7F5F0", text: "#1C2B3A", desc: "A plan without a roadmap is an aspiration. The Mobilize module turns your scenario into a phased implementation plan with workstreams, milestones, owners, and dependencies. It sequences the work based on change readiness data, assigns pilot functions based on champion density, and builds the reskilling pathways that turn affected employees into transformed ones.", capabilities: "Phased roadmap generation with workstreams, milestones, and dependencies. Reskilling pathway design that matches employees to target roles based on skill adjacency. Change management planning that adapts intensity by function based on readiness scores.", href: "/start" },
  { name: "Export", bg: "#0F1C2A", text: "#F7F5F0", desc: "Everything the platform produces can be exported as a board ready deliverable. The Export module compiles your analysis, findings, scenarios, and roadmap into a structured document that looks like it came from a top tier consulting engagement. Because the analytical rigor behind it is the same. The only difference is that you produced it in days instead of months, and it cost a fraction of what a consulting firm would charge.", capabilities: "Executive summary generation that distills the entire analysis into a concise narrative. Detailed report with all findings, metrics, and benchmark comparisons. Transformation roadmap export with timeline, milestones, and accountability matrix.", href: "/start" },
];

export default function TheToolNobodyElseBuilt() {
  return (
    <>
      <HeroSection
        eyebrow="We looked. It does not exist anywhere else."
        headline="Six modules. One connected system. Zero gaps between strategy and action."
      />

      {MODULES.map((m) => {
        const dark = m.bg === "#0F1C2A";
        return (
          <section key={m.name} style={{ background: m.bg, padding: "80px 32px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: m.text, margin: "0 0 20px", letterSpacing: -0.5 }}>{m.name}</h2>
              <p style={{ fontSize: 17, color: dark ? "rgba(247,245,240,0.65)" : "rgba(28,43,58,0.7)", lineHeight: 1.8, margin: "0 0 24px" }}>{m.desc}</p>
              <p style={{ fontSize: 15, color: dark ? "rgba(247,245,240,0.45)" : "rgba(28,43,58,0.5)", lineHeight: 1.8, margin: "0 0 28px" }}>{m.capabilities}</p>
              <Link href={m.href} style={{ fontSize: 15, fontWeight: 700, color: "#F97316", textDecoration: "none" }}>Open {m.name} →</Link>
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section style={{ background: "#0F1C2A", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#F7F5F0", margin: "0 0 24px", lineHeight: 1.4 }}>This is what a $10M engagement looks like. You are looking at it.</p>
          <Link href="/start" style={{ display: "inline-block", padding: "16px 36px", borderRadius: 8, background: "#F97316", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Start Here →</Link>
        </div>
      </section>
    </>
  );
}
