"""Platform Concierge — Assessment, Roadmap Generator & Natural Language Navigator."""
import json, uuid, re
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException
from app.shared import _safe

router = APIRouter(prefix="/api", tags=["concierge"])

def _id(): return str(uuid.uuid4())[:12]
def _now(): return datetime.utcnow().isoformat()

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "concierge"
_DATA_DIR.mkdir(parents=True, exist_ok=True)

def _load(f, d=None): p=_DATA_DIR/f; return json.loads(p.read_text()) if p.exists() else (d if d is not None else {})
def _save(f, d): (_DATA_DIR/f).write_text(json.dumps(d, indent=2, default=str))

_assessments = _load("assessments.json", {})
_roadmaps = _load("roadmaps.json", {})
_progress = _load("progress.json", {})

# ═══════════════════════════════════════════════════════════
# Tool Registry
# ═══════════════════════════════════════════════════════════

TOOL_REGISTRY = [
    {"id": "dashboard", "name": "Executive Dashboard", "page": "dashboard", "category": "overview",
     "solves": ["I need a snapshot of our workforce", "I don't know our baseline"],
     "requires": "uploaded workforce data", "time_weeks": 0, "time_label": "instant",
     "prerequisites": [], "dimensions": ["workforce_clarity"]},

    {"id": "ai_scan", "name": "AI Scan / AI Prioritization", "page": "scan", "category": "diagnose",
     "solves": ["Which roles are most impacted by AI", "Where should we focus AI investment"],
     "requires": "jobs + tasks data", "time_weeks": 0.3, "time_label": "1-2 days",
     "prerequisites": [], "dimensions": ["ai_readiness"]},

    {"id": "skills_gap", "name": "Skills Gap Analysis", "page": "skills", "category": "diagnose",
     "solves": ["We don't know what skills we're missing", "We can't quantify our talent gaps"],
     "requires": "skills inventory + target role profiles", "time_weeks": 3, "time_label": "2-3 weeks",
     "prerequisites": ["skills_mapper"], "dimensions": ["skills_capabilities"]},

    {"id": "org_diagnostics", "name": "Org Diagnostics", "page": "orghealth", "category": "diagnose",
     "solves": ["Our org structure doesn't support our strategy", "Span of control issues"],
     "requires": "org structure data", "time_weeks": 0.3, "time_label": "1-2 days",
     "prerequisites": [], "dimensions": ["org_structure"]},

    {"id": "data_quality", "name": "Data Quality", "page": "scan", "category": "diagnose",
     "solves": ["I'm not sure our data is reliable", "We have data gaps"],
     "requires": "any uploaded data", "time_weeks": 0, "time_label": "instant",
     "prerequisites": [], "dimensions": ["workforce_clarity"]},

    {"id": "skills_library", "name": "Skills Library (O*NET)", "page": "skillsmap", "category": "talent",
     "solves": ["We don't have a skills taxonomy", "We need market-standard skill definitions"],
     "requires": "nothing", "time_weeks": 0.2, "time_label": "1-2 hours",
     "prerequisites": [], "dimensions": ["skills_capabilities"]},

    {"id": "job_matcher", "name": "Job Matcher", "page": "skillsmap", "category": "talent",
     "solves": ["Our job titles don't align with market standards", "We need to benchmark our roles"],
     "requires": "uploaded job data", "time_weeks": 0.3, "time_label": "1-2 days",
     "prerequisites": [], "dimensions": ["skills_capabilities"]},

    {"id": "skills_mapper", "name": "Skills Mapper", "page": "skillsmap", "category": "talent",
     "solves": ["We need to define skills per role", "Our skills definitions are inconsistent"],
     "requires": "confirmed job matches", "time_weeks": 3, "time_label": "2-4 weeks",
     "prerequisites": ["job_matcher"], "dimensions": ["skills_capabilities"]},

    {"id": "job_arch", "name": "Job Architecture Browser", "page": "jobarch", "category": "talent",
     "solves": ["We need to build our job architecture", "Job families aren't defined"],
     "requires": "nothing for browsing", "time_weeks": 4, "time_label": "2-6 weeks",
     "prerequisites": [], "dimensions": ["workforce_clarity", "skills_capabilities"]},

    {"id": "adjacency_map", "name": "Skills Adjacency Map", "page": "skills", "category": "talent",
     "solves": ["We need internal mobility pathways", "Which roles can transition to which"],
     "requires": "completed skills mapping", "time_weeks": 0.3, "time_label": "1-2 days",
     "prerequisites": ["skills_mapper"], "dimensions": ["talent_strategy"]},

    {"id": "bbba", "name": "Build/Buy/Borrow/Automate", "page": "bbba", "category": "talent",
     "solves": ["Should we train, hire, contract, or automate for each gap"],
     "requires": "gap analysis results", "time_weeks": 2, "time_label": "1-2 weeks",
     "prerequisites": ["skills_gap"], "dimensions": ["talent_strategy"]},

    {"id": "headcount", "name": "Headcount Planning", "page": "headcount", "category": "talent",
     "solves": ["How many people do we need", "What's the right size"],
     "requires": "redesigned roles", "time_weeks": 2, "time_label": "1-2 weeks",
     "prerequisites": ["work_design"], "dimensions": ["talent_strategy"]},

    {"id": "reskilling", "name": "Reskilling Pathways", "page": "reskill", "category": "talent",
     "solves": ["How do we reskill our workforce", "What learning journeys do people need"],
     "requires": "skills gaps with Build disposition", "time_weeks": 3, "time_label": "2-4 weeks",
     "prerequisites": ["bbba"], "dimensions": ["talent_strategy"]},

    {"id": "change_readiness", "name": "Change Readiness", "page": "changeready", "category": "talent",
     "solves": ["Will our people accept this change", "Where is resistance highest"],
     "requires": "readiness assessment data", "time_weeks": 2.5, "time_label": "2-3 weeks",
     "prerequisites": [], "dimensions": ["change_adoption"]},

    {"id": "work_design", "name": "Work Design Lab", "page": "design", "category": "design",
     "solves": ["We need to redesign roles for AI", "Which tasks should be automated"],
     "requires": "jobs + tasks data", "time_weeks": 6, "time_label": "4-8 weeks",
     "prerequisites": [], "dimensions": ["role_work_design"]},

    {"id": "operating_model", "name": "Operating Model", "page": "opmodel", "category": "design",
     "solves": ["Our operating model needs to change"],
     "requires": "org structure", "time_weeks": 3, "time_label": "2-4 weeks",
     "prerequisites": [], "dimensions": ["org_structure"]},

    {"id": "org_design", "name": "Org Design Studio", "page": "build", "category": "design",
     "solves": ["We need to restructure", "Span of control optimization"],
     "requires": "org chart data", "time_weeks": 3, "time_label": "2-4 weeks",
     "prerequisites": [], "dimensions": ["org_structure"]},

    {"id": "scenario_model", "name": "Scenario Modeling", "page": "simulate", "category": "simulate",
     "solves": ["What happens if we automate 30% vs 60%", "What's the ROI"],
     "requires": "redesigned roles + cost data", "time_weeks": 1.5, "time_label": "1-2 weeks",
     "prerequisites": ["work_design"], "dimensions": ["ai_readiness", "executive_alignment"]},

    {"id": "change_roadmap", "name": "Change Roadmap", "page": "plan", "category": "mobilize",
     "solves": ["We need an implementation plan"],
     "requires": "design decisions", "time_weeks": 1.5, "time_label": "1-2 weeks",
     "prerequisites": ["scenario_model"], "dimensions": ["change_adoption"]},

    {"id": "exec_narrative", "name": "Executive Narrative", "page": "story", "category": "mobilize",
     "solves": ["I need to present this to the board"],
     "requires": "completed analysis", "time_weeks": 0.5, "time_label": "2-3 days",
     "prerequisites": [], "dimensions": ["executive_alignment"]},

    {"id": "exports", "name": "All Exports", "page": "export", "category": "export",
     "solves": ["I need to share this externally"],
     "requires": "completed modules", "time_weeks": 0, "time_label": "instant",
     "prerequisites": [], "dimensions": []},
]

