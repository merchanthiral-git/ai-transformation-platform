import MarketingLayout from "../../components/marketing/MarketingLayout";
import Link from "next/link";
import HeroSection from "../../components/marketing/HeroSection";

export default function WhatISawPage() {
  return (
    <MarketingLayout>
      <HeroSection headline="I built this because I kept watching organizations get it wrong from the inside." />

      {/* Long form content */}
      <section style={{ background: "#F7F5F0", padding: "80px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", fontSize: 17, color: "rgba(28,43,58,0.75)", lineHeight: 1.9 }}>
          <p>I work at Mercer. I sit inside workforce transformation engagements for some of the largest organizations in the world. I have seen what works, what does not, and why the gap between those two outcomes is almost always the same thing: the tools.</p>

          <p>The firms with the best frameworks, the ones that consistently produce transformation plans that actually get executed, have proprietary analytical systems that connect workforce data to strategic decisions. They spent years building these systems. They charge millions for access to them. And they are right to, because the output is genuinely valuable. When a CHRO gets a 200 page deliverable that shows exactly which roles are changing, what the reskilling investment looks like, and when the organization will see returns, that deliverable changes the trajectory of the transformation.</p>

          <p>The problem is access. Most organizations cannot afford a $5M to $10M consulting engagement to produce that analysis. And the ones that can often wait six months for the deliverable, by which point the competitive landscape has already shifted. The analytical rigor exists. The distribution model does not work for the moment we are in.</p>

          <p>AI is creating a once in a generation shift in how work gets designed. Not a gradual evolution but a structural reset. Every organization with more than a few hundred employees needs to understand which roles are changing, how fast, and what to do about it. The idea that this kind of clarity should be reserved for Fortune 500 companies with seven figure consulting budgets stopped making sense to me about two years ago.</p>

          <p>So I built the tool. Not as a simplified version of what the big firms produce. As the same level of analytical rigor, packaged in a system that any organization can use, without needing a team of consultants to operate it. The methodology is the same. The frameworks are the same. The data models, the scoring engines, the scenario projections, all built to the same standard I would use in a client engagement.</p>

          <p>The difference is that you do not need to wait six months. You do not need to spend millions. You upload your data, and the system gives you the same connected analysis that used to require a full engagement team working for quarters. I built it because I believe every organization deserves the clarity to get this right. Not just the ones that can afford it.</p>

          {/* Author */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid #E5E2D9", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800 }}>H</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1C2B3A" }}>Hiral Merchant</div>
              <div style={{ fontSize: 15, color: "rgba(28,43,58,0.5)" }}>Consultant, Mercer</div>
              <a href="https://www.linkedin.com/in/hiral-merchant-6a0416b1/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#F97316", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                LinkedIn →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section style={{ background: "#0F1C2A", padding: "64px 32px", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 700, color: "#F7F5F0", lineHeight: 1.5, maxWidth: 700, margin: "0 auto", fontStyle: "italic" }}>
          &ldquo;Every organization deserves the clarity to get this right. Not just the ones who can afford it.&rdquo;
        </p>
      </section>
    </MarketingLayout>
  );
}
