/**
 * API client for the AI Transformation Platform.
 *
 * v3.1 — Better error visibility + non-null fallbacks for every endpoint.
 * Uses RELATIVE URLs so requests go through the Next.js proxy in next.config.ts.
 */

import type {
  ModelsResponse, UploadResponse, ResetResponse,
  FilterOptionsResponse, JobOptionsResponse,
  OverviewResponse, BenchmarksResponse,
  AIPriorityResponse, AIHeatmapResponse, RoleClustersResponse,
  SkillAnalysisResponse, OrgDiagnosticsResponse, DataQualityResponse,
  JobContextResponse, DeconstructionResponse, ReconstructionResponse,
  OperatingModelResponse,
  JobArchitectureResponse, ArchVersionsResponse,
  OMTaxonomyResponse, OMTaxonomySearchResponse, OMConfigResponse,
  ReadinessResponse,
  RoadmapResponse, RiskResponse,
  SkillsInventoryResponse, SkillsGapResponse, SkillsAdjacencyResponse,
  BBBAResponse, HeadcountPlanResponse,
  ReadinessAssessmentResponse, ReskillingPathwaysResponse, TalentMarketplaceResponse,
  ManagerCapabilityResponse, ChangeReadinessResponse, ManagerDevelopmentResponse,
  ExportSummaryResponse,
} from "../types/api";

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

// Auth headers — include JWT token on every API call
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated fetch — wraps native fetch() with auth headers. Use for non-JSON
 *  endpoints (binary downloads, fire-and-forget calls) where fetchJSON() isn't appropriate. */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers || {}) },
  });
}

/** Tracks whether the last fetchJSON call was an error — exposed to useApiData */
let _lastFetchError: { path: string; status: number; message: string } | null = null;
export function getLastFetchError() { return _lastFetchError; }

async function fetchJSON<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  _lastFetchError = null;
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers || {}),
      },
    });
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      console.warn("[API] Session expired — token cleared");
      if (_apiToast) _apiToast("Your session has expired — please sign in again");
      _lastFetchError = { path, status: 401, message: "Session expired" };
      return fallback;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = (() => { try { return JSON.parse(text)?.detail || ""; } catch { return ""; } })();
      const msg = detail || `${res.status} ${res.statusText}`;
      console.error(`[API ERROR] ${path} → ${msg}`, text.slice(0, 200));
      if (_apiToast && res.status >= 400) {
        const friendly = res.status === 401 ? "Your session has expired — please sign in again"
          : res.status === 403 ? "You don't have access to this resource"
          : res.status === 404 ? "The requested data wasn't found — it may have been moved or deleted"
          : res.status === 500 ? "Something went wrong on the server — try again in a moment"
          : `Couldn't complete this request — ${msg.slice(0, 80)}`;
        _apiToast(friendly);
      }
      _lastFetchError = { path, status: res.status, message: msg };
      return fallback;
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${path}`, err);
    if (_apiToast) {
      _apiToast("Can't reach the server — check that the backend is running and try again");
    }
    _lastFetchError = { path, status: 0, message: String(err) };
    return fallback;
  }
}

// ─── Prefetch cache ──────────────────────────────────────
const _prefetchCache: Record<string, { data: unknown; ts: number }> = {};
const PREFETCH_TTL = 30000; // 30s cache

export async function prefetch(moduleName: string, modelId: string) {
  const key = `${moduleName}:${modelId}`;
  const cached = _prefetchCache[key];
  if (cached && Date.now() - cached.ts < PREFETCH_TTL) return;
  const f = { func: "All", jf: "All", sf: "All", cl: "All" };
  const prefetchMap: Record<string, () => Promise<unknown>> = {
    snapshot: () => getOverview(modelId, f),
    scan: () => getAIPriority(modelId, f),
    design: () => getJobContext(modelId, "", f),
    simulate: () => getReadiness(modelId, f),
    plan: () => getRoadmap(modelId, f),
    export: () => getExportSummary(modelId, f),
    jobs: () => getJobArchitecture(modelId, f),
    skills: () => getSkillAnalysis(modelId, f),
  };
  const fn = prefetchMap[moduleName];
  if (fn) {
    try {
      const data = await fn();
      _prefetchCache[key] = { data, ts: Date.now() };
    } catch (e) { console.error("[Prefetch]", moduleName, e); }
  }
}

// ─── Models ───────────────────────────────────────────────
export async function getModels(): Promise<ModelsResponse> {
  return fetchJSON<ModelsResponse>("/api/models", { models: [] as string[], last_loaded: "" });
}

// ─── Upload / Reset ───────────────────────────────────────
export async function uploadFiles(files: FileList): Promise<UploadResponse> {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append("files", f));
  return fetchJSON<UploadResponse>("/api/upload", { sheets_loaded: 0, active_model: "", jobs: [] as string[], models: [] as string[] }, {
    method: "POST",
    body: formData,
  });
}

// ─── Upload Preview & Validation ────────────────────────
export async function previewUpload(files: FileList): Promise<Record<string, unknown>> {
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append("files", f));
  return fetchJSON<Record<string, unknown>>("/api/upload/preview", { files: [] }, { method: "POST", body: formData });
}
export async function getValidationReport(modelId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/upload/validation/${encodeURIComponent(modelId)}`, {});
}

