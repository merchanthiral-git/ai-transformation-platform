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
    const s = path.steps[i];
    // Step is complete if it has a completedAt timestamp OR if moduleStatus says complete
    const isComplete = !!s.completedAt || moduleStatus[s.moduleId] === "complete";
    if (isComplete) {
      completedSteps++;
    } else if (nextStep === null) {
      nextStep = s;
      nextStepIdx = i;
    }
  }

  const totalSteps = path.steps.length;
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const totalWeeks = path.steps.reduce(
    (acc, s) => ({
      min: acc.min + s.timing.minWeeks,
      max: acc.max + s.timing.maxWeeks,
    }),
    { min: 0, max: 0 }
  );

  return { completedSteps, totalSteps, percentComplete, nextStep, nextStepIdx, totalWeeks };
}