DIMENSIONS = [
    {"id": "workforce_clarity", "name": "Workforce Clarity", "description": "Do you have a clear picture of your workforce?"},
    {"id": "skills_capabilities", "name": "Skills & Capabilities", "description": "Do you know what skills your people have and need?"},
    {"id": "ai_readiness", "name": "AI Readiness & Impact", "description": "Do you understand how AI will affect your workforce?"},
    {"id": "role_work_design", "name": "Role & Work Design", "description": "Are your roles designed for how work will be done?"},
    {"id": "talent_strategy", "name": "Talent Strategy", "description": "Do you have a plan for closing talent gaps?"},
    {"id": "org_structure", "name": "Organizational Structure", "description": "Is your org structure optimized?"},
    {"id": "change_adoption", "name": "Change & Adoption", "description": "Can your organization absorb the changes?"},
    {"id": "executive_alignment", "name": "Executive Alignment", "description": "Does leadership have a shared view?"},
]

# Assessment questions — 25 total (3 per dimension + 1 extra)
ASSESSMENT_QUESTIONS = {
    "workforce_clarity": [
        {"id": "wc1", "text": "We have accurate, up-to-date data on our workforce including headcount, roles, reporting structure, and costs.", "depth": "quick"},
        {"id": "wc2", "text": "Our job titles and job families are clearly defined and consistently applied across the organization.", "depth": "standard"},
        {"id": "wc3", "text": "We can quickly answer questions like 'how many people do X' without manual data gathering.", "depth": "comprehensive"},
    ],
    "skills_capabilities": [
        {"id": "sc1", "text": "We have a defined skills taxonomy that is consistently used across the organization.", "depth": "quick"},
        {"id": "sc2", "text": "We can identify which skills our workforce currently has and which we'll need in 12-24 months.", "depth": "standard"},
        {"id": "sc3", "text": "Our skills data is connected to business decisions about hiring, training, and workforce planning.", "depth": "comprehensive"},
    ],
    "ai_readiness": [
        {"id": "ar1", "text": "We have assessed which roles and tasks are most likely to be affected by AI.", "depth": "quick"},
        {"id": "ar2", "text": "Our leadership team has a shared, specific view of how AI will change our workforce in the next 2-3 years.", "depth": "standard"},
        {"id": "ar3", "text": "We have quantified the potential productivity gains, cost savings, or headcount implications of AI adoption.", "depth": "comprehensive"},
    ],
    "role_work_design": [
        {"id": "rw1", "text": "We have examined our roles at the task level to understand which work can be automated, augmented, or should remain human.", "depth": "quick"},
        {"id": "rw2", "text": "Our job descriptions accurately reflect the work people actually do today.", "depth": "standard"},
        {"id": "rw3", "text": "We have a clear vision of what our roles will look like after AI is adopted.", "depth": "comprehensive"},
    ],
    "talent_strategy": [
        {"id": "ts1", "text": "We have a clear plan for whether to build, buy, borrow, or automate for each critical skill gap.", "depth": "quick"},
        {"id": "ts2", "text": "We have active reskilling programs connected to specific future role requirements.", "depth": "standard"},
        {"id": "ts3", "text": "We understand internal mobility opportunities — which current roles can transition to which future roles.", "depth": "comprehensive"},
    ],
    "org_structure": [
        {"id": "os1", "text": "Our organizational structure supports our strategic priorities without unnecessary complexity.", "depth": "quick"},
        {"id": "os2", "text": "Spans of control are appropriate — managers aren't overloaded or underutilized.", "depth": "standard"},
        {"id": "os3", "text": "We have evaluated whether our current operating model will work for the post-AI organization.", "depth": "comprehensive"},
    ],
    "change_adoption": [
        {"id": "ca1", "text": "Our workforce is generally open to adopting new technologies and ways of working.", "depth": "quick"},
        {"id": "ca2", "text": "We have a structured change management approach for major workforce transformations.", "depth": "standard"},
        {"id": "ca3", "text": "Managers are equipped to lead their teams through significant operational changes.", "depth": "comprehensive"},
    ],
    "executive_alignment": [
        {"id": "ea1", "text": "Our executive team has a shared understanding of the workforce transformation needed.", "depth": "standard"},
        {"id": "ea2", "text": "We have a compelling business case that quantifies the value of workforce transformation.", "depth": "comprehensive"},
        {"id": "ea3", "text": "There is clear executive sponsorship and accountability for the transformation program.", "depth": "comprehensive"},
    ],
}

