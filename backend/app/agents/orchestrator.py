"""Orchestrator — master controller that coordinates agent chains.

Accepts a user intent + project context and decides:
- Which agents to run and in what order
- What output from agent N to pass as context to agent N+1
- Whether to ask the user a clarifying question before proceeding
"""

import json
import traceback

from app.ai_providers import call_claude_sync, claude_available, NO_KEY_MSG
from .memory import get_recent_memories, get_project_memory, get_trajectory
from .benchmark import get_benchmarks
from .agents import (
    run_diagnosis, run_design, run_skills_gap,
    run_scenario, run_readiness,
)

ORCHESTRATOR_SYSTEM = """You are an AI orchestration engine for a workforce transformation platform. Given a user's intent and project context, decide which specialist agents to run and in what order.

Available agents: diagnosis, design, skills_gap, scenario, readiness

Rules:
- "full_analysis": run diagnosis → design → skills_gap → scenario (in chain, each feeds the next)
- "quick_read": run diagnosis only with compressed output
- "what_changed": compare current data to last memory, return delta
- "what_should_i_do_next": look at all memories, return prioritized actions

Respond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."""


def orchestrate(project_id: str, intent: str, session_data: dict) -> dict:
    """Main orchestration entry point.

    Returns: {
        agents_run: [str],
        findings: { agent_name: findings_dict },
        clarifying_question: str | None,
        trajectory: str,
        chain_log: [{ agent, status, duration_ms }]
    }
    """
    if not claude_available:
        return {"error": True, "message": NO_KEY_MSG}

    if not project_id:
        return {"error": True, "message": "project_id is required"}

    trajectory = get_trajectory(project_id)
    benchmarks = get_benchmarks(project_id)
    recent = get_recent_memories(project_id, 3)

    # For deterministic intents, skip the Claude planning call
    if intent == "full_analysis":
        return _run_full_analysis(project_id, session_data, trajectory)
    elif intent == "quick_read":
        return _run_quick_read(project_id, session_data, trajectory)
    elif intent == "what_changed":
        return _run_what_changed(project_id, session_data, trajectory)
    elif intent == "what_should_i_do_next":
        return _run_next_actions(project_id, session_data, trajectory)
    else:
        # Unknown intent — ask Claude to decide
        return _run_claude_planned(project_id, intent, session_data, trajectory, benchmarks, recent)


