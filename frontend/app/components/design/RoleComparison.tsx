"use client";
import React, { useState, useEffect } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  Card, Badge, PageHeader,
  useApiData, JobDesignState,
} from "../shared";
import { Layers3, X } from "@/lib/icons";
import { EmptyState, FlowNav } from "@/app/ui";

export function RoleComparison({ model, f, onBack, jobs, jobStates }: { model: string; f: Filters; onBack: () => void; jobs?: string[]; jobStates?: Record<string, JobDesignState> }) {
  const [data] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [deconData, setDeconData] = useState<Record<string, Record<string, unknown> | null>>({});

  const availableJobs = jobs || [];
  const toggleJob = (j: string) => {
    setSelectedJobs(prev => prev.includes(j) ? prev.filter(x => x !== j) : prev.length < 4 ? [...prev, j] : prev);
  };

  // Fetch deconstruction data for selected jobs
  useEffect(() => {
    selectedJobs.forEach(j => {
      if (!deconData[j]) {
        api.getDeconstruction(model, j, f).then(d => setDeconData(prev => ({ ...prev, [j]: d }))).catch(() => setDeconData(prev => ({ ...prev, [j]: null })));
      }
    });
  }, [selectedJobs, model]);

  const getJobState = (j: string) => jobStates?.[j] || null;

  return <div>
    <PageHeader icon={<Layers3 />} title="Role Comparison" subtitle="Compare current vs. redesigned roles side-by-side" onBack={onBack} moduleId="rolecompare" />

    {/* Job selector */}
    <Card title="Select Roles to Compare (max 4)">
      <div className="flex gap-2 flex-wrap mb-3">
        {selectedJobs.map(j => <button key={j} onClick={() => toggleJob(j)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer flex items-center gap-1">{j} <span className="opacity-50"><X size={12} /></span></button>)}
        {selectedJobs.length === 0 && <span className="text-[15px] text-[var(--text-muted)]">Select up to 4 jobs below</span>}
      </div>
      <div className="flex gap-1.5 flex-wrap">{availableJobs.slice(0, 30).map(j => <button key={j} onClick={() => toggleJob(j)} className="px-2 py-1 rounded text-[14px] font-semibold transition-all cursor-pointer" style={{ background: selectedJobs.includes(j) ? "rgba(244,168,58,0.15)" : "var(--surface-2)", color: selectedJobs.includes(j) ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${selectedJobs.includes(j) ? "rgba(244,168,58,0.3)" : "var(--border)"}` }}>{j}</button>)}</div>
    </Card>

    {/* Comparison grid */}
    {selectedJobs.length > 0 && <div className={`grid gap-4 ${selectedJobs.length === 1 ? "grid-cols-1" : selectedJobs.length === 2 ? "grid-cols-2" : selectedJobs.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {selectedJobs.map(j => {
        const decon = deconData[j] as Record<string, unknown> | null;
        const js = getJobState(j);
        const tasks = ((decon as Record<string, unknown>)?.tasks || []) as Record<string, unknown>[];
        const highAi = tasks.filter(t => String(t["AI Impact"] || "").toLowerCase() === "high").length;
        const totalTime = tasks.reduce((s, t) => s + Number(t["Current Time Spent %"] || 0), 0);
        const aiTime = tasks.filter(t => String(t["AI Impact"] || "").toLowerCase() !== "low").reduce((s, t) => s + Number(t["Time Saved %"] || t["Current Time Spent %"] || 0) * 0.3, 0);
        const hasRedesign = js && js.recon;

        return <div key={j} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent">
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate">{j}</div>
            <div className="flex gap-2">
              <Badge color="indigo">{tasks.length} tasks</Badge>
              {hasRedesign && <Badge color="green">Redesigned</Badge>}
              {!hasRedesign && <Badge color="gray">Current</Badge>}
            </div>
          </div>

          {/* Current state metrics */}
          <div className="p-4">
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Current State</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--accent-primary)]">{tasks.length}</div><div className="text-[15px] text-[var(--text-muted)]">Tasks</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--warning)]">{highAi}</div><div className="text-[15px] text-[var(--text-muted)]">High AI</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--success)]">{Math.round(aiTime)}%</div><div className="text-[15px] text-[var(--text-muted)]">AI Saveable</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--text-primary)]">{totalTime}%</div><div className="text-[15px] text-[var(--text-muted)]">Utilized</div></div>
            </div>

            {/* Task breakdown */}
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Top Tasks</div>
            <div className="space-y-1">
              {tasks.slice(0, 5).map((t, i) => <div key={i} className="flex items-center gap-2 text-[15px]">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: String(t["AI Impact"]).toLowerCase() === "high" ? "var(--risk)" : String(t["AI Impact"]).toLowerCase() === "moderate" ? "var(--warning)" : "var(--success)" }} />
                <span className="text-[var(--text-secondary)] truncate flex-1">{String(t["Task Name"] || "—")}</span>
                <span className="text-[var(--text-muted)] shrink-0">{String(t["Current Time Spent %"] ?? "—")}%</span>
              </div>)}
            </div>

            {/* Redesigned state if available */}
            {hasRedesign && js.recon && <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-[14px] font-bold text-[var(--success)] uppercase tracking-wider mb-1">↓ After Redesign ({js.scenario})</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2 bg-[rgba(139,168,122,0.06)] text-center"><div className="text-[15px] font-extrabold text-[var(--success)]">{String((js.recon as Record<string, unknown>).human_pct || "—")}%</div><div className="text-[15px] text-[var(--text-muted)]">Human</div></div>
                <div className="rounded-lg p-2 bg-[rgba(167,139,184,0.06)] text-center"><div className="text-[15px] font-extrabold text-[var(--purple)]">{String((js.recon as Record<string, unknown>).ai_pct || "—")}%</div><div className="text-[15px] text-[var(--text-muted)]">AI</div></div>
              </div>
            </div>}
          </div>
        </div>;
      })}
    </div>}

    {selectedJobs.length === 0 && <EmptyState icon={<Layers3 />} headline="Select roles to compare" explanation="Choose 2-4 roles from the Job Architecture to see a side-by-side comparison of levels, skills, and AI impact." primaryAction={{ label: "Select roles above", onClick: () => {} }} />}

    <FlowNav previous={{ id: "opmodel", label: "Operating Model Lab" }} next={{ id: "bbba", label: "Talent Strategy" }} onNavigate={onBack} />
  </div>;
}
