"use client";
import React, { useState, useMemo } from "react";

export interface LayerData {
  layer: string;
  current: number;
  future: number;
}

const defaultData: LayerData[] = [
  { layer: "E5", current: 275, future: 210 },
  { layer: "E4", current: 327, future: 280 },
  { layer: "E3", current: 822, future: 740 },
  { layer: "E2", current: 763, future: 700 },
  { layer: "E1", current: 1128, future: 1050 },
  { layer: "M6", current: 1137, future: 1100 },
  { layer: "M5", current: 1175, future: 1250 },
  { layer: "M4", current: 1255, future: 1400 },
  { layer: "M3", current: 984, future: 1100 },
  { layer: "M2", current: 134, future: 300 },
  { layer: "M1", current: 0, future: 50 },
];

/* ── Phase 3 chart‐container + axis/grid standards ── */
const CHART_CONTAINER: React.CSSProperties = {
  background: "#FFFFFF",
  border: "0.5px solid rgba(28,43,58,0.15)",
  borderRadius: 8,
  padding: 20,
};

const TITLE: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#161822" };
const SUBTITLE: React.CSSProperties = { fontSize: 11, fontWeight: 400, color: "rgba(28,43,58,0.65)" };

const GRAY_BAR = "rgba(28,43,58,0.25)";
const BLUE_BAR = "#f4a83a";
const DELTA_POS = "#16A34A";
const DELTA_NEG = "#DC2626";

