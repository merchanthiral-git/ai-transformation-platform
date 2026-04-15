"""Job Notes & Interview Insights API."""
from fastapi import APIRouter, Request, HTTPException
from app.shared import _safe
import uuid
from datetime import datetime

router = APIRouter(prefix="/api", tags=["notes"])

# In-memory store
_notes_store: dict[str, dict] = {}  # id → note

NOTE_CATEGORIES = ["skills_update", "role_clarification", "process_insight", "pain_point", "stakeholder_feedback", "other"]

def _new_id(): return str(uuid.uuid4())[:12]
def _now(): return datetime.utcnow().isoformat()

@router.get("/notes")
def list_notes(job_title: str = None, category: str = None, status: str = None, search: str = None):
    """List all notes with optional filters."""
    results = list(_notes_store.values())
    if job_title:
        results = [n for n in results if n.get("job_title", "").lower() == job_title.lower()]
    if category and category != "All":
        results = [n for n in results if n.get("category") == category]
    if status and status != "All":
        results = [n for n in results if n.get("status") == status]
    if search:
        q = search.lower()
        results = [n for n in results if q in n.get("text", "").lower() or q in n.get("source", "").lower() or q in n.get("job_title", "").lower()]
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return _safe({"notes": results, "total": len(results), "categories": NOTE_CATEGORIES})

@router.post("/notes")
async def create_note(request: Request):
    """Create a new note. If it contains skills data, propagate to skills store."""
    body = await request.json()
    note_id = _new_id()
    note = {
        "id": note_id,
        "job_title": body.get("job_title", ""),
        "employee_id": body.get("employee_id", ""),
        "text": body.get("text", ""),
        "source": body.get("source", ""),  # e.g. "Interview with John Smith, VP Finance"
        "category": body.get("category", "other"),
        "status": body.get("status", "needs_validation"),  # confirmed | needs_validation
        "skills_mentioned": body.get("skills_mentioned", []),  # list of {name, proficiency, action}
        "impact_fields": body.get("impact_fields", []),  # which fields this updates
        "tags": body.get("tags", []),
        "created_at": _now(),
        "updated_at": _now(),
        "created_by": body.get("created_by", ""),
    }
    _notes_store[note_id] = note

    # Propagate skills mentions to the skills store
    if note.get("skills_mentioned"):
        try:
            from app.skills_store import skills_store
            for skill_info in note["skills_mentioned"]:
                skill_name = skill_info.get("name", "")
                if not skill_name:
                    continue
                # Check if skill exists
                existing = [s for s in skills_store.skills.values() if s["name"].lower() == skill_name.lower()]
                if existing:
                    # Update source evidence
                    skill = existing[0]
                    sources = skill.get("source_evidence", [])
                    if not isinstance(sources, list):
                        sources = [sources] if sources else []
                    sources.append(f"Interview note: {note['source']} ({note['created_at'][:10]})")
                    skill["source_evidence"] = sources
                    skill["updated_at"] = _now()
                else:
                    # Create new skill from interview
                    skills_store.create_skill({
                        "name": skill_name,
                        "category": skill_info.get("category", "functional"),
                        "description": f"Identified from interview: {note['source']}",
                        "metadata": {
                            "transferability": 0.5,
                            "automation_susceptibility": 0.3,
                            "strategic_importance": "important",
                            "trend": "stable",
                        },
                        "source_evidence": [f"Interview note: {note['source']} ({note['created_at'][:10]})"],
                    })

                # Create/update mapping for this job
                if note.get("job_title"):
                    skill_obj = [s for s in skills_store.skills.values() if s["name"].lower() == skill_name.lower()]
                    if skill_obj:
                        skills_store.create_mapping({
                            "source_type": "job",
                            "source_id": note["job_title"],
                            "source_label": note["job_title"],
                            "skill_id": skill_obj[0]["id"],
                            "weight": skill_info.get("weight", 0.5),
                            "required_proficiency": skill_info.get("proficiency", 3),
                            "current_proficiency": skill_info.get("current", 0),
                            "confidence": "inferred",
                            "source_evidence": f"interview_note:{note_id}",
                        })

            # Log event
            skills_store.log_event(
                "note_created", "Job Notes",
                [s.get("name", "") for s in note["skills_mentioned"]],
                f"Note added for {note['job_title']}: {note['text'][:100]}"
            )
        except ImportError:
            pass

    return _safe(note)

