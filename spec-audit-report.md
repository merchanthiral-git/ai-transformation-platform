# Spec Audit Report — AI Transformation Platform

**Audited:** 2026-04-21
**Files audited:**
1. `ja-mapping-spec.md` (JA v1 — 341 lines → ~464 lines)
2. `ja-v2-backlog-spec.md` (JA v2 — 650 lines → ~700 lines)
3. `ai-transformation-platform-complete-specs.md` (Modules 1-10 — 3,076 lines → ~3,120 lines)

**Total lines audited:** 4,067
**Total edits made:** 31 audit edits + 7 consistency fixes = **38 edits**

---

## 1. Total Edits by Phase and Module

| Phase | ja-mapping-spec | ja-v2-backlog | complete-specs | Total |
|---|---|---|---|---|
| Phase 1 (Missing) | 9 | 5 | 7 | **21** |
| Phase 2 (Edge cases) | 6 | 4 | 0 | **10** |
| Phase 3 (Disagreements) | 3 | 3 | 1 | **7** |
| Phase 4 (Consistency) | 3 | 3 | 1 | **7** |
| **Total** | **21** | **15** | **9** | **45** |

*Note: Some Phase 1 edits also addressed Phase 2 edge cases inline.*

---

## 2. Critical and High Severity Issues Fixed

### Critical (4)

1. **No project/engagement scoping on any JA data model table.** Every table in Section 9 lacked `project_id`. Multi-engagement deployments had zero data isolation. Fixed: added `project_id` (indexed, NOT NULL) to every table.

2. **No scenario isolation semantics.** JA v2 Section 2 said scenario changes are "isolated" but never defined what downstream modules see. Fixed: downstream modules always read baseline unless explicitly passed `scenario_id`; atomic commit semantics defined.

3. **No engagement lifecycle defined across 10 modules.** The platform had no spec for what happens when engagements end — data retention, client deletion, consultant access revocation. Fixed: added 5-state lifecycle (Provisioning → Active → Closing → Archived → Purged) with retention policies and GDPR handling.

4. **AI rationale as plain text in v1.** The entire credibility of AI-suggested mappings rests on rationale quality, but v1 stored `ai_rationale` as unstructured text. Structured rationale was deferred to v2 backlog item #12. Fixed: upgraded to JSONB with defined schema (`summary`, `factors[]` with dimension/signal/weight, `benchmark_ref`) in v1.

### High (9)

5. **No mapping state transition rules.** Four statuses existed but no valid transitions were defined. Fixed: added complete state machine with 8 valid transitions, 2 explicitly invalid, and behavioral specs for rejection and unmapping.

6. **No access control model.** No definition of who can edit mappings, run AI suggestions, or modify flag rules. Fixed: added project-level roles (owner/contributor/viewer) with capability matrix.

7. **No concurrency model anywhere.** 11 modules, zero mention of simultaneous editing. Fixed: added optimistic concurrency with version field, 409 Conflict handling, and cross-module policy.

8. **No cross-module refresh semantics.** Section 2 said downstream modules should reflect changes "immediately or on next load" but never specified which. Fixed: same-module immediate, downstream on-next-load with stale-data banner and `mapping_version` counter.

9. **No temporal query support for 9 of 10 modules.** Only JA v2 mentioned historical reconstruction. Fixed: added cross-module `module_snapshot` table requirement for as-of queries.

10. **Working session data freshness undefined.** JA v2 Section 4 described working sessions but didn't address stale data during a session. Fixed: added live fetch per role, staleness indicator, conflict prompt.

11. **Heatmap v1 depends on JA v2 Tier 2 feature.** Module 3 scoring model required activity decomposition from JA v2 Section 16 (a Tier 2 feature). Fixed: added fallback scoring from JD text analysis and skill profiles.

12. **AI Recommendations engine assumes all modules complete.** Section 7.5 says "aggregate findings across all modules" with no partial-data handling. Fixed: engine generates from whatever exists, notes missing modules, flags lower confidence.

