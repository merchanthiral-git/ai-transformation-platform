# Job Architecture Module — V2 Backlog Spec

**Location in platform:** Discovery stage → Job Architecture
**Project root:** `~/Desktop/ai-transformation-platform/`
**Stack:** Next.js 16 / React 19 frontend, FastAPI backend
**Prerequisite:** V1 spec (`ja-mapping-spec.md`) must be implemented and stable first.

---

## Instructions for Claude Code

This is a backlog of advanced features that extend the core JA Mapping module built in v1. **Do not attempt to build this in one pass.** It is organized by phase and by priority tier within each phase.

Before writing any code:

1. Confirm the v1 spec is fully implemented and stable. If not, do not start v2.
2. Read this spec fully. Identify dependencies between sections.
3. Write a phased implementation plan grouped into:
   - **Tier 1 (highest leverage):** the ~7 features that unlock the most value
   - **Tier 2 (strong value, moderate complexity):** next wave
   - **Tier 3 (nice to have):** ship if time permits
4. For each tier, propose a sprint-sized scope and the file-level changes required.
5. Flag any data model migrations from v1 that are needed.
6. **Pause and wait for approval before writing implementation code.**

Design system is unchanged from v1: ivory `#F7F5F0`, navy `#1C2B3A`, blue `#3B82F6`, orange `#F97316`. Match existing typography and spacing. Run `npm run build` after each phase.

Deploy pattern: `git add -A && git commit -m "..." && git push origin main`. Railway auto-deploys backend, Vercel auto-deploys frontend.

---

## Tier 1: Highest-leverage additions

These are the features that meaningfully change what the tool can do. Prioritize these.

### 1. Split and merge role operations

**The gap:** V1 assumes 1:1 mapping between current and future state. Real JA work is constantly 1:many (a generalist PM splits into Growth PM and Platform PM) and many:1 (Customer Success Manager and Account Manager merge into one role).

**What to build:**

- Data model: mapping is not a pair, it's a pattern. Support `mapping_type`: one_to_one, one_to_many, many_to_one, many_to_many, create, eliminate.
- UI: on the mapping detail drawer, add action buttons "Split this role..." and "Merge with another role..."
- Split flow: select a role, specify N target future-state roles, define which incumbents go to which future-state role (default: AI distributes based on skill/tenure signals).
- Merge flow: select 2+ current-state roles, specify the target future-state role, resolve conflicts where incumbents' old roles had different architecture dimensions.
- Grid view: split/merge relationships visualized — when a role is the source of a split, show small "→ splits to 2" indicator. When a role is the target of a merge, show "← merged from 3".
- Change impact preview (v1 Section 13): must handle split/merge scenarios, showing how incumbents distribute across the new roles.

**Backend:**

<!-- AUDIT EDIT: Section 1 - Added explicit field definitions for mapping_relationship and incumbent_assignment tables (HIGH) -->
- `mapping_relationship` table supporting N:M current-future role relationships:
  - `id`, `group_id` (groups related mappings in a single split/merge operation), `direction` (source | target), `role_id`, `mapping_type` (one_to_one | one_to_many | many_to_one | many_to_many | create | eliminate), `created_at`, `created_by`
- `incumbent_assignment` sub-table for split operations (which employee goes to which target role):
  - `id`, `employee_id`, `source_role_id`, `target_role_id`, `assignment_basis` (ai_suggested | manual), `confidence_score` (nullable, populated when ai_suggested), `assigned_at`, `assigned_by`
- Validation rules: an eliminated role must have all incumbents reassigned; a merged role can't inherit conflicting architecture dimensions without resolution

<!-- AUDIT EDIT: Section 1 - Added edge case rule for splitting unmapped roles (MEDIUM) -->
- **Edge case — splitting unmapped roles:** A consultant may split a role that has no current mapping. This is allowed. Split creates future-state roles regardless of mapping status; mappings are independent of the split/merge graph.

