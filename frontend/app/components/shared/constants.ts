import { CDN_BASE, cb } from "../../../lib/cdn";

export const COLORS = ["#D4860A","#C07030","#E8C547","#B8602A","#D97706","#F59E0B","#A0522D","#E09040"];

export const TT: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 15, color: "var(--text-primary)" };

/* ─── Help System: MODULE_HELP ─── */
export const MODULE_HELP: Record<string, { title: string; summary: string; pages?: { heading: string; body: string }[] }> = {
  snapshot: { title: "Workforce Snapshot", summary: "Baseline view of headcount, roles, functions, and readiness. Start here to understand current state.", pages: [
    { heading: "What it shows", body: "Total headcount, function breakdown, role count, task coverage %, and AI readiness score." },
    { heading: "How to use", body: "Review the 6 KPI cards for a quick health check. Drill into any function bar to filter downstream modules. Use the data quality indicator to identify gaps before designing." },
  ]},
  jobs: { title: "Job Architecture", summary: "Explore job families, career tracks, levels, and role clusters across your organization." },
  jobarch: { title: "Job Architecture", summary: "Enterprise job catalogue, hierarchy framework, career path design, and structural validation — the foundation of organizational design.", pages: [
    { heading: "What is Job Architecture?", body: "A structured framework organizing all jobs into a coherent hierarchy: Enterprise → Function → Job Family Group → Job Family → Sub-Family → Job Title → Level. It defines how roles relate, what career paths exist, and how leveling and compensation align across the enterprise." },
    { heading: "Key Components", body: "Job families and sub-families group related roles. Career tracks (IC, Manager, Executive) define progression paths. Career levels define scope, complexity, and autonomy at each band. Job profiles document purpose, responsibilities, skills, and KPIs. Job codes enable HRIS integration and market benchmarking." },
    { heading: "The Hierarchy", body: "Enterprise → Function (Finance, Technology, HR) → Job Family Group (Financial Operations) → Job Family (FP&A, Accounting, Treasury) → Sub-Family (AP, AR, GL) → Job Title (Senior Accountant) → Level (L4). Each layer adds specificity. Most enterprises have 8-15 functions, 40-80 families, and 200-500 unique titles." },
    { heading: "How to Build One", body: "Step 1: Inventory all existing roles and titles. Step 2: Define career tracks and level criteria. Step 3: Group roles into families and sub-families. Step 4: Validate with functional leaders. Step 5: Align compensation bands to levels. Step 6: Run structural validation checks. Step 7: Publish and communicate. Step 8: Establish governance cadence." },
    { heading: "Common Frameworks", body: "Mercer IPE (International Position Evaluation) — factor-based, globally consistent. Hay/Korn Ferry — measures know-how, problem-solving, accountability. WTW (Willis Towers Watson) — global grading methodology. Radford — technology-sector focused leveling. Each provides a standardized way to evaluate and compare roles across organizations and markets." },
    { heading: "Governance", body: "Annual full review with functional leaders. Quarterly calibration sessions for new/changed roles. Title change requests require architecture committee approval. Market benchmarking refresh every 12-18 months. Track metrics: title-to-headcount ratio (target 1:15-20), orphaned roles (target <5%), level distribution health." },
    { heading: "Common Mistakes", body: "Title inflation (VP-level titles for individual contributors). Too many levels (>8 per track creates confusion). Inconsistent naming across functions. Orphaned roles (single-incumbent with no career path). Designing in HR without functional input. Treating it as static rather than living framework." },
    { heading: "Glossary", body: "Span of Control: number of direct reports per manager. Career Lattice: non-linear career movement (lateral, diagonal, not just up). Dual-Track: parallel IC and Manager paths at senior levels. Broadbanding: combining multiple narrow pay grades into fewer wide bands. Job Evaluation: systematic process to determine relative worth of roles. Market Pricing: setting compensation based on external market data rather than internal equity alone." },
    { heading: "Why It Matters for AI Transformation", body: "AI transformation redesigns roles at the task level — the job architecture determines which roles exist to be redesigned, how they relate to each other, and where career paths need to be rebuilt. Without a clean architecture, you cannot accurately model the impact of automation, plan reskilling pathways, or design the future-state organization. The architecture is the skeleton; AI transformation reshapes the muscles." },
  ]},
  scan: { title: "AI Opportunity Scan", summary: "Identifies where AI creates the most value by scoring tasks on automation potential, time savings, and complexity." },
  readiness: { title: "AI Readiness", summary: "Individual and team readiness scores based on skill proficiency, change disposition, and current AI tool adoption." },
  mgrcap: { title: "Manager Capability", summary: "Assesses manager readiness to lead transformation — identifies champions, at-risk managers, and development needs." },
  skills: { title: "Skills & Talent", summary: "Skill inventory, gap analysis, and adjacency mapping. Identifies critical gaps and reskilling opportunities." },
  bbba: { title: "Build/Buy/Borrow/Automate", summary: "Talent sourcing strategy framework — recommends whether to reskill, hire, contract, or automate each redesigned role." },
  headcount: { title: "Headcount Planning", summary: "Current-to-future workforce waterfall showing net FTE impact of AI transformation." },
  design: { title: "Work Design Lab", summary: "Redesign jobs task-by-task. Deconstruct roles into tasks, apply AI impact scores, reconstruct new role profiles.", pages: [
    { heading: "Step 1: Context", body: "Select a job from the sidebar. Review the job description, incumbent count, and current task portfolio." },
    { heading: "Step 2: Deconstruct", body: "Break the role into its component tasks. Each task gets scored on type (repetitive/variable), logic (deterministic/probabilistic/judgment), and AI impact." },
    { heading: "Step 3: Reconstruct", body: "Apply an AI scenario (Conservative/Moderate/Aggressive) to see how tasks redistribute. The reconstructed role shows new time allocation." },
    { heading: "Step 4: Redeployment", body: "Freed capacity from AI automation flows into redeployment options — higher-value work, new roles, or cross-functional assignments." },
  ]},
  simulate: { title: "Impact Simulator", summary: "Model scenarios, costs, and redeployment outcomes. Compare conservative vs. aggressive AI adoption paths." },
  build: { title: "Org Design Studio", summary: "Reshape spans, layers, and org structure. Visualize reporting lines and identify structural inefficiencies." },
  reskill: { title: "Reskilling Pathways", summary: "Per-employee learning plans with timelines, investment estimates, and skill gap closure tracking." },
  marketplace: { title: "Talent Marketplace", summary: "Match internal candidates to redesigned roles based on skill adjacency and readiness scores." },
  changeready: { title: "Change Readiness", summary: "4-quadrant workforce segmentation — maps willingness vs. ability to adopt AI-driven changes." },
  mgrdev: { title: "Manager Development", summary: "Targeted development plans for people managers based on their capability assessment results." },
  plan: { title: "Change Planner", summary: "Sequence transformation initiatives into waves. Manage dependencies, risks, and milestone tracking." },
  export: { title: "Export & Report", summary: "Generate board-ready .docx transformation report with all findings, data, and recommendations." },
  opmodel: { title: "Operating Model Lab", summary: "Explore and design operating model architectures across functions, archetypes, and governance patterns.", pages: [
    { heading: "Function & Archetype", body: "Select a function (Finance, Technology, HR, etc.) and an archetype (Functional, Divisional, Matrix, Platform, Network) to generate a capability blueprint." },
    { heading: "Company Sandbox", body: "Click a company name (Toyota, Netflix, etc.) to seed full organizational data that flows through all platform tabs. The backend generates employees, tasks, skills, and operating model data." },
    { heading: "Blueprint Tab", body: "Shows the 5-layer architecture: Governance → Core → Shared → Enabling → Interface. Each capability auto-classifies into an AI service tier." },
    { heading: "KPI Alignment Tab", body: "Link strategic objectives to measurable KPIs. Track progress and build a traceability matrix connecting objectives → KPIs → operating model nodes." },
  ]},
  om_canvas: { title: "OM Design Canvas", summary: "Visual drag-and-drop canvas for designing operating model structures with FTE deltas and KPI linkage." },
  rolecompare: { title: "Role Comparison", summary: "Compare up to 4 roles side-by-side — current state metrics, task breakdown, AI impact, and redesigned outcomes.", pages: [
    { heading: "How to use", body: "Select 2-4 jobs from the picker. Each role card shows task count, AI-automatable percentage, and top tasks by time allocation." },
    { heading: "Redesigned view", body: "Roles that have been processed through the Work Design Lab show a 'Redesigned' badge with human vs. AI time split from your chosen scenario." },
  ]},
  quickwins: { title: "Quick-Win Identifier", summary: "Automatically surfaces the highest-ROI, lowest-effort AI automation opportunities across your organization.", pages: [
    { heading: "Scoring", body: "Each task is scored on ROI (time saved × impact level × logic type) and effort (repetitive = low, variable = medium, judgment = high). The combined score ranks opportunities." },
    { heading: "Categories", body: "Quick Wins are high-impact, low-effort. Strategic Bets are high-impact but need more investment. Easy Automations are simple but lower-impact." },
  ]},
  dashboard: { title: "Transformation Dashboard", summary: "Executive summary across all transformation phases — decision log, risk register, and progress tracking." },
  orghealth: { title: "Org Health Scorecard", summary: "Auto-calculated organizational health metrics benchmarked against industry standards across leadership, culture, digital maturity, processes, and data quality.", pages: [
    { heading: "What it measures", body: "Composite scores across 5+ dimensions: leadership alignment, cultural adaptability, digital maturity, process standardization, and data quality. Each dimension is scored 0-100 and compared against industry benchmarks." },
    { heading: "How to read it", body: "Green metrics are within industry benchmarks. Yellow metrics are below average but recoverable. Red metrics indicate critical gaps requiring immediate intervention. The overall health score weights all dimensions." },
    { heading: "Benchmark comparison", body: "Select an industry to see how your organization compares. Benchmarks come from aggregated anonymized data across similar organizations by size and sector." },
  ]},
  heatmap: { title: "AI Impact Heatmap", summary: "Visualizes automation potential across the intersection of functions and job families — identifies hot spots where AI delivers the most value.", pages: [
    { heading: "What it shows", body: "A matrix of functions (rows) × job families (columns). Each cell is colored by composite AI impact score: red/orange = high automation potential (quick wins), blue/green = human-intensive work requiring augmentation." },
    { heading: "How to use it", body: "Start with the hottest cells — these represent the highest-impact automation opportunities. Click any cell to see the underlying tasks driving the score. Use this to prioritize which roles to deconstruct first in the Work Design Lab." },
  ]},
  clusters: { title: "Role Clustering", summary: "Groups similar roles by task composition, skill requirements, and AI impact profiles — reveals hidden redundancy and consolidation opportunities.", pages: [
    { heading: "How clustering works", body: "Roles are compared on task overlap percentage, shared characteristics (task type, logic, interaction patterns), and AI impact similarity. Roles with >70% overlap are flagged as consolidation candidates." },
    { heading: "What to look for", body: "Large clusters with high overlap suggest organizational redundancy — the same work being done under different titles in different functions. Consolidation candidates can be merged to reduce complexity and improve career path clarity." },
    { heading: "Action steps", body: "Review consolidation candidates with functional leaders. Validate whether overlapping roles truly do the same work or just share surface-level characteristics. Feed confirmed consolidations into the Job Architecture redesign." },
  ]},
  recommendations: { title: "AI Recommendations Engine", summary: "Synthesizes data from all diagnostic modules to generate prioritized, actionable transformation recommendations with impact and effort estimates.", pages: [
    { heading: "How it works", body: "The engine analyzes patterns across workforce snapshot, AI readiness, skills gaps, manager capability, and change readiness data. It identifies the highest-impact opportunities and most critical risks, then generates specific action items." },
    { heading: "Recommendation types", body: "Quick Wins (high impact, low effort), Strategic Priorities (high impact, high effort), Tactical Fixes (low impact, low effort), and Watch Items (low impact but potentially growing). Each recommendation includes an impact estimate, effort level, and suggested owner." },
  ]},
  story: { title: "Transformation Story Builder", summary: "Auto-generates executive-ready transformation narratives for board presentations, all-hands meetings, and investor updates.", pages: [
    { heading: "What it does", body: "Synthesizes data from every module — workforce baseline, AI impact analysis, skills gaps, change readiness, and financial projections — into a coherent narrative suitable for executive audiences." },
    { heading: "Tone options", body: "Choose between Board Presentation (formal, data-heavy, ROI-focused), All-Hands (motivational, employee-centric, change-positive), or Investor Update (strategic, market-positioning, growth-oriented). Each tone reshapes the same data into different storytelling frameworks." },
    { heading: "How to use", body: "Select a tone, click Generate, then review and edit the output. Export as text for inclusion in slide decks or documents. Regenerate with a different tone for different audiences." },
  ]},
  archetypes: { title: "Readiness Archetypes", summary: "Segments the workforce into behavioral profiles with tailored engagement strategies — from Early Adopters to Active Resistors.", pages: [
    { heading: "The four archetypes", body: "Early Adopters (high readiness, embrace change), Pragmatic Majority (willing but need evidence), Skeptics (resistant but persuadable with data), Active Resistors (need intensive, personalized intervention). Each group requires a fundamentally different approach." },
    { heading: "Engagement strategies", body: "Early Adopters become Champions — deploy them to lead pilots. Pragmatics need proof points and peer testimonials. Skeptics respond to data, transparency, and small wins. Resistors need one-on-one coaching and gradual exposure." },
    { heading: "How to use", body: "Review the distribution of your workforce across archetypes. Use the engagement playbooks to design communication and change management plans targeted to each group. Cross-reference with Change Readiness quadrants for a complete picture." },
  ]},
  skillshift: { title: "Skill Shift Index", summary: "Tracks how skill demand is changing across the organization as AI transformation progresses — shows which skills are growing, declining, or emerging.", pages: [
    { heading: "What it shows", body: "A ranked visualization of skills by net demand change. Rising skills (AI Literacy, Process Automation) indicate where to invest in training. Declining skills (manual data entry, routine reporting) signal automation opportunities." },
    { heading: "How to use", body: "Compare current vs. future skill demand. Cross-reference with the Skills Gap Analysis to prioritize reskilling investments. Use the shift data to inform BBBA sourcing decisions." },
  ]},
};

