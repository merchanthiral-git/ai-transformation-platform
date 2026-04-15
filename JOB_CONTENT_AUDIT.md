# Job Content Authoring — Codebase Audit

**Date:** April 15, 2026
**Scope:** Full codebase inspection of job content, job family, sub-family, and role definition tooling

---

## 1. Inventory of Existing Files

### Backend

| File | Lines | What It Does |
|------|-------|-------------|
| `backend/app/routes_job_arch.py` | 401 | Core job architecture API. `_build_hierarchy()` builds Function → Family → Sub-Family → Job tree from workforce + job_catalog + work_design. `_validate_architecture()` flags structural issues. `_build_employee_list()` enriches employees with tenure/perf/risk. Supports future-state version save/load (file-based). |
| `backend/app/routes_job_content.py` | 453 | Job content authoring CRUD. In-memory stores for taxonomy, themes (5-7 per sub-family), verb libraries (10-12 per track per sub-family), generated content (bullets per level/theme), and overview/ending templates. AI generation via Claude with governed prompts. Batch generation across levels. Prompt builder constructs full context from config. |
| `backend/app/store.py` | 1500+ | Central data store. `job_catalog` schema: Model ID, Job Code, Job Title, Standard Title, Function ID, Job Family, Sub-Family, Career Track, Career Level, Manager or IC, Job Description, Skills, Role Purpose. `build_internal_job_catalog()` synthesizes from workforce if no explicit job_catalog uploaded. |
| `backend/app/routes_tutorial.py` | 1700+ | Sandbox data generation. `FUNC_BLUEPRINTS` defines 9 functions with role distributions. `_TECH_HIERARCHY` and industry-specific hierarchies map roles to (Job Family, Sub-Family). Generates employees with Function, Job Family, Sub-Function, Job Family Group, Career Track, Career Level. |
| `backend/app/config/industry_titles.py` | 300 | Industry-specific title mappings. Level codes (S1-S6, P1-P8, etc.) map to industry display titles. `get_csuite_title()` generates function-specific C-suite titles (CFO, CTO, etc.). |

### Frontend

| File | Lines | What It Does |
|------|-------|-------------|
| `frontend/app/components/JobArchModule.tsx` | 1970+ | Main Job Architecture module with 13 tabs: Catalogue, Org Chart, Profiles, Architecture Map, Validation, Analytics, Job Evaluation, Career Lattice, Governance, Intelligence, Role Network, Compare, **Job Content**. OrgChartBuilder renders interactive tree with pan/zoom. |
| `frontend/app/components/design/JobContentAuthoring.tsx` | 1188 | 5-step workflow component (Taxonomy → Themes → Verbs → Generate → Compose). Left-panel taxonomy tree browser. Theme editor with defaults (4 archetypes). Verb library with track tabs and swim lanes. AI prompt editor (monospace, editable). Composed document preview with template variables. |
| `frontend/app/components/ArchitectureMapTab.tsx` | exists | Visual architecture map (separate component imported by JobArchModule). |
| `frontend/app/components/shared/constants.ts` | 260+ | `CAREER_FRAMEWORKS` — 5 industry-specific career frameworks (Technology L1-L7, Financial Services Analyst→Partner, Healthcare CNA→VP, Manufacturing L1-L6, Professional Services Analyst→Partner). Display-only benchmarks. |
| `frontend/lib/api.ts` | 500+ | 22 API functions for job content (taxonomy CRUD, themes CRUD, verbs CRUD, content CRUD, prompt building, AI generation, composed view, templates). 5 API functions for job architecture (hierarchy, versions). |

---

## 2. Data Model Assessment

### Current Hierarchy

```
Function (from workforce "Function ID")
  └── Job Family Group (from workforce "Job Family Group")
       └── Job Family (from workforce "Job Family")
            └── Sub-Family (from workforce "Sub-Family")
                 └── Job Title (leaf node, with headcount)
```

**Fields per job:**
- `title`, `level`, `track`, `function`, `family`, `sub_family`
- `headcount`, `ai_score`, `ai_impact`, `tasks_mapped`

