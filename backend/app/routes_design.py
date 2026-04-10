"""Design routes — job context, deconstruction, reconstruction, operating model."""

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.store import (
    store, sync_work_design, build_reconstruction, build_ai_priority_scores,
    build_deconstruction_summary, build_workstream_breakdown, build_work_dimensions,
    build_redeployment_detail, build_reconstruction_rollup, build_transformation_insights,
    build_transformation_recommendations, build_value_model, build_role_evolution,
    build_capacity_waterfall_data, build_operating_model_analysis, enrich_work_design_defaults,
)
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _j, _f
from app.models import ReconstructionRequest

router = APIRouter(prefix="/api", tags=["design"])


@router.get("/design/job-context")
def get_job_context(model_id: str, job: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All", scenario: str = "Balanced"):
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"error": "No work design data", "kpis": {}, "meta": {}, "description": "", "decon_summary": [], "ws_breakdown": [], "ai_distribution": []}
    job_df = sync_work_design(wd[get_series(wd, "Job Title").astype(str) == job].copy())
    if job_df.empty:
        return {"error": f"No tasks for job: {job}", "kpis": {}, "meta": {}, "description": "", "decon_summary": [], "ws_breakdown": [], "ai_distribution": []}
    total_curr = round(float(pd.to_numeric(get_series(job_df, "Est Hours/Week"), errors="coerce").fillna(0).sum()), 1)
    recon = build_reconstruction(job_df, scenario)
    total_fut = round(float(pd.to_numeric(get_series(recon, "Future Hrs"), errors="coerce").fillna(0).sum()), 1) if not recon.empty else 0
    released = round(total_curr - total_fut, 1)
    released_pct = round(released / total_curr * 100, 1) if total_curr else 0
    evolution, evo_detail = build_role_evolution(job_df, recon, build_redeployment_detail(recon) if not recon.empty else pd.DataFrame())
    meta = {}
    for c in ["Function ID", "Job Family", "Sub-Family", "Career Track", "Career Level", "Geography"]:
        if c in job_df.columns:
            v = get_series(job_df, c).dropna().astype(str).str.strip()
            v = v[v != ""]
            if len(v) > 0:
                meta[c] = str(v.iloc[0])
    jd = ""
    if "Job Description" in job_df.columns:
        v = get_series(job_df, "Job Description").dropna().astype(str).str.strip()
        v = v[v != ""]
        jd = str(v.iloc[0]) if len(v) > 0 else ""
    return _safe({
        "kpis": {"hours_week": total_curr, "tasks": int(len(job_df)), "workstreams": int(len(build_workstream_breakdown(job_df))), "released_hrs": released, "released_pct": released_pct, "future_hrs": total_fut, "evolution": str(evolution)},
        "meta": meta, "description": jd,
        "decon_summary": _j(build_deconstruction_summary(job_df)),
        "ws_breakdown": _j(build_workstream_breakdown(job_df)),
        "ai_distribution": [{"name": str(k), "value": int(v)} for k, v in safe_value_counts(get_series(job_df, "AI Impact")).items()],
        "evolution_detail": evo_detail if isinstance(evo_detail, list) else [],
    })


@router.get("/design/deconstruction")
def get_deconstruction(model_id: str, job: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"tasks": [], "dimensions": [], "ai_priority": []}
    job_df = sync_work_design(wd[get_series(wd, "Job Title").astype(str) == job].copy())
    if job_df.empty:
        return {"tasks": [], "dimensions": [], "ai_priority": []}
    cols = ["Task ID", "Task Name", "Workstream", "AI Impact", "Est Hours/Week", "Current Time Spent %", "Time Saved %", "Task Type", "Interaction", "Logic", "Primary Skill", "Secondary Skill"]
    edit_df = job_df[[c for c in cols if c in job_df.columns]].copy()
    for c in cols:
        if c not in edit_df.columns:
            edit_df[c] = ""
    if "Task ID" not in edit_df.columns or edit_df["Task ID"].astype(str).str.strip().eq("").all():
        edit_df["Task ID"] = [f"T{i+1}" for i in range(len(edit_df))]
    return _safe({"tasks": _j(edit_df, 200), "dimensions": _j(build_work_dimensions(job_df), 200), "ai_priority": _j(build_ai_priority_scores(job_df), 50)})


