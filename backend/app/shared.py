"""Shared utilities used by all route modules."""

import numpy as np
import pandas as pd


def _safe(obj):
    """Recursively convert numpy/pandas types to native Python for JSON."""
    if isinstance(obj, dict):
        return {str(k): _safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_safe(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return str(obj)
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


def _j(df, limit=500):
    """Convert DataFrame to list of dicts with all values as strings."""
    if df is None or (isinstance(df, pd.DataFrame) and df.empty):
        return []
    out = df.head(limit).copy()
    for c in out.columns:
        out[c] = out[c].fillna("").astype(str)
    return out.to_dict("records")


def _f(func="All", jf="All", sf="All", cl="All"):
    return {"Function": func, "Job Family": jf, "Sub-Family": sf, "Career Level": cl}


def resolve_mid(model_id: str, request=None) -> str:
    """Resolve a display model_id to a user-scoped internal model_id.
    Uses request.state.user_id from the auth middleware."""
    from app.store import store
    user_id = ""
    if request and hasattr(request, "state") and hasattr(request.state, "user_id"):
        user_id = request.state.user_id
    return store.resolve_model_id(model_id, user_id)


def _job_list_for_model(store, model_id: str):
    from app.helpers import get_series
    if not model_id or model_id not in store.datasets:
        return []
    data = store.get_filtered_data(model_id, _f())
    jobs = []
    for df in [data.get(k, pd.DataFrame()) for k in ["job_catalog", "work_design", "workforce", "org_design"]]:
        if df is not None and not df.empty and "Job Title" in df.columns:
            jobs.extend([str(x).strip() for x in get_series(df, "Job Title").dropna().unique() if str(x).strip()])
    return sorted(set(jobs))
