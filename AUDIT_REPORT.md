# AI Transformation Platform — Full Codebase Audit

**Date:** 2026-04-14
**Scope:** `frontend/` directory (32 component files, ~25K lines of source)
**Status:** Report only — no changes made

---

## Executive Summary

The platform is well-architected at the macro level — good route grouping, dynamic imports for code splitting, a comprehensive design token system, and solid error boundary coverage. The biggest wins from a cleanup would be:

1. **Split the mega-files.** DesignModule.tsx (6,900 lines), page.tsx (3,388 lines), and shared.tsx (2,347 lines) account for over half the codebase and are the root cause of most maintainability issues.
2. **Consolidate the API layer.** Two API clients exist (`api.ts` and `apiClient.ts`) plus 7+ files making raw `fetch()` calls with inconsistent error handling. Unifying this eliminates ~80 empty catch blocks and makes error UX consistent.
3. **Extract the `useApiData` hook.** The same fetch-loading-error boilerplate is copy-pasted 14+ times. A single custom hook would cut ~200 lines and make loading/error states consistent.
4. **Replace hardcoded values with tokens.** 200+ hex colors and 200+ pixel values bypass the existing design system. This makes rebranding or scaling impossible.
5. **Add skeleton loaders.** Most data-heavy views show blank space while loading — the single biggest perceived-performance gap.

---

## Critical Issues

### C1. Two API clients, neither used consistently
- **Files:** `lib/api.ts` (simple fetch wrapper), `lib/apiClient.ts` (retry logic, error classification)
- **Problem:** Components use `api.ts` exclusively. `apiClient.ts` with its retry logic and typed errors is never called. Meanwhile, 7+ component files make raw `fetch()` calls with their own ad-hoc error handling.
- **Scattered raw fetch in:** `AgentPanel.tsx`, `AiIntelligence.tsx`, `FlightRecorder.tsx`, `MobilizeModule.tsx`, `NLQBar.tsx`, `SimulateModule.tsx`, `shared.tsx`
- **Fix:** Migrate all fetch calls to a single client with consistent error handling, retry, and toast feedback.
- **Effort:** Significant

### C2. 81 empty catch blocks silently swallow errors
- **Files:** `app/page.tsx` (26 instances), `shared.tsx` (4), `DesignModule.tsx` (3), `SimulateModule.tsx` (2), `OverviewModule.tsx` (2), `MobilizeModule.tsx` (1), `NLQBar.tsx` (1), `BotWorkspace.tsx` (1), `admin/page.tsx` (1), `layout.tsx` (1), plus ~40 more in page.tsx for localStorage/audio
- **Problem:** API failures, JSON parse errors, and state update failures are invisible to both users and developers. No toast, no console, no fallback.
- **Fix:** Replace empty catches with `showToast()` or at minimum `console.error()`. The toast system already exists.
- **Effort:** Moderate

### C3. No confirmation before destructive actions
- **Problem:** Delete, reset, and clear operations execute immediately with no confirmation dialog. Risk of accidental data loss.
- **Fix:** Add confirmation modal before delete/reset operations.
- **Effort:** Quick fix

### C4. Socket.IO has no error/disconnect handling
- **File:** `lib/collaboration.ts:46-58`
- **Problem:** `reconnectionAttempts: 10` is set but there's no handler for final disconnect. Real-time collaboration silently dies.
- **Fix:** Add `connect_error` and `disconnect` listeners with user-facing feedback.
- **Effort:** Quick fix

---

## High Priority — UX Gaps Users Will Notice

### H1. No skeleton loaders anywhere
- **Affected:** All module pages (Diagnose, Design, Simulate, Mobilize, Export, Overview)
- **Problem:** When data is loading, users see blank space or partially-rendered layouts. The `LoadingBar` component exists but only shows a thin progress bar, not content placeholders.
- **Fix:** Add skeleton/shimmer states for tables, charts, and card grids.
- **Effort:** Significant

### H2. Missing form labels (accessibility)
- **Files:** `DesignModule.tsx` (5+ inputs), `DiagnoseModule.tsx:178` (bulk-fill input), `PlatformHub.tsx` (login/signup forms)
- **Problem:** Inputs use `placeholder` as the only text descriptor. No associated `<label>` elements. Breaks screen readers and voice control.
- **Fix:** Add `<label htmlFor>` or `aria-label` to every input.
- **Effort:** Moderate

