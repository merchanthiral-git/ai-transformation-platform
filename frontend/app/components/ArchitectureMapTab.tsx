"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, Empty, Badge, showToast, COLORS, TT, AiJobSuggestButton, AiJobSuggestion } from "./shared";
/* recharts not needed — using custom visualizations */
import * as api from "../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type TreeNode = { id: string; label: string; type: string; children?: TreeNode[]; headcount: number };
type Job = { id: string; title: string; level: string; track: string; function: string; family: string; sub_family: string; headcount: number; ai_score: number; ai_impact: string; tasks_mapped: number };
type Employee = {
  id: string; name: string; title: string; function: string; family: string; sub_family: string;
  track: string; level: string; geography: string; manager: string; tenure: number;
  performance: string; flight_risk: string; ai_score: number; skills: string[];
  single_incumbent: boolean; redeployment_candidate: boolean;
};

/* Future-state node — extends tree node with edit metadata */
type FutureNode = {
  id: string; label: string; type: string; children?: FutureNode[]; headcount: number;
  sunset?: boolean; sunsetDate?: string; isNew?: boolean; merged?: string[];
  employeeIds?: string[];
};

type Mapping = {
  id: string; fromId: string; toId: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "new" | "sunset";
  note: string;
};

type HistoryEntry = { label: string; tree: FutureNode[]; mappings: Mapping[] };

type SavedVersion = {
  id: string; name: string; description: string; tree: FutureNode[];
  mappings: Mapping[]; recommended: boolean; model_id?: string;
};

/* Color metric options */
type ColorMetric = "headcount" | "ai_impact" | "tenure_risk" | "vacancy";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

const TC = ["#D4860A", "#C07030", "#E8C547", "#A0522D", "#B8602A", "#D97706", "#8B6914", "#6B8E6B"];
const trackColor = (t: string) => t === "Executive" ? "#1A2340" : t === "Manager" ? "#D4860A" : t === "IC" ? "#4A9E6B" : "#C07030";
const trackBg = (t: string) => t === "Executive" ? "rgba(26,35,64,0.15)" : t === "Manager" ? "rgba(212,134,10,0.12)" : "rgba(74,158,107,0.12)";
const aiDot = (impact: string) => impact === "High" ? "var(--risk)" : impact === "Moderate" ? "var(--warning)" : "var(--success)";

function deepCloneTree(nodes: TreeNode[]): FutureNode[] {
  return nodes.map(n => ({
    id: n.id + "_future",
    label: n.label,
    type: n.type,
    headcount: n.headcount,
    children: n.children ? deepCloneTree(n.children) : undefined,
  }));
}

function countNodesRecursive(nodes: FutureNode[]): number {
  let c = 0;
  for (const n of nodes) {
    c++;
    if (n.children) c += countNodesRecursive(n.children);
  }
  return c;
}

function findNodeById(nodes: FutureNode[], id: string): FutureNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeNodeById(nodes: FutureNode[], id: string): FutureNode[] {
  return nodes.filter(n => {
    if (n.id === id) return false;
    if (n.children) n.children = removeNodeById(n.children, id);
    return true;
  });
}

function flattenJobs(nodes: TreeNode[]): { id: string; label: string; headcount: number; parentLabel: string }[] {
  const result: { id: string; label: string; headcount: number; parentLabel: string }[] = [];
  function walk(ns: TreeNode[], parent: string) {
    for (const n of ns) {
      if (n.type === "job") result.push({ id: n.id, label: n.label, headcount: n.headcount, parentLabel: parent });
      if (n.children) walk(n.children, n.label);
    }
  }
  walk(nodes, "");
  return result;
}

function getNodeColor(node: TreeNode, metric: ColorMetric, jobs: Job[], employees: Employee[]): string {
  if (metric === "headcount") {
    if (node.headcount > 50) return "#D4860A";
    if (node.headcount > 20) return "#E8C547";
    if (node.headcount > 5) return "#4A9E6B";
    return "#6B8E6B";
  }
  if (metric === "ai_impact") {
    const nodeJobs = jobs.filter(j => j.function === node.label || j.family === node.label || j.sub_family === node.label);
    const avgAi = nodeJobs.length > 0 ? nodeJobs.reduce((s, j) => s + j.ai_score, 0) / nodeJobs.length : 0;
    if (avgAi >= 6) return "var(--risk)";
    if (avgAi >= 3) return "var(--warning)";
    return "var(--success)";
  }
  if (metric === "tenure_risk") {
    const nodeEmps = employees.filter(e => e.function === node.label || e.family === node.label || e.sub_family === node.label);
    const avgTenure = nodeEmps.length > 0 ? nodeEmps.reduce((s, e) => s + e.tenure, 0) / nodeEmps.length : 5;
    if (avgTenure < 2) return "var(--risk)";
    if (avgTenure > 8) return "var(--warning)";
    return "var(--success)";
  }
  // vacancy — simplified
  if (node.headcount === 0) return "var(--risk)";
  return "var(--success)";
}

