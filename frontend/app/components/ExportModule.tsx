"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import type { ExportSummaryResponse } from "../../types/api";
import {
  ViewContext, COLORS, TT,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ModuleExportButton, NextStepBar, ContextStrip, InfoButton,
  useApiData, usePersisted, callAI, showToast, logDec,
  exportToCSV, EmptyWithAction, fmtNum, HelpBookAccordion
} from "./shared";

export function ExportReport({ model, f, onBack, onNavigate, jobStates, simState, decisionLog, riskRegister }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, { deconRows: Record<string, unknown>[]; redeployRows: Record<string, unknown>[]; scenario: string; deconSubmitted: boolean; redeploySubmitted: boolean; finalized: boolean }>; simState?: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; decisionLog?: { ts: string; module: string; action: string; detail: string }[]; riskRegister?: { id: string; source: string; risk: string; probability: string; impact: string; mitigation: string; status: string }[] }) {
  const [data, setData] = useState<ExportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [generated, setGenerated] = useState(false);

  const [error, setError] = useState(false);
  useEffect(() => { if (!model) return; setLoading(true); setError(false); api.getExportSummary(model, f).then(d => { setData(d); setLoading(false); }).catch(() => { setLoading(false); setError(true); }); }, [model, f.func, f.jf, f.sf, f.cl]);

  const generateDocx = async () => {
    setGenerating(true); setGenStatus("Preparing Word document...");
    try {
      const resp = await api.apiFetch(`/api/export/docx/${model}`);
      if (resp.ok) { setGenStatus("Downloading..."); const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `AI_Transformation_Report.docx`; a.click(); URL.revokeObjectURL(url); setGenerated(true); showToast("Word document downloaded successfully"); }
      else { showToast("Couldn't export — check that the backend is running"); }
    } catch { showToast("The export service isn't responding — try again shortly"); }
    setGenerating(false); setGenStatus("");
  };
  const generateAiNarrative = async () => {
    setGenerating(true); setGenStatus("Analyzing data and generating AI narrative...");
    const ctx = JSON.stringify(data).slice(0, 3000);
    const designCtx = jobStates ? Object.entries(jobStates).filter(([,s]) => s.deconSubmitted).map(([role, s]) => `${role}: ${s.redeployRows?.length || 0} tasks redesigned`).join(", ") : "";
    const scenarioCtx = simState ? `Active scenario: ${simState.scenario}${simState.custom ? ` (${simState.custAdopt}% adoption)` : ""}` : "";
    const riskCtx = riskRegister ? `${riskRegister.filter(r => r.status === "Open").length} open risks` : "";
    const extraCtx = [designCtx, scenarioCtx, riskCtx].filter(Boolean).join(". ");
    setGenStatus("Writing 12-section board report — this may take 30-60 seconds...");
    const report = await callAI("Write a board-ready AI Transformation Report.", `Generate from: ${ctx}. Additional context: ${extraCtx}. 12 sections: Exec Summary, Discovery, Skills, BBBA, Headcount, Readiness, Managers, Change, Reskilling, Investment, Risks, Next Steps.`);
    if (report) { setGenStatus("Formatting report..."); const blob = new Blob([report], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "AI_Narrative_Report.txt"; a.click(); URL.revokeObjectURL(url); showToast("AI narrative report downloaded successfully"); }
    setGenerating(false); setGenStatus("");
  };

  const bbba = data?.bbba_summary ?? { build: 0, buy: 0, total_investment: 0 };
  const reskill = data?.reskilling_summary ?? { total_investment: 0 };
  const mp = data?.marketplace_summary ?? { internal_fill: 0 };
  const wf = data?.headcount_waterfall ?? { net_change: 0 };
  const mgr = data?.manager_summary ?? { champions: 0 };

  if (!model && !data) return <div>
    <PageHeader icon="📋" title="Export & Report" subtitle="Consolidated transformation report generator" onBack={onBack} moduleId="export" />
    <Empty icon="📋" text="No Data Available for Export" subtitle="Complete at least one analysis module (Diagnose, Design, or Simulate) to generate exportable deliverables." action="Go to Overview" onAction={() => onNavigate?.("dashboard")} />
  </div>;

  return <div>
    <ContextStrip items={["Generate your board-ready transformation report. All module data is summarized below."]} />
    <PageHeader icon="📋" title="Export & Report" subtitle="Consolidated transformation report generator" onBack={onBack} moduleId="export" />
    {loading && <LoadingBar />}
    {generating && genStatus && <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-4 border border-[var(--accent-primary)]/20 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin shrink-0" />
      <div className="flex-1 text-[15px] text-[var(--text-secondary)]">{genStatus}</div>
      <button onClick={() => { setGenerating(false); setGenStatus(""); }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--risk)]">Cancel</button>
    </div>}
    {error && <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-4 border border-[var(--risk)]/20 flex items-center gap-3">
      <span className="text-lg">⚠️</span>
      <div className="flex-1"><div className="text-[15px] font-semibold text-[var(--risk)]">Backend unavailable</div><div className="text-[15px] text-[var(--text-muted)]">Export data could not be loaded. Downloads still work if the backend comes back online.</div></div>
      <button onClick={() => { setLoading(true); setError(false); api.getExportSummary(model, f).then(d => { setData(d); setLoading(false); }).catch(() => { setLoading(false); setError(true); }); }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Retry</button>
    </div>}

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
          { label: "Reskilling Cost", value: fmtNum(reskill.total_investment || 0), icon: "📚" },
          { label: "Total Investment", value: fmtNum(bbba.total_investment || 0), icon: "💰" },
          { label: "Internal Fill", value: `${mp.internal_fill || 0} roles`, icon: "🏪" },
        ].map(k => <div key={k.label} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center transition-all hover:border-[var(--accent-primary)]/30 hover:translate-y-[-1px]">
          <div className="text-lg mb-1">{k.icon}</div>
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>{String(k.value)}</div>
          <div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div>
        </div>)}
      </div>
    </Card>

    {/* Cross-module decisions summary */}
    {(jobStates || simState || decisionLog || riskRegister) && <Card title="Transformation Decisions Captured">
      <div className="grid grid-cols-4 gap-3 mb-2">
        <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center">
          <div className="text-lg mb-1">✏️</div>
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>{jobStates ? Object.values(jobStates).filter(s => s.deconSubmitted).length : 0}</div>
          <div className="text-[13px] text-[var(--text-muted)] uppercase">Jobs Designed</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center">
          <div className="text-lg mb-1">⚡</div>
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]">{simState?.scenario || "—"}</div>
          <div className="text-[13px] text-[var(--text-muted)] uppercase">Active Scenario</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center">
          <div className="text-lg mb-1">📝</div>
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>{decisionLog?.length || 0}</div>
          <div className="text-[13px] text-[var(--text-muted)] uppercase">Decisions Logged</div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)] text-center">
          <div className="text-lg mb-1">⚠️</div>
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>{riskRegister?.filter(r => r.status === "Open").length || 0}</div>
          <div className="text-[13px] text-[var(--text-muted)] uppercase">Open Risks</div>
        </div>
      </div>
    </Card>}

    {/* Export formats */}
    <Card title="Export Deliverables">
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Word Report */}
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--border)] text-center card-hover">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading mb-1">Word Report</div>
          <div className="text-[15px] text-[var(--text-muted)] mb-3">Board-ready 12-section narrative with data tables</div>
          <button onClick={generateDocx} disabled={generating} className="px-5 py-2 rounded-xl text-[15px] font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>{generating ? "Generating..." : "Export to .docx"}</button>
        </div>

        {/* AI Narrative */}
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--border)] text-center card-hover">
          <div className="text-3xl mb-2">☕</div>
          <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading mb-1">AI Narrative</div>
          <div className="text-[15px] text-[var(--text-muted)] mb-3">Claude-generated board-ready narrative report</div>
          <button onClick={generateAiNarrative} disabled={generating} className="px-5 py-2 rounded-xl text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">{generating ? "Writing..." : "Generate Board-Ready Report"}</button>
        </div>

        {/* Excel Workbook */}
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--border)] text-center card-hover">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading mb-1">Excel Workbook</div>
          <div className="text-[15px] text-[var(--text-muted)] mb-3">All datasets as formatted sheets</div>
          <button onClick={async () => {
            try {
              const resp = await api.apiFetch(`/api/export/download/workforce?model_id=${model}&${Object.entries(f).map(([k,v])=>`${k}=${v}`).join("&")}`);
              if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${model}_data_export.xlsx`; a.click(); URL.revokeObjectURL(url); showToast("📊 Excel downloaded"); }
            } catch { showToast("Couldn't export — try again in a moment"); }
          }} className="px-5 py-2 rounded-xl text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30">Download .xlsx</button>
        </div>
      </div>

      {/* Second row: PowerPoint + PDF */}
      <div className="grid grid-cols-2 gap-4">
        {/* PowerPoint Deck */}
        <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-4 card-hover">
          <div className="text-2xl">📽️</div>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">PowerPoint Deck</div>
            <div className="text-[15px] text-[var(--text-muted)]">12-slide presentation with exec summary, per-module metrics, roadmap, and next steps</div>
          </div>
          <button onClick={async () => {
            setGenerating(true);
            try {
              const resp = await api.apiFetch(`/api/export/pptx/${model}`);
              if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `AI_Transformation_Deck.pptx`; a.click(); URL.revokeObjectURL(url); showToast("📽️ PowerPoint downloaded"); }
              else showToast("Couldn't generate the PowerPoint — try again");
            } catch { showToast("The export service isn't responding — try again shortly"); }
            setGenerating(false);
          }} disabled={generating} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-white shrink-0 disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--amber), var(--teal))" }}>{generating ? "Generating..." : "Download .pptx"}</button>
        </div>

        {/* PDF Executive Summary */}
        <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-4 card-hover">
          <div className="text-2xl">📄</div>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">PDF Executive Summary</div>
            <div className="text-[15px] text-[var(--text-muted)]">One-page PDF with KPIs, top findings, recommendations, FTE impact, and roadmap</div>
          </div>
          <button onClick={async () => {
            setGenerating(true);
            try {
              const resp = await api.apiFetch(`/api/export/pdf/${model}`);
              if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `AI_Executive_Summary.pdf`; a.click(); URL.revokeObjectURL(url); showToast("📄 PDF downloaded"); }
              else showToast("Couldn't generate the PDF — try again");
            } catch { showToast("The export service isn't responding — try again shortly"); }
            setGenerating(false);
          }} disabled={generating} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 shrink-0 disabled:opacity-50">{generating ? "Generating..." : "Download .pdf"}</button>
        </div>
      </div>
    </Card>

    {/* Executive Summary Generator */}
    <ExecSummaryGenerator model={model} f={f} data={data} />

    {/* Help Book — consolidated guide with TOC */}
    <Card title="📖 Platform Help Book">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Complete guide to every module in the AI Transformation Platform. Click any section to expand.</div>
      <HelpBookAccordion />
    </Card>
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   EXECUTIVE SUMMARY GENERATOR
   Auto-generates a one-page exec summary pulling KPIs from all modules.
   Exportable as PDF via browser print.
   ═══════════════════════════════════════════════════════════════ */

function ExecSummaryGenerator({ model, f, data }: { model: string; f: Filters; data: ExportSummaryResponse | null }) {
  const [summary, setSummary] = useState<{
    headline: string;
    overview: string;
    findings: string[];
    recommendations: string[];
    projectedImpact: string[];
    risks: string[];
    nextSteps: string[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const bbba = data?.bbba_summary ?? { build: 0, buy: 0, total_investment: 0 };
  const reskill = data?.reskilling_summary ?? { total_investment: 0 };
  const wf = data?.headcount_waterfall ?? { net_change: 0 };
  const mgr = data?.manager_summary ?? { champions: 0 };

  const generate = async () => {
    if (!model || !data) { showToast("Load data first"); return; }
    setGenerating(true);
    try {
      // Gather data from multiple endpoints
      const [overview, priority, readiness] = await Promise.all([
        api.getOverview(model, f),
        api.getAIPriority(model, f),
        api.getReadiness(model, f),
      ]);
      const ctx = JSON.stringify({
        employees: overview.kpis,
        task_summary: priority.summary,
        readiness: { score: readiness.score, tier: readiness.tier },
        bbba: bbba, reskilling: reskill, headcount: wf, managers: mgr,
        skills_coverage: data?.skills_coverage, critical_gaps: data?.critical_gaps,
      }).slice(0, 3500);

      const raw = await callAI(
        "You are a management consultant writing an executive summary. Return ONLY valid JSON.",
        `Generate a concise executive summary for a board presentation based on this AI transformation data: ${ctx}

Return JSON: {"headline":"one-line transformation headline","overview":"2-3 sentence executive overview","findings":["top finding 1","top finding 2","top finding 3","top finding 4"],"recommendations":["key rec 1","key rec 2","key rec 3"],"projectedImpact":["impact statement 1","impact statement 2","impact statement 3"],"risks":["risk 1","risk 2"],"nextSteps":["next step 1","next step 2","next step 3"]}

Be specific with numbers from the data. Keep each item to 1-2 sentences max.`
      );

      try {
        const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        setSummary(parsed);
        setShowPreview(true);
        showToast("📊 Executive summary generated");
      } catch {
        showToast("Summary format was unexpected — try again");
      }
    } catch {
      showToast("Couldn't generate the summary — try again in a moment");
    }
    setGenerating(false);
  };

  const exportPdf = () => {
    const el = document.getElementById("exec-summary-print");
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) { showToast("Enable pop-ups to export PDF"); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>Executive Summary — AI Transformation</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #C07030; }
        h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #D4860A; margin: 20px 0 8px; border-bottom: 2px solid #E8C547; padding-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        .overview { font-size: 13px; line-height: 1.6; margin-bottom: 16px; color: #333; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
        .kpi { flex: 1; background: #f8f4ef; border-radius: 8px; padding: 12px; text-align: center; border-left: 3px solid #D4860A; }
        .kpi-val { font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; color: #C07030; }
        .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-top: 2px; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        li { font-size: 12px; line-height: 1.8; color: #333; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
        @media print { body { padding: 20px; } }
      </style></head><body>${el.innerHTML}
      <div class="footer">Generated by AI Transformation Platform · ${new Date().toLocaleDateString()}</div>
      </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 500);
  };

  return <Card title="📊 Executive Summary Generator">
    {!showPreview && <div className="text-center py-8">
      <div className="text-4xl mb-3">📊</div>
      <h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">One-Page Executive Summary</h3>
      <p className="text-[15px] text-[var(--text-secondary)] mb-5 max-w-lg mx-auto">
        AI will pull KPIs from Overview, top findings from Diagnose, recommended redesigns from Design,
        and projected impact from Simulate into a board-ready one-pager. Exportable as PDF.
      </p>
      <button onClick={generate} disabled={generating} className="px-6 py-3 rounded-2xl text-[14px] font-bold text-white transition-all hover:translate-y-[-2px] disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", boxShadow: "var(--shadow-2)" }}>
        {generating ? "Generating..." : "📊 Generate Board-Ready Summary"}
      </button>
    </div>}

    {showPreview && summary && <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={exportPdf} className="px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90">📄 Export as PDF</button>
          <button onClick={generate} disabled={generating} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">{generating ? "..." : "↻ Regenerate"}</button>
        </div>
        <button onClick={() => setShowPreview(false)} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕ Close</button>
      </div>

      {/* Preview — this div gets exported */}
      <div id="exec-summary-print" className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: "var(--warning)", marginBottom: 4 }}>{summary.headline}</h1>
        <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 12 }}>{model} · {new Date().toLocaleDateString()} · Confidential</div>

        <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 16 }}>{summary.overview}</div>

        {/* KPI strip */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {[{ label: "Employees", value: data?.total_employees || 0 },
            { label: "Skills Coverage", value: `${data?.skills_coverage || 0}%` },
            { label: "Readiness", value: `${data?.org_readiness || 0}/5` },
            { label: "Build Roles", value: bbba.build || 0 },
            { label: "Net HC Δ", value: wf.net_change || 0 },
            { label: "Investment", value: fmtNum(bbba.total_investment || 0) },
          ].map(k => <div key={k.label} className="text-center bg-[var(--surface-1)] rounded-lg p-2 border border-[var(--border)]">
            <div className="text-[15px] font-extrabold text-[var(--accent-primary)]" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>{String(k.value)}</div>
            <div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div>
          </div>)}
        </div>

        {/* Sections */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--accent-primary)", borderBottom: "2px solid var(--warning)", paddingBottom: 4, marginBottom: 8 }}>Key Findings</h2>
            <ul className="space-y-1 list-disc pl-4">{summary.findings.map((f, i) => <li key={i} className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{f}</li>)}</ul>
          </div>
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--accent-primary)", borderBottom: "2px solid var(--warning)", paddingBottom: 4, marginBottom: 8 }}>Recommendations</h2>
            <ul className="space-y-1 list-disc pl-4">{summary.recommendations.map((r, i) => <li key={i} className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{r}</li>)}</ul>
          </div>
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--accent-primary)", borderBottom: "2px solid var(--warning)", paddingBottom: 4, marginBottom: 8 }}>Projected Impact</h2>
            <ul className="space-y-1 list-disc pl-4">{summary.projectedImpact.map((p, i) => <li key={i} className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{p}</li>)}</ul>
          </div>
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--accent-primary)", borderBottom: "2px solid var(--warning)", paddingBottom: 4, marginBottom: 8 }}>Risks & Next Steps</h2>
            <ul className="space-y-1 list-disc pl-4">
              {summary.risks.map((r, i) => <li key={i} className="text-[15px] text-[var(--risk)] leading-relaxed">⚠ {r}</li>)}
              {summary.nextSteps.map((n, i) => <li key={i} className="text-[15px] text-[var(--success)] leading-relaxed">→ {n}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>}
  </Card>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 4: WORK DESIGN LAB (with persistent state + job tracker)
   This is the most complex module — it needs to persist state
   across page switches and track job completion.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Task Dictionary — pre-built task portfolios by role × industry ─── */
