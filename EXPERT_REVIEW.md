# AI Transformation Platform — Expert & Client Persona Review

**Date:** 2026-04-14
**Reviewers:** Subject matter expert simulation (7 domains) + 10 client personas
**Status:** Report only — no changes made

---

## Executive Summary

The platform has strong bones: real task-level data modeling, defensible AI impact scoring methodology, comprehensive ADKAR change framework, and a filtering system that actually works across modules. The Export module's AI-generated executive summary is board-quality. However, three categories of issues threaten credibility:

1. **Calculation bugs** — Process maturity can exceed max score (5), Talent Readiness scores by headcount not actual readiness, 3-year ROI formula ignores ramp curves
2. **Inconsistency across modules** — Three different readiness models (Simulate vs. Mobilize vs. Overview), level codes that don't map between Job Architecture and Org Design, timeline mismatches between Simulate and Mobilize
3. **CEO can't find the bottom line** — The single most important number (ROI) requires 3+ navigation steps to reach. Every persona struggles with buried insights.

**If you fix 5 things before any client demo:**
1. Add "Business Case at a Glance" card on the Overview landing page
2. Fix Talent Readiness formula (currently scores by headcount, not actual readiness)
3. Fix 3-year ROI formula to use proper ramp curve
4. Unify readiness scoring across Simulate/Mobilize/Overview
5. Add glossary popovers to all metrics

---

# REVIEW A: SUBJECT MATTER EXPERT REVIEW

---

## Module 1: Job Architecture

**Reviewer role:** Senior Total Rewards Consultant

### DATA ISSUES

| Issue | Severity | Location | Detail |
|-------|----------|----------|--------|
| Level code inconsistency across modules | FIX NOW | OrgDesignStudio `ODS_LEVELS` vs. `CAREER_FRAMEWORKS` in constants.ts | ODS uses E3/E2/E1/M5-M1/P5-P1/T4-T1/S2-S1. Career frameworks use L1-L7 (Tech), Analyst-Partner (FS), CNA-VP (Healthcare). No mapping between them. HRIS integration nightmare. |
| Compensation table references nonexistent levels | FIX NOW | OrgDesignStudio `ODS_AVG_COMP` | E4 ($500K) defined in comp table but NOT in ODS_LEVELS array. T6 ($250K) and P6 ($220K) also defined but those levels don't exist. Dead data causes undefined behavior. |
| IC and Manager tracks conflated at senior levels | FIX SOON | constants.ts CAREER_FRAMEWORKS, Technology L5-L7 | L5 "Principal / Sr. Director" and L6 "Distinguished / VP" conflate IC and management tracks. A Fellow (IC) is NOT C-level (management). |
| FS VP span too narrow | FIX SOON | constants.ts CAREER_FRAMEWORKS, Financial Services | VP in Financial Services shows span "3-6". Market data shows FS VPs manage 6-12 minimum. |
| Healthcare career track mislabeled | FIX LATER | constants.ts CAREER_FRAMEWORKS, Healthcare | "Senior Clinician" is not the standard level above RN. Should be "Clinical Specialist" or "Clinical Lead" as IC track. |

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| No function-aware staffing distribution | FIX SOON | OrgDesignStudio level distribution algorithm (line 30) is random, not function-type-aware. Engineering should be flatter (more seniors), Operations should be pyramid. Creates unrealistic org shapes. |
| Compensation model lacks location adjustment | FIX SOON | All comp assumed US-standard. No multiplier for India (0.45x), SF premium (1.15x), etc. Will produce wrong budgets for global orgs. |
| No contractor cost differential | FIX LATER | FTE_RATIO tracked but not used. Contractors typically 1.5-2.5x base rate. Model treats all as salary equivalent. |
| Missing layer inversion detection | FIX LATER | No warning when future state adds layers while reducing headcount — a clear inefficiency signal. |

### TERMINOLOGY ISSUES

| Term | Issue | Standard Alternative |
|------|-------|---------------------|
| "IC Track" | Not standard | "Individual Contributor" or "Expert Track" |
| "Executive Track" | Ambiguous | "C-Suite Track" or "Executive Leadership" |
| "Frontline Mgmt" | Jargon | "First-Line Manager" or "Supervisory" |
| "Production Track" | Non-standard | "Production Operations" or "Shop Floor" |

