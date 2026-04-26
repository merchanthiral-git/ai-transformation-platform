"use client";
import React from "react";
import { ChevronRight, Check } from "@/lib/icons";
import { MODULES } from "../shared/constants";
import type { PrescribedRoadmap } from "../../lib/prescriptive/types";
import { computeRoadmapProgress } from "../../lib/prescriptive/roadmapProgress";

/* ═══════════════════════════════════════════════════════════════
   Compact roadmap progress card — used on the home page
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  roadmap: PrescribedRoadmap;
  moduleStatus: Record<string, string>;
  onContinue: () => void;
}

export function RoadmapProgressCard({ roadmap, moduleStatus, onContinue }: Props) {
  const progress = computeRoadmapProgress(roadmap, moduleStatus);
  const getTitle = (id: string) => MODULES.find(m => m.id === id)?.title || id;

  return (
    <div style={{
      background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "16px 20px", cursor: "pointer", transition: "all 0.15s",
    }}
      onClick={onContinue}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-primary)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Your personalized path — {roadmap.sourceModuleTitle}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
            {roadmap.findingsSummary}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: progress.percentComplete === 100 ? "#16A34A" : "var(--accent-primary)" }}>
            {progress.percentComplete === 100 ? "Complete" : "Continue"}
          </span>
          <ChevronRight size={14} style={{ color: "var(--accent-primary)" }} />
        </div>
      </div>

      {/* Step pills */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {progress.stepStatuses.map(({ step, status }, i) => {
          const isNext = progress.nextStep?.moduleId === step.moduleId;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: status === "complete" ? "#16A34A" : "var(--border)", fontSize: 10 }}>→</span>}
              <span style={{
                padding: "3px 8px", fontSize: 10, fontWeight: 500, borderRadius: 6,
                background: status === "complete" ? "rgba(22,163,74,0.08)" : isNext ? "rgba(59,130,246,0.08)" : "var(--surface-2)",
                color: status === "complete" ? "#16A34A" : isNext ? "var(--accent-primary)" : "var(--text-muted)",
                border: isNext ? "1px solid var(--accent-primary)" : "1px solid transparent",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                {status === "complete" && <Check size={10} />}
                {getTitle(step.moduleId).length > 20 ? getTitle(step.moduleId).slice(0, 18) + "…" : getTitle(step.moduleId)}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: progress.percentComplete === 100 ? "#16A34A" : "var(--accent-primary)", width: `${progress.percentComplete}%`, transition: "width 0.3s ease" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          {progress.completedSteps} / {progress.totalSteps} · {progress.percentComplete}%
        </span>
      </div>
    </div>
  );
}