@router.post("/design/reconstruct")
def compute_reconstruction_endpoint(payload: ReconstructionRequest):
    tasks = payload.tasks
    scenario = payload.scenario
    if not tasks:
        return {"reconstruction": [], "rollup": [], "value_model": {}, "recommendations": []}
    job_df = sync_work_design(pd.DataFrame(tasks))
    for c in ["Est Hours/Week", "Current Time Spent %", "Time Saved %"]:
        if c in job_df.columns:
            job_df[c] = pd.to_numeric(job_df[c], errors="coerce").fillna(0)
    recon = build_reconstruction(job_df, scenario)
    if recon.empty:
        return {"reconstruction": [], "rollup": [], "value_model": {}, "recommendations": []}
    rd = build_redeployment_detail(recon)
    ac = safe_value_counts(get_series(recon, "Action")) if "Action" in recon.columns else pd.Series()
    wf_c, wf_a, wf_au, wf_o, wf_r = build_capacity_waterfall_data(recon)
    evolution, evo_detail = build_role_evolution(job_df, recon, rd)
    return _safe({
        "reconstruction": _j(recon, 200), "rollup": _j(build_reconstruction_rollup(recon)),
        "redeployment": _j(rd, 200), "insights": _j(build_transformation_insights(job_df, recon, rd)),
        "recommendations": build_transformation_recommendations(job_df, recon, rd),
        "value_model": build_value_model(job_df, recon),
        "evolution": str(evolution), "evolution_detail": evo_detail if isinstance(evo_detail, list) else [],
        "action_mix": {str(k): int(v) for k, v in ac.items()},
        "waterfall": {"current": float(wf_c), "automated": float(wf_a), "augmented": float(wf_au), "other": float(wf_o), "redeployed": float(wf_r)},
    })


@router.get("/operating-model")
def get_operating_model(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    if model_id not in store.datasets:
        return _safe({"kpis": {}, "maturity": [], "structure": [], "workflow": [], "decisions": [], "insights": [], "layer_agg": [], "service_split": [], "scope_dist": [], "decision_load": [], "stage_throughput": []})
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    try:
        return _safe(build_operating_model_analysis(data))
    except Exception as e:
        print(f"[operating-model] Error: {e}")
        return _safe({"kpis": {}, "maturity": [], "structure": [], "workflow": [], "decisions": [], "insights": [], "layer_agg": [], "service_split": [], "scope_dist": [], "decision_load": [], "stage_throughput": []})


# ═══════════════════════════════════════════════════════════════
# OPERATING MODEL TAXONOMY
# ═══════════════════════════════════════════════════════════════

from app.om_taxonomy import build_taxonomy, fuzzy_match_units, get_industry_list, get_taxonomy_stats


@router.get("/om-taxonomy")
def get_om_taxonomy(industry: str = ""):
    """Return the merged taxonomy for given industries (comma-separated)."""
    industries = [i.strip() for i in industry.split(",") if i.strip()] if industry else []
    taxonomy = build_taxonomy(industries)
    stats = get_taxonomy_stats()
    return _safe({"taxonomy": taxonomy, "stats": stats, "available_industries": get_industry_list()})


@router.get("/om-taxonomy/search")
def search_om_taxonomy(q: str = "", industry: str = ""):
    """Fuzzy search across taxonomy units."""
    if not q or len(q) < 2:
        return {"results": []}
    industries = [i.strip() for i in industry.split(",") if i.strip()] if industry else None
    results = fuzzy_match_units(q, industries)
    return _safe({"results": results, "query": q})


@router.post("/om-taxonomy/configure")
def save_om_config(payload: dict):
    """Save per-project operating model configuration."""
    model_id = payload.get("model_id", "")
    if not model_id:
        raise HTTPException(400, "model_id is required")
    config = {
        "industries": payload.get("industries", []),
        "selected_units": payload.get("selected_units", []),
        "custom_units": payload.get("custom_units", []),
        "renames": payload.get("renames", {}),
        "scoped_units": payload.get("scoped_units", {}),
        "template_name": payload.get("template_name"),
    }
    store.ensure_model_bundle(model_id)
    if not hasattr(store, "om_configs"):
        store.om_configs = {}
    store.om_configs[model_id] = config
    return _safe({"ok": True, "config": config})


@router.get("/om-taxonomy/config/{model_id}")
def get_om_config(model_id: str):
    """Get saved operating model configuration for a project."""
    configs = getattr(store, "om_configs", {})
    config = configs.get(model_id, {})
    return _safe({"config": config})
