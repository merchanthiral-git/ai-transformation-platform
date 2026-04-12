"""Job Architecture routes — catalogue, hierarchy, analytics, validation."""

import json, os, uuid
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from app.store import store, sync_work_design, build_ai_priority_scores, get_manager_candidates
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["job-architecture"])

# ── Future-state version storage (file-based) ──
_VERSIONS_DIR = Path(__file__).resolve().parent.parent / "data" / "arch_versions"
_VERSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _build_hierarchy(wf, jc, wd):
    """Build a tree: Function → Job Family → Sub-Family → Jobs with stats."""
    # Build from workforce as the primary source (for accurate headcount),
    # then supplement with job_catalog and work_design for additional role definitions
    arch_cols = ["Function ID", "Job Family", "Sub-Family", "Job Title", "Career Track", "Career Level"]

    # Primary: workforce
    primary = None
    if wf is not None and not wf.empty:
        cols = {c: get_series(wf, c).astype(str) for c in arch_cols if c in wf.columns}
        if cols:
            primary = pd.DataFrame(cols)

    # Supplement: roles from job_catalog and work_design that aren't in workforce
    supplement_frames = []
    for df in [jc, wd]:
        if df is not None and not df.empty:
            cols = {c: get_series(df, c).astype(str) for c in arch_cols if c in df.columns}
            if cols and "Job Title" in cols:
                supplement_frames.append(pd.DataFrame(cols))

    if primary is None and not supplement_frames:
        return {"tree": [], "jobs": [], "stats": {}}

    combined = primary if primary is not None else pd.DataFrame()
    if supplement_frames:
        supp = pd.concat(supplement_frames, ignore_index=True).drop_duplicates(subset=["Job Title", "Function ID"] if "Function ID" in pd.concat(supplement_frames).columns else ["Job Title"])
        if primary is not None:
            # Only add roles not already in workforce
            existing_titles = set(get_series(primary, "Job Title").astype(str).unique()) if "Job Title" in primary.columns else set()
            supp = supp[~get_series(supp, "Job Title").astype(str).isin(existing_titles)]
        combined = pd.concat([combined, supp], ignore_index=True) if not combined.empty else supp

    if combined.empty:
        return {"tree": [], "jobs": [], "stats": {}}

    # Normalize: fill empty Job Family from Sub-Family or Function ID
    if "Job Family" in combined.columns:
        jf = get_series(combined, "Job Family").astype(str).str.strip()
        sf = get_series(combined, "Sub-Family").astype(str).str.strip() if "Sub-Family" in combined.columns else jf
        fi = get_series(combined, "Function ID").astype(str).str.strip() if "Function ID" in combined.columns else jf
        combined["Job Family"] = jf.where((jf != "") & (jf != "nan"), sf.where((sf != "") & (sf != "nan"), fi))
    # Normalize: fill empty Sub-Family from Job Family
    if "Sub-Family" in combined.columns:
        sf2 = get_series(combined, "Sub-Family").astype(str).str.strip()
        jf2 = get_series(combined, "Job Family").astype(str).str.strip() if "Job Family" in combined.columns else sf2
        combined["Sub-Family"] = sf2.where((sf2 != "") & (sf2 != "nan"), jf2)

    # Headcount from workforce — group by title AND function for accurate mapping
    hc_by_title = {}
    hc_by_title_func = {}  # (title, function) -> count
    if wf is not None and not wf.empty and "Job Title" in wf.columns:
        wf_func = get_series(wf, "Function ID").fillna("Unknown").astype(str) if "Function ID" in wf.columns else pd.Series(["Unknown"] * len(wf))
        wf_title = get_series(wf, "Job Title").astype(str)
        for (t, fn), g in wf.groupby([wf_title, wf_func]):
            key = (str(t).strip(), str(fn).strip())
            hc_by_title_func[key] = int(len(g))
            hc_by_title[str(t).strip()] = hc_by_title.get(str(t).strip(), 0) + int(len(g))

    # AI impact from work_design
    ai_by_title = {}
    if wd is not None and not wd.empty and "Job Title" in wd.columns and "AI Impact" in wd.columns:
        scored = build_ai_priority_scores(wd)
        if not scored.empty and "AI Priority" in scored.columns:
            for t, g in scored.groupby(get_series(scored, "Job Title").astype(str)):
                ai_by_title[str(t).strip()] = round(float(g["AI Priority"].mean()), 1)

    # Build tree
    tree = []
    jobs_flat = []
    seen_jobs = set()  # track (title, function) pairs to allow same title in different functions

    for func_id, func_group in combined.groupby(get_series(combined, "Function ID").fillna("Unknown").astype(str)):
        func_str = str(func_id).strip()
        if not func_str or func_str == "nan":
            func_str = "Unknown"
        func_node = {"id": func_str, "label": func_str, "type": "function", "children": [], "headcount": 0}
        for jf, jf_group in func_group.groupby(get_series(func_group, "Job Family").fillna("General").astype(str)):
            jf_str = str(jf).strip() or "General"
            jf_node = {"id": f"{func_str}_{jf_str}", "label": jf_str, "type": "job_family", "children": [], "headcount": 0}
            for sf, sf_group in jf_group.groupby(get_series(jf_group, "Sub-Family").fillna("General").astype(str)):
                sf_str = str(sf).strip() or "General"
                sf_node = {"id": f"{func_str}_{jf_str}_{sf_str}", "label": sf_str, "type": "sub_family", "children": [], "headcount": 0}
                for _, row in sf_group.iterrows():
                    title = str(row.get("Job Title", "")).strip()
                    job_key = f"{title}||{func_str}"
                    if not title or job_key in seen_jobs:
                        continue
                    seen_jobs.add(job_key)
                    # Use function-aware headcount first, fall back to total
                    hc = hc_by_title_func.get((title, func_str), hc_by_title.get(title, 0))
                    track = str(row.get("Career Track", "IC"))
                    level = str(row.get("Career Level", ""))
                    ai_score = ai_by_title.get(title, 0)
                    ai_impact = "High" if ai_score >= 6 else "Moderate" if ai_score >= 3 else "Low"

                    job = {
                        "id": title, "title": title, "level": level, "track": track,
                        "function": str(func_id), "family": str(jf), "sub_family": str(sf),
                        "headcount": hc, "ai_score": ai_score, "ai_impact": ai_impact,
                        "tasks_mapped": 0,
                    }
                    # Count tasks
                    if wd is not None and not wd.empty and "Job Title" in wd.columns:
                        job["tasks_mapped"] = int((get_series(wd, "Job Title").astype(str) == title).sum())

                    jobs_flat.append(job)
                    sf_node["children"].append({"id": title, "label": title, "type": "job", "headcount": hc})
                    sf_node["headcount"] += hc
                jf_node["children"].append(sf_node)
                jf_node["headcount"] += sf_node["headcount"]
            func_node["children"].append(jf_node)
            func_node["headcount"] += jf_node["headcount"]
        tree.append(func_node)

    # Org stats
    total_hc = sum(j["headcount"] for j in jobs_flat)
    mgr_count = sum(1 for j in jobs_flat if j["track"] in ("Manager", "Executive"))
    ic_count = len(jobs_flat) - mgr_count
    levels = sorted(set(j["level"] for j in jobs_flat if j["level"]))
    functions = sorted(set(j["function"] for j in jobs_flat))
    families = sorted(set(j["family"] for j in jobs_flat))
    sub_families = sorted(set(j["sub_family"] for j in jobs_flat))
    # Count family groups from workforce data if available
    family_groups_count = 0
    if wf is not None and not wf.empty and "Job Family Group" in wf.columns:
        family_groups_count = int(get_series(wf, "Job Family Group").nunique())

    stats = {
        "total_jobs": len(jobs_flat),
        "total_headcount": total_hc,
        "total_functions": len(functions),
        "total_family_groups": family_groups_count,
        "total_families": len(families),
        "total_sub_families": len(sub_families),
        "total_levels": len(levels),
        "levels": levels,
        "manager_roles": mgr_count,
        "ic_roles": ic_count,
        "avg_headcount_per_role": round(total_hc / max(len(jobs_flat), 1), 1),
        "high_ai_impact_roles": sum(1 for j in jobs_flat if j["ai_impact"] == "High"),
    }

    return {"tree": tree, "jobs": jobs_flat, "stats": stats}


