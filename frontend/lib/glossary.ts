/**
 * Platform glossary — hover definitions for all key metrics and terms.
 * Used by the GlossaryTip component to show contextual help.
 */
export const GLOSSARY: Record<string, { definition: string; action?: string }> = {
  // KPI Metrics
  "AI Readiness": {
    definition: "Overall score (0-100) measuring how prepared your organization is to adopt AI, based on 5 dimensions: Data, Process, Technology, Talent, and Leadership.",
    action: "Score below 60 means foundational gaps exist. Focus on the lowest-scoring dimension first."
  },
  "Readiness Score": {
    definition: "Aggregate readiness across 5 dimensions (Data, Process, Technology, Talent, Leadership), each scored 0-20 for a total of 0-100.",
    action: "Aim for 70+ before starting pilot programs."
  },
  "Skills Coverage": {
    definition: "Percentage of required future-state skills that your current workforce already possesses at proficiency level 2+.",
    action: "Below 60% means significant reskilling investment is needed."
  },
  "FTE Impact": {
    definition: "Full-Time Equivalent hours freed by AI automation. 160 hours/month = 1 FTE.",
    action: "Freed FTEs can be redeployed to higher-value work, not necessarily eliminated."
  },
  "Span of Control": {
    definition: "Number of direct reports per manager. Industry norm: 6-10 for knowledge work, 10-15 for operational roles.",
    action: "Below 5 suggests over-layering. Above 12 suggests manager overload."
  },
  "High AI Impact": {
    definition: "Percentage of tasks scored as highly automatable based on task type (repetitive), logic (deterministic), and interaction level (independent).",
    action: "High-impact tasks are quick wins for automation pilots."
  },
  "Net Headcount Change": {
    definition: "Projected change in total headcount after transformation — includes reductions from automation and additions from new roles.",
    action: "Negative doesn't always mean layoffs — often means not backfilling attrition."
  },

  // Module-specific terms
  "Workstream": {
    definition: "A group of related tasks within a role that serve a common business process (e.g., Reporting, Compliance, Planning).",
  },
  "Deconstruction": {
    definition: "The process of breaking a role into its component tasks to analyze which can be automated, augmented, or redesigned.",
  },
  "Reconstruction": {
    definition: "Rebuilding a role after deconstruction — combining remaining human tasks with new responsibilities freed up by automation.",
  },
  "ADKAR": {
    definition: "Change management framework: Awareness, Desire, Knowledge, Ability, Reinforcement. Measures organizational readiness for change at each stage.",
    action: "Identify which ADKAR dimension is the bottleneck for each stakeholder group."
  },
  "Build/Buy/Borrow/Automate": {
    definition: "Talent strategy framework for closing capability gaps: Build (train existing), Buy (hire new), Borrow (contractors), Automate (technology).",
  },
  "Operating Model Maturity": {
    definition: "Assessment of organizational capability across 6 pillars (Process, Technology, People, Governance, Data, Culture) on a 1-5 scale.",
    action: "Level 1-2: foundational gaps. Level 3: standardized. Level 4-5: optimized/predictive."
  },

  // Readiness dimensions
  "Data Readiness": {
    definition: "Availability, quality, and completeness of workforce data needed for AI-driven analysis.",
    action: "Upload all available workforce, skills, and org structure data to improve this score."
  },
  "Process Standardization": {
    definition: "Degree to which work processes are documented, repeatable, and rule-based — a prerequisite for automation.",
  },
  "Technology Enablement": {
    definition: "Percentage of work tasks that have high AI automation potential based on current technology capabilities.",
  },
  "Talent Readiness": {
    definition: "Workforce capability to adopt and work alongside AI tools, measured by skill coverage, proficiency levels, and learning velocity.",
  },
  "Leadership Alignment": {
    definition: "Degree to which executive leadership has committed to the transformation through governance, budgets, and communication.",
  },

  // Architecture terms (Dim 5: Feynman translations)
  "Compression Ratio": {
    definition: "The ratio of people at one level to available positions at the next level up. 4.3:1 means 4.3 people competing for each next-level position.",
    action: "Ratios above 4:1 indicate career bottlenecks — consider lateral paths or role redesign."
  },
  "FTE Ratio": {
    definition: "Percentage of permanent full-time employees vs. total headcount including contractors. 75% means 25% contingent workforce.",
    action: "Below 80% indicates contractor dependency — consider converting critical roles to FTE."
  },
  "IPE": {
    definition: "International Position Evaluation — Mercer's globally standardized framework for sizing and leveling jobs based on impact, communication, innovation, knowledge, and risk.",
  },
  "Career Lattice": {
    definition: "Non-linear career movement framework — lateral, diagonal, and upward moves across tracks. Unlike a ladder, a lattice shows every possible career move.",
  },
  "Broadbanding": {
    definition: "Combining multiple narrow pay grades into fewer wide bands. Simplifies compensation structure and enables lateral career movement.",
  },
  "Dual-Track": {
    definition: "Parallel individual contributor (IC) and management paths at senior levels, so technical experts can advance without managing people.",
  },

  // Scoring bands
  "Ready Now": {
    definition: "Employees with sufficient skills and role alignment to adopt AI tools immediately with minimal additional training.",
  },
  "Coachable": {
    definition: "Employees who need targeted upskilling (typically 3-6 months) but have adjacent skills and willingness to transition.",
  },
  "At Risk": {
    definition: "Employees whose current skills have low overlap with future requirements, requiring significant reskilling or role redesign.",
    action: "Prioritize these employees for early intervention — reskilling pathways or managed redeployment."
  },
};
