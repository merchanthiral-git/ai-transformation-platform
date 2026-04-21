# Job Architecture Mapping Module — Redesign Spec

**Location in platform:** Discovery stage → Job Architecture → Mapping
**Project root:** `~/Desktop/ai-transformation-platform/`
**Stack:** Next.js 16 / React 19 frontend, FastAPI backend

---

## Instructions for Claude Code

**Do not write any code yet.** Read this spec fully, then:

1. Locate the current Mapping component in `frontend/`. Report back the file path, what props/data it receives, what state it manages, and what it currently renders.
2. Identify every existing module that reads job architecture data (Work Design Lab, Org Design Studio, Skills Map Engine, Simulate, Mobilize, Talent, etc.). List the files and how they currently consume JA data. This matters for Section 2 below.
3. Review the existing design system primitives in the component library so the new work reuses rather than duplicates.
4. Write a technical spec that addresses every section below. Flag any backend fields that don't yet exist. Flag any cascading changes to other modules.
5. **Pause and wait for my approval before writing implementation code.**

Design system (non-negotiable):
- Ivory `#F7F5F0` backgrounds, navy `#1C2B3A` deep surfaces, blue `#3B82F6` primary, orange `#F97316` highlights
- Match existing typography, spacing, card treatments — do not introduce a new visual language
- Single-file component where reasonable; split only when it helps
- No new heavyweight dependencies without justifying them in the spec first
- After implementation, run `npm run build` to confirm

---

## 1. Product problem

The current Mapping UI does not read as a job mapping tool. Consultants need to map their client's existing job architecture (current state) to a target/future architecture across five dimensions: function group, family, sub-family, track, and level. Typical engagement size is ~650 roles. Today this work happens in Excel, and the tool needs to replicate the spreadsheet workflow while doing what Excel cannot: surface AI suggestions, flag data integrity issues, visualize calibration patterns, and feed the future-state mapping into every other module in the platform.

## 2. Architectural principle: future state as source of truth

This is a cross-cutting concern, not a local UI change.

Every downstream module in the platform (Work Design Lab, Org Design Studio, Skills Map Engine, Simulate, Mobilize, etc.) must read from the **future-state** job architecture defined by this mapping, not the current state.

Required changes:
- Establish a single canonical `future_state_architecture` data source the mapping writes to and all other modules read from.
- Every module that currently reads current-state JA gets updated to read future-state, with a `view_mode: 'current' | 'future'` toggle where comparison is useful (Org Design Studio especially).
- Unmapped roles need a defined fallback behavior in downstream modules — either show as current state, exclude, or flag as incomplete. Spec this decision explicitly.
- Changes to the mapping should propagate. If a user changes a role's target level from P3 to P4, any downstream module viewing that role should reflect the change immediately (or on next load — spec the refresh behavior).

Claude Code: in your spec, enumerate every file that currently reads JA data and how each needs to be updated.

## 3. Five mapping dimensions

Every role has up to five job architecture dimensions, in both current and future state:

<!-- AUDIT EDIT: Section 3 - Noted ambiguity between Function Group and Job Family Group. Mercer IPE treats these as distinct dimensions. The spec conflates them. -->
1. **Function group** — optional (not all clients use function groups; UI must handle null gracefully). **Ambiguity note:** Mercer IPE uses "Job Family Group" as a primary classification dimension that is distinct from "Function." This spec uses "Function group" for dimension 1, which some clients interpret as the organizational function (e.g., Commercial, Operations) and others interpret as the Mercer Job Family Group (e.g., Sales & Marketing, IT). The implementation should label this dimension configurably — default label "Function Group" with a project-level setting to rename it to "Job Family Group" or any client-specific term. The data model field should be named generically (`dimension_1` or `function_group`) with a display label stored in project settings.
2. **Family** — required
3. **Sub-family** — required, must be child of selected family
4. **Track** — required (S, P, T, M, E)
5. **Level** — required, must be valid for selected track

