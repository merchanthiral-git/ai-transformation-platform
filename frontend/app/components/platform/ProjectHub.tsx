"use client";
import React, { useState, useEffect, useRef } from "react";
import * as api from "../../../lib/api";
import * as authApi from "../../../lib/auth-api";
import * as analytics from "../../../lib/analytics";
import { generateCardBackgrounds, PHASE_BACKGROUNDS } from "../shared";
import { VideoBackground } from "../../components/VideoBackground";
import { CDN_BASE } from "../../../lib/cdn";

/* ═══════════════════════════════════════════════════════════════
   TUTORIAL SYSTEM — Complete interactive onboarding
   Seeder + 27 micro-steps + spotlight overlay + progress + actions
   ═══════════════════════════════════════════════════════════════ */

function seedTutorialData(projectId: string, industry: string = "technology") {
  // Always reset for fresh experience
  const keysToClean = Object.keys(localStorage).filter(k => k.startsWith(projectId));
  keysToClean.forEach(k => localStorage.removeItem(k));

  localStorage.setItem(`${projectId}_viewMode`, JSON.stringify("org"));

  // Visited modules — show progress
  localStorage.setItem(`${projectId}_visited`, JSON.stringify({
    snapshot: true, jobs: true, scan: true, readiness: true, skills: true, design: true, simulate: true, build: true
  }));

  // Industry-specific primary analyst role and skills
  const INDUSTRY_ROLES: Record<string, { analyst: string; analyst2: string; skills: string[]; omFn: string }> = {
    technology: { analyst: "Data Analyst", analyst2: "Financial Analyst", skills: ["Data Analysis", "Python/SQL", "Cloud Platforms", "AI/ML Tools", "Process Automation", "Communication", "Leadership"], omFn: "engineering" },
    financial_services: { analyst: "Risk Analyst", analyst2: "Fund Accountant", skills: ["Financial Modeling", "Risk Assessment", "Regulatory Knowledge", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "finance" },
    healthcare: { analyst: "Clinical Data Analyst", analyst2: "Revenue Cycle Specialist", skills: ["Clinical Data Analysis", "EHR Systems", "Medical Coding", "Regulatory Knowledge", "Process Automation", "Communication", "Leadership"], omFn: "clinical" },
    retail: { analyst: "Demand Planner", analyst2: "Financial Analyst", skills: ["Demand Forecasting", "Inventory Mgmt", "Customer Experience", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "merchandising" },
    manufacturing: { analyst: "Quality Analyst", analyst2: "Financial Analyst", skills: ["Process Engineering", "Quality Control", "Lean/Six Sigma", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "operations" },
    consulting: { analyst: "Data Consultant", analyst2: "Senior Analyst", skills: ["Strategy Frameworks", "Client Management", "Data Analysis", "Process Design", "Process Automation", "Communication", "Leadership"], omFn: "strategy" },
    energy: { analyst: "Reservoir Analyst", analyst2: "Financial Analyst", skills: ["Process Engineering", "Asset Mgmt", "HSE Knowledge", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "operations" },
    aerospace: { analyst: "Test Engineer", analyst2: "Program Analyst", skills: ["Systems Engineering", "Requirements Analysis", "Program Management", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "engineering" },
  };
  const ind = INDUSTRY_ROLES[industry] || INDUSTRY_ROLES.technology;

  // Work Design: Industry-specific analyst with 8 tasks
  const tasks = [
    { "Task Name": "Data extraction & pipeline maintenance", "Current Time Spent %": 25, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[3] },
    { "Task Name": "Report generation & formatting", "Current Time Spent %": 20, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[5] },
    { "Task Name": "Ad-hoc stakeholder analysis", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": ind.skills[2], "Secondary Skill": ind.skills[0] },
    { "Task Name": "Dashboard creation & maintenance", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[1], "Secondary Skill": ind.skills[0] },
    { "Task Name": "Executive presentations", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": ind.skills[5], "Secondary Skill": ind.skills[6] },
    { "Task Name": "Data quality monitoring", "Current Time Spent %": 8, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[4] },
    { "Task Name": "Cross-team consulting", "Current Time Spent %": 7, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": ind.skills[6], "Secondary Skill": ind.skills[5] },
    { "Task Name": "Tool evaluation", "Current Time Spent %": 5, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": ind.skills[3], "Secondary Skill": ind.skills[2] },
  ];

  const redeploy = tasks.map(t => ({
    ...t,
    "Time Saved %": t["AI Impact"] === "High" ? Math.round(Number(t["Current Time Spent %"]) * 0.6) : t["AI Impact"] === "Moderate" ? Math.round(Number(t["Current Time Spent %"]) * 0.3) : Math.round(Number(t["Current Time Spent %"]) * 0.1),
    "Decision": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "Automate" : t["AI Impact"] === "Moderate" ? "Augment" : "Retain",
    "Technology": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "RPA / ETL Automation" : t["AI Impact"] === "Moderate" ? "AI-Assisted Analytics" : "Human-led",
    "Destination": t["Logic"] === "Deterministic" && t["AI Impact"] === "High" ? "AI / automation layer" : "Continue in role",
  }));

  // Seed industry-specific job states
  const emptyJob = { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false };
  localStorage.setItem(`${projectId}_jobStates`, JSON.stringify({
    [ind.analyst]: { deconRows: tasks, redeployRows: redeploy, scenario: "Balanced", deconSubmitted: true, redeploySubmitted: true, finalized: false, recon: null, initialized: true },
    [ind.analyst2]: { ...emptyJob, initialized: true },
    "Financial Analyst": { ...emptyJob, initialized: true },
    "HRBP": { ...emptyJob },
  }));

  localStorage.setItem(`${projectId}_simState`, JSON.stringify({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }));
  localStorage.setItem(`${projectId}_omFn`, JSON.stringify(ind.omFn));
  localStorage.setItem(`${projectId}_omArch`, JSON.stringify("platform"));
  localStorage.setItem(`${projectId}_odsState`, JSON.stringify({ activeScenario: 0, view: "current" }));
  localStorage.setItem(`${projectId}_skillsConfirmed`, JSON.stringify(true));
  // Pre-seed gap dispositions with industry-specific skills
  const gapDisp: Record<string, string> = {};
  ind.skills.slice(0, 3).forEach(s => { gapDisp[s] = "Close Internally"; });
  ind.skills.slice(3, 5).forEach(s => { gapDisp[s] = "Accept Risk"; });
  if (ind.skills[5]) gapDisp[ind.skills[5]] = "Close Internally";
  if (ind.skills[6]) gapDisp[ind.skills[6]] = "Hire Externally";
  localStorage.setItem(`${projectId}_gapDispositions`, JSON.stringify(gapDisp));

  localStorage.setItem(`${projectId}_shortlisted`, JSON.stringify({}));
  localStorage.setItem(`${projectId}_bbba_overrides`, JSON.stringify({}));
  localStorage.setItem(`${projectId}_mp_shortlist`, JSON.stringify({}));

  // Pre-seed maturity scores
  localStorage.setItem(`${ind.omFn}_platform_maturity`, JSON.stringify({
    "Strategy & Planning": 3, "Service Delivery": 2, "Analytics": 2, "Governance": 1,
    "Innovation": 2, "Talent": 2, "Process Excellence": 3, "Technology": 2, "Customer Experience": 3
  }));
  localStorage.setItem(`${ind.omFn}_platform_target`, JSON.stringify({
    "Strategy & Planning": 4, "Service Delivery": 4, "Analytics": 4, "Governance": 3,
    "Innovation": 4, "Talent": 3, "Process Excellence": 4, "Technology": 4, "Customer Experience": 4
  }));

  // Seed decision log with industry-relevant entries
  const co = getTutorialCompany(projectId);
  const empLabel = `${co.employees.toLocaleString()} employees`;
  localStorage.setItem(`${projectId}_decisionLog`, JSON.stringify([
    { ts: new Date(Date.now() - 86400000).toISOString(), module: "Skills", action: "Inventory Confirmed", detail: `${empLabel} × 15 skills confirmed` },
    { ts: new Date(Date.now() - 72000000).toISOString(), module: "Work Design", action: "Deconstruction Submitted", detail: `${ind.analyst}: 8 tasks analyzed` },
    { ts: new Date(Date.now() - 50000000).toISOString(), module: "Work Design", action: "Redeployment Saved", detail: `${ind.analyst}: 45% time released through automation` },
    { ts: new Date(Date.now() - 36000000).toISOString(), module: "Simulate", action: "Scenario Selected", detail: "Balanced scenario — 45% adoption, 10-month timeline" },
    { ts: new Date(Date.now() - 20000000).toISOString(), module: "Skills", action: "Gap Disposition Set", detail: `${ind.skills[0]}: Close Internally` },
  ]));

  // Seed industry-specific risk register
  localStorage.setItem(`${projectId}_riskRegister`, JSON.stringify([
    { id: "R1", source: "Skills Gap", risk: `${ind.skills[3]} gap may be too large to close internally within 6 months`, probability: "High", impact: "High", mitigation: "Consider hybrid Build + Borrow strategy", status: "Open" },
    { id: "R2", source: "Manager Capability", risk: "15% of managers scored below 2.5 — flight risk during transformation", probability: "Medium", impact: "High", mitigation: "Immediate engagement with executive coach", status: "Open" },
    { id: "R3", source: "Change Readiness", risk: "28% of workforce in High Risk quadrant — could slow adoption", probability: "High", impact: "Medium", mitigation: "Deploy change champions at 1:5 ratio", status: "Open" },
    { id: "R4", source: "Headcount", risk: "Natural attrition may not absorb all role eliminations", probability: "Medium", impact: "Medium", mitigation: "Phase transitions over 18 months to allow attrition absorption", status: "Open" },
    { id: "R5", source: "Technology", risk: "Legacy system integration may delay AI deployment by 3-6 months", probability: "Medium", impact: "High", mitigation: "Run parallel systems with phased migration", status: "Open" },
    { id: "R6", source: "Regulatory", risk: `${industry === "healthcare" ? "HIPAA" : industry === "financial_services" ? "SEC/FINRA" : industry === "aerospace" ? "ITAR/DoD" : "Industry"} compliance requirements may restrict AI use cases`, probability: "Medium", impact: "High", mitigation: "Engage legal team early; build compliance into AI governance framework", status: "Open" },
    { id: "R7", source: "Data Quality", risk: "Incomplete or inconsistent data across departments could undermine AI model accuracy", probability: "High", impact: "Medium", mitigation: "Implement data quality framework in Wave 1", status: "Open" },
  ]));

  localStorage.setItem(`${projectId}_isTutorial`, JSON.stringify(false));

  // Model ID must match backend format: Tutorial_{Size}_{Industry}
  const modelId = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
  localStorage.setItem("lastModel", JSON.stringify(modelId));
}


/* ═══ TUTORIAL STEPS — 27 comprehensive steps ═══ */

// Company data mirrors backend COMPANY_DB for dynamic tutorial text
const TUTORIAL_COMPANIES: Record<string, Record<string, { name: string; employees: number; ticker?: string }>> = {
  technology: { small: { name: "Palantir Technologies", employees: 3800, ticker: "PLTR" }, mid: { name: "ServiceNow", employees: 12000, ticker: "NOW" }, large: { name: "Adobe", employees: 30000, ticker: "ADBE" } },
  financial_services: { small: { name: "Evercore", employees: 2200, ticker: "EVR" }, mid: { name: "Raymond James", employees: 16000, ticker: "RJF" }, large: { name: "Goldman Sachs", employees: 35000, ticker: "GS" } },
  healthcare: { small: { name: "Hims & Hers Health", employees: 1500, ticker: "HIMS" }, mid: { name: "Molina Healthcare", employees: 14000, ticker: "MOH" }, large: { name: "Elevance Health", employees: 32000, ticker: "ELV" } },
  retail: { small: { name: "Five Below", employees: 4500, ticker: "FIVE" }, mid: { name: "Williams-Sonoma", employees: 10000, ticker: "WSM" }, large: { name: "Target", employees: 35000, ticker: "TGT" } },
  manufacturing: { small: { name: "Axon Enterprise", employees: 4000, ticker: "AXON" }, mid: { name: "Parker Hannifin", employees: 13000, ticker: "PH" }, large: { name: "Honeywell", employees: 28000, ticker: "HON" } },
  consulting: { small: { name: "Huron Consulting", employees: 2500, ticker: "HURN" }, mid: { name: "Booz Allen Hamilton", employees: 15000, ticker: "BAH" }, large: { name: "Accenture", employees: 35000, ticker: "ACN" } },
  energy: { small: { name: "Shoals Technologies", employees: 1800, ticker: "SHLS" }, mid: { name: "Chesapeake Energy", employees: 8000, ticker: "CHK" }, large: { name: "Baker Hughes", employees: 25000, ticker: "BKR" } },
  aerospace: { small: { name: "Kratos Defense", employees: 4000, ticker: "KTOS" }, mid: { name: "L3Harris Technologies", employees: 17000, ticker: "LHX" }, large: { name: "Northrop Grumman", employees: 33000, ticker: "NOC" } },
};

function getTutorialCompany(projectId: string): { name: string; employees: number; industry: string; size: string } {
  const parts = projectId.replace("tutorial_", "").split("_");
  const size = parts[0] || "mid";
  const industry = parts.slice(1).join("_") || "technology";
  const co = TUTORIAL_COMPANIES[industry]?.[size] || TUTORIAL_COMPANIES.technology.mid;
  return { ...co, industry, size };
}

type TutorialStep = { page: string; icon: string; title: string; body: string; tip?: string; subtitle?: string };

function buildTutorialSteps(projectId: string): TutorialStep[] {
  const co = getTutorialCompany(projectId);
  const n = co.employees;
  const nm = co.name;

  return [
  { page: "home", icon: "👋", title: "Welcome to the Digital Playground", subtitle: "Getting Started",
    body: `Welcome to the AI Transformation Platform — your command center for workforce transformation. This guided tour will walk you through every module, showing you how to understand your organization, design its future, simulate the impact, and build the plan to make it happen. You're exploring ${nm}, a ${co.industry.replace(/_/g, " ")} organization with ${n.toLocaleString()} employees. Each step explains one capability. Take your time — you can always come back to this tour from the Tutorial badge.`,
    tip: "Complete the Discover phase first. Everything downstream depends on understanding your current state." },

  { page: "home", icon: "🗺️", title: "The Transformation Journey", subtitle: "Navigation",
    body: `The platform follows a proven 5-phase methodology: Discover → Diagnose → Design → Simulate → Mobilize. You can work through these in order or jump to any module. The journey map shows your progress — completed phases light up, and the platform suggests what to do next. Think of it as your GPS for transformation. Use the sidebar to navigate, the Command Palette (⌘K) to search anything, and the AI Co-Pilot for real-time guidance.`,
    tip: "In a real engagement, Discover and Diagnose take 2-3 weeks. Design takes 4-6 weeks. Simulate and Mobilize overlap." },

  { page: "home", icon: "📊", title: "Your Data — The Foundation", subtitle: "Data Intake",
    body: `Everything in this platform runs on your workforce data. Upload your employee data using Smart Import — it auto-maps columns from Workday, SAP, Oracle, or any custom format, validates quality, and flags issues. For sandbox companies like ${nm}, data is pre-loaded. The sidebar shows your active project, model, and global filters. Changing a filter here updates EVERY module instantly.`,
    tip: "Data quality determines output quality. Spend time validating before analysis — garbage in, garbage out." },

  { page: "snapshot", icon: "🔍", title: "Workforce Snapshot — Your Starting Point", subtitle: "Phase 1: Discover",
    body: `The Workforce Snapshot gives you the big picture: total headcount, roles, functions, span of control, management layers, and AI readiness score. This is the first slide in any transformation presentation. The Upload Intelligence panel auto-generates observations about your data — use these as conversation starters with leadership. Click any KPI to drill deeper.`,
    tip: "If span of control is above 8 or below 4, flag it immediately. Both create management problems." },

  { page: "dashboard", icon: "📈", title: "Transformation Dashboard — Your Scoreboard", subtitle: "Phase 1: Discover",
    body: `The Transformation Dashboard aggregates metrics across all three horizons: Discover (where you are), Design (what you've planned), and Deliver (execution status). Every number is clickable — click to see where it comes from. Numbers show '—' until you've completed the relevant module. This dashboard is designed to be screenshot-ready for steering committee meetings.`,
    tip: "Don't present this dashboard until at least the Discover phase is complete. Blank metrics undermine credibility." },

  { page: "skillshift", icon: "🎯", title: "Skill Shift Index — What's Changing", subtitle: "Phase 1: Discover",
    body: `The Skill Shift Index shows which skills are declining (being automated), which are amplified (growing in importance), and which are net-new (didn't exist before). This is critical for reskilling planning — it tells you where to invest in people development. The visualization groups skills by category so you can see patterns: technical skills shifting fastest, leadership skills staying stable.`,
    tip: "Share this with L&D teams early. Reskilling programs take 6-12 months to design and launch." },

  { page: "orghealth", icon: "🏥", title: "Org Health Scorecard — Structural Fitness", subtitle: "Phase 2: Diagnose",
    body: `The Org Health Scorecard evaluates your organization across 6 dimensions: span of control, management layers, AI readiness, high-impact roles, management ratio, and unique roles. Each metric is benchmarked against your industry. Green means healthy, amber needs attention, red is critical. The radar chart at the bottom compares you against industry average and best-in-class.`,
    tip: "The most common issue we see is too many management layers. Every unnecessary layer adds decision latency and cost." },

  { page: "heatmap", icon: "🔥", title: "AI Impact Heatmap — Where AI Hits Hardest", subtitle: "Phase 2: Diagnose",
    body: `The AI Impact Heatmap shows which functions and roles have the highest automation and augmentation potential. Darker cells mean higher impact. Click any cell to drill into the specific tasks affected. This is the most frequently requested slide in AI transformation presentations — it answers 'which parts of our org are most affected?'`,
    tip: "High AI impact doesn't mean job loss. Most roles shift from execution to oversight. Frame it as 'role evolution' not 'role elimination.'" },

  { page: "changeready", icon: "🔄", title: "Change Readiness — Is Your Org Ready?", subtitle: "Phase 2: Diagnose",
    body: `Change Readiness segments your workforce into readiness archetypes: Champions (eager early adopters), Early Adopters, Pragmatists (need proof), Skeptics (need support), and Support-First Adopters (need intensive intervention). Each group requires a different engagement strategy. The assessment also feeds into the ADKAR analysis in the Mobilize phase.`,
    tip: "You only need 15-20% Champions to reach critical mass. Focus on activating them as change agents, not converting Support-First Adopters." },

  { page: "jobs", icon: "🏗️", title: "Job Architecture — Your Organizational Blueprint", subtitle: "Phase 2: Diagnose",
    body: `Job Architecture is the structural framework of your organization: functions, job family groups, job families, sub-families, career tracks, and levels. Browse the Job Catalogue to explore roles. Use the Org Chart for visual hierarchy. Run Validation to auto-detect structural issues like orphaned roles, inconsistent leveling, or title inflation. The Job Profiles tab lets you generate AI-powered job descriptions.`,
    tip: "A healthy JA has 8-15 job families, consistent leveling across families, and clear IC-to-Manager career forks." },

  { page: "scan", icon: "🔬", title: "AI Opportunity Scan — Finding the Gold", subtitle: "Phase 2: Diagnose",
    body: `The AI Opportunity Scan scores every task in your organization for AI impact — automation potential, augmentation potential, and human-essential classification. It identifies quick wins (high impact, low effort), strategic bets (high impact, high effort), and tasks to leave alone. The scored task table is the input for the Work Design Lab.`,
    tip: "Start with the 'quick wins' quadrant. These build momentum and prove value before tackling complex redesigns." },

  { page: "design", icon: "🛠️", title: "Work Design Lab — Redesigning How Work Gets Done", subtitle: "Phase 3: Design",
    body: `The Work Design Lab is the platform's core differentiator. Select a job, then walk through a guided process: Context → Task Deconstruction → Work Options Analysis → Role Reconstruction → Skills Impact → Redeployment Planning → Impact Summary. For each task, you decide: automate, augment with AI, move to shared services, outsource, or keep. The reconstructed role shows what the job looks like after redesign.`,
    tip: "The Mercer methodology starts with the WORK, not the ORG CHART. Understand tasks first, then redesign roles around them." },

  { page: "opmodel", icon: "🧬", title: "Operating Model Lab — How Value Gets Delivered", subtitle: "Phase 3: Design",
    body: `The Operating Model Lab is your most comprehensive design tool. It covers: Strategic Intent (priorities and design principles), Architecture (capabilities, processes, service delivery, technology, governance), People & Organization (culture, structure, workforce model), and Execution (financials, KPIs, transition planning). The guided step navigator walks you through 14 steps to build a complete Target Operating Model.`,
    tip: "Start with Strategy — design principles constrain all downstream decisions. Don't jump to org structure before defining how value should be delivered." },

  { page: "bbba", icon: "⚖️", title: "BBBA — Build, Buy, Borrow, Automate", subtitle: "Phase 3: Design",
    body: `For every capability gap identified in your transformation, BBBA helps you decide the optimal sourcing strategy: Build (train existing employees), Buy (hire externally), Borrow (use contractors/consultants), or Automate (deploy AI/technology). Each disposition includes cost modeling so you can see the financial impact of your choices.`,
    tip: "Most organizations over-index on 'Buy.' Internal reskilling is 3-5x cheaper than external hiring when you factor in ramp-up time." },

  { page: "build", icon: "📐", title: "Org Design Studio — Reshaping the Structure", subtitle: "Phase 3: Design",
    body: `The Org Design Studio provides analytical views of your organization: span detail, layers analysis, cost modeling, role migration, and department drill-down. Use it to model restructuring scenarios: what if we reduce a layer? What if we widen spans? What if we consolidate functions? Each scenario shows headcount, cost, and structural impact.`,
    tip: "The most impactful restructuring move is usually removing one management layer. It saves cost AND speeds decision-making." },

  { page: "headcount", icon: "📊", title: "Headcount Planning — The Numbers Game", subtitle: "Phase 3: Design",
    body: `Headcount Planning shows a waterfall chart: starting headcount → automated roles → natural attrition → redeployed roles → new roles needed → net ending headcount. This translates your Design decisions into concrete workforce numbers. Green bars are additions, red bars are reductions. The net change bar is what matters for budgeting.`,
    tip: "Always model attrition savings separately. Natural turnover often covers 30-50% of headcount reductions without any layoffs." },

  { page: "simulate", icon: "⚡", title: "Scenario Builder — Testing Your Assumptions", subtitle: "Phase 4: Simulate",
    body: `The Scenario Builder lets you model different transformation approaches: Conservative (minimal disruption, lower savings), Balanced (moderate change, moderate return), and Aggressive (maximum transformation, highest savings but highest risk). You can also build custom scenarios. Compare scenarios side by side to find the right balance for your organization.`,
    tip: "Always present three scenarios to leadership. It frames the decision as 'which approach' not 'whether to transform.'" },

  { page: "simulate", icon: "💰", title: "ROI Calculator — The Business Case", subtitle: "Phase 4: Simulate",
    body: `The ROI Calculator aggregates all financial impacts: technology investment, reskilling costs, hiring costs, and projected savings from automation, efficiency gains, and headcount optimization. It calculates: total investment, annual savings, payback period, and 3-year NPV. This is the slide that gets the budget approved.`,
    tip: "CFOs trust bottom-up ROI models (built from specific role-level savings) more than top-down estimates." },

  { page: "simulate", icon: "🔀", title: "Capacity Waterfall & Redeployment", subtitle: "Phase 4: Simulate",
    body: `The Capacity Waterfall shows how freed capacity (from automation and redesign) can be redeployed to higher-value work. Instead of eliminating roles, you're redirecting human effort. The Redeployment tab shows where each displaced employee could be placed based on skill adjacency.`,
    tip: "Position redeployment as career growth, not displacement. '40 hours freed for strategic work' is better than '40 hours automated.'" },

  { page: "plan", icon: "📋", title: "Change Planner — Your Transformation Roadmap", subtitle: "Phase 5: Mobilize",
    body: `The Change Planner brings everything together into an executable plan. The Roadmap shows the high-level phases. The Gantt chart details the timeline. Workstreams organize activities by function. The Stakeholder Map identifies who needs to be managed and how. The Risk Register tracks what could go wrong. The Comms Plan ensures everyone hears the right message at the right time.`,
    tip: "The #1 reason transformations fail is not poor design — it's poor change management. Spend as much time on Mobilize as you did on Design." },

  { page: "plan", icon: "👥", title: "Stakeholder Management — Winning Hearts and Minds", subtitle: "Phase 5: Mobilize",
    body: `The Stakeholder Map uses a Power/Interest grid to categorize stakeholders: Manage Closely (high power, high interest), Keep Satisfied (high power, low interest), Keep Informed (low power, high interest), and Monitor. Each stakeholder has an engagement plan and sentiment tracker. The ADKAR tab scores readiness on Awareness, Desire, Knowledge, Ability, and Reinforcement.`,
    tip: "Identify your biggest skeptic with the most power. Convert them early — they become your most credible champion." },

  { page: "plan", icon: "📊", title: "ADKAR — Structured Change Methodology", subtitle: "Phase 5: Mobilize",
    body: `ADKAR scores your stakeholder groups on five dimensions: Awareness, Desire, Knowledge, Ability, Reinforcement. The magic is in the sequence — you can't build Desire before Awareness. The tool identifies the 'barrier point' for each group and generates targeted interventions. If managers score low on Desire, you need to address their fears before training them.`,
    tip: "The barrier point is where you should spend your budget. Training (Knowledge) is useless if people don't want to change (Desire)." },

  { page: "reskill", icon: "🎓", title: "Reskilling Pathways — Developing Your People", subtitle: "Phase 5: Mobilize",
    body: `Reskilling Pathways creates personalized development plans based on the skills gaps identified in your transformation. For each affected employee group: current skills, required skills, gap analysis, recommended training, estimated duration, and cost. This connects directly to the Skills module and BBBA dispositions.`,
    tip: "Make reskilling voluntary first. Employees who self-select into development programs complete them at 3x the rate of those who are mandated." },

  { page: "export", icon: "📤", title: "Export & Deliverables — Client-Ready Outputs", subtitle: "Phase 5: Mobilize",
    body: `The Export module generates three types of deliverables: Excel workbooks (complete data tables), PowerPoint decks (formatted slides with visualizations), and PDF reports (executive summaries). The AI Narrative feature generates a complete written report from your analysis. The Data Story Engine creates a full executive narrative. Everything is formatted and ready to present.`,
    tip: "Export early and often. A weekly 'data pack' keeps stakeholders engaged and prevents end-of-project surprises." },

  { page: "home", icon: "🤖", title: "AI Features — Your AI Co-Pilot", subtitle: "Platform Features",
    body: `AI is embedded throughout the platform. The AI Co-Pilot sidebar proactively suggests insights as you work. The Command Palette (⌘K) searches everything instantly. Auto-suggest generates job profiles, task lists, and skills. The Story Engine creates executive narratives. All AI features use the Claude API with your actual project data — not generic responses.`,
    tip: "Ask the AI Co-Pilot 'what should I do next?' — it knows which modules you've completed and recommends the logical next step." },

  { page: "home", icon: "🏛️", title: "Platform Hub — Your Command Center", subtitle: "Platform Features",
    body: `The Platform Hub contains your account settings, knowledge base (articles and guides for every module), use cases (real-world transformation examples), tutorials, release notes, and feedback form. The Knowledge Base is especially useful — each article is a comprehensive slideshow covering the What, Who, How, When, Where, Why, and examples for every module.`,
    tip: "Read the Knowledge Base article for a module BEFORE using it. It's like reading the manual — saves time and prevents mistakes." },

  { page: "home", icon: "🎯", title: "You're Ready — What's Next", subtitle: "Next Steps",
    body: `You've completed the full platform tour. Here's your recommended next action: if you're using sandbox data, explore 2-3 modules that interest you most. If you're ready with real data, click Smart Import to upload your workforce file. Start with Discover (Workforce Snapshot), then work through Diagnose. The platform will guide you from there. Welcome to the Digital Playground — let's build something transformative.`,
    tip: "The most successful transformations start small. Pick one function, redesign its top 5 roles, prove the value, then scale." },
  ];
}

// Default fallback for non-tutorial contexts
export const TUTORIAL_STEPS = buildTutorialSteps("tutorial_mid_technology");

/* ═══ VIEW SELECTOR SCREEN — shown after sandbox company selection, before tutorial ═══ */
function SandboxViewSelector({ companyName, onSelect }: { companyName: string; onSelect: (mode: string) => void }) {
  const [phase, setPhase] = useState<"splash" | "select" | "entering">("splash");
  const selectedViewRef = useRef<string>("");
  const selectedLabelRef = useRef<string>("");
  const views = [
    { id: "org", icon: "🏢", label: "Organization View", desc: "Explore by organizational structure — functions, departments, teams. See aggregate KPIs, cross-cutting analytics, and the full workforce picture." },
    { id: "job_select", icon: "💼", label: "Job Focus", desc: "Explore by job architecture — families, levels, career tracks. Focus on a single role's task portfolio, AI impact, and redesign." },
    { id: "employee_select", icon: "👤", label: "Employee", desc: "Explore by individual employees — skills, roles, career paths. Track a single person through every module." },
    { id: "custom", icon: "⚙️", label: "Custom Slice", desc: "Create a custom view with your own filters. Narrow by function, job family, career level, or sub-family." },
    { id: "consultant", icon: "📋", label: "Consultant Guide", desc: "Guided pathway for external consultants — structured frameworks, deliverable templates, and client-ready analysis." },
    { id: "hr", icon: "👥", label: "HR Professional Guide", desc: "Tailored for HR and People Analytics teams — workforce planning, skills gaps, change readiness, and talent strategy." },
  ];

  // STEP 1: Splash — video bg + company name + static "Click anywhere"
  if (phase === "splash") {
    return <div onClick={() => setPhase("select")} style={{ position: "fixed", inset: 0, zIndex: 60, cursor: "pointer" }}>
      <VideoBackground name="view_bg" overlay={0.4} poster={`${CDN_BASE}/videos/optimized/view_bg-poster.jpg`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", WebkitFontSmoothing: "antialiased" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(224,144,64,0.5)", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Welcome to</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", marginBottom: 32, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{companyName}</h2>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontFamily: "'Outfit', sans-serif" }}>Click anywhere to continue</div>
      </div>
    </div>;
  }

  // STEP 3: Post-selection splash — show company + view name, click to continue
  if (phase === "entering") {
    return <div onClick={() => selectedViewRef.current && onSelect(selectedViewRef.current)} style={{ position: "fixed", inset: 0, zIndex: 60, cursor: "pointer" }}>
      <VideoBackground name="hero_bg" overlay={0.45} poster={`${CDN_BASE}/hero_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", WebkitFontSmoothing: "antialiased" }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", marginBottom: 12, textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}>{companyName}</h2>
        <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(224,144,64,0.7)", marginBottom: 48, fontFamily: "'Outfit', sans-serif" }}>{selectedLabelRef.current}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif" }}>Click anywhere to continue →</div>
      </div>
    </div>;
  }

  // STEP 2: View selector overlay — same video bg, 6 options
  return <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#0B1120" }}>
    <VideoBackground name="view_bg" overlay={0.5} poster={`${CDN_BASE}/videos/optimized/view_bg-poster.jpg`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(8,12,24,0.6)" }} />
    <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: 800, width: "100%", padding: "24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>Select Your View</div>
          <p style={{ fontSize: 15, color: "rgba(255,220,180,0.4)", marginTop: 6 }}>Every module adapts to your chosen perspective</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {views.map(v => <button key={v.id} onClick={() => { selectedViewRef.current = v.id; selectedLabelRef.current = v.label; setPhase("entering"); }} style={{ padding: "22px", borderRadius: 16, background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", textAlign: "left", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column", gap: 10 }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,134,10,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(15,20,35,0.85)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.08)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>{v.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,245,235,0.92)", fontFamily: "'Outfit', sans-serif" }}>{v.label}</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,220,190,0.4)", lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
          </button>)}
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,230,200,0.2)", marginTop: 20, textAlign: "center" }}>You can change your view anytime from the sidebar</p>
      </div>
    </div>
  </div>;
}


/* ═══ TUTORIAL — Fullscreen immersive cinematic experience ═══ */

const TUTORIAL_VISUALS: Record<number, string> = { 0: "👋", 1: "🗺️", 2: "📊", 3: "🔍", 4: "📈", 5: "🎯", 6: "🏥", 7: "🔥", 8: "🔄", 9: "🏗️", 10: "🔬", 11: "🛠️", 12: "🧬", 13: "⚖️", 14: "📐", 15: "📊", 16: "⚡", 17: "💰", 18: "🔀", 19: "📋", 20: "👥", 21: "📊", 22: "🎓", 23: "📤", 24: "🤖", 25: "🏛️", 26: "🎯" };

const TUTORIAL_PHASES = [
  { label: "Start", icon: "👋", range: [0, 2], color: "var(--accent-primary)" },
  { label: "Discover", icon: "🔍", range: [3, 5], color: "var(--warning)" },
  { label: "Diagnose", icon: "🩺", range: [6, 10], color: "var(--teal)" },
  { label: "Design", icon: "✏️", range: [11, 15], color: "var(--success)" },
  { label: "Simulate", icon: "⚡", range: [16, 18], color: "var(--purple)" },
  { label: "Mobilize", icon: "🚀", range: [19, 23], color: "var(--warning)" },
  { label: "Platform", icon: "🏛️", range: [24, 26], color: "#0891B2" },
];

export function TutorialOverlay({ step, totalSteps, steps, onNext, onPrev, onClose, onJump }: {
  step: number; totalSteps: number; steps: TutorialStep[];
  onNext: () => void; onPrev: () => void; onClose: () => void; onJump: (s: number) => void;
}) {
  const s = steps[step];
  if (!s) return null;
  const isLast = step === totalSteps - 1;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const phase = TUTORIAL_PHASES.find(p => step >= p.range[0] && step <= p.range[1]) || TUTORIAL_PHASES[0];
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const [animKey, setAnimKey] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => { setAnimKey(k => k + 1); }, [step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setDir(1); onNext(); }
      if (e.key === "ArrowLeft") { setDir(-1); onPrev(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNext, onPrev]);

  const handleNext = () => { if (isLast) { setFinishing(true); setTimeout(() => { onClose(); setFinishing(false); }, 2600); } else { setDir(1); onNext(); } };
  const handlePrev = () => { setDir(-1); onPrev(); };

  // Split body into lines for staggered reveal
  const bodyLines = s.body.split(". ").filter(Boolean).map((line, i, arr) => i < arr.length - 1 ? line + "." : line);

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column" }}>
    {/* Dark overlay — platform visible but dimmed */}
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", transition: "opacity 0.6s", opacity: finishing ? 0 : 1 }} />

    {/* Finishing message */}
    {finishing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      <div style={{ fontSize: 28, fontWeight: 300, color: "rgba(255,230,200,0.8)", fontFamily: "'Outfit', sans-serif", textAlign: "center", animation: "fadeIn 0.6s ease", letterSpacing: 0.5 }}>You{"'"}re ready. Build something transformative.</div>
    </div>}

    {/* Main content area */}
    {!finishing && <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 64px 0" }}>
      <div key={animKey} style={{ maxWidth: 900, width: "100%", display: "flex", gap: 48, alignItems: "center", animation: `tutSlideIn${dir > 0 ? "R" : "L"} 0.4s ease-out` }}>
        <style>{`
          @keyframes tutSlideInR { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes tutSlideInL { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes tutLineIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes tutTipIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        `}</style>

        {/* LEFT: Hero visual (40%) */}
        <div style={{ width: "35%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 220, height: 220, borderRadius: 28, background: `radial-gradient(circle at 40% 40%, ${phase.color}20, transparent 70%), rgba(255,255,255,0.02)`, border: `1px solid ${phase.color}20`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${phase.color}10`, animation: "tutSlideInR 0.5s ease-out" }}>
            <span style={{ fontSize: 80, filter: `drop-shadow(0 4px 20px ${phase.color}30)`, animation: "tutSlideInR 0.6s ease-out" }}>{TUTORIAL_VISUALS[step] || s.icon}</span>
          </div>
        </div>

        {/* RIGHT: Text content (60%) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Step label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, animation: "tutLineIn 0.3s ease-out" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(212,134,10,0.6)", letterSpacing: 1.5, textTransform: "uppercase" }}>Step {step + 1} of {totalSteps}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: phase.color, background: `${phase.color}18`, padding: "3px 10px", borderRadius: 6, letterSpacing: 0.5 }}>{phase.label}</span>
          </div>

          {/* Title — cinematic entrance */}
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", lineHeight: 1.15, margin: "0 0 6px", animation: "tutLineIn 0.4s ease-out" }}>{s.title}</h2>

          {/* Subtitle */}
          {s.subtitle && <div style={{ fontSize: 16, fontWeight: 600, color: phase.color, marginBottom: 20, animation: "tutLineIn 0.5s ease-out", opacity: 0.7 }}>{s.subtitle}</div>}

          {/* Body — line by line staggered reveal */}
          <div style={{ marginBottom: 20 }}>
            {bodyLines.map((line, i) => <span key={i} style={{ display: "inline", fontSize: 17, lineHeight: 1.75, color: "rgba(255,230,200,0.7)", animation: `tutLineIn 0.4s ease-out ${0.3 + i * 0.08}s both` }}>{line}{i < bodyLines.length - 1 ? " " : ""}</span>)}
          </div>

          {/* Pro tip */}
          {s.tip && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(212,134,10,0.06)", borderLeft: "3px solid rgba(212,134,10,0.4)", animation: `tutTipIn 0.4s ease-out ${0.5 + bodyLines.length * 0.08}s both` }}>
            <span style={{ fontSize: 15, fontStyle: "italic", color: "rgba(255,230,200,0.55)", lineHeight: 1.65 }}>
              <span style={{ fontWeight: 700, color: "var(--accent-primary)", fontStyle: "normal" }}>💡 Pro tip: </span>{s.tip}
            </span>
          </div>}
        </div>
      </div>
    </div>}

    {/* Bottom: Progress timeline + controls */}
    {!finishing && <div style={{ position: "relative", zIndex: 1, flexShrink: 0, padding: "0 64px 32px" }}>
      {/* Phase timeline */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, marginBottom: 24, height: 50 }}>
        {TUTORIAL_PHASES.map(p => {
          const phaseSteps = p.range[1] - p.range[0] + 1;
          const phaseWidth = (phaseSteps / totalSteps) * 100;
          const inPhase = step >= p.range[0] && step <= p.range[1];
          const completed = step > p.range[1];
          const phasePct = inPhase ? ((step - p.range[0]) / (phaseSteps - 1)) * 100 : completed ? 100 : 0;
          return <div key={p.label} style={{ width: `${phaseWidth}%`, position: "relative" }}>
            {/* Phase label */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: inPhase ? p.color : completed ? `${p.color}80` : "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: 1, transition: "color 0.3s" }}>{p.icon} {p.label}</span>
            </div>
            {/* Track */}
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", position: "relative", marginLeft: 1, marginRight: 1 }}>
              <div style={{ height: "100%", borderRadius: 2, background: p.color, width: `${phasePct}%`, transition: "width 0.5s ease", boxShadow: inPhase ? `0 0 8px ${p.color}40` : "none" }} />
              {/* Current position dot */}
              {inPhase && <div style={{ position: "absolute", top: -4, left: `calc(${phasePct}% - 6px)`, width: 12, height: 12, borderRadius: 6, background: p.color, border: "2px solid rgba(0,0,0,0.5)", boxShadow: `0 0 12px ${p.color}60`, transition: "left 0.5s ease" }} />}
            </div>
          </div>;
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 900, margin: "0 auto" }}>
        <button onClick={handlePrev} disabled={step === 0} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,230,200,0.5)", opacity: step === 0 ? 0.3 : 1, transition: "all 0.2s" }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, color: "rgba(255,230,200,0.2)", fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</span>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 14, cursor: "pointer", background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,230,200,0.3)", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,230,200,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,230,200,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>Minimize</button>
        </div>
        <button onClick={handleNext} style={{ padding: "10px 28px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", border: "none", color: "#fff", background: isLast ? "linear-gradient(135deg, var(--success), #059669)" : "linear-gradient(135deg, var(--accent-primary), var(--teal))", boxShadow: isLast ? "0 4px 16px rgba(16,185,129,0.3)" : "0 4px 16px rgba(224,144,64,0.25)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>{isLast ? "Finish" : "Next →"}</button>
      </div>
    </div>}
  </div>;
}

/* ═══ TUTORIAL BADGE — Guide re-entry ═══ */
export function TutorialBadge({ onClick, step, total }: { onClick: () => void; step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  const isComplete = step >= total - 1;
  return <button onClick={onClick} style={{ position: "fixed", bottom: 56, right: 16, zIndex: 35, padding: "8px 14px", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "rgba(15,12,8,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(212,134,10,0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 8, boxShadow: "var(--shadow-2)", transition: "all 0.3s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.35)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"; }}>
    <span>{isComplete ? "📖" : "🎓"}</span>
    <span>{isComplete ? "Guide" : "Tutorial"}</span>
    {!isComplete && <><span style={{ fontSize: 13, opacity: 0.5 }}>{pct}%</span><div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(212,134,10,0.15)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", borderRadius: 2 }} /></div></>}
  </button>;
}

// Export the builder function for use in page.tsx (Home component needs it)
export { buildTutorialSteps, getTutorialCompany, seedTutorialData };


/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB — Hero splash + project management
   ═══════════════════════════════════════════════════════════════ */
export function ProjectHub({ user, onOpenProject, onStartTutorial, onOpenSandbox, showSandboxPicker, onCloseSandbox }: { user?: authApi.AuthUser; onOpenProject: (p: { id: string; name: string; meta: string }) => void; onStartTutorial?: () => void; onOpenSandbox?: () => void; showSandboxPicker?: boolean; onCloseSandbox?: () => void }) {
  const [projects, setProjects] = useState<{ id: string; name: string; meta: string; client?: string; industry?: string; size?: string; lead?: string; created: string; status: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { const saved = localStorage.getItem("hub_projects"); if (saved) return JSON.parse(saved); } catch (e) { console.error("[Storage]", e); }
    return [];
  });
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newLead, setNewLead] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(!!showSandboxPicker);
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);
  const [pendingSandbox, setPendingSandbox] = useState<{ id: string; name: string; meta: string } | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Sync parent's showSandboxPicker prop → local sandboxOpen state
  // Show fullscreen background first; user clicks to reveal the grid panel
  useEffect(() => {
    if (showSandboxPicker) {
      setSandboxOpen(true);
      setSandboxPanelOpen(false);
    }
  }, [showSandboxPicker]);

  // Load projects from localStorage (deferred for SSR safety)
  useEffect(() => {
    try { const saved = localStorage.getItem("hub_projects"); if (saved) setProjects(JSON.parse(saved)); } catch (e) { console.error("[Storage]", e); }
    setLoaded(true);
  }, []);

  // Save projects — only after initial load
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("hub_projects", JSON.stringify(projects));
  }, [projects, loaded]);

  // Duplicate name check
  const nameExists = (name: string) => projects.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameTaken = newName.trim().length > 0 && nameExists(newName);

  const createProject = () => {
    if (!newName.trim() || nameTaken) return;
    const metaParts = [newClient, newIndustry, newSize, newLead, newDesc].filter(Boolean).join(" · ");
    const p = { id: `proj_${Date.now()}`, name: newName.trim(), meta: metaParts.trim(), client: newClient.trim(), industry: newIndustry, size: newSize, lead: newLead.trim(), created: new Date().toLocaleDateString(), status: "Not Started", cardBackgrounds: generateCardBackgrounds(), phaseBackgrounds: { ...PHASE_BACKGROUNDS } };
    const updated = [...projects, p];
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); setModalOpen(false);
    analytics.trackProjectCreated(p.id, newIndustry);
    onOpenProject(p);
  };

  const cloneProject = (src: { id: string; name: string; meta: string; client?: string; industry?: string; size?: string; lead?: string; created: string; status: string }) => {
    let ver = 2;
    let cloneName = `${src.name} — v${ver}`;
    while (nameExists(cloneName)) { ver++; cloneName = `${src.name} — v${ver}`; }
    const cloneId = `proj_${Date.now()}`;
    const clone = { ...src, id: cloneId, name: cloneName, created: new Date().toLocaleDateString(), status: "Not Started" };
    // Copy all localStorage data from source project
    Object.keys(localStorage).filter(k => k.startsWith(src.id)).forEach(k => {
      const newKey = k.replace(src.id, cloneId);
      try { localStorage.setItem(newKey, localStorage.getItem(k) || ""); } catch (e) { console.error("[Storage]", e); }
    });
    const updated = [...projects, clone];
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    Object.keys(localStorage).filter(k => k.startsWith(id) || k.includes(id)).forEach(k => localStorage.removeItem(k));
    setConfirmDelete(null);
  };

  // Adaptive card sizing
  const count = projects.length + 2; // +2 for sandbox + new project
  const cardWidth = count <= 3 ? 380 : count <= 5 ? 300 : count <= 7 ? 260 : 220;

  // ── View selector screen — shown after sandbox company selection ──
  if (pendingSandbox) {
    return <SandboxViewSelector companyName={pendingSandbox.name} onSelect={(mode) => {
      // Map guide modes to org view (they use the same data, just different framing)
      const isGuide = mode === "consultant" || mode === "hr";
      const resolvedViewMode = isGuide ? "org" : mode;
      localStorage.setItem(`${pendingSandbox.id}_viewMode`, JSON.stringify(resolvedViewMode === "custom" ? "custom" : resolvedViewMode));
      // Skip the Home splash screen — user already saw the sandbox splash
      try { sessionStorage.setItem(`${pendingSandbox.id}_splashSeen`, "1"); } catch (e) { console.error("[Storage]", e); }
      // If a guide was selected, flag it so Home auto-opens the guide viewer
      if (isGuide) { try { sessionStorage.setItem(`${pendingSandbox.id}_openGuide`, mode); } catch (e) { console.error("[Storage]", e); } }
      setPendingSandbox(null);
      setSandboxOpen(false);
      setSandboxPanelOpen(false);
      onCloseSandbox?.();
      onOpenProject(pendingSandbox);
    }} />;
  }

  // ── Sandbox full-screen picker ──
  if (sandboxOpen) {
    return <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0B1120" }}>
      {/* Full-bleed storefront background */}
      <VideoBackground name="sandbox_bg" overlay={0.2} poster={`${CDN_BASE}/sandbox_bg.png`} fallbackGradient="linear-gradient(160deg, #0B1120 0%, #1a1a30 40%, #12182a 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: sandboxPanelOpen ? "rgba(8,12,24,0.55)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.1) 0%, rgba(8,12,24,0.35) 50%, rgba(8,12,24,0.6) 100%)", transition: "background 0.5s ease" }} />

      {/* Back button */}
      <button onClick={() => { setSandboxOpen(false); setSandboxPanelOpen(false); onCloseSandbox?.(); }} style={{ position: "absolute", top: 24, left: 24, zIndex: 30, padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)", color: "rgba(255,230,200,0.8)", transition: "all 0.2s" }}>← Back</button>

      {/* Keyframes — outside conditional to avoid re-inject on every render */}
      <style>{`@keyframes sandboxFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } @keyframes sandboxGlow { 0%, 100% { border-color: rgba(139,92,246,0.2); } 50% { border-color: rgba(139,92,246,0.45); } }`}</style>

      {/* Click-to-open area */}
      {!sandboxPanelOpen && <div key="sandbox-cta" style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "pointer", animation: "sandboxFadeIn 1.2s ease forwards", opacity: 0 }} onClick={() => setSandboxPanelOpen(true)}>
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🎓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,245,235,0.95)", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>Industry Sandbox</div>
          <div style={{ padding: "10px 24px", borderRadius: 16, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(200,180,255,0.8)", fontSize: 14, fontWeight: 600, animation: "sandboxGlow 3s ease-in-out infinite" }}>Click anywhere to explore →</div>
        </div>
      </div>}

      {/* Slide-in panel from right */}
      <div style={{ position: "absolute", zIndex: 20, top: 0, right: 0, bottom: 0, width: sandboxPanelOpen ? "55%" : "0%", overflow: "hidden", transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.96)", backdropFilter: "blur(8px)", borderLeft: "1px solid rgba(139,92,246,0.1)", display: "flex", flexDirection: "column", padding: sandboxPanelOpen ? "32px" : "32px 0", opacity: sandboxPanelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto", WebkitFontSmoothing: "antialiased" as const }}>
          {/* Panel header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,245,235,0.95)" }}>🎓 Industry Sandbox</div>
              <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", marginTop: 4 }}>24 real companies · 8 industries × 3 market caps · 1,500–35,000 employees</div>
            </div>
            <button onClick={() => setSandboxPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Industry × Size Grid */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
              <thead><tr>
                <th style={{ fontSize: 15, color: "rgba(200,180,255,0.3)", textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>INDUSTRY</th>
                <th style={{ fontSize: 15, color: "rgba(16,185,129,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>SMALL</th>
                <th style={{ fontSize: 15, color: "rgba(212,134,10,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>MID-CAP</th>
                <th style={{ fontSize: 15, color: "rgba(239,68,68,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>LARGE-CAP</th>
              </tr></thead>
              <tbody>{[
                { id: "technology", icon: "💻", label: "Technology", s: "Palantir · 3,800", m: "ServiceNow · 12,000", l: "Adobe · 30,000" },
                { id: "financial_services", icon: "🏦", label: "Financial Svc", s: "Evercore · 2,200", m: "Raymond James · 16,000", l: "Goldman Sachs · 35,000" },
                { id: "healthcare", icon: "🏥", label: "Healthcare", s: "Hims & Hers · 1,500", m: "Molina · 14,000", l: "Elevance · 32,000" },
                { id: "retail", icon: "🛍️", label: "Retail", s: "Five Below · 4,500", m: "Williams-Sonoma · 10,000", l: "Target · 35,000" },
                { id: "manufacturing", icon: "🏭", label: "Manufacturing", s: "Axon · 4,000", m: "Parker Hannifin · 13,000", l: "Honeywell · 28,000" },
                { id: "consulting", icon: "💼", label: "Consulting", s: "Huron · 2,500", m: "Booz Allen · 15,000", l: "Accenture · 35,000" },
                { id: "energy", icon: "⚡", label: "Energy", s: "Shoals Tech · 1,800", m: "Chesapeake · 8,000", l: "Baker Hughes · 25,000" },
                { id: "aerospace", icon: "🚀", label: "Aerospace", s: "Kratos · 4,000", m: "L3Harris · 17,000", l: "Northrop Grumman · 33,000" },
              ].map(ind => <tr key={ind.id}>
                <td style={{ fontSize: 15, color: "rgba(200,180,255,0.7)", padding: "3px 10px", fontWeight: 600 }}><span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.label}</td>
                {[{size: "small", info: ind.s, color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7"}, {size: "mid", info: ind.m, color: "rgba(212,134,10,0.12)", border: "rgba(212,134,10,0.25)", text: "var(--warning)"}, {size: "large", info: ind.l, color: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", text: "#FCA5A5"}].map(t => <td key={t.size} style={{ padding: 2 }}><button disabled={!!seedingId} onClick={async (e) => {
                  e.stopPropagation();
                  const tid = `tutorial_${t.size}_${ind.id}`;
                  setSeedingId(tid);
                  setSandboxError(null);
                  try {
                    const res = await api.apiFetch(`/api/tutorial/seed?industry=${ind.id}&size=${t.size}`);
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);
                  } catch (err) {
                    console.warn("Backend seed failed, continuing with local data:", err);
                  }
                  seedTutorialData(tid, ind.id);
                  setSeedingId(null);
                  const companyName = t.info.split(" · ")[0] || ind.label;
                  analytics.trackSandboxSelected(companyName);
                  setPendingSandbox({ id: tid, name: companyName, meta: `${ind.label} · ${t.size === "small" ? "Small-Cap" : t.size === "mid" ? "Mid-Cap" : "Large-Cap"} · ${t.info.split(" · ")[1] || ""} employees` });
                }} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: seedingId ? "wait" : "pointer", background: seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.25)" : t.color, border: `1px solid ${seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.5)" : t.border}`, color: t.text, transition: "all 0.2s", textAlign: "center", lineHeight: 1.4, opacity: seedingId && seedingId !== `tutorial_${t.size}_${ind.id}` ? 0.4 : 1 }} onMouseEnter={e => { if (!seedingId) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = t.text; }}} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; }}>{seedingId === `tutorial_${t.size}_${ind.id}` ? "⏳ Loading..." : t.info}</button></td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {/* Error message */}
          {sandboxError && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FCA5A5" }}>{sandboxError}</div>
          </div>}

          {/* Guided tour note */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>✨ Each sandbox includes:</div>
            <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", lineHeight: 1.6 }}>Full employee roster · Task-level work design · Skills inventory · AI readiness scores · Manager capability · Change readiness</div>
          </div>
        </div>
      </div>
    </div>;
  }

  const tutorialCompleted = typeof window !== "undefined" && localStorage.getItem("tutorial_completed") === "true";
  const displayName = user?.display_name || user?.username || "there";
  const INDUSTRIES_PREVIEW = ["💻", "🏦", "🏥", "🛍️", "🏭", "💼", "⚡", "🚀"];

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Keyframes */}
    <style>{`
      @keyframes hubFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes hubShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes hubPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      .hub-card { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
      .hub-card:hover { transform: perspective(1000px) rotateY(1.5deg) translateY(-6px) !important; }
      .hub-cta { position: relative; overflow: hidden; }
      .hub-cta::after { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent); transition: left 0.5s ease; }
      .hub-cta:hover::after { left: 120%; }
    `}</style>

    {/* Video background */}
    <VideoBackground name="hero_bg" overlay={0.35} poster={`${CDN_BASE}/hero_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)" className="absolute inset-0 w-full h-full" />
    {/* Strong bottom gradient for text readability */}
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, rgba(11,17,32,0.2) 0%, rgba(11,17,32,0.35) 25%, rgba(11,17,32,0.6) 55%, rgba(11,17,32,0.88) 80%, rgba(11,17,32,0.97) 100%)", width: "100%", minHeight: "100%" }} />

    {/* Content */}
    <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", padding: "80px 60px 40px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 48, animation: "hubFadeUp 0.6s ease forwards" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-primary)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>Welcome back, {displayName}</div>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 32px rgba(0,0,0,0.4)" }}>Your Projects</h1>
        <p style={{ fontSize: 17, color: "rgba(255,220,180,0.45)", marginTop: 8, fontFamily: "'Outfit', sans-serif", fontWeight: 400 }}>Select a project or create a new one</p>
      </div>

      {/* ── THREE MAIN CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 48 }}>

        {/* TUTORIAL CARD */}
        <div className="hub-card" onClick={() => onStartTutorial?.()} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(99,102,241,0.2)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.1s", opacity: 0 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; e.currentTarget.style.boxShadow = "none"; }}>
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.15))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>🧭</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Platform Tutorial</div>
          <div style={{ fontSize: 14, color: "rgba(165,180,252,0.6)", lineHeight: 1.6, marginBottom: 20 }}>Learn the platform in ~8 minutes — no data needed</div>
          {tutorialCompleted && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(99,102,241,0.15)", overflow: "hidden" }}><div style={{ width: "100%", height: "100%", borderRadius: 2, background: "#6366F1" }} /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6366F1", fontFamily: "'IBM Plex Mono', monospace" }}>Complete</span>
          </div>}
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.2))", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{tutorialCompleted ? "Retake Tutorial" : "Start Tutorial"} <span style={{ fontSize: 16 }}>→</span></div>
        </div>

        {/* SANDBOX CARD — visually dominant */}
        <div className="hub-card" onClick={() => { setSandboxOpen(true); setSandboxPanelOpen(false); onOpenSandbox?.(); }} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(224,144,64,0.25)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.2s", opacity: 0, boxShadow: "0 0 40px rgba(224,144,64,0.06)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(224,144,64,0.5)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(224,144,64,0.18), inset 0 1px 0 rgba(255,255,255,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(224,144,64,0.25)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(224,144,64,0.06)"; }}>
          {/* Ambient glow */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,144,64,0.12), transparent 70%)", pointerEvents: "none" }} />
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(224,144,64,0.25), rgba(249,115,22,0.2))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>🏢</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Industry Sandbox</div>
          <div style={{ fontSize: 14, color: "rgba(255,200,150,0.55)", lineHeight: 1.6, marginBottom: 16 }}>Explore 24 real companies across 8 industries with full workforce data</div>
          {/* Industry icons preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            {INDUSTRIES_PREVIEW.map((icon, i) => <div key={i} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>)}
            <span style={{ fontSize: 12, color: "rgba(255,200,150,0.35)", fontWeight: 600, marginLeft: 4 }}>8 industries</span>
          </div>
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", boxShadow: "0 4px 20px rgba(224,144,64,0.3)" }}>Explore Companies <span style={{ fontSize: 16 }}>→</span></div>
        </div>

        {/* NEW PROJECT CARD */}
        <div className="hub-card" onClick={() => setModalOpen(true)} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(20,184,166,0.2)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.3s", opacity: 0 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.45)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(20,184,166,0.12), inset 0 1px 0 rgba(255,255,255,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.2)"; e.currentTarget.style.boxShadow = "none"; }}>
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(16,185,129,0.15))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>✦</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>New Project</div>
          <div style={{ fontSize: 14, color: "rgba(153,246,228,0.5)", lineHeight: 1.6, marginBottom: 20 }}>Upload your organization's data and build a custom transformation strategy</div>
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, rgba(20,184,166,0.25), rgba(16,185,129,0.2))", border: "1px solid rgba(20,184,166,0.3)", color: "#5eead4", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Create Project <span style={{ fontSize: 16 }}>→</span></div>
        </div>
      </div>

      {/* ── RECENT PROJECTS (horizontal scroll) ── */}
      {projects.length > 0 && <div style={{ marginBottom: 48, animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.4s", opacity: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "'Outfit', sans-serif" }}>Recent Projects</div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: "rgba(224,144,64,0.12)", color: "var(--accent-primary)" }}>{projects.length}</span>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
          {projects.map(p => {
            let pStatus = p.status;
            try { const v = localStorage.getItem(`${p.id}_visited`); if (v && Object.keys(JSON.parse(v)).length > 0) pStatus = "In Progress"; } catch (e) { console.error("[Storage]", e); }
            try { const vm = localStorage.getItem(`${p.id}_viewMode`); if (vm) pStatus = "In Progress"; } catch (e) { console.error("[Storage]", e); }
            const statusColor = pStatus === "In Progress" ? "var(--accent-primary)" : pStatus === "Complete" ? "var(--success)" : "rgba(255,200,150,0.25)";
            let modulesVisited = 0;
            try { const v = localStorage.getItem(`${p.id}_visited`); if (v) modulesVisited = Object.keys(JSON.parse(v)).length; } catch (e) { console.error("[Storage]", e); }
            const progressPct = Math.min(100, Math.round((modulesVisited / 8) * 100));

            return <div key={p.id} onClick={() => onOpenProject(p)} style={{ minWidth: 260, maxWidth: 300, flex: "0 0 auto", scrollSnapAlign: "start", borderRadius: 20, cursor: "pointer", padding: "20px 24px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,200,150,0.06)"; e.currentTarget.style.borderColor = "rgba(224,144,64,0.25)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              {/* Delete/clone - top right */}
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0"}>
                <button onClick={e => { e.stopPropagation(); cloneProject(p); }} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Clone">⧉</button>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">✕</button>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 6, paddingRight: 50 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {p.industry && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(224,144,64,0.12)", color: "rgba(232,197,71,0.7)" }}>{p.industry}</span>}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{pStatus}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 2, background: statusColor, transition: "width 0.5s ease" }} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>{modulesVisited}/8</span>
              </div>
              {p.created && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{p.created}</div>}
            </div>;
          })}
        </div>
      </div>}

      {/* ── BOTTOM STATS BAR ── */}
      <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.5s", opacity: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,200,150,0.18)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5 }}>
          24 sandbox companies · 8 industries · 47 music tracks · Built by Hiral Merchant
        </div>
      </div>
    </div>

    {/* Create modal */}
    {modalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md" style={{ background: "rgba(15,12,8,0.97)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,200,150,0.1)" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>New Transformation Project</h2>
        <p style={{ fontSize: 14, color: "rgba(255,220,180,0.4)", marginBottom: 24 }}>Fill in the details below to set up your workspace</p>
        <div className="space-y-3">
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Project Name *</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp AI Transformation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: nameTaken ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} autoFocus />
          {nameTaken && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>A project with this name already exists.</div>}</div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Client / Organization</div>
          <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Acme Corporation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Industry</div>
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none" }}>
              <option value="">Select industry...</option>
              {["Financial Services","Technology","Healthcare","Manufacturing","Retail","Energy","Media","Professional Services","Public Sector","Other"].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Org Size</div>
            <select value={newSize} onChange={e => setNewSize(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none" }}>
              <option value="">Select size...</option>
              {["< 500 employees","500 - 2,000","2,000 - 10,000","10,000 - 50,000","50,000+"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Project Lead</div>
          <input value={newLead} onChange={e => setNewLead(e.target.value)} placeholder="e.g. Jane Smith, VP Transformation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} /></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Description / Objectives</div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are the goals of this transformation?" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif", resize: "none" }} rows={3} /></div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={() => { setModalOpen(false); setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); }} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "rgba(255,200,150,0.5)", border: "1px solid rgba(255,255,255,0.08)", background: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={createProject} disabled={!newName.trim() || nameTaken} style={{ padding: "10px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", cursor: !newName.trim() || nameTaken ? "not-allowed" : "pointer", opacity: !newName.trim() || nameTaken ? 0.4 : 1, boxShadow: "0 4px 16px rgba(224,144,64,0.25)" }}>Create Project</button>
        </div>
      </div>
    </div>}

    {/* Delete confirmation */}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setConfirmDelete(null)}>
      <div style={{ borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, textAlign: "center", background: "rgba(15,12,8,0.97)", backdropFilter: "blur(32px)", border: "1px solid rgba(239,68,68,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>Delete Project?</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Are you sure you want to delete <strong style={{ color: "#fff" }}>{projects.find(p => p.id === confirmDelete)?.name || "this project"}</strong>?</p>
        <p style={{ fontSize: 13, color: "#f87171", marginBottom: 24 }}>This cannot be undone.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setConfirmDelete(null)} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "rgba(255,200,150,0.5)", border: "1px solid rgba(255,255,255,0.08)", background: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => deleteProject(confirmDelete)} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </div>}
  </div>;
}
