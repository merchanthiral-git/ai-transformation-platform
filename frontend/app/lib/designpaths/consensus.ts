/* ═══════════════════════════════════════════════════════════════
   Design Paths — Cross-Path Consensus
   ═══════════════════════════════════════════════════════════════ */

import { MODULES } from "../../components/shared/constants";
import type { DesignPath } from "./types";

export type ConsensusItem = {
  moduleId: string;
  moduleTitle: string;
  sourceModuleIds: string[];
  sourceModuleTitles: string[];
};

export function computeConsensus(allPaths: DesignPath[]): ConsensusItem[] {
  const moduleMap = new Map<string, Set<string>>();

  for (const path of allPaths) {
    for (const step of path.steps) {
      if (!moduleMap.has(step.moduleId)) moduleMap.set(step.moduleId, new Set());
      moduleMap.get(step.moduleId)!.add(path.sourceModuleId);
    }
  }

  const items: ConsensusItem[] = [];
  for (const [moduleId, sourceIds] of moduleMap) {
    if (sourceIds.size >= 2) {
      const mod = MODULES.find(m => m.id === moduleId);
      const sourceModuleIds = Array.from(sourceIds);
      const sourceModuleTitles = sourceModuleIds.map(id => {
        const p = allPaths.find(pp => pp.sourceModuleId === id);
        return p?.sourceModuleTitle || id;
      });
      items.push({
        moduleId,
        moduleTitle: mod?.title || moduleId,
        sourceModuleIds,
        sourceModuleTitles,
      });
    }
  }

  return items.sort((a, b) => b.sourceModuleIds.length - a.sourceModuleIds.length);
}
