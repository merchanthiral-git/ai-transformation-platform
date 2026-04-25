"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  ViewContext, COLORS,
  KpiCard, Card, Empty, Badge, InsightPanel,
  TabBar, PageHeader, LoadingSkeleton,
  ContextStrip,
  usePersisted, showToast, JobDesignState, fmtNum,
} from "../shared";
import {
  Network, Users, Search, Filter, Plus, X, Check,
  ChevronLeft, ChevronRight, Pencil, Trash2, GitBranch,
  ArrowRight, Layers3, TriangleAlert, Gauge,
  Eye, Compass, BarChart3, Clock, Minus, Maximize2,
  Copy, Save, MoreHorizontal, MessageSquare,
} from "@/lib/icons";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { EmptyState, FlowNav, ExpertPanel, Badge as UIBadge } from "@/app/ui";

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

type NoteContext = {
  type: "role" | "change" | "scenario" | "engagement";
  id?: string;
  label?: string;
};

type NoteEntry = {
  id?: string; job_title: string; note_text: string; source: string;
  category: string; skills?: { name: string; proficiency: number }[];
  status?: string; created_at?: string;
  context?: NoteContext;
};

type SavedScenario = {
  id: string;
  name: string;
  changes: ChangeEntry[];
  selectedManager: string;
  managerName: string;
  timestamp: number;
  metrics?: {
    headcount: number; avgSpan: number; layers: number;
    managers: number; ics: number; costImpact: number;
  };
};

const TABS = [
  { id: "org", label: "Org View" },
  { id: "design", label: "Design" },
  { id: "scenarios", label: "Scenarios" },
  { id: "compare", label: "Compare" },
  { id: "impact", label: "Impact" },
  { id: "notes", label: "Notes" },
];

const NOTE_CATEGORIES = [
  "skills_update", "role_clarification", "process_insight",
  "pain_point", "stakeholder_feedback", "other",
];

const INLINE_NOTE_CATEGORIES = [
  { value: "observation", label: "Observation" },
  { value: "decision", label: "Decision" },
  { value: "risk", label: "Risk" },
  { value: "action", label: "Action" },
];

const NOTE_CONTEXT_FILTERS = [
  { value: "all", label: "All" },
  { value: "role", label: "Role notes" },
  { value: "change", label: "Change notes" },
  { value: "scenario", label: "Scenario notes" },
  { value: "general", label: "General" },
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
    M: "#f4a83a", E: "#a78bb8", P: "#8ba87a",
    T: "#f4a83a", S: "#f4a83a",
  };
  return map[track] || "#8a7f6d";
}

function cloneTree(node: ReorgNode): ReorgNode {
  return { ...node, children: node.children.map(c => cloneTree(c)) };
}

function flattenTree(node: ReorgNode): ReorgNode[] {
  return [node, ...node.children.flatMap(c => flattenTree(c))];
}