### 2. Scenario mode

**The gap:** V1 commits every mapping change immediately. Real consulting often requires exploring 2-3 future-state options before settling on one.

**What to build:**

- Concept: a scenario is a named branch off the baseline mapping. All changes made within a scenario are isolated until committed.
- Scenario list view: shows all scenarios with name, created-by, created-at, change count, status (draft/committed/discarded).
- Create scenario: "New scenario from current baseline" — clones the current state into a working scenario.
- Scenario comparison: side-by-side view of 2-3 scenarios with diff highlighting (what changes in each vs. baseline).
- Commit scenario: merges the scenario changes into the baseline (with confirmation, impact preview, audit event).
- Discard scenario: drops the scenario with a reason note.
- Scenario banner: when working inside a scenario, persistent banner at top ("Working in scenario: Aggressive Consolidation · 47 changes").

**Backend:**

- `scenario` table: name, description, status, created_by, baseline_version
- All mapping mutations get a `scenario_id` (null = baseline)
- Read queries support `scenario_id` filter for scenario-scoped views
- Commit operation: transactional merge with conflict detection if baseline has moved

<!-- AUDIT EDIT: Section 2 - Added explicit scenario isolation scoping rules (CRITICAL) -->
**Scenario isolation rules:**

- **Definition of isolation:** Changes made within a scenario are stored with that scenario's `scenario_id` and are invisible outside it. Downstream modules (career paths, calibration, exports, working sessions) always read the **baseline** unless explicitly passed a `scenario_id` parameter.
- **API contract:** All read endpoints that touch mapping data accept an optional `scenario_id` query parameter. When omitted, they return baseline state only. When provided, they return the scenario's overlay merged onto the baseline.
- **No implicit scenario leakage:** A consultant working in Scenario A does not affect what another consultant sees in Scenario B or in the baseline. The scenario banner (described above) is the only UI signal; no data bleeds.
- **Commit semantics:** Committing a scenario atomically applies its changes to the baseline in a single transaction. If the commit fails (due to conflicts), no partial changes are applied.

<!-- AUDIT EDIT: Section 2 - Added conflict definition and resolution rules (HIGH) -->
**Conflict definition and resolution:**

- A **conflict** occurs when the same role has been modified in both the scenario and the baseline since the scenario's `baseline_version` was captured.
- Conflict detection runs at commit time by comparing the scenario's role-level diffs against baseline changes since `baseline_version`.
- Resolution is **per-role**: for each conflicting role, the consultant chooses one of: (a) keep scenario version, (b) keep baseline version, (c) manual merge (edit the role inline during conflict resolution).
- Non-conflicting changes from the scenario are applied automatically; only conflicts require manual resolution.

### 3. Structured level criteria grid

**The gap:** V1 has free-text leveling criteria per level. Good JA practice requires structured criteria across consistent dimensions so a P3 and a T3 can be compared apples-to-apples.

**What to build:**

- Schema: every level in every track has values on these dimensions — Scope of impact, Autonomy, Complexity, Influence, Knowledge, Leadership.
- Level criteria matrix view: rows are levels (P1-P5, T1-T5, etc.), columns are the six dimensions, cells contain short criteria text.
- Side-by-side level comparison: select any two levels (from any track), see their criteria side-by-side with differences highlighted.
- AI-assisted criteria drafting: based on existing level criteria, AI suggests criteria for newly added levels that maintain consistency.
- Criteria inheritance: track-level defaults with family-level overrides where needed.
- Surface in mapping: when assigning a role to a level, show the level criteria inline so the consultant isn't guessing.

**Backend:**

- `level_criteria` table: level_id, dimension, criteria_text
- Reference dimension enum maintained centrally
- AI service endpoint for criteria suggestion that takes existing criteria + target level as input

### 4. Working session mode

