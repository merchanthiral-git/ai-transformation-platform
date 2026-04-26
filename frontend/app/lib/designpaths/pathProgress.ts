/* ═══════════════════════════════════════════════════════════════
   Design Paths — Progress Computation
   ═══════════════════════════════════════════════════════════════ */

import type { DesignPath, DesignPathStep } from "./types";

export interface PathProgress {
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  nextStep: DesignPathStep | null;
  nextStepIdx: number;
  totalWeeks: { min: number; max: number };
}

export function computePathProgress(
  path: DesignPath,
  moduleStatus: Record<string, string>
): PathProgress {
  let completedSteps = 0;
  let nextStep: DesignPathStep | null = null;
  let nextStepIdx = -1;

  for (let i = 0; i < path.steps.length; i++) {
    const step = path.steps[i];
    const ms = moduleStatus[step.moduleId] || "not_started";
    if (ms === "complete") {
      completedSteps++;
    } else if (nextStep === null) {
      nextStep = step;
      nextStepIdx = i;
    }
  }

  const totalSteps = path.steps.length;
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const totalWeeks = path.steps.reduce(
    (acc, step) => ({
      min: acc.min + step.timing.minWeeks,
      max: acc.max + step.timing.maxWeeks,
    }),
    { min: 0, max: 0 }
  );

  return { completedSteps, totalSteps, percentComplete, nextStep, nextStepIdx, totalWeeks };
}
