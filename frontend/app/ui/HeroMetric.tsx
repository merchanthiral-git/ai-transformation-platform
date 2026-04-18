"use client";

import React from "react";

type StatusKey = "success" | "warn" | "risk" | "info";

interface SourcePill {
  label: string;
}

interface HeroMetricProps {
  label: string;
  value: string;
  delta?: string;
  status: StatusKey;
  sources?: SourcePill[];
  onClick?: () => void;
}

const statusTokens: Record<StatusKey, { border: string; text: string; bg: string }> = {
  success: {
    border: "var(--sem-success-border)",
    text:   "var(--sem-success)",
    bg:     "var(--sem-success-bg)",
  },
  warn: {
    border: "var(--sem-warn-border)",
    text:   "var(--sem-warn)",
    bg:     "var(--sem-warn-bg)",
  },
  risk: {
    border: "var(--sem-risk-border)",
    text:   "var(--sem-risk)",
    bg:     "var(--sem-risk-bg)",
  },
  info: {
    border: "var(--sem-info-border)",
    text:   "var(--sem-info)",
    bg:     "var(--sem-info-bg)",
  },
};

export function HeroMetric({
  label,
  value,
  delta,
  status,
  sources = [],
  onClick,
}: HeroMetricProps) {
  const tokens = statusTokens[status];
  const isClickable = typeof onClick === "function";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "20px 20px 20px 16px",
        borderLeft: `4px solid ${tokens.border}`,
        backgroundColor: "var(--surface-1)",
        borderRadius: "0 8px 8px 0",
        boxShadow: "var(--shadow-1)",
        cursor: isClickable ? "pointer" : "default",
        outline: "none",
        transition: "box-shadow var(--duration-fast) var(--ease-out)",
      }}
      onFocus={
        isClickable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "var(--shadow-2)";
            }
          : undefined
      }
      onBlur={
        isClickable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "var(--shadow-1)";
            }
          : undefined
      }
    >
      {/* Label */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontSize: "clamp(32px, 4vw, 40px)",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-1px",
            color: "var(--text-primary)",
          }}
        >
          {value}
        </span>
        {delta && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: tokens.text,
              letterSpacing: "-0.2px",
            }}
          >
            {delta}
          </span>
        )}
      </div>

      {/* Source pills */}
      {sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sources.map((s, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 100,
                backgroundColor: "var(--surface-2)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                lineHeight: "18px",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroMetric;
