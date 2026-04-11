"use client";
import React, { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE BASE — Comprehensive 5W1H content for every module
   ═══════════════════════════════════════════════════════════════ */

export type KBSection = { heading: string; body: string };
export type KBEntry = {
  title: string;
  category: string;
  categoryColor: string;
  summary: string;
  who: KBSection[];
  what: KBSection[];
  where: KBSection[];
  when: KBSection[];
  why: KBSection[];
  how: KBSection[];
  terminology: { term: string; def: string }[];
  bestPractices: string[];
  pitfalls: string[];
  related: string[];
  scenario: string;
};

/* ── Category colors ── */
const CAT_COLORS: Record<string, string> = {
  "Overview": "#D4860A", "Diagnose": "#C07030", "Design": "#E8C547",
  "Simulate": "#D97706", "Mobilize": "#B8602A", "Export": "#A0522D",
  "Job Architecture": "#E09040", "Platform": "#8B5CF6",
};

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE ENTRIES — comprehensive 5W1H for every module
   ═══════════════════════════════════════════════════════════════ */

export const KNOWLEDGE_BASE: Record<string, KBEntry> = {
  snapshot: {
    title: "Workforce Snapshot",
    category: "Overview",
    categoryColor: CAT_COLORS["Overview"],
    summary: "Baseline view of headcount, roles, functions, and readiness. The starting point for every transformation engagement.",
    who: [
      { heading: "Who is this for?", body: "HR Business Partners, Org Design consultants, People Analytics teams, CHROs, and line-of-business leaders. Anyone who needs a current-state picture of the workforce before planning changes." },
      { heading: "Who owns this in the org?", body: "Typically the People Analytics or HR Operations team maintains the source data. The CHRO or Head of Org Design is the decision-maker for how the data is interpreted and acted upon." },
    ],
    what: [
      { heading: "What does it measure?", body: "Six core KPIs: Total Headcount (all employees by FTE), Role Count (distinct job titles), Tasks Mapped (% of work that has been decomposed into tasks), Average Span of Control (direct reports per manager), High AI Impact % (tasks flagged as highly automatable), and AI Readiness Score (composite maturity across 5 dimensions)." },
      { heading: "What does 'good' look like?", body: "A healthy baseline shows: 95%+ data coverage, span of control between 5-8, management ratio of 1:6-8, readiness score above 60/100, and at least 50% of roles with task-level mapping. Below these thresholds, data gaps will limit downstream analysis quality." },
      { heading: "Common misconceptions", body: "The Workforce Snapshot is NOT a workforce plan — it's a diagnostic baseline. Many teams skip this step and jump to redesign, only to discover their source data has gaps that undermine the entire analysis. Always start here." },
    ],
    where: [
      { heading: "Position in workflow", body: "This is the first module in the Discover phase. Everything downstream depends on the quality and completeness of this baseline. Data flows from here into every other module." },
      { heading: "Data sources", body: "HRIS exports (Workday, SAP SuccessFactors, Oracle HCM), org charts, headcount reports, and compensation files. Upload via the sidebar's Data Intake section." },
    ],
    when: [
      { heading: "When to use", body: "At the start of every engagement, before any design work begins. Refresh whenever the source data is updated (typically quarterly or after a major org change)." },
      { heading: "When NOT to use", body: "Don't rely on a snapshot that's more than 6 months old for active transformation planning — attrition and hiring will have changed the baseline significantly." },
    ],
    why: [
      { heading: "Why it matters", body: "Without an accurate baseline, every downstream decision is built on assumptions. A 10% error in headcount data can cascade into $5M+ miscalculations in transformation cost models. This module catches data gaps early." },
      { heading: "Real-world example", body: "A global financial services firm discovered through their Workforce Snapshot that 23% of manager roles had fewer than 3 direct reports — indicating significant structural inefficiency. This single finding redirected the transformation from 'AI automation' to 'structural redesign first, then automation.'" },
    ],
    how: [
      { heading: "Step-by-step", body: "1. Upload workforce data (HRIS export with employee ID, name, manager, function, job family, level, title). 2. Review the 6 KPI cards for obvious gaps. 3. Check the Data Coverage panel — any 'Missing' datasets will limit downstream modules. 4. Use the function distribution chart to identify the largest functions. 5. Note the readiness score — this sets expectations for the pace of transformation." },
      { heading: "Interpreting results", body: "Green indicators mean the metric is within healthy benchmarks. Amber means attention needed. Red means the metric is significantly outside norms and likely requires intervention before proceeding." },
    ],
    terminology: [
      { term: "FTE", def: "Full-Time Equivalent — a standardized measure where 1.0 = one full-time employee. Part-time employees are fractional (e.g., 0.5 FTE)." },
      { term: "Span of Control", def: "The number of direct reports a manager has. Calculated as total non-managers / total managers in a given scope." },
      { term: "AI Readiness Score", def: "A composite score (0-100) measuring organizational preparedness for AI adoption across 5 dimensions: Data Readiness, Process Standardization, Technology Enablement, Talent Readiness, and Leadership Alignment." },
    ],
    bestPractices: [
      "Always validate headcount against payroll — HRIS data often has ghosts (termed employees still in system) or missing contractors",
      "Compare your span of control distribution to industry benchmarks before setting targets",
      "Flag any function where >40% of headcount is at management level — this is a structural red flag",
      "Ensure Job Title and Career Level are populated for at least 90% of employees before moving to Design",
    ],
    pitfalls: [
      "Using headcount instead of FTE can overstate workforce size by 5-15% in organizations with significant part-time populations",
      "Ignoring contractor and contingent worker data — they often represent 15-30% of total workforce capacity",
      "Treating the readiness score as a pass/fail rather than a diagnostic — every score tells a story about specific gaps",
    ],
    related: ["readiness", "scan", "jobs", "jobarch"],
    scenario: "A mid-size technology company (2,500 employees) loaded their HRIS export and discovered: 8.2 average span of control (slightly wide), 4 management layers (healthy for their size), but only 35% of roles had task-level work design data. The low task coverage meant the AI Impact analysis would be incomplete for 65% of the workforce. The team prioritized task mapping for the top 20 highest-headcount roles (covering 60% of employees) before proceeding to the Design phase — a decision that saved 3 weeks of rework later.",
  },

  scan: {
    title: "AI Opportunity Scan",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Identifies where AI creates the most value by scoring every task on automation potential, time savings, and organizational readiness.",
    who: [
      { heading: "Who is this for?", body: "AI/Digital transformation leads, COOs, functional heads evaluating where to deploy AI first, and HR teams assessing workforce impact. The output directly informs investment prioritization." },
      { heading: "Key stakeholders", body: "CIO/CTO (technology readiness), CHRO (people impact), CFO (investment case), and line-of-business VPs (operational disruption)." },
    ],
    what: [
      { heading: "What it does", body: "Scores every mapped task across 4 dimensions: Task Type (Repetitive=high, Variable=medium, Complex=low), Logic (Deterministic=high, Probabilistic=medium, Judgment-heavy=low), Interaction (Independent=high, Interactive=medium, Collaborative=low), and existing AI Impact tag. The composite score creates a prioritized list of automation opportunities." },
      { heading: "What the scores mean", body: "AI Priority Score 8-10: Immediate automation candidate (typically repetitive, deterministic, independent tasks like data entry, report generation, scheduling). Score 5-7: Augmentation opportunity (AI assists but human judgment still needed). Score 1-4: Human-essential tasks (relationship building, creative work, complex negotiations)." },
      { heading: "Benchmarks", body: "Across industries, typically 25-35% of all tasks score as 'High' automation potential. However, only 10-15% of full roles can be fully automated — the rest are augmented. Organizations that find >50% of tasks scoring high should validate their task definitions aren't too granular." },
    ],
    where: [
      { heading: "Workflow position", body: "Discover phase, after Workforce Snapshot. The AI scan results feed directly into the Work Design Lab (Design phase) where tasks are actually redesigned. Results also inform the Impact Simulator scenarios." },
      { heading: "Data requirements", body: "Work Design data must be uploaded — specifically, each role needs tasks with Task Type, Interaction pattern, and Logic classification. Without these dimensions, the scoring algorithm cannot differentiate tasks." },
    ],
    when: [
      { heading: "When to run", body: "After task-level work design data is loaded. Rerun after any changes to task classifications or after completing the Work Design Lab for additional roles." },
      { heading: "Typical timeline", body: "Initial scan takes 2-3 weeks to complete for a 50-role scope — the bottleneck is task mapping, not the analysis itself." },
    ],
    why: [
      { heading: "Business case", body: "The scan prevents the #1 mistake in AI transformation: investing in automation for the wrong tasks. Organizations that skip prioritization typically waste 30-40% of their AI budget on low-impact automations while high-value opportunities sit untouched." },
      { heading: "Example", body: "A consumer products company scanned 1,200 tasks across 45 roles. The scan revealed that 68% of their Finance function's tasks were highly automatable (mostly reporting and reconciliation), while only 12% of their Marketing tasks scored high. This shifted their Phase 1 investment from a planned broad rollout to a focused Finance automation sprint — delivering ROI 6 months faster." },
    ],
    how: [
      { heading: "How scoring works", body: "Each task receives a composite score: AI Priority = (Task Type weight × 0.3) + (Logic weight × 0.3) + (Interaction weight × 0.2) + (Time Impact × 0.2). Task Type: Repetitive=10, Variable=5, Complex=2. Logic: Deterministic=10, Probabilistic=6, Judgment-heavy=2. Interaction: Independent=10, Interactive=6, Collaborative=3." },
      { heading: "How to present to leadership", body: "Lead with the headline: 'X% of tasks across Y roles have high automation potential, representing Z hours/week of capacity that could be redirected.' Then show the top 10 quick wins table. Avoid leading with job elimination language — frame as capacity creation." },
    ],
    terminology: [
      { term: "Quick Win", def: "A task with high automation potential AND low implementation complexity — typically achievable in 0-3 months with existing technology." },
      { term: "Time Impact", def: "The number of hours per week currently spent on a task, weighted by the automation potential percentage. Higher time impact = more capacity freed." },
      { term: "Risk Score", def: "Measures the risk of automating a task incorrectly — based on error severity, regulatory exposure, and customer impact." },
    ],
    bestPractices: [
      "Don't automate tasks just because they CAN be automated — prioritize by business value, not just technical feasibility",
      "Always pair AI scoring with human validation — subject matter experts should review the top 20 highest-scored tasks",
      "Look for clusters of automatable tasks within the same workflow — automating an entire process is more impactful than individual tasks",
      "Consider the 'last mile' problem: some tasks score high for automation but have edge cases that require human handling 10% of the time",
    ],
    pitfalls: [
      "Conflating 'automatable' with 'should be automated' — regulatory, ethical, and change management considerations matter",
      "Ignoring the augmentation category — tasks scored 5-7 often deliver more value through human+AI collaboration than full automation",
      "Using the scan results to justify predetermined headcount reduction targets — this erodes trust and undermines adoption",
    ],
    related: ["design", "simulate", "quickwins", "skills"],
    scenario: "A healthcare system scanned 800 tasks across their Revenue Cycle Management function. The scan identified that claims coding (180 hours/week across the team) scored 9.2/10 for automation — deterministic, repetitive, and independent. But claims appeals (120 hours/week) scored only 3.1 — requiring judgment, negotiation, and regulatory interpretation. The team automated coding first (Phase 1, 3-month implementation, $2.4M annual savings), then built an AI-assisted appeals tool (Phase 2, augmentation model) that improved appeal success rates by 15% without reducing staff.",
  },

  design: {
    title: "Work Design Lab",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "The core engine for redesigning work. Deconstruct jobs into tasks, apply AI impact analysis, reconstruct optimized roles, and plan redeployment of freed capacity.",
    who: [
      { heading: "Who is this for?", body: "Org Design specialists, HR Business Partners working with functional leaders, management consultants building future-state operating models, and COOs responsible for operational efficiency." },
      { heading: "Who participates?", body: "Job incumbents and their managers provide task-level input. HR validates leveling and classification. Technology teams assess AI feasibility. Finance validates cost assumptions. The CHRO sponsors and approves the redesigned role profiles." },
    ],
    what: [
      { heading: "What is work design?", body: "Work design is the process of breaking a role into its component tasks, analyzing each task's characteristics, and reassembling them into an optimized role that leverages AI/automation. It follows a 4-step methodology: Job Context → Deconstruction → Reconstruction → Redeployment." },
      { heading: "The 4 phases", body: "1. Job Context: Understand the role's current state — hours, tasks, workstreams, skills, reporting relationships. 2. Deconstruction: Tag each task with Task Type (Repetitive/Variable/Complex), Logic (Deterministic/Probabilistic/Judgment), Interaction (Independent/Interactive/Collaborative), and AI Impact (High/Moderate/Low). 3. Reconstruction: Apply an AI scenario to calculate future time allocation — how many hours are freed by automation vs. augmentation. 4. Redeployment: Decide where freed capacity goes — higher-value work, new responsibilities, upskilling time, or headcount optimization." },
      { heading: "What 'good' looks like", body: "A well-designed role has: tasks summing to 100% of time, clear AI impact tags on every task, a reconstruction showing 20-45% time freed (typical range), and a redeployment plan that specifies exactly where freed capacity is redirected." },
    ],
    where: [
      { heading: "Workflow position", body: "Design phase — after Diagnose (which identifies which roles to prioritize) and before Simulate (which models the aggregate impact). This is the most detailed, role-by-role work in the entire transformation." },
      { heading: "Downstream consumers", body: "The reconstructed roles feed into: Impact Simulator (FTE and cost modeling), BBBA (talent sourcing strategy), Headcount Planning (waterfall), Reskilling Pathways (individual learning plans), and the Export module (board deliverables)." },
    ],
    when: [
      { heading: "When to do this", body: "After the AI Opportunity Scan identifies priority roles. Typically, start with the top 10-15 highest-headcount or highest-impact roles — these cover 60-70% of the workforce impact. A phased approach (Wave 1: 10 roles, Wave 2: 20 roles, Wave 3: remainder) is more manageable than trying to redesign everything at once." },
      { heading: "Typical duration", body: "1-2 hours per role for initial deconstruction (with subject matter expert input). Reconstruction and redeployment planning adds another 1-2 hours. For a 50-role engagement, budget 3-4 weeks of analyst time." },
    ],
    why: [
      { heading: "Why task-level matters", body: "Roles are too coarse for AI planning. A 'Financial Analyst' role contains 8-12 distinct tasks — some are highly automatable (data extraction, report formatting) while others are deeply human (stakeholder presentations, strategic recommendations). Without task-level decomposition, you can't accurately predict impact or design interventions." },
      { heading: "Example", body: "A professional services firm redesigned their 'Audit Associate' role. Task decomposition revealed that 40% of the role was spent on document review and data extraction (highly automatable), 25% on testing procedures (augmentable with AI), and 35% on client interaction and judgment calls (human-essential). The redesigned role freed 15 hours/week per associate, redirected to higher-value client advisory work — increasing client satisfaction scores by 22% while handling 30% more engagements per associate." },
    ],
    how: [
      { heading: "Step-by-step in the platform", body: "1. Select a job from the Active Job dropdown in the sidebar. 2. Review the Job Context tab — current hours, workstreams, skills. 3. Go to the Task Portfolio — each task shows time allocation and AI characteristics. 4. Submit for Reconstruction — choose Conservative (30% adoption), Balanced (55%), or Aggressive (80%). 5. Review the Impact tab — released hours, FTE equivalent, value model. 6. Complete the Redeployment tab — assign freed capacity to buckets (higher-value work, innovation, capability building, or headcount optimization)." },
      { heading: "Validation rules", body: "Task time allocations must sum to approximately 100% (±5% tolerance). Each task must have an AI Impact tag. Tasks with 0% time allocation are flagged for removal. The platform validates these automatically and shows warnings." },
    ],
    terminology: [
      { term: "Deconstruction", def: "Breaking a role into its 8-15 component tasks, each described by a single sentence, typically taking 1-4 hours to perform, and independently assignable." },
      { term: "Reconstruction", def: "Reassembling tasks into an optimized role profile after applying AI automation/augmentation assumptions." },
      { term: "Redeployment", def: "The plan for where freed capacity (hours no longer spent on automated tasks) is redirected — higher-value work, new roles, upskilling, or headcount reduction." },
      { term: "Scenario", def: "A set of adoption assumptions: Conservative (30% AI adoption, 18-month timeline), Balanced (55%, 12-month), Aggressive (80%, 6-month)." },
    ],
    bestPractices: [
      "Start with roles that have the highest headcount AND highest AI impact score — this maximizes the business case",
      "Always involve 2-3 incumbents in the task decomposition — one person's view of a role is incomplete",
      "Don't over-decompose: 8-15 tasks per role is the sweet spot. More than 20 tasks means you're going too granular",
      "Frame redeployment as 'capacity creation' not 'headcount reduction' — the former gets buy-in, the latter gets resistance",
      "Save your work frequently — the platform auto-persists but manual saves before closing are recommended",
    ],
    pitfalls: [
      "Decomposing by activity ('attend meetings') instead of by deliverable ('produce monthly variance report') — activities are too vague to score for AI impact",
      "Applying the same AI scenario to every role — a Finance Analyst and a Sales Director have very different automation profiles",
      "Skipping the redeployment step — stakeholders will immediately ask 'what happens to the freed-up time?' and you need an answer",
      "Not validating with functional experts — an HR analyst designing Finance roles will miss critical nuances",
    ],
    related: ["scan", "simulate", "bbba", "headcount", "skills"],
    scenario: "A manufacturing company redesigned their 'Quality Inspector' role (180 incumbents). Deconstruction revealed 12 tasks. Three tasks (visual inspection documentation, defect logging, compliance reporting) scored 9+ for automation — representing 45% of time. The team implemented computer vision for visual inspections and automated defect logging into their MES system. The reconstructed role freed 18 hours/week per inspector, redeployed to root cause analysis (previously done only by senior engineers). Within 6 months, defect recurrence dropped 35% because inspectors were now investigating causes rather than just recording symptoms.",
  },

  simulate: {
    title: "Impact Simulator",
    category: "Simulate",
    categoryColor: CAT_COLORS["Simulate"],
    summary: "Model transformation scenarios, compare adoption paths, assess organizational readiness, and build the financial business case for AI transformation.",
    who: [
      { heading: "Who uses this?", body: "CFOs and Finance teams (for the cost/ROI model), transformation PMOs (for scenario planning), CHROs (for workforce impact), and C-suite sponsors (for investment decisions). This is the module that gets presented to the board." },
    ],
    what: [
      { heading: "What it does", body: "Takes the role-level work design outputs and aggregates them into organization-wide impact projections. Models three preset scenarios (Conservative 30%, Balanced 55%, Aggressive 80% AI adoption) plus custom scenarios. Calculates: released hours, FTE equivalent, annual savings, break-even timeline, redeployment allocation, and ROI over 1/3/5 year horizons." },
      { heading: "Cost model methodology", body: "Total Investment = Roles in scope × Per-role investment. Annual Savings = Released hours × Blended hourly rate. Break-even = Total Investment ÷ (Annual Savings ÷ 12). Year 1 Net = Annual Savings - Total Investment. 3-Year Net = (Annual Savings × 3) - Total Investment - (Recurring cost × 2). Recurring cost is estimated at 15% of initial investment for maintenance, licensing, and support." },
    ],
    where: [
      { heading: "Position in workflow", body: "After Design (which provides the role-level inputs) and before Mobilize (which builds the change plan). The Simulator is the bridge between 'what could change' and 'what should we actually do.'" },
    ],
    when: [
      { heading: "When to use", body: "After completing work design for at least 5-10 roles. The more roles with completed work design, the more accurate the aggregate projections. Rerun whenever work design is updated or assumptions change." },
    ],
    why: [
      { heading: "Why scenario comparison matters", body: "No transformation has a single 'right' answer. Conservative scenarios minimize disruption but deliver less value. Aggressive scenarios maximize ROI but carry higher execution risk. Presenting 2-3 scenarios lets leadership make an informed choice rather than debating a single number." },
    ],
    how: [
      { heading: "How to use", body: "1. Select a scenario preset or build a custom one. 2. Review the 5 KPI cards (Current Hours, Released, FTE, Savings, Break-even). 3. Use the Role Detail sub-tab to see per-role impact. 4. Switch to Comparison to see all scenarios side by side. 5. Save scenarios to compare saved configurations with charts. 6. Use the Redeployment sub-tab to allocate freed capacity. 7. Review Investment & ROI for the financial business case." },
    ],
    terminology: [
      { term: "Released Hours", def: "Total hours per month freed from AI automation/augmentation across all in-scope roles." },
      { term: "FTE Equivalent", def: "Released hours ÷ 160 (standard monthly hours). Represents the full-time headcount equivalent of freed capacity." },
      { term: "Break-even", def: "The number of months until cumulative savings exceed total investment." },
      { term: "Adoption Rate", def: "The percentage of identified automation potential that is actually realized. Conservative=30%, Balanced=55%, Aggressive=80%." },
    ],
    bestPractices: [
      "Always present the Balanced scenario as the recommendation with Conservative as the floor and Aggressive as the stretch",
      "Include ramp-up time in your projections — full adoption doesn't happen on day 1, assume 75% of theoretical savings in Year 1",
      "Don't present FTE impact as 'jobs eliminated' — frame as 'capacity freed for redeployment'",
    ],
    pitfalls: [
      "Assuming 100% of theoretical savings will be realized — real-world adoption is always lower due to change management, technical issues, and edge cases",
      "Ignoring the cost of change management, training, and productivity loss during transition",
      "Presenting a single scenario without alternatives — this invites debate about the number rather than the strategy",
    ],
    related: ["design", "headcount", "plan", "export"],
    scenario: "A retail bank modeled three scenarios for their Operations function (800 employees). Conservative: $4.2M savings, 24-month break-even. Balanced: $11.8M savings, 14-month break-even. Aggressive: $18.5M savings but required $12M upfront investment and aggressive timeline. The CHRO recommended the Balanced scenario with a phased implementation — Wave 1 targeting the 15 highest-impact roles, delivering quick wins to build momentum before scaling.",
  },

  readiness: {
    title: "AI Readiness Assessment",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Measures organizational preparedness for AI transformation across 5 dimensions: Data Readiness, Process Standardization, Technology Enablement, Talent Readiness, and Leadership Alignment.",
    who: [
      { heading: "Who is this for?", body: "Transformation leads assessing organizational maturity, CIOs planning technology investments, CHROs evaluating talent gaps, and board members understanding risk exposure." },
    ],
    what: [
      { heading: "The 5 dimensions", body: "Each dimension is scored 0-20, summing to a total score of 0-100. Data Readiness: quality, accessibility, and governance of organizational data. Process Standardization: consistency and documentation of business processes. Technology Enablement: existing technology infrastructure and integration capability. Talent Readiness: workforce skills, digital literacy, and change disposition. Leadership Alignment: executive sponsorship, vision clarity, and governance structures." },
      { heading: "Score ranges", body: "0-30: Early stage — significant foundational work needed before AI can deliver value. 30-60: Emerging — some capabilities exist but gaps will limit transformation speed. 60-80: Advanced — strong foundation, ready for accelerated AI adoption. 80-100: Leading — mature capabilities, focus on optimization and scaling." },
    ],
    where: [
      { heading: "Workflow position", body: "Discover phase. The readiness score helps calibrate expectations — a score of 35 means a 6-month aggressive automation timeline is unrealistic regardless of the technology available." },
    ],
    when: [
      { heading: "When to assess", body: "At the start of every engagement and quarterly during active transformation. Readiness should improve measurably over time — if it doesn't, the transformation is stalling." },
    ],
    why: [
      { heading: "Why it matters", body: "The #1 reason AI transformations fail is not technology — it's organizational readiness. A Gartner study found that 85% of AI projects don't deliver expected results, primarily due to data quality issues (Data Readiness), resistance to change (Talent Readiness), and unclear ownership (Leadership Alignment)." },
    ],
    how: [
      { heading: "How it's calculated", body: "Each dimension is assessed through a combination of: (1) data signals from your uploaded workforce/work design data (e.g., data completeness = Data Readiness proxy), (2) structural indicators (e.g., management layers = Process Standardization proxy), and (3) composition metrics (e.g., skill distribution = Talent Readiness proxy). The platform generates a best-estimate score from available data." },
    ],
    terminology: [
      { term: "Maturity Level", def: "A qualitative label corresponding to the score range: Early (0-30), Emerging (30-60), Advanced (60-80), Leading (80-100)." },
    ],
    bestPractices: [
      "Use the readiness score to set realistic timelines — don't promise aggressive timelines to a low-readiness organization",
      "Address the lowest-scoring dimension first — it's the bottleneck that limits everything else",
      "Track readiness quarterly — a rising score is the best leading indicator of transformation success",
    ],
    pitfalls: [
      "Treating a low readiness score as a reason NOT to transform — it's a reason to invest in foundations first",
      "Over-indexing on Technology Enablement while ignoring Talent Readiness — the best tools are useless if people won't use them",
    ],
    related: ["snapshot", "scan", "changeready", "skills"],
    scenario: "An energy company scored 42/100 on readiness — solidly 'Emerging.' The breakdown revealed Technology Enablement was strong (16/20) but Talent Readiness was critically low (5/20). The team deprioritized new tool deployment and spent the first 6 months on a comprehensive digital literacy program. Readiness climbed to 64 within two quarters, and the subsequent automation rollout achieved 3x the adoption rate of their previous (failed) attempt.",
  },

  plan: {
    title: "Change Management Planner",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Sequence transformation initiatives into waves. Manage dependencies, risks, milestones, and stakeholder engagement through the full transformation lifecycle.",
    who: [
      { heading: "Who uses this?", body: "Transformation PMOs, Change Management leads, HR Business Partners coordinating deployment, and executive sponsors tracking progress." },
    ],
    what: [
      { heading: "What it does", body: "Converts all transformation decisions into a sequenced execution roadmap. Organizes initiatives into Waves (parallel workstreams within a phase), assigns owners, sets priorities, tracks milestones, and generates a visual timeline. Optionally, AI auto-generates a roadmap from your completed work design and BBBA decisions." },
    ],
    where: [
      { heading: "Position in workflow", body: "Mobilize phase — the final planning step before execution begins. Consumes outputs from every prior module: redesigned roles from Design, impact projections from Simulate, talent strategies from BBBA, and readiness data from Diagnose." },
    ],
    when: [
      { heading: "When to build the plan", body: "After completing at least the core Design work (10+ roles redesigned) and the Impact Simulator. The plan should be reviewed weekly during active transformation and refreshed monthly." },
    ],
    why: [
      { heading: "Why sequencing matters", body: "Trying to change everything simultaneously overwhelms the organization. Wave-based deployment (typically 3-5 waves over 12-18 months) allows the organization to learn from early waves, build confidence, and course-correct before scaling. McKinsey data shows phased transformations are 2.5x more likely to succeed than big-bang approaches." },
    ],
    how: [
      { heading: "How to use", body: "1. Click '☕ Auto-Build Plan' to generate an AI-powered roadmap from your transformation data. 2. Review and edit the generated initiatives — change owners, priorities, timelines. 3. Assign initiatives to Waves (Wave 1 = quick wins, Wave 2 = core transformation, Wave 3 = optimization). 4. Use the timeline view to visualize dependencies. 5. Export the plan for stakeholder review." },
    ],
    terminology: [
      { term: "Wave", def: "A phase of transformation containing multiple parallel initiatives. Typically 3-6 months duration." },
      { term: "RACI", def: "Responsible, Accountable, Consulted, Informed — a framework for clarifying roles in each initiative." },
    ],
    bestPractices: [
      "Start with 3-5 quick wins in Wave 1 to build momentum and demonstrate value",
      "Never put more than 30% of the workforce through change simultaneously — the organization needs capacity to absorb change",
      "Assign every initiative a named owner (not a team) — accountability requires a single point of contact",
    ],
    pitfalls: [
      "Over-planning without executing — the plan is a living document, not a work of art",
      "Ignoring dependencies between workstreams — technology changes that aren't ready will block people changes",
      "Not building in slack — every plan should have 15-20% buffer for unexpected delays",
    ],
    related: ["simulate", "changeready", "reskill", "mgrdev", "export"],
    scenario: "A pharmaceutical company planned their transformation in 4 waves over 18 months. Wave 1 (months 1-4): automated 3 reporting processes in Finance, trained 50 managers on AI basics. Wave 2 (months 4-9): redesigned 12 clinical operations roles, deployed AI-assisted document review. Wave 3 (months 9-14): scaled automation to commercial functions, launched reskilling for 200 employees. Wave 4 (months 14-18): full operating model transition. Each wave delivered measurable ROI, which funded the next wave — a self-sustaining transformation.",
  },

  export: {
    title: "Export & Report",
    category: "Export",
    categoryColor: CAT_COLORS["Export"],
    summary: "Generate board-ready transformation reports consolidating all findings, data, and recommendations from every module into professional deliverables.",
    who: [
      { heading: "Who is this for?", body: "Consultants preparing client deliverables, internal transformation teams reporting to steering committees, CHROs presenting to the board, and project managers documenting decisions." },
    ],
    what: [
      { heading: "What it produces", body: "Three export formats: (1) Word Document (.docx) — comprehensive 12-section narrative report covering all transformation phases. (2) AI Narrative (.txt) — AI-generated board-ready summary. (3) Executive Summary — one-page overview with KPIs, findings, recommendations, and next steps, exportable as PDF." },
    ],
    where: [
      { heading: "Position in workflow", body: "Final module — consumes outputs from all prior modules. Works best when at least the Discover and Design phases are complete." },
    ],
    when: [
      { heading: "When to export", body: "At milestone checkpoints: after completing Discover (baseline report), after Design (transformation blueprint), and at project completion (final recommendations). Also useful for quarterly steering committee updates." },
    ],
    why: [
      { heading: "Why professional deliverables matter", body: "Transformation decisions involve significant investment and organizational change. Stakeholders need professional, data-backed documentation to build confidence, secure budget, and maintain accountability. A well-structured report can be the difference between a funded transformation and a shelved proposal." },
    ],
    how: [
      { heading: "How to use", body: "1. Review the Data Readiness dashboard — ensure key modules are complete. 2. Click 'Download Word Report' for a comprehensive document. 3. Use 'AI Narrative' for a concise summary. 4. Use the Executive Summary Generator for a one-page overview with PDF export. 5. Customize as needed in your preferred editor." },
    ],
    terminology: [],
    bestPractices: [
      "Lead with the 'so what' — executives want recommendations, not just data",
      "Include the readiness score and key flags — they show you've done rigorous analysis",
      "Use the waterfall chart to tell the headcount story visually — it's the most impactful single chart for board presentations",
    ],
    pitfalls: [
      "Exporting before completing key modules — incomplete data undermines credibility",
      "Presenting raw data without interpretation — every metric needs a 'what this means' narrative",
    ],
    related: ["snapshot", "design", "simulate", "plan"],
    scenario: "A consulting team used the Export module to generate a 45-page transformation blueprint for their client's steering committee. The document included: executive summary (1 page), workforce baseline (3 pages with charts), AI opportunity analysis (5 pages), 15 redesigned role profiles (15 pages), financial impact model (3 pages with 3 scenarios), and implementation roadmap (4 pages). The steering committee approved the $8M investment in a single meeting — crediting the data-driven approach as the deciding factor.",
  },

  jobarch: {
    title: "Job Architecture",
    category: "Job Architecture",
    categoryColor: CAT_COLORS["Job Architecture"],
    summary: "Enterprise job catalogue, hierarchy framework, career path design, and structural validation — the foundation of organizational design.",
    who: [
      { heading: "Who is this for?", body: "Compensation & Benefits teams (for leveling and pay structure), Org Design specialists (for hierarchy optimization), Talent Management (for career path design), and HR Business Partners (for role clarity and workforce planning)." },
      { heading: "Who should be in the room?", body: "CHRO/CPO as sponsor, Total Rewards lead for leveling alignment, functional leaders for role content validation, and Legal for title compliance." },
    ],
    what: [
      { heading: "What is a Job Architecture?", body: "A structured framework that organizes all jobs in an organization into a coherent hierarchy: Job Family Groups → Job Families → Sub-Families → Individual Jobs → Career Levels. It defines how roles relate to each other, what career paths exist, and how leveling and compensation align across the enterprise." },
      { heading: "Components", body: "Job Catalogue (browsable inventory of all roles), Hierarchy Map (visual tree of the organizational structure), Career Tracks (IC, Manager, Executive, Specialist pathways), Leveling Framework (what each level means in terms of scope, complexity, and autonomy), and Validation Engine (automated checks for structural integrity)." },
      { heading: "What 'good' looks like", body: "A healthy architecture has: 3+ distinct jobs per family, 10+ headcount per family, consistent leveling across families (same level = same scope/comp), no more than 8 career levels per track, clear IC-to-Manager fork, and fewer than 5% of roles flagged for structural issues." },
    ],
    where: [
      { heading: "Position in workflow", body: "Discover phase — the architecture defines the structural framework that all other modules reference. Design uses it to identify which roles to redesign. Simulate uses it for impact modeling. Mobilize uses it for transition planning." },
    ],
    when: [
      { heading: "When to build/review", body: "At the start of any transformation engagement and annually as part of workforce planning. Trigger a review after any major restructuring, M&A integration, or when >15% of roles don't fit the existing structure." },
    ],
    why: [
      { heading: "Why it matters", body: "Without a clear job architecture, organizations suffer from: title inflation (VP-level titles for individual contributors), inconsistent compensation (same work, different pay in different functions), broken career paths (no visible growth trajectory), and difficulty benchmarking against market data. A well-designed architecture is the skeleton that supports every talent process." },
      { heading: "Example", body: "A technology company discovered through their Job Architecture review that they had 347 unique job titles for 2,500 employees — a 1:7.2 ratio (industry benchmark is 1:15-20). 40% of titles were unique to a single person. After rationalization, they reduced to 180 titles, improved market benchmarking accuracy by 35%, and increased internal mobility by 28% (because employees could finally see clear career paths)." },
    ],
    how: [
      { heading: "How to use the module", body: "1. Start with the Job Catalogue tab — browse roles by hierarchy using the tree navigator. 2. Click any role to open the detailed profile panel (content, skills, career paths, AI impact, KPIs). 3. Use the Architecture Map tab for visual analysis (treemap, population pyramid, track distribution). 4. Run the Validation tab to identify structural issues (flags auto-detect problems). 5. Review Analytics for completeness scoring and gap identification. 6. Use the Compare tool to evaluate similar roles for consolidation." },
    ],
    terminology: [
      { term: "Job Family Group", def: "The highest level of grouping — typically aligns with functions (Finance, Technology, HR). Usually 8-15 groups in an enterprise." },
      { term: "Job Family", def: "A collection of related roles within a function (e.g., 'FP&A', 'Accounting', 'Treasury' within Finance). Usually 3-8 families per group." },
      { term: "Sub-Family", def: "Further specialization within a family (e.g., 'Accounts Payable', 'Accounts Receivable', 'General Ledger' within Accounting)." },
      { term: "Career Track", def: "The progression path type: Individual Contributor (IC), Manager, Executive, or Specialist/Advisory." },
      { term: "Career Level", def: "The grade or band within a track (e.g., L2=Junior, L3=Mid, L4=Senior, L5=Lead, L6=Principal for ICs)." },
      { term: "Dual Track", def: "An architecture that provides parallel IC and Manager tracks at senior levels, allowing deep experts to advance without managing people." },
    ],
    bestPractices: [
      "Aim for a 1:15-20 ratio of unique titles to headcount — more titles than this creates complexity without value",
      "Every family should have at least 3 distinct jobs and 10+ headcount — below this, consider merging",
      "Define clear differentiation between adjacent levels — if you can't articulate what changes from L3 to L4, the levels are redundant",
      "Offer a dual-track (IC + Manager) fork no later than the 4th career level — this is where you lose senior ICs to management roles they don't want",
      "Validate the architecture against market data annually — role definitions drift over time",
    ],
    pitfalls: [
      "Creating levels to solve compensation problems instead of role scope problems — this leads to 'level inflation' where titles are meaningless",
      "Designing the architecture in HR without functional leader input — role content must be validated by people doing the work",
      "Treating the architecture as static — it needs annual calibration as the business evolves",
      "Ignoring contractor and contingent worker roles — they're part of your operating model even if not in your HRIS",
    ],
    related: ["snapshot", "skills", "design", "headcount", "opmodel"],
    scenario: "A financial services firm used the Job Architecture module to audit their 450-role structure. The Validation Engine flagged 23 issues: 8 families with fewer than 3 roles, 5 career level gaps (L3 to L5 with no L4), 3 inverted pyramids (more senior than junior roles), and 7 single-incumbent roles creating key-person risk. After a 6-week calibration effort — merging 4 small families, adding missing levels, and creating succession plans for single-incumbent roles — the architecture health score improved from 51 to 84. The cleaner structure enabled a compensation benchmarking project that identified $3.2M in pay equity adjustments.",
  },

  skills: {
    title: "Skills & Talent",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Comprehensive skill inventory, gap analysis, and adjacency mapping — identifies what your workforce can do today, what they'll need tomorrow, and who can bridge the gap.",
    who: [
      { heading: "Who is this for?", body: "L&D teams designing training programs, Talent Management building career frameworks, HR Business Partners advising on reskilling priorities, and functional leaders planning capability investments." },
    ],
    what: [
      { heading: "Three components", body: "1. Skills Inventory: proficiency grid mapping every employee against 15+ skills with proficiency levels (1=Novice to 4=Expert). 2. Gap Analysis: compares current average proficiency to future target proficiency for each skill — the delta indicates training investment needed. 3. Adjacency Mapping: scores internal candidates for redesigned roles based on skill overlap, identifying who can be reskilled vs. who needs to be hired." },
    ],
    where: [
      { heading: "Position in workflow", body: "Design phase. The skills data feeds into BBBA (determining build vs. buy decisions), Reskilling Pathways (individual learning plans), and the Talent Marketplace (internal matching)." },
    ],
    when: [
      { heading: "When to assess", body: "After workforce data is loaded and before making any BBBA or headcount decisions. Skills data should be refreshed annually or after any major capability development program." },
    ],
    why: [
      { heading: "Why it matters", body: "Skills are the currency of workforce transformation. Without knowing what skills exist in your current workforce, you can't determine whether to Build (reskill), Buy (hire), Borrow (contract), or Automate. A 2023 WEF study found that 44% of worker skills will need to change by 2027 — making skills mapping a strategic imperative, not an HR exercise." },
    ],
    how: [
      { heading: "How to use", body: "1. Review the Skills Inventory tab — edit proficiency scores if needed. 2. Confirm the inventory to unlock Gap Analysis. 3. In Gap Analysis, set dispositions for each gap: 'Close Internally' (reskilling), 'Hire Externally', or 'Accept Risk'. 4. In Adjacency Mapping, set the match threshold (default 60%) and shortlist strong internal candidates for redesigned roles." },
    ],
    terminology: [
      { term: "Proficiency Level", def: "1=Novice (awareness only), 2=Foundational (can perform with guidance), 3=Intermediate (independent performer), 4=Expert (can teach others and innovate)." },
      { term: "Adjacency Score", def: "Percentage of required skills for a target role that an employee already possesses at the required proficiency level." },
    ],
    bestPractices: [
      "Use self-assessment + manager validation for proficiency scores — self-assessment alone tends to overstate by 0.5-1.0 levels",
      "Focus gap closure on skills with the highest strategic importance AND the widest gap — not all gaps are worth closing",
      "Set adjacency thresholds realistically: 70%+ = strong Build candidate, 50-70% = possible with significant training, <50% = likely need to Buy",
    ],
    pitfalls: [
      "Creating an exhaustive skills taxonomy (200+ skills) that no one can maintain — 15-25 well-defined skills is more actionable than 200 vague ones",
      "Treating skills data as static — proficiency changes constantly through training, experience, and attrition",
    ],
    related: ["design", "bbba", "reskill", "marketplace", "jobarch"],
    scenario: "A manufacturing company mapped 15 skills across 500 employees. The gap analysis revealed that 'AI/ML Tools' had the widest gap (current avg: 1.2, target: 3.0) but 'Process Automation' was actually more critical for their transformation (current: 1.8, target: 3.5) because it was needed in 80% of redesigned roles. The team prioritized Process Automation training over AI/ML, deploying a 12-week program that moved the average from 1.8 to 2.9 — unlocking the automation opportunities identified in the AI Opportunity Scan.",
  },

  opmodel: {
    title: "Operating Model Lab",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Design and explore operating model architectures. Configure industry-specific taxonomies, visualize capability blueprints, assess maturity, and define decision rights.",
    who: [
      { heading: "Who is this for?", body: "Operating Model consultants, COOs, functional leaders designing future-state structures, and transformation architects defining how the enterprise should work." },
    ],
    what: [
      { heading: "What is an Operating Model?", body: "An operating model defines HOW an organization delivers value — the structure of functions, the allocation of activities between centralized and decentralized units, the governance of decisions, and the flow of work across organizational boundaries. It sits between strategy ('what we want to achieve') and execution ('how we do the work day-to-day')." },
      { heading: "The 5 layers", body: "1. Governance: oversight, policy, compliance. 2. Core Components: primary value-creating activities. 3. Shared Services: centralized transactional activities. 4. Enabling: capabilities that support core components (analytics, technology, training). 5. Interface: interactions with external stakeholders." },
    ],
    where: [
      { heading: "Position in workflow", body: "Design phase. The operating model defines the structural context for all work design decisions. It answers 'where should this activity live?' before you ask 'how should this work be designed?'" },
    ],
    when: [
      { heading: "When to design/redesign", body: "At the start of any enterprise-level transformation. Revisit when: the business strategy shifts materially, after M&A integration, when the current model creates friction that limits execution speed, or when the cost of shared services exceeds internal benchmarks." },
    ],
    why: [
      { heading: "Why it matters", body: "An operating model is the primary lever for organizational efficiency at scale. The difference between a well-designed and poorly designed operating model can be 15-25% of total operating cost — that's the difference between a centralized shared services model (lower cost, slower response) and a fully decentralized model (higher cost, faster response). Getting this right is worth more than most technology investments." },
    ],
    how: [
      { heading: "How to use", body: "1. Start with the Configurator tab — select your industry to auto-load relevant functions and operating units. 2. Browse the Blueprint tab to see the 5-layer architecture for each function. 3. Use Capability Maturity to rate current vs. target state for each capability. 4. Define Service Model to determine which capabilities are centralized, decentralized, or federated. 5. Use Decision Rights (RAPID) to clarify who makes which decisions." },
    ],
    terminology: [
      { term: "Archetype", def: "The structural pattern: Functional (organized by discipline), Divisional (by product/geography), Matrix (dual reporting), Platform (shared platforms + embedded teams), Network (distributed autonomous units)." },
      { term: "Centralized", def: "Activities performed by a single global team serving the entire organization." },
      { term: "Federated", def: "Hybrid model with centers of expertise setting standards while embedded teams execute locally." },
      { term: "RAPID", def: "Decision framework: Recommend, Agree, Perform, Input, Decide — clarifies who plays which role in each decision." },
    ],
    bestPractices: [
      "Start with the archetype that best fits your strategy — a growth company needs a different model than a cost-optimization play",
      "Don't centralize everything — only centralize activities where consistency matters more than speed",
      "Use the maturity assessment to prioritize: close gaps in 'Core' capabilities before investing in 'Enabling'",
    ],
    pitfalls: [
      "Copying another company's operating model without adapting to your strategy and culture",
      "Over-centralizing to cut costs without considering the impact on business responsiveness",
      "Defining the operating model in theory but not changing the actual decision rights, budgets, and reporting lines that make it real",
    ],
    related: ["design", "jobarch", "simulate", "plan"],
    scenario: "A global consumer products company used the Operating Model Lab to redesign their Finance function. They moved from a fully decentralized model (each business unit had its own finance team) to a Platform model (shared FP&A CoE setting standards, with embedded Business Partners in each unit). The Capability Maturity assessment showed their 'Analytics' capability at 1.5/5 — they invested in a centralized analytics team that served all units. Within 12 months, the restructured model reduced Finance headcount by 18% while improving forecast accuracy by 25%.",
  },

  mgrcap: {
    title: "Manager Capability Assessment",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Assesses manager readiness to lead transformation — identifies champions who can drive change, at-risk managers who need support, and the correlation between manager capability and team outcomes.",
    who: [
      { heading: "Who is this for?", body: "CHROs, L&D teams, and transformation leads who need to know which managers can drive change and which need intervention." },
    ],
    what: [
      { heading: "What it measures", body: "Manager effectiveness across categories: Transformation Champions (score 4+), Developing (score 2.5-4), and Flight Risk (score below 2.5). The assessment also correlates manager scores with their team's AI readiness — high-capability managers typically have teams with 1.5-2x higher readiness scores." },
    ],
    where: [
      { heading: "Position", body: "Diagnose phase. The results inform Manager Development plans (Mobilize) and Change Readiness segmentation." },
    ],
    when: [
      { heading: "When to assess", body: "Before any transformation rollout. Managers are the primary channel for change communication — if they're not ready, the transformation won't reach the front line." },
    ],
    why: [
      { heading: "Why managers matter", body: "Research consistently shows that the single biggest predictor of team-level transformation adoption is the direct manager's capability and disposition. A McKinsey study found that transformations with strong middle management engagement are 6x more likely to succeed." },
    ],
    how: [
      { heading: "How to use", body: "1. Upload workforce data with org hierarchy (Manager ID). 2. Review the capability scorecard. 3. Identify Champions — deploy them as change agents. 4. Identify Flight Risks — engage immediately with executive coaching. 5. Use the Team Correlation panel to demonstrate the business case for manager development investment." },
    ],
    terminology: [
      { term: "Champion", def: "A manager scoring 4+ who can be deployed as a change agent — they influence peers and model the desired behaviors." },
      { term: "Flight Risk", def: "A manager scoring below 2.5 who is likely to resist or undermine transformation. Requires immediate engagement." },
    ],
    bestPractices: [
      "Deploy Champions at a 1:5 ratio (1 champion supporting 5 peers/teams) for maximum reach",
      "Don't ignore Flight Risk managers — they can poison entire functions if not engaged",
      "The most effective intervention for mid-range managers (2.5-4) is structured peer learning with Champions",
    ],
    pitfalls: [
      "Using scores punitively rather than developmentally — the goal is to grow capability, not rank people",
      "Assuming all Champions are willing to take on change agent roles — ask, don't assign",
    ],
    related: ["changeready", "mgrdev", "readiness", "plan"],
    scenario: "A technology company assessed 85 managers. 18 scored as Champions (21%), 52 as Developing (61%), and 15 as Flight Risk (18%). The Flight Risk cohort included 3 VPs — senior enough to significantly impact adoption. The CHRO launched a targeted engagement: executive coaching for the 3 VPs, a peer learning program pairing Champions with Developing managers, and a 'Leading Through Change' workshop series. After 4 months, 11 of the 15 Flight Risks had moved to Developing, and the 2 who didn't were offered graceful exits.",
  },

  changeready: {
    title: "Change Readiness Assessment",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Segments the workforce into four change-readiness quadrants based on willingness and ability to adopt AI-driven transformation. Drives targeted intervention strategies.",
    who: [
      { heading: "Who is this for?", body: "Change Management practitioners, HR Business Partners, and transformation leads designing intervention strategies." },
    ],
    what: [
      { heading: "The 4-Quadrant Model", body: "High Readiness + High Impact = Champions (30-40% in healthy orgs): deploy as advocates. High Readiness + Low Impact = Supporters: inform and maintain engagement. Low Readiness + Low Impact = Observers: monitor, low-touch engagement. Low Readiness + High Impact = High Risk (<15% target): intensive support needed — these are employees most affected by change who are least prepared for it." },
      { heading: "Benchmarks", body: "Healthy distribution: 30-40% Champions, 25-30% Supporters, 15-25% Observers, <15% High Risk. If High Risk exceeds 25%, slow down the transformation timeline — the organization can't absorb change at that pace." },
    ],
    where: [
      { heading: "Position", body: "Mobilize phase — after readiness assessment, before change plan creation." },
    ],
    when: [
      { heading: "When to assess", body: "Before finalizing the transformation roadmap. Reassess quarterly — people move between quadrants as training and communication take effect." },
    ],
    why: [
      { heading: "Why segmentation matters", body: "A one-size-fits-all change approach wastes resources on Champions who don't need it and under-serves High Risk employees who do. Segmented interventions are 3x more effective per dollar spent." },
    ],
    how: [
      { heading: "How to use", body: "1. Review the 4-quadrant visualization. 2. Click each quadrant to see the employees within it. 3. Each quadrant has prescribed intervention strategies. 4. Use the Intervention Calendar to plan manager-level and employee-level activities. 5. Track movement between quadrants over time." },
    ],
    terminology: [
      { term: "Change Agent", def: "An employee (often a Champion) formally assigned to support transformation adoption within their team or function." },
      { term: "Intervention Density", def: "The number and frequency of change activities directed at a segment — High Risk segments need 3-5x the density of Champions." },
    ],
    bestPractices: [
      "Deploy Champions as peer mentors to High Risk employees — peer influence is more effective than top-down messaging",
      "Focus 50% of change management budget on the High Risk quadrant — they determine whether the transformation stalls",
      "Communicate differently to each quadrant: Champions want details and timelines, High Risk employees want reassurance and support",
    ],
    pitfalls: [
      "Ignoring the Observers quadrant — they're low-priority individually but collectively can shift the culture if neglected",
      "Treating change readiness as static — regular reassessment is essential to track progress",
    ],
    related: ["readiness", "mgrcap", "mgrdev", "plan"],
    scenario: "A healthcare organization assessed 5,500 employees. The initial distribution was alarming: only 18% Champions, 22% Supporters, 32% Observers, and 28% High Risk. The 28% High Risk figure was above the 15% threshold, triggering a revised timeline (extended from 12 to 18 months). The change team deployed 45 Champions as 'Transformation Ambassadors' with structured weekly touchpoints to High Risk employees. After 3 months, High Risk dropped to 19% — still above target but trending in the right direction. The full transformation timeline held.",
  },

  bbba: {
    title: "Build/Buy/Borrow/Automate",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Talent sourcing strategy framework — recommends whether to Build (reskill), Buy (hire), Borrow (contract), or Automate for each redesigned role based on skill adjacency and cost analysis.",
    who: [
      { heading: "Who is this for?", body: "Talent Acquisition teams, Total Rewards, Workforce Planning, and functional leaders making staffing decisions for the future state." },
    ],
    what: [
      { heading: "The BBBA framework", body: "Build: reskill existing employees into the new role (lowest cost, highest retention, but takes time). Buy: hire externally (fastest, but highest cost and cultural integration risk). Borrow: engage contractors/consultants for transitional needs (flexible, but no long-term capability building). Automate: replace the role's functions with technology (highest upfront cost, but lowest ongoing cost and zero headcount)." },
    ],
    where: [
      { heading: "Position", body: "Design phase, after work design and skill adjacency mapping. Feeds directly into Headcount Planning and Reskilling Pathways." },
    ],
    when: [
      { heading: "When to decide", body: "After completing skill gap analysis and adjacency mapping for the roles in question. Don't make BBBA decisions without data — gut-feel sourcing decisions cost an average of 30% more than data-driven ones." },
    ],
    why: [
      { heading: "Why it matters", body: "Each BBBA decision has dramatically different cost profiles: Build typically costs $5-15K per employee (training investment). Buy costs $15-50K (recruiting cost) plus 20-30% first-year salary premium. Borrow costs 1.5-3x the equivalent salary rate. Automate costs vary wildly but typically $50-200K per role automated with 2-3 year payback." },
    ],
    how: [
      { heading: "How it works", body: "1. For each redesigned role, the system checks the adjacency map — are there internal candidates with 60%+ skill match? 2. If yes → recommend Build. If no but the role is temporary → recommend Borrow. If permanent with no internal matches → recommend Buy. If the role's tasks are >80% automatable → recommend Automate. 3. Override any recommendation manually if context requires it. 4. The investment summary shows total cost by disposition category." },
    ],
    terminology: [
      { term: "Adjacency Score", def: "The percentage of target role skills that an internal candidate already possesses." },
      { term: "Reskilling Cost", def: "Estimated investment to close skill gaps for a Build candidate — typically $5-15K including training materials, lost productivity, and mentoring time." },
    ],
    bestPractices: [
      "Default to Build wherever adjacency is 50%+ — it's cheaper and better for morale than external hiring",
      "Use Borrow strategically for roles you need in 6 months but won't need in 18 months",
      "The Automate decision should be driven by the work design data, not by headcount reduction targets",
    ],
    pitfalls: [
      "Choosing Buy because it's faster without considering the 30-50% probability that the external hire doesn't work out",
      "Under-investing in Build — saving $10K on training only to spend $50K on recruiting when the reskilling candidate leaves",
    ],
    related: ["skills", "headcount", "reskill", "marketplace", "design"],
    scenario: "A financial services firm analyzed 25 redesigned roles. BBBA recommendations: 12 Build (strong internal adjacency), 5 Buy (niche technical skills unavailable internally), 3 Borrow (transitional data migration roles), 5 Automate (fully automatable processes). Total investment: Build $180K, Buy $750K, Borrow $360K, Automate $1.2M. The 3-year ROI on the Automate bucket alone was 340% — the 5 automated roles freed $2.1M in annual labor costs against a $1.2M investment.",
  },

  headcount: {
    title: "Headcount Planning",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Current-to-future workforce waterfall showing the net FTE impact of AI transformation. The chart every CFO and CHRO needs to see.",
    who: [
      { heading: "Who is this for?", body: "CFOs (budget impact), CHROs (people impact), board members (strategic investment), and transformation PMOs (planning)." },
    ],
    what: [
      { heading: "The waterfall", body: "Starting Headcount → Roles Automated (reduced) → Natural Attrition (absorbed) → Internal Redeployment (moved) → External Hires (added) → Net Future Headcount. This single chart tells the complete story of workforce transformation." },
      { heading: "Financial impact", body: "Each waterfall segment has a dollar value: automation saves labor cost, attrition avoids severance, redeployment preserves institutional knowledge, and new hires bring critical capabilities. The net financial impact is the sum." },
    ],
    where: [
      { heading: "Position", body: "Design phase, after BBBA decisions. This is the culmination of all the Design work — the quantified answer to 'what happens to the workforce?'" },
    ],
    when: [
      { heading: "When to produce", body: "After completing BBBA dispositions for at least the high-impact roles. This chart is typically required for steering committee approval before any transformation begins." },
    ],
    why: [
      { heading: "Why the waterfall matters", body: "It's the most important single visual in any transformation. It transforms abstract concepts ('AI will change how we work') into concrete numbers ('we'll need 15% fewer FTEs in Operations but 10% more in Technology'). It also de-risks the conversation by showing that natural attrition absorbs a significant portion of headcount changes — typically 5-12% annually." },
    ],
    how: [
      { heading: "How to read it", body: "Green bars are additions. Red bars are reductions. The net change (right-most bar) is what matters for budgeting. If net change is small or positive despite significant automation, that's a 'growth transformation' — capacity freed is reinvested in new capabilities rather than headcount reduction." },
    ],
    terminology: [
      { term: "Natural Attrition", def: "Employees who leave voluntarily (resignation, retirement) during the transformation period. Typically 5-12% annually. This is 'free' headcount reduction with no severance cost." },
      { term: "Net Change %", def: "The percentage change in total headcount from current to future state. This is the CFO's key metric." },
    ],
    bestPractices: [
      "Model attrition absorption explicitly — it's the single biggest tool for making headcount changes humane",
      "Present the waterfall BEFORE discussing specific role eliminations — set the context first",
      "Always show the financial impact below the waterfall — numbers without dollars lack impact",
    ],
    pitfalls: [
      "Presenting gross reductions without showing natural attrition offset — this creates unnecessary alarm",
      "Ignoring the cost of new hires needed for future-state roles — net headcount might decrease while net cost increases",
    ],
    related: ["bbba", "simulate", "design", "export"],
    scenario: "A manufacturing company's waterfall: Starting HC 3,800 → Automation -280 → Attrition -190 → Redeployment 0 → New Hires +45 → Future HC 3,375 (net -11.2%). The key insight: natural attrition (190) absorbed 68% of the automation-driven reduction (280), meaning only 90 positions needed active workforce transition management. The $8.5M annual savings from automation funded the $2.1M reskilling investment with 18-month payback.",
  },

  reskill: {
    title: "Reskilling Pathways",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Personalized learning plans for every employee identified for reskilling. Includes timeline, investment estimate, skill gap closure tracking, and priority scoring.",
    who: [
      { heading: "Who is this for?", body: "L&D teams deploying training programs, HR Business Partners guiding individual career transitions, employees navigating their own development, and CFOs approving training budgets." },
    ],
    what: [
      { heading: "What it produces", body: "Per-employee reskilling pathway showing: target role, current skill proficiency vs. required, specific skill gaps to close, estimated training duration (months), estimated cost, readiness score, and a composite priority score (higher priority = bigger gap + higher business impact + stronger baseline)." },
    ],
    where: [
      { heading: "Position", body: "Mobilize phase. Consumes BBBA 'Build' decisions and skills adjacency data. Outputs feed into the Change Planner timeline and budget." },
    ],
    when: [
      { heading: "When to deploy", body: "After BBBA decisions identify who is being reskilled into what roles. The pathways should be communicated to employees as part of the transformation announcement — people need to see their personal growth path to buy into the change." },
    ],
    why: [
      { heading: "Why reskilling > hiring", body: "External hiring fails 40-50% of the time within 18 months (Glassdoor research). Internal reskilling retains institutional knowledge, costs 50-80% less, and signals to the rest of the workforce that the company invests in people. It's the single most effective lever for maintaining morale during transformation." },
    ],
    how: [
      { heading: "How to use", body: "1. Review pathways sorted by priority score. 2. Group employees into cohorts for efficient training delivery (e.g., all Finance employees needing 'Process Automation' skills). 3. Estimate total budget by summing per-employee costs. 4. Build the training timeline into the Change Planner. 5. Track skill gap closure quarterly." },
    ],
    terminology: [
      { term: "Priority Score", def: "Composite metric: (business impact of target role × size of skill gap × employee readiness score). Higher = train first." },
      { term: "Reskilling Cost", def: "Estimated total cost including: training materials/licenses, facilitator time, employee time away from work, and mentoring overhead." },
    ],
    bestPractices: [
      "Group reskilling into cohorts of 10-20 for efficiency — individual pathways are personalized, but delivery should be batched",
      "Set a 6-month maximum for any single reskilling pathway — longer than that and motivation drops significantly",
      "Include 'learn by doing' components: 50% structured learning, 30% on-the-job application, 20% peer mentoring",
    ],
    pitfalls: [
      "Creating pathways without employee input — people need agency in their development",
      "Under-estimating the productivity dip during reskilling — budget for 15-20% productivity loss during training months",
    ],
    related: ["skills", "bbba", "marketplace", "plan", "changeready"],
    scenario: "A retail bank identified 120 employees for reskilling from Operations to Digital roles. The pathways grouped them into 3 cohorts: 45 high-readiness employees (3-month fast track to Digital Operations Analyst), 55 moderate-readiness (6-month full program to Digital Services Specialist), and 20 low-readiness (9-month intensive with dedicated mentoring to Digital Process Designer). Total investment: $1.8M. After 12 months, 92% of fast-track, 78% of moderate, and 65% of intensive cohort successfully transitioned — an overall 79% success rate that exceeded the industry average of 60%.",
  },

  marketplace: {
    title: "Talent Marketplace",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Internal matching engine that pairs current employees to redesigned roles based on skill adjacency, readiness, and reskilling potential. Identifies who can fill future-state positions internally.",
    who: [
      { heading: "Who is this for?", body: "Talent Acquisition teams (internal mobility), Workforce Planning (filling future-state org chart), and employees (seeing their career options)." },
    ],
    what: [
      { heading: "What it does", body: "For each redesigned target role, the marketplace scores all internal candidates on a composite metric: Adjacency (skill match %), Readiness (AI/change readiness score), and Reskilling Timeline (estimated months to close gaps). Candidates above a configurable threshold (default 60%) are surfaced as viable internal fills." },
    ],
    where: [
      { heading: "Position", body: "Mobilize phase. Consumes skills adjacency data and readiness assessments. Outputs inform BBBA Build decisions and Reskilling Pathways." },
    ],
    when: [
      { heading: "When to run", body: "After skills inventory is confirmed and adjacency mapping is complete. Run before finalizing BBBA decisions — the marketplace data directly informs whether you can Build or need to Buy." },
    ],
    why: [
      { heading: "Why internal mobility matters", body: "Internal hires ramp 40% faster, are 2x more likely to be high performers in year 1, and cost 50-80% less than external hires (LinkedIn Talent Solutions data). For transformation specifically, internal moves signal 'growth opportunity' rather than 'disruption' — dramatically improving change acceptance." },
    ],
    how: [
      { heading: "How to use", body: "1. Review target roles and their candidate lists. 2. Sort by composite score. 3. Click ☆ to shortlist top candidates. 4. For roles with no candidates above threshold, the system recommends 'External Fill'. 5. Export shortlists for manager review and career conversation planning." },
    ],
    terminology: [
      { term: "Composite Score", def: "Weighted average: Adjacency (40%) + Readiness (30%) + Inverse Reskilling Time (30%). Higher = better candidate." },
      { term: "Fill Recommendation", def: "'Internal Fill' if ≥1 candidate above threshold. 'External Fill' if no candidates meet the bar." },
    ],
    bestPractices: [
      "Set the threshold at 60% for initial screening — you can lower it to 50% if the talent pool is small",
      "Always present internal candidates to hiring managers BEFORE posting externally — this is a best practice and often a policy requirement",
      "Consider 'stretch' assignments: candidates at 50-60% adjacency may succeed with strong onboarding support",
    ],
    pitfalls: [
      "Relying solely on the adjacency score without considering cultural fit, motivation, and career aspirations",
      "Not involving employees in the matching — forced moves without choice create resentment",
    ],
    related: ["skills", "bbba", "reskill", "plan"],
    scenario: "A technology company needed to fill 15 new 'AI Operations Analyst' roles. The Talent Marketplace identified 22 internal candidates with adjacency scores above 65%. 8 had scores above 80% (strong matches from Data Analyst and Business Analyst roles). 14 had scores between 65-80% (moderate matches needing 3-6 months of upskilling). Only 3 of the 15 roles required external hires. The internal fills saved an estimated $450K in recruiting costs and were productive 2 months faster than external hires in similar roles.",
  },

  mgrdev: {
    title: "Manager Development",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Targeted development plans for people managers based on their capability assessment. Converts Flight Risk managers into effective change leaders through structured interventions.",
    who: [
      { heading: "Who is this for?", body: "L&D teams designing leadership programs, HRBPs coaching individual managers, and CHROs investing in management capability." },
    ],
    what: [
      { heading: "What it produces", body: "Personalized development plans with: intervention type (executive coaching, peer learning, workshop series, or mentoring assignment), estimated duration, estimated cost, and expected outcome. Plans are grouped by manager category (Champion, Developing, Flight Risk)." },
    ],
    where: [
      { heading: "Position", body: "Mobilize phase. Consumes Manager Capability Assessment results. The interventions should be scheduled into the Change Planner timeline." },
    ],
    when: [
      { heading: "When to deploy", body: "Manager development should begin BEFORE the broader transformation rollout — managers need to be ready to lead their teams through change. Budget 2-3 months of lead time for Flight Risk interventions." },
    ],
    why: [
      { heading: "Why this is high-leverage", body: "A single manager influences 5-10 direct reports. Investing $15K in developing a Flight Risk manager who becomes a neutral or positive influence saves $50-100K+ in change resistance costs downstream. Manager development is the highest-ROI line item in any transformation budget." },
    ],
    how: [
      { heading: "How to use", body: "1. Review managers grouped by category. 2. For Champions: assign as Change Agents with peer mentoring responsibilities. 3. For Developing: enroll in structured leadership development (Leading Through Ambiguity workshops). 4. For Flight Risks: immediate engagement — executive coaching, career conversation, involvement in design decisions to create ownership." },
    ],
    terminology: [
      { term: "Champion Assignment", def: "Formally designating a high-scoring manager to serve as a transformation advocate and peer coach. Includes dedicated time allocation (typically 10-15% of their schedule)." },
      { term: "Executive Coaching", def: "1:1 engagement with a certified coach for Flight Risk managers. Typically 6-10 sessions over 3-4 months, focused on leading through change." },
    ],
    bestPractices: [
      "Pair every Flight Risk manager with a Champion mentor — peer influence is more effective than HR-driven interventions",
      "Give Champions formal recognition and allocated time — asking them to take on change agent duties without support burns them out",
      "Track manager sentiment monthly during transformation — early warning of manager disengagement saves entire teams from resistance spirals",
    ],
    pitfalls: [
      "Waiting until after the transformation announcement to start manager development — by then, resistance patterns are already set",
      "Using a generic leadership program instead of transformation-specific content — managers need practical tools for the specific changes coming",
    ],
    related: ["mgrcap", "changeready", "plan", "reskill"],
    scenario: "A pharmaceutical company invested $320K in manager development for their 85-person management team. Allocation: 18 Champions ($45K for formal Change Agent training and recognition), 52 Developing ($180K for a 12-week 'Leading AI Transformation' cohort program), 15 Flight Risks ($95K for executive coaching). After 4 months, post-assessment scores showed: Champions maintained (avg 4.3), Developing improved by 0.8 points on average, and Flight Risks improved by 1.2 points (11 of 15 moved to Developing category). The $320K investment was credited with avoiding an estimated $1.5M in change resistance costs (delayed implementations, team turnover, and rework).",
  },

  recommendations: {
    title: "AI Recommendations Engine",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "AI-generated, data-driven transformation recommendations ranked by impact, effort, and organizational readiness. Converts analysis into action.",
    who: [
      { heading: "Who is this for?", body: "Transformation leads who need prioritized action plans, consultants building client recommendations, and executives making investment decisions." },
    ],
    what: [
      { heading: "What it does", body: "Analyzes your workforce data, AI readiness scores, and task-level impact analysis through the Gemini AI engine to generate 8 ranked recommendations. Each recommendation includes: impact score (0-100), effort level (Low/Medium/High), category (Automation/Augmentation/Upskilling/Process/Governance/Data), affected roles, timeframe, and KPIs to track." },
    ],
    where: [
      { heading: "Position", body: "Diagnose phase — synthesizes findings from Workforce Snapshot, AI Opportunity Scan, and Readiness Assessment into actionable recommendations." },
    ],
    when: [
      { heading: "When to generate", body: "After completing the core Discover modules (Snapshot, AI Scan, Readiness). Regenerate after completing the Design phase for more refined recommendations." },
    ],
    why: [
      { heading: "Why AI-generated recommendations?", body: "Human analysts can identify patterns in their focus area, but cross-cutting insights (patterns that span workforce structure, task design, and readiness data simultaneously) are where AI adds unique value. The recommendations surface opportunities that a traditional analysis might miss." },
    ],
    how: [
      { heading: "How to use", body: "1. Click 'Generate Recommendations'. 2. The AI analyzes data from 3 endpoints simultaneously. 3. Review the 8 ranked cards — filter by category or sort by impact/effort. 4. Use Quick Wins (Low effort, High impact) for Wave 1 of the transformation. 5. Strategic Bets (High effort, High impact) are for later waves. 6. Regenerate with different data loaded for fresh perspectives." },
    ],
    terminology: [
      { term: "Impact Score", def: "0-100 rating of the potential business value if the recommendation is implemented. Based on affected population size, time savings potential, and strategic alignment." },
    ],
    bestPractices: [
      "Treat AI recommendations as hypotheses, not conclusions — always validate with subject matter experts",
      "Prioritize recommendations that align with existing strategic priorities — the best recommendation is one that has executive sponsorship",
      "Use the 'Regenerate' button after loading new data or completing additional modules — the recommendations improve with more data",
    ],
    pitfalls: [
      "Accepting AI recommendations without human judgment — the AI doesn't know your political context, culture, or constraint history",
      "Ignoring low-impact recommendations entirely — sometimes 3-4 small wins have more cumulative impact than 1 big bet",
    ],
    related: ["scan", "readiness", "design", "simulate"],
    scenario: "A consumer products company generated recommendations after loading workforce data for their 400-person Operations function. The AI surfaced an unexpected insight: the highest-impact recommendation wasn't automation of routine tasks (which the team had assumed) but rather 'Standardize variance analysis methodology across 4 regional teams' (Impact: 87, Effort: Low). The analysis showed that 4 teams were doing the same work 4 different ways, and standardization alone would free 2,400 hours/year before any AI was deployed. This became their Wave 1 quick win.",
  },

  quickwins: {
    title: "Quick-Win Identifier",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Automatically surfaces the highest-ROI, lowest-effort AI automation opportunities across the organization. The 'start here' tool for every transformation.",
    who: [
      { heading: "Who is this for?", body: "Program managers needing early wins to build credibility, functional leaders seeking fast automation opportunities, and finance teams wanting quick ROI." },
    ],
    what: [
      { heading: "Scoring methodology", body: "Each task is scored on two axes: ROI (time saved × impact level × hourly rate) and Effort (implementation complexity based on task type, logic, and interaction patterns). Quick Wins are high-ROI + low-effort. Strategic Bets are high-ROI + high-effort. Easy Automations are low-ROI + low-effort." },
    ],
    where: [
      { heading: "Position", body: "Design phase — immediately after the AI Opportunity Scan identifies task-level automation potential." },
    ],
    when: [
      { heading: "When to use", body: "At the start of transformation Wave 1. Quick wins typically deliver results in 0-3 months, building organizational confidence and executive support for larger investments." },
    ],
    why: [
      { heading: "Why quick wins matter", body: "The first 90 days of a transformation set the trajectory. Organizations that deliver visible wins early have 4x higher transformation success rates (BCG research). Quick wins also generate the budget and political capital needed for later, more complex initiatives." },
    ],
    how: [
      { heading: "How to use", body: "1. Review the ranked opportunity list. 2. Identify the top 3-5 Quick Wins. 3. Validate feasibility with technology teams. 4. Package as a '90-Day Sprint' for executive approval. 5. Track implementation and savings to build the case for Wave 2." },
    ],
    terminology: [],
    bestPractices: [
      "Choose 3-5 quick wins that span at least 2 functions — this demonstrates cross-organizational value",
      "Prioritize wins that are visible to employees — successful automation that people can see builds adoption momentum",
      "Document ROI precisely — you'll need these numbers to justify larger Phase 2 investments",
    ],
    pitfalls: [
      "Choosing quick wins that are easy but invisible — automating a back-end process nobody sees doesn't build momentum",
      "Declaring victory too early — implement, measure for 4 weeks, then communicate results",
    ],
    related: ["scan", "design", "simulate", "recommendations"],
    scenario: "A professional services firm identified 5 quick wins from their AI Opportunity Scan: (1) Automated expense report processing (450 hrs/month saved, 3-week implementation), (2) AI-generated first-draft proposals (200 hrs/month, 6-week implementation), (3) Automated timesheet reminders and follow-up (80 hrs/month, 1-week implementation), (4) Meeting notes summarization (300 hrs/month, 2-week implementation), (5) Compliance document formatting (120 hrs/month, 4-week implementation). Total: 1,150 hrs/month saved within 90 days. The managing partners were so impressed that they approved a $2M Phase 2 investment — based entirely on the credibility built by these quick wins.",
  },

  dashboard: {
    title: "Transformation Dashboard",
    category: "Overview",
    categoryColor: CAT_COLORS["Overview"],
    summary: "Executive command center showing transformation progress across all phases. Decision log, risk register, and phase completion tracking in one view.",
    who: [
      { heading: "Who is this for?", body: "Executive sponsors, steering committee members, transformation PMOs, and CHROs tracking progress." },
    ],
    what: [
      { heading: "What it shows", body: "Phase completion percentages (Discover/Design/Deliver), decision log (every major decision with timestamp, module, and rationale), risk register (identified risks with probability, impact, and mitigation status), and investment/savings tracking." },
    ],
    where: [
      { heading: "Position", body: "Overview module — accessible from the home page. It's a read-only summary that pulls data from every module." },
    ],
    when: [
      { heading: "When to review", body: "Weekly for active transformations, monthly for steering committee reporting. The dashboard auto-updates as work progresses in other modules." },
    ],
    why: [
      { heading: "Why it matters", body: "Without a unified dashboard, transformation status exists in scattered spreadsheets, slide decks, and email chains. The dashboard provides a single source of truth that all stakeholders can reference." },
    ],
    how: [
      { heading: "How to use", body: "1. Review phase progress bars. 2. Check the decision log for recent decisions (sorted by date). 3. Review open risks and their mitigation status. 4. Use the investment tracker to show ROI progress to stakeholders." },
    ],
    terminology: [
      { term: "Decision Log", def: "Timestamped record of every major decision made during the transformation — what was decided, who decided it, and the rationale." },
      { term: "Risk Register", def: "Living inventory of identified risks with probability (1-5), impact (1-5), and mitigation plan status." },
    ],
    bestPractices: [
      "Review the dashboard in every steering committee meeting — it replaces status update slides",
      "Ensure the risk register is updated weekly — stale risk registers create blind spots",
      "Use the decision log to create accountability — when someone asks 'why did we do that?', the log has the answer",
    ],
    pitfalls: [
      "Treating the dashboard as a reporting tool only — it should drive action when phase progress stalls or new risks emerge",
    ],
    related: ["snapshot", "plan", "export"],
    scenario: "A global bank's CHRO used the Transformation Dashboard in a quarterly board meeting. The dashboard showed: Discover phase 95% complete, Design phase 68% (on track), Deliver phase 22% (Wave 1 in progress). The risk register highlighted 2 critical risks: 'Data migration timeline at risk' and 'Manager capability in Asia Pacific below threshold.' The board approved a $500K additional investment for APAC manager development based on the risk data — a decision that took 5 minutes because the data was clear and credible.",
  },

  build: {
    title: "Org Design Studio",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Reshape organizational structure — model spans, layers, departmental headcount, cost distribution, and structural scenarios side by side.",
    who: [{ heading: "Who is this for?", body: "Org Design specialists, COOs optimizing structure, and HR leaders managing reporting lines. Key stakeholders include functional VPs who own the org structure being modeled." }],
    what: [{ heading: "What it does", body: "Provides 8 analytical views of organizational structure: Overview (KPIs), Span of Control (manager-to-IC ratios), Cost (compensation distribution by level and department), Role Migration (how roles move between scenarios), Layers (management depth), and Scenario Comparison (current vs. 3 redesigned options). Each scenario models headcount changes, cost impact, and structural metrics." }, { heading: "Benchmarks", body: "Healthy spans: 5-8 for operational managers, 3-5 for executive levels. Layers: 5-7 for organizations under 5,000 people. Management ratio: 1:6-8. Cost distribution: <35% of payroll at management+ levels." }],
    where: [{ heading: "Position", body: "Design phase — uses workforce and org hierarchy data. Outputs feed into Headcount Planning and the Change Planner." }],
    when: [{ heading: "When to use", body: "After completing the AI Opportunity Scan and Work Design Lab. Use this to visualize the structural implications of role redesign before committing to headcount changes." }],
    why: [{ heading: "Why it matters", body: "Structural inefficiency (too many layers, too-narrow spans, misaligned reporting) often costs more than the AI automation savings it targets. Fixing structure first amplifies every subsequent intervention." }],
    how: [{ heading: "Step-by-step", body: "1. Review the Current State overview. 2. Click through Span, Cost, and Layers views. 3. Compare 3 auto-generated scenarios (Optimized, Aggressive, Conservative). 4. Use the Role Migration view to see how specific roles move. 5. Select the preferred scenario and export for stakeholder review." }],
    terminology: [{ term: "Span of Control", def: "Number of direct reports per manager. Wider spans = fewer managers = lower cost but potentially less coaching." }, { term: "Layers", def: "The number of management levels from CEO to front-line employee." }],
    bestPractices: ["Model at least 3 scenarios — don't present a single option to leadership", "Focus on the 20% of departments that consume 80% of management cost", "Consider cultural readiness when widening spans — some functions need narrower spans (e.g., new hire-intensive teams)"],
    pitfalls: ["Widening spans without providing management tools (better systems, clearer processes) to compensate", "Cutting layers without addressing the decision-making gaps that creates"],
    related: ["design", "headcount", "simulate", "plan"],
    scenario: "A retail company modeled 3 scenarios for their 800-person Operations function. The Optimized scenario reduced from 6 to 4 management layers, widened average span from 4.2 to 6.8, and eliminated 45 manager positions — saving $6.2M annually. The transition was managed through natural attrition (18 positions) and redeployment to IC specialist roles (27 positions).",
  },

  jobs: {
    title: "Job Catalogue",
    category: "Overview",
    categoryColor: CAT_COLORS["Overview"],
    summary: "Browse the complete inventory of jobs across the organization with career frameworks, span of control analysis, and AI-generated job profiles.",
    who: [{ heading: "Who is this for?", body: "HR teams managing job catalogues, compensation analysts benchmarking roles, and managers understanding role definitions across the organization." }],
    what: [{ heading: "What it shows", body: "Complete job listing with function, family, level, track, and headcount. Includes career framework templates by industry, span of control visualization, and an AI Job Profile Generator that creates detailed role descriptions on demand." }],
    where: [{ heading: "Position", body: "Discover phase — provides the role inventory that feeds into Work Design Lab, Skills Analysis, and BBBA decisions." }],
    when: [{ heading: "When to use", body: "At the start of any engagement to understand the current role landscape. Review after any restructuring or when preparing for compensation benchmarking." }],
    why: [{ heading: "Why it matters", body: "A clean, well-organized job catalogue is the foundation for every talent process — compensation, career pathing, succession planning, and workforce planning all depend on consistent role definitions." }],
    how: [{ heading: "How to use", body: "1. Browse jobs by function using the distribution chart. 2. Use the career framework templates for leveling guidance. 3. Generate AI job profiles for any role by entering the title. 4. Review span of control distribution to identify structural issues." }],
    terminology: [{ term: "Job Family", def: "A grouping of related roles that share similar skills, knowledge areas, and career progression paths." }],
    bestPractices: ["Ensure every role has a clear job family assignment before proceeding to design work", "Use AI-generated profiles as starting points, not final versions — always validate with incumbents"],
    pitfalls: ["Having more unique job titles than necessary — aim for 1 title per 15-20 employees", "Treating the job catalogue as HR-only data — functional leaders need visibility too"],
    related: ["jobarch", "snapshot", "skills", "design"],
    scenario: "A professional services firm discovered they had 280 unique job titles for 1,800 employees. After rationalization using the Job Catalogue analysis, they consolidated to 95 titles — improving market benchmarking accuracy and enabling clearer career paths that reduced voluntary turnover by 12%.",
  },

  rolecompare: {
    title: "Role Comparison",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Side-by-side comparison of 2-4 roles showing task composition, AI impact, skills requirements, and redesign outcomes. Essential for identifying consolidation candidates.",
    who: [{ heading: "Who is this for?", body: "Org Design specialists evaluating role overlap, managers differentiating similar positions, and compensation teams ensuring consistent leveling." }],
    what: [{ heading: "What it shows", body: "For each selected role: task count, time allocation breakdown, AI-automatable percentage, top tasks by time, skill requirements, and (if processed through Work Design Lab) the redesigned role profile with human vs. AI time split." }, { heading: "What to look for", body: "Roles with >70% task overlap are consolidation candidates. Roles with similar AI impact but different levels may indicate inconsistent leveling. Roles in different families with high overlap suggest organizational silos." }],
    where: [{ heading: "Position", body: "Design phase — accessible from any job profile via the 'Compare' button. Best used after running several roles through the Work Design Lab." }],
    when: [{ heading: "When to compare", body: "When you suspect role overlap, when designing a job family structure, or when calibrating levels across functions." }],
    why: [{ heading: "Why comparison matters", body: "Without structured comparison, role overlap goes undetected. Organizations typically have 10-20% redundant roles that could be consolidated — this is one of the easiest efficiency gains in any transformation." }],
    how: [{ heading: "How to use", body: "1. Select 2-4 roles from the picker. 2. Review the side-by-side metrics. 3. Look for high overlap in tasks, skills, or time allocation. 4. For high-overlap pairs, recommend consolidation in the future-state design. 5. Save the comparison snapshot to the decision log." }],
    terminology: [{ term: "Similarity Score", def: "Percentage of shared tasks/responsibilities between two roles. >70% suggests consolidation potential." }],
    bestPractices: ["Compare roles within the same family first, then cross-family", "Document the rationale for keeping similar roles separate — 'they report to different VPs' is not sufficient justification"],
    pitfalls: ["Consolidating roles based solely on title similarity without analyzing task composition", "Ignoring geographic or regulatory differences that justify role separation"],
    related: ["design", "jobarch", "bbba", "skills"],
    scenario: "A bank compared 'Credit Analyst' and 'Risk Analyst' — roles in different departments. The comparison showed 72% task overlap, identical skill requirements, and similar AI impact scores. The team recommended consolidation into a single 'Credit & Risk Analyst' role family, eliminating 15 redundant positions across the organization and creating a clearer career path for the remaining 45 employees.",
  },

  orghealth: {
    title: "Org Health Scorecard",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Auto-calculated organizational health metrics benchmarked against industry standards — a diagnostic snapshot of leadership, culture, digital maturity, process standardization, and data quality.",
    who: [{ heading: "Who is this for?", body: "CHROs and CPOs who need a quick health check, transformation sponsors who need to understand organizational readiness before designing interventions, and HR Business Partners who want to benchmark their function against peers." }],
    what: [
      { heading: "What it measures", body: "Composite scores across five dimensions: leadership alignment, cultural adaptability, digital maturity, process standardization, and data quality. Each dimension is scored 0-100 and compared against industry benchmarks derived from aggregated anonymized data." },
      { heading: "Traffic light system", body: "Green metrics are within or above industry benchmarks. Yellow metrics are below average but recoverable with targeted intervention. Red metrics indicate critical gaps requiring immediate attention before transformation can proceed." },
    ],
    where: [{ heading: "Position in workflow", body: "Diagnose phase — provides the baseline organizational health assessment that informs where to focus diagnostic deep-dives (AI Readiness, Manager Capability, Change Readiness)." }],
    when: [{ heading: "When to use", body: "At the start of any engagement as a health check. Revisit quarterly during transformation to track improvement. Use before major go/no-go decisions." }],
    why: [{ heading: "Why it matters", body: "Organizations that skip the health assessment often discover critical blockers mid-transformation — low leadership alignment, poor data quality, or rigid culture. The scorecard surfaces these risks early so they can be addressed proactively." }],
    how: [{ heading: "How to use", body: "1. Review the overall health score. 2. Select industry benchmark for comparison. 3. Identify red/yellow dimensions. 4. Drill into each dimension to see component metrics. 5. Use findings to prioritize diagnostic deep-dives." }],
    terminology: [
      { term: "Digital Maturity", def: "The degree to which an organization has adopted digital tools, data-driven decision-making, and automated workflows." },
      { term: "Process Standardization", def: "How consistently processes are defined, documented, and followed across the organization." },
    ],
    bestPractices: ["Run the scorecard before any transformation design work", "Compare against your specific industry, not all-industry averages"],
    pitfalls: ["Ignoring yellow metrics because they're 'not red yet'", "Using the scorecard as a one-time assessment rather than a tracking tool"],
    related: ["snapshot", "readiness", "changeready", "mgrcap"],
    scenario: "A healthcare organization scored 42/100 on digital maturity and 68/100 on cultural adaptability. The low digital maturity score triggered an immediate data quality remediation before proceeding with AI-powered workforce analytics. The high cultural adaptability score gave confidence that the workforce would accept change once the digital infrastructure was in place.",
  },

  heatmap: {
    title: "AI Impact Heatmap",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Visualizes automation potential across the intersection of functions and job families — a strategic map showing where AI creates the most value and where human expertise remains essential.",
    who: [{ heading: "Who is this for?", body: "Transformation leads deciding where to focus first, function heads evaluating their team's exposure, and strategy teams building the business case for AI investment." }],
    what: [
      { heading: "How it works", body: "Each cell in the function × job family matrix receives a composite AI impact score based on the task characteristics of roles at that intersection. Scores combine automation potential, time savings, and feasibility." },
      { heading: "Color coding", body: "Red/orange cells (score 6+) indicate high automation potential — these are quick wins. Yellow cells (3.5-6) indicate moderate potential, typically augmentation rather than full automation. Green/blue cells (below 3.5) indicate human-intensive work." },
    ],
    where: [{ heading: "Position in workflow", body: "Diagnose phase — the heatmap provides strategic direction for the Design phase. Hot cells tell you which roles to deconstruct first in the Work Design Lab." }],
    when: [{ heading: "When to use", body: "After uploading work design data with function and job family columns. Use it to prioritize which areas of the organization to analyze first." }],
    why: [{ heading: "Why it matters", body: "Without a heatmap, organizations often start AI transformation in the wrong place — automating low-impact work while ignoring high-impact opportunities. The heatmap ensures you invest in the highest-value areas first." }],
    how: [{ heading: "How to use", body: "1. Identify the hottest cells (highest scores). 2. Click any cell to see underlying task data. 3. Cross-reference with headcount to estimate total impact. 4. Use findings to prioritize Work Design Lab analysis." }],
    terminology: [{ term: "Composite AI Score", def: "A weighted combination of automation potential (task characteristics), time impact (hours saved), and implementation feasibility." }],
    bestPractices: ["Focus on cells with both high scores AND high headcount", "Use the heatmap to build your transformation sequencing plan"],
    pitfalls: ["Automating everything that's red without considering organizational readiness", "Ignoring moderate-impact cells that could be quick wins due to low complexity"],
    related: ["scan", "design", "simulate"],
    scenario: "A manufacturing firm's heatmap showed Finance × FP&A as the hottest cell (score 8.2) while Operations × Quality Control was cool (2.1). This redirected the transformation focus from the expected target (factory floor automation) to the actual opportunity (financial process automation), saving 6 months of misdirected effort.",
  },

  clusters: {
    title: "Role Clustering",
    category: "Diagnose",
    categoryColor: CAT_COLORS["Diagnose"],
    summary: "Groups similar roles by task composition, skill requirements, and AI impact profiles — reveals hidden organizational redundancy and consolidation opportunities.",
    who: [{ heading: "Who is this for?", body: "Org design specialists looking for structural simplification opportunities, HR leaders evaluating role proliferation, and compensation teams seeking to rationalize job families." }],
    what: [
      { heading: "How clustering works", body: "Roles are compared on task overlap percentage, shared characteristics (task type, logic, interaction patterns), and AI impact similarity. The algorithm groups roles that share >50% of their task DNA." },
      { heading: "Consolidation candidates", body: "Clusters with >70% overlap are flagged as consolidation candidates. These represent roles in different functions that essentially do the same work under different titles — a common source of organizational complexity." },
    ],
    where: [{ heading: "Position in workflow", body: "Diagnose phase — clustering informs the Job Architecture review and Design phase. Consolidation candidates feed into role redesign and headcount planning." }],
    when: [{ heading: "When to use", body: "After work design data is uploaded and task characteristics are populated. Most valuable before starting the Work Design Lab, as it identifies which roles can be merged." }],
    why: [{ heading: "Why it matters", body: "Most organizations have 30-40% more unique role titles than they need. Clustering reveals this hidden redundancy, enabling simplification that improves career path clarity, reduces compensation benchmarking complexity, and makes AI transformation more tractable." }],
    how: [{ heading: "How to use", body: "1. Review clusters by size. 2. Focus on consolidation candidates (>70% overlap). 3. Validate with functional leaders whether the overlap is real. 4. Feed confirmed consolidations into Job Architecture redesign. 5. Use merged roles as input to Work Design Lab." }],
    terminology: [
      { term: "Task Overlap", def: "The percentage of tasks shared between two roles, weighted by time allocation." },
      { term: "Consolidation Candidate", def: "A cluster of roles with >70% overlap that could potentially be merged into a single role family." },
    ],
    bestPractices: ["Validate cluster findings with people who actually do the work", "Start with the largest clusters for maximum impact"],
    pitfalls: ["Assuming high overlap always means the roles should merge — context matters", "Consolidating roles without considering career path implications"],
    related: ["jobarch", "design", "headcount", "skills"],
    scenario: "A technology company discovered that 'Business Analyst', 'Data Analyst', and 'Reporting Analyst' across three different functions shared 78% of their tasks. After merging into a single 'Analytics Specialist' family with function-specific sub-families, they reduced from 45 unique titles to 12, improved internal mobility by 40%, and simplified their compensation structure.",
  },

  om_canvas: {
    title: "OM Design Canvas",
    category: "Design",
    categoryColor: CAT_COLORS["Design"],
    summary: "Visual drag-and-drop canvas for designing operating model structures with FTE deltas, layer visualization, and KPI linkage. Accessed from within the Operating Model Lab.",
    who: [{ heading: "Who is this for?", body: "Operating model designers, COOs, and transformation architects who need a visual workspace to design and iterate on organizational structures." }],
    what: [{ heading: "What it does", body: "Interactive canvas with draggable nodes representing organizational units (CoEs, Shared Services, Business Units, AI nodes). Each node shows current and target FTE, enabling delta visualization. Supports multiple industry-specific presets and custom node creation." }],
    where: [{ heading: "Position", body: "Accessed from the Operating Model Lab's blueprint view. It's a detailed design workspace for the structure visualized in the blueprint." }],
    when: [{ heading: "When to use", body: "After selecting the operating model archetype and industry configuration. Use this to design the specific node layout and FTE allocation for the future state." }],
    why: [{ heading: "Why visual design matters", body: "Operating model decisions involve complex trade-offs between centralization, cost, speed, and control. A visual workspace makes these trade-offs tangible — stakeholders can see the structural implications of their choices." }],
    how: [{ heading: "How to use", body: "1. Start from a preset (industry-specific template) or blank canvas. 2. Drag nodes to arrange the structure. 3. Edit node properties (name, type, FTE). 4. Use the version system to save and compare iterations. 5. Link KPIs to nodes for strategic alignment." }],
    terminology: [{ term: "CoE (Center of Excellence)", def: "A centralized team of specialists that sets standards, develops methodologies, and provides expertise to the broader organization." }],
    bestPractices: ["Start from the industry preset closest to your current structure, then modify", "Save versions frequently — the canvas supports full version history"],
    pitfalls: ["Designing the ideal structure without considering transition feasibility", "Creating too many specialized nodes — simplicity in operating models is a feature, not a limitation"],
    related: ["opmodel", "design", "jobarch"],
    scenario: "A financial services firm used the canvas to redesign their HR operating model from a decentralized structure (HR teams in each business unit) to a platform model (central CoEs + embedded HRBPs). The canvas visualization showed the FTE shift: -35 from business unit HR teams, +12 to CoEs, +8 to shared services, net -15 FTE with improved service consistency.",
  },

  story: {
    title: "Transformation Story Builder",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Auto-generates executive-ready transformation narratives synthesizing all platform data into coherent stories for board presentations, all-hands meetings, and investor updates.",
    who: [{ heading: "Who is this for?", body: "Transformation leads preparing executive communications, CHROs presenting to the board, program managers crafting all-hands narratives, and investor relations teams framing strategic workforce changes." }],
    what: [
      { heading: "What it does", body: "Pulls KPIs from Overview, findings from Diagnose, redesign outcomes from Design, financial projections from Simulate, and change plans from Mobilize. Synthesizes everything into a structured narrative with headline, overview, key findings, recommendations, projected impact, risks, and next steps." },
      { heading: "Tone options", body: "Board Presentation: formal, data-heavy, ROI-focused with financial metrics prominent. All-Hands: motivational, employee-centric, emphasizing opportunity and support. Investor Update: strategic, growth-positioning, competitive advantage framing." },
    ],
    where: [{ heading: "Position in workflow", body: "Mobilize phase — used after all analytical modules are complete. The story builder is most powerful when it can draw from a full dataset across all modules." }],
    when: [{ heading: "When to use", body: "Before major stakeholder communications. Generate once the core analysis is done (Diagnose + Design + Simulate at minimum), then refine for each audience." }],
    why: [{ heading: "Why it matters", body: "Data without narrative is noise. The most rigorous analysis fails if it can't be communicated compellingly. This tool bridges the gap between analytics and persuasion, ensuring your transformation story is both data-grounded and emotionally resonant." }],
    how: [{ heading: "How to use", body: "1. Select a tone (Board, All-Hands, Investor). 2. Click Generate — the AI synthesizes all available data. 3. Review the narrative for accuracy. 4. Edit any sections that need refinement. 5. Copy to clipboard or use in presentations." }],
    terminology: [{ term: "Transformation Narrative", def: "A structured story that connects the 'why' (business case), 'what' (scope of change), 'how' (implementation plan), and 'so what' (expected outcomes) of a workforce transformation." }],
    bestPractices: ["Generate for all three tones to see which framing resonates best", "Always fact-check AI-generated numbers against your actual data"],
    pitfalls: ["Using the raw AI output without editing — it's a starting point, not a finished product", "Presenting the same narrative to all audiences without tone adaptation"],
    related: ["plan", "simulate", "export"],
    scenario: "A CHRO used the Story Builder to prepare for a board meeting about their AI transformation. The Board tone generated a narrative focused on $4.2M in projected savings, 28% capacity freed for innovation, and a 10-month payback period. The same data, re-generated in All-Hands tone, emphasized career growth opportunities, new role creation, and comprehensive reskilling support. Both narratives drew from identical analytics but resonated with their respective audiences.",
  },

  archetypes: {
    title: "Readiness Archetypes",
    category: "Mobilize",
    categoryColor: CAT_COLORS["Mobilize"],
    summary: "Segments the workforce into behavioral profiles — Early Adopters, Pragmatic Majority, Skeptics, and Active Resistors — with tailored engagement strategies for each group.",
    who: [{ heading: "Who is this for?", body: "Change management leads designing engagement strategies, HR Business Partners planning interventions, internal communications teams crafting targeted messaging, and program managers allocating support resources." }],
    what: [
      { heading: "The four archetypes", body: "Early Adopters (15-20% of workforce): high readiness, embrace change, actively seek new tools. Pragmatic Majority (40-50%): willing but cautious, need evidence and peer validation. Skeptics (20-25%): resistant but persuadable with data, transparency, and demonstrated wins. Active Resistors (5-15%): deeply opposed, need intensive one-on-one intervention and often have legitimate concerns worth hearing." },
      { heading: "Engagement playbooks", body: "Each archetype has a specific engagement strategy: communication channels, message framing, support intensity, training approach, and escalation triggers. The playbooks are research-backed and drawn from large-scale transformation case studies." },
    ],
    where: [{ heading: "Position in workflow", body: "Mobilize phase — complements the Change Readiness quadrant analysis with a qualitative, behavioral lens. Use alongside Change Planner for a complete people strategy." }],
    when: [{ heading: "When to use", body: "After AI Readiness and Change Readiness assessments are complete. The archetypes provide the 'personality' layer on top of the quantitative readiness scores." }],
    why: [{ heading: "Why it matters", body: "Quantitative readiness scores tell you who is ready; archetypes tell you why they are or aren't. A Skeptic with a readiness score of 2.5 needs a fundamentally different approach than an Active Resistor with the same score. The archetype determines the intervention, not just the score." }],
    how: [{ heading: "How to use", body: "1. Review the workforce distribution across archetypes. 2. Read each archetype's engagement playbook. 3. Cross-reference with Change Readiness quadrants. 4. Design targeted communication and support plans. 5. Assign Change Champions (from Early Adopters) to each team." }],
    terminology: [
      { term: "Change Champion", def: "An Early Adopter who is formally designated to advocate for transformation within their team, provide peer support, and surface concerns to leadership." },
      { term: "Proof Point", def: "A concrete, visible success story from an early pilot that demonstrates the value of transformation — critical for converting Pragmatics and Skeptics." },
    ],
    bestPractices: ["Don't treat Resistors as problems — their concerns often reveal real issues that need addressing", "Deploy Champions at a 1:5 ratio (one champion per five people in their team)"],
    pitfalls: ["Assuming archetype distribution is static — people move between archetypes as the transformation progresses", "Investing all energy in Resistors while ignoring the Pragmatic Majority who represent the largest population"],
    related: ["changeready", "plan", "mgrdev", "reskill"],
    scenario: "A retail organization discovered their archetype distribution was 12% Early Adopters, 48% Pragmatics, 28% Skeptics, and 12% Resistors. By deploying 60 Champions (Early Adopters) across 300 teams, running 3 visible pilot programs (Proof Points for Pragmatics), holding transparent Q&A sessions (for Skeptics), and offering 1:1 coaching for Resistors, they achieved 78% adoption within 8 months — compared to a 45% industry average for similar-scale transformations.",
  },

  skillshift: {
    title: "Skill Shift Index",
    category: "Overview",
    categoryColor: CAT_COLORS["Overview"],
    summary: "Tracks how skill demand is changing across the organization as AI transformation progresses — visualizes which skills are growing, declining, or emerging.",
    who: [{ heading: "Who is this for?", body: "L&D teams planning training investments, talent acquisition teams adjusting hiring profiles, workforce planners forecasting capability needs, and leaders understanding how their team's skill requirements are evolving." }],
    what: [
      { heading: "What it shows", body: "A ranked visualization of skills by net demand change. Rising skills (AI Literacy, Process Automation, Data Analysis) indicate where to invest. Declining skills (manual data entry, routine reporting, basic administration) signal areas where AI is replacing human effort." },
      { heading: "How it's calculated", body: "Current skill demand is weighted by time allocation from work design data. Future demand is projected based on task redistribution after AI scenarios are applied. The delta between current and future demand drives the shift index." },
    ],
    where: [{ heading: "Position in workflow", body: "Overview phase — provides a high-level signal about skill evolution that feeds into the Skills & Talent module's gap analysis and the Reskilling Pathways module." }],
    when: [{ heading: "When to use", body: "After work design data is uploaded and at least one AI scenario has been run. The shift index becomes more accurate as more roles are deconstructed." }],
    why: [{ heading: "Why it matters", body: "Skills are the currency of the future workforce. Understanding which skills are appreciating (growing in demand) and which are depreciating (declining) is essential for investment decisions in training, hiring, and organizational design." }],
    how: [{ heading: "How to use", body: "1. Review the top rising and declining skills. 2. Cross-reference rising skills with your current skills inventory gaps. 3. Prioritize reskilling investments in high-demand, high-gap areas. 4. Use declining skills to identify automation candidates." }],
    terminology: [{ term: "Skill Shift", def: "The net change in demand for a specific skill between the current state and the projected future state after AI transformation." }],
    bestPractices: ["Focus on the top 5 rising skills for immediate investment", "Don't ignore declining skills — they represent automation opportunities"],
    pitfalls: ["Assuming all declining skills can be fully automated immediately", "Investing only in technical skills while ignoring human skills that are rising (leadership, creativity, stakeholder management)"],
    related: ["skills", "design", "reskill"],
    scenario: "A technology company's Skill Shift Index showed AI Literacy rising by +3.2 points, Process Automation by +2.8, while Manual Testing dropped -2.5 and Report Formatting dropped -2.1. This data directly informed their $1.2M reskilling budget allocation: 60% to AI/ML training, 25% to process automation certification, and 15% to advanced analytics — perfectly aligned with where demand was heading.",
  },
};

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE MODAL COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function KnowledgeModal({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const entry = KNOWLEDGE_BASE[moduleId];
  const [activeSection, setActiveSection] = useState("summary");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  if (!entry) return null;

  const sections: { id: string; label: string; icon: string }[] = [
    { id: "summary", label: "Overview", icon: "📋" },
    { id: "who", label: "Who", icon: "👥" },
    { id: "what", label: "What", icon: "📖" },
    { id: "where", label: "Where", icon: "📍" },
    { id: "when", label: "When", icon: "⏰" },
    { id: "why", label: "Why", icon: "💡" },
    { id: "how", label: "How", icon: "🔧" },
    { id: "terminology", label: "Terms", icon: "📚" },
    { id: "practices", label: "Best Practices", icon: "✅" },
    { id: "scenario", label: "Example", icon: "🏢" },
  ];

  const renderSections = (items: KBSection[]) => items.map((s, i) => <div key={i} className="mb-5"><h4 className="text-[14px] font-bold text-[var(--text-primary)] font-heading mb-1.5">{s.heading}</h4><p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{s.body}</p></div>);

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={onClose}>
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl flex animate-card-enter" style={{ maxHeight: "90vh", minWidth: 800, maxWidth: 1100 }} onClick={e => e.stopPropagation()}>

      {/* Left sidebar — TOC */}
      <div className="w-44 shrink-0 bg-[var(--surface-2)] rounded-l-2xl border-r border-[var(--border)] py-4 px-2 overflow-y-auto">
        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">Contents</div>
        {sections.map(s => <button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] mb-0.5 transition-all ${activeSection === s.id ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}><span className="mr-1.5">{s.icon}</span>{s.label}</button>)}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[var(--surface-1)] border-b border-[var(--border)] px-6 py-4 rounded-tr-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${entry.categoryColor}20`, color: entry.categoryColor }}>{entry.category}</span>
              </div>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)] font-heading">{entry.title}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all text-lg">✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeSection === "summary" && <div>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">{entry.summary}</p>
            {entry.related.length > 0 && <div className="mt-4 pt-4 border-t border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Related Concepts</div><div className="flex flex-wrap gap-1.5">{entry.related.map(r => { const rel = KNOWLEDGE_BASE[r]; return rel ? <span key={r} className="text-[10px] px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">{rel.title}</span> : null; })}</div></div>}
          </div>}
          {activeSection === "who" && renderSections(entry.who)}
          {activeSection === "what" && renderSections(entry.what)}
          {activeSection === "where" && renderSections(entry.where)}
          {activeSection === "when" && renderSections(entry.when)}
          {activeSection === "why" && renderSections(entry.why)}
          {activeSection === "how" && renderSections(entry.how)}
          {activeSection === "terminology" && <div>
            {entry.terminology.length > 0 ? <div className="space-y-3">{entry.terminology.map((t, i) => <div key={i} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]"><span className="text-[12px] font-bold text-[var(--accent-primary)] font-heading">{t.term}</span><p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{t.def}</p></div>)}</div> : <Empty text="No terminology defined for this concept" />}
          </div>}
          {activeSection === "practices" && <div>
            <div className="mb-4"><div className="text-[11px] font-bold text-[var(--success)] uppercase mb-2">Best Practices</div><ul className="space-y-2">{entry.bestPractices.map((p, i) => <li key={i} className="flex gap-2 text-[12px] text-[var(--text-secondary)] leading-relaxed"><span className="text-[var(--success)] shrink-0">✓</span>{p}</li>)}</ul></div>
            <div><div className="text-[11px] font-bold text-[var(--risk)] uppercase mb-2">Common Pitfalls</div><ul className="space-y-2">{entry.pitfalls.map((p, i) => <li key={i} className="flex gap-2 text-[12px] text-[var(--text-secondary)] leading-relaxed"><span className="text-[var(--risk)] shrink-0">✗</span>{p}</li>)}</ul></div>
          </div>}
          {activeSection === "scenario" && <div>
            <div className="text-[11px] font-bold text-[var(--accent-primary)] uppercase mb-2">Real-World Scenario</div>
            <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--accent-primary)]/20 text-[12px] text-[var(--text-secondary)] leading-relaxed">{entry.scenario}</div>
          </div>}

          {/* Feedback */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-muted)]">Was this helpful?</span>
            <button onClick={() => setFeedback("up")} className={`text-lg transition-all ${feedback === "up" ? "scale-125" : "opacity-50 hover:opacity-100"}`}>👍</button>
            <button onClick={() => setFeedback("down")} className={`text-lg transition-all ${feedback === "down" ? "scale-125" : "opacity-50 hover:opacity-100"}`}>👎</button>
            {feedback && <span className="text-[10px] text-[var(--success)]">Thanks for the feedback!</span>}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function Empty({ text, icon = "📭" }: { text: string; icon?: string }) {
  return <div className="text-center py-8 text-[var(--text-secondary)]"><div className="text-2xl mb-2 opacity-40">{icon}</div><div className="text-[12px]">{text}</div></div>;
}
