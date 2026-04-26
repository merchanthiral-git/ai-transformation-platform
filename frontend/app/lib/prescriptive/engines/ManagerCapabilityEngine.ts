/* ═══════════════════════════════════════════════════════════════
   Manager Capability — Prescription Engine

   Rules-based engine that produces a personalized roadmap from
   manager population distribution data. No LLM — every prescription
   is deterministic and traceable.
   ═══════════════════════════════════════════════════════════════ */

import type { PrescriptionEngine } from "../PrescriptionEngine";
import type { PrescribedRoadmap, RoadmapStep, DiagnosisItem, StrategicQuestion } from "../types";

/* ── Input type ── */

export type ManagerCapabilityResult = {
  totalManagers: number;
  championCount: number;
  needsDevCount: number;
  flightRiskCount: number;
  adequateCount: number;
  weakestDimension: string;
  correlationMultiplier: number;
  highMgrTeamReadiness: number;
  lowMgrTeamReadiness: number;
  dimensions: string[];
};

/* ── Band logic ── */

type Band = "Critical" | "Fragile" | "Developing" | "Capable" | "Exceptional";

function determineBand(r: ManagerCapabilityResult): Band {
  const total = r.totalManagers || 1;
  const champRatio = r.championCount / total;
  const riskRatio = r.flightRiskCount / total;
  const devRatio = r.needsDevCount / total;

  if (riskRatio >= 0.30 || champRatio < 0.05) return "Critical";
  if (riskRatio >= 0.15 || (devRatio >= 0.50 && champRatio < 0.15)) return "Fragile";
  if (devRatio >= 0.30 && champRatio >= 0.15) return "Developing";
  if (champRatio >= 0.40 && riskRatio < 0.05) return "Exceptional";
  if (champRatio >= 0.25 && riskRatio < 0.10) return "Capable";
  return "Developing"; // safe default
}

const BAND_DESCRIPTIONS: Record<Band, string> = {
  Critical: "Your manager population is structurally unready to lead transformation. The risk of in-flight derailment is severe. Two-thirds of organizations at this stage stall within 12 months — usually not because the strategy was wrong, but because the people responsible for executing it couldn't carry it. Stabilize before designing.",
  Fragile: "You have enough capable managers to start, but the bench is thin. Transformation will move at the speed of your weakest layer, not your strongest. The danger now is overloading your Champions while underinvesting in your Needs Development cohort — a pattern that looks fine at launch and collapses at scale.",
  Developing: "A workable manager profile, but the development gap is real. The question isn't whether to invest in managers — it's whether you can develop them faster than the transformation arrives. Organizations at this stage that build manager capability in parallel with design work succeed; those that sequence it fail.",
  Capable: "Your manager population can carry this. The risk shifts from capacity to alignment — making sure your strongest managers are pointed at the highest-leverage work, not dispersed across low-stakes projects. Champion misallocation is the most expensive waste pattern in capable organizations.",
  Exceptional: "Rare and valuable. Most organizations would trade a year of revenue for this manager profile. The dangers now are complacency and misallocation, not capacity. Your Champions may also be your most change-fatigued people — watch for quiet burnout beneath surface performance.",
};

/* ── Default module lists per band ── */

