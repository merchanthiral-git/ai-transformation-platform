/* ═══════════════════════════════════════════════════════════════
   Design Paths — Persistence Hook
   ═══════════════════════════════════════════════════════════════ */

import { useCallback } from "react";
import { usePersisted } from "../../components/shared/hooks";
import type { DesignPath, StepTiming } from "./types";

export function useDesignPaths(projectId: string) {
  const [paths, setPaths] = usePersisted<Record<string, DesignPath>>(
    `${projectId}_designPaths`, {}
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

  const allPaths = Object.values(paths);

  return { paths, allPaths, savePath, getPath, updateStepTiming, clearPath };
}