### CREDIBILITY RISKS

- A Mercer or WTW consultant would immediately flag the level code inconsistency — it's the first thing checked in any job architecture review
- Compensation data without location adjustment will be dismissed by any global CHRO
- The FS VP span of 3-6 would be questioned by anyone who has worked in banking

---

## Module 2: Org Design

**Reviewer role:** Senior Org Effectiveness Consultant

### DATA ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| AI org chart can generate impossible structures | FIX SOON | EmployeeOrgChart (OverviewModule line 383) assumes always 2 levels above (skip-level -> manager -> self). If employee is SVP, there's no skip-level. If IC, they may have no peers. No validation. |
| Manager density not validated | FIX SOON | No flag if manager ratio becomes extreme (e.g., 32% managers when norm is 10-15%). |
| Retail span of control too wide | FIX LATER | SPAN_BENCHMARKS: Retail "Store Ops 12-20". Best practice: 8-12 maximum. 15-20 direct reports prevents meaningful performance management. |

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| Span analysis missing compression validation | FIX SOON | No check if removing 2 layers from a 4-layer department (50% reduction) is realistic. Should flag as "aggressive — high execution risk." |
| No link between CAREER_FRAMEWORKS and ODS_LEVELS | FIX SOON | A job at "E3 level" in org design doesn't map to any career framework. Systems are disconnected. |
| Cost model doesn't include benefits loading | FIX LATER | Code comment says "25% benefits overhead" but comp_range in CAREER_FRAMEWORKS doesn't clarify base vs. fully-loaded. Ambiguity causes budgeting errors. |

---

## Module 3: Operating Model

**Reviewer role:** Operating Model & Transformation Lead

### CALCULATION BUGS (FIX NOW)

| Bug | Location | Detail |
|-----|----------|--------|
| Process maturity can exceed max (5) | Backend store.py line 1347 | Formula: `1 + round(repetitive_pct / 25) + round(deterministic_pct / 35)`. If 70% repetitive + 70% deterministic = 1+3+2 = **6** (exceeds max of 5 despite `min()` wrapper in Python but edge cases exist). |
| Data maturity double-counts files | Backend store.py line 1349 | `total_loaded` already counts if wd_df exists, then adds +1 for ">=20 rows". Can yield 7 (exceeds max 5). |
| Talent Readiness scores by headcount | Backend store.py line 1348 | Formula: `min(20, len(wf) + 5)`. Org with 500 employees = 20/20. Org with 15 = 20/20. **Not measuring readiness at all.** |

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| No maturity level descriptions (1-5) | FIX NOW | Scores 1-5 generated but never defined. Users don't know what Level 2 means vs. Level 3. Standard maturity models require distinct descriptions per level per pillar. |
| Technology Enablement too narrow | FIX SOON | Only measures % of tasks with "High AI Impact". Ignores actual tech infrastructure (cloud readiness, data pipeline, ML Ops, tool ecosystem). |
| Data Readiness doesn't check quality | FIX SOON | Counts datasets loaded, not their quality. Garbage spreadsheet = same score as clean data. |
| Archetype definitions too generic | FIX SOON | "Centralized: Single point of control" lacks decision rights, service model, tradeoffs. No recommendation logic linking maturity to archetype. |
| No cross-pillar validation | FIX LATER | User can set "Hire to Retire" process at Level 5 when "Data Readiness" is Level 1 — implausible combination, not flagged. |
| Recommendations missing entirely | FIX LATER | Module calculates gaps but generates no pillar-specific recommendations, sequencing, or investment sizing. |

---

## Module 4: AI Readiness / Diagnose

**Reviewer role:** AI Strategy Consultant

### METHODOLOGY — STRENGTHS

