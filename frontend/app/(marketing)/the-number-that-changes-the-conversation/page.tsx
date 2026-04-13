"use client";
import { useState } from "react";
import HeroSection from "../../components/marketing/HeroSection";
import InsightCard from "../../components/marketing/InsightCard";

const INSIGHTS = [
  {
    title: "Your AI Roadmap Is Already Obsolete",
    category: "AI Strategy",
    readTime: "4 min read",
    content: "Most AI roadmaps were written in 2023 based on capabilities that existed in 2022. The technology has moved faster than the planning cycle. What was ambitious 18 months ago is now table stakes, and what seemed like science fiction is now in production at your competitors. The organizations that treat their AI strategy as a living document updated quarterly are pulling ahead. The ones still executing the roadmap they presented to the board last year are building toward a destination that no longer exists. The implication is not that planning is futile. It is that your planning system needs to be as dynamic as the technology it is trying to deploy. Static roadmaps cannot navigate exponential change.",
  },
  {
    title: "Skills Inventories Are Theater",
    category: "Workforce Planning",
    readTime: "3 min read",
    content: "Organizations spend millions cataloging their workforce skills. They survey employees, validate with managers, and produce impressive taxonomies. Then the data sits in a system that nobody queries because nobody has connected skills data to actual decisions. A skills inventory that does not feed directly into reskilling budgets, role redesign decisions, and talent mobility programs is not an asset. It is an expense dressed up as progress. The skills that matter are not the ones your employees have today. They are the ones they will need in 18 months when the redesigned roles go live. That means your skills analysis needs to run forward from the future state, not backward from the current one. Start with the transformed role, identify the skills it requires, compare to what exists, and the gap is your reskilling plan.",
  },
  {
    title: "The Workforce Layer Is Where Transformations Die",
    category: "Change Management",
    readTime: "5 min read",
    content: "Technology implementations succeed or fail at the adoption layer, and the adoption layer is made of people. Every transformation that stalled did so not because the technology was wrong but because the workforce was not ready, not willing, or not able to adopt it. The organizations that understand this invest as much in change readiness as they do in technology deployment. They assess willingness and ability at the individual level, segment their workforce into adoption cohorts, and design differentiated support for each segment. Champions get early access and advocacy roles. Training Needs get upskilling programs. Resistant but Capable employees get personalized change management. High Risk employees get compassionate transition support. This is not soft work. This is the work that determines whether your technology investment produces returns or becomes an expensive pilot that never scaled.",
  },
  {
    title: "The 18 Month Illusion",
    category: "AI Strategy",
    readTime: "4 min read",
    content: "Ask any organization how far they are from having a workforce transformation plan and they will say six months. They have been saying six months for the last two years. The reason is that what they call progress, running a skills assessment, building an AI strategy, commissioning a consulting study, feels like forward motion but does not actually produce a connected plan. Each workstream runs independently, produces its own output in its own format, and hands it to a coordination team that does not have the analytical infrastructure to synthesize it into a coherent answer. The real timeline is 18 months of connected work, from workforce baseline through diagnosis, design, simulation, and roadmap. Organizations that try to shortcut this by jumping to solutions before completing the diagnostic work end up redesigning the plan six months later when the data reveals problems they did not anticipate.",
  },
  {
    title: "Why Reskilling Programs Fail at Scale",
    category: "Workforce Planning",
    readTime: "4 min read",
    content: "Reskilling programs fail for a specific, predictable reason: they are designed around skills categories instead of role transitions. An organization identifies that it needs more data science capability and launches a data science training program. Six months later, completion rates are low and application rates are lower. The program failed not because the training was bad but because it was disconnected from the actual role changes people were being asked to make. Effective reskilling starts with the redesigned role, works backward to the skill gaps, and builds pathways that are personalized to each employee is starting point. An accountant moving into a data analytics role needs a different pathway than a project manager making the same transition. The skill gap is the same, the journey is different. Scale comes from systematizing the pathway design, not from putting everyone through the same course.",
  },
  {
    title: "The Cost of Doing Nothing Is Now Calculable",
    category: "Org Design",
    readTime: "3 min read",
    content: "For the first time, the cost of inaction on workforce transformation is quantifiable. You can calculate the FTE hours being spent on tasks that AI can perform. You can estimate the salary cost of those hours. You can model the competitive gap that opens when peers automate and you do not. You can project the attrition cost of losing your best people to organizations that are investing in AI augmented roles. When the cost of doing nothing was abstract, it was easy to defer. When you can put a dollar figure on it, a figure that compounds every quarter you delay, the conversation changes. The number is not speculative. It comes from your data, your roles, your salary bands, your industry benchmarks. And it is almost always larger than leadership expected.",
  },
];

const CATEGORIES = ["All", "AI Strategy", "Workforce Planning", "Change Management", "Org Design"];

export default function TheNumberPage() {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? INSIGHTS : INSIGHTS.filter(i => i.category === filter);

  return (
    <>
      <HeroSection
        headline="One number. Then the conversation changes."
        subheadline="Everything below is what we have learned building at the intersection of AI and workforce transformation."
      />

      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{
                padding: "8px 20px", borderRadius: 6, fontSize: 14, fontWeight: filter === cat ? 700 : 500,
                background: filter === cat ? "#F97316" : "transparent",
                color: filter === cat ? "#fff" : "rgba(28,43,58,0.5)",
                border: filter === cat ? "none" : "1px solid #E5E2D9",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Insight grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 24 }}>
            {filtered.map(insight => (
              <InsightCard key={insight.title} title={insight.title} category={insight.category} readTime={insight.readTime} content={insight.content} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
