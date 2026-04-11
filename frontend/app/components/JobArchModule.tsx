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
   JOB ARCHITECTURE MODULE — premium consulting-grade experience
   ═══════════════════════════════════════════════════════════════ */

export function JobArchitectureModule({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
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
    api.getJobArchitecture(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
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

  if (loading) return <div><PageHeader icon="🏗️" title="Job Architecture" subtitle="Enterprise job catalogue, hierarchy, and career framework" onBack={onBack} /><LoadingBar /><div className="grid grid-cols-3 gap-4"><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /><LoadingSkeleton rows={8} /></div></div>;

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
      { id: "map", label: "🗺️ Architecture Map" },
      { id: "validation", label: "✅ Validation" },
      { id: "analytics", label: "📊 Analytics" },
      { id: "compare", label: "⚖️ Compare" },
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
                  return <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
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
