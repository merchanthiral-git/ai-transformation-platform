"""AI Provider Abstraction — Claude (Anthropic) + Gemini (Google)

Routes AI calls to the best provider based on task type:
- Claude Sonnet: agent reasoning, structured analysis, narrative writing
- Gemini Flash: bulk generation, JD creation, simple tasks
- Falls back to Gemini if Claude is unavailable
"""

import os
import json
import traceback
from dotenv import load_dotenv

load_dotenv()

# ── Claude (Anthropic) ──
anthropic_client = None
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "REPLACE_WITH_YOUR_KEY":
    try:
        from anthropic import Anthropic
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
        print("[AI] Claude client initialized (claude-sonnet-4-20250514)")
    except Exception as e:
        print(f"[AI] Claude init failed: {e}")

# ── Gemini (Google) ──
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
gemini_available = bool(GEMINI_API_KEY)
if gemini_available:
    print("[AI] Gemini API key configured")


def call_claude_sync(prompt: str, system: str = None, model: str = "claude-sonnet-4-20250514", max_tokens: int = 4096, json_mode: bool = False) -> str:
    """Call Claude API synchronously for complex reasoning and structured analysis."""
    if not anthropic_client:
        raise Exception("ANTHROPIC_API_KEY not configured")

    messages = [{"role": "user", "content": prompt}]
    system_prompt = system or "You are an expert workforce transformation consultant and organizational design specialist."

    if json_mode:
        system_prompt += "\n\nRespond ONLY with valid JSON. No markdown, no backticks, no explanation — just the JSON object."

    message = anthropic_client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )

    response_text = message.content[0].text

    if json_mode:
        response_text = response_text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

    return response_text


def call_claude_structured_sync(prompt: str, system: str = None, model: str = "claude-sonnet-4-20250514") -> dict:
    """Call Claude and parse the response as JSON."""
    response = call_claude_sync(prompt, system, model, json_mode=True)
    return json.loads(response)


def call_gemini_sync(prompt: str, system: str = None) -> str:
    """Call Gemini API for bulk/simple tasks."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gen_model = genai.GenerativeModel("gemini-2.0-flash")
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = gen_model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        raise Exception(f"Gemini call failed: {e}")


def call_ai_sync(prompt: str, task_type: str = "general", system: str = None) -> tuple[str, str]:
    """
    Smart router — picks the right model for the task.
    Returns: (response_text, provider_name)

    Task types:
    - 'agent': Claude (best reasoning, tool use)
    - 'analysis': Claude (structured analysis)
    - 'narrative': Claude (writing quality)
    - 'structured': Claude (JSON output)
    - 'bulk': Gemini (fast, cheap)
    - 'jd_generation': Gemini (bulk JDs)
    - 'general': Claude if available, else Gemini
    """
    claude_tasks = {"agent", "analysis", "narrative", "structured"}
    gemini_tasks = {"bulk", "jd_generation", "simple"}

    use_claude = task_type in claude_tasks and anthropic_client
    use_gemini = task_type in gemini_tasks

    if use_claude:
        try:
            return call_claude_sync(prompt, system, json_mode=(task_type == "structured")), "claude"
        except Exception as e:
            print(f"[AI] Claude failed, falling back to Gemini: {e}")
            if gemini_available:
                return call_gemini_sync(prompt, system), "gemini"
            raise
    elif use_gemini:
        if gemini_available:
            return call_gemini_sync(prompt, system), "gemini"
        elif anthropic_client:
            return call_claude_sync(prompt, system), "claude"
        raise Exception("No AI provider available")
    else:
        # General — prefer Claude, fallback to Gemini
        if anthropic_client:
            try:
                return call_claude_sync(prompt, system), "claude"
            except Exception:
                if gemini_available:
                    return call_gemini_sync(prompt, system), "gemini"
                raise
        elif gemini_available:
            return call_gemini_sync(prompt, system), "gemini"
        raise Exception("No AI provider available")


def get_ai_status() -> dict:
    """Return status of all AI providers."""
    return {
        "claude": anthropic_client is not None,
        "gemini": gemini_available,
        "claude_model": "claude-sonnet-4-20250514" if anthropic_client else None,
        "gemini_model": "gemini-2.0-flash" if gemini_available else None,
        "providers_active": sum([anthropic_client is not None, gemini_available]),
    }
