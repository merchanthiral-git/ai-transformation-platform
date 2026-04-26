/* ═══════════════════════════════════════════════════════════════
   AI Readiness — Design Path Engine

   13 outcome patterns, pure rules-based. Every recommendation is
   deterministic, traceable, defensible.

   Dimensions: Data Literacy, Tool Adoption, AI Awareness,
               AI Collaboration, Change Openness
   ═══════════════════════════════════════════════════════════════ */

import type { PathEngine } from "../PathEngine";
import type {
  DesignPath, DesignPathStep, Alternative, PivotalFinding, StepTiming,
  SubStep, ModuleTabContext,
} from "../types";

/* ── Input type ── */

export type AIReadinessResult = {
  overallScore: number;
  dimensions: Record<string, number>;
};

/* ── Band determination ── */

type Band = "Critical" | "Foundational" | "Developing" | "Operational" | "Advanced";

function determineBand(score: number): Band {
  if (score < 1.5) return "Critical";
  if (score < 2.5) return "Foundational";
  if (score < 3.5) return "Developing";
  if (score < 4.3) return "Operational";
  return "Advanced";
}

/* ── Step builder helpers ── */

const STEP_DEFS: Record<string, Omit<DesignPathStep, "whyNow" | "watchPoint" | "completionCriterion" | "completedAt" | "completedManually">> = {
  changeready: { moduleId: "changeready", title: "Change Readiness", description: "Diagnose adoption barriers and build the change infrastructure.", framework: "Prosci ADKAR", timing: t(2, 3), scope: "Affected population", stakeholders: ["CHRO sponsor", "Change lead"] },
  changeready_r2: { moduleId: "changeready", title: "Change Readiness R2", description: "Second-round adoption check after design work.", framework: "Prosci ADKAR", timing: t(4, 6), scope: "Full affected population", stakeholders: ["CHRO sponsor", "Change lead", "Function heads"] },
  changeready_r3: { moduleId: "changeready", title: "Change Readiness R3", description: "Final readiness gate before mobilization.", framework: "Prosci ADKAR", timing: t(2, 3), scope: "All affected employees", stakeholders: ["Full leadership"] },
  scan: { moduleId: "scan", title: "AI Opportunity Scan", description: "Identify where AI creates the most value across functions.", timing: t(2, 3), scope: "All functions", stakeholders: ["COO + function heads"] },
  design: { moduleId: "design", title: "Work Design Lab", description: "Decompose jobs into tasks and reconstruct around AI.", framework: "Work Without Jobs", timing: t(3, 4), scope: "1 function at a time", stakeholders: ["Function head", "Task owners"] },
  design_pilot: { moduleId: "design", title: "Work Design Lab (pilot)", description: "Small-scope pilot: decompose and reconstruct 3-5 roles.", framework: "Work Without Jobs", timing: t(2, 3), scope: "Pilot function only", stakeholders: ["Pilot sponsor"] },
  skills: { moduleId: "skills", title: "Skills & Talent", description: "Map current skill inventory and identify gaps.", timing: t(2, 3), scope: "Assessed population", stakeholders: ["HR lead", "L&D"] },
  "skills-arch": { moduleId: "skills-arch", title: "Skills Architecture", description: "Build the future capability model from redesigned work.", framework: "Skills-Based Organization", timing: t(4, 6), scope: "Redesigned roles", stakeholders: ["HR lead", "COO"] },
  bbba: { moduleId: "bbba", title: "BBBA Framework", description: "Decide build, buy, borrow, or automate for each capability gap.", framework: "Build · Buy · Borrow · Automate", timing: t(2, 2), scope: "Redesigned roles", stakeholders: ["CFO joins", "HR lead"] },
  bbba_aggressive: { moduleId: "bbba", title: "BBBA Framework", description: "Aggressive automation-first BBBA assessment.", framework: "Build · Buy · Borrow · Automate", timing: t(2, 3), scope: "All redesigned roles", stakeholders: ["CFO", "CTO", "HR lead"] },
  headcount: { moduleId: "headcount", title: "Headcount Planning", description: "Model the workforce transition from current to future state.", timing: t(3, 3), scope: "Affected functions", stakeholders: ["CFO + Legal"] },
  opmodel: { moduleId: "opmodel", title: "Operating Model Lab", description: "Redesign the operating model for AI-native operations.", framework: "Galbraith Star Model", timing: t(3, 5), scope: "Enterprise or function", stakeholders: ["COO", "Function heads"] },
  plan: { moduleId: "plan", title: "Change Planner", description: "Sequence initiatives and build the transformation roadmap.", timing: t(3, 4), scope: "Full transformation", stakeholders: ["Full leadership"] },
  orghealth: { moduleId: "orghealth", title: "Org Health Scorecard", description: "Re-run structural health check after initial change work.", timing: t(1, 2), scope: "Full organization", stakeholders: ["HR lead"] },
  build: { moduleId: "build", title: "Org Design Studio", description: "Reshape spans, layers, and reporting structure.", framework: "Galbraith Star Model", timing: t(4, 6), scope: "Affected org units", stakeholders: ["CHRO", "COO"] },
};

function t(min: number, max: number): StepTiming {
  return { minWeeks: min, maxWeeks: max, edited: false };
}

function step(key: string, whyNow: string, watchPoint: string, criterion?: string, howTo?: string[], subSteps?: SubStep[], tabContext?: ModuleTabContext): DesignPathStep {
  const def = STEP_DEFS[key];
  if (!def) throw new Error(`Unknown step key: ${key}`);
  return {
    ...def, whyNow, watchPoint,
    completionCriterion: {
      description: criterion || `Complete the ${def.title} module for the relevant scope`,
      howToInModule: howTo,
    },
    subSteps: subSteps || [],
    moduleTabContext: tabContext,
  };
}

/* ── Scan sub-step builders ── */

const SCAN_OPTIONAL: Record<string, { label: string; whatItDoes: string }> = {
  skills: { label: "Skill Gaps", whatItDoes: "Shows the gap between current skills and what your future-state work will require. Not part of your current path step — your Skills & Talent diagnostic handles capability gaps separately. Explore here if you want to preview what's coming." },
  org: { label: "Org Diagnostics", whatItDoes: "Surfaces structural risk signals — span anomalies, layer health, manager-to-IC ratios. Not in scope for this step — your Org Health Scorecard handles structural diagnosis separately. Useful background if your stakeholders ask structural questions." },
  heatmap: { label: "Impact Heatmap", whatItDoes: "Visual cross-tab of AI impact by function and family. Same data as the AI Prioritization tab, displayed as a heat grid. Useful for board-style presentations." },
};

