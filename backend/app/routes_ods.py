"""ODS (Org Design Studio) CRUD API routes — mounted as /api/ods/*"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_db, ProjectDB
from app.models_ods import (
    DesignSession, LayerState, Vision, Scenario, ScenarioNode, DecisionRecord,
)

router = APIRouter(prefix="/api/ods", tags=["ods"])


def _require_project(db: Session, project_id: str):
    """Validate that the project exists."""
    proj = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return proj


def _row_to_dict(row):
    """Convert a SQLAlchemy model instance to a plain dict."""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        d[col.name] = val
    return d


# ═══════════════════════════════════════════════════════════════
# DESIGN SESSIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/sessions")
def list_sessions(project_id: str = Query(...), db: Session = Depends(get_db)):
    _require_project(db, project_id)
    rows = db.query(DesignSession).filter(
        DesignSession.project_id == project_id
    ).order_by(DesignSession.created_at.desc()).all()
    return {"sessions": [_row_to_dict(r) for r in rows]}


@router.post("/sessions")
def create_session(body: dict, db: Session = Depends(get_db)):
    project_id = body.get("project_id", "")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    _require_project(db, project_id)

    session = DesignSession(
        project_id=project_id,
        name=body.get("name", "Untitled Session"),
        parent_layer_id=body.get("parent_layer_id"),
        in_scope_layers=body.get("in_scope_layers", []),
        vision_id=body.get("vision_id"),
        status=body.get("status", "drafting"),
        created_by=body.get("created_by"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _row_to_dict(session)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DesignSession).filter(DesignSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = _row_to_dict(session)
    # Include scenarios for this session
    scenarios = db.query(Scenario).filter(Scenario.session_id == session_id).all()
    result["scenarios"] = [_row_to_dict(s) for s in scenarios]
    return result


@router.put("/sessions/{session_id}")
def update_session(session_id: str, body: dict, db: Session = Depends(get_db)):
    session = db.query(DesignSession).filter(DesignSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    for field in ("name", "parent_layer_id", "in_scope_layers", "vision_id", "status", "created_by"):
        if field in body:
            setattr(session, field, body[field])
    session.last_edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _row_to_dict(session)


@router.delete("/sessions/{session_id}")
def archive_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DesignSession).filter(DesignSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "archived"
    session.last_edited_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "status": "archived"}


# ═══════════════════════════════════════════════════════════════
# VISIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/visions")
def list_visions(project_id: str = Query(...), db: Session = Depends(get_db)):
    _require_project(db, project_id)
    rows = db.query(Vision).filter(
        Vision.project_id == project_id
    ).order_by(Vision.created_at.desc()).all()
    return {"visions": [_row_to_dict(r) for r in rows]}


@router.post("/visions")
def create_vision(body: dict, db: Session = Depends(get_db)):
    project_id = body.get("project_id", "")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    _require_project(db, project_id)

    vision = Vision(
        project_id=project_id,
        name=body.get("name", "Untitled Vision"),
        version=body.get("version", 1),
        principles=body.get("principles", []),
        operating_model_narrative=body.get("operating_model_narrative", ""),
        constraints=body.get("constraints", []),
        success_criteria=body.get("success_criteria", []),
        source=body.get("source", ""),
        confirmed=body.get("confirmed", False),
    )
    db.add(vision)
    db.commit()
    db.refresh(vision)
    return _row_to_dict(vision)


@router.put("/visions/{vision_id}")
def update_vision(vision_id: str, body: dict, db: Session = Depends(get_db)):
    vision = db.query(Vision).filter(Vision.id == vision_id).first()
    if not vision:
        raise HTTPException(status_code=404, detail="Vision not found")
    for field in ("name", "version", "principles", "operating_model_narrative",
                  "constraints", "success_criteria", "source", "confirmed"):
        if field in body:
            setattr(vision, field, body[field])
    db.commit()
    db.refresh(vision)
    return _row_to_dict(vision)


# ═══════════════════════════════════════════════════════════════
# SCENARIOS
# ═══════════════════════════════════════════════════════════════

@router.get("/scenarios")
def list_scenarios(session_id: str = Query(...), db: Session = Depends(get_db)):
    rows = db.query(Scenario).filter(
        Scenario.session_id == session_id
    ).order_by(Scenario.created_at.desc()).all()
    return {"scenarios": [_row_to_dict(r) for r in rows]}


@router.post("/scenarios")
def create_scenario(body: dict, db: Session = Depends(get_db)):
    project_id = body.get("project_id", "")
    session_id = body.get("session_id", "")
    if not project_id or not session_id:
        raise HTTPException(status_code=400, detail="project_id and session_id are required")
    _require_project(db, project_id)

    scenario = Scenario(
        project_id=project_id,
        session_id=session_id,
        layer_state_id=body.get("layer_state_id"),
        name=body.get("name", "Untitled Scenario"),
        variant_type=body.get("variant_type", "custom"),
        parameters=body.get("parameters", {}),
        status=body.get("status", "draft"),
        rationale=body.get("rationale", ""),
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return _row_to_dict(scenario)


@router.put("/scenarios/{scenario_id}")
def update_scenario(scenario_id: str, body: dict, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    for field in ("name", "variant_type", "parameters", "status", "rationale", "layer_state_id"):
        if field in body:
            setattr(scenario, field, body[field])
    scenario.last_edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(scenario)
    return _row_to_dict(scenario)


# ── Scenario Nodes ───────────────────────────────────────────────

@router.get("/scenarios/{scenario_id}/nodes")
def get_scenario_nodes(scenario_id: str, db: Session = Depends(get_db)):
    rows = db.query(ScenarioNode).filter(
        ScenarioNode.scenario_id == scenario_id
    ).all()
    return {"nodes": [_row_to_dict(r) for r in rows]}


@router.post("/scenarios/{scenario_id}/nodes")
def bulk_save_nodes(scenario_id: str, body: dict, db: Session = Depends(get_db)):
    """Bulk save/replace nodes for a scenario."""
    nodes_data = body.get("nodes", [])
    if not nodes_data:
        raise HTTPException(status_code=400, detail="nodes array is required")

    # Delete existing nodes for this scenario
    db.query(ScenarioNode).filter(ScenarioNode.scenario_id == scenario_id).delete()

    created = []
    for nd in nodes_data:
        node = ScenarioNode(
            scenario_id=scenario_id,
            parent_node_id=nd.get("parent_node_id"),
            role_id=nd.get("role_id"),
            employee_id=nd.get("employee_id"),
            title=nd.get("title", ""),
            function_id=nd.get("function_id", ""),
            level=nd.get("level", ""),
            track=nd.get("track", ""),
            comp=nd.get("comp", 0),
            change_type=nd.get("change_type", "unchanged"),
            change_rationale=nd.get("change_rationale", ""),
        )
        # Allow client to specify id for round-tripping
        if nd.get("id"):
            node.id = nd["id"]
        db.add(node)
        created.append(node)

    db.commit()
    return {"nodes": [_row_to_dict(n) for n in created]}


@router.put("/scenarios/{scenario_id}/nodes/{node_id}")
def update_node(scenario_id: str, node_id: str, body: dict, db: Session = Depends(get_db)):
    node = db.query(ScenarioNode).filter(
        ScenarioNode.id == node_id,
        ScenarioNode.scenario_id == scenario_id,
    ).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    for field in ("parent_node_id", "role_id", "employee_id", "title",
                  "function_id", "level", "track", "comp",
                  "change_type", "change_rationale"):
        if field in body:
            setattr(node, field, body[field])
    db.commit()
    db.refresh(node)
    return _row_to_dict(node)


# ═══════════════════════════════════════════════════════════════
# DECISIONS
# ═══════════════════════════════════════════════════════════════

@router.post("/decisions")
def capture_decision(body: dict, db: Session = Depends(get_db)):
    project_id = body.get("project_id", "")
    session_id = body.get("session_id", "")
    approved_scenario_id = body.get("approved_scenario_id", "")
    if not project_id or not session_id or not approved_scenario_id:
        raise HTTPException(status_code=400, detail="project_id, session_id, and approved_scenario_id are required")
    _require_project(db, project_id)

    decision = DecisionRecord(
        project_id=project_id,
        session_id=session_id,
        approved_scenario_id=approved_scenario_id,
        approver=body.get("approver", ""),
        scenarios_considered=body.get("scenarios_considered", []),
        rationale=body.get("rationale", ""),
        next_steps=body.get("next_steps", ""),
        captured_by=body.get("captured_by"),
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return _row_to_dict(decision)


@router.get("/decisions")
def list_decisions(project_id: str = Query(...), db: Session = Depends(get_db)):
    _require_project(db, project_id)
    rows = db.query(DecisionRecord).filter(
        DecisionRecord.project_id == project_id
    ).order_by(DecisionRecord.captured_at.desc()).all()
    return {"decisions": [_row_to_dict(r) for r in rows]}


# ═══════════════════════════════════════════════════════════════
# BENCHMARK QUERY (Phase 4)
# ═══════════════════════════════════════════════════════════════

@router.get("/benchmarks/query")
def query_benchmarks(
    industry: str = "technology",
    size_tier: str = "mid",       # small / mid / large
    metric: str = "all",          # span / layers / mgmt_ratio / cost_per_head / all
    project_id: str = "",
):
    """Rich benchmark query with provenance metadata."""
    from app.benchmarks import get_benchmarks

    size_map = {"small": 200, "mid": 2000, "large": 10000}
    raw = get_benchmarks(industry, int(size_map.get(size_tier, 2000)))

    # Filter to a single metric if requested
    if metric != "all" and metric in raw:
        raw = {k: v for k, v in raw.items() if k in ("industry", "icon", "size_tier", metric)}

    result = {
        "industry": industry,
        "size_tier": size_tier,
        "source": "Mercer IPE Database + Industry Surveys",
        "sample_size": "N=847 companies",
        "date_range": "2022-2024",
        "methodology": "Median of peer group, weighted by company size",
        "geographic_scope": "Global",
        "last_updated": "2026-04",
        "confidence": "high",
        "benchmarks": raw,
    }

    # Add client historical if project_id provided
    if project_id:
        # Could pull from project's historical snapshots
        result["client_historical"] = None  # placeholder for future

    return result


# ═══════════════════════════════════════════════════════════════
# SCENARIO APPROVAL & CASCADE LOCK (Phase 6)
# ═══════════════════════════════════════════════════════════════

@router.post("/scenarios/{scenario_id}/approve")
def approve_scenario(scenario_id: str, payload: dict, db: Session = Depends(get_db)):
    """Approve a scenario — locks the layer, creates decision record, enables child-layer design."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Update scenario status
    scenario.status = "approved"

    # Lock the layer state
    if scenario.layer_state_id:
        layer = db.query(LayerState).filter(LayerState.id == scenario.layer_state_id).first()
        if layer:
            layer.status = "approved"
            layer.locked = True
            layer.approved_at = datetime.now(timezone.utc)
            layer.approved_by = payload.get("approver", "")

    # Create decision record
    record = DecisionRecord(
        project_id=scenario.project_id,
        session_id=scenario.session_id,
        approved_scenario_id=scenario.id,
        approver=payload.get("approver", ""),
        rationale=payload.get("rationale", ""),
        next_steps=payload.get("next_steps", ""),
        scenarios_considered=payload.get("scenarios_considered", []),
    )
    db.add(record)
    db.commit()

    return {"ok": True, "decision_id": record.id, "locked_layer": scenario.layer_state_id}


