/**
 * API client for the AI Transformation Platform.
 *
 * v3.1 — Better error visibility + non-null fallbacks for every endpoint.
 * Uses RELATIVE URLs so requests go through the Next.js proxy in next.config.ts.
 */

export interface Filters {
  func: string;
  jf: string;
  sf: string;
  cl: string;
}

function filterParams(f: Filters) {
  return `func=${encodeURIComponent(f.func)}&jf=${encodeURIComponent(f.jf)}&sf=${encodeURIComponent(f.sf)}&cl=${encodeURIComponent(f.cl)}`;
}

// Toast callback — set by the app layer via setApiToast
let _apiToast: ((msg: string) => void) | null = null;
export function setApiToast(fn: (msg: string) => void) { _apiToast = fn; }

async function fetchJSON<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = (() => { try { return JSON.parse(text)?.detail || ""; } catch { return ""; } })();
      const msg = detail || `${res.status} ${res.statusText}`;
      console.error(`[API ERROR] ${path} → ${msg}`, text.slice(0, 200));
      if (_apiToast && res.status >= 400) {
        _apiToast(`API error: ${msg.slice(0, 100)}`);
      }
      return fallback;
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${path}`, err);
    if (_apiToast) {
      _apiToast("Network error — check backend connection");
    }
    return fallback;
  }
}

// ─── Models ───────────────────────────────────────────────
export async function getModels() {
  return fetchJSON("/api/models", { models: [] as string[], last_loaded: "" });
}

// ─── Upload / Reset ───────────────────────────────────────
export async function uploadFiles(files: FileList) {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append("files", f));
  return fetchJSON("/api/upload", { sheets_loaded: 0, active_model: "", jobs: [] as string[], models: [] as string[] }, {
    method: "POST",
    body: formData,
  });
}

export async function resetData() {
  return fetchJSON("/api/reset", { ok: true }, { method: "POST" });
}

// ─── Filters & Jobs ──────────────────────────────────────
const EMPTY_FILTERS = { functions: ["All"], job_families: ["All"], sub_families: ["All"], career_levels: ["All"] };

export async function getFilterOptions(modelId: string, func = "All", jf = "All", sf = "All") {
  return fetchJSON(
    `/api/filter-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}`,
    EMPTY_FILTERS
  );
}

export async function getJobOptions(modelId: string, func = "All", jf = "All", sf = "All", cl = "All") {
  return fetchJSON(
    `/api/job-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}&cl=${encodeURIComponent(cl)}`,
    { jobs: [] as string[] }
  );
}

// ─── Overview ────────────────────────────────────────────
export async function getOverview(modelId: string, f: Filters) {
  return fetchJSON(`/api/overview?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: { employees: 0, roles: 0, tasks_mapped: 0, avg_span: 0, high_ai_pct: 0, readiness_score: 0, readiness_tier: "" },
    readiness_dims: {},
    func_distribution: [],
    ai_distribution: [],
    data_coverage: {},
  });
}

export async function getBenchmarks(industry: string, employees: number) {
  return fetchJSON(`/api/benchmarks?industry=${encodeURIComponent(industry)}&employees=${employees}`, {});
}

// ─── Diagnose ────────────────────────────────────────────
export async function getAIPriority(modelId: string, f: Filters) {
  return fetchJSON(`/api/diagnose/ai-priority?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    summary: { tasks_scored: 0, quick_wins: 0, total_time_impact: 0, avg_risk: 0 },
    top10: [],
    workstream_impact: [],
  });
}

export async function getAIHeatmap(modelId: string, f: Filters) {
  return fetchJSON(`/api/diagnose/heatmap?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    cells: [], functions: [], families: [],
  });
}

export async function getRoleClusters(modelId: string, f: Filters) {
  return fetchJSON(`/api/diagnose/clusters?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    clusters: [], roles: [],
  });
}

export async function getSkillAnalysis(modelId: string, f: Filters) {
  return fetchJSON(`/api/diagnose/skills?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    current: [], future: [], gap: [],
  });
}

export async function getOrgDiagnostics(modelId: string, f: Filters) {
  return fetchJSON(`/api/diagnose/org?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: { total: 0, managers: 0, ics: 0, avg_span: 0, max_span: 0, layers: 0 },
    managers: [], span_top15: [], layers: [], layer_distribution: [],
  });
}

export async function getDataQuality(modelId: string) {
  return fetchJSON(`/api/diagnose/data-quality?model_id=${encodeURIComponent(modelId)}`, {
    summary: { ready: 0, missing: 0, total_issues: 0, avg_completeness: 0 },
    readiness: [], upload_log: [],
  });
}

// ─── Design ──────────────────────────────────────────────
export async function getJobContext(modelId: string, job: string, f: Filters) {
  return fetchJSON(`/api/design/job-context?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
    kpis: { hours_week: 0, tasks: 0, workstreams: 0, released_hrs: 0, released_pct: 0, future_hrs: 0, evolution: "" },
    meta: {}, description: "", decon_summary: [], ws_breakdown: [], ai_distribution: [],
  });
}

export async function getDeconstruction(modelId: string, job: string, f: Filters) {
  return fetchJSON(`/api/design/deconstruction?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
    tasks: [], dimensions: [], ai_priority: [],
  });
}

export async function computeReconstruction(tasks: Record<string, unknown>[], scenario = "Balanced") {
  return fetchJSON("/api/design/reconstruct", {
    reconstruction: [], rollup: [], value_model: {}, recommendations: [],
    action_mix: {}, waterfall: {}, evolution: "", redeployment: [], insights: [],
  }, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, scenario }),
  });
}

// ─── Operating Model ─────────────────────────────────────
export async function getOperatingModel(modelId: string, f: Filters) {
  return fetchJSON(`/api/operating-model?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: {}, maturity: [], structure: [], workflow: [], decisions: [], insights: [],
    layer_agg: [], service_split: [], scope_dist: [], decision_load: [], stage_throughput: [],
  });
}

