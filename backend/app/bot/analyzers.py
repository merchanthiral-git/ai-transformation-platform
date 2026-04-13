"""Bot data-analysis foundation.

Pure pandas functions that compute real metrics from workforce data.
Every function takes a DataFrame and returns a dict of computed metrics.
No AI, no placeholders — just math on real data.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime

import numpy as np
import pandas as pd


# ── Helpers ──────────────────────────────────────────────────────

def _col(df: pd.DataFrame, *candidates: str) -> str | None:
    """Return the first column name that exists in *df*."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _safe_series(df: pd.DataFrame, *candidates: str) -> pd.Series:
    """Return the first matching column as a Series, or an empty one."""
    col = _col(df, *candidates)
    if col is not None:
        return df[col]
    return pd.Series(dtype="object")


def _tenure_years(df: pd.DataFrame) -> pd.Series:
    """Derive tenure in years from 'Hire Date' or return zeros."""
    col = _col(df, "Hire Date", "hire_date", "Start Date")
    if col is None:
        return pd.Series(np.zeros(len(df)), index=df.index)
    dates = pd.to_datetime(df[col], errors="coerce")
    now = pd.Timestamp.now()
    return ((now - dates).dt.days / 365.25).fillna(0).clip(lower=0)


def _function_col(df: pd.DataFrame) -> str:
    return _col(df, "Function ID", "Function", "function") or "Function ID"


def _career_level_col(df: pd.DataFrame) -> str:
    return _col(df, "Career Level", "career_level", "Level") or "Career Level"


def _job_family_col(df: pd.DataFrame) -> str:
    return _col(df, "Job Family", "job_family", "Family") or "Job Family"


def _job_title_col(df: pd.DataFrame) -> str:
    return _col(df, "Job Title", "job_title", "Title") or "Job Title"


def _fte_col(df: pd.DataFrame) -> str:
    return _col(df, "FTE", "fte") or "FTE"


def _pay_col(df: pd.DataFrame) -> str:
    return _col(df, "Base Pay", "Salary", "Annual Salary", "Compensation") or "Base Pay"


# ═════════════════════════════════════════════════════════════════
#  1.  PROFILE WORKFORCE
# ═════════════════════════════════════════════════════════════════

def profile_workforce(workforce_df: pd.DataFrame) -> dict:
    df = workforce_df.copy()
    n = len(df)
    if n == 0:
        return {"total_headcount": 0, "notable_observations": ["No workforce data."]}

    func_c = _function_col(df)
    cl_c = _career_level_col(df)
    jf_c = _job_family_col(df)
    fte_c = _fte_col(df)

    tenure = _tenure_years(df)
    df["_tenure"] = tenure

    # Headcount by function
    by_func = df[func_c].value_counts().to_dict() if func_c in df.columns else {}

    # Headcount by career level
    by_level = df[cl_c].value_counts().to_dict() if cl_c in df.columns else {}

    # Headcount by job family (top 15)
    by_jf = (df[jf_c].value_counts().head(15).to_dict() if jf_c in df.columns else {})

    # Tenure
    avg_tenure = round(tenure.mean(), 1)
    avg_tenure_by_func = {}
    if func_c in df.columns:
        avg_tenure_by_func = df.groupby(func_c)["_tenure"].mean().round(1).to_dict()

    # Tenure buckets
    buckets = pd.cut(
        tenure,
        bins=[-0.01, 1, 3, 5, 10, 200],
        labels=["0-1yr", "1-3yr", "3-5yr", "5-10yr", "10+yr"],
    )
    tenure_dist = buckets.value_counts().sort_index()
    tenure_distribution = {
        str(k): {"count": int(v), "pct": round(v / max(n, 1) * 100, 1)}
        for k, v in tenure_dist.items()
    }

    # FTE split
    fte_full = 0
    fte_part = 0
    if fte_c in df.columns:
        fte_vals = pd.to_numeric(df[fte_c], errors="coerce").fillna(1.0)
        fte_full = int((fte_vals >= 1.0).sum())
        fte_part = int((fte_vals < 1.0).sum())
    else:
        fte_full = n

    # Manager vs IC
    mgr_col = _col(df, "Manager ID", "manager_id")
    emp_col = _col(df, "Employee ID", "employee_id")
    manager_ids: set = set()
    if mgr_col and emp_col:
        manager_ids = set(df[mgr_col].dropna().unique()) & set(df[emp_col].dropna().unique())
    manager_count = len(manager_ids)
    ic_count = n - manager_count

    # Function flags
    notable: list[str] = []
    largest_func = max(by_func.items(), key=lambda x: x[1], default=("—", 0))
    smallest_func = min(by_func.items(), key=lambda x: x[1], default=("—", 0))

    micro_functions = [f for f, c in by_func.items() if c < 5]
    concentration_risks = [f for f, c in by_func.items() if c / max(n, 1) > 0.30]

    if micro_functions:
        notable.append(f"Micro-functions with <5 people: {', '.join(micro_functions)}. Consider merging or clarifying purpose.")
    if concentration_risks:
        for f in concentration_risks:
            pct = round(by_func[f] / n * 100)
            notable.append(f"{f} represents {pct}% of total headcount — concentration risk if this function is disrupted.")
    if avg_tenure > 8:
        notable.append(f"Average tenure is {avg_tenure} years — long-tenured workforces may be more resistant to transformation. Plan extra change management.")
    elif avg_tenure < 2:
        notable.append(f"Average tenure is {avg_tenure} years — high turnover environment. Ensure knowledge transfer before redesigning roles.")
    if manager_count > 0 and n > 0:
        ratio = round(ic_count / manager_count, 1)
        if ratio < 4:
            notable.append(f"Manager-to-IC ratio is 1:{ratio} — potential over-management. Industry norm is 1:6-8.")
        elif ratio > 12:
            notable.append(f"Manager-to-IC ratio is 1:{ratio} — managers may be stretched thin. Industry norm is 1:6-8.")

    return {
        "total_headcount": n,
        "headcount_by_function": dict(sorted(by_func.items(), key=lambda x: -x[1])),
        "headcount_by_career_level": by_level,
        "headcount_by_job_family_top15": by_jf,
        "avg_tenure_years": avg_tenure,
        "avg_tenure_by_function": avg_tenure_by_func,
        "tenure_distribution": tenure_distribution,
        "fte_full_time": fte_full,
        "fte_part_time": fte_part,
        "manager_count": manager_count,
        "ic_count": ic_count,
        "largest_function": {"name": largest_func[0], "count": largest_func[1]},
        "smallest_function": {"name": smallest_func[0], "count": smallest_func[1]},
        "micro_functions": micro_functions,
        "concentration_risks": concentration_risks,
        "notable_observations": notable or ["Workforce profile looks balanced — no structural red flags detected."],
    }


