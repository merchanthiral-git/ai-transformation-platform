"use client";
import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { COLORS, TT } from "./constants";
import { Empty } from "./ui-components";

export function DataTable({ data, cols, pageSize = 15 }: { data: Record<string, unknown>[]; cols?: string[]; pageSize?: number }) {
  const [search, setSearch] = useState(""); const [sortCol, setSortCol] = useState(""); const [sortAsc, setSortAsc] = useState(true); const [page, setPage] = useState(0);
  if (!data?.length) return <Empty text="No visualization data yet" subtitle="Upload workforce data or complete an analysis module to populate this chart." />;
  const columns = cols || Object.keys(data[0]);
  const filtered = search ? data.filter(row => columns.some(c => String(row[c] ?? "").toLowerCase().includes(search.toLowerCase()))) : data;
  const sorted = sortCol ? [...filtered].sort((a, b) => { const av = String(a[sortCol] ?? ""); const bv = String(b[sortCol] ?? ""); const na = Number(av); const nb = Number(bv); if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na; return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); }) : filtered;
  const totalPages = Math.ceil(sorted.length / pageSize); const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  return <div>
    <div className="flex items-center justify-between mb-2">
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-48 focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
      <span className="text-[15px] text-[var(--text-muted)]">{sorted.length} rows{totalPages > 1 ? ` · Page ${page + 1}/${totalPages}` : ""}</span>
    </div>
    <div className="scroll-shadow rounded-lg border border-[var(--border)]">
      <table className="w-full text-left" style={{ minWidth: Math.max(columns.length * 120, 600) }}><thead><tr className="bg-[var(--surface-2)]">{columns.map(c => <th key={c} onClick={() => { if (sortCol === c) setSortAsc(!sortAsc); else { setSortCol(c); setSortAsc(true); } }} className="px-3 py-2 text-[15px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b-2 border-[var(--border)] whitespace-nowrap cursor-pointer hover:text-[var(--accent-primary)] select-none">{c}{sortCol === c ? (sortAsc ? " ▲" : " ▼") : ""}</th>)}</tr></thead>
      <tbody>{paged.map((row, i) => <tr key={i} className={`border-b border-[var(--border)] hover:bg-[var(--hover)] ${i % 2 ? "bg-[var(--surface-2)]/30" : ""}`}>{columns.map(c => <td key={c} className="px-3 py-2 text-[15px] whitespace-nowrap max-w-[280px] truncate text-[var(--text-secondary)] font-data">{String(row[c] ?? "")}</td>)}</tr>)}</tbody></table>
    </div>
    {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-2">{page > 0 && <button onClick={() => setPage(page - 1)} className="text-[15px] text-[var(--accent-primary)] font-semibold">← Prev</button>}<span className="text-[15px] text-[var(--text-muted)]">{page + 1} / {totalPages}</span>{page < totalPages - 1 && <button onClick={() => setPage(page + 1)} className="text-[15px] text-[var(--accent-primary)] font-semibold">Next →</button>}</div>}
  </div>;
}

/* ═══ EXPANDABLE CHART WRAPPER ═══ */
export function ExpandableChart({ title, children }: { title?: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expanded]);

  return <div className="relative group">
    {/* Expand button */}
    <button onClick={() => setExpanded(true)} title="Click to enlarge" className="absolute top-1 right-1 z-10 w-6 h-6 rounded-md flex items-center justify-center text-[15px] opacity-0 group-hover:opacity-100 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-primary)"; e.currentTarget.style.borderColor = "rgba(244,168,58,0.3)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>⛶</button>
    {/* Inline chart */}
    <div onDoubleClick={() => setExpanded(true)}>{children}</div>
    {/* Expanded modal */}
    {expanded && <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", animation: "ecFadeIn 0.2s ease" }} onClick={() => setExpanded(false)}>
      <div style={{ width: "90vw", height: "85vh", background: "var(--surface-1)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow-4)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          {title && <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Inter Tight', sans-serif" }}>{title}</h3>}
          {!title && <div />}
          <button onClick={() => setExpanded(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(244,168,58,0.1)", border: "1px solid rgba(244,168,58,0.2)", color: "var(--accent-primary)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* Chart area */}
        <div style={{ flex: 1, padding: 24, overflow: "auto", fontSize: "130%" }}>{children}</div>
      </div>
      <style>{`@keyframes ecFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>}
  </div>;
}

export function BarViz({ data, labelKey = "name", valueKey = "value", color = "var(--accent-primary)", title }: { data: Record<string, unknown>[]; labelKey?: string; valueKey?: string; color?: string; title?: string }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => Math.abs(Number(d[valueKey] || 0))), 1);
  const content = <div className="space-y-2">{data.slice(0, 12).map((d, i) => {
    const val = Number(d[valueKey] || 0);
    const label = String(d[labelKey] || "");
    const truncLabel = label.length > 24 ? label.slice(0, 22) + "\u2026" : label;
    return <div key={i} className="flex items-center gap-3">
      <div className="text-[15px] text-[var(--text-secondary)] text-right shrink-0 truncate" style={{ width: 120 }} title={label}>{truncLabel}</div>
      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden"><motion.div className="h-full rounded" initial={{ width: "0%" }} animate={{ width: `${Math.max((Math.abs(val) / maxVal) * 100, 2)}%` }} transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }} style={{ background: color, opacity: 0.85 }} /></div>
      <div className="text-[13px] text-[var(--text-primary)] shrink-0" style={{ minWidth: 32, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{val.toLocaleString()}</div>
    </div>;
  })}</div>;
  return <ExpandableChart title={title}>{content}</ExpandableChart>;
}

export function DonutViz({ data, title }: { data: { name: string; value: number }[]; title?: string }) {
  if (!data?.length) return null;
  const content = <div className="flex items-center gap-6">
    <ResponsiveContainer width={120} height={120}><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={52} strokeWidth={0} animationDuration={800} animationEasing="ease-out">{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT as object} /></PieChart></ResponsiveContainer>
    <div className="space-y-1">{data.map((d, i) => <div key={i} className="flex items-center gap-2 text-[13px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[var(--text-secondary)]">{d.name}</span><span className="ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{d.value.toLocaleString()}</span></div>)}</div>
  </div>;
  return <ExpandableChart title={title}>{content}</ExpandableChart>;
}

export function RadarViz({ data, title }: { data: { subject: string; current: number; future?: number; max: number }[]; title?: string }) {
  if (!data?.length) return null;
  const content = <ResponsiveContainer width="100%" height={280}>
    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
      <PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 15, fill: "var(--text-secondary)" }} /><PolarRadiusAxis domain={[0, data[0]?.max || 5]} tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
      <Radar name="Current" dataKey="current" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} strokeWidth={2} />
      {data[0]?.future !== undefined && <Radar name="Future" dataKey="future" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />}
      <Legend wrapperStyle={{ fontSize: 15, color: "var(--text-secondary)" }} /><Tooltip contentStyle={TT as object} />
    </RadarChart>
  </ResponsiveContainer>;
  return <ExpandableChart title={title}>{content}</ExpandableChart>;
}
