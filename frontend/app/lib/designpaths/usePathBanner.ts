/* ═══════════════════════════════════════════════════════════════
   Design Paths — Banner Wiring Hook

   Used by each destination module to get banner data + handlers.
   Call this hook, render <PathStepBanner> and <SoftCompletionWarning>.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { useDesignPaths } from "./useDesignPaths";

export function usePathBanner(model: string, moduleId: string) {
  const { getActivePathsForModule, markStepComplete, setLifecycleState } = useDesignPaths(model);

  const activePathsHere = getActivePathsForModule(moduleId);

  const bannerPaths = activePathsHere.map(path => {
    const current = path.steps.find(s => !s.completedAt);
    if (!current || current.moduleId !== moduleId) return null;
    const stepIdx = path.steps.indexOf(current);
    return {
      pathId: path.pathId,
      sourceModuleId: path.sourceModuleId,
      sourceModuleTitle: path.sourceModuleTitle,
      stepIdx,
      stepTitle: current.title,
      criterion: current.completionCriterion.description,
      howToInModule: current.completionCriterion.howToInModule,
      stepCount: path.steps.length,
      hasSubSteps: (current.subSteps || []).length > 0,
      stepComplete: !!current.completedAt,
    };
  }).filter(Boolean) as Array<{
    pathId: string; sourceModuleId: string; sourceModuleTitle: string;
    stepIdx: number; stepTitle: string; criterion: string;
    howToInModule?: string[]; stepCount: number;
    hasSubSteps?: boolean; stepComplete?: boolean;
  }>;

  const [completionWarning, setCompletionWarning] = useState<{
    sourceModuleId: string; stepIdx: number; criterion: string;
  } | null>(null);

  const handleMarkComplete = useCallback((srcId: string, stepIdx: number) => {
    const path = activePathsHere.find(p => p.sourceModuleId === srcId);
    const step = path?.steps[stepIdx];
    if (!step) return;
    setCompletionWarning({ sourceModuleId: srcId, stepIdx, criterion: step.completionCriterion.description });
  }, [activePathsHere]);

  const confirmComplete = useCallback(() => {
    if (!completionWarning) return;
    markStepComplete(completionWarning.sourceModuleId, completionWarning.stepIdx, true);
    setCompletionWarning(null);
  }, [completionWarning, markStepComplete]);

  const cancelComplete = useCallback(() => setCompletionWarning(null), []);

  const handlePause = useCallback((srcId: string) => {
    setLifecycleState(srcId, "paused");
  }, [setLifecycleState]);

  return {
    bannerPaths,
    completionWarning,
    handleMarkComplete,
    confirmComplete,
    cancelComplete,
    handlePause,
  };
}