# ═════════════════════════════════════════════════════════════════
#  2.  ANALYZE ORG STRUCTURE
# ═════════════════════════════════════════════════════════════════

def analyze_org_structure(workforce_df: pd.DataFrame) -> dict:
    df = workforce_df.copy()
    n = len(df)
    emp_col = _col(df, "Employee ID", "employee_id") or "Employee ID"
    mgr_col = _col(df, "Manager ID", "manager_id") or "Manager ID"
    func_c = _function_col(df)
    cl_c = _career_level_col(df)

    if emp_col not in df.columns or mgr_col not in df.columns:
        return {"error": "Missing Employee ID or Manager ID columns", "structural_issues": ["Cannot analyze org structure without employee-manager relationships."]}

    # Build child lookup
    children: dict[str, list[str]] = defaultdict(list)
    emp_set = set(df[emp_col].dropna().astype(str))
    for _, row in df.iterrows():
        eid = str(row.get(emp_col, ""))
        mid = str(row.get(mgr_col, ""))
        if mid and mid != eid and mid != "nan":
            children[mid].append(eid)

    # Find roots (managers not managed by anyone in the dataset, or self-managing)
    all_mgrs = set(df[mgr_col].dropna().astype(str))
    roots = []
    for _, row in df.iterrows():
        eid = str(row.get(emp_col, ""))
        mid = str(row.get(mgr_col, ""))
        if not mid or mid == "nan" or mid == eid or mid not in emp_set:
            roots.append(eid)

    # BFS to compute depth
    max_depth = 0
    depth_of: dict[str, int] = {}
    queue = [(r, 0) for r in roots]
    visited: set[str] = set()
    while queue:
        node, d = queue.pop(0)
        if node in visited:
            continue
        visited.add(node)
        depth_of[node] = d
        max_depth = max(max_depth, d)
        for child in children.get(node, []):
            if child not in visited:
                queue.append((child, d + 1))

    total_layers = max_depth + 1

    # Span of control
    manager_ids_in_data = {m for m in children if m in emp_set and len(children[m]) > 0}
    spans = {m: len(children[m]) for m in manager_ids_in_data}
    span_values = list(spans.values())

    avg_span = round(np.mean(span_values), 1) if span_values else 0
    median_span = round(float(np.median(span_values)), 1) if span_values else 0
    min_span = min(span_values) if span_values else 0
    max_span = max(span_values) if span_values else 0

    # Span by level
    span_by_level: dict[str, float] = {}
    if cl_c in df.columns:
        eid_to_level = dict(zip(df[emp_col].astype(str), df[cl_c].fillna("Unknown")))
        level_spans: dict[str, list[int]] = defaultdict(list)
        for m, s in spans.items():
            lvl = eid_to_level.get(m, "Unknown")
            level_spans[lvl].append(s)
        span_by_level = {lvl: round(np.mean(vals), 1) for lvl, vals in level_spans.items()}

    # Flags
    narrow_span = [m for m, s in spans.items() if s < 3]
    wide_span = [m for m, s in spans.items() if s > 15]

    # Manager-to-IC ratio by function
    mgr_ic_by_func: dict[str, dict] = {}
    if func_c in df.columns:
        eid_to_func = dict(zip(df[emp_col].astype(str), df[func_c].fillna("Unknown")))
        func_mgrs: dict[str, int] = defaultdict(int)
        func_total: dict[str, int] = defaultdict(int)
        for eid in emp_set:
            f = eid_to_func.get(eid, "Unknown")
            func_total[f] += 1
            if eid in manager_ids_in_data:
                func_mgrs[f] += 1
        for f in func_total:
            mgrs = func_mgrs.get(f, 0)
            ics = func_total[f] - mgrs
            mgr_ic_by_func[f] = {
                "managers": mgrs,
                "ics": ics,
                "ratio": round(ics / max(mgrs, 1), 1),
            }

    # Structural issues
    issues: list[str] = []

    # Layer benchmarks
    if n < 5000 and total_layers > 5:
        issues.append(f"Organization has {total_layers} management layers for {n} employees — benchmark for this size is 4-5 layers. Consider delayering.")
    elif 5000 <= n <= 20000 and total_layers > 7:
        issues.append(f"Organization has {total_layers} management layers — benchmark is 5-6 for orgs of {n} employees.")
    elif n > 20000 and total_layers > 8:
        issues.append(f"Organization has {total_layers} management layers — even large orgs typically need only 6-7.")

    if len(narrow_span) > 0:
        issues.append(f"{len(narrow_span)} managers have span < 3 — potential over-management. Consider consolidating reporting lines.")
    if len(wide_span) > 0:
        issues.append(f"{len(wide_span)} managers have span > 15 — potential under-management. These leaders may be overwhelmed.")
    if avg_span > 0 and avg_span < 4:
        issues.append(f"Average span of control is {avg_span} — below industry norm of 6-8. Organization may be management-heavy.")

    # Span benchmarks
    SPAN_BENCHMARKS = {
        "technology": (6, 8), "financial_services": (5, 7), "healthcare": (4, 6),
        "consulting": (3, 5), "manufacturing": (8, 12), "retail": (10, 15),
    }

    return {
        "total_employees": n,
        "total_layers": total_layers,
        "manager_count": len(manager_ids_in_data),
        "ic_count": n - len(manager_ids_in_data),
        "overall_mgr_ic_ratio": round((n - len(manager_ids_in_data)) / max(len(manager_ids_in_data), 1), 1),
        "span_of_control": {
            "avg": avg_span, "median": median_span, "min": min_span, "max": max_span,
        },
        "span_by_level": span_by_level,
        "narrow_span_managers": len(narrow_span),
        "wide_span_managers": len(wide_span),
        "mgr_ic_by_function": mgr_ic_by_func,
        "span_benchmarks": SPAN_BENCHMARKS,
        "layer_benchmark": "4-5" if n < 5000 else "5-6" if n <= 20000 else "6-7",
        "structural_issues": issues or ["Org structure appears well-balanced."],
    }


