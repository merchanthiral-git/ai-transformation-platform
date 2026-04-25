/**
 * JA Findings Engine — Pure Transform
 *
 * No React/DOM dependencies. Importable from a backend route later
 * without rewriting consumers.
 *
 * v1: runs client-side. Structured for server-side migration.
 */
import type {
  Finding, FindingSeverity, FindingCategory, EntityType, RiskCategory,
  Remediation, MaturityRating, MaturityDimension, PeerCohortStats,
  FindingsDigest, JAData, JAJob, JATreeNode, JAFlag,
} from "./types";

// ── Severity weight for executiveImpactScore ──

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  critical: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.15,
};

function computeExecutiveImpactScore(
  severity: FindingSeverity,
  peopleAffected: number,
  dollarsAffected: number | null,
  totalHeadcount: number,
): number {
  const severityComponent = SEVERITY_WEIGHT[severity] * 40;
  const peoplePct = totalHeadcount > 0 ? peopleAffected / totalHeadcount : 0;
  const peopleComponent = Math.min(peoplePct / 0.25, 1) * 40;
  let dollarComponent = 0;
  if (dollarsAffected !== null && dollarsAffected > 0) {
    dollarComponent = Math.min(Math.log10(dollarsAffected / 10_000) * 5, 20);
  }
  return Math.round(Math.min(severityComponent + peopleComponent + dollarComponent, 100));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Finding generators (one per rule type) ──

function makeFinding(
  ruleId: string, ruleName: string, category: FindingCategory, severity: FindingSeverity,
  entityType: EntityType, entityId: string, entityLabel: string,
  measurement: number | string, threshold: number | string,
  peopleAffected: number, totalHeadcount: number,
  riskCategory: RiskCategory | null, remediation: Remediation,
  extras?: { managerLabel?: string; functionLabel?: string; dollarsAffected?: number },
): Finding {
  const dollarsAffected = extras?.dollarsAffected ?? null;
  return {
    id: `${ruleId}::${entityId}`,
    category, severity, entityType, entityId, entityLabel,
    managerLabel: extras?.managerLabel,
    functionLabel: extras?.functionLabel,
    ruleId, ruleName, measurement, threshold,
    executiveImpactScore: computeExecutiveImpactScore(severity, peopleAffected, dollarsAffected, totalHeadcount),
    peopleAffected, dollarsAffected, riskCategory, remediation,
    createdAt: new Date().toISOString(),
  };
}

function detectSpanOutliers(jobs: JAJob[], tree: JATreeNode[], totalHC: number): Finding[] {
  const findings: Finding[] = [];
  const managers = jobs.filter(j => j.headcount > 0 && (j.track === "Manager" || j.track === "M" || j.level?.startsWith("M") || j.level?.startsWith("E")));
  for (const mgr of managers) {
    if (mgr.headcount > 12) {
      findings.push(makeFinding(
        'span-exceeds-12', 'Span exceeds 12 direct reports', 'span-outlier', 'high',
        'manager', mgr.id, mgr.title, mgr.headcount, 12,
        mgr.headcount, totalHC, 'span',
        { action: 'Split reporting lines or add a layer', targetEntityType: 'manager', targetEntityId: mgr.id, builderTab: 'map', estimatedEffort: 'medium', changeRequires: ['decision', 'comms'], rationale: 'Span exceeds healthy range of 4-10, risking manager burnout and reduced coaching.' },
        { managerLabel: mgr.title, functionLabel: mgr.function },
      ));
    } else if (mgr.headcount < 3 && mgr.headcount > 0) {
      findings.push(makeFinding(
        'span-below-3', 'Span below 3 direct reports', 'span-outlier', 'medium',
        'manager', mgr.id, mgr.title, mgr.headcount, 3,
        mgr.headcount, totalHC, 'span',
        { action: 'Consolidate with adjacent manager role', targetEntityType: 'manager', targetEntityId: mgr.id, builderTab: 'map', estimatedEffort: 'medium', changeRequires: ['decision', 'comms'], rationale: 'Narrow span suggests a layer that may not justify a dedicated management role.' },
        { managerLabel: mgr.title, functionLabel: mgr.function },
      ));
    }
  }
  return findings;
}

function detectMissingLevels(jobs: JAJob[], totalHC: number): Finding[] {
  const findings: Finding[] = [];
  const levelsUsed = new Set(jobs.map(j => j.level).filter(Boolean));
  const jobsWithoutLevel = jobs.filter(j => !j.level || j.level.trim() === '');
  if (jobsWithoutLevel.length > 0) {
    findings.push(makeFinding(
      'missing-level-code', 'Roles without level assignment', 'missing-level', jobsWithoutLevel.length > 10 ? 'high' : 'medium',
      'architecture', 'arch-levels', 'Architecture-wide', jobsWithoutLevel.length, 0,
      jobsWithoutLevel.reduce((s, j) => s + j.headcount, 0), totalHC, 'pay-equity',
      { action: 'Assign level codes using the Framework Builder', targetEntityType: 'architecture', targetEntityId: 'arch-levels', builderTab: 'ja-framework', estimatedEffort: 'medium', changeRequires: ['decision', 'system'], rationale: 'Roles without levels cannot be graded, benchmarked, or slotted into career paths.' },
    ));
  }
  return findings;
}

function detectDuplicateRoles(jobs: JAJob[], totalHC: number): Finding[] {
  const findings: Finding[] = [];
  const titleCounts = new Map<string, JAJob[]>();
  for (const j of jobs) {
    const normalized = j.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!titleCounts.has(normalized)) titleCounts.set(normalized, []);
    titleCounts.get(normalized)!.push(j);
  }
  for (const [, dupes] of titleCounts) {
    if (dupes.length > 1 && new Set(dupes.map(d => d.family)).size > 1) {
      const totalAffected = dupes.reduce((s, d) => s + d.headcount, 0);
      findings.push(makeFinding(
        'duplicate-title-cross-family', 'Duplicate role title across families', 'duplicate-role', 'medium',
        'role', dupes[0].id, dupes[0].title, dupes.length, 1,
        totalAffected, totalHC, 'pay-equity',
        { action: 'Consolidate or differentiate role titles', targetEntityType: 'role', targetEntityId: dupes[0].id, builderTab: 'ja-mapping', estimatedEffort: 'low', changeRequires: ['decision'], rationale: `"${dupes[0].title}" appears in ${dupes.length} families — creates inconsistent grading and comp benchmarking.` },
      ));
    }
  }
  return findings;
}

