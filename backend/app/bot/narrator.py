"""Narrator — selects and fills narration templates to make the bot
sound like a senior consultant rather than a data dump.

Each method returns a list of log-entry dicts ready to append to
BotContext.activity_log.  Entries carry a ``delay_ms`` metadata field
so the frontend can stagger display.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

from app.bot.templates.narration import (
    PROFILE_WORKFORCE,
    ANALYZE_ORG_STRUCTURE,
    ASSESS_AI_READINESS,
    IDENTIFY_OPPORTUNITIES,
    ANALYZE_SKILLS,
    ASSESS_CHANGE_READINESS,
    BUILD_SCENARIOS,
    GENERATE_ROADMAP,
    SYNTHESIZE_FINDINGS,
    TRANSITIONS,
    GUIDED_QUESTIONS,
    USER_ACKNOWLEDGEMENTS,
    ACTION_DESCRIPTIONS,
    DELAYS,
)

_ACTION_TEMPLATES = {
    "profile_workforce": PROFILE_WORKFORCE,
    "analyze_org_structure": ANALYZE_ORG_STRUCTURE,
    "assess_ai_readiness": ASSESS_AI_READINESS,
    "identify_opportunities": IDENTIFY_OPPORTUNITIES,
    "analyze_skills": ANALYZE_SKILLS,
    "assess_change_readiness": ASSESS_CHANGE_READINESS,
    "build_scenarios": BUILD_SCENARIOS,
    "generate_roadmap": GENERATE_ROADMAP,
    "synthesize_findings": SYNTHESIZE_FINDINGS,
}


def _uid() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pick(templates: list[str]) -> str:
    """Pick a random template from a list."""
    return random.choice(templates) if templates else ""


def _safe_format(template: str, data: dict) -> str:
    """Format a template, gracefully handling missing keys."""
    try:
        return template.format(**data)
    except (KeyError, ValueError, IndexError):
        # Fill what we can, leave rest as-is
        import re
        result = template
        for key, val in data.items():
            # Handle simple {key} and {key:format} patterns
            result = re.sub(r"\{" + re.escape(key) + r"(?::[^}]*)?\}", str(val), result)
        return result


def _entry(type_: str, content: str, delay_ms: int, metadata: dict | None = None) -> dict:
    e = {
        "id": _uid(),
        "timestamp": _now(),
        "actor": "bot",
        "type": type_,
        "content": content,
        "metadata": {"delay_ms": delay_ms},
    }
    if metadata:
        e["metadata"].update(metadata)
    return e


class Narrator:
    """Generates rich narration from templates for each analysis action."""

    def __init__(self, speed: str = "normal"):
        self.speed = speed if speed in DELAYS else "normal"

    @property
    def _delays(self) -> dict:
        return DELAYS[self.speed]

    # ── Intro ──

    def narrate_intro(self, action_name: str, data: dict) -> list[dict]:
        tpl_set = _ACTION_TEMPLATES.get(action_name, {})
        entries = []

        # Intro line
        intros = tpl_set.get("intro", [])
        if intros:
            text = _safe_format(_pick(intros), data)
            entries.append(_entry("narration", text, self._delays["intro"]))

        # Progress line (if templates exist and we have data)
        progress = tpl_set.get("progress", [])
        if progress and data:
            text = _safe_format(_pick(progress), data)
            entries.append(_entry("status", text, self._delays["progress"]))

        return entries

    # ── Progress update ──

    def narrate_progress(self, action_name: str, progress_data: dict) -> dict:
        tpl_set = _ACTION_TEMPLATES.get(action_name, {})
        progress = tpl_set.get("progress", [])
        if progress:
            text = _safe_format(_pick(progress), progress_data)
        else:
            text = f"Processing {action_name}..."
        return _entry("status", text, self._delays["progress"])

    # ── Finding ──

    def narrate_finding(self, action_name: str, finding_type: str, data: dict) -> dict:
        tpl_set = _ACTION_TEMPLATES.get(action_name, {})
        findings_map = tpl_set.get("findings", {})
        templates = findings_map.get(finding_type, [])
        if templates:
            text = _safe_format(_pick(templates), data)
        else:
            # Fallback — just describe the finding plainly
            text = data.get("text", data.get("title", str(data)))
        severity = data.get("severity", "info")
        prefix = "⚠️ " if severity == "critical" else "📋 " if severity == "warning" else "💡 "
        return _entry("finding", prefix + text, self._delays["finding"], {"severity": severity, "finding_type": finding_type})

    # ── Summary ──

    def narrate_summary(self, action_name: str, data: dict) -> dict:
        tpl_set = _ACTION_TEMPLATES.get(action_name, {})
        summaries = tpl_set.get("summary", [])
        if summaries:
            text = _safe_format(_pick(summaries), data)
        else:
            text = f"Completed {action_name}."
        return _entry("narration", text, self._delays["summary"])

    # ── Transition ──

    def narrate_transition(self, next_action: str) -> dict:
        desc = ACTION_DESCRIPTIONS.get(next_action, next_action.replace("_", " "))
        text = _safe_format(_pick(TRANSITIONS), {"next_action_description": desc})
        return _entry("narration", text, self._delays["transition"])

    # ── Guided-mode question ──

    def narrate_guided_question(self, completed_action: str, data: dict) -> dict:
        questions = GUIDED_QUESTIONS.get(completed_action, [])
        if questions:
            text = _safe_format(_pick(questions), data)
        else:
            text = "Type **go** to continue to the next step."
        return _entry("question", text, self._delays["transition"])

    # ── User acknowledgement ──

    def narrate_user_acknowledgment(self, command_type: str, detail: str = "", context: str = "") -> dict:
        templates = USER_ACKNOWLEDGEMENTS.get(command_type, [])
        if templates:
            text = _safe_format(_pick(templates), {"detail": detail, "context": context})
        else:
            text = f"Acknowledged: {detail}" if detail else "Acknowledged."
        return _entry("narration", text, self._delays["finding"])
