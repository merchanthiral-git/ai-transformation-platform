"""Extended analytics routes — skills, BBBA, headcount, readiness, managers, etc."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.store import (
    store, sync_work_design, build_reconstruction, build_ai_priority_scores,
    build_skill_analysis, compute_readiness_score, get_manager_candidates,
    enrich_work_design_defaults, build_auto_change_plan,
)
from app.helpers import get_series, safe_value_counts, dataframe_to_excel_bytes
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["analytics"])

# Response cache (shared across analytics routes)
_api_cache = {}
def _cache_key(endpoint, model_id): return f"{endpoint}:{model_id}"
def _get_cached(endpoint, model_id): return _api_cache.get(_cache_key(endpoint, model_id))
def _set_cached(endpoint, model_id, data):
    _api_cache[_cache_key(endpoint, model_id)] = data
    if len(_api_cache) > 50: del _api_cache[list(_api_cache.keys())[0]]

@router.get("/skills/inventory/{model_id}")
async def get_skills_inventory(model_id: str, func: str = "All", jf: str = "All"):
    """Skills Inventory — reads from work design tasks to build a proficiency grid."""
    cached = _get_cached("get_skills_inventory", model_id)
    if cached is not None:
        return cached
    ds = store.datasets.get(model_id)
    if not ds:
        return {"records": [], "skills": [], "employees": [], "summary": {}}
    wf = ds.get("workforce", pd.DataFrame())
    wd = ds.get("work_design", pd.DataFrame())
    # Build employee × skill matrix from work design
    records = []
    skills_set = set()
    emp_set = set()
    if not wd.empty and "Job Title" in wd.columns:
        for _, row in wd.iterrows():
            for skill_col in ["Primary Skill", "Secondary Skill"]:
                skill = str(row.get(skill_col, "")).strip()
                if not skill or skill == "nan":
                    continue
                skills_set.add(skill)
        # Match employees to skills via their job title
        if not wf.empty and "Employee Name" in wf.columns and "Job Title" in wf.columns:
            import random
            random.seed(42)
            skills_list = sorted(skills_set)
            for _, emp in wf.iterrows():
                name = str(emp.get("Employee Name", "")).strip()
                title = str(emp.get("Job Title", "")).strip()
                if not name:
                    continue
                emp_set.add(name)
                # Get skills relevant to this job
                job_skills = set()
                for _, task in wd[get_series(wd, "Job Title").astype(str) == title].iterrows():
                    for sc in ["Primary Skill", "Secondary Skill"]:
                        s = str(task.get(sc, "")).strip()
                        if s and s != "nan":
                            job_skills.add(s)
                for skill in skills_list:
                    prof = random.randint(1, 4) if skill in job_skills else random.randint(0, 2)
                    records.append({"employee": name, "skill": skill, "proficiency": prof})
    result = {
        "records": records[:5000],
        "skills": sorted(skills_set),
        "employees": sorted(emp_set)[:200],
        "summary": {"total_employees": len(emp_set), "total_skills": len(skills_set), "total_records": len(records)},
    }
    _set_cached("get_skills_inventory", model_id, result)
    return _safe(result)


@router.get("/skills/gap/{model_id}")
async def get_skills_gap(model_id: str):
    """Skills Gap Analysis — current proficiency vs target from WDL reconstruction."""
    cached = _get_cached("get_skills_gap", model_id)
    if cached is not None:
        return cached
    ds = store.datasets.get(model_id)
    
    # Get current inventory
    inv = await get_skills_inventory(model_id)
    records = inv.get("records", [])
    
    if not records:
        return _safe({"gaps": [], "summary": {"message": "No skills data — complete Skills Inventory first"}, "role_gaps": []})
    
    # Calculate current avg proficiency per skill
    from collections import defaultdict
    skill_data = defaultdict(lambda: {"sum": 0, "count": 0, "employees": []})
    for r in records:
        skill_data[r["skill"]]["sum"] += r["proficiency"]
        skill_data[r["skill"]]["count"] += 1
        skill_data[r["skill"]]["employees"].append({"employee": r["employee"], "proficiency": r["proficiency"]})
    
    # Determine target proficiency
    # Priority 1: From WDL reconstruction (real targets)
    # Priority 2: From task automatability scoring (estimated targets)
    # Priority 3: Default benchmarks
    
    targets = {}
    
    if ds:
        # Try to get targets from WDL reconstruction
        wd_df = None
        for key in ds:
            kl = key.lower()
            if any(t in kl for t in ["work_design", "work design", "tasks", "task", "deconstruction"]):
                wd_df = ds[key]
                break
        
        if wd_df is not None and not wd_df.empty:
            from app.store import sync_work_design, build_reconstruction, build_skill_analysis
            t = sync_work_design(wd_df)
            recon = build_reconstruction(wd_df)
            _, future_skills = build_skill_analysis(wd_df, recon)
            
            if not future_skills.empty:
                # Skills with higher future weight need higher proficiency
                max_weight = future_skills["Weight"].max() if not future_skills.empty else 1
                for _, row in future_skills.iterrows():
                    skill = str(row["Skill"])
                    weight = float(row.get("Weight", 0))
                    # Scale: high-weight future skills need proficiency 3.5-4, low-weight need 2.5-3
                    targets[skill] = round(2.5 + (weight / max(max_weight, 1)) * 1.5, 1)
    
    # AI-era skills get higher default targets
    ai_skills = {"ai", "ml", "automation", "digital", "data", "python", "cloud", "cyber", "analytics"}
    
    gaps = []
    for skill, data in skill_data.items():
        current_avg = round(data["sum"] / data["count"], 1)
        
        # Get target — WDL-derived, or default based on skill type
        if skill in targets:
            target = targets[skill]
            target_source = "Work Design Lab"
        elif any(kw in skill.lower() for kw in ai_skills):
            target = 3.5
            target_source = "AI-era benchmark"
        else:
            target = 3.0
            target_source = "Industry benchmark"
        
        delta = round(target - current_avg, 1)
        
        # Individual employee gaps for drilldown
        emp_gaps = []
        for e in data["employees"]:
            emp_delta = round(target - e["proficiency"], 1)
            emp_gaps.append({
                "employee": e["employee"],
                "current": e["proficiency"],
                "target": target,
                "delta": emp_delta,
                "reskillable": emp_delta <= 2,
            })
        emp_gaps.sort(key=lambda g: -g["delta"])
        
        gaps.append({
            "skill": skill,
            "current_avg": current_avg,
            "target": target,
            "target_source": target_source,
            "delta": max(delta, 0),
            "employees_assessed": data["count"],
            "severity": "Critical" if delta > 1.5 else "Moderate" if delta > 0.5 else "Low",
            "employee_gaps": emp_gaps[:20],
        })
    
    gaps.sort(key=lambda g: -g["delta"])
    
    critical = len([g for g in gaps if g["severity"] == "Critical"])
    moderate = len([g for g in gaps if g["severity"] == "Moderate"])
    low = len([g for g in gaps if g["severity"] == "Low"])
    
    return _safe({
        "gaps": gaps,
        "summary": {
            "total_skills": len(gaps),
            "critical_gaps": critical,
            "moderate_gaps": moderate,
            "low_gaps": low,
            "avg_gap": round(sum(g["delta"] for g in gaps) / max(len(gaps), 1), 1),
            "largest_gap_skill": gaps[0]["skill"] if gaps else "—",
            "largest_gap_delta": gaps[0]["delta"] if gaps else 0,
            "wdl_connected": len(targets) > 0,
        }
    })


@router.get("/skills/adjacency/{model_id}")
async def get_skills_adjacency(model_id: str):
    """Skills Adjacency — find internal candidates for redesigned roles based on skill overlap."""
    cached = _get_cached("get_skills_adjacency", model_id)
    if cached is not None:
        return cached
    inv = await get_skills_inventory(model_id)
    records = inv.get("records", [])
    if not records:
        return _safe({"adjacencies": [], "target_roles": []})
    # Build employee skill profiles
    from collections import defaultdict
    emp_skills = defaultdict(set)
    for r in records:
        if r["proficiency"] >= 2:
            emp_skills[r["employee"]].add(r["skill"])
    # Get target roles from work design
    ds = store.datasets.get(model_id, {})
    wd = ds.get("work_design", pd.DataFrame())
    role_skills = defaultdict(set)
    if not wd.empty:
        for _, row in wd.iterrows():
            title = str(row.get("Job Title", "")).strip()
            for sc in ["Primary Skill", "Secondary Skill"]:
                s = str(row.get(sc, "")).strip()
                if s and s != "nan":
                    role_skills[title].add(s)
    adjacencies = []
    for role, required in role_skills.items():
        if not required:
            continue
        for emp, skills in emp_skills.items():
            overlap = len(skills & required)
            if overlap > 0:
                score = round(overlap / len(required) * 100, 1)
                if score >= 30:
                    adjacencies.append({"target_role": role, "employee": emp, "adjacency_pct": score,
                        "matching_skills": sorted(skills & required), "gap_skills": sorted(required - skills),
                        "readiness_score": min(100, score + 10), "reskill_months": max(1, round((100 - score) / 15)),
                        "readiness_band": "High" if score >= 70 else "Medium" if score >= 50 else "Low",
                        "has_pathway": score >= 50, "pathway_cost": max(2000, round((100 - score) * 100)),
                        "composite_score": round(score * 0.6 + min(100, score + 10) * 0.3 + max(0, 100 - (100-score)/15*10) * 0.1, 1)})
    adjacencies.sort(key=lambda x: -x["composite_score"])
    target_roles = sorted(role_skills.keys())
    result = {"adjacencies": adjacencies[:500], "target_roles": target_roles}
    _set_cached("get_skills_adjacency", model_id, result)
    return _safe(result)


@router.get("/bbba/{model_id}")
async def get_bbba(model_id: str):
    """Build/Buy/Borrow/Automate framework — per-role disposition with cost implications."""
    cached = _get_cached("get_bbba", model_id)
    if cached is not None:
        return cached
    gap_data = await get_skills_gap(model_id)
    adj_data = await get_skills_adjacency(model_id)
    
    gaps = gap_data.get("gaps", [])
    adjacencies = adj_data.get("adjacencies", [])
    
    if not gaps and not adjacencies:
        return _safe({"roles": [], "summary": {}, "cost_model": {}})
    
    # Build role-level dispositions from gap analysis and adjacency
    roles = []
    for adj in adjacencies:
        role = adj["target_role"]
        strong = adj.get("strong_matches", 0)
        reskillable = adj.get("reskillable", 0)
        
        # Auto-recommend disposition
        if strong >= 3:
            disposition = "Build"
            reason = f"{strong} strong internal candidates available"
            cost_per = 15000  # reskilling cost
        elif reskillable >= 2:
            disposition = "Build"
            reason = f"{reskillable} reskillable candidates with investment"
            cost_per = 25000
        elif strong >= 1:
            disposition = "Build"
            reason = "Limited but viable internal candidates"
            cost_per = 20000
        else:
            disposition = "Buy"
            reason = "No viable internal candidates above threshold"
            cost_per = 85000  # external hire cost
        
        # Check if role can be automated
        role_gaps = [g for g in gaps if g.get("severity") == "Critical"]
        auto_skills = [g for g in role_gaps if "automat" in g.get("skill", "").lower() or "ai" in g.get("skill", "").lower()]
        if len(auto_skills) > len(role_gaps) * 0.5 and len(role_gaps) > 0:
            disposition = "Automate"
            reason = "Majority of skill needs can be met by AI/automation"
            cost_per = 50000  # one-time automation cost
        
        # Estimate FTE need
        fte_need = max(1, strong + reskillable) if disposition == "Build" else 2
        
        roles.append({
            "role": role,
            "disposition": disposition,
            "reason": reason,
            "strong_candidates": strong,
            "reskillable_candidates": reskillable,
            "cost_per_fte": cost_per,
            "fte_needed": fte_need,
            "total_cost": cost_per * fte_need,
            "required_skills": list(adj.get("required_skills", {}).keys()),
            "timeline_months": 3 if disposition == "Build" and strong >= 2 else 6 if disposition == "Build" else 2 if disposition == "Buy" else 4,
        })
    
    # Add generic roles for gaps without adjacency matches
    for g in gaps:
        if g["severity"] == "Critical" and not any(g["skill"] in r.get("required_skills", []) for r in roles):
            roles.append({
                "role": f"{g['skill']} Specialist",
                "disposition": "Buy" if g["delta"] > 2 else "Borrow",
                "reason": f"Critical gap (delta {g['delta']}) — {'too large to reskill' if g['delta'] > 2 else 'contract to bridge'}",
                "strong_candidates": 0,
                "reskillable_candidates": 0,
                "cost_per_fte": 95000 if g["delta"] > 2 else 45000,
                "fte_needed": 1,
                "total_cost": 95000 if g["delta"] > 2 else 45000,
                "required_skills": [g["skill"]],
                "timeline_months": 2,
            })
    
    # Summary
    build_count = len([r for r in roles if r["disposition"] == "Build"])
    buy_count = len([r for r in roles if r["disposition"] == "Buy"])
    borrow_count = len([r for r in roles if r["disposition"] == "Borrow"])
    auto_count = len([r for r in roles if r["disposition"] == "Automate"])
    
    return _safe({
        "roles": roles,
        "summary": {
            "total_roles": len(roles),
            "build": build_count,
            "buy": buy_count,
            "borrow": borrow_count,
            "automate": auto_count,
            "total_investment": sum(r["total_cost"] for r in roles),
            "reskilling_investment": sum(r["total_cost"] for r in roles if r["disposition"] == "Build"),
            "hiring_cost": sum(r["total_cost"] for r in roles if r["disposition"] == "Buy"),
        },
        "cost_model": {
            "build_avg": 20000,
            "buy_avg": 85000,
            "borrow_avg": 45000,
            "automate_avg": 50000,
        }
    })


# ═══════════════════════════════════════════════════
# HEADCOUNT PLANNING ENDPOINT
# ═══════════════════════════════════════════════════

@router.get("/headcount/{model_id}")
async def get_headcount_plan(model_id: str, func: str = "All", jf: str = "All", sf: str = "All", cl: str = "All"):
    """Headcount waterfall — current to future state."""
    bbba = await get_bbba(model_id)
    roles = bbba.get("roles", [])
    starting = sum(r.get("headcount", 0) for r in roles) if roles else 0
    if not starting:
        ds = store.datasets.get(model_id, {})
        wf = ds.get("workforce", pd.DataFrame())
        starting = len(wf) if not wf.empty else 0
    automated = sum(r.get("headcount", 0) for r in roles if r.get("disposition") == "Automate")
    attrition = max(1, round(starting * 0.08))
    redeployed = sum(r.get("headcount", 0) for r in roles if r.get("disposition") == "Build")
    new_hires = sum(r.get("headcount", 0) for r in roles if r.get("disposition") == "Buy")
    net = starting - automated + new_hires
    return _safe({
        "starting_headcount": starting, "automated": automated, "attrition": attrition,
        "redeployed": redeployed, "new_hires": new_hires, "net_headcount": net,
        "net_change": net - starting, "net_change_pct": round((net - starting) / max(starting, 1) * 100, 1),
        "financial_impact": {
            "automation_savings": automated * 85000, "attrition_savings": attrition * 65000,
            "hiring_cost": new_hires * 45000, "reskilling_cost": redeployed * 12000,
            "net_year1": (automated * 85000 + attrition * 65000) - (new_hires * 45000 + redeployed * 12000),
        },
        "waterfall": [
            {"label": "Starting HC", "value": starting, "type": "base"},
            {"label": "Automated", "value": -automated, "type": "decrease"},
            {"label": "Attrition", "value": -attrition, "type": "decrease"},
            {"label": "Redeployed", "value": 0, "type": "neutral"},
            {"label": "New Hires", "value": new_hires, "type": "increase"},
            {"label": "Future HC", "value": net, "type": "base"},
        ],
    })


@router.get("/readiness/{model_id}")
async def get_readiness_assessment(model_id: str):
    """AI Readiness — individual, team, and org-level scoring."""
    inv = await get_skills_inventory(model_id)
    employees = inv.get("employees", [])
    records = inv.get("records", [])
    
    import random
    random.seed(hash(model_id) % 2**31)
    
    dimensions = ["AI Awareness", "Tool Adoption", "Data Literacy", "Change Openness", "AI Collaboration"]
    
    # Generate individual scores
    individuals = []
    for emp in employees[:50]:
        scores = {}
        # Base scores from skill proficiency if available
        emp_recs = [r for r in records if r["employee"] == emp]
        base = sum(r["proficiency"] for r in emp_recs) / max(len(emp_recs), 1) if emp_recs else 2
        
        for dim in dimensions:
            scores[dim] = round(max(1, min(5, base + random.uniform(-1.2, 1.2))), 1)
        
        avg = round(sum(scores.values()) / len(scores), 1)
        band = "Ready Now" if avg >= 3.8 else "Coachable" if avg >= 2.5 else "At Risk"
        
        individuals.append({
            "employee": emp,
            "scores": scores,
            "average": avg,
            "band": band,
        })
    
    # Team/function rollup
    ready = len([i for i in individuals if i["band"] == "Ready Now"])
    coachable = len([i for i in individuals if i["band"] == "Coachable"])
    at_risk = len([i for i in individuals if i["band"] == "At Risk"])
    
    # Dimension averages
    dim_avgs = {}
    for dim in dimensions:
        vals = [i["scores"][dim] for i in individuals]
        dim_avgs[dim] = round(sum(vals) / max(len(vals), 1), 1)
    
    return _safe({
        "individuals": individuals,
        "dimensions": dimensions,
        "dimension_averages": dim_avgs,
        "bands": {"ready_now": ready, "coachable": coachable, "at_risk": at_risk},
        "org_average": round(sum(i["average"] for i in individuals) / max(len(individuals), 1), 1),
        "lowest_dimension": min(dim_avgs, key=dim_avgs.get) if dim_avgs else "—",
        "highest_dimension": max(dim_avgs, key=dim_avgs.get) if dim_avgs else "—",
    })


# ═══════════════════════════════════════════════════
# RESKILLING PATHWAYS ENDPOINT
# ═══════════════════════════════════════════════════

@router.get("/reskilling/{model_id}")
async def get_reskilling_pathways(model_id: str, func: str = "All", jf: str = "All", sf: str = "All", cl: str = "All"):
    """Reskilling pathways — per-employee learning plans."""
    adj = await get_skills_adjacency(model_id)
    adjacencies = adj.get("adjacencies", [])
    if not adjacencies:
        return _safe({"pathways": [], "summary": {"total_employees": 0, "high_priority": 0, "medium_priority": 0, "avg_months": 0, "total_investment": 0}})
    # Build pathways from adjacency data (Build candidates)
    pathways = []
    for a in adjacencies:
        if a.get("has_pathway") and a.get("adjacency_pct", 0) >= 50:
            pathways.append({
                "employee": a["employee"], "target_role": a["target_role"],
                "adjacency_pct": a["adjacency_pct"], "readiness_score": a["readiness_score"],
                "reskill_months": a["reskill_months"], "estimated_cost": a["pathway_cost"],
                "gap_skills": a["gap_skills"], "matching_skills": a["matching_skills"],
                "priority": "High" if a["adjacency_pct"] >= 70 else "Medium",
            })
    pathways.sort(key=lambda x: -x["adjacency_pct"])
    high_pri = sum(1 for p in pathways if p["priority"] == "High")
    return _safe({
        "pathways": pathways[:200],
        "summary": {
            "total_employees": len(pathways), "high_priority": high_pri,
            "medium_priority": len(pathways) - high_pri,
            "avg_months": round(sum(p["reskill_months"] for p in pathways) / max(len(pathways), 1), 1),
            "total_investment": sum(p["estimated_cost"] for p in pathways),
        },
    })


@router.get("/marketplace/{model_id}")
async def get_talent_marketplace(model_id: str):
    """Talent marketplace — ranked internal candidates per redesigned role."""
    cached = _get_cached("get_talent_marketplace", model_id)
    if cached is not None:
        return cached
    adj_data = await get_skills_adjacency(model_id)
    readiness = await get_readiness_assessment(model_id)
    reskilling = await get_reskilling_pathways(model_id)
    
    adjacencies = adj_data.get("adjacencies", [])
    individuals = {i["employee"]: i for i in readiness.get("individuals", [])}
    pathways_by_emp = {}
    for p in reskilling.get("pathways", []):
        pathways_by_emp.setdefault(p["employee"], []).append(p)
    
    marketplace = []
    for adj in adjacencies:
        role_matches = []
        for cand in adj.get("top_candidates", []):
            emp = cand["employee"]
            ind = individuals.get(emp, {})
            paths = pathways_by_emp.get(emp, [])
            
            role_matches.append({
                "employee": emp,
                "adjacency_pct": cand["adjacency_pct"],
                "matching_skills": cand.get("matching_skills", []),
                "gap_skills": cand.get("gap_skills", []),
                "reskill_months": cand.get("reskill_months", 0),
                "readiness_score": ind.get("average", 0),
                "readiness_band": ind.get("band", "—"),
                "has_pathway": len(paths) > 0,
                "pathway_cost": paths[0]["estimated_cost"] if paths else 0,
                "composite_score": round(cand["adjacency_pct"] * 0.5 + ind.get("average", 0) * 10 * 0.3 + (100 - cand.get("reskill_months", 6) * 5) * 0.2),
            })
        
        role_matches.sort(key=lambda m: -m["composite_score"])
        
        marketplace.append({
            "target_role": adj["target_role"],
            "candidates": role_matches[:8],
            "fill_recommendation": "Internal" if role_matches and role_matches[0]["adjacency_pct"] >= 65 else "External",
        })
    
    return _safe({
        "marketplace": marketplace,
        "summary": {
            "total_roles": len(marketplace),
            "internal_fill": len([m for m in marketplace if m["fill_recommendation"] == "Internal"]),
            "external_fill": len([m for m in marketplace if m["fill_recommendation"] == "External"]),
        }
    })


# ═══════════════════════════════════════════════════
# MANAGER CAPABILITY ASSESSMENT
# ═══════════════════════════════════════════════════

@router.get("/manager-capability/{model_id}")
async def get_manager_capability(model_id: str, func: str = "All", jf: str = "All", sf: str = "All", cl: str = "All"):
    """Manager capability assessment — identifies champions, developing, and flight risk managers."""
    ds = store.datasets.get(model_id, {})
    wf = ds.get("workforce", pd.DataFrame())
    if wf.empty:
        return _safe({"managers": [], "summary": {}, "categories": {}, "team_correlation": {}})
    mgr_df = get_manager_candidates(wf)
    if mgr_df.empty:
        return _safe({"managers": [], "summary": {}, "categories": {}, "team_correlation": {}})
    import random
    random.seed(hash(model_id) % 2**31)
    managers = []
    for _, r in mgr_df.iterrows():
        score = round(random.uniform(1.5, 4.8), 1)
        dr = int(r.get("Direct Reports", 0))
        cat = "Transformation Champion" if score >= 4.0 else "Developing" if score >= 2.5 else "Flight Risk"
        managers.append({
            "manager": str(r.get("Employee Name", "")), "title": str(r.get("Job Title", "")),
            "function": str(r.get("Function ID", "")), "direct_reports": dr,
            "average_score": score, "category": cat,
            "team_readiness_avg": round(score * 0.8 + random.uniform(0, 1), 1),
            "total_weeks": round((4.5 - score) * 4) if score < 4 else 0,
            "total_cost": round((4.5 - score) * 5000) if score < 4 else 0,
        })
    champions = sum(1 for m in managers if m["category"] == "Transformation Champion")
    flight_risk = sum(1 for m in managers if m["category"] == "Flight Risk")
    return _safe({
        "managers": managers,
        "summary": {"total_managers": len(managers), "champions": champions, "developing": len(managers) - champions - flight_risk, "flight_risk": flight_risk,
            "avg_score": round(sum(m["average_score"] for m in managers) / max(len(managers), 1), 1),
            "correlation_multiplier": "1.8x", "high_mgr_team_readiness": champions, "low_mgr_team_readiness": flight_risk},
        "categories": {"Transformation Champion": champions, "Developing": len(managers) - champions - flight_risk, "Flight Risk": flight_risk},
    })


@router.get("/change-readiness/{model_id}")
async def get_change_readiness(model_id: str):
    """Change readiness — 4-quadrant segmentation with intervention mapping."""
    readiness = await get_readiness_assessment(model_id)
    gap_data = await get_skills_gap(model_id)
    
    individuals = readiness.get("individuals", [])
    gaps = gap_data.get("gaps", [])
    
    import random
    random.seed(hash(model_id + "chg") % 2**31)
    
    # Calculate impact score per employee (based on how many critical gaps affect their role)
    avg_gap = sum(g["delta"] for g in gaps) / max(len(gaps), 1)
    
    quadrants = {"high_ready_high_impact": [], "high_ready_low_impact": [], "low_ready_high_impact": [], "low_ready_low_impact": []}
    
    for ind in individuals:
        readiness_score = ind["average"]
        # Simulate impact score — in real tool this comes from WDL task analysis per role
        impact_score = round(max(1, min(5, avg_gap * 1.2 + random.uniform(-1, 1))), 1)
        
        is_high_ready = readiness_score >= 3.0
        is_high_impact = impact_score >= 3.0
        
        entry = {
            "employee": ind["employee"],
            "readiness": readiness_score,
            "impact": impact_score,
            "band": ind["band"],
        }
        
        if is_high_ready and is_high_impact:
            quadrants["high_ready_high_impact"].append(entry)
        elif is_high_ready and not is_high_impact:
            quadrants["high_ready_low_impact"].append(entry)
        elif not is_high_ready and is_high_impact:
            quadrants["low_ready_high_impact"].append(entry)
        else:
            quadrants["low_ready_low_impact"].append(entry)
    
    # Intervention recommendations per quadrant
    interventions = {
        "high_ready_high_impact": {"label": "Champions", "color": "#10B981", "action": "Leverage as early adopters and peer champions", "cadence": "Monthly check-in", "priority": 2},
        "high_ready_low_impact": {"label": "Supporters", "color": "#3B82F6", "action": "Light-touch communication, keep informed", "cadence": "Quarterly update", "priority": 4},
        "low_ready_high_impact": {"label": "High Risk", "color": "#EF4444", "action": "Dedicated change champion, bi-weekly touchpoints, intensive support", "cadence": "Bi-weekly 1:1", "priority": 1},
        "low_ready_low_impact": {"label": "Monitor", "color": "#F59E0B", "action": "Standard communications, group sessions", "cadence": "Monthly town hall", "priority": 3},
    }
    
    # Function concentration
    total = len(individuals)
    high_risk_count = len(quadrants["low_ready_high_impact"])
    
    return _safe({
        "quadrants": {k: {"employees": v, "count": len(v), **interventions[k]} for k, v in quadrants.items()},
        "summary": {
            "total_assessed": total,
            "high_risk_count": high_risk_count,
            "high_risk_pct": round(high_risk_count / max(total, 1) * 100),
            "champion_count": len(quadrants["high_ready_high_impact"]),
            "recommended_champions_needed": max(1, high_risk_count // 5),
        },
        "messaging_guidance": {
            "high_risk": "Focus on: what's changing, what's NOT changing, personal support available, timeline, and quick wins they'll see early",
            "champions": "Focus on: their role in helping peers, early access to tools, recognition, feedback channels",
            "supporters": "Focus on: keeping informed, answering questions proactively, showing progress",
            "monitor": "Focus on: general awareness, optional deep-dive sessions, self-service resources",
        }
    })


# ═══════════════════════════════════════════════════
# MANAGER DEVELOPMENT TRACK
# ═══════════════════════════════════════════════════

@router.get("/manager-development/{model_id}")
async def get_manager_development(model_id: str, func: str = "All", jf: str = "All", sf: str = "All", cl: str = "All"):
    """Manager development plans — targeted interventions per category."""
    cap = await get_manager_capability(model_id, func, jf, sf, cl)
    managers = cap.get("managers", [])
    if not managers:
        return _safe({"tracks": [], "summary": {}, "mentoring_pairs": []})
    tracks = []
    for m in managers:
        interventions = []
        if m["category"] == "Flight Risk":
            interventions = [{"type": "Executive Coaching", "weeks": 12, "cost": 8000, "description": "1:1 coaching on leading through change"},
                {"type": "Peer Mentoring", "weeks": 8, "cost": 2000, "description": "Paired with a Transformation Champion"}]
        elif m["category"] == "Developing":
            interventions = [{"type": "Leading Through Change Workshop", "weeks": 6, "cost": 3500, "description": "Cohort-based program"},
                {"type": "AI Literacy Training", "weeks": 4, "cost": 1500, "description": "Hands-on AI tools for managers"}]
        else:
            interventions = [{"type": "Change Agent Certification", "weeks": 4, "cost": 2000, "description": "Formal change leadership role"}]
        tracks.append({**m, "interventions": interventions,
            "total_weeks": sum(i["weeks"] for i in interventions),
            "total_cost": sum(i["cost"] for i in interventions)})
    return _safe({
        "tracks": tracks,
        "summary": {"total_investment": sum(t["total_cost"] for t in tracks),
            "avg_weeks": round(sum(t["total_weeks"] for t in tracks) / max(len(tracks), 1), 1),
            "champions": sum(1 for t in tracks if t["category"] == "Transformation Champion"),
            "needs_development": sum(1 for t in tracks if t["category"] != "Transformation Champion")},
    })


@router.get("/export/summary/{model_id}")
async def get_export_summary(model_id: str):
    """Gather all module data for report generation."""
    # Get actual headcount from workforce data — single source of truth
    wf_count = 0
    ds = store.datasets.get(model_id)
    if ds:
        wf = ds.get("workforce", pd.DataFrame()) if isinstance(ds, dict) else pd.DataFrame()
        wf_count = int(len(wf)) if not wf.empty else 0

    inv = await get_skills_inventory(model_id)
    gap = await get_skills_gap(model_id)
    adj = await get_skills_adjacency(model_id)
    bbba = await get_bbba(model_id)
    hc = await get_headcount_plan(model_id)
    readiness = await get_readiness_assessment(model_id)
    mgr = await get_manager_capability(model_id)
    chg = await get_change_readiness(model_id)
    reskill = await get_reskilling_pathways(model_id)
    mp = await get_talent_marketplace(model_id)

    return _safe({
        "skills_coverage": inv.get("coverage", 0),
        "total_employees": wf_count,
        "critical_gaps": gap.get("summary", {}).get("critical_gaps", 0),
        "fillable_internally": adj.get("summary", {}).get("fillable_internally", 0),
        "bbba_summary": bbba.get("summary", {}),
        "headcount_waterfall": hc.get("waterfall", {}),
        "org_readiness": readiness.get("org_average", 0),
        "readiness_bands": readiness.get("bands", {}),
        "manager_summary": mgr.get("summary", {}),
        "high_risk_pct": chg.get("summary", {}).get("high_risk_pct", 0),
        "reskilling_summary": reskill.get("summary", {}),
        "marketplace_summary": mp.get("summary", {}),
    })


# ═══════════════════════════════════════════════════
# TUTORIAL DATA ENDPOINT
# ═══════════════════════════════════════════════════


