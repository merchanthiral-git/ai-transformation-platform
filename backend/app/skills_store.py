"""Skills Engine data models and in-memory store."""
import uuid
from datetime import datetime
from typing import Optional

# ── Skill categories ──
SKILL_CATEGORIES = ["technical", "functional", "leadership", "adaptive"]
STRATEGIC_IMPORTANCE = ["critical", "important", "supporting", "declining"]
TRENDS = ["rising", "stable", "declining"]
CONFIDENCE_LEVELS = ["assessed", "inferred", "estimated"]
EDGE_TYPES = ["requires", "uses", "has", "adjacent_to", "evolves_into", "replaces", "clusters_with"]

# Category colors (for frontend consistency)
SKILL_COLORS = {
    "technical": "#3B82F6",
    "functional": "#F59E0B",
    "leadership": "#8B5CF6",
    "adaptive": "#10B981",
}

def new_id():
    return str(uuid.uuid4())[:8]

def now_iso():
    return datetime.utcnow().isoformat()

# ── In-memory skills store ──
class SkillsStore:
    def __init__(self):
        self.skills = {}           # id → skill dict
        self.mappings = {}         # id → mapping dict
        self.taxonomy = {}         # id → taxonomy node dict
        self.graph_edges = []      # list of edge dicts
        self.events_log = []       # list of event dicts (recent 200)
        self.pending_skills = []   # AI-inferred skills awaiting approval
        self._seed_demo()

    def _seed_demo(self):
        """Seed with demo skills data."""
        from app.skills_demo import DEMO_SKILLS, DEMO_MAPPINGS, DEMO_TAXONOMY, DEMO_EDGES
        self.skills = {s["id"]: s for s in DEMO_SKILLS}
        # Use create_mapping to compute gap fields
        for m in DEMO_MAPPINGS:
            self.create_mapping(dict(m))
        self.taxonomy = {t["id"]: t for t in DEMO_TAXONOMY}
        self.graph_edges = list(DEMO_EDGES)

    # ── CRUD: Skills ──
    def get_skills(self, category=None, trend=None, importance=None):
        results = list(self.skills.values())
        if category and category != "All":
            results = [s for s in results if s.get("category") == category]
        if trend and trend != "All":
            results = [s for s in results if s.get("metadata", {}).get("trend") == trend]
        if importance and importance != "All":
            results = [s for s in results if s.get("metadata", {}).get("strategic_importance") == importance]
        return results

    def get_skill(self, skill_id):
        return self.skills.get(skill_id)

    def create_skill(self, data):
        sid = data.get("id", new_id())
        data["id"] = sid
        data.setdefault("created_at", now_iso())
        data.setdefault("updated_at", now_iso())
        self.skills[sid] = data
        return data

    def update_skill(self, skill_id, data):
        if skill_id not in self.skills:
            return None
        self.skills[skill_id].update(data)
        self.skills[skill_id]["updated_at"] = now_iso()
        return self.skills[skill_id]

    def delete_skill(self, skill_id):
        return self.skills.pop(skill_id, None)

    # ── CRUD: Mappings ──
    def get_mappings(self, source_type=None, skill_id=None, source_id=None):
        results = list(self.mappings.values())
        if source_type and source_type != "All":
            results = [m for m in results if m.get("source_type") == source_type]
        if skill_id:
            results = [m for m in results if m.get("skill_id") == skill_id]
        if source_id:
            results = [m for m in results if m.get("source_id") == source_id]
        return results

    def create_mapping(self, data):
        mid = data.get("id", new_id())
        data["id"] = mid
        # Compute gap
        req = data.get("required_proficiency", 0)
        cur = data.get("current_proficiency", 0)
        data["gap"] = max(0, req - cur)
        self.mappings[mid] = data
        return data

    def bulk_create_mappings(self, mappings_list):
        results = []
        for m in mappings_list:
            results.append(self.create_mapping(m))
        return results

    # ── CRUD: Taxonomy ──
    def get_taxonomy(self):
        return list(self.taxonomy.values())

    def create_taxonomy_node(self, data):
        tid = data.get("id", new_id())
        data["id"] = tid
        self.taxonomy[tid] = data
        return data

    def update_taxonomy_node(self, node_id, data):
        if node_id not in self.taxonomy:
            return None
        self.taxonomy[node_id].update(data)
        return self.taxonomy[node_id]

    # ── Graph ──
    def get_graph(self, category=None):
        nodes = []
        for s in self.skills.values():
            if category and category != "All" and s.get("category") != category:
                continue
            nodes.append({
                "id": s["id"],
                "type": "skill",
                "label": s["name"],
                "category": s.get("category", ""),
                "properties": s.get("metadata", {}),
            })
        # Add job nodes from mappings
        job_ids = set()
        for m in self.mappings.values():
            if m.get("source_type") == "job" and m["source_id"] not in job_ids:
                job_ids.add(m["source_id"])
                nodes.append({
                    "id": m["source_id"],
                    "type": "job",
                    "label": m.get("source_label", m["source_id"]),
                    "category": "job",
                    "properties": {},
                })

        edges = list(self.graph_edges)
        # Add edges from mappings
        for m in self.mappings.values():
            rel = "requires" if m.get("source_type") == "job" else "has" if m.get("source_type") == "employee" else "uses"
            edges.append({
                "source_id": m["source_id"],
                "target_id": m["skill_id"],
                "relationship": rel,
                "weight": m.get("weight", 0.5),
            })
        return {"nodes": nodes, "edges": edges}

    def get_adjacency(self, skill_id):
        adjacent = []
        for e in self.graph_edges:
            if e.get("relationship") in ("adjacent_to", "clusters_with", "evolves_into"):
                if e["source_id"] == skill_id:
                    adj_skill = self.skills.get(e["target_id"])
                    if adj_skill:
                        adjacent.append({"skill": adj_skill, "relationship": e["relationship"], "weight": e.get("weight", 0.5)})
                elif e["target_id"] == skill_id:
                    adj_skill = self.skills.get(e["source_id"])
                    if adj_skill:
                        adjacent.append({"skill": adj_skill, "relationship": e["relationship"], "weight": e.get("weight", 0.5)})
        return adjacent

    def get_clusters(self):
        """Group skills by co-occurrence patterns."""
        clusters = {}
        for cat in SKILL_CATEGORIES:
            cat_skills = [s for s in self.skills.values() if s.get("category") == cat]
            if cat_skills:
                clusters[cat] = {
                    "category": cat,
                    "color": SKILL_COLORS.get(cat, "#888"),
                    "skills": cat_skills,
                    "count": len(cat_skills),
                }
        return clusters

    # ── Gap Analysis ──
    def compute_gaps(self, scope="org", scope_id=None):
        """Compute skill gaps at various scopes."""
        mappings = list(self.mappings.values())
        if scope == "role" and scope_id:
            mappings = [m for m in mappings if m.get("source_type") == "job" and m.get("source_id") == scope_id]
        elif scope == "team" and scope_id:
            mappings = [m for m in mappings if m.get("team_id") == scope_id]

        gaps = {"critical": [], "moderate": [], "emerging": [], "covered": []}
        coverage_total = 0
        coverage_met = 0

        for m in mappings:
            skill = self.skills.get(m.get("skill_id"))
            if not skill:
                continue
            gap = m.get("gap", 0)
            importance = skill.get("metadata", {}).get("strategic_importance", "supporting")
            coverage_total += 1

            entry = {
                "skill_id": m["skill_id"],
                "skill_name": skill["name"],
                "category": skill.get("category"),
                "required": m.get("required_proficiency", 0),
                "current": m.get("current_proficiency", 0),
                "gap": gap,
                "importance": importance,
                "source": m.get("source_id", ""),
                "source_type": m.get("source_type", ""),
            }

            if gap == 0:
                gaps["covered"].append(entry)
                coverage_met += 1
            elif gap >= 2 and importance in ("critical", "important"):
                gaps["critical"].append(entry)
            elif gap >= 1:
                gaps["moderate"].append(entry)
            else:
                gaps["emerging"].append(entry)

        coverage_score = round(coverage_met / max(coverage_total, 1) * 100, 1)

        # Build heatmap data by category
        heatmap = {}
        for cat in SKILL_CATEGORIES:
            cat_mappings = [m for m in mappings if self.skills.get(m.get("skill_id"), {}).get("category") == cat]
            total = len(cat_mappings)
            met = len([m for m in cat_mappings if m.get("gap", 0) == 0])
            heatmap[cat] = {
                "total": total,
                "met": met,
                "coverage": round(met / max(total, 1) * 100, 1),
                "color": SKILL_COLORS.get(cat, "#888"),
            }

        return {
            "critical_gaps": gaps["critical"],
            "moderate_gaps": gaps["moderate"],
            "emerging_gaps": gaps["emerging"],
            "covered": gaps["covered"],
            "coverage_score": coverage_score,
            "heatmap": heatmap,
            "total_mappings": coverage_total,
        }

    # ── Demand Forecast ──
    def compute_demand_forecast(self, horizon_months=12):
        rising = [s for s in self.skills.values() if s.get("metadata", {}).get("trend") == "rising"]
        declining = [s for s in self.skills.values() if s.get("metadata", {}).get("trend") == "declining"]
        stable = [s for s in self.skills.values() if s.get("metadata", {}).get("trend") == "stable"]

        # Skills at risk: declining + high dependency (many mappings)
        at_risk = []
        for s in declining:
            mapping_count = len([m for m in self.mappings.values() if m.get("skill_id") == s["id"]])
            at_risk.append({**s, "dependency_count": mapping_count})
        at_risk.sort(key=lambda x: x["dependency_count"], reverse=True)

        # Emerging: rising + low coverage
        emerging = []
        for s in rising:
            mapping_count = len([m for m in self.mappings.values() if m.get("skill_id") == s["id"]])
            emerging.append({**s, "coverage_count": mapping_count})
        emerging.sort(key=lambda x: x["coverage_count"])

        return {
            "horizon_months": horizon_months,
            "rising_skills": [{"id": s["id"], "name": s["name"], "category": s.get("category"), "automation_risk": s.get("metadata", {}).get("automation_susceptibility", 0)} for s in rising],
            "declining_skills": [{"id": s["id"], "name": s["name"], "category": s.get("category"), "dependency_count": s.get("dependency_count", 0)} for s in at_risk],
            "stable_skills": [{"id": s["id"], "name": s["name"], "category": s.get("category")} for s in stable],
            "at_risk": at_risk[:10],
            "emerging": emerging[:10],
        }

    # ── Automation Risk ──
    def compute_automation_risk(self):
        results = []
        for s in self.skills.values():
            meta = s.get("metadata", {})
            results.append({
                "id": s["id"],
                "name": s["name"],
                "category": s.get("category"),
                "automation_risk": meta.get("automation_susceptibility", 0),
                "strategic_importance": meta.get("strategic_importance", "supporting"),
                "transferability": meta.get("transferability", 0.5),
                "trend": meta.get("trend", "stable"),
                "jobs_using": len([m for m in self.mappings.values() if m.get("skill_id") == s["id"] and m.get("source_type") == "job"]),
            })
        return results

    # ── Events ──
    def log_event(self, event_type, source_module, affected_skills, changes):
        event = {
            "id": new_id(),
            "timestamp": now_iso(),
            "event_type": event_type,
            "source_module": source_module,
            "affected_skills": affected_skills,
            "changes": changes,
        }
        self.events_log.insert(0, event)
        self.events_log = self.events_log[:200]  # Keep last 200
        return event


# Singleton
skills_store = SkillsStore()
