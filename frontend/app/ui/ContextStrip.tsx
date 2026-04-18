"use client";

import React from "react";

type ItemStatus = "success" | "warn" | "risk";

interface ContextItem {
  label: string;
  value: string;
  status?: ItemStatus;
}

interface ContextStripProps {
  items: ContextItem[];
  className?: string;
}

const statusValueColor: Record<ItemStatus, string> = {
  success: "var(--sem-success)",
  warn:    "var(--sem-warn)",
  risk:    "var(--sem-risk)",
};

export function ContextStrip({ items, className = "" }: ContextStripProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={className}
      role="region"
      aria-label="Context from prior steps"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0",
        backgroundColor: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        padding: "8px 14px",
        overflowX: "auto",
      }}
    >
      {/* "From prior steps" eyebrow */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--text-muted)",
          marginRight: 12,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        From prior steps
      </span>

      {items.map((item, idx) => {
        const valueColor = item.status
          ? statusValueColor[item.status]
          : "var(--text-primary)";

        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && (
              <span
                aria-hidden
                style={{
                  color: "var(--border)",
                  padding: "0 10px",
                  fontSize: 14,
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                |
              </span>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: valueColor,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {item.value}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ContextStrip;