Cascading rules:
- Sub-family dropdown options filter based on selected family
- Level dropdown options filter based on selected track
- Only M and E tracks can manage (people-manager = true allowed)
- Track change between IC tracks (P/T) and manager tracks (M/E) is a significant event and should be flagged separately from a simple level change

## 4. Primary view: job catalogue grid

The grid is the primary interface. It reads and feels like the Excel consultants already use, with enhancements.

### Layout

- Header row: navy `#1C2B3A` background, white text, small caps labels
- Secondary header band splits columns into two groups: **Current state** (left) and **Future state** (right), separated by a heavy 2px navy vertical divider
- Columns (in order): status strip (20px color bar), role name + incumbent count, current function, current family, current sub-family, current track, current level, `|` navy divider `|` future function, future family, future sub-family, future track, future level, row actions
- Sticky left: role name column stays visible when scrolling horizontally
- Row height: single line by default, with small secondary line under role name for incumbent count / AI suggestion status

### Status strip (left edge, 20px colored bar)

- Green — mapped and confirmed
- Orange — AI suggested, pending user accept/reject
- Gray — unmapped
- Red — low confidence (below threshold, configurable in flag settings)

### Inline change indicators

- Any future-state cell that differs from its current-state counterpart shows an orange `↑` arrow and orange bold text
- Unchanged future-state cells show in normal body text
- Row background tints light ivory `#FFFEF7` when AI-suggested and pending review

### Row actions (last column)

- AI-suggested rows show inline ✓ (accept) and ✕ (reject) buttons
- All rows open the detail drawer on click

### Filter bar (above grid)

- Filter chips for function, family, sub-family, track, level (click to add, × to remove)
- Status filter pills: All, Unmapped, Low confidence, Changed, AI suggested
- Sort dropdown: by role name, by status, by incumbent count, by change magnitude
- Search box: free-text search on role name
- Primary action button: "Auto-map filtered ↗" — runs AI suggestions on the currently filtered population only. This is the core workflow; consultants tackle one function/family at a time, not all 650 roles at once.

<!-- AUDIT EDIT: Section 4 filter bar - Added rate limiting and cost control for Auto-map. Running AI on hundreds of roles simultaneously is expensive and provides no user feedback. -->
  **Auto-map batching and rate limiting:** The Auto-map button submits a background job, not a synchronous request. Behavior:
  - Roles are processed in batches of 25 (configurable). Each batch is one API call to the AI provider.
  - A progress indicator replaces the button during processing: "Mapping 25 of 130 roles... (19%)" with a cancel button.
  - If the filtered set exceeds 200 roles, show a confirmation dialog: "This will run AI suggestions on [N] roles. Estimated time: ~[M] minutes. Continue?"
  - Rate limit: maximum one Auto-map job per project at a time. If a job is running, the button is disabled with tooltip "Auto-map in progress."
  - Cost tracking: each Auto-map run logs token usage to a `ai_usage_log` table (project_id, role_count, token_count, model, timestamp) for billing visibility.
  - On failure (AI provider timeout, rate limit): partially completed suggestions are saved. Failed roles remain unmapped. A summary toast shows: "Mapped 95 of 130 roles. 35 roles failed — retry with Auto-map."

### Bulk operations

- Checkbox column (optional, shown when multi-select mode enabled)
- Bulk action bar appears on selection: Accept all AI suggestions, Reject all, Reassign level, Export selection

### Pagination

- 50 rows per page default
- Jump-to-page, prev/next
- Row count indicator: "Showing 1–50 of 650"

<!-- AUDIT EDIT: Section 4a - Added missing state transition rules for mapping_status. Without these, frontend and backend will implement inconsistent transitions. -->

### 4a. Mapping status state transitions

Valid transitions for `mapping_status`:

