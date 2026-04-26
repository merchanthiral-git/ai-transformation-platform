"use client";
import React from "react";

const PURPLE = "#534AB7";

interface Props {
  open: boolean;
  existing: { headline: string; completedSteps: number; totalSteps: number };
  incoming: { headline: string; totalSteps: number };
  onKeepCurrent: () => void;
  onSwitchToNew: () => void;
  onClose: () => void;
}

export function PathConflictModal({ open, existing, incoming, onKeepCurrent, onSwitchToNew, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{
        position: "relative", width: "min(480px, 90vw)", background: "var(--surface-1)",
        border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          Your new assessment produced a different path
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
          <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>Current path</div>
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{existing.headline}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{existing.completedSteps} of {existing.totalSteps} steps complete</div>
          </div>
          <div style={{ padding: "8px 12px", background: "rgba(83,74,183,0.04)", border: `1px solid rgba(83,74,183,0.12)`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: PURPLE, marginBottom: 2 }}>New path</div>
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{incoming.headline}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{incoming.totalSteps} steps</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>What would you like to do?</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onKeepCurrent} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer" }}>Keep my current path</button>
          <button onClick={onSwitchToNew} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: PURPLE, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Switch to new path</button>
        </div>
      </div>
    </div>
  );
}