export async function resetData(): Promise<ResetResponse> {
  return fetchJSON<ResetResponse>("/api/reset", { ok: true }, { method: "POST" });
}

// ─── Filters & Jobs ──────────────────────────────────────
const EMPTY_FILTERS = { functions: ["All"], job_families: ["All"], sub_families: ["All"], career_levels: ["All"] };

export async function getFilterOptions(modelId: string, func = "All", jf = "All", sf = "All"): Promise<FilterOptionsResponse> {
  return fetchJSON<FilterOptionsResponse>(
    `/api/filter-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}`,
    EMPTY_FILTERS
  );
}

export async function getJobOptions(modelId: string, func = "All", jf = "All", sf = "All", cl = "All"): Promise<JobOptionsResponse> {
  return fetchJSON<JobOptionsResponse>(
    `/api/job-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}&cl=${encodeURIComponent(cl)}`,
    { jobs: [] as string[] }
  );
}

// ─── Overview ────────────────────────────────────────────
export async function getOverview(modelId: string, f: Filters): Promise<OverviewResponse> {
  return fetchJSON<OverviewResponse>(`/api/overview?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: { employees: 0, roles: 0, tasks_mapped: 0, avg_span: 0, high_ai_pct: 0, readiness_score: 0, readiness_tier: "" },
    readiness_dims: {} as Record<string, number>,
    func_distribution: [],
    ai_distribution: [],
    data_coverage: {},
  });
}

export async function getBenchmarks(industry: string, employees: number): Promise<BenchmarksResponse> {
  return fetchJSON<BenchmarksResponse>(`/api/benchmarks?industry=${encodeURIComponent(industry)}&employees=${employees}`, {});
}

// ─── Diagnose ────────────────────────────────────────────
export async function getAIPriority(modelId: string, f: Filters): Promise<AIPriorityResponse> {
  return fetchJSON<AIPriorityResponse>(`/api/diagnose/ai-priority?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    summary: { tasks_scored: 0, quick_wins: 0, total_time_impact: 0, avg_risk: 0 },
    top10: [],
    workstream_impact: [],
  });
}

export async function getAIHeatmap(modelId: string, f: Filters): Promise<AIHeatmapResponse> {
  return fetchJSON<AIHeatmapResponse>(`/api/diagnose/heatmap?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    cells: [], functions: [], families: [],
  });
}

export async function getRoleClusters(modelId: string, f: Filters): Promise<RoleClustersResponse> {
  return fetchJSON<RoleClustersResponse>(`/api/diagnose/clusters?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    clusters: [], roles: [],
  });
}

export async function getSkillAnalysis(modelId: string, f: Filters): Promise<SkillAnalysisResponse> {
  return fetchJSON<SkillAnalysisResponse>(`/api/diagnose/skills?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    current: [], future: [], gap: [],
  });
}

export async function getOrgDiagnostics(modelId: string, f: Filters): Promise<OrgDiagnosticsResponse> {
  return fetchJSON<OrgDiagnosticsResponse>(`/api/diagnose/org?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: { total: 0, managers: 0, ics: 0, avg_span: 0, max_span: 0, layers: 0 },
    managers: [], span_top15: [], layers: [], layer_distribution: [],
  });
}