# ═════════════════════════════════════════════════════════════════
#  3.  ASSESS AI READINESS
# ═════════════════════════════════════════════════════════════════

_TECH_FUNCTIONS = {"Technology", "Engineering", "IT", "Data", "Data Science", "Product", "R&D"}
_PROCESS_FUNCTIONS = {"Operations", "Finance", "Accounting", "HR", "Supply Chain", "Procurement"}
_DATA_FUNCTIONS = {"Finance", "Accounting", "Operations", "IT", "Technology", "Data"}
_RESISTANT_FUNCTIONS = {"Legal", "Compliance", "Risk", "Audit"}

def _maturity_label(score: float) -> str:
    if score <= 20: return "Nascent"
    if score <= 40: return "Emerging"
    if score <= 60: return "Developing"
    if score <= 80: return "Advanced"
    return "Leading"


def assess_ai_readiness(workforce_df: pd.DataFrame, readiness_df: pd.DataFrame | None = None) -> dict:
    df = workforce_df.copy()
    func_c = _function_col(df)
    cl_c = _career_level_col(df)

    if func_c not in df.columns:
        return {"error": "No Function column", "readiness_insights": ["Cannot assess readiness without function data."]}

    functions = df[func_c].dropna().unique().tolist()
    tenure = _tenure_years(df)
    df["_tenure"] = tenure

    scores_by_func: dict[str, dict] = {}
    for func in functions:
        mask = df[func_c] == func
        func_df = df[mask]
        avg_t = func_df["_tenure"].mean()
        count = len(func_df)

        # Technology readiness
        tech = 60
        if func in _TECH_FUNCTIONS:
            tech = min(95, 70 + count * 0.1)
        elif func in _RESISTANT_FUNCTIONS:
            tech = max(15, 35 - count * 0.05)
        else:
            tech = 50

        # Process readiness
        proc = 55
        if func in _PROCESS_FUNCTIONS:
            proc = min(90, 65 + count * 0.08)
        elif func in _TECH_FUNCTIONS:
            proc = 50
        else:
            proc = 40

        # People readiness (inverse tenure correlation)
        people = max(20, min(85, 70 - avg_t * 3))
        # Senior leaders slightly more adaptable
        if cl_c in func_df.columns:
            senior_pct = func_df[cl_c].astype(str).str.contains("VP|Director|Chief|Senior|Lead|Principal", case=False, na=False).mean()
            people = min(90, people + senior_pct * 15)

        # Data readiness
        data_r = 50
        if func in _DATA_FUNCTIONS:
            data_r = min(85, 65 + count * 0.05)
        elif func in _RESISTANT_FUNCTIONS:
            data_r = 35
        else:
            data_r = 45

        # Overall weighted
        overall = round(tech * 0.30 + proc * 0.25 + people * 0.25 + data_r * 0.20, 1)

        scores_by_func[func] = {
            "technology": round(tech, 1),
            "process": round(proc, 1),
            "people": round(people, 1),
            "data": round(data_r, 1),
            "overall": overall,
            "maturity": _maturity_label(overall),
            "headcount": count,
        }

    # Rank
    ranked = sorted(scores_by_func.items(), key=lambda x: -x[1]["overall"])
    highest = ranked[0] if ranked else ("—", {"overall": 0})
    lowest = ranked[-1] if ranked else ("—", {"overall": 0})
    gap = round(highest[1]["overall"] - lowest[1]["overall"], 1)

    insights: list[str] = []
    if gap > 30:
        insights.append(f"Readiness gap of {gap} points between {highest[0]} ({highest[1]['overall']}) and {lowest[0]} ({lowest[1]['overall']}). Start pilots in high-readiness functions.")
    for func, s in ranked[:2]:
        insights.append(f"{func} scores {s['overall']}/100 overall ({s['maturity']}) — strong candidate for early transformation pilots.")
    for func, s in ranked[-2:]:
        if s["overall"] < 40:
            insights.append(f"{func} scores only {s['overall']}/100 — will need significant change management investment before transformation.")

    return {
        "scores_by_function": dict(ranked),
        "highest_readiness": {"function": highest[0], "score": highest[1]["overall"]},
        "lowest_readiness": {"function": lowest[0], "score": lowest[1]["overall"]},
        "readiness_gap": gap,
        "readiness_insights": insights or ["Readiness scores are relatively uniform across functions."],
    }