function detectFamilyImbalance(jobs: JAJob[], tree: JATreeNode[], totalHC: number): Finding[] {
  const findings: Finding[] = [];
  const familyCounts = new Map<string, number>();
  for (const j of jobs) {
    familyCounts.set(j.family, (familyCounts.get(j.family) || 0) + j.headcount);
  }
  const values = [...familyCounts.values()];
  if (values.length < 2) return findings;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  for (const [family, count] of familyCounts) {
    if (count > avg * 3 && count > 50) {
      findings.push(makeFinding(
        'family-oversized', 'Oversized job family', 'family-imbalance', 'medium',
        'family', family, family, count, Math.round(avg),
        count, totalHC, null,
        { action: 'Evaluate splitting into sub-families', targetEntityType: 'family', targetEntityId: family, builderTab: 'map', estimatedEffort: 'high', changeRequires: ['decision', 'system', 'comms'], rationale: `Family "${family}" is ${Math.round(count / avg)}x the average size, suggesting it conflates distinct capability areas.` },
      ));
    }
  }
  return findings;
}

function detectFromFlags(flags: JAFlag[], totalHC: number): Finding[] {
  const findings: Finding[] = [];
  for (const flag of flags) {
    const severity: FindingSeverity = flag.severity === 'critical' ? 'critical' : flag.severity === 'error' ? 'high' : flag.severity === 'warning' ? 'medium' : 'low';
    const category: FindingCategory = flag.category?.includes('span') ? 'span-outlier'
      : flag.category?.includes('level') ? 'level-compression'
      : flag.category?.includes('career') ? 'career-gap'
      : flag.category?.includes('title') ? 'title-inflation'
      : 'naming-inconsistency';

    findings.push(makeFinding(
      `flag-${flag.category || 'general'}`, flag.title || flag.description, category, severity,
      'role', flag.affected || 'unknown', flag.affected || flag.title, flag.population || 0, 0,
      flag.population || 0, totalHC, null,
      { action: `Review and resolve: ${flag.description}`, targetEntityType: 'role', targetEntityId: flag.affected || 'unknown', builderTab: 'map', estimatedEffort: 'low', changeRequires: ['decision'], rationale: flag.description },
    ));
  }
  return findings;
}