export async function getDataQuality(modelId: string): Promise<DataQualityResponse> {
  return fetchJSON<DataQualityResponse>(`/api/diagnose/data-quality?model_id=${encodeURIComponent(modelId)}`, {
    summary: { ready: 0, missing: 0, total_issues: 0, avg_completeness: 0 },
    readiness: [], upload_log: [],
  });
}

// ─── Design ──────────────────────────────────────────────
export async function getJobContext(modelId: string, job: string, f: Filters): Promise<JobContextResponse> {
  return fetchJSON<JobContextResponse>(`/api/design/job-context?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
    kpis: { hours_week: 0, tasks: 0, workstreams: 0, released_hrs: 0, released_pct: 0, future_hrs: 0, evolution: "" },
    meta: {}, description: "", decon_summary: [], ws_breakdown: [], ai_distribution: [],
  });
}

export async function getDeconstruction(modelId: string, job: string, f: Filters): Promise<DeconstructionResponse> {
  return fetchJSON<DeconstructionResponse>(`/api/design/deconstruction?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
    tasks: [], dimensions: [], ai_priority: [],
  });
}

export async function computeReconstruction(tasks: Record<string, unknown>[], scenario = "Balanced"): Promise<ReconstructionResponse> {
  return fetchJSON<ReconstructionResponse>("/api/design/reconstruct", {
    reconstruction: [], rollup: [], value_model: {}, recommendations: [],
    action_mix: {}, waterfall: {}, evolution: "", redeployment: [], insights: [],
  }, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, scenario }),
  });
}

// ─── Operating Model ─────────────────────────────────────
export async function getOperatingModel(modelId: string, f: Filters): Promise<OperatingModelResponse> {
  return fetchJSON<OperatingModelResponse>(`/api/operating-model?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    kpis: {}, maturity: [], structure: [], workflow: [], decisions: [], insights: [],
    layer_agg: [], service_split: [], scope_dist: [], decision_load: [], stage_throughput: [],
  });
}

// ─── Job Architecture ────────────────────────────────────
export async function getJobArchitecture(modelId: string, f: Filters): Promise<JobArchitectureResponse> {
  return fetchJSON<JobArchitectureResponse>(`/api/job-architecture?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    tree: [], jobs: [], stats: {}, flags: [], analytics: {}, employees: [],
  });
}

export async function saveArchVersion(modelId: string, version: { name: string; description: string; tree: unknown[]; mappings: unknown[]; recommended: boolean }) {
  return fetchJSON(`/api/job-architecture/versions?model_id=${encodeURIComponent(modelId)}`, {}, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(version),
  });
}

export async function getArchVersions(modelId: string): Promise<ArchVersionsResponse> {
  return fetchJSON<ArchVersionsResponse>(`/api/job-architecture/versions?model_id=${encodeURIComponent(modelId)}`, { versions: [] });
}

export async function deleteArchVersion(modelId: string, versionId: string) {
  return fetchJSON(`/api/job-architecture/versions/${versionId}?model_id=${encodeURIComponent(modelId)}`, {}, { method: "DELETE" });
}

export async function toggleArchRecommend(modelId: string, versionId: string) {
  return fetchJSON(`/api/job-architecture/versions/${versionId}/recommend?model_id=${encodeURIComponent(modelId)}`, {}, { method: "PUT" });
}

// ─── Operating Model Taxonomy ────────────────────────────
export async function getOMTaxonomy(industries?: string[]): Promise<OMTaxonomyResponse> {
  const q = industries?.length ? `?industry=${industries.join(",")}` : "";
  return fetchJSON<OMTaxonomyResponse>(`/api/om-taxonomy${q}`, { taxonomy: { functions: {}, industries_applied: [] }, stats: {}, available_industries: [] });
}

export async function searchOMTaxonomy(query: string, industries?: string[]): Promise<OMTaxonomySearchResponse> {
  const indQ = industries?.length ? `&industry=${industries.join(",")}` : "";
  return fetchJSON<OMTaxonomySearchResponse>(`/api/om-taxonomy/search?q=${encodeURIComponent(query)}${indQ}`, { results: [] });
}

export async function saveOMConfig(config: Record<string, unknown>): Promise<OMConfigResponse> {
  return fetchJSON<OMConfigResponse>("/api/om-taxonomy/configure", { ok: false }, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
  });
}

