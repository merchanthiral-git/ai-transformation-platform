"use client";
import React from "react";
import { Check } from "@/lib/icons";

interface Props {
  stepIdx: number;
  totalSteps: number;
  stepTitle: string;
  completedAt?: string;
  candidateFunctions: string[];
  concentrationJudgment?: string | null;
  concentrationRationale?: string;
  skillGapJudgment?: string | null;
  skillGapRationale?: string;
  orgReadinessJudgment?: string | null;
  orgReadinessRationale?: string;
  nextStepTitle?: string;
  nextStepModuleId?: string;
  onContinueToNext?: () => void;
  onEditAssessment?: () => void;
  nextStepAvailable: boolean;
}

export function StepCompleteCard({
  stepIdx, totalSteps, stepTitle, completedAt,
  candidateFunctions, concentrationJudgment, concentrationRationale,
  skillGapJudgment, skillGapRationale, orgReadinessJudgment, orgReadinessRationale,
  nextStepTitle, nextStepModuleId, onContinueToNext, onEditAssessment, nextStepAvailable,
}: Props) {
  return (
    <div style={{
      background: "rgba(28,43,58,0.65)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid #10B981",
      borderRadius: 12, padding: "18px 20px", marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={18} style={{ color: "#10B981" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F7F5F0" }}>
            Step {stepIdx + 1} of {totalSteps} Complete: {stepTitle}
          </span>
        </div>
        {completedAt && <span style={{ fontSize: 11, color: "rgba(247,245,240,0.55)" }}>Completed {new Date(completedAt).toLocaleDateString()}</span>}
      </div>

      {/* Recap */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(247,245,240,0.55)", marginBottom: 8 }}>YOUR ASSESSMENT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          {/* Candidates */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(247,245,240,0.55)", marginBottom: 4 }}>Candidate functions</div>
            {candidateFunctions.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {candidateFunctions.map(fn => <span key={fn} style={{ padding: "2px 8px", fontSize: 11, borderRadius: 6, background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.35)" }}>{fn}</span>)}
              </div>
            ) : <span style={{ fontSize: 12, color: "rgba(247,245,240,0.55)", fontStyle: "italic" }}>None selected</span>}
          </div>

          {/* Concentration */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(247,245,240,0.55)", marginBottom: 4 }}>Impact concentration</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#F7F5F0" }}>{concentrationJudgment || "Not assessed"}</div>
            {concentrationRationale && <div style={{ fontSize: 11, color: "rgba(247,245,240,0.45)", fontStyle: "italic", marginTop: 2 }}>— {concentrationRationale}</div>}
          </div>

          {/* Skill gaps */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(247,245,240,0.55)", marginBottom: 4 }}>Skill gaps</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#F7F5F0" }}>{skillGapJudgment || "Not assessed"}</div>
            {skillGapRationale && <div style={{ fontSize: 11, color: "rgba(247,245,240,0.45)", fontStyle: "italic", marginTop: 2 }}>— {skillGapRationale}</div>}
          </div>

          {/* Org readiness */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(247,245,240,0.55)", marginBottom: 4 }}>Structural readiness</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#F7F5F0" }}>{orgReadinessJudgment || "Not assessed"}</div>
            {orgReadinessRationale && <div style={{ fontSize: 11, color: "rgba(247,245,240,0.45)", fontStyle: "italic", marginTop: 2 }}>— {orgReadinessRationale}</div>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {nextStepAvailable && onContinueToNext ? (
          <button onClick={onContinueToNext} style={{
            padding: "8px 18px", fontSize: 13, fontWeight: 600,
            background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
          }}>
            Continue to Step {stepIdx + 2}: {nextStepTitle || "Next"} →
          </button>
        ) : (
          <div>
            <button disabled style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "rgba(59,130,246,0.3)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 8, cursor: "not-allowed" }}>
              Continue to Step {stepIdx + 2} →
            </button>
            <div style={{ fontSize: 11, color: "rgba(247,245,240,0.45)", marginTop: 4 }}>
              Step {stepIdx + 2}{nextStepTitle ? ` (${nextStepTitle})` : ""} is coming soon. Your Step {stepIdx + 1} work is saved.
            </div>
          </div>
        )}
        {onEditAssessment && (
          <button onClick={onEditAssessment} style={{ fontSize: 12, color: "#93C5FD", background: "none", border: "none", cursor: "pointer" }}>
            Edit my assessment
          </button>
        )}
      </div>
    </div>
  );
}
