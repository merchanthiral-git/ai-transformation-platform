"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Save, AlertTriangle, Check, Layers, BookOpen } from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface SubFamily { id: string; name: string }
interface Family { id: string; name: string; sub_families: SubFamily[] }
interface FunctionGroup { id: string; name: string; families: Family[] }
interface Track { code: string; name: string; levels: string[] }
interface Grade { code: string; name: string; mapped_levels: string[] }
interface Dimension { id: string; name: string; description: string; sort_order: number }
interface CriteriaCell { track_code: string; level_code: string; dimension_id: string; criteria_text: string }
interface Archetype { id: string; name: string; track_code: string; level_code: string; family_id: string; description: string; responsibilities: string[]; is_anchor: boolean }

interface Framework {
  id: string;
  project_id: string;
  name: string;
  description: string;
  structure: { functions: FunctionGroup[] };
  tracks: { tracks: Track[] };
  grades: Grade[];
  dimensions?: Dimension[];
  criteria?: CriteriaCell[];
  archetypes?: Archetype[];
}

interface Props {
  model: string;
  projectId: string;
  onFrameworkReady?: (fw: Framework) => void;
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_TRACKS: Track[] = [
  { code: "S", name: "Support", levels: ["S1", "S2", "S3"] },
  { code: "P", name: "Professional", levels: ["P1", "P2", "P3", "P4", "P5", "P6"] },
  { code: "T", name: "Technical", levels: ["T3", "T4", "T5", "T6"] },
  { code: "M", name: "Management", levels: ["M1", "M2", "M3", "M4"] },
  { code: "E", name: "Executive", levels: ["E1", "E2", "E3"] },
];

const DEFAULT_DIMENSIONS: Omit<Dimension, "id">[] = [
  { name: "Scope of Impact", description: "Breadth and depth of influence on business outcomes", sort_order: 0 },
  { name: "Autonomy", description: "Degree of independent decision-making and self-direction", sort_order: 1 },
  { name: "Complexity", description: "Nature and difficulty of problems solved", sort_order: 2 },
  { name: "Influence", description: "Ability to shape decisions, strategy, and stakeholders", sort_order: 3 },
  { name: "Leadership", description: "People leadership, mentoring, and organizational impact", sort_order: 4 },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "24px 28px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } as React.CSSProperties,
  input: { flex: 1, padding: "6px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  inputSm: { width: 80, padding: "6px 8px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", textAlign: "center" as const } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#f4a83a", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnDanger: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, border: "none", borderRadius: 4, background: "transparent", color: "var(--text-muted)", cursor: "pointer" } as React.CSSProperties,
  chip: { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-secondary)" } as React.CSSProperties,
  indent: { marginLeft: 28 } as React.CSSProperties,
  indent2: { marginLeft: 56 } as React.CSSProperties,
  dimLabel: { fontSize: 11, fontWeight: "var(--fw-medium)", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" } as React.CSSProperties,
  tab: (active: boolean) => ({ padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", color: active ? "#f4a83a" : "var(--text-muted)", borderBottom: active ? "2px solid #f4a83a" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }) as React.CSSProperties,
  gridCell: { padding: "8px 10px", fontSize: "var(--text-xs)", color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 4, minHeight: 60, resize: "vertical" as const, width: "100%", outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  gridHeader: { padding: "8px 10px", fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.04em", background: "#161822", borderRadius: 4, textAlign: "center" as const } as React.CSSProperties,
  trackBadge: (code: string) => {
    const colors: Record<string, string> = { P: "#f4a83a", T: "#a78bb8", M: "#a78bb8", E: "#DC2626", S: "#14B8A6" };
    return { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 4, fontSize: 11, fontWeight: 700, color: "#fff", background: colors[code] || "var(--surface-2)" } as React.CSSProperties;
  },
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function FrameworkBuilder({ model, projectId, onFrameworkReady }: Props) {
  const [activeTab, setActiveTab] = useState<"structure" | "tracks" | "criteria" | "grades">("structure");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frameworkId, setFrameworkId] = useState("");
  const [name, setName] = useState("Client Framework");
  const [description, setDescription] = useState("");

  // Structure
  const [functions, setFunctions] = useState<FunctionGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Tracks & levels
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);

  // Level criteria
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [criteriaGrid, setCriteriaGrid] = useState<Record<string, string>>({});
  // key = `${track_code}|${level_code}|${dimension_id}`

  // Grades
  const [grades, setGrades] = useState<Grade[]>([]);

  // Load existing framework
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/ja/frameworks?project_id=${projectId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const fw = data[0];
          setFrameworkId(fw.id);
          setName(fw.name || "");
          setDescription(fw.description || "");
          setFunctions(fw.structure?.functions || []);
          setTracks(fw.tracks?.tracks || DEFAULT_TRACKS);
          setGrades(fw.grades || []);
          // Load full framework with dimensions + criteria
          const full = await apiFetch(`/api/ja/frameworks/${fw.id}`);
          const fullData = await full.json();
          if (fullData.dimensions) setDimensions(fullData.dimensions);
          if (fullData.criteria) {
            const grid: Record<string, string> = {};
            for (const c of fullData.criteria) {
              grid[`${c.track_code}|${c.level_code}|${c.dimension_id}`] = c.criteria_text;
            }
            setCriteriaGrid(grid);
          }
        }
      } catch { /* first use — no framework yet */ }
    })();
  }, [projectId]);

