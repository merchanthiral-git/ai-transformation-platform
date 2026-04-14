/**
 * TypeScript interfaces for all API endpoint responses.
 * Derived from fallback shapes in lib/api.ts and component usage patterns.
 */

// ─── Models ───────────────────────────────────────────────
export interface ModelsResponse {
  models: string[];
  last_loaded: string;
}

// ─── Upload / Reset ───────────────────────────────────────
export interface UploadResponse {
  sheets_loaded: number;
  active_model: string;
  jobs: string[];
  models: string[];
}

export interface ResetResponse {
  ok: boolean;
}

// ─── Filters & Jobs ──────────────────────────────────────
export interface FilterOptionsResponse {
  functions: string[];
  job_families: string[];
  sub_families: string[];
  career_levels: string[];
}

export interface JobOptionsResponse {
  jobs: string[];
}

// ─── Overview ────────────────────────────────────────────
export interface OverviewKpis {
  employees: number;
  roles: number;
  tasks_mapped: number;
  avg_span: number;
  high_ai_pct: number;
  readiness_score: number;
  readiness_tier: string;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface DataCoverageEntry {
  label: string;
  ready: boolean;
  rows?: number;
}

export interface OverviewResponse {
  kpis: OverviewKpis;
  readiness_dims: Record<string, number>;
  func_distribution: NameValue[];
  ai_distribution: NameValue[];
  data_coverage: Record<string, DataCoverageEntry>;
}

export type BenchmarksResponse = Record<string, Record<string, number | string>>;

// ─── Diagnose ────────────────────────────────────────────
export interface AIPrioritySummary {
  tasks_scored: number;
  quick_wins: number;
  total_time_impact: number;
  avg_risk: number;
}

export interface AIPriorityResponse {
  summary: AIPrioritySummary;
  top10: Record<string, unknown>[];
  workstream_impact: Record<string, unknown>[];
}

export interface AIHeatmapCell {
  function: string;
  family: string;
  score: number;
  impact: string;
  tasks: number;
  high_tasks: number;
  roles: string[];
}

export interface AIHeatmapResponse {
  cells: AIHeatmapCell[];
  functions: string[];
  families: string[];
}

export interface RoleCluster {
  name: string;
  function: string;
  family: string;
  roles: string[];
  size: number;
  headcount: number;
  avg_overlap: number;
  consolidation_candidate: boolean;
  shared_skills: string[];
  highest_pair: [string, string, number] | null;
}

export interface RoleClusterOpportunity {
  role_a: string;
  role_b: string;
  similarity: number;
  headcount_affected: number;
  estimated_savings: number;
  impact: string;
  risk: string;
}

export interface RoleClusterPair {
  role_a: string;
  role_b: string;
  similarity: number;
}

export interface RoleClustersResponse {
  clusters: RoleCluster[];
  roles: string[];
  opportunities?: RoleClusterOpportunity[];
  pairs?: RoleClusterPair[];
  summary?: Record<string, unknown>;
}

export interface SkillEntry {
  Skill: string;
  Weight: string;
}

export interface SkillGapEntry {
  Skill: string;
  Current: string;
  Future: string;
  Delta: string;
}

export interface SkillAnalysisResponse {
  current: SkillEntry[];
  future: SkillEntry[];
  gap: SkillGapEntry[];
}

export interface OrgDiagnosticsKpis {
  total: number;
  managers: number;
  ics: number;
  avg_span: number;
  max_span: number;
  layers: number;
}

export interface OrgDiagnosticsResponse {
  kpis: OrgDiagnosticsKpis;
  managers: Record<string, unknown>[];
  span_top15: Record<string, unknown>[];
  layers: NameValue[];
  layer_distribution: Record<string, unknown>[];
}

export interface DataQualitySummary {
  ready: number;
  missing: number;
  total_issues: number;
  avg_completeness: number;
}

export interface DataQualityResponse {
  summary: DataQualitySummary;
  readiness: Record<string, unknown>[];
  upload_log: Record<string, unknown>[];
}

// ─── Design ──────────────────────────────────────────────
export interface JobContextKpis {
  hours_week: number;
  tasks: number;
  workstreams: number;
  released_hrs: number;
  released_pct: number;
  future_hrs: number;
  evolution: string;
}

export interface JobContextResponse {
  kpis: JobContextKpis;
  meta: Record<string, unknown>;
  description: string;
  decon_summary: Record<string, unknown>[];
  ws_breakdown: Record<string, unknown>[];
  ai_distribution: Record<string, unknown>[];
}

export interface DeconstructionResponse {
  tasks: Record<string, unknown>[];
  dimensions: Record<string, unknown>[];
  ai_priority: Record<string, unknown>[];
}

export interface ReconstructionResponse {
  reconstruction: Record<string, unknown>[];
  rollup: Record<string, unknown>[];
  value_model: Record<string, unknown>;
  recommendations: Record<string, unknown>[];
  action_mix: Record<string, unknown>;
  waterfall: Record<string, unknown>;
  evolution: string;
  redeployment: Record<string, unknown>[];
  insights: Record<string, unknown>[];
}

// ─── Operating Model ─────────────────────────────────────
export interface OperatingModelResponse {
  kpis: Record<string, unknown>;
  maturity: Record<string, unknown>[];
  structure: Record<string, unknown>[];
  workflow: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  insights: Record<string, unknown>[];
  layer_agg: Record<string, unknown>[];
  service_split: Record<string, unknown>[];
  scope_dist: Record<string, unknown>[];
  decision_load: Record<string, unknown>[];
  stage_throughput: Record<string, unknown>[];
}

// ─── Job Architecture ────────────────────────────────────
export interface JobArchitectureResponse {
  tree: Record<string, unknown>[];
  jobs: Record<string, unknown>[];
  stats: Record<string, unknown>;
  flags: Record<string, unknown>[];
  analytics: Record<string, unknown>;
  employees: Record<string, unknown>[];
}

export interface ArchVersionsResponse {
  versions: Record<string, unknown>[];
}

// ─── OM Taxonomy ─────────────────────────────────────────
export interface OMTaxonomyResponse {
  taxonomy: { functions: Record<string, unknown>; industries_applied: string[] };
  stats: Record<string, unknown>;
  available_industries: string[];
}

export interface OMTaxonomySearchResponse {
  results: Record<string, unknown>[];
}

export interface OMConfigResponse {
  ok: boolean;
}

// ─── Simulate ────────────────────────────────────────────
export interface ReadinessResponse {
  score: number;
  total: number;
  tier: string;
  dimensions: Record<string, unknown>;
  dims: Record<string, unknown>;
}

// ─── Mobilize ────────────────────────────────────────────
export interface RoadmapSummary {
  total: number;
  high_priority: number;
  waves: number;
  source: string;
}

export interface RoadmapResponse {
  roadmap: Record<string, unknown>[];
  summary: RoadmapSummary;
  priority_distribution: Record<string, number>;
  wave_distribution: Record<string, number>;
}

export interface RiskSummary {
  high_risk_count: number;
  no_automate_count: number;
  avg_risk: number;
  total_assessed: number;
}

export interface RiskResponse {
  high_risk_tasks: Record<string, unknown>[];
  risk_by_workstream: Record<string, unknown>[];
  summary: RiskSummary;
}

// ─── Skills & Talent ────────────────────────────────────
export interface SkillsInventoryResponse {
  skills: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface SkillsGapResponse {
  gaps: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface SkillsAdjacencyResponse {
  adjacencies: Record<string, unknown>[];
  clusters: Record<string, unknown>[];
}

// ─── Build/Buy/Borrow/Automate ──────────────────────────
export interface BBBAResponse {
  roles: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface HeadcountPlanResponse {
  plan: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

// ─── Readiness & Reskilling ─────────────────────────────
export interface ReadinessAssessmentResponse {
  assessment: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface ReskillingPathwaysResponse {
  pathways: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface TalentMarketplaceResponse {
  matches: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

// ─── Manager & Change ───────────────────────────────────
export interface ManagerCapabilityManager {
  manager: string;
  scores: Record<string, number>;
  average: number;
  category: string;
  direct_reports: number;
  team_readiness_avg: number;
  correlation: number;
  team_members: { employee: string; readiness: number; band: string }[];
}

export interface ManagerCapabilityResponse {
  managers: ManagerCapabilityManager[];
  dimensions?: string[];
  summary: Record<string, unknown>;
}

export interface ChangeReadinessQuadrant {
  count: number;
}

export interface ChangeReadinessResponse {
  segments: Record<string, unknown>[];
  summary: { total_assessed?: number; [key: string]: unknown };
  quadrants?: Record<string, ChangeReadinessQuadrant>;
}

export interface ManagerDevelopmentTrack {
  manager: string;
  category: string;
  average_score: number;
  direct_reports: number;
  weak_dimensions: string[];
  interventions: { dimension: string; intervention: string; format: string; duration_weeks: number; cost: number }[];
  role_in_change: string;
  total_cost: number;
  total_weeks: number;
}

export interface ManagerDevelopmentResponse {
  plans: ManagerDevelopmentTrack[];
  tracks?: ManagerDevelopmentTrack[];
  summary: Record<string, unknown>;
}

// ─── Export ─────────────────────────────────────────────
export interface ExportSummaryResponse {
  summary: Record<string, unknown>;
  total_employees?: number;
  skills_coverage?: number;
  critical_gaps?: number;
  org_readiness?: number;
  high_risk_pct?: number;
  bbba_summary?: { build?: number; buy?: number; total_investment?: number; [key: string]: unknown };
  reskilling_summary?: { total_investment?: number; [key: string]: unknown };
  marketplace_summary?: { internal_fill?: number; [key: string]: unknown };
  headcount_waterfall?: { net_change?: number; [key: string]: unknown };
  manager_summary?: { champions?: number; [key: string]: unknown };
}
