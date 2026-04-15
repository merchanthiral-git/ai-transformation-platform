"""Job Content Authoring Module — governed, AI-assisted job descriptions.

Implements persistence (JSON file-backed) and Phase 1-6 endpoints with
full Phase 3 (Definitions & Leveling) functionality.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException
from app.shared import _safe

router = APIRouter(prefix="/api", tags=["job-content"])

def _id(): return str(uuid.uuid4())[:12]
def _now(): return datetime.utcnow().isoformat()

# ── Persistence Layer ──
_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "job_content"
_DATA_DIR.mkdir(parents=True, exist_ok=True)

def _load_json(filename, default=None):
    path = _DATA_DIR / filename
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)
    return default if default is not None else {}

def _save_json(filename, data):
    path = _DATA_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)

# Load on startup, save on every mutation
_taxonomy: dict = _load_json("taxonomy.json", {})
_definitions: dict = _load_json("definitions.json", {})
_leveling: dict = _load_json("leveling.json", {})
_themes: dict = _load_json("themes.json", {})
_verb_libs: dict = _load_json("verbs.json", {})
_content: dict = _load_json("content.json", {})
_templates: dict = _load_json("templates.json", {})
_phase_status: dict = _load_json("phase_status.json", {
    "1": "not_started", "2": "not_started", "3": "not_started",
    "4": "not_started", "5": "not_started", "6": "not_started",
})
_feedback: dict = _load_json("feedback.json", {})
_normalization: dict = _load_json("normalization.json", {})

# Default themes by archetype (Phase 4 defaults)
DEFAULT_THEMES = {
    "technology": [
        {"name": "Technical Complexity", "description": "The sophistication and scope of technical problems the role addresses."},
        {"name": "Autonomy & Judgment", "description": "The degree of independent decision-making and escalation authority."},
        {"name": "Stakeholder Engagement", "description": "Who the role interacts with and the nature of influence."},
        {"name": "Delivery Scope", "description": "The breadth and impact of work products."},
        {"name": "Knowledge & Expertise", "description": "Depth and specialization of domain knowledge required."},
        {"name": "Leadership & Development", "description": "Mentoring, coaching, and team-building responsibilities."},
    ],
    "operations": [
        {"name": "Process Complexity", "description": "The complexity and variability of operational processes managed."},
        {"name": "Decision Authority", "description": "Scope of decisions and escalation thresholds."},
        {"name": "Coordination & Communication", "description": "Cross-functional coordination and stakeholder management."},
        {"name": "Quality & Compliance", "description": "Standards adherence, quality control, and regulatory compliance."},
        {"name": "Resource Management", "description": "Management of budgets, tools, and operational resources."},
        {"name": "Continuous Improvement", "description": "Identification and implementation of process improvements."},
    ],
    "client_facing": [
        {"name": "Client Relationship Depth", "description": "Seniority and complexity of client relationships managed."},
        {"name": "Revenue Responsibility", "description": "Revenue targets, pipeline management, and commercial accountability."},
        {"name": "Solution Complexity", "description": "Sophistication of solutions designed and delivered."},
        {"name": "Market Knowledge", "description": "Industry expertise and competitive awareness."},
        {"name": "Negotiation & Influence", "description": "Ability to negotiate outcomes and influence stakeholders."},
        {"name": "Team & Practice Development", "description": "Building capability and developing junior professionals."},
    ],
    "default": [
        {"name": "Task Complexity", "description": "The sophistication and variability of work performed."},
        {"name": "Autonomy & Decision-Making", "description": "Level of independent judgment exercised."},
        {"name": "Communication & Stakeholders", "description": "Breadth and seniority of interactions."},
        {"name": "Scope of Impact", "description": "Organizational reach of work outputs."},
        {"name": "Knowledge Requirements", "description": "Depth and breadth of expertise required."},
    ],
}

# Default verb pools by track (Phase 4 defaults)
DEFAULT_VERBS = {
    "P": {
        "entry": ["Executes", "Supports", "Assists", "Follows", "Participates", "Prepares", "Documents", "Applies", "Completes", "Learns"],
        "mid": ["Develops", "Analyzes", "Designs", "Implements", "Evaluates", "Contributes", "Recommends", "Coordinates", "Resolves", "Mentors"],
        "senior": ["Architects", "Establishes", "Drives", "Leads", "Defines", "Influences", "Pioneers", "Governs", "Shapes", "Advances", "Transforms", "Advises"],
    },
    "T": {
        "entry": ["Executes", "Supports", "Implements", "Follows", "Tests", "Prepares", "Documents", "Builds", "Deploys", "Learns"],
        "mid": ["Develops", "Designs", "Architects", "Optimizes", "Evaluates", "Integrates", "Refactors", "Automates", "Mentors", "Troubleshoots"],
        "senior": ["Pioneers", "Establishes", "Defines", "Leads", "Innovates", "Governs", "Shapes", "Transforms", "Advises", "Evangelizes"],
    },
    "S": {
        "entry": ["Performs", "Supports", "Assists", "Follows", "Completes", "Processes", "Maintains", "Documents", "Prepares", "Responds"],
        "mid": ["Coordinates", "Manages", "Trains", "Resolves", "Improves", "Monitors", "Facilitates", "Implements", "Reviews", "Streamlines"],
        "senior": ["Leads", "Oversees", "Designs", "Establishes", "Mentors", "Optimizes", "Administers", "Governs", "Standardizes", "Transforms"],
    },
    "M": {
        "entry": ["Manages", "Supervises", "Coordinates", "Delegates", "Monitors", "Coaches", "Assigns", "Reviews", "Facilitates", "Plans"],
        "mid": ["Directs", "Oversees", "Establishes", "Governs", "Champions", "Stewards", "Orchestrates", "Sponsors", "Authorizes", "Cultivates"],
        "senior": ["Sets", "Mandates", "Shapes", "Transforms", "Drives", "Sponsors", "Governs", "Defines", "Architects", "Establishes"],
    },
    "E": {
        "entry": ["Directs", "Oversees", "Establishes", "Sponsors", "Governs", "Champions", "Stewards", "Defines", "Shapes", "Drives"],
        "mid": ["Sets", "Mandates", "Transforms", "Pioneers", "Architects", "Authorizes", "Governs", "Defines", "Shapes", "Champions"],
        "senior": ["Sets", "Mandates", "Transforms", "Pioneers", "Shapes", "Defines", "Governs", "Drives", "Architects", "Champions"],
    },
}

# ═══ PHASE STATUS TRACKING ═══

@router.get("/job-content/phases")
def get_phases():
    return _safe({"phases": _phase_status})

@router.put("/job-content/phases/{phase_id}")
async def update_phase(phase_id: str, request: Request):
    body = await request.json()
    _phase_status[phase_id] = body.get("status", "not_started")
    _save_json("phase_status.json", _phase_status)
    return _safe({"phase": phase_id, "status": _phase_status[phase_id]})

# ═══ PHASE 1: DISCOVERY ═══

@router.post("/job-content/discovery/normalize")
async def normalize_titles(request: Request):
    """AI-powered title normalization."""
    body = await request.json()
    titles = body.get("titles", [])
    # Simple dedup + cleanup. AI enhancement comes later.
    normalized = {}
    for t in titles:
        clean = t.strip().title()
        key = clean.lower().replace("sr.", "senior").replace("jr.", "junior").replace("mgr", "manager")
        if key not in normalized:
            normalized[key] = {"normalized_title": clean, "raw_titles": [t], "confidence": 0.9, "status": "suggested"}
        else:
            normalized[key]["raw_titles"].append(t)
    results = list(normalized.values())
    _normalization.update({r["normalized_title"]: r for r in results})
    _save_json("normalization.json", _normalization)
    return _safe({"results": results, "raw_count": len(titles), "normalized_count": len(results)})

# ═══ PHASE 2: TAXONOMY / ARCHITECTURE CRUD ═══

@router.get("/job-content/taxonomy")
def list_taxonomy():
    nodes = sorted(_taxonomy.values(), key=lambda x: (x.get("type", ""), x.get("display_order", 0)))
    # Build tree structure
    groups = [n for n in nodes if n.get("type") == "group"]
    for g in groups:
        g["children"] = [n for n in nodes if n.get("type") == "family" and n.get("parent_id") == g["id"]]
        for fam in g["children"]:
            fam["children"] = [n for n in nodes if n.get("type") == "sub_family" and n.get("parent_id") == fam["id"]]
            for sf in fam["children"]:
                sf["themes"] = [t for t in _themes.values() if t.get("sub_family_id") == sf["id"]]
                sf["theme_count"] = len(sf["themes"])
                sf["content_count"] = len([c for c in _content.values() if c.get("sub_family_id") == sf["id"] and c.get("is_finalized")])
                sf["has_verbs"] = any(v.get("sub_family_id") == sf["id"] for v in _verb_libs.values())
                sf["status"] = "complete" if sf["content_count"] > 0 else "in_progress" if sf["theme_count"] >= 5 else "not_started"
    return _safe({"tree": groups, "flat": nodes, "total": len(nodes)})

@router.post("/job-content/taxonomy")
async def create_taxonomy_node(request: Request):
    body = await request.json()
    nid = _id()
    node = {
        "id": nid, "type": body.get("type", "group"), "parent_id": body.get("parent_id"),
        "name": body.get("name", ""), "definition": body.get("definition", ""),
        "applicable_tracks": body.get("applicable_tracks", ["S", "P", "T", "M", "E"]),
        "display_order": body.get("display_order", len(_taxonomy)),
        "boundary_rationale": body.get("boundary_rationale", ""),
        "role_ids": body.get("role_ids", []),
    }
    _taxonomy[nid] = node
    _save_json("taxonomy.json", _taxonomy)
    return _safe(node)

@router.put("/job-content/taxonomy/{node_id}")
async def update_taxonomy_node(node_id: str, request: Request):
    if node_id not in _taxonomy:
        raise HTTPException(404, "Node not found")
    body = await request.json()
    _taxonomy[node_id].update({k: v for k, v in body.items() if k != "id"})
    _save_json("taxonomy.json", _taxonomy)
    return _safe(_taxonomy[node_id])

@router.delete("/job-content/taxonomy/{node_id}")
def delete_taxonomy_node(node_id: str):
    node = _taxonomy.pop(node_id, None)
    if not node:
        raise HTTPException(404, "Node not found")
    # Cascade delete children
    children = [nid for nid, n in list(_taxonomy.items()) if n.get("parent_id") == node_id]
    for cid in children:
        _taxonomy.pop(cid, None)
    _save_json("taxonomy.json", _taxonomy)
    return _safe({"deleted": True})

# Architecture balance scorecard

@router.get("/job-content/architecture/balance")
def get_balance():
    """Balance scorecard for the current taxonomy."""
    families = [n for n in _taxonomy.values() if n.get("type") == "family"]
    sub_families = [n for n in _taxonomy.values() if n.get("type") == "sub_family"]
    roles_per_family = {}
    for sf in sub_families:
        parent = sf.get("parent_id", "")
        roles_per_family.setdefault(parent, 0)
        roles_per_family[parent] += len(sf.get("role_ids", []))
    counts = list(roles_per_family.values()) or [0]
    avg = sum(counts) / max(len(counts), 1)
    return _safe({
        "families": len(families),
        "sub_families": len(sub_families),
        "avg_roles_per_family": round(avg, 1),
        "min_roles": min(counts) if counts else 0,
        "max_roles": max(counts) if counts else 0,
        "imbalanced": [f["name"] for f in families if roles_per_family.get(f.get("id", ""), 0) > avg * 2.5],
    })

# ═══ PHASE 3: DEFINITIONS & LEVELING ═══

# ─── Definitions (per family and sub-family) ───

@router.get("/job-content/definitions")
def list_definitions():
    """All definitions with their node info."""
    results = []
    for node_id, defn in _definitions.items():
        node = _taxonomy.get(node_id, {})
        results.append({
            "node_id": node_id,
            "node_name": node.get("name", ""),
            "node_type": node.get("type", ""),
            "has_purpose": bool(defn.get("purpose_statement")),
            "has_scope": bool(defn.get("scope_narrative")),
            "has_characteristics": len(defn.get("distinguishing_characteristics", [])) > 0,
            "themes_count": len(defn.get("core_competency_themes", [])),
            "status": defn.get("status", "draft"),
        })
    return _safe({"definitions": results, "total": len(results)})

@router.get("/job-content/definitions/{node_id}")
def get_definition(node_id: str):
    defn = _definitions.get(node_id, {})
    node = _taxonomy.get(node_id, {})
    return _safe({
        "node_id": node_id,
        "node_name": node.get("name", ""),
        "node_type": node.get("type", ""),
        "purpose_statement": defn.get("purpose_statement", ""),
        "scope_narrative": defn.get("scope_narrative", ""),
        "distinguishing_characteristics": defn.get("distinguishing_characteristics", []),
        "core_competency_themes": defn.get("core_competency_themes", []),
        "leveling_exceptions": defn.get("leveling_exceptions", ""),
        "status": defn.get("status", "draft"),
    })

@router.put("/job-content/definitions/{node_id}")
async def update_definition(node_id: str, request: Request):
    body = await request.json()
    if node_id not in _definitions:
        _definitions[node_id] = {}
    _definitions[node_id].update({k: v for k, v in body.items() if k != "node_id"})
    _definitions[node_id]["updated_at"] = _now()
    _save_json("definitions.json", _definitions)
    return _safe(_definitions[node_id])

# ─── AI Drafting for definitions ───

@router.post("/job-content/definitions/{node_id}/draft")
async def draft_definition(node_id: str, request: Request):
    """AI-draft a definition for a family or sub-family."""
    body = await request.json()
    field = body.get("field", "purpose_statement")
    node = _taxonomy.get(node_id, {})
    node_name = node.get("name", "Unknown")
    node_type = node.get("type", "family")

    # Gather context
    parent = _taxonomy.get(node.get("parent_id", ""), {})
    parent_def = _definitions.get(node.get("parent_id", ""), {})
    siblings = [n for n in _taxonomy.values() if n.get("parent_id") == node.get("parent_id") and n.get("id") != node_id]
    sibling_defs = {s.get("id"): _definitions.get(s.get("id", ""), {}) for s in siblings}
    children = [n for n in _taxonomy.values() if n.get("parent_id") == node_id]
    roles = node.get("role_ids", [])
    boundary = node.get("boundary_rationale", "")

    prompts = {
        "purpose_statement": f"""Write a 2-3 sentence purpose statement for the {node_type} "{node_name}".
