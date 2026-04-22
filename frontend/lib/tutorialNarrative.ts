/**
 * Tutorial narrative system — persona-adapted text for every step.
 * 4 persona variants per step: chro, hr_leader, consultant, biz_leader.
 */

export type Persona = "chro" | "hr_leader" | "consultant" | "biz_leader";

export type PersonaFrame = {
  headline: string;
  context: string;
  insight: string;
  callout: string;
};

type StepNarrative = {
  stepId: string;
  personas: Record<Persona, PersonaFrame>;
};

export const PERSONA_INFO: Record<Persona, { icon: string; label: string; subtitle: string }> = {
  chro: { icon: "🏢", label: "CHRO / CPO", subtitle: "Leading workforce strategy" },
  hr_leader: { icon: "📊", label: "HR Leader", subtitle: "Managing people programs" },
  consultant: { icon: "💼", label: "Consultant", subtitle: "Advising client organizations" },
  biz_leader: { icon: "📈", label: "Business Leader", subtitle: "Running a function or business unit" },
};

export const CHALLENGE_INFO: Record<string, { icon: string; label: string; subtitle: string }> = {
  ai_strategy: { icon: "🤖", label: "AI Strategy", subtitle: "Understanding AI's impact on my workforce" },
  cost_pressure: { icon: "📉", label: "Cost Pressure", subtitle: "Reducing headcount costs sustainably" },
  skills_gaps: { icon: "🧠", label: "Skills Gaps", subtitle: "Building capabilities for the future" },
  org_redesign: { icon: "🔄", label: "Org Redesign", subtitle: "Restructuring for a new operating model" },
};