# ═══════════════════════════════════════════════════════════
# Tool Registry Endpoint
# ═══════════════════════════════════════════════════════════

@router.get("/concierge/tools")
def get_tools():
    return _safe({"tools": TOOL_REGISTRY, "dimensions": DIMENSIONS})

# ═══════════════════════════════════════════════════════════
# Assessment
# ═══════════════════════════════════════════════════════════

@router.get("/concierge/assessment/questions")
def get_questions(depth: str = "comprehensive"):
    # Filter questions by depth
    depths = {"quick": ["quick"], "standard": ["quick", "standard"], "comprehensive": ["quick", "standard", "comprehensive"]}
    allowed = depths.get(depth, depths["comprehensive"])
    questions = []
    for dim_id, qs in ASSESSMENT_QUESTIONS.items():
        dim = next((d for d in DIMENSIONS if d["id"] == dim_id), None)
        for q in qs:
            if q["depth"] in allowed:
                questions.append({**q, "dimension": dim_id, "dimension_name": dim["name"] if dim else dim_id})
    return _safe({"questions": questions, "total": len(questions), "depth": depth})

@router.post("/concierge/assessment")
async def submit_assessment(request: Request):
    body = await request.json()
    project_id = body.get("project_id", "default")
    responses = body.get("responses", [])
    depth = body.get("depth", "comprehensive")

    # Calculate dimension scores
    dim_scores = {}
    for dim in DIMENSIONS:
        dim_responses = [r for r in responses if r.get("dimension") == dim["id"]]
        if dim_responses:
            dim_scores[dim["id"]] = round(sum(r.get("score", 3) for r in dim_responses) / len(dim_responses), 1)
        else:
            dim_scores[dim["id"]] = 3.0  # neutral default

    assessment = {
        "id": _id(), "project_id": project_id, "depth": depth,
        "completed_at": _now(), "responses": responses,
        "dimension_scores": dim_scores,
    }
    _assessments[project_id] = assessment
    _save("assessments.json", _assessments)
    return _safe(assessment)

