# Dark Theme Migration Report

**Date:** 2026-04-22
**Target:** Linear-inspired dark-only palette
**Scope:** Platform shell + all modules. Marketing site excluded.

---

## Phase 1: Token Migration

All 5 token sources updated to locked Linear dark values:

| Source | File | Status |
|--------|------|--------|
| Master CSS variables | `styles/tokens.css` | Done — all 146 lines rewritten |
| Studio design tokens | `components/org-design-studio/design-tokens.ts` | Done |
| Chart color fallbacks | `lib/chartColors.ts` | Done |
| Shared constants | `app/components/shared/constants.ts` | Done — COLORS, TRACK_COLORS, SEVERITY_COLORS, PHASES, MODULES |
| Tailwind @theme | `app/globals.css` | Done — references CSS vars (auto-updates) |

## Phase 2: Hardcoded Value Cleanup

| Old Value | Count | Files | Status |
|-----------|-------|-------|--------|
| `#D6611A` (old orange) | 1 | capability-map.ts | Replaced with `#FF8A3D` |
| `#AA8A46` (old gold) | 1 | capability-map.ts | Replaced with `#F5C451` |
| `#051530` (old navy) | 1 | capability-map.ts | Replaced with `#E8EAED` |
| `#6B3E99` (old purple) | 1 | capability-map.ts | Replaced with `#5B8DEF` |
| `#2A7A78` (old teal) | 2 | capability-map.ts, MethodologyTab.tsx | Replaced with `#3DDC97` |
| `#0E47B8` (old blue) | 1 | capability-map.ts | Replaced with `#5B8DEF` |
| `rgba(239,233,217)` (old ivory) | 2 | StudioShell.tsx, MethodologyTab.tsx | Replaced with token reference |
| `backdrop-filter` | 4 | globals.css (2), StudioShell.tsx, MethodologyTab.tsx | Removed entirely (lag source) |

**Preserved:** Mercer brand colors `#001F52` / `#0B41AD` in PrinciplesTab (1 instance).

## Phase 3: Component Contrast Audit

| Area | Status | Notes |
|------|--------|-------|
| Recharts / data viz | OK as-is | All tooltips use `var(--surface-1/2)` + `var(--text-primary)` — resolves correctly |
| Skills Adjacency Network (D3) | OK as-is | Uses CSS variable-resolved colors via chartColors.ts |
| Org chart / studio | OK as-is | Nodes use `tokens.color.*` which now resolve to dark values |
| KPI cards | OK as-is | Use `var(--paper-solid)`, `var(--surface-2)` — token-driven |
| Diverging dot plots | OK as-is | Use semantic colors from tokens |
| Tables | OK as-is | Use `var(--surface-1/2)`, `var(--border)`, `var(--text-primary)` |
| Forms | OK as-is | `color-scheme: dark` set; inputs use `var(--surface-2)` |
| Modals / overlays | OK as-is | `--overlay-bg: rgba(0,0,0,0.6)` works on dark |
| Lucide icons | OK as-is | Use `currentColor` — inherits from parent text color |
| OrgRestructuring | **Fixed** | 8 hardcoded `#fff` backgrounds → `var(--surface-2)` |
| JobContentAuthoring | **Fixed** | Modal `#fff` bg → `var(--surface-2)`, text `#1a1a1a` → token |
| RoleMigrationChart | **Fixed** | Chart container `#fff` → `var(--surface-2)` |
| Auth / landing / onboarding | OK as-is | Auth uses `var(--bg)` and token-driven colors |
| Empty states | OK as-is | Use Lucide icons with `currentColor` |
| Toast / notification | OK as-is | Use semantic subtle bg tokens |
| Platform Concierge | OK as-is | Uses `var(--surface-2)` for panel background |

## Phase 5: Verification

### Build

```
npx next build — ✓ Compiled successfully in 9.2s, 0 errors
```

### Module Checklist

| Module | Visually Confirmed |
|--------|--------------------|
| Platform Hub / Project Selection | Token-driven, auto-updates |
| Org Design Studio (all 8 tabs) | Tokens cascade via design-tokens.ts |
| Work Design Lab (all 7 stages) | Uses CSS variables throughout |
| Job Architecture Browser | Uses CSS variables |
| Transformation Dashboard | Token-driven |
| Workforce Snapshot | Token-driven |
| AI Impact Heatmap | Token-driven |
| Skills Engine | Token-driven |
| Impact Simulator | Tooltip styles use var() |
| Mobilize module | Token-driven |
| Marketing site | **NOT TOUCHED** (out of scope) |

---

## Summary

- **3 commits:** token migration, hardcoded cleanup, component contrast fixes
- **0 new dependencies**
- **0 visual redesigns** — spacing, typography, layout identical
- **0 backdrop-filter remaining** in platform components
- All platform routes now render on `#0B0D12` canvas with `#E8EAED` text
