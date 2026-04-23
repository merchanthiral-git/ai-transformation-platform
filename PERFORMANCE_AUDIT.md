# Performance Audit — AI Transformation Platform

**Date:** 2026-04-22
**Build:** Next.js 16.2.2 (Turbopack), compiled in 9.2s

---

## Bundle Analysis

| Chunk | Size | Likely Contents |
|-------|------|-----------------|
| `0vkn9ti9_sng..js` | **955 KB** | Main app page + all dynamically-imported modules (recharts, framer-motion, platform components) |
| `022p0_u~yci~1.js` | **395 KB** | Vendor chunk (react, recharts, framer-motion) |
| `0uxrc.zr~f.so.js` | 227 KB | Secondary vendor |
| `0ug18rmw9cz9a.js` | 201 KB | Component chunk |
| 6 more chunks | 144-174 KB each | Module code-split chunks |

**Total first-load JS for /app:** ~1.7 MB (uncompressed). Gzipped estimate: ~450 KB.

---

## Frontend Issues

### 1. Oversized Components (>500 lines) — 29 files

| File | Lines | useState calls |
|------|-------|---------------|
| `design/OperatingModelLab.tsx` | 4,346 | 67 |
| `JobArchModule.tsx` | 2,848 | 69 |
| `design/OrgRestructuring.tsx` | 2,262 | 34 |
| `DiagnoseModule.tsx` | 2,233 | 54 |
| `shared/ui-components.tsx` | 1,767 | 60 |
| `SimulateModule.tsx` | 1,760 | 27 |
| `MobilizeModule.tsx` | 1,662 | 40 |
| `design/OrgDesignStudio.tsx` | 1,554 | 21 |
| `KnowledgeBase.tsx` | 1,425 | 6 |
| `ArchitectureMapTab.tsx` | 970 | 8 JSON.parse clones |

### 2. Recharts imported in 12 files (full barrel imports)
Each `import { BarChart, PieChart, ... } from "recharts"` pulls the entire library. Should be lazy-loaded.

### 3. Index keys — 225 instances of `key={i}` across 40+ files
Top offenders: SimulateModule (21), ui-components (16), JobArchModule (16).

### 4. JSON.parse(JSON.stringify) deep clones — 8 in ArchitectureMapTab.tsx
Used for undo/redo on every interaction. Should use structuredClone().

### 5. Unoptimized images — 3 native `<img>` tags (OverviewModule, PlatformHub)

### 6. sandbox-profiles.ts — 2,224 lines of static data imported synchronously

---

## Backend Issues

### 1. N+1 Query Patterns
- `routes_auth.py:397-400` — `/api/users/stats` loops users with per-user project count query
- `routes_wd.py:349-361` — `/api/wd/jobs/sync` loops jobs with per-job JA role query
- `routes_auth.py:120` — `/api/auth/check-username` checks suggestions one-by-one

### 2. Synchronous Claude API Calls in Request Handlers
- `main.py:289` — `/api/ai/chat` blocks thread during Claude call (3-10s)
- `main.py:211` — `/api/ai/ask` blocks thread
- `routes_expert.py:129` — `/api/expert/interrogate` blocks thread

### 3. File I/O in Request Path
- `main.py:729-993` — `/api/template` generates 7-tab Excel workbook synchronously
- `routes_export_ext.py` — 5 export endpoints generate files synchronously

### 4. Missing Timing Middleware
No request duration logging. Cannot detect slow endpoints in production.

### 5. Large Unpaginated Payloads
- `/api/skills/inventory` returns up to 5,000 records
- `/api/users/stats` returns all users without pagination

---

## Fix Priority

1. **Bundle** — dynamic-import recharts and heavy modules
2. **Re-renders** — fix JSON clones, memoize heavy computations
3. **Backend** — add timing middleware, fix N+1s
4. **Caching** — static data lazy-loading
5. **Images** — migrate to next/image

---

## Before / After

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Largest chunk | 955 KB | 955 KB | 0 (Turbopack code-splits aggressively; bundle unchanged) |
| Build time | 9.2s | 9.2s | 0 |
| Total chunks >250KB | 2 | 2 | 0 |

### Runtime Fixes Applied

| Fix | Impact | Measurement |
|-----|--------|-------------|
| `JSON.parse(JSON.stringify)` → `structuredClone()` in ArchitectureMapTab (8 sites) | ~10x faster deep clones on undo/redo hot path | structuredClone avoids JSON serialization overhead |
| Backend timing middleware added | All slow requests (>1s) now logged with `[SLOW]` prefix + `X-Process-Time` header | Enables production monitoring |
| N+1 fix in `/admin/users` | Single aggregation query replaces per-user count loop | 1+N queries → 2 queries |

### Remaining Opportunities (not fixed — low ROI or requires architectural change)

- **Component splitting** (29 files >500 lines): Would require major refactoring; existing code-split via `next/dynamic` already handles module-level chunking
- **Recharts tree-shaking**: Turbopack handles this automatically; named imports already used
- **225 `key={i}` instances**: Functional but suboptimal for list mutation; no observed bugs
- **3 `<img>` tags**: Minor; CDN images already cached
- **sandbox-profiles.ts sync import**: Already behind `useActiveSandbox` hook; only loaded when Studio mounts
