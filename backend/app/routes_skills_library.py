"""Skills Library API routes."""
from fastapi import APIRouter, Request, HTTPException, Query
from app.shared import _safe
from app.skills_library import skills_library

router = APIRouter(prefix="/api", tags=["skills-library"])


@router.get("/skills/library")
def search_skills(
    q: str = "",
    domain: str = "All",
    category: str = "All",
    skill_type: str = Query("All", alias="type"),
    ai_impact: str = "All",
    trend: str = "All",
    page: int = 1,
    limit: int = 50,
):
    return _safe(skills_library.search(q, domain, category, skill_type, ai_impact, trend, page, limit))


@router.get("/skills/library/domains")
def get_domains():
    return _safe({"domains": skills_library.get_domains_tree()})


@router.get("/skills/library/stats")
def get_stats():
    return _safe(skills_library.get_stats())


@router.get("/skills/library/industry/{industry}")
def get_industry_skills(industry: str):
    skills = skills_library.get_for_industry(industry)
    return _safe({"skills": skills, "industry": industry, "count": len(skills)})


@router.get("/skills/library/{skill_id}")
def get_skill(skill_id: str):
    skill = skills_library.get(skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    adjacencies = skills_library.get_adjacencies(skill_id)
    return _safe({
        **skill,
        "adjacencies": [{"skill_id": a["skill_id"], "name": a["name"], "category": a["category"]} for a in adjacencies],
    })


@router.post("/skills/library")
async def add_skill(request: Request):
    body = await request.json()
    skill = skills_library.add(body)
    return _safe(skill)


@router.put("/skills/library/{skill_id}")
async def update_skill(skill_id: str, request: Request):
    body = await request.json()
    skill = skills_library.update(skill_id, body)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return _safe(skill)


@router.delete("/skills/library/{skill_id}")
def delete_skill(skill_id: str):
    skill = skills_library.delete(skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return _safe({"deleted": True, "skill_id": skill_id})


@router.post("/skills/library/match")
async def match_skills(request: Request):
    body = await request.json()
    matches = skills_library.match_to_role(
        body.get("role_title", ""),
        body.get("level", "P2"),
        body.get("function", ""),
        body.get("industry"),
    )
    return _safe({"matches": matches, "count": len(matches)})