```
unmapped → ai_suggested    (AI auto-map runs on the role)
unmapped → confirmed       (consultant manually maps the role)
ai_suggested → confirmed   (consultant accepts AI suggestion)
ai_suggested → rejected    (consultant rejects AI suggestion)
ai_suggested → unmapped    (consultant clears the AI suggestion without rejecting — e.g., wants to re-run AI with different context)
rejected → unmapped        (consultant clears rejection to allow re-mapping)
rejected → ai_suggested    (AI re-runs on a previously rejected role — allowed, new suggestion replaces old)
confirmed → unmapped       (consultant un-confirms a mapping — reverts to unmapped, clears future-state dimensions)
```

Invalid transitions:
- `confirmed → rejected` — a confirmed mapping was already accepted. To reject, first revert to unmapped, then the concept of rejection no longer applies.
- `rejected → confirmed` — a rejected suggestion cannot be directly confirmed. The consultant must either re-run AI (→ ai_suggested → confirmed) or manually map (rejected → unmapped → confirmed).

When a role transitions to `rejected`: the future-state dimensions are cleared. The role appears as unmapped in downstream modules. The rejection reason (if provided) is stored in `ai_rationale` under a `rejection` key.

When a role transitions to `unmapped` from any state: all future-state dimension values are cleared. Downstream modules fall back to current-state values per Section 2 fallback behavior.

<!-- AUDIT EDIT: Section 4b - Added access control rules. Multi-consultant engagements need clear ownership semantics. -->

### 4b. Access control

- **Project-level roles:** Each engagement has an `owner` (typically lead consultant) and one or more `contributors`.
- **Mapping edits:** Any contributor on the project can edit mappings, accept/reject AI suggestions, and modify future-state dimensions.
- **Flag rule configuration:** Only the project `owner` can add, modify, or delete flag rules and thresholds. Contributors can view rules and suppress individual violations on specific roles.
- **Bulk operations:** Accept-all / reject-all AI suggestions require `owner` role OR explicit `bulk_operations` permission granted by the owner.
- **Audit trail:** Every mapping change records `updated_by` (user ID). The mapping history is viewable in the detail drawer (v2 — but `updated_by` must be captured from v1).
- **Read-only viewers:** Clients or reviewers can be granted read-only access to the mapping grid and calibration views. They cannot modify mappings or flag rules.

<!-- AUDIT EDIT: Section 4c - Added concurrency handling. Two consultants editing the same mapping simultaneously will corrupt data without this. -->

### 4c. Concurrency

- **Optimistic locking:** The `mapping` table includes a `version` integer field (see Section 9). On every update, the client sends the current `version` value. The backend performs `UPDATE ... WHERE id = :id AND version = :version` and increments version on success. If the version has changed (another user edited first), the update fails with a `409 Conflict` response.
- **Frontend behavior on conflict:** Show a toast notification: "This mapping was updated by [user] at [time]. Your changes were not saved. Reload to see the latest version." Offer a "Reload" button that fetches the current state.
- **Grid-level refresh:** When a conflict is detected, only the affected row refreshes — do not reload the entire grid.
- **Detail drawer:** If the drawer is open on a role that receives a concurrent update, show an inline banner at the top of the drawer: "This role was updated by another user. Reload to see changes."
- **No real-time sync in v1:** WebSocket-based live sync is out of scope. Conflict detection happens at save time only.

<!-- AUDIT EDIT: Section 4d - Added cross-module refresh semantics. Section 2 says "immediately or on next load" but never decides which. -->

### 4d. Cross-module refresh semantics

