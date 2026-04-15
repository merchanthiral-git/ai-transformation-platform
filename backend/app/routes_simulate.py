"""Simulate routes — scenario comparison, readiness assessment, custom sensitivity analysis."""

from fastapi import APIRouter, Query, Body

from app.store import store, sync_work_design, enrich_work_design_defaults, compute_readiness_score
from app.helpers import get_series
from app.shared import _safe, _f

router = APIRouter(prefix="/api", tags=["simulate"])


@router.get("/simulate/scenarios")
def get_scenarios(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    import pandas as pd
    wd = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))["work_design"]
    if wd.empty:
        return {"scenarios": {}}
    results = {}
    for sc in ["Conservative", "Balanced", "Transformative"]:
        t = sync_work_design(enrich_work_design_defaults(wd.copy(), sc))
        ch = float(pd.to_numeric(get_series(t, "Est Hours/Week"), errors="coerce").fillna(0).sum())
        sp = float(pd.to_numeric(get_series(t, "Time Saved %"), errors="coerce").fillna(0).sum())
        tp = float(pd.to_numeric(get_series(t, "Current Time Spent %"), errors="coerce").fillna(0).sum())
        rel = sp / tp * ch if tp else 0
        results[sc] = {
            "current_hrs": round(ch, 1), "future_hrs": round(ch - rel, 1), "released_hrs": round(rel, 1),
            "time_saved_pct": round(sp / tp * 100, 1) if tp else 0,
            "high_ai_tasks": int((get_series(t, "AI Impact").astype(str) == "High").sum()),
        }
    return _safe({"scenarios": results})


@router.get("/simulate/readiness")
def get_readiness(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    total, dims = compute_readiness_score(data)
    return _safe({
        "score": int(total), "total": int(total),
        "tier": "Advanced" if total >= 70 else "Emerging" if total >= 40 else "Early",
        "dimensions": {str(k): int(v) for k, v in dims.items()},
        "dims": {str(k): int(v) for k, v in dims.items()},
    })


@router.post("/simulate/custom")
async def custom_scenario(model_id: str = Query(...), body: dict = Body(...)):
    """Build a custom scenario from user parameters with sensitivity analysis."""
    adoption_rate = body.get("adoption_rate", 50)  # 0-100
    timeline_months = body.get("timeline_months", 18)  # 6-36
    investment = body.get("investment", 500000)  # dollar amount
    scope = body.get("scope", "all")  # "all" or list of functions

    # Simple sensitivity model
    base_savings_pct = adoption_rate * 0.4  # higher adoption = more savings
    timeline_factor = min(timeline_months / 18, 1.5)  # longer timeline = higher eventual savings
    roi_multiplier = base_savings_pct * timeline_factor / 100

    annual_savings = investment * roi_multiplier * 2.5
    payback_months = round(investment / max(annual_savings / 12, 1))
    three_year_roi = round((annual_savings * 3 - investment) / max(investment, 1) * 100)

    # Adoption curve (quarterly)
    quarters = list(range(1, int(timeline_months / 3) + 1))
    adoption_curve = [min(adoption_rate, round(adoption_rate * (1 - 0.7 ** q))) for q in quarters]

    return {
        "scenario_name": f"Custom ({adoption_rate}% adoption, {timeline_months}mo)",
        "adoption_rate": adoption_rate,
        "timeline_months": timeline_months,
        "investment": investment,
        "annual_savings": round(annual_savings),
        "payback_months": min(payback_months, 60),
        "three_year_roi": three_year_roi,
        "adoption_curve": [{"quarter": f"Q{q}", "adoption_pct": a} for q, a in zip(quarters, adoption_curve)],
        "risk_level": "low" if adoption_rate < 40 else "medium" if adoption_rate < 70 else "high",
    }
