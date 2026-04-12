"""Agent Memory — persistent JSON-file memory per project.

Each project gets a memory file at backend/data/agent_memory/{project_id}.json
containing snapshots from each agent run, resolved questions, and trajectory.
"""

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path

MEMORY_DIR = Path(__file__).parent.parent.parent / "data" / "agent_memory"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


def _memory_path(project_id: str) -> Path:
    safe_id = project_id.replace("/", "_").replace("..", "_")
    return MEMORY_DIR / f"{safe_id}.json"


def _empty_memory(project_id: str) -> dict:
    return {
        "project_id": project_id,
        "last_updated": datetime.now().isoformat(),
        "snapshots": [],
        "resolved_questions": [],
        "trajectory": "insufficient_data",
    }


def get_project_memory(project_id: str) -> dict:
    """Load full memory for a project, or create empty."""
    path = _memory_path(project_id)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return _empty_memory(project_id)


def _save_memory(project_id: str, memory: dict):
    memory["last_updated"] = datetime.now().isoformat()
    path = _memory_path(project_id)
    path.write_text(json.dumps(memory, indent=2, default=str))


def compute_data_fingerprint(data: dict) -> str:
    """MD5 hash of relevant data fields for change detection."""
    # Normalize: sort keys, convert to stable JSON string
    stable = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(stable.encode()).hexdigest()


def save_snapshot(project_id: str, agent_name: str, findings: dict,
                  confidence: float, input_data: dict, open_questions: list = None):
    """Save an agent run snapshot to project memory."""
    memory = get_project_memory(project_id)
    snapshot = {
        "timestamp": datetime.now().isoformat(),
        "agent": agent_name,
        "data_fingerprint": compute_data_fingerprint(input_data),
        "findings": findings,
        "confidence": round(confidence, 2),
        "open_questions": open_questions or [],
    }
    memory["snapshots"].append(snapshot)
    # Keep last 50 snapshots max
    if len(memory["snapshots"]) > 50:
        memory["snapshots"] = memory["snapshots"][-50:]
    # Update trajectory
    memory["trajectory"] = _compute_trajectory(memory["snapshots"])
    _save_memory(project_id, memory)
    return snapshot


def get_last_snapshot(project_id: str, agent_name: str) -> dict | None:
    """Get the most recent snapshot for a specific agent."""
    memory = get_project_memory(project_id)
    for snap in reversed(memory["snapshots"]):
        if snap["agent"] == agent_name:
            return snap
    return None


def get_trajectory(project_id: str) -> str:
    """Narrative of how findings have changed over time."""
    memory = get_project_memory(project_id)
    snaps = memory["snapshots"]
    if len(snaps) < 2:
        return "insufficient_data"

    # Compare confidence trends across agents
    by_agent: dict[str, list] = {}
    for s in snaps:
        by_agent.setdefault(s["agent"], []).append(s["confidence"])

    trends = []
    for agent, confs in by_agent.items():
        if len(confs) >= 2:
            delta = confs[-1] - confs[-2]
            if delta > 0.05:
                trends.append(f"{agent}: improving")
            elif delta < -0.05:
                trends.append(f"{agent}: declining")
            else:
                trends.append(f"{agent}: stable")

    if not trends:
        return "stable"

    improving = sum(1 for t in trends if "improving" in t)
    declining = sum(1 for t in trends if "declining" in t)
    if improving > declining:
        return "improving"
    elif declining > improving:
        return "declining"
    return "stable"


def save_resolved_question(project_id: str, question: str, answer: str):
    """Save a resolved clarifying question."""
    memory = get_project_memory(project_id)
    memory["resolved_questions"].append({
        "question": question,
        "answer": answer,
        "timestamp": datetime.now().isoformat(),
    })
    _save_memory(project_id, memory)


def _compute_trajectory(snapshots: list) -> str:
    if len(snapshots) < 3:
        return "insufficient_data"
    recent = [s["confidence"] for s in snapshots[-5:]]
    older = [s["confidence"] for s in snapshots[-10:-5]] if len(snapshots) >= 10 else [s["confidence"] for s in snapshots[:len(snapshots)//2]]
    if not older:
        return "insufficient_data"
    avg_recent = sum(recent) / len(recent)
    avg_older = sum(older) / len(older)
    if avg_recent - avg_older > 0.05:
        return "improving"
    elif avg_older - avg_recent > 0.05:
        return "declining"
    return "stable"


def get_recent_memories(project_id: str, count: int = 3) -> list[dict]:
    """Get the N most recent snapshots across all agents."""
    memory = get_project_memory(project_id)
    return memory["snapshots"][-count:] if memory["snapshots"] else []


def has_data_changed(project_id: str, agent_name: str, input_data: dict) -> bool:
    """Check if input data has changed since the last agent run."""
    last = get_last_snapshot(project_id, agent_name)
    if not last:
        return True
    return last["data_fingerprint"] != compute_data_fingerprint(input_data)