@router.get("/notes/{note_id}")
def get_note(note_id: str):
    note = _notes_store.get(note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    return _safe(note)

@router.put("/notes/{note_id}")
async def update_note(note_id: str, request: Request):
    if note_id not in _notes_store:
        raise HTTPException(404, "Note not found")
    body = await request.json()
    _notes_store[note_id].update(body)
    _notes_store[note_id]["updated_at"] = _now()
    return _safe(_notes_store[note_id])

@router.delete("/notes/{note_id}")
def delete_note(note_id: str):
    note = _notes_store.pop(note_id, None)
    if not note:
        raise HTTPException(404, "Note not found")
    return _safe({"deleted": True})

@router.get("/notes/job/{job_title}")
def get_notes_for_job(job_title: str):
    """Get all notes for a specific job title."""
    results = [n for n in _notes_store.values() if n.get("job_title", "").lower() == job_title.lower()]
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return _safe({"job_title": job_title, "notes": results, "total": len(results)})

@router.post("/notes/{note_id}/confirm")
def confirm_note(note_id: str):
    """Mark a note as confirmed."""
    if note_id not in _notes_store:
        raise HTTPException(404, "Note not found")
    _notes_store[note_id]["status"] = "confirmed"
    _notes_store[note_id]["updated_at"] = _now()
    return _safe(_notes_store[note_id])

# ── Restructuring scenarios store ──
_reorg_scenarios: dict[str, dict] = {}  # id → scenario

@router.get("/reorg/scenarios")
def list_scenarios(model_id: str = None):
    results = list(_reorg_scenarios.values())
    if model_id:
        results = [s for s in results if s.get("model_id") == model_id]
    return _safe({"scenarios": results, "total": len(results)})

@router.post("/reorg/scenarios")
async def save_scenario(request: Request):
    body = await request.json()
    sid = body.get("id", _new_id())
    scenario = {
        "id": sid,
        "name": body.get("name", f"Scenario {len(_reorg_scenarios) + 1}"),
        "model_id": body.get("model_id", ""),
        "description": body.get("description", ""),
        "changes": body.get("changes", []),  # list of {employee_id, change_type, details}
        "metrics": body.get("metrics", {}),
        "created_at": body.get("created_at", _now()),
        "updated_at": _now(),
    }
    _reorg_scenarios[sid] = scenario
    return _safe(scenario)

@router.get("/reorg/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    s = _reorg_scenarios.get(scenario_id)
    if not s:
        raise HTTPException(404, "Scenario not found")
    return _safe(s)

@router.put("/reorg/scenarios/{scenario_id}")
async def update_scenario(scenario_id: str, request: Request):
    if scenario_id not in _reorg_scenarios:
        raise HTTPException(404, "Scenario not found")
    body = await request.json()
    _reorg_scenarios[scenario_id].update(body)
    _reorg_scenarios[scenario_id]["updated_at"] = _now()
    return _safe(_reorg_scenarios[scenario_id])

@router.delete("/reorg/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    s = _reorg_scenarios.pop(scenario_id, None)
    if not s:
        raise HTTPException(404, "Scenario not found")
    return _safe({"deleted": True})

# ── Impact analysis ──
@router.get("/reorg/impact/{scenario_id}")
def get_impact(scenario_id: str):
    """Compute restructuring impact for a scenario."""
    scenario = _reorg_scenarios.get(scenario_id)
    if not scenario:
        raise HTTPException(404, "Scenario not found")

    changes = scenario.get("changes", [])
    added = [c for c in changes if c.get("change_type") == "add"]
    eliminated = [c for c in changes if c.get("change_type") == "eliminate"]
    modified = [c for c in changes if c.get("change_type") == "modify"]
    moved = [c for c in changes if c.get("change_type") == "move"]

    # Skills impact
    skills_lost = []
    skills_at_risk = []
    for c in eliminated:
        if c.get("details", {}).get("skills"):
            skills_lost.extend(c["details"]["skills"])

    return _safe({
        "scenario_id": scenario_id,
        "scenario_name": scenario.get("name", ""),
        "headcount": {
            "added": len(added),
            "eliminated": len(eliminated),
            "modified": len(modified),
            "moved": len(moved),
            "net": len(added) - len(eliminated),
        },
        "cost": scenario.get("metrics", {}).get("cost", {}),
        "skills_impact": {
            "skills_lost": skills_lost,
            "skills_at_risk": skills_at_risk,
        },
        "timeline": {
            "wave1": {"label": "Quick Wins", "items": [c for c in changes if c.get("wave") == 1]},
            "wave2": {"label": "Consolidations", "items": [c for c in changes if c.get("wave") == 2]},
            "wave3": {"label": "New Roles", "items": [c for c in changes if c.get("wave") == 3]},
            "wave4": {"label": "Reskilling", "items": [c for c in changes if c.get("wave") == 4]},
        },
        "risks": scenario.get("metrics", {}).get("risks", []),
    })
