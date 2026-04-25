/**
 * JA Findings — Narrative Template Engine
 *
 * Pure string interpolation. No LLM. Templates are hand-written,
 * variables slot from FindingsDigest, severity thresholds drive selection.
 */
import type { FindingsDigest, Finding, NarrativeTemplate, NarrativeOutput } from "./types";

// ── Template registry ──

const TEMPLATES: NarrativeTemplate[] = [
  // ── Diagnosis templates (by maturity × severity) ──
  {
    id: 'diagnosis-foundational-urgent',
    section: 'diagnosis',
    matchPriority: 10,
    match: (d) => d.maturityRating === 'Foundational' && d.totals.critical > 0,
    render: (d) =>
      `The current job architecture scores ${d.maturityScore} out of 100, placing it in the Foundational tier — below the peer median of ${d.peerCohortStats.overallMedian}. ` +
      `${d.totals.critical} critical finding${d.totals.critical > 1 ? 's' : ''} require${d.totals.critical === 1 ? 's' : ''} immediate attention, affecting ${d.totals.totalPeopleExposed.toLocaleString()} roles. ` +
      `The most urgent issue is ${d.topFindings[0]?.ruleName.toLowerCase() || 'structural inconsistency'}. ` +
      `Remediation should begin before any redesign work to avoid building on a flawed foundation.`,
  },
  {
    id: 'diagnosis-foundational-stable',
    section: 'diagnosis',
    matchPriority: 20,
    match: (d) => d.maturityRating === 'Foundational',
    render: (d) =>
      `The architecture scores ${d.maturityScore} out of 100 (Foundational tier). ` +
      `While no critical issues were detected, ${d.totals.high + d.totals.medium} findings across ${Object.keys(d.byCategory).length} categories indicate significant structural gaps. ` +
      `The peer median sits at ${d.peerCohortStats.overallMedian} — closing this gap will require focused remediation across leveling, titling, and career paths.`,
  },
  {
    id: 'diagnosis-developing',
    section: 'diagnosis',
    matchPriority: 30,
    match: (d) => d.maturityRating === 'Developing',
    render: (d) =>
      `The architecture scores ${d.maturityScore} out of 100 (Developing tier), near the peer median of ${d.peerCohortStats.overallMedian}. ` +
      `${d.findings.length} findings were identified — ${d.totals.high} high-priority. ` +
      `The strongest dimension is ${d.maturityDimensions.reduce((best, dim) => dim.score > best.score ? dim : best, d.maturityDimensions[0]).name.toLowerCase()}; ` +
      `the weakest is ${d.maturityDimensions.reduce((worst, dim) => dim.score < worst.score ? dim : worst, d.maturityDimensions[0]).name.toLowerCase()}.`,
  },
  {
    id: 'diagnosis-mature',
    section: 'diagnosis',
    matchPriority: 40,
    match: (d) => d.maturityRating === 'Mature',
    render: (d) =>
      `The architecture scores ${d.maturityScore} out of 100 (Mature tier), above the peer median of ${d.peerCohortStats.overallMedian}. ` +
      `${d.findings.length} findings remain — mostly medium or low severity. ` +
      `Focus remediation on the ${d.topFindings.length > 0 ? d.topFindings[0].category.replace(/-/g, ' ') : 'remaining gaps'} to move toward Leading tier.`,
  },
  {
    id: 'diagnosis-leading',
    section: 'diagnosis',
    matchPriority: 50,
    match: (d) => d.maturityRating === 'Leading',
    render: (d) =>
      `The architecture scores ${d.maturityScore} out of 100 (Leading tier), well above the peer median of ${d.peerCohortStats.overallMedian}. ` +
      `${d.findings.length > 0 ? `${d.findings.length} minor findings were identified for continuous improvement.` : 'No material findings were identified.'} ` +
      `This architecture is well-positioned to support transformation work.`,
  },
  // Fallback
  {
    id: 'diagnosis-fallback',
    section: 'diagnosis',
    matchPriority: 999,
    match: () => true,
    render: (d) => `The architecture scored ${d.maturityScore} out of 100 with ${d.findings.length} findings identified.`,
  },

  // ── Top finding templates (by category) ──
  {
    id: 'topfinding-span-outlier',
    section: 'topFinding',
    matchPriority: 10,
    match: (_, f) => f?.category === 'span-outlier',
    render: (_, f) => f ? `Span of control issue on ${f.entityLabel}: ${f.measurement} reports vs threshold of ${f.threshold}.` : '',
  },
  {
    id: 'topfinding-missing-level',
    section: 'topFinding',
    matchPriority: 20,
    match: (_, f) => f?.category === 'missing-level',
    render: (_, f) => f ? `${f.measurement} roles lack a valid level code, blocking grading and benchmarking.` : '',
  },
  {
    id: 'topfinding-duplicate-role',
    section: 'topFinding',
    matchPriority: 30,
    match: (_, f) => f?.category === 'duplicate-role',
    render: (_, f) => f ? `"${f.entityLabel}" appears in ${f.measurement} families — creates inconsistent comp benchmarking.` : '',
  },
  {
    id: 'topfinding-fallback',
    section: 'topFinding',
    matchPriority: 999,
    match: () => true,
    render: (_, f) => f ? `${f.ruleName}: ${f.entityLabel} (${f.severity}).` : 'Finding details unavailable.',
  },

  // ── Peer lens ──
  {
    id: 'peer-above-median',
    section: 'peerLens',
    matchPriority: 10,
    match: (d) => d.maturityScore >= d.peerCohortStats.overallMedian,
    render: (d) =>
      `At ${d.maturityScore} points, this architecture sits above the peer median of ${d.peerCohortStats.overallMedian} across ${d.peerCohortStats.cohortSize} companies. ` +
      `Strongest relative position: ${d.maturityDimensions.reduce((best, dim) => (dim.score - dim.peerMedian) > (best.score - best.peerMedian) ? dim : best, d.maturityDimensions[0]).name.toLowerCase()}.`,
  },
  {
    id: 'peer-below-median',
    section: 'peerLens',
    matchPriority: 20,
    match: () => true,
    render: (d) =>
      `At ${d.maturityScore} points, this architecture sits below the peer median of ${d.peerCohortStats.overallMedian}. ` +
      `Largest gap: ${d.maturityDimensions.reduce((worst, dim) => (dim.score - dim.peerMedian) < (worst.score - worst.peerMedian) ? dim : worst, d.maturityDimensions[0]).name.toLowerCase()} ` +
      `(${d.maturityDimensions.reduce((worst, dim) => (dim.score - dim.peerMedian) < (worst.score - worst.peerMedian) ? dim : worst, d.maturityDimensions[0]).score} vs peer median ${d.maturityDimensions.reduce((worst, dim) => (dim.score - dim.peerMedian) < (worst.score - worst.peerMedian) ? dim : worst, d.maturityDimensions[0]).peerMedian}).`,
  },

  // ── Risk lens ──
  {
    id: 'risk-span-dominant',
    section: 'riskLens',
    matchPriority: 10,
    match: (d) => (d.byRiskCategory['span']?.length || 0) >= (d.byRiskCategory['pay-equity']?.length || 0),
    render: (d) => {
      const spanFindings = d.byRiskCategory['span'] || [];
      const totalPeople = spanFindings.reduce((s, f) => s + f.peopleAffected, 0);
      return `Span-of-control risk dominates: ${spanFindings.length} findings affecting ${totalPeople} roles. ` +
        `${d.byRiskCategory['pay-equity']?.length || 0} pay equity risks and ${d.byRiskCategory['retention']?.length || 0} retention risks were also identified.`;
    },
  },
  {
    id: 'risk-fallback',
    section: 'riskLens',
    matchPriority: 999,
    match: () => true,
    render: (d) => `${d.findings.filter(f => f.riskCategory).length} findings mapped to executive risk categories across the architecture.`,
  },

  // ── Roadmap lens ──
  {
    id: 'roadmap-quickwins',
    section: 'roadmapLens',
    matchPriority: 10,
    match: (d) => d.topFindings.filter(f => f.remediation.estimatedEffort === 'low').length >= 2,
    render: (d) => {
      const quickWins = d.topFindings.filter(f => f.remediation.estimatedEffort === 'low');
      return `${quickWins.length} high-impact findings can be resolved with low effort — start here. ` +
        `${d.topFindings.filter(f => f.remediation.estimatedEffort === 'high').length} findings require significant restructuring.`;
    },
  },
  {
    id: 'roadmap-heavy',
    section: 'roadmapLens',
    matchPriority: 20,
    match: () => true,
    render: (d) => {
      const efforts = { low: 0, medium: 0, high: 0 };
      for (const f of d.topFindings) efforts[f.remediation.estimatedEffort]++;
      return `Remediation breakdown: ${efforts.low} quick wins, ${efforts.medium} moderate efforts, ${efforts.high} heavy lifts. ` +
        `${d.topFindings.filter(f => f.remediation.changeRequires.includes('consultation')).length} items require stakeholder consultation.`;
    },
  },
];