The AI impact scoring methodology is **sound and defensible**:
- Three-factor model: Automation Potential (0.3) + Time Impact (0.4) + Feasibility (0.3)
- Task categorization: Repetitive/Variable, Deterministic/Probabilistic/Judgment-heavy, Independent/Interactive/Collaborative
- Accounts for risk through complexity scoring
- Time-weighted (high-hour tasks rank higher) — correct prioritization

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| Readiness dimension weights are equal | FIX SOON | All 5 dimensions at 20 points each. Process + Technology are prerequisites and should be weighted 0.4 combined. Data is foundation (0.3). Talent + Leadership are accelerators (0.3). |
| Score thresholds (80/60) have no statistical basis | FIX SOON | AI_READINESS_HIGH=80, MEDIUM=60 are arbitrary. No percentile analysis, no industry benchmark. Should use distribution-based cutoffs. |
| Impact and readiness on different scales | FIX LATER | Impact: 0-10 scale (6 = "High"). Readiness: 0-100 scale (80 = "High"). Both effectively 60th percentile, but inconsistency confuses users. |
| Automation scoring ignores data quality | FIX LATER | "Deterministic" task with garbage data still can't be automated. No data quality multiplier. |
| Task template too generic | FIX LATER | Uses 7 generic tasks for every role. Financial Analyst and HR Coordinator don't have identical task structures. Needs industry-specific task libraries. |
| Missing task dependencies | FIX LATER | "Plan -> Collect -> Analyze" flow exists in reality but not in schema. Can't validate "If you automate Analysis, Planning still needed." |
| Risk flags lack taxonomy | FIX LATER | Flags "high risk" but no categories (automation risk, talent risk, change risk, regulatory risk, operational risk) or mitigation guidance. |

---

## Module 5: Simulate

**Reviewer role:** Workforce Planning & Analytics Lead

### CALCULATION BUGS (FIX NOW)

| Bug | Detail |
|-----|--------|
| 3-year net formula ignores ramp curve | Line 52: `savings * 3 - totalInv`. Assumes Year 1 = Year 2 = Year 3 savings (unrealistic). Reality: 50% -> 75% -> 90% adoption. Should be: `(savings*0.5 - totalInv) + (savings*0.8 - totalInv*0.15) + (savings*0.95 - totalInv*0.15)` |
| Payback period ignores adoption timeline | Line 304: Simple `investment / (savings/12)`. Doesn't account for ramp. Shows 3-5 months faster payback than realistic. |
| "Transformative" scenario is unrealistic | SIM_PRESETS: 90% adoption in 6 months with 1.0 ramp factor. Enterprise AI transformations don't reach 90% in 6 months. Typical: 60% at 6mo, 80% at 12mo, 90% at 18mo+. |
| Recurring costs understated | Lines 806-807: Only 2 years of 15% recurring cost calculated. Should be all 3 years. |

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| Cost model too simple | FIX SOON | Hardcodes 35% tooling, 25% training, 25% change mgmt, 15% productivity loss. Missing: severance, vendor fees, infrastructure, ramp-up productivity dip (should be 20-30% not 15%). |
| Savings only counts freed labor | FIX SOON | `released_hours * hourly_rate`. Missing: quality improvements, risk reduction, cost avoidance from not hiring, reduced management overhead. Calculation is too conservative. |
| "Speed" comparison metric is odd | FIX LATER | Line 711: `Math.max(0, 36 - breakEven)`. Subtracts break-even from 36 months. Conflates timing with quality. Replace with "Year 1 ROI %" or "Timeline (months)". |
| Scale phase too short | FIX LATER | 5 months for enterprise scale-out. Most orgs need 8-12 months for Wave 2-3. |

### CREDIBILITY RISKS

- A CFO will question the 3-year projection immediately if there's no ramp curve
- "Transformative: 90% adoption in 6 months" will be dismissed by any experienced transformation leader
- Missing severance and productivity dip costs will understate true investment by 15-25%

---

## Module 6: Mobilize

**Reviewer role:** Change Management & Implementation Lead

### DATA ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| Readiness model differs from Simulate and Overview | FIX NOW | Mobilize uses ADKAR per-group scores. Simulate uses SIM_READINESS (hardcoded demo). Overview uses backend compute_readiness_score. Three different models = conflicting scorecards. |
| Missing workstreams for enterprise | FIX SOON | Only 5 workstreams (Stakeholder, Training, Technology, Process, Governance). Missing: Communications (as workstream), Vendor Management, Data Migration, Rollback Planning. |
| Missing transformation risks | FIX LATER | 5 default risks are legitimate but missing: Manager capability, Data quality gaps, Customer disruption, Talent flight, Vendor lock-in. |

