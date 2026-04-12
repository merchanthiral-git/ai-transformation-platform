"""Multi-Agent System — Event-sourced, stateless agents with memory
Architecture: Anthropic Managed Agents pattern + ReAct reasoning + hierarchical coordination
"""

import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter()

# ── Agent Registry ──
AGENTS = {
    "watcher": {"name": "The Watcher", "icon": "👁️", "desc": "Monitors data changes, anomalies, and staleness", "default_autonomy": "suggest", "tools": ["read_employees", "calculate_org_metrics"]},
    "analyst": {"name": "The Analyst", "icon": "🔬", "desc": "Detects patterns, correlations, and outliers", "default_autonomy": "suggest", "tools": ["read_employees", "score_ai_impact", "calculate_org_metrics"]},
    "designer": {"name": "The Designer", "icon": "✏️", "desc": "Redesigns roles, tasks, and structures", "default_autonomy": "suggest", "tools": ["deconstruct_role", "generate_job_profile", "score_ai_impact"]},
    "planner": {"name": "The Planner", "icon": "📋", "desc": "Maintains living transformation plans", "default_autonomy": "suggest", "tools": ["create_workstream", "run_scenario"]},
    "narrator": {"name": "The Narrator", "icon": "📖", "desc": "Generates and maintains executive narratives", "default_autonomy": "suggest", "tools": ["generate_narrative"]},
    "quality": {"name": "Quality Controller", "icon": "✅", "desc": "Validates data consistency and logical coherence", "default_autonomy": "observe", "tools": ["read_employees", "calculate_org_metrics"]},
}

# ── Event-Sourced Session Store (in-memory, per project) ──
_sessions: dict = {}  # project_id -> list of events
_memories: dict = {"project": {}, "global": []}  # project_id -> memories, global patterns


def _get_session(project_id: str) -> list:
    if project_id not in _sessions:
        _sessions[project_id] = []
    return _sessions[project_id]


def _append_event(project_id: str, event_type: str, agent: str, data: dict) -> dict:
    event = {
        "id": str(uuid.uuid4())[:8],
        "type": event_type,
        "agent": agent,
        "agent_name": AGENTS.get(agent, {}).get("name", agent),
        "data": data,
        "timestamp": datetime.now().isoformat(),
    }
    _get_session(project_id).append(event)
    # Keep last 500 events per project
    if len(_sessions[project_id]) > 500:
        _sessions[project_id] = _sessions[project_id][-500:]
    return event


# ── Agent State ──
_agent_state: dict = {
    "settings": {aid: {"enabled": True, "autonomy": a["default_autonomy"]} for aid, a in AGENTS.items()},
    "status": {aid: {"state": "idle", "last_action": None, "actions_today": 0, "current_step": None} for aid in AGENTS},
    "runs": {},  # run_id -> run state
    "negotiations": [],
}


# ── Memory System ──
def _add_project_memory(project_id: str, category: str, content: str, confidence: float = 0.8):
    if project_id not in _memories["project"]:
        _memories["project"][project_id] = []
    _memories["project"][project_id].append({
        "id": str(uuid.uuid4())[:8],
        "category": category,
        "content": content,
        "confidence": confidence,
        "created_at": datetime.now().isoformat(),
    })
    # Keep last 100 per project
    _memories["project"][project_id] = _memories["project"][project_id][-100:]


def _add_global_memory(category: str, content: str, source_project: str = ""):
    _memories["global"].append({
        "id": str(uuid.uuid4())[:8],
        "category": category,
        "content": content,
        "source_project": source_project,
        "confidence": 0.7,
        "created_at": datetime.now().isoformat(),
    })
    _memories["global"] = _memories["global"][-200:]


