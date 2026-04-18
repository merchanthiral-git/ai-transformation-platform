"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Layers3, TrendingUp } from "@/lib/icons";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  ViewContext, COLORS,
  KpiCard, Card, Empty, Badge,
  TabBar, PageHeader, LoadingSkeleton,
  usePersisted, showToast, fmtNum,
} from "../shared";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type NodeStatus = "complete" | "in_progress" | "not_started";
type Track = "S" | "P" | "T" | "M" | "E";
const ALL_TRACKS: Track[] = ["S", "P", "T", "M", "E"];
const TRACK_LABELS: Record<Track, string> = { S: "Specialist", P: "Professional", T: "Technical", M: "Management", E: "Executive" };
const SWIM_LANES = ["entry", "mid", "senior"] as const;
type SwimLane = typeof SWIM_LANES[number];

interface TaxNode {
  id: string;
  name: string;
  definition: string;
  status: NodeStatus;
  level: "group" | "family" | "sub_family";
  parent_id: string | null;
  tracks?: Track[];
  children?: TaxNode[];
}

interface Theme {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface VerbEntry {
  verb: string;
  lane: SwimLane;
}

interface GeneratedBullet {
  id: string;
  theme: string;
  text: string;
  approved: boolean;
}

const STEPS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "taxonomy", label: "Taxonomy", icon: <Layers3 size={15} /> },
  { id: "themes", label: "Themes", icon: <TrendingUp size={15} /> },
  { id: "verbs", label: "Verbs", icon: "✏️" },
  { id: "generate", label: "Generate", icon: "⚡" },
  { id: "compose", label: "Compose", icon: "📄" },
];

const STATUS_COLOR: Record<NodeStatus, string> = {
  complete: "var(--success)",
  in_progress: "var(--warning)",
  not_started: "var(--text-muted)",
};