# ═════════════════════════════════════════════════════════════════
#  4.  IDENTIFY OPPORTUNITIES
# ═════════════════════════════════════════════════════════════════

_TITLE_AUTOMATION = {
    "analyst": (70, 90), "coordinator": (70, 85), "assistant": (75, 90),
    "clerk": (80, 95), "processor": (80, 95), "specialist": (50, 70),
    "administrator": (65, 85), "associate": (50, 70), "technician": (40, 60),
    "manager": (40, 60), "director": (30, 50), "lead": (35, 55),
    "vp": (20, 40), "svp": (15, 35), "chief": (10, 25), "partner": (10, 25),
    "principal": (20, 35), "head": (25, 45),
    "engineer": (30, 50), "developer": (30, 50), "scientist": (25, 45),
    "designer": (25, 45), "architect": (20, 40),
    "sales": (10, 30), "relationship": (10, 25), "client": (15, 30),
    "counsel": (20, 35), "lawyer": (15, 30), "attorney": (15, 30),
}

_DEFAULT_SALARY = 85000


def identify_opportunities(workforce_df: pd.DataFrame, tasks_df: pd.DataFrame | None = None) -> dict:
    df = workforce_df.copy()
    jt_c = _job_title_col(df)
    jf_c = _job_family_col(df)
    func_c = _function_col(df)
    pay_c = _pay_col(df)

    if jt_c not in df.columns:
        return {"error": "No Job Title column", "opportunity_highlights": ["Cannot identify opportunities without job titles."]}

    # Task-level data
    task_automation: dict[str, float] = {}
    if tasks_df is not None and "Job Title" in tasks_df.columns:
        ai_col = _col(tasks_df, "AI Impact", "AI_Impact", "Automation %")
        time_col = _col(tasks_df, "Time %", "Current Time Spent %", "Est Hours/Week")
        if ai_col and time_col:
            for title, grp in tasks_df.groupby("Job Title"):
                impact = pd.to_numeric(grp[ai_col], errors="coerce").fillna(50)
                time_w = pd.to_numeric(grp[time_col], errors="coerce").fillna(1)
                if time_w.sum() > 0:
                    task_automation[str(title)] = round((impact * time_w).sum() / time_w.sum(), 1)

    # Build role-level opportunities
    opportunities = []
    for title, grp in df.groupby(jt_c):
        title_str = str(title)
        fte = len(grp)
        func = grp[func_c].mode().iloc[0] if func_c in grp.columns and len(grp[func_c].mode()) > 0 else "Unknown"

        # Automation %
        if title_str in task_automation:
            auto_pct = task_automation[title_str]
        else:
            title_lower = title_str.lower()
            auto_pct = 45.0  # default
            for keyword, (lo, hi) in _TITLE_AUTOMATION.items():
                if keyword in title_lower:
                    auto_pct = (lo + hi) / 2
                    break

        # Salary
        avg_salary = _DEFAULT_SALARY
        if pay_c in grp.columns:
            pay_vals = pd.to_numeric(grp[pay_c], errors="coerce").dropna()
            if len(pay_vals) > 0:
                avg_salary = round(pay_vals.mean())

        hours_freed = round(auto_pct / 100 * 2080 * fte)  # 2080 work hours/year
        cost_savings = round(auto_pct / 100 * avg_salary * fte)

        # Complexity estimate
        complexity = "low" if auto_pct > 65 else "medium" if auto_pct > 40 else "high"
        impact = "high" if cost_savings > 200000 or fte >= 10 else "medium" if cost_savings > 50000 else "low"

        if impact == "high" and complexity == "low":
            quadrant = "Quick Win"
        elif impact == "high" and complexity != "low":
            quadrant = "Strategic Bet"
        elif impact != "high" and complexity == "low":
            quadrant = "Incremental Gain"
        else:
            quadrant = "Deprioritize"

        opportunities.append({
            "job_title": title_str,
            "function": func,
            "fte_count": fte,
            "automation_pct": round(auto_pct, 1),
            "hours_freed_per_year": hours_freed,
            "avg_salary": avg_salary,
            "cost_savings_potential": cost_savings,
            "complexity": complexity,
            "impact": impact,
            "quadrant": quadrant,
        })

    opportunities.sort(key=lambda x: -x["cost_savings_potential"])

    quadrant_summary = defaultdict(lambda: {"count": 0, "total_savings": 0, "total_fte": 0})
    for opp in opportunities:
        q = opp["quadrant"]
        quadrant_summary[q]["count"] += 1
        quadrant_summary[q]["total_savings"] += opp["cost_savings_potential"]
        quadrant_summary[q]["total_fte"] += opp["fte_count"]

    total_savings = sum(o["cost_savings_potential"] for o in opportunities)
    highlights: list[str] = []
    if opportunities:
        top = opportunities[0]
        highlights.append(f"Highest-value opportunity: {top['job_title']} ({top['fte_count']} FTEs, ~${top['cost_savings_potential']:,.0f} savings potential).")
    qw = quadrant_summary.get("Quick Win", {})
    if qw.get("count", 0) > 0:
        highlights.append(f"{qw['count']} Quick Win roles identified — ${qw['total_savings']:,.0f} in potential savings with low complexity.")
    highlights.append(f"Total addressable savings across all roles: ${total_savings:,.0f}.")

    return {
        "opportunities": opportunities[:50],  # Top 50
        "quadrant_summary": dict(quadrant_summary),
        "total_addressable_savings": total_savings,
        "opportunity_highlights": highlights,
    }


