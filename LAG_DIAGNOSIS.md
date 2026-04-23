# Lag Diagnosis — AI Transformation Platform

**Date:** 2026-04-22
**Conclusion:** The lag is caused by **three always-on paint/composite costs** that stack on every frame, plus a custom cursor that replaces the OS cursor with a JS-driven render loop. These run on every route, every frame, regardless of what module is open.

---

## Phase 1: Global Listeners and Animation Loops

### Always-Mounted Animation Loops (run every frame on every route)

| # | File | Line | What | Termination | Impact |
|---|------|------|------|-------------|--------|
| 1 | `app/components/ambient/CustomCursor.tsx` | 67 | **`requestAnimationFrame(animateRing)`** — lerps ring position toward cursor with 0.18 easing | **None — runs until unmount** | HIGH: continuous rAF, every frame, on all non-touch devices |
| 2 | `app/components/vista/VistaProvider.tsx` | 85 | **`requestAnimationFrame(tick)`** — advances in-world hour, updates 11 CSS variables per frame | **None — runs until unmount** | HIGH: CSS variable writes trigger style recalc on every frame |

Both are mounted at `app/layout.tsx` (root layout) — they run on marketing, platform, auth, admin — everywhere.

### Always-Mounted Event Listeners

| # | File | Line | Listener | Scope |
|---|------|------|----------|-------|
| 1 | `CustomCursor.tsx` | 70 | `document.addEventListener('mousemove', handleMove, { passive: true })` | Document |
| 2 | `CustomCursor.tsx` | 71 | `document.addEventListener('mouseover', handleOver, { passive: true })` | Document |
| 3 | `CustomCursor.tsx` | 72 | `document.addEventListener('mouseout', handleOut, { passive: true })` | Document |
| 4 | `CustomCursor.tsx` | — | `window.matchMedia('(hover: none)').addEventListener('change')` | Window |

CustomCursor also injects global CSS that hides the native cursor:
```css
body:not(:has(.marketing-root)):not(:has(.auth-screen)) { cursor: none !important; }
```
This forces the browser to render the custom cursor's two fixed-position divs (z-index 99999/99998) instead of the OS cursor. The ring div runs a continuous rAF lerp loop.

### Vista Background Listeners (mounted when VistaSurface is used)

| # | File | Line | What |
|---|------|------|------|
| 5 | `vista/layers/Mountains.tsx` | 20 | `window.addEventListener('mousemove', handleMouseMove)` + rAF parallax loop |
| 6 | `vista/layers/Characters.tsx` | 63 | rAF movement loop for character animation |
| 7 | `vista/layers/Weather.tsx` | 120 | `setInterval(3000ms)` for lightning effects |
| 8 | `vista/layers/Stars.tsx` | 67 | `setInterval(1000ms)` for shooting star spawner |

### Intervals Always Running

| # | File | Interval | What | Scope |
|---|------|----------|------|-------|
| 1 | `app/layout.tsx` (inline) | 300,000ms (5 min) | Version check fetch | Root — every route |
| 2 | `app/(platform)/app/page.tsx` | 60,000ms | Auth keep-alive | Platform routes |
| 3 | `app/(platform)/app/page.tsx` | 30,000ms | Session expiry check | Platform routes |

### Other requestAnimationFrame Calls (scoped, non-continuous)

17 additional rAF calls exist in module components (AnimatedNumber, OrgChart, MusicPlayer visualizer, Tutorial counter, etc.). All have proper termination conditions or are scoped to specific interactions. Not a concern.

### Framer-Motion Layout Hooks

**None found.** The codebase uses `<motion.div>` and `<AnimatePresence>` but does NOT use `useMotionValue`, `useScroll`, `useTransform`, or `useSpring` at layout level.

---

## Phase 2: Paint-Heavy CSS

### Critical — Full-Viewport Compositing Layers

