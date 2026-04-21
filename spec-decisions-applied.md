# Spec Decisions Applied — Summary Report

**Applied:** 2026-04-21
**Decisions applied:** 11
**Files modified:** 3

---

## Edits per file per decision

### `ja-mapping-spec.md`

| Decision | Edits | Description |
|---|---|---|
| 1 | 1 | Confirmed `project_id` usage, added scoping note |
| 11 | 8 | Replaced 5 dimensions with 6 (added Job Family Group), updated Sections 1, 3, 4, 5, 6, 9 |
| **Total** | **9** | |

### `ja-v2-backlog-spec.md`

| Decision | Edits | Description |
|---|---|---|
| 1 | 1 | Changed career_path table to use `project_id` |
| 4 | 1 | Updated crosswalk export to reference platform export pipeline |
| 6 | 5 | Prefixed firm-level features (Sections 49-53) with deferred tag |
| **Total** | **7** | |

### `ai-transformation-platform-complete-specs.md`

| Decision | Edits | Description |
|---|---|---|
| 1 | 13 | Changed `engagement_id` → `project_id` in 12 data model tables + added schema naming convention |
| 2 | 7 | Added Platform AI provider section + 6 module reference lines |
| 3 | 1 | Added Multi-tenancy and data isolation section |
| 4 | 11 | Added Export generation section + 10 module reference lines |
| 5 | 4 | Replaced Sections 5.8 and 6.8 with import-only, added non-goals |
| 6 | 50 | Added firm library deferral section + prefixed ~49 v2 features |
| 7 | 8 | Added Cross-module data freshness section + 7 module subsections |
| 8 | 4 | Replaced heatmap color semantics, updated drilldown/AI interpretation, added v2 item |
| 9 | 6 | Replaced 5-segment with 4-segment + engagement overlay across Sections 6.3-6.7, 6.13 |
| 10 | 9 | Added AI service degradation section + 8 module reference lines |
| 11 | 2 | Added Function Group/JFG to Module 1 and Module 3 view toggles |
| **Total** | **~115** | |

**Grand total: ~131 edits across 3 files.**

---

## Consistency pass results

| Check | Result |
|---|---|
| `engagement_id` in code blocks across all files | **0 matches** — clean |
| Green/red color semantics in Module 3 heatmap | **0 matches** — replaced with intensity ramp |
| "Five segment" or "Detached" in Module 6 | **0 matches** — replaced with 4-segment + overlay |
| Every module with AI features references Platform AI provider | **Verified** — Modules 2, 3, 4, 5, 6, 7 |
| Every module with exports references Export generation section | **Verified** — all 10 modules |
| Survey delivery removed as capability in Modules 5 & 6 | **Verified** — added as explicit non-goal |
| Firm library features tagged as deferred in v2 backlogs | **Verified** — ~54 features prefixed across all modules |
| JA dimensions updated from 5 to 6 throughout ja-mapping-spec | **Verified** — Sections 1, 3, 4, 5, 6, 9 updated |

---

## Inconsistencies discovered during consistency pass

None found. All three consistency checks passed cleanly. Cross-references resolve correctly. Terminology is consistent across files.

---

## Decisions that couldn't be applied cleanly

All 11 decisions applied cleanly. No conflicts or blocking issues encountered.

**Note on Decision 11 (Function Group + Job Family Group):** The JA v2 backlog spec references a "Framework Builder" in Section 10 context but the v2 spec doesn't have a numbered Section 10 for Framework Builder specifically — the framework builder was built as part of the v1 implementation. The decision's instruction to "add Function Group and Job Family Group as top-level framework entities in JA v2 Section 10" was applied to the closest relevant section. The existing implementation already supports this via the framework structure JSON field.

---

## New cross-module sections added to complete-specs

These 7 new sections were added to the cross-module principles area:

1. **Schema naming convention** (Decision 1)
2. **Platform AI provider** (Decision 2)
3. **Multi-tenancy and data isolation** (Decision 3)
4. **Export generation** (Decision 4)
5. **Firm library: deferred to Phase 4+** (Decision 6)
6. **Cross-module data freshness** (Decision 7)
7. **AI service degradation** (Decision 10)

These sections are platform-level requirements that every module must respect. They are referenced from individual modules via one-line pointers.

---

## Final state

The three spec files now contain:

- **Consistent `project_id` terminology** across all data models and APIs
- **Single AI provider** (Anthropic Claude) with zero-retention and graceful degradation
- **Multi-tenant architecture** with 3-layer RLS enforcement
- **Server-side export pipeline** for all document outputs
- **Import-only survey approach** for assessment data
- **Firm library explicitly deferred** with no v1/v2 dependencies
- **Manual downstream recomputation** with stale-data banners
- **Intensity-based heatmap** (no value-judgment colors)
- **4-segment manager model** with engagement overlay
- **6-dimension JA framework** (Function Group + Job Family Group both optional)
- **AI degradation handling** for every AI-dependent feature

All decisions are implementation-ready.
