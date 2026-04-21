# AI Transformation Platform — Complete Module Specs

**Project root:** `~/Desktop/ai-transformation-platform/`
**Stack:** Next.js 16 / React 19 frontend, FastAPI backend
**Deploy:** Railway (backend) + Vercel (frontend), hrdigitalplayground.com
**Design system:** Ivory `#F7F5F0` backgrounds, navy `#1C2B3A` deep surfaces, blue `#3B82F6` primary, orange `#F97316` highlights

---

## How to use this document

This file contains v1 specs and v2 backlogs for all ten Discovery/Diagnose modules:

1. Org Health Scorecard
2. AI Opportunity Scan
3. AI Impact Heatmap
4. Role Clustering
5. AI Readiness
6. Manager Capability
7. AI Recommendations
8. Skills & Talent
9. Skills Map Engine
10. Change Readiness

**Do not build all of this at once.** This is a year of work, not a sprint. The recommended build order is:

- **Foundation first:** Job Architecture v1 (already specced separately), Org Health Scorecard v1, Role Clustering v1 — these establish the data model the other modules consume.
- **Core diagnostic layer:** AI Opportunity Scan v1, AI Impact Heatmap v1, AI Readiness v1, Skills & Talent v1, Manager Capability v1.
- **Recommendation and synthesis:** AI Recommendations v1, Change Readiness v1, Skills Map Engine v1.
- **V2 backlogs:** Pulled from when specific client engagements surface specific needs.

Each module has a v1 spec (build this) and a v2 backlog (reference when expanding). The v2 backlogs are organized into Tier 1 (highest leverage), Tier 2 (strong value), Tier 3 (nice to have), plus firm-level and tool-level sections.

**Cross-module data model principles:**

- Every module reads the **future-state** job architecture from the JA module (Section 2 of `ja-mapping-spec.md`). This is non-negotiable.
- Roles, skills, employees, families, and org units are shared entities — one source of truth per entity, referenced by ID from every module.
- Every AI-generated output has a structured rationale that names signals and confidence contributors — black-box scores are unacceptable.
- Every decision and change is audit-logged with actor, timestamp, before/after, and optional rationale note.
- All modules respect engagement scoping (multi-tenant isolation) and workflow states (draft → proposed → in review → approved) where applicable.

<!-- AUDIT EDIT: Cross-module principles - Added concurrency policy (HIGH: 10 modules, zero concurrency handling specified) -->
**Concurrency policy (cross-module).** All modules use optimistic concurrency control. Every mutable record carries a `version` (integer, incremented on write). When a consultant saves, the write includes the `version` they read. If the version on the server has advanced (another consultant wrote first), the write is rejected. The UI shows a toast notification to the losing writer with a diff of what changed, and offers "reload and re-apply" or "overwrite." This applies to every entity with consultant-editable fields across all ten modules. For bulk operations (e.g., cluster consolidation, recommendation batch accept), the version check applies per-record and failures are reported individually without rolling back the successful writes.

<!-- AUDIT EDIT: Cross-module principles - Added temporal query requirement (HIGH: only Scorecard has snapshots, 9 other modules have no as-of capability) -->
**Temporal query requirement (cross-module).** Every module that stores decisions or scores must support "as-of" queries against historical snapshots. This means: when a snapshot is taken (manually or on schedule), the full state of decisions, scores, and computed outputs is captured immutably. Any dashboard or detail view supports a "View as of [date]" selector that reconstructs the state from the nearest snapshot. Modules with this requirement: Scorecard (already has snapshots), Opportunity Scan (opportunity scores and statuses), Heatmap (exposure scores), Role Clustering (cluster assignments and recommendations), AI Readiness (readiness scores and segments), Manager Capability (capability scores and segments), AI Recommendations (recommendation scores and statuses), Skills & Talent (gap analysis and proficiency data), Change Readiness (population scores and quadrant assignments). Skills Map Engine is exempt (taxonomy versioning already provides historical state). Implementation: a shared `module_snapshot` table with `module_type`, `engagement_id`, `snapshot_at`, `snapshot_tag`, and a JSONB `state_payload` column, plus per-module snapshot serializers.

**Design system is non-negotiable.** Every module uses the same four colors, same typography, same card treatments, same grid patterns. Users should not notice they've moved between modules.

---

# Module 1: Org Health Scorecard

## V1 Spec

### 1.1 Product problem

Before any AI transformation, org design, or workforce planning work can happen, the consultant needs a baseline diagnostic: how healthy is the organization today? This module produces a structured, data-driven scorecard across the dimensions of organizational health that matter for transformation readiness. It is the first module a consultant opens in a new engagement and the reference point every other module ties back to.

The scorecard is not a survey tool (we're not collecting data from employees) and not an engagement platform (we're not measuring sentiment). It computes structural health from data already in the platform: job architecture, reporting structures, role definitions, incumbent counts, tenure patterns, span and layer metrics.

### 1.2 Core principle: structural health is computable

Every metric on the scorecard is computed from hard data, not self-reported. If a metric cannot be computed from available data, it does not appear on the scorecard. This is the discipline that separates this from a generic HR dashboard.

### 1.3 Primary view: scorecard dashboard

Single-page dashboard organized into six health dimensions, each dimension a card containing 3-5 metrics with traffic-light coloring (green healthy, amber watch, red issue).

**Dimensions:**

1. **Structural clarity** — how well-defined is the architecture? Metrics: percentage of roles with complete architecture (all five dimensions filled), percentage of roles with job descriptions, percentage of employees mapped to a defined role, duplicate title count across families, ghost role count (roles with zero incumbents).

2. **Span and layer discipline** — is the hierarchy coherent? Metrics: median span of control, layer count CEO-to-IC, spans-of-one count (managers with single direct report), layer concentration (which layer holds the most headcount), management ratio (percentage of workforce who are managers).

3. **Leveling integrity** — is leveling applied consistently? Metrics: level distribution skew (is any one level >25% of org?), level consistency across families (variance in median level per family), track balance (IC vs manager ratio), senior-heavy ratio (percentage above P3/T3/M3).

4. **Workforce composition** — what does the population look like? Metrics: role count, employee count, median tenure, tenure-in-role distribution, incumbent-per-role average, single-incumbent roles count, critical role coverage (requires role criticality tagging from JA v2).

5. **Career mobility signal** — is movement happening? Metrics: promotion velocity (median time-in-role before level change, from historical data if available), lateral mobility rate, manager-to-IC flow (are ICs progressing to management where paths exist?), family crossover rate.

6. **Transformation readiness** — is the org structurally prepared for change? Metrics: architecture completeness (required before any transformation work), change velocity (how quickly has the architecture evolved historically), role volatility (percentage of roles that have been redefined in the past N months), integration gap (roles with missing skill definitions, missing JDs, missing reporting relationships).

### 1.4 Scorecard card structure

Each dimension card:

- Header: dimension name + overall dimension score (composite 0-100)
- Trend indicator: arrow showing delta vs. prior scorecard run (requires historical snapshots)
- 3-5 metric rows: metric name, current value, benchmark (from prior engagements or firm library, not market data), status dot (green/amber/red), trend sparkline if historical data exists
- "View details" link: opens drill-down for that dimension

### 1.5 Drill-down detail view

Opens as a full-page view or large drawer. For a given dimension:

- Full metric list (not truncated to 3-5)
- Charts: distribution visualizations for each metric (histograms, bar charts, heatmaps)
- Anomaly list: specific roles, families, or org units that are driving red/amber status
- AI-generated interpretation: plain-language summary of what the metrics show and what to investigate first
- Linked actions: "Fix this in Job Architecture" / "Investigate in Role Clustering" deep-links to other modules

### 1.6 Overall health score

A single composite number at the top of the dashboard (0-100) computed as a weighted average of the six dimension scores. Weighting is configurable per engagement — some engagements care more about structural clarity, others about mobility. Default weighting is equal across dimensions.

The score is accompanied by a color-coded band (0-40 red, 41-70 amber, 71-100 green) and a short AI-generated interpretation.

### 1.7 Historical snapshots

Every time the scorecard is run, a snapshot is saved. The dashboard can show:

- Current state
- Change from last snapshot
- Trend over N runs (line chart)

Snapshots are timestamped and tagged with an optional engagement milestone ("Pre-intervention baseline," "Post-redesign," "Quarterly check").

### 1.8 Benchmarking (without market data)

Since we don't have market benchmark data, benchmarks come from two sources:

1. **Firm library** — anonymized aggregate patterns across prior engagements (requires the cross-engagement pattern library from JA v2 Section 49). Engagement consultant can opt in to contributing data.
2. **Client's own history** — snapshots from earlier in the same engagement or prior engagements with the same client.

Every metric clearly labels its benchmark source. If no benchmark is available, the metric shows as "no comparison" rather than faking a number.

### 1.9 Export

- PDF executive summary (one page, headline score + dimension scores + top 3 issues + top 3 strengths)
- Full PDF report (one page per dimension with charts and AI interpretation)
- Excel data dump (all metrics with values, benchmarks, trends)
- PowerPoint export (one slide per dimension, client-brandable)

### 1.10 Data model requirements

Backend entities to create or reference:

- `scorecard_snapshot` — timestamp, engagement_id, overall_score, snapshot_tag, created_by
<!-- AUDIT EDIT: Module 1 / Section 1.10 - Added compute_method field to scorecard_metric (metric definitions not reproducible without it) -->
- `scorecard_metric` — snapshot_id, dimension, metric_name, value, benchmark_value, benchmark_source, status, compute_method (enum: count, ratio, average, percentile, custom_expression; for custom_expression, stores the expression string — required so metric definitions are reproducible across snapshots and engagements)
- `scorecard_dimension_score` — snapshot_id, dimension, score, weight
- Compute engine that reads from JA tables, employee tables, reporting structure tables, and produces metric values
- Scheduled or manual snapshot trigger

### 1.11 Cross-module dependencies

**Reads from:**
- Job Architecture module (roles, families, tracks, levels, incumbents)
- Employee data (tenure, reporting relationships, location)
- Any module that produces role metadata (skills from Skills Map Engine, criticality from JA v2)

**Written to / referenced by:**
- AI Recommendations (scorecard issues become recommendation inputs)
- Change Readiness (scorecard provides structural baseline)
- Every executive summary deliverable

### 1.12 Out of scope for v1

- Market benchmark data (not available)
- Employee sentiment or engagement scores (not collecting survey data)
- Compensation health (separate discipline)
- Performance management signals (separate discipline)

### 1.13 Build phasing (v1)

1. Data model and compute engine for the six dimensions
2. Dashboard view with all six cards
3. Drill-down detail view
4. Historical snapshots and trend charts
5. Export formats (PDF exec summary, full PDF, Excel, PPTX)
6. AI interpretation layer
7. Firm library benchmarking integration (gated on cross-engagement consent framework)

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Custom dimension builder.** Not every engagement uses the same six dimensions. Let consultants add custom dimensions (e.g., "Digital maturity," "Customer orientation") with their own metrics pulled from available data or manual inputs. Requires a dimension configuration UI and a metric definition DSL.

**2. Drill-through to root cause.** When a metric is red, the tool should surface the specific roles, teams, or org units causing the red state, ordered by contribution to the metric. "Span of control is red — here are the 14 managers with spans >12 that are driving this." One-click navigation to investigate each.

**3. Scenario scorecard.** "If we implement the proposed future-state architecture, what does the scorecard look like?" Compute scorecard metrics against a scenario from the JA module, show side-by-side with current baseline. This is what turns the scorecard from diagnostic into design support.

**4. Scorecard watch list.** Consultants flag specific metrics they want to monitor across the engagement. Watch list gets a dedicated view with trend lines, threshold alerts, and notification when a watched metric crosses a threshold.

**5. AI-generated executive narrative.** Beyond the short interpretation per dimension, produce a full executive narrative for the leadership audience: "Your organization shows strong structural clarity but significant leveling inconsistency. Three root causes are..." 2-3 paragraphs per dimension, synthesized across metrics, written in executive-appropriate voice. This is the primary client-facing output of the scorecard.

**6. Comparison view across org units.** For multi-business-unit clients, show scorecard metrics side-by-side across units. Which units are healthy, which need attention, where are the biggest gaps. Critical for enterprise engagements.

**7. Metric impact linkage.** Each metric links to the downstream business impacts it predicts. "High span-of-control variance predicts inconsistent employee experience, slower decision-making, and harder manager coaching." Makes the abstract metrics concrete for client conversations.

### Tier 2: Strong value, moderate complexity

**8. Metric drilldown to individual records.** Every metric navigable to the specific underlying records. Tenure distribution → list of employees. Span concentration → list of managers. Every number answerable with "show me the data."

**9. Threshold customization per engagement.** Traffic-light thresholds (red/amber/green cutoffs) configurable per engagement. A startup's healthy layer count differs from a Fortune 500.

**10. Delta narrative between snapshots.** When comparing two snapshots, AI-generated narrative explaining what changed and why: "Between March and June, your layer count decreased from 8 to 6, primarily driven by the flattening of the Commercial org."

**11. Scorecard contribution from non-platform data.** Allow consultants to manually input scorecard inputs not available in the platform (e.g., employee survey scores, turnover data) as supplementary metrics with clear "manually entered" labeling.

**12. Composite scoring transparency.** Every composite score (dimension scores, overall score) shows its component metrics and weights. Clients will ask "why is this 72 and not 80?" — the answer must be clickable.

**13. Benchmarking opt-in flow.** UX for consultants (with client approval) to contribute anonymized scorecard data to the firm library. Includes consent capture, anonymization preview, and opt-out controls.

**14. Scorecard for specific populations.** Run the scorecard on a filtered population: just Engineering, just managers, just the top 20% by tenure. Same dashboard structure, narrowed scope.

**15. Metric correlation analysis.** When multiple metrics move together, surface the correlation: "Your span-of-control issue and your leveling skew issue are likely both symptoms of rapid hiring in Q4."

**16. Time-series metric view.** Line charts for any metric across all historical snapshots. See how leveling distribution has shifted quarter over quarter.

**17. Custom metric expressions.** Power-user feature: define a custom metric as an expression against underlying data. "Percentage of ICs with tenure > 5 years and no level change in 3 years" — computes from the data without needing a code change.

**18. Scorecard templates by engagement type.** Pre-configured scorecard templates for common engagement types (AI transformation, post-M&A integration, cost reduction, growth scaling). Template sets the weighted dimensions and threshold defaults.

**19. PDF report theming.** Client-brandable PDF output with custom cover, fonts, color palette, consultant team page.

**20. Slide-ready chart exports.** Every chart exportable as a standalone image at slide-appropriate dimensions with customizable title and annotation.

### Tier 3: Nice to have

**21. Metric sparklines on every card.** Small inline trend indicators showing where each metric has been, even when historical data is thin.

**22. Scorecard diff against prior engagement with same client.** If the client has had a prior engagement on the platform, show how the scorecard has changed.

**23. Share scorecard via link.** Scoped, time-limited share link for the client to view without a full platform account.

**24. Embedded commentary.** Consultants annotate metrics with notes explaining context ("Q4 headcount surge from acquisition, expected to normalize by March").

**25. Scorecard subscription / scheduled runs.** Automatic snapshot every N weeks during an engagement, with email summary.

**26. Mobile-friendly view.** Responsive layout for the dashboard so consultants can review scorecards on phone or tablet in client meetings.

**27. Print-optimized one-pager.** Clean print stylesheet producing a professional one-page summary.

**28. Metric deep-linking to source.** Every metric links to the specific data view where the underlying data lives.

**29. Anomaly detection beyond thresholds.** Statistical anomaly detection that flags metrics with unusual distributions, not just values outside thresholds.

**30. Scorecard run notifications.** Notify the engagement team when a new snapshot is available, with headline changes.

### Firm-level features

**31. Cross-engagement firm dashboard.** Partners and practice leads see aggregate scorecard patterns across all active engagements, anonymized where required by client consent.

**32. Benchmark curation.** A firm role that reviews and curates the benchmark library, flagging outliers, seasoning new benchmarks with more data points.

**33. Scorecard methodology documentation.** Firm-published methodology document explaining how each metric is computed, why it matters, and what the benchmarks represent. Linkable from every metric.

