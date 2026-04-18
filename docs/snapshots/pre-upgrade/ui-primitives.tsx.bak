"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES — Loading, Empty, Error, Transitions
   ═══════════════════════════════════════════════════════════════ */

// ── Loading Skeleton ──
// Matches layout shape of content. Use inside cards, tables, charts.

export function SkeletonLine({ width = "100%", height = 16, className = "" }: { width?: string | number; height?: number; className?: string }) {
  return <div className={`skeleton rounded ${className}`} style={{ width, height }} />;
}

export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-xl p-5 border border-[var(--border)] bg-[var(--surface-1)] space-y-3 ${className}`}>
      <SkeletonLine width="40%" height={20} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} height={14} />
      ))}
    </div>
  );
}

export function SkeletonKpiRow({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-5 border border-[var(--border)] bg-[var(--surface-1)] space-y-2">
          <SkeletonLine width="50%" height={12} />
          <SkeletonLine width="70%" height={28} />
          <SkeletonLine width="30%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 200, className = "" }: { height?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 ${className}`}>
      <SkeletonLine width="30%" height={18} className="mb-4" />
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton rounded flex-1" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = "" }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden ${className}`}>
      <div className="grid gap-3 p-4 border-b border-[var(--border)]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width="80%" height={12} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3 p-4 border-b border-[var(--border)] last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => <SkeletonLine key={c} width={`${50 + Math.random() * 40}%`} height={14} />)}
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
// For pages/tabs with no data. Shows icon + message + optional CTA.

export function EmptyState({
  icon = "📭",
  title,
  message,
  action,
  onAction,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-4xl mb-4 opacity-60">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      {message && <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">{message}</p>}
      {action && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Error State ──
// For API errors. Shows error message + retry button.

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--risk)]/10 flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--risk)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      {message && <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ── Confirm Dialog ──
// For destructive actions. Shows a confirmation modal before proceeding.

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const btnColor = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-amber-600 hover:bg-amber-700 text-white";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/60" onClick={onCancel} />
        <motion.div
          className="relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
          <p className="text-sm text-[var(--text-muted)] mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${btnColor}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Fade Transition ──
// Wraps mount/unmount with crossfade animation.

export function FadeTransition({ children, id, className = "" }: { children: React.ReactNode; id: string; className?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
