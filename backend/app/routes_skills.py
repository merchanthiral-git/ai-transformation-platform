"""Skills Engine API routes."""
from fastapi import APIRouter, HTTPException, Query, Request
from app.shared import _safe
from app.skills_store import skills_store

router = APIRouter(prefix="/api", tags=["skills"])

# ── Taxonomy (must be before /skills/{skill_id}) ──
@router.get("/skills/taxonomy")
def get_taxonomy():
    return _safe({"taxonomy": skills_store.get_taxonomy()})

@router.post("/skills/taxonomy")
async def create_taxonomy_node(request: Request):
    body = await request.json()
    node = skills_store.create_taxonomy_node(body)
    return _safe(node)

@router.put("/skills/taxonomy/{node_id}")
async def update_taxonomy_node(node_id: str, request: Request):
    body = await request.json()
    node = skills_store.update_taxonomy_node(node_id, body)
    if not node:
        raise HTTPException(404, "Taxonomy node not found")
    return _safe(node)

# ── Mappings (must be before /skills/{skill_id}) ──
@router.get("/skills/mappings")
def list_mappings(source_type: str = "All", skill_id: str = None, source_id: str = None):
    return _safe({"mappings": skills_store.get_mappings(source_type, skill_id, source_id)})

@router.post("/skills/mappings")
async def create_mapping(request: Request):
    body = await request.json()
    mapping = skills_store.create_mapping(body)
    return _safe(mapping)

@router.post("/skills/mappings/bulk")
async def bulk_create_mappings(request: Request):
    body = await request.json()
    mappings = skills_store.bulk_create_mappings(body.get("mappings", []))
    return _safe({"created": len(mappings), "mappings": mappings})

@router.get("/skills/mappings/job/{job_id}")
def get_job_mappings(job_id: str):
    mappings = skills_store.get_mappings(source_type="job", source_id=job_id)
    enriched = []
    for m in mappings:
        skill = skills_store.get_skill(m.get("skill_id"))
        enriched.append({**m, "skill": skill})
    return _safe({"job_id": job_id, "mappings": enriched})

@router.get("/skills/mappings/employee/{emp_id}")
def get_employee_mappings(emp_id: str):
    mappings = skills_store.get_mappings(source_type="employee", source_id=emp_id)
    enriched = []
    for m in mappings:
        skill = skills_store.get_skill(m.get("skill_id"))
        enriched.append({**m, "skill": skill})
    return _safe({"employee_id": emp_id, "mappings": enriched})

# ── Graph (must be before /skills/{skill_id}) ──
@router.get("/skills/graph")
def get_graph(category: str = "All"):
    return _safe(skills_store.get_graph(category))

@router.get("/skills/graph/adjacency/{skill_id}")
def get_adjacency(skill_id: str):
    return _safe({"skill_id": skill_id, "adjacencies": skills_store.get_adjacency(skill_id)})

@router.get("/skills/graph/clusters")
def get_clusters():
    return _safe(skills_store.get_clusters())

# ── Intelligence (must be before /skills/{skill_id}) ──
@router.get("/skills/gaps")
def get_gaps(scope: str = "org", scope_id: str = None):
    return _safe(skills_store.compute_gaps(scope, scope_id))

@router.get("/skills/gaps/role/{job_id}")
def get_role_gaps(job_id: str):
    return _safe(skills_store.compute_gaps("role", job_id))

@router.get("/skills/demand-forecast")
def get_demand_forecast(horizon: int = 12):
    return _safe(skills_store.compute_demand_forecast(horizon))

@router.get("/skills/automation-risk")
def get_automation_risk():
    return _safe({"skills": skills_store.compute_automation_risk()})

# ── Events (must be before /skills/{skill_id}) ──
@router.get("/skills/events")
def get_events(limit: int = 50):
    return _safe({"events": skills_store.events_log[:limit]})

@router.post("/skills/events/task-updated")
async def on_task_updated(request: Request):
    body = await request.json()
    event = skills_store.log_event("task_updated", "Work Design Lab", body.get("affected_skills", []), body.get("changes", ""))
    return _safe(event)

