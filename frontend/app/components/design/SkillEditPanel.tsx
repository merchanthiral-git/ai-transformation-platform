"use client";
import React, { useState, useMemo } from "react";
import { X, Search, Plus } from "@/lib/icons";
import type { Skill, JobSkillAssignment, SkillAssignmentType, Proficiency, SkillCriticality } from "../../../types/skills";
import { PROFICIENCY_LABELS } from "../../../types/skills";

const TYPE_COLORS: Record<SkillAssignmentType, { bg: string; text: string }> = {
  core: { bg: "#E1F5EE", text: "#085041" },
  supporting: { bg: "#F3F4F6", text: "#374151" },
  new: { bg: "#EEEDFE", text: "#3C3489" },
  declining: { bg: "#FEF3C7", text: "#92400E" },
  obsolete: { bg: "#FEE2E2", text: "#991B1B" },
};

const IMPACT_COLORS: Record<string, { bg: string; text: string }> = {
  augmentable: { bg: "#DBEAFE", text: "#1E40AF" },
  substitutable: { bg: "#FEE2E2", text: "#991B1B" },
  resistant: { bg: "#E1F5EE", text: "#085041" },
  emerging: { bg: "#EEEDFE", text: "#3C3489" },
};

interface Props {
  jobTitle: string;
  assignments: JobSkillAssignment[];
  allSkills: Skill[];
  onSave: (assignments: JobSkillAssignment[]) => void;
  onClose: () => void;
}

export function SkillEditPanel({ jobTitle, assignments, allSkills, onSave, onClose }: Props) {
  const [local, setLocal] = useState<JobSkillAssignment[]>(() => [...assignments]);
  const [addSearch, setAddSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const skillMap = useMemo(() => new Map(allSkills.map(s => [s.id, s])), [allSkills]);

  const addResults = useMemo(() => {
    if (!addSearch || addSearch.length < 2) return [];
    const q = addSearch.toLowerCase();
    const assignedIds = new Set(local.map(a => a.skillId));
    return allSkills
      .filter(s => !assignedIds.has(s.id) && (s.name.toLowerCase().includes(q) || s.aliases?.some(a => a.toLowerCase().includes(q))))
      .slice(0, 10);
  }, [addSearch, local, allSkills]);

  const updateAssignment = (idx: number, patch: Partial<JobSkillAssignment>) => {
    setLocal(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const removeAssignment = (idx: number) => {
    setLocal(prev => prev.filter((_, i) => i !== idx));
  };

  const addSkill = (skill: Skill) => {
    setLocal(prev => [...prev, {
      skillId: skill.id,
      type: "supporting" as SkillAssignmentType,
      requiredProficiency: 3 as Proficiency,
      criticality: "important" as SkillCriticality,
      weight: 50,
      derivedFromTaskIds: [],
      source: "manual" as const,
    }]);
    setShowAdd(false);
    setAddSearch("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", justifyContent: "flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "relative", width: "min(520px, 100vw)", height: "100%",
        background: "var(--surface-1)", borderLeft: "1px solid var(--border)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Edit Skills — {jobTitle}</div>
            <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{local.length} skills assigned</div>
        </div>

        {/* Add skill */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}>
              <Plus size={14} /> Add skill
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <Search size={12} style={{ color: "var(--text-muted)" }} />
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search skills..." autoFocus
                  style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                <button onClick={() => { setShowAdd(false); setAddSearch(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}><X size={12} /></button>
              </div>
              {addResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 200, overflowY: "auto", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, marginTop: 4, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {addResults.map(s => (
                    <div key={s.id} onClick={() => addSkill(s)} style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <span style={{ color: "var(--text-primary)" }}>{s.name}</span>
                      <span style={{ ...chipStyle(IMPACT_COLORS[s.aiImpact]) }}>{s.aiImpact}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skill list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {local.map((a, idx) => {
            const skill = skillMap.get(a.skillId);
            if (!skill) return null;
            return (
              <div key={a.skillId} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{skill.name}</span>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <span style={{ ...chipStyle({ bg: skill.category === "technical" ? "#EFF6FF" : skill.category === "behavioral" ? "#EEEDFE" : "#FEF1E8", text: skill.category === "technical" ? "#1E3A8A" : skill.category === "behavioral" ? "#3C3489" : "#7C2D12" }) }}>{skill.category}</span>
                      <span style={{ ...chipStyle(IMPACT_COLORS[skill.aiImpact]) }}>{skill.aiImpact}</span>
                    </div>
                  </div>
                  <button onClick={() => removeAssignment(idx)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}><X size={14} /></button>
                </div>

                {/* Type selector */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                  {(["core", "supporting", "new", "declining", "obsolete"] as SkillAssignmentType[]).map(t => (
                    <button key={t} onClick={() => updateAssignment(idx, { type: t })}
                      style={{ padding: "3px 10px", fontSize: 10, fontWeight: a.type === t ? 700 : 500, borderRadius: 4, cursor: "pointer", border: a.type === t ? `1.5px solid ${TYPE_COLORS[t].text}` : "1px solid var(--border)", background: a.type === t ? TYPE_COLORS[t].bg : "transparent", color: a.type === t ? TYPE_COLORS[t].text : "var(--text-muted)" }}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Proficiency */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", width: 80 }}>Proficiency</span>
                  <input type="range" min={1} max={5} step={1} value={a.requiredProficiency}
                    onChange={e => updateAssignment(idx, { requiredProficiency: Number(e.target.value) as Proficiency })}
                    style={{ flex: 1, accentColor: "var(--accent-primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", width: 70, textAlign: "right" }}>{a.requiredProficiency} — {PROFICIENCY_LABELS[a.requiredProficiency]}</span>
                </div>

                {/* Criticality */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", width: 80 }}>Criticality</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["critical", "important", "useful"] as SkillCriticality[]).map(c => (
                      <button key={c} onClick={() => updateAssignment(idx, { criticality: c })}
                        style={{ padding: "2px 8px", fontSize: 10, fontWeight: a.criticality === c ? 700 : 400, borderRadius: 3, cursor: "pointer", border: a.criticality === c ? "1.5px solid var(--accent-primary)" : "1px solid var(--border)", background: a.criticality === c ? "rgba(59,130,246,0.08)" : "transparent", color: a.criticality === c ? "var(--accent-primary)" : "var(--text-muted)" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", width: 80 }}>Weight</span>
                  <input type="range" min={0} max={100} value={a.weight}
                    onChange={e => updateAssignment(idx, { weight: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "var(--accent-primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", width: 30, textAlign: "right" }}>{a.weight}</span>
                </div>

                {a.source && a.source !== "manual" && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: a.source === "rules" ? "#3B82F6" : "#8B5CF6" }} />
                    {a.source === "rules" ? "AI-suggested · review" : "AI-derived · low confidence · review carefully"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(local)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, background: "var(--accent-primary)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

function chipStyle(c: { bg: string; text: string }): React.CSSProperties {
  return { fontSize: 10, padding: "1px 6px", borderRadius: 3, background: c.bg, color: c.text, fontWeight: 500 };
}