// ─── Simulate ────────────────────────────────────────────
export async function getReadiness(modelId: string, f: Filters): Promise<ReadinessResponse> {
  return fetchJSON<ReadinessResponse>(`/api/simulate/readiness?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    score: 0, total: 0, tier: "", dimensions: {}, dims: {},
  });
}

export function simulateCustom(modelId: string, params: { adoption_rate: number; timeline_months: number; investment: number }) {
  return fetchJSON<Record<string, unknown>>(`/api/simulate/custom?model_id=${encodeURIComponent(modelId)}`, null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ─── Mobilize ────────────────────────────────────────────
export async function getRoadmap(modelId: string, f: Filters): Promise<RoadmapResponse> {
  return fetchJSON<RoadmapResponse>(`/api/mobilize/roadmap?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    roadmap: [], summary: { total: 0, high_priority: 0, waves: 0, source: "" },
    priority_distribution: {}, wave_distribution: {},
  });
}

export async function getRisk(modelId: string, f: Filters): Promise<RiskResponse> {
  return fetchJSON<RiskResponse>(`/api/mobilize/risk?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
    high_risk_tasks: [], risk_by_workstream: [],
    summary: { high_risk_count: 0, no_automate_count: 0, avg_risk: 0, total_assessed: 0 },
  });
}

// ─── Skills & Talent ────────────────────────────────────
export async function getSkillsInventory(modelId: string, filters?: Record<string, string>): Promise<SkillsInventoryResponse> {
  const params = new URLSearchParams(filters || {});
  return fetchJSON<SkillsInventoryResponse>(`/api/skills/inventory/${encodeURIComponent(modelId)}?${params}`, { skills: [], summary: {} });
}

export async function getSkillsGap(modelId: string): Promise<SkillsGapResponse> {
  return fetchJSON<SkillsGapResponse>(`/api/skills/gap/${encodeURIComponent(modelId)}`, { gaps: [], summary: {} });
}

export async function getSkillsAdjacency(modelId: string): Promise<SkillsAdjacencyResponse> {
  return fetchJSON<SkillsAdjacencyResponse>(`/api/skills/adjacency/${encodeURIComponent(modelId)}`, { adjacencies: [], clusters: [] });
}

// ─── Skills Engine (new) ────────────────────────────────
export async function getSkillsLibrary(category?: string, trend?: string, importance?: string): Promise<Record<string, unknown>> {
  const p = new URLSearchParams();
  if (category) p.set("category", category);
  if (trend) p.set("trend", trend);
  if (importance) p.set("importance", importance);
  return fetchJSON<Record<string, unknown>>(`/api/skills?${p}`, { skills: [], total: 0 });
}
export async function getSkillDetail(skillId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/${encodeURIComponent(skillId)}`, {});
}
export async function createSkill(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getSkillsTaxonomy(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/taxonomy", { taxonomy: [] });
}
export async function getSkillsMappings(sourceType?: string, skillId?: string): Promise<Record<string, unknown>> {
  const p = new URLSearchParams();
  if (sourceType) p.set("source_type", sourceType);
  if (skillId) p.set("skill_id", skillId);
  return fetchJSON<Record<string, unknown>>(`/api/skills/mappings?${p}`, { mappings: [] });
}
export async function createSkillMapping(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/mappings", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getSkillsGraph(category?: string): Promise<Record<string, unknown>> {
  const p = category ? `?category=${category}` : "";
  return fetchJSON<Record<string, unknown>>(`/api/skills/graph${p}`, { nodes: [], edges: [] });
}
export async function getSkillsGraphClusters(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/graph/clusters", {});
}
export async function getSkillsGaps(scope?: string, scopeId?: string): Promise<Record<string, unknown>> {
  const p = new URLSearchParams();
  if (scope) p.set("scope", scope);
  if (scopeId) p.set("scope_id", scopeId);
  return fetchJSON<Record<string, unknown>>(`/api/skills/gaps?${p}`, { critical_gaps: [], moderate_gaps: [], coverage_score: 0, heatmap: {} });
}
export async function getSkillsDemandForecast(horizon?: number): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/demand-forecast?horizon=${horizon || 12}`, { rising_skills: [], declining_skills: [], stable_skills: [] });
}
export async function getSkillsAutomationRisk(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/automation-risk", { skills: [] });
}
export async function getSkillsEvents(limit?: number): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/events?limit=${limit || 50}`, { events: [] });
}
export async function inferSkills(jobTitle: string, tasks?: string[], description?: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/infer", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ job_title: jobTitle, tasks, description }) });
}