const BAND_MODULES: Record<Band, Array<{ moduleId: string; rationale: string; emphasis?: string; effort?: "low" | "medium" | "high" }>> = {
  Critical: [
    { moduleId: "mgrdev", rationale: "Your manager population needs foundational development before they can lead anything new. Start here — everything else depends on it.", emphasis: "Focus on the Flight Risk cohort first: stabilize before you develop.", effort: "high" },
    { moduleId: "changeready", rationale: "Change Readiness diagnoses where organizational fragility will surface first — with a Critical manager population, expect early resistance.", effort: "medium" },
    { moduleId: "plan", rationale: "You need a change plan that accounts for manager capability gaps. A standard transformation playbook will break against this profile.", emphasis: "Build the governance and communication structures first; delay the initiative roadmap.", effort: "high" },
    { moduleId: "readiness", rationale: "If you haven't assessed AI readiness across the broader org, do it now — the manager layer compounds whatever the org-level readiness score says.", effort: "low" },
    { moduleId: "skills", rationale: "Map the skill gaps your managers will need to close. This feeds directly into targeted development programs.", effort: "medium" },
  ],
  Fragile: [
    { moduleId: "mgrdev", rationale: "Build the manager bench in parallel with low-risk design work. Your Champions can carry the design; your Needs Development cohort needs structured growth.", effort: "high" },
    { moduleId: "plan", rationale: "Your change plan needs explicit manager-readiness gates — don't launch workstreams until the managers who own them are ready.", effort: "medium" },
    { moduleId: "scan", rationale: "Identify which AI opportunities your current manager population can realistically deliver, and which require capability they don't yet have.", effort: "medium" },
    { moduleId: "skills", rationale: "Skills mapping reveals which manager capability gaps are coachable (weeks) vs. structural (months). Plan accordingly.", effort: "medium" },
    { moduleId: "design", rationale: "Begin work design with your Champions, not your full manager population. Low-risk design builds confidence and creates reference implementations.", emphasis: "Assign Champions to lead; Needs Dev managers observe and learn.", effort: "high" },
  ],
  Developing: [
    { moduleId: "scan", rationale: "Your managers are ready for a standard transformation arc. Start with the opportunity scan to identify where AI creates the most value.", effort: "medium" },
    { moduleId: "skills", rationale: "Map the skills your redesigned roles will require. Your managers will own the reskilling conversation with their teams.", effort: "medium" },
    { moduleId: "mgrdev", rationale: "Invest in manager development alongside the design work — not before it, not after it.", emphasis: "Focus on coaching capability and change communication.", effort: "medium" },
    { moduleId: "design", rationale: "Your manager population can handle work redesign. Pair each design workstream with a Champion sponsor.", effort: "high" },
    { moduleId: "plan", rationale: "Build the change plan with manager milestone gates. Your Developing profile means timeline discipline matters more than ambition.", effort: "medium" },
  ],
  Capable: [
    { moduleId: "scan", rationale: "With a capable manager layer, move into design-phase work. Start with the opportunity scan to prioritize where to focus.", effort: "medium" },
    { moduleId: "design", rationale: "Your managers can carry work redesign. The constraint is prioritization, not capability — make sure Champions own the highest-leverage workstreams.", effort: "high" },
    { moduleId: "opmodel", rationale: "With strong managers, you can think structurally about operating model changes that weaker manager populations can't sustain.", effort: "high" },
    { moduleId: "bbba", rationale: "Build/Buy/Borrow/Automate analysis benefits from manager input — your Champions can provide realistic feasibility assessments.", effort: "medium" },
    { moduleId: "plan", rationale: "Your change plan can be more ambitious than a Fragile or Developing org's plan. Push the timeline.", effort: "medium" },
  ],
  Exceptional: [
    { moduleId: "scan", rationale: "With an exceptional manager layer, scan ambitiously. Your managers can absorb more disruption than most organizations dare to design.", effort: "medium" },
    { moduleId: "design", rationale: "Design boldly. Your manager population can carry complex, multi-phase work redesign across the organization.", effort: "high" },
    { moduleId: "opmodel", rationale: "You have the manager capability to sustain operating model changes that most organizations can only aspire to.", effort: "high" },
    { moduleId: "bbba", rationale: "Your Champions can provide unusually realistic feasibility assessments. Use them as sounding boards, not just executors.", effort: "medium" },
    { moduleId: "build", rationale: "Structural org design work is viable with this profile. Your managers can absorb span changes and reporting line shifts.", effort: "high" },
    { moduleId: "plan", rationale: "Your change plan should match your ambition — the constraint is strategic clarity, not execution capacity.", effort: "medium" },
  ],
};

/* ── Dimension weakness rules ── */