| # | Selector | File:Line | What | Scope | Severity |
|---|----------|-----------|------|-------|----------|
| 1 | **`body::before`** | `globals.css:367` | **SVG feTurbulence fractal noise filter**, position:fixed, inset:0, opacity:0.45, z-index:1 | **ALL ROUTES** | **CRITICAL** |
| 2 | **VistaProvider CSS vars** | `VistaProvider.tsx:85` | Writes 11 CSS variables every rAF frame → triggers style recalc on descendants | **ALL ROUTES** | **HIGH** |
| 3 | **CustomCursor divs** | `CustomCursor.tsx` | Two `position:fixed` divs at z-index 99999/99998, updated every rAF frame via transform | **ALL ROUTES** (non-touch) | **HIGH** |

The `body::before` paper noise is the single biggest offender. It's an **inline SVG with an `<feTurbulence>` filter** rendered as a full-viewport fixed overlay at 45% opacity. Every paint on the page requires compositing this filter on top. This alone can drop frame rates by 20-40% on mid-range hardware.

### Backdrop-Filter Blur (expensive compositing)

| # | Selector | File:Line | Blur Radius | Scope |
|---|----------|-----------|-------------|-------|
| 1 | `.vista-surface .glass-card` | `globals.css:409` | 24px | Platform (vista mode) |
| 2 | `.vista-surface .kpi-glass` | `globals.css:425` | 16px | Platform (vista mode) |
| 3 | MusicPlayer collapsed bar | `MusicPlayer.tsx` (inline) | 20px | Platform (fixed position) |
| 4 | MusicPlayer expanded panel | `MusicPlayer.tsx` (inline) | 24px | Platform (fixed position) |
| 5 | Marketing navbar | `(marketing)/page.tsx:107` | 20px | Marketing only |
| 6 | PlatformHub cards (15+ instances) | `PlatformHub.tsx` | 8-16px | Hub page |
| 7 | ProjectHub cards | `ProjectHub.tsx` | 8-16px | Project selection |
| 8 | StudioShell top bar | `StudioShell.tsx:217` | 24px | Org Design Studio |

### Infinite CSS Animations (always consuming paint)

| # | Animation | File:Line | Duration | Scope |
|---|-----------|-----------|----------|-------|
| 1 | `meshDrift` | `globals.css:568` | 20s infinite | Atmospheric background (feature-dependent) |
| 2 | `shimmer` | `globals.css:196` | 1.5s infinite | Skeleton loading states |
| 3 | `nlqShimmer` | `globals.css:603` | 6s infinite | NLQ search bar placeholder |
| 4 | `studioPulse` | `StudioShell.tsx` | 2s infinite | Engagement chip dot |
| 5 | Landing logo (4 concurrent) | `(marketing)/page.tsx:111-118` | 1.6-12s infinite | Marketing only |

### Box-Shadow on Large Elements

Shadows on fixed-position or full-width elements: DrilldownDrawer (`--shadow-4`), version banner (`0 8px 32px`), MusicPlayer. These force compositing on hover transitions.

### will-change

**None declared.** This is actually a problem — CustomCursor's two fixed divs should have `will-change: transform` to get their own compositing layer and avoid repainting the page beneath them.

---

## Phase 3: Layout Shell Component Tree

```
app/layout.tsx (ROOT — always mounted)
├─ <head>
│   ├─ Inline script: theme restoration
│   ├─ Inline script: screen size detection + resize listener
│   ├─ Inline script: chunk error recovery + error/load listeners
│   ├─ Inline script: service worker registration
│   ├─ Inline script: build ID cache manager
│   └─ Inline script: version poller (setInterval 300s)
├─ Font loading: Inter Tight (immediate), Fraunces (immediate), JetBrains Mono (deferred)
├─ VistaProvider ← CONTINUOUS rAF LOOP (time engine + 11 CSS var writes/frame)
├─ CustomCursor ← CONTINUOUS rAF LOOP + 3 document listeners + 2 fixed divs at z-99999
└─ {children}
    ├─ (marketing)/layout.tsx: simple div, no providers
    └─ (platform)/layout.tsx:
        ├─ AnimatedBgProvider (context, network detection — lightweight)
        ├─ AnalyticsInit (null render, one-time side effect)
        ├─ DensityProvider (context + data-density attr — lightweight)
        ├─ AmbientProvider (context + data-ambient attr — lightweight)
        ├─ DesktopOnlyGate (resize listener — lightweight)
        └─ {children} → page.tsx with dynamic module imports
```

