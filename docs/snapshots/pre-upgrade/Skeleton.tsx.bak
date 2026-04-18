"use client";
import React from "react";

/**
 * Skeleton loading components — shimmer placeholders matching content shape.
 * Uses the .skeleton CSS class defined in globals.css.
 */

function SkeletonBox({ width, height, className = "" }: { width?: string | number; height?: string | number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: width || "100%", height: height || 16 }} />;
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 14, width: i === lines - 1 ? "60%" : "100%" }} />
    ))}
  </div>;
}

function SkeletonCard({ height = 120 }: { height?: number }) {
  return <div className="rounded-2xl border border-[var(--border)] overflow-hidden" style={{ padding: "var(--card-padding)" }}>
    <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 12 }} />
    <div className="skeleton" style={{ height: height - 40 }} />
  </div>;
}

function SkeletonKpiCard() {
  return <div className="rounded-xl border border-[var(--border)] p-4" style={{ minHeight: 80 }}>
    <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 8 }} />
    <div className="skeleton" style={{ height: 28, width: "70%", marginBottom: 6 }} />
    <div className="skeleton" style={{ height: 10, width: "40%" }} />
  </div>;
}

function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return <div className="flex gap-3 py-2.5 border-b border-[var(--border)]">
    {Array.from({ length: columns }).map((_, i) => (
      <div key={i} className="skeleton flex-1" style={{ height: 14 }} />
    ))}
  </div>;
}

function SkeletonChart({ height = 200 }: { height?: number }) {
  return <div className="rounded-xl border border-[var(--border)] p-4">
    <div className="skeleton" style={{ height: 12, width: "30%", marginBottom: 16 }} />
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton flex-1" style={{ height: `${30 + Math.random() * 60}%` }} />
      ))}
    </div>
  </div>;
}

export const Skeleton = {
  Box: SkeletonBox,
  Text: SkeletonText,
  Card: SkeletonCard,
  KpiCard: SkeletonKpiCard,
  TableRow: SkeletonTableRow,
  Chart: SkeletonChart,
};