// ─── Job Notes & Restructuring ──────────────────────────
export async function getNotes(jobTitle?: string, category?: string, search?: string): Promise<Record<string, unknown>> {
  const p = new URLSearchParams();
  if (jobTitle) p.set("job_title", jobTitle);
  if (category) p.set("category", category);
  if (search) p.set("search", search);
  return fetchJSON<Record<string, unknown>>(`/api/notes?${p}`, { notes: [], total: 0 });
}
export async function createNote(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/notes", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getNotesForJob(jobTitle: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/notes/job/${encodeURIComponent(jobTitle)}`, { notes: [], total: 0 });
}
export async function updateNote(noteId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/notes/${noteId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function confirmNote(noteId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/notes/${noteId}/confirm`, {}, { method: "POST", headers: getAuthHeaders() });
}
export async function getReorgScenarios(modelId?: string): Promise<Record<string, unknown>> {
  const p = modelId ? `?model_id=${encodeURIComponent(modelId)}` : "";
  return fetchJSON<Record<string, unknown>>(`/api/reorg/scenarios${p}`, { scenarios: [], total: 0 });
}
export async function saveReorgScenario(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/reorg/scenarios", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getReorgImpact(scenarioId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/reorg/impact/${scenarioId}`, {});
}

// ─── Job Content Authoring ──────────────────────────────
export async function getJobContentTaxonomy(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/taxonomy", { tree: [], flat: [], total: 0 });
}
export async function createJobContentNode(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/taxonomy", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function updateJobContentNode(nodeId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/taxonomy/${nodeId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function deleteJobContentNode(nodeId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/taxonomy/${nodeId}`, {}, { method: "DELETE", headers: getAuthHeaders() });
}
export async function getJobContentThemes(subFamilyId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/themes/${subFamilyId}`, { themes: [], count: 0 });
}
export async function createJobContentTheme(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/themes", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function applyDefaultThemes(subFamilyId: string, archetype?: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/themes/defaults", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ sub_family_id: subFamilyId, archetype: archetype || "default" }) });
}
export async function getJobContentVerbs(subFamilyId: string, track?: string): Promise<Record<string, unknown>> {
  const p = track ? `?track=${track}` : "";
  return fetchJSON<Record<string, unknown>>(`/api/job-content/verbs/${subFamilyId}${p}`, { verbs: [] });
}
export async function applyDefaultVerbs(subFamilyId: string, track: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/verbs/defaults", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ sub_family_id: subFamilyId, track }) });
}
export async function getJobContent(subFamilyId: string, track?: string, level?: string): Promise<Record<string, unknown>> {
  const p = new URLSearchParams(); if (track) p.set("track", track); if (level) p.set("level", level);
  return fetchJSON<Record<string, unknown>>(`/api/job-content/content/${subFamilyId}?${p}`, { content: [], count: 0 });
}
export async function saveJobContentBulk(items: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/content/bulk", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ items }) });
}
export async function buildJobContentPrompt(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/build-prompt", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function generateJobContent(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/generate", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getJobContentComposed(subFamilyId: string, track: string, level: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/composed/${subFamilyId}/${track}/${level}`, {});
}
export async function saveJobContentTemplate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/templates", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}

// Phase management
export async function getJobContentPhases(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/phases", { phases: {} });
}
export async function updateJobContentPhase(phaseId: string, status: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/phases/${phaseId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ status }) });
}

// Definitions
export async function getJobContentDefinition(nodeId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/definitions/${nodeId}`, {});
}
export async function updateJobContentDefinition(nodeId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/definitions/${nodeId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function listJobContentDefinitions(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/definitions", { definitions: [] });
}
export async function draftJobContentDefinition(nodeId: string, field: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/job-content/definitions/${nodeId}/draft`, {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ field }) });
}
export async function checkSiblingOverlap(nodeIds: string[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/definitions/check-overlap", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ node_ids: nodeIds }) });
}
export async function checkUpwardCoherence(familyId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/definitions/check-coherence", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ family_id: familyId }) });
}

// Leveling
export async function getJobContentLeveling(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/leveling", { tracks: [] });
}
export async function updateJobContentLeveling(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/leveling", {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function draftLevelingFramework(industry: string, orgSize: string, tracks: string[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/leveling/draft", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ industry, org_size: orgSize, tracks }) });
}

