"""Simulate routes — scenario comparison, readiness assessment."""

from fastapi import APIRouter, Query

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
