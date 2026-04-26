"use client";
import React from "react";
import { Check, ChevronRight } from "@/lib/icons";
import type { DesignPath } from "../../lib/designpaths/types";
import { computePathProgress } from "../../lib/designpaths/pathProgress";

interface Props {
  path: DesignPath;
  moduleStatus: Record<string, string>;
  onOpen: () => void;
}

export function PathSummaryCard({ path, moduleStatus, onOpen }: Props) {
  const progress = computePathProgress(path, moduleStatus);

  return (
    <div
      onClick={onOpen}
      style={{
        background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12,
        padding: "16px 20px", cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#534AB7"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(83,74,183,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>
            {path.sourceModuleTitle} · Design path
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
            {path.headline}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "#534AB7", flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Mini step pills */}
      <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 10 }}>
        {path.steps.map((step, i) => {
          const ms = moduleStatus[step.moduleId] || "not_started";
          const isComplete = ms === "complete";
          const isNext = progress.nextStepIdx === i;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: isComplete ? "#639922" : "var(--border)", fontSize: 8 }}>→</span>}
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                background: isComplete ? "#639922" : isNext ? "#534AB7" : "var(--surface-2)",
                color: isComplete || isNext ? "#fff" : "var(--text-muted)",
                border: isNext ? "1.5px solid #534AB7" : "1px solid transparent",
              }}>
                {isComplete ? <Check size={10} /> : i + 1}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, transition: "width 0.3s ease",
            background: progress.percentComplete === 100 ? "#639922" : "#534AB7",
            width: `${progress.percentComplete}%`,
          }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          {progress.completedSteps}/{progress.totalSteps} · {progress.totalWeeks.min === progress.totalWeeks.max ? `${progress.totalWeeks.min}wk` : `${progress.totalWeeks.min}–${progress.totalWeeks.max}wk`}
        </span>
      </div>
    </div>
  );
}