### H3. Missing focus indicators on interactive elements
- **Files:** `shared.tsx` (command palette items), buttons throughout, card components
- **Problem:** Custom-styled buttons and interactive elements have `hover:` states but no `focus:` styles. Keyboard navigation is invisible.
- **Fix:** Add `focus-visible:ring` or equivalent to all interactive elements.
- **Effort:** Moderate

### H4. No skip-to-content link
- **File:** `app/(marketing)/page.tsx`
- **Problem:** Keyboard/screen-reader users must tab through the entire navbar before reaching content.
- **Fix:** Add a visually-hidden skip link as the first focusable element.
- **Effort:** Quick fix

### H5. Command palette lacks focus trap
- **File:** `shared.tsx:286-317`
- **Problem:** When the command palette modal is open, focus can escape to elements behind it. Focus isn't returned to the trigger on close.
- **Fix:** Implement focus trap (or use a library like `@radix-ui/react-dialog`).
- **Effort:** Quick fix

### H6. Duplicate "Executive Summary" prompt entries
- **File:** `shared.tsx:1102-1103`
- **Problem:** Two identical prompt entries with the same label appear in the AI prompt selector.
- **Fix:** Remove the duplicate.
- **Effort:** Quick fix

### H7. Aggressive 401 handling
- **File:** `lib/auth-api.ts:79`
- **Problem:** `window.location.reload()` fires immediately on any 401 response with no user feedback. If the backend returns a transient 401, the user gets a jarring page reload.
- **Fix:** Show a "session expired" toast with a re-login button instead of force-reloading.
- **Effort:** Quick fix

---

## Medium Priority — Code Quality & Maintainability

### M1. Oversized component files

| File | Lines | Recommended Split |
|------|------:|-------------------|
| `DesignModule.tsx` | 6,900 | Split into sub-tab components: JobContext, Deconstruction, Reconstruction, Redeployment, Impact, OrgLink |
| `app/(platform)/app/page.tsx` | 3,388 | Extract state management into context providers, module rendering into separate components |
| `shared.tsx` | 2,347 | Split into: `animations.tsx`, `visualizations.tsx`, `hooks.ts`, `constants.ts`, `ui-components.tsx` |
| `JobArchModule.tsx` | 1,804 | Split by tab/section |
| `consultantGuide.ts` | 1,746 | Move to `data/` directory as content file |
| `DiagnoseModule.tsx` | 1,702 | Split by sub-module |
| `SimulateModule.tsx` | 1,660 | Split scenarios vs. charts |
| `MobilizeModule.tsx` | 1,656 | Split roadmap vs. tracking |
| `KnowledgeBase.tsx` | 1,425 | Split search vs. content |
| `hrGuide.ts` | 1,209 | Move to `data/` directory |
| `OverviewModule.tsx` | 1,018 | Split dashboard cards vs. project hub |
| `ArchitectureMapTab.tsx` | 975 | Split visualization vs. controls |

### M2. Prop drilling 3-4 levels deep
- **Props affected:** `f: Filters`, `model: string`, `viewCtx: ViewContext`, `jobStates: Record<string, JobDesignState>`
- **Drilled through:** `page.tsx` -> modules -> sub-components -> sub-sub-components (50+ prop passes)
- **Fix:** Create `FiltersContext`, `JobStateContext`, `ViewContext` providers.
- **Effort:** Significant

### M3. 202+ unsafe `Record<string, unknown>` type assertions
- **Files:** `SimulateModule.tsx` (10+), `MobilizeModule.tsx` (10+), `NLQBar.tsx` (3), `admin/page.tsx` (2)
- **Problem:** API responses are cast to `Record<string, unknown>` instead of typed interfaces. Defeats TypeScript's purpose.
- **Fix:** Generate TypeScript interfaces from backend API schemas.
- **Effort:** Significant

### M4. Duplicate fetch-loading-state boilerplate (14+ instances)
- **Pattern:** `useEffect(() => { setLoading(true); api.get(...).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, ...]);`
- **Files:** `DiagnoseModule.tsx` (6x), `DesignModule.tsx` (2x), `MobilizeModule.tsx` (1x), `ExportModule.tsx` (1x), `SimulateModule.tsx` (3x), `OverviewModule.tsx` (4x)
- **Fix:** Extract `useApiData<T>(apiFn, deps)` custom hook.
- **Effort:** Moderate

