"""AI Provider — Claude (Anthropic) via direct HTTP calls.

All AI calls route through Claude Sonnet for:
- Agent reasoning and structured analysis
- Narrative writing and insights
- Bulk generation and JD creation
"""

import os
import json
import httpx
from dotenv import load_dotenv

# Load .env from backend/ directory explicitly
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
CLAUDE_BASE = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

NO_KEY_MSG = "Add your ANTHROPIC_API_KEY to backend/.env to enable AI features"

claude_available = bool(ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_key_here")
if claude_available:
    print(f"[AI] Claude API key configured ({CLAUDE_MODEL})")
else:
    print(f"[AI] No ANTHROPIC_API_KEY — {NO_KEY_MSG}")


def call_claude_sync(prompt: str, system: str = None, model: str = None, max_tokens: int = 4096, json_mode: bool = False) -> str:
    """Call Claude API synchronously for complex reasoning and structured analysis."""
    if not claude_available:
        raise Exception(NO_KEY_MSG)

    model = model or CLAUDE_MODEL
    system_prompt = system or "You are an expert workforce transformation consultant and organizational design specialist."

    if json_mode:
        system_prompt += "\n\nRespond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    body = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": prompt}],
    }

    resp = httpx.post(CLAUDE_BASE, json=body, headers=headers, timeout=60.0)

    if resp.status_code == 401:
        raise Exception("Invalid ANTHROPIC_API_KEY. Check your key in backend/.env")
    if resp.status_code == 429:
        raise Exception("Claude API rate limited — try again in a moment")
    if resp.status_code != 200:
        err = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
        raise Exception(f"Claude API error: {err}")

    data = resp.json()
    content = data.get("content", [])
    if not content:
        raise Exception("Empty response from Claude")

    response_text = content[0].get("text", "")

    if json_mode:
        response_text = response_text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

    return response_text


def call_claude_structured_sync(prompt: str, system: str = None, model: str = None) -> dict:
    """Call Claude and parse the response as JSON."""
    response = call_claude_sync(prompt, system, model or CLAUDE_MODEL, json_mode=True)
    return json.loads(response)


def call_ai_sync(prompt: str, task_type: str = "general", system: str = None) -> tuple[str, str]:
    """
    Unified AI call — all tasks route through Claude.
    Returns: (response_text, provider_name)
    """
    if not claude_available:
        raise Exception(NO_KEY_MSG)

    json_mode = task_type == "structured"
    return call_claude_sync(prompt, system, json_mode=json_mode), "claude"


def get_ai_status() -> dict:
    """Return status of AI provider."""
    return {
        "claude": claude_available,
        "gemini": False,
        "claude_model": CLAUDE_MODEL if claude_available else None,
        "gemini_model": None,
        "providers_active": 1 if claude_available else 0,
        "provider": "anthropic",
        "no_key_message": None if claude_available else NO_KEY_MSG,
    }