export const NARRATIVES: StepNarrative[] = [
  {
    stepId: "situation",
    personas: {
      chro: { headline: "Meridian's board just asked the question every CHRO dreads", context: "As CHRO, you need a data-backed answer within weeks, not months. This is the question the platform answers.", insight: "6,200 employees. $2.1B in labor costs. The board wants to know: what does AI mean for our workforce?", callout: "This is your board conversation toolkit." },
      hr_leader: { headline: "Leadership wants to know: which roles are at risk, and what's the plan?", context: "You've been asked to lead the workforce impact analysis. The platform gives you the analytical backbone.", insight: "6,200 employees across 8 functions need to be assessed for AI impact, readiness, and reskilling.", callout: "By the end of this, you'll have a defensible plan." },
      consultant: { headline: "Your client just called — they need an AI workforce strategy in 60 days", context: "Meridian Financial is your client. 6,200 employees, financial services, under board pressure. Sound familiar?", insight: "The platform delivers what a 6-person team would take 3 months to produce — in days.", callout: "Client delivery tip: use this as your analytical accelerator." },
      biz_leader: { headline: "Your function is about to be asked to do more with less. AI is the reason.", context: "The CEO has committed to an AI transformation. Every function head needs a workforce plan. Here's how to build yours.", insight: "6,200 employees, 8 functions, and yours is one of them. The question: what changes and what doesn't?", callout: "You'll leave with a plan for your specific function." },
    },
  },
  {
    stepId: "data",
    personas: {
      chro: { headline: "It starts with your workforce data", context: "You don't need perfect data. You need enough data to make confident decisions. Most CHROs overestimate the data barrier.", insight: "Meridian's data is already loaded. In a real project, your HRIS team fills this template in 2-3 hours.", callout: "Download the template — send it to your People Analytics team." },
      hr_leader: { headline: "The data your team already has is enough", context: "The platform needs 5 data tables. Your HRIS, job catalog, and task inventories already contain most of this.", insight: "Meridian loaded 6,200 employees, 47 roles, 396 tasks, and 89 skills. Your org likely has similar coverage.", callout: "Start with what you have — the platform fills gaps intelligently." },
      consultant: { headline: "This is your data collection ask to the client", context: "Five sheets, one workbook. Send this template in the kickoff email. Most clients complete it in a half-day workshop.", insight: "The template is designed for HR generalists, not data engineers. Every field has validation and examples.", callout: "Pro tip: schedule a 2-hour 'data sprint' — works better than async requests." },
      biz_leader: { headline: "Your HR team does the data work — you provide the business context", context: "The platform needs workforce data from HR and task-level detail from function leaders like you.", insight: "Your contribution: validate the task list for your roles. HR handles the rest.", callout: "Ask your HRBP to set up a 30-minute task validation session." },
    },
  },
  {
    stepId: "snapshot",
    personas: {
      chro: { headline: "First — understand what you're working with", context: "Before making any decisions, you need a clear picture of your workforce as it stands today.", insight: "Operations has the highest AI impact (8.2/10) but the lowest readiness (4.1/10). This tension is your starting point.", callout: "Board-ready insight: your biggest opportunity is also your biggest risk." },
      hr_leader: { headline: "Here's your workforce at a glance", context: "These KPIs are the baseline for every conversation you'll have about transformation. Memorize the big numbers.", insight: "6,200 employees, 52/100 readiness, and a massive gap between Operations impact and readiness.", callout: "Print this snapshot — you'll reference it in every planning meeting." },
      consultant: { headline: "The current-state baseline that anchors everything", context: "No recommendation holds without a clear baseline. This is your 'Slide 2' — the state of the workforce today.", insight: "The Operations-readiness gap is your anchor finding. Every recommendation flows from it.", callout: "Delivery note: always establish the baseline before showing any recommendations." },
      biz_leader: { headline: "See how your function compares", context: "Each function has different AI exposure and readiness. Find yours and understand where you stand.", insight: "Operations (8.2 impact, 4.1 readiness) vs Technology (6.8 impact, 7.4 readiness). The gap tells the story.", callout: "Your function's readiness score determines how quickly you can move." },
    },
  },
  {
    stepId: "diagnosis",
    personas: {
      chro: { headline: "Meridian's AI risk is concentrated — and that's actually good news", context: "As CHRO, you need to know where transformation will hit hardest before your CEO asks.", insight: "45% of roles are high-risk, but they're concentrated in 2 functions. That means a focused intervention, not company-wide disruption.", callout: "Board-ready finding: 'AI impact is manageable with targeted intervention in Operations and Finance.'" },
      hr_leader: { headline: "These are the roles and skills that need your attention first", context: "The diagnosis prioritizes your workload. Not every role needs attention — these 5 areas do.", insight: "2,100 employees need AI literacy training. But 1,200 of them are in Operations — start there.", callout: "Build your reskilling business case around the top 3 skills gaps." },
      consultant: { headline: "Here's the finding that will anchor your client presentation", context: "Your client needs a clear story, not a data dump. This diagnosis gives you the anchor insight.", insight: "45% high-risk roles concentrated in 2 functions — this is your 'burning platform' slide.", callout: "Lead with this. It reframes AI from a threat to a scoped, solvable problem." },
      biz_leader: { headline: "Here's what AI actually means for your function's roles", context: "Forget the headlines. This is role-by-role, task-by-task analysis specific to your org.", insight: "Your function has specific roles flagged. The next step: understand which tasks change.", callout: "Focus on the top 3 roles with highest AI impact in your function." },
    },
  },
  {
    stepId: "design",
    personas: {
      chro: { headline: "This is how a role evolves — not disappears", context: "The narrative matters. Roles don't vanish — they transform. This is the evidence.", insight: "Operations Analyst: 12 tasks automated, 4 augmented, 2 remain human. It becomes AI Operations Specialist.", callout: "Tell the board: 'We're evolving 420 roles, not sunsetting them.'" },
      hr_leader: { headline: "Task-level redesign your HRBPs can actually execute", context: "This is the conversation template for every HRBP-function head meeting.", insight: "18 tasks deconstructed. Each one classified with a clear rationale. No ambiguity.", callout: "Schedule role redesign sessions for the top 5 impacted roles." },
      consultant: { headline: "This is your role redesign deliverable — specific enough to act on", context: "Most transformation projects fail at the task level. This makes it concrete.", insight: "Task-by-task classification with technology suggestions and skill requirements.", callout: "This level of granularity is what separates a $50K deliverable from a $500K one." },
      biz_leader: { headline: "See exactly which tasks in your roles change — and which don't", context: "No surprises. Every task your team does today is classified: automate, augment, or keep human.", insight: "Your people aren't being replaced. Their work is being redistributed.", callout: "Share this with your team leads — transparency reduces resistance." },
    },
  },
  {
    stepId: "scenario",
    personas: {
      chro: { headline: "This is what you present to the CFO", context: "Not a headcount cut — a workforce evolution with a business case.", insight: "-180 headcount · 12% cost reduction · 18 months · 3.2% attrition. The math works.", callout: "The scenario balances cost reduction with controlled attrition — exactly what the board needs." },
      hr_leader: { headline: "Three scenarios, clear tradeoffs, your recommendation", context: "You don't present one option. You present three with a recommendation. This builds trust.", insight: "Optimized scenario: 12% savings with only 3.2% attrition. Conservative: 6% savings, zero risk.", callout: "Always present the recommended scenario alongside a conservative alternative." },
      consultant: { headline: "This is your scenario slide — the moment of truth", context: "The scenario comparison is where board conversations either gain momentum or stall.", insight: "Three options. Clear tradeoffs. One recommendation. This is consulting craft.", callout: "Present the optimized scenario as 'recommended' — clients want your point of view." },
      biz_leader: { headline: "Model the impact before committing your function", context: "Stress test the scenario against your specific function before agreeing to anything.", insight: "What happens if you lose 15% of senior staff? The stress test shows the cascade.", callout: "Run the stress test for your function — bring the results to the leadership meeting." },
    },
  },
  {
    stepId: "plan",
    personas: {
      chro: { headline: "Turn the scenario into a people plan", context: "This is your reskilling business case. $4.2M investment, 18-month timeline, 3.2% attrition — versus 8% if you do nothing.", insight: "2,100 employees need reskilling. Sequenced in 3 waves. The skills network shows the shortest paths.", callout: "Present the investment alongside the cost of inaction. The delta is the business case." },
      hr_leader: { headline: "Per-employee pathways your L&D team can execute", context: "Not a generic training plan — individual pathways per employee with timelines and costs.", insight: "Wave 1: 800 high-priority employees. Wave 2: 900 medium. Wave 3: 400 low-priority.", callout: "Start with Wave 1 — the quick wins build momentum for the rest." },
      consultant: { headline: "This is your mobilize workstream — the execution plan", context: "Per-employee pathways, wave sequencing, change readiness by function.", insight: "The skills adjacency network shows employees they're already 60% of the way there.", callout: "The network visual is a powerful change management tool — it makes reskilling feel achievable." },
      biz_leader: { headline: "See exactly who in your team needs what training, and when", context: "Your function's employees are mapped with specific skill gaps, timelines, and wave assignments.", insight: "Most of your team's reskilling is 3-6 months, not years. The adjacency shows they're close.", callout: "Review your Wave 1 employees — they should start next quarter." },
    },
  },
  {
    stepId: "handoff",
    personas: {
      chro: { headline: "Meridian has a transformation strategy.", context: "You now have everything you need for the board conversation that started this. The platform did in 8 minutes what typically takes 8 weeks.", insight: "Diagnosis → Design → Scenario → Plan. All connected. All defensible. All exportable.", callout: "The Flight Recorder captured every decision. Your audit trail is complete." },
      hr_leader: { headline: "You have a plan your leadership team can rally behind.", context: "Data-backed, specific, actionable. This is your seat at the table.", insight: "From workforce snapshot to per-employee reskilling plans — in one continuous flow.", callout: "Export the executive summary and share with your leadership team." },
      consultant: { headline: "This is a client deliverable.", context: "Diagnosis, design, scenario, plan — all in one platform, all in one session.", insight: "What took 8 minutes in this tutorial takes 2-3 days with real client data. That's the value proposition.", callout: "Your first engagement: upload the client's data and run the same flow you just learned." },
      biz_leader: { headline: "Now you know exactly what's coming — and what to do about it.", context: "Your function's AI transformation is planned. Roles, tasks, timelines, costs — all specific.", insight: "No more guessing. Every claim is backed by task-level data.", callout: "Share this with your team. Transparency is the best change management tool." },
    },
  },
];

export function getNarrative(stepIndex: number, persona: Persona): PersonaFrame {
  const step = NARRATIVES[stepIndex];
  if (!step) return { headline: "", context: "", insight: "", callout: "" };
  return step.personas[persona] || step.personas.chro;
}