Context: This {node_type} is part of {parent.get('name', 'the organization')}.
{f'Boundary rationale: {boundary}' if boundary else ''}
{f'Roles in this group: {", ".join(roles[:15])}' if roles else ''}
{f'Sibling {node_type}s: {", ".join(s.get("name","") for s in siblings[:8])}' if siblings else ''}
Write a clear, specific statement explaining WHY this group exists and what VALUE it delivers. Use present tense. Be specific to this group, not generic.""",

        "scope_narrative": f"""Write a 3-5 sentence scope narrative for the {node_type} "{node_name}".
{f'Purpose: {_definitions.get(node_id, {}).get("purpose_statement", "")}' if _definitions.get(node_id, {}).get("purpose_statement") else ''}
{f'Roles: {", ".join(roles[:15])}' if roles else ''}
Describe the BREADTH of work covered — what functions, processes, and domains fall within this group. Be specific.""",

        "distinguishing_characteristics": f"""Write 3-4 bullet points describing what makes the {node_type} "{node_name}" DIFFERENT from its siblings.
Siblings: {", ".join(f'{s.get("name","")}: {sibling_defs.get(s.get("id",""), {}).get("purpose_statement", "no definition yet")}' for s in siblings[:5])}
{f'Purpose of {node_name}: {_definitions.get(node_id, {}).get("purpose_statement", "")}' if _definitions.get(node_id, {}).get("purpose_statement") else ''}
Each bullet should clearly state what THIS group does that its siblings do NOT. Return as a JSON array of strings.""",

        "core_competency_themes": f"""Identify 5-7 core competency themes for the {node_type} "{node_name}".
{f'Purpose: {_definitions.get(node_id, {}).get("purpose_statement", "")}' if _definitions.get(node_id, {}).get("purpose_statement") else ''}
{f'Scope: {_definitions.get(node_id, {}).get("scope_narrative", "")}' if _definitions.get(node_id, {}).get("scope_narrative") else ''}
{f'Roles: {", ".join(roles[:15])}' if roles else ''}
These themes are the major capability dimensions that define excellence in this group. They will be used to structure job descriptions at every level.
Return as a JSON array of objects: [{{"name": "Theme Name", "description": "1-2 sentence description"}}]""",
    }

    prompt = prompts.get(field, prompts["purpose_statement"])

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            prompt,
            system="You are an expert organizational design consultant specializing in job architecture. Write precise, consultancy-grade content.",
            max_tokens=1024,
        )

        # Parse based on field type
        if field == "distinguishing_characteristics":
            clean = raw.strip()
            if clean.startswith("["):
                result = json.loads(clean)
            else:
                result = [line.strip().lstrip("•-0123456789.) ") for line in clean.split("\n") if line.strip() and len(line.strip()) > 10]
        elif field == "core_competency_themes":
            clean = raw.strip()
            if "```" in clean:
                clean = clean.split("```")[1].replace("json", "").strip()
            try:
                result = json.loads(clean)
            except Exception:
                result = [{"name": line.strip().lstrip("•-0123456789.) "), "description": ""} for line in clean.split("\n") if line.strip() and len(line.strip()) > 5]
        else:
            result = raw.strip()

        return _safe({"field": field, "draft": result, "node_id": node_id})
    except Exception as e:
        # Fallback
        fallbacks = {
            "purpose_statement": f"The {node_name} {node_type} is responsible for delivering specialized expertise and outcomes within {parent.get('name', 'the organization')}.",
            "scope_narrative": f"This {node_type} encompasses all functions, processes, and domains related to {node_name}.",
            "distinguishing_characteristics": [f"Focuses specifically on {node_name} domain expertise", f"Distinct career progression from sibling {node_type}s"],
            "core_competency_themes": [
                {"name": "Domain Expertise", "description": f"Deep knowledge in {node_name}"},
                {"name": "Stakeholder Management", "description": "Engaging internal and external stakeholders"},
                {"name": "Process Excellence", "description": "Continuous improvement of core processes"},
                {"name": "Technical Acumen", "description": "Mastery of tools and methodologies"},
                {"name": "Leadership", "description": "Guiding and developing team members"},
            ],
        }
        return _safe({"field": field, "draft": fallbacks.get(field, ""), "node_id": node_id, "note": f"AI unavailable: {str(e)[:80]}"})

# ─── Sibling Overlap Check ───

@router.post("/job-content/definitions/check-overlap")
async def check_sibling_overlap(request: Request):
    """AI checks whether sibling definitions are meaningfully distinct."""
    body = await request.json()
    node_ids = body.get("node_ids", [])
    siblings = [(nid, _taxonomy.get(nid, {}), _definitions.get(nid, {})) for nid in node_ids]

    if len(siblings) < 2:
        return _safe({"findings": [], "score": 100})

    context = "\n".join(
        f"- {n.get('name', '?')}: Purpose: {d.get('purpose_statement', 'not defined')}. Scope: {d.get('scope_narrative', 'not defined')}"
        for _, n, d in siblings
    )

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            f"Analyze these sibling sub-families for overlap:\n{context}\n\nIdentify any overlapping scope or unclear boundaries. Return a JSON array of findings: [{{\"finding\": \"description\", \"severity\": \"high|medium|low\", \"nodes_involved\": [\"name1\", \"name2\"]}}]",
            system="You are a job architecture reviewer. Be specific about overlaps.",
            max_tokens=1024,
        )
        clean = raw.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip()
        findings = json.loads(clean) if clean.startswith("[") else []
        score = max(0, 100 - len([f for f in findings if f.get("severity") == "high"]) * 25 - len([f for f in findings if f.get("severity") == "medium"]) * 10)
        return _safe({"findings": findings, "score": score})
    except Exception:
        return _safe({"findings": [], "score": 100, "note": "AI unavailable"})

# ─── Upward Coherence Check ───

@router.post("/job-content/definitions/check-coherence")
async def check_upward_coherence(request: Request):
    """Check if sub-family definitions fit under the parent family."""
    body = await request.json()
    family_id = body.get("family_id", "")
    family = _taxonomy.get(family_id, {})
    family_def = _definitions.get(family_id, {})
    children = [n for n in _taxonomy.values() if n.get("parent_id") == family_id]
    child_defs = [(c, _definitions.get(c.get("id", ""), {})) for c in children]

    if not family_def.get("purpose_statement") or not child_defs:
        return _safe({"findings": [], "score": 100})

    context = f"Family: {family.get('name', '')}\nPurpose: {family_def.get('purpose_statement', '')}\n\nSub-families:\n"
    context += "\n".join(f"- {c.get('name', '')}: {d.get('purpose_statement', 'not defined')}" for c, d in child_defs)

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            f"{context}\n\nDoes the family purpose logically encompass ALL sub-families? Identify any sub-families that don't fit. Return JSON: [{{\"finding\": \"description\", \"sub_family\": \"name\", \"severity\": \"high|medium|low\"}}]",
            system="You are a job architecture reviewer.",
            max_tokens=1024,
        )
        clean = raw.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip()
        findings = json.loads(clean) if clean.startswith("[") else []
        return _safe({"findings": findings, "score": max(0, 100 - len(findings) * 20)})
    except Exception:
        return _safe({"findings": [], "score": 100, "note": "AI unavailable"})

# ─── Leveling Framework ───

@router.get("/job-content/leveling")
def get_leveling():
    return _safe(_leveling or {"tracks": [], "dimensions": ["Scope", "Autonomy", "Stakeholder Level", "Time Horizon", "Complexity", "Impact"]})

@router.put("/job-content/leveling")
async def update_leveling(request: Request):
    body = await request.json()
    _leveling.update(body)
    _leveling["updated_at"] = _now()
    _save_json("leveling.json", _leveling)
    return _safe(_leveling)

@router.post("/job-content/leveling/draft")
async def draft_leveling(request: Request):
    """AI-draft a leveling framework."""
    body = await request.json()
    industry = body.get("industry", "technology")
    org_size = body.get("org_size", "mid")
    tracks = body.get("tracks", ["S", "P", "T", "M", "E"])

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            f"""Design a career leveling framework for a {org_size}-cap {industry} company.
Tracks: {', '.join(tracks)}
For each track, define levels with these calibration dimensions:
- Scope: breadth of impact
- Autonomy: direction vs independence
- Stakeholder Level: who they interact with
- Time Horizon: planning timeframe
- Complexity: ambiguity and problem difficulty
- Impact: organizational consequence

