"""Diagnose routes — AI priority, skills analysis, org diagnostics, data quality."""

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.store import (
    store, sync_work_design, build_ai_priority_scores, build_skill_analysis,
    build_reconstruction, get_manager_candidates, compute_readiness_score,
)
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["diagnose"])


@router.get("/diagnose/ai-priority")
def get_ai_priority(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"summary": {}, "top10": [], "workstream_impact": []}
    scored = build_ai_priority_scores(wd)
    if scored.empty:
        return {"summary": {}, "top10": [], "workstream_impact": []}
    qw = scored[(scored["Feasibility"] > scored["Feasibility"].median()) & (scored["Time Impact"] > scored["Time Impact"].median())]
    top10 = scored.nlargest(10, "AI Priority")
    ws_impact = scored.groupby("Workstream", as_index=False)["Time Impact"].sum().sort_values("Time Impact", ascending=False)
    return _safe({
        "summary": {
            "tasks_scored": int(len(scored)),
            "quick_wins": int(len(qw)),
            "total_time_impact": round(float(scored["Time Impact"].sum()), 1),
            "avg_risk": round(float(scored["Risk Score"].mean()), 1),
        },
        "top10": _j(top10, 20),
        "workstream_impact": _j(ws_impact, 30),
    })


@router.get("/diagnose/skills")
def get_skill_analysis(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"current": [], "future": [], "gap": []}
    recon = build_reconstruction(wd)
    current, future = build_skill_analysis(wd, recon)
    gap = []
    if not current.empty and not future.empty:
        m = current.rename(columns={"Weight": "Current"}).merge(future.rename(columns={"Weight": "Future"}), on="Skill", how="outer").fillna(0)
        m["Delta"] = m["Future"] - m["Current"]
        gap = _j(m.sort_values("Delta"))
    return _safe({"current": _j(current), "future": _j(future), "gap": gap})