@router.get("/concierge/assessment/{project_id}")
def get_assessment(project_id: str):
    return _safe(_assessments.get(project_id, {"dimension_scores": {}}))

# ═══════════════════════════════════════════════════════════
# Roadmap Generator
# ═══════════════════════════════════════════════════════════

@router.post("/concierge/generate-roadmap")
async def generate_roadmap(request: Request):
    body = await request.json()
    project_id = body.get("project_id", "default")
    dim_scores = body.get("dimension_scores", {})
    follow_up = body.get("follow_up_context", "")

    # Build registry context for AI
    registry_text = "\n".join(
        f"- {t['name']} ({t['page']}): Solves: {', '.join(t['solves'])}. Time: {t['time_label']}. "
        f"Prerequisites: {', '.join(t['prerequisites']) or 'none'}. Dimensions: {', '.join(t['dimensions'])}"
        for t in TOOL_REGISTRY
    )
    scores_text = "\n".join(f"- {d['name']}: {dim_scores.get(d['id'], 3.0)}/5.0" for d in DIMENSIONS)

    try:
        from app.ai_providers import call_claude_sync
        prompt = f"""A client completed an organizational assessment with these scores (1-5 scale, lower = more urgent):

{scores_text}

{f'Follow-up context: {follow_up}' if follow_up else ''}

Using ONLY these tools, create a sequenced transformation roadmap:

{registry_text}

RULES: Start with most critical gaps (lowest scores). Respect prerequisites. Group into 3-5 phases. Include realistic time estimates with 30% buffer. Flag parallel-eligible phases. Include quick wins (< 1 week). Include total program duration.

Return ONLY valid JSON:
{{"executive_summary": "2-3 sentences", "total_duration_weeks": number, "quick_wins": [{{"tool": "name", "page": "page", "why": "reason", "time": "duration"}}], "phases": [{{"phase_number": 1, "title": "title", "objective": "what this achieves", "duration_weeks": number, "parallel_eligible": boolean, "tools": [{{"tool": "name", "page": "page", "why": "reason", "time_estimate": "X weeks", "deliverable": "what user gets"}}], "milestone": "success criteria"}}]}}"""

        raw = call_claude_sync(
            prompt,
            system="You are a senior workforce transformation consultant. Create actionable, sequenced roadmaps.",
            max_tokens=3000,
        )
        clean = raw.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip() if "```" in clean else clean
            if "```" in clean:
                clean = clean.split("```")[0].strip()
        roadmap = json.loads(clean)
    except Exception:
        # Deterministic fallback roadmap
        sorted_dims = sorted(dim_scores.items(), key=lambda x: x[1])
        phases = []
        phase_tools = []
        for dim_id, score in sorted_dims:
            if score <= 3.0:
                matching = [t for t in TOOL_REGISTRY if dim_id in t["dimensions"]]
                for t in matching[:2]:
                    if t["id"] not in [pt["tool_id"] for pt in phase_tools]:
                        phase_tools.append({
                            "tool_id": t["id"], "tool": t["name"], "page": t["page"],
                            "why": f"Your {dim_id.replace('_', ' ')} score is {score}/5",
                            "time_estimate": t["time_label"],
                            "deliverable": f"Completed {t['name']}",
                        })

        # Split into phases of 3-4 tools
        for i in range(0, len(phase_tools), 3):
            batch = phase_tools[i:i + 3]
            batch_names = [b["tool"] for b in batch]
            max_weeks = max(
                (t.get("time_weeks", 2) for t in TOOL_REGISTRY if t["name"] in batch_names),
                default=2,
            )
            phases.append({
                "phase_number": len(phases) + 1,
                "title": f"Phase {len(phases) + 1}",
                "objective": "Address critical gaps",
                "duration_weeks": max_weeks,
                "parallel_eligible": False,
                "tools": batch,
                "milestone": "Phase deliverables complete",
            })

        quick_wins = [
            {"tool": t["name"], "page": t["page"], "why": "Quick baseline", "time": t["time_label"]}
            for t in TOOL_REGISTRY
            if t["time_weeks"] <= 0.3 and any(dim_scores.get(d, 5) <= 3 for d in t["dimensions"])
        ][:3]

        roadmap = {
            "executive_summary": f"Based on your assessment, we identified {len(sorted_dims)} areas needing attention. The recommended program spans {len(phases)} phases.",
            "total_duration_weeks": sum(p.get("duration_weeks", 2) for p in phases),
            "quick_wins": quick_wins,
            "phases": phases,
        }

    roadmap["id"] = _id()
    roadmap["project_id"] = project_id
    roadmap["generated_at"] = _now()
    _roadmaps[project_id] = roadmap
    _save("roadmaps.json", _roadmaps)
    return _safe(roadmap)

