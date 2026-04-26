"use client";
import React from "react";

interface Props {
  label: string;
  whatItDoes: string;
  onBackToActive: () => void;
}

export function OptionalTabNotice({ label, whatItDoes, onBackToActive }: Props) {
  return (
    <div style={{
      background: "var(--surface-2)", border: "0.5px solid var(--border)",
      borderRadius: 8, padding: "14px 16px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>ⓘ</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>
            This tab isn{"'"}t part of your current path step
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
            {whatItDoes}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={onBackToActive} style={{
              fontSize: 11, fontWeight: 600, color: "#534AB7", background: "none",
              border: "none", cursor: "pointer", padding: 0,
            }}>
              ← Back to active tab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
