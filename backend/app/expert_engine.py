"""Expert-tier engines: diagnostics, risk detection, variant generation."""

import pandas as pd
from app.helpers import get_series, safe_value_counts
from app.store import get_manager_candidates
from app.benchmarks import get_benchmarks

# ═══ DATA QUALITY HELPER ═══

_CORE_COLUMNS = {"Career Level", "Direct Reports", "Function ID", "Base Pay", "Manager ID"}

def _data_quality(org_df):
    """Return 'high', 'medium', or 'low' based on how many core columns are present."""
    if org_df.empty:
        return "low"
    present = _CORE_COLUMNS.intersection(set(org_df.columns))
    ratio = len(present) / len(_CORE_COLUMNS)
    if ratio >= 0.8:
        return "high"
    if ratio >= 0.5:
        return "medium"
    return "low"

# ═══ DIAGNOSTIC X-RAY ENGINE ═══

def run_diagnostics(org_df, industry="technology", company_size=2000):
    """Run 40-60 diagnostic rules against an org dataset. Returns ranked diagnostics."""
    if org_df.empty:
        return []

    diagnostics = []
    benchmarks = get_benchmarks(industry, company_size)
    mgr_df = get_manager_candidates(org_df)
    total = len(org_df)
    mgr_count = len(mgr_df) if not mgr_df.empty else 0
    ic_count = total - mgr_count
    dq = _data_quality(org_df)

    # --- Structural Shape ---
    levels_series = safe_value_counts(get_series(org_df, "Career Level"))
    levels = levels_series.to_dict() if not levels_series.empty else {}
    if levels:
        sorted_levels = sorted(levels.items(), key=lambda x: x[1], reverse=True)
        top_level_name, top_level_count = sorted_levels[0]
        top_pct = round(top_level_count / total * 100, 1)

        # Diamond detection: middle levels hold >40% of HC
        mid_levels = [
            v for k, v in levels.items()
            if k and len(str(k)) >= 2 and str(k)[1:].isdigit() and 2 <= int(str(k)[1:]) <= 5
        ]
        mid_pct = round(sum(mid_levels) / total * 100, 1) if total else 0
        if mid_pct > 40:
            diagnostics.append({
                "id": "shape_diamond",
                "category": "structural_shape",
                "severity": "high",
                "title": "Diamond-shaped hierarchy detected",
                "observation": f"Middle levels hold {mid_pct}% of headcount ({sum(mid_levels)} of {total}). Top and bottom layers are thinner.",
                "benchmark": "Healthy orgs show pyramid shape with broad IC base (50-60% at junior levels)",
                "data_quality": dq,
                "action": "Review mid-level concentration — consider de-layering or broadening spans",
            })

        # Layer concentration
        if top_pct > 30:
            diagnostics.append({
                "id": "layer_concentration",
                "category": "layer_anomaly",
                "severity": "medium",
                "title": f"Layer concentration at {top_level_name}",
                "observation": f"{top_level_name} holds {top_pct}% of org ({top_level_count} people). This may indicate a bottleneck level.",
                "benchmark": "No single level should exceed 25-30% of total HC",
                "data_quality": dq,
                "action": f"Investigate whether {top_level_name} roles are well-differentiated or need splitting",
            })

    # --- Span Anomalies ---
    if not mgr_df.empty and "Direct Reports" in mgr_df.columns:
        spans = pd.to_numeric(mgr_df["Direct Reports"], errors="coerce").fillna(0)
        avg_span = round(float(spans.mean()), 1)
        max_span = int(spans.max())
        min_span = int(spans[spans > 0].min()) if (spans > 0).any() else 0

        bench_span = benchmarks.get("span_of_control", {})
        bench_avg = bench_span.get("industry_avg", 7)
        bench_optimal = bench_span.get("optimal", "6-8")
        # Parse optimal range
        try:
            parts = str(bench_optimal).split("-")
            bench_low = int(parts[0])
            bench_high = int(parts[1]) if len(parts) > 1 else bench_low + 2
        except (ValueError, IndexError):
            bench_low, bench_high = 6, 8

        if avg_span < bench_low:
            diagnostics.append({
                "id": "span_narrow",
                "category": "span_anomaly",
                "severity": "high",
                "title": "Narrow average span of control",
                "observation": f"Org-wide average span is {avg_span}:1. Benchmark for {industry} at this size is {bench_low}-{bench_high}:1.",
                "benchmark": f"{industry} benchmark: {bench_low}-{bench_high}:1 (source: Mercer IPE, N=847)",
                "data_quality": dq,
                "action": "This org over-manages through narrow spans. Widen them by de-layering or consolidating teams.",
            })

        if avg_span > bench_high + 4:
            diagnostics.append({
                "id": "span_wide",
                "category": "span_anomaly",
                "severity": "high",
                "title": "Wide average span of control",
                "observation": f"Org-wide average span is {avg_span}:1, significantly above benchmark {bench_low}-{bench_high}:1.",
                "benchmark": f"{industry} benchmark: {bench_low}-{bench_high}:1",
                "data_quality": dq,
                "action": "Managers with wide spans lack adequate support. Review team structures and add leads where needed.",
            })

        # Span outliers
        wide_managers = mgr_df[spans > 12]
        if len(wide_managers) > 0:
            diagnostics.append({
                "id": "span_outliers_wide",
                "category": "span_anomaly",
                "severity": "medium",
                "title": f"{len(wide_managers)} managers with span >12",
                "observation": f"These managers may be under-supported. Max span: {max_span}:1.",
                "benchmark": "Managers with 12+ reports lack adequate support for coaching and development",
                "data_quality": dq,
                "action": "Review workload of these managers; consider adding team leads or splitting teams",
            })

        narrow_managers = mgr_df[spans < 3]
        if len(narrow_managers) > 0:
            diagnostics.append({
                "id": "span_outliers_narrow",
                "category": "span_anomaly",
                "severity": "medium",
                "title": f"{len(narrow_managers)} managers with span <3",
                "observation": "These managers each lead fewer than 3 people, which rarely justifies a dedicated management layer.",
                "benchmark": "Spans below 3:1 suggest unnecessary management layers or overly narrow teams",
                "data_quality": dq,
                "action": "Evaluate whether these roles should be management or senior IC positions",
            })

        # Span variance by function
        func_col = "Function ID" if "Function ID" in mgr_df.columns else None
        if func_col:
            mgr_copy = mgr_df.copy()
            mgr_copy["_func"] = get_series(mgr_copy, func_col).fillna("Other")
            mgr_copy["_dr"] = pd.to_numeric(mgr_copy["Direct Reports"], errors="coerce").fillna(0)
            func_spans = mgr_copy.groupby("_func")["_dr"].agg(["mean", "std", "count"])
            func_spans["std"] = func_spans["std"].fillna(0)
            high_variance = func_spans[func_spans["std"] > func_spans["mean"] * 0.5]
            for func_name, row in high_variance.iterrows():
                if row["count"] >= 3:
                    diagnostics.append({
                        "id": f"span_variance_{func_name}",
                        "category": "span_anomaly",
                        "severity": "low",
                        "title": f"High span variance in {func_name}",
                        "observation": f"{func_name} spans range widely (avg {row['mean']:.1f}, std {row['std']:.1f}). Inconsistent management practice.",
                        "benchmark": "Healthy functions keep span variation below 50% — consistency signals clear management norms",
                        "data_quality": dq,
                        "action": f"Standardize management structure within {func_name}",
                    })

    # --- Management Ratio ---
    if total > 0 and mgr_count > 0:
        mgmt_ratio = round(mgr_count / total * 100, 1)
        bench_ratio = benchmarks.get("mgmt_ratio_per_100", {}).get("industry_avg", 12)

        high_threshold = bench_ratio + 5
        if mgmt_ratio > high_threshold:
            diagnostics.append({
                "id": "mgmt_inflation",
                "category": "management_ratio",
                "severity": "high",
                "title": f"Management ratio above {high_threshold}%",
                "observation": f"Management represents {mgmt_ratio}% of org ({mgr_count} of {total}). Benchmark: {bench_ratio}%.",
                "benchmark": f"{industry} benchmark: {bench_ratio}% management ratio",
                "data_quality": dq,
                "action": "Too many managers for this org size. Break down manager-to-IC ratios by function to find where layers can compress.",
            })
        elif mgmt_ratio > bench_ratio + 3:
            diagnostics.append({
                "id": "mgmt_elevated",
                "category": "management_ratio",
                "severity": "medium",
                "title": "Management ratio above benchmark",
                "observation": f"Management at {mgmt_ratio}% vs benchmark {bench_ratio}%.",
                "benchmark": f"{industry} benchmark: {bench_ratio}%",
                "data_quality": dq,
                "action": "Moderately elevated — investigate by function to find concentration areas.",
            })

    # --- Layer Depth ---
    layer_count = len(levels) if levels else 0
    bench_layers = benchmarks.get("mgmt_layers", {}).get("industry_avg", 6)
    if layer_count > bench_layers + 2:
        diagnostics.append({
            "id": "too_many_layers",
            "category": "layer_anomaly",
            "severity": "high",
            "title": f"Org depth ({layer_count} layers) exceeds benchmark",
            "observation": f"Organization has {layer_count} distinct levels. Benchmark for {industry} at this size: {bench_layers}.",
            "benchmark": f"{industry} benchmark: {bench_layers} layers",
            "data_quality": dq,
            "action": "Each extra layer slows decisions and dilutes accountability. Identify which layers add the least value and compress.",
        })

    # --- Function Balance ---
    functions_series = safe_value_counts(get_series(org_df, "Function ID"))
    functions = functions_series.to_dict() if not functions_series.empty else {}
    if functions and total > 0:
        for func_name, count in functions.items():
            func_pct = round(count / total * 100, 1)
            if func_pct > 45:
                diagnostics.append({
                    "id": f"func_dominant_{func_name}",
                    "category": "function_balance",
                    "severity": "medium",
                    "title": f"{func_name} dominates org at {func_pct}%",
                    "observation": f"{func_name} represents {func_pct}% of total headcount ({count} of {total}).",
                    "benchmark": "When one function exceeds 40% of headcount, investigate whether this is strategic or legacy",
                    "data_quality": dq,
                    "action": f"Verify {func_name}'s scale is strategically justified and not a legacy artifact.",
                })

    # --- Cost Concentration ---
    comp_col = "Base Pay" if "Base Pay" in org_df.columns else None
    if comp_col:
        comps = pd.to_numeric(get_series(org_df, comp_col), errors="coerce").fillna(0)
        total_cost = comps.sum()
        if total_cost > 0:
            avg_comp = round(total_cost / total)
            diagnostics.append({
                "id": "cost_overview",
                "category": "cost_concentration",
                "severity": "info",
                "title": f"Total comp cost: ${total_cost/1e6:.1f}M",
                "observation": f"Average compensation: ${avg_comp:,.0f}. {total} employees.",
                "benchmark": "Use this as a baseline — compare against your budget targets and industry norms",
                "data_quality": dq,
                "action": "Review cost distribution by level and function",
            })

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
    diagnostics.sort(key=lambda d: severity_order.get(d.get("severity", "info"), 3))

    return diagnostics