Return JSON: {{"tracks": [{{"code": "P", "name": "Professional", "levels": [{{"code": "P1", "title": "Associate", "scope": "...", "autonomy": "...", "stakeholder_level": "...", "time_horizon": "...", "complexity": "...", "impact": "..."}}]}}]}}""",
            system="You are an expert in job architecture and career framework design.",
            max_tokens=4096,
        )
        clean = raw.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip()
        framework = json.loads(clean)
        return _safe({"framework": framework})
    except Exception as e:
        # Generate a default framework
        default_tracks = []
        track_configs = {
            "S": {"name": "Support", "count": 4, "titles": ["Associate", "Senior Associate", "Specialist", "Senior Specialist"]},
            "P": {"name": "Professional", "count": 6, "titles": ["Analyst", "Senior Analyst", "Specialist", "Senior Specialist", "Principal", "Distinguished"]},
            "T": {"name": "Technical", "count": 6, "titles": ["Engineer I", "Engineer II", "Senior Engineer", "Staff Engineer", "Principal Engineer", "Distinguished Engineer"]},
            "M": {"name": "Management", "count": 5, "titles": ["Team Lead", "Manager", "Senior Manager", "Director", "Senior Director"]},
            "E": {"name": "Executive", "count": 4, "titles": ["Vice President", "Senior VP", "EVP", "C-Suite"]},
        }
        scopes = ["Own tasks", "Own deliverables", "Team/project", "Department", "Function", "Enterprise", "Industry"]
        autonomy = ["Close supervision", "General direction", "Broad guidance", "Self-directed", "Sets direction", "Sets strategy"]
        stakeholders = ["Immediate team", "Cross-team", "Department leaders", "Senior leadership", "Executive team", "Board/external"]
        horizons = ["Daily/weekly", "Monthly", "Quarterly", "Annual", "Multi-year", "Strategic horizon"]
        complexity = ["Routine", "Standard with some variation", "Complex", "Highly complex", "Ambiguous/novel", "Enterprise-wide transformation"]
        impact = ["Task completion", "Deliverable quality", "Project outcomes", "Function performance", "Business unit results", "Enterprise direction"]

        for t in tracks:
            cfg = track_configs.get(t, {"name": t, "count": 4, "titles": [f"Level {i}" for i in range(1, 5)]})
            levels = []
            for i in range(cfg["count"]):
                levels.append({
                    "code": f"{t}{i+1}",
                    "title": cfg["titles"][i] if i < len(cfg["titles"]) else f"Level {i+1}",
                    "scope": scopes[min(i, len(scopes) - 1)],
                    "autonomy": autonomy[min(i, len(autonomy) - 1)],
                    "stakeholder_level": stakeholders[min(i, len(stakeholders) - 1)],
                    "time_horizon": horizons[min(i, len(horizons) - 1)],
                    "complexity": complexity[min(i, len(complexity) - 1)],
                    "impact": impact[min(i, len(impact) - 1)],
                })
            default_tracks.append({"code": t, "name": cfg["name"], "levels": levels})
        return _safe({"framework": {"tracks": default_tracks}, "note": f"AI unavailable: {str(e)[:80]}"})

# ═══ PHASE 4: THEMES CRUD ═══

@router.get("/job-content/themes/{sub_family_id}")
def get_themes(sub_family_id: str):
    themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sub_family_id], key=lambda x: x.get("display_order", 0))
    return _safe({"themes": themes, "count": len(themes), "sub_family_id": sub_family_id})

@router.post("/job-content/themes")
async def create_theme(request: Request):
    body = await request.json()
    sf_id = body.get("sub_family_id", "")
    existing = [t for t in _themes.values() if t.get("sub_family_id") == sf_id]
    if len(existing) >= 7:
        raise HTTPException(400, "Maximum 7 themes per sub-family")
    tid = _id()
    theme = {"id": tid, "sub_family_id": sf_id, "name": body.get("name", ""), "description": body.get("description", ""), "display_order": body.get("display_order", len(existing))}
    _themes[tid] = theme
    _save_json("themes.json", _themes)
    return _safe(theme)

@router.put("/job-content/themes/{theme_id}")
async def update_theme(theme_id: str, request: Request):
    if theme_id not in _themes:
        raise HTTPException(404, "Theme not found")
    body = await request.json()
    _themes[theme_id].update({k: v for k, v in body.items() if k != "id"})
    _save_json("themes.json", _themes)
    return _safe(_themes[theme_id])

@router.delete("/job-content/themes/{theme_id}")
def delete_theme(theme_id: str):
    theme = _themes.pop(theme_id, None)
    if not theme:
        raise HTTPException(404, "Theme not found")
    # Delete associated content
    to_del = [cid for cid, c in _content.items() if c.get("theme_id") == theme_id]
    for cid in to_del:
        _content.pop(cid, None)
    _save_json("themes.json", _themes)
    if to_del:
        _save_json("content.json", _content)
    return _safe({"deleted": True, "content_deleted": len(to_del)})

@router.post("/job-content/themes/defaults")
async def apply_default_themes(request: Request):
    """Apply default theme set based on archetype."""
    body = await request.json()
    sf_id = body.get("sub_family_id", "")
    archetype = body.get("archetype", "default")
    defaults = DEFAULT_THEMES.get(archetype, DEFAULT_THEMES["default"])
    created = []
    for i, d in enumerate(defaults):
        tid = _id()
        theme = {"id": tid, "sub_family_id": sf_id, "name": d["name"], "description": d["description"], "display_order": i}
        _themes[tid] = theme
        created.append(theme)
    _save_json("themes.json", _themes)
    return _safe({"themes": created, "count": len(created)})

# ═══ VERB LIBRARY CRUD ═══

@router.get("/job-content/verbs/{sub_family_id}")
def get_verbs(sub_family_id: str, track: str = None):
    verbs = [v for v in _verb_libs.values() if v.get("sub_family_id") == sub_family_id]
    if track:
        verbs = [v for v in verbs if v.get("track") == track]
    verbs.sort(key=lambda x: (x.get("track", ""), x.get("band", "")))
    return _safe({"verbs": verbs, "sub_family_id": sub_family_id})

@router.post("/job-content/verbs")
async def create_verb_entry(request: Request):
    body = await request.json()
    vid = _id()
    entry = {"id": vid, "sub_family_id": body.get("sub_family_id", ""), "track": body.get("track", "P"), "band": body.get("band", "mid"), "verbs": body.get("verbs", [])}
    _verb_libs[vid] = entry
    _save_json("verbs.json", _verb_libs)
    return _safe(entry)

@router.put("/job-content/verbs/{verb_id}")
async def update_verb_entry(verb_id: str, request: Request):
    if verb_id not in _verb_libs:
        raise HTTPException(404, "Verb entry not found")
    body = await request.json()
    _verb_libs[verb_id].update({k: v for k, v in body.items() if k != "id"})
    _save_json("verbs.json", _verb_libs)
    return _safe(_verb_libs[verb_id])

@router.delete("/job-content/verbs/{verb_id}")
def delete_verb_entry(verb_id: str):
    deleted = bool(_verb_libs.pop(verb_id, None))
    if deleted:
        _save_json("verbs.json", _verb_libs)
    return _safe({"deleted": deleted})

@router.post("/job-content/verbs/defaults")
async def apply_default_verbs(request: Request):
    """Apply default verb library for a track."""
    body = await request.json()
    sf_id = body.get("sub_family_id", "")
    track = body.get("track", "P")
    defaults = DEFAULT_VERBS.get(track, DEFAULT_VERBS["P"])
    created = []
    for band, verbs in defaults.items():
        vid = _id()
        entry = {"id": vid, "sub_family_id": sf_id, "track": track, "band": band, "verbs": verbs}
        _verb_libs[vid] = entry
        created.append(entry)
    _save_json("verbs.json", _verb_libs)
    return _safe({"verbs": created, "track": track})

# ═══ CONTENT CRUD ═══

@router.get("/job-content/content/{sub_family_id}")
def get_content(sub_family_id: str, track: str = None, level: str = None):
    items = [c for c in _content.values() if c.get("sub_family_id") == sub_family_id]
    if track:
        items = [c for c in items if c.get("track") == track]
    if level:
        items = [c for c in items if c.get("level") == level]
    items.sort(key=lambda x: (x.get("track", ""), x.get("level", ""), x.get("display_order", 0)))
    return _safe({"content": items, "count": len(items)})

@router.post("/job-content/content")
async def save_content(request: Request):
    body = await request.json()
    cid = body.get("id", _id())
    entry = {
        "id": cid, "sub_family_id": body.get("sub_family_id", ""), "track": body.get("track", "P"),
        "level": body.get("level", ""), "theme_id": body.get("theme_id", ""), "theme_name": body.get("theme_name", ""),
        "bullet_text": body.get("bullet_text", ""), "is_finalized": body.get("is_finalized", False),
        "generated_at": _now(), "prompt_used": body.get("prompt_used", ""),
        "display_order": body.get("display_order", 0),
    }
    _content[cid] = entry
    _save_json("content.json", _content)
    return _safe(entry)

@router.post("/job-content/content/bulk")
async def save_content_bulk(request: Request):
    body = await request.json()
    items = body.get("items", [])
    saved = []
    for item in items:
        cid = item.get("id", _id())
        entry = {
            "id": cid, "sub_family_id": item.get("sub_family_id", ""), "track": item.get("track", ""),
            "level": item.get("level", ""), "theme_id": item.get("theme_id", ""), "theme_name": item.get("theme_name", ""),
            "bullet_text": item.get("bullet_text", ""), "is_finalized": item.get("is_finalized", False),
            "generated_at": _now(), "prompt_used": item.get("prompt_used", ""),
            "display_order": item.get("display_order", 0),
        }
        _content[cid] = entry
        saved.append(entry)
    _save_json("content.json", _content)
    return _safe({"saved": len(saved), "items": saved})

@router.put("/job-content/content/{content_id}/finalize")
def finalize_content(content_id: str):
    if content_id not in _content:
        raise HTTPException(404, "Content not found")
    _content[content_id]["is_finalized"] = True
    _save_json("content.json", _content)
    return _safe(_content[content_id])

# ═══ TEMPLATES (Overview + Ending) ═══

@router.get("/job-content/templates/{sub_family_id}")
def get_templates(sub_family_id: str):
    tmpl = next((t for t in _templates.values() if t.get("sub_family_id") == sub_family_id), None)
    return _safe(tmpl or {"sub_family_id": sub_family_id, "overview_template": "The {level_title} in {sub_family_name} is responsible for contributing to the {job_family_name} function by delivering outcomes aligned with organizational objectives.", "ending_template": "This role requires adherence to organizational policies, ethical standards, and a commitment to continuous professional development."})

@router.post("/job-content/templates")
async def save_template(request: Request):
    body = await request.json()
    sf_id = body.get("sub_family_id", "")
    # Upsert
    existing = next((tid for tid, t in _templates.items() if t.get("sub_family_id") == sf_id), None)
    tid = existing or _id()
    _templates[tid] = {"id": tid, "sub_family_id": sf_id, "overview_template": body.get("overview_template", ""), "ending_template": body.get("ending_template", "")}
    _save_json("templates.json", _templates)
    return _safe(_templates[tid])

# ═══ AI GENERATION ═══

@router.post("/job-content/generate")
async def generate_content(request: Request):
    """Generate job content bullets using AI with governed prompt."""
    body = await request.json()
    prompt = body.get("prompt", "")
    sub_family_id = body.get("sub_family_id", "")
    track = body.get("track", "P")
    level = body.get("level", "")

    if not prompt:
        raise HTTPException(400, "Prompt is required")

    # Enhance prompt with definition context if available
    sf_def = _definitions.get(sub_family_id, {})
    family_node = _taxonomy.get(sub_family_id, {})
    parent_id = family_node.get("parent_id", "")
    parent_def = _definitions.get(parent_id, {})
    definition_context = ""
    if sf_def.get("purpose_statement"):
        definition_context += f"\nSub-Family Purpose: {sf_def['purpose_statement']}"
    if sf_def.get("scope_narrative"):
        definition_context += f"\nSub-Family Scope: {sf_def['scope_narrative']}"
    if parent_def.get("purpose_statement"):
        definition_context += f"\nFamily Purpose: {parent_def['purpose_statement']}"
    if definition_context:
        prompt = f"DEFINITION CONTEXT:{definition_context}\n\n{prompt}"

    try:
        from app.ai_providers import call_claude_sync
        raw = call_claude_sync(
            prompt,
            system="You are an expert job content author specializing in Mercer-methodology job architecture. You write precise, level-differentiated job content using governed action verbs and consistent thematic structure.",
            max_tokens=2048,
        )

        # Parse bullets from response
        bullets = []
        for line in raw.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            cleaned = line.lstrip("0123456789.-•) ").strip()
            if cleaned:
                bullets.append(cleaned)

        return _safe({"bullets": bullets, "raw": raw, "sub_family_id": sub_family_id, "track": track, "level": level})
    except Exception as e:
        # Fallback: generate template bullets
        themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sub_family_id], key=lambda x: x.get("display_order", 0))
        fallback = [f"Contributes to {t['name'].lower()} within the scope of the role." for t in themes]
        return _safe({"bullets": fallback, "raw": "", "note": f"AI unavailable ({str(e)[:100]}), showing template content", "sub_family_id": sub_family_id, "track": track, "level": level})

@router.post("/job-content/generate-batch")
async def generate_batch(request: Request):
    """Generate content for multiple levels in sequence."""
    body = await request.json()
    sub_family_id = body.get("sub_family_id", "")
    track = body.get("track", "P")
    levels = body.get("levels", [])
    prompt_template = body.get("prompt_template", "")

    results = {}
    for level in levels:
        prompt = prompt_template.replace("{level}", level).replace("{level_number}", level[1:])
        try:
            from app.ai_providers import call_claude_sync
            raw = call_claude_sync(prompt, system="You are an expert job content author.", max_tokens=1024)
            bullets = [line.lstrip("0123456789.-•) ").strip() for line in raw.strip().split("\n") if line.strip()]
            results[level] = {"bullets": bullets, "raw": raw}
        except Exception as e:
            themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sub_family_id], key=lambda x: x.get("display_order", 0))
            results[level] = {"bullets": [f"Contributes to {t['name'].lower()}." for t in themes], "note": str(e)[:100]}

    return _safe({"results": results, "levels_generated": len(results)})

# ═══ PROMPT BUILDER ═══

@router.post("/job-content/build-prompt")
async def build_prompt(request: Request):
    """Build the auto-generated prompt from current configuration."""
    body = await request.json()
    sf_id = body.get("sub_family_id", "")
    track = body.get("track", "P")
    level = body.get("level", "P1")
    total_levels = body.get("total_levels", 6)

    sf = _taxonomy.get(sf_id, {})
    sf_name = sf.get("name", "Unknown Sub-Family")
    sf_def = sf.get("definition", "")

    # Get parent family
    family = _taxonomy.get(sf.get("parent_id", ""), {})
    family_name = family.get("name", "Unknown Family")
    family_def = family.get("definition", "")

    # Enhance with Phase 3 definitions
    sf_definition = _definitions.get(sf_id, {})
    family_definition = _definitions.get(sf.get("parent_id", ""), {})
    purpose = sf_definition.get("purpose_statement", sf_def)
    scope = sf_definition.get("scope_narrative", "")
    family_purpose = family_definition.get("purpose_statement", family_def)

    # Get themes
    themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sf_id], key=lambda x: x.get("display_order", 0))
    theme_lines = "\n".join(f"{i+1}. {t['name']}: {t.get('description', '')}" for i, t in enumerate(themes))

    # Get verbs for this track
    verb_entries = [v for v in _verb_libs.values() if v.get("sub_family_id") == sf_id and v.get("track") == track]
    all_verbs = []
    for ve in verb_entries:
        all_verbs.extend(ve.get("verbs", []))
    verb_list = ", ".join(sorted(set(all_verbs))) if all_verbs else "No verbs configured"

    # Get leveling context
    leveling_context = ""
    if _leveling.get("tracks"):
        for lt in _leveling["tracks"]:
            if lt.get("code") == track:
                for lv in lt.get("levels", []):
                    if lv.get("code") == level:
                        leveling_context = f"""
