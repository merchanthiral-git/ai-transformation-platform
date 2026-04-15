"""Job Content Authoring Module — governed, AI-assisted job descriptions."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from app.shared import _safe

router = APIRouter(prefix="/api", tags=["job-content"])

def _id(): return str(uuid.uuid4())[:12]
def _now(): return datetime.utcnow().isoformat()

# ── In-memory stores ──
_taxonomy: dict[str, dict] = {}       # id → {id, type, parent_id, name, definition, applicable_tracks, display_order}
_themes: dict[str, dict] = {}         # id → {id, sub_family_id, name, description, display_order}
_verb_libs: dict[str, dict] = {}      # id → {id, sub_family_id, track, band, verbs[]}
_content: dict[str, dict] = {}        # id → {id, sub_family_id, track, level, theme_id, bullet_text, is_finalized, generated_at, prompt_used}
_templates: dict[str, dict] = {}      # id → {id, sub_family_id, overview_template, ending_template}

# Default themes by archetype
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

# Default verb pools by track
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

# ═══ TAXONOMY CRUD ═══
@router.get("/job-content/taxonomy")
def list_taxonomy():
    nodes = sorted(_taxonomy.values(), key=lambda x: (x.get("type",""), x.get("display_order",0)))
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
        "applicable_tracks": body.get("applicable_tracks", ["S","P","T","M","E"]),
        "display_order": body.get("display_order", len(_taxonomy)),
    }
    _taxonomy[nid] = node
    return _safe(node)

@router.put("/job-content/taxonomy/{node_id}")
async def update_taxonomy_node(node_id: str, request: Request):
    if node_id not in _taxonomy:
        raise HTTPException(404, "Node not found")
    body = await request.json()
    _taxonomy[node_id].update({k: v for k, v in body.items() if k != "id"})
    return _safe(_taxonomy[node_id])

@router.delete("/job-content/taxonomy/{node_id}")
def delete_taxonomy_node(node_id: str):
    node = _taxonomy.pop(node_id, None)
    if not node:
        raise HTTPException(404, "Node not found")
    # Cascade delete children
    children = [nid for nid, n in _taxonomy.items() if n.get("parent_id") == node_id]
    for cid in children:
        _taxonomy.pop(cid, None)
    return _safe({"deleted": True})

# ═══ THEMES CRUD ═══
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
    return _safe(theme)

@router.put("/job-content/themes/{theme_id}")
async def update_theme(theme_id: str, request: Request):
    if theme_id not in _themes:
        raise HTTPException(404, "Theme not found")
    body = await request.json()
    _themes[theme_id].update({k: v for k, v in body.items() if k != "id"})
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
    return _safe({"themes": created, "count": len(created)})

# ═══ VERB LIBRARY CRUD ═══
@router.get("/job-content/verbs/{sub_family_id}")
def get_verbs(sub_family_id: str, track: str = None):
    verbs = [v for v in _verb_libs.values() if v.get("sub_family_id") == sub_family_id]
    if track:
        verbs = [v for v in verbs if v.get("track") == track]
    verbs.sort(key=lambda x: (x.get("track",""), x.get("band","")))
    return _safe({"verbs": verbs, "sub_family_id": sub_family_id})

@router.post("/job-content/verbs")
async def create_verb_entry(request: Request):
    body = await request.json()
    vid = _id()
    entry = {"id": vid, "sub_family_id": body.get("sub_family_id",""), "track": body.get("track","P"), "band": body.get("band","mid"), "verbs": body.get("verbs",[])}
    _verb_libs[vid] = entry
    return _safe(entry)

@router.put("/job-content/verbs/{verb_id}")
async def update_verb_entry(verb_id: str, request: Request):
    if verb_id not in _verb_libs:
        raise HTTPException(404, "Verb entry not found")
    body = await request.json()
    _verb_libs[verb_id].update({k: v for k, v in body.items() if k != "id"})
    return _safe(_verb_libs[verb_id])

@router.delete("/job-content/verbs/{verb_id}")
def delete_verb_entry(verb_id: str):
    return _safe({"deleted": bool(_verb_libs.pop(verb_id, None))})

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
    return _safe({"verbs": created, "track": track})

# ═══ CONTENT CRUD ═══
@router.get("/job-content/content/{sub_family_id}")
def get_content(sub_family_id: str, track: str = None, level: str = None):
    items = [c for c in _content.values() if c.get("sub_family_id") == sub_family_id]
    if track:
        items = [c for c in items if c.get("track") == track]
    if level:
        items = [c for c in items if c.get("level") == level]
    items.sort(key=lambda x: (x.get("track",""), x.get("level",""), x.get("display_order",0)))
    return _safe({"content": items, "count": len(items)})

@router.post("/job-content/content")
async def save_content(request: Request):
    body = await request.json()
    cid = body.get("id", _id())
    entry = {
        "id": cid, "sub_family_id": body.get("sub_family_id",""), "track": body.get("track","P"),
        "level": body.get("level",""), "theme_id": body.get("theme_id",""), "theme_name": body.get("theme_name",""),
        "bullet_text": body.get("bullet_text",""), "is_finalized": body.get("is_finalized", False),
        "generated_at": _now(), "prompt_used": body.get("prompt_used",""),
        "display_order": body.get("display_order", 0),
    }
    _content[cid] = entry
    return _safe(entry)

@router.post("/job-content/content/bulk")
async def save_content_bulk(request: Request):
    body = await request.json()
    items = body.get("items", [])
    saved = []
    for item in items:
        cid = item.get("id", _id())
        entry = {
            "id": cid, "sub_family_id": item.get("sub_family_id",""), "track": item.get("track",""),
            "level": item.get("level",""), "theme_id": item.get("theme_id",""), "theme_name": item.get("theme_name",""),
            "bullet_text": item.get("bullet_text",""), "is_finalized": item.get("is_finalized", False),
            "generated_at": _now(), "prompt_used": item.get("prompt_used",""),
            "display_order": item.get("display_order", 0),
        }
        _content[cid] = entry
        saved.append(entry)
    return _safe({"saved": len(saved), "items": saved})

@router.put("/job-content/content/{content_id}/finalize")
def finalize_content(content_id: str):
    if content_id not in _content:
        raise HTTPException(404, "Content not found")
    _content[content_id]["is_finalized"] = True
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
    _templates[tid] = {"id": tid, "sub_family_id": sf_id, "overview_template": body.get("overview_template",""), "ending_template": body.get("ending_template","")}
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
            # Remove leading numbers/bullets
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
    levels = body.get("levels", [])  # e.g. ["P1","P2","P3","P4","P5","P6"]
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
            themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sub_family_id], key=lambda x: x.get("display_order",0))
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
    family = _taxonomy.get(sf.get("parent_id",""), {})
    family_name = family.get("name", "Unknown Family")
    family_def = family.get("definition", "")

    # Get themes
    themes = sorted([t for t in _themes.values() if t.get("sub_family_id") == sf_id], key=lambda x: x.get("display_order",0))
    theme_lines = "\n".join(f"{i+1}. {t['name']}: {t.get('description','')}" for i, t in enumerate(themes))

    # Get verbs for this track
    verb_entries = [v for v in _verb_libs.values() if v.get("sub_family_id") == sf_id and v.get("track") == track]
    all_verbs = []
    for ve in verb_entries:
        all_verbs.extend(ve.get("verbs", []))
    verb_list = ", ".join(sorted(set(all_verbs))) if all_verbs else "No verbs configured"

    track_names = {"S": "Support", "P": "Professional", "T": "Technical", "M": "Management", "E": "Executive"}
    level_num = level[1:] if len(level) > 1 else "1"

    prompt = f"""CONTEXT:
Job Family: {family_name}
Job Family Definition: {family_def or 'Not defined'}
Sub-Family: {sf_name}
Sub-Family Definition: {sf_def or 'Not defined'}

You are generating content ONLY for the Sub-Family level. The Job Family definition provides broader context but the content must be specific to: {sf_name}.

TARGET LEVEL: {level} — {track_names.get(track, track)} Track
CAREER TRACK: {track_names.get(track, track)}

THEMES (generate exactly one bullet per theme, in this order):
{theme_lines}

VERB GOVERNANCE:
You MUST begin each bullet with one of the following verbs. Use present tense. Do not use any verb outside this list:
{verb_list}

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
    family = _taxonomy.get(sf.get("parent_id",""), {})

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
        key=lambda x: x.get("display_order", 0)
    )

    return _safe({
        "overview": overview, "bullets": bullets, "ending": ending,
        "sub_family": sf.get("name",""), "track": track, "level": level,
        "is_complete": len(bullets) >= 5 and all(b.get("is_finalized") for b in bullets),
    })
