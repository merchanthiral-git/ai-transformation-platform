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

const TEAL = "#1D9E75";
const RED = "#E24B4A";

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

function CostRow({
  row,
  maxAbsDelta,
  mode,
}: {
  row: ComputedRow;
  maxAbsDelta: number;
  mode: "absolute" | "perhead";
}) {
  const [hovered, setHovered] = useState(false);
  const barMaxWidth = 100;
  const barWidth = maxAbsDelta > 0 ? (Math.abs(row.deltaCost) / maxAbsDelta) * barMaxWidth : 0;
  const isGrowth = row.deltaCost > 0;
  const barColor = row.deltaCost < 0 ? TEAL : row.deltaCost > 0 ? RED : "transparent";
  const hcDelta = row.futureHeadcount - row.currentHeadcount;

  const dispCurrent = mode === "absolute" ? formatCurrency(row.currentCost) : formatCurrency(row.avgComp);
  const dispFuture = mode === "absolute" ? formatCurrency(row.futureCost) : formatCurrency(row.futureAvgComp);
  const dispDelta = mode === "absolute"
    ? `${row.deltaCost <= 0 ? "" : "+"}${formatCurrency(row.deltaCost)}`
    : `${row.futureAvgComp >= row.avgComp ? "+" : ""}${formatCurrency(row.futureAvgComp - row.avgComp)}`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 120px 70px 80px 80px 80px 1fr",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 4,
        background: hovered ? "var(--hover, rgba(255,255,255,0.03))" : "transparent",
        transition: "background 0.15s ease",
        position: "relative",
        minHeight: 40,
      }}
    >
      {/* Layer */}
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #e8ecf4)" }}>
        {row.layer}
      </div>

      {/* Headcount shift */}
      <div style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span style={{ color: "var(--text-primary, #e8ecf4)" }}>{row.currentHeadcount.toLocaleString()}</span>
        <span style={{ color: "var(--text-muted, #7b8ba2)", margin: "0 4px" }}>&rarr;</span>
        <span style={{ color: hcDelta < 0 ? RED : hcDelta > 0 ? TEAL : "var(--text-primary, #e8ecf4)" }}>
          {row.futureHeadcount.toLocaleString()}
        </span>
      </div>

      {/* Avg comp */}
      <div style={{ fontSize: 12, color: "var(--text-muted, #7b8ba2)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {formatCurrency(row.avgComp)}
      </div>

      {/* Current cost */}
      <div style={{ fontSize: 13, color: "var(--text-primary, #e8ecf4)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {dispCurrent}
      </div>

      {/* Future cost */}
      <div style={{ fontSize: 13, color: "var(--text-primary, #e8ecf4)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {dispFuture}
      </div>

      {/* Delta */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: row.deltaCost < 0 ? TEAL : row.deltaCost > 0 ? RED : "var(--text-muted, #7b8ba2)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {dispDelta}
      </div>

      {/* Delta bar */}
      <div style={{ display: "flex", alignItems: "center", height: 14, position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border, #2a3350)" }} />
        {row.deltaCost !== 0 && (
          <div
            style={{
              position: "absolute",
              height: 14,
              borderRadius: 2,
              background: barColor,
              transition: "width 0.4s ease",
              ...(isGrowth
                ? { left: "50%", width: barWidth }
                : { right: "50%", width: barWidth }),
            }}
          />
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && mode === "absolute" && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 40,
            zIndex: 20,
            background: "var(--surface-1, #131b2e)",
            border: "1px solid var(--border, #2a3350)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--text-secondary, #a3b1c6)",
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.8,
            boxShadow: "var(--shadow-3, 0 8px 24px rgba(0,0,0,0.12))",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div>
            Current: {row.currentHeadcount.toLocaleString()} heads &times; {formatCurrency(row.avgComp)} = {formatCurrency(row.currentCost)}
          </div>
          <div>
            Future: {row.futureHeadcount.toLocaleString()} heads &times; {formatCurrency(row.futureAvgComp)} = {formatCurrency(row.futureCost)}
          </div>
          <div style={{ color: row.deltaCost < 0 ? TEAL : RED, fontWeight: 500 }}>
            {row.deltaCost < 0 ? "Savings" : "Increase"}: {Math.abs(row.futureHeadcount - row.currentHeadcount).toLocaleString()} heads &times; {formatCurrency(row.futureAvgComp)} = {formatCurrency(Math.abs(row.deltaCost))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubtotalRow({ label, rows }: { label: string; rows: ComputedRow[] }) {
  const curTotal = rows.reduce((s, r) => s + r.currentCost, 0);
  const futTotal = rows.reduce((s, r) => s + r.futureCost, 0);
  const delta = futTotal - curTotal;
  const curHC = rows.reduce((s, r) => s + r.currentHeadcount, 0);
  const futHC = rows.reduce((s, r) => s + r.futureHeadcount, 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 120px 70px 80px 80px 80px 1fr",
        alignItems: "center",
        padding: "8px 12px",
        borderTop: "1px solid var(--border, #2a3350)",
        fontWeight: 600,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted, #7b8ba2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-primary, #e8ecf4)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {curHC.toLocaleString()} <span style={{ color: "var(--text-muted, #7b8ba2)" }}>&rarr;</span> {futHC.toLocaleString()}
      </div>
      <div />
      <div style={{ fontSize: 13, color: "var(--text-primary, #e8ecf4)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {formatCurrency(curTotal)}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-primary, #e8ecf4)", fontFamily: "'IBM Plex Mono', monospace" }}>
        {formatCurrency(futTotal)}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: delta < 0 ? TEAL : delta > 0 ? RED : "var(--text-muted, #7b8ba2)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {delta <= 0 ? "" : "+"}{formatCurrency(delta)}
      </div>
      <div />
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

  const execRows = computed.filter((r) => r.layer.startsWith("E"));
  const mgtRows = computed.filter((r) => r.layer.startsWith("M"));
  const proRows = computed.filter((r) => r.layer.startsWith("P"));
  const hasProRows = proRows.some((r) => r.futureHeadcount > 0);

  const maxAbsDelta = useMemo(
    () => Math.max(...computed.map((r) => Math.abs(r.deltaCost)), 1),
    [computed]
  );

  const totalCurCost = computed.reduce((s, r) => s + r.currentCost, 0);
  const totalFutCost = computed.reduce((s, r) => s + r.futureCost, 0);
  const netSavings = totalFutCost - totalCurCost;
  const totalCurHC = computed.reduce((s, r) => s + r.currentHeadcount, 0);
  const totalFutHC = computed.reduce((s, r) => s + r.futureHeadcount, 0);
  const costPerHeadCur = totalCurHC > 0 ? totalCurCost / totalCurHC : 0;
  const costPerHeadFut = totalFutHC > 0 ? totalFutCost / totalFutHC : 0;

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-2, #1a2340)",
    borderRadius: 8,
    padding: "12px 16px",
    border: "1px solid var(--border, #2a3350)",
  };
  const cardLabel: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted, #7b8ba2)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  };
  const cardValue: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 500,
    color: "var(--text-primary, #e8ecf4)",
  };

  const headerCols: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "40px 120px 70px 80px 80px 80px 1fr",
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted, #7b8ba2)",
    borderBottom: "1px solid var(--border, #2a3350)",
  };

  const renderSection = (title: string, rows: ComputedRow[], showSubtotal: boolean) => (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted, #7b8ba2)",
          padding: "10px 12px 4px",
        }}
      >
        {title}
      </div>
      {rows.map((r) => (
        <CostRow key={r.layer} row={r} maxAbsDelta={maxAbsDelta} mode={mode} />
      ))}
      {showSubtotal && (
        <SubtotalRow
          label="Sub"
          rows={rows}
        />
      )}
    </div>
  );

  return (
    <div>
      {/* Summary metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={cardLabel}>Current Total Cost</div>
          <div style={cardValue}>{formatCurrency(totalCurCost)}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabel}>Future Total Cost</div>
          <div style={cardValue}>{formatCurrency(totalFutCost)}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabel}>Net {netSavings <= 0 ? "Savings" : "Increase"}</div>
          <div style={{ ...cardValue, color: netSavings <= 0 ? TEAL : RED }}>
            {netSavings > 0 ? "+" : ""}{formatCurrency(netSavings)}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabel}>Cost Per Head (avg)</div>
          <div style={cardValue}>
            {formatCurrency(costPerHeadCur)}{" "}
            <span style={{ color: "var(--text-muted, #7b8ba2)", fontSize: 14 }}>&rarr;</span>{" "}
            {formatCurrency(costPerHeadFut)}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {(["absolute", "perhead"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid var(--border, #2a3350)",
              background: mode === m ? "var(--accent-primary, #D4860A)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-secondary, #a3b1c6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {m === "absolute" ? "Absolute" : "Per Head"}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={headerCols}>
        <div>Layer</div>
        <div>HC Current &rarr; Future</div>
        <div>Avg Comp</div>
        <div>{mode === "absolute" ? "Current $" : "Comp (C)"}</div>
        <div>{mode === "absolute" ? "Future $" : "Comp (F)"}</div>
        <div>Delta</div>
        <div style={{ textAlign: "center" }}>Impact</div>
      </div>

      {/* Executive layers */}
      {execRows.length > 0 && renderSection("Executive layers", execRows, true)}

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border, #2a3350)", margin: "4px 0" }} />

      {/* Management layers */}
      {mgtRows.length > 0 && renderSection("Management layers", mgtRows, true)}

      {/* Professional layers (only if any have non-zero future) */}
      {hasProRows && (
        <>
          <div style={{ height: 1, background: "var(--border, #2a3350)", margin: "4px 0" }} />
          {renderSection("Professional layers", proRows.filter((r) => r.currentHeadcount > 0 || r.futureHeadcount > 0), true)}
        </>
      )}

      {/* Methodology note */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #7b8ba2)",
          marginTop: 16,
          fontStyle: "italic",
        }}
      >
        Cost = headcount &times; fully-loaded compensation (base + 25% benefits + overhead). Future cost reflects scenario adjustments.
      </div>
    </div>
  );
}
