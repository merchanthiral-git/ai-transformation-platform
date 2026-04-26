"use client";
import React from "react";
import { Check, ChevronRight } from "@/lib/icons";
import type { DesignPath, StepTiming } from "../../lib/designpaths/types";
import { computePathProgress } from "../../lib/designpaths/pathProgress";
import { EditableTimingPill } from "./EditableTimingPill";

/* ═══════════════════════════════════════════════════════════════ */

const PURPLE = "#534AB7";
const GREEN = "#639922";

interface Props {
  path: DesignPath;
  moduleStatus: Record<string, string>;
  onNavigateToModule: (moduleId: string) => void;
  onEditTiming: (stepIdx: number, newTiming: Partial<StepTiming>) => void;
  onDeferStep?: (stepIdx: number) => void;
  onShowYourWork?: () => void;
  onViewOtherPaths?: () => void;
}

export function DesignPathView({ path, moduleStatus, onNavigateToModule, onEditTiming, onDeferStep, onShowYourWork, onViewOtherPaths }: Props) {
  const progress = computePathProgress(path, moduleStatus);
  const pivotalCount = path.findings.filter(f => f.pivotal).length;

  const getStepStatus = (idx: number): "complete" | "active" | "pending" => {
    const ms = moduleStatus[path.steps[idx].moduleId] || "not_started";
    if (ms === "complete") return "complete";
    if (progress.nextStepIdx === idx) return "active";
    return "pending";
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>
          {path.sourceModuleTitle} · Design path
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3, margin: "0 0 8px 0", fontFamily: "'Inter Tight', sans-serif" }}>
              {path.headline}
            </h2>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Generated {new Date(path.generatedAt).toLocaleDateString()} · {progress.completedSteps} of {progress.totalSteps} steps complete
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {onShowYourWork && <button onClick={onShowYourWork} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer" }}>Show your work</button>}
            {onViewOtherPaths && <button onClick={onViewOtherPaths} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer" }}>Other paths</button>}
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[
          { label: path.bandLabel, value: path.overallScore != null ? `${path.overallScore.toFixed(1)}/5` : path.bandLabel, accent: true },
          { label: "Pivotal gaps", value: String(pivotalCount) },
          { label: "Total time", value: progress.totalWeeks.min === progress.totalWeeks.max ? `${progress.totalWeeks.min} weeks` : `${progress.totalWeeks.min}–${progress.totalWeeks.max} weeks` },
          { label: "Progress", value: `${progress.percentComplete}%` },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.accent ? PURPLE : "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Outcome statement ── */}
      <div style={{ maxWidth: 720, fontSize: 16, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 32 }}>
        {path.outcomeStatement}
      </div>

      {/* ── Two-column: Findings + Alternatives ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 32 }}>
        {/* Findings */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>FINDINGS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {path.findings.sort((a, b) => (a.pivotal === b.pivotal ? 0 : a.pivotal ? -1 : 1)).map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: f.pivotal ? 1 : 0.55 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: f.pivotal ? 500 : 400, color: "var(--text-primary)" }}>{f.dimensionName}</div>
                </div>
                <div style={{ width: 100, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${(f.score / f.maxScore) * 100}%`,
                    background: f.flag === "weak" ? "#e87a5d" : f.flag === "developing" ? "#f4a83a" : GREEN,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)", width: 32, textAlign: "right" }}>{f.score.toFixed(1)}</span>
                {f.pivotal && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(83,74,183,0.08)", color: PURPLE, fontWeight: 600 }}>pivotal</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Alternatives */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>ALTERNATIVES CONSIDERED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {path.alternatives.map((alt, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 8,
                background: alt.selected ? "#FBFAFE" : "var(--surface-1)",
                border: `1px solid ${alt.selected ? PURPLE : "var(--border)"}`,
                opacity: alt.selected ? 1 : 0.65,
              }}>
                <div style={{ fontSize: 15, fontWeight: alt.selected ? 600 : 400, color: "var(--text-primary)", marginBottom: 3 }}>{alt.label}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{alt.blurb}</div>
                {alt.rejectedReason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>Rejected: {alt.rejectedReason}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Path steps ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 16 }}>PATH STEPS</div>
        {path.steps.map((step, idx) => {
          const status = getStepStatus(idx);
          return (
            <div key={idx} style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: idx < path.steps.length - 1 ? "1px solid var(--border)" : "none" }}>
              {/* Step number */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                background: status === "complete" ? GREEN : status === "active" ? PURPLE : "var(--surface-2)",
                color: status === "complete" || status === "active" ? "#fff" : "var(--text-muted)",
                marginTop: 2,
              }}>
                {status === "complete" ? <Check size={14} /> : idx + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    onClick={() => onNavigateToModule(step.moduleId)}
                    style={{ fontSize: 17, fontWeight: 600, color: status === "complete" ? "var(--text-muted)" : "var(--text-primary)", cursor: "pointer", textDecoration: status === "complete" ? "line-through" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = PURPLE)}
                    onMouseLeave={e => (e.currentTarget.style.color = status === "complete" ? "var(--text-muted)" : "var(--text-primary)")}
                  >
                    {step.title}
                  </span>
                  {step.framework && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 4, background: "rgba(83,74,183,0.06)", color: PURPLE, fontWeight: 500 }}>{step.framework}</span>}
                </div>

                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>{step.description}</div>

                {/* Why now — only for active step */}
                {status === "active" && (
                  <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 10, borderLeft: `3px solid ${PURPLE}`, background: "rgba(83,74,183,0.03)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 6 }}>WHY NOW</div>
                    <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>{step.whyNow}</div>
                  </div>
                )}

                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <EditableTimingPill timing={step.timing} onSave={(t) => onEditTiming(idx, t)} />
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{step.scope}</span>
                  {step.stakeholders.map((s, si) => (
                    <span key={si} style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Watch points ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 16 }}>WHAT TENDS TO GO SIDEWAYS</div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "10px 20px" }}>
          {path.steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>{step.title}</div>
              <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.55 }}>{step.watchPoint}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Sensitivity ── */}
      <div style={{ padding: "14px 20px", background: "var(--surface-2)", borderRadius: 10, marginBottom: 28, fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
        {path.sensitivityNote}
      </div>

      {/* ── Up-next CTA ── */}
      {progress.nextStep && (
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>UP NEXT</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{progress.nextStep.title}</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 14 }}>{progress.nextStep.scope}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {onDeferStep && <button onClick={() => onDeferStep(progress.nextStepIdx)} style={{ padding: "10px 18px", fontSize: 14, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Defer</button>}
            <button onClick={() => onNavigateToModule(progress.nextStep!.moduleId)} style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, background: PURPLE, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Begin step {progress.nextStepIdx + 1} →</button>
          </div>
        </div>
      )}
    </div>
  );
}
