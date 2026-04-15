"""Decision persistence API — logs decisions across modules and locks scenarios."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/decisions", tags=["decisions"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "decisions"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _decisions_path(model_id: str) -> Path:
    safe = model_id.replace("/", "_").replace("..", "_")
    return DATA_DIR / f"{safe}.json"


def _scenario_path(model_id: str) -> Path:
    safe = model_id.replace("/", "_").replace("..", "_")
    return DATA_DIR / f"{safe}_scenario.json"


def _load_json(path: Path, default=None):
    if default is None:
        default = []
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


# ── POST /api/decisions/{model_id} — log a decision ──
@router.post("/{model_id}")
def log_decision(model_id: str, body: dict):
    module = body.get("module", "")
    action = body.get("action", "")
    detail = body.get("detail", "")
    metadata = body.get("metadata", {})

    if not module or not action:
        raise HTTPException(status_code=400, detail="module and action are required")

    entry = {
        "id": uuid.uuid4().hex[:12],
        "ts": datetime.now(timezone.utc).isoformat(),
        "module": module,
        "action": action,
        "detail": detail,
        "metadata": metadata,
    }

    path = _decisions_path(model_id)
    decisions = _load_json(path, [])
    decisions.append(entry)
    _save_json(path, decisions)

    return {"ok": True, "decision": entry}


# ── GET /api/decisions/{model_id} — get all decisions for a model ──
@router.get("/{model_id}")
def get_decisions(model_id: str):
    path = _decisions_path(model_id)
    decisions = _load_json(path, [])
    return {"decisions": decisions}


# ── POST /api/decisions/{model_id}/scenario — lock a scenario ──
@router.post("/{model_id}/scenario")
def lock_scenario(model_id: str, body: dict):
    scenario_name = body.get("scenario_name", "")
    scenario_data = body.get("scenario_data", {})

    if not scenario_name:
        raise HTTPException(status_code=400, detail="scenario_name is required")

    payload = {
        "scenario_name": scenario_name,
        "scenario_data": scenario_data,
        "locked_at": datetime.now(timezone.utc).isoformat(),
    }

    path = _scenario_path(model_id)
    _save_json(path, payload)

    return {"ok": True, "scenario": payload}


# ── GET /api/decisions/{model_id}/scenario — get locked scenario ──
@router.get("/{model_id}/scenario")
def get_locked_scenario(model_id: str):
    path = _scenario_path(model_id)
    if not path.exists():
        return None
    return _load_json(path, None)
