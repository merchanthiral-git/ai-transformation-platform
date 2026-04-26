/* ═══════════════════════════════════════════════════════════════
   Prescriptive Diagnose Framework — Progress Computation

   Pure function — computes how far a user has progressed through
   a prescribed roadmap based on existing moduleStatus.
   ═══════════════════════════════════════════════════════════════ */

import type { PrescribedRoadmap, RoadmapStep } from "./types";

export type StepStatus = "complete" | "in_progress" | "not_started";

export interface RoadmapProgress {
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  nextStep: RoadmapStep | null;
  stepStatuses: Array<{ step: RoadmapStep; status: StepStatus }>;
}

export function computeRoadmapProgress(
  roadmap: PrescribedRoadmap,
  moduleStatus: Record<string, string>
): RoadmapProgress {
  const stepStatuses = roadmap.steps.map(step => {
    const ms = moduleStatus[step.moduleId] || "not_started";
    let status: StepStatus;
    if (ms === "complete") status = "complete";
    else if (ms !== "not_started") status = "in_progress";
    else status = "not_started";
    return { step, status };
  });

  const completedSteps = stepStatuses.filter(s => s.status === "complete").length;
  const totalSteps = stepStatuses.length;
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const nextStep = stepStatuses.find(s => s.status !== "complete")?.step ?? null;

  return { completedSteps, totalSteps, percentComplete, nextStep, stepStatuses };
}