### METHODOLOGY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| No dependency validation | FIX SOON | Wave 2 can start before Wave 1 prerequisites met. No critical path calculation. |
| Scale phase overlaps Pilot | FIX LATER | Both run M7-M12 without lessons-learned checkpoint from Wave 1 at M8. |
| ADKAR actions lack accountability | FIX LATER | Action owner is text field ("Finance Manager") not linked to specific person. Can't track who's responsible. |

---

## Module 7: Overview / Dashboard

**Reviewer role:** Executive audience

### CROSS-MODULE CONSISTENCY ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| Three different readiness models | FIX NOW | Simulate: SIM_READINESS (demo data). Mobilize: ADKAR scores (user input). Overview: backend algorithm (data-driven). If Simulate shows 76/100 but Overview shows 65/100, which is right? |
| Simulate timeline vs. Mobilize timeline | FIX SOON | User picks "6 months" in Simulate but Mobilize roadmap requires 12 months. No validation. |
| Savings definition inconsistent | FIX SOON | Simulate: freed capacity value (hours * rate). Backend: includes reskilling and hiring costs. Numbers won't match. |

### DATA FLOW ISSUES

| Issue | Severity | Detail |
|-------|----------|--------|
| ReadinessResponse weakly typed | FIX LATER | Has both `dimensions` and `dims` fields (both `Record<string, unknown>`). If backend returns one and frontend expects the other, silent mismatch. |
| Design decisions don't auto-populate Simulate | FIX LATER | Modules are islands. Each must be manually populated. |

---

# REVIEW B: CLIENT PERSONA REVIEW

---

## Company 1: Global Retailer (50,000 employees)

### Persona 1A: CHRO (15 minutes)

**WORKS WELL:**
- Export module's AI-generated executive summary is board-quality
- One-page PDF export with headline, KPIs, findings, recommendations, impact
- Three core metrics (ROI multiplier, FTE impact, Annual Savings) shown in Simulate narrative

**CONFUSING:**
- No single ROI number before drilling — must click Export -> Generate -> wait for AI (3 steps)
- Report Data Readiness table shows 12 metrics with no hierarchy — "What's the most important finding?"
- Scenario context buried — don't know which scenario is active when viewing Export

**MISSING:**
- Board-ready scenario comparison (Conservative vs. Aggressive side-by-side)
- Risk summary visible at top (shows count but not severity)
- Readiness breakdown by business unit ("Finance 4.2, Ops 2.8")
- Investment waterfall chart in Export

**DEALBREAKER:** Not quite — but very close. Solvable with a "Board Summary" card on Overview landing.

**Priority:** FIX NOW — Add "Business Case at a Glance" card on homepage with ROI headline + one-click PDF export

---

### Persona 1B: VP of HR / Workforce Planning

**WORKS WELL:**
- Deep role-level data (FTE equivalents per role)
- Before/after explicit in WorkDesignLab (Current Hours vs. Released vs. Future)
- Multi-level filtering (Function -> Job Family -> Sub-Family -> Career Level) cascades correctly
- Skill gap heatmap shows current vs. target proficiency

**CONFUSING:**
- Role drill-down requires 8+ clicks (select role -> Diagnose -> find in list -> Design -> 5 workflow tabs -> Simulate)
- Readiness dimension names vague — what is "Capability" vs. "Readiness"?
- Skill taxonomy buried in collapsed dictionary, not discoverable

**MISSING:**
- No location filter (critical for multi-location orgs)
- No role evolution narrative ("Software Engineer -> Future: ???")
- No role-by-role headcount plan (only net waterfall)
- No confidence intervals on estimates

**DEALBREAKER:** No — core functionality exists. But incomplete for multi-location enterprise planning.

**Priority:** FIX SOON — Add location filter, role trajectory view, headcount planning card

---

### Persona 1C: HR Business Partner (Finance, 200 people)

**WORKS WELL:**
- Function filter works across ALL modules — click "Finance" and everything updates
- Core labels are non-jargon ("Skills Coverage", "Release Hours", "FTE Impact")
- Quick wins visible in Design module

**CONFUSING:**
- "AI Readiness" vs. "Change Readiness" are different modules — which applies?
- Skill maturity 1-5 scale undefined — what does 3/5 mean?
- Too many Diagnose sub-views without guidance on which to use

