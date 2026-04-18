"use client";

import React from "react";

interface LoadingBarProps {
  progress: number;
  className?: string;
}

export function LoadingBar({ progress, className = "" }: LoadingBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}%`}
      style={{
        width: "100%",
        height: 3,
        backgroundColor: "var(--border)",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${clamped}%`,
          backgroundColor: "var(--accent-primary)",
          borderRadius: 99,
          transition: "width var(--duration-base) var(--ease-out)",
        }}
      />
    </div>
  );
}

export default LoadingBar;