LEVELING CALIBRATION (from framework):
- Scope: {lv.get('scope', 'N/A')}
- Autonomy: {lv.get('autonomy', 'N/A')}
- Stakeholder Level: {lv.get('stakeholder_level', 'N/A')}
- Time Horizon: {lv.get('time_horizon', 'N/A')}
- Complexity: {lv.get('complexity', 'N/A')}
- Impact: {lv.get('impact', 'N/A')}"""
                        break
                break

    track_names = {"S": "Support", "P": "Professional", "T": "Technical", "M": "Management", "E": "Executive"}
    level_num = level[1:] if len(level) > 1 else "1"

    prompt = f"""CONTEXT:
Job Family: {family_name}
Job Family Purpose: {family_purpose or 'Not defined'}
Sub-Family: {sf_name}
Sub-Family Purpose: {purpose or 'Not defined'}
{f'Sub-Family Scope: {scope}' if scope else ''}

You are generating content ONLY for the Sub-Family level. The Job Family definition provides broader context but the content must be specific to: {sf_name}.

TARGET LEVEL: {level} — {track_names.get(track, track)} Track
CAREER TRACK: {track_names.get(track, track)}

THEMES (generate exactly one bullet per theme, in this order):
{theme_lines}

VERB GOVERNANCE:
You MUST begin each bullet with one of the following verbs. Use present tense. Do not use any verb outside this list:
{verb_list}
{leveling_context}