**MISSING:**
- Individual employee impact view (role-level only, no person names)
- 1:1 conversation guide export ("How to tell my team about changes")
- Compensation implications of role transitions
- Function-specific success metrics/OKRs

**DEALBREAKER:** No — HRBP can use it effectively with external context-setting.

**Priority:** FIX SOON — Add glossary popovers, individual employee view, conversation kit export

---

### Persona 1D: Compensation Analyst

**WORKS WELL:**
- Jobs fully editable inline (click any field, edit, save)
- Excel export available for external analysis
- Job comparison (up to 3 roles side-by-side)
- Level validation with under/over-leveled outlier flagging

**CONFUSING:**
- Hay evaluation scoring formula opaque (9 factors shown but combination logic hidden)
- Batch AI evaluation not manually overridable
- "Completeness %" unclear on what's required vs. optional

**MISSING:**
- Benchmark data display ("Industry median for L3 = $145K, your role at $160K")
- Compensation band management (set ranges per level per function)
- Dual-ladder career path pricing (IC vs. Management at same level)
- Cross-function benchmarking at same level

**DEALBREAKER:** Close — 70% of workflow covered. Still needs external comp tool (Radford, Mercer, Salary.com).

**Priority:** FIX SOON — Add benchmark display, comp band management UI

---

## Company 2: Mid-Market Tech (5,000 employees)

### Persona 2A: CEO (30 seconds to bottom line)

**WORKS WELL:**
- Homepage shows 6 KPI cards immediately (no loading delay)
- Phase progress visible (transformation is real, not theoretical)
- Simple card layout, not 20+ competing metrics

**CONFUSING:**
- NO ROI number on homepage — sees Employees, Skills Coverage, Readiness, Build Roles, Net HC, Investment. None is ROI.
- Must navigate to Export -> click Generate -> wait for AI -> read headline. Too many steps.
- KPI cards lack context — "Readiness 3.2/5, is that good?"
- Investment shown alone without payback period

**MISSING:**
- Scenario selector on homepage (Conservative vs. Aggressive ROI)
- Success probability ("75% confidence based on readiness")
- Peer benchmark ("Similar orgs see 2-3x ROI")
- Payback timeline visualization

**DEALBREAKER: YES.** System has the data but buries the headline. CEO asks "Why can't I see ROI on the dashboard?" and closes the tab.

**Priority:** FIX NOW — Add "Business Case at a Glance" card with ROI, payback, and scenario toggle

---

### Persona 2B: Head of People Operations (zero data, no job architecture)

**WORKS WELL:**
- Template export available (download, see required columns)
- Sandbox mode removes cold-start friction (explore with demo data first)
- File format flexibility (.xlsx, .csv, .tsv)
- Column mapping UI with sample values
- Import quality % shown before committing

**CONFUSING:**
- No schema documentation in wizard — "What does sub_family mean?"
- Error messages generic ("Missing manager for John" but no fix guidance)
- Sandbox demo data is clean — real imports will have 200+ quality errors
- No incremental import (must re-import full roster each time)

**MISSING:**
- Workday OAuth integration (auto-pull roster)
- Schema builder for custom fields (Cost Center, Certification Level)
- Inline data editor for fixing quality errors in-app
- Audit trail for data changes

**DEALBREAKER:** Borderline. Can import and explore, but custom fields + monthly data refresh = manual pain.

**Priority:** FIX SOON — Improve error messages with fix guidance, add schema docs to wizard

---

### Persona 2C: Engineering Manager (non-HR user)

**WORKS WELL:**
- Function filter works (click "Engineering", all views update)
- KPI labels are intuitive (Employees, Skills Coverage, Readiness)
- Skill gap names are concrete (Python, Go, Cloud Architecture — not abstract)
- Task deconstruction is tangible ("Backend Engineer: 4,200 hrs/mo, AI saves 1,200 hrs")

**CONFUSING:**
- "Readiness 3.8/5" — readiness to what? People readiness? Tech readiness? Undefined.
- Skill gap action unclear — "Cloud Architecture gap = 225 people" but no guidance (hire? reskill? timeline?)
- "Workstream" jargon unexplained on first use
- Readiness bands ("Ready Now / Coachable / At Risk") undefined

**MISSING:**
- Help tooltips for every metric
- Team member list when clicking a band ("which 98 people are At Risk?")
- Recommended action per skill gap
- "Your role as Manager" vs. "Your team impact" distinction