# ── ReAct Reasoning Prompts ──
REASONING_PROMPTS = {
    "watcher": """You are The Watcher — a monitoring agent. Analyze the project state for:
1. Data changes since last analysis
2. Anomalies in workforce metrics (spans, ratios, distributions)
3. Stale data that needs refreshing
4. Inconsistencies between modules

Return JSON: {"observations": [{"type": "change|anomaly|stale|inconsistency", "severity": "info|warning|critical", "title": "short title", "detail": "2 specific sentences with numbers", "affected_module": "module name", "recommended_action": "what to do"}]}""",

    "analyst": """You are The Analyst — a pattern detection agent. Analyze the data for:
1. Statistical outliers in workforce metrics
2. Correlations between different data dimensions
3. Clusters of similar roles/functions
4. Trends that suggest emerging issues

Return JSON: {"insights": [{"type": "pattern|correlation|outlier|trend", "impact": "high|medium|low", "title": "short title", "detail": "2 sentences with specific numbers", "business_implication": "what this means for the transformation", "recommended_action": "what to do next"}]}""",

    "designer": """You are The Designer — a role redesign agent. For the given context:
1. Identify roles most suitable for AI-driven redesign
2. Estimate task redistribution (automate/augment/retain percentages)
3. Calculate capacity freed and potential redeployment
4. Assess skill gaps created by the redesign

Return JSON: {"designs": [{"role": "role title", "current_tasks": N, "automate_pct": N, "augment_pct": N, "retain_pct": N, "capacity_freed_hours": N, "skills_gap": ["skill1", "skill2"], "estimated_savings": "$X", "recommendation": "specific action"}]}""",

    "planner": """You are The Planner — a change management agent. Based on the context:
1. Check if the transformation timeline is realistic
2. Identify workstream activities that need updating
3. Flag dependencies and bottlenecks
4. Recommend phasing and sequencing

Return JSON: {"plan_updates": [{"area": "timeline|workstream|risk|dependency", "current_state": "what exists now", "issue": "what's wrong or needs updating", "recommendation": "specific change", "urgency": "immediate|soon|planned"}]}""",

    "narrator": """You are The Narrator — an executive communication agent. Generate:
1. A 3-sentence executive summary of the current transformation state
2. The single most important metric to highlight
3. The #1 risk and #1 opportunity
4. A recommendation for the next steering committee discussion

Return JSON: {"summary": "3 sentences", "key_metric": {"name": "metric name", "value": "current value", "benchmark": "comparison"}, "top_risk": "1 sentence", "top_opportunity": "1 sentence", "next_discussion": "recommended agenda item"}""",

    "quality": """You are The Quality Controller — a validation agent. Check for:
1. Headcount consistency across all modules
2. Logical conflicts in design decisions
3. Mathematical accuracy of financial models
4. Data staleness and completeness

Return JSON: {"checks": [{"type": "consistency|conflict|accuracy|staleness", "status": "pass|warning|fail", "location": "module or data area", "detail": "specific finding", "fix": "how to resolve if applicable"}]}""",
}


# ═══ API ENDPOINTS ═══

@router.get("/api/agents/registry")
def get_agent_registry():
    return {"agents": {k: {**v, **_agent_state["settings"].get(k, {}), **_agent_state["status"].get(k, {})} for k, v in AGENTS.items()}}


@router.get("/api/agents/status")
def get_agent_status():
    return {
        "agents": {k: {
            "name": AGENTS[k]["name"], "icon": AGENTS[k]["icon"],
            "state": _agent_state["status"][k]["state"],
            "last_action": _agent_state["status"][k]["last_action"],
            "actions_today": _agent_state["status"][k]["actions_today"],
            "current_step": _agent_state["status"][k]["current_step"],
            "enabled": _agent_state["settings"][k]["enabled"],
            "autonomy": _agent_state["settings"][k]["autonomy"],
            "tools": AGENTS[k]["tools"],
        } for k in AGENTS},
        "active_runs": len([r for r in _agent_state["runs"].values() if r.get("status") == "running"]),
        "pending_approvals": len([r for r in _agent_state["runs"].values() if r.get("status") == "awaiting_approval"]),
    }