**The gap:** The grid view is optimized for analysis, not for live client conversations. Consultants need a presentation-optimized UI when sitting in a conference room going through 50 roles in 90 minutes.

**What to build:**

- Dedicated full-screen mode triggered from the mapping grid ("Start working session")
- Queue-based navigation: consultant picks which roles to include (filter-based or manual selection), tool walks through them one at a time
- Per-role screen: large, readable layout showing current-state vs. future-state side-by-side, AI rationale, key impact points, action buttons (Accept / Reject / Discuss / Skip)
- Client-friendly visual language: no technical jargon, no AI confidence percentages front-and-center, minimalist design
- Progress indicator: "Role 12 of 50 · 35 minutes elapsed"
- Decision log: every decision made in session is logged with timestamp; reviewable after the session
- Session summary: at end, produce a summary of decisions made — accepted, rejected, discussed, skipped — exportable as a meeting record

**Backend:**

- `working_session` table: name, scheduled_at, participants, status
- Session-scoped audit log
- Export endpoint for session summary in PDF/markdown

<!-- AUDIT EDIT: Section 4 - Added session data freshness rules for concurrent editing (HIGH) -->
**Session data freshness:**

- When a working session is started, the session captures a snapshot timestamp (`session_started_at`).
- Role data displayed in-session is fetched live per-role as the presenter navigates to it (not pre-cached at session start). This ensures the presenter sees the latest state.
- If a role's mapping has been modified by another user since the session started, display a non-blocking indicator: "Updated during this session" with the modifier's name and timestamp.
- Decisions made in-session (Accept/Reject) apply against the current baseline state at decision time, not against a stale snapshot. If a conflict exists (role was modified after it was displayed but before the decision is submitted), prompt the presenter to review the change before confirming.

<!-- AUDIT EDIT: Section 4 - Tier re-scoping: working session is over-scoped for Tier 1 (HIGH) -->
**Phasing note (audit recommendation):** Full working session mode (persistent session table, session-scoped audit log, export endpoint) is over-scoped for Tier 1 relative to split/merge and scenarios. Recommended split:
- **Tier 1 scope:** Presentation-mode view only — full-screen queue-based navigation, per-role display, Accept/Reject/Skip buttons, progress indicator. No session persistence; decisions write directly to the mapping audit log.
- **Tier 2 scope:** Full session tracking — `working_session` table, session-scoped audit log, session summary export, participant management.

### 5. Role archetypes and specializations

**The gap:** Without inheritance, a catalogue with specializations balloons. "Senior Engineer - Platform," "Senior Engineer - Mobile," "Senior Engineer - ML" become three roles when they're really one archetype with three specializations.

**What to build:**

- Concept: a role archetype is a base role definition. Specializations inherit architecture dimensions and most content from the archetype but override specific attributes (team focus, required skills, sample projects).
- Archetype view: toggle the grid to show archetypes only (collapses specializations). Toggle back to see all specializations.
- Specialization creation: from any role, "Create specialization" — pre-populates from the parent, consultant customizes.
- Inheritance: when the archetype changes, specializations inherit the change unless explicitly overridden.
- Override tracking: each field on a specialization shows whether it's inherited from the archetype or overridden.

<!-- AUDIT EDIT: Section 5 - Added edge case for conflicting specialization overrides (MEDIUM) -->
- **Edge case — conflicting specialization overrides:** If two specializations both override the same field to different values and the archetype subsequently changes that field, the archetype change does NOT propagate to those specializations. Overridden fields are locked to their specialization-level value regardless of archetype changes. Only inherited (non-overridden) fields receive archetype updates.

**Backend:**

- `role` table gets `archetype_role_id` field (self-referential, nullable)
- Query pattern: specializations resolve by merging archetype fields with specialization overrides
- Change propagation: updating an archetype field triggers re-evaluation on all specializations

### 6. Career path visualization

**The gap:** A flat catalogue isn't an architecture. Career paths turn data into a structure people can navigate.

**What to build:**