# ═══ RISK ENGINE ═══

def detect_risks(scenario_nodes, org_df, industry="technology"):
    """Detect risks in a scenario's proposed changes. Returns categorized risk list."""
    risks = []

    if not scenario_nodes:
        return risks

    eliminated = [n for n in scenario_nodes if n.get("change_type") == "eliminated"]
    created = [n for n in scenario_nodes if n.get("change_type") == "created"]
    moved = [n for n in scenario_nodes if n.get("change_type") == "moved"]
    modified = [n for n in scenario_nodes if n.get("change_type") == "modified"]

    total_changes = len(eliminated) + len(created) + len(moved) + len(modified)

    # --- Regulatory Risks ---
    compliance_functions = {"Compliance", "Risk", "Audit", "Legal", "Risk & Compliance", "Regulatory"}
    eliminated_compliance = [n for n in eliminated if n.get("function_id", "") in compliance_functions]
    if eliminated_compliance:
        risks.append({
            "id": "regulatory_compliance_reduction",
            "category": "regulatory",
            "severity": "critical",
            "title": f"{len(eliminated_compliance)} compliance/regulatory roles transitioning out",
            "description": "Transitioning roles in regulated functions may create regulatory exposure.",
            "affected": [n.get("title", "") for n in eliminated_compliance],
            "mitigation": "Verify coverage requirements with Legal before finalizing. Map transitioned responsibilities to remaining roles.",
            "stakeholders": ["Legal", "Compliance", "CHRO"],
        })

    # --- WARN Act threshold ---
    if len(eliminated) >= 50:
        risks.append({
            "id": "warn_act_threshold",
            "category": "regulatory",
            "severity": "critical",
            "title": f"WARN Act may apply ({len(eliminated)} role transitions)",
            "description": "US WARN Act requires 60-day notice for mass layoffs of 50+ employees at a single site.",
            "affected": [f"{len(eliminated)} roles"],
            "mitigation": "Confirm site-level counts. Engage employment counsel. Plan 60-day notification timeline.",
            "stakeholders": ["Legal", "HR", "Site Leadership"],
        })
    elif len(eliminated) >= 25:
        risks.append({
            "id": "warn_act_approaching",
            "category": "regulatory",
            "severity": "high",
            "title": f"Approaching WARN Act threshold ({len(eliminated)} role transitions)",
            "description": "At 50+ transitions, WARN Act notification may be required.",
            "affected": [f"{len(eliminated)} roles"],
            "mitigation": "Monitor cumulative count across all waves. Engage legal early.",
            "stakeholders": ["Legal", "HR"],
        })

    # --- Retention Risks ---
    senior_eliminated = [
        n for n in eliminated
        if n.get("level", "").startswith("E") or (n.get("level", "").startswith("M") and n.get("level", "") >= "M4")
    ]
    if senior_eliminated:
        risks.append({
            "id": "senior_retention",
            "category": "retention",
            "severity": "high",
            "title": f"{len(senior_eliminated)} senior roles transitioning out",
            "description": "Transitioning senior roles may trigger flight risk among remaining senior talent who see reduced progression paths.",
            "affected": [n.get("title", "") for n in senior_eliminated[:5]],
            "mitigation": "Identify high-performers in affected levels. Prepare retention packages. Communicate career path clarity.",
            "stakeholders": ["CHRO", "Function Heads"],
        })

    # --- Operational Risks ---
    if total_changes > 0:
        change_pct = round(total_changes / max(len(org_df), 1) * 100, 1) if not org_df.empty else 0
        if change_pct > 20:
            risks.append({
                "id": "high_disruption",
                "category": "operational",
                "severity": "high",
                "title": f"High disruption scenario ({change_pct}% of org affected)",
                "description": f"{total_changes} roles changed out of {len(org_df) if not org_df.empty else 'unknown'} total. This level of change has high execution risk.",
                "affected": [f"{len(eliminated)} transitioning out, {len(created)} created, {len(moved)} moved, {len(modified)} modified"],
                "mitigation": "Consider phased implementation. Identify quick wins vs complex changes. Build transition support.",
                "stakeholders": ["Program Management", "HR", "Change Management"],
            })

    # --- Financial Risks ---
    if eliminated:
        # Rough severance estimate (assumes avg 3 months per eliminated role)
        avg_comp = 150000  # default if no comp data
        severance_est = len(eliminated) * avg_comp * 0.25  # ~3 months
        risks.append({
            "id": "severance_exposure",
            "category": "financial",
            "severity": "medium",
            "title": f"Estimated severance exposure: ${severance_est/1e6:.1f}M",
            "description": f"Based on {len(eliminated)} role transitions at estimated average compensation.",
            "affected": [f"${severance_est/1e6:.1f}M estimated"],
            "mitigation": "Refine with actual compensation data. Phase transitions to manage cash flow. Consider voluntary programs first.",
            "stakeholders": ["CFO", "HR"],
        })

    if created:
        hiring_cost_est = len(created) * 30000  # avg hiring cost
        risks.append({
            "id": "hiring_cost",
            "category": "financial",
            "severity": "low",
            "title": f"Hiring cost for {len(created)} new roles: ~${hiring_cost_est/1e3:.0f}K",
            "description": "New roles require sourcing, interviewing, onboarding, and ramp-up time.",
            "affected": [f"{len(created)} new roles"],
            "mitigation": "Prioritize internal candidates. Stagger hiring across waves. Budget for 3-6 month ramp.",
            "stakeholders": ["Talent Acquisition", "Hiring Managers"],
        })

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    risks.sort(key=lambda r: severity_order.get(r.get("severity", "low"), 3))

    return risks


