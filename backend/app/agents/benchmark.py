"""Benchmark Engine — cross-project anonymized percentiles.

Reads all project memory files and computes how the current project
compares against anonymized patterns from all projects.
"""

import json
from pathlib import Path
from .memory import MEMORY_DIR, get_project_memory


def _load_all_memories() -> list[dict]:
    """Load all project memory files for benchmarking (anonymized scores only)."""
    memories = []
    if not MEMORY_DIR.exists():
        return memories
    # Scan flat files and user-scoped subdirectories
    for f in MEMORY_DIR.rglob("*.json"):
        try:
            data = json.loads(f.read_text())
            if data.get("snapshots"):
                memories.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return memories


def _extract_metric(memory: dict, agent: str, metric_key: str) -> float | None:
    """Extract a numeric metric from the latest snapshot of an agent."""
    for snap in reversed(memory["snapshots"]):
        if snap["agent"] == agent and snap.get("findings"):
            findings = snap["findings"]
            # Check direct key
            if metric_key in findings and isinstance(findings[metric_key], (int, float)):
                return float(findings[metric_key])
            # Check nested in summary
            if isinstance(findings.get("summary"), dict) and metric_key in findings["summary"]:
                return float(findings["summary"][metric_key])
            # Check confidence as fallback metric
            if metric_key == "confidence":
                return snap.get("confidence", 0)
    return None


def _percentile_rank(value: float, all_values: list[float]) -> int:
    """Calculate percentile rank (0-100) of value within all_values."""
    if not all_values or len(all_values) < 2:
        return 50  # Default to average if insufficient data
    below = sum(1 for v in all_values if v < value)
    return int(below / len(all_values) * 100)


def _label_from_percentile(pct: int) -> str:
    if pct >= 75:
        return "top quartile"
    elif pct >= 50:
        return "above average"
    elif pct >= 25:
        return "average"
    return "below average"


def get_benchmarks(project_id: str) -> dict:
    """Compute benchmark percentiles for a project vs all others.

    Returns: { metric_name: { value, percentile, label, sample_size } }
    """
    all_memories = _load_all_memories()
    current = get_project_memory(project_id)

    metrics_config = [
        ("ai_opportunity_score", "diagnosis", "confidence"),
        ("skills_gap_severity", "skills_gap", "confidence"),
        ("readiness_score", "readiness", "overall_score"),
        ("automation_potential", "diagnosis", "confidence"),
    ]

    benchmarks = {}
    for metric_name, agent, metric_key in metrics_config:
        current_val = _extract_metric(current, agent, metric_key)
        all_vals = []
        for mem in all_memories:
            if mem["project_id"] == project_id:
                continue
            v = _extract_metric(mem, agent, metric_key)
            if v is not None:
                all_vals.append(v)

        if current_val is not None:
            pct = _percentile_rank(current_val, all_vals) if all_vals else 50
            benchmarks[metric_name] = {
                "value": round(current_val, 2),
                "percentile": pct,
                "label": _label_from_percentile(pct),
                "sample_size": len(all_vals) + 1,
            }
        else:
            benchmarks[metric_name] = {
                "value": None,
                "percentile": None,
                "label": "no data",
                "sample_size": len(all_vals),
            }

    return benchmarks
