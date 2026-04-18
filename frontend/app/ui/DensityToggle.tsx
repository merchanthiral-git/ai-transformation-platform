"use client";

import React from "react";
import { type Density, useDensity } from "@/app/ui/density";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DensityToggleProps {
  className?: string;
}

// ── Options ───────────────────────────────────────────────────────────────────

const OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact",     label: "Compact" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function DensityToggle({ className = "" }: DensityToggleProps) {
  const { density, setDensity } = useDensity();

  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Display density"
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        padding: "3px",
        gap: "2px",
      }}
    >
      {OPTIONS.map(({ value, label }) => {
        const isActive = density === value;

        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => setDensity(value)}
            style={{
              fontSize: "12px",
              fontWeight: isActive ? 600 : 500,
              lineHeight: 1,
              padding: "4px 12px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              background: isActive ? "var(--surface-1)" : "transparent",
              boxShadow: isActive ? "var(--shadow-1)" : "none",
              transition: [
                "background 150ms var(--ease-out)",
                "color 150ms var(--ease-out)",
                "box-shadow 150ms var(--ease-out)",
              ].join(", "),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