function scanSubSteps(requiredTabs: string[], patternCtx: { emphasisPilot?: boolean; emphasisBroad?: boolean; emphasisAmbitious?: boolean }): { subSteps: SubStep[]; tabContext: ModuleTabContext } {
  const subSteps: SubStep[] = [];
  let order = 1;

  if (requiredTabs.includes("ai")) {
    subSteps.push({
      tabId: "ai", tabLabel: "AI Prioritization", suggestedOrder: order++,
      title: patternCtx.emphasisPilot ? "Identify candidate functions for pilot" : patternCtx.emphasisAmbitious ? "Identify high-ambition automation targets" : "Identify highest-leverage functions",
      criterion: patternCtx.emphasisPilot ? "Note 2-3 functions where AI impact is highest and readiness is concentrated" : patternCtx.emphasisBroad ? "Rank 3-5 functions by headcount × AI-impact for parallel work" : "Identify priority functions for transformation scope",
      howToDoIt: patternCtx.emphasisPilot ? [
        "Review the Function Prioritization table above. The top 5 functions are highlighted.",
        "For your top 2-3 candidates, click the Leadership Readiness pill and set it based on what you know. Resistant functions deprioritize automatically.",
        "Confirm your final 1-2 pilot functions by re-sorting after setting readiness.",
        "Click 'Mark sub-step complete' when you have your shortlist.",
      ] : patternCtx.emphasisAmbitious ? [
        "Review the Function Prioritization table. For ambitious scope, look beyond the top 5 — include functions where AI could redesign entire job families.",
        "For each candidate, click the Leadership Readiness pill and set it. Resistant functions deprioritize automatically.",
        "Confirm your final 3-5 candidate functions by re-sorting Composite Score after setting readiness.",
        "Click 'Mark sub-step complete' when you have your shortlist.",
      ] : [
        "Review the Function Prioritization table above. The top 5 functions are highlighted.",
        "For each of the top 5, click the Leadership Readiness pill and set it based on what you know about that function's leadership posture. Functions marked Resistant will deprioritize automatically.",
        "Confirm your final 3-5 candidate functions by re-sorting Composite Score after setting readiness.",
        "Click 'Mark sub-step complete' when you have your shortlist.",
      ],
    });
  }

  if (requiredTabs.includes("heatmap")) {
    subSteps.push({
      tabId: "heatmap", tabLabel: "Impact Heatmap", suggestedOrder: order++,
      title: "Validate impact concentration",
      criterion: "Confirm candidate functions show concentrated high-impact zones, not scattered ones",
      howToDoIt: [
        "Open the Impact Heatmap tab. The grid shows AI impact by function and family.",
        "Find your candidate functions on the grid.",
        "Are the high-impact cells concentrated in a few job families, or scattered?",
        "Concentrated = better scope. Scattered = harder to redesign as a coherent unit.",
        "Click 'Mark sub-step complete' when confirmed.",
      ],
    });
  }

  if (requiredTabs.includes("skills")) {
    subSteps.push({
      tabId: "skills", tabLabel: "Skill Gaps", suggestedOrder: order++,
      title: "Review skill gap landscape",
      criterion: "Note the top skill gaps relevant to your candidate functions",
      howToDoIt: [
        "Open the Skill Gaps tab. Review gap severity across assessed skills.",
        "Focus on skills relevant to your candidate functions from step 1.",
        "Note which gaps are critical vs. moderate — critical gaps may affect scope decisions.",
        "Click 'Mark sub-step complete' when reviewed.",
      ],
    });
  }

  if (requiredTabs.includes("org")) {
    subSteps.push({
      tabId: "org", tabLabel: "Org Diagnostics", suggestedOrder: order++,
      title: "Verify structural readiness",
      criterion: "Confirm candidate functions' structures can absorb redesign",
      howToDoIt: [
        "Open the Org Diagnostics tab. Review your candidate functions' structural profile.",
        "Look for warning signs: span anomalies, too many layers, unclear reporting.",
        "If structure is shaky in a candidate function, redesign will get blocked by org issues.",
        "Click 'Mark sub-step complete' when structural readiness is confirmed or flags noted.",
      ],
    });
  }

  const optionalNotices: Record<string, { label: string; whatItDoes: string }> = {};
  for (const tabId of ["ai", "heatmap", "skills", "org"]) {
    if (!requiredTabs.includes(tabId) && SCAN_OPTIONAL[tabId]) {
      optionalNotices[tabId] = SCAN_OPTIONAL[tabId];
    }
  }

  return {
    subSteps,
    tabContext: { moduleId: "scan", pathRequiredTabs: requiredTabs, optionalTabNotices: optionalNotices },
  };
}

/* ── Pattern definitions ── */

type PatternId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

function detectPattern(dims: Record<string, number>, band: Band): PatternId {
  const co = dims["Change Openness"] ?? 3;
  const dl = dims["Data Literacy"] ?? 3;
  const ta = dims["Tool Adoption"] ?? 3;
  const aa = dims["AI Awareness"] ?? 3;
  const ac = dims["AI Collaboration"] ?? 3;
  const allBelow25 = Object.values(dims).every(v => v < 2.5);
  const noneBelow20 = Object.values(dims).every(v => v >= 2.0);
  const noneBelow25 = Object.values(dims).every(v => v >= 2.5);
  const maxDim = Math.max(...Object.values(dims));
  const minDim = Math.min(...Object.values(dims));

  // Priority order — first match wins
  if (band === "Critical" && allBelow25) return 1;
  if (co < 1.5) return 2;
  if (dl < 1.5) return 3;
  if (band === "Foundational" && co < 2.0 && ac < 2.0) return 4;
  if (band === "Foundational" && dl < 2.5 && aa < 2.5) return 5;
  if (ta >= 3.5 && aa >= 3.0 && co < 2.5 && ac < 2.5) return 10;
  if (co >= 3.0 && ac >= 3.0 && ta < 2.5) return 11;
  if (aa >= 3.5 && ac >= 3.0 && dl < 2.5) return 12;
  if (band === "Developing" && noneBelow20) return 6;
  if (band === "Developing" && ac < 2.0) return 7;
  if (band === "Operational" && noneBelow25) return 8;
  if (band === "Advanced") return 9;
  if (maxDim - minDim >= 2.5) return 13;
  return 6; // safe default
}

/* ── Content per pattern ── */

interface PatternContent {
  headline: string;
  outcomeStatement: string;
  steps: DesignPathStep[];
  alternatives: Alternative[];
  sensitivityNote: string;
  pivotalDims: string[];
}