export const PHASES = [
  { id: "discover", label: "Discover", icon: "🔍", color: "#D4860A", desc: "Understand where you are", guidance: "Start by understanding your organization's workforce structure, job architecture, and AI readiness.", modules: ["dashboard", "snapshot", "skillshift", "jobarch"] },
  { id: "diagnose", label: "Diagnose", icon: "🩺", color: "#E8C547", desc: "Find what matters most", guidance: "Now that you understand the landscape, let's identify the highest-impact opportunities and biggest risks.", modules: ["orghealth", "scan", "heatmap", "readiness", "changeready", "clusters", "recommendations", "mgrcap", "skills"] },
  { id: "design", label: "Design", icon: "✏️", color: "#10B981", desc: "Architect the future state", guidance: "Design your future state — redesign roles, restructure the operating model, and plan your workforce.", modules: ["design", "opmodel", "build", "bbba", "headcount", "quickwins", "rolecompare"] },
  { id: "simulate", label: "Simulate", icon: "⚡", color: "#8B5CF6", desc: "Model the impact before you commit", guidance: "Model different futures before committing. Adjust assumptions, compare scenarios, and build the business case.", modules: ["simulate"] },
  { id: "mobilize", label: "Mobilize", icon: "🚀", color: "#F59E0B", desc: "Make it happen", guidance: "Build your transformation roadmap, engage stakeholders, and generate the deliverables.", modules: ["plan", "story", "archetypes", "mgrdev", "reskill", "marketplace", "export"] },
];

