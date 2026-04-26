"use client";
import React from "react";
import { Check } from "@/lib/icons";
import type { SubStep } from "../../lib/designpaths/types";

const PURPLE = "#534AB7";
const BLUE = "#3B82F6";

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
  variant?: "light" | "dark";
}

export function SubStepInstructionPanel({ sourceModuleTitle, parentStepIdx, parentStepCount, subStep, subStepIdx, totalSubSteps, onMarkComplete, onUndo, isComplete, variant = "light" }: Props) {
  const dark = variant === "dark";

  const cardStyle: React.CSSProperties = dark
    ? {
        background: isComplete ? "rgba(99,153,34,0.08)" : "rgba(28,43,58,0.65)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${isComplete ? "rgba(99,153,34,0.5)" : "rgba(59,130,246,0.35)"}`,
        borderRadius: 12, padding: "16px 18px", marginBottom: 12,
      }
    : {
        background: isComplete ? "rgba(99,153,34,0.04)" : "#FBFAFE",
        border: `1px solid ${isComplete ? "rgba(99,153,34,0.2)" : "rgba(83,74,183,0.15)"}`,
        borderRadius: 10, padding: "16px 18px", marginBottom: 12,
      };

  const headingColor = dark ? "#F7F5F0" : "var(--text-primary)";
  const bodyColor = dark ? "rgba(247,245,240,0.82)" : "var(--text-secondary)";
  const mutedColor = dark ? "rgba(247,245,240,0.55)" : "var(--text-muted)";
  const pillBg = dark
    ? (isComplete ? "rgba(99,153,34,0.15)" : "rgba(59,130,246,0.18)")
    : (isComplete ? "rgba(99,153,34,0.08)" : "rgba(83,74,183,0.08)");
  const pillColor = dark
    ? (isComplete ? "#86efac" : "#93C5FD")
    : (isComplete ? "#639922" : PURPLE);
  const btnBg = dark ? BLUE : PURPLE;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: pillBg, color: pillColor }}>
            Sub-step {subStepIdx} of {totalSubSteps}
          </span>
          <span style={{ fontSize: 11, color: mutedColor }}>
            Step {parentStepIdx + 1} of {parentStepCount} · {sourceModuleTitle}
          </span>
        </div>
        {isComplete && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} style={{ color: "#639922" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#639922" }}>Complete</span>
            {onUndo && <button onClick={onUndo} style={{ fontSize: 10, color: mutedColor, background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}>Undo</button>}
          </div>
        )}
      </div>

      {/* Title + criterion */}
      <div style={{ fontSize: 14, fontWeight: 600, color: headingColor, marginBottom: 3 }}>{subStep.title}</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 10 }}>{subStep.criterion}</div>

      {/* Instructions */}
      {!isComplete && subStep.howToDoIt.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: mutedColor, marginBottom: 4 }}>HOW TO DO THIS</div>
          <ol style={{ margin: "0 0 12px 0", paddingLeft: 18, listStyleType: "decimal", color: bodyColor }}>
            {subStep.howToDoIt.map((line, i) => (
              <li key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 3 }}>{line}</li>
            ))}
          </ol>
        </>
      )}

      {/* Mark complete button */}
      {!isComplete && (
        <button onClick={onMarkComplete} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "6px 14px", fontSize: 12, fontWeight: 600,
          background: btnBg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
        }}>
          <Check size={12} /> Mark sub-step complete
        </button>
      )}
    </div>
  );
}
