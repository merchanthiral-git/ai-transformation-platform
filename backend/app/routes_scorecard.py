"""Org Health Scorecard — API endpoints.

Computes structural health from JA data, workforce data, and
reporting structures. Persists snapshots for trend tracking.
"""

import uuid
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.auth import SessionLocal
from app.models_scorecard import ScorecardSnapshot
from app.store import store, get_manager_candidates
from app.helpers import get_series

router = APIRouter(prefix="/api/scorecard", tags=["org-health-scorecard"])


def _db():
    return SessionLocal()

def _now():
    return datetime.now(timezone.utc)

def _uid():
    return uuid.uuid4().hex[:12]


# ═══════════════════════════════════════════════════════════════════
#  COMPUTE SCORECARD
# ═══════════════════════════════════════════════════════════════════

@router.post("/compute")
def compute_scorecard(project_id: str, model_id: str = "", tag: str = "",
                       save: bool = True):
    """Compute all 6 dimensions from current data and optionally save a snapshot."""
    mid = model_id or "Demo_Model"
    mid = store.resolve_model_id(mid)
    if mid not in store.datasets:
        return {"error": "No data loaded"}

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    jc = data.get("job_catalog")

    if wf is None or wf.empty:
        return {"error": "No workforce data"}

    emp_count = len(wf)
    metrics = {}
    scores = {}
    issues = []
    strengths = []

    # ── Dimension 1: Structural Clarity ──
    d1_metrics = []
    roles_with_arch = 0
    roles_with_jd = 0
    total_roles = 0
    if jc is not None and not jc.empty:
        total_roles = len(jc.drop_duplicates("Job Title") if "Job Title" in jc.columns else jc)
        arch_cols = ["Function ID", "Job Family", "Sub-Family", "Career Track", "Career Level"]
        if all(c in jc.columns for c in arch_cols):
            complete = jc.dropna(subset=arch_cols)
            roles_with_arch = len(complete.drop_duplicates("Job Title")) if "Job Title" in complete.columns else 0
        if "Job Description" in jc.columns:
            roles_with_jd = int((jc["Job Description"].fillna("").str.len() > 10).sum())

    arch_pct = round(roles_with_arch / max(total_roles, 1) * 100, 1)
    jd_pct = round(roles_with_jd / max(total_roles, 1) * 100, 1)

    # Duplicate titles
    if "Job Title" in wf.columns:
        title_fam = wf.groupby([get_series(wf, "Job Title"), get_series(wf, "Job Family")]).size() if "Job Family" in wf.columns else None
        titles = get_series(wf, "Job Title").dropna().unique()
        dup_count = 0  # simplified
    else:
        dup_count = 0

    # Ghost roles
    ghost = 0
    if jc is not None and not jc.empty and "Job Title" in jc.columns and "Job Title" in wf.columns:
        jc_titles = set(get_series(jc, "Job Title").dropna().unique())
        wf_titles = set(get_series(wf, "Job Title").dropna().unique())
        ghost = len(jc_titles - wf_titles)

    d1_metrics = [
        {"name": "Architecture completeness", "value": f"{arch_pct}%", "numeric": arch_pct, "status": "green" if arch_pct >= 80 else "amber" if arch_pct >= 50 else "red", "benchmark": "80%"},
        {"name": "JD coverage", "value": f"{jd_pct}%", "numeric": jd_pct, "status": "green" if jd_pct >= 70 else "amber" if jd_pct >= 40 else "red", "benchmark": "70%"},
        {"name": "Ghost roles", "value": str(ghost), "numeric": ghost, "status": "green" if ghost < 5 else "amber" if ghost < 15 else "red", "benchmark": "<5"},
    ]
    d1_score = round((min(arch_pct, 100) * 0.4 + min(jd_pct, 100) * 0.3 + max(100 - ghost * 5, 0) * 0.3), 1)
    metrics["structural_clarity"] = {"metrics": d1_metrics}
    scores["structural_clarity"] = min(d1_score, 100)
    if arch_pct < 50:
        issues.append({"dimension": "Structural Clarity", "issue": f"Only {arch_pct}% of roles have complete architecture"})
    if arch_pct >= 80:
        strengths.append({"dimension": "Structural Clarity", "strength": f"{arch_pct}% architecture completeness"})

    # ── Dimension 2: Span & Layer Discipline ──
    mgr_df = get_manager_candidates(wf) if wf is not None else None
    spans = []
    if mgr_df is not None and not mgr_df.empty and "Direct Reports" in mgr_df.columns:
        spans = mgr_df["Direct Reports"].dropna().astype(int).tolist()
    median_span = sorted(spans)[len(spans) // 2] if spans else 0
    spans_of_one = sum(1 for s in spans if s == 1)
    mgr_count = len(spans)
    mgr_ratio = round(mgr_count / max(emp_count, 1) * 100, 1)

    # Layer count (simplified)
    layers = 0
    if "Career Level" in wf.columns:
        layers = int(get_series(wf, "Career Level").nunique())

    d2_metrics = [
        {"name": "Median span of control", "value": str(median_span), "numeric": median_span, "status": "green" if 5 <= median_span <= 8 else "amber" if 3 <= median_span <= 12 else "red", "benchmark": "5-8"},
        {"name": "Spans of one", "value": str(spans_of_one), "numeric": spans_of_one, "status": "green" if spans_of_one < 3 else "amber" if spans_of_one < 8 else "red", "benchmark": "<3"},
        {"name": "Management ratio", "value": f"{mgr_ratio}%", "numeric": mgr_ratio, "status": "green" if mgr_ratio <= 15 else "amber" if mgr_ratio <= 25 else "red", "benchmark": "≤15%"},
        {"name": "Layer count", "value": str(layers), "numeric": layers, "status": "green" if layers <= 7 else "amber" if layers <= 10 else "red", "benchmark": "≤7"},
    ]
    span_ok = 1 if 5 <= median_span <= 8 else 0.5 if 3 <= median_span <= 12 else 0
    d2_score = round((span_ok * 30 + max(100 - spans_of_one * 10, 0) * 0.25 + max(100 - (mgr_ratio - 15) * 3, 0) * 0.25 + max(100 - (layers - 7) * 10, 0) * 0.2), 1)
    d2_score = min(max(d2_score, 0), 100)
    metrics["span_layer_discipline"] = {"metrics": d2_metrics}
    scores["span_layer_discipline"] = d2_score
    if spans_of_one > 5:
        issues.append({"dimension": "Span & Layer", "issue": f"{spans_of_one} managers with only 1 direct report"})

    # ── Dimension 3: Leveling Integrity ──
    level_dist = {}
    if "Career Level" in wf.columns:
        level_dist = dict(get_series(wf, "Career Level").value_counts())
    total_leveled = sum(level_dist.values())
    max_level_pct = round(max(level_dist.values()) / max(total_leveled, 1) * 100, 1) if level_dist else 0
    track_dist = {}
    if "Career Track" in wf.columns:
        track_dist = dict(get_series(wf, "Career Track").value_counts())
    ic_count = track_dist.get("IC", 0)
    mgr_track_count = track_dist.get("Manager", 0) + track_dist.get("Executive", 0)
    ic_ratio = round(ic_count / max(ic_count + mgr_track_count, 1) * 100, 1)

    d3_metrics = [
        {"name": "Level concentration (max)", "value": f"{max_level_pct}%", "numeric": max_level_pct, "status": "green" if max_level_pct <= 25 else "amber" if max_level_pct <= 35 else "red", "benchmark": "≤25%"},
        {"name": "IC:Manager ratio", "value": f"{ic_ratio}:{100 - ic_ratio}", "numeric": ic_ratio, "status": "green" if 65 <= ic_ratio <= 85 else "amber" if 55 <= ic_ratio <= 90 else "red", "benchmark": "70:30"},
        {"name": "Distinct levels", "value": str(len(level_dist)), "numeric": len(level_dist), "status": "green" if 5 <= len(level_dist) <= 10 else "amber", "benchmark": "5-10"},
    ]
    d3_score = round(max(100 - (max_level_pct - 25) * 2, 0) * 0.5 + (100 if 65 <= ic_ratio <= 85 else 60) * 0.3 + (100 if 5 <= len(level_dist) <= 10 else 60) * 0.2, 1)
    d3_score = min(max(d3_score, 0), 100)
    metrics["leveling_integrity"] = {"metrics": d3_metrics}
    scores["leveling_integrity"] = d3_score

    # ── Dimension 4: Workforce Composition ──
    role_count = int(get_series(wf, "Job Title").nunique()) if "Job Title" in wf.columns else 0
    avg_per_role = round(emp_count / max(role_count, 1), 1)
    single_inc = 0
    if "Job Title" in wf.columns:
        tc = get_series(wf, "Job Title").value_counts()
        single_inc = int((tc == 1).sum())

    d4_metrics = [
        {"name": "Role count", "value": str(role_count), "numeric": role_count, "status": "green", "benchmark": "—"},
        {"name": "Employee count", "value": str(emp_count), "numeric": emp_count, "status": "green", "benchmark": "—"},
        {"name": "Avg incumbents/role", "value": str(avg_per_role), "numeric": avg_per_role, "status": "green" if avg_per_role >= 3 else "amber" if avg_per_role >= 1.5 else "red", "benchmark": "≥3"},
        {"name": "Single-incumbent roles", "value": str(single_inc), "numeric": single_inc, "status": "green" if single_inc < 5 else "amber" if single_inc < 15 else "red", "benchmark": "<5"},
    ]
    d4_score = round(min(avg_per_role / 5 * 100, 100) * 0.5 + max(100 - single_inc * 3, 0) * 0.5, 1)
    d4_score = min(max(d4_score, 0), 100)
    metrics["workforce_composition"] = {"metrics": d4_metrics}
    scores["workforce_composition"] = d4_score
    if single_inc > 10:
        issues.append({"dimension": "Workforce Composition", "issue": f"{single_inc} single-incumbent roles (key-person risk)"})

    # ── Dimension 5: Career Mobility ──
    # Simplified — real implementation would use historical data
    d5_score = 55.0  # baseline when no historical data
    d5_metrics = [
        {"name": "Career paths defined", "value": "Pending", "numeric": 0, "status": "amber", "benchmark": "Requires historical data"},
        {"name": "Lateral mobility rate", "value": "Pending", "numeric": 0, "status": "amber", "benchmark": "Requires historical data"},
    ]
    metrics["career_mobility"] = {"metrics": d5_metrics}
    scores["career_mobility"] = d5_score

    # ── Dimension 6: Transformation Readiness ──
    completeness = arch_pct * 0.5 + jd_pct * 0.3 + (100 if ghost < 5 else 60) * 0.2
    d6_score = round(min(completeness, 100), 1)
    d6_metrics = [
        {"name": "Architecture completeness", "value": f"{arch_pct}%", "numeric": arch_pct, "status": "green" if arch_pct >= 80 else "amber" if arch_pct >= 50 else "red", "benchmark": "80%"},
        {"name": "Integration gap", "value": f"{100 - arch_pct:.0f}%", "numeric": 100 - arch_pct, "status": "green" if arch_pct >= 80 else "red", "benchmark": "<20%"},
    ]
    metrics["transformation_readiness"] = {"metrics": d6_metrics}
    scores["transformation_readiness"] = d6_score
    if d6_score < 50:
        issues.append({"dimension": "Transformation Readiness", "issue": "Architecture too incomplete for transformation work"})
    if d6_score >= 75:
        strengths.append({"dimension": "Transformation Readiness", "strength": "Organization structurally prepared for change"})

    # ── Overall score ──
    weights = {k: 1.0 for k in scores}
    total_weight = sum(weights.values())
    overall = round(sum(scores[k] * weights[k] for k in scores) / max(total_weight, 1), 1)

    # ── Save snapshot ──
    snapshot_id = None
    if save:
        db = _db()
        try:
            snap = ScorecardSnapshot(
                id=_uid(), project_id=project_id, overall_score=overall,
                snapshot_tag=tag or f"Snapshot {_now().strftime('%Y-%m-%d')}",
                structural_clarity=scores["structural_clarity"],
                span_layer_discipline=scores["span_layer_discipline"],
                leveling_integrity=scores["leveling_integrity"],
                workforce_composition=scores["workforce_composition"],
                career_mobility=scores["career_mobility"],
                transformation_readiness=scores["transformation_readiness"],
                weights=weights, metrics=metrics,
                top_issues=issues[:5], top_strengths=strengths[:5],
            )
            db.add(snap)
            db.commit()
            snapshot_id = snap.id
        finally:
            db.close()

    return {
        "overall_score": overall,
        "dimensions": {k: {"score": scores[k], "metrics": metrics[k]["metrics"]} for k in scores},
        "top_issues": issues[:5],
        "top_strengths": strengths[:5],
        "snapshot_id": snapshot_id,
        "employee_count": emp_count,
        "role_count": role_count,
    }


# ═══════════════════════════════════════════════════════════════════
#  SNAPSHOTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/snapshots")
def list_snapshots(project_id: str):
    db = _db()
    try:
        snaps = db.query(ScorecardSnapshot).filter_by(project_id=project_id)\
            .order_by(ScorecardSnapshot.created_at.desc()).all()
        return [{
            "id": s.id, "tag": s.snapshot_tag, "overall_score": s.overall_score,
            "dimensions": {
                "structural_clarity": s.structural_clarity,
                "span_layer_discipline": s.span_layer_discipline,
                "leveling_integrity": s.leveling_integrity,
                "workforce_composition": s.workforce_composition,
                "career_mobility": s.career_mobility,
                "transformation_readiness": s.transformation_readiness,
            },
            "top_issues": s.top_issues, "top_strengths": s.top_strengths,
            "created_at": str(s.created_at),
        } for s in snaps]
    finally:
        db.close()


@router.get("/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    db = _db()
    try:
        s = db.query(ScorecardSnapshot).get(snapshot_id)
        if not s:
            raise HTTPException(404, "Snapshot not found")
        return {
            "id": s.id, "tag": s.snapshot_tag, "overall_score": s.overall_score,
            "dimensions": {
                "structural_clarity": {"score": s.structural_clarity, "metrics": (s.metrics or {}).get("structural_clarity", {}).get("metrics", [])},
                "span_layer_discipline": {"score": s.span_layer_discipline, "metrics": (s.metrics or {}).get("span_layer_discipline", {}).get("metrics", [])},
                "leveling_integrity": {"score": s.leveling_integrity, "metrics": (s.metrics or {}).get("leveling_integrity", {}).get("metrics", [])},
                "workforce_composition": {"score": s.workforce_composition, "metrics": (s.metrics or {}).get("workforce_composition", {}).get("metrics", [])},
                "career_mobility": {"score": s.career_mobility, "metrics": (s.metrics or {}).get("career_mobility", {}).get("metrics", [])},
                "transformation_readiness": {"score": s.transformation_readiness, "metrics": (s.metrics or {}).get("transformation_readiness", {}).get("metrics", [])},
            },
            "weights": s.weights, "interpretation": s.interpretation,
            "dimension_interpretations": s.dimension_interpretations,
            "top_issues": s.top_issues, "top_strengths": s.top_strengths,
            "created_at": str(s.created_at),
        }
    finally:
        db.close()