function getPatternContent(pattern: PatternId, dims: Record<string, number>, band: Band): PatternContent {
  switch (pattern) {
    case 1: return {
      headline: "Stabilize before you design",
      outcomeStatement: "Every dimension scores below the threshold for sustained AI adoption. This isn't a design problem yet — it's a readiness problem. Attempting to design new work against this profile produces plans that can't be executed, which is worse than no plan at all.",
      pivotalDims: Object.keys(dims),
      steps: [
        step("scan", "Even in a Critical band, understanding where AI has the highest potential helps focus the stabilization effort. Don't scan everything — pick the 2-3 functions where AI impact is clearest and pilot readiness is highest.", "Scanning broadly when everything is weak creates paralysis. Narrow the aperture to 2-3 functions maximum.", "Identify 2-3 pilot functions where AI impact is highest and pilot readiness is greatest", ["Open the AI Prioritization tab. Pick the smallest viable scope — one function only — with the cleanest readiness profile.", "Open the Impact Heatmap tab. Look for a single concentrated high-impact zone, not scattered hits across many functions.", "For your candidate function, check: willing leader, recent quick wins to build on, not in active turmoil.", "Note your chosen pilot function. Click 'Mark step complete' to proceed."]),
        step("design_pilot", "A small-scope pilot proves the concept without requiring organizational readiness that doesn't exist yet. 3-5 roles, one function, visible results.", "The pilot sponsor must be a true believer with positional authority. A skeptical sponsor kills pilots slowly.", "Decompose and reconstruct 3-5 roles in the chosen pilot function", ["Open the Decompose tab. Select your pilot function from the previous step.", "For 3-5 representative roles, decompose each into constituent tasks. Use the AI suggestion button to accelerate.", "Open the Reconstruct tab. For each task, mark whether AI eliminates, augments, or shifts it. Build the future-state task bundle.", "Confirm the redesigned roles still cohere as real jobs — not just leftover task piles. This is a pilot, not a full redesign.", "Click 'Mark step complete' to proceed."]),
        step("changeready", "After the pilot, measure what changed in the pilot population. This becomes the evidence base for expanding — or the honest signal that more stabilization is needed.", "Don't conflate pilot completion with readiness to scale. The pilot succeeded in controlled conditions; scaling is uncontrolled.", "Identify adoption barriers for the pilot population and draft change campaigns", ["Open the Campaigns tab. Create a campaign scoped to your pilot function only.", "Define the affected population — just the pilot function employees and their managers.", "Draft 3-4 communication activities: sponsor kickoff, manager cascade, listening sessions, pulse survey.", "Identify the campaign sponsor. Must be a true believer with positional authority.", "Click 'Mark step complete' to proceed."]),
      ],
      alternatives: [
        { label: "Small-scope pilot sequence", blurb: "Best fit when all dimensions are below threshold. Build evidence before investing.", selected: true },
        { label: "Standard methodology sequence", blurb: "Full-scope transformation arc.", rejectedReason: "Requires readiness scores above 2.0 in at least two dimensions. Your profile can't sustain this yet.", selected: false },
        { label: "Technology-first sequence", blurb: "Deploy tools and train around them.", rejectedReason: "Tool deployment without readiness creates shelfware. Adoption requires a floor of awareness and openness that doesn't exist here.", selected: false },
      ],
      sensitivityNote: `If any two dimensions were 0.5 points higher, this would shift to a Foundational-band path with broader scope. Your recommendation is sensitive to small improvements across the board.`,
    };

    case 2: return {
      headline: "Change first, design later — your foundation isn't ready",
      outcomeStatement: `Change Openness at ${(dims["Change Openness"] ?? 0).toFixed(1)} is critically low. Organizations at this level don't resist change — they absorb it passively and wait for it to pass. Designing new work against this posture produces beautiful plans that no one executes. Fix the foundation first.`,
      pivotalDims: ["Change Openness"],
      steps: [
        step("changeready", "The first change readiness pass establishes the baseline and identifies where resistance will crystallize. You can't plan around resistance you haven't mapped.", "Sponsors underestimate the time it takes to publicly commit. The first town hall usually slips by 2-3 weeks while leadership rewords its message."),
        step("orghealth", "Structural health check after initial change work. Change Openness this low often correlates with structural issues — spans too wide, layers too deep, accountability diffused.", "Don't skip this step because 'we already know our structure.' Low change openness often masks structural problems leadership has normalized."),
        step("changeready_r2", "Second measurement. If Change Openness hasn't moved, the problem is deeper than communication — it's structural or leadership-driven. Adjust the path accordingly.", "Reusing campaign assets verbatim is the most common shortcut and the most common failure. The audience has changed; the message must change too."),
        step("design_pilot", "Only after change scores have improved. A small-scope pilot tests whether the change investment translated into actual execution capability.", "Defaulting to 'the function with the loudest leader' is the most common pilot selection mistake. Start with the function whose redesign creates the cleanest reference for others."),
        step("changeready_r3", "Final readiness gate. If the pilot population shows adoption, expand scope. If not, iterate on the change approach before scaling.", "The temptation to declare victory after the pilot is strong. Resist it. Pilot success in controlled conditions doesn't predict scaled success."),
      ],
      alternatives: [
        { label: "Change-first sequence", blurb: "Build change readiness before any design work begins.", selected: true },
        { label: "Parallel change + design", blurb: "Run change workstreams alongside design.", rejectedReason: `Change Openness at ${(dims["Change Openness"] ?? 0).toFixed(1)} is too low to absorb design work in parallel. Parallel execution requires at least 2.0 to sustain.`, selected: false },
        { label: "Design-first, communicate later", blurb: "Complete design work, then launch change.", rejectedReason: "This is the pattern that produces 'perfectly designed' transformations that no one adopts. Change work must precede or parallel design, never follow it.", selected: false },
      ],
      sensitivityNote: `If your Change Openness score were 0.4 points higher, this path would allow parallel design work from step 2. Your recommendation hinges on this one variable.`,
    };

    case 3: return {
      headline: "Build literacy before you build models",
      outcomeStatement: `Data Literacy at ${(dims["Data Literacy"] ?? 0).toFixed(1)} means your workforce can't evaluate AI outputs, which means AI tools will be either trusted blindly or rejected reflexively. Neither is usable. Build the interpretation layer first.`,
      pivotalDims: ["Data Literacy"],
      steps: [
        step("skills", "Map the current literacy landscape. The gap between 'can read a dashboard' and 'can evaluate an AI recommendation' is larger than most organizations assume.", "Don't confuse tool training with literacy. Literacy is the ability to question output — training is the ability to produce it."),
        step("skills-arch", "Build the future capability model with AI literacy and data interpretation as core skills. These aren't nice-to-haves — they're prerequisites for every AI-adjacent role.", "Skills Architecture work done without literacy targets produces capability models that look complete but miss the foundational layer."),
        step("scan", "Re-scan with a literate lens. Opportunities that looked viable at low literacy may be infeasible; others that looked risky may be achievable once interpretation skills exist.", "The opportunity scan will look different after literacy investment. Don't anchor on the pre-literacy scan results."),
        step("design", "Now design with confidence that the workforce can evaluate what AI produces. Task decomposition is meaningless if workers can't assess AI-generated task outputs.", "The biggest risk in Work Design Lab is designing tasks that assume literacy levels that don't exist yet. Cross-reference against your Skills Architecture targets."),
      ],
      alternatives: [
        { label: "Literacy-first sequence", blurb: "Build data interpretation skills before AI design work.", selected: true },
        { label: "Tool deployment with training", blurb: "Deploy AI tools and train simultaneously.", rejectedReason: `Data Literacy at ${(dims["Data Literacy"] ?? 0).toFixed(1)} is below the threshold where training-while-deploying works. People can't learn to evaluate outputs they don't understand.`, selected: false },
        { label: "Standard arc with literacy module", blurb: "Standard sequence with a literacy track in parallel.", rejectedReason: "Parallel literacy tracks get deprioritized when design deadlines hit. Sequencing literacy first guarantees it happens.", selected: false },
      ],
      sensitivityNote: `If Data Literacy were 1.0 points higher, this would shift to Pattern 5 or 6 with a broader scope. Your weakest dimension is driving the entire sequence.`,
    };

    case 4: return {
      headline: "Build the change muscle, then redesign the work",
      outcomeStatement: `Your organization scores in the Foundational band with critically weak Change Openness (${(dims["Change Openness"] ?? 0).toFixed(1)}) and AI Collaboration (${(dims["AI Collaboration"] ?? 0).toFixed(1)}). The instinct will be to invest in tools; the discipline is to invest in scaffolding first. Organizations that skip the change-muscle phase have a 70% pilot failure rate at 18 months.`,
      pivotalDims: ["Change Openness", "AI Collaboration"],
      steps: [
        step("changeready", "Before any design work, establish baseline change readiness and build the communication infrastructure. Without this, design outputs have no landing zone.", "Sponsors underestimate the time it takes to publicly commit. The first town hall usually slips by 2-3 weeks while leadership rewords its message.", "Build initial change campaign structure for affected populations across the org", ["Your change muscle is the bottleneck. This step builds the foundation before any redesign work begins.", "Open the Campaigns tab. Create a new campaign for your AI transformation or use the existing template.", "Define the affected population — this is org-wide, not a pilot. Identify functions, levels, and headcount.", "Draft 3-5 communication activities: leadership alignment workshop, town hall, manager toolkit, skip-level listening sessions.", "Identify the campaign sponsor — must be a true believer with positional authority. Click 'Mark step complete' to proceed."]),
        step("design", "Tasks are the atomic unit of work; jobs are bundles. Decomposing first lets you see what AI actually changes, then reconstruct around the changed substrate. Skipping this treats jobs as fixed — which guarantees you redesign back to where you started.", "Defaulting to 'the function with the loudest leader' is the most common mistake. Start with the function whose redesign creates the cleanest reference for others.", "Decompose roles into tasks for 1 function, identify what AI changes, reconstruct future-state work", ["Open the Decompose tab. Select your first function — choose the one whose redesign creates the cleanest reference for others.", "For 8-15 representative roles, decompose each role into constituent tasks. Use the AI suggestion button to accelerate.", "Open the Reconstruct tab. For each task, mark whether AI eliminates, augments, or shifts it.", "Confirm the redesigned roles still cohere — not just leftover task piles. Take time to get this function right; it becomes the reference.", "Click 'Mark step complete' to proceed."]),
        step("bbba", "With redesigned work in hand, determine which capability gaps to build internally, buy from vendors, borrow via contractors, or automate entirely. This is where the investment thesis crystallizes.", "'Buy' gets over-allocated when the org doesn't have credible internal capacity to 'build.' Honest capacity assessment up front beats pretending.", "Complete build/buy/borrow/automate assessment for all redesigned roles", ["Review the auto-suggested disposition (Build, Buy, Borrow, Automate) for each redesigned role.", "Override dispositions where you have better information. Financial impact recalculates automatically.", "Confirm total capacity demand matches what you can actually execute. Check if 'Build' is over-allocated relative to internal bench strength.", "Click 'Mark step complete' to proceed."]),
        step("headcount", "Model the workforce transition. How many roles change, how many are new, how many are eliminated. This step turns design into numbers that Finance and Legal need.", "Legal counsel arrives late and changes the timeline. Bring them in at the start of the step, not at the approval gate.", "Produce a headcount waterfall showing current → future state transition", ["Review the waterfall chart showing starting headcount and BBBA decision impacts.", "Open the Financial Impact panel. Sanity-check eliminations, reskilling costs, and new hire costs.", "Open the Department breakdown. Verify per-function impact matches what function heads expect.", "Validate timing matches what your change campaigns can support. Adjust pace, not scope. Click 'Mark step complete' to proceed."]),
        step("changeready_r2", "Circle back to change readiness with the design in hand. The conversation shifts from 'are we ready for change' to 'are we ready for this specific change.' Different question, different answers.", "Reusing campaign assets verbatim is the most common shortcut and the most common failure. The audience has changed; the message must change too.", "Run second-round change readiness assessment against the specific design outputs", ["Open the Campaigns tab. Use your earlier campaign as the baseline — do not start fresh.", "For each redesigned role from Work Design Lab, define a specific change activity (training, role transition session, communication).", "Update audience targeting — now specific to affected employees and their managers, not generic org-wide.", "Validate sponsor commitment. Round 1 earned trust; Round 2 consumes it. Make sure they're still bought in.", "Click 'Mark step complete' to proceed."]),
      ],
      alternatives: [
        { label: "Change-first sequence", blurb: "Best fit when Change Openness and AI Collaboration score critically low.", selected: true },
        { label: "Standard methodology sequence", blurb: "Full-scope transformation without change-first gate.", rejectedReason: `Implementations would land on resistant ground. Change Openness at ${(dims["Change Openness"] ?? 0).toFixed(1)} is below the threshold where ADKAR Awareness reliably holds.`, selected: false },
        { label: "Parallel sequence", blurb: "Run change and design workstreams simultaneously.", rejectedReason: "Insufficient senior alignment to staff two tracks credibly without pulling resources from change work.", selected: false },
      ],
      sensitivityNote: `If your Change Openness score were 0.4 points higher, this path would put Work Design Lab first instead. Your recommendation hinges on this one variable.`,
    };

    case 5: return {
      headline: "Build literacy before you redesign",
      outcomeStatement: `Foundational band with weak Data Literacy (${(dims["Data Literacy"] ?? 0).toFixed(1)}) and AI Awareness (${(dims["AI Awareness"] ?? 0).toFixed(1)}). Your workforce doesn't yet have the vocabulary to participate meaningfully in design decisions about AI-augmented work. Build the shared language first, then redesign.`,
      pivotalDims: ["Data Literacy", "AI Awareness"],
      steps: [
        step("skills", "Establish the current skill baseline with focus on literacy and AI awareness gaps. This data drives the Skills Architecture work.", "Don't treat this as a checkbox. The inventory must distinguish between 'has heard of AI' and 'can evaluate AI output for their domain.'"),
        step("skills-arch", "Build the future capability model with AI literacy as a core pillar. Every role that touches AI output needs a literacy target.", "Skills Architecture without explicit literacy targets produces elegant models that miss the foundational layer."),
        step("scan", "Scan for AI opportunities with a literacy-aware lens. Opportunities that require high interpretation should be sequenced later.", "The scan will overestimate feasibility if it doesn't account for current literacy levels. Cross-reference against your Skills inventory."),
        step("design", "Design work with confidence that literacy targets are defined and investment is planned.", "Design work that assumes literacy levels above your current baseline produces roles that can't be filled internally."),
        step("bbba", "Decide build/buy/borrow/automate with the literacy timeline in mind. Some 'build' decisions may need to be 'borrow' until internal literacy catches up.", "BBBA decisions made without accounting for literacy timelines systematically over-invest in 'buy' and under-invest in 'build.'"),
      ],
      alternatives: [
        { label: "Literacy-first sequence", blurb: "Build shared AI language before design work.", selected: true },
        { label: "Design-first with parallel training", blurb: "Start design immediately, train in parallel.", rejectedReason: `Data Literacy at ${(dims["Data Literacy"] ?? 0).toFixed(1)} and AI Awareness at ${(dims["AI Awareness"] ?? 0).toFixed(1)} mean design participants can't meaningfully contribute to AI-augmented work decisions yet.`, selected: false },
        { label: "Technology deployment first", blurb: "Deploy tools and build literacy through use.", rejectedReason: "Learn-by-doing requires a baseline that doesn't exist. Users without interpretation skills develop either blind trust or reflexive rejection.", selected: false },
      ],
      sensitivityNote: `If Data Literacy and AI Awareness were each 0.5 points higher, this shifts to Pattern 6 (standard arc). Two dimensions are holding back a broader approach.`,
    };

    case 6: return {
      headline: "Standard transformation arc",
      outcomeStatement: "Your Developing-band profile with balanced dimensions supports the full methodology sequence. No single dimension is critically weak enough to override sequencing. This is the textbook arc — not because it's generic, but because your profile doesn't require the workarounds that weaker profiles need.",
      pivotalDims: [],
      steps: [
        step("scan", "Start with the opportunity scan. With balanced readiness, you can scan broadly across functions without worrying that low scores in one area will distort prioritization.", "The temptation is to scan everything at equal depth. Prioritize the 3-4 functions with the highest headcount × AI-impact intersection.", "Identify the 3-5 functions where AI investment will return the most value", ["Broader scan than smaller patterns — you have the readiness to pursue 3-5 functions. Open the AI Prioritization tab.", "Open the Impact Heatmap tab. Cross-reference: which functions show concentrated high-impact zones?", "For each candidate function, check pilot readiness: willing leader, recent wins, not in turmoil.", "Rank your candidate functions by headcount × AI-impact. Note your top 3-5. Click 'Mark step complete' to proceed."]),
        step("design", "Decompose and reconstruct work across prioritized functions. Your balanced profile means you can run multiple functions in parallel if you have the consultant bandwidth.", "Parallel execution across too many functions dilutes quality. Better to do 2 well than 4 superficially.", "Decompose and reconstruct work for 2+ functions from the scan", ["Open the Decompose tab. Select your first prioritized function.", "For representative roles, decompose into tasks. Use AI suggestion to accelerate.", "Open the Reconstruct tab. Mark AI impact per task. Build future-state bundles.", "Repeat for your second function. Better to do 2 well than 4 superficially. Click 'Mark step complete' to proceed."]),
        step("skills-arch", "Build the capability model from the redesigned work. With balanced readiness, the skills architecture can be ambitious — your workforce can grow into it.", "Don't build the capability model to current workforce limits. Build it to what good looks like; then plan the growth path.", "Build future capability model for redesigned roles", ["The module starts on the Inherit step with data from Work Design Lab.", "Walk through Steps 1 (Inherit) → 2 (Derive) → 3 (Bundle) for each redesigned role.", "On the Bundle step, validate each role has core, supporting, and emerging skills.", "Open Supply/Demand. Review org-wide capability position. Click 'Mark step complete' to proceed."]),
        step("bbba", "Standard BBBA assessment. Your balanced profile gives you real options across all four quadrants.", "'Automate' is the most over-selected option in organizations that haven't done the work design step carefully. Cross-check against actual task automation feasibility.", "Complete build/buy/borrow/automate for all redesigned roles", ["Review auto-suggested dispositions for each redesigned role.", "Override where you have better information. Financial impact recalculates.", "Confirm 'Automate' isn't over-allocated. Cross-check against actual task feasibility.", "Click 'Mark step complete' to proceed."]),
        step("opmodel", "With redesigned work and a capability model in hand, assess whether the operating model needs to change to support the new work patterns.", "Operating model changes that aren't grounded in redesigned work are theoretical. This step should feel like connecting dots, not inventing new ones.", "Assess operating model alignment with redesigned work", ["Open the current-state assessment. Identify your archetype and primary operating model.", "Review the Galbraith Star analysis. Note strategy-structure-process misalignments.", "Open the Design Canvas. Sketch the future state informed by your work design.", "Validate the new model supports redesigned roles. Click 'Mark step complete' to proceed."]),
        step("headcount", "Model the workforce transition with all the design inputs assembled.", "The gap between 'headcount model' and 'executable transition plan' is where most transformations stall. Bridge it explicitly.", "Model the current → future workforce transition", ["Review the waterfall chart with BBBA decision impacts.", "Sanity-check the financial impact: eliminations, reskilling costs, new hires.", "Verify per-function impact matches expectations. Adjust pace, not scope.", "Click 'Mark step complete' to proceed."]),
        step("plan", "Build the transformation roadmap with all design deliverables ready for sequencing.", "The roadmap is a communication tool as much as a planning tool. If it can't be explained in 10 minutes, it's too complex.", "Build the transformation roadmap with all design deliverables ready", ["Open the Change Planner. Create or update your transformation initiative.", "Sequence your design deliverables into a timeline. Assign owners per workstream.", "Build the communication cascade: leadership → managers → ICs.", "If the roadmap can't be explained in 10 minutes, simplify it. Click 'Mark step complete' to proceed."]),
      ],
      alternatives: [
        { label: "Standard methodology sequence", blurb: "Full-scope transformation matching your balanced profile.", selected: true },
        { label: "Accelerated sequence", blurb: "Compress timeline by running steps in parallel.", rejectedReason: "Developing-band scores support sequential execution reliably. Parallel execution requires Operational-band scores to sustain quality.", selected: false },
        { label: "Selective sequence", blurb: "Pick only the highest-impact modules.", rejectedReason: "Balanced profiles benefit from the full arc. Skipping steps creates gaps that surface during mobilization.", selected: false },
      ],
      sensitivityNote: "Your balanced profile means no single dimension drives the path. If any dimension drops below 2.0, a more targeted pattern would apply. Re-assess after 6 months.",
    };

    case 7: return {
      headline: "Fix the operating model before AI fragments your teams",
      outcomeStatement: `AI Collaboration at ${(dims["AI Collaboration"] ?? 0).toFixed(1)} in a Developing band means your teams don't yet collaborate effectively with AI tools. Introducing AI without addressing collaboration patterns will fragment teams further — each person developing their own relationship with AI tooling, with no shared standards or practices.`,
      pivotalDims: ["AI Collaboration"],
      steps: [
        step("opmodel", "Start with the operating model. Collaboration weaknesses often root in structural issues — unclear decision rights, missing coordination mechanisms, or misaligned incentives.", "Don't assume collaboration is a training problem. It's usually a structural problem that training can't fix."),
        step("design", "Design work with explicit collaboration patterns. Every task decomposition should specify whether the task is independent, interactive, or collaborative — and design AI integration accordingly.", "The Work Design Lab's collaboration dimension is the most commonly skipped. Don't skip it — it's the whole point of this path."),
        step("changeready", "Measure change readiness with focus on team-level adoption patterns, not just individual readiness.", "Individual readiness assessments miss the collaboration dimension. Add team-level questions to the change readiness instrument."),
        step("skills-arch", "Build the capability model with collaboration skills as a core pillar, not an afterthought.", "Skills Architecture that treats collaboration as 'soft skills' misses the point. AI-human collaboration is a technical capability."),
      ],
      alternatives: [
        { label: "Operating model-first sequence", blurb: "Fix collaboration structures before introducing AI-augmented work.", selected: true },
        { label: "Standard sequence with collaboration overlay", blurb: "Run standard arc with collaboration as a theme.", rejectedReason: `AI Collaboration at ${(dims["AI Collaboration"] ?? 0).toFixed(1)} is too weak for an overlay approach. Collaboration needs to be the primary lens, not a secondary one.`, selected: false },
        { label: "Tool-first with collaboration training", blurb: "Deploy collaborative AI tools to build the muscle.", rejectedReason: "Collaborative tools in non-collaborative cultures become individual tools used in parallel. The structure must support the tools, not vice versa.", selected: false },
      ],
      sensitivityNote: `If AI Collaboration were 0.5 points higher, this would shift to Pattern 6 (standard arc). Your recommendation depends materially on this one dimension.`,
    };

    case 8: return {
      headline: "Aim higher — your foundation can carry it",
      outcomeStatement: "Operational-band with balanced dimensions means your organization has the structural readiness for ambitious design work. The risk isn't capability — it's under-aiming. Organizations at this level often design incremental changes when they could design transformational ones.",
      pivotalDims: [],
      steps: [
        step("build", "Start with structural org design. Your Operational profile can absorb span and layer changes that weaker profiles can't sustain.", "The most common mistake at this band is designing org changes that are too conservative. Your profile supports bolder moves."),
        step("bbba_aggressive", "Run an automation-first BBBA assessment. At this readiness level, the 'automate' quadrant should be larger than most organizations are comfortable with.", "Comfort with the status quo is the enemy at this band. Push the automation boundary further than feels safe — your readiness supports it."),
        step("opmodel", "Redesign the operating model to be AI-native, not AI-augmented. The distinction matters: augmentation preserves old patterns; native design builds new ones.", "AI-native operating models require letting go of familiar coordination mechanisms. This is emotionally harder than it is structurally hard."),
        step("design", "Ambitious work redesign. Your profile supports redesigning entire job families, not just individual roles.", "The temptation is to redesign conservatively 'because the org can handle it.' The org can handle more — that's what Operational readiness means."),
        step("headcount", "Model the aggressive transition. The numbers will be larger than an incremental approach, but your readiness supports it.", "CFO conversations about aggressive headcount changes require more lead time than incremental ones. Start the financial conversation early."),
      ],
      alternatives: [
        { label: "Ambitious design sequence", blurb: "Match your strong foundation with bold design choices.", selected: true },
        { label: "Standard sequence", blurb: "Conservative approach: proven methodology, moderate scope.", rejectedReason: "Under-aiming wastes your strongest asset: readiness. A standard arc at Operational band leaves value on the table.", selected: false },
        { label: "Multi-phase incremental", blurb: "Small changes across many phases.", rejectedReason: "Multiple small phases at high readiness creates change fatigue without change impact. Better to aim high once.", selected: false },
      ],
      sensitivityNote: "Your balanced Operational profile is rare. If any dimension drops below 2.5, the ambitious sequencing becomes risky. Maintain this profile through active measurement.",
    };

    case 9: return {
      headline: "Your judgment exceeds our prescription",
      outcomeStatement: "Advanced-band readiness means your organization has already internalized most of what this platform prescribes. The marginal value of a structured design path is lower than for other bands. Use the platform's tools selectively — your team knows which ones add value and which ones they've already surpassed.",
      pivotalDims: [],
      steps: [
        step("opmodel", "If anything, review your operating model for AI-native design patterns. Even advanced organizations have structural legacy that predates AI capabilities.", "The risk at Advanced band isn't ignorance — it's complacency. The operating model that got you here may not be the one that keeps you ahead."),
        step("design", "Targeted work design for the highest-complexity roles that haven't yet been AI-augmented. These are often the roles where AI's value is least obvious but most transformative.", "Advanced organizations often have a blind spot: the roles they consider 'too complex for AI.' Those are frequently the highest-value redesign targets."),
      ],
      alternatives: [
        { label: "Targeted, selective engagement", blurb: "Use platform tools where they add value; skip where your team exceeds them.", selected: true },
        { label: "Full methodology arc", blurb: "Run the complete transformation sequence.", rejectedReason: "A full arc at Advanced band is over-prescribed. Your team would spend more time translating generic steps into their context than executing them.", selected: false },
        { label: "Advisory-only engagement", blurb: "Skip the platform tools; use only the diagnostic insights.", rejectedReason: "Some tools (Operating Model Lab, Work Design Lab) add value even at Advanced band because they provide structure that internal processes may lack.", selected: false },
      ],
      sensitivityNote: "Advanced-band paths are deliberately minimal. If your score drops on re-assessment, a more structured path becomes appropriate. Re-assess annually.",
    };

    case 10: return {
      headline: "Your tools are ahead of your culture",
      outcomeStatement: `Tool Adoption (${(dims["Tool Adoption"] ?? 0).toFixed(1)}) and AI Awareness (${(dims["AI Awareness"] ?? 0).toFixed(1)}) are strong, but Change Openness (${(dims["Change Openness"] ?? 0).toFixed(1)}) and AI Collaboration (${(dims["AI Collaboration"] ?? 0).toFixed(1)}) lag significantly. You've invested in technology; now invest in the human infrastructure to actually use it. Without this, your tools become expensive shelfware.`,
      pivotalDims: ["Change Openness", "AI Collaboration"],
      steps: [
        step("changeready", "Your change infrastructure is behind your technology. Close this gap before designing more technology-forward work.", "The instinct will be to add more tools. Resist it. You have enough tools — you don't have enough adoption."),
        step("design", "Redesign work with explicit human-AI collaboration patterns. The tools exist; the work patterns don't yet account for them.", "Work Design Lab should focus on the 'interaction' column — how humans and AI tools work together, not just what each does independently."),
        step("skills-arch", "Build capability model with collaboration and change adoption as core skills. Technology skills are already covered; human skills are the gap.", "Don't build another technical skills framework. Your gap is behavioral and collaborative, not technical."),
        step("changeready_r2", "Re-measure after the design and skills work. Has the culture started catching up to the technology?", "Culture change is slower than technology deployment. Give it time and measure honestly."),
      ],
      alternatives: [
        { label: "Culture-catch-up sequence", blurb: "Close the gap between technology investment and cultural adoption.", selected: true },
        { label: "Technology acceleration", blurb: "Deploy more advanced tools to force adoption.", rejectedReason: "More technology on resistant culture produces more shelfware. The constraint is cultural, not technical.", selected: false },
        { label: "Standard arc", blurb: "Ignore the imbalance and run the standard sequence.", rejectedReason: "Standard sequences assume balanced readiness. Your tech-culture imbalance means standard sequencing misallocates effort toward technology that doesn't need more investment.", selected: false },
      ],
      sensitivityNote: `If Change Openness were 0.5 points higher, this shifts to a standard arc with technology emphasis. The cultural gap is the binding constraint.`,
    };

    case 11: return {
      headline: "Your people are ready — meet them with tools",
      outcomeStatement: `Change Openness (${(dims["Change Openness"] ?? 0).toFixed(1)}) and AI Collaboration (${(dims["AI Collaboration"] ?? 0).toFixed(1)}) are strong, but Tool Adoption (${(dims["Tool Adoption"] ?? 0).toFixed(1)}) lags. Your workforce is willing and collaborative — they're waiting for the tooling to match their readiness. This is the best problem to have: demand exceeds supply.`,
      pivotalDims: ["Tool Adoption"],
      steps: [
        step("scan", "Identify the highest-value AI opportunities. Your workforce is ready to adopt — point them at the right targets.", "With high change readiness, the scan can be more aggressive. Include opportunities that other organizations would defer."),
        step("bbba", "Emphasize 'Buy' decisions. Your workforce can adopt external tools rapidly — leverage that.", "With a change-ready workforce, 'Buy' decisions land faster than in resistant organizations. Accelerate procurement timelines."),
        step("design", "Redesign work around the tools your BBBA assessment identified. Your workforce will adopt the redesigned patterns if the tools are ready.", "The biggest risk is tool procurement speed. Design work that depends on tools not yet procured creates frustration in a ready workforce."),
        step("skills-arch", "Build the capability model. Your workforce's readiness means the skills gap is primarily technical (tool-specific), not behavioral.", "Technical skills gaps close faster than behavioral gaps. Your timeline estimates should reflect this — be more aggressive."),
      ],
      alternatives: [
        { label: "Tool-forward sequence", blurb: "Meet your ready workforce with the tools they're asking for.", selected: true },
        { label: "Change-first sequence", blurb: "Invest in change readiness before tools.", rejectedReason: "Your change readiness is already strong. Additional change investment has diminishing returns — invest in the constraint instead.", selected: false },
        { label: "Build-heavy BBBA", blurb: "Build tools internally rather than buying.", rejectedReason: "Internal tool building is slow. Your workforce is ready now. Buy and customize; don't build from scratch.", selected: false },
      ],
      sensitivityNote: `If Tool Adoption were 1.0 points higher, this shifts to Pattern 8 (ambitious operational arc). Your tool gap is the only thing holding back a more ambitious path.`,
    };

    case 12: return {
      headline: "Your enthusiasm is ahead of your foundation",
      outcomeStatement: `High AI Awareness (${(dims["AI Awareness"] ?? 0).toFixed(1)}) and AI Collaboration (${(dims["AI Collaboration"] ?? 0).toFixed(1)}) with low Data Literacy (${(dims["Data Literacy"] ?? 0).toFixed(1)}) is a common pattern in organizations that have invested in AI strategy and culture but not in the foundational skills to execute. Enthusiasm without literacy produces confident but unreliable AI adoption.`,
      pivotalDims: ["Data Literacy"],
      steps: [
        step("skills", "Map the literacy gap precisely. The distance between 'excited about AI' and 'can evaluate AI output' is larger than your awareness scores suggest.", "Don't let high awareness scores create complacency about literacy. Awareness without literacy is enthusiasm without judgment."),
        step("skills-arch", "Build the capability model with literacy as the critical foundation. Every AI-adjacent role needs explicit data interpretation targets.", "The capability model must distinguish between AI enthusiasm (which you have) and AI judgment (which you need to build)."),
        step("scan", "Scan for opportunities with a literacy-calibrated lens. High-enthusiasm, low-literacy organizations tend to overestimate implementation feasibility.", "Calibrate opportunity scores against current literacy levels, not target levels. Design for who you have, not who you wish you had."),
        step("design", "Design work with literacy guard rails. Tasks that require AI output interpretation need minimum proficiency gates.", "The most dangerous task design is one that assumes literacy that doesn't exist. Build interpretation checkpoints into every AI-augmented task."),
      ],
      alternatives: [
        { label: "Foundation-first sequence", blurb: "Build the literacy foundation that enthusiasm needs to become execution.", selected: true },
        { label: "Enthusiasm-led deployment", blurb: "Leverage high awareness to drive rapid adoption.", rejectedReason: `Data Literacy at ${(dims["Data Literacy"] ?? 0).toFixed(1)} means enthusiasm drives adoption of outputs people can't evaluate. This produces confident errors — worse than cautious progress.`, selected: false },
        { label: "Parallel literacy + design", blurb: "Build literacy while designing simultaneously.", rejectedReason: "Parallel execution at this literacy level means design decisions are made by people who can't yet evaluate AI outputs. Sequence literacy first.", selected: false },
      ],
      sensitivityNote: `If Data Literacy were 1.0 points higher, this shifts to Pattern 6 (standard arc). Your enthusiasm is an asset once the foundation exists.`,
    };

    case 13: {
      const entries = Object.entries(dims);
      const weakest = entries.reduce((a, b) => a[1] < b[1] ? a : b);
      return {
        headline: "Address your weakest dimension first",
        outcomeStatement: `Your dimensions show high variance (${Math.max(...Object.values(dims)).toFixed(1)} max vs ${Math.min(...Object.values(dims)).toFixed(1)} min). The weakest dimension — ${weakest[0]} at ${weakest[1].toFixed(1)} — is the binding constraint on everything else. Strengths in other dimensions can't compensate for this gap; they can only be wasted against it.`,
        pivotalDims: [weakest[0]],
        steps: getImbalancedSteps(weakest[0], weakest[1], dims),
        alternatives: [
          { label: "Weakest-dimension-first sequence", blurb: `Address ${weakest[0]} (${weakest[1].toFixed(1)}) before leveraging stronger dimensions.`, selected: true },
          { label: "Strength-led sequence", blurb: "Lead with your strongest dimensions.", rejectedReason: `Your strongest dimension can't compensate for ${weakest[0]} at ${weakest[1].toFixed(1)}. The weakest dimension sets the ceiling, not the strongest.`, selected: false },
          { label: "Balanced investment across all dimensions", blurb: "Invest equally across all dimensions.", rejectedReason: "Equal investment when variance is this high wastes resources on dimensions that don't need them while under-investing in the one that does.", selected: false },
        ],
        sensitivityNote: `Your dimension scores show high variance. Whichever dimension remains weakest will dictate sequencing — re-running the assessment after improvements may meaningfully change the path.`,
      };
    }

    default: return getPatternContent(6, dims, band); // fallback to standard
  }
}

