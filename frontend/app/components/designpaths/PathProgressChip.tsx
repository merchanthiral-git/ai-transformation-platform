"use client";
import React from "react";

const PURPLE = "#534AB7";

interface ChipData {
  pathId: string;
  sourceModuleTitle: string;
  completedSteps: number;
  totalSteps: number;
  lifecycleState: "active" | "paused";
  onClick: () => void;
  onResume?: () => void;
}

interface Props {
  chips: ChipData[];
}

export function PathProgressChip({ chips }: Props) {
  if (chips.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 40,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {chips.map(chip => (
        <button key={chip.pathId} onClick={chip.onClick} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", fontSize: 12, fontWeight: 500,
          background: "var(--surface-1)", border: "0.5px solid var(--border)",
          borderRadius: 20, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          color: chip.lifecycleState === "paused" ? "var(--text-muted)" : "var(--text-secondary)",
          transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.boxShadow = "0 2px 12px rgba(83,74,183,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: chip.lifecycleState === "paused" ? "var(--text-muted)" : PURPLE }} />
          {chip.lifecycleState === "paused" ? (
            <>{chip.sourceModuleTitle} · paused {chip.onResume && <span onClick={e => { e.stopPropagation(); chip.onResume?.(); }} style={{ color: PURPLE, fontWeight: 600, marginLeft: 2, cursor: "pointer" }}>Resume</span>}</>
          ) : (
            <>{chip.sourceModuleTitle} · {chip.completedSteps}/{chip.totalSteps}</>
          )}
        </button>
      ))}
    </div>
  );
}
