"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import {
  ViewContext, COLORS,
  KpiCard, Card, Empty, Badge, InsightPanel, DataTable,
  BarViz, DonutViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ContextStrip,
  useApiData, usePersisted, callAI, showToast, JobDesignState, fmtNum,
} from "./shared";
import { Sparkle } from "@/lib/icons";
import { FlowNav } from "@/app/ui";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const SKILL_TABS = [
  { id: "library", label: "Library" },
  { id: "mapping", label: "Mapping" },
  { id: "proficiency", label: "Proficiency" },
  { id: "graph", label: "Graph" },
  { id: "intelligence", label: "Intelligence" },
  { id: "integration", label: "Integration" },
  { id: "governance", label: "Governance" },
];

const CAT_COLORS: Record<string, string> = {
  technical: "#f4a83a", functional: "#f4a83a", leadership: "#a78bb8", adaptive: "#8ba87a",
};

const PROFICIENCY_LEVELS = [
  { level: 1, label: "Foundational", anchor: "Applies concepts with guidance; follows established procedures" },
  { level: 2, label: "Proficient", anchor: "Works independently; adapts methods to common situations" },
  { level: 3, label: "Advanced", anchor: "Coaches others; handles complex/novel situations confidently" },
  { level: 4, label: "Expert", anchor: "Shapes strategy; recognized authority; innovates new approaches" },
];

const INTEL_TABS = [
  { id: "gaps", label: "Gap Analysis" },
  { id: "demand", label: "Demand Forecast" },
  { id: "adjacency", label: "Adjacency" },
  { id: "automation", label: "Automation Risk" },
];

const INTEGRATION_MODULES = ["Job Architecture", "Work Design Lab", "Talent Marketplace", "Reskilling", "BBBA", "Headcount Planning", "Operating Model"];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function catColor(cat: string) { return CAT_COLORS[cat?.toLowerCase()] || "var(--text-muted)"; }

function trendIcon(t: string) {
  if (t === "Rising") return "\u2197";
  if (t === "Declining") return "\u2198";
  return "\u2192";
}

