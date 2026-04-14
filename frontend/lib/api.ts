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

async function fetchJSON<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers || {}),
      },
    });
    if (res.status === 401) {
      // Token expired or invalid — clear token, let app detect and show login
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      console.warn("[API] Session expired — token cleared");
      if (_apiToast) _apiToast("Your session has expired — please sign in again");
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
      return fallback;
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${path}`, err);
    if (_apiToast) {
      _apiToast("Can't reach the server — check that the backend is running and try again");
    }
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

// ─── Export ─────────────────────────────────────────────
export async function getExportSummary(modelId: string, f?: Filters): Promise<ExportSummaryResponse> {
  const q = f ? `?${filterParams(f)}` : "";
  return fetchJSON<ExportSummaryResponse>(`/api/export/summary/${encodeURIComponent(modelId)}${q}`, { summary: {} });
}
