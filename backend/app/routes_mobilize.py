"""Mobilize routes — roadmap, risk assessment."""

import pandas as pd
from fastapi import APIRouter, Query

from app.store import store, build_ai_priority_scores, build_auto_change_plan
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["mobilize"])


@router.get("/mobilize/roadmap")
def get_roadmap(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    ch, wd, org, op = data["change_management"], data["work_design"], data["org_design"], data["operating_model"]
    auto = build_auto_change_plan(wd, org, op)
    rm = auto if ch.empty else ch
    if rm.empty:
        return {"roadmap": [], "summary": {}, "priority_distribution": {}, "wave_distribution": {}}
    pd_counts = safe_value_counts(get_series(rm, "Priority")) if "Priority" in rm.columns else pd.Series()
    wd_counts = safe_value_counts(get_series(rm, "Wave")) if "Wave" in rm.columns else pd.Series()
    high_pri = int(get_series(rm, "Priority").astype(str).isin(["High", "Critical"]).sum()) if "Priority" in rm.columns else 0
    wave_set = set(get_series(rm, "Wave").dropna().astype(str).str.strip().unique()) if "Wave" in rm.columns else set()
    return _safe({
        "roadmap": _j(rm),
        "summary": {"total": int(len(rm)), "high_priority": high_pri, "waves": int(len(wave_set)), "source": "uploaded" if not ch.empty else "auto"},
        "priority_distribution": {str(k): int(v) for k, v in pd_counts.items()},
        "wave_distribution": {str(k): int(v) for k, v in wd_counts.items()},
    })


@router.get("/mobilize/risk")
def get_risk(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"empty": True, "high_risk_tasks": [], "risk_by_workstream": [], "summary": {}}
    scored = build_ai_priority_scores(wd)
    if scored.empty:
        return {"empty": True, "high_risk_tasks": [], "risk_by_workstream": [], "summary": {}}
    hr = scored[scored["Risk Score"] > 4]
    na = scored[(scored["Logic"] == "Judgment-heavy") | (scored["Interaction"] == "Collaborative")]
    rws = scored.groupby("Workstream", as_index=False)["Risk Score"].mean().sort_values("Risk Score", ascending=False)
    return _safe({
        "high_risk_tasks": _j(hr, 30), "risk_by_workstream": _j(rws),
        "summary": {"high_risk_count": int(len(hr)), "no_automate_count": int(len(na)), "avg_risk": round(float(scored["Risk Score"].mean()), 1), "total_assessed": int(len(scored))},
    })