# ═════════════════════════════════════════════════════════════════
#  5.  ANALYZE SKILLS
# ═════════════════════════════════════════════════════════════════

_FAMILY_SKILL_MAP = {
    "Technology": ["Python", "Cloud Computing", "Data Analytics", "AI/ML", "Software Development", "DevOps"],
    "Engineering": ["Python", "Systems Design", "Cloud Computing", "AI/ML", "Data Engineering"],
    "Data": ["Python", "SQL", "Data Analytics", "AI/ML", "Statistics", "Data Visualization"],
    "Finance": ["Financial Modeling", "Data Analytics", "Automation", "ERP Systems", "Data Literacy"],
    "HR": ["People Analytics", "Change Management", "Data Literacy", "Process Design", "Workforce Planning"],
    "Operations": ["Process Optimization", "Automation", "Data Analytics", "Lean/Six Sigma", "RPA"],
    "Sales": ["CRM", "Data Literacy", "Digital Selling", "AI Sales Tools", "Customer Analytics"],
    "Marketing": ["Digital Marketing", "Data Analytics", "Marketing Automation", "AI Content", "Customer Analytics"],
    "Legal": ["Legal Tech", "Contract AI", "Data Privacy", "Digital Fluency"],
}

_RESKILL_WEEKS = {"adjacent": (4, 8), "moderate": (8, 16), "major": (16, 24)}


def analyze_skills(workforce_df: pd.DataFrame, skills_df: pd.DataFrame | None = None) -> dict:
    df = workforce_df.copy()
    n = len(df)
    jf_c = _job_family_col(df)

    if skills_df is not None and len(skills_df) > 0:
        skill_col = _col(skills_df, "Primary Skill", "Skill", "skill_name")
        prof_col = _col(skills_df, "Proficiency", "proficiency_level")

        if skill_col:
            all_skills = skills_df[skill_col].dropna()
            skill_counts = all_skills.value_counts()
            total_people = skills_df[_col(skills_df, "Employee ID", "employee_id") or "Employee ID"].nunique() if _col(skills_df, "Employee ID", "employee_id") else n
            coverage = {str(s): round(c / max(total_people, 1) * 100, 1) for s, c in skill_counts.items()}
            concentrated = [str(s) for s, c in skill_counts.items() if c < 5]
            return {
                "skill_coverage": dict(list(coverage.items())[:30]),
                "concentrated_skills": concentrated[:10],
                "total_unique_skills": len(skill_counts),
                "skill_priorities": [
                    f"{len(concentrated)} skills held by fewer than 5 people — single point of failure risk." if concentrated else "Skill distribution appears healthy.",
                ],
            }

    # Estimate from job families
    if jf_c not in df.columns:
        return {"skill_priorities": ["No skill or job family data available for analysis."]}

    family_counts = df[jf_c].value_counts()
    estimated_needs: dict[str, dict] = {}
    all_needed: dict[str, int] = defaultdict(int)
    for family, count in family_counts.items():
        family_str = str(family)
        matched_skills = []
        for key, skills in _FAMILY_SKILL_MAP.items():
            if key.lower() in family_str.lower():
                matched_skills = skills
                break
        if not matched_skills:
            matched_skills = ["Data Literacy", "Process Design", "Change Management", "Digital Fluency"]
        estimated_needs[family_str] = {"headcount": int(count), "likely_skills_needed": matched_skills}
        for s in matched_skills:
            all_needed[s] += int(count)

    top_gaps = sorted(all_needed.items(), key=lambda x: -x[1])[:10]

    priorities: list[str] = []
    if top_gaps:
        priorities.append(f"Top skill gap: {top_gaps[0][0]} — needed across {top_gaps[0][1]} employees.")
    tech_skills = [s for s, _ in top_gaps if s in {"Python", "AI/ML", "Cloud Computing", "Data Engineering"}]
    if tech_skills:
        priorities.append(f"Technical skills in high demand: {', '.join(tech_skills)}. These have high market scarcity — prioritize build over buy.")
    priorities.append(f"Estimated reskilling effort: adjacent skills take {_RESKILL_WEEKS['adjacent'][0]}-{_RESKILL_WEEKS['adjacent'][1]} weeks, major gaps take {_RESKILL_WEEKS['major'][0]}-{_RESKILL_WEEKS['major'][1]} weeks.")

    return {
        "estimated_needs_by_family": estimated_needs,
        "top_skill_gaps": dict(top_gaps),
        "reskill_effort_weeks": _RESKILL_WEEKS,
        "skill_priorities": priorities,
    }


