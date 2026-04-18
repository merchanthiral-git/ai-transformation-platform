/**
 * chesapeake.ts
 *
 * Demo dataset modelled after a mid-large upstream oil & gas operator
 * (Chesapeake Energy profile). Used to showcase the HR Digital Playground
 * platform with realistic-looking data across every analytics module.
 *
 * Includes:
 *   - 200 workforce rows across 9 functions and 47 unique roles
 *   - 47-role job_catalog with career tracks and levels
 *   - 43-skill skills_library across 4 categories
 *   - 4 pre-computed transformation scenario objects
 *   - Org-level readiness assessments
 *
 * All data is generated with a seeded pseudo-random number generator so
 * output is deterministic across runs.
 *
 * @module chesapeakeDemo
 */

// ---------------------------------------------------------------------------
// Seeded PRNG (xorshift32) — deterministic, no external deps
// ---------------------------------------------------------------------------
function makePrng(seed: number) {
  let s = seed >>> 0 || 1;
  return {
    next(): number {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return ((s >>> 0) / 0xffffffff);
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
    float(min: number, max: number, dp = 1): number {
      const v = min + this.next() * (max - min);
      return parseFloat(v.toFixed(dp));
    },
  };
}
const rng = makePrng(0xC4E5A_B1E);

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const FUNCTIONS = [
  "Engineering", "Operations", "Finance", "HR",
  "IT", "Marketing", "Legal", "Supply Chain", "Executive Office",
] as const;
type FunctionName = typeof FUNCTIONS[number];

/** 47 unique roles spread across 9 functions */
const ROLE_CATALOG: Array<{
  id: string; title: string; function: FunctionName;
  jobFamily: string; subFamily: string;
  careerTrack: "E" | "M" | "P" | "S" | "T";
  minLevel: number; maxLevel: number;
  medianSalary: number;
}> = [
  // Engineering (9)
  { id: "R001", title: "Reservoir Engineer", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Reservoir", careerTrack: "E", minLevel: 2, maxLevel: 6, medianSalary: 138000 },
  { id: "R002", title: "Drilling Engineer", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Drilling", careerTrack: "E", minLevel: 2, maxLevel: 6, medianSalary: 142000 },
  { id: "R003", title: "Production Engineer", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Production", careerTrack: "E", minLevel: 2, maxLevel: 5, medianSalary: 130000 },
  { id: "R004", title: "Completions Engineer", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Completions", careerTrack: "E", minLevel: 2, maxLevel: 5, medianSalary: 135000 },
  { id: "R005", title: "Geologist", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Geology", careerTrack: "S", minLevel: 2, maxLevel: 5, medianSalary: 128000 },
  { id: "R006", title: "Geophysicist", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Geophysics", careerTrack: "S", minLevel: 2, maxLevel: 5, medianSalary: 132000 },
  { id: "R007", title: "Facilities Engineer", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Facilities", careerTrack: "E", minLevel: 2, maxLevel: 5, medianSalary: 126000 },
  { id: "R008", title: "Engineering Manager", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Management", careerTrack: "M", minLevel: 4, maxLevel: 6, medianSalary: 165000 },
  { id: "R009", title: "VP Engineering", function: "Engineering", jobFamily: "Geoscience & Engineering", subFamily: "Executive", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 245000 },
  // Operations (7)
  { id: "R010", title: "Field Operations Supervisor", function: "Operations", jobFamily: "Field Operations", subFamily: "Supervision", careerTrack: "M", minLevel: 3, maxLevel: 5, medianSalary: 115000 },
  { id: "R011", title: "Wellsite Operator", function: "Operations", jobFamily: "Field Operations", subFamily: "Wellsite", careerTrack: "T", minLevel: 1, maxLevel: 4, medianSalary: 82000 },
  { id: "R012", title: "Production Technician", function: "Operations", jobFamily: "Field Operations", subFamily: "Production", careerTrack: "T", minLevel: 1, maxLevel: 4, medianSalary: 78000 },
  { id: "R013", title: "SCADA Technician", function: "Operations", jobFamily: "Field Operations", subFamily: "Instrumentation", careerTrack: "T", minLevel: 2, maxLevel: 4, medianSalary: 88000 },
  { id: "R014", title: "HSE Specialist", function: "Operations", jobFamily: "Field Operations", subFamily: "HSE", careerTrack: "P", minLevel: 2, maxLevel: 5, medianSalary: 102000 },
  { id: "R015", title: "Dispatch Coordinator", function: "Operations", jobFamily: "Field Operations", subFamily: "Logistics", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 75000 },
  { id: "R016", title: "Director of Operations", function: "Operations", jobFamily: "Field Operations", subFamily: "Executive", careerTrack: "M", minLevel: 5, maxLevel: 6, medianSalary: 210000 },
  // Finance (6)
  { id: "R017", title: "Financial Analyst", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "FP&A", careerTrack: "P", minLevel: 2, maxLevel: 5, medianSalary: 98000 },
  { id: "R018", title: "Senior Financial Analyst", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "FP&A", careerTrack: "P", minLevel: 4, maxLevel: 5, medianSalary: 120000 },
  { id: "R019", title: "Accounting Manager", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "Accounting", careerTrack: "M", minLevel: 4, maxLevel: 5, medianSalary: 130000 },
  { id: "R020", title: "Treasury Analyst", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "Treasury", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 94000 },
  { id: "R021", title: "Tax Specialist", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "Tax", careerTrack: "P", minLevel: 3, maxLevel: 5, medianSalary: 108000 },
  { id: "R022", title: "CFO", function: "Finance", jobFamily: "Finance & Accounting", subFamily: "Executive", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 320000 },
  // HR (4)
  { id: "R023", title: "HR Business Partner", function: "HR", jobFamily: "Human Resources", subFamily: "HRBP", careerTrack: "P", minLevel: 3, maxLevel: 5, medianSalary: 105000 },
  { id: "R024", title: "Talent Acquisition Specialist", function: "HR", jobFamily: "Human Resources", subFamily: "Recruiting", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 88000 },
  { id: "R025", title: "Learning & Development Specialist", function: "HR", jobFamily: "Human Resources", subFamily: "L&D", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 85000 },
  { id: "R026", title: "CHRO", function: "HR", jobFamily: "Human Resources", subFamily: "Executive", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 290000 },
  // IT (6)
  { id: "R027", title: "Data Engineer", function: "IT", jobFamily: "Information Technology", subFamily: "Data Platform", careerTrack: "E", minLevel: 2, maxLevel: 5, medianSalary: 125000 },
  { id: "R028", title: "Software Engineer", function: "IT", jobFamily: "Information Technology", subFamily: "Application Dev", careerTrack: "E", minLevel: 2, maxLevel: 5, medianSalary: 128000 },
  { id: "R029", title: "Cybersecurity Analyst", function: "IT", jobFamily: "Information Technology", subFamily: "Security", careerTrack: "P", minLevel: 2, maxLevel: 5, medianSalary: 115000 },
  { id: "R030", title: "IT Project Manager", function: "IT", jobFamily: "Information Technology", subFamily: "PMO", careerTrack: "M", minLevel: 3, maxLevel: 5, medianSalary: 118000 },
  { id: "R031", title: "Systems Administrator", function: "IT", jobFamily: "Information Technology", subFamily: "Infrastructure", careerTrack: "T", minLevel: 2, maxLevel: 4, medianSalary: 90000 },
  { id: "R032", title: "CIO", function: "IT", jobFamily: "Information Technology", subFamily: "Executive", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 295000 },
  // Marketing (3)
  { id: "R033", title: "Investor Relations Analyst", function: "Marketing", jobFamily: "Stakeholder Relations", subFamily: "IR", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 95000 },
  { id: "R034", title: "Communications Specialist", function: "Marketing", jobFamily: "Stakeholder Relations", subFamily: "Comms", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 82000 },
  { id: "R035", title: "VP Investor Relations", function: "Marketing", jobFamily: "Stakeholder Relations", subFamily: "Executive", careerTrack: "M", minLevel: 5, maxLevel: 6, medianSalary: 230000 },
  // Legal (4)
  { id: "R036", title: "Land Attorney", function: "Legal", jobFamily: "Legal & Land", subFamily: "Land", careerTrack: "S", minLevel: 3, maxLevel: 6, medianSalary: 148000 },
  { id: "R037", title: "Environmental Counsel", function: "Legal", jobFamily: "Legal & Land", subFamily: "Environmental", careerTrack: "S", minLevel: 3, maxLevel: 6, medianSalary: 155000 },
  { id: "R038", title: "Contracts Specialist", function: "Legal", jobFamily: "Legal & Land", subFamily: "Contracts", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 92000 },
  { id: "R039", title: "General Counsel", function: "Legal", jobFamily: "Legal & Land", subFamily: "Executive", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 310000 },
  // Supply Chain (4)
  { id: "R040", title: "Supply Chain Analyst", function: "Supply Chain", jobFamily: "Supply Chain", subFamily: "Analytics", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 88000 },
  { id: "R041", title: "Procurement Specialist", function: "Supply Chain", jobFamily: "Supply Chain", subFamily: "Procurement", careerTrack: "P", minLevel: 2, maxLevel: 4, medianSalary: 90000 },
  { id: "R042", title: "Logistics Coordinator", function: "Supply Chain", jobFamily: "Supply Chain", subFamily: "Logistics", careerTrack: "P", minLevel: 2, maxLevel: 3, medianSalary: 72000 },
  { id: "R043", title: "VP Supply Chain", function: "Supply Chain", jobFamily: "Supply Chain", subFamily: "Executive", careerTrack: "M", minLevel: 5, maxLevel: 6, medianSalary: 215000 },
  // Executive Office (4)
  { id: "R044", title: "CEO", function: "Executive Office", jobFamily: "Executive Leadership", subFamily: "C-Suite", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 1200000 },
  { id: "R045", title: "COO", function: "Executive Office", jobFamily: "Executive Leadership", subFamily: "C-Suite", careerTrack: "M", minLevel: 6, maxLevel: 6, medianSalary: 750000 },
  { id: "R046", title: "Chief of Staff", function: "Executive Office", jobFamily: "Executive Leadership", subFamily: "C-Suite Support", careerTrack: "P", minLevel: 5, maxLevel: 6, medianSalary: 195000 },
  { id: "R047", title: "Executive Assistant", function: "Executive Office", jobFamily: "Executive Leadership", subFamily: "Admin Support", careerTrack: "P", minLevel: 2, maxLevel: 3, medianSalary: 72000 },
];

// ---------------------------------------------------------------------------
// Skills Library — 43 skills across 4 categories
// ---------------------------------------------------------------------------
export const skills_library = {
  technical: [
    { id: "SK01", name: "Reservoir Simulation", category: "technical" },
    { id: "SK02", name: "Seismic Interpretation", category: "technical" },
    { id: "SK03", name: "Drilling Program Design", category: "technical" },
    { id: "SK04", name: "Production Optimisation", category: "technical" },
    { id: "SK05", name: "Hydraulic Fracturing Design", category: "technical" },
    { id: "SK06", name: "SCADA / DCS Operations", category: "technical" },
    { id: "SK07", name: "Well Integrity Management", category: "technical" },
    { id: "SK08", name: "HSE Management Systems", category: "technical" },
    { id: "SK09", name: "Python / Data Scripting", category: "technical" },
    { id: "SK10", name: "SQL & Database Querying", category: "technical" },
    { id: "SK11", name: "Power BI / Tableau", category: "technical" },
    { id: "SK12", name: "Cloud Platforms (Azure/AWS)", category: "technical" },
    { id: "SK13", name: "Machine Learning – Applied", category: "technical" },
  ],
  functional: [
    { id: "SK14", name: "Financial Modelling", category: "functional" },
    { id: "SK15", name: "Budgeting & Forecasting", category: "functional" },
    { id: "SK16", name: "Regulatory Compliance – E&P", category: "functional" },
    { id: "SK17", name: "Land & Lease Administration", category: "functional" },
    { id: "SK18", name: "Contracts & Procurement Law", category: "functional" },
    { id: "SK19", name: "Environmental Permitting", category: "functional" },
    { id: "SK20", name: "Supply Chain Optimisation", category: "functional" },
    { id: "SK21", name: "Vendor Management", category: "functional" },
    { id: "SK22", name: "Investor Relations", category: "functional" },
    { id: "SK23", name: "Talent Acquisition", category: "functional" },
    { id: "SK24", name: "Compensation & Benefits Design", category: "functional" },
    { id: "SK25", name: "Workforce Analytics", category: "functional" },
    { id: "SK26", name: "Project Management (PMI/APM)", category: "functional" },
    { id: "SK27", name: "Agile / Scrum", category: "functional" },
  ],
  leadership: [
    { id: "SK28", name: "Executive Presence", category: "leadership" },
    { id: "SK29", name: "Strategic Planning", category: "leadership" },
    { id: "SK30", name: "Cross-Functional Influence", category: "leadership" },
    { id: "SK31", name: "Team Development & Coaching", category: "leadership" },
    { id: "SK32", name: "Change Management", category: "leadership" },
    { id: "SK33", name: "Crisis & Incident Management", category: "leadership" },
    { id: "SK34", name: "Stakeholder Communication", category: "leadership" },
    { id: "SK35", name: "Board & Investor Engagement", category: "leadership" },
    { id: "SK36", name: "Diversity, Equity & Inclusion", category: "leadership" },
  ],
  adaptive: [
    { id: "SK37", name: "Digital Literacy", category: "adaptive" },
    { id: "SK38", name: "AI Tool Adoption", category: "adaptive" },
    { id: "SK39", name: "Data-Driven Decision Making", category: "adaptive" },
    { id: "SK40", name: "Continuous Learning Mindset", category: "adaptive" },
    { id: "SK41", name: "Ambiguity Tolerance", category: "adaptive" },
    { id: "SK42", name: "Cross-Cultural Collaboration", category: "adaptive" },
    { id: "SK43", name: "Systems Thinking", category: "adaptive" },
  ],
};

// ---------------------------------------------------------------------------
// First & last name pools for realistic-looking names
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "James", "Sarah", "Michael", "Jennifer", "Robert", "Lisa", "David", "Karen",
  "William", "Emily", "Richard", "Amanda", "Joseph", "Melissa", "Thomas", "Deborah",
  "Christopher", "Jessica", "Daniel", "Stephanie", "Mark", "Rebecca", "Donald",
  "Sharon", "Steven", "Laura", "Paul", "Cynthia", "Andrew", "Kathleen",
  "Joshua", "Amy", "Ryan", "Angela", "Brandon", "Helen", "Jason", "Diane",
  "Kevin", "Julie", "Gary", "Joyce", "Eric", "Martha", "Nicholas", "Victoria",
  "Jonathan", "Rachel", "Larry", "Samantha",
];
const LAST_NAMES = [
  "Anderson", "Williams", "Thompson", "Martinez", "Robinson", "Clark", "Rodriguez",
  "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright",
  "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson",
  "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell",
  "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris",
  "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera",
  "Cooper", "Richardson", "Cox", "Howard",
];

const LOCATIONS = [
  "Oklahoma City, OK", "Houston, TX", "Midland, TX", "Denver, CO",
  "Dallas, TX", "Tulsa, OK", "Appalachia, WV", "Remote",
];

// ---------------------------------------------------------------------------
// Generate 200 workforce rows
// ---------------------------------------------------------------------------

/** A single workforce record */
export interface WorkforceRow {
  id: string;
  name: string;
  title: string;
  function: FunctionName;
  jobFamily: string;
  subFamily: string;
  careerTrack: string;
  careerLevel: number;
  managerId: string | null;
  salary: number;
  location: string;
  tenure: number;
  aiReadinessScore: number;
}

function generateWorkforce(): WorkforceRow[] {
  const rows: WorkforceRow[] = [];
  const usedNames = new Set<string>();

  // Build a realistic management tree:
  // Level 6 exec → level 5 directors → level 4 mgrs → individual contributors
  // Seed the tree with one exec per function and ensure coverage.

  // First pass: one exec (level 6) per function
  const funcExecs: Record<string, string> = {};
  for (const fn of FUNCTIONS) {
    const execRole = ROLE_CATALOG.find(r => r.function === fn && r.careerTrack === "M" && r.maxLevel === 6);
    if (!execRole) continue;
    const id = `E${rows.length + 1}`.padStart(5, "0");
    let name = "";
    while (!name || usedNames.has(name)) {
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    }
    usedNames.add(name);
    const salary = Math.round(execRole.medianSalary * rng.float(0.9, 1.1, 2));
    rows.push({
      id, name, title: execRole.title, function: fn,
      jobFamily: execRole.jobFamily, subFamily: execRole.subFamily,
      careerTrack: execRole.careerTrack, careerLevel: 6,
      managerId: null,
      salary, location: rng.pick(LOCATIONS),
      tenure: rng.int(3, 18),
      aiReadinessScore: rng.float(2.0, 4.5, 1),
    });
    funcExecs[fn] = id;
  }

  // Second pass: fill remaining 191 rows from the full role catalog
  const fillRoles = ROLE_CATALOG.filter(r => !(r.careerTrack === "M" && r.maxLevel === 6));
  while (rows.length < 200) {
    const role = rng.pick(fillRoles);
    const level = rng.int(role.minLevel, role.maxLevel);
    const id = `E${rows.length + 1}`.padStart(5, "0");
    let name = "";
    while (!name || usedNames.has(name)) {
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    }
    usedNames.add(name);

    // Find a manager: prefer same-function exec; for senior roles find director row
    const sameFuncRows = rows.filter(r => r.function === role.function && r.careerLevel > level);
    const managerId = sameFuncRows.length
      ? rng.pick(sameFuncRows).id
      : (funcExecs[role.function] ?? rows[0].id);

    const salaryNoise = rng.float(0.88, 1.12, 2);
    const levelAdj = 1 + (level - 3) * 0.08;
    const salary = Math.round(role.medianSalary * salaryNoise * levelAdj);

    rows.push({
      id, name, title: role.title, function: role.function,
      jobFamily: role.jobFamily, subFamily: role.subFamily,
      careerTrack: role.careerTrack, careerLevel: level,
      managerId,
      salary, location: rng.pick(LOCATIONS),
      tenure: rng.int(0, 20),
      aiReadinessScore: rng.float(0.5, 5.0, 1),
    });
  }

  return rows;
}

export const workforce: WorkforceRow[] = generateWorkforce();

// ---------------------------------------------------------------------------
// Job catalog (47 roles — exported as-is from ROLE_CATALOG)
// ---------------------------------------------------------------------------
export const job_catalog = ROLE_CATALOG;

// ---------------------------------------------------------------------------
// Pre-computed transformation scenarios
// ---------------------------------------------------------------------------
export interface Scenario {
  id: string;
  name: string;
  description: string;
  automationRatePercent: number;
  augmentationRatePercent: number;
  headcountReductionPercent: number;
  investmentUSD: number;
  timelineMonths: number;
  estimatedAnnualSavingsUSD: number;
  changeRiskLevel: "Low" | "Medium" | "High";
}

export const scenarios: Record<string, Scenario> = {
  Conservative: {
    id: "conservative",
    name: "Conservative",
    description: "Cautious automation of highest-certainty, lowest-risk tasks. Minimal workforce change; focus on augmentation and efficiency gains.",
    automationRatePercent: 12,
    augmentationRatePercent: 28,
    headcountReductionPercent: 5,
    investmentUSD: 18_000_000,
    timelineMonths: 36,
    estimatedAnnualSavingsUSD: 14_000_000,
    changeRiskLevel: "Low",
  },
  Balanced: {
    id: "balanced",
    name: "Balanced",
    description: "Moderate automation across routine-heavy roles with targeted reskilling. Balanced approach to risk and return.",
    automationRatePercent: 22,
    augmentationRatePercent: 35,
    headcountReductionPercent: 12,
    investmentUSD: 32_000_000,
    timelineMonths: 30,
    estimatedAnnualSavingsUSD: 38_000_000,
    changeRiskLevel: "Medium",
  },
  Aggressive: {
    id: "aggressive",
    name: "Aggressive",
    description: "Broad AI-led transformation with significant role redesign. High short-term investment for maximum long-term savings.",
    automationRatePercent: 38,
    augmentationRatePercent: 40,
    headcountReductionPercent: 22,
    investmentUSD: 58_000_000,
    timelineMonths: 24,
    estimatedAnnualSavingsUSD: 76_000_000,
    changeRiskLevel: "High",
  },
  Optimized: {
    id: "optimized",
    name: "Optimized",
    description: "Algorithm-recommended scenario tuned to Chesapeake's readiness profile, regulatory constraints, and 3-year payback target.",
    automationRatePercent: 27,
    augmentationRatePercent: 38,
    headcountReductionPercent: 15,
    investmentUSD: 38_500_000,
    timelineMonths: 28,
    estimatedAnnualSavingsUSD: 52_000_000,
    changeRiskLevel: "Medium",
  },
};

// ---------------------------------------------------------------------------
// Organisation-level assessments
// ---------------------------------------------------------------------------
export const assessments = {
  orgAiReadiness: {
    score: 1.9,
    maxScore: 5,
    label: "Early Explorer",
    benchmarkLabel: "Energy sector median",
    benchmarkScore: 2.4,
    description:
      "Chesapeake has foundational digital infrastructure but limited AI tooling adoption. Data pipelines exist in Engineering and IT; most other functions rely on manual reporting.",
    dimensionScores: {
      dataReadiness: 2.3,
      toolingMaturity: 1.7,
      talentCapability: 1.8,
      leadershipAlignment: 2.1,
      changeCapacity: 1.6,
    },
  },
  changeReadiness: {
    score: 2.2,
    maxScore: 5,
    label: "Emerging",
    description:
      "Employee awareness of AI transformation is low outside IT and Engineering. Communications cadence and sponsor coalition are underdeveloped.",
    riskFactors: [
      "High tenure workforce with established work patterns",
      "Field operations culture of 'if it ain't broke, don't fix it'",
      "Limited prior exposure to enterprise technology change programmes",
    ],
    enablers: [
      "Strong executive mandate from CEO and CHRO",
      "Dedicated transformation budget approved",
      "Early adopter cohort identified in IT and Engineering",
    ],
  },
  managerCapability: {
    score: 2.5,
    maxScore: 5,
    label: "Developing",
    description:
      "Front-line managers have strong technical domain expertise but limited experience leading teams through digital change or interpreting workforce analytics.",
    developmentPriorities: [
      "AI literacy for non-technical managers",
      "Workforce transition conversation skills",
      "Data-informed performance coaching",
    ],
  },
};

// ---------------------------------------------------------------------------
// Full demo dataset object
// ---------------------------------------------------------------------------
export const chesapeakeDemo = {
  id: "chesapeake",
  name: "Chesapeake Energy — HR Digital Playground Demo",
  description:
    "Demo dataset for an upstream oil & gas operator. 200 workforce rows, 47 roles, 43 skills, 4 scenarios.",
  workforce,
  job_catalog,
  skills_library,
  scenarios,
  assessments,
  meta: {
    totalHeadcount: workforce.length,
    functions: FUNCTIONS.length,
    uniqueRoles: ROLE_CATALOG.length,
    totalSkills: Object.values(skills_library).flat().length,
    generatedAt: "2026-04-17",
    dataVersion: "1.0.0",
  },
};

// ---------------------------------------------------------------------------
// loadDemoWorkspace — stub loader for workspace integration
// ---------------------------------------------------------------------------
/**
 * Placeholder function that signals to the workspace layer that the
 * Chesapeake demo dataset should be loaded as the active model.
 *
 * In a real integration this would call a workspace context setter,
 * dispatch a Zustand/Redux action, or POST to the demo-loader API route.
 *
 * @param id - Demo dataset identifier. Only "chesapeake" is currently supported.
 */
export function loadDemoWorkspace(id: "chesapeake"): void {
  // TODO: integrate with useWorkspaceController once demo model routing is wired.
  // Suggested approach:
  //   const { setModel, uploadFiles } = useWorkspaceController();
  //   setModel(`demo:${id}`);
  // For now, log intent so developers can verify the call path.
  if (typeof window !== "undefined") {
    console.info(`[Demo] loadDemoWorkspace("${id}") called — workspace integration pending.`);
  }
}
