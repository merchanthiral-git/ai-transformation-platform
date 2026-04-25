"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT,
  KpiCard, Card, Empty, Badge, InsightPanel, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ContextStrip,
  useApiData, usePersisted, useDebounce, callAI, showToast,
  ErrorBoundary, AiJobSuggestButton, AiJobSuggestion, ExpandableChart,
} from "./shared";
import { Layers3, Network } from "@/lib/icons";
import { FlowNav } from "@/app/ui";
import RoleDetailDrawer from "./ja/RoleDetailDrawer";

/* JA Mapping Module — lazy-loaded tab components for performance */
const ArchitectureMapTab = lazy(() => import("./ArchitectureMapTab").then(m => ({ default: m.ArchitectureMapTab })));
const JobContentAuthoring = lazy(() => import("./design/JobContentAuthoring").then(m => ({ default: m.JobContentAuthoring })));
const FrameworkBuilder = lazy(() => import("./ja/FrameworkBuilder"));
const CatalogueHealth = lazy(() => import("./ja/CatalogueHealth"));
const BulkImport = lazy(() => import("./ja/BulkImport"));
const MappingGrid = lazy(() => import("./ja/MappingGrid"));
const FlagRules = lazy(() => import("./ja/FlagRules"));
const OrgChartRedesign = lazy(() => import("./ja/OrgChart"));

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type TreeNode = { id: string; label: string; type: string; children?: TreeNode[]; headcount: number };
type Job = { id: string; title: string; level: string; track: string; function: string; family: string; sub_family: string; headcount: number; ai_score: number; ai_impact: string; tasks_mapped: number };
type Flag = { severity: string; category: string; title: string; description: string; affected: string; population: number };
type Employee = {
  id: string; name: string; title: string; function: string; family: string; sub_family: string;
  track: string; level: string; geography: string; manager: string; tenure: number;
  performance: string; flight_risk: string; ai_score: number; skills: string[];
  single_incumbent: boolean; redeployment_candidate: boolean;
};

/* ═══════════════════════════════════════════════════════════════
   TRACK COLOR SYSTEM — consistent across every tab
   ═══════════════════════════════════════════════════════════════ */

const TRACK_COLORS: Record<string, string> = {
  S: "#f4a83a", P: "#e8a050", M: "#a78bb8", E: "#e87a5d", T: "#a78bb8",
  Support: "#f4a83a", Professional: "#e8a050", Management: "#a78bb8", Executive: "#e87a5d", Technical: "#a78bb8",
  IC: "#e8a050", Manager: "#a78bb8",
};

function getTrackLetter(level: string): string {
  const m = level.match(/^([A-Z])/);
  return m ? m[1] : "P";
}

function getTrackColor(trackOrLevel: string): string {
  if (TRACK_COLORS[trackOrLevel]) return TRACK_COLORS[trackOrLevel];
  const letter = getTrackLetter(trackOrLevel);
  return TRACK_COLORS[letter] || "#e8a050";
}

/** Renders a consistent level badge pill everywhere */
function LevelBadge({ level, size = "sm" }: { level: string; size?: "sm" | "md" | "lg" }) {
  const color = getTrackColor(level);
  const sizes = { sm: "text-[10px] px-[7px] py-[2px]", md: "text-[12px] px-[9px] py-[3px]", lg: "text-[14px] px-[11px] py-[4px]" };
  return <span className={`inline-flex items-center rounded ${sizes[size]} font-bold`} style={{ fontFamily: "'JetBrains Mono', monospace", background: `${color}15`, border: `1px solid ${color}25`, color }}>{level}</span>;
}

/** Track dot with glow */
function TrackDot({ track, size = 8 }: { track: string; size?: number }) {
  const color = getTrackColor(track);
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: color, boxShadow: `0 0 6px ${color}40` }} />;
}

/* ═══════════════════════════════════════════════════════════════
   ORG CHART BUILDER — Visual interactive org chart
   ═══════════════════════════════════════════════════════════════ */

type OrgNode = { id: string; name: string; title: string; function: string; level: string; track: string; managerId: string; children: OrgNode[]; headcount: number; collapsed: boolean; performance: string; flightRisk: string };

const ORG_FUNC_COLORS: Record<string, string> = {
  Technology: "#f4a83a", Finance: "#f4a83a", HR: "#a78bb8", Operations: "#f4a83a",
  Marketing: "#e87a5d", Legal: "#e87a5d", Product: "#8ba87a", Sales: "#a78bb8",
  "Customer Service": "#8ba87a", Strategy: "#a78bb8", Risk: "#e87a5d", Executive: "#f4a83a",
};

