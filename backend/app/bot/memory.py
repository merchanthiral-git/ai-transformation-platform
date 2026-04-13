"""Cross-session bot memory — persists learning per project.

Stores corrections, preferences, dismissed patterns, custom benchmarks,
and interaction style. Loaded at session start, saved at session end.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

_MEMORY_DIR = Path(__file__).parent.parent.parent / "data" / "bot_memory"


def _ensure_dir():
    _MEMORY_DIR.mkdir(parents=True, exist_ok=True)


def _path(project_id: str) -> Path:
    safe_id = project_id.replace("/", "_").replace("\\", "_")
    return _MEMORY_DIR / f"{safe_id}.json"


def _default_memory() -> dict:
    return {
        "project_id": "",
        "corrections": [],
        "preferences": [],
        "acknowledged_patterns": [],
        "dismissed_patterns": [],
        "custom_benchmarks": {},
        "interaction_style": {
            "detail_level": "normal",
            "focus_areas": [],
            "skip_areas": [],
        },
        "last_session_summary": "",
        "total_sessions": 0,
        "total_findings": 0,
        "total_corrections": 0,
        "last_updated": "",
    }


def load_memory(project_id: str) -> dict:
    """Load bot memory for a project. Returns default if none exists."""
    _ensure_dir()
    path = _path(project_id)
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    mem = _default_memory()
    mem["project_id"] = project_id
    return mem


def save_memory(project_id: str, memory: dict):
    """Save bot memory for a project."""
    _ensure_dir()
    memory["project_id"] = project_id
    memory["last_updated"] = datetime.now(timezone.utc).isoformat()
    path = _path(project_id)
    try:
        with open(path, "w") as f:
            json.dump(memory, f, indent=2, default=str)
    except IOError as e:
        print(f"[BotMemory] Failed to save: {e}")


def update_memory_from_session(project_id: str, ctx_dict: dict):
    """Merge session results into persistent memory."""
    mem = load_memory(project_id)

    # Corrections
    for c in ctx_dict.get("corrections", []):
        if c not in mem["corrections"]:
            mem["corrections"].append(c)

    # Preferences
    for p in ctx_dict.get("preferences", []):
        if p not in mem["preferences"]:
            mem["preferences"].append(p)

    # Findings → acknowledged/dismissed
    for f in ctx_dict.get("findings", []):
        title = f.get("title", "")
        if f.get("user_status") == "acknowledged":
            if title not in mem["acknowledged_patterns"]:
                mem["acknowledged_patterns"].append(title)
        elif f.get("user_status") == "dismissed":
            if title not in mem["dismissed_patterns"]:
                mem["dismissed_patterns"].append(title)

    # Focus area → interaction style
    focus = ctx_dict.get("focus_area")
    if focus and focus not in mem["interaction_style"]["focus_areas"]:
        mem["interaction_style"]["focus_areas"].append(focus)

    # Skipped actions → skip areas
    for skip in ctx_dict.get("skipped_actions", []):
        if skip not in mem["interaction_style"]["skip_areas"]:
            mem["interaction_style"]["skip_areas"].append(skip)

    # Detect detail preference from speed
    speed = ctx_dict.get("speed", "normal")
    if speed == "slow":
        mem["interaction_style"]["detail_level"] = "high"
    elif speed == "fast":
        mem["interaction_style"]["detail_level"] = "low"

    # Summary
    completed = ctx_dict.get("completed_actions", [])
    findings_count = len(ctx_dict.get("findings", []))
    mem["last_session_summary"] = (
        f"Completed {len(completed)} actions, found {findings_count} findings. "
        f"Focus: {focus or 'general'}. "
        f"Actions: {', '.join(completed[:5])}{'...' if len(completed) > 5 else ''}."
    )

    mem["total_sessions"] = mem.get("total_sessions", 0) + 1
    mem["total_findings"] = mem.get("total_findings", 0) + findings_count
    mem["total_corrections"] = mem.get("total_corrections", 0) + len(ctx_dict.get("corrections", []))

    # Cap list sizes
    mem["corrections"] = mem["corrections"][-50:]
    mem["preferences"] = mem["preferences"][-20:]
    mem["acknowledged_patterns"] = mem["acknowledged_patterns"][-100:]
    mem["dismissed_patterns"] = mem["dismissed_patterns"][-100:]

    save_memory(project_id, mem)
    return mem


def format_memory_for_prompt(mem: dict) -> str:
    """Format memory as context string for AI prompts."""
    parts = []
    if mem["corrections"]:
        parts.append("Previous corrections from this client:")
        for c in mem["corrections"][-5:]:
            parts.append(f"  - Corrected '{c.get('original', '')}' to '{c.get('correction', '')}'")
    if mem["interaction_style"]["focus_areas"]:
        parts.append(f"Client's focus areas: {', '.join(mem['interaction_style']['focus_areas'])}")
    if mem["custom_benchmarks"]:
        parts.append(f"Custom benchmarks: {json.dumps(mem['custom_benchmarks'])}")
    if mem["dismissed_patterns"]:
        parts.append(f"Client has dismissed these topics (don't repeat): {', '.join(mem['dismissed_patterns'][-5:])}")
    return "\n".join(parts) if parts else ""