function pctBar(val: number, color: string, w = 80) {
  return <div style={{ width: w, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(val, 100)}%`, height: "100%", borderRadius: 3, background: color }} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   FORCE GRAPH HELPERS
   ═══════════════════════════════════════════════════════════════ */

type GNode = { id: string; label: string; category: string; type: string; usage: number; x: number; y: number; vx: number; vy: number };
type GEdge = { source: string; target: string; style: string; weight: number };

function runForceSimulation(nodes: GNode[], edges: GEdge[], width: number, height: number) {
  const cx = width / 2, cy = height / 2;
  // Random initial positions
  nodes.forEach(n => { n.x = cx + (Math.random() - 0.5) * width * 0.6; n.y = cy + (Math.random() - 0.5) * height * 0.6; n.vx = 0; n.vy = 0; });
  const edgeMap = edges.map(e => ({ s: nodes.findIndex(n => n.id === e.source), t: nodes.findIndex(n => n.id === e.target), w: e.weight || 1 })).filter(e => e.s >= 0 && e.t >= 0);

  for (let tick = 0; tick < 200; tick++) {
    const alpha = 1 - tick / 200;
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (800 * alpha) / (dist * dist);
        dx = (dx / dist) * force; dy = (dy / dist) * force;
        nodes[i].vx -= dx; nodes[i].vy -= dy;
        nodes[j].vx += dx; nodes[j].vy += dy;
      }
    }
    // Attraction along edges
    for (const e of edgeMap) {
      let dx = nodes[e.t].x - nodes[e.s].x, dy = nodes[e.t].y - nodes[e.s].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 100) * 0.005 * alpha * e.w;
      dx = (dx / dist) * force; dy = (dy / dist) * force;
      nodes[e.s].vx += dx; nodes[e.s].vy += dy;
      nodes[e.t].vx -= dx; nodes[e.t].vy -= dy;
    }
    // Gravity toward center
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.001 * alpha;
      n.vy += (cy - n.y) * 0.001 * alpha;
    }
    // Velocity damping + position update
    for (const n of nodes) {
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(30, Math.min(width - 30, n.x));
      n.y = Math.max(30, Math.min(height - 30, n.y));
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function SkillsEngine({ model, f, onBack, onNavigate, viewCtx, jobStates }: {
  model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void;
  viewCtx?: ViewContext; jobStates?: Record<string, JobDesignState>;
}) {
  /* ── All hooks at the top ── */
  const [tab, setTab] = usePersisted("skills_tab", "library");
  const [catFilter, setCatFilter] = useState("All");
  const [trendFilter, setTrendFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Record<string, unknown> | null>(null);
  const [mappingView, setMappingView] = useState<"job" | "skill">("job");
  const [intelTab, setIntelTab] = useState("gaps");
  const [gapScope, setGapScope] = useState("org");
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [graphCatFilter, setGraphCatFilter] = useState("All");
  const [graphSelectedNode, setGraphSelectedNode] = useState<string | null>(null);
  const [graphSearch, setGraphSearch] = useState("");
  const [inferTitle, setInferTitle] = useState("");
  const [inferring, setInferring] = useState(false);
  const [inferredSkills, setInferredSkills] = useState<Record<string, unknown>[]>([]);

  // Pan/zoom state for graph
  const [graphTransform, setGraphTransform] = useState({ x: 0, y: 0, scale: 1 });
  const graphRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  // API data hooks — all unconditional
  const [libraryData, libraryLoading] = useApiData(
    () => api.getSkillsLibrary(catFilter === "All" ? undefined : catFilter.toLowerCase(), trendFilter === "All" ? undefined : trendFilter),
    [catFilter, trendFilter]
  );
  const [detailData, detailLoading] = useApiData(
    () => selectedSkill ? api.getSkillDetail(String(selectedSkill.id || "")) : Promise.resolve(null),
    [selectedSkill?.id]
  );
  const [mappingsData, mappingsLoading] = useApiData(() => api.getSkillsMappings(mappingView), [mappingView]);
  const [graphData, graphLoading] = useApiData(() => api.getSkillsGraph(graphCatFilter === "All" ? undefined : graphCatFilter.toLowerCase()), [graphCatFilter]);
  const [gapsData, gapsLoading] = useApiData(() => api.getSkillsGaps(gapScope), [gapScope]);
  const [forecastData, forecastLoading] = useApiData(() => api.getSkillsDemandForecast(forecastHorizon), [forecastHorizon]);
  const [autoRiskData, autoRiskLoading] = useApiData(() => api.getSkillsAutomationRisk(), []);
  const [eventsData, eventsLoading] = useApiData(() => api.getSkillsEvents(50), []);
  const [taxonomyData] = useApiData(() => api.getSkillsTaxonomy(), []);

  // Derived data
  const skills = useMemo(() => (libraryData?.skills as Record<string, unknown>[]) || [], [libraryData]);
  const totalSkills = Number(libraryData?.total || skills.length);
  const mappings = useMemo(() => (mappingsData?.mappings as Record<string, unknown>[]) || [], [mappingsData]);
  const graphNodes = useMemo(() => (graphData?.nodes as Record<string, unknown>[]) || [], [graphData]);
  const graphEdges = useMemo(() => (graphData?.edges as Record<string, unknown>[]) || [], [graphData]);
  const events = useMemo(() => (eventsData?.events as Record<string, unknown>[]) || [], [eventsData]);

  // Filtered skills for library
  const filteredSkills = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter((s: Record<string, unknown>) => String(s.name || "").toLowerCase().includes(q) || String(s.category || "").toLowerCase().includes(q));
  }, [skills, search]);

  // KPI computations
  const kpis = useMemo(() => {
    const mapped = skills.filter((s: Record<string, unknown>) => Number(s.jobs_using || 0) > 0).length;
    const coverage = totalSkills > 0 ? Math.round((mapped / totalSkills) * 100) : 0;
    const byCat: Record<string, number> = {};
    skills.forEach((s: Record<string, unknown>) => { const c = String(s.category || "Other"); byCat[c] = (byCat[c] || 0) + 1; });
    return { total: totalSkills, coverage, byCat, mapped };
  }, [skills, totalSkills]);

  // Force-layout graph computation
  const layoutGraph = useMemo(() => {
    if (!graphNodes.length) return { nodes: [] as GNode[], edges: [] as GEdge[] };
    const W = 900, H = 600;
    const nodes: GNode[] = graphNodes.map((n: Record<string, unknown>) => ({
      id: String(n.id || ""), label: String(n.label || n.name || n.id || ""),
      category: String(n.category || "technical"), type: String(n.type || "skill"),
      usage: Number(n.usage || n.weight || 1), x: 0, y: 0, vx: 0, vy: 0,
    }));
    const edges: GEdge[] = graphEdges.map((e: Record<string, unknown>) => ({
      source: String(e.source || ""), target: String(e.target || ""),
      style: String(e.style || (e.type === "adjacency" ? "dashed" : "solid")),
      weight: Number(e.weight || 1),
    }));
    runForceSimulation(nodes, edges, W, H);
    return { nodes, edges };
  }, [graphNodes, graphEdges]);

  // Graph mouse handlers
  const handleGraphMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: graphTransform.x, origY: graphTransform.y };
  }, [graphTransform]);

  const handleGraphMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX, dy = e.clientY - dragRef.current.startY;
    setGraphTransform(prev => ({ ...prev, x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }));
  }, []);

  const handleGraphMouseUp = useCallback(() => { dragRef.current.dragging = false; }, []);

  const handleGraphWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setGraphTransform(prev => ({ ...prev, scale: Math.max(0.3, Math.min(3, prev.scale - e.deltaY * 0.001)) }));
  }, []);

  // Infer skills handler
  const handleInfer = useCallback(async () => {
    if (!inferTitle.trim()) return;
    setInferring(true);
    try {
      const res = await api.inferSkills(inferTitle);
      const inferred = (res?.inferred_skills as Record<string, unknown>[]) || [];
      setInferredSkills(inferred);
      showToast(`Inferred ${inferred.length} skills`);
    } catch { showToast("Skill inference couldn't complete — try again in a moment"); }
    setInferring(false);
  }, [inferTitle]);

  // Graph insights
  const graphInsights = useMemo(() => {
    if (!layoutGraph.nodes.length) return [];
    const edgeCount: Record<string, number> = {};
    layoutGraph.edges.forEach(e => { edgeCount[e.source] = (edgeCount[e.source] || 0) + 1; edgeCount[e.target] = (edgeCount[e.target] || 0) + 1; });
    const sorted = layoutGraph.nodes.slice().sort((a, b) => (edgeCount[b.id] || 0) - (edgeCount[a.id] || 0));
    const insights: string[] = [];
    if (sorted[0]) insights.push(`Most connected: ${sorted[0].label} (${edgeCount[sorted[0].id] || 0} links)`);
    insights.push(`${layoutGraph.nodes.length} nodes, ${layoutGraph.edges.length} edges`);
    const cats = new Set(layoutGraph.nodes.map(n => n.category));
    insights.push(`${cats.size} categories represented`);
    return insights;
  }, [layoutGraph]);

  /* ═══ RENDER ═══ */

  const contextItems = useMemo(() => {
    const items = [`${fmtNum(kpis.total, "headcount")} skills`, `${kpis.coverage}% coverage`];
    Object.entries(kpis.byCat).forEach(([k, v]) => items.push(`${k}: ${v}`));
    return items;
  }, [kpis]);

  return (
    <div className="space-y-4">
      <PageHeader icon={<Sparkle />} title="Skills Engine" subtitle="Enterprise skills intelligence, mapping, and graph exploration" onBack={onBack} moduleId="skills" viewCtx={viewCtx} />
      <ContextStrip items={contextItems} />
      <TabBar tabs={SKILL_TABS} active={tab} onChange={setTab} />

      {/* ─── Tab 1: Library ─── */}
      {tab === "library" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="Total Skills" value={fmtNum(kpis.total, "headcount")} accent />
            <KpiCard label="Coverage" value={`${kpis.coverage}%`} />
            <KpiCard label="Mapped to Jobs" value={fmtNum(kpis.mapped, "headcount")} />
            <KpiCard label="Categories" value={String(Object.keys(kpis.byCat).length)} />
          </div>

          {/* Filters + search */}
          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-56 focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
                <option value="All">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Functional">Functional</option>
                <option value="Leadership">Leadership</option>
                <option value="Adaptive">Adaptive</option>
              </select>
              <select value={trendFilter} onChange={e => setTrendFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
                <option value="All">All Trends</option>
                <option value="Rising">Rising</option>
                <option value="Stable">Stable</option>
                <option value="Declining">Declining</option>
              </select>
              <div className="ml-auto flex items-center gap-2">
                <input value={inferTitle} onChange={e => setInferTitle(e.target.value)} placeholder="Job title for AI inference..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-52 placeholder:text-[var(--text-muted)]" />
                <button onClick={handleInfer} disabled={inferring || !inferTitle.trim()} className="px-3 py-1.5 rounded-md text-[15px] font-semibold border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors disabled:opacity-40">
                  {inferring ? "Inferring..." : "Infer Skills via AI"}
                </button>
              </div>
            </div>
          </Card>

          {/* Inferred skills panel */}
          {inferredSkills.length > 0 && (
            <Card title="AI-Inferred Skills">
              <div className="flex flex-wrap gap-2">
                {inferredSkills.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                    <span className="w-2 h-2 rounded-full" style={{ background: catColor(String(s.category || "")) }} />
                    <span className="text-[15px] text-[var(--text-primary)]">{String(s.name || s.skill || "")}</span>
                    <Badge color={catColor(String(s.category || ""))}>{String(s.category || "")}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Skills table */}
          {libraryLoading ? <LoadingSkeleton rows={8} /> : !filteredSkills.length ? <Empty text="No Skills Found" subtitle="Adjust filters or use AI Suggest to infer skills from your workforce data." /> : (
            <div className="relative">
              <Card>
                <div className="scroll-shadow rounded-lg border border-[var(--border)]">
                  <table className="w-full text-left" style={{ minWidth: 900 }}>
                    <thead><tr className="bg-[var(--surface-2)]">
                      {["Name", "Category", "Strategic Importance", "Trend", "Automation Risk", "Transferability", "# Jobs"].map(h => (
                        <th key={h} className="px-3 py-2 text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b-2 border-[var(--border)] whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {filteredSkills.slice(0, 50).map((s: Record<string, unknown>, i: number) => (
                        <tr key={String(s.id || i)} onClick={() => setSelectedSkill(s)} className="border-b border-[var(--border)] hover:bg-[var(--hover)] cursor-pointer transition-colors">
                          <td className="px-3 py-2 text-[15px] text-[var(--text-primary)] font-medium">{String(s.name || "")}</td>
                          <td className="px-3 py-2"><Badge color={catColor(String(s.category || ""))}>{String(s.category || "")}</Badge></td>
                          <td className="px-3 py-2 text-[15px] text-[var(--text-secondary)]">{String(s.strategic_importance || s.importance || "Medium")}</td>
                          <td className="px-3 py-2 text-[15px] text-[var(--text-secondary)]">
                            <span style={{ color: String(s.trend) === "Rising" ? "var(--success)" : String(s.trend) === "Declining" ? "var(--risk)" : "var(--text-muted)" }}>
                              {trendIcon(String(s.trend || "Stable"))} {String(s.trend || "Stable")}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {pctBar(Number(s.automation_risk || 0), "var(--warning)")}
                              <span className="text-[13px] text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Number(s.automation_risk || 0)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[15px] text-[var(--text-secondary)]">{String(s.transferability || "Medium")}</td>
                          <td className="px-3 py-2 text-[15px] text-[var(--text-secondary)] font-data">{fmtNum(Number(s.jobs_using || 0), "headcount")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Detail slide-in panel */}
              {selectedSkill && (
                <div className="fixed top-0 right-0 h-full w-[420px] z-50 border-l border-[var(--border)] overflow-y-auto" style={{ background: "var(--surface-1)", boxShadow: "-8px 0 24px rgba(0,0,0,0.3)" }}>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[20px] font-bold text-[var(--text-primary)] font-heading">{String(selectedSkill.name || "")}</h3>
                      <button onClick={() => setSelectedSkill(null)} className="text-[18px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">&times;</button>
                    </div>
                    <Badge color={catColor(String(selectedSkill.category || ""))}>{String(selectedSkill.category || "")}</Badge>
                    <p className="text-[15px] text-[var(--text-secondary)]">{String(detailData?.description || selectedSkill.description || "No description available.")}</p>

                    {/* Proficiency scale */}
                    <div>
                      <h4 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Proficiency Scale</h4>
                      {PROFICIENCY_LEVELS.map(p => (
                        <div key={p.level} className="flex gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: catColor(String(selectedSkill.category || "")), color: "#fff" }}>{p.level}</div>
                          <div><div className="text-[14px] font-semibold text-[var(--text-primary)]">{p.label}</div><div className="text-[13px] text-[var(--text-muted)]">{p.anchor}</div></div>
                        </div>
                      ))}
                    </div>

                    {/* Adjacencies */}
                    {!!(detailData?.adjacencies) && (
                      <div>
                        <h4 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Adjacent Skills <span className="text-[12px] font-normal text-[var(--text-muted)]">(skill overlap between roles)</span></h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(detailData.adjacencies as Record<string, unknown>[]).map((a, i) => (
                            <span key={i} className="px-2 py-0.5 text-[13px] rounded-md border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)]">{String(a.name || a)}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Jobs using */}
                    {!!(detailData?.jobs_using) && (
                      <div>
                        <h4 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Used In Jobs</h4>
                        {(detailData.jobs_using as Record<string, unknown>[]).map((j, i) => (
                          <div key={i} className="text-[15px] text-[var(--text-secondary)] py-1 border-b border-[var(--border)]">{String(j.title || j.name || j)}</div>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-[13px] text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border)]">
                      <div>Automation Risk: {Number(selectedSkill.automation_risk || 0)}%</div>
                      <div>Trend: {String(selectedSkill.trend || "Stable")}</div>
                      <div>Transferability: {String(selectedSkill.transferability || "Medium")}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 2: Mapping ─── */}
      {tab === "mapping" && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setMappingView("job")} className={`px-4 py-1.5 rounded-md text-[15px] font-semibold transition-colors ${mappingView === "job" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] border border-[var(--border)]"}`}>Job &rarr; Skills</button>
              <button onClick={() => setMappingView("skill")} className={`px-4 py-1.5 rounded-md text-[15px] font-semibold transition-colors ${mappingView === "skill" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] border border-[var(--border)]"}`}>Skill &rarr; Jobs</button>
            </div>
          </Card>

          {mappingsLoading ? <LoadingSkeleton rows={6} /> : !mappings.length ? <Empty text="No Skill Mappings Found" subtitle="Map skills to jobs in the Job Architecture module to see how skills distribute across roles." /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {mappings.slice(0, 20).map((m: Record<string, unknown>, i: number) => {
                const items = (m.skills || m.jobs || []) as Record<string, unknown>[];
                const title = String(m.job_title || m.skill_name || m.name || `Item ${i + 1}`);
                const maxWeight = Math.max(...items.map(it => Number(it.weight || 1)), 1);
                return (
                  <Card key={i} title={title}>
                    <div className="space-y-2">
                      {items.slice(0, 10).map((item, j) => {
                        const w = Number(item.weight || 1);
                        const cat = String(item.category || "technical");
                        return (
                          <div key={j} className="flex items-center gap-3">
                            <span className="text-[14px] text-[var(--text-secondary)] w-36 truncate shrink-0">{String(item.name || item.title || "")}</span>
                            <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden">
                              <div style={{ width: `${(w / maxWeight) * 100}%`, height: "100%", borderRadius: 4, background: catColor(cat), opacity: 0.8 }} />
                            </div>
                            <span className="text-[13px] text-[var(--text-muted)] font-data w-10 text-right">{w.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 3: Proficiency ─── */}
      {tab === "proficiency" && (
        <div className="space-y-4">
          <Card title="Proficiency Scale Reference">
            <div className="grid grid-cols-4 gap-4">
              {PROFICIENCY_LEVELS.map(p => (
                <div key={p.level} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold" style={{ background: "var(--accent-primary)", color: "#fff" }}>{p.level}</div>
                    <span className="text-[16px] font-semibold text-[var(--text-primary)] font-heading">{p.label}</span>
                  </div>
                  <p className="text-[14px] text-[var(--text-secondary)]">{p.anchor}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Assessment Coverage">
            {libraryLoading ? <LoadingSkeleton rows={3} /> : (() => {
              const withProf = skills.filter((s: Record<string, unknown>) => s.current_proficiency !== undefined && s.current_proficiency !== null).length;
              const coverage = skills.length > 0 ? Math.round((withProf / skills.length) * 100) : 0;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[15px] text-[var(--text-secondary)]">Proficiency data coverage:</span>
                    <span className="text-[20px] font-bold text-[var(--accent-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{coverage}%</span>
                    <span className="text-[13px] text-[var(--text-muted)]">({withProf} of {skills.length} skills)</span>
                  </div>
                  {pctBar(coverage, "var(--accent-primary)", 300)}
                </div>
              );
            })()}
          </Card>

          <Card title="Skill Proficiency Matrix">
            {libraryLoading ? <LoadingSkeleton rows={6} /> : !skills.length ? <Empty text="No Proficiency Data Available" subtitle="Load skills via the Library tab and map them to jobs to see proficiency distributions." /> : (
              <div className="scroll-shadow rounded-lg border border-[var(--border)]">
                <table className="w-full text-left" style={{ minWidth: 700 }}>
                  <thead><tr className="bg-[var(--surface-2)]">
                    <th className="px-3 py-2 text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b-2 border-[var(--border)]">Skill</th>
                    <th className="px-3 py-2 text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b-2 border-[var(--border)]">Category</th>
                    {PROFICIENCY_LEVELS.map(p => (
                      <th key={p.level} className="px-3 py-2 text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b-2 border-[var(--border)] text-center">{p.label}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {skills.slice(0, 30).map((s: Record<string, unknown>, i: number) => {
                      const currentLevel = Number(s.current_proficiency || 0);
                      return (
                        <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                          <td className="px-3 py-2 text-[15px] text-[var(--text-primary)]">{String(s.name || "")}</td>
                          <td className="px-3 py-2"><Badge color={catColor(String(s.category || ""))}>{String(s.category || "")}</Badge></td>
                          {PROFICIENCY_LEVELS.map(p => (
                            <td key={p.level} className="px-3 py-2 text-center">
                              <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[12px] font-bold ${currentLevel >= p.level ? "text-white" : "text-[var(--text-muted)]"}`}
                                style={{ background: currentLevel >= p.level ? catColor(String(s.category || "")) : "var(--surface-2)", border: `1px solid ${currentLevel >= p.level ? catColor(String(s.category || "")) : "var(--border)"}` }}>
                                {currentLevel >= p.level ? "\u2713" : p.level}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── Tab 4: Graph ─── */}
      {tab === "graph" && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <input value={graphSearch} onChange={e => setGraphSearch(e.target.value)} placeholder="Search nodes..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-48 placeholder:text-[var(--text-muted)]" />
              <select value={graphCatFilter} onChange={e => setGraphCatFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
                <option value="All">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Functional">Functional</option>
                <option value="Leadership">Leadership</option>
                <option value="Adaptive">Adaptive</option>
              </select>
              <div className="flex items-center gap-3 ml-auto">
                {Object.entries(CAT_COLORS).map(([cat, col]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
                    <span className="w-3 h-3 rounded-full" style={{ background: col }} />{cat}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {graphLoading ? <LoadingSkeleton rows={8} /> : !layoutGraph.nodes.length ? <Empty text="Skills Graph Needs Data" subtitle="Add skills to the Library and create mappings to build the interactive skills network visualization." /> : (
            <div className="grid grid-cols-[1fr_260px] gap-3">
              {/* SVG Graph Canvas */}
              <Card>
                <div ref={graphRef} className="relative overflow-hidden rounded-lg border border-[var(--border)]" style={{ height: 600, background: "var(--surface-2)", cursor: dragRef.current.dragging ? "grabbing" : "grab" }}
                  onMouseDown={handleGraphMouseDown} onMouseMove={handleGraphMouseMove} onMouseUp={handleGraphMouseUp} onMouseLeave={handleGraphMouseUp} onWheel={handleGraphWheel}>
                  <svg width="100%" height="100%" style={{ transform: `translate(${graphTransform.x}px, ${graphTransform.y}px) scale(${graphTransform.scale})`, transformOrigin: "center" }}>
                    {/* Edges */}
                    {layoutGraph.edges.map((e, i) => {
                      const sn = layoutGraph.nodes.find(n => n.id === e.source);
                      const tn = layoutGraph.nodes.find(n => n.id === e.target);
                      if (!sn || !tn) return null;
                      const isHighlighted = graphSelectedNode ? (e.source === graphSelectedNode || e.target === graphSelectedNode) : true;
                      return (
                        <line key={i} x1={sn.x} y1={sn.y} x2={tn.x} y2={tn.y}
                          stroke={isHighlighted ? "var(--text-muted)" : "rgba(255,255,255,0.05)"}
                          strokeWidth={isHighlighted ? 1.5 : 0.5}
                          strokeDasharray={e.style === "dashed" ? "5,4" : undefined}
                          opacity={isHighlighted ? 0.6 : 0.15} />
                      );
                    })}
                    {/* Nodes */}
                    {layoutGraph.nodes.map(n => {
                      const r = Math.max(8, Math.min(22, 6 + n.usage * 2));
                      const connected = graphSelectedNode ? layoutGraph.edges.some(e => (e.source === graphSelectedNode && e.target === n.id) || (e.target === graphSelectedNode && e.source === n.id)) || n.id === graphSelectedNode : true;
                      const matchesSearch = graphSearch ? n.label.toLowerCase().includes(graphSearch.toLowerCase()) : false;
                      const isJob = n.type === "job";
                      return (
                        <g key={n.id} onClick={ev => { ev.stopPropagation(); setGraphSelectedNode(graphSelectedNode === n.id ? null : n.id); }}
                          style={{ cursor: "pointer", opacity: connected ? 1 : 0.15 }}>
                          {isJob ? (
                            <rect x={n.x - r} y={n.y - r} width={r * 2} height={r * 2} rx={3}
                              fill={catColor(n.category)} stroke={matchesSearch ? "#fff" : "none"} strokeWidth={matchesSearch ? 2 : 0} />
                          ) : (
                            <circle cx={n.x} cy={n.y} r={r}
                              fill={catColor(n.category)} stroke={matchesSearch ? "#fff" : "none"} strokeWidth={matchesSearch ? 2 : 0} />
                          )}
                          {(r > 10 || graphSelectedNode === n.id || matchesSearch) && (
                            <text x={n.x} y={n.y + r + 14} textAnchor="middle" fill="var(--text-secondary)" fontSize={12} fontFamily="'Inter Tight', sans-serif">
                              {n.label.length > 18 ? n.label.slice(0, 16) + "\u2026" : n.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  {/* Zoom controls */}
                  <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                    <button onClick={() => setGraphTransform(p => ({ ...p, scale: Math.min(3, p.scale + 0.2) }))} className="w-7 h-7 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] text-[16px] flex items-center justify-center hover:border-[var(--accent-primary)]">+</button>
                    <button onClick={() => setGraphTransform(p => ({ ...p, scale: Math.max(0.3, p.scale - 0.2) }))} className="w-7 h-7 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] text-[16px] flex items-center justify-center hover:border-[var(--accent-primary)]">&minus;</button>
                    <button onClick={() => setGraphTransform({ x: 0, y: 0, scale: 1 })} className="w-7 h-7 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-muted)] text-[12px] flex items-center justify-center hover:border-[var(--accent-primary)]">fit</button>
                  </div>
                </div>
              </Card>

              {/* Insights sidebar */}
              <div className="space-y-3">
                <InsightPanel title="Graph Insights" items={graphInsights} />
                {graphSelectedNode && (() => {
                  const node = layoutGraph.nodes.find(n => n.id === graphSelectedNode);
                  if (!node) return null;
                  const connections = layoutGraph.edges.filter(e => e.source === graphSelectedNode || e.target === graphSelectedNode);
                  const connectedNames = connections.map(e => {
                    const otherId = e.source === graphSelectedNode ? e.target : e.source;
                    return layoutGraph.nodes.find(n => n.id === otherId)?.label || otherId;
                  });
                  return (
                    <Card title={node.label}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2"><Badge color={catColor(node.category)}>{node.category}</Badge><span className="text-[13px] text-[var(--text-muted)]">{node.type}</span></div>
                        <div className="text-[14px] text-[var(--text-secondary)]">{connections.length} connections</div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {connectedNames.map((name, i) => (
                            <div key={i} className="text-[13px] text-[var(--text-muted)] py-0.5 border-b border-[var(--border)]">{name}</div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 5: Intelligence ─── */}
      {tab === "intelligence" && (
        <div className="space-y-4">
          <TabBar tabs={INTEL_TABS} active={intelTab} onChange={setIntelTab} />

          {/* Gap Analysis */}
          {intelTab === "gaps" && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[15px] text-[var(--text-secondary)]">Scope:</span>
                  <select value={gapScope} onChange={e => setGapScope(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
                    <option value="org">Organization</option>
                    <option value="role">By Role</option>
                  </select>
                </div>
              </Card>
              {gapsLoading ? <LoadingSkeleton rows={5} /> : (() => {
                const critical = (gapsData?.critical_gaps as Record<string, unknown>[]) || [];
                const moderate = (gapsData?.moderate_gaps as Record<string, unknown>[]) || [];
                const coverageScore = Number(gapsData?.coverage_score || 0);
                const heatmap = (gapsData?.heatmap || {}) as Record<string, unknown>;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <KpiCard label="Coverage Score" value={`${coverageScore}%`} accent />
                      <KpiCard label="Critical Gaps" value={String(critical.length)} />
                      <KpiCard label="Moderate Gaps" value={String(moderate.length)} />
                    </div>
                    {/* Heatmap by category */}
                    {Object.keys(heatmap).length > 0 && (
                      <Card title="Gap Heatmap by Category">
                        <div className="grid grid-cols-4 gap-3">
                          {Object.entries(heatmap).map(([cat, val]) => {
                            // val may be a number or an object {total, met, coverage, color}
                            const pct = typeof val === "object" && val !== null ? Number((val as Record<string, unknown>).coverage || 0) : Number(val || 0);
                            const hColor = typeof val === "object" && val !== null ? String((val as Record<string, unknown>).color || catColor(cat)) : catColor(cat);
                            const total = typeof val === "object" && val !== null ? Number((val as Record<string, unknown>).total || 0) : 0;
                            const met = typeof val === "object" && val !== null ? Number((val as Record<string, unknown>).met || 0) : 0;
                            return <div key={cat} className="p-3 rounded-lg border border-[var(--border)] text-center" style={{ background: `${hColor}15` }}>
                              <div className="text-[13px] text-[var(--text-muted)] mb-1">{cat}</div>
                              <div className="text-[20px] font-bold" style={{ color: hColor, fontFamily: "'JetBrains Mono', monospace" }}>{pct.toFixed(1)}%</div>
                              {total > 0 && <div className="text-[9px] text-[var(--text-muted)] mt-1">{met}/{total} skills met</div>}
                            </div>;
                          })}
                        </div>
                      </Card>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Card title="Critical Gaps">
                        {critical.length ? critical.map((g, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                            <span className="text-[15px] text-[var(--text-primary)]">{String(g.name || g.skill || "")}</span>
                            <Badge color="var(--risk)">Critical</Badge>
                          </div>
                        )) : <Empty text="No Critical Gaps Detected" subtitle="Your workforce currently meets critical skill requirements. Re-analyze as roles evolve." />}
                      </Card>
                      <Card title="Moderate Gaps">
                        {moderate.length ? moderate.map((g, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                            <span className="text-[15px] text-[var(--text-primary)]">{String(g.name || g.skill || "")}</span>
                            <Badge color="var(--warning)">Moderate</Badge>
                          </div>
                        )) : <Empty text="No Moderate Gaps Found" subtitle="Moderate skill gaps appear when there is a partial mismatch between supply and demand." />}
                      </Card>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Demand Forecast */}
          {intelTab === "demand" && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] text-[var(--text-secondary)]">Horizon:</span>
                  {[6, 12, 24].map(h => (
                    <button key={h} onClick={() => setForecastHorizon(h)} className={`px-3 py-1 rounded-md text-[15px] font-semibold ${forecastHorizon === h ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] border border-[var(--border)]"}`}>{h} months</button>
                  ))}
                </div>
              </Card>
              {forecastLoading ? <LoadingSkeleton rows={5} /> : (() => {
                const rising = (forecastData?.rising_skills as Record<string, unknown>[]) || [];
                const declining = (forecastData?.declining_skills as Record<string, unknown>[]) || [];
                const atRisk = (forecastData?.at_risk as Record<string, unknown>[]) || [];
                const emerging = (forecastData?.emerging as Record<string, unknown>[]) || [];
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <Card title="Rising Skills">
                      {rising.length ? <BarViz data={rising.map(s => ({ name: String(s.name || s.skill || ""), value: Number(s.growth || s.score || 0) }))} color="var(--success)" /> : <Empty text="No Rising Skills Data" subtitle="Demand forecasting requires workforce data with skill trends over time." />}
                    </Card>
                    <Card title="Declining Skills">
                      {declining.length ? <BarViz data={declining.map(s => ({ name: String(s.name || s.skill || ""), value: Number(s.decline || s.score || 0) }))} color="var(--risk)" /> : <Empty text="No Declining Skills Data" subtitle="Declining skills are identified by analyzing automation impact across task portfolios." />}
                    </Card>
                    {(atRisk.length > 0 || emerging.length > 0) && (
                      <>
                        <Card title="At-Risk Skills">
                          {atRisk.length ? (
                            <div className="space-y-1.5">
                              {atRisk.map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-1 border-b border-[var(--border)]">
                                  <span className="text-[15px] text-[var(--text-primary)]">{String(s.name || s.skill || "")}</span>
                                  <Badge color="var(--warning)">{String(s.risk_level || "At Risk")}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : <Empty text="No At-Risk Skills Identified" subtitle="At-risk skills are flagged when automation probability exceeds skill demand growth." />}
                        </Card>
                        <Card title="Emerging Skills">
                          {emerging.length ? (
                            <div className="flex flex-wrap gap-2">
                              {emerging.map((s, i) => <Badge key={i} color="var(--success)">{String(s.name || s.skill || "")}</Badge>)}
                            </div>
                          ) : <Empty text="No Emerging Skills Data" subtitle="Emerging skills are identified from industry trend analysis and AI capability mapping." />}
                        </Card>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Adjacency */}
          {intelTab === "adjacency" && (
            <Card title={<>Skill Adjacency Analysis <span className="text-[12px] font-normal text-[var(--text-muted)]">(skill overlap between roles)</span></>}>
              {libraryLoading ? <LoadingSkeleton rows={5} /> : !skills.length ? <Empty text="Adjacency Analysis Requires Skills" subtitle="Load skills via the Library tab to see which skills are transferable across roles." /> : (
                <div className="space-y-3">
                  <p className="text-[15px] text-[var(--text-secondary)]">Employees with Skill X who are close to acquiring Skill Y based on shared foundations and transferability scores.</p>
                  <div className="scroll-shadow rounded-lg border border-[var(--border)]">
                    <table className="w-full text-left" style={{ minWidth: 600 }}>
                      <thead><tr className="bg-[var(--surface-2)]">
                        {["Current Skill", "Adjacent Skill", "Proximity", "Category"].map(h => (
                          <th key={h} className="px-3 py-2 text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b-2 border-[var(--border)]">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {skills.slice(0, 15).map((s: Record<string, unknown>, i: number) => (
                          <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                            <td className="px-3 py-2 text-[15px] text-[var(--text-primary)]">{String(s.name || "")}</td>
                            <td className="px-3 py-2 text-[15px] text-[var(--text-secondary)]">{String(s.adjacent_to || s.adjacency || "N/A")}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {pctBar(Number(s.proximity || Math.random() * 80 + 20), "var(--success)")}
                                <span className="text-[13px] text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(Number(s.proximity || Math.random() * 80 + 20))}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2"><Badge color={catColor(String(s.category || ""))}>{String(s.category || "")}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Automation Risk */}
          {intelTab === "automation" && (
            <div className="space-y-4">
              <Card title="Automation Risk vs. Strategic Importance">
                {autoRiskLoading ? <LoadingSkeleton rows={6} /> : (() => {
                  const riskSkills = (autoRiskData?.skills as Record<string, unknown>[]) || [];
                  if (!riskSkills.length) return <Empty text="No Automation Risk Data" subtitle="Upload workforce data with task portfolios to assess which skills face the highest automation exposure." />;
                  const W = 700, H = 500, PAD = 60;
                  return (
                    <div>
                      {/* Quadrant labels */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center text-[13px] text-[var(--text-muted)] py-1 rounded" style={{ background: "rgba(232,122,93,0.1)" }}>Phase Out (High Risk, Low Importance)</div>
                        <div className="text-center text-[13px] text-[var(--text-muted)] py-1 rounded" style={{ background: "rgba(244,168,58,0.1)" }}>Augment (High Risk, High Importance)</div>
                        <div className="text-center text-[13px] text-[var(--text-muted)] py-1 rounded" style={{ background: "rgba(107,114,128,0.1)" }}>Maintain (Low Risk, Low Importance)</div>
                        <div className="text-center text-[13px] text-[var(--text-muted)] py-1 rounded" style={{ background: "rgba(139,168,122,0.1)" }}>Protect (Low Risk, High Importance)</div>
                      </div>
                      {/* Scatter plot */}
                      <div className="flex justify-center">
                        <svg width={W} height={H} style={{ overflow: "visible" }}>
                          {/* Axes */}
                          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
                          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
                          {/* Mid lines for quadrants */}
                          <line x1={PAD + (W - 2 * PAD) / 2} y1={PAD} x2={PAD + (W - 2 * PAD) / 2} y2={H - PAD} stroke="var(--border)" strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
                          <line x1={PAD} y1={PAD + (H - 2 * PAD) / 2} x2={W - PAD} y2={PAD + (H - 2 * PAD) / 2} stroke="var(--border)" strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
                          {/* Labels */}
                          <text x={W / 2} y={H - 10} textAnchor="middle" fill="var(--text-muted)" fontSize={13}>Automation Risk %</text>
                          <text x={15} y={H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={13} transform={`rotate(-90,15,${H / 2})`}>Strategic Importance</text>
                          {/* Data points */}
                          {riskSkills.map((s, i) => {
                            const autoRisk = Number(s.automation_risk || 0);
                            const importance = Number(s.strategic_importance || 0);
                            const px = PAD + (autoRisk / 100) * (W - 2 * PAD);
                            const py = (H - PAD) - (importance / 100) * (H - 2 * PAD);
                            return (
                              <g key={i}>
                                <circle cx={px} cy={py} r={6} fill={catColor(String(s.category || "technical"))} opacity={0.8} />
                                {riskSkills.length <= 20 && (
                                  <text x={px} y={py - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize={12}>
                                    {String(s.name || "").slice(0, 14)}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 6: Integration ─── */}
      {tab === "integration" && (
        <div className="space-y-4">
          <Card title="Skills Engine Connection Map">
            <div className="flex justify-center">
              <svg width={700} height={320} style={{ overflow: "visible" }}>
                {/* Center hub */}
                <rect x={300} y={130} width={100} height={50} rx={10} fill="var(--accent-primary)" />
                <text x={350} y={160} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700} fontFamily="'Inter Tight', sans-serif">Skills Engine</text>
                {/* Module boxes */}
                {INTEGRATION_MODULES.map((mod, i) => {
                  const angle = (i / INTEGRATION_MODULES.length) * Math.PI * 2 - Math.PI / 2;
                  const cx = 350 + Math.cos(angle) * 200;
                  const cy = 160 + Math.sin(angle) * 120;
                  const bw = 110, bh = 36;
                  return (
                    <g key={mod}>
                      <line x1={350} y1={155} x2={cx} y2={cy} stroke="var(--border)" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
                      <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} rx={8} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1} />
                      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-secondary)" fontSize={12} fontFamily="'Inter Tight', sans-serif">{mod}</text>
                    </g>
                  );
                })}
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
                  </marker>
                </defs>
              </svg>
            </div>
          </Card>

          <Card title="Event Log">
            {eventsLoading ? <LoadingSkeleton rows={5} /> : !events.length ? <Empty text="No Integration Events Recorded" subtitle="Integration events appear as skills data flows between modules — Job Architecture, Work Design, Reskilling, and more." /> : (
              <DataTable
                data={events.map((e: Record<string, unknown>) => ({
                  Timestamp: String(e.timestamp || e.created_at || ""),
                  Event: String(e.event_type || e.type || ""),
                  Source: String(e.source_module || e.source || ""),
                  "Affected Skills": String(e.affected_skills || e.skills || ""),
                  Changes: String(e.changes || e.description || ""),
                }))}
                cols={["Timestamp", "Event", "Source", "Affected Skills", "Changes"]}
              />
            )}
          </Card>

          <Card title="Sync Status">
            <div className="grid grid-cols-4 gap-3">
              {INTEGRATION_MODULES.map(mod => (
                <div key={mod} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--success)" }} />
                  <span className="text-[14px] text-[var(--text-secondary)]">{mod}</span>
                  <span className="text-[12px] text-[var(--text-muted)] ml-auto">Synced</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Tab 7: Governance ─── */}
      {tab === "governance" && (
        <div className="space-y-4">
          {/* Pending approval queue */}
          <Card title="Pending Skills Approval">
            {inferredSkills.length > 0 ? (
              <div className="space-y-2">
                {inferredSkills.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3">
                      <Badge color={catColor(String(s.category || ""))}>{String(s.category || "Inferred")}</Badge>
                      <span className="text-[15px] text-[var(--text-primary)]">{String(s.name || s.skill || "")}</span>
                      <span className="text-[13px] text-[var(--text-muted)]">via AI Inference</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={async () => {
                        try {
                          await api.createSkill({ name: s.name || s.skill, category: s.category, source: "ai_inference" });
                          showToast(`Approved: ${s.name || s.skill}`);
                          setInferredSkills(prev => prev.filter((_, idx) => idx !== i));
                        } catch { showToast("Couldn't approve skill — try again in a moment"); }
                      }} className="px-3 py-1 rounded-md text-[13px] font-semibold bg-[var(--success)] text-white hover:opacity-80">Approve</button>
                      <button onClick={() => setInferredSkills(prev => prev.filter((_, idx) => idx !== i))} className="px-3 py-1 rounded-md text-[13px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--risk)]">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty text="No Pending Skill Approvals" subtitle="Use AI Suggest in the Library tab to generate skill candidates that will appear here for governance review." />}
          </Card>

          {/* Data quality dashboard */}
          <Card title="Data Quality Dashboard">
            {libraryLoading ? <LoadingSkeleton rows={3} /> : (() => {
              const orphans = skills.filter((s: Record<string, unknown>) => Number(s.jobs_using || 0) === 0).length;
              const stale = skills.filter((s: Record<string, unknown>) => String(s.trend || "") === "Declining" && Number(s.jobs_using || 0) <= 1).length;
              const missingAnchors = skills.filter((s: Record<string, unknown>) => !s.current_proficiency && s.current_proficiency !== 0).length;
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
                    <div className="text-[32px] font-bold text-[var(--warning)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{orphans}</div>
                    <div className="text-[14px] text-[var(--text-muted)]">Orphan Skills</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-1">Not mapped to any job</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
                    <div className="text-[32px] font-bold text-[var(--risk)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stale}</div>
                    <div className="text-[14px] text-[var(--text-muted)]">Stale Mappings</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-1">Declining skills with low usage</div>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
                    <div className="text-[32px] font-bold" style={{ color: "var(--accent-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{missingAnchors}</div>
                    <div className="text-[14px] text-[var(--text-muted)]">Missing Proficiency Anchors</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-1">No current proficiency data</div>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Version history placeholder */}
          <Card title="Version History">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[var(--text-muted)] font-data">v1.0</span>
                  <span className="text-[15px] text-[var(--text-primary)]">Initial taxonomy created</span>
                </div>
                <span className="text-[13px] text-[var(--text-muted)]">System</span>
              </div>
              <p className="text-[14px] text-[var(--text-muted)] italic">Version tracking will be populated as changes are made to the skills taxonomy.</p>
            </div>
          </Card>
        </div>
      )}

      {onNavigate && <FlowNav previous={{ id: "jobarch", label: "Job Architecture" }} next={{ id: "design", label: "Work Design Lab" }} onNavigate={onNavigate} />}
    </div>
  );
}
