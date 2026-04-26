/* ═══════════════════════════════════════════════════════════════
   Prescriptive Diagnose Framework — Roadmap Persistence Hook

   Manages all prescribed roadmaps for the current project.
   Keyed by sourceModuleId so each Diagnose module produces one.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback } from "react";
import { usePersisted } from "../../components/shared/hooks";
import type { PrescribedRoadmap } from "./types";

export function usePrescribedRoadmaps(projectId: string) {
  const [roadmaps, setRoadmaps] = usePersisted<Record<string, PrescribedRoadmap>>(
    `${projectId}_prescribedRoadmaps`, {}
  );

  const saveRoadmap = useCallback((roadmap: PrescribedRoadmap) => {
    setRoadmaps(prev => ({ ...prev, [roadmap.sourceModuleId]: roadmap }));
  }, [setRoadmaps]);

  const getRoadmap = useCallback((sourceModuleId: string): PrescribedRoadmap | null => {
    return roadmaps[sourceModuleId] ?? null;
  }, [roadmaps]);

  const clearRoadmap = useCallback((sourceModuleId: string) => {
    setRoadmaps(prev => {
      const next = { ...prev };
      delete next[sourceModuleId];
      return next;
    });
  }, [setRoadmaps]);

  const allRoadmaps = Object.values(roadmaps);

  return { roadmaps, allRoadmaps, saveRoadmap, getRoadmap, clearRoadmap };
}
