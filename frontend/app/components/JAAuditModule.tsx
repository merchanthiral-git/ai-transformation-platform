"use client";
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
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

const CatalogueHealth = lazy(() => import("./ja/CatalogueHealth"));
const FlagRules = lazy(() => import("./ja/FlagRules"));

/* ═══ TYPES (shared with original JobArchModule) ═══ */
type TreeNode = { id: string; label: string; type: string; children?: TreeNode[]; headcount: number; [k: string]: unknown };
type Job = { id: string; title: string; level: string; track: string; function: string; family: string; sub_family: string; headcount: number; ai_score: number; ai_impact: string; tasks_mapped: number; [k: string]: unknown };
type Flag = { id: string; category: string; severity: string; message: string; rule_name?: string; entity_type?: string; entity_id?: string; [k: string]: unknown };
type Employee = { id: string; name: string; title: string; level: string; [k: string]: unknown };

function LevelBadge({ level, size }: { level: string; size?: "sm" | "md" }) {
  const track = level?.[0] || "P";
  const colors: Record<string, string> = { E: "var(--risk)", M: "var(--amber)", P: "var(--accent-primary)", S: "var(--warning)", T: "var(--sage)" };
  const s = size === "md" ? 28 : 20;
  return <div style={{ width: s, height: s, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s === 28 ? 12 : 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", background: `${colors[track] || "var(--accent-primary)"}18`, color: colors[track] || "var(--accent-primary)", border: `1px solid ${colors[track] || "var(--accent-primary)"}30` }}>{level}</div>;
}

function getTrackColor(levelOrTrack: string): string {
  const t = levelOrTrack?.[0]?.toUpperCase() || "P";
  const map: Record<string, string> = { E: "var(--risk)", M: "var(--amber)", P: "var(--accent-primary)", S: "var(--warning)", T: "var(--sage)" };
  return map[t] || "var(--accent-primary)";
}

function aiDot(impact: string): string {
  return impact === "High" ? "var(--risk)" : impact === "Moderate" ? "var(--warning)" : "var(--success)";
}

/* ═══ JOB ARCHITECTURE AUDIT MODULE ═══ */
export function JAAuditModule({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [tab, setTab] = useState("catalogue");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"level" | "headcount" | "ai" | "alpha">("level");
  const [filterTrack, setFilterTrack] = useState("All");
  const [filterAI, setFilterAI] = useState("All");
  const [compareJobs, setCompareJobs] = useState<Job[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [flagFilter, setFlagFilter] = useState("All");
  const projectId = model || "Demo_Model";

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

  const debouncedSearch = useDebounce(searchQuery, 200);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (selectedPath.length > 0) {
      const [func, family, subfam] = selectedPath;
      if (func) result = result.filter(j => j.function === func);
      if (family) result = result.filter(j => j.family === family);
      if (subfam) result = result.filter(j => j.sub_family === subfam);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(q) || j.family.toLowerCase().includes(q) || j.sub_family?.toLowerCase().includes(q));
    }
    if (filterTrack !== "All") result = result.filter(j => (j.track || j.level?.[0]) === filterTrack[0]);
    if (filterAI !== "All") result = result.filter(j => j.ai_impact === filterAI);
    if (sortBy === "level") result.sort((a, b) => (a.level || "").localeCompare(b.level || ""));
    else if (sortBy === "headcount") result.sort((a, b) => b.headcount - a.headcount);
    else if (sortBy === "ai") result.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    else result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [jobs, selectedPath, debouncedSearch, filterTrack, filterAI, sortBy]);

  if (!model) return <Empty text="Select a project to begin the Job Architecture Audit." />;
  if (loading && showLoader) return <LoadingBar />;

  const AUDIT_TABS = [
    { id: "catalogue", label: "Catalogue" },
    { id: "ja-health", label: "Health" },
    { id: "validation", label: "Validation" },
    { id: "analytics", label: "Analytics" },
    { id: "ja-flags", label: "Flags" },
    { id: "compare", label: "Compare" },
  ];

  const healthVal = Number(analytics.health_score || 0);
  const healthCol = healthVal >= 70 ? "var(--success)" : healthVal >= 50 ? "var(--warning)" : "var(--risk)";
  const healthVerdict = healthVal >= 90 ? "Excellent" : healthVal >= 70 ? "Solid — minor gaps" : healthVal >= 50 ? "Needs work" : "Critical";

  return <div>
    <PageHeader icon={<Layers3 />} title="Job Architecture Audit" />
    {showLoader && <LoadingBar />}
    <ContextStrip items={[
      { label: "Headcount", value: String(stats.total_headcount || 0) },
      { label: "Families", value: String(stats.families || 0) },
      { label: "Roles", value: String(stats.total_roles || 0) },
      { label: "Health", value: `${healthVal}%`, color: healthCol },
    ]} />

    <TabBar tabs={AUDIT_TABS} active={tab} onChange={setTab} />

    {/* Catalogue */}
    {tab === "catalogue" && <div className="flex gap-4" style={{ minHeight: 400 }}>
      <div className="w-48 shrink-0 rounded-xl p-3 overflow-y-auto" style={{ maxHeight: "70vh", background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>Hierarchy</div>
        <button onClick={() => setSelectedPath([])} className="w-full text-left px-2 py-1.5 rounded-lg text-[12px] font-semibold mb-1" style={{ background: selectedPath.length === 0 ? "var(--accent-light)" : "transparent", color: selectedPath.length === 0 ? "var(--accent-primary)" : "var(--text-secondary)" }}>All ({jobs.length})</button>
        {tree.map(fn => (
          <div key={fn.label}>
            <button onClick={() => setSelectedPath([fn.label])} className="w-full text-left px-2 py-1.5 rounded text-[11px] truncate" style={{ background: selectedPath[0] === fn.label ? "var(--accent-light)" : "transparent", color: selectedPath[0] === fn.label ? "var(--accent-primary)" : "var(--text-secondary)" }}>{fn.label} ({fn.headcount})</button>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search roles..." className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--text-primary)" }}>
            <option value="level">Level</option><option value="headcount">Headcount</option><option value="ai">AI Impact</option><option value="alpha">A-Z</option>
          </select>
          <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--text-primary)" }}>
            <option value="All">All Tracks</option><option value="IC">IC</option><option value="Manager">Manager</option><option value="Executive">Executive</option>
          </select>
        </div>
        {filteredJobs.length === 0 ? <Empty text="No jobs match your filters." /> :
        <div className="space-y-1">
          {(() => { const maxHC = Math.max(...filteredJobs.map(fj => fj.headcount), 1); return filteredJobs.slice(0, 200).map((j, i) => {
            const tc = getTrackColor(j.level || j.track);
            return <div key={j.id} onClick={() => setSelectedJob(j)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group card-hover" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="w-[36px] shrink-0"><LevelBadge level={j.level} /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{j.title}</span>
                <span className="text-[11px] ml-1.5" style={{ color: "var(--text-muted)" }}>· {j.family}</span>
              </div>
              <div className="w-[60px] shrink-0 text-right text-[13px] font-bold" style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--text-primary)" }}>{j.headcount}</div>
              <div className="w-[100px] shrink-0">
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(j.headcount / maxHC) * 100}%`, background: tc }} />
                </div>
              </div>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: aiDot(j.ai_impact) }} title={`AI: ${j.ai_impact}`} />
            </div>;
          }); })()}
        </div>}
        <div className="mt-3 text-center" style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>{filteredJobs.length} of {jobs.length} roles</div>
      </div>
    </div>}

    {/* Health */}
    {tab === "ja-health" && <Suspense fallback={<LoadingBar />}><CatalogueHealth model={model} projectId={projectId} /></Suspense>}

    {/* Validation */}
    {tab === "validation" && (() => {
      const circumference = 2 * Math.PI * 55;
      const dashOffset = circumference * (1 - healthVal / 100);
      const passCount = flags.filter(fl => fl.severity === "info" || fl.severity === "pass").length;
      const warnCount = flags.filter(fl => fl.severity === "warning").length;
      const failCount = flags.filter(fl => fl.severity === "error" || fl.severity === "critical").length;
      const filtered = flagFilter === "All" ? flags : flags.filter(fl => fl.category === flagFilter);
      const categories = [...new Set(flags.map(fl => fl.category))];
      return <div>
        <div className="flex gap-4 mb-4">
          <div className="flex items-center justify-center" style={{ width: 140 }}>
            <svg width={130} height={130} viewBox="0 0 130 130"><circle cx={65} cy={65} r={55} fill="none" stroke="var(--border)" strokeWidth={8} /><circle cx={65} cy={65} r={55} fill="none" stroke={healthCol} strokeWidth={8} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 65 65)" /><text x={65} y={62} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "var(--text-primary)", fontFamily: "'JetBrains Mono',monospace" }}>{healthVal}%</text><text x={65} y={80} textAnchor="middle" style={{ fontSize: 10, fill: "var(--text-muted)" }}>{healthVerdict}</text></svg>
          </div>
          <div className="flex gap-3">
            <KpiCard label="Pass" value={passCount} /><KpiCard label="Warning" value={warnCount} /><KpiCard label="Fail" value={failCount} />
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setFlagFilter("All")} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: flagFilter === "All" ? "var(--accent-light)" : "var(--surface-1)", color: flagFilter === "All" ? "var(--accent-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>All</button>
          {categories.map(c => <button key={c} onClick={() => setFlagFilter(c)} className="px-3 py-1 rounded-lg text-[11px]" style={{ background: flagFilter === c ? "var(--accent-light)" : "var(--surface-1)", color: flagFilter === c ? "var(--accent-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>{c}</button>)}
        </div>
        <div className="space-y-1">
          {filtered.map((fl, i) => <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <Badge color={fl.severity === "error" || fl.severity === "critical" ? "var(--risk)" : fl.severity === "warning" ? "var(--warning)" : "var(--success)"}>{fl.severity}</Badge>
            <span className="text-[12px] flex-1" style={{ color: "var(--text-secondary)" }}>{fl.message}</span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{fl.category}</span>
          </div>)}
        </div>
      </div>;
    })()}

    {/* Analytics */}
    {tab === "analytics" && <div className="grid grid-cols-2 gap-4">
      <Card title="Track Composition">
        {(() => {
          const trackData = Object.entries(analytics.track_distribution || {}).map(([k, v]) => ({ name: k, value: Number(v) }));
          return trackData.length > 0 ? <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={trackData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{trackData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} /></PieChart></ResponsiveContainer> : <Empty text="No track data" />;
        })()}
      </Card>
      <Card title="Level Distribution">
        {(() => {
          const levelData = Object.entries(analytics.level_distribution || {}).map(([k, v]) => ({ name: k, count: Number(v) }));
          return levelData.length > 0 ? <ResponsiveContainer width="100%" height={200}><BarChart data={levelData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} /><YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} /><Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} /><Bar dataKey="count" fill="var(--accent-primary)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <Empty text="No level data" />;
        })()}
      </Card>
      <Card title="Family Size (Top 15)">
        {(() => {
          const famData = Object.entries(analytics.family_sizes || {}).map(([k, v]) => ({ name: k, count: Number(v) })).sort((a, b) => b.count - a.count).slice(0, 15);
          return famData.length > 0 ? <div>{famData.map(f => <div key={f.name} className="flex items-center gap-2 mb-1"><span className="text-[11px] w-32 truncate" style={{ color: "var(--text-secondary)" }}>{f.name}</span><div className="flex-1 h-[6px] rounded" style={{ background: "var(--border-light)" }}><div className="h-full rounded" style={{ width: `${(f.count / (famData[0]?.count || 1)) * 100}%`, background: "var(--accent-primary)" }} /></div><span className="text-[10px] w-8 text-right" style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>{f.count}</span></div>)}</div> : <Empty text="No family data" />;
        })()}
      </Card>
      <Card title="AI Impact Distribution">
        {(() => {
          const aiData = [
            { label: "High", count: jobs.filter(j => j.ai_impact === "High").length, color: "var(--risk)" },
            { label: "Moderate", count: jobs.filter(j => j.ai_impact === "Moderate").length, color: "var(--warning)" },
            { label: "Low", count: jobs.filter(j => j.ai_impact === "Low").length, color: "var(--success)" },
          ];
          return <div>{aiData.map(a => <div key={a.label} className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full" style={{ background: a.color }} /><span className="text-[12px] w-20" style={{ color: "var(--text-secondary)" }}>{a.label}</span><div className="flex-1 h-[6px] rounded" style={{ background: "var(--border-light)" }}><div className="h-full rounded" style={{ width: `${(a.count / Math.max(jobs.length, 1)) * 100}%`, background: a.color }} /></div><span className="text-[10px] w-8 text-right" style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>{a.count}</span></div>)}</div>;
        })()}
      </Card>
    </div>}

    {/* Flags */}
    {tab === "ja-flags" && <Suspense fallback={<LoadingBar />}><FlagRules projectId={projectId} scenarioId="" /></Suspense>}

    {/* Compare */}
    {tab === "compare" && <div>
      <div className="flex gap-2 mb-4">
        <select onChange={e => { const j = jobs.find(j => j.id === e.target.value); if (j && compareJobs.length < 4) setCompareJobs([...compareJobs, j]); e.target.value = ""; }} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--text-primary)" }}>
          <option value="">Add role to compare...</option>
          {jobs.filter(j => !compareJobs.find(c => c.id === j.id)).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        {compareJobs.length > 0 && <button onClick={() => setCompareJobs([])} className="px-3 py-1 rounded-lg text-[11px]" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Clear</button>}
      </div>
      {compareJobs.length >= 2 ? <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
        <thead><tr>{["Attribute", ...compareJobs.map(j => j.title)].map((h, i) => <th key={i} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>)}</tr></thead>
        <tbody>{["level", "track", "family", "headcount", "ai_impact", "ai_score", "function", "tasks_mapped"].map(attr => <tr key={attr}><td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>{attr}</td>{compareJobs.map((j, i) => <td key={i} style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>{String((j as any)[attr] ?? "—")}</td>)}</tr>)}</tbody>
      </table></div> : <Empty text="Select at least 2 roles to compare." />}
    </div>}

    <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--sem-info-bg)", border: "1px solid var(--sem-info-border)", borderRadius: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ready to design? </span>
      <button onClick={() => onNavigate?.("ja-design")} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}>Open Job Architecture Design Tool &rarr;</button>
    </div>

    <FlowNav previous={{ id: "snapshot", label: "Workforce Snapshot" }} next={{ id: "ja-design", label: "JA Design Tool" }} onNavigate={onBack} />
  </div>;
}