function getDimensionRules(dim: string, r: ManagerCapabilityResult): {
  modules: Array<{ moduleId: string; rationale: string; emphasis?: string }>;
  diagnosis: DiagnosisItem;
  questions: StrategicQuestion[];
} | null {
  const d = dim.toLowerCase();

  if (d.includes("ai") || d.includes("literacy") || d.includes("awareness") || d.includes("tech")) {
    return {
      modules: [
        { moduleId: "scan", rationale: "Manager-level AI literacy is the rate-limiter for adoption. Start by showing managers what AI actually does for their specific function." },
        { moduleId: "readiness", rationale: "If you haven't assessed org-wide AI readiness, the manager AI literacy gap may be masking a broader problem." },
      ],
      diagnosis: { title: "Manager AI literacy gap", finding: `${r.weakestDimension} is the weakest dimension across your manager population.`, whyItMatters: "Programs that bypass managers because 'we'll train ICs directly' consistently underperform. Managers who don't understand what AI does won't trust their teams' AI-assisted output — and untrusted output doesn't get used.", cost: "Every month of delayed manager AI literacy adds 2-3 months to downstream adoption timelines. The gap compounds: uninformed managers make uninformed resource allocation decisions.", whatGoodLooksLike: "Top-quartile organizations have 80%+ of managers scoring 3.5/5 or above on AI awareness. They can explain AI's capabilities and limitations to their teams without a script.", severity: "critical", confidence: "high" },
      questions: [
        { question: "When your managers hear 'AI transformation,' what do they picture? If the answer is 'job cuts,' your communication has failed before your program has started.", framing: "Manager mental models of AI determine whether they amplify or resist adoption. If they see AI as a threat to their teams, they will protect their teams from AI — regardless of the official strategy.", category: "talent" },
        { question: "How many of your managers have personally used an AI tool to complete a work task in the last 30 days — not a demo, an actual task?", framing: "Personal experience is the only reliable predictor of AI advocacy. Managers who haven't used AI tools will evaluate them theoretically, and theoretical evaluations skew negative.", category: "operations" },
      ],
    };
  }

  if (d.includes("coach") || d.includes("mentoring") || d.includes("development")) {
    return {
      modules: [
        { moduleId: "mgrdev", rationale: "When AI changes how work happens, the manager's job changes from supervisor to coach. If your managers can't coach, they will manage by surveillance instead." },
        { moduleId: "plan", rationale: "Your change plan needs explicit coaching-capability gates before each phase goes live.", emphasis: "Focus on the governance committee structure and decision rights." },
      ],
      diagnosis: { title: "Coaching capability deficit", finding: `${r.weakestDimension} is the weakest manager dimension.`, whyItMatters: "Surveillance kills adoption. When AI changes task composition, employees need coaching through the transition — not monitoring. Managers who default to surveillance will drive adoption underground or out entirely.", cost: "Organizations with weak coaching capability see 40-60% lower AI tool adoption rates 12 months post-deployment, even with identical tooling and training budgets.", whatGoodLooksLike: "Best-in-class organizations train managers as coaches first, change agents second. Target: every Needs Development manager paired with a Champion for structured peer coaching.", severity: "critical", confidence: "high" },
      questions: [
        { question: "If you asked your managers to spend 30% less time supervising and 30% more time coaching, how many could make that shift tomorrow? If the answer is less than half, your development program starts there.", framing: "The coaching shift isn't a nice-to-have — it's the mechanism by which AI adoption actually happens at the team level.", category: "talent" },
      ],
    };
  }

  if (d.includes("change") || d.includes("communication") || d.includes("comms")) {
    return {
      modules: [
        { moduleId: "plan", rationale: "Change communication is where transformation programs go to die. Your change plan must build communication capability, not just communication materials." },
        { moduleId: "changeready", rationale: "Diagnose where communication breakdown will surface first — it's rarely where you expect." },
      ],
      diagnosis: { title: "Change communication gap", finding: `${r.weakestDimension} is the weakest manager dimension.`, whyItMatters: "The most common failure mode: leadership says it once, managers don't repeat it, ICs assume it isn't real. Communication isn't a channel problem — it's a repetition and conviction problem, and managers are the repetition mechanism.", cost: "Every communication gap adds resistance that compounds. By the time you see the symptoms (missed deadlines, low adoption, passive resistance), you're 3-6 months behind.", whatGoodLooksLike: "Effective transformation communication reaches every IC through their direct manager at least 3 times before any change goes live. That requires managers who can explain the why, not just the what.", severity: "important", confidence: "high" },
      questions: [
        { question: "When was the last time a manager in your organization had to deliver bad news about a change to their team — and did it well? If you can't name an example, your managers haven't been tested.", framing: "The real test of communication capability isn't the town hall — it's the Monday morning 1:1 where the manager explains why someone's role is changing.", category: "culture" },
      ],
    };
  }

  if (d.includes("talent") || d.includes("skill") || d.includes("people")) {
    return {
      modules: [
        { moduleId: "skills", rationale: "If your managers can't grow their teams' skills, your reskilling program will route around them — which means it won't land." },
        { moduleId: "reskill", rationale: "Build reskilling pathways that managers can own and deliver, not pathways that bypass them." },
      ],
      diagnosis: { title: "Talent development deficit", finding: `${r.weakestDimension} is the weakest manager dimension.`, whyItMatters: "Reskilling programs that bypass managers have a 70% failure rate at 18 months. Not because the content was wrong, but because no one with authority reinforced it daily.", cost: "Reskilling investments without manager ownership waste 50-70% of their budget. The content gets consumed; the behavior doesn't change.", whatGoodLooksLike: "Target: every manager can articulate their team's top 3 skill gaps and has a written plan for each. That plan should reference specific modules and timelines.", severity: "important", confidence: "high" },
      questions: [
        { question: "Can your managers name their team's top 3 skill gaps right now, without looking at a report? If not, your skills data exists in systems but not in the people who need to act on it.", framing: "Manager awareness of skill gaps is the precondition for reskilling — if they can't name the gaps, they can't sequence the development.", category: "talent" },
      ],
    };
  }

  if (d.includes("decision") || d.includes("autonomy") || d.includes("judgment")) {
    return {
      modules: [
        { moduleId: "opmodel", rationale: "Manager decision-making capability sets the ceiling on how much you can decentralize. AI tooling pushes decisions downward; if managers can't catch them, decisions queue up." },
        { moduleId: "plan", rationale: "Your change plan needs to account for decision-rights redistribution. Don't redesign the operating model faster than your managers can absorb new decision authority." },
      ],
      diagnosis: { title: "Decision-making capacity gap", finding: `${r.weakestDimension} is the weakest manager dimension.`, whyItMatters: "AI tooling generates more decisions per unit time. If your managers can't process them, you'll see either decision backlogs (slow) or decision avoidance (dangerous). Both are symptoms of the same constraint.", cost: "Decision backlogs slow transformation timelines by 30-50%. Decision avoidance creates risk concentration at senior levels, which is exactly the pattern AI was supposed to eliminate.", whatGoodLooksLike: "Managers at top-quartile organizations can make decisions within defined guardrails without escalation. That requires both capability and explicit permission.", severity: "important", confidence: "inferred" },
      questions: [
        { question: "How many decisions per week does your average manager escalate that they could have made themselves? If the number is more than 3, your decision architecture is the bottleneck, not your AI tooling.", framing: "Decision escalation is often a proxy for insufficient trust or unclear authority — both of which AI adoption will expose and amplify.", category: "governance" },
      ],
    };
  }

  // Generic catch-all
  return {
    modules: [
      { moduleId: "mgrdev", rationale: `Your managers' weakest dimension is ${r.weakestDimension}. Targeted development here has the highest return.` },
    ],
    diagnosis: { title: `Weak dimension: ${r.weakestDimension}`, finding: `${r.weakestDimension} scored lowest across your manager population.`, whyItMatters: "The weakest dimension sets the ceiling for transformation complexity your managers can sustain. Address it explicitly rather than hoping general development programs will cover it.", cost: "Unaddressed dimension weaknesses surface as execution failures 3-6 months into transformation programs.", whatGoodLooksLike: "All manager dimensions above 3.0/5 average, with no single dimension more than 1.0 points below the overall average.", severity: "important", confidence: "inferred" },
    questions: [],
  };
}