@router.get("/diagnose/org")
def get_org_diagnostics(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    source = data["org_design"] if not data["org_design"].empty else data["workforce"]
    if source.empty:
        return {"empty": True, "kpis": {}, "managers": [], "layers": [], "span_top15": [], "layer_distribution": []}
    mgr_df = get_manager_candidates(source)
    total = int(len(source))
    avg_span = round(float(pd.to_numeric(get_series(mgr_df, "Direct Reports"), errors="coerce").fillna(0).mean()), 1) if not mgr_df.empty else 0
    max_span = int(pd.to_numeric(get_series(mgr_df, "Direct Reports"), errors="coerce").fillna(0).max()) if not mgr_df.empty else 0
    lc = safe_value_counts(get_series(source, "Career Level"))
    mgr_data, span_top15 = [], []
    if not mgr_df.empty:
        for _, r in mgr_df.nlargest(15, "Direct Reports").iterrows():
            mgr_data.append({"name": str(r.get("Employee Name", "")), "title": str(r.get("Job Title", "")), "reports": int(r.get("Direct Reports", 0))})
            span_top15.append({"Label": str(r.get("Employee Name", "")), "Direct Reports": int(r.get("Direct Reports", 0))})
    return _safe({
        "kpis": {"total": total, "managers": int(len(mgr_df)), "ics": total - int(len(mgr_df)), "avg_span": avg_span, "max_span": max_span, "layers": int(len(lc))},
        "managers": mgr_data, "span_top15": span_top15,
        "layers": [{"name": str(k), "value": int(v)} for k, v in lc.items()],
        "layer_distribution": [{"name": str(k), "value": int(v)} for k, v in lc.items()],
    })


@router.get("/diagnose/heatmap")
def get_ai_heatmap(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    """AI Impact Heatmap — function × job family matrix with automation potential."""
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"cells": [], "functions": [], "families": []}
    scored = build_ai_priority_scores(wd)
    if scored.empty or "AI Priority" not in scored.columns:
        return {"cells": [], "functions": [], "families": []}
    cells = []
    func_col = "Function ID" if "Function ID" in scored.columns else None
    fam_col = "Job Family" if "Job Family" in scored.columns else ("Sub-Family" if "Sub-Family" in scored.columns else None)
    if not func_col or not fam_col:
        return {"cells": [], "functions": [], "families": []}
    for (func, fam), g in scored.groupby([get_series(scored, func_col).fillna("Other").astype(str), get_series(scored, fam_col).fillna("General").astype(str)]):
        avg_score = round(float(g["AI Priority"].mean()), 1)
        task_count = int(len(g))
        high_count = int((g["AI Priority"] >= 7).sum())
        impact = "High" if avg_score >= 6 else "Moderate" if avg_score >= 3.5 else "Low"
        roles = sorted(get_series(g, "Job Title").dropna().astype(str).unique().tolist()) if "Job Title" in g.columns else []
        cells.append({"function": str(func), "family": str(fam), "score": avg_score, "impact": impact,
            "tasks": task_count, "high_tasks": high_count, "roles": roles[:10]})
    functions = sorted(set(c["function"] for c in cells))
    families = sorted(set(c["family"] for c in cells))
    return _safe({"cells": cells, "functions": functions, "families": families})


@router.get("/diagnose/clusters")
def get_role_clusters(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    """Role clustering — group roles by task overlap for consolidation candidates."""
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty or "Job Title" not in wd.columns or "Task Name" not in wd.columns:
        return {"clusters": [], "roles": []}
    # Build task sets per role
    role_tasks = {}
    for title, g in wd.groupby(get_series(wd, "Job Title").astype(str)):
        tasks = set()
        for col in ["Task Type", "Logic", "Interaction", "Primary Skill", "Secondary Skill"]:
            if col in g.columns:
                tasks.update(get_series(g, col).dropna().astype(str).str.strip().tolist())
        task_names = get_series(g, "Task Name").dropna().astype(str).tolist()
        role_tasks[str(title)] = {"characteristics": tasks, "task_names": task_names, "task_count": len(task_names)}
    # Calculate pairwise overlap
    roles = sorted(role_tasks.keys())
    clusters = []
    seen = set()
    for i, r1 in enumerate(roles):
        if r1 in seen:
            continue
        cluster = [r1]
        t1 = role_tasks[r1]["characteristics"]
        for r2 in roles[i+1:]:
            if r2 in seen:
                continue
            t2 = role_tasks[r2]["characteristics"]
            if not t1 or not t2:
                continue
            overlap = len(t1 & t2) / max(len(t1 | t2), 1)
            if overlap >= 0.5:
                cluster.append(r2)
                seen.add(r2)
        seen.add(r1)
        if len(cluster) > 1:
            # Calculate avg overlap within cluster
            overlaps = []
            for a in cluster:
                for b in cluster:
                    if a < b:
                        ta, tb = role_tasks[a]["characteristics"], role_tasks[b]["characteristics"]
                        overlaps.append(round(len(ta & tb) / max(len(ta | tb), 1) * 100, 1))
            avg_overlap = round(sum(overlaps) / max(len(overlaps), 1), 1) if overlaps else 0
            clusters.append({
                "roles": cluster, "size": len(cluster), "avg_overlap": avg_overlap,
                "consolidation_candidate": avg_overlap >= 70,
                "shared_characteristics": sorted(set.intersection(*(role_tasks[r]["characteristics"] for r in cluster)) if cluster else set())[:10],
            })
    # Also return all roles with their task count
    role_list = [{"role": r, "task_count": d["task_count"], "characteristics_count": len(d["characteristics"])} for r, d in role_tasks.items()]
    return _safe({"clusters": sorted(clusters, key=lambda c: -c["avg_overlap"]), "roles": role_list})


@router.get("/diagnose/data-quality")
def get_data_quality(model_id: str):
    if model_id not in store.datasets:
        raise HTTPException(404, "Model not found")
    readiness_df = store.readiness_summary(model_id)
    ready_count = int((readiness_df["Status"] == "Ready").sum()) if not readiness_df.empty else 0
    missing_count = int((readiness_df["Status"] == "Missing").sum()) if not readiness_df.empty else 0
    total_issues = int(readiness_df["Issues"].sum()) if not readiness_df.empty else 0
    avg_completeness = int(readiness_df["Completeness"].mean()) if not readiness_df.empty else 0
    return _safe({
        "summary": {"ready": ready_count, "missing": missing_count, "total_issues": total_issues, "avg_completeness": avg_completeness},
        "readiness": _j(readiness_df), "upload_log": _j(store.upload_log()), "registry": _j(store.model_registry()),
    })