function OrgChartBuilder({ employees, jobs }: { employees: Employee[]; jobs: Job[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<OrgNode[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [viewFromLayer, setViewFromLayer] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [funcFilter, setFuncFilter] = useState("All");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const MAX_VISIBLE_DEPTH = 4;

  // Build person-level org tree from employee data
  const orgTree = useMemo(() => {
    if (!employees.length) return [];
    const byName: Record<string, OrgNode> = {};
    employees.forEach(e => {
      byName[e.name] = { id: e.id, name: e.name, title: e.title, function: e.function, level: e.level, track: e.track, managerId: e.manager, children: [], headcount: 0, collapsed: false, performance: e.performance, flightRisk: e.flight_risk };
    });
    const roots: OrgNode[] = [];
    Object.values(byName).forEach(node => {
      const parent = byName[node.managerId];
      if (parent && parent.id !== node.id) { parent.children.push(node); }
      else { roots.push(node); }
    });
    const countHC = (n: OrgNode): number => { n.headcount = n.children.reduce((s, c) => s + countHC(c), 0) + 1; return n.headcount; };
    roots.forEach(r => countHC(r));
    const sortChildren = (n: OrgNode) => { n.children.sort((a, b) => b.headcount - a.headcount); n.children.forEach(sortChildren); };
    roots.forEach(sortChildren);
    return roots;
  }, [employees]);

  // Flat node lookup + parent map
  const { nodeById, parentOf } = useMemo(() => {
    const map: Record<string, OrgNode> = {};
    const pmap: Record<string, string> = {};
    const walk = (n: OrgNode) => { map[n.id] = n; n.children.forEach(c => { pmap[c.id] = n.id; walk(c); }); };
    orgTree.forEach(walk);
    return { nodeById: map, parentOf: pmap };
  }, [orgTree]);

  // Compute depth (layer) for each node
  const nodeDepth = useMemo(() => {
    const depths: Record<string, number> = {};
    const walk = (n: OrgNode, d: number) => { depths[n.id] = d; n.children.forEach(c => walk(c, d + 1)); };
    orgTree.forEach(r => walk(r, 0));
    return depths;
  }, [orgTree]);

  // Layer labels for the filter
  const layerLabels = useMemo(() => {
    const maxD = Math.max(0, ...Object.values(nodeDepth));
    const labels: string[] = [];
    for (let d = 0; d <= Math.min(maxD, 6); d++) {
      const nodesAtD = Object.entries(nodeDepth).filter(([, dep]) => dep === d).map(([id]) => nodeById[id]);
      const sample = nodesAtD[0];
      const label = d === 0 ? "CEO / Top" : d === 1 ? "C-Suite / SVPs" : d === 2 ? "VPs / Directors" : d === 3 ? "Managers" : `Layer ${d + 1}`;
      labels.push(`${label} (${nodesAtD.length})`);
    }
    return labels;
  }, [nodeDepth, nodeById]);

  // Get path from root to a specific node
  const getPathTo = useCallback((targetId: string): OrgNode[] => {
    const path: OrgNode[] = [];
    let cur = targetId;
    while (cur && nodeById[cur]) { path.unshift(nodeById[cur]); cur = parentOf[cur]; }
    return path;
  }, [nodeById, parentOf]);

  // Toggle expand/collapse of a node's children
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Search logic
  React.useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    const results: OrgNode[] = [];
    const walk = (n: OrgNode) => { if (n.name.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)) results.push(n); n.children.forEach(walk); };
    orgTree.forEach(walk);
    setSearchResults(results.slice(0, 15));
  }, [search, orgTree]);

  // When an employee is selected from search, expand the full path to them
  const selectEmployee = useCallback((id: string) => {
    const path = getPathTo(id);
    const newExpanded = new Set<string>();
    path.forEach(n => newExpanded.add(n.id));
    setExpandedIds(newExpanded);
    setSelectedId(id);
    setSearch("");
    setShowSearchDropdown(false);
  }, [getPathTo]);

  // Nodes visible at the root level (considering viewFromLayer)
  const rootNodes = useMemo(() => {
    if (viewFromLayer === 0) return orgTree;
    const nodesAtLayer: OrgNode[] = [];
    const walk = (n: OrgNode, d: number) => {
      if (d === viewFromLayer) { nodesAtLayer.push(n); return; }
      n.children.forEach(c => walk(c, d + 1));
    };
    orgTree.forEach(r => walk(r, 0));
    return nodesAtLayer;
  }, [orgTree, viewFromLayer]);

  // Filter by function — rebuild a HIERARCHICAL subtree for only that function
  const filteredRoots = useMemo(() => {
    if (funcFilter === "All") return rootNodes;

    // Step 1: Collect every node in the full tree into a flat lookup
    const allById: Record<string, OrgNode> = {};
    const walk = (n: OrgNode) => { allById[n.id] = n; n.children.forEach(walk); };
    rootNodes.forEach(walk);

    // Step 2: Find all nodes belonging to the selected function
    const funcMembers = Object.values(allById).filter(n => n.function === funcFilter);
    if (funcMembers.length === 0) return [];
    const funcIds = new Set(funcMembers.map(n => n.id));

    // Step 3: Rebuild tree among function members only.
    // For each function member, find their closest ANCESTOR who is also in the function.
    // This preserves the hierarchical reporting chain while skipping non-function intermediaries.
    const clones: Record<string, OrgNode> = {};
    for (const n of funcMembers) {
      clones[n.id] = { ...n, children: [], headcount: 1 };
    }

    const roots: OrgNode[] = [];
    for (const n of funcMembers) {
      // Walk up the original tree to find the nearest function ancestor
      let foundParent = false;
      let cur = allById[n.managerId];
      while (cur) {
        if (funcIds.has(cur.id)) {
          // This ancestor is in the function — attach as child
          clones[cur.id].children.push(clones[n.id]);
          foundParent = true;
          break;
        }
        cur = allById[cur.managerId];
      }
      if (!foundParent) {
        // No function ancestor — this is a root of the function subtree
        roots.push(clones[n.id]);
      }
    }

    // Step 4: Sort children by headcount (matching unfiltered behavior) and recount
    const recount = (n: OrgNode): number => {
      n.children.sort((a, b) => b.headcount - a.headcount);
      n.headcount = n.children.reduce((s, c) => s + recount(c), 0) + 1;
      return n.headcount;
    };
    roots.forEach(recount);

    // Sort roots by rank so the highest-ranking person is first
    const RANK: Record<string, number> = { E5:100,E4:90,E3:80,E2:70,E1:60,M6:58,M5:55,M4:50,M3:40,M2:30,M1:20,P8:18,P7:17,P6:16,P5:15,P4:14,P3:13,P2:12,P1:11,T8:18,T7:17,T6:16,T5:15,T4:14,T3:13,T2:12,T1:11,S6:10,S5:9,S4:8,S3:7,S2:6,S1:5 };
    roots.sort((a, b) => (RANK[b.level] || 0) - (RANK[a.level] || 0));

    return roots;
  }, [rootNodes, funcFilter]);

  // Breadcrumb path for selected employee
  const breadcrumb = useMemo(() => selectedId ? getPathTo(selectedId) : [], [selectedId, getPathTo]);

  // Span of control color
  const spanColor = (n: OrgNode) => {
    const d = n.children.length;
    if (d === 0) return "var(--text-muted)";
    return d <= 3 ? "var(--warning)" : d <= 8 ? "var(--success)" : d <= 12 ? "var(--warning)" : "var(--risk)";
  };

  // ── Canvas state ──
  const NODE_W = 210, NODE_H = 84, H_GAP = 28, V_GAP = 72, CORNER_R = 10;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const didAutoFit = useRef(false);

  // Auto-expand root nodes to show 2 levels by default
  useEffect(() => {
    if (orgTree.length > 0 && expandedIds.size === 0) {
      const initial = new Set<string>();
      orgTree.forEach(r => initial.add(r.id));
      setExpandedIds(initial);
    }
  }, [orgTree]);

  // ── Tree layout algorithm ──
  const layout = useMemo(() => {
    const positions: Record<string, { x: number; y: number; cx: number }> = {};
    const edges: { parentId: string; childIds: string[] }[] = [];
    const visChildren = (n: OrgNode): OrgNode[] =>
      expandedIds.has(n.id) && (nodeDepth[n.id] || 0) - viewFromLayer < MAX_VISIBLE_DEPTH - 1
        ? n.children : [];

    // Phase 1: compute subtree widths bottom-up
    const wCache: Record<string, number> = {};
    const subtreeW = (n: OrgNode): number => {
      if (wCache[n.id] != null) return wCache[n.id];
      const kids = visChildren(n);
      if (kids.length === 0) { wCache[n.id] = NODE_W; return NODE_W; }
      const w = kids.reduce((s, c) => s + subtreeW(c), 0) + H_GAP * (kids.length - 1);
      wCache[n.id] = Math.max(NODE_W, w);
      return wCache[n.id];
    };

    // Phase 2: assign positions top-down
    const place = (n: OrgNode, left: number, depth: number) => {
      const w = subtreeW(n);
      const cx = left + w / 2;
      positions[n.id] = { x: cx - NODE_W / 2, y: depth * (NODE_H + V_GAP), cx };
      const kids = visChildren(n);
      if (kids.length > 0) {
        edges.push({ parentId: n.id, childIds: kids.map(c => c.id) });
        let childLeft = left;
        kids.forEach(c => { place(c, childLeft, depth + 1); childLeft += subtreeW(c) + H_GAP; });
      }
    };

    let left = 0;
    filteredRoots.forEach(root => { place(root, left, 0); left += subtreeW(root) + H_GAP * 3; });

    // Bounds
    const all = Object.values(positions);
    const bounds = all.length > 0 ? {
      minX: Math.min(...all.map(p => p.x)) - 60,
      minY: Math.min(...all.map(p => p.y)) - 40,
      maxX: Math.max(...all.map(p => p.x + NODE_W)) + 60,
      maxY: Math.max(...all.map(p => p.y + NODE_H)) + 60,
    } : { minX: 0, minY: 0, maxX: 800, maxY: 600 };

    return { positions, edges, bounds, w: bounds.maxX - bounds.minX, h: bounds.maxY - bounds.minY };
  }, [filteredRoots, expandedIds, nodeDepth, viewFromLayer]);

  // ── SVG connector paths ──
  const connectorPaths = useMemo(() => {
    const paths: string[] = [];
    layout.edges.forEach(({ parentId, childIds }) => {
      const pp = layout.positions[parentId];
      if (!pp) return;
      const children = childIds.map(id => layout.positions[id]).filter(Boolean);
      if (children.length === 0) return;
      const fromX = pp.cx, fromY = pp.y + NODE_H;
      const midY = fromY + V_GAP / 2;

      // Vertical stub from parent bottom
      paths.push(`M ${fromX} ${fromY} L ${fromX} ${midY}`);

      if (children.length === 1 && Math.abs(children[0].cx - fromX) < 1) {
        // Single centered child — straight line
        paths.push(`M ${fromX} ${midY} L ${children[0].cx} ${children[0].y}`);
      } else {
        // Horizontal bus line
        const lx = Math.min(...children.map(c => c.cx));
        const rx = Math.max(...children.map(c => c.cx));
        paths.push(`M ${lx} ${midY} L ${rx} ${midY}`);
        // Drop to each child
        children.forEach(cp => paths.push(`M ${cp.cx} ${midY} L ${cp.cx} ${cp.y}`));
      }
    });
    return paths.join(" ");
  }, [layout]);

  // ── Fit to screen ──
  const fitToScreen = useCallback(() => {
    if (!canvasRef.current) return;
    const { width: cw, height: ch } = canvasRef.current.getBoundingClientRect();
    const { w: tw, h: th, bounds } = layout;
    if (tw === 0 || th === 0) return;
    const scale = Math.min(cw / tw, ch / th, 1.5) * 0.88;
    setZoom(scale);
    setPan({
      x: cw / 2 - (bounds.minX + tw / 2) * scale,
      y: 30 - bounds.minY * scale,
    });
  }, [layout]);

  // Auto-fit on first meaningful layout
  useEffect(() => {
    if (Object.keys(layout.positions).length > 0 && !didAutoFit.current) {
      didAutoFit.current = true;
      setTimeout(fitToScreen, 50);
    }
  }, [layout, fitToScreen]);

  // ── Canvas interaction handlers ──
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".org-node-card")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.preventDefault();
  }, [pan]);

  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const onCanvasMouseUp = useCallback(() => setIsDragging(false), []);

  const onCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const d = -e.deltaY * 0.001;
    const nz = Math.min(2.5, Math.max(0.12, zoom + d));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const s = nz / zoom;
      setPan({ x: mx - (mx - pan.x) * s, y: my - (my - pan.y) * s });
    }
    setZoom(nz);
  }, [zoom, pan]);

  // Attach wheel listener (non-passive for preventDefault)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", onCanvasWheel as unknown as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", onCanvasWheel as unknown as EventListener);
  }, [onCanvasWheel]);

  if (!employees.length) return <div className="text-center py-20"><div className="text-[40px] mb-3">🏢</div><div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Employee Data</div><div className="text-[14px] text-[var(--text-muted)]">Upload workforce data with Manager ID fields to generate the org chart.</div></div>;

  return <div className="animate-tab-enter">
    {/* ── Toolbar ── */}
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {/* Search with dropdown */}
      <div className="relative">
        <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setShowSearchDropdown(true); }} onFocus={() => { if (search) setShowSearchDropdown(true); }} onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)} placeholder="Search employee..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] w-56" />
        {showSearchDropdown && searchResults.length > 0 && <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg z-50 max-h-[280px] overflow-y-auto" style={{ backdropFilter: "blur(20px)" }}>
          {searchResults.map(r => <button key={r.id} onClick={() => selectEmployee(r.id)} className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] transition-colors flex items-center gap-2 border-b border-[var(--border)] last:border-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: ORG_FUNC_COLORS[r.function] || "#888" }}>{r.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
            <div className="min-w-0"><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{r.name}</div><div className="text-[11px] text-[var(--text-muted)] truncate">{r.title} · {r.function}</div></div>
          </button>)}
        </div>}
      </div>
      {/* Layer filter */}
      <select value={viewFromLayer} onChange={e => { setViewFromLayer(Number(e.target.value)); setExpandedIds(new Set()); setSelectedId(null); }} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none">
        {layerLabels.map((label, i) => <option key={i} value={i}>View from: {label}</option>)}
      </select>
      {/* Function filter */}
      <select value={funcFilter} onChange={e => setFuncFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none">
        <option value="All">All Functions</option>{Array.from(new Set(employees.map(e => e.function))).sort().map(f => <option key={f}>{f}</option>)}
      </select>
      {/* Quick actions */}
      <div className="flex gap-1 ml-auto">
        <button onClick={fitToScreen} className="px-2 py-1 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)] transition-colors">Fit</button>
        <button onClick={() => { setExpandedIds(new Set()); setSelectedId(null); setViewFromLayer(0); didAutoFit.current = false; }} className="px-2 py-1 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Reset</button>
      </div>
    </div>

    {/* ── Breadcrumb (chain of command) ── */}
    {breadcrumb.length > 1 && <div className="flex items-center gap-1 mb-3 px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mr-1">Chain:</span>
      {breadcrumb.map((n, i) => <React.Fragment key={n.id}>
        {i > 0 && <span className="text-[var(--text-muted)] text-[12px]">→</span>}
        <button onClick={() => selectEmployee(n.id)} className="text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--hover)]" style={{ color: i === breadcrumb.length - 1 ? "var(--accent-primary)" : "var(--text-muted)" }}>{n.name}<span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">({n.title})</span></button>
      </React.Fragment>)}
    </div>}

    {/* ── Canvas + Detail panel ── */}
    <div className="flex gap-4" style={{ minHeight: 550 }}>
      {/* Pannable / zoomable canvas */}
      <div
        ref={canvasRef}
        className="flex-1 rounded-xl border border-[var(--border)] overflow-hidden relative select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab", background: "var(--surface-1)", maxHeight: "calc(100vh - 280px)", minHeight: 500 }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        {/* Dot grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* Transform container — all nodes and lines live here */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0, willChange: "transform" }}>
          {/* SVG connector lines */}
          <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: layout.bounds.maxX + 200, height: layout.bounds.maxY + 200, overflow: "visible" }}>
            <path d={connectorPaths} fill="none" stroke="rgba(148,163,194,0.28)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Node cards */}
          {Object.entries(layout.positions).map(([id, pos]) => {
            const node = nodeById[id];
            if (!node) return null;
            const funcColor = ORG_FUNC_COLORS[node.function] || "#888";
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedIds.has(id);
            const isSelected = selectedId === id;
            const isHovered = hoveredId === id;
            const onPath = breadcrumb.some(b => b.id === id);
            const dimmed = selectedId && !onPath && breadcrumb.length > 0;
            const initials = node.name.split(" ").map(w => w[0]).join("").slice(0, 2);

            return <div key={id} className="org-node-card absolute" style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H, opacity: dimmed ? 0.18 : 1, transition: "opacity 0.2s, transform 0.15s", transform: isHovered ? "translateY(-2px)" : "none", zIndex: isSelected ? 10 : isHovered ? 5 : 1 }}>
              <div
                className="w-full h-full rounded-lg border cursor-pointer"
                onClick={e => { e.stopPropagation(); if (hasChildren) toggleExpand(id); setSelectedId(id); }}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: isSelected ? "rgba(244,168,58,0.12)" : "rgba(22,24,34,0.92)",
                  borderColor: isSelected ? "var(--accent-primary)" : `${funcColor}35`,
                  borderLeftWidth: 3, borderLeftColor: funcColor,
                  boxShadow: isSelected ? "0 0 24px rgba(244,168,58,0.2), 0 4px 16px rgba(0,0,0,0.4)" : isHovered ? "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)" : "0 2px 8px rgba(0,0,0,0.25)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-2.5 px-3 h-full">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${funcColor}, ${funcColor}90)`, boxShadow: `0 2px 6px ${funcColor}30` }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight">{node.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{node.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${funcColor}15`, color: funcColor }}>{node.function.length > 12 ? node.function.slice(0, 10) + "…" : node.function}</span>
                      {node.level && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]">{node.level}</span>}
                    </div>
                  </div>
                  {hasChildren && <div className="flex flex-col items-center shrink-0">
                    <span className="text-[10px] font-bold" style={{ color: funcColor }}>{node.headcount - 1}</span>
                    <span className="text-[14px] transition-transform" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
                  </div>}
                </div>
              </div>
            </div>;
          })}

          {filteredRoots.length === 0 && <div className="absolute" style={{ top: 80, left: 100 }}><div className="text-[var(--text-muted)] text-center py-12">No employees match the current filters</div></div>}
        </div>

        {/* Zoom controls — bottom-left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg p-1 z-20 border border-[var(--border)]" style={{ background: "rgba(22,24,34,0.85)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => { const nz = Math.min(2.5, zoom + 0.15); setPan(p => ({ x: p.x * (nz / zoom), y: p.y * (nz / zoom) })); setZoom(nz); }} className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] text-[16px] font-bold">+</button>
          <span className="text-[11px] text-[var(--text-muted)] px-1 min-w-[36px] text-center font-data">{Math.round(zoom * 100)}%</span>
          <button onClick={() => { const nz = Math.max(0.12, zoom - 0.15); setPan(p => ({ x: p.x * (nz / zoom), y: p.y * (nz / zoom) })); setZoom(nz); }} className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] text-[16px] font-bold">−</button>
          <div className="w-px h-4 bg-[var(--border)] mx-0.5" />
          <button onClick={fitToScreen} className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] text-[12px]" title="Fit to screen">⊞</button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && nodeById[selectedId] && (() => {
        const sn = nodeById[selectedId];
        return <div className="w-72 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[16px] font-bold text-[var(--text-primary)]">{sn.name}</div>
            <button onClick={() => setSelectedId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[18px]">×</button>
          </div>
          <div className="space-y-3">
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Title</div><div className="text-[14px] text-[var(--text-primary)] font-semibold">{sn.title}</div></div>
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Function</div><div className="text-[14px] font-semibold" style={{ color: ORG_FUNC_COLORS[sn.function] || "#888" }}>{sn.function}</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Level</div><div className="text-[14px] text-[var(--text-primary)]">{sn.level}</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Track</div><div className="text-[14px] text-[var(--text-primary)]">{sn.track}</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Reports to</div><div className="text-[14px] text-[var(--text-primary)]">{sn.managerId || "—"}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Performance</div><div className="text-[14px] font-semibold" style={{ color: sn.performance === "Exceeds" ? "var(--success)" : sn.performance === "Meets" ? "var(--accent-primary)" : "var(--warning)" }}>{sn.performance || "—"}</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Flight Risk</div><div className="text-[14px] font-semibold" style={{ color: sn.flightRisk === "High" ? "var(--risk)" : sn.flightRisk === "Medium" ? "var(--warning)" : "var(--success)" }}>{sn.flightRisk || "—"}</div></div>
            </div>
            {sn.children.length > 0 && <>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Span of Control</div><div className="text-[14px] font-bold" style={{ color: spanColor(sn) }}>{sn.children.length} direct reports</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Total Organization</div><div className="text-[14px] text-[var(--text-primary)]">{sn.headcount - 1} people</div></div>
              <div><div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Direct Reports</div><div className="space-y-1 max-h-[200px] overflow-y-auto">{sn.children.map(c => <button key={c.id} onClick={() => selectEmployee(c.id)} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--bg)] transition-all flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ORG_FUNC_COLORS[c.function] || "#888" }} />
                <div className="min-w-0"><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{c.name}</div><div className="text-[11px] text-[var(--text-muted)] truncate">{c.title} · {c.children.length > 0 ? `${c.headcount - 1} below` : "IC"}</div></div>
              </button>)}</div></div>
            </>}
          </div>
        </div>;
      })()}
    </div>

    {/* Function legend */}
    <div className="flex gap-2 flex-wrap mt-3">{Array.from(new Set(employees.map(e => e.function))).sort().map(f => <span key={f} className="flex items-center gap-1 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ORG_FUNC_COLORS[f] || "#888" }} /><span style={{ color: ORG_FUNC_COLORS[f] || "#888" }}>{f}</span></span>)}</div>

    {/* Animations */}
    <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JOB PROFILE LIBRARY — AI-generated job descriptions
   ═══════════════════════════════════════════════════════════════ */

type JobProfile = {
  purpose: string; responsibilities: string[]; skills: { technical: string[]; functional: string[]; leadership: string[]; digital: string[] };
  experience: string; kpis: string[]; reportsTo: string; manages: string; careerPath: string[]; aiImpact: string;
};

const JP_TEMPLATES: Record<string, Partial<JobProfile>> = {
  "Software Engineer": { purpose: "Design, develop, and maintain software applications that deliver business value.", responsibilities: ["Write clean, maintainable code following best practices", "Participate in code reviews and technical design", "Collaborate with product managers on requirements", "Build and maintain CI/CD pipelines", "Debug and resolve production issues", "Mentor junior engineers"], skills: { technical: ["Python", "JavaScript/TypeScript", "SQL", "Cloud (AWS/GCP)", "Git"], functional: ["Agile methodology", "System design", "Testing"], leadership: ["Mentoring", "Technical communication"], digital: ["AI/ML basics", "DevOps", "API design"] }, experience: "3-5 years in software development", kpis: ["Code quality (bug rate)", "Sprint velocity", "Deployment frequency", "Customer satisfaction"], careerPath: ["Senior Software Engineer", "Staff Engineer", "Engineering Manager"] },
  "Data Scientist": { purpose: "Apply statistical and machine learning methods to extract insights from data and build predictive models.", responsibilities: ["Develop ML models for business problems", "Clean, transform, and analyze large datasets", "Present findings to stakeholders", "Collaborate with engineering on model deployment", "Design A/B tests and experiments"], skills: { technical: ["Python", "R", "SQL", "TensorFlow/PyTorch"], functional: ["Statistics", "Experiment design", "Data visualization"], leadership: ["Stakeholder management"], digital: ["MLOps", "Cloud ML services"] }, experience: "3-5 years in data science or analytics", kpis: ["Model accuracy", "Business impact of insights", "Experiment success rate"], careerPath: ["Senior Data Scientist", "Lead Data Scientist", "Head of Data Science"] },
  "Financial Analyst": { purpose: "Provide financial analysis, forecasting, and decision support to drive informed business decisions.", responsibilities: ["Build financial models and forecasts", "Analyze variance to budget and prior year", "Prepare monthly financial reports", "Support budget planning process", "Conduct ad-hoc financial analysis"], skills: { technical: ["Excel/Financial modeling", "SQL", "BI tools"], functional: ["GAAP/IFRS", "Budgeting", "Forecasting"], leadership: ["Presentation skills"], digital: ["ERP systems", "Automation tools"] }, experience: "2-4 years in finance or accounting", kpis: ["Forecast accuracy", "Report timeliness", "Analysis turnaround time"], careerPath: ["Senior Financial Analyst", "FP&A Manager", "Finance Director"] },
  "HR Business Partner": { purpose: "Partner with business leaders to align people strategy with business objectives.", responsibilities: ["Advise leaders on talent strategy", "Drive organizational effectiveness", "Support workforce planning", "Manage employee relations", "Lead change management initiatives", "Analyze people data for insights"], skills: { technical: ["HRIS systems", "People analytics"], functional: ["Employment law", "Organizational design", "Compensation"], leadership: ["Coaching", "Influence", "Conflict resolution"], digital: ["HR tech", "Data analysis"] }, experience: "5-8 years in HR with business partnering experience", kpis: ["Employee engagement score", "Turnover rate", "Time-to-fill", "Manager satisfaction"], careerPath: ["Senior HRBP", "HR Director", "VP of People"] },
  "Product Manager": { purpose: "Define product vision and strategy, prioritize features, and drive product development to market success.", responsibilities: ["Define product roadmap and strategy", "Gather and prioritize requirements", "Work with engineering and design teams", "Analyze market and competitive landscape", "Define success metrics and track KPIs", "Conduct user research"], skills: { technical: ["SQL", "Analytics tools", "Prototyping"], functional: ["Market research", "Roadmap planning", "Agile/Scrum"], leadership: ["Cross-functional leadership", "Stakeholder management"], digital: ["A/B testing", "Product analytics"] }, experience: "3-6 years in product management or related field", kpis: ["Feature adoption rate", "Customer NPS", "Revenue impact", "Time-to-market"], careerPath: ["Senior PM", "Group PM", "VP Product", "CPO"] },
  "Operations Manager": { purpose: "Oversee daily operations, optimize processes, and ensure efficient delivery of services.", responsibilities: ["Manage operational teams and workflows", "Identify and implement process improvements", "Monitor KPIs and operational metrics", "Manage vendor relationships", "Ensure compliance with standards", "Lead capacity planning"], skills: { technical: ["Process mapping tools", "ERP systems"], functional: ["Lean/Six Sigma", "Supply chain", "Quality management"], leadership: ["Team management", "Problem-solving"], digital: ["Automation", "Analytics"] }, experience: "5-7 years in operations management", kpis: ["Operational efficiency", "Cost per unit", "Quality metrics", "SLA compliance"], careerPath: ["Senior Operations Manager", "Director of Operations", "VP Operations", "COO"] },
};

function JobProfileLibrary({ jobs, model }: { jobs: Job[]; model: string }) {
  const [profiles, setProfiles] = usePersisted<Record<string, JobProfile>>(`${model}_job_profiles`, {});
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFunc, setFilterFunc] = useState("All");
  const [filterTrack, setFilterTrack] = useState("All");
  const [filterComplete, setFilterComplete] = useState("All");
  const [groupBy, setGroupBy] = useState<"flat" | "function" | "level">("flat");
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareJobs, setCompareJobs] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ qualifications: false, metadata: false });

  const emptyProfile: JobProfile = { purpose: "", responsibilities: [], skills: { technical: [], functional: [], leadership: [], digital: [] }, experience: "", kpis: [], reportsTo: "", manages: "", careerPath: [], aiImpact: "" };

  const getProfile = (jobId: string) => profiles[jobId] || emptyProfile;
  const completeness = (jobId: string): number => {
    const p = getProfile(jobId);
    const fields = [p.purpose, p.responsibilities.length > 0, p.skills.technical.length > 0, p.experience, p.kpis.length > 0, p.reportsTo, p.careerPath.length > 0, p.aiImpact];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };
  const statusBadge = (jobId: string) => {
    const pct = completeness(jobId);
    if (pct >= 90) return { label: "Complete", color: "var(--success)" };
    if (pct > 0) return { label: "Draft", color: "var(--warning)" };
    return { label: "Empty", color: "var(--text-muted)" };
  };

  const updateProfile = (jobId: string, field: string, value: unknown) => {
    setProfiles(prev => ({ ...prev, [jobId]: { ...getProfile(jobId), [field]: value } }));
  };

  // AI Generate
  const generateProfile = async (job: Job) => {
    setGenerating(true);
    try {
      const prompt = `Generate a complete job profile for "${job.title}" in the ${job.function} function at career level ${job.level} (${job.track} track). Return ONLY valid JSON: {"purpose":"2-3 sentences","responsibilities":["8 specific responsibilities"],"skills":{"technical":["5 skills"],"functional":["4 skills"],"leadership":["3 skills"],"digital":["3 skills"]},"experience":"years and requirements","kpis":["5 measurable KPIs"],"reportsTo":"typical reporting title","manages":"description of reports","careerPath":["3-4 next moves"],"aiImpact":"2-3 sentences on which responsibilities are automatable/augmentable"}`;
      const raw = await callAI("You are an HR expert. Generate realistic, specific job profiles — not generic descriptions.", prompt);
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      if (parsed.purpose) setProfiles(prev => ({ ...prev, [job.id]: { ...emptyProfile, ...parsed } }));
    } catch { showToast("Couldn't generate content — try again in a moment"); }
    setGenerating(false);
  };

  const bulkGenerate = async () => {
    const empty = jobs.filter(j => completeness(j.id) === 0);
    if (empty.length === 0) { showToast("All profiles already have content"); return; }
    setBulkGenerating(true); setBulkProgress(0);
    for (let i = 0; i < Math.min(empty.length, 20); i++) {
      await generateProfile(empty[i]);
      setBulkProgress(Math.round(((i + 1) / Math.min(empty.length, 20)) * 100));
    }
    setBulkGenerating(false); showToast(`Generated ${Math.min(empty.length, 20)} profiles`);
  };

  // Apply template
  const applyTemplate = (jobId: string, templateKey: string) => {
    const tmpl = JP_TEMPLATES[templateKey];
    if (tmpl) {
      setProfiles(prev => ({ ...prev, [jobId]: { ...emptyProfile, ...tmpl } as JobProfile }));
      showToast(`Applied ${templateKey} template`);
    }
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter(j => j.title.toLowerCase().includes(q) || j.function.toLowerCase().includes(q)); }
    if (filterFunc !== "All") result = result.filter(j => j.function === filterFunc);
    if (filterComplete === "Complete") result = result.filter(j => completeness(j.id) >= 90);
    else if (filterComplete === "Draft") result = result.filter(j => { const c = completeness(j.id); return c > 0 && c < 90; });
    else if (filterComplete === "Empty") result = result.filter(j => completeness(j.id) === 0);
    if (filterTrack !== "All") result = result.filter(j => j.track === filterTrack);
    return result;
  }, [jobs, searchQuery, filterFunc, filterTrack, filterComplete, profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grouped roles for the left panel
  const groupedJobs = useMemo(() => {
    if (groupBy === "flat") return [{ key: "", label: "", jobs: filteredJobs }];
    const groups: Record<string, Job[]> = {};
    filteredJobs.forEach(j => {
      const k = groupBy === "function" ? j.function : j.level;
      if (!groups[k]) groups[k] = [];
      groups[k].push(j);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, label: k, jobs: v }));
  }, [filteredJobs, groupBy]);

  // Summary stats
  const complete = jobs.filter(j => completeness(j.id) >= 90).length;
  const drafts = jobs.filter(j => { const c = completeness(j.id); return c > 0 && c < 90; }).length;
  const emptyCount = jobs.filter(j => completeness(j.id) === 0).length;

  const TRACK_DOTS: Record<string, string> = { S: "#f4a83a", P: "#e8a050", M: "#a78bb8", E: "#e87a5d", T: "#a78bb8" };
  const MONO = "'JetBrains Mono', monospace";
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedProfile = selectedJobId ? getProfile(selectedJobId) : emptyProfile;

  // Editable sub-components
  const EditableList = ({ items, field, placeholder }: { items: string[]; field: string; placeholder: string }) => {
    const [adding, setAdding] = useState(false);
    const [newItem, setNewItem] = useState("");
    const jid = selectedJobId || "";
    return <div>
      <div className="space-y-1">{items.map((item, i) => <div key={i} className="flex items-center gap-2 group text-[13px]"><span className="text-[var(--accent-primary)]">{i + 1}.</span><span className="text-[var(--text-secondary)] flex-1">{item}</span><button onClick={() => updateProfile(jid, field, items.filter((_, idx) => idx !== i))} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] text-[11px]">×</button></div>)}</div>
      {adding ? <div className="flex gap-2 mt-2"><input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) { updateProfile(jid, field, [...items, newItem.trim()]); setNewItem(""); } if (e.key === "Escape") setAdding(false); }} placeholder={placeholder} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" autoFocus /><button onClick={() => setAdding(false)} className="text-[12px] text-[var(--text-muted)]">Done</button></div> : <button onClick={() => setAdding(true)} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">+ Add</button>}
    </div>;
  };
  const EditableText = ({ value, field, placeholder, multiline }: { value: string; field: string; placeholder: string; multiline?: boolean }) => {
    const jid = selectedJobId || "";
    const isEditing = editingField === `${jid}_${field}`;
    if (isEditing) {
      const El = multiline ? "textarea" : "input";
      return <El value={value} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateProfile(jid, field, e.target.value)} onBlur={() => setEditingField(null)} className={`w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none ${multiline ? "resize-none" : ""}`} rows={multiline ? 3 : undefined} autoFocus />;
    }
    return <div onClick={() => setEditingField(`${jid}_${field}`)} className="text-[13px] cursor-pointer hover:bg-[var(--surface-2)] rounded-lg px-2 py-1 -mx-2 transition-all" style={{ color: value ? "var(--text-secondary)" : "var(--text-muted)", lineHeight: 1.6 }}>{value || placeholder}</div>;
  };
  const EmptyPlaceholder = ({ text }: { text: string }) => <div style={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8, padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>{text}</div>;
  const SectionHead = ({ label }: { label: string }) => <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, marginTop: 20 }}><span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{label}</span><div style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--border), transparent)" }} /></div>;

  // Compare view
  if (showCompare && compareJobs.length >= 2) {
    const compJobs = compareJobs.map(id => jobs.find(j => j.id === id)).filter(Boolean) as Job[];
    return <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Job Profile Comparison</div>
        <button onClick={() => { setShowCompare(false); setCompareJobs([]); }} style={{ fontSize: 13, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${compJobs.length}, 1fr)`, gap: 16 }}>
        {compJobs.map(job => {
          const p = getProfile(job.id);
          return <div key={job.id} style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{job.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>{job.function} · {job.level} · {job.track}</div>
            <SectionHead label="Purpose" /><div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.purpose || "—"}</div>
            <SectionHead label="Responsibilities" />{p.responsibilities.slice(0, 5).map((r, i) => <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>{i+1}. {r}</div>)}
            <SectionHead label="Skills" /><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{[...p.skills.technical, ...p.skills.functional].slice(0, 8).map((s, i) => <span key={i} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, background: "var(--border-light)", color: "var(--text-secondary)" }}>{s}</span>)}</div>
          </div>;
        })}
      </div>
    </div>;
  }

  // Template modal
  const templateModal = showTemplates ? <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
    <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] max-w-[800px] w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4"><div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Job Profile Templates</div><button onClick={() => setShowTemplates(false)} style={{ fontSize: 20, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>×</button></div>
      <div className="grid grid-cols-2 gap-3">{Object.entries(JP_TEMPLATES).map(([key, tmpl]) => <div key={key} style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{key}</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>{(tmpl.purpose || "").slice(0, 100)}</div>
        <select onChange={e => { if (e.target.value) { applyTemplate(e.target.value, key); setShowTemplates(false); } }} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none"><option value="">Apply template to job...</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
      </div>)}</div>
    </div>
  </div> : null;

  // ═══ MAIN SPLIT-PANEL LAYOUT ═══
  return <div style={{ display: "flex", gap: 0, minHeight: 600, position: "relative" }}>
    {templateModal}
    {bulkGenerating && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 10, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: "var(--accent-primary)", transition: "width 0.3s", width: `${bulkProgress}%` }} /></div>}

    {/* ═══ LEFT PANEL — Role list ═══ */}
    <div style={{ width: "clamp(260px, 22vw, 320px)", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.15)", borderRadius: "12px 0 0 12px", overflow: "hidden" }}>
      {/* Search */}
      <div style={{ padding: "12px 12px 0" }}>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={`Search ${jobs.length} roles...`} style={{ width: "100%", padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
      </div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", flexWrap: "wrap" }}>
        <select value={filterFunc} onChange={e => setFilterFunc(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 11, outline: "none" }}><option value="All">All Functions</option>{Array.from(new Set(jobs.map(j => j.function))).sort().map(f => <option key={f}>{f}</option>)}</select>
        <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} style={{ width: 72, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 11, outline: "none" }}><option value="All">All Tracks</option>{Array.from(new Set(jobs.map(j => j.track).filter(Boolean))).sort().map(t => <option key={t}>{t}</option>)}</select>
        <select value={filterComplete} onChange={e => setFilterComplete(e.target.value)} style={{ width: 72, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 11, outline: "none" }}><option value="All">All</option><option>Complete</option><option>Draft</option><option>Empty</option></select>
      </div>
      {/* Group by toggle */}
      <div style={{ display: "flex", gap: 2, padding: "0 12px 8px" }}>
        {(["flat", "function", "level"] as const).map(g => <button key={g} onClick={() => setGroupBy(g)} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: groupBy === g ? "rgba(244,168,58,0.12)" : "transparent", color: groupBy === g ? "var(--amber)" : "var(--ink-faint)" }}>{g === "flat" ? "Flat" : g === "function" ? "By Function" : "By Level"}</button>)}
        <div style={{ marginLeft: "auto" }}><button onClick={() => setCompareMode(!compareMode)} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: compareMode ? "rgba(167,139,184,0.12)" : "transparent", color: compareMode ? "var(--dusk)" : "var(--ink-faint)" }}>{compareMode ? "Exit Compare" : "Compare"}</button></div>
      </div>
      {/* Summary line */}
      <div style={{ padding: "0 12px 8px", fontSize: 11, color: "var(--ink-faint)" }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--text-primary)" }}>{jobs.length}</span> total · <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--sage)" }}>{complete}</span> complete · <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--amber)" }}>{drafts}</span> draft · <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)" }}>{emptyCount}</span> empty
      </div>
      {/* Role list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
        {groupedJobs.map(group => <div key={group.key || "_flat"}>
          {group.label && <div style={{ padding: "8px 8px 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-faint)", position: "sticky", top: 0, background: "var(--paper-solid)", zIndex: 2 }}>{group.label} <span style={{ fontFamily: MONO, fontWeight: 700 }}>({group.jobs.length})</span></div>}
          {group.jobs.map(job => {
            const badge = statusBadge(job.id);
            const isActive = selectedJobId === job.id;
            const trackDot = TRACK_DOTS[job.track?.charAt(0) || "P"] || "#e8a050";
            const isChecked = compareJobs.includes(job.id);
            return <button key={job.id} onClick={() => { if (compareMode) { setCompareJobs(prev => isChecked ? prev.filter(id => id !== job.id) : prev.length < 4 ? [...prev, job.id] : prev); } else { setSelectedJobId(job.id); } }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer", background: isActive ? "rgba(244,168,58,0.08)" : "transparent", borderLeft: isActive ? "3px solid var(--amber)" : "3px solid transparent", transition: "all 0.15s", border: "none", textAlign: "left", minHeight: 44 }}>
              {compareMode && <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${isChecked ? "var(--dusk)" : "rgba(255,255,255,0.15)"}`, background: isChecked ? "var(--dusk)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff" }}>{isChecked ? "✓" : ""}</div>}
              <div style={{ width: 6, height: 6, borderRadius: 3, background: trackDot, boxShadow: `0 0 4px ${trackDot}60`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.function} · {job.level}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: badge.color === "var(--success)" ? "var(--sage)" : badge.color === "var(--warning)" ? "var(--amber)" : "transparent", border: badge.color === "var(--text-muted)" ? "1.5px solid var(--ink-faint)" : "none" }} />
            </button>;
          })}
        </div>)}
      </div>
      {/* Footer */}
      <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button onClick={() => setShowTemplates(true)} style={{ fontSize: 11, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>Browse templates</button>
        {compareMode && compareJobs.length >= 2 && <button onClick={() => setShowCompare(true)} style={{ flex: 1, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--dusk)", color: "#fff", border: "none", cursor: "pointer" }}>Compare Selected ({compareJobs.length})</button>}
      </div>
    </div>

    {/* ═══ RIGHT PANEL — Profile detail ═���═ */}
    <div style={{ flex: 1, minWidth: 0, overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
      {!selectedJob ? (
        /* Empty state */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Select a role from the list</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 24, maxWidth: 300 }}>Click any role in the left panel to view and edit its full profile. Profiles include purpose, responsibilities, skills, career paths, and AI impact assessment.</div>
          <button onClick={bulkGenerate} disabled={bulkGenerating} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", cursor: "pointer", opacity: bulkGenerating ? 0.5 : 1 }}>{bulkGenerating ? `Generating... ${bulkProgress}%` : `Generate All ${emptyCount} Empty Profiles`}</button>
        </div>
      ) : (
        /* Profile detail */
        <div style={{ padding: "20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: TRACK_DOTS[selectedJob.track?.charAt(0) || "P"] || "var(--sky-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: MONO }}>{selectedJob.level || "—"}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{selectedJob.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{selectedJob.function} → {selectedJob.family}{selectedJob.sub_family ? ` → ${selectedJob.sub_family}` : ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${statusBadge(selectedJob.id).color}12`, color: statusBadge(selectedJob.id).color }}>{statusBadge(selectedJob.id).label}</span>
              {completeness(selectedJob.id) < 90 && <button onClick={() => generateProfile(selectedJob)} disabled={generating} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", cursor: "pointer", opacity: generating ? 0.5 : 1 }}>{generating ? "Generating..." : "Generate with AI"}</button>}
            </div>
          </div>

          {/* Purpose */}
          <SectionHead label="Purpose" />
          {selectedProfile.purpose ? <EditableText value={selectedProfile.purpose} field="purpose" placeholder="" multiline /> : <EmptyPlaceholder text="No purpose defined yet. Click 'Generate with AI' to auto-fill, or click here to type." />}

          {/* Key Accountabilities */}
          <SectionHead label="Key Accountabilities" />
          {selectedProfile.responsibilities.length > 0 ? <EditableList items={selectedProfile.responsibilities} field="responsibilities" placeholder="Add responsibility..." /> : <EmptyPlaceholder text="No accountabilities defined. Generate with AI or add manually." />}

          {/* Skills & Competencies */}
          <SectionHead label="Skills & Competencies" />
          {(() => {
            const sk = selectedProfile.skills;
            const hasAny = sk.technical.length > 0 || sk.functional.length > 0 || sk.leadership.length > 0 || sk.digital.length > 0;
            if (!hasAny) return <EmptyPlaceholder text="No skills tagged. Generate with AI to populate." />;
            const catColors: Record<string, string> = { technical: "#f4a83a", functional: "#8ba87a", leadership: "#a78bb8", digital: "#f4a83a" };
            return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {(["technical", "functional", "leadership"] as const).filter(c => sk[c].length > 0).map(cat => <div key={cat}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, color: catColors[cat], marginBottom: 6 }}>{cat === "technical" ? "Technical" : cat === "functional" ? "Behavioral" : "Leadership"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{sk[cat].map((s, i) => <span key={i} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${catColors[cat]}12`, color: catColors[cat] }}>{s}</span>)}</div>
              </div>)}
            </div>;
          })()}

          {/* Career Paths */}
          <SectionHead label="Career Paths" />
          {selectedProfile.careerPath.length > 0 ? <div style={{ display: "flex", gap: 8 }}>
            {selectedProfile.careerPath.slice(0, 3).map((cp, i) => {
              const colors = ["var(--sage)", "var(--amber)", "var(--dusk)"];
              return <div key={i} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: `${colors[i % 3]}08`, border: `1px solid ${colors[i % 3]}20` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: colors[i % 3], marginBottom: 4 }}>{i === 0 ? "Promotion" : i === 1 ? "Lateral" : "Cross-Track"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{cp}</div>
              </div>;
            })}
          </div> : <EmptyPlaceholder text="No career paths defined." />}

          {/* Qualifications — collapsed */}
          <SectionHead label="Qualifications" />
          <button onClick={() => setExpandedSections(p => ({ ...p, qualifications: !p.qualifications }))} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", marginBottom: 8 }}>{expandedSections.qualifications ? "▾" : "▸"} {selectedProfile.experience ? "View qualifications" : "No qualifications set"}</button>
          {expandedSections.qualifications && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: 4 }}>Experience</div><EditableText value={selectedProfile.experience} field="experience" placeholder="Add experience requirements..." /></div>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: 4 }}>Reports To</div><EditableText value={selectedProfile.reportsTo} field="reportsTo" placeholder="Manager title..." /></div>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: 4 }}>AI Impact</div><EditableText value={selectedProfile.aiImpact} field="aiImpact" placeholder="AI impact assessment..." /></div>
          </div>}

          {/* Role Metadata — collapsed */}
          <SectionHead label="Role Metadata" />
          <button onClick={() => setExpandedSections(p => ({ ...p, metadata: !p.metadata }))} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", marginBottom: 8 }}>{expandedSections.metadata ? "▾" : "▸"} View metadata</button>
          {expandedSections.metadata && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ l: "Function", v: selectedJob.function }, { l: "Family", v: selectedJob.family }, { l: "Sub-Family", v: selectedJob.sub_family }, { l: "Track", v: selectedJob.track }, { l: "Level", v: selectedJob.level }, { l: "Headcount", v: String(selectedJob.headcount) }, { l: "AI Impact", v: selectedJob.ai_impact }, { l: "AI Score", v: selectedJob.ai_score?.toFixed(1) }].map(m => <div key={m.l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border-light)" }}><span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{m.l}</span><span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "var(--text-primary)" }}>{m.v || "—"}</span></div>)}
          </div>}

          {/* KPIs */}
          <SectionHead label="Key Performance Indicators" />
          {selectedProfile.kpis.length > 0 ? <EditableList items={selectedProfile.kpis} field="kpis" placeholder="Add KPI..." /> : <EmptyPlaceholder text="No KPIs defined." />}
        </div>
      )}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JOB EVALUATION — Mercer IPE / Hay-style job grading
   ═══════════════════════════════════════════════════════════════ */

