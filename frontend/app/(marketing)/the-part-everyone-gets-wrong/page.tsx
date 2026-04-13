import Link from "next/link";
import HeroSection from "../../components/marketing/HeroSection";

export default function ThePartEveryoneGetsWrong() {
  return (
    <>
      <HeroSection
        headline="Everyone agrees AI will change work. Almost nobody agrees on what to do about it."
        subheadline="That gap is where transformations die."
      />

      {/* Section 1 */}
      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1C2B3A", margin: "0 0 24px", letterSpacing: -0.5 }}>The Strategy Deck Problem</h2>
          <div style={{ fontSize: 17, color: "rgba(28,43,58,0.7)", lineHeight: 1.8 }}>
            <p>Most organizations have an AI strategy. It lives in a slide deck. It says things like &ldquo;deploy AI across functions&rdquo; and &ldquo;upskill the workforce.&rdquo; It was presented to the board. It received enthusiastic nods. And it has almost nothing to do with what will actually happen to the 400 people in Operations or the 1,200 people in Finance when these plans become real.</p>
            <p>The gap is not in the strategy itself. The gap is in the translation. Somewhere between &ldquo;we will adopt AI&rdquo; and &ldquo;here is what changes for Maria in Accounts Payable,&rdquo; the plan evaporates. There is no system connecting the strategic ambition to the workforce reality. There is a vision at the top and confusion at the bottom, with nothing in between except good intentions.</p>
            <p>This is not a failure of leadership. It is a failure of tooling. The strategy team has the vision. The HR team has the people data. The technology team has the implementation plan. Nobody has the connected system that shows how these three layers interact. So the strategy stays strategic and the workforce stays unprepared.</p>
            <p>The organizations that get this right do not start with better strategies. They start with a clear, data driven picture of which roles are changing, how fast, and what it means for the people in those roles. The strategy follows the data. Not the other way around.</p>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section style={{ background: "#0F1C2A", padding: "80px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#F7F5F0", margin: "0 0 24px", letterSpacing: -0.5 }}>The Skills Inventory Theater</h2>
          <div style={{ fontSize: 17, color: "rgba(247,245,240,0.65)", lineHeight: 1.8 }}>
            <p>Organizations run skills assessments. They survey employees. They produce spreadsheets that catalog who knows what, at what proficiency level, with what gaps remaining. These spreadsheets get uploaded to SharePoint. They get summarized in a presentation. They get discussed in a meeting. And then they sit there, because nobody has connected the skills inventory to any actual decision.</p>
            <p>The inventory becomes theater. A thing you did so you could say you did it. The CHRO can point to it and say &ldquo;we have assessed our skills landscape.&rdquo; But the assessment did not change any reskilling budget. It did not inform any role redesign. It did not trigger any talent mobility. It was an exercise in documentation, not in action.</p>
            <p>The problem is not that skills data is useless. The problem is that it exists in isolation. A skills inventory without a connected view of role changes, automation potential, and reskilling pathways is just a list. A list is not a plan. A plan requires knowing not just what skills people have, but which skills will matter in 18 months, which roles are being redesigned, and what the gap between current state and future state actually costs to close.</p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1C2B3A", margin: "0 0 24px", letterSpacing: -0.5 }}>The 18 Month Gap</h2>
          <div style={{ fontSize: 17, color: "rgba(28,43,58,0.7)", lineHeight: 1.8 }}>
            <p>Most organizations think they are six months from having a workforce transformation plan. They are actually 18 months behind. The reason is that what they call a &ldquo;plan&rdquo; is not one. A plan is not a document. A plan is a system of connected decisions: which roles change, who gets reskilled, what the timeline is, what it costs, and who is accountable for each piece.</p>
            <p>Most organizations have fragments. They have an AI strategy from the technology team. They have a skills audit from HR. They have a headcount model from Finance. They have a change management framework from the transformation office. None of these fragments talk to each other. Each one answers a different question in a different format with different assumptions.</p>
            <p>Closing the 18 month gap does not require faster work. It requires connected work. When the AI impact assessment feeds directly into the role redesign, which feeds directly into the reskilling plan, which feeds directly into the cost model, which feeds directly into the roadmap, you do not have five separate workstreams running in parallel. You have one system producing one coherent answer. That is what reduces 18 months to 6 weeks.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0F1C2A", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#F7F5F0", margin: "0 0 20px" }}>You have seen the problem. Now see the tool that solves it.</h2>
          <Link href="/the-tool-nobody-else-built" style={{ display: "inline-block", padding: "16px 36px", borderRadius: 8, background: "#F97316", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
            The Tool Nobody Else Built →
          </Link>
        </div>
      </section>
    </>
  );
}
