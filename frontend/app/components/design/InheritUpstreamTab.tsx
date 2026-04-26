"use client";
import React, { useContext } from "react";
import type { Filters } from "../../../lib/api";
import * as api from "../../../lib/api";
import { NavContext } from "../shared/constants";
import type { Skill } from "../../../types/skills";

interface Props {
  model: string;
  f: Filters;
  jobStates?: Record<string, { currentTasks?: unknown[]; futureTasks?: unknown[]; savedAt?: string }>;
  seedSkills: Skill[];
  onContinue: () => void;
}

export function InheritUpstreamTab({ model, f, jobStates, seedSkills, onContinue }: Props) {
  const goTo = useContext(NavContext);

  // Count jobs with work-design data
  const designedJobs = Object.entries(jobStates || {}).filter(
    ([, v]) => v.futureTasks && (v.futureTasks as unknown[]).length > 0
  );
  const taskCount = designedJobs.reduce((sum, [, v]) => sum + ((v.futureTasks as unknown[])?.length || 0), 0);
  const newJobs = designedJobs.filter(([, v]) => !(v.currentTasks && (v.currentTasks as unknown[]).length > 0)).length;
  const modifiedJobs = designedJobs.length - newJobs;

  // Count skills from seed taxonomy (proxy for existing inventory)
  const activeSkills = seedSkills.filter(s => s.lifecycle === "active" || s.lifecycle === "emerging");

  const hasUpstream = designedJobs.length > 0;

  return (
    <div style={{ padding: "0 4px" }}>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>FROM WORK DESIGN</div>
          {hasUpstream ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
              {taskCount.toLocaleString()} tasks<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>across {designedJobs.length} jobs</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No redesigned jobs yet</div>
          )}
        </div>

        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>FROM JOB ARCHITECTURE</div>
          {hasUpstream ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
              {designedJobs.length} jobs<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>{newJobs > 0 ? `${newJobs} new · ` : ""}{modifiedJobs} modified</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No job changes detected</div>
          )}
        </div>

        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>EXISTING SKILLS INVENTORY</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
            {activeSkills.length} skills<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>in seed taxonomy</span>
          </div>
        </div>
      </div>

      {/* Empty state if no upstream data */}
      {!hasUpstream && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✏️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>No upstream work design data</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
            Complete the Work Design Lab to generate task-level breakdowns for your jobs. Skills Architecture inherits from those outputs.
          </div>
          <button
            onClick={() => goTo({ kind: "module", moduleId: "design" })}
            style={{ padding: "10px 24px", fontSize: 13, fontWeight: 600, background: "var(--accent-primary)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Go to Work Design Lab
          </button>
        </div>
      )}

      {/* Two-column layout when data exists */}
      {hasUpstream && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Left: Reconstructed jobs */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>RECONSTRUCTED JOBS</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>These jobs will derive new skill bundles in the next step.</div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {designedJobs.map(([jobTitle, v]) => (
                <div key={jobTitle} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{jobTitle}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{((v.futureTasks as unknown[])?.length || 0)} tasks</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Carry-forward skills */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>CARRY-FORWARD SKILLS</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>These existing skills carry forward into the future state.</div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {activeSkills.slice(0, 30).map(skill => (
                <div key={skill.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{skill.name}</span>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 3,
                      background: skill.category === "technical" ? "#EFF6FF" : skill.category === "behavioral" ? "#EEEDFE" : "#FEF1E8",
                      color: skill.category === "technical" ? "#1E3A8A" : skill.category === "behavioral" ? "#3C3489" : "#7C2D12",
                    }}>{skill.category}</span>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 3,
                    background: skill.lifecycle === "emerging" ? "rgba(59,130,246,0.08)" : "rgba(22,163,74,0.08)",
                    color: skill.lifecycle === "emerging" ? "#3B82F6" : "#16A34A",
                  }}>{skill.lifecycle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => goTo({ kind: "module", moduleId: "design" })}
          style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Edit upstream inputs
        </button>
        <button
          onClick={onContinue}
          style={{ padding: "10px 28px", fontSize: 13, fontWeight: 600, background: "var(--accent-primary)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          Continue to derive skills →
        </button>
      </div>
    </div>
  );
}
