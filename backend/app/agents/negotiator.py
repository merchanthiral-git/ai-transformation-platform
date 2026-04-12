"""Scenario Negotiator Agent — finds optimal scenarios that satisfy user constraints.

Given a set of constraints (cost targets, attrition limits, timelines),
the negotiator finds scenarios that satisfy as many must_have constraints
as possible, then maximizes nice_to_have ones. Where constraints conflict,
it quantifies the exact tradeoff.
"""

import json
from datetime import datetime

import pandas as pd

from app.ai_providers import call_claude_sync, claude_available, NO_KEY_MSG, CLAUDE_MODEL
from app.store import store, build_ai_priority_scores, get_manager_candidates
from app.helpers import get_series, safe_value_counts
from app.shared import _f
from .memory import save_snapshot, get_last_snapshot


NEGOTIATOR_SYSTEM = """You are an expert organizational design negotiator. You will be given an organization's current state and a set of transformation constraints. Your job is to find the optimal scenario that satisfies as many must_have constraints as possible, then maximize nice_to_have constraints. Where constraints conflict, quantify the exact tradeoff.

Rules:
- Use ONLY the actual numbers from the current state data. Never invent data.
- Every number in your response must be derivable from the current state.
- When constraints conflict, explain the mathematical relationship.
- Provide 2-3 concrete alternative scenarios when full satisfaction isn't possible.
- Be direct and consulting-grade — no hedging.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""


def _build_current_state(model_id: str, user_id: str = "") -> dict | None:
    """Build current org state summary for the negotiator."""
    mid = store.resolve_model_id(model_id, user_id)
    if mid not in store.datasets:
        return None

    data = store.get_filtered_data(mid, _f())
    wf = data["workforce"]
    wd = data["work_design"]

    if wf.empty:
        return None

    total = int(len(wf))

    # Function breakdown
    func_counts = safe_value_counts(get_series(wf, "Function ID"))
    functions = []
    for fn, count in func_counts.items():
        fn_str = str(fn).strip()
        if fn_str and fn_str != "nan":
            functions.append({
                "name": fn_str,
                "headcount": int(count),
                "cost_estimate": int(count) * 95000,  # avg comp estimate
            })

    # Manager/span analysis
    mgr_df = get_manager_candidates(wf if not data["org_design"].empty else wf)
    managers = int(len(mgr_df)) if not mgr_df.empty else 0
    avg_span = 0
    if not mgr_df.empty:
        spans = pd.to_numeric(get_series(mgr_df, "Direct Reports"), errors="coerce").fillna(0)
        avg_span = round(float(spans.mean()), 1)

    # Layers
    levels = safe_value_counts(get_series(wf, "Career Level"))
    layer_count = int(len(levels))

    # AI impact
    ai_stats = {}
    roles_ai = []
    if not wd.empty:
        scored = build_ai_priority_scores(wd)
        if not scored.empty and "AI Priority" in scored.columns:
            high = int((scored["AI Priority"] >= 7).sum())
            mod = int(((scored["AI Priority"] >= 4) & (scored["AI Priority"] < 7)).sum())
            low = int((scored["AI Priority"] < 4).sum())
            ai_stats = {"high_impact_tasks": high, "moderate_tasks": mod, "low_impact_tasks": low, "total_tasks": int(len(scored))}
            for title, g in scored.groupby(get_series(scored, "Job Title").astype(str)):
                t = str(title).strip()
                if t and t != "nan":
                    roles_ai.append({"title": t, "avg_ai_score": round(float(g["AI Priority"].mean()), 1), "tasks": int(len(g))})
            roles_ai.sort(key=lambda x: -x["avg_ai_score"])

    total_cost = sum(f["cost_estimate"] for f in functions)

    return {
        "headcount": total,
        "cost": total_cost,
        "avg_span": avg_span,
        "layers": layer_count,
        "managers": managers,
        "ics": total - managers,
        "functions": functions[:10],
        "roles_with_ai_data": roles_ai[:15],
        "ai_stats": ai_stats,
    }


def run_negotiation(project_id: str, constraints: list, model_id: str = "", user_id: str = "") -> dict:
    """Run the scenario negotiation agent."""
    if not claude_available:
        return {"error": True, "message": NO_KEY_MSG}

    current_state = _build_current_state(model_id, user_id)
    if not current_state:
        return {"error": True, "message": "No workforce data available. Upload data first."}

    # Load prior agent insights
    diag = get_last_snapshot(project_id, "diagnosis")
    scenario = get_last_snapshot(project_id, "scenario")
    prior_context = ""
    if diag:
        exec_summary = diag.get("findings", {}).get("executive_summary", "")
        if exec_summary:
            prior_context += f"\nPrior diagnosis: {exec_summary}"
    if scenario:
        narrative = scenario.get("findings", {}).get("narrative", "")
        if narrative:
            prior_context += f"\nPrior scenario: {narrative[:300]}"

    constraints_text = json.dumps(constraints, indent=2, default=str)

    prompt = f"""Negotiate an optimal transformation scenario for this organization.

CURRENT STATE:
{json.dumps(current_state, indent=2, default=str)}

CONSTRAINTS:
{constraints_text}

AVAILABLE LEVERS:
- Headcount reduction (via attrition, automation, role consolidation)
- Span of control adjustment (widen spans to reduce managers)
- Layer flattening (remove management layers)
- Role automation (based on AI impact scores)
- Reskilling investment (redeploy rather than terminate)
- Timeline extension (slower change = lower attrition)
{prior_context}

Return this exact JSON structure:
{{
  "feasibility": "fully_achievable|partially_achievable|not_achievable",
  "scenario": {{
    "name": "Descriptive scenario name",
    "headcount_delta": -50,
    "headcount_pct_change": -6.2,
    "cost_delta": -5000000,
    "cost_delta_pct": -9.4,
    "timeline_months": 18,
    "attrition_pct": 4.2,
    "involuntary_attrition_pct": 2.1,
    "span_change": 1.5,
    "new_avg_span": 8.5,
    "layer_change": -1,
    "new_layers": 8,
    "reskilling_investment": 2000000,
    "automation_coverage_pct": 35,
    "function_impacts": [{{ "function": "name", "headcount_delta": -10, "rationale": "why" }}]
  }},
  "constraints_met": [{{ "metric": "metric name", "target": "user target", "achieved_value": "actual value", "status": "met|partial|missed" }}],
  "tradeoffs": [{{ "constraint_a": "first constraint", "constraint_b": "second constraint", "description": "why they conflict", "resolution_options": ["option 1", "option 2"] }}],
  "negotiated_alternatives": [{{ "description": "Alternative name", "what_changes": "key difference", "what_you_gain": "benefit", "what_you_give_up": "cost" }}],
  "reasoning": "2-3 paragraph explanation of the approach and key decisions",
  "confidence": 0.0-1.0
}}"""

    try:
        raw = call_claude_sync(prompt, system=NEGOTIATOR_SYSTEM, model=CLAUDE_MODEL, max_tokens=2500, json_mode=True)
        result = json.loads(raw)
    except json.JSONDecodeError:
        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            result = json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"error": True, "message": "Failed to parse negotiation response"}
    except Exception as e:
        return {"error": True, "message": str(e)}

    # Save to agent memory
    save_snapshot(project_id, "negotiator", result,
                  result.get("confidence", 0.5),
                  {"constraints": constraints, "current_state": current_state})

    result["current_state"] = current_state
    result["from_memory"] = False
    return result
