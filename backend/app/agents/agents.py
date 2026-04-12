"""6 Specialist Agents — each chains from prior agent outputs, uses memory, and reasons transparently.

Every agent:
  1. Loads its last memory snapshot
  2. Checks if input data changed (fingerprint)
  3. If unchanged + memory exists → returns cached with "from_memory" flag
  4. If changed or no memory → calls Claude with rich context
  5. Saves new snapshot
  6. Returns structured response
"""

import json
import traceback
from datetime import datetime

from app.ai_providers import call_claude_sync, claude_available, NO_KEY_MSG
from .memory import (
    get_last_snapshot, save_snapshot, has_data_changed,
    get_recent_memories, compute_data_fingerprint,
)
from .benchmark import get_benchmarks


def _call_agent_claude(system: str, prompt: str, max_tokens: int = 2000) -> dict:
    """Call Claude and parse JSON response. Returns parsed dict or error dict."""
    if not claude_available:
        return {"error": True, "message": NO_KEY_MSG}
    try:
        raw = call_claude_sync(prompt, system=system, max_tokens=max_tokens, json_mode=True)
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        try:
            start = raw.index("{")
            end = raw.rindex("}") + 1
            return json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"error": True, "message": "Failed to parse agent response as JSON", "raw": raw[:500]}
    except Exception as e:
        return {"error": True, "message": str(e)}


def _check_cache(project_id: str, agent_name: str, input_data: dict) -> dict | None:
    """Return cached snapshot if data hasn't changed, else None."""
    if not has_data_changed(project_id, agent_name, input_data):
        last = get_last_snapshot(project_id, agent_name)
        if last and last.get("findings"):
            return {
                **last["findings"],
                "from_memory": True,
                "cached_at": last["timestamp"],
                "confidence": last["confidence"],
            }
    return None


def _memory_context(project_id: str, agent_name: str) -> str:
    """Build context string from prior agent memories."""
    last = get_last_snapshot(project_id, agent_name)
    if not last:
        return "No prior analysis exists for this project."
    return (
        f"Previous {agent_name} analysis ({last['timestamp'][:10]}, "
        f"confidence {last['confidence']}):\n"
        f"{json.dumps(last['findings'], indent=2, default=str)[:1500]}"
    )


def _benchmark_context(project_id: str) -> str:
    """Build benchmark context string."""
    bm = get_benchmarks(project_id)
    parts = []
    for metric, info in bm.items():
        if info["value"] is not None:
            parts.append(f"- {metric}: {info['value']} ({info['label']}, {info['percentile']}th percentile, n={info['sample_size']})")
    return "\n".join(parts) if parts else "No benchmark data available yet (first project)."


# ═══════════════════════════════════════════════════════════════
#  AGENT 1: DiagnosisAgent
# ═══════════════════════════════════════════════════════════════

DIAGNOSIS_SYSTEM = """You are an expert AI transformation consultant performing an organizational diagnosis. You have deep expertise in identifying where AI creates the most value in workforce transformation. Be specific, quantitative where possible, and direct.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""

def run_diagnosis(project_id: str, session_data: dict) -> dict:
    """Run organizational diagnosis analysis."""
    input_data = {
        "jobs": session_data.get("jobs", []),
        "tasks": session_data.get("tasks", []),
        "headcount": session_data.get("headcount", 0),
        "skills": session_data.get("skills", []),
        "functions": session_data.get("functions", []),
    }

    cached = _check_cache(project_id, "diagnosis", input_data)
    if cached:
        return cached

    benchmarks = _benchmark_context(project_id)
    memory = _memory_context(project_id, "diagnosis")
    recent = get_recent_memories(project_id, 3)
    recent_str = "\n".join(f"- {r['agent']} ({r['timestamp'][:10]}): confidence {r['confidence']}" for r in recent) if recent else "None"

    jobs_summary = session_data.get("jobs", [])[:20]
    tasks_summary = session_data.get("tasks", [])[:15]
    functions = session_data.get("functions", [])

    prompt = f"""Analyze this organization for AI transformation opportunities.

ORG SUMMARY:
- {len(session_data.get('jobs', []))} unique jobs
- {len(session_data.get('tasks', []))} tasks mapped
- {session_data.get('headcount', 'unknown')} FTE
- {len(session_data.get('skills', []))} skills identified
- Functions: {', '.join(functions[:10]) if functions else 'unknown'}