// Discovery
export async function normalizeTitles(titles: string[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/discovery/normalize", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ titles }) });
}

// Architecture balance
export async function getArchitectureBalance(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/architecture/balance", {});
}

// Feedback
export async function listJobContentFeedback(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/feedback", { feedback: [] });
}
export async function addJobContentFeedback(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/job-content/feedback", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}

// ─── Build/Buy/Borrow/Automate ──────────────────────────
export async function getBBBA(modelId: string, f?: Filters): Promise<BBBAResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<BBBAResponse>(`/api/bbba/${encodeURIComponent(modelId)}${q}`, { roles: [], summary: {} });
}

export async function getHeadcountPlan(modelId: string, f?: Filters): Promise<HeadcountPlanResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<HeadcountPlanResponse>(`/api/headcount/${encodeURIComponent(modelId)}${q}`, { plan: [], summary: {} });
}

// ─── Readiness & Reskilling ─────────────────────────────
export async function getReadinessAssessment(modelId: string, f?: Filters): Promise<ReadinessAssessmentResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ReadinessAssessmentResponse>(`/api/readiness/${encodeURIComponent(modelId)}${q}`, { assessment: [], summary: {} });
}

export async function getReskillingPathways(modelId: string, f?: Filters): Promise<ReskillingPathwaysResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ReskillingPathwaysResponse>(`/api/reskilling/${encodeURIComponent(modelId)}${q}`, { pathways: [], summary: {} });
}

export async function getTalentMarketplace(modelId: string, f?: Filters): Promise<TalentMarketplaceResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<TalentMarketplaceResponse>(`/api/marketplace/${encodeURIComponent(modelId)}${q}`, { matches: [], summary: {} });
}

// ─── Manager & Change ───────────────────────────────────
export async function getManagerCapability(modelId: string, f?: Filters): Promise<ManagerCapabilityResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ManagerCapabilityResponse>(`/api/manager-capability/${encodeURIComponent(modelId)}${q}`, { managers: [] as ManagerCapabilityResponse["managers"], summary: {} });
}

export async function getChangeReadiness(modelId: string, f?: Filters): Promise<ChangeReadinessResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ChangeReadinessResponse>(`/api/change-readiness/${encodeURIComponent(modelId)}${q}`, { segments: [], summary: {} });
}

export async function getManagerDevelopment(modelId: string, f?: Filters): Promise<ManagerDevelopmentResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ManagerDevelopmentResponse>(`/api/manager-development/${encodeURIComponent(modelId)}${q}`, { plans: [], summary: {} });
}

// ─── Skills Library ─────────────────────────────────────
export async function searchSkillsLibrary(params?: Record<string, string>): Promise<Record<string, unknown>> {
  const p = new URLSearchParams(params || {});
  return fetchJSON<Record<string, unknown>>(`/api/skills/library?${p}`, { skills: [], total: 0 });
}
export async function getSkillsLibraryDomains(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/library/domains", { domains: [] });
}
export async function getSkillFromLibrary(skillId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/library/${skillId}`, {});
}
export async function addSkillToLibrary(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/library", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function updateSkillInLibrary(skillId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/library/${skillId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function matchSkillsToRole(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/library/match", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getSkillsLibraryStats(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills/library/stats", {});
}
export async function getIndustrySkills(industry: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills/library/industry/${encodeURIComponent(industry)}`, { skills: [], count: 0 });
}

// ─── Export ─────────────────────────────────────────────
export async function getExportSummary(modelId: string, f?: Filters): Promise<ExportSummaryResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ExportSummaryResponse>(`/api/export/summary/${encodeURIComponent(modelId)}${q}`, { summary: {} });
}

