"use client";
import React, { useContext } from "react";
import { ChevronRight, Check, AlertTriangle, Eye } from "@/lib/icons";
import { NavContext, MODULES } from "../shared/constants";
import type { PrescribedRoadmap } from "../../lib/prescriptive/types";
import { computeRoadmapProgress } from "../../lib/prescriptive/roadmapProgress";
import type { StepStatus } from "../../lib/prescriptive/roadmapProgress";

/* ═══════════════════════════════════════════════════════════════
   STYLE CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const SEV_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(239,68,68,0.06)", text: "#EF4444", border: "rgba(239,68,68,0.2)" },
  important: { bg: "rgba(234,179,8,0.06)", text: "#D97706", border: "rgba(234,179,8,0.2)" },
  watch: { bg: "var(--surface-2)", text: "var(--text-muted)", border: "var(--border)" },
};

const CONF_LABELS: Record<string, string> = {
  high: "High confidence",
  inferred: "Inferred from similar orgs",
  "open-question": "Open question",
};

const CAT_LABELS: Record<string, string> = {
  leadership: "Leadership",
  talent: "Talent",
  governance: "Governance",
  culture: "Culture",
  operations: "Operations",
};

const STEP_STATUS_STYLE: Record<StepStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  complete: { bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.3)", text: "#16A34A", icon: <Check size={14} /> },
  in_progress: { bg: "rgba(59,130,246,0.06)", border: "var(--accent-primary)", text: "var(--accent-primary)", icon: null },
  not_started: { bg: "var(--surface-2)", border: "var(--border)", text: "var(--text-muted)", icon: null },
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  roadmap: PrescribedRoadmap;
  moduleStatus: Record<string, string>;
  onNavigateToModule: (moduleId: string) => void;
  onRegenerate?: () => void;
}

export function PrescriptionView({ roadmap, moduleStatus, onNavigateToModule, onRegenerate }: Props) {
  const goTo = useContext(NavContext);
  const progress = computeRoadmapProgress(roadmap, moduleStatus);

  const getModuleTitle = (moduleId: string) =>
    MODULES.find(m => m.id === moduleId)?.title || moduleId;

  // Group strategic questions by category
  const qByCategory = roadmap.strategicQuestions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, typeof roadmap.strategicQuestions>);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Section 1: Band Header */}
      <div style={{ textAlign: "center", padding: "24px 0 20px", borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>YOUR READINESS BAND</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Inter Tight', sans-serif", marginBottom: 8 }}>{roadmap.band}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>{roadmap.bandDescription}</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Generated {new Date(roadmap.generatedAt).toLocaleDateString()}</span>
          {onRegenerate && (
            <button onClick={onRegenerate} style={{ fontSize: 11, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Regenerate</button>
          )}
        </div>
      </div>

      {/* Section 2: What We Found */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 14 }}>WHAT WE FOUND</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {roadmap.diagnosis.map((item, i) => {
            const sev = SEV_COLORS[item.severity];
            return (
              <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.severity === "critical" && <AlertTriangle size={14} style={{ color: sev.text }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: sev.text }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${sev.text}10`, color: sev.text, fontWeight: 500 }}>{item.severity}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 8 }}>{item.finding}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                  <strong style={{ color: "var(--text-muted)" }}>Why this matters:</strong> {item.whyItMatters}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                  <strong style={{ color: "var(--text-muted)" }}>Cost of inaction:</strong> {item.cost}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-2)", borderRadius: 6, padding: "6px 10px", display: "inline-block" }}>
                  Benchmark: {item.whatGoodLooksLike}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{CONF_LABELS[item.confidence]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Your Prescribed Path */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>YOUR PRESCRIBED PATH</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{progress.completedSteps} of {progress.totalSteps} complete · {progress.percentComplete}%</span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, background: progress.percentComplete === 100 ? "#16A34A" : "var(--accent-primary)", width: `${progress.percentComplete}%`, transition: "width 0.3s ease" }} />
        </div>
        {/* Step cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {progress.stepStatuses.map(({ step, status }, i) => {
            const ss = STEP_STATUS_STYLE[status];
            const isNext = progress.nextStep?.moduleId === step.moduleId;
            return (
              <div key={i}
                onClick={() => onNavigateToModule(step.moduleId)}
                tabIndex={0} role="button"
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateToModule(step.moduleId); } }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  background: ss.bg, border: `1.5px solid ${isNext ? "var(--accent-primary)" : ss.border}`,
                  borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                  opacity: status === "complete" ? 0.7 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                {/* Step number or check */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: status === "complete" ? "#16A34A" : isNext ? "var(--accent-primary)" : "var(--surface-2)",
                  color: status === "complete" || isNext ? "#fff" : "var(--text-muted)",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {status === "complete" ? <Check size={14} /> : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: status === "complete" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: status === "complete" ? "line-through" : "none" }}>
                      {getModuleTitle(step.moduleId)}
                    </span>
                    {isNext && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "var(--accent-primary)", color: "#fff", fontWeight: 600 }}>Next</span>}
                    {step.estimatedEffort && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{step.estimatedEffort} effort</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.rationale}</div>
                  {step.emphasis && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>Focus: {step.emphasis}</div>}
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 6 }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Strategic Questions */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 14 }}>QUESTIONS FOR YOUR LEADERSHIP TEAM</div>
        {Object.entries(qByCategory).map(([cat, questions]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{CAT_LABELS[cat] || cat}</div>
            {questions.map((q, qi) => (
              <div key={qi} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 4 }}>{q.question}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{q.framing}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Section 5: Honest Caveat */}
      <div style={{ marginBottom: 16, padding: "16px 20px", background: "var(--surface-2)", borderRadius: 10, borderLeft: "3px solid var(--text-muted)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>WHAT THIS ASSESSMENT CANNOT TELL YOU</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic" }}>{roadmap.honestCaveat}</div>
      </div>
    </div>
  );
}
