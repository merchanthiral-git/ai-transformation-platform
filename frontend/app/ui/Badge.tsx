"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "success"
  | "warn"
  | "risk"
  | "info"
  | "insight"
  | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// ── Color map ─────────────────────────────────────────────────────────────────

const VARIANT_COLORS: Record<
  BadgeVariant,
  { color: string; bg: string; border: string }
> = {
  success: {
    color: "var(--sem-success)",
    bg: "var(--sem-success-bg)",
    border: "var(--sem-success-border)",
  },
  warn: {
    color: "var(--sem-warn)",
    bg: "var(--sem-warn-bg)",
    border: "var(--sem-warn-border)",
  },
  risk: {
    color: "var(--sem-risk)",
    bg: "var(--sem-risk-bg)",
    border: "var(--sem-risk-border)",
  },
  info: {
    color: "var(--sem-info)",
    bg: "var(--sem-info-bg)",
    border: "var(--sem-info-border)",
  },
  insight: {
    color: "var(--sem-insight)",
    bg: "var(--sem-insight-bg)",
    border: "var(--sem-insight-border)",
  },
  neutral: {
    color: "var(--text-muted)",
    bg: "var(--surface-2)",
    border: "var(--border)",
  },
};

// ── Numeric detection ─────────────────────────────────────────────────────────

function isNumericContent(children: React.ReactNode): boolean {
  if (typeof children === "number") return true;
  if (typeof children === "string") return /^\d+(\.\d+)?%?$/.test(children.trim());
  return false;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Badge({
  variant = "neutral",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  const { color, bg, border } = VARIANT_COLORS[variant];
  const numeric = isNumericContent(children);

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: 1,
    color,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "999px",
    padding: "3px 8px",
    whiteSpace: "nowrap",
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  };

  return (
    <span className={className} style={style}>
      {dot && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