// ── Maturity dimensions ──

const DIMENSION_DEFS = [
  { id: 'leveling', name: 'Leveling consistency', weight: 0.25 },
  { id: 'family-coverage', name: 'Family coverage', weight: 0.15 },
  { id: 'span-health', name: 'Span health', weight: 0.20 },
  { id: 'title-standardization', name: 'Title standardization', weight: 0.15 },
  { id: 'career-paths', name: 'Career path completeness', weight: 0.15 },
  { id: 'population-balance', name: 'Population balance', weight: 0.10 },
] as const;

function scoreDimension(id: string, jobs: JAJob[], tree: JATreeNode[]): number {
  const totalRoles = jobs.length || 1;

  switch (id) {
    case 'leveling': {
      const validLevels = jobs.filter(j => j.level && j.level.trim().length > 0 && /^[A-Z]\d/.test(j.level)).length;
      const pct = validLevels / totalRoles;
      return clamp(((pct - 0.5) / 0.5) * 100, 0, 100);
    }
    case 'family-coverage': {
      const functions = new Set(jobs.map(j => j.function).filter(Boolean));
      const functionsWithFamilies = new Set(jobs.filter(j => j.family && j.family.trim().length > 0).map(j => j.function));
      const familiesPerFunc = new Map<string, Set<string>>();
      for (const j of jobs) {
        if (!j.function || !j.family) continue;
        if (!familiesPerFunc.has(j.function)) familiesPerFunc.set(j.function, new Set());
        familiesPerFunc.get(j.function)!.add(j.family);
      }
      const coveredFunctions = [...familiesPerFunc.entries()].filter(([, fams]) => fams.size >= 3).length;
      return functions.size > 0 ? clamp((coveredFunctions / functions.size) * 100, 0, 100) : 0;
    }
    case 'span-health': {
      const managers = jobs.filter(j => j.headcount > 0 && (j.level?.startsWith("M") || j.level?.startsWith("E")));
      if (managers.length === 0) return 50;
      const healthy = managers.filter(j => j.headcount >= 4 && j.headcount <= 10).length;
      return clamp((healthy / managers.length) * 100, 0, 100);
    }
    case 'title-standardization': {
      const titles = jobs.map(j => j.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim());
      const unique = new Set(titles);
      const dupeRatio = 1 - (unique.size / (titles.length || 1));
      return clamp((1 - dupeRatio * 3) * 100, 0, 100); // 33%+ dupes = 0
    }
    case 'career-paths': {
      const familiesWithMultipleLevels = new Map<string, Set<string>>();
      for (const j of jobs) {
        if (!j.family || !j.level) continue;
        if (!familiesWithMultipleLevels.has(j.family)) familiesWithMultipleLevels.set(j.family, new Set());
        familiesWithMultipleLevels.get(j.family)!.add(j.level);
      }
      const totalFamilies = familiesWithMultipleLevels.size || 1;
      const withPaths = [...familiesWithMultipleLevels.values()].filter(levels => levels.size >= 3).length;
      return clamp((withPaths / totalFamilies) * 100, 0, 100);
    }
    case 'population-balance': {
      const familyCounts = new Map<string, number>();
      for (const j of jobs) familyCounts.set(j.family, (familyCounts.get(j.family) || 0) + j.headcount);
      const values = [...familyCounts.values()];
      if (values.length < 2) return 50;
      const total = values.reduce((s, v) => s + v, 0);
      const mean = total / values.length;
      const gini = values.reduce((s, v) => s + Math.abs(v - mean), 0) / (2 * values.length * mean);
      return clamp((1 - gini) * 100, 0, 100);
    }
    default: return 50;
  }
}

function computeMaturityRating(score: number): MaturityRating {
  if (score >= 80) return 'Leading';
  if (score >= 60) return 'Mature';
  if (score >= 40) return 'Developing';
  return 'Foundational';
}

// ── Peer cohort computation (v1: all 24 companies) ──