LEVEL CALIBRATION:
This is level {level_num} of {total_levels} in the {track_names.get(track, track)} track.
• Level 1 represents entry-level scope within this sub-family.
• Level {total_levels} represents the maximum complexity ceiling.
• Differentiate from adjacent levels by scaling: scope of problems addressed, autonomy of decision-making, breadth of stakeholder engagement, and strategic vs. operational orientation.

OUTPUT FORMAT:
Return exactly {len(themes)} bullets (one per theme), each 1–2 sentences.
Begin each bullet with a governed verb. Use present tense throughout.
Do not include theme labels in the output—just the content."""

    return _safe({"prompt": prompt, "sub_family_id": sf_id, "track": track, "level": level})

# ═══ COMPOSED VIEW ═══

@router.get("/job-content/composed/{sub_family_id}/{track}/{level}")
def get_composed(sub_family_id: str, track: str, level: str):
    """Get the full composed job content for a specific level."""
    tmpl = next((t for t in _templates.values() if t.get("sub_family_id") == sub_family_id), None)
    overview = (tmpl or {}).get("overview_template", "")
    ending = (tmpl or {}).get("ending_template", "")

    sf = _taxonomy.get(sub_family_id, {})
    family = _taxonomy.get(sf.get("parent_id", ""), {})

    # Resolve template variables
    replacements = {
        "{sub_family_name}": sf.get("name", ""),
        "{level_title}": level,
        "{career_track}": track,
        "{job_family_name}": family.get("name", ""),
    }
    for k, v in replacements.items():
        overview = overview.replace(k, v)
        ending = ending.replace(k, v)

    bullets = sorted(
        [c for c in _content.values() if c.get("sub_family_id") == sub_family_id and c.get("track") == track and c.get("level") == level],
        key=lambda x: x.get("display_order", 0),
    )

    return _safe({
        "overview": overview, "bullets": bullets, "ending": ending,
        "sub_family": sf.get("name", ""), "track": track, "level": level,
        "is_complete": len(bullets) >= 5 and all(b.get("is_finalized") for b in bullets),
    })

# ═══ PHASE 5: FEEDBACK TRACKER ═══

@router.get("/job-content/feedback")
def list_feedback():
    return _safe({"feedback": list(_feedback.values()), "total": len(_feedback)})

@router.post("/job-content/feedback")
async def add_feedback(request: Request):
    body = await request.json()
    fid = _id()
    entry = {"id": fid, "node_id": body.get("node_id", ""), "text": body.get("text", ""), "source": body.get("source", ""), "status": "open", "created_at": _now()}
    _feedback[fid] = entry
    _save_json("feedback.json", _feedback)
    return _safe(entry)

@router.put("/job-content/feedback/{feedback_id}")
async def update_feedback(feedback_id: str, request: Request):
    if feedback_id not in _feedback:
        raise HTTPException(404, "Feedback not found")
    body = await request.json()
    _feedback[feedback_id].update({k: v for k, v in body.items() if k != "id"})
    _save_json("feedback.json", _feedback)
    return _safe(_feedback[feedback_id])
