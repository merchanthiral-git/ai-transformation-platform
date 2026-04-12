"""AI Transformation Platform — FastAPI Backend v4.0
Modular architecture: core routes in separate router files,
extended analytics in main.py.
"""

import base64
import os
import sys
import traceback
from io import BytesIO
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app.store import (
    store, sync_work_design, build_reconstruction, build_ai_priority_scores,
    build_skill_analysis, build_deconstruction_summary, build_workstream_breakdown,
    build_task_portfolio, build_reconstruction_rollup, build_redeployment_detail,
    build_skill_shift_matrix, build_transformation_insights,
    build_transformation_recommendations, build_work_dimensions,
    build_value_model, build_role_evolution, build_capacity_waterfall_data,
    build_auto_change_plan, compute_readiness_score, get_manager_candidates,
    enrich_work_design_defaults, build_operating_model_analysis,
)
from app.helpers import get_series, safe_value_counts, dataframe_to_excel_bytes, empty_bundle
from app.shared import _safe, _j, _f, _job_list_for_model
from app.models import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB

# ── Router imports ──
from app.routes_auth import auth_router, project_router
from app.routes_overview import router as overview_router
from app.routes_diagnose import router as diagnose_router
from app.routes_design import router as design_router
from app.routes_simulate import router as simulate_router
from app.routes_mobilize import router as mobilize_router
from app.routes_export import router as export_router
from app.routes_job_arch import router as job_arch_router
from app.routes_ai import router as ai_router
from app.routes_analytics import router as analytics_router
from app.routes_tutorial import router as tutorial_router
from app.routes_export_ext import router as export_ext_router

app = FastAPI(title="AI Transformation Platform API", version="4.0")

# ── Dev error handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"[500 ERROR] {request.method} {request.url}\n{tb}", flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ── Mount all routers ──
app.include_router(auth_router)
app.include_router(project_router)
app.include_router(overview_router)
app.include_router(diagnose_router)
app.include_router(design_router)
app.include_router(simulate_router)
app.include_router(mobilize_router)
app.include_router(export_router)
app.include_router(job_arch_router)
app.include_router(ai_router)
app.include_router(analytics_router)
app.include_router(tutorial_router)
app.include_router(export_ext_router)

# Agent system
from app.routes_agents import router as agents_router
app.include_router(agents_router)

# AI Provider abstraction
from app.ai_providers import call_ai_sync, get_ai_status, anthropic_client

@app.post("/api/ai/ask")
def ask_ai_endpoint(request: dict):
    """Unified AI endpoint — routes to Claude or Gemini based on task type"""
    prompt = request.get("prompt", "")
    task_type = request.get("task_type", "general")
    system = request.get("system", None)
    if not prompt:
        return {"error": "No prompt provided"}
    try:
        response, provider = call_ai_sync(prompt, task_type, system)
        return {"response": response, "provider": provider}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/ai/providers")
def ai_providers_status():
    """Return status of all AI providers"""
    return get_ai_status()



@app.get("/api/health")
def health_check():
    """Quick health check — returns version info and DB status."""
    import sys
    db_ok = False
    db_error = None
    try:
        from app.auth import get_db, UserDB
        db = next(get_db())
        db.query(UserDB).count()
        db_ok = True
    except Exception as e:
        db_error = str(e)
    return {
        "status": "ok" if db_ok else "degraded",
        "python": sys.version,
        "db": "connected" if db_ok else f"ERROR: {db_error}",
        "db_type": "postgresql" if "postgresql" in (os.environ.get("DATABASE_URL", "") or "") else "sqlite",
    }

# ═══════════════════════════════════════════════════════════════════════
# MODELS / UPLOAD / RESET (kept in main.py — core app lifecycle)
# ═══════════════════════════════════════════════════════════════════════


@app.get("/api/models")
def list_models():
    try:
        models = store.get_model_ids()
        return _safe({"models": models, "last_loaded": store.last_loaded_model_id})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    # Validate files
    for f in files:
        ext = Path(f.filename).suffix.lower() if f.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    file_data = []
    for f in files:
        content = await f.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(400, f"File '{f.filename}' exceeds {MAX_FILE_SIZE_MB}MB limit")
        file_data.append((f.filename, content))
    s = store.process_uploads(file_data)
    active_model = store.last_loaded_model_id or ""
    return _safe({
        "sheets_loaded": len(s),
        "summary": _j(s),
        "active_model": active_model,
        "jobs": _job_list_for_model(store, active_model),
        "models": store.get_model_ids(),
    })


@app.post("/api/reset")
def reset_data():
    store.reset()
    return {"ok": True}