// ─── Job Architecture ────────────────────────────────────
export async function getJobArchitecture(modelId: string, f: Filters) {
  return fetchJSON(`/api/job-architecture?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    tree: [], jobs: [], stats: {}, flags: [], analytics: {}, employees: [],
  });
}

export async function saveArchVersion(modelId: string, version: { name: string; description: string; tree: unknown[]; mappings: unknown[]; recommended: boolean }) {
  return fetchJSON(`/api/job-architecture/versions?model_id=${encodeURIComponent(modelId)}`, {}, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(version),
  });
}

export async function getArchVersions(modelId: string) {
  return fetchJSON(`/api/job-architecture/versions?model_id=${encodeURIComponent(modelId)}`, { versions: [] });
}

export async function deleteArchVersion(modelId: string, versionId: string) {
  return fetchJSON(`/api/job-architecture/versions/${versionId}?model_id=${encodeURIComponent(modelId)}`, {}, { method: "DELETE" });
}

export async function toggleArchRecommend(modelId: string, versionId: string) {
  return fetchJSON(`/api/job-architecture/versions/${versionId}/recommend?model_id=${encodeURIComponent(modelId)}`, {}, { method: "PUT" });
}

// ─── Operating Model Taxonomy ────────────────────────────
export async function getOMTaxonomy(industries?: string[]) {
  const q = industries?.length ? `?industry=${industries.join(",")}` : "";
  return fetchJSON(`/api/om-taxonomy${q}`, { taxonomy: { functions: {}, industries_applied: [] }, stats: {}, available_industries: [] });
}

export async function searchOMTaxonomy(query: string, industries?: string[]) {
  const indQ = industries?.length ? `&industry=${industries.join(",")}` : "";
  return fetchJSON(`/api/om-taxonomy/search?q=${encodeURIComponent(query)}${indQ}`, { results: [] });
}

export async function saveOMConfig(config: Record<string, unknown>) {
  return fetchJSON("/api/om-taxonomy/configure", { ok: false }, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
  });
}

// ─── Simulate ────────────────────────────────────────────
export async function getReadiness(modelId: string, f: Filters) {
  return fetchJSON(`/api/simulate/readiness?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    score: 0, total: 0, tier: "", dimensions: {}, dims: {},
  });
}

// ─── Mobilize ────────────────────────────────────────────
export async function getRoadmap(modelId: string, f: Filters) {
  return fetchJSON(`/api/mobilize/roadmap?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    roadmap: [], summary: { total: 0, high_priority: 0, waves: 0, source: "" },
    priority_distribution: {}, wave_distribution: {},
  });
}

export async function getRisk(modelId: string, f: Filters) {
  return fetchJSON(`/api/mobilize/risk?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    high_risk_tasks: [], risk_by_workstream: [],
    summary: { high_risk_count: 0, no_automate_count: 0, avg_risk: 0, total_assessed: 0 },
  });
}

// ─── Skills & Talent ────────────────────────────────────
export async function getSkillsInventory(modelId: string, filters?: Record<string, string>) {
  const params = new URLSearchParams(filters || {});
  return fetchJSON(`/api/skills/inventory/${encodeURIComponent(modelId)}?${params}`, { skills: [], summary: {} });
}

export async function getSkillsGap(modelId: string) {
  return fetchJSON(`/api/skills/gap/${encodeURIComponent(modelId)}`, { gaps: [], summary: {} });
}

export async function getSkillsAdjacency(modelId: string) {
  return fetchJSON(`/api/skills/adjacency/${encodeURIComponent(modelId)}`, { adjacencies: [], clusters: [] });
}

// ─── Build/Buy/Borrow/Automate ──────────────────────────
export async function getBBBA(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/bbba/${encodeURIComponent(modelId)}${q}`, { roles: [], summary: {} });
}

export async function getHeadcountPlan(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/headcount/${encodeURIComponent(modelId)}${q}`, { plan: [], summary: {} });
}

// ─── Readiness & Reskilling ─────────────────────────────
export async function getReadinessAssessment(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/readiness/${encodeURIComponent(modelId)}${q}`, { assessment: [], summary: {} });
}

export async function getReskillingPathways(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/reskilling/${encodeURIComponent(modelId)}${q}`, { pathways: [], summary: {} });
}

export async function getTalentMarketplace(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/marketplace/${encodeURIComponent(modelId)}${q}`, { matches: [], summary: {} });
}

// ─── Manager & Change ───────────────────────────────────
export async function getManagerCapability(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/manager-capability/${encodeURIComponent(modelId)}${q}`, { managers: [], summary: {} });
}

export async function getChangeReadiness(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/change-readiness/${encodeURIComponent(modelId)}${q}`, { segments: [], summary: {} });
}

export async function getManagerDevelopment(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/manager-development/${encodeURIComponent(modelId)}${q}`, { plans: [], summary: {} });
}

// ─── Export ─────────────────────────────────────────────
export async function getExportSummary(modelId: string, f?: Filters) {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON(`/api/export/summary/${encodeURIComponent(modelId)}${q}`, { summary: {} });
}