const ARCHETYPES = ["technology", "operations", "client_facing", "default"] as const;
const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6"];

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function JobContentAuthoring({ model, f }: { model: string; f: Filters }) {
  /* ── persisted state ── */
  const [activeStep, setActiveStep] = usePersisted<string>(`${model}_jca_step`, "taxonomy");
  const [selectedNodeId, setSelectedNodeId] = usePersisted<string>(`${model}_jca_node`, "");
  const [selectedTrack, setSelectedTrack] = usePersisted<string>(`${model}_jca_track`, "P");
  const [selectedLevel, setSelectedLevel] = usePersisted<string>(`${model}_jca_level`, "P3");

  /* ── local state ── */
  const [loading, setLoading] = useState(false);
  const [taxonomy, setTaxonomy] = useState<TaxNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editNode, setEditNode] = useState<TaxNode | null>(null);
  const [editDirty, setEditDirty] = useState(false);

  // Themes
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);

  // Verbs
  const [verbs, setVerbs] = useState<Record<string, VerbEntry[]>>({});
  const [verbsLoading, setVerbsLoading] = useState(false);
  const [newVerbText, setNewVerbText] = useState("");
  const [newVerbLane, setNewVerbLane] = useState<SwimLane>("entry");

  // Generate
  const [promptText, setPromptText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bullets, setBullets] = useState<GeneratedBullet[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Compose
  const [overviewText, setOverviewText] = useState("");
  const [endingText, setEndingText] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [composeData, setComposeData] = useState<Record<string, { overview: string; ending: string; bullets: GeneratedBullet[] }>>({});

  // New node creation
  const [addingAt, setAddingAt] = useState<{ parentId: string | null; level: "group" | "family" | "sub_family" } | null>(null);
  const [newNodeName, setNewNodeName] = useState("");

  /* ── derived ── */
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const find = (nodes: TaxNode[]): TaxNode | null => {
      for (const n of nodes) {
        if (n.id === selectedNodeId) return n;
        if (n.children) { const r = find(n.children); if (r) return r; }
      }
      return null;
    };
    return find(taxonomy);
  }, [taxonomy, selectedNodeId]);

  const selectedSubFamily = useMemo(() => {
    if (selectedNode?.level === "sub_family") return selectedNode;
    return null;
  }, [selectedNode]);

  const applicableTracks = useMemo(() => {
    return (selectedSubFamily?.tracks || []) as Track[];
  }, [selectedSubFamily]);

  const currentTrackVerbs = useMemo(() => {
    const key = `${selectedNodeId}_${selectedTrack}`;
    return verbs[key] || [];
  }, [verbs, selectedNodeId, selectedTrack]);

  const verbSet = useMemo(() => {
    const set = new Set<string>();
    Object.values(verbs).forEach(arr => arr.forEach(v => set.add(v.verb.toLowerCase())));
    return set;
  }, [verbs]);

  const themesReady = themes.length >= 5;
  const verbsReady = currentTrackVerbs.length >= 10;
  const canGenerate = themesReady && verbsReady;

  const finalizedLevels = useMemo(() => {
    return LEVELS.filter(l => {
      const d = composeData[l];
      return d && d.overview && d.ending && d.bullets.length > 0 && d.bullets.every(b => b.approved);
    });
  }, [composeData]);

  /* ── API: Load taxonomy ── */
  const loadTaxonomy = useCallback(async () => {
    setLoading(true);
    try {
      const data = await (api as Record<string, Function>).getJobContentTaxonomy(model, f);
      setTaxonomy(Array.isArray(data?.nodes) ? data.nodes : []);
    } catch (e) {
      console.error("[JCA] taxonomy load error", e);
      showToast("Failed to load taxonomy");
      setTaxonomy([]);
    } finally {
      setLoading(false);
    }
  }, [model, f]);

  useEffect(() => { if (model) loadTaxonomy(); }, [model, loadTaxonomy]);

  /* ── API: Load themes when sub-family changes ── */
  useEffect(() => {
    if (!selectedSubFamily) { setThemes([]); return; }
    setThemesLoading(true);
    (api as Record<string, Function>).getJobContentThemes(selectedSubFamily.id)
      .then((d: Record<string, unknown>) => setThemes(Array.isArray(d?.themes) ? d.themes as Theme[] : []))
      .catch(() => { showToast("Failed to load themes"); setThemes([]); })
      .finally(() => setThemesLoading(false));
  }, [selectedSubFamily?.id]);

  /* ── API: Load verbs when track/sub-family changes ── */
  useEffect(() => {
    if (!selectedSubFamily || !selectedTrack) return;
    const key = `${selectedSubFamily.id}_${selectedTrack}`;
    if (verbs[key]) return;
    setVerbsLoading(true);
    (api as Record<string, Function>).getJobContentVerbs(selectedSubFamily.id, selectedTrack)
      .then((d: Record<string, unknown>) => {
        setVerbs(prev => ({ ...prev, [key]: Array.isArray(d?.verbs) ? d.verbs as VerbEntry[] : [] }));
      })
      .catch(() => showToast("Failed to load verbs"))
      .finally(() => setVerbsLoading(false));
  }, [selectedSubFamily?.id, selectedTrack]);

  /* ── Handlers ── */
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectNode = useCallback((node: TaxNode) => {
    setSelectedNodeId(node.id);
    setEditNode({ ...node });
    setEditDirty(false);
  }, []);

  const saveNode = useCallback(async () => {
    if (!editNode) return;
    try {
      if (editNode.id.startsWith("new_")) {
        await (api as Record<string, Function>).createJobContentNode(model, editNode);
        showToast("Node created");
      } else {
        await (api as Record<string, Function>).updateJobContentNode(model, editNode.id, editNode);
        showToast("Node updated");
      }
      setEditDirty(false);
      loadTaxonomy();
    } catch {
      showToast("Failed to save node");
    }
  }, [editNode, model, loadTaxonomy]);

  const addNode = useCallback((parentId: string | null, level: "group" | "family" | "sub_family") => {
    setAddingAt({ parentId, level });
    setNewNodeName("");
  }, []);

  const confirmAddNode = useCallback(async () => {
    if (!addingAt || !newNodeName.trim()) return;
    try {
      await (api as Record<string, Function>).createJobContentNode(model, {
        name: newNodeName.trim(),
        definition: "",
        level: addingAt.level,
        parent_id: addingAt.parentId,
        status: "not_started",
        tracks: addingAt.level === "sub_family" ? ["P"] : undefined,
      });
      showToast("Node created");
      setAddingAt(null);
      setNewNodeName("");
      loadTaxonomy();
    } catch {
      showToast("Failed to create node");
    }
  }, [addingAt, newNodeName, model, loadTaxonomy]);

  const addTheme = useCallback(() => {
    if (themes.length >= 7) { showToast("Maximum 7 themes allowed"); return; }
    setThemes(prev => [...prev, { id: `theme_${Date.now()}`, name: "", description: "", order: prev.length }]);
  }, [themes.length]);

  const updateTheme = useCallback((idx: number, field: "name" | "description", val: string) => {
    setThemes(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  }, []);

  const moveTheme = useCallback((idx: number, dir: -1 | 1) => {
    setThemes(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((t, i) => ({ ...t, order: i }));
    });
  }, []);

  const removeTheme = useCallback((idx: number) => {
    setThemes(prev => prev.filter((_, i) => i !== idx).map((t, i) => ({ ...t, order: i })));
  }, []);

  const applyDefaultThemes = useCallback(async (archetype: string) => {
    if (!selectedSubFamily) return;
    try {
      const data = await (api as Record<string, Function>).getJobContentDefaultThemes?.(selectedSubFamily.id, archetype);
      if (data?.themes) setThemes(data.themes as Theme[]);
      showToast(`Applied ${archetype} defaults`);
    } catch {
      showToast("Failed to apply defaults");
    }
  }, [selectedSubFamily]);

  const addVerb = useCallback((lane: SwimLane, verb: string) => {
    if (!verb.trim() || !selectedSubFamily) return;
    const key = `${selectedSubFamily.id}_${selectedTrack}`;
    setVerbs(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { verb: verb.trim(), lane }],
    }));
  }, [selectedSubFamily, selectedTrack]);

  const removeVerb = useCallback((lane: SwimLane, verb: string) => {
    if (!selectedSubFamily) return;
    const key = `${selectedSubFamily.id}_${selectedTrack}`;
    setVerbs(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(v => !(v.verb === verb && v.lane === lane)),
    }));
  }, [selectedSubFamily, selectedTrack]);

  const applyDefaultVerbs = useCallback(async () => {
    if (!selectedSubFamily) return;
    try {
      const data = await (api as Record<string, Function>).getJobContentDefaultVerbs?.(selectedSubFamily.id, selectedTrack);
      if (data?.verbs) {
        const key = `${selectedSubFamily.id}_${selectedTrack}`;
        setVerbs(prev => ({ ...prev, [key]: data.verbs as VerbEntry[] }));
        showToast("Default verbs applied");
      }
    } catch {
      showToast("Failed to apply default verbs");
    }
  }, [selectedSubFamily, selectedTrack]);

  const buildPrompt = useCallback(async () => {
    if (!selectedSubFamily) return;
    try {
      const data = await (api as Record<string, Function>).buildJobContentPrompt(
        selectedSubFamily.id, { themes, verbs: currentTrackVerbs, track: selectedTrack, level: selectedLevel }
      );
      setPromptText(data?.prompt || "");
      showToast("Prompt built");
    } catch {
      showToast("Failed to build prompt");
    }
  }, [selectedSubFamily, themes, currentTrackVerbs, selectedTrack, selectedLevel]);

  const generateContent = useCallback(async () => {
    if (!selectedSubFamily || !promptText) return;
    setGenerating(true);
    try {
      const data = await (api as Record<string, Function>).generateJobContent(
        selectedSubFamily.id, { prompt: promptText, track: selectedTrack, level: selectedLevel }
      );
      const newBullets = Array.isArray(data?.bullets) ? (data.bullets as GeneratedBullet[]) : [];
      setBullets(newBullets);
      showToast(`Generated ${newBullets.length} bullets`);
    } catch {
      showToast("Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [selectedSubFamily, promptText, selectedTrack, selectedLevel]);

  const approveBullet = useCallback((id: string) => {
    setBullets(prev => prev.map(b => b.id === id ? { ...b, approved: true } : b));
  }, []);

  const updateBulletText = useCallback((id: string, text: string) => {
    setBullets(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  }, []);

  const saveCompose = useCallback(() => {
    setComposeData(prev => ({
      ...prev,
      [selectedLevel]: { overview: overviewText, ending: endingText, bullets },
    }));
    showToast(`Level ${selectedLevel} saved`);
  }, [selectedLevel, overviewText, endingText, bullets]);

  /* ═════════════════════════════════════════════════════
     Render helpers
     ═════════════════════════════════════════════════════ */

  const needsSubFamily = activeStep !== "taxonomy" && !selectedSubFamily;

  /* ── Stepper bar ── */
  const renderStepper = () => (
    <div style={{
      display: "flex", alignItems: "center", gap: 0, marginBottom: 24,
      background: "var(--surface-1)", borderRadius: 14, padding: "6px 8px",
      border: "1px solid var(--border)",
    }}>
      {STEPS.map((step, i) => {
        const isActive = activeStep === step.id;
        const stepIdx = STEPS.findIndex(s => s.id === activeStep);
        const isPast = i < stepIdx;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div style={{
                flex: "0 0 32px", height: 2, margin: "0 2px",
                background: isPast ? "var(--accent-primary)" : "var(--border)",
                borderRadius: 1,
              }} />
            )}
            <button
              onClick={() => setActiveStep(step.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 10, border: "none",
                cursor: "pointer", transition: "all 0.2s",
                background: isActive ? "var(--accent-primary)" : "transparent",
                color: isActive ? "#fff" : isPast ? "var(--accent-primary)" : "var(--text-muted)",
                fontWeight: isActive ? 700 : 500, fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 15 }}>{step.icon}</span>
              <span>{step.label}</span>
              {isPast && <span style={{ fontSize: 11, opacity: 0.7 }}>✓</span>}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ── Taxonomy tree node ── */
  const renderTreeNode = (node: TaxNode, depth: number = 0) => {
    const isSelected = selectedNodeId === node.id;
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 20;

    return (
      <div key={node.id}>
        <div
          onClick={() => selectNode(node)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", paddingLeft: 8 + indent,
            cursor: "pointer", borderRadius: 8, marginBottom: 2,
            background: isSelected ? "var(--accent-primary)" + "18" : "transparent",
            borderLeft: isSelected ? `3px solid var(--accent-primary)` : "3px solid transparent",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {hasChildren && (
            <button
              onClick={e => { e.stopPropagation(); toggleExpand(node.id); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 11, padding: 2, lineHeight: 1,
              }}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          )}
          {!hasChildren && <span style={{ width: 15 }} />}
          <span style={{
            flex: 1, fontSize: 13, fontWeight: isSelected ? 600 : 400,
            color: isSelected ? "var(--accent-primary)" : "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {node.name || "(unnamed)"}
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: STATUS_COLOR[node.status],
            flexShrink: 0,
          }} />
        </div>
        {isExpanded && hasChildren && node.children!.map(c => renderTreeNode(c, depth + 1))}
        {isExpanded && node.level === "group" && (
          <div style={{ paddingLeft: 8 + indent + 20, paddingTop: 2, paddingBottom: 4 }}>
            <button onClick={() => addNode(node.id, "family")} style={addBtnStyle}>+ Family</button>
          </div>
        )}
        {isExpanded && node.level === "family" && (
          <div style={{ paddingLeft: 8 + indent + 20, paddingTop: 2, paddingBottom: 4 }}>
            <button onClick={() => addNode(node.id, "sub_family")} style={addBtnStyle}>+ Sub-Family</button>
          </div>
        )}
      </div>
    );
  };

  /* ═════════════════════════════════════════════════════
     Step panels
     ═════════════════════════════════════════════════════ */

  const renderTaxonomy = () => (
    <div style={{ display: "flex", gap: 16, minHeight: 500 }}>
      {/* Left: Tree */}
      <div style={{
        width: 280, flexShrink: 0, background: "var(--surface-1)",
        borderRadius: 12, border: "1px solid var(--border)", padding: 12,
        overflowY: "auto", maxHeight: 600,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Taxonomy</span>
          <button onClick={() => addNode(null, "group")} style={addBtnStyle}>+ Group</button>
        </div>
        {loading && <LoadingSkeleton rows={5} />}
        {!loading && taxonomy.length === 0 && (
          <Empty
            text="No taxonomy defined yet. Start by adding a Group."
            icon={<Layers3 />}
            action="Add Group"
            onAction={() => addNode(null, "group")}
          />
        )}
        {taxonomy.map(n => renderTreeNode(n, 0))}
      </div>

      {/* Center: Edit form */}
      <div style={{
        flex: 1, background: "var(--surface-1)", borderRadius: 12,
        border: "1px solid var(--border)", padding: 20,
      }}>
        {addingAt && (
          <div style={{ marginBottom: 16, padding: 16, background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              New {addingAt.level.replace("_", "-")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newNodeName}
                onChange={e => setNewNodeName(e.target.value)}
                placeholder="Name..."
                style={inputStyle}
                autoFocus
              />
              <button onClick={confirmAddNode} style={primaryBtnStyle}>Create</button>
              <button onClick={() => setAddingAt(null)} style={secondaryBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {!editNode && !addingAt && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 14 }}>
            Select a node from the tree to edit
          </div>
        )}
        {editNode && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <Badge color={STATUS_COLOR[editNode.status]}>{editNode.status.replace("_", " ")}</Badge>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8, textTransform: "uppercase" }}>
                  {editNode.level.replace("_", " ")}
                </span>
              </div>
              <button onClick={saveNode} disabled={!editDirty} style={{
                ...primaryBtnStyle,
                opacity: editDirty ? 1 : 0.4,
                cursor: editDirty ? "pointer" : "default",
              }}>
                Save
              </button>
            </div>
            <label style={labelStyle}>Name</label>
            <input
              value={editNode.name}
              onChange={e => { setEditNode(prev => prev ? { ...prev, name: e.target.value } : prev); setEditDirty(true); }}
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: 16 }}>Definition</label>
            <textarea
              value={editNode.definition}
              onChange={e => { setEditNode(prev => prev ? { ...prev, definition: e.target.value } : prev); setEditDirty(true); }}
              rows={4}
              placeholder="2-6 sentences describing this node..."
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
            />
            {editNode.level === "sub_family" && (
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Applicable Tracks</label>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {ALL_TRACKS.map(t => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={(editNode.tracks || []).includes(t)}
                        onChange={e => {
                          const tracks = [...(editNode.tracks || [])];
                          if (e.target.checked) tracks.push(t);
                          else { const idx = tracks.indexOf(t); if (idx >= 0) tracks.splice(idx, 1); }
                          setEditNode(prev => prev ? { ...prev, tracks } : prev);
                          setEditDirty(true);
                        }}
                        style={{ accentColor: "var(--accent-primary)" }}
                      />
                      {t} - {TRACK_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderThemes = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Themes for: {selectedSubFamily?.name}
          </span>
          <span style={{
            fontSize: 12, padding: "2px 10px", borderRadius: 20,
            background: themesReady ? "var(--success)" + "20" : "var(--warning)" + "20",
            color: themesReady ? "var(--success)" : "var(--warning)",
            fontWeight: 600,
          }}>
            {themes.length} of 5-7 themes
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            onChange={e => { if (e.target.value) applyDefaultThemes(e.target.value); e.target.value = ""; }}
            style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "4px 8px" }}
          >
            <option value="">Apply Defaults...</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
          </select>
          <button onClick={addTheme} disabled={themes.length >= 7} style={{
            ...primaryBtnStyle,
            opacity: themes.length >= 7 ? 0.4 : 1,
          }}>
            + Add Theme
          </button>
        </div>
      </div>
      {themesLoading && <LoadingSkeleton rows={4} />}
      {!themesLoading && themes.length === 0 && (
        <Empty text="No themes yet. Add themes or apply defaults to get started." icon={<TrendingUp />} action="Add Theme" onAction={addTheme} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {themes.map((theme, idx) => (
          <div key={theme.id} style={{
            background: "var(--surface-1)", borderRadius: 12, padding: 16,
            border: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            {/* Reorder controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
              <button
                onClick={() => moveTheme(idx, -1)}
                disabled={idx === 0}
                style={{ ...iconBtnStyle, opacity: idx === 0 ? 0.3 : 1 }}
                title="Move up"
              >▲</button>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{idx + 1}</span>
              <button
                onClick={() => moveTheme(idx, 1)}
                disabled={idx === themes.length - 1}
                style={{ ...iconBtnStyle, opacity: idx === themes.length - 1 ? 0.3 : 1 }}
                title="Move down"
              >▼</button>
            </div>
            <div style={{ flex: 1 }}>
              <input
                value={theme.name}
                onChange={e => updateTheme(idx, "name", e.target.value)}
                placeholder="Theme name..."
                style={{ ...inputStyle, fontWeight: 600, marginBottom: 8 }}
              />
              <textarea
                value={theme.description}
                onChange={e => updateTheme(idx, "description", e.target.value)}
                placeholder="Theme description..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical", minHeight: 48 }}
              />
            </div>
            <button onClick={() => removeTheme(idx)} style={{ ...iconBtnStyle, color: "var(--risk)" }} title="Remove theme">✕</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVerbs = () => {
    const trackForVerbs = (applicableTracks.includes(selectedTrack as Track) ? selectedTrack : applicableTracks[0] || "P") as Track;

    return (
      <div>
        {/* Track tabs */}
        {applicableTracks.length > 1 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {applicableTracks.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTrack(t)}
                style={{
                  padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)",
                  background: selectedTrack === t ? "var(--accent-primary)" : "var(--surface-1)",
                  color: selectedTrack === t ? "#fff" : "var(--text-secondary)",
                  fontWeight: selectedTrack === t ? 700 : 400, fontSize: 13, cursor: "pointer",
                }}
              >
                {t} - {TRACK_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{
            fontSize: 12, padding: "2px 10px", borderRadius: 20,
            background: verbsReady ? "var(--success)" + "20" : "var(--warning)" + "20",
            color: verbsReady ? "var(--success)" : "var(--warning)",
            fontWeight: 600,
          }}>
            {currentTrackVerbs.length} verbs (target: 10-12)
          </span>
          <button onClick={applyDefaultVerbs} style={secondaryBtnStyle}>Apply Default Verbs</button>
        </div>

        {verbsLoading && <LoadingSkeleton rows={3} />}

        {/* Swim lanes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {SWIM_LANES.map(lane => {
            const laneVerbs = currentTrackVerbs.filter(v => v.lane === lane);
            return (
              <div key={lane} style={{
                background: "var(--surface-1)", borderRadius: 12, padding: 16,
                border: "1px solid var(--border)", minHeight: 200,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                  marginBottom: 12, textTransform: "capitalize",
                  borderBottom: "2px solid var(--accent-primary)", paddingBottom: 6,
                }}>
                  {lane} level
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6, fontSize: 11 }}>
                    ({laneVerbs.length})
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {laneVerbs.map(v => (
                    <span key={v.verb} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 20, fontSize: 12,
                      background: "var(--accent-primary)" + "18",
                      color: "var(--accent-primary)", fontWeight: 500,
                    }}>
                      {v.verb}
                      <button
                        onClick={() => removeVerb(lane, v.verb)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: 10, padding: 0,
                          lineHeight: 1, marginLeft: 2,
                        }}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    placeholder="Add verb..."
                    style={{ ...inputStyle, fontSize: 12, padding: "4px 8px", flex: 1 }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        addVerb(lane, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGenerate = () => (
    <div style={{ display: "grid", gridTemplateColumns: "clamp(180px, 15vw, 240px) 1fr clamp(240px, 20vw, 320px)", gap: 16, minHeight: 500 }}>
      {/* Left: Context summary */}
      <div style={{
        background: "var(--surface-1)", borderRadius: 12, padding: 16,
        border: "1px solid var(--border)", overflowY: "auto", maxHeight: 600,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Context</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Sub-Family</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          {selectedSubFamily?.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Definition</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
          {selectedSubFamily?.definition || "Not defined"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Themes ({themes.length})
        </div>
        {themes.map((t, i) => (
          <div key={t.id} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
            {i + 1}. {t.name || "(unnamed)"}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Verbs ({currentTrackVerbs.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {currentTrackVerbs.map(v => (
            <span key={`${v.verb}_${v.lane}`} style={{
              fontSize: 11, padding: "2px 6px", borderRadius: 10,
              background: "var(--surface-2)", color: "var(--text-muted)",
            }}>{v.verb}</span>
          ))}
        </div>
      </div>

      {/* Center: Prompt editor */}
      <div style={{
        background: "var(--surface-1)", borderRadius: 12, padding: 16,
        border: "1px solid var(--border)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "4px 8px" }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {applicableTracks.length > 1 && (
              <select value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)} style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "4px 8px" }}>
                {applicableTracks.map(t => <option key={t} value={t}>{t} - {TRACK_LABELS[t]}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={buildPrompt} style={secondaryBtnStyle}>Build Prompt</button>
            <button
              onClick={generateContent}
              disabled={!canGenerate || generating}
              style={{
                ...primaryBtnStyle,
                opacity: canGenerate && !generating ? 1 : 0.4,
                cursor: canGenerate && !generating ? "pointer" : "default",
              }}
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
        {!canGenerate && (
          <div style={{
            fontSize: 12, color: "var(--warning)", padding: "6px 12px", marginBottom: 8,
            background: "var(--warning)" + "12", borderRadius: 8,
          }}>
            {!themesReady && "Need at least 5 themes. "}
            {!verbsReady && `Need at least 10 verbs for track ${selectedTrack}.`}
          </div>
        )}
        <textarea
          ref={promptRef}
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          placeholder="Click 'Build Prompt' to auto-generate, or type your prompt here..."
          style={{
            ...inputStyle,
            flex: 1, minHeight: 300, resize: "vertical",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, lineHeight: 1.6,
          }}
        />
      </div>

      {/* Right: Generated output */}
      <div style={{
        background: "var(--surface-1)", borderRadius: 12, padding: 16,
        border: "1px solid var(--border)", overflowY: "auto", maxHeight: 600,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Generated Content
          {bullets.length > 0 && (
            <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6, fontSize: 11 }}>
              ({bullets.filter(b => b.approved).length}/{bullets.length} approved)
            </span>
          )}
        </div>
        {generating && <LoadingSkeleton rows={6} />}
        {!generating && bullets.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
            Generated bullets will appear here
          </div>
        )}
        {!generating && bullets.map(b => {
          const firstWord = b.text.split(/\s+/)[0]?.toLowerCase() || "";
          const verbCompliant = verbSet.has(firstWord);
          return (
            <div key={b.id} style={{
              marginBottom: 10, padding: 12, borderRadius: 10,
              background: b.approved ? "var(--success)" + "08" : "var(--surface-2)",
              border: `1px solid ${b.approved ? "var(--success)" + "40" : "var(--border)"}`,
            }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {b.theme}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: 14, lineHeight: "18px", flexShrink: 0,
                  color: verbCompliant ? "var(--success)" : "var(--warning)",
                }} title={verbCompliant ? "Verb compliant" : "First word not in verb library"}>
                  {verbCompliant ? "✓" : "⚠"}
                </span>
                <textarea
                  value={b.text}
                  onChange={e => updateBulletText(b.id, e.target.value)}
                  rows={2}
                  style={{
                    ...inputStyle, fontSize: 12, resize: "vertical",
                    minHeight: 36, lineHeight: 1.4,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!b.approved && (
                  <button onClick={() => approveBullet(b.id)} style={{
                    ...smallBtnStyle, color: "var(--success)", borderColor: "var(--success)" + "40",
                  }}>
                    Approve
                  </button>
                )}
                {b.approved && (
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>Approved</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCompose = () => {
    const current = composeData[selectedLevel];
    const currentOverview = overviewText || current?.overview || "";
    const currentEnding = endingText || current?.ending || "";
    const currentBullets = bullets.length > 0 ? bullets : (current?.bullets || []);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={selectedLevel} onChange={e => {
              const lv = e.target.value;
              setSelectedLevel(lv);
              const d = composeData[lv];
              if (d) { setOverviewText(d.overview); setEndingText(d.ending); setBullets(d.bullets); }
              else { setOverviewText(""); setEndingText(""); }
            }} style={{ ...inputStyle, width: "auto", fontSize: 13, padding: "6px 12px" }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span style={{
              fontSize: 12, color: "var(--text-muted)",
            }}>
              {finalizedLevels.length} of {LEVELS.length} levels finalized
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              style={secondaryBtnStyle}
            >
              {previewMode ? "Edit Mode" : "Preview as Document"}
            </button>
            <button onClick={saveCompose} style={primaryBtnStyle}>Save Level</button>
          </div>
        </div>

        {previewMode ? (
          /* Document preview */
          <div style={{
            background: "#fff", color: "#1a1a1a", borderRadius: 8, padding: "48px 64px",
            maxWidth: 800, margin: "0 auto", minHeight: 500,
            fontFamily: "'Georgia', serif", fontSize: 14, lineHeight: 1.8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#333" }}>
              {selectedSubFamily?.name} — Level {selectedLevel}
            </div>
            <div style={{ borderBottom: "2px solid #e0d5c8", marginBottom: 20, paddingBottom: 8 }} />
            {currentOverview && (
              <p style={{ marginBottom: 20 }}>{currentOverview}</p>
            )}
            {currentBullets.length > 0 && (
              <ul style={{ paddingLeft: 24, marginBottom: 20 }}>
                {currentBullets.map(b => (
                  <li key={b.id} style={{ marginBottom: 8 }}>{b.text}</li>
                ))}
              </ul>
            )}
            {currentEnding && (
              <p style={{ marginTop: 20, fontStyle: "italic", color: "#555" }}>{currentEnding}</p>
            )}
          </div>
        ) : (
          /* Edit mode */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Overview */}
            <div style={{
              background: "var(--surface-1)", borderRadius: 12, padding: 20,
              border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Overview Statement</span>
                <button onClick={() => showToast("Template saved")} style={smallBtnStyle}>Save Template</button>
              </div>
              <textarea
                value={currentOverview}
                onChange={e => setOverviewText(e.target.value)}
                placeholder="Write the overview statement for this level. Use {{sub_family}}, {{level}}, {{track}} as template variables..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
              />
            </div>

            {/* Core bullets (read-only here) */}
            <div style={{
              background: "var(--surface-1)", borderRadius: 12, padding: 20,
              border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
                Core Bullets
                <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6, fontSize: 11 }}>
                  (edit in Generate step)
                </span>
              </div>
              {currentBullets.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  No bullets generated yet. Use the Generate step to create content.
                </div>
              )}
              {currentBullets.map((b, i) => (
                <div key={b.id} style={{
                  padding: "8px 12px", marginBottom: 6, borderRadius: 8,
                  background: "var(--surface-2)", fontSize: 13, color: "var(--text-secondary)",
                  display: "flex", alignItems: "flex-start", gap: 8,
                  border: `1px solid ${b.approved ? "var(--success)" + "30" : "var(--border)"}`,
                }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0, paddingTop: 2 }}>{i + 1}.</span>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase" }}>{b.theme}</div>
                    <div>{b.text}</div>
                  </div>
                  {b.approved && <span style={{ color: "var(--success)", fontSize: 11, flexShrink: 0 }}>✓</span>}
                </div>
              ))}
            </div>

            {/* Ending */}
            <div style={{
              background: "var(--surface-1)", borderRadius: 12, padding: 20,
              border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Ending Statement</span>
                <button onClick={() => showToast("Template saved")} style={smallBtnStyle}>Save Template</button>
              </div>
              <textarea
                value={currentEnding}
                onChange={e => setEndingText(e.target.value)}
                placeholder="Write the ending statement for this level..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: 60, lineHeight: 1.6 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═════════════════════════════════════════════════════
     Main render
     ═════════════════════════════════════════════════════ */

  return (
    <div style={{ padding: 0 }}>
      {renderStepper()}

      {needsSubFamily ? (
        <div style={{
          background: "var(--surface-1)", borderRadius: 16, padding: 40,
          border: "1px solid var(--border)", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}><Layers3 size={32} /></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Select a Sub-Family First
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto", marginBottom: 16 }}>
            Go to the Taxonomy step and select a sub-family node to configure themes, verbs, and generate content.
          </div>
          <button onClick={() => setActiveStep("taxonomy")} style={primaryBtnStyle}>
            Go to Taxonomy
          </button>
        </div>
      ) : (
        <>
          {activeStep === "taxonomy" && renderTaxonomy()}
          {activeStep === "themes" && renderThemes()}
          {activeStep === "verbs" && renderVerbs()}
          {activeStep === "generate" && renderGenerate()}
          {activeStep === "compose" && renderCompose()}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared inline styles
   ═══════════════════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 10,
  border: "none",
  background: "var(--accent-primary)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text-secondary)",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.15s",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 11,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-muted)",
  fontSize: 10,
  padding: 2,
  lineHeight: 1,
};

const addBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px dashed var(--border)",
  borderRadius: 6,
  padding: "3px 10px",
  fontSize: 11,
  color: "var(--accent-primary)",
  cursor: "pointer",
  fontWeight: 500,
};

export default JobContentAuthoring;
