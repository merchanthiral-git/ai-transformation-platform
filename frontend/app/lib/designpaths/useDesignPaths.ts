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

  const allPaths = Object.values(paths);

  return {
    paths, allPaths, pathHistory,
    savePath, getPath, updateStepTiming, clearPath,
    setLifecycleState, markStepComplete, unmarkStepComplete,
    archivePath, saveOrReplacePath, getActivePathsForModule, getCurrentStep,
  };
}