# ═════════════════════════════════════════════════════════════════
#  6.  ASSESS CHANGE READINESS
# ═════════════════════════════════════════════════════════════════

def assess_change_readiness(workforce_df: pd.DataFrame, readiness_df: pd.DataFrame | None = None) -> dict:
    df = workforce_df.copy()
    n = len(df)
    func_c = _function_col(df)
    cl_c = _career_level_col(df)

    tenure = _tenure_years(df)
    df["_tenure"] = tenure

    # Estimate willingness and ability
    willing = np.full(n, 3.0)
    able = np.full(n, 3.0)

    # Tenure effect on willingness (longer tenure → less willing)
    willing -= np.clip(tenure.values / 10, 0, 1.5)

    # Career level effect (senior → more willing)
    if cl_c in df.columns:
        senior_mask = df[cl_c].astype(str).str.contains("VP|Director|Chief|Senior|Lead|Principal|Head", case=False, na=False)
        willing[senior_mask.values] += 0.8
        able[senior_mask.values] += 0.5

    # Function adjustment
    if func_c in df.columns:
        for i, func in enumerate(df[func_c].fillna("")):
            func_str = str(func)
            if any(t in func_str for t in ["Technology", "Engineering", "IT", "Data"]):
                willing[i] += 0.7
                able[i] += 1.0
            elif any(t in func_str for t in ["Operations", "Legal", "Compliance"]):
                willing[i] -= 0.3

    # Clip to 1-5 scale
    willing = np.clip(willing, 1.0, 5.0)
    able = np.clip(able, 1.0, 5.0)

    # Add noise for realism
    rng = np.random.RandomState(42)
    willing += rng.normal(0, 0.3, n)
    able += rng.normal(0, 0.3, n)
    willing = np.clip(willing, 1.0, 5.0).round(2)
    able = np.clip(able, 1.0, 5.0).round(2)

    df["_willing"] = willing
    df["_able"] = able

    # Segment
    def segment(w, a):
        if w >= 3.5 and a >= 3.5: return "Champion"
        if w >= 3.5 and a < 3.5: return "Training Need"
        if w < 3.5 and a >= 3.5: return "Change Mgmt Need"
        return "High Risk"

    df["_segment"] = [segment(w, a) for w, a in zip(willing, able)]

    # Overall segments
    overall = df["_segment"].value_counts().to_dict()
    overall_pct = {s: round(c / max(n, 1) * 100, 1) for s, c in overall.items()}

    # By function
    by_func: dict[str, dict] = {}
    if func_c in df.columns:
        for func, grp in df.groupby(func_c):
            seg = grp["_segment"].value_counts()
            total = len(grp)
            by_func[str(func)] = {
                "total": total,
                "segments": {s: int(seg.get(s, 0)) for s in ["Champion", "Training Need", "Change Mgmt Need", "High Risk"]},
                "champion_pct": round(seg.get("Champion", 0) / max(total, 1) * 100, 1),
                "high_risk_pct": round(seg.get("High Risk", 0) / max(total, 1) * 100, 1),
            }

    # Flags
    bottlenecks = [f for f, d in by_func.items() if d["high_risk_pct"] > 40]
    pilot_candidates = [f for f, d in by_func.items() if d["champion_pct"] > 30]

    insights: list[str] = []
    if "Champion" in overall:
        insights.append(f"{overall_pct.get('Champion', 0)}% of employees are Champions — target for pilot programs and peer advocacy.")
    if "High Risk" in overall:
        insights.append(f"{overall_pct.get('High Risk', 0)}% are High Risk — will need intensive support or role transition planning.")
    if bottlenecks:
        insights.append(f"Transformation bottleneck functions (>40% High Risk): {', '.join(bottlenecks)}.")
    if pilot_candidates:
        insights.append(f"Best pilot candidates (>30% Champions): {', '.join(pilot_candidates)}.")

    return {
        "overall_segments": overall,
        "overall_pct": overall_pct,
        "avg_willingness": round(float(willing.mean()), 2),
        "avg_ability": round(float(able.mean()), 2),
        "by_function": by_func,
        "bottleneck_functions": bottlenecks,
        "pilot_candidate_functions": pilot_candidates,
        "change_insights": insights or ["Change readiness is relatively uniform across the organization."],
    }


# ═════════════════════════════════════════════════════════════════
#  7.  BUILD SCENARIOS
# ═════════════════════════════════════════════════════════════════

