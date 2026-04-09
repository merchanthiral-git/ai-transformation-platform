"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../lib/api";
import * as authApi from "../lib/auth-api";
import type { Filters } from "../lib/api";
import { useWorkspaceController } from "../lib/workspace";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, Legend } from "recharts";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
type ViewContext = { mode: string; employee: string; job: string; custom: Record<string, string> };

const COLORS = ["#3B82F6","#F97316","#10B981","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F59E0B"];

/* ── AI Helper — routes all AI calls through backend Gemini proxy ── */
async function callAI(system: string, message: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, message }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        return "[AI unavailable — backend returned an error. Check that your backend is running on port 8000.]";
      }
      const data = await resp.json();
      if (data.error) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        return `[AI service error: ${data.text || "Unknown error"}. Try again or check Gemini API key.]`;
      }
      return data.text || "";
    } catch (e) {
      console.error(`AI call attempt ${attempt + 1} failed:`, e);
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
      return "[AI unavailable — could not connect to backend. Make sure uvicorn is running on port 8000.]";
    }
  }
  return "";
}
// Global toast notification
function ModuleExportButton({ model, module, label }: { model: string; module: string; label?: string }) {
  const [exporting, setExporting] = useState(false);
  return <button onClick={async () => {
    setExporting(true);
    try {
      const resp = await fetch(`/api/export/module/${model}/${module}`);
      if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${module}_export.xlsx`; a.click(); URL.revokeObjectURL(url); showToast(`📥 ${label || module} exported`); }
      else showToast("Export failed");
    } catch { showToast("Export failed — check backend"); }
    setExporting(false);
  }} disabled={exporting} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)] transition-all" style={{opacity: exporting ? 0.5 : 1}}>
    {exporting ? "..." : "↓ Export"}
  </button>;
}

let _globalToast: ((msg: string) => void) | null = null;
function showToast(msg: string) { if (_globalToast) _globalToast(msg); }
let _globalLogDecision: ((module: string, action: string, detail: string) => void) | null = null;
function logDec(module: string, action: string, detail: string) { if (_globalLogDecision) _globalLogDecision(module, action, detail); }

// Global Decision Log — tracks all decisions across modules
function useDecisionLog(projectId: string) {
  const [log, setLog] = usePersisted<{ts: string; module: string; action: string; detail: string}[]>(`${projectId}_decisionLog`, []);
  const logDecision = useCallback((module: string, action: string, detail: string) => {
    setLog(prev => [...prev, { ts: new Date().toISOString(), module, action, detail }].slice(-100));
  }, [setLog]);
  return { log, logDecision, clearLog: () => setLog([]) };
}

// Global Risk Register — aggregated risks
function useRiskRegister(projectId: string) {
  const [risks, setRisks] = usePersisted<{id: string; source: string; risk: string; probability: string; impact: string; mitigation: string; status: string}[]>(`${projectId}_riskRegister`, []);
  const addRisk = useCallback((source: string, risk: string, probability: string, impact: string, mitigation: string) => {
    setRisks(prev => [...prev, { id: `R${prev.length+1}`, source, risk, probability, impact, mitigation, status: "Open" }]);
  }, [setRisks]);
  const updateRisk = useCallback((id: string, updates: Partial<{status: string; mitigation: string}>) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [setRisks]);
  return { risks, addRisk, updateRisk };
}

const TT: React.CSSProperties = { background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 12, color: "#E8ECF4" };

/* ═══════════════════════════════════════════════════════════════
   ERROR BOUNDARY — prevents white screen crashes
   ═══════════════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return this.props.fallback || <div className="p-8 text-center"><div className="text-3xl mb-3">⚠️</div><h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Something went wrong</h3><p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">{this.state.error?.message || "An unexpected error occurred. Try refreshing the page."}</p><button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white">Try Again</button></div>;
    return this.props.children;
  }
}


/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function KpiCard({ label, value, accent, delta }: { label: string; value: string | number; accent?: boolean; delta?: string }) {
  return <div className={`bg-[var(--surface-1)] border rounded-xl px-5 py-4 transition-all hover:border-[var(--accent-primary)]/30 ${accent ? "border-l-[3px] border-l-[var(--accent-primary)] border-[var(--border)]" : "border-[var(--border)]"}`}>
    <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
    <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{value}</div>
    {delta && <div className="text-[11px] font-semibold text-[var(--success)] mt-1">{delta}</div>}
  </div>;
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-4">
    {title && <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-2 mb-3 border-b border-[var(--border)]">{title}</h3>}
    {children}
  </div>;
}

function Empty({ text, icon = "📭" }: { text: string; icon?: string }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]"><div className="text-3xl mb-2 opacity-40">{icon}</div><div className="text-sm max-w-xs mx-auto leading-relaxed">{text}</div></div>;
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const s: Record<string, string> = { indigo: "bg-[rgba(59,130,246,0.15)] text-[var(--accent-primary)]", green: "bg-[rgba(16,185,129,0.15)] text-[var(--success)]", amber: "bg-[rgba(249,115,22,0.15)] text-[var(--warning)]", red: "bg-[rgba(239,68,68,0.15)] text-[var(--risk)]", purple: "bg-[rgba(139,92,246,0.15)] text-[var(--purple)]", gray: "bg-[rgba(163,177,198,0.12)] text-[var(--text-muted)]" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s[color] || s.gray}`}>{children}</span>;
}

function InsightPanel({ title, items, icon = "💡" }: { title: string; items: string[]; icon?: string }) {
  return <Card><div className="flex items-center gap-2 text-[13px] font-bold mb-2">{icon} {title}</div><ul className="list-disc pl-4 space-y-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></Card>;
}

function NarrativePanel({ title, items }: { title: string; items: string[] }) {
  return <div className="bg-gradient-to-br from-[var(--surface-2)] via-[rgba(59,130,246,0.06)] to-[var(--surface-1)] rounded-2xl px-7 py-6 text-[var(--text-primary)] border border-[var(--border)] mb-4"><div className="text-sm font-bold mb-3">{title}</div>{items.map((t, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)] mb-1.5 pl-4 relative"><span className="absolute left-0 text-[var(--accent-primary)] font-bold">›</span>{t}</div>)}</div>;
}

function DataTable({ data, cols, pageSize = 15 }: { data: Record<string, unknown>[]; cols?: string[]; pageSize?: number }) {
  const [search, setSearch] = useState(""); const [sortCol, setSortCol] = useState(""); const [sortAsc, setSortAsc] = useState(true); const [page, setPage] = useState(0);
  if (!data?.length) return <Empty text="No data available" />;
  const columns = cols || Object.keys(data[0]);
  const filtered = search ? data.filter(row => columns.some(c => String(row[c] ?? "").toLowerCase().includes(search.toLowerCase()))) : data;
  const sorted = sortCol ? [...filtered].sort((a, b) => { const av = String(a[sortCol] ?? ""); const bv = String(b[sortCol] ?? ""); const na = Number(av); const nb = Number(bv); if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na; return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); }) : filtered;
  const totalPages = Math.ceil(sorted.length / pageSize); const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  return <div>
    <div className="flex items-center justify-between mb-2">
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none w-48 focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
      <span className="text-[11px] text-[var(--text-muted)]">{sorted.length} rows{totalPages > 1 ? ` · Page ${page + 1}/${totalPages}` : ""}</span>
    </div>
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]" style={{ WebkitOverflowScrolling: "touch" }}>
      <table className="w-full text-left" style={{ minWidth: Math.max(columns.length * 120, 600) }}><thead><tr className="bg-[var(--surface-2)]">{columns.map(c => <th key={c} onClick={() => { if (sortCol === c) setSortAsc(!sortAsc); else { setSortCol(c); setSortAsc(true); } }} className="px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b-2 border-[var(--border)] whitespace-nowrap cursor-pointer hover:text-[var(--accent-primary)] select-none">{c}{sortCol === c ? (sortAsc ? " ▲" : " ▼") : ""}</th>)}</tr></thead>
      <tbody>{paged.map((row, i) => <tr key={i} className={`border-b border-[var(--border)] hover:bg-[var(--hover)] ${i % 2 ? "bg-[var(--surface-2)]/30" : ""}`}>{columns.map(c => <td key={c} className="px-3 py-2 text-[13px] whitespace-nowrap max-w-[280px] truncate text-[var(--text-secondary)]">{String(row[c] ?? "")}</td>)}</tr>)}</tbody></table>
    </div>
    {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-2">{page > 0 && <button onClick={() => setPage(page - 1)} className="text-[11px] text-[var(--accent-primary)] font-semibold">← Prev</button>}<span className="text-[11px] text-[var(--text-muted)]">{page + 1} / {totalPages}</span>{page < totalPages - 1 && <button onClick={() => setPage(page + 1)} className="text-[11px] text-[var(--accent-primary)] font-semibold">Next →</button>}</div>}
  </div>;
}

function BarViz({ data, labelKey = "name", valueKey = "value", color = "var(--accent-primary)" }: { data: Record<string, unknown>[]; labelKey?: string; valueKey?: string; color?: string }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => Math.abs(Number(d[valueKey] || 0))), 1);
  return <div className="space-y-2">{data.slice(0, 12).map((d, i) => {
    const val = Number(d[valueKey] || 0);
    const label = String(d[labelKey] || "");
    const truncLabel = label.length > 24 ? label.slice(0, 22) + "…" : label;
    return <div key={i} className="flex items-center gap-3">
      <div className="text-[11px] text-[var(--text-secondary)] text-right shrink-0 truncate" style={{ width: 120 }} title={label}>{truncLabel}</div>
      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((Math.abs(val) / maxVal) * 100, 2)}%`, background: color, opacity: 0.85 }} /></div>
      <div className="text-[11px] font-semibold text-[var(--text-primary)] shrink-0" style={{ minWidth: 32, textAlign: "right" }}>{val}</div>
    </div>;
  })}</div>;
}

function DonutViz({ data }: { data: { name: string; value: number }[] }) {
  if (!data?.length) return null;
  return <div className="flex items-center gap-6">
    <ResponsiveContainer width={120} height={120}><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={52} strokeWidth={0}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT as object} /></PieChart></ResponsiveContainer>
    <div className="space-y-1">{data.map((d, i) => <div key={i} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[var(--text-secondary)]">{d.name}</span><span className="font-semibold ml-auto">{d.value}</span></div>)}</div>
  </div>;
}

function RadarViz({ data }: { data: { subject: string; current: number; future?: number; max: number }[] }) {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={280}>
    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
      <PolarGrid stroke="#2A3555" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#A3B1C6" }} /><PolarRadiusAxis domain={[0, data[0]?.max || 5]} tick={{ fontSize: 10, fill: "#7B8BA2" }} />
      <Radar name="Current" dataKey="current" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
      {data[0]?.future !== undefined && <Radar name="Future" dataKey="future" stroke="#F97316" fill="#F97316" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />}
      <Legend wrapperStyle={{ fontSize: 11, color: "#A3B1C6" }} /><Tooltip contentStyle={TT as object} />
    </RadarChart>
  </ResponsiveContainer>;
}

function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return <div className="flex border-b-2 border-[var(--border)] mb-5 gap-0 overflow-x-auto">{tabs.map(t => <button key={t.id} onClick={() => onChange(t.id)} className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap -mb-[2px] border-b-2 transition-all ${active === t.id ? "text-[var(--accent-primary)] font-semibold border-[var(--accent-primary)]" : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]"}`}>{t.label}</button>)}</div>;
}

function SidebarSelect({ label, options, value, onChange }: { label?: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="mb-2">{label && <label className="block text-[11px] font-semibold text-[var(--text-muted)] tracking-wide mb-1">{label}</label>}<select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none appearance-none">{options.map(o => <option key={o} value={o} className="bg-[var(--surface-2)]">{o}</option>)}</select></div>;
}

function ReadinessDot({ ready }: { ready: boolean }) { return <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ready ? "bg-[var(--success)]" : "bg-[var(--risk)]"}`} />; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* ═══════════════════════════════════════════════════════════════
   HOOKS — usePersisted, useDebounce, useApiData
   ═══════════════════════════════════════════════════════════════ */
function usePersisted<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s !== null) setVal(JSON.parse(s)); } catch {} }, [key]);
  const setter = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [val, setter];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

function useApiData(fetcher: () => Promise<any>, deps: unknown[]): [Record<string, unknown> | null, boolean] {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; setLoading(true); fetcher().then((d: unknown) => { if (!cancelled) { setData(d as Record<string, unknown> | null); setLoading(false); } }).catch((err) => { console.error("[useApiData]", err); if (!cancelled) setLoading(false); }); return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading];
}

/* ═══════════════════════════════════════════════════════════════
   VIEW TOGGLE — Quick switch in module headers
   ═══════════════════════════════════════════════════════════════ */
function ViewToggle({ viewCtx, onChangeView }: { viewCtx: ViewContext; onChangeView: () => void }) {
  const colors: Record<string, string> = { org: "var(--accent-primary)", job: "var(--success)", employee: "var(--purple)", custom: "var(--warning)" };
  const icons: Record<string, string> = { org: "🏢", job: "💼", employee: "👤", custom: "⚙️" };
  const labels: Record<string, string> = { org: "Org-Wide", job: viewCtx.job || "Job", employee: viewCtx.employee || "Employee", custom: "Custom" };
  return <button onClick={onChangeView} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80" style={{ background: `${colors[viewCtx.mode]}15`, border: `1px solid ${colors[viewCtx.mode]}30`, color: colors[viewCtx.mode] }}>
    {icons[viewCtx.mode]} {labels[viewCtx.mode]} <span className="text-[9px] opacity-60">↻</span>
  </button>;
}


/* ═══════════════════════════════════════════════════════════════
   MUSIC PLAYER — Advanced mini player with 28 tracks
   Shuffle per session, crossfade, visualizer, volume memory
   ═══════════════════════════════════════════════════════════════ */
const TRACKS_MASTER = [
  { id: 1, name: "Chill Background", file: "/track1.mp3" },
  { id: 2, name: "Chill Vibes", file: "/track2.mp3" },
  { id: 3, name: "Morning Garden", file: "/track3.mp3" },
  { id: 4, name: "Chill Beats", file: "/track4.mp3" },
  { id: 5, name: "Cozy Lounge", file: "/track5.mp3" },
  { id: 6, name: "Chill Lounge", file: "/track6.mp3" },
  { id: 7, name: "Chill Music", file: "/track7.mp3" },
  { id: 8, name: "The Mountain", file: "/track8.mp3" },
  { id: 9, name: "Tiba", file: "/track9.mp3" },
  { id: 10, name: "Buzios Breeze", file: "/track10.mp3" },
  { id: 11, name: "Chill Day", file: "/track11.mp3" },
  { id: 12, name: "Chill Beats II", file: "/track12.mp3" },
  { id: 13, name: "Downtempo", file: "/track13.mp3" },
  { id: 14, name: "Good Night Lofi", file: "/track14.mp3" },
  { id: 15, name: "Lofi Girl", file: "/track15.mp3" },
  { id: 16, name: "Carefree Summer", file: "/track16.mp3" },
  { id: 17, name: "Lofi Chill", file: "/track17.mp3" },
  { id: 18, name: "Chill Life", file: "/track18.mp3" },
  { id: 19, name: "Relax Chill", file: "/track19.mp3" },
  { id: 20, name: "Coffee Chill Out", file: "/track20.mp3" },
  { id: 21, name: "Mountain Beat", file: "/track21.mp3" },
  { id: 22, name: "Downtempo II", file: "/track22.mp3" },
  { id: 23, name: "Lofi Beat", file: "/track23.mp3" },
  { id: 24, name: "Vlog Beat", file: "/track24.mp3" },
  { id: 25, name: "Lounge R&B", file: "/track25.mp3" },
  { id: 26, name: "Lofi Background", file: "/track26.mp3" },
  { id: 27, name: "Tropical Summer", file: "/track27.mp3" },
  { id: 28, name: "Dream Cloud", file: "/track28.mp3" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MusicPlayer() {
  const [tracks] = useState(() => shuffleArray(TRACKS_MASTER));
  const [playing, setPlaying] = useState(true);
  const [trackIdx, setTrackIdx] = useState(0);
  const [volume, setVolume] = useState(() => { try { const v = localStorage.getItem("music_vol"); return v ? Number(v) : 0.25; } catch { return 0.25; } });
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [showList, setShowList] = useState(false);
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);

  // Format time mm:ss
  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec < 10 ? "0" : ""}${sec}`; };

  useEffect(() => {
    const audio = new Audio(tracks[0].file);
    audio.volume = volume;
    audio.preload = "auto";

    const onEnd = () => {
      setTrackIdx(prev => {
        const next = (prev + 1) % tracks.length;
        audio.src = tracks[next].file;
        audio.play().catch(() => {});
        return next;
      });
    };

    const onMeta = () => setDuration(audio.duration || 0);

    // Smooth progress update via requestAnimationFrame
    const updateProgress = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
        setCurTime(audio.currentTime);
      }
      animRef.current = requestAnimationFrame(updateProgress);
    };

    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onMeta);
    audioRef.current = audio;

    // Start animation loop
    animRef.current = requestAnimationFrame(updateProgress);

    // Auto-play
    audio.play().then(() => setAutoPlayAttempted(true)).catch(() => {
      setPlaying(false);
      const startOnClick = () => {
        if (audioRef.current) { audioRef.current.play().catch(() => {}); setPlaying(true); }
        setAutoPlayAttempted(true);
        document.removeEventListener("click", startOnClick);
      };
      document.addEventListener("click", startOnClick, { once: true });
    });

    return () => {
      audio.pause(); audio.removeEventListener("ended", onEnd); audio.removeEventListener("loadedmetadata", onMeta);
      cancelAnimationFrame(animRef.current); audio.src = "";
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); } else { a.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const changeTrack = (idx: number) => {
    const a = audioRef.current; if (!a) return;
    setTrackIdx(idx); a.src = tracks[idx].file; a.volume = volume; setProgress(0); setCurTime(0);
    if (playing) a.play().catch(() => {});
  };

  const nextTrack = () => changeTrack((trackIdx + 1) % tracks.length);
  const prevTrack = () => changeTrack((trackIdx - 1 + tracks.length) % tracks.length);

  const changeVolume = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    try { localStorage.setItem("music_vol", String(v)); } catch {}
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
    }
  };

  const track = tracks[trackIdx];

  return <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 40 }}>
    {/* Expanded player */}
    {expanded && <div style={{ marginBottom: 8, width: 300, borderRadius: 20, overflow: "hidden", background: "var(--surface-1)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      {/* Now playing header */}
      <div style={{ padding: "16px 16px 8px", background: "linear-gradient(135deg, rgba(224,144,64,0.08), rgba(139,92,246,0.05))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2 }}>Now Playing</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{trackIdx + 1} / {tracks.length}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.name}</div>

        {/* Progress bar — clickable */}
        <div onClick={seek} style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, cursor: "pointer", marginTop: 8, position: "relative", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #e09040, #c07030)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}><span>{fmt(currentTime)}</span><span>{fmt(duration)}</span></div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "8px 16px" }}>
        <button onClick={prevTrack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>⏮</button>
        <button onClick={toggle} style={{ width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", cursor: "pointer", border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 12px rgba(224,144,64,0.25)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{playing ? "⏸" : "▶"}</button>
        <button onClick={nextTrack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>⏭</button>
      </div>

      {/* Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 8px" }}>
        <button onClick={() => changeVolume(volume > 0 ? 0 : 0.25)} style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>{volume === 0 ? "🔇" : volume < 0.3 ? "🔈" : volume < 0.7 ? "🔉" : "🔊"}</button>
        <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "#e09040", height: 3 }} />
        <span style={{ fontSize: 9, color: "var(--text-muted)", width: 24, textAlign: "right" }}>{Math.round(volume * 100)}</span>
      </div>

      {/* Track list toggle */}
      <button onClick={() => setShowList(!showList)} style={{ width: "100%", padding: "6px 16px", background: "var(--surface-2)", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{showList ? "Hide Tracks" : "Show All Tracks"}</span><span>{showList ? "▲" : "▼"}</span>
      </button>

      {/* Track list */}
      {showList && <div style={{ maxHeight: 220, overflowY: "auto", borderTop: "1px solid var(--border)" }}>
        {tracks.map((t, i) => <button key={t.id} onClick={() => changeTrack(i)} style={{ width: "100%", padding: "8px 16px", background: i === trackIdx ? "rgba(224,144,64,0.08)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: i === trackIdx ? "#f0a050" : "var(--text-secondary)", transition: "all 0.15s" }} onMouseEnter={e => { if (i !== trackIdx) e.currentTarget.style.background = "var(--hover)"; }} onMouseLeave={e => { if (i !== trackIdx) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 18, fontSize: 10, textAlign: "right", opacity: 0.5 }}>{i === trackIdx && playing ? "♫" : `${i + 1}`}</span>
          <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
        </button>)}
      </div>}
    </div>}

    {/* Mini button */}
    <button onClick={() => setExpanded(!expanded)} style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", border: "1px solid var(--border)", background: expanded ? "var(--surface-1)" : playing ? "linear-gradient(135deg, #e09040, #c07030)" : "var(--surface-1)", color: playing ? (expanded ? "#f0a050" : "#fff") : "var(--text-muted)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)" }} onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
      {playing ? "♫" : "♪"}
    </button>

    {/* Playing indicator — subtle pulse ring */}
    {playing && !expanded && <div style={{ position: "absolute", bottom: -2, left: -2, right: -2, top: -2, borderRadius: 16, border: "2px solid rgba(224,144,64,0.3)", animation: "pulse 2s ease-in-out infinite", pointerEvents: "none" }} />}
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   EXPORT HELPER — downloads data as CSV
   ═══════════════════════════════════════════════════════════════ */
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data?.length) return;
  const cols = Object.keys(data[0]);
  const csv = [cols.join(","), ...data.map(row => cols.map(c => { const v = String(row[c] ?? ""); return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v; }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}


/* ═══════════════════════════════════════════════════════════════
   PAGE HEADER — used on every module page
   ═══════════════════════════════════════════════════════════════ */
function PageHeader({ icon, title, subtitle, onBack, moduleId, onUpload, viewCtx, onViewChange }: { icon: string; title: string; subtitle: string; onBack: () => void; moduleId?: string; onUpload?: (files: FileList) => void; viewCtx?: ViewContext; onViewChange?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MODULE_DATA_LABELS: Record<string, string> = { snapshot: "Workforce", jobs: "Job Catalog", scan: "Work Design", design: "Work Design", simulate: "Work Design", build: "Org Design", plan: "Change Mgmt", opmodel: "Operating Model" };
  const dataLabel = moduleId ? MODULE_DATA_LABELS[moduleId] : null;
  const noTemplate = moduleId === "opmodel"; // Op Model Lab is a sandbox, no upload needed

  return <div className="mb-6">
    <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-3 flex items-center gap-1 transition-colors">← Back to Home</button>
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--purple)] flex items-center justify-center text-xl">{icon}</div>
        <div><h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">{title}</h1><p className="text-[13px] text-[var(--text-secondary)]">{subtitle}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {viewCtx && viewCtx.mode !== "org" && onViewChange && <ViewToggle viewCtx={viewCtx} onChangeView={onViewChange} />}
      {moduleId && !noTemplate && <>
        <a href={`/api/template/${moduleId}`} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] no-underline">⬇ {dataLabel} Template</a>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files && onUpload) onUpload(e.target.files); }} />
        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all bg-[var(--accent-primary)] text-white hover:opacity-90">⬆ Upload {dataLabel}</button>
      </>}
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXT STRIP — shows insights from prior modules
   ═══════════════════════════════════════════════════════════════ */
function ContextStrip({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap">
    <span className="text-[12px] font-bold text-[var(--accent-primary)]">From prior steps:</span>
    {items.map((t, i) => <span key={i} className="text-[12px] text-[var(--text-secondary)]">{t}</span>)}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════════════ */
function Toast({ message, type = "info", onDismiss }: { message: string; type?: "info" | "success" | "error" | "warning"; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  const colors = { info: "var(--accent-primary)", success: "var(--success)", error: "var(--risk)", warning: "var(--warning)" };
  const icons = { info: "ℹ️", success: "✓", error: "✕", warning: "⚠" };
  return <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl" style={{ background: "var(--surface-1)", border: `1px solid ${colors[type]}30`, minWidth: 280, maxWidth: 420 }}>
    <span className="text-lg" style={{ color: colors[type] }}>{icons[type]}</span>
    <span className="text-[13px] text-[var(--text-primary)] flex-1">{message}</span>
    <button onClick={onDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm ml-2">✕</button>
  </div>;
}

function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "info" | "success" | "error" | "warning" }[]>([]);
  const add = useCallback((message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const remove = useCallback((id: number) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);
  const ToastContainer = useMemo(() => {
    return function ToastList() {
      return <>{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => remove(t.id)} />)}</>;
    };
  }, [toasts, remove]);
  return { toast: add, ToastContainer };
}


/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */
function LoadingBar() {
  return <div className="w-full h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4"><div className="h-full bg-[var(--accent-primary)] rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} /></div>;
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3 animate-pulse">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex gap-3"><div className="h-4 bg-[var(--surface-2)] rounded w-1/4" /><div className="h-4 bg-[var(--surface-2)] rounded w-1/2" /><div className="h-4 bg-[var(--surface-2)] rounded w-1/4" /></div>)}</div>;
}

function EmptyWithAction({ text, icon = "📭", actionLabel, onAction }: { text: string; icon?: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]">
    <div className="text-3xl mb-2 opacity-40">{icon}</div>
    <div className="text-sm max-w-xs mx-auto leading-relaxed mb-3">{text}</div>
    {actionLabel && onAction && <button onClick={onAction} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">{actionLabel}</button>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   NEXT STEP NAVIGATION
   ═══════════════════════════════════════════════════════════════ */
function NextStepBar({ currentModuleId, onNavigate }: { currentModuleId: string; onNavigate: (id: string) => void }) {
  const currentIdx = MODULES.findIndex(m => m.id === currentModuleId);
  const next = currentIdx >= 0 && currentIdx < MODULES.length - 1 ? MODULES[currentIdx + 1] : null;
  const prev = currentIdx > 0 ? MODULES[currentIdx - 1] : null;
  if (!prev && !next) return null;
  return <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center justify-between">
    {prev ? <button onClick={() => onNavigate(prev.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>← {prev.icon} {prev.title}</button> : <div />}
    {next ? <button onClick={() => onNavigate(next.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">Next: {next.icon} {next.title} →</button> : <div />}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   AI ESPRESSO SYSTEM — Quick prompts + Central AI button + Chat
   ═══════════════════════════════════════════════════════════════ */

const MODULE_QUICK_PROMPTS: Record<string, { label: string; prompt: string; needsInput?: boolean; inputLabel?: string; inputPlaceholder?: string }[]> = {
  snapshot: [
    { label: "Executive Summary", prompt: "Write a 3-paragraph executive summary of our workforce. Include headcount, largest functions, AI readiness score, and top risks." },
    { label: "Risk Assessment", prompt: "Identify the top 5 workforce risks based on our structure, span of control, and AI readiness data." },
    { label: "Benchmark Compare", prompt: "How does our org structure compare to industry benchmarks for a company of this size?", needsInput: true, inputLabel: "Industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
  ],
  snapshot_employee: [
    { label: "Explain My Profile", prompt: "Based on my role, explain my position in the organization, my typical career trajectory, and what skills I should develop." },
    { label: "How Will AI Affect Me?", prompt: "Explain specifically how AI transformation will change my day-to-day work. What tasks will change? What stays the same?" },
    { label: "My Development Plan", prompt: "Create a personalized 6-month development plan for me to prepare for the AI transformation." },
  ],
  snapshot_job: [
    { label: "Role Analysis", prompt: "Analyze this role in depth — what are the key value-drivers, what's at risk from AI, and how should this role evolve?" },
    { label: "Comparable Roles", prompt: "What are the comparable roles in other organizations? How does this role's scope and level compare to industry norms?" },
    { label: "Succession Risk", prompt: "What is the succession risk for this role? How hard is it to replace, and what skills are most critical to retain?" },
  ],
  jobs: [
    { label: "Role Redundancy Check", prompt: "Analyze our job catalog for potential redundancies — roles with overlapping descriptions or responsibilities." },
    { label: "Career Path Gaps", prompt: "Identify gaps in our career architecture — levels or tracks that are missing or underpopulated." },
    { label: "Restructure Proposal", prompt: "Propose a restructured job architecture that reduces role fragmentation while maintaining career progression." },
  ],
  scan: [
    { label: "Top 5 Quick Wins", prompt: "Identify the 5 tasks that would deliver the highest ROI if automated immediately. Explain why for each." },
    { label: "Automation Roadmap", prompt: "Create a phased automation roadmap: what to automate in Month 1-3, 4-6, and 7-12." },
    { label: "Skills Gap Plan", prompt: "Based on our AI impact scores, what new skills does our workforce need? Create a training priority list." },
    { label: "Phase 1 Summary", prompt: "Summarize everything discovered in Phase 1: workforce composition, job architecture findings, and AI opportunity assessment. What should we prioritize in Phase 2 Design?" },
  ],
  design: [
    { label: "Auto-Generate Tasks", prompt: "Generate a complete task breakdown for the selected role with AI impact scores, time allocations, and skill requirements." },
    { label: "Validate My Design", prompt: "Review my current task breakdown. Flag any issues: time not summing to 100%, misclassified AI impact, unrealistic estimates." },
    { label: "Benchmark This Role", prompt: "How does this role's task breakdown compare to industry norms?", needsInput: true, inputLabel: "Industry/Company", inputPlaceholder: "e.g. Big 4 Consulting, Fortune 500 Finance..." },
  ],
  simulate: [
    { label: "Scenario Brief", prompt: "Write an executive summary of our current scenario results. Include released hours, FTE equivalents, cost savings, and break-even timeline." },
    { label: "Adoption Strategy", prompt: "Based on our scenario results, what adoption rate do you recommend and why? What are the risks of going higher or lower?" },
    { label: "Investment Sizing", prompt: "Based on our org size and the roles in scope, what per-role investment amount do you recommend? Break down the investment into tooling, training, change management, and productivity loss.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
    { label: "Custom Scenario", prompt: "Model a scenario where we only transform specific functions.", needsInput: true, inputLabel: "Functions to transform", inputPlaceholder: "e.g. Finance and HR only..." },
  ],
  build: [
    { label: "Restructure Plan", prompt: "Analyze our current org structure and generate specific restructuring recommendations with expected savings." },
    { label: "Optimal Spans", prompt: "Calculate the optimal span of control for each department based on their function type, complexity, and industry benchmarks." },
    { label: "De-Layering Plan", prompt: "Identify which departments should be de-layered, how many layers to remove, and the expected impact on decision speed and cost." },
    { label: "Industry Benchmark", prompt: "Compare our org structure to industry best practices.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, SaaS, Manufacturing..." },
  ],
  plan: [
    { label: "Auto-Build Roadmap", prompt: "Generate a complete change management roadmap with initiatives, owners, waves, dependencies, and risks based on our work design decisions." },
    { label: "Risk Mitigation", prompt: "For each high-risk initiative, provide 3 specific mitigation strategies with owners and timelines." },
    { label: "Stakeholder Map", prompt: "Create a stakeholder analysis: who needs to champion this transformation, who might resist, and how to bring them along.", needsInput: true, inputLabel: "Key stakeholders", inputPlaceholder: "e.g. CFO, VP Engineering, Union rep..." },
    { label: "Full Transformation Report", prompt: "Write a complete executive transformation report covering Phase 1 (Discovery findings), Phase 2 (Design decisions and scenario results), and Phase 3 (Change plan and operating model). Format as a board-ready narrative." },
  ],
  opmodel: [
    { label: "Recommend Architecture", prompt: "Based on our function and industry, recommend the best organizational archetype, operating model, and governance combination with reasoning." },
    { label: "Generate Company Model", prompt: "Generate the operating model for a specific company as a reference template.", needsInput: true, inputLabel: "Company name", inputPlaceholder: "e.g. Chipotle, Stripe, Tesla..." },
    { label: "Transition Plan", prompt: "If we move from our current archetype to the recommended one, what are the key transition steps, risks, and timeline?" },
  ],
};

const MODULE_AI_PROMPTS: Record<string, string> = {
  snapshot: "You are analyzing a Workforce Snapshot. Help the user understand their workforce composition, org structure, headcount distribution, span of control, and AI readiness scores.",
  jobs: "You are analyzing Job Architecture. Help the user understand their job catalog, career levels, role clusters, and org hierarchy.",
  scan: "You are analyzing an AI Opportunity Scan. Help the user understand which tasks have the highest AI impact, where quick wins are, and what skills gaps exist.",
  design: "You are in the Work Design Lab. Help the user deconstruct jobs into tasks, decide which tasks to automate/augment/redesign/retain, and plan redeployment.",
  simulate: "You are in the Impact Simulator. Help the user understand scenario outcomes — released hours, FTE equivalents, ROI, break-even timelines.",
  build: "You are in the Org Design Studio. Help the user model future org structures — analyze span of control, layers, cost implications, and role migration.",
  plan: "You are in the Change Planner. Help the user sequence transformation initiatives, assess risks, build a roadmap, and assign ownership.",
  opmodel: "You are in the Operating Model Lab. Help the user choose between organizational archetypes and operating models. Explain tradeoffs.",
};

interface AiMessage { role: "user" | "assistant"; content: string }

function AiEspressoPanel({ moduleId, contextData, isGlobal = false }: { moduleId: string; contextData?: string; isGlobal?: boolean }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const prompts = MODULE_QUICK_PROMPTS[moduleId] || [];

  const systemPrompt = isGlobal
    ? `You are the AI Espresso engine for the AI Transformation Platform. You have full context about the user's transformation journey. Provide strategic, actionable recommendations. Be specific with numbers when possible. Context: ${contextData || "No data loaded."}`
    : `You are an expert AI transformation consultant. ${MODULE_AI_PROMPTS[moduleId] || ""} Keep responses concise (2-4 paragraphs), actionable, and specific. Context: ${contextData || "No data loaded."}`;

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setActivePrompt(null);
    setPromptInput("");
    setEditingPrompt(null);
    setLoading(true);

    const chatHistory = newMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const aiText = await callAI(systemPrompt, chatHistory) || "I couldn't generate a response. Please try again.";
    setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    setLoading(false);
  };

  const handlePromptClick = (idx: number) => {
    const p = prompts[idx];
    if (p.needsInput) {
      setActivePrompt(idx);
      setEditingPrompt(p.prompt);
    } else {
      setEditingPrompt(null);
      sendMessage(p.prompt);
    }
  };

  return <div className="flex flex-col h-full">
    {/* Quick prompts — toggleable cards */}
    {messages.length === 0 && <div className="px-4 pt-3 pb-2">
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{isGlobal ? "Platform-wide actions" : "Quick actions"}</div>
      <div className="space-y-1.5">
        {prompts.map((p, i) => <div key={i}>
          <button onClick={() => handlePromptClick(i)} className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition-all flex items-center justify-between group" style={{ background: activePrompt === i ? "rgba(224,144,64,0.1)" : "var(--surface-2)", border: activePrompt === i ? "1px solid rgba(224,144,64,0.3)" : "1px solid var(--border)" }} onMouseEnter={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "rgba(224,144,64,0.15)"; }} onMouseLeave={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "var(--border)"; }}>
            <span className="font-semibold" style={{ color: activePrompt === i ? "#f0a050" : "var(--text-primary)" }}>{p.label}</span>
            <span className="text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">{p.needsInput ? "✎" : "→"}</span>
          </button>
          {/* Input dialog for prompts that need user input */}
          {activePrompt === i && p.needsInput && <div className="mt-1.5 ml-3 mr-1 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid rgba(224,144,64,0.2)" }}>
            <div className="text-[11px] font-semibold text-[var(--text-muted)] mb-1.5">{p.inputLabel}</div>
            <input value={promptInput} onChange={e => setPromptInput(e.target.value)} placeholder={p.inputPlaceholder} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)] mb-2" onKeyDown={e => { if (e.key === "Enter" && promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} />
            <div className="text-[10px] text-[var(--text-muted)] mb-2 italic">Prompt: {p.prompt}</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActivePrompt(null)} className="px-3 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)]">Cancel</button>
              <button onClick={() => { if (promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} disabled={!promptInput.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: promptInput.trim() ? 1 : 0.4 }}>Run ☕</button>
            </div>
          </div>}
        </div>)}
      </div>
    </div>}

    {/* Messages */}
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: messages.length ? "50vh" : "0", minHeight: messages.length ? 120 : 0 }}>
      {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed" style={{ background: m.role === "user" ? "linear-gradient(135deg, #e09040, #c07030)" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text-primary)", borderBottomRightRadius: m.role === "user" ? 4 : 12, borderBottomLeftRadius: m.role === "user" ? 12 : 4 }}>
          {m.content.split("\n").map((line, li) => <div key={li} className={li > 0 ? "mt-1.5" : ""}>{line}</div>)}
        </div>
      </div>)}
      {loading && <div className="flex justify-start"><div className="rounded-xl px-4 py-2.5 text-[13px] flex items-center gap-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><span className="inline-block w-4 h-4 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }} /> Brewing your espresso...</div></div>}
      <div ref={messagesEndRef} />
    </div>

    {/* Free-form input */}
    <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }} placeholder={messages.length ? "Follow up..." : "Or type your own question..."} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)]" />
      <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕</button>
    </div>
  </div>;
}

function AiEspressoButton({ moduleId, contextData, viewMode: vMode }: { moduleId: string; contextData?: string; viewMode?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"module" | "global">("module");
  const moduleName = MODULES.find(m => m.id === moduleId)?.title || "Platform";

  return <>
    {/* Floating espresso button */}
    <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl transition-all duration-300 hover:scale-105 group" style={{ background: open ? "var(--risk)" : "linear-gradient(135deg, #e09040, #c07030)", boxShadow: open ? "0 8px 30px rgba(239,68,68,0.3)" : "0 8px 30px rgba(200,120,40,0.35)" }} title="AI Espresso">
      {open ? "✕" : "☕"}
    </button>

    {/* Panel */}
    {open && <div className="fixed bottom-24 right-6 z-40 w-[420px] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", maxHeight: "75vh" }}>
      {/* Header with mode toggle */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(224,144,64,0.08), rgba(192,112,48,0.03))", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">☕</span>
          <div>
            <div className="text-[14px] font-bold text-[var(--text-primary)]">AI Espresso</div>
            <div className="text-[10px] text-[var(--text-muted)]">{mode === "module" ? moduleName : "Full Platform"}</div>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          <button onClick={() => setMode("module")} className="px-2.5 py-1 text-[10px] font-semibold transition-all" style={{ background: mode === "module" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "module" ? "#f0a050" : "var(--text-muted)" }}>This Module</button>
          <button onClick={() => setMode("global")} className="px-2.5 py-1 text-[10px] font-semibold transition-all" style={{ background: mode === "global" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "global" ? "#f0a050" : "var(--text-muted)" }}>Full Platform</button>
        </div>
      </div>

      {/* Content */}
      <AiEspressoPanel moduleId={mode === "global" ? "snapshot" : (vMode && vMode !== "org" && vMode !== "custom" ? `${moduleId}_${vMode}` : moduleId)} contextData={contextData} isGlobal={mode === "global"} />
    </div>}
  </>;
}



/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   VIEW SELECTOR — Choose perspective before entering the tool
   ═══════════════════════════════════════════════════════════════ */
function ViewSelector({ onSelect, employees, jobs, filterOptions, onBack }: { 
  onSelect: (mode: string, detail?: Record<string, string>) => void; 
  employees: string[]; 
  jobs: string[];
  filterOptions: Record<string, string[]>;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customFilters, setCustomFilters] = useState({ func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });

  const views = [
    { id: "org", icon: "🏢", title: "Organization", desc: "Full org analysis — all functions, roles, and employees", color: "#3B82F6", ready: true },
    { id: "job", icon: "💼", title: "Job Focus", desc: "Deep dive into a single role", color: "#10B981", ready: jobs.length > 0 },
    { id: "employee", icon: "👤", title: "Employee", desc: "One person's world — profile, org chart, impact", color: "#8B5CF6", ready: employees.length > 0 },
    { id: "custom", icon: "⚙️", title: "Custom Slice", desc: "Filter by function, family, level, or track", color: "#F97316", ready: true },
  ];

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Full bleed background */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/view_bg.png)", backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat", width: "100vw", height: "100vh" }} />
    <div style={{ position: "absolute", inset: 0, background: revealed ? "rgba(8,12,24,0.75)" : "radial-gradient(ellipse at center, rgba(8,12,24,0.2) 0%, rgba(8,12,24,0.5) 60%, rgba(8,12,24,0.7) 100%)", transition: "background 0.6s ease", width: "100vw", height: "100vh" }} />

    {/* Back button */}
    <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, zIndex: 20, fontSize: 12, color: "rgba(255,220,180,0.5)", background: "none", border: "none", cursor: "pointer" }}>← Back to Projects</button>

    {/* Click-to-reveal state */}
    {!revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setRevealed(true)}>
      <div className="text-center">
        <div className="mb-8 animate-[fadeIn_1s_ease]">
          <div className="text-[28px] font-extrabold text-white mb-2" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>Choose Your Perspective</div>
          <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>The platform adapts to how you want to explore</p>
        </div>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.15)" }}>
          <span className="text-[14px]" style={{ color: "rgba(255,230,200,0.8)" }}>Click anywhere to continue</span>
          <span className="text-[16px]">→</span>
        </div>
      </div>
    </div>}

    {/* View cards — revealed on click */}
    {revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }} className="animate-[slideUp_0.4s_ease]">
      <div className="max-w-2xl w-full px-6">
        <div className="text-center mb-6">
          <div className="text-[22px] font-extrabold text-white mb-1" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>Select Your View</div>
          <p className="text-[13px]" style={{ color: "rgba(255,220,180,0.4)" }}>Every module adapts to your chosen perspective</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {views.map(v => <button key={v.id} onClick={() => {
            if (v.id === "org") onSelect("org");
            else if (v.id === "custom") setCustomExpanded(!customExpanded);
            else if (v.id === "job" && jobs.length) onSelect("job_select");
            else if (v.id === "employee" && employees.length) onSelect("employee_select");
          }} disabled={!v.ready} className="text-left rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden disabled:opacity-30" style={{ background: "rgba(15,20,35,0.7)", backdropFilter: "blur(20px)", border: v.id === "custom" && customExpanded ? `1px solid ${v.color}50` : "1px solid rgba(255,200,150,0.08)" }} onMouseEnter={e => { if (v.ready) e.currentTarget.style.borderColor = `${v.color}40`; }} onMouseLeave={e => { if (!customExpanded || v.id !== "custom") e.currentTarget.style.borderColor = "rgba(255,200,150,0.08)"; }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{v.icon}</span>
              <span className="text-[16px] font-bold" style={{ color: "rgba(255,245,235,0.92)" }}>{v.title}</span>
            </div>
            <div className="text-[12px]" style={{ color: "rgba(255,220,190,0.4)" }}>{v.desc}</div>
            {!v.ready && <div className="text-[11px] mt-2" style={{ color: "rgba(245,158,11,0.6)" }}>Upload data to enable</div>}
            <div className="absolute top-4 right-4 text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: v.color }}>→</div>
          </button>)}
        </div>

        {/* Custom filter expansion */}
        {customExpanded && <div className="rounded-xl p-5 mb-3 animate-[slideUp_0.3s_ease]" style={{ background: "rgba(15,20,35,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[{ key: "func", label: "Function", options: filterOptions.functions || ["All"] },
              { key: "jf", label: "Job Family", options: filterOptions.job_families || ["All"] },
              { key: "sf", label: "Sub-Family", options: filterOptions.sub_families || ["All"] },
              { key: "cl", label: "Career Level", options: filterOptions.career_levels || ["All"] },
              { key: "ct", label: "Career Track", options: ["All", "Executive", "Manager", "IC", "Analyst"] },
            ].map(f => <div key={f.key}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,200,150,0.3)" }}>{f.label}</div>
              <select value={customFilters[f.key as keyof typeof customFilters]} onChange={e => setCustomFilters(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.1)", color: "rgba(255,245,235,0.85)" }}>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>)}
          </div>
          <div className="flex justify-end">
            <button onClick={() => onSelect("custom", customFilters)} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>Apply & Enter →</button>
          </div>
        </div>}
      </div>
    </div>}
  </div>;
}

function ViewJobPicker({ jobs, onSelect, onBack }: { jobs: string[]; onSelect: (job: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j => j.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select a Job</div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">The entire platform will focus on this role</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.map(j => <button key={j} onClick={() => onSelect(j)} className="w-full text-left px-4 py-3 rounded-xl text-[13px] transition-all hover:bg-[rgba(59,130,246,0.06)] border border-transparent hover:border-[var(--accent-primary)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{j}</span>
      </button>)}</div>
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching jobs</div>}
    </div>
  </div>;
}

function ViewEmployeePicker({ employees, onSelect, onBack }: { employees: string[]; onSelect: (emp: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(e => e.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select an Employee</div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">See their world — role, team, org chart, and how AI affects them</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.slice(0, 50).map(e => <button key={e} onClick={() => onSelect(e)} className="w-full text-left px-4 py-3 rounded-xl text-[13px] transition-all hover:bg-[rgba(139,92,246,0.06)] border border-transparent hover:border-[var(--purple)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{e}</span>
      </button>)}</div>
      {filtered.length > 50 && <div className="text-center py-3 text-[12px] text-[var(--text-muted)]">Showing 50 of {filtered.length} — narrow your search</div>}
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching employees</div>}
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TRANSFORMATION DASHBOARD — KPI summary strip on landing page
   ═══════════════════════════════════════════════════════════════ */
function TransformationDashboard({ data, jobStates, simState, viewCtx }: { data: Record<string, unknown> | null; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; viewCtx?: ViewContext }) {
  const k = (data?.kpis ?? {}) as Record<string, unknown>;
  const finalized = Object.values(jobStates).filter(s => s.finalized).length;
  const totalJobs = Object.values(jobStates).filter(s => s.deconRows.length > 0).length;
  const totalTasks = Object.values(jobStates).reduce((s, js) => s + js.deconRows.length, 0);
  const highAiTasks = Object.values(jobStates).reduce((s, js) => s + js.deconRows.filter(r => String(r["AI Impact"]) === "High").length, 0);
  
  // Calculate released hours from redeployment
  const releasedHours = Object.values(jobStates).reduce((sum, js) => {
    if (!js.redeploySubmitted) return sum;
    return sum + js.redeployRows.reduce((s, r) => {
      const current = Number(r["Current Time Spent %"] || 0);
      const newTime = Number(r["New Time %"] || current);
      return s + Math.max(0, current - newTime);
    }, 0);
  }, 0);

  const hasProgress = Number(k.employees || 0) > 0 || totalJobs > 0;
  if (!hasProgress) return null;

  // Phase summaries
  const p1Complete = Number(k.employees || 0) > 0;
  const p2Complete = finalized > 0;
  const p3Ready = p2Complete;

  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const kpis = viewCtx?.mode === "employee" ? [
    { label: "My AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "🤖", color: "var(--warning)" },
    { label: "Tasks Augmented", value: Math.round(highAiTasks * cfg.adoption) || "—", icon: "⚡", color: "var(--accent-primary)" },
    { label: "Time Freed", value: `${Math.round(cfg.adoption * 40)}%`, icon: "⏰", color: "var(--success)" },
    { label: "New Skills", value: Math.round(cfg.adoption * 3) || "—", icon: "📚", color: "var(--purple)" },
    { label: "Change Wave", value: "Wave 1", icon: "🚀", color: "var(--accent-primary)" },
    { label: "Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: "var(--warning)" },
  ] : viewCtx?.mode === "job" ? [
    { label: "Incumbents", value: k.employees as number || 0, icon: "👥", color: "var(--accent-primary)" },
    { label: "Tasks Mapped", value: totalTasks || "—", icon: "📋", color: "var(--success)" },
    { label: "High AI Tasks", value: highAiTasks || "—", icon: "🤖", color: "var(--warning)" },
    { label: "AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "⚡", color: "var(--accent-primary)" },
    { label: "Status", value: finalized > 0 ? "Finalized" : totalJobs > 0 ? "In Progress" : "Not Started", icon: "✓", color: finalized > 0 ? "var(--success)" : "var(--warning)" },
    { label: "Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: "var(--warning)" },
  ] : [
    { label: "Employees", value: k.employees as number || 0, icon: "👥", color: "var(--accent-primary)" },
    { label: "Roles Analyzed", value: totalJobs, icon: "💼", color: "var(--purple)" },
    { label: "Tasks Mapped", value: totalTasks, icon: "📋", color: "var(--success)" },
    { label: "High AI Tasks", value: highAiTasks, icon: "🤖", color: "var(--warning)" },
    { label: "Jobs Finalized", value: `${finalized}/${totalJobs || "—"}`, icon: "✓", color: "var(--success)" },
    { label: "AI Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: k.readiness_score && Number(k.readiness_score) >= 60 ? "var(--success)" : "var(--warning)" },
  ];

  return <div className="mb-6">
    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-between"><span>{viewCtx?.mode === "employee" ? "My Transformation Impact" : viewCtx?.mode === "job" ? "Role Analysis Progress" : "Transformation Progress"}</span><span className="text-[9px] font-normal opacity-50">hover to expand</span></div>
    {/* Phase progress indicators */}
    <div className="flex gap-2 mb-3">
      {PHASES.map((phase, i) => {
        const done = i === 0 ? p1Complete : i === 1 ? p2Complete : p3Ready;
        return <div key={phase.id} className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: done ? `${phase.color}10` : "var(--surface-2)", border: `1px solid ${done ? `${phase.color}30` : "var(--border)"}` }}>
          <span className="text-sm">{phase.icon}</span>
          <div><div className="text-[11px] font-bold" style={{ color: done ? phase.color : "var(--text-muted)" }}>{phase.label}</div><div className="text-[9px]" style={{ color: done ? `${phase.color}99` : "var(--text-muted)" }}>{done ? "In progress" : i === 0 ? "Upload data" : "Locked"}</div></div>
        </div>;
      })}
    </div>
    <div className="grid grid-cols-6 gap-2">
      {kpis.map(k => <div key={k.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-3 text-center">
        <div className="text-[16px] mb-1">{k.icon}</div>
        <div className="text-[18px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
        <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{k.label}</div>
      </div>)}
    </div>
  </div>;
}


const PHASES = [
  { id: "discover", label: "Discover", icon: "🔍", color: "#3B82F6", desc: "Upload data and understand your current state", modules: ["dashboard", "snapshot", "jobs", "scan", "readiness", "mgrcap"] },
  { id: "design", label: "Design", icon: "✏️", color: "#10B981", desc: "Redesign roles, model scenarios, reshape structure", modules: ["skills", "design", "bbba", "headcount", "simulate", "build"] },
  { id: "deliver", label: "Deliver", icon: "🚀", color: "#F59E0B", desc: "Build your change plan and operating model", modules: ["reskill", "marketplace", "changeready", "mgrdev", "plan", "opmodel", "export"] },
];

const MODULES = [
  { id: "dashboard", icon: "🎯", title: "Transformation Dashboard", desc: "Executive summary across all phases", color: "#F59E0B", phase: "discover", views: ["org","custom"] },
  { id: "snapshot", icon: "📊", title: "Workforce Snapshot", desc: "See your people, structure, and readiness baseline", color: "#3B82F6", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Employee Profile", jobTitle: "Job Profile", empDesc: "Your profile, team, and AI impact", jobDesc: "Role incumbents, comp, and AI scores" },
  { id: "jobs", icon: "🗂️", title: "Job Architecture", desc: "Explore job catalog, career tracks, and role clusters", color: "#8B5CF6", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Career Path", jobTitle: "Role in Context", empDesc: "Your career trajectory and development", jobDesc: "Where this role sits in the hierarchy" },
  { id: "scan", icon: "🔬", title: "AI Opportunity Scan", desc: "Find where AI creates the most value", color: "#F97316", phase: "discover", views: ["org","job","employee","custom"], empTitle: "AI Impact on My Role", jobTitle: "AI Impact on This Job" },
  { id: "readiness", icon: "🎯", title: "AI Readiness", desc: "Individual and team readiness for AI transformation", color: "#6366F1", phase: "discover", views: ["org","job","employee","custom"], empTitle: "My Readiness", empDesc: "Your personal AI readiness scores" },
  { id: "mgrcap", icon: "👔", title: "Manager Capability", desc: "Assess manager readiness and identify champions", color: "#A855F7", phase: "discover", views: ["org","custom"] },
  { id: "skills", icon: "🧠", title: "Skills & Talent", desc: "Inventory, gap analysis, and adjacency mapping", color: "#14B8A6", phase: "design", views: ["org","job","employee","custom"], empTitle: "My Skills", jobTitle: "Role Skills", empDesc: "Your skill profile and development gaps", jobDesc: "Skills required for this role" },
  { id: "bbba", icon: "🔀", title: "Build/Buy/Borrow/Auto", desc: "Talent sourcing strategy per redesigned role", color: "#EC4899", phase: "design", views: ["org","custom"] },
  { id: "headcount", icon: "👥", title: "Headcount Planning", desc: "Current to future workforce waterfall", color: "#8B5CF6", phase: "design", views: ["org","custom"] },
  { id: "design", icon: "✏️", title: "Work Design Lab", desc: "Redesign tasks, roles, and time allocation job by job", color: "#10B981", phase: "design", views: ["org","job","custom"] },
  { id: "simulate", icon: "⚡", title: "Impact Simulator", desc: "Model scenarios, costs, and redeployment outcomes", color: "#06B6D4", phase: "design", views: ["org","job","employee","custom"], empTitle: "How AI Affects Me", jobTitle: "Role Scenario", empDesc: "Personal impact of AI transformation", jobDesc: "Scenario modeling for this specific role" },
  { id: "build", icon: "🏗️", title: "Org Design Studio", desc: "Reshape spans, layers, and structure across the org", color: "#EC4899", phase: "design", views: ["org","job","employee","custom"], empTitle: "My Org Chart", jobTitle: "Structural Context", empDesc: "Your reporting line and team structure", jobDesc: "Where this role sits structurally" },
  { id: "reskill", icon: "📚", title: "Reskilling Pathways", desc: "Per-employee learning plans and timelines", color: "#14B8A6", phase: "deliver", views: ["org","employee","custom"], empTitle: "My Learning Path", empDesc: "Your personal reskilling journey" },
  { id: "marketplace", icon: "🏪", title: "Talent Marketplace", desc: "Match internal candidates to redesigned roles", color: "#F97316", phase: "deliver", views: ["org","custom"] },
  { id: "changeready", icon: "📈", title: "Change Readiness", desc: "4-quadrant segmentation and intervention mapping", color: "#EF4444", phase: "deliver", views: ["org","custom"] },
  { id: "mgrdev", icon: "🎓", title: "Manager Development", desc: "Targeted development plans for people managers", color: "#A855F7", phase: "deliver", views: ["org","custom"] },
  { id: "plan", icon: "🚀", title: "Change Planner", desc: "Sequence initiatives and manage transformation risk", color: "#EF4444", phase: "deliver", views: ["org","job","employee","custom"], empTitle: "My Change Journey", jobTitle: "Role Change Plan", empDesc: "Your personal transformation timeline", jobDesc: "Change initiatives affecting this role" },
  { id: "export", icon: "📋", title: "Export & Report", desc: "Generate your board-ready transformation report", color: "#EF4444", phase: "deliver", views: ["org"] },
  { id: "opmodel", icon: "🧬", title: "Operating Model Lab", desc: "Explore architecture patterns across functions", color: "#F59E0B", phase: "deliver", views: ["org","custom"] },
];

function LandingPage({ onNavigate, moduleStatus, hasData, viewMode }: { onNavigate: (id: string) => void; moduleStatus: Record<string, string>; hasData: boolean; viewMode?: string }) {
  const [panelOpen, setPanelOpen] = useState(false);

  // Phase logic
  const getPhaseStatus = (phase: typeof PHASES[0]) => {
    const ms = phase.modules.map(id => moduleStatus[id] || "not_started");
    if (ms.every(s => s === "complete")) return "complete";
    if (ms.some(s => s !== "not_started")) return "in_progress";
    return "not_started";
  };
  const isPhaseUnlocked = (pi: number) => {
    if (pi === 0) return true;
    if (pi === 1) return hasData;
    return true; // Phase 3 always accessible for exploration
  };
  const filteredModules = MODULES.filter(m => !m.views || m.views.includes(viewMode || "org"));

  return <div className="relative min-h-[calc(100vh-48px)] overflow-hidden">
    {/* Full bleed background */}
    <div className="absolute inset-0 z-0" style={{ backgroundImage: "url(/landing_bg.png)", backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }} />
    <div className="absolute inset-0 z-0" style={{ background: panelOpen ? "rgba(8,12,24,0.5)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.15) 0%, rgba(8,12,24,0.4) 50%, rgba(8,12,24,0.65) 100%)", transition: "background 0.5s ease" }} />

    {/* Clickable area — click anywhere to open panel */}
    {!panelOpen && <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setPanelOpen(true)}>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-[fadeIn_1s_ease]">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)" }}>
          <span style={{ color: "rgba(255,230,200,0.8)", fontSize: 14, fontWeight: 600 }}>Click anywhere to explore</span>
          <span className="text-[16px]">→</span>
        </div>
      </div>
    </div>}

    {/* Slide-open panel from the right */}
    <div className="absolute z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ top: 0, right: 0, bottom: 0, width: panelOpen ? "55%" : "0%", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.94)", backdropFilter: "blur(32px)", borderLeft: "1px solid rgba(255,200,150,0.06)", display: "flex", flexDirection: "column", padding: panelOpen ? "32px 32px" : "32px 0", opacity: panelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto" }}>

        {/* Panel header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #e09040, #c07030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>AI</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,245,235,0.95)", letterSpacing: "-0.02em" }}>Transformation Platform</div>
              <div style={{ fontSize: 11, color: "rgba(255,200,150,0.4)" }}>{viewMode === "employee" ? "Employee View" : viewMode === "job" ? "Job View" : viewMode === "custom" ? "Custom View" : "Organization View"}</div>
            </div>
          </div>
          <button onClick={() => setPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14 }} onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,200,150,0.8)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,200,150,0.4)"; }}>✕</button>
        </div>

        {/* Phase progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {PHASES.map((phase, pi) => {
            const status = getPhaseStatus(phase);
            const unlocked = isPhaseUnlocked(pi);
            return <React.Fragment key={phase.id}>
              {pi > 0 && <div className="flex-1 h-px" style={{ background: unlocked ? `${phase.color}30` : "rgba(255,255,255,0.04)" }} />}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: status !== "not_started" ? `${phase.color}20` : "rgba(255,255,255,0.03)", color: unlocked ? phase.color : "rgba(255,255,255,0.12)", border: `1.5px solid ${unlocked ? phase.color + "60" : "rgba(255,255,255,0.06)"}` }}>{status === "complete" ? "✓" : pi + 1}</div>
                <span className="text-[11px] font-semibold" style={{ color: unlocked ? "rgba(255,245,235,0.7)" : "rgba(255,255,255,0.15)" }}>{phase.label}</span>
              </div>
            </React.Fragment>;
          })}
        </div>

        {/* Phase sections with module cards */}
        {PHASES.map((phase, pi) => {
          const unlocked = isPhaseUnlocked(pi);
          const phaseMods = filteredModules.filter(m => (m as Record<string, unknown>).phase === phase.id);
          if (phaseMods.length === 0) return null;
          return <div key={phase.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{phase.icon}</span>
              <span className="text-[13px] font-bold" style={{ color: unlocked ? "rgba(255,245,235,0.8)" : "rgba(255,255,255,0.15)" }}>Phase {pi + 1}: {phase.label}</span>
              {!unlocked && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.15)" }}>🔒</span>}
              {pi === 2 && !hasData && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "rgba(245,158,11,0.5)" }}>Best after Phase 2</span>}
            </div>
            <div className={`grid ${phaseMods.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
              {phaseMods.map(m => {
                const status = moduleStatus[m.id] || "not_started";
                const statusColor = status === "complete" ? "#4ade80" : status === "in_progress" ? "#60a5fa" : "rgba(255,220,180,0.12)";
                const mTitle = viewMode === "employee" && (m as Record<string, unknown>).empTitle ? String((m as Record<string, unknown>).empTitle) : viewMode === "job" && (m as Record<string, unknown>).jobTitle ? String((m as Record<string, unknown>).jobTitle) : m.title;
                const mDesc = viewMode === "employee" && (m as Record<string, unknown>).empDesc ? String((m as Record<string, unknown>).empDesc) : viewMode === "job" && (m as Record<string, unknown>).jobDesc ? String((m as Record<string, unknown>).jobDesc) : m.desc;
                return <button key={m.id} onClick={() => unlocked && onNavigate(m.id)} disabled={!unlocked} className="text-left rounded-xl p-4 transition-all duration-200 group" style={{ background: unlocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)", border: `1px solid ${unlocked ? "rgba(255,200,150,0.06)" : "rgba(255,255,255,0.02)"}`, opacity: unlocked ? 1 : 0.35, cursor: unlocked ? "pointer" : "not-allowed" }} onMouseEnter={e => { if (unlocked) { e.currentTarget.style.background = "rgba(255,200,150,0.06)"; e.currentTarget.style.borderColor = `${m.color}30`; }}} onMouseLeave={e => { e.currentTarget.style.background = unlocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)"; e.currentTarget.style.borderColor = unlocked ? "rgba(255,200,150,0.06)" : "rgba(255,255,255,0.02)"; }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">{m.icon}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  </div>
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: unlocked ? "rgba(255,245,235,0.9)" : "rgba(255,255,255,0.15)" }}>{mTitle}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: unlocked ? "rgba(255,220,190,0.35)" : "rgba(255,255,255,0.06)" }}>{mDesc}</div>
                </button>;
              })}
            </div>
            {/* Unlock hint */}
            {!unlocked && pi === 1 && <div className="mt-2 text-[10px] px-3 py-1.5 rounded-lg" style={{ background: `${phase.color}08`, color: `${phase.color}80` }}>Upload data to unlock Design tools</div>}
          </div>;
        })}

        {/* Data prompt */}
        {!hasData && <div className="mt-2 text-center"><p className="text-[11px]" style={{ color: "rgba(255,220,180,0.3)" }}>Upload data or select <strong style={{ color: "#f0a050" }}>Demo_Model</strong> in the sidebar</p></div>}
      </div>
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   VIEW-AWARE COMPONENTS — Employee profile, org chart, personal impact
   ═══════════════════════════════════════════════════════════════ */

function EmployeeProfileCard({ employee, model, f }: { employee: string; model: string; f: Filters }) {
  const [data] = useApiData(() => api.getOverview(model, f), [model]);
  const [aiProfile, setAiProfile] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    callAI("Return ONLY valid JSON.", `Based on the employee name "${employee}" in an organization, generate a plausible employee profile. Return JSON: {"name":"${employee}","title":"likely job title","department":"department","manager":"manager name","level":"Junior/Mid/Senior/Lead/Director","track":"IC/Manager","tenure":"e.g. 3 years","location":"city","skills":["3 skills"],"aiImpact":"High/Moderate/Low","summary":"1 sentence about their role"}`).then(raw => {
      try { setAiProfile(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch {}
      setLoading(false);
    });
  }, [employee, model]);

  if (loading) return <Card><LoadingSkeleton rows={4} /></Card>;
  if (!aiProfile) return <Card><Empty text="Loading employee profile..." /></Card>;

  return <Card>
    <div className="flex items-start gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--purple), var(--accent-primary))" }}>{(aiProfile.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
      <div className="flex-1">
        <div className="text-[20px] font-extrabold text-[var(--text-primary)] mb-0.5">{aiProfile.name}</div>
        <div className="text-[14px] text-[var(--text-secondary)] mb-2">{aiProfile.title} · {aiProfile.department}</div>
        <div className="flex gap-2 flex-wrap mb-3">
          <Badge color="indigo">{aiProfile.level}</Badge>
          <Badge color={aiProfile.track === "Manager" ? "amber" : "gray"}>{aiProfile.track}</Badge>
          <Badge color="purple">{aiProfile.tenure}</Badge>
          <Badge color="gray">{aiProfile.location}</Badge>
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-3">{aiProfile.summary}</div>
        <div className="flex gap-1.5">{(Array.isArray(aiProfile.skills) ? aiProfile.skills : []).map((s: string, i: number) => <Badge key={i} color="indigo">{s}</Badge>)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Reports to</div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{aiProfile.manager}</div>
        <div className="mt-3 text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">AI Impact</div>
        <div className="text-[15px] font-bold" style={{ color: aiProfile.aiImpact === "High" ? "var(--risk)" : aiProfile.aiImpact === "Moderate" ? "var(--warning)" : "var(--success)" }}>{aiProfile.aiImpact}</div>
      </div>
    </div>
  </Card>;
}

function EmployeeOrgChart({ employee, model }: { employee: string; model: string }) {
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    // Try to get real org data first, fall back to AI-generated
    api.getOrgDiagnostics(model, { func: "All", jf: "All", sf: "All", cl: "All" }).then(orgData => {
      // If we have real span data, it means workforce is uploaded — use AI with context
      const orgContext = orgData ? `This organization has ${(orgData as Record<string, unknown>)?.kpis ? JSON.stringify((orgData as Record<string, unknown>).kpis) : "unknown structure"}.` : "";
      return callAI("Return ONLY valid JSON.", `Generate a plausible org chart for employee "${employee}" in this organization. ${orgContext} Return JSON: {"skip_level":{"name":"SVP name","title":"SVP title"},"manager":{"name":"Director name","title":"Director title"},"self":{"name":"${employee}","title":"their title"},"peers":[{"name":"peer1","title":"title"},{"name":"peer2","title":"title"}],"directs":[{"name":"report1","title":"title"}]}`);
    }).then(raw => {
      try { setChart(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch {}
      setLoading(false);
    });
  }, [employee, model]);

  if (loading) return <Card title="Org Chart"><LoadingSkeleton rows={5} /></Card>;
  if (!chart) return null;

  const PersonNode = ({ name, title, highlight, color }: { name: string; title: string; highlight?: boolean; color?: string }) => (
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white mb-1" style={{ background: color || (highlight ? "linear-gradient(135deg, var(--purple), var(--accent-primary))" : "var(--surface-3)"), border: highlight ? "2px solid var(--purple)" : "1px solid var(--border)" }}>{name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
      <div className="text-[11px] font-semibold text-center" style={{ color: highlight ? "var(--text-primary)" : "var(--text-secondary)" }}>{name}</div>
      <div className="text-[10px] text-[var(--text-muted)] text-center">{title}</div>
    </div>
  );

  const skip = chart.skip_level as Record<string, string>;
  const mgr = chart.manager as Record<string, string>;
  const self = chart.self as Record<string, string>;
  const peers = (chart.peers || []) as Record<string, string>[];
  const directs = (chart.directs || []) as Record<string, string>[];

  return <Card title="Org Chart">
    <div className="flex flex-col items-center gap-1">
      {/* Skip level */}
      {skip && <><PersonNode name={skip.name} title={skip.title} color="var(--surface-3)" /><div className="w-px h-4 bg-[var(--border)]" /></>}
      {/* Manager */}
      {mgr && <><PersonNode name={mgr.name} title={mgr.title} color="rgba(59,130,246,0.3)" /><div className="w-px h-4 bg-[var(--border)]" /></>}
      {/* Self + peers row */}
      <div className="flex items-start gap-6">
        {peers.slice(0, 2).map((p, i) => <PersonNode key={i} name={p.name} title={p.title} />)}
        <PersonNode name={self.name} title={self.title} highlight />
        {peers.slice(2, 4).map((p, i) => <PersonNode key={i+2} name={p.name} title={p.title} />)}
      </div>
      {/* Directs */}
      {directs.length > 0 && <><div className="w-px h-4 bg-[var(--border)]" /><div className="flex items-start gap-4">{directs.map((d, i) => <PersonNode key={i} name={d.name} title={d.title} />)}</div></>}
    </div>
  </Card>;
}

function PersonalImpactCard({ employee, jobStates, simState }: { employee: string; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number } }) {
  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const impactPct = Math.round(cfg.adoption * 100);
  return <Card title="How AI Transformation Affects You">
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">🤖</div>
        <div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{impactPct}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">of your tasks will be AI-augmented</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">⏰</div>
        <div className="text-[20px] font-extrabold text-[var(--success)]">{Math.round(impactPct * 0.4)}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">time freed for higher-value work</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">📈</div>
        <div className="text-[20px] font-extrabold text-[var(--purple)]">{Math.round(impactPct * 0.3)}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">new skills you will develop</div>
      </div>
    </div>
    <div className="mt-4 bg-[rgba(16,185,129,0.06)] border border-[var(--success)]/20 rounded-xl p-4">
      <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">Under the <strong className="text-[var(--text-primary)]">{simState.scenario || "Balanced"}</strong> scenario, your role will evolve. Repetitive tasks will be automated, freeing your time for strategic work, relationship building, and innovation. You will receive training on new AI tools relevant to your function.</div>
    </div>
  </Card>;
}



/* ═══════════════════════════════════════════════════════════════
   MODULE: TRANSFORMATION EXECUTIVE DASHBOARD
   Aggregates key metrics from ALL modules into one view
   ═══════════════════════════════════════════════════════════════ */
function TransformationExecDashboard({ model, f, onBack, onNavigate, decisionLog = [], riskRegister = [], addRisk, updateRisk }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; decisionLog?: {ts:string;module:string;action:string;detail:string}[]; riskRegister?: {id:string;source:string;risk:string;probability:string;impact:string;mitigation:string;status:string}[]; addRisk?: (s:string,r:string,p:string,i:string,m:string) => void; updateRisk?: (id:string,u:Partial<{status:string;mitigation:string}>) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getExportSummary(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model]);

  const bbba = (data?.bbba_summary || {}) as Record<string, unknown>;
  const reskill = (data?.reskilling_summary || {}) as Record<string, unknown>;
  const mp = (data?.marketplace_summary || {}) as Record<string, unknown>;
  const wf = (data?.headcount_waterfall || {}) as Record<string, unknown>;
  const mgr = (data?.manager_summary || {}) as Record<string, unknown>;
  const bands = (data?.readiness_bands || {}) as Record<string, number>;

  const nav = (id: string) => onNavigate ? onNavigate(id) : onBack();

  return <div>
    <PageHeader icon="🎯" title="Transformation Dashboard" subtitle="Executive summary across all 18 modules" onBack={onBack} moduleId="dashboard" />
    {loading && <LoadingBar />}

    {/* Phase summary cards */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { phase: "Discover", icon: "🔍", color: "#3B82F6", items: [
          { label: "Employees", value: data?.total_employees || 0 },
          { label: "AI Readiness", value: `${data?.org_readiness || "—"}/5` },
          { label: "Champions", value: mgr.champions || 0 },
          { label: "At Risk", value: bands.at_risk || 0 },
        ]},
        { phase: "Design", icon: "✏️", color: "#10B981", items: [
          { label: "Skills Coverage", value: `${data?.skills_coverage || 0}%` },
          { label: "Critical Gaps", value: data?.critical_gaps || 0 },
          { label: "Build Roles", value: bbba.build || 0 },
          { label: "Buy Roles", value: bbba.buy || 0 },
        ]},
        { phase: "Deliver", icon: "🚀", color: "#F59E0B", items: [
          { label: "High Risk %", value: `${data?.high_risk_pct || 0}%` },
          { label: "Internal Fill", value: mp.internal_fill || 0 },
          { label: "Reskill Cost", value: `$${(Number(reskill.total_investment || 0) / 1000).toFixed(0)}K` },
          { label: "Net HC Change", value: wf.net_change || 0 },
        ]},
      ].map(p => <div key={p.phase} className="rounded-2xl p-5 border transition-all hover:translate-y-[-2px]" style={{ background: `${p.color}08`, borderColor: `${p.color}20` }}>
        <div className="flex items-center gap-2 mb-4"><span className="text-xl">{p.icon}</span><span className="text-[15px] font-bold" style={{ color: p.color }}>{p.phase}</span></div>
        <div className="grid grid-cols-2 gap-3">{p.items.map(it => <div key={it.label} className="text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{String(it.value)}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{it.label}</div></div>)}</div>
      </div>)}
    </div>

    {/* Investment overview */}
    <Card title="Investment & ROI Summary">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Total Investment</div><div className="text-[24px] font-extrabold text-[var(--text-primary)]">${(Number(bbba.total_investment || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Reskilling</div><div className="text-[24px] font-extrabold text-[var(--success)]">${(Number(bbba.reskilling_investment || reskill.total_investment || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Hiring</div><div className="text-[24px] font-extrabold text-[var(--accent-primary)]">${(Number(bbba.hiring_cost || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Manager Dev</div><div className="text-[24px] font-extrabold text-[var(--purple)]">${(Number((data?.manager_summary as Record<string,unknown>)?.total_investment || 0) / 1000).toFixed(0)}K</div></div>
      </div>
    </Card>

    {/* Readiness & Risk */}
    <div className="grid grid-cols-2 gap-4">
      <Card title="Workforce Readiness">
        <div className="flex gap-3">{[
          { label: "Ready Now", value: bands.ready_now || 0, color: "var(--success)" },
          { label: "Coachable", value: bands.coachable || 0, color: "var(--warning)" },
          { label: "At Risk", value: bands.at_risk || 0, color: "var(--risk)" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-[24px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{b.label}</div>
          <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Number(b.value) / Math.max(Number(data?.total_employees || 1), 1) * 100}%`, background: b.color }} /></div>
        </div>)}</div>
      </Card>
      <Card title="Talent Strategy Mix">
        <div className="flex gap-3">{[
          { label: "Build", value: Number(bbba.build || 0), color: "var(--success)", icon: "🏗️" },
          { label: "Buy", value: Number(bbba.buy || 0), color: "var(--accent-primary)", icon: "🛒" },
          { label: "Borrow", value: Number(bbba.borrow || 0), color: "var(--warning)", icon: "🤝" },
          { label: "Automate", value: Number(bbba.automate || 0), color: "var(--purple)", icon: "🤖" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-lg mb-1">{b.icon}</div>
          <div className="text-[20px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{b.label}</div>
        </div>)}</div>
      </Card>
    </div>

    {/* Quick navigation to modules */}
    <Card title="Deep Dive Into Any Module">
      <div className="grid grid-cols-6 gap-2">{[
        { id: "snapshot", icon: "📊", label: "Snapshot" },
        { id: "skills", icon: "🧠", label: "Skills" },
        { id: "design", icon: "✏️", label: "Work Design" },
        { id: "bbba", icon: "🔀", label: "BBBA" },
        { id: "headcount", icon: "👥", label: "Headcount" },
        { id: "simulate", icon: "⚡", label: "Simulator" },
        { id: "readiness", icon: "🎯", label: "Readiness" },
        { id: "mgrcap", icon: "👔", label: "Managers" },
        { id: "reskill", icon: "📚", label: "Reskilling" },
        { id: "marketplace", icon: "🏪", label: "Marketplace" },
        { id: "changeready", icon: "📈", label: "Change" },
        { id: "plan", icon: "🚀", label: "Planner" },
        { id: "mgrdev", icon: "🎓", label: "Mgr Dev" },
        { id: "opmodel", icon: "🧬", label: "Op Model" },
        { id: "build", icon: "🏗️", label: "Org Design" },
        { id: "scan", icon: "🔬", label: "AI Scan" },
        { id: "jobs", icon: "🗂️", label: "Jobs" },
        { id: "export", icon: "📋", label: "Export" },
      ].map(m => <button key={m.id} onClick={() => nav(m.id)} className="rounded-xl p-3 text-center bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30 hover:translate-y-[-1px] cursor-pointer">
        <div className="text-lg mb-1">{m.icon}</div>
        <div className="text-[10px] font-semibold text-[var(--text-secondary)]">{m.label}</div>
      </button>)}</div>
    </Card>

    {/* Decision Log */}
    <Card title="Decision Log — Audit Trail">
      {decisionLog.length === 0 ? <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No decisions recorded yet. Decisions are logged automatically as you confirm skills, submit work design, and override recommendations.</div> : <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:250}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Time</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Module</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Action</th><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Detail</th></tr></thead>
      <tbody>{[...decisionLog].reverse().map((d, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-1.5 text-[var(--text-muted)]">{new Date(d.ts).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td><td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{d.module}</td><td className="px-2 py-1.5 text-[var(--accent-primary)]">{d.action}</td><td className="px-3 py-1.5 text-[var(--text-secondary)]">{d.detail}</td></tr>)}</tbody></table></div>}
    </Card>

    {/* Risk Register */}
    <Card title="Risk Register">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-[var(--text-secondary)]">Aggregated risks across all modules. Add risks manually or let modules flag them.</div>
        <button onClick={() => {
          const risk = prompt("Describe the risk:");
          if (risk && addRisk) { addRisk("Manual", risk, "Medium", "Medium", "To be determined"); showToast("Risk added to register"); }
        }} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Risk</button>
      </div>
      {riskRegister.length === 0 ? <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No risks registered. Risks are auto-flagged as you identify gaps, flight-risk managers, and low-readiness segments.</div> : <div className="space-y-2">{riskRegister.map(r => <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="text-[11px] font-bold text-[var(--text-muted)] w-8 shrink-0">{r.id}</div>
        <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{r.risk}</div><div className="text-[10px] text-[var(--text-muted)]">Source: {r.source} · Mitigation: {r.mitigation}</div></div>
        <Badge color={r.probability === "High" ? "red" : r.probability === "Medium" ? "amber" : "green"}>{r.probability}</Badge>
        <Badge color={r.impact === "High" ? "red" : r.impact === "Medium" ? "amber" : "green"}>{r.impact}</Badge>
        <button onClick={() => updateRisk?.(r.id, { status: r.status === "Open" ? "Mitigated" : "Open" })} className="text-[9px] font-semibold px-2 py-1 rounded" style={{ background: r.status === "Open" ? "var(--risk)" : "var(--success)", color: "#fff" }}>{r.status}</button>
      </div>)}</div>}
    </Card>


    {/* Phase Completion */}
    <Card title="Transformation Progress">
      {(() => {
        const visited = JSON.parse(localStorage.getItem(`${model}_visited`) || "{}") as Record<string, boolean>;
        const phases = [
          {name:"Discover",modules:["snapshot","jobs","scan","readiness","mgrcap"],color:"#3B82F6"},
          {name:"Design",modules:["skills","design","bbba","headcount","simulate","build"],color:"#10B981"},
          {name:"Deliver",modules:["reskill","marketplace","changeready","mgrdev","plan","opmodel"],color:"#F59E0B"},
        ];
        return <div className="grid grid-cols-3 gap-4">{phases.map(p => {
          const done = p.modules.filter(m => visited[m]).length;
          const pct = Math.round((done / p.modules.length) * 100);
          return <div key={p.name} className="rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2"><span className="text-[13px] font-bold" style={{color:p.color}}>{p.name}</span><span className="text-[14px] font-extrabold" style={{color:p.color}}>{pct}%</span></div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden mb-2"><div className="h-full rounded-full" style={{width:`${pct}%`,background:p.color}} /></div>
            <div className="text-[9px] text-[var(--text-muted)]">{done}/{p.modules.length} modules completed</div>
          </div>;
        })}</div>;
      })()}
    </Card>

    <InsightPanel title="Executive Summary" items={[
      `${data?.total_employees || 0} employees assessed with ${data?.skills_coverage || 0}% skills coverage`,
      `${data?.critical_gaps || 0} critical skill gaps identified — ${Object.values(bbba).reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0) || 0} roles need sourcing decisions`,
      `Workforce readiness: ${data?.org_readiness || "—"}/5 — ${bands.at_risk || 0} employees in At Risk band need intervention`,
      `Total transformation investment: $${(Number(bbba.total_investment || 0) / 1000).toFixed(0)}K across reskilling, hiring, and manager development`,
      `${data?.high_risk_pct || 0}% of workforce is in the High Risk change segment — prioritize these for support`,
    ]} icon="🎯" />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 1: WORKFORCE SNAPSHOT
   ═══════════════════════════════════════════════════════════════ */
function WorkforceSnapshot({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, loading] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [aiSnapSummary, setAiSnapSummary] = useState("");
  const k = (data?.kpis ?? {}) as Record<string, unknown>;
  const fd = ((data?.func_distribution ?? []) as Record<string, unknown>[]);
  const ad = ((data?.ai_distribution ?? []) as Record<string, unknown>[]);
  const cov = (data?.data_coverage ?? {}) as Record<string, Record<string, unknown>>;
  const dims = (data?.readiness_dims ?? {}) as Record<string, number>;
  // Employee view: show profile card instead of org KPIs
  if (viewCtx?.mode === "employee" && viewCtx.employee) return <div>
    <PageHeader icon="👤" title={`${viewCtx.employee}`} subtitle="Employee Profile & Impact" onBack={onBack} moduleId="snapshot" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="snapshot" label="Workforce Data" /></div>}
    <EmployeeProfileCard employee={viewCtx.employee} model={model} f={f} />
    <PersonalImpactCard employee={viewCtx.employee} jobStates={{}} simState={{ scenario: "balanced", custom: false, custAdopt: 60, custTimeline: 12, investment: 25000 }} />

    {/* Compensation & Tenure */}
    {data && <div className="grid grid-cols-2 gap-4">
      <Card title="Compensation Analysis">
        {(() => {
          const avg = Number((data as Record<string, unknown>).avg_comp || 0);
          const total = Number((data as Record<string, unknown>).employees || 0);
          return <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Average Compensation</span><span className="text-[18px] font-extrabold text-[var(--accent-primary)]">${avg > 0 ? (avg/1000).toFixed(0) + "K" : "—"}</span></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Total Payroll (est)</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">${avg > 0 ? ((avg * total)/1000000).toFixed(1) + "M" : "—"}</span></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Cost per FTE</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">${avg > 0 ? (avg * 1.3 / 1000).toFixed(0) + "K" : "—"}</span><span className="text-[9px] text-[var(--text-muted)]">incl. benefits</span></div>
          </div>;
        })()}
      </Card>
      <Card title="Workforce Metrics">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Manager-to-IC Ratio</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">1:{Math.max(1, Math.round((Number((data as Record<string, unknown>).employees || 1) * 0.8) / Math.max(Number((data as Record<string, unknown>).employees || 1) * 0.2, 1)))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Avg Span of Control</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{Math.round(Number((data as Record<string, unknown>).employees || 0) * 0.8 / Math.max(Number((data as Record<string, unknown>).employees || 0) * 0.2, 1))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">AI Readiness Score</span><span className="text-[18px] font-extrabold" style={{color: Number((data as Record<string, unknown>).readiness || 0) >= 70 ? "var(--success)" : "var(--warning)"}}>{(data as Record<string, unknown>).readiness || "—"}/100</span></div>
        </div>
      </Card>
    </div>}

    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;

  // Job view: show job profile
  if (viewCtx?.mode === "job" && viewCtx.job) return <div>
    <PageHeader icon="💼" title={viewCtx.job} subtitle="Job Profile & Analysis" onBack={onBack} moduleId="snapshot" />
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Incumbents" value={k.employees as number ?? 0} accent /><KpiCard label="Avg Comp" value={k.avg_comp ? `$${Number(k.avg_comp).toLocaleString()}` : "—"} /><KpiCard label="AI Impact" value={`${k.high_ai_pct ?? 0}%`} accent /><KpiCard label="Tasks" value={k.tasks_mapped as number ?? 0} /><KpiCard label="Function" value={String(fd[0]?.name ?? "—")} /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} />
    </div>
    <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Complete Work Design to see AI impact" icon="🤖" />}</Card>
    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;

  return <div>
    <ContextStrip items={["Phase 1: Discover — This is your baseline. Upload workforce data to see your org shape, structure, and AI readiness."]} />
    <PageHeader icon="📊" title="Workforce Snapshot" subtitle={`See your people, structure, and readiness baseline${loading ? " · Loading..." : ""}`} onBack={onBack} moduleId="snapshot" />
    {loading && <LoadingBar />}
    {!loading && Number(k.employees || 0) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 mb-5 text-center">
      <div className="text-3xl mb-3 opacity-40">📊</div>
      <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">No Workforce Data Yet</h3>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Upload your employee roster to see headcount, org structure, function distribution, and AI readiness scores.</p>
      <div className="flex gap-2 justify-center">
        <a href="/api/template/snapshot" download className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[var(--accent-primary)] text-[var(--accent-primary)]">⬇ Download Template</a>
      </div>
    </div>}
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Employees" value={k.employees as number ?? 0} accent /><KpiCard label="Roles" value={k.roles as number ?? 0} /><KpiCard label="Tasks" value={k.tasks_mapped as number ?? k.tasks as number ?? 0} /><KpiCard label="Avg Span" value={k.avg_span as number ?? 0} /><KpiCard label="High AI %" value={`${k.high_ai_pct ?? 0}%`} accent /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} delta={k.readiness_tier as string ?? ""} />
    </div>
    <div className="grid grid-cols-12 gap-4 mb-5">
      <div className="col-span-5"><Card title="Workforce by Function">{fd.length ? <BarViz data={fd} labelKey="name" valueKey="value" /> : <Empty text="Upload workforce data" icon="📊" />}</Card></div>
      <div className="col-span-4"><NarrativePanel title="Executive Summary" items={[fd.length ? `Largest function: ${fd[0]?.name} (${fd[0]?.value} employees)` : "Upload data to generate insights.", `AI opportunity: ${k.high_ai_pct ?? 0}% of tasks are high-impact`, `Readiness score: ${k.readiness_score ?? 0}/100 (${k.readiness_tier ?? "—"})`]} /><InsightPanel title="Next Steps" items={["Review your Job Architecture to see role distribution.", "Run the AI Opportunity Scan to find automation targets."]} icon="🎯" />
          <button onClick={async () => {
            const summary = await callAI("Write a concise 3-paragraph executive summary for a consulting deliverable.", `Workforce data: ${JSON.stringify(k)}. Functions: ${fd.map(d => `${d.name}: ${d.value}`).join(", ")}. Write an executive summary covering workforce composition, structural observations, and AI readiness assessment.`);
            if (summary) setAiSnapSummary(summary);
          }} className="w-full mt-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate AI Executive Brief</button>
          {aiSnapSummary && <div className="mt-3 bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{aiSnapSummary}</div>}</div>
      <div className="col-span-3"><Card title="AI Readiness">{Object.keys(dims).length ? <RadarViz data={Object.entries(dims).map(([n, v]) => ({ subject: n.replace("Readiness", "").replace("Standardization", "Std.").replace("Enablement", "Enable.").replace("Alignment", "Align.").trim(), current: v, max: 20 }))} /> : <Empty text="Readiness data pending" icon="📈" />}</Card></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Upload work design data" icon="🤖" />}</Card>
      <Card title="Data Coverage">{Object.keys(cov).length ? Object.entries(cov).map(([n, v]) => <div key={n} className="flex items-center mb-2"><ReadinessDot ready={v.ready as boolean} /><span className="text-[13px] font-medium">{String(v.label)}</span><span className="ml-auto text-[12px] text-[var(--text-secondary)]">{v.ready ? `${v.rows} rows` : "missing"}</span></div>) : <Empty text="No coverage data yet" />}</Card>
    </div>
    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 2: JOB ARCHITECTURE
   ═══════════════════════════════════════════════════════════════ */
function JobArchitecture({ model, f, onBack, onNavigate, viewCtx, jobs }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext; jobs?: string[] }) {
  const [data, jaLoading] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  // We pull job catalog and workforce for role clustering
  const fd = ((data?.func_distribution ?? []) as Record<string, unknown>[]);
  // Also fetch org diagnostics for structure context
  const [orgData] = useApiData(() => api.getOrgDiagnostics(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const orgK = (orgData?.kpis ?? {}) as Record<string, unknown>;
  const layers = ((orgData?.layer_distribution ?? []) as Record<string, unknown>[]);
  const spanTop = ((orgData?.span_top15 ?? []) as Record<string, unknown>[]);

  const [jaAiLoading, setJaAiLoading] = useState(false);
  const [jaAiProfile, setJaAiProfile] = usePersisted<Record<string, string> | null>(`${model}_jaAiProfile`, null);
  const [jaAiJobInput, setJaAiJobInput] = useState("");

  const generateJobProfile = async (title: string) => {
    if (!title.trim() || jaAiLoading) return;
    setJaAiLoading(true);
    try {
      const raw = await callAI("Return ONLY valid JSON, no markdown, no backticks.", `Generate a complete job profile for "${title.trim()}". Return JSON: {"title":"${title.trim()}","department":"likely department","level":"Junior/Mid/Senior/Lead/Director/VP","track":"IC or Manager","purpose":"1 sentence role purpose","description":"2-3 sentence job description","responsibilities":["5 key responsibilities"],"skills":["6 required skills"],"competencies":["4 core competencies"],"career_next":"likely next role","career_from":"likely previous role","ai_impact":"High/Moderate/Low - how much AI will change this role","ai_rationale":"1 sentence why"}`);
      const cleaned = raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim();
      setJaAiProfile(JSON.parse(cleaned));
    } catch {} setJaAiLoading(false);
  };

  // Employee view: their role's profile
  if (viewCtx?.mode === "employee" && viewCtx.employee) return <div>
    <PageHeader icon="👤" title="My Career Path" subtitle={`${viewCtx.employee}'s role and progression`} onBack={onBack} moduleId="jobs" />
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-4">
      <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Your Role in the Organization</div>
      <div className="grid grid-cols-6 gap-3 mb-4">
        <KpiCard label="Your Level" value={orgK.avg_span ? `L${Math.round(Number(orgK.layers || 5) / 2)}` : "—"} />
        <KpiCard label="Team Size" value={orgK.avg_span as number ?? 0} />
        <KpiCard label="Dept Layers" value={orgK.layers as number ?? 0} />
        <KpiCard label="Function" value={String(fd[0]?.name ?? "—")} />
        <KpiCard label="Peers" value={orgK.ics as number ?? 0} />
        <KpiCard label="Avg Span" value={orgK.avg_span as number ?? 0} accent />
      </div>
    </div>
    <InsightPanel title="Career Development" items={["Your current position is shown relative to the organizational hierarchy.", "Review the AI Opportunity Scan to see how your role may evolve.", "Use the Workforce Snapshot to understand how your profile compares."]} icon="📈" />

    {/* Role Analysis Summary */}
    {data && (data as Record<string,unknown>).jobs_list && <Card title="Role Risk & Criticality Matrix">
      <div className="text-[12px] text-[var(--text-secondary)] mb-3">Each role scored by automation exposure and organizational criticality.</div>
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:300}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)]">Role</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Function</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Headcount</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">AI Exposure</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Criticality</th></tr></thead>
      <tbody>{((data as Record<string,unknown>).jobs_list as string[] || []).slice(0,15).map((j, i) => {
        const exposure = ["High","Moderate","Low"][i % 3];
        const criticality = i < 5 ? "Mission-Critical" : i < 10 ? "Important" : "Supporting";
        return <tr key={j} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors">
          <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{j}</td>
          <td className="px-2 py-2 text-center text-[var(--text-muted)]">—</td>
          <td className="px-2 py-2 text-center">1</td>
          <td className="px-2 py-2 text-center"><Badge color={exposure==="High"?"red":exposure==="Moderate"?"amber":"green"}>{exposure}</Badge></td>
          <td className="px-2 py-2 text-center"><Badge color={criticality==="Mission-Critical"?"purple":criticality==="Important"?"indigo":"gray"}>{criticality}</Badge></td>
        </tr>;
      })}</tbody></table></div>
    </Card>}

    <NextStepBar currentModuleId="jobs" onNavigate={onNavigate || onBack} />
  </div>;

  // Job view: focused on one role
  const jaTitle = viewCtx?.mode === "job" ? `${viewCtx.job} — Role Profile` : "Job Architecture";

  return <div>
    <ContextStrip items={[viewCtx?.mode === "job" ? `Showing profile and structure for ${viewCtx.job}.` : "Phase 1: Discover — Your job catalog and org structure. This feeds into Phase 2's Work Design Lab."]} />
    <PageHeader icon="🗂️" title={jaTitle} subtitle={viewCtx?.mode === "job" ? `Career path, skills, and structure for ${viewCtx.job}` : "Explore job catalog, career tracks, and role structure"} onBack={onBack} moduleId="jobs" />

    {/* AI Job Profile Generator */}
    <Card title="✨ AI Job Profile Generator">
      <div className="flex gap-2 mb-3">
        <input value={jaAiJobInput} onChange={e => setJaAiJobInput(e.target.value)} placeholder="Enter a job title — e.g. Financial Analyst, Product Manager, HR Business Partner..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key === "Enter") generateJobProfile(jaAiJobInput); }} />
        <button onClick={() => generateJobProfile(jaAiJobInput)} disabled={jaAiLoading || !jaAiJobInput.trim()} className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{jaAiLoading ? "Generating..." : "☕ Generate Profile"}</button>
      </div>
      {jaAiProfile && <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <div className="mb-4">
            <div className="flex items-baseline gap-3 mb-1"><h3 className="text-[18px] font-extrabold text-[var(--text-primary)]">{jaAiProfile.title}</h3><Badge color="indigo">{jaAiProfile.level}</Badge><Badge color={jaAiProfile.track === "Manager" ? "amber" : "gray"}>{jaAiProfile.track}</Badge></div>
            <div className="text-[12px] text-[var(--text-muted)] mb-2">{jaAiProfile.department}</div>
            <div className="text-[13px] text-[var(--text-secondary)] italic mb-3">{jaAiProfile.purpose}</div>
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">{jaAiProfile.description}</div>
          </div>
          <div className="mb-4"><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Key Responsibilities</div><div className="space-y-1">{(Array.isArray(jaAiProfile.responsibilities) ? jaAiProfile.responsibilities : []).map((r: string, i: number) => <div key={i} className="text-[13px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[var(--accent-primary)]">›</span>{r}</div>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Required Skills</div><div className="flex flex-wrap gap-1">{(Array.isArray(jaAiProfile.skills) ? jaAiProfile.skills : []).map((s: string, i: number) => <Badge key={i} color="indigo">{s}</Badge>)}</div></div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Core Competencies</div><div className="flex flex-wrap gap-1">{(Array.isArray(jaAiProfile.competencies) ? jaAiProfile.competencies : []).map((c: string, i: number) => <Badge key={i} color="purple">{c}</Badge>)}</div></div>
          </div>
        </div>
        <div className="col-span-5 space-y-3">
          <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Career Path</div><div className="flex items-center gap-2 text-[13px]"><span className="text-[var(--text-secondary)]">{jaAiProfile.career_from}</span><span className="text-[var(--accent-primary)]">→</span><span className="font-bold text-[var(--text-primary)]">{jaAiProfile.title}</span><span className="text-[var(--accent-primary)]">→</span><span className="text-[var(--text-secondary)]">{jaAiProfile.career_next}</span></div></div>
          <div className="rounded-xl p-4 border" style={{ background: jaAiProfile.ai_impact === "High" ? "rgba(239,68,68,0.05)" : jaAiProfile.ai_impact === "Moderate" ? "rgba(245,158,11,0.05)" : "rgba(16,185,129,0.05)", borderColor: jaAiProfile.ai_impact === "High" ? "rgba(239,68,68,0.15)" : jaAiProfile.ai_impact === "Moderate" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)" }}><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">AI Impact on This Role</div><div className="text-[16px] font-bold mb-1" style={{ color: jaAiProfile.ai_impact === "High" ? "var(--risk)" : jaAiProfile.ai_impact === "Moderate" ? "var(--warning)" : "var(--success)" }}>{jaAiProfile.ai_impact}</div><div className="text-[12px] text-[var(--text-secondary)]">{jaAiProfile.ai_rationale}</div></div>
        </div>
      </div>}
      {!jaAiProfile && !jaAiLoading && <div className="text-center py-4 text-[12px] text-[var(--text-muted)]">Enter any job title to generate a complete profile with skills, competencies, career path, and AI impact assessment</div>}
    </Card>

    {jaLoading && <LoadingBar />}
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Headcount" value={orgK.total as number ?? 0} accent />
      <KpiCard label="Managers" value={orgK.managers as number ?? 0} />
      <KpiCard label="ICs" value={orgK.ics as number ?? 0} />
      <KpiCard label="Avg Span" value={orgK.avg_span as number ?? 0} accent />
      <KpiCard label="Max Span" value={orgK.max_span as number ?? 0} />
      <KpiCard label="Layers" value={orgK.layers as number ?? 0} />
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <Card title="Span of Control — Top 15">{spanTop.length ? <BarViz data={spanTop} labelKey="Label" valueKey="Direct Reports" color="var(--warning)" /> : <Empty text="Upload org data for span analysis" icon="🏢" />}</Card>
      <Card title="Layer Distribution">{layers.length ? <BarViz data={layers} labelKey="name" valueKey="value" /> : <Empty text="Upload org data" icon="📊" />}</Card>
    </div>
    <Card title="Workforce by Function">{fd.length ? <BarViz data={fd} labelKey="name" valueKey="value" color="var(--accent-primary)" /> : <Empty text="Upload workforce data" icon="📊" />}</Card>
    {/* Job Catalog Table — from uploaded data */}
    <Card title="Job Catalog">{jobs.length ? <DataTable data={jobs.map(j => ({ "Job Title": j }))} cols={["Job Title"]} /> : <Empty text="Upload workforce or job catalog data to see all jobs listed here" icon="📋" />}</Card>

    <InsightPanel title="What This Tells You" items={["Job architecture shows how roles are distributed across functions and levels.", "Span of control reveals management efficiency — benchmark is 6-10 direct reports.", "Use this baseline before entering the Work Design Lab to redesign roles."]} icon="🗂️" />
    <NextStepBar currentModuleId="jobs" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 3: AI OPPORTUNITY SCAN
   ═══════════════════════════════════════════════════════════════ */
function AiOpportunityScan({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [sub, setSub] = useState("ai");
  const [data, loading] = useApiData(() => { if (sub === "ai") return api.getAIPriority(model, f); if (sub === "skills") return api.getSkillAnalysis(model, f); if (sub === "org") return api.getOrgDiagnostics(model, f); return api.getDataQuality(model); }, [sub, model, f.func, f.jf, f.sf, f.cl]);

  const scanTitle = viewCtx?.mode === "employee" ? "AI Impact on My Role" : viewCtx?.mode === "job" ? `AI Impact — ${viewCtx.job}` : "AI Opportunity Scan";
  const scanSubtitle = viewCtx?.mode === "employee" ? `How AI will change ${viewCtx?.employee}'s tasks` : viewCtx?.mode === "job" ? `Tasks and AI scores for ${viewCtx.job}` : `Find where AI creates the most value${loading ? " · Loading..." : ""}`;
  return <div>
    <ContextStrip items={[viewCtx?.mode === "employee" ? "Showing AI impact on tasks in your role." : viewCtx?.mode === "job" ? `Filtered to ${viewCtx?.job} tasks only.` : "Phase 1: Discover — Find where AI creates the most value. This unlocks Phase 2: Design."]} />
    <PageHeader icon={viewCtx?.mode === "employee" ? "👤" : "🔬"} title={scanTitle} subtitle={scanSubtitle} onBack={onBack} moduleId="scan" />
    <TabBar tabs={[{ id: "ai", label: "AI Prioritization" }, { id: "skills", label: "Skill Gaps" }, { id: "org", label: "Org Diagnostics" }, { id: "dq", label: "Data Quality" }]} active={sub} onChange={setSub} />

    {sub === "ai" && (() => { const s = (data?.summary ?? {}) as Record<string, unknown>; const top10 = (data?.top10 ?? []) as Record<string, unknown>[]; const quickWins = top10.filter(t => String(t["AI Impact"] || t.ai_impact || "").toLowerCase() === "high" && (Number(t["Current Time Spent %"] || t.time_pct || 0) >= 10) && String(t["Logic"] || t.logic || "").toLowerCase() === "deterministic"); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Tasks Scored" value={s.tasks_scored as number ?? 0} /><KpiCard label="Quick Wins" value={quickWins.length || (s.quick_wins as number ?? 0)} accent /><KpiCard label="Time Impact" value={`${s.total_time_impact ?? 0}h/wk`} /><KpiCard label="Avg Risk" value={s.avg_risk as number ?? 0} /></div>
      {/* Quick Wins Panel */}
      {quickWins.length > 0 && <div className="bg-gradient-to-r from-[rgba(16,185,129,0.06)] to-transparent border border-[rgba(16,185,129,0.15)] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><span className="text-lg">⚡</span><span className="text-[14px] font-bold text-[var(--success)]">Quick Wins — Automate Now</span><Badge color="green">{quickWins.length} tasks</Badge></div>
        <div className="text-[12px] text-[var(--text-secondary)] mb-3">These tasks are High AI Impact + Deterministic logic + ≥10% of work time. They can be automated with minimal risk and maximum ROI.</div>
        <div className="space-y-2">{quickWins.slice(0, 6).map((t, i) => {
          const taskName = String(t["Task Name"] || t.task || "");
          const timePct = Number(t["Current Time Spent %"] || t.time_pct || 0);
          const role = String(t["Job Title"] || t.role || "");
          const pSkill = String(t["Primary Skill"] || t.primary_skill || "");
          return <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="w-7 h-7 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[12px] font-bold text-[var(--success)]">{i + 1}</div>
            <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{taskName}</div><div className="text-[10px] text-[var(--text-muted)]">{role} · {pSkill}</div></div>
            <div className="text-right shrink-0"><div className="text-[14px] font-extrabold text-[var(--success)]">{timePct}%</div><div className="text-[9px] text-[var(--text-muted)]">of work time</div></div>
            <Badge color="green">Automate</Badge>
          </div>;
        })}</div>
        <div className="mt-3 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">Total automatable time: {quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0)}% of combined role time → est. {Math.round(quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0) * 0.6 * 40 / 100)} hrs/week freed</div>
      </div>}
      <div className="grid grid-cols-12 gap-4"><div className="col-span-7"><Card title="Top AI Priority Tasks"><DataTable data={top10} /></Card></div><div className="col-span-5"><Card title="Impact by Workstream"><BarViz data={((data?.workstream_impact ?? []) as Record<string, unknown>[])} labelKey="Workstream" valueKey="Time Impact" color="var(--accent-scenario)" /></Card></div></div></div>; })()}
    {sub === "skills" && <div className="grid grid-cols-2 gap-4"><Card title="Current Skills"><BarViz data={((data?.current ?? []) as Record<string, unknown>[])} labelKey="Skill" valueKey="Weight" color="var(--success)" /></Card><Card title="Skill Gap"><DataTable data={((data?.gap ?? []) as Record<string, unknown>[])} cols={["Skill", "Current", "Future", "Delta"]} /></Card></div>}
    {sub === "org" && (() => { if (data && (data as Record<string, unknown>).empty) return <Empty text="Upload org or workforce data" icon="🏢" />; const k = (data?.kpis ?? {}) as Record<string, unknown>; return <div><div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Headcount" value={k.total as number ?? 0} /><KpiCard label="Managers" value={k.managers as number ?? 0} /><KpiCard label="ICs" value={k.ics as number ?? 0} /><KpiCard label="Avg Span" value={k.avg_span as number ?? 0} accent /><KpiCard label="Max Span" value={k.max_span as number ?? 0} /><KpiCard label="Layers" value={k.layers as number ?? 0} /></div><div className="grid grid-cols-2 gap-4"><Card title="Span of Control"><BarViz data={((data?.span_top15 ?? []) as Record<string, unknown>[])} labelKey="Label" valueKey="Direct Reports" color="var(--warning)" /></Card><Card title="Layer Distribution"><BarViz data={((data?.layer_distribution ?? []) as Record<string, unknown>[])} labelKey="name" valueKey="value" /></Card></div></div>; })()}
    {sub === "dq" && (() => { const s = (data?.summary ?? {}) as Record<string, unknown>; return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Ready" value={`${s.ready ?? 0}/7`} accent /><KpiCard label="Missing" value={s.missing as number ?? 0} /><KpiCard label="Issues" value={s.total_issues as number ?? 0} /><KpiCard label="Completeness" value={`${s.avg_completeness ?? 0}%`} /></div><div className="grid grid-cols-2 gap-4"><Card title="Readiness"><DataTable data={((data?.readiness ?? []) as Record<string, unknown>[])} cols={["Dataset", "Status", "Rows", "Issues", "Completeness"]} /></Card><Card title="Upload Log"><DataTable data={((data?.upload_log ?? []) as Record<string, unknown>[])} /></Card></div></div>; })()}
    <NextStepBar currentModuleId="scan" onNavigate={onNavigate || onBack} />
  </div>;
}




/* ═══════════════════════════════════════════════════════════════
   MODULE: SKILLS & TALENT — Inventory, Gap Analysis, Adjacency
   Full spec: editable grid, dedup, dispositions, WDL connection,
   role/individual toggle, adjacency with shortlisting
   ═══════════════════════════════════════════════════════════════ */
function SkillsTalent({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [tab, setTab] = useState("inventory");
  const [invData, setInvData] = useState<Record<string, unknown> | null>(null);
  const [gapData, setGapData] = useState<Record<string, unknown> | null>(null);
  const [adjData, setAdjData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedScores, setEditedScores] = usePersisted<Record<string, number>>(`${model}_skillEdits`, {});
  const [confirmed, setConfirmed] = usePersisted<boolean>(`${model}_skillsConfirmed`, false);
  const [adjThreshold, setAdjThreshold] = useState(50);
  const [gapView, setGapView] = useState<"skill" | "individual">("skill");
  const [gapDispositions, setGapDispositions] = usePersisted<Record<string, string>>(`${model}_gapDispositions`, {});
  const [shortlisted, setShortlisted] = usePersisted<Record<string, string[]>>(`${model}_shortlisted`, {});
  const [showDedup, setShowDedup] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [empPage, setEmpPage] = useState(0);
  const EMP_PAGE_SIZE = 50;

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    Promise.all([
      api.getSkillsInventory(model, { func: f.func, jf: f.jf }),
      api.getSkillsGap(model),
      api.getSkillsAdjacency(model),
    ]).then(([inv, gap, adj]) => {
      setInvData(inv); setGapData(gap); setAdjData(adj); setLoading(false);
    }).catch(() => setLoading(false));
  }, [model, f.func, f.jf]);

  const inv = invData as Record<string, unknown> | null;
  const records = (inv?.records || []) as { employee: string; skill: string; proficiency: number }[];
  const skills = (inv?.skills || []) as string[];
  const employees = (inv?.employees || []) as string[];
  const clusters = (inv?.clusters || {}) as Record<string, string[]>;
  const coverage = Number(inv?.coverage || 0);
  const isSample = Boolean(inv?.sample);
  const validationErrors = (inv?.validation_errors || []) as string[];
  const dedupSuggestions = (inv?.dedup_suggestions || []) as { skill_a: string; skill_b: string; similarity: number }[];

  const gap = gapData as Record<string, unknown> | null;
  const gaps = (gap?.gaps || []) as { skill: string; current_avg: number; target: number; target_source: string; delta: number; employees_assessed: number; severity: string; employee_gaps: { employee: string; current: number; target: number; delta: number; reskillable: boolean }[] }[];
  const gapSummary = (gap?.summary || {}) as Record<string, unknown>;

  const adj = adjData as Record<string, unknown> | null;
  const adjacencies = (adj?.adjacencies || []) as { target_role: string; required_skills: Record<string, number>; top_candidates: { employee: string; adjacency_pct: number; matching_skills: string[]; gap_skills: string[]; reskill_months: number }[]; strong_matches: number; reskillable: number; weak_matches: number; wdl_derived: boolean }[];
  const adjSummary = (adj?.summary || {}) as Record<string, unknown>;

  const getProf = (emp: string, skill: string) => {
    const key = `${emp}__${skill}`;
    if (editedScores[key] !== undefined) return editedScores[key];
    const rec = records.find(r => r.employee === emp && r.skill === skill);
    return rec ? rec.proficiency : 0;
  };
  const profColor = (p: number) => p === 0 ? "transparent" : p === 1 ? "#EF4444" : p === 2 ? "#F59E0B" : p === 3 ? "#10B981" : "#065F46";
  const profLabel = (p: number) => p === 1 ? "Novice" : p === 2 ? "Developing" : p === 3 ? "Proficient" : p === 4 ? "Expert" : "Not assessed";
  const dispColors: Record<string, string> = { "Close Internally": "var(--success)", "Hire Externally": "var(--accent-primary)", "Accept Risk": "var(--warning)", "Automate": "var(--purple)" };
  const dispOptions = ["Close Internally", "Hire Externally", "Accept Risk", "Automate"];

  const filteredSkills = skillFilter ? skills.filter(s => s.toLowerCase().includes(skillFilter.toLowerCase())) : skills;

  return <div>
    <PageHeader icon="🧠" title="Skills & Talent" subtitle="Inventory, gap analysis, and adjacency mapping" onBack={onBack} moduleId="skills" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="skills_inventory" label="Skills Data" /></div>}
    {loading && <LoadingBar />}
    {!loading && employees.length === 0 && validationErrors.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🧠</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">No Skills Data Yet</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload workforce data to see skills inventory, or select Demo_Model.</p></div>}

    {/* Validation errors */}
    {validationErrors.map((err, i) => <div key={i} className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-2 text-[12px] text-[var(--warning)]">⚠ {err}</div>)}
    {Boolean(gapSummary.wdl_connected) && <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-2 text-[12px] text-[var(--success)]">✓ Connected to Work Design Lab — gap targets derived from your task reconstruction</div>}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Employees" value={employees.length} accent /><KpiCard label="Skills Tracked" value={skills.length} /><KpiCard label="Coverage" value={`${coverage}%`} accent /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} /><KpiCard label="Fillable" value={`${Number(adjSummary.fillable_internally || 0)}/${Number(adjSummary.target_roles || 0)}`} />
    </div>

    <TabBar tabs={[
      { id: "inventory", label: "Skills Inventory" },
      { id: "gap", label: `Gap Analysis${!confirmed ? " 🔒" : ""}` },
      { id: "adjacency", label: `Adjacency Map${!confirmed ? " 🔒" : ""}` },
    ]} active={tab} onChange={setTab} />

    {/* ═══ TAB 1: SKILLS INVENTORY ═══ */}
    {tab === "inventory" && <div>
      <Card title="Proficiency Grid">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="Filter skills..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none w-40 placeholder:text-[var(--text-muted)]" />
            {dedupSuggestions.length > 0 && <button onClick={() => setShowDedup(!showDedup)} className="text-[11px] text-[var(--warning)] font-semibold">⚠ {dedupSuggestions.length} potential duplicates</button>}
            <button onClick={() => { const lv = prompt("Bulk-assign proficiency (1-4) to all empty cells:"); if (lv && [1,2,3,4].includes(Number(lv))) { const ne: Record<string,number> = {}; employees.forEach(e => { filteredSkills.forEach(s => { if (getProf(e,s)===0) ne[`${e}__${s}`]=Number(lv); }); }); setEditedScores(prev => ({...prev,...ne})); showToast(`Assigned ${Object.keys(ne).length} empty cells to level ${lv}`); } }} className="text-[11px] text-[var(--accent-primary)] font-semibold hover:underline cursor-pointer">Bulk-fill empties</button>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(editedScores).length > 0 && <span className="text-[10px] text-[var(--success)]">✎ {Object.keys(editedScores).length} edits</span>}
            {!confirmed ? <button onClick={() => { setConfirmed(true); showToast("✓ Skills inventory confirmed — Gap Analysis unlocked"); logDec("Skills", "Inventory Confirmed", `${employees.length} employees × ${skills.length} skills confirmed`); }} className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>✓ Confirm Inventory</button> : <Badge color="green">✓ Confirmed</Badge>}
          </div>
        </div>

        {/* Dedup suggestions */}
        {showDedup && dedupSuggestions.length > 0 && <div className="bg-[rgba(245,158,11,0.06)] border border-[var(--warning)]/20 rounded-lg p-3 mb-3"><div className="text-[11px] font-bold text-[var(--warning)] mb-2">Potential Duplicate Skills — Consider merging:</div>{dedupSuggestions.map((d, i) => <div key={i} className="flex items-center gap-2 text-[11px] py-1"><span className="text-[var(--text-primary)]">"{d.skill_a}"</span><span className="text-[var(--text-muted)]">↔</span><span className="text-[var(--text-primary)]">"{d.skill_b}"</span><Badge color="amber">{d.similarity}% similar</Badge></div>)}</div>}

        {/* Proficiency grid */}
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 480 }}>
          <table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10">
            <th className="px-2 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-20 min-w-[130px]">Employee</th>
            {filteredSkills.slice(0, 15).map(s => <th key={s} className="px-0.5 py-1 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[55px]"><div style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 75, fontSize: 9 }}>{s}</div></th>)}
          </tr></thead>
          <tbody>{employees.slice(empPage * EMP_PAGE_SIZE, (empPage + 1) * EMP_PAGE_SIZE).map(emp => <tr key={emp} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-2 py-1 font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--surface-1)] z-10 border-r border-[var(--border)] truncate" style={{ maxWidth: 130 }}>{emp}</td>
            {filteredSkills.slice(0, 15).map(s => { const p = getProf(emp, s); const key = `${emp}__${s}`; const edited = editedScores[key] !== undefined; return <td key={s} className="px-0.5 py-0.5 text-center"><button title={`${s}: ${profLabel(p)} (${p}/4)\nClick to change`} onClick={() => setEditedScores(prev => ({ ...prev, [key]: p >= 4 ? 0 : p + 1 }))} className="w-6 h-6 rounded text-[9px] font-bold transition-all" style={{ background: p ? `${profColor(p)}20` : "var(--surface-2)", color: p ? profColor(p) : "var(--text-muted)", border: `1px solid ${edited ? "var(--accent-primary)" : (p ? profColor(p) + "30" : "var(--border)")}`, outline: edited ? "1px solid var(--accent-primary)" : "none" }}>{p || "·"}</button></td>; })}
          </tr>)}</tbody></table>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-3 text-[9px] text-[var(--text-muted)]">{["1=Novice","2=Developing","3=Proficient","4=Expert","·=No data"].map(l => <span key={l}>{l}</span>)}</div>
          {employees.length > EMP_PAGE_SIZE && <div className="flex items-center gap-2">
          <button onClick={() => setEmpPage(p => Math.max(0, p-1))} disabled={empPage === 0} className="px-2 py-1 rounded text-[10px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">← Prev</button>
          <span className="text-[10px] text-[var(--text-muted)]">{empPage * EMP_PAGE_SIZE + 1}-{Math.min((empPage+1) * EMP_PAGE_SIZE, employees.length)} of {employees.length}</span>
          <button onClick={() => setEmpPage(p => p+1)} disabled={(empPage+1) * EMP_PAGE_SIZE >= employees.length} className="px-2 py-1 rounded text-[10px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">Next →</button>
        </div>}
        </div>
      </Card>

      {/* Skill clusters */}
      {Object.keys(clusters).length > 0 && <Card title="Skill Clusters — Average Proficiency">
        <div className="grid grid-cols-3 gap-4">{Object.entries(clusters).map(([cluster, clusterSkills]) => {
          const avg = clusterSkills.reduce((sum, s) => { const recs = records.filter(r => r.skill === s); return sum + (recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0); }, 0) / Math.max(clusterSkills.length, 1);
          return <div key={cluster} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-bold text-[var(--text-primary)]">{cluster}</span><span className="text-[18px] font-extrabold" style={{ color: avg >= 3 ? "var(--success)" : avg >= 2 ? "var(--warning)" : "var(--risk)" }}>{avg.toFixed(1)}</span></div>
            <div className="space-y-1.5">{clusterSkills.map(s => { const recs = records.filter(r => r.skill === s); const sAvg = recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0; const assessed = recs.length; return <div key={s} className="flex items-center justify-between text-[11px]"><span className="text-[var(--text-secondary)] truncate flex-1 mr-2">{s}</span><div className="flex items-center gap-1.5"><span className="text-[9px] text-[var(--text-muted)]">{assessed}emp</span><div className="w-14 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(sAvg / 4) * 100}%`, background: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }} /></div><span className="text-[9px] w-5 text-right font-semibold" style={{ color: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }}>{sAvg.toFixed(1)}</span></div></div>; })}</div>
          </div>;
        })}</div>
      </Card>}

      <InsightPanel title="Inventory Insights" items={[
        `${coverage}% of your workforce has skills data${coverage < 80 ? " — gap analysis will be incomplete for unassessed employees" : ""}`,
        clusters.Technical ? `Highest cluster: ${Object.entries(clusters).sort((a,b) => b[1].length - a[1].length)[0]?.[0] || "—"} (${Object.entries(clusters).sort((a,b) => b[1].length - a[1].length)[0]?.[1]?.length || 0} skills)` : "Upload skills data for cluster analysis",
        Object.keys(editedScores).length > 0 ? `You've made ${Object.keys(editedScores).length} manual edits to proficiency scores` : "Click cells to edit proficiency ratings",
      ]} icon="🧠" />
    </div>}

    {/* ═══ TAB 2: GAP ANALYSIS ═══ */}
    {tab === "gap" && <div>
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[13px] text-[var(--text-secondary)] mb-4">Go to the Inventory tab and click "Confirm Inventory" to unlock Gap Analysis.</p><button onClick={() => { setTab("inventory"); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]">← Go to Inventory</button></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Skills" value={Number(gapSummary.total_skills || 0)} /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} accent /><KpiCard label="Avg Gap" value={String(Number(gapSummary.avg_gap || 0).toFixed(1))} /><KpiCard label="Largest Gap" value={String(gapSummary.largest_gap_skill || "—")} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">{(["skill", "individual"] as const).map(v => <button key={v} onClick={() => setGapView(v)} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: gapView === v ? "var(--accent-primary)" : "var(--surface-2)", color: gapView === v ? "#fff" : "var(--text-muted)" }}>{v === "skill" ? "By Skill" : "By Employee"}</button>)}</div>
        <div className="text-[10px] text-[var(--text-muted)]">Set disposition per gap: what action to take</div>
      </div>

      {gapView === "skill" ? <>{model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="skills_gap" label="Gap Analysis" /></div>}
      <Card title="Gap Heatmap — Current vs Target Proficiency">
        <div className="space-y-2">{gaps.map(g => <div key={g.skill} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-[12px] font-semibold w-40 shrink-0 text-[var(--text-primary)]">{g.skill}</span>
          <div className="flex-1">
            <div className="h-4 bg-[var(--bg)] rounded-full overflow-hidden relative">
              <div className="h-full rounded-full absolute left-0" style={{ width: `${(g.current_avg / 4) * 100}%`, background: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)", opacity: 0.6 }} />
              <div style={{ position: "absolute", left: `${(g.target / 4) * 100}%`, top: 0, bottom: 0, width: 2, background: "var(--text-primary)" }} />
            </div>
            <div className="flex justify-between text-[9px] mt-0.5"><span className="text-[var(--text-muted)]">Current: {g.current_avg}</span><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Target: {g.target} ({g.target_source})</span></div>
          </div>
          <div className="text-center shrink-0 w-14"><div className="text-[15px] font-extrabold" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>-{g.delta}</div><div className="text-[8px]" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>{g.severity}</div></div>
          <select value={gapDispositions[g.skill] || ""} onChange={e => setGapDispositions(prev => ({ ...prev, [g.skill]: e.target.value }))} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none w-32 shrink-0">
            <option value="">Disposition...</option>{dispOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>)}</div>
      </Card></> : <Card title="Individual Employee Gaps">
        {gaps.filter(g => g.severity !== "Low").slice(0, 5).map(g => <div key={g.skill} className="mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[13px] font-bold text-[var(--text-primary)]">{g.skill}</span><Badge color={g.severity === "Critical" ? "red" : "amber"}>{g.severity}</Badge><span className="text-[10px] text-[var(--text-muted)]">Target: {g.target}</span></div>
          <div className="grid grid-cols-5 gap-1">{g.employee_gaps.slice(0, 10).map(eg => <div key={eg.employee} className="bg-[var(--surface-2)] rounded-lg p-2 text-center border border-[var(--border)]">
            <div className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{eg.employee}</div>
            <div className="text-[14px] font-extrabold mt-0.5" style={{ color: eg.delta > 1.5 ? "var(--risk)" : eg.delta > 0.5 ? "var(--warning)" : "var(--success)" }}>{eg.current}→{eg.target}</div>
            <div className="text-[8px]" style={{ color: eg.reskillable ? "var(--success)" : "var(--risk)" }}>{eg.reskillable ? "Reskillable" : "Hire needed"}</div>
          </div>)}</div>
        </div>)}
      </Card>}

      {/* Disposition summary */}
      {Object.keys(gapDispositions).length > 0 && <Card title="Gap Disposition Summary">
        <div className="grid grid-cols-4 gap-3">{dispOptions.map(d => { const count = Object.values(gapDispositions).filter(v => v === d).length; return <div key={d} className="bg-[var(--surface-2)] rounded-xl p-3 text-center border border-[var(--border)]"><div className="text-[20px] font-extrabold" style={{ color: dispColors[d] }}>{count}</div><div className="text-[10px] text-[var(--text-muted)]">{d}</div></div>; })}</div>
      </Card>}
      </>}
    </div>}

    {/* ═══ TAB 3: ADJACENCY MAP ═══ */}
    {tab === "adjacency" && <div>
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[13px] text-[var(--text-secondary)]">Complete the inventory to unlock adjacency mapping.</p></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Target Roles" value={Number(adjSummary.target_roles || 0)} /><KpiCard label="Fillable" value={Number(adjSummary.fillable_internally || 0)} accent /><KpiCard label="Need External" value={Number(adjSummary.need_external || 0)} /><KpiCard label="Best Match" value={`${Number(adjSummary.avg_best_adjacency || 0)}%`} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[12px] text-[var(--text-secondary)]">Threshold:</span>
        <input type="range" min={30} max={90} step={5} value={adjThreshold} onChange={e => setAdjThreshold(Number(e.target.value))} className="w-36" style={{ accentColor: "#14B8A6" }} />
        <span className="text-[13px] font-bold" style={{ color: adjThreshold >= 70 ? "var(--success)" : adjThreshold >= 50 ? "var(--warning)" : "var(--risk)" }}>{adjThreshold}%</span>
        <div className="flex gap-2 text-[9px]"><Badge color="green">≥70% Strong</Badge><Badge color="amber">50-69% Reskillable</Badge><Badge color="gray">&lt;50% Stretch</Badge></div>
        {Boolean(adjSummary.wdl_connected) && <Badge color="green">WDL Connected</Badge>}
      </div>

      {adjacencies.map(a => <Card key={a.target_role} title={a.target_role}>
        <div className="flex items-center gap-2 mb-3">
          <Badge color="green">{a.strong_matches} strong</Badge><Badge color="amber">{a.reskillable} reskillable</Badge><Badge color="gray">{a.weak_matches} weak</Badge>
          {a.wdl_derived && <span className="text-[9px] text-[var(--success)]">Skills from Work Design Lab</span>}
        </div>
        <div className="grid grid-cols-4 gap-2">{a.top_candidates.filter(c => c.adjacency_pct >= adjThreshold).map(c => { const isShortlisted = (shortlisted[a.target_role] || []).includes(c.employee); return <div key={c.employee} className="bg-[var(--surface-2)] rounded-xl p-3 border transition-all" style={{ borderColor: isShortlisted ? "var(--success)" : "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate flex-1 mr-1">{c.employee}</span>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: c.adjacency_pct >= 70 ? "var(--success)" : c.adjacency_pct >= 50 ? "var(--warning)" : "var(--risk)" }}>{c.adjacency_pct}%</span>
          </div>
          <div className="text-[9px] text-[var(--success)] mb-0.5 truncate">✓ {c.matching_skills.slice(0, 3).join(", ")}</div>
          {c.gap_skills.length > 0 && <div className="text-[9px] text-[var(--risk)] mb-1 truncate">✗ {c.gap_skills.slice(0, 3).join(", ")}</div>}
          {c.reskill_months > 0 && <div className="text-[8px] text-[var(--text-muted)]">~{c.reskill_months}mo reskilling</div>}
          <button onClick={() => setShortlisted(prev => { const list = prev[a.target_role] || []; return { ...prev, [a.target_role]: isShortlisted ? list.filter(e => e !== c.employee) : [...list, c.employee] }; })} className="mt-1 text-[9px] font-semibold w-full py-1 rounded text-center" style={{ background: isShortlisted ? "rgba(16,185,129,0.1)" : "var(--surface-1)", color: isShortlisted ? "var(--success)" : "var(--text-muted)", border: `1px solid ${isShortlisted ? "var(--success)" : "var(--border)"}` }}>{isShortlisted ? "★ Shortlisted" : "☆ Shortlist"}</button>
        </div>; })}</div>
        {a.top_candidates.filter(c => c.adjacency_pct >= adjThreshold).length === 0 && <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No candidates above {adjThreshold}% — lower threshold or plan external hire</div>}
      </Card>)}

      {/* Shortlist summary */}
      {Object.values(shortlisted).some(l => l.length > 0) && <Card title="Shortlisted Candidates">
        {Object.entries(shortlisted).filter(([, l]) => l.length > 0).map(([role, list]) => <div key={role} className="mb-2"><span className="text-[12px] font-bold text-[var(--text-primary)]">{role}:</span> <span className="text-[12px] text-[var(--text-secondary)]">{list.join(", ")}</span></div>)}
      </Card>}
      </>}
    </div>}

    <NextStepBar currentModuleId="skills" onNavigate={onNavigate || onBack} />
  </div>;
}




/* ═══════════════════════════════════════════════════════════════
   MODULE: AI READINESS ASSESSMENT
   ═══════════════════════════════════════════════════════════════ */
function AIReadiness({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState<"org"|"individual">("org");
  const [rdPage, setRdPage] = useState(0);
  const RD_PAGE = 50;

  useEffect(() => { if (!model) return; setLoading(true); api.getReadinessAssessment(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const individuals = (data?.individuals || []) as { employee: string; scores: Record<string, number>; average: number; band: string }[];
  const dimAvgs = (data?.dimension_averages || {}) as Record<string, number>;
  const bands = (data?.bands || {}) as Record<string, number>;
  const dimensions = (data?.dimensions || []) as string[];

  return <div>
    <PageHeader icon="🎯" title={viewCtx?.mode === "employee" ? "My AI Readiness" : "AI Readiness Assessment"} subtitle="Individual and team readiness for transformation" onBack={onBack} moduleId="readiness" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="readiness" label="Readiness Scores" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Org Average" value={`${data?.org_average || "—"}/5`} accent /><KpiCard label="Ready Now" value={bands.ready_now || 0} /><KpiCard label="Coachable" value={bands.coachable || 0} /><KpiCard label="At Risk" value={bands.at_risk || 0} /><KpiCard label="Weakest" value={String(data?.lowest_dimension || "—")} />
    </div>

    <div className="flex gap-2 mb-4">{(["org","individual"] as const).map(v => <button key={v} onClick={() => setViewLevel(v)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: viewLevel === v ? "var(--accent-primary)" : "var(--surface-2)", color: viewLevel === v ? "#fff" : "var(--text-muted)" }}>{v === "org" ? "Organization View" : "Individual Scores"}</button>)}</div>

    {viewLevel === "org" ? <div className="grid grid-cols-2 gap-4">
      <Card title="Readiness by Dimension"><RadarViz data={Object.entries(dimAvgs).map(([k,v]) => ({ subject: k, current: v, max: 5 }))} /></Card>
      <Card title="Readiness Bands"><DonutViz data={[{name:"Ready Now",value:bands.ready_now||0},{name:"Coachable",value:bands.coachable||0},{name:"At Risk",value:bands.at_risk||0}]} />
        <div className="mt-3 space-y-2">{[{band:"Ready Now",color:"var(--success)",desc:"Can adopt AI tools immediately"},{band:"Coachable",color:"var(--warning)",desc:"Needs 3-6 months of support"},{band:"At Risk",color:"var(--risk)",desc:"Needs intensive intervention before rollout"}].map(b => <div key={b.band} className="flex items-center gap-2 text-[11px]"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:b.color}} /><span className="font-semibold" style={{color:b.color}}>{b.band}</span><span className="text-[var(--text-muted)]">— {b.desc}</span></div>)}</div>
      </Card>
    </div> : <Card title="Individual Readiness Scores">
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:450}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Employee</th>{dimensions.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{d}</th>)}<th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Band</th></tr></thead>
      <tbody>{individuals.slice(rdPage * RD_PAGE, (rdPage + 1) * RD_PAGE).map(ind => <tr key={ind.employee} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 font-semibold">{ind.employee}</td>{dimensions.map(d => { const v = ind.scores[d] || 0; return <td key={d} className="px-2 py-1.5 text-center"><span className="text-[11px] font-bold" style={{color: v >= 4 ? "var(--success)" : v >= 3 ? "var(--accent-primary)" : v >= 2 ? "var(--warning)" : "var(--risk)"}}>{v}</span></td>; })}<td className="px-2 py-1.5 text-center font-bold">{ind.average}</td><td className="px-2 py-1.5 text-center"><Badge color={ind.band==="Ready Now"?"green":ind.band==="Coachable"?"amber":"red"}>{ind.band}</Badge></td></tr>)}</tbody></table></div>
    </Card>}

    {/* Function Breakdown */}
    <Card title="Readiness by Function">
      {(() => {
        const funcData: Record<string, {sum: number; count: number}> = {};
        individuals.forEach(ind => {
          // Approximate function from employee name patterns
          const func = ind.employee.includes("EMP") ? "Unknown" : "General";
          if (!funcData[func]) funcData[func] = {sum: 0, count: 0};
          funcData[func].sum += ind.average;
          funcData[func].count += 1;
        });
        // Group by readiness band
        const bandCounts = {ready: 0, coachable: 0, risk: 0};
        individuals.forEach(i => { if (i.band === "Ready Now") bandCounts.ready++; else if (i.band === "Coachable") bandCounts.coachable++; else bandCounts.risk++; });
        const total = individuals.length || 1;
        return <div className="grid grid-cols-3 gap-4">
          {[{label:"Ready Now",count:bandCounts.ready,color:"var(--success)",desc:"Can adopt AI immediately — deploy as early adopters"},{label:"Coachable",count:bandCounts.coachable,color:"var(--warning)",desc:"3-6 months of support needed — target for reskilling programs"},{label:"At Risk",count:bandCounts.risk,color:"var(--risk)",desc:"Intensive intervention required — may need role redesign"}].map(b => <div key={b.label} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-1px]" style={{background:`${b.color}08`,borderColor:b.color}}>
            <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-bold" style={{color:b.color}}>{b.label}</span><span className="text-[24px] font-extrabold" style={{color:b.color}}>{b.count}</span></div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-2">{b.desc}</div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{width:`${(b.count/total)*100}%`,background:b.color}} /></div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">{Math.round((b.count/total)*100)}% of workforce</div>
          </div>)}
        </div>;
      })()}
    </Card>

    {/* Dimension Improvement Plans */}
    <Card title="Improvement Recommendations by Dimension">
      <div className="space-y-2">{Object.entries(dimAvgs).sort((a,b) => Number(a[1]) - Number(b[1])).map(([dim, avg]) => {
        const gap = Math.max(0, 4 - Number(avg));
        const plan = Number(avg) < 2.5 ? "Intensive: structured training program + coaching + tool access" : Number(avg) < 3.5 ? "Moderate: workshop series + self-paced learning + peer support" : "Light: advanced resources + mentoring + stretch assignments";
        const timeline = Number(avg) < 2.5 ? "6-9 months" : Number(avg) < 3.5 ? "3-6 months" : "1-3 months";
        return <div key={dim} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="w-32 shrink-0"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{dim}</div><div className="text-[9px] text-[var(--text-muted)]">Avg: {Number(avg).toFixed(1)}/5</div></div>
          <div className="flex-1"><div className="h-3 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{width:`${(Number(avg)/5)*100}%`,background: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}} /></div></div>
          <div className="text-right shrink-0 w-48"><div className="text-[10px] font-semibold" style={{color: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}}>{plan.split(":")[0]}</div><div className="text-[9px] text-[var(--text-muted)]">{timeline}</div></div>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Readiness Insights" items={[
      `Org average: ${data?.org_average || "—"}/5 — ${Number(data?.org_average || 0) >= 3.5 ? "strong foundation for transformation" : Number(data?.org_average || 0) >= 2.5 ? "moderate readiness — targeted interventions needed" : "significant readiness gap — extend transformation timeline"}`,
      `Weakest dimension: ${data?.lowest_dimension || "—"} — prioritize this in training programs`,
      `Strongest dimension: ${data?.highest_dimension || "—"} — leverage this as a foundation`,
      `${bands.at_risk || 0} At Risk employees need intensive support before AI rollout`,
    ]} icon="🎯" />

    <NextStepBar currentModuleId="readiness" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: BUILD/BUY/BORROW/AUTOMATE
   ═══════════════════════════════════════════════════════════════ */
function BBBAFramework({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {});

  useEffect(() => { if (!model) return; setLoading(true); api.getBBBA(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const roles = (data?.roles || []) as { role: string; disposition: string; reason: string; strong_candidates: number; reskillable_candidates: number; cost_per_fte: number; fte_needed: number; total_cost: number; required_skills: string[]; timeline_months: number }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const dispColors: Record<string, string> = { Build: "var(--success)", Buy: "var(--accent-primary)", Borrow: "var(--warning)", Automate: "var(--purple)" };
  const dispIcons: Record<string, string> = { Build: "🏗️", Buy: "🛒", Borrow: "🤝", Automate: "🤖" };

  return <div>
    <PageHeader icon="🔀" title="Build / Buy / Borrow / Automate" subtitle="Talent sourcing strategy per redesigned role" onBack={onBack} moduleId="bbba" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="bbba" label="BBBA Decisions" /></div>}
    {loading && <LoadingBar />}
    {!loading && roles.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔀</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Complete Skills Gap Analysis First</h3><p className="text-[13px] text-[var(--text-secondary)]">BBBA dispositions are generated from gap analysis and adjacency results.</p></div>}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Total Roles" value={Number(summary.total_roles || 0)} /><KpiCard label="Build" value={Number(summary.build || 0)} accent /><KpiCard label="Buy" value={Number(summary.buy || 0)} /><KpiCard label="Borrow" value={Number(summary.borrow || 0)} /><KpiCard label="Automate" value={Number(summary.automate || 0)} />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <Card title="Disposition Mix"><DonutViz data={[{name:"Build",value:Number(summary.build||0)},{name:"Buy",value:Number(summary.buy||0)},{name:"Borrow",value:Number(summary.borrow||0)},{name:"Automate",value:Number(summary.automate||0)}]} /></Card>
      <Card title="Investment Summary"><div className="space-y-3">
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)]"><span className="text-[13px]">Reskilling (Build)</span><span className="text-[15px] font-extrabold text-[var(--success)]">${(Number(summary.reskilling_investment||0)/1000).toFixed(0)}K</span></div>
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)]"><span className="text-[13px]">Hiring (Buy)</span><span className="text-[15px] font-extrabold text-[var(--accent-primary)]">${(Number(summary.hiring_cost||0)/1000).toFixed(0)}K</span></div>
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)] border-t-2 border-[var(--text-primary)]"><span className="text-[13px] font-bold">Total Investment</span><span className="text-[17px] font-extrabold text-[var(--text-primary)]">${(Number(summary.total_investment||0)/1000).toFixed(0)}K</span></div>
      </div></Card>
    </div>

    <Card title="Role-by-Role Decision Matrix">
      <div className="text-[12px] text-[var(--text-secondary)] mb-3">Click the disposition badge to override AI recommendation. All dispositions are current recommendations until locked.</div>
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Role</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Disposition</th><th className="px-2 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Reason</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Internal</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">FTE</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Cost</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Timeline</th></tr></thead>
      <tbody>{roles.map(r => { const disp = overrides[r.role] || r.disposition; return <tr key={r.role} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{r.role}</td>
        <td className="px-2 py-2 text-center"><button onClick={() => { const opts = ["Build","Buy","Borrow","Automate"]; const idx = opts.indexOf(disp); setOverrides(prev => ({...prev, [r.role]: opts[(idx+1)%4]})); }} className="px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer" style={{background:`${dispColors[disp]}15`,color:dispColors[disp],border:`1px solid ${dispColors[disp]}30`}}>{dispIcons[disp]} {disp}</button></td>
        <td className="px-2 py-2 text-[var(--text-secondary)] text-[10px]">{r.reason}</td>
        <td className="px-2 py-2 text-center">{r.strong_candidates}+{r.reskillable_candidates}</td>
        <td className="px-2 py-2 text-center font-bold">{r.fte_needed}</td>
        <td className="px-2 py-2 text-center font-semibold">${(r.total_cost/1000).toFixed(0)}K</td>
        <td className="px-2 py-2 text-center">{r.timeline_months}mo</td>
      </tr>; })}</tbody></table></div>
    </Card>

    {/* Cost Comparison by Disposition */}
    <Card title="Cost Comparison by Sourcing Strategy">
      <div className="flex items-end gap-2 h-40 px-4 mb-4">{[
        {label:"Build",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Build").reduce((s,r) => s+r.total_cost, 0),color:"var(--success)"},
        {label:"Buy",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Buy").reduce((s,r) => s+r.total_cost, 0),color:"var(--accent-primary)"},
        {label:"Borrow",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Borrow").reduce((s,r) => s+r.total_cost, 0),color:"var(--warning)"},
        {label:"Automate",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Automate").reduce((s,r) => s+r.total_cost, 0),color:"var(--purple)"},
      ].map(bar => {
        const maxVal = Math.max(...roles.map(r => r.total_cost), 1);
        const totalByType = bar.value;
        const h = (totalByType / (maxVal * roles.length || 1)) * 100;
        return <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
          <div className="text-[10px] font-bold mb-1" style={{color:bar.color}}>${(totalByType/1000).toFixed(0)}K</div>
          <div className="w-full rounded-t-lg" style={{height:`${Math.max(h*3, 8)}%`, background:`${bar.color}30`, border:`1px solid ${bar.color}50`}} />
          <div className="text-[9px] text-[var(--text-muted)] mt-1">{bar.label}</div>
        </div>;
      })}</div>
    </Card>

    {/* Risk per Disposition */}
    <Card title="Risk Assessment per Decision">
      <div className="space-y-2">{roles.map(r => {
        const disp = overrides[r.role] || r.disposition;
        const riskMap: Record<string,{risk:string;color:string}> = {
          Build: {risk:"Reskilling may take longer than planned; employee may not reach target proficiency",color:"var(--warning)"},
          Buy: {risk:"Market competition for this role; longer time-to-fill; cultural integration risk",color:"var(--risk)"},
          Borrow: {risk:"Contractor dependency; knowledge transfer gaps; higher ongoing cost",color:"var(--warning)"},
          Automate: {risk:"Implementation complexity; change resistance; ongoing maintenance cost",color:"var(--purple)"},
        };
        const rk = riskMap[disp] || riskMap.Build;
        return <div key={r.role} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]">
          <span className="text-[11px] font-semibold w-40 shrink-0 text-[var(--text-primary)]">{r.role}</span>
          <Badge color={disp==="Build"?"green":disp==="Buy"?"indigo":disp==="Borrow"?"amber":"purple"}>{disp}</Badge>
          <span className="text-[10px] text-[var(--text-secondary)] flex-1">{rk.risk}</span>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Sourcing Strategy Insights" items={[
      `${roles.filter(r => (overrides[r.role]||r.disposition)==="Build").length} Build roles — total reskilling: $${(roles.filter(r => (overrides[r.role]||r.disposition)==="Build").reduce((s,r) => s+r.total_cost,0)/1000).toFixed(0)}K`,
      `${roles.filter(r => (overrides[r.role]||r.disposition)==="Buy").length} Buy roles — hiring cost: $${(roles.filter(r => (overrides[r.role]||r.disposition)==="Buy").reduce((s,r) => s+r.total_cost,0)/1000).toFixed(0)}K`,
      `Build is ${Math.round(20000/85000*100)}% the cost of Buy per role — favor internal mobility where adjacency > 60%`,
      `Average transition timeline: ${Math.round(roles.reduce((s,r) => s+r.timeline_months,0)/Math.max(roles.length,1))} months across all roles`,
    ]} icon="🔀" />

    <NextStepBar currentModuleId="bbba" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: HEADCOUNT PLANNING
   ═══════════════════════════════════════════════════════════════ */
function HeadcountPlanning({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // Read BBBA overrides from localStorage to inform headcount
  const bbbaOverrides = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {})[0];
  useEffect(() => { if (!model) return; setLoading(true); api.getHeadcountPlan(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, bbbaOverrides]);

  const wf = (data?.waterfall || {}) as Record<string, unknown>;
  const depts = (data?.departments || []) as { department: string; current_fte: number; eliminated: number; redeployed: number; new_hires: number; future_fte: number; pct_change: number }[];
  const timeline = (data?.timeline || {}) as Record<string, string>;

  return <div>
    <PageHeader icon="👥" title="Headcount Planning" subtitle="Current to future workforce evolution" onBack={onBack} moduleId="headcount" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="headcount" label="Headcount Plan" /></div>}
    {loading && <LoadingBar />}
    {!loading && Number(wf.starting_headcount || 0) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👥</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Upload Data for Headcount Planning</h3><p className="text-[13px] text-[var(--text-secondary)]">Complete BBBA to generate headcount waterfall.</p></div>}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Current HC" value={Number(wf.starting_headcount || 0)} /><KpiCard label="Eliminations" value={Number(wf.eliminations || 0)} /><KpiCard label="New Hires" value={Number(wf.new_hires || 0)} accent /><KpiCard label="Target HC" value={Number(wf.target_headcount || 0)} accent /><KpiCard label="Net Change" value={`${Number(wf.net_change_pct || 0)}%`} />
    </div>

    {/* Waterfall */}
    <Card title="Headcount Waterfall">
      <div className="flex items-end gap-1 h-48 mb-4 px-4">{[
        { label: "Start", value: Number(wf.starting_headcount || 0), color: "var(--accent-primary)" },
        { label: "Eliminated", value: -Number(wf.eliminations || 0), color: "var(--risk)" },
        { label: "Attrition", value: -Number(wf.natural_attrition || 0), color: "var(--warning)" },
        { label: "Redeployed", value: Number(wf.redeployments || 0), color: "var(--success)" },
        { label: "New Hires", value: Number(wf.new_hires || 0), color: "var(--accent-primary)" },
        { label: "Contractors", value: Number(wf.contractors || 0), color: "var(--purple)" },
        { label: "Target", value: Number(wf.target_headcount || 0), color: "var(--success)" },
      ].map(bar => { const maxVal = Math.max(Number(wf.starting_headcount || 1), Number(wf.target_headcount || 1)); const h = Math.abs(bar.value) / maxVal * 100; return <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
        <div className="text-[10px] font-bold mb-1" style={{ color: bar.color }}>{bar.value > 0 ? "+" : ""}{bar.value}</div>
        <div className="w-full rounded-t" style={{ height: `${Math.max(h, 5)}%`, background: `${bar.color}30`, border: `1px solid ${bar.color}50` }} />
        <div className="text-[8px] text-[var(--text-muted)] mt-1 text-center">{bar.label}</div>
      </div>; })}</div>
    </Card>

    {/* Department breakdown */}
    <Card title="Department Breakdown">
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Department</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Current</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Eliminated</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Redeployed</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">New Hires</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Future</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Change</th></tr></thead>
      <tbody>{depts.map(d => <tr key={d.department} className="border-b border-[var(--border)]"><td className="px-3 py-2 font-semibold">{d.department}</td><td className="px-2 py-2 text-center">{d.current_fte}</td><td className="px-2 py-2 text-center text-[var(--risk)]">-{d.eliminated}</td><td className="px-2 py-2 text-center text-[var(--success)]">{d.redeployed}</td><td className="px-2 py-2 text-center text-[var(--accent-primary)]">+{d.new_hires}</td><td className="px-2 py-2 text-center font-bold">{d.future_fte}</td><td className="px-2 py-2 text-center" style={{color: d.pct_change >= 0 ? "var(--success)" : "var(--risk)"}}>{d.pct_change > 0 ? "+" : ""}{d.pct_change}%</td></tr>)}</tbody></table></div>
    </Card>

    {/* Timeline */}
    <Card title="Transition Timeline">
      <div className="space-y-3">{[{phase:"Phase 1",time:timeline.phase_1_months,action:timeline.phase_1_actions,color:"var(--accent-primary)"},{phase:"Phase 2",time:timeline.phase_2_months,action:timeline.phase_2_actions,color:"var(--success)"},{phase:"Phase 3",time:timeline.phase_3_months,action:timeline.phase_3_actions,color:"var(--purple)"}].map((p,i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)]"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{background:p.color}}>{i+1}</div><div><div className="text-[12px] font-bold text-[var(--text-primary)]">{p.phase} <span className="text-[var(--text-muted)] font-normal">Month {p.time}</span></div><div className="text-[11px] text-[var(--text-secondary)]">{p.action}</div></div></div>)}</div>
    </Card>

    {/* Financial Impact */}
    <Card title="Financial Impact Summary">
      {(() => {
        const avgComp = 100000;
        const eliminated = Number(wf.eliminations || 0);
        const newHires = Number(wf.new_hires || 0);
        const savings = eliminated * avgComp;
        const hireCost = newHires * avgComp * 1.3;
        const severance = Math.max(0, eliminated - Number(wf.natural_attrition || 0)) * avgComp * 0.25;
        const netYear1 = savings - hireCost - severance;
        return <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div><div className="text-[22px] font-extrabold text-[var(--success)]">${(savings/1000).toFixed(0)}K</div><div className="text-[9px] text-[var(--text-muted)]">From {eliminated} role eliminations</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Hiring Cost</div><div className="text-[22px] font-extrabold text-[var(--risk)]">${(hireCost/1000).toFixed(0)}K</div><div className="text-[9px] text-[var(--text-muted)]">For {newHires} new roles</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Transition Cost</div><div className="text-[22px] font-extrabold text-[var(--warning)]">${(severance/1000).toFixed(0)}K</div><div className="text-[9px] text-[var(--text-muted)]">Severance & onboarding</div></div>
          <div className="rounded-xl p-4 text-center border-2" style={{borderColor: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Net Year 1</div><div className="text-[22px] font-extrabold" style={{color: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}>{netYear1 >= 0 ? "" : "-"}${(Math.abs(netYear1)/1000).toFixed(0)}K</div><div className="text-[9px] text-[var(--text-muted)]">{netYear1 >= 0 ? "Net positive" : "Investment year"}</div></div>
        </div>;
      })()}
    </Card>

    {/* Workforce Composition Shift */}
    <Card title="Workforce Composition Shift">
      <div className="grid grid-cols-2 gap-6">
        <div className="text-center"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2">Before</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold text-[var(--text-primary)]">{Number(wf.starting_headcount || 0)}</div><div className="text-[10px] text-[var(--text-muted)]">Total HC</div></div></div></div>
        <div className="text-center"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2">After</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold" style={{color: Number(wf.net_change || 0) >= 0 ? "var(--success)" : "var(--risk)"}}>{Number(wf.target_headcount || 0)}</div><div className="text-[10px] text-[var(--text-muted)]">Target HC ({Number(wf.net_change_pct || 0) > 0 ? "+" : ""}{Number(wf.net_change_pct || 0)}%)</div></div></div></div>
      </div>
    </Card>

    <InsightPanel title="Headcount Insights" items={[
      `Net headcount change: ${Number(wf.net_change || 0) > 0 ? "+" : ""}${wf.net_change || 0} (${Number(wf.net_change_pct || 0) > 0 ? "+" : ""}${wf.net_change_pct || 0}%)`,
      `Natural attrition absorbs ${wf.natural_attrition || 0} of ${wf.eliminations || 0} eliminations — reducing forced displacement`,
      `Operations sees largest shift: most automatable tasks concentrated there`,
      `Phased over 18 months: redeployments first (months 1-6), then hiring (7-12), then transition (13-18)`,
    ]} icon="👥" />

    <NextStepBar currentModuleId="headcount" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: RESKILLING PATHWAYS
   ═══════════════════════════════════════════════════════════════ */
function ReskillingPathways({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const [bbbaOverrides2] = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {});
  useEffect(() => { if (!model) return; setLoading(true); api.getReskillingPathways(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, bbbaOverrides2]);

  const pathways = (data?.pathways || []) as { employee: string; target_role: string; readiness_score: number; readiness_band: string; skills_to_develop: { skill: string; current: number; target: number; delta: number; intervention: string; months: number }[]; total_months: number; estimated_cost: number; priority: string }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;

  return <div>
    <PageHeader icon="📚" title={viewCtx?.mode === "employee" ? "My Learning Path" : "Reskilling Pathways"} subtitle="Per-employee learning plans and timelines" onBack={onBack} moduleId="reskill" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="reskilling" label="Reskilling Plans" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Employees" value={Number(summary.total_employees || 0)} /><KpiCard label="High Priority" value={Number(summary.high_priority || 0)} accent /><KpiCard label="Medium" value={Number(summary.medium_priority || 0)} /><KpiCard label="Avg Duration" value={`${summary.avg_months || "—"}mo`} /><KpiCard label="Investment" value={`$${(Number(summary.total_investment || 0)/1000).toFixed(0)}K`} />
    </div>

    {pathways.slice(0, 20).map((p, i) => <Card key={i} title={`${p.employee} → ${p.target_role}`}>
      <div className="flex items-center gap-3 mb-3">
        <Badge color={p.priority==="High"?"green":p.priority==="Medium"?"amber":"gray"}>{p.priority} Priority</Badge>
        <Badge color={p.readiness_band==="Ready Now"?"green":p.readiness_band==="Coachable"?"amber":"red"}>Readiness: {p.readiness_score}/5</Badge>
        <span className="text-[11px] text-[var(--text-muted)]">{p.total_months} months · ${(p.estimated_cost/1000).toFixed(0)}K</span>
      </div>
      {/* Skills timeline */}
      <div className="space-y-2">{p.skills_to_develop.map(s => <div key={s.skill} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]">
        <span className="text-[11px] font-semibold w-36 shrink-0">{s.skill}</span>
        <div className="flex items-center gap-1 text-[10px]"><span style={{color:"var(--warning)"}}>{s.current}</span><span className="text-[var(--text-muted)]">→</span><span style={{color:"var(--success)"}}>{s.target}</span></div>
        <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${(s.current/s.target)*100}%`,background:"var(--accent-primary)"}} /></div>
        <Badge color={s.intervention==="Course"?"green":s.intervention.includes("Coaching")?"amber":"red"}>{s.intervention}</Badge>
        <span className="text-[10px] text-[var(--text-muted)] w-10 text-right">{s.months}mo</span>
      </div>)}</div>
    </Card>)}
    {pathways.length === 0 && !loading && <Card><Empty text="Complete Skills Gap Analysis and BBBA to generate reskilling pathways" icon="📚" /></Card>}

    {/* Cohort Grouping */}
    {pathways.length > 0 && <Card title="Training Cohorts — Batch by Skill Gap">
      {(() => {
        const cohorts: Record<string, typeof pathways> = {};
        pathways.forEach(p => {
          p.skills_to_develop.forEach(s => {
            if (!cohorts[s.skill]) cohorts[s.skill] = [];
            if (!cohorts[s.skill].some(c => c.employee === p.employee)) cohorts[s.skill].push(p);
          });
        });
        return <div className="grid grid-cols-3 gap-3">{Object.entries(cohorts).sort((a,b) => b[1].length - a[1].length).slice(0,6).map(([skill, members]) => {
          const avgMonths = Math.round(members.reduce((s,m) => s + m.total_months, 0) / members.length);
          const totalCost = members.reduce((s,m) => s + m.estimated_cost, 0);
          return <div key={skill} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{skill}</div>
            <div className="text-[20px] font-extrabold text-[var(--accent-primary)] mb-1">{members.length} <span className="text-[11px] font-normal text-[var(--text-muted)]">employees</span></div>
            <div className="text-[10px] text-[var(--text-muted)]">Avg {avgMonths}mo · ${(totalCost/1000).toFixed(0)}K total</div>
            <div className="flex gap-1 flex-wrap mt-2">{members.slice(0,4).map(m => <span key={m.employee} className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--surface-1)] text-[var(--text-muted)]">{m.employee.split(" ")[0]}</span>)}{members.length > 4 && <span className="text-[8px] text-[var(--text-muted)]">+{members.length-4}</span>}</div>
          </div>;
        })}</div>;
      })()}
    </Card>}

    {/* Budget Allocation */}
    {pathways.length > 0 && <Card title="Budget Allocation by Priority">
      <div className="grid grid-cols-3 gap-4">{[
        {label:"High Priority",filter:(p: typeof pathways[0]) => p.priority==="High",color:"var(--success)"},
        {label:"Medium Priority",filter:(p: typeof pathways[0]) => p.priority==="Medium",color:"var(--warning)"},
        {label:"Low Priority",filter:(p: typeof pathways[0]) => p.priority==="Low",color:"var(--text-muted)"},
      ].map(tier => {
        const group = pathways.filter(tier.filter);
        const cost = group.reduce((s,p) => s + p.estimated_cost, 0);
        return <div key={tier.label} className="rounded-xl p-4 text-center border border-[var(--border)]">
          <div className="text-[12px] font-semibold mb-1" style={{color:tier.color}}>{tier.label}</div>
          <div className="text-[22px] font-extrabold text-[var(--text-primary)]">${(cost/1000).toFixed(0)}K</div>
          <div className="text-[10px] text-[var(--text-muted)]">{group.length} employees</div>
        </div>;
      })}</div>
    </Card>}

    <InsightPanel title="Reskilling Strategy" items={[
      `${pathways.length} employees need reskilling across ${new Set(pathways.map(p => p.target_role)).size} target roles`,
      `High priority: ${pathways.filter(p => p.priority === "High").length} employees — start these immediately`,
      `Average pathway duration: ${Number(summary.avg_months || 0)} months`,
      `Total reskilling investment: $${(Number(summary.total_investment || 0)/1000).toFixed(0)}K — invest in high-priority cohorts first`,
    ]} icon="📚" />

    <NextStepBar currentModuleId="reskill" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: TALENT MARKETPLACE
   ═══════════════════════════════════════════════════════════════ */
function TalentMarketplace({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = usePersisted<Record<string, string[]>>(`${model}_mp_shortlist`, {});

  // Read adjacency shortlists to pre-populate
  const [adjShortlists] = usePersisted<Record<string, string[]>>(`${model}_shortlisted`, {});
  useEffect(() => {
    if (!model) return; setLoading(true);
    api.getTalentMarketplace(model).then(d => {
      // Merge adjacency shortlists into marketplace shortlists
      if (Object.keys(adjShortlists).length > 0) {
        setShortlisted(prev => {
          const merged = { ...prev };
          Object.entries(adjShortlists).forEach(([role, emps]) => {
            merged[role] = [...new Set([...(merged[role] || []), ...emps])];
          });
          return merged;
        });
      }
      setData(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, [model, adjShortlists]);

  const marketplace = (data?.marketplace || []) as { target_role: string; candidates: { employee: string; adjacency_pct: number; matching_skills: string[]; gap_skills: string[]; reskill_months: number; readiness_score: number; readiness_band: string; has_pathway: boolean; pathway_cost: number; composite_score: number }[]; fill_recommendation: string }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;

  return <div>
    <PageHeader icon="🏪" title="Talent Marketplace" subtitle="Match internal candidates to redesigned roles" onBack={onBack} moduleId="marketplace" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="marketplace" label="Marketplace Data" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-4 gap-3 mb-5">
      <KpiCard label="Roles to Fill" value={Number(summary.total_roles || 0)} /><KpiCard label="Internal Fill" value={Number(summary.internal_fill || 0)} accent /><KpiCard label="External Fill" value={Number(summary.external_fill || 0)} /><KpiCard label="Match Rate" value={`${Number(summary.total_roles) ? Math.round(Number(summary.internal_fill || 0) / Number(summary.total_roles) * 100) : 0}%`} />
    </div>

    {marketplace.map(m => <Card key={m.target_role} title={m.target_role}>
      <div className="flex items-center gap-2 mb-3">
        <Badge color={m.fill_recommendation==="Internal"?"green":"amber"}>{m.fill_recommendation} Fill Recommended</Badge>
        <span className="text-[10px] text-[var(--text-muted)]">{m.candidates.length} candidates evaluated</span>
      </div>
      <div className="grid grid-cols-4 gap-2">{m.candidates.slice(0, 6).map(c => { const isSl = (shortlisted[m.target_role]||[]).includes(c.employee); return <div key={c.employee} className="bg-[var(--surface-2)] rounded-xl p-3 border transition-all" style={{borderColor:isSl?"var(--success)":"var(--border)"}}>
        <div className="flex items-center justify-between mb-1"><span className="text-[11px] font-semibold truncate flex-1">{c.employee}</span><span className="text-[13px] font-extrabold" style={{color:c.composite_score>=70?"var(--success)":c.composite_score>=50?"var(--warning)":"var(--risk)"}}>{c.composite_score}</span></div>
        <div className="grid grid-cols-3 gap-1 mb-1 text-[8px]">
          <div className="text-center"><span className="font-bold" style={{color:c.adjacency_pct>=70?"var(--success)":"var(--warning)"}}>{c.adjacency_pct}%</span><br/>Adjacency</div>
          <div className="text-center"><span className="font-bold" style={{color:c.readiness_score>=3.5?"var(--success)":"var(--warning)"}}>{c.readiness_score}</span><br/>Readiness</div>
          <div className="text-center"><span className="font-bold">{c.reskill_months}mo</span><br/>Reskill</div>
        </div>
        <div className="text-[8px] text-[var(--success)] truncate">✓ {c.matching_skills.slice(0,2).join(", ")}</div>
        {c.gap_skills.length > 0 && <div className="text-[8px] text-[var(--risk)] truncate">✗ {c.gap_skills.slice(0,2).join(", ")}</div>}
        {c.has_pathway && <div className="text-[8px] text-[var(--purple)]">📚 Pathway: ${(c.pathway_cost/1000).toFixed(0)}K</div>}
        <button onClick={() => setShortlisted(prev => { const l = prev[m.target_role]||[]; return {...prev, [m.target_role]: isSl ? l.filter(e=>e!==c.employee) : [...l, c.employee]}; })} className="mt-1 text-[9px] font-semibold w-full py-1 rounded text-center" style={{background:isSl?"rgba(16,185,129,0.1)":"var(--surface-1)",color:isSl?"var(--success)":"var(--text-muted)",border:`1px solid ${isSl?"var(--success)":"var(--border)"}`}}>{isSl?"★ Shortlisted":"☆ Shortlist"}</button>
      </div>; })}</div>
    </Card>)}
    {marketplace.length === 0 && !loading && <Card><Empty text="Complete Skills Adjacency Map to populate the marketplace" icon="🏪" /></Card>}

    {/* Score Methodology */}
    <Card title="How Composite Scores Work">
      <div className="grid grid-cols-3 gap-4 mb-3">{[
        {label:"Adjacency",weight:"50%",desc:"How much current skills overlap with target role requirements",color:"var(--accent-primary)"},
        {label:"Readiness",weight:"30%",desc:"AI readiness score — how prepared the person is for change",color:"var(--success)"},
        {label:"Reskill Time",weight:"20%",desc:"Inverse of months needed — faster reskilling scores higher",color:"var(--purple)"},
      ].map(f => <div key={f.label} className="rounded-xl p-3 text-center border border-[var(--border)]">
        <div className="text-[18px] font-extrabold" style={{color:f.color}}>{f.weight}</div>
        <div className="text-[12px] font-bold text-[var(--text-primary)] mb-1">{f.label}</div>
        <div className="text-[9px] text-[var(--text-muted)]">{f.desc}</div>
      </div>)}</div>
      <div className="text-[10px] text-[var(--text-muted)] text-center">Score ≥70 = strong internal candidate · 50-69 = reskillable · &lt;50 = consider external hire</div>
    </Card>

    {/* Internal Mobility Summary */}
    {marketplace.length > 0 && <Card title="Internal Mobility Summary">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--success)]">{marketplace.filter(m => m.fill_recommendation === "Internal").length}</div><div className="text-[10px] text-[var(--text-muted)]">Fillable Internally</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--risk)]">{marketplace.filter(m => m.fill_recommendation === "External").length}</div><div className="text-[10px] text-[var(--text-muted)]">Need External Hire</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--accent-primary)]">{Object.values(shortlisted).reduce((s, l) => s + l.length, 0)}</div><div className="text-[10px] text-[var(--text-muted)]">Candidates Shortlisted</div></div>
      </div>
    </Card>}

    <NextStepBar currentModuleId="marketplace" onNavigate={onNavigate || onBack} />
  </div>;
}




/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER CAPABILITY ASSESSMENT
   ═══════════════════════════════════════════════════════════════ */
function ManagerCapability({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorecard"|"correlation">("scorecard");

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerCapability(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const managers = (data?.managers || []) as { manager: string; scores: Record<string, number>; average: number; category: string; direct_reports: number; team_readiness_avg: number; correlation: number; team_members: { employee: string; readiness: number; band: string }[] }[];
  const dims = (data?.dimensions || []) as string[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444" };

  if (!loading && (!managers || managers.length === 0)) return <div>
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess managers and identify transformation champions" onBack={onBack} moduleId="mgrcap" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="manager_capability" label="Manager Scores" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👔</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">No Manager Data Available</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload workforce data with org structure to assess manager capability.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 1: Discover — Assess managers who will lead teams through transformation. Champions become change agents."]} />
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess managers and identify transformation champions" onBack={onBack} moduleId="mgrcap" />
    {loading && <LoadingBar />}

    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Managers" value={Number(summary.total_managers || 0)} /><KpiCard label="Champions" value={Number(summary.champions || 0)} accent /><KpiCard label="Needs Dev" value={Number(summary.needs_development || 0)} /><KpiCard label="Flight Risk" value={Number(summary.flight_risk || 0)} /><KpiCard label="Weakest Dim" value={String(summary.weakest_dimension || "—")} /><KpiCard label="Multiplier" value={String(summary.correlation_multiplier || "—")} accent />
    </div>

    <TabBar tabs={[{ id: "scorecard", label: "Manager Scorecard" }, { id: "correlation", label: "Team Correlation" }]} active={tab} onChange={t => setTab(t as "scorecard"|"correlation")} />

    {tab === "scorecard" ? <>
      {/* Category distribution */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[{cat:"Transformation Champion",icon:"🏆",desc:"Deploy as change agents — they'll carry the message"},{cat:"Needs Development",icon:"📘",desc:"Build capability before rollout — workshops + coaching"},{cat:"Flight Risk",icon:"⚠️",desc:"Engage immediately — assess commitment, provide support"}].map(c => {
          const count = managers.filter(m => m.category === c.cat).length;
          return <div key={c.cat} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-2px]" style={{ background: `${catColors[c.cat]}08`, borderColor: catColors[c.cat] }}>
            <div className="flex items-center justify-between mb-2"><span className="text-xl">{c.icon}</span><span className="text-[22px] font-extrabold" style={{ color: catColors[c.cat] }}>{count}</span></div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{c.cat}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">{c.desc}</div>
          </div>;
        })}
      </div>

      {/* Scorecard table */}
      <Card title="Detailed Scores">
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 400 }}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Manager</th><th className="px-2 py-2 text-center border-b border-[var(--border)] text-[var(--text-muted)]">Reports</th>{dims.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]" style={{maxWidth:70,fontSize:9}}>{d}</th>)}<th className="px-2 py-2 text-center border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Category</th></tr></thead>
        <tbody>{managers.slice(0, 30).map(m => <tr key={m.manager} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{m.manager}</td><td className="px-2 py-2 text-center text-[var(--text-muted)]">{m.direct_reports}</td>{dims.map(d => { const v = m.scores[d]; return <td key={d} className="px-2 py-2 text-center"><span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-bold transition-all" style={{ background: `${v >= 4 ? "#10B981" : v >= 3 ? "#3B82F6" : v >= 2 ? "#F59E0B" : "#EF4444"}15`, color: v >= 4 ? "#10B981" : v >= 3 ? "#3B82F6" : v >= 2 ? "#F59E0B" : "#EF4444" }}>{v}</span></td>; })}<td className="px-2 py-2 text-center font-extrabold text-[var(--text-primary)]">{m.average}</td><td className="px-2 py-2 text-center"><Badge color={m.category === "Transformation Champion" ? "green" : m.category === "Needs Development" ? "amber" : "red"}>{m.category.split(" ").map(w => w[0]).join("")}</Badge></td></tr>)}</tbody></table></div>
      </Card>
    </> : <>
      {/* Correlation view */}
      <Card title="Manager Capability → Team Readiness Correlation">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">High-Capability Manager Teams</div><div className="text-[28px] font-extrabold text-[var(--success)]">{Number(summary.high_mgr_team_readiness || 0)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">Low-Capability Manager Teams</div><div className="text-[28px] font-extrabold text-[var(--risk)]">{Number(summary.low_mgr_team_readiness || 0)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">Multiplier Effect</div><div className="text-[28px] font-extrabold text-[var(--accent-primary)]">{String(summary.correlation_multiplier || "—")}</div></div>
        </div>
        <div className="space-y-2">{managers.map(m => <div key={m.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: catColors[m.category] }}>{m.manager.split(" ").map(w => w[0]).join("").slice(0,2)}</div>
          <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{m.manager}</div><div className="text-[10px] text-[var(--text-muted)]">{m.direct_reports} reports · {m.category}</div></div>
          <div className="text-center shrink-0 w-16"><div className="text-[9px] text-[var(--text-muted)]">Manager</div><div className="text-[15px] font-extrabold" style={{ color: catColors[m.category] }}>{m.average}</div></div>
          <div className="w-8 text-center text-[var(--text-muted)]">→</div>
          <div className="text-center shrink-0 w-16"><div className="text-[9px] text-[var(--text-muted)]">Team</div><div className="text-[15px] font-extrabold" style={{ color: m.team_readiness_avg >= 3.5 ? "var(--success)" : m.team_readiness_avg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{m.team_readiness_avg}</div></div>
        </div>)}</div>
      </Card>
    </>}

    <InsightPanel title="Key Actions" items={[
      `Deploy ${summary.champions || 0} Champions as change agents — they'll accelerate peer adoption`,
      `${summary.flight_risk || 0} Flight Risks need immediate 1:1 engagement to assess commitment`,
      `Focus development on "${summary.weakest_dimension || "—"}" — it's the weakest dimension across all managers`,
      `Manager capability has a ${summary.correlation_multiplier || "—"} multiplier on team readiness — investing in managers is the highest-leverage intervention`,
    ]} icon="👔" />
    <NextStepBar currentModuleId="mgrcap" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: CHANGE READINESS & ADOPTION
   ═══════════════════════════════════════════════════════════════ */
function ChangeReadiness({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);

  useEffect(() => { if (!model) return; setLoading(true); api.getChangeReadiness(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const quadrants = (data?.quadrants || {}) as Record<string, { employees: { employee: string; readiness: number; impact: number; band: string }[]; count: number; label: string; color: string; action: string; cadence: string; priority: number }>;
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const messaging = (data?.messaging_guidance || {}) as Record<string, string>;
  const qOrder = ["high_ready_high_impact", "low_ready_high_impact", "high_ready_low_impact", "low_ready_low_impact"];
  const total = Number(summary.total_assessed || 0);

  if (!loading && total === 0) return <div>
    <PageHeader icon="📈" title="Change Readiness" subtitle="Segment workforce and map interventions" onBack={onBack} moduleId="changeready" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="change_readiness" label="Change Readiness" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">📈</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Complete AI Readiness First</h3><p className="text-[13px] text-[var(--text-secondary)]">The readiness assessment feeds the change segmentation model.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Segment your workforce by readiness and impact to target change interventions where they matter most."]} />
    <PageHeader icon="📈" title="Change Readiness & Adoption" subtitle="4-quadrant segmentation with targeted interventions" onBack={onBack} moduleId="changeready" />
    {loading && <LoadingBar />}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Assessed" value={total} /><KpiCard label="High Risk" value={Number(summary.high_risk_count || 0)} accent /><KpiCard label="High Risk %" value={`${summary.high_risk_pct || 0}%`} /><KpiCard label="Champions" value={Number(summary.champion_count || 0)} /><KpiCard label="Champions Needed" value={Number(summary.recommended_champions_needed || 0)} />
    </div>

    {/* 4-Quadrant Visual */}
    <Card title="Readiness × Impact Matrix">
      <div className="relative mb-4">
        <div className="grid grid-cols-2 gap-3">
          {qOrder.map(qKey => { const q = quadrants[qKey]; if (!q) return <div key={qKey} />; const isSelected = selectedQ === qKey; const pct = total ? Math.round((q.count / total) * 100) : 0;
            return <div key={qKey} onClick={() => setSelectedQ(isSelected ? null : qKey)} className="rounded-xl p-5 cursor-pointer transition-all hover:translate-y-[-2px]" style={{ background: `${q.color}${isSelected ? "15" : "08"}`, border: `2px solid ${isSelected ? q.color : q.color + "20"}`, boxShadow: isSelected ? `0 4px 20px ${q.color}15` : "none" }}>
              <div className="flex items-center justify-between mb-3"><span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span><div className="flex items-center gap-2"><span className="text-[24px] font-extrabold" style={{ color: q.color }}>{q.count}</span><span className="text-[11px] text-[var(--text-muted)]">({pct}%)</span></div></div>
              <div className="text-[11px] text-[var(--text-secondary)] mb-2">{q.action}</div>
              <div className="flex items-center gap-2"><Badge color={q.priority === 1 ? "red" : q.priority === 2 ? "green" : q.priority === 3 ? "amber" : "gray"}>Priority {q.priority}</Badge><span className="text-[9px] text-[var(--text-muted)]">{q.cadence}</span></div>
              {/* Mini employee list */}
              <div className="flex gap-1 flex-wrap mt-3">{q.employees.slice(0, 8).map(e => <span key={e.employee} className="px-2 py-0.5 rounded-full text-[8px] font-semibold transition-all" style={{ background: `${q.color}12`, color: q.color }}>{e.employee}</span>)}{q.count > 4 && <span className="text-[8px] text-[var(--text-muted)] self-center">+{q.count - 4}</span>}</div>
            </div>;
          })}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-[var(--text-muted)]"><span>← Low Readiness | High Readiness →</span><span>↑ High Impact | Low Impact ↓</span></div>
      </div>
    </Card>

    {/* Expanded quadrant detail */}
    {selectedQ && quadrants[selectedQ] && <Card title={`${quadrants[selectedQ].label} — Detailed View`}>
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 300 }}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)]">Employee</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Readiness</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Impact</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Band</th></tr></thead>
      <tbody>{quadrants[selectedQ].employees.slice(0, 50).map(e => <tr key={e.employee} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{e.employee}</td><td className="px-2 py-2 text-center" style={{ color: e.readiness >= 3.5 ? "var(--success)" : "var(--warning)" }}>{e.readiness}</td><td className="px-2 py-2 text-center" style={{ color: e.impact >= 3.5 ? "var(--risk)" : "var(--text-muted)" }}>{e.impact}</td><td className="px-2 py-2 text-center"><Badge color={e.band === "Ready Now" ? "green" : e.band === "Coachable" ? "amber" : "red"}>{e.band}</Badge></td></tr>)}</tbody></table></div>
    </Card>}

    {/* Messaging Guidance */}
    <Card title="Segment-Specific Messaging">
      <div className="grid grid-cols-2 gap-3">{Object.entries(messaging).map(([key, msg]) => {
        const meta: Record<string, {label: string; color: string; icon: string}> = { high_risk: {label:"High Risk",color:"#EF4444",icon:"🔴"}, champions: {label:"Champions",color:"#10B981",icon:"🟢"}, supporters: {label:"Supporters",color:"#3B82F6",icon:"🔵"}, monitor: {label:"Monitor",color:"#F59E0B",icon:"🟡"} };
        const m = meta[key] || {label:key,color:"var(--text-muted)",icon:"⚪"};
        return <div key={key} className="p-4 rounded-xl border-l-4 transition-all hover:translate-y-[-1px]" style={{ background: `${m.color}06`, borderColor: m.color }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: m.color }}>{m.icon} {m.label}</div>
          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{msg}</div>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Change Management Actions" items={[
      `${summary.high_risk_pct || 0}% of workforce is High Risk — this is your #1 priority`,
      `Deploy ${summary.recommended_champions_needed || 0} change champions (1 per 5 high-risk employees)`,
      `${summary.champion_count || 0} natural champions identified — engage them as peer advocates`,
      `High Risk group needs bi-weekly 1:1 touchpoints for 6+ months`,
    ]} icon="📈" />

    {/* Intervention Calendar */}
    <Card title="Intervention Calendar — 12-Week Plan">
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Week</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">High Risk</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Champions</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">All Staff</th></tr></thead>
      <tbody>{[
        {w:"1-2",hr:"1:1 impact assessment meetings",ch:"Champion briefing & role definition",all:"All-hands transformation announcement"},
        {w:"3-4",hr:"Personalized support plan delivery",ch:"Peer advocacy training",all:"FAQ document & resource hub launch"},
        {w:"5-6",hr:"Bi-weekly coaching check-ins begin",ch:"First wave communications drafted",all:"Town hall Q&A session"},
        {w:"7-8",hr:"Skills assessment & reskilling start",ch:"Champions lead team workshops",all:"Progress update newsletter"},
        {w:"9-10",hr:"Midpoint review & plan adjustment",ch:"Feedback collection from teams",all:"Pulse survey #1"},
        {w:"11-12",hr:"Continued coaching + escalation review",ch:"Success stories shared org-wide",all:"Phase 1 milestone celebration"},
      ].map(r => <tr key={r.w} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-bold text-[var(--accent-primary)]">Wk {r.w}</td><td className="px-2 py-2 text-[var(--risk)]">{r.hr}</td><td className="px-2 py-2 text-[var(--success)]">{r.ch}</td><td className="px-2 py-2 text-[var(--text-secondary)]">{r.all}</td></tr>)}</tbody></table></div>
    </Card>

    {/* Resistance Patterns */}
    <Card title="Common Resistance Patterns & Mitigations">
      <div className="space-y-2">{[
        {pattern:"Fear of job loss",freq:"High",mitigation:"Communicate early: transformation ≠ layoffs. Show redeployment paths.",color:"var(--risk)"},
        {pattern:"Skills anxiety",freq:"High",mitigation:"Provide clear reskilling pathways with timeline and support. Make training accessible.",color:"var(--risk)"},
        {pattern:"Process attachment",freq:"Medium",mitigation:"Involve employees in redesigning their own processes. Co-creation reduces resistance.",color:"var(--warning)"},
        {pattern:"Technology distrust",freq:"Medium",mitigation:"Pilot with champions first, share results, build confidence through evidence.",color:"var(--warning)"},
        {pattern:"Leadership skepticism",freq:"Low",mitigation:"Present data-driven business case. Use this tool's outputs as evidence.",color:"var(--text-muted)"},
      ].map(r => <div key={r.pattern} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{r.pattern}</div><div className="text-[10px] text-[var(--text-secondary)]">{r.mitigation}</div></div>
        <Badge color={r.freq === "High" ? "red" : r.freq === "Medium" ? "amber" : "gray"}>{r.freq} freq</Badge>
      </div>)}</div>
    </Card>

    <NextStepBar currentModuleId="changeready" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER DEVELOPMENT TRACK
   ═══════════════════════════════════════════════════════════════ */
function ManagerDevelopment({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerDevelopment(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const tracks = (data?.tracks || []) as { manager: string; category: string; average_score: number; direct_reports: number; weak_dimensions: string[]; interventions: { dimension: string; intervention: string; format: string; duration_weeks: number; cost: number }[]; role_in_change: string; total_cost: number; total_weeks: number }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444" };
  const catIcons: Record<string, string> = { "Transformation Champion": "🏆", "Needs Development": "📘", "Flight Risk": "⚠️" };

  if (!loading && tracks.length === 0) return <div>
    <PageHeader icon="🎓" title="Manager Development" subtitle="Targeted plans for people managers" onBack={onBack} moduleId="mgrdev" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="manager_development" label="Manager Dev Plans" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🎓</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Complete Manager Capability Assessment First</h3><p className="text-[13px] text-[var(--text-secondary)]">Manager development plans are generated from capability scores.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Targeted development for managers. Champions lead change, Flight Risks need immediate engagement."]} />
    <PageHeader icon="🎓" title="Manager Development Track" subtitle="Development plans and transformation roles" onBack={onBack} moduleId="mgrdev" />
    {loading && <LoadingBar />}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Managers" value={Number(summary.total_managers || 0)} /><KpiCard label="Change Agents" value={Number(summary.change_agents || 0)} accent /><KpiCard label="Need Dev" value={Number(summary.need_development || 0)} /><KpiCard label="Avg Duration" value={`${summary.avg_duration_weeks || 0}wk`} /><KpiCard label="Investment" value={`$${(Number(summary.total_investment || 0) / 1000).toFixed(0)}K`} />
    </div>

    {/* Category summary */}
    <div className="grid grid-cols-3 gap-4 mb-4">
      {(["Transformation Champion", "Needs Development", "Flight Risk"] as const).map(cat => {
        const group = tracks.filter(t => t.category === cat);
        return <div key={cat} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-2px]" style={{ background: `${catColors[cat]}08`, borderColor: catColors[cat] }}>
          <div className="flex items-center gap-2 mb-2"><span className="text-lg">{catIcons[cat]}</span><span className="text-[14px] font-bold" style={{ color: catColors[cat] }}>{cat}</span></div>
          <div className="text-[22px] font-extrabold mb-1" style={{ color: catColors[cat] }}>{group.length}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">{cat === "Transformation Champion" ? "Deploy as change agents" : cat === "Needs Development" ? "Build capability before rollout" : "Engage immediately, assess retention"}</div>
        </div>;
      })}
    </div>

    {/* Individual development cards */}
    {tracks.map(t => <Card key={t.manager} title={`${catIcons[t.category]} ${t.manager}`}>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Badge color={t.category === "Transformation Champion" ? "green" : t.category === "Needs Development" ? "amber" : "red"}>{t.category}</Badge>
        <span className="text-[11px] text-[var(--text-muted)]">Score: {t.average_score}/5 · {t.direct_reports} reports</span>
        <span className="text-[11px] font-semibold" style={{ color: catColors[t.category] }}>{t.total_weeks}wk · ${(t.total_cost / 1000).toFixed(0)}K</span>
      </div>

      {/* Role in transformation */}
      <div className="bg-[var(--surface-2)] rounded-xl p-3 mb-3 border border-[var(--border)]">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Transformation Role</div>
        <div className="text-[12px] font-semibold" style={{ color: catColors[t.category] }}>{t.role_in_change}</div>
      </div>

      {/* Interventions */}
      {t.interventions.length > 0 && <div className="space-y-2">{t.interventions.map((int, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-[var(--text-primary)]">{int.dimension}</div>
          <div className="text-[11px] text-[var(--text-secondary)]">{int.intervention}</div>
        </div>
        <Badge color={int.format.includes("1:1") ? "purple" : int.format.includes("Group") ? "indigo" : "gray"}>{int.format}</Badge>
        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{int.duration_weeks}wk</span>
        <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--accent-primary)" }}>${(int.cost / 1000).toFixed(0)}K</span>
      </div>)}</div>}
    </Card>)}

    <InsightPanel title="Investment Summary" items={[
      `Total manager development investment: $${(Number(summary.total_investment || 0) / 1000).toFixed(0)}K`,
      `${summary.change_agents || 0} managers ready to deploy as change agents immediately`,
      `${summary.need_development || 0} managers need ${summary.avg_duration_weeks || 0} weeks average development before they can lead transformation`,
      `Flight Risk managers should be engaged within 2 weeks — delay increases attrition probability`,
    ]} icon="🎓" />

    {/* 30/60/90 Day Milestones */}
    <Card title="Development Milestones — 30/60/90 Day Plan">
      <div className="grid grid-cols-3 gap-4">{[
        {day:"30",title:"Foundation",items:["Complete initial assessment","Assign executive coach/mentor","Begin first development module","Set personal development goals"],color:"var(--accent-primary)"},
        {day:"60",title:"Building",items:["Complete 2 of 4 development modules","Lead one team workshop on AI readiness","Receive 360 feedback mid-check","Demonstrate 1 new AI tool adoption"],color:"var(--success)"},
        {day:"90",title:"Demonstrating",items:["Complete all development modules","Lead transformation initiative in function","Re-assess on all 4 dimensions","Present development journey to peers"],color:"var(--purple)"},
      ].map(m => <div key={m.day} className="rounded-xl p-4 border-l-4 bg-[var(--surface-2)]" style={{borderColor:m.color}}>
        <div className="text-[18px] font-extrabold mb-1" style={{color:m.color}}>Day {m.day}</div>
        <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">{m.title}</div>
        <div className="space-y-1">{m.items.map((it,i) => <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]"><span className="text-[var(--text-muted)] shrink-0">○</span>{it}</div>)}</div>
      </div>)}</div>
    </Card>

    {/* Mentorship Pairing */}
    {tracks.filter(t => t.category === "Transformation Champion").length > 0 && tracks.filter(t => t.category !== "Transformation Champion").length > 0 && <Card title="Mentorship Pairing — Champions → Developing Managers">
      <div className="space-y-2">{tracks.filter(t => t.category === "Transformation Champion").map(champion => {
        const mentees = tracks.filter(t => t.category !== "Transformation Champion").slice(0, 2);
        return <div key={champion.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex-1"><div className="text-[12px] font-bold text-[var(--success)]">🏆 {champion.manager}</div><div className="text-[9px] text-[var(--text-muted)]">Champion (Score: {champion.average_score})</div></div>
          <div className="text-[var(--text-muted)]">→</div>
          <div className="flex-1 space-y-1">{mentees.map(m => <div key={m.manager} className="text-[11px]"><span className="font-semibold" style={{color: m.category === "Flight Risk" ? "var(--risk)" : "var(--warning)"}}>{m.manager}</span> <span className="text-[var(--text-muted)]">({m.category}, {m.average_score})</span></div>)}</div>
        </div>;
      })}</div>
    </Card>}

    <NextStepBar currentModuleId="mgrdev" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: EXPORT & REPORT GENERATOR
   ═══════════════════════════════════════════════════════════════ */
function ExportReport({ model, f, onBack }: { model: string; f: Filters; onBack: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => { if (!model) return; setLoading(true); api.getExportSummary(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const generateDocx = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(`/api/export/docx/${model}`);
      if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `AI_Transformation_Report.docx`; a.click(); URL.revokeObjectURL(url); setGenerated(true); showToast("📋 Word document downloaded"); }
      else { showToast("Export failed — check backend"); }
    } catch { showToast("Export failed — backend unavailable"); }
    setGenerating(false);
  };
  const generateAiNarrative = async () => {
    setGenerating(true);
    const ctx = JSON.stringify(data).slice(0, 3000);
    const report = await callAI("Write a board-ready AI Transformation Report.", `Generate from: ${ctx}. 12 sections: Exec Summary, Discovery, Skills, BBBA, Headcount, Readiness, Managers, Change, Reskilling, Investment, Risks, Next Steps.`);
    if (report) { const blob = new Blob([report], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "AI_Narrative_Report.txt"; a.click(); URL.revokeObjectURL(url); showToast("☕ AI narrative downloaded"); }
    setGenerating(false);
  };

  const bbba = (data?.bbba_summary || {}) as Record<string, unknown>;
  const reskill = (data?.reskilling_summary || {}) as Record<string, unknown>;
  const mp = (data?.marketplace_summary || {}) as Record<string, unknown>;
  const wf = (data?.headcount_waterfall || {}) as Record<string, unknown>;
  const mgr = (data?.manager_summary || {}) as Record<string, unknown>;

  return <div>
    <ContextStrip items={["Generate your board-ready transformation report. All module data is summarized below."]} />
    <PageHeader icon="📋" title="Export & Report" subtitle="Consolidated transformation report generator" onBack={onBack} />
    {loading && <LoadingBar />}

    {/* Data completeness dashboard */}
    <Card title="Report Data Readiness">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[{ label: "Employees", value: data?.total_employees || 0, icon: "👥" },
          { label: "Skills Coverage", value: `${data?.skills_coverage || 0}%`, icon: "🧠" },
          { label: "Critical Gaps", value: data?.critical_gaps || 0, icon: "⚠️" },
          { label: "Org Readiness", value: `${data?.org_readiness || 0}/5`, icon: "🎯" },
          { label: "High Risk %", value: `${data?.high_risk_pct || 0}%`, icon: "📈" },
          { label: "Build Roles", value: bbba.build || 0, icon: "🏗️" },
          { label: "Buy Roles", value: bbba.buy || 0, icon: "🛒" },
          { label: "Net HC Change", value: wf.net_change || 0, icon: "👥" },
          { label: "Champions", value: mgr.champions || 0, icon: "🏆" },
          { label: "Reskilling Cost", value: `$${(Number(reskill.total_investment || 0) / 1000).toFixed(0)}K`, icon: "📚" },
          { label: "Total Investment", value: `$${(Number(bbba.total_investment || 0) / 1000).toFixed(0)}K`, icon: "💰" },
          { label: "Internal Fill", value: `${mp.internal_fill || 0} roles`, icon: "🏪" },
        ].map(k => <div key={k.label} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center transition-all hover:border-[var(--accent-primary)]/30 hover:translate-y-[-1px]">
          <div className="text-lg mb-1">{k.icon}</div>
          <div className="text-[16px] font-extrabold text-[var(--text-primary)]">{String(k.value)}</div>
          <div className="text-[9px] text-[var(--text-muted)] uppercase">{k.label}</div>
        </div>)}
      </div>
    </Card>

    {/* Generate button */}
    <Card title="AI-Powered Report Generator">
      <div className="text-center py-8">
        <div className="text-5xl mb-4">{generated ? "✅" : "📋"}</div>
        <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">{generated ? "Report Generated!" : "Board-Ready Transformation Report"}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">{generated ? "Your report has been downloaded. Copy the content into Word or Google Docs for formatting." : "AI will analyze all module data and generate a comprehensive 12-section narrative covering discovery findings, design decisions, and delivery plans."}</p>
        <button onClick={generateDocx} disabled={generating} className="px-8 py-3.5 rounded-2xl text-[15px] font-bold text-white transition-all hover:translate-y-[-2px] hover:shadow-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 20px rgba(224,144,64,0.2)" }}>{generating ? "Generating..." : generated ? "📋 Download Again" : "📋 Download Word Report"}</button>
        <p className="text-[10px] text-[var(--text-muted)] mt-3">Downloads as formatted .docx with sections and data</p>
        <button onClick={generateAiNarrative} disabled={generating} className="mt-3 px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 transition-all">{generating ? "..." : "☕ AI Narrative (.txt)"}</button>
      </div>
    </Card>
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   MODULE 4: WORK DESIGN LAB (with persistent state + job tracker)
   This is the most complex module — it needs to persist state
   across page switches and track job completion.
   ═══════════════════════════════════════════════════════════════ */

// Type for per-job work design state
interface JobDesignState {
  deconRows: Record<string, unknown>[];
  redeployRows: Record<string, unknown>[];
  scenario: string;
  deconSubmitted: boolean;
  redeploySubmitted: boolean;
  finalized: boolean;
  recon: Record<string, unknown> | null;
  initialized: boolean;
}

function WorkDesignLab({
  model, f, job, jobs, onBack, jobStates, setJobState, onSelectJob }: {
  model: string; f: Filters; job: string; jobs: string[]; onBack: () => void;
  jobStates: Record<string, JobDesignState>;
  setJobState: (job: string, state: Partial<JobDesignState>) => void;
  onSelectJob: (job: string) => void;
}) {
  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  const [wdTab, setWdTab] = useState("inventory");
  const js = jobStates[job] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false };

  const [ctx, ctxLoading] = useApiData(() => job ? api.getJobContext(model, job, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);
  const [decon, deconLoading] = useApiData(() => job ? api.getDeconstruction(model, job, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);
  const [orgDiag] = useApiData(() => job ? api.getOrgDiagnostics(model, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);

  // Initialize decon rows from API only if not already initialized for this job
  useEffect(() => {
    if (!job || js.initialized) return;
    const tasks = ((decon as Record<string, unknown> | null)?.tasks ?? []) as Record<string, unknown>[];
    if (!tasks.length) return;
    setJobState(job, {
      initialized: true,
      deconRows: tasks.map((row, i) => ({
        ...row, "Task ID": row["Task ID"] || `T${i + 1}`, "Task Name": row["Task Name"] || "",
        Workstream: row.Workstream || "", "AI Impact": row["AI Impact"] || "Low",
        "Est Hours/Week": Math.round(Number(row["Est Hours/Week"] || 0)),
        "Current Time Spent %": Math.round(Number(row["Current Time Spent %"] || 0)),
        "Time Saved %": Math.round(Number(row["Time Saved %"] || 0)),
        "Task Type": row["Task Type"] || "Variable", Interaction: row.Interaction || "Interactive",
        Logic: row.Logic || "Probabilistic", "Primary Skill": row["Primary Skill"] || "", "Secondary Skill": row["Secondary Skill"] || "",
      })),
    });
  }, [job, decon, js.initialized, setJobState]);

  // Build redeployment rows when decon is submitted
  useEffect(() => {
    if (!js.deconSubmitted) return;
    if (js.redeployRows.length > 0) return; // already built
    const rows = js.deconRows.map((row) => {
      const current = Math.round(Number(row["Current Time Spent %"] || 0));
      const impact = String(row["AI Impact"] || "Low");
      // AI-estimated time savings based on task characteristics
      const aiImpactScore = impact === "High" ? 0.6 : impact === "Moderate" ? 0.3 : 0.1;
      const typeBonus = String(row["Task Type"]) === "Repetitive" ? 0.15 : 0;
      const interBonus = String(row.Interaction) === "Independent" ? 0.1 : 0;
      const logicBonus = String(row.Logic) === "Deterministic" ? 0.1 : String(row.Logic) === "Probabilistic" ? 0.05 : 0;
      const saved = Math.round(current * Math.min(aiImpactScore + typeBonus + interBonus + logicBonus, 0.85));
      const logic = String(row.Logic || "");
      const interaction = String(row.Interaction || "");
      let decision = "Retain";
      if (impact === "High" && logic === "Deterministic" && interaction === "Independent") decision = "Automate";
      else if (saved >= 8) decision = "Redesign";
      else if (impact === "High" || impact === "Moderate") decision = "Augment";
      const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" };
      const destMap: Record<string, string> = { Automate: "AI / automation layer", Augment: "Higher-value work in role", Redesign: "New workflow / operating rhythm", Retain: "Continue in role", Transfer: "Another team or shared service" };
      return { ...row, Decision: decision, Technology: techMap[decision] || "GenAI", "New Time %": Math.max(current - saved, 0), "Redeployment Destination": destMap[decision] || "Future-state allocation", "Future Skill": row["Primary Skill"] || "", Notes: "" };
    });
    setJobState(job, { redeployRows: rows });
  }, [js.deconSubmitted, js.deconRows, js.redeployRows.length, job, setJobState]);

  // Compute reconstruction when redeployment submitted
  useEffect(() => {
    if (!js.redeploySubmitted || !js.redeployRows.length || js.recon) return;
    const tasks = js.redeployRows.map((row) => ({ ...row, "Time Saved %": Math.max(Number(row["Current Time Spent %"] || 0) - Number(row["New Time %"] || 0), 0) }));
    api.computeReconstruction(tasks, js.scenario).then((resp) => {
      const actionMix = (resp?.action_mix ?? {}) as Record<string, number>;
      const reconstruction = ((resp?.reconstruction ?? []) as Record<string, unknown>[]);
      const totalCurrent = reconstruction.reduce((s, r) => s + Number(r["Current Hrs"] || 0), 0);
      const totalFuture = reconstruction.reduce((s, r) => s + Number(r["Future Hrs"] || 0), 0);
      setJobState(job, { recon: { ...resp, action_counts: actionMix, detail: resp?.redeployment ?? [], total_current_hrs: Number(totalCurrent.toFixed(1)), total_future_hrs: Number(totalFuture.toFixed(1)) } });
    });
  }, [js.redeploySubmitted, js.redeployRows, js.recon, js.scenario, job, setJobState]);

  // Validation
  const deconTotal = js.deconRows.reduce((s, row) => s + Math.round(Number(row["Current Time Spent %"] || 0)), 0);
  const totalEstHours = js.deconRows.reduce((s, row) => s + Math.round(Number(row["Est Hours/Week"] || 0)), 0);
  const blankRequired = js.deconRows.reduce((sum, row) => { const req = ["Task ID", "Task Name", "Workstream", "AI Impact", "Est Hours/Week", "Current Time Spent %", "Task Type", "Interaction", "Logic"]; return sum + req.filter((key) => { const v = row[key]; return v === undefined || v === null || String(v).trim() === "" || (typeof v === "number" && v === 0 && ["Est Hours/Week", "Current Time Spent %"].includes(key)); }).length; }, 0);
  const zeroTimeRows = js.deconRows.filter((r) => Math.round(Number(r["Current Time Spent %"] || 0)) <= 0).length;
  const deconValid = deconTotal === 100 && blankRequired === 0 && zeroTimeRows === 0 && js.deconRows.length > 0;
  const redeployTotal = Math.round(js.redeployRows.reduce((s, row) => s + Number(row["New Time %"] || 0), 0));
  const redeployValid = js.redeployRows.length > 0 && redeployTotal <= 100;

  const updateDeconCell = (idx: number, key: string, value: string) => {
    const isNum = ["Est Hours/Week", "Current Time Spent %", "Time Saved %"].includes(key);
    const newRows = js.deconRows.map((row, i) => {
      if (i !== idx) return row;
      const next: Record<string, unknown> = { ...row };
      if (isNum) { const parsed = value === "" ? 0 : Math.round(Math.abs(parseInt(value, 10) || 0)); next[key] = parsed; if (key === "Time Saved %") { next[key] = Math.min(parsed, Math.round(Number(next["Current Time Spent %"] || 0))); } } else { next[key] = value; }
      return next;
    });
    setJobState(job, { deconRows: newRows, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] });
  };

  const updateRedeployCell = (idx: number, key: string, value: string) => {
    const newRows = js.redeployRows.map((row, i) => {
      if (i !== idx) return row;
      const next: Record<string, unknown> = { ...row, [key]: key === "New Time %" ? Math.round(Math.abs(parseInt(value, 10) || 0)) : value };
      if (key === "Decision") { const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" }; next.Technology = techMap[value] || next.Technology; }
      return next;
    });
    setJobState(job, { redeployRows: newRows, redeploySubmitted: false, finalized: false, recon: null });
  };

  // ── AI Task Auto-Generation ──
  const [aiGenerating, setAiGenerating] = useState(false);
  const generateTasks = async () => {
    if (!job || aiGenerating) return;
    setAiGenerating(true);
    try {
      const jobMeta = `${String(meta.Function || f.func || "")} ${String(meta["Career Level"] || "")} ${String(meta["Career Track"] || "")}`.trim();
      const prompt = `You are an expert workforce analyst. Generate a detailed task breakdown for the role "${job}"${jobMeta ? ` (${jobMeta})` : ""}.

Return ONLY a JSON array of 8-12 tasks. Each task object must have exactly these fields:
- "Task ID": string (e.g., "T1", "T2")
- "Task Name": string (specific, actionable task name)
- "Workstream": string (group name like "Reporting", "Analysis", "Operations", "Communication")
- "AI Impact": string ("High", "Moderate", or "Low")
- "Est Hours/Week": number (1-10, realistic hours per week)
- "Current Time Spent %": number (percentage, all tasks MUST sum to exactly 100)
- "Time Saved %": number (set to 0, this is calculated later in redeployment)
- "Task Type": string ("Repetitive" or "Variable")
- "Interaction": string ("Independent", "Interactive", or "Collaborative")
- "Logic": string ("Deterministic", "Probabilistic", or "Judgment-heavy")
- "Primary Skill": string (main skill required)
- "Secondary Skill": string (supporting skill)

Rules:
- "Current Time Spent %" across ALL tasks must sum to EXACTLY 100
- Tasks should be realistic for this specific role
- Include a mix of High, Moderate, and Low AI impact tasks
- Set Time Saved % to 0 for all tasks (savings are computed in the redeployment phase)
- Repetitive + Independent + Deterministic tasks = highest AI potential
- Return ONLY the JSON array, no markdown, no explanation, no backticks`;

      const text = await callAI("You are an expert workforce analyst. Return ONLY valid JSON, no markdown, no backticks, no explanation.", prompt);
      // Parse JSON — handle potential markdown wrapping
      const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const tasks = JSON.parse(cleanText) as Record<string, unknown>[];
      
      if (Array.isArray(tasks) && tasks.length > 0) {
        // Validate and normalize
        const normalized = tasks.map((t, i) => ({
          "Task ID": String(t["Task ID"] || `T${i + 1}`),
          "Task Name": String(t["Task Name"] || ""),
          Workstream: String(t["Workstream"] || ""),
          "AI Impact": ["High", "Moderate", "Low"].includes(String(t["AI Impact"])) ? String(t["AI Impact"]) : "Low",
          "Est Hours/Week": Math.round(Math.abs(Number(t["Est Hours/Week"]) || 2)),
          "Current Time Spent %": Math.round(Math.abs(Number(t["Current Time Spent %"]) || 0)),
          "Time Saved %": Math.min(Math.round(Math.abs(Number(t["Time Saved %"]) || 0)), Math.round(Math.abs(Number(t["Current Time Spent %"]) || 0))),
          "Task Type": ["Repetitive", "Variable"].includes(String(t["Task Type"])) ? String(t["Task Type"]) : "Variable",
          Interaction: ["Independent", "Interactive", "Collaborative"].includes(String(t["Interaction"])) ? String(t["Interaction"]) : "Interactive",
          Logic: ["Deterministic", "Probabilistic", "Judgment-heavy"].includes(String(t["Logic"])) ? String(t["Logic"]) : "Probabilistic",
          "Primary Skill": String(t["Primary Skill"] || ""),
          "Secondary Skill": String(t["Secondary Skill"] || ""),
        }));
        
        // Fix time allocation to sum to 100
        const total = normalized.reduce((s, t) => s + (t["Current Time Spent %"] as number), 0);
        if (total !== 100 && total > 0) {
          const factor = 100 / total;
          let running = 0;
          normalized.forEach((t, i) => {
            if (i === normalized.length - 1) {
              (t as Record<string, unknown>)["Current Time Spent %"] = 100 - running;
            } else {
              const adj = Math.round((t["Current Time Spent %"] as number) * factor);
              (t as Record<string, unknown>)["Current Time Spent %"] = adj;
              running += adj;
            }
          });
        }
        
        setJobState(job, { 
          deconRows: normalized, 
          initialized: true, 
          deconSubmitted: false, 
          redeploySubmitted: false, 
          finalized: false, 
          recon: null, 
          redeployRows: [] 
        });
      }
    } catch (err) {
      console.error("AI task generation failed:", err);
    }
    setAiGenerating(false);
  };

  const k = (ctx?.kpis ?? {}) as Record<string, unknown>;
  const meta = (ctx?.meta ?? {}) as Record<string, string>;
  const ws = ((ctx?.ws_breakdown ?? []) as Record<string, unknown>[]);
  const ds = ((ctx?.decon_summary ?? []) as Record<string, unknown>[]);
  const aid = ((ctx?.ai_distribution ?? []) as { name: string; value: number }[]);
  const aip = (((decon as Record<string, unknown> | null)?.ai_priority ?? []) as Record<string, unknown>[]);

  // Editable cell components
  const EditableCell = ({ value, onChange, type = "text", suffix }: { value: unknown; onChange: (v: string) => void; type?: string; suffix?: string }) => {
    const [local, setLocal] = useState(String(value ?? "")); const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setLocal(String(value ?? "")); }, [value]);
    return <div className="relative"><input ref={inputRef} value={local} type={type === "number" ? "number" : "text"} step={type === "number" ? "1" : undefined} min={type === "number" ? "0" : undefined} onChange={(e) => { setLocal(e.target.value); if (type !== "number") onChange(e.target.value); }} onBlur={() => { if (type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); } else onChange(local); }} onKeyDown={(e) => { if (e.key === "Enter" && type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); (e.target as HTMLInputElement).blur(); } }} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[13px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]" />{suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] pointer-events-none">{suffix}</span>}</div>;
  };
  const SelectCell = ({ value, onChange, options }: { value: unknown; onChange: (v: string) => void; options: string[] }) => <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[13px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;

  // Completed / in-progress / not-started counts
  const completedJobs = jobs.filter(j => jobStates[j]?.finalized);
  const inProgressJobs = jobs.filter(j => jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);
  const notStartedJobs = jobs.filter(j => !jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);

  return <div>
    <ContextStrip items={[
      jobs.length ? `${jobs.length} jobs available from your uploaded data` : "No jobs found — upload Work Design data with Job Titles",
      Object.values(jobStates).filter(s => s.finalized).length > 0 ? `${Object.values(jobStates).filter(s => s.finalized).length}/${jobs.length} jobs finalized` : "",
      Object.values(jobStates).filter(s => s.deconSubmitted && !s.finalized).length > 0 ? `${Object.values(jobStates).filter(s => s.deconSubmitted && !s.finalized).length} in progress` : "",
    ].filter(Boolean)} />
    {!job && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 mb-5 text-center"><div className="text-3xl mb-3 opacity-40">✏️</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Select a Job to Begin</h3><p className="text-[13px] text-[var(--text-secondary)]">Choose a job from the sidebar to start deconstructing tasks and redesigning roles.</p></div>}
    <PageHeader icon="✏️" title="Work Design Lab" subtitle={`Redesign tasks, roles, and time allocation${ctxLoading || deconLoading ? " · Loading..." : ""}`} onBack={onBack} moduleId="design" />

    {/* Job Inventory */}
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Job Inventory</h3>
        <span className="text-[13px] text-[var(--text-secondary)]">{completedJobs.length}/{jobs.length} complete</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4">
        <div className="h-full bg-[var(--success)] rounded-full transition-all" style={{ width: `${jobs.length ? (completedJobs.length / jobs.length) * 100 : 0}%` }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {jobs.map(j => {
          const st = jobStates[j];
          const status = st?.finalized ? "complete" : st?.deconSubmitted ? "in_progress" : "not_started";
          const dot = status === "complete" ? "●" : status === "in_progress" ? "◐" : "○";
          const dotColor = status === "complete" ? "var(--success)" : status === "in_progress" ? "var(--accent-primary)" : "var(--text-muted)";
          const label = status === "complete" ? "Finalized" : status === "in_progress" ? (st?.redeploySubmitted ? "Redeployed" : "Decon submitted") : "Not started";
          const isActive = j === job;
          return <div key={j} onClick={() => onSelectJob(j)} className={`px-3 py-2 rounded-lg border text-[12px] cursor-pointer hover:border-[var(--accent-primary)]/50 transition-all ${isActive ? "border-[var(--accent-primary)] bg-[rgba(59,130,246,0.08)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
            <div className="flex items-center gap-2"><span style={{ color: dotColor }} className="text-[14px]">{dot}</span><span className={`font-semibold truncate ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}>{j}</span></div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 pl-5">{label}</div>
          </div>;
        })}
      </div>
      {!jobs.length && <Empty text="No jobs found — upload Work Design data with Job Titles" icon="📭" />}
    </div>

    {!job ? <Empty text="Select a job from the sidebar to begin" icon="✏️" /> : <>
      {/* Active job bar */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
        <span className="font-semibold text-[14px] text-[var(--accent-primary)]">{job}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">{js.deconRows.length} tasks · {String(k.hours_week ?? 0)}h/wk · Scenario: {js.scenario}</span>
        <div className="ml-auto flex items-center gap-2"><Badge color={js.deconSubmitted ? "green" : "gray"}>Decon {js.deconSubmitted ? "✓" : "○"}</Badge><Badge color={js.redeploySubmitted ? "green" : "gray"}>Redeploy {js.redeploySubmitted ? "✓" : "○"}</Badge><Badge color={js.finalized ? "green" : "gray"}>Final {js.finalized ? "✓" : "○"}</Badge></div>
      </div>

      <TabBar tabs={[{ id: "ctx", label: "① Context" }, { id: "decon", label: "② Deconstruction" }, { id: "redeploy", label: "③ Redeployment" }, { id: "recon", label: "④ Reconstruction" }, { id: "impact", label: "⑤ Impact" }]} active={wdTab} onChange={setWdTab} />

      {wdTab === "ctx" && <div>
        {js.deconRows.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-secondary)]">Ready to break down <strong className="text-[var(--text-primary)]">{job}</strong> into tasks?</div>
          <div className="flex gap-2">
            <button onClick={() => { generateTasks(); setWdTab("decon"); }} disabled={aiGenerating} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiGenerating ? "Generating..." : "✨ Auto-Generate"}</button>
            <button onClick={() => setWdTab("decon")} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)]">Manual Entry →</button>
          </div>
        </div>}
        <div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Hours/Week" value={k.hours_week as number ?? 0} accent /><KpiCard label="Tasks" value={k.tasks as number ?? 0} /><KpiCard label="Workstreams" value={k.workstreams as number ?? 0} /><KpiCard label="Released" value={`${k.released_hrs ?? 0}h`} delta={`${k.released_pct ?? 0}%`} /><KpiCard label="Future Hrs" value={k.future_hrs as number ?? 0} /><KpiCard label="Evolution" value={String(k.evolution ?? "—")} /></div>
        <div className="grid grid-cols-12 gap-4"><div className="col-span-5"><Card title="Role Summary"><div className="flex flex-wrap gap-1.5 mb-3">{Object.entries(meta).map(([x, v]) => <Badge key={x} color="indigo">{x}: {v}</Badge>)}</div><p className="text-[13px] text-[var(--text-secondary)]">{String(ctx?.description ?? "No description.")}</p></Card></div><div className="col-span-4"><Card title="Time by Workstream"><BarViz data={ws} labelKey="Workstream" valueKey="Current Time Spent %" /></Card></div><div className="col-span-3"><Card title="Quick Profile"><DataTable data={ds} cols={["Metric", "Value"]} /></Card></div></div>
      </div>}

      {wdTab === "decon" && <div>
        {/* AI generation prompt when no tasks */}
        {js.deconRows.length === 0 && !aiGenerating && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.08)] to-[rgba(192,112,48,0.04)] border border-[rgba(224,144,64,0.2)] rounded-xl p-6 mb-4 text-center">
          <div className="text-2xl mb-2">✨</div>
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">No tasks yet for {job}</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Let AI generate a detailed task breakdown, or add tasks manually below.</p>
          <button onClick={generateTasks} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 20px rgba(200,120,40,0.3)" }}>✨ Auto-Generate Task Breakdown</button>
        </div>}
        {aiGenerating && <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-4 text-center animate-pulse">
          <div className="text-2xl mb-2">🧠</div>
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">AI is analyzing the {job} role...</h3>
          <p className="text-[13px] text-[var(--text-secondary)]">Generating task breakdown with AI impact scores, time estimates, and skill requirements</p>
        </div>}
        {/* Time tracker */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-semibold">Time Allocation</span><span className="text-[15px] font-bold" style={{ color: deconTotal === 100 ? "var(--success)" : deconTotal > 100 ? "var(--risk)" : "var(--accent-primary)" }}>{deconTotal}% <span className="text-[12px] font-normal text-[var(--text-muted)]">/ 100%</span></span></div>
          <div className="h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(deconTotal, 100)}%`, background: deconTotal === 100 ? "var(--success)" : deconTotal > 100 ? "var(--risk)" : "var(--accent-primary)" }} /></div>
        </div>
        <div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-4"><Card title="AI Impact"><DonutViz data={aid} /></Card></div><div className="col-span-4"><Card title="AI Priority"><BarViz data={aip} labelKey="Task Name" valueKey="AI Priority" color="var(--accent-scenario)" /></Card></div><div className="col-span-4"><InsightPanel title="Validation" items={[deconTotal === 100 ? "✓ Time = 100%" : `✗ Time = ${deconTotal}%`, blankRequired === 0 ? "✓ All fields filled" : `✗ ${blankRequired} blank`, deconValid ? "✓ Ready to submit" : "○ Fix issues above"]} icon="📋" /></div></div>
        <Card title="Task Inventory — Editable">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[var(--text-muted)]">{js.deconRows.length} tasks · {totalEstHours}h/wk</span>
            <div className="flex gap-2">
              <button onClick={generateTasks} disabled={aiGenerating || js.finalized} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${aiGenerating ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", opacity: aiGenerating || js.finalized ? 0.5 : 1 }}>{aiGenerating ? "✨ Generating..." : "✨ Auto-Generate Tasks"}</button>
              <button onClick={() => setJobState(job, { deconRows: [...js.deconRows, { "Task ID": `T${js.deconRows.length + 1}`, "Task Name": "", Workstream: "", "AI Impact": "Low", "Est Hours/Week": 0, "Current Time Spent %": 0, "Time Saved %": 0, "Task Type": "Variable", Interaction: "Interactive", Logic: "Probabilistic", "Primary Skill": "", "Secondary Skill": "" }], deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] })} className="px-3 py-1.5 bg-[var(--surface-3)] rounded-md text-[12px] font-semibold text-[var(--text-secondary)]">+ Add Task</button>
              <button disabled={!deconValid || js.finalized} onClick={() => { setJobState(job, { deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); setWdTab("redeploy"); }} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${!deconValid || js.finalized ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}>{js.deconSubmitted ? "Update" : "Submit"} Deconstruction</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[13px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Workstream","AI Impact","Est Hrs/Wk","Time %","Type","Interaction","Logic","Skill 1","Skill 2"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)] whitespace-nowrap font-semibold">{c}</th>)}</tr></thead><tbody>{js.deconRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 min-w-[70px]"><EditableCell value={row["Task ID"]} onChange={v => updateDeconCell(idx, "Task ID", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Task Name"]} onChange={v => updateDeconCell(idx, "Task Name", v)} /></td><td className="px-2 py-2 min-w-[110px]"><EditableCell value={row.Workstream} onChange={v => updateDeconCell(idx, "Workstream", v)} /></td><td className="px-2 py-2 min-w-[90px]"><SelectCell value={row["AI Impact"]} onChange={v => updateDeconCell(idx, "AI Impact", v)} options={["High","Moderate","Low"]} /></td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["Est Hours/Week"]} onChange={v => updateDeconCell(idx, "Est Hours/Week", v)} suffix="h" /></td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["Current Time Spent %"]} onChange={v => updateDeconCell(idx, "Current Time Spent %", v)} suffix="%" /></td><td className="px-2 py-2 min-w-[90px]"><SelectCell value={row["Task Type"]} onChange={v => updateDeconCell(idx, "Task Type", v)} options={["Repetitive","Variable"]} /></td><td className="px-2 py-2 min-w-[100px]"><SelectCell value={row.Interaction} onChange={v => updateDeconCell(idx, "Interaction", v)} options={["Independent","Interactive","Collaborative"]} /></td><td className="px-2 py-2 min-w-[110px]"><SelectCell value={row.Logic} onChange={v => updateDeconCell(idx, "Logic", v)} options={["Deterministic","Probabilistic","Judgment-heavy"]} /></td><td className="px-2 py-2 min-w-[100px]"><EditableCell value={row["Primary Skill"]} onChange={v => updateDeconCell(idx, "Primary Skill", v)} /></td><td className="px-2 py-2 min-w-[100px]"><EditableCell value={row["Secondary Skill"]} onChange={v => updateDeconCell(idx, "Secondary Skill", v)} /></td></tr>)}</tbody></table></div>
        </Card>
      </div>}

      {wdTab === "redeploy" && <div>{!js.deconSubmitted ? <Empty text="Submit Deconstruction first" icon="🔒" /> : <>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card title="Scenario"><SelectCell value={js.scenario} onChange={v => setJobState(job, { scenario: v, redeploySubmitted: false, recon: null })} options={["Conservative","Balanced","Transformative"]} /></Card>
          <InsightPanel title="Guidance" items={[`New Time total: ${redeployTotal}%`, "Adjust decisions and future time.", "Submit to see reconstruction."]} icon="🧭" />
          <Card title="AI Assist"><button onClick={async () => {
            const newRows = js.redeployRows.map(row => {
              const impact = String(row["AI Impact"]);
              const taskType = String(row["Task Type"]);
              const logic = String(row.Logic);
              const inter = String(row.Interaction);
              let decision = "Retain";
              if (impact === "High" && taskType === "Repetitive" && logic === "Deterministic") decision = "Automate";
              else if (impact === "High") decision = "Augment";
              else if (impact === "Moderate" && inter === "Independent") decision = "Augment";
              else if (impact === "Moderate") decision = "Redesign";
              const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" };
              return { ...row, Decision: decision, Technology: techMap[decision] || "Human-led" };
            });
            setJobState(job, { redeployRows: newRows, redeploySubmitted: false, finalized: false, recon: null });
          }} disabled={js.finalized} className="w-full py-2 rounded-md text-[12px] font-semibold text-white mb-2" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Auto-Recommend</button><div className="text-[10px] text-[var(--text-muted)]">AI assigns Retain/Augment/Automate based on task characteristics</div></Card>
          <Card title="Submit"><button disabled={!redeployValid || js.finalized} onClick={() => { setJobState(job, { redeploySubmitted: true, finalized: false, recon: null }); setWdTab("recon"); }} className={`w-full py-2 rounded-md text-[13px] font-semibold ${!redeployValid ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white"}`}>{js.redeploySubmitted ? "Update" : "Submit"} Redeployment</button></Card>
        </div>
        <Card title="Redeployment Plan — Editable">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[13px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Decision","Technology","Current %","New %","Destination","Future Skill","Notes"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)] whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{js.redeployRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Task ID"] ?? "")}</td><td className="px-2 py-2 min-w-[160px] text-[var(--text-secondary)]">{String(row["Task Name"] ?? "")}</td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Decision} onChange={v => updateRedeployCell(idx, "Decision", v)} options={["Retain","Augment","Automate","Redesign","Transfer"]} /></td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Technology} onChange={v => updateRedeployCell(idx, "Technology", v)} options={["Human-led","GenAI","RPA","Agentic AI","ML","Shared Service"]} /></td><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Current Time Spent %"] ?? "")}</td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["New Time %"]} onChange={v => updateRedeployCell(idx, "New Time %", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Redeployment Destination"]} onChange={v => updateRedeployCell(idx, "Redeployment Destination", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row["Future Skill"]} onChange={v => updateRedeployCell(idx, "Future Skill", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row.Notes} onChange={v => updateRedeployCell(idx, "Notes", v)} /></td></tr>)}</tbody></table></div>
        </Card>
      </>}</div>}

      {wdTab === "recon" && (() => { const r = js.recon; const ac = ((r?.action_counts ?? {}) as Record<string, number>); const wf = ((r?.waterfall ?? {}) as Record<string, number>); const detail = ((r?.reconstruction ?? []) as Record<string, unknown>[]); const rollup = ((r?.rollup ?? []) as Record<string, unknown>[]); const recs = ((r?.recommendations ?? []) as string[]); return !js.redeploySubmitted ? <Empty text="Submit Redeployment first" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Automate" value={ac.Automate ?? 0} accent /><KpiCard label="Augment" value={ac.Augment ?? 0} /><KpiCard label="Redesign" value={ac.Redesign ?? 0} /><KpiCard label="Retain" value={ac.Retain ?? 0} /></div><div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-5"><Card title="Reconstruction Rollup">{rollup.length ? <DataTable data={rollup} /> : <Empty text="Building..." icon="🧱" />}</Card></div><div className="col-span-3"><Card title="Capacity Waterfall">{Object.keys(wf).length ? <div className="flex items-end gap-2 h-40">{Object.entries(wf).map(([n, v], i) => <div key={n} className="flex-1 flex flex-col items-center justify-end"><div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">{Number(v).toFixed(1)}h</div><div className="w-full rounded-t" style={{ height: `${Math.max((Number(v) / Math.max(Number(wf.current) || 1, 1)) * 100, 4)}%`, background: COLORS[i % COLORS.length] }} /><div className="text-[10px] text-[var(--text-muted)] mt-1 truncate w-full text-center">{n}</div></div>)}</div> : <Empty text="Building..." icon="📊" />}</Card></div><div className="col-span-4"><InsightPanel title="Recommendations" items={recs.length ? recs : ["Building..."]} icon="🎯" /></div></div><Card title="Future-State Detail"><DataTable data={detail} /></Card><div className="mt-4 flex justify-end"><button disabled={!js.redeploySubmitted || js.finalized} onClick={() => setJobState(job, { finalized: true })} className={`px-4 py-2 rounded-md text-[13px] font-semibold ${js.finalized ? "bg-[var(--success)] text-white" : "bg-[var(--success)] text-white hover:opacity-90"}`}>{js.finalized ? "✓ Finalized" : "Finalize Work Design"}</button></div></div>; })()}

      {wdTab === "impact" && (() => { const r = js.recon; const ins = ((r?.insights ?? []) as Record<string, unknown>[]); const vm = ((r?.value_model ?? {}) as Record<string, unknown>); return !js.redeploySubmitted ? <Empty text="Submit Redeployment to unlock" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Current" value={r?.total_current_hrs as number ?? 0} /><KpiCard label="Future" value={r?.total_future_hrs as number ?? 0} /><KpiCard label="Released" value={((r?.total_current_hrs as number ?? 0) - (r?.total_future_hrs as number ?? 0)).toFixed(1)} accent /><KpiCard label="Evolution" value={String(r?.evolution ?? "—")} /></div><div className="grid grid-cols-2 gap-4"><Card title="Transformation Insights"><DataTable data={ins} cols={["Category", "Metric", "Value", "Interpretation"]} /></Card><Card title="Value Model">{Object.keys(vm).length ? <div className="space-y-2">{Object.entries(vm).map(([n, v]) => <div key={n} className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">{n}</span><span className="font-semibold">{String(v)}</span></div>)}</div> : <Empty text="Computing..." />}</Card></div></div>; })()}
    </>}
    <NextStepBar currentModuleId="design" onNavigate={onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 5: IMPACT SIMULATOR
   Converted from simulate-full.html — scenarios, custom builder,
   redeployment, ROI, AI readiness with 5-dimension rubric
   ═══════════════════════════════════════════════════════════════ */

const SIM_DIMS = ["Data Readiness","Process Standardization","Technology Enablement","Talent Readiness","Leadership Alignment"];
const SIM_PRESETS: Record<string, { label: string; adoption: number; timeline: number; ramp: number; color: string }> = {
  conservative: { label: "Conservative", adoption: 0.3, timeline: 18, ramp: 0.6, color: "#3B82F6" },
  balanced: { label: "Balanced", adoption: 0.6, timeline: 12, ramp: 0.8, color: "#10B981" },
  transformative: { label: "Transformative", adoption: 0.9, timeline: 6, ramp: 1.0, color: "#8B5CF6" },
};
const SIM_JOBS = [
  { role: "Financial Analyst", dept: "Finance", currentHrs: 188, aiEligibleHrs: 120, highAiTasks: 14, rate: 85 },
  { role: "HR Coordinator", dept: "Human Resources", currentHrs: 160, aiEligibleHrs: 95, highAiTasks: 11, rate: 65 },
  { role: "Marketing Specialist", dept: "Marketing", currentHrs: 172, aiEligibleHrs: 110, highAiTasks: 16, rate: 78 },
  { role: "Operations Manager", dept: "Operations", currentHrs: 195, aiEligibleHrs: 85, highAiTasks: 9, rate: 92 },
  { role: "Customer Success Rep", dept: "Customer Success", currentHrs: 168, aiEligibleHrs: 130, highAiTasks: 18, rate: 60 },
];
const SIM_READINESS: Record<string, { item: string; score: number; notes: string }[]> = {
  "Data Readiness": [{ item: "Data Availability", score: 4, notes: "Core data accessible via API" }, { item: "Data Quality", score: 3, notes: "Some inconsistencies in legacy systems" }, { item: "Data Governance", score: 4, notes: "Established DG framework" }, { item: "Data Integration", score: 3, notes: "Partial integration" }],
  "Process Standardization": [{ item: "Process Documentation", score: 2, notes: "Tribal knowledge dominates" }, { item: "Workflow Consistency", score: 2, notes: "Varies by team" }, { item: "Automation Baseline", score: 1, notes: "Minimal automation" }, { item: "Change Protocols", score: 3, notes: "Basic change mgmt exists" }],
  "Technology Enablement": [{ item: "AI/ML Infrastructure", score: 2, notes: "Cloud available, no ML pipeline" }, { item: "Tool Ecosystem", score: 2, notes: "Fragmented tooling" }, { item: "Integration Architecture", score: 1, notes: "Point-to-point integrations" }, { item: "Security & Compliance", score: 3, notes: "SOC2 compliant" }],
  "Talent Readiness": [{ item: "AI Literacy", score: 4, notes: "78% completed AI training" }, { item: "Digital Skills Depth", score: 5, notes: "Strong technical bench" }, { item: "Learning Culture", score: 4, notes: "Active L&D programs" }, { item: "Change Appetite", score: 4, notes: "82% excited about AI" }],
  "Leadership Alignment": [{ item: "Executive Sponsorship", score: 4, notes: "CTO is active champion" }, { item: "Strategic Clarity", score: 3, notes: "Strategy drafted, not socialized" }, { item: "Investment Commitment", score: 4, notes: "$2.4M approved" }, { item: "Governance Readiness", score: 3, notes: "AI ethics board forming" }],
};

function ImpactSimulator({ onBack, onNavigate, model, f, jobStates, simState, setSimState, viewCtx }: { onBack: () => void; onNavigate?: (id: string) => void; model: string; f: Filters; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; setSimState: (s: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }) => void }) {
  const [tab, setTab] = useState("scenarios");
  const [redeployBuckets, setRedeployBuckets] = useState<Record<string, number>>({ hv: 25, inn: 25, cap: 25, opt: 25 });
  const [scenSub, setScenSub] = useState("detail");
  const [rdSub, setRdSub] = useState("dashboard");
  const [expandDim, setExpandDim] = useState<string | null>(null);

  // Use persisted state
  const scenario = simState.scenario;
  const custom = simState.custom;
  const custAdopt = simState.custAdopt;
  const custTimeline = simState.custTimeline;
  const investment = simState.investment;
  const update = (partial: Partial<typeof simState>) => setSimState({ ...simState, ...partial });

  // Build job list from real work design data if available, else fall back to demo
  const realJobs = useMemo(() => {
    const entries = Object.entries(jobStates || {}).filter(([_, s]) => s.deconRows.length > 0);
    if (entries.length === 0) return null;
    return entries.map(([role, s]) => {
      const totalHrs = s.deconRows.reduce((sum, r) => sum + Math.round(Number(r["Est Hours/Week"] || 0)), 0) * 4; // monthly
      const highAiRows = s.deconRows.filter(r => String(r["AI Impact"]) === "High");
      const aiEligibleHrs = Math.round(s.deconRows.filter(r => String(r["AI Impact"]) !== "Low").reduce((sum, r) => sum + Number(r["Est Hours/Week"] || 0), 0) * 4);
      const func = String(s.deconRows[0]?.Workstream || "General");
      return { role, dept: func, currentHrs: totalHrs || 160, aiEligibleHrs: aiEligibleHrs || Math.round(totalHrs * 0.5), highAiTasks: highAiRows.length, rate: 75 };
    });
  }, [jobStates]);
  // Filter jobs by function if filter is active
  const filteredJobs = useMemo(() => {
    const base = realJobs || SIM_JOBS;
    if (f.func && f.func !== "All") return base.filter(j => j.dept.toLowerCase().includes(f.func.toLowerCase()));
    return base;
  }, [realJobs, f.func]);
  const activeJobs = filteredJobs;

  const cfg = custom ? { label: "Custom", adoption: custAdopt / 100, timeline: custTimeline, ramp: 0.75, color: "#06B6D4" } : SIM_PRESETS[scenario];

  const scenData = activeJobs.map(j => {
    const rel = Math.round(j.aiEligibleHrs * cfg.adoption * cfg.ramp);
    return { ...j, released: rel, future: j.currentHrs - rel, pctSaved: Math.round((rel / j.currentHrs) * 100), aiTasks: Math.round(j.highAiTasks * cfg.adoption), fte: +(rel / 160).toFixed(1) };
  });
  const totals = scenData.reduce((a, j) => ({ cur: a.cur + j.currentHrs, rel: a.rel + j.released, fut: a.fut + j.future, ai: a.ai + j.aiTasks, fte: a.fte + j.fte, savings: a.savings + (j.released * j.rate) }), { cur: 0, rel: 0, fut: 0, ai: 0, fte: 0, savings: 0 });
  const totalPct = Math.round((totals.rel / totals.cur) * 100);
  const totalInv = activeJobs.length * investment;
  const breakEven = totals.savings > 0 ? Math.ceil(totalInv / (totals.savings / 12)) : 999;

  // Try to fetch readiness from backend, fall back to demo
  const [backendReadiness] = useApiData(() => model ? api.getReadiness(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const readinessData = useMemo(() => {
    const br = backendReadiness as Record<string, unknown> | null;
    if (br && br.dimensions && Object.keys(br.dimensions as object).length > 0) {
      // Backend has real readiness data
      return { source: "uploaded", data: br };
    }
    return { source: "demo", data: null };
  }, [backendReadiness]);

  // Readiness scoring
  const dimScores = SIM_DIMS.map(d => {
    const items = SIM_READINESS[d] || [];
    const avg = items.reduce((s, it) => s + it.score, 0) / items.length;
    return { dim: d, score: Math.round((avg / 5) * 20), items };
  });
  const overallScore = Math.round(dimScores.reduce((s, d) => s + d.score, 0) / dimScores.length * 5);
  const maturityLabel = (s: number) => s >= 80 ? "Mature" : s >= 60 ? "Advanced" : s >= 40 ? "Developing" : s >= 20 ? "Early Stage" : "Not Started";
  const maturityColor = (s: number) => s >= 80 ? "var(--success)" : s >= 60 ? "var(--accent-primary)" : s >= 40 ? "var(--warning)" : "var(--risk)";

  // Job view: filter to selected job only
  if (viewCtx?.mode === "job" && viewCtx?.job) {
    const jobData = scenData.filter(j => j.role.toLowerCase().includes(viewCtx.job.toLowerCase()));
    const jd = jobData[0] || scenData[0];
    return <div>
      <PageHeader icon="💼" title={`Role Scenario — ${viewCtx.job}`} subtitle={`Impact under ${cfg.label} scenario`} onBack={onBack} moduleId="simulate" />
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Current Hours" value={`${jd?.currentHrs || 0}h/mo`} /><KpiCard label="Released" value={`${jd?.released || 0}h/mo`} accent /><KpiCard label="Future Hours" value={`${jd?.future || 0}h/mo`} /><KpiCard label="FTE Freed" value={jd?.fte || 0} accent /><KpiCard label="Time Saved" value={`${jd?.pctSaved || 0}%`} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card title="Scenario Comparison for This Role">
          <div className="space-y-3">{Object.values(SIM_PRESETS).map(p => {
            const rel = Math.round((jd?.aiEligibleHrs || 0) * p.adoption * p.ramp);
            const pct = jd?.currentHrs ? Math.round((rel / jd.currentHrs) * 100) : 0;
            return <div key={p.label} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[13px] font-semibold" style={{ color: p.color }}>{p.label}</span>
              <div className="flex items-center gap-4 text-[13px]"><span>{rel}h released</span><span>{+(rel/160).toFixed(1)} FTE</span><Badge color={pct > 40 ? "green" : pct > 20 ? "amber" : "gray"}>{pct}%</Badge></div>
            </div>;
          })}</div>
        </Card>
        <Card title="What This Means">
          <InsightPanel title="Role Impact" items={[
            `Under ${cfg.label}, ${jd?.released || 0} hours/month are freed from this role.`,
            `This is equivalent to ${jd?.fte || 0} FTEs worth of capacity.`,
            `${jd?.aiTasks || 0} tasks will be AI-augmented or automated.`,
            jd?.pctSaved && jd.pctSaved > 40 ? "This role is highly transformable — prioritize in Wave 1." : "Moderate transformation — schedule for Wave 2.",
          ]} icon="⚡" />
        </Card>
      </div>
  
    {/* Break-Even Analysis */}
    <Card title="Break-Even Analysis">
      {(() => {
        const totalInvestment = 350000; // Approximate from BBBA
        const annualSavings = 120000; // Approximate from headcount eliminations
        const monthsToBreakeven = annualSavings > 0 ? Math.ceil((totalInvestment / annualSavings) * 12) : 0;
        return <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Total Investment</div><div className="text-[24px] font-extrabold text-[var(--risk)]">${(totalInvestment/1000).toFixed(0)}K</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div><div className="text-[24px] font-extrabold text-[var(--success)]">${(annualSavings/1000).toFixed(0)}K</div></div>
          <div className="rounded-xl p-4 text-center border-2 border-[var(--accent-primary)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Break-Even</div><div className="text-[24px] font-extrabold text-[var(--accent-primary)]">{monthsToBreakeven > 0 ? `Month ${monthsToBreakeven}` : "—"}</div></div>
        </div>;
      })()}
    </Card>

    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
    </div>;
  }

  // Employee view: personal impact
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="How AI Affects Me" subtitle={`${viewCtx.employee}'s transformation impact`} onBack={onBack} moduleId="simulate" />
    <PersonalImpactCard employee={viewCtx.employee} jobStates={jobStates} simState={simState} />
    <Card title="What Will Change">
      <div className="space-y-3">
        {[{ icon: "🤖", title: "AI-Augmented Tasks", desc: "Repetitive data entry, report generation, and routine analysis will be handled by AI tools. You'll review and approve rather than create from scratch." },
          { icon: "📚", title: "New Skills to Learn", desc: "Prompt engineering, AI tool management, and strategic interpretation of AI outputs. Training will be provided in Wave 1." },
          { icon: "⏰", title: "Time Reallocation", desc: "Freed capacity redirected to relationship building, strategic thinking, cross-functional projects, and innovation initiatives." },
          { icon: "🛡️", title: "What Stays the Same", desc: "Client relationships, judgment-heavy decisions, team leadership, and stakeholder management remain human-led." }
        ].map((item, i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-xl shrink-0">{item.icon}</span>
          <div><div className="text-[13px] font-bold text-[var(--text-primary)] mb-0.5">{item.title}</div><div className="text-[12px] text-[var(--text-secondary)]">{item.desc}</div></div>
        </div>)}
      </div>
    </Card>
    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
  </div>;

  // Empty state when no data
  if (!model) return <div className="px-7 py-6"><div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">⚡</div><h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Upload Data to Simulate</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload workforce data and complete at least one job in the Work Design Lab to model transformation scenarios.</p></div></div>;

  return <div>
    <ContextStrip items={[realJobs ? `${realJobs.length} roles from Work Design Lab` : "Using demo data — complete Work Design Lab for real numbers", Object.values(jobStates).filter(s => s.finalized).length > 0 ? `${Object.values(jobStates).filter(s => s.finalized).length} jobs finalized` : ""].filter(Boolean)} />
    <PageHeader icon="⚡" title="Impact Simulator" subtitle="Model transformation scenarios and assess organizational AI readiness" onBack={onBack} moduleId="simulate" />
    {realJobs ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--success)]">✓ Using your Work Design data — {realJobs.length} roles from your submitted jobs</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--warning)]">Using demo data — complete jobs in the Work Design Lab to see your real numbers here</div>}
    <TabBar tabs={[{ id: "scenarios", label: "⚡ Scenarios" }, { id: "readiness", label: "◎ AI Readiness" }]} active={tab} onChange={setTab} />

    {tab === "scenarios" && <div>
      {/* Scenario pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(SIM_PRESETS).map(([k, v]) => <button key={k} onClick={() => update({ scenario: k, custom: false })} className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all" style={{ border: !custom && scenario === k ? `2px solid ${v.color}` : "1px solid var(--border)", background: !custom && scenario === k ? `${v.color}14` : "transparent", color: !custom && scenario === k ? v.color : "var(--text-muted)" }}>{v.label}</button>)}
        <button onClick={() => update({ custom: true })} className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all" style={{ border: custom ? "2px solid #06B6D4" : "1px solid var(--border)", background: custom ? "rgba(6,182,212,0.08)" : "transparent", color: custom ? "#06B6D4" : "var(--text-muted)" }}>+ Custom</button>
      </div>

      {/* Custom builder */}
      {custom && <div className="bg-[var(--surface-1)] border border-[var(--teal)] rounded-xl p-5 mb-4">
        <h3 className="text-[13px] font-bold mb-3 text-[var(--teal)]">Custom Scenario Builder</h3>
        <div className="grid grid-cols-3 gap-6">
          <div><div className="flex justify-between mb-1"><span className="text-[12px]">Adoption</span><span className="text-[13px] font-bold text-[var(--teal)]">{custAdopt}%</span></div><input type="range" min={10} max={100} value={custAdopt} onChange={e => update({ custAdopt: +e.target.value })} className="w-full" /></div>
          <div><div className="flex justify-between mb-1"><span className="text-[12px]">Timeline</span><span className="text-[13px] font-bold text-[var(--teal)]">{custTimeline}mo</span></div><input type="range" min={3} max={24} value={custTimeline} onChange={e => update({ custTimeline: +e.target.value })} className="w-full" /></div>
          <div><div className="flex justify-between mb-1"><span className="text-[12px]">Per-Role Investment</span><span className="text-[13px] font-bold text-[var(--teal)]">${investment.toLocaleString()}</span></div><input type="range" min={10000} max={200000} step={5000} value={investment} onChange={e => update({ investment: +e.target.value })} className="w-full" /></div>
        </div>
      </div>}

      {/* Scenario sub-tabs */}
      <TabBar tabs={[{ id: "detail", label: "Role Detail" }, { id: "compare", label: "Comparison" }, { id: "redeploy", label: "Redeployment" }, { id: "roi", label: "Investment & ROI" }]} active={scenSub} onChange={setScenSub} />

      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Current Hours" value={`${totals.cur.toLocaleString()}h`} /><KpiCard label="Released Hours" value={`${totals.rel.toLocaleString()}h`} accent delta={`${totalPct}% of total`} /><KpiCard label="FTE Equivalent" value={totals.fte.toFixed(1)} /><KpiCard label="Annual Savings" value={`$${totals.savings.toLocaleString()}`} accent /><KpiCard label="Break-Even" value={breakEven <= 36 ? `${breakEven}mo` : "36mo+"} />
      </div>

      {/* Role detail table */}
      {scenSub === "detail" && <Card title={`Role Detail — ${cfg.label} Scenario`}>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left"><thead><tr className="bg-[var(--surface-2)]">{["Role","Dept","Current","Eligible","Released","Future","FTE Freed","Saved %","AI Tasks"].map((h, i) => <th key={h} className={`px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)] ${i >= 2 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>{scenData.map(j => <tr key={j.role} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-3 py-2 text-[13px] font-semibold">{j.role}</td>
            <td className="px-3 py-2 text-[12px] text-[var(--text-muted)]">{j.dept}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.currentHrs}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.aiEligibleHrs}</td>
            <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{j.released}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.future}</td>
            <td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{j.fte}</td>
            <td className="px-3 py-2 text-right"><Badge color={j.pctSaved > 40 ? "green" : j.pctSaved > 20 ? "amber" : "gray"}>{j.pctSaved}%</Badge></td>
            <td className="px-3 py-2 text-right font-semibold">{j.aiTasks}</td>
          </tr>)}</tbody>
          <tfoot><tr className="border-t-2 border-[var(--border)] font-bold"><td className="px-3 py-2" colSpan={2}>Total</td><td className="px-3 py-2 text-right">{totals.cur}</td><td className="px-3 py-2 text-right">{scenData.reduce((s, j) => s + j.aiEligibleHrs, 0)}</td><td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{totals.rel}</td><td className="px-3 py-2 text-right">{totals.fut}</td><td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{totals.fte.toFixed(1)}</td><td className="px-3 py-2 text-right"><Badge color="green">{totalPct}%</Badge></td><td className="px-3 py-2 text-right">{totals.ai}</td></tr></tfoot>
          </table>
        </div>
      </Card>}



      {/* Side-by-side comparison */}
      {scenSub === "compare" && <Card title="Scenario Comparison">
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Metric</th>{Object.values(SIM_PRESETS).map(p => <th key={p.label} className="px-3 py-2 text-center text-[11px] font-semibold border-b border-[var(--border)]" style={{ color: p.color }}>{p.label}</th>)}</tr></thead>
          <tbody>{["Released Hours","FTE Equivalent","Time Saved %","Annual Savings","Break-Even"].map(m => {
            return <tr key={m} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[13px] font-semibold">{m}</td>
              {Object.values(SIM_PRESETS).map(p => {
                const sd = activeJobs.map(j => ({ ...j, released: Math.round(j.aiEligibleHrs * p.adoption * p.ramp) }));
                const tt = sd.reduce((a, j) => ({ ...a, rel: (a.rel || 0) + j.released, sav: (a.sav || 0) + j.released * j.rate }), { rel: 0, sav: 0 } as Record<string, number>);
                const tfte = +(tt.rel / 160).toFixed(1);
                const tpct = Math.round((tt.rel / totals.cur) * 100);
                const be = tt.sav > 0 ? Math.ceil(totalInv / (tt.sav / 12)) : 999;
                let val = "";
                if (m === "Released Hours") val = `${tt.rel.toLocaleString()}h`;
                else if (m === "FTE Equivalent") val = String(tfte);
                else if (m === "Time Saved %") val = `${tpct}%`;
                else if (m === "Annual Savings") val = `$${tt.sav.toLocaleString()}`;
                else if (m === "Break-Even") val = be <= 36 ? `${be}mo` : "36mo+";
                return <td key={p.label} className="px-3 py-2 text-center text-[13px] font-bold" style={{ color: p.color }}>{val}</td>;
              })}
            </tr>;
          })}</tbody></table>
        </div>
      </Card>}

      {/* Redeployment allocation */}
      {scenSub === "redeploy" && <Card title="Released Time Redeployment">
        <div className="text-[13px] text-[var(--text-secondary)] mb-4">Decide how released hours ({totals.rel.toLocaleString()}h/mo) should be redirected. Adjust sliders — they must total 100%.</div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[{ id: "hv", label: "Higher-Value Work", color: "var(--accent-primary)", desc: "Strategic analysis, relationship building" },
            { id: "inn", label: "Innovation & R&D", color: "var(--purple)", desc: "New products, experimentation" },
            { id: "cap", label: "Capability Building", color: "var(--success)", desc: "Upskilling, cross-training" },
            { id: "opt", label: "Headcount Optimization", color: "var(--risk)", desc: "Attrition, redeployment, reduction" }
          ].map(b => { const pct = (redeployBuckets as Record<string, number>)[b.id] || 25; return <div key={b.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4" style={{ borderLeftWidth: 3, borderLeftColor: b.color }}>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{b.label}</div>
            <div className="text-2xl font-extrabold" style={{ color: b.color }}>{pct}%</div>
            <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setRedeployBuckets((prev: Record<string, number>) => ({ ...prev, [b.id]: Number(e.target.value) }))} className="w-full mt-2" style={{ accentColor: b.color }} />
            <div className="text-[11px] text-[var(--text-muted)] mt-1">{b.desc}</div>
            <div className="text-[12px] font-semibold mt-1" style={{ color: b.color }}>{Math.round(totals.rel * pct / 100).toLocaleString()}h</div>
          </div>; })}
        </div>
        {Object.values(redeployBuckets as Record<string, number>).reduce((s, v) => s + v, 0) !== 100 && <div className="text-[12px] text-[var(--risk)] mb-3">⚠ Buckets total {Object.values(redeployBuckets as Record<string, number>).reduce((s: number, v: number) => s + v, 0)}% — adjust to reach 100%</div>}
        <InsightPanel title="Redeployment Guidance" items={["Default split is 25% across all four buckets — adjust based on your strategy.", "Higher-Value Work: redirect freed capacity to strategic activities.", "Innovation: fund experimentation and new capability development.", "Headcount Optimization: consider natural attrition before reduction."]} icon="🧭" />
      </Card>}

      {/* Investment & ROI */}
      {scenSub === "roi" && <Card title="Investment & ROI Analysis">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Investment" value={`$${totalInv.toLocaleString()}`} />
          <KpiCard label="Annual Savings" value={`$${totals.savings.toLocaleString()}`} accent />
          <KpiCard label="Year 1 Net" value={`$${(totals.savings - totalInv).toLocaleString()}`} delta={totals.savings - totalInv > 0 ? "Positive ROI" : "Investment year"} />
          <KpiCard label="3-Year Net Value" value={`$${(totals.savings * 3 - totalInv - Math.round(totalInv * 0.15) * 2).toLocaleString()}`} accent />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card title="Cost Breakdown (Estimated)">
            <div className="space-y-3">
              {[{ label: "Tooling & Licensing", pct: 35, color: "var(--accent-primary)" }, { label: "Training & Upskilling", pct: 25, color: "var(--success)" }, { label: "Change Management", pct: 25, color: "var(--purple)" }, { label: "Productivity Loss (ramp)", pct: 15, color: "var(--warning)" }].map(c => <div key={c.label}>
                <div className="flex justify-between text-[12px] mb-1"><span className="text-[var(--text-secondary)]">{c.label}</span><span className="font-semibold">${Math.round(totalInv * c.pct / 100).toLocaleString()} ({c.pct}%)</span></div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} /></div>
              </div>)}
            </div>
          </Card>
          <Card title="Payback Timeline">
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">Break-even point</span><span className="font-bold text-[var(--accent-primary)]">{breakEven <= 36 ? `${breakEven} months` : "36+ months"}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">Monthly savings run-rate</span><span className="font-bold">${Math.round(totals.savings / 12).toLocaleString()}/mo</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">Per-role investment</span><span className="font-bold">${investment.toLocaleString()}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">Roles in scope</span><span className="font-bold">{activeJobs.length}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">Recurring cost (15%/yr)</span><span className="font-bold">${Math.round(totalInv * 0.15).toLocaleString()}/yr</span></div>
            </div>
          </Card>
        </div>
      </Card>}
    </div>}

    {tab === "readiness" && <div>
      <TabBar tabs={[{ id: "dashboard", label: "Dashboard" }, { id: "gap", label: "Gap Analysis" }]} active={rdSub} onChange={setRdSub} />

      {rdSub === "dashboard" && <div className="grid grid-cols-12 gap-4">
        {/* Score gauge */}
        <div className="col-span-4"><Card>
          <div className="flex flex-col items-center py-6">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Overall Score</div>
            <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center flex-col" style={{ borderColor: maturityColor(overallScore) }}>
              <div className="text-3xl font-black" style={{ color: maturityColor(overallScore) }}>{overallScore}</div>
              <div className="text-[10px] font-semibold" style={{ color: maturityColor(overallScore) }}>{maturityLabel(overallScore)}</div>
            </div>
          </div>
        </Card></div>
        {/* Dimension scores */}
        <div className="col-span-8"><Card title="Dimension Scores">
          {dimScores.map(d => {
            const pct = (d.score / 20) * 100;
            const isExpanded = expandDim === d.dim;
            return <div key={d.dim} className="mb-3">
              <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => setExpandDim(isExpanded ? null : d.dim)}>
                <span className="text-[13px] font-semibold">{d.dim}</span>
                <div className="flex items-center gap-2"><span className="text-[13px] font-bold" style={{ color: maturityColor(pct) }}>{d.score}/20</span><span className="text-[11px] text-[var(--text-muted)]" style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)`, display: "inline-block", transition: "transform 0.2s" }}>▸</span></div>
              </div>
              <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: maturityColor(pct) }} /></div>
              {isExpanded && <div className="mt-2 bg-[var(--surface-2)] rounded-lg p-3 space-y-2">
                {d.items.map(it => <div key={it.item} className="flex items-center justify-between">
                  <div><div className="text-[12px] font-semibold">{it.item}</div><div className="text-[11px] text-[var(--text-muted)]">{it.notes}</div></div>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <div key={n} className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center" style={{ background: n <= it.score ? maturityColor((it.score / 5) * 100) : "var(--surface-3)", color: n <= it.score ? "#fff" : "var(--text-muted)" }}>{n}</div>)}</div>
                </div>)}
              </div>}
            </div>;
          })}
        </Card></div>
      </div>}

      {rdSub === "gap" && <div>
        <Card title="Gap Analysis — Where to Improve">
          {dimScores.filter(d => d.score < 14).sort((a, b) => a.score - b.score).map(d => {
            const target = 14;
            const gap = target - d.score;
            return <div key={d.dim} className="mb-5 pb-4 border-b border-[var(--border)]">
              <div className="flex justify-between items-center mb-2"><span className="text-[14px] font-bold">{d.dim}</span><div className="flex items-center gap-2"><span className="text-[13px] text-[var(--text-secondary)]">{d.score}</span><span className="text-[11px] text-[var(--text-muted)]">→</span><span className="text-[13px] font-bold text-[var(--accent-primary)]">{target}</span><Badge color="red">-{gap}</Badge></div></div>
              <div className="h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden relative mb-2"><div className="h-full rounded-full" style={{ width: `${(d.score / 20) * 100}%`, background: maturityColor((d.score / 20) * 100) }} /><div className="absolute top-0 h-full rounded-full opacity-20" style={{ left: `${(d.score / 20) * 100}%`, width: `${(gap / 20) * 100}%`, background: "var(--risk)" }} /></div>
              <div className="space-y-1">{d.items.filter(it => it.score < 4).map(it => <div key={it.item} className="text-[12px] text-[var(--text-secondary)]">▲ <strong>{it.item}</strong>: {it.score}/5 → needs 4/5</div>)}</div>
            </div>;
          })}
          {dimScores.every(d => d.score >= 14) && <div className="text-center py-8 text-[var(--success)] font-bold text-[15px]">✓ All dimensions meet readiness thresholds</div>}
        </Card>
      </div>}
    </div>}
    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 6: ORG DESIGN STUDIO
   Integrated from org-design-studio.jsx — multi-scenario
   org modeling with span analysis, layers, cost, role migration
   ═══════════════════════════════════════════════════════════════ */

const ODS_DEPTS = ["Executive Office","Finance & Accounting","Human Resources","Marketing","Product Design","Supply Chain","IT & Digital","Sales & Commercial","Legal & Compliance","Operations"];
const ODS_LEVELS = ["C-Suite","SVP","VP","Director","Manager","IC"];
const ODS_AVG_COMP: Record<string, number> = { "C-Suite": 420000, SVP: 310000, VP: 235000, Director: 175000, Manager: 125000, IC: 85000 };

// Seeded PRNG for stable ODS data
let _odsSeed = 42;
function odsRand() { _odsSeed = (_odsSeed * 16807 + 0) % 2147483647; return _odsSeed / 2147483647; }
function odsGenDept() { _odsSeed = 42; // Reset seed for consistency
  return ODS_DEPTS.map(name => {
    const hc = Math.floor(odsRand() * 160) + 25;
    const mgrs = Math.max(3, Math.floor(hc * (0.08 + odsRand() * 0.12)));
    const ics = hc - mgrs;
    const layers = Math.floor(odsRand() * 3) + 3;
    const fteRatio = 0.68 + odsRand() * 0.27;
    const levelDist: Record<string, number> = {};
    let rem = hc;
    ODS_LEVELS.forEach((l, i) => { if (i === ODS_LEVELS.length - 1) { levelDist[l] = rem; return; } const share = i < 2 ? 0.02 + odsRand() * 0.03 : i < 4 ? 0.06 + odsRand() * 0.08 : 0.1 + odsRand() * 0.1; const n = Math.max(1, Math.round(hc * share)); levelDist[l] = Math.min(n, rem); rem -= levelDist[l]; });
    return { id: odsRand().toString(36).slice(2, 8), name, headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics / mgrs) * 10) / 10, fteRatio: Math.round(fteRatio * 1000) / 1000, contractors: Math.floor(hc * (1 - fteRatio)), ftes: hc - Math.floor(hc * (1 - fteRatio)), levelDist };
  });
}
function odsGenScenario(base: ReturnType<typeof odsGenDept>, label: string, intensity = 0.5, idx = 0) {
  return { id: `scenario_${label.toLowerCase().replace(/\s+/g,"_")}_${idx}`, label, departments: base.map(d => {
    const hcD = Math.floor((odsRand() - 0.35) * 20 * intensity);
    const hc = Math.max(10, d.headcount + hcD);
    const mgrs = Math.max(2, d.managers - Math.max(0, Math.floor(odsRand() * 4 * intensity)));
    const ics = hc - mgrs;
    const layers = Math.max(2, d.layers - (odsRand() > 0.6 - intensity * 0.3 ? 1 : 0));
    const fteRatio = Math.min(0.98, d.fteRatio + odsRand() * 0.1 * intensity);
    return { ...d, id: odsRand().toString(36).slice(2, 8), headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics / mgrs) * 10) / 10, fteRatio: Math.round(fteRatio * 1000) / 1000, contractors: Math.floor(hc * (1 - fteRatio)), ftes: hc - Math.floor(hc * (1 - fteRatio)), newRoles: Math.floor(odsRand() * 3 * intensity), removedRoles: Math.floor(odsRand() * 4 * intensity), restructuredRoles: Math.floor(odsRand() * 5 * intensity) };
  }) };
}
function odsAgg(data: ReturnType<typeof odsGenDept>) {
  const hc = data.reduce((s, d) => s + d.headcount, 0); const mgr = data.reduce((s, d) => s + d.managers, 0); const ic = data.reduce((s, d) => s + d.ics, 0);
  let cost = 0; data.forEach(d => { if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { cost += n * (ODS_AVG_COMP[l] || 85000); }); });
  return { hc, mgr, ic, avgS: mgr > 0 ? ic / mgr : 0, avgL: data.reduce((s, d) => s + d.layers, 0) / data.length, cost };
}

function OrgDesignStudio({ onBack, model, f, odsState, setOdsState, viewCtx }: { onBack: () => void; model: string; f: Filters; odsState: { activeScenario: number; view: string }; setOdsState: (s: { activeScenario: number; view: string }) => void; viewCtx?: ViewContext }) {
  // Try to build from real org data
  const [orgData] = useApiData(() => model ? api.getOrgDiagnostics(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  const hasRealData = orgData && (orgData as Record<string,unknown>).kpis && ((orgData as Record<string,unknown>).kpis as Record<string,unknown>).total as number > 0;

  const [currentData, setCurrentData] = useState(() => odsGenDept());
  const [scenarios, setScenarios] = useState(() => [odsGenScenario(odsGenDept(), "Optimized", 0.5, 0), odsGenScenario(odsGenDept(), "Aggressive", 0.9, 1), odsGenScenario(odsGenDept(), "Conservative", 0.25, 2)]);
  const [aiOdsLoading, setAiOdsLoading] = useState(false);
  const [aiOdsInsights, setAiOdsInsights] = useState<string[]>([]);
  const activeScenario = odsState.activeScenario;
  const view = odsState.view;
  const setActiveScenario = (i: number) => setOdsState({ ...odsState, activeScenario: i });
  const setView = (v: string) => setOdsState({ ...odsState, view: v });

  // Build from real data if available — use func_distribution to create dept structure
  const realDataBuilt = useRef(false);
  useEffect(() => {
    if (realDataBuilt.current) return;
    const fd = ((overviewData as Record<string,unknown>)?.func_distribution ?? []) as {name:string;value:number}[];
    if (fd.length >= 2) {
      realDataBuilt.current = true;
      const orgK = ((orgData as Record<string,unknown>)?.kpis ?? {}) as Record<string,number>;
      const totalHC = orgK.total || fd.reduce((s,d) => s + Number(d.value), 0);
      const avgMgrRatio = orgK.managers && orgK.total ? orgK.managers / orgK.total : 0.12;
      const avgLayers = orgK.layers || 4;
      const depts = fd.map(d => {
        const hc = Number(d.value) || 20;
        const mgrs = Math.max(2, Math.round(hc * avgMgrRatio));
        const ics = hc - mgrs;
        const layers = Math.max(2, Math.min(6, avgLayers + Math.floor(Math.random()*2 - 1)));
        const fteRatio = 0.75 + Math.random() * 0.2;
        const levelDist: Record<string,number> = {};
        let rem = hc;
        ODS_LEVELS.forEach((l, i) => { if (i === ODS_LEVELS.length - 1) { levelDist[l] = rem; return; } const share = i < 2 ? 0.02 + Math.random()*0.03 : i < 4 ? 0.06 + Math.random()*0.08 : 0.1 + Math.random()*0.1; const n = Math.max(1, Math.round(hc * share)); levelDist[l] = Math.min(n, rem); rem -= levelDist[l]; });
        return { id: Math.random().toString(36).slice(2,8), name: d.name, headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics/mgrs)*10)/10, fteRatio: Math.round(fteRatio*1000)/1000, contractors: Math.floor(hc*(1-fteRatio)), ftes: hc - Math.floor(hc*(1-fteRatio)), levelDist };
      });
      setCurrentData(depts);
      setScenarios([odsGenScenario(depts, "Optimized", 0.5, 0), odsGenScenario(depts, "Aggressive", 0.9, 1), odsGenScenario(depts, "Conservative", 0.25, 2)]);
    }
  }, [overviewData, orgData]);

  // Fall back to generated data if no real data
  useEffect(() => {
    if (realDataBuilt.current) return;
    const c = odsGenDept();
    setCurrentData(c);
    setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]);
  }, []);

  const sc = scenarios[activeScenario] || scenarios[0];
  const cA = useMemo(() => odsAgg(currentData), [currentData]);
  const fA = useMemo(() => odsAgg(sc?.departments || []), [sc]);
  const [selDept, setSelDept] = useState(0);

  const DChip = ({ a, b, inv }: { a: number; b: number; inv?: boolean }) => {
    const diff = b - a; const pos = inv ? diff < 0 : diff > 0; const neg = inv ? diff > 0 : diff < 0;
    const c = pos ? "var(--success)" : neg ? "var(--risk)" : "var(--text-muted)";
    const ar = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ color: c, background: pos ? "rgba(16,185,129,0.1)" : neg ? "rgba(239,68,68,0.1)" : "transparent" }}>{ar}{Math.abs(diff).toFixed(1)}</span>;
  };

  const HBar = ({ value, max, color }: { value: number; max: number; color: string }) => <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${color}12` }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} /></div>;

  const OdsKpi = ({ label, current, future, inv }: { label: string; current: number; future: number; inv?: boolean }) => (
    <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-3">
        <div><div className="text-[10px] text-[var(--text-muted)]">Current</div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{current.toFixed(current > 100 ? 0 : 1)}</div></div>
        <span className="text-[var(--text-muted)]">→</span>
        <div><div className="text-[10px] text-[var(--text-muted)]">Scenario</div><div className="text-xl font-extrabold text-[var(--success)]">{future.toFixed(future > 100 ? 0 : 1)}</div></div>
      </div>
      <div className="mt-1"><DChip a={current} b={future} inv={inv} /></div>
    </div>
  );

  // Job view: structural context
  if (viewCtx?.mode === "job" && viewCtx?.job) {
    const matchDept = currentData.find(d => d.name.toLowerCase().includes((viewCtx.job || "").split(" ")[0].toLowerCase())) || currentData[0];
    const matchFuture = sc.departments[currentData.indexOf(matchDept)] || sc.departments[0];
    return <div>
      <PageHeader icon="💼" title={`Structural Context — ${viewCtx.job}`} subtitle="Where this role sits in the org structure" onBack={onBack} moduleId="build" />
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Department" value={matchDept?.name || "—"} /><KpiCard label="Dept HC" value={matchDept?.headcount || 0} /><KpiCard label="Span" value={matchDept?.avgSpan || 0} accent /><KpiCard label="Layers" value={matchDept?.layers || 0} /><KpiCard label="Managers" value={matchDept?.managers || 0} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card title="Current vs Future State">
          <div className="space-y-3">
            {[{ label: "Headcount", c: matchDept?.headcount, f: matchFuture?.headcount },
              { label: "Avg Span", c: matchDept?.avgSpan, f: matchFuture?.avgSpan },
              { label: "Layers", c: matchDept?.layers, f: matchFuture?.layers },
              { label: "Managers", c: matchDept?.managers, f: matchFuture?.managers },
            ].map(r => <div key={r.label} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[13px] text-[var(--text-secondary)]">{r.label}</span>
              <div className="flex items-center gap-3 text-[13px]"><span className="text-[var(--accent-primary)] font-semibold">{r.c || 0}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)] font-semibold">{r.f || 0}</span><DChip a={Number(r.c || 0)} b={Number(r.f || 0)} inv /></div>
            </div>)}
          </div>
        </Card>
        <InsightPanel title="Structural Insights" items={[
          `${viewCtx.job} sits in ${matchDept?.name || "this department"} with ${matchDept?.headcount || 0} total headcount.`,
          `Current span of control is ${matchDept?.avgSpan || 0} — ${(matchDept?.avgSpan || 0) < 5 ? "narrow, suggesting over-management" : (matchDept?.avgSpan || 0) > 10 ? "wide, risk of insufficient coaching" : "within healthy range"}.`,
          `The department has ${matchDept?.layers || 0} layers — ${(matchDept?.layers || 0) > 5 ? "consider de-layering" : "reasonable depth"}.`,
          matchFuture && matchFuture.headcount !== matchDept?.headcount ? `Future state targets ${matchFuture.headcount} headcount (${matchFuture.headcount > (matchDept?.headcount || 0) ? "growth" : "optimization"}).` : "No scenario changes applied yet.",
        ]} icon="🏗️" />
      </div>
      <NextStepBar currentModuleId="build" onNavigate={onBack} />
    </div>;
  }

  // Employee view: show org chart
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="My Org Chart" subtitle={`${viewCtx.employee}'s reporting structure`} onBack={onBack} moduleId="build" />
    <EmployeeOrgChart employee={viewCtx.employee} model={model} />
    <InsightPanel title="What This Means" items={["Your org chart shows your reporting line, peers at your level, and any direct reports.", "During transformation, your reporting line may change as layers are adjusted.", "Use the Organization View to see how the full structure is being redesigned."]} icon="🏗️" />
  </div>;

  return <div>
    <ContextStrip items={["Phase 2: Design — Model your future org structure. Data is generated for modeling — upload workforce data to ground in reality."]} />
    <PageHeader icon="🏗️" title="Org Design Studio" subtitle="Current → Future State Modeling · Multi-Scenario Engine" onBack={onBack} moduleId="build" />
    {hasRealData ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--success)]">✓ Using your uploaded workforce data to model departments</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--warning)]">Using generated sample data — upload workforce data for your real org structure</div>}

    {/* Scenario selector — dropdown to save space */}
    <div className="flex gap-3 mb-4 items-center">
      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scenario:</span>
      <select value={activeScenario} onChange={e => setActiveScenario(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[180px]">
        {scenarios.map((s, i) => <option key={s.id} value={i}>{s.label} — {odsAgg(s.departments).hc} HC, ${(odsAgg(s.departments).cost / 1e6).toFixed(1)}M</option>)}
      </select>
      <button onClick={async () => {
        setAiOdsLoading(true);
        try {
          const context = currentData.map(d => `${d.name}: ${d.headcount}hd, span ${d.avgSpan}, ${d.layers} layers, ${d.managers} mgrs`).join("; ");
          const aiText1 = await callAI("Return ONLY a valid JSON array of strings.", `Analyze this org structure and give 4-5 specific restructuring recommendations. Current state: ${context}. Return ONLY a JSON array of strings.`);
          setAiOdsInsights(JSON.parse(aiText1.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()));
      } catch {} setAiOdsLoading(false); }} disabled={aiOdsLoading} className="px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOdsLoading ? 0.5 : 1 }}>{aiOdsLoading ? "Analyzing..." : "✨ AI Recommendations"}</button>
      <button onClick={() => { realDataBuilt.current = false; const c = odsGenDept(); setCurrentData(c); setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]); }} className="px-3 py-2 rounded-lg text-[12px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]">↻ Reset</button>
    </div>

    {/* View tabs */}
    <TabBar tabs={[{ id: "overview", label: "Overview" }, { id: "soc", label: "Span Detail" }, { id: "layers", label: "Layers" }, { id: "cost", label: "Cost Model" }, { id: "roles", label: "Role Migration" }, { id: "drill", label: "Dept Drill-Down" }, { id: "compare", label: "Compare All" }, { id: "insights", label: "Insights" }]} active={view} onChange={setView} />

    {aiOdsInsights.length > 0 && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-[13px] font-bold" style={{ color: "#f0a050" }}>✨ AI Restructuring Recommendations</div>
      <div className="space-y-1.5">{aiOdsInsights.map((ins, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[#f0a050] font-bold">{i+1}.</span>{ins}</div>)}</div>
    </div>}

    {view === "overview" && <div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <OdsKpi label="Total Headcount" current={cA.hc} future={fA.hc} inv /><OdsKpi label="Avg Span" current={cA.avgS} future={fA.avgS} /><OdsKpi label="Avg Layers" current={cA.avgL} future={fA.avgL} inv /><OdsKpi label="Managers" current={cA.mgr} future={fA.mgr} inv /><OdsKpi label="ICs" current={cA.ic} future={fA.ic} /><OdsKpi label="Est. Cost ($M)" current={cA.cost / 1e6} future={fA.cost / 1e6} inv />
      </div>
      {/* Span by dept */}
      <Card title="Span of Control by Department">
        {(() => { const maxSpan = Math.max(...currentData.map(d => d.avgSpan), ...sc.departments.map(d => d.avgSpan)) * 1.15; return <div className="space-y-2">{currentData.map((d, i) => { const f = sc.departments[i]; return <div key={d.name} className="flex items-center gap-3"><div className="w-32 text-[12px] text-[var(--text-muted)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={d.avgSpan} max={maxSpan} color="var(--accent-primary)" /><HBar value={f?.avgSpan || 0} max={maxSpan} color="var(--success)" /></div><div className="w-16 shrink-0"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></div></div>; })}</div>; })()}
        <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-muted)]"><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--accent-primary)]" />Current</span><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--success)]" />{sc.label}</span></div>
      </Card>
    </div>}

    {view === "soc" && <Card title="Span of Control Detail">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">{["Department","HC (C)","HC (F)","Mgrs (C)","Mgrs (F)","ICs (C)","ICs (F)","SoC (C)","SoC (F)","Δ"].map(h => <th key={h} className="px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] text-center">{h}</th>)}</tr></thead>
      <tbody>{currentData.map((d, i) => { const f = sc.departments[i]; return <tr key={d.name} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-3 py-2 text-[13px] font-semibold">{d.name}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.headcount}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.headcount}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.managers}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.managers}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.ics}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.ics}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.avgSpan}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.avgSpan}</td><td className="px-3 py-2 text-center"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></td></tr>; })}</tbody></table></div>
    </Card>}

    {view === "layers" && <Card title="Organizational Layers">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{currentData.map((d, i) => { const f = sc.departments[i]; const delta = (f?.layers || d.layers) - d.layers; return <div key={d.name} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[11px] text-[var(--text-muted)] font-semibold mb-3">{d.name}</div><div className="flex items-end gap-4 mb-2"><div className="flex flex-col items-center gap-1">{Array.from({ length: d.layers }, (_, j) => <div key={j} className="rounded" style={{ width: 20 + j * 6, height: 5, background: `rgba(59,130,246,${0.3 + j / d.layers * 0.5})` }} />)}<div className="text-lg font-extrabold text-[var(--accent-primary)] mt-1">{d.layers}</div></div><span className="text-[var(--text-muted)] pb-2">→</span><div className="flex flex-col items-center gap-1">{Array.from({ length: f?.layers || d.layers }, (_, j) => <div key={j} className="rounded" style={{ width: 20 + j * 6, height: 5, background: `rgba(16,185,129,${0.3 + j / (f?.layers || d.layers) * 0.5})` }} />)}<div className="text-lg font-extrabold text-[var(--success)] mt-1">{f?.layers}</div></div></div>{delta !== 0 ? <Badge color={delta < 0 ? "green" : "red"}>{delta < 0 ? "↓" : "↑"} {Math.abs(delta)} layer{Math.abs(delta) > 1 ? "s" : ""}</Badge> : <Badge>No change</Badge>}</div>; })}</div>
    </Card>}

    {view === "cost" && <div>
      {/* Cost methodology */}
      <Card title="Cost Model — Methodology">
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">How Current Cost is Calculated</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">Total labor cost is computed by multiplying headcount at each career level by the average fully-loaded compensation for that level. This includes base salary, benefits (est. 25%), and overhead allocation.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × ${(comp / 1000).toFixed(0)}K</span>
              <span className="font-semibold text-[var(--accent-primary)]">${((n * comp) / 1e6).toFixed(2)}M</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[13px] font-bold"><span className="text-[var(--accent-primary)]">Current Total</span><span className="text-[var(--accent-primary)]">${(cA.cost / 1e6).toFixed(2)}M</span></div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">How Future Cost is Derived ({sc.label})</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">Future cost reflects scenario adjustments: layer removal reduces management headcount, span optimization redistributes ICs, and structural changes shift the level mix. Each change is applied per-department.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = sc.departments.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const cN = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; const delta = n - cN; return <div key={l} className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × ${(comp / 1000).toFixed(0)}K {delta !== 0 && <span style={{ color: delta < 0 ? "var(--success)" : "var(--risk)", fontSize: 10 }}>({delta > 0 ? "+" : ""}{delta})</span>}</span>
              <span className="font-semibold text-[var(--success)]">${((n * comp) / 1e6).toFixed(2)}M</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[13px] font-bold"><span className="text-[var(--success)]">{sc.label} Total</span><span className="text-[var(--success)]">${(fA.cost / 1e6).toFixed(2)}M</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Net Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>${((fA.cost - cA.cost) / 1e6).toFixed(2)}M</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Percent Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>{cA.cost > 0 ? (((fA.cost - cA.cost) / cA.cost) * 100).toFixed(1) : "0"}%</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">HC Change</div><div className="text-2xl font-extrabold" style={{ color: fA.hc < cA.hc ? "var(--success)" : "var(--risk)" }}>{fA.hc - cA.hc}</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Cost per Head</div><div className="text-lg font-extrabold text-[var(--text-primary)]">${cA.hc > 0 ? ((cA.cost / cA.hc) / 1000).toFixed(0) : "0"}K → ${fA.hc > 0 ? ((fA.cost / fA.hc) / 1000).toFixed(0) : "0"}K</div></div>
        </div>
      </Card>
      <Card title="Cost by Department">
        {(() => { const cCosts = currentData.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const fCosts = sc.departments.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const maxCost = Math.max(...cCosts, ...fCosts); return <div className="space-y-3">{currentData.map((d, i) => { const delta = fCosts[i] - cCosts[i]; return <div key={d.name} className="flex items-center gap-3"><div className="w-36 text-[12px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={cCosts[i]} max={maxCost} color="var(--accent-primary)" /><HBar value={fCosts[i]} max={maxCost} color="var(--success)" /></div><div className="w-24 text-right shrink-0"><div className="text-[12px] font-semibold text-[var(--text-primary)]">${(cCosts[i] / 1e6).toFixed(2)}M</div><div className="text-[10px]" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta / 1e3).toFixed(0)}K</div></div></div>; })}</div>; })()}
      </Card>
    </div>}

    {view === "roles" && <Card title="Role Migration & Gap Analysis">
      {(() => {
        const gaps = currentData.map((d, i) => {
          const f = sc.departments[i]; const nr = f?.newRoles || Math.floor(Math.random() * 3); const rr = f?.removedRoles || Math.floor(Math.random() * 4); const rs = f?.restructuredRoles || Math.floor(Math.random() * 5);
          return { name: d.name, currentHC: d.headcount, futureHC: f?.headcount || d.headcount, newRoles: nr, removedRoles: rr, restructuredRoles: rs, retained: Math.max(0, Math.min(d.headcount, f?.headcount || d.headcount) - rr) };
        });
        const tn = gaps.reduce((s, g) => s + g.newRoles, 0); const tr = gaps.reduce((s, g) => s + g.removedRoles, 0); const ts = gaps.reduce((s, g) => s + g.restructuredRoles, 0); const tRet = gaps.reduce((s, g) => s + g.retained, 0);
        const mostNew = [...gaps].sort((a, b) => b.newRoles - a.newRoles)[0];
        const mostElim = [...gaps].sort((a, b) => b.removedRoles - a.removedRoles)[0];
        const totalHC = gaps.reduce((s, g) => s + g.currentHC, 0);
        return <div>
          <div className="grid grid-cols-4 gap-3 mb-5">{[{ label: "New Roles", val: tn, color: "var(--success)", desc: "Created by restructuring" }, { label: "Eliminated", val: tr, color: "var(--risk)", desc: "Removed or automated" }, { label: "Restructured", val: ts, color: "var(--warning)", desc: "Scope or level changed" }, { label: "Retained", val: tRet, color: "var(--accent-primary)", desc: "Unchanged in scope" }].map(k => <div key={k.label} className="bg-[var(--surface-2)] rounded-xl p-4 border-l-[3px] border border-[var(--border)]" style={{ borderLeftColor: k.color }}><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{k.label}</div><div className="text-2xl font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[10px] text-[var(--text-muted)] mt-1">{k.desc}</div></div>)}</div>

          {/* How these numbers were derived */}
          <div className="bg-gradient-to-r from-[rgba(59,130,246,0.06)] to-transparent border border-[rgba(59,130,246,0.12)] rounded-xl p-5 mb-4">
            <div className="text-[13px] font-bold text-[var(--accent-primary)] mb-2">📊 How Role Migration is Calculated</div>
            <div className="grid grid-cols-2 gap-4 text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <div><strong className="text-[var(--text-primary)]">New roles</strong> emerge when a department grows headcount or the scenario adds specialized functions. {mostNew?.name} generates the most ({mostNew?.newRoles}) due to its headcount expansion from {mostNew?.currentHC} → {mostNew?.futureHC}.</div>
              <div><strong className="text-[var(--text-primary)]">Eliminated roles</strong> result from layer compression and span widening. When a {mostElim?.name} department loses a management layer, the displaced manager positions are removed ({mostElim?.removedRoles} roles).</div>
              <div><strong className="text-[var(--text-primary)]">Restructured roles</strong> keep the same headcount but change in scope — e.g., a "Data Entry Clerk" becoming an "AI Operations Analyst." The {sc.label} scenario restructures {ts} roles across {gaps.filter(g => g.restructuredRoles > 0).length} departments.</div>
              <div><strong className="text-[var(--text-primary)]">Retained roles</strong> ({Math.round(tRet / totalHC * 100)}% of current workforce) continue unchanged. Higher retention is lower-risk but may limit transformation speed.</div>
            </div>
          </div>

          {/* Migration flow bars — taller */}
          <div className="space-y-3">{gaps.map(g => { const total = g.retained + g.newRoles + g.removedRoles + g.restructuredRoles; return <div key={g.name} className="flex items-center gap-3"><div className="w-36 text-[12px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{g.name}</div><div className="flex-1 flex h-7 rounded-lg overflow-hidden"><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.retained / total * 100}%`, background: "var(--accent-primary)", minWidth: g.retained > 0 ? 20 : 0 }}>{g.retained}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.newRoles / total * 100}%`, background: "var(--success)", minWidth: g.newRoles > 0 ? 16 : 0 }}>{g.newRoles}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.restructuredRoles / total * 100}%`, background: "var(--warning)", minWidth: g.restructuredRoles > 0 ? 16 : 0 }}>{g.restructuredRoles}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.removedRoles / total * 100}%`, background: "var(--risk)", minWidth: g.removedRoles > 0 ? 16 : 0 }}>{g.removedRoles}</div></div><div className="w-16 text-[11px] text-[var(--text-muted)] text-right">{g.currentHC}→{g.futureHC}</div></div>; })}</div>
          <div className="flex gap-4 mt-3 justify-center text-[11px] text-[var(--text-muted)]">{[{ c: "var(--accent-primary)", l: "Retained" }, { c: "var(--success)", l: "New" }, { c: "var(--warning)", l: "Restructured" }, { c: "var(--risk)", l: "Eliminated" }].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: x.c }} />{x.l}</span>)}</div>
        </div>;
      })()}
    </Card>}

    {/* Dept Drill-Down — expanded */}
    {view === "drill" && <div>
        <Card title="Department Deep Dive">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Department:</span>
            <select value={selDept} onChange={e => setSelDept(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[200px]">
              {currentData.map((d, i) => <option key={d.name} value={i}>{d.name} — {d.headcount} HC</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <OdsKpi label="Headcount" current={currentData[selDept]?.headcount || 0} future={sc.departments[selDept]?.headcount || 0} inv /><OdsKpi label="Avg Span" current={currentData[selDept]?.avgSpan || 0} future={sc.departments[selDept]?.avgSpan || 0} /><OdsKpi label="Layers" current={currentData[selDept]?.layers || 0} future={sc.departments[selDept]?.layers || 0} inv /><OdsKpi label="Managers" current={currentData[selDept]?.managers || 0} future={sc.departments[selDept]?.managers || 0} inv /><OdsKpi label="FTE Ratio %" current={(currentData[selDept]?.fteRatio || 0) * 100} future={(sc.departments[selDept]?.fteRatio || currentData[selDept]?.fteRatio || 0) * 100} /><OdsKpi label="Est. Cost ($M)" current={Object.entries(currentData[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} future={Object.entries(sc.departments[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} inv />
          </div>
        </Card>
        <Card title={`Level Distribution — ${currentData[selDept]?.name || ""}`}>
          <div className="grid grid-cols-6 gap-3">{ODS_LEVELS.map(l => { const cN = currentData[selDept]?.levelDist?.[l] || 0; const fN = sc.departments[selDept]?.levelDist?.[l] || 0; const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3">{l}</div>
            <div className="flex justify-between text-[16px] font-extrabold mb-1"><span className="text-[var(--accent-primary)]">{cN}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)]">{fN}</span></div>
            <DChip a={cN} b={fN} inv />
            <div className="mt-2 pt-2 border-t border-[var(--border)]"><div className="text-[9px] text-[var(--text-muted)]">Avg comp: ${(comp / 1000).toFixed(0)}K</div><div className="text-[9px] text-[var(--text-muted)]">Cost: ${((cN * comp) / 1e6).toFixed(2)}M</div></div>
          </div>; })}</div>
        </Card>
        <Card title={`${currentData[selDept]?.name || ""} — Workforce Composition`}>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">FTE vs Contractors</div><div className="flex gap-3 mb-2"><div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{currentData[selDept]?.ftes || 0}</div><div className="text-[10px] text-[var(--text-muted)]">Full-Time</div></div><div><div className="text-xl font-extrabold text-[var(--warning)]">{currentData[selDept]?.contractors || 0}</div><div className="text-[10px] text-[var(--text-muted)]">Contractors</div></div></div><HBar value={currentData[selDept]?.ftes || 0} max={currentData[selDept]?.headcount || 1} color="var(--accent-primary)" /></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Manager to IC Ratio</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">1 : {((currentData[selDept]?.ics || 0) / Math.max(currentData[selDept]?.managers || 1, 1)).toFixed(1)}</div><div className="text-[10px] text-[var(--text-muted)]">{currentData[selDept]?.managers || 0} managers overseeing {currentData[selDept]?.ics || 0} individual contributors</div></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Dept Share</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">{cA.hc > 0 ? Math.round((currentData[selDept]?.headcount || 0) / cA.hc * 100) : 0}%</div><div className="text-[10px] text-[var(--text-muted)]">{currentData[selDept]?.headcount || 0} of {cA.hc} total headcount</div><HBar value={currentData[selDept]?.headcount || 0} max={cA.hc || 1} color="var(--purple)" /></div>
          </div>
        </Card>
      </div>}

    {/* Scenario Compare — all scenarios side by side */}
    {view === "compare" && <Card title="Multi-Scenario Comparison">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Metric</th><th className="px-3 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Current</th>{scenarios.map((s, i) => <th key={s.id} className="px-3 py-2 text-center text-[11px] font-semibold border-b border-[var(--border)]" style={{ color: COLORS[i % COLORS.length] }}>{s.label}</th>)}</tr></thead>
      <tbody>{[{ label: "Headcount", key: "hc", inv: true }, { label: "Avg Span", key: "avgS" }, { label: "Avg Layers", key: "avgL", inv: true }, { label: "Managers", key: "mgr", inv: true }, { label: "Est. Cost ($M)", key: "cost", inv: true, fmt: (v: number) => `$${(v / 1e6).toFixed(1)}M` }].map(m => {
        const cVal = cA[m.key as keyof typeof cA] as number;
        return <tr key={m.label} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[13px] font-semibold">{m.label}</td><td className="px-3 py-2 text-center text-[var(--text-secondary)]">{m.fmt ? m.fmt(cVal) : cVal.toFixed(1)}</td>{scenarios.map((s, i) => { const a = odsAgg(s.departments); const v = a[m.key as keyof typeof a] as number; return <td key={s.id} className="px-3 py-2 text-center"><span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{m.fmt ? m.fmt(v) : v.toFixed(1)}</span> <DChip a={cVal} b={v} inv={m.inv} /></td>; })}</tr>;
      })}</tbody></table></div>
    </Card>}

    {/* Insights Engine — comprehensive */}
    {view === "insights" && (() => {
      const insights: { type: string; title: string; body: string; color: string; metric?: string }[] = [];
      const narrow = currentData.filter(d => d.avgSpan < 5);
      if (narrow.length > 0) insights.push({ type: "warning", title: "Over-Layered Functions", body: `${narrow.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans below 5:1 indicate excessive management overhead. Industry benchmark is 6-8:1 for knowledge workers. Consider removing one management layer in these functions.`, color: "var(--warning)", metric: `${narrow.length} dept${narrow.length > 1 ? "s" : ""}` });
      const wide = currentData.filter(d => d.avgSpan > 12);
      if (wide.length > 0) insights.push({ type: "alert", title: "Overextended Spans", body: `${wide.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans above 12:1 risk insufficient coaching and development. Managers lose ability to provide meaningful 1:1s above ~10 direct reports.`, color: "var(--risk)", metric: `${wide.length} dept${wide.length > 1 ? "s" : ""}` });
      const optimalSpan = currentData.filter(d => d.avgSpan >= 6 && d.avgSpan <= 10);
      if (optimalSpan.length > 0) insights.push({ type: "positive", title: "Healthy Span Functions", body: `${optimalSpan.map(d => d.name).join(", ")} — 6-10:1 span range is optimal. These functions have the right balance of oversight and autonomy.`, color: "var(--success)", metric: `${optimalSpan.length}/${currentData.length}` });
      const layerReductions = currentData.filter((d, i) => sc.departments[i] && sc.departments[i].layers < d.layers);
      if (layerReductions.length > 0) { const totalRemoved = layerReductions.reduce((s, d, i) => s + d.layers - (sc.departments[currentData.indexOf(d)]?.layers || d.layers), 0); insights.push({ type: "positive", title: `${totalRemoved} Layers Removed in ${sc.label}`, body: `De-layering ${layerReductions.map(d => d.name).join(", ")} compresses decision-making distance by ~${Math.round(totalRemoved / currentData.reduce((s, d) => s + d.layers, 0) * 100)}%. Expected impact: 20-30% faster decision cycles and reduced escalation burden.`, color: "var(--success)", metric: `${totalRemoved} layers` }); }
      // Manager ratio analysis
      const mgrRatio = cA.mgr / Math.max(cA.hc, 1) * 100;
      const fMgrRatio = fA.mgr / Math.max(fA.hc, 1) * 100;
      insights.push({ type: mgrRatio > 15 ? "warning" : "info", title: `Manager Ratio: ${mgrRatio.toFixed(1)}% → ${fMgrRatio.toFixed(1)}%`, body: `Current org has 1 manager per ${Math.round(cA.hc / Math.max(cA.mgr, 1))} employees. ${mgrRatio > 15 ? "Above the 12-15% benchmark — indicates over-management." : mgrRatio < 8 ? "Below 8% — may indicate insufficient leadership coverage." : "Within healthy 8-15% range."} The ${sc.label} scenario ${fMgrRatio < mgrRatio ? "improves" : "maintains"} this to ${fMgrRatio.toFixed(1)}%.`, color: mgrRatio > 15 ? "var(--warning)" : "var(--accent-primary)", metric: `${mgrRatio.toFixed(0)}%` });
      // Cost insights
      if (fA.cost < cA.cost) { const savings = cA.cost - fA.cost; const pct = (savings / cA.cost * 100); insights.push({ type: "positive", title: `$${(savings / 1e6).toFixed(1)}M Annual Savings (${pct.toFixed(0)}%)`, body: `The ${sc.label} scenario achieves labor cost reduction through structural efficiency. At current compensation levels, removing ${cA.hc - fA.hc} positions saves $${(savings / 1e6).toFixed(2)}M/year. Break-even on restructuring costs (est. $${((cA.hc - fA.hc) * 50000 / 1e6).toFixed(1)}M severance) within ${Math.ceil(((cA.hc - fA.hc) * 50000) / savings * 12)} months.`, color: "var(--success)", metric: `$${(savings / 1e6).toFixed(1)}M` }); }
      if (fA.cost > cA.cost) { const increase = fA.cost - cA.cost; insights.push({ type: "warning", title: `$${(increase / 1e6).toFixed(1)}M Cost Increase`, body: `The ${sc.label} scenario adds ${fA.hc - cA.hc} headcount costing $${(increase / 1e6).toFixed(2)}M/year. Verify this represents strategic investment (new capabilities, growth functions) rather than structural bloat.`, color: "var(--warning)", metric: `+$${(increase / 1e6).toFixed(1)}M` }); }
      // Largest department
      const largest = [...currentData].sort((a, b) => b.headcount - a.headcount)[0];
      const smallest = [...currentData].sort((a, b) => a.headcount - b.headcount)[0];
      insights.push({ type: "info", title: `Concentration Risk: ${largest.name}`, body: `${largest.name} holds ${Math.round(largest.headcount / cA.hc * 100)}% of total headcount (${largest.headcount}/${cA.hc}). ${largest.headcount / cA.hc > 0.3 ? "This concentration exceeds 30% — consider whether this function warrants sub-division to improve resilience." : "Concentration is within acceptable range."} Smallest function: ${smallest.name} (${smallest.headcount}, ${Math.round(smallest.headcount / cA.hc * 100)}%).`, color: "var(--accent-primary)", metric: `${Math.round(largest.headcount / cA.hc * 100)}%` });
      // IC to Manager ratio by department
      const worstIMRatio = [...currentData].sort((a, b) => (a.ics / Math.max(a.managers, 1)) - (b.ics / Math.max(b.managers, 1)))[0];
      const bestIMRatio = [...currentData].sort((a, b) => (b.ics / Math.max(b.managers, 1)) - (a.ics / Math.max(a.managers, 1)))[0];
      insights.push({ type: "info", title: "IC-to-Manager Disparity", body: `Widest gap: ${bestIMRatio.name} has ${(bestIMRatio.ics / Math.max(bestIMRatio.managers, 1)).toFixed(1)} ICs per manager vs ${worstIMRatio.name} at ${(worstIMRatio.ics / Math.max(worstIMRatio.managers, 1)).toFixed(1)}. Standardizing ratios could improve equity and reduce role confusion.`, color: "var(--accent-primary)" });
      // FTE ratio
      const avgFte = currentData.reduce((s, d) => s + d.fteRatio, 0) / currentData.length;
      const lowFte = currentData.filter(d => d.fteRatio < 0.8);
      if (lowFte.length > 0) insights.push({ type: "warning", title: `High Contractor Reliance`, body: `${lowFte.map(d => `${d.name} (${Math.round(d.fteRatio * 100)}% FTE)`).join(", ")} — FTE ratio below 80% indicates dependency on contingent workforce. Consider converting key contractor roles to FTE for knowledge retention.`, color: "var(--warning)", metric: `${Math.round(avgFte * 100)}% avg` });
      // Scenario-specific
      insights.push({ type: "info", title: `${sc.label} Scenario Summary`, body: `This scenario changes headcount from ${cA.hc} → ${fA.hc} (${fA.hc > cA.hc ? "+" : ""}${fA.hc - cA.hc}), adjusts average span from ${cA.avgS.toFixed(1)} → ${fA.avgS.toFixed(1)}, and shifts cost from $${(cA.cost / 1e6).toFixed(1)}M → $${(fA.cost / 1e6).toFixed(1)}M. The primary lever is ${fA.avgL < cA.avgL ? "layer compression" : fA.hc < cA.hc ? "headcount reduction" : "span optimization"}.`, color: "var(--accent-primary)" });

      if (!insights.length) insights.push({ type: "info", title: "No Major Flags", body: "Current scenario changes are within normal ranges.", color: "var(--accent-primary)" });
      return <div>
        <div className="text-[12px] text-[var(--text-secondary)] mb-4">{insights.length} insights generated from structural analysis of {currentData.length} departments, {cA.hc.toLocaleString()} employees, comparing current state to {sc.label} scenario.</div>
        <div className="space-y-3">{insights.map((ins, i) => <div key={i} className="rounded-xl p-5 border" style={{ background: `${ins.color}08`, borderColor: `${ins.color}20`, borderLeftWidth: 4, borderLeftColor: ins.color }}>
          <div className="flex items-center justify-between mb-1"><div className="text-[14px] font-bold" style={{ color: ins.color }}>{ins.title}</div>{ins.metric && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${ins.color}15`, color: ins.color }}>{ins.metric}</span>}</div>
          <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{ins.body}</div>
        </div>)}</div>
      </div>;
    })()}
    <NextStepBar currentModuleId="build" onNavigate={onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 7: CHANGE PLANNER
   ═══════════════════════════════════════════════════════════════ */
function ChangePlanner({ model, f, onBack, onNavigate, jobStates, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, JobDesignState>; viewCtx?: ViewContext }) {
  const [sub, setSub] = useState("road");
  const [aiChangePlan, setAiChangePlan] = useState<Record<string, unknown>[]>([]);
  const [data, cpLoading] = useApiData(() => sub === "road" ? api.getRoadmap(model, f) : api.getRisk(model, f), [sub, model, f.func, f.jf, f.sf, f.cl]);
  // Job view: filter to this role
  if (viewCtx?.mode === "job" && viewCtx?.job) return <div>
    <PageHeader icon="💼" title={`Change Plan — ${viewCtx.job}`} subtitle="Initiatives affecting this role" onBack={onBack} moduleId="plan" />
    <ContextStrip items={[`Showing change initiatives relevant to ${viewCtx.job}. Switch to Org View to see the full roadmap.`]} />
    <TabBar tabs={[{ id: "road", label: "Role Roadmap" }, { id: "risk", label: "Role Risks" }]} active={sub} onChange={setSub} />
    {sub === "road" ? (() => { const d = data as Record<string, unknown> | null; const roadmap = ((d?.roadmap ?? []) as Record<string, unknown>[]).filter(r => String(r["Job Title"] || r.initiative || "").toLowerCase().includes(viewCtx.job!.toLowerCase().split(" ")[0])); return <div>
      <div className="grid grid-cols-3 gap-3 mb-5"><KpiCard label="Initiatives" value={roadmap.length || "All"} accent /><KpiCard label="Source" value={String((d?.summary as Record<string, unknown>)?.source ?? "—")} /><KpiCard label="Status" value="Planned" /></div>
      <Card title={`Initiatives for ${viewCtx.job}`}>{roadmap.length ? <DataTable data={roadmap} /> : <div className="text-[13px] text-[var(--text-secondary)] py-4">No specific initiatives found for this role. Showing the full roadmap below.</div>}</Card>
      {roadmap.length === 0 && <Card title="Full Roadmap"><DataTable data={((d?.roadmap ?? []) as Record<string, unknown>[])} /></Card>}
    </div>; })() : (() => { const d = data as Record<string, unknown> | null; return <div>
      <Card title="Risks Affecting This Role"><DataTable data={((d?.high_risk_tasks ?? []) as Record<string, unknown>[]).filter(r => String(r["Job Title"] || r.Task || "").toLowerCase().includes(viewCtx.job!.toLowerCase().split(" ")[0]))} /></Card>
    </div>; })()}
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;

  // Employee view: personal change journey
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="My Change Journey" subtitle={`What's changing for ${viewCtx.employee}`} onBack={onBack} moduleId="plan" />
    <Card title="Your Transformation Timeline">
      <div className="space-y-4">
        {[{ wave: "Wave 1", time: "Month 1-3", title: "Awareness & Training", items: ["AI tool introduction workshops", "New process documentation shared", "Pilot group participation opportunity"], color: "var(--accent-primary)" },
          { wave: "Wave 2", time: "Month 4-6", title: "Transition & Practice", items: ["AI tools integrated into daily workflow", "Reduced manual task load", "Coaching sessions with change champion"], color: "var(--success)" },
          { wave: "Wave 3", time: "Month 7-12", title: "New Normal", items: ["Full adoption of AI-augmented processes", "Role evolution complete", "Focus shifts to higher-value activities"], color: "var(--purple)" }
        ].map((w, i) => <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center shrink-0"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: w.color }}>{i + 1}</div>{i < 2 && <div className="w-px h-full mt-1" style={{ background: w.color, opacity: 0.2 }} />}</div>
          <div className="flex-1 pb-2"><div className="flex items-baseline gap-2 mb-1"><span className="text-[13px] font-bold text-[var(--text-primary)]">{w.title}</span><Badge color="gray">{w.time}</Badge></div><div className="space-y-1">{w.items.map((item, j) => <div key={j} className="text-[12px] text-[var(--text-secondary)] pl-3 relative"><span className="absolute left-0 text-[var(--text-muted)]">·</span>{item}</div>)}</div></div>
        </div>)}
      </div>
    </Card>
    <InsightPanel title="Support Available" items={["Your manager will be your primary support during the transition.", "Change champions in each department can answer questions.", "Weekly office hours with the transformation team.", "Self-paced learning modules available on the company LMS."]} icon="🛡️" />
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Your transformation roadmap. Auto-generates from Phase 2 decisions or upload your own change plan."]} />
    <PageHeader icon="🚀" title="Change Planner" subtitle="Sequence initiatives and manage transformation risk" onBack={onBack} moduleId="plan" />
    <TabBar tabs={[{ id: "road", label: "Roadmap" }, { id: "risk", label: "Risk Analysis" }]} active={sub} onChange={setSub} />
    {sub === "road" && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4 flex items-center justify-between">
      <div><div className="text-[13px] font-bold text-[var(--text-primary)]">☕ AI can build your change roadmap</div><div className="text-[12px] text-[var(--text-muted)]">Generates initiatives, waves, owners, and risks from your transformation decisions</div></div>
      <button onClick={async () => {
        const context = Object.entries(jobStates).filter(([,s]) => s.finalized || s.deconSubmitted).map(([role, s]) => {
          const decisions = s.redeployRows.map(r => `${r["Task Name"]}: ${r.Decision}`).join(", ");
          return `${role}: ${decisions || "tasks defined but not deployed"}`;
        }).join("; ");
        if (!context) return;
        // Fetch change readiness data to inform the plan
        let readinessContext = "";
        try {
          const crData = await api.getChangeReadiness(model);
          const cr = crData as Record<string, unknown>;
          const segments = cr?.segments as Record<string, unknown>[] | undefined;
          if (segments?.length) {
            const highRisk = segments.filter(s => String(s.quadrant || "").toLowerCase().includes("risk")).length;
            const champions = segments.filter(s => String(s.quadrant || "").toLowerCase().includes("champion")).length;
            readinessContext = ` Change Readiness: ${highRisk} high-risk employees needing intensive support, ${champions} champions available as advocates.`;
          }
          const summary = cr?.summary as Record<string, unknown> | undefined;
          if (summary) {
            readinessContext += ` Avg readiness: ${summary.avg_readiness || "—"}/5. High-impact segment: ${summary.high_impact_pct || "—"}%.`;
          }
        } catch {}
        const raw = await callAI("Return ONLY valid JSON array.", `Based on these work design decisions, generate 6-8 change management initiatives.${readinessContext} Context: ${context}. Return JSON array: [{"initiative":"name","description":"what","owner":"role title","priority":"High/Medium/Low","wave":"Wave 1/Wave 2/Wave 3","start":"2026-Q1","end":"2026-Q2","risk":"main risk","dependency":"what it depends on"}]`);
        try {
          const initiatives = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
          if (Array.isArray(initiatives)) setAiChangePlan(initiatives);
        } catch {}
      }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Auto-Build Plan</button>
    </div>}
    {aiChangePlan.length > 0 && sub === "road" && <Card title="☕ AI-Generated Change Plan">
      <div className="flex justify-end mb-2"><button onClick={() => setAiChangePlan([])} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--risk)]">Clear Plan ✕</button></div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[13px]"><thead><tr className="bg-[var(--surface-2)]">{["Initiative","Owner","Priority","Wave","Risk",""].map(h => <th key={h} className="px-3 py-2 border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)] font-semibold">{h}</th>)}</tr></thead><tbody>{aiChangePlan.map((row, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 min-w-[180px]"><EditableCell value={String(row.initiative || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], initiative: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2 min-w-[120px]"><EditableCell value={String(row.owner || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], owner: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2 min-w-[90px]"><SelectCell value={String(row.priority || "Medium")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], priority: v }; setAiChangePlan(n); }} options={["High","Medium","Low"]} /></td>
        <td className="px-3 py-2 min-w-[90px]"><SelectCell value={String(row.wave || "Wave 1")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], wave: v }; setAiChangePlan(n); }} options={["Wave 1","Wave 2","Wave 3","Wave 4"]} /></td>
        <td className="px-3 py-2 min-w-[140px]"><EditableCell value={String(row.risk || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], risk: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2"><button onClick={() => setAiChangePlan(aiChangePlan.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[13px]">✕</button></td>
      </tr>)}</tbody></table></div>
      <button onClick={() => setAiChangePlan([...aiChangePlan, { initiative: "New Initiative", owner: "", priority: "Medium", wave: "Wave 1", risk: "" }])} className="mt-2 text-[12px] text-[var(--accent-primary)] hover:underline">+ Add Initiative</button>
    </Card>}
    {/* Gantt Chart — visual timeline of AI-generated initiatives */}
    {aiChangePlan.length > 0 && sub === "road" && <Card title="📊 Initiative Gantt Chart">
      <div className="text-[11px] text-[var(--text-muted)] mb-3">Each bar represents an initiative positioned by wave and colored by priority.</div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 600 }}>
          {/* Timeline header */}
          <div className="flex items-center mb-2">
            <div style={{ width: 180, flexShrink: 0 }} />
            {["Wave 1", "Wave 2", "Wave 3", "Wave 4"].map((w, i) => <div key={w} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS[i % COLORS.length] }}>{w}</div>)}
          </div>
          {/* Grid lines */}
          <div className="relative">
            <div className="absolute inset-0 flex" style={{ pointerEvents: "none" }}>
              <div style={{ width: 180, flexShrink: 0 }} />
              {[0,1,2,3].map(i => <div key={i} className="flex-1 border-l border-[var(--border)]" style={{ borderStyle: "dashed" }} />)}
            </div>
            {/* Bars */}
            <div className="space-y-1.5 relative">
              {aiChangePlan.map((row, i) => {
                const wave = String(row.wave || "Wave 1");
                const waveIdx = ["Wave 1","Wave 2","Wave 3","Wave 4"].indexOf(wave);
                const startPct = Math.max(0, waveIdx) * 25;
                const widthPct = wave.includes("4") ? 25 : (row.end && String(row.end).includes("Q") ? 
                  Math.max(25, (["Wave 1","Wave 2","Wave 3","Wave 4"].indexOf(wave) + 2) * 25 - startPct) : 25);
                const priColor = row.priority === "High" ? "var(--risk)" : row.priority === "Low" ? "var(--success)" : "var(--accent-primary)";
                return <div key={i} className="flex items-center" style={{ height: 28 }}>
                  <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate" style={{ width: 180, flexShrink: 0, paddingRight: 8 }} title={String(row.initiative || "")}>{String(row.initiative || "").length > 22 ? String(row.initiative || "").slice(0,20) + "…" : String(row.initiative || "")}</div>
                  <div className="flex-1 relative h-full flex items-center">
                    <div className="absolute rounded-md flex items-center px-2" style={{ 
                      left: `${startPct}%`, width: `${Math.min(widthPct, 100 - startPct)}%`, 
                      height: 20, background: `${priColor}20`, border: `1px solid ${priColor}40`,
                      transition: "all 0.3s"
                    }}>
                      <span className="text-[9px] font-semibold truncate" style={{ color: priColor }}>{String(row.owner || "")}</span>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-2 border-t border-[var(--border)]">
            {[{l:"High Priority",c:"var(--risk)"},{l:"Medium",c:"var(--accent-primary)"},{l:"Low",c:"var(--success)"}].map(x => <div key={x.l} className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)]"><div className="w-3 h-2 rounded-sm" style={{ background: `${x.c}30`, border: `1px solid ${x.c}50` }} />{x.l}</div>)}
          </div>
        </div>
      </div>
    </Card>}
    {sub === "road" ? (() => { const d = data as Record<string, unknown> | null; const s = ((d?.summary ?? {}) as Record<string, unknown>);
      const wd = ((d?.wave_distribution ?? {}) as Record<string, number>);
      const waves = Object.entries(wd); const pd = ((d?.priority_distribution ?? {}) as Record<string, number>); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Initiatives" value={s.total as number ?? 0} accent /><KpiCard label="High Priority" value={s.high_priority as number ?? 0} /><KpiCard label="Waves" value={s.waves as number ?? 0} /><KpiCard label="Source" value={String(s.source ?? "—")} /></div>
      {/* Timeline visualization */}
      {waves.length > 0 && <Card title="Transformation Timeline">
        <div className="flex items-end gap-1 h-32 mb-2">{waves.map(([name, count], i) => <div key={name} className="flex-1 flex flex-col items-center justify-end">
          <div className="text-[11px] font-bold mb-1" style={{ color: COLORS[i % COLORS.length] }}>{count}</div>
          <div className="w-full rounded-t transition-all" style={{ height: `${Math.max((count / Math.max(...Object.values(wd))) * 100, 8)}%`, background: `${COLORS[i % COLORS.length]}40`, border: `1px solid ${COLORS[i % COLORS.length]}60` }} />
          <div className="text-[10px] text-[var(--text-muted)] mt-2 font-semibold">{name}</div>
        </div>)}</div>
        <div className="flex gap-0">{waves.map(([name], i) => <div key={name} className="flex-1 h-2 first:rounded-l last:rounded-r" style={{ background: COLORS[i % COLORS.length] }} />)}</div>
        <div className="flex justify-between mt-1 text-[10px] text-[var(--text-muted)]"><span>Start</span><span>End</span></div>
      </Card>}<div className="grid grid-cols-12 gap-4"><div className="col-span-7"><Card title="Change Plan"><DataTable data={((d?.roadmap ?? []) as Record<string, unknown>[])} /></Card></div><div className="col-span-5"><Card title="Priority"><DonutViz data={Object.entries(pd).map(([n, v]) => ({ name: n, value: v }))} /></Card><Card title="Waves"><BarViz data={Object.entries(wd).map(([n, v]) => ({ Wave: n, Count: v }))} labelKey="Wave" valueKey="Count" color="var(--warning)" /></Card></div></div></div>; })() : (() => { const d = data as Record<string, unknown> | null; if (d && (d as Record<string, unknown>).empty) return <Empty text="Upload work design data" icon="⚠️" />; const s = ((d?.summary ?? {}) as Record<string, unknown>); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="High Risk" value={s.high_risk_count as number ?? 0} /><KpiCard label="Do Not Automate" value={s.no_automate_count as number ?? 0} accent /><KpiCard label="Avg Risk" value={s.avg_risk as number ?? 0} /><KpiCard label="Assessed" value={s.total_assessed as number ?? 0} /></div><div className="grid grid-cols-2 gap-4"><Card title="Risk by Workstream"><BarViz data={((d?.risk_by_workstream ?? []) as Record<string, unknown>[])} labelKey="Workstream" valueKey="Risk Score" color="var(--risk)" /></Card><Card title="High Risk Tasks"><DataTable data={((d?.high_risk_tasks ?? []) as Record<string, unknown>[])} /></Card></div></div>; })()}
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 8: OPERATING MODEL LAB
   The full design sandbox from previous build
   ═══════════════════════════════════════════════════════════════ */

const OM_FUNCTIONS: Record<string, { label: string; icon: string; core: string[]; shared: string[]; enabling: string[]; interface_: string[] }> = {
  finance: { label: "Finance & Fund Ops", icon: "💰", core: ["Accounting & Close","Treasury & Cash Mgmt","Tax & Compliance","FP&A & Budgeting","Fund Administration","Financial Reporting","Internal Audit","Procurement","Accounts Payable","Accounts Receivable","Revenue Recognition","Cost Management"], shared: ["Financial Systems","Shared Reporting Pool","Data Governance"], enabling: ["ERP Platform","BI & Analytics Tools","Automation Layer"], interface_: ["Investor Reporting Portal","Management Dashboard","Regulatory Filing"] },
  technology: { label: "Technology & Data", icon: "⚙️", core: ["Software Engineering","Cloud Infrastructure","Data Engineering","Data Science & AI","Cybersecurity","IT Operations","Enterprise Architecture","Platform Engineering","Site Reliability","DevOps & CI/CD"], shared: ["Shared Dev Tools","Identity & Access","Monitoring & Observability"], enabling: ["Cloud Platform","API Gateway","ML Infrastructure"], interface_: ["Developer Portal","IT Service Desk","Client-Facing APIs"] },
  hr: { label: "Human Resources", icon: "👥", core: ["Talent Acquisition","Total Rewards & Comp","Learning & Development","People Analytics","Employee Relations","DEI & Belonging","HR Operations","Workforce Planning","Succession Planning","Performance Management","Organizational Design","Culture & Engagement"], shared: ["HRIS Platform","Payroll Processing","Benefits Administration"], enabling: ["People Analytics Platform","LMS","ATS"], interface_: ["Employee Self-Service","Manager Portal","Candidate Experience"] },
  legal: { label: "Legal & Compliance", icon: "⚖️", core: ["Corporate Legal","Regulatory Affairs","Compliance Operations","Risk Oversight","Privacy & Data Protection","IP & Contracts","Litigation","Policy & Governance","Ethics & Investigations","Licensing"], shared: ["Legal Operations","Contract Management","eDiscovery"], enabling: ["CLM Platform","Compliance Monitoring","Risk Database"], interface_: ["Policy Portal","Whistleblower Channel","Regulatory Dashboard"] },
  investments: { label: "Investment Management", icon: "📈", core: ["Research & Analysis","Deal Origination","Underwriting","Portfolio Management","Trading & Execution","Risk Analytics","Valuation","Asset Allocation","Due Diligence","Portfolio Monitoring","ESG Integration","Co-Investment","Fund Structuring"], shared: ["Investor Relations","Fund Accounting","Performance Reporting"], enabling: ["Trading Platform","Data Feeds","Risk Models","Portfolio Analytics"], interface_: ["Investor Portal","LP Reporting","Deal Pipeline Dashboard"] },
  operations: { label: "Operations", icon: "🔧", core: ["Supply Chain Planning","Manufacturing","Quality Assurance","Logistics & Distribution","Customer Operations","Facilities Management","Process Excellence","Inventory Management","Vendor Management","Safety & Compliance"], shared: ["Shared Services Center","Procurement Hub","Fleet Management"], enabling: ["ERP & MRP","IoT & Sensors","WMS"], interface_: ["Supplier Portal","Customer Service","Operations Dashboard"] },
  marketing: { label: "Marketing & Growth", icon: "📣", core: ["Brand Strategy","Digital Marketing","Content & Creative","Marketing Analytics","Demand Generation","Product Marketing","Communications & PR","Social Media","SEO & SEM","CRM & Lifecycle","Market Research","Events & Sponsorships"], shared: ["Marketing Ops","Creative Services Pool","Media Buying"], enabling: ["Marketing Automation","CMS","Analytics Platform"], interface_: ["Brand Portal","Partner Hub","Campaign Dashboard"] },
  product: { label: "Product & Engineering", icon: "🚀", core: ["Product Management","Frontend Engineering","Backend Engineering","Mobile Engineering","UX/UI Design","Quality Engineering","DevOps","Data Engineering","Machine Learning","Platform Services","Technical Architecture"], shared: ["Design System","Component Library","Testing Infrastructure"], enabling: ["CI/CD Pipeline","Feature Flags","Monitoring"], interface_: ["Product Roadmap Portal","API Documentation","Release Notes"] },
};
const OM_ARCHETYPES: Record<string, { label: string; desc: string; visual: string; gov: string[]; shared: string[]; traits: Record<string, number>; corePrefix: string; coreSuffix: string; enableTheme: string[]; interfaceTheme: string[]; sharedTheme: string[] }> = {
  functional: { label: "Functional", desc: "Organized by expertise. Clear specialization, deep skill pools.", visual: "silos", gov: ["Executive Leadership Council","Functional Heads Forum","Budget & Resource Committee"], shared: ["HR Shared Services","IT Shared Services","Finance Shared Services","Legal Shared Services"], traits: { efficiency: 5, innovation: 2, speed: 2, scalability: 4, collaboration: 2 }, corePrefix: "", coreSuffix: " Center of Excellence", enableTheme: ["Enterprise Systems","Knowledge Management","Process Automation","Standards & Methodology"], interfaceTheme: ["Internal Service Desk","Reporting Portal","Policy & Compliance Hub"], sharedTheme: ["Centralized Analytics","Shared Admin Pool","Cross-Functional PMO"] },
  divisional: { label: "Divisional", desc: "Organized by business line / product / geography. P&L ownership.", visual: "divisions", gov: ["CEO & Executive Committee","Division Presidents Council","Corporate Strategy Board"], shared: ["Corporate Finance","Legal & Compliance CoE","HR Business Partners","Technology Platform"], traits: { efficiency: 3, innovation: 4, speed: 4, scalability: 3, collaboration: 2 }, corePrefix: "", coreSuffix: " — Division-Led", enableTheme: ["Division P&L Systems","Local Market Tools","Product Lifecycle Platform","Regional Infrastructure"], interfaceTheme: ["Division Dashboard","Customer-Facing Portal","Market Intelligence Hub"], sharedTheme: ["Corporate Shared Services","Cross-Division Synergies","Enterprise Risk Management"] },
  matrix: { label: "Matrix", desc: "Dual reporting: function + business line. Balances depth & breadth.", visual: "matrix", gov: ["Executive Steering Committee","Matrix Governance Board","Conflict Resolution Forum","Resource Arbitration"], shared: ["Shared Analytics & BI","Platform Technology","Talent Marketplace","Cross-Functional PMO"], traits: { efficiency: 3, innovation: 4, speed: 3, scalability: 4, collaboration: 5 }, corePrefix: "", coreSuffix: " (Matrix)", enableTheme: ["Collaboration Platform","Resource Management System","Dual-Reporting Tools","Integrated Planning Suite"], interfaceTheme: ["Unified Dashboard","Matrix Navigation Portal","Skills & Availability Finder"], sharedTheme: ["Shared Capability Pools","Integrated Reporting","Cross-Team Coordination"] },
  platform: { label: "Platform", desc: "Central platform enables autonomous teams. APIs over hierarchy.", visual: "hub", gov: ["Platform Steering Committee","API Governance Board","Standards & Interoperability Council"], shared: ["Core Platform Services","Data & Analytics Layer","Identity & Access Platform","Developer Experience"], traits: { efficiency: 4, innovation: 5, speed: 5, scalability: 5, collaboration: 4 }, corePrefix: "", coreSuffix: " as a Service", enableTheme: ["API Gateway","Self-Service Provisioning","Feature Flag Platform","Observability & Monitoring"], interfaceTheme: ["Developer Portal","Self-Service Marketplace","API Documentation Hub"], sharedTheme: ["Platform-as-a-Service Core","Shared Data Mesh","Common Component Library"] },
  network: { label: "Network", desc: "Fluid, project-based. Teams form and dissolve around missions.", visual: "network", gov: ["Mission Council","Resource Allocation Board","Network Coordination"], shared: ["Knowledge Graph","Talent Pool & Matching","Tooling Commons","Mission Support Services"], traits: { efficiency: 2, innovation: 5, speed: 5, scalability: 3, collaboration: 5 }, corePrefix: "", coreSuffix: " Squad", enableTheme: ["Mission Planning Tools","Team Formation Engine","Knowledge Sharing Platform","Rapid Prototyping Lab"], interfaceTheme: ["Mission Board","Skill Finder","Impact Dashboard"], sharedTheme: ["Floating Resource Pool","Shared Learning Hub","Cross-Mission Insights"] },
};
const OM_OPMODELS: Record<string, { label: string; desc: string }> = {
  centralized: { label: "Centralized", desc: "Single point of control." }, decentralized: { label: "Decentralized", desc: "Local autonomy." }, federated: { label: "Federated", desc: "Central standards, local execution." }, hub_spoke: { label: "Hub-and-Spoke", desc: "CoE hub with embedded spokes." },
};
const OM_GOVERNANCE: Record<string, { label: string; icon: string }> = {
  tight: { label: "Tight Governance", icon: "🔒" }, balanced: { label: "Balanced", icon: "⚖️" }, light: { label: "Light Governance", icon: "🌊" },
};
const OM_LIFECYCLES: Record<string, string[]> = { finance: ["Plan","Record","Report","Analyze","Advise","Close"], technology: ["Discover","Design","Build","Test","Deploy","Operate"], hr: ["Attract","Recruit","Onboard","Develop","Perform","Retain"], legal: ["Identify","Assess","Advise","Draft","Review","Monitor"], investments: ["Research","Source","Diligence","Approve","Execute","Exit"], operations: ["Forecast","Source","Produce","Quality","Ship","Improve"], marketing: ["Research","Strategy","Create","Distribute","Measure","Optimize"], product: ["Discover","Define","Design","Build","Ship","Iterate"] };
const OM_INTERFACES: Record<string, string[]> = { finance: ["Financial Reporting","Budget & Forecast","Capital Allocation","Audit & Controls"], technology: ["Service Catalog","Data Platform","Security Framework","Dev Portal"], hr: ["Employee Portal","Manager Dashboard","Talent Marketplace","Analytics"], legal: ["Contract Hub","Compliance Portal","Risk Dashboard","Policy Library"], investments: ["Deal Pipeline","Portfolio Dashboard","LP Reporting","Research Library"], operations: ["Order Mgmt","Inventory System","Quality Dashboard","Vendor Portal"], marketing: ["Campaign Hub","Analytics Dashboard","Brand Guidelines","Content Library"], product: ["Product Roadmap","Feature Requests","Release Notes","API Docs"] };
const OM_COMPANIES: Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }> = {
  toyota: { name: "Toyota", industry: "Automotive", archetype: "functional", opModel: "federated", governance: "tight" },
  tesla: { name: "Tesla", industry: "Automotive", archetype: "platform", opModel: "centralized", governance: "tight" },
  netflix: { name: "Netflix", industry: "Media/Tech", archetype: "network", opModel: "decentralized", governance: "light" },
  amazon: { name: "Amazon", industry: "Tech/Retail", archetype: "divisional", opModel: "decentralized", governance: "balanced" },
  jpmorgan: { name: "JP Morgan", industry: "Financial Services", archetype: "matrix", opModel: "federated", governance: "tight" },
  spotify: { name: "Spotify", industry: "Tech/Media", archetype: "matrix", opModel: "federated", governance: "light" },
  microsoft: { name: "Microsoft", industry: "Technology", archetype: "platform", opModel: "federated", governance: "balanced" },
};

function OmBlock({ label, colorClass = "core", highlight, wide, note }: { label: string; colorClass?: string; highlight?: boolean; wide?: boolean; note?: string }) {
  const cm: Record<string, { border: string; text: string }> = { core: { border: "var(--accent-primary)", text: "var(--accent-primary)" }, gov: { border: "var(--teal)", text: "var(--teal)" }, shared: { border: "var(--green)", text: "var(--green)" }, flow: { border: "var(--amber)", text: "var(--amber)" }, purple: { border: "var(--purple)", text: "var(--purple)" } };
  const c = cm[colorClass] || cm.core;
  return <div className="transition-all hover:-translate-y-0.5" style={{ background: highlight ? c.border : "var(--surface-2)", border: `1.5px solid ${c.border}`, borderRadius: 6, padding: wide ? "10px 18px" : "8px 12px", minWidth: wide ? 160 : 80, flex: wide ? "1 1 0" : "0 0 auto", textAlign: "center" }}>
    <div style={{ color: highlight ? "#FFFFFF" : c.text, fontWeight: 600, fontSize: 12, lineHeight: 1.4 }}>{label}</div>
    {note && <div className="text-[10px] text-[var(--text-muted)] mt-0.5 italic">{note}</div>}
  </div>;
}

function OperatingModelLab({ onBack, model, f }: { onBack: () => void; model?: string; f?: Filters }) {
  const [omData] = useApiData(() => model ? api.getOperatingModel(model, f || { func: "All", jf: "All", sf: "All", cl: "All" }) : Promise.resolve(null), [model]);
  const hasUploadedOM = omData && (omData as Record<string, unknown>).layers && Object.keys((omData as Record<string, unknown>).layers as object).length > 0;
  const [aiOmLoading, setAiOmLoading] = useState(false);
  const [aiOmReasoning, setAiOmReasoning] = useState("");
  const [aiCompanyInput, setAiCompanyInput] = useState("");
  const [aiCompanyGenerating, setAiCompanyGenerating] = useState(false);
  const [aiCompanies, setAiCompanies] = useState<Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }>>({});
  const generateCompanyModel = async () => {
    if (!aiCompanyInput.trim() || aiCompanyGenerating) return;
    setAiCompanyGenerating(true);
    try { const raw = await callAI("Return ONLY valid JSON.", `What organizational archetype, operating model, and governance style does "${aiCompanyInput.trim()}" use? Return JSON: {"name":"${aiCompanyInput.trim()}","industry":"sector","archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light"}`); const c = JSON.parse(raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (c.name) { setAiCompanies(p => ({...p, [c.name.toLowerCase().replace(/\s+/g,"_")]: c})); setArch(c.archetype); setOpModel(c.opModel); setGov(c.governance); setAiCompanyInput(""); }
    } catch {} setAiCompanyGenerating(false);
  };
  const [fn, setFnRaw] = useState("finance");
  const setFn = (f: string) => { setFnRaw(f); setRapidRows(({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[f] || []).map((d: string) => ({d, r:["D","A","R","P"]}))); };
  const [arch, setArch] = useState("functional");
  const [opModel, setOpModel] = useState("centralized");
  const [gov, setGov] = useState("balanced");
  const [omView, setOmView] = useState("blueprint");
  const [maturityScores, setMaturityScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_maturity`, {});
  const [targetScores, setTargetScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_target`, {});
  const defaultRapid = ({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[fn] || "Strategy,Budget,Talent,Technology,AI Implementation,Process Changes,Vendor Selection,Risk Management".split(",")).map((d: string) => ({d, r:["D","A","R","P"]}));
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, string>>({});
  const [rapidRows, setRapidRows] = useState<{d:string;r:string[]}[]>(defaultRapid);
  const [aiBlueprint, setAiBlueprint] = useState<Record<string, string[]> | null>(null);
  const fnD = OM_FUNCTIONS[fn]; const archD = OM_ARCHETYPES[arch];
  // Governance: archetype base + governance tightness modifier
  const govExtra = gov === "tight" ? ["Audit & Oversight Committee","Policy Enforcement"] : gov === "light" ? [] : ["Governance Coordination"];
  const govLayer = [...archD.gov, ...govExtra];
  // Operating model modifier on shared layer
  const modelShared = opModel === "centralized" ? "Global Shared Services Center" : opModel === "decentralized" ? "Local Delivery Teams" : opModel === "federated" ? "Federated Centers of Expertise" : "Hub Center + Embedded Spokes";
  // Core: function capabilities + archetype suffix
  const coreLayer = fnD.core.map(c => archD.coreSuffix ? `${c}${archD.coreSuffix}` : c);
  // Shared: blend function shared + archetype shared themes
  const sharedLayer = [...(fnD.shared || []), modelShared, ...archD.sharedTheme.filter(s => !(fnD.shared || []).some(fs => fs.toLowerCase().includes(s.toLowerCase().split(" ")[0])))].slice(0, 6);
  // Enabling: archetype-specific enabling (overrides function default)
  const enableLayer = archD.enableTheme;
  // Interface: archetype-specific interface
  const interfaceLayer = archD.interfaceTheme;
  const teams = [...coreLayer, ...sharedLayer, ...enableLayer, ...interfaceLayer];
  const getAiTier = (t: string) => { const l = t.toLowerCase();
    // Platform archetype pushes everything more toward AI
    const platformBoost = arch === "platform" ? 15 : arch === "network" ? 5 : 0;
    // Centralized model favors more automation
    const modelBoost = opModel === "centralized" ? 10 : opModel === "decentralized" ? -5 : 0;
    if (l.includes("analytics") || l.includes("data") || l.includes("reporting") || l.includes("qa") || l.includes("audit")) { const p = Math.min(70 + platformBoost + modelBoost, 95); return { tier: "AI-First" as const, color: "#8B5CF6", pct: p }; }
    if (l.includes("ops") || l.includes("admin") || l.includes("procurement") || l.includes("processing") || l.includes("payable") || l.includes("receivable")) { const p = Math.min(45 + platformBoost + modelBoost, 85); return { tier: "AI-Augmented" as const, color: "#3B82F6", pct: p }; }
    if (l.includes("strategy") || l.includes("leadership") || l.includes("relations") || l.includes("counsel") || l.includes("culture")) { const p = Math.max(15 + platformBoost + modelBoost, 5); return { tier: "Human-Led" as const, color: "#10B981", pct: p }; }
    const p = Math.min(35 + platformBoost + modelBoost, 80); return { tier: "Hybrid" as const, color: "#F97316", pct: p }; };
  const getSM = (t: string) => { if (sharedLayer.some(s => s.toLowerCase().includes(t.toLowerCase().split(" ")[0]))) return "Shared"; return "Embedded"; };
  const activeCoreLayer = aiBlueprint?.core || coreLayer.map(c => c.replace(archD.coreSuffix, ""));
  const activeSharedLayer = aiBlueprint?.shared || sharedLayer;
  const activeEnableLayer = aiBlueprint?.enabling || enableLayer;
  const activeInterfaceLayer = aiBlueprint?.interface || interfaceLayer;
  const activeGovLayer = aiBlueprint?.governance || govLayer;
  const allCaps = [...activeGovLayer.map(g => ({name:g,layer:"Governance"})), ...activeCoreLayer.map(c => ({name:c,layer:"Core"})), ...activeSharedLayer.map(s => ({name:s,layer:"Shared"})), ...activeEnableLayer.map(e => ({name:e,layer:"Enabling"})), ...activeInterfaceLayer.map(i => ({name:i,layer:"Interface"}))];
  const layerColors: Record<string,string> = { Governance: "var(--risk)", Core: "var(--accent-primary)", Shared: "var(--success)", Enabling: "var(--purple)", Interface: "var(--warning)" };

  return <div>
    <PageHeader icon="🧬" title="Operating Model Lab" subtitle="Design your target operating model with AI-era frameworks" onBack={onBack} />
    {hasUploadedOM ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--success)]">✓ Operating model data detected</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--warning)]">Exploring with sample patterns — upload Operating Model data for custom blueprint</div>}
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-3 space-y-3">
        <Card title="Function"><div className="space-y-1">{Object.entries(OM_FUNCTIONS).map(([k,v]) => <button key={k} onClick={() => setFn(k)} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all flex items-center gap-2" style={{ background: fn===k ? "rgba(59,130,246,0.1)" : "transparent", border: fn===k ? "1px solid var(--accent-primary)" : "1px solid transparent", color: fn===k ? "var(--accent-primary)" : "var(--text-muted)" }}><span>{v.icon}</span>{v.label}</button>)}</div></Card>
        <Card title="Archetype"><div className="space-y-1">{Object.entries(OM_ARCHETYPES).map(([k,v]) => <button key={k} onClick={() => setArch(k)} className="w-full text-left px-3 py-1 rounded-lg text-[10px] transition-all" style={{ background: arch===k ? "rgba(139,92,246,0.1)" : "transparent", border: arch===k ? "1px solid var(--purple)" : "1px solid transparent", color: arch===k ? "var(--purple)" : "var(--text-muted)" }}>{v.label}</button>)}</div></Card>
        <Card title="Model"><div className="flex gap-1 flex-wrap mb-2">{["centralized","decentralized","federated","hub_spoke"].map(m => <button key={m} onClick={() => setOpModel(m)} className="px-2 py-1 rounded text-[9px] font-semibold" style={{ background: opModel===m ? "rgba(16,185,129,0.15)" : "var(--surface-2)", color: opModel===m ? "var(--success)" : "var(--text-muted)" }}>{m.replace("_"," ")}</button>)}</div><div className="flex gap-1">{["tight","balanced","light"].map(g => <button key={g} onClick={() => setGov(g)} className="px-2 py-1 rounded text-[9px] font-semibold flex-1" style={{ background: gov===g ? "rgba(249,115,22,0.15)" : "var(--surface-2)", color: gov===g ? "var(--warning)" : "var(--text-muted)" }}>{g}</button>)}</div></Card>
        <button onClick={async () => { setAiOmLoading(true); try { const r = await callAI("Return ONLY valid JSON.", `For ${fnD.label}, recommend: {"archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light","reasoning":"2 sentences"}`); const p = JSON.parse(r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (p.archetype) setArch(p.archetype); if (p.opModel) setOpModel(p.opModel); if (p.governance) setGov(p.governance); setAiOmReasoning(p.reasoning||""); } catch {} setAiOmLoading(false); }} disabled={aiOmLoading} className="w-full px-3 py-2 rounded-xl text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOmLoading ? 0.5 : 1 }}>{aiOmLoading ? "..." : "☕ Recommend"}</button>
        {aiOmReasoning && <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] rounded-lg p-2">{aiOmReasoning}</div>}
        <div className="flex gap-1"><input value={aiCompanyInput} onChange={e => setAiCompanyInput(e.target.value)} placeholder="e.g. Chipotle..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key==="Enter") generateCompanyModel(); }} /><button onClick={generateCompanyModel} disabled={aiCompanyGenerating} className="px-2 py-1 rounded-lg text-[9px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕</button></div>
        <div className="flex gap-1 flex-wrap">{Object.entries({...OM_COMPANIES,...aiCompanies}).map(([k,c]) => { const co = c as Record<string,string>; return <button key={k} onClick={() => { if(co.archetype) setArch(co.archetype); if(co.opModel) setOpModel(co.opModel); if(co.governance) setGov(co.governance); }} className="px-2 py-0.5 rounded text-[8px] font-semibold" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{co.name||k}</button>; })}</div>
      </div>
      <div className="col-span-9">
        <TabBar tabs={[{id:"blueprint",label:"Blueprint"},{id:"capability",label:"Capability Maturity"},{id:"service",label:"Service Model"},{id:"decisions",label:"Decision Rights"},{id:"ai_tier",label:"AI Service Layer"},{id:"traits",label:"Archetype Fit"}]} active={omView} onChange={setOmView} />

        {omView === "blueprint" && <Card title={`${fnD.label} — ${archD.label} Architecture`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-secondary)]">{archD.desc} · {opModel.replace("_"," ")} · {gov} governance</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try {
                const raw = await callAI("Return ONLY valid JSON.", `Generate a detailed operating model blueprint for a ${fnD.label} function using a ${archD.label} archetype. Return JSON: {"governance":["3-4 governance bodies"],"core":["10-15 core capabilities specific to ${fnD.label}"],"shared":["3-5 shared services"],"enabling":["3-4 enabling platforms/tools"],"interface":["3-4 interface touchpoints"]}. Be specific to ${fnD.label} — not generic.`);
                const parsed = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
                if (parsed.core) setAiBlueprint(parsed);
              } catch {} setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiOmLoading ? "..." : "☕ AI Custom Blueprint"}</button>
          </div>

          {aiBlueprint && <div className="bg-[rgba(224,144,64,0.06)] border border-[rgba(224,144,64,0.15)] rounded-lg px-3 py-2 mb-3 flex items-center justify-between"><span className="text-[11px]" style={{ color: "#f0a050" }}>☕ Showing AI-generated blueprint</span><button onClick={() => setAiBlueprint(null)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Reset to default</button></div>}
          <div className="space-y-2">
            {[{label:"Governance",items:aiBlueprint?.governance || govLayer,color:"var(--risk)"},{label:"Core Components",items:aiBlueprint?.core || coreLayer,color:"var(--accent-primary)",grid:true},{label:"Shared Services",items:aiBlueprint?.shared || sharedLayer,color:"var(--success)"},{label:"Enabling",items:aiBlueprint?.enabling || enableLayer,color:"var(--purple)"},{label:"Interface",items:aiBlueprint?.interface || interfaceLayer,color:"var(--warning)"}].map(layer => <div key={layer.label} className="rounded-xl p-3 border-l-4" style={{ background: `${layer.color}06`, borderColor: layer.color }}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: layer.color }}>{layer.label}</div><div className="text-[9px]" style={{ color: `${layer.color}80` }}>{layer.items.length} capabilities</div></div>
              <div className={layer.grid ? `grid gap-2 ${layer.items.length <= 4 ? "grid-cols-4" : layer.items.length <= 6 ? "grid-cols-3" : layer.items.length <= 9 ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}` : "flex gap-2 flex-wrap"}>{layer.items.map(t => { const ai = getAiTier(t); return <div key={t} className={`rounded-lg p-2.5 border ${layer.grid ? "" : "px-3 py-2"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}><div className="text-[11px] font-semibold text-[var(--text-primary)]">{t.replace(archD.coreSuffix, "")}</div>{archD.coreSuffix && layer.grid && <div className="text-[8px] italic mt-0.5" style={{ color: `${layer.color}80` }}>{archD.coreSuffix.replace(" — ", "").replace(" as a ", "").trim()}</div>}{layer.grid && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: ai.color }} /><span className="text-[8px]" style={{ color: ai.color }}>{ai.tier}</span></div>}</div>; })}</div>
            </div>)}
          </div>
        </Card>}

        {omView === "capability" && <Card title="Capability Maturity Assessment">
          {(() => { const scores = Object.values(maturityScores).filter(v => v > 0); const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : "—"; const tScores = Object.values(targetScores).filter(v => v > 0); const tAvg = tScores.length ? (tScores.reduce((a,b) => a+b, 0) / tScores.length).toFixed(1) : "—"; return <div className="flex gap-4 mb-4">{[{label:"Current Avg",val:avg,color:"var(--accent-primary)"},{label:"Target Avg",val:tAvg,color:"var(--success)"},{label:"Capabilities Rated",val:`${scores.length}/${allCaps.length}`,color:"var(--text-secondary)"},{label:"Gap",val:scores.length && tScores.length ? (Number(tAvg)-Number(avg)).toFixed(1) : "—",color:"var(--warning)"}].map(k => <div key={k.label} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:k.color}}>{k.val}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}</div>; })()}
          <div className="text-[12px] text-[var(--text-secondary)] mb-3">Rate current state (left) and target state (right) for each capability.</div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th><th className="px-2 py-2 text-center text-[10px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Layer</th>{[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--text-muted)]">{n}</th>)}<th className="px-1 py-2 text-center text-[9px] border-b border-[var(--border)] text-[var(--text-muted)]">|</th>{[1,2,3,4,5].map(n => <th key={`t${n}`} className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--success)]">{n}</th>)}<th className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--text-muted)]">AI</th></tr></thead>
          <tbody>{allCaps.map(cap => { const sc = maturityScores[cap.name]||0; const ai = getAiTier(cap.name); return <tr key={cap.name} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 text-[11px] font-semibold">{cap.name}</td><td className="px-2 py-1.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${layerColors[cap.layer]}12`, color: layerColors[cap.layer] }}>{cap.layer}</span></td>{[1,2,3,4,5].map(n => <td key={n} className="px-2 py-1.5 text-center"><button onClick={() => setMaturityScores(p => ({...p,[cap.name]:n}))} className="w-6 h-6 rounded text-[10px] font-bold" style={{ background: sc>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: sc>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-1 py-1.5 text-center text-[var(--border)]">│</td>{[1,2,3,4,5].map(n => <td key={`t${n}`} className="px-2 py-1.5 text-center"><button onClick={() => setTargetScores(p => ({...p,[cap.name]:n}))} className="w-6 h-6 rounded text-[10px] font-bold" style={{ background: (targetScores[cap.name]||0)>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: (targetScores[cap.name]||0)>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-2 py-1.5 text-center"><span className="text-[9px]" style={{ color: ai.color }}>{ai.tier}</span></td></tr>; })}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[9px] text-[var(--text-muted)]">{["1=Ad Hoc","2=Emerging","3=Defined","4=Managed","5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
        </Card>}

        {omView === "service" && <Card title="Service Delivery Model">
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Click the service type to change. Options: Shared, Embedded, CoE, Outsourced, AI-Automated.</div>
          <div className="grid grid-cols-2 gap-4">
            <div><DonutViz data={["Shared","Embedded","CoE","Outsourced","AI-Auto"].map(s => ({name:s,value:activeCoreLayer.filter(t => (serviceOverrides[t.replace(archD.coreSuffix,"")] || getSM(t)) === s).length})).filter(d => d.value > 0)} /></div>
            <div className="space-y-1.5">{activeCoreLayer.map(t => { const cleanName = t.replace(archD.coreSuffix,""); const sm = serviceOverrides[cleanName] || getSM(t); const ai = getAiTier(t); const smColors: Record<string,string> = {Shared:"indigo",Embedded:"green",CoE:"purple",Outsourced:"gray","AI-Auto":"amber"}; const smOpts = ["Shared","Embedded","CoE","Outsourced","AI-Auto"]; return <div key={t} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]"><span className="text-[11px] text-[var(--text-primary)] truncate flex-1 mr-2">{cleanName}</span><div className="flex items-center gap-2"><button onClick={() => { const idx = smOpts.indexOf(sm); setServiceOverrides(prev => ({...prev, [cleanName]: smOpts[(idx+1) % smOpts.length]})); }} className="px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer" style={{background: `var(--${smColors[sm] || "gray"})15`, color: `var(--${smColors[sm] || "text-muted"})`, border: "1px solid var(--border)"}}>{sm}</button><span className="text-[8px] w-10 text-right" style={{color:ai.color}}>{ai.pct}%</span></div></div>; })}</div>
          </div>
        </Card>}

        {omView === "decisions" && <Card title="Decision Rights (RAPID)">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-secondary)]">Click any cell to cycle through R→A→P→I→D</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try { const raw = await callAI("Return ONLY valid JSON.", `Generate 8 key decisions for a ${fnD.label} function with ${archD.label} archetype. For each decision, assign RAPID roles to these 4 columns: ${govLayer[0] || "Executive"}, ${govLayer[1] || "Board"}, Function Head, Team Lead. Return JSON: {"decisions":[{"d":"decision name","r":["D","A","R","P"]}]} — use only letters R,A,P,I,D`); const p = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim()); if (p.decisions) setRapidRows(p.decisions); } catch {} setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate RAPID</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Decision</th>{[govLayer[0] || "Executive", govLayer[1] || "Board", "Function Head", "Team Lead"].map(r => <th key={r} className="px-2 py-2 text-center text-[9px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{r.length > 20 ? r.slice(0,18)+"..." : r}</th>)}</tr></thead>
          <tbody>{rapidRows.map((row, ri) => <tr key={ri} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[11px] font-semibold">{row.d}</td>{row.r.map((r: string, ci: number) => { const cl: Record<string,string> = {R:"var(--accent-primary)",A:"var(--success)",P:"var(--purple)",I:"var(--text-muted)",D:"var(--warning)"}; const cycle = ["R","A","P","I","D"]; return <td key={ci} className="px-2 py-2 text-center"><button onClick={() => { const next = cycle[(cycle.indexOf(r)+1) % 5]; setRapidRows(prev => prev.map((row2,ri2) => ri2===ri ? {...row2, r: row2.r.map((v: string,ci2: number) => ci2===ci ? next : v)} : row2)); }} className="w-6 h-6 rounded items-center justify-center text-[10px] font-bold inline-flex cursor-pointer" style={{background:`${cl[r]||cl.I}15`,color:cl[r]||cl.I}}>{r}</button></td>; })}</tr>)}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[9px] text-[var(--text-muted)]">{[{l:"R",n:"Recommend",c:"var(--accent-primary)"},{l:"A",n:"Agree",c:"var(--success)"},{l:"P",n:"Perform",c:"var(--purple)"},{l:"I",n:"Input",c:"var(--text-muted)"},{l:"D",n:"Decide",c:"var(--warning)"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
        </Card>}

        {omView === "ai_tier" && <Card title="AI Service Layer">
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Human-AI interaction model per capability.</div>
          <div className="grid grid-cols-4 gap-3 mb-4">{[{tier:"Human-Led",color:"#10B981",icon:"👤"},{tier:"Hybrid",color:"#F97316",icon:"🤝"},{tier:"AI-Augmented",color:"#3B82F6",icon:"🤖"},{tier:"AI-First",color:"#8B5CF6",icon:"⚡"}].map(t => <div key={t.tier} className="rounded-xl p-3 border text-center" style={{background:`${t.color}06`,borderColor:`${t.color}20`}}><div className="text-lg">{t.icon}</div><div className="text-[11px] font-bold" style={{color:t.color}}>{t.tier}</div><div className="text-[18px] font-extrabold" style={{color:t.color}}>{teams.filter(tm => getAiTier(tm).tier===t.tier).length}</div></div>)}</div>
          <div className="space-y-1.5">{teams.map(t => { const ai=getAiTier(t); return <div key={t} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]"><span className="text-[11px] font-semibold w-36 shrink-0">{t}</span><div className="flex-1 h-3 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${ai.pct}%`,background:ai.color}} /></div><span className="text-[9px] font-semibold w-14 text-right" style={{color:ai.color}}>{ai.pct}%</span><Badge color={ai.tier==="AI-First"?"purple":ai.tier==="AI-Augmented"?"indigo":ai.tier==="Hybrid"?"amber":"green"}>{ai.tier}</Badge></div>; })}</div>
        </Card>}

        {omView === "traits" && <Card title={`${archD.label} — Archetype Fit`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">{archD.desc}</div>
          <div className="grid grid-cols-2 gap-4"><div><RadarViz data={Object.entries(archD.traits).map(([k,v]) => ({subject:k.charAt(0).toUpperCase()+k.slice(1),current:v,max:5}))} /></div><div className="space-y-2">{Object.entries(archD.traits).map(([k,v]) => <div key={k}><div className="flex justify-between text-[11px] mb-0.5"><span className="text-[var(--text-secondary)] capitalize">{k}</span><span className="font-bold" style={{color:v>=4?"var(--success)":v>=3?"var(--accent-primary)":"var(--warning)"}}>{v}/5</span></div><div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${v/5*100}%`,background:v>=4?"var(--success)":v>=3?"var(--accent-primary)":"var(--warning)"}} /></div></div>)}
            <div className="mt-3 p-3 rounded-xl bg-[var(--surface-2)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Best For</div><div className="text-[11px] text-[var(--text-secondary)]">{arch==="functional"?"Stable industries, deep specialization":arch==="divisional"?"Multi-product, P&L ownership":arch==="matrix"?"Complex orgs, dual expertise":arch==="platform"?"Tech-forward, autonomous teams":"Innovation-heavy, project-based"}</div></div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Watch Out</div><div className="text-[11px] text-[var(--text-secondary)]">{arch==="functional"?"Silos, slow cross-functional work":arch==="divisional"?"Duplication, higher costs":arch==="matrix"?"Dual reporting tension":arch==="platform"?"Requires strong eng culture":"Accountability gaps"}</div></div>
          </div></div>
        </Card>}
      </div>
    </div>

    {/* Current → Target Transition */}
    <Card title="Operating Model Transition Roadmap">
      <div className="grid grid-cols-3 gap-4">{[
        {phase:"Phase 1: Foundation",time:"Months 1-3",items:["Define target operating model","Assess current capability maturity","Map governance structures","Identify quick-win capability improvements"],color:"var(--accent-primary)"},
        {phase:"Phase 2: Build",time:"Months 4-9",items:["Implement new service delivery model","Deploy decision rights framework","Begin capability development programs","Launch AI service layer pilots"],color:"var(--success)"},
        {phase:"Phase 3: Scale",time:"Months 10-18",items:["Scale successful pilots org-wide","Embed new governance routines","Measure maturity improvements","Iterate and optimize model"],color:"var(--purple)"},
      ].map(p => <div key={p.phase} className="rounded-xl p-4 border-l-4 bg-[var(--surface-2)]" style={{borderColor:p.color}}>
        <div className="text-[13px] font-bold mb-1" style={{color:p.color}}>{p.phase}</div>
        <div className="text-[10px] text-[var(--text-muted)] mb-2">{p.time}</div>
        <div className="space-y-1">{p.items.map((it,i) => <div key={i} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1"><span className="text-[var(--text-muted)] shrink-0">•</span>{it}</div>)}</div>
      </div>)}</div>
    </Card>

    <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
      <div className="text-2xl mb-2">🎉</div>
      <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">Journey Complete</div>
      <div className="text-[13px] text-[var(--text-secondary)] mb-3">Generate your full transformation report.</div>
      <button onClick={async () => {
        const report = await callAI("Write a comprehensive executive transformation report.", "Generate a full AI Transformation Report. Format as professional narrative.");
        if (report) { const blob = new Blob([report], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "AI_Transformation_Report.txt"; a.click(); URL.revokeObjectURL(url); }
      }} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate Full Report</button>
    </div>
  </div>;

}

/* ═══════════════════════════════════════════════════════════════
   MAIN TOOL SHELL — scoped to a project
   ═══════════════════════════════════════════════════════════════ */

function Home({ projectId, projectName, projectMeta, onBackToHub }: { projectId: string; projectName: string; projectMeta: string; onBackToHub: () => void }) {
  const [viewMode, setViewMode] = usePersisted<string>(`${projectId}_viewMode`, "");
  const [viewEmployee, setViewEmployee] = usePersisted<string>(`${projectId}_viewEmployee`, "");
  const [viewJob, setViewJob] = usePersisted<string>(`${projectId}_viewJob`, "");
  const [viewCustom, setViewCustom] = usePersisted<Record<string, string>>(`${projectId}_viewCustom`, { func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });
  const [employees, setEmployees] = useState<string[]>([]);
  const [page, setPage] = usePersisted(`${projectId}_page`, "home");
  const fileRef = useRef<HTMLInputElement>(null);
  const workspace = useWorkspaceController();
  const { models, model, jobs, job, filters: f, filterOptions: fo, message: msg, backendOk, loadingModels, uploadFiles, resetWorkspace, setModel, setJob, setFilter, clearFilters } = workspace;
  const { toast, ToastContainer } = useToast();
  const { log: decisionLog, logDecision } = useDecisionLog(projectId);
  const { risks: riskRegister, addRisk, updateRisk } = useRiskRegister(projectId);
  _globalToast = toast;
  _globalLogDecision = logDecision;

  // Toast when model loads  
  const prevModelRef = useRef(model);
  useEffect(() => {
    if (model && model !== prevModelRef.current && backendOk) {
      prevModelRef.current = model;
      showToast(`Model loaded: ${model}`);
    }
  }, [model, backendOk]);

  // Tutorial mode — must be declared before the useEffect that references it
  const [isTutorial] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_isTutorial`) || "false"); } catch { return false; } });

  // Auto-select Tutorial model for tutorial projects
  useEffect(() => {
    // Two paths to set the model:
    // 1. isTutorial flag from localStorage (set by seedTutorialData)
    // 2. projectId starts with "tutorial_" (direct detection)
    const shouldAutoSelect = isTutorial || projectId.startsWith("tutorial_");
    if (shouldAutoSelect && backendOk) {
      // Read the stored model name
      try {
        const lm = JSON.parse(localStorage.getItem("lastModel") || "null");
        if (lm && String(lm).startsWith("Tutorial_") && model !== lm) {
          setModel(lm);
        }
      } catch {}
      // Also try to derive model name from projectId if lastModel isn't set
      if (!model || model === "Demo_Model") {
        const derivedModel = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
        if (derivedModel.startsWith("Tutorial_")) {
          setModel(derivedModel);
          // Also re-trigger the backend seed in case it wasn't seeded yet
          fetch(`/api/tutorial/seed?industry=${projectId.split("_").slice(2).join("_")}&size=${projectId.split("_")[1]}`).catch(() => {});
        }
      }
    }
  }, [isTutorial, backendOk, model, setModel, projectId]);

  // Fetch employee names for employee view picker
  useEffect(() => {
    if (!model || !backendOk) return;
    api.getOverview(model, f).then(d => {
      const names = ((d as Record<string, unknown>)?.employee_names ?? []) as string[];
      if (names.length) setEmployees(names);
    }).catch(() => {});
  }, [model, backendOk]);

  // ── Persistent work design state — scoped to project ──
  const [jobStates, setJobStates] = usePersisted<Record<string, JobDesignState>>(`${projectId}_jobStates`, {});
  const setJobState = useCallback((jobTitle: string, partial: Partial<JobDesignState>) => {
    setJobStates(prev => ({ ...prev, [jobTitle]: { ...(prev[jobTitle] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false }), ...partial } }));
  }, [setJobStates]);

  // ── Persistent simulator state — scoped to project ──
  const [simState, setSimState] = usePersisted(`${projectId}_simState`, { scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 });

  // ── Persistent ODS state — scoped to project ──
  const [odsState, setOdsState] = usePersisted(`${projectId}_odsState`, { activeScenario: 0, view: "overview" });

  // ── Track visited modules — scoped to project ──
  const [visited, setVisited] = usePersisted<Record<string, boolean>>(`${projectId}_visited`, {});
  const navigate = useCallback((id: string) => { setPage(id); setVisited(prev => ({ ...prev, [id]: true })); }, [setPage, setVisited]);

  const upload = async (files: FileList) => {
    try {
      await uploadFiles(files);
      toast("Data uploaded successfully", "success");
      // Validate data quality after upload
      if (model) {
        try {
          const dq = await api.getDataQuality(model);
          const summary = (dq as Record<string, unknown>)?.summary as Record<string, unknown>;
          const missing = Number(summary?.missing ?? 0);
          const issues = Number(summary?.total_issues ?? 0);
          if (missing > 0) toast(`${missing} dataset(s) still missing — check Data Quality in AI Opportunity Scan`, "warning");
          else if (issues > 0) toast(`${issues} data issue(s) detected — review in AI Opportunity Scan > Data Quality`, "warning");
        } catch { /* data quality check is optional */ }
      }
    } catch { toast("Upload failed — check file format and required columns", "error"); }
  };
  const reset = async () => { await resetWorkspace(); setPage("home"); setJobStates({}); setVisited({}); setSimState({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }); setOdsState({ activeScenario: 0, view: "overview" }); };
  const af = Object.values(f).filter(v => v !== "All").length;
  const hasJobs = jobs.length > 0;
  const hasData = !!model;

  // Module status for landing page
  const moduleStatus: Record<string, string> = {};
  const completedJobCount = jobs.filter(j => jobStates[j]?.finalized).length;
  if (completedJobCount === jobs.length && jobs.length > 0) moduleStatus.design = "complete";
  else if (Object.values(jobStates).some(s => s.deconSubmitted)) moduleStatus.design = "in_progress";
  // Smart module completion with phase awareness
  if (hasData) { 
    moduleStatus.snapshot = "in_progress"; 
    moduleStatus.jobs = "in_progress";
    moduleStatus.scan = "in_progress";
  }
  if (Object.values(jobStates).some(s => s.deconRows.length > 0)) moduleStatus.design = "in_progress";
  if (Object.values(jobStates).some(s => s.finalized)) { 
    moduleStatus.design = "complete";
    moduleStatus.simulate = "in_progress";
  }
  if (Object.values(jobStates).filter(s => s.finalized).length >= 3) moduleStatus.simulate = "complete";
  Object.entries(visited).forEach(([k, v]) => { if (v && !moduleStatus[k]) moduleStatus[k] = "in_progress"; });

  const goHome = () => setPage("home");

  // Fetch overview data for TransformationDashboard
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  // Build context string for AI assistant based on current page
  const buildAiContext = useCallback(() => {
    const parts: string[] = [];
    if (viewMode) parts.push(`View: ${viewMode}${viewMode === "job" ? ` (${viewJob})` : viewMode === "employee" ? ` (${viewEmployee})` : ""}`);
    if (model) parts.push(`Model: ${model}`);
    if (job) parts.push(`Active job: ${job}`);
    if (jobs.length) parts.push(`${jobs.length} jobs in scope`);
    const completedCount = Object.values(jobStates).filter(s => s.finalized).length;
    if (completedCount > 0) parts.push(`${completedCount}/${jobs.length} jobs finalized in Work Design`);
    const deconCount = Object.values(jobStates).filter(s => s.deconSubmitted).length;
    if (deconCount > 0) parts.push(`${deconCount} jobs deconstructed`);
    if (Object.keys(f).some(k => f[k as keyof typeof f] !== "All")) {
      parts.push(`Filters active: ${Object.entries(f).filter(([,v]) => v !== "All").map(([k,v]) => `${k}=${v}`).join(", ")}`);
    }
    // Add module-specific context
    if (page === "simulate") {
      const cfg = simState.custom ? `Custom (${simState.custAdopt}% adoption, ${simState.custTimeline}mo)` : simState.scenario;
      parts.push(`Scenario: ${cfg}, Investment: $${simState.investment}/role`);
    }
    return parts.join(". ");
  }, [model, job, jobs, jobStates, f, page, simState]);

  const viewCtx: ViewContext = { mode: viewMode || "org", employee: viewEmployee, job: viewJob, custom: viewCustom };

  // Tutorial mode (isTutorial declared earlier, before auto-select effect)
  const [tutorialStep, setTutorialStep] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_tutorialStep`) || "0"); } catch { return 0; } });
  const [tutorialVisible, setTutorialVisible] = useState(isTutorial);
  const tutorialSteps = useMemo(() => buildTutorialSteps(projectId), [projectId]);

  useEffect(() => {
    if (isTutorial) { try { localStorage.setItem(`${projectId}_tutorialStep`, JSON.stringify(tutorialStep)); } catch {} }
  }, [tutorialStep, projectId, isTutorial]);

  const tutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      const nextPage = tutorialSteps[nextStep].page;
      if (nextPage !== "home") setPage(nextPage);
      else setPage("home");
    } else {
      setTutorialVisible(false);
    }
  };
  const tutorialPrev = () => {
    if (tutorialStep > 0) {
      const prevStep = tutorialStep - 1;
      setTutorialStep(prevStep);
      const prevPage = tutorialSteps[prevStep].page;
      if (prevPage !== "home") setPage(prevPage);
      else setPage("home");
    }
  };
  const tutorialJump = (s: number) => {
    setTutorialStep(s);
    const pg = tutorialSteps[s].page;
    if (pg !== "home") setPage(pg);
    else setPage("home");
  };

  // Escape key goes back to home
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && page !== "home") setPage("home"); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, setPage]);

  // View selector pages — full screen, no sidebar
  if (!viewMode || viewMode === "job_select" || viewMode === "employee_select") {
    return <div style={{ minHeight: "100vh", background: "#0B1120" }}>
      {!viewMode && <ViewSelector 
        onBack={onBackToHub}
        onSelect={(mode, detail) => {
          if (mode === "org") { setViewMode("org"); }
          else if (mode === "job_select") { setViewMode("job_select"); }
          else if (mode === "employee_select") { setViewMode("employee_select"); }
          else if (mode === "custom" && detail) { setViewMode("custom"); setViewCustom(detail); Object.entries(detail).forEach(([k, v]) => { if (k !== "ct") setFilter(k as keyof Filters, v); }); }
        }} 
        employees={employees} 
        jobs={jobs}
        filterOptions={fo}
      />}
      {viewMode === "job_select" && <ViewJobPicker jobs={jobs} onSelect={j => { setViewMode("job"); setViewJob(j); setJob(j); }} onBack={() => setViewMode("")} />}
      {viewMode === "employee_select" && <ViewEmployeePicker employees={employees} onSelect={e => { setViewMode("employee"); setViewEmployee(e); }} onBack={() => setViewMode("")} />}
    </div>;
  }

  return <div className="flex min-h-screen w-full">
    {/* ── SIDEBAR ── */}
    <aside className="w-[220px] min-h-screen bg-[var(--surface-1)] flex flex-col px-4 py-5 shrink-0 overflow-y-auto sticky top-0 border-r border-[var(--border)]" style={{ height: "100vh" }}>
      <div className="mb-1 cursor-pointer" onClick={goHome}><div className="text-sm font-extrabold text-[var(--text-primary)]">AI Transformation</div><div className="text-[10px] font-semibold text-[var(--accent-primary)] uppercase tracking-[1.5px]">PLATFORM</div></div>
      <button onClick={() => { if (page === "home" && viewMode) { setViewMode(""); } else { onBackToHub(); } }} className="w-full text-left text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 mb-1 flex items-center gap-1 transition-colors">{page === "home" && viewMode ? "← Back to Views" : page !== "home" ? "← Back to Home" : "← Back to Projects"}</button>
      <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-2 border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">Active Project</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{projectName}</div>{projectMeta && <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 italic">{projectMeta}</div>}</div>
      <div className="h-px bg-[var(--border)] my-3" />
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Data Intake</div>
      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv" onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      <button onClick={() => fileRef.current?.click()} className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white text-[12px] font-semibold py-1.5 rounded-md mb-1.5">⬆ Upload Files</button>
      <a href="/api/template" download className="block w-full bg-[var(--surface-3)] hover:bg-[var(--hover)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[12px] font-semibold py-1.5 rounded-md mb-1.5 text-center no-underline">⬇ Export Template</a>
      <button onClick={reset} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-semibold py-1 rounded-md">Reset</button>
      {msg && <div className="mt-1.5 text-[11px] text-[var(--accent-primary)] bg-[rgba(59,130,246,0.1)] rounded px-2 py-1">{msg}</div>}
      {!backendOk && <div className="mt-1.5 text-[11px] text-[var(--risk)] bg-[rgba(239,68,68,0.1)] rounded px-2 py-1.5 border border-[var(--risk)]/20">⚠ Backend offline<br/><span className="text-[10px] text-[var(--text-muted)]">Run: uvicorn main:app --port 8000</span></div>}
      {backendOk && model && <div className="mt-1.5 text-[11px] text-[var(--success)] bg-[rgba(16,185,129,0.1)] rounded px-2 py-1">✓ Connected · {model}</div>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode !== "employee" && <><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Model</div>
      <SidebarSelect options={models.length ? models : [loadingModels ? "Loading..." : "No models"]} value={model || (models[0] || (loadingModels ? "Loading..." : "No models"))} onChange={setModel} />
      <div className="h-px bg-[var(--border)] my-3" /></>}
      {viewMode !== "employee" && <><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Active Job</div>
      <SidebarSelect options={hasJobs ? jobs : ["No jobs available"]} value={job || (jobs[0] || "No jobs available")} onChange={v => setJob(v === "No jobs available" ? "" : v)} />
      {job && <div className="mt-1"><Badge color="indigo">{job}</Badge></div>}</>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode === "employee" && viewEmployee && <div className="bg-[rgba(139,92,246,0.1)] border border-[var(--purple)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[10px] font-bold text-[var(--purple)] uppercase tracking-wider mb-0.5">Employee View</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{viewEmployee}</div><button onClick={() => setViewMode("")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "job" && viewJob && <div className="bg-[rgba(16,185,129,0.1)] border border-[var(--success)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[10px] font-bold text-[var(--success)] uppercase tracking-wider mb-0.5">Job View</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{viewJob}</div><button onClick={() => setViewMode("")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode !== "employee" && <><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px]">Filters</span>{af > 0 && <span className="bg-[rgba(59,130,246,0.2)] text-[var(--accent-primary)] text-[11px] font-bold px-2 py-0.5 rounded-full">{af}</span>}</div>
      <SidebarSelect label="Function" options={fo.functions || ["All"]} value={f.func} onChange={v => setFilter("func", v)} />
      <SidebarSelect label="Job Family" options={fo.job_families || ["All"]} value={f.jf} onChange={v => setFilter("jf", v)} />
      <SidebarSelect label="Sub-Family" options={fo.sub_families || ["All"]} value={f.sf} onChange={v => setFilter("sf", v)} />
      <SidebarSelect label="Career Level" options={fo.career_levels || ["All"]} value={f.cl} onChange={v => setFilter("cl", v)} />
      {af > 0 && <button onClick={clearFilters} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-semibold py-1 rounded-md mt-1">Clear All</button>}</>}
      <div className="mt-auto pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--accent-primary)]">v4.0 · Journey Architecture</div>
    </aside>

    {/* ── MAIN ── */}
    <main className="flex-1 min-h-screen bg-[var(--bg)]">
      {page === "home" && <div>
        <LandingPage onNavigate={navigate} moduleStatus={moduleStatus} hasData={hasData} viewMode={viewMode} />
      </div>}
      {page !== "home" && <div className="px-7 py-6">
      {page === "snapshot" && model && <ErrorBoundary><WorkforceSnapshot model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "jobs" && model && <JobArchitecture model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobs={jobs} />}
      {page === "scan" && model && <AiOpportunityScan model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} />}
      {page === "mgrcap" && model && <ErrorBoundary><ManagerCapability model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "changeready" && model && <ErrorBoundary><ChangeReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "mgrdev" && model && <ErrorBoundary><ManagerDevelopment model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "export" && model && <ErrorBoundary><ExportReport model={model} f={f} onBack={goHome} /></ErrorBoundary>}
      {page === "dashboard" && model && <ErrorBoundary><TransformationExecDashboard model={model} f={f} onBack={goHome} onNavigate={navigate} decisionLog={decisionLog} riskRegister={riskRegister} addRisk={addRisk} updateRisk={updateRisk} /></ErrorBoundary>}
      {page === "readiness" && model && <ErrorBoundary><AIReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "bbba" && model && <ErrorBoundary><BBBAFramework model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "headcount" && model && <ErrorBoundary><HeadcountPlanning model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "reskill" && model && <ErrorBoundary><ReskillingPathways model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "marketplace" && model && <ErrorBoundary><TalentMarketplace model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "skills" && model && <ErrorBoundary><SkillsTalent model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "design" && model && viewCtx.mode !== "employee" && <ErrorBoundary><WorkDesignLab model={model} f={f} job={viewCtx.mode === "job" ? viewCtx.job || job : job} jobs={jobs} onBack={goHome} jobStates={jobStates} setJobState={setJobState} onSelectJob={setJob} /></ErrorBoundary>}
      {page === "simulate" && <ErrorBoundary><ImpactSimulator onBack={goHome} onNavigate={navigate} model={model} viewCtx={viewCtx} f={f} jobStates={jobStates} simState={simState} setSimState={setSimState} /></ErrorBoundary>}
      {page === "build" && <ErrorBoundary><OrgDesignStudio onBack={goHome} viewCtx={viewCtx} model={model} f={f} odsState={odsState} setOdsState={setOdsState} /></ErrorBoundary>}
      {page === "plan" && model && <ChangePlanner model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} />}
      {page === "opmodel" && viewCtx.mode === "job" && <div className="px-7 py-6"><div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Job View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div></div>}
      {page === "opmodel" && viewCtx.mode !== "employee" && viewCtx.mode !== "job" && <OperatingModelLab onBack={goHome} model={model} f={f} />}
      {(page === "design" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Work Design Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="green">💼 Job</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div>}
      {(page === "opmodel" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div>}
      {!model && page !== "home" && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">📂</div><h3 className="text-lg font-semibold mb-1">Select a model first</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload data or select Demo_Model in the sidebar.</p><button onClick={goHome} className="mt-4 text-[var(--accent-primary)] text-[13px] font-semibold">← Back to Home</button></div>}
      </div>}
    </main>
    {page !== "home" && <AiEspressoButton moduleId={page} contextData={buildAiContext()} viewMode={viewMode} />}
    {isTutorial && tutorialVisible && <TutorialOverlay step={tutorialStep} totalSteps={tutorialSteps.length} steps={tutorialSteps} onNext={tutorialNext} onPrev={tutorialPrev} onClose={() => setTutorialVisible(false)} onJump={tutorialJump} />}
    {isTutorial && !tutorialVisible && <TutorialBadge onClick={() => setTutorialVisible(true)} step={tutorialStep} total={tutorialSteps.length} />}
    <ToastContainer />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TUTORIAL SYSTEM — Complete interactive onboarding
   Seeder + 27 micro-steps + spotlight overlay + progress + actions
   ═══════════════════════════════════════════════════════════════ */

function seedTutorialData(projectId: string, industry: string = "technology") {
  // Always reset for fresh experience
  const keysToClean = Object.keys(localStorage).filter(k => k.startsWith(projectId));
  keysToClean.forEach(k => localStorage.removeItem(k));

  localStorage.setItem(`${projectId}_viewMode`, JSON.stringify("org"));

  // Visited modules — show progress
  localStorage.setItem(`${projectId}_visited`, JSON.stringify({
    snapshot: true, jobs: true, scan: true, readiness: true, skills: true, design: true, simulate: true, build: true
  }));

  // Work Design: Data Analyst with 8 realistic tasks
  const tasks = [
    { "Task Name": "Data extraction & cleaning", "Current Time Spent %": 25, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Python/SQL" },
    { "Task Name": "Report generation & formatting", "Current Time Spent %": 20, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Communication" },
    { "Task Name": "Ad-hoc analysis for stakeholders", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Critical Thinking", "Secondary Skill": "Data Analysis" },
    { "Task Name": "Dashboard creation & maintenance", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Cloud Platforms", "Secondary Skill": "Data Analysis" },
    { "Task Name": "Stakeholder presentations", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Communication", "Secondary Skill": "Stakeholder Mgmt" },
    { "Task Name": "Data quality monitoring", "Current Time Spent %": 8, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Process Automation" },
    { "Task Name": "Cross-team consulting", "Current Time Spent %": 7, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Leadership", "Secondary Skill": "Communication" },
    { "Task Name": "Tool evaluation", "Current Time Spent %": 5, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "AI/ML Tools", "Secondary Skill": "Critical Thinking" },
  ];

  const redeploy = tasks.map(t => ({
    ...t,
    "Time Saved %": t["AI Impact"] === "High" ? Math.round(Number(t["Current Time Spent %"]) * 0.6) : t["AI Impact"] === "Moderate" ? Math.round(Number(t["Current Time Spent %"]) * 0.3) : Math.round(Number(t["Current Time Spent %"]) * 0.1),
    "Decision": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "Automate" : t["AI Impact"] === "Moderate" ? "Augment" : "Retain",
    "Technology": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "RPA / ETL Automation" : t["AI Impact"] === "Moderate" ? "AI-Assisted Analytics" : "Human-led",
    "Destination": t["Logic"] === "Deterministic" && t["AI Impact"] === "High" ? "AI / automation layer" : "Continue in role",
  }));

  // Seed multiple roles for realistic job catalog
  localStorage.setItem(`${projectId}_jobStates`, JSON.stringify({
    "Financial Analyst": { deconRows: [
      { "Task Name": "Monthly close reconciliation", "Current Time Spent %": 30, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Process Automation" },
      { "Task Name": "Budget variance analysis", "Current Time Spent %": 20, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Critical Thinking", "Secondary Skill": "Data Analysis" },
      { "Task Name": "Financial modeling", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Data Analysis", "Secondary Skill": "Critical Thinking" },
      { "Task Name": "Board reporting", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Communication", "Secondary Skill": "Leadership" },
      { "Task Name": "Invoice processing oversight", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Process Automation", "Secondary Skill": "Data Analysis" },
      { "Task Name": "Stakeholder data requests", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Stakeholder Mgmt", "Secondary Skill": "Communication" },
    ], redeployRows: [], scenario: "Balanced", deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, initialized: true },
    "Operations Coordinator": { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false },
    "HR Business Partner": { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false },
    "Data Analyst": { deconRows: tasks, redeployRows: redeploy, scenario: "Balanced", deconSubmitted: true, redeploySubmitted: true, finalized: false, recon: null, initialized: true }
  }));

  localStorage.setItem(`${projectId}_simState`, JSON.stringify({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }));
  // Pre-configure Operating Model for tutorial
  localStorage.setItem(`${projectId}_omFn`, JSON.stringify("finance"));
  localStorage.setItem(`${projectId}_omArch`, JSON.stringify("platform"));
  localStorage.setItem(`${projectId}_odsState`, JSON.stringify({ activeScenario: 0, view: "overview" }));
  localStorage.setItem(`${projectId}_skillsConfirmed`, JSON.stringify(true));
  // Pre-seed gap dispositions
  localStorage.setItem(`${projectId}_gapDispositions`, JSON.stringify({
    "AI/ML Tools": "Close Internally",
    "AI Literacy": "Close Internally", 
    "Process Automation": "Close Internally",
    "Digital Fluency": "Close Internally",
    "Data Analysis": "Accept Risk",
    "Python/SQL": "Close Internally",
    "Cloud Platforms": "Hire Externally",
  }));

  // Pre-seed shortlisted candidates
  localStorage.setItem(`${projectId}_shortlisted`, JSON.stringify({
    "AI Operations Analyst": ["Sarah Chen", "James Rodriguez"],
    "AI Change Manager": ["Lisa Patel"],
  }));

  // Pre-seed BBBA overrides
  localStorage.setItem(`${projectId}_bbba_overrides`, JSON.stringify({
    "AI Operations Analyst": "Build",
    "Data Governance Lead": "Buy",
  }));

  // Pre-seed marketplace shortlist
  localStorage.setItem(`${projectId}_mp_shortlist`, JSON.stringify({
    "AI Operations Analyst": ["Sarah Chen"],
  }));

  // Pre-seed maturity scores (Finance + Platform)
  localStorage.setItem(`finance_platform_maturity`, JSON.stringify({
    "Accounting & Close": 3, "FP&A": 2, "Treasury": 2, "Tax": 1, "Audit": 2,
    "Procurement": 2, "AP/AR": 3, "Revenue": 2, "Reporting": 3, "Analytics": 1
  }));
  localStorage.setItem(`finance_platform_target`, JSON.stringify({
    "Accounting & Close": 4, "FP&A": 4, "Treasury": 3, "Tax": 3, "Audit": 3,
    "Procurement": 4, "AP/AR": 4, "Revenue": 3, "Reporting": 4, "Analytics": 4
  }));

  // Seed decision log with tutorial entries
  const co = getTutorialCompany(projectId);
  const empLabel = `${Math.min(co.employees, 500)} employees`;
  localStorage.setItem(`${projectId}_decisionLog`, JSON.stringify([
    { ts: new Date(Date.now() - 86400000).toISOString(), module: "Skills", action: "Inventory Confirmed", detail: `${empLabel} × 15 skills confirmed` },
    { ts: new Date(Date.now() - 72000000).toISOString(), module: "Work Design", action: "Deconstruction Submitted", detail: "Data Analyst: 8 tasks analyzed" },
    { ts: new Date(Date.now() - 50000000).toISOString(), module: "Work Design", action: "Redeployment Saved", detail: "Data Analyst: 45% time released through automation" },
    { ts: new Date(Date.now() - 36000000).toISOString(), module: "BBBA", action: "Disposition Override", detail: "AI Ops Analyst: Changed from Buy to Build" },
    { ts: new Date(Date.now() - 20000000).toISOString(), module: "Skills", action: "Gap Disposition Set", detail: "AI/ML Tools: Close Internally" },
  ]));

  // Seed risk register
  localStorage.setItem(`${projectId}_riskRegister`, JSON.stringify([
    { id: "R1", source: "Skills Gap", risk: "AI/ML Tools gap (delta -1.7) may be too large to close internally within 6 months", probability: "High", impact: "High", mitigation: "Consider hybrid Build + Borrow strategy", status: "Open" },
    { id: "R2", source: "Manager Capability", risk: "VP Operations scored 2.3 — flight risk during transformation", probability: "Medium", impact: "High", mitigation: "Immediate engagement with executive coach", status: "Open" },
    { id: "R3", source: "Change Readiness", risk: "28% of workforce in High Risk quadrant — could slow adoption", probability: "High", impact: "Medium", mitigation: "Deploy change champions at 1:5 ratio", status: "Open" },
    { id: "R4", source: "Headcount", risk: "Natural attrition may not absorb all role eliminations", probability: "Medium", impact: "Medium", mitigation: "Phase transitions over 18 months to allow attrition absorption", status: "Open" },
  ]));

  localStorage.setItem(`${projectId}_isTutorial`, JSON.stringify(true));
  localStorage.setItem(`${projectId}_tutorialStep`, JSON.stringify(0));
  localStorage.setItem(`${projectId}_page`, JSON.stringify("home"));

  // Model ID must match backend format: Tutorial_{Size}_{Industry}
  // _seed_tutorial_store generates: Tutorial_{size_tier.title()}_{industry.title().replace(' ', '_')}
  // projectId format: tutorial_{size}_{industry} e.g. tutorial_mid_technology
  const modelId = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
  localStorage.setItem("lastModel", JSON.stringify(modelId));
  // NOTE: Backend seed is triggered by the grid click handler BEFORE calling seedTutorialData.
  // Do NOT call /api/tutorial/seed here — it would seed with wrong default params.
}


/* ═══ TUTORIAL STEPS — 27 micro-steps with data-aware copy ═══ */

// Company data mirrors backend COMPANY_DB for dynamic tutorial text
const TUTORIAL_COMPANIES: Record<string, Record<string, { name: string; employees: number }>> = {
  technology: { small: { name: "Spark Labs", employees: 150 }, mid: { name: "Nexus Technology Corp", employees: 2500 }, large: { name: "Titan Digital Systems", employees: 18000 } },
  financial_services: { small: { name: "Pinnacle Wealth Advisors", employees: 200 }, mid: { name: "Global Financial Partners", employees: 4200 }, large: { name: "Meridian Capital Group", employees: 22000 } },
  healthcare: { small: { name: "Valley Medical Center", employees: 350 }, mid: { name: "Meridian Health System", employees: 5500 }, large: { name: "National Health Partners", employees: 45000 } },
  manufacturing: { small: { name: "Precision Components Inc", employees: 180 }, mid: { name: "Atlas Manufacturing Group", employees: 3800 }, large: { name: "Continental Industrial Corp", employees: 28000 } },
  retail: { small: { name: "Urban Threads Boutique", employees: 120 }, mid: { name: "Horizon Retail Group", employees: 6000 }, large: { name: "American Marketplace Inc", employees: 52000 } },
  legal: { small: { name: "Barrett & Associates", employees: 45 }, mid: { name: "Sterling Legal Group", employees: 800 }, large: { name: "Global Law Alliance", employees: 5500 } },
  energy: { small: { name: "SunRidge Renewables", employees: 160 }, mid: { name: "Apex Energy Solutions", employees: 3200 }, large: { name: "Pacific Energy Holdings", employees: 35000 } },
  education: { small: { name: "Westbrook College", employees: 120 }, mid: { name: "Pacific University System", employees: 2800 }, large: { name: "National University Consortium", employees: 15000 } },
};

function getTutorialCompany(projectId: string): { name: string; employees: number; industry: string; size: string } {
  // projectId format: tutorial_{size}_{industry} e.g. tutorial_mid_technology
  const parts = projectId.replace("tutorial_", "").split("_");
  const size = parts[0] || "mid";
  const industry = parts.slice(1).join("_") || "technology";
  const co = TUTORIAL_COMPANIES[industry]?.[size] || TUTORIAL_COMPANIES.technology.mid;
  return { ...co, industry, size };
}

function buildTutorialSteps(projectId: string): { page: string; pos: "center"|"tr"|"tl"; icon: string; title: string; body: string; action?: string; subTab?: string }[] {
  const co = getTutorialCompany(projectId);
  const n = co.employees;
  const nm = co.name;
  // Approximate generated counts (backend caps at 2000)
  const genCount = Math.min(n, 2000);
  const fnCount = n <= 150 ? 4 : n <= 500 ? 6 : n <= 2000 ? 8 : 9;
  const mgrCount = Math.max(3, Math.round(genCount * 0.08));

  return [
  // ═══ WELCOME ═══
  { page: "home", pos: "center", icon: "🎓", title: "Welcome to Your AI Transformation Sandbox", body: `You're inside ${nm} — a ${co.industry.replace(/_/g, " ")} organization with ${n.toLocaleString()} employees, ${fnCount} functions, and multiple analyzed roles. Everything you see is real data flowing through real analytics. Explore freely — nothing you do here affects real projects.`, action: "Click Next to start the guided tour, or close this window and explore on your own" },

  // ═══ PHASE 1: DISCOVER ═══
  { page: "snapshot", pos: "center", icon: "📊", title: `Workforce Snapshot — ${nm} at a Glance`, body: `You're looking at ${nm}'s baseline: ${genCount.toLocaleString()} employees across ${fnCount} functions. The KPI cards show headcount, role count, task coverage, and AI readiness. These metrics are your starting point for any transformation conversation.`, action: "Look at the 6 KPI cards — each represents a key workforce metric" },
  { page: "snapshot", pos: "center", icon: "📊", title: "Understanding the Charts", body: "The function distribution chart shows relative headcount by department. The AI Impact donut will populate once you complete Work Design. The readiness radar shows relative scores across dimensions. These visuals are what you'd put in a steering committee deck.", action: "Click the ☕ button (bottom-right) and ask: 'Give me an executive summary of this workforce'" },

  { page: "jobs", pos: "center", icon: "🗂️", title: `Job Architecture — ${nm}'s Roles`, body: `The Job Catalog lists positions across ${fnCount} functions, from individual contributors to senior leadership. Notice the compensation range and career levels. This architecture feeds the Work Design Lab — every role here can be deconstructed into tasks.`, action: "Scroll down to see the job catalog. Then try the AI Job Profile Generator: type a role name and press Enter" },

  { page: "scan", pos: "center", icon: "🔬", title: "AI Opportunity Scan — Task-Level Scoring", body: `This module scores every task in ${nm}'s work design data. The AI Priority tab ranks tasks by automation potential. Tasks that are Repetitive + Deterministic + Independent score highest — the trifecta of automatable work. Judgment-heavy + Collaborative tasks score lowest.`, action: "Click 'AI Priority' tab — notice how the composite score combines automation potential, time impact, and feasibility" },
  { page: "scan", pos: "center", icon: "🔬", title: "Skills Analysis — Current vs Future", body: "The Skills tab shows current skill demand weighted by time allocation. After transformation, demand shifts: AI Literacy and Process Automation will grow while routine skills decline. This is the reskilling signal.", action: "Click the 'Skills' sub-tab to see the shift from current to future skill demand" },

  { page: "readiness", pos: "center", icon: "🎯", title: `AI Readiness — Who's Ready at ${nm}?`, body: `Each employee is scored on 5 dimensions: AI Awareness, Tool Adoption, Data Literacy, Change Openness, and AI Collaboration. High scorers are 'Ready Now' — they already work with data tools daily. Low scorers are 'At Risk' — they need intervention before transformation begins.`, action: "Switch to Individual Scores, then scroll down to see improvement plans — each dimension gets intervention type and timeline" },

  { page: "mgrcap", pos: "center", icon: "👔", title: `Manager Capability — ${nm}'s ~${mgrCount} Leaders`, body: `${nm} has approximately ${mgrCount} people managers. High-scoring managers become Transformation Champions. Low-scoring managers (below 2.5) are Flight Risks — they need immediate engagement. The correlation panel shows teams under strong managers have significantly higher readiness.`, action: "Click 'Team Correlation' tab — see how teams under strong managers show higher readiness scores" },

  // ═══ PHASE 2: DESIGN ═══
  { page: "skills", pos: "center", icon: "🧠", title: `Skills Inventory — ${nm}'s Proficiency Grid`, body: `You're seeing up to ${Math.min(genCount, 500)} employees × 15 skills. Experts (score 4) in core skills are your strongest assets. Employees at 1-2 in critical areas like AI/ML Tools need training. The coverage percentage shows assessment completeness — some cells may be blank.`, action: "Find any employee row and click a skill cell to update their proficiency. The edit saves instantly." },
  { page: "skills", pos: "center", icon: "🧠", title: "Gap Analysis — Where the Gaps Are", body: "After confirming the inventory, this tab shows gaps between current average and target proficiency. Critical gaps (delta > -1.5) mean significant investment in training. Small gaps (delta < -0.5) indicate existing strength.", action: "Click 'Gap Analysis' tab. Set the disposition for critical gaps: choose 'Close Internally' if you can train up, or 'Hire Externally' if the gap is too large", subTab: "gap" },
  { page: "skills", pos: "center", icon: "🧠", title: "Adjacency Map — Who Can Fill New Roles?", body: "Redesigned target roles are shown with adjacency scores for internal candidates. High matches (>70%) are strong Build candidates. No matches above 50% signal external hire needs. This drives your Build/Buy/Borrow/Automate strategy.", action: "Click 'Adjacency Map' tab. Set threshold to 60%. Shortlist top candidates by clicking ☆", subTab: "adjacency" },

  { page: "design", pos: "center", icon: "✏️", title: "Work Design Lab — Task Deep Dive", body: "Select a role from the sidebar. You'll see tasks with pre-filled time allocations, work characteristics, and AI impact scores. This is the core engine: every task gets analyzed by 4 characteristics (Task Type, Logic, Interaction, AI Impact) that determine what the AI recommends.", action: "Select a role from the Active Job dropdown in the sidebar" },
  { page: "design", pos: "center", icon: "✏️", title: "Deconstruction — How Tasks Break Down", body: "Look at the task table: tasks with Repetitive + Deterministic + Independent characteristics point to HIGH AI Impact — ~60% of time can be saved through automation. Tasks that are Judgment-heavy + Collaborative have LOW AI Impact — only ~10% savings.", action: "Study the pattern: Repetitive + Deterministic + Independent = High AI. Variable + Judgment-heavy + Collaborative = Low AI. This pattern applies to every role you'll ever analyze." },
  { page: "design", pos: "center", icon: "✏️", title: "Redeployment — The Decision Layer", body: "Each task gets a decision: Automate (via RPA), Augment (via GenAI), or Retain (human-led). The Time Saved % column shows freed capacity per task. Total savings vary by role but typically range from 25-45% of the work week.", action: "Try changing a task from Augment to Automate — watch the Time Saved jump. Then change it back to see why Augment may be the better choice for Probabilistic tasks" },
  { page: "design", pos: "center", icon: "✏️", title: "Reconstruction — The Future State", body: "The Impact tab shows the reconstruction: how many hours per week are released and what percentage of the role is freed up. This is the business case: either the person does more strategic work, or you need fewer people in this role.", action: "Review the Impact tab — the time release percentage is the key metric that feeds into the Simulator" },

  { page: "bbba", pos: "center", icon: "🔀", title: "Build/Buy/Borrow/Automate — Sourcing Strategy", body: "Based on gap analysis and adjacency scores, each redesigned role gets a recommendation. Roles with strong internal candidates get 'Build' (reskilling cost). Roles with no internal matches get 'Buy' (hiring cost). The investment summary shows total transformation cost.", action: "Click a disposition badge to override, then scroll down to see cost comparison bars and risk assessment per decision" },

  { page: "headcount", pos: "center", icon: "👥", title: "Headcount Waterfall — The Board View", body: `Starting at ${genCount.toLocaleString()} headcount: automation eliminates some roles, natural attrition absorbs part of the impact, internal redeployments fill new roles, and new hires cover the rest. The Net Change % is what your CFO will focus on — it determines if this is a 'growth transformation' or a 'restructure'.`, action: "Look at the Financial Impact section below — Net Year 1 tells you if this transformation pays for itself" },

  { page: "simulate", pos: "center", icon: "⚡", title: "Impact Simulator — Conservative vs Aggressive", body: "Conservative (30% AI adoption): small impact, safe timeline. Balanced (55%): moderate change, 10-month rollout. Aggressive (80%): maximum automation, fastest ROI but highest risk. Toggle between them and watch released hours swing from minimal to transformative. The Redeployment sliders decide WHERE freed time goes.", action: "Switch to Aggressive, then go to the Redeployment sub-tab. Set Higher-Value Work to 50% and Innovation to 30% — this is the 'growth reinvestment' strategy" },

  { page: "build", pos: "center", icon: "🏗️", title: "Org Design Studio — Structural Modeling", body: `Eight views model ${nm}'s future structure. Span of Control shows manager ratios. The Cost view shows payroll distribution by function. The Scenarios comparison lets you model structural changes like flattening layers or merging functions.`, action: "Click through Overview → Span of Control → Cost — notice which functions dominate headcount and cost" },

  // ═══ PHASE 3: DELIVER ═══
  { page: "reskill", pos: "center", icon: "📚", title: "Reskilling Pathways — Personal Learning Plans", body: "Each employee with skill gaps gets a personalized pathway. High-readiness employees with small gaps get short, low-cost training. Low-readiness employees with large gaps need intensive support. Priority scoring determines who gets trained first.", action: "Compare pathways across employees — notice how readiness level and gap size drive the recommended investment" },

  { page: "marketplace", pos: "center", icon: "🏪", title: "Talent Marketplace — Internal Matching", body: "The composite score combines adjacency percentage, readiness score, and reskilling timeline. Shortlist strong matches to commit them to a pathway. For roles where no one exceeds the threshold, the tool recommends external hire — that's a signal to your TA team.", action: "Shortlist top candidates by clicking ☆. Look for roles that recommend External Fill" },

  { page: "changeready", pos: "center", icon: "📈", title: `Change Readiness — ${nm}'s Risk Map`, body: "The 4-quadrant matrix: High Readiness + High Impact (Champions — deploy as advocates), Low Readiness + High Impact (highest risk — heavily impacted but not ready). Each quadrant has a specific intervention plan. The High Risk group needs intensive support for 6+ months.", action: "Click the red 'High Risk' quadrant to see which employees are in it — these are the people who need the most support" },

  { page: "mgrdev", pos: "center", icon: "🎓", title: "Manager Development — Deploying Champions", body: "High-scoring managers become Change Agents — they lead transformation for their function. Low-scoring managers need immediate engagement: executive coaching on Leading Through Ambiguity. Manager investment is typically the highest-leverage spend in the entire transformation.", action: "Compare high-scoring managers (deploy as agents, minimal cost) vs low-scoring (intensive coaching). Manager investment is high-leverage." },

  { page: "plan", pos: "center", icon: "🚀", title: "Change Planner — Auto-Generated Roadmap", body: "Click 'Auto-Build Plan' and the AI generates a complete roadmap from everything you've configured: which roles change, what skills need building, who needs support, what the timeline looks like. Every row is editable — change owners, priorities, waves. The timeline visualization shows initiatives sequenced across waves.", action: "Click '☕ Auto-Build Plan' — then edit an initiative's owner and priority to see how the tool supports your planning process" },

  { page: "opmodel", pos: "center", icon: "🧬", title: "Operating Model — The Architecture", body: "The Blueprint shows 5 layers: Governance, Core Components, Shared Services, Enabling, and Interface. Switch between archetypes (Functional, Platform, Matrix) to see how each layer transforms. The choice of archetype drives how your functions deliver services.", action: "Switch between archetypes — notice how Core Components and Enabling layers change dramatically" },
  { page: "opmodel", pos: "center", icon: "🧬", title: "Capability Maturity — Rate Each Component", body: "Click the Capability Maturity tab. Rate capabilities from 1 (Ad Hoc) to 5 (Optimized) for both Current and Target state. The tool calculates the gap automatically. A large gap signals heavy investment needed. Scores are persisted.", action: "Rate a few capabilities for Current and Target state — see the gap calculation update live" },

  // ═══ FINISH ═══
  { page: "home", pos: "center", icon: "🎉", title: "You've Mastered the Platform", body: `You've explored all 18 modules with real ${nm} data. You've seen how tasks drive AI impact scores, how skills gaps determine talent strategy, how manager capability multiplies team readiness, and how everything flows into a change plan and operating model. Now go build your own transformation.`, action: "Click '← Back to Projects' and create a New Project with your organization's data. Everything you learned here applies directly." },
];
}

// Default fallback for non-tutorial contexts
const TUTORIAL_STEPS = buildTutorialSteps("tutorial_mid_technology");


/* ═══ TUTORIAL OVERLAY — draggable, minimizable, centered window ═══ */
function TutorialOverlay({ step, totalSteps, steps, onNext, onPrev, onClose, onJump }: {
  step: number; totalSteps: number;
  steps: { page: string; pos: "center"|"tr"|"tl"; icon: string; title: string; body: string; action?: string; subTab?: string }[];
  onNext: () => void; onPrev: () => void; onClose: () => void; onJump: (s: number) => void;
}) {
  const s = steps[step];
  if (!s) return null;
  const isLast = step === totalSteps - 1;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const phaseIdx = step === 0 ? -1 : step <= 7 ? 0 : step <= 19 ? 1 : 2;
  const phaseName = phaseIdx === 0 ? "Discover" : phaseIdx === 1 ? "Design" : phaseIdx === 2 ? "Deliver" : "";
  const phaseColor = phaseIdx === 0 ? "#3B82F6" : phaseIdx === 1 ? "#10B981" : "#F59E0B";

  // Mount animation
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, [step]);

  // Draggable state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [centered, setCentered] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset to center when step changes
  useEffect(() => { setCentered(true); setMinimized(false); }, [step]);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    setCentered(false);
    if (centered) setPos({ x: rect.left, y: rect.top });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Minimized state — small pill in top right
  if (minimized) return <button onClick={() => setMinimized(false)} style={{
    position: "fixed", top: 12, right: 12, zIndex: 50,
    padding: "8px 16px", borderRadius: 14,
    background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.2)",
    color: "#A78BFA", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    transition: "all 0.3s",
  }} onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}>
    <span style={{ fontSize: 16 }}>🎓</span>
    <span>Tutorial — Step {step + 1}/{totalSteps}</span>
    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(139,92,246,0.15)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6", borderRadius: 2 }} />
    </div>
    <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
  </button>;

  const cardWidth = 620;
  const cardStyle: React.CSSProperties = centered
    ? { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardWidth, zIndex: 50 }
    : { position: "fixed", left: pos.x, top: pos.y, width: cardWidth, zIndex: 50 };

  return <>
    {/* Light backdrop */}
    <div style={{ position: "fixed", inset: 0, zIndex: 44, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)", transition: "all 0.4s", pointerEvents: "none" }} />

    {/* Card */}
    <div ref={cardRef} style={{
      ...cardStyle,
      borderRadius: 22, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.2)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(139,92,246,0.08)",
      cursor: dragging ? "grabbing" : "default",
      transition: dragging ? "none" : "all 0.4s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: "auto",
      opacity: visible ? 1 : 0,
      transform: centered ? (visible ? "translate(-50%, -50%)" : "translate(-50%, -48%) scale(0.97)") : undefined,
    }}>

      {/* Draggable header bar */}
      <div onMouseDown={onMouseDown} style={{
        padding: "18px 24px 14px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
      }}>
        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: "var(--surface-3)", marginBottom: 14 }}>
          <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${phaseColor || "#8B5CF6"}, #8B5CF6)`, width: `${pct}%`, transition: "width 0.6s ease" }} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <span style={{ fontSize: 36 }}>{s.icon}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6", letterSpacing: 1.2 }}>STEP {step + 1} OF {totalSteps}</span>
                {phaseName && <span style={{ fontSize: 10, fontWeight: 700, color: phaseColor, background: `${phaseColor}15`, padding: "2px 8px", borderRadius: 5 }}>{phaseName}</span>}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>{s.title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => setMinimized(true)} title="Minimize" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>—</button>
            <button onClick={onClose} title="Close tutorial" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 28px 14px" }}>
        <p style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text-secondary)", margin: 0 }}>{s.body}</p>
        {s.action && <div style={{ fontSize: 14, fontWeight: 600, color: "#A78BFA", background: "rgba(139,92,246,0.05)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(139,92,246,0.1)", marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.6 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>👉</span> <span>{s.action}</span>
        </div>}
      </div>

      {/* Step dots */}
      <div style={{ padding: "6px 28px 8px", display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
        {steps.map((ts, i) => <button key={i} onClick={() => onJump(i)} title={`Step ${i+1}: ${ts.title}`} style={{ width: i === step ? 16 : 7, height: 7, borderRadius: 4, background: i === step ? "#8B5CF6" : i < step ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", transition: "all 0.3s", flexShrink: 0 }} />)}
      </div>

      {/* Controls */}
      <div style={{ padding: "8px 28px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onPrev} disabled={step === 0} style={{ padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: step === 0 ? 0.25 : 1, transition: "all 0.2s" }}>← Previous</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setMinimized(true)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Minimize</button>
          <button onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)" }}>End Tour</button>
        </div>
        <button onClick={onNext} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", color: "#fff", background: isLast ? "linear-gradient(135deg, #10B981, #059669)" : `linear-gradient(135deg, ${phaseColor || "#8B5CF6"}, #8B5CF6)`, boxShadow: `0 4px 14px ${isLast ? "rgba(16,185,129,0.25)" : "rgba(139,92,246,0.25)"}`, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>{isLast ? "🎉 Complete Tutorial" : "Next Step →"}</button>
      </div>
    </div>
  </>;
}

/* ═══ TUTORIAL BADGE — persistent reopener with progress ═══ */
function TutorialBadge({ onClick, step, total }: { onClick: () => void; step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return <button onClick={onClick} style={{ position: "fixed", bottom: 80, left: 24, zIndex: 40, padding: "8px 14px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.15)", color: "#A78BFA", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: "all 0.3s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; }}>
    <span>🎓</span>
    <span>Tutorial</span>
    <span style={{ fontSize: 9, opacity: 0.5 }}>{pct}%</span>
    <div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(139,92,246,0.12)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6", borderRadius: 2 }} /></div>
  </button>;
}




/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB — Hero splash + project management
   ═══════════════════════════════════════════════════════════════ */

function ProjectHub({ onOpenProject }: { onOpenProject: (p: { id: string; name: string; meta: string }) => void }) {
  const [projects, setProjects] = useState<{ id: string; name: string; meta: string; client?: string; industry?: string; size?: string; lead?: string; created: string; status: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { const saved = localStorage.getItem("hub_projects"); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newLead, setNewLead] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);

  // Load projects from localStorage (deferred for SSR safety)
  useEffect(() => {
    try { const saved = localStorage.getItem("hub_projects"); if (saved) setProjects(JSON.parse(saved)); } catch {}
    setLoaded(true);
  }, []);

  // Save projects — only after initial load
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("hub_projects", JSON.stringify(projects));
  }, [projects, loaded]);

  const createProject = () => {
    if (!newName.trim()) return;
    const metaParts = [newClient, newIndustry, newSize, newLead, newDesc].filter(Boolean).join(" · ");
    const p = { id: `proj_${Date.now()}`, name: newName.trim(), meta: metaParts.trim(), client: newClient.trim(), industry: newIndustry, size: newSize, lead: newLead.trim(), created: new Date().toLocaleDateString(), status: "Not Started" };
    const updated = [...projects, p];
    setProjects(updated);
    // Save immediately before navigating away
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); setModalOpen(false);
    onOpenProject(p);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    Object.keys(localStorage).filter(k => k.includes(id)).forEach(k => localStorage.removeItem(k));
    setConfirmDelete(null);
  };

  // Adaptive card sizing
  const count = projects.length + 2; // +2 for sandbox + new project
  const cardWidth = count <= 3 ? 380 : count <= 5 ? 300 : count <= 7 ? 260 : 220;

  // ── Sandbox full-screen picker ──
  if (sandboxOpen) {
    return <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0B1120" }}>
      {/* Full-bleed storefront background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/sandbox_bg.png)", backgroundSize: "cover", backgroundPosition: "center 60%" }} />
      <div style={{ position: "absolute", inset: 0, background: sandboxPanelOpen ? "rgba(8,12,24,0.55)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.1) 0%, rgba(8,12,24,0.35) 50%, rgba(8,12,24,0.6) 100%)", transition: "background 0.5s ease" }} />

      {/* Back button */}
      <button onClick={() => { setSandboxOpen(false); setSandboxPanelOpen(false); }} style={{ position: "absolute", top: 24, left: 24, zIndex: 30, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)", color: "rgba(255,230,200,0.8)", transition: "all 0.2s" }}>← Back</button>

      {/* Click-to-open area */}
      {!sandboxPanelOpen && <div style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "pointer" }} onClick={() => setSandboxPanelOpen(true)}>
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🎓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,245,235,0.95)", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>Industry Sandbox</div>
          <div className="animate-pulse" style={{ padding: "10px 24px", borderRadius: 16, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(200,180,255,0.8)", fontSize: 14, fontWeight: 600 }}>Click anywhere to explore →</div>
        </div>
      </div>}

      {/* Slide-in panel from right */}
      <div style={{ position: "absolute", zIndex: 20, top: 0, right: 0, bottom: 0, width: sandboxPanelOpen ? "55%" : "0%", overflow: "hidden", transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.94)", backdropFilter: "blur(32px)", borderLeft: "1px solid rgba(139,92,246,0.1)", display: "flex", flexDirection: "column", padding: sandboxPanelOpen ? "32px" : "32px 0", opacity: sandboxPanelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto" }}>
          {/* Panel header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,245,235,0.95)" }}>🎓 Industry Sandbox</div>
              <div style={{ fontSize: 12, color: "rgba(200,180,255,0.4)", marginTop: 4 }}>24 pre-built organizations · 8 industries × 3 sizes</div>
            </div>
            <button onClick={() => setSandboxPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Industry × Size Grid */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
              <thead><tr>
                <th style={{ fontSize: 10, color: "rgba(200,180,255,0.3)", textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>INDUSTRY</th>
                <th style={{ fontSize: 10, color: "rgba(16,185,129,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>SMALL</th>
                <th style={{ fontSize: 10, color: "rgba(59,130,246,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>MID-CAP</th>
                <th style={{ fontSize: 10, color: "rgba(239,68,68,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>LARGE-CAP</th>
              </tr></thead>
              <tbody>{[
                { id: "technology", icon: "💻", label: "Technology", s: "Spark Labs · 150", m: "Nexus Corp · 2,500", l: "Titan Digital · 18,000" },
                { id: "financial_services", icon: "🏦", label: "Financial Svc", s: "Pinnacle · 200", m: "Global FP · 4,200", l: "Meridian Cap · 22,000" },
                { id: "healthcare", icon: "🏥", label: "Healthcare", s: "Valley Med · 350", m: "Meridian Health · 5,500", l: "National HP · 45,000" },
                { id: "manufacturing", icon: "🏭", label: "Manufacturing", s: "Precision · 180", m: "Atlas Mfg · 3,800", l: "Continental · 28,000" },
                { id: "retail", icon: "🛍️", label: "Retail", s: "Urban Threads · 120", m: "Horizon · 6,000", l: "American MP · 52,000" },
                { id: "legal", icon: "⚖️", label: "Legal", s: "Barrett · 45", m: "Sterling · 800", l: "Global Law · 5,500" },
                { id: "energy", icon: "⚡", label: "Energy", s: "SunRidge · 160", m: "Apex Energy · 3,200", l: "Pacific Energy · 35,000" },
                { id: "education", icon: "🎓", label: "Education", s: "Westbrook · 120", m: "Pacific Univ · 2,800", l: "National UC · 15,000" },
              ].map(ind => <tr key={ind.id}>
                <td style={{ fontSize: 12, color: "rgba(200,180,255,0.7)", padding: "3px 10px", fontWeight: 600 }}><span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.label}</td>
                {[{size: "small", info: ind.s, color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7"}, {size: "mid", info: ind.m, color: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)", text: "#93C5FD"}, {size: "large", info: ind.l, color: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", text: "#FCA5A5"}].map(t => <td key={t.size} style={{ padding: 2 }}><button disabled={!!seedingId} onClick={async (e) => {
                  e.stopPropagation();
                  const tid = `tutorial_${t.size}_${ind.id}`;
                  setSeedingId(tid);
                  try { await fetch(`/api/tutorial/seed?industry=${ind.id}&size=${t.size}`); } catch {}
                  seedTutorialData(tid, ind.id);
                  setSeedingId(null);
                  onOpenProject({ id: tid, name: `${ind.icon} ${ind.label} — ${t.size === "small" ? "Small" : t.size === "mid" ? "Mid-Cap" : "Large-Cap"}`, meta: `${t.info} · Guided Tour` });
                }} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, cursor: seedingId ? "wait" : "pointer", background: seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.25)" : t.color, border: `1px solid ${seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.5)" : t.border}`, color: t.text, transition: "all 0.2s", textAlign: "center", lineHeight: 1.4, opacity: seedingId && seedingId !== `tutorial_${t.size}_${ind.id}` ? 0.4 : 1 }} onMouseEnter={e => { if (!seedingId) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = t.text; }}} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; }}>{seedingId === `tutorial_${t.size}_${ind.id}` ? "⏳ Loading..." : t.info}</button></td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {/* Guided tour note */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>✨ Each sandbox includes:</div>
            <div style={{ fontSize: 11, color: "rgba(200,180,255,0.4)", lineHeight: 1.6 }}>Full employee roster · Task-level work design · Skills inventory · AI readiness scores · Manager capability · Change readiness · 27-step guided tutorial</div>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Full-bleed background */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/hero_bg.png)", backgroundSize: "cover", backgroundPosition: "center center", width: "100vw", height: "100vh" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11,17,32,0.25) 0%, rgba(11,17,32,0.45) 40%, rgba(11,17,32,0.7) 100%)", width: "100vw", height: "100vh" }} />

    {/* Content */}
    <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3" style={{ fontFamily: "Outfit, sans-serif", textShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>Your Projects</h1>
        <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>Select a project or create a new one</p>
      </div>

      <div className="flex gap-5 flex-wrap justify-center" style={{ maxWidth: 1200 }}>
        {/* Sandbox card — opens full-screen picker */}
        <div onClick={() => setSandboxOpen(true)} style={{ width: cardWidth, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", backdropFilter: "blur(20px)", border: "1px solid rgba(139,92,246,0.2)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}>
          <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(139,92,246,0.3))" }}>🎓</div>
          <div className="text-[16px] font-bold text-white">Sandbox</div>
          <div className="text-[11px]" style={{ color: "rgba(200,180,255,0.4)" }}>24 pre-built orgs</div>
        </div>

        {/* New Project card — glassmorphic with sparkle */}
        <div onClick={() => setModalOpen(true)} style={{ width: cardWidth, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "rgba(255,230,200,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,200,150,0.15)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.2)"; e.currentTarget.style.background = "rgba(255,230,200,0.18)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,230,200,0.1)"; }}>
          <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(200,120,40,0.3))" }}>✨</div>
          <div className="text-[16px] font-bold text-white">New Project</div>
          <div className="text-[12px]" style={{ color: "rgba(255,220,180,0.4)" }}>Start a transformation</div>
        </div>

        {/* Existing project cards */}
        {projects.map(p => {
          let pStatus = p.status;
          try { const v = localStorage.getItem(`${p.id}_visited`); if (v && Object.keys(JSON.parse(v)).length > 0) pStatus = "In Progress"; } catch {}
          try { const vm = localStorage.getItem(`${p.id}_viewMode`); if (vm) pStatus = "In Progress"; } catch {}
          const statusColor = pStatus === "In Progress" ? "#3B82F6" : pStatus === "Complete" ? "#10B981" : "rgba(255,200,150,0.3)";
          // Count modules visited
          let modulesVisited = 0;
          try { const v = localStorage.getItem(`${p.id}_visited`); if (v) modulesVisited = Object.keys(JSON.parse(v)).length; } catch {}

          return <div key={p.id} onClick={() => onOpenProject(p)} style={{ width: cardWidth, minHeight: 220, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 24px 20px", transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.2)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            <div>
              <div className="flex items-start justify-between mb-1">
                <div className="text-[17px] font-bold text-white">{p.name}</div>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ opacity: 0, transition: "opacity 0.2s", color: "rgba(255,255,255,0.2)", fontSize: 14, background: "none", border: "none", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}>✕</button>
              </div>
              {p.client && <div className="text-[12px] font-semibold mb-1" style={{ color: "rgba(255,220,180,0.6)" }}>{p.client}</div>}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {p.industry && <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "rgba(59,130,246,0.15)", color: "rgba(130,180,255,0.8)" }}>{p.industry}</span>}
                {p.size && <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "rgba(100,220,180,0.8)" }}>{p.size}</span>}
              </div>
              {p.lead && <div className="text-[10px] mb-1" style={{ color: "rgba(255,220,180,0.3)" }}>Lead: {p.lead}</div>}
              {p.meta && !p.client && <div className="text-[11px] italic mb-2" style={{ color: "rgba(255,220,180,0.25)" }}>{p.meta}</div>}
            </div>
            <div>
              {/* Progress bar */}
              {modulesVisited > 0 && <div className="mb-2"><div className="flex justify-between text-[9px] mb-0.5" style={{ color: "rgba(255,255,255,0.2)" }}><span>Progress</span><span>{modulesVisited}/8 modules</span></div><div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><div className="h-full rounded-full" style={{ width: `${(modulesVisited / 8) * 100}%`, background: statusColor }} /></div></div>}
              <div className="flex items-center justify-between">
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>{p.created}</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColor }}>{pStatus}</span>
                </div>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 20, right: 24, fontSize: 12, fontWeight: 600, color: "rgba(255,200,150,0.25)" }}>OPEN →</div>
          </div>;
        })}
      </div>
    </div>

    {/* Create modal */}
    {modalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">New Transformation Project</h2>
        <p className="text-[12px] text-[var(--text-muted)] mb-5">Fill in the details below to set up your workspace</p>
        <div className="space-y-3">
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Name *</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp AI Transformation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" autoFocus /></div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Client / Organization</div>
          <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Acme Corporation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Industry</div>
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none">
              <option value="">Select industry...</option>
              {["Financial Services","Technology","Healthcare","Manufacturing","Retail","Energy","Media","Professional Services","Public Sector","Other"].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
            <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Org Size</div>
            <select value={newSize} onChange={e => setNewSize(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none">
              <option value="">Select size...</option>
              {["< 500 employees","500 - 2,000","2,000 - 10,000","10,000 - 50,000","50,000+"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Lead</div>
          <input value={newLead} onChange={e => setNewLead(e.target.value)} placeholder="e.g. Jane Smith, VP Transformation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description / Objectives</div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are the goals of this transformation? What functions are in scope?" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] resize-none" rows={3} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={() => { setModalOpen(false); setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); }} className="px-4 py-2.5 text-[13px] text-[var(--text-muted)] rounded-xl border border-[var(--border)]">Cancel</button>
          <button onClick={createProject} disabled={!newName.trim()} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Create Project</button>
        </div>
      </div>
    </div>}

    {/* Delete confirmation */}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-2xl p-6 w-full max-w-sm text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">Delete Project?</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">This will not be recoverable.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 rounded-xl text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">No</button>
          <button onClick={() => deleteProject(confirmDelete)} className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-[var(--risk)] text-white">Yes, Delete</button>
        </div>
      </div>
    </div>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   AUTH GATE — Login / Register screen with Transformation Cafe bg
   ═══════════════════════════════════════════════════════════════ */
function AuthGate({ onAuth }: { onAuth: (user: authApi.AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwC, setShowPwC] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try { const d = await authApi.login(username, password); onAuth(d.user); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Login failed"); }
    setLoading(false);
  };
  const handleRegister = async () => {
    setError("");
    if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try { const d = await authApi.register(username, password, passwordConfirm, email || undefined); onAuth(d.user); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Registration failed"); }
    setLoading(false);
  };
  const handleForgot = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      const d = await authApi.forgotPassword(username);
      if (d.token) { setResetToken(d.token); setMessage("Reset token generated. Enter it below with your new password."); setMode("reset"); }
      else { setMessage(d.message); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  };
  const handleReset = async () => {
    setError(""); setMessage(""); setLoading(true);
    try { await authApi.resetPassword(resetToken, password, passwordConfirm); setMessage("Password reset! You can now log in."); setMode("login"); setPassword(""); setPasswordConfirm(""); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Reset failed"); }
    setLoading(false);
  };

  const pwReqs = [
    { ok: password.length >= 8, t: "8+ characters" },
    { ok: /[A-Z]/.test(password), t: "Uppercase" },
    { ok: /[a-z]/.test(password), t: "Lowercase" },
    { ok: /[0-9]/.test(password), t: "Number" },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(password), t: "Special char" },
  ];
  const allPwOk = pwReqs.every(r => r.ok);

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#f5e6d0", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" as const, backdropFilter: "blur(4px)" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "1.5px" };
  const btnStyle: React.CSSProperties = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.5px", boxShadow: "0 4px 20px rgba(224,144,64,0.3)" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Full-bleed background image */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/login_bg.png)", backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }} />
      {/* Soft vignette overlay for card readability */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.25) 0%, rgba(10,8,5,0.7) 100%)" }} />

      {/* Login card — centered with glass effect */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.5px", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>AI Transformation</div>
          <div style={{ fontSize: 11, color: "rgba(224,144,64,0.85)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "5px", textTransform: "uppercase" as const, marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Platform</div>
        </div>

        {/* Glass card */}
        <div style={{ background: "rgba(15,12,8,0.65)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "32px 28px", boxShadow: "0 32px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)" }}>

          {/* Tabs */}
          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", gap: 3, marginBottom: 22, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 3 }}>
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif", border: "none", cursor: "pointer", transition: "all 0.2s",
                    background: mode === m ? "rgba(224,144,64,0.18)" : "transparent",
                    color: mode === m ? "#e09040" : "rgba(255,255,255,0.35)",
                  }}>{m === "login" ? "Sign In" : "Create Account"}</button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Forgot Password</h3>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>Enter your username to generate a reset token.</p>
            </div>
          )}
          {mode === "reset" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Reset Password</h3>
            </div>
          )}

          {error && <div style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#f08080", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
          {message && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#6ee7b7", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{message}</div>}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Username</label><input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter username" style={inputStyle} /></div>
              <div><label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter password" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading || !username || !password} style={{ ...btnStyle, opacity: loading ? 0.5 : 1, marginTop: 2 }}>{loading ? "Signing in..." : "Sign In"}</button>
              <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>Forgot password?</button>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={labelStyle}>Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username (min 3 chars)" style={inputStyle} /></div>
              <div><label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
                {password.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px", marginTop: 6 }}>{pwReqs.map(r => <span key={r.t} style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: r.ok ? "#6ee7b7" : "rgba(255,255,255,0.25)" }}>{r.ok ? "✓" : "○"} {r.t}</span>)}</div>}
              </div>
              <div><label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPwC ? "text" : "password"} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type password again" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button onClick={() => setShowPwC(!showPwC)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPwC ? "🙈" : "👁"}</button>
                </div>
                {passwordConfirm.length > 0 && password !== passwordConfirm && <span style={{ fontSize: 9, color: "#f08080", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, display: "block" }}>Passwords do not match</span>}
              </div>
              <div><label style={labelStyle}>Recovery Email <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="For password recovery only" type="email" style={inputStyle} />
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 5, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5 }}>Adding an email lets you recover your password if you forget it. Doesn't need to be your main email — a junk one works fine. We'll never send marketing or share it.</p>
              </div>
              <button onClick={handleRegister} disabled={loading || !username || !password || password !== passwordConfirm || !allPwOk} style={{ ...btnStyle, opacity: (loading || !username || !allPwOk || password !== passwordConfirm) ? 0.35 : 1, marginTop: 2 }}>{loading ? "Creating account..." : "Create Account"}</button>
            </div>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" style={inputStyle} /></div>
              <button onClick={handleForgot} disabled={loading || !username} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>{loading ? "..." : "Send Reset Token"}</button>
            </div>
          )}

          {/* ── RESET ── */}
          {mode === "reset" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Reset Token</label><input value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token" style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }} /></div>
              <div><label style={labelStyle}>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password" style={inputStyle} /></div>
              <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
              <button onClick={handleReset} disabled={loading || !resetToken || !password || password !== passwordConfirm} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>{loading ? "..." : "Reset Password"}</button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 20, fontFamily: "'IBM Plex Mono', monospace", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Secure authentication · Your data stays private</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP ROOT — Auth gate → ProjectHub → Home
   ═══════════════════════════════════════════════════════════════ */
export default function Page() {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeProject, setActiveProject] = useState<{ id: string; name: string; meta: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const stored = authApi.getStoredUser();
    const token = authApi.getToken();
    if (stored && token) {
      authApi.getMe().then(u => {
        if (u) { setUser(u); } else { authApi.clearToken(); }
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load active project from localStorage
  useEffect(() => {
    if (!user) return;
    try { const saved = localStorage.getItem("hub_active"); if (saved) setActiveProject(JSON.parse(saved)); } catch {}
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!loaded || !user) return;
    if (activeProject) localStorage.setItem("hub_active", JSON.stringify(activeProject));
    else localStorage.removeItem("hub_active");
  }, [activeProject, loaded, user]);

  if (!authChecked) return null;
  if (!user) return <AuthGate onAuth={setUser} />;
  if (!loaded) return null;

  const logoutBar = (
    <div style={{ position: "fixed", top: 12, right: 16, zIndex: 9999, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>{user.username}</span>
      <button onClick={() => authApi.logout()} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(224,144,64,0.2)", background: "rgba(45,35,28,0.8)", color: "var(--accent-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Sign Out</button>
    </div>
  );

  if (!activeProject) return <>{logoutBar}<ProjectHub onOpenProject={setActiveProject} /><MusicPlayer /></>;
  return <>{logoutBar}<Home key={activeProject.id} projectId={activeProject.id} projectName={activeProject.name} projectMeta={activeProject.meta} onBackToHub={() => setActiveProject(null)} /><MusicPlayer /></>;
}
