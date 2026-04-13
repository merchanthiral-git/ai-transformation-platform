"""AI Insight Engine — generates contextual observations for every module.

Uses Claude Haiku when API key is set, falls back to rule-based insights.
Results are cached per project+module+filter combination.
"""

import json
import hashlib
import time
from collections import OrderedDict

from app.ai_providers import claude_available, call_claude_sync
from app.ai.prompts import INSIGHT_SYSTEM, INSIGHT_PROMPT

# ── Cache (LRU, max 200 entries, 5-minute TTL) ──
_cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()
_CACHE_MAX = 200
_CACHE_TTL = 300  # seconds


def _cache_key(project_id: str, module: str, filters: dict, data_hash: str) -> str:
    raw = f"{project_id}:{module}:{json.dumps(filters, sort_keys=True)}:{data_hash}"
    return hashlib.md5(raw.encode()).hexdigest()


def _get_cached(key: str) -> dict | None:
    if key in _cache:
        ts, result = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            _cache.move_to_end(key)
            return result
        del _cache[key]
    return None


def _set_cached(key: str, result: dict):
    _cache[key] = (time.time(), result)
    if len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


def get_insights(
    module: str,
    data_summary: str,
    context: str = "",
    filters: dict | None = None,
    project_id: str = "",
) -> dict:
    """Get AI-powered insights for a module.

    Returns: {observations: [...], actions: [...], confidence: float, source: "ai"|"rules"}
    """
    filters = filters or {}
    data_hash = hashlib.md5(data_summary[:2000].encode()).hexdigest()[:8]
    key = _cache_key(project_id, module, filters, data_hash)

    cached = _get_cached(key)
    if cached:
        return cached

    if claude_available:
        result = _generate_ai_insights(module, data_summary, context, filters)
    else:
        result = _generate_rule_insights(module, data_summary, context, filters)

    _set_cached(key, result)
    return result


def _generate_ai_insights(module: str, data_summary: str, context: str, filters: dict) -> dict:
    """Generate insights using Claude Haiku for speed."""
    prompt = INSIGHT_PROMPT.format(
        module=module,
        context=context or "No additional context",
        filters=json.dumps(filters) if filters else "None",
        data_summary=data_summary[:3000],
    )
    try:
        raw = call_claude_sync(
            prompt,
            system=INSIGHT_SYSTEM,
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            json_mode=True,
        )
        result = json.loads(raw)
        result["source"] = "ai"
        # Validate structure
        if "observations" not in result:
            result["observations"] = []
        if "actions" not in result:
            result["actions"] = []
        if "confidence" not in result:
            result["confidence"] = 0.7
        return result
    except Exception as e:
        print(f"[AI Insights] Claude failed, falling back to rules: {e}")
        return _generate_rule_insights(module, data_summary, "", filters)


def _generate_rule_insights(module: str, data_summary: str, context: str, filters: dict) -> dict:
    """Rule-based insights when no API key is available."""
    observations = []
    actions = []
    summary_lower = data_summary.lower()

    # Universal observations based on data content
    if "headcount" in summary_lower or "employee" in summary_lower:
        observations.append({
            "text": "Review span of control metrics — organizations with more than 6 management layers typically have 15-20% higher overhead costs.",
            "severity": "info",
            "metric": None,
        })

    if module == "snapshot" or module == "overview" or module == "home":
        observations.append({
            "text": "Start with the AI Opportunity Scan to identify which functions have the highest transformation potential before diving into detailed analysis.",
            "severity": "info",
        })
        actions.append({
            "text": "Run the AI Opportunity Scan to identify high-impact functions",
            "module_link": "scan",
        })
        actions.append({
            "text": "Check Org Health Scorecard for structural inefficiencies",
            "module_link": "orghealth",
        })

    elif module == "scan":
        observations.append({
            "text": "Functions with automation potential above 40% typically yield the fastest ROI from transformation initiatives.",
            "severity": "info",
        })
        observations.append({
            "text": "Focus on roles with high task volume and rule-based work patterns — these are the most reliable automation candidates.",
            "severity": "info",
        })
        actions.append({
            "text": "Open the Work Design Lab to decompose high-potential roles",
            "module_link": "design",
        })

    elif module == "design":
        observations.append({
            "text": "Roles spending more than 50% of time on data collection and formatting are prime candidates for AI augmentation — typical savings are 1,000-1,500 hours/year per FTE.",
            "severity": "info",
        })
        observations.append({
            "text": "When redesigning roles, preserve tasks that require judgment, creativity, and relationship management — these are the hardest to automate and highest-value for retention.",
            "severity": "warning",
        })
        actions.append({
            "text": "Run the Impact Simulator to model the effect of your design decisions",
            "module_link": "simulate",
        })

    elif module == "simulate":
        observations.append({
            "text": "Industry benchmarks suggest companies typically achieve 60-70% of projected headcount reductions. Model a range rather than a single point estimate.",
            "severity": "warning",
        })
        observations.append({
            "text": "Reskilling investments typically pay back within 12-18 months when focused on roles with adjacent skill profiles.",
            "severity": "info",
        })
        actions.append({
            "text": "Generate a mobilization roadmap based on your selected scenario",
            "module_link": "plan",
        })

    elif module == "skills" or module == "reskill":
        observations.append({
            "text": "Skills in the 'emerging technology' category have high market scarcity — prioritize build over buy strategies for these capabilities.",
            "severity": "info",
        })
        actions.append({
            "text": "Review the Talent Marketplace for internal mobility opportunities",
            "module_link": "marketplace",
        })

    elif module == "plan" or module == "mobilize":
        observations.append({
            "text": "Change management research shows transformations with dedicated change leads per workstream are 3.5x more likely to succeed.",
            "severity": "info",
        })
        observations.append({
            "text": "Prioritize quick wins in the first 90 days — early visible success builds momentum for the broader transformation.",
            "severity": "info",
        })
        actions.append({
            "text": "Export a complete transformation report for stakeholders",
            "module_link": "export",
        })

    elif module == "orghealth":
        observations.append({
            "text": "Organizations scoring below 50/100 on any health dimension should address structural issues before embarking on AI transformation.",
            "severity": "warning",
        })
        actions.append({
            "text": "Cross-reference with AI Readiness scores to find functions that are both healthy and ready",
            "module_link": "readiness",
        })

    elif module == "heatmap":
        observations.append({
            "text": "High-impact cells in the heatmap represent your transformation priority zones — focus design efforts here first for maximum ROI.",
            "severity": "info",
        })
        actions.append({
            "text": "Select a high-impact role and open the Work Design Lab",
            "module_link": "design",
        })

    else:
        observations.append({
            "text": "Use the AI Co-Pilot (sidebar) for real-time guidance specific to this module.",
            "severity": "info",
        })

    return {
        "observations": observations[:3],
        "actions": actions[:2],
        "confidence": 0.6,
        "source": "rules",
    }
