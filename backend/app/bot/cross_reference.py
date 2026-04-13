"""Cross-reference findings across actions to surface non-obvious patterns.

Groups findings by function, checks for correlations, and generates
dot-connecting observations that a senior consultant would notice.
"""

from __future__ import annotations

import json
from collections import defaultdict

from app.bot.ai_narrator import ai_available


# ── Rule-based cross-reference patterns ──

_PATTERNS = [
    {
        "conditions": lambda findings: (
            any("concentration" in f["detail"].lower() for f in findings) and
            any("champion" in f["detail"].lower() for f in findings)
        ),
        "generate": lambda findings: _concentration_champion_pattern(findings),
    },
    {
        "conditions": lambda findings: (
            any("narrow span" in f["detail"].lower() or "over-manage" in f["detail"].lower() for f in findings) and
            any("skill" in f["detail"].lower() for f in findings)
        ),
        "generate": lambda _: "The over-management pattern may correlate with skills gaps — managers in narrow-span roles sometimes manage instead of doing because they lack the technical skills to contribute directly. Consider whether some of these roles should be converted to senior IC positions.",
    },
    {
        "conditions": lambda findings: (
            any("quick win" in f["detail"].lower() for f in findings) and
            any("champion" in f["detail"].lower() or "pilot" in f["detail"].lower() for f in findings)
        ),
        "generate": lambda _: "There's a natural alignment here: your Quick Win automation opportunities should be piloted in functions with the highest Champion percentages. Champions will adopt faster, validate ROI sooner, and become advocates for the broader transformation.",
    },
    {
        "conditions": lambda findings: (
            any("readiness gap" in f["detail"].lower() for f in findings) and
            any("scenario" in f["detail"].lower() or "roadmap" in f["detail"].lower() for f in findings)
        ),
        "generate": lambda _: "The readiness gap means your transformation timeline isn't uniform. High-readiness functions can start in Phase 1, but lower-readiness functions need a longer runway with more change management investment. A single-speed rollout will either move too fast for laggards or too slow for leaders.",
    },
]


def _concentration_champion_pattern(findings: list[dict]) -> str:
    # Find the concentrated function and champion function
    concentrated = ""
    champion = ""
    for f in findings:
        d = f["detail"].lower()
        if "concentration" in d and f.get("function"):
            concentrated = f["function"]
        if "champion" in d and "pilot" in d and f.get("function"):
            champion = f["function"]
    if concentrated and champion and concentrated == champion:
        return f"Interesting — **{concentrated}** is both your largest function (concentration risk) AND has the most Champions. This is actually good news: your biggest transformation risk area also has the strongest internal advocates. Prioritize this function for early pilots."
    if concentrated and champion:
        return f"Your concentration risk is in **{concentrated}**, but your strongest change champions are in **{champion}**. Consider seeding champion-led pilot programs from {champion} into {concentrated} to de-risk the transformation."
    return "The concentration of headcount in one function creates risk, but the presence of change champions across the org provides a natural mitigation path."


def cross_reference_findings(
    all_findings: list[dict],
    analysis_results: dict | None = None,
) -> list[str]:
    """Check for cross-references and patterns across all findings.

    Returns a list of cross-reference observation strings.
    """
    if not all_findings:
        return []

    observations: list[str] = []

    # 1. Group by function — look for functions appearing in multiple finding categories
    by_function: dict[str, list[dict]] = defaultdict(list)
    for f in all_findings:
        if f.get("function"):
            by_function[f["function"]].append(f)

    for func, func_findings in by_function.items():
        categories = set(f["category"] for f in func_findings)
        if len(categories) >= 3:
            cats = ", ".join(sorted(categories))
            observations.append(
                f"**{func}** appears across {len(categories)} categories ({cats}). "
                f"This function is a transformation hotspot — multiple dimensions flagged simultaneously. "
                f"Consider a dedicated transformation workstream for this function."
            )

    # 2. Apply rule-based patterns
    for pattern in _PATTERNS:
        try:
            if pattern["conditions"](all_findings):
                result = pattern["generate"](all_findings)
                if isinstance(result, str) and result:
                    observations.append(result)
        except Exception:
            continue

    # 3. Severity escalation — if >3 critical findings in same category, escalate
    from collections import Counter
    critical_cats = Counter(f["category"] for f in all_findings if f["severity"] == "critical")
    for cat, count in critical_cats.items():
        if count >= 3:
            observations.append(
                f"**Warning:** {count} critical findings in the {cat} category. "
                f"This concentration of critical issues suggests a systemic problem, not isolated incidents. "
                f"Address the root cause, not just the symptoms."
            )

    # 4. If AI is available, ask Claude for deeper pattern recognition
    if ai_available() and len(all_findings) >= 5:
        ai_obs = _ai_cross_reference(all_findings, analysis_results)
        if ai_obs:
            observations.extend(ai_obs)

    return observations[:5]  # Cap at 5 cross-references


def _ai_cross_reference(findings: list[dict], results: dict | None) -> list[str]:
    """Use Claude to find non-obvious patterns."""
    try:
        findings_summary = json.dumps([
            {"title": f["title"], "category": f["category"], "severity": f["severity"],
             "function": f.get("function"), "detail": f["detail"][:100]}
            for f in findings[:20]
        ], default=str)

        from app.ai_providers import call_claude_sync
        prompt = f"""Here are {len(findings)} findings from a workforce transformation analysis:

{findings_summary}

Identify 1-2 NON-OBVIOUS patterns or connections between these findings that a senior consultant would notice. Focus on:
- Correlations between different categories (e.g., structural issues amplifying skills gaps)
- Function-level patterns (same function appearing across multiple problem areas)
- Sequencing implications (which issues must be solved first for others to improve)

Return as a JSON array of strings. Each string is one observation (1-2 sentences). Be specific."""

        raw = call_claude_sync(prompt, model="claude-haiku-4-5-20251001", max_tokens=400, json_mode=True)
        result = json.loads(raw)
        if isinstance(result, list):
            return [str(r) for r in result[:2]]
    except Exception as e:
        print(f"[CrossRef] AI pattern recognition failed: {e}")
    return []
