/**
 * orgMetrics.ts
 *
 * Computes high-level organisational structure metrics from a raw workforce
 * roster. Covers headcount composition (managers vs ICs), reporting span
 * statistics, and organisational depth (layers).
 *
 * All exports are pure functions — no side effects, no React hooks.
 * Safe to call in server components, API route handlers, or worker threads.
 */

export interface OrgMetrics {
  /** Total number of workforce records in the input. */
  totalHeadcount: number;
  /** Count of employees who appear as a managerId for at least one other employee. */
  managers: number;
  /** Individual contributors — headcount minus managers. */
  ics: number;
  /** Average number of direct reports per manager. */
  avgSpan: number;
  /** Widest span of control found in the org. */
  maxSpan: number;
  /** Number of distinct reporting levels from CEO to deepest leaf. */
  layers: number;
  /** Human-readable provenance string for display in UI tooltips. */
  source: string;
}

/**
 * Derive org-structure metrics from a flat workforce array.
 *
 * Each element is expected to optionally carry a `managerId` field that
 * references another element's `id`. The function degrades gracefully when
 * those fields are absent.
 *
 * @param workforce - Array of employee/workforce records (any shape).
 * @returns An `OrgMetrics` object. All numeric fields default to 0 on empty input.
 */
export function computeOrgMetrics(workforce: any[]): OrgMetrics {
  const totalHeadcount = workforce.length;

  if (totalHeadcount === 0) {
    return {
      totalHeadcount: 0,
      managers: 0,
      ics: 0,
      avgSpan: 0,
      maxSpan: 0,
      layers: 0,
      source: "Computed from workforce roster",
    };
  }

  // Build a map of managerId → direct-report count
  const directReportCounts = new Map<string, number>();
  const idSet = new Set<string>();

  for (const person of workforce) {
    if (person?.id != null) idSet.add(String(person.id));
  }

  for (const person of workforce) {
    if (person?.managerId != null && idSet.has(String(person.managerId))) {
      const key = String(person.managerId);
      directReportCounts.set(key, (directReportCounts.get(key) ?? 0) + 1);
    }
  }

  const managerIds = new Set(directReportCounts.keys());
  const managers = managerIds.size;
  const ics = totalHeadcount - managers;

  const spans = Array.from(directReportCounts.values());
  const maxSpan = spans.length ? Math.max(...spans) : 0;
  const avgSpan =
    spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : 0;

  // BFS to calculate depth (layers)
  const childrenMap = new Map<string | null, string[]>();
  for (const person of workforce) {
    const pid = person?.id != null ? String(person.id) : null;
    const mid =
      person?.managerId != null && idSet.has(String(person.managerId))
        ? String(person.managerId)
        : null;
    if (pid == null) continue;
    const key = mid;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(pid);
  }

  // Root nodes: those whose managerId is missing, null, or not in the id set
  const roots = childrenMap.get(null) ?? [];
  let layers = 0;
  if (roots.length > 0) {
    let frontier = roots;
    while (frontier.length > 0) {
      layers++;
      const next: string[] = [];
      for (const id of frontier) {
        const children = childrenMap.get(id) ?? [];
        next.push(...children);
      }
      frontier = next;
    }
  }

  return {
    totalHeadcount,
    managers,
    ics,
    avgSpan,
    maxSpan,
    layers,
    source: "Computed from workforce roster",
  };
}
