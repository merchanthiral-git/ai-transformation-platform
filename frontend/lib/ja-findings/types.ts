/**
 * JA Findings Engine — Types
 *
 * Pure types with no React/DOM dependencies.
 * Structured so this file can be imported by a backend route later
 * when the findings engine moves server-side.
 */

// ── Finding ──

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory =
  | 'title-inflation' | 'level-compression' | 'span-outlier'
  | 'orphaned-role' | 'duplicate-role' | 'missing-level'
  | 'career-gap' | 'family-imbalance' | 'population-thin'
  | 'manager-span' | 'layer-depth' | 'naming-inconsistency';

export type EntityType = 'role' | 'family' | 'level' | 'manager' | 'architecture';

export type RiskCategory = 'pay-equity' | 'regulatory' | 'retention' | 'succession' | 'span';

export interface Remediation {
  action: string;
  targetEntityType: EntityType;
  targetEntityId: string;
  builderTab: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  changeRequires: ('decision' | 'system' | 'comms' | 'consultation')[];
  rationale: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  managerLabel?: string;
  functionLabel?: string;
  ruleId: string;
  ruleName: string;
  measurement: number | string;
  threshold: number | string;
  executiveImpactScore: number;
  peopleAffected: number;
  dollarsAffected: number | null;
  riskCategory: RiskCategory | null;
  remediation: Remediation;
  createdAt: string;
}

// ── Maturity ──

export type MaturityRating = 'Foundational' | 'Developing' | 'Mature' | 'Leading';

export interface MaturityDimension {
  id: string;
  name: string;
  score: number;
  weight: number;
  peerMedian: number;
  peerP25: number;
  peerP75: number;
  peerMin: number;
  peerMax: number;
}

export interface PeerCohortStats {
  cohortSize: number;
  cohortLabel: string;
  industryFilter?: string;
  capFilter?: string;
  overallMedian: number;
  overallP25: number;
  overallP75: number;
}

// ── Digest ──

export interface FindingsDigest {
  findings: Finding[];
  maturityRating: MaturityRating;
  maturityScore: number;
  maturityDimensions: MaturityDimension[];
  peerCohortStats: PeerCohortStats;
  generatedAt: string;
  topFindings: Finding[];
  byRiskCategory: Partial<Record<RiskCategory, Finding[]>>;
  byCategory: Partial<Record<FindingCategory, Finding[]>>;
  totals: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    totalPeopleExposed: number;
    totalDollarsExposed: number;
  };
}

// ── Input types (from getJobArchitecture response) ──

export interface JATreeNode {
  id: string;
  label: string;
  type: string;
  children?: JATreeNode[];
  headcount: number;
  [k: string]: unknown;
}

export interface JAJob {
  id: string;
  title: string;
  level: string;
  track: string;
  function: string;
  family: string;
  sub_family: string;
  headcount: number;
  ai_score: number;
  ai_impact: string;
  tasks_mapped: number;
  [k: string]: unknown;
}

export interface JAFlag {
  severity: string;
  category: string;
  title: string;
  description: string;
  affected: string;
  population: number;
  [k: string]: unknown;
}

export interface JAData {
  tree: JATreeNode[];
  jobs: JAJob[];
  stats: Record<string, unknown>;
  flags: JAFlag[];
  analytics: Record<string, unknown>;
}

// ── Narrative ──

export interface NarrativeTemplate {
  id: string;
  section: 'diagnosis' | 'topFinding' | 'peerLens' | 'riskLens' | 'roadmapLens';
  matchPriority: number;
  match: (digest: FindingsDigest, finding?: Finding) => boolean;
  render: (digest: FindingsDigest, finding?: Finding) => string;
}

export interface NarrativeOutput {
  diagnosisSummary: string;
  headlineSentence: string;
  topFindingCards: { headline: string; soWhat: string; exposureLabel: string }[];
  lensNarratives: {
    peerComparison: string;
    structuralRisks: string;
    prioritizedRoadmap: string;
  };
}
