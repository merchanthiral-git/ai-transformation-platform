"""AI Assistant routes — Gemini proxy with retry, fallback, rate limiting, and cooldown."""

import os
import time
import asyncio
from collections import defaultdict

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Request

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

router = APIRouter(tags=["ai"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]
GEMINI_MODEL = GEMINI_MODELS[0]
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

RATE_LIMIT_PER_DAY = 20
_rate_tracker: dict[str, list[float]] = defaultdict(list)
_last_call_time: float = 0


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


def _gemini_url(model: str = "") -> str:
    if not GEMINI_API_KEY:
        return ""
    m = model or GEMINI_MODEL
    return f"{GEMINI_BASE}/{m}:generateContent?key={GEMINI_API_KEY}"


async def _cooldown():
    global _last_call_time
    now = time.time()
    wait = max(0, 2.0 - (now - _last_call_time))
    if wait > 0:
        await asyncio.sleep(wait)
    _last_call_time = time.time()


async def _call_gemini(body: dict, timeout: float = 60.0) -> tuple[str, str | None]:
    """Try all models with retry. Returns (text, error_or_None)."""
    await _cooldown()

    for model in GEMINI_MODELS:
        url = _gemini_url(model)
        if not url:
            return "", "GEMINI_API_KEY not configured"

        for attempt in range(3):  # up to 3 tries per model
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=body)
                    data = resp.json()

                    if resp.status_code == 200:
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text = parts[0].get("text", "")
                                if text:
                                    return text, None
                            reason = candidates[0].get("finishReason", "")
                            if reason == "SAFETY":
                                return "", "Response blocked by safety filters. Try rephrasing."
                        return "", "Empty response. Try a different prompt."

                    if resp.status_code == 400 and "API_KEY_INVALID" in str(data):
                        return "", "Invalid API key. Get a new one at https://aistudio.google.com/apikey"

                    if resp.status_code == 403:
                        msg = data.get("error", {}).get("message", "")
                        if "leaked" in msg.lower():
                            return "", "API key revoked. Generate a new key at https://aistudio.google.com/apikey"
                        return "", f"Access denied: {msg}"

                    # Rate limit / high demand — retry after delay
                    if resp.status_code in (429, 503):
                        if attempt < 2:
                            await asyncio.sleep(3)
                            continue
                        break  # try next model

                    err = data.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    if attempt < 2:
                        await asyncio.sleep(2)
                        continue
                    break

            except (httpx.ConnectError, httpx.TimeoutException):
                if attempt < 2:
                    await asyncio.sleep(2)
                    continue
                break
            except Exception as e:
                return "", str(e)

    return "", "AI is temporarily busy — try again in a moment"


# Response cache
_api_cache: dict = {}
def _cache_key(e: str, m: str) -> str: return f"{e}:{m}"
def _get_cached(e: str, m: str): return _api_cache.get(_cache_key(e, m))
def _set_cached(e: str, m: str, d: dict):
    _api_cache[_cache_key(e, m)] = d
    if len(_api_cache) > 50: del _api_cache[list(_api_cache.keys())[0]]


@router.get("/api/ai/health")
async def ai_health():
    """Check Gemini connectivity with model fallback."""
    if not GEMINI_API_KEY:
        return {"status": "error", "detail": "GEMINI_API_KEY not set. Create backend/.env with GEMINI_API_KEY=your_key"}

    text, err = await _call_gemini({
        "contents": [{"parts": [{"text": "Reply with only the word OK"}]}],
        "generationConfig": {"maxOutputTokens": 10}
    }, timeout=10.0)

    if err:
        return {"status": "error", "detail": err, "models": GEMINI_MODELS}
    return {"status": "ok", "model": GEMINI_MODEL, "response": text.strip(), "models": GEMINI_MODELS}


@router.post("/api/ai/generate")
async def ai_generate(payload: dict, request: Request):
    """Proxy AI requests with retry, fallback, rate limiting, and cooldown."""
    if not GEMINI_API_KEY:
        return {"text": "[AI unavailable] GEMINI_API_KEY not configured. Add it to backend/.env", "error": True, "remaining": 0}

    user_id = _get_user_id(request)
    allowed, remaining = _check_rate_limit(user_id)
    if not allowed:
        return {"text": f"[Rate limit reached] You've used all {RATE_LIMIT_PER_DAY} AI requests for today.", "error": True, "remaining": 0}

    system_prompt = payload.get("system", "")
    user_message = payload.get("message", "")
    if not user_message.strip():
        return {"text": "[Error] Message cannot be empty.", "error": True, "remaining": remaining}

    body = {
        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_message}"}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2000}
    }

    text, err = await _call_gemini(body)

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
    return {"remaining": remaining, "limit": RATE_LIMIT_PER_DAY, "model": GEMINI_MODEL}


@router.get("/api/cache/clear")
async def clear_cache():
    _api_cache.clear()
    return {"status": "cleared"}