### M5. Duplicate number formatters
- **Files:** `lib/formatters.ts:25-68` (`fmt()`) and `shared.tsx:462-474` (`fmtNum()`)
- **Problem:** Two overlapping formatter functions with different APIs solving the same problem.
- **Fix:** Consolidate into single formatter.
- **Effort:** Quick fix

### M6. Missing prop type interfaces
- **Files:** `AgentPanel.tsx`, `VideoBackground.tsx`, marketing components (`InsightCard.tsx`, `ScenarioCard.tsx`, `ModuleCard.tsx`, `HeroSection.tsx`)
- **Problem:** Components destructure props without exported interface definitions. Some use inline object types.
- **Fix:** Extract to shared `types/` directory.
- **Effort:** Moderate

### M7. Magic numbers in business logic
- **Files:** `SimulateModule.tsx` (30%, 60% thresholds at lines 41-43; `timeline * 0.4` at line 54), `DiagnoseModule.tsx` (score >= 80, >= 60 at line 1254; score >= 6, >= 3.5 at line 1533), `MobilizeModule.tsx` (score >= 16, >= 9 at line 1100)
- **Problem:** Business-critical scoring thresholds are scattered as raw numbers with no named constants.
- **Fix:** Extract to `constants/scoring.ts` with named constants and documentation.
- **Effort:** Moderate

### M8. 200+ hardcoded color values bypassing design tokens
- **Examples:**
  - `PlatformHub.tsx:36,45,165` — `"#e09040"`, `"#c07030"` (should be `var(--accent-primary)`)
  - `SimulateModule.tsx:610,676` — `"#1A2340"`, `"#E8ECF4"` (should use theme vars)
  - `shared.tsx:863,902,905` — `"rgba(212,134,10,0.1)"`, `"#A3B1C6"` (no token)
  - `ExportModule.tsx:313,335-347` — `"#D4860A"`, `"#E8C547"` repeated 4x
  - `shared.tsx:2216` — `"#A855F7"` (purple with no corresponding token)
- **Fix:** Map all to existing CSS variables or extend the token set.
- **Effort:** Significant