### What's always running, everywhere:
1. **VistaProvider rAF loop** — advances time, writes CSS variables every frame
2. **CustomCursor rAF loop** — animates ring position every frame
3. **CustomCursor mousemove/mouseover/mouseout** — 3 document-level listeners
4. **body::before SVG noise** — composited over every pixel, every paint
5. **Version poller** — fetches `/api/version` every 5 minutes (negligible)

### Was anything marketing-only but leaking into platform?

**No functional leakage detected.** CustomCursor correctly excludes `.marketing-root` and `.auth-screen` via CSS. Marketing page IntersectionObservers and scroll listeners clean up on unmount. Vista background layers only mount inside `<VistaSurface>`.

However: `body::before` (paper noise) is **global** — it was added to globals.css for the Studio elevation but it applies to marketing, auth, and admin pages too. This wasn't intentional for those routes.

---

## Phase 4: Bundle Check

### Build Output
- **Compiler:** Turbopack (Next.js 16.2.2)
- **Build time:** 9.2s
- **Total static output:** 4.8 MB

### Chunk Sizes (shared across routes)

| Chunk | Size | Notes |
|-------|------|-------|
| `0vkn9ti9_sng..js` | **955 KB** | Largest — likely contains platform page + all dynamic imports |
| `022p0_u~yci~1.js` | **395 KB** | Vendor chunk (react, recharts, framer-motion) |
| `0uxrc.zr~f.so.js` | 227 KB | Secondary vendor |
| `0ug18rmw9cz9a.js` | 201 KB | Component chunk |
| 6 more | 144–174 KB | Module-level code-split chunks |

### Dependencies Over 100KB (installed, not necessarily in shared chunk)

| Package | Installed Size | In shared chunk? |
|---------|---------------|-------------------|
| lucide-react | 38 MB | Partial (tree-shaken to used icons) |
| posthog-js | 36 MB | Likely in shared chunk |
| framer-motion | 5.5 MB | Partial (used in AnimatePresence, motion.div) |
| recharts | 5.2 MB | Code-split to module chunks |

Turbopack handles tree-shaking and code-splitting automatically. The 955KB chunk is large but likely not shared across all routes — Turbopack creates route-specific entry points. The main concern is not bundle size but **runtime paint cost**.

---

## Root Cause Summary

The platform feels laggy because three always-on costs compound on every frame:

1. **`body::before` SVG feTurbulence noise overlay** (globals.css:367) — a fractal noise SVG filter composited over the entire viewport on every paint. This is the single biggest cost. SVG filters are not GPU-accelerated on most browsers and force the compositor to re-rasterize a full-viewport layer.

2. **Two continuous `requestAnimationFrame` loops** running in root layout:
   - CustomCursor ring animation (lerps every frame)
   - VistaProvider time engine (writes 11 CSS variables every frame → triggers style recalc)

3. **CustomCursor replaces the OS cursor** with `cursor: none !important` on the body, then renders two fixed-position divs at z-index 99999. The native cursor is zero-cost (handled by the window manager outside the browser's render pipeline). The JS cursor adds per-frame transform updates on two composited layers.

These three costs are **additive** — they stack. A mousemove event triggers: (a) CustomCursor state update + rAF → (b) ring div transform update → (c) compositing both cursor divs → (d) compositing the body::before noise layer on top of everything.

### Recommended Fix Priority

1. **Remove or conditionally gate `body::before` noise overlay** — biggest single win
2. **Gate VistaProvider rAF to only run when speed > 0** — if time isn't advancing, don't tick
3. **Make CustomCursor opt-in** — default to native cursor; let users enable the custom cursor
4. **Add `will-change: transform` to CustomCursor divs** — if keeping them, at least get a GPU layer
5. **Reduce backdrop-filter blur radii** from 20-24px to 8-12px on fixed elements
