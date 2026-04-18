"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardVariant = "default" | "elevated" | "ghost";

export interface CardProps {
  variant?: CardVariant;
  title?: string;
  subtitle?: string;
  /** ReactNode rendered in the title row, right-aligned (e.g. action buttons) */
  action?: React.ReactNode;
  /** ReactNode rendered in a bottom footer strip */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-1)",
  },
  elevated: {
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-2)",
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    boxShadow: "none",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Card({
  variant = "default",
  title,
  subtitle,
  action,
  footer,
  children,
  className = "",
  style,
}: CardProps) {
  const hasHeader = title || subtitle || action;

  const cardStyle: React.CSSProperties = {
    borderRadius: "12px",
    padding: "var(--card-padding)",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    ...VARIANT_STYLES[variant],
    ...style,
  };

  return (
    <div className={className} style={cardStyle}>
      {hasHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: children ? "16px" : 0,
          }}
        >
          {(title || subtitle) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              {title && (
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </span>
              )}
              {subtitle && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          )}

          {action && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              {action}
            </div>
          )}
        </div>
      )}

      {children && (
        <div style={{ flex: 1 }}>
          {children}
        </div>
      )}

      {footer && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: variant === "ghost" ? "none" : "1px solid var(--border)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