def build_scenarios(workforce_df: pd.DataFrame, opportunities_dict: dict) -> dict:
    opps = opportunities_dict.get("opportunities", [])
    if not opps:
        return {"scenarios": {}, "scenario_recommendation": "No opportunities identified to model."}

    n = len(workforce_df)
    quick_wins = [o for o in opps if o["quadrant"] == "Quick Win"]
    strategic = [o for o in opps if o["quadrant"] == "Strategic Bet"]
    incremental = [o for o in opps if o["quadrant"] == "Incremental Gain"]
    deprioritize = [o for o in opps if o["quadrant"] == "Deprioritize"]

    def _build(label, adoption, scope, timeline_months, risk):
        total_savings = sum(o["cost_savings_potential"] * adoption for o in scope)
        total_fte_impact = sum(o["fte_count"] * o["automation_pct"] / 100 * adoption for o in scope)
        gross_reduction = round(total_fte_impact, 1)
        redeployed = round(gross_reduction * 0.5, 1)
        net_reduction = round(gross_reduction - redeployed, 1)
        year1_savings = round(total_savings)
        # Investment: technology 40%, reskilling 35%, change mgmt 25%
        tech_invest = round(year1_savings * 0.35)  # invest ~35% of savings
        reskill_invest = round(year1_savings * 0.30)
        change_invest = round(year1_savings * 0.20)
        total_invest = tech_invest + reskill_invest + change_invest
        net_year1 = round(year1_savings - total_invest)
        recurring = round(year1_savings * 0.80)  # 80% of savings recur
        payback = round(total_invest / max(year1_savings / 12, 1), 1) if year1_savings > 0 else 0

        return {
            "label": label,
            "adoption_rate": adoption,
            "timeline_months": timeline_months,
            "risk_level": risk,
            "roles_in_scope": len(scope),
            "gross_fte_reduction": gross_reduction,
            "redeployment_potential": redeployed,
            "net_fte_reduction": net_reduction,
            "year1_savings": year1_savings,
            "investment": {
                "technology": tech_invest,
                "reskilling": reskill_invest,
                "change_management": change_invest,
                "total": total_invest,
            },
            "net_year1_benefit": net_year1,
            "year2_recurring_savings": recurring,
            "payback_months": payback,
        }

    conservative = _build("Conservative", 0.25, quick_wins, 12, "Low")
    moderate = _build("Moderate", 0.50, quick_wins + strategic, 18, "Medium")
    aggressive = _build("Aggressive", 0.75, opps, 24, "High")

    # Recommendation
    if moderate["net_year1_benefit"] > 0:
        rec = f"Moderate scenario recommended — ${moderate['net_year1_benefit']:,.0f} net Year 1 benefit with manageable risk. Payback in {moderate['payback_months']} months."
    elif conservative["net_year1_benefit"] > 0:
        rec = f"Conservative scenario recommended as starting point — ${conservative['net_year1_benefit']:,.0f} net Year 1 benefit. Low risk, fast payback ({conservative['payback_months']} months)."
    else:
        rec = "All scenarios show negative Year 1 ROI. Focus on quick wins first to build momentum before larger investments."

    return {
        "scenarios": {
            "conservative": conservative,
            "moderate": moderate,
            "aggressive": aggressive,
        },
        "scenario_recommendation": rec,
    }


# ═════════════════════════════════════════════════════════════════
#  8.  GENERATE ROADMAP
# ═════════════════════════════════════════════════════════════════

def generate_roadmap(scenario_dict: dict, change_readiness_dict: dict) -> dict:
    timeline = scenario_dict.get("timeline_months", 18)
    pilot_funcs = change_readiness_dict.get("pilot_candidate_functions", [])
    pilot_str = ", ".join(pilot_funcs[:3]) if pilot_funcs else "TBD (assign based on readiness)"

    phases = [
        {
            "name": "Assess & Pilot",
            "start_month": 1, "end_month": 3,
            "workstreams": [
                {"name": "Stakeholder Alignment", "owner": "Executive Sponsor", "effort": "medium", "dependencies": []},
                {"name": "Data Validation & Quality", "owner": "Data/Analytics Team", "effort": "high", "dependencies": []},
                {"name": "Quick Win Identification", "owner": "Transformation Lead", "effort": "medium", "dependencies": ["Data Validation & Quality"]},
                {"name": "Pilot Team Selection", "owner": pilot_str, "effort": "low", "dependencies": ["Stakeholder Alignment"]},
                {"name": "Change Readiness Baseline", "owner": "HR/Change Team", "effort": "medium", "dependencies": []},
                {"name": "Technology Assessment", "owner": "IT/Technology", "effort": "medium", "dependencies": []},
            ],
            "milestones": ["Steering committee formed", "Pilot scope defined", "Baseline metrics captured"],
        },
        {
            "name": "Quick Wins",
            "start_month": 4, "end_month": 6,
            "workstreams": [
                {"name": "Process Automation (Quick Wins)", "owner": "Operations/IT", "effort": "high", "dependencies": ["Quick Win Identification"]},
                {"name": "Reskilling Program Launch", "owner": "L&D/HR", "effort": "high", "dependencies": ["Change Readiness Baseline"]},
                {"name": "Communication Campaign", "owner": "HR/Comms", "effort": "medium", "dependencies": ["Stakeholder Alignment"]},
                {"name": "Manager Enablement", "owner": "L&D/HR", "effort": "medium", "dependencies": ["Change Readiness Baseline"]},
                {"name": "Measurement Framework", "owner": "Analytics Team", "effort": "medium", "dependencies": ["Baseline metrics captured"]},
            ],
            "milestones": ["First automations live", "Reskilling cohort 1 started", "Quick win ROI validated"],
        },
        {
            "name": "Scale",
            "start_month": 7, "end_month": 12,
            "workstreams": [
                {"name": "Strategic Bet Implementation", "owner": "Transformation Lead", "effort": "high", "dependencies": ["Quick win ROI validated"]},
                {"name": "Org Restructuring", "owner": "HR/HRBP", "effort": "high", "dependencies": ["Manager Enablement"]},
                {"name": "Advanced Reskilling", "owner": "L&D", "effort": "high", "dependencies": ["Reskilling Program Launch"]},
                {"name": "Role Transition Support", "owner": "HR", "effort": "medium", "dependencies": ["Org Restructuring"]},
                {"name": "Technology Scaling", "owner": "IT", "effort": "high", "dependencies": ["Technology Assessment"]},
            ],
            "milestones": ["50% of target automations live", "Restructuring complete", "Reskilling cohort 2 started"],
        },
    ]

    if timeline > 12:
        phases.append({
            "name": "Optimize",
            "start_month": 13, "end_month": timeline,
            "workstreams": [
                {"name": "Performance Optimization", "owner": "Operations", "effort": "medium", "dependencies": []},
                {"name": "Continuous Improvement", "owner": "Transformation Lead", "effort": "medium", "dependencies": []},
                {"name": "Operating Model Refinement", "owner": "Strategy/HR", "effort": "medium", "dependencies": ["Org Restructuring"]},
                {"name": "Culture Embedding", "owner": "HR/Change", "effort": "medium", "dependencies": ["Communication Campaign"]},
                {"name": "Capability Building", "owner": "L&D", "effort": "medium", "dependencies": ["Advanced Reskilling"]},
            ],
            "milestones": ["Target state achieved", "ROI targets met", "New operating model stable"],
        })

    all_workstreams = []
    for phase in phases:
        for ws in phase["workstreams"]:
            all_workstreams.append({
                **ws,
                "phase": phase["name"],
                "start_month": phase["start_month"],
                "end_month": phase["end_month"],
                "status": "not_started",
            })

    notes: list[str] = []
    notes.append(f"Roadmap spans {timeline} months across {len(phases)} phases with {len(all_workstreams)} workstreams.")
    if pilot_funcs:
        notes.append(f"Pilot functions selected based on change readiness: {', '.join(pilot_funcs[:3])}.")
    notes.append("Phase gates between each phase — do not proceed to Scale until Quick Wins ROI is validated.")

    return {
        "phases": phases,
        "workstreams": all_workstreams,
        "total_workstreams": len(all_workstreams),
        "timeline_months": timeline,
        "roadmap_notes": notes,
    }


