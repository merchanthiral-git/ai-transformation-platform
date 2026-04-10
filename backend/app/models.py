"""Pydantic models for request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional


# ── Health ──
class HealthResponse(BaseModel):
    status: str
    models: list[str] = []
    last_loaded: Optional[str] = None


# ── Models / Upload ──
class ModelsResponse(BaseModel):
    models: list[str] = []
    last_loaded: Optional[str] = None


class UploadResponse(BaseModel):
    sheets_loaded: int = 0
    active_model: str = ""
    jobs: list[str] = []
    models: list[str] = []


class ResetResponse(BaseModel):
    ok: bool = True


# ── Filter params (reusable) ──
class FilterParams(BaseModel):
    func: str = "All"
    jf: str = "All"
    sf: str = "All"
    cl: str = "All"


# ── Overview ──
class OverviewKpis(BaseModel):
    employees: int = 0
    roles: int = 0
    tasks_mapped: int = 0
    avg_span: float = 0.0
    high_ai_pct: float = 0.0
    readiness_score: int = 0
    readiness_tier: str = ""


# ── Diagnose ──
class AIPrioritySummary(BaseModel):
    tasks_scored: int = 0
    quick_wins: int = 0
    total_time_impact: float = 0.0
    avg_risk: float = 0.0


class DataQualitySummary(BaseModel):
    ready: int = 0
    missing: int = 0
    total_issues: int = 0
    avg_completeness: int = 0


class OrgKpis(BaseModel):
    total: int = 0
    managers: int = 0
    ics: int = 0
    avg_span: float = 0.0
    max_span: int = 0
    layers: int = 0


# ── Design ──
class ReconstructionRequest(BaseModel):
    tasks: list[dict] = []
    scenario: str = "Balanced"


class JobContextKpis(BaseModel):
    hours_week: float = 0.0
    tasks: int = 0
    workstreams: int = 0
    released_hrs: float = 0.0
    released_pct: float = 0.0
    future_hrs: float = 0.0
    evolution: str = ""


# ── Simulate ──
class ReadinessResponse(BaseModel):
    score: int = 0
    total: int = 0
    tier: str = ""
    dimensions: dict = {}
    dims: dict = {}


# ── AI Generate ──
class AIGenerateRequest(BaseModel):
    system: str = Field(..., min_length=1, max_length=2000)
    message: str = Field(..., min_length=1, max_length=10000)


class AIGenerateResponse(BaseModel):
    text: str = ""
    error: Optional[str] = None


# ── Upload validation ──
ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
REQUIRED_COLUMNS_BY_TYPE = {
    "workforce": ["Employee ID", "Employee Name"],
    "work_design": ["Job Title", "Task Name"],
    "job_catalog": ["Job Title"],
    "market_data": ["Job Match Key"],
}