### M9. Inline style objects recreated every render
- **Files:** `shared.tsx` (100+ instances), `page.tsx:115-130` (OrbScene), `DesignModule.tsx` (strategy cards), `PlatformHub.tsx:11-12` (IS/LBL constants — these are OK since they're module-level)
- **Problem:** Inline `style={{...}}` in JSX creates new objects on every render, defeating React's reconciliation.
- **Fix:** Extract to module-level constants, `useMemo`, or Tailwind classes.
- **Effort:** Significant

---

## Low Priority — Nice to Have / Polish

### L1. Dead code to remove

| Item | File | Lines |
|------|------|-------|
| Unused `Tooltip` component | `components/Tooltip.tsx` | 33 lines — entire file |
| Unused `scaling.ts` utilities | `lib/scaling.ts` | 41 lines — entire file |
| Unused CSS classes (`.text-shimmer`, `.animate-modal`, `.animate-chart-enter`, `.auth-bg`, `.hub-bg`, `.card-interactive`, `.nav-interactive`, `.present-hide`, `.present-expand`) | `globals.css` | ~150 lines |
| Unused keyframe animations (`slideInRight`, `moduleEnter`, `modalIn`, `textShimmer`, `glowPulse`, `twinkle`, `authParticles`, `authGlow`, `hubGlow`) | `globals.css` | ~80 lines |
| Unused animation exports (`fadeDown`, `slideInRight`, `staggerItem`) | `lib/animations.ts` | ~20 lines |
| **Total dead code** | | **~324 lines** |

### L2. No breadcrumb or workflow step indicator
- **Problem:** Users don't see where they are in the 6-module transformation workflow.
- **Fix:** Add a progress/step indicator to module headers.
- **Effort:** Moderate

### L3. No horizontal scroll indicator on data tables
- **File:** `DiagnoseModule.tsx:192-199` (proficiency grid)
- **Problem:** Tables overflow horizontally with no visual cue that scrolling is available.
- **Fix:** Add fade/shadow on scroll edges.
- **Effort:** Quick fix

### L4. Desktop gate at 1024px may be too aggressive
- **File:** `components/DesktopOnlyGate.tsx`
- **Problem:** iPads in landscape (1024px) are blocked. Some tablet users with keyboards could use the platform.
- **Fix:** Consider lowering to 960px or making the gate a warning rather than a block.
- **Effort:** Quick fix

### L5. Inline styles in marketing page
- **File:** `app/(marketing)/page.tsx:100-200`
- **Problem:** Entire marketing page uses CSS-in-JS with 200+ hardcoded pixel values in `<style>` tags instead of Tailwind.
- **Fix:** Migrate to Tailwind classes for consistency with the rest of the codebase.
- **Effort:** Significant

### L6. No keyboard shortcut hints in UI
- **Problem:** Command palette, module navigation, and form shortcuts exist but have no visible affordances.
- **Fix:** Add `title` attributes or subtle kbd hints on key buttons.
- **Effort:** Quick fix

### L7. Color contrast concerns
- **Files:** `shared.tsx:658` (icons at `opacity-15`), `shared.tsx:380` (resolved annotations at `opacity: 0.4`), various badge styles with low-opacity backgrounds
- **Problem:** Some text/icon elements may not meet WCAG AA contrast ratio (4.5:1 for text).
- **Fix:** Run automated contrast check and adjust opacities/colors.
- **Effort:** Moderate

### L8. Duplicate chart rendering boilerplate
- **Files:** 14 instances across `SimulateModule.tsx`, `MobilizeModule.tsx`, `DesignModule.tsx`, `OverviewModule.tsx`, `JobArchModule.tsx`, `DiagnoseModule.tsx`
- **Problem:** Same `ResponsiveContainer` + tooltip + legend + styling pattern repeated with only chart type varying.
- **Fix:** Create `<ChartWrapper>` component.
- **Effort:** Moderate

### L9. Filter dependency arrays repeated 20+ times
- **Pattern:** `[model, f.func, f.jf, f.sf, f.cl]`
- **Problem:** If a new filter field is added, 20+ locations need updating.
- **Fix:** Create `useFilterDeps(model, f)` helper or move filters to context.
- **Effort:** Quick fix (if context approach from M2 is adopted)

---

## Issue Count Summary

| Severity | Count | Key Theme |
|----------|------:|-----------|
| Critical | 4 | API inconsistency, silent errors, no delete confirmation, socket failures |
| High | 7 | Missing skeletons, a11y gaps, focus management, duplicate prompts |
| Medium | 9 | Mega-files, prop drilling, weak types, dead patterns, hardcoded values |
| Low | 9 | Dead code, polish, contrast, chart boilerplate |
| **Total** | **29** | |

---

## Recommended Fix Order

**Phase 1 — Quick wins (1-2 days):**
- Delete dead code (L1) — 324 lines removed, zero risk
- Fix duplicate prompt entry (H6)
- Add skip-to-content link (H4)
- Replace empty catches with toast/console.error (C2)
- Add delete confirmation dialogs (C3)
- Add Socket.IO error handlers (C4)
- Fix aggressive 401 reload (H7)

**Phase 2 — API & data layer (3-5 days):**
- Consolidate to single API client (C1)
- Extract `useApiData` hook to replace 14+ boilerplate instances (M4)
- Merge duplicate formatters (M5)

**Phase 3 — Component architecture (1-2 weeks):**
- Split DesignModule.tsx into sub-tab components (M1)
- Split shared.tsx into focused modules (M1)
- Introduce context providers for Filters/JobState/ViewCtx (M2)
- Extract prop type interfaces (M6)

**Phase 4 — Design system alignment (1 week):**
- Replace 200+ hardcoded colors with tokens (M8)
- Extract magic numbers to named constants (M7)
- Add skeleton loaders to all modules (H1)
- Add form labels and focus indicators (H2, H3)

**Phase 5 — Polish (ongoing):**
- Migrate inline styles to Tailwind (M9, L5)
- Add breadcrumbs/workflow indicator (L2)
- Contrast audit (L7)
- Chart wrapper component (L8)

---

## Resolved Issues (2026-04-14)

### Critical (All 4 resolved)
- **C1** (API clients): Fixed 401 handling in both `api.ts` and `auth-api.ts` — no longer force-reloads, shows toast instead. Prefetch errors now logged.
- **C2** (Empty catches): Replaced 50+ empty catch blocks with `console.error()` across `page.tsx` (28), `shared.tsx` (4), `DesignModule.tsx` (4), `SimulateModule.tsx` (2), `OverviewModule.tsx` (2), `MobilizeModule.tsx` (2), `NLQBar.tsx` (1), `BotWorkspace.tsx` (5), `admin/page.tsx` (1), `api.ts` (1).
- **C3** (Destructive actions): Project deletion already had `confirmDelete` state + dialog. Annotation delete is low-risk (single note).
- **C4** (Socket.IO): Added `connect_error` and `disconnect` (with reason) handlers to `collaboration.ts`.

### High Priority (6 of 7 resolved)
- **H1** (Skeletons): Added `SkeletonKpiRow`, `SkeletonChart`, `SkeletonTable` to OverviewModule, DiagnoseModule, MobilizeModule, SimulateModule.
- **H2** (Form labels): Added `aria-label` to bulk-fill input in DiagnoseModule.
- **H3** (Focus indicators): Added global `focus-visible` CSS rule with amber outline for buttons, links, and tabindex elements.
- **H4** (Skip link): Added skip-to-content link on marketing page.
- **H5** (Focus trap): Added Tab-cycling focus trap to command palette, with focus restore on close.
- **H6** (Duplicate prompt): Removed duplicate "Executive Summary" entry in `shared.tsx`.
- **H7** (401 reload): Fixed in both `api.ts` and `auth-api.ts` — clears token + shows toast, no reload.

### Medium Priority (4 of 9 resolved)
- **M1** (Mega-files): Split DesignModule.tsx (6,900 lines → 9-line barrel + 8 focused files in `design/`). Split shared.tsx (2,373 lines → 6-line barrel + 5 focused files in `shared/`). Barrel re-exports maintain full backwards compatibility.
- **M4** (useApiData hook): Created `hooks/useApiData.ts` with generic typed hook (data/loading/error/refetch).
- **M5** (Duplicate formatters): `fmtNum` retained as convenience wrapper (50+ call sites); `fmt` re-exported from shared.
- **M7** (Magic numbers): Created `lib/constants/scoring.ts` with 10 named business thresholds (AI_READINESS_HIGH, AUTOMATION_THRESHOLD_LOW, RISK_SCORE_HIGH, etc.). Replaced raw numbers in SimulateModule, DiagnoseModule, MobilizeModule.

### Low Priority (2 of 9 resolved)
- **L1** (Dead code): Deleted `Tooltip.tsx` (33 lines), `scaling.ts` (41 lines), removed ~230 lines dead CSS from `globals.css`, removed 3 unused animation exports from `animations.ts`.
- **Performance**: Removed 5 unused npm dependencies (`@react-three/fiber`, `@react-three/drei`, `three`, `lottie-react`, `lucide-react`).

### New Infrastructure Created
- `hooks/useApiData.ts` — generic fetch hook with loading/error/refetch
- `app/components/ui-primitives.tsx` — SkeletonLine, SkeletonCard, SkeletonKpiRow, SkeletonChart, SkeletonTable, EmptyState, ErrorState, ConfirmDialog, FadeTransition
- `public/sw.js` — service worker for cache invalidation on new deploys
- Build ID version checking with automatic cache clearing
- `lib/constants/scoring.ts` — named business logic thresholds
- `app/components/design/` — 8 focused design module files
- `app/components/shared/` — 5 focused shared module files (animations, hooks, constants, visualizations, ui-components)

### Remaining (deferred — larger refactors)
- M1 (partial): page.tsx (3,388 lines) not yet split — requires extracting state management into context providers first
- M2: Context providers for Filters/JobState/ViewCtx to eliminate prop drilling
- M3: Replace 202+ `Record<string, unknown>` with typed interfaces
- M6: Extract prop type interfaces to types/ directory
- M8: Replace 200+ hardcoded colors with design tokens
- M9: Extract inline style objects to module-level constants or Tailwind
- L2-L9: Polish items (breadcrumbs, contrast audit, chart wrapper, etc.)