def _validate_architecture(tree, jobs, wf):
    """Run structural validation rules. Returns list of flags."""
    flags = []

    # Group jobs by family
    by_family = {}
    for j in jobs:
        by_family.setdefault(j["family"], []).append(j)

    for family, fam_jobs in by_family.items():
        hc = sum(j["headcount"] for j in fam_jobs)
        # Too few roles
        if len(fam_jobs) < 3:
            flags.append({"severity": "warning", "category": "Structure", "title": f"Small job family: {family}", "description": f"Only {len(fam_jobs)} role(s) — consider merging with a related family", "affected": family, "population": hc})
        # Low population
        if hc > 0 and hc < 10:
            flags.append({"severity": "warning", "category": "Population", "title": f"Low population: {family}", "description": f"Only {hc} people — review if standalone family is justified", "affected": family, "population": hc})
        # Top-heavy
        mgr_hc = sum(j["headcount"] for j in fam_jobs if j["track"] in ("Manager", "Executive"))
        if hc > 5 and mgr_hc / max(hc, 1) > 0.4:
            flags.append({"severity": "critical", "category": "Population", "title": f"Top-heavy: {family}", "description": f"{round(mgr_hc/hc*100)}% management headcount — review management layers", "affected": family, "population": hc})
        # Single incumbent
        for j in fam_jobs:
            if j["headcount"] == 1:
                flags.append({"severity": "warning", "category": "Risk", "title": f"Single incumbent: {j['title']}", "description": "Key-person risk — only 1 person in this role", "affected": j["title"], "population": 1})
        # Career level gaps
        levels = sorted(set(j["level"] for j in fam_jobs if j["level"]))
        for i in range(len(levels) - 1):
            try:
                cur = int(levels[i].replace("L", ""))
                nxt = int(levels[i + 1].replace("L", ""))
                if nxt - cur > 1:
                    flags.append({"severity": "warning", "category": "Career Path", "title": f"Level gap in {family}", "description": f"Gap between {levels[i]} and {levels[i+1]} — unclear promotion path", "affected": family, "population": hc})
            except ValueError:
                pass
        # Dead-end roles (no higher level in same family)
        max_level = max((j["level"] for j in fam_jobs), default="")
        for j in fam_jobs:
            if j["level"] == max_level and j["track"] == "IC" and len(fam_jobs) > 1:
                flags.append({"severity": "info", "category": "Career Path", "title": f"Ceiling role: {j['title']}", "description": f"Highest IC level in {family} — ensure lateral/management paths exist", "affected": j["title"], "population": j["headcount"]})

    # Span of control
    if wf is not None and not wf.empty:
        mgr_df = get_manager_candidates(wf)
        if not mgr_df.empty and "Direct Reports" in mgr_df.columns:
            for _, r in mgr_df.iterrows():
                dr = int(r.get("Direct Reports", 0))
                name = str(r.get("Employee Name", ""))
                if dr > 12:
                    flags.append({"severity": "critical", "category": "Span of Control", "title": f"Wide span: {name}", "description": f"{dr} direct reports — above recommended maximum of 12", "affected": name, "population": dr})
                elif dr < 2 and dr > 0:
                    flags.append({"severity": "warning", "category": "Span of Control", "title": f"Narrow span: {name}", "description": f"Only {dr} direct report(s) — consider if management layer is needed", "affected": name, "population": dr})

    # Sort by severity
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    flags.sort(key=lambda f: severity_order.get(f["severity"], 3))
    return flags


