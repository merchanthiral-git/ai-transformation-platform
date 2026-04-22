"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus, Trash2, ChevronDown, Check, AlertTriangle,
  Users, Layers3, ArrowRight, Sparkles, Briefcase,
  FileText, Clock, GripVertical,
} from "@/lib/icons";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface SuccessCriterion {
  id: string; metric: string; target: string; baseline: string;
}

interface Stakeholder {
  id: string; role: string; name: string; contact: string;
}

interface ScopeItem {
  id: string; text: string;
}

interface ContextData {
  business_case: string;
  business_case_type: string;
  scope_in: ScopeItem[];
  scope_out: ScopeItem[];
  success_criteria: SuccessCriterion[];
  stakeholders: Stakeholder[];
  notes: string;
}

interface JobMeta {
  function: string;
  family: string;
  sub_family: string;
  track_code: string;
  level_code: string;
  incumbent_count?: number;
  hours_week?: number;
  skills?: string[];
}

interface Props {
  contextData: ContextData;
  jobMeta: JobMeta;
  showSources: boolean;
  onSave: (data: Partial<ContextData>) => void;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULTS & TEMPLATES
   ═══════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const CASE_TYPES = [
  { key: "capacity", label: "Capacity Freeing", template: "This role is being redesigned to free capacity from routine and automatable tasks, enabling the team to focus on higher-value analytical and strategic work." },
  { key: "cost", label: "Cost Reduction", template: "This role is being redesigned to reduce operating cost through automation of repetitive processes and consolidation of redundant activities." },
  { key: "skills", label: "Skills Pivot", template: "This role is being redesigned to shift the skill profile from operational/transactional capabilities toward analytical, digital, and advisory capabilities." },
  { key: "ai", label: "AI Augmentation", template: "This role is being redesigned to integrate AI and automation tools into the workflow, augmenting human judgment with machine-assisted analysis." },
  { key: "ma", label: "M&A Integration", template: "This role is being redesigned as part of the post-merger integration to harmonize overlapping functions and standardize processes across the combined organization." },
  { key: "other", label: "Other", template: "" },
];

const DEFAULT_SCOPE_IN: ScopeItem[] = [
  { id: uid(), text: "Task decomposition and work allocation" },
  { id: uid(), text: "Skill requirements and proficiency levels" },
  { id: uid(), text: "Automation and AI augmentation opportunities" },
];

const DEFAULT_SCOPE_OUT: ScopeItem[] = [
  { id: uid(), text: "Compensation and total rewards" },
  { id: uid(), text: "Individual performance management" },
];

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  grid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 } as React.CSSProperties,
  textarea: { width: "100%", padding: "10px 12px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", resize: "vertical" as const, outline: "none", fontFamily: "inherit", minHeight: 100, lineHeight: 1.6 } as React.CSSProperties,
  input: { width: "100%", padding: "7px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  inputSm: { flex: 1, padding: "6px 8px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  select: { width: "100%", padding: "7px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", appearance: "none" as const } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnDanger: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex" } as React.CSSProperties,
  metaCard: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 16 } as React.CSSProperties,
  metaRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  metaLabel: { color: "var(--text-muted)" } as React.CSSProperties,
  metaValue: { color: "var(--text-primary)", fontWeight: "var(--fw-medium)" } as React.CSSProperties,
  sourceBadge: { display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", fontSize: 11, background: "rgba(244,168,58,0.06)", border: "1px solid rgba(244,168,58,0.12)", borderRadius: 3, color: "var(--amber)", marginLeft: 6 } as React.CSSProperties,
  inherited: { borderLeft: "2px solid rgba(244,168,58,0.15)", paddingLeft: 8 } as React.CSSProperties,
  scopeItem: { display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "var(--surface-2)", borderRadius: 5, marginBottom: 4, fontSize: "var(--text-xs)" } as React.CSSProperties,
  criteriaRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" } as React.CSSProperties,
  stakeholderRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" } as React.CSSProperties,
  skillChip: { display: "inline-flex", padding: "2px 8px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", marginRight: 4, marginBottom: 3 } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageContext({ contextData, jobMeta, showSources, onSave, onStageCompletion }: Props) {
  const d = contextData || {};
  const [businessCase, setBusinessCase] = useState(d.business_case || "");
  const [caseType, setCaseType] = useState(d.business_case_type || "");
  const [scopeIn, setScopeIn] = useState<ScopeItem[]>(d.scope_in?.length ? d.scope_in : DEFAULT_SCOPE_IN);
  const [scopeOut, setScopeOut] = useState<ScopeItem[]>(d.scope_out?.length ? d.scope_out : DEFAULT_SCOPE_OUT);
  const [criteria, setCriteria] = useState<SuccessCriterion[]>(d.success_criteria?.length ? d.success_criteria : [{ id: uid(), metric: "Hours freed per week", target: "12", baseline: "0" }]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(d.stakeholders?.length ? d.stakeholders : [{ id: uid(), role: "Sponsor", name: "", contact: "" }]);
  const [notes, setNotes] = useState(d.notes || "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave on changes (debounced 800ms)
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const data: ContextData = {
        business_case: businessCase,
        business_case_type: caseType,
        scope_in: scopeIn,
        scope_out: scopeOut,
        success_criteria: criteria,
        stakeholders,
        notes,
      };
      onSave(data);
    }, 800);
  }, [businessCase, caseType, scopeIn, scopeOut, criteria, stakeholders, notes, onSave]);

  useEffect(() => { triggerSave(); }, [businessCase, caseType, scopeIn, scopeOut, criteria, stakeholders, notes]);

  // Stage completion: % of required sections filled
  useEffect(() => {
    let filled = 0;
    let total = 4;
    if (businessCase.trim()) filled++;
    if (scopeIn.some(s => s.text.trim())) filled++;
    if (criteria.some(c => c.metric.trim() && c.target.trim())) filled++;
    if (stakeholders.some(s => s.name.trim())) filled++;
    onStageCompletion(Math.round((filled / total) * 100));
  }, [businessCase, scopeIn, criteria, stakeholders, onStageCompletion]);

  // Template selection
  const handleCaseType = (type: string) => {
    setCaseType(type);
    const tpl = CASE_TYPES.find(c => c.key === type);
    if (tpl && tpl.template && !businessCase.trim()) {
      setBusinessCase(tpl.template);
    }
  };

  // Scope list management
  const addScopeIn = () => setScopeIn(prev => [...prev, { id: uid(), text: "" }]);
  const addScopeOut = () => setScopeOut(prev => [...prev, { id: uid(), text: "" }]);
  const updateScopeIn = (id: string, text: string) => setScopeIn(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  const updateScopeOut = (id: string, text: string) => setScopeOut(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  const removeScopeIn = (id: string) => setScopeIn(prev => prev.filter(s => s.id !== id));
  const removeScopeOut = (id: string) => setScopeOut(prev => prev.filter(s => s.id !== id));

  // Criteria management
  const addCriterion = () => setCriteria(prev => [...prev, { id: uid(), metric: "", target: "", baseline: "" }]);
  const updateCriterion = (id: string, field: keyof SuccessCriterion, value: string) =>
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCriterion = (id: string) => setCriteria(prev => prev.filter(c => c.id !== id));

  // Stakeholder management
  const addStakeholder = () => setStakeholders(prev => [...prev, { id: uid(), role: "", name: "", contact: "" }]);
  const updateStakeholder = (id: string, field: keyof Stakeholder, value: string) =>
    setStakeholders(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeStakeholder = (id: string) => setStakeholders(prev => prev.filter(s => s.id !== id));

  const m = jobMeta;

  return (
    <div style={S.grid}>
      {/* ── LEFT COLUMN (60%) ── */}
      <div>
        {/* Business Case */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <Briefcase size={14} /> Business Case
          </div>
          <div style={S.label}>Redesign Driver</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {CASE_TYPES.map(ct => (
              <button key={ct.key}
                style={{ padding: "4px 12px", fontSize: 11, fontWeight: caseType === ct.key ? "var(--fw-semi)" : "var(--fw-medium)", border: `1px solid ${caseType === ct.key ? "var(--amber)" : "var(--border)"}`, borderRadius: 14, background: caseType === ct.key ? "rgba(244,168,58,0.08)" : "var(--surface-2)", color: caseType === ct.key ? "var(--amber)" : "var(--text-muted)", cursor: "pointer" }}
                onClick={() => handleCaseType(ct.key)}>
                {ct.label}
              </button>
            ))}
          </div>
          <div style={S.label}>Business Case Narrative</div>
          <textarea style={S.textarea} value={businessCase} onChange={e => setBusinessCase(e.target.value)}
            placeholder="Why is this job being redesigned? What business outcome does this serve?" />
        </div>

        {/* Redesign Scope */}
        <div style={S.section}>
          <div style={S.sectionTitle}><FileText size={14} /> Redesign Scope</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* In scope */}
            <div>
              <div style={S.label}>In Scope</div>
              {scopeIn.map(item => (
                <div key={item.id} style={S.scopeItem}>
                  <Check size={10} style={{ color: "var(--sage)", flexShrink: 0 }} />
                  <input style={{ ...S.inputSm, border: "none", background: "transparent" }}
                    value={item.text} onChange={e => updateScopeIn(item.id, e.target.value)} placeholder="Scope item…" />
                  <button style={S.btnDanger} onClick={() => removeScopeIn(item.id)}><Trash2 size={10} /></button>
                </div>
              ))}
              <button style={S.btn} onClick={addScopeIn}><Plus size={10} /> Add</button>
            </div>
            {/* Out of scope */}
            <div>
              <div style={S.label}>Out of Scope</div>
              {scopeOut.map(item => (
                <div key={item.id} style={S.scopeItem}>
                  <AlertTriangle size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <input style={{ ...S.inputSm, border: "none", background: "transparent" }}
                    value={item.text} onChange={e => updateScopeOut(item.id, e.target.value)} placeholder="Excluded…" />
                  <button style={S.btnDanger} onClick={() => removeScopeOut(item.id)}><Trash2 size={10} /></button>
                </div>
              ))}
              <button style={S.btn} onClick={addScopeOut}><Plus size={10} /> Add</button>
            </div>
          </div>
        </div>

        {/* Success Criteria */}
        <div style={S.section}>
          <div style={S.sectionTitle}><Sparkles size={14} /> Success Criteria</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 28px", gap: 6, marginBottom: 6 }}>
            <div style={S.label}>Metric</div>
            <div style={S.label}>Target</div>
            <div style={S.label}>Baseline</div>
            <div />
          </div>
          {criteria.map(c => (
            <div key={c.id} style={S.criteriaRow}>
              <input style={{ ...S.inputSm, flex: 2 }} value={c.metric} onChange={e => updateCriterion(c.id, "metric", e.target.value)} placeholder="e.g. Hours freed per week" />
              <input style={{ ...S.inputSm, flex: 1, fontFamily: "var(--ff-mono)", textAlign: "center" }} value={c.target} onChange={e => updateCriterion(c.id, "target", e.target.value)} placeholder="12" />
              <input style={{ ...S.inputSm, flex: 1, fontFamily: "var(--ff-mono)", textAlign: "center" }} value={c.baseline} onChange={e => updateCriterion(c.id, "baseline", e.target.value)} placeholder="0" />
              <button style={S.btnDanger} onClick={() => removeCriterion(c.id)}><Trash2 size={10} /></button>
            </div>
          ))}
          <button style={S.btn} onClick={addCriterion}><Plus size={10} /> Add Criterion</button>
        </div>

        {/* Notes */}
        <div style={S.section}>
          <div style={S.label}>Working Notes</div>
          <textarea style={{ ...S.textarea, minHeight: 60 }} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Internal notes for this redesign — not shared with client" />
        </div>
      </div>

      {/* ── RIGHT COLUMN (40%) ── */}
      <div>
        {/* Current State Summary */}
        <div style={S.metaCard}>
          <div style={S.sectionTitle}>
            <Layers3 size={14} /> Current State Summary
          </div>
          {[
            ["Function", m.function],
            ["Family", m.family],
            ["Sub-Family", m.sub_family],
            ["Track / Level", `${m.track_code || "—"} ${m.level_code || ""}`],
          ].map(([label, value]) => (
            <div key={label as string} style={{ ...S.metaRow, ...(showSources ? S.inherited : {}) }}>
              <span style={S.metaLabel}>
                {label}
                {showSources && <span style={S.sourceBadge}>JA</span>}
              </span>
              <span style={S.metaValue}>{value || "—"}</span>
            </div>
          ))}
          {m.hours_week !== undefined && (
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Hours / Week</span>
              <span style={{ ...S.metaValue, fontFamily: "var(--ff-mono)" }}>{m.hours_week}</span>
            </div>
          )}
          {m.incumbent_count !== undefined && (
            <div style={S.metaRow}>
              <span style={S.metaLabel}>FTE Count</span>
              <span style={{ ...S.metaValue, fontFamily: "var(--ff-mono)" }}>{m.incumbent_count}</span>
            </div>
          )}
          {m.skills && m.skills.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={S.label}>Top Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {m.skills.slice(0, 8).map(skill => (
                  <span key={skill} style={S.skillChip}>{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stakeholders */}
        <div style={S.metaCard}>
          <div style={S.sectionTitle}><Users size={14} /> Stakeholders</div>
          {stakeholders.map(s => (
            <div key={s.id} style={S.stakeholderRow}>
              <input style={{ ...S.inputSm, maxWidth: 80 }} value={s.role} onChange={e => updateStakeholder(s.id, "role", e.target.value)} placeholder="Role" />
              <input style={S.inputSm} value={s.name} onChange={e => updateStakeholder(s.id, "name", e.target.value)} placeholder="Name" />
              <input style={{ ...S.inputSm, maxWidth: 120 }} value={s.contact} onChange={e => updateStakeholder(s.id, "contact", e.target.value)} placeholder="Email" />
              <button style={S.btnDanger} onClick={() => removeStakeholder(s.id)}><Trash2 size={10} /></button>
            </div>
          ))}
          <button style={S.btn} onClick={addStakeholder}><Plus size={10} /> Add Stakeholder</button>
        </div>
      </div>
    </div>
  );
}
