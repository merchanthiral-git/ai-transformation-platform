"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  Plus, Minus as MinusIcon, Maximize2, Minimize2, X, Users, AlertTriangle,
  Check, ExternalLink, Eye, Layers3, Download, Filter,
  MoreHorizontal, ArrowLeft, Sparkles, Star,
} from "@/lib/icons";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { apiFetch } from "../../../lib/api";
import { useOrgChartSync } from "./useOrgChartSync";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface OrgNode {
  id: string; name: string; title: string; level: string; track: string;
  function: string; family: string; sub_family: string; geography: string;
  manager_name: string; direct_report_count: number;
  total_subtree_count: number; layers_below: number;
  children: OrgNode[]; has_children?: boolean; dimmed?: boolean;
  mapping_status?: string; flag_count?: number;
}

interface OrgMeta {
  total_people: number; total_layers: number; median_span: number;
  unmapped_count: number; flagged_count: number; functions: string[];
}

interface SearchResult {
  type: string; id: string; name: string; title: string;
  function: string; level: string; match_field: string; match_confidence: number;
}

interface Props {
  model: string;
  onRoleClick?: (roleTitle: string) => void;
  /** When true, the component is rendered inside the popout page */
  isPopout?: boolean;
  /** Callback to report sync status to popout wrapper */
  onSyncStatus?: (synced: boolean) => void;
}

/* ═══════════════════════════════════════════════════════════════
   FUNCTION COLORS
   ═══════════════════════════════════════════════════════════════ */

const FUNC_COLORS: Record<string, { main: string; light: string; dark: string }> = {
  Technology: { main: "#3B82F6", light: "#EFF6FF", dark: "#1E3A8A" },
  Engineering: { main: "#3B82F6", light: "#EFF6FF", dark: "#1E3A8A" },
  Product: { main: "#8B5CF6", light: "#EEEDFE", dark: "#3C3489" },
  Finance: { main: "#14B8A6", light: "#E1F5EE", dark: "#085041" },
  HR: { main: "#639922", light: "#ECFCCB", dark: "#365314" },
  "Sales & Marketing": { main: "#F97316", light: "#FEF1E8", dark: "#7C2D12" },
  Commercial: { main: "#8B5CF6", light: "#EEEDFE", dark: "#3C3489" },
  Operations: { main: "#F97316", light: "#FEF1E8", dark: "#7C2D12" },
  Legal: { main: "#D4537E", light: "#FBEAF0", dark: "#72243E" },
};