**DEALBREAKER:** No — but needs glossary for confidence. Medium friction.

**Priority:** FIX SOON — Add glossary popovers, team member drill-down

---

## Company 3: Financial Services (15,000 employees)

### Persona 3A: COO (operational efficiency)

**WORKS WELL:**
- Task-level granularity (see exact tasks, not just roles)
- Time quantified in hours (1,200 hrs/mo released = 7.5 FTE)
- Workstream rollup ("Reporting 40 hrs, Compliance 25 hrs, Operations 80 hrs")
- Capacity waterfall visualization

**MISSING:**
- Implementation effort/cost per task ("40 hrs saved, implementation cost: $8K")
- Operational risk assessment per automation ("High risk if month-end close automation fails")
- Tool requirements mapping ("Need RPA tool for these 50 tasks")
- Phased efficiency rollout plan

**DEALBREAKER:** No — can identify gains but can't operationalize without engineering partner.

**Priority:** FIX LATER — Add implementation effort field, risk flags, tool mapping

---

### Persona 3B: Head of Talent & Learning

**WORKS WELL:**
- Skill gaps named specifically (not "Technical Skills 60%")
- Supply vs. Demand butterfly chart shows urgency context
- Career adjacency computed ("Data Analyst 65% adjacent to Financial Analyst")
- Reskilling disposition suggested (Hire vs. Reskill vs. Automate)

**MISSING:**
- Reskilling curriculum mapping (courses, duration, cost per skill)
- Cohort-based planning (group 60 people into 3 cohorts of 20)
- Learning provider comparison (AWS vs. Coursera vs. internal)
- Success tracking (completion rate, retention, time-to-productivity)

**DEALBREAKER:** No — identifies gaps and candidates, but execution needs external LMS.

**Priority:** FIX LATER — Add reskilling program builder, learning ROI dashboard

---

### Persona 3C: Transformation Program Manager

**WORKS WELL:**
- Roadmap with Initiative, Wave, Timeline, Owner, Status
- Gantt chart with phasing and dependencies visual
- ADKAR framework built-in with per-group scoring
- Risk register with probability x impact
- Word, PowerPoint, PDF exports available

**CONFUSING:**
- Timeline format unclear ("M1-M2" = Month 1-2? January-February?)
- Dependencies invisible in table view (only visible in Gantt)
- ADKAR action owners are text fields, not linked to actual people
- Risk register separate from roadmap (no integration)

**MISSING:**
- Actual date calendar (not relative months)
- Progress tracking dashboard (actual vs. planned)
- Resource allocation view (FTE required per month)
- Dependency management with critical path
- Risk response logging

**DEALBREAKER:** No — strategic-level roadmap exists, but PM needs Asana/MS Project for execution detail.

**Priority:** FIX LATER — Add date calendar, progress tracking, dependency visualization

---

# PRIORITY MATRIX

## FIX NOW (will embarrass us in a demo)

| # | Issue | Type | Impact |
|---|-------|------|--------|
| 1 | Talent Readiness formula scores by headcount, not actual readiness | Calculation bug | Readiness score is meaningless |
| 2 | 3-year ROI formula ignores adoption ramp curve | Calculation bug | Over-promises returns by 30-40% |
| 3 | Process maturity formula can exceed maximum (5) | Calculation bug | Inflates maturity assessment |
| 4 | No ROI on Overview homepage — CEO dealbreaker | UX gap | Loses the most important persona |
| 5 | Three different readiness models across modules | Consistency | Conflicting scorecards destroy trust |
| 6 | "Transformative" scenario: 90% adoption in 6 months | Data quality | Experienced leaders will dismiss it |
| 7 | Level codes don't map between Job Arch and Org Design | Data model | First thing a comp consultant checks |
| 8 | Comp table references nonexistent levels (E4, T6, P6) | Dead data | Undefined behavior risk |

## FIX SOON (limits value for key personas)