### Job Content Authoring Data Model

```
Taxonomy Node (3 types: group, family, sub_family)
  ├── id, type, parent_id, name, definition
  ├── applicable_tracks: ["S","P","T","M","E"]
  └── display_order

Theme (scoped to sub_family)
  ├── id, sub_family_id, name, description
  └── display_order (5-7 per sub-family)

Verb Library Entry (scoped to sub_family + track)
  ├── id, sub_family_id, track, band (entry|mid|senior)
  └── verbs: string[] (10-12 per track)

Content Bullet (scoped to sub_family + track + level + theme)
  ├── id, sub_family_id, track, level, theme_id, theme_name
  ├── bullet_text, is_finalized
  └── generated_at, prompt_used

Content Template (scoped to sub_family)
  ├── overview_template (with {level_title}, {sub_family_name} vars)
  └── ending_template
```

### Key Observations

1. **Two separate hierarchies exist:** The workforce-derived hierarchy (Function → Family → Sub-Family → Job) and the content authoring taxonomy (Group → Family → Sub-Family) are **independent data stores** with no linking IDs. They need to be connected.

2. **Job content is in-memory only.** The `_taxonomy`, `_themes`, `_verb_libs`, `_content`, `_templates` dicts in `routes_job_content.py` are not persisted. All data is lost on backend restart.

3. **Job architecture versions are persisted** (file-based in `data/arch_versions/`), but job content has no versioning.

4. **The sandbox generates hierarchies** with rich industry-specific mappings (`_TECH_HIERARCHY` etc.), but the job content module doesn't seed from these — it starts empty.

---

## 3. UI and Workflow Assessment

### Job Architecture Tabs — Current State

| Tab | UI Type | Data Source | Completeness |
|-----|---------|-------------|-------------|
| Catalogue | Tree nav + grid + detail panel | `getJobArchitecture()` | Complete, working |
| Org Chart | Interactive canvas (pan/zoom/search) | Employee data + Manager IDs | Complete, working |
| Profiles | Job profile library | Job + employee data | Complete, working |
| Architecture Map | Visual map component | Job hierarchy tree | Complete, working |
| Validation | Health scores + flag list | `_validate_architecture()` | Complete, working |
| Analytics | Distribution charts (Recharts) | Job/employee aggregations | Complete, working |
| Job Evaluation | IPE/Hay scoring forms | AI-assisted scoring | Complete, working |
| Career Lattice | Role network visualization | Task overlap analysis | Complete, working |
| Governance | Placeholder | None | Stub only |
| Intelligence | AI insights | Claude-powered analysis | Complete, working |
| Role Network | Task-based connections | Work design overlap | Complete, working |
| Compare | Side-by-side table | Selected jobs | Complete, working |
| **Job Content** | **5-step workflow** | **routes_job_content.py** | **Functional but no persistence** |

### Job Content Authoring — 5 Steps

| Step | What Exists | Completeness |
|------|-------------|-------------|
| 1. Taxonomy | Tree browser + CRUD forms + status badges | Working, but disconnected from workforce hierarchy |
| 2. Themes | Card editor + defaults (4 archetypes) + reorder + counter (5-7 range) | Working |
| 3. Verbs | Track tabs + swim lanes + pills + defaults + counter (10-12 range) | Working |
| 4. Generate | 3-panel layout: context / prompt editor / output review. AI generation with verb compliance check. Per-bullet approve. | Working (depends on Claude API) |
| 5. Compose | Overview + bullets + ending. Template variables. Level selector. | Working |

### AI/LLM Integration

| Feature | How It Works | Status |
|---------|-------------|--------|
| Content generation | Claude API via `call_claude_sync()`. Governed prompt with themes + verb constraints + level calibration. | Working |
| Batch generation | Sequential generation across levels (P1-P6) in one API call. | Working |
| Verb compliance | Frontend checks first word of each bullet against verb library. Green check / amber warning. | Working |
| Prompt transparency | Full prompt shown in editable textarea. User can modify before generating. | Working |
| Job evaluation scoring | Claude scores jobs against IPE/Hay factors. Returns structured JSON. | Working |
| Fallback | If AI unavailable, returns template bullets ("Contributes to {theme} within the scope of the role.") | Working |