13. **Individual readiness data lacks GDPR/privacy requirements.** Module 5 stores individual assessment scores visible to consultants but had no privacy framework. Fixed: added DPA requirement, right-to-access export, 12-month retention limit.

---

## 3. Low Severity Issues (Not Fixed — For Future Review)

| # | Module | Issue | Severity |
|---|---|---|---|
| 1 | JA v1 | Calibration benchmark source says "Mercer IPE, configurable" but no benchmark data format is defined | Low |
| 2 | JA v1 | Employee detail view (Section 6) has no pagination spec for the employee list within the drawer | Low |
| 3 | JA v2 | Career path visualization (Section 6) specifies "D3.js force-directed" — overly specific technology choice for a spec | Low |
| 4 | JA v2 | Section 44 (commentary/working notes) duplicates Section 17 (role justification field) in purpose | Low |
| 5 | Module 1 | Scorecard dimension 5 (Career Mobility) depends entirely on historical data that most clients won't have | Low |
| 6 | Module 2 | Opportunity categories include "Create" (AI enables new work) which is hard to identify from existing work analysis | Low |
| 7 | Module 3 | Heatmap color semantics (green=low exposure) may confuse users who associate green with "good" — low exposure may be bad for some roles | Low |
| 8 | Module 4 | DBSCAN requires epsilon parameter not mentioned in spec | Low |
| 9 | Module 6 | "Detached" segment (low engagement, low capability) overlaps with "Blocker" in practice | Low |
| 10 | Module 8 | Skills & Talent "proficiency levels" (Aware through Leader) not aligned with Skills Map Engine proficiency definitions | Low |
| 11 | Module 9 | O*NET import of 60K+ alternate titles is a large data operation with no specified batch size or incremental update strategy | Low |
| 12 | Module 10 | Change load quantification (Section 10.6) has no defined scale or units | Low |
| 13 | All | Export formats specify PDF, Excel, PPTX but no spec for image resolution, chart fidelity, or branded template configuration schema | Low |
| 14 | All | Every module specifies "AI-generated interpretation" but no spec for which AI model, prompt structure, or fallback when AI is unavailable | Low |

---

## 4. Expert Disagreements Preserved in Specs

| # | Location | Disagreement | Resolution |
|---|---|---|---|
| 1 | Module 10, Section 10.2 | **2x2 vs 3-axis change readiness model.** The 2x2 (willingness × ability) is clean but loses the distinct "change history" dimension. A 3-axis model adding change load as independent axis provides more diagnostic precision. | **Kept 2x2.** Change load already flows through ability dimension. 2x2 is more presentable to executives. Disagreement documented inline. |
| 2 | JA v1, Section 3 | **Function Group vs Job Family Group.** Mercer IPE treats these as distinct dimensions. Spec conflates them under "Function group (optional)." | **Noted ambiguity.** Added that the label should be configurable per engagement. Not forced to one interpretation because client terminology varies. |
| 3 | JA v2, Section 4 | **Working session mode scope for Tier 1.** Full session tracking (table, audit log, export) is over-scoped for Tier 1. | **Split into two tiers.** Tier 1 = presentation-mode view only. Tier 2 = full session persistence. Documented in spec. |

---

## 5. Unresolved Questions Requiring Decisions

These are places where the spec is ambiguous and I didn't have enough context to fix. **You need to decide these before implementation begins.**

