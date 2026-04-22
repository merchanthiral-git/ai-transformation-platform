"use client";
import React, { useState, useMemo } from "react";

export interface LayerCostData {
  layer: string;
  currentHeadcount: number;
  futureHeadcount: number;
  avgComp: number;
  futureAvgComp?: number;
}

const defaultData: LayerCostData[] = [
  { layer: "E5", currentHeadcount: 275, futureHeadcount: 210, avgComp: 650000 },
  { layer: "E4", currentHeadcount: 327, futureHeadcount: 280, avgComp: 450000 },
  { layer: "E3", currentHeadcount: 822, futureHeadcount: 740, avgComp: 375000 },
  { layer: "E2", currentHeadcount: 763, futureHeadcount: 700, avgComp: 310000 },
  { layer: "E1", currentHeadcount: 1128, futureHeadcount: 1050, avgComp: 250000 },
  { layer: "M6", currentHeadcount: 1137, futureHeadcount: 1100, avgComp: 225000 },
  { layer: "M5", currentHeadcount: 1175, futureHeadcount: 1250, avgComp: 190000 },
  { layer: "M4", currentHeadcount: 1255, futureHeadcount: 1400, avgComp: 155000 },
  { layer: "M3", currentHeadcount: 984, futureHeadcount: 1100, avgComp: 120000 },
  { layer: "M2", currentHeadcount: 134, futureHeadcount: 300, avgComp: 95000 },
  { layer: "M1", currentHeadcount: 0, futureHeadcount: 50, avgComp: 75000 },
  { layer: "P8", currentHeadcount: 0, futureHeadcount: 0, avgComp: 340000 },
  { layer: "P7", currentHeadcount: 0, futureHeadcount: 0, avgComp: 260000 },
  { layer: "P6", currentHeadcount: 0, futureHeadcount: 0, avgComp: 218000 },
  { layer: "P5", currentHeadcount: 0, futureHeadcount: 0, avgComp: 175000 },
  { layer: "P4", currentHeadcount: 0, futureHeadcount: 0, avgComp: 142000 },
  { layer: "P3", currentHeadcount: 0, futureHeadcount: 0, avgComp: 115000 },
];

/* ── Phase 3: Track-based colors ── */
const TRACK_COLORS: Record<string, string> = {
  E: "#161822",    // Executive: navy
  M: "#f4a83a",    // Management: blue
  P: "#14B8A6",    // Professional: teal
  T: "#a78bb8",    // Technical: purple
  S: "#64748b",    // Support: gray
};

