"""AI-powered narrator — uses Claude Haiku for real consultant-quality narration.

Falls back to template-based narrator when no API key is available.
Supports both streaming (generator) and non-streaming (full text) modes.
"""

from __future__ import annotations

import json
from typing import Generator

from app.ai_providers import claude_available, ANTHROPIC_API_KEY, ANTHROPIC_VERSION

_HAIKU = "claude-haiku-4-5-20251001"
_API_URL = "https://api.anthropic.com/v1/messages"

ANALYSIS_SYSTEM = """You are a senior organizational transformation consultant (think McKinsey or Mercer partner) analyzing a client's workforce data. You are narrating your analysis in real-time.

STYLE:
- Reference specific numbers: "Your Engineering function has 4,200 people" not "large"
- Compare to benchmarks: "span of 3.2 versus the benchmark of 6-8"
- Connect dots between findings when context is available
- Acknowledge limitations: "The data suggests X, but I'd want to validate with Y"
- Be concise — each observation is 1-2 sentences max
- Don't hedge excessively — if the data is clear, be direct
- Use bold (**text**) for key metrics and function names

{corrections}
{preferences}
{previous_findings}"""

INVESTIGATION_SYSTEM = """You are a senior transformation consultant investigating a specific question from the client.

Available data and previous findings are provided below. Show your reasoning — what data you're looking at, what patterns you see. Be specific with numbers. If the data doesn't fully answer the question, say what additional data would help.

Keep your response under 200 words. Use bold (**text**) for key metrics."""


def ai_available() -> bool:
    return claude_available


def narrate_analysis(
    action_name: str,
    metrics: dict,
    context: str = "",
    corrections: str = "",
    preferences: str = "",
    previous_findings: str = "",
) -> str:
    """Generate AI narration for an analysis action. Returns full text."""
    if not claude_available:
        return ""

    system = ANALYSIS_SYSTEM.format(
        corrections=corrections or "No corrections from user.",
        preferences=preferences or "No specific preferences.",
        previous_findings=previous_findings or "No previous findings.",
    )

    # Trim metrics to stay within token budget
    metrics_str = json.dumps(metrics, default=str)
    if len(metrics_str) > 4000:
        metrics_str = metrics_str[:4000] + "...(truncated)"

    prompt = f"""Analyze these {action_name.replace('_', ' ')} metrics and generate 3-5 observations.
For each, state the finding, any benchmark comparison, and one sentence on what it means for transformation strategy.
Start with the most important finding.

Context: {context}

Metrics:
{metrics_str}"""

    try:
        import httpx
        resp = httpx.post(
            _API_URL,
            json={"model": _HAIKU, "max_tokens": 800, "system": system, "messages": [{"role": "user", "content": prompt}]},
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json"},
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("content", [{}])[0].get("text", "")
    except Exception as e:
        print(f"[AI Narrator] Error: {e}")
    return ""


def narrate_analysis_stream(
    action_name: str,
    metrics: dict,
    context: str = "",
    corrections: str = "",
    preferences: str = "",
    previous_findings: str = "",
) -> Generator[str, None, None]:
    """Stream AI narration character by character via Claude streaming API."""
    if not claude_available:
        return

    system = ANALYSIS_SYSTEM.format(
        corrections=corrections or "No corrections from user.",
        preferences=preferences or "No specific preferences.",
        previous_findings=previous_findings or "No previous findings.",
    )

    metrics_str = json.dumps(metrics, default=str)
    if len(metrics_str) > 4000:
        metrics_str = metrics_str[:4000] + "...(truncated)"

    prompt = f"""Analyze these {action_name.replace('_', ' ')} metrics. Generate 3-5 key observations.
For each: state the finding, benchmark comparison if relevant, and one sentence on transformation implications.
Start with the most important. Be concise.

Context: {context}

Metrics:
{metrics_str}"""

    try:
        import httpx
        with httpx.stream(
            "POST", _API_URL,
            json={"model": _HAIKU, "max_tokens": 800, "stream": True, "system": system, "messages": [{"role": "user", "content": prompt}]},
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json"},
            timeout=30.0,
        ) as resp:
            if resp.status_code != 200:
                return
            buf = ""
            for line in resp.iter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:]
                if payload == "[DONE]":
                    break
                try:
                    evt = json.loads(payload)
                    if evt.get("type") == "content_block_delta":
                        text = evt.get("delta", {}).get("text", "")
                        if text:
                            yield text
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"[AI Narrator Stream] Error: {e}")


def investigate_question(
    question: str,
    data_summary: str,
    findings_summary: str = "",
    corrections: str = "",
) -> str:
    """AI-powered investigation of a user question."""
    if not claude_available:
        return ""

    prompt = f"""The client asked: "{question}"

Available data:
{data_summary[:3000]}

Previous findings:
{findings_summary[:1500]}

Corrections from client:
{corrections or "None"}

Investigate using the data. Show reasoning. Be specific with numbers. Under 200 words."""

    try:
        import httpx
        resp = httpx.post(
            _API_URL,
            json={"model": _HAIKU, "max_tokens": 600, "system": INVESTIGATION_SYSTEM, "messages": [{"role": "user", "content": prompt}]},
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json"},
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("content", [{}])[0].get("text", "")
    except Exception as e:
        print(f"[AI Narrator] Investigation error: {e}")
    return ""
