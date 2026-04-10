# AI Transformation Platform

Enterprise consulting tool for organizational design, workforce analysis, AI opportunity assessment, and transformation planning. Built for an internal HR/People Analytics team.

## Architecture

- **Frontend:** Next.js 16 + React 19 (`frontend/`)
- **Backend:** FastAPI + Python (`backend/`)
- **Virtual env:** Root-level (`source venv/bin/activate`)
- **Persistence:** File-based JSON

## Run Commands

```bash
# Backend
cd backend && source ../venv/bin/activate && python3 main.py

# Frontend
cd frontend && npm run dev
```

## Core Principles

- **Deterministic rendering:** Every tab renders immediately with zero-state fallbacks. No full-page spinners. No blocking on null data.
- **Data/presentation separation:** Business logic lives in Python backend, UI is purely presentational.
- **Cohesive product behavior:** One selected job active everywhere, one filter set narrowing all views.
- **CORS:** Use Next.js proxy rewrites to backend — no direct cross-origin calls.
- **Error handling:** Never silently swallow errors. Use typed fallbacks instead.

## UI Structure

Six-module tab layout:
1. **Overview** — Landing/project hub
2. **Diagnose** — Current state assessment
3. **Design** — Work design lab (Job Context → Deconstruction → Reconstruction → Redeployment → Impact → Org Link)
4. **Simulate** — Impact modeling
5. **Mobilize** — Change management roadmap
6. **Export** — Deliverable generation

## Design System

- **Fonts:** Outfit (headings), IBM Plex Mono (data/code)
- **Palette:** Warm amber, terracotta, golden tones
- **Components:** PillSelector options use broad type definitions (not narrow string literals)

## Domain Vocabulary

Key terms used throughout the codebase:
- Work design lab, deconstruction/reconstruction/redeployment workflow
- AI impact scoring, task portfolio, capacity waterfall
- Skill shift matrix, role evolution classification
- Span of control, career architecture, FTE equivalent
- Workstream breakdown, six-pillar operating model maturity
- Change management roadmap

## Backend API

- 20+ FastAPI endpoints exposing all Python business logic
- TypeScript API client in frontend mirrors backend endpoints
- Cascading filter logic driven by global job selector in sidebar

## Git Conventions

- Commit messages: descriptive, imperative mood
- Keep frontend and backend changes in separate commits when possible

## Common Pitfalls

- If the main content area shows a permanent loading spinner: check Next.js proxy rewrites, check for silent error-swallowing in API calls, ensure tabs render with zero-state fallbacks
- PillSelector type errors: ensure option types are broadly defined, not narrow string literals
- Always test both `npm run dev` and `python3 main.py` after changes that touch the API boundary
