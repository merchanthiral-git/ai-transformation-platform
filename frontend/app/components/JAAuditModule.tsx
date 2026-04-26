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
import { computeFindingsDigest, generateNarrative, putFinding } from "@/lib/ja-findings";
import type { JAData, FindingsDigest, Finding as JAFinding, NarrativeOutput } from "@/lib/ja-findings";

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
/* ═══ CLUSTERING VIEW — folded from DiagnoseModule.RoleClustering ═══ */
function ClusteringView({ model, f, onNavigate }: { model: string; f: Filters; onNavigate?: (id: string) => void }) {
  const [clData, setClData] = useState<Record<string, unknown> | null>(null);
  const [clLoading, setClLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [deptFilter, setDeptFilter] = useState("All");
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    const slow = setTimeout(() => { if (!cancelled) setClLoading(true); }, 150);
    api.getRoleClusters(model, f).then(d => { if (cancelled) return; clearTimeout(slow); setClData(d as Record<string, unknown>); setClLoading(false); }).catch(() => { if (cancelled) return; clearTimeout(slow); setClLoading(false); });
    return () => { cancelled = true; clearTimeout(slow); };
  }, [model, f]);

  if (clLoading) return <div className="space-y-4 mt-4"><LoadingSkeleton rows={5} /><LoadingSkeleton rows={5} /></div>;

  const clusters = (clData?.clusters ?? []) as Array<{ name: string; roles: string[]; headcount: number; avg_overlap: number; function: string; shared_skills: string[]; highest_pair?: [string, string, number] }>;
  const opportunities = (clData?.opportunities ?? []) as Array<{ role_a: string; role_b: string; similarity: number; estimated_savings: number; headcount_affected: number; risk: string }>;
  const summary = (clData?.summary ?? {}) as Record<string, unknown>;
  const pairs = (clData?.pairs ?? []) as Array<{ role_a: string; role_b: string; similarity: number }>;

  if (clusters.length === 0) return <Empty text="No consolidation opportunities detected — your job architecture has minimal redundancy." icon={<Layers3 size={20} />} />;

  const departments = Array.from(new Set(clusters.map(c => c.function).filter(Boolean))).sort();
  const filtered = deptFilter === "All" ? clusters : clusters.filter(c => c.function === deptFilter);
  const totalSavings = opportunities.reduce((s, o) => s + (o.estimated_savings || 0), 0);
  const overlapColor = (pct: number) => pct >= 70 ? "#8ba87a" : pct >= 50 ? "#f4a83a" : "#8a7f6d";
  const MONO = "'JetBrains Mono', monospace";

  return <div>
    <div className="grid grid-cols-4 gap-3 mb-4">
      <KpiCard label="Clusters" value={Number(summary.total_clusters || clusters.length)} />
      <KpiCard label="Consolidation Opps" value={opportunities.length} accent />
      <KpiCard label="Potential Savings" value={`$${Math.round(totalSavings / 1000)}K`} />
      <KpiCard label="Roles Affected" value={`${Number(summary.roles_affected || 0)}/${Number(summary.total_roles || 0)}`} />
    </div>

    <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
      <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "var(--text-primary)", outline: "none" }}>
        <option value="All">All Departments</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filtered.length} of {clusters.length} clusters</span>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filtered.map((c, idx) => {
        const isExpanded = expandedCluster === idx;
        const opp = opportunities.find(o => c.roles.includes(o.role_a) && c.roles.includes(o.role_b));
        const isReviewed = reviewed.has(idx);
        return <div key={idx} style={{ background: "var(--surface-1)", border: `1px solid ${isReviewed ? "rgba(139,168,122,0.2)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
          <button onClick={() => setExpandedCluster(isExpanded ? null : idx)} style={{ width: "100%", padding: "12px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0 }}>{c.roles.length}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{c.headcount} employees · {c.roles.length} roles · {c.function}</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: MONO, background: `${overlapColor(c.avg_overlap)}15`, color: overlapColor(c.avg_overlap) }}>Overlap: {c.avg_overlap.toFixed(1)}%</span>
            {isReviewed && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(139,168,122,0.1)", color: "#8ba87a" }}>Reviewed</span>}
            <span style={{ fontSize: 14, color: "var(--text-muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {isExpanded && <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>ROLES IN THIS CLUSTER</div>
              {c.roles.map((r, ri) => {
                const pairData = pairs.find(p => (p.role_a === r || p.role_b === r) && c.roles.includes(p.role_a) && c.roles.includes(p.role_b));
                return <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: ri < c.roles.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{r}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: overlapColor(pairData?.similarity || c.avg_overlap) }}>{(pairData?.similarity || c.avg_overlap).toFixed(1)}%</span>
                </div>;
              })}
            </div>
            {opp && <div style={{ background: "rgba(244,168,58,0.04)", border: "1px solid rgba(244,168,58,0.15)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-primary)", marginBottom: 6 }}>RECOMMENDED ACTION</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Consolidate {opp.role_a} and {opp.role_b}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                <span>Savings: <strong style={{ color: "#8ba87a" }}>${Math.round(opp.estimated_savings / 1000)}K</strong></span>
                <span>Affects: <strong>{opp.headcount_affected}</strong></span>
                <span>Risk: <strong style={{ color: opp.risk === "Low" ? "#8ba87a" : opp.risk === "High" ? "#e87a5d" : "#f4a83a" }}>{opp.risk}</strong></span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {onNavigate && <button onClick={() => onNavigate("build")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--accent-primary)", color: "#fff", border: "none", cursor: "pointer" }}>Add to Design</button>}
                <button onClick={() => setReviewed(prev => { const s = new Set(prev); s.add(idx); return s; })} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "transparent", color: isReviewed ? "#8ba87a" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>{isReviewed ? "Reviewed" : "Mark Reviewed"}</button>
              </div>
            </div>}
            {c.shared_skills.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center" }}>Shared:</span>
              {c.shared_skills.map(s => <span key={s} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{s}</span>)}
            </div>}
          </div>}
        </div>;
      })}
    </div>
  </div>;
}

export function JAAuditModule({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [viewMode, setViewMode] = useState<'executive' | 'analyst'>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('ja_audit_view_mode') as 'executive' | 'analyst') || 'executive';
    }
    return 'executive';
  });
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

  // Findings digest — memoized on data identity (only recomputes when API responds)
  const digest = useMemo(() => computeFindingsDigest(data as JAData | null, model), [data, model]);
  const narrative = useMemo(() => generateNarrative(digest), [digest]);

  const handleViewModeChange = useCallback((mode: 'executive' | 'analyst') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') sessionStorage.setItem('ja_audit_view_mode', mode);
  }, []);

  const handleDrillToAnalyst = useCallback((finding: JAFinding) => {
    handleViewModeChange('analyst');
    setTab('findings');
    setFlagFilter(finding.category);
  }, [handleViewModeChange]);

  const handleSendToBuilder = useCallback((finding: JAFinding) => {
    putFinding(finding);
    onNavigate?.('ja-design');
  }, [onNavigate]);

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
    { id: "findings", label: "Findings" },
    { id: "analytics", label: "Analytics" },
    { id: "compare", label: "Compare" },
    { id: "consolidation", label: "Consolidation" },
  ];

  const healthVal = digest.maturityScore;
  const healthCol = healthVal >= 70 ? "var(--success)" : healthVal >= 50 ? "var(--warning)" : "var(--risk)";

  return <div>
    <div className="flex items-center justify-between mb-3">
      <PageHeader icon={<Layers3 />} title="Job Architecture Audit" moduleId="ja-audit" />
      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--surface-1)', borderRadius: 8, padding: 2, border: '0.5px solid var(--border)' }}>
        {(['executive', 'analyst'] as const).map(mode => (
          <button key={mode} onClick={() => handleViewModeChange(mode)} style={{
            padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: "'Inter Tight', sans-serif",
            background: viewMode === mode ? 'var(--accent-primary)' : 'transparent',
            color: viewMode === mode ? '#fff' : 'var(--text-muted)',
            transition: 'all 150ms ease',
          }}>
            {mode === 'executive' ? 'Executive' : 'Analyst'}
          </button>
        ))}
      </div>
    </div>
    {showLoader && <LoadingBar />}

    {/* ═══ EXECUTIVE VIEW ═══ */}
    {viewMode === 'executive' && <div className="space-y-5">
      {/* 1. Diagnosis card */}
      <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Architecture Diagnosis</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{narrative.headlineSentence}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: healthCol }}>{digest.maturityScore}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: healthCol }}>{digest.maturityRating}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{narrative.diagnosisSummary}</p>
      </div>

      {/* 2. Top findings strip */}
      {narrative.topFindingCards.length > 0 && <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Top Findings by Executive Impact</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(narrative.topFindingCards.length, 3)}, 1fr)` }}>
          {digest.topFindings.slice(0, 5).map((finding, i) => {
            const card = narrative.topFindingCards[i];
            if (!card) return null;
            const severityColor = finding.severity === 'critical' ? 'var(--risk)' : finding.severity === 'high' ? 'var(--warning)' : 'var(--accent-primary)';
            return <div key={finding.id} style={{
              background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 10,
              borderLeft: `3px solid ${severityColor}`, padding: '14px 16px', cursor: 'pointer',
            }} onClick={() => handleDrillToAnalyst(finding)}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{card.headline}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{card.soWhat}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)' }}>{card.exposureLabel}</div>
            </div>;
          })}
        </div>
      </div>}

      {/* 3. Lens grid */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Executive Lenses</div>
        <div className="grid grid-cols-3 gap-4">
          {/* Peer comparison lens */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>How do we compare to peers?</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{narrative.lensNarratives.peerComparison}</p>
            <div className="space-y-2">
              {digest.maturityDimensions.map(dim => (
                <div key={dim.id} className="flex items-center gap-2">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>{dim.name}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-light)', position: 'relative' }}>
                    {/* Peer range bar */}
                    <div style={{ position: 'absolute', left: `${dim.peerP25}%`, width: `${dim.peerP75 - dim.peerP25}%`, height: '100%', borderRadius: 3, background: 'rgba(91,141,239,0.15)' }} />
                    {/* Our score dot */}
                    <div style={{ position: 'absolute', left: `${dim.score}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: dim.score >= dim.peerMedian ? 'var(--success)' : 'var(--warning)', border: '1.5px solid var(--surface-1)' }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', width: 24, textAlign: 'right' }}>{dim.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Structural risks lens */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Where are the structural risks?</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{narrative.lensNarratives.structuralRisks}</p>
            <div className="space-y-2">
              {(['span', 'pay-equity', 'retention', 'succession', 'regulatory'] as const).map(risk => {
                const findings = digest.byRiskCategory[risk] || [];
                if (findings.length === 0) return null;
                const people = findings.reduce((s, f) => s + f.peopleAffected, 0);
                return <div key={risk} className="flex items-center gap-2">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80, flexShrink: 0, textTransform: 'capitalize' }}>{risk.replace('-', ' ')}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-light)' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: findings[0]?.severity === 'critical' ? 'var(--risk)' : 'var(--warning)', width: `${Math.min((people / Math.max(digest.totals.totalPeopleExposed, 1)) * 100, 100)}%` }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{people}</span>
                </div>;
              })}
            </div>
          </div>

          {/* Prioritized roadmap lens */}
          <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>What should we fix first?</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{narrative.lensNarratives.prioritizedRoadmap}</p>
            <div className="space-y-2">
              {digest.topFindings.slice(0, 4).map(f => {
                const effortColor = f.remediation.estimatedEffort === 'low' ? 'var(--success)' : f.remediation.estimatedEffort === 'medium' ? 'var(--warning)' : 'var(--risk)';
                return <div key={f.id} className="flex items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => handleSendToBuilder(f)}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: effortColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{f.remediation.action}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase', color: effortColor }}>{f.remediation.estimatedEffort}</span>
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>}

    {/* ═══ ANALYST VIEW ═══ */}
    {viewMode === 'analyst' && <>
    <ContextStrip items={[
      `Headcount: ${jobs.reduce((s, j) => s + j.headcount, 0).toLocaleString()}`,
      `Families: ${new Set(jobs.map(j => j.family).filter(Boolean)).size}`,
      `Roles: ${jobs.length}`,
      `Health: ${healthVal}%`,
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

    {/* Findings — merged from Validation + Flags */}
    {tab === "findings" && <div>
      <div className="flex gap-4 mb-4">
        <div className="flex items-center justify-center" style={{ width: 140 }}>
          {(() => { const circumference = 2 * Math.PI * 55; const dashOffset = circumference * (1 - healthVal / 100); return (
            <svg width={130} height={130} viewBox="0 0 130 130"><circle cx={65} cy={65} r={55} fill="none" stroke="var(--border)" strokeWidth={8} /><circle cx={65} cy={65} r={55} fill="none" stroke={healthCol} strokeWidth={8} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 65 65)" /><text x={65} y={62} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "var(--text-primary)", fontFamily: "'JetBrains Mono',monospace" }}>{healthVal}</text><text x={65} y={80} textAnchor="middle" style={{ fontSize: 10, fill: "var(--text-muted)" }}>{digest.maturityRating}</text></svg>
          ); })()}
        </div>
        <div className="flex gap-3">
          <KpiCard label="Critical" value={digest.totals.critical} /><KpiCard label="High" value={digest.totals.high} /><KpiCard label="Medium" value={digest.totals.medium} /><KpiCard label="Low" value={digest.totals.low} />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setFlagFilter("All")} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: flagFilter === "All" ? "var(--accent-light)" : "var(--surface-1)", color: flagFilter === "All" ? "var(--accent-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>All ({digest.findings.length})</button>
        {Object.keys(digest.byCategory).map(c => <button key={c} onClick={() => setFlagFilter(c)} className="px-3 py-1 rounded-lg text-[11px]" style={{ background: flagFilter === c ? "var(--accent-light)" : "var(--surface-1)", color: flagFilter === c ? "var(--accent-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>{c.replace(/-/g, ' ')}</button>)}
      </div>
      <div className="space-y-1">
        {(flagFilter === "All" ? digest.findings : digest.findings.filter(f => f.category === flagFilter)).map(finding => {
          const severityColor = finding.severity === 'critical' ? 'var(--risk)' : finding.severity === 'high' ? 'var(--warning)' : finding.severity === 'medium' ? 'var(--accent-primary)' : 'var(--text-muted)';
          return <div key={finding.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <Badge color={severityColor}>{finding.severity}</Badge>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{finding.entityLabel}</div>
              <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{finding.ruleName}: {finding.measurement} (threshold: {finding.threshold})</div>
            </div>
            {finding.managerLabel && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{finding.managerLabel}</span>}
            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>{finding.peopleAffected} roles</span>
            <button onClick={() => handleSendToBuilder(finding)} className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--accent-light)", color: "var(--accent-primary)", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Send to Builder →
            </button>
          </div>;
        })}
      </div>
    </div>}

    {/* Analytics — computed from jobs[] directly to avoid array/record shape mismatch */}
    {tab === "analytics" && <div className="grid grid-cols-2 gap-4">
      <Card title="Track Composition">
        {(() => {
          const trackNames: Record<string, string> = { S: "Support", P: "Professional", M: "Management", E: "Executive", T: "Technical" };
          const trackCounts: Record<string, number> = {};
          jobs.forEach(j => { const t = j.level?.[0] || j.track?.[0] || "P"; trackCounts[t] = (trackCounts[t] || 0) + j.headcount; });
          const trackData = Object.entries(trackCounts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: trackNames[k] || k, value: v }));
          return trackData.length > 0 ? <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={trackData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{trackData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} /></PieChart></ResponsiveContainer> : <Empty text="No track data" />;
        })()}
      </Card>
      <Card title="Level Distribution">
        {(() => {
          const levelCounts: Record<string, number> = {};
          jobs.forEach(j => { if (j.level) levelCounts[j.level] = (levelCounts[j.level] || 0) + j.headcount; });
          const levelData = Object.entries(levelCounts).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => a.name.localeCompare(b.name));
          return levelData.length > 0 ? <ResponsiveContainer width="100%" height={200}><BarChart data={levelData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} /><YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} /><Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} /><Bar dataKey="count" fill="var(--accent-primary)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <Empty text="No level data" />;
        })()}
      </Card>
      <Card title="Family Size (Top 15)">
        {(() => {
          const famCounts: Record<string, number> = {};
          jobs.forEach(j => { if (j.family) famCounts[j.family] = (famCounts[j.family] || 0) + j.headcount; });
          const famData = Object.entries(famCounts).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 15);
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

    {tab === "consolidation" && <ClusteringView model={model} f={f} onNavigate={onNavigate} />}

    <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--sem-info-bg)", border: "1px solid var(--sem-info-border)", borderRadius: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ready to design? </span>
      <button onClick={() => onNavigate?.("ja-design")} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}>Open Job Architecture Design Tool &rarr;</button>
    </div>
    </>}

    <FlowNav previous={{ target: { kind: "module", moduleId: "snapshot" }, label: "Workforce Snapshot" }} next={{ target: { kind: "module", moduleId: "ja-design" }, label: "JA Design Tool" }} />
  </div>;
}