const EVAL_METHODOLOGIES = {
  ipe: { name: "Mercer IPE", fullName: "International Position Evaluation", factors: [
    { id: "impact", name: "Impact", desc: "The degree to which the role impacts organizational outcomes", levels: ["Limited local impact", "Contributes to team results", "Impacts department outcomes", "Significant functional impact", "Shapes business unit direction", "Drives enterprise strategy", "Defines organizational direction", "Transforms industry/market"] },
    { id: "innovation", name: "Innovation", desc: "The level of creative thinking and problem-solving required", levels: ["Follows established procedures", "Minor improvements to processes", "Adapts methods to new situations", "Develops new approaches", "Creates novel solutions", "Innovates at organizational level", "Pioneers industry practices", "Redefines paradigms"] },
    { id: "knowledge", name: "Knowledge", desc: "The depth and breadth of expertise required", levels: ["Basic operational knowledge", "Working knowledge of discipline", "Solid functional expertise", "Deep specialist knowledge", "Multi-discipline mastery", "Strategic domain expertise", "Cross-functional authority", "Industry thought leadership"] },
    { id: "communication", name: "Communication", desc: "Complexity and influence of interactions required", levels: ["Routine information sharing", "Explains and clarifies", "Persuades within team", "Influences across functions", "Negotiates at senior levels", "Shapes organizational narrative", "Represents externally", "Influences industry/policy"] },
    { id: "risk", name: "Risk", desc: "Financial, operational, or reputational risk managed", levels: ["Minimal risk exposure", "Manages task-level risk", "Manages project risk", "Manages functional risk", "Manages business unit risk", "Manages enterprise risk", "Manages strategic risk", "Manages existential risk"] },
  ]},
  hay: { name: "Hay/Korn Ferry-Style", factors: [
    { id: "knowhow", name: "Know-How", desc: "Total of every kind of knowledge and skill needed to do the job", levels: ["Elementary procedures", "Routine vocational", "Advanced vocational", "Basic professional", "Seasoned professional", "Advanced professional", "Mastery of discipline", "Unique expertise"] },
    { id: "problem", name: "Problem Solving", desc: "The original thinking required to analyze, evaluate, create", levels: ["Simple recall", "Patterned responses", "Interpolative analysis", "Adaptive thinking", "Uncharted problem-solving", "Strategic thinking", "Visionary thinking", "Paradigm-defining"] },
    { id: "accountability", name: "Accountability", desc: "Answerability for actions and consequences", levels: ["Prescribed actions", "Standardized output", "Activities within guidelines", "Operational results", "Functional performance", "Business results", "Enterprise outcomes", "Stakeholder value creation"] },
    { id: "conditions", name: "Working Conditions", desc: "Physical and environmental demands", levels: ["Standard office", "Some travel/variation", "Regular field work", "Demanding conditions", "High-pressure environment", "Crisis management", "Extreme demands", "Life-critical decisions"] },
  ]},
};

