"""Bot session context — holds all state for a single analysis session."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone


def _uid() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class BotContext:
    def __init__(self, project_id: str, model_id: str, mode: str = "guided"):
        self.session_id: str = uuid.uuid4().hex
        self.project_id: str = project_id
        self.model_id: str = model_id
        self.mode: str = mode  # "autopilot" | "guided" | "question"
        self.speed: str = "normal"  # "slow" | "normal" | "fast"
        self.status: str = "idle"
        self.current_action: str | None = None
        self.current_action_progress: float = 0.0

        self.activity_log: list[dict] = []
        self.findings: list[dict] = []
        self.corrections: list[dict] = []
        self.preferences: list[dict] = []
        self.focus_area: str | None = None
        self.completed_actions: list[str] = []
        self.skipped_actions: list[str] = []
        self.analysis_results: dict = {}

    # ── Logging ──

    def add_log(self, actor: str, type_: str, content: str, metadata: dict | None = None) -> dict:
        entry = {
            "id": _uid(),
            "timestamp": _now(),
            "actor": actor,
            "type": type_,
            "content": content,
        }
        if metadata:
            entry["metadata"] = metadata
        self.activity_log.append(entry)
        return entry

    def add_finding(
        self,
        category: str,
        severity: str,
        title: str,
        detail: str,
        metric_value=None,
        benchmark_value=None,
        function: str | None = None,
        confidence: float = 1.0,
    ) -> dict:
        finding = {
            "id": _uid(),
            "timestamp": _now(),
            "category": category,
            "severity": severity,
            "title": title,
            "detail": detail,
            "metric_value": metric_value,
            "benchmark_value": benchmark_value,
            "function": function,
            "confidence": confidence,
            "user_status": "pending",
            "user_correction": None,
        }
        self.findings.append(finding)
        # Also log it
        self.add_log("bot", "finding", title, {
            "severity": severity,
            "category": category,
            "finding_id": finding["id"],
        })
        return finding

    def add_correction(self, original: str, correction: str):
        self.corrections.append({
            "original": original,
            "correction": correction,
            "timestamp": _now(),
        })

    def add_preference(self, preference: str):
        self.preferences.append({
            "preference": preference,
            "timestamp": _now(),
        })

    # ── Summaries ──

    def get_corrections_summary(self) -> str:
        if not self.corrections:
            return ""
        lines = [f"- User corrected '{c['original']}' to '{c['correction']}'" for c in self.corrections]
        return "User corrections:\n" + "\n".join(lines)

    def get_preferences_summary(self) -> str:
        if not self.preferences:
            return ""
        lines = [f"- {p['preference']}" for p in self.preferences]
        return "User preferences:\n" + "\n".join(lines)

    # ── Progress ──

    ACTION_SEQUENCE = [
        "profile_workforce",
        "analyze_org_structure",
        "assess_ai_readiness",
        "identify_opportunities",
        "analyze_skills",
        "assess_change_readiness",
        "build_scenarios",
        "generate_roadmap",
        "synthesize_findings",
    ]

    def get_progress(self) -> dict:
        total = len(self.ACTION_SEQUENCE)
        completed = len(self.completed_actions)
        return {
            "completed": completed,
            "total": total,
            "percentage": round(completed / max(total, 1) * 100, 1),
            "current_action": self.current_action,
        }

    # ── Serialisation ──

    def to_dict(self) -> dict:
        import json
        # Safely serialize analysis_results (may contain numpy types)
        def _safe(obj):
            try:
                json.dumps(obj)
                return obj
            except (TypeError, ValueError):
                return str(obj)

        safe_results = {}
        for k, v in self.analysis_results.items():
            try:
                json.dumps(v)
                safe_results[k] = v
            except (TypeError, ValueError):
                # Convert non-serializable values
                safe_results[k] = json.loads(json.dumps(v, default=str))

        return {
            "session_id": self.session_id,
            "project_id": self.project_id,
            "model_id": self.model_id,
            "mode": self.mode,
            "speed": self.speed,
            "status": self.status,
            "current_action": self.current_action,
            "current_action_progress": self.current_action_progress,
            "activity_log": self.activity_log,
            "findings": self.findings,
            "corrections": self.corrections,
            "preferences": self.preferences,
            "focus_area": self.focus_area,
            "completed_actions": self.completed_actions,
            "skipped_actions": self.skipped_actions,
            "progress": self.get_progress(),
            "analysis_results": safe_results,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BotContext":
        ctx = cls(data["project_id"], data["model_id"], data.get("mode", "guided"))
        ctx.session_id = data["session_id"]
        ctx.speed = data.get("speed", "normal")
        ctx.status = data.get("status", "idle")
        ctx.current_action = data.get("current_action")
        ctx.current_action_progress = data.get("current_action_progress", 0.0)
        ctx.activity_log = data.get("activity_log", [])
        ctx.findings = data.get("findings", [])
        ctx.corrections = data.get("corrections", [])
        ctx.preferences = data.get("preferences", [])
        ctx.focus_area = data.get("focus_area")
        ctx.completed_actions = data.get("completed_actions", [])
        ctx.skipped_actions = data.get("skipped_actions", [])
        ctx.analysis_results = data.get("analysis_results", {})
        return ctx
