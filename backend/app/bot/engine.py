"""Bot engine — orchestrates analyzers into a coherent analysis flow.

Manages sessions, runs analysis actions, processes user commands,
and generates narrated findings.
"""

from __future__ import annotations

import re
import traceback

import pandas as pd

from app.store import store
from app.bot.context import BotContext
from app.bot import analyzers
from app.bot.narrator import Narrator
from app.bot.ai_narrator import ai_available, narrate_analysis, investigate_question
from app.bot.cross_reference import cross_reference_findings
from app.bot.confidence import calibrate_confidence, confidence_qualifier
from app.bot.memory import load_memory, update_memory_from_session, format_memory_for_prompt


# ── Action metadata (intro narration + description) ──

_ACTION_META: dict[str, dict] = {
    "profile_workforce": {
        "label": "Workforce Profile",
        "intro": "Let me look at the overall workforce composition — headcount, tenure, functions, and structure.",
        "transition": "Good foundation. Now let's look at the organizational hierarchy.",
    },
    "analyze_org_structure": {
        "label": "Org Structure",
        "intro": "Analyzing the reporting structure — management layers, span of control, and manager-to-IC ratios.",
        "transition": "Structure mapped. Let's assess how ready each function is for AI transformation.",
    },
    "assess_ai_readiness": {
        "label": "AI Readiness",
        "intro": "Scoring each function on technology, process, people, and data readiness for AI adoption.",
        "transition": "Readiness scored. Now let's identify specific automation and augmentation opportunities.",
    },
    "identify_opportunities": {
        "label": "AI Opportunities",
        "intro": "Scanning roles for automation potential — estimating hours freed, cost savings, and categorizing into Quick Wins vs Strategic Bets.",
        "transition": "Opportunities mapped. Let me check the skills landscape.",
    },
    "analyze_skills": {
        "label": "Skills Analysis",
        "intro": "Analyzing skills coverage, identifying gaps, and estimating reskilling effort.",
        "transition": "Skills assessed. Now let's understand change readiness across the workforce.",
    },
    "assess_change_readiness": {
        "label": "Change Readiness",
        "intro": "Segmenting the workforce by willingness and ability to adopt change — Champions, Training Needs, and High Risk groups.",
        "transition": "Readiness mapped. Let me build three transformation scenarios.",
    },
    "build_scenarios": {
        "label": "Scenario Modeling",
        "intro": "Building Conservative, Moderate, and Aggressive scenarios with FTE impact, investment, and ROI projections.",
        "transition": "Scenarios complete. Now let's create an implementation roadmap.",
    },
    "generate_roadmap": {
        "label": "Roadmap Generation",
        "intro": "Creating a phased transformation roadmap — Assess & Pilot → Quick Wins → Scale → Optimize.",
        "transition": "Roadmap built. Let me pull all findings together.",
    },
    "synthesize_findings": {
        "label": "Synthesis",
        "intro": "Synthesizing all findings — ranking by impact, identifying the Big 3 moves, and drafting an executive summary.",
        "transition": "Analysis complete.",
    },
}

# Mapping from action name to analyzer function
_ACTION_FUNCS = {
    "profile_workforce": lambda wf, wd, ctx: analyzers.profile_workforce(wf),
    "analyze_org_structure": lambda wf, wd, ctx: analyzers.analyze_org_structure(wf),
    "assess_ai_readiness": lambda wf, wd, ctx: analyzers.assess_ai_readiness(wf),
    "identify_opportunities": lambda wf, wd, ctx: analyzers.identify_opportunities(wf, wd if not wd.empty else None),
    "analyze_skills": lambda wf, wd, ctx: analyzers.analyze_skills(wf),
    "assess_change_readiness": lambda wf, wd, ctx: analyzers.assess_change_readiness(wf),
    "build_scenarios": lambda wf, wd, ctx: analyzers.build_scenarios(wf, ctx.analysis_results.get("identify_opportunities", {})),
    "generate_roadmap": lambda wf, wd, ctx: _run_roadmap(ctx),
    "synthesize_findings": lambda wf, wd, ctx: analyzers.synthesize_findings(_map_results_for_synthesis(ctx.analysis_results)),
}