// ── Validation: unique priorities per section ──

(function validateTemplates() {
  const seen = new Map<string, Set<number>>();
  for (const t of TEMPLATES) {
    if (!seen.has(t.section)) seen.set(t.section, new Set());
    const priorities = seen.get(t.section)!;
    if (priorities.has(t.matchPriority)) {
      throw new Error(
        `Duplicate matchPriority ${t.matchPriority} in section "${t.section}": template "${t.id}". Each section must have unique priorities.`
      );
    }
    priorities.add(t.matchPriority);
  }
})();

// ── Selection ──

function selectTemplate(
  section: string,
  digest: FindingsDigest,
  finding?: Finding,
): NarrativeTemplate {
  const candidates = TEMPLATES
    .filter(t => t.section === section)
    .sort((a, b) => a.matchPriority - b.matchPriority);
  return candidates.find(t => t.match(digest, finding)) || candidates[candidates.length - 1];
}

// ── Public API ──

export function generateNarrative(digest: FindingsDigest): NarrativeOutput {
  const diagnosisTemplate = selectTemplate('diagnosis', digest);
  const diagnosisSummary = diagnosisTemplate.render(digest);

  const headlineSentence = digest.maturityRating === 'Leading'
    ? `Architecture is well-positioned at ${digest.maturityScore}/100.`
    : digest.totals.critical > 0
    ? `${digest.totals.critical} critical finding${digest.totals.critical > 1 ? 's' : ''} require immediate attention.`
    : `${digest.findings.length} findings identified — maturity at ${digest.maturityScore}/100.`;

  const topFindingCards = digest.topFindings.map(f => {
    const template = selectTemplate('topFinding', digest, f);
    return {
      headline: f.ruleName,
      soWhat: template.render(digest, f),
      exposureLabel: `${f.peopleAffected} roles${f.dollarsAffected ? ` · $${(f.dollarsAffected / 1000).toFixed(0)}K` : ''}`,
    };
  });

  const peerTemplate = selectTemplate('peerLens', digest);
  const riskTemplate = selectTemplate('riskLens', digest);
  const roadmapTemplate = selectTemplate('roadmapLens', digest);

  return {
    diagnosisSummary,
    headlineSentence,
    topFindingCards,
    lensNarratives: {
      peerComparison: peerTemplate.render(digest),
      structuralRisks: riskTemplate.render(digest),
      prioritizedRoadmap: roadmapTemplate.render(digest),
    },
  };
}
