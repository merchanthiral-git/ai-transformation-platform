"use client";
import React from "react";
import { ChevronRight } from "@/lib/icons";
import type { DesignPath } from "../../lib/designpaths/types";
import { computeConsensus } from "../../lib/designpaths/consensus";
import { PathSummaryCard } from "./PathSummaryCard";

const PURPLE = "#534AB7";

interface DiagnosticModule {
  id: string;
  title: string;
  description: string;
  hasRun: boolean;
}

interface Props {
  allPaths: DesignPath[];
  moduleStatus: Record<string, string>;
  diagnosticModules: DiagnosticModule[];
  onOpenPath: (sourceModuleId: string) => void;
  onRunDiagnostic: (moduleId: string) => void;
}

export function DesignPathsOverview({ allPaths, moduleStatus, diagnosticModules, onOpenPath, onRunDiagnostic }: Props) {
  const consensus = computeConsensus(allPaths);
  const notRun = diagnosticModules.filter(d => !d.hasRun);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0", fontFamily: "'Inter Tight', sans-serif" }}>Your design paths</h2>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Each diagnostic produced its own path. They{"'"}re independent — pick where to focus, or work them in parallel.
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, textAlign: "right" }}>
          <div>{allPaths.length} path{allPaths.length !== 1 ? "s" : ""} active</div>
          {notRun.length > 0 && <div>{notRun.length} diagnostic{notRun.length !== 1 ? "s" : ""} not yet run</div>}
        </div>
      </div>

      {/* Consensus panel */}
      {consensus.length > 0 && (
        <div style={{ background: "rgba(83,74,183,0.03)", border: "1px solid rgba(83,74,183,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 10 }}>
            MODULES RECOMMENDED BY MULTIPLE PATHS · HIGHEST CONFIDENCE TO ACT ON
          </div>
          {consensus.map(item => (
            <div key={item.moduleId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(83,74,183,0.06)" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{item.moduleTitle}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {item.sourceModuleTitles.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "rgba(83,74,183,0.06)", color: PURPLE, fontWeight: 500 }}>{t}</span>
                ))}
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>{item.sourceModuleIds.length} of {allPaths.length} paths</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active paths */}
      {allPaths.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>ACTIVE PATHS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allPaths.map(p => (
              <PathSummaryCard
                key={p.sourceModuleId}
                path={p}
                moduleStatus={moduleStatus}
                onOpen={() => onOpenPath(p.sourceModuleId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Diagnostics not yet run */}
      {notRun.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>DIAGNOSTICS NOT YET RUN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notRun.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{d.description}</div>
                </div>
                <button onClick={() => onRunDiagnostic(d.id)} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer", flexShrink: 0 }}>
                  Run diagnostic <ChevronRight size={10} style={{ marginLeft: 2 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
