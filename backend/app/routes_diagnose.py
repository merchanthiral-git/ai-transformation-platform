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

    # Normalize raw weights to a 1-5 proficiency scale
    def normalize_to_scale(df):
        if df.empty or "Weight" not in df.columns:
            return df
        out = df.copy()
        max_w = out["Weight"].max()
        if max_w > 0:
            out["Weight"] = (out["Weight"] / max_w * 4 + 1).round(1).clip(1.0, 5.0)
        return out

    current_norm = normalize_to_scale(current)
    future_norm = normalize_to_scale(future) if not future.empty else future

    gap = []
    if not current_norm.empty and not future_norm.empty:
        m = current_norm.rename(columns={"Weight": "Current"}).merge(future_norm.rename(columns={"Weight": "Future"}), on="Skill", how="outer").fillna(0)
        m["Current"] = m["Current"].round(1)
        m["Future"] = m["Future"].round(1)
        m["Delta"] = (m["Future"] - m["Current"]).round(1)
        m = m.sort_values("Delta")
        gap = _j(m)
    return _safe({"current": _j(current_norm), "future": _j(future_norm), "gap": gap})


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
    """Role clustering — group roles by structural + task similarity."""
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    wd = data["work_design"]
    wf = data.get("workforce", pd.DataFrame())
    jc = data.get("job_catalog", pd.DataFrame())

    if wd.empty or "Job Title" not in wd.columns:
        return {"clusters": [], "roles": [], "pairs": [], "opportunities": []}

    # Build role profiles with structural AND task data
    role_profiles = {}
    for title, g in wd.groupby(get_series(wd, "Job Title").astype(str)):
        title = str(title).strip()
        if not title:
            continue
        # Skills (weighted by importance)
        skills = set()
        for col in ["Primary Skill", "Secondary Skill"]:
            if col in g.columns:
                skills.update(s.strip() for s in get_series(g, col).dropna().astype(str) if s.strip() and s.strip() != "nan")
        task_names = [t.strip() for t in get_series(g, "Task Name").dropna().astype(str) if t.strip()]
        # Get structural info from workforce/job_catalog
        func_id = ""
        family = ""
        level = ""
        track = ""
        headcount = 1
        if not wf.empty and "Job Title" in wf.columns:
            matches = wf[get_series(wf, "Job Title").astype(str).str.strip() == title]
            if not matches.empty:
                func_id = str(matches.iloc[0].get("Function ID", "")).strip()
                family = str(matches.iloc[0].get("Job Family", "")).strip()
                level = str(matches.iloc[0].get("Career Level", "")).strip()
                track = str(matches.iloc[0].get("Career Track", "")).strip()
                headcount = len(matches)
        role_profiles[title] = {
            "skills": skills, "task_names": task_names, "task_count": len(task_names),
            "function": func_id, "family": family, "level": level, "track": track, "headcount": headcount,
        }

    roles = sorted(role_profiles.keys())
    if len(roles) < 2:
        return {"clusters": [], "roles": [{"role": r, **role_profiles[r]} for r in roles], "pairs": [], "opportunities": []}

    # Calculate pairwise similarity with multi-factor scoring
    pairs = []
    for i, r1 in enumerate(roles):
        p1 = role_profiles[r1]
        for r2 in roles[i+1:]:
            p2 = role_profiles[r2]
            score = 0.0
            # Factor 1: Same function (+30 max)
            if p1["function"] and p1["function"] == p2["function"]:
                score += 30
            # Factor 2: Same family (+20 max)
            if p1["family"] and p1["family"] == p2["family"]:
                score += 20
            # Factor 3: Similar level (+15 max — adjacent levels score higher)
            l1 = int("".join(c for c in p1["level"] if c.isdigit()) or "0")
            l2 = int("".join(c for c in p2["level"] if c.isdigit()) or "0")
            if l1 and l2:
                level_diff = abs(l1 - l2)
                score += max(0, 15 - level_diff * 5)
            # Factor 4: Same track (+10)
            if p1["track"] and p1["track"] == p2["track"]:
                score += 10
            # Factor 5: Skill overlap (+25 max)
            if p1["skills"] and p2["skills"]:
                skill_overlap = len(p1["skills"] & p2["skills"]) / max(len(p1["skills"] | p2["skills"]), 1)
                score += skill_overlap * 25

            if score >= 40:  # minimum threshold for meaningful similarity
                pairs.append({"role_a": r1, "role_b": r2, "similarity": round(score), "max_score": 100})

    pairs.sort(key=lambda p: -p["similarity"])

    # Build clusters using greedy approach with function-first grouping
    clusters = []
    seen = set()

    # Group by function first, then find sub-clusters within each function
    by_func = {}
    for r in roles:
        func = role_profiles[r]["function"] or "Other"
        if func not in by_func:
            by_func[func] = []
        by_func[func].append(r)

    for func, func_roles in by_func.items():
        if len(func_roles) < 2:
            continue
        # Within each function, cluster by family
        by_family = {}
        for r in func_roles:
            fam = role_profiles[r]["family"] or "General"
            if fam not in by_family:
                by_family[fam] = []
            by_family[fam].append(r)

        for fam, fam_roles in by_family.items():
            if len(fam_roles) < 2:
                # Single-role families — group with nearby roles in same function
                continue
            # Calculate avg similarity within this group
            overlaps = []
            for i, a in enumerate(fam_roles):
                for b in fam_roles[i+1:]:
                    pa, pb = role_profiles[a], role_profiles[b]
                    if pa["skills"] and pb["skills"]:
                        so = len(pa["skills"] & pb["skills"]) / max(len(pa["skills"] | pb["skills"]), 1)
                        overlaps.append(round(so * 100))
            avg_overlap = round(sum(overlaps) / max(len(overlaps), 1)) if overlaps else 50
            total_hc = sum(role_profiles[r]["headcount"] for r in fam_roles)
            shared_skills = sorted(set.intersection(*(role_profiles[r]["skills"] for r in fam_roles)) if fam_roles else set())[:8]

            # Find highest-overlap pair within cluster
            best_pair = None
            best_sim = 0
            for p in pairs:
                if p["role_a"] in fam_roles and p["role_b"] in fam_roles and p["similarity"] > best_sim:
                    best_pair = (p["role_a"], p["role_b"], p["similarity"])
                    best_sim = p["similarity"]

            clusters.append({
                "name": f"{func} — {fam}" if fam != "General" else func,
                "function": func,
                "family": fam,
                "roles": fam_roles,
                "size": len(fam_roles),
                "headcount": total_hc,
                "avg_overlap": avg_overlap,
                "consolidation_candidate": avg_overlap >= 70,
                "shared_skills": shared_skills,
                "highest_pair": best_pair,
            })

    # Generate consolidation opportunities from high-similarity pairs
    opportunities = []
    for p in pairs[:10]:
        pa, pb = role_profiles[p["role_a"]], role_profiles[p["role_b"]]
        hc = pa["headcount"] + pb["headcount"]
        savings_est = round(min(pa["headcount"], pb["headcount"]) * 85000 * 0.15)  # 15% of smaller role's cost
        impact = "High" if p["similarity"] >= 75 and hc >= 10 else "Medium" if p["similarity"] >= 60 else "Low"
        opportunities.append({
            "role_a": p["role_a"], "role_b": p["role_b"],
            "similarity": p["similarity"],
            "headcount_affected": hc,
            "estimated_savings": savings_est,
            "impact": impact,
            "risk": "Low" if pa["level"] == pb["level"] and pa["track"] == pb["track"] else "Medium",
        })

    role_list = [{"role": r, "task_count": d["task_count"], "function": d["function"], "family": d["family"], "level": d["level"], "track": d["track"], "headcount": d["headcount"], "skills": sorted(d["skills"])[:8]} for r, d in role_profiles.items()]

    return _safe({
        "clusters": sorted(clusters, key=lambda c: -c["avg_overlap"]),
        "roles": role_list,
        "pairs": pairs[:20],
        "opportunities": opportunities,
        "summary": {
            "total_roles": len(roles),
            "total_clusters": len(clusters),
            "consolidation_opportunities": len([o for o in opportunities if o["impact"] in ("High", "Medium")]),
            "potential_savings": sum(o["estimated_savings"] for o in opportunities),
            "roles_affected": len(set(o["role_a"] for o in opportunities) | set(o["role_b"] for o in opportunities)),
            "highest_overlap": f"{pairs[0]['role_a']} ↔ {pairs[0]['role_b']}: {pairs[0]['similarity']}%" if pairs else "—",
        },
    })


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