def _run_full_analysis(project_id: str, session_data: dict, trajectory: str) -> dict:
    """Chain: Diagnosis → Design → SkillsGap → Scenario."""
    findings = {}
    chain_log = []
    clarifying_question = None

    import time

    # 1. Diagnosis
    t0 = time.time()
    diag = run_diagnosis(project_id, session_data)
    chain_log.append({"agent": "diagnosis", "status": "error" if diag.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": diag.get("from_memory", False)})
    findings["diagnosis"] = diag

    if diag.get("clarifying_question"):
        clarifying_question = diag["clarifying_question"]

    # 2. Design — pass diagnosis findings as context
    t0 = time.time()
    design_input = {**session_data, "diagnosis_findings": diag}
    if not design_input.get("role_name") and session_data.get("jobs"):
        design_input["role_name"] = session_data["jobs"][0] if isinstance(session_data["jobs"][0], str) else session_data["jobs"][0].get("title", "")
    design = run_design(project_id, design_input)
    chain_log.append({"agent": "design", "status": "error" if design.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": design.get("from_memory", False)})
    findings["design"] = design

    # 3. SkillsGap — pass design findings
    t0 = time.time()
    skills_input = {**session_data, "design_findings": design}
    skills = run_skills_gap(project_id, skills_input)
    chain_log.append({"agent": "skills_gap", "status": "error" if skills.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": skills.get("from_memory", False)})
    findings["skills_gap"] = skills

    # 4. Scenario — pass diagnosis + design
    t0 = time.time()
    scenario_input = {**session_data, "diagnosis_findings": diag, "design_findings": design}
    scenario = run_scenario(project_id, scenario_input)
    chain_log.append({"agent": "scenario", "status": "error" if scenario.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": scenario.get("from_memory", False)})
    findings["scenario"] = scenario

    return {
        "agents_run": ["diagnosis", "design", "skills_gap", "scenario"],
        "findings": findings,
        "clarifying_question": clarifying_question,
        "trajectory": trajectory,
        "chain_log": chain_log,
    }


def _run_quick_read(project_id: str, session_data: dict, trajectory: str) -> dict:
    """Quick read — diagnosis only."""
    import time
    t0 = time.time()
    diag = run_diagnosis(project_id, session_data)
    return {
        "agents_run": ["diagnosis"],
        "findings": {"diagnosis": diag},
        "clarifying_question": diag.get("clarifying_question"),
        "trajectory": trajectory,
        "chain_log": [{"agent": "diagnosis", "status": "error" if diag.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": diag.get("from_memory", False)}],
    }


def _run_what_changed(project_id: str, session_data: dict, trajectory: str) -> dict:
    """Compare current data to last memory and produce delta narrative."""
    memory = get_project_memory(project_id)
    snapshots = memory.get("snapshots", [])
    if not snapshots:
        return {
            "agents_run": [],
            "findings": {"delta": {"narrative": "No previous analysis found. Run a Full Analysis first to establish a baseline.", "changes": []}},
            "clarifying_question": None,
            "trajectory": trajectory,
            "chain_log": [],
        }

    # Build summary of what changed
    changes = []
    for agent_name in ["diagnosis", "design", "skills_gap", "scenario", "readiness"]:
        agent_snaps = [s for s in snapshots if s["agent"] == agent_name]
        if len(agent_snaps) >= 2:
            prev_conf = agent_snaps[-2]["confidence"]
            curr_conf = agent_snaps[-1]["confidence"]
            delta = curr_conf - prev_conf
            direction = "improved" if delta > 0.05 else "declined" if delta < -0.05 else "stable"
            changes.append({
                "agent": agent_name,
                "previous_confidence": prev_conf,
                "current_confidence": curr_conf,
                "direction": direction,
                "last_run": agent_snaps[-1]["timestamp"],
            })

    narrative = f"Project trajectory: {trajectory}. " + (
        f"{len(changes)} agents have prior runs. " +
        ", ".join(f"{c['agent']} is {c['direction']}" for c in changes) + "."
        if changes else "Only one analysis exists — run again after data changes to see deltas."
    )

    return {
        "agents_run": [],
        "findings": {"delta": {"narrative": narrative, "changes": changes}},
        "clarifying_question": None,
        "trajectory": trajectory,
        "chain_log": [],
    }


def _run_next_actions(project_id: str, session_data: dict, trajectory: str) -> dict:
    """Look at all agent memories and return prioritized action list."""
    memory = get_project_memory(project_id)
    snapshots = memory.get("snapshots", [])

    if not snapshots:
        return {
            "agents_run": [],
            "findings": {"actions": {
                "narrative": "No analyses have been run yet. Start with a Full Analysis to get actionable recommendations.",
                "priority_actions": [
                    {"action": "Run Full Analysis", "priority": 1, "rationale": "Establish baseline diagnosis, design, and skills assessment."},
                    {"action": "Upload workforce data", "priority": 2, "rationale": "Agents need employee, task, and skills data to provide specific recommendations."},
                ],
            }},
            "clarifying_question": None,
            "trajectory": trajectory,
            "chain_log": [],
        }

    # Collect open questions and key actions from all agents
    open_qs = []
    actions = []
    for snap in snapshots[-10:]:
        for q in snap.get("open_questions", []):
            if q:
                open_qs.append({"agent": snap["agent"], "question": q})

        findings = snap.get("findings", {})
        # Collect actions from various agent output formats
        for step in findings.get("recommended_next_steps", []):
            actions.append({**step, "source_agent": snap["agent"]})
        for item in findings.get("action_plan", []):
            actions.append({"action": item.get("action", ""), "priority": item.get("priority", 5), "source_agent": snap["agent"]})
        for opp in findings.get("opportunity_areas", []):
            if opp.get("quick_win"):
                actions.append({"action": f"Quick win: {opp['area']}", "priority": 2, "rationale": opp.get("rationale", ""), "source_agent": snap["agent"]})

    # Sort by priority
    actions.sort(key=lambda a: a.get("priority", 5))

    return {
        "agents_run": [],
        "findings": {"actions": {
            "narrative": f"Based on {len(snapshots)} agent runs, trajectory is '{trajectory}'. {len(open_qs)} open questions remain.",
            "priority_actions": actions[:10],
            "open_questions": open_qs[:5],
        }},
        "clarifying_question": open_qs[0]["question"] if open_qs else None,
        "trajectory": trajectory,
        "chain_log": [],
    }


def _run_claude_planned(project_id: str, intent: str, session_data: dict,
                        trajectory: str, benchmarks: dict, recent: list) -> dict:
    """Let Claude decide which agents to run for an unknown intent."""
    recent_str = "\n".join(f"- {r['agent']}: confidence {r['confidence']}" for r in recent) if recent else "None"

    prompt = f"""User intent: "{intent}"

Project context:
- Jobs: {len(session_data.get('jobs', []))}
- Tasks: {len(session_data.get('tasks', []))}
- Headcount: {session_data.get('headcount', 'unknown')}
- Trajectory: {trajectory}

Recent agent activity:
{recent_str}

Benchmarks:
{json.dumps(benchmarks, default=str)[:500]}

Decide which agents to run. Return JSON:
{{
  "agents_to_run": ["diagnosis", "design", "skills_gap", "scenario", "readiness"],
  "clarifying_question": null,
  "reasoning": "why these agents in this order"
}}"""

    try:
        result = json.loads(call_claude_sync(prompt, system=ORCHESTRATOR_SYSTEM, max_tokens=500, json_mode=True))
        agents_to_run = result.get("agents_to_run", ["diagnosis"])

        if result.get("clarifying_question"):
            return {
                "agents_run": [],
                "findings": {},
                "clarifying_question": result["clarifying_question"],
                "trajectory": trajectory,
                "chain_log": [],
            }

        # Execute the planned agents in sequence
        agent_map = {
            "diagnosis": run_diagnosis,
            "design": run_design,
            "skills_gap": run_skills_gap,
            "scenario": run_scenario,
            "readiness": run_readiness,
        }

        import time
        findings = {}
        chain_log = []
        for agent_name in agents_to_run:
            if agent_name in agent_map:
                t0 = time.time()
                agent_input = {**session_data}
                # Chain context from prior agents
                if agent_name == "design" and "diagnosis" in findings:
                    agent_input["diagnosis_findings"] = findings["diagnosis"]
                if agent_name == "skills_gap" and "design" in findings:
                    agent_input["design_findings"] = findings["design"]
                if agent_name == "scenario":
                    agent_input["diagnosis_findings"] = findings.get("diagnosis", {})
                    agent_input["design_findings"] = findings.get("design", {})

                result = agent_map[agent_name](project_id, agent_input)
                findings[agent_name] = result
                chain_log.append({"agent": agent_name, "status": "error" if result.get("error") else "complete", "duration_ms": int((time.time() - t0) * 1000), "from_memory": result.get("from_memory", False)})

        return {
            "agents_run": agents_to_run,
            "findings": findings,
            "clarifying_question": None,
            "trajectory": trajectory,
            "chain_log": chain_log,
        }
    except Exception as e:
        return {"error": True, "message": f"Orchestrator planning failed: {e}", "trajectory": trajectory}
