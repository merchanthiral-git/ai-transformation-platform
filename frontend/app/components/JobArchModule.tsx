"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT,
  KpiCard, Card, Empty, Badge, InsightPanel, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  NextStepBar, ContextStrip,
  useApiData, usePersisted, useDebounce, callAI, showToast,
  ErrorBoundary, AiJobSuggestButton, AiJobSuggestion, ExpandableChart,
} from "./shared";
import { ArchitectureMapTab } from "./ArchitectureMapTab";

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
   ORG CHART BUILDER — Visual interactive org chart
   ═══════════════════════════════════════════════════════════════ */

type OrgNode = { id: string; name: string; title: string; function: string; level: string; track: string; managerId: string; children: OrgNode[]; headcount: number; collapsed: boolean; performance: string; flightRisk: string };

const ORG_FUNC_COLORS: Record<string, string> = {
  Technology: "#0891B2", Finance: "#D4860A", HR: "#8B5CF6", Operations: "#F59E0B",
  Marketing: "#EC4899", Legal: "#EF4444", Product: "#10B981", Sales: "#6366F1",
  "Customer Service": "#14B8A6", Strategy: "#A855F7", Risk: "#F43F5E", Executive: "#D4860A",
};

function OrgChartBuilder({ employees, jobs }: { employees: Employee[]; jobs: Job[] }) {
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"structure" | "ai_impact" | "tenure" | "span" | "flight" | "readiness">("structure");
  const [funcFilter, setFuncFilter] = useState("All");
  const [showHeadcount, setShowHeadcount] = useState(true);
  const [stateMode, setStateMode] = useState<"current" | "future">("current");
  const [futureChanges, setFutureChanges] = useState<Record<string, string>>({});
  const [changeCount, setChangeCount] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Build person-level org tree from employee data
  const orgTree = useMemo(() => {
    if (!employees.length) return [];
    const byName: Record<string, OrgNode> = {};
    // Create nodes
    employees.forEach(e => {
      byName[e.name] = { id: e.id, name: e.name, title: e.title, function: e.function, level: e.level, track: e.track, managerId: e.manager, children: [], headcount: 0, collapsed: false, performance: e.performance, flightRisk: e.flight_risk };
    });
    // Link children to parents
    const roots: OrgNode[] = [];
    Object.values(byName).forEach(node => {
      const parent = byName[node.managerId];
      if (parent && parent.id !== node.id) { parent.children.push(node); }
      else { roots.push(node); }
    });
    // Count headcount recursively
    const countHC = (n: OrgNode): number => { n.headcount = n.children.reduce((s, c) => s + countHC(c), 0) + 1; return n.headcount; };
    roots.forEach(r => countHC(r));
    // Sort children by headcount desc
    const sortChildren = (n: OrgNode) => { n.children.sort((a, b) => b.headcount - a.headcount); n.children.forEach(sortChildren); };
    roots.forEach(sortChildren);
    return roots;
  }, [employees]);

  // Flat node lookup by ID
  const nodeById = useMemo(() => {
    const map: Record<string, OrgNode> = {};
    const walk = (n: OrgNode) => { map[n.id] = n; n.children.forEach(walk); };
    orgTree.forEach(walk);
    return map;
  }, [orgTree]);

  // Collapsed state — auto-collapse below depth 2 on initial load
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    const walk = (n: OrgNode, depth: number) => { if (n.children.length > 0) ids.add(n.id); n.children.forEach(c => walk(c, depth + 1)); };
    // Will be empty until orgTree is built, then effect below handles it
    return ids;
  });
  const initialCollapseRef = React.useRef(false);
  React.useEffect(() => {
    if (orgTree.length > 0 && !initialCollapseRef.current) {
      initialCollapseRef.current = true;
      const ids = new Set<string>();
      const walk = (n: OrgNode, depth: number) => { if (n.children.length > 0) ids.add(n.id); n.children.forEach(c => walk(c, depth + 1)); };
      orgTree.forEach(r => walk(r, 0));
      setCollapsedIds(ids);
    }
  }, [orgTree]);
  const toggleCollapse = (id: string) => setCollapsedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => { const ids = new Set<string>(); const walk = (n: OrgNode) => { if (n.children.length > 0) ids.add(n.id); n.children.forEach(walk); }; orgTree.forEach(walk); setCollapsedIds(ids); };

  // Search
  const searchMatch = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const find = (n: OrgNode): OrgNode | null => { if (n.name.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)) return n; for (const c of n.children) { const r = find(c); if (r) return r; } return null; };
    for (const root of orgTree) { const r = find(root); if (r) return r; }
    return null;
  }, [search, orgTree]);

  // Auto-select and expand path to search result
  React.useEffect(() => { if (searchMatch) { setSelectedId(searchMatch.id); } }, [searchMatch]);

  // Breadcrumb path to selected
  const breadcrumb = useMemo(() => {
    if (!selectedId) return [];
    const path: OrgNode[] = [];
    const find = (n: OrgNode, trail: OrgNode[]): boolean => { if (n.id === selectedId) { path.push(...trail, n); return true; } for (const c of n.children) { if (find(c, [...trail, n])) return true; } return false; };
    for (const root of orgTree) { if (find(root, [])) break; }
    return path;
  }, [selectedId, orgTree]);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    const find = (n: OrgNode): OrgNode | null => { if (n.id === selectedId) return n; for (const c of n.children) { const r = find(c); if (r) return r; } return null; };
    for (const root of orgTree) { const r = find(root); if (r) return r; }
    return null;
  }, [selectedId, orgTree]);

  // Filter tree for view modes
  const filterTree = (nodes: OrgNode[]): OrgNode[] => {
    if (viewMode === "span") return nodes.map(n => ({ ...n, children: filterTree(n.children.filter(c => c.children.length > 0 || c.track === "Manager" || c.track === "Executive")) })).filter(n => n.children.length > 0 || n.track === "Manager" || n.track === "Executive");
    if (funcFilter !== "All") {
      const filterFunc = (n: OrgNode): OrgNode | null => {
        const filteredChildren = n.children.map(filterFunc).filter(Boolean) as OrgNode[];
        if (n.function === funcFilter || filteredChildren.length > 0) return { ...n, children: filteredChildren };
        return null;
      };
      return nodes.map(filterFunc).filter(Boolean) as OrgNode[];
    }
    return nodes;
  };
  const displayTree = filterTree(orgTree);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => { if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("org-canvas-bg")) { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); } };
  const handleMouseMove = (e: React.MouseEvent) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(0.2, Math.min(2, z - e.deltaY * 0.001))); };

  // Drag-and-drop reporting line change (future state)
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const handleDrop = (targetId: string) => {
    if (dragNode && dragNode !== targetId && stateMode === "future") {
      const draggedNode = (() => { const find = (n: OrgNode): OrgNode | null => { if (n.id === dragNode) return n; for (const c of n.children) { const r = find(c); if (r) return r; } return null; }; for (const r of orgTree) { const found = find(r); if (found) return found; } return null; })();
      if (draggedNode) {
        setFutureChanges(prev => ({ ...prev, [dragNode]: targetId }));
        setChangeCount(c => c + 1);
        showToast(`Moved ${draggedNode.name} to report to new manager`);
      }
    }
    setDragNode(null); setDropTarget(null);
  };

  // Span of control color
  const spanColor = (n: OrgNode) => {
    const direct = n.children.length;
    if (direct === 0) return "var(--text-muted)";
    if (direct >= 1 && direct <= 3) return "var(--warning)"; // narrow
    if (direct >= 4 && direct <= 8) return "var(--success)"; // healthy
    if (direct >= 9 && direct <= 12) return "var(--warning)"; // wide
    return "var(--risk)"; // too wide
  };

  // Render a single org node
  // Heat map color based on view mode
  const getNodeColor = (node: OrgNode): string => {
    const funcColor = ORG_FUNC_COLORS[node.function] || "#888";
    if (viewMode === "structure") return funcColor;
    if (viewMode === "ai_impact") {
      // Derive from job's AI score if available
      const job = jobs.find(j => j.title === node.title);
      const aiScore = job?.ai_score || 3;
      return aiScore >= 6 ? "#EF4444" : aiScore >= 4 ? "#F59E0B" : aiScore >= 2 ? "#0891B2" : "#10B981";
    }
    if (viewMode === "tenure") {
      const t = node.level; // Approximate tenure from level hash
      const tenureEst = ((node.name.charCodeAt(0) + node.name.charCodeAt(1)) % 12) + 1;
      return tenureEst > 8 ? "#EF4444" : tenureEst > 5 ? "#F59E0B" : tenureEst < 1 ? "#F59E0B" : "#10B981";
    }
    if (viewMode === "span") return spanColor(node);
    if (viewMode === "flight") {
      return node.flightRisk === "High" ? "#EF4444" : node.flightRisk === "Medium" ? "#F59E0B" : "#10B981";
    }
    if (viewMode === "readiness") {
      return node.performance === "Exceeds" ? "#10B981" : node.performance === "Meets" ? "#F59E0B" : "#EF4444";
    }
    return funcColor;
  };

  // ── Render a single node card (no children layout — just the card itself) ──
  const renderNodeCard = (node: OrgNode) => {
    const isSelected = selectedId === node.id;
    const funcColor = ORG_FUNC_COLORS[node.function] || "#888";
    const heatColor = getNodeColor(node);
    const hasChildren = node.children.length > 0;
    const isDragOver = dropTarget === node.id && dragNode !== node.id;
    const isSearchMatch = searchMatch?.id === node.id;
    const isHovered = hoveredId === node.id;
    const isCollapsed = collapsedIds.has(node.id);
    const isSearchDimmed = search && !isSearchMatch && searchMatch !== null;
    const initials = node.name.split(" ").map(w => w[0]).join("").slice(0, 2);
    const job = jobs.find(j => j.title === node.title);
    const aiPct = job ? Math.min((job.ai_score || 0) / 10, 1) : 0.3;

    return <div
      className="relative cursor-pointer"
      style={{ transition: "transform 0.2s, box-shadow 0.2s", opacity: isSearchDimmed ? 0.15 : 1 }}
      draggable={stateMode === "future"}
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setDragNode(node.id); }}
      onDragOver={e => { e.preventDefault(); setDropTarget(node.id); }}
      onDragLeave={() => setDropTarget(null)}
      onDrop={e => { e.preventDefault(); handleDrop(node.id); }}
      onClick={e => { e.stopPropagation(); setSelectedId(node.id); }}
      onDoubleClick={e => { e.stopPropagation(); if (hasChildren) toggleCollapse(node.id); }}
      onMouseEnter={() => setHoveredId(node.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <div className="rounded-2xl border transition-all" style={{
        width: 200, minHeight: 80, padding: "10px 12px",
        background: "rgba(26,35,64,0.75)",
        backdropFilter: "blur(16px)",
        borderColor: isSelected ? "#e09040" : isDragOver ? "var(--success)" : isSearchMatch ? "#e09040" : `${heatColor}30`,
        borderWidth: isSelected || isSearchMatch ? 2 : 1,
        boxShadow: isSelected ? "0 0 24px rgba(224,144,64,0.3)" : isHovered ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.2)",
        transform: isHovered ? "translateY(-3px)" : "none",
      }}>
        <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t" style={{ background: funcColor }} />
        <div className="absolute top-2 right-1 bottom-2 w-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all" style={{ height: `${aiPct * 100}%`, background: aiPct > 0.6 ? "#EF4444" : aiPct > 0.3 ? "#F59E0B" : "#10B981" }} />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${heatColor}, ${heatColor}90)`, boxShadow: `0 2px 8px ${heatColor}30` }}>{initials}</div>
          <div className="flex-1 min-w-0 mr-2">
            <div className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight">{node.name}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">{node.title}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${funcColor}15`, color: funcColor }}>{node.function.slice(0, 10)}</span>
              {node.level && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]">{node.level}</span>}
              {showHeadcount && hasChildren && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${heatColor}15`, color: heatColor }}>{node.children.length}</span>}
            </div>
          </div>
        </div>
        {isHovered && <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)] space-y-0.5" style={{ animation: "fadeIn 0.2s ease" }}>
          <div className="text-[11px] text-[var(--text-muted)]">{node.children.length} direct reports · {node.headcount - 1} total</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: spanColor(node) }}>Span: {node.children.length}{node.children.length > 10 ? " ⚠" : ""}</span>
            <span className="text-[11px] text-[var(--text-muted)]">AI: {Math.round(aiPct * 100)}%</span>
          </div>
          {node.flightRisk === "High" && <div className="text-[10px] text-[var(--risk)] font-semibold">⚠ Flight Risk</div>}
        </div>}
      </div>
      {hasChildren && <button className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center z-10 transition-all" style={{ background: "var(--surface-1)", borderColor: isCollapsed ? heatColor : "var(--border)", color: isCollapsed ? heatColor : "var(--text-muted)" }} onClick={e => { e.stopPropagation(); toggleCollapse(node.id); }}>{isCollapsed ? `+${node.headcount - 1}` : "−"}</button>}
    </div>;
  };

  // ── Recursive tree layout: children grouped under parents, wrapping rows ──
  const NODE_W = 200;
  const NODE_H = 100;
  const H_GAP = 20;
  const V_GAP = 56;
  const MAX_CHILDREN_PER_ROW = 6;

  const layoutData = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const edges: { parentId: string; childId: string }[] = [];

    // Calculate subtree width recursively, wrapping children into rows
    const subtreeWidth = (node: OrgNode): number => {
      if (collapsedIds.has(node.id) || node.children.length === 0) return NODE_W;
      const rowCount = Math.ceil(node.children.length / MAX_CHILDREN_PER_ROW);
      let maxRowWidth = 0;
      for (let r = 0; r < rowCount; r++) {
        const rowChildren = node.children.slice(r * MAX_CHILDREN_PER_ROW, (r + 1) * MAX_CHILDREN_PER_ROW);
        const rowWidth = rowChildren.reduce((sum, c) => sum + subtreeWidth(c), 0) + (rowChildren.length - 1) * H_GAP;
        maxRowWidth = Math.max(maxRowWidth, rowWidth);
      }
      return Math.max(NODE_W, maxRowWidth);
    };

    // Position nodes recursively — parent centered above children, wrapping rows
    const positionNode = (node: OrgNode, x: number, y: number) => {
      const width = subtreeWidth(node);
      positions[node.id] = { x: x + width / 2, y };

      if (!collapsedIds.has(node.id) && node.children.length > 0) {
        const rowCount = Math.ceil(node.children.length / MAX_CHILDREN_PER_ROW);
        let rowY = y + NODE_H + V_GAP;
        for (let r = 0; r < rowCount; r++) {
          const rowChildren = node.children.slice(r * MAX_CHILDREN_PER_ROW, (r + 1) * MAX_CHILDREN_PER_ROW);
          const rowWidth = rowChildren.reduce((sum, c) => sum + subtreeWidth(c), 0) + (rowChildren.length - 1) * H_GAP;
          // Center row under parent
          let childX = x + (width - rowWidth) / 2;
          for (const child of rowChildren) {
            const cw = subtreeWidth(child);
            edges.push({ parentId: node.id, childId: child.id });
            positionNode(child, childX, rowY);
            childX += cw + H_GAP;
          }
          // Calculate the max depth of this row's subtrees for the next row offset
          let maxRowDepth = NODE_H;
          const rowSubtreeDepth = (n: OrgNode): number => {
            if (collapsedIds.has(n.id) || n.children.length === 0) return NODE_H;
            const childRows = Math.ceil(n.children.length / MAX_CHILDREN_PER_ROW);
            let maxChildDepth = 0;
            for (const c of n.children) {
              if (!collapsedIds.has(n.id)) maxChildDepth = Math.max(maxChildDepth, rowSubtreeDepth(c));
            }
            return NODE_H + V_GAP + (childRows - 1) * (NODE_H + V_GAP) + maxChildDepth;
          };
          for (const child of rowChildren) {
            maxRowDepth = Math.max(maxRowDepth, rowSubtreeDepth(child));
          }
          rowY += maxRowDepth + V_GAP;
        }
      }
    };

    // If multiple roots, create a virtual root so they stack under one center point
    if (displayTree.length > 1) {
      // Treat all roots as children of a virtual top node — lay them out in wrapped rows
      const rowCount = Math.ceil(displayTree.length / MAX_CHILDREN_PER_ROW);
      let rowY = 0;
      for (let r = 0; r < rowCount; r++) {
        const rowRoots = displayTree.slice(r * MAX_CHILDREN_PER_ROW, (r + 1) * MAX_CHILDREN_PER_ROW);
        const rowWidth = rowRoots.reduce((sum, c) => sum + subtreeWidth(c), 0) + (rowRoots.length - 1) * H_GAP;
        let childX = -rowWidth / 2;
        for (const root of rowRoots) {
          const cw = subtreeWidth(root);
          positionNode(root, childX, rowY);
          childX += cw + H_GAP;
        }
        rowY += NODE_H + V_GAP;
        // Add extra space for any expanded subtrees
        let maxSubDepth = NODE_H;
        for (const root of rowRoots) {
          if (!collapsedIds.has(root.id) && root.children.length > 0) {
            maxSubDepth = Math.max(maxSubDepth, NODE_H + V_GAP + Math.ceil(root.children.length / MAX_CHILDREN_PER_ROW) * (NODE_H + V_GAP));
          }
        }
        rowY += maxSubDepth;
      }
    } else if (displayTree.length === 1) {
      positionNode(displayTree[0], 0, 0);
    }

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    Object.values(positions).forEach(p => {
      minX = Math.min(minX, p.x - NODE_W / 2);
      maxX = Math.max(maxX, p.x + NODE_W / 2);
      maxY = Math.max(maxY, p.y);
    });
    if (!isFinite(minX)) { minX = 0; maxX = 400; }

    const totalWidth = maxX - minX + 80;
    const totalHeight = maxY + NODE_H + 40;
    const offsetX = -minX + 40;

    return { positions, edges, totalWidth, totalHeight, offsetX };
  }, [displayTree, collapsedIds]);

  // Fit-to-screen: calculate zoom so the full tree fits the viewport
  const fitToScreen = useCallback(() => {
    if (!canvasRef.current || layoutData.totalWidth <= 0) { setZoom(0.7); setPan({ x: 0, y: 0 }); return; }
    const rect = canvasRef.current.getBoundingClientRect();
    const zx = (rect.width - 40) / layoutData.totalWidth;
    const zy = (rect.height - 40) / layoutData.totalHeight;
    const newZoom = Math.max(0.3, Math.min(1, Math.min(zx, zy)));
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, [layoutData.totalWidth, layoutData.totalHeight]);

  // Auto-fit on first render after layout is computed
  const autoFitRef = React.useRef(false);
  React.useEffect(() => {
    if (layoutData.totalWidth > 0 && !autoFitRef.current && canvasRef.current) {
      autoFitRef.current = true;
      requestAnimationFrame(() => fitToScreen());
    }
  }, [layoutData.totalWidth, fitToScreen]);

  if (!employees.length) return <div className="text-center py-20"><div className="text-[40px] mb-3">🏢</div><div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Employee Data</div><div className="text-[14px] text-[var(--text-muted)]">Upload workforce data with Manager ID fields to generate the org chart.</div></div>;

  // Graceful empty state for when data exists but tree is empty (filter mismatch)
  if (!displayTree.length) return <div className="text-center py-20"><div className="text-[40px] mb-3">🔍</div><div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Matching Employees</div><div className="text-[14px] text-[var(--text-muted)]">Adjust your filters to see the org hierarchy.</div></div>;

  return <div className="animate-tab-enter">
    {/* Toolbar */}
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] w-56" />
      <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
        {(["structure", "ai_impact", "tenure", "span", "flight", "readiness"] as const).map(m => <button key={m} onClick={() => setViewMode(m)} className="px-3 py-1.5 text-[13px] font-semibold transition-all" style={{ background: viewMode === m ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: viewMode === m ? "#e09040" : "var(--text-muted)" }}>{m === "structure" ? "Structure" : m === "ai_impact" ? "AI Impact" : m === "tenure" ? "Tenure" : m === "span" ? "Span" : m === "flight" ? "Flight Risk" : "Readiness"}</button>)}
      </div>
      <select value={funcFilter} onChange={e => setFuncFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none">
        <option value="All">All Functions</option>{Array.from(new Set(employees.map(e => e.function))).sort().map(f => <option key={f}>{f}</option>)}
      </select>
      <div className="flex rounded-lg overflow-hidden border border-[var(--border)] ml-auto">
        <button onClick={() => setStateMode("current")} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: stateMode === "current" ? "rgba(16,185,129,0.12)" : "var(--surface-2)", color: stateMode === "current" ? "var(--success)" : "var(--text-muted)" }}>Current</button>
        <button onClick={() => setStateMode("future")} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: stateMode === "future" ? "rgba(139,92,246,0.12)" : "var(--surface-2)", color: stateMode === "future" ? "var(--purple)" : "var(--text-muted)" }}>Future</button>
      </div>
      <label className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] cursor-pointer"><input type="checkbox" checked={showHeadcount} onChange={e => setShowHeadcount(e.target.checked)} className="rounded" />Headcount</label>
      <button onClick={expandAll} className="px-2 py-1 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Expand All</button>
      <button onClick={collapseAll} className="px-2 py-1 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Collapse All</button>
      <button onClick={fitToScreen} className="px-2 py-1 rounded text-[12px] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Fit</button>
      {stateMode === "future" && changeCount > 0 && <span className="px-2 py-1 rounded-full text-[12px] font-bold bg-[rgba(139,92,246,0.1)] text-[var(--purple)]">{changeCount} changes</span>}
    </div>

    {/* Breadcrumb */}
    {breadcrumb.length > 0 && <div className="flex items-center gap-1 mb-2 text-[13px]">
      {breadcrumb.map((n, i) => <React.Fragment key={n.id}>{i > 0 && <span className="text-[var(--text-muted)]">→</span>}<button onClick={() => setSelectedId(n.id)} className="font-semibold" style={{ color: i === breadcrumb.length - 1 ? "#e09040" : "var(--text-muted)" }}>{n.name}</button></React.Fragment>)}
    </div>}

    {/* Main area: Canvas + Detail Panel */}
    <div className="flex gap-4" style={{ height: "calc(100vh - 320px)", minHeight: 500 }}>
      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 rounded-xl border border-[var(--border)] overflow-auto relative" style={{ background: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="org-canvas-bg" style={{ cursor: dragging ? "grabbing" : "grab", minWidth: "100%", minHeight: "100%" }}>
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "top center", transition: dragging ? "none" : "transform 0.15s ease", position: "relative", width: layoutData.totalWidth, height: layoutData.totalHeight, margin: "0 auto", paddingTop: 20 }}>
            {/* SVG connector lines */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: layoutData.totalWidth, height: layoutData.totalHeight, pointerEvents: "none" }}>
              {layoutData.edges.map(({ parentId, childId }) => {
                const parentPos = layoutData.positions[parentId];
                const childPos = layoutData.positions[childId];
                if (!parentPos || !childPos) return null;
                const x1 = parentPos.x + layoutData.offsetX;
                const y1 = parentPos.y + NODE_H;
                const x2 = childPos.x + layoutData.offsetX;
                const y2 = childPos.y;
                const midY = y1 + (y2 - y1) / 2;
                return <path key={`${parentId}-${childId}`} d={`M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />;
              })}
            </svg>
            {/* Node cards positioned absolutely */}
            {Object.entries(layoutData.positions).map(([id, pos]) => {
              const node = nodeById[id];
              if (!node) return null;
              return <div key={id} style={{ position: "absolute", left: pos.x + layoutData.offsetX - NODE_W / 2, top: pos.y, width: NODE_W }}>
                {renderNodeCard(node)}
              </div>;
            })}
            {displayTree.length === 0 && <div className="text-[var(--text-muted)] text-center py-20 w-full">No employees match the current filters</div>}
          </div>
        </div>
        {/* Zoom indicator */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[rgba(0,0,0,0.5)] rounded-lg px-3 py-1.5 backdrop-blur z-10">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-[14px] text-white/60 hover:text-white">+</button>
          <span className="text-[12px] text-white/60">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="text-[14px] text-white/60 hover:text-white">−</button>
        </div>
        {stateMode === "future" && <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-[rgba(139,92,246,0.15)] text-[var(--purple)] border border-[var(--purple)]/20 z-10">Editing Future State — drag nodes to change reporting lines</div>}
      </div>

      {/* Detail panel */}
      {selectedNode && <div className="w-72 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-bold text-[var(--text-primary)]">{selectedNode.name}</div>
          <button onClick={() => setSelectedId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
        <div className="space-y-3">
          <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Title</div><div className="text-[14px] text-[var(--text-primary)] font-semibold">{selectedNode.title}</div></div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Function</div><div className="text-[14px] font-semibold" style={{ color: ORG_FUNC_COLORS[selectedNode.function] || "#888" }}>{selectedNode.function}</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Level</div><div className="text-[14px] text-[var(--text-primary)]">{selectedNode.level}</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Track</div><div className="text-[14px] text-[var(--text-primary)]">{selectedNode.track}</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Reports to</div><div className="text-[14px] text-[var(--text-primary)]">{selectedNode.managerId || "—"}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Performance</div><div className="text-[14px] font-semibold" style={{ color: selectedNode.performance === "Exceeds" ? "var(--success)" : selectedNode.performance === "Meets" ? "var(--accent-primary)" : "var(--warning)" }}>{selectedNode.performance}</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Flight Risk</div><div className="text-[14px] font-semibold" style={{ color: selectedNode.flightRisk === "High" ? "var(--risk)" : selectedNode.flightRisk === "Medium" ? "var(--warning)" : "var(--success)" }}>{selectedNode.flightRisk}</div></div>
          </div>
          {selectedNode.children.length > 0 && <>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Span of Control</div><div className="text-[14px] font-bold" style={{ color: spanColor(selectedNode) }}>{selectedNode.children.length} direct reports</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase">Total Organization</div><div className="text-[14px] text-[var(--text-primary)]">{selectedNode.headcount - 1} people</div></div>
            <div><div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Direct Reports</div><div className="space-y-1 max-h-[200px] overflow-y-auto">{selectedNode.children.map(c => <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--bg)] transition-all flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ORG_FUNC_COLORS[c.function] || "#888" }} />
              <div className="min-w-0"><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{c.name}</div><div className="text-[11px] text-[var(--text-muted)] truncate">{c.title}</div></div>
            </button>)}</div></div>
          </>}
        </div>
      </div>}
    </div>

    {/* Heat map legends */}
    {viewMode === "span" && <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[var(--warning)]" />1-3 (narrow)</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[var(--success)]" />4-8 (healthy)</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[var(--warning)]" />9-12 (wide)</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[var(--risk)]" />13+ (too wide)</span>
    </div>}
    {viewMode === "ai_impact" && <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#10b981"}} />Low AI Impact</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#f59e0b"}} />Moderate</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#ef4444"}} />High AI Impact</span>
    </div>}
    {viewMode === "tenure" && <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#60a5fa"}} />&lt;2 yrs</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#10b981"}} />2-5 yrs</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#f59e0b"}} />5-10 yrs</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#c084fc"}} />10+ yrs</span>
    </div>}
    {viewMode === "flight" && <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#10b981"}} />Low Risk</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#f59e0b"}} />Medium Risk</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#ef4444"}} />High Risk</span>
    </div>}
    {viewMode === "readiness" && <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#ef4444"}} />Not Ready</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#f59e0b"}} />Developing</span>
      <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full" style={{background:"#10b981"}} />Ready</span>
    </div>}

    {/* Function color legend */}
    {viewMode === "structure" && <div className="flex gap-2 flex-wrap mt-2">{Array.from(new Set(employees.map(e => e.function))).sort().map(f => <span key={f} className="flex items-center gap-1 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ORG_FUNC_COLORS[f] || "#888" }} /><span style={{ color: ORG_FUNC_COLORS[f] || "#888" }}>{f}</span></span>)}</div>}
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
  const [profileView, setProfileView] = useState<"library" | "detail">("library");
  const [libraryViewMode, setLibraryViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFunc, setFilterFunc] = useState("All");
  const [filterComplete, setFilterComplete] = useState("All");
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [compareJobs, setCompareJobs] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

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

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedProfile = selectedJobId ? getProfile(selectedJobId) : emptyProfile;

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
    return result;
  }, [jobs, searchQuery, filterFunc, filterComplete, profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary stats
  const complete = jobs.filter(j => completeness(j.id) >= 90).length;
  const drafts = jobs.filter(j => { const c = completeness(j.id); return c > 0 && c < 90; }).length;
  const empty = jobs.filter(j => completeness(j.id) === 0).length;

  if (profileView === "detail" && selectedJob) {
    const p = selectedProfile;
    const badge = statusBadge(selectedJob.id);
    const EditableList = ({ items, field, placeholder }: { items: string[]; field: string; placeholder: string }) => {
      const [adding, setAdding] = useState(false);
      const [newItem, setNewItem] = useState("");
      return <div>
        <div className="space-y-1">{items.map((item, i) => <div key={i} className="flex items-center gap-2 group text-[14px]"><span className="text-[var(--accent-primary)]">•</span><span className="text-[var(--text-secondary)] flex-1">{item}</span><button onClick={() => { const next = items.filter((_, idx) => idx !== i); updateProfile(selectedJob.id, field, next); }} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] text-[12px]">×</button></div>)}</div>
        {adding ? <div className="flex gap-2 mt-2"><input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) { updateProfile(selectedJob.id, field, [...items, newItem.trim()]); setNewItem(""); } if (e.key === "Escape") setAdding(false); }} placeholder={placeholder} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" autoFocus /><button onClick={() => setAdding(false)} className="text-[13px] text-[var(--text-muted)]">Done</button></div> : <button onClick={() => setAdding(true)} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">+ Add</button>}
      </div>;
    };
    const EditableText = ({ value, field, placeholder, multiline }: { value: string; field: string; placeholder: string; multiline?: boolean }) => {
      const isEditing = editingField === `${selectedJob.id}_${field}`;
      if (isEditing) {
        const El = multiline ? "textarea" : "input";
        return <El value={value} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateProfile(selectedJob.id, field, e.target.value)} onBlur={() => setEditingField(null)} className={`w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none ${multiline ? "resize-none" : ""}`} rows={multiline ? 3 : undefined} autoFocus />;
      }
      return <div onClick={() => setEditingField(`${selectedJob.id}_${field}`)} className="text-[14px] cursor-pointer hover:bg-[var(--surface-2)] rounded-lg px-2 py-1 -mx-2 transition-all" style={{ color: value ? "var(--text-secondary)" : "var(--text-muted)" }}>{value || placeholder}</div>;
    };

    return <div className="animate-tab-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setProfileView("library")} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">← Library</button>
          <div className="text-[18px] font-bold text-[var(--text-primary)]">{selectedJob.title}</div>
          <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${badge.color}12`, color: badge.color }}>{badge.label} · {completeness(selectedJob.id)}%</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => generateProfile(selectedJob)} disabled={generating} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: generating ? 0.5 : 1 }}>{generating ? "Generating..." : completeness(selectedJob.id) > 0 ? "✨ Regenerate" : "✨ Generate Profile"}</button>
          {compareJobs.length < 3 && !compareJobs.includes(selectedJob.id) && <button onClick={() => { setCompareJobs(prev => [...prev, selectedJob.id]); showToast("Added to comparison"); }} className="px-3 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">+ Compare</button>}
        </div>
      </div>
      {/* Job metadata */}
      <div className="grid grid-cols-8 gap-2 mb-4">
        {[{ l: "Function", v: selectedJob.function }, { l: "Family", v: selectedJob.family }, { l: "Sub-Family", v: selectedJob.sub_family }, { l: "Track", v: selectedJob.track }, { l: "Level", v: selectedJob.level }, { l: "Headcount", v: String(selectedJob.headcount) }, { l: "AI Impact", v: selectedJob.ai_impact }, { l: "AI Score", v: selectedJob.ai_score?.toFixed(1) }].map(m => <div key={m.l} className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center"><div className="text-[11px] text-[var(--text-muted)] uppercase">{m.l}</div><div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{m.v || "—"}</div></div>)}
      </div>
      {/* Profile sections */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Purpose"><EditableText value={p.purpose} field="purpose" placeholder="Click to add purpose statement..." multiline /></Card>
        <Card title="Reporting Relationships">
          <div className="space-y-2">
            <div><span className="text-[12px] text-[var(--text-muted)] uppercase">Reports to: </span><EditableText value={p.reportsTo} field="reportsTo" placeholder="Title of manager..." /></div>
            <div><span className="text-[12px] text-[var(--text-muted)] uppercase">Manages: </span><EditableText value={p.manages} field="manages" placeholder="e.g. 5 direct reports, team of 12..." /></div>
          </div>
        </Card>
        <Card title="Key Responsibilities"><EditableList items={p.responsibilities} field="responsibilities" placeholder="Add responsibility..." /></Card>
        <Card title="Key Performance Indicators"><EditableList items={p.kpis} field="kpis" placeholder="Add KPI..." /></Card>
        <Card title="Required Skills">
          <div className="space-y-3">
            {(["technical", "functional", "leadership", "digital"] as const).map(cat => {
              const catColors: Record<string, string> = { technical: "var(--accent-primary)", functional: "var(--success)", leadership: "var(--purple)", digital: "var(--warning)" };
              return <div key={cat}><div className="text-[13px] font-bold uppercase mb-1" style={{ color: catColors[cat] }}>{cat}</div><div className="flex flex-wrap gap-1">{(p.skills[cat] || []).map((sk, i) => <span key={i} className="px-2 py-0.5 rounded-full text-[13px] font-semibold group cursor-default" style={{ background: `${catColors[cat]}12`, color: catColors[cat] }}>{sk}<button onClick={() => { const next = p.skills[cat].filter((_, idx) => idx !== i); updateProfile(selectedJob.id, "skills", { ...p.skills, [cat]: next }); }} className="ml-1 opacity-0 group-hover:opacity-100 text-[11px]">×</button></span>)}<button onClick={() => { const sk = prompt(`Add ${cat} skill:`); if (sk) updateProfile(selectedJob.id, "skills", { ...p.skills, [cat]: [...(p.skills[cat] || []), sk] }); }} className="px-2 py-0.5 rounded-full text-[12px] text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:text-[var(--accent-primary)]">+</button></div></div>;
            })}
          </div>
        </Card>
        <Card title="Experience & Education"><EditableText value={p.experience} field="experience" placeholder="Click to add experience requirements..." multiline /></Card>
        <Card title="Career Path"><EditableList items={p.careerPath} field="careerPath" placeholder="Add next career move..." /></Card>
        <Card title="AI Impact Assessment"><EditableText value={p.aiImpact} field="aiImpact" placeholder="Click to add AI impact assessment..." multiline /></Card>
      </div>
    </div>;
  }

  // Compare view
  if (showCompare && compareJobs.length >= 2) {
    const compJobs = compareJobs.map(id => jobs.find(j => j.id === id)).filter(Boolean) as Job[];
    return <div className="animate-tab-enter">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[18px] font-bold text-[var(--text-primary)]">Job Profile Comparison</div>
        <button onClick={() => { setShowCompare(false); setCompareJobs([]); }} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">← Back to Library</button>
      </div>
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${compJobs.length}, 1fr)` }}>
        {compJobs.map(job => {
          const p = getProfile(job.id);
          return <div key={job.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
            <div className="text-[16px] font-bold text-[var(--text-primary)]">{job.title}</div>
            <div className="text-[13px] text-[var(--text-muted)]">{job.function} · {job.level} · {job.track}</div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-1">Purpose</div><div className="text-[13px] text-[var(--text-secondary)]">{p.purpose || "—"}</div></div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-1">Responsibilities ({p.responsibilities.length})</div>{p.responsibilities.slice(0, 5).map((r, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)]">• {r}</div>)}</div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-1">Skills</div><div className="flex flex-wrap gap-1">{[...p.skills.technical, ...p.skills.functional].slice(0, 8).map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--bg)] text-[var(--text-secondary)]">{s}</span>)}</div></div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-1">KPIs ({p.kpis.length})</div>{p.kpis.slice(0, 4).map((k, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)]">• {k}</div>)}</div>
          </div>;
        })}
      </div>
    </div>;
  }

  // Library view
  return <div className="animate-tab-enter">
    {/* Toolbar */}
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search jobs..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] w-48" />
      <select value={filterFunc} onChange={e => setFilterFunc(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option value="All">All Functions</option>{Array.from(new Set(jobs.map(j => j.function))).sort().map(f => <option key={f}>{f}</option>)}</select>
      <select value={filterComplete} onChange={e => setFilterComplete(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option value="All">All Status</option><option>Complete</option><option>Draft</option><option>Empty</option></select>
      <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
        <button onClick={() => setLibraryViewMode("grid")} className="px-3 py-1.5 text-[13px]" style={{ background: libraryViewMode === "grid" ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: libraryViewMode === "grid" ? "#e09040" : "var(--text-muted)" }}>Grid</button>
        <button onClick={() => setLibraryViewMode("list")} className="px-3 py-1.5 text-[13px]" style={{ background: libraryViewMode === "list" ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: libraryViewMode === "list" ? "#e09040" : "var(--text-muted)" }}>List</button>
      </div>
      <div className="ml-auto flex gap-2">
        <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Browse Templates</button>
        {compareJobs.length >= 2 && <button onClick={() => setShowCompare(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--purple)] border border-[var(--purple)]/30">Compare ({compareJobs.length})</button>}
        <button onClick={bulkGenerate} disabled={bulkGenerating} className="px-4 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: bulkGenerating ? 0.5 : 1 }}>{bulkGenerating ? `Generating... ${bulkProgress}%` : "✨ Generate All Empty"}</button>
      </div>
    </div>
    {/* Bulk progress */}
    {bulkGenerating && <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4"><div className="h-full rounded-full bg-[var(--accent-primary)] transition-all" style={{ width: `${bulkProgress}%` }} /></div>}
    {/* KPIs */}
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{jobs.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Total Roles</div></div>
      <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{complete}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Complete</div></div>
      <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{drafts}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Draft</div></div>
      <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-muted)]">{empty}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Empty</div></div>
    </div>
    {/* Template modal */}
    {showTemplates && <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
      <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] max-w-[800px] w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="text-[18px] font-bold text-[var(--text-primary)]">Job Profile Templates</div><button onClick={() => setShowTemplates(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[20px]">×</button></div>
        <div className="grid grid-cols-2 gap-3">{Object.entries(JP_TEMPLATES).map(([key, tmpl]) => <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{key}</div>
          <div className="text-[13px] text-[var(--text-muted)] mb-2 line-clamp-2">{tmpl.purpose}</div>
          <div className="flex flex-wrap gap-1 mb-3">{tmpl.skills?.technical?.slice(0, 4).map(s => <span key={s} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--bg)] text-[var(--text-secondary)]">{s}</span>)}</div>
          <select onChange={e => { if (e.target.value) { applyTemplate(e.target.value, key); setShowTemplates(false); } }} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none"><option value="">Apply to job...</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.function})</option>)}</select>
        </div>)}</div>
      </div>
    </div>}
    {/* Grid / List view */}
    {libraryViewMode === "grid" ? <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">{filteredJobs.map(job => {
      const badge = statusBadge(job.id);
      const pct = completeness(job.id);
      const isInCompare = compareJobs.includes(job.id);
      return <div key={job.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 cursor-pointer hover:border-[var(--accent-primary)]/30 transition-all" onClick={() => { setSelectedJobId(job.id); setProfileView("detail"); }}>
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${badge.color}12`, color: badge.color }}>{badge.label}</span>
          <button onClick={e => { e.stopPropagation(); setCompareJobs(prev => isInCompare ? prev.filter(id => id !== job.id) : prev.length < 3 ? [...prev, job.id] : prev); }} className="text-[12px]" style={{ color: isInCompare ? "var(--purple)" : "var(--text-muted)" }}>{isInCompare ? "✓ Compare" : "+ Compare"}</button>
        </div>
        <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1 truncate">{job.title}</div>
        <div className="text-[12px] text-[var(--text-muted)] mb-2">{job.function} · {job.level}</div>
        <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "var(--success)" : pct > 0 ? "var(--warning)" : "var(--text-muted)" }} /></div>
        <div className="text-[11px] text-[var(--text-muted)] mt-1">{pct}% complete</div>
      </div>;
    })}</div> : <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
      {["Title", "Function", "Family", "Level", "Track", "HC", "Status", "Complete", ""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">{h}</th>)}
    </tr></thead><tbody>
      {filteredJobs.map(job => {
        const badge = statusBadge(job.id);
        return <tr key={job.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50 cursor-pointer" onClick={() => { setSelectedJobId(job.id); setProfileView("detail"); }}>
          <td className="px-2 py-2 font-semibold text-[var(--text-primary)]">{job.title}</td>
          <td className="px-2 py-2 text-[var(--text-secondary)]">{job.function}</td>
          <td className="px-2 py-2 text-[var(--text-muted)]">{job.family}</td>
          <td className="px-2 py-2">{job.level}</td>
          <td className="px-2 py-2 text-[var(--text-muted)]">{job.track}</td>
          <td className="px-2 py-2">{job.headcount}</td>
          <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${badge.color}12`, color: badge.color }}>{badge.label}</span></td>
          <td className="px-2 py-2">{completeness(job.id)}%</td>
          <td className="px-2 py-2"><button onClick={e => { e.stopPropagation(); generateProfile(job); }} className="text-[12px] text-[var(--accent-primary)]">✨</button></td>
        </tr>;
      })}
    </tbody></table></div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JOB EVALUATION — Mercer IPE / Hay-style job grading
   ═══════════════════════════════════════════════════════════════ */

const EVAL_METHODOLOGIES = {
  ipe: { name: "Mercer IPE-Style", factors: [
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

  return <div className="animate-tab-enter space-y-5">
    {/* Methodology selector */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Methodology:</span>
      {(["ipe", "hay"] as const).map(m => <button key={m} onClick={() => setMethodology(m)} className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all" style={{ background: methodology === m ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: methodology === m ? "#e09040" : "var(--text-muted)", border: methodology === m ? "1px solid rgba(212,134,10,0.3)" : "1px solid var(--border)" }}>{EVAL_METHODOLOGIES[m].name}</button>)}
      <div className="ml-auto flex gap-2">
        {(["score", "comparison", "batch"] as const).map(v => <button key={v} onClick={() => setEvalView(v)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold" style={{ background: evalView === v ? "rgba(212,134,10,0.1)" : "transparent", color: evalView === v ? "#e09040" : "var(--text-muted)" }}>{v === "score" ? "Score" : v === "comparison" ? "Compare" : "Batch AI"}</button>)}
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
                  background: isSelected ? "rgba(212,134,10,0.12)" : "var(--surface-2)",
                  border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                  boxShadow: isSelected ? "0 0 12px rgba(212,134,10,0.15)" : "none",
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
          return <tr key={j.id} className="border-b border-[var(--border)]">
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{j.title}<div className="text-[12px] text-[var(--text-muted)]">{j.function}</div></td>
            <td className="px-2 py-2 text-center">{j.level}</td>
            {meth.factors.map(f => <td key={f.id} className="px-2 py-2 text-center font-data text-[var(--text-secondary)]">{js[f.id] || "—"}</td>)}
            <td className="px-2 py-2 text-center font-bold font-data text-[var(--accent-primary)]">{jTotal}</td>
            <td className="px-2 py-2 text-center font-bold" style={{ color: "var(--success)" }}>{jGrade}</td>
            <td className="px-2 py-2 text-center">{flag && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: flag === "Under-leveled" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: flag === "Under-leveled" ? "var(--success)" : "var(--risk)" }}>{flag}</span>}</td>
          </tr>;
        })}
      </tbody></table></div>}
    </Card>}

    {/* ─── BATCH AI VIEW ─── */}
    {evalView === "batch" && <Card title="Batch AI Evaluation">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Use AI to auto-evaluate all roles based on title, function, and level. Review and adjust scores after generation.</div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={aiEvaluateAll} disabled={aiEvalLoading} className="px-5 py-2.5 rounded-xl text-[15px] font-bold text-white glow-pulse" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiEvalLoading ? 0.5 : 1 }}>{aiEvalLoading ? "Evaluating..." : `✨ AI Evaluate All (${Math.min(jobs.length, 30)} roles)`}</button>
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

  // Group jobs by track and level
  const tracks = Array.from(new Set(jobs.map(j => j.track))).sort();
  const levels = Array.from(new Set(jobs.map(j => j.level))).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, "")) || 0;
    const bNum = parseInt(b.replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });
  const trackColors: Record<string, string> = { IC: "#0891B2", Manager: "#8B5CF6", Executive: "#D4860A", P: "#0891B2", S: "#10B981", T: "#F59E0B", ST: "#EC4899", M: "#8B5CF6", E: "#D4860A" };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const paths = selectedJobId ? pathData[selectedJobId] : null;

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

  return <div className="animate-tab-enter space-y-5">
    <Card title="Career Lattice — Interactive Career Path Network">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Click any role to see possible career moves. Colors represent career tracks. Lines show progression paths.</div>

      {/* Lattice grid */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full" style={{ minWidth: tracks.length * 180 }}>
          <thead><tr className="bg-[var(--surface-2)]">
            <th className="px-3 py-3 text-left text-[13px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 w-20">Level</th>
            {tracks.map(t => <th key={t} className="px-3 py-3 text-center text-[13px] font-bold border-b border-[var(--border)]" style={{ color: trackColors[t] || "#888" }}>{t} Track</th>)}
          </tr></thead>
          <tbody>
            {levels.map(level => <tr key={level} className="border-b border-[var(--border)]">
              <td className="px-3 py-3 text-[14px] font-bold text-[var(--text-muted)] sticky left-0 bg-[var(--bg)] z-10">{level}</td>
              {tracks.map(track => {
                const cellJobs = jobs.filter(j => j.track === track && j.level === level);
                return <td key={track} className="px-2 py-2 text-center align-top" style={{ minWidth: 160 }}>
                  <div className="space-y-1.5">
                    {cellJobs.map(j => {
                      const isSelected = selectedJobId === j.id;
                      const isPath = paths && (paths.nextMoves.includes(j.title) || paths.lateralMoves.includes(j.title) || paths.crossTrack.includes(j.title));
                      const pathType = paths?.nextMoves.includes(j.title) ? "promotion" : paths?.lateralMoves.includes(j.title) ? "lateral" : paths?.crossTrack.includes(j.title) ? "cross" : null;
                      const dimmed = selectedJobId && !isSelected && !isPath;
                      return <button key={j.id} onClick={() => { setSelectedJobId(isSelected ? null : j.id); }} className="w-full rounded-xl px-3 py-2 text-left transition-all" style={{
                        background: isSelected ? "rgba(212,134,10,0.15)" : isPath ? `${pathType === "promotion" ? "rgba(16,185,129,0.08)" : pathType === "lateral" ? "rgba(139,92,246,0.08)" : "rgba(14,165,233,0.08)"}` : "var(--surface-2)",
                        border: isSelected ? "2px solid var(--accent-primary)" : isPath ? `1px solid ${pathType === "promotion" ? "var(--success)" : pathType === "lateral" ? "var(--purple)" : "#0EA5E9"}30` : "1px solid var(--border)",
                        opacity: dimmed ? 0.3 : 1,
                        boxShadow: isSelected ? "0 0 12px rgba(212,134,10,0.2)" : "none",
                      }}>
                        <div className="text-[13px] font-semibold truncate" style={{ color: isSelected ? "var(--accent-primary)" : "var(--text-primary)" }}>{j.title}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">{j.function} · {j.headcount} HC</div>
                        {isPath && <div className="text-[10px] font-bold mt-0.5" style={{ color: pathType === "promotion" ? "var(--success)" : pathType === "lateral" ? "var(--purple)" : "#0EA5E9" }}>{pathType === "promotion" ? "↑ Promotion" : pathType === "lateral" ? "↔ Lateral" : "↗ Cross-track"}</div>}
                      </button>;
                    })}
                    {cellJobs.length === 0 && <div className="text-[12px] text-[var(--text-muted)] opacity-30 py-2">—</div>}
                  </div>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>

      {/* Selected role detail */}
      {selectedJob && <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div><div className="text-[18px] font-bold text-[var(--text-primary)] font-heading">{selectedJob.title}</div><div className="text-[14px] text-[var(--text-muted)]">{selectedJob.function} · {selectedJob.track} · {selectedJob.level} · {selectedJob.headcount} people</div></div>
          <button onClick={generatePaths} disabled={aiGenerating} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiGenerating ? 0.5 : 1 }}>{aiGenerating ? "Generating..." : "✨ AI Generate Paths"}</button>
        </div>
        {paths ? <div className="grid grid-cols-3 gap-4">
          <div><div className="text-[13px] font-bold text-[var(--success)] uppercase mb-2">↑ Promotion Paths</div>{paths.nextMoves.map(t => <div key={t} className="text-[14px] text-[var(--text-secondary)] mb-1">• {t}</div>)}{paths.nextMoves.length === 0 && <div className="text-[13px] text-[var(--text-muted)]">None identified</div>}</div>
          <div><div className="text-[13px] font-bold text-[var(--purple)] uppercase mb-2">↔ Lateral Moves</div>{paths.lateralMoves.map(t => <div key={t} className="text-[14px] text-[var(--text-secondary)] mb-1">• {t}</div>)}{paths.lateralMoves.length === 0 && <div className="text-[13px] text-[var(--text-muted)]">None identified</div>}</div>
          <div><div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0EA5E9" }}>↗ Cross-Track</div>{paths.crossTrack.map(t => <div key={t} className="text-[14px] text-[var(--text-secondary)] mb-1">• {t}</div>)}{paths.crossTrack.length === 0 && <div className="text-[13px] text-[var(--text-muted)]">None identified</div>}</div>
        </div> : <div className="text-[14px] text-[var(--text-muted)]">Click &quot;AI Generate Paths&quot; to identify career moves for this role.</div>}
      </div>}

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-[var(--accent-primary)]" style={{ background: "rgba(212,134,10,0.15)" }} />Selected</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(16,185,129,0.15)]" />Promotion</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(139,92,246,0.15)]" />Lateral</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(14,165,233,0.15)]" />Cross-track</span>
      </div>
    </Card>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   JA GOVERNANCE — Role lifecycle, approvals, health dashboard
   ═══════════════════════════════════════════════════════════════ */

type JAChangeRequest = { id: string; type: "new" | "modify" | "deprecate"; roleTitle: string; requestedBy: string; justification: string; status: "Draft" | "Pending" | "Approved" | "Rejected"; date: string; approver: string };

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
      ]).map(v => <button key={v.id} onClick={() => setGovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{ background: govView === v.id ? "rgba(212,134,10,0.12)" : "transparent", color: govView === v.id ? "#e09040" : "var(--text-muted)" }}>{v.icon} {v.label}</button>)}
    </div>

    {/* ─── HEALTH DASHBOARD ─── */}
    {govView === "health" && <div className="space-y-5">
      {/* Health score */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center col-span-1"><div className="text-[32px] font-extrabold" style={{ color: healthScore >= 70 ? "var(--success)" : healthScore >= 40 ? "var(--warning)" : "var(--risk)" }}>{healthScore}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">JA Health</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{singleIncumbent.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Single Incumbent</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{noTasksRoles.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">No Task Data</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--purple)]">{titleDuplicates.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Title Variants</div></div>
        <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{levelCompression.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Level Compression</div></div>
      </div>

      {/* Issues */}
      <Card title="JA Health Issues">
        <div className="space-y-3">
          {singleIncumbent.length > 0 && <div className="rounded-lg p-3 border-l-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(245,158,11,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--warning)]">Single Incumbent Risk</span><Badge color="amber">{singleIncumbent.length} roles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">These roles have only 1 person — key-person dependency risk.</div>
            <div className="flex flex-wrap gap-1 mt-2">{singleIncumbent.slice(0, 8).map(j => <span key={j.id} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{j.title}</span>)}{singleIncumbent.length > 8 && <span className="text-[12px] text-[var(--text-muted)]">+{singleIncumbent.length - 8} more</span>}</div>
          </div>}

          {titleDuplicates.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--purple)", background: "rgba(139,92,246,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--purple)]">Cross-Function Title Inconsistency</span><Badge color="purple">{titleDuplicates.length} titles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">Same title exists at different levels across functions — standardize.</div>
            <div className="space-y-1 mt-2">{titleDuplicates.slice(0, 5).map(([title, levels]) => <div key={title} className="text-[13px] text-[var(--text-muted)]">&quot;{title}&quot; found at levels: {[...levels].join(", ")}</div>)}</div>
          </div>}

          {levelCompression.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(245,158,11,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--warning)]">Level Compression</span><Badge color="amber">{levelCompression.length} functions</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">&gt;70% of headcount concentrated in 2 adjacent levels — limited career progression.</div>
            <div className="flex flex-wrap gap-1 mt-2">{levelCompression.map(([func]) => <span key={func} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{func}</span>)}</div>
          </div>}

          {noTasksRoles.length > 0 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--risk)", background: "rgba(239,68,68,0.04)" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[14px] font-bold text-[var(--risk)]">Missing Task Data</span><Badge color="red">{noTasksRoles.length} roles</Badge></div>
            <div className="text-[13px] text-[var(--text-secondary)]">These roles have no task-level data — they cannot be analyzed in the Work Design Lab.</div>
          </div>}

          {healthScore >= 80 && <div className="rounded-lg p-3" style={{ borderLeft: "3px solid var(--success)", background: "rgba(16,185,129,0.04)" }}>
            <div className="text-[14px] font-bold text-[var(--success)]">JA is in good health</div>
            <div className="text-[13px] text-[var(--text-secondary)]">No critical issues detected. Continue regular maintenance.</div>
          </div>}
        </div>
      </Card>
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
          const typeColors: Record<string, string> = { new: "var(--success)", modify: "var(--warning)", deprecate: "var(--risk)" };
          const statusColors: Record<string, string> = { Draft: "var(--text-muted)", Pending: "var(--warning)", Approved: "var(--success)", Rejected: "var(--risk)" };
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
      {addingChange ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0" style={{ background: reviewStep > i ? "rgba(16,185,129,0.1)" : reviewStep === i ? "rgba(212,134,10,0.1)" : "var(--surface-2)" }}>{reviewStep > i ? "✓" : s.icon}</div>
          <div className="flex-1"><div className="text-[15px] font-bold text-[var(--text-primary)]">Step {s.step}: {s.title}</div><div className="text-[13px] text-[var(--text-muted)]">{s.desc}</div></div>
          {reviewStep === i && <button onClick={() => setReviewStep(i + 1)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Complete</button>}
        </div>)}
      </div>
      {reviewStep >= 5 && <div className="mt-4 rounded-xl bg-[rgba(16,185,129,0.06)] border border-[var(--success)]/20 p-4 text-center">
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
  const [intView, setIntView] = useState<"evolution" | "emerging" | "drift" | "vitals">("evolution");
  const [aiInsights, setAiInsights] = usePersisted<{ id: string; type: string; severity: string; title: string; body: string; affected: number; action: string }[]>(`${model}_ja_insights`, []);
  const [aiLoading, setAiLoading] = useState(false);

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
        { id: "evolution" as const, label: "Role Evolution", icon: "🔄" },
        { id: "emerging" as const, label: "Emerging Roles", icon: "🌱" },
        { id: "drift" as const, label: "Architecture Drift", icon: "📡" },
        { id: "vitals" as const, label: "Vital Signs", icon: "💓" },
      ]).map(v => <button key={v.id} onClick={() => setIntView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{ background: intView === v.id ? "rgba(212,134,10,0.12)" : "transparent", color: intView === v.id ? "#e09040" : "var(--text-muted)" }}>{v.icon} {v.label}</button>)}
    </div>

    {/* ─── ROLE EVOLUTION ─── */}
    {intView === "evolution" && <Card title="Role Evolution Detector">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">AI-detected roles that are transforming, converging, or at risk of compression.</div>
      <button onClick={generateInsights} disabled={aiLoading} className="px-5 py-2 rounded-xl text-[14px] font-bold text-white mb-4" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiLoading ? 0.5 : 1 }}>{aiLoading ? "Analyzing..." : "✨ AI Detect Role Evolution"}</button>
      {/* Auto-detected insights */}
      <div className="space-y-3">
        {highAiImpact.length > 0 && <div className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--risk)", background: "rgba(239,68,68,0.04)" }}>
          <div className="flex items-center gap-2 mb-1"><span className="text-[14px]">🔴</span><span className="text-[15px] font-bold text-[var(--text-primary)]">High AI Impact Roles — Compression Risk</span><Badge color="red">{highAiImpact.length} roles</Badge></div>
          <div className="text-[14px] text-[var(--text-secondary)] mb-2">These roles have AI impact scores above 5.0 — significant portions of their tasks are automatable. Plan redeployment for {highAiImpact.reduce((s, j) => s + j.headcount, 0)} incumbents.</div>
          <div className="flex flex-wrap gap-1">{highAiImpact.slice(0, 8).map(j => <span key={j.id} className="px-2 py-0.5 rounded text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)]">{j.title} ({j.ai_score?.toFixed(1)})</span>)}</div>
        </div>}
        {singleIncumbent.length > 3 && <div className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)", background: "rgba(245,158,11,0.04)" }}>
          <div className="flex items-center gap-2 mb-1"><span className="text-[14px]">🟡</span><span className="text-[15px] font-bold text-[var(--text-primary)]">Key-Person Dependency</span><Badge color="amber">{singleIncumbent.length} roles</Badge></div>
          <div className="text-[14px] text-[var(--text-secondary)]">{singleIncumbent.length} roles have only 1 incumbent. If they leave, there is no backup. Build succession plans or cross-train.</div>
        </div>}
        {/* AI-generated insights */}
        {aiInsights.filter(i => i.type === "evolution" || i.type === "convergence" || i.type === "compression").map(ins => {
          const sevColors: Record<string, string> = { urgent: "var(--risk)", watch: "var(--warning)", opportunity: "var(--success)" };
          const sevIcons: Record<string, string> = { urgent: "🔴", watch: "🟡", opportunity: "🟢" };
          return <div key={ins.id} className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: sevColors[ins.severity] || "var(--text-muted)", background: `${sevColors[ins.severity] || "var(--text-muted)"}06` }}>
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
        {aiInsights.filter(i => i.type === "emerging").map(ins => <div key={ins.id} className="rounded-xl border border-[var(--success)]/20 bg-[rgba(16,185,129,0.04)] p-4">
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
        {aiInsights.filter(i => i.type === "drift").map(ins => <div key={ins.id} className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)", background: "rgba(245,158,11,0.04)" }}>
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

  // Compute task overlap (simulated based on family/sub-family proximity)
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

  const selectedJob = jobs.find(j => j.id === selectedRoleId);
  const selectedPairs = selectedRoleId ? overlapPairs.filter(p => p.a.id === selectedRoleId || p.b.id === selectedRoleId) : [];

  return <div className="animate-tab-enter space-y-5">
    <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] mb-4">
      {([
        { id: "overlap" as const, label: "Task Overlap", icon: "🔗" },
        { id: "skills" as const, label: "Skill Adjacency", icon: "🧠" },
        { id: "succession" as const, label: "Succession Risk", icon: "⚠️" },
      ]).map(v => <button key={v.id} onClick={() => setNetView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{ background: netView === v.id ? "rgba(212,134,10,0.12)" : "transparent", color: netView === v.id ? "#e09040" : "var(--text-muted)" }}>{v.icon} {v.label}</button>)}
    </div>

    {/* ─── TASK OVERLAP ─── */}
    {netView === "overlap" && <Card title="Task Overlap Network">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Roles connected by shared task profiles. High overlap = potential consolidation candidate. Click a role to see its connections.</div>
      {/* Role selector */}
      <div className="flex gap-2 mb-4">
        <select value={selectedRoleId || ""} onChange={e => setSelectedRoleId(e.target.value || null)} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="">All roles — showing top overlaps</option>{jobs.slice(0, 50).map(j => <option key={j.id} value={j.id}>{j.title} ({j.function})</option>)}</select>
      </div>
      {/* Overlap pairs */}
      <div className="space-y-2">
        {(selectedRoleId ? selectedPairs : overlapPairs).slice(0, 15).map((pair, i) => {
          const overlapColor = pair.type === "high" ? "var(--risk)" : pair.type === "medium" ? "var(--warning)" : "var(--success)";
          const overlapLabel = pair.type === "high" ? "Likely Duplication" : pair.type === "medium" ? "Potential Redundancy" : "Healthy Collaboration";
          return <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[14px]">
                <button onClick={() => setSelectedRoleId(pair.a.id)} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)]">{pair.a.title}</button>
                <span className="text-[var(--text-muted)]">↔</span>
                <button onClick={() => setSelectedRoleId(pair.b.id)} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)]">{pair.b.title}</button>
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">{pair.a.function} · {pair.a.level} | {pair.b.function} · {pair.b.level}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[16px] font-bold font-data" style={{ color: overlapColor }}>{pair.overlap}%</div>
              <div className="text-[11px]" style={{ color: overlapColor }}>{overlapLabel}</div>
            </div>
          </div>;
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--risk)]" />&gt;70% (Duplication)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" />60-70% (Redundancy)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />50-60% (Collaboration)</span>
      </div>
    </Card>}

    {/* ─── SKILL ADJACENCY ─── */}
    {netView === "skills" && <Card title="Skill Adjacency Map">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Roles that share skills are &quot;skill neighbors&quot; — ideal candidates for internal mobility and reskilling pathways.</div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">From Role</th>
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">To Role</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Shared</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Gap</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Move Type</th>
      </tr></thead><tbody>
        {overlapPairs.slice(0, 12).map((pair, i) => {
          const sharedSkills = Math.round(pair.overlap * 0.8);
          const gapSkills = 100 - sharedSkills;
          const moveType = pair.a.level === pair.b.level ? "Lateral" : "Vertical";
          return <tr key={i} className="border-b border-[var(--border)]">
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{pair.a.title}<div className="text-[12px] text-[var(--text-muted)]">{pair.a.function}</div></td>
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{pair.b.title}<div className="text-[12px] text-[var(--text-muted)]">{pair.b.function}</div></td>
            <td className="px-2 py-2 text-center font-bold font-data" style={{ color: sharedSkills >= 70 ? "var(--success)" : "var(--warning)" }}>{sharedSkills}%</td>
            <td className="px-2 py-2 text-center font-data text-[var(--text-muted)]">{gapSkills}%</td>
            <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: moveType === "Lateral" ? "rgba(139,92,246,0.1)" : "rgba(16,185,129,0.1)", color: moveType === "Lateral" ? "var(--purple)" : "var(--success)" }}>{moveType}</span></td>
          </tr>;
        })}
      </tbody></table></div>
    </Card>}

    {/* ─── SUCCESSION RISK ─── */}
    {netView === "succession" && <Card title="Succession Risk Map">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Roles colored by succession risk. Red = no ready successor. Amber = 1 person. Green = 2+ bench depth.</div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Critical Risk", val: jobs.filter(j => j.headcount === 1 && j.track === "Manager").length, color: "var(--risk)", desc: "Manager roles with single incumbent" },
          { label: "Watch List", val: jobs.filter(j => j.headcount <= 2 && j.track === "Manager").length, color: "var(--warning)", desc: "Manager roles with ≤2 people" },
          { label: "Healthy", val: jobs.filter(j => j.headcount > 2 || j.track !== "Manager").length, color: "var(--success)", desc: "Adequate bench depth" },
        ].map(k => <div key={k.label} className="rounded-xl p-4 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[13px] font-bold" style={{ color: k.color }}>{k.label}</div><div className="text-[12px] text-[var(--text-muted)]">{k.desc}</div></div>)}
      </div>
      {/* Risk list */}
      <div className="space-y-2">
        {jobs.filter(j => j.headcount <= 2 && (j.track === "Manager" || j.track === "Executive")).sort((a, b) => a.headcount - b.headcount).slice(0, 12).map(j => {
          const risk = j.headcount === 1 ? "Critical" : "Watch";
          const riskColor = risk === "Critical" ? "var(--risk)" : "var(--warning)";
          return <div key={j.id} className="flex items-center gap-3 rounded-lg p-3 bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: riskColor }} />
            <div className="flex-1"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{j.title}</div><div className="text-[12px] text-[var(--text-muted)]">{j.function} · {j.level} · {j.track}</div></div>
            <div className="text-right"><div className="text-[14px] font-bold" style={{ color: riskColor }}>{j.headcount} incumbent{j.headcount > 1 ? "s" : ""}</div><div className="text-[11px]" style={{ color: riskColor }}>{risk}</div></div>
          </div>;
        })}
      </div>
    </Card>}
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

  const trackColor = (track: string) => track === "Executive" ? "#1A2340" : track === "Manager" ? "#D4860A" : track === "IC" ? "#4A9E6B" : "#C07030";
  const trackBg = (track: string) => track === "Executive" ? "rgba(26,35,64,0.15)" : track === "Manager" ? "rgba(212,134,10,0.12)" : track === "IC" ? "rgba(74,158,107,0.12)" : "rgba(192,112,48,0.12)";
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

  if (loading && !data) return <div className="module-enter"><PageHeader icon="🏗️" title="Job Architecture" subtitle={showLoader ? "Loading job architecture..." : "Enterprise job catalogue, hierarchy, and career framework"} onBack={onBack} />{showLoader && <><LoadingBar /><div className="grid grid-cols-3 gap-4"><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /></div></>}</div>;

  return <div>
    <ContextStrip items={[`${Number(stats.total_headcount || 0).toLocaleString()} employees · ${stats.total_functions || 0} functions · ${stats.total_family_groups || 0} family groups · ${stats.total_families || 0} families · ${stats.total_jobs || 0} roles`]} />
    <PageHeader icon="🏗️" title="Job Architecture" subtitle="Enterprise job catalogue, hierarchy, career framework & validation" onBack={onBack} moduleId="jobarch" viewCtx={viewCtx} />

    {/* KPI Strip */}
    <div className="grid grid-cols-8 gap-3 mb-5">
      <KpiCard label="Headcount" value={Number(stats.total_headcount || 0).toLocaleString()} accent />
      <KpiCard label="Functions" value={stats.total_functions || 0} />
      <KpiCard label="Family Groups" value={stats.total_family_groups || 0} />
      <KpiCard label="Job Families" value={stats.total_families || 0} />
      <KpiCard label="Sub-Families" value={stats.total_sub_families || 0} />
      <KpiCard label="Unique Roles" value={stats.total_jobs || 0} />
      <KpiCard label="Levels" value={stats.total_levels || 0} />
      <KpiCard label="Health" value={`${analytics.health_score || 0}/100`} accent />
    </div>

    <TabBar tabs={[
      { id: "catalogue", label: "📋 Job Catalogue" },
      { id: "orgchart", label: "🏢 Org Chart" },
      { id: "profiles", label: "📄 Job Profiles" },
      { id: "map", label: "🗺️ Architecture Map" },
      { id: "validation", label: "✅ Validation" },
      { id: "analytics", label: "📊 Analytics" },
      { id: "evaluation", label: "⚖️ Job Evaluation" },
      { id: "lattice", label: "🪜 Career Lattice" },
      { id: "jagovernance", label: "🏛️ Governance" },
      { id: "intelligence", label: "🧠 Intelligence" },
      { id: "rolenet", label: "🕸️ Role Network" },
      { id: "compare", label: "🔍 Compare" },
    ]} active={tab} onChange={setTab} />

    {/* ═══ CATALOGUE TAB ═══ */}
    {tab === "catalogue" && <div className="flex gap-4 animate-tab-enter" style={{ minHeight: 600 }}>
      {/* Left tree navigator */}
      <div className="w-56 shrink-0 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-3 overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 font-heading">Hierarchy</div>
        <button onClick={() => setSelectedPath([])} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] font-semibold mb-1 transition-all ${selectedPath.length === 0 ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`}>All ({stats.total_headcount || 0})</button>
        {tree.map(func => <TreeNav key={func.id} node={func} depth={0} selectedPath={selectedPath} onSelect={setSelectedPath} />)}
      </div>

      {/* Main job cards */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 mb-3 text-[15px]">
          {breadcrumbs.map((b, i) => <React.Fragment key={i}>
            {i > 0 && <span className="text-[var(--text-muted)]">›</span>}
            <button onClick={() => setSelectedPath(b.path)} className={`font-semibold ${i === breadcrumbs.length - 1 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>{b.label}</button>
          </React.Fragment>)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search jobs..." className="flex-1 min-w-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
          <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-[15px] text-[var(--text-primary)]">
            <option value="All">All Tracks</option><option value="IC">IC</option><option value="Manager">Manager</option><option value="Executive">Executive</option>
          </select>
          <select value={filterAI} onChange={e => setFilterAI(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-[15px] text-[var(--text-primary)]">
            <option value="All">All AI Impact</option><option value="High">High</option><option value="Moderate">Moderate</option><option value="Low">Low</option>
          </select>
          <div className="flex gap-1">
            {(["level","headcount","ai","alpha"] as const).map(s => <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-1 rounded text-[15px] font-semibold ${sortBy === s ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{s === "level" ? "Level" : s === "headcount" ? "HC" : s === "ai" ? "AI" : "A-Z"}</button>)}
          </div>
        </div>

        {/* Job cards grid */}
        {filteredJobs.length === 0 ? <Empty text="No jobs match your filters — try broadening your search" icon="🔍" /> :
        <div className="grid grid-cols-2 gap-3">
          {filteredJobs.map((j, i) => <div key={j.id} onClick={() => { setSelectedJob(j); setJobProfileTab("content"); }}
            className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 cursor-pointer card-hover hover:border-[var(--accent-primary)]/40 group"
            style={{ animation: `scaleIn 0.2s ease-out ${Math.min(i * 0.02, 0.3)}s both` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text-primary)] font-heading truncate group-hover:text-[var(--accent-primary)] transition-colors">{j.title}</div>
                <div className="text-[15px] text-[var(--text-muted)] mt-0.5">{j.family} › {j.sub_family}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <div className="w-2 h-2 rounded-full" style={{ background: aiDot(j.ai_impact) }} title={`AI Impact: ${j.ai_impact}`} />
                <span className="text-[15px] px-2 py-0.5 rounded-full font-bold font-data" style={{ background: trackBg(j.track), color: trackColor(j.track) }}>{j.level}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[15px]">
              <span className="font-data" style={{ color: trackColor(j.track) }}>{j.track}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="font-data text-[var(--text-secondary)]">{j.headcount} people</span>
              {j.tasks_mapped > 0 && <><span className="text-[var(--text-muted)]">·</span><span className="text-[var(--accent-primary)]">{j.tasks_mapped} tasks</span></>}
            </div>
          </div>)}
        </div>}
        <div className="mt-3 text-[15px] text-[var(--text-muted)] text-center">{filteredJobs.length} of {jobs.length} roles shown</div>
      </div>

      {/* Job profile slide-in panel */}
      {selectedJob && <div className="w-[420px] shrink-0 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-y-auto animate-slide-right" style={{ maxHeight: "70vh" }}>
        <div className="p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface-1)] z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[15px] px-2 py-0.5 rounded-full font-bold font-data" style={{ background: trackBg(selectedJob.track), color: trackColor(selectedJob.track) }}>{selectedJob.level} · {selectedJob.track}</span>
              <div className="w-2 h-2 rounded-full" style={{ background: aiDot(selectedJob.ai_impact) }} />
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">✕</button>
          </div>
          <h3 className="text-[17px] font-bold text-[var(--text-primary)] font-heading">{selectedJob.title}</h3>
          <div className="text-[15px] text-[var(--text-muted)] mt-1">{selectedJob.function} › {selectedJob.family} › {selectedJob.sub_family}</div>
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
                <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[14px] font-bold font-data text-[var(--text-primary)]">{selectedJob.headcount}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Headcount</div></div>
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
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-[22px] font-black font-data" style={{ background: `${aiDot(selectedJob.ai_impact)}15`, color: aiDot(selectedJob.ai_impact), border: `2px solid ${aiDot(selectedJob.ai_impact)}40` }}>{selectedJob.ai_score > 0 ? selectedJob.ai_score.toFixed(0) : "—"}</div>
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
            ]} icon="🤖" />
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
    {tab === "orgchart" && <OrgChartBuilder employees={employees} jobs={jobs} />}

    {/* ═══ JOB PROFILES TAB ═══ */}
    {tab === "profiles" && <JobProfileLibrary jobs={jobs} model={model} />}

    {/* ═══ ARCHITECTURE MAP TAB — strategic mapping workspace ═══ */}
    {tab === "map" && <ArchitectureMapTab tree={tree} jobs={jobs} employees={employees} model={model} />}

    {/* ═══ VALIDATION TAB ═══ */}
    {tab === "validation" && <div className="animate-tab-enter">
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Health Score" value={`${analytics.health_score || 0}/100`} accent />
        <KpiCard label="Critical" value={analytics.critical_flags || 0} />
        <KpiCard label="Warnings" value={analytics.warning_flags || 0} />
        <KpiCard label="Total Flags" value={flags.length} />
      </div>

      <div className="flex gap-2 mb-4">
        {["All", "Structure", "Population", "Career Path", "Risk", "Span of Control"].map(c => <button key={c} onClick={() => setFlagFilter(c)} className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold ${flagFilter === c ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{c}</button>)}
      </div>

      <div className="space-y-3">
        {flags.filter(fl => flagFilter === "All" || fl.category === flagFilter).map((fl, i) => <div key={i} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 card-hover">
          <div className="flex items-start gap-3">
            <div className="text-lg shrink-0">{fl.severity === "critical" ? "🔴" : fl.severity === "warning" ? "🟡" : "🔵"}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[15px] font-semibold text-[var(--text-primary)] font-heading">{fl.title}</span>
                <Badge color={fl.severity === "critical" ? "red" : fl.severity === "warning" ? "amber" : "gray"}>{fl.category}</Badge>
              </div>
              <div className="text-[15px] text-[var(--text-secondary)]">{fl.description}</div>
              <div className="text-[15px] text-[var(--text-muted)] mt-1">Affected: {fl.affected} · Population: {fl.population}</div>
            </div>
          </div>
        </div>)}
        {flags.filter(fl => flagFilter === "All" || fl.category === flagFilter).length === 0 && <Empty text="No flags in this category" icon="✅" />}
      </div>
    </div>}

    {/* ═══ ANALYTICS TAB ═══ */}
    {tab === "analytics" && <div className="animate-tab-enter">
      <div className="grid grid-cols-2 gap-4">
        <Card title="Family Size Distribution">
          <ExpandableChart title="Family Size Distribution">{(() => {
            const famData = ((analytics.family_sizes || []) as {family:string;headcount:number;roles:number}[]).slice(0, 15);
            const totalHC = famData.reduce((s, f) => s + f.headcount, 0);
            const famColors = ["#D4860A","#C07030","#E8C547","#8B6D3F","#D97706","#C98860","#A0734D","#4A9B8E","#9B7EC0","#C76B5A","#6B9E6B","#B8860B","#8B7355","#5F8A8B","#A67B5B"];
            return <ResponsiveContainer width="100%" height={360}>
              <BarChart data={famData} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="family" tick={{ fontSize: 15, fill: "var(--text-muted)" }} angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  const pct = totalHC > 0 ? ((d.headcount / totalHC) * 100).toFixed(1) : "0";
                  return <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", boxShadow: "var(--shadow-3)" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{d.family}</div>
                    <div style={{ fontSize: 15, color: "var(--text-secondary)" }}>{d.headcount.toLocaleString()} employees ({pct}%)</div>
                    <div style={{ fontSize: 15, color: "var(--text-muted)" }}>{d.roles} unique roles</div>
                  </div>;
                }} />
                <defs>{famData.map((_, i) => <linearGradient key={i} id={`famBar${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={famColors[i % famColors.length]} stopOpacity={0.9} /><stop offset="100%" stopColor={famColors[i % famColors.length]} stopOpacity={0.65} /></linearGradient>)}</defs>
                <Bar dataKey="headcount" name="Headcount" radius={[4, 4, 0, 0]}>
                  {famData.map((_, i) => <Cell key={i} fill={`url(#famBar${i})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>;
          })()}</ExpandableChart>
        </Card>

        <Card title="AI Impact Heatmap">
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "High Impact", count: (analytics.ai_impact_summary as Record<string,number>)?.high || 0, color: "var(--risk)", desc: "Significant automation potential" },
              { label: "Moderate", count: (analytics.ai_impact_summary as Record<string,number>)?.moderate || 0, color: "var(--warning)", desc: "Augmentation opportunities" },
              { label: "Low Impact", count: (analytics.ai_impact_summary as Record<string,number>)?.low || 0, color: "var(--success)", desc: "Primarily human-led" },
            ].map(b => <div key={b.label} className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
              <div className="text-[28px] font-extrabold font-data" style={{ color: b.color }}>{b.count}</div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)] mt-1">{b.label}</div>
              <div className="text-[14px] text-[var(--text-muted)] mt-0.5">{b.desc}</div>
            </div>)}
          </div>
        </Card>

        <Card title="Level Distribution">
          <ExpandableChart title="Level Distribution"><ResponsiveContainer width="100%" height={250}>
            <BarChart data={((analytics.level_distribution || []) as {level:string;headcount:number}[])}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="level" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ ...TT }} />
              <Bar dataKey="headcount" fill="#C07030" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></ExpandableChart>
        </Card>

        <Card title="Architecture Completeness">
          <div className="space-y-3 py-4">
            {[{ label: "Jobs with tasks mapped", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.tasks_mapped > 0).length / jobs.length * 100) : 0 },
              { label: "Jobs with headcount", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.headcount > 0).length / jobs.length * 100) : 0 },
              { label: "Families with 3+ roles", pct: (() => { const fams = new Set(jobs.map(j => j.family)); const ok = [...fams].filter(f => jobs.filter(j => j.family === f).length >= 3).length; return fams.size > 0 ? Math.round(ok / fams.size * 100) : 0; })() },
              { label: "Roles with AI scoring", pct: jobs.length > 0 ? Math.round(jobs.filter(j => j.ai_score > 0).length / jobs.length * 100) : 0 },
            ].map(m => <div key={m.label}>
              <div className="flex justify-between text-[15px] mb-1"><span className="text-[var(--text-secondary)]">{m.label}</span><span className="font-bold font-data" style={{ color: m.pct >= 80 ? "var(--success)" : m.pct >= 50 ? "var(--warning)" : "var(--risk)" }}>{m.pct}%</span></div>
              <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.pct >= 80 ? "var(--success)" : m.pct >= 50 ? "var(--warning)" : "var(--risk)" }} /></div>
            </div>)}
          </div>
        </Card>
      </div>
    </div>}

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

    {/* ═══ COMPARE TAB ═══ */}
    {tab === "compare" && <div className="animate-tab-enter">
      {compareJobs.length < 2 ? <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-40">⚖️</div>
          <h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Compare Roles Side by Side</h3>
          <p className="text-[15px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Select 2-4 roles from the Job Catalogue to compare their levels, headcount, AI impact, and skills. Click "Compare" from any job profile panel.</p>
          {compareJobs.length === 1 && <div className="text-[15px] text-[var(--accent-primary)]">1 role selected — add 1 more to compare</div>}
        </div>
      </Card> : <Card title={`Comparing ${compareJobs.length} Roles`}>
        <div className="flex gap-2 mb-4">{compareJobs.map((j, i) => <span key={j.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[15px] bg-[var(--surface-2)] border border-[var(--border)]"><span style={{ color: COLORS[i % COLORS.length] }}>{j.title}</span><button onClick={() => setCompareJobs(p => p.filter(c => c.id !== j.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] ml-1">✕</button></span>)}</div>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
            <th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Dimension</th>
            {compareJobs.map((j, i) => <th key={j.id} className="px-3 py-2 text-center text-[15px] font-semibold border-b border-[var(--border)]" style={{ color: COLORS[i % COLORS.length] }}>{j.title}</th>)}
          </tr></thead>
          <tbody>{[
            { label: "Level", get: (j: Job) => j.level },
            { label: "Track", get: (j: Job) => j.track },
            { label: "Headcount", get: (j: Job) => String(j.headcount) },
            { label: "AI Impact", get: (j: Job) => j.ai_impact },
            { label: "AI Score", get: (j: Job) => j.ai_score > 0 ? j.ai_score.toFixed(1) : "—" },
            { label: "Tasks Mapped", get: (j: Job) => String(j.tasks_mapped) },
            { label: "Family", get: (j: Job) => j.family },
            { label: "Sub-Family", get: (j: Job) => j.sub_family },
          ].map(dim => <tr key={dim.label} className="border-b border-[var(--border)]">
            <td className="px-3 py-2 text-[15px] font-semibold text-[var(--text-secondary)]">{dim.label}</td>
            {compareJobs.map(j => <td key={j.id} className="px-3 py-2 text-center text-[15px] font-data text-[var(--text-primary)]">{dim.get(j)}</td>)}
          </tr>)}</tbody></table>
        </div>
      </Card>}
    </div>}

    <NextStepBar currentModuleId="jobarch" onNavigate={onNavigate || onBack} />
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