def _map_results_for_synthesis(results: dict) -> dict:
    """Map engine action names to the keys synthesize_findings expects."""
    mapping = {
        "profile_workforce": "workforce_profile",
        "analyze_org_structure": "org_structure",
        "assess_ai_readiness": "ai_readiness",
        "identify_opportunities": "opportunities",
        "analyze_skills": "skills",
        "assess_change_readiness": "change_readiness",
    }
    mapped = {}
    for action_key, synth_key in mapping.items():
        if action_key in results:
            mapped[synth_key] = results[action_key]
    return mapped


def _run_roadmap(ctx: BotContext) -> dict:
    scenarios = ctx.analysis_results.get("build_scenarios", {}).get("scenarios", {})
    change = ctx.analysis_results.get("assess_change_readiness", {})
    scenario = scenarios.get("moderate", scenarios.get("conservative", {}))
    return analyzers.generate_roadmap(scenario, change)


# ── Finding extraction from analyzer results ──

_OBSERVATION_KEYS = [
    ("notable_observations", "general"),
    ("structural_issues", "structural"),
    ("readiness_insights", "general"),
    ("opportunity_highlights", "opportunity"),
    ("skill_priorities", "skills"),
    ("change_insights", "change"),
    ("roadmap_notes", "general"),
]


def _severity_from_text(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["critical", "risk", "bottleneck", "single point", "concentration"]):
        return "critical"
    if any(w in t for w in ["warning", "below", "over-manage", "under-manage", "flag", "gap"]):
        return "warning"
    return "info"