**34. Engagement type tagging.** Tag engagements by type so scorecard patterns can be grouped meaningfully in the firm library.

### Tool-level

**35. Performance.** Scorecard compute must be fast — under 3 seconds for a full snapshot across 650 roles and 5,000 employees. Pre-computed or cached aggregations, not live queries.

**36. Keyboard navigation.** Arrow keys between cards, Enter to drill into a dimension, Esc to close drilldowns.

**37. Export everything, everywhere.** Every chart, table, metric exportable individually.

**38. Versioning of scorecard definitions.** When scorecard methodology changes (new metric added, threshold adjusted), snapshots retain the definition they were computed with.

### Non-goals

- Do not build employee sentiment or engagement measurement. Scorecard is about structural health only.
- Do not build market benchmark sourcing (separate discipline, legal complexity).
- Do not build predictive modeling ("you have an 80% chance of missing your transformation goals"). The tool diagnoses; it does not predict.
- Do not build compensation health metrics (stays in comp discipline).

---

# Module 2: AI Opportunity Scan

## V1 Spec

### 2.1 Product problem

The central question of every AI transformation engagement: where will AI actually create value in this organization? Most clients approach this by listing their business problems and asking "can AI help?" That produces long lists of vague opportunities with no prioritization.

This module inverts the question. It starts from the organization's work — the activities, roles, and processes that already exist — and systematically identifies where AI can automate, augment, or accelerate each one. Output is a prioritized, evidence-backed opportunity portfolio the consultant uses as the foundation for the transformation roadmap.

This is the module currently marked "In Progress" on your platform, so v1 must be robust enough to use on Takara Tomy or the next engagement.

### 2.2 Core principle: work-first, not tool-first

Opportunities are generated by scanning the client's work (roles, activities, processes) for AI-amenable characteristics, not by starting from a list of AI tools and asking where they could fit. This is the principle that separates strategic AI consulting from vendor sales.

Every opportunity is grounded in specific roles and activities, with named impact, not generic "AI could help marketing."

### 2.3 Primary view: opportunity portfolio

Grid or card-based view showing all identified opportunities. Each opportunity is a discrete, scoped unit of AI value creation. Default sort: highest impact × highest feasibility first.

**Opportunity card contents:**

- Title (short, action-oriented: "Automate lead qualification routing," not "AI for sales")
- Category tag: Automate / Augment / Accelerate / Create
- Affected roles (linked from JA)
- Affected activities (linked from role decomposition in JA v2)
- Headcount impact (number of people whose work changes)
- Impact score (1-100 composite)
- Feasibility score (1-100 composite)
- Value thesis: one-line description of the value
- Status: identified, scoped, validated, prioritized, in-roadmap

**Filter and sort bar:**

- Filter by category (automate, augment, accelerate, create)
- Filter by function or family (pulls from JA)
- Filter by feasibility tier
- Filter by impact tier
- Filter by status
- Sort by impact, feasibility, combined score, headcount affected, category

**Summary metrics at top:**

- Total opportunities identified
- Total estimated headcount impact (unique people)
- Breakdown by category
- Breakdown by feasibility

### 2.4 Opportunity detail view

Opens on card click. Full detail for a single opportunity.

**Header section:**

- Title, category, status
- Impact score and feasibility score with component breakdowns

**Work section:**

- Affected roles (list, linked to JA detail)
- Affected activities (list, linked to activity decomposition)
- Current-state description: how the work is done today
- Future-state description: how the work is done with AI
- Change magnitude: cosmetic, moderate, transformational

**Value section:**

- Quantified value (where computable): time saved per week, throughput increase, error rate reduction
- Unquantified value: qualitative benefits (decision quality, consistency, employee experience)
- Value confidence: how solid is the value estimate (high, medium, speculative)

**Feasibility section:**

- Technology readiness: is the capability mature?
- Data readiness: does the data exist, is it accessible, is it clean?
- Organizational readiness: are the affected teams ready?
- Change complexity: how much process/role redesign is required?
- Dependency list: what must be true before this can proceed?

**Risk section:**

- Risks identified (concentration, error, compliance, ethical)
- Risk mitigations
- Risk severity (low, medium, high)

**Evidence section:**

- Why this opportunity was identified: specific signals from the work (repetitive tasks, rule-based decisions, high-volume pattern-matching, document-heavy workflows)
- Related opportunities (same roles, same function, same pattern)
- Analogous external precedents (if any — not "company X did this" but "this pattern has been successfully implemented in similar contexts")

**Actions:**

- Accept into roadmap
- Reject with reason
- Defer with note
- Assign to consultant
- Request more analysis

### 2.5 Opportunity identification engine

This is the AI-heavy component. Given the client's job architecture and activity decomposition, the engine generates opportunity candidates.

**Inputs:**

- Role inventory with activity decomposition
- Job descriptions
- Role-to-skill mapping
- Process documentation (if uploaded)
- Business context (industry, size, geography, engagement objectives)

**Identification logic:**

- Pattern matching against known AI-amenable work patterns: document processing, data entry, routing decisions, classification, summarization, search, drafting, pattern recognition, prediction, personalization, translation, meeting transcription, code generation, design iteration.
- Intensity scoring: for each role/activity, how AI-amenable is it? Scored 0-100 per activity.
- Opportunity clustering: activities across multiple roles that could be addressed by the same AI capability cluster into a single opportunity.
- Category assignment: automate (AI replaces work), augment (AI accelerates human work), accelerate (AI shortens cycle time), create (AI enables new work not previously possible).

**Output:**

- Opportunity candidates with supporting evidence (which role, which activity, which signal)
- Initial impact and feasibility scores
- Grouping of related opportunities

**Human validation:**

- Consultants review, refine, reject candidates
- Can manually add opportunities the AI missed
- Can merge candidates or split them

### 2.6 Opportunity scoring model

Impact and feasibility are both composite scores 0-100.

**Impact components:**

- Headcount reach: how many people's work changes (normalized)
- Time value: estimated hours freed per person per week × affected population
- Strategic alignment: does this advance a client priority? (consultant input)
- Quality/experience improvement: qualitative judgment, 1-5 scale
- Revenue or cost lever: direct financial impact if quantifiable

**Feasibility components:**

- Technology readiness level (TRL-inspired, 1-9 scale)
- Data availability and quality
- Integration complexity with existing systems
- Change management complexity
- Estimated time to value
- Cost to implement (relative, not absolute)

Scores are composite and transparent — every opportunity shows the component breakdown, not just a single number.

### 2.7 Opportunity portfolio views

Multiple ways to view the portfolio:

- **Grid view (default):** cards sortable and filterable
- **Matrix view:** 2×2 matrix with impact × feasibility axes, dots plotted on the matrix. Classic prioritization view.
- **Heatmap view:** opportunities grouped by function × category, colored by combined score. Shows where opportunities cluster.
- **Roadmap timeline view:** once prioritized, opportunities arranged on a timeline by feasibility (near-term wins vs. long-term bets).
- **Dependency graph:** opportunities connected by dependencies (do this first, then that).

### 2.8 Deep integration with Job Architecture and Work Design Lab

The scan is only as good as the underlying work data. The module depends on:

- Role definitions from JA (future state, not current)
- Activity decomposition from JA v2 Section 16
- Skills from Skills Map Engine
- Organizational structure from JA

When role or activity data is missing or incomplete, the scan flags this and requests enrichment before generating opportunities for those areas.

### 2.9 Consultant workflow

Typical flow through the module:

1. Review AI-generated opportunity candidates (usually 30-80 for a medium engagement)
2. Validate, refine, reject, merge
3. Score or adjust scoring inputs for each
4. Cluster into themes
5. Prioritize into portfolio tiers (must-do, should-do, could-do)
6. Move prioritized items into the AI Recommendations module (or the roadmap builder)
7. Export portfolio as a client deliverable

### 2.10 Export

- Opportunity portfolio PDF (executive summary + card per opportunity)
- Detailed opportunity report (one page per opportunity, all sections expanded)
- Excel data dump for further analysis
- PowerPoint opportunity deck (one slide per opportunity, client-brandable)
- Prioritization matrix exports as standalone chart

### 2.11 Data model requirements

- `opportunity` — title, category, status, impact_score, feasibility_score, engagement_id, value_thesis, current_state, future_state, created_at, created_by
- `opportunity_role` — many-to-many linking opportunities to affected roles
- `opportunity_activity` — many-to-many linking opportunities to affected activities
- `opportunity_signal` — evidence records: why was this opportunity identified (role_id, activity_id, signal_type, signal_strength)
- `opportunity_score_component` — breakdown of impact and feasibility scores
- `opportunity_dependency` — directional links between opportunities
- `opportunity_risk` — identified risks with severity and mitigation

### 2.12 Cross-module dependencies

**Reads from:**
- Job Architecture (roles, activities, skills, org structure)
- Skills Map Engine (skills data, automation susceptibility)
- AI Impact Heatmap (function × family automation potential feeds opportunity identification)
- Org Health Scorecard (transformation readiness filters feasibility scoring)

**Written to / referenced by:**
- AI Recommendations (prioritized opportunities become recommendations)
- Change Readiness (opportunity scope informs change impact)
- Workforce planning (headcount impact feeds workforce modeling)

### 2.13 Out of scope for v1