export const MODULES = [
  { id: "dashboard", icon: "🎯", title: "Transformation Dashboard", desc: "Executive summary across all phases", color: "#F59E0B", phase: "discover", views: ["org","custom"] },
  { id: "jobarch", icon: "🏗️", title: "Job Architecture", desc: "Enterprise job catalogue, hierarchy, career framework & validation", color: "#B8602A", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Career Path", jobTitle: "Role in Context", empDesc: "Your career trajectory and development", jobDesc: "Where this role sits in the hierarchy" },
  { id: "snapshot", icon: "📊", title: "Workforce Snapshot", desc: "See your people, structure, and readiness baseline", color: "#D4860A", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Employee Profile", jobTitle: "Job Profile", empDesc: "Your profile, team, and AI impact", jobDesc: "Role incumbents, comp, and AI scores" },
  { id: "orghealth", icon: "🏥", title: "Org Health Scorecard", desc: "Auto-calculated metrics with industry benchmarks", color: "#D4860A", phase: "diagnose", views: ["org","custom"] },
  { id: "scan", icon: "🔬", title: "AI Opportunity Scan", desc: "Find where AI creates the most value", color: "#F97316", phase: "diagnose", views: ["org","job","employee","custom"], empTitle: "AI Impact on My Role", jobTitle: "AI Impact on This Job" },
  { id: "heatmap", icon: "🔥", title: "AI Impact Heatmap", desc: "Automation potential by function × job family", color: "#EF4444", phase: "diagnose", views: ["org","custom"] },
  { id: "clusters", icon: "🔗", title: "Role Clustering", desc: "Group similar roles, identify consolidation candidates", color: "#B8602A", phase: "diagnose", views: ["org","custom"] },
  { id: "readiness", icon: "🎯", title: "AI Readiness", desc: "Individual and team readiness for AI transformation", color: "#C07030", phase: "diagnose", views: ["org","job","employee","custom"], empTitle: "My Readiness", empDesc: "Your personal AI readiness scores" },
  { id: "mgrcap", icon: "👔", title: "Manager Capability", desc: "Assess manager readiness and identify champions", color: "#A855F7", phase: "diagnose", views: ["org","custom"] },
  { id: "recommendations", icon: "🤖", title: "AI Recommendations", desc: "AI-generated transformation recommendations ranked by impact", color: "#E09040", phase: "diagnose", views: ["org","job","custom"] },
  { id: "skills", icon: "🧠", title: "Skills & Talent", desc: "Inventory, gap analysis, and adjacency mapping", color: "#D97706", phase: "diagnose", views: ["org","job","employee","custom"], empTitle: "My Skills", jobTitle: "Role Skills", empDesc: "Your skill profile and development gaps", jobDesc: "Skills required for this role" },
  { id: "bbba", icon: "🔀", title: "Build/Buy/Borrow/Auto", desc: "Talent sourcing strategy per redesigned role", color: "#B8602A", phase: "design", views: ["org","custom"] },
  { id: "headcount", icon: "👥", title: "Headcount Planning", desc: "Current to future workforce waterfall", color: "#8B5CF6", phase: "design", views: ["org","custom"] },
  { id: "design", icon: "✏️", title: "Work Design Lab", desc: "Redesign tasks, roles, and time allocation job by job", color: "#10B981", phase: "design", views: ["org","job","custom"] },
  { id: "simulate", icon: "⚡", title: "Impact Simulator", desc: "Model scenarios, costs, and redeployment outcomes", color: "#D97706", phase: "simulate", views: ["org","job","employee","custom"], empTitle: "How AI Affects Me", jobTitle: "Role Scenario", empDesc: "Personal impact of AI transformation", jobDesc: "Scenario modeling for this specific role" },
  { id: "build", icon: "🏗️", title: "Org Design Studio", desc: "Reshape spans, layers, and structure across the org", color: "#B8602A", phase: "design", views: ["org","job","employee","custom"], empTitle: "My Org Chart", jobTitle: "Structural Context", empDesc: "Your reporting line and team structure", jobDesc: "Where this role sits structurally" },
  { id: "reskill", icon: "📚", title: "Reskilling Pathways", desc: "Per-employee learning plans and timelines", color: "#D97706", phase: "mobilize", views: ["org","employee","custom"], empTitle: "My Learning Path", empDesc: "Your personal reskilling journey" },
  { id: "marketplace", icon: "🏪", title: "Talent Marketplace", desc: "Match internal candidates to redesigned roles", color: "#F97316", phase: "mobilize", views: ["org","custom"] },
  { id: "skillshift", icon: "🔄", title: "Skill Shift Index", desc: "Net skill movement — declining, amplified, and net-new skills", color: "#D97706", phase: "discover", views: ["org","custom"] },
  { id: "changeready", icon: "📈", title: "Change Readiness", desc: "4-quadrant segmentation and intervention mapping", color: "#EF4444", phase: "diagnose", views: ["org","custom"] },
  { id: "archetypes", icon: "🎭", title: "Readiness Archetypes", desc: "Consultant-grade workforce archetypes with engagement playbooks", color: "#C07030", phase: "mobilize", views: ["org","custom"] },
  { id: "story", icon: "📖", title: "Transformation Story", desc: "AI-generated executive narrative for board presentations", color: "#E09040", phase: "mobilize", views: ["org","custom"] },
  { id: "mgrdev", icon: "🎓", title: "Manager Development", desc: "Targeted development plans for people managers", color: "#A855F7", phase: "mobilize", views: ["org","custom"] },
  { id: "plan", icon: "🚀", title: "Change Planner", desc: "Sequence initiatives and manage transformation risk", color: "#EF4444", phase: "mobilize", views: ["org","job","employee","custom"], empTitle: "My Change Journey", jobTitle: "Role Change Plan", empDesc: "Your personal transformation timeline", jobDesc: "Change initiatives affecting this role" },
  { id: "export", icon: "📋", title: "Export & Report", desc: "Generate your board-ready transformation report", color: "#EF4444", phase: "mobilize", views: ["org","job","employee","custom"] },
  { id: "opmodel", icon: "🧬", title: "Operating Model Lab", desc: "Explore architecture patterns across functions", color: "#F59E0B", phase: "design", views: ["org","custom"] },
  // om_canvas is accessed from within OperatingModelLab, not as a standalone module
  { id: "rolecompare", icon: "⚖️", title: "Role Comparison", desc: "Side-by-side current vs. redesigned role analysis", color: "#C07030", phase: "design", views: ["org","job","custom"] },
  { id: "quickwins", icon: "⚡", title: "Quick-Win Identifier", desc: "Find highest ROI, lowest effort AI opportunities", color: "#22C55E", phase: "design", views: ["org","custom"] },
];

export const PHASE_BACKGROUNDS: Record<string, string> = {
  discover: cb(`${CDN_BASE}/cards/backgrounds/discover.png`),
  diagnose: cb(`${CDN_BASE}/cards/backgrounds/diagnose.png`),
  design: cb(`${CDN_BASE}/cards/backgrounds/design.png`),
  simulate: cb(`${CDN_BASE}/cards/backgrounds/simulate.png`),
  mobilize: cb(`${CDN_BASE}/cards/backgrounds/mobilize.png`),
};

const TILE_IMAGES = Array.from({ length: 16 }, (_, i) => cb(`${CDN_BASE}/cards/tiles/tile_${String(i + 1).padStart(2, "0")}.png`));

/** Generate a mapping of card IDs → tile images, unique within each phase group */
export function generateCardBackgrounds(): Record<string, string> {
  const result: Record<string, string> = {};
  // For each phase, shuffle all 12 tiles and assign one unique tile per card
  for (const phase of PHASES) {
    const pool = [...TILE_IMAGES];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const phaseMods = MODULES.filter(m => m.phase === phase.id);
    phaseMods.forEach((m, i) => { result[m.id] = pool[i]; });
  }
  return result;
}

export const SIM_DIMS = ["Data Readiness","Process Standardization","Technology Enablement","Talent Readiness","Leadership Alignment"];
export const SIM_PRESETS: Record<string, { label: string; adoption: number; timeline: number; ramp: number; color: string }> = {
  conservative: { label: "Conservative", adoption: 0.3, timeline: 18, ramp: 0.6, color: "#D4860A" },
  balanced: { label: "Balanced", adoption: 0.6, timeline: 12, ramp: 0.8, color: "#10B981" },
  transformative: { label: "Transformative", adoption: 0.9, timeline: 6, ramp: 1.0, color: "#8B5CF6" },
};
export const SIM_JOBS = [
  { role: "Financial Analyst", dept: "Finance", currentHrs: 188, aiEligibleHrs: 120, highAiTasks: 14, rate: 85 },
  { role: "HR Coordinator", dept: "Human Resources", currentHrs: 160, aiEligibleHrs: 95, highAiTasks: 11, rate: 65 },
  { role: "Marketing Specialist", dept: "Marketing", currentHrs: 172, aiEligibleHrs: 110, highAiTasks: 16, rate: 78 },
  { role: "Operations Manager", dept: "Operations", currentHrs: 195, aiEligibleHrs: 85, highAiTasks: 9, rate: 92 },
  { role: "Customer Success Rep", dept: "Customer Success", currentHrs: 168, aiEligibleHrs: 130, highAiTasks: 18, rate: 60 },
];
export const SIM_READINESS: Record<string, { item: string; score: number; notes: string }[]> = {
  "Data Readiness": [{ item: "Data Availability", score: 4, notes: "Core data accessible via API" }, { item: "Data Quality", score: 3, notes: "Some inconsistencies in legacy systems" }, { item: "Data Governance", score: 4, notes: "Established DG framework" }, { item: "Data Integration", score: 3, notes: "Partial integration" }],
  "Process Standardization": [{ item: "Process Documentation", score: 2, notes: "Tribal knowledge dominates" }, { item: "Workflow Consistency", score: 2, notes: "Varies by team" }, { item: "Automation Baseline", score: 1, notes: "Minimal automation" }, { item: "Change Protocols", score: 3, notes: "Basic change mgmt exists" }],
  "Technology Enablement": [{ item: "AI/ML Infrastructure", score: 2, notes: "Cloud available, no ML pipeline" }, { item: "Tool Ecosystem", score: 2, notes: "Fragmented tooling" }, { item: "Integration Architecture", score: 1, notes: "Point-to-point integrations" }, { item: "Security & Compliance", score: 3, notes: "SOC2 compliant" }],
  "Talent Readiness": [{ item: "AI Literacy", score: 4, notes: "78% completed AI training" }, { item: "Digital Skills Depth", score: 5, notes: "Strong technical bench" }, { item: "Learning Culture", score: 4, notes: "Active L&D programs" }, { item: "Change Appetite", score: 4, notes: "82% excited about AI" }],
  "Leadership Alignment": [{ item: "Executive Sponsorship", score: 4, notes: "CTO is active champion" }, { item: "Strategic Clarity", score: 3, notes: "Strategy drafted, not socialized" }, { item: "Investment Commitment", score: 4, notes: "$2.4M approved" }, { item: "Governance Readiness", score: 3, notes: "AI ethics board forming" }],
};


export const CAREER_FRAMEWORKS: { name: string; industry: string; levels: { code: string; title: string; track: string; span: string; focus: string; comp_range: string }[] }[] = [
  { name: "Technology Career Framework", industry: "Technology", levels: [
    {code:"L1",title:"Associate / Junior",track:"IC",span:"—",focus:"Learning, executing defined tasks",comp_range:"$55K-$85K"},
    {code:"L2",title:"Analyst / Engineer",track:"IC",span:"—",focus:"Independent contributor, owns deliverables",comp_range:"$80K-$120K"},
    {code:"L3",title:"Senior Engineer / Sr. Analyst",track:"IC",span:"—",focus:"Drives projects, mentors juniors, technical depth",comp_range:"$110K-$160K"},
    {code:"L4",title:"Staff / Lead",track:"IC / Manager",span:"5-8 for managers",focus:"Cross-team influence, architecture decisions",comp_range:"$150K-$220K"},
    {code:"L5",title:"Principal / Sr. Director",track:"IC / Manager",span:"15-30",focus:"Organization-wide strategy, domain ownership",comp_range:"$200K-$300K"},
    {code:"L6",title:"Distinguished / VP",track:"IC / Executive",span:"50-150",focus:"Industry-shaping, company-wide technical vision",comp_range:"$280K-$450K+"},
    {code:"L7",title:"Fellow / SVP / C-Level",track:"Executive",span:"150+",focus:"Enterprise strategy, board engagement",comp_range:"$400K+"},
  ]},
  { name: "Financial Services Framework", industry: "Financial Services", levels: [
    {code:"Analyst",title:"Analyst",track:"IC",span:"—",focus:"Model building, research, supporting deals",comp_range:"$90K-$130K"},
    {code:"Associate",title:"Associate",track:"IC",span:"—",focus:"Deal execution, client interaction, team leadership",comp_range:"$130K-$200K"},
    {code:"VP",title:"Vice President",track:"IC / Manager",span:"3-6",focus:"Deal origination, client management, P&L ownership",comp_range:"$200K-$350K"},
    {code:"Director",title:"Director / Executive Director",track:"Manager",span:"8-15",focus:"Business line management, revenue generation",comp_range:"$300K-$500K"},
    {code:"MD",title:"Managing Director",track:"Executive",span:"20-50",focus:"Strategic client relationships, firm leadership",comp_range:"$500K-$2M+"},
    {code:"Partner",title:"Partner / Senior MD",track:"Executive",span:"50+",focus:"Firm strategy, major client ownership, talent development",comp_range:"$1M+"},
  ]},
  { name: "Healthcare Framework", industry: "Healthcare", levels: [
    {code:"CNA",title:"Clinical Support / CNA",track:"Clinical",span:"—",focus:"Direct patient care support",comp_range:"$32K-$45K"},
    {code:"RN",title:"Registered Nurse / Therapist",track:"Clinical",span:"—",focus:"Patient assessment, care delivery, documentation",comp_range:"$60K-$95K"},
    {code:"Senior",title:"Senior Clinician / Charge Nurse",track:"Clinical",span:"4-8",focus:"Shift leadership, protocol adherence, mentoring",comp_range:"$80K-$115K"},
    {code:"Manager",title:"Nurse Manager / Dept Manager",track:"Management",span:"15-40",focus:"Unit operations, staff scheduling, quality metrics",comp_range:"$95K-$140K"},
    {code:"Director",title:"Director of Nursing / Clinical Director",track:"Management",span:"50-150",focus:"Service line strategy, budget ownership",comp_range:"$130K-$185K"},
    {code:"VP",title:"VP / CNO / CMO",track:"Executive",span:"200+",focus:"Enterprise clinical strategy, board engagement",comp_range:"$200K-$400K+"},
  ]},
  { name: "Manufacturing Framework", industry: "Manufacturing", levels: [
    {code:"L1",title:"Operator / Technician I",track:"Production",span:"—",focus:"Equipment operation, basic maintenance",comp_range:"$35K-$50K"},
    {code:"L2",title:"Senior Technician / Specialist",track:"Production / IC",span:"—",focus:"Advanced troubleshooting, quality control",comp_range:"$48K-$68K"},
    {code:"L3",title:"Lead / Supervisor",track:"Frontline Mgmt",span:"8-15",focus:"Shift supervision, safety, output targets",comp_range:"$60K-$85K"},
    {code:"L4",title:"Manager / Sr. Engineer",track:"IC / Manager",span:"15-40",focus:"Department management, process improvement",comp_range:"$85K-$125K"},
    {code:"L5",title:"Director / Plant Manager",track:"Manager",span:"50-200",focus:"Plant P&L, capital planning, cross-functional leadership",comp_range:"$120K-$180K"},
    {code:"L6",title:"VP Operations / SVP",track:"Executive",span:"500+",focus:"Multi-plant strategy, supply chain optimization",comp_range:"$180K-$350K+"},
  ]},
  { name: "Professional Services Framework", industry: "Professional Services", levels: [
    {code:"Analyst",title:"Analyst / Consultant I",track:"IC",span:"—",focus:"Research, analysis, deliverable production",comp_range:"$70K-$100K"},
    {code:"Consultant",title:"Consultant / Senior Consultant",track:"IC",span:"—",focus:"Workstream ownership, client delivery, methodology",comp_range:"$100K-$150K"},
    {code:"Manager",title:"Manager / Engagement Manager",track:"Manager",span:"3-8",focus:"Project P&L, team leadership, client management",comp_range:"$140K-$200K"},
    {code:"Sr Manager",title:"Senior Manager / Associate Director",track:"Manager",span:"10-20",focus:"Multi-project oversight, practice development",comp_range:"$180K-$260K"},
    {code:"Director",title:"Director / Principal",track:"Senior Mgmt",span:"20-50",focus:"Client development, methodology innovation, thought leadership",comp_range:"$250K-$400K"},
    {code:"Partner",title:"Partner / Managing Director",track:"Executive",span:"50+",focus:"Revenue ownership, firm strategy, major pursuits",comp_range:"$400K-$2M+"},
  ]},
];

/* --- Span & Layer Benchmarks --- */
export const SPAN_BENCHMARKS: { industry: string; icon: string; avgSpan: number; optimalSpan: string; avgLayers: number; optimalLayers: string; mgrRatio: string; notes: string; byFunction: { func: string; span: string; layers: string; rationale: string }[] }[] = [
  { industry: "Technology", icon: "💻", avgSpan: 8.5, optimalSpan: "7-12", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:8", notes: "Flat structures with wide spans. Platform orgs can go wider (10-15). Deep IC tracks reduce management layers.", byFunction: [
    {func:"Engineering",span:"8-15",layers:"4-5",rationale:"Autonomous teams, code review replaces supervision"},
    {func:"Product",span:"6-8",layers:"4-5",rationale:"Cross-functional coordination needs"},
    {func:"Sales",span:"8-12",layers:"4-5",rationale:"Individual contributor heavy, CRM-driven"},
    {func:"G&A (HR, Finance, Legal)",span:"5-7",layers:"4-5",rationale:"Process-heavy, compliance requirements"},
  ]},
  { industry: "Financial Services", icon: "🏦", avgSpan: 5.5, optimalSpan: "5-8", avgLayers: 7, optimalLayers: "5-7", mgrRatio: "1:6", notes: "Narrower spans driven by regulatory oversight and risk control. Three lines of defense adds layers. Front office wider than back office.", byFunction: [
    {func:"Front Office (Trading, Banking)",span:"4-6",layers:"5-6",rationale:"High-value decisions, close supervision"},
    {func:"Risk & Compliance",span:"5-7",layers:"6-7",rationale:"Regulatory mandate, audit trail"},
    {func:"Operations / GBS",span:"8-12",layers:"4-5",rationale:"Transactional, standardized processes"},
    {func:"Technology",span:"6-8",layers:"5-6",rationale:"Matrix reporting, project-based"},
  ]},
  { industry: "Healthcare", icon: "🏥", avgSpan: 6.0, optimalSpan: "5-8", avgLayers: 6, optimalLayers: "5-7", mgrRatio: "1:7", notes: "Clinical departments have narrower spans (patient safety). Administrative functions can go wider. Physician hierarchy is distinct from management hierarchy.", byFunction: [
    {func:"Nursing / Clinical",span:"5-8",layers:"5-6",rationale:"Patient safety, shift coverage, licensure oversight"},
    {func:"Administration",span:"6-10",layers:"4-5",rationale:"Process standardization possible"},
    {func:"Revenue Cycle",span:"8-12",layers:"4-5",rationale:"High-volume transactional work"},
    {func:"Health IT",span:"6-8",layers:"4-5",rationale:"Project-based, vendor management"},
  ]},
  { industry: "Manufacturing", icon: "🏭", avgSpan: 7.0, optimalSpan: "6-10", avgLayers: 6, optimalLayers: "5-7", mgrRatio: "1:8", notes: "Plant floor has wider spans (shift supervisors manage 10-20). Corporate functions narrower. Safety requirements add oversight layers.", byFunction: [
    {func:"Production / Plant",span:"10-20",layers:"4-5",rationale:"Standardized operations, shift-based"},
    {func:"Quality / EHS",span:"6-8",layers:"5-6",rationale:"Compliance and safety oversight"},
    {func:"Engineering / R&D",span:"5-7",layers:"5-6",rationale:"Complex projects, technical mentorship"},
    {func:"Supply Chain",span:"7-10",layers:"5-6",rationale:"Process-driven, KPI-managed"},
  ]},
  { industry: "Retail", icon: "🛍️", avgSpan: 10.0, optimalSpan: "8-15", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:10", notes: "Very wide spans at store level. Corporate narrower. Seasonal workforce creates variable spans. Digital/e-commerce teams look more like tech.", byFunction: [
    {func:"Store Operations",span:"12-20",layers:"3-4",rationale:"Standardized tasks, POS-driven"},
    {func:"Merchandising",span:"6-8",layers:"5-6",rationale:"Category expertise, vendor relationships"},
    {func:"E-Commerce / Digital",span:"8-10",layers:"4-5",rationale:"Tech-influenced, agile teams"},
    {func:"Corporate (HR, Finance)",span:"5-7",layers:"5-6",rationale:"Standard corporate functions"},
  ]},
  { industry: "Professional Services", icon: "💼", avgSpan: 5.0, optimalSpan: "4-7", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:5", notes: "Leverage model (Partner → Manager → Analyst) creates natural narrow spans. Utilization targets constrain management bandwidth. Practice areas are the primary org dimension.", byFunction: [
    {func:"Consulting / Delivery",span:"4-6",layers:"4-5",rationale:"Leverage model, mentorship-intensive"},
    {func:"Business Development",span:"3-5",layers:"4-5",rationale:"Relationship-driven, partner-led"},
    {func:"Back Office",span:"6-10",layers:"3-4",rationale:"Shared services, standardized"},
    {func:"Research / Knowledge",span:"5-8",layers:"3-4",rationale:"Specialist expertise"},
  ]},
];