### Template-Out / Data-In Pattern

| Feature | Template Download | Upload/Ingest | Status |
|---------|------------------|---------------|--------|
| Workforce data | Yes (Excel with headers + sample row) | Yes (upload → parse → store) | Working |
| Job catalog data | Yes | Yes | Working |
| Job content taxonomy | No | No | **Missing** |
| Themes + verbs | No | No | **Missing** |
| Generated content export | No | N/A | **Missing** |

---

## 4. Gap Analysis vs. Target Architecture

### Target: Three-Tier Content Schema
```
Job Family
  ├── Purpose statement
  ├── Scope narrative
  └── Distinguishing characteristics

Sub-Family
  ├── Purpose statement
  ├── Scope narrative
  ├── Distinguishing characteristics (vs. sibling sub-families)
  └── Competency framework

Job Profile (per level)
  ├── Overview statement
  ├── Core content (themed bullets)
  ├── Leveling criteria
  └── Ending statement
```

### What Exists and Is Usable As-Is

| Feature | Location | Notes |
|---------|----------|-------|
| 4-level hierarchy (Function → Family → Sub-Family → Job) | `routes_job_arch.py` | Working. Tree building, filtering, headcount-aware. |
| Themed bullet generation with verb governance | `routes_job_content.py` | Working. 4 archetypes, 5 track verb sets, governed prompts. |
| AI-assisted content generation | `routes_job_content.py` + `JobContentAuthoring.tsx` | Working. Claude API with fallback. Editable prompts. |
| 5-step authoring workflow | `JobContentAuthoring.tsx` | Working. Sequential gating (themes required before generation). |
| Job evaluation (IPE/Hay) | `JobArchModule.tsx` | Working. AI-assisted batch scoring. |
| Validation flags | `routes_job_arch.py` | Working. Structural, HR, and career path warnings. |
| Career frameworks (benchmarks) | `constants.ts` | Working. 5 industry frameworks for reference. |
| Industry-specific title mappings | `config/industry_titles.py` | Working. 8 industries × 33 levels. |
| Org chart with function filtering | `JobArchModule.tsx` | Working. Hierarchical tree with connector lines. |

### What Exists but Needs Significant Rework

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Data persistence** | All job content stores are in-memory dicts (lost on restart) | File-based or SQLite persistence for taxonomy, themes, verbs, content, templates. Version history. |
| **Taxonomy ↔ workforce link** | Content authoring taxonomy is a separate store from the workforce-derived hierarchy | Link taxonomy node IDs to workforce Job Family / Sub-Family values. Auto-seed taxonomy from uploaded workforce data. |
| **Family/sub-family definitions** | Taxonomy nodes have a `definition` field but it's free-text with no structure | Add purpose statement, scope narrative, and distinguishing characteristics as separate structured fields (not one text blob). |
| **Level calibration** | Prompt builder includes generic calibration text ("Level 1 = entry, Level N = ceiling") | Need explicit calibration dimensions (scope, autonomy, stakeholders, time horizon, impact) with per-level anchors from the spec's table. |
| **Sibling differentiation** | No mechanism to compare/contrast sibling sub-families | Need "differentiator" AI micro-task that generates distinguishing characteristics between siblings in the same family. |
| **Upward summarization** | No mechanism to derive family-level descriptions from children | Need "summarizer" AI micro-task that generates family purpose/scope from its sub-families' content. |

### What's Completely Missing

