"use client";

import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  message?: string;
}

export function LoadingSkeleton({ lines = 3, className = "", message }: LoadingSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label={message || "Loading"}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {message && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
          {message}
        </div>
      )}
      {Array.from({ length: lines }, (_, i) => {
        // Vary widths for a natural staggered look
        const widths = ["100%", "88%", "72%", "94%", "80%", "60%"];
        const width = widths[i % widths.length];
        return (
          <div
            key={i}
            className="skeleton"
            style={{
              height: 14,
              width,
              borderRadius: 6,
            }}
          />
        );
      })}
    </div>
  );
}

export default LoadingSkeleton;
