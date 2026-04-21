"""Synthesis Modules 7-10 — API endpoints.

Module 7: AI Recommendations CRUD + synthesis
Module 8-9: Talent profile + taxonomy persistence
Module 10: Change readiness profiles + snapshots
"""

import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.auth import SessionLocal
from app.models_synthesis import (
    Recommendation, TalentSkillProfile, SkillTaxonomyEntry,
    ChangeReadinessProfile, ChangeReadinessSnapshot,
)

router = APIRouter(prefix="/api/synth", tags=["synthesis"])


def _db():
    return SessionLocal()

def _now():
    return datetime.now(timezone.utc)

def _uid():
    return uuid.uuid4().hex[:12]


# ═══════════════════════════════════════════════════════════════════
#  MODULE 7: AI RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════

class RecommendationCreate(BaseModel):
    project_id: str
    title: str
    category: str = "process"
    description: str = ""
    rationale: str = ""
    impact_score: float = 50.0
    feasibility_score: float = 50.0
    source_findings: list = []

class RecommendationUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    rationale: Optional[str] = None
    expected_outcome: Optional[str] = None
    impact_score: Optional[float] = None
    feasibility_score: Optional[float] = None
    investment_tier: Optional[str] = None
    roadmap_wave: Optional[str] = None
    affected_roles: Optional[list] = None
    dependencies: Optional[list] = None


@router.post("/recommendations")
def create_recommendation(body: RecommendationCreate):
    db = _db()
    try:
        rec = Recommendation(
            id=_uid(), project_id=body.project_id, title=body.title,
            category=body.category, description=body.description,
            rationale=body.rationale, impact_score=body.impact_score,
            feasibility_score=body.feasibility_score,
            priority_score=round((body.impact_score * 0.6 + body.feasibility_score * 0.4), 1),
            source_findings=body.source_findings,
        )
        db.add(rec)
        db.commit()
        return _rec_dict(rec)
    finally:
        db.close()


