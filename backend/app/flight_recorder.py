"""Transformation Flight Recorder — auditable decision journal with data snapshots.

Every meaningful decision made in the platform gets recorded automatically.
Six months later a CHRO can replay the entire transformation decision history
with full context: what the data showed, what was decided, and why.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

RECORDER_DIR = Path(__file__).parent.parent / "data" / "flight_recorder"
RECORDER_DIR.mkdir(parents=True, exist_ok=True)

MAX_EVENTS = 500


def _recorder_path(project_id: str) -> Path:
    safe_id = project_id.replace("/", "_").replace("..", "_")
    return RECORDER_DIR / f"{safe_id}.json"


def _load_events(project_id: str) -> list:
    path = _recorder_path(project_id)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return []


def _save_events(project_id: str, events: list):
    if len(events) > MAX_EVENTS:
        events = events[-MAX_EVENTS:]
    _recorder_path(project_id).write_text(json.dumps(events, indent=2, default=str))


def record(
    project_id: str,
    user_id: str = "",
    user_name: str = "",
    event_type: str = "",
    module: str = "",
    title: str = "",
    description: str = "",
    data_snapshot: dict | None = None,
    agent_context: dict | None = None,
    tags: list | None = None,
    significance: str = "minor",
):
    """Record a transformation event to the flight recorder."""
    events = _load_events(project_id)
    event = {
        "id": uuid.uuid4().hex[:12],
        "project_id": project_id,
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id,
        "user_name": user_name,
        "event_type": event_type,
        "module": module,
        "title": title,
        "description": description,
        "data_snapshot": data_snapshot or {},
        "agent_context": agent_context,
        "tags": tags or [],
        "significance": significance,
        "is_milestone": False,
    }
    events.append(event)
    _save_events(project_id, events)
    return event


def get_timeline(project_id: str, module: str = "", event_type: str = "",
                 significance: str = "", from_date: str = "", to_date: str = "") -> list:
    """Get filtered events sorted by timestamp descending."""
    events = _load_events(project_id)
    if module:
        events = [e for e in events if e.get("module") == module]
    if event_type:
        events = [e for e in events if e.get("event_type") == event_type]
    if significance:
        events = [e for e in events if e.get("significance") == significance]
    if from_date:
        events = [e for e in events if e.get("timestamp", "") >= from_date]
    if to_date:
        events = [e for e in events if e.get("timestamp", "") <= to_date]
    events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return events


def get_milestones(project_id: str) -> list:
    """Get only milestone-flagged events."""
    return [e for e in _load_events(project_id) if e.get("is_milestone")]


def toggle_milestone(project_id: str, event_id: str) -> bool:
    """Toggle milestone status for an event. Returns new status."""
    events = _load_events(project_id)
    for e in events:
        if e.get("id") == event_id:
            e["is_milestone"] = not e.get("is_milestone", False)
            _save_events(project_id, events)
            return e["is_milestone"]
    return False


def get_summary(project_id: str) -> dict:
    """Summary statistics for the project's flight recorder."""
    events = _load_events(project_id)
    if not events:
        return {"total_events": 0, "by_module": {}, "by_type": {},
                "first_event": None, "last_event": None,
                "milestone_count": 0, "most_active_module": "—", "days_active": 0}

    by_module: dict = {}
    by_type: dict = {}
    for e in events:
        m = e.get("module", "other")
        t = e.get("event_type", "other")
        by_module[m] = by_module.get(m, 0) + 1
        by_type[t] = by_type.get(t, 0) + 1

    timestamps = [e.get("timestamp", "") for e in events if e.get("timestamp")]
    first = min(timestamps) if timestamps else None
    last = max(timestamps) if timestamps else None
    days = 0
    if first and last:
        try:
            d1 = datetime.fromisoformat(first)
            d2 = datetime.fromisoformat(last)
            days = max(1, (d2 - d1).days)
        except (ValueError, TypeError):
            pass

    most_active = max(by_module, key=by_module.get) if by_module else "—"
    milestones = sum(1 for e in events if e.get("is_milestone"))

    return {
        "total_events": len(events),
        "by_module": by_module,
        "by_type": by_type,
        "first_event": first,
        "last_event": last,
        "milestone_count": milestones,
        "most_active_module": most_active,
        "days_active": days,
    }


def search(project_id: str, query: str) -> list:
    """Search events by title or description."""
    q = query.lower()
    return [e for e in _load_events(project_id)
            if q in e.get("title", "").lower() or q in e.get("description", "").lower()]


def export_timeline(project_id: str) -> str:
    """Export the full timeline as formatted markdown."""
    events = _load_events(project_id)
    events.sort(key=lambda e: e.get("timestamp", ""))
    lines = [f"# Transformation Flight Recorder\n", f"**Project:** {project_id}\n", f"**Events:** {len(events)}\n", "---\n"]

    current_date = ""
    for e in events:
        ts = e.get("timestamp", "")[:10]
        if ts != current_date:
            current_date = ts
            lines.append(f"\n## {ts}\n")

        milestone = " ⭐" if e.get("is_milestone") else ""
        sig = f" [{e.get('significance', 'minor')}]"
        lines.append(f"### {e.get('title', 'Event')}{milestone}{sig}\n")
        lines.append(f"*{ts} {e.get('timestamp', '')[11:16]} · {e.get('module', '')}*\n")
        if e.get("description"):
            lines.append(f"{e['description']}\n")
        snap = e.get("data_snapshot", {})
        if snap.get("before") and snap.get("after"):
            lines.append(f"\n**Before:** {json.dumps(snap['before'], default=str)}\n")
            lines.append(f"**After:** {json.dumps(snap['after'], default=str)}\n")
        if snap.get("delta"):
            lines.append(f"**Delta:** {json.dumps(snap['delta'], default=str)}\n")
        lines.append("")

    return "\n".join(lines)


# Singleton instance
recorder = type("FlightRecorder", (), {
    "record": staticmethod(record),
    "get_timeline": staticmethod(get_timeline),
    "get_milestones": staticmethod(get_milestones),
    "toggle_milestone": staticmethod(toggle_milestone),
    "get_summary": staticmethod(get_summary),
    "search": staticmethod(search),
    "export_timeline": staticmethod(export_timeline),
})()
