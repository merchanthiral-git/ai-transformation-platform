"""Overview routes — workforce snapshot, job architecture, filter options, benchmarks."""

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.store import store, sync_work_design, compute_readiness_score, get_manager_candidates
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _j, _f, _job_list_for_model
from app.benchmarks import get_benchmarks, INDUSTRY_BENCHMARKS

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/filter-options")
def get_filter_options(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All"):
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        return {"functions": ["All"], "job_families": ["All"], "sub_families": ["All"], "career_levels": ["All"]}
    from app.helpers import build_filter_dimension_source, clean_options
    b = store.datasets[model_id]
    store.ensure_model_bundle(model_id)
    combined = build_filter_dimension_source(
        b.get("workforce", pd.DataFrame()),
        store.build_org_source(model_id),
        store.build_internal_job_catalog(model_id),
        b.get("work_design", pd.DataFrame()),
        b.get("operating_model", pd.DataFrame()),
        b.get("change_management", pd.DataFrame()),
    )
    if combined.empty:
        return {"functions": ["All"], "job_families": ["All"], "sub_families": ["All"], "career_levels": ["All"]}
    funcs = clean_options(get_series(combined, "Function ID"))
    filtered = combined.copy()
    if fn != "All":
        filtered = filtered[get_series(filtered, "Function ID").astype(str) == fn]
    jfs = clean_options(get_series(filtered, "Job Family"))
    if jf != "All":
        filtered = filtered[get_series(filtered, "Job Family").astype(str) == jf]
    sfs = clean_options(get_series(filtered, "Sub-Family"))
    if sf != "All":
        filtered = filtered[get_series(filtered, "Sub-Family").astype(str) == sf]
    cls = clean_options(get_series(filtered, "Career Level"))
    return {"functions": funcs, "job_families": jfs, "sub_families": sfs, "career_levels": cls}


@router.get("/job-options")
def get_job_options(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        return {"jobs": []}
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    jobs = []
    for df in [data.get(k, pd.DataFrame()) for k in ["job_catalog", "work_design", "workforce", "org_design"]]:
        if df is not None and not df.empty and "Job Title" in df.columns:
            jobs.extend([str(x).strip() for x in get_series(df, "Job Title").dropna().unique() if str(x).strip()])
    return {"jobs": sorted(set(jobs))}


def _build_upload_insights(wf, wd, jc, org, fc, ai, avg_span, high_ai, readiness_score, cov):
    """Generate auto-observations from uploaded data for the Upload Intelligence panel."""
    if wf.empty and org.empty:
        return None

    emp_count = int(len(wf)) if not wf.empty else int(len(org))
    src = wf if not wf.empty else org

    # Function count
    func_count = int(get_series(src, "Function ID").nunique()) if "Function ID" in src.columns else 0

    # Job family count
    jf_count = int(get_series(src, "Job Family").nunique()) if "Job Family" in src.columns else 0

    # Unique titles
    title_count = int(get_series(src, "Job Title").nunique()) if "Job Title" in src.columns else 0

    # Career levels
    level_count = 0
    level_dist = []
    if "Career Level" in src.columns:
        lvls = safe_value_counts(get_series(src, "Career Level"))
        level_count = int(len(lvls))
        level_dist = [{"level": str(k), "count": int(v)} for k, v in lvls.items()]

    # Largest function
    largest_func = ""
    largest_func_count = 0
    largest_func_pct = 0
    if len(fc) > 0:
        largest_func = str(fc.index[0])
        largest_func_count = int(fc.iloc[0])
        largest_func_pct = round(largest_func_count / max(emp_count, 1) * 100)

    # Data completeness — check key columns for blanks
    expected_cols = ["Employee ID", "Employee Name", "Job Title", "Function ID", "Career Level", "Career Track", "Manager ID"]
    missing_fields = []
    completeness_pct = 100
    if not src.empty:
        total_cells = 0
        filled_cells = 0
        for col in expected_cols:
            if col in src.columns:
                total_cells += len(src)
                filled = int(get_series(src, col).dropna().astype(str).str.strip().ne("").sum())
                filled_cells += filled
                if filled < len(src) * 0.5:
                    missing_fields.append(col)
            else:
                missing_fields.append(col)
                total_cells += len(src)
        completeness_pct = round(filled_cells / max(total_cells, 1) * 100)

    # Data quality issues
    quality_issues = []
    if not src.empty and "Job Title" in src.columns:
        titles = get_series(src, "Job Title").astype(str).str.strip()
        # Duplicate-ish titles (case-insensitive)
        lower_titles = titles.str.lower()
        unique_lower = lower_titles.nunique()
        unique_exact = titles.nunique()
        if unique_exact > unique_lower:
            quality_issues.append(f"{unique_exact - unique_lower} job titles differ only by capitalization")
        # Blank titles
        blank_titles = int((titles == "").sum() + titles.isna().sum())
        if blank_titles > 0:
            quality_issues.append(f"{blank_titles} employees have blank job titles")

    if not src.empty and "Manager ID" in src.columns:
        blank_mgr = int(get_series(src, "Manager ID").fillna("").astype(str).str.strip().eq("").sum())
        if blank_mgr > emp_count * 0.3:
            quality_issues.append(f"{blank_mgr} employees ({round(blank_mgr/max(emp_count,1)*100)}%) missing manager assignment")

    # Suggested next steps
    suggestions = []
    if not wd.empty:
        suggestions.append({"text": f"You have {len(wd)} tasks mapped — visit the Design tab to start AI impact scoring", "target": "design"})
    else:
        suggestions.append({"text": "Your data has job titles but no task breakdowns — go to Design to start task decomposition", "target": "design"})

    if func_count >= 2:
        suggestions.append({"text": f"We detected {func_count} functions — visit Diagnose to run an org health assessment", "target": "scan"})

    if title_count >= 10:
        suggestions.append({"text": f"Your job architecture has {title_count} unique titles — visit Job Architecture to validate the structure", "target": "jobarch"})

    if readiness_score > 0:
        suggestions.append({"text": f"AI Readiness is {readiness_score}/100 — visit Simulate to model transformation scenarios", "target": "simulate"})

    # Text observations
    observations = []
    observations.append(f"We detected {emp_count:,} employees across {func_count} functions and {jf_count} job families")
    if largest_func:
        observations.append(f"Your largest function is {largest_func} with {largest_func_count:,} people ({largest_func_pct}% of org)")
    observations.append(f"We identified {title_count} unique job titles across {level_count} career levels")
    observations.append(f"Average span of control: {avg_span} (industry benchmark: 5-7)")
    if high_ai > 0:
        observations.append(f"{high_ai}% of roles have high AI automation potential based on task characteristics")
    observations.append(f"Data completeness: {completeness_pct}%{' — missing: ' + ', '.join(missing_fields) if missing_fields else ''}")
    if quality_issues:
        observations.append(f"Potential data quality issues: {'; '.join(quality_issues)}")

    return {
        "observations": observations,
        "suggestions": suggestions,
        "quality_issues": quality_issues,
        "missing_fields": missing_fields,
        "completeness_pct": completeness_pct,
        "level_distribution": level_dist,
        "emp_count": emp_count,
        "func_count": func_count,
        "title_count": title_count,
        "level_count": level_count,
        "largest_func": largest_func,
        "largest_func_count": largest_func_count,
        "largest_func_pct": largest_func_pct,
        "readiness_score": readiness_score,
    }


@router.get("/overview")
def get_overview(model_id: str, fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        raise HTTPException(404, "Model not found")
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    wf, wd, org, jc = data["workforce"], data["work_design"], data["org_design"], data["job_catalog"]
    mgr_df = get_manager_candidates(org)
    avg_span = round(float(pd.to_numeric(get_series(mgr_df, "Direct Reports"), errors="coerce").fillna(0).mean()), 1) if not mgr_df.empty else 0
    high_ai = 0.0
    if not wd.empty:
        wdt = sync_work_design(wd)
        high_count = int(get_series(wdt, "AI Impact").astype(str).eq("High").sum())
        total_count = len(wdt)
        high_ai = round(high_count / total_count * 100, 1) if total_count else 0
    rt, rd = compute_readiness_score(data)
    fc = safe_value_counts(get_series(wf, "Function ID"))
    ai = safe_value_counts(get_series(wd, "AI Impact"))
    cov = {}
    for k, lbl in {"workforce": "Workforce", "job_catalog": "Job Catalog", "work_design": "Work Design", "org_design": "Org Design", "operating_model": "Operating Model", "change_management": "Change Mgmt"}.items():
        df = data.get(k, pd.DataFrame())
        cov[k] = {"label": lbl, "ready": not df.empty, "rows": int(len(df))}
    # Collect employee names for employee view
    employee_names = sorted([str(x).strip() for x in get_series(wf, "Employee Name").dropna().unique() if str(x).strip()][:200]) if not wf.empty else []
    # Upload intelligence — auto-generated insights
    try:
        insights = _build_upload_insights(wf, wd, jc, org, fc, ai, avg_span, high_ai, rt, cov)
    except Exception:
        insights = None

    return _safe({
        "kpis": {
            "employees": int(len(wf)) if not wf.empty else int(len(org)),
            "roles": int(get_series(wf, "Job Title").nunique()) if not wf.empty else int(len(jc)),
            "tasks_mapped": int(len(wd)),
            "avg_span": float(avg_span),
            "high_ai_pct": float(high_ai),
            "readiness_score": int(rt),
            "readiness_tier": "Advanced" if rt >= 70 else "Emerging" if rt >= 40 else "Early",
        },
        "readiness_dims": {str(k): int(v) for k, v in rd.items()},
        "func_distribution": [{"name": str(k), "value": int(v)} for k, v in fc.items()],
        "ai_distribution": [{"name": str(k), "value": int(v)} for k, v in ai.items()],
        "data_coverage": cov,
        "employee_names": employee_names,
        "upload_insights": insights,
    })


@router.get("/overview/employees")
def get_employee_records(model_id: str = "Demo_Model", fn: str = Query("All", alias="func"), jf: str = "All", sf: str = "All", cl: str = "All"):
    """Return full employee records for org restructuring, org chart, and similar tools."""
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        raise HTTPException(404, "Model not found")
    data = store.get_filtered_data(model_id, _f(fn, jf, sf, cl))
    wf = data["workforce"]
    org = data["org_design"]
    source = wf if not wf.empty else org
    if source.empty:
        return _safe({"employees": [], "total": 0})
    records = []
    for _, r in source.iterrows():
        records.append({
            "id": str(r.get("Employee ID", "")),
            "name": str(r.get("Employee Name", "")),
            "title": str(r.get("Job Title", "")),
            "function": str(r.get("Function ID", "")),
            "level": str(r.get("Career Level", "")),
            "track": str(r.get("Career Track", "P")),
            "manager_id": str(r.get("Manager ID", "")),
            "comp": float(pd.to_numeric(r.get("Base Pay", 0), errors="coerce") or 0),
            "tenure": float(pd.to_numeric(r.get("Tenure", r.get("tenure", 0)), errors="coerce") or 0),
            "geography": str(r.get("Geography", "")),
            "department": str(r.get("Department", "")),
            "sub_family": str(r.get("Sub-Family", "")),
        })
    return _safe({"employees": records, "total": len(records)})


@router.get("/benchmarks")
def get_benchmark_data(industry: str = "technology", employees: int = 200):
    """Return industry benchmark comparison data."""
    return _safe(get_benchmarks(industry, employees))


@router.get("/benchmarks/industries")
def list_benchmark_industries():
    """List available benchmark industries."""
    return _safe({
        "industries": [{"id": k, "label": v["label"], "icon": v.get("icon", "")} for k, v in INDUSTRY_BENCHMARKS.items()]
    })
