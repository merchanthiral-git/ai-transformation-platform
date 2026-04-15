"""O*NET Skills Map Engine API routes.
Covers 4 artifacts: Skills Library, Job Matcher, Skills Mapper, Export.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Query
from app.shared import _safe
from app.onet_data import onet_store, ONET_SKILLS

router = APIRouter(prefix="/api", tags=["skills-map"])


# ═══════════════════════════════════════════════════════════════════════
# SKILLS LIBRARY (Artifact 1)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/skills-map/occupations")
def list_occupations(
    search: str = "",
    job_zone: int = 0,
    major_group: str = "",
    page: int = 1,
    limit: int = 50,
):
    """List / search O*NET occupations with pagination."""
    jz = job_zone if job_zone > 0 else None
    mg = major_group if major_group else None
    results = onet_store.search_occupations(search, job_zone=jz, major_group=mg)
    total = len(results)
    start = (page - 1) * limit
    end = start + limit
    page_results = results[start:end]
    return _safe({
        "occupations": page_results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    })


@router.get("/skills-map/occupations/{soc_code}")
def get_occupation(soc_code: str):
    """Get full occupation detail by SOC code."""
    occ = onet_store.get_occupation(soc_code)
    if not occ:
        raise HTTPException(status_code=404, detail=f"Occupation {soc_code} not found")
    return _safe(occ)


@router.get("/skills-map/occupations/{soc_code}/skills")
def get_occupation_skills(soc_code: str):
    """Get skills for an occupation, sorted by importance."""
    if soc_code not in onet_store.occupations:
        raise HTTPException(status_code=404, detail=f"Occupation {soc_code} not found")
    skills = onet_store.get_skills(soc_code)
    occ = onet_store.occupations[soc_code]
    return _safe({
        "onet_soc_code": soc_code,
        "title": occ["title"],
        "skills": skills,
        "total": len(skills),
    })


@router.get("/skills-map/skills")
def list_all_skills():
    """List all 35 O*NET skills with categories."""
    categories = {}
    for s in ONET_SKILLS:
        cat = s["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(s)
    return _safe({
        "skills": ONET_SKILLS,
        "categories": categories,
        "total": len(ONET_SKILLS),
    })


@router.get("/skills-map/skills/{element_id}/occupations")
def get_skill_occupations(element_id: str):
    """Get all occupations ranked by importance of a given skill."""
    # Validate element_id
    skill_info = next((s for s in ONET_SKILLS if s["element_id"] == element_id), None)
    if not skill_info:
        raise HTTPException(status_code=404, detail=f"Skill {element_id} not found")
    occupations = onet_store.get_occupations_by_skill(element_id)
    return _safe({
        "element_id": element_id,
        "skill_name": skill_info["name"],
        "category": skill_info["category"],
        "occupations": occupations,
        "total": len(occupations),
    })


@router.get("/skills-map/search")
def search(q: str = ""):
    """Unified search across occupations, skills, and alternate titles."""
    if not q or len(q.strip()) < 2:
        return _safe({"occupations": [], "skills": [], "total": 0})

    query = q.strip().lower()

    # Search occupations
    occupations = onet_store.search_occupations(q)[:20]

    # Search skills
    matching_skills = [
        s for s in ONET_SKILLS
        if query in s["name"].lower() or query in s["description"].lower()
    ]

    return _safe({
        "occupations": occupations,
        "skills": matching_skills,
        "total": len(occupations) + len(matching_skills),
    })


@router.get("/skills-map/major-groups")
def list_major_groups():
    """List all SOC major groups with counts."""
    groups = {}
    for occ in onet_store.occupations.values():
        mg = occ.get("major_group", "")
        mg_name = occ.get("major_group_name", "")
        if mg not in groups:
            groups[mg] = {"code": mg, "name": mg_name, "count": 0}
        groups[mg]["count"] += 1
    result = sorted(groups.values(), key=lambda x: x["code"])
    return _safe({"major_groups": result, "total": len(result)})


# ═══════════════════════════════════════════════════════════════════════
# JOB MATCHER (Artifact 2)
# ═══════════════════════════════════════════════════════════════════════

_match_cache: dict = {}         # job_title -> match results
_confirmed_matches: dict = {}   # job_id -> {onet_soc_code, skills, confirmed_at}


@router.post("/skills-map/match-single")
async def match_single(request: Request):
    """Match a single job title to O*NET occupations.
    Uses deterministic matching first, then falls back to Claude if confidence < 90%.
    """
    body = await request.json()
    title = body.get("title", "").strip()
    description = body.get("description", "")

    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    # Check cache
    cache_key = f"{title}||{description}"
    if cache_key in _match_cache:
        return _safe({"matches": _match_cache[cache_key][:3], "title": title, "cached": True})

    # Stage 1: Deterministic matching
    matches = onet_store.match_title(title, description)

    # Stage 2: If top match confidence < 90%, try Claude API for better matching
    if matches and matches[0].get("confidence", 0) < 90:
        try:
            from app.ai_providers import call_claude_sync
            import json as _json
            prompt = (
                f"Match the job title \"{title}\" to the most appropriate O*NET-SOC occupation code. "
                f"{'Description: ' + description if description else ''}\n\n"
                f"Here are the top candidates from deterministic matching:\n"
            )
            for m in matches[:5]:
                prompt += f"- {m['onet_soc_code']}: {m['title']} (confidence: {m['confidence']}%)\n"
            prompt += (
                "\nReturn JSON with: {\"best_match_soc\": \"XX-XXXX.XX\", \"reasoning\": \"...\"}\n"
                "Only return the JSON, nothing else."
            )
            ai_response = call_claude_sync(prompt, system="You are an O*NET occupation classification expert.", max_tokens=256, json_mode=True)
            ai_result = _json.loads(ai_response) if isinstance(ai_response, str) else ai_response
            best_soc = ai_result.get("best_match_soc", "")
            if best_soc:
                # Boost the AI-recommended match
                for m in matches:
                    if m["onet_soc_code"] == best_soc:
                        m["confidence"] = min(95, m["confidence"] + 10)
                        m["ai_boosted"] = True
                        break
                # Re-sort
                matches.sort(key=lambda x: x["confidence"], reverse=True)
        except Exception:
            pass  # AI not available — use deterministic results

    top = matches[:3]
    _match_cache[cache_key] = top
    return _safe({"matches": top, "title": title, "cached": False})


@router.post("/skills-map/auto-match")
async def auto_match(request: Request):
    """Batch match multiple jobs to O*NET occupations."""
    body = await request.json()
    jobs = body.get("jobs", [])
    if not jobs:
        return _safe({"results": [], "total": 0})

    results = []
    for job in jobs:
        title = job.get("title", "").strip()
        description = job.get("description", "")
        job_id = job.get("id", title)
        matches = onet_store.match_title(title, description)
        top = matches[:3]
        auto_confirmed = False
        # Auto-confirm if top match has high confidence
        if top and top[0].get("confidence", 0) >= 90:
            auto_confirmed = True
        results.append({
            "job_id": job_id,
            "title": title,
            "matches": top,
            "auto_confirmed": auto_confirmed,
            "best_confidence": top[0]["confidence"] if top else 0,
        })

    # Summary stats
    confirmed_count = sum(1 for r in results if r["auto_confirmed"])
    return _safe({
        "results": results,
        "total": len(results),
        "auto_confirmed": confirmed_count,
        "needs_review": len(results) - confirmed_count,
    })


@router.post("/skills-map/confirm-match")
async def confirm_match(request: Request):
    """Confirm a job-to-O*NET match and load skills."""
    body = await request.json()
    job_id = body.get("job_id", "").strip()
    soc_code = body.get("onet_soc_code", "").strip()

    if not job_id or not soc_code:
        raise HTTPException(status_code=400, detail="job_id and onet_soc_code are required")

    if soc_code not in onet_store.occupations:
        raise HTTPException(status_code=404, detail=f"Occupation {soc_code} not found")

    skills = onet_store.get_skills(soc_code)
    occ = onet_store.occupations[soc_code]
    now = datetime.now(timezone.utc).isoformat()

    _confirmed_matches[job_id] = {
        "onet_soc_code": soc_code,
        "onet_title": occ["title"],
        "skills": skills,
        "confirmed_at": now,
    }

    # Auto-create a skill mapping entry
    if job_id not in _skill_mappings:
        _skill_mappings[job_id] = {
            "job_id": job_id,
            "onet_soc_code": soc_code,
            "onet_title": occ["title"],
            "skills": [
                {
                    "element_id": s["element_id"],
                    "skill_name": s["skill_name"],
                    "category": s["category"],
                    "onet_importance": s["importance"],
                    "onet_level": s["level"],
                    "org_importance": s["importance"],  # default to O*NET value
                    "org_level": s["level"],
                    "custom": False,
                    "modified": False,
                }
                for s in skills
            ],
            "custom_skills": [],
            "status": "draft",
            "reviewer": None,
            "created_at": now,
            "updated_at": now,
        }

    return _safe({
        "success": True,
        "job_id": job_id,
        "onet_soc_code": soc_code,
        "onet_title": occ["title"],
        "skills_loaded": len(skills),
    })


@router.get("/skills-map/match-status")
def match_status():
    """Get summary of all confirmed matches."""
    matches = []
    for job_id, data in _confirmed_matches.items():
        matches.append({
            "job_id": job_id,
            "onet_soc_code": data["onet_soc_code"],
            "onet_title": data.get("onet_title", ""),
            "skills_count": len(data.get("skills", [])),
            "confirmed_at": data.get("confirmed_at"),
            "has_mapping": job_id in _skill_mappings,
        })
    return _safe({
        "confirmed_matches": matches,
        "total": len(matches),
    })


# ═══════════════════════════════════════════════════════════════════════
# SKILLS MAPPER (Artifact 3)
# ═══════════════════════════════════════════════════════════════════════

_skill_mappings: dict = {}  # job_id -> {skills, status, reviewer, ...}


@router.get("/skills-map/mapper/jobs")
def list_mapper_jobs():
    """List all jobs with skill mappings and their status."""
    jobs = []
    for job_id, mapping in _skill_mappings.items():
        skills = mapping.get("skills", [])
        modified_count = sum(1 for s in skills if s.get("modified"))
        custom_count = len(mapping.get("custom_skills", []))
        jobs.append({
            "job_id": job_id,
            "onet_soc_code": mapping.get("onet_soc_code", ""),
            "onet_title": mapping.get("onet_title", ""),
            "status": mapping.get("status", "draft"),
            "skills_count": len(skills) + custom_count,
            "modified_count": modified_count,
            "custom_count": custom_count,
            "reviewer": mapping.get("reviewer"),
            "created_at": mapping.get("created_at"),
            "updated_at": mapping.get("updated_at"),
        })
    return _safe({"jobs": jobs, "total": len(jobs)})


@router.get("/skills-map/mapper/jobs/{job_id}/skills")
def get_job_skills(job_id: str):
    """Get skill mapping for a specific job."""
    mapping = _skill_mappings.get(job_id)
    if not mapping:
        raise HTTPException(status_code=404, detail=f"No skill mapping found for job {job_id}")
    return _safe({
        "job_id": job_id,
        "onet_soc_code": mapping.get("onet_soc_code", ""),
        "onet_title": mapping.get("onet_title", ""),
        "status": mapping.get("status", "draft"),
        "skills": mapping.get("skills", []),
        "custom_skills": mapping.get("custom_skills", []),
        "reviewer": mapping.get("reviewer"),
        "updated_at": mapping.get("updated_at"),
    })


@router.put("/skills-map/mapper/jobs/{job_id}/skills")
async def update_job_skills(job_id: str, request: Request):
    """Update skill importance/level for a mapped job."""
    mapping = _skill_mappings.get(job_id)
    if not mapping:
        raise HTTPException(status_code=404, detail=f"No skill mapping found for job {job_id}")
    if mapping.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot modify an approved mapping")

    body = await request.json()
    updated_skills = body.get("skills", [])
    now = datetime.now(timezone.utc).isoformat()

    # Apply updates
    skills_by_id = {s["element_id"]: s for s in mapping["skills"]}
    for update in updated_skills:
        eid = update.get("element_id", "")
        if eid in skills_by_id:
            if "org_importance" in update:
                skills_by_id[eid]["org_importance"] = update["org_importance"]
                skills_by_id[eid]["modified"] = True
            if "org_level" in update:
                skills_by_id[eid]["org_level"] = update["org_level"]
                skills_by_id[eid]["modified"] = True

    mapping["skills"] = list(skills_by_id.values())
    mapping["updated_at"] = now
    mapping["status"] = "in_progress"

    return _safe({
        "success": True,
        "job_id": job_id,
        "updated_count": len(updated_skills),
        "status": mapping["status"],
    })


@router.post("/skills-map/mapper/jobs/{job_id}/custom-skill")
async def add_custom_skill(job_id: str, request: Request):
    """Add a custom (non-O*NET) skill to a job mapping."""
    mapping = _skill_mappings.get(job_id)
    if not mapping:
        raise HTTPException(status_code=404, detail=f"No skill mapping found for job {job_id}")
    if mapping.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot modify an approved mapping")

    body = await request.json()
    skill_name = body.get("skill_name", "").strip()
    if not skill_name:
        raise HTTPException(status_code=400, detail="skill_name is required")

    now = datetime.now(timezone.utc).isoformat()
    custom_skill = {
        "element_id": f"CUSTOM.{job_id}.{len(mapping.get('custom_skills', []))+1}",
        "skill_name": skill_name,
        "category": body.get("category", "Organization-Specific"),
        "description": body.get("description", ""),
        "org_importance": body.get("importance", 3.5),
        "org_level": body.get("level", 4.0),
        "custom": True,
        "created_at": now,
    }

    if "custom_skills" not in mapping:
        mapping["custom_skills"] = []
    mapping["custom_skills"].append(custom_skill)
    mapping["updated_at"] = now

    return _safe({
        "success": True,
        "job_id": job_id,
        "custom_skill": custom_skill,
    })


@router.put("/skills-map/mapper/jobs/{job_id}/submit-review")
async def submit_for_review(job_id: str, request: Request):
    """Submit a job skill mapping for review."""
    mapping = _skill_mappings.get(job_id)
    if not mapping:
        raise HTTPException(status_code=404, detail=f"No skill mapping found for job {job_id}")

    body = await request.json()
    reviewer = body.get("reviewer", "")
    now = datetime.now(timezone.utc).isoformat()

    mapping["status"] = "pending_review"
    mapping["reviewer"] = reviewer
    mapping["submitted_at"] = now
    mapping["updated_at"] = now

    return _safe({
        "success": True,
        "job_id": job_id,
        "status": "pending_review",
        "reviewer": reviewer,
    })


@router.put("/skills-map/mapper/jobs/{job_id}/approve")
async def approve_mapping(job_id: str):
    """Approve a skill mapping."""
    mapping = _skill_mappings.get(job_id)
    if not mapping:
        raise HTTPException(status_code=404, detail=f"No skill mapping found for job {job_id}")

    now = datetime.now(timezone.utc).isoformat()
    mapping["status"] = "approved"
    mapping["approved_at"] = now
    mapping["updated_at"] = now

    return _safe({
        "success": True,
        "job_id": job_id,
        "status": "approved",
        "approved_at": now,
    })


@router.get("/skills-map/mapper/progress")
def get_progress():
    """Get overall skills mapping progress."""
    total = len(_skill_mappings)
    statuses = {"draft": 0, "in_progress": 0, "pending_review": 0, "approved": 0}
    for mapping in _skill_mappings.values():
        status = mapping.get("status", "draft")
        statuses[status] = statuses.get(status, 0) + 1

    return _safe({
        "total_jobs": total,
        "statuses": statuses,
        "completion_rate": round(statuses["approved"] / total * 100, 1) if total > 0 else 0,
        "confirmed_matches": len(_confirmed_matches),
    })


# ═══════════════════════════════════════════════════════════════════════
# EXPORT (Artifact 4)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/skills-map/export/by-job")
def export_by_job():
    """Export skill mappings organized by job."""
    rows = []
    for job_id, mapping in _skill_mappings.items():
        all_skills = mapping.get("skills", []) + mapping.get("custom_skills", [])
        for s in all_skills:
            rows.append({
                "job_id": job_id,
                "onet_soc_code": mapping.get("onet_soc_code", ""),
                "onet_title": mapping.get("onet_title", ""),
                "status": mapping.get("status", "draft"),
                "element_id": s.get("element_id", ""),
                "skill_name": s.get("skill_name", ""),
                "category": s.get("category", ""),
                "onet_importance": s.get("onet_importance", s.get("importance", "")),
                "onet_level": s.get("onet_level", s.get("level", "")),
                "org_importance": s.get("org_importance", ""),
                "org_level": s.get("org_level", ""),
                "custom": s.get("custom", False),
                "modified": s.get("modified", False),
            })
    return _safe({"rows": rows, "total": len(rows)})


@router.get("/skills-map/export/by-skill")
def export_by_skill():
    """Export skill mappings organized by skill across all jobs."""
    skill_data = {}  # element_id -> {skill_info, jobs: [...]}
    for job_id, mapping in _skill_mappings.items():
        all_skills = mapping.get("skills", []) + mapping.get("custom_skills", [])
        for s in all_skills:
            eid = s.get("element_id", "")
            if eid not in skill_data:
                skill_data[eid] = {
                    "element_id": eid,
                    "skill_name": s.get("skill_name", ""),
                    "category": s.get("category", ""),
                    "jobs": [],
                }
            skill_data[eid]["jobs"].append({
                "job_id": job_id,
                "onet_soc_code": mapping.get("onet_soc_code", ""),
                "onet_title": mapping.get("onet_title", ""),
                "org_importance": s.get("org_importance", ""),
                "org_level": s.get("org_level", ""),
            })
    skills = sorted(skill_data.values(), key=lambda x: x["skill_name"])
    return _safe({"skills": skills, "total": len(skills)})


@router.get("/skills-map/export/summary")
def export_summary():
    """Export summary statistics for the skills mapping project."""
    total_jobs = len(_skill_mappings)
    total_confirmed = len(_confirmed_matches)
    total_occupations = len(onet_store.occupations)

    statuses = {"draft": 0, "in_progress": 0, "pending_review": 0, "approved": 0}
    all_skills_used = set()
    custom_skills_count = 0
    modified_skills_count = 0

    for mapping in _skill_mappings.values():
        status = mapping.get("status", "draft")
        statuses[status] = statuses.get(status, 0) + 1
        for s in mapping.get("skills", []):
            all_skills_used.add(s.get("element_id", ""))
            if s.get("modified"):
                modified_skills_count += 1
        custom_skills_count += len(mapping.get("custom_skills", []))

    # Skill category breakdown
    category_counts = {}
    for s in ONET_SKILLS:
        cat = s["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1

    return _safe({
        "total_onet_occupations": total_occupations,
        "total_onet_skills": len(ONET_SKILLS),
        "confirmed_matches": total_confirmed,
        "mapped_jobs": total_jobs,
        "statuses": statuses,
        "completion_rate": round(statuses["approved"] / total_jobs * 100, 1) if total_jobs > 0 else 0,
        "unique_skills_used": len(all_skills_used),
        "custom_skills_added": custom_skills_count,
        "modified_skills": modified_skills_count,
        "skill_categories": category_counts,
    })