export const SKILLS_TAXONOMY: { domain: string; color: string; icon: string; skills: { name: string; profLevels: string[]; industries?: string[] }[] }[] = [
  { domain: "Technical & Engineering", color: "#D4860A", icon: "⚙️", skills: [
    {name:"Software Engineering",profLevels:["Can read code","Can write features","Can architect systems","Can lead platform design"]},
    {name:"Data Engineering",profLevels:["SQL basics","Pipeline building","Data architecture","Enterprise data strategy"]},
    {name:"Cloud Platforms (AWS/Azure/GCP)",profLevels:["Basic deployment","Multi-service usage","Architecture design","Enterprise cloud strategy"]},
    {name:"DevOps & CI/CD",profLevels:["Understands pipelines","Builds automations","Designs infrastructure","Platform engineering lead"]},
    {name:"Cybersecurity",profLevels:["Security awareness","Vulnerability assessment","Security architecture","CISO-level strategy"]},
    {name:"Machine Learning / AI",profLevels:["Understands concepts","Builds models","Production ML systems","AI strategy & governance"]},
    {name:"ERP Systems (SAP/Oracle)",profLevels:["End-user","Configuration","Customization","Architecture & integration"],industries:["Manufacturing","Financial Services"]},
    {name:"HRIS / Workday",profLevels:["End-user","Report building","Configuration","Architecture"],industries:["General"]},
  ]},
  { domain: "Leadership & Management", color: "#8B5CF6", icon: "👔", skills: [
    {name:"People Leadership",profLevels:["Peer influence","Team lead (3-5)","Director (15-50)","Executive (100+)"]},
    {name:"Strategic Thinking",profLevels:["Understands strategy","Contributes to planning","Shapes function strategy","Sets enterprise direction"]},
    {name:"Change Management",profLevels:["Adapts to change","Supports change","Leads change programs","Transforms organizations"]},
    {name:"Stakeholder Management",profLevels:["Manages upward","Cross-functional influence","Executive communication","Board-level engagement"]},
    {name:"Decision Making",profLevels:["Follows frameworks","Data-driven decisions","Complex tradeoff analysis","Ambiguity navigation"]},
    {name:"Coaching & Development",profLevels:["Provides feedback","Mentors individuals","Builds team capability","Creates learning culture"]},
  ]},
  { domain: "Analytical & Quantitative", color: "#10B981", icon: "📊", skills: [
    {name:"Data Analysis",profLevels:["Basic reporting","Trend analysis","Advanced analytics","Predictive modeling"]},
    {name:"Financial Modeling",profLevels:["Reads financials","Builds models","Complex scenarios","Enterprise valuation"],industries:["Financial Services","General"]},
    {name:"Statistical Analysis",profLevels:["Descriptive stats","Hypothesis testing","Regression/ML","Experimental design"]},
    {name:"Business Intelligence",profLevels:["Consumes dashboards","Builds reports","Designs BI architecture","Enterprise analytics strategy"]},
    {name:"Process Analysis",profLevels:["Documents processes","Identifies improvements","Lean/Six Sigma","Process transformation"]},
  ]},
  { domain: "Communication & Influence", color: "#F97316", icon: "💬", skills: [
    {name:"Written Communication",profLevels:["Clear emails","Reports & proposals","Executive communications","Published thought leadership"]},
    {name:"Presentation Skills",profLevels:["Team updates","Client presentations","Executive briefings","Keynote / board-level"]},
    {name:"Negotiation",profLevels:["Basic bargaining","Contract negotiation","Complex multi-party","Strategic deal-making"]},
    {name:"Cross-Cultural Communication",profLevels:["Awareness","Working across cultures","Leading global teams","Global strategy development"]},
  ]},
  { domain: "Digital & AI Fluency", color: "#E8C547", icon: "🤖", skills: [
    {name:"AI Tool Usage",profLevels:["Basic prompting","Workflow integration","Custom automations","AI strategy & governance"]},
    {name:"Prompt Engineering",profLevels:["Simple queries","Complex chain-of-thought","System design","Enterprise AI patterns"]},
    {name:"No-Code / Low-Code",profLevels:["Template usage","Custom workflows","Integration design","Platform architecture"]},
    {name:"Data Literacy",profLevels:["Reads charts","Interprets data","Designs metrics","Data-driven culture leadership"]},
    {name:"Process Automation",profLevels:["Identifies opportunities","Builds simple automations","RPA/workflow design","Enterprise automation strategy"]},
  ]},
  { domain: "Domain-Specific", color: "#B8602A", icon: "🏢", skills: [
    {name:"Regulatory & Compliance",profLevels:["Follows regulations","Monitors changes","Designs compliance programs","Enterprise risk governance"],industries:["Financial Services","Healthcare"]},
    {name:"Clinical Knowledge",profLevels:["Basic terminology","Clinical workflows","Evidence-based practice","Clinical governance"],industries:["Healthcare"]},
    {name:"Supply Chain Management",profLevels:["Understands flow","Demand/supply planning","Network optimization","Global supply strategy"],industries:["Manufacturing","Retail"]},
    {name:"Investment Analysis",profLevels:["Financial literacy","Fundamental analysis","Portfolio construction","Investment committee-level"],industries:["Financial Services"]},
    {name:"HR / People Operations",profLevels:["HR admin","HRBP support","HR strategy","CHRO-level"],industries:["General"]},
    {name:"Legal & Contract Management",profLevels:["Contract review","Drafting & negotiation","Legal strategy","General counsel-level"],industries:["Legal","General"]},
  ]},
];

