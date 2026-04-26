"use client";
import React from "react";
import { Check } from "@/lib/icons";
import type { SubStep } from "../../lib/designpaths/types";

const PURPLE = "#534AB7";

interface Props {
  sourceModuleTitle: string;
  parentStepIdx: number;
  parentStepCount: number;
  subStep: SubStep;
  subStepIdx: number;
  totalSubSteps: number;
  onMarkComplete: () => void;
  onUndo?: () => void;
  isComplete: boolean;
}

export function SubStepInstructionPanel({ sourceModuleTitle, parentStepIdx, parentStepCount, subStep, subStepIdx, totalSubSteps, onMarkComplete, onUndo, isComplete }: Props) {
  return (
    <div style={{
      background: isComplete ? "rgba(99,153,34,0.04)" : "#FBFAFE",
      border: `1px solid ${isComplete ? "rgba(99,153,34,0.2)" : "rgba(83,74,183,0.15)"}`,
      borderRadius: 10, padding: "16px 18px", marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
            background: isComplete ? "rgba(99,153,34,0.08)" : "rgba(83,74,183,0.08)",
            color: isComplete ? "#639922" : PURPLE,
          }}>
            Sub-step {subStepIdx} of {totalSubSteps}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Step {parentStepIdx + 1} of {parentStepCount} · {sourceModuleTitle}
          </span>
        </div>
        {isComplete && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} style={{ color: "#639922" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#639922" }}>Complete</span>
            {onUndo && <button onClick={onUndo} style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}>Undo</button>}
          </div>
        )}
      </div>

      {/* Title + criterion */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{subStep.title}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{subStep.criterion}</div>

      {/* Instructions */}
      {!isComplete && subStep.howToDoIt.length > 0 && (
        <ol style={{ margin: "0 0 12px 0", paddingLeft: 18, listStyleType: "decimal" }}>
          {subStep.howToDoIt.map((line, i) => (
            <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 3 }}>{line}</li>
          ))}
        </ol>
      )}

      {/* Mark complete button */}
      {!isComplete && (
        <button onClick={onMarkComplete} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "6px 14px", fontSize: 12, fontWeight: 600,
          background: PURPLE, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
        }}>
          <Check size={12} /> Mark sub-step complete
        </button>
      )}
    </div>
  );
}
