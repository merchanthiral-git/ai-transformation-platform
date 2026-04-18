"use client";

import React, { ReactNode } from "react";

interface ChartFrameProps {
  title: string;
  children: ReactNode;
  legendPosition?: "top" | "bottom";
  height?: number;
  className?: string;
}

export function ChartFrame({
  title,
  children,
  legendPosition = "top",
  height = 300,
  className = "",
}: ChartFrameProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "var(--card-padding, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "var(--shadow-1)",
      }}
    >
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

      <div
        style={{ height, width: "100%", position: "relative" }}
        data-legend-position={legendPosition}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Default chart config values for use with Recharts components.
 * Pass these as props to CartesianGrid, Tooltip, Legend, etc.
 */
export const chartDefaults = {
  grid: {
    stroke: "var(--chart-grid)",
    strokeDasharray: "3 3",
    vertical: false,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "var(--surface-1)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-3)",
      borderRadius: 8,
      fontSize: 12,
      color: "var(--text-primary)",
    },
    labelStyle: {
      color: "var(--text-secondary)",
      fontWeight: 500,
    },
    cursor: { fill: "var(--hover)" },
  },
  legend: {
    wrapperStyle: {
      fontSize: 12,
      color: "var(--chart-text)",
      paddingTop: 0,
      paddingBottom: 0,
      textAlign: "left" as const,
    },
    align: "left" as const,
    verticalAlign: "top" as const,
  },
  axis: {
    tick: { fill: "var(--chart-text)", fontSize: 12 },
    axisLine: { stroke: "var(--border)" },
    tickLine: { stroke: "var(--border)" },
  },
} as const;

export default ChartFrame;