@router.get("/api/agents/events/{project_id}")
def get_session_events(project_id: str, limit: int = 50, agent: Optional[str] = None):
    events = _get_session(project_id)
    if agent:
        events = [e for e in events if e["agent"] == agent]
    return {"events": events[-limit:], "total": len(events)}


@router.get("/api/agents/history")
def get_agent_history(project_id: str = "", limit: int = 50):
    events = _get_session(project_id) if project_id else []
    # Flatten all sessions if no project specified
    if not project_id:
        for pid, sess in _sessions.items():
            events.extend(sess)
        events.sort(key=lambda e: e["timestamp"], reverse=True)
    return {"history": events[-limit:]}


@router.put("/api/agents/settings")
def update_agent_settings(agent_id: str = Query(...), enabled: Optional[bool] = None, autonomy: Optional[str] = None):
    if agent_id not in AGENTS:
        return {"error": f"Unknown agent: {agent_id}"}
    if enabled is not None:
        _agent_state["settings"][agent_id]["enabled"] = enabled
    if autonomy and autonomy in ("observe", "suggest", "auto"):
        _agent_state["settings"][agent_id]["autonomy"] = autonomy
    return {"ok": True, "settings": _agent_state["settings"][agent_id]}


@router.post("/api/agents/run/{agent_id}")
def run_agent(agent_id: str, model_id: str = Query(""), context: str = Query(""), project_id: str = Query("")):
    if agent_id not in AGENTS:
        return {"error": f"Unknown agent: {agent_id}"}
    if not _agent_state["settings"][agent_id]["enabled"]:
        return {"error": f"Agent {agent_id} is disabled"}

    run_id = str(uuid.uuid4())[:8]
    agent = AGENTS[agent_id]

    # Create run
    _agent_state["runs"][run_id] = {
        "id": run_id, "agent": agent_id, "agent_name": agent["name"],
        "status": "running", "model_id": model_id, "project_id": project_id,
        "started_at": datetime.now().isoformat(), "steps": [],
    }
    _agent_state["status"][agent_id]["state"] = "working"

    # Log to session
    _append_event(project_id or "default", "agent_started", agent_id, {"run_id": run_id, "model_id": model_id})

    # Build reasoning prompt with memory context
    memories = _memories["project"].get(project_id, [])[-5:]
    memory_context = "\n".join([f"- Previous finding: {m['content']}" for m in memories]) if memories else "No previous analysis available."

    prompt = f"""{REASONING_PROMPTS.get(agent_id, "Analyze the data and provide structured insights.")}

PROJECT CONTEXT:
{context[:2000]}

PREVIOUS FINDINGS (from project memory):
{memory_context}

Be specific with numbers. Reference the actual data provided."""

    # Mark as complete (frontend will call Claude with this prompt)
    _agent_state["status"][agent_id]["state"] = "idle"
    _agent_state["status"][agent_id]["last_action"] = f"Analysis run {run_id}"
    _agent_state["status"][agent_id]["actions_today"] += 1
    _agent_state["runs"][run_id]["status"] = "awaiting_response"

    return {
        "ok": True, "run_id": run_id, "agent": agent["name"], "agent_id": agent_id,
        "prompt": prompt, "system_prompt": f"You are {agent['name']}, a specialized AI agent in a workforce transformation platform. {agent['desc']}. Always return valid JSON.",
    }


@router.post("/api/agents/run-all")
def run_all_agents(model_id: str = Query(""), context: str = Query(""), project_id: str = Query("")):
    results = []
    for agent_id in AGENTS:
        if _agent_state["settings"][agent_id]["enabled"]:
            result = run_agent(agent_id, model_id, context, project_id)
            results.append(result)
    return {"ok": True, "results": results}


