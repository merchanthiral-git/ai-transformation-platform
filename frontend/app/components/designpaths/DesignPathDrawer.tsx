"use client";
import React, { useEffect } from "react";
import { X } from "@/lib/icons";
import type { DesignPath, StepTiming } from "../../lib/designpaths/types";
import { DesignPathView } from "./DesignPathView";

interface Props {
  open: boolean;
  onClose: () => void;
  path: DesignPath;
  moduleStatus: Record<string, string>;
  onNavigateToModule: (id: string) => void;
  onEditTiming: (stepIdx: number, timing: Partial<StepTiming>) => void;
}

export function DesignPathDrawer({ open, onClose, path, moduleStatus, onNavigateToModule, onEditTiming }: Props) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: "min(75vw, 1100px)",
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.25s ease-out",
      }}>
        {/* Header — sticky */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          flexShrink: 0, background: "var(--surface-1)",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {path.sourceModuleTitle} · Design path
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {path.headline}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
              color: "var(--text-muted)", cursor: "pointer", flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <DesignPathView
            path={path}
            moduleStatus={moduleStatus}
            onNavigateToModule={onNavigateToModule}
            onEditTiming={onEditTiming}
          />
        </div>
      </div>
    </div>
  );
}
