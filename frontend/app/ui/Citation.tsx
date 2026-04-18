"use client";

import React from "react";
import { BookOpen } from "@/lib/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CitationProps {
  children: React.ReactNode;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Citation({ children, className = "" }: CitationProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "4px",
        fontSize: "12px",
        color: "var(--text-muted)",
        lineHeight: 1.5,
        verticalAlign: "middle",
      }}
    >
      <BookOpen
        aria-hidden="true"
        size={11}
        style={{
          flexShrink: 0,
          position: "relative",
          top: "1px",
          opacity: 0.75,
        }}
      />
      <span>{children}</span>
    </span>
  );
}
