"use client";
import React from "react";

interface Props {
  criterion: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SoftCompletionWarning({ criterion, onConfirm, onCancel }: Props) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
      background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)",
      borderRadius: 8, marginBottom: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          This step{"'"}s criterion is: <strong>"{criterion}"</strong>. Mark complete anyway?
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, background: "var(--accent-primary)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}>Mark complete</button>
      </div>
    </div>
  );
}