@router.get("/job-architecture")
def get_job_architecture(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    """Full job architecture data — hierarchy, jobs, analytics, validation flags."""
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        return _safe({"tree": [], "jobs": [], "stats": {}, "flags": [], "analytics": {}, "employees": []})

    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    wf = data["workforce"]
    jc = data["job_catalog"]
    wd = data["work_design"]

    result = _build_hierarchy(wf, jc, wd)
    flags = _validate_architecture(result["tree"], result["jobs"], wf)

    # Analytics
    jobs = result["jobs"]
    level_dist = {}
    track_dist = {"IC": 0, "Manager": 0, "Executive": 0}
    family_sizes = {}
    for j in jobs:
        level_dist[j["level"]] = level_dist.get(j["level"], 0) + j["headcount"]
        t = j["track"] if j["track"] in track_dist else "IC"
        track_dist[t] += j["headcount"]
        family_sizes[j["family"]] = family_sizes.get(j["family"], 0) + j["headcount"]

    analytics = {
        "level_distribution": [{"level": k, "headcount": v} for k, v in sorted(level_dist.items())],
        "track_distribution": [{"track": k, "headcount": v} for k, v in track_dist.items()],
        "family_sizes": [{"family": k, "headcount": v, "roles": sum(1 for j in jobs if j["family"] == k)} for k, v in sorted(family_sizes.items(), key=lambda x: -x[1])],
        "ai_impact_summary": {
            "high": sum(1 for j in jobs if j["ai_impact"] == "High"),
            "moderate": sum(1 for j in jobs if j["ai_impact"] == "Moderate"),
            "low": sum(1 for j in jobs if j["ai_impact"] == "Low"),
        },
        "critical_flags": sum(1 for f in flags if f["severity"] == "critical"),
        "warning_flags": sum(1 for f in flags if f["severity"] == "warning"),
        "health_score": max(0, 100 - sum(10 for f in flags if f["severity"] == "critical") - sum(3 for f in flags if f["severity"] == "warning")),
    }

    # Employee-level data for architecture mapping
    employees = _build_employee_list(wf, wd)

    return _safe({
        "tree": result["tree"],
        "jobs": result["jobs"],
        "stats": result["stats"],
        "flags": flags,
        "analytics": analytics,
        "employees": employees,
    })


def _build_employee_list(wf, wd):
    """Build employee-level data with risk indicators for architecture mapping."""
    if wf is None or wf.empty:
        return []
    import random as _rng
    _rng.seed(99)

    # AI scores by title
    ai_by_title = {}
    if wd is not None and not wd.empty and "Job Title" in wd.columns and "AI Impact" in wd.columns:
        scored = build_ai_priority_scores(wd)
        if not scored.empty and "AI Priority" in scored.columns:
            for t, g in scored.groupby(get_series(scored, "Job Title").astype(str)):
                ai_by_title[str(t).strip()] = round(float(g["AI Priority"].mean()), 1)

    employees = []
    for _, row in wf.iterrows():
        eid = str(row.get("Employee ID", ""))
        name = str(row.get("Employee Name", ""))
        title = str(row.get("Job Title", ""))
        func = str(row.get("Function ID", ""))
        family = str(row.get("Job Family", ""))
        sub_family = str(row.get("Sub-Family", ""))
        track = str(row.get("Career Track", "IC"))
        level = str(row.get("Career Level", ""))
        geo = str(row.get("Geography", ""))
        mgr_name = str(row.get("Manager Name", ""))

        # Synthetic but consistent enrichments
        seed = hash(eid) % 1000
        tenure = round(1 + (seed % 15) + (seed % 7) * 0.3, 1)
        perf = ["Exceeds", "Meets", "Meets", "Meets", "Developing"][seed % 5]
        flight_risk = "High" if tenure < 2 and perf == "Developing" else "Medium" if tenure > 8 else "Low"
        ai_score = ai_by_title.get(title, 0)

        # Skills from job catalog or synthetic
        _skill_seeds = ["Python", "SQL", "Excel", "Communication", "Leadership",
                        "Analysis", "Cloud", "Design", "Sales", "HR"]
        skills = [_skill_seeds[(seed + i) % len(_skill_seeds)] for i in range(3)]

        employees.append({
            "id": eid, "name": name, "title": title,
            "function": func, "family": family, "sub_family": sub_family,
            "track": track, "level": level, "geography": geo,
            "manager": mgr_name, "tenure": tenure,
            "performance": perf, "flight_risk": flight_risk,
            "ai_score": ai_score, "skills": skills,
            "single_incumbent": False,  # will be set below
            "redeployment_candidate": ai_score >= 6 and perf in ("Meets", "Exceeds"),
        })

    # Mark single-incumbent roles
    title_counts = {}
    for e in employees:
        title_counts[e["title"]] = title_counts.get(e["title"], 0) + 1
    for e in employees:
        e["single_incumbent"] = title_counts.get(e["title"], 0) == 1

    return employees


# ── Future-state version endpoints ──

class ArchVersion(BaseModel):
    name: str
    description: str = ""
    tree: list = []
    mappings: list = []
    recommended: bool = False


@router.post("/job-architecture/versions")
def save_arch_version(model_id: str, version: ArchVersion):
    """Save a future-state architecture version."""
    vid = str(uuid.uuid4())[:8]
    data = {
        "id": vid,
        "model_id": model_id,
        "name": version.name,
        "description": version.description,
        "tree": version.tree,
        "mappings": version.mappings,
        "recommended": version.recommended,
    }
    fpath = _VERSIONS_DIR / f"{model_id}_{vid}.json"
    fpath.write_text(json.dumps(data, default=str))
    return _safe(data)


@router.get("/job-architecture/versions")
def list_arch_versions(model_id: str):
    """List all saved future-state versions for a model."""
    versions = []
    for f in _VERSIONS_DIR.glob(f"{model_id}_*.json"):
        try:
            versions.append(json.loads(f.read_text()))
        except Exception:
            pass
    return _safe({"versions": versions})


@router.delete("/job-architecture/versions/{version_id}")
def delete_arch_version(version_id: str, model_id: str):
    """Delete a future-state version."""
    for f in _VERSIONS_DIR.glob(f"{model_id}_{version_id}.json"):
        f.unlink()
    return {"status": "deleted"}


@router.put("/job-architecture/versions/{version_id}/recommend")
def toggle_recommend(version_id: str, model_id: str):
    """Toggle recommended status for a version."""
    # Un-recommend all others first
    for f in _VERSIONS_DIR.glob(f"{model_id}_*.json"):
        try:
            data = json.loads(f.read_text())
            data["recommended"] = data["id"] == version_id
            f.write_text(json.dumps(data, default=str))
        except Exception:
            pass
    return {"status": "ok"}