function ChangedLayerRow({
  d,
  maxValue,
  mode,
  totalCur,
  totalFut,
}: {
  d: LayerData;
  maxValue: number;
  mode: "headcount" | "percent";
  totalCur: number;
  totalFut: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const curVal = mode === "headcount" ? d.current : totalCur > 0 ? (d.current / totalCur) * 100 : 0;
  const futVal = mode === "headcount" ? d.future : totalFut > 0 ? (d.future / totalFut) * 100 : 0;
  const scaleMax = mode === "headcount"
    ? maxValue
    : Math.max(totalCur > 0 ? (maxValue / totalCur) * 100 : 0, totalFut > 0 ? (maxValue / totalFut) * 100 : 0, 0.1);

  const delta = mode === "headcount" ? d.future - d.current : futVal - curVal;
  const deltaColor = delta > 0 ? DELTA_POS : delta < 0 ? DELTA_NEG : "rgba(28,43,58,0.65)";
  const showTooltip = hovered || focused;

  const barMaxW = 320;
  const curBarW = scaleMax > 0 ? (curVal / scaleMax) * barMaxW : 0;
  const futBarW = scaleMax > 0 ? (futVal / scaleMax) * barMaxW : 0;

  const curLabel = mode === "headcount" ? d.current.toLocaleString() : `${curVal.toFixed(1)}%`;
  const futLabel = mode === "headcount" ? d.future.toLocaleString() : `${futVal.toFixed(1)}%`;
  const deltaLabel = mode === "headcount"
    ? `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`
    : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp`;

  /* ── Tooltip ── */
  const tooltip = showTooltip ? (
    <div style={{
      position: "absolute", top: "100%", left: 60, zIndex: 20,
      background: "#FFFFFF", border: "0.5px solid rgba(28,43,58,0.2)", borderRadius: 6,
      padding: 10, fontSize: 11, color: "#161822", lineHeight: 1.8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)", whiteSpace: "nowrap", pointerEvents: "none",
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{d.layer}</div>
      <div>Current: {d.current.toLocaleString()}</div>
      <div>Proposed: {d.future.toLocaleString()}</div>
      <div style={{ color: deltaColor, fontWeight: 500 }}>Delta: {deltaLabel}</div>
    </div>
  ) : null;

  return (
    <div
      role="row"
      aria-label={`Layer ${d.layer}: current ${d.current}, proposed ${d.future}, delta ${deltaLabel}`}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 60px",
        alignItems: "center",
        gap: 12,
        padding: "6px 0",
        borderBottom: "0.5px dashed rgba(28,43,58,0.08)",
        position: "relative",
        background: hovered || focused ? "rgba(247,245,240,0.5)" : "transparent",
        borderRadius: 4,
        transition: "background 0.15s ease",
        outline: focused ? "2px solid #f4a83a" : "none",
        outlineOffset: 1,
      }}
    >
      {/* Layer badge */}
      <div style={{ fontSize: 12, fontWeight: 500, color: "#161822", textAlign: "right" }}>{d.layer}</div>

      {/* Side-by-side bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Current (gray) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
          <div style={{
            height: 12, borderRadius: 3, width: Math.max(curBarW, 2),
            background: GRAY_BAR, transition: "width 0.5s ease",
          }} />
          <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(28,43,58,0.55)" }}>{curLabel}</span>
        </div>
        {/* Proposed (blue) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
          <div style={{
            height: 12, borderRadius: 3, width: Math.max(futBarW, 2),
            background: BLUE_BAR, transition: "width 0.5s ease",
          }} />
          <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(28,43,58,0.55)" }}>{futLabel}</span>
        </div>
      </div>

      {/* Delta */}
      <div style={{ fontSize: 12, fontWeight: 500, color: deltaColor, textAlign: "right" }}>{deltaLabel}</div>

      {tooltip}
    </div>
  );
}

export default function LayerDistributionChart({ data }: { data?: LayerData[] }) {
  const rows = data ?? defaultData;
  const [mode, setMode] = useState<"headcount" | "percent">("headcount");
  const [showUnchanged, setShowUnchanged] = useState(false);

  const changedLayers = useMemo(() => rows.filter((d) => d.current !== d.future), [rows]);
  const unchangedLayers = useMemo(() => rows.filter((d) => d.current === d.future), [rows]);

  const maxValue = useMemo(
    () => Math.max(...rows.map((d) => d.current), ...rows.map((d) => d.future), 1),
    [rows]
  );
  const totalCur = useMemo(() => rows.reduce((s, d) => s + d.current, 0), [rows]);
  const totalFut = useMemo(() => rows.reduce((s, d) => s + d.future, 0), [rows]);

  const totalDelta = totalFut - totalCur;
  const totalDeltaPct = totalCur > 0 ? ((totalFut - totalCur) / totalCur) * 100 : 0;

  // All-zero / no-change empty state
  if (changedLayers.length === 0) {
    return (
      <div style={CHART_CONTAINER}>
        <div style={TITLE}>Layer Distribution</div>
        <div style={{ ...SUBTITLE, marginTop: 4, marginBottom: 16 }}>Current vs. Proposed</div>
        <div style={{
          padding: "32px 24px", textAlign: "center",
          background: "rgba(247,245,240,0.5)", borderRadius: 8,
          border: "0.5px dashed rgba(28,43,58,0.15)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#161822", marginBottom: 4 }}>
            This scenario preserves the existing layer distribution.
          </div>
          <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>
            {rows.length} layers unchanged across {totalCur.toLocaleString()} headcount.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="img" aria-label="Layer distribution chart comparing current and proposed headcount across organizational layers">
      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {(["headcount", "percent"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-label={m === "headcount" ? "Show headcount view" : "Show percentage of org view"}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "0.5px solid rgba(28,43,58,0.15)",
              background: mode === m ? "#161822" : "transparent",
              color: mode === m ? "#fff" : "rgba(28,43,58,0.55)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {m === "headcount" ? "Headcount" : "% of Org"}
          </button>
        ))}
      </div>

      {/* Changed layers section */}
      <div role="table" aria-label="Changed layers comparison" style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
          color: "rgba(28,43,58,0.55)", marginBottom: 8, paddingLeft: 2,
        }}>
          Changed Layers ({changedLayers.length})
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "36px 1fr 60px",
          gap: 12, padding: "0 0 4px", marginBottom: 4,
          borderBottom: "0.5px solid rgba(28,43,58,0.15)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(28,43,58,0.65)", textAlign: "right" }}>Layer</div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(28,43,58,0.65)" }}>Distribution</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(28,43,58,0.65)", textAlign: "right" }}>Delta</div>
        </div>

        {changedLayers.map((d) => (
          <ChangedLayerRow
            key={d.layer}
            d={d}
            maxValue={maxValue}
            totalCur={totalCur}
            totalFut={totalFut}
            mode={mode}
          />
        ))}
      </div>

      {/* Unchanged layers section — collapsed by default */}
      {unchangedLayers.length > 0 && (
        <div>
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            aria-label={showUnchanged ? "Collapse unchanged layers" : "Expand unchanged layers"}
            aria-expanded={showUnchanged}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 0", background: "none", border: "none", cursor: "pointer",
              borderTop: "0.5px solid rgba(28,43,58,0.08)",
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "rgba(28,43,58,0.65)",
            }}>
              Unchanged Layers ({unchangedLayers.length})
            </span>
            <span style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>
              {showUnchanged ? "\u25B2" : "\u25BC"}
            </span>
            {!showUnchanged && (
              <span style={{ fontSize: 11, color: "rgba(28,43,58,0.65)", marginLeft: 4 }}>
                {unchangedLayers.reduce((s, d) => s + d.current, 0).toLocaleString()} HC across {unchangedLayers.length} layers
              </span>
            )}
          </button>
          {showUnchanged && (
            <div style={{ paddingLeft: 2 }}>
              {unchangedLayers.map((d) => (
                <div key={d.layer} style={{
                  display: "grid", gridTemplateColumns: "36px 1fr",
                  gap: 12, padding: "4px 0",
                  borderBottom: "0.5px dashed rgba(28,43,58,0.06)",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(28,43,58,0.55)", textAlign: "right" }}>{d.layer}</div>
                  <div style={{ fontSize: 11, color: "rgba(28,43,58,0.65)" }}>
                    {d.current.toLocaleString()} HC — no change
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, marginTop: 16,
      }}>
        <div style={{
          background: "rgba(247,245,240,0.5)", borderRadius: 8,
          padding: "12px 16px", border: "0.5px solid rgba(28,43,58,0.08)",
        }}>
          <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
            Total Org
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#161822" }}>
            {totalCur.toLocaleString()} {"\u2192"} {totalFut.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: "rgba(247,245,240,0.5)", borderRadius: 8,
          padding: "12px 16px", border: "0.5px solid rgba(28,43,58,0.08)",
        }}>
          <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
            Net Change
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: totalDelta < 0 ? DELTA_NEG : totalDelta > 0 ? DELTA_POS : "#161822" }}>
            {totalDelta >= 0 ? "+" : ""}{totalDelta.toLocaleString()} ({totalDeltaPct >= 0 ? "+" : ""}{totalDeltaPct.toFixed(1)}%)
          </div>
        </div>
        <div style={{
          background: "rgba(247,245,240,0.5)", borderRadius: 8,
          padding: "12px 16px", border: "0.5px solid rgba(28,43,58,0.08)",
        }}>
          <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
            Layers Impacted
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#161822" }}>
            {changedLayers.length} of {rows.length}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, marginTop: 12, paddingTop: 8,
        borderTop: "0.5px solid rgba(28,43,58,0.08)", fontSize: 11, color: "rgba(28,43,58,0.55)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: GRAY_BAR }} />Current
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: BLUE_BAR }} />Proposed
        </span>
      </div>
    </div>
  );
}
