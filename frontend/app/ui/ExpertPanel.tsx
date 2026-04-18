"use client";

import React, { ReactNode } from "react";
import { BookOpen, Sparkle, TriangleAlert } from "@/lib/icons";

type Variant = "info" | "insight" | "warning";

interface ExpertPanelProps {
  title: string;
  source: string;
  variant: Variant;
  children: ReactNode;
}

const variantConfig: Record<
  Variant,
  { icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  info: {
    icon: <BookOpen size={15} />,
    color: "var(--sem-info)",
    bg: "var(--sem-info-bg)",
    border: "var(--sem-info-border)",
  },
  insight: {
    icon: <Sparkle size={15} />,
    color: "var(--sem-insight)",
    bg: "var(--sem-insight-bg)",
    border: "var(--sem-insight-border)",
  },
  warning: {
    icon: <TriangleAlert size={15} />,
    color: "var(--sem-warn)",
    bg: "var(--sem-warn-bg)",
    border: "var(--sem-warn-border)",
  },
};

export function ExpertPanel({ title, source, variant, children }: ExpertPanelProps) {
  const cfg = variantConfig[variant];

  return (
    <div
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "var(--card-padding, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            color: cfg.color,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {cfg.icon}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-semi)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </span>
            <span
              style={{
                fontSize: "var(--text-2xs)",
                fontWeight: "var(--fw-medium)",
                color: cfg.color,
                backgroundColor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 4,
                padding: "1px 6px",
                whiteSpace: "nowrap",
                lineHeight: 1.6,
              }}
            >
              {source}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          paddingLeft: 23,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default ExpertPanel;