@router.post("/api/agents/result")
def submit_agent_result(run_id: str = Query(""), agent_id: str = Query(""), result: str = Query(""), project_id: str = Query("")):
    """Submit the result of an agent's Claude call"""
    if run_id in _agent_state["runs"]:
        _agent_state["runs"][run_id]["status"] = "completed"
        _agent_state["runs"][run_id]["result"] = result[:2000]
        _agent_state["runs"][run_id]["completed_at"] = datetime.now().isoformat()

    # Log to session
    _append_event(project_id or "default", "agent_completed", agent_id, {"run_id": run_id, "result_preview": result[:300]})

    # Store in project memory
    if project_id and result:
        _add_project_memory(project_id, f"{agent_id}_finding", result[:500])

    return {"ok": True}


@router.get("/api/agents/runs")
def get_runs(project_id: str = Query(""), status: str = Query("")):
    runs = list(_agent_state["runs"].values())
    if project_id:
        runs = [r for r in runs if r.get("project_id") == project_id]
    if status:
        runs = [r for r in runs if r.get("status") == status]
    return {"runs": sorted(runs, key=lambda r: r.get("started_at", ""), reverse=True)[:20]}


@router.get("/api/agents/run/{run_id}")
def get_run(run_id: str):
    run = _agent_state["runs"].get(run_id)
    if not run:
        return {"error": "Run not found"}
    return {"run": run}


@router.post("/api/agents/approve/{run_id}")
def approve_run(run_id: str, action: str = Query("accept")):
    run = _agent_state["runs"].get(run_id)
    if not run:
        return {"error": "Run not found"}
    run["review_action"] = action
    run["reviewed_at"] = datetime.now().isoformat()
    _append_event(run.get("project_id", "default"), f"agent_{action}ed", run["agent"], {"run_id": run_id})
    return {"ok": True}


# ── Memory Endpoints ──
@router.get("/api/agents/memory/{project_id}")
def get_project_memory(project_id: str):
    return {"memories": _memories["project"].get(project_id, [])[-50:]}


@router.get("/api/agents/memory/global/list")
def get_global_memory():
    return {"memories": _memories["global"][-50:]}


@router.post("/api/agents/memory/{project_id}")
def add_memory(project_id: str, content: str = Query(""), category: str = Query("insight")):
    _add_project_memory(project_id, category, content)
    return {"ok": True}


@router.delete("/api/agents/memory/{project_id}/{memory_id}")
def delete_memory(project_id: str, memory_id: str):
    if project_id in _memories["project"]:
        _memories["project"][project_id] = [m for m in _memories["project"][project_id] if m["id"] != memory_id]
    return {"ok": True}


# ── Negotiation ──
@router.get("/api/agents/negotiations")
def get_negotiations(project_id: str = Query("")):
    negs = _agent_state["negotiations"]
    if project_id:
        negs = [n for n in negs if n.get("project_id") == project_id]
    return {"negotiations": negs[-10:]}


@router.post("/api/agents/negotiate")
def create_negotiation(project_id: str = Query(""), agent_a: str = Query(""), position_a: str = Query(""), agent_b: str = Query(""), position_b: str = Query(""), compromise: str = Query("")):
    neg = {
        "id": str(uuid.uuid4())[:8],
        "project_id": project_id,
        "agent_a": agent_a, "agent_a_name": AGENTS.get(agent_a, {}).get("name", agent_a),
        "position_a": position_a,
        "agent_b": agent_b, "agent_b_name": AGENTS.get(agent_b, {}).get("name", agent_b),
        "position_b": position_b,
        "compromise": compromise,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
    }
    _agent_state["negotiations"].append(neg)
    _append_event(project_id or "default", "negotiation_created", "supervisor", {"negotiation_id": neg["id"]})
    return {"ok": True, "negotiation": neg}


@router.post("/api/agents/negotiate/{neg_id}/resolve")
def resolve_negotiation(neg_id: str, decision: str = Query("compromise")):
    for n in _agent_state["negotiations"]:
        if n["id"] == neg_id:
            n["status"] = "resolved"
            n["decision"] = decision
            n["resolved_at"] = datetime.now().isoformat()
            return {"ok": True}
    return {"error": "Negotiation not found"}
