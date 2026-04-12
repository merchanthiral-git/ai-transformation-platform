"""Org Stress Tester Agent — cascades shock impacts across all org dimensions.

Applies a shock (talent loss, regulation, acquisition, budget cut, competitive
pressure) and models cascading effects across headcount, spans, costs, skills
gaps, and reskilling timelines.
"""

import json

from app.ai_providers import call_claude_sync, claude_available, NO_KEY_MSG, CLAUDE_MODEL
from .negotiator import _build_current_state
from .memory import save_snapshot, get_last_snapshot, get_recent_memories


STRESS_SYSTEM = """You are an expert organizational risk analyst. You will be given an organization's current state and a shock scenario. Model the cascading impact of this shock across all organizational dimensions. Be specific, quantitative, and direct about severity. Use ONLY the actual numbers from the current state data.

Rules:
- Every number must be derivable from or proportional to the current state data.
- Cascade effects must flow logically (e.g., losing 20% engineers → skills gap → slower delivery → revenue risk).
- Vulnerability scores must reflect realistic organizational dynamics.
- Recovery phases must be concrete with realistic timelines and costs.
- Early warning signals must be actionable and measurable.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""


def run_stress_test(project_id: str, shock: dict, model_id: str = "", user_id: str = "") -> dict:
    """Run organizational stress test for a given shock scenario."""
    if not claude_available:
        return {"error": True, "message": NO_KEY_MSG}

    current_state = _build_current_state(model_id, user_id)
    if not current_state:
        return {"error": True, "message": "No workforce data available. Upload data first."}

    # Load prior agent insights for richer context
    prior_context = ""
    for agent_name in ["diagnosis", "readiness", "negotiator", "stress_test"]:
        snap = get_last_snapshot(project_id, agent_name)
        if snap and snap.get("findings"):
            summary = snap["findings"].get("executive_summary", "") or snap["findings"].get("reasoning", "")
            if summary:
                prior_context += f"\nPrior {agent_name}: {summary[:200]}"

    shock_json = json.dumps(shock, indent=2, default=str)

    prompt = f"""Model the cascading impact of this organizational shock.

CURRENT ORGANIZATION STATE:
{json.dumps(current_state, indent=2, default=str)}

SHOCK SCENARIO:
{shock_json}
{prior_context}

INSTRUCTIONS:
1. Calculate the immediate quantified impact on headcount, cost, and capabilities.
2. Trace 3-5 cascade effects — each triggered by a prior impact.
3. Score organizational vulnerability across 6+ dimensions (0=fragile, 10=resilient).
4. Design a phased recovery plan with concrete actions, timelines, and costs.
5. Identify 3-5 early warning signals that would indicate the shock is materializing.

Return this exact JSON structure:
{{
  "shock_summary": "One sentence describing the shock and its scale",
  "severity": "critical|high|medium|low",
  "immediate_impacts": [
    {{ "dimension": "Headcount|Cost|Skills|Delivery|Leadership|Culture", "impact_description": "what happens", "quantified_change": "specific number or %", "timeframe": "immediate|30 days|90 days" }}
  ],
  "cascade_effects": [
    {{ "trigger": "what causes this", "effect": "what happens next", "affected_functions": ["func1"], "affected_roles": ["role1"], "severity": "critical|high|medium|low", "timeframe": "when this hits" }}
  ],
  "vulnerability_map": [
    {{ "area": "dimension name", "current_resilience": 0-10, "post_shock_resilience": 0-10, "why_vulnerable": "explanation" }}
  ],
  "recovery_path": {{
    "phases": [
      {{ "phase": "Phase name", "actions": ["action1", "action2"], "timeline": "M1-M3", "cost_estimate": 500000, "success_metric": "what shows this worked" }}
    ],
    "total_recovery_months": 12,
    "total_cost_estimate": 2000000
  }},
  "early_warning_signals": [
    {{ "signal": "what to watch", "what_to_watch": "specific metric", "threshold": "when to act", "action_if_triggered": "what to do" }}
  ],
  "confidence": 0.0-1.0,
  "reasoning": "2-3 paragraph explanation of the analysis approach and key findings"
}}"""

    try:
        raw = call_claude_sync(prompt, system=STRESS_SYSTEM, model=CLAUDE_MODEL, max_tokens=2500, json_mode=True)
        result = json.loads(raw)
    except json.JSONDecodeError:
        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            result = json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"error": True, "message": "Failed to parse stress test response"}
    except Exception as e:
        return {"error": True, "message": str(e)}

    # Save to agent memory
    save_snapshot(project_id, "stress_test", result,
                  result.get("confidence", 0.5),
                  {"shock": shock, "current_state": current_state})

    result["current_state"] = current_state
    result["shock_input"] = shock
    result["from_memory"] = False
    return result