/* ── Helpers for Pattern 13 ── */

function getImbalancedSteps(weakDim: string, weakScore: number, dims: Record<string, number>): DesignPathStep[] {
  const d = weakDim.toLowerCase();
  if (d.includes("change")) return [
    step("changeready", `${weakDim} at ${weakScore.toFixed(1)} is the binding constraint. Address it before any design work.`, "Don't assume other strong dimensions compensate for change weakness. They don't — they make the gap more dangerous."),
    step("design", "After change scores improve, begin design work leveraging your stronger dimensions.", "Design work after change investment should feel like running downhill. If it doesn't, the change work wasn't sufficient."),
    step("bbba", "Standard BBBA with the change constraint addressed.", "BBBA decisions after change work should be bolder than before it. If they're not, re-examine whether change scores actually improved."),
  ];
  if (d.includes("data") || d.includes("literacy")) return [
    step("skills", `Map the ${weakDim} gap precisely.`, "The gap is probably wider than the score suggests. Probe deeper."),
    step("skills-arch", "Build capability model with literacy as the critical foundation.", "Every role touching AI output needs an explicit literacy target."),
    step("scan", "Scan with a literacy-calibrated lens.", "Opportunities will look different after literacy investment."),
    step("design", "Design work with literacy guard rails in place.", "Don't design tasks that assume literacy levels above your targets."),
  ];
  if (d.includes("collaboration")) return [
    step("opmodel", "Fix the structural collaboration issues first.", "Collaboration weaknesses are usually structural, not behavioral."),
    step("design", "Design work with explicit collaboration patterns.", "The collaboration dimension in Work Design Lab is the priority."),
    step("skills-arch", "Build capability model with collaboration skills as core.", "AI-human collaboration is a technical capability, not a soft skill."),
  ];
  // Default: tool or awareness gap
  return [
    step("scan", `Scan for opportunities calibrated to your ${weakDim} constraint.`, "Don't assume strong dimensions compensate for tool/awareness gaps."),
    step("design", "Begin design work focusing on areas where the weak dimension matters least.", "Sequence high-dependency tasks later, low-dependency tasks first."),
    step("bbba", "BBBA with explicit attention to the capability gap.", "The gap changes the build/buy/borrow/automate calculus."),
    step("plan", "Build a transformation plan that explicitly sequences the constraint resolution.", "The plan must show when the weak dimension improves enough to unlock higher-complexity work."),
  ];
}