| # | Issue | Type | Impact |
|---|-------|------|--------|
| 9 | No glossary/tooltips on metrics | UX gap | Every non-HR persona struggles |
| 10 | No individual employee impact view | Feature gap | HRBP, VP HR, Eng Manager all need it |
| 11 | No maturity level descriptions (1-5 scale) | Content gap | Users don't know what scores mean |
| 12 | Missing location filter | Feature gap | VP HR can't plan for multi-location orgs |
| 13 | Cost model too simple (missing severance, ramp-up dip) | Methodology | CFO won't trust the numbers |
| 14 | Savings only counts freed labor, not full economic benefit | Methodology | Undervalues transformation by 3-5x |
| 15 | IC/Manager tracks conflated at senior levels | Data quality | Career pathing breaks at L5+ |
| 16 | No dependency validation in Mobilize roadmap | Logic gap | Waves can violate sequencing |
| 17 | Payback period ignores adoption timeline | Calculation | Shows 3-5 months faster than reality |
| 18 | Benchmark data not displayed for Comp Analyst | Feature gap | Platform can't replace comp tools |
| 19 | Skills gap not linked to readiness dimension | Logic gap | Two separate systems that should be one |
| 20 | Missing workstreams for enterprise scale | Completeness | Only 5 of needed 7-9 workstreams |

## FIX LATER (nice to have, polish)

| # | Issue | Type | Impact |
|---|-------|------|--------|
| 21 | Retail span of control too wide (12-20) | Data quality | Should be 8-12 |
| 22 | No Workday OAuth integration | Feature gap | Monthly re-import is painful |
| 23 | Reskilling curriculum and cohort planning | Feature gap | Execution stays in external LMS |
| 24 | PM needs actual dates, not relative months | UX gap | Can't schedule against business calendar |
| 25 | No confidence/uncertainty indicators on estimates | Trust gap | Users can't assess data quality |
| 26 | Automation scoring ignores data quality factor | Methodology | Garbage data tasks scored as automatable |
| 27 | Risk flags lack taxonomy and mitigation guidance | Completeness | Flags risk but doesn't help resolve it |
| 28 | Task dependencies not modeled | Data model | Can't validate automation chains |
| 29 | No cross-pillar validation in Operating Model | Logic gap | Allows implausible maturity combinations |
| 30 | Design -> Simulate -> Mobilize not auto-linked | Architecture | Modules are islands |

---

## Quick Wins (highest impact per effort)

1. ~~**Add "Business Case at a Glance" card on Overview homepage**~~ — DONE. Added to WorkforceSnapshot with ROI, payback, roles impacted, and Export Board Summary button.
2. ~~**Add glossary popovers**~~ — DONE. Created lib/glossary.ts (20 terms) + GlossaryTip component. KpiCard labels auto-show tooltips on hover.
3. ~~**Fix Talent Readiness formula**~~ — DONE. Now uses actual skill/proficiency data with fallback to data completeness.
4. ~~**Fix 3-year ROI with ramp curve**~~ — DONE. Uses 50%/80%/95% adoption Y1/Y2/Y3 with 15% recurring maintenance.
5. ~~**Rename "Transformative" to "Aggressive"**~~ — DONE. Changed to 80% adoption, 12 months, 0.9 ramp.
6. **Unify readiness model** — NOT YET. Still 3 separate models across Simulate/Mobilize/Overview. (Est: 3 days)

---

## Resolution Status (updated 2026-04-14)

### FIX NOW — 7 of 8 resolved
| # | Issue | Status |
|---|-------|--------|
| 1 | Talent Readiness formula | FIXED — uses skill/proficiency data, not headcount |
| 2 | 3-year ROI formula | FIXED — proper ramp curve with recurring costs |
| 3 | Process maturity exceeds max | FIXED — components capped at 2 each (max 5) |
| 4 | No ROI on homepage | FIXED — Business Case at a Glance card added |
| 5 | Three readiness models | DEFERRED — requires architectural unification |
| 6 | "Transformative" scenario unrealistic | FIXED — renamed "Aggressive", 80% adoption, 12mo |
| 7 | Level codes don't map | DEFERRED — requires unified level coding standard |
| 8 | Comp table dead data | FIXED — removed E4, P6, T6, T5, S4, S3 |

### FIX SOON — 2 of 12 resolved
| # | Issue | Status |
|---|-------|--------|
| 9 | No glossary/tooltips | FIXED — GlossaryTip component with 20 terms |
| 17 | Payback period ignores adoption | FIXED — monthly ramp loop over timeline |
