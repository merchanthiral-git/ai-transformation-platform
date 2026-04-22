/**
 * Chart color helpers for Recharts integration.
 * All chart components use these instead of hardcoded colors.
 * Colors resolve from CSS variables with SSR-safe fallbacks.
 */

const DATA_FALLBACKS = ["#8B9DC3", "#C8A6DC", "#A8C8A4", "#E8B88F", "#7FB3C7", "#D4A574", "#B8A0C0", "#9FB8A0"];

const SEMANTIC_FALLBACKS: Record<string, string> = {
  success: "#8ba87a",
  warn: "#f4a83a",
  risk: "#e87a5d",
  info: "#f4a83a",
  insight: "#a78bb8",
};

const TRACK_FALLBACKS: Record<string, string> = {
  E: "#e87a5d",
  M: "#f4a83a",
  P: "#2563EB",
  S: "#f4a83a",
  T: "#a78bb8",
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