TOP JOBS: {json.dumps(jobs_summary, default=str)[:800]}

TOP TASKS (by volume): {json.dumps(tasks_summary, default=str)[:800]}

PREVIOUS DIAGNOSIS: {memory}

BENCHMARK CONTEXT:
{benchmarks}

RECENT AGENT ACTIVITY:
{recent_str}

Return this exact JSON structure:
{{
  "opportunity_areas": [{{ "area": "string", "impact_score": 0-10, "rationale": "string", "affected_roles": ["role1"], "quick_win": true/false }}],
  "risks": [{{ "risk": "string", "severity": "high|medium|low", "mitigation": "string" }}],
  "data_gaps": [{{ "field": "string", "why_it_matters": "string" }}],
  "clarifying_question": null,
  "executive_summary": "2-3 sentences",
  "confidence": 0.0-1.0,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}}

If the data is ambiguous or key information is missing, set clarifying_question to a specific question string instead of null."""

    result = _call_agent_claude(DIAGNOSIS_SYSTEM, prompt)
    if not result.get("error"):
        save_snapshot(project_id, "diagnosis", result,
                      result.get("confidence", 0.5), input_data,
                      [result["clarifying_question"]] if result.get("clarifying_question") else [])
    result["from_memory"] = False
    return result


# ═══════════════════════════════════════════════════════════════
#  AGENT 2: DesignAgent
# ═══════════════════════════════════════════════════════════════

DESIGN_SYSTEM = """You are an expert role design consultant specializing in AI-augmented workforce transformation. You deconstruct roles into tasks and classify each task for automation, augmentation, or human retention. Be precise about technology suggestions and skill requirements.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""

def run_design(project_id: str, session_data: dict) -> dict:
    """Run role design/reconstruction analysis."""
    role_name = session_data.get("role_name", "")
    tasks = session_data.get("tasks", [])
    diagnosis_findings = session_data.get("diagnosis_findings", {})

    input_data = {"role_name": role_name, "tasks": tasks}

    cached = _check_cache(project_id, "design", input_data)
    if cached:
        return cached

    memory = _memory_context(project_id, "design")

    prompt = f"""Redesign this role for an AI-transformed organization.

ROLE: {role_name}
TASKS: {json.dumps(tasks[:20], default=str)[:1200]}

DIAGNOSIS CONTEXT (from prior agent):
{json.dumps(diagnosis_findings, default=str)[:1000]}

PREVIOUS DESIGN WORK: {memory[:800]}

Return this exact JSON structure:
{{
  "role_reconstruction": {{
    "automate": [{{ "task": "string", "rationale": "string", "technology_suggestion": "string" }}],
    "augment": [{{ "task": "string", "how_ai_helps": "string", "human_judgment_required": "string" }}],
    "keep_human": [{{ "task": "string", "rationale": "string" }}],
    "new_tasks": [{{ "task": "string", "why_emerging": "string", "skill_required": "string" }}]
  }},
  "evolved_role_profile": {{ "title": "string", "summary": "string", "key_skills": ["skill1"], "ai_fluency_required": "low|medium|high" }},
  "fte_impact": {{ "current": 1.0, "projected": 0.8, "change_rationale": "string" }},
  "clarifying_question": null,
  "confidence": 0.0-1.0,
  "reasoning_chain": ["step 1", "step 2"]
}}"""

    result = _call_agent_claude(DESIGN_SYSTEM, prompt)
    if not result.get("error"):
        save_snapshot(project_id, "design", result,
                      result.get("confidence", 0.5), input_data,
                      [result["clarifying_question"]] if result.get("clarifying_question") else [])
    result["from_memory"] = False
    return result


# ═══════════════════════════════════════════════════════════════
#  AGENT 3: SkillsGapAgent
# ═══════════════════════════════════════════════════════════════

