"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MethodologyOption {
  id: string;
  label: string;
  default?: boolean;
}

export interface MethodologyToggleProps {
  methodologies: MethodologyOption[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MethodologyToggle({
  methodologies,
  active,
  onChange,
  className = "",
}: MethodologyToggleProps) {
  if (methodologies.length === 0) return null;

  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Methodology selection"
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        padding: "3px",
        gap: "2px",
        flexWrap: "wrap",
      }}
    >
      {methodologies.map((m) => {
        const isActive = active === m.id;

        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => onChange(m.id)}
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
              whiteSpace: "nowrap",
              transition: [
                "background 150ms var(--ease-out)",
                "color 150ms var(--ease-out)",
                "box-shadow 150ms var(--ease-out)",
              ].join(", "),
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
