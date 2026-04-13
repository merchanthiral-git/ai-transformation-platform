"""Natural Language Query Parser — enhanced version.

Parses user questions and routes to the appropriate module/data.
Works with keyword matching (no API key) or Claude (with key).
"""

import json
import re
from app.ai_providers import claude_available, call_claude_sync
from app.ai.prompts import QUERY_SYSTEM, QUERY_PROMPT


# Keyword → module routing
_KEYWORD_ROUTES = {
    "headcount": ("snapshot", "Workforce Snapshot"),
    "employee": ("snapshot", "Workforce Snapshot"),
    "demographics": ("snapshot", "Workforce Snapshot"),
    "turnover": ("snapshot", "Workforce Snapshot"),
    "attrition": ("snapshot", "Workforce Snapshot"),
    "span of control": ("snapshot", "Workforce Snapshot"),
    "automation": ("scan", "AI Opportunity Scan"),
    "ai potential": ("scan", "AI Opportunity Scan"),
    "opportunity": ("scan", "AI Opportunity Scan"),
    "automate": ("scan", "AI Opportunity Scan"),
    "org health": ("orghealth", "Org Health Scorecard"),
    "health score": ("orghealth", "Org Health Scorecard"),
    "heatmap": ("heatmap", "AI Impact Heatmap"),
    "impact": ("heatmap", "AI Impact Heatmap"),
    "readiness": ("readiness", "AI Readiness"),
    "change ready": ("changeready", "Change Readiness"),
    "manager": ("mgrcap", "Manager Capability"),
    "task": ("design", "Work Design Lab"),
    "redesign": ("design", "Work Design Lab"),
    "deconstruction": ("design", "Work Design Lab"),
    "reconstruct": ("design", "Work Design Lab"),
    "skill": ("skills", "Skills & Talent"),
    "reskill": ("reskill", "Reskilling Pathways"),
    "talent": ("marketplace", "Talent Marketplace"),
    "scenario": ("simulate", "Impact Simulator"),
    "simulate": ("simulate", "Impact Simulator"),
    "roi": ("simulate", "Impact Simulator"),
    "roadmap": ("plan", "Change Planner"),
    "workstream": ("plan", "Change Planner"),
    "milestone": ("plan", "Change Planner"),
    "export": ("export", "Export"),
    "report": ("export", "Export"),
    "benchmark": ("snapshot", "Workforce Snapshot"),
    "job architecture": ("jobarch", "Job Architecture"),
    "job family": ("jobarch", "Job Architecture"),
    "cluster": ("clusters", "Role Clustering"),
    "operating model": ("opmodel", "Operating Model"),
    "org design": ("build", "Org Design Studio"),
}


def parse_query(question: str, data_summary: str = "", context: str = "") -> dict:
    """Parse a natural language question and return structured response.

    Returns: {
        answer: str,
        navigate_to: str | None,
        module_label: str | None,
        filters: dict,
        confidence: float,
        source: "ai" | "keywords"
    }
    """
    if claude_available and data_summary:
        return _ai_parse(question, data_summary, context)
    return _keyword_parse(question)


def _ai_parse(question: str, data_summary: str, context: str) -> dict:
    prompt = QUERY_PROMPT.format(
        question=question,
        data_summary=data_summary[:3000],
    )
    try:
        raw = call_claude_sync(prompt, QUERY_SYSTEM, model="claude-haiku-4-5-20251001", max_tokens=512, json_mode=True)
        result = json.loads(raw)
        result["source"] = "ai"
        result["module_label"] = _module_label(result.get("navigate_to"))
        return result
    except Exception:
        return _keyword_parse(question)


def _keyword_parse(question: str) -> dict:
    q = question.lower()

    # Find the best matching module
    best_route = None
    best_label = None
    for keyword, (route, label) in _KEYWORD_ROUTES.items():
        if keyword in q:
            best_route = route
            best_label = label
            break

    # Extract filter hints
    filters = {}
    func_match = re.search(r"\b(engineering|technology|hr|finance|sales|marketing|operations|legal|it)\b", q, re.I)
    if func_match:
        filters["func"] = func_match.group(1).title()

    if best_route:
        answer = f"I'd recommend checking the {best_label} module for this analysis."
        if filters:
            answer += f" I'll apply a filter for {filters.get('func', '')}."
    else:
        answer = "Try rephrasing your question, or use the AI Co-Pilot for detailed analysis."

    return {
        "answer": answer,
        "navigate_to": best_route,
        "module_label": best_label,
        "filters": filters,
        "confidence": 0.5 if best_route else 0.2,
        "source": "keywords",
    }


def _module_label(module_id: str | None) -> str | None:
    labels = {
        "snapshot": "Workforce Snapshot", "scan": "AI Opportunity Scan",
        "orghealth": "Org Health Scorecard", "heatmap": "AI Impact Heatmap",
        "design": "Work Design Lab", "simulate": "Impact Simulator",
        "plan": "Change Planner", "skills": "Skills & Talent",
        "reskill": "Reskilling Pathways", "marketplace": "Talent Marketplace",
        "export": "Export", "readiness": "AI Readiness",
        "clusters": "Role Clustering", "build": "Org Design Studio",
        "opmodel": "Operating Model", "jobarch": "Job Architecture",
    }
    return labels.get(module_id) if module_id else None
