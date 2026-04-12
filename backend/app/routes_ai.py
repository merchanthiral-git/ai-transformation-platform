"""AI Assistant routes — Claude (Anthropic) API with retry, rate limiting, and cooldown."""

import os
import time
import asyncio
from collections import defaultdict

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Request

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

router = APIRouter(tags=["ai"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
CLAUDE_BASE = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

RATE_LIMIT_PER_DAY = 200
_rate_tracker: dict[str, list[float]] = defaultdict(list)
_last_call_time: float = 0

# Missing key message shown in UI
NO_KEY_MSG = "Add your ANTHROPIC_API_KEY to backend/.env to enable AI features"


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            import jwt
            payload = jwt.decode(auth[7:], options={"verify_signature": False})
            return payload.get("sub", request.client.host if request.client else "unknown")
        except Exception:
            pass
    return request.client.host if request.client else "unknown"


def _check_rate_limit(user_id: str) -> tuple[bool, int]:
    now = time.time()
    _rate_tracker[user_id] = [t for t in _rate_tracker[user_id] if t > now - 86400]
    count = len(_rate_tracker[user_id])
    remaining = max(0, RATE_LIMIT_PER_DAY - count)
    return count < RATE_LIMIT_PER_DAY, remaining


def _record_request(user_id: str):
    _rate_tracker[user_id].append(time.time())


async def _cooldown():
    global _last_call_time
    now = time.time()
    wait = max(0, 1.0 - (now - _last_call_time))
    if wait > 0:
        await asyncio.sleep(wait)
    _last_call_time = time.time()


async def _call_claude(system: str, user_message: str, timeout: float = 60.0) -> tuple[str, str | None]:
    """Call Claude API via HTTP. Returns (text, error_or_None)."""
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        return "", NO_KEY_MSG

    await _cooldown()

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": 2048,
        "system": system or "You are an expert workforce transformation consultant and organizational design specialist.",
        "messages": [{"role": "user", "content": user_message}],
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(CLAUDE_BASE, json=body, headers=headers)
                data = resp.json()

                if resp.status_code == 200:
                    content = data.get("content", [])
                    if content:
                        text = content[0].get("text", "")
                        if text:
                            return text, None
                    return "", "Empty response from Claude. Try a different prompt."

                if resp.status_code == 401:
                    return "", "Invalid ANTHROPIC_API_KEY. Check your key in backend/.env"

                if resp.status_code == 403:
                    msg = data.get("error", {}).get("message", "Access denied")
                    return "", f"Access denied: {msg}"

                if resp.status_code == 429:
                    if attempt < 2:
                        retry_after = float(resp.headers.get("retry-after", "3"))
                        await asyncio.sleep(min(retry_after, 10))
                        continue
                    return "", "Rate limited by Claude API — try again in a moment."

                if resp.status_code == 529:
                    if attempt < 2:
                        await asyncio.sleep(3)
                        continue
                    return "", "Claude API is temporarily overloaded — try again shortly."

                err = data.get("error", {}).get("message", f"HTTP {resp.status_code}")
                if attempt < 2:
                    await asyncio.sleep(2)
                    continue
                return "", f"Claude API error: {err}"

        except (httpx.ConnectError, httpx.TimeoutException):
            if attempt < 2:
                await asyncio.sleep(2)
                continue
            return "", "Could not connect to Claude API — check your internet connection."
        except Exception as e:
            return "", str(e)

    return "", "Claude AI is temporarily busy — try again in a moment"


# Response cache
_api_cache: dict = {}
def _cache_key(e: str, m: str) -> str: return f"{e}:{m}"
def _get_cached(e: str, m: str): return _api_cache.get(_cache_key(e, m))
def _set_cached(e: str, m: str, d: dict):
    _api_cache[_cache_key(e, m)] = d
    if len(_api_cache) > 50: del _api_cache[list(_api_cache.keys())[0]]


@router.get("/api/ai/health")
async def ai_health():
    """Check Claude API connectivity."""
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        return {"status": "error", "detail": NO_KEY_MSG}

    text, err = await _call_claude(
        "Reply with only the word OK.",
        "Health check — reply with only: OK",
        timeout=10.0
    )

    if err:
        return {"status": "error", "detail": err, "model": CLAUDE_MODEL}
    return {"status": "ok", "model": CLAUDE_MODEL, "response": text.strip()}


@router.post("/api/ai/generate")
async def ai_generate(payload: dict, request: Request):
    """Proxy AI requests through Claude with retry, rate limiting, and cooldown."""
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        return {"text": f"[AI unavailable] {NO_KEY_MSG}", "error": True, "remaining": 0}

    user_id = _get_user_id(request)
    allowed, remaining = _check_rate_limit(user_id)
    if not allowed:
        return {"text": f"[Rate limit reached] You've used all {RATE_LIMIT_PER_DAY} AI requests for today.", "error": True, "remaining": 0}

    system_prompt = payload.get("system", "")
    user_message = payload.get("message", "")
    if not user_message.strip():
        return {"text": "[Error] Message cannot be empty.", "error": True, "remaining": remaining}

    text, err = await _call_claude(system_prompt, user_message)

    if err:
        print(f"[AI ERROR] {err}", flush=True)
        return {"text": f"[AI unavailable] {err}", "error": True, "remaining": remaining}

    _record_request(user_id)
    _, new_remaining = _check_rate_limit(user_id)
    return {"text": text, "remaining": new_remaining}


@router.get("/api/ai/remaining")
async def ai_remaining(request: Request):
    user_id = _get_user_id(request)
    _, remaining = _check_rate_limit(user_id)
    return {"remaining": remaining, "limit": RATE_LIMIT_PER_DAY, "model": CLAUDE_MODEL}


@router.get("/api/cache/clear")
async def clear_cache():
    _api_cache.clear()
    return {"status": "cleared"}


# ═══════════════════════════════════════════════════════════════
#  AGENT SYSTEM ENDPOINTS
# ═══════════════════════════════════════════════════════════════

from app.agents.orchestrator import orchestrate
from app.agents.agents import (
    run_diagnosis, run_design, run_skills_gap,
    run_scenario, run_readiness, run_espresso,
)
from app.agents.memory import (
    get_project_memory, save_resolved_question, has_data_changed,
)
from app.agents.benchmark import get_benchmarks


@router.post("/api/agents/orchestrate")
async def agent_orchestrate(payload: dict):
    """Master orchestrator — coordinates agent chains based on user intent."""
    project_id = payload.get("project_id", "")
    intent = payload.get("intent", "full_analysis")
    session_data = payload.get("session_data", {})
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    return orchestrate(project_id, intent, session_data)


@router.post("/api/agents/diagnose")
async def agent_diagnose(payload: dict, request: Request):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    result = run_diagnosis(project_id, payload.get("session_data", {}))
    if not result.get("error"):
        from app.flight_recorder import recorder
        recorder.record(project_id, getattr(request.state, "user_id", ""), getattr(request.state, "username", ""),
            "analysis.diagnosis_run", "diagnose",
            f"Diagnosis completed — confidence {result.get('confidence', 0):.0%}",
            result.get("executive_summary", "AI transformation diagnosis completed"),
            agent_context={"confidence": result.get("confidence"), "areas": len(result.get("opportunity_areas", []))},
            significance="major")
    return result


@router.post("/api/agents/design")
async def agent_design(payload: dict):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    return run_design(project_id, payload.get("session_data", {}))


@router.post("/api/agents/skills-gap")
async def agent_skills_gap(payload: dict):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    return run_skills_gap(project_id, payload.get("session_data", {}))


@router.post("/api/agents/scenario")
async def agent_scenario(payload: dict):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    return run_scenario(project_id, payload.get("session_data", {}))


@router.post("/api/agents/readiness")
async def agent_readiness(payload: dict, request: Request):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    result = run_readiness(project_id, payload.get("session_data", {}))
    if not result.get("error"):
        from app.flight_recorder import recorder
        recorder.record(project_id, getattr(request.state, "user_id", ""), getattr(request.state, "username", ""),
            "analysis.readiness_assessed", "diagnose",
            f"Readiness assessed — {result.get('maturity_level', '?')} ({result.get('overall_score', 0)}/100)",
            result.get("trajectory_note", ""),
            agent_context={"score": result.get("overall_score"), "maturity": result.get("maturity_level")},
            significance="major")
    return result


@router.post("/api/agents/espresso")
async def agent_espresso(payload: dict):
    project_id = payload.get("project_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    return run_espresso(project_id, payload.get("session_data", {}))


@router.get("/api/agents/memory/{project_id}")
async def agent_memory(project_id: str):
    """Returns full agent memory for a project."""
    return get_project_memory(project_id)


@router.post("/api/agents/answer-question")
async def agent_answer_question(payload: dict):
    """Save a resolved clarifying question and optionally re-run the agent."""
    project_id = payload.get("project_id", "")
    question = payload.get("question", "")
    answer = payload.get("answer", "")
    agent = payload.get("agent", "")
    if not project_id or not question or not answer:
        return {"error": True, "message": "project_id, question, and answer are required"}
    save_resolved_question(project_id, question, answer)
    # Optionally re-run the agent with the answer as additional context
    if agent:
        agent_map = {
            "diagnosis": run_diagnosis, "design": run_design,
            "skills_gap": run_skills_gap, "scenario": run_scenario,
            "readiness": run_readiness,
        }
        if agent in agent_map:
            session_data = payload.get("session_data", {})
            session_data["resolved_answer"] = answer
            return {"resolved": True, "re_run": agent_map[agent](project_id, session_data)}
    return {"resolved": True}


@router.get("/api/agents/benchmarks/{project_id}")
async def agent_benchmarks(project_id: str):
    """Returns benchmark percentiles for a project."""
    return get_benchmarks(project_id)


@router.post("/api/agents/negotiate")
async def agent_negotiate(payload: dict, request: Request):
    """Scenario negotiation — find optimal scenario satisfying constraints."""
    from app.agents.negotiator import run_negotiation
    project_id = payload.get("project_id", "")
    constraints = payload.get("constraints", [])
    model_id = payload.get("model_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    if not constraints:
        return {"error": True, "message": "At least one constraint is required"}
    user_id = getattr(request.state, "user_id", "")
    result = run_negotiation(project_id, constraints, model_id, user_id)
    if not result.get("error"):
        from app.flight_recorder import recorder
        sc = result.get("scenario", {})
        recorder.record(project_id, user_id, getattr(request.state, "username", ""),
            "simulate.negotiation_run", "simulate",
            f"Negotiated: {sc.get('name', 'scenario')} — {result.get('feasibility', '?')}",
            f"{len(constraints)} constraints, {len(result.get('tradeoffs', []))} tradeoffs identified",
            data_snapshot={"after": {"headcount_delta": sc.get("headcount_delta"), "cost_delta_pct": sc.get("cost_delta_pct"), "timeline": sc.get("timeline_months")}},
            agent_context={"feasibility": result.get("feasibility"), "confidence": result.get("confidence")},
            significance="major")
    return result


@router.post("/api/agents/stress-test")
async def agent_stress_test(payload: dict, request: Request):
    """Org stress testing — cascade shock impacts across all dimensions."""
    from app.agents.stress_tester import run_stress_test
    project_id = payload.get("project_id", "")
    shock = payload.get("shock", {})
    model_id = payload.get("model_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    if not shock:
        return {"error": True, "message": "shock definition is required"}
    user_id = getattr(request.state, "user_id", "")
    result = run_stress_test(project_id, shock, model_id, user_id)
    if not result.get("error"):
        from app.flight_recorder import recorder
        recorder.record(project_id, user_id, getattr(request.state, "username", ""),
            "analysis.stress_test_run", "simulate",
            f"Stress test: {result.get('shock_summary', shock.get('description', ''))[:80]}",
            f"Severity: {result.get('severity', '?')} — {len(result.get('cascade_effects', []))} cascade effects",
            data_snapshot={"after": {"severity": result.get("severity"), "recovery_months": result.get("recovery_path", {}).get("total_recovery_months"), "recovery_cost": result.get("recovery_path", {}).get("total_cost_estimate")}},
            agent_context={"severity": result.get("severity"), "confidence": result.get("confidence")},
            significance="major")
    return result


# ── Skills Graph endpoints ──

@router.post("/api/skills/graph")
async def skills_graph(payload: dict, request: Request):
    """Build or retrieve the skills adjacency graph."""
    from app.agents.skills_graph import build_skills_graph
    project_id = payload.get("project_id", "")
    model_id = payload.get("model_id", "")
    if not project_id:
        return {"error": True, "message": "project_id is required"}
    user_id = getattr(request.state, "user_id", "")
    return build_skills_graph(project_id, model_id, user_id)


@router.post("/api/skills/path")
async def skills_path(payload: dict):
    """Find shortest path between two skills."""
    from app.agents.skills_graph import build_skills_graph, find_shortest_path
    project_id = payload.get("project_id", "")
    model_id = payload.get("model_id", "")
    source = payload.get("source_skill", "")
    target = payload.get("target_skill", "")
    if not source or not target:
        return {"error": True, "message": "source_skill and target_skill are required"}
    graph = build_skills_graph(project_id, model_id)
    if graph.get("error"):
        return graph
    return find_shortest_path(graph, source, target)


@router.post("/api/skills/role-transition")
async def skills_role_transition(payload: dict, request: Request):
    """Find skill transition paths between roles."""
    from app.agents.skills_graph import build_skills_graph, find_role_transition
    project_id = payload.get("project_id", "")
    model_id = payload.get("model_id", "")
    current_role = payload.get("current_role", "")
    target_role = payload.get("target_role", "")
    if not current_role or not target_role:
        return {"error": True, "message": "current_role and target_role are required"}
    user_id = getattr(request.state, "user_id", "")
    graph = build_skills_graph(project_id, model_id, user_id)
    if graph.get("error"):
        return graph
    return find_role_transition(graph, current_role, target_role, model_id, user_id)


@router.get("/api/skills/graph/status/{project_id}")
async def skills_graph_status(project_id: str, model_id: str = ""):
    """Check if a skills graph is built and current."""
    from app.agents.skills_graph import get_graph_status
    return get_graph_status(project_id, model_id)