| Feature | Description | Priority |
|---------|-------------|----------|
| **Persistence layer** | Job content data survives backend restarts | Critical |
| **Auto-seed from workforce** | When workforce data is uploaded, auto-create taxonomy nodes from the hierarchy | High |
| **Structured content schema** | Purpose statements, scope narratives, distinguishing characteristics per family/sub-family (not just a single `definition` field) | High |
| **Excel template export** | Download taxonomy + themes + content as Excel for offline editing / client review | High |
| **Content versioning** | Save/restore/compare versions of generated content (like job architecture versions) | Medium |
| **AI differentiator** | Compare sibling sub-families and generate distinguishing characteristics | Medium |
| **AI summarizer** | Generate family-level descriptions from sub-family content | Medium |
| **AI gap detector** | Identify missing themes, inconsistent language, level overlaps across sub-families | Medium |
| **AI style normalizer** | Ensure consistent tone, tense, and vocabulary across all generated content | Medium |
| **Coverage dashboard** | Visual overview of which sub-families have complete content, which need work | Low |
| **Side-by-side consistency checker** | View adjacent levels (P3 vs P4) to verify differentiation is meaningful | Low |
| **Export to Word** | Generate professional Word document per sub-family with formatted job descriptions | Low |
| **Integration with global job selector** | Selecting a job in the sidebar auto-navigates to its content in the authoring module | Low |

---

## 5. Recommended Build Order

### Phase 1: Foundation (Critical)
1. **Persistence** — Add file-based persistence for job content stores (JSON files in `data/job_content/`). Save on every mutation, load on startup. This is blocking everything else — without it, no content survives a restart.

2. **Auto-seed taxonomy from workforce** — When workforce data is loaded, scan for unique (Function, Job Family, Sub-Family) combinations and auto-create taxonomy nodes. Pre-populate definitions from job catalog if available.

3. **Structured content schema** — Add `purpose_statement`, `scope_narrative`, and `distinguishing_characteristics` fields to family and sub-family taxonomy nodes (alongside the existing `definition` field).

### Phase 2: AI Micro-Tasks (High Impact)
4. **AI differentiator** — New endpoint that takes sibling sub-families and generates a 2-3 sentence "how this sub-family differs from X" for each.

5. **AI summarizer** — New endpoint that takes a family's sub-families and generates the family-level purpose statement and scope narrative.

6. **Level calibration engine** — Replace the generic calibration text in the prompt builder with the spec's 5-dimension table (Scope, Autonomy, Stakeholders, Time Horizon, Impact) with per-level anchors.

### Phase 3: Quality & Export (Medium Impact)
7. **Side-by-side consistency view** — Show adjacent levels (e.g., P3 | P4 | P5) in the compose step so the user can verify differentiation.

8. **Excel export** — Download taxonomy + themes + generated content as a formatted Excel workbook.

9. **Word export** — Generate professional Word documents per sub-family with all levels formatted.

10. **Content versioning** — Save/restore/diff content versions (reuse the pattern from `data/arch_versions/`).

### Phase 4: Integration (Lower Priority)
11. **Global job selector integration** — Clicking a job in the sidebar navigates to its sub-family in the authoring module.

12. **Coverage dashboard** — Visual heatmap showing content completion across the full taxonomy.

13. **AI gap detector + style normalizer** — Scan all generated content for inconsistencies, gaps, and style issues.

---

## 6. Architecture Decisions to Make

1. **Should the content authoring taxonomy BE the workforce hierarchy, or a parallel structure?**
   - Option A: Same data — content nodes ARE workforce Job Families/Sub-Families
   - Option B: Parallel — content taxonomy is separate but linked via IDs
   - Recommendation: **Option A** — auto-seed from workforce, allow manual additions, but keep one hierarchy. The current dual-store approach causes confusion.

2. **Where should generated content live relative to the job catalog?**
   - Option A: As additional columns on the `job_catalog` DataFrame
   - Option B: As a separate `job_content` store linked by sub-family ID
   - Recommendation: **Option B** — content is authored at the sub-family × level intersection, not per individual job title. Keep the stores separate but linked.

3. **Should verb governance be enforced at generation time only, or also at edit time?**
   - Current: Verb compliance is checked post-generation (amber warning if non-governed verb used)
   - Recommendation: **Keep current approach** — enforce at generation, warn at edit. Don't prevent users from overriding.

4. **Should the prompt be visible to the user or hidden?**
   - Current: Full prompt shown in editable textarea (transparent)
   - Recommendation: **Keep transparent** — this is a consulting tool. Consultants need to understand and control the AI output.