const TRACK_LABELS: Record<string, string> = {
  E: "Executive",
  M: "Management",
  P: "Professional",
  T: "Technical",
  S: "Support",
};

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}$${Math.round(abs / 1e6)}M`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface ComputedRow {
  layer: string;
  currentHeadcount: number;
  futureHeadcount: number;
  avgComp: number;
  futureAvgComp: number;
  currentCost: number;
  futureCost: number;
  deltaCost: number;
  deltaPct: number;
}

/* ── Phase 3 standards ── */
const TOOLTIP_STYLE: React.CSSProperties = {
  position: "absolute", top: "100%", left: 50, zIndex: 20,
  background: "#FFFFFF", border: "0.5px solid rgba(28,43,58,0.2)",
  borderRadius: 6, padding: 10,
  fontSize: 11, color: "#161822", lineHeight: 1.8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  whiteSpace: "nowrap", pointerEvents: "none",
};

function CostRow({
  row,
  maxCost,
}: {
  row: ComputedRow;
  maxCost: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const trackColor = TRACK_COLORS[row.layer.charAt(0)] || "#f4a83a";
  const barWidth = maxCost > 0 ? (Math.max(row.currentCost, row.futureCost) / maxCost) * 100 : 0;

  const delta = row.deltaCost;
  const deltaColor = delta < 0 ? "#16A34A" : delta > 0 ? "#DC2626" : "rgba(28,43,58,0.65)";
  const showTooltip = hovered || focused;

  const hcChanged = row.currentHeadcount !== row.futureHeadcount;

  return (
    <div
      role="row"
      aria-label={`Layer ${row.layer}: ${row.currentHeadcount} HC, current cost ${formatCurrency(row.currentCost)}, proposed cost ${formatCurrency(row.futureCost)}`}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 90px 1fr 80px 70px",
        alignItems: "center",
        gap: 10,
        padding: "8px 4px",
        borderBottom: "0.5px dashed rgba(28,43,58,0.08)",
        background: hovered || focused ? "rgba(247,245,240,0.5)" : "transparent",
        transition: "background 0.15s ease",
        position: "relative",
        minHeight: 40,
        outline: focused ? "2px solid #f4a83a" : "none",
        outlineOffset: 1,
      }}
    >
      {/* Layer badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "3px 8px", borderRadius: 6,
        background: `${trackColor}15`, color: trackColor,
        fontSize: 11, fontWeight: 600,
      }}>
        {row.layer}
      </div>

      {/* HC transition */}
      <div style={{ fontSize: 12, fontWeight: 500, color: "#161822" }}>
        {row.currentHeadcount.toLocaleString()}
        {hcChanged ? (
          <>
            <span style={{ color: "rgba(28,43,58,0.55)", margin: "0 3px" }}>{"\u2192"}</span>
            <span style={{ color: row.futureHeadcount < row.currentHeadcount ? "#16A34A" : "#DC2626" }}>
              {row.futureHeadcount.toLocaleString()}
            </span>
          </>
        ) : (
          <span style={{ color: "rgba(28,43,58,0.55)", marginLeft: 4, fontSize: 11 }}>HC</span>
        )}
      </div>

      {/* Cost bar — colored fill at 40% opacity */}
      <div style={{ position: "relative", height: 20 }}>
        <div style={{
          position: "absolute", left: 0, top: 2, height: 16, borderRadius: 4,
          width: `${barWidth}%`,
          background: `${trackColor}66`,
          transition: "width 0.5s ease-out",
        }} />
        {barWidth > 20 && (
          <div style={{
            position: "absolute", left: 8, top: 3, fontSize: 11, fontWeight: 500,
            color: "#161822", zIndex: 2,
          }}>
            {formatCurrency(row.currentCost)}
          </div>
        )}
      </div>

      {/* Future cost */}
      <div style={{ fontSize: 12, fontWeight: 500, color: "#161822", textAlign: "right" }}>
        {formatCurrency(row.futureCost)}
      </div>

      {/* Delta */}
      <div style={{
        fontSize: 12, fontWeight: 500, color: deltaColor, textAlign: "right",
      }}>
        {delta === 0 ? "\u2014" : `${delta > 0 ? "+" : ""}${formatCurrency(delta)}`}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div style={TOOLTIP_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{row.layer}</div>
          <div>Current: {row.currentHeadcount.toLocaleString()} HC x {formatCurrency(row.avgComp)} = {formatCurrency(row.currentCost)}</div>
          <div>Proposed: {row.futureHeadcount.toLocaleString()} HC x {formatCurrency(row.futureAvgComp)} = {formatCurrency(row.futureCost)}</div>
          {delta !== 0 && (
            <div style={{ color: deltaColor, fontWeight: 500 }}>
              {delta < 0 ? "Savings" : "Increase"}: {formatCurrency(Math.abs(delta))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrackSection({ label, trackKey, rows, maxCost }: { label: string; trackKey: string; rows: ComputedRow[]; maxCost: number }) {
  const trackColor = TRACK_COLORS[trackKey] || "#f4a83a";
  const curTotal = rows.reduce((s, r) => s + r.currentCost, 0);
  const futTotal = rows.reduce((s, r) => s + r.futureCost, 0);
  const delta = futTotal - curTotal;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 0 4px",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 4,
          background: trackColor, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          textTransform: "uppercase" as const, color: "rgba(28,43,58,0.55)",
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(28,43,58,0.06)" }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(28,43,58,0.55)" }}>
          {formatCurrency(curTotal)} {"\u2192"} {formatCurrency(futTotal)}
          {delta !== 0 && (
            <span style={{ color: delta < 0 ? "#16A34A" : "#DC2626", marginLeft: 6 }}>
              ({delta > 0 ? "+" : ""}{formatCurrency(delta)})
            </span>
          )}
        </span>
      </div>
      {rows.map((r) => (
        <CostRow key={r.layer} row={r} maxCost={maxCost} />
      ))}
    </div>
  );
}

function DonutChart({ segments, totalCost, size = 140 }: { segments: { label: string; value: number; color: string }[]; totalCost: number; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.55; // thicker ring

  let cumAngle = -Math.PI / 2;
  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      `Z`,
    ].join(" ");

    return <path key={seg.label} d={d} fill={seg.color} opacity={0.85} />;
  });

  const centerLabel = totalCost >= 1e6 ? `$${(totalCost / 1e6).toFixed(1)}M` : formatCurrency(totalCost);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#161822" fontSize={15} fontWeight={500}>
          {centerLabel}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(28,43,58,0.55)" fontSize={11} fontWeight={500} letterSpacing="0.05em">
          Total Cost
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color }} />
            <span style={{ fontSize: 11, color: "rgba(28,43,58,0.65)", fontWeight: 500 }}>{seg.label}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#161822" }}>
              {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CostModelChart({ data }: { data?: LayerCostData[] }) {
  const rawRows = data ?? defaultData;
  const [mode, setMode] = useState<"absolute" | "perhead">("absolute");

  const computed: ComputedRow[] = useMemo(
    () =>
      rawRows
        .filter((d) => d.currentHeadcount > 0 || d.futureHeadcount > 0)
        .map((d) => {
          const futComp = d.futureAvgComp ?? d.avgComp;
          const curCost = d.currentHeadcount * d.avgComp;
          const futCost = d.futureHeadcount * futComp;
          return {
            layer: d.layer,
            currentHeadcount: d.currentHeadcount,
            futureHeadcount: d.futureHeadcount,
            avgComp: d.avgComp,
            futureAvgComp: futComp,
            currentCost: curCost,
            futureCost: futCost,
            deltaCost: futCost - curCost,
            deltaPct: curCost > 0 ? ((futCost - curCost) / curCost) * 100 : 0,
          };
        }),
    [rawRows]
  );

  // Group by track
  const trackGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: ComputedRow[] }[] = [];
    const trackOrder = ["E", "M", "P", "T", "S"];
    for (const tk of trackOrder) {
      const trackRows = computed.filter((r) => r.layer.startsWith(tk));
      if (trackRows.length > 0) {
        groups.push({ key: tk, label: TRACK_LABELS[tk] || tk, rows: trackRows });
      }
    }
    return groups;
  }, [computed]);

  const maxCost = useMemo(
    () => Math.max(...computed.map((r) => Math.max(r.currentCost, r.futureCost)), 1),
    [computed]
  );

  const totalCurCost = computed.reduce((s, r) => s + r.currentCost, 0);
  const totalFutCost = computed.reduce((s, r) => s + r.futureCost, 0);
  const netDelta = totalFutCost - totalCurCost;
  const totalCurHC = computed.reduce((s, r) => s + r.currentHeadcount, 0);
  const totalFutHC = computed.reduce((s, r) => s + r.futureHeadcount, 0);
  const costPerHeadCur = totalCurHC > 0 ? totalCurCost / totalCurHC : 0;
  const costPerHeadFut = totalFutHC > 0 ? totalFutCost / totalFutHC : 0;
  const costShiftPct = totalCurCost > 0 ? ((totalFutCost - totalCurCost) / totalCurCost) * 100 : 0;

  const allDeltaZero = computed.every((r) => r.deltaCost === 0);
  const netColor = netDelta < 0 ? "#16A34A" : netDelta > 0 ? "#DC2626" : "rgba(28,43,58,0.65)";

  // Track cost totals for donut chart — use track-based colors
  const donutSegments = trackGroups.map((g) => ({
    label: g.label,
    value: g.rows.reduce((s, r) => s + r.currentCost, 0),
    color: TRACK_COLORS[g.key] || "#64748b",
  }));

  const cardBase: React.CSSProperties = {
    background: "rgba(247,245,240,0.5)",
    borderRadius: 8,
    padding: "12px 16px",
    border: "0.5px solid rgba(28,43,58,0.08)",
  };
  const cardLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const,
    letterSpacing: "0.05em", color: "rgba(28,43,58,0.55)", marginBottom: 4,
  };
  const cardValue: React.CSSProperties = {
    fontSize: 20, fontWeight: 500, color: "#161822",
  };

  return (
    <div role="img" aria-label="Cost model chart showing current and proposed compensation costs by layer and track">
      {/* Humanistic note */}
      <div style={{ fontSize: 12, color: 'rgba(28,43,58,0.55)', fontStyle: 'italic', marginBottom: 16 }}>
        Behind every cost line is a team. This model helps plan transitions that respect both the business and the people.
      </div>
      {/* Cost-neutral diagnostic */}
      {allDeltaZero && (
        <div style={{
          padding: "24px 20px", textAlign: "center", marginBottom: 20,
          background: "rgba(247,245,240,0.5)", borderRadius: 8,
          border: "0.5px dashed rgba(28,43,58,0.15)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#161822", marginBottom: 4 }}>
            This scenario is cost-neutral
          </div>
          <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>
            All layer costs remain unchanged. Headcount redistribution has no net cost impact.
          </div>
        </div>
      )}

      {/* Top summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={cardBase}>
          <div style={cardLabel}>Current Total</div>
          <div style={cardValue}>{formatCurrency(totalCurCost)}</div>
        </div>
        <div style={cardBase}>
          <div style={cardLabel}>Proposed Total</div>
          <div style={cardValue}>{formatCurrency(totalFutCost)}</div>
        </div>
        <div style={cardBase}>
          <div style={cardLabel}>Net {netDelta <= 0 ? "Savings" : "Increase"}</div>
          <div style={{ ...cardValue, color: netColor }}>
            {netDelta > 0 ? "+" : ""}{formatCurrency(netDelta)}
          </div>
        </div>
        <div style={cardBase}>
          <div style={cardLabel}>Cost Per Head</div>
          <div style={{ ...cardValue, fontSize: 16 }}>
            {formatCurrency(costPerHeadCur)}
            <span style={{ color: "rgba(28,43,58,0.55)", fontSize: 13, margin: "0 4px" }}>{"\u2192"}</span>
            {formatCurrency(costPerHeadFut)}
          </div>
        </div>
        <div style={cardBase}>
          <div style={cardLabel}>Cost Shift</div>
          <div style={{ ...cardValue, color: netColor }}>
            {costShiftPct >= 0 ? "+" : ""}{costShiftPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Donut chart */}
      {donutSegments.some(s => s.value > 0) && (
        <div style={{
          ...cardBase, marginBottom: 20, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "20px 32px",
        }}>
          <div>
            <div style={cardLabel}>Cost Distribution by Track</div>
            <DonutChart segments={donutSegments} totalCost={totalCurCost} size={140} />
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{
        display: "inline-flex", alignItems: "center",
        background: "rgba(247,245,240,0.5)", borderRadius: 8,
        border: "0.5px solid rgba(28,43,58,0.08)",
        padding: 2, marginBottom: 16,
      }}>
        {(["absolute", "perhead"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-label={m === "absolute" ? "Show total cost view" : "Show per head cost view"}
            style={{
              padding: "5px 16px", borderRadius: 6,
              fontSize: 12, fontWeight: 500, border: "none",
              background: mode === m ? "#161822" : "transparent",
              color: mode === m ? "#FFFFFF" : "rgba(28,43,58,0.55)",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            {m === "absolute" ? "Total Cost" : "Per Head"}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div role="table" aria-label="Cost breakdown by layer" style={{
        display: "grid",
        gridTemplateColumns: "40px 90px 1fr 80px 70px",
        gap: 10, padding: "6px 4px",
        fontSize: 11, fontWeight: 500,
        textTransform: "uppercase" as const, letterSpacing: "0.04em",
        color: "rgba(28,43,58,0.65)",
        borderBottom: "0.5px solid rgba(28,43,58,0.15)",
        marginBottom: 4,
      }}>
        <div>Layer</div>
        <div>HC</div>
        <div>{mode === "absolute" ? "Cost" : "Per Head"}</div>
        <div style={{ textAlign: "right" }}>{mode === "absolute" ? "Proposed" : "New Comp"}</div>
        <div style={{ textAlign: "right" }}>Delta</div>
      </div>

      {/* Track-grouped rows */}
      {!allDeltaZero && trackGroups.map((g) => (
        <TrackSection key={g.key} label={g.label} trackKey={g.key} rows={g.rows} maxCost={maxCost} />
      ))}

      {/* If all zero, show simplified view */}
      {allDeltaZero && trackGroups.map((g) => (
        <TrackSection key={g.key} label={g.label} trackKey={g.key} rows={g.rows} maxCost={maxCost} />
      ))}

      {/* Methodology note */}
      <div style={{
        fontSize: 11, color: "rgba(28,43,58,0.65)", marginTop: 16, fontStyle: "italic",
        borderTop: "0.5px solid rgba(28,43,58,0.08)", paddingTop: 12,
      }}>
        Cost = headcount x fully-loaded compensation (base + 25% benefits + overhead). Proposed cost reflects scenario adjustments.
      </div>
      {/* Source citation */}
      <div style={{ fontSize: 11, color: "rgba(28,43,58,0.45)", marginTop: 8, textAlign: "right" }}>
        Source: Industry benchmarks (illustrative ranges, 2024)
      </div>
    </div>
  );
}
