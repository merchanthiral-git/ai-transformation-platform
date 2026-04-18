"use client";

import React from "react";
import { HelpCircle } from "@/lib/icons";

type TrendDirection = "up" | "down" | "flat";
type AccentKey = "success" | "warn" | "risk" | "info" | "insight";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: TrendDirection;
  accent?: AccentKey;
  info?: string;
  icon?: React.ReactNode;
  className?: string;
}

const accentVars: Record<AccentKey, { border: string; bg: string }> = {
  success: { border: "var(--sem-success-border)", bg: "var(--sem-success-bg)" },
  warn:    { border: "var(--sem-warn-border)",    bg: "var(--sem-warn-bg)"    },
  risk:    { border: "var(--sem-risk-border)",    bg: "var(--sem-risk-bg)"    },
  info:    { border: "var(--sem-info-border)",    bg: "var(--sem-info-bg)"    },
  insight: { border: "var(--sem-insight-border)", bg: "var(--sem-insight-bg)" },
};

function trendColor(trend: TrendDirection | undefined): string {
  if (trend === "up")   return "var(--sem-success)";
  if (trend === "down") return "var(--sem-risk)";
  return "var(--text-muted)";
}

export function KpiCard({
  label,
  value,
  delta,
  trend,
  accent,
  info,
  icon,
  className = "",
}: KpiCardProps) {
  const accentStyle = accent ? accentVars[accent] : null;

  return (
    <div
      className={className}
      style={{
        backgroundColor: accentStyle ? accentStyle.bg : "var(--surface-1)",
        border: `1px solid ${accentStyle ? accentStyle.border : "var(--border)"}`,
        borderRadius: 8,
        padding: "var(--card-padding, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* Eyebrow row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--text-muted)",
            lineHeight: 1,
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {icon && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              {icon}
            </span>
          )}
          {info && (
            <span title={info} style={{ display: "flex", cursor: "default" }}>
              <HelpCircle
                size={13}
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
              />
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.1,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </span>

      {/* Delta */}
      {delta !== undefined && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: trendColor(trend),
            lineHeight: 1,
          }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}

export default KpiCard;
