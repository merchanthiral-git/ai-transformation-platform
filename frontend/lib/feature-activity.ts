import { useEffect, useRef } from "react";

export interface FeatureActivityRecord {
  featureId: string;
  context?: string;
  timestamp: number;
}

const STORAGE_PREFIX = "studio_feature_activity_";

function getEngagementKey(engagementId: string): string {
  return `${STORAGE_PREFIX}${engagementId}`;
}

function readActivity(engagementId: string): FeatureActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getEngagementKey(engagementId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeActivity(engagementId: string, records: FeatureActivityRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getEngagementKey(engagementId), JSON.stringify(records));
  } catch {
    // localStorage full or unavailable — silently no-op
  }
}

export function recordFeatureActivity(
  engagementId: string,
  featureId: string,
  context?: string,
): void {
  const records = readActivity(engagementId);
  const existing = records.find((r) => r.featureId === featureId);
  if (existing) {
    existing.timestamp = Date.now();
    if (context) existing.context = context;
  } else {
    records.push({ featureId, context, timestamp: Date.now() });
  }
  writeActivity(engagementId, records);
}

export function getFeatureActivity(engagementId: string): FeatureActivityRecord[] {
  return readActivity(engagementId);
}

export function getActiveFeatureIds(engagementId: string): Set<string> {
  return new Set(readActivity(engagementId).map((r) => r.featureId));
}

export function getActiveFeatureCount(engagementId: string): number {
  return readActivity(engagementId).length;
}

/**
 * Hook: records feature activity when a component mounts.
 * Call once per feature component in the course of an engagement session.
 */
export function useFeatureActivity(
  engagementId: string,
  featureId: string,
  context?: string,
): void {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordFeatureActivity(engagementId, featureId, context);
  }, [engagementId, featureId, context]);
}

/**
 * Pre-populate activity for the Takara Tomy seed engagement.
 * Called once on first load to set up the demo state.
 */
export function seedTakaraTomyActivity(): void {
  const engagementId = "takara-tomy-intl";
  const existing = readActivity(engagementId);
  if (existing.length > 0) return; // Already seeded

  const seedFeatures: FeatureActivityRecord[] = [
    { featureId: "strategicContextCard", context: "Active \u00b7 Strategy tab", timestamp: Date.now() - 86400000 * 5 },
    { featureId: "ceoMandateBlock", context: "Active \u00b7 Strategy tab", timestamp: Date.now() - 86400000 * 5 },
    { featureId: "archetypeLibrary", context: "Active \u00b7 Regional Holding selected", timestamp: Date.now() - 86400000 * 3 },
    { featureId: "nMinusDrilldown", context: "Active \u00b7 currently at N\u22122", timestamp: Date.now() - 86400000 * 2 },
    { featureId: "currentFutureDiff", context: "Active \u00b7 future state primary", timestamp: Date.now() - 86400000 * 2 },
    { featureId: "jobArchitectureBrowser", context: "Active \u00b7 Work & Talent tab", timestamp: Date.now() - 86400000 * 1 },
    { featureId: "levelingFramework", context: "Active \u00b7 mid-cap applied", timestamp: Date.now() },
  ];

  writeActivity(engagementId, seedFeatures);
}
