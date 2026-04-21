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

1. **Function group** — optional (not all clients use function groups; UI must handle null gracefully)
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

### Bulk operations

- Checkbox column (optional, shown when multi-select mode enabled)
- Bulk action bar appears on selection: Accept all AI suggestions, Reject all, Reassign level, Export selection

### Pagination

- 50 rows per page default
- Jump-to-page, prev/next
- Row count indicator: "Showing 1–50 of 650"

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

<!-- AUDIT RESOLUTION: 1 - Canonical field name is project_id -->
**All tables below MUST include `project_id` (UUID, NOT NULL, indexed) to scope data to a specific project/engagement. The user-facing label remains "engagement" to match consulting vocabulary; do not mix the two in code. All API endpoints filter by `project_id` derived from the authenticated session.**

Backend fields that must exist (flag any that are missing):

- `future_state_architecture` table/model: one row per role with all 5 dimensions, `project_id` (required)
- `current_state_architecture` table/model: same shape, `project_id` (required)
- `mapping` table linking current to future with:
  - `project_id` (required)
  - `confidence_score` (0–100)
  - `mapping_status`: unmapped | ai_suggested | confirmed | rejected
  - `ai_rationale` (text)
  - `created_at`, `updated_at`, `updated_by`
- `job_description` table: one JD per role, with upload metadata, `project_id` (required)
- `employee` table with JA-relevant fields only (working title, mapped role, manager, location, tenure, employment type), `project_id` (required)
- `flag_rule` table: rule definitions with threshold config, `project_id` (required)
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
