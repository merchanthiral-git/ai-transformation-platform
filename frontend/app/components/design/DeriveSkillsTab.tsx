"use client";
import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, Check } from "@/lib/icons";
import type { Skill, JobSkillAssignment, JobSkillBundle, SkillAssignmentType, Proficiency } from "../../../types/skills";
import { SKILL_KEYWORDS, SKILL_MAP } from "./skills-seed-taxonomy";
import { SkillEditPanel } from "./SkillEditPanel";

/* ═══════════════════════════════════════════════════════════════
   TYPE COLORS
   ═══════════════════════════════════════════════════════════════ */

const TYPE_PILL: Record<SkillAssignmentType, { bg: string; text: string }> = {
  core: { bg: "#E1F5EE", text: "#085041" },
  supporting: { bg: "#F3F4F6", text: "#374151" },
  new: { bg: "#EEEDFE", text: "#3C3489" },
  declining: { bg: "#FEF3C7", text: "#92400E" },
  obsolete: { bg: "#FEE2E2", text: "#991B1B" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "var(--surface-2)", text: "var(--text-muted)" },
  review: { bg: "rgba(244,168,58,0.12)", text: "#D97706" },
  approved: { bg: "rgba(22,163,74,0.08)", text: "#16A34A" },
};

/* ═══════════════════════════════════════════════════════════════
   DERIVATION ENGINE (rules-based)
   ═══════════════════════════════════════════════════════════════ */

interface TaskData {
  taskId?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

function deriveSkillsFromTasks(tasks: TaskData[], seedSkills: Skill[]): JobSkillAssignment[] {
  const skillScores = new Map<string, { score: number; taskIds: string[] }>();

  for (const task of tasks) {
    const text = `${task.name || ""} ${task.description || ""}`.toLowerCase();
    for (const [skillId, keywords] of Object.entries(SKILL_KEYWORDS)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          const existing = skillScores.get(skillId) || { score: 0, taskIds: [] };
          existing.score += 1;
          if (task.taskId) existing.taskIds.push(task.taskId);
          else if (task.name) existing.taskIds.push(task.name as string);
          skillScores.set(skillId, existing);
          break; // one match per keyword set per task
        }
      }
    }
  }

  // Convert to assignments
  const total = tasks.length || 1;
  const assignments: JobSkillAssignment[] = [];

  for (const [skillId, { score, taskIds }] of skillScores) {
    const skill = SKILL_MAP.get(skillId);
    if (!skill || skill.lifecycle === "obsolete") continue;

    const frequency = score / total;
    const type: SkillAssignmentType = skill.lifecycle === "emerging" ? "new" : frequency > 0.5 ? "core" : "supporting";
    const weight = Math.min(Math.round(frequency * 100), 100);
    const confidence = Math.min(frequency * 2, 1); // higher freq = higher confidence

    assignments.push({
      skillId,
      type,
      requiredProficiency: 3 as Proficiency,
      criticality: frequency > 0.5 ? "critical" : "important",
      weight: Math.max(weight, 20),
      derivedFromTaskIds: [...new Set(taskIds)],
      confidence,
      source: "rules",
    });
  }

  // Sort by weight desc
  assignments.sort((a, b) => b.weight - a.weight);
  return assignments;
}

/* ═══════════════════════════════════════════════════════════════
   FILTER DROPDOWN
   ═══════════════════════════════════════════════════════════════ */

