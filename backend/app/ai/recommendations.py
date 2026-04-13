"""Contextual Recommendation Engine.

Analyzes user progress and suggests next steps. Works with or without AI.
"""

import json
from app.ai_providers import claude_available, call_claude_sync
from app.ai.prompts import RECOMMENDATION_SYSTEM, RECOMMENDATION_PROMPT


def get_recommendations(
    completed_modules: list[str],
    data_status: dict,
    current_module: str = "",
    context: str = "",
) -> dict:
    """Get contextual recommendations based on user progress.

    Args:
        completed_modules: List of module IDs the user has visited
        data_status: {has_workforce: bool, has_work_design: bool, has_skills: bool, ...}
        current_module: Currently active module ID
        context: Additional context string
    """
    if claude_available and context:
        return _ai_recommendations(completed_modules, data_status, current_module, context)
    return _rule_recommendations(completed_modules, data_status, current_module)


def _ai_recommendations(completed_modules, data_status, current_module, context):
    steps = ", ".join(completed_modules) if completed_modules else "None"
    state = f"Current module: {current_module}. Data: {json.dumps(data_status)}. {context}"
    prompt = RECOMMENDATION_PROMPT.format(completed_steps=steps, current_state=state)
    try:
        raw = call_claude_sync(prompt, RECOMMENDATION_SYSTEM, model="claude-haiku-4-5-20251001", max_tokens=512, json_mode=True)
        result = json.loads(raw)
        result["source"] = "ai"
        return result
    except Exception:
        return _rule_recommendations(completed_modules, data_status, current_module)


def _rule_recommendations(completed_modules, data_status, current_module):
    recs = []
    visited = set(completed_modules or [])
    has_data = data_status.get("has_workforce", False)

    # Data upload recommendations
    if not has_data:
        recs.append({
            "title": "Upload workforce data",
            "description": "Import your employee data to unlock all analytics modules. Use Smart Import for automatic column mapping.",
            "action": "info",
            "target": None,
            "priority": "high",
        })
        return {"recommendations": recs, "source": "rules"}

    # Discovery phase
    if "snapshot" not in visited:
        recs.append({
            "title": "Start with Workforce Snapshot",
            "description": "Get an overview of your organization's headcount, structure, and demographics before diving deeper.",
            "action": "navigate",
            "target": "snapshot",
            "priority": "high",
        })

    # Diagnose phase
    if "snapshot" in visited and "scan" not in visited:
        recs.append({
            "title": "Run AI Opportunity Scan",
            "description": "Identify which functions and roles have the highest AI transformation potential.",
            "action": "navigate",
            "target": "scan",
            "priority": "high",
        })

    if "scan" in visited and "orghealth" not in visited:
        recs.append({
            "title": "Assess Org Health",
            "description": "Check organizational health across 6 dimensions to identify structural blockers before transformation.",
            "action": "navigate",
            "target": "orghealth",
            "priority": "medium",
        })

    # Design phase
    if "scan" in visited and "design" not in visited:
        recs.append({
            "title": "Open Work Design Lab",
            "description": "Based on your diagnostic findings, start redesigning high-impact roles. Focus on the top 3 roles from the AI Scan.",
            "action": "navigate",
            "target": "design",
            "priority": "high",
        })

    # Simulate
    if "design" in visited and "simulate" not in visited:
        recs.append({
            "title": "Model the impact",
            "description": "You've made design decisions — now simulate their organizational impact. Your choices have been pre-loaded.",
            "action": "navigate",
            "target": "simulate",
            "priority": "high",
        })

    # Mobilize
    if "simulate" in visited and "plan" not in visited:
        recs.append({
            "title": "Build your roadmap",
            "description": "Generate a mobilization plan with workstreams, milestones, and change management activities.",
            "action": "navigate",
            "target": "plan",
            "priority": "high",
        })

    # Export
    if len(visited) >= 5 and "export" not in visited:
        recs.append({
            "title": "Generate executive deliverables",
            "description": f"You've completed {len(visited)} modules. Export a comprehensive transformation report for stakeholders.",
            "action": "navigate",
            "target": "export",
            "priority": "medium",
        })

    # Missing data recommendations
    if has_data and not data_status.get("has_work_design", False):
        recs.append({
            "title": "Upload task-level data",
            "description": "Add work design data (tasks per role) to unlock deeper analysis in the Work Design Lab and AI scoring.",
            "action": "info",
            "target": None,
            "priority": "medium",
        })

    if not recs:
        recs.append({
            "title": "Explore deeper analysis",
            "description": "Try Role Clustering, Skills Network, or the Talent Marketplace for advanced insights.",
            "action": "navigate",
            "target": "clusters",
            "priority": "low",
        })

    return {"recommendations": recs[:3], "source": "rules"}