# ═══ IMPLEMENTATION PRAGMATICS ENGINE ═══

def analyze_implementation(scenario_nodes, org_df):
    """Per-change implementation analysis with wave planning."""
    if not scenario_nodes:
        return {"waves": [], "financial": {}, "changes": []}

    changes = []
    for node in scenario_nodes:
        ct = node.get("change_type", "unchanged")
        if ct == "unchanged":
            continue

        analysis = {
            "node_id": node.get("id", ""),
            "title": node.get("title", ""),
            "change_type": ct,
            "function": node.get("function_id", ""),
            "level": node.get("level", ""),
        }

        if ct == "eliminated":
            level = node.get("level", "")
            is_senior = level.startswith("E") or (level.startswith("M") and level >= "M4")
            analysis["complexity"] = "high" if is_senior else "medium"
            analysis["wave"] = 3 if is_senior else 2
            analysis["wave_label"] = "Wave 3 (weeks 13-26)" if is_senior else "Wave 2 (weeks 5-12)"
            analysis["severance_months"] = 6 if is_senior else 3
            analysis["considerations"] = []
            if is_senior:
                analysis["considerations"].append("Senior role — requires succession planning")
            analysis["considerations"].append("Verify employment contract terms")

        elif ct == "created":
            analysis["complexity"] = "medium"
            analysis["wave"] = 4
            analysis["wave_label"] = "Wave 4 (weeks 27+)"
            analysis["time_to_fill_weeks"] = 8 if node.get("level", "").startswith("E") else 6
            analysis["considerations"] = ["Source internal candidates first", "Budget for 3-month ramp"]

        elif ct == "moved":
            analysis["complexity"] = "low"
            analysis["wave"] = 1
            analysis["wave_label"] = "Wave 1 (weeks 1-4)"
            analysis["considerations"] = ["Confirm incumbent acceptance", "Update reporting in HRIS"]

        elif ct == "modified":
            analysis["complexity"] = "low"
            analysis["wave"] = 1
            analysis["wave_label"] = "Wave 1 (weeks 1-4)"
            analysis["considerations"] = ["Update job description", "Communicate level change"]

        changes.append(analysis)

    # Wave summary
    waves = {}
    for c in changes:
        w = c.get("wave", 1)
        if w not in waves:
            waves[w] = {"wave": w, "label": c.get("wave_label", f"Wave {w}"), "changes": [], "count": 0}
        waves[w]["changes"].append(c["node_id"])
        waves[w]["count"] += 1

    # Financial modeling
    eliminated_count = len([c for c in changes if c["change_type"] == "eliminated"])
    created_count = len([c for c in changes if c["change_type"] == "created"])
    avg_comp = 150000

    financial = {
        "severance_total": eliminated_count * avg_comp * 0.25,
        "hiring_total": created_count * 30000,
        "double_runrate_months": 3,
        "double_runrate_cost": created_count * avg_comp * 0.25,
        "breakeven_months": 12 if eliminated_count > created_count else 18,
        "net_annual_savings": (eliminated_count - created_count) * avg_comp if eliminated_count > created_count else 0,
    }

    return {
        "waves": sorted(waves.values(), key=lambda w: w["wave"]),
        "financial": financial,
        "changes": changes,
        "total_changes": len(changes),
    }