function FilterChip({ label, values, selected, onChange }: {
  label: string;
  values: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.size;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11, fontWeight: 500,
        background: count > 0 ? "rgba(59,130,246,0.08)" : "var(--surface-2)",
        border: count > 0 ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
        borderRadius: 6, color: count > 0 ? "var(--accent-primary)" : "var(--text-muted)", cursor: "pointer",
      }}>
        {label}{count > 0 ? `: ${count}` : ""} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 180, maxHeight: 240, overflowY: "auto",
          background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 20, padding: 4 }}>
          {values.map(v => {
            const isSelected = selected.has(v);
            return (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", borderRadius: 4, color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                <input type="checkbox" checked={isSelected} onChange={() => {
                  const next = new Set(selected);
                  isSelected ? next.delete(v) : next.add(v);
                  onChange(next);
                }} style={{ accentColor: "var(--accent-primary)" }} />
                {v || "(empty)"}
              </label>
            );
          })}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
            <button onClick={() => setOpen(false)} style={{ width: "100%", padding: "4px 10px", fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN TAB COMPONENT
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  model: string;
  jobStates: Record<string, { currentTasks?: unknown[]; futureTasks?: unknown[]; savedAt?: string }>;
  bundles: Record<string, JobSkillBundle>;
  setBundles: (fn: (prev: Record<string, JobSkillBundle>) => Record<string, JobSkillBundle>) => void;
  seedSkills: Skill[];
}

export function DeriveSkillsTab({ model, jobStates, bundles, setBundles, seedSkills }: Props) {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);

  // Filters
  const [familyFilter, setFamilyFilter] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  // Build job list from job states
  const jobs = useMemo(() => {
    return Object.entries(jobStates)
      .filter(([, v]) => v.futureTasks && (v.futureTasks as unknown[]).length > 0)
      .map(([title, v]) => ({
        title,
        taskCount: (v.futureTasks as unknown[])?.length || 0,
        tasks: (v.futureTasks || []) as TaskData[],
      }));
  }, [jobStates]);

  // Extract unique filter values
  const allFamilies = useMemo(() => [...new Set(jobs.map(() => "General"))], [jobs]); // Simplified — real data would pull from job metadata
  const allLevels = useMemo(() => [...new Set(["P1", "P2", "P3", "P4", "M1", "M2", "E1"])], []);
  const allStatuses = ["pending", "review", "approved"];

  // Ensure bundles exist for jobs (auto-derive on first access)
  const ensureBundle = useCallback((jobTitle: string, tasks: TaskData[]) => {
    if (bundles[jobTitle]) return bundles[jobTitle];
    const derived = deriveSkillsFromTasks(tasks, seedSkills);
    const bundle: JobSkillBundle = {
      jobId: jobTitle,
      skills: derived,
      status: "pending",
      lastUpdated: new Date().toISOString(),
    };
    setBundles(prev => ({ ...prev, [jobTitle]: bundle }));
    return bundle;
  }, [bundles, setBundles, seedSkills]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (statusFilter.size > 0) {
        const status = bundles[j.title]?.status || "pending";
        if (!statusFilter.has(status)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, bundles]);

  const anyFilters = familyFilter.size > 0 || levelFilter.size > 0 || statusFilter.size > 0;

  // Selected job's bundle
  const selectedJobData = jobs.find(j => j.title === selectedJob);
  const selectedBundle = selectedJob && selectedJobData ? ensureBundle(selectedJob, selectedJobData.tasks) : null;

  const handleApprove = () => {
    if (!selectedJob) return;
    setBundles(prev => ({
      ...prev,
      [selectedJob]: { ...prev[selectedJob], status: "approved", lastUpdated: new Date().toISOString() },
    }));
  };

  const handleSaveEdit = (assignments: JobSkillAssignment[]) => {
    if (!selectedJob) return;
    setBundles(prev => ({
      ...prev,
      [selectedJob]: { ...prev[selectedJob], skills: assignments, lastUpdated: new Date().toISOString() },
    }));
    setEditPanelOpen(false);
  };

  return (
    <div style={{ display: "flex", gap: 12, minHeight: "calc(100vh - 280px)" }}>
      {/* Left rail — job list */}
      <div style={{ width: 280, flexShrink: 0, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Filters */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
            <FilterChip label="Family" values={allFamilies} selected={familyFilter} onChange={setFamilyFilter} />
            <FilterChip label="Level" values={allLevels} selected={levelFilter} onChange={setLevelFilter} />
            <FilterChip label="Status" values={allStatuses} selected={statusFilter} onChange={setStatusFilter} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filteredJobs.length} of {jobs.length} jobs</span>
            {anyFilters && (
              <button onClick={() => { setFamilyFilter(new Set()); setLevelFilter(new Set()); setStatusFilter(new Set()); }}
                style={{ fontSize: 10, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Job list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredJobs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>No jobs match filters</div>
          ) : filteredJobs.map(j => {
            const bundle = bundles[j.title];
            const status = bundle?.status || "pending";
            const isSelected = selectedJob === j.title;
            const skillCount = bundle?.skills?.length || 0;
            return (
              <div key={j.title} onClick={() => setSelectedJob(j.title)}
                style={{
                  padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  borderLeft: isSelected ? "3px solid var(--accent-primary)" : "3px solid transparent",
                  background: isSelected ? "rgba(59,130,246,0.04)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>{j.title}</div>
                  <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, fontWeight: 500, flexShrink: 0, marginLeft: 8, ...STATUS_COLORS[status] }}>{status}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {j.taskCount} tasks{skillCount > 0 ? ` · ${skillCount} skills` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right detail pane */}
      <div style={{ flex: 1, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {!selectedJob || !selectedBundle ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>
            Select a job from the list to view derived skills
          </div>
        ) : (
          <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{selectedJob}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {selectedJobData?.taskCount} tasks · {selectedBundle.skills.length} derived skills
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditPanelOpen(true)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", cursor: "pointer" }}>
                  Edit skills
                </button>
                <button onClick={handleApprove} style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer",
                  background: selectedBundle.status === "approved" ? "rgba(22,163,74,0.08)" : "var(--accent-primary)",
                  color: selectedBundle.status === "approved" ? "#16A34A" : "#fff",
                }}>
                  {selectedBundle.status === "approved" ? <><Check size={12} /> Approved</> : "Approve"}
                </button>
              </div>
            </div>

            {/* Auto-derived badge */}
            {selectedBundle.skills.some(s => s.source === "rules") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8B5CF6", marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6" }} />
                AI-suggested · review recommended
              </div>
            )}

            {/* Derived skills pills */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>
                DERIVED SKILLS — {selectedBundle.skills.length} TOTAL
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedBundle.skills.map(a => {
                  const skill = SKILL_MAP.get(a.skillId);
                  if (!skill) return null;
                  const colors = TYPE_PILL[a.type];
                  return (
                    <span key={a.skillId} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 500, borderRadius: 6, background: colors.bg, color: colors.text }}>
                      {skill.name}
                    </span>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                {(Object.entries(TYPE_PILL) as [SkillAssignmentType, { bg: string; text: string }][]).map(([t, c]) => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.bg, border: `1px solid ${c.text}30` }} />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Top tasks */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>
                TOP TASKS DRIVING THESE SKILLS
              </div>
              {(selectedJobData?.tasks || []).slice(0, 5).map((task, i) => {
                const taskText = (task.name || task.description || `Task ${i + 1}`) as string;
                const derivedCount = selectedBundle.skills.filter(s => s.derivedFromTaskIds.includes(taskText)).length;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", width: 16 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{taskText}</span>
                    </div>
                    {derivedCount > 0 && (
                      <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "#EEEDFE", color: "#3C3489", fontWeight: 500, flexShrink: 0 }}>
                        +{derivedCount} skills
                      </span>
                    )}
                  </div>
                );
              })}
              {(selectedJobData?.tasks || []).length > 5 && (
                <button style={{ fontSize: 11, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer", marginTop: 8, fontWeight: 500 }}>
                  View all {selectedJobData?.tasks.length} tasks →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit panel */}
      {editPanelOpen && selectedJob && selectedBundle && (
        <SkillEditPanel
          jobTitle={selectedJob}
          assignments={selectedBundle.skills}
          allSkills={seedSkills}
          onSave={handleSaveEdit}
          onClose={() => setEditPanelOpen(false)}
        />
      )}
    </div>
  );
}
