"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RAGStatus = "red" | "amber" | "green" | "grey";

export interface RAGIndicatorProps {
  status: RAGStatus;
  label?: string;
  className?: string;
}

// ── Color map ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<RAGStatus, string> = {
  red:   "var(--sem-risk)",
  amber: "var(--sem-warn)",
  green: "var(--sem-success)",
  grey:  "var(--text-muted)",
};

const STATUS_LABEL: Record<RAGStatus, string> = {
  red:   "Red",
  amber: "Amber",
  green: "Green",
  grey:  "Grey",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function RAGIndicator({ status, label, className = "" }: RAGIndicatorProps) {
  const color = STATUS_COLOR[status];
  const ariaLabel = label ?? STATUS_LABEL[status];

  return (
    <span
      className={className}
      role="img"
      aria-label={`RAG status: ${ariaLabel}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 20%, transparent)`,
        }}
      />
      {label && (
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