export const MODULE_QUICK_PROMPTS: Record<string, { label: string; prompt: string; needsInput?: boolean; inputLabel?: string; inputPlaceholder?: string }[]> = {
  snapshot: [
    { label: "Executive Summary", prompt: "Write a 3-paragraph executive summary of our workforce. Include headcount, largest functions, AI readiness score, and top risks." },
    { label: "Risk Assessment", prompt: "Identify the top 5 workforce risks based on our structure, span of control, and AI readiness data." },
    { label: "Benchmark Compare", prompt: "How does our org structure compare to industry benchmarks for a company of this size?", needsInput: true, inputLabel: "Industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
  ],
  snapshot_employee: [
    { label: "Explain My Profile", prompt: "Based on my role, explain my position in the organization, my typical career trajectory, and what skills I should develop." },
    { label: "How Will AI Affect Me?", prompt: "Explain specifically how AI transformation will change my day-to-day work. What tasks will change? What stays the same?" },
    { label: "My Development Plan", prompt: "Create a personalized 6-month development plan for me to prepare for the AI transformation." },
  ],
  snapshot_job: [
    { label: "Role Analysis", prompt: "Analyze this role in depth — what are the key value-drivers, what's at risk from AI, and how should this role evolve?" },
    { label: "Comparable Roles", prompt: "What are the comparable roles in other organizations? How does this role's scope and level compare to industry norms?" },
    { label: "Succession Risk", prompt: "What is the succession risk for this role? How hard is it to replace, and what skills are most critical to retain?" },
  ],
  jobs: [
    { label: "Role Redundancy Check", prompt: "Analyze our job catalog for potential redundancies — roles with overlapping descriptions or responsibilities." },
    { label: "Career Path Gaps", prompt: "Identify gaps in our career architecture — levels or tracks that are missing or underpopulated." },
    { label: "Restructure Proposal", prompt: "Propose a restructured job architecture that reduces role fragmentation while maintaining career progression." },
  ],
  scan: [
    { label: "Top 5 Quick Wins", prompt: "Identify the 5 tasks that would deliver the highest ROI if automated immediately. Explain why for each." },
    { label: "Automation Roadmap", prompt: "Create a phased automation roadmap: what to automate in Month 1-3, 4-6, and 7-12." },
    { label: "Skills Gap Plan", prompt: "Based on our AI impact scores, what new skills does our workforce need? Create a training priority list." },
    { label: "Phase 1 Summary", prompt: "Summarize everything discovered in Phase 1: workforce composition, job architecture findings, and AI opportunity assessment. What should we prioritize in Phase 2 Design?" },
  ],
  design: [
    { label: "Auto-Generate Tasks", prompt: "Generate a complete task breakdown for the selected role with AI impact scores, time allocations, and skill requirements." },
    { label: "Validate My Design", prompt: "Review my current task breakdown. Flag any issues: time not summing to 100%, misclassified AI impact, unrealistic estimates." },
    { label: "Benchmark This Role", prompt: "How does this role's task breakdown compare to industry norms?", needsInput: true, inputLabel: "Industry/Company", inputPlaceholder: "e.g. Big 4 Consulting, Fortune 500 Finance..." },
  ],
  simulate: [
    { label: "Scenario Brief", prompt: "Write an executive summary of our current scenario results. Include released hours, FTE equivalents, cost savings, and break-even timeline." },
    { label: "Adoption Strategy", prompt: "Based on our scenario results, what adoption rate do you recommend and why? What are the risks of going higher or lower?" },
    { label: "Investment Sizing", prompt: "Based on our org size and the roles in scope, what per-role investment amount do you recommend? Break down the investment into tooling, training, change management, and productivity loss.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
    { label: "Custom Scenario", prompt: "Model a scenario where we only transform specific functions.", needsInput: true, inputLabel: "Functions to transform", inputPlaceholder: "e.g. Finance and HR only..." },
  ],
  build: [
    { label: "Restructure Plan", prompt: "Analyze our current org structure and generate specific restructuring recommendations with expected savings." },
    { label: "Optimal Spans", prompt: "Calculate the optimal span of control for each department based on their function type, complexity, and industry benchmarks." },
    { label: "De-Layering Plan", prompt: "Identify which departments should be de-layered, how many layers to remove, and the expected impact on decision speed and cost." },
    { label: "Industry Benchmark", prompt: "Compare our org structure to industry best practices.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, SaaS, Manufacturing..." },
  ],
  plan: [
    { label: "Auto-Build Roadmap", prompt: "Generate a complete change management roadmap with initiatives, owners, waves, dependencies, and risks based on our work design decisions." },
    { label: "Risk Mitigation", prompt: "For each high-risk initiative, provide 3 specific mitigation strategies with owners and timelines." },
    { label: "Stakeholder Map", prompt: "Create a stakeholder analysis: who needs to champion this transformation, who might resist, and how to bring them along.", needsInput: true, inputLabel: "Key stakeholders", inputPlaceholder: "e.g. CFO, VP Engineering, Union rep..." },
    { label: "Full Transformation Report", prompt: "Write a complete executive transformation report covering Phase 1 (Discovery findings), Phase 2 (Design decisions and scenario results), and Phase 3 (Change plan and operating model). Format as a board-ready narrative." },
  ],
  opmodel: [
    { label: "Recommend Architecture", prompt: "Based on our function and industry, recommend the best organizational archetype, operating model, and governance combination with reasoning." },
    { label: "Generate Company Model", prompt: "Generate the operating model for a specific company as a reference template.", needsInput: true, inputLabel: "Company name", inputPlaceholder: "e.g. Chipotle, Stripe, Tesla..." },
    { label: "Transition Plan", prompt: "If we move from our current archetype to the recommended one, what are the key transition steps, risks, and timeline?" },
  ],
};

export const MODULE_AI_PROMPTS: Record<string, string> = {
  snapshot: "You are analyzing a Workforce Snapshot. Help the user understand their workforce composition, org structure, headcount distribution, span of control, and AI readiness scores.",
  jobs: "You are analyzing Job Architecture. Help the user understand their job catalog, career levels, role clusters, and org hierarchy.",
  scan: "You are analyzing an AI Opportunity Scan. Help the user understand which tasks have the highest AI impact, where quick wins are, and what skills gaps exist.",
  design: "You are in the Work Design Lab. Help the user deconstruct jobs into tasks, decide which tasks to automate/augment/redesign/retain, and plan redeployment.",
  simulate: "You are in the Impact Simulator. Help the user understand scenario outcomes — released hours, FTE equivalents, ROI, break-even timelines.",
  build: "You are in the Org Design Studio. Help the user model future org structures — analyze span of control, layers, cost implications, and role migration.",
  plan: "You are in the Change Planner. Help the user sequence transformation initiatives, assess risks, build a roadmap, and assign ownership.",
  opmodel: "You are in the Operating Model Lab. Help the user choose between organizational archetypes and operating models. Explain tradeoffs.",
};
