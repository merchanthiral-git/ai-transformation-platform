"use client";
import React from "react";
import { ResponsiveContainer } from "recharts";

const CHART_TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 15,
  color: "var(--text-primary)",
};

export function ChartWrapper({
  children,
  height = 250,
  className = "",
}: {
  children: React.ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export { CHART_TOOLTIP_STYLE };