/* ── Findings builder ── */

function buildFindings(dims: Record<string, number>, pivotalDims: string[]): PivotalFinding[] {
  return Object.entries(dims).map(([name, score]) => ({
    dimensionName: name,
    score,
    maxScore: 5,
    pivotal: pivotalDims.includes(name),
    flag: score < 2.0 ? "weak" as const : score < 3.0 ? "developing" as const : "strong" as const,
  }));
}

/* ── Engine implementation ── */

export const AIReadinessPathEngine: PathEngine<AIReadinessResult> = {
  sourceModuleId: "readiness",
  sourceModuleTitle: "AI Readiness Assessment",

  generate(result: AIReadinessResult, projectId: string): DesignPath {
    const band = determineBand(result.overallScore);
    const pattern = detectPattern(result.dimensions, band);
    const content = getPatternContent(pattern, result.dimensions, band);

    // Enrich scan steps with sub-steps based on pattern
    const PATTERN_SCAN_TABS: Record<number, { required: string[]; ctx: { emphasisPilot?: boolean; emphasisBroad?: boolean; emphasisAmbitious?: boolean } }> = {
      1:  { required: ["ai", "heatmap"], ctx: { emphasisPilot: true } },
      2:  { required: ["ai", "heatmap"], ctx: { emphasisPilot: true } },
      3:  { required: ["ai", "heatmap", "skills"], ctx: {} },
      4:  { required: ["ai", "heatmap", "org"], ctx: {} },
      5:  { required: ["ai", "heatmap"], ctx: {} },
      6:  { required: ["ai", "heatmap", "skills", "org"], ctx: { emphasisBroad: true } },
      7:  { required: ["ai", "heatmap", "org"], ctx: {} },
      8:  { required: ["ai", "heatmap", "skills", "org"], ctx: { emphasisAmbitious: true } },
      9:  { required: ["ai"], ctx: {} },
      10: { required: ["ai", "heatmap"], ctx: {} },
      11: { required: ["ai", "heatmap", "skills"], ctx: { emphasisBroad: true } },
      12: { required: ["ai", "heatmap"], ctx: {} },
      13: { required: ["ai", "heatmap", "org"], ctx: {} },
    };
    const scanConfig = PATTERN_SCAN_TABS[pattern] || PATTERN_SCAN_TABS[6];
    const enrichedSteps = content.steps.map(s => {
      if (s.moduleId === "scan" && (!s.subSteps || s.subSteps.length === 0)) {
        const { subSteps, tabContext } = scanSubSteps(scanConfig.required, scanConfig.ctx);
        return { ...s, subSteps, moduleTabContext: tabContext };
      }
      return s;
    });

    return {
      pathId: `readiness-${projectId}`,
      sourceModuleId: "readiness",
      sourceModuleTitle: "AI Readiness Assessment",
      generatedAt: new Date().toISOString(),
      headline: content.headline,
      outcomeStatement: content.outcomeStatement,
      bandLabel: band,
      overallScore: result.overallScore,
      findings: buildFindings(result.dimensions, content.pivotalDims),
      alternatives: content.alternatives,
      steps: enrichedSteps,
      sensitivityNote: content.sensitivityNote,
      lifecycleState: "active",
      lastActiveAt: new Date().toISOString(),
    };
  },
};
