# AI Transformation Platform

Enterprise consulting tool for workforce transformation — from diagnosis to deployment. Helps organizations navigate AI transformation through workforce analysis, job architecture design, role redesign, impact simulation, and change management planning.

Built for internal HR/People Analytics teams and management consultants.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19, Tailwind CSS, Recharts |
| Backend | FastAPI + Python, Pandas, SQLAlchemy |
| AI | Google Gemini 2.5 Flash (free tier, 1000 req/day) |
| Auth | JWT + bcrypt, SQLite (local) / PostgreSQL (production) |
| Fonts | Outfit (headings), IBM Plex Mono (data), DM Sans (body) |

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Install dependencies

```bash
# Backend
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your Gemini API key. Get a free key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### 3. Run locally

```bash
# Terminal 1 — Backend (port 8000)
cd backend
source ../venv/bin/activate
python3 main.py

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Login

Default account: `hiral` / `Montreal1980!`

Or create a new account via the registration form. The platform ships with a 562-employee demo dataset that loads automatically.

## Environment Variables

See `backend/.env.example` for the full list.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | For AI features | — | Google Gemini API key |
| `DATABASE_URL` | No | `sqlite:///./app.db` | Database connection |
| `JWT_SECRET` | No | Auto-generated | JWT signing secret |
| `BACKEND_URL` | No | `http://localhost:8000` | Backend URL for Next.js proxy |

## Architecture

### Backend (FastAPI — 13 router files, 65 API endpoints)

```
backend/app/
  main.py              App factory — health, upload, templates
  auth.py              JWT auth, user/project DB models
  store.py             DataStore — ingestion, filtering, analytics
  shared.py            Shared utilities (_safe, _j, _f)
  models.py            Pydantic models + upload validation
  om_taxonomy.py       Operating Model taxonomy (78 universal + 287 industry units)
  routes_overview.py   Filters, job options, overview
  routes_diagnose.py   AI priority, skills, org diagnostics, heatmap, clusters
  routes_design.py     Job context, deconstruction, reconstruction, OM taxonomy
  routes_simulate.py   Scenarios, readiness
  routes_mobilize.py   Roadmap, risk
  routes_export.py     Dataset listing and download
  routes_export_ext.py Extended exports (docx, templates)
  routes_analytics.py  Skills, BBBA, headcount, readiness, managers
  routes_ai.py         Gemini proxy with rate limiting (20/user/day)
  routes_tutorial.py   Tutorial sandbox (24 companies, 8 industries)
  routes_job_arch.py   Job architecture hierarchy + validation
  routes_auth.py       Login, register, profile, projects
```

### Frontend (Next.js — 12 component files)

```
frontend/app/
  page.tsx             App root — auth, routing, sidebar, decision log
  components/
    shared.tsx         40+ shared components and hooks
    OverviewModule.tsx Landing, Snapshot, Skill Shift Index
    DiagnoseModule.tsx AI Scan, Skills, Readiness, Heatmap, Clusters, Recommendations
    DesignModule.tsx   Work Design Lab, Org Studio, OM Configurator
    SimulateModule.tsx Impact Simulator — waterfall, FTE, scenarios, ROI
    MobilizeModule.tsx Change Planner, Story Builder, Archetypes
    ExportModule.tsx   Report Generator, Executive Summary
    JobArchModule.tsx  Job Architecture catalogue + validation
    PlatformHub.tsx    Account, About, KB, Use Cases, Tutorials
    KnowledgeBase.tsx  5W1H knowledge system (24 entries)
  lib/
    api.ts             API client (50+ endpoints)
    auth-api.ts        Auth client with session management
    workspace.ts       Workspace state controller
```

## Modules

### Discover Phase
| Module | Description |
|--------|-------------|
| Workforce Snapshot | Baseline headcount, roles, functions, readiness |
| Job Architecture | Catalogue, hierarchy tree, calibration, career paths |
| Org Health Scorecard | Benchmarked metrics (span, layers, ratio) |
| AI Opportunity Scan | Task-level automation scoring |
| AI Impact Heatmap | Function x family automation matrix |
| Role Clustering | Task overlap analysis for consolidation |
| Skill Shift Index | Declining, amplified, and net-new skills |
| AI Readiness | 5-dimension readiness assessment |
| Manager Capability | Champion/developing/flight-risk segmentation |
| AI Recommendations | Gemini-powered ranked recommendations |

### Design Phase
| Module | Description |
|--------|-------------|
| Skills & Talent | Inventory, gap analysis, adjacency mapping |
| Work Design Lab | Task deconstruction, reconstruction, redeployment |
| BBBA | Build/Buy/Borrow/Automate sourcing strategy |
| Headcount Planning | Current-to-future workforce waterfall |
| Operating Model Lab | Industry taxonomy (14 industries), blueprints |
| Org Design Studio | Span, layers, cost, scenario modeling |

### Simulate Phase
| Module | Description |
|--------|-------------|
| Impact Simulator | Scenario presets + custom, capacity waterfall |
| FTE Impact Model | Headcount changes by function |
| Scenario Comparison | Save and compare with bar/radar charts |
| Investment & ROI | Cost model over 1/3/5 year horizons |

### Mobilize Phase
| Module | Description |
|--------|-------------|
| Change Planner | Phased roadmap with AI auto-build |
| Readiness Archetypes | 4 archetypes with engagement playbooks |
| Transformation Story | AI-generated executive narrative |
| Reskilling Pathways | Per-employee learning plans |
| Talent Marketplace | Internal matching by skill adjacency |

### Export
| Module | Description |
|--------|-------------|
| Export & Report | Word document, AI narrative, executive summary PDF |

## Sample Data

The platform ships with **Demo_Model**: 562 employees across 5 functions (Technology, Product, Finance, HR, Sales & Marketing), 58 unique roles, 10 jobs with 100 fully decomposed tasks, compensation data, and change management initiatives.

The **Sandbox** offers 24 pre-built organizations across 8 industries x 3 sizes (small/mid/large) with a 27-step guided tutorial.

## Deploy to Railway

### Backend
- New Project > GitHub Repo > Root Directory: `backend`
- Add environment variables from `.env.example`
- Generate domain

### Frontend
- Same project > New Service > Root Directory: `frontend`
- Add variable: `BACKEND_URL` = your backend domain
- Generate domain

## License

Internal tool.