SKILLS_SYSTEM = """You are an expert talent and skills strategist. You identify skills gaps between current workforce capabilities and AI-transformed future states. You recommend build/buy/borrow strategies with market context.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""

def run_skills_gap(project_id: str, session_data: dict) -> dict:
    """Run skills gap analysis, chaining from DesignAgent output."""
    current_skills = session_data.get("current_skills", [])
    design_findings = session_data.get("design_findings", {})

    input_data = {"current_skills": current_skills}

    cached = _check_cache(project_id, "skills_gap", input_data)
    if cached:
        return cached

    memory = _memory_context(project_id, "skills_gap")

    # Extract evolved role profiles from design findings
    evolved = design_findings.get("evolved_role_profile", {})

    prompt = f"""Analyze skills gaps for an AI transformation.

CURRENT SKILLS: {json.dumps(current_skills[:30], default=str)[:800]}

DESIGN CONTEXT (evolved roles from prior agent):
{json.dumps(evolved, default=str)[:800]}

FULL DESIGN FINDINGS:
{json.dumps(design_findings, default=str)[:600]}

PREVIOUS SKILLS ANALYSIS: {memory[:600]}

Return this exact JSON structure:
{{
  "gaps": [{{ "skill": "string", "severity": "critical|high|medium", "affected_roles": ["role1"], "build_buy_borrow": "build|buy|borrow|automate" }}],
  "reskilling_paths": [{{ "from_skill": "string", "to_skill": "string", "estimated_months": 3, "recommended_approach": "string" }}],
  "priority_ranking": ["skill1", "skill2"],
  "talent_market_note": "brief note on market availability",
  "clarifying_question": null,
  "confidence": 0.0-1.0,
  "reasoning_chain": ["step 1", "step 2"]
}}"""

    result = _call_agent_claude(SKILLS_SYSTEM, prompt)
    if not result.get("error"):
        save_snapshot(project_id, "skills_gap", result,
                      result.get("confidence", 0.5), input_data,
                      [result["clarifying_question"]] if result.get("clarifying_question") else [])
    result["from_memory"] = False
    return result


# ═══════════════════════════════════════════════════════════════
#  AGENT 4: ScenarioAgent
# ═══════════════════════════════════════════════════════════════

SCENARIO_SYSTEM = """You are a strategic transformation planner. You model scenarios for organizational change, quantify FTE impact waterfalls, identify risks and dependencies, and recommend concrete next steps with owners and timelines.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""

def run_scenario(project_id: str, session_data: dict) -> dict:
    """Run scenario modeling, chaining from all prior agents."""
    scenario_params = session_data.get("scenario_params", {})
    diagnosis_findings = session_data.get("diagnosis_findings", {})
    design_findings = session_data.get("design_findings", {})

    input_data = {"scenario_params": scenario_params}

    cached = _check_cache(project_id, "scenario", input_data)
    if cached:
        return cached

    memory = _memory_context(project_id, "scenario")

    prompt = f"""Model a transformation scenario for this organization.

SCENARIO PARAMETERS: {json.dumps(scenario_params, default=str)[:600]}

DIAGNOSIS CONTEXT: {json.dumps(diagnosis_findings, default=str)[:800]}

DESIGN CONTEXT: {json.dumps(design_findings, default=str)[:800]}

PREVIOUS SCENARIO: {memory[:600]}

Return this exact JSON structure:
{{
  "narrative": "3-4 paragraph scenario interpretation",
  "fte_waterfall": [{{ "stage": "string", "fte_change": -10, "driver": "string" }}],
  "risks": [{{ "risk": "string", "likelihood": "high|medium|low", "impact": "high|medium|low", "mitigation": "string" }}],
  "dependencies": [{{ "dependency": "string", "owner": "string", "critical_path": true/false }}],
  "recommended_next_steps": [{{ "action": "string", "timeline": "string", "owner_role": "string" }}],
  "confidence": 0.0-1.0,
  "reasoning_chain": ["step 1", "step 2"]
}}"""

    result = _call_agent_claude(SCENARIO_SYSTEM, prompt)
    if not result.get("error"):
        save_snapshot(project_id, "scenario", result,
                      result.get("confidence", 0.5), input_data)
    result["from_memory"] = False
    return result


# ═══════════════════════════════════════════════════════════════
#  AGENT 5: ReadinessAgent
# ═══════════════════════════════════════════════════════════════