function getFuncColor(func: string) {
  return FUNC_COLORS[func] || { main: "#6B7280", light: "#F3F4F6", dark: "#374151" };
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  wrapper: { display: "flex", flexDirection: "column" as const, height: "calc(100vh - 120px)", overflow: "hidden", position: "relative" as const } as React.CSSProperties,
  toolbar: { display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "#fff", borderBottom: "0.5px solid rgba(28,43,58,0.12)", flexShrink: 0, zIndex: 10 } as React.CSSProperties,
  searchBox: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#F7F5F0", border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 6, width: 240 } as React.CSSProperties,
  searchInput: { flex: 1, background: "transparent", border: "none", color: "#1C2B3A", fontSize: 12, outline: "none" } as React.CSSProperties,
  select: { padding: "6px 10px", fontSize: 12, background: "#fff", border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 6, color: "#1C2B3A", outline: "none" } as React.CSSProperties,
  pill: (active: boolean, color: string) => ({ padding: "4px 12px", fontSize: 11, fontWeight: active ? 600 : 400, border: `1px solid ${active ? color : "rgba(28,43,58,0.15)"}`, borderRadius: 14, background: active ? `${color}12` : "#fff", color: active ? color : "rgba(28,43,58,0.65)", cursor: "pointer" }) as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 11, fontWeight: 500, border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 6, background: "#fff", color: "#1C2B3A", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 6, background: "#1C2B3A", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  metaStats: { display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "#F7F5F0", borderBottom: "0.5px solid rgba(28,43,58,0.08)", fontSize: 11, color: "rgba(28,43,58,0.65)", flexShrink: 0 } as React.CSSProperties,
  canvas: { flex: 1, background: "#F7F5F0", overflow: "hidden", position: "relative" as const, cursor: "grab" } as React.CSSProperties,
  zoomControls: { position: "absolute" as const, bottom: 12, left: 12, display: "flex", alignItems: "center", gap: 2, padding: "4px 6px", background: "#fff", border: "0.5px solid rgba(28,43,58,0.12)", borderRadius: 6, zIndex: 5, fontSize: 11 } as React.CSSProperties,
  minimap: { position: "absolute" as const, bottom: 12, right: 12, width: 200, height: 84, background: "#fff", border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 6, zIndex: 5, padding: 6 } as React.CSSProperties,
  breadcrumb: { position: "absolute" as const, top: 8, left: 8, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#fff", border: "0.5px solid rgba(28,43,58,0.12)", borderRadius: 6, zIndex: 5, fontSize: 11 } as React.CSSProperties,
  searchDropdown: { position: "absolute" as const, top: 44, left: 16, width: 300, maxHeight: 320, background: "#fff", border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20, overflowY: "auto" as const } as React.CSSProperties,
  searchResult: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid rgba(28,43,58,0.06)" } as React.CSSProperties,
  contextMenu: { position: "fixed" as const, background: "#fff", border: "0.5px solid rgba(28,43,58,0.15)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 30, padding: "4px 0", minWidth: 200 } as React.CSSProperties,
  contextItem: { display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", fontSize: 12, color: "#1C2B3A", cursor: "pointer" } as React.CSSProperties,
  emptyState: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(28,43,58,0.4)" } as React.CSSProperties,
  legendItem: { display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   CARD DIMENSIONS
   ═══════════════════════════════════════════════════════════════ */

const CARD_W = 224;
const CARD_H = 78;
const CARD_W_SM = 200;
const CARD_H_SM = 64;
const LAYER_GAP = 100;
const SIBLING_GAP = 14;

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function OrgChart({ model, onRoleClick, isPopout, onSyncStatus }: Props) {
  // Data
  const [rootNode, setRootNode] = useState<OrgNode | null>(null);
  const [meta, setMeta] = useState<OrgMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // View state (NOT synced — per-window)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);

  // Synced state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rootId, setRootId] = useState("");
  const [funcFilter, setFuncFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("");
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Filters
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Popout
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const popoutWindowRef = useRef<Window | null>(null);

  // Phase 4: First-run discovery hint
  const [showHint, setShowHint] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: OrgNode } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Phase 3: BroadcastChannel sync ──
  const syncActions = useMemo(() => ({
    setSelectedId,
    setExpandedIds,
    setFuncFilter,
    setStatusFilter,
    setRootId,
  }), []);

  const { publish, isConnected, peerCount, isRemoteUpdate } = useOrgChartSync(model, syncActions);

  // Publish synced state changes
  useEffect(() => { publish("NODE_SELECTED", selectedId); }, [selectedId, publish]);
  useEffect(() => { publish("NODES_EXPANDED", Array.from(expandedIds)); }, [expandedIds, publish]);
  useEffect(() => { publish("FILTER_CHANGED", Array.from(funcFilter)); }, [funcFilter, publish]);
  useEffect(() => { publish("STATUS_FILTER_CHANGED", statusFilter); }, [statusFilter, publish]);
  useEffect(() => { publish("ROOT_CHANGED", rootId); }, [rootId, publish]);

  // Report sync status to popout wrapper
  useEffect(() => {
    onSyncStatus?.(peerCount > 0);
  }, [peerCount, onSyncStatus]);

  // ── Phase 4: Mode preference persistence ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pref = localStorage.getItem("orgchart_preferred_mode");
    if (pref === "fullscreen" && !isPopout) {
      setIsFullscreen(true);
    }
    // "popout" preference is handled by auto-opening popout below
  }, [isPopout]);

  const saveModePreference = useCallback((mode: "inline" | "fullscreen" | "popout") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orgchart_preferred_mode", mode);
    }
  }, []);

  // ── Phase 4: First-run discovery hint ──
  useEffect(() => {
    if (typeof window === "undefined" || isPopout) return;
    const shown = localStorage.getItem("orgchart_hint_shown");
    if (!shown) {
      setShowHint(true);
      const timer = setTimeout(() => {
        setShowHint(false);
        localStorage.setItem("orgchart_hint_shown", "1");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isPopout]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("orgchart_hint_shown", "1");
    }
  }, []);

  // ── Fetch tree data ──
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ model_id: model, depth: "3" });
      if (rootId) params.set("root", rootId);
      const res = await apiFetch(`/api/v1/org-chart/tree?${params}`);
      const data = await res.json();
      if (data.root) {
        setRootNode(data.root);
        setMeta(data.meta);
        // Auto-expand root + first level
        const ids = new Set<string>();
        ids.add(data.root.id);
        (data.root.children || []).forEach((c: OrgNode) => ids.add(c.id));
        setExpandedIds(ids);
      }
    } catch { /* empty */ }
    setLoading(false);
  }, [model, rootId]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // ── Expand subtree (lazy load) ──
  const expandNode = useCallback(async (nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // ── Search ──
  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/v1/org-chart/search?query=${encodeURIComponent(search)}&model_id=${model}&limit=20`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowSearch(true);
      } catch { /* empty */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [search, model]);

  // ── Build d3 layout from tree ──
  const layoutData = useMemo(() => {
    if (!rootNode) return { nodes: [], links: [] };

    // Filter to expanded nodes only
    function filterExpanded(node: OrgNode, depth: number): any {
      const isExp = expandedIds.has(node.id);
      const children = isExp ? (node.children || []).map((c: OrgNode) => filterExpanded(c, depth + 1)) : [];
      return { ...node, children, _depth: depth };
    }

    const filtered = filterExpanded(rootNode, 0);
    const root = hierarchy(filtered);

    // Compute layout
    const treeLayout = d3tree<any>()
      .nodeSize([CARD_W + SIBLING_GAP, CARD_H + LAYER_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2);

    treeLayout(root);

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
  }, [rootNode, expandedIds]);

  // ── Fit to viewport ──
  const fitToView = useCallback(() => {
    if (!canvasRef.current || layoutData.nodes.length === 0) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const xs = layoutData.nodes.map(n => n.x);
    const ys = layoutData.nodes.map(n => n.y);
    const minX = Math.min(...xs) - CARD_W / 2 - 40;
    const maxX = Math.max(...xs) + CARD_W / 2 + 40;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + CARD_H + 40;
    const treeW = maxX - minX;
    const treeH = maxY - minY;
    const scaleX = width / treeW;
    const scaleY = height / treeH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1);
    setZoom(newZoom);
    setPan({
      x: width / 2 - ((minX + maxX) / 2) * newZoom,
      y: 40 - minY * newZoom,
    });
  }, [layoutData]);

  useEffect(() => { if (!loading && layoutData.nodes.length > 0) fitToView(); }, [loading, layoutData.nodes.length]);

  // ── Pan/zoom handlers ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(z => Math.min(Math.max(z + delta, 0.2), 2));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === svgRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setContextMenu(null);
      setSelectedId(null);
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  // ── Context menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent, node: OrgNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key) {
        case "/": e.preventDefault(); document.getElementById("oc-search")?.focus(); break;
        case "0": fitToView(); break;
        case "=": case "+": setZoom(z => Math.min(z + 0.1, 2)); break;
        case "-": setZoom(z => Math.max(z - 0.1, 0.2)); break;
        case "F":
          if (e.shiftKey) {
            e.preventDefault();
            openPopout();
            saveModePreference("popout");
          } else {
            setIsFullscreen(v => {
              const next = !v;
              saveModePreference(next ? "fullscreen" : "inline");
              return next;
            });
          }
          break;
        case "f":
          setIsFullscreen(v => {
            const next = !v;
            saveModePreference(next ? "fullscreen" : "inline");
            return next;
          });
          break;
        case "Escape":
          if (isFullscreen) { setIsFullscreen(false); saveModePreference("inline"); }
          else { setSelectedId(null); setContextMenu(null); setShowSearch(false); }
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fitToView, isFullscreen, openPopout, saveModePreference]);

  // ── Fullscreen helpers ──
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(v => {
      const next = !v;
      saveModePreference(next ? "fullscreen" : "inline");
      return next;
    });
  }, [saveModePreference]);
  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Re-fit after entering/exiting fullscreen (canvas size changes)
  useEffect(() => { requestAnimationFrame(() => fitToView()); }, [isFullscreen]);

  // ── Popout window ──
  const openPopout = useCallback(() => {
    // If already open and not closed, just focus it
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.focus();
      return;
    }
    const popoutUrl = `/ja/org-chart/popout?model=${encodeURIComponent(model)}`;
    const win = window.open(
      popoutUrl,
      "orgchart_popout",
      "width=1400,height=900,menubar=no,toolbar=no"
    );
    if (win) {
      popoutWindowRef.current = win;
      setIsPopoutOpen(true);
    }
  }, [model]);

  // Poll to detect popout close
  useEffect(() => {
    if (!isPopoutOpen) return;
    const interval = setInterval(() => {
      if (popoutWindowRef.current?.closed) {
        setIsPopoutOpen(false);
        popoutWindowRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPopoutOpen]);

  // ── Render helpers ──
  const initials = (name: string) => name.split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2);

  const renderCard = (node: any, idx: number) => {
    const fc = getFuncColor(node.function);
    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id;
    const isDimmed = funcFilter.size > 0 && !funcFilter.has(node.function);
    const isRoot = node.depth === 0;
    const w = node.depth <= 1 ? CARD_W : CARD_W_SM;
    const h = node.depth <= 1 ? CARD_H : CARD_H_SM;
    const hasChildren = (node.children?.length > 0) || node.has_children;
    const isExpanded = expandedIds.has(node.id);
    const opacity = isDimmed ? 0.2 : 1;

    return (
      <g key={node.id} transform={`translate(${node.x - w / 2},${node.y})`}
        opacity={opacity}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
        onDoubleClick={() => setRootId(node.id)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        style={{ cursor: isDimmed ? "default" : "pointer" }}
        role="treeitem" aria-expanded={isExpanded} aria-level={node.depth + 1}
        aria-label={`${node.name}, ${node.title}, ${node.function}, level ${node.level}, ${node.direct_report_count} direct reports`}
        tabIndex={isDimmed ? -1 : 0}
      >
        {/* Card background */}
        <rect width={w} height={h} rx={8} ry={8}
          fill="#fff"
          stroke={isSelected ? "#3B82F6" : isHovered ? "rgba(28,43,58,0.4)" : "rgba(28,43,58,0.18)"}
          strokeWidth={isSelected ? 1.5 : 0.5}
        />
        {/* Function accent stripe */}
        <rect x={0} y={0} width={4} height={h} rx={2} ry={0}
          fill={isRoot ? "#1C2B3A" : fc.main}
          clipPath={`inset(0 0 0 0 round 8px 0 0 8px)`}
        />
        {/* Clip for left radius */}
        <clipPath id={`clip-${node.id}`}>
          <rect width={4} height={h} rx={2} />
        </clipPath>
        <rect x={0} y={0} width={4} height={h} fill={isRoot ? "#1C2B3A" : fc.main} clipPath={`url(#clip-${node.id})`} />

        {/* Avatar */}
        <circle cx={24} cy={20} r={13} fill={fc.light} />
        <text x={24} y={24} textAnchor="middle" fontSize={9} fontWeight={600} fill={fc.dark}>{initials(node.name)}</text>

        {/* Name */}
        <text x={44} y={18} fontSize={13} fontWeight={500} fill="#1C2B3A">
          {node.name.length > 18 ? node.name.slice(0, 17) + "…" : node.name}
        </text>

        {/* Title */}
        <text x={44} y={32} fontSize={11} fill="rgba(28,43,58,0.65)">
          {node.title.length > 22 ? node.title.slice(0, 21) + "…" : node.title}
        </text>

        {/* Function pill + Level pill */}
        <rect x={44} y={38} width={Math.min(node.function.length * 5.5 + 12, 70)} height={14} rx={2} fill={fc.light} />
        <text x={50} y={49} fontSize={9} fill={fc.dark}>{node.function.slice(0, 10)}</text>
        {node.level && (
          <>
            <rect x={44 + Math.min(node.function.length * 5.5 + 12, 70) + 4} y={38} width={node.level.length * 6 + 10} height={14} rx={2} fill="#F1EFE8" />
            <text x={44 + Math.min(node.function.length * 5.5 + 12, 70) + 9} y={49} fontSize={9} fontWeight={500} fill="#444441">{node.level}</text>
          </>
        )}

        {/* Separator */}
        <line x1={12} y1={56} x2={w - 12} y2={56} stroke="rgba(28,43,58,0.08)" strokeWidth={0.5} />

        {/* Metadata row */}
        <text x={12} y={70} fontSize={10} fill="rgba(28,43,58,0.55)">
          {node.direct_report_count > 0
            ? `${node.total_subtree_count} people · span ${node.direct_report_count}`
            : node.geography || "IC"}
        </text>

        {/* Expand/collapse indicator */}
        {hasChildren && (
          <g transform={`translate(${w - 32}, 4)`}
            onClick={(e) => { e.stopPropagation(); expandNode(node.id); }}
            style={{ cursor: "pointer" }}>
            <rect width={28} height={16} rx={8} fill="#1C2B3A" />
            <text x={7} y={12} fontSize={9} fontWeight={600} fill="#fff">
              {isExpanded ? "▴" : "▾"} {node.direct_report_count || ""}
            </text>
          </g>
        )}

        {/* Focus ring for keyboard */}
        {isSelected && (
          <rect width={w} height={h} rx={8} fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="none" />
        )}
      </g>
    );
  };

  // ── Link rendering ──
  const renderLink = (link: { source: { x: number; y: number }; target: { x: number; y: number } }, idx: number) => {
    const { source, target } = link;
    const midY = source.y + CARD_H + (target.y - source.y - CARD_H) / 2;
    return (
      <path key={idx}
        d={`M${source.x},${source.y + CARD_H} L${source.x},${midY} L${target.x},${midY} L${target.x},${target.y}`}
        fill="none" stroke="rgba(28,43,58,0.25)" strokeWidth={1}
      />
    );
  };

  // Functions list
  const allFunctions = useMemo(() => meta?.functions || [], [meta]);

  // ── Phase 4: Large org performance — count total nodes ──
  const totalNodeCount = useMemo(() => {
    if (!rootNode) return 0;
    function count(n: OrgNode): number {
      return 1 + (n.children || []).reduce((s, c) => s + count(c), 0);
    }
    return count(rootNode);
  }, [rootNode]);

  const showPopoutPlaceholder = isPopoutOpen && totalNodeCount > 5000 && !isPopout;

  if (loading) {
    return (
      <div style={S.wrapper}>
        <div style={S.toolbar}><span style={{ fontSize: 12, color: "rgba(28,43,58,0.5)" }}>Loading org chart…</span></div>
        <div style={{ ...S.canvas, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "rgba(28,43,58,0.3)" }}>
            <Users size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 13 }}>Building organization tree…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div style={S.wrapper}>
        <div style={S.toolbar}><span style={{ fontSize: 12 }}>Org Chart</span></div>
        <div style={S.emptyState}>
          <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2B3A", marginBottom: 4 }}>No employees loaded</div>
          <div style={{ fontSize: 12 }}>Import your employee data to view the org chart.</div>
        </div>
      </div>
    );
  }

  /* ── Search/filter controls (reused in both modes) ── */
  const searchFilterControls = (
    <>
      <div style={{ ...S.searchBox, position: "relative" }}>
        <Search size={12} style={{ color: "rgba(28,43,58,0.4)" }} />
        <input id="oc-search" style={S.searchInput} value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => search.length >= 2 && setShowSearch(true)}
          placeholder="Search employee, role, team" />
        {search && <button title="Clear search" style={{ background: "none", border: "none", color: "rgba(28,43,58,0.4)", cursor: "pointer", padding: 0 }} onClick={() => { setSearch(""); setShowSearch(false); }}><X size={11} /></button>}
      </div>

      {/* Root selector */}
      {rootId && (
        <button style={S.btn} onClick={() => setRootId("")}>
          <ArrowLeft size={11} /> Back to Top
        </button>
      )}

      {/* Function filter */}
      <select style={S.select} value="" onChange={e => {
        const v = e.target.value;
        if (!v) { setFuncFilter(new Set()); return; }
        setFuncFilter(prev => {
          const next = new Set(prev);
          next.has(v) ? next.delete(v) : next.add(v);
          return next;
        });
      }}>
        <option value="">All Functions ({allFunctions.length})</option>
        {allFunctions.map(f => <option key={f} value={f}>{f}{funcFilter.has(f) ? " ✓" : ""}</option>)}
      </select>

      {/* Status pills */}
      {meta && meta.unmapped_count > 0 && (
        <button style={S.pill(statusFilter === "unmapped", "#F97316")}
          onClick={() => setStatusFilter(statusFilter === "unmapped" ? "" : "unmapped")}>
          Unmapped ({meta.unmapped_count})
        </button>
      )}
      {meta && meta.flagged_count > 0 && (
        <button style={S.pill(statusFilter === "flagged", "#DC2626")}
          onClick={() => setStatusFilter(statusFilter === "flagged" ? "" : "flagged")}>
          Flags ({meta.flagged_count})
        </button>
      )}
    </>
  );

  return (
    <div style={{
      ...S.wrapper,
      ...(isFullscreen ? { position: "fixed" as const, inset: 0, zIndex: 50, background: "#F7F5F0", height: "100vh", transition: "all 0.15s ease-in-out" } : { transition: "all 0.15s ease-in-out" }),
    }}>
      {/* ── Fullscreen top bar ── */}
      {isFullscreen && (
        <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 16px", background: "#fff", borderBottom: "0.5px solid rgba(28,43,58,0.12)", flexShrink: 0, zIndex: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2B3A", whiteSpace: "nowrap", marginRight: 16 }}>
            Job Architecture &middot; Org Chart
          </span>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {searchFilterControls}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 16 }}>
            <button style={S.btn} title="Browser Fullscreen" onClick={toggleBrowserFullscreen}><Maximize2 size={11} /></button>
            <button style={S.btn} title="Exit fullscreen (Escape)" onClick={toggleFullscreen}><Minimize2 size={11} /> Exit</button>
          </div>
        </div>
      )}

      {/* ── Phase 4: First-run discovery hint ── */}
      {showHint && !isFullscreen && !isPopout && (
        <div
          onClick={dismissHint}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "6px 16px", background: "#EFF6FF", borderBottom: "0.5px solid rgba(59,130,246,0.2)",
            fontSize: 11, color: "#1E40AF", cursor: "pointer", flexShrink: 0,
          }}
        >
          <span>Tip: Press F for fullscreen or Shift+F to open in a new window</span>
          <X size={10} style={{ opacity: 0.6 }} />
        </div>
      )}

      {/* ── Normal toolbar ── */}
      {!isFullscreen && (
        <div style={S.toolbar}>
          {searchFilterControls}
          <div style={{ flex: 1 }} />
          <button style={S.btn} title="Fit to view" onClick={fitToView}><Maximize2 size={11} /> Fit</button>
          <button style={S.btn} title="Fullscreen (F)" onClick={toggleFullscreen}><Maximize2 size={11} /></button>
          <button style={S.btn} title="Open in new window (Shift+F)" onClick={() => { openPopout(); saveModePreference("popout"); }}><ExternalLink size={11} /></button>
          {isPopoutOpen && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
              <span style={{ fontSize: 11, color: "rgba(28,43,58,0.5)" }}>Popout active</span>
            </span>
          )}
          <button style={S.btnPrimary}><Download size={11} /> Export</button>
        </div>
      )}

      {/* ── Meta-stats row ── */}
      {meta && (
        <div style={S.metaStats}>
          <span>{meta.total_people.toLocaleString()} people · {meta.total_layers} layers · median span {meta.median_span}</span>
          <span style={{ width: 1, height: 16, background: "rgba(28,43,58,0.12)" }} />
          {allFunctions.slice(0, 8).map(f => {
            const fc = getFuncColor(f);
            return (
              <span key={f} style={S.legendItem} onClick={() => setFuncFilter(prev => {
                const next = new Set(prev);
                next.has(f) ? next.delete(f) : next.add(f);
                return next;
              })}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: fc.main, border: funcFilter.has(f) ? "1px solid #1C2B3A" : "none" }} />
                <span style={{ fontSize: 11 }}>{f}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Search dropdown ── */}
      {showSearch && searchResults.length > 0 && (
        <div style={S.searchDropdown}>
          {searchResults.map(r => (
            <div key={r.id} style={S.searchResult}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
              onClick={() => { setRootId(r.id); setShowSearch(false); setSearch(""); }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: getFuncColor(r.function).light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: getFuncColor(r.function).dark, flexShrink: 0 }}>
                {initials(r.name)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1C2B3A" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>{r.title} · {r.function} · {r.level}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 4: Large org popout placeholder ── */}
      {showPopoutPlaceholder && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F5F0" }}>
          <div style={{
            background: "#fff", borderRadius: 10, padding: "32px 48px", textAlign: "center",
            border: "0.5px solid rgba(28,43,58,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2B3A", marginBottom: 8 }}>Chart is in popout window</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={S.btn} onClick={() => popoutWindowRef.current?.focus()}>Focus popout</button>
              <button style={S.btn} onClick={() => {
                popoutWindowRef.current?.close();
                setIsPopoutOpen(false);
                popoutWindowRef.current = null;
              }}>Close popout</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      {!showPopoutPlaceholder && (
      <div ref={canvasRef} style={{ ...S.canvas, cursor: isPanning ? "grabbing" : "grab", ...(isFullscreen ? { height: "calc(100vh - 48px)" } : {}) }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg ref={svgRef}
          width="100%" height="100%"
          style={{ position: "absolute", top: 0, left: 0 }}
          role="tree" aria-label="Organization chart"
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Links */}
            {layoutData.links.map((link, i) => renderLink(link, i))}
            {/* Nodes */}
            {layoutData.nodes.map((node, i) => renderCard(node, i))}
          </g>
        </svg>

        {/* Breadcrumb (when drilled in) */}
        {rootId && rootNode && (
          <div style={S.breadcrumb}>
            <button style={{ background: "none", border: "none", color: "#3B82F6", fontSize: 11, cursor: "pointer" }}
              onClick={() => setRootId("")}>
              Home
            </button>
            <span style={{ color: "rgba(28,43,58,0.4)" }}>›</span>
            <span style={{ fontWeight: 500, color: "#1C2B3A" }}>{rootNode.name}</span>
          </div>
        )}

        {/* Zoom controls */}
        <div style={S.zoomControls}>
          <button title="Zoom in" style={{ ...S.btn, padding: "2px 6px" }} onClick={() => setZoom(z => Math.min(z + 0.1, 2))}><Plus size={12} /></button>
          <button title="Zoom out" style={{ ...S.btn, padding: "2px 6px" }} onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))}><MinusIcon size={12} /></button>
          <span style={{ padding: "0 6px", fontFamily: "var(--ff-mono)", fontSize: 11, color: "rgba(28,43,58,0.55)", minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button title="Fit to view" style={{ ...S.btn, padding: "2px 6px" }} onClick={fitToView}><Maximize2 size={11} /></button>
          <button style={{ ...S.btn, padding: "2px 6px", color: showMinimap ? "#3B82F6" : "rgba(28,43,58,0.4)" }}
            onClick={() => setShowMinimap(v => !v)}>Map</button>
        </div>

        {/* Minimap */}
        {showMinimap && layoutData.nodes.length > 3 && (
          <div style={S.minimap}>
            <svg width="188" height="72" style={{ background: "#F7F5F0", borderRadius: 3 }}>
              {layoutData.nodes.map((n, i) => {
                const xs = layoutData.nodes.map(nn => nn.x);
                const ys = layoutData.nodes.map(nn => nn.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const scaleX = 180 / Math.max(maxX - minX + CARD_W, 1);
                const scaleY = 64 / Math.max(maxY - minY + CARD_H, 1);
                const sc = Math.min(scaleX, scaleY);
                const mx = (n.x - minX) * sc + 4;
                const my = (n.y - minY) * sc + 4;
                const fc = getFuncColor(n.function);
                return <rect key={i} x={mx} y={my} width={Math.max(10 * sc, 3)} height={Math.max(6 * sc, 2)} rx={1} fill={fc.main} opacity={0.6} />;
              })}
            </svg>
          </div>
        )}
      </div>
      )}

      {/* ── Context menu ── */}
      {contextMenu && (
        <div style={{ ...S.contextMenu, left: contextMenu.x, top: contextMenu.y }}>
          {[
            { label: "Open role detail", icon: <Eye size={12} />, action: () => onRoleClick?.(contextMenu.node.title) },
            { label: "Isolate subtree", icon: <Layers3 size={12} />, action: () => setRootId(contextMenu.node.id) },
            { label: "Expand subtree", icon: <ChevronDown size={12} />, action: () => expandNode(contextMenu.node.id) },
            { label: "Show in grid view", icon: <ExternalLink size={12} />, action: () => onRoleClick?.(contextMenu.node.title) },
          ].map((item, i) => (
            <div key={i} style={S.contextItem}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
              onClick={(e) => { e.stopPropagation(); item.action(); setContextMenu(null); }}>
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