@router.post("/skills/events/job-releveled")
async def on_job_releveled(request: Request):
    body = await request.json()
    event = skills_store.log_event("job_releveled", "Job Architecture", body.get("affected_skills", []), body.get("changes", ""))
    return _safe(event)

@router.post("/skills/events/org-restructured")
async def on_org_restructured(request: Request):
    body = await request.json()
    event = skills_store.log_event("org_restructured", "Org Design", body.get("affected_skills", []), body.get("changes", ""))
    return _safe(event)

# ── AI Inference (must be before /skills/{skill_id}) ──
@router.post("/skills/infer")
async def infer_skills(request: Request):
    body = await request.json()
    job_title = body.get("job_title", "")
    tasks = body.get("tasks", [])
    description = body.get("description", "")

    try:
        from app.ai_providers import call_claude_sync
        prompt = f"""Analyze this job and its tasks, then infer the required skills.

Job Title: {job_title}
Description: {description}
Tasks: {', '.join(tasks) if tasks else 'Not specified'}

Return a JSON array of skill objects. Each object should have:
- name: skill name
- category: one of "technical", "functional", "leadership", "adaptive"
- required_proficiency: 1-4 (1=Aware, 2=Developing, 3=Proficient, 4=Expert)
- weight: 0.0-1.0 (importance/time allocation, all weights should sum to ~1.0)
- rationale: brief explanation of why this skill is needed

Return ONLY valid JSON array, no markdown."""

        raw = call_claude_sync(prompt, system="You are an expert workforce skills analyst. Return only valid JSON.")
        import json
        # Clean response
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()

        inferred = json.loads(clean)
        return _safe({"inferred_skills": inferred, "job_title": job_title})
    except Exception as e:
        # Fallback: return template-based suggestions
        fallback = [
            {"name": "Communication", "category": "adaptive", "required_proficiency": 3, "weight": 0.15, "rationale": "Essential for all roles"},
            {"name": "Problem Solving", "category": "adaptive", "required_proficiency": 3, "weight": 0.15, "rationale": "Core analytical capability"},
            {"name": "Domain Expertise", "category": "functional", "required_proficiency": 3, "weight": 0.3, "rationale": f"Core expertise for {job_title}"},
            {"name": "Digital Fluency", "category": "adaptive", "required_proficiency": 2, "weight": 0.1, "rationale": "Modern workplace requirement"},
            {"name": "Stakeholder Management", "category": "leadership", "required_proficiency": 2, "weight": 0.1, "rationale": "Cross-functional collaboration"},
        ]
        return _safe({"inferred_skills": fallback, "job_title": job_title, "note": "AI unavailable, showing template suggestions"})

# ── Skills CRUD (catch-all {skill_id} routes MUST be last) ──
@router.get("/skills")
def list_skills(category: str = "All", trend: str = "All", importance: str = "All"):
    return _safe({"skills": skills_store.get_skills(category, trend, importance), "total": len(skills_store.skills)})

@router.post("/skills")
async def create_skill(request: Request):
    body = await request.json()
    skill = skills_store.create_skill(body)
    return _safe(skill)

@router.get("/skills/{skill_id}")
def get_skill(skill_id: str):
    skill = skills_store.get_skill(skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    # Enrich with usage stats
    job_mappings = [m for m in skills_store.mappings.values() if m.get("skill_id") == skill_id and m.get("source_type") == "job"]
    emp_mappings = [m for m in skills_store.mappings.values() if m.get("skill_id") == skill_id and m.get("source_type") == "employee"]
    adjacencies = skills_store.get_adjacency(skill_id)
    return _safe({**skill, "jobs_using": len(job_mappings), "employees_with": len(emp_mappings), "adjacencies": adjacencies, "job_details": job_mappings})

@router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, request: Request):
    body = await request.json()
    skill = skills_store.update_skill(skill_id, body)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return _safe(skill)

@router.delete("/skills/{skill_id}")
def delete_skill(skill_id: str):
    skill = skills_store.delete_skill(skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return _safe({"deleted": True})