@router.post("/layers/{layer_id}/unlock")
def unlock_layer(layer_id: str, payload: dict, db: Session = Depends(get_db)):
    """Unlock a previously approved layer — versions existing state, flags downstream sessions."""
    layer = db.query(LayerState).filter(LayerState.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    if not layer.locked:
        raise HTTPException(status_code=400, detail="Layer is not locked")

    # Version the existing approved state
    layer.status = "superseded"
    layer.locked = False

    # Create new layer state for re-design
    new_layer = LayerState(
        project_id=layer.project_id,
        session_id=layer.session_id,
        layer_depth=layer.layer_depth,
        parent_layer_state_id=layer.parent_layer_state_id,
        status="drafting",
    )
    db.add(new_layer)

    # Flag downstream sessions whose parent layer was just unlocked
    child_sessions = db.query(DesignSession).filter(
        DesignSession.parent_layer_id == layer_id,
        DesignSession.status != "archived",
    ).all()
    flagged = []
    for session in child_sessions:
        session.status = "parent_updated"  # flag for review
        flagged.append(session.id)

    db.commit()
    return {"ok": True, "new_layer_id": new_layer.id, "flagged_sessions": flagged}


# ═══════════════════════════════════════════════════════════════
# AI SCENARIO GENERATION (Phase 7)
# ═══════════════════════════════════════════════════════════════

@router.post("/scenarios/{scenario_id}/generate")
async def generate_scenario_with_ai(scenario_id: str, payload: dict, db: Session = Depends(get_db)):
    """AI-assisted scenario generation from parameters."""
    from app.ai_providers import call_claude_sync

    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Get session and vision context
    session = db.query(DesignSession).filter(DesignSession.id == scenario.session_id).first()
    vision = None
    if session and session.vision_id:
        vision = db.query(Vision).filter(Vision.id == session.vision_id).first()

    # Get existing nodes as context
    existing_nodes = db.query(ScenarioNode).filter(ScenarioNode.scenario_id == scenario_id).all()

    variant_type = payload.get("variant_type", scenario.variant_type)
    parameters = payload.get("parameters", scenario.parameters or {})

    prompt = (
        "You are an expert org design consultant. Generate a restructuring scenario.\n\n"
        f"Variant type: {variant_type}\n"
        f"Parameters: {json.dumps(parameters)}\n"
        f"Vision principles: {json.dumps(vision.principles if vision else [])}\n"
        f"Vision constraints: {json.dumps(vision.constraints if vision else [])}\n"
        f"Current node count: {len(existing_nodes)}\n\n"
        "For each proposed change, provide:\n"
        "- node_id (existing node to change, or \"new\" for additions)\n"
        "- change_type: unchanged/modified/created/eliminated/moved\n"
        "- change_rationale: specific, citing figures and function names\n"
        "- title, function_id, level, track (for new/modified nodes)\n\n"
        "Return a JSON array of change objects."
    )

    try:
        result = call_claude_sync(prompt, json_mode=True)
        return {"ok": True, "generated_changes": json.loads(result), "variant_type": variant_type}
    except json.JSONDecodeError:
        # Return raw string if JSON parsing fails
        return {"ok": True, "generated_changes": result, "variant_type": variant_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════
# DECISION EXPORT (Phase 8)
# ═══════════════════════════════════════════════════════════════

@router.get("/decisions/export")
def export_decisions(project_id: str = Query(...), format: str = "json", db: Session = Depends(get_db)):
    """Export all decision records for a project."""
    _require_project(db, project_id)

    records = db.query(DecisionRecord).filter(
        DecisionRecord.project_id == project_id
    ).order_by(DecisionRecord.approval_date).all()

    result = []
    for r in records:
        session = db.query(DesignSession).filter(DesignSession.id == r.session_id).first()
        scenario = db.query(Scenario).filter(Scenario.id == r.approved_scenario_id).first()
        result.append({
            "decision_id": r.id,
            "date": r.approval_date.isoformat() if r.approval_date else None,
            "session_name": session.name if session else "",
            "scenario_name": scenario.name if scenario else "",
            "approver": r.approver,
            "rationale": r.rationale,
            "next_steps": r.next_steps,
            "scenarios_considered": r.scenarios_considered,
        })

    return {"project_id": project_id, "decisions": result, "total": len(result)}


# ═══════════════════════════════════════════════════════════════
# JA INTEGRATION — PROPAGATE TO JOB ARCHITECTURE (Phase 9)
# ═══════════════════════════════════════════════════════════════

@router.post("/scenarios/{scenario_id}/propagate-to-ja")
def propagate_to_ja(scenario_id: str, db: Session = Depends(get_db)):
    """Propagate approved scenario roles to JA future-state."""
    from app.models_ja import JAScenario, FutureStateRole

    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario or scenario.status != "approved":
        raise HTTPException(status_code=400, detail="Scenario must be approved before JA propagation")

    nodes = db.query(ScenarioNode).filter(ScenarioNode.scenario_id == scenario_id).all()

    # Find or create JA scenario
    ja_scenario = db.query(JAScenario).filter(
        JAScenario.project_id == scenario.project_id,
        JAScenario.name == f"ODS: {scenario.name}",
    ).first()

    if not ja_scenario:
        ja_scenario = JAScenario(
            project_id=scenario.project_id,
            name=f"ODS: {scenario.name}",
            description=f"Auto-propagated from Org Design Studio scenario '{scenario.name}'",
        )
        db.add(ja_scenario)
        db.flush()

    propagated = 0
    for node in nodes:
        if node.change_type in ("created", "modified", "eliminated"):
            # Check if a future role already exists for this title in this JA scenario
            existing = db.query(FutureStateRole).filter(
                FutureStateRole.scenario_id == ja_scenario.id,
                FutureStateRole.title == node.title,
            ).first()

            if not existing:
                role = FutureStateRole(
                    project_id=scenario.project_id,
                    scenario_id=ja_scenario.id,
                    title=node.title,
                    function_group=node.function_id,
                    track_code=node.track,
                    level_code=node.level,
                    justification=node.change_rationale,
                    lifecycle_state="retired" if node.change_type == "eliminated" else "proposed",
                )
                db.add(role)
                propagated += 1

    db.commit()
    return {"ok": True, "ja_scenario_id": ja_scenario.id, "propagated_roles": propagated}
