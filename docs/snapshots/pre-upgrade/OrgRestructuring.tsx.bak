"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  ViewContext, COLORS,
  KpiCard, Card, Empty, Badge, InsightPanel,
  TabBar, PageHeader, LoadingSkeleton,
  NextStepBar, ContextStrip,
  usePersisted, showToast, JobDesignState, fmtNum,
} from "../shared";

/* ─── Types ─── */
type ReorgNode = {
  id: string; name: string; title: string; function: string;
  level: string; track: string; managerId: string;
  children: ReorgNode[]; comp: number; tenure: number;
  status: "current" | "added" | "eliminated" | "modified" | "moved";
  originalManagerId?: string;
  notes?: string;
};

type ChangeEntry = {
  id: string;
  type: "add" | "eliminate" | "modify" | "move";
  nodeId: string;
  before: Partial<ReorgNode>;
  after: Partial<ReorgNode>;
  timestamp: number;
};

type NoteEntry = {
  id?: string; job_title: string; note_text: string; source: string;
  category: string; skills?: { name: string; proficiency: number }[];
  status?: string; created_at?: string;
};

const TABS = [
  { id: "org", label: "Org View" },
  { id: "design", label: "Design" },
  { id: "compare", label: "Compare" },
  { id: "impact", label: "Impact" },
  { id: "notes", label: "Notes" },
];

const NOTE_CATEGORIES = [
  "skills_update", "role_clarification", "process_insight",
  "pain_point", "stakeholder_feedback", "other",
];

const AVG_COMP: Record<string, number> = {
  E5: 650000, E4: 450000, E3: 375000, E2: 310000, E1: 250000,
  M6: 225000, M5: 190000, M4: 155000, M3: 120000, M2: 95000, M1: 75000,
  P8: 340000, P7: 260000, P6: 218000, P5: 175000, P4: 142000, P3: 115000, P2: 95000, P1: 72000,
  T8: 360000, T7: 280000, T6: 235000, T5: 195000, T4: 162000, T3: 130000, T2: 105000, T1: 82000,
  S6: 90000, S5: 81000, S4: 73000, S3: 66000, S2: 57000, S1: 48000,
};

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0] || "").join("").toUpperCase().slice(0, 2);
}

function trackColor(track: string): string {
  const map: Record<string, string> = {
    M: "var(--accent-primary)", E: "var(--purple)", P: "var(--success)",
    T: "#0EA5E9", S: "var(--warning)",
  };
  return map[track] || "var(--text-muted)";
}

function cloneTree(node: ReorgNode): ReorgNode {
  return { ...node, children: node.children.map(c => cloneTree(c)) };
}