When a mapping is saved (confirmed, edited, or reverted):
- **Same module (Mapping grid, Calibration, Flags):** Changes reflect immediately in the current session. The grid row updates in place; calibration charts re-aggregate on next view; flag rules re-evaluate on save.
- **Downstream modules (Work Design Lab, Org Design Studio, Skills Map Engine, Simulate, Mobilize):** Changes reflect **on next load** of the downstream module, not in real time. Each downstream module fetches `future_state_architecture` from the API when mounted. There is no push notification to open downstream tabs.
- **Stale data indicator (recommended):** Downstream modules should display a subtle "Data updated since you last loaded" banner if the `future_state_architecture.updated_at` timestamp is newer than the module's last fetch timestamp. Clicking the banner reloads the module's data.
- **Cache invalidation:** Any mapping save increments a project-level `mapping_version` counter. Downstream modules can cheaply check this counter on mount to decide whether to re-fetch.

## 5. Role detail drawer (opens on row click)

Side drawer or modal overlay. Three tabs, sharing a persistent header.

### Header (persistent across all tabs)

- Navy `#1C2B3A` background, white text
- Role name (large)
- Metadata row: incumbent count, current architecture path (e.g., "Commercial › Product › Analytics · P3"), close button
- Prev / Next navigation to move between roles without closing the drawer

### Tab 1: Mapping

Two-column layout, Current state (read-only, left) vs Target state (editable, right).

For each of the five dimensions, show:
- Small caps label
- Value (current side: plain text; target side: dropdown)
- Status dot next to the target label: green "match" if unchanged, orange "changed" if different
- When changed, show "Was: [previous value]" annotation below the dropdown
- Level change to a different track (IC → manager) shows an additional badge: "Track change"

Function group row is omitted gracefully when the client doesn't use function groups.

Below the dimensions, an AI rationale bar explains why the mapping was suggested:
- AI avatar + rationale text
- Example: "Role evolving toward ML-assisted analytics. Scope expansion + 2 new skill areas support P4 level."

Action row at bottom:
- Primary blue button: "Accept mapping"
- Secondary: "Edit"
- Tertiary: "Reject"
- Right-aligned caption: "2 of 5 dimensions changed"

### Tab 2: Job description

- Header row: JD filename + upload date + Download / Replace buttons
- If JD is loaded: render it as structured sections (Role summary, Key responsibilities, Required qualifications, Scope & impact)
- If no JD loaded: empty state with "Upload a JD" call to action
- Optional (v2): AI callout at bottom connecting JD content to mapping decision. Example: "JD mentions mentoring and strategic influence — signals for P4 level in your framework." Flag this as v2 if it adds meaningful complexity to the initial build.

### Tab 3: Employees

- Incumbent list with pagination (25 per page default)
- Each row: avatar with initials, name, employee ID, manager, location, tenure, `›` chevron
- Search box (search by name or ID)
- Sort options: tenure, name, location, manager
- Export button
- Paginator at bottom for roles with many incumbents
- Row click opens the Employee detail view (separate screen or nested drawer)

## 6. Employee detail view

Strictly job architecture fields. No performance, comp, ratings, goals, or anything outside JA.

### Header

- Breadcrumb: Role detail › [Role name] › Employee
- Avatar, name, employee ID

### Section: Current job architecture

- Working title (from HRIS)
- Mapped role
- Function group
- Family · Sub-family
- Track · Level
- People manager (yes/no)

### Section: Reporting & structure

- Manager (name + title)
- Direct reports count
- Location
- Business unit
- Tenure in role
- Employment type

### Intelligent callouts

- "Working title mismatch" — when HRIS working title differs materially from the mapped role's standard title, show a flag. Consultants need to see this because title hygiene is a core JA deliverable.
- Future: flag if the employee's level looks wrong for their tenure or scope (v2).

### Navigation

- Back button returns to the Employees tab of the parent role detail drawer, not the grid.
- Role-level mapping governs individuals. No per-employee mapping overrides. (Lock this decision now to avoid data model drift.)

## 7. Calibration view (new navigable view)

Add a "Calibration" link in the mapping table navigation (top-level nav or tab next to Grid). Calibration is a separate view, not a column on the grid.

Calibration answers the question: "Does the future-state architecture look structurally sound?" It does this through visual distributions, not lists.