- Career path graph: for any role, show typical paths in (what roles feed into this one) and out (what roles does this lead to)
- Multi-path support: from P3 Product Analyst, paths branch to PM, Data Scientist, or Senior Product Analyst
- Cross-family mobility: show which paths cross family boundaries (Product Analyst → PM, Engineer → Engineering Manager)
- Time-to-next-level indicators: median tenure before promotion, based on incumbent data
- Visual: D3.js force-directed or hierarchical graph; click any node to navigate to that role
- Editing: consultants can add/remove path edges manually to reflect client intent (some paths that exist in data aren't intended, vice versa)
- Orphan detection: roles with no paths in or out — often a signal of a broken career framework

**Backend:**

<!-- AUDIT EDIT: Section 6 - Added engagement_id and versioning to career_path table (MEDIUM) -->
- `career_path` table: from_role_id, to_role_id, path_type (promotion, lateral, cross_family), is_recommended, data_support_count, `engagement_id` (scopes career paths to the engagement), `version` (integer, incremented on each edit), `is_current` (boolean, marks the active version)
- Derived paths: automatically inferred from incumbent movement data where available
- Manual paths: consultant-added edges with justification

<!-- AUDIT EDIT: Section 6 - Added cycle detection edge case (MEDIUM) -->
- **Edge case — career path cycles:** Cycles (Role A -> B -> C -> A) should be detected and flagged as warnings in the UI but allowed. Some organizations intentionally design rotational career paths. The warning surfaces in orphan detection and career path graph views with a distinct visual indicator (e.g., "Rotational cycle detected").

### 7. Before/after crosswalk export

**The gap:** The single most important deliverable in a JA engagement is a client-branded crosswalk document showing every current-state role mapped to future-state, with rationale. V1 has the data but no presentation layer for this.

**What to build:**

- Export format: branded PDF (primary) plus Excel (supporting)
- PDF structure: cover page with engagement name, date, consultant team; executive summary (roles changed, roles added, roles eliminated); section per family; within each family, a table of current-state → future-state mappings with rationale
- Excel structure: one sheet per family, columns for all architecture dimensions in current and future state, rationale column, workflow status column
- Branding: client logo upload, primary color selection, firm co-branding footer
- Filtering: export scoped to a family, a function, the entire catalogue, or approved-only
- Template system: multiple export templates (full crosswalk, executive summary, family deep-dive, role-level detail) selectable at export time

**Backend:**

<!-- AUDIT EDIT: Section 7 - Flagged PDF generation dependency decision (MEDIUM) -->
- **PDF generation — implementation decision required:** Server-side PDF generation (ReportLab, WeasyPrint, Puppeteer) requires system-level dependencies that may complicate deployment (e.g., WeasyPrint requires Cairo/Pango; Puppeteer requires headless Chrome). Client-side generation (jsPDF, html2pdf.js) avoids server deps but limits formatting control and file size handling. **Decision must be made before implementation begins.** Recommendation: start with server-side ReportLab (pure Python, no system deps beyond pip install) for Tier 1; evaluate WeasyPrint for richer HTML-to-PDF if ReportLab templates prove too rigid.
- Excel generation via openpyxl (see `xlsx` skill)
- Template configuration stored per engagement
- Export history tracked for audit

---

## Tier 2: Strong value, moderate complexity

Build after Tier 1. These meaningfully raise the ceiling but are less critical than Tier 1.

### 8. Role-to-skills integration

- Every role has a set of associated skills (from O*NET or manually defined)
- Surface skills in the role detail drawer as a new tab or section
- Skills-based leveling integrity check: flag when a P4 role has the same skill proficiencies as the P3 below it
- Skill adjacency across roles: for any two roles, show skill overlap percentage. High overlap (>80%) between roles at the same level is a flag for role consolidation.
- Critical skill ownership: which roles own each critical skill, concentration risk indicator
- Skill gap between current and future state: when a mapping changes, surface the new skills required

### 9. Role criticality tiering

- Three-tier rating per role: mission-critical, important, replaceable
- Set at the role level, editable in the role detail drawer
- Criticality score factors into calibration (mission-critical roles over-concentrated in one area is a flag)
- Filter option on the grid: show only mission-critical roles
- Input to downstream succession and workforce planning modules

### 10. Build/buy/borrow disposition

- Per-role attribute: does this role get built from within (internal career path), bought from the market (external hire), or borrowed (contractor, temp)?
- Influences recruiting strategy, L&D investment, workforce plan
- Surface on role detail
- Aggregate view: percentage of roles in each category, by family, by level

### 11. Effective dating for mappings

<!-- AUDIT EDIT: Section 11 - Effective dating data model should be Tier 1 forward-compatible (HIGH) -->
**Audit note:** The `effective_date` field should be added to the `mapping_relationship` table as a **nullable column in Tier 1**, even though the full UI (date selector, phased rollout views) ships in Tier 2. Retrofitting effective dating after Tier 1 ships requires migrating every existing mapping record and touching every query that reads mappings. Adding a nullable field now is zero-cost and forward-compatible. The Tier 1 UI can ignore it; the Tier 2 UI activates it.

- Every mapping decision has an effective date, not just a created-at
- Support phased rollouts: Q2 changes vs. Q4 changes
- "As of" date selector on the grid — see what the architecture looks like on any target date
- Downstream modules respect effective dates when reading future state

### 12. AI rationale quality upgrade

- Every AI-suggested mapping must include a structured rationale naming specific signals
- Format: signal type (title match, JD analysis, incumbent pattern, manager relationship) + specific evidence + confidence contribution
- Example: "Working title contains 'Senior'; JD mentions 'mentors junior analysts'; similar roles in Engineering are leveled P3. Confidence: 87% (title: +40%, JD: +32%, peer comparison: +15%)"
- Transparency builds consultant trust; black-box scores don't

### 13. Override memory (per-engagement learning)

- When a consultant rejects an AI suggestion, log the rejection pattern
- AI adjusts its suggestions for similar roles in the same engagement based on rejection patterns
- Not global learning (each engagement is different); engagement-scoped only
- Surface learning as "Based on your earlier decisions, I'm suggesting X instead of Y"

### 14. Manager-IC pair integrity check

- Every manager role should have a corresponding IC track at the same level
- Every IC track should have a manager path available
- Flag families where managers exist but no IC track is defined (signals ICs forced into management to progress)
- Flag families with IC paths but no management path (signals career ceiling for ICs)
- Surface in calibration view as a new chart

### 15. Cross-family consistency check

- Dedicated view: "Is 'Senior' consistent across families?"
- For each level label (Senior, Lead, Principal, etc.), show how it's used across families with scope criteria side-by-side
- Highlight inconsistencies: "Senior Engineer has 7-year median tenure expectation; Senior Analyst has 4-year"
- This is one of the highest-value consultant outputs in real engagements

### 16. Work activity decomposition

- Each role can be broken into 5-10 major activities with effort percentage, criticality, and automation disposition
- Feeds Work Design Lab directly
- Activity portability view: which activities could move between roles
- Most clients won't decompose all 650 roles, but they'll decompose the 50 being redesigned

### 17. Role justification field

- When a role is new in future state or being eliminated, require a justification note
- Surfaced prominently in approval workflow and client conversations
- Searchable, exportable as part of crosswalk

### 18. Stuck roles queue

- Roles in "proposed" or "changes requested" status for more than N days (configurable, default 7) surface in a stuck roles queue
- Aging indicator: shows how long each has been stuck
- Assigned-to column: who owns resolving it
- Prevents mappings from silently dying in review

### 19. Role assignment to consultants

- Each family or sub-family can be assigned to a consultant on the engagement team
- Assignment visible in the grid and detail views
- Filter: "Show my assignments"
- Workload distribution dashboard for the engagement lead

### 20. Role card one-pager export

- For any single role: one-page PDF with all architecture info, description, responsibilities, leveling criteria, incumbent count, career paths
- Used in working sessions, client meetings, individual employee communications
- Branded, templated, fast to generate

### 21. Family summary export

- One page per family showing all roles, levels, career paths
- Becomes a chapter in the final deliverable
- Supports the "family deep-dive" template in the crosswalk export

### 22. Anti-drift prompts

- Track patterns in consultant decisions across a single engagement
- When a decision is inconsistent with established patterns, surface a prompt: "You previously leveled similar roles at P3; this one is at P4. Intentional?"
- Non-blocking, just surfacing for conscious decision-making
- Prevents mid-engagement drift

### 23. Inline leveling guidance

- Short, contextual help accessible from every level dropdown
- "P4 means: leads complex cross-functional initiatives, influences strategy beyond own team..."
- Embedded guidance, not separate documentation
- Faster onboarding for junior consultants

---

## Tier 3: Nice to have

Ship if time permits, or in later quarters. These are valuable but lower leverage than Tier 1 and 2.

### 24. Title inflation analysis

- Distinct titles per 100 employees (company-wide and by unit)
- Distinct titles per family, per level, per manager
- Flag managers with more than N distinct titles in their org

### 25. Title-to-role collapse preview

- AI suggests which similar titles likely collapse into the same role ("Sr. Product Analyst," "Senior Product Analyst," "Product Analyst Senior")
- One-click bulk collapse with confirmation
- Huge time saver in messy catalogues

### 26. Span and layer diagnostic (current state)

- Before designing future state, diagnose current org shape
- Median span of control by level
- Number of layers CEO → IC
- Layers with unusual span

### 27. Role differentiation check

- For any two roles at the same level in the same family, AI-assisted comparison
- "These look functionally identical" flag
- Suggested action: collapse or differentiate

### 28. Leveling anchors / reference roles

- Designate one role per level as the "anchor" — the definitive example
- Other roles at that level can be compared against the anchor
- Visible in the grid and detail drawer as a badge

### 29. Dotted-line / matrix reporting support

- Optional secondary reporting relationship per role
- Hidden by default; toggle to reveal
- Factor into span and layer analysis when shown

### 30. Location / geography dimension

- Roles can have "available locations" metadata
- Flag employees in roles not typically staffed in their location
- Geographic distribution view in calibration

### 31. Role modification impact propagation

- When framework criteria change (P4 definition updated), show which roles are affected
- Flag for re-review
- Batch re-mapping action

### 32. Pay equity readiness check

- Without doing compensation analysis, check structural readiness
- Do all roles at the same family/track/level have consistent definitions?
- Flag "duplicate" roles that will cause comp fairness issues

### 33. Manager reporting sanity checks

- Manager reports to someone at their own level or below (flag)
- IC reports to an IC instead of a manager (flag)
- Skip-level reporting with unusual gaps (flag)
- Managers with only one direct report (flag)

### 34. Tenure distribution per role

- Shape of tenure across the role's population
- All 0-2 years vs. all 8+ years tells different stories
- Surface as small chart in role detail

### 35. Promotion velocity per role

- Median time in role before promotion or departure
- Affects architecture decisions about level gaps

### 36. Fill source analysis

- Internal promotion vs. lateral move vs. external hire distribution per role
- Role mostly filled externally: harder to build pipeline
- Role mostly filled internally: healthy progression

### 37. Role lifecycle states

- Proposed, active, deprecated (still has incumbents but phasing out), retired (no incumbents), archived
- Filter and report by state

### 38. Skill rarity indicator

- Count of incumbents with each skill across the organization
- Rare skills = concentration risk, flight risk, succession risk
- Surface on role detail

### 39. Organizational complexity score

- Composite score per org unit rolling up spans, layers, role variety, reporting irregularities
- Single number makes it easy to say "Operations is our most complex unit"

### 40. Org unit dimension

- Distinct from function group — actual reporting structure
- Finance family may span multiple org units
- Support as filter and grouping dimension

### 41. Cadence-based review reminders

- Set review frequency per family (Engineering every 6 months, Finance every 18 months)
- Surface roles due for review
- Governance feature for post-engagement use

### 42. Planned vs. actual comparison

- Compare the approved future state to what's actually in the HRIS downstream
- Flag drift
- Useful for year-over-year tracking

### 43. Historical state reconstruction

- "What did the architecture look like on March 15?" queryable
- Beyond audit trail — full state reconstruction
- Compliance and legal defense value

### 44. Commentary / working notes per role

- Free-form private note field, not shown to client
- Scratchpad for consultant use
- Every consultant currently keeps this in a side document

### 45. Private vs. shared views

- Grid filters, scenario comparisons, notes: per-user
- Shared: mapping state, framework, history
- Currently everything is shared

### 46. Decision audit narrative

- End-of-engagement narrative document
- Every significant decision explained with rationale, signals, client input, approver
- Protects the consultant in future questions

### 47. Bias screening

- AI-assisted review of role definitions for gendered or culturally-specific language
- Structural bias checks on role definitions
- Not protected-class analysis

---

## Firm-level and consulting practice features

These position the tool as a Mercer asset, not just a one-engagement deliverable. Build after core Tier 1 and 2 are stable.

### 48. Engagement metadata

- Every instance scoped to a client engagement
- Track client name, industry, size, scope, engagement lead, timeline, deliverables committed, status
- Turns the tool from software into a record of practice

### 49. Cross-engagement pattern library

- Anonymized patterns across all engagements on the platform
- "SaaS companies under 5,000 employees typically have 4-6 levels in IC track"
- Firm-level IP that justifies tool existence
- Requires strict anonymization and client consent framework

### 50. Internal benchmarking library

- Architecture shapes seen across firm engagements
- Family counts, level counts, span patterns
- Consultants compare current engagement against historical firm data
- Distinct from market benchmarks (which you don't have access to)

### 51. Methodology defaults

- Tool behaves in a Mercer-consistent way by default
- Mercer IPE template loads automatically
- Firm guidance embedded at decision points

### 52. Consultant playbook integration

- Major decision points link to playbook content
- "Changing a track assignment — here's our firm's guidance"
- Training system for junior consultants

### 53. Deliverable templates

- Firm-branded templates for every major deliverable
- Role cards, family summaries, crosswalks, implementation reports, executive summaries
- Consultants don't build decks from scratch

### 54. Engagement time tracking proxy

- Hours spent in tool, mapping decisions made, activities per session
- Productivity metrics for project management
- Effort estimation for future engagements

---

## Handoff and governance features

These support what happens after the engagement ends.

### 55. Implementation readiness report

- Once mappings approved, produce downstream impact report
- Total level changes, family moves, new roles, eliminated roles, affected headcount
- Client HR team uses for rollout planning

### 56. HRIS export format

- Approved future state exportable in HRIS-friendly format
- Pre-built exports for Workday, SuccessFactors, SAP (starting with most common one the client uses)
- CSV with right column structure at minimum

### 57. Change communication templates

- Draft templates for employees whose role is changing
- "Your role is being re-leveled from P3 to P4..."
- Client adapts and scales

### 58. Role-to-job-code mapping

- Map future-state roles to HRIS job codes
- Flag conflicts (same code used for multiple roles, roles without codes)

### 59. Transition / interim state support

- Real rollouts happen over months, not at once
- Phased implementation view: wave 1, wave 2, wave 3
- Different from effective dating — this is about dependencies between changes

### 60. Living catalogue governance

- Role request form for adding new roles post-engagement
- Approval routing for catalogue changes
- Quarterly review reminders
- Positions tool as ongoing platform, not one-time artifact

### 61. Delta tracking from baseline

- Approved state becomes baseline
- All future changes tracked as deltas
- "We've added 23 new roles and re-leveled 47 since last cycle"

### 62. Read-only client view

- Once approved, client HR team navigates without editing
- Different permission model, different UI affordances

### 63. External stakeholder access

- Scoped, time-limited, read-only links
- For HRIS vendor, comp consultant, working group review

### 64. Data portability / export

- Clients can take their data with them
- Full architecture export in HRIS-aligned CSVs plus structured JSON
- Trust feature

---

## Tool-level features

Cross-cutting improvements that make the tool feel like a pro product.

### 65. Keyboard-first workflow

- A (accept), R (reject), J/down (next), K/up (prev), Enter (open detail), L (edit level), F (edit family), / (search), Esc (close)
- Not nice-to-have — this is what makes the tool feel like a pro tool
- Reduces mapping time for a 650-role catalogue by hours

### 66. Undo / redo across session

- Ctrl+Z works everywhere, including bulk operations
- Table stakes for fast decision-making

### 67. Session persistence

- Close browser mid-session, reopen exactly where you were
- Filters, sort, open drawer, scroll position
- Consultants switch contexts constantly

### 68. Performance discipline

- 650 rows, live filtering, instant re-calibration, <200ms interactions
- Grid virtualization (react-window or tanstack-virtual)
- Server-side aggregated chart data
- Optimistic state updates

### 69. Export everywhere

- Every view, chart, list has copy-to-clipboard or export-to-Excel
- Consultants live in Excel and Slides for deliverables

### 70. Print-optimized views

- Clean print stylesheets, branded output
- Consultants will print for working sessions

### 71. Offline-capable reads

- Grid and detail views work from cache when network drops
- Working sessions in conference rooms with flaky wifi

### 72. API-first

- Every view also a queryable API
- Architecture is system of record for multiple downstream tools

---

## Explicit non-goals

The discipline of staying purely JA is what makes the tool valuable. These should never be built into this module:

- Compensation management, pay ranges, equity grants, total rewards calculators
- Performance management, ratings, promotion decisions at individual level
- Hiring, requisitions, candidate tracking, interview loops
- Learning and development delivery or tracking
- Deep HR analytics (turnover, engagement, retention prediction)

Every feature not built is a clear lane left for integration rather than competition.

---

## Recommended implementation phasing

**Phase A (Weeks 1-3):** Tier 1 #1-2 (split/merge, scenarios). These are the biggest data model changes and should land first so everything else can build on them.

**Phase B (Weeks 4-5):** Tier 1 #3-4 (structured level criteria, working session mode). These are high-visibility features that will be demoed.

**Phase C (Weeks 6-7):** Tier 1 #5-7 (archetypes, career paths, crosswalk export). These complete the Tier 1 set.

**Phase D (Weeks 8-10):** Tier 2 #8-13 (skills integration, criticality, build/buy/borrow, effective dating, AI rationale, override memory). Depth features.

**Phase E (Weeks 11-12):** Tier 2 #14-23 (integrity checks, consistency checks, decomposition, justification, stuck roles, assignments, exports, drift prevention, inline guidance). Craft features.

**Phase F (Weeks 13+):** Tier 3 and firm-level features as priorities dictate. Can be parallelized across multiple engagements.

Run `npm run build` after every phase. Deploy to production after each phase for user feedback.

---

## Confirmation before build

Before writing any code for this v2 spec:

1. Confirm v1 is live and stable on hrdigitalplayground.com
2. Propose the phased implementation plan above (or an alternative with justification)
3. Identify data model migrations needed for Tier 1 (especially split/merge and scenarios)
4. Identify any new dependencies
5. Confirm which features are approved for the current sprint vs. backlog

Pause and wait for approval before writing implementation code.
