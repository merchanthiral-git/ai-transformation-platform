/**
 * aiImpact.ts
 *
 * Scores individual tasks and aggregated roles against their exposure to AI
 * automation, augmentation, and displacement risk.
 *
 * Scores are normalised to 0–100 where:
 *   0  = negligible AI impact (highly relational / judgement-heavy tasks)
 *   50 = moderate impact (mixed routine + discretionary work)
 *   100 = near-full automation potential (purely structured/repetitive tasks)
 *
 * All exports are pure functions with no side effects.
 */

/**
 * Score a single task record for its AI impact potential.
 *
 * The stub returns 50 (neutral/uncertain) for all inputs. A real
 * implementation would weigh task attributes such as repeatability,
 * data-dependence, cognitive complexity, and human-interaction intensity.
 *
 * @param task - Any task descriptor object (shape TBD by domain model).
 * @returns A number in [0, 100].
 */
export function computeAiImpactScore(task: any): number {
  // TODO: replace with model-driven scoring once task schema is finalised.
  // Potential signals: task.repeatability, task.dataStructured,
  // task.humanInteractionFreq, task.cognitiveComplexity, task.regulatoryRisk.
  void task;
  return 50;
}

/**
 * Aggregate AI impact across all tasks belonging to a role.
 *
 * Returns the arithmetic mean of individual task scores. An empty task list
 * returns 0 rather than NaN.
 *
 * @param tasks - Array of task descriptor objects.
 * @returns A number in [0, 100], or 0 when `tasks` is empty.
 */
export function computeRoleAiImpact(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const total = tasks.reduce((sum, t) => sum + computeAiImpactScore(t), 0);
  return Math.round((total / tasks.length) * 10) / 10;
}