### Chart 1: Level distribution by track (top, full width)

- Stacked vertical bar chart
- X axis: levels (L1, L2, L3, L4, L5, L6+)
- Y axis: number of roles
- Stacked by track: P (blue `#3B82F6`), T (teal `#14B8A6`), M (orange `#F97316`), E (purple `#8B5CF6`)
- Anomaly highlighting: any level bar that falls outside healthy benchmark ranges gets a red outline + red label
- AI-generated callout below chart names the diagnosis ("L3 bulge: 205 roles at L3 is 32% of the org — healthy benchmarks run 18–22%. Investigate under-leveling.")

### Chart 2: Roles per family (bottom left, half width)

- Horizontal bar chart
- Each family = one bar, sorted descending
- Value label on right edge of each bar
- Families below a minimum-size threshold (default 10 roles, configurable via flag settings) flagged orange with warning icon
- AI callout below if any family is flagged

### Chart 3: Span of control by manager level (bottom right, half width)

- Vertical bar chart
- X axis: manager levels (M1, M2, M3, M4, etc.)
- Y axis: median direct reports
- Target line overlay (dashed green) at configurable benchmark (default 8)
- Bars exceeding target flagged red
- AI callout names the diagnosis

### Chart 4: Family × Level heatmap (full width, bottom)

- Rows: families
- Columns: levels (L1 through L6+)
- Cell value: count of roles at that family × level intersection
- Cell color: intensity scales with count (indigo ramp)
- Sparsity highlighting: families with gaps in lower levels (missing L1, L2) flagged orange
- AI callout names the anomaly ("Legal skips L1 and L2 entirely — either the family is under-defined or junior roles are mis-filed elsewhere.")

### Filter bar (shared with grid)

- Same filter chips as the grid
- All charts re-compute live when filters change
- View mode toggle: Future state (default) / Compare to current (overlays ghosted current-state distribution on top of future)

### Backend requirement

Single aggregation endpoint that accepts a filter object and returns all four chart datasets. Do not build one endpoint per chart.

### Benchmark sources

Every AI-generated callout cites its benchmark source (Mercer IPE, configurable in settings). Benchmarks must be auditable — "AI says so" is not acceptable for client conversations.

## 8. Data integrity flags (new configurable system)

Flags are data-quality rules that run against the future-state architecture and surface violations. Distinct from calibration — calibration is about shape; flags are about individual record violations.

### Rule configuration UI

Accessible from the mapping nav: "Flag rules" or "Settings".

Each rule has:
- Rule name
- Rule description
- Operator (greater than, less than, equals, not equals, duplicate, missing)
- Threshold value (user-editable)
- Enabled/disabled toggle
- Severity: info, warning, error

### Default rules to ship

1. **Minimum incumbents per role**: Flag roles with fewer than N incumbents (default 10, configurable). Operator ≥ or ≤ selectable.
2. **Maximum incumbents per role**: Flag roles with more than N incumbents (indicates possible role consolidation candidate).
3. **Duplicate title across families**: Flag when the same role title appears in multiple families. In a clean JA, a given title should belong to exactly one family.
4. **Missing sub-family**: Flag roles without a sub-family assignment.
5. **Missing level**: Flag roles without a level assignment.
6. **Track-level mismatch**: Flag roles where the selected level is not valid for the selected track.
7. **IC role flagged as manager**: Flag roles on P or T tracks with people-manager = true (violates the rule that only M and E can manage).
8. **Manager with no direct reports**: Flag roles on M/E tracks where all incumbents have zero direct reports.
9. **Orphaned sub-family**: Flag sub-families that no longer belong to any family in the future state.
10. **Family size floor**: Flag families with fewer than N roles (default 10).

### Surfacing flags in the UI