let _nextId = 0;
function genId() { return `new_${Date.now()}_${_nextId++}`; }

/* ═══════════════════════════════════════════════════════════════
   CURRENT STATE TREE (expandable, like org-chart meets file explorer)
   ═══════════════════════════════════════════════════════════════ */

function CurrentStateNode({ node, depth, jobs, employees, colorMetric, expanded, onToggle, selected, onSelect, onDrillEmployee }: {
  node: TreeNode; depth: number; jobs: Job[]; employees: Employee[]; colorMetric: ColorMetric;
  expanded: Set<string>; onToggle: (id: string) => void;
  selected: string | null; onSelect: (id: string) => void;
  onDrillEmployee: (title: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const hasChildren = (node.children?.length || 0) > 0;
  const nodeColor = getNodeColor(node, colorMetric, jobs, employees);

  // Risk flags for this node
  const nodeJobs = jobs.filter(j =>
    (node.type === "function" && j.function === node.label) ||
    (node.type === "job_family" && j.family === node.label) ||
    (node.type === "sub_family" && j.sub_family === node.label) ||
    (node.type === "job" && j.title === node.label)
  );
  const nodeEmps = employees.filter(e =>
    (node.type === "function" && e.function === node.label) ||
    (node.type === "job_family" && e.family === node.label) ||
    (node.type === "sub_family" && e.sub_family === node.label) ||
    (node.type === "job" && e.title === node.label)
  );
  const singleIncumbent = node.type === "job" && node.headcount === 1;
  const highTurnover = nodeEmps.length > 3 && nodeEmps.filter(e => e.tenure < 1.5).length / nodeEmps.length > 0.3;
  const avgAi = nodeJobs.length > 0 ? nodeJobs.reduce((s, j) => s + j.ai_score, 0) / nodeJobs.length : 0;

  return <div style={{ paddingLeft: depth * 16 }}>
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all group
        ${isSelected ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30" : "hover:bg-[var(--hover)] border border-transparent"}`}
      onClick={() => { onSelect(node.id); if (hasChildren) onToggle(node.id); }}
      draggable={node.type === "job"}
      onDragStart={e => { e.dataTransfer.setData("text/plain", JSON.stringify({ id: node.id, label: node.label, type: "current" })); }}
    >
      {/* Expand toggle */}
      {hasChildren ? (
        <span className="text-[8px] text-[var(--text-muted)] w-3 text-center" style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)`, transition: "transform 0.15s", display: "inline-block" }}>▸</span>
      ) : <span className="w-3" />}

      {/* Color indicator */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nodeColor }} />

      {/* Label */}
      <span className="flex-1 truncate font-semibold text-[var(--text-primary)]">{node.label}</span>

      {/* Risk flags */}
      {singleIncumbent && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold shrink-0">1P</span>}
      {highTurnover && <span className="text-[8px] px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold shrink-0">HT</span>}
      {avgAi >= 6 && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold shrink-0">AI</span>}

      {/* Metadata */}
      <span className="text-[9px] font-data text-[var(--text-muted)] shrink-0">{node.headcount}</span>
    </div>

    {/* Expanded children */}
    {isExpanded && hasChildren && <div>
      {node.children!.map(child => <CurrentStateNode key={child.id} node={child} depth={depth + 1}
        jobs={jobs} employees={employees} colorMetric={colorMetric}
        expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect}
        onDrillEmployee={onDrillEmployee} />)}
    </div>}

    {/* At job level, show employee drill-down button */}
    {isExpanded && node.type === "job" && nodeEmps.length > 0 && (
      <div style={{ paddingLeft: (depth + 1) * 16 }}>
        <button onClick={() => onDrillEmployee(node.label)} className="text-[10px] text-[var(--accent-primary)] hover:underline mt-0.5 mb-1">
          View {nodeEmps.length} employee{nodeEmps.length !== 1 ? "s" : ""} →
        </button>
      </div>
    )}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   FUTURE STATE TREE (editable with right-click context menu)
   ═══════════════════════════════════════════════════════════════ */

function FutureStateNode({ node, depth, onRename, onDelete, onAddChild, onSunset, onSplit, selected, onSelect, onDrop, onAiSuggest }: {
  node: FutureNode; depth: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type: string) => void;
  onSunset: (id: string) => void;
  onSplit: (id: string) => void;
  selected: string | null; onSelect: (id: string) => void;
  onDrop: (targetId: string, data: string) => void;
  onAiSuggest?: (nodeId: string, data: AiJobSuggestion) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const [showCtx, setShowCtx] = useState(false);
  const hasChildren = (node.children?.length || 0) > 0;
  const isSelected = selected === node.id;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCtx(!showCtx);
  };

  const childType = node.type === "function" ? "job_family" : node.type === "job_family" ? "sub_family" : "job";

  return <div style={{ paddingLeft: depth * 16 }} className="relative">
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all group
        ${isSelected ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30" : "hover:bg-[var(--hover)] border border-transparent"}
        ${node.sunset ? "opacity-50" : ""}`}
      onClick={() => { onSelect(node.id); if (hasChildren) setIsExpanded(!isExpanded); }}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => { setIsEditing(true); setEditValue(node.label); }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onDrop(node.id, e.dataTransfer.getData("text/plain")); }}
      draggable={node.type === "job"}
      onDragStart={e => { e.dataTransfer.setData("text/plain", JSON.stringify({ id: node.id, label: node.label, type: "future" })); }}
    >
      {hasChildren ? (
        <span className="text-[8px] text-[var(--text-muted)] w-3 text-center" style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)`, transition: "transform 0.15s", display: "inline-block" }}>▸</span>
      ) : <span className="w-3" />}

      {node.isNew && <span className="text-[7px] px-1 py-0.5 rounded bg-green-500/15 text-green-400 font-bold shrink-0">NEW</span>}

      {isEditing ? (
        <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
          onBlur={() => { setIsEditing(false); if (editValue.trim()) onRename(node.id, editValue.trim()); }}
          onKeyDown={e => { if (e.key === "Enter") { setIsEditing(false); if (editValue.trim()) onRename(node.id, editValue.trim()); } if (e.key === "Escape") setIsEditing(false); }}
          className="flex-1 bg-[var(--surface-2)] border border-[var(--accent-primary)] rounded px-1 py-0.5 text-[11px] text-[var(--text-primary)] outline-none min-w-0"
          onClick={e => e.stopPropagation()} />
      ) : (
        <span className={`flex-1 truncate font-semibold ${node.sunset ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>{node.label}</span>
      )}

      {node.sunset && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold shrink-0">SUNSET</span>}
      {node.merged && node.merged.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold shrink-0">MERGED</span>}

      <span className="text-[9px] font-data text-[var(--text-muted)] shrink-0">{node.headcount}</span>

      {/* Add child button */}
      {node.type !== "job" && (
        <button onClick={e => { e.stopPropagation(); onAddChild(node.id, childType); setIsExpanded(true); }}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-all shrink-0 w-4 text-center">+</button>
      )}
    </div>

    {/* Auto-suggest button for new job nodes */}
    {node.type === "job" && node.isNew && node.label !== "New Role" && onAiSuggest && (
      <div style={{ paddingLeft: (depth + 1) * 16 }} className="py-0.5">
        <AiJobSuggestButton title={node.label} compact onAccept={d => onAiSuggest(node.id, d)} />
      </div>
    )}

    {/* Context menu */}
    {showCtx && <div className="absolute left-8 top-8 z-50 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-36 text-[11px]"
      onMouseLeave={() => setShowCtx(false)}>
      <button onClick={() => { setShowCtx(false); setIsEditing(true); setEditValue(node.label); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--hover)] text-[var(--text-secondary)]">Rename</button>
      {node.type !== "job" && <button onClick={() => { setShowCtx(false); onAddChild(node.id, childType); setIsExpanded(true); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--hover)] text-[var(--text-secondary)]">Add {childType.replace("_", " ")}</button>}
      {node.type === "job" && <button onClick={() => { setShowCtx(false); onSplit(node.id); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--hover)] text-[var(--text-secondary)]">Split role</button>}
      {node.type === "job" && onAiSuggest && node.label !== "New Role" && <>
        <div className="border-t border-[var(--border)] my-1" />
        <div className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
          <AiJobSuggestButton title={node.label} compact onAccept={d => { setShowCtx(false); onAiSuggest(node.id, d); }} />
        </div>
      </>}
      <button onClick={() => { setShowCtx(false); onSunset(node.id); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--hover)] text-orange-400">
        {node.sunset ? "Remove sunset" : "Sunset"}</button>
      <div className="border-t border-[var(--border)] my-1" />
      <button onClick={() => { setShowCtx(false); onDelete(node.id); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--hover)] text-red-400">Delete</button>
    </div>}

    {isExpanded && hasChildren && <div>
      {node.children!.map(child => <FutureStateNode key={child.id} node={child} depth={depth + 1}
        onRename={onRename} onDelete={onDelete} onAddChild={onAddChild} onSunset={onSunset}
        onSplit={onSplit} selected={selected} onSelect={onSelect} onDrop={onDrop} onAiSuggest={onAiSuggest} />)}
    </div>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MAPPING CONNECTORS (SVG lines between current and future state)
   ═══════════════════════════════════════════════════════════════ */

function MappingLine({ mapping, index }: { mapping: Mapping; index: number }) {
  const lineStyle = (() => {
    switch (mapping.type) {
      case "one-to-one": return { stroke: "#4A9E6B", strokeDasharray: "none" };
      case "one-to-many": return { stroke: "#3B82F6", strokeDasharray: "6 4" };
      case "many-to-one": return { stroke: "#F59E0B", strokeDasharray: "6 4" };
      case "new": return { stroke: "#4A9E6B", strokeDasharray: "none" };
      case "sunset": return { stroke: "#EF4444", strokeDasharray: "4 4" };
      default: return { stroke: "#666", strokeDasharray: "none" };
    }
  })();

  return <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--hover)] text-[10px] group" title={mapping.note || "No note"}>
    <div className="w-3 h-0.5 rounded" style={{ background: lineStyle.stroke }} />
    <span className="text-[var(--text-muted)] truncate flex-1">
      {mapping.fromId.replace("_future", "")} → {mapping.toId.replace("_future", "")}
    </span>
    {mapping.type === "new" && <span className="text-[8px] px-1 rounded bg-green-500/15 text-green-400 font-bold">NEW</span>}
    {mapping.type === "sunset" && <span className="text-[8px] px-1 rounded bg-red-500/10 text-red-400 font-bold line-through">END</span>}
    <span className="text-[8px] text-[var(--text-muted)]">{mapping.type.replace("-", "→")}</span>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   EMPLOYEE REMAPPING TABLE
   ═══════════════════════════════════════════════════════════════ */

function EmployeeTable({ employees, title, futureTree, onClose }: {
  employees: Employee[]; title: string; futureTree: FutureNode[]; onClose: () => void;
}) {
  const futureJobs = useMemo(() => flattenJobs(futureTree as unknown as TreeNode[]), [futureTree]);

  return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Employees in: {title}</h4>
      <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">✕</button>
    </div>

    {employees.length === 0 ? <Empty text="No employees in this role" icon="👤" /> :
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-[11px]">
        <thead><tr className="bg-[var(--surface-2)]">
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Name</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Level</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Tenure</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Skills</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Performance</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Flight Risk</th>
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase">Redeployment</th>
        </tr></thead>
        <tbody>{employees.map(e => {
          const perfColor = e.performance === "Exceeds" ? "var(--success)" : e.performance === "Developing" ? "var(--risk)" : "var(--text-secondary)";
          const riskColor = e.flight_risk === "High" ? "var(--risk)" : e.flight_risk === "Medium" ? "var(--warning)" : "var(--success)";
          return <tr key={e.id} className="border-t border-[var(--border)] hover:bg-[var(--hover)]"
            draggable onDragStart={ev => { ev.dataTransfer.setData("text/plain", JSON.stringify({ id: e.id, label: e.name, type: "employee" })); }}>
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{e.name}</td>
            <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded-full font-bold font-data" style={{ background: trackBg(e.track), color: trackColor(e.track) }}>{e.level}</span></td>
            <td className="px-3 py-2 font-data">{e.tenure}y</td>
            <td className="px-3 py-2"><div className="flex gap-1 flex-wrap">{e.skills.map(s => <span key={s} className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-[9px]">{s}</span>)}</div></td>
            <td className="px-3 py-2 font-semibold" style={{ color: perfColor }}>{e.performance}</td>
            <td className="px-3 py-2 font-semibold" style={{ color: riskColor }}>{e.flight_risk}</td>
            <td className="px-3 py-2">{e.redeployment_candidate ? <span className="text-[var(--accent-primary)] font-bold">Candidate</span> : <span className="text-[var(--text-muted)]">—</span>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}

    {/* People Impact Summary */}
    <div className="grid grid-cols-4 gap-3 mt-3">
      <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center">
        <div className="text-[16px] font-bold font-data text-[var(--text-primary)]">{employees.length}</div>
        <div className="text-[8px] text-[var(--text-muted)] uppercase">Total</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center">
        <div className="text-[16px] font-bold font-data text-[var(--accent-primary)]">{employees.filter(e => e.redeployment_candidate).length}</div>
        <div className="text-[8px] text-[var(--text-muted)] uppercase">Redeployable</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center">
        <div className="text-[16px] font-bold font-data" style={{ color: "var(--risk)" }}>{employees.filter(e => e.flight_risk === "High").length}</div>
        <div className="text-[8px] text-[var(--text-muted)] uppercase">Flight Risk</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center">
        <div className="text-[16px] font-bold font-data" style={{ color: "var(--warning)" }}>{employees.filter(e => e.single_incumbent).length}</div>
        <div className="text-[8px] text-[var(--text-muted)] uppercase">Single Incumbent</div>
      </div>
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   IMPACT DASHBOARD (bottom panel)
   ═══════════════════════════════════════════════════════════════ */

function ImpactDashboard({ currentTree, futureTree, mappings, jobs, employees, changeLog, collapsed, onToggle }: {
  currentTree: TreeNode[]; futureTree: FutureNode[]; mappings: Mapping[];
  jobs: Job[]; employees: Employee[]; changeLog: string[];
  collapsed: boolean; onToggle: () => void;
}) {
  const currentJobCount = flattenJobs(currentTree).length;
  const futureJobs = flattenJobs(futureTree as unknown as TreeNode[]);
  const futureJobCount = futureJobs.length;
  const addedCount = futureTree.reduce(function countNew(acc: number, n: FutureNode): number {
    let c = acc + (n.isNew ? 1 : 0);
    if (n.children) n.children.forEach(ch => { c = countNew(c, ch); });
    return c;
  }, 0);
  const sunsetCount = futureTree.reduce(function countSunset(acc: number, n: FutureNode): number {
    let c = acc + (n.sunset ? 1 : 0);
    if (n.children) n.children.forEach(ch => { c = countSunset(c, ch); });
    return c;
  }, 0);
  const modifiedCount = mappings.length;
  const netDelta = futureJobCount - currentJobCount;
  const affectedPeople = mappings.reduce((s, m) => {
    const job = jobs.find(j => j.title === m.fromId || j.title === m.fromId.replace("_future", ""));
    return s + (job?.headcount || 0);
  }, 0);

  return <div className="mt-4">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-t-xl text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--hover)]">
      <span>Impact Dashboard</span>
      <span className="text-[var(--text-muted)]">{collapsed ? "▸ Show" : "▾ Hide"}</span>
    </button>
    {!collapsed && <div className="bg-[var(--surface-1)] border border-[var(--border)] border-t-0 rounded-b-xl p-4">
      <div className="grid grid-cols-6 gap-3 mb-4">
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className="text-[20px] font-bold font-data text-green-400">+{addedCount}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">Roles Added</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className="text-[20px] font-bold font-data text-red-400">{sunsetCount}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">Roles Sunset</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className="text-[20px] font-bold font-data text-blue-400">{modifiedCount}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">Mappings</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className="text-[20px] font-bold font-data text-[var(--accent-primary)]">{affectedPeople}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">People Affected</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className={`text-[20px] font-bold font-data ${netDelta > 0 ? "text-green-400" : netDelta < 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
            {netDelta > 0 ? `+${netDelta}` : netDelta}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">Net HC Delta</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-lg p-3 text-center">
          <div className="text-[20px] font-bold font-data text-purple-400">{employees.filter(e => e.redeployment_candidate).length}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">Reskill Needed</div>
        </div>
      </div>

      {/* What Changed log */}
      {changeLog.length > 0 && <div>
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">What Changed</div>
        <div className="max-h-32 overflow-y-auto space-y-1 bg-[var(--surface-2)] rounded-lg p-2">
          {changeLog.slice(-20).reverse().map((entry, i) => (
            <div key={i} className="text-[10px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <span className="text-[var(--text-muted)] shrink-0">•</span>
              <span>{entry}</span>
            </div>
          ))}
        </div>
      </div>}
    </div>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   SAVE / COMPARE PANEL
   ═══════════════════════════════════════════════════════════════ */

function SaveComparePanel({ model, futureTree, mappings, versions, onRefreshVersions, onLoadVersion }: {
  model: string; futureTree: FutureNode[]; mappings: Mapping[];
  versions: SavedVersion[];
  onRefreshVersions: () => void;
  onLoadVersion: (v: SavedVersion) => void;
}) {
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [comparing, setComparing] = useState<[string, string] | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    await api.saveArchVersion(model, {
      name: name.trim(), description: desc.trim(),
      tree: futureTree, mappings, recommended: false,
    });
    showToast(`Saved version: ${name}`);
    setShowSave(false);
    setName("");
    setDesc("");
    onRefreshVersions();
  };

  const handleRecommend = async (vid: string) => {
    await api.toggleArchRecommend(model, vid);
    onRefreshVersions();
  };

  const handleDelete = async (vid: string) => {
    await api.deleteArchVersion(model, vid);
    onRefreshVersions();
  };

  return <div className="mt-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[13px] font-bold font-heading text-[var(--text-primary)]">Save & Compare Versions</h4>
      <button onClick={() => setShowSave(!showSave)}
        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)] text-white hover:brightness-110 transition-all">
        Save Current State
      </button>
    </div>

    {showSave && <div className="mb-4 p-3 bg-[var(--surface-2)] rounded-lg space-y-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Version name..."
        className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]" />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)..."
        className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]" />
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)] text-white">Save</button>
        <button onClick={() => setShowSave(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
      </div>
    </div>}

    {versions.length === 0 ? <div className="text-[11px] text-[var(--text-muted)] text-center py-4">No saved versions yet. Design a future state and save it.</div> :
    <div className="space-y-2">
      {versions.map(v => (
        <div key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border ${v.recommended ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5" : "border-[var(--border)]"} hover:bg-[var(--hover)]`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">{v.name}</span>
              {v.recommended && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">RECOMMENDED</span>}
            </div>
            {v.description && <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{v.description}</div>}
          </div>
          <button onClick={() => onLoadVersion(v)} className="text-[10px] text-[var(--accent-primary)] hover:underline shrink-0">Load</button>
          <button onClick={() => handleRecommend(v.id)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0">{v.recommended ? "Unrecommend" : "Recommend"}</button>
          <button onClick={() => handleDelete(v.id)} className="text-[10px] text-[var(--text-muted)] hover:text-red-400 shrink-0">Delete</button>
        </div>
      ))}
    </div>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT: ARCHITECTURE MAP TAB
   ═══════════════════════════════════════════════════════════════ */

export function ArchitectureMapTab({ tree, jobs, employees, model }: {
  tree: TreeNode[]; jobs: Job[]; employees: Employee[]; model: string;
}) {
  // ── State ──
  const [futureTree, setFutureTree] = useState<FutureNode[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [colorMetric, setColorMetric] = useState<ColorMetric>("headcount");
  const [currentExpanded, setCurrentExpanded] = useState<Set<string>>(new Set(tree.map(t => t.id)));
  const [currentSelected, setCurrentSelected] = useState<string | null>(null);
  const [futureSelected, setFutureSelected] = useState<string | null>(null);
  const [mappingMode, setMappingMode] = useState(false);
  const [mappingFrom, setMappingFrom] = useState<string | null>(null);
  const [employeeDrill, setEmployeeDrill] = useState<string | null>(null);
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [versions, setVersions] = useState<SavedVersion[]>([]);

  // Initialize future state from current
  useEffect(() => {
    if (tree.length > 0 && futureTree.length === 0) {
      const ft = deepCloneTree(tree);
      setFutureTree(ft);
      pushHistory("Initial state", ft, []);
    }
  }, [tree]);

  // Load saved versions
  const refreshVersions = useCallback(async () => {
    const res = await api.getArchVersions(model);
    setVersions((res.versions || []) as SavedVersion[]);
  }, [model]);

  useEffect(() => { refreshVersions(); }, [refreshVersions]);

  // ── History management (undo/redo) ──
  const pushHistory = useCallback((label: string, newTree: FutureNode[], newMappings: Mapping[]) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIdx + 1);
      return [...truncated, { label, tree: JSON.parse(JSON.stringify(newTree)), mappings: JSON.parse(JSON.stringify(newMappings)) }];
    });
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setFutureTree(JSON.parse(JSON.stringify(prev.tree)));
    setMappings(JSON.parse(JSON.stringify(prev.mappings)));
    setHistoryIdx(i => i - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setFutureTree(JSON.parse(JSON.stringify(next.tree)));
    setMappings(JSON.parse(JSON.stringify(next.mappings)));
    setHistoryIdx(i => i + 1);
  }, [history, historyIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Future state mutation helpers ──
  const mutate = useCallback((label: string, fn: (tree: FutureNode[]) => FutureNode[], mappingsFn?: (m: Mapping[]) => Mapping[]) => {
    setFutureTree(prev => {
      const newTree = fn(JSON.parse(JSON.stringify(prev)));
      const newMappings = mappingsFn ? mappingsFn(JSON.parse(JSON.stringify(mappings))) : mappings;
      if (mappingsFn) setMappings(newMappings);
      pushHistory(label, newTree, newMappings);
      setChangeLog(prev => [...prev, label]);
      return newTree;
    });
  }, [mappings, pushHistory]);

  const handleRename = useCallback((id: string, name: string) => {
    mutate(`Renamed to "${name}"`, tree => {
      const node = findNodeById(tree, id);
      if (node) node.label = name;
      return tree;
    });
  }, [mutate]);

  const handleDelete = useCallback((id: string) => {
    mutate(`Deleted node`, tree => removeNodeById(tree, id));
  }, [mutate]);

  const handleAddChild = useCallback((parentId: string, type: string) => {
    const newId = genId();
    const label = type === "job_family" ? "New Job Family" : type === "sub_family" ? "New Sub-Family" : "New Role";
    mutate(`Added ${label}`, tree => {
      const parent = findNodeById(tree, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push({ id: newId, label, type, headcount: 0, isNew: true, children: type !== "job" ? [] : undefined });
      }
      return tree;
    });
  }, [mutate]);

  const handleSunset = useCallback((id: string) => {
    mutate(`Toggled sunset`, tree => {
      const node = findNodeById(tree, id);
      if (node) node.sunset = !node.sunset;
      return tree;
    });
  }, [mutate]);

  const handleSplit = useCallback((id: string) => {
    mutate(`Split role`, tree => {
      const node = findNodeById(tree, id);
      if (!node) return tree;
      // Find parent to add sibling
      function findParent(nodes: FutureNode[], targetId: string): FutureNode | null {
        for (const n of nodes) {
          if (n.children?.some(c => c.id === targetId)) return n;
          if (n.children) { const found = findParent(n.children, targetId); if (found) return found; }
        }
        return null;
      }
      const parent = findParent(tree, id);
      if (parent && parent.children) {
        const splitHC = Math.floor(node.headcount / 2);
        node.headcount = node.headcount - splitHC;
        parent.children.push({
          id: genId(),
          label: `${node.label} (Split)`,
          type: node.type,
          headcount: splitHC,
          isNew: true,
        });
      }
      return tree;
    });
  }, [mutate]);

  const handleFutureDrop = useCallback((targetId: string, dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      if (data.type === "future") {
        // Move a future node under a new parent
        mutate(`Moved "${data.label}" to new parent`, tree => {
          const node = findNodeById(tree, data.id);
          if (!node) return tree;
          const nodeCopy = JSON.parse(JSON.stringify(node));
          const cleaned = removeNodeById(tree, data.id);
          const target = findNodeById(cleaned, targetId);
          if (target) {
            if (!target.children) target.children = [];
            target.children.push(nodeCopy);
          }
          return cleaned;
        });
      } else if (data.type === "current") {
        // Merge current state role into future role
        mutate(`Merged "${data.label}" into target`, tree => {
          const target = findNodeById(tree, targetId);
          if (target) {
            if (!target.merged) target.merged = [];
            target.merged.push(data.label);
            target.headcount += jobs.find(j => j.title === data.label)?.headcount || 0;
          }
          return tree;
        });
      }
    } catch { /* ignore bad drags */ }
  }, [mutate, jobs]);

  // ── Mapping mode ──
  const handleMappingClick = useCallback((side: "current" | "future", id: string) => {
    if (!mappingMode) return;
    if (side === "current") {
      setMappingFrom(id);
    } else if (mappingFrom) {
      const newMapping: Mapping = {
        id: genId(),
        fromId: mappingFrom,
        toId: id,
        type: "one-to-one",
        note: "",
      };
      const newMappings = [...mappings, newMapping];
      setMappings(newMappings);
      pushHistory(`Mapped ${mappingFrom} → ${id}`, futureTree, newMappings);
      setChangeLog(prev => [...prev, `Connected "${mappingFrom}" → "${id.replace("_future", "")}"`]);
      setMappingFrom(null);
    }
  }, [mappingMode, mappingFrom, mappings, futureTree, pushHistory]);

  // ── Treemap summary data ──
  const treemapData = useMemo(() => {
    return tree.filter(t => t.headcount > 0).map((t, i) => ({
      name: t.label,
      size: t.headcount,
      fill: TC[i % TC.length],
    }));
  }, [tree]);

  // ── Employee drill-down ──
  const drilledEmployees = useMemo(() => {
    if (!employeeDrill) return [];
    return employees.filter(e => e.title === employeeDrill);
  }, [employees, employeeDrill]);

  // ── Load a saved version ──
  const loadVersion = useCallback((v: SavedVersion) => {
    setFutureTree(v.tree as FutureNode[]);
    setMappings(v.mappings as Mapping[]);
    pushHistory(`Loaded version: ${v.name}`, v.tree as FutureNode[], v.mappings as Mapping[]);
    setChangeLog(prev => [...prev, `Loaded version "${v.name}"`]);
    showToast(`Loaded: ${v.name}`);
  }, [pushHistory]);

  // Reset future state
  const resetFuture = useCallback(() => {
    const ft = deepCloneTree(tree);
    setFutureTree(ft);
    setMappings([]);
    pushHistory("Reset to current state", ft, []);
    setChangeLog(prev => [...prev, "Reset future state to current"]);
    showToast("Future state reset");
  }, [tree, pushHistory]);

  const orgHC = tree.reduce((s, t) => s + t.headcount, 0);

  return <div className="animate-tab-enter">
    {/* ── COMPACT TREEMAP SUMMARY (top) ── */}
    <div className="mb-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase font-heading">Architecture Overview</span>
        <span className="text-[10px] font-data text-[var(--text-muted)]">{jobs.length} roles · {orgHC.toLocaleString()} people · {tree.length} functions</span>
      </div>
      <div className="flex gap-1.5" style={{ height: 48 }}>
        {treemapData.map((d, i) => {
          const pct = orgHC > 0 ? Math.max(d.size / orgHC * 100, 5) : 10;
          return <div key={d.name} className="rounded-lg relative overflow-hidden group"
            style={{ background: d.fill, flex: pct, minWidth: 0 }}
            title={`${d.name}: ${d.size} people`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold font-heading truncate px-1" style={{ fontSize: pct > 15 ? 11 : 9, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{d.name}</span>
            </div>
          </div>;
        })}
      </div>
    </div>

    {/* ── TOOLBAR ── */}
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      {/* Color metric selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Color by:</span>
        {(["headcount", "ai_impact", "tenure_risk", "vacancy"] as ColorMetric[]).map(m => (
          <button key={m} onClick={() => setColorMetric(m)}
            className={`px-2 py-1 rounded text-[10px] font-semibold ${colorMetric === m ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>
            {m === "headcount" ? "Headcount" : m === "ai_impact" ? "AI Impact" : m === "tenure_risk" ? "Tenure" : "Vacancy"}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Mapping mode */}
      <button onClick={() => { setMappingMode(!mappingMode); setMappingFrom(null); }}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${mappingMode ? "bg-blue-500 text-white" : "text-[var(--text-muted)] border border-[var(--border)] hover:border-blue-400"}`}>
        {mappingMode ? (mappingFrom ? "Click a future state role..." : "Click a current state role...") : "Enter Mapping Mode"}
      </button>

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button onClick={undo} disabled={historyIdx <= 0}
          className={`px-2 py-1 rounded text-[10px] font-semibold ${historyIdx > 0 ? "text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)]" : "text-[var(--text-muted)] border border-[var(--border)] opacity-40 cursor-not-allowed"}`}>
          Undo
        </button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1}
          className={`px-2 py-1 rounded text-[10px] font-semibold ${historyIdx < history.length - 1 ? "text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)]" : "text-[var(--text-muted)] border border-[var(--border)] opacity-40 cursor-not-allowed"}`}>
          Redo
        </button>
      </div>

      {/* Reset */}
      <button onClick={resetFuture} className="px-2 py-1 rounded text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-red-400 hover:text-red-400">
        Reset
      </button>
    </div>

    {/* ── MAIN WORKSPACE: Current State | Connectors | Future State ── */}
    <div className="grid grid-cols-[1fr_180px_1fr] gap-3" style={{ minHeight: 500 }}>

      {/* CURRENT STATE (left) */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3 overflow-y-auto" style={{ maxHeight: "65vh" }}
        onClick={() => { if (mappingMode && currentSelected) handleMappingClick("current", currentSelected); }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase font-heading">Current State</span>
          <span className="text-[9px] font-data text-[var(--text-muted)]">{orgHC} people</span>
        </div>
        {tree.length === 0 ? <Empty text="No architecture data" icon="📋" /> :
          tree.map(func => <CurrentStateNode key={func.id} node={func} depth={0}
            jobs={jobs} employees={employees} colorMetric={colorMetric}
            expanded={currentExpanded}
            onToggle={id => setCurrentExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
            selected={currentSelected}
            onSelect={id => { setCurrentSelected(id); if (mappingMode) handleMappingClick("current", id); }}
            onDrillEmployee={setEmployeeDrill} />)
        }
      </div>

      {/* MAPPING CONNECTORS (center) */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-2 overflow-y-auto" style={{ maxHeight: "65vh" }}>
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase font-heading mb-2 text-center">Mappings</div>
        {mappingMode && <div className="text-[9px] text-center mb-2 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-semibold">
          {mappingFrom ? `From: ${mappingFrom}` : "Select current state role"}
        </div>}
        {mappings.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="text-xl mb-2 opacity-30">🔗</div>
            <div className="text-[10px]">No mappings yet.</div>
            <div className="text-[9px] mt-1">Use mapping mode to connect roles</div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {mappings.map((m, i) => <MappingLine key={m.id} mapping={m} index={i} />)}
          </div>
        )}

        {/* Mapping legend */}
        <div className="mt-3 pt-2 border-t border-[var(--border)] space-y-1">
          {[
            { color: "#4A9E6B", dash: false, label: "1:1 Continue" },
            { color: "#3B82F6", dash: true, label: "1:Many Split" },
            { color: "#F59E0B", dash: true, label: "Many:1 Merge" },
            { color: "#4A9E6B", dash: false, label: "New Role", badge: "NEW" },
            { color: "#EF4444", dash: true, label: "Sunset", strike: true },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[8px] text-[var(--text-muted)]">
              <div className="w-3 h-0.5 rounded" style={{ background: l.color, ...(l.dash ? { borderTop: `1px dashed ${l.color}`, background: "transparent" } : {}) }} />
              <span className={l.strike ? "line-through" : ""}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FUTURE STATE (right) */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3 overflow-y-auto" style={{ maxHeight: "65vh" }}
        onClick={() => { if (mappingMode && futureSelected) handleMappingClick("future", futureSelected); }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase font-heading">Future State</span>
          <span className="text-[9px] font-data text-[var(--text-muted)]">Editable · Right-click for options</span>
        </div>
        {futureTree.length === 0 ? <Empty text="Click Reset to initialize from current state" icon="🔧" /> :
          futureTree.map(func => <FutureStateNode key={func.id} node={func} depth={0}
            onRename={handleRename} onDelete={handleDelete}
            onAddChild={handleAddChild} onSunset={handleSunset} onSplit={handleSplit}
            selected={futureSelected}
            onSelect={id => { setFutureSelected(id); if (mappingMode) handleMappingClick("future", id); }}
            onDrop={handleFutureDrop}
            onAiSuggest={(nodeId, data) => { setChangeLog(prev => [...prev, `AI auto-suggested ${data.tasks.length} tasks for "${findNodeById(futureTree, nodeId)?.label || nodeId}"`]); }} />)
        }
      </div>
    </div>

    {/* ── EMPLOYEE REMAPPING VIEW ── */}
    {employeeDrill && (
      <div className="mt-4">
        <EmployeeTable
          employees={drilledEmployees}
          title={employeeDrill}
          futureTree={futureTree}
          onClose={() => setEmployeeDrill(null)}
        />
      </div>
    )}

    {/* ── IMPACT DASHBOARD (bottom, collapsible) ── */}
    <ImpactDashboard
      currentTree={tree} futureTree={futureTree} mappings={mappings}
      jobs={jobs} employees={employees} changeLog={changeLog}
      collapsed={dashboardCollapsed} onToggle={() => setDashboardCollapsed(!dashboardCollapsed)}
    />

    {/* ── SAVE & COMPARE ── */}
    <SaveComparePanel
      model={model} futureTree={futureTree} mappings={mappings}
      versions={versions} onRefreshVersions={refreshVersions} onLoadVersion={loadVersion}
    />
  </div>;
}
