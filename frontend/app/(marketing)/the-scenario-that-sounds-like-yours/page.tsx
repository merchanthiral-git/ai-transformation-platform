import MarketingLayout from "../../components/marketing/MarketingLayout";
import Link from "next/link";
import HeroSection from "../../components/marketing/HeroSection";

const PERSONAS = [
  {
    title: "The CHRO", quote: "I have 90 days to tell the board what AI means for our people. I do not have a credible answer yet.",
    bg: "#F7F5F0", text: "#1C2B3A",
    content: `You have the strategic mandate but not the analytical infrastructure. The board wants specifics: which functions are most affected, what the headcount impact looks like, what the reskilling investment will cost, and when they will see returns. Your team has fragments of this picture spread across a dozen spreadsheets, but nobody has assembled a coherent, defensible view.\n\nThe pressure is compounding because your peers at other companies are already presenting transformation plans. You cannot afford to be behind. But you also cannot afford to present a plan built on assumptions rather than data. The stakes are too high for a deck that says "we will figure it out." You need a system that produces the answer, not a process that promises to eventually find one.\n\nWhat you need is not more analysis. You need connected analysis: a single view that starts with your workforce data and flows through diagnosis, design, simulation, and roadmap creation without losing the thread between steps.`,
    modules: [
      { name: "Overview", reason: "Start with the complete workforce baseline your board will need as context." },
      { name: "Diagnose", reason: "Identify the specific exposure areas that will drive your transformation narrative." },
      { name: "Simulate", reason: "Build the three scenarios your board needs to make an informed resource allocation decision." },
    ],
    cta: { label: "Start with Overview →", href: "/start" },
  },
  {
    title: "The Business Unit Leader", quote: "My team keeps asking if their jobs are safe. I keep saying we are figuring it out. That is not good enough anymore.",
    bg: "#0F1C2A", text: "#F7F5F0",
    content: `Your people are watching. They read the same headlines about AI replacing jobs. They see the pilots being announced in other divisions. They have questions that deserve honest, specific answers. Not platitudes about "upskilling" and "embracing change," but real information about what is changing in their specific roles and what support they will receive.\n\nThe challenge is that you do not have role level detail. You know AI will affect your function. You do not know which specific tasks within which specific roles will be automated, augmented, or untouched. Without that granularity, you cannot have the honest conversations your people deserve. You are stuck giving vague reassurances when what they need is a concrete picture of the future.\n\nThe Design module gives you that picture. It breaks every role into its component tasks, scores each task for AI impact, and shows you exactly what the redesigned role looks like. When you can sit down with your team and say "here is what is changing and here is what is staying," you turn anxiety into clarity.`,
    modules: [
      { name: "Design", reason: "Get the task level view of how each role in your function is changing." },
      { name: "Mobilize", reason: "Build the reskilling and transition plan for the people who are affected." },
      { name: "Diagnose", reason: "Understand the change readiness of your team so you know who needs extra support." },
    ],
    cta: { label: "Start with Design →", href: "/start" },
  },
  {
    title: "The Transformation Lead", quote: "We have a strategy. We do not have a plan. Everyone in the room knows the difference.",
    bg: "#F7F5F0", text: "#1C2B3A",
    content: `You are the person who has to turn the executive vision into an operational reality. You sit between the C suite who wants transformation and the organization that has to live through it. Your job is to build the bridge, and right now the bridge is made of PowerPoint slides and good intentions.\n\nYou know the difference between a strategy and a plan. A strategy says what you want to achieve. A plan says how you will achieve it: which roles change first, who is accountable, what the dependencies are, what the budget is, and what happens when things do not go as expected. You have the strategy. You do not have the plan.\n\nThe platform gives you the planning system you need. It starts with data, flows through diagnosis and design, and outputs a phased roadmap with workstreams, milestones, and owners. Every decision in the plan is traceable back to a data point. When someone in the steering committee asks "why are we starting with Operations," you have the answer: because the data shows Operations has the highest automation potential and the strongest change readiness scores.`,
    modules: [
      { name: "Diagnose", reason: "Establish the evidence base for every decision in your transformation plan." },
      { name: "Simulate", reason: "Model the financial impact so your plan has a business case attached to it." },
      { name: "Mobilize", reason: "Create the phased roadmap that turns your strategy into sequenced, accountable work." },
    ],
    cta: { label: "Start with Diagnose →", href: "/start" },
  },
  {
    title: "The Consultant", quote: "My client needs a workforce assessment in six weeks. Nothing that exists was built for this moment.",
    bg: "#0F1C2A", text: "#F7F5F0",
    content: `You have done this work before. You know the frameworks. You know the methodology. What you do not have is a tool that produces the deliverable at the speed your client needs. The traditional approach, assembling a team, collecting data, running analyses in spreadsheets, building a PowerPoint, takes three to six months. Your client cannot wait that long.\n\nYour credibility is on the line. The client hired you because they believe you can provide clarity they cannot produce internally. If your approach is "give us your data and we will come back in four months with a deck," you are not solving their problem. You are adding to their timeline. They need answers in weeks, not quarters.\n\nThis platform is the analytical engine behind a consulting engagement. It takes your client is data and produces the diagnosis, design, simulation, and roadmap that would normally require a full team working for months. You bring the judgment, the client relationships, and the strategic context. The platform brings the analytical throughput. Together, you deliver in six weeks what used to take six months.`,
    modules: [
      { name: "Overview", reason: "Build the client baseline in hours instead of weeks." },
      { name: "Design", reason: "Produce the work redesign analysis that is the core of your deliverable." },
      { name: "Export", reason: "Generate the board ready document that makes your client look brilliant." },
    ],
    cta: { label: "Start with Overview →", href: "/start" },
  },
];

export default function TheScenarioPage() {
  return (
    <MarketingLayout>
      <HeroSection headline="Find your situation. Then see what the platform does about it." />
      {PERSONAS.map((p) => {
        const dark = p.bg === "#0F1C2A";
        const muted = dark ? "rgba(247,245,240,0.55)" : "rgba(28,43,58,0.6)";
        return (
          <section key={p.title} style={{ background: p.bg, padding: "80px 32px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F97316", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>{p.title}</div>
              <p style={{ fontSize: 20, color: p.text, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 32px", opacity: 0.8 }}>&ldquo;{p.quote}&rdquo;</p>
              {p.content.split("\n\n").map((para, i) => (
                <p key={i} style={{ fontSize: 17, color: muted, lineHeight: 1.8, margin: "0 0 20px" }}>{para}</p>
              ))}
              <div style={{ marginTop: 40, marginBottom: 32 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: p.text, marginBottom: 16, opacity: 0.7 }}>Which modules matter most for you</div>
                {p.modules.map(m => (
                  <div key={m.name} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, color: "#F97316", flexShrink: 0 }}>{m.name}:</span>
                    <span style={{ color: muted }}>{m.reason}</span>
                  </div>
                ))}
              </div>
              <Link href={p.cta.href} style={{ display: "inline-block", padding: "14px 32px", borderRadius: 8, background: "#F97316", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>{p.cta.label}</Link>
            </div>
          </section>
        );
      })}
    </MarketingLayout>
  );
}