- Flag count badge in the top nav (e.g., "14 flags")
- Dedicated Flags view shows all violations grouped by rule
- Each flag row links to the violating role (opens the detail drawer)
- In the grid, rows with active flags show a small warning icon next to the role name
- Hover tooltip explains which rule(s) fired
- Flags filter in the status pill bar: "Flagged (14)"

### Rule evaluation

- Rules run on every mapping save
- Display as a side panel or dedicated view
- Support suppressing a specific flag on a specific role ("Accept as exception" with a required note)

## 9. Data model requirements

<!-- AUDIT EDIT: Section 9 - Added project_id/engagement_id scoping to ALL tables. Without this, multi-engagement deployments have no data isolation. -->
<!-- AUDIT EDIT: Section 9 - Added mapping_type field to mapping table to support 1:1, split, and merge mappings. The v2 spec requires split/merge but the field must exist from day one to avoid a migration. -->
<!-- AUDIT EDIT: Section 9 - Changed ai_rationale from plain text to JSONB. Structured rationale is v1-critical for AI credibility — consultants must cite rationale in client conversations. Plain text cannot be parsed, filtered, or improved programmatically. See Disagreement #2. -->

Backend fields that must exist (flag any that are missing):

**All tables below MUST include `project_id` (UUID, NOT NULL, indexed) to scope data to a specific engagement/project. No table should be queryable without a project scope. All API endpoints filter by project_id derived from the authenticated session.**

- `future_state_architecture` table/model: one row per role with all 5 dimensions, `project_id` (required)
- `current_state_architecture` table/model: same shape, `project_id` (required)
- `mapping` table linking current to future with:
  - `project_id` (required)
  - `mapping_type`: `one_to_one` | `split` | `merge` (default: `one_to_one`) — a split maps one current role to multiple future roles; a merge maps multiple current roles to one future role. v1 implements one_to_one only but the field must exist to avoid a data migration at v2.
  - `confidence_score` (0–100)
  - `mapping_status`: unmapped | ai_suggested | confirmed | rejected
  - `ai_rationale` (JSONB) — structured format: `{ "summary": string, "factors": [{ "dimension": string, "signal": string, "weight": float }], "benchmark_ref": string | null }`. Plain text rationale is insufficient for consultant credibility — the entire value proposition of AI suggestions depends on rationale being citable, filterable, and auditable.
  - `version` (integer, default 1) — used for optimistic locking (see Concurrency below)
  - `created_at`, `updated_at`, `updated_by`
- `job_description` table: one JD per role, with upload metadata, `project_id` (required)
- `employee` table with JA-relevant fields only (working title, mapped role, manager, location, tenure, employment type), `project_id` (required)
- `flag_rule` table: rule definitions with threshold config, `project_id` (required — rules are per-engagement, not global)
- `flag_violation` table: active violations, `project_id` (required)
- `benchmark_source` reference for calibration callouts, `project_id` (required)

## 10. Out of scope for this build

- Per-employee mapping overrides (individuals inherit role-level mapping)
- AI-generated JD analysis in the Mapping detail (v2)
- Level-appropriate-for-tenure flags (v2)
- Export to client-branded deliverable (handled by existing export module; this build just needs to ensure mapping data flows to it)

## 11. Confirmation before build

Before writing code, confirm:
1. The file paths for current Mapping component and all downstream modules that read JA data
2. Which backend fields already exist and which are new
3. Whether the detail drawer is a side drawer or a full modal (recommend side drawer for Excel-like navigation flow)
4. Whether calibration lives as a tab on the mapping screen or a sibling page in the Discovery nav
5. The benchmark source for calibration callouts

Once the spec is approved, implement in this order:
1. Data model additions (future_state tables, mapping table, flag_rule, flag_violation)
2. Grid view (primary)
3. Role detail drawer (three tabs)
4. Employee detail view
5. Calibration view
6. Flag rule configuration + violations surfacing
7. Cross-module refactor: downstream modules read from future_state

Run `npm run build` after each phase. Flag any dependency additions in advance.