  // All levels across all tracks (for criteria grid columns)
  const allLevels = useMemo(() => {
    const result: { code: string; track: string }[] = [];
    for (const t of tracks) {
      for (const l of t.levels) result.push({ code: l, track: t.code });
    }
    return result;
  }, [tracks]);

  /* ── Structure management ── */

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addFunction = () => setFunctions(prev => [...prev, { id: uid(), name: "", families: [] }]);
  const addFamily = (funcId: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: [...f.families, { id: uid(), name: "", sub_families: [] }] } : f
  ));
  const addSubFamily = (funcId: string, famId: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: f.families.map(fam =>
      fam.id === famId ? { ...fam, sub_families: [...fam.sub_families, { id: uid(), name: "" }] } : fam
    )} : f
  ));

  const updateFunction = (id: string, name: string) => setFunctions(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  const updateFamily = (funcId: string, famId: string, name: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: f.families.map(fam => fam.id === famId ? { ...fam, name } : fam) } : f
  ));
  const updateSubFamily = (funcId: string, famId: string, sfId: string, name: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: f.families.map(fam =>
      fam.id === famId ? { ...fam, sub_families: fam.sub_families.map(sf => sf.id === sfId ? { ...sf, name } : sf) } : fam
    )} : f
  ));

  const removeFunction = (id: string) => setFunctions(prev => prev.filter(f => f.id !== id));
  const removeFamily = (funcId: string, famId: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: f.families.filter(fam => fam.id !== famId) } : f
  ));
  const removeSubFamily = (funcId: string, famId: string, sfId: string) => setFunctions(prev => prev.map(f =>
    f.id === funcId ? { ...f, families: f.families.map(fam =>
      fam.id === famId ? { ...fam, sub_families: fam.sub_families.filter(sf => sf.id !== sfId) } : fam
    )} : f
  ));

  /* ── Track management ── */

  const addTrack = () => setTracks(prev => [...prev, { code: "", name: "", levels: [] }]);
  const updateTrack = (idx: number, field: "code" | "name", value: string) =>
    setTracks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  const removeTrack = (idx: number) => setTracks(prev => prev.filter((_, i) => i !== idx));
  const addLevel = (idx: number) => setTracks(prev => prev.map((t, i) =>
    i === idx ? { ...t, levels: [...t.levels, ""] } : t
  ));
  const updateLevel = (tIdx: number, lIdx: number, value: string) =>
    setTracks(prev => prev.map((t, i) => i === tIdx ? { ...t, levels: t.levels.map((l, j) => j === lIdx ? value : l) } : t));
  const removeLevel = (tIdx: number, lIdx: number) =>
    setTracks(prev => prev.map((t, i) => i === tIdx ? { ...t, levels: t.levels.filter((_, j) => j !== lIdx) } : t));

  /* ── Dimension management ── */

  const addDimension = () => setDimensions(prev => [...prev, { id: uid(), name: "", description: "", sort_order: prev.length }]);
  const updateDimension = (id: string, field: "name" | "description", value: string) =>
    setDimensions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  const removeDimension = (id: string) => setDimensions(prev => prev.filter(d => d.id !== id));

  const seedDefaultDimensions = () => {
    if (dimensions.length > 0) return;
    setDimensions(DEFAULT_DIMENSIONS.map(d => ({ ...d, id: uid() })));
  };

  /* ── Grades ── */

  const addGrade = () => setGrades(prev => [...prev, { code: "", name: "", mapped_levels: [] }]);

  /* ── Save ── */

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body = {
        project_id: projectId, name, description,
        structure: { functions },
        tracks: { tracks },
        grades,
      };

      let fwId = frameworkId;
      if (fwId) {
        await apiFetch(`/api/ja/frameworks/${fwId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const res = await apiFetch("/api/ja/frameworks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        fwId = data.id;
        setFrameworkId(fwId);
      }

      // Save dimensions
      for (const dim of dimensions) {
        if (!dim.id.match(/^[a-z0-9]{8,}$/)) {
          // New dimension — create server-side
          const res = await apiFetch(`/api/ja/frameworks/${fwId}/dimensions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dim),
          });
          const created = await res.json();
          // Update local ID
          const oldId = dim.id;
          setDimensions(prev => prev.map(d => d.id === oldId ? { ...d, id: created.id } : d));
          // Update criteria grid keys
          setCriteriaGrid(prev => {
            const next: Record<string, string> = {};
            for (const [k, v] of Object.entries(prev)) {
              next[k.replace(oldId, created.id)] = v;
            }
            return next;
          });
        }
      }

      // Save criteria
      const criteriaBody = Object.entries(criteriaGrid)
        .filter(([, v]) => v.trim())
        .map(([key, text]) => {
          const [track_code, level_code, dimension_id] = key.split("|");
          return { track_code, level_code, dimension_id, criteria_text: text };
        });
      if (criteriaBody.length > 0) {
        await apiFetch(`/api/ja/frameworks/${fwId}/criteria`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(criteriaBody),
        });
      }

      // Seed default flag rules
      await apiFetch(`/api/ja/flag-rules/seed?project_id=${projectId}`, { method: "POST" });

      // Create default scenario if none exists
      const scRes = await apiFetch(`/api/ja/scenarios?project_id=${projectId}`);
      const scenarios = await scRes.json();
      if (Array.isArray(scenarios) && scenarios.length === 0) {
        await apiFetch("/api/ja/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId, name: "Primary", description: "Default scenario",
            framework_id: fwId, is_primary: true,
          }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onFrameworkReady?.({
        id: fwId, project_id: projectId, name, description,
        structure: { functions }, tracks: { tracks }, grades,
        dimensions, criteria: criteriaBody,
      } as Framework);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  }, [frameworkId, projectId, name, description, functions, tracks, grades, dimensions, criteriaGrid, onFrameworkReady]);

  /* ── RENDER ── */

  const totalFamilies = functions.reduce((s, f) => s + f.families.length, 0);
  const totalSubFamilies = functions.reduce((s, f) => s + f.families.reduce((s2, fam) => s2 + fam.sub_families.length, 0), 0);
  const totalLevels = tracks.reduce((s, t) => s + t.levels.length, 0);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.h2}>Framework Builder</h2>
          <div style={S.subtitle}>
            {functions.length} functions · {totalFamilies} families · {totalSubFamilies} sub-families · {tracks.length} tracks · {totalLevels} levels
          </div>
        </div>
        <button style={S.btnPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? <><Check size={13}/> Saved</> : <><Save size={13}/> Save Framework</>}
        </button>
      </div>

      {/* Name + Description */}
      <div style={{ ...S.section, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={S.dimLabel}>Framework Name</div>
            <input style={{ ...S.input, marginTop: 4 }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp Job Architecture 2026" />
          </div>
          <div style={{ flex: 2 }}>
            <div style={S.dimLabel}>Description</div>
            <input style={{ ...S.input, marginTop: 4 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this framework" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {(["structure", "tracks", "criteria", "grades"] as const).map(tab => (
          <button key={tab} style={S.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === "structure" ? "Hierarchy" : tab === "tracks" ? "Tracks & Levels" : tab === "criteria" ? "Level Criteria" : "Grades"}
          </button>
        ))}
      </div>

      {/* ── TAB: Structure ── */}
      {activeTab === "structure" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <Layers size={15} /> Function → Family → Sub-Family Hierarchy
          </div>
          {functions.map(func => (
            <div key={func.id} style={{ marginBottom: 12 }}>
              <div style={S.row}>
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }} onClick={() => toggle(func.id)}>
                  {expanded.has(func.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span style={{ ...S.dimLabel, width: 60 }}>Function</span>
                <input style={S.input} value={func.name} onChange={e => updateFunction(func.id, e.target.value)} placeholder="Function name" />
                <button style={S.btn} onClick={() => addFamily(func.id)}><Plus size={12} /> Family</button>
                <button style={S.btnDanger} onClick={() => removeFunction(func.id)}><Trash2 size={12} /></button>
              </div>
              {expanded.has(func.id) && func.families.map(fam => (
                <div key={fam.id} style={S.indent}>
                  <div style={S.row}>
                    <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }} onClick={() => toggle(fam.id)}>
                      {expanded.has(fam.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span style={{ ...S.dimLabel, width: 50 }}>Family</span>
                    <input style={S.input} value={fam.name} onChange={e => updateFamily(func.id, fam.id, e.target.value)} placeholder="Family name" />
                    <button style={S.btn} onClick={() => addSubFamily(func.id, fam.id)}><Plus size={12} /> Sub</button>
                    <button style={S.btnDanger} onClick={() => removeFamily(func.id, fam.id)}><Trash2 size={12} /></button>
                  </div>
                  {expanded.has(fam.id) && fam.sub_families.map(sf => (
                    <div key={sf.id} style={S.indent2}>
                      <div style={S.row}>
                        <GripVertical size={12} style={{ color: "var(--text-muted)" }} />
                        <span style={{ ...S.dimLabel, width: 65 }}>Sub-fam</span>
                        <input style={S.input} value={sf.name} onChange={e => updateSubFamily(func.id, fam.id, sf.id, e.target.value)} placeholder="Sub-family name" />
                        <button style={S.btnDanger} onClick={() => removeSubFamily(func.id, fam.id, sf.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <button style={S.btn} onClick={addFunction}><Plus size={12} /> Add Function</button>
        </div>
      )}

      {/* ── TAB: Tracks & Levels ── */}
      {activeTab === "tracks" && (
        <div style={S.section}>
          <div style={S.sectionTitle}><BookOpen size={15} /> Career Tracks & Valid Levels</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 }}>
            Define career tracks and which levels are valid for each track. Level dropdowns in the mapping grid will filter based on these definitions.
          </div>
          {tracks.map((track, tIdx) => (
            <div key={tIdx} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
              <div style={S.row}>
                <div style={S.trackBadge(track.code)}>{track.code || "?"}</div>
                <input style={{ ...S.input, maxWidth: 60 }} value={track.code} onChange={e => updateTrack(tIdx, "code", e.target.value.toUpperCase())} placeholder="Code" />
                <input style={{ ...S.input }} value={track.name} onChange={e => updateTrack(tIdx, "name", e.target.value)} placeholder="Track name" />
                <button style={S.btnDanger} onClick={() => removeTrack(tIdx)}><Trash2 size={12} /></button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 36 }}>
                {track.levels.map((level, lIdx) => (
                  <div key={lIdx} style={S.chip}>
                    <input style={{ width: 36, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 11, outline: "none", textAlign: "center" }}
                      value={level} onChange={e => updateLevel(tIdx, lIdx, e.target.value)} />
                    <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}
                      onClick={() => removeLevel(tIdx, lIdx)}>×</button>
                  </div>
                ))}
                <button style={{ ...S.chip, cursor: "pointer", borderStyle: "dashed" }} onClick={() => addLevel(tIdx)}>
                  <Plus size={10} /> Level
                </button>
              </div>
              <div style={{ marginLeft: 36, marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
                {track.code === "M" || track.code === "E" ? "✓ People manager track" : "Individual contributor track"}
              </div>
            </div>
          ))}
          <button style={S.btn} onClick={addTrack}><Plus size={12} /> Add Track</button>
        </div>
      )}

      {/* ── TAB: Level Criteria Grid ── */}
      {activeTab === "criteria" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <BookOpen size={15} /> Level Criteria Grid
            {dimensions.length === 0 && (
              <button style={{ ...S.btn, marginLeft: "auto" }} onClick={seedDefaultDimensions}>
                Load Default Dimensions
              </button>
            )}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 }}>
            Define what each level means across consistent dimensions. Every cell should answer: "What does a {"{level}"} look like on {"{dimension}"}?"
          </div>

          {/* Dimension list */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S.dimLabel, marginBottom: 8 }}>Dimensions</div>
            {dimensions.map(dim => (
              <div key={dim.id} style={{ ...S.row, marginBottom: 6 }}>
                <input style={{ ...S.input, maxWidth: 180 }} value={dim.name} onChange={e => updateDimension(dim.id, "name", e.target.value)} placeholder="Dimension name" />
                <input style={{ ...S.input }} value={dim.description} onChange={e => updateDimension(dim.id, "description", e.target.value)} placeholder="What this dimension measures" />
                <button style={S.btnDanger} onClick={() => removeDimension(dim.id)}><Trash2 size={12} /></button>
              </div>
            ))}
            <button style={S.btn} onClick={addDimension}><Plus size={12} /> Add Dimension</button>
          </div>

          {/* Grid: dimensions × levels */}
          {dimensions.length > 0 && allLevels.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 3, width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...S.gridHeader, minWidth: 120, textAlign: "left", paddingLeft: 12, color: "#fff" }}>Dimension</th>
                    {allLevels.map(l => (
                      <th key={l.code} style={{ ...S.gridHeader, minWidth: 120, color: "#fff" }}>
                        <div style={S.trackBadge(l.track)}>{l.track}</div>
                        <div style={{ marginTop: 2 }}>{l.code}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map(dim => (
                    <tr key={dim.id}>
                      <td style={{ padding: "8px 12px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", verticalAlign: "top", background: "var(--surface-1)", borderRadius: 4, border: "1px solid var(--border)" }}>
                        {dim.name}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontWeight: "normal" }}>{dim.description}</div>
                      </td>
                      {allLevels.map(l => {
                        const key = `${l.track}|${l.code}|${dim.id}`;
                        return (
                          <td key={key} style={{ verticalAlign: "top" }}>
                            <textarea
                              style={S.gridCell}
                              value={criteriaGrid[key] || ""}
                              onChange={e => setCriteriaGrid(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`${l.code} ${dim.name.toLowerCase()}…`}
                              rows={3}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Grades ── */}
      {activeTab === "grades" && (
        <div style={S.section}>
          <div style={S.sectionTitle}><Layers size={15} /> Client Grade Structure (Optional)</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 }}>
            Import the client's existing grade structure for reference during mapping. This is context, not a constraint — you can map roles to levels independently.
          </div>
          {grades.map((grade, idx) => (
            <div key={idx} style={S.row}>
              <input style={S.inputSm} value={grade.code} onChange={e => setGrades(prev => prev.map((g, i) => i === idx ? { ...g, code: e.target.value } : g))} placeholder="Code" />
              <input style={S.input} value={grade.name} onChange={e => setGrades(prev => prev.map((g, i) => i === idx ? { ...g, name: e.target.value } : g))} placeholder="Grade name" />
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", minWidth: 80 }}>Mapped levels:</div>
              <input style={S.input} value={grade.mapped_levels.join(", ")} onChange={e => setGrades(prev => prev.map((g, i) => i === idx ? { ...g, mapped_levels: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } : g))} placeholder="P3, P4, M2" />
              <button style={S.btnDanger} onClick={() => setGrades(prev => prev.filter((_, i) => i !== idx))}><Trash2 size={12} /></button>
            </div>
          ))}
          <button style={S.btn} onClick={addGrade}><Plus size={12} /> Add Grade</button>
        </div>
      )}
    </div>
  );
}
