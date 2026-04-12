"""Natural Language Query engine — ask anything about your workforce data."""

import json
import os
import time
import hashlib
from datetime import datetime
from pathlib import Path

import pandas as pd
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Request

from app.store import store, build_ai_priority_scores, apply_filters
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _f
from app.agents.memory import get_recent_memories

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

router = APIRouter(prefix="/api", tags=["nlq"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
NLQ_MODEL = "claude-haiku-4-5-20251001"
CLAUDE_BASE = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
NO_KEY_MSG = "Add your ANTHROPIC_API_KEY to backend/.env to enable AI features"

NLQ_DIR = Path(__file__).parent.parent / "data" / "nlq"
NLQ_DIR.mkdir(parents=True, exist_ok=True)

NLQ_SYSTEM = """You are a data analyst embedded in an AI workforce transformation platform. You have access to this organization's complete workforce data summary. Answer questions precisely using the actual numbers from the data.

IMPORTANT RULES:
- Use ONLY the data provided in the context. Never invent numbers.
- If the data doesn't contain enough information to answer, say so clearly.
- Be concise and direct — consulting-grade responses, not academic.
- When comparing, always include the actual numbers for both sides.

Respond ONLY with valid JSON (no markdown, no backticks). Use this exact structure:
{
  "answer": "Plain English answer with actual numbers from the data",
  "data_type": "number|list|table|chart|comparison",
  "data": [the actual records/values to display — arrays of objects for table/chart, single value for number, array of strings for list, object with keys for comparison],
  "sql_like_logic": "Brief description of what filter/aggregation you applied",
  "confidence": 0.0-1.0,
  "follow_up_questions": ["question 1", "question 2", "question 3"]
}

data_type guidance:
- "number": single metric → data should be {"value": 123, "label": "Total headcount"}
- "list": ranked items → data should be [{"label": "item", "value": 123}, ...]
- "table": structured data → data should be [{"col1": "val", "col2": "val"}, ...]
- "chart": bar/column chart → data should be [{"name": "category", "value": 123}, ...]
- "comparison": side-by-side → data should be {"left": {"label": "A", "values": {...}}, "right": {"label": "B", "values": {...}}}"""


def _build_data_summary(model_id: str, user_id: str = "") -> dict | None:
    """Build aggregated data summary for Claude context. Keeps tokens low."""
    mid = store.resolve_model_id(model_id, user_id)
    if mid not in store.datasets:
        return None

    data = store.get_filtered_data(mid, _f())
    wf = data["workforce"]
    wd = data["work_design"]
    jc = data["job_catalog"]

    if wf.empty and wd.empty:
        return None

    summary: dict = {"model_id": model_id}

    # Workforce summary
    if not wf.empty:
        summary["total_employees"] = int(len(wf))

        # Function breakdown
        func_counts = safe_value_counts(get_series(wf, "Function ID"))
        funcs = []
        for fn, count in func_counts.items():
            fn_str = str(fn).strip()
            if fn_str and fn_str != "nan":
                funcs.append({"name": fn_str, "headcount": int(count)})
        summary["functions"] = sorted(funcs, key=lambda x: -x["headcount"])

        # Career level distribution
        level_counts = safe_value_counts(get_series(wf, "Career Level"))
        summary["career_levels"] = [{"level": str(k), "count": int(v)} for k, v in level_counts.items() if str(k).strip() and str(k) != "nan"]

        # Track distribution
        track_counts = safe_value_counts(get_series(wf, "Career Track"))
        summary["career_tracks"] = [{"track": str(k), "count": int(v)} for k, v in track_counts.items() if str(k).strip() and str(k) != "nan"]

        # Roles by headcount with function
        role_func: dict = {}
        if "Job Title" in wf.columns and "Function ID" in wf.columns:
            for _, row in wf.iterrows():
                t = str(row.get("Job Title", "")).strip()
                fn = str(row.get("Function ID", "")).strip()
                if t and t != "nan":
                    if t not in role_func:
                        role_func[t] = {"title": t, "headcount": 0, "function": fn}
                    role_func[t]["headcount"] += 1
        summary["roles"] = sorted(role_func.values(), key=lambda x: -x["headcount"])[:30]

        # Manager analysis
        if "Manager Name" in wf.columns:
            mgr_reports = safe_value_counts(get_series(wf, "Manager Name"))
            wide_span = {str(k): int(v) for k, v in mgr_reports.items() if int(v) > 8 and str(k).strip() and str(k) != "nan"}
            summary["managers_with_wide_span"] = [{"manager": k, "direct_reports": v} for k, v in sorted(wide_span.items(), key=lambda x: -x[1])[:10]]
            summary["avg_span_of_control"] = round(float(mgr_reports.mean()), 1) if not mgr_reports.empty else 0

    # Work design / AI impact summary
    if not wd.empty:
        summary["total_tasks"] = int(len(wd))
        summary["unique_roles_with_tasks"] = int(get_series(wd, "Job Title").nunique()) if "Job Title" in wd.columns else 0

        # AI impact scoring
        scored = build_ai_priority_scores(wd)
        if not scored.empty and "AI Priority" in scored.columns:
            # Per-role AI scores
            role_ai = []
            for title, g in scored.groupby(get_series(scored, "Job Title").astype(str)):
                title_str = str(title).strip()
                if not title_str or title_str == "nan":
                    continue
                avg_score = round(float(g["AI Priority"].mean()), 1)
                task_count = int(len(g))
                high_tasks = int((g["AI Priority"] >= 7).sum())
                role_ai.append({
                    "title": title_str, "avg_ai_score": avg_score,
                    "task_count": task_count, "high_ai_tasks": high_tasks,
                })
            summary["roles_ai_impact"] = sorted(role_ai, key=lambda x: -x["avg_ai_score"])

            # Function-level AI scores
            func_ai = []
            if "Function ID" in scored.columns:
                for fn, g in scored.groupby(get_series(scored, "Function ID").astype(str)):
                    fn_str = str(fn).strip()
                    if fn_str and fn_str != "nan":
                        func_ai.append({
                            "function": fn_str,
                            "avg_ai_score": round(float(g["AI Priority"].mean()), 1),
                            "tasks": int(len(g)),
                            "high_impact_tasks": int((g["AI Priority"] >= 7).sum()),
                        })
            summary["functions_ai_impact"] = sorted(func_ai, key=lambda x: -x["avg_ai_score"])

            # Overall AI stats
            summary["ai_stats"] = {
                "avg_score": round(float(scored["AI Priority"].mean()), 1),
                "tasks_high_impact": int((scored["AI Priority"] >= 7).sum()),
                "tasks_moderate": int(((scored["AI Priority"] >= 4) & (scored["AI Priority"] < 7)).sum()),
                "tasks_low_impact": int((scored["AI Priority"] < 4).sum()),
            }

        # Task type distribution
        if "AI Impact" in wd.columns:
            ai_dist = safe_value_counts(get_series(wd, "AI Impact"))
            summary["ai_impact_distribution"] = [{"level": str(k), "count": int(v)} for k, v in ai_dist.items() if str(k).strip() and str(k) != "nan"]

    return summary


async def _call_nlq_claude(question: str, data_context: str, module: str = "") -> dict:
    """Call Claude Haiku for NLQ — optimized for speed."""
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        return {"answer": NO_KEY_MSG, "data_type": "error", "confidence": 0}

    module_hint = f"\nThe user is currently in the '{module}' module." if module else ""

    user_prompt = f"""Question: {question}
{module_hint}

Organization Data:
{data_context}"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    body = {
        "model": NLQ_MODEL,
        "max_tokens": 1500,
        "system": NLQ_SYSTEM,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(CLAUDE_BASE, json=body, headers=headers)
            if resp.status_code != 200:
                err = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                return {"answer": f"AI query failed: {err}", "data_type": "error", "confidence": 0}
            content = resp.json().get("content", [])
            if not content:
                return {"answer": "Empty response from AI", "data_type": "error", "confidence": 0}
            raw = content[0].get("text", "")
            # Parse JSON
            raw = raw.strip()
            if raw.startswith("```"):
                lines = raw.split("\n")
                raw = "\n".join(lines[1:])
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            return json.loads(raw)
    except json.JSONDecodeError:
        # Return the raw text as answer if JSON parsing fails
        return {"answer": raw[:500] if raw else "Could not parse response", "data_type": "error", "confidence": 0.3}
    except Exception as e:
        return {"answer": f"Query failed: {str(e)}", "data_type": "error", "confidence": 0}


# ── History ──

def _history_path(project_id: str) -> Path:
    safe_id = project_id.replace("/", "_").replace("..", "_")
    return NLQ_DIR / f"{safe_id}.json"


def _load_history(project_id: str) -> list:
    path = _history_path(project_id)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return []


def _save_history(project_id: str, entry: dict):
    history = _load_history(project_id)
    history.append(entry)
    if len(history) > 50:
        history = history[-50:]
    _history_path(project_id).write_text(json.dumps(history, indent=2, default=str))


# ── Endpoints ──

@router.post("/nlq/query")
async def nlq_query(payload: dict, request: Request):
    """Natural language query against workforce data."""
    project_id = payload.get("project_id", "")
    question = payload.get("question", "").strip()
    module = payload.get("context", "")
    model_id = payload.get("model_id", "")

    if not question:
        return {"answer": "Please ask a question.", "data_type": "error", "confidence": 0}

    user_id = getattr(request.state, "user_id", "")

    # Build data context
    data_summary = _build_data_summary(model_id, user_id) if model_id else None
    if not data_summary:
        return {
            "answer": "Upload your workforce data first to start asking questions.",
            "data_type": "error", "confidence": 0,
            "suggestions": ["Go to the sidebar and upload an Excel file with employee data."],
        }

    # Add agent memory insights if available
    if project_id:
        recent = get_recent_memories(project_id, 3)
        if recent:
            insights = []
            for snap in recent:
                agent = snap.get("agent", "")
                findings = snap.get("findings", {})
                summary_text = findings.get("executive_summary", "")
                if summary_text:
                    insights.append(f"{agent}: {summary_text}")
            if insights:
                data_summary["recent_ai_insights"] = insights

    # Serialize context (keep under ~3000 tokens)
    context_str = json.dumps(data_summary, indent=1, default=str)
    if len(context_str) > 12000:
        # Trim large sections
        for key in ["top_roles", "roles_ai_impact", "managers_with_wide_span"]:
            if key in data_summary and isinstance(data_summary[key], list):
                data_summary[key] = data_summary[key][:10]
        context_str = json.dumps(data_summary, indent=1, default=str)

    t0 = time.time()
    result = await _call_nlq_claude(question, context_str, module)
    elapsed_ms = int((time.time() - t0) * 1000)

    result["elapsed_ms"] = elapsed_ms

    # Save to history
    if project_id:
        _save_history(project_id, {
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "answer_summary": (result.get("answer", ""))[:200],
            "data_type": result.get("data_type", "error"),
            "elapsed_ms": elapsed_ms,
        })

    # Flight recorder
    if project_id and result.get("data_type") != "error":
        from app.flight_recorder import recorder
        user_id = getattr(request.state, "user_id", "")
        recorder.record(project_id, user_id, getattr(request.state, "username", ""),
            "analysis.nlq_query", module or "overview",
            f"Asked: {question[:60]}",
            (result.get("answer", ""))[:150],
            significance="automated", tags=["nlq"])

    return _safe(result)


@router.get("/nlq/history/{project_id}")
async def nlq_history(project_id: str):
    """Return last 10 queries for a project."""
    history = _load_history(project_id)
    return {"history": history[-10:]}