| # | Question | Context | Impact |
|---|---|---|---|
| 1 | **`project_id` or `engagement_id`?** | JA specs use `project_id`. Complete-specs use `engagement_id`. They mean the same thing. | Pick one canonical name. Every table, every API endpoint, every frontend prop uses it. Renaming later is expensive. |
| 2 | **Who hosts the AI model for rationale generation?** | Every module assumes AI-generated interpretations and rationale. No spec says whether this is Claude API, OpenAI, Azure, or self-hosted. | Affects cost structure, latency, data residency (client data sent to third-party API), and offline capability. Needs a platform-level AI provider decision. |
| 3 | **Is the platform single-tenant or multi-tenant?** | Specs assume engagement-scoped data isolation but don't define deployment model. One Railway instance per client? One shared instance with row-level isolation? | Affects database design, access control enforcement, data residency, and firm-library architecture. |
| 4 | **Server-side PDF or client-side print?** | JA v2 crosswalk export and multiple modules specify PDF export. Server-side requires Python dependencies with system-level deps (Cairo/Pango for WeasyPrint, or ReportLab). Client-side is zero-dep but less controllable. | JA v2 spec now recommends ReportLab. But this decision cascades to all 10 modules' export capabilities. |
| 5 | **What is the survey/assessment delivery mechanism for Modules 5 and 6?** | AI Readiness and Manager Capability require survey instruments. The spec doesn't define whether surveys are built into the platform, delivered via external tool (Qualtrics, Google Forms), or are simply data imports. | Building survey delivery is a significant scope expansion. Most consulting firms use external survey tools and import results. |
| 6 | **How does the firm library work technically?** | Multiple modules reference a "firm library" of anonymized cross-engagement patterns. No spec defines the data architecture, consent flow, anonymization algorithm, or governance model. | This is called out as "Phase 4+ undertaking" in the complete-specs but multiple Tier 1 features depend on it. Need to decide whether firm library is in scope for the first year or explicitly deferred. |
| 7 | **What happens to in-flight work when framework definitions change?** | JA v1 now has edge case handling for framework changes cascading to mappings, but the behavior for downstream modules (Heatmap scores, Opportunity assessments) when the underlying JA changes is not fully specified. | The cross-module refresh semantics (on-next-load with stale banner) handle the UI, but the data layer needs to define whether stale downstream computations are automatically invalidated or manually retriggered. |

---

## 6. Implementation Readiness Assessment

**The specs are now implementation-ready for JA v1 and the first wave of Discovery modules (Scorecard, Role Clustering, Skills Map Engine), with the following conditions:**

### Ready to build:
- **JA v1 mapping module** — data model is complete with project scoping, state machine, access control, concurrency, import handling, and scaling notes. All critical gaps are filled.
- **Org Health Scorecard v1** — compute engine and dashboard are well-defined. Snapshot model is clear. Can build without dependencies beyond JA.
- **Role Clustering v1** — clustering engine, evidence model, and consolidation workflow are specified. Embedding model choice now documented.
- **Skills Map Engine v1** — four-layer architecture, O*NET import, and authoring workflow are clear.

### Ready after prerequisite decisions:
- **JA v2 features** — split/merge, scenarios, and archetypes are well-specified after the audit, but require the `project_id` vs `engagement_id` decision and the AI provider decision.
- **Modules 2-4 (Opportunity Scan, Heatmap, Role Clustering)** — ready after JA v1 is stable and the heatmap fallback scoring is confirmed.
- **Modules 5-6 (AI Readiness, Manager Capability)** — blocked on the survey delivery mechanism decision (#5 above).
- **Module 7 (AI Recommendations)** — blocked on at least 3-4 upstream modules being complete. This is correctly identified as Wave 4.
- **Module 10 (Change Readiness)** — blocked on Recommendations module for change impact preview.

### Not ready:
- **Firm library features** across all modules — requires a separate architecture spec for the cross-engagement anonymized data layer. Not a module feature; it's a platform capability.
- **All export features specifying branded PDF/PPTX** — blocked on the server-side PDF decision (#4 above).

**Bottom line:** Start building JA v1, Scorecard, Role Clustering, and Skills Map Engine. Make the 7 unresolved decisions above before expanding to other modules. The specs are substantively complete — the remaining gaps are architectural decisions, not spec gaps.