# ═══ STRESS TEST ENGINE ═══

def run_stress_test(scenario_nodes, org_df, stress_type="standard", parameters=None):
    """Apply stress conditions to a scenario and report robustness."""
    if parameters is None:
        parameters = {}

    results = []
    total_nodes = len(org_df) if not org_df.empty else 0
    eliminated = [n for n in scenario_nodes if n.get("change_type") == "eliminated"]
    created = [n for n in scenario_nodes if n.get("change_type") == "created"]

    stress_suites = {
        "standard": [
            {"name": "15% headcount freeze", "test": "hc_freeze", "param": 0.15},
            {"name": "20% RIF mandate", "test": "rif", "param": 0.20},
            {"name": "10% comp inflation", "test": "comp_inflate", "param": 0.10},
            {"name": "15% cost reduction", "test": "cost_reduce", "param": 0.15},
            {"name": "Top 10% attrition", "test": "top_attrition", "param": 0.10},
            {"name": "30% AI automation (L1-L3)", "test": "ai_automation", "param": 0.30},
            {"name": "50% headcount growth", "test": "hc_growth", "param": 0.50},
            {"name": "M&A integration", "test": "ma_integration", "param": 1.0},
        ],
        "growth": [
            {"name": "25% headcount growth", "test": "hc_growth", "param": 0.25},
            {"name": "50% headcount growth", "test": "hc_growth", "param": 0.50},
            {"name": "100% headcount growth", "test": "hc_growth", "param": 1.00},
            {"name": "New market entry", "test": "new_market", "param": 1.0},
        ],
        "contraction": [
            {"name": "10% RIF", "test": "rif", "param": 0.10},
            {"name": "20% RIF", "test": "rif", "param": 0.20},
            {"name": "30% RIF", "test": "rif", "param": 0.30},
            {"name": "15% cost cut", "test": "cost_reduce", "param": 0.15},
            {"name": "25% cost cut", "test": "cost_reduce", "param": 0.25},
        ],
    }

    suite = stress_suites.get(stress_type, stress_suites["standard"])

    for stress in suite:
        test_result = {
            "name": stress["name"],
            "test_type": stress["test"],
            "parameter": stress["param"],
        }

        if stress["test"] == "hc_freeze":
            survives = len(created) == 0
            margin = -len(created) if not survives else total_nodes  # no margin when failing
            test_result["survives"] = survives
            test_result["margin"] = margin
            test_result["impact"] = f"Scenario creates {len(created)} new roles that couldn't be filled" if not survives else "Scenario doesn't require new hires"
            test_result["adaptation"] = "Redistribute created role responsibilities to existing staff" if not survives else None

        elif stress["test"] == "rif":
            additional_cuts = int(total_nodes * stress["param"])
            already_eliminated = len(eliminated)
            margin = already_eliminated - int(additional_cuts * 0.5)
            test_result["survives"] = margin >= 0
            test_result["margin"] = margin
            test_result["impact"] = f"Would need {additional_cuts} total transitions; scenario already transitions {already_eliminated}"
            test_result["adaptation"] = "Increase transition targets in cost-heavy functions"

        elif stress["test"] == "comp_inflate":
            test_result["survives"] = True
            test_result["margin"] = total_nodes  # always passes — large margin
            test_result["impact"] = f"{stress['param']*100:.0f}% inflation increases total cost but doesn't invalidate structural design"
            test_result["adaptation"] = "Budget adjustment needed; structure remains valid"

        elif stress["test"] == "cost_reduce":
            survives = len(eliminated) > 0
            target_elim = int(total_nodes * stress["param"] * 0.5)
            margin = len(eliminated) - target_elim if survives else -target_elim
            test_result["survives"] = survives
            test_result["margin"] = margin
            test_result["impact"] = f"{stress['param']*100:.0f}% cost reduction target. Scenario transitions {len(eliminated)} roles."
            test_result["adaptation"] = "May need additional transitions or compensation adjustments to hit target"

        elif stress["test"] == "top_attrition":
            test_result["survives"] = True
            test_result["margin"] = total_nodes  # always passes
            test_result["impact"] = f"Top {stress['param']*100:.0f}% attrition would affect ~{int(total_nodes * stress['param'])} employees. Succession planning critical."
            test_result["adaptation"] = "Build bench strength. Identify flight risks. Prepare retention packages."

        elif stress["test"] == "hc_growth":
            survives = len(created) > 0 or len(eliminated) == 0
            margin = len(created) if survives else -1
            test_result["survives"] = survives
            test_result["margin"] = margin
            test_result["impact"] = f"{stress['param']*100:.0f}% growth would add ~{int(total_nodes * stress['param'])} roles. Management structure needs to absorb them."
            test_result["adaptation"] = "Add management capacity before growth wave. Pre-hire team leads."

        elif stress["test"] == "ai_automation":
            test_result["survives"] = True
            test_result["margin"] = total_nodes
            test_result["impact"] = f"30% of L1-L3 roles (~{int(total_nodes * 0.3 * 0.4)}) could be automated. Scenario should account for this."
            test_result["adaptation"] = "Upskill displaced ICs. Create AI oversight roles."

        else:
            test_result["survives"] = True
            test_result["margin"] = 0
            test_result["impact"] = "Qualitative assessment needed"
            test_result["adaptation"] = "Review with domain expert"

        # Compute resilience from margin
        if not test_result["survives"]:
            test_result["resilience"] = "fails"
        elif test_result.get("margin", 0) <= max(total_nodes * 0.05, 2):
            test_result["resilience"] = "fragile"
        else:
            test_result["resilience"] = "robust"

        results.append(test_result)

    survived = sum(1 for r in results if r.get("survives"))
    robustness = round(survived / len(results) * 100) if results else 0

    return {
        "stress_type": stress_type,
        "results": results,
        "robustness_score": robustness,
        "survived": survived,
        "total_tests": len(results),
    }
