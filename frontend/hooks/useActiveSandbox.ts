import { useMemo } from "react";
import { getProfile, type SandboxProfile } from "@/data/org-design/sandbox-profiles";

/**
 * Maps tutorial model IDs (tutorial_{size}_{industry}) to sandbox-profile keys.
 * The model ID comes from the workspace controller; the profile key matches
 * the sandbox-profiles.ts export.
 */
const MODEL_TO_PROFILE_KEY: Record<string, string> = {
  // Technology
  tutorial_small_technology: "palantir",
  tutorial_mid_technology: "servicenow",
  tutorial_large_technology: "adobe",
  // Financial Services
  tutorial_small_financial_services: "evercore",
  tutorial_mid_financial_services: "raymondjames",
  tutorial_large_financial_services: "goldman",
  // Healthcare
  tutorial_small_healthcare: "hims",
  tutorial_mid_healthcare: "molina",
  tutorial_large_healthcare: "elevance",
  // Retail
  tutorial_small_retail: "fivebelow",
  tutorial_mid_retail: "williamssonoma",
  tutorial_large_retail: "target",
  // Manufacturing
  tutorial_small_manufacturing: "axon",
  tutorial_mid_manufacturing: "parkerhannifin",
  tutorial_large_manufacturing: "honeywell",
  // Consulting
  tutorial_small_consulting: "huron",
  tutorial_mid_consulting: "boozallen",
  tutorial_large_consulting: "accenture",
  // Energy
  tutorial_small_energy: "shoals",
  tutorial_mid_energy: "chesapeake",
  tutorial_large_energy: "bakerhughes",
  // Aerospace
  tutorial_small_aerospace: "kratos",
  tutorial_mid_aerospace: "l3harris",
  tutorial_large_aerospace: "northrop",
};

function normalizeModelId(model: string): string {
  // Backend model IDs use Title_Case: "Tutorial_Small_Technology"
  // Normalize to lowercase: "tutorial_small_technology"
  return model.toLowerCase().replace(/\s+/g, "_");
}

export function useActiveSandbox(model: string): {
  key: string | null;
  profile: SandboxProfile | null;
} {
  return useMemo(() => {
    if (!model) return { key: null, profile: null };

    const normalized = normalizeModelId(model);
    const profileKey = MODEL_TO_PROFILE_KEY[normalized];

    if (!profileKey) {
      // Try direct lookup (in case model IS the profile key)
      const directProfile = getProfile(model);
      if (directProfile) return { key: model, profile: directProfile };
      return { key: null, profile: null };
    }

    const profile = getProfile(profileKey);
    return { key: profileKey, profile };
  }, [model]);
}