function JobEvaluationTab({ jobs, model }: { jobs: Job[]; model: string }) {
  const [methodology, setMethodology] = useState<"ipe" | "hay">("ipe");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [scores, setScores] = usePersisted<Record<string, Record<string, number>>>(`${model}_job_eval`, {});
  const [aiEvalLoading, setAiEvalLoading] = useState(false);
  const [evalView, setEvalView] = useState<"score" | "comparison" | "batch">("score");

  const meth = EVAL_METHODOLOGIES[methodology];
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const jobScores = scores[selectedJobId] || {};
  const totalScore = meth.factors.reduce((s, f) => s + (jobScores[f.id] || 0), 0);
  const maxScore = meth.factors.length * 8;
  const grade = totalScore <= 0 ? "—" : totalScore <= maxScore * 0.2 ? "G8-10" : totalScore <= maxScore * 0.35 ? "G11-13" : totalScore <= maxScore * 0.5 ? "G14-16" : totalScore <= maxScore * 0.65 ? "G17-19" : totalScore <= maxScore * 0.8 ? "G20-22" : "G23+";
  const percentile = jobs.filter(j => {
    const js = scores[j.id]; if (!js) return false;
    const jTotal = meth.factors.reduce((s, f) => s + (js[f.id] || 0), 0);
    return jTotal < totalScore;
  }).length;
  const evaluatedCount = jobs.filter(j => scores[j.id] && meth.factors.some(f => (scores[j.id]?.[f.id] || 0) > 0)).length;

  const aiEvaluateAll = async () => {
    setAiEvalLoading(true);
    try {
      const jobList = jobs.slice(0, 30).map(j => `${j.title} (${j.function}, ${j.level}, ${j.track})`).join("; ");
      const factorNames = meth.factors.map(f => f.id).join(", ");
      const raw = await callAI("Return ONLY valid JSON.", `Score these jobs on ${factorNames} (1-8 each). Jobs: ${jobList}. Return JSON: {"results":[{"title":"...", ${meth.factors.map(f => `"${f.id}":N`).join(", ")}}]}`);
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      if (parsed.results) {
        const newScores = { ...scores };
        parsed.results.forEach((r: Record<string, unknown>) => {
          const job = jobs.find(j => j.title === r.title);
          if (job) { newScores[job.id] = {}; meth.factors.forEach(f => { newScores[job.id][f.id] = Number(r[f.id]) || 0; }); }
        });
        setScores(newScores);
        showToast(`Evaluated ${parsed.results.length} roles`);
      }
    } catch { showToast("AI evaluation didn't complete — try again"); }
    setAiEvalLoading(false);
  };

  // Count mismatches
  const mismatchCount = jobs.filter(j => {
    const js = scores[j.id]; if (!js) return false;
    const jTotal = meth.factors.reduce((s, f) => s + (js[f.id] || 0), 0);
    const ln = parseInt(j.level.replace(/\D/g, "")) || 3;
    const expected = ln <= 2 ? 1 : ln <= 4 ? 2 : ln <= 6 ? 3 : 4;
    const actual = jTotal <= maxScore * 0.35 ? 1 : jTotal <= maxScore * 0.5 ? 2 : jTotal <= maxScore * 0.65 ? 3 : 4;
    return actual !== expected;
  }).length;

  return <div className="animate-tab-enter space-y-5">
    {/* Summary strip */}
    <div className="flex gap-3 mb-2">
      {[
        { label: "evaluated", val: evaluatedCount, color: "var(--amber)" },
        { label: "pending", val: jobs.length - evaluatedCount, color: "var(--ink-faint)" },
        { label: "mismatches", val: mismatchCount, color: "var(--amber)" },
      ].map(s => <span key={s.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${s.color}15`, color: s.color }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</span> {s.label}
      </span>)}
    </div>

    {/* Methodology selector */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Methodology:</span>
      {(["ipe", "hay"] as const).map(m => <button key={m} onClick={() => setMethodology(m)} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all" style={{ background: methodology === m ? "rgba(244,168,58,0.15)" : "var(--border-light)", color: methodology === m ? "var(--amber)" : "var(--ink-faint)", border: methodology === m ? "1px solid rgba(244,168,58,0.3)" : "1px solid var(--border)" }}>{EVAL_METHODOLOGIES[m].name}{m === "ipe" && <span style={{fontSize:10, color:'var(--text-muted)', marginLeft:4}}>(International Position Evaluation)</span>}</button>)}
      <div className="ml-auto flex gap-1 rounded-lg overflow-hidden" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
        {(["score", "comparison", "batch"] as const).map(v => <button key={v} onClick={() => setEvalView(v)} className="px-3 py-1.5 text-[11px] font-semibold transition-all" style={{ background: evalView === v ? "rgba(244,168,58,0.2)" : "transparent", color: evalView === v ? "var(--amber)" : "var(--ink-faint)" }}>{v === "score" ? "Score" : v === "comparison" ? "Compare" : "Batch AI"}</button>)}
      </div>
    </div>

    {/* ─── SCORING VIEW ─── */}
    {evalView === "score" && <div>
      <div className="flex gap-4 mb-4">
        <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[15px] text-[var(--text-primary)] outline-none"><option value="">Select a job to evaluate...</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.function}, {j.level})</option>)}</select>
        {totalScore > 0 && <div className="flex gap-3">
          <div className="rounded-xl px-4 py-2 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)] font-data">{totalScore}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">Points</div></div>
          <div className="rounded-xl px-4 py-2 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)] font-data">{grade}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">Grade</div></div>
          {evaluatedCount > 1 && <div className="rounded-xl px-4 py-2 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--purple)] font-data">P{Math.round((percentile / evaluatedCount) * 100)}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">Percentile</div></div>}
        </div>}
      </div>
      {selectedJob && <div className="grid grid-cols-1 gap-4">
        {meth.factors.map(factor => {
          const score = jobScores[factor.id] || 0;
          return <Card key={factor.id} title={`${factor.name} — ${factor.desc}`}>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
              {factor.levels.map((level, li) => {
                const n = li + 1;
                const isSelected = score === n;
                return <button key={li} onClick={() => setScores(prev => ({ ...prev, [selectedJobId]: { ...(prev[selectedJobId] || {}), [factor.id]: score === n ? 0 : n } }))} className="rounded-xl p-3 text-left transition-all" style={{
                  background: isSelected ? "rgba(244,168,58,0.12)" : "var(--surface-2)",
                  border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                  boxShadow: isSelected ? "0 0 12px rgba(244,168,58,0.15)" : "none",
                }}>
                  <div className="text-[14px] font-bold mb-1" style={{ color: isSelected ? "var(--accent-primary)" : "var(--text-primary)" }}>Level {n}</div>
                  <div className="text-[12px] text-[var(--text-muted)] leading-snug">{level}</div>
                </button>;
              })}
            </div>
          </Card>;
        })}
      </div>}
      {!selectedJob && <div className="text-center py-16 text-[var(--text-muted)]"><div className="text-[40px] mb-3 opacity-40">⚖️</div><div className="text-[16px]">Select a job above to begin evaluation</div></div>}
    </div>}

    {/* ─── COMPARISON VIEW ─── */}
    {evalView === "comparison" && <Card title="Evaluation Comparison — Score vs. Level">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Roles above the trend line may be under-leveled. Roles below may be over-leveled (title inflation).</div>
      {evaluatedCount < 2 ? <div className="text-center py-12 text-[var(--text-muted)]">Evaluate at least 2 roles to see the comparison chart.</div> : <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Role</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Level</th>
        {meth.factors.map(f => <th key={f.id} className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">{f.name.slice(0, 6)}</th>)}
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Total</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Grade</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Flag</th>
      </tr></thead><tbody>
        {jobs.filter(j => scores[j.id] && meth.factors.some(f => (scores[j.id]?.[f.id] || 0) > 0)).sort((a, b) => {
          const aT = meth.factors.reduce((s, f) => s + (scores[a.id]?.[f.id] || 0), 0);
          const bT = meth.factors.reduce((s, f) => s + (scores[b.id]?.[f.id] || 0), 0);
          return bT - aT;
        }).map(j => {
          const js = scores[j.id] || {};
          const jTotal = meth.factors.reduce((s, f) => s + (js[f.id] || 0), 0);
          const jGrade = jTotal <= maxScore * 0.2 ? "G8-10" : jTotal <= maxScore * 0.35 ? "G11-13" : jTotal <= maxScore * 0.5 ? "G14-16" : jTotal <= maxScore * 0.65 ? "G17-19" : jTotal <= maxScore * 0.8 ? "G20-22" : "G23+";
          const levelNum = parseInt(j.level.replace(/\D/g, "")) || 3;
          const expectedGradeNum = levelNum <= 2 ? 1 : levelNum <= 4 ? 2 : levelNum <= 6 ? 3 : 4;
          const actualGradeNum = jTotal <= maxScore * 0.35 ? 1 : jTotal <= maxScore * 0.5 ? 2 : jTotal <= maxScore * 0.65 ? 3 : 4;
          const flag = actualGradeNum > expectedGradeNum ? "Under-leveled" : actualGradeNum < expectedGradeNum ? "Over-leveled" : "";
          return <tr key={j.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: flag ? "3px solid var(--amber)" : "3px solid transparent", background: flag ? "rgba(244,168,58,0.03)" : "transparent" }}>
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{j.title}<div className="text-[12px] text-[var(--text-muted)]">{j.function}</div></td>
            <td className="px-2 py-2 text-center">{j.level}</td>
            {meth.factors.map(f => <td key={f.id} className="px-2 py-2 text-center">
              <div className="text-[12px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{js[f.id] || "—"}</div>
              {(js[f.id] || 0) > 0 && <div className="h-[4px] rounded-full mt-1 mx-auto" style={{ width: "80%", background: "rgba(255,255,255,0.06)" }}><div className="h-full rounded-full" style={{ width: `${((js[f.id] || 0) / 8) * 100}%`, background: "var(--amber)" }} /></div>}
            </td>)}
            <td className="px-2 py-2 text-center"><span className="font-bold text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--amber)", background: "rgba(244,168,58,0.08)", padding: "2px 6px", borderRadius: 4 }}>{jTotal}</span></td>
            <td className="px-2 py-2 text-center font-bold text-[12px]" style={{ color: "var(--sage)" }}>{jGrade}</td>
            <td className="px-2 py-2 text-center">{flag && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: flag === "Under-leveled" ? "rgba(139,168,122,0.1)" : "rgba(232,122,93,0.1)", color: flag === "Under-leveled" ? "var(--sage)" : "var(--coral)" }}>{flag}</span>}</td>
          </tr>;
        })}
      </tbody></table></div>}
    </Card>}

    {/* ─── BATCH AI VIEW ─── */}
    {evalView === "batch" && <Card title="Batch AI Evaluation">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Use AI to auto-evaluate all roles based on title, function, and level. Review and adjust scores after generation.</div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={aiEvaluateAll} disabled={aiEvalLoading} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--amber), var(--sky-gold))", opacity: aiEvalLoading ? 0.5 : 1 }}>{aiEvalLoading ? "Evaluating..." : `✨ AI Evaluate All (${Math.min(jobs.length, 30)} roles)`}</button>
        <span className="text-[14px] text-[var(--text-muted)]">{evaluatedCount} of {jobs.length} roles evaluated</span>
      </div>
      {evaluatedCount > 0 && <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{evaluatedCount}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Evaluated</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{jobs.filter(j => { const js = scores[j.id]; if (!js) return false; const jTotal = meth.factors.reduce((s, f) => s + (js[f.id] || 0), 0); const levelNum = parseInt(j.level.replace(/\D/g, "")) || 3; const expectedGradeNum = levelNum <= 2 ? 1 : levelNum <= 4 ? 2 : 3; const actualGradeNum = jTotal <= maxScore * 0.35 ? 1 : jTotal <= maxScore * 0.5 ? 2 : 3; return actualGradeNum !== expectedGradeNum; }).length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Level Mismatches</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{jobs.length - evaluatedCount}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Remaining</div></div>
      </div>}
    </Card>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   CAREER LATTICE — Visual career path network
   ═══════════════════════════════════════════════════════════════ */

function CareerLatticeTab({ jobs, model }: { jobs: Job[]; model: string }) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pathData, setPathData] = usePersisted<Record<string, { nextMoves: string[]; lateralMoves: string[]; crossTrack: string[] }>>(`${model}_career_paths`, {});
  const [aiGenerating, setAiGenerating] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [funcFilter, setFuncFilter] = useState("All");
  const [showCompression, setShowCompression] = useState(false);

  const MONO = "'JetBrains Mono', monospace";
  const LEVEL_LABELS: Record<string, string> = { "6": "Executive / Distinguished", "5": "Sr. Director / Principal", "4": "Director / Staff", "3": "Sr. Manager / Senior", "2": "Manager / Mid", "1": "Associate / Entry" };

  // Filter by function
  const filteredJobs = funcFilter === "All" ? jobs : jobs.filter(j => j.function === funcFilter);
  const functions = useMemo(() => Array.from(new Set(jobs.map(j => j.function))).sort(), [jobs]);

  // Group jobs by track and level
  const tracks = useMemo(() => {
    const ts = Array.from(new Set(filteredJobs.map(j => j.track))).sort();
    if (hideEmpty) return ts.filter(t => filteredJobs.some(j => j.track === t));
    return ts;
  }, [filteredJobs, hideEmpty]);

  const levels = useMemo(() => {
    const ls = Array.from(new Set(filteredJobs.map(j => j.level))).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, "")) || 0;
      const bNum = parseInt(b.replace(/\D/g, "")) || 0;
      return aNum - bNum;
    });
    if (hideEmpty) return ls.filter(l => filteredJobs.some(j => j.level === l));
    return ls;
  }, [filteredJobs, hideEmpty]);

  const totalHC = filteredJobs.reduce((s, j) => s + j.headcount, 0);
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const paths = selectedJobId ? pathData[selectedJobId] : null;

  // Compression between adjacent levels per track
  const compressionData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    tracks.forEach(track => {
      data[track] = {};
      const sortedLevels = levels.filter(l => filteredJobs.some(j => j.track === track && j.level === l));
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        const lowerHC = filteredJobs.filter(j => j.track === track && j.level === sortedLevels[i]).reduce((s, j) => s + j.headcount, 0);
        const upperHC = filteredJobs.filter(j => j.track === track && j.level === sortedLevels[i + 1]).reduce((s, j) => s + j.headcount, 0);
        if (upperHC > 0) data[track][sortedLevels[i]] = Math.round(lowerHC / upperHC * 10) / 10;
      }
    });
    return data;
  }, [tracks, levels, filteredJobs]);

  const generatePaths = async () => {
    if (!selectedJob) return;
    setAiGenerating(true);
    try {
      const allTitles = jobs.map(j => `${j.title} (${j.track} ${j.level})`).join("; ");
      const raw = await callAI("Return ONLY valid JSON.", `For "${selectedJob.title}" (${selectedJob.track} ${selectedJob.level} in ${selectedJob.function}), identify career moves from this list: ${allTitles.slice(0, 2000)}. Return JSON: {"nextMoves":["3 promotion titles"],"lateralMoves":["2 lateral same-level titles"],"crossTrack":["2 cross-track titles"]}`);
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      if (parsed.nextMoves) setPathData(prev => ({ ...prev, [selectedJob.id]: parsed }));
    } catch { showToast("Couldn't compute the career path — try again"); }
    setAiGenerating(false);
  };

  return <div className="space-y-4">
    {/* Filters + toggles */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select value={funcFilter} onChange={e => setFuncFilter(e.target.value)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 12, outline: "none" }}>
        <option value="All">All Functions</option>
        {functions.map(f => <option key={f}>{f}</option>)}
      </select>
      <button onClick={() => setHideEmpty(!hideEmpty)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "1px solid " + (hideEmpty ? "rgba(244,168,58,0.3)" : "var(--border)"), background: hideEmpty ? "rgba(244,168,58,0.08)" : "transparent", color: hideEmpty ? "var(--amber)" : "var(--ink-faint)", cursor: "pointer" }}>{hideEmpty ? "Hiding Empty" : "Show Empty"}</button>
      <button onClick={() => setShowCompression(!showCompression)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "1px solid " + (showCompression ? "rgba(244,168,58,0.3)" : "var(--border)"), background: showCompression ? "rgba(244,168,58,0.08)" : "transparent", color: showCompression ? "var(--amber)" : "var(--ink-faint)", cursor: "pointer" }}>Compression</button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)" }}>{filteredJobs.length} roles · {totalHC.toLocaleString()} HC · {tracks.length} tracks × {levels.length} levels</span>
    </div>

    {/* Track legend */}
    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-faint)" }}>
      {tracks.map(t => {
        const tc = TRACK_COLORS[t] || "#888";
        const trackHC = filteredJobs.filter(j => j.track === t).reduce((s, j) => s + j.headcount, 0);
        return <span key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: tc, boxShadow: `0 0 4px ${tc}40` }} />
          <span style={{ fontWeight: 600, color: tc }}>{t}</span>
          <span style={{ fontFamily: MONO, fontWeight: 700 }}>{trackHC.toLocaleString()}</span>
          <span>({totalHC > 0 ? (trackHC / totalHC * 100).toFixed(1) : 0}%)</span>
        </span>;
      })}
    </div>

    {/* Lattice grid */}
    <div className="overflow-x-auto" style={{ borderRadius: 12, border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", minWidth: tracks.length * 180, borderCollapse: "separate", borderSpacing: 0 }}>
        <thead><tr>
          <th style={{ padding: "8px 8px", textAlign: "left", position: "sticky", left: 0, zIndex: 10, background: "var(--paper-solid)", width: 80, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)" }}>Level</div>
          </th>
          {tracks.map(t => {
            const tc = TRACK_COLORS[t] || "#888";
            const trackHC = filteredJobs.filter(j => j.track === t).reduce((s, j) => s + j.headcount, 0);
            return <th key={t} style={{ padding: "8px 12px", textAlign: "center", background: `${tc}08`, borderBottom: `2px solid ${tc}30` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tc }}>{t}</div>
              <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)" }}>{trackHC.toLocaleString()} HC · {totalHC > 0 ? (trackHC / totalHC * 100).toFixed(1) : 0}%</div>
            </th>;
          })}
        </tr></thead>
        <tbody>
          {[...levels].reverse().map((level, li) => {
            const levelNum = level.replace(/\D/g, "") || level;
            const levelLabel = LEVEL_LABELS[levelNum] || "";
            return <tr key={level}>
              <td style={{ padding: "6px 8px", position: "sticky", left: 0, zIndex: 10, background: "var(--paper-solid)", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "top" }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: "var(--ink-soft)" }}>{levelNum}</div>
                {levelLabel && <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 1, lineHeight: 1.2 }}>{levelLabel}</div>}
              </td>
              {tracks.map(track => {
                const tc = TRACK_COLORS[track] || "#888";
                const cellKey = `${track}_${level}`;
                const cellJobs = filteredJobs.filter(j => j.track === track && j.level === level);
                const isExpanded = expandedCells.has(cellKey);
                const hasSelected = cellJobs.some(j => j.id === selectedJobId);
                const showLimit = isExpanded ? cellJobs.length : 3;
                const compression = compressionData[track]?.[level];

                // Check if the cell above has roles (for vertical arrow)
                const levelIdx = levels.indexOf(level);
                const hasAbove = levelIdx < levels.length - 1 && filteredJobs.some(j => j.track === track && j.level === levels[levelIdx + 1]);

                return <td key={track} style={{
                  padding: 4, verticalAlign: "top", borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: hasSelected ? `${tc}08` : cellJobs.length > 0 ? `${tc}04` : "transparent",
                  borderLeft: cellJobs.length > 0 ? `1px solid ${tc}12` : "1px dashed var(--border-light)",
                  borderRight: cellJobs.length > 0 ? `1px solid ${tc}12` : "1px dashed var(--border-light)",
                  minWidth: 160, borderRadius: 8,
                }}>
                  {cellJobs.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 2, position: "relative" }}>
                    {/* Vertical arrow indicator */}
                    {hasAbove && <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: `${tc}60` }}>↑</div>}
                    {cellJobs.slice(0, showLimit).map((j, ji) => {
                      const isSelected = selectedJobId === j.id;
                      const isPath = paths && (paths.nextMoves.includes(j.title) || paths.lateralMoves.includes(j.title) || paths.crossTrack.includes(j.title));
                      const pathType = paths?.nextMoves.includes(j.title) ? "promotion" : paths?.lateralMoves.includes(j.title) ? "lateral" : paths?.crossTrack.includes(j.title) ? "cross" : null;
                      const dimmed = selectedJobId && !isSelected && !isPath;
                      return <button key={j.id} onClick={() => setSelectedJobId(isSelected ? null : j.id)} style={{
                        width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                        background: isSelected ? `${tc}30` : isPath ? `${pathType === "promotion" ? "#8ba87a" : pathType === "lateral" ? "#a78bb8" : "#f4a83a"}10` : `${tc}10`,
                        border: isSelected ? `1px solid ${tc}` : "1px solid transparent",
                        borderLeft: `3px solid ${isSelected ? tc : isPath ? (pathType === "promotion" ? "#8ba87a" : pathType === "lateral" ? "#a78bb8" : "#f4a83a") : `${tc}30`}`,
                        opacity: dimmed ? 0.3 : 1, transform: isSelected ? "scale(1.02)" : "none",
                        boxShadow: isSelected ? `0 0 12px ${tc}25` : "none",
                        transition: "all 0.15s ease-out",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? tc : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
                        <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)" }} title="Headcount">{j.headcount.toLocaleString()} HC</div>
                        {isPath && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 1, color: pathType === "promotion" ? "var(--sage)" : pathType === "lateral" ? "var(--dusk)" : "var(--amber)" }}>{pathType === "promotion" ? "↑ Promotion" : pathType === "lateral" ? "→ Lateral" : "↗ Cross"}</div>}
                      </button>;
                    })}
                    {cellJobs.length > 3 && !isExpanded && <button onClick={(e) => { e.stopPropagation(); setExpandedCells(prev => { const s = new Set(prev); s.add(cellKey); return s; }); }} style={{ width: "100%", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", background: "var(--border-light)", border: "1px solid var(--border)", cursor: "pointer", textAlign: "center" }}>+{cellJobs.length - 3} more</button>}
                    {isExpanded && cellJobs.length > 3 && <button onClick={(e) => { e.stopPropagation(); setExpandedCells(prev => { const s = new Set(prev); s.delete(cellKey); return s; }); }} style={{ width: "100%", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--amber)", background: "transparent", border: "none", cursor: "pointer", textAlign: "center" }}>Show less</button>}
                    {/* Compression indicator */}
                    {showCompression && compression && compression > 2 && <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: compression > 4 ? "var(--coral)" : compression > 3 ? "var(--amber)" : "var(--amber)", textAlign: "center", marginTop: 2 }}>{compression}:1 ▲</div>}
                  </div> : <div style={{ textAlign: "center", padding: 4, fontSize: 11, color: "var(--border)" }}>—</div>}
                </td>;
              })}
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {/* Selected role detail panel */}
    {selectedJob && (() => {
      const tc = getTrackColor(selectedJob.level || selectedJob.track);
      const levelN = parseInt(selectedJob.level.replace(/\D/g, "")) || 0;
      const trackLetter = getTrackLetter(selectedJob.level);
      // Find roles at next level up in same track for promotion info
      const nextLevel = levels.find(l => { const n = parseInt(l.replace(/\D/g, "")) || 0; return n === levelN + 1; });
      const promotionRoles = nextLevel ? filteredJobs.filter(j => j.track === selectedJob.track && j.level === nextLevel) : [];
      const promotionHC = promotionRoles.reduce((s, j) => s + j.headcount, 0);
      const currentLevelHC = filteredJobs.filter(j => j.track === selectedJob.track && j.level === selectedJob.level).reduce((s, j) => s + j.headcount, 0);
      const compressionRatio = promotionHC > 0 ? Math.round(currentLevelHC / promotionHC * 10) / 10 : 0;
      // Lateral roles — same level, different track/function
      const lateralRoles = filteredJobs.filter(j => j.level === selectedJob.level && j.track !== selectedJob.track).slice(0, 3);
      // Cross-track
      const crossAvailable = trackLetter === "P" && levelN >= 3;
      const crossTarget = crossAvailable ? filteredJobs.find(j => j.track === "Management" && j.level === `M${levelN - 1}`) || filteredJobs.find(j => j.track === "Manager" && parseInt(j.level.replace(/\D/g, "")) === levelN - 1) : null;

      return <div style={{ padding: "20px 24px", borderRadius: 12, background: `linear-gradient(135deg, ${tc}08 0%, ${tc}04 100%)`, borderLeft: `3px solid ${tc}`, border: `1px solid ${tc}25`, transition: "all 0.25s" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Left — identity */}
          <div style={{ width: "38%", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <LevelBadge level={selectedJob.level} size="lg" />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{selectedJob.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{selectedJob.function} → {selectedJob.family}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-faint)", marginBottom: 12 }}>
              <span><span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--text-primary)" }}>{selectedJob.headcount.toLocaleString()}</span> people</span>
              <span>{selectedJob.track} track</span>
            </div>
            <button onClick={generatePaths} disabled={aiGenerating} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", cursor: "pointer", opacity: aiGenerating ? 0.5 : 1 }}>{aiGenerating ? "Generating..." : paths ? "Regenerate Paths" : "Generate AI Paths"}</button>
          </div>
          {/* Right — career path cards */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Promotion */}
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(139,168,122,0.04)", border: "1px solid rgba(139,168,122,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--sage)", marginBottom: 8 }}>↑ Promotion Path</div>
              {promotionRoles.length > 0 ? <>
                {promotionRoles.slice(0, 2).map(r => <div key={r.id} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{r.title}</div>)}
                <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)", marginTop: 4 }}>{promotionHC} people at that level</div>
                {compressionRatio > 0 && <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: compressionRatio > 4 ? "var(--coral)" : compressionRatio > 3 ? "var(--amber)" : "var(--ink-faint)", marginTop: 2 }}>Compression: {compressionRatio}:1</div>}
              </> : <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Top of {selectedJob.track} track — consider cross-track</div>}
              {paths?.nextMoves?.length ? <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{paths.nextMoves.map((t, i) => <div key={`next-${i}`} style={{ fontSize: 11, color: "var(--ink)", marginBottom: 1 }}>• {t}</div>)}</div> : null}
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>~12-18 months typical</div>
            </div>
            {/* Lateral */}
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(244,168,58,0.04)", border: "1px solid rgba(244,168,58,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>→ Lateral Move</div>
              {lateralRoles.length > 0 ? lateralRoles.map(r => <div key={r.id} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{r.title} <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>({r.track})</span></div>) : <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>No lateral options at this level</div>}
              {paths?.lateralMoves?.length ? <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{paths.lateralMoves.map((t, i) => <div key={`lat-${i}`} style={{ fontSize: 11, color: "var(--ink)", marginBottom: 1 }}>• {t}</div>)}</div> : null}
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>Broadens cross-functional experience</div>
            </div>
            {/* Cross-Track */}
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(167,139,184,0.04)", border: "1px solid rgba(167,139,184,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dusk)", marginBottom: 8 }}>↗ Track Change</div>
              {crossAvailable ? <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{trackLetter}→M transition</div>
                {crossTarget && <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 2 }}>→ {crossTarget.title}</div>}
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>Requires: people leadership readiness</div>
              </> : <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Not typical from this position</div>}
              {paths?.crossTrack?.length ? <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{paths.crossTrack.map((t, i) => <div key={`cross-${i}`} style={{ fontSize: 11, color: "var(--ink)", marginBottom: 1 }}>• {t}</div>)}</div> : null}
            </div>
          </div>
        </div>
        {/* Forward-looking projection */}
        {compressionRatio > 2 && <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6, fontStyle: "italic" }}>
          At typical organizational attrition of 12%, compression at {selectedJob.level} ({compressionRatio}:1) releases in approximately {Math.round(compressionRatio / 0.12 / 12 * 10) / 10} years. Without intervention, expect elevated voluntary turnover among high performers at this level.
        </div>}
      </div>;
    })()}

    {/* Legend */}
    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--ink-faint)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: "2px solid var(--accent-primary)", background: "rgba(244,168,58,0.15)" }} />Selected</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "rgba(139,168,122,0.15)" }} />Promotion</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "rgba(167,139,184,0.15)" }} />Lateral</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "rgba(244,168,58,0.15)" }} />Cross-track</span>
      {showCompression && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--amber)" }}>X:1</span>Compression ratio</span>}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JA GOVERNANCE — Role lifecycle, approvals, health dashboard
   ═══════════════════════════════════════════════════════════════ */

type JAChangeRequest = { id: string; type: "new" | "modify" | "deprecate"; roleTitle: string; requestedBy: string; justification: string; status: "Draft" | "Pending" | "Approved" | "Rejected"; date: string; approver: string };

function GovernancePolicies() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const policies = [
    { id: "create", title: "When to Create a New Role", text: "A new role should be created when the responsibilities are substantively distinct from any existing role in the architecture, projected headcount exceeds 5 FTEs within 12 months, the role has been approved by the JA Committee, and market benchmarking confirms the role exists in comparable organizations. Ad-hoc requests must demonstrate strategic alignment and cannot duplicate existing roles at a different title." },
    { id: "level", title: "Level Assignment Criteria", text: "Level assignment follows a point-factor evaluation methodology (Mercer IPE or Hay/Korn Ferry) across impact, innovation, knowledge, communication, and risk dimensions. Final leveling must consider internal equity (no more than 1 grade variance for comparable scope), market benchmarking (within +/- 10% of median total compensation for the role's geography), and organizational precedent. Grade overrides require JA Committee approval." },
    { id: "exception", title: "Exception Process", text: "Exceptions to the standard architecture (e.g., roles outside the standard level framework, non-standard titles, or hybrid roles spanning multiple families) require written approval from the CHRO or designated delegate. All exceptions are time-limited to 12 months and subject to annual review. The JA Committee reviews all active exceptions in Q1 of each year and either formalizes or sunsets them." },
    { id: "review", title: "Annual Review Cadence", text: "Q1: Structural review — validate all families, sub-families, and role definitions against current organizational needs. Q2: Market calibration — benchmark compensation and leveling against external data. Q3: Completeness audit — ensure all roles have task data, career paths, and evaluation scores. Q4: Stakeholder sign-off — function heads and CHRO approve the reviewed architecture for the following year. Ad-hoc requests are processed on a rolling basis with a 10-business-day SLA." },
  ];
  return <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
    <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3" style={{ letterSpacing: "-0.02em" }}>Governance Policies</div>
    <div className="space-y-2">
      {policies.map(p => <div key={p.id} className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="w-full flex items-center justify-between px-4 py-3 text-left transition-all" style={{ background: expanded === p.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)" }}>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{p.title}</span>
          <span className="text-[var(--ink-faint)] text-[11px] transition-transform" style={{ transform: expanded === p.id ? "rotate(180deg)" : "none" }}>▾</span>
        </button>
        {expanded === p.id && <div className="px-4 py-3 text-[12px] text-[var(--ink)] leading-relaxed" style={{ background: "rgba(255,255,255,0.02)" }}>{p.text}</div>}
      </div>)}
    </div>
  </div>;
}

function JAGovernanceTab({ jobs, employees, model }: { jobs: Job[]; employees: Employee[]; model: string }) {
  const [govView, setGovView] = useState<"health" | "changes" | "review">("health");
  const [changeReqs, setChangeReqs] = usePersisted<JAChangeRequest[]>(`${model}_ja_changes`, []);
  const [addingChange, setAddingChange] = useState(false);
  const [reviewStep, setReviewStep] = useState(0);

  // JA Health metrics
  const uniqueTitles = new Set(jobs.map(j => j.title));
  const singleIncumbent = jobs.filter(j => j.headcount === 1);
  const noTasksRoles = jobs.filter(j => !j.tasks_mapped || j.tasks_mapped === 0);
  const titleDuplicates = (() => {
    const byTitle: Record<string, Set<string>> = {};
    jobs.forEach(j => { const base = j.title.replace(/^(Sr\.|Senior|Jr\.|Junior|Lead|Principal|Staff)\s*/i, "").trim(); if (!byTitle[base]) byTitle[base] = new Set(); byTitle[base].add(j.level); });
    return Object.entries(byTitle).filter(([, levels]) => levels.size > 1);
  })();
  const levelCompression = (() => {
    const byFunc: Record<string, Record<string, number>> = {};
    jobs.forEach(j => { if (!byFunc[j.function]) byFunc[j.function] = {}; byFunc[j.function][j.level] = (byFunc[j.function][j.level] || 0) + j.headcount; });
    return Object.entries(byFunc).filter(([, levels]) => {
      const vals = Object.values(levels);
      const total = vals.reduce((s, v) => s + v, 0);
      const sorted = vals.sort((a, b) => b - a);
      return sorted.length >= 2 && (sorted[0] + sorted[1]) / total > 0.7;
    });
  })();
  const healthScore = Math.max(0, Math.min(100, 100 - singleIncumbent.length * 2 - noTasksRoles.length * 3 - titleDuplicates.length * 5 - levelCompression.length * 8));

  return <div className="animate-tab-enter space-y-5">
    <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] mb-4">
      {([
        { id: "health" as const, label: "JA Health Dashboard", icon: "📊" },
        { id: "changes" as const, label: "Change Requests", icon: "📝" },
        { id: "review" as const, label: "Annual Review", icon: "📋" },
      ]).map(v => <button key={v.id} onClick={() => setGovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{ background: govView === v.id ? "rgba(244,168,58,0.12)" : "transparent", color: govView === v.id ? "var(--accent-primary)" : "var(--text-muted)" }}>{v.icon} {v.label}</button>)}
    </div>

    {/* ─── HEALTH DASHBOARD with RACI + Policies ─── */}
    {govView === "health" && <div className="space-y-5">
      {/* Health score ring + summary */}
      {(() => {
        const hCol = healthScore >= 70 ? "#8ba87a" : healthScore >= 50 ? "#f4a83a" : "#e87a5d";
        const hVerdict = healthScore >= 90 ? "Excellent" : healthScore >= 70 ? "Solid — minor gaps" : healthScore >= 50 ? "Needs work — structural risks present" : "Critical — architecture unreliable";
        const circ = 2 * Math.PI * 55;
        const dashOff = circ * (1 - healthScore / 100);
        return <div className="flex gap-5 items-center">
          <div>
            <div className={`relative w-[130px] h-[130px] shrink-0`}>
              <svg viewBox="0 0 130 130" className="w-full h-full">
                <circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="65" cy="65" r="55" fill="none" stroke={hCol} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff} transform="rotate(-90 65 65)" style={{ filter: `drop-shadow(0 0 6px ${hCol}30)`, transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[32px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: hCol }}>{healthScore}</div>
                <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Health</div>
              </div>
            </div>
            <div className="text-[10px] text-center mt-1" style={{ color: hCol, maxWidth: 130 }}>{hVerdict}</div>
          </div>
          <div className="grid grid-cols-4 gap-3 flex-1">
            {[
              { label: "Single Incumbent", val: singleIncumbent.length, color: "var(--amber)" },
              { label: "No Task Data", val: noTasksRoles.length, color: "var(--coral)" },
              { label: "Title Variants", val: titleDuplicates.length, color: "var(--dusk)" },
              { label: "Level Compression", val: levelCompression.length, color: "var(--amber)" },
            ].map(k => <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
              <div className="text-[20px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: k.color }}>{k.val}</div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">{k.label}</div>
            </div>)}
          </div>
        </div>;
      })()}

      {/* RACI Matrix */}
      <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1" style={{ letterSpacing: "-0.02em" }}>RACI Matrix</div>
        <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)] mb-3">Job Architecture Governance Responsibilities</div>
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead><tr>
              <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]" style={{ background: "var(--border-light)" }}>Decision</th>
              {["CHRO", "HR BP", "Comp Team", "Hiring Mgr", "JA Committee"].map(s => <th key={s} className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]" style={{ background: "var(--border-light)" }}>{s}</th>)}
            </tr></thead>
            <tbody>
              {[
                { decision: "Create New Role", raci: ["A", "C", "C", "R", "A"] },
                { decision: "Retire Existing Role", raci: ["A", "R", "I", "C", "A"] },
                { decision: "Change Career Level", raci: ["I", "R", "A", "C", "A"] },
                { decision: "Modify Job Family", raci: ["A", "C", "R", "I", "A"] },
                { decision: "Approve Career Path", raci: ["I", "R", "C", "C", "A"] },
                { decision: "Grant Exception", raci: ["A", "C", "I", "R", "R"] },
              ].map((row, ri) => <tr key={row.decision} style={{ background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td className="px-3 py-2 text-[12px] font-semibold text-[var(--text-primary)]">{row.decision}</td>
                {row.raci.map((r, i) => {
                  const raciColors: Record<string, { bg: string; text: string }> = { R: { bg: "rgba(244,168,58,0.15)", text: "var(--amber)" }, A: { bg: "rgba(139,168,122,0.15)", text: "var(--sage)" }, C: { bg: "rgba(244,168,58,0.15)", text: "var(--amber)" }, I: { bg: "rgba(148,163,184,0.12)", text: "var(--ink-soft)" } };
                  const c = raciColors[r] || raciColors.I;
                  return <td key={i} className="px-2 py-2 text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>{r}</span></td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issues */}
      <Card title="JA Health Issues">
        <div className="space-y-3">
          {singleIncumbent.length > 0 && <div className="rounded-lg p-3 border-l-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(244,168,58,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--warning)]">Single Incumbent Risk</span><Badge color="amber">{singleIncumbent.length} roles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">These roles have only 1 person — key-person dependency risk.</div>
            <div className="flex flex-wrap gap-1 mt-2">{singleIncumbent.slice(0, 8).map(j => <span key={j.id} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{j.title}</span>)}{singleIncumbent.length > 8 && <span className="text-[12px] text-[var(--text-muted)]">+{singleIncumbent.length - 8} more</span>}</div>
          </div>}

          {titleDuplicates.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--purple)", background: "rgba(167,139,184,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--purple)]">Cross-Function Title Inconsistency</span><Badge color="purple">{titleDuplicates.length} titles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">Same title exists at different levels across functions — standardize.</div>
            <div className="space-y-1 mt-2">{titleDuplicates.slice(0, 5).map(([title, levels], i) => <div key={`dup-${i}`} className="text-[13px] text-[var(--text-muted)]">&quot;{title}&quot; found at levels: {[...levels].join(", ")}</div>)}</div>
          </div>}

          {levelCompression.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(244,168,58,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--warning)]">Level Compression</span><Badge color="amber">{levelCompression.length} functions</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">&gt;70% of headcount concentrated in 2 adjacent levels — limited career progression.</div>
            <div className="flex flex-wrap gap-1 mt-2">{levelCompression.map(([func]) => <span key={func} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{func}</span>)}</div>
          </div>}

          {noTasksRoles.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--risk)", background: "rgba(232,122,93,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--risk)]">Missing Task Data</span><Badge color="red">{noTasksRoles.length} roles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">These roles have no task-level data — they cannot be analyzed in the Work Design Lab.</div>
          </div>}

          {healthScore >= 80 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--success)", background: "rgba(139,168,122,0.04)" }}>
            <div className="text-[14px] font-bold text-[var(--success)]">JA is in good health</div>
            <div className="text-[13px] text-[var(--text-secondary)]">No critical issues detected. Continue regular maintenance.</div>
          </div>}
        </div>
      </Card>

      {/* Change Log */}
      <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3" style={{ letterSpacing: "-0.02em" }}>Recent Changes</div>
        <div className="space-y-2">
          {[
            { text: "Added Senior Data Engineer to P4", date: "2026-04-10", who: "J. Chen", status: "Approved", color: "var(--sage)" },
            { text: "Consolidated 3 Analyst roles into 1", date: "2026-04-08", who: "M. Rodriguez", status: "Approved", color: "var(--sage)" },
            { text: "New AI Operations Specialist role proposed", date: "2026-04-05", who: "S. Patel", status: "Pending", color: "var(--amber)" },
            { text: "Deprecated Legacy Systems Admin", date: "2026-04-01", who: "K. Wilson", status: "Approved", color: "var(--sage)" },
            { text: "Reclassified UX Designer from P2 to P3", date: "2026-03-28", who: "A. Kim", status: "Rejected", color: "var(--coral)" },
          ].map((entry, i) => <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ borderLeft: `3px solid ${entry.color}`, background: `${entry.color}06` }}>
            <div className="flex-1"><div className="text-[12px] text-[var(--text-primary)]">{entry.text}</div><div className="text-[10px] text-[var(--ink-faint)]">{entry.date} · {entry.who}</div></div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${entry.color}15`, color: entry.color }}>{entry.status}</span>
          </div>)}
        </div>
      </div>

      {/* Governance Policies accordion */}
      <GovernancePolicies />
    </div>}

    {/* ─── CHANGE REQUESTS ─── */}
    {govView === "changes" && <Card title="Role Change Requests">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track requests to create, modify, or deprecate roles in the job architecture.</div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[{ l: "Total", v: changeReqs.length, c: "var(--text-primary)" }, { l: "Pending", v: changeReqs.filter(r => r.status === "Pending").length, c: "var(--warning)" }, { l: "Approved", v: changeReqs.filter(r => r.status === "Approved").length, c: "var(--success)" }, { l: "Rejected", v: changeReqs.filter(r => r.status === "Rejected").length, c: "var(--risk)" }].map(k => <div key={k.l} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{ color: k.c }}>{k.v}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{k.l}</div></div>)}
      </div>
      {changeReqs.length > 0 && <div className="overflow-x-auto rounded-lg border border-[var(--border)] mb-4"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
        {["Type", "Role", "Requested By", "Justification", "Date", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">{h}</th>)}
      </tr></thead><tbody>
        {changeReqs.map(cr => {
          const typeColors: Record<string, string> = { new: "#8ba87a", modify: "#f4a83a", deprecate: "#e87a5d" };
          const statusColors: Record<string, string> = { Draft: "#8a7f6d", Pending: "#f4a83a", Approved: "#8ba87a", Rejected: "#e87a5d" };
          return <tr key={cr.id} className="border-b border-[var(--border)]">
            <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${typeColors[cr.type]}12`, color: typeColors[cr.type] }}>{cr.type}</span></td>
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{cr.roleTitle}</td>
            <td className="px-3 py-2 text-[var(--text-muted)]">{cr.requestedBy}</td>
            <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px] truncate">{cr.justification}</td>
            <td className="px-3 py-2 text-[var(--text-muted)]">{cr.date}</td>
            <td className="px-3 py-2"><button onClick={() => { const cycle: JAChangeRequest["status"][] = ["Draft", "Pending", "Approved", "Rejected"]; setChangeReqs(prev => prev.map(r => r.id === cr.id ? { ...r, status: cycle[(cycle.indexOf(r.status) + 1) % cycle.length] } : r)); }} className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[cr.status]}12`, color: statusColors[cr.status] }}>{cr.status}</button></td>
            <td className="px-3 py-2"><button onClick={() => setChangeReqs(prev => prev.filter(r => r.id !== cr.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[12px]">×</button></td>
          </tr>;
        })}
      </tbody></table></div>}
      {addingChange ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select id="cr-type" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none"><option value="new">New Role</option><option value="modify">Modify Role</option><option value="deprecate">Deprecate Role</option></select>
          <input id="cr-role" placeholder="Role title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
          <input id="cr-by" placeholder="Requested by..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
          <input id="cr-just" placeholder="Business justification..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || ""; const role = el("cr-role"); if (!role) return; setChangeReqs(prev => [...prev, { id: `cr${Date.now()}`, type: el("cr-type") as JAChangeRequest["type"], roleTitle: role, requestedBy: el("cr-by"), justification: el("cr-just"), status: "Draft", date: new Date().toISOString().split("T")[0], approver: "" }]); setAddingChange(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Submit</button>
          <button onClick={() => setAddingChange(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
        </div>
      </div> : <button onClick={() => setAddingChange(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ New Change Request</button>}
    </Card>}

    {/* ─── ANNUAL REVIEW ─── */}
    {govView === "review" && <Card title="Annual JA Review Workflow">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Structured 5-step annual review process for job architecture quality assurance.</div>
      <div className="space-y-3">
        {[
          { step: 1, title: "Data Quality Check", desc: "Flag stale, incomplete, or orphaned roles", icon: "🔍", check: noTasksRoles.length === 0 },
          { step: 2, title: "Market Alignment", desc: "Verify levels are consistent with external benchmarks", icon: "📊", check: false },
          { step: 3, title: "Structural Review", desc: "Ensure family/sub-family organization still makes sense", icon: "🏗️", check: titleDuplicates.length === 0 },
          { step: 4, title: "Career Path Review", desc: "Verify all paths are valid, identify dead ends", icon: "🪜", check: false },
          { step: 5, title: "Stakeholder Sign-off", desc: "HR Head, Function Heads approve the reviewed JA", icon: "✅", check: false },
        ].map((s, i) => <div key={s.step} className="rounded-xl border bg-[var(--surface-2)] p-4 flex items-center gap-4" style={{ borderColor: reviewStep >= i ? (s.check ? "var(--success)" : "var(--accent-primary)") : "var(--border)", opacity: reviewStep >= i ? 1 : 0.5 }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0" style={{ background: reviewStep > i ? "rgba(139,168,122,0.1)" : reviewStep === i ? "rgba(244,168,58,0.1)" : "var(--surface-2)" }}>{reviewStep > i ? "✓" : s.icon}</div>
          <div className="flex-1"><div className="text-[15px] font-bold text-[var(--text-primary)]">Step {s.step}: {s.title}</div><div className="text-[13px] text-[var(--text-muted)]">{s.desc}</div></div>
          {reviewStep === i && <button onClick={() => setReviewStep(i + 1)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Complete</button>}
        </div>)}
      </div>
      {reviewStep >= 5 && <div className="mt-4 rounded-xl bg-[rgba(139,168,122,0.06)] border border-[var(--success)]/20 p-4 text-center">
        <div className="text-[18px] font-bold text-[var(--success)] mb-1">Annual Review Complete</div>
        <div className="text-[14px] text-[var(--text-muted)]">All 5 steps completed. JA is reviewed and approved.</div>
        <button onClick={() => setReviewStep(0)} className="mt-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">Reset for next review</button>
      </div>}
    </Card>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JA INTELLIGENCE — Role evolution, emerging roles, drift detection
   ═══════════════════════════════════════════════════════════════ */

function JAIntelligenceTab({ jobs, employees, model }: { jobs: Job[]; employees: Employee[]; model: string }) {
  const [intView, setIntView] = useState<"evolution" | "emerging" | "drift" | "vitals" | "slides">("slides");
  const [aiInsights, setAiInsights] = usePersisted<{ id: string; type: string; severity: string; title: string; body: string; affected: number; action: string }[]>(`${model}_ja_insights`, []);
  const [aiLoading, setAiLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  // Keyboard nav for slides
  useEffect(() => {
    if (intView !== "slides") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); setSlideIdx(p => p + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSlideIdx(p => Math.max(0, p - 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [intView]);

  // Compute insights from data
  const singleIncumbent = jobs.filter(j => j.headcount === 1);
  const highAiImpact = jobs.filter(j => j.ai_score >= 5);
  const lowTaskCoverage = jobs.filter(j => !j.tasks_mapped || j.tasks_mapped < 3);
  const jdComplete = jobs.filter(j => j.tasks_mapped > 0).length;
  const jdPct = jobs.length ? Math.round((jdComplete / jobs.length) * 100) : 0;
  const evalPct = 0; // from evaluation tab
  const pathPct = 0; // from lattice tab

  const generateInsights = async () => {
    setAiLoading(true);
    try {
      const jobSummary = jobs.slice(0, 30).map(j => `${j.title}(${j.function},${j.level},HC:${j.headcount},AI:${j.ai_score?.toFixed(1)})`).join("; ");
      const raw = await callAI("Return ONLY valid JSON array.", `Analyze these roles and generate 5 intelligence insights about the job architecture. Types: "evolution" (role changing), "emerging" (new role needed), "convergence" (roles merging), "compression" (role at risk), "drift" (architecture misalignment). Each: {"type":"...","severity":"urgent|watch|opportunity","title":"...","body":"2 sentences","affected":N,"action":"recommended action"}. Roles: ${jobSummary}`);
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      if (Array.isArray(parsed)) setAiInsights(parsed.map((p: Record<string, unknown>, i: number) => ({ ...p, id: `ins_${i}` })) as typeof aiInsights);
    } catch { showToast("Couldn't generate insights — try again in a moment"); }
    setAiLoading(false);
  };

  return <div className="animate-tab-enter space-y-5">
    <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] mb-4">
      {([
        { id: "slides" as const, label: "◎ Insights", icon: "" },
        { id: "evolution" as const, label: "◈ Evolution", icon: "" },
        { id: "emerging" as const, label: "◇ Emerging", icon: "" },
        { id: "drift" as const, label: "◍ Drift", icon: "" },
        { id: "vitals" as const, label: "◉ Vitals", icon: "" },
      ]).map(v => <button key={v.id} onClick={() => setIntView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all" style={{ background: intView === v.id ? "rgba(244,168,58,0.15)" : "transparent", color: intView === v.id ? "var(--amber)" : "var(--ink-faint)", border: intView === v.id ? "1px solid rgba(244,168,58,0.3)" : "none" }}>{v.label}</button>)}
    </div>

    {/* ─── SLIDESHOW INSIGHTS ─── */}
    {intView === "slides" && (() => {
      const jdComplete = jobs.filter(j => j.tasks_mapped > 0).length;
      const jdPct = jobs.length ? Math.round((jdComplete / jobs.length) * 100) : 0;
      const highAI = jobs.filter(j => j.ai_score >= 5);
      const singleInc = jobs.filter(j => j.headcount === 1);
      const slides = [
        { severity: "critical" as const, icon: "⚠", title: "Skills Data Gap", body: `${100 - jdPct}% of roles lack career path definitions. Without task-level data, the Work Design Lab cannot generate AI impact assessments or redeployment recommendations for these roles.`, stat: `${100 - jdPct}%`, statLabel: "Missing career paths", action: "Prioritize task mapping for the top 20 roles by headcount. Use the Job Content tab for bulk authoring with AI assistance." },
        { severity: "warning" as const, icon: "◈", title: "Career Bottleneck P4→P5", body: "The P4 to P5 transition shows a 4.3:1 compression ratio (4.3 people competing for every 1 position) versus the 2.5:1 industry benchmark. This creates a career ceiling that drives attrition at senior IC levels.", stat: "4.3:1", statLabel: "Compression ratio", action: "Create differentiated P4a/P4b sub-levels or introduce a Staff track to decompress the P4→P5 pipeline." },
        { severity: "warning" as const, icon: "◈", title: "Title Inconsistency Detected", body: "'Senior Analyst' appears in 4 different job families at different career levels. This creates confusion in internal mobility, compensation benchmarking, and career pathing.", stat: "4", statLabel: "Families affected", action: "Standardize the 'Senior Analyst' title to a single level (recommend P3) or differentiate with family-specific prefixes." },
        { severity: "info" as const, icon: "ℹ", title: "T-Track Level Gaps", body: "The Technical track is missing T1, T2, and T4 levels, creating no entry-level path into technical specialization. Early-career employees cannot access the T-track without lateral moves.", stat: "3", statLabel: "Missing levels", action: "Define T1-T2 entry roles (e.g., Associate Technologist, Technical Analyst) and T4 bridge roles to create a complete technical career ladder." },
        { severity: "positive" as const, icon: "✓", title: "Healthy Pyramid Shape", body: "The organization's level distribution follows a 62/25/13 ratio (IC/Manager/Executive), which is within the industry benchmark of 60-65% ICs, 20-28% managers, and 10-15% executives.", stat: "62%", statLabel: "IC ratio", action: "Maintain current distribution. Monitor for management layer creep during growth periods." },
        { severity: "info" as const, icon: "ℹ", title: "Fastest Growing Function", body: `${highAI.length > 0 ? `${highAI[0]?.function || "IT Infrastructure"} has the highest concentration of AI-impacted roles. ${highAI.length} roles are flagged for significant automation potential.` : "IT Infrastructure is growing fastest at +15% YoY, driven by cloud migration and AI infrastructure buildout."}`, stat: highAI.length > 0 ? String(highAI.length) : "+15%", statLabel: highAI.length > 0 ? "AI-impacted roles" : "YoY growth", action: "Align hiring plans with AI impact assessments. Prioritize roles that complement rather than duplicate automation capabilities." },
      ];
      const s = slides[slideIdx % slides.length];
      const sevColors: Record<string, string> = { critical: "#e87a5d", warning: "#f4a83a", positive: "#8ba87a", info: "#f4a83a" };
      const sc = sevColors[s.severity] || "#f4a83a";

      return <div>
        {/* Navigation */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <button onClick={() => setSlideIdx(Math.max(0, slideIdx - 1))} disabled={slideIdx === 0} className="px-2.5 py-1 rounded-lg text-[12px] font-bold disabled:opacity-30 transition-all" style={{ color: "var(--ink-faint)", border: "1px solid var(--border)" }}>←</button>
          <span className="text-[12px] text-[var(--ink-faint)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(slideIdx % slides.length) + 1}/{slides.length}</span>
          <button onClick={() => setSlideIdx(Math.min(slides.length - 1, slideIdx + 1))} disabled={slideIdx >= slides.length - 1} className="px-2.5 py-1 rounded-lg text-[12px] font-bold disabled:opacity-30 transition-all" style={{ color: "var(--ink-faint)", border: "1px solid var(--border)" }}>→</button>
        </div>

        {/* Slide */}
        <div className="flex justify-center">
          <div className="w-full max-w-[900px] min-h-[220px] rounded-[14px] p-7 transition-all duration-500" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          }}>
            <div className="flex gap-8">
              {/* Left 60% */}
              <div className="flex-[60] flex flex-col">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit mb-3" style={{ background: `${sc}15`, color: sc }}>{s.icon} {s.severity === "critical" ? "Critical" : s.severity === "warning" ? "Warning" : s.severity === "positive" ? "On Track" : "Insight"}</span>
                <h3 className="text-[20px] font-bold text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.02em" }}>{s.title}</h3>
                <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed mb-auto">{s.body}</p>
                <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(244,168,58,0.06)", borderLeft: "3px solid var(--amber)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--amber)] mb-1">Recommended Action</div>
                  <div className="text-[12px] text-[var(--ink)] leading-relaxed">{s.action}</div>
                </div>
              </div>
              {/* Right 40% */}
              <div className="flex-[40] flex flex-col items-center justify-center">
                <div className="text-[52px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: sc, textShadow: `0 0 20px ${sc}30` }}>{s.stat}</div>
                <div className="text-[11px] text-[var(--ink-faint)] uppercase tracking-[0.08em]">{s.statLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {slides.map((_, i) => <button key={i} onClick={() => setSlideIdx(i)} className="rounded-full transition-all duration-300" style={{ width: i === slideIdx % slides.length ? 24 : 8, height: 8, background: i === slideIdx % slides.length ? "var(--amber)" : "rgba(255,255,255,0.15)" }} />)}
        </div>
      </div>;
    })()}

    {/* ─── ROLE EVOLUTION ─── */}
    {intView === "evolution" && <Card title="Role Evolution Detector">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">AI-detected roles that are transforming, converging, or at risk of compression.</div>
      <button onClick={generateInsights} disabled={aiLoading} className="px-5 py-2 rounded-xl text-[14px] font-bold text-white mb-4" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: aiLoading ? 0.5 : 1 }}>{aiLoading ? "Analyzing..." : "✨ AI Detect Role Evolution"}</button>
      {/* Auto-detected insights */}
      <div className="space-y-3">
        {highAiImpact.length > 0 && <div className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--risk)", background: "rgba(232,122,93,0.04)" }}>
          <div className="flex items-center gap-2 mb-1"><span className="text-[14px]">🔴</span><span className="text-[15px] font-bold text-[var(--text-primary)]">High AI Impact Roles — Compression Risk</span><Badge color="red">{highAiImpact.length} roles</Badge></div>
          <div className="text-[14px] text-[var(--text-secondary)] mb-2">These roles have AI impact scores above 5.0 — significant portions of their tasks are automatable. Plan redeployment for {highAiImpact.reduce((s, j) => s + j.headcount, 0)} incumbents.</div>
          <div className="flex flex-wrap gap-1">{highAiImpact.slice(0, 8).map(j => <span key={j.id} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{j.title} ({j.ai_score?.toFixed(1)})</span>)}</div>
        </div>}
        {singleIncumbent.length > 3 && <div className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)", background: "rgba(244,168,58,0.04)" }}>
          <div className="flex items-center gap-2 mb-1"><span className="text-[14px]">🟡</span><span className="text-[15px] font-bold text-[var(--text-primary)]">Key-Person Dependency</span><Badge color="amber">{singleIncumbent.length} roles</Badge></div>
          <div className="text-[14px] text-[var(--text-secondary)]">{singleIncumbent.length} roles have only 1 incumbent. If they leave, there is no backup. Build succession plans or cross-train.</div>
        </div>}
        {/* AI-generated insights */}
        {aiInsights.filter(i => i.type === "evolution" || i.type === "convergence" || i.type === "compression").map(ins => {
          const sevColors: Record<string, string> = { urgent: "#e87a5d", watch: "#f4a83a", opportunity: "#8ba87a" };
          const sevIcons: Record<string, string> = { urgent: "🔴", watch: "🟡", opportunity: "🟢" };
          return <div key={ins.id} className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: sevColors[ins.severity] || "#8a7f6d", background: `${sevColors[ins.severity] || "#8a7f6d"}06` }}>
            <div className="flex items-center gap-2 mb-1"><span className="text-[14px]">{sevIcons[ins.severity] || "⚪"}</span><span className="text-[15px] font-bold text-[var(--text-primary)]">{ins.title}</span>{ins.affected > 0 && <Badge color="gray">{ins.affected} affected</Badge>}</div>
            <div className="text-[14px] text-[var(--text-secondary)] mb-1">{ins.body}</div>
            <div className="text-[13px] text-[var(--accent-primary)]">→ {ins.action}</div>
          </div>;
        })}
      </div>
    </Card>}

    {/* ─── EMERGING ROLES ─── */}
    {intView === "emerging" && <Card title="Emerging Role Predictor">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Based on AI impact analysis and transformation plans, these roles will likely be needed within 12 months.</div>
      {aiInsights.filter(i => i.type === "emerging").length > 0 ? <div className="space-y-3">
        {aiInsights.filter(i => i.type === "emerging").map(ins => <div key={ins.id} className="rounded-xl border border-[var(--success)]/20 bg-[rgba(139,168,122,0.04)] p-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[16px]">🌱</span><span className="text-[16px] font-bold text-[var(--text-primary)]">{ins.title}</span></div>
          <div className="text-[14px] text-[var(--text-secondary)] mb-2">{ins.body}</div>
          <div className="text-[13px] text-[var(--accent-primary)]">→ {ins.action}</div>
        </div>)}
      </div> : <div className="text-center py-12"><div className="text-[40px] mb-3 opacity-40">🌱</div><div className="text-[14px] text-[var(--text-muted)]">Click &quot;AI Detect Role Evolution&quot; in the Evolution tab to generate predictions.</div></div>}
      {/* Common emerging roles */}
      <div className="mt-5"><div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Common AI-Era Emerging Roles</div>
        <div className="grid grid-cols-2 gap-3">{[
          { title: "AI Operations Specialist", desc: "Manages AI tools, monitors outputs, handles exceptions", family: "Technology", level: "P3" },
          { title: "Human-AI Workflow Designer", desc: "Designs how humans and AI collaborate on processes", family: "Operations", level: "P4" },
          { title: "Data Ethics Officer", desc: "Ensures AI decisions are fair, explainable, compliant", family: "Legal", level: "P4" },
          { title: "Automation Reliability Engineer", desc: "Maintains and troubleshoots automated workflows", family: "Technology", level: "P3" },
          { title: "Prompt Engineer", desc: "Designs and optimizes AI prompts for business processes", family: "Technology", level: "P2" },
          { title: "AI Change Champion", desc: "Drives adoption of AI tools across the organization", family: "HR", level: "P3" },
        ].map(r => <div key={r.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="text-[14px] font-bold text-[var(--text-primary)]">{r.title}</div>
          <div className="text-[13px] text-[var(--text-muted)] mb-1">{r.desc}</div>
          <div className="text-[12px] text-[var(--text-muted)]">{r.family} · {r.level}</div>
        </div>)}</div>
      </div>
    </Card>}

    {/* ─── ARCHITECTURE DRIFT ─── */}
    {intView === "drift" && <Card title="Architecture Drift Monitor">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Detects when the actual workforce drifts away from the designed architecture.</div>
      <div className="space-y-3">
        {aiInsights.filter(i => i.type === "drift").map(ins => <div key={ins.id} className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)", background: "rgba(244,168,58,0.04)" }}>
          <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{ins.title}</div>
          <div className="text-[14px] text-[var(--text-secondary)]">{ins.body}</div>
        </div>)}
        {/* Static drift indicators */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Architecture Coverage</div>
          <div className="space-y-2">
            {[
              { label: "Employees mapped to JA roles", val: employees.length, total: employees.length, color: "var(--success)" },
              { label: "Roles with task data", val: jdComplete, total: jobs.length, color: jdPct >= 70 ? "var(--success)" : "var(--warning)" },
              { label: "Unique job titles in use", val: new Set(jobs.map(j => j.title)).size, total: jobs.length, color: "var(--accent-primary)" },
            ].map(m => <div key={m.label}>
              <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{m.label}</span><span className="font-bold font-data" style={{ color: m.color }}>{m.val}/{m.total}</span></div>
              <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(m.val / Math.max(m.total, 1)) * 100}%`, background: m.color }} /></div>
            </div>)}
          </div>
        </div>
      </div>
    </Card>}

    {/* ─── VITAL SIGNS ─── */}
    {intView === "vitals" && <Card title="Architecture Vital Signs">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Real-time health metrics for your job architecture. Action queue shows what to fix first.</div>
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "JA Coverage", val: `${employees.length > 0 ? "100" : "0"}%`, color: "var(--success)" },
          { label: "JD Complete", val: `${jdPct}%`, color: jdPct >= 70 ? "var(--success)" : jdPct >= 40 ? "var(--warning)" : "var(--risk)" },
          { label: "Roles Evaluated", val: `${evalPct}%`, color: evalPct >= 70 ? "var(--success)" : "var(--warning)" },
          { label: "Career Paths", val: `${pathPct}%`, color: pathPct >= 70 ? "var(--success)" : "var(--warning)" },
          { label: "Total Roles", val: String(jobs.length), color: "var(--text-primary)" },
        ].map(v => <div key={v.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold font-data" style={{ color: v.color }}>{v.val}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">{v.label}</div></div>)}
      </div>
      {/* Action queue */}
      <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Priority Action Queue</div>
      <div className="space-y-2">
        {[
          { priority: 1, action: `Write task data for ${lowTaskCoverage.length} roles with no/low task coverage`, impact: `Improves JD completeness to ${Math.round(((jdComplete + lowTaskCoverage.length) / Math.max(jobs.length, 1)) * 100)}%`, effort: "Medium" },
          { priority: 2, action: `Evaluate ${jobs.length} roles using the Job Evaluation tab`, impact: "Enables leveling consistency analysis", effort: "High" },
          { priority: 3, action: `Build career paths for roles in the Career Lattice tab`, impact: "Enables succession planning and mobility", effort: "Medium" },
          { priority: 4, action: `Review ${singleIncumbent.length} single-incumbent roles for succession risk`, impact: "Reduces key-person dependency", effort: "Low" },
        ].map(a => <div key={a.priority} className="flex items-center gap-3 rounded-xl p-3 bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shrink-0" style={{ background: "var(--accent-primary)" }}>#{a.priority}</div>
          <div className="flex-1"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{a.action}</div><div className="text-[12px] text-[var(--text-muted)]">Impact: {a.impact} · Effort: {a.effort}</div></div>
        </div>)}
      </div>
    </Card>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   ROLE NETWORK — Task overlap, skill adjacency, dependencies
   ═══════════════════════════════════════════════════════════════ */

function RoleNetworkTab({ jobs, model }: { jobs: Job[]; model: string }) {
  const [netView, setNetView] = useState<"overlap" | "skills" | "succession">("overlap");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedPair, setExpandedPair] = useState<number | null>(null);

  const MONO = "'JetBrains Mono', monospace";
  const viewThemes: Record<string, string> = { overlap: "var(--amber)", skills: "var(--amber)", succession: "var(--coral)" };

  // Escape key closes full screen
  useEffect(() => {
    if (!isFullScreen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullScreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isFullScreen]);

  // Compute task overlap
  const overlapPairs = useMemo(() => {
    const pairs: { a: Job; b: Job; overlap: number; type: "high" | "medium" | "low" }[] = [];
    for (let i = 0; i < Math.min(jobs.length, 30); i++) {
      for (let j = i + 1; j < Math.min(jobs.length, 30); j++) {
        const a = jobs[i], b = jobs[j];
        let overlap = 0;
        if (a.family === b.family) overlap += 40;
        if (a.sub_family === b.sub_family) overlap += 30;
        if (a.function === b.function) overlap += 15;
        if (a.level === b.level) overlap += 10;
        if (Math.abs(a.ai_score - b.ai_score) < 1) overlap += 5;
        if (overlap >= 50) pairs.push({ a, b, overlap, type: overlap >= 70 ? "high" : overlap >= 60 ? "medium" : "low" });
      }
    }
    return pairs.sort((a, b) => b.overlap - a.overlap).slice(0, 30);
  }, [jobs]);

  const selectedPairs = selectedRoleId ? overlapPairs.filter(p => p.a.id === selectedRoleId || p.b.id === selectedRoleId) : [];

  const overlapColor = (type: string) => type === "high" ? "var(--coral)" : type === "medium" ? "var(--amber)" : "var(--amber)";
  const overlapLabel = (type: string) => type === "high" ? "Likely Duplication" : type === "medium" ? "Potential Redundancy" : "Healthy Collaboration";

  // The main content — rendered both inline and in full-screen
  const content = <div style={{ display: "flex", flexDirection: "column", gap: 16, height: isFullScreen ? "100%" : "auto" }}>
    {/* Sub-tab pills */}
    <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
      {([
        { id: "overlap" as const, label: "Task Overlap", color: "var(--amber)" },
        { id: "skills" as const, label: "Skill Adjacency", color: "var(--amber)" },
        { id: "succession" as const, label: "Succession Risk", color: "var(--coral)" },
      ]).map(v => <button key={v.id} onClick={() => setNetView(v.id)} style={{
        flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s",
        background: netView === v.id ? `${v.color}15` : "transparent",
        color: netView === v.id ? v.color : "var(--ink-faint)",
      }}>{v.label}</button>)}
    </div>

    {/* ─── TASK OVERLAP ─── */}
    {netView === "overlap" && <>
      {/* Bubble chart */}
      <div style={{ borderRadius: 12, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", minHeight: isFullScreen ? "50vh" : 300 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 12 }}>Role Network by Family — sized by headcount, colored by track</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "flex-start" }}>
          {(() => {
            const families = [...new Set(jobs.map(j => j.family))];
            return families.slice(0, 10).map(fam => {
              const famJobs = jobs.filter(j => j.family === fam).slice(0, 8);
              return <div key={fam} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.02)", minWidth: 100 }}>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, textAlign: "center", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fam}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 120 }}>
                  {famJobs.map(j => {
                    const size = Math.max(16, Math.min(40, j.headcount * 0.9 + 8));
                    const tc = getTrackColor(j.level || j.track);
                    const isSelected = selectedRoleId === j.id;
                    const isConnected = selectedRoleId && overlapPairs.some(p => (p.a.id === selectedRoleId && p.b.id === j.id) || (p.b.id === selectedRoleId && p.a.id === j.id));
                    const dimmed = selectedRoleId && !isSelected && !isConnected;
                    return <div key={j.id} onClick={() => setSelectedRoleId(isSelected ? null : j.id)} title={`${j.title}\n${j.level} · ${j.headcount} HC\n${j.function}`} style={{
                      width: size, height: size, borderRadius: "50%", cursor: "pointer", transition: "all 0.2s",
                      background: isSelected ? tc : `${tc}50`,
                      border: isSelected ? `2px solid ${tc}` : isConnected ? `2px solid ${tc}60` : "1px solid transparent",
                      boxShadow: isSelected ? `0 0 12px ${tc}40` : "none",
                      opacity: dimmed ? 0.2 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{size >= 28 && <span style={{ fontSize: 7, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{j.headcount}</span>}</div>;
                  })}
                </div>
              </div>;
            });
          })()}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12, fontSize: 11, color: "var(--ink-faint)" }}>
          {Object.entries(TRACK_COLORS).filter(([k]) => k.length === 1).map(([k, c]) => <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{k}</span>)}
        </div>
      </div>

      {/* Role selector */}
      <select value={selectedRoleId || ""} onChange={e => setSelectedRoleId(e.target.value || null)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
        <option value="">All roles — showing top overlaps</option>
        {jobs.slice(0, 50).map(j => <option key={j.id} value={j.id}>{j.title} ({j.function} · {j.level})</option>)}
      </select>

      {/* Overlap pairs — expandable */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: isFullScreen ? 1 : "none", overflowY: isFullScreen ? "auto" : "visible" }}>
        {(selectedRoleId ? selectedPairs : overlapPairs).slice(0, isFullScreen ? 30 : 15).map((pair, i) => {
          const oc = overlapColor(pair.type);
          const isExpanded = expandedPair === i;
          return <div key={i} style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
            <button onClick={() => setExpandedPair(isExpanded ? null : i)} style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              {/* Roles with level badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <LevelBadge level={pair.a.level} size="sm" />
                  <button onClick={e => { e.stopPropagation(); setSelectedRoleId(pair.a.id); }} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", background: "none", border: "none", cursor: "pointer" }}>{pair.a.title}</button>
                  <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>↔</span>
                  <LevelBadge level={pair.b.level} size="sm" />
                  <button onClick={e => { e.stopPropagation(); setSelectedRoleId(pair.b.id); }} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", background: "none", border: "none", cursor: "pointer" }}>{pair.b.title}</button>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{pair.a.function} | {pair.b.function}</div>
              </div>
              {/* Overlap bar + percentage */}
              <div style={{ width: 120, flexShrink: 0 }}>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: oc, width: `${pair.overlap}%`, transition: "width 0.3s" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, width: 80 }}>
                <div style={{ fontSize: 15, fontFamily: MONO, fontWeight: 700, color: oc }}>{pair.overlap.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: oc }}>{overlapLabel(pair.type)}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--ink-faint)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {/* Expanded detail */}
            {isExpanded && <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border-light)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 4 }}>Shared Characteristics</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {pair.a.family === pair.b.family && <div>Same family: {pair.a.family}</div>}
                    {pair.a.sub_family === pair.b.sub_family && pair.a.sub_family && <div>Same sub-family: {pair.a.sub_family}</div>}
                    {pair.a.function === pair.b.function && <div>Same function: {pair.a.function}</div>}
                    {pair.a.level === pair.b.level && <div>Same level: {pair.a.level}</div>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 4 }}>Differences</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {pair.a.function !== pair.b.function && <div>Functions: {pair.a.function} vs {pair.b.function}</div>}
                    {pair.a.level !== pair.b.level && <div>Levels: {pair.a.level} vs {pair.b.level}</div>}
                    {pair.a.track !== pair.b.track && <div>Tracks: {pair.a.track} vs {pair.b.track}</div>}
                    <div>HC: {pair.a.headcount} vs {pair.b.headcount}</div>
                  </div>
                </div>
              </div>
            </div>}
          </div>;
        })}
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--ink-faint)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--coral)" }} />&gt;70% Duplication</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--amber)" }} />60-70% Redundancy</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--amber)" }} />50-60% Collaboration</span>
      </div>
    </>}

    {/* ─── SKILL ADJACENCY ─── */}
    {netView === "skills" && <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Roles that share skills are &quot;skill neighbors&quot; — ideal candidates for internal mobility and reskilling pathways.</div>
      {/* Skill cluster visualization */}
      <div style={{ borderRadius: 12, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", minHeight: isFullScreen ? "40vh" : 200 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 12 }}>Skill Clusters — roles grouped by shared skill profiles</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
          {(() => {
            // Group by family as proxy for skill cluster
            const families = [...new Set(jobs.map(j => j.family))].slice(0, 6);
            return families.map((fam, fi) => {
              const famJobs = jobs.filter(j => j.family === fam).slice(0, 5);
              const clusterColor = [TRACK_COLORS.P, TRACK_COLORS.M, TRACK_COLORS.T, TRACK_COLORS.E, TRACK_COLORS.S, "#f4a83a"][fi % 6];
              return <div key={fam} style={{ padding: 12, borderRadius: 12, background: `${clusterColor}06`, border: `1px solid ${clusterColor}15`, minWidth: 120 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: clusterColor, marginBottom: 6, textAlign: "center" }}>{fam}</div>
                {famJobs.map(j => <div key={j.id} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "2px 0", borderBottom: "1px solid var(--border-light)" }}>{j.title} <span style={{ fontSize: 11, fontFamily: MONO, color: "var(--ink-faint)" }}>{j.headcount}</span></div>)}
              </div>;
            });
          })()}
        </div>
      </div>
      {/* Adjacency table */}
      <div className="overflow-x-auto" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {["From Role", "To Role", "Shared Skills", "Gap", "Move Type"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>)}
          </tr></thead>
          <tbody>{overlapPairs.slice(0, 12).map((pair, i) => {
            const shared = Math.round(pair.overlap * 0.8);
            const gap = 100 - shared;
            const moveType = pair.a.level === pair.b.level ? "Lateral" : "Vertical";
            return <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td style={{ padding: "8px 12px" }}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pair.a.title}</span><div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{pair.a.function}</div></td>
              <td style={{ padding: "8px 12px" }}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pair.b.title}</span><div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{pair.b.function}</div></td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: MONO, fontWeight: 700, color: shared >= 70 ? "var(--sage)" : "var(--amber)" }}>{shared}%</td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)" }}>{gap}%</td>
              <td style={{ padding: "8px 12px", textAlign: "center" }}><span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: moveType === "Lateral" ? "rgba(167,139,184,0.1)" : "rgba(139,168,122,0.1)", color: moveType === "Lateral" ? "var(--dusk)" : "var(--sage)" }}>{moveType}</span></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </>}

    {/* ─── SUCCESSION RISK ─── */}
    {netView === "succession" && <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Roles scored by combined succession risk: single incumbents + high AI exposure + management responsibility.</div>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Critical Risk", val: jobs.filter(j => j.headcount === 1 && (j.track === "Manager" || j.track === "Executive")).length, color: "var(--coral)", desc: "Single incumbent in leadership" },
          { label: "Watch List", val: jobs.filter(j => j.headcount <= 2 && (j.track === "Manager" || j.track === "Executive")).length, color: "var(--amber)", desc: "≤2 people in leadership roles" },
          { label: "Healthy Bench", val: jobs.filter(j => j.headcount > 2 || (j.track !== "Manager" && j.track !== "Executive")).length, color: "var(--sage)", desc: "Adequate bench depth" },
        ].map(k => <div key={k.label} style={{ borderRadius: 12, padding: 16, background: "var(--border-light)", border: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontFamily: MONO, fontWeight: 700, color: k.color }}>{k.val}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: k.color, marginTop: 2 }}>{k.label}</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{k.desc}</div>
        </div>)}
      </div>
      {/* Scatter plot — AI risk vs HC (proxy for succession risk) */}
      <div style={{ borderRadius: 12, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative", height: isFullScreen ? "40vh" : 250, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 8 }}>AI Risk × Bench Depth — top-right = knowledge at risk</div>
        {/* Quadrant highlight */}
        <div style={{ position: "absolute", top: 32, right: 16, width: "45%", height: "45%", background: "rgba(232,122,93,0.04)", borderRadius: 8, border: "1px dashed rgba(232,122,93,0.15)" }}>
          <span style={{ position: "absolute", top: 4, right: 8, fontSize: 11, fontWeight: 700, color: "rgba(232,122,93,0.5)" }}>KNOWLEDGE AT RISK</span>
        </div>
        <div style={{ position: "absolute", bottom: 32, left: 80, fontSize: 11, color: "rgba(139,168,122,0.4)", fontWeight: 600 }}>STABLE & GROWING</div>
        {/* Axis labels */}
        <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>AI Automation Risk →</div>
        <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>← Single Incumbent</div>
        {/* Dots */}
        {jobs.slice(0, 40).map(j => {
          const xPct = Math.min(j.ai_score * 10, 100);
          const yPct = j.headcount <= 1 ? 85 : j.headcount <= 2 ? 65 : j.headcount <= 5 ? 40 : 15;
          const tc = getTrackColor(j.level || j.track);
          const size = Math.max(8, Math.min(24, j.headcount * 1.5 + 4));
          const isRisk = xPct > 50 && yPct > 60;
          return <div key={j.id} title={`${j.title}\n${j.track} · ${j.level}\nAI: ${j.ai_score.toFixed(1)} · HC: ${j.headcount}`} style={{
            position: "absolute", left: `${8 + xPct * 0.84}%`, bottom: `${8 + (100 - yPct) * 0.84}%`,
            width: size, height: size, borderRadius: "50%", background: tc, opacity: isRisk ? 0.9 : 0.4,
            border: isRisk ? "1px solid rgba(232,122,93,0.5)" : "none", transform: "translate(-50%, 50%)", cursor: "default",
          }} />;
        })}
      </div>
      {/* Top succession risks */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 8 }}>Top Succession Risks</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {jobs.filter(j => j.headcount <= 2 && (j.track === "Manager" || j.track === "Executive")).sort((a, b) => a.headcount - b.headcount || b.ai_score - a.ai_score).slice(0, 10).map((j, i) => {
          const risk = j.headcount === 1 ? "Critical" : "Watch";
          const rc = risk === "Critical" ? "var(--coral)" : "var(--amber)";
          return <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: "var(--ink-faint)", width: 20 }}>#{i + 1}</span>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: rc, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{j.title}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{j.function} · {j.level} · {j.track}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontFamily: MONO, fontWeight: 700, color: rc }}>{j.headcount} person{j.headcount > 1 ? "s" : ""}</div>
              <div style={{ fontSize: 11, color: rc }}>{risk}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, width: 60 }}>
              <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: j.ai_score >= 6 ? "var(--coral)" : j.ai_score >= 3 ? "var(--amber)" : "var(--ink-faint)" }}>AI: {j.ai_score.toFixed(1)}</div>
            </div>
          </div>;
        })}
      </div>
    </>}
  </div>;

  // Full-screen overlay
  if (isFullScreen) return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--paper-solid)", padding: 24, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Role Network — Full View</div>
      <button onClick={() => setIsFullScreen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ink-faint)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </div>
    <div style={{ flex: 1, overflowY: "auto" }}>{content}</div>
  </div>;

  // Default inline view with expand button
  return <div style={{ position: "relative" }}>
    <button onClick={() => setIsFullScreen(true)} style={{ position: "absolute", top: 0, right: 0, zIndex: 5, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", background: "var(--border-light)", border: "1px solid var(--border)", cursor: "pointer" }} title="Expand to full screen">⛶ Expand</button>
    {content}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JOB ARCHITECTURE MODULE — premium consulting-grade experience
   ═══════════════════════════════════════════════════════════════ */

export function JobArchitectureModule({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [tab, setTab] = useState("catalogue");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobProfileTab, setJobProfileTab] = useState("content");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"level" | "headcount" | "ai" | "alpha">("level");
  const [filterTrack, setFilterTrack] = useState("All");
  const [filterAI, setFilterAI] = useState("All");
  const [compareJobs, setCompareJobs] = useState<Job[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [flagFilter, setFlagFilter] = useState("All");
  const [aiProfileData, setAiProfileData] = useState<Record<string, AiJobSuggestion>>({});

  /* JA Mapping module state */
  const [jaScenarioId, setJaScenarioId] = useState("");
  const [jaDrawerRow, setJaDrawerRow] = useState<any>(null);
  const [jaDrawerOpen, setJaDrawerOpen] = useState(false);
  const projectId = model || "Demo_Model"; // use model as project identifier

  /* Load default scenario on mount */
  useEffect(() => {
    if (!projectId) return;
    api.apiFetch(`/api/ja/scenarios?project_id=${projectId}`)
      .then(r => r.json())
      .then((scs: any[]) => {
        if (Array.isArray(scs)) {
          const primary = scs.find((s: any) => s.is_primary) || scs[0];
          if (primary) setJaScenarioId(primary.id);
        }
      }).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    const timer = setTimeout(() => setShowLoader(true), 300);
    api.getJobArchitecture(model, f).then(d => { setData(d); setLoading(false); setShowLoader(false); clearTimeout(timer); }).catch(() => { setLoading(false); setShowLoader(false); clearTimeout(timer); });
    return () => clearTimeout(timer);
  }, [model, f.func, f.jf, f.sf, f.cl]);

  const tree = (data?.tree || []) as TreeNode[];
  const jobs = (data?.jobs || []) as Job[];
  const stats = (data?.stats || {}) as Record<string, unknown>;
  const flags = (data?.flags || []) as Flag[];
  const analytics = (data?.analytics || {}) as Record<string, unknown>;
  const employees = (data?.employees || []) as Employee[];

  const debouncedSearch = useDebounce(searchQuery, 200);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    // Path filter
    if (selectedPath.length > 0) {
      const [func, family, subfam] = selectedPath;
      if (func) result = result.filter(j => j.function === func);
      if (family) result = result.filter(j => j.family === family);
      if (subfam) result = result.filter(j => j.sub_family === subfam);
    }
    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(q) || j.family.toLowerCase().includes(q) || j.sub_family.toLowerCase().includes(q));
    }
    // Track filter
    if (filterTrack !== "All") result = result.filter(j => j.track === filterTrack);
    // AI filter
    if (filterAI !== "All") result = result.filter(j => j.ai_impact === filterAI);
    // Sort
    if (sortBy === "level") result.sort((a, b) => a.level.localeCompare(b.level));
    else if (sortBy === "headcount") result.sort((a, b) => b.headcount - a.headcount);
    else if (sortBy === "ai") result.sort((a, b) => b.ai_score - a.ai_score);
    else result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [jobs, selectedPath, debouncedSearch, filterTrack, filterAI, sortBy]);

  const trackColor = (track: string) => track === "Executive" ? "var(--coral)" : track === "Manager" ? "var(--dusk)" : track === "IC" ? "var(--sky-gold)" : "var(--amber)";
  const trackBg = (track: string) => track === "Executive" ? "rgba(232,122,93,0.12)" : track === "Manager" ? "rgba(167,139,184,0.12)" : track === "IC" ? "rgba(56,189,248,0.12)" : "rgba(244,168,58,0.12)";
  const aiDot = (impact: string) => impact === "High" ? "var(--risk)" : impact === "Moderate" ? "var(--warning)" : "var(--success)";
  const levelNum = (l: string) => parseInt(l.replace(/\D/g, ""), 10) || 0;

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const parts: { label: string; path: string[] }[] = [{ label: "All Jobs", path: [] }];
    if (selectedPath[0]) parts.push({ label: selectedPath[0], path: [selectedPath[0]] });
    if (selectedPath[1]) parts.push({ label: selectedPath[1], path: [selectedPath[0], selectedPath[1]] });
    if (selectedPath[2]) parts.push({ label: selectedPath[2], path: [...selectedPath] });
    return parts;
  }, [selectedPath]);

  if (loading && !data) return <div className="module-enter"><PageHeader icon={<Layers3 />} title="Job Architecture" subtitle={showLoader ? "Loading job architecture..." : "Enterprise job catalogue, hierarchy, and career framework"} onBack={onBack} />{showLoader && <><LoadingBar /><div className="grid grid-cols-3 gap-4"><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /></div></>}</div>;

  return <div>
    <ContextStrip items={[`${Number(stats.total_headcount || 0).toLocaleString()} employees · ${Number(stats.total_functions || 0)} functions · ${Number(stats.total_family_groups || 0)} family groups · ${Number(stats.total_families || 0)} families · ${Number(stats.total_jobs || 0)} roles`]} />
    <PageHeader icon={<Layers3 />} title="Job Architecture" subtitle="Enterprise job catalogue, hierarchy, career framework & validation" onBack={onBack} moduleId="jobarch" viewCtx={viewCtx} />

    {/* KPI Strip — ultra-dense consulting layout */}
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-5">
      {[
        { label: "Headcount", value: Number(stats.total_headcount || 0).toLocaleString(), accent: true },
        { label: "Functions", value: Number(stats.total_functions || 0) },
        { label: "Family Groups", value: Number(stats.total_family_groups || 0) },
        { label: "Job Families", value: Number(stats.total_families || 0) },
        { label: "Sub-Families", value: Number(stats.total_sub_families || 0) },
        { label: "Unique Roles", value: Number(stats.total_jobs || 0) },
        { label: "Levels", value: Number(stats.total_levels || 0) },
        { label: "Health", value: Number(analytics.health_score || 0), isHealth: true },
      ].map(k => {
        const healthScore = k.isHealth ? Number(k.value) : 0;
        const healthColor = healthScore >= 70 ? "var(--sage)" : healthScore >= 50 ? "var(--amber)" : "var(--coral)";
        const healthVerdict = healthScore >= 90 ? "Excellent" : healthScore >= 70 ? "Solid — minor gaps" : healthScore >= 50 ? "Needs work — structural risks present" : "Critical — architecture unreliable";
        return <div key={k.label} className={`rounded-xl p-3 border transition-all hover:bg-[rgba(255,255,255,0.07)]`} style={{ background: "var(--border-light)", border: `1px solid ${k.accent ? "rgba(244,168,58,0.25)" : "var(--border)"}` }}>
          <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] mb-1">{k.label}</div>
          <div className="text-[20px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: k.isHealth ? healthColor : "var(--text-primary)" }}>{k.isHealth ? `${k.value}/100` : k.value}</div>
          {k.isHealth && <div className="text-[9px] mt-0.5" style={{ color: healthColor }}>{healthVerdict}</div>}
        </div>;
      })}
    </div>

    <TabBar tabs={[
      { id: "catalogue", label: "◆ Catalogue" },
      { id: "orgchart", label: "◇ Org Chart" },
      { id: "profiles", label: "◈ Profiles" },
      { id: "ja-framework", label: "⬡ Framework" },
      { id: "ja-health", label: "⬢ Health" },
      { id: "ja-import", label: "⬣ Import" },
      { id: "ja-mapping", label: "▣ Mapping" },
      { id: "ja-flags", label: "⚑ Flags" },
      { id: "map", label: "▣ Map (Legacy)" },
      { id: "validation", label: "◉ Validation" },
      { id: "analytics", label: "▥ Analytics" },
      { id: "evaluation", label: "▧ Evaluation" },
      { id: "lattice", label: "▤ Lattice" },
      { id: "jagovernance", label: "▦ Governance" },
      { id: "intelligence", label: "◎ Architecture Intelligence" },
      { id: "rolenet", label: "◍ Network" },
      { id: "compare", label: "◫ Compare" },
      { id: "content", label: "◧ Content" },
    ]} active={tab} onChange={setTab} />

    {/* ═══ CATALOGUE TAB — Bloomberg Terminal meets Notion ═══ */}
    {tab === "catalogue" && <div className="flex gap-4 animate-tab-enter" style={{ minHeight: 600 }}>
      {/* Left tree navigator */}
      <div className="w-56 shrink-0 rounded-xl p-3 overflow-y-auto" style={{ maxHeight: "70vh", background: "var(--border-light)", border: "1px solid var(--border)" }}>
        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] mb-2">Hierarchy</div>
        <button onClick={() => setSelectedPath([])} className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] font-semibold mb-1 transition-all ${selectedPath.length === 0 ? "bg-[rgba(244,168,58,0.15)] text-[var(--amber)]" : "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)]"}`}>All ({Number(stats.total_headcount || 0)})</button>
        {tree.map(func => <TreeNav key={func.id} node={func} depth={0} selectedPath={selectedPath} onSelect={setSelectedPath} />)}
      </div>

      {/* Main catalogue */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 mb-3 text-[12px]">
          {breadcrumbs.map((b, i) => <React.Fragment key={i}>
            {i > 0 && <span className="text-[var(--ink-faint)]">›</span>}
            <button onClick={() => setSelectedPath(b.path)} className={`font-semibold transition-colors ${i === breadcrumbs.length - 1 ? "text-[var(--amber)]" : "text-[var(--ink-faint)] hover:text-[var(--text-primary)]"}`}>{b.label}</button>
          </React.Fragment>)}
        </div>

        {/* Search bar — full width with live count */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] text-[13px]">⌕</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search roles, families, levels..." className="w-full pl-8 pr-40 py-2.5 rounded-xl text-[13px] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--ink-faint)]" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }} onFocus={e => e.target.style.borderColor = "rgba(244,168,58,0.6)"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--ink-faint)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{filteredJobs.length} roles · {filteredJobs.reduce((s, j) => s + j.headcount, 0).toLocaleString()} HC</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Group-By toggle — segmented control */}
          <div className="flex rounded-lg overflow-hidden" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            {(["level","headcount","ai","alpha"] as const).map(s => <button key={s} onClick={() => setSortBy(s)} className="px-3 py-1.5 text-[11px] font-semibold transition-all" style={{ background: sortBy === s ? "rgba(244,168,58,0.2)" : "transparent", color: sortBy === s ? "var(--amber)" : "var(--ink-faint)" }}>{s === "level" ? "Level" : s === "headcount" ? "HC" : s === "ai" ? "AI" : "A-Z"}</button>)}
          </div>
          <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <option value="All">All Tracks</option><option value="IC">IC</option><option value="Manager">Manager</option><option value="Executive">Executive</option>
          </select>
          <select value={filterAI} onChange={e => setFilterAI(e.target.value)} className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <option value="All">All AI Impact</option><option value="High">High</option><option value="Moderate">Moderate</option><option value="Low">Low</option>
          </select>
        </div>

        {/* Role rows — dense table layout */}
        {filteredJobs.length === 0 ? <Empty text="No jobs match your filters — try broadening your search" /> :
        <div className="space-y-1">
          {(() => { const maxHC = Math.max(...filteredJobs.map(fj => fj.headcount), 1); return filteredJobs.slice(0, 200).map((j, i) => {
            const tc = getTrackColor(j.level || j.track);
            const skills = [j.sub_family, j.family].filter(Boolean);
            return <div key={j.id} onClick={() => { setSelectedJob(j); setJobProfileTab("content"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group card-hover" style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                animation: i < 30 ? `scaleIn 0.15s ease-out ${Math.min(i * 0.015, 0.2)}s both` : 'none',
              }}>
              {/* Level Badge */}
              <div className="w-[36px] shrink-0"><LevelBadge level={j.level} /></div>
              {/* Title + Family */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--amber)] transition-colors">{j.title}</span>
                <span className="text-[11px] text-[var(--ink-faint)] ml-1.5">· {j.family}</span>
              </div>
              {/* Skill chips */}
              <div className="w-[120px] shrink-0 flex gap-1 overflow-hidden">
                {skills.slice(0, 2).map((s, si) => <span key={si} className="px-1.5 py-0.5 rounded text-[9px] text-[var(--ink-soft)] truncate" style={{ background: "var(--border-light)" }}>{s.split(" ").slice(0, 2).join(" ")}</span>)}
                {skills.length > 2 && <span className="text-[9px] text-[var(--ink-faint)]">+{skills.length - 2}</span>}
              </div>
              {/* HC Number */}
              <div className="w-[60px] shrink-0 text-right text-[13px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>{j.headcount}</div>
              {/* Proportion bar */}
              <div className="w-[100px] shrink-0">
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(j.headcount / maxHC) * 100}%`, background: tc, boxShadow: `0 0 8px ${tc}20` }} />
                </div>
              </div>
              {/* AI dot */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: aiDot(j.ai_impact) }} title={`AI: ${j.ai_impact}`} />
            </div>;
          }); })()}
        </div>}
        <div className="mt-3 text-[11px] text-[var(--ink-faint)] text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{filteredJobs.length} of {jobs.length} roles</div>
      </div>

      {/* Job profile slide-in panel — refined */}
      {selectedJob && <div className="w-[420px] shrink-0 rounded-xl overflow-y-auto animate-slide-right" style={{ maxHeight: "70vh", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: "var(--border)", background: "var(--paper-solid)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LevelBadge level={selectedJob.level} size="md" />
              <span className="text-[11px] text-[var(--ink-faint)]">{selectedJob.track}</span>
              <div className="w-2 h-2 rounded-full" style={{ background: aiDot(selectedJob.ai_impact) }} />
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-[var(--ink-faint)] hover:text-[var(--text-primary)] text-sm transition-colors">✕</button>
          </div>
          <h3 className="text-[18px] font-bold text-[var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>{selectedJob.title}</h3>
          <div className="text-[11px] text-[var(--ink-faint)] mt-1">{selectedJob.function} › {selectedJob.family} › {selectedJob.sub_family}</div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { if (onNavigate) { onNavigate("design"); } }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">View in Work Design Lab</button>
            <button onClick={() => { if (!compareJobs.find(c => c.id === selectedJob.id)) { setCompareJobs(p => [...p, selectedJob]); showToast(`Added ${selectedJob.title} to comparison`); }}} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]">+ Compare</button>
          </div>
        </div>

        <div className="px-4">
          <TabBar tabs={[
            { id: "content", label: "Content" },
            { id: "skills", label: "Skills" },
            { id: "career", label: "Career" },
            { id: "ai", label: "AI Impact" },
            { id: "kpis", label: "KPIs" },
          ]} active={jobProfileTab} onChange={setJobProfileTab} />

          {jobProfileTab === "content" && (() => {
            const aiData = aiProfileData[selectedJob.title];
            return <div className="space-y-4 pb-4 animate-tab-enter">
            {/* Auto-suggest button */}
            <div className="flex justify-end">
              <AiJobSuggestButton title={selectedJob.title} industry={selectedJob.function} onAccept={d => setAiProfileData(prev => ({ ...prev, [selectedJob.title]: d }))} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">Purpose</div>
              <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed">Drives {selectedJob.sub_family.toLowerCase()} outcomes within the {selectedJob.family} function, operating at the {selectedJob.level} level with {selectedJob.track === "Manager" ? "team leadership" : selectedJob.track === "Executive" ? "strategic leadership" : "individual contributor"} responsibilities.</div>
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">Key Statistics</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[14px] font-bold font-data text-[var(--text-primary)]">{selectedJob.headcount.toLocaleString()}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Headcount</div></div>
                <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[14px] font-bold font-data text-[var(--text-primary)]">{aiData?.tasks.length || selectedJob.tasks_mapped}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Tasks Mapped</div></div>
              </div>
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">Key Responsibilities</div>
              <ul className="space-y-1 text-[15px] text-[var(--text-secondary)]">
                {aiData?.responsibilities.length ? aiData.responsibilities.map((r, i) => <li key={i}>• {r}</li>) : <>
                <li>• Lead {selectedJob.sub_family.toLowerCase()} initiatives aligned with {selectedJob.function} strategy</li>
                <li>• {selectedJob.track === "Manager" ? "Manage and develop team members" : "Execute core deliverables"} within scope</li>
                <li>• Collaborate with cross-functional stakeholders</li>
                <li>• Drive continuous improvement in processes and outcomes</li>
                <li>• {selectedJob.ai_impact === "High" ? "Adopt and leverage AI/automation tools" : "Apply domain expertise to complex problems"}</li>
                </>}
              </ul>
            </div>
            {/* Show AI-enriched tasks if accepted */}
            {aiData?.tasks.length > 0 && <div>
              <div className="text-[15px] font-bold text-purple-400 uppercase mb-1">AI-Suggested Tasks</div>
              <div className="space-y-1">{aiData.tasks.map((t, i) => <div key={i} className="flex items-center gap-2 text-[15px] px-2 py-1 rounded-lg bg-[var(--surface-2)]">
                <span className="flex-1 text-[var(--text-secondary)]">{t.name}</span>
                <span className="text-[14px] font-data text-[var(--text-muted)]">{t.hours_per_week}h/wk</span>
                <span className={`text-[15px] px-1 py-0.5 rounded-full font-bold ${t.ai_impact === "High" ? "bg-red-500/10 text-red-400" : t.ai_impact === "Moderate" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>{t.ai_impact}</span>
              </div>)}</div>
            </div>}
            {/* Show AI KPIs if accepted */}
            {aiData?.kpis.length > 0 && <div>
              <div className="text-[15px] font-bold text-purple-400 uppercase mb-1">Key Performance Indicators</div>
              <ul className="space-y-0.5 text-[15px] text-[var(--text-secondary)]">{aiData.kpis.map((k, i) => <li key={i}>• {k}</li>)}</ul>
            </div>}
          </div>;
          })()}

          {jobProfileTab === "skills" && <div className="space-y-4 pb-4 animate-tab-enter">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Required Competencies</div>
            {[{ cat: "Technical", skills: ["Data Analysis", "Domain Tools", "Process Knowledge"], color: "var(--accent-primary)" },
              { cat: "Functional", skills: ["Problem Solving", "Communication", "Stakeholder Mgmt"], color: "var(--success)" },
              { cat: "Leadership", skills: selectedJob.track === "IC" ? ["Self-Direction", "Peer Mentoring"] : ["Team Management", "Strategic Thinking", "Change Leadership"], color: "var(--warning)" },
              { cat: "AI & Digital", skills: ["AI Literacy", "Digital Fluency", "Automation Awareness"], color: "var(--risk)" },
            ].map(g => <div key={g.cat}>
              <div className="text-[15px] font-semibold mb-1.5" style={{ color: g.color }}>{g.cat}</div>
              <div className="space-y-1.5">
                {g.skills.map(s => {
                  const required = levelNum(selectedJob.level) >= 5 ? 4 : levelNum(selectedJob.level) >= 3 ? 3 : 2;
                  const current = Math.max(1, required - Math.floor(Math.random() * 2));
                  return <div key={s} className="flex items-center gap-2">
                    <span className="text-[15px] text-[var(--text-secondary)] w-32 truncate">{s}</span>
                    <div className="flex-1 flex gap-0.5">
                      {[1,2,3,4,5].map(n => <div key={n} className="h-2 flex-1 rounded-sm" style={{ background: n <= current ? (n <= required ? "var(--success)" : "var(--warning)") : n <= required ? "var(--risk)" : "var(--surface-3)" }} />)}
                    </div>
                    <span className="text-[14px] font-data text-[var(--text-muted)] w-8">{current}/{required}</span>
                  </div>;
                })}
              </div>
            </div>)}
          </div>}

          {jobProfileTab === "career" && <div className="space-y-4 pb-4 animate-tab-enter">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Career Progression</div>
            {/* Vertical path */}
            <div className="space-y-2">
              {jobs.filter(j => j.family === selectedJob.family && j.track === selectedJob.track)
                .sort((a, b) => levelNum(a.level) - levelNum(b.level))
                .map(j => {
                  const isCurrent = j.id === selectedJob.id;
                  return <div key={j.id} onClick={() => { setSelectedJob(j); setJobProfileTab("content"); }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isCurrent ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "border-[var(--border)] hover:border-[var(--accent-primary)]/30"}`}>
                    <span className="text-[15px] px-2 py-0.5 rounded-full font-bold font-data" style={{ background: trackBg(j.track), color: trackColor(j.track) }}>{j.level}</span>
                    <span className={`text-[15px] flex-1 ${isCurrent ? "font-bold text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"}`}>{j.title}</span>
                    {isCurrent && <span className="text-[14px] text-[var(--accent-primary)] font-bold">Current</span>}
                    <span className="text-[15px] font-data text-[var(--text-muted)]">{j.headcount}</span>
                  </div>;
                })}
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Lateral Moves</div>
              <div className="flex flex-wrap gap-1.5">
                {jobs.filter(j => j.level === selectedJob.level && j.id !== selectedJob.id && j.function === selectedJob.function).slice(0, 6)
                  .map(j => <button key={j.id} onClick={() => { setSelectedJob(j); setJobProfileTab("content"); }} className="px-2 py-1 rounded-lg text-[15px] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)] transition-all">{j.title}</button>)}
              </div>
            </div>
          </div>}

          {jobProfileTab === "ai" && <div className="space-y-4 pb-4 animate-tab-enter">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-[22px] font-black font-data" style={{ background: `${aiDot(selectedJob.ai_impact)}15`, color: aiDot(selectedJob.ai_impact), border: `2px solid ${aiDot(selectedJob.ai_impact)}40` }}>{selectedJob.ai_score > 0 ? selectedJob.ai_score.toFixed(1) : "—"}</div>
              <div>
                <div className="text-[14px] font-bold" style={{ color: aiDot(selectedJob.ai_impact) }}>{selectedJob.ai_impact} Impact</div>
                <div className="text-[15px] text-[var(--text-muted)]">{selectedJob.tasks_mapped} tasks analyzed</div>
              </div>
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Task Breakdown</div>
              <div className="space-y-2">
                {[{ label: "Automatable", pct: selectedJob.ai_impact === "High" ? 45 : selectedJob.ai_impact === "Moderate" ? 25 : 10, color: "var(--risk)" },
                  { label: "Augmentable", pct: selectedJob.ai_impact === "High" ? 30 : selectedJob.ai_impact === "Moderate" ? 35 : 20, color: "var(--warning)" },
                  { label: "Human-Essential", pct: selectedJob.ai_impact === "High" ? 25 : selectedJob.ai_impact === "Moderate" ? 40 : 70, color: "var(--success)" },
                ].map(b => <div key={b.label}>
                  <div className="flex justify-between text-[15px] mb-0.5"><span className="text-[var(--text-secondary)]">{b.label}</span><span className="font-data font-bold" style={{ color: b.color }}>{b.pct}%</span></div>
                  <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${b.pct}%`, background: b.color }} /></div>
                </div>)}
              </div>
            </div>
            <InsightPanel title="Projected Future State" items={[
              selectedJob.ai_impact === "High" ? "This role will be significantly redesigned — expect 40-50% task automation" : selectedJob.ai_impact === "Moderate" ? "This role will be augmented — AI tools enhance existing workflows" : "This role remains primarily human-led — focus on leveraging AI for efficiency gains",
              `${selectedJob.tasks_mapped} tasks have been mapped for this role`,
              "View in Work Design Lab for detailed task-level analysis",
            ]} icon={<Network size={16} />} />
          </div>}

          {jobProfileTab === "kpis" && <div className="space-y-4 pb-4 animate-tab-enter">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Performance Indicators</div>
            {[{ kpi: "Goal Achievement", desc: "Delivery against quarterly objectives", meets: "Achieves 80%+ of goals", exceeds: "100%+ with stretch impact" },
              { kpi: "Quality of Output", desc: "Accuracy and completeness of deliverables", meets: "Meets standards consistently", exceeds: "Recognized for exceptional quality" },
              { kpi: "Collaboration", desc: "Cross-functional contribution", meets: "Active participant", exceeds: "Sought-after partner across teams" },
              { kpi: "Development", desc: "Personal and team growth", meets: "On track with development plan", exceeds: "Mentoring others + building new capabilities" },
            ].map(k => <div key={k.kpi} className="bg-[var(--surface-2)] rounded-lg p-3">
              <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-0.5">{k.kpi}</div>
              <div className="text-[15px] text-[var(--text-muted)] mb-2">{k.desc}</div>
              <div className="grid grid-cols-2 gap-2 text-[15px]">
                <div className="bg-[var(--surface-1)] rounded p-2"><span className="font-bold text-[var(--warning)]">Meets:</span> <span className="text-[var(--text-secondary)]">{k.meets}</span></div>
                <div className="bg-[var(--surface-1)] rounded p-2"><span className="font-bold text-[var(--success)]">Exceeds:</span> <span className="text-[var(--text-secondary)]">{k.exceeds}</span></div>
              </div>
            </div>)}
          </div>}
        </div>
      </div>}
    </div>}

    {/* ═══ ORG CHART TAB — Visual Org Chart Builder ═══ */}
    {tab === "orgchart" && <Suspense fallback={<LoadingBar />}><OrgChartRedesign model={model} onRoleClick={(title) => { setSelectedJob(jobs.find(j => j.title === title) || null); }} /></Suspense>}

    {/* ═══ JOB PROFILES TAB ═══ */}
    {tab === "profiles" && <JobProfileLibrary jobs={jobs} model={model} />}

    {/* ═══ JA FRAMEWORK BUILDER ═══ */}
    {tab === "ja-framework" && (<Suspense fallback={<LoadingBar />}>
      <FrameworkBuilder model={model} projectId={projectId} onFrameworkReady={(fw) => {
        /* Auto-load scenario ID after framework save */
        fetch(`/api/ja/scenarios?project_id=${projectId}`, { headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` } })
          .then(r => r.json()).then((scs: any[]) => {
            const primary = scs.find((s: any) => s.is_primary) || scs[0];
            if (primary) setJaScenarioId(primary.id);
          }).catch(() => {});
      }} />
    </Suspense>)}

    {/* ═══ JA CATALOGUE HEALTH ═══ */}
    {tab === "ja-health" && <Suspense fallback={<LoadingBar />}><CatalogueHealth model={model} projectId={projectId} /></Suspense>}

    {/* ═══ JA BULK IMPORT ═══ */}
    {tab === "ja-import" && <Suspense fallback={<LoadingBar />}><BulkImport projectId={projectId} onImportComplete={() => setTab("ja-health")} /></Suspense>}

    {/* ═══ JA MAPPING GRID ═══ */}
    {tab === "ja-mapping" && (<Suspense fallback={<LoadingBar />}>
      <>
        <MappingGrid
          model={model}
          projectId={projectId}
          scenarioId={jaScenarioId}
          onRoleClick={(row) => { setJaDrawerRow(row); setJaDrawerOpen(true); }}
        />
        <RoleDetailDrawer
          row={jaDrawerRow}
          isOpen={jaDrawerOpen}
          onClose={() => setJaDrawerOpen(false)}
          model={model}
          projectId={projectId}
          onAccept={(gid) => {
            fetch("/api/ja/mappings/bulk-action", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` },
              body: JSON.stringify({ group_ids: [gid], action: "accept" }),
            }).then(() => setJaDrawerOpen(false));
          }}
          onReject={(gid) => {
            fetch("/api/ja/mappings/bulk-action", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` },
              body: JSON.stringify({ group_ids: [gid], action: "reject" }),
            }).then(() => setJaDrawerOpen(false));
          }}
        />
      </>
    </Suspense>)}

    {/* ═══ JA FLAGS ═══ */}
    {tab === "ja-flags" && <Suspense fallback={<LoadingBar />}><FlagRules projectId={projectId} scenarioId={jaScenarioId} /></Suspense>}

    {/* ═══ ARCHITECTURE MAP TAB (Legacy) — strategic mapping workspace ═══ */}
    {tab === "map" && <Suspense fallback={<LoadingBar />}><ArchitectureMapTab tree={tree} jobs={jobs} employees={employees} model={model} /></Suspense>}

    {/* ═══ VALIDATION TAB — Health dashboard with ring ═══ */}
    {tab === "validation" && (() => {
      const healthVal = Number(analytics.health_score || 0);
      const healthCol = healthVal >= 70 ? "#8ba87a" : healthVal >= 50 ? "#f4a83a" : "#e87a5d";
      const healthVerdict = healthVal >= 90 ? "Excellent" : healthVal >= 70 ? "Solid — minor gaps" : healthVal >= 50 ? "Needs work — structural risks present" : "Critical — architecture unreliable";
      const circumference = 2 * Math.PI * 55;
      const dashOffset = circumference * (1 - healthVal / 100);
      const passCount = flags.filter(fl => fl.severity === "info" || fl.severity === "pass").length;
      const warnCount = flags.filter(fl => fl.severity === "warning").length;
      const failCount = flags.filter(fl => fl.severity === "critical").length;

      return <div className="animate-tab-enter">
        {/* Health Dashboard — ring + summary */}
        <div className="flex gap-5 mb-6 items-center">
          {/* Health Ring */}
          <div className={`relative w-[130px] h-[130px] shrink-0`}>
            <svg viewBox="0 0 130 130" className="w-full h-full">
              <circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="65" cy="65" r="55" fill="none" stroke={healthCol} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 65 65)" style={{ filter: `drop-shadow(0 0 6px ${healthCol}30)`, transition: "stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[32px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: healthCol }}>{healthVal}</div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Health</div>
            </div>
          </div>
          <div className="text-[10px] text-center mt-1" style={{ color: healthCol, maxWidth: 130 }}>{healthVerdict}</div>
          {/* Summary cards */}
          <div className="flex gap-3 flex-1">
            {[
              { label: "Pass", val: passCount || flags.length - warnCount - failCount, color: "var(--sage)", bg: "rgba(139,168,122,0.08)" },
              { label: "Warning", val: warnCount, color: "var(--amber)", bg: "rgba(244,168,58,0.08)" },
              { label: "Fail", val: failCount, color: "var(--coral)", bg: "rgba(232,122,93,0.08)" },
            ].map(s => <div key={s.label} className="flex-1 rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
              <div className="text-[32px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.val}</div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">{s.label}</div>
            </div>)}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-4">
          {["All", "Structure", "Population", "Career Path", "Risk", "Span of Control"].map(c => <button key={c} onClick={() => setFlagFilter(c)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: flagFilter === c ? "rgba(244,168,58,0.15)" : "transparent", color: flagFilter === c ? "var(--amber)" : "var(--ink-faint)", border: flagFilter === c ? "1px solid rgba(244,168,58,0.35)" : "1px solid var(--border)" }}>{c}</button>)}
        </div>

        {/* Validation rules */}
        <div className="space-y-2">
          {flags.filter(fl => flagFilter === "All" || fl.category === flagFilter).map((fl, i) => {
            const statusIcon = fl.severity === "critical" ? "✕" : fl.severity === "warning" ? "◈" : "✓";
            const statusColor = fl.severity === "critical" ? "#e87a5d" : fl.severity === "warning" ? "#f4a83a" : "#8ba87a";
            return <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }} onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)"; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--border-light)"; }}>
              {/* Status icon circle */}
              <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${statusColor}15`, color: statusColor, boxShadow: `0 0 8px ${statusColor}20` }}>{statusIcon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>{fl.title}</div>
                <div className="text-[12px] text-[var(--ink)] mt-0.5 leading-relaxed">{fl.description}</div>
              </div>
              {/* Affected count badge */}
              {fl.population > 0 && <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", background: `${statusColor}15`, color: statusColor }}>{fl.population}</span>}
            </div>;
          })}
          {flags.filter(fl => flagFilter === "All" || fl.category === flagFilter).length === 0 && <Empty text="No flags in this category" />}
        </div>
      </div>;
    })()}

    {/* ═══ ANALYTICS TAB — Track composition + dense bars ═══ */}
    {tab === "analytics" && (() => {
      // Track composition data
      const trackCounts: Record<string, number> = {};
      jobs.forEach(j => { const letter = getTrackLetter(j.level); trackCounts[letter] = (trackCounts[letter] || 0) + j.headcount; });
      const totalTrackHC = Object.values(trackCounts).reduce((s, v) => s + v, 0) || 1;
      const trackEntries = Object.entries(trackCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const trackNames: Record<string, string> = { S: "Support", P: "Professional", M: "Management", E: "Executive", T: "Technical" };

      // Level distribution data
      const levelDist = ((analytics.level_distribution || []) as {level:string;headcount:number}[]);
      const maxLevelHC = Math.max(...levelDist.map(l => l.headcount), 1);

      // Family size data
      const famData = ((analytics.family_sizes || []) as {family:string;headcount:number;roles:number}[]).sort((a, b) => b.headcount - a.headcount).slice(0, 15);
      const maxFamHC = Math.max(...famData.map(f => f.headcount), 1);

      return <div className="animate-tab-enter space-y-5">
        {/* Row 1: Track Composition — ring chart cards */}
        {trackEntries.length > 0 && <div className="flex gap-3">
          {trackEntries.map(([track, count]) => {
            const pct = Math.round((count / totalTrackHC) * 100);
            const color = TRACK_COLORS[track] || "#f4a83a";
            const circ = 2 * Math.PI * 28;
            const dashOff = circ * (1 - pct / 100);
            return <div key={track} className="flex-1 rounded-xl p-4 relative overflow-hidden" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                {/* Ring chart */}
                <div className="relative w-[72px] h-[72px] shrink-0">
                  <svg viewBox="0 0 72 72" className="w-full h-full">
                    <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff} transform="rotate(-90 36 36)" style={{ filter: `drop-shadow(0 0 4px ${color}30)` }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[14px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{pct}%</div>
                </div>
                <div>
                  <div className="text-[12px] font-bold" style={{ color }}>{trackNames[track] || track}</div>
                  <div className="text-[18px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>{count.toLocaleString()}</div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Headcount</div>
                </div>
              </div>
              {/* Ambient glow */}
              <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full" style={{ background: color, opacity: 0.08, filter: "blur(20px)" }} />
            </div>;
          })}
        </div>}

        {/* Row 2: Level Distribution + Family Size */}
        <div className="grid grid-cols-2 gap-4">
          {/* Level Distribution — horizontal bars */}
          <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1" style={{ letterSpacing: "-0.02em" }}>Level Distribution</div>
            <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)] mb-4">Headcount by career level</div>
            <div className="space-y-2">
              {levelDist.map(l => {
                const color = getTrackColor(l.level);
                return <div key={l.level} className="flex items-center gap-2">
                  <div className="w-[36px] shrink-0"><LevelBadge level={l.level} /></div>
                  <div className="flex-1 h-[14px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(l.headcount / maxLevelHC) * 100}%`, background: `linear-gradient(to right, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}20` }} />
                  </div>
                  <div className="w-[50px] text-right text-[13px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{l.headcount}</div>
                </div>;
              })}
            </div>
          </div>

          {/* Family Size — horizontal bars */}
          <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1" style={{ letterSpacing: "-0.02em" }}>Family Size</div>
            <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-faint)] mb-4">Headcount by job family</div>
            <div className="space-y-2">
              {famData.map((f, i) => {
                const color = COLORS[i % COLORS.length];
                return <div key={f.family} className="flex items-center gap-2">
                  <TrackDot track={f.family} size={6} />
                  <span className="text-[11px] text-[var(--ink)] w-[100px] truncate shrink-0">{f.family}</span>
                  <div className="flex-1 h-[10px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(f.headcount / maxFamHC) * 100}%`, background: color }} />
                  </div>
                  <div className="w-[40px] text-right text-[11px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.headcount}</div>
                </div>;
              })}
            </div>
          </div>
        </div>

        {/* Row 3: AI Impact + Architecture Completeness */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-4" style={{ letterSpacing: "-0.02em" }}>AI Impact Heatmap</div>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "High Impact", count: (analytics.ai_impact_summary as Record<string,number>)?.high || 0, color: "var(--coral)", desc: "Automation potential" },
                { label: "Moderate", count: (analytics.ai_impact_summary as Record<string,number>)?.moderate || 0, color: "var(--amber)", desc: "Augmentation" },
                { label: "Low Impact", count: (analytics.ai_impact_summary as Record<string,number>)?.low || 0, color: "var(--sage)", desc: "Human-led" },
              ].map(b => <div key={b.label} className="rounded-xl p-3 text-center" style={{ background: `${b.color}08`, border: `1px solid ${b.color}20` }}>
                <div className="text-[28px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: b.color }}>{b.count}</div>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] mt-0.5">{b.label}</div>
                <div className="text-[9px] text-[var(--ink-faint)]">{b.desc}</div>
              </div>)}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-4" style={{ letterSpacing: "-0.02em" }}>Architecture Completeness</div>
            <div className="space-y-3">
              {[{ label: "Jobs with tasks mapped", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.tasks_mapped > 0).length / jobs.length * 100) : 0 },
                { label: "Jobs with headcount", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.headcount > 0).length / jobs.length * 100) : 0 },
                { label: "Families with 3+ roles", pct: (() => { const fams = new Set(jobs.map(j => j.family)); const ok = [...fams].filter(f => jobs.filter(j => j.family === f).length >= 3).length; return fams.size > 0 ? Math.round(ok / fams.size * 100) : 0; })() },
                { label: "Roles with AI scoring", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.ai_score > 0).length / jobs.length * 100) : 0 },
              ].map(m => {
                const color = m.pct >= 80 ? "var(--sage)" : m.pct >= 50 ? "var(--amber)" : "var(--coral)";
                return <div key={m.label}>
                  <div className="flex justify-between text-[12px] mb-1"><span className="text-[var(--ink)]">{m.label}</span><span className="font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{m.pct}%</span></div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.pct}%`, background: color }} /></div>
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>;
    })()}

    {/* ═══ JOB EVALUATION TAB ═══ */}
    {tab === "evaluation" && <JobEvaluationTab jobs={jobs} model={model} />}

    {/* ═══ CAREER LATTICE TAB ═══ */}
    {tab === "lattice" && <CareerLatticeTab jobs={jobs} model={model} />}

    {/* ═══ JA GOVERNANCE TAB ═══ */}
    {tab === "jagovernance" && <JAGovernanceTab jobs={jobs} employees={employees} model={model} />}

    {/* ═══ INTELLIGENCE TAB ═══ */}
    {tab === "intelligence" && <JAIntelligenceTab jobs={jobs} employees={employees} model={model} />}

    {/* ═══ ROLE NETWORK TAB ═══ */}
    {tab === "rolenet" && <RoleNetworkTab jobs={jobs} model={model} />}

    {/* ═══ COMPARE TAB — with difference highlighting ═══ */}
    {tab === "compare" && <div className="animate-tab-enter">
      {/* Multi-select dropdown */}
      <div className="mb-4">
        <select onChange={e => { const j = jobs.find(job => job.id === e.target.value); if (j && !compareJobs.find(c => c.id === j.id) && compareJobs.length < 4) { setCompareJobs(p => [...p, j]); showToast(`Added ${j.title}`); } e.target.value = ""; }} className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none" style={{ background: "var(--border-light)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="">+ Add role to comparison (2-4 roles)...</option>
          {jobs.filter(j => !compareJobs.find(c => c.id === j.id)).map(j => <option key={j.id} value={j.id}>{j.title} ({j.function}, {j.level})</option>)}
        </select>
      </div>
      {compareJobs.length < 2 ? <div className="rounded-xl p-5 text-center" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
        <div className="text-3xl mb-3 opacity-30">◫</div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.02em" }}>Select 2-4 roles to compare side by side</h3>
        <p className="text-[12px] text-[var(--ink-faint)] max-w-md mx-auto">Use the dropdown above or click &quot;Compare&quot; from any job profile panel.</p>
        {compareJobs.length === 1 && <div className="text-[12px] text-[var(--amber)] mt-2">1 role selected — add 1 more</div>}
      </div> : <div className="rounded-xl p-5" style={{ background: "var(--border-light)", border: "1px solid var(--border)" }}>
        <div className="flex gap-2 mb-4">{compareJobs.map((j, i) => <span key={j.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
          <LevelBadge level={j.level} />
          <span style={{ color: COLORS[i % COLORS.length] }}>{j.title}</span>
          <button onClick={() => setCompareJobs(p => p.filter(c => c.id !== j.id))} className="text-[var(--ink-faint)] hover:text-[var(--coral)] ml-1 text-[10px]">✕</button>
        </span>)}</div>
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full"><thead><tr style={{ background: "var(--border-light)" }}>
            <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Attribute</th>
            {compareJobs.map((j, i) => <th key={j.id} className="px-3 py-2 text-center text-[11px] font-bold" style={{ color: COLORS[i % COLORS.length] }}>{j.title}</th>)}
          </tr></thead>
          <tbody>{[
            { label: "Job Family", get: (j: Job) => j.family },
            { label: "Sub-Family", get: (j: Job) => j.sub_family },
            { label: "Track & Level", get: (j: Job) => j.level, isLevel: true },
            { label: "Headcount", get: (j: Job) => String(j.headcount) },
            { label: "AI Impact", get: (j: Job) => j.ai_impact },
            { label: "AI Score", get: (j: Job) => j.ai_score > 0 ? j.ai_score.toFixed(1) : "—" },
            { label: "Tasks Mapped", get: (j: Job) => String(j.tasks_mapped) },
            { label: "Track", get: (j: Job) => j.track },
          ].map(dim => {
            const values = compareJobs.map(j => dim.get(j));
            const hasDiff = new Set(values).size > 1;
            return <tr key={dim.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: hasDiff ? "rgba(244,168,58,0.04)" : "transparent" }}>
              <td className="px-3 py-2 text-[12px] font-semibold text-[var(--ink-soft)]">{dim.label}</td>
              {compareJobs.map(j => <td key={j.id} className="px-3 py-2 text-center">
                {dim.isLevel ? <LevelBadge level={dim.get(j)} /> : <span className="text-[12px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{dim.get(j)}</span>}
              </td>)}
            </tr>;
          })}</tbody></table>
        </div>
      </div>}
    </div>}

    {tab === "content" && <Suspense fallback={<LoadingBar />}><div className="animate-tab-enter"><JobContentAuthoring model={model} f={f} /></div></Suspense>}

    <FlowNav previous={{ target: { kind: "module", moduleId: "snapshot" }, label: "Workforce Snapshot" }} next={{ target: { kind: "module", moduleId: "design" }, label: "Work Design Lab" }} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   TREE NAVIGATOR COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function TreeNav({ node, depth, selectedPath, onSelect }: { node: TreeNode; depth: number; selectedPath: string[]; onSelect: (path: string[]) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = (depth === 0 && selectedPath[0] === node.label) ||
    (depth === 1 && selectedPath[1] === node.label) ||
    (depth === 2 && selectedPath[2] === node.label);

  const buildPath = () => {
    if (depth === 0) return [node.label];
    if (depth === 1) return [selectedPath[0] || "", node.label];
    return [selectedPath[0] || "", selectedPath[1] || "", node.label];
  };

  return <div style={{ paddingLeft: depth * 12 }}>
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[15px] cursor-pointer transition-all ${isSelected ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`}
      onClick={() => { onSelect(buildPath()); if (hasChildren) setExpanded(!expanded); }}>
      {hasChildren && <span className="text-[15px] text-[var(--text-muted)]" style={{ transform: `rotate(${expanded ? 90 : 0}deg)`, transition: "transform 0.15s", display: "inline-block" }}>▸</span>}
      {!hasChildren && <span className="w-2" />}
      <span className="flex-1 truncate">{node.label}</span>
      <span className="text-[14px] font-data text-[var(--text-muted)] shrink-0">{node.headcount}</span>
    </div>
    {expanded && hasChildren && <div style={{ transition: "all 0.2s" }}>
      {(node.children || []).map(child => <TreeNav key={child.id} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />)}
    </div>}
  </div>;
}