@router.get("/recommendations")
def list_recommendations(project_id: str, category: str = "", status: str = "",
                          wave: str = "", sort_by: str = "priority_score",
                          page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(Recommendation).filter_by(project_id=project_id)
        if category: q = q.filter_by(category=category)
        if status: q = q.filter_by(status=status)
        if wave: q = q.filter_by(roadmap_wave=wave)

        total = q.count()
        sort_col = getattr(Recommendation, sort_by, Recommendation.priority_score)
        recs = q.order_by(sort_col.desc()).offset(page * page_size).limit(page_size).all()

        all_recs = db.query(Recommendation).filter_by(project_id=project_id).all()
        cat_counts = Counter(r.category for r in all_recs)
        status_counts = Counter(r.status for r in all_recs)
        tier_counts = Counter(r.investment_tier for r in all_recs if r.investment_tier)

        return {
            "recommendations": [_rec_dict(r) for r in recs],
            "total": total, "page": page,
            "summary": {
                "total": len(all_recs),
                "categories": dict(cat_counts),
                "statuses": dict(status_counts),
                "tiers": dict(tier_counts),
                "avg_priority": round(sum(r.priority_score for r in all_recs) / max(len(all_recs), 1), 1),
            },
        }
    finally:
        db.close()


@router.put("/recommendations/{rec_id}")
def update_recommendation(rec_id: str, body: RecommendationUpdate):
    db = _db()
    try:
        rec = db.query(Recommendation).get(rec_id)
        if not rec:
            raise HTTPException(404, "Recommendation not found")
        for field in ["title", "category", "status", "description", "rationale",
                       "expected_outcome", "impact_score", "feasibility_score",
                       "investment_tier", "roadmap_wave", "affected_roles", "dependencies"]:
            val = getattr(body, field, None)
            if val is not None:
                setattr(rec, field, val)
        rec.priority_score = round((rec.impact_score * 0.6 + rec.feasibility_score * 0.4), 1)
        rec.updated_at = _now()
        db.commit()
        return _rec_dict(rec)
    finally:
        db.close()


def _rec_dict(r):
    return {
        "id": r.id, "project_id": r.project_id, "title": r.title,
        "category": r.category, "status": r.status,
        "impact_score": r.impact_score, "feasibility_score": r.feasibility_score,
        "priority_score": r.priority_score, "investment_tier": r.investment_tier,
        "description": r.description, "rationale": r.rationale,
        "expected_outcome": r.expected_outcome,
        "source_findings": r.source_findings,
        "affected_roles": r.affected_roles, "headcount_impact": r.headcount_impact,
        "roadmap_wave": r.roadmap_wave, "dependencies": r.dependencies,
        "ai_rationale": r.ai_rationale,
        "updated_at": str(r.updated_at) if r.updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════════
#  MODULE 8: SKILLS & TALENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/talent-profiles")
def list_talent_profiles(project_id: str, entity_type: str = "", function: str = ""):
    db = _db()
    try:
        q = db.query(TalentSkillProfile).filter_by(project_id=project_id)
        if entity_type: q = q.filter_by(entity_type=entity_type)
        if function: q = q.filter(TalentSkillProfile.function == function)
        profiles = q.order_by(TalentSkillProfile.gap_score.desc()).all()
        return {
            "profiles": [{
                "id": p.id, "entity_type": p.entity_type, "entity_name": p.entity_name,
                "function": p.function, "family": p.family,
                "current_skills": p.current_skills, "required_skills": p.required_skills,
                "skill_gaps": p.skill_gaps, "skill_adjacencies": p.skill_adjacencies,
                "sourcing_strategy": p.sourcing_strategy, "gap_score": p.gap_score,
            } for p in profiles],
            "total": len(profiles),
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  MODULE 9: SKILLS MAP ENGINE
# ═══════════════════════════════════════════════════════════════════

@router.get("/skill-taxonomy")
def list_skill_taxonomy(project_id: str, category: str = "", critical_only: bool = False):
    db = _db()
    try:
        q = db.query(SkillTaxonomyEntry).filter_by(project_id=project_id)
        if category: q = q.filter_by(category=category)
        if critical_only: q = q.filter_by(is_critical=True)
        entries = q.order_by(SkillTaxonomyEntry.role_count.desc()).all()
        return {
            "skills": [{
                "id": e.id, "skill_name": e.skill_name, "category": e.category,
                "subcategory": e.subcategory, "description": e.description,
                "source": e.source, "onet_code": e.onet_code,
                "is_critical": e.is_critical, "role_count": e.role_count,
                "related_skills": e.related_skills,
            } for e in entries],
            "total": len(entries),
            "critical_count": sum(1 for e in entries if e.is_critical),
            "categories": dict(Counter(e.category for e in entries if e.category)),
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  MODULE 10: CHANGE READINESS
# ═══════════════════════════════════════════════════════════════════

@router.get("/change-readiness")
def list_change_readiness(project_id: str, entity_type: str = "",
                           quadrant: str = ""):
    db = _db()
    try:
        q = db.query(ChangeReadinessProfile).filter_by(project_id=project_id)
        if entity_type: q = q.filter_by(entity_type=entity_type)
        if quadrant: q = q.filter_by(quadrant=quadrant)
        profiles = q.all()

        quad_counts = Counter(p.quadrant for p in profiles)
        total_pop = sum(p.headcount for p in profiles)

        return {
            "profiles": [{
                "id": p.id, "entity_type": p.entity_type, "entity_name": p.entity_name,
                "willingness": p.willingness, "ability": p.ability,
                "quadrant": p.quadrant, "headcount": p.headcount,
                "current_change_load": p.current_change_load,
                "change_capacity": p.change_capacity,
                "willingness_drivers": p.willingness_drivers,
                "ability_drivers": p.ability_drivers,
                "recommended_interventions": p.recommended_interventions,
            } for p in profiles],
            "total": len(profiles),
            "quadrants": dict(quad_counts),
            "total_population": total_pop,
            "avg_willingness": round(sum(p.willingness for p in profiles) / max(len(profiles), 1), 1),
            "avg_ability": round(sum(p.ability for p in profiles) / max(len(profiles), 1), 1),
        }
    finally:
        db.close()


@router.post("/change-readiness/snapshot")
def create_change_snapshot(project_id: str, tag: str = ""):
    db = _db()
    try:
        profiles = db.query(ChangeReadinessProfile).filter_by(project_id=project_id).all()
        if not profiles:
            raise HTTPException(400, "No readiness data")

        quad_counts = Counter(p.quadrant for p in profiles)
        total_pop = sum(p.headcount for p in profiles)
        avg_will = round(sum(p.willingness for p in profiles) / len(profiles), 1)
        avg_abil = round(sum(p.ability for p in profiles) / len(profiles), 1)
        org_quad = "ready" if avg_will >= 60 and avg_abil >= 60 else "eager" if avg_will >= 60 else "capable" if avg_abil >= 60 else "resistant"

        snap = ChangeReadinessSnapshot(
            id=_uid(), project_id=project_id,
            snapshot_tag=tag or f"Snapshot {_now().strftime('%Y-%m-%d')}",
            org_willingness=avg_will, org_ability=avg_abil, org_quadrant=org_quad,
            quadrant_distribution=dict(quad_counts), total_population=total_pop,
            change_load_avg=round(sum(p.current_change_load for p in profiles) / len(profiles), 1),
        )
        db.add(snap)
        db.commit()
        return {"id": snap.id, "org_quadrant": org_quad, "total": total_pop}
    finally:
        db.close()


@router.get("/change-readiness/snapshots")
def list_change_snapshots(project_id: str):
    db = _db()
    try:
        snaps = db.query(ChangeReadinessSnapshot).filter_by(project_id=project_id)\
            .order_by(ChangeReadinessSnapshot.created_at.desc()).all()
        return [{
            "id": s.id, "tag": s.snapshot_tag,
            "org_willingness": s.org_willingness, "org_ability": s.org_ability,
            "org_quadrant": s.org_quadrant,
            "quadrant_distribution": s.quadrant_distribution,
            "total_population": s.total_population,
            "created_at": str(s.created_at),
        } for s in snaps]
    finally:
        db.close()
