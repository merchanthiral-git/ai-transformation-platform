/**
 * Scaling utilities — detect screen size, DPI, and apply CSS data attributes.
 *
 * The inline script in layout.tsx handles initial load + resize.
 * This module provides JS-side helpers for components that need
 * programmatic access to screen characteristics.
 */

export function getDeviceScaleFactor(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

export function getEffectiveViewportWidth(): number {
  if (typeof window === "undefined") return 1440;
  return window.innerWidth;
}

export type ScreenSize = "small" | "medium" | "large" | "xlarge";

export function getScreenSize(): ScreenSize {
  const w = getEffectiveViewportWidth();
  if (w < 1280) return "small";
  if (w < 1600) return "medium";
  if (w < 1920) return "large";
  return "xlarge";
}

export function isRetina(): boolean {
  return getDeviceScaleFactor() >= 2;
}

/**
 * Get a fluid chart height based on viewport.
 * Scales between minH and maxH based on window.innerHeight.
 */
export function fluidChartHeight(minH = 200, maxH = 400, pct = 0.3): number {
  if (typeof window === "undefined") return 300;
  return Math.max(minH, Math.min(maxH, Math.round(window.innerHeight * pct)));
}