/* ── Strategic questions per band ── */

const BAND_QUESTIONS: Record<Band, StrategicQuestion[]> = {
  Critical: [
    { question: "Of your Flight Risk managers, how many were promoted into their role versus hired externally? If most were promoted, you have a development problem. If most were hired, you have a screening problem. The fix is different.", framing: "The origin of manager failure tells you whether to invest in development or recruitment. Treating both the same wastes half your budget.", category: "leadership" },
    { question: "Which three transformation workstreams would you cancel tomorrow if you had to cut half your manager population? That's your prioritization — you just haven't admitted it yet.", framing: "A Critical manager profile means you cannot run all planned workstreams simultaneously. Forced prioritization now is better than failed execution later.", category: "governance" },
    { question: "If your CEO stood in front of the board and said 'our managers can't carry this transformation,' what would change? If the answer is 'nothing,' the board doesn't understand the risk.", framing: "Executive awareness of manager-layer risk is the prerequisite for resource allocation. If leadership believes managers are adequate, they won't fund the development needed.", category: "leadership" },
    { question: "How many of your Flight Risk managers control teams of 10 or more? That number is your blast radius if they disengage during a critical phase.", framing: "Flight Risk isn't about individual attrition — it's about the downstream disruption when a pivotal manager checks out.", category: "talent" },
    { question: "Your Needs Development managers: do they know they're categorized as needing development? If not, your first intervention is a conversation, not a training program.", framing: "Self-awareness precedes development. Managers who don't know their gaps will resist programs that address them.", category: "culture" },
    { question: "What's your timeline for getting Flight Risk managers to Adequate? If you don't have a number, you don't have a plan — you have a hope.", framing: "Manager stabilization timelines determine transformation timelines. An undefined timeline means an undefined transformation date.", category: "operations" },
    { question: "Who in your organization has the authority to remove a Flight Risk manager from a transformation-critical role? If the answer requires an HR process that takes 6 months, your governance is slower than your risk.", framing: "The ability to make hard people decisions on transformation timelines is a governance capability, not just an HR process.", category: "governance" },
    { question: "Have you told your Champions that you're counting on them? Explicitly, by name, with a specific ask? If not, they're performing well by coincidence, not by design.", framing: "Champions who don't know they're Champions can't be deployed strategically. Name them, invest in them, and give them scope.", category: "talent" },
  ],
  Fragile: [
    { question: "Your Champion-to-Needs-Development pairings: do you have enough Champions to assign 2-3 Needs Dev managers per Champion without burning them out? If not, your peer-coaching plan is structurally under-resourced before it launches.", framing: "Peer coaching only works at sustainable ratios. Overloading Champions converts them into Flight Risks.", category: "talent" },
    { question: "Which transformation workstreams can you assign exclusively to Champions, and which require Needs Development managers to step up? If you can't separate these, your workstream design is ignoring your biggest constraint.", framing: "Workstream assignment should be capability-aware, not just org-chart-aware.", category: "operations" },
    { question: "If two of your Champions quit next month, which workstreams stall? If the answer is 'most of them,' your bench is a single point of failure.", framing: "A thin bench means every Champion exit cascades. Build redundancy before you need it.", category: "leadership" },
    { question: "Your Adequate managers — are they coasting or consolidating? An Adequate manager who's actively growing is an asset. One who's stopped growing is a bottleneck waiting to happen.", framing: "The Adequate category hides the most important distinction: trajectory. Assess direction, not just current position.", category: "talent" },
    { question: "When a Needs Development manager fails at a transformation task, what happens? If the answer is 'we reassign to a Champion,' you're training your organization to route around weakness rather than build through it.", framing: "The response to manager failure determines whether your development program builds capability or dependency.", category: "culture" },
    { question: "How transparent is your manager capability data with your managers themselves? If they don't know their scores, they can't own their development.", framing: "Opaque assessment breeds distrust. Transparent assessment with support breeds growth.", category: "governance" },
    { question: "Your Flight Risk managers — is the risk exit, or is the risk that they stay and undermine? Both are risks; only one is solved by retention programs.", framing: "Flight Risk is often mislabeled as an attrition problem when it's actually a disengagement problem. Disengaged managers who stay do more damage than those who leave.", category: "leadership" },
    { question: "What's your plan for the first 90 days if a Champion leaves? If you don't have a succession plan for your top 5 Champions, you're running the transformation on hope.", framing: "Succession planning for Champions is crisis planning. Do it before you need it.", category: "operations" },
  ],
  Developing: [
    { question: "Your manager development program — does it run in parallel with the transformation, or sequentially? If sequentially, you've already lost. The transformation arrives whether your managers are ready or not.", framing: "Sequential development means you're asking the transformation to wait. It won't.", category: "operations" },
    { question: "How are you measuring manager development progress? If the measure is 'completed training,' you're measuring attendance, not capability. What observable behavior change are you tracking?", framing: "Training completion is an input metric. The output metric is observable behavior change in how managers run their teams.", category: "talent" },
    { question: "Your Champions: are they teaching or just doing? If they're carrying the hardest work themselves, they're not multiplying — they're accumulating. Force them to delegate to Needs Dev managers.", framing: "The highest-value thing a Champion can do is develop another Champion. Individual heroics don't scale.", category: "leadership" },
    { question: "What does 'good enough' look like for your Needs Development managers? If you're waiting for them to become Champions, you're waiting too long. Define the minimum viable capability for each transformation phase.", framing: "Perfectionism in development is a form of delay. Define the bar, hit it, move on.", category: "governance" },
    { question: "How are you protecting your Champions from burnout? They're carrying disproportionate load. Check in on them — not as a performance review, but as a human conversation.", framing: "Champion burnout is invisible until it's sudden. By the time you see the symptoms, you've lost 3-6 months of recovery time.", category: "culture" },
    { question: "Your Adequate managers: what would it take to tip them into the Needs Development category under transformation pressure? That's your stress-test scenario.", framing: "Adequate managers under stress either grow or crack. The difference is usually support, not capability.", category: "talent" },
    { question: "Do your managers believe this transformation will happen? Not whether they support it — whether they think it's real. If they think it's another initiative that'll fade, they'll wait it out.", framing: "Manager belief in transformation inevitability determines their investment in preparation. Skeptics wait; believers prepare.", category: "culture" },
    { question: "What's the explicit budget for manager development as a percentage of total transformation spend? If you can't name the number, managers are getting funded from leftovers.", framing: "Budget allocation reveals actual priority. If manager development isn't explicitly budgeted, it's implicitly deprioritized.", category: "governance" },
  ],
  Capable: [
    { question: "Your strongest managers — who decides which transformation workstreams they own? If the answer is 'whoever asked first,' you're rationing capacity by political proximity, not strategic value.", framing: "Champion allocation is a strategic decision, not an administrative one. Treat it like capital allocation.", category: "governance" },
    { question: "Are your Champions aligned on the same transformation vision, or are they each interpreting the strategy through their own lens? Alignment at the Champion level amplifies; misalignment at the Champion level fractures.", framing: "Capable organizations can afford ambition — but only if the ambition is coherent across the manager layer.", category: "leadership" },
    { question: "What's the most ambitious thing you've held back because you weren't sure your managers could handle it? With a Capable profile, reconsider. The constraint may have shifted.", framing: "Capable organizations often under-aim because their planning was calibrated to a weaker manager population. Recalibrate.", category: "operations" },
    { question: "How are you using your Adequate managers? If they're just maintaining the status quo while Champions drive change, you're underutilizing 30% of your manager population.", framing: "Adequate managers with clear direction and support can carry more than you think. The question is whether anyone has asked them to.", category: "talent" },
    { question: "Your Flight Risk managers (if any remain): are they concentrated in a specific function or geography? Concentration patterns tell you whether the risk is systemic or local.", framing: "Scattered Flight Risk is manageable. Concentrated Flight Risk is a detonation waiting for a trigger.", category: "leadership" },
    { question: "When was the last time you promoted a Needs Development manager into a Champion-level role before they were fully ready? If never, you may be developing too slowly.", framing: "Some development only happens under real pressure. Stretch assignments with support build Champions faster than training programs.", category: "talent" },
    { question: "Do your Champions have permission to fail? An organization that punishes Champion failure will get cautious Champions — which is worse than no Champions at all.", framing: "Innovation requires risk tolerance. Risk tolerance requires psychological safety. Psychological safety starts with how you respond to the first visible failure.", category: "culture" },
    { question: "What's your plan for after the transformation? Your best managers will expect what comes next. If you don't have an answer, they'll find one elsewhere.", framing: "Retention of Champions post-transformation is a problem you should plan for now, not when the transformation is winding down.", category: "talent" },
  ],
  Exceptional: [
    { question: "When was the last time one of your Champions said no to a project they were assigned? If never, they're not actually empowered — they're just compliant. Compliant Champions don't multiply; they accumulate.", framing: "True empowerment includes the right to push back. Champions who always say yes are either burned out or politically constrained.", category: "culture" },
    { question: "Are you using your exceptional manager profile as a competitive advantage, or just as operational convenience? This profile lets you do things competitors can't — are you designing for that?", framing: "An Exceptional profile is a strategic asset. Using it merely to execute standard playbooks wastes the advantage.", category: "leadership" },
    { question: "What would you do differently if you knew your manager profile would be this strong for the next 3 years? That's the ambition level you should be designing for.", framing: "Planning against worst-case manager scenarios when you have Exceptional capability is a form of self-limiting behavior.", category: "operations" },
    { question: "Your Champions: are they growing each other, or are they growing in parallel? Peer development among Champions is the highest-leverage activity in your organization — is anyone facilitating it?", framing: "Champions who learn from each other compound capability. Champions who develop independently plateau.", category: "talent" },
    { question: "How many of your transformation workstreams are designed to take advantage of your manager strength, versus designed to work regardless of it? If most are manager-agnostic, you're leaving your biggest advantage on the table.", framing: "Manager-aware transformation design is a different playbook than manager-agnostic design. Your profile earns you the better playbook.", category: "governance" },
    { question: "What's the succession pipeline for your Champions? If they all left in 2 years, could the Adequate cohort step up? If not, your Exceptional profile has an expiration date.", framing: "Exceptional profiles are earned over years and lost over months. Build the pipeline before you need it.", category: "talent" },
    { question: "Are your managers bored? An Exceptional profile with insufficient challenge breeds restlessness. The best managers leave organizations that don't challenge them.", framing: "Retention risk for Champions is counterintuitive — they don't leave because things are hard. They leave because things aren't hard enough.", category: "culture" },
    { question: "Is your board aware of how rare this manager profile is? If not, they may underinvest in the retention and development that maintains it. Rare assets require explicit protection.", framing: "What the board doesn't understand, the board won't fund. Make the business case for maintaining the advantage.", category: "leadership" },
  ],
};