/* ── Main Component ── */
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
  const [showEntryPoint, setShowEntryPoint] = useState(true);

  // Canvas state for SVG tree
  const [canvasZoom, setCanvasZoom] = useState(0.85);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
  const [notesContextFilter, setNotesContextFilter] = useState("all");
  const [noteAttachTo, setNoteAttachTo] = useState<string>("general");
  const [noteAttachSearch, setNoteAttachSearch] = useState("");

  // Inline note popover from canvas action bar
  const [inlineNoteOpen, setInlineNoteOpen] = useState(false);
  const [inlineNoteText, setInlineNoteText] = useState("");
  const [inlineNoteCategory, setInlineNoteCategory] = useState("observation");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scenario persistence state
  const [savedScenarios, setSavedScenarios] = usePersisted<SavedScenario[]>("orgRestruc_savedScenarios", []);
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState<string | null>(null);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  /* ── Data loading ── */
  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getEmployeeRecords(model, f).then((d) => {
      setWfData(d.employees || []);
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
          showToast("Last change undone");
          return prev.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load saved scenarios from backend on mount
  useEffect(() => {
    if (!model) return;
    api.getReorgScenarios(model).then((d: any) => {
      const backendScenarios = (d?.scenarios || []) as SavedScenario[];
      if (backendScenarios.length > 0) {
        setSavedScenarios(prev => {
          const localIds = new Set(prev.map(s => s.id));
          const merged = [...prev];
          for (const s of backendScenarios) {
            if (!localIds.has(s.id)) merged.push(s);
          }
          return merged;
        });
      }
    }).catch(() => { /* backend unavailable, localStorage fallback */ });
  }, [model]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
      // Close scenario menu on outside click
      if (scenarioMenuOpen) setScenarioMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [scenarioMenuOpen]);

  /* ── Derive employee list ── */
  const employees = useMemo(() => {
    if (!wfData || wfData.length === 0) return [];
    return wfData.map((e: any, i: number) => ({
      id: String(e.id || e.employee_id || `emp_${i}`),
      name: String(e.name || e.employee_name || `Employee ${i + 1}`),
      title: String(e.title || e.job_title || ""),
      function: String(e.function || e.department || ""),
      level: String(e.level || e.career_level || ""),
      track: String(e.track || e.career_track || "P").charAt(0).toUpperCase(),
      managerId: String(e.manager_id || ""),
      comp: Number(e.comp || 0),
      tenure: Number(e.tenure || 0),
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

  /* ── Auto-select root manager (most total reports) on first load ── */
  useEffect(() => {
    if (!employees.length || selectedManager) return;
    // Find root nodes: employees who have no managerId in the dataset
    const employeeIds = new Set(employees.map(e => e.id));
    const roots = employees.filter(e => !e.managerId || !employeeIds.has(e.managerId));
    if (roots.length === 0) return;
    // Pick the root with the most total reports (recursive headcount)
    const countReports = (id: string): number => {
      const directs = employees.filter(e => e.managerId === id);
      return directs.reduce((sum, d) => sum + 1 + countReports(d.id), 0);
    };
    const best = roots.reduce((prev, curr) =>
      countReports(curr.id) > countReports(prev.id) ? curr : prev,
    );
    // Expand 3 levels deep from root
    const expandIds = new Set<string>();
    const expandLevels = (id: string, depth: number) => {
      expandIds.add(id);
      if (depth < 3) {
        employees.filter(e => e.managerId === id).forEach(c => expandLevels(c.id, depth + 1));
      }
    };
    expandLevels(best.id, 0);
    setSelectedManager(best.id); setManagerSearch(best.name); setExpandedNodes(expandIds);
  }, [employees]);

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

  const currentTree = useMemo(() => (!selectedManager ? null : buildTree(selectedManager)), [selectedManager, buildTree]);

  /* ── Future tree ── */
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

  /* ── Extended metrics for canvas panel ── */
  const extendedMetrics = useMemo(() => {
    const computeTreeMetrics = (tree: ReorgNode | null, excludeEliminated: boolean) => {
      if (!tree) return { hc: 0, managers: 0, avgSpan: 0, layers: 0 };
      const flat = flattenTree(tree).filter(n => !excludeEliminated || n.status !== "eliminated");
      const mgrNodes = flat.filter(n => flat.some(c => c.managerId === n.id && (!excludeEliminated || c.status !== "eliminated")));
      const spans = mgrNodes.map(m => flat.filter(c => c.managerId === m.id && (!excludeEliminated || c.status !== "eliminated")).length);
      const avgSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;
      const getDepth = (n: ReorgNode, d: number): number => {
        const kids = n.children.filter(c => !excludeEliminated || c.status !== "eliminated");
        return kids.length === 0 ? d : Math.max(...kids.map(c => getDepth(c, d + 1)));
      };
      return { hc: flat.length, managers: mgrNodes.length, avgSpan, layers: getDepth(tree, 1) };
    };
    return {
      current: computeTreeMetrics(currentTree, false),
      future: computeTreeMetrics(futureTree, true),
    };
  }, [currentTree, futureTree]);

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
    showToast(`${node.name} marked for transition`);
  }, []);

  const handleAddReport = useCallback((parentId: string) => {
    const newId = `new_${Date.now()}`;
    setChanges(prev => [...prev, {
      id: `ch_${Date.now()}`, type: "add", nodeId: newId,
      before: {},
      after: { managerId: parentId, name: "New Role", title: "TBD", level: "P3" },
      timestamp: Date.now(),
    }]);
    showToast("New report added — edit details in the node panel");
  }, []);

  const handleStartEdit = useCallback((node: ReorgNode) => { setEditingNode(node.id); setEditTitle(node.title); setEditLevel(node.level); }, []);

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

  const handleSaveNote = useCallback((_nodeId: string, _text: string) => { setNoteInput(null); setNoteText(""); showToast("Note saved to this node"); }, []);

  const handleSaveScenario = useCallback(async () => {
    if (!scenarioName.trim()) { showToast("Enter a scenario name"); return; }
    const mgrEmp = employees.find(e => e.id === selectedManager);
    const scenarioId = `scenario_${Date.now()}`;
    const scenario: SavedScenario = {
      id: scenarioId,
      name: scenarioName.trim(),
      changes: [...changes],
      selectedManager,
      managerName: mgrEmp?.name || selectedManager,
      timestamp: Date.now(),
      metrics: {
        headcount: extendedMetrics.future.hc,
        avgSpan: Math.round(extendedMetrics.future.avgSpan * 10) / 10,
        layers: extendedMetrics.future.layers,
        managers: extendedMetrics.future.managers,
        ics: extendedMetrics.future.hc - extendedMetrics.future.managers,
        costImpact: futureMetrics.costImpact,
      },
    };
    setSavedScenarios(prev => {
      // Update existing scenario with same name or add new
      const existingIdx = prev.findIndex(s => s.name === scenarioName.trim());
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...scenario, id: prev[existingIdx].id };
        return updated;
      }
      return [...prev, scenario];
    });
    // Also persist to backend (fire-and-forget)
    try {
      await api.saveReorgScenario({
        model_id: model, name: scenarioName,
        changes, manager_id: selectedManager,
        scenario_id: scenarioId,
        metrics: scenario.metrics,
        created_at: new Date().toISOString(),
      });
    } catch { /* backend unavailable, localStorage has the data */ }
    showToast(savedScenarios.length === 0 ? "First scenario saved! You're building something meaningful." : "Scenario saved");
  }, [model, scenarioName, changes, selectedManager, employees, extendedMetrics, futureMetrics]);

  const handleLoadScenario = useCallback((scenario: SavedScenario) => {
    setChanges(scenario.changes);
    setSelectedManager(scenario.selectedManager);
    setScenarioName(scenario.name);
    const mgr = employees.find(e => e.id === scenario.selectedManager);
    if (mgr) setManagerSearch(mgr.name);
    // Expand root
    setExpandedNodes(new Set([scenario.selectedManager]));
    setActiveTab("design");
    setShowEntryPoint(false);
    showToast(`Loaded "${scenario.name}"`);
  }, [employees]);

  const handleDuplicateScenario = useCallback((scenario: SavedScenario) => {
    const newName = `Copy of ${scenario.name}`;
    const dup: SavedScenario = {
      ...scenario,
      id: `scenario_${Date.now()}`,
      name: newName,
      changes: scenario.changes.map(c => ({ ...c, id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })),
      timestamp: Date.now(),
    };
    setSavedScenarios(prev => [...prev, dup]);
    // Load the duplicated scenario
    setChanges(dup.changes);
    setSelectedManager(dup.selectedManager);
    setScenarioName(dup.name);
    const mgr = employees.find(e => e.id === dup.selectedManager);
    if (mgr) setManagerSearch(mgr.name);
    setExpandedNodes(new Set([dup.selectedManager]));
    setActiveTab("design");
    setShowEntryPoint(false);
    setScenarioMenuOpen(null);
    showToast(`Duplicated as "${newName}"`);
  }, [employees]);

  const handleDeleteScenario = useCallback((scenarioId: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== scenarioId));
    setScenarioMenuOpen(null);
    showToast("Scenario deleted — select another to continue");
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!newNote.job_title.trim() || !newNote.note_text.trim()) {
      showToast("Job title and note text are required");
      return;
    }
    // Build context from noteAttachTo
    let context: NoteContext | undefined;
    if (noteAttachTo === "general") {
      context = undefined;
    } else if (noteAttachTo === "__scenario__") {
      context = { type: "scenario", id: scenarioName || "current", label: scenarioName || "Current scenario" };
    } else {
      // It's a role ID
      const allRoles = futureTree ? flattenTree(futureTree) : [];
      const role = allRoles.find(r => r.id === noteAttachTo);
      if (role) {
        context = { type: "role", id: role.id, label: `${role.name} - ${role.title}` };
      }
    }
    const noteWithContext = { ...newNote, context };
    try {
      await api.createNote(noteWithContext as unknown as Record<string, unknown>);
      showToast("Note created");
      setNewNote({ job_title: "", note_text: "", source: "", category: "other", skills: [] });
      setNoteAttachTo("general");
      try {
        const d = await api.getNotes();
        setNotesList(((d as any)?.notes || []) as NoteEntry[]);
      } catch { /* list refresh optional */ }
    } catch { showToast("Failed to create note"); }
  }, [newNote, noteAttachTo, scenarioName, futureTree]);

  const handleInlineNoteSave = useCallback(async () => {
    if (!inlineNoteText.trim() || !selectedNode) return;
    const noteData: NoteEntry = {
      job_title: `${selectedNode.name} - ${selectedNode.title}`,
      note_text: inlineNoteText.trim(),
      source: "canvas",
      category: inlineNoteCategory,
      context: { type: "role", id: selectedNode.id, label: `${selectedNode.name} - ${selectedNode.title}` },
    };
    try {
      await api.createNote(noteData as unknown as Record<string, unknown>);
      showToast("Note saved");
      setInlineNoteOpen(false);
      setInlineNoteText("");
      setInlineNoteCategory("observation");
      // Refresh notes list
      try {
        const d = await api.getNotes();
        setNotesList(((d as any)?.notes || []) as NoteEntry[]);
      } catch { /* optional */ }
    } catch { showToast("Failed to save note"); }
  }, [inlineNoteText, inlineNoteCategory, selectedNode]);

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
    setNewNote(prev => ({ ...prev, skills: [...(prev.skills || []), { name: newSkillName.trim(), proficiency: newSkillProf }] }));
    setNewSkillName(""); setNewSkillProf(3);
  }, [newSkillName, newSkillProf]);

  /* ── Conditional returns (after all hooks) ── */
  if (loading) return (
    <div style={{ padding: 32 }}>
      <PageHeader icon={<Network size={20} />} title="Org Restructuring" subtitle="Loading workforce data..." onBack={onBack} />
      <LoadingSkeleton rows={6} />
    </div>
  );

  if (!wfData || wfData.length === 0) return (
    <div style={{ padding: 32 }}>
      <PageHeader icon={<Network size={20} />} title="Org Restructuring" subtitle="Reshape your organization" onBack={onBack} />
      <EmptyState
        icon={<Network size={28} />}
        headline="Workforce data required"
        explanation="Upload workforce data with employee names, titles, and manager IDs to use the restructuring tool."
        primaryAction={{ label: "Go to Overview", icon: <ArrowRight size={14} />, onClick: () => onNavigate?.("dashboard") }}
      />
    </div>
  );

  /* ── Rendering helpers ── */
  const statusBorder = (s: ReorgNode["status"]) => {
    switch (s) {
      case "added": return "var(--success)";
      case "eliminated": return "var(--risk)";
      case "modified": return "var(--warning)";
      case "moved": return "var(--amber)";
      default: return "transparent";
    }
  };

  const statusBadge = (s: ReorgNode["status"]) => {
    switch (s) {
      case "added": return <Badge color="green">NEW</Badge>;
      case "eliminated": return <Badge color="red">TRANSITIONING</Badge>;
      case "modified": return <Badge color="amber">MODIFIED</Badge>;
      case "moved": return <Badge color="teal">MOVED</Badge>;
      default: return null;
    }
  };

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
          <button onClick={() => hasChildren && toggleExpand(node.id)} className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] flex-shrink-0" style={{ visibility: hasChildren ? "visible" : "hidden", cursor: hasChildren ? "pointer" : "default" }}>
            {expanded ? <ChevronLeft size={12} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={12} />}
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${trackColor(node.track)}22`, color: trackColor(node.track), border: `1.5px solid ${trackColor(node.track)}40` }}
          >
            {getInitials(node.name)}
          </div>
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

          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ color: trackColor(node.track), background: `${trackColor(node.track)}18` }}
          >
            {displayLevel}
          </span>

          <span className="text-xs text-[var(--text-muted)] w-24 truncate text-right flex-shrink-0 hidden sm:block">{node.function}</span>
          {editable && !isEliminated && editingNode !== node.id && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => handleStartEdit(node)} title="Edit" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"><Pencil size={12} /></button>
              <button onClick={() => handleEliminate(node)} title="Eliminate" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"><Trash2 size={12} /></button>
              <button onClick={() => handleAddReport(node.id)} title="Add Report" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"><Plus size={12} /></button>
              <button onClick={() => { setNoteInput(node.id); setNoteText(node.notes || ""); }} title="Notes" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"><GitBranch size={12} /></button>
              <button onClick={() => { setMoveTarget(node.id); setMoveManagerId(""); }} title="Move" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"><ArrowRight size={12} /></button>
            </div>
          )}
        </div>

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

        {expanded && node.children.map(child => renderTree(child, depth + 1, editable, useFutureStatus))}
      </div>
    );
  };

  /* ── Tab 1: Org View ── */
  const renderOrgView = () => (
    <div className="flex gap-6">
      {/* Left column */}
      <div className="flex-1 min-w-0">
        <Card title="Restructure by manager — select a team lead to examine their org and propose changes.">
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <Search size={15} className="text-[var(--text-muted)] flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Search by name or title..."
                value={managerSearch}
                onChange={e => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                onFocus={() => setShowManagerDropdown(true)}
              />
            </div>
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
          currentTree.children.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users size={28} />}
                headline="No direct reports"
                explanation="This role has no direct reports. Select a manager with a team to restructure."
                primaryAction={{
                  label: "View top-level org",
                  icon: <Network size={14} />,
                  onClick: () => {
                    setSelectedManager("");
                    setManagerSearch("");
                  },
                }}
              />
            </Card>
          ) : (
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
          )
        ) : (
          <Card>
            <EmptyState
              icon={<Network size={28} />}
              headline="No manager selected"
              explanation="Use the search above to select a manager and view their organization."
              primaryAction={{
                label: "Browse managers",
                icon: <Users size={14} />,
                onClick: () => setShowManagerDropdown(true),
              }}
            />
          </Card>
        )}
      </div>

      {/* Right: summary stats */}
      {currentTree && currentTree.children.length > 0 && (
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

  /* ── SVG Tree constants ── */
  const TREE_CARD_W = 200;
  const TREE_CARD_H = 70;
  const TREE_LAYER_GAP = 100;
  const TREE_SIBLING_GAP = 20;

  /* ── Build d3 layout from futureTree for canvas ── */
  const treeLayout = useMemo(() => {
    if (!futureTree) return { nodes: [] as any[], links: [] as any[] };

    // Filter tree based on expanded state
    function filterExpanded(node: ReorgNode, depth: number): any {
      const isExp = expandedNodes.has(node.id);
      const visibleChildren = isExp ? node.children.map(c => filterExpanded(c, depth + 1)) : [];
      const hiddenCount = isExp ? 0 : node.children.length;
      return { ...node, children: visibleChildren, _hiddenCount: hiddenCount, _depth: depth };
    }

    const filtered = filterExpanded(futureTree, 0);
    const root = hierarchy(filtered);

    const layout = d3tree<any>()
      .nodeSize([TREE_CARD_W + TREE_SIBLING_GAP, TREE_CARD_H + TREE_LAYER_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);

    layout(root);

    const nodes = root.descendants().map(d => ({
      ...d.data,
      x: d.x!,
      y: d.y!,
      depth: d.depth,
    }));

    const links = root.links().map(l => ({
      source: { x: l.source.x!, y: l.source.y! },
      target: { x: l.target.x!, y: l.target.y! },
    }));

    return { nodes, links };
  }, [futureTree, expandedNodes]);

  /* ── Fit canvas to viewport ── */
  const fitCanvasToView = useCallback(() => {
    if (!canvasRef.current || treeLayout.nodes.length === 0) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const metricsWidth = 250;
    const canvasWidth = width - metricsWidth;
    const xs = treeLayout.nodes.map((n: any) => n.x);
    const ys = treeLayout.nodes.map((n: any) => n.y);
    const minX = Math.min(...xs) - TREE_CARD_W / 2 - 40;
    const maxX = Math.max(...xs) + TREE_CARD_W / 2 + 40;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + TREE_CARD_H + 40;
    const treeW = maxX - minX;
    const treeH = maxY - minY;
    const scaleX = canvasWidth / treeW;
    const scaleY = height / treeH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1);
    setCanvasZoom(newZoom);
    setCanvasPan({
      x: canvasWidth / 2 - ((minX + maxX) / 2) * newZoom,
      y: 40 - minY * newZoom,
    });
  }, [treeLayout]);

  /* ── Canvas pan/zoom handlers ── */
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setCanvasZoom(z => Math.min(Math.max(z + delta, 0.3), 2.0));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "svg" || tag === "rect" && (e.target as SVGRectElement).getAttribute("data-bg") === "true") {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: canvasPan.x, panY: canvasPan.y };
      setSelectedNodeId(null);
      setInlineNoteOpen(false);
    }
  }, [canvasPan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setCanvasPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleCanvasMouseUp = useCallback(() => { setIsPanning(false); }, []);

  /* ── Get selected node from futureTree ── */
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !futureTree) return null;
    return flattenTree(futureTree).find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, futureTree]);

  /* ── Tab 2: Design ── */
  const renderDesign = () => {
    if (!currentTree) return (
      <Card>
        <EmptyState
          icon={<Pencil size={28} />}
          headline="Select a manager first"
          explanation="Choose a team lead from the Org View to propose structural changes."
          primaryAction={{
            label: "Go to Org View",
            icon: <Network size={14} />,
            onClick: () => setActiveTab("org"),
          }}
        />
      </Card>
    );

    const renderSvgLink = (link: { source: { x: number; y: number }; target: { x: number; y: number } }, idx: number) => {
      const { source, target } = link;
      const midY = source.y + TREE_CARD_H + (target.y - source.y - TREE_CARD_H) / 2;
      return (
        <path key={idx}
          d={`M${source.x},${source.y + TREE_CARD_H} L${source.x},${midY} L${target.x},${midY} L${target.x},${target.y}`}
          fill="none" stroke="rgba(22,24,34,0.2)" strokeWidth={1}
        />
      );
    };

    const renderSvgNode = (node: any, idx: number) => {
      const w = TREE_CARD_W;
      const h = TREE_CARD_H;
      const isSelected = selectedNodeId === node.id;
      const isEliminated = node.status === "eliminated";
      const tc = trackColor(node.track);
      const hasChildren = (node.children && node.children.length > 0) || node._hiddenCount > 0;
      const isExpanded = expandedNodes.has(node.id);
      const hiddenCount = node._hiddenCount || 0;

      const borderColor = isSelected ? "var(--amber)"
        : node.status === "added" ? "var(--success)"
        : node.status === "eliminated" ? "var(--risk)"
        : node.status === "modified" ? "var(--warning)"
        : node.status === "moved" ? "var(--amber)"
        : "rgba(22,24,34,0.18)";

      return (
        <g key={node.id} transform={`translate(${node.x - w / 2},${node.y})`}
          style={{ cursor: "pointer", opacity: isEliminated ? 0.5 : 1 }}
          onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
        >
          {/* Card background */}
          <rect width={w} height={h} rx={8} ry={8}
            fill="#fff"
            stroke={borderColor}
            strokeWidth={isSelected ? 2 : node.status !== "current" ? 1.5 : 0.5}
          />
          {/* Track color indicator stripe */}
          <rect x={0} y={0} width={4} height={h} rx={2} ry={0} fill={tc}>
            <clipPath id={`tc-${node.id}`}><rect width={4} height={h} rx={8} /></clipPath>
          </rect>

          {/* Name - 13px weight 500 */}
          <text x={14} y={20} fontSize={13} fontWeight={500} fill="var(--paper-solid)"
            textDecoration={isEliminated ? "line-through" : "none"}>
            {node.name.length > 20 ? node.name.slice(0, 19) + "\u2026" : node.name}
          </text>

          {/* Title - 11px */}
          <text x={14} y={35} fontSize={11} fill="rgba(22,24,34,0.6)"
            textDecoration={isEliminated ? "line-through" : "none"}>
            {(node.title || "").length > 24 ? node.title.slice(0, 23) + "\u2026" : (node.title || "")}
          </text>

          {/* Level badge */}
          <rect x={14} y={43} width={node.level ? node.level.length * 7 + 8 : 0} height={16} rx={3} fill={`${tc}18`} />
          <text x={18} y={55} fontSize={10} fontWeight={600} fill={tc}>{node.level || ""}</text>

          {/* Status badge for non-current */}
          {node.status !== "current" && (
            <>
              <rect x={w - 60} y={4} width={52} height={14} rx={3}
                fill={node.status === "added" ? "rgba(139,168,122,0.12)"
                  : node.status === "eliminated" ? "rgba(232,122,93,0.12)"
                  : node.status === "modified" ? "rgba(244,168,58,0.12)"
                  : "rgba(14,165,233,0.12)"}
              />
              <text x={w - 55} y={14} fontSize={8} fontWeight={700}
                fill={node.status === "added" ? "var(--success)"
                  : node.status === "eliminated" ? "var(--risk)"
                  : node.status === "modified" ? "var(--warning)"
                  : "var(--amber)"}>
                {node.status.toUpperCase()}
              </text>
            </>
          )}

          {/* Expand/collapse indicator */}
          {hasChildren && (
            <g transform={`translate(${w / 2 - 14}, ${h - 4})`}
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              style={{ cursor: "pointer" }}>
              <rect x={0} y={0} width={28} height={16} rx={8} fill="var(--paper-solid)" />
              <text x={14} y={12} textAnchor="middle" fontSize={9} fontWeight={600} fill="#fff">
                {isExpanded ? "\u25B4" : (hiddenCount > 0 ? `+${hiddenCount}` : "\u25BE")}
              </text>
            </g>
          )}
        </g>
      );
    };

    const metricRow = (label: string, current: number | string, future: number | string, fmt?: string) => {
      const cVal = typeof current === "number" ? current : parseFloat(current as string) || 0;
      const fVal = typeof future === "number" ? future : parseFloat(future as string) || 0;
      const delta = fVal - cVal;
      const deltaColor = delta === 0 ? "var(--text-muted)" : delta > 0 ? "var(--success)" : "var(--risk)";
      return (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", width: 44, textAlign: "right" }}>
            {fmt === "decimal" ? Number(current).toFixed(1) : String(current)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: deltaColor, width: 44, textAlign: "right" }}>
            {delta === 0 ? "--" : `${delta > 0 ? "+" : ""}${fmt === "decimal" ? delta.toFixed(1) : delta}`}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", width: 44, textAlign: "right" }}>
            {fmt === "decimal" ? Number(future).toFixed(1) : String(future)}
          </span>
        </div>
      );
    };

    return (
      <div style={{ display: "flex", gap: 0, height: 600, position: "relative" }}>
        {/* Main Canvas Area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          {/* Undo indicator */}
          {changes.length > 0 && (
            <div style={{
              position: "absolute", top: 12, left: 12, zIndex: 5,
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 8,
              background: "var(--surface-2)", border: "0.5px solid rgba(22,24,34,0.15)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 12,
            }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{changes.length} change{changes.length !== 1 ? "s" : ""}</span>
              <span style={{ color: "var(--text-muted)" }}>&middot;</span>
              <button
                onClick={() => setChanges(prev => { if (prev.length === 0) return prev; showToast("Last change undone"); return prev.slice(0, -1); })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-primary)", fontWeight: 600, fontSize: 12, padding: 0 }}
              >
                Undo
              </button>
            </div>
          )}

          {/* SVG Canvas */}
          <div
            ref={canvasRef}
            style={{
              flex: 1, background: "var(--surface-2)", borderRadius: 12,
              overflow: "hidden", position: "relative",
              cursor: isPanning ? "grabbing" : "grab",
              border: "1px solid var(--border)",
            }}
            onWheel={handleCanvasWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <svg ref={svgRef} width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
              <rect width="100%" height="100%" fill="transparent" data-bg="true" />
              <g transform={`translate(${canvasPan.x},${canvasPan.y}) scale(${canvasZoom})`}>
                {treeLayout.links.map((link: any, i: number) => renderSvgLink(link, i))}
                {treeLayout.nodes.map((node: any, i: number) => renderSvgNode(node, i))}
              </g>
            </svg>

            {/* Zoom controls in bottom-left */}
            <div style={{
              position: "absolute", bottom: 12, left: 12, zIndex: 5,
              display: "flex", alignItems: "center", gap: 2,
              padding: "4px 6px", background: "var(--surface-2)",
              border: "0.5px solid rgba(22,24,34,0.12)", borderRadius: 6,
              fontSize: 11,
            }}>
              <button
                onClick={() => setCanvasZoom(z => Math.min(z + 0.1, 2.0))}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "none", border: "0.5px solid rgba(22,24,34,0.15)", borderRadius: 4, cursor: "pointer", color: "var(--paper-solid)" }}
              ><Plus size={12} /></button>
              <button
                onClick={() => setCanvasZoom(z => Math.max(z - 0.1, 0.3))}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "none", border: "0.5px solid rgba(22,24,34,0.15)", borderRadius: 4, cursor: "pointer", color: "var(--paper-solid)" }}
              ><Minus size={12} /></button>
              <span style={{ padding: "0 6px", fontFamily: "var(--ff-mono)", fontSize: 11, color: "rgba(22,24,34,0.55)", minWidth: 32, textAlign: "center" }}>
                {Math.round(canvasZoom * 100)}%
              </span>
              <button
                onClick={fitCanvasToView}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "2px 8px", height: 24, background: "none", border: "0.5px solid rgba(22,24,34,0.15)", borderRadius: 4, cursor: "pointer", color: "var(--paper-solid)", fontSize: 11, fontWeight: 500 }}
              ><Maximize2 size={11} /> Fit</button>
            </div>
          </div>

          {/* Floating action bar when node selected */}
          {selectedNode && selectedNode.status !== "eliminated" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", marginTop: 8,
              background: "var(--surface-2)", borderRadius: 10,
              border: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginRight: 8 }}>
                {selectedNode.name}
              </span>
              <button
                onClick={() => { handleStartEdit(selectedNode); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-primary)" }}
              ><Pencil size={12} /> Edit</button>
              <button
                onClick={() => { setMoveTarget(selectedNode.id); setMoveManagerId(""); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-primary)" }}
              ><ArrowRight size={12} /> Move</button>
              <button
                onClick={() => handleAddReport(selectedNode.id)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-primary)" }}
              ><Plus size={12} /> Add Report</button>
              <button
                onClick={() => { handleEliminate(selectedNode); setSelectedNodeId(null); setInlineNoteOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "rgba(232,122,93,0.08)", border: "1px solid rgba(232,122,93,0.2)", borderRadius: 6, cursor: "pointer", color: "var(--risk)" }}
              ><Trash2 size={12} /> Eliminate</button>
              <button
                onClick={() => { setInlineNoteOpen(!inlineNoteOpen); setInlineNoteText(""); setInlineNoteCategory("observation"); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: inlineNoteOpen ? "rgba(244,168,58,0.08)" : "var(--surface-2)", border: `1px solid ${inlineNoteOpen ? "rgba(244,168,58,0.3)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", color: inlineNoteOpen ? "var(--amber)" : "var(--text-primary)" }}
              ><MessageSquare size={12} /> Note</button>
            </div>
          )}

          {/* Inline note popover from action bar */}
          {inlineNoteOpen && selectedNode && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 8,
              padding: "12px 16px", marginTop: 4,
              background: "var(--surface-2)", borderRadius: 10,
              border: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <MessageSquare size={13} style={{ color: "var(--amber)" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  Note for {selectedNode.name} &mdash; {selectedNode.title}
                </span>
              </div>
              <textarea
                style={{
                  width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 6,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  color: "var(--text-primary)", outline: "none", resize: "vertical",
                  fontFamily: "inherit",
                }}
                rows={3}
                value={inlineNoteText}
                onChange={e => setInlineNoteText(e.target.value)}
                placeholder="Add a note about this role..."
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  style={{
                    padding: "4px 8px", fontSize: 12, borderRadius: 6,
                    border: "1px solid var(--border)", background: "var(--surface-2)",
                    color: "var(--text-primary)", outline: "none",
                  }}
                  value={inlineNoteCategory}
                  onChange={e => setInlineNoteCategory(e.target.value)}
                >
                  {INLINE_NOTE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setInlineNoteOpen(false); setInlineNoteText(""); }}
                  style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >Cancel</button>
                <button
                  onClick={handleInlineNoteSave}
                  style={{
                    padding: "4px 14px", fontSize: 12, fontWeight: 600,
                    color: "#fff", background: "var(--accent-primary)",
                    border: "none", borderRadius: 6, cursor: inlineNoteText.trim() ? "pointer" : "default",
                    opacity: inlineNoteText.trim() ? 1 : 0.5,
                  }}
                  disabled={!inlineNoteText.trim()}
                >Save</button>
              </div>
            </div>
          )}

          {/* Edit inline form when editingNode is set */}
          {editingNode && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", marginTop: 4,
              background: "var(--surface-2)", borderRadius: 10,
              border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Title:</span>
              <input
                style={{ flex: 1, padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", outline: "none" }}
                value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title"
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Level:</span>
              <input
                style={{ width: 60, padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", outline: "none" }}
                value={editLevel} onChange={e => setEditLevel(e.target.value)} placeholder="Level"
              />
              <button onClick={() => { const node = futureTree ? flattenTree(futureTree).find(n => n.id === editingNode) : null; if (node) handleSaveEdit(node); }}
                style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "var(--success)", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingNode(null)}
                style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          {/* Move form when moveTarget is set */}
          {moveTarget && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", marginTop: 4,
              background: "var(--surface-2)", borderRadius: 10,
              border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Move to:</span>
              <select
                style={{ flex: 1, padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", outline: "none" }}
                value={moveManagerId} onChange={e => setMoveManagerId(e.target.value)}
              >
                <option value="">Select new manager...</option>
                {managers.filter(m => m.id !== moveTarget).map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.title}</option>
                ))}
              </select>
              <button
                onClick={() => moveManagerId && handleMoveNode(moveTarget, moveManagerId)}
                style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, color: moveManagerId ? "var(--success)" : "var(--text-muted)", background: "none", border: "none", cursor: moveManagerId ? "pointer" : "default" }}
              >Move</button>
              <button onClick={() => setMoveTarget(null)}
                style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          {/* Save scenario row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              style={{ flex: 1, padding: "8px 14px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", outline: "none" }}
              placeholder="Scenario name..." value={scenarioName} onChange={e => setScenarioName(e.target.value)}
            />
            <button onClick={handleSaveScenario}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "var(--accent-primary)", color: "#fff", cursor: "pointer" }}>
              Save Scenario
            </button>
          </div>
        </div>

        {/* Right: Live Metrics Panel (250px) */}
        <div style={{ width: 250, flexShrink: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Metrics">
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", flex: 1 }}>Metric</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", width: 44, textAlign: "right" }}>Now</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", width: 44, textAlign: "right" }}>&Delta;</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", width: 44, textAlign: "right" }}>Future</span>
              </div>
              {metricRow("Headcount", extendedMetrics.current.hc, extendedMetrics.future.hc)}
              {metricRow("Managers", extendedMetrics.current.managers, extendedMetrics.future.managers)}
              {metricRow("Avg Span", extendedMetrics.current.avgSpan, extendedMetrics.future.avgSpan, "decimal")}
              {metricRow("Layers", extendedMetrics.current.layers, extendedMetrics.future.layers)}
            </div>
          </Card>

          <Card title="Change Impact">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {([
                { label: "Transitioning Out", count: futureMetrics.eliminated, color: "var(--risk)" },
                { label: "Added", count: futureMetrics.added, color: "var(--success)" },
                { label: "Modified", count: changes.filter(c => c.type === "modify").length, color: "var(--warning)" },
                { label: "Moved", count: changes.filter(c => c.type === "move").length, color: "var(--amber)" },
              ] as const).map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.count}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Net Change</span>
                  <span style={{ fontWeight: 700, color: futureMetrics.net >= 0 ? "var(--success)" : "var(--risk)" }}>
                    {futureMetrics.net >= 0 ? "+" : ""}{futureMetrics.net}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>Cost Impact</span>
                  <span style={{ fontWeight: 700, color: futureMetrics.costImpact <= 0 ? "var(--success)" : "var(--risk)" }}>
                    {fmtNum(Math.abs(futureMetrics.costImpact), "currency")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginTop: 2 }}>
                  {futureMetrics.costImpact <= 0 ? "savings" : "increase"}
                </div>
              </div>
            </div>
          </Card>

          {/* Changes log */}
          {changes.length > 0 && (
            <Card title={`Changes (${changes.length})`}>
              <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {changes.map((ch, i) => (
                  <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 6px", borderRadius: 6, background: "var(--surface-2)" }}>
                    <Badge color={ch.type === "add" ? "green" : ch.type === "eliminate" ? "red" : ch.type === "modify" ? "amber" : "teal"}>
                      {ch.type.toUpperCase()}
                    </Badge>
                    <span style={{ flex: 1, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.type === "add" ? `"${ch.after.title || "role"}"`
                        : ch.type === "eliminate" ? `"${ch.before.title}"`
                        : ch.type === "modify" ? `"${ch.before.title}"`
                        : `Move ${ch.nodeId.slice(0, 8)}`}
                    </span>
                    <button onClick={() => setChanges(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notes for selected node */}
          {selectedNode && (() => {
            const nodeNotes = notesList.filter(n => n.context?.type === "role" && n.context?.id === selectedNode.id);
            return (
              <Card title={`Notes${nodeNotes.length > 0 ? ` (${nodeNotes.length})` : ""}`}>
                {nodeNotes.length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>
                    No notes for {selectedNode.name}. Use the Note button below to add one.
                  </div>
                ) : (
                  <div style={{ maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {nodeNotes.map((note, i) => (
                      <div key={note.id || i} style={{ padding: "6px 8px", borderRadius: 6, background: "var(--surface-2)", fontSize: 11 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                          <Badge color={
                            note.category === "risk" ? "red"
                              : note.category === "decision" ? "green"
                              : note.category === "action" ? "amber"
                              : "gray"
                          }>
                            {note.category?.replace(/_/g, " ") || "note"}
                          </Badge>
                          {note.created_at && (
                            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <div style={{
                          color: "var(--text-secondary)", lineHeight: 1.4,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}>
                          {note.note_text}
                        </div>
                        <button
                          onClick={() => { setActiveTab("notes"); }}
                          style={{ fontSize: 11, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 3, fontWeight: 500 }}
                        >View in Notes tab</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })()}
        </div>
      </div>
    );
  };

  /* ── Tab: Scenarios ── */
  const renderScenarios = () => {
    const sorted = [...savedScenarios].sort((a, b) => b.timestamp - a.timestamp);
    return (
      <div>
        <Card title={`Saved Scenarios (${savedScenarios.length})`}>
          {savedScenarios.length === 0 ? (
            <EmptyState icon={<Save size={28} />} headline="No saved scenarios" explanation="Use the Design tab to create org changes, then save them as a named scenario."
              primaryAction={{ label: "Go to Design", icon: <Pencil size={14} />, onClick: () => setActiveTab("design") }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", transition: "border-color 0.15s" }}
                  onClick={() => handleLoadScenario(s)}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-primary)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(244,168,58,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <GitBranch size={16} style={{ color: "var(--accent-primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span>{s.changes.length} change{s.changes.length !== 1 ? "s" : ""}</span>
                      <span>{"\u00B7"}</span><span>{s.managerName || "Unknown"}</span>
                      <span>{"\u00B7"}</span><span>{new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  {s.metrics && (
                    <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                      {([{ label: "HC", value: s.metrics.headcount }, { label: "Span", value: s.metrics.avgSpan.toFixed(1) }, { label: "Layers", value: s.metrics.layers }] as const).map(m => (
                        <div key={m.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--ff-mono)" }}>{m.value}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); setScenarioMenuOpen(scenarioMenuOpen === s.id ? null : s.id); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "none", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)" }}>
                      <MoreHorizontal size={14} />
                    </button>
                    {scenarioMenuOpen === s.id && (
                      <div style={{ position: "absolute", top: 32, right: 0, zIndex: 20, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 140, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDuplicateScenario(s)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", textAlign: "left" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <Copy size={13} /> Duplicate
                        </button>
                        <button onClick={() => handleDeleteScenario(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "var(--risk)", textAlign: "left" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,122,93,0.06)"; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  /* ── Helper: compute metrics for a scenario's changes applied to a tree ── */
  const computeScenarioMetrics = useCallback((scenarioChanges: ChangeEntry[], root: ReorgNode) => {
    const t = cloneTree(root); const all = flattenTree(t);
    for (const ch of scenarioChanges) {
      if (ch.type === "eliminate") { const nd = all.find(n => n.id === ch.nodeId); if (nd) nd.status = "eliminated"; }
      else if (ch.type === "modify") { const nd = all.find(n => n.id === ch.nodeId); if (nd) { if (ch.after.title) nd.title = ch.after.title; if (ch.after.level) nd.level = ch.after.level; nd.status = "modified"; } }
      else if (ch.type === "add") { const p = all.find(n => n.id === ch.after.managerId); if (p) { const nn: ReorgNode = { id: ch.nodeId, name: ch.after.name || "New Role", title: ch.after.title || "TBD", function: p.function, level: ch.after.level || "P3", track: (ch.after.level || "P3").charAt(0), managerId: p.id, children: [], comp: AVG_COMP[ch.after.level || "P3"] || 85000, tenure: 0, status: "added" }; p.children.push(nn); all.push(nn); } }
    }
    const act = all.filter(n => n.status !== "eliminated");
    const mgrs = act.filter(m => act.some(c => c.managerId === m.id));
    const spans = mgrs.map(m => act.filter(c => c.managerId === m.id).length);
    const aSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;
    const gD = (n: ReorgNode, d: number): number => { const k = n.children.filter(c => c.status !== "eliminated"); return k.length === 0 ? d : Math.max(...k.map(c => gD(c, d + 1))); };
    return { headcount: act.length, avgSpan: Math.round(aSpan * 10) / 10, layers: gD(t, 1), managers: mgrs.length, ics: act.length - mgrs.length, cost: act.reduce((s, n) => s + (n.comp || AVG_COMP[n.level] || 85000), 0) };
  }, []);

  /* ── Tab 3: Compare ── */
  const renderCompare = () => {
    const hasScenarios = savedScenarios.length >= 1;
    const selForCompare = savedScenarios.filter(s => compareSelection.includes(s.id));

    if (hasScenarios || (currentTree && changes.length > 0)) {
      const baseMet = currentTree ? (() => {
        const flat = flattenTree(currentTree);
        const mg = flat.filter(m => flat.some(c => c.managerId === m.id));
        const sp = mg.map(m => flat.filter(c => c.managerId === m.id).length);
        const as2 = sp.length > 0 ? sp.reduce((a, b) => a + b, 0) / sp.length : 0;
        const gD = (n: ReorgNode, d: number): number => n.children.length === 0 ? d : Math.max(...n.children.map(c => gD(c, d + 1)));
        return { headcount: flat.length, avgSpan: Math.round(as2 * 10) / 10, layers: gD(currentTree, 1), managers: mg.length, ics: flat.length - mg.length, cost: flat.reduce((s, n) => s + (n.comp || AVG_COMP[n.level] || 85000), 0) };
      })() : { headcount: 0, avgSpan: 0, layers: 0, managers: 0, ics: 0, cost: 0 };

      type CM = { headcount: number; avgSpan: number; layers: number; managers: number; ics: number; cost: number };
      const cItems: { name: string; metrics: CM }[] = [{ name: "Current State", metrics: baseMet }];
      if (changes.length > 0 && currentTree) cItems.push({ name: scenarioName || "Active (unsaved)", metrics: computeScenarioMetrics(changes, currentTree) });
      for (const s of selForCompare) {
        if (s.metrics) cItems.push({ name: s.name, metrics: { headcount: s.metrics.headcount, avgSpan: s.metrics.avgSpan, layers: s.metrics.layers, managers: s.metrics.managers, ics: s.metrics.ics, cost: s.metrics.costImpact + baseMet.cost } });
        else if (currentTree) cItems.push({ name: s.name, metrics: computeScenarioMetrics(s.changes, currentTree) });
      }

      const mDefs: { key: keyof CM; label: string; fmt: "int" | "decimal" | "currency"; better: "lower" | "neutral" }[] = [
        { key: "headcount", label: "Headcount", fmt: "int", better: "neutral" }, { key: "avgSpan", label: "Avg Span", fmt: "decimal", better: "neutral" },
        { key: "layers", label: "Layers", fmt: "int", better: "lower" }, { key: "managers", label: "Managers", fmt: "int", better: "lower" },
        { key: "ics", label: "ICs", fmt: "int", better: "neutral" }, { key: "cost", label: "Total Cost", fmt: "currency", better: "lower" },
      ];

      return (
        <div>
          {savedScenarios.length > 0 && (
            <Card title="Select Scenarios to Compare">
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Pick 2-4 saved scenarios to compare side-by-side. Current state is always shown as baseline.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {savedScenarios.map(s => {
                  const isSel = compareSelection.includes(s.id);
                  return (<button key={s.id} onClick={() => setCompareSelection(prev => { if (prev.includes(s.id)) return prev.filter(id => id !== s.id); if (prev.length >= 4) { showToast("Maximum 4 scenarios"); return prev; } return [...prev, s.id]; })}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 13, border: isSel ? "2px solid var(--accent-primary)" : "1px solid var(--border)", background: isSel ? "rgba(244,168,58,0.08)" : "#fff", color: isSel ? "var(--accent-primary)" : "var(--text-primary)", fontWeight: isSel ? 600 : 400, cursor: "pointer" }}>
                    {isSel && <Check size={13} />} {s.name} <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({s.changes.length})</span>
                  </button>);
                })}
              </div>
            </Card>
          )}
          {cItems.length >= 2 && (
            <Card title="Scenario Comparison">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>Metric</th>
                    {cItems.map((it, i) => <th key={i} style={{ textAlign: "right", padding: "8px 12px", color: i === 0 ? "var(--text-muted)" : "var(--text-primary)", fontWeight: 600, fontSize: 12, borderLeft: "1px solid var(--border)" }}>{it.name}</th>)}
                  </tr></thead>
                  <tbody>{mDefs.map(def => {
                    const vs = cItems.map(it => it.metrics[def.key]); const sv = vs.slice(1);
                    const best = def.better === "lower" ? Math.min(...sv) : null;
                    const worst = def.better === "lower" ? Math.max(...sv) : null;
                    return (<tr key={def.key} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 500 }}>{def.label}</td>
                      {cItems.map((it, i) => {
                        const v = it.metrics[def.key]; const isB = i === 0;
                        const isBest = !isB && best !== null && v === best && sv.length > 1;
                        const isWorst = !isB && worst !== null && v === worst && sv.length > 1 && best !== worst;
                        const fm = def.fmt === "currency" ? fmtNum(v, "currency") : def.fmt === "decimal" ? v.toFixed(1) : String(v);
                        return <td key={i} style={{ textAlign: "right", padding: "10px 12px", fontFamily: "var(--ff-mono)", fontWeight: 600, borderLeft: "1px solid var(--border)", color: isB ? "var(--text-muted)" : isBest ? "var(--success)" : isWorst ? "var(--risk)" : "var(--text-primary)", background: isBest ? "rgba(139,168,122,0.06)" : isWorst ? "rgba(232,122,93,0.04)" : "transparent" }}>{fm}</td>;
                      })}
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            </Card>
          )}
          {cItems.length < 2 && currentTree && futureTree && changes.length > 0 && (<>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <Card title="Current State"><div className="text-xs text-[var(--text-muted)] mb-3">{currentMetrics.hc} employees / {currentMetrics.directs} direct reports</div><div className="overflow-y-auto" style={{ maxHeight: 420 }}>{renderTree(currentTree, 0, false)}</div></Card>
              <Card title="Future State"><div className="text-xs text-[var(--text-muted)] mb-3">{futureMetrics.hc} employees / Net: {futureMetrics.net >= 0 ? "+" : ""}{futureMetrics.net}</div><div className="overflow-y-auto" style={{ maxHeight: 420 }}>{renderTree(futureTree, 0, false, true)}</div></Card>
            </div>
            <Card title="Changes Summary"><div className="flex items-center gap-6">
              {([{ label: "Added", count: changes.filter(c => c.type === "add").length, color: "var(--success)" }, { label: "Transitioning Out", count: changes.filter(c => c.type === "eliminate").length, color: "var(--risk)" }, { label: "Modified", count: changes.filter(c => c.type === "modify").length, color: "var(--warning)" }, { label: "Moved", count: changes.filter(c => c.type === "move").length, color: "var(--amber)" }] as const).map(item => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface-2)" }}><div className="w-3 h-3 rounded-full" style={{ background: item.color }} /><div><div className="text-lg font-bold font-data text-[var(--text-primary)]">{item.count}</div><div className="text-xs text-[var(--text-muted)]">{item.label}</div></div></div>
              ))}</div></Card>
          </>)}
          {cItems.length < 2 && changes.length === 0 && savedScenarios.length === 0 && (
            <Card><EmptyState icon={<Layers3 size={28} />} headline="Nothing to compare yet" explanation="Save at least two scenarios from the Design tab to compare them side-by-side."
              primaryAction={{ label: "Go to Design", icon: <Pencil size={14} />, onClick: () => setActiveTab("design") }} /></Card>
          )}
        </div>
      );
    }
    return (<Card><EmptyState icon={<Layers3 size={28} />} headline="Nothing to compare yet" explanation="Select a manager and make design changes in the Design tab to compare current vs. future state."
      primaryAction={{ label: "Go to Design", icon: <Pencil size={14} />, onClick: () => setActiveTab("design") }}
      secondaryAction={{ label: "Go to Org View", icon: <Network size={14} />, onClick: () => setActiveTab("org") }} /></Card>);
  };

  /* ── Tab 4: Impact ── */
  const renderImpact = () => {
    if (changes.length === 0) return (
      <Card>
        <EmptyState
          icon={<Gauge size={28} />}
          headline="No changes to analyze"
          explanation="Make design changes in the Design tab to see their impact analysis here."
          primaryAction={{
            label: "Go to Design",
            icon: <Pencil size={14} />,
            onClick: () => setActiveTab("design"),
          }}
        />
      </Card>
    );

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
              { type: "Transitioning Out", count: futureMetrics.eliminated, color: "var(--risk)" },
              { type: "Added", count: futureMetrics.added, color: "var(--success)" },
              { type: "Modified", count: changes.filter(c => c.type === "modify").length, color: "var(--warning)" },
              { type: "Moved", count: changes.filter(c => c.type === "move").length, color: "var(--amber)" },
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
                <TriangleAlert size={14} style={{ color: risk.color, marginTop: 2, flexShrink: 0 }} />
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

  /* ── Tab 5: Notes ── */
  const renderNotes = () => {
    // Build the role options for the "Attach to" dropdown
    const allRolesForAttach = futureTree ? flattenTree(futureTree).filter(n => n.status !== "eliminated") : [];
    const filteredAttachRoles = noteAttachSearch
      ? allRolesForAttach.filter(r => r.name.toLowerCase().includes(noteAttachSearch.toLowerCase()) || r.title.toLowerCase().includes(noteAttachSearch.toLowerCase()))
      : allRolesForAttach;

    // Filter notes by context type
    const contextFilteredNotes = notesContextFilter === "all"
      ? notesList
      : notesContextFilter === "general"
        ? notesList.filter(n => !n.context)
        : notesList.filter(n => n.context?.type === notesContextFilter);

    const contextLabel = (note: NoteEntry) => {
      if (!note.context) return "General";
      if (note.context.label) return note.context.label;
      if (note.context.type === "scenario") return `Scenario: ${note.context.id || ""}`;
      return note.context.id || note.context.type;
    };

    const contextBadgeColor = (note: NoteEntry): string => {
      if (!note.context) return "gray";
      switch (note.context.type) {
        case "role": return "teal";
        case "change": return "amber";
        case "scenario": return "purple" as any;
        default: return "gray";
      }
    };

    return (
      <div>
        {/* Search & filter bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <Search size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              placeholder="Search notes..." value={notesSearch} onChange={e => setNotesSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none"
            value={notesCategoryFilter} onChange={e => setNotesCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        {/* Context type filter pills */}
        <div className="flex items-center gap-2 mb-6">
          {NOTE_CONTEXT_FILTERS.map(f2 => (
            <button
              key={f2.value}
              onClick={() => setNotesContextFilter(f2.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: notesContextFilter === f2.value ? "var(--accent-primary)" : "var(--surface-2)",
                color: notesContextFilter === f2.value ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${notesContextFilter === f2.value ? "var(--accent-primary)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {f2.label}
            </button>
          ))}
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
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Attach to</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none"
                value={noteAttachTo}
                onChange={e => setNoteAttachTo(e.target.value)}
              >
                <option value="general">General (no specific element)</option>
                {scenarioName && <option value="__scenario__">Scenario: {scenarioName}</option>}
                <optgroup label="Roles">
                  {filteredAttachRoles.slice(0, 50).map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.title}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Skills Mentioned</label>
              <div className="flex items-center gap-2">
                <input className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" placeholder="Skill name" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} />
                <select className="w-16 px-2 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none" value={newSkillProf} onChange={e => setNewSkillProf(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={addSkillToNote} className="px-3 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1" style={{ background: "var(--accent-primary)" }}>
                  <Plus size={13} />
                </button>
              </div>
              {(newNote.skills || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(newNote.skills || []).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(244,168,58,0.15)", color: "var(--accent-primary)" }}>
                      {s.name} (L{s.proficiency})
                      <button onClick={() => setNewNote(p => ({ ...p, skills: (p.skills || []).filter((_, j) => j !== i) }))} className="hover:text-[var(--risk)]">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div />
          </div>
          <button onClick={handleCreateNote} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent-primary)" }}>
            Submit Note
          </button>
        </Card>

        {/* Notes list */}
        <Card title={`Notes (${contextFilteredNotes.length})`}>
          {notesLoading ? <LoadingSkeleton rows={3} /> : contextFilteredNotes.length === 0 ? (
            <EmptyState
              icon={<GitBranch size={28} />}
              headline="No notes yet"
              explanation="Add your first note using the form above to capture key insights from this restructuring exercise."
              primaryAction={{ label: "Add a note", icon: <Plus size={14} />, onClick: () => {} }}
            />
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {contextFilteredNotes.map((note, i) => (
                <div key={note.id || i} className="p-4 rounded-xl border border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{note.job_title}</span>
                      <Badge color={note.category === "pain_point" || note.category === "risk" ? "red" : note.category === "skills_update" || note.category === "decision" ? "green" : note.category === "action" ? "amber" : "gray"}>
                        {note.category?.replace(/_/g, " ") || "other"}
                      </Badge>
                      {/* Context badge */}
                      <Badge color={contextBadgeColor(note) as any}>
                        {contextLabel(note)}
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
                          <span key={j} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(139,168,122,0.1)", color: "var(--success)" }}>{s.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {note.created_at && <span className="text-xs text-[var(--text-muted)]">{new Date(note.created_at).toLocaleDateString()}</span>}
                    {note.id && note.status !== "confirmed" && note.status !== "rejected" && (
                      <>
                        <button onClick={() => handleConfirmNote(note.id!)} className="text-xs font-semibold text-[var(--success)] hover:underline ml-auto flex items-center gap-1"><Check size={11} /> Confirm</button>
                        <button onClick={() => handleRejectNote(note.id!)} className="text-xs font-semibold text-[var(--risk)] hover:underline flex items-center gap-1"><X size={11} /> Reject</button>
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
  };

  /* ── Main render ── */
  const kpis = orgData ? (orgData as any).kpis || {} : {};
  const selectedManagerName = employees.find(e => e.id === selectedManager)?.name;

  /* ── Recently worked on (from localStorage) ── */
  const recentScenarios = useMemo(() => {
    const items: { name: string; managerId: string; changeCount: number; lastEdited: number; savedId?: string }[] = [];
    // Add saved scenarios
    for (const s of savedScenarios) {
      items.push({ name: s.name, managerId: s.selectedManager, changeCount: s.changes.length, lastEdited: s.timestamp, savedId: s.id });
    }
    // Add current unsaved work if present
    if (typeof window !== "undefined" && changes.length > 0) {
      const lastTs = Math.max(...changes.map(c => c.timestamp));
      const alreadyListed = items.some(i => i.name === scenarioName && scenarioName);
      if (!alreadyListed) {
        items.push({ name: scenarioName || "Untitled scenario", managerId: selectedManager, changeCount: changes.length, lastEdited: lastTs });
      }
    }
    return items.sort((a, b) => b.lastEdited - a.lastEdited).slice(0, 5);
  }, [changes, scenarioName, selectedManager, savedScenarios]);

  /* ── Entry point renderer ── */
  const renderEntryPoint = () => {
    const cardBase: React.CSSProperties = {
      background: "#FFFFFF",
      border: "0.5px solid rgba(22,24,34,0.15)",
      borderRadius: 8,
      width: 260,
      minHeight: 180,
      padding: "24px 20px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "border-color 0.15s ease",
    };

    const cards: { icon: React.ReactNode; title: string; desc: string; action: () => void }[] = [
      {
        icon: <Eye size={24} style={{ color: "var(--navy, var(--paper-solid))" }} />,
        title: "Explore Current State",
        desc: "Load the org and see structure, patterns, and diagnostics",
        action: () => { setShowEntryPoint(false); setActiveTab("org"); },
      },
      {
        icon: <GitBranch size={24} style={{ color: "var(--navy, var(--paper-solid))" }} />,
        title: "Restructure a Team",
        desc: "Select a manager and redesign their team structure",
        action: () => { setShowEntryPoint(false); setActiveTab("design"); },
      },
      {
        icon: <Compass size={24} style={{ color: "var(--navy, var(--paper-solid))" }} />,
        title: "Design from Vision",
        desc: "Start from strategic direction and cascade top-down",
        action: () => { onNavigate?.("build"); },
      },
      {
        icon: <BarChart3 size={24} style={{ color: "var(--navy, var(--paper-solid))" }} />,
        title: "Apply a Template",
        desc: "Start from an industry benchmark template",
        action: () => { setShowEntryPoint(false); setActiveTab("org"); },
      },
    ];

    return (
      <div style={{ padding: 32 }}>
        <PageHeader
          icon={<Network size={20} />}
          title="Org Restructuring"
          subtitle="Design, compare, and evaluate organizational restructuring scenarios"
          onBack={onBack}
          viewCtx={viewCtx}
        />

        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 20, fontWeight: 600, color: "var(--navy, var(--paper-solid))",
            marginBottom: 24, marginTop: 16,
          }}>
            What are you trying to do?
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 40 }}>
            {cards.map((c) => (
              <div
                key={c.title}
                style={cardBase}
                onClick={c.action}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(22,24,34,0.40)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(22,24,34,0.15)"; }}
              >
                {c.icon}
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--navy, var(--paper-solid))" }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(22,24,34,0.55)", lineHeight: 1.45 }}>
                  {c.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Recently worked on */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: "var(--navy, var(--paper-solid))",
              marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.03em",
            }}>
              Recently worked on
            </h3>
            {recentScenarios.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {recentScenarios.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { if (s.savedId) { const saved = savedScenarios.find(sc => sc.id === s.savedId); if (saved) handleLoadScenario(saved); } else { setShowEntryPoint(false); setActiveTab("design"); } }}
                    style={{
                      background: "#FFFFFF",
                      border: "0.5px solid rgba(22,24,34,0.15)",
                      borderRadius: 8,
                      padding: "14px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(22,24,34,0.40)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(22,24,34,0.15)"; }}
                  >
                    <Clock size={16} style={{ color: "rgba(22,24,34,0.45)", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--navy, var(--paper-solid))" }}>
                        {s.name || "Untitled scenario"}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(22,24,34,0.55)", marginTop: 2 }}>
                        {s.changeCount} change{s.changeCount !== 1 ? "s" : ""}
                        {" \u00B7 "}
                        {new Date(s.lastEdited).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(22,24,34,0.45)" }}>No recent work</div>
            )}
          </div>

          {/* Module relationship note */}
          <div style={{
            fontSize: 13, color: "rgba(22,24,34,0.50)", lineHeight: 1.5,
            borderTop: "1px solid rgba(22,24,34,0.08)", paddingTop: 20,
          }}>
            This module handles tactical team-level restructuring. For strategic org-wide design with cascading layers, use{" "}
            <span
              onClick={() => onNavigate?.("build")}
              style={{ color: "var(--blue-primary, var(--amber))", cursor: "pointer", fontWeight: 500 }}
            >
              Org Design Studio &rarr;
            </span>
          </div>
        </div>
      </div>
    );
  };

  /* ── Main return ── */
  if (showEntryPoint) return renderEntryPoint();

  return (
    <div style={{ padding: 32 }}>
      <PageHeader
        icon={<Network size={20} />}
        title="Org Restructuring"
        subtitle="Design, compare, and evaluate organizational restructuring scenarios"
        onBack={onBack}
        viewCtx={viewCtx}
      />

      {/* Back to workflow selection link */}
      <div style={{ marginBottom: 8 }}>
        <span
          onClick={() => setShowEntryPoint(true)}
          style={{
            fontSize: 13, color: "var(--blue-primary, var(--amber))", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          <ChevronLeft size={13} /> Back to workflow selection
        </span>
      </div>

      <ContextStrip items={[
        `${employees.length} employees loaded`,
        `${managers.length} managers identified`,
        changes.length > 0 ? `${changes.length} changes proposed` : "No changes yet",
        selectedManagerName ? `${selectedManagerName} selected` : "No manager selected",
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
        {activeTab === "scenarios" && renderScenarios()}
        {activeTab === "compare" && renderCompare()}
        {activeTab === "impact" && renderImpact()}
        {activeTab === "notes" && renderNotes()}
      </div>

      <FlowNav
        previous={{ id: "build", label: "Org Design Studio", icon: <Network size={15} /> }}
        next={{ id: "reskill", label: "Reskilling Pathways", icon: <Users size={15} /> }}
        onNavigate={onNavigate || onBack}
      />
    </div>
  );
}

export default OrgRestructuring;