@router.get("/concierge/roadmap/{project_id}")
def get_roadmap(project_id: str):
    return _safe(_roadmaps.get(project_id, {}))

@router.put("/concierge/roadmap/{project_id}")
async def update_roadmap(project_id: str, request: Request):
    if project_id not in _roadmaps:
        raise HTTPException(404, "Roadmap not found")
    body = await request.json()
    _roadmaps[project_id].update({k: v for k, v in body.items() if k not in ("id", "project_id")})
    _save("roadmaps.json", _roadmaps)
    return _safe(_roadmaps[project_id])

# ═══════════════════════════════════════════════════════════
# Ask Mode
# ═══════════════════════════════════════════════════════════

@router.post("/concierge/ask")
async def ask(request: Request):
    body = await request.json()
    message = body.get("message", "")
    current_page = body.get("current_page", "")
    scores = body.get("assessment_scores", {})
    completed = body.get("completed_tools", [])

    registry_text = "\n".join(
        f"- {t['name']} (page: {t['page']}): {', '.join(t['solves'])}"
        for t in TOOL_REGISTRY
    )
    scores_text = "\n".join(f"- {k}: {v}/5" for k, v in scores.items()) if scores else "Not yet assessed"

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            f"""User message: {message}

Current page: {current_page}
Assessment scores: {scores_text}
Completed tools: {', '.join(completed) or 'None yet'}

TOOL REGISTRY:
{registry_text}

Respond with specific tool recommendations. Include [Navigate to ToolName →] actions. Be concise (this is a floating panel). If unsure, ask ONE clarifying question.""",
            system="You are the AI Transformation Platform concierge. Help users navigate to the right tools. Always recommend specific tools by name and page. Include time estimates. Be concise.",
            max_tokens=1024,
        )

        # Extract navigation actions
        nav_actions = []
        for match in re.finditer(r'\[Navigate to (.+?) →\]', raw):
            tool_name = match.group(1).strip()
            tool = next(
                (t for t in TOOL_REGISTRY
                 if t["name"].lower() in tool_name.lower() or tool_name.lower() in t["name"].lower()),
                None,
            )
            if tool:
                nav_actions.append({"tool": tool["name"], "page": tool["page"]})

        return _safe({"response": raw, "navigation_actions": nav_actions})
    except Exception as e:
        return _safe({
            "response": (
                "I can help you navigate the platform. Try asking about specific challenges like "
                "'How do I assess AI impact?' or 'Where do I start with skills mapping?'\n\n"
                f"Error: {str(e)[:80]}"
            ),
            "navigation_actions": [],
        })

# ═══════════════════════════════════════════════════════════
# Progress Tracking
# ═══════════════════════════════════════════════════════════

@router.get("/concierge/progress/{project_id}")
def get_progress(project_id: str):
    proj_progress = _progress.get(project_id, {})
    tools_status = {}
    for t in TOOL_REGISTRY:
        tools_status[t["id"]] = proj_progress.get(t["id"], "not_started")
    completed = sum(1 for s in tools_status.values() if s == "complete")
    in_prog = sum(1 for s in tools_status.values() if s == "in_progress")
    total = len(TOOL_REGISTRY)
    return _safe({
        "tools": tools_status,
        "completed": completed,
        "in_progress": in_prog,
        "not_started": total - completed - in_prog,
        "total": total,
        "overall_percent": round(completed / max(total, 1) * 100),
    })

@router.put("/concierge/progress/{project_id}/tool/{tool_id}")
async def update_tool_progress(project_id: str, tool_id: str, request: Request):
    body = await request.json()
    if project_id not in _progress:
        _progress[project_id] = {}
    _progress[project_id][tool_id] = body.get("status", "not_started")
    _save("progress.json", _progress)
    return _safe({"tool_id": tool_id, "status": _progress[project_id][tool_id]})