// ─── O*NET Skills Map Engine ────────────────────────────
export async function searchOnetOccupations(params?: Record<string, string>): Promise<Record<string, unknown>> {
  const p = new URLSearchParams(params || {});
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/occupations?${p}`, { occupations: [], total: 0 });
}
export async function getOnetOccupation(socCode: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/occupations/${encodeURIComponent(socCode)}`, {});
}
export async function getOnetOccupationSkills(socCode: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/occupations/${encodeURIComponent(socCode)}/skills`, { skills: [] });
}
export async function listOnetSkills(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/skills", { skills: [] });
}
export async function getOnetSkillOccupations(elementId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/skills/${encodeURIComponent(elementId)}/occupations`, { occupations: [] });
}
export async function searchOnetAll(q: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/search?q=${encodeURIComponent(q)}`, { occupations: [], skills: [] });
}
export async function getOnetMajorGroups(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/major-groups", { major_groups: [] });
}
export async function matchJobToOnet(title: string, description?: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/match-single", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ title, description }) });
}
export async function autoMatchJobs(jobs: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/auto-match", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ jobs }) });
}
export async function confirmOnetMatch(jobId: string, socCode: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/confirm-match", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ job_id: jobId, onet_soc_code: socCode }) });
}
export async function getOnetMatchStatus(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/match-status", { confirmed_matches: [], total: 0 });
}
export async function getMapperJobs(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/mapper/jobs", { jobs: [] });
}
export async function getJobMappedSkills(jobId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/mapper/jobs/${encodeURIComponent(jobId)}/skills`, {});
}
export async function updateJobMappedSkills(jobId: string, skills: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/mapper/jobs/${encodeURIComponent(jobId)}/skills`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ skills }) });
}
export async function addCustomSkill(jobId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/mapper/jobs/${encodeURIComponent(jobId)}/custom-skill`, {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function submitJobForReview(jobId: string, reviewer?: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/mapper/jobs/${encodeURIComponent(jobId)}/submit-review`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ reviewer }) });
}
export async function approveJobMapping(jobId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/skills-map/mapper/jobs/${encodeURIComponent(jobId)}/approve`, {}, { method: "PUT", headers: { ...getAuthHeaders() } });
}
export async function getMapperProgress(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/mapper/progress", {});
}
export async function getSkillsMapExportByJob(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/export/by-job", { rows: [] });
}
export async function getSkillsMapExportBySkill(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/export/by-skill", { skills: [] });
}
export async function getSkillsMapExportSummary(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/skills-map/export/summary", {});
}

// ─── Platform Concierge ─────────────────────────────────
export async function getConciergeTools(): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/concierge/tools", { tools: [], dimensions: [] });
}
export async function getAssessmentQuestions(depth?: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/concierge/assessment/questions?depth=${depth || "comprehensive"}`, { questions: [] });
}
export async function submitAssessment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/concierge/assessment", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getAssessment(projectId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/concierge/assessment/${projectId}`, {});
}
export async function generateRoadmap(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/concierge/generate-roadmap", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(data) });
}
export async function getConciergeRoadmap(projectId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/concierge/roadmap/${projectId}`, {});
}
export async function askConcierge(message: string, currentPage?: string, scores?: Record<string, number>, completedTools?: string[]): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>("/api/concierge/ask", {}, { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ message, current_page: currentPage, assessment_scores: scores, completed_tools: completedTools }) });
}
export async function getConciergeProgress(projectId: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/concierge/progress/${projectId}`, {});
}
export async function updateToolProgress(projectId: string, toolId: string, status: string): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(`/api/concierge/progress/${projectId}/tool/${toolId}`, {}, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify({ status }) });
}

// ─── Decision Persistence ──────────────────────────────
export function logDecisionToBackend(modelId: string, module: string, action: string, detail: string, metadata: Record<string, unknown> = {}) {
  return fetchJSON(`/api/decisions/${encodeURIComponent(modelId)}`, {}, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, action, detail, metadata }) });
}
export function getDecisions(modelId: string) {
  return fetchJSON(`/api/decisions/${encodeURIComponent(modelId)}`, { decisions: [] });
}
export function lockScenario(modelId: string, scenarioName: string, scenarioData: Record<string, unknown>) {
  return fetchJSON(`/api/decisions/${encodeURIComponent(modelId)}/scenario`, {}, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario_name: scenarioName, scenario_data: scenarioData }) });
}
export function getLockedScenario(modelId: string) {
  return fetchJSON(`/api/decisions/${encodeURIComponent(modelId)}/scenario`, null);
}