/* ── Honest caveat ── */

const HONEST_CAVEAT = `We measured your managers using the data you uploaded. We did NOT measure two things that matter more:

1. Whether your managers want this transformation. The Champion label is descriptive, not predictive — a "Champion" who privately thinks AI is overhyped will perform like a Flight Risk under pressure. Conviction is invisible to instruments like this one.

2. Whether your senior leaders will defend their managers when the transformation gets messy. The single biggest cause of Flight Risk conversion is a manager who feels exposed and unsupported. That's a leadership variable, not a manager variable, and we can't see it from here.

Plan accordingly. The numbers here are a starting point for a conversation, not a substitute for one.`;

/* ── Engine implementation ── */

export const ManagerCapabilityEngine: PrescriptionEngine<ManagerCapabilityResult> = {
  sourceModuleId: "mgrcap",
  sourceModuleTitle: "Manager Capability",

  generate(result: ManagerCapabilityResult): PrescribedRoadmap {
    const band = determineBand(result);
    const total = result.totalManagers || 1;

    // Start with band-default modules
    const stepDefs = [...BAND_MODULES[band]];

    // Apply dimension weakness rules
    const diagnosis: DiagnosisItem[] = [];
    const extraQuestions: StrategicQuestion[] = [];

    if (result.weakestDimension) {
      const dimRules = getDimensionRules(result.weakestDimension, result);
      if (dimRules) {
        for (const m of dimRules.modules) {
          if (!stepDefs.some(s => s.moduleId === m.moduleId)) {
            stepDefs.splice(2, 0, { ...m, effort: "medium" }); // insert after first 2
          }
        }
        diagnosis.push(dimRules.diagnosis);
        extraQuestions.push(...dimRules.questions);
      }
    }

    // Always-present distribution diagnosis
    diagnosis.unshift({
      title: "Your manager profile",
      finding: `${result.championCount} Champions, ${result.needsDevCount} Needs Development, ${result.flightRiskCount} Flight Risk, ${result.adequateCount} Adequate out of ${result.totalManagers} managers.`,
      whyItMatters: band === "Critical" || band === "Fragile"
        ? "This distribution means your transformation is constrained by your manager layer. Every design decision must account for who will actually carry it."
        : band === "Developing"
        ? "A workable but uneven distribution. Your Champions can lead; your Needs Development cohort sets the pace."
        : "A strong distribution. Your risk is misallocation, not capacity.",
      cost: band === "Critical"
        ? "At this distribution, expect 6-12 months of additional timeline for manager stabilization before meaningful design work can begin."
        : band === "Fragile"
        ? "Your thin Champion bench means any Champion attrition immediately constrains 2-3 workstreams. Budget 3-6 months of buffer."
        : "Opportunity cost: underutilizing this profile wastes your highest-leverage asset.",
      whatGoodLooksLike: "Target: 25%+ Champions, <10% Flight Risk, remainder split between Adequate and Needs Development. Needs Development cohort should have explicit timelines to reach Adequate.",
      severity: band === "Critical" || band === "Fragile" ? "critical" : band === "Developing" ? "important" : "watch",
      confidence: "high",
    });

    // Flight Risk diagnosis
    if (result.flightRiskCount >= 5) {
      const riskReports = Math.round(result.flightRiskCount * 6.5); // rough estimate
      diagnosis.push({
        title: "Flight Risk concentration",
        finding: `${result.flightRiskCount} managers categorized as Flight Risk, controlling an estimated ${riskReports} direct reports between them.`,
        whyItMatters: `Flight Risk managers don't fail quietly. They take morale and institutional knowledge with them on the way out. ${riskReports} direct reports means ${riskReports} reskilling continuity gaps if these managers exit during transformation.`,
        cost: `Each Flight Risk manager exit costs 6-9 months of team disruption. With ${result.flightRiskCount} at risk, your worst-case scenario is significant.`,
        whatGoodLooksLike: "Flight Risk managers below 10% of total, with explicit retention or exit plans for each.",
        severity: "critical",
        confidence: "high",
      });
    }

    // High correlation multiplier
    if (result.correlationMultiplier >= 2.0) {
      diagnosis.push({
        title: "High manager leverage",
        finding: `Manager capability has a ${result.correlationMultiplier.toFixed(1)}x multiplier on team readiness.`,
        whyItMatters: "This means manager development is your single highest-leverage investment. Every dollar spent on manager capability returns more than the same dollar spent anywhere else in the transformation.",
        cost: "Underinvesting in managers when leverage is this high means paying full price for every other intervention while ignoring the one that multiplies them all.",
        whatGoodLooksLike: "Organizations that recognize high manager leverage allocate 15-25% of transformation budget to manager development. Most allocate less than 5%.",
        severity: "important",
        confidence: "high",
      });
    }

    // Champion bench
    if (result.championCount / total >= 0.25) {
      diagnosis.push({
        title: "Strong Champion bench",
        finding: `${result.championCount} managers identified as Transformation Champions (${Math.round(result.championCount / total * 100)}% of total).`,
        whyItMatters: "These managers are your scaling mechanism. The trap is using them as individual contributors instead of force multipliers. Pair each with 2-3 Needs Development peers for structured coaching.",
        cost: "Misallocating Champions to low-leverage work is the most expensive pattern in capable organizations. Each Champion doing IC-level work represents 3-5 managers who aren't being developed.",
        whatGoodLooksLike: "Every Champion has a named development cohort and spends at least 20% of their time on peer coaching and knowledge transfer.",
        severity: "watch",
        confidence: "high",
      });
    }

    // Sort diagnosis by severity
    const sevOrder = { critical: 0, important: 1, watch: 2 };
    diagnosis.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    // De-duplicate steps, cap at 7
    const seen = new Set<string>();
    const steps: RoadmapStep[] = [];
    for (const s of stepDefs) {
      if (seen.has(s.moduleId)) continue;
      seen.add(s.moduleId);
      steps.push({
        moduleId: s.moduleId,
        rationale: s.rationale,
        emphasis: s.emphasis,
        estimatedEffort: s.effort,
        confidence: "high",
      });
      if (steps.length >= 7) break;
    }

    // Compose strategic questions
    const questions = [...BAND_QUESTIONS[band], ...extraQuestions].slice(0, 10);

    // Findings summary
    const champPct = Math.round(result.championCount / total * 100);
    const riskPct = Math.round(result.flightRiskCount / total * 100);
    const findingsSummary = `Your manager population is ${band}: ${champPct}% Champions, ${riskPct}% Flight Risk, across ${result.totalManagers} managers. ${
      band === "Critical" || band === "Fragile" ? "Stabilization required before design work." :
      band === "Developing" ? "Parallel development and design recommended." :
      "Ready for ambitious design-phase work."
    }`;

    return {
      sourceModuleId: "mgrcap",
      sourceModuleTitle: "Manager Capability",
      generatedAt: new Date().toISOString(),
      findingsSummary,
      band,
      bandDescription: BAND_DESCRIPTIONS[band],
      diagnosis,
      steps,
      strategicQuestions: questions,
      honestCaveat: HONEST_CAVEAT,
    };
  },
};
