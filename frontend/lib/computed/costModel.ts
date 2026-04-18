/**
 * costModel.ts
 *
 * Derives total compensation cost for a role from base salary plus loaded
 * cost components (benefits, payroll taxes, overhead allocations).
 *
 * The loaded-cost model uses a single multiplier applied to base salary:
 *   loadedCost = baseSalary × loadedCostRate   (default 1.3 → 30% on top)
 *   benefits   = loadedCost - baseSalary
 *   overhead   = separate allocation (stubbed to 0, real logic TBD)
 *
 * All exports are pure functions with no side effects.
 */

/** Full cost breakdown returned for a single role. */
export interface CostResult {
  /** Annual base salary in USD. */
  baseSalary: number;
  /** Total loaded cost (salary + benefits + employer taxes). */
  loadedCost: number;
  /** Benefits and employer payroll taxes portion of loaded cost. */
  benefits: number;
  /** Facility, tooling, and management overhead allocation (separate from loaded cost). */
  overhead: number;
}

/**
 * Compute the fully-loaded cost of a role.
 *
 * The stub reads `role.salary` if present and applies the `loadedCostRate`
 * multiplier; all other fields default to 0 pending further domain modelling.
 *
 * @param role           - Role or employee record. Expected optional field: `salary` (number).
 * @param loadedCostRate - Multiplier applied to base salary to derive total loaded cost.
 *                         Defaults to 1.3 (i.e., 30% benefits/taxes on top of salary).
 * @returns A `CostResult`; baseSalary and loadedCost are non-zero when `role.salary` exists.
 */
export function computeRoleCost(
  role: any,
  loadedCostRate: number = 1.3
): CostResult {
  const baseSalary = typeof role?.salary === "number" ? role.salary : 0;
  const loadedCost = Math.round(baseSalary * loadedCostRate);
  const benefits = loadedCost - baseSalary;

  // TODO: derive overhead from facility cost per seat, tooling licenses, mgmt ratio.
  const overhead = 0;

  return {
    baseSalary,
    loadedCost,
    benefits,
    overhead,
  };
}
