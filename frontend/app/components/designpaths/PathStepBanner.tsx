"use client";
import React from "react";
import { Compass, Check } from "@/lib/icons";

const PURPLE = "#534AB7";

interface BannerPath {
  pathId: string;
  sourceModuleId: string;
  sourceModuleTitle: string;
  stepIdx: number;
  stepTitle: string;
  criterion: string;
  howToInModule?: string[];
  stepCount: number;
  hasSubSteps?: boolean;
  stepComplete?: boolean;
}

interface Props {
  paths: BannerPath[];
  onMarkComplete: (sourceModuleId: string, stepIdx: number) => void;
  onPause: (sourceModuleId: string) => void;
  onOpenPathDrawer: (sourceModuleId: string) => void;
}

export function PathStepBanner({ paths, onMarkComplete, onPause, onOpenPathDrawer }: Props) {
  if (paths.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      {paths.map((p, i) => (
        <div key={p.pathId} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
          background: "rgba(83,74,183,0.04)", border: "1px solid rgba(83,74,183,0.12)",
          borderRadius: i === 0 && i === paths.length - 1 ? 10 : i === 0 ? "10px 10px 0 0" : i === paths.length - 1 ? "0 0 10px 10px" : 0,
          borderTop: i > 0 ? "none" : undefined,
        }}>
          <Compass size={16} style={{ color: PURPLE, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: PURPLE }}>{p.sourceModuleTitle}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Step {p.stepIdx + 1} of {p.stepCount} · {p.stepTitle}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              To complete: {p.criterion}
            </div>
            {p.howToInModule && p.howToInModule.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: PURPLE, marginBottom: 3 }}>HOW TO DO THIS</div>
                <ol style={{ margin: 0, paddingLeft: 16, listStyleType: "decimal" }}>
                  {p.howToInModule.map((line, li) => (
                    <li key={li} style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 2 }}>{line}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {p.stepComplete ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#10B981" }}>
                <Check size={14} /> Step complete
              </span>
            ) : !p.hasSubSteps && (
              <button onClick={() => onMarkComplete(p.sourceModuleId, p.stepIdx)} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "5px 12px", fontSize: 12, fontWeight: 600,
                background: PURPLE, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
              }}>
                <Check size={12} /> Mark complete
              </button>
            )}
            <button onClick={() => onPause(p.sourceModuleId)} style={{
              fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer",
            }}>pause</button>
            <button onClick={() => onOpenPathDrawer(p.sourceModuleId)} style={{
              fontSize: 11, color: PURPLE, background: "none", border: "none", cursor: "pointer",
            }}>view path</button>
          </div>
        </div>
      ))}
    </div>
  );
}