READINESS_SYSTEM = """You are an organizational readiness assessor specializing in AI transformation maturity. You evaluate readiness across 5 dimensions (data, talent, governance, culture, technology), identify blockers, and build action plans.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""

def run_readiness(project_id: str, session_data: dict) -> dict:
    """Run readiness assessment."""
    readiness_scores = session_data.get("readiness_scores", {})

    input_data = {"readiness_scores": readiness_scores}

    cached = _check_cache(project_id, "readiness", input_data)
    if cached:
        return cached

    memory = _memory_context(project_id, "readiness")

    prompt = f"""Assess organizational readiness for AI transformation.

READINESS SCORES (0-100 per dimension):
- Data: {readiness_scores.get('data', 'not assessed')}
- Talent: {readiness_scores.get('talent', 'not assessed')}
- Governance: {readiness_scores.get('governance', 'not assessed')}
- Culture: {readiness_scores.get('culture', 'not assessed')}
- Technology: {readiness_scores.get('technology', 'not assessed')}

PREVIOUS READINESS ASSESSMENT: {memory[:800]}

Return this exact JSON structure:
{{
  "overall_score": 0-100,
  "maturity_level": "initial|developing|defined|advanced|optimizing",
  "dimension_narratives": {{ "data": "string", "talent": "string", "governance": "string", "culture": "string", "technology": "string" }},
  "blockers": [{{ "blocker": "string", "dimension": "string", "severity": "high|medium|low", "unlock_action": "string" }}],
  "action_plan": [{{ "action": "string", "dimension": "string", "priority": 1-10, "timeline_weeks": 4, "expected_impact": "string" }}],
  "trajectory_note": "How readiness has changed vs last assessment",
  "confidence": 0.0-1.0,
  "reasoning_chain": ["step 1", "step 2"]
}}"""

    result = _call_agent_claude(READINESS_SYSTEM, prompt)
    if not result.get("error"):
        save_snapshot(project_id, "readiness", result,
                      result.get("confidence", 0.5), input_data,
                      [result.get("clarifying_question")] if result.get("clarifying_question") else [])
    result["from_memory"] = False
    return result


# ═══════════════════════════════════════════════════════════════
#  AGENT 6: EspressoAgent (upgraded AI chat)
# ═══════════════════════════════════════════════════════════════

ESPRESSO_SYSTEM_TEMPLATE = """You are an expert AI transformation advisor embedded in a consulting platform. You have full context of this organization's diagnosis, design decisions, skills gaps, scenarios, and readiness. Answer questions specifically — reference actual data from this project, not generic advice. Be direct and consultant-grade.

Current module: {module}

Project context from agent memory:
{agent_context}"""

def run_espresso(project_id: str, session_data: dict) -> dict:
    """Context-aware chat agent. Returns plain text response."""
    message = session_data.get("message", "")
    current_module = session_data.get("current_module", "overview")
    conversation_history = session_data.get("conversation_history", [])

    if not message.strip():
        return {"response": "What would you like to know?", "from_memory": False}

    if not claude_available:
        return {"error": True, "message": NO_KEY_MSG}

    # Build context from all agent memories
    agent_context_parts = []
    for agent_name in ["diagnosis", "design", "skills_gap", "scenario", "readiness"]:
        snap = get_last_snapshot(project_id, agent_name)
        if snap:
            summary = json.dumps(snap["findings"], default=str)[:400]
            agent_context_parts.append(f"{agent_name} (confidence {snap['confidence']}):\n{summary}")

    agent_context = "\n\n".join(agent_context_parts) if agent_context_parts else "No agent analyses have been run yet for this project."

    system = ESPRESSO_SYSTEM_TEMPLATE.format(
        module=current_module,
        agent_context=agent_context,
    )

    # Build conversation as multi-turn
    messages_text = ""
    for msg in conversation_history[-6:]:
        role = msg.get("role", "user")
        messages_text += f"\n{role.upper()}: {msg.get('content', '')}"
    messages_text += f"\nUSER: {message}"

    try:
        response = call_claude_sync(
            messages_text.strip(),
            system=system,
            max_tokens=1000,
        )
        return {"response": response, "from_memory": False}
    except Exception as e:
        # Try to return cached context
        last = get_last_snapshot(project_id, "diagnosis")
        fallback = f"I'm unable to reach Claude right now. Based on the last diagnosis, here's what I know: {json.dumps(last['findings'].get('executive_summary', ''), default=str)}" if last else "Analysis unavailable — Claude API is not responding."
        return {"error": True, "message": str(e), "response": fallback, "fallback": "cached"}
