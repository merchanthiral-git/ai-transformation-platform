/**
 * Chart color helpers for Recharts integration.
 * All chart components use these instead of hardcoded colors.
 * Colors resolve from CSS variables with SSR-safe fallbacks.
 */

const DATA_FALLBACKS = ["#5B8DEF", "#3DDC97", "#FF8A3D", "#F5C451", "#7AA3F5", "#FF5A5F", "#9BA1B0", "#FFA15F"];

const SEMANTIC_FALLBACKS: Record<string, string> = {
  success: "#3DDC97",
  warn: "#F5C451",
  risk: "#FF5A5F",
  info: "#5B8DEF",
  insight: "#5B8DEF",
};

const TRACK_FALLBACKS: Record<string, string> = {
  E: "#FF5A5F",
  M: "#FF8A3D",
  P: "#5B8DEF",
  S: "#F5C451",
  T: "#3DDC97",
};

function getCSSVar(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

/** Get a series color by index (wraps at 8). Use for categorical chart data. */
export function getSeriesColor(index: number, _opacity = 1): string {
  const i = ((index % 8) + 8) % 8;
  return getCSSVar(`--data-${i + 1}`, DATA_FALLBACKS[i]);
}

/** Get a semantic color for status-driven chart elements. */
export function getSemanticColor(kind: "success" | "warn" | "risk" | "info" | "insight"): string {
  return getCSSVar(`--sem-${kind}`, SEMANTIC_FALLBACKS[kind]);
}

/** Get a career-track color (E/M/P/S/T). */
export function getTrackColor(track: "E" | "M" | "P" | "S" | "T"): string {
  return getCSSVar(`--track-${track}`, TRACK_FALLBACKS[track]);
}

/** Recharts-ready array of the 8 data palette colors. */
export function getDataPalette(): string[] {
  return DATA_FALLBACKS.map((fb, i) => getCSSVar(`--data-${i + 1}`, fb));
}