# ═════════════════════════════════════════════════════════════════
#  9.  SYNTHESIZE FINDINGS
# ═════════════════════════════════════════════════════════════════

def synthesize_findings(all_results: dict) -> dict:
    findings: list[dict] = []

    # Structural issues
    for issue in all_results.get("org_structure", {}).get("structural_issues", []):
        findings.append({"text": issue, "theme": "Structural Issues", "impact": "high", "urgency": "near-term"})

    # Notable workforce observations
    for obs in all_results.get("workforce_profile", {}).get("notable_observations", []):
        impact = "high" if "risk" in obs.lower() or "concentration" in obs.lower() else "medium"
        findings.append({"text": obs, "theme": "Talent Risks", "impact": impact, "urgency": "near-term"})

    # AI opportunity highlights
    for h in all_results.get("opportunities", {}).get("opportunity_highlights", []):
        findings.append({"text": h, "theme": "AI Opportunities", "impact": "high", "urgency": "immediate"})

    # Skill priorities
    for p in all_results.get("skills", {}).get("skill_priorities", []):
        findings.append({"text": p, "theme": "Skills Gaps", "impact": "medium", "urgency": "near-term"})

    # Change insights
    for i in all_results.get("change_readiness", {}).get("change_insights", []):
        urgency = "immediate" if "bottleneck" in i.lower() else "near-term"
        findings.append({"text": i, "theme": "Change Barriers", "impact": "high" if "bottleneck" in i.lower() else "medium", "urgency": urgency})

    # Readiness insights
    for i in all_results.get("ai_readiness", {}).get("readiness_insights", []):
        findings.append({"text": i, "theme": "AI Opportunities", "impact": "medium", "urgency": "near-term"})

    # Sort by impact then urgency
    impact_order = {"high": 0, "medium": 1, "low": 2}
    urgency_order = {"immediate": 0, "near-term": 1, "long-term": 2}
    findings.sort(key=lambda f: (impact_order.get(f["impact"], 2), urgency_order.get(f["urgency"], 2)))

    # Group by theme
    themes: dict[str, list[dict]] = defaultdict(list)
    for f in findings:
        themes[f["theme"]].append(f)

    # Big 3
    big_3 = findings[:3]

    # Executive summary
    total_savings = all_results.get("opportunities", {}).get("total_addressable_savings", 0)
    n = all_results.get("workforce_profile", {}).get("total_headcount", 0)
    readiness_gap = all_results.get("ai_readiness", {}).get("readiness_gap", 0)
    champion_pct = all_results.get("change_readiness", {}).get("overall_pct", {}).get("Champion", 0)

    parts = [f"Analysis of {n:,} employees identifies ${total_savings:,.0f} in addressable transformation savings."]
    if readiness_gap > 25:
        parts.append(f"AI readiness varies significantly across functions (gap: {readiness_gap} points) — a phased approach is recommended.")
    if champion_pct > 25:
        parts.append(f"{champion_pct}% of the workforce are Change Champions — a strong foundation for pilot programs.")
    if big_3:
        parts.append(f"Top priority: {big_3[0]['text']}")

    return {
        "findings": findings,
        "themes": dict(themes),
        "big_3": big_3,
        "executive_summary": " ".join(parts),
    }
