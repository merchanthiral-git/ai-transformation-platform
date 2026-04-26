/* ═══════════════════════════════════════════════════════════════
   Design Paths — Persistence Hook
   ═══════════════════════════════════════════════════════════════ */

import { useCallback } from "react";
import { usePersisted } from "../../components/shared/hooks";
import type { DesignPath, StepTiming, PathLifecycleState, PathHistoryEntry } from "./types";

export function useDesignPaths(projectId: string) {
  const [paths, setPaths] = usePersisted<Record<string, DesignPath>>(
    `${projectId}_designPaths`, {}
  );
  const [pathHistory, setPathHistory] = usePersisted<PathHistoryEntry[]>(
    `${projectId}_designPathHistory`, []
  );

  const savePath = useCallback((path: DesignPath) => {
    setPaths(prev => ({ ...prev, [path.sourceModuleId]: path }));
  }, [setPaths]);

  const getPath = useCallback((sourceModuleId: string): DesignPath | null => {
    return paths[sourceModuleId] ?? null;
  }, [paths]);

  const updateStepTiming = useCallback((
    sourceModuleId: string,
    stepIdx: number,
    timing: Partial<StepTiming>
  ) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      const newSteps = [...path.steps];
      newSteps[stepIdx] = {
        ...newSteps[stepIdx],
        timing: { ...newSteps[stepIdx].timing, ...timing, edited: true },
      };
      return { ...prev, [sourceModuleId]: { ...path, steps: newSteps } };
    });
  }, [setPaths]);

  const clearPath = useCallback((sourceModuleId: string) => {
    setPaths(prev => {
      const next = { ...prev };
      delete next[sourceModuleId];
      return next;
    });
  }, [setPaths]);

  // Lifecycle state management
  const setLifecycleState = useCallback((sourceModuleId: string, state: PathLifecycleState) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      return {
        ...prev,
        [sourceModuleId]: {
          ...path,
          lifecycleState: state,
          lastActiveAt: state === "active" ? new Date().toISOString() : path.lastActiveAt,
        },
      };
    });
  }, [setPaths]);

  // Per-step completion
  const markStepComplete = useCallback((sourceModuleId: string, stepIdx: number, manuallyMarked: boolean) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      const newSteps = [...path.steps];
      newSteps[stepIdx] = {
        ...newSteps[stepIdx],
        completedAt: new Date().toISOString(),
        completedManually: manuallyMarked,
      };
      return {
        ...prev,
        [sourceModuleId]: { ...path, steps: newSteps, lastActiveAt: new Date().toISOString() },
      };
    });
  }, [setPaths]);

  const unmarkStepComplete = useCallback((sourceModuleId: string, stepIdx: number) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      const newSteps = [...path.steps];
      newSteps[stepIdx] = {
        ...newSteps[stepIdx],
        completedAt: undefined,
        completedManually: undefined,
      };
      return { ...prev, [sourceModuleId]: { ...path, steps: newSteps } };
    });
  }, [setPaths]);

  // Archive path to history
  const archivePath = useCallback((sourceModuleId: string) => {
    const path = paths[sourceModuleId];
    if (!path) return;
    const entry: PathHistoryEntry = {
      pathId: path.pathId,
      archivedAt: new Date().toISOString(),
      completedSteps: path.steps.filter(s => s.completedAt).length,
      totalSteps: path.steps.length,
    };
    setPathHistory(prev => [...prev, entry]);
    setPaths(prev => {
      const next = { ...prev };
      delete next[sourceModuleId];
      return next;
    });
  }, [paths, setPaths, setPathHistory]);

  // Save or replace with conflict detection
  const saveOrReplacePath = useCallback((newPath: DesignPath): {
    conflict: boolean;
    existing?: DesignPath;
    incoming?: DesignPath;
  } => {
    const existing = paths[newPath.sourceModuleId];
    if (existing && existing.steps.some(s => s.completedAt)) {
      return { conflict: true, existing, incoming: newPath };
    }
    savePath(newPath);
    return { conflict: false };
  }, [paths, savePath]);

  // Get all active paths that include a given module in their steps
  const getActivePathsForModule = useCallback((moduleId: string): DesignPath[] => {
    return Object.values(paths).filter(
      p => p.lifecycleState === "active" && p.steps.some(s => s.moduleId === moduleId)
    );
  }, [paths]);

  // Get the current (first non-complete) step for a path
  const getCurrentStep = useCallback((sourceModuleId: string) => {
    const path = paths[sourceModuleId];
    if (!path) return null;
    return path.steps.find(s => !s.completedAt) ?? null;
  }, [paths]);

  // Sub-step completion
  const markSubStepComplete = useCallback((sourceModuleId: string, stepIdx: number, tabId: string, manuallyMarked: boolean) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      const newSteps = [...path.steps];
      const step = { ...newSteps[stepIdx] };
      const newSubSteps = step.subSteps.map(ss =>
        ss.tabId === tabId ? { ...ss, completedAt: new Date().toISOString(), completedManually: manuallyMarked } : ss
      );
      step.subSteps = newSubSteps;
      // Auto-complete parent if all sub-steps done
      if (newSubSteps.length > 0 && newSubSteps.every(ss => ss.completedAt)) {
        step.completedAt = new Date().toISOString();
        step.completedManually = false; // auto-completed via sub-steps
      }
      newSteps[stepIdx] = step;
      return { ...prev, [sourceModuleId]: { ...path, steps: newSteps, lastActiveAt: new Date().toISOString() } };
    });
  }, [setPaths]);

  const unmarkSubStepComplete = useCallback((sourceModuleId: string, stepIdx: number, tabId: string) => {
    setPaths(prev => {
      const path = prev[sourceModuleId];
      if (!path) return prev;
      const newSteps = [...path.steps];
      const step = { ...newSteps[stepIdx] };
      step.subSteps = step.subSteps.map(ss =>
        ss.tabId === tabId ? { ...ss, completedAt: undefined, completedManually: undefined } : ss
      );
      // Un-complete parent if it was auto-completed
      if (step.completedAt && !step.completedManually) {
        step.completedAt = undefined;
      }
      newSteps[stepIdx] = step;
      return { ...prev, [sourceModuleId]: { ...path, steps: newSteps } };
    });
  }, [setPaths]);

  const getCurrentSubStep = useCallback((sourceModuleId: string, stepIdx: number, tabId: string) => {
    const path = paths[sourceModuleId];
    if (!path || stepIdx < 0 || stepIdx >= path.steps.length) return null;
    return path.steps[stepIdx].subSteps.find(ss => ss.tabId === tabId) ?? null;
  }, [paths]);

  const isTabPathRequired = useCallback((sourceModuleId: string, stepIdx: number, tabId: string): boolean => {
    const path = paths[sourceModuleId];
    if (!path || stepIdx < 0) return false;
    const ctx = path.steps[stepIdx].moduleTabContext;
    if (!ctx) return false;
    return ctx.pathRequiredTabs.includes(tabId);
  }, [paths]);

  const getOptionalTabNotice = useCallback((sourceModuleId: string, stepIdx: number, tabId: string) => {
    const path = paths[sourceModuleId];
    if (!path || stepIdx < 0) return null;
    const ctx = path.steps[stepIdx].moduleTabContext;
    if (!ctx) return null;
    return ctx.optionalTabNotices[tabId] ?? null;
  }, [paths]);

  const allPaths = Object.values(paths);

  return {
    paths, allPaths, pathHistory,
    savePath, getPath, updateStepTiming, clearPath,
    setLifecycleState, markStepComplete, unmarkStepComplete,
    archivePath, saveOrReplacePath, getActivePathsForModule, getCurrentStep,
    markSubStepComplete, unmarkSubStepComplete, getCurrentSubStep,
    isTabPathRequired, getOptionalTabNotice,
  };
}
