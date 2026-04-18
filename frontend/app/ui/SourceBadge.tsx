"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SourceBadgeVariant = "pill" | "inline";

export interface SourceBadgeProps {
  source: string;
  variant?: SourceBadgeVariant;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Truncates long source strings to a readable label */
function truncateSource(source: string, maxLen = 32): string {
  return source.length > maxLen ? source.slice(0, maxLen - 1) + "\u2026" : source;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SourceBadge({
  source,
  variant = "pill",
  className = "",
}: SourceBadgeProps) {
  const label = truncateSource(source);

  if (variant === "pill") {
    return (
      <span
        className={className}
        title={source}
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-muted)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "999px",
          padding: "2px 8px",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          cursor: "default",
          transition: "color 150ms ease, border-color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.borderColor = "var(--text-muted)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {label}
      </span>
    );
  }

  // inline variant
  return (
    <span
      className={className}
      title={source}
      style={{
        display: "inline",
        fontSize: "11px",
        fontWeight: 400,
        color: "var(--text-muted)",
        borderLeft: "2px solid var(--border)",
        paddingLeft: "6px",
        lineHeight: 1.5,
        cursor: "default",
        transition: "color 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.borderLeftColor = "var(--accent-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.borderLeftColor = "var(--border)";
      }}
    >
      {label}
    </span>
  );
}
