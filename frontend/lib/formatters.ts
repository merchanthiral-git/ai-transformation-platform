/**
 * Shared number formatting utilities for the AI Transformation Platform.
 *
 * Usage:
 *   fmt(8016)         → "8,016"
 *   fmt(4.6)          → "4.6"
 *   fmt(8000.0)       → "8,000"
 *   fmt(1422, "delta") → "+1,422" or "−1,422"
 *   fmt(45.2, "pct")  → "45.2%"
 *   fmt(1400000, "$")  → "$1.4M"
 */

export type FmtType = "auto" | "int" | "pct" | "delta" | "$";

/**
 * Format a number for display.
 *
 * - "auto" (default): whole numbers get commas, no trailing .0;
 *   fractional numbers keep up to 1 decimal.
 * - "int": always whole, with commas (1422 → "1,422")
 * - "pct": one decimal + % suffix (45.23 → "45.2%")
 * - "delta": signed, no trailing .0 (16.0 → "+16", −7 → "−7")
 * - "$": abbreviated currency ($1.4M, $500K, $85)
 */
export function fmt(value: number | string | null | undefined, type: FmtType = "auto"): string {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "—";

  switch (type) {
    case "pct":
      return `${stripTrailingZero(n.toFixed(1))}%`;

    case "int":
      return Math.round(n).toLocaleString();

    case "delta": {
      const abs = Math.abs(n);
      const formatted = Number.isInteger(abs) || Math.abs(abs - Math.round(abs)) < 0.05
        ? Math.round(abs).toLocaleString()
        : stripTrailingZero(abs.toFixed(1));
      if (n > 0) return `+${formatted}`;
      if (n < 0) return `−${formatted}`;
      return "0";
    }

    case "$": {
      const abs = Math.abs(n);
      const sign = n < 0 ? "-" : "";
      if (abs < 1000) return `${sign}$${Math.round(abs).toLocaleString()}`;
      if (abs < 1e6) return `${sign}$${stripTrailingZero((abs / 1000).toFixed(abs < 10000 ? 1 : 0))}K`;
      if (abs < 1e9) return `${sign}$${stripTrailingZero((abs / 1e6).toFixed(abs < 100e6 ? 1 : 0))}M`;
      return `${sign}$${stripTrailingZero((abs / 1e9).toFixed(1))}B`;
    }

    case "auto":
    default: {
      // Whole number → commas, no decimals
      if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
        return Math.round(n).toLocaleString();
      }
      // Fractional → keep up to 1 meaningful decimal, with commas for integer part
      const fixed = stripTrailingZero(n.toFixed(1));
      const [intPart, decPart] = fixed.split(".");
      const formattedInt = Number(intPart).toLocaleString();
      return decPart ? `${formattedInt}.${decPart}` : formattedInt;
    }
  }
}

/** Remove trailing ".0" from a fixed-decimal string */
function stripTrailingZero(s: string): string {
  return s.replace(/\.0$/, "");
}