function computePeerCohort(currentDimensions: MaturityDimension[]): PeerCohortStats {
  // v1: peer stats are seeded from dimension-level peer data
  // When sandbox profiles compute their own dimensions, these come from
  // getAllProfiles(). For now, use reasonable defaults based on the dimension scores.
  const scores = currentDimensions.map(d => d.peerMedian);
  const median = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 55;
  return {
    cohortSize: 24,
    cohortLabel: 'All sandbox companies',
    overallMedian: Math.round(median),
    overallP25: Math.round(median * 0.8),
    overallP75: Math.round(median * 1.15),
  };
}

// ── Main entry point ──

export function computeFindingsDigest(data: JAData | null, model: string): FindingsDigest {
  const now = new Date().toISOString();

  if (!data || !data.jobs || data.jobs.length === 0) {
    const emptyDimensions: MaturityDimension[] = DIMENSION_DEFS.map(d => ({
      id: d.id, name: d.name, score: 0, weight: d.weight,
      peerMedian: 55, peerP25: 45, peerP75: 65, peerMin: 20, peerMax: 90,
    }));
    return {
      findings: [], maturityRating: 'Foundational', maturityScore: 0,
      maturityDimensions: emptyDimensions,
      peerCohortStats: computePeerCohort(emptyDimensions),
      generatedAt: now, topFindings: [],
      byRiskCategory: {}, byCategory: {},
      totals: { critical: 0, high: 0, medium: 0, low: 0, totalPeopleExposed: 0, totalDollarsExposed: 0 },
    };
  }

  const { tree, jobs, flags } = data;
  const totalHC = jobs.reduce((s, j) => s + j.headcount, 0);

  // 1. Generate findings
  const findings: Finding[] = [
    ...detectSpanOutliers(jobs, tree, totalHC),
    ...detectMissingLevels(jobs, totalHC),
    ...detectDuplicateRoles(jobs, totalHC),
    ...detectFamilyImbalance(jobs, tree, totalHC),
    ...detectFromFlags(flags, totalHC),
  ];

  // Deduplicate by id
  const deduped = new Map<string, Finding>();
  for (const f of findings) {
    if (!deduped.has(f.id) || f.executiveImpactScore > deduped.get(f.id)!.executiveImpactScore) {
      deduped.set(f.id, f);
    }
  }
  const allFindings = [...deduped.values()];

  // 2. Compute maturity
  const dimensions: MaturityDimension[] = DIMENSION_DEFS.map(def => {
    const score = Math.round(scoreDimension(def.id, jobs, tree));
    return {
      id: def.id, name: def.name, score, weight: def.weight,
      // v1: seeded peer stats — will be computed from sandbox profiles in v2
      peerMedian: 55 + Math.round(Math.random() * 10),
      peerP25: 42 + Math.round(Math.random() * 8),
      peerP75: 65 + Math.round(Math.random() * 10),
      peerMin: 18 + Math.round(Math.random() * 12),
      peerMax: 85 + Math.round(Math.random() * 10),
    };
  });
  const maturityScore = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0));
  const maturityRating = computeMaturityRating(maturityScore);

  // 3. Pre-compute views
  const topFindings = [...allFindings].sort((a, b) => b.executiveImpactScore - a.executiveImpactScore).slice(0, 5);

  const byRiskCategory: Partial<Record<RiskCategory, Finding[]>> = {};
  const byCategory: Partial<Record<FindingCategory, Finding[]>> = {};
  for (const f of allFindings) {
    if (f.riskCategory) {
      if (!byRiskCategory[f.riskCategory]) byRiskCategory[f.riskCategory] = [];
      byRiskCategory[f.riskCategory]!.push(f);
    }
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category]!.push(f);
  }

  const totals = {
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length,
    totalPeopleExposed: allFindings.reduce((s, f) => s + f.peopleAffected, 0),
    totalDollarsExposed: allFindings.reduce((s, f) => s + (f.dollarsAffected || 0), 0),
  };

  return {
    findings: allFindings, maturityRating, maturityScore, maturityDimensions: dimensions,
    peerCohortStats: computePeerCohort(dimensions),
    generatedAt: now, topFindings, byRiskCategory, byCategory, totals,
  };
}