class BotEngine:
    def __init__(self):
        self.sessions: dict[str, BotContext] = {}
        self._project_sessions: dict[str, str] = {}  # project_id → session_id

    def get_session_for_project(self, project_id: str) -> BotContext | None:
        sid = self._project_sessions.get(project_id)
        return self.sessions.get(sid) if sid else None

    # ── Data loading ──

    def _load_data(self, model_id: str) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Load workforce and work_design DataFrames from the store."""
        try:
            bundle = store.get_bundle(model_id)
        except Exception:
            bundle = {}
        wf = bundle.get("workforce", pd.DataFrame())
        wd = bundle.get("work_design", pd.DataFrame())
        return wf, wd

    # ── Session management ──

    def start_session(self, project_id: str, model_id: str, mode: str = "guided") -> dict:
        # Return existing session if one exists for this project
        existing = self.get_session_for_project(project_id)
        if existing and existing.status != "error":
            return {"session_id": existing.session_id, "status": existing.status, "activity_log": existing.activity_log, "resumed": True}

        ctx = BotContext(project_id, model_id, mode)
        self.sessions[ctx.session_id] = ctx
        self._project_sessions[project_id] = ctx.session_id

        ctx.add_log("system", "status", f"Session started — project={project_id}, model={model_id}, mode={mode}")

        wf, _ = self._load_data(model_id)
        n = len(wf)
        company = model_id.replace("_", " ").split(":")[-1] if model_id else project_id

        # Load cross-session memory
        mem = load_memory(project_id)
        if mem["corrections"]:
            ctx.corrections = list(mem["corrections"])
        if mem["interaction_style"]["focus_areas"]:
            ctx.focus_area = mem["interaction_style"]["focus_areas"][0]

        # Greeting — returning vs new user
        if mem["total_sessions"] > 0:
            prev = mem.get("last_session_summary", "")
            ctx.add_log("bot", "narration",
                f"Welcome back to **{company}** ({n:,} employees). "
                f"This is session #{mem['total_sessions'] + 1}. "
                f"Last time: {prev}" if prev else f"Welcome back to **{company}**."
            )
            if mem["corrections"]:
                ctx.add_log("bot", "narration",
                    f"I'm applying {len(mem['corrections'])} corrections from previous sessions."
                )
        else:
            ctx.add_log("bot", "narration",
                f"Hello! I'm your AI Transformation Analyst. I'll analyze your workforce data for **{company}** "
                f"({n:,} employees) and identify opportunities for AI-driven transformation. "
                f"You can guide me at any point — just type a command."
            )

        if mode == "guided":
            ctx.add_log("bot", "narration",
                "Let's start by understanding your workforce composition. "
                "Type **go** when you're ready, or I'll wait for your signal."
            )
            ctx.status = "waiting_for_user"
        elif mode == "autopilot":
            ctx.add_log("bot", "narration", "Running in autopilot mode — I'll analyze everything and present my findings.")
            ctx.status = "running"
        else:
            ctx.add_log("bot", "narration", "I'm in question mode — ask me anything about your workforce data.")
            ctx.status = "waiting_for_user"

        return {"session_id": ctx.session_id, "status": ctx.status, "activity_log": ctx.activity_log}

    # ── Run a single action ──

    def run_action(self, session_id: str, action_name: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}
        if action_name in ctx.completed_actions:
            return {"error": f"{action_name} already completed", "results": ctx.analysis_results.get(action_name, {})}

        wf, wd = self._load_data(ctx.model_id)
        if wf.empty:
            ctx.add_log("bot", "narration", "No workforce data loaded for this model. Upload data first.")
            ctx.status = "error"
            return {"error": "No workforce data", "new_log_entries": ctx.activity_log[-1:]}

        meta = _ACTION_META.get(action_name, {"label": action_name, "intro": f"Running {action_name}...", "transition": ""})
        narrator = self._get_narrator(ctx)

        # Build data context for narrator templates
        company = ctx.model_id.replace("_", " ").split(":")[-1]
        narr_data = {
            "company_name": company,
            "total_employees": len(wf),
            "function_count": wf[wf.columns[wf.columns.str.contains("Function", case=False)]].iloc[:, 0].nunique() if any(wf.columns.str.contains("Function", case=False)) else 0,
            "family_count": wf[wf.columns[wf.columns.str.contains("Job Family", case=False)]].iloc[:, 0].nunique() if any(wf.columns.str.contains("Job Family", case=False)) else 0,
            "manager_count": 0, "layer_count": 0, "role_count": 0, "scenario_count": 3,
        }

        # Intro narration via narrator
        log_before = len(ctx.activity_log)
        for entry in narrator.narrate_intro(action_name, narr_data):
            ctx.activity_log.append(entry)
        ctx.status = "running"
        ctx.current_action = action_name
        ctx.current_action_progress = 0.0

        # Execute analyzer
        func = _ACTION_FUNCS.get(action_name)
        if not func:
            ctx.add_log("bot", "narration", f"Unknown action: {action_name}")
            ctx.status = "error"
            return {"error": f"Unknown action: {action_name}"}

        try:
            raw = func(wf, wd, ctx)
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[Bot] Error in {action_name}: {tb}")
            ctx.add_log("system", "status", f"Error in {action_name}: {str(e)}")
            ctx.status = "error"
            return {"error": str(e), "new_log_entries": ctx.activity_log[log_before:]}

        ctx.analysis_results[action_name] = raw
        ctx.current_action_progress = 1.0

        # Process findings with confidence calibration
        findings = self._process_findings(action_name, raw, ctx)
        for f in findings:
            f["confidence"] = calibrate_confidence(f, wf, ctx.corrections)
            qualifier = confidence_qualifier(f["confidence"])
            if qualifier and f["confidence"] < 0.5:
                ctx.add_log("bot", "narration",
                    f"⚠ Low confidence on this finding: {qualifier}{f['title'][:60]}",
                    {"confidence": f["confidence"]},
                )

        # AI narration (if available) or template narration
        if ai_available():
            ai_text = narrate_analysis(
                action_name, raw,
                context=f"Company: {company}, {len(wf)} employees",
                corrections=ctx.get_corrections_summary(),
                preferences=ctx.get_preferences_summary(),
                previous_findings="\n".join(f["title"] for f in ctx.findings[-10:]),
            )
            if ai_text:
                ctx.add_log("bot", "narration", ai_text)
            else:
                self._narrate_findings(findings, ctx)
        else:
            self._narrate_findings(findings, ctx)

        # Cross-reference with previous findings
        if len(ctx.findings) >= 3 and action_name != "synthesize_findings":
            xrefs = cross_reference_findings(ctx.findings, ctx.analysis_results)
            for xref in xrefs[:2]:
                ctx.add_log("bot", "narration", f"🔗 {xref}")

        # Mark completed
        ctx.completed_actions.append(action_name)
        ctx.current_action = None

        # Build guided-question data from results
        question_data = {
            "opportunity_count": len(raw.get("opportunities", [])),
            "total_value": raw.get("total_addressable_savings", 0),
            "gap_count": len(raw.get("top_skill_gaps", {})),
            "champion_pct": raw.get("overall_pct", {}).get("Champion", 0),
            "risk_pct": raw.get("overall_pct", {}).get("High Risk", 0),
            "recommended": raw.get("scenario_recommendation", "Moderate")[:20] if isinstance(raw.get("scenario_recommendation"), str) else "Moderate",
            "phase_count": len(raw.get("phases", [])),
            "timeline_months": raw.get("timeline_months", 18),
        }

        # Decide next status
        if ctx.mode == "guided":
            next_action = self._next_action(ctx)
            if next_action:
                q_entry = narrator.narrate_guided_question(action_name, question_data)
                ctx.activity_log.append(q_entry)
                ctx.status = "waiting_for_user"
            else:
                ctx.add_log("bot", "narration", "All analysis steps are complete! Type **summarize** for an executive overview.")
                ctx.status = "completed"
        elif ctx.mode == "autopilot":
            next_action = self._next_action(ctx)
            if next_action:
                t_entry = narrator.narrate_transition(next_action)
                ctx.activity_log.append(t_entry)
            ctx.status = "running"
        else:
            ctx.status = "waiting_for_user"

        new_entries = ctx.activity_log[log_before:]
        return {
            "results": raw,
            "new_log_entries": new_entries,
            "findings": findings,
        }

    # ── Autopilot ──

    def run_autopilot(self, session_id: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}

        log_before = len(ctx.activity_log)
        ctx.status = "running"

        for action in BotContext.ACTION_SEQUENCE:
            if action in ctx.completed_actions or action in ctx.skipped_actions:
                continue
            result = self.run_action(session_id, action)
            if "error" in result and result["error"] != f"{action} already completed":
                break
            # In autopilot the status stays "running" between actions
            ctx.status = "running"

        ctx.status = "completed"
        ctx.add_log("bot", "narration",
            "Autopilot analysis complete. I've analyzed your entire workforce. "
            "Type **summarize** for the executive overview, or ask me about any finding."
        )

        # Save cross-session memory
        update_memory_from_session(ctx.project_id, ctx.to_dict())

        new_entries = ctx.activity_log[log_before:]
        return {
            "new_log_entries": new_entries,
            "findings": [f for f in ctx.findings if f["user_status"] != "dismissed"],
            "status": ctx.status,
        }

    # ── Command processing ──

    def process_command(self, session_id: str, command_text: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}

        cmd = command_text.strip()
        ctx.add_log("user", "command", cmd)
        log_before = len(ctx.activity_log)

        cmd_lower = cmd.lower()

        # GO / CONTINUE / NEXT / YES
        if cmd_lower in ("go", "continue", "next", "yes", "ok", "proceed"):
            next_action = self._next_action(ctx)
            if next_action:
                result = self.run_action(session_id, next_action)
                new_entries = ctx.activity_log[log_before:]
                return {"response": f"Running {next_action}...", "new_log_entries": new_entries, "status": ctx.status}
            else:
                ctx.add_log("bot", "narration", "All analysis steps are complete.")
                ctx.status = "completed"
                return {"response": "All steps complete.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # SKIP
        if cmd_lower.startswith("skip"):
            target = cmd_lower.replace("skip", "").strip()
            next_action = self._next_action(ctx)
            if target:
                # Skip a specific action
                matched = [a for a in BotContext.ACTION_SEQUENCE if target in a]
                if matched:
                    ctx.skipped_actions.append(matched[0])
                    ctx.add_log("bot", "narration", f"Skipped **{_ACTION_META.get(matched[0], {}).get('label', matched[0])}**.")
                else:
                    ctx.add_log("bot", "narration", f"I don't recognise '{target}' as an action. Skipping the next step instead.")
                    if next_action:
                        ctx.skipped_actions.append(next_action)
            elif next_action:
                ctx.skipped_actions.append(next_action)
                ctx.add_log("bot", "narration", f"Skipped **{_ACTION_META.get(next_action, {}).get('label', next_action)}**.")

            # Show next
            after = self._next_action(ctx)
            if after:
                label = _ACTION_META.get(after, {}).get("label", after)
                ctx.add_log("bot", "question", f"Next: **{label}**. Type **go** to continue.")
                ctx.status = "waiting_for_user"
            else:
                ctx.add_log("bot", "narration", "All steps done or skipped.")
                ctx.status = "completed"
            return {"response": "Skipped.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # FOCUS ON [X]
        focus_match = re.match(r"focus\s+on\s+(.+)", cmd_lower)
        if focus_match:
            area = focus_match.group(1).strip()
            ctx.focus_area = area
            ctx.add_preference(f"Focus analysis on {area}")
            ctx.add_log("bot", "narration", f"Got it — I'll prioritize findings related to **{area}**.")
            return {"response": f"Focusing on {area}.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # STOP / PAUSE
        if cmd_lower in ("stop", "pause"):
            ctx.status = "paused"
            ctx.add_log("bot", "narration", "Paused. Type **go** or **resume** when you're ready to continue.")
            return {"response": "Paused.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # RESUME
        if cmd_lower in ("resume",):
            ctx.status = "waiting_for_user"
            ctx.add_log("bot", "narration", "Resumed. Type **go** to continue with the next step.")
            return {"response": "Resumed.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # CORRECTION
        correction_match = re.match(r"(?:that'?s wrong|actually|correction:?)\s*(.*)", cmd_lower)
        if correction_match:
            correction = correction_match.group(1).strip() or cmd
            ctx.add_correction(ctx.current_action or "general", correction)
            ack = self._get_narrator(ctx).narrate_user_acknowledgment("correction", correction)
            ctx.activity_log.append(ack)
            return {"response": "Correction recorded.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # SUMMARIZE / SUMMARY
        if cmd_lower in ("summarize", "summary", "what have you found", "findings"):
            if "synthesize_findings" not in ctx.completed_actions and ctx.analysis_results:
                self.run_action(session_id, "synthesize_findings")
            synthesis = ctx.analysis_results.get("synthesize_findings", {})
            summary = synthesis.get("executive_summary", "No analysis has been run yet. Type **go** to start.")
            ctx.add_log("bot", "narration", f"**Executive Summary:** {summary}")
            big3 = synthesis.get("big_3", [])
            if big3:
                lines = [f"{i+1}. {f['text']}" for i, f in enumerate(big3)]
                ctx.add_log("bot", "narration", "**Top 3 Priorities:**\n" + "\n".join(lines))
            # Save memory on summary
            update_memory_from_session(ctx.project_id, ctx.to_dict())
            return {"response": summary, "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # GO DEEPER ON [X] / TELL ME MORE ABOUT [X]
        deeper_match = re.match(r"(?:go deeper on|tell me more about|more on|detail|what about|why)\s+(.+)", cmd_lower)
        if deeper_match:
            topic = deeper_match.group(1).strip()
            relevant = [f for f in ctx.findings if topic in f["title"].lower() or topic in f["detail"].lower() or (f.get("function") and topic in f["function"].lower())]

            # AI investigation if available
            if ai_available() and ctx.analysis_results:
                import json
                data_summary = json.dumps({k: str(v)[:500] for k, v in ctx.analysis_results.items()}, default=str)[:3000]
                findings_summary = "\n".join(f["title"] for f in ctx.findings[-15:])
                answer = investigate_question(cmd, data_summary, findings_summary, ctx.get_corrections_summary())
                if answer:
                    ctx.add_log("bot", "narration", answer)
                    return {"response": f"Investigation on {topic}.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

            if relevant:
                for f in relevant[:3]:
                    conf = f.get("confidence", 0.8)
                    qualifier = confidence_qualifier(conf)
                    ctx.add_log("bot", "narration",
                        f"**{f['title']}** ({f['severity']}, {int(conf*100)}% confidence): {qualifier}{f['detail']}"
                        + (f" Metric: {f['metric_value']}, Benchmark: {f['benchmark_value']}" if f.get("metric_value") else "")
                    )
            else:
                ctx.add_log("bot", "narration", f"I don't have specific findings on '{topic}' yet. Run more analysis steps first.")
            return {"response": f"Details on {topic}.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # RESTART
        if cmd_lower in ("restart", "start over"):
            ctx.findings.clear()
            ctx.completed_actions.clear()
            ctx.skipped_actions.clear()
            ctx.analysis_results.clear()
            ctx.current_action = None
            ctx.status = "waiting_for_user"
            ctx.add_log("bot", "narration", "Restarted. All previous analysis cleared. Type **go** to begin again.")
            return {"response": "Restarted.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # SHOW ME [X]
        show_match = re.match(r"show\s+(?:me\s+)?(.+)", cmd_lower)
        if show_match:
            topic = show_match.group(1).strip()
            ctx.add_log("bot", "visualization", f"Generating view for: {topic}", {"chart_type": "auto", "data_reference": topic})
            return {"response": f"Showing {topic}.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

        # DEFAULT: treat as a question
        ctx.add_log("bot", "narration",
            f"I'm not sure how to handle '{cmd}'. Try: **go**, **skip**, **focus on [topic]**, "
            "**summarize**, **tell me more about [X]**, or **pause**."
        )
        return {"response": "Command not recognised.", "new_log_entries": ctx.activity_log[log_before:], "status": ctx.status}

    # ── Helpers ──

    def _next_action(self, ctx: BotContext) -> str | None:
        for a in BotContext.ACTION_SEQUENCE:
            if a not in ctx.completed_actions and a not in ctx.skipped_actions:
                return a
        return None

    def _process_findings(self, action_name: str, raw: dict, ctx: BotContext) -> list[dict]:
        findings: list[dict] = []
        for key, default_cat in _OBSERVATION_KEYS:
            texts = raw.get(key, [])
            if isinstance(texts, list):
                for text in texts:
                    if isinstance(text, dict):
                        text_str = text.get("text", str(text))
                    else:
                        text_str = str(text)
                    sev = _severity_from_text(text_str)
                    cat = default_cat
                    # Override category for specific actions
                    if action_name == "analyze_org_structure":
                        cat = "structural"
                    elif action_name in ("assess_ai_readiness", "identify_opportunities"):
                        cat = "opportunity"
                    elif action_name == "analyze_skills":
                        cat = "skills"
                    elif action_name == "assess_change_readiness":
                        cat = "change"

                    # Check against corrections
                    skip = False
                    for corr in ctx.corrections:
                        if corr["original"].lower() in text_str.lower():
                            skip = True
                            break
                    if skip:
                        continue

                    f = ctx.add_finding(
                        category=cat,
                        severity=sev,
                        title=text_str[:80],
                        detail=text_str,
                        confidence=raw.get("confidence", 0.8) if isinstance(raw.get("confidence"), (int, float)) else 0.8,
                    )
                    findings.append(f)
        return findings

    def _get_narrator(self, ctx: BotContext) -> Narrator:
        return Narrator(speed=ctx.speed)

    def _narrate_findings(self, findings: list[dict], ctx: BotContext):
        if not findings:
            ctx.add_log("bot", "narration", "No notable issues found — looking good so far.")
            return

        narrator = self._get_narrator(ctx)
        action = ctx.completed_actions[-1] if ctx.completed_actions else "general"

        critical = [f for f in findings if f["severity"] == "critical"]
        warnings = [f for f in findings if f["severity"] == "warning"]
        infos = [f for f in findings if f["severity"] == "info"]

        for f in critical[:2]:
            entry = narrator.narrate_finding(action, "critical", {"text": f["detail"], "severity": "critical", "title": f["title"]})
            ctx.activity_log.append(entry)

        for f in warnings[:2]:
            entry = narrator.narrate_finding(action, "warning", {"text": f["title"], "severity": "warning", "title": f["title"]})
            ctx.activity_log.append(entry)

        if ctx.speed != "fast":
            for f in infos[:2]:
                entry = narrator.narrate_finding(action, "info", {"text": f["title"], "severity": "info", "title": f["title"]})
                ctx.activity_log.append(entry)

        total = len(findings)
        shown = min(total, 4 + (2 if ctx.speed == "slow" else 0))
        if total > shown:
            ctx.add_log("bot", "narration", f"...plus {total - shown} more findings. Type **tell me more** for details.")

    # ── Status helpers ──

    def get_status(self, session_id: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}
        return ctx.to_dict()

    def get_findings(self, session_id: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}
        active = [f for f in ctx.findings if f["user_status"] != "dismissed"]
        synthesis = ctx.analysis_results.get("synthesize_findings", {})
        return {
            "findings": active,
            "summary": synthesis.get("executive_summary", ""),
            "count": len(active),
        }

    def pause(self, session_id: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}
        ctx.status = "paused"
        ctx.add_log("system", "status", "Session paused.")
        return {"status": "paused"}

    def resume(self, session_id: str) -> dict:
        ctx = self.sessions.get(session_id)
        if not ctx:
            return {"error": "Session not found"}
        ctx.status = "waiting_for_user"
        ctx.add_log("system", "status", "Session resumed.")
        return {"status": "waiting_for_user"}


# Singleton
bot_engine = BotEngine()
