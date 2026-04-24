"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useActiveSandbox } from "@/hooks/useActiveSandbox";
import { RoleNode } from "@/components/org-design-studio/RoleNode";
import { tokens } from "@/components/org-design-studio/design-tokens";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";

type StructuralState = "current" | "future" | "diff";
type ReportingDepth = "n1" | "n2" | "n3" | "n4";

const DEPTH_LABELS: Record<ReportingDepth, string> = { n1: "N\u22121", n2: "N\u22122", n3: "N\u22123", n4: "N\u22124" };

/* ── SVG Bezier Connector ── */
function BezierConnector({ x1, y1, x2, y2, status }: {
  x1: number; y1: number; x2: number; y2: number;
  status?: "new" | "moved" | "eliminated" | null;
}) {
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  const color = status === "new" ? "#FF8A3D" : status === "moved" ? "#5B8DEF" : status === "eliminated" ? "#FF5A5F" : "#3A4054";
  const dashed = !!status;
  return <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? "6 4" : undefined} opacity={dashed ? 0.6 : 0.25} />;
}

/* ── Keyboard shortcut help ── */
function ShortcutHelp({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const shortcuts = [
    { key: "+/\u2212", desc: "Zoom in/out" },
    { key: "0", desc: "Fit to screen" },
    { key: "F", desc: "Toggle fullscreen" },
    { key: "\u2190\u2191\u2192\u2193", desc: "Pan" },
    { key: "Esc", desc: "Close" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 30,
      background: "#1D2130", border: "0.5px solid #2A2F3E", borderRadius: 10,
      padding: "12px 16px", minWidth: 180,
    }}>
      <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7180", marginBottom: 8 }}>
        Keyboard Shortcuts
      </div>
      {shortcuts.map(s => (
        <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "3px 0" }}>
          <span style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: "#E8EAED" }}>{s.key}</span>
          <span style={{ fontSize: 11, color: "#9BA1B0" }}>{s.desc}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Focused View ── */
export default function FocusedViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const model = searchParams.get("model") || "";
  const initialState = (searchParams.get("state") as StructuralState) || "future";
  const initialLevel = (searchParams.get("level") as ReportingDepth) || "n1";
  const initialZoom = parseFloat(searchParams.get("zoom") || "1");
  const initialScenario = searchParams.get("scenario") || "baseline";

  const { profile } = useActiveSandbox(model);

  const [structState, setStructState] = useState<StructuralState>(initialState);
  const [depth, setDepth] = useState<ReportingDepth>(initialLevel);
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const urlUpdateTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced URL state persistence
  const updateURL = useCallback(() => {
    if (urlUpdateTimer.current) clearTimeout(urlUpdateTimer.current);
    urlUpdateTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (model) params.set("model", model);
      params.set("state", structState);
      params.set("level", depth);
      params.set("zoom", zoom.toFixed(1));
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 200);
  }, [model, structState, depth, zoom]);

  useEffect(() => { updateURL(); }, [structState, depth, zoom, updateURL]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "+": case "=": setZoom(z => Math.min(4, z + 0.2)); break;
        case "-": case "_": setZoom(z => Math.max(0.25, z - 0.2)); break;
        case "0": setZoom(1); setPan({ x: 0, y: 0 }); break;
        case "f": case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
          break;
        case "Escape": window.close(); break;
        case "ArrowLeft": setPan(p => ({ ...p, x: p.x + 50 })); break;
        case "ArrowRight": setPan(p => ({ ...p, x: p.x - 50 })); break;
        case "ArrowUp": setPan(p => ({ ...p, y: p.y + 50 })); break;
        case "ArrowDown": setPan(p => ({ ...p, y: p.y - 50 })); break;
        case "?": setShowHelp(h => !h); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.25, Math.min(4, z + delta)));
  }, []);

  // Pan via drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  // No profile fallback
  if (!model || !profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0B0D12", color: "#E8EAED", fontFamily: tokens.font.body }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: tokens.font.display, fontSize: 24, fontWeight: 300, marginBottom: 8 }}>No sandbox active</div>
          <p style={{ fontSize: 13, color: "#6B7180" }}>Add <code style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>?model=tutorial_mid_technology</code> to the URL.</p>
        </div>
      </div>
    );
  }

  const orgState = structState === "current" ? profile.current : profile.future;
  const showN2 = depth !== "n1";
  const nodeWidth = 160;
  const gapX = 20;
  const gapY = 100;
  const n1Count = orgState.n1.length;
  const totalWidth = Math.max(n1Count * (nodeWidth + gapX) - gapX, 240);
  const n1Y = 140;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0B0D12", overflow: "hidden", fontFamily: tokens.font.body }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Slim breadcrumb bar */}
      <div style={{
        height: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", borderBottom: "0.5px solid #1D2130", background: "#0B0D12", zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => window.close()} style={{ background: "none", border: "none", color: "#6B7180", cursor: "pointer", fontSize: 14 }}>&larr;</button>
          <span style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7180" }}>
            Org Design Studio / Focused View
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* State toggle */}
          <div style={{ display: "flex", background: "#151821", borderRadius: 6, padding: 2 }}>
            {(["current", "future", "diff"] as StructuralState[]).map(s => (
              <button key={s} onClick={() => setStructState(s)} style={{
                padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: tokens.font.body,
                background: structState === s ? (s === "current" ? "#E8EAED" : s === "future" ? "#5B8DEF" : "#FF8A3D") : "transparent",
                color: structState === s ? "#0B0D12" : "#6B7180",
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Depth pills */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["n1", "n2", "n3", "n4"] as ReportingDepth[]).map(d => (
              <button key={d} onClick={() => setDepth(d)} style={{
                padding: "4px 8px", borderRadius: 4, border: "0.5px solid #2A2F3E",
                fontSize: 10, fontFamily: tokens.font.mono, fontWeight: 600, cursor: "pointer",
                background: depth === d ? "#E8EAED" : "transparent",
                color: depth === d ? "#0B0D12" : "#6B7180",
              }}>
                {DEPTH_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.2))} style={{ width: 24, height: 24, borderRadius: 4, border: "0.5px solid #2A2F3E", background: "transparent", color: "#9BA1B0", cursor: "pointer", fontSize: 14 }}>&minus;</button>
            <span style={{ fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 600, color: "#6B7180", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} style={{ width: 24, height: 24, borderRadius: 4, border: "0.5px solid #2A2F3E", background: "transparent", color: "#9BA1B0", cursor: "pointer", fontSize: 14 }}>+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ width: 24, height: 24, borderRadius: 4, border: "0.5px solid #2A2F3E", background: "transparent", color: "#9BA1B0", cursor: "pointer", fontSize: 11 }} title="Fit to screen">&#8644;</button>
          </div>
        </div>
      </div>

      {/* Chart canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{ flex: 1, overflow: "hidden", cursor: isDragging ? "grabbing" : "grab", position: "relative" }}
      >
        {/* Dot grid */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top center",
          willChange: "transform",
          padding: "40px 40px 80px",
          minWidth: totalWidth + 80,
          position: "relative",
        }}>
          {/* SVG connectors */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            viewBox={`0 0 ${totalWidth + 80} ${n1Y + 200}`} preserveAspectRatio="none">
            {orgState.n1.map((role, i) => {
              const rootX = (totalWidth + 80) / 2;
              const x2 = 40 + i * (nodeWidth + gapX) + nodeWidth / 2;
              return <BezierConnector key={role.title} x1={rootX} y1={80} x2={x2} y2={n1Y} status={role.status || null} />;
            })}
          </svg>

          {/* Root node */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: gapY - 20 }}>
            <RoleNode title={orgState.rootTitle} sub={orgState.rootSub} fn="exec" variant="root"
              metrics={[{ label: "N\u22121", value: String(orgState.n1.length) }]} />
          </div>

          {/* N-1 nodes */}
          <div style={{ display: "flex", justifyContent: "center", gap: gapX, flexWrap: "nowrap" }}>
            {orgState.n1.map(role => (
              <div key={role.title} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <RoleNode
                  title={role.title} sub={role.sub} fn={role.fn} om={role.om}
                  variant={role.status === "new" ? "new" : role.status === "moved" ? "moved" : role.status === "eliminated" ? "eliminated" : "default"}
                  warn={role.warn}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom-left sandbox indicator */}
      <div style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 20,
        padding: "5px 12px", borderRadius: 8, background: "#151821", border: "0.5px solid #2A2F3E",
      }}>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 10, letterSpacing: "0.08em", color: "#6B7180" }}>
          {profile.company} &middot; {profile.industry} &middot; {profile.headcount.toLocaleString()}
        </span>
      </div>

      {/* Bottom-right help toggle */}
      <button onClick={() => setShowHelp(h => !h)} style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 20,
        width: 28, height: 28, borderRadius: 6, border: "0.5px solid #2A2F3E",
        background: showHelp ? "#1D2130" : "transparent", color: "#6B7180",
        cursor: "pointer", fontSize: 13, fontWeight: 600,
      }}>
        ?
      </button>
      <ShortcutHelp visible={showHelp} />
    </div>
  );
}