@app.get("/api/template")
def download_template():
    """Generate a multi-tab Excel template with schemas, example data, dropdowns, and Op Model guidance."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    NAVY, BLUE, TEAL, GREEN, AMBER = "0B1120", "3B82F6", "0891B2", "059669", "D97706"
    WHITE, LTBLUE, LGRAY, MGRAY, DKGRAY = "FFFFFF", "DBEAFE", "F1F5F9", "E2E8F0", "64748B"
    hdr_font = Font(name="Arial", bold=True, color=WHITE, size=10)
    hdr_fill = PatternFill("solid", fgColor=NAVY)
    req_fill = PatternFill("solid", fgColor=LTBLUE)
    opt_fill = PatternFill("solid", fgColor=LGRAY)
    hint_font = Font(name="Arial", italic=True, color=DKGRAY, size=9)
    ex_font = Font(name="Arial", color="8892A8", size=9)
    ex_fill = PatternFill("solid", fgColor="F1F5F9")
    title_font = Font(name="Arial", bold=True, size=14, color=NAVY)
    subtitle_font = Font(name="Arial", size=10, color=DKGRAY)
    guide_title = Font(name="Arial", bold=True, size=12, color=TEAL)
    guide_label = Font(name="Arial", bold=True, size=10, color=NAVY)
    guide_font = Font(name="Arial", size=9, color=DKGRAY)
    thin_border = Border(left=Side(style="thin", color=MGRAY), right=Side(style="thin", color=MGRAY),
                         top=Side(style="thin", color=MGRAY), bottom=Side(style="thin", color=MGRAY))
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    wrap = Alignment(vertical="top", wrap_text=True)

    # ── Tab definitions: columns + example row ──
    TABS = {
        "1. Workforce": {
            "desc": "Employee roster — org hierarchy, comp, classification. Powers: Overview, Org Diagnostics, Filters. ★★★",
            "color": BLUE,
            "columns": [
                ("Model ID", True, "Your org/company name"), ("Employee ID", True, "Unique employee ID"), ("Employee Name", True, "Full name"),
                ("Manager ID", False, "Manager's Employee ID"), ("Manager Name", False, "Manager's name"), ("Function ID", False, "Function (Finance, HR...)"),
                ("Job Family", False, "Job family group"), ("Sub-Family", False, "Sub-function"), ("Geography", False, "Country/Region"),
                ("Career Track", False, "Executive/Manager/IC/Analyst"), ("Career Level", False, "Grade code (L2, L5...)"), ("Job Title", False, "Current job title"),
                ("Job Description", False, "Role description"), ("Department", False, "Department name"), ("Org Unit", False, "Business unit"),
                ("FTE", False, "1.0 = full-time"), ("Base Pay", False, "Annual base salary"), ("Total Cash", False, "Total cash comp"),
                ("Hire Date", False, "YYYY-MM-DD"), ("Performance Rating", False, "Rating"), ("Critical Role", False, "Yes/No"),
            ],
            "example": ["Acme_Corp", "E001", "Jane Smith", "", "", "Finance", "Corporate Functions", "FP&A", "US",
                        "Analyst", "L2", "Financial Analyst", "Supports budgeting and reporting", "Finance", "Corporate",
                        1.0, 95000, 102000, "2022-03-15", "Exceeds", "No"],
        },
        "2. Work Design": {
            "desc": "Task-level breakdown per job. Each job's tasks MUST sum to 100% time. Powers: Design Lab, AI Prioritization, Scenarios. ★★★",
            "color": AMBER,
            "columns": [
                ("Model ID", True, "Same Model ID"), ("Function ID", False, "Function"), ("Job Family", False, "Family"), ("Sub-Family", False, "Sub-function"),
                ("Geography", False, "Region"), ("Career Track", False, "Track"), ("Career Level", False, "Level"),
                ("Job Title", True, "Must match Workforce title"), ("Job Description", False, "Role summary"),
                ("Workstream", False, "Workflow group"), ("Task ID", False, "Unique ID (e.g., FA-T1)"), ("Task Name", True, "Descriptive task name"),
                ("Description", False, "What the task involves"), ("AI Impact", False, "High/Moderate/Low"), ("Est Hours/Week", False, "Hours per week"),
                ("Current Time Spent %", False, "% of role time (sum to 100)"), ("Time Saved %", False, "% AI can save"),
                ("Task Type", False, "Repetitive/Variable"), ("Interaction", False, "Independent/Interactive/Collaborative"),
                ("Logic", False, "Deterministic/Probabilistic/Judgment-heavy"), ("Primary Skill", False, "Main skill"), ("Secondary Skill", False, "Supporting skill"),
            ],
            "example": ["Acme_Corp", "Finance", "Corporate Functions", "FP&A", "US", "Analyst", "L2",
                        "Financial Analyst", "Supports budgeting", "Reporting", "FA-T1", "Refresh Management Report Pack",
                        "Update monthly board reports", "High", 4, 10, 5,
                        "Repetitive", "Independent", "Deterministic", "Reporting", "Excel"],
        },
        "3. Operating Model": {
            "desc": "Capability map — layers, scope, hierarchy, ownership. Powers: Structure, Maturity, Decisions, Workflow. ★★★ See guidance below row 7.",
            "color": TEAL,
            "columns": [
                ("Model ID", True, "Same Model ID"), ("Scope", True, "Enterprise or function name (Finance, HR, Technology...)"),
                ("Layer", True, "Governance / Core Components / Shared Services / Enabling / Interface"),
                ("Level 1", False, "Capability area (e.g., Planning)"), ("Level 2", False, "Sub-capability (e.g., Forecasting)"),
                ("Level 3", False, "Process/activity"), ("Level 4", False, "Granular detail"),
                ("Description", False, "Describe — mention 'shared/central' or 'embedded/dedicated' for service model detection"),
                ("Owner", False, "CRITICAL: Capability owner title — enables Decision Rights analysis"),
                ("Function ID", False, "Owning function"), ("Job Family", False, "Related family"), ("Sub-Family", False, "Sub-family"),
                ("Geography", False, "Global / US / UK / India — drives Scope Distribution"), ("Career Track", False, "Track"), ("Career Level", False, "Level"),
            ],
            "example": ["Acme_Corp", "Finance", "Core Components", "Planning", "Forecasting", "Monthly Forecast", "Revenue Build",
                        "Monthly revenue forecasting process — embedded in Finance team", "Director, FP&A",
                        "Finance", "Corporate Functions", "FP&A", "US", "", ""],
        },
        "4. Org Design": {
            "desc": "Org hierarchy for span of control, layer analysis. Can overlap with Workforce. ★★☆",
            "color": GREEN,
            "columns": [
                ("Model ID", True, "Same Model ID"), ("Employee ID", True, "Unique ID"), ("Employee Name", True, "Full name"),
                ("Manager ID", False, "Manager's Employee ID"), ("Manager Name", False, "Manager name"), ("Function ID", False, "Function"),
                ("Job Family", False, "Family"), ("Sub-Family", False, "Sub-function"), ("Geography", False, "Region"),
                ("Career Track", False, "Track"), ("Career Level", False, "Level"), ("Job Title", False, "Title"),
                ("Job Description", False, "Description"), ("Department", False, "Department"), ("Org Unit", False, "Org unit"),
            ],
            "example": ["Acme_Corp", "E001", "Jane Smith", "", "", "Finance", "Corporate Functions", "Leadership",
                        "US", "Executive", "L10", "Chief Financial Officer", "Leads all finance", "Finance", "Enterprise"],
        },
        "5. Job Catalog": {
            "desc": "Standardized job architecture — families, levels, career paths. Powers: Career Architecture, Role Clusters. ★★☆",
            "color": "8B5CF6",
            "columns": [
                ("Model ID", True, "Same Model ID"), ("Job Code", False, "Internal code"), ("Job Title", True, "Standardized title"),
                ("Standard Title", False, "Benchmark title"), ("Function ID", False, "Function"), ("Job Family", False, "Family"),
                ("Sub-Family", False, "Sub-function"), ("Geography", False, "Region"), ("Career Track", False, "Track"),
                ("Career Level", False, "Level"), ("Manager or IC", False, "Manager/IC"), ("Job Description", False, "Description"),
                ("Skills", False, "Semicolon-separated skills"), ("Role Purpose", False, "One-line purpose"),
            ],
            "example": ["Acme_Corp", "FIN-ANL-L2", "Financial Analyst", "Financial Analyst", "Finance",
                        "Corporate Functions", "FP&A", "US", "Analyst", "L2", "IC",
                        "Supports budgeting and reporting", "Excel;Analysis;Reporting;PowerBI", "Provide financial insight and support."],
        },
        "6. Change Management": {
            "desc": "Transformation initiatives, RACI, roadmap milestones. Powers: Roadmap, Risk Analysis, Mobilize. ★★☆",
            "color": "E11D48",
            "columns": [
                ("Model ID", True, "Same Model ID"), ("Function ID", False, "Function"), ("Job Family", False, "Family"),
                ("Sub-Family", False, "Sub-function"), ("Geography", False, "Region"), ("Career Track", False, "Track"), ("Career Level", False, "Level"),
                ("Job Title", False, "Affected title"), ("Task Name", False, "Task being changed"), ("Responsible", False, "RACI: does the work"),
                ("Accountable", False, "RACI: approves"), ("Consulted", False, "RACI: consulted"), ("Informed", False, "RACI: informed"),
                ("Initiative", False, "Initiative name"), ("Owner", False, "Initiative owner"), ("Priority", False, "High/Medium/Low"),
                ("Status", False, "Planned/In Progress/Complete"), ("Wave", False, "Wave 1/Wave 2/etc"), ("Start", False, "YYYY-MM-DD"),
                ("End", False, "YYYY-MM-DD"), ("Milestone", False, "Milestone name"), ("Date", False, "Milestone date"),
                ("Risk", False, "Risk description"), ("Dependency", False, "Dependencies"), ("Notes", False, "Additional notes"),
            ],
            "example": ["Acme_Corp", "Finance", "Corporate Functions", "FP&A", "US", "Analyst", "L2",
                        "Financial Analyst", "Reporting Automation", "Analyst", "Director", "Finance Lead", "CFO",
                        "Reporting Automation", "CFO", "High", "Planned", "Wave 1", "2026-01-01", "2026-03-31",
                        "Kickoff", "2026-01-01", "Resistance to change", "IT resource availability", "Phase 1 pilot"],
        },
    }

    wb = Workbook()

    # ── Instructions tab ──
    ws = wb.active
    ws.title = "Instructions"
    ws.sheet_properties.tabColor = BLUE
    ws.column_dimensions["A"].width = 90
    ws.column_dimensions["B"].width = 40
    lines = [
        ("AI Transformation Platform — Data Template", title_font),
        ("", subtitle_font),
        ("This workbook has 8 tabs — one for each dataset the platform ingests.", guide_font),
        ("Fill as many as you can. The more data, the richer the analysis.", guide_font),
        ("", guide_font),
        ("HOW TO USE", guide_title),
        ("1. Use a consistent Model ID across ALL tabs (e.g., your company name).", guide_font),
        ("2. Row 2 = column headers. Row 3 = REQUIRED/Optional. Row 4 = field hints.", guide_font),
        ("3. Row 5 = example data (delete before uploading).", guide_font),
        ("4. Fill your data starting from Row 6.", guide_font),
        ("5. Blue header columns are REQUIRED. Dark columns are optional.", guide_font),
        ("6. Job Titles must match across Workforce, Work Design, and Job Catalog.", guide_font),
        ("7. Work Design tasks per job MUST sum to 100% Current Time Spent %.", guide_font),
        ("8. Save and upload via the Upload button in the platform.", guide_font),
        ("", guide_font),
        ("TAB PRIORITY", guide_title),
        ("★★★ Workforce, Work Design, Operating Model — critical for core analysis", guide_font),
        ("★★☆ Org Design, Job Catalog, Change Management — important for depth", guide_font),
        ("", guide_font),
        ("OPERATING MODEL — SPECIAL GUIDANCE", guide_title),
        ("The Operating Model tab is the most nuanced dataset. Key rules:", guide_font),
        ("• Each ROW = one capability, process, or organizational component.", guide_font),
        ("• SCOPE = which domain this belongs to (Enterprise, Finance, HR, Technology, Legal...).", guide_font),
        ("• LAYER = architectural tier: Governance, Core Components, Shared Services, Enabling, Interface.", guide_font),
        ("• LEVELS 1-4 = hierarchical breakdown (L1=Planning > L2=Forecasting > L3=Monthly Forecast).", guide_font),
        ("• OWNER = who owns the capability — CRITICAL for Decision Rights dashboard.", guide_font),
        ("• DESCRIPTION = mention 'shared' or 'embedded' so the platform can detect Service Model.", guide_font),
        ("• GEOGRAPHY = use 'Global' for enterprise-wide items. Drives Scope Distribution chart.", guide_font),
        ("• Aim for 15-30 rows per function and 3-5 Governance rows for meaningful analysis.", guide_font),
        ("• See the Operating Model tab (row 8+) for a detailed field-by-field guide.", guide_font),
    ]
    for ri, (text, font) in enumerate(lines, 1):
        c = ws.cell(row=ri, column=1, value=text)
        c.font = font

    # ── Data tabs ──
    for tab_name, td in TABS.items():
        cols = td["columns"]
        ex = td.get("example", [])
        ws = wb.create_sheet(title=tab_name)
        ws.sheet_properties.tabColor = td["color"]
        ws.merge_cells(f"A1:{get_column_letter(len(cols))}1")
        ws["A1"] = td["desc"]
        ws["A1"].font = subtitle_font
        ws["A1"].alignment = wrap
        ws.row_dimensions[1].height = 30
        # Row 2: headers
        for ci, (cn, req, _hint) in enumerate(cols, 1):
            c = ws.cell(row=2, column=ci, value=cn)
            c.font = hdr_font
            c.fill = PatternFill("solid", fgColor=BLUE) if req else hdr_fill
            c.alignment = center
            c.border = thin_border
        # Row 3: required/optional
        for ci, (cn, req, _) in enumerate(cols, 1):
            c = ws.cell(row=3, column=ci, value="REQUIRED" if req else "Optional")
            c.font = Font(name="Arial", bold=req, size=9, color=BLUE if req else DKGRAY)
            c.fill = req_fill if req else opt_fill
            c.alignment = center
            c.border = thin_border
        # Row 4: hints
        for ci, (_, _, hint) in enumerate(cols, 1):
            c = ws.cell(row=4, column=ci, value=hint)
            c.font = hint_font
            c.alignment = wrap
            c.border = thin_border
        ws.row_dimensions[4].height = 40
        # Row 5: example data
        for ci, val in enumerate(ex, 1):
            c = ws.cell(row=5, column=ci, value=val)
            c.font = ex_font
            c.fill = ex_fill
            c.border = thin_border
        # Empty rows 6-30
        for ri in range(6, 31):
            for ci in range(1, len(cols) + 1):
                c = ws.cell(row=ri, column=ci, value="")
                c.border = thin_border
                if ri % 2 == 0:
                    c.fill = PatternFill("solid", fgColor="F8FAFC")
        # Column widths
        for ci, (cn, _, _) in enumerate(cols, 1):
            ws.column_dimensions[get_column_letter(ci)].width = max(len(cn) + 5, 15)
        ws.freeze_panes = "A6"
        ws.auto_filter.ref = f"A2:{get_column_letter(len(cols))}2"
        # Dropdowns
        for ci, (cn, _, _) in enumerate(cols, 1):
            cl = get_column_letter(ci)
            dv = None
            if cn == "AI Impact": dv = DataValidation(type="list", formula1='"High,Moderate,Low"', allow_blank=True)
            elif cn == "Task Type": dv = DataValidation(type="list", formula1='"Repetitive,Variable"', allow_blank=True)
            elif cn == "Interaction": dv = DataValidation(type="list", formula1='"Independent,Interactive,Collaborative"', allow_blank=True)
            elif cn == "Logic": dv = DataValidation(type="list", formula1='"Deterministic,Probabilistic,Judgment-heavy"', allow_blank=True)
            elif cn == "Priority": dv = DataValidation(type="list", formula1='"High,Medium,Low"', allow_blank=True)
            elif cn == "Status": dv = DataValidation(type="list", formula1='"Planned,In Progress,Complete,On Hold"', allow_blank=True)
            elif cn == "Wave": dv = DataValidation(type="list", formula1='"Wave 1,Wave 2,Wave 3,Wave 4"', allow_blank=True)
            elif cn == "Manager or IC": dv = DataValidation(type="list", formula1='"Manager,IC"', allow_blank=True)
            elif cn == "Critical Role": dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
            elif cn == "Layer": dv = DataValidation(type="list", formula1='"Governance,Core Components,Shared Services,Enabling,Interface"', allow_blank=True)
            elif cn == "Performance Rating": dv = DataValidation(type="list", formula1='"Exceeds,Meets,Below,1,2,3,4,5"', allow_blank=True)
            if dv:
                dv.error = "Please select from the dropdown"
                ws.add_data_validation(dv)
                dv.add(f"{cl}6:{cl}500")

    # ── Operating Model tab: append guidance section below example ──
    ws_op = wb["3. Operating Model"]
    gr = 8  # start guidance after a gap row
    ws_op.cell(row=gr, column=1, value="OPERATING MODEL — FIELD-BY-FIELD GUIDE").font = guide_title
    ws_op.merge_cells(f"A{gr}:H{gr}")
    guidance = [
        ("Scope", "The domain this capability belongs to. Use 'Enterprise' for firm-wide governance.\nExamples: Enterprise, Finance, HR, Technology, Legal, Investments, Operations, Marketing."),
        ("Layer", "The architectural tier.\n• Governance = oversight bodies, committees, decision forums.\n• Core Components = primary capabilities that deliver the function's mission.\n• Shared Services = capabilities shared across business lines.\n• Enabling = infrastructure, platforms, tools.\n• Interface = touchpoints with the rest of the org (portals, dashboards)."),
        ("Level 1-4", "Hierarchical decomposition of the capability.\nL1 = Capability area (e.g., 'Planning').\nL2 = Sub-capability (e.g., 'Forecasting').\nL3 = Process (e.g., 'Monthly Revenue Forecast').\nL4 = Activity (e.g., 'Collect actuals from GL').\nNot all levels are required — use as many as your detail allows."),
        ("Description", "Free text describing the capability. IMPORTANT: If you mention 'shared', 'central', 'centralized', 'COE', or 'center of excellence', the platform tags it as Shared Service. If you mention 'embedded', 'dedicated', or 'local', it tags as Embedded. This drives the Service Model analysis."),
        ("Owner", "The role title who owns this capability. CRITICAL for Decision Rights.\nExamples: 'CFO', 'Director FP&A', 'CHRO', 'VP Engineering', 'Head of TA'.\nWithout Owner, the Decision Rights tab will show 'Unassigned'."),
        ("Geography", "Use 'Global' for enterprise-wide capabilities, or a specific region (US, UK, India, APAC) for local ones.\nDrives the Scope Distribution analysis (Global vs Local footprint)."),
        ("Best Practices", "• Aim for 15-30 rows per function for meaningful maturity and structure analysis.\n• Include 3-5 Governance rows (committees, forums) to power Decision Rights.\n• Mix Shared Services and Core Components rows for service model split analysis.\n• Fill Owner for every row — it's the #1 field that unlocks the Decisions dashboard.\n• Use consistent Function ID values that match your Workforce and Work Design tabs."),
    ]
    for i, (label, desc) in enumerate(guidance):
        r = gr + 1 + i
        ws_op.cell(row=r, column=1, value=label).font = guide_label
        ws_op.cell(row=r, column=2, value=desc).font = guide_font
        ws_op.cell(row=r, column=2).alignment = wrap
        ws_op.merge_cells(start_row=r, start_column=2, end_row=r, end_column=10)
        ws_op.row_dimensions[r].height = 60

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=AI_Transformation_Template.xlsx"})


# ── Per-module template download ──
MODULE_TAB_MAP = {
    "snapshot": "1. Workforce",
    "jobs": "5. Job Catalog",
    "scan": "2. Work Design",
    "design": "2. Work Design",
    "simulate": "2. Work Design",
    "build": "4. Org Design",
    "plan": "6. Change Management",
    "opmodel": "3. Operating Model",
}

@app.get("/api/template/{module_id}")
def download_module_template(module_id: str):
    """Download a single-tab Excel template for a specific module."""
    tab_name = MODULE_TAB_MAP.get(module_id)
    if not tab_name:
        raise HTTPException(status_code=404, detail=f"No template for module: {module_id}")

    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    NAVY, BLUE, TEAL, GREEN, AMBER = "0B1120", "3B82F6", "0891B2", "059669", "D97706"
    WHITE, LTBLUE, LGRAY, MGRAY, DKGRAY = "FFFFFF", "DBEAFE", "F1F5F9", "E2E8F0", "64748B"
    hdr_font = Font(name="Arial", bold=True, color=WHITE, size=10)
    hdr_fill = PatternFill("solid", fgColor=NAVY)
    req_fill = PatternFill("solid", fgColor=LTBLUE)
    opt_fill = PatternFill("solid", fgColor=LGRAY)
    hint_font = Font(name="Arial", italic=True, color=DKGRAY, size=9)
    ex_font = Font(name="Arial", color="8892A8", size=9)
    ex_fill = PatternFill("solid", fgColor="F1F5F9")
    subtitle_font = Font(name="Arial", size=10, color=DKGRAY)
    thin_border = Border(left=Side(style="thin", color=MGRAY), right=Side(style="thin", color=MGRAY),
                         top=Side(style="thin", color=MGRAY), bottom=Side(style="thin", color=MGRAY))
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    wrap = Alignment(vertical="top", wrap_text=True)

    # Reuse same tab definitions
    TABS = {
        "1. Workforce": {"desc":"Employee roster — powers Workforce Snapshot, Org Diagnostics, Filters.","color":BLUE,"columns":[("Model ID",True,"Your org/company name"),("Employee ID",True,"Unique employee ID"),("Employee Name",True,"Full name"),("Manager ID",False,"Manager's Employee ID"),("Manager Name",False,"Manager's name"),("Function ID",False,"Function (Finance, HR...)"),("Job Family",False,"Job family group"),("Sub-Family",False,"Sub-function"),("Geography",False,"Country/Region"),("Career Track",False,"Executive/Manager/IC/Analyst"),("Career Level",False,"Grade code"),("Job Title",False,"Current job title"),("Job Description",False,"Role description"),("Department",False,"Department name"),("Org Unit",False,"Business unit"),("FTE",False,"1.0 = full-time"),("Base Pay",False,"Annual base salary"),("Total Cash",False,"Total cash comp"),("Hire Date",False,"YYYY-MM-DD"),("Performance Rating",False,"Rating"),("Critical Role",False,"Yes/No")],"example":["Acme_Corp","E001","Jane Smith","","","Finance","Corporate Functions","FP&A","US","Analyst","L2","Financial Analyst","Supports budgeting","Finance","Corporate",1.0,95000,102000,"2022-03-15","Exceeds","No"]},
        "2. Work Design": {"desc":"Task-level breakdown per job. Each job's tasks MUST sum to 100% time. Powers: Design Lab, AI Scan, Simulator.","color":AMBER,"columns":[("Model ID",True,"Same Model ID"),("Function ID",False,"Function"),("Job Family",False,"Family"),("Sub-Family",False,"Sub-function"),("Geography",False,"Region"),("Career Track",False,"Track"),("Career Level",False,"Level"),("Job Title",True,"Must match Workforce title"),("Job Description",False,"Role summary"),("Workstream",False,"Workflow group"),("Task ID",False,"Unique ID"),("Task Name",True,"Descriptive task name"),("Description",False,"What the task involves"),("AI Impact",False,"High/Moderate/Low"),("Est Hours/Week",False,"Hours per week"),("Current Time Spent %",False,"% of role time (sum to 100)"),("Time Saved %",False,"% AI can save"),("Task Type",False,"Repetitive/Variable"),("Interaction",False,"Independent/Interactive/Collaborative"),("Logic",False,"Deterministic/Probabilistic/Judgment-heavy"),("Primary Skill",False,"Main skill"),("Secondary Skill",False,"Supporting skill")],"example":["Acme_Corp","Finance","Corporate Functions","FP&A","US","Analyst","L2","Financial Analyst","Supports budgeting","Reporting","FA-T1","Refresh Management Report Pack","Update monthly board reports","High",4,10,5,"Repetitive","Independent","Deterministic","Reporting","Excel"]},
        "3. Operating Model": {"desc":"Capability map — layers, scope, hierarchy, ownership. Powers: Operating Model Lab.","color":TEAL,"columns":[("Model ID",True,"Same Model ID"),("Scope",True,"Enterprise or function name"),("Layer",True,"Governance / Core Components / Shared Services / Enabling / Interface"),("Level 1",False,"Capability area"),("Level 2",False,"Sub-capability"),("Level 3",False,"Process/activity"),("Level 4",False,"Granular detail"),("Description",False,"Describe capability"),("Owner",False,"Capability owner title"),("Function ID",False,"Owning function"),("Job Family",False,"Related family"),("Sub-Family",False,"Sub-family"),("Geography",False,"Global/US/UK/India"),("Career Track",False,"Track"),("Career Level",False,"Level")],"example":["Acme_Corp","Finance","Core Components","Planning","Forecasting","Monthly Forecast","Revenue Build","Monthly revenue forecasting process","Director, FP&A","Finance","Corporate Functions","FP&A","US","",""]},
        "4. Org Design": {"desc":"Org hierarchy for span of control, layer analysis.","color":GREEN,"columns":[("Model ID",True,"Same Model ID"),("Employee ID",True,"Unique ID"),("Employee Name",True,"Full name"),("Manager ID",False,"Manager's Employee ID"),("Manager Name",False,"Manager name"),("Function ID",False,"Function"),("Job Family",False,"Family"),("Sub-Family",False,"Sub-function"),("Geography",False,"Region"),("Career Track",False,"Track"),("Career Level",False,"Level"),("Job Title",False,"Title"),("Job Description",False,"Description"),("Department",False,"Department"),("Org Unit",False,"Org unit")],"example":["Acme_Corp","E001","Jane Smith","","","Finance","Corporate Functions","Leadership","US","Executive","L10","Chief Financial Officer","Leads all finance","Finance","Enterprise"]},
        "5. Job Catalog": {"desc":"Standardized job architecture — families, levels, career paths.","color":"8B5CF6","columns":[("Model ID",True,"Same Model ID"),("Job Code",False,"Internal code"),("Job Title",True,"Standardized title"),("Standard Title",False,"Benchmark title"),("Function ID",False,"Function"),("Job Family",False,"Family"),("Sub-Family",False,"Sub-function"),("Geography",False,"Region"),("Career Track",False,"Track"),("Career Level",False,"Level"),("Manager or IC",False,"Manager/IC"),("Job Description",False,"Description"),("Skills",False,"Semicolon-separated skills"),("Role Purpose",False,"One-line purpose")],"example":["Acme_Corp","FIN-ANL-L2","Financial Analyst","Financial Analyst","Finance","Corporate Functions","FP&A","US","Analyst","L2","IC","Supports budgeting","Excel;Analysis;Reporting","Provide financial insight."]},
        "6. Change Management": {"desc":"Transformation initiatives, RACI, roadmap milestones. Powers: Change Planner.","color":"E11D48","columns":[("Model ID",True,"Same Model ID"),("Function ID",False,"Function"),("Job Family",False,"Family"),("Sub-Family",False,"Sub-function"),("Geography",False,"Region"),("Career Track",False,"Track"),("Career Level",False,"Level"),("Job Title",False,"Affected title"),("Task Name",False,"Task being changed"),("Initiative",False,"Initiative name"),("Owner",False,"Initiative owner"),("Priority",False,"High/Medium/Low"),("Status",False,"Planned/In Progress/Complete"),("Wave",False,"Wave 1/Wave 2/etc"),("Start",False,"YYYY-MM-DD"),("End",False,"YYYY-MM-DD"),("Risk",False,"Risk description"),("Notes",False,"Additional notes")],"example":["Acme_Corp","Finance","Corporate Functions","FP&A","US","Analyst","L2","Financial Analyst","Reporting Automation","Reporting Automation","CFO","High","Planned","Wave 1","2026-01-01","2026-03-31","Resistance to change","Phase 1 pilot"]},
    }

    td = TABS.get(tab_name)
    if not td:
        raise HTTPException(status_code=404, detail=f"Tab not found: {tab_name}")

    wb = Workbook()
    ws = wb.active
    ws.title = tab_name
    ws.sheet_properties.tabColor = td["color"]
    cols = td["columns"]
    ex = td.get("example", [])

    ws.merge_cells(f"A1:{get_column_letter(len(cols))}1")
    ws["A1"] = td["desc"]
    ws["A1"].font = subtitle_font
    ws["A1"].alignment = wrap
    ws.row_dimensions[1].height = 30
    for ci, (cn, req, _) in enumerate(cols, 1):
        c = ws.cell(row=2, column=ci, value=cn)
        c.font = hdr_font; c.fill = PatternFill("solid", fgColor=BLUE) if req else hdr_fill; c.alignment = center; c.border = thin_border
    for ci, (_, req, _) in enumerate(cols, 1):
        c = ws.cell(row=3, column=ci, value="REQUIRED" if req else "Optional")
        c.font = Font(name="Arial", bold=req, size=9, color=BLUE if req else DKGRAY); c.fill = req_fill if req else opt_fill; c.alignment = center; c.border = thin_border
    for ci, (_, _, hint) in enumerate(cols, 1):
        c = ws.cell(row=4, column=ci, value=hint); c.font = hint_font; c.alignment = wrap; c.border = thin_border
    ws.row_dimensions[4].height = 40
    for ci, val in enumerate(ex, 1):
        c = ws.cell(row=5, column=ci, value=val); c.font = ex_font; c.fill = ex_fill; c.border = thin_border
    for ri in range(6, 51):
        for ci in range(1, len(cols) + 1):
            c = ws.cell(row=ri, column=ci, value=""); c.border = thin_border
            if ri % 2 == 0: c.fill = PatternFill("solid", fgColor="F8FAFC")
    for ci, (cn, _, _) in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(ci)].width = max(len(cn) + 5, 15)
    ws.freeze_panes = "A6"
    for ci, (cn, _, _) in enumerate(cols, 1):
        cl = get_column_letter(ci)
        dv = None
        if cn == "AI Impact": dv = DataValidation(type="list", formula1='"High,Moderate,Low"', allow_blank=True)
        elif cn == "Task Type": dv = DataValidation(type="list", formula1='"Repetitive,Variable"', allow_blank=True)
        elif cn == "Interaction": dv = DataValidation(type="list", formula1='"Independent,Interactive,Collaborative"', allow_blank=True)
        elif cn == "Logic": dv = DataValidation(type="list", formula1='"Deterministic,Probabilistic,Judgment-heavy"', allow_blank=True)
        elif cn == "Priority": dv = DataValidation(type="list", formula1='"High,Medium,Low"', allow_blank=True)
        elif cn == "Status": dv = DataValidation(type="list", formula1='"Planned,In Progress,Complete,On Hold"', allow_blank=True)
        elif cn == "Wave": dv = DataValidation(type="list", formula1='"Wave 1,Wave 2,Wave 3,Wave 4"', allow_blank=True)
        elif cn == "Layer": dv = DataValidation(type="list", formula1='"Governance,Core Components,Shared Services,Enabling,Interface"', allow_blank=True)
        if dv:
            dv.error = "Please select from the dropdown"; ws.add_data_validation(dv); dv.add(f"{cl}6:{cl}500")

    safe_name = tab_name.replace(". ", "_").replace(" ", "_")
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={safe_name}_Template.xlsx"})


# ── Domain routes (filter-options, job-options, overview, diagnose/*,
# ── design/*, simulate/*, mobilize/*, operating-model, export/datasets,
# ── export/download) are in their respective routes_*.py files.

@app.get("/")
def root():
    return {"ok": True, "app": "ai-transformation-platform", "version": "4.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
