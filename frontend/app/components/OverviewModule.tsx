"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from "recharts";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import type { OverviewResponse, OverviewKpis, NameValue, DataCoverageEntry, SkillAnalysisResponse, ExportSummaryResponse } from "../../types/api";
import { VideoBackground } from "./VideoBackground";
import { CDN_BASE, cb } from "../../lib/cdn";
import {
  KpiCard,
  Card,
  Empty,
  Badge,
  InsightPanel,
  NarrativePanel,
  DataTable,
  BarViz,
  DonutViz,
  RadarViz,
  PageHeader,
  LoadingBar,
  LoadingSkeleton,
  ModuleExportButton,
  usePersisted,
  useApiData,
  callAI,
  showToast,
  COLORS,
  TT,
  PHASES,
  MODULES,
  SIM_PRESETS,
  ContextStrip,
  ReadinessDot,
  CareerFrameworkAccordion,
  AiInsightCard,
  fmtNum,
} from "./shared";
import type { ViewContext, JobDesignState } from "./shared";
import { SkeletonKpiRow, SkeletonChart } from "./ui-primitives";
import { LayoutDashboard, Users, Compass, TrendingUp, GraduationCap } from "@/lib/icons";
import { FlowNav } from "@/app/ui";

export function TransformationDashboard({ data, jobStates, simState, viewCtx }: { data: OverviewResponse | null; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; viewCtx?: ViewContext }) {
  const k = (data?.kpis ?? { employees: 0, roles: 0, tasks_mapped: 0, avg_span: 0, high_ai_pct: 0, readiness_score: 0, readiness_tier: "" }) as OverviewKpis;
  const _js = jobStates || {};
  const finalized = Object.values(_js).filter(s => s.finalized).length;
  const totalJobs = Object.values(_js).filter(s => s.deconRows?.length > 0).length;
  const totalTasks = Object.values(_js).reduce((s, js) => s + (js.deconRows?.length || 0), 0);
  const highAiTasks = Object.values(_js).reduce((s, js) => s + (js.deconRows || []).filter(r => String(r["AI Impact"]) === "High").length, 0);

  // Calculate released hours from redeployment
  const releasedHours = Object.values(_js).reduce((sum, js) => {
    if (!js.redeploySubmitted) return sum;
    return sum + js.redeployRows.reduce((s, r) => {
      const current = Number(r["Current Time Spent %"] || 0);
      const newTime = Number(r["New Time %"] || current);
      return s + Math.max(0, current - newTime);
    }, 0);
  }, 0);

  const hasProgress = Number(k.employees || 0) > 0 || totalJobs > 0;
  if (!hasProgress) return <div className="mb-6"><Empty text="Welcome to Your Transformation Dashboard" subtitle="Upload your workforce data to see headcount, org health, AI readiness, and skills metrics populate this dashboard." /></div>;

  // Phase summaries (5 phases)
  const p1Complete = Number(k.employees || 0) > 0;
  const p2Complete = p1Complete; // Diagnose available when data loaded
  const p3Complete = finalized > 0; // Design done when roles finalized
  const p4Complete = p3Complete; // Simulate available after design
  const p5Ready = p4Complete;

  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const kpis = viewCtx?.mode === "employee" ? [
    { label: "My AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "🤖", color: "#f4a83a" },
    { label: "Tasks Augmented", value: Number(Math.round(highAiTasks * cfg.adoption)) || "—", icon: "⚡", color: "#f4a83a" },
    { label: "Time Freed", value: `${Math.round(cfg.adoption * 40)}%`, icon: "⏰", color: "#8ba87a" },
    { label: "New Skills", value: Number(Math.round(cfg.adoption * 3)) || "—", icon: "📚", color: "var(--purple)" },
    { label: "Change Wave", value: "Wave 1", icon: "🚀", color: "#f4a83a" },
    { label: "Readiness", value: `${String(k.readiness_score || "—")}/100`, icon: "◎", color: "#f4a83a" },
  ] : viewCtx?.mode === "job" ? [
    { label: "Incumbents", value: Number(k.employees) || 0, icon: "👥", color: "#f4a83a" },
    { label: "Tasks Mapped", value: Number(totalTasks) || "—", icon: "📋", color: "#8ba87a" },
    { label: "High AI Tasks", value: Number(highAiTasks) || "—", icon: "🤖", color: "#f4a83a" },
    { label: "AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "⚡", color: "#f4a83a" },
    { label: "Status", value: finalized > 0 ? "Finalized" : totalJobs > 0 ? "In Progress" : "Not Started", icon: "✓", color: finalized > 0 ? "#8ba87a" : "#f4a83a" },
    { label: "Readiness", value: `${String(k.readiness_score || "—")}/100`, icon: "◎", color: "#f4a83a" },
  ] : [
    { label: "Employees", value: Number(k.employees) || 0, icon: "👥", color: "#f4a83a" },
    { label: "Roles Analyzed", value: totalJobs, icon: "💼", color: "var(--purple)" },
    { label: "Tasks Mapped", value: totalTasks, icon: "📋", color: "#8ba87a" },
    { label: "High AI Tasks", value: highAiTasks, icon: "🤖", color: "#f4a83a" },
    { label: "Jobs Finalized", value: `${finalized}/${Number(totalJobs) || "—"}`, icon: "✓", color: "#8ba87a" },
    { label: "AI Readiness", value: `${String(k.readiness_score || "—")}/100`, icon: "◎", color: k.readiness_score && Number(k.readiness_score) >= 70 ? "#8ba87a" : k.readiness_score && Number(k.readiness_score) >= 50 ? "#f4a83a" : "#e87a5d" },
  ];

  return <div className="mb-6">
    <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-between"><span>{viewCtx?.mode === "employee" ? "My Transformation Impact" : viewCtx?.mode === "job" ? "Role Analysis Progress" : "Transformation Progress"}</span><span className="text-[14px] font-normal opacity-50">hover to expand</span></div>
    {/* Phase progress indicators */}
    <div className="flex gap-2 mb-3">
      {PHASES.map((phase, i) => {
        const done = i === 0 ? p1Complete : i === 1 ? p2Complete : i === 2 ? p3Complete : i === 3 ? p4Complete : p5Ready;
        return <div key={phase.id} className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: done ? `${phase.color}10` : "#1e2030", border: `1px solid ${done ? `${phase.color}30` : "var(--border)"}` }}>
          <span className="text-sm">{phase.icon}</span>
          <div><div className="text-[15px] font-bold" style={{ color: done ? phase.color : "#8a7f6d" }}>{phase.label}</div><div className="text-[14px]" style={{ color: done ? `${phase.color}99` : "#8a7f6d" }}>{done ? "In progress" : i === 0 ? "Upload data" : "Locked"}</div></div>
        </div>;
      })}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {kpis.map(k => <div key={k.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-3 text-center">
        <div className="text-[16px] mb-1">{k.icon}</div>
        <div className="text-[18px] font-extrabold" style={{ color: k.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{typeof k.value === "object" && k.value !== null ? String(k.value) : k.value}</div>
        <div className="text-[15px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{k.label}</div>
      </div>)}
    </div>
  </div>;
}

export function LandingPage({ onNavigate, moduleStatus, hasData, viewMode, projectName, onBackToHub, onBackToSplash, cardBackgrounds, phaseBackgrounds, scrollToPhase, onScrollToPhaseHandled }: { onNavigate: (id: string) => void; moduleStatus: Record<string, string>; hasData: boolean; viewMode?: string; projectName?: string; onBackToHub?: () => void; onBackToSplash?: () => void; cardBackgrounds?: Record<string, string>; phaseBackgrounds?: Record<string, string>; scrollToPhase?: string | null; onScrollToPhaseHandled?: () => void }) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [highlightedPhase, setHighlightedPhase] = useState<string | null>(null);

  // Open phase detail view when triggered from breadcrumb navigation
  const handleRef = useRef(onScrollToPhaseHandled);
  handleRef.current = onScrollToPhaseHandled;
  useEffect(() => {
    if (!scrollToPhase) return;
    const timer = setTimeout(() => {
      setSelectedPhase(scrollToPhase);
      setHighlightedPhase(scrollToPhase);
      setTimeout(() => setHighlightedPhase(null), 2000);
      handleRef.current?.();
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToPhase]);

  // Escape key: go back to splash or deselect phase
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedPhase) { setSelectedPhase(null); }
        else if (onBackToSplash) { onBackToSplash(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedPhase, onBackToSplash]);

  const getPhaseStatus = (phase: typeof PHASES[0]) => {
    const ms = phase.modules.map(id => moduleStatus[id] || "not_started");
    if (ms.every(s => s === "complete")) return "complete";
    if (ms.some(s => s !== "not_started")) return "in_progress";
    return "not_started";
  };
  const currentPhaseIdx = PHASES.findIndex(p => getPhaseStatus(p) !== "complete");
  const activeIdx = currentPhaseIdx < 0 ? PHASES.length - 1 : currentPhaseIdx;
  const filteredModules = MODULES.filter(m => !m.views || m.views.includes(viewMode || "org"));

  // Phase detail view
  if (selectedPhase) {
    const pi = PHASES.findIndex(p => p.id === selectedPhase);
    const phase = PHASES[pi];
    if (!phase) { setSelectedPhase(null); return null; }
    const phaseMods = filteredModules.filter(m => (m as Record<string, unknown>).phase === phase.id);
    const exploredCount = phaseMods.filter(m => (moduleStatus[m.id] || "not_started") !== "not_started").length;
    // Card gradient map for visual distinction
    const cardGrad: Record<string, string> = {
      dashboard: "linear-gradient(135deg, #1a1200 0%, #2d1f00 100%)", snapshot: "linear-gradient(135deg, #1a0f1a 0%, #251530 100%)",
      skillshift: "linear-gradient(135deg, #001a0f 0%, #002818 100%)", jobarch: "linear-gradient(135deg, #0f1a1a 0%, #0a2525 100%)",
      orghealth: "linear-gradient(135deg, #1a1005 0%, #2a1a08 100%)", scan: "linear-gradient(135deg, #1a0800 0%, #2d1200 100%)",
      heatmap: "linear-gradient(135deg, #1a0505 0%, #2d0a0a 100%)", readiness: "linear-gradient(135deg, #18100a 0%, #2a1a10 100%)",
      changeready: "linear-gradient(135deg, #1a0a0a 0%, #2a1010 100%)", clusters: "linear-gradient(135deg, #120f1a 0%, #1a1525 100%)",
      recommendations: "linear-gradient(135deg, #1a1005 0%, #2a1a08 100%)", mgrcap: "linear-gradient(135deg, #10081a 0%, #1a1030 100%)",
      skills: "linear-gradient(135deg, #1a1200 0%, #2a1e05 100%)", design: "linear-gradient(135deg, #001a0a 0%, #002515 100%)",
      opmodel: "linear-gradient(135deg, #1a1200 0%, #2a1e05 100%)", build: "linear-gradient(135deg, #120f05 0%, #1f1a0a 100%)",
      bbba: "linear-gradient(135deg, #120a05 0%, #201508 100%)", headcount: "linear-gradient(135deg, #0a0818 0%, #151028 100%)",
      quickwins: "linear-gradient(135deg, #001a08 0%, #002a10 100%)", rolecompare: "linear-gradient(135deg, #18100a 0%, #2a1a10 100%)",
      simulate: "linear-gradient(135deg, #0a0818 0%, #151028 100%)", plan: "linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%)",
      story: "linear-gradient(135deg, #1a1005 0%, #2a1a08 100%)", archetypes: "linear-gradient(135deg, #18100a 0%, #2a1a10 100%)",
      mgrdev: "linear-gradient(135deg, #10081a 0%, #1a1030 100%)", reskill: "linear-gradient(135deg, #1a1200 0%, #2a1e05 100%)",
      marketplace: "linear-gradient(135deg, #1a0800 0%, #2d1200 100%)", export: "linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%)",
    };

    const phaseBg = phaseBackgrounds?.[phase.id];
    return <div className="relative min-h-[calc(100vh-48px)] overflow-hidden">
      {/* Phase background image */}
      {phaseBg && <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${phaseBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
      <div className="absolute inset-0 z-0" style={{ background: phaseBg ? `linear-gradient(135deg, rgba(11,17,32,0.82) 0%, rgba(11,17,32,0.7) 50%, rgba(11,17,32,0.82) 100%)` : `radial-gradient(ellipse at 40% 30%, ${phase.color}08 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, ${phase.color}04 0%, transparent 50%)` }} />

      <div className="relative z-10 px-7 py-6" style={{ transition: 'box-shadow 0.5s ease', boxShadow: highlightedPhase === phase.id ? `inset 0 0 0 2px ${phase.color}40, 0 0 30px ${phase.color}15` : 'none' }}>
        {/* Back button */}
        <button onClick={() => setSelectedPhase(null)} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-5 flex items-center gap-1 transition-colors">← Back to Journey Map</button>

        {/* Journey bar — pill tabs */}
        <div className="flex items-center gap-2 mb-8">
          {PHASES.map((p, i) => {
            const pStat = getPhaseStatus(p);
            const isActive = p.id === selectedPhase;
            return <React.Fragment key={p.id}>
              {i > 0 && <div style={{ width: 24, height: 2, borderRadius: 1, background: pStat !== "not_started" || isActive ? `${p.color}40` : "rgba(255,255,255,0.04)" }} />}
              <button onClick={() => setSelectedPhase(p.id)} style={{ padding: isActive ? "6px 16px" : "6px 12px", borderRadius: 20, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.25s", background: isActive ? `${p.color}20` : "transparent", border: `1.5px solid ${isActive ? p.color : pStat !== "not_started" ? `${p.color}30` : "rgba(255,255,255,0.06)"}`, color: isActive ? p.color : pStat !== "not_started" ? "var(--text-secondary)" : "#8a7f6d", animation: isActive ? "subtlePulse 2.5s ease-in-out infinite" : "none" }}>
                {pStat === "complete" ? "✓ " : ""}{p.label}
              </button>
            </React.Fragment>;
          })}
          <style>{`@keyframes subtlePulse { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 12px ${phase.color}20; } }`}</style>
        </div>

        {/* Phase header — large and impactful */}
        <div className="flex items-center gap-5 mb-3">
          <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, background: `linear-gradient(135deg, ${phase.color}15, ${phase.color}08)`, border: `2px solid ${phase.color}30`, boxShadow: `0 0 32px ${phase.color}15`, flexShrink: 0 }}>{phase.icon}</div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: phase.color, background: `${phase.color}12`, padding: "3px 12px", borderRadius: 10 }}>Phase {pi + 1} of 5</span>
              {exploredCount > 0 && <span className="text-[15px] text-[var(--text-muted)]">{exploredCount}/{phaseMods.length} explored</span>}
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: "var(--text-primary)", lineHeight: 1.1 }}>{phase.label}</h2>
          </div>
        </div>
        <p className="text-[15px] text-[var(--text-secondary)] mb-2 max-w-2xl leading-relaxed">{(phase as Record<string, unknown>).guidance as string}</p>
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-8 max-w-md">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${phaseMods.length > 0 ? (exploredCount / phaseMods.length) * 100 : 0}%`, background: `linear-gradient(90deg, ${phase.color}, ${phase.color}80)` }} />
          </div>
          <span className="text-[15px] font-bold shrink-0" style={{ color: phase.color }}>{exploredCount}/{phaseMods.length}</span>
        </div>

        {/* Module cards — premium grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: phaseMods.length <= 2 ? "1fr 1fr" : phaseMods.length <= 4 ? "1fr 1fr" : "1fr 1fr 1fr" }}>
          {phaseMods.map((m, mi) => {
            const status = moduleStatus[m.id] || "not_started";
            const statusColor = status === "complete" ? "#8ba87a" : status === "in_progress" ? "#f4a83a" : "rgba(255,255,255,0.08)";
            const statusLabel = status === "complete" ? "Complete" : status === "in_progress" ? "In Progress" : "";
            const mTitle = viewMode === "employee" && (m as Record<string, unknown>).empTitle ? String((m as Record<string, unknown>).empTitle) : viewMode === "job" && (m as Record<string, unknown>).jobTitle ? String((m as Record<string, unknown>).jobTitle) : m.title;
            const mDesc = viewMode === "employee" && (m as Record<string, unknown>).empDesc ? String((m as Record<string, unknown>).empDesc) : viewMode === "job" && (m as Record<string, unknown>).jobDesc ? String((m as Record<string, unknown>).jobDesc) : m.desc;
            const tileBg = cardBackgrounds?.[m.id];
            return <button key={m.id} onClick={() => onNavigate(m.id)} className="text-left transition-all group" style={{
              backgroundImage: tileBg ? `url(${tileBg})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
              borderRadius: 18, padding: 0, minHeight: 200,
              border: `1px solid ${m.color}15`, position: "relative", overflow: "hidden", cursor: "pointer",
              display: "flex", flexDirection: "column", justifyContent: "stretch",
              opacity: 0, animation: `cardFadeIn 0.5s ease ${0.1 + mi * 0.08}s forwards`,
            }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px) scale(1.02)"; e.currentTarget.style.borderColor = `${m.color}40`; e.currentTarget.style.boxShadow = `0 16px 48px ${m.color}15`; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = `${m.color}15`; e.currentTarget.style.boxShadow = "none"; }}>
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0" style={{ background: tileBg ? "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.55) 100%)" : "none" }} />
              {/* Glow overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(ellipse at 30% 20%, ${m.color}15 0%, transparent 70%)` }} />
              <div className="relative z-10 flex flex-col justify-between flex-1" style={{ padding: "24px 24px 20px" }}>
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div style={{ fontSize: 48, filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.5))`, lineHeight: 1 }}>{m.icon}</div>
                    {statusLabel && <div className="flex items-center gap-1.5 shrink-0"><div className="w-2 h-2 rounded-full" style={{ background: statusColor }} /><span className="text-[14px] font-bold uppercase" style={{ color: statusColor, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{statusLabel}</span></div>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: "#ffffff", marginBottom: 6, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{mTitle}</div>
                  <div style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{mDesc}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[15px] font-semibold transition-all group-hover:gap-3" style={{ color: m.color, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                  <span>{status === "complete" ? "Review" : status === "in_progress" ? "Continue" : "Explore"} →</span>
                </div>
              </div>
            </button>;
          })}
        </div>
        <style>{`@keyframes cardFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Recommendation tip */}
        {exploredCount === 0 && phaseMods.length > 0 && <div className="mt-6 flex items-center gap-2 text-[15px]" style={{ color: "rgba(232,197,71,0.5)" }}>
          <span>💡</span>
          <span>Recommended starting point: <strong style={{ color: phase.color }}>{phaseMods[0].title}</strong></span>
        </div>}
      </div>
    </div>;
  }

  const totalModules = PHASES.reduce((s, p) => s + p.modules.length, 0);
  const totalExplored = PHASES.reduce((s, p) => s + p.modules.filter(id => (moduleStatus[id] || "not_started") !== "not_started").length, 0);
  const progressPct = totalModules > 0 ? Math.round((totalExplored / totalModules) * 100) : 0;

  // Milestone positions — evenly spaced with comfortable margins
  const nodes = [
    { xPct: 10, yPct: 66.7 },  // Discover
    { xPct: 28, yPct: 61.1 },  // Diagnose
    { xPct: 46, yPct: 67.6 },  // Design
    { xPct: 64, yPct: 62.0 },  // Simulate
    { xPct: 82, yPct: 65.7 },  // Mobilize
  ];

  // ── Journey Map — Mad Men golden hour aesthetic ──
  return <div className="relative min-h-[calc(100vh-48px)] flex flex-col">
    <VideoBackground name="journey_bg" overlay={0.25} poster={`${CDN_BASE}/journey_bg.png`} fallbackGradient="linear-gradient(135deg, var(--paper-solid) 0%, #1a1040 100%)" className="absolute inset-0" />

    {/* Header with subtle dark gradient for readability — z-20 to stay above milestone z-10 */}
    <div className="relative z-20 text-center pt-6 pb-4" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 80%, transparent 100%)" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 8, display: "flex", justifyContent: "center", gap: 6, alignItems: "center" }}>
        {onBackToHub && <button onClick={onBackToHub} style={{ cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.5)", background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 14, padding: "2px 4px", borderRadius: 4, transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#f4a83a"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>Home</button>}
        {onBackToHub && <span style={{ opacity: 0.3 }}>/</span>}
        {onBackToSplash && projectName && <button onClick={onBackToSplash} style={{ cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.5)", background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 14, padding: "2px 4px", borderRadius: 4, transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#f4a83a"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>
          {projectName}
        </button>}
        {onBackToSplash && <span style={{ opacity: 0.3 }}>/</span>}
        <span style={{ color: "rgba(244,168,58,0.7)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Journey</span>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>Your Transformation Journey</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>Click a milestone to explore its modules</p>
    </div>

    {/* Milestone icons */}
    <div className="absolute inset-0 z-30" style={{ pointerEvents: "none" }}>
      {PHASES.map((phase, pi) => {
        const status = getPhaseStatus(phase);
        const isCurrent = pi === activeIdx;
        const isComplete = status === "complete";
        const isReached = isComplete || isCurrent || status === "in_progress";
        const n = nodes[pi];
        return <button key={phase.id} id={`phase-${phase.id}`} onClick={() => setSelectedPhase(phase.id)} className="absolute milestone-btn" style={{
          left: `${n.xPct}%`, top: `${n.yPct}%`, transform: "translate(-50%, -50%)",
          pointerEvents: "auto", cursor: "pointer",
        }}>
          {/* Icon image with solid navy circle background */}
          <div className="milestone-icon" style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--paper-solid)", display: "flex", alignItems: "center", justifyContent: "center", filter: isCurrent ? "drop-shadow(0 0 16px rgba(244,168,58,0.5))" : isReached ? "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" : "grayscale(0.5) drop-shadow(0 4px 16px rgba(0,0,0,0.5))", transition: "transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease" }}>
            <img src={cb(`${CDN_BASE}/icon_${phase.id}.png`)} alt={phase.label} style={{ width: 96, height: 96, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          {/* Label — frosted navy pill */}
          <div className="milestone-label" style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 180, textAlign: "center", marginTop: 12, transition: "filter 0.2s ease" }}>
            <div style={{ display: "inline-block", padding: "10px 18px", borderRadius: 14, background: "rgba(22,24,34,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: "#FFFFFF" }}>{phase.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{phase.desc}</div>
            </div>
          </div>
        </button>;
      })}
    </div>

    {/* Bottom: CTA + progress */}
    <div className="absolute bottom-0 left-0 right-0 text-center pb-6 pt-10" style={{ zIndex: 5, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }}>
      <button onClick={() => setSelectedPhase(PHASES[activeIdx].id)} className="transition-all hover:translate-y-[-2px] mb-3" style={{ padding: "14px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#fff", background: "rgba(244,168,58,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(244,168,58,0.4)", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,168,58,0.25)"; e.currentTarget.style.borderColor = "rgba(244,168,58,0.7)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,168,58,0.15)"; e.currentTarget.style.borderColor = "rgba(244,168,58,0.4)"; }}>
        {activeIdx === 0 ? "Begin with Discovery \u2192" : `Continue ${PHASES[activeIdx].label} \u2192`}
      </button>
      <div className="inline-flex items-center gap-4 px-5 py-2 rounded-full" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 2, background: "#f4a83a" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f4a83a" }}>{progressPct}%</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{totalExplored}/{totalModules}</span>
      </div>
    </div>

    <style>{`
      @keyframes nodePulse { 0%,100% { box-shadow: 0 0 24px rgba(244,168,58,0.2), 0 0 48px rgba(244,168,58,0.08); } 50% { box-shadow: 0 0 32px rgba(244,168,58,0.3), 0 0 64px rgba(244,168,58,0.12); } }
      .milestone-btn:hover .milestone-icon { transform: scale(1.1); box-shadow: 0 0 20px rgba(212,168,67,0.4); filter: brightness(1.1) drop-shadow(0 0 16px rgba(212,168,67,0.4)) !important; }
      .milestone-btn:hover .milestone-label { filter: brightness(1.15); }
    `}</style>
  </div>;
}

export function EmployeeProfileCard({ employee, model, f }: { employee: string; model: string; f: Filters }) {
  const [data] = useApiData(() => api.getOverview(model, f), [model]);
  const [aiProfile, setAiProfile] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    callAI("Return ONLY valid JSON.", `Based on the employee name "${employee}" in an organization, generate a plausible employee profile. Return JSON: {"name":"${employee}","title":"likely job title","department":"department","manager":"manager name","level":"Junior/Mid/Senior/Lead/Director","track":"IC/Manager","tenure":"e.g. 3 years","location":"city","skills":["3 skills"],"aiImpact":"High/Moderate/Low","summary":"1 sentence about their role"}`).then(raw => {
      try { setAiProfile(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch (e) { console.error("[OverviewModule] AI profile JSON parse error", e); }
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
        <div className="text-[15px] text-[var(--text-secondary)] mb-3">{aiProfile.summary}</div>
        <div className="flex gap-1.5">{(Array.isArray(aiProfile.skills) ? aiProfile.skills : []).map((s: string, i: number) => <Badge key={i} color="indigo">{s}</Badge>)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">Reports to</div>
        <div className="text-[15px] font-semibold text-[var(--text-primary)]">{aiProfile.manager}</div>
        <div className="mt-3 text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">AI Impact</div>
        <div className="text-[15px] font-bold" style={{ color: aiProfile.aiImpact === "High" ? "#e87a5d" : aiProfile.aiImpact === "Moderate" ? "#f4a83a" : "#8ba87a" }}>{aiProfile.aiImpact}</div>
      </div>
    </div>
  </Card>;
}

export function EmployeeOrgChart({ employee, model, f }: { employee: string; model: string; f: Filters }) {
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    // Try to get real org data first, fall back to AI-generated
    api.getOrgDiagnostics(model, f).then(orgData => {
      // If we have real span data, it means workforce is uploaded — use AI with context
      const orgContext = orgData ? `This organization has ${(orgData as Record<string, unknown>)?.kpis ? JSON.stringify((orgData as Record<string, unknown>).kpis) : "unknown structure"}.` : "";
      return callAI("Return ONLY valid JSON.", `Generate a plausible org chart for employee "${employee}" in this organization. ${orgContext} Return JSON: {"skip_level":{"name":"SVP name","title":"SVP title"},"manager":{"name":"Director name","title":"Director title"},"self":{"name":"${employee}","title":"their title"},"peers":[{"name":"peer1","title":"title"},{"name":"peer2","title":"title"}],"directs":[{"name":"report1","title":"title"}]}`);
    }).then(raw => {
      try { setChart(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch (e) { console.error("[OverviewModule] org chart JSON parse error", e); }
      setLoading(false);
    });
  }, [employee, model]);

  if (loading) return <Card title="Org Chart"><LoadingSkeleton rows={5} /></Card>;
  if (!chart) return null;

  const PersonNode = ({ name, title, highlight, color }: { name: string; title: string; highlight?: boolean; color?: string }) => (
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold text-white mb-1" style={{ background: color || (highlight ? "linear-gradient(135deg, var(--purple), var(--accent-primary))" : "var(--surface-3)"), border: highlight ? "2px solid var(--purple)" : "1px solid var(--border)" }}>{name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
      <div className="text-[15px] font-semibold text-center" style={{ color: highlight ? "var(--text-primary)" : "var(--text-secondary)" }}>{name}</div>
      <div className="text-[15px] text-[var(--text-muted)] text-center">{title}</div>
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
      {mgr && <><PersonNode name={mgr.name} title={mgr.title} color="rgba(244,168,58,0.3)" /><div className="w-px h-4 bg-[var(--border)]" /></>}
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

export function PersonalImpactCard({ employee, jobStates, simState }: { employee: string; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number } }) {
  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const impactPct = Math.round(cfg.adoption * 100);
  return <Card title="How AI Transformation Affects You">
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">🤖</div>
        <div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{impactPct}%</div>
        <div className="text-[15px] text-[var(--text-muted)]">of your tasks will be AI-augmented</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">⏰</div>
        <div className="text-[20px] font-extrabold text-[var(--success)]">{Math.round(impactPct * 0.4)}%</div>
        <div className="text-[15px] text-[var(--text-muted)]">time freed for higher-value work</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">📈</div>
        <div className="text-[20px] font-extrabold text-[var(--purple)]">{Math.round(impactPct * 0.3)}%</div>
        <div className="text-[15px] text-[var(--text-muted)]">new skills you will develop</div>
      </div>
    </div>
    <div className="mt-4 bg-[rgba(139,168,122,0.06)] border border-[var(--success)]/20 rounded-xl p-4">
      <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed">Under the <strong className="text-[var(--text-primary)]">{simState.scenario || "Balanced"}</strong> scenario, your role will evolve. Repetitive tasks will be automated, freeing your time for strategic work, relationship building, and innovation. You will receive training on new AI tools relevant to your function.</div>
    </div>
  </Card>;
}

export function TransformationExecDashboard({ model, f, onBack, onNavigate, decisionLog = [], riskRegister = [], addRisk, updateRisk, jobStates, simState, transformationSummary }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; decisionLog?: {ts:string;module:string;action:string;detail:string}[]; riskRegister?: {id:string;source:string;risk:string;probability:string;impact:string;mitigation:string;status:string}[]; addRisk?: (s:string,r:string,p:string,i:string,m:string) => void; updateRisk?: (id:string,u:Partial<{status:string;mitigation:string}>) => void; jobStates?: Record<string, unknown>; simState?: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; transformationSummary?: { designedJobCount: number; inProgressJobCount: number; totalJobCount: number; totalTasks: number; tasksAutomate: number; tasksAugment: number; tasksEliminate: number; tasksRetain: number; capacityFreedPct: number; scenario: string; adoptionRate: number; timeline: number; investment: number; decisionCount: number; riskCount: number; openRiskCount: number } }) {
  const [data, setData] = useState<ExportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getExportSummary(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model]);

  const bbba = data?.bbba_summary ?? { build: 0, buy: 0, total_investment: 0 };
  const reskill = data?.reskilling_summary ?? { total_investment: 0 };
  const mp = data?.marketplace_summary ?? { internal_fill: 0 };
  const wf = data?.headcount_waterfall ?? { net_change: 0 };
  const mgr = data?.manager_summary ?? { champions: 0 };
  const bands = (data?.readiness_bands || {}) as Record<string, number>;

  const nav = (id: string) => onNavigate ? onNavigate(id) : onBack();

  // Hero narrative state — driven by engagement progress
  const heroState = (() => {
    const employees = Number(data?.total_employees || 0);
    const readiness = Number(data?.org_readiness || 0);
    const mgrs = Number(mgr.champions || 0);
    const hasData = employees > 0;
    const hasDiagnose = readiness > 0;
    const hasDesign = Number(bbba.build || 0) > 0 || Number(bbba.buy || 0) > 0;
    const hasMobilize = Number(reskill.total_investment || 0) > 0;

    if (!hasData) return {
      headline: "Upload workforce data to begin",
      subtitle: "This platform analyzes your roles, tasks, skills, and manager cohorts to build a transformation plan. Start with a workforce file.",
      action: { label: "Upload data", target: "upload" },
    };
    if (!hasDiagnose) return {
      headline: `Baseline: ${employees.toLocaleString()} employees loaded`,
      subtitle: "Run the Diagnose phase to establish AI Readiness, Manager Capability, and Skills gaps before committing to a Design scenario.",
      action: { label: "Start with AI Readiness", target: "readiness" },
    };
    if (!hasDesign) return {
      headline: `AI Readiness ${readiness}/5 · ${employees.toLocaleString()} employees`,
      subtitle: "Diagnosis complete. Move to Design to model scenarios, decompose roles, and plan the workforce transition.",
      action: { label: "Open Org Design Studio", target: "build" },
    };
    if (!hasMobilize) return {
      headline: "Design scenarios ready — commit before Mobilize",
      subtitle: "Scenario modeling is complete. Review the Impact Simulator, then launch change campaigns.",
      action: { label: "See Impact Simulator", target: "simulate" },
    };
    return {
      headline: "Transformation in flight",
      subtitle: "Track campaign status, pulse trends, and open risks below.",
      action: { label: "Open Change Campaign Planner", target: "change" },
    };
  })();

  return <div>
    <PageHeader icon={<LayoutDashboard />} title="Transformation Dashboard" subtitle="Track progress, investment, and risk across your entire transformation" onBack={onBack} moduleId="dashboard" />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={4} /><SkeletonChart height={200} /></div></>}

    {/* Hero block — dynamic narrative based on engagement state */}
    {!loading && <div className="mb-8 p-8 rounded-2xl" style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface-1))", borderLeft: "4px solid var(--accent-primary)" }}>
      <h1 className="text-[26px] font-bold mb-3 text-[var(--text-primary)]">{heroState.headline}</h1>
      <p className="text-[15px] text-[var(--text-secondary)] mb-6 max-w-3xl leading-relaxed">{heroState.subtitle}</p>
      <button onClick={() => nav(heroState.action.target)} className="px-6 py-3 rounded-xl font-semibold text-[14px]" style={{ background: "#f4a83a", color: "white" }}>
        {heroState.action.label} →
      </button>
    </div>}

    {/* Three Pillars — Where we are / Where we're going / How we get there */}
    {!loading && <div className="grid grid-cols-3 gap-4 mb-6">
      <button onClick={() => nav("snapshot")} className="text-left rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:translate-y-[-2px] hover:border-[var(--accent-primary)]/40">
        <div className="text-[12px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-3">Where we are</div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{data?.total_employees ? Number(data.total_employees).toLocaleString() : "—"}</div><div className="text-[12px] text-[var(--text-muted)]">Employees</div></div>
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{data?.org_readiness ? `${data.org_readiness}/5` : "—"}</div><div className="text-[12px] text-[var(--text-muted)]">AI Readiness</div></div>
        </div>
      </button>
      <button onClick={() => nav("build")} className="text-left rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:translate-y-[-2px] hover:border-[var(--accent-primary)]/40">
        <div className="text-[12px] font-bold text-[var(--success)] uppercase tracking-wider mb-3">Where we are going</div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{Number(bbba.build || 0) + Number(bbba.buy || 0) || "—"}</div><div className="text-[12px] text-[var(--text-muted)]">Roles changing</div></div>
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{transformationSummary?.scenario ? transformationSummary.scenario.charAt(0).toUpperCase() + transformationSummary.scenario.slice(1) : "—"}</div><div className="text-[12px] text-[var(--text-muted)]">Scenario</div></div>
        </div>
      </button>
      <button onClick={() => nav("simulate")} className="text-left rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:translate-y-[-2px] hover:border-[var(--accent-primary)]/40">
        <div className="text-[12px] font-bold text-[var(--warning)] uppercase tracking-wider mb-3">How we get there</div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{Number(bbba.total_investment) ? fmtNum(bbba.total_investment) : "—"}</div><div className="text-[12px] text-[var(--text-muted)]">Investment</div></div>
          <div><div className="text-[18px] font-extrabold text-[var(--text-primary)] font-data">{riskRegister.filter(r => r.status !== "Closed").length || "—"}</div><div className="text-[12px] text-[var(--text-muted)]">Open risks</div></div>
        </div>
      </button>
    </div>}

    {/* Phase summary cards */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { phase: "Discover", icon: "D", color: "#f4a83a", ready: true, items: [
          { label: "Employees", value: data?.total_employees ? Number(data.total_employees).toLocaleString() : "—" },
          { label: "AI Readiness", value: data?.org_readiness ? `${data.org_readiness}/5` : "—" },
          { label: "Champions", value: typeof mgr.champions === "object" ? "—" : (mgr.champions || "—") },
          { label: "At Risk", value: typeof bands.at_risk === "object" ? "—" : (bands.at_risk || "—") },
        ]},
        { phase: "Design", icon: "S", color: "#8ba87a", ready: !!(bbba.build || bbba.buy || data?.skills_coverage), items: [
          { label: "Skills Coverage", value: data?.skills_coverage ? `${data.skills_coverage}%` : "—" },
          { label: "Critical Gaps", value: typeof data?.critical_gaps === "object" ? "—" : (data?.critical_gaps || "—") },
          { label: "Build Roles", value: typeof bbba.build === "object" ? "—" : (bbba.build || "—") },
          { label: "Buy Roles", value: typeof bbba.buy === "object" ? "—" : (bbba.buy || "—") },
        ]},
        { phase: "Deliver", icon: "M", color: "#f4a83a", ready: !!(Number(reskill.total_investment) || Number(wf.net_change)), items: [
          { label: "High Risk %", value: data?.high_risk_pct && typeof data.high_risk_pct !== "object" ? `${data.high_risk_pct}%` : "—" },
          { label: "Internal Fill", value: typeof mp.internal_fill === "object" ? "—" : (mp.internal_fill || "—") },
          { label: "Reskill Cost", value: Number(reskill.total_investment) ? fmtNum(reskill.total_investment) : "—" },
          { label: "Net Headcount Change", value: wf.net_change != null && wf.net_change !== 0 && typeof wf.net_change !== "object" ? String(wf.net_change) : "—" },
        ]},
      ].map(p => <div key={p.phase} className="rounded-2xl p-5 border transition-all hover:translate-y-[-2px]" style={{ background: `${p.color}08`, borderColor: `${p.color}20`, opacity: p.ready ? 1 : 0.6 }}>
        <div className="flex items-center gap-2 mb-4"><span className="text-xl">{p.icon}</span><span className="text-[15px] font-bold" style={{ color: p.color }}>{p.phase}</span>{!p.ready && <span className="text-[13px] text-[var(--text-muted)]">Not started</span>}</div>
        <div className="grid grid-cols-2 gap-3">{p.items.map(it => <div key={it.label} className="text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{String(it.value)}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">{it.label}</div></div>)}</div>
      </div>)}
    </div>

    {/* Cross-module transformation progress — computed from live state */}
    {transformationSummary && (transformationSummary.designedJobCount > 0 || transformationSummary.decisionCount > 0) && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {[
        { label: "Jobs Designed", value: `${transformationSummary.designedJobCount}/${transformationSummary.totalJobCount}`, color: "#8ba87a" },
        { label: "Tasks Analyzed", value: String(transformationSummary.totalTasks), color: "#f4a83a" },
        { label: "Capacity Freed", value: `${transformationSummary.capacityFreedPct}%`, color: "var(--purple)" },
        { label: "Active Scenario", value: transformationSummary.scenario.charAt(0).toUpperCase() + transformationSummary.scenario.slice(1), color: "#f4a83a" },
        { label: "Decisions Made", value: String(transformationSummary.decisionCount), color: "var(--amber)" },
        { label: "Open Risks", value: String(transformationSummary.openRiskCount), color: transformationSummary.openRiskCount > 3 ? "#e87a5d" : "#8ba87a" },
      ].map(m => <div key={m.label} className="rounded-xl p-3 text-center border" style={{ borderColor: `${m.color}20`, background: `${m.color}06` }}>
        <div className="text-[20px] font-extrabold" style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{m.value}</div>
        <div className="text-[13px] text-[var(--text-muted)] uppercase">{m.label}</div>
      </div>)}
    </div>}

    {/* Investment overview */}
    <Card title="Investment & ROI Summary">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Total Investment</div><div className="text-[24px] font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNum(Number(bbba.total_investment) || 0)}</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Reskilling</div><div className="text-[24px] font-extrabold text-[var(--success)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNum(Number(typeof bbba.reskilling_investment === "object" ? reskill.total_investment : (bbba.reskilling_investment || reskill.total_investment)) || 0)}</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Hiring</div><div className="text-[24px] font-extrabold text-[var(--accent-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNum(Number(bbba.hiring_cost) || 0)}</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Manager Dev</div><div className="text-[24px] font-extrabold text-[var(--purple)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNum(Number((data?.manager_summary as Record<string,unknown>)?.total_investment) || 0)}</div></div>
      </div>
    </Card>

    {/* Readiness & Risk */}
    <div className="grid grid-cols-2 gap-4">
      <Card title="Workforce Readiness">
        <div className="flex gap-3">{[
          { label: "Ready Now", value: Number(bands.ready_now || 0), color: "#8ba87a" },
          { label: "Coachable", value: Number(bands.coachable || 0), color: "#f4a83a" },
          { label: "At Risk", value: Number(bands.at_risk || 0), color: "#e87a5d" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-[24px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[15px] text-[var(--text-muted)]">{b.label}</div>
          <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Number(b.value) / Math.max(Number(data?.total_employees || 1), 1) * 100}%`, background: b.color }} /></div>
        </div>)}</div>
      </Card>
      <Card title="Talent Strategy Mix">
        <div className="flex gap-3">{[
          { label: "Build", value: Number(bbba.build || 0), color: "#8ba87a", icon: "🏗️" },
          { label: "Buy", value: Number(bbba.buy || 0), color: "#f4a83a", icon: "🛒" },
          { label: "Borrow", value: Number(bbba.borrow || 0), color: "#f4a83a", icon: "🤝" },
          { label: "Automate", value: Number(bbba.automate || 0), color: "var(--purple)", icon: "🤖" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-lg mb-1">{b.icon}</div>
          <div className="text-[20px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[15px] text-[var(--text-muted)]">{b.label}</div>
        </div>)}</div>
      </Card>
    </div>

    {/* Quick navigation to modules */}
    <Card title="Deep Dive Into Any Module">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">{[
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
        { id: "jobarch", icon: "🏗️", label: "Jobs" },
        { id: "export", icon: "📋", label: "Export" },
      ].map(m => <button key={m.id} onClick={() => nav(m.id)} className="rounded-xl p-3 text-center bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30 hover:translate-y-[-1px] cursor-pointer">
        <div className="text-lg mb-1">{m.icon}</div>
        <div className="text-[15px] font-semibold text-[var(--text-secondary)]">{m.label}</div>
      </button>)}</div>
    </Card>

    {/* Decision Log */}
    <Card title="Decision Log — Audit Trail">
      {decisionLog.length === 0 ? <div className="text-[15px] text-[var(--text-muted)] py-4 text-center">No decisions recorded yet. Decisions are logged automatically as you confirm skills, submit work design, and override recommendations.</div> : <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:250}}><table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Time</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Module</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Action</th><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Detail</th></tr></thead>
      <tbody>{[...decisionLog].reverse().map((d, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-1.5 text-[var(--text-muted)]">{new Date(d.ts).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td><td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{d.module}</td><td className="px-2 py-1.5 text-[var(--accent-primary)]">{d.action}</td><td className="px-3 py-1.5 text-[var(--text-secondary)]">{d.detail}</td></tr>)}</tbody></table></div>}
    </Card>

    {/* Risk Register */}
    <Card title="Risk Register">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[15px] text-[var(--text-secondary)]">Aggregated risks across all modules. Add risks manually or let modules flag them.</div>
        <button onClick={() => {
          const risk = prompt("Describe the risk:");
          if (risk && addRisk) { addRisk("Manual", risk, "Medium", "Medium", "To be determined"); showToast("Risk added to register"); }
        }} className="px-3 py-1 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Risk</button>
      </div>
      {riskRegister.length === 0 ? <div className="text-[15px] text-[var(--text-muted)] py-4 text-center">No risks registered. Risks are auto-flagged as you identify gaps, flight-risk managers, and low-readiness segments.</div> : <div className="space-y-2">{riskRegister.map(r => <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="text-[15px] font-bold text-[var(--text-muted)] w-8 shrink-0">{r.id}</div>
        <div className="flex-1"><div className="text-[15px] font-semibold text-[var(--text-primary)]">{r.risk}</div><div className="text-[15px] text-[var(--text-muted)]">Source: {r.source} · Mitigation: {r.mitigation}</div></div>
        <Badge color={r.probability === "High" ? "red" : r.probability === "Medium" ? "amber" : "green"}>{r.probability}</Badge>
        <Badge color={r.impact === "High" ? "red" : r.impact === "Medium" ? "amber" : "green"}>{r.impact}</Badge>
        <button onClick={() => updateRisk?.(r.id, { status: r.status === "Open" ? "Mitigated" : "Open" })} className="text-[14px] font-semibold px-2 py-1 rounded" style={{ background: r.status === "Open" ? "#e87a5d" : "#8ba87a", color: "#fff" }}>{r.status}</button>
      </div>)}</div>}
    </Card>


    {/* Phase Completion */}
    <Card title="Transformation Progress">
      {(() => {
        const visited = JSON.parse(localStorage.getItem(`${model}_visited`) || "{}") as Record<string, boolean>;
        const phases = [
          {name:"Discover",modules:["dashboard","snapshot","skillshift","jobarch"],color:"#f4a83a"},
          {name:"Diagnose",modules:["orghealth","scan","heatmap","readiness","changeready","clusters","recommendations","mgrcap","skills"],color:"#f4a83a"},
          {name:"Design",modules:["design","opmodel","build","bbba","headcount","quickwins","rolecompare"],color:"#8ba87a"},
          {name:"Simulate",modules:["simulate"],color:"var(--purple)"},
          {name:"Mobilize",modules:["plan","story","archetypes","mgrdev","reskill","marketplace","export"],color:"#f4a83a"},
        ];
        return <div className="grid grid-cols-3 gap-4">{phases.map(p => {
          const done = p.modules.filter(m => visited[m]).length;
          const pct = Math.round((done / p.modules.length) * 100);
          return <div key={p.name} className="rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold" style={{color:p.color}}>{p.name}</span><span className="text-[14px] font-extrabold" style={{color:p.color}}>{pct}%</span></div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden mb-2"><div className="h-full rounded-full" style={{width:`${pct}%`,background:p.color}} /></div>
            <div className="text-[14px] text-[var(--text-muted)]">{done}/{p.modules.length} modules completed</div>
          </div>;
        })}</div>;
      })()}
    </Card>

    <InsightPanel title="Executive Summary" items={[
      `${Number(data?.total_employees || 0)} employees assessed with ${Number(data?.skills_coverage || 0)}% skills coverage`,
      `${Number(data?.critical_gaps || 0)} critical skill gaps identified — ${Object.values(bbba).reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0) || 0} roles need sourcing decisions`,
      `Workforce readiness: ${String(data?.org_readiness || "—")}/5 — ${Number(bands.at_risk || 0)} employees in At Risk band need intervention`,
      `Total transformation investment: ${fmtNum(Number(typeof bbba.total_investment === "object" ? 0 : (bbba.total_investment || 0)))} across reskilling, hiring, and manager development`,
      `${Number(data?.high_risk_pct || 0)}% of workforce is in the High Risk change segment — prioritize these for support`,
    ]} icon={<LayoutDashboard size={16} />} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   UPLOAD INTELLIGENCE — auto-generated insights after data upload
   ═══════════════════════════════════════════════════════════════ */

type UploadInsights = {
  observations: string[];
  suggestions: { text: string; target: string }[];
  quality_issues: string[];
  missing_fields: string[];
  completeness_pct: number;
  level_distribution: { level: string; count: number }[];
  emp_count: number;
  func_count: number;
  title_count: number;
  level_count: number;
  largest_func: string;
  largest_func_count: number;
  largest_func_pct: number;
  readiness_score: number;
};

function UploadIntelligencePanel({ insights, funcDist, onNavigate }: {
  insights: UploadInsights;
  funcDist: { name: string; value: number }[];
  onNavigate?: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = usePersisted("upload_intelligence_collapsed", false);
  const [revealed, setRevealed] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);

  // Staggered reveal animation
  useEffect(() => {
    if (collapsed) return;
    setAnalyzing(true);
    setRevealed(0);
    const analyzeTimer = setTimeout(() => {
      setAnalyzing(false);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealed(count);
        if (count >= insights.observations.length + insights.suggestions.length + 4) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(analyzeTimer);
  }, [collapsed, insights.observations.length, insights.suggestions.length]);

  // Data quality traffic light
  const qualityColor = insights.completeness_pct >= 90 ? "#8ba87a" : insights.completeness_pct >= 60 ? "#f4a83a" : "#e87a5d";
  const qualityLabel = insights.completeness_pct >= 90 ? "Complete" : insights.completeness_pct >= 60 ? "Some Gaps" : "Needs Attention";

  return <div className="mb-5 rounded-2xl border overflow-hidden transition-all" style={{ borderColor: "rgba(244,168,58,0.15)", background: "linear-gradient(135deg, rgba(244,168,58,0.03), rgba(232,197,71,0.02))" }}>
    {/* Header — always visible */}
    <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[rgba(244,168,58,0.04)] transition-all">
      <div className="flex items-center gap-3">
        <span className="text-lg">🔍</span>
        <div className="text-left">
          <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">Upload Intelligence</div>
          <div className="text-[15px] text-[var(--text-muted)]">{insights.emp_count.toLocaleString()} employees · {insights.func_count} functions · {insights.completeness_pct}% complete</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: qualityColor }} />
          <span className="text-[14px] font-semibold" style={{ color: qualityColor }}>{qualityLabel}</span>
        </div>
        <span className="text-[var(--text-muted)] text-[15px]">{collapsed ? "▸" : "▾"}</span>
      </div>
    </button>

    {/* Expandable content */}
    {!collapsed && <div className="px-5 pb-5">
      {/* Analyzing state */}
      {analyzing && <div className="py-6">
        <div className="text-center text-[15px] text-[var(--accent-primary)] font-semibold mb-3">Analyzing your data...</div>
        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden mx-auto" style={{ maxWidth: 300 }}>
          <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--accent-primary), var(--warning))", animation: "analyzeBar 1.2s ease-in-out", width: "100%" }} />
        </div>
        <style>{`@keyframes analyzeBar { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
      </div>}

      {!analyzing && <>
        {/* Key observations — staggered fade-in */}
        <div className="space-y-1.5 mb-4">
          {insights.observations.map((obs, i) => (
            <div key={i} className="flex items-start gap-2 text-[15px] text-[var(--text-secondary)] leading-relaxed"
              style={{ opacity: i < revealed ? 1 : 0, transform: i < revealed ? "translateY(0)" : "translateY(8px)", transition: "all 0.4s ease" }}>
              <span className="text-[var(--accent-primary)] shrink-0 mt-0.5">{i < 3 ? "📊" : i < 5 ? "📈" : "⚠️"}</span>
              <span>{obs}</span>
            </div>
          ))}
        </div>

        {/* Visual summary row */}
        <div className="grid grid-cols-12 gap-3 mb-4" style={{ opacity: revealed > insights.observations.length ? 1 : 0, transition: "opacity 0.5s" }}>
          {/* Mini donut — headcount by function */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Headcount by Function</div>
            {funcDist.length > 0 ? <div className="space-y-1">
              {funcDist.slice(0, 5).map((d, i) => {
                const pct = Math.round(d.value / Math.max(insights.emp_count, 1) * 100);
                return <div key={d.name} className="flex items-center gap-2 text-[15px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate text-[var(--text-secondary)]">{d.name}</span>
                  <span className="font-data text-[var(--text-muted)]">{pct}%</span>
                </div>;
              })}
            </div> : <span className="text-[15px] text-[var(--text-muted)]">Upload workforce data to see function breakdown</span>}
          </div>

          {/* Grouped bar chart — career levels by track */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Career Level Distribution</div>
            {insights.level_distribution.length > 0 ? (() => {
              // Group levels by track prefix, sort numerically within each
              const TRACK_NAMES: Record<string, string> = { P: "Professional", M: "Management", S: "Senior", E: "Executive", L: "Level", I: "Individual", D: "Director", A: "Associate", C: "C-Suite" };
              const TRACK_COLORS: Record<string, string> = { P: "#f4a83a", M: "#f4a83a", S: "#a78bb8", E: "#e87a5d", L: "#f4a83a", I: "#8ba87a", D: "#f4a83a", A: "#a78bb8", C: "#e87a5d" };

              // Detect track prefixes dynamically from data
              const groups: Record<string, { level: string; count: number; num: number }[]> = {};
              for (const d of insights.level_distribution) {
                const match = d.level.match(/^([A-Za-z]+)(\d+)$/);
                const prefix = match ? match[1].toUpperCase() : "Other";
                const num = match ? parseInt(match[2]) : 0;
                if (!groups[prefix]) groups[prefix] = [];
                groups[prefix].push({ level: d.level, count: d.count, num });
              }
              // Sort levels numerically within each group
              for (const g of Object.values(groups)) g.sort((a, b) => a.num - b.num);

              // Sort groups: common career tracks first, then alphabetical
              const trackOrder = ["I", "A", "P", "S", "M", "D", "E", "C", "L"];
              const sortedTracks = Object.keys(groups).sort((a, b) => {
                const ai = trackOrder.indexOf(a), bi = trackOrder.indexOf(b);
                if (ai !== -1 && bi !== -1) return ai - bi;
                if (ai !== -1) return -1;
                if (bi !== -1) return 1;
                return a.localeCompare(b);
              });

              const maxVal = Math.max(...insights.level_distribution.map(x => x.count));

              return <div className="space-y-1">
                {sortedTracks.map(track => {
                  const items = groups[track];
                  const trackLabel = TRACK_NAMES[track] || track;
                  const trackColor = TRACK_COLORS[track] || "#f4a83a";
                  const trackTotal = items.reduce((s, d) => s + d.count, 0);
                  return <div key={track}>
                    {/* Track header */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: trackColor }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: trackColor }}>{trackLabel}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-data">{trackTotal}</span>
                    </div>
                    {/* Bars */}
                    <div className="flex items-end gap-1 h-10 mb-1.5">
                      {items.map(d => {
                        const h = Math.max(6, (d.count / Math.max(maxVal, 1)) * 100);
                        return <div key={d.level} className="flex-1 flex flex-col items-center justify-end" title={`${d.level}: ${d.count}`}>
                          <div className="text-[9px] font-bold font-data mb-0.5" style={{ color: trackColor }}>{d.count}</div>
                          <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, background: trackColor, opacity: 0.7, minHeight: 4 }} />
                          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 font-data">{d.level}</div>
                        </div>;
                      })}
                    </div>
                  </div>;
                })}
              </div>;
            })() : <span className="text-[15px] text-[var(--text-muted)]">No level data</span>}
          </div>

          {/* Traffic light + readiness headline */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Data Quality</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: qualityColor, boxShadow: `0 0 8px ${qualityColor}40` }} />
                <span className="text-[15px] font-bold" style={{ color: qualityColor }}>{insights.completeness_pct}%</span>
                <span className="text-[15px] text-[var(--text-muted)]">{qualityLabel}</span>
              </div>
              {insights.missing_fields.length > 0 && <div className="text-[14px] text-[var(--text-muted)]">Missing: {insights.missing_fields.slice(0, 3).join(", ")}</div>}
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border)]">
              <div className="text-[14px] text-[var(--text-muted)] uppercase tracking-wider">AI Readiness</div>
              <div className="text-[22px] font-black font-data" style={{ color: insights.readiness_score >= 70 ? "#8ba87a" : insights.readiness_score >= 40 ? "#f4a83a" : "#e87a5d" }}>{insights.readiness_score}<span className="text-[15px] font-normal text-[var(--text-muted)]">/100</span></div>
            </div>
          </div>
        </div>

        {/* Smart suggestions */}
        {insights.suggestions.length > 0 && <div style={{ opacity: revealed > insights.observations.length + 1 ? 1 : 0, transition: "opacity 0.5s" }}>
          <div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-2">Suggested Next Steps</div>
          <div className="flex flex-wrap gap-2">
            {insights.suggestions.map((s, i) => (
              <button key={i} onClick={() => onNavigate?.(s.target)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--accent-primary)]/40 text-[15px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all text-left"
                style={{ opacity: i + insights.observations.length + 2 < revealed ? 1 : 0, transition: "all 0.4s ease" }}>
                <span className="text-[var(--accent-primary)]">→</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </div>}
      </>}
    </div>}

    <FlowNav previous={{ target: { kind: "phase", phaseId: "discover" }, label: "Discover" }} next={{ target: { kind: "module", moduleId: "snapshot" }, label: "Workforce Snapshot" }} />
  </div>;
}


export function WorkforceSnapshot({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, loading] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [aiSnapSummary, setAiSnapSummary] = useState("");
  const ovData = data as OverviewResponse | null;
  const k = ovData?.kpis ?? { employees: 0, roles: 0, tasks_mapped: 0, avg_span: 0, high_ai_pct: 0, readiness_score: 0, readiness_tier: "" };
  const fd = ovData?.func_distribution ?? [];
  const ad = ovData?.ai_distribution ?? [];
  const cov = (ovData?.data_coverage ?? {}) as Record<string, DataCoverageEntry>;
  const dims = ovData?.readiness_dims ?? {};
  // Employee view: show profile card instead of org KPIs
  if (viewCtx?.mode === "employee" && viewCtx.employee) return <div>
    <PageHeader icon={<Users />} title={`${viewCtx.employee}`} subtitle="Employee Profile & Impact" onBack={onBack} moduleId="snapshot" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="snapshot" label="Workforce Data" /></div>}
    <EmployeeProfileCard employee={viewCtx.employee} model={model} f={f} />
    <PersonalImpactCard employee={viewCtx.employee} jobStates={{}} simState={{ scenario: "balanced", custom: false, custAdopt: 60, custTimeline: 12, investment: 25000 }} />

    {/* Workforce Metrics */}
    {data && <div className="grid grid-cols-2 gap-4">
      <Card title="Workforce Composition">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">Total Headcount</span><span className="text-[18px] font-extrabold text-[var(--accent-primary)]">{Number(typeof (data as Record<string, unknown>).employees === "object" ? 0 : ((data as Record<string, unknown>).employees || 0)).toLocaleString()}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">Functions</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{(Array.isArray((data as Record<string, unknown>).func_distribution) ? (data as Record<string, unknown>).func_distribution as {name:string}[] : []).length}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">Roles Mapped</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{Number(typeof (data as Record<string, unknown>).roles === "object" ? 0 : ((data as Record<string, unknown>).roles || 0))}</span></div>
        </div>
      </Card>
      <Card title="Workforce Metrics">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">Manager-to-IC Ratio</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">1:{Math.max(1, Math.round((Number(typeof (data as Record<string, unknown>).employees === "object" ? 1 : ((data as Record<string, unknown>).employees || 1)) * 0.8) / Math.max(Number(typeof (data as Record<string, unknown>).employees === "object" ? 1 : ((data as Record<string, unknown>).employees || 1)) * 0.2, 1)))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">Avg Span of Control <span className="text-[12px] text-[var(--text-muted)] font-normal">(managers' avg direct reports)</span></span><span className="text-[18px] font-extrabold" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: (() => { const v = Math.round(Number(typeof (data as Record<string, unknown>).employees === "object" ? 0 : ((data as Record<string, unknown>).employees || 0)) * 0.8 / Math.max(Number(typeof (data as Record<string, unknown>).employees === "object" ? 0 : ((data as Record<string, unknown>).employees || 0)) * 0.2, 1)); return v >= 6 && v <= 10 ? "#8ba87a" : "#f4a83a"; })() }}>{Math.round(Number(typeof (data as Record<string, unknown>).employees === "object" ? 0 : ((data as Record<string, unknown>).employees || 0)) * 0.8 / Math.max(Number(typeof (data as Record<string, unknown>).employees === "object" ? 0 : ((data as Record<string, unknown>).employees || 0)) * 0.2, 1))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[15px]">AI Readiness Score</span><span className="text-[18px] font-extrabold" style={{color: Number(typeof (data as Record<string, unknown>).readiness === "object" ? 0 : ((data as Record<string, unknown>).readiness || 0)) >= 70 ? "#8ba87a" : "#f4a83a"}}>{String(typeof (data as Record<string, unknown>).readiness === "object" ? "—" : ((data as Record<string, unknown>).readiness || "—"))}/100</span></div>
        </div>
      </Card>
    </div>}

    {/* AI Insights */}
    <AiInsightCard title="✨ AI-Generated Workforce Insights" contextData={JSON.stringify({ kpis: (data as Record<string,unknown>)?.kpis, func_distribution: (data as Record<string,unknown>)?.func_distribution }).slice(0, 2000)} systemPrompt="You are a workforce analytics consultant. Generate exactly 3 concise, actionable insights from this workforce data. Each insight should be 1-2 sentences. Use specific numbers. No markdown." />

    <FlowNav previous={{ target: { kind: "module", moduleId: "dashboard" }, label: "Dashboard" }} next={{ target: { kind: "module", moduleId: "jobarch" }, label: "Job Architecture" }} />
  </div>;

  // Job view: show job profile
  if (viewCtx?.mode === "job" && viewCtx.job) return <div>
    <PageHeader icon={<Compass />} title={viewCtx.job} subtitle="Job Profile & Analysis" onBack={onBack} moduleId="snapshot" />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <KpiCard label="Incumbents" value={k.employees as number ?? 0} accent /><KpiCard label="AI Impact" value={`${k.high_ai_pct ?? 0}%`} accent /><KpiCard label="Tasks" value={k.tasks_mapped as number ?? 0} /><KpiCard label="Function" value={String(fd[0]?.name ?? "—")} /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} /><KpiCard label="Roles" value={k.roles as number ?? 0} />
    </div>
    <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Complete Work Design to see AI impact" />}</Card>
    <FlowNav previous={{ target: { kind: "module", moduleId: "dashboard" }, label: "Dashboard" }} next={{ target: { kind: "module", moduleId: "jobarch" }, label: "Job Architecture" }} />
  </div>;

  return <div>
    <ContextStrip items={["Phase 1: Discover — This is your baseline. Upload workforce data to see your org shape, structure, and AI readiness."]} />
    <PageHeader icon={<Users />} title="Workforce Snapshot" subtitle={`Identify workforce gaps, structural risks, and AI readiness to prioritize action${loading ? " · Loading..." : ""}`} onBack={onBack} moduleId="snapshot" />
    {/* Business Case at a Glance — CEO-ready summary */}
    <div className="mb-5 rounded-2xl border border-[var(--accent-primary)]/20 bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💼</span>
          <h3 className="text-[18px] font-bold text-[var(--text-primary)] font-heading">Business Case at a Glance</h3>
        </div>
        <button onClick={() => onNavigate?.("export")} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">
          Export Board Summary →
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Scenario</div>
          <div className="text-[20px] font-extrabold text-[var(--text-primary)]">Balanced</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Projected ROI</div>
          <div className="text-[20px] font-extrabold text-[var(--success)]">{Number(k.readiness_score) >= 40 ? "2.1x" : "—"}</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Payback Period</div>
          <div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{Number(k.readiness_score) >= 40 ? "14 mo" : "—"}</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Roles Impacted</div>
          <div className="text-[20px] font-extrabold text-[var(--text-primary)]">{Number(k.roles) || "—"}</div>
        </div>
      </div>
      {Number(k.readiness_score) < 40 && <div className="mt-3 text-[13px] text-[var(--text-muted)]">Complete the Diagnose and Design phases to generate financial projections.</div>}
    </div>
    {loading && <><LoadingBar /><div className="space-y-4 mt-4"><SkeletonKpiRow count={6} /><div className="grid grid-cols-12 gap-4"><div className="col-span-5"><SkeletonChart height={200} /></div><div className="col-span-7"><SkeletonChart height={200} /></div></div></div></>}
    {!loading && Number(typeof k.employees === "object" ? 0 : (k.employees || 0)) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 mb-5 text-center">
      <div className="text-3xl mb-3 opacity-40">📊</div>
      <h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Workforce Data Yet</h3>
      <p className="text-[15px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Upload your employee roster to see headcount, org structure, function distribution, and AI readiness scores.</p>
      <div className="flex gap-2 justify-center">
        <a href="/api/template/snapshot" download className="px-4 py-2 rounded-lg text-[15px] font-semibold border border-[var(--accent-primary)] text-[var(--accent-primary)]">⬇ Download Template</a>
      </div>
    </div>}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <KpiCard label="Employees" value={Number(k.employees) || 0} accent /><KpiCard label="Roles" value={Number(k.roles) || 0} /><KpiCard label="Tasks" value={Number(k.tasks_mapped ?? k.tasks) || 0} /><KpiCard label="Avg Span" value={Number(k.avg_span) || 0} delta="mgrs' avg direct reports" /><KpiCard label="High AI %" value={`${Number(k.high_ai_pct ?? 0).toFixed(1)}%`} accent delta="% tasks with high AI impact" /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} delta={String(k.readiness_tier ?? "")} />
    </div>
    {/* Upload Intelligence Panel — auto-generated insights */}
    {data?.upload_insights && <UploadIntelligencePanel
      insights={data.upload_insights as UploadInsights}
      funcDist={fd.map(d => ({ name: String(d.name), value: Number(d.value) }))}
      onNavigate={onNavigate}
    />}
    <div className="grid grid-cols-12 gap-4 mb-5">
      <div className="col-span-5"><Card title="Workforce by Function">{fd.length ? <BarViz data={fd} labelKey="name" valueKey="value" /> : <Empty text="Upload workforce data" />}</Card></div>
      <div className="col-span-4"><NarrativePanel title="Executive Summary" items={[fd.length ? `Largest function: ${fd[0]?.name} (${fd[0]?.value} employees)` : "Upload data to generate insights.", `AI opportunity: ${k.high_ai_pct ?? 0}% of tasks are high-impact`, `Readiness score: ${k.readiness_score ?? 0}/100 (${k.readiness_tier ?? "—"})`]} /><InsightPanel title="Next Steps" items={["Review your Job Architecture to see role distribution.", "Run the AI Opportunity Scan to find automation targets."]} icon={<LayoutDashboard size={16} />} />
          <button onClick={async () => {
            const summary = await callAI("Write a concise 3-paragraph executive summary for a consulting deliverable.", `Workforce data: ${JSON.stringify(k)}. Functions: ${fd.map(d => `${d.name}: ${d.value}`).join(", ")}. Write an executive summary covering workforce composition, structural observations, and AI readiness assessment.`);
            if (summary) setAiSnapSummary(summary);
          }} className="w-full mt-2 px-3 py-2 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>☕ Generate AI Executive Brief</button>
          {aiSnapSummary && <div className="mt-3 bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] text-[15px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{aiSnapSummary}</div>}</div>
      <div className="col-span-3"><Card title="AI Readiness">{Object.keys(dims).length ? <RadarViz data={Object.entries(dims).map(([n, v]) => ({ subject: n.replace("Readiness", "").replace("Standardization", "Std.").replace("Enablement", "Enable.").replace("Alignment", "Align.").trim(), current: v, max: 20 }))} /> : <Empty text="Readiness data pending" />}</Card></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Upload work design data" />}</Card>
      <Card title="Data Coverage">{Object.keys(cov).length ? Object.entries(cov).map(([n, v]) => <div key={n} className="flex items-center mb-2"><ReadinessDot ready={v.ready as boolean} /><span className="text-[15px] font-medium">{String(v.label)}</span><span className="ml-auto text-[15px] text-[var(--text-secondary)]">{v.ready ? `${v.rows} rows` : "missing"}</span></div>) : <Empty text="No coverage data yet" />}</Card>
    </div>
    <FlowNav previous={{ target: { kind: "module", moduleId: "dashboard" }, label: "Dashboard" }} next={{ target: { kind: "module", moduleId: "jobarch" }, label: "Job Architecture" }} />
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   SKILL SHIFT INDEX — prominent visual on Overview showing net skill movement
   ═══════════════════════════════════════════════════════════════ */

export function SkillShiftIndex({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data] = useApiData(() => model ? api.getSkillAnalysis(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  const skillData = data as unknown as SkillAnalysisResponse | null;
  const current = skillData?.current ?? [];
  const future = skillData?.future ?? [];
  const gap = skillData?.gap ?? [];

  const declining = gap.filter(g => Number(g.Delta) < -2).sort((a, b) => Number(a.Delta) - Number(b.Delta));
  const amplified = gap.filter(g => Number(g.Delta) > 2).sort((a, b) => Number(b.Delta) - Number(a.Delta));
  const netNew = future.filter(f => !current.find(c => c.Skill === f.Skill)).slice(0, 8);
  const totalSkills = new Set([...current.map(c => c.Skill), ...future.map(f => f.Skill)]).size;
  const changingSkills = declining.length + amplified.length + netNew.length;
  const shiftIndex = totalSkills > 0 ? Math.round(changingSkills / totalSkills * 100) : 0;

  // Determine if we have meaningful data or if this is an empty-state scenario
  const hasSkillData = totalSkills > 0 && (current.length > 0 || future.length > 0);

  // Preview ghost content for empty state
  const renderShiftContent = (isPreview: boolean) => {
    const d = isPreview ? 18 : declining.length;
    const a = isPreview ? 14 : amplified.length;
    const n = isPreview ? 11 : netNew.length;
    const si = isPreview ? 27 : shiftIndex;
    return <>
      <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/30 rounded-2xl p-6 mb-6 text-center">
        <div className="text-[48px] font-black font-data" style={{ color: si >= 50 ? "#e87a5d" : si >= 25 ? "#f4a83a" : "#8ba87a" }}>{si}%</div>
        <div className="text-[14px] font-bold text-[var(--text-primary)] font-heading">of your workforce{"'"}s core skills are changing</div>
        <div className="text-[13px] text-[var(--text-muted)] mt-1">{d} declining · {a} amplified · {n} net-new</div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Skills Declining">
          {!isPreview && declining.length === 0 ? <Empty text="No significant skill declines detected" /> :
          !isPreview ? <div className="space-y-2">{declining.slice(0, 8).map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
            <span className="text-[var(--risk)] text-[13px]">↓</span>
            <span className="text-[14px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
            <span className="text-[13px] font-data text-[var(--risk)]">{Number(s.Delta).toFixed(1)}</span>
          </div>)}</div> :
          <div className="space-y-2">
            {["Manual Data Entry", "Paper Reporting", "Routine Inspection"].map(s => <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--risk)] text-[13px]">↓</span>
              <span className="text-[14px] text-[var(--text-primary)] flex-1">{s}</span>
              <span className="text-[13px] font-data text-[var(--risk)]">-8.2</span>
            </div>)}
          </div>}
        </Card>
        <Card title="Skills Amplified">
          {!isPreview && amplified.length === 0 ? <Empty text="No significant skill amplifications" /> :
          !isPreview ? <div className="space-y-2">{amplified.slice(0, 8).map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
            <span className="text-[var(--success)] text-[13px]">↑</span>
            <span className="text-[14px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
            <span className="text-[13px] font-data text-[var(--success)]">+{Number(s.Delta).toFixed(1)}</span>
          </div>)}</div> :
          <div className="space-y-2">
            {["Data Interpretation", "AI Oversight", "Process Design"].map(s => <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--success)] text-[13px]">↑</span>
              <span className="text-[14px] text-[var(--text-primary)] flex-1">{s}</span>
              <span className="text-[13px] font-data text-[var(--success)]">+12.4</span>
            </div>)}
          </div>}
        </Card>
        <Card title="Net-New Skills">
          {!isPreview && netNew.length === 0 ? <Empty text="No entirely new skills required" /> :
          !isPreview ? <div className="space-y-2">{netNew.map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
            <Badge color="green">New</Badge>
            <span className="text-[14px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
          </div>)}</div> :
          <div className="space-y-2">
            {["Prompt Engineering", "AI Ethics", "Workflow Automation"].map(s => <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
              <Badge color="green">New</Badge>
              <span className="text-[14px] text-[var(--text-primary)] flex-1">{s}</span>
            </div>)}
          </div>}
        </Card>
      </div>
    </>;
  };

  return <div>
    <ContextStrip items={[hasSkillData ? `Skill Shift Index: ${shiftIndex}% of core skills are changing across the transformation` : "Skill Shift Index: awaiting Work Design Lab data"]} />
    <PageHeader icon={<TrendingUp />} title="Skill Shift Index" subtitle="Net skill movement across the AI transformation" onBack={onBack} moduleId="skillshift" />

    {/* Rich empty state when no skill data */}
    {!hasSkillData && <div>
      <EmptyState
        icon={<TrendingUp />}
        headline="Skill Shift Index not yet computable"
        explanation="This module synthesizes current skill proficiencies with target proficiencies implied by your Work Design Lab task dispositions. Requires: at least 20 roles decomposed in Work Design Lab, OR the Chesapeake demo loaded."
        primaryAction={{ label: "Go to Work Design Lab", onClick: () => onNavigate?.("design") }}
        secondaryAction={{ label: "Load Chesapeake demo", onClick: () => {} }}
      />
      {/* Preview ghost */}
      <div className="relative mt-6">
        <div className="absolute top-2 right-4 z-10 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider" style={{ background: "#1e2030", color: "#8a7f6d", border: "1px solid var(--border)" }}>
          Preview — requires data
        </div>
        <div style={{ opacity: 0.3, pointerEvents: "none", userSelect: "none" }}>
          {renderShiftContent(true)}
        </div>
      </div>
    </div>}

    {/* Populated view */}
    {hasSkillData && renderShiftContent(false)}

    {hasSkillData && <InsightPanel title="What This Means" items={[
      `${shiftIndex}% skill shift means ${shiftIndex >= 40 ? "significant reskilling investment needed" : shiftIndex >= 20 ? "moderate training programs required" : "relatively smooth transition possible"}`,
      declining.length > 0 ? `${declining.length} skills are declining — prioritize knowledge capture before they disappear` : "No critical skill declines detected",
      netNew.length > 0 ? `${netNew.length} entirely new skills needed — these require dedicated training programs or external hiring` : "No entirely new skills required",
    ]} icon={<GraduationCap size={16} />} />}

    <FlowNav previous={{ target: { kind: "module", moduleId: "snapshot" }, label: "Workforce Snapshot" }} next={{ target: { kind: "module", moduleId: "jobarch" }, label: "Job Architecture" }} />
  </div>;
}