- Implementation planning and project management (that's post-prioritization work)
- ROI calculation (needs client financial data, comes later in the engagement)
- Vendor selection (the scan identifies opportunities, not tools)
- Technical architecture for AI solutions (engineering work, not consulting)

### 2.14 Build phasing (v1)

1. Data model for opportunities, signals, scoring components
2. Opportunity identification engine (AI service + pattern library)
3. Portfolio grid view
4. Opportunity detail view
5. Scoring model and score breakdown UI
6. Matrix, heatmap, roadmap views
7. Export formats

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. ROI quantification module.** Once the client supplies financial context (revenue, cost structure, operational metrics), compute hard ROI per opportunity. Hours freed × fully-loaded cost, revenue uplift from faster decisions, cost avoidance from error reduction. Requires a client-data input flow, but transforms the scan from qualitative to quantitative.

**2. Opportunity portfolio optimization.** Given constraints (budget, timeline, change capacity), compute the optimal portfolio of opportunities. "If you can only fund five things this year, these five maximize value given your constraints." Classic portfolio optimization problem; solvable with linear programming or simpler greedy algorithms.

**3. Sequencing and dependency analysis.** Build out the dependency graph view into a full sequencing tool. Opportunities that depend on others must come later; opportunities that share infrastructure should be grouped. Produces a recommended implementation sequence.

**4. Scenario comparison.** "What if we focused this engagement on customer service vs. engineering?" Run two scans scoped to different parts of the org and compare opportunity portfolios. Useful for engagement-scoping conversations.

**5. Industry pattern library.** Pre-built opportunity patterns for specific industries (SaaS, financial services, retail, healthcare, manufacturing). When starting a new engagement, load the relevant pattern library and the scan runs against those patterns by default. Much higher precision for first-pass opportunity identification.

**6. Opportunity linkage to job redesign.** For each opportunity, show how the affected roles change in the future state. "This opportunity frees 12 hours/week in the Analyst role — the Analyst role's redesigned definition moves that capacity into higher-value strategic analysis." Direct bridge to the JA module's future state.

**7. Opportunity confidence calibration.** Track how opportunities actually played out in prior engagements. Opportunities identified as "high impact, high feasibility" that failed reduce confidence in similar future identifications. Engagement learning that improves the scan over time.

### Tier 2: Strong value, moderate complexity

**8. Opportunity templates.** For common opportunity patterns (document processing, lead qualification, customer service triage), pre-built templates that accelerate scoping.

**9. Consultant commentary per opportunity.** Free-form notes on each opportunity for internal consultant use.

**10. Client-facing opportunity preview.** Simplified view for client review, hiding consultant scoring internals.

**11. Opportunity review workflow.** Draft → reviewed by senior consultant → validated → ready for client. Approval workflow similar to JA mapping.

**12. Impact estimation refinement.** Multiple estimation methods (top-down market analog, bottom-up time-study, benchmark-based) with ability to pick the right method per opportunity.

**13. Value realization tracking.** Once an opportunity is implemented (post-engagement), track whether the estimated value was actually realized. Requires client follow-up but closes the loop.

**14. Technology reference for each opportunity.** Link opportunities to the capability categories needed (LLM-based document processing, predictive models, classification systems) without naming specific vendors.

**15. Regulatory and compliance flags.** Opportunities affecting regulated work (healthcare, financial, personal data) automatically flagged with compliance considerations.

**16. Ethical review tagging.** Opportunities with ethical implications (bias risk, fairness, autonomy, privacy) flagged for deeper review.

**17. Multi-language opportunity titles and descriptions.** For global engagements, opportunity descriptions generated in the client's working language.

**18. Benchmarking against prior engagements.** "How does this opportunity count and composition compare to other engagements of similar scope?" Firm library reference.

**19. Opportunity export as a Miro / Mural board.** Visual collaboration format for workshop-style client conversations.

**20. Opportunity voting.** Multiple consultants on a team can rate opportunities; aggregate view shows team-level prioritization.

### Tier 3: Nice to have

**21. Opportunity status emails.** Status change notifications to engagement team.

**22. Opportunity search by natural language.** "Show me all opportunities involving document processing in Finance" via natural language query.

**23. Opportunity tagging system.** Custom tags for filtering and grouping.

**24. Historical opportunity archive.** Completed opportunities from prior engagements browsable as inspiration for new ones.

**25. Opportunity change log.** Audit trail of every edit to an opportunity.

**26. Inline AI chat for opportunity refinement.** "Refine this opportunity to focus on the sales team specifically" — conversational editing of the opportunity.

**27. Opportunity rejection reasons library.** When rejecting an opportunity, choose from a library of common reasons for consistent reporting.

**28. Opportunity similarity detection.** Flag duplicate or near-duplicate opportunities so they can be merged.

**29. Bulk scoring adjustments.** Update scoring inputs across multiple opportunities at once.

**30. Opportunity ownership assignment.** Assign each opportunity to a consultant who owns refining it.

### Firm-level features

**31. Firm-wide opportunity pattern library.** Aggregate opportunity patterns across all engagements to refine identification precision.

**32. Success rate by opportunity type.** Track which opportunity categories actually deliver value across engagements.

**33. Average scoring benchmarks.** "High impact" opportunities at this firm historically score X — calibration reference for new consultants.

**34. Playbook integration.** Each opportunity category links to firm playbook content on how to implement.

### Tool-level

**35. Performance.** Opportunity generation for a 650-role catalogue should complete in under 2 minutes.

**36. Scoring transparency.** Every score component drill-throughable to the underlying signal.

**37. Keyboard navigation.** Through the portfolio grid and into detail views.

**38. Export everywhere.** Every view and card exportable.

### Non-goals

- Do not build vendor selection or tool recommendation. The scan identifies opportunities; tool selection is a separate discipline.
- Do not build implementation project management. Once prioritized, opportunities move to roadmap tools.
- Do not build technical architecture or solution design. Engineering-adjacent, out of consulting scope.
- Do not build opportunity hypothesis testing or pilot design. Downstream of this module.

---

# Module 3: AI Impact Heatmap

## V1 Spec

### 3.1 Product problem

Where in the organization will AI actually hit? Not in vague terms ("AI will transform knowledge work") but specifically: which functions, which job families, which roles face the highest automation and augmentation potential? The heatmap answers this with a visual, interactive grid that shows AI exposure across the entire org at a glance. It's the strategic map that pairs with the tactical detail of the Opportunity Scan.

The heatmap is what gets shown to the CEO and the board. The Opportunity Scan is what the transformation team works from. Both are needed, and both must reconcile — the heatmap summarizes what the scan finds in detail.

### 3.2 Core principle: structured exposure scoring, not intuition

Every cell in the heatmap is computed from a structured model, not from consultant intuition. The model inputs are auditable: percentage of role time spent on AI-amenable activity types, weighted by intensity, rolled up to the family and function level. Consultants can override scores but the override is logged and visible.

### 3.3 Primary view: the heatmap grid

Two-axis matrix. Rows are job families, columns are business functions (or reversed, user-selectable). Each cell represents the intersection — for example, "Analytics family within the Commercial function" — and is colored by composite AI exposure score.

**Cell contents:**

- Color intensity: AI exposure score (0-100, green low exposure, amber moderate, red/deep-orange high)
- Small numeric score in the cell
- Secondary indicator: headcount in that intersection (cell size, dot, or inline count)
- Hover state: tooltip with breakdown (automate % / augment % / create %)
- Click: drills into the detail view for that cell

**Color semantics (deliberate, not default):**

- Green (low exposure, 0-30): work is primarily relational, judgment-heavy, physically embodied, or high-context
- Amber (moderate, 31-60): mixed — significant AI-amenable work alongside human-essential work
- Orange (high, 61-80): substantial exposure, meaningful role redesign likely required
- Red (transformational, 81-100): role composition fundamentally changes

### 3.4 Heatmap variants and views

The user toggles between several views of the same underlying data:

- **Function × Family (default):** the classic grid described above
- **Function × Level:** exposure by seniority within each function (does AI hit junior roles harder? senior?)
- **Family × Level:** exposure by seniority within each family
- **Geographic:** function or family × location, if location data is available
- **Org unit × Function:** for multi-BU clients, which business units face the most exposure
- **Time horizon:** slider showing projected exposure at 12-month, 24-month, 36-month horizons (exposure grows as AI capability matures)

### 3.5 Cell detail drilldown

Click any cell to open a detail panel.

**Contents:**

- Cell identifier (e.g., "Analytics × Commercial")
- Composite exposure score with component breakdown: automate %, augment %, create %, protect %
- Headcount affected
- Roles in this cell (list, linked to JA)
- Activities driving the score (top 5 most-exposed activities with exposure levels)
- Linked opportunities from the Opportunity Scan
- AI-generated interpretation: what this exposure pattern means for the client
- Override controls: consultant can adjust the cell's score with required rationale

### 3.6 Scoring model

**Role-level exposure score** is the foundation:

- Pull activities from role decomposition (JA v2)
- Each activity has an AI amenability score from a firm-maintained activity taxonomy
- Weight by activity effort percentage
- Sum to role-level score

**Family-level exposure** aggregates roles within the family, weighted by incumbent count.

**Function-level exposure** aggregates families within the function.

**Cell-level exposure** (family × function) is the subset of roles that belong to that family and are assigned to that function.

**Composition breakdown** (automate %, augment %, create %, protect %) is a weighted distribution based on which activity types dominate:

- Automate: tasks where AI fully replaces human work
- Augment: tasks where AI makes the human faster or better
- Create: work that exists only because AI enables it
- Protect: work that must remain human (compliance, relational, judgment)

### 3.7 Activity taxonomy

A maintained library of work activity types with AI amenability scores. Examples:

- Document drafting: high augmentation
- Data entry: high automation
- Strategic judgment: low exposure (protect)
- Coaching and development: low exposure (protect)
- Code generation: high augmentation
- Customer relationship building: low exposure
- Pattern recognition in large datasets: high automation
- Creative ideation: moderate augmentation

Taxonomy is versioned. When a new version ships, existing engagements can opt to re-score or retain the version they were scored with. Critical for defensibility — a cell scored in January and reported in March should match if the same methodology was used.

### 3.8 Override and refinement

Consultants can override any cell's score with a required rationale. Overrides are visibly marked (small icon, asterisk, or border treatment). The system tracks:

- Original computed score
- Override score
- Override rationale
- Override author and timestamp

Overrides survive recomputation — if the taxonomy updates, overridden cells retain their override unless explicitly reset.

### 3.9 Comparison views

- Current state vs. future state (if mapping has future-state activity shifts)
- Baseline vs. scenario (applying a specific set of opportunities and seeing exposure change)
- Across org units or geographies

### 3.10 Export

- Full heatmap as high-res PDF
- Heatmap embedded in executive deck template
- Drilldown detail as one-page-per-cell PDF
- Excel export with all cells, scores, components
- Chart-standalone exports (SVG/PNG) for inclusion in other deliverables

### 3.11 Data model requirements

- `activity_taxonomy_version` — version metadata, published date, superseded date
- `activity_type` — name, description, taxonomy_version, automate_pct, augment_pct, create_pct, protect_pct
- `exposure_score` — scope (role/family/function/cell), entity_id, score, components, computed_at, taxonomy_version
- `exposure_override` — entity_id, original_score, override_score, rationale, overridden_by, overridden_at
- Aggregation engine that rolls role-level scores up through family, function, and cell levels

### 3.12 Cross-module dependencies

**Reads from:**
- Job Architecture (role activity decomposition, family, function, headcount)
- Skills Map Engine (skill-based exposure indicators)
- Activity taxonomy (firm asset)

**Written to / referenced by:**
- AI Opportunity Scan (heatmap surfaces where to look for opportunities)
- AI Recommendations (exposure levels feed prioritization)
- Workforce planning modules
- Executive deliverables (heatmap is often the anchor chart)

### 3.13 Out of scope for v1

- Predictive labor market data (external benchmarks not available)
- Role-level headcount forecasting (that's workforce planning, not heatmap)
- Individual employee scoring (exposure is at the role level, not the person)
- Pay/comp exposure (separate discipline)

### 3.14 Build phasing (v1)

1. Activity taxonomy data model and seed data
2. Role-level exposure scoring engine
3. Aggregation to family, function, cell levels
4. Heatmap grid UI with default view
5. View toggle (function × family, family × level, etc.)
6. Cell detail drilldown
7. Override UI and audit logging
8. Export formats

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Time-horizon projection.** Exposure evolves as AI capability matures. Show exposure at 12, 24, 36 months based on capability maturity curves for each activity type. Slider control in the UI. This is the question every executive asks: "How will this change?"

**2. Scenario modeling.** "If we implement these five opportunities, how does the heatmap change?" Apply a scenario from the Opportunity Scan and see exposure shift. Particularly powerful when paired with future-state JA — shows how the org's AI exposure profile evolves with the transformation.

**3. Protected work callouts.** Rather than just showing high-exposure cells, proactively surface cells with unusually high "protect" percentages — the human-essential work that will grow in importance. These are the future strategic hires. Executives find this as valuable as the exposure data.

**4. Drilldown from cell to specific opportunity candidates.** Every cell links to the opportunities identified in that cell from the Opportunity Scan. Closes the loop between strategic heatmap and tactical opportunity.

**5. Narrative generation per cell.** Rich AI-generated narrative for each cell explaining the exposure pattern, the roles driving it, and what action the cell implies. These narratives become the talking points when presenting the heatmap.

**6. Concentration risk detection.** When exposure is highly concentrated in specific cells (one family dominates 60% of the org's total exposure), flag this as a concentration pattern that requires focused transformation investment.

**7. Exposure distribution charts.** Beyond the heatmap grid, distribution charts: histogram of exposure scores across the org, Lorenz curve showing concentration, exposure by level or tenure band.

### Tier 2: Strong value, moderate complexity

**8. Custom taxonomy per engagement.** Allow engagement-specific activity taxonomy extensions when the client's work includes activities not well-represented in the base taxonomy (industry-specific processes).

**9. Activity library browser.** Dedicated view for browsing, searching, editing the activity taxonomy. Power users and firm methodologists.

**10. Cross-engagement exposure comparison.** How does this client's exposure compare to other engagements in the same industry? Firm library reference.

**11. Exposure deltas over engagement lifetime.** If the engagement includes ongoing snapshots, show how exposure has shifted as the client has refined activities, restructured roles, etc.

**12. Specific role call-outs.** "These 7 roles drive 40% of the total exposure score in Commercial." Explicit role-level highlighting within cell detail.

**13. Function cuts beyond family.** Allow exposure to be viewed across any custom dimension — location, age tenure band, product line.

**14. Heatmap embedding in working session mode.** Similar to JA's working session mode, heatmap-driven exposure conversations in a presentation-optimized UI.

**15. Exposure component customization.** The automate/augment/create/protect breakdown may need adjustment per engagement (some clients care about create more than automate). Weighting control per engagement.

**16. Confidence bounds on exposure scores.** Show exposure as ranges (65-78) rather than point estimates when activity data is incomplete or uncertain.

**17. Taxonomy version migration.** When a new taxonomy version ships, guided flow to migrate existing engagements with diff view of what changes.

**18. Activity taxonomy authoring workflow.** For firm methodologists, a workflow to propose, review, and publish taxonomy updates.

**19. Automated anomaly flagging.** When a cell's exposure is dramatically different from similar cells, flag for consultant review — might indicate bad data or a genuine pattern.

**20. Exposure by skill (cross-reference with Skills Map).** Which skills will be most disrupted by AI? Which skills gain in importance?

### Tier 3: Nice to have

**21. Heatmap animation across time horizons.** Visual transition showing how the heatmap evolves over 12/24/36 months.

**22. Click-to-compare cells.** Pin multiple cells side-by-side for comparison.

**23. Bookmark specific views.** Save named views (e.g., "Commercial deep-dive") for fast return.

**24. Heatmap annotation.** Consultants annotate cells with notes visible only to the engagement team.

**25. Heatmap themes.** Alternate color palettes for clients with brand preferences or accessibility needs.

**26. Mini-map overview.** For very large matrices (many families × many functions), a minimap for navigation.

**27. Cell grouping.** Manually group cells into named clusters ("Back office," "Customer-facing") for aggregate views.

**28. Heatmap-first presentation mode.** Full-screen heatmap for client presentations with click-to-narrate per cell.

**29. Comparative heatmap for acquisitions.** Show target company's exposure alongside acquirer's for M&A due diligence.

**30. Export as interactive HTML.** Standalone interactive heatmap for the client to explore post-engagement.

### Firm-level features

**31. Firm-wide activity taxonomy governance.** Version control, review workflows, retirement of stale activity types.

**32. Industry-specific taxonomy extensions.** Maintained taxonomies for SaaS, financial services, manufacturing, healthcare, retail.

**33. Exposure benchmarks by industry.** Anonymized firm data showing typical exposure patterns by industry.

**34. Methodology white papers.** Firm-authored documentation on how exposure is computed, linked from every metric.

### Tool-level

**35. Performance.** Heatmap renders in under 1 second for 10+ functions × 20+ families.

**36. Accessibility.** Color choices must pass contrast tests; hover tooltips and detail views work for keyboard-only users.

**37. Mobile-friendly.** Heatmaps are valuable in client meetings; must work on tablet.

**38. Export fidelity.** Exported PDFs and images match on-screen rendering pixel-for-pixel.

### Non-goals

- Do not build headcount forecasting ("in 24 months you'll need 23% less of this role"). Too speculative; separate workforce planning discipline.
- Do not build compensation impact modeling. Separate discipline.
- Do not build vendor or tool recommendation. Exposure shows where AI applies; tool selection is elsewhere.
- Do not build employee-level AI risk scoring. Exposure is at role level; person-level scoring is ethically fraught.

---

# Module 4: Role Clustering

## V1 Spec

### 4.1 Product problem

Client organizations accumulate roles over time. Acquisitions add duplicates. Hiring managers create custom titles. Legacy functions persist alongside new ones. The result: a 650-role catalogue where dozens of roles are functionally identical but titled differently, and dozens more differ in name but do substantively the same work.

Role Clustering identifies these patterns automatically. It groups similar roles into clusters, surfaces consolidation candidates, and quantifies the simplification opportunity. It is typically the first tool a consultant uses after importing the client's catalogue — the cleanup work that enables everything downstream.

### 4.2 Core principle: multi-signal clustering

Roles cluster by similarity across multiple signals simultaneously:

- Title similarity (textual, lexical, semantic)
- Job description overlap (if JDs exist)
- Skill overlap (if skills are mapped)
- Activity overlap (if activity decomposition exists)
- Incumbent overlap (do the same kinds of people fill these roles?)
- Reporting structure similarity (who they report to, what they lead)
- Level and track

No single signal is authoritative — clustering is a composite judgment. The tool presents clusters with confidence scores and supporting evidence; consultants validate and refine.

### 4.3 Primary view: cluster explorer

A two-panel layout. Left panel lists identified clusters sorted by size and confidence. Right panel shows the selected cluster's detail.

**Cluster list (left panel):**

- Cluster label (AI-generated name summarizing the cluster)
- Role count in cluster
- Total incumbents across cluster
- Confidence score
- Consolidation recommendation tag: "Collapse to 1," "Merge 2→1," "Split 1→N," "Reframe family," "Leave as-is"
- Status: pending, reviewed, accepted, rejected
- Small visual: cluster size indicator

**Filter and sort controls:**

- Filter by function, family (from JA)
- Filter by cluster size, confidence threshold, status
- Sort by size, confidence, headcount affected, alphabetical

### 4.4 Cluster detail panel (right)

**Header:**

- Cluster label (editable)
- Recommendation (consolidation action)
- Confidence score with breakdown (which signals contribute how much)

**Roles in cluster:**

- Table or card list of each role in the cluster
- Role name, family, sub-family, level, incumbent count
- Similarity score vs. cluster centroid
- Inline actions: remove from cluster, view role detail, compare to centroid

**Cluster evidence:**

- Shared keywords from titles and JDs
- Overlapping skills (top N skills that appear across multiple roles in cluster)
- Overlapping activities
- Incumbent background patterns (if available)

**Consolidation recommendation:**

- Recommended action (collapse, merge, split, etc.) with rationale
- Proposed consolidated role name (AI-suggested, editable)
- Proposed architecture assignment (family, sub-family, track, level)
- Estimated impact: number of source roles collapsed, headcount affected, downstream changes

**Actions:**

- Accept recommendation (executes consolidation in JA with confirmation)
- Modify recommendation (adjust consolidated role details)
- Reject cluster (not a real cluster, dismiss)
- Split cluster (this is actually 2+ distinct clusters)
- Defer decision

### 4.5 Cluster generation engine

AI-driven. Inputs:

- All roles in the engagement catalogue
- Title strings, JDs, skills, activities, incumbent data

Pipeline:

1. Vectorize each role across multiple signal dimensions (title embedding, JD embedding, skill vector, activity vector)
2. Compute pairwise similarity
3. Cluster using a density-based algorithm (DBSCAN or HDBSCAN) — not requiring pre-specified cluster count
4. Score each cluster's confidence based on within-cluster similarity and signal agreement
5. Generate cluster labels via LLM summarization of common patterns
6. Classify consolidation pattern (collapse, merge, split) based on cluster characteristics

Clusters with low confidence are still surfaced but marked for review. Clusters with near-perfect confidence are surfaced with "auto-consolidate" options.

### 4.6 Clustering views beyond the list

**Cluster map:**

Force-directed 2D visualization (D3) where each role is a dot, proximity indicates similarity, and clusters are visible as dense regions. Hover a dot for role name; click for role detail. Shows the "shape" of the catalogue at a glance.

**Before/after comparison:**

Side-by-side: current catalogue role count vs. projected role count post-consolidation. Charts showing role count by family, by level, before and after.

**Duplicate title matrix:**

A focused view showing all roles with identical or near-identical titles (e.g., "Sr. Product Analyst" appearing in 4 families). This is the lowest-hanging fruit and often the fastest way to demonstrate immediate value.

### 4.7 Consolidation execution

When a consultant accepts a cluster's consolidation recommendation:

1. JA module updates to reflect the change (source roles deprecated, consolidated role created or mapped)
2. Incumbent assignments transferred
3. Downstream modules (Opportunity Scan, Skills Map, etc.) re-compute for affected roles
4. Audit log entry created with full rationale
5. Change impact preview surfaced before commit (similar to JA's Section 13)

Consolidation respects workflow states — can't execute on a role that's already in client review without returning it to draft.

### 4.8 Alternative: consolidation without execution

Not every engagement consolidates. Sometimes the cluster analysis is purely diagnostic — "here's how much title cleanup you have to do eventually." In that case, clusters are logged as findings but no JA changes are made.

Engagement-level setting: "Execute consolidations from clustering" (on) vs. "Diagnostic only" (off).

### 4.9 Export

- Cluster report PDF (executive summary + one page per significant cluster)
- Consolidation crosswalk: current roles → recommended consolidated roles, as Excel
- Cluster map as standalone image
- Before/after catalogue summary as one-page visual

### 4.10 Data model requirements

- `role_cluster` — name, engagement_id, confidence, recommendation_type, status, created_at
- `cluster_membership` — cluster_id, role_id, similarity_score
- `cluster_evidence` — cluster_id, signal_type, evidence_detail
- `consolidation_action` — cluster_id, action_type, target_role_id, status, executed_at
- Clustering engine with versioned similarity model

### 4.11 Cross-module dependencies

**Reads from:**
- Job Architecture (all role data, titles, structure)
- Skills Map Engine (skill overlap signals)
- Job descriptions (where available)

**Written to / referenced by:**
- Job Architecture (consolidations mutate JA)
- Org Health Scorecard (cluster findings feed "structural clarity" dimension)
- Change Readiness (consolidations are changes that must be sequenced)

### 4.12 Out of scope for v1

- Clustering across clients (no cross-engagement role comparison)
- Predictive clustering of roles that don't exist yet
- Compensation-based clustering (different discipline)
- Real-time clustering during catalogue editing (batch process is fine)

### 4.13 Build phasing (v1)

1. Data model and clustering engine
2. Cluster list view
3. Cluster detail panel with evidence
4. Consolidation recommendation and execution flow
5. Cluster map visualization
6. Before/after comparison
7. Duplicate title matrix
8. Exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Incremental re-clustering.** When the catalogue changes (new roles added, existing roles edited), re-run clustering on just the affected portions rather than the full catalogue. Keeps clusters fresh without full recompute cost.

**2. Consultant-trained clustering.** Learn from consultant decisions in the current engagement. If a consultant consistently rejects "Sales Rep" and "Account Executive" as a cluster, the system adjusts similarity thresholds for those titles within this engagement.

**3. Cluster justification narratives.** AI-generated explanation of why these roles cluster: "These 7 roles all involve customer outreach, quota attainment, and CRM-driven lead management. Primary differentiator is deal size."

**4. Split cluster workflow.** When a cluster contains two distinguishable sub-groups, a guided split flow: show the sub-cluster split, let consultant assign each role to a sub-cluster, confirm.

**5. Target role authoring from cluster.** When consolidating N roles to 1, the tool drafts the consolidated role's name, JD, skills, and architecture based on the cluster's common elements. Consultant edits rather than writes from scratch.

**6. Cross-family consolidation detection.** Roles that cluster across family boundaries deserve special attention — are they truly cross-family (maintain) or is a family boundary wrong? Surface explicitly.

**7. Integration with split/merge operations in JA.** Cluster actions naturally produce split/merge mappings. Route cluster outcomes directly into JA's split/merge workflows (from JA v2 Section 1).

### Tier 2: Strong value, moderate complexity

**8. Cluster comparison view.** Select 2+ clusters and compare them side-by-side to understand differentiation. Useful when clusters are close but distinct.

**9. Anti-cluster flagging.** Detect roles that belong to no cluster — truly unique roles. Are they genuinely one-of-a-kind or are they poorly defined? Surface for review.

**10. Cluster-level skills gap.** For each cluster, show the aggregate skills profile. If consolidating, what's the combined skill set of the consolidated role?

**11. Historical cluster tracking.** How have clusters evolved across engagement snapshots? Did consolidations stick? Did new clusters emerge?

**12. Cluster health metrics.** For each cluster: cohesion score (how tightly grouped), separation score (how distinct from other clusters), stability score (how much the cluster has changed over time).

**13. Cluster tags and categorization.** Tag clusters by action taken, by theme, by priority. Filter and report by tags.

**14. Bulk consolidation.** When many clusters have the same recommendation type (all "collapse to 1"), execute them in bulk with confirmations.

**15. Cluster size thresholds.** Ignore clusters below a threshold (e.g., fewer than 3 roles) unless explicitly requested. Reduces noise.

**16. Similarity threshold tuning.** Adjust the similarity threshold that defines a cluster to see tighter or looser groupings. Explorer mode for consultants refining the analysis.

**17. Export cluster map as interactive HTML.** Client receives an interactive cluster visualization they can explore.

**18. Cluster annotation.** Consultants annotate clusters with notes, tags, status.

**19. Cluster to opportunity linkage.** When a cluster suggests a consolidated role that has high AI exposure, surface the linked opportunities automatically.

**20. Cluster diff between scenarios.** If exploring multiple consolidation scenarios, show how cluster outcomes differ.

### Tier 3: Nice to have

**21. Cluster audit timeline.** Visualization of cluster decisions over time.

**22. Unreviewed clusters notification.** Alert engagement team to clusters that haven't been reviewed.

**23. Cluster sharing.** Scoped share link for a specific cluster for client review.

**24. Cluster templates.** Pre-built cluster patterns for common consolidation scenarios (e.g., customer service tier consolidation).

**25. Cluster rejection reasons library.** When rejecting a cluster, choose from common reasons for consistent reporting.

**26. Manual cluster creation.** Consultant creates a cluster manually by selecting roles they want to group.

**27. Cluster search.** Search clusters by role name, keyword, cluster theme.

**28. Cluster notification preferences.** Per-user settings for cluster update notifications.

**29. Cluster archive.** Completed clusters archived but searchable for reference.

**30. Cluster visualization theming.** Alternate cluster map visualizations (hierarchical, radial, etc.).

### Firm-level features

**31. Firm-wide clustering patterns.** Anonymized cluster patterns across engagements informing base similarity models.

**32. Industry-specific clustering priors.** Clustering tuned for specific industries where role patterns are known.

**33. Clustering methodology documentation.** Firm-published documentation on how clustering works, linked from the module.

**34. Consolidation outcome tracking.** Did consolidations from clustering actually succeed in implementation? Feedback loop to improve recommendations.

### Tool-level

**35. Performance.** Clustering 650 roles should complete in under 2 minutes. Cached results update incrementally.

**36. Transparency.** Every cluster's formation traceable to specific signal contributions.

**37. Keyboard navigation.** Through cluster list and into details.

**38. Undo consolidations.** Execute-then-undo for consolidations within a grace period.

### Non-goals

- Do not build clustering across clients. Each engagement is scoped.
- Do not build employee clustering (grouping people). Roles only.
- Do not build predictive clustering for future roles that don't exist.
- Do not build comp-based clustering. Different discipline.

---

# Module 5: AI Readiness

## V1 Spec

### 5.1 Product problem

An organization can have massive AI opportunity but be structurally unready to act on it. AI Readiness assesses whether the organization — at individual, team, and organizational levels — has the conditions in place to succeed with AI transformation. It produces a multi-dimensional readiness profile that shapes how aggressive the roadmap can be, where to invest first, and what risks to mitigate.

Unlike the Opportunity Scan (which asks "where can AI help?") and the Impact Heatmap (which asks "where will AI hit?"), Readiness asks "can this organization actually absorb the change?" Every AI transformation consulting engagement needs this module to calibrate ambition.

### 5.2 Core principle: readiness is multi-dimensional and segmented

There is no single "AI readiness score." Readiness differs by:

- **Level of analysis:** individual, team, function, organization
- **Dimension:** capability (skills and knowledge), opportunity (access and context), motivation (willingness and belief), resources (time, budget, tools)
- **Maturity:** awareness, literacy, proficiency, fluency, leadership

The module produces readiness profiles across these axes and identifies the intervention mix each segment requires.

### 5.3 Primary view: readiness dashboard

Multi-panel dashboard showing readiness at organizational level with drill-down to function, team, and role.

**Top-level panels:**

1. **Organizational readiness composite:** single score with trend, component breakdown (capability, opportunity, motivation, resources)
2. **Readiness distribution:** histogram showing how individuals distribute across readiness tiers
3. **Readiness by function:** bar chart showing average readiness per function with variance indicator
4. **Readiness gaps:** the three biggest gaps surfaced with AI-generated interpretation

**Lower panels:**

5. **Maturity distribution:** pyramid showing percentage of workforce at each maturity tier (awareness, literacy, proficiency, fluency, leadership)
6. **Segmentation map:** 2×2 of capability × motivation showing how the workforce segments into champions, followers, skeptics, and unengaged
7. **Intervention recommendations:** AI-generated recommendations for each segment based on their position

### 5.4 Readiness dimensions (detailed)

**Capability readiness:**

- AI literacy: understanding of AI basics, common models, limitations
- Domain-AI integration: ability to apply AI to specific workflows
- Critical evaluation: can they assess AI output quality?
- Technical proficiency: for roles where direct AI tool use matters

**Opportunity readiness:**

- Access to AI tools relevant to their work
- Sanctioned use cases within their function
- Time allocated to AI experimentation
- Leadership sponsorship visible in their context

**Motivation readiness:**

- Belief in AI value to their work
- Openness to workflow change
- Willingness to invest learning time
- Self-efficacy with new technology

**Resource readiness:**

- Budget for tools, training, experimentation
- Dedicated roles supporting AI adoption (if any)
- Infrastructure supporting AI use (data access, systems integration)
- Time buffer for change absorption

Each dimension is scored at the level being analyzed (individual, team, etc.).

### 5.5 Individual readiness profile

A dedicated view for any single employee:

- Readiness scores across four dimensions
- Maturity tier (awareness through leadership)
- Segment classification (champion, follower, skeptic, unengaged)
- Specific gaps identified
- Recommended development actions
- Peer comparison within their role/team

Source data for individual scores: assessment instruments (surveys, skills assessments), observed behavior (tool usage data if available), self-report, manager input.

**Important privacy constraint:** individual scores are consultant-visible but not exposed back to the individual or their manager by default. This prevents the readiness assessment from becoming a performance evaluation proxy. Client decides who sees what at engagement setup.

### 5.6 Team readiness profile

For any team or function:

- Aggregate readiness scores across dimensions
- Distribution of individuals across maturity tiers and segments
- Team-level characteristics: psychological safety for experimentation, leadership AI posture, collective learning behavior
- Team gaps and strengths
- Recommended team-level interventions

Team composition matters as much as aggregate scores — a team with two champions and eight skeptics has different dynamics than ten followers.

### 5.7 Organizational readiness profile

At org level:

- Composite org readiness
- Cultural readiness signals: language used around AI (aspirational vs. defensive), risk tolerance, experimentation history, past transformation track record
- Structural readiness: governance presence, policy clarity, accountability mechanisms
- Leadership readiness: visible AI sponsorship, decision-making authority for AI initiatives

### 5.8 Assessment instruments

Readiness is scored from multiple input sources:

**Survey-based:**

- Configurable survey instrument with question banks for each dimension
- Administered via survey link (engagement-level, anonymized aggregation)
- Individual responses scored against the readiness model

**Assessment-based:**

- Knowledge assessment questions (multiple choice, scenario response)
- Scored automatically

**Behavioral (when available):**

- Tool usage logs (Copilot, ChatGPT Enterprise, etc., if client shares data)
- Training completion data
- Internal experimentation participation

**Qualitative:**

- Manager assessments of direct reports
- Peer ratings (optional, risky for culture)
- Consultant observation notes

The module supports multiple input modes so engagements can configure what data is available.

### 5.9 Segmentation model

2×2 segmentation:

- **Champions:** high capability + high motivation. Early adopters, potential accelerators.
- **Followers:** moderate both. Will adopt when path is clear. Majority of most orgs.
- **Skeptics:** low motivation despite capability. Often have legitimate concerns worth engaging.
- **Unengaged:** low both. Need foundational work before AI-specific intervention.

Each segment has a distinct intervention profile — the wrong intervention applied to the wrong segment backfires. Champions need empowerment; skeptics need dialogue; unengaged need belonging before technique.

### 5.10 Intervention recommendation engine

Based on segment distribution and gaps, the module recommends intervention mixes:

- **Learning interventions:** structured training, communities of practice, certifications, micro-learning
- **Structural interventions:** role changes, new positions (AI champions, transformation leads), governance setup
- **Cultural interventions:** leadership signaling, experimentation rituals, psychological safety building
- **Tooling interventions:** tool rollout, access expansion, prompt libraries, templates

Each recommended intervention includes target segment, expected impact, estimated cost and time, implementation notes.

### 5.11 Readiness trajectory

Readiness is not static. The module tracks:

- Baseline snapshot (engagement start)
- Subsequent snapshots (quarterly, milestone-based)
- Trajectory over time per dimension, per segment, per function

Enables "before/after" evidence for transformation ROI conversations.

### 5.12 Export

- Org readiness report PDF (executive summary + dimension deep-dives + recommendations)
- Function-level readiness reports (one per function)
- Segmentation visualization standalone
- Survey instrument templates (printable and digital)
- Intervention recommendation summary

### 5.13 Data model requirements

- `readiness_assessment` — engagement_id, administered_at, instrument_version, response_count
- `readiness_response` — assessment_id, individual_id (anonymized), responses, computed_scores
- `readiness_score` — scope (individual/team/function/org), entity_id, dimension, score, computed_at
- `segment_assignment` — individual_id, segment, confidence, assessment_id
- `intervention_recommendation` — scope, intervention_type, target_segment, rationale, status

Strong data privacy posture: individual records access-controlled, anonymization at aggregation boundaries, client retention policies honored.

### 5.14 Cross-module dependencies

**Reads from:**
- Job Architecture (role context for readiness scoring)
- Skills Map Engine (capability dimension draws from skills data)
- Manager Capability (manager-specific readiness often rolls up from the Manager Capability module)

**Written to / referenced by:**
- AI Recommendations (readiness gates recommendation feasibility)
- Change Readiness (readiness is a major change-readiness input)
- Org Health Scorecard (readiness feeds transformation readiness dimension)

### 5.15 Out of scope for v1

- Individual performance predictions
- Performance management integration (readiness is not performance)
- Compensation decisions based on readiness
- Hiring decisions based on readiness

### 5.16 Build phasing (v1)

1. Data model and assessment instrument framework
2. Survey administration and response collection
3. Scoring engine
4. Individual profile view
5. Team and function aggregations
6. Organizational dashboard
7. Segmentation view and intervention engine
8. Trajectory tracking and export

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Intervention effectiveness tracking.** For each intervention launched, track whether readiness improves in the targeted segment. Close the loop between recommendation and outcome — which interventions actually work?

**2. AI fluency certification program integration.** Link readiness to a structured fluency program with tiered certifications. As individuals progress, their readiness updates automatically.

**3. Dynamic re-segmentation.** Individuals shift segments as they develop. Track movement (e.g., "22 people moved from follower to champion this quarter") and surface as engagement progress signals.

**4. Readiness benchmarks by role.** A Senior Engineer's readiness profile differs from a VP of Sales'. Role-adjusted benchmarks so individual scores are contextualized.

**5. Change absorption modeling.** Given org readiness and planned transformation pace, predict whether the org can absorb the planned change or will need slower rollout. Risk-of-overwhelm indicator.

**6. Leadership readiness deep-dive.** Dedicated profile for leaders — executives, senior managers, and their readiness posture as change sponsors. Leadership readiness heavily predicts org-wide success.

**7. Communication strategy generator.** Based on segmentation, generate recommended communication strategies for each segment (what messages resonate with champions vs. skeptics).

### Tier 2: Strong value, moderate complexity

**8. Anonymized peer benchmarking.** Compare team or function readiness to anonymized similar teams from firm library.

**9. Readiness heatmap.** Org chart colored by readiness score — where are the hot spots and cold spots?

**10. Pulse check administration.** Lightweight, frequent mini-assessments for tracking readiness between full snapshots.

**11. Open-ended response analysis.** Survey open-text questions summarized with AI to surface themes.

**12. Role model identification.** Within champions, identify the highest-visibility and highest-influence individuals to prioritize as role models.

**13. Network analysis integration.** If collaboration network data is available, overlay network graph with readiness scores to find influence patterns.

**14. Psychological safety scoring.** Dedicated subscale within motivation readiness for psychological safety, since it predicts experimentation willingness.

**15. Gap cost quantification.** Estimate the cost of readiness gaps (time to close, investment required) for budget conversations.

**16. Skeptic engagement playbook.** Structured guidance for engaging skeptics productively — their concerns often contain legitimate risk signals.

**17. Readiness session facilitation guides.** Materials for consultants to run readiness workshops with client leadership.

**18. Assessment question bank authoring.** Ability to create custom assessment questions specific to the engagement.

**19. Multiple language support.** Global clients require assessments in multiple languages; AI translation with human-review flow.

**20. Accessibility in assessment delivery.** Assessments work for screen readers, motor-impaired users, multiple device types.

### Tier 3: Nice to have

**21. Readiness alerts.** Notify engagement team when readiness in a key segment changes significantly.

**22. Individual development plans.** Per-individual development plans auto-generated from their readiness profile.

**23. Readiness forum / community.** Space for champions to connect across teams — community-of-practice integration.

**24. Readiness gamification.** Optional progress badges, streaks, or milestones for individuals pursuing fluency.

**25. Readiness comparison across snapshots.** Animated or side-by-side view showing how the distribution has shifted.

**26. Anonymized aggregate sharing.** Clients can share anonymized readiness patterns externally (benchmarking, case studies) with consent.

**27. Readiness-informed role assignment.** For new AI projects, recommend team composition based on readiness.

**28. Real-time readiness dashboard.** Live view of readiness as new assessments come in during administration.

**29. Custom dimensions.** Add engagement-specific readiness dimensions beyond the standard four.

**30. Exportable assessment results at individual level.** For individuals or their managers (where client policy allows) to see their own results.

### Firm-level features

**31. Firm-wide readiness pattern library.** Which segmentation distributions predict which transformation outcomes? Anonymized learning across engagements.

**32. Firm-published readiness frameworks.** Documentation and methodology pages accessible from the module.

**33. Consultant readiness facilitation training.** Tool-embedded training for consultants new to readiness work.

**34. Engagement outcome tracking.** Did readiness-guided engagements succeed more than readiness-ignorant ones? Validation metric.

### Tool-level

**35. Assessment response privacy.** Technical safeguards ensure individual responses are never surfaceable without authorization.

**36. Performance.** Readiness compute across 5,000+ individuals should complete in seconds.

**37. Assessment mobile experience.** Surveys work seamlessly on phones; completion rates depend on this.

**38. Export fidelity.** Privacy-respecting exports that allow aggregate sharing while protecting individuals.

### Non-goals

- Do not build performance prediction. Readiness is not performance.
- Do not build individual talent decisions (hiring, firing, promotion) based on readiness.
- Do not build psychometric personality profiling. Stays focused on AI-specific readiness.
- Do not surface individual scores to managers without engagement-level consent and explicit workflow.

---

# Module 6: Manager Capability

## V1 Spec

### 6.1 Product problem

Managers are the pivotal layer in any transformation. They translate leadership direction into team action, they create or break psychological safety for experimentation, they coach or block AI adoption. A transformation that gets managers right succeeds; one that ignores them fails regardless of strategy quality.

Manager Capability assesses managers as a distinct population with distinct requirements. It identifies which managers are ready to lead AI transformation, which need development, which are blocking, and which are potential champions. It produces a manager segmentation that directly feeds the transformation roadmap.

The module also provides the input to identify "AI champions" — the managers whose visible leadership will set the tone for the broader workforce.

### 6.2 Core principle: managers are assessed against manager-specific criteria, not generic readiness

Manager capability is not the same as AI readiness applied to people who happen to manage. It includes distinctly managerial competencies:

- Coaching capability (developing others through change)
- Change leadership (communicating direction, building commitment)
- Team design capability (restructuring work and roles)
- Accountability systems (setting and managing to expectations)
- Psychological safety creation
- Navigating ambiguity

Combined with AI-specific competencies:

- AI literacy sufficient to coach others
- Comfort deploying AI within team workflows
- Judgment about where AI fits vs. doesn't fit in their team's work
- Ability to redesign jobs incorporating AI

### 6.3 Primary view: manager dashboard

Grid or list showing all managers in the engagement with capability scores and segmentation.

**Columns:**

- Manager name, title, function, team size
- Capability composite score
- Manager segment (Champion, Capable, Developing, Blocker, Detached)
- AI capability subscore
- Change leadership subscore
- Coaching subscore
- Direct report readiness (average readiness of their team)
- Gap pattern: dominant capability gap
- Development recommendation
- Status flag (needs development, promote visibility, escalate concern)

**Filters:**

- By function, level, tenure
- By segment
- By team size
- By team readiness
- By capability gaps

**Summary metrics:**

- Manager segment distribution
- Correlation between manager capability and team readiness
- Identified AI champions (subset of Champion segment)
- Identified blockers (managers actively impeding transformation)

### 6.4 Manager profile view

Clicking any manager opens their profile.

**Header:**

- Name, title, function, team size, reporting chain
- Composite capability score with trend
- Segment assignment with confidence

**Capability breakdown:**

- Coaching capability (score + evidence)
- Change leadership (score + evidence)
- Team design capability (score + evidence)
- Accountability (score + evidence)
- Psychological safety creation (score + evidence)
- Ambiguity navigation (score + evidence)
- AI literacy (score + evidence)
- AI deployment comfort (score + evidence)
- Job-AI integration judgment (score + evidence)

**Team effects:**

- Team readiness distribution (from AI Readiness module)
- Team AI tool adoption (if data available)
- Team experimentation rate
- Team outcome indicators (where measurable)

**Development profile:**

- Top 3 capability gaps
- Recommended development interventions
- Potential champion indicators (if applicable)
- Blocker indicators (if applicable) with specific behavioral evidence

**History:**

- Capability trajectory across snapshots
- Development actions taken
- Role changes (promotion, lateral move, transition)

### 6.5 Manager segmentation

Five-segment model:

**Champion:** High capability + high AI engagement + visible leadership. Promote these — invite to steering groups, public speaking roles, pilot leadership. Estimated 5-15% of managers in most orgs.

**Capable:** Strong capability, moderate AI engagement. Can lead when given direction. Target for champion pipeline. Typically 30-40%.

**Developing:** Some capability gaps, willing to engage. Primary development target — most intervention investment goes here. Typically 25-35%.

**Blocker:** Active resistance or persistent capability gaps creating team friction. Requires intervention — coaching, role change, or exit conversation. Typically 5-10%.

**Detached:** Low engagement, low capability, not visibly blocking but not contributing. Requires engagement work before development work. Typically 5-15%.

Segments are not permanent labels. Movement between segments is expected and tracked.

### 6.6 AI champion identification

From the Champion segment, identify specific managers who have disproportionate influence:

- Span of influence (team size × cross-functional reach)
- Visibility (seniority + communication style)
- Credibility (tenure + past transformation track record)
- AI authenticity (actual AI usage, not just talk)
- Willingness to be visible (self-reported or manager-reported)

Short list of 5-15 recommended champions per engagement, depending on org size.

### 6.7 Blocker identification and intervention framework

Blockers require careful handling. Surface:

- Specific behaviors that indicate blocking (dismissive language, undermining communication, gatekeeping)
- Team consequences (lower team readiness, lower experimentation, turnover)
- Possible underlying causes (legitimate concern, role insecurity, change fatigue)
- Intervention options graduated by severity (coaching, accountability conversation, role change, exit)

Blocker identification is the most politically sensitive output of this module. Access controls matter — not every consultant sees blocker data, only leads working with senior client stakeholders.

### 6.8 Assessment sources

Manager capability scored from:

- Direct report feedback (360-lite — scoped questions about specific capabilities)
- Peer feedback (optional, often impractical)
- Manager self-assessment
- Manager's manager assessment
- Behavioral observations in working sessions
- Team outcome data (indirect signal)

Multiple sources cross-validated. Discrepancies (high self-rating, low direct-report rating) are themselves a data point.

### 6.9 Development recommendations

For each manager in Developing segment and some in Capable segment, tailored development paths:

- Structured development programs (coaching cohorts, specific skill programs)
- On-the-job experiences (lead a pilot, coach a team through change)
- Learning content (recommended courses, books, methodologies)
- Mentorship (pair with a Champion)
- Executive coaching (for high-potential Developings at senior levels)

Estimated time, cost, success likelihood per recommendation.

### 6.10 Team effect correlation

For each manager, show the statistical relationship between their capability and their team's readiness. Does this manager's capability predict their team's outcomes? This is the primary validation that the manager assessment matters.

If some managers have high capability but low-readiness teams (or vice versa), surface for investigation — something beyond the manager is driving it.

### 6.11 Manager cohort view

In addition to individual manager profiles, cohort views:

- All managers in a function
- All managers at a specific level
- All managers with teams above a size threshold
- All managers identified as Champions
- All managers identified as Blockers

Cohort patterns inform systemic interventions (e.g., "our VP cohort has a consistent coaching gap").

### 6.12 Export

- Manager capability report PDF (aggregate + per-manager profiles for senior consultants)
- Champion identification one-pager
- Blocker analysis (restricted distribution)
- Development recommendations by manager
- Cohort pattern report

### 6.13 Data model requirements

- `manager` — individual_id, direct_report_count, function, level, engagement_id
- `capability_assessment` — manager_id, dimension, score, source_type, assessed_at
- `manager_segment` — manager_id, segment, confidence, assigned_at
- `champion_candidate` — manager_id, criteria_scores, recommendation_level
- `blocker_flag` — manager_id, evidence, severity, mitigation_status
- `development_recommendation` — manager_id, intervention_type, rationale, status

Strong access control — blocker data especially restricted.

### 6.14 Cross-module dependencies

**Reads from:**
- Job Architecture (manager roles, team structure)
- AI Readiness (team readiness aggregates)
- Org Health Scorecard (structural context)

**Written to / referenced by:**
- AI Recommendations (champion identification feeds change strategy)
- Change Readiness (manager segmentation drives change approach)
- AI Readiness (team readiness partially explained by manager capability)

### 6.15 Out of scope for v1

- Performance management integration
- Compensation decisions
- Succession planning (different discipline, different data)
- Hiring or promotion recommendations

### 6.16 Build phasing (v1)

1. Data model and capability dimensions
2. Assessment instrument framework (360-lite)
3. Scoring and segmentation engine
4. Manager grid view
5. Individual manager profile
6. Champion identification
7. Blocker flagging with access controls
8. Development recommendation engine
9. Cohort views and exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Manager team-effect dashboard.** Quantify the relationship between manager capability and team readiness at statistical level. Enables conversation: "Managers with coaching scores above 70 have teams with readiness 15 points higher on average."

**2. Peer comparison within function.** How does this manager compare to peers at the same level in the same function? Contextualizes individual scores.

**3. Capability trajectory modeling.** Given current development trajectory, project where this manager will be in 6/12/18 months. Helps prioritize where development investment pays off.

**4. Champion influence mapping.** Beyond individual influence scores, map how champions connect across the org — the network view of who knows whom, who influences whom.

**5. Blocker mitigation playbooks.** For each blocker pattern (dismissive, gatekeeping, undermining, absent), playbook for intervention with scripts, sequence, escalation path.

**6. Development program ROI tracking.** For development programs launched, track capability delta over time to quantify program effectiveness.

**7. 360 administration.** Structured 360 feedback collection with anonymization, aggregation, and delivery protocols built in.

### Tier 2: Strong value, moderate complexity

**8. Manager coaching platform integration.** Link to external coaching platforms where coaching engagements can be tracked and outcomes measured.

**9. Leadership pipeline analysis.** Among the Capable and Developing segments, identify highest-potential future leaders based on capability growth rates.

**10. Manager transition support.** For managers transitioning to different roles (new function, new level, first-time manager), tailored capability focus areas.

**11. Manager onboarding profile.** For new managers joining the organization, baseline capability assessment and onboarding development plan.

**12. First-time manager specific lens.** First-time managers have specific capability patterns and development needs distinct from experienced managers.

**13. Cross-functional manager rotation recommendations.** Based on capability patterns, identify managers who would benefit from cross-functional rotation.

**14. Manager community of practice.** Grouping mechanism for manager cohorts engaged in parallel development experiences.

**15. Self-assessment tools for managers.** Tools for managers themselves to reflect on their capability and identify development priorities.

**16. Manager conversation guides.** Structured guides for managers to have capability conversations with their teams.

**17. Development budget allocation.** Given the manager segmentation, recommended allocation of development budget across programs, coaching, and self-directed learning.

**18. Manager feedback on AI tools.** Structured collection of manager feedback on AI tools they're deploying with their teams.

**19. Early warning indicators for blockers.** Patterns that emerge before blocker behavior becomes entrenched — intervention windows.

**20. Manager retention risk.** For high-value managers, retention risk signals based on capability patterns (over-extended champions, under-developed capables).

### Tier 3: Nice to have

**21. Manager visibility tracking.** How much public air time does this manager have (all-hands, company blog, internal communications)? Calibrates champion visibility.

**22. Cross-company manager benchmarks.** Compared to managers at similar companies (firm library, anonymized).

**23. Manager peer networks.** Identify natural peer networks among managers for self-organized learning.

**24. Manager-specific AI tools.** AI tools specifically supporting manager work (1:1 prep, coaching conversation assistants, team health monitoring).

**25. Manager capability certifications.** Formal certifications for capability milestones.

**26. Executive shadow programs.** Formal shadowing programs where Developing managers spend time with Champions.

**27. Reverse mentorship.** Junior employees mentor senior managers on AI fluency — capability source identified and structured.

**28. Manager offboarding patterns.** For managers exiting, capture knowledge and relationships before transition.

**29. Geographic analysis.** How does manager capability vary by geography? Cultural context matters.

**30. Manager engagement depth tracking.** How deeply engaged is each manager with the transformation — participation in working sessions, proactive outreach, experimentation in their team.

### Firm-level features

**31. Firm-wide manager capability patterns.** What does high-performing manager cohorts look like across industries? Firm library.

**32. Manager assessment methodology publication.** Firm-authored methodology on manager capability assessment, linked from the module.

**33. Manager development program library.** Catalog of manager development programs with outcomes data.

**34. Champion alumni network.** Past engagement champions aggregated as an external-facing community.

### Tool-level

**35. Privacy and access control.** Manager assessment data requires strict access controls with audit logging.

**36. Performance.** Assessment for 500+ managers computes in reasonable time.

**37. Export integrity.** Exports respect permission boundaries — blocker reports only downloadable by authorized consultants.

**38. Mobile experience.** Managers may access their own profile via mobile.

### Non-goals

- Do not build performance management. Manager capability is not performance.
- Do not build talent decisions (compensation, promotion) directly. Input to those decisions, not the decision itself.
- Do not build psychometric personality assessment. Too far outside consulting scope.
- Do not surface blocker flags to the blocker themselves without careful coaching conversation protocol.

---

# Module 7: AI Recommendations

## V1 Spec

### 7.1 Product problem

The platform's upstream modules generate a large volume of findings: opportunities, health issues, capability gaps, readiness deficits, structural problems, cluster consolidations, exposure patterns. Left as raw outputs, this is overwhelming — a consultant report full of findings without a clear path forward.

AI Recommendations synthesizes findings across all modules into a prioritized, actionable recommendation set. Each recommendation is a concrete intervention the client can fund, staff, and execute, with quantified impact and feasibility. This is the module that produces the engagement's headline deliverable: "Here's what you should do."

### 7.2 Core principle: recommendations synthesize across modules, they don't duplicate them

A recommendation is not a restated finding. Findings describe the current state ("Span of control is high in Commercial"). Recommendations prescribe action ("Restructure Commercial management layer to add one middle tier, flatten VP spans to target 8-10 reports"). Every recommendation is a composite judgment pulling from multiple findings across multiple modules, not a single module's output rephrased.

### 7.3 Primary view: recommendation portfolio

Grid or card layout showing all recommendations for the engagement. Each recommendation is a discrete, scoped intervention.

**Recommendation card:**

- Title (action-oriented)
- Category: Structural / Capability / Technology / Process / Cultural / Workforce
- Impact score (composite)
- Feasibility score (composite)
- Time to value
- Investment tier (relative: small, medium, large, major)
- Source findings (which upstream modules contributed)
- Affected populations (roles, teams, functions)
- Status: draft, refined, prioritized, in-roadmap, rejected
- Strategic alignment tag (if client strategic priorities are documented)

**Summary metrics at top:**

- Total recommendations generated
- Distribution by category
- Distribution by investment tier
- Total affected population
- Estimated portfolio ROI (v2)

**Filter and sort:**

- By category, investment tier, impact, feasibility, status
- By affected function or family
- By source finding module
- Sort by impact, feasibility, combined score, urgency

### 7.4 Recommendation detail view

**Header:**

- Title, category, status
- Impact and feasibility scores with component breakdown
- Strategic alignment narrative (one line)

**Recommendation body:**

- Situation: what the current state is (sourced from findings)
- Implication: what's at stake if unaddressed
- Recommendation: the specific intervention
- Expected outcomes: what changes, for whom, by when

**Source findings:**

- List of specific findings from upstream modules that contribute to this recommendation
- Each finding linked back to its source module for drill-through
- AI-generated synthesis explaining how findings combine into this recommendation

**Scope and affected work:**

- Affected roles (linked to JA)
- Affected functions or teams
- Affected processes (if process decomposition exists)
- Dependencies: other recommendations that must precede or follow

**Implementation considerations:**

- Required resources (estimated)
- Required capabilities (what the client needs to bring or build)
- Key risks and mitigations
- Success criteria (measurable)
- Suggested phasing

**Decision artifacts:**

- Rationale for the recommendation (written for client executive audience)
- Alternative approaches considered and why rejected
- Sensitivity to assumptions

**Actions:**

- Accept into roadmap
- Reject with reason
- Defer
- Modify (open editing flow)
- Assign to consultant for refinement
- Link to complementary recommendations

### 7.5 Recommendation generation engine

AI-driven synthesis. Inputs:

- All findings from upstream modules
- Engagement context (client priorities, timeline, constraints)
- Historical recommendation patterns from firm library (where available)

Pipeline:

1. Aggregate findings across all modules into a unified finding set
2. Cluster findings by theme, affected population, and causal relationships
3. For each cluster, generate candidate recommendations that address the root theme
4. Score each candidate for impact, feasibility, and urgency
5. Identify dependencies between candidates
6. Surface the candidate set to consultants for validation

Human validation:

- Consultants review, refine, reject, merge candidates
- Can manually author recommendations the engine missed
- Can adjust scoring, priority, and dependencies

### 7.6 Recommendation scoring model

**Impact components:**

- Headcount reach
- Revenue or cost implication (where quantifiable)
- Strategic alignment (to client priorities)
- Risk mitigation value (for recommendations addressing risks)
- Capability building value (long-term organizational capacity)
- Time value (how quickly impact is realized)

**Feasibility components:**

- Organizational readiness (from AI Readiness)
- Capability sufficiency (from Manager Capability, Skills Map)
- Investment required (relative)
- Change complexity
- Dependency readiness (are prerequisites in place?)
- Political complexity (sensitivity of the change)

Both are composite 0-100 with transparent component breakdown.

### 7.7 Strategic alignment

Recommendations are tagged with strategic alignment to named client priorities. Clients typically have 3-5 strategic priorities at any time (e.g., "AI-first product roadmap," "30% faster go-to-market," "operational efficiency"). The module:

- Allows consultants to input client priorities at engagement setup
- Tags each recommendation with alignment to one or more priorities
- Surfaces recommendations grouped by strategic priority
- Flags recommendations that don't align to any stated priority (may still be valid but require explicit justification)

### 7.8 Recommendation views

Multiple ways to view the recommendation portfolio:

- **Grid view (default):** cards sorted and filtered
- **Matrix view:** impact × feasibility 2×2
- **Roadmap timeline:** recommendations sequenced with dependency respect
- **Investment portfolio:** grouped by investment tier
- **Category view:** grouped by intervention category
- **Strategic alignment view:** grouped by client priority
- **Dependency graph:** directed graph showing prerequisite relationships

### 7.9 Roadmap builder

Take the prioritized recommendations and arrange them on a timeline.

- Drag recommendations onto quarterly or monthly lanes
- Respect declared dependencies (tool prevents placing dependents before prerequisites)
- Show workload distribution across phases
- Highlight conflicts (two recommendations competing for same resource, same team capacity)
- Produce roadmap visualization for client presentation

Output becomes the transformation roadmap — the headline client deliverable.

### 7.10 Recommendation presentation mode

Similar to JA's working session mode: full-screen, one recommendation at a time, optimized for client conversations. Walk through recommendations with leadership to secure commitment.

### 7.11 Export

- Recommendation portfolio PDF (executive summary + one page per recommendation)
- Transformation roadmap visualization (single page or poster-sized)
- Recommendation deck (PowerPoint, one slide per recommendation, client-brandable)
- Excel data dump with all fields for further client planning
- Dependency graph standalone export

### 7.12 Data model requirements

- `recommendation` — title, category, status, impact_score, feasibility_score, investment_tier, strategic_alignment, engagement_id
- `recommendation_source_finding` — many-to-many linking recommendations to findings across modules
- `recommendation_dependency` — directional links between recommendations
- `recommendation_affected_entity` — polymorphic links to roles, functions, processes
- `recommendation_score_component` — impact and feasibility breakdowns
- `client_priority` — engagement_id, priority_name, priority_description, priority_rank
- `roadmap_placement` — recommendation_id, roadmap_phase, start_date, end_date

### 7.13 Cross-module dependencies

**Reads from:**
- Every other module in the platform (Org Health, Opportunity Scan, Heatmap, Role Clustering, AI Readiness, Manager Capability, Skills & Talent, Skills Map Engine, Change Readiness, Job Architecture)

**Written to / referenced by:**
- Change Readiness (recommendations are the changes)
- All executive deliverables
- External roadmap and project management tools via export

### 7.14 Out of scope for v1

- Detailed project plans (resource loading, task breakdowns)
- Financial modeling beyond relative investment tiers
- Vendor selection for recommended technology interventions
- Ongoing execution tracking post-engagement

### 7.15 Build phasing (v1)

1. Data model for recommendations, findings, dependencies, roadmap placements
2. Synthesis engine (aggregation across modules)
3. Recommendation generation with LLM synthesis
4. Recommendation grid and detail views
5. Scoring model and UI
6. Multiple portfolio views (matrix, category, strategic alignment)
7. Roadmap builder
8. Exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. ROI modeling per recommendation.** Once client financial context is supplied, compute hard ROI: implementation cost, expected value, payback period, NPV. This is the single biggest leap in client value for the module.

**2. Recommendation templates by industry.** Pre-built recommendation patterns for common industries and scenarios. When findings match known patterns, pre-populated recommendations accelerate the synthesis.

**3. Scenario comparison.** Multiple recommendation portfolios representing different strategic choices. "Portfolio A: cost-focused. Portfolio B: growth-focused." Compare side-by-side.

**4. Portfolio optimization.** Given budget and capacity constraints, compute optimal recommendation subset. Classic portfolio optimization with explicit trade-offs visible.

**5. Recommendation tracker post-engagement.** Track implementation progress on accepted recommendations after engagement ends. Closes the loop.

**6. Cross-recommendation synergy detection.** Some recommendations amplify each other; some conflict. Surface synergies and tensions explicitly.

**7. Risk portfolio view.** All risks across all recommendations aggregated. Shows the risk profile of the full roadmap and where mitigation investment concentrates.

### Tier 2: Strong value, moderate complexity

**8. Recommendation deep comment threads.** Consultant collaboration on each recommendation with threaded discussion.

**9. Alternative recommendation variants.** For any recommendation, a lighter and heavier alternative. Client can choose ambition level.

**10. Stakeholder mapping per recommendation.** Who champions this, who opposes, who's neutral. Informs implementation strategy.

**11. Approval routing.** Workflow for recommendations going through internal review (senior consultant, partner) before client presentation.

**12. Recommendation-to-change-readiness link.** Each recommendation's change demand flows to Change Readiness module for absorption check.

**13. Recommendation value tracking.** Post-acceptance, estimated vs. actual value realized, tracked longitudinally.

**14. Client priority weighting.** Recommendations weighted by alignment strength to the priority they claim to serve.

**15. Recommendation history across engagements.** Same client with prior engagement — show prior recommendations and status.

**16. Recommendation versioning.** As a recommendation is refined, retain history of what changed and why.

**17. Client-facing recommendation portal.** Scoped view for client stakeholders to review and respond to recommendations.

**18. Recommendation workshop mode.** Structured facilitation flow for workshop-style review with client leadership.

**19. Recommendation dependencies with external systems.** Link recommendations to the client's own project management or strategy tools.

**20. Resource estimation per recommendation.** Structured estimation of FTE, budget, timeline requirements per recommendation.

### Tier 3: Nice to have

**21. Recommendation likes and votes.** Multi-consultant engagement team votes or reacts to help surface consensus.

**22. Recommendation search by natural language.** "Show me all recommendations involving the Engineering function" via NL.

**23. Recommendation tagging.** Custom tag system for filtering and grouping.

**24. Recommendation archive.** Historical recommendations from prior engagements browsable as inspiration.

**25. Recommendation change notifications.** Notify engagement team of recommendation edits.

**26. Recommendation PDF customization.** Per-recommendation PDF template selection.

**27. Recommendation Q&A.** Pre-built FAQ per recommendation for client presentation prep.

**28. Recommendation metric proposal.** Suggested metrics to track implementation success per recommendation.

**29. Recommendation champion assignment.** Designate a client-side champion for each accepted recommendation.

**30. Recommendation calendar integration.** Milestone reminders tied to external calendars.

### Firm-level features

**31. Firm-wide recommendation pattern library.** Anonymized successful recommendation patterns across engagements.

**32. Recommendation playbook integration.** Each recommendation category links to firm playbooks on how to implement.

**33. Recommendation outcome database.** What happened to recommendations across engagements? Firm learning asset.

**34. Recommendation quality metrics.** Firm tracks recommendation characteristics associated with high acceptance and implementation success.

### Tool-level

**35. Synthesis performance.** Recommendation generation across a fully-loaded engagement (findings from all modules) completes in reasonable time.

**36. Synthesis transparency.** Every recommendation links to every source finding with clear weighting.

**37. Roadmap rendering performance.** Large roadmaps (40+ recommendations) render and manipulate smoothly.

**38. Keyboard navigation.** Through the portfolio and into recommendations.

### Non-goals

- Do not build detailed project management. Recommendations point to projects; project execution is elsewhere.
- Do not build vendor selection. Implementation vendors chosen separately.
- Do not build financial modeling beyond relative investment tiers in v1.
- Do not build legal or compliance opinion. Flag risks, don't adjudicate.

---

# Module 8: Skills & Talent

## V1 Spec

### 8.1 Product problem

The organization's talent profile — its skills inventory, skill gaps, adjacencies, and development needs — is the foundation for transformation capacity. AI transformation in particular requires visibility into both current skills and the skills the future state demands. Skills & Talent provides this visibility.

This module is distinct from Skills Map Engine in focus. Skills Map Engine is a skill-centric library (what skills exist, how they relate, what roles they belong to). Skills & Talent is a talent-centric view (which people have which skills, where are the gaps, who can move where, who needs development). They share data but serve different consultant questions.

This module is currently marked "In Progress" on the platform.

### 8.2 Core principle: skills are attached to people through roles, and proficiency matters

Skills are not binary. A Senior Engineer has "Python" at a different proficiency than a Junior Engineer. The module models proficiency at multiple levels — typically Aware, Practicing, Proficient, Expert, Leader. Every skill-person association includes proficiency.

Skills come in through three channels:

1. Inferred from role (baseline proficiency expected for the role's level in the family)
2. Inferred from work (activity decomposition, project history, tool usage)
3. Self-reported or manager-reported (explicit declarations)

The module supports all three and surfaces data provenance clearly.

### 8.3 Primary view: talent dashboard

Multi-panel dashboard showing organizational skill health.

**Top panels:**

1. **Skill inventory summary:** total skills tracked, breadth per role, depth per role (proficiency distribution)
2. **Skill gap surface:** top 10 skills where current supply is shortest of future demand
3. **Skill adjacency opportunity:** top 10 skill transitions where existing talent can develop into high-demand areas
4. **At-risk skills:** rare skills with few holders, concentration risk

**Lower panels:**

5. **Skill distribution by function/family:** heatmap showing skill coverage across the org structure
6. **Proficiency pyramid per critical skill:** distribution of holders across proficiency levels for skills flagged as strategic
7. **Development candidate pool:** individuals identified as best-positioned for skill development in gap areas

### 8.4 Gap analysis view

The core analytical view. For each skill:

- Current supply: count of holders at each proficiency level
- Future demand: projected need based on future-state architecture and planned transformation
- Gap: supply minus demand at each proficiency tier
- Gap severity (critical, significant, moderate, none)
- Closing strategies: build (develop internal), buy (hire external), borrow (contractor), or accept (deprioritize)

Sort by gap severity. Filter by function, family, strategic priority.

### 8.5 Adjacency analysis view

Identifies skill transitions — existing skill holders who could develop into adjacent high-demand skills.

- Source skills (currently held)
- Target skills (in demand)
- Adjacency strength (how close are these skills)
- Development effort (time, training required to transition)
- Candidate pool size (how many people hold the source skill)
- Current transition pattern (is this path already traveled in the org?)

Produces actionable "talent pathway" recommendations: "300 people hold intermediate SQL. They can transition to dbt in estimated 4 weeks. That closes our dbt gap."

### 8.6 Critical skill view

Skills flagged as strategic for the engagement (either by client priority or by gap severity). For each:

- Holders list
- Proficiency distribution
- Concentration risk (are all holders in one team, one manager, one location?)
- Development pipeline (who's building this skill?)
- Succession readiness (if critical skill holders leave, who backfills?)

### 8.7 Individual talent profile

For any individual:

- Skills held, with proficiency levels and evidence source
- Skill trajectory (which skills developed recently)
- Adjacent skills they could develop
- Role-fit analysis (how well does their skill profile match their current role vs. alternative roles)
- Development recommendations based on org gaps and their profile

Privacy-respecting defaults: individual profiles visible to consultants; client access scoped by policy.

### 8.8 Team talent profile

For any team or function:

- Aggregate skill coverage
- Skill breadth vs. depth pattern
- Skill redundancy (skills overrepresented)
- Skill gaps at team level
- Team development recommendations

### 8.9 Skill sourcing strategy

For each skill gap, the module recommends a sourcing strategy mix:

- **Build internally:** individuals with adjacent skills + development plans
- **Buy externally:** hiring profiles for the gap
- **Borrow:** contractor or partnership patterns
- **Automate:** can AI reduce the skill need entirely?
- **Accept:** deprioritize if strategic alignment is low

For each strategy, estimated time to close and relative investment.

### 8.10 Skill definitions and standards

Every skill in the system has:

- Canonical name
- Description
- Proficiency level definitions (what does Aware, Practicing, Proficient, Expert, Leader mean for this specific skill?)
- Related skills (taxonomy relationships)
- Typical associated roles
- Typical associated activities

Skill library is shared with Skills Map Engine; this module consumes skills but doesn't author them.

### 8.11 Bulk skill assessment

Support importing bulk skill assessments from:

- HRIS data (if client maintains skill data)
- Learning platform completion records
- Role inference (proficiency baseline by level)
- Manager assessment campaigns
- Self-assessment campaigns

Multiple sources produce a composite score with provenance tracking.

### 8.12 Export

- Talent state report PDF (executive summary + gap analysis + adjacency opportunities + sourcing strategies)
- Skill gap detail export (one page per critical gap)
- Individual development plans (with appropriate privacy controls)
- Team skill summary reports
- Excel data dump of full skill-person matrix

### 8.13 Data model requirements

- `skill` — shared with Skills Map Engine (canonical_name, description, proficiency_definitions, taxonomy_links)
- `person_skill` — individual_id, skill_id, proficiency_level, evidence_source, assessed_at, confidence
- `role_skill_requirement` — role_id, skill_id, required_proficiency, criticality
- `skill_gap` — engagement_id, skill_id, current_supply, future_demand, severity
- `skill_adjacency` — source_skill_id, target_skill_id, adjacency_strength, typical_transition_effort
- `sourcing_strategy` — skill_gap_id, strategy_type, estimated_time, estimated_investment

### 8.14 Cross-module dependencies

**Reads from:**
- Job Architecture (roles, role-skill requirements, incumbents)
- Skills Map Engine (skill library, taxonomy, adjacency)
- AI Opportunity Scan (opportunities driving future skill demand)
- Manager Capability (manager skills feeding into capability)

**Written to / referenced by:**
- AI Recommendations (skill gaps become capability recommendations)
- Workforce planning
- Org Health Scorecard (skill metrics feed health dimensions)

### 8.15 Out of scope for v1

- Learning content authoring or delivery (different discipline)
- Certification tracking (feeds in but not built here)
- Performance evaluation based on skills
- Compensation decisions based on skills

### 8.16 Build phasing (v1)

1. Data model (skills, person-skill, role-skill, proficiency)
2. Bulk skill assessment ingestion
3. Gap analysis engine
4. Adjacency analysis engine
5. Talent dashboard
6. Individual and team profiles
7. Sourcing strategy recommendations
8. Exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Skill demand forecasting.** Beyond the current future state, forecast skill demand 12/24/36 months out based on transformation plans and industry trends. Clients need to hire and develop ahead of demand.

**2. Succession readiness per critical skill.** For strategic skills with few holders, explicit succession mapping: who can backfill, at what readiness level, with what development required.

**3. Skills-based career marketplace.** Within the client org, surface internal mobility opportunities: employees with skill profiles matching open roles or emerging needs. Feeds talent mobility strategy.

**4. Skill ROI modeling.** Which skill investments produce the most value? Weight skill gaps by their attached opportunity or revenue implications to prioritize development spend.

**5. Automation vs. skill build trade-off.** For each skill gap, explicit recommendation: is it cheaper to automate the work or build the skill? Feeds both Opportunity Scan and development planning.

**6. Skill flight-risk concentration.** Combine rarity of skill with tenure-based flight risk to identify highest-priority retention focus areas.

**7. Skill-level pay equity structural check.** Without doing compensation analysis, structural check: are all roles requiring the same skill at the same level structurally consistent? Surfaces potential equity issues early.

### Tier 2: Strong value, moderate complexity

**8. Skill endorsement mechanism.** Peer or manager endorsement for skill proficiency (lightweight, optional).

**9. Skill currency tracking.** Skills become stale — track when a skill was last demonstrated and flag decay candidates.

**10. Learning resource linkage.** For each skill gap, link to learning content available through client or external sources.

**11. Skill assessment workflow.** Structured assessment campaigns with notification, reminders, aggregation.

**12. Development plan generator.** For each individual, auto-generate development plan based on role + gaps + career aspirations.

**13. Skill event tracking.** Record skill-demonstrating events (shipped a project using skill X, completed certification Y).

**14. Skill-based team formation.** Recommend team compositions for specific initiatives based on combined skill coverage.

**15. Skill-based coaching pairing.** Match high-proficiency holders with learners for structured coaching pairs.

**16. Taxonomy evolution tracking.** Skills themselves evolve; track how skill definitions and relationships change across taxonomy versions.

**17. Skill gap diff across snapshots.** How have gaps changed quarter over quarter?

**18. Specialized skill clusters.** Identify emerging skill clusters that don't yet have taxonomic home — signals where the taxonomy needs extension.

**19. Cross-function skill mobility.** How mobile are skills across functions? Does Engineering skill move to Product?

**20. Skill strategic importance tagging.** Client-specific strategic skill tagging distinct from general critical skill flagging.

### Tier 3: Nice to have

**21. Skill narratives.** AI-generated narrative descriptions of skill situations per function.

**22. Skill spotlight reports.** Deep-dive single-skill reports with all holders, proficiency distribution, trajectory.

**23. Skill-based role recommendation for hiring.** When a new role is created, recommend skill requirements based on similar roles.

**24. Skill depth vs. breadth portfolio analysis.** Org-level visualization of deep specialist vs. broad generalist patterns.

**25. Skill notifications.** Alerts when skill gaps cross severity thresholds.

**26. Individual skill growth recommendations.** Individual-facing development suggestions (with privacy respect).

**27. Skill-based org chart overlay.** Show skill distribution on org chart visualization.

**28. Skill legacy tracking.** When people leave, what skill does the org lose?

**29. External skill benchmarking.** Compare skill profile to industry benchmarks where available.

**30. Skill interdependence mapping.** Which skills depend on other skills as foundations?

### Firm-level features

**31. Firm-wide skill taxonomy governance.** Maintained skill library with version control, shared across engagements.

**32. Cross-engagement skill pattern library.** Which skill gap patterns recur across industries?

**33. Methodology documentation.** Firm-authored skill assessment and gap analysis methodology.

**34. Skill taxonomy extensions for specific industries.** Industry-specific skill libraries layered on base taxonomy.

### Tool-level

**35. Privacy enforcement.** Individual skill data has strict access controls.

**36. Performance.** Skill analysis across 5,000+ people and 1,000+ skills completes in reasonable time.

**37. Bulk assessment UI.** Efficient campaign-mode assessment administration.

**38. Export fidelity.** Aggregate exports preserve anonymity; individual exports require explicit authorization.

### Non-goals

- Do not build learning delivery. Skills feeds development planning; delivery is elsewhere.
- Do not build performance management. Skills are not performance.
- Do not build compensation decisions. Input to comp strategy, not the decision.
- Do not surface individual assessments to managers without consent and workflow.

---

# Module 9: Skills Map Engine

## V1 Spec

### 9.1 Product problem

Clients need a visible, navigable, authoritative skill taxonomy — the underlying reference structure that makes skill analysis across all modules possible. The Skills Map Engine is that taxonomy: the library of skills, their definitions, their relationships, and their connection to roles and activities. It is built on O*NET as a foundation (923 occupations, 60K+ alternate titles) but extends and customizes for the specific engagement context.

This module replaces a Mercer Skills Map license (approximately $35-40K) with an open-source, customizable, engagement-specific asset. It is both a strategic cost saver for the firm and a differentiated platform capability.

Skills Map Engine is distinct from Skills & Talent. Skills Map Engine is the *library* (what skills exist, how they relate). Skills & Talent is the *application* (which people have which skills, where are gaps). Skills Map Engine is the upstream authoritative source; Skills & Talent reads from it.

### 9.2 Core principle: four-layer architecture

The skills taxonomy has four distinct layers that must remain cleanly separated in the data model and UI:

1. **Skill library:** canonical skill definitions. A skill is a named competency with a stable identifier. "Python programming." "Strategic thinking." "Conflict resolution."

2. **Skill taxonomy:** relationships between skills. Hierarchical (parent-child), adjacency (related-to, develops-into), prerequisite (requires), opposing (replaces).

3. **Skill-to-role mapping:** which roles require which skills at which proficiency. Role-skill relationships with criticality and proficiency level.

4. **Skill-to-activity mapping:** which activities require or develop which skills. Activity-skill relationships.

Each layer has its own governance, its own editing workflow, and its own consuming modules.

### 9.3 Primary view: skill explorer

Multi-mode interface for navigating the skill library.

**Default view: force-directed graph.**

- Every skill is a node
- Relationships are edges (color-coded by relationship type)
- Click a node to zoom; click an edge to see relationship detail
- Color coding: skills colored by category (technical, behavioral, domain, leadership)
- Node size: number of roles requiring this skill

**Alternative views:**

- **Hierarchical tree:** classic parent-child explorer with expand/collapse nodes
- **List view:** searchable, filterable table of all skills with metadata columns
- **Category view:** skills grouped by top-level category
- **Heatmap:** skill × role family matrix showing where each skill is required

### 9.4 Skill detail view

Opens on skill click.

**Header:**

- Skill name (canonical)
- Alternate names (synonyms, aliases)
- Category and subcategory
- Skill type (technical, behavioral, domain, leadership, cross-cutting)
- Description

**Proficiency definitions:**

- Detailed definitions for each proficiency level (Aware, Practicing, Proficient, Expert, Leader)
- Each level with specific observable behaviors

**Relationships:**

- Parent skill (hierarchy)
- Child skills (hierarchy)
- Related skills (adjacency, shown as list with relationship type)
- Prerequisite skills
- Skills this develops into
- Alternative skills (if substitutable)

**Applied context:**

- Roles requiring this skill (with required proficiency per role)
- Activities involving this skill
- Typical holder count (from Skills & Talent)
- Market signals (if industry skill importance data is available — not live market data, but curated indicators)

**AI-related attributes:**

- Automation susceptibility (how AI affects the work this skill does)
- AI-augmentation potential (how AI enhances rather than replaces)
- Future trajectory (emerging, stable, declining)

**Editorial metadata:**

- Source (O*NET-imported, consultant-added, firm-curated)
- Taxonomy version
- Last edited, editor

### 9.5 Skill authoring workflow

Adding or modifying skills goes through a structured workflow:

- Draft: initial creation or edit
- Review: consultant lead or methodologist review
- Published: available to engagement modules
- Archived: no longer active but preserved for historical reference

Skill edits track before/after state and rationale for downstream impact analysis (editing a core skill definition may change how it maps to roles).

### 9.6 Taxonomy relationship authoring

Relationships are managed distinctly from skill definitions:

- Relationship types: hierarchy (parent/child), adjacency (related), prerequisite (requires), development (develops into), substitution (replaces)
- Relationship strength (strong/moderate/weak for adjacency)
- Bidirectional or unidirectional (parent-child is unidirectional; adjacency is bidirectional)
- Editor can add relationships, flag for review, remove with confirmation

Visualization renders relationships intelligently based on type.

### 9.7 O*NET import and synchronization

O*NET is the canonical source for baseline skill definitions. The engine:

- Imports O*NET skill, ability, knowledge, and work activity taxonomies
- Maps O*NET structure to the four-layer architecture
- Imports occupational titles and their alternate names (60K+ alternate titles)
- Updates on O*NET version releases with diff review flow
- Preserves engagement-specific customizations through updates

Consultant can override O*NET-imported content; overrides are explicitly marked.

### 9.8 Engagement-specific extensions

Base taxonomy is the same across engagements; extensions are engagement-specific.

- Add skills the client has that aren't in O*NET (proprietary technology, specific methodologies)
- Adjust proficiency definitions for client-specific context
- Add relationships between base skills and client skills
- Mark base skills as irrelevant to this engagement

Engagement extensions are preserved across snapshots and can be exported for the client to retain post-engagement.

### 9.9 Job title matching and role inference

Using the 60K+ alternate title database, the engine can:

- Match incoming job titles from client HRIS to standard role definitions
- Suggest skill requirements for roles based on their title match
- Surface title inconsistencies ("Sr. Product Analyst" in your data matches differently than "Senior Product Analyst")

This is the pipe that makes Skills & Talent's bulk assessment from HRIS data possible.

### 9.10 Skill search and navigation

Search is first-class:

- Full-text across skill name, description, alternate names
- Filter by category, type, AI attributes
- Sort by role count, recency, relevance
- Saved searches for common queries
- Recent skills list

Keyboard navigation and quick jump between related skills in the detail view.

### 9.11 Export

- Full skill library export (CSV with all fields)
- Taxonomy relationship export (edge list)
- Skill-role mapping export
- Engagement-specific customizations export
- Skill map as interactive HTML for client retention
- Skill detail PDFs (single-skill reference cards)

### 9.12 Data model requirements

- `skill` — id, canonical_name, description, category, type, ai_attributes, source, taxonomy_version
- `skill_alias` — skill_id, alias_name, alias_source
- `proficiency_definition` — skill_id, level, definition, observable_behaviors
- `skill_relationship` — source_skill_id, target_skill_id, relationship_type, strength
- `skill_engagement_extension` — engagement_id, skill_id, customization_type, customization_data
- `job_title_match` — raw_title, matched_skill_profile, confidence
- `onet_import_snapshot` — version, imported_at, diff_summary

### 9.13 Cross-module dependencies

**Reads from:**
- O*NET (external data source)
- Job Architecture (for role-skill mapping)

**Written to / referenced by:**
- Skills & Talent (consumes skill library, proficiency definitions, relationships)
- Job Architecture (role-skill requirements)
- AI Opportunity Scan (activity-skill mappings inform opportunity identification)
- AI Impact Heatmap (skill automation susceptibility feeds exposure scoring)
- Manager Capability (skill definitions for capability assessment)

### 9.14 Out of scope for v1

- Direct learning content linkage (separate discipline)
- Certification tracking and validation
- Real-time labor market data (external integrations)
- Salary survey integration

### 9.15 Build phasing (v1)

1. Data model for four-layer architecture
2. O*NET import pipeline
3. Skill library CRUD
4. Relationship authoring
5. Force-directed graph visualization
6. Alternative views (hierarchical, list, category, heatmap)
7. Skill detail view
8. Job title matching pipeline
9. Engagement extension support
10. Exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. AI-assisted skill definition authoring.** LLM-supported authoring of skill descriptions, proficiency definitions, and relationships. Consultants seed intent; AI drafts; consultants refine. Dramatically accelerates taxonomy extension.

**2. Relationship inference engine.** Given the skill library, AI suggests probable relationships (adjacencies, prerequisites) that are missing or underdeveloped. Consultants validate suggestions.

**3. Emerging skill detection.** Monitor consultant-added skills across engagements (anonymized) to surface emerging skill categories that should be added to the base taxonomy.

**4. Skill currency tracking.** Track when a skill was last updated, when its AI attributes were reassessed. Flag stale skills for refresh.

**5. AI attribute evolution.** Skills' AI characteristics (automation susceptibility, augmentation potential) change as AI capabilities mature. Structured reassessment flow, versioned per taxonomy release.

**6. Cross-skill dependency analytics.** Which skills are foundational (many skills depend on them)? Which are terminal (few skills build on them)? Informs strategic development priorities.

**7. Skill cluster discovery.** Unsupervised clustering of skills to identify groupings that may warrant taxonomic attention — new subcategories or relationship patterns.

### Tier 2: Strong value, moderate complexity

**8. Multilingual skill names.** Skill canonical names and descriptions in multiple languages for global engagements.

**9. Skill deprecation workflow.** Managed deprecation of obsolete skills with replacement guidance and migration flow for dependent modules.

**10. Taxonomy versioning UI.** Visual diff between taxonomy versions showing additions, modifications, removals.

**11. Relationship strength tuning.** For adjacency relationships, tune strength scores based on observed skill transitions in the talent data.

**12. Skill detail editorial history.** Full edit history per skill with who, when, what changed, why.

**13. Skill "related skills" suggestions in UI.** When viewing a skill, "people who look at this also look at..." contextual navigation.

**14. Skill search by natural language description.** "Show me skills related to managing stakeholder expectations" via natural language.

**15. Skill bookmarks and collections.** Consultants save curated skill collections for reuse (e.g., "AI literacy skills for this engagement").

**16. Skill comparison view.** Select 2-4 skills to compare side-by-side across all their metadata.

**17. Skill usage analytics.** Which skills are most-viewed, most-referenced by roles, most-edited? Informs taxonomy maintenance priorities.

**18. Imported JD skill extraction.** Upload a JD, extract mentioned skills and map to the taxonomy. Accelerates role-skill mapping in JA.

**19. Skill ontology export to industry standards.** Export taxonomy in SFIA, SKOS, or other industry skill ontology formats.

**20. Custom relationship types.** Engagements can define custom relationship types beyond the base set.

### Tier 3: Nice to have

**21. Skill graph animation.** Animated force layout showing taxonomy structure emerging as edges are added.

**22. Skill focus mode.** Zoom into a single skill and its N-degree neighborhood in the graph.

**23. Skill themes and curated views.** Curated groupings like "Skills for AI fluency" or "Skills for first-line managers."

**24. Integration with external skill ontologies.** Lightcast, SFIA, EDISON, other industry taxonomies for cross-reference.

**25. Skill search keyboard shortcuts.** Cmd+K quick search across skills from anywhere in the module.

**26. Skill detail PDF.** Reference card PDF for any skill.

**27. Skill subscriptions.** Consultants subscribe to specific skills for update notifications.

**28. Skill relationship audit.** Reports on relationship inconsistencies (A is adjacent to B but B is not adjacent to A; A prerequisites B and B prerequisites A).

**29. Graph visualization themes.** Alternate color and layout schemes for different presentation contexts.

**30. Taxonomy time-travel.** View the taxonomy as it existed at any point in history.

### Firm-level features

**31. Firm-curated base taxonomy.** Firm-maintained base skill library shared across all engagements, with governance workflow.

**32. Industry taxonomy modules.** Pre-built skill extensions for specific industries (healthcare, financial services, manufacturing).

**33. Taxonomy contribution workflow.** Consultants in engagements propose base taxonomy additions; firm reviews and promotes.

**34. Taxonomy methodology documentation.** Published methodology on taxonomy governance and evolution.

### Tool-level

**35. Graph performance.** Force-directed graph with 1,000+ nodes and 10,000+ edges renders smoothly with filtering and zoom.

**36. Taxonomy compute performance.** Relationship inference and clustering complete in reasonable time.

**37. Search latency.** Sub-second search across 10,000+ skills with filters.

**38. Data integrity.** Referential integrity enforced between skill definitions, relationships, and consuming module links.

### Non-goals

- Do not build learning content delivery. Skills link to learning; delivery is external.
- Do not build real-time labor market sourcing. External integrations handle that.
- Do not build skill assessment delivery. That's in Skills & Talent.
- Do not build a general-purpose competency framework product. Stay focused on skills in transformation context.

---

# Module 10: Change Readiness

## V1 Spec

### 10.1 Product problem

Transformation fails most often not because the strategy is wrong but because the organization isn't ready to absorb the change. Change Readiness assesses organizational capacity for change specifically — distinct from AI Readiness (which is capability-focused) — and produces a change absorption profile that shapes how recommendations are sequenced, paced, and supported.

This module asks: "Can this organization successfully execute the transformation we're proposing?" Where AI Readiness asks about AI-specific knowledge and motivation, Change Readiness asks about the organization's history with change, its current change load, its structural change-ability, and its psychological bandwidth for more.

### 10.2 Core principle: four-quadrant segmentation with intervention mapping

Change readiness is modeled along two primary axes that produce a four-quadrant segmentation of the organization:

- **Willingness:** Do they want this change? Motivation, openness, belief in the value.
- **Ability:** Can they execute this change? Capability, capacity, resources, systems.

Four quadrants:

1. **Ready:** High willingness + high ability. Accelerate these populations — they're the wave.
2. **Eager:** High willingness + low ability. Invest in capability-building. They'll run when enabled.
3. **Capable:** Low willingness + high ability. Have the tools, don't yet have the conviction. Investment in engagement and communication.
4. **Resistant:** Low willingness + low ability. The hardest population. Often requires both capability and motivation work, sometimes structural change.

Each quadrant maps to distinct intervention strategies. Mismatched interventions (applying "Ready" tactics to "Resistant" populations) actively destroy transformation momentum.

### 10.3 Primary view: readiness matrix dashboard

**Central element: the quadrant matrix.**

- 2×2 grid with willingness on one axis and ability on the other
- Population dots plotted on the grid (each dot represents a team, function, or cohort)
- Dot size = headcount in that population
- Dot color = quadrant
- Hover for population details

**Surrounding panels:**

- Quadrant distribution: percentage of org in each quadrant
- Willingness drivers: top factors driving willingness scores
- Ability drivers: top factors driving ability scores
- Intervention mix: recommended intervention distribution given quadrant profile

### 10.4 Readiness inputs

Willingness scored from:

- Past change outcomes (did prior transformations succeed or fail?)
- Leadership signaling (do senior leaders visibly support?)
- Psychological safety for experimentation
- Belief in the specific transformation's value
- Change fatigue (how many changes have landed recently?)
- Identity threat (does the change threaten professional identity?)

Ability scored from:

- Organizational change-execution history (structural ability to do change)
- Current change load (bandwidth available)
- Resource availability (budget, time, tooling)
- Leadership change-management capability
- Communications infrastructure
- Support systems (coaching, training, community)

### 10.5 Population-level analysis

Readiness is scored at population levels, not individuals. Meaningful populations:

- Functions (Commercial, Engineering, Operations)
- Business units
- Geographic regions
- Manager cohorts (first-line, middle, senior)
- Specific teams (where distinctive)
- Change archetypes (early adopter teams, stable producer teams)

Individuals influence population scores but are not themselves scored (distinct from AI Readiness which does individual scoring).

### 10.6 Change load analysis

A specific subcomponent of ability scoring: how much change is already in flight?

- Number of active change initiatives affecting this population
- Change frequency over past 12 months
- Major system changes, structural changes, role changes
- Time-weighted: recent changes weigh more heavily

High change load reduces absorption capacity. A function running three major initiatives has much less bandwidth for a fourth.

Change load is quantified and feeds ability scoring. Surfaced explicitly on the dashboard.

### 10.7 Intervention mapping

For each quadrant, recommended intervention strategies:

**Ready quadrant:**

- Accelerate and highlight
- Give platform and visibility
- Pair with other populations as role models
- Minimal investment for maximum return

**Eager quadrant:**

- Invest in capability (training, tooling, systems)
- Provide resources and support
- Remove execution barriers
- Pair with Ready populations for mentorship

**Capable quadrant:**

- Invest in engagement (communication, participation)
- Address legitimate concerns (what's driving the low willingness?)
- Connect to purpose and value
- Champion involvement from leaders they trust

**Resistant quadrant:**

- Understand the resistance before intervening
- Often requires structural change (leadership change, role change, team restructuring)
- Avoid heavy-handed tactics that entrench resistance
- Consider whether this population should be sequenced later or scoped out

### 10.8 Change impact preview

For the planned transformation (recommendations from AI Recommendations module), compute change impact on each population:

- Which populations experience how much change
- Change intensity score per population
- Alignment: is the change hitting Ready quadrants first (good) or Resistant quadrants first (bad)?
- Sequencing recommendations: which populations to engage first, middle, last

This is the direct output that shapes the transformation roadmap's sequencing.

### 10.9 Change velocity modeling

Given the readiness profile and planned change intensity, model the organization's ability to absorb change:

- Too slow: org is capable of absorbing more; pace could be accelerated
- Well-matched: pace matches capacity; low risk
- Too fast: pace exceeds capacity; high risk of change fatigue, rollback, resistance flare
- Unsustainable: planned pace will damage the organization; re-scope required

Each population has its own absorption rate; aggregate model respects differences.

### 10.10 Change narrative generation

AI-generated narratives per population and at the org level:

- "Your Commercial organization is in the Eager quadrant — high willingness, low ability. The primary investments for this function are capability-building in AI tool usage and dedicated change support resources..."

These narratives become the talking points for presenting the change strategy to the client.

### 10.11 Stakeholder mapping

Beyond population-level readiness, specific stakeholder mapping:

- Key leaders and their position (champion, supporter, neutral, skeptic, opponent)
- Influence network (who influences whom)
- Commitment level (passive to active)
- Intervention strategy per stakeholder (engagement, information, involvement, negotiation)

Strong access controls on stakeholder data — politically sensitive.

### 10.12 Export

- Change readiness assessment report PDF (executive summary + quadrant analysis + intervention recommendations)
- Population-level change strategy reports
- Stakeholder map (restricted distribution)
- Change velocity model output
- Sequencing recommendations for roadmap integration

### 10.13 Data model requirements

- `population` — engagement_id, population_name, type (function/team/region/cohort), headcount
- `readiness_score` — population_id, willingness_score, ability_score, assessed_at
- `readiness_driver` — score_id, driver_type, driver_value, contribution_weight
- `change_load` — population_id, active_initiative_count, recent_change_intensity, assessed_at
- `intervention_recommendation` — population_id, quadrant, intervention_type, rationale
- `stakeholder` — engagement_id, name, role, position, influence_level, commitment_level
- `change_velocity_model` — engagement_id, planned_pace, population_capacity, risk_level

Sensitive data with access controls.

### 10.14 Cross-module dependencies

**Reads from:**
- Job Architecture (population definitions, headcount)
- AI Readiness (capability inputs feed ability dimension)
- Manager Capability (manager cohort readiness)
- AI Recommendations (planned changes feed change impact preview)
- Org Health Scorecard (structural readiness feeds ability)

**Written to / referenced by:**
- AI Recommendations (sequencing recommendations inform roadmap)
- Executive deliverables (change strategy is often the closing chapter)

### 10.15 Out of scope for v1

- Individual-level change readiness (module focuses on populations)
- Change management execution (post-strategy work)
- Communications authoring (inputs to comms strategy, not execution)
- Change program management (project tracking is elsewhere)

### 10.16 Build phasing (v1)

1. Data model for populations, readiness scores, drivers, interventions
2. Readiness scoring engine
3. Change load quantification
4. Quadrant matrix dashboard
5. Population detail views
6. Intervention recommendation engine
7. Change impact preview (roadmap integration)
8. Change velocity model
9. Stakeholder mapping (restricted)
10. Exports

## V2 Backlog

### Tier 1: Highest-leverage additions

**1. Pre-intervention simulation.** Before launching an intervention, simulate predicted readiness shift based on intervention type, target population, and historical intervention effectiveness. Reduces wasted intervention investment.

**2. Readiness monitoring over engagement lifetime.** Quarterly or milestone-based readiness snapshots with trend visualization. Shows whether interventions are actually moving populations between quadrants.

**3. Stakeholder network visualization.** Beyond the flat stakeholder list, network graph showing influence relationships. Surface influence paths, pivotal stakeholders, and cascade strategies.

**4. Change communication strategy generator.** Based on quadrant profiles, generate tailored communication strategies per population — different messages for Ready vs. Eager vs. Capable vs. Resistant.

**5. Resistance pattern library.** Common resistance patterns (identity threat, competence anxiety, values misalignment, past-trauma, political) with recommended engagement strategies.

**6. Change initiative interaction analysis.** When multiple initiatives run concurrently, model their interactions — some reinforce, some conflict, some compete for same attention.

**7. Early warning indicators.** Signals that indicate a population is moving out of readiness (rising change fatigue, leadership signaling shifts, communication breakdowns). Alert surface.

### Tier 2: Strong value, moderate complexity

**8. Leadership commitment tracking.** Specific tracking of senior leadership commitment signals over time — visible sponsorship, decisions that support or undermine the change.

**9. Change story development.** Structured tool for crafting the "why this change" narrative at org and population levels.

**10. Stakeholder action planning.** Per-stakeholder action plans with assigned owners and check-in rhythms.

**11. Population deep-dive views.** Rich detail per population with all readiness drivers, change history, stakeholder context.

**12. Change velocity scenario planning.** Model different transformation paces and see absorption outcomes. "What if we did this in 18 months instead of 12?"

**13. Intervention effectiveness attribution.** After interventions run, attribute readiness changes to specific interventions.

**14. Resistance hot-spot flagging.** Specific areas where resistance is concentrated and escalating.

**15. Commitment conversation guides.** Structured conversation prep for leadership commitment conversations.

**16. Psychological safety assessment.** Dedicated sub-assessment for psychological safety as a foundation for change absorption.

**17. Past change retrospective tool.** Structured retrospective on prior change efforts — what worked, what didn't — to inform current strategy.

**18. Change fatigue measurement.** Targeted instrument to assess fatigue levels across populations.

**19. Executive alignment dashboard.** Senior leadership alignment status with specific gap callouts.

**20. Communication cascade planning.** Tool for planning communication cascades respecting influence networks.

### Tier 3: Nice to have

**21. Readiness alerts.** Notifications when readiness scores cross thresholds.

**22. Anonymous employee sentiment channel.** Optional channel for employees to signal change experience anonymously.

**23. Change readiness playbook.** Firm playbook linked from intervention recommendations.

**24. Success story capture.** Document specific success stories within populations to reinforce momentum.

**25. Change roadmap visualization.** Integrated visualization combining readiness with roadmap sequencing.

**26. Stakeholder commitment ladder.** Visual tool showing each stakeholder's position on the commitment ladder (awareness → understanding → buy-in → commitment → advocacy).

**27. Retrospective scheduling.** Scheduled checkpoints for engagement team retros on change effectiveness.

**28. Cross-engagement change pattern library.** Which change approaches worked in which contexts? Firm learning.

**29. Change metrics integration.** Connect to client operational metrics to track actual change outcomes.

**30. Change comms library.** Templates for change communications calibrated to quadrant and intervention type.

### Firm-level features

**31. Firm-wide change patterns.** Anonymized change outcomes across engagements informing intervention recommendations.

**32. Change methodology documentation.** Firm-authored change management methodology linked from module.

**33. Consultant change competency development.** Embedded learning for consultants new to change work.

**34. Client change maturity benchmarks.** Anonymized benchmarks on client change readiness profiles.

### Tool-level

**35. Sensitive data access controls.** Stakeholder and resistance data have strict access controls.

**36. Performance.** Readiness computation across enterprise-scale populations completes in reasonable time.

**37. Export fidelity.** Sensitive exports require authorization; standard exports are widely shareable.

**38. Mobile access.** Key views accessible on mobile for leadership check-ins.

### Non-goals

- Do not build change project management. Input to project planning, not project execution.
- Do not build communications delivery (email, intranet, video). Informs what and when; delivery is elsewhere.
- Do not build employee engagement surveys as a product. Lightweight readiness pulses only.
- Do not build post-engagement change monitoring beyond snapshot capability. Requires operational integrations we're not building.

---

# Final notes and implementation guidance

## Cross-module architectural principles (reinforced)

All ten modules share data and assumptions. A few principles are non-negotiable:

**Future state as source of truth.** Every module reads the future-state job architecture from the JA module. When a mapping changes, all modules reflect the change.

**Engagement scoping.** Every query, every view, every export is scoped to a specific client engagement. Cross-engagement data is firm-library territory with strict consent.

**Audit logging everywhere.** Every mutation writes an audit event with actor, timestamp, before/after, rationale.

**Privacy and access control.** Individual-level data, stakeholder data, blocker flags, and similar sensitive data have access controls with clear authorization chains.

**AI rationale quality.** Every AI-generated output includes a structured rationale. Black-box outputs are unacceptable.

**Design system consistency.** Ivory, navy, blue, orange. Users shouldn't notice they've moved between modules.

**Export everywhere.** Every view and chart is exportable. Consultants live in Excel, PowerPoint, and PDF.

## Build sequence across modules

If tackling all modules in sequence (which I don't recommend — one or two at a time works better), the recommended order is:

**Wave 1 (foundation):** Job Architecture v1 (separate spec), Skills Map Engine v1, Org Health Scorecard v1

**Wave 2 (core diagnostics):** Role Clustering v1, AI Readiness v1, Manager Capability v1, Skills & Talent v1

**Wave 3 (strategic synthesis):** AI Impact Heatmap v1, AI Opportunity Scan v1

**Wave 4 (recommendations and change):** AI Recommendations v1, Change Readiness v1

**V2 features** across all modules: pulled from the backlogs as specific client engagements surface specific needs. Don't build v2 features speculatively.

## Integration with Job Architecture v1 and v2 specs

This file consolidates modules 1-10 from the Discovery/Diagnose screen. The Job Architecture module is specified separately in `ja-mapping-spec.md` and `ja-v2-backlog-spec.md`. Job Architecture is the backbone all ten modules in this file depend on — it must be in place before significant work on the others.

## Cross-module firm-library dependencies

Several Tier 1 and firm-level features across modules depend on a firm-wide cross-engagement learning system:

- Scorecard benchmark library
- Opportunity pattern library
- Heatmap taxonomy and exposure benchmarks
- Cluster and consolidation patterns
- Readiness benchmarks and outcome tracking
- Manager capability patterns
- Recommendation outcome tracking
- Skill taxonomy governance
- Change pattern library

These all require a firm-wide anonymized data layer with engagement consent flows, data governance, and legal sign-off. This is a major initiative in itself — not a feature but a platform capability. Plan for it as a Phase 4+ undertaking with appropriate stakeholder engagement at Mercer.

## What not to build, across the platform

Repeated across module non-goals for emphasis:

- No compensation management (separate discipline, high legal complexity)
- No performance management (distinct HR system)
- No hiring or ATS integration (separate system)
- No learning content delivery (separate system)
- No vendor selection or tool recommendation (tactical; post-strategy)
- No individual performance prediction
- No real-time labor market data
- No market benchmark sourcing
- No employee personal data beyond what's strictly needed for JA and readiness

Discipline in what *not* to build is what keeps the platform focused and defensible.

## Confirmation before implementing any module

For each module in this file, before writing any code:

1. Confirm the Job Architecture foundation (both v1 and relevant v2 features) is stable enough to support the module
2. Propose a phased implementation plan for the specific module (tier 1 first, then tier 2, then tier 3)
3. Identify cross-module data dependencies and ensure upstream modules have the required fields
4. Flag any new dependencies requiring justification
5. Pause for approval before writing implementation code

Every module has its own spec section above. Treat each as a standalone project with its own phasing. Do not attempt to build multiple modules in parallel without a clear integration test strategy.

---

**End of spec document.**
