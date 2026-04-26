"use client";
import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import {
  ViewContext,
  KpiCard, Card, Empty, TabBar, PageHeader, LoadingBar,
  useApiData, showToast,
} from "./shared";
import { Layers3 } from "@/lib/icons";
import { FlowNav } from "@/app/ui";
import RoleDetailDrawer from "./ja/RoleDetailDrawer";

const ArchitectureMapTab = lazy(() => import("./ArchitectureMapTab").then(m => ({ default: m.ArchitectureMapTab })));
const JobContentAuthoring = lazy(() => import("./design/JobContentAuthoring").then(m => ({ default: m.JobContentAuthoring })));
const FrameworkBuilder = lazy(() => import("./ja/FrameworkBuilder"));
const BulkImport = lazy(() => import("./ja/BulkImport"));
const MappingGrid = lazy(() => import("./ja/MappingGrid"));
const OrgChartRedesign = lazy(() => import("./ja/OrgChart"));

/* ═══ TYPES ═══ */
type TreeNode = { id: string; label: string; type: string; children?: TreeNode[]; headcount: number; [k: string]: unknown };
type Job = { id: string; title: string; level: string; track: string; function: string; family: string; sub_family: string; headcount: number; ai_score: number; ai_impact: string; tasks_mapped: number; [k: string]: unknown };
type Employee = { id: string; name: string; title: string; level: string; [k: string]: unknown };

/* ═══ JOB ARCHITECTURE DESIGN TOOL ═══ */
export function JADesignToolModule({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [tab, setTab] = useState("map");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const projectId = model || "Demo_Model";

  /* JA Mapping module state */
  const [jaScenarioId, setJaScenarioId] = useState("");
  const [jaDrawerRow, setJaDrawerRow] = useState<any>(null);
  const [jaDrawerOpen, setJaDrawerOpen] = useState(false);

  /* Load default scenario on mount */
  useEffect(() => {
    if (!projectId) return;
    api.apiFetch(`/api/ja/scenarios?project_id=${projectId}`)
      .then(r => r.json())
      .then((scs: any[]) => {
        if (Array.isArray(scs)) {
          const primary = scs.find((s: any) => s.is_primary) || scs[0];
          if (primary) setJaScenarioId(primary.id);
        }
      }).catch(() => {});
  }, [projectId]);

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
  const employees = (data?.employees || []) as Employee[];

  if (!model) return <Empty text="Select a project to begin designing your Job Architecture." />;
  if (loading && showLoader) return <LoadingBar />;

  const DESIGN_TABS = [
    { id: "map", label: "Architecture Map" },
    { id: "orgchart", label: "Org Chart" },
    { id: "ja-framework", label: "Framework Builder" },
    { id: "ja-mapping", label: "Mapping Grid" },
    { id: "ja-import", label: "Import" },
    { id: "content", label: "Role Templates" },
  ];

  return <div>
    <PageHeader icon={<Layers3 />} title="Job Architecture Design Tool" moduleId="ja-design" />
    {showLoader && <LoadingBar />}

    {/* Import from Audit callout */}
    <div style={{ marginBottom: 12, padding: "10px 16px", background: "var(--sem-info-bg)", border: "1px solid var(--sem-info-border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Start from your audit findings for a data-driven redesign.
      </span>
      <button onClick={() => onNavigate?.("ja-audit")} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}>
        &larr; View Audit findings
      </button>
    </div>

    <TabBar tabs={DESIGN_TABS} active={tab} onChange={setTab} />

    {/* Architecture Map — strategic future-state mapping */}
    {tab === "map" && <Suspense fallback={<LoadingBar />}><ArchitectureMapTab tree={tree} jobs={jobs} employees={employees} model={model} /></Suspense>}

    {/* Org Chart Builder */}
    {tab === "orgchart" && <Suspense fallback={<LoadingBar />}><OrgChartRedesign model={model} onRoleClick={(title) => { setSelectedJob(jobs.find(j => j.title === title) || null); }} /></Suspense>}

    {/* Framework Builder */}
    {tab === "ja-framework" && (<Suspense fallback={<LoadingBar />}>
      <FrameworkBuilder model={model} projectId={projectId} onFrameworkReady={() => {
        fetch(`/api/ja/scenarios?project_id=${projectId}`, { headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` } })
          .then(r => r.json()).then((scs: any[]) => {
            const primary = scs.find((s: any) => s.is_primary) || scs[0];
            if (primary) setJaScenarioId(primary.id);
          }).catch(() => {});
      }} />
    </Suspense>)}

    {/* Mapping Grid */}
    {tab === "ja-mapping" && (<Suspense fallback={<LoadingBar />}>
      <>
        <MappingGrid
          model={model}
          projectId={projectId}
          scenarioId={jaScenarioId}
          onRoleClick={(row) => { setJaDrawerRow(row); setJaDrawerOpen(true); }}
        />
        <RoleDetailDrawer
          row={jaDrawerRow}
          isOpen={jaDrawerOpen}
          onClose={() => setJaDrawerOpen(false)}
          model={model}
          projectId={projectId}
          onAccept={(gid) => {
            fetch("/api/ja/mappings/bulk-action", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` },
              body: JSON.stringify({ group_ids: [gid], action: "accept" }),
            }).then(() => setJaDrawerOpen(false));
          }}
          onReject={(gid) => {
            fetch("/api/ja/mappings/bulk-action", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""}` },
              body: JSON.stringify({ group_ids: [gid], action: "reject" }),
            }).then(() => setJaDrawerOpen(false));
          }}
        />
      </>
    </Suspense>)}

    {/* Bulk Import */}
    {tab === "ja-import" && <Suspense fallback={<LoadingBar />}><BulkImport projectId={projectId} onImportComplete={() => setTab("ja-mapping")} /></Suspense>}

    {/* Job Content Authoring / Role Templates */}
    {tab === "content" && <Suspense fallback={<LoadingBar />}><JobContentAuthoring projectId={projectId} model={model} /></Suspense>}

    <FlowNav previous={{ target: { kind: "module", moduleId: "ja-audit" }, label: "JA Audit" }} next={{ target: { kind: "module", moduleId: "build" }, label: "Org Design Studio" }} />
  </div>;
}