function flattenTree(node: ReorgNode): ReorgNode[] {
  return [node, ...node.children.flatMap(c => flattenTree(c))];
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function OrgRestructuring({ model, f, onBack, onNavigate, viewCtx, jobStates }: {
  model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void;
  viewCtx?: ViewContext; jobStates?: Record<string, JobDesignState>;
}) {
  /* ── All hooks at top ── */
  const [wfData, setWfData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = usePersisted("orgRestruc_tab", "org");
  const [selectedManager, setSelectedManager] = usePersisted<string>("orgRestruc_mgr", "");
  const [managerSearch, setManagerSearch] = useState("");
  const [changes, setChanges] = usePersisted<ChangeEntry[]>("orgRestruc_changes", []);
  const [scenarioName, setScenarioName] = usePersisted("orgRestruc_scenario", "");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [noteInput, setNoteInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveManagerId, setMoveManagerId] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  // Notes tab state
  const [notesSearch, setNotesSearch] = useState("");
  const [notesCategoryFilter, setNotesCategoryFilter] = useState("all");
  const [notesList, setNotesList] = useState<NoteEntry[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState<NoteEntry>({
    job_title: "", note_text: "", source: "", category: "other", skills: [],
  });
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState(3);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Data loading ── */
  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getOverview(model, f).then((d: unknown) => {
      const emps = ((d as any)?.employee_names || (d as any)?.employees || []) as Record<string, unknown>[];
      setWfData(emps);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [model, f.func, f.jf]);

  useEffect(() => {
    if (!model) return;
    api.getOrgDiagnostics(model, f).then(d => setOrgData(d as unknown as Record<string, unknown>)).catch(() => {});
  }, [model, f.func, f.jf]);

  // Load notes when tab is active
  useEffect(() => {
    if (activeTab !== "notes") return;
    setNotesLoading(true);
    api.getNotes(
      undefined,
      notesCategoryFilter === "all" ? undefined : notesCategoryFilter,
      notesSearch || undefined,
    )
      .then(d => {
        setNotesList(((d as any)?.notes || []) as NoteEntry[]);
        setNotesLoading(false);
      })
      .catch(() => setNotesLoading(false));
  }, [activeTab, notesCategoryFilter, notesSearch]);

  // Cmd+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setChanges(prev => {
          if (prev.length === 0) return prev;
          showToast("Change undone");
          return prev.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Derive employee list ── */
  const employees = useMemo(() => {
    if (!wfData || wfData.length === 0) return [];
    return wfData.map((e: any, i: number) => ({
      id: String(e.id || e.employee_id || e.emp_id || `emp_${i}`),
      name: String(e.name || e.employee_name || e.full_name || `Employee ${i + 1}`),
      title: String(e.title || e.job_title || e.role || ""),
      function: String(e.function || e.department || e.func || ""),
      level: String(e.level || e.career_level || e.grade || ""),
      track: String(e.track || e.career_track || "P").charAt(0).toUpperCase(),
      managerId: String(e.manager_id || e.manager || e.reports_to || ""),
      comp: Number(e.comp || e.compensation || e.salary || 0),
      tenure: Number(e.tenure || e.years || 0),
    }));
  }, [wfData]);

  /* ── Managers list ── */
  const managers = useMemo(() => {
    return employees.filter(e =>
      e.track === "M" || e.track === "E" || employees.some(x => x.managerId === e.id),
    );
  }, [employees]);

  const filteredManagers = useMemo(() => {
    if (!managerSearch) return managers.slice(0, 20);
    const q = managerSearch.toLowerCase();
    return managers
      .filter(m => m.name.toLowerCase().includes(q) || m.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [managers, managerSearch]);

  /* ── Build org tree ── */
  const buildTree = useCallback((rootId: string): ReorgNode | null => {
    const emp = employees.find(e => e.id === rootId);
    if (!emp) return null;
    const directs = employees.filter(e => e.managerId === rootId);
    const node: ReorgNode = {
      id: emp.id, name: emp.name, title: emp.title, function: emp.function,
      level: emp.level, track: emp.track, managerId: emp.managerId,
      comp: emp.comp || AVG_COMP[emp.level] || 85000, tenure: emp.tenure,
      status: "current", children: [],
    };
    node.children = directs.map(d => buildTree(d.id)!).filter(Boolean);
    return node;
  }, [employees]);

  const currentTree = useMemo(() => {
    if (!selectedManager) return null;
    return buildTree(selectedManager);
  }, [selectedManager, buildTree]);

  /* ── Future tree (current + applied changes) ── */
  const futureTree = useMemo(() => {
    if (!currentTree) return null;
    const tree = cloneTree(currentTree);
    const allNodes = flattenTree(tree);

    for (const ch of changes) {
      if (ch.type === "eliminate") {
        const node = allNodes.find(n => n.id === ch.nodeId);
        if (node) node.status = "eliminated";
      } else if (ch.type === "modify") {
        const node = allNodes.find(n => n.id === ch.nodeId);
        if (node) {
          if (ch.after.title) node.title = ch.after.title;
          if (ch.after.level) node.level = ch.after.level;
          node.status = "modified";
        }
      } else if (ch.type === "move") {
        const node = allNodes.find(n => n.id === ch.nodeId);
        if (node) {
          node.status = "moved";
          node.originalManagerId = ch.before.managerId;
        }
      } else if (ch.type === "add") {
        const parent = allNodes.find(n => n.id === ch.after.managerId);
        if (parent) {
          const newNode: ReorgNode = {
            id: ch.nodeId, name: ch.after.name || "New Role",
            title: ch.after.title || "TBD", function: parent.function,
            level: ch.after.level || "P3", track: (ch.after.level || "P3").charAt(0),
            managerId: parent.id, children: [], comp: AVG_COMP[ch.after.level || "P3"] || 85000,
            tenure: 0, status: "added",
          };
          parent.children.push(newNode);
          allNodes.push(newNode);
        }
      }
    }
    return tree;
  }, [currentTree, changes]);

  /* ── Metrics ── */
  const currentMetrics = useMemo(() => {
    if (!currentTree) return { hc: 0, directs: 0, avgTenure: 0, functions: new Set<string>(), levelDist: {} as Record<string, number> };
    const flat = flattenTree(currentTree);
    const funcs = new Set(flat.map(n => n.function).filter(Boolean));
    const levelDist: Record<string, number> = {};
    flat.forEach(n => { levelDist[n.track] = (levelDist[n.track] || 0) + 1; });
    return {
      hc: flat.length,
      directs: currentTree.children.length,
      avgTenure: flat.length > 0 ? flat.reduce((s, n) => s + n.tenure, 0) / flat.length : 0,
      functions: funcs,
      levelDist,
    };
  }, [currentTree]);

  const futureMetrics = useMemo(() => {
    if (!futureTree) return { hc: 0, eliminated: 0, added: 0, net: 0, costImpact: 0 };
    const flat = flattenTree(futureTree);
    const eliminated = flat.filter(n => n.status === "eliminated").length;
    const added = flat.filter(n => n.status === "added").length;
    const costElim = flat.filter(n => n.status === "eliminated").reduce((s, n) => s + (n.comp || AVG_COMP[n.level] || 85000), 0);
    const costAdd = flat.filter(n => n.status === "added").reduce((s, n) => s + (n.comp || AVG_COMP[n.level] || 85000), 0);
    return {
      hc: flat.filter(n => n.status !== "eliminated").length,
      eliminated, added, net: added - eliminated,
      costImpact: costAdd - costElim,
    };
  }, [futureTree]);

  /* ── Callbacks ── */
  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleEliminate = useCallback((node: ReorgNode) => {
    setChanges(prev => [...prev, {
      id: `ch_${Date.now()}`, type: "eliminate", nodeId: node.id,
      before: { title: node.title, level: node.level },
      after: {}, timestamp: Date.now(),
    }]);
    showToast(`${node.name} marked for elimination`);
  }, []);

  const handleAddReport = useCallback((parentId: string) => {
    const newId = `new_${Date.now()}`;
    setChanges(prev => [...prev, {
      id: `ch_${Date.now()}`, type: "add", nodeId: newId,
      before: {},
      after: { managerId: parentId, name: "New Role", title: "TBD", level: "P3" },
      timestamp: Date.now(),
    }]);
    showToast("New report added");
  }, []);

  const handleStartEdit = useCallback((node: ReorgNode) => {
    setEditingNode(node.id);
    setEditTitle(node.title);
    setEditLevel(node.level);
  }, []);

  const handleSaveEdit = useCallback((node: ReorgNode) => {
    if (editTitle !== node.title || editLevel !== node.level) {
      setChanges(prev => [...prev, {
        id: `ch_${Date.now()}`, type: "modify", nodeId: node.id,
        before: { title: node.title, level: node.level },
        after: { title: editTitle, level: editLevel },
        timestamp: Date.now(),
      }]);
    }
    setEditingNode(null);
  }, [editTitle, editLevel]);

  const handleMoveNode = useCallback((nodeId: string, newMgrId: string) => {
    const flat = currentTree ? flattenTree(currentTree) : [];
    const node = flat.find(n => n.id === nodeId);
    if (!node) return;
    setChanges(prev => [...prev, {
      id: `ch_${Date.now()}`, type: "move", nodeId,
      before: { managerId: node.managerId },
      after: { managerId: newMgrId },
      timestamp: Date.now(),
    }]);
    setMoveTarget(null);
    setMoveManagerId("");
    showToast(`${node.name} moved`);
  }, [currentTree]);

  const handleSaveNote = useCallback((_nodeId: string, text: string) => {
    setNoteInput(null);
    setNoteText("");
    showToast("Note saved");
  }, []);

  const handleSaveScenario = useCallback(async () => {
    if (!scenarioName.trim()) { showToast("Enter a scenario name"); return; }
    try {
      await api.saveReorgScenario({
        model_id: model, name: scenarioName,
        changes, manager_id: selectedManager,
        created_at: new Date().toISOString(),
      });
      showToast("Scenario saved successfully");
    } catch { showToast("Failed to save scenario"); }
  }, [model, scenarioName, changes, selectedManager]);

  const handleCreateNote = useCallback(async () => {
    if (!newNote.job_title.trim() || !newNote.note_text.trim()) {
      showToast("Job title and note text are required");
      return;
    }
    try {
      await api.createNote(newNote as unknown as Record<string, unknown>);
      showToast("Note created");
      setNewNote({ job_title: "", note_text: "", source: "", category: "other", skills: [] });
      try {
        const d = await api.getNotes();
        setNotesList(((d as any)?.notes || []) as NoteEntry[]);
      } catch { /* list refresh optional */ }
    } catch { showToast("Failed to create note"); }
  }, [newNote]);

  const handleConfirmNote = useCallback(async (noteId: string) => {
    try {
      await api.confirmNote(noteId);
      showToast("Note confirmed");
      setNotesList(prev => prev.map(n => n.id === noteId ? { ...n, status: "confirmed" } : n));
    } catch { showToast("Failed to confirm note"); }
  }, []);

  const handleRejectNote = useCallback(async (noteId: string) => {
    try {
      await api.updateNote(noteId, { status: "rejected" });
      showToast("Note rejected");
      setNotesList(prev => prev.map(n => n.id === noteId ? { ...n, status: "rejected" } : n));
    } catch { showToast("Failed to reject note"); }
  }, []);

  const addSkillToNote = useCallback(() => {
    if (!newSkillName.trim()) return;
    setNewNote(prev => ({
      ...prev,
      skills: [...(prev.skills || []), { name: newSkillName.trim(), proficiency: newSkillProf }],
    }));
    setNewSkillName("");
    setNewSkillProf(3);
  }, [newSkillName, newSkillProf]);

  /* ── Conditional returns (after all hooks) ── */
  if (loading) return (
    <div style={{ padding: 32 }}>
      <PageHeader icon="🔄" title="Org Restructuring" subtitle="Loading workforce data..." onBack={onBack} />
      <LoadingSkeleton rows={6} />
    </div>
  );

  if (!wfData || wfData.length === 0) return (
    <div style={{ padding: 32 }}>
      <PageHeader icon="🔄" title="Org Restructuring" subtitle="Reshape your organization" onBack={onBack} />
      <Empty icon="🔄" text="Org Restructuring Requires Workforce Data" subtitle="Upload workforce data with employee names, titles, and manager IDs to use the restructuring tool." action="Go to Overview" onAction={() => onNavigate?.("dashboard")} />
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     RENDERING HELPERS
     ═══════════════════════════════════════════════════════════════ */

  const statusBorder = (s: ReorgNode["status"]) => {
    switch (s) {
      case "added": return "var(--success)";
      case "eliminated": return "var(--risk)";
      case "modified": return "var(--warning)";
      case "moved": return "#0EA5E9";
      default: return "transparent";
    }
  };

  const statusBadge = (s: ReorgNode["status"]) => {
    switch (s) {
      case "added": return <Badge color="green">NEW</Badge>;
      case "eliminated": return <Badge color="red">ELIMINATED</Badge>;
      case "modified": return <Badge color="amber">MODIFIED</Badge>;
      case "moved": return <Badge color="teal">MOVED</Badge>;
      default: return null;
    }
  };

  /* ── Tree renderer ── */
  const renderTree = (node: ReorgNode, depth: number, editable: boolean, useFutureStatus = false) => {
    const expanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEliminated = node.status === "eliminated" || changes.some(c => c.type === "eliminate" && c.nodeId === node.id);
    const isModified = changes.some(c => c.type === "modify" && c.nodeId === node.id);
    const displayTitle = isModified
      ? (changes.find(c => c.type === "modify" && c.nodeId === node.id)?.after.title || node.title)
      : node.title;
    const displayLevel = isModified
      ? (changes.find(c => c.type === "modify" && c.nodeId === node.id)?.after.level || node.level)
      : node.level;
    const nodeStatus = useFutureStatus
      ? node.status
      : (isEliminated ? "eliminated" : isModified ? "modified" : node.status);

    return (
      <div key={node.id}>
        <div
          className="group flex items-center gap-3 py-2 px-3 rounded-xl transition-colors"
          style={{
            marginLeft: depth * 28,
            borderLeft: `3px solid ${statusBorder(nodeStatus)}`,
            background: nodeStatus !== "current" ? "rgba(255,255,255,0.02)" : "transparent",
            opacity: isEliminated ? 0.5 : 1,
          }}
        >
          {/* Chevron */}
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] text-xs flex-shrink-0"
            style={{ visibility: hasChildren ? "visible" : "hidden", cursor: hasChildren ? "pointer" : "default" }}
          >
            {expanded ? "▼" : "▶"}
          </button>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${trackColor(node.track)}22`, color: trackColor(node.track), border: `1.5px solid ${trackColor(node.track)}40` }}
          >
            {getInitials(node.name)}
          </div>

          {/* Name & title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold text-[var(--text-primary)] truncate"
                style={{ textDecoration: isEliminated ? "line-through" : "none" }}
              >
                {node.name}
              </span>
              {nodeStatus !== "current" && statusBadge(nodeStatus)}
            </div>
            {editingNode === node.id && editable ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] outline-none w-40"
                  value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title"
                />
                <input
                  className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] outline-none w-16"
                  value={editLevel} onChange={e => setEditLevel(e.target.value)} placeholder="Level"
                />
                <button onClick={() => handleSaveEdit(node)} className="text-xs text-[var(--success)] font-semibold">Save</button>
                <button onClick={() => setEditingNode(null)} className="text-xs text-[var(--text-muted)]">Cancel</button>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-secondary)] truncate block" style={{ textDecoration: isEliminated ? "line-through" : "none" }}>
                {displayTitle}
              </span>
            )}
          </div>

          {/* Level badge */}
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ color: trackColor(node.track), background: `${trackColor(node.track)}18` }}
          >
            {displayLevel}
          </span>

          {/* Function */}
          <span className="text-xs text-[var(--text-muted)] w-24 truncate text-right flex-shrink-0 hidden sm:block">
            {node.function}
          </span>

          {/* Actions (editable only) */}
          {editable && !isEliminated && editingNode !== node.id && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => handleStartEdit(node)} title="Edit" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-xs">✏️</button>
              <button onClick={() => handleEliminate(node)} title="Eliminate" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-xs">❌</button>
              <button onClick={() => handleAddReport(node.id)} title="Add Report" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-xs">➕</button>
              <button onClick={() => { setNoteInput(node.id); setNoteText(node.notes || ""); }} title="Notes" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-xs">📋</button>
              <button onClick={() => { setMoveTarget(node.id); setMoveManagerId(""); }} title="Move" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-xs">↕️</button>
            </div>
          )}
        </div>

        {/* Note input inline */}
        {noteInput === node.id && (
          <div className="flex items-center gap-2" style={{ marginLeft: depth * 28 + 48, marginTop: 4, marginBottom: 8 }}>
            <input
              className="text-xs px-2 py-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] outline-none flex-1"
              value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..."
            />
            <button onClick={() => handleSaveNote(node.id, noteText)} className="text-xs text-[var(--success)] font-semibold">Save</button>
            <button onClick={() => setNoteInput(null)} className="text-xs text-[var(--text-muted)]">Cancel</button>
          </div>
        )}

        {/* Move dropdown inline */}
        {moveTarget === node.id && (
          <div className="flex items-center gap-2" style={{ marginLeft: depth * 28 + 48, marginTop: 4, marginBottom: 8 }}>
            <select
              className="text-xs px-2 py-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] outline-none flex-1"
              value={moveManagerId} onChange={e => setMoveManagerId(e.target.value)}
            >
              <option value="">Select new manager...</option>
              {managers.filter(m => m.id !== node.id).map(m => (
                <option key={m.id} value={m.id}>{m.name} - {m.title}</option>
              ))}
            </select>
            <button
              onClick={() => moveManagerId && handleMoveNode(node.id, moveManagerId)}
              className="text-xs text-[var(--success)] font-semibold" disabled={!moveManagerId}
            >Move</button>
            <button onClick={() => setMoveTarget(null)} className="text-xs text-[var(--text-muted)]">Cancel</button>
          </div>
        )}

        {/* Children */}
        {expanded && node.children.map(child => renderTree(child, depth + 1, editable, useFutureStatus))}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     TAB 1 — ORG VIEW
     ═══════════════════════════════════════════════════════════════ */
  const renderOrgView = () => (
    <div className="flex gap-6">
      {/* Left column */}
      <div className="flex-1 min-w-0">
        <Card title="Select Manager">
          <div className="relative" ref={dropdownRef}>
            <input
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              placeholder="Search by name or title..."
              value={managerSearch}
              onChange={e => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
              onFocus={() => setShowManagerDropdown(true)}
            />
            {showManagerDropdown && filteredManagers.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-lg max-h-64 overflow-y-auto" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {filteredManagers.map(m => (
                  <button
                    key={m.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--hover)] flex items-center gap-3 transition-colors"
                    onClick={() => {
                      setSelectedManager(m.id);
                      setManagerSearch(m.name);
                      setShowManagerDropdown(false);
                      setExpandedNodes(new Set([m.id]));
                    }}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${trackColor(m.track)}22`, color: trackColor(m.track) }}>
                      {getInitials(m.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{m.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{m.title} / {m.level}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {currentTree ? (
          <Card title={`${currentTree.name}'s Organization`}>
            <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
              {renderTree(currentTree, 0, false)}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent-primary)" }}
                onClick={() => setActiveTab("design")}
              >
                Start Restructuring
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-16 text-[var(--text-muted)]">
              <div className="text-4xl mb-3 opacity-40">👤</div>
              <div className="text-sm">Select a manager to view their organization</div>
            </div>
          </Card>
        )}
      </div>

      {/* Right: summary stats */}
      {currentTree && (
        <div className="w-72 flex-shrink-0 space-y-4">
          <Card title="Organization Summary">
            <div className="space-y-4">
              {[
                ["Total Headcount", fmtNum(currentMetrics.hc, "headcount")],
                ["Direct Reports", String(currentMetrics.directs)],
                ["Avg Tenure", `${currentMetrics.avgTenure.toFixed(1)}y`],
                ["Functions", String(currentMetrics.functions.size)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-bold font-data text-[var(--text-primary)]">{val}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Track Distribution">
            <div className="space-y-2">
              {Object.entries(currentMetrics.levelDist).sort((a, b) => b[1] - a[1]).map(([track, count]) => (
                <div key={track} className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono w-6" style={{ color: trackColor(track) }}>{track}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, (count / currentMetrics.hc) * 100)}%`, background: trackColor(track), opacity: 0.7 }} />
                  </div>
                  <span className="text-xs font-data text-[var(--text-secondary)] w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Functions Represented">
            <div className="flex flex-wrap gap-1.5">
              {Array.from(currentMetrics.functions).map(fn => <Badge key={fn} color="gray">{fn}</Badge>)}
              {currentMetrics.functions.size === 0 && <span className="text-xs text-[var(--text-muted)]">No function data</span>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 2 — DESIGN
     ═══════════════════════════════════════════════════════════════ */
  const renderDesign = () => {
    if (!currentTree) return <Card><Empty icon="👤" text="Select a manager in the Org View tab first to begin restructuring" /></Card>;

    return (
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <Card title="Org Design Canvas">
            <div className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-4">
              <span>Hover a node for actions</span>
              <span className="font-data" style={{ color: "var(--accent-primary)" }}>Cmd+Z to undo</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
              {renderTree(currentTree, 0, true)}
            </div>
          </Card>

          {/* Save scenario */}
          <Card title="Save Scenario">
            <div className="flex items-center gap-3">
              <input
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Scenario name..." value={scenarioName} onChange={e => setScenarioName(e.target.value)}
              />
              <button onClick={handleSaveScenario} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent-primary)" }}>
                Save Scenario
              </button>
            </div>
          </Card>

          {/* Changes log */}
          {changes.length > 0 && (
            <Card title={`Changes (${changes.length})`}>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {changes.map((ch, i) => (
                  <div key={ch.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                    <Badge color={ch.type === "add" ? "green" : ch.type === "eliminate" ? "red" : ch.type === "modify" ? "amber" : "teal"}>
                      {ch.type.toUpperCase()}
                    </Badge>
                    <span className="text-[var(--text-secondary)] flex-1 truncate">
                      {ch.type === "add" ? `Add "${ch.after.title || "role"}" under ${ch.after.managerId}`
                        : ch.type === "eliminate" ? `Eliminate "${ch.before.title}"`
                        : ch.type === "modify" ? `"${ch.before.title}" → "${ch.after.title || ch.before.title}"`
                        : `Move node ${ch.nodeId}`}
                    </span>
                    <button onClick={() => setChanges(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Live metrics */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <Card title="Live Metrics">
            <div className="space-y-3">
              {[
                ["Current HC", currentMetrics.hc, "var(--text-primary)"],
                ["Eliminated", futureMetrics.eliminated, "var(--risk)"],
                ["Added", futureMetrics.added, "var(--success)"],
              ].map(([label, val, color]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{label as string}</span>
                  <span className="font-bold font-data" style={{ color: color as string }}>{val as number}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border)] flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Net Change</span>
                <span className={`font-bold font-data ${futureMetrics.net >= 0 ? "text-[var(--success)]" : "text-[var(--risk)]"}`}>
                  {futureMetrics.net >= 0 ? "+" : ""}{futureMetrics.net}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Future HC</span>
                <span className="font-bold font-data text-[var(--text-primary)]">{futureMetrics.hc}</span>
              </div>
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Cost Impact</span>
                  <span className={`font-bold font-data ${futureMetrics.costImpact <= 0 ? "text-[var(--success)]" : "text-[var(--risk)]"}`}>
                    {fmtNum(Math.abs(futureMetrics.costImpact), "currency")}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] text-right mt-0.5">
                  {futureMetrics.costImpact <= 0 ? "savings" : "increase"}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     TAB 3 — COMPARE
     ═══════════════════════════════════════════════════════════════ */
  const renderCompare = () => {
    if (!currentTree || !futureTree) return <Card><Empty icon="⚖️" text="Select a manager and make design changes to compare current vs. future state" /></Card>;

    const summary = {
      added: changes.filter(c => c.type === "add").length,
      eliminated: changes.filter(c => c.type === "eliminate").length,
      modified: changes.filter(c => c.type === "modify").length,
      moved: changes.filter(c => c.type === "move").length,
    };

    return (
      <div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card title="Current State">
            <div className="text-xs text-[var(--text-muted)] mb-3">{currentMetrics.hc} employees / {currentMetrics.directs} direct reports</div>
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>{renderTree(currentTree, 0, false)}</div>
          </Card>
          <Card title="Future State">
            <div className="text-xs text-[var(--text-muted)] mb-3">{futureMetrics.hc} employees / Net: {futureMetrics.net >= 0 ? "+" : ""}{futureMetrics.net}</div>
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>{renderTree(futureTree, 0, false, true)}</div>
          </Card>
        </div>

        <Card title="Changes Summary">
          <div className="flex items-center gap-6">
            {([
              { label: "Added", count: summary.added, color: "var(--success)" },
              { label: "Eliminated", count: summary.eliminated, color: "var(--risk)" },
              { label: "Modified", count: summary.modified, color: "var(--warning)" },
              { label: "Moved", count: summary.moved, color: "#0EA5E9" },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <div>
                  <div className="text-lg font-bold font-data text-[var(--text-primary)]">{item.count}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     TAB 4 — IMPACT
     ═══════════════════════════════════════════════════════════════ */
  const renderImpact = () => {
    if (changes.length === 0) return <Card><Empty icon="📊" text="Make design changes in the Design tab to see their impact analysis" /></Card>;

    const totalAffected = changes.length;
    const avgSpanBefore = currentMetrics.directs;
    const avgSpanAfter = futureTree ? futureTree.children.filter(c => c.status !== "eliminated").length : avgSpanBefore;

    const eliminatedRoles = changes.filter(c => c.type === "eliminate").map(c => c.before.title || "Unknown Role");
    const addedRoles = changes.filter(c => c.type === "add" || c.type === "modify").map(c => c.after.title || "New Role");

    const waves = [
      { label: "Wave 1: Reporting Changes", pct: 85, color: "var(--accent-primary)", desc: "Quick wins — adjust reporting lines" },
      { label: "Wave 2: Role Consolidations", pct: 60, color: "var(--warning)", desc: "Merge overlapping responsibilities" },
      { label: "Wave 3: New Hires", pct: 35, color: "var(--success)", desc: "Fill critical new positions" },
      { label: "Wave 4: Reskilling", pct: 50, color: "var(--purple)", desc: "Upskill for transformed roles" },
    ];

    const risks = [
      { title: "Key Person Risk", level: futureMetrics.eliminated > 3 ? "High" : "Medium", color: futureMetrics.eliminated > 3 ? "var(--risk)" : "var(--warning)", desc: "Critical knowledge holders affected by restructuring" },
      { title: "Execution Risk", level: changes.length > 8 ? "High" : changes.length > 4 ? "Medium" : "Low", color: changes.length > 8 ? "var(--risk)" : changes.length > 4 ? "var(--warning)" : "var(--success)", desc: "Complexity of implementing all planned changes simultaneously" },
      { title: "Compliance Risk", level: "Low", color: "var(--success)", desc: "Legal and regulatory requirements for workforce changes" },
    ];

    return (
      <div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard label="Net HC Change" value={`${futureMetrics.net >= 0 ? "+" : ""}${futureMetrics.net}`} accent />
          <KpiCard label="Cost Impact" value={fmtNum(Math.abs(futureMetrics.costImpact), "currency")} delta={futureMetrics.costImpact <= 0 ? "Savings" : "Increase"} />
          <KpiCard label="Roles Affected" value={totalAffected} />
          <KpiCard label="Avg Span Change" value={`${avgSpanBefore} → ${avgSpanAfter}`} />
        </div>

        <Card title="Changes Breakdown">
          <div className="space-y-3">
            {([
              { type: "Eliminated", count: futureMetrics.eliminated, color: "var(--risk)" },
              { type: "Added", count: futureMetrics.added, color: "var(--success)" },
              { type: "Modified", count: changes.filter(c => c.type === "modify").length, color: "var(--warning)" },
              { type: "Moved", count: changes.filter(c => c.type === "move").length, color: "#0EA5E9" },
            ] as const).map(item => (
              <div key={item.type} className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-muted)] w-24">{item.type}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-lg transition-all flex items-center px-2" style={{ width: `${Math.max(5, (item.count / Math.max(totalAffected, 1)) * 100)}%`, background: item.color }}>
                    <span className="text-xs font-bold text-white">{item.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <Card title="Skills Impact">
            <div className="mb-4">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Skills at Risk</div>
              {eliminatedRoles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{eliminatedRoles.map((s, i) => <Badge key={i} color="red">{s}</Badge>)}</div>
              ) : <span className="text-xs text-[var(--text-muted)]">None</span>}
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">New Skills Needed</div>
              {addedRoles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{addedRoles.map((s, i) => <Badge key={i} color="green">{s}</Badge>)}</div>
              ) : <span className="text-xs text-[var(--text-muted)]">None</span>}
            </div>
          </Card>

          <Card title="Implementation Timeline">
            <div className="space-y-4">
              {waves.map((w, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[var(--text-primary)]">{w.label}</span>
                    <span className="text-[var(--text-muted)]">{w.pct}%</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: w.color, opacity: 0.75 }} />
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{w.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {risks.map(risk => (
            <Card key={risk.title}>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: risk.color }} />
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{risk.title}</div>
                  <div className="text-lg font-bold font-data mb-1" style={{ color: risk.color }}>{risk.level}</div>
                  <div className="text-xs text-[var(--text-muted)] leading-relaxed">{risk.desc}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     TAB 5 — NOTES
     ═══════════════════════════════════════════════════════════════ */
  const renderNotes = () => (
    <div>
      {/* Search & filter bar */}
      <div className="flex items-center gap-4 mb-6">
        <input
          className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          placeholder="Search notes..." value={notesSearch} onChange={e => setNotesSearch(e.target.value)}
        />
        <select
          className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none"
          value={notesCategoryFilter} onChange={e => setNotesCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Add Note form */}
      <Card title="Add Note">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Job Title</label>
            <input className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" value={newNote.job_title} onChange={e => setNewNote(p => ({ ...p, job_title: e.target.value }))} placeholder="e.g. Senior Data Analyst" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Source</label>
            <input className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" value={newNote.source} onChange={e => setNewNote(p => ({ ...p, source: e.target.value }))} placeholder="e.g. Manager Interview" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Note</label>
          <textarea className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none resize-y" rows={3} value={newNote.note_text} onChange={e => setNewNote(p => ({ ...p, note_text: e.target.value }))} placeholder="Capture key findings, insights, or observations..." />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Category</label>
            <select className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" value={newNote.category} onChange={e => setNewNote(p => ({ ...p, category: e.target.value }))}>
              {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Skills Mentioned</label>
            <div className="flex items-center gap-2">
              <input className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" placeholder="Skill name" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} />
              <select className="w-16 px-2 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" value={newSkillProf} onChange={e => setNewSkillProf(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={addSkillToNote} className="px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--accent-primary)" }}>+</button>
            </div>
            {(newNote.skills || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(newNote.skills || []).map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(212,134,10,0.15)", color: "var(--accent-primary)" }}>
                    {s.name} (L{s.proficiency})
                    <button onClick={() => setNewNote(p => ({ ...p, skills: (p.skills || []).filter((_, j) => j !== i) }))} className="hover:text-[var(--risk)]">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={handleCreateNote} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent-primary)" }}>
          Submit Note
        </button>
      </Card>

      {/* Notes list */}
      <Card title={`Notes (${notesList.length})`}>
        {notesLoading ? <LoadingSkeleton rows={3} /> : notesList.length === 0 ? (
          <Empty icon="📝" text="No notes yet. Add your first note above." />
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {notesList.map((note, i) => (
              <div key={note.id || i} className="p-4 rounded-xl border border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{note.job_title}</span>
                    <Badge color={note.category === "pain_point" ? "red" : note.category === "skills_update" ? "green" : "gray"}>
                      {note.category?.replace(/_/g, " ") || "other"}
                    </Badge>
                    {note.status && (
                      <Badge color={note.status === "confirmed" ? "green" : note.status === "rejected" ? "red" : "gray"}>
                        {note.status}
                      </Badge>
                    )}
                  </div>
                  {note.source && <span className="text-xs text-[var(--text-muted)]">{note.source}</span>}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">{note.note_text}</p>
                {(note.skills || []).length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--success)] font-semibold">Skills Updated</span>
                    <div className="flex flex-wrap gap-1">
                      {(note.skills || []).map((s, j) => (
                        <span key={j} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {note.created_at && <span className="text-xs text-[var(--text-muted)]">{new Date(note.created_at).toLocaleDateString()}</span>}
                  {note.id && note.status !== "confirmed" && note.status !== "rejected" && (
                    <>
                      <button onClick={() => handleConfirmNote(note.id!)} className="text-xs font-semibold text-[var(--success)] hover:underline ml-auto">Confirm</button>
                      <button onClick={() => handleRejectNote(note.id!)} className="text-xs font-semibold text-[var(--risk)] hover:underline">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════════════ */
  const kpis = orgData ? (orgData as any).kpis || {} : {};

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        icon="🔄"
        title="Org Restructuring"
        subtitle="Design, compare, and evaluate organizational restructuring scenarios"
        onBack={onBack}
        viewCtx={viewCtx}
      />

      <ContextStrip items={[
        `${employees.length} employees loaded`,
        `${managers.length} managers identified`,
        changes.length > 0 ? `${changes.length} pending changes` : "No changes yet",
        selectedManager ? `Manager: ${employees.find(e => e.id === selectedManager)?.name || selectedManager}` : "No manager selected",
      ]} />

      {orgData && (
        <div className="grid grid-cols-4 gap-4 mb-6 mt-4">
          <KpiCard label="Total Headcount" value={kpis.total || employees.length} accent />
          <KpiCard label="Managers" value={kpis.managers || managers.length} />
          <KpiCard label="Avg Span" value={kpis.avg_span ? Number(kpis.avg_span).toFixed(1) : "---"} />
          <KpiCard label="Layers" value={kpis.layers || "---"} />
        </div>
      )}

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === "org" && renderOrgView()}
        {activeTab === "design" && renderDesign()}
        {activeTab === "compare" && renderCompare()}
        {activeTab === "impact" && renderImpact()}
        {activeTab === "notes" && renderNotes()}
      </div>

      {onNavigate && <NextStepBar currentModuleId="reorg" onNavigate={onNavigate} />}
    </div>
  );
}

export default OrgRestructuring;
