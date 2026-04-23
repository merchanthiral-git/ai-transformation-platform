"use client";
import React, { useState, useCallback, useRef } from "react";
import { tokens } from "../design-tokens";
import { CanvasSurface } from "../CanvasSurface";
import { SectionHead, Em, Gold, Eyebrow } from "../SectionHead";
import { PullQuote } from "../PullQuote";
import { RoleNode } from "../RoleNode";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";

type StructuralState = 'current' | 'future' | 'diff';
type ReportingDepth = 'n1' | 'n2' | 'n3' | 'n4' | 'nx';
type DiagnosticOverlay = 'span' | 'om' | 'cost' | 'decision';

const DEPTH_LABELS = ['N\u22121', 'N\u22122', 'N\u22123', 'N\u22124', 'N\u2212x'];
const DEPTH_VALUES: ReportingDepth[] = ['n1', 'n2', 'n3', 'n4', 'nx'];

const SCENARIOS = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'regions-mea', label: 'Regions +1 (MEA)' },
  { id: 'collapse-cfo-coo', label: 'Collapse CFO+COO' },
  { id: 'flatten-l4', label: 'Flatten layer 4' },
];

const GALBRAITH_NODES = [
  { label: 'Strategy', angle: -90, active: true },
  { label: 'Organization', angle: -18, active: true },
  { label: 'Processes', angle: 54, active: false },
  { label: 'Rewards', angle: 126, active: false },
  { label: 'People', angle: 198, active: true },
];

const RACI_DECISIONS = [
  { decision: 'Regional P&L ownership', r: 'MD', a: 'CEO', c: 'CFO', i: 'CHRO' },
  { decision: 'Brand architecture changes', r: 'CMO', a: 'CEO', c: 'MD', i: 'COO' },
  { decision: 'Headcount above plan', r: 'CHRO', a: 'CFO', c: 'CEO', i: 'MD' },
  { decision: 'New market entry', r: 'MD', a: 'CEO', c: 'CFO', i: 'CMO' },
  { decision: 'IT platform selection', r: 'CTO', a: 'COO', c: 'CFO', i: 'CEO' },
];

/* ── Diagnostic metric row ─────────────────── */
function DiagRow({ label, current, future, unit, inverted }: {
  label: string; current: number; future: number; unit?: string; inverted?: boolean;
}) {
  const delta = future - current;
  const improved = inverted ? delta > 0 : delta < 0;
  const pctCurrent = Math.min(current / (Math.max(current, future) * 1.2), 1);
  const pctFuture = Math.min(future / (Math.max(current, future) * 1.2), 1);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: tokens.color.ink }}>{label}</span>
        <span style={{
          fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 600,
          color: delta === 0 ? tokens.color.inkMute : improved ? tokens.color.green : tokens.color.danger,
        }}>
          {delta > 0 ? '+' : ''}{unit === '%' ? delta.toFixed(1) : delta}{unit || ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute, width: 36, textAlign: 'right' }}>
          {unit === '%' ? current.toFixed(1) : current}{unit || ''}
        </span>
        <div style={{ flex: 1, height: 3, background: tokens.color.lineFaint, borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: 3, borderRadius: 2, background: tokens.color.navy, width: `${pctCurrent * 100}%` }} />
        </div>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute }}>→</span>
        <div style={{ flex: 1, height: 3, background: tokens.color.lineFaint, borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: 3, borderRadius: 2, background: tokens.color.blue, width: `${pctFuture * 100}%` }} />
        </div>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute, width: 36 }}>
          {unit === '%' ? future.toFixed(1) : future}{unit || ''}
        </span>
      </div>
    </div>
  );
}

/* ── SVG Bezier Connector ─────────────────── */
function BezierConnector({ x1, y1, x2, y2, status }: {
  x1: number; y1: number; x2: number; y2: number; status: OrgRole['status'];
}) {
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  const color = status === 'new' ? tokens.color.orange
    : status === 'moved' ? tokens.color.blue
    : status === 'eliminated' ? tokens.color.danger
    : tokens.color.navyLine;
  const dashed = status === 'new' || status === 'moved' || status === 'eliminated';

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={dashed ? '6 4' : undefined}
      opacity={dashed ? 0.55 : 0.22}
    />
  );
}

/* ── Galbraith Star SVG ─────────────────── */
function GalbraithStar() {
  const cx = 100, cy = 100, r = 70;
  const points = GALBRAITH_NODES.map((n) => {
    const rad = (n.angle * Math.PI) / 180;
    return { ...n, x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });
  const pentPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div style={{ padding: '12px 0' }}>
      <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 220, margin: '0 auto', display: 'block' }}>
        <polygon points={pentPath.replace(/[MLZ]/g, '').trim()} fill="none" stroke={tokens.color.lineSoft} strokeWidth={1} />
        {points.map((p) => (
          <g key={p.label}>
            <circle
              cx={p.x} cy={p.y} r={8}
              fill={p.active ? tokens.color.navy : 'none'}
              stroke={p.active ? tokens.color.navy : tokens.color.lineSoft}
              strokeWidth={1.5}
            />
            <text
              x={p.x} y={p.y + (p.y < cy ? -14 : 18)}
              textAnchor="middle"
              style={{ fontSize: 9, fontFamily: tokens.font.mono, fontWeight: 500, fill: tokens.color.inkSoft, letterSpacing: '0.04em' }}
            >
              {p.label}
            </text>
          </g>
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontFamily: tokens.font.display, fontStyle: 'italic', fontSize: 13, fill: tokens.color.inkMute }}>
          fit
        </text>
      </svg>
    </div>
  );
}

/* ── Main Structure Tab ─────────────────── */
export function StructureTab({ profile }: { profile: SandboxProfile }) {
  const [structState, setStructState] = useState<StructuralState>('future');
  const [depth, setDepth] = useState<ReportingDepth>('n1');
  const [overlays, setOverlays] = useState<Set<DiagnosticOverlay>>(new Set());
  const [activeScenario, setActiveScenario] = useState('baseline');
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);

  const toggleOverlay = useCallback((o: DiagnosticOverlay) => {
    setOverlays(prev => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o); else next.add(o);
      return next;
    });
  }, []);

  const currentState = profile.current;
  const futureState = profile.future;
  const diag = { current: currentState.diagnostics, future: futureState.diagnostics };
  const state = structState === 'current' ? currentState : futureState;
  const showDepth = depth === 'n2' || depth === 'n3' || depth === 'n4' || depth === 'nx';

  // Compute node positions for SVG
  const nodeWidth = 160;
  const rootWidth = 240;
  const gapX = 20;
  const gapY = 100;
  const n1Count = state.n1.length;
  const totalWidth = Math.max(n1Count * (nodeWidth + gapX) - gapX, rootWidth);
  const rootX = totalWidth / 2;
  const rootY = 40;
  const n1Y = rootY + gapY + 60;

  /* ── Left Rail ──────────────────────── */
  const leftRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Strategic Context Card */}
      <div style={{
        background: tokens.color.ivoryCard,
        border: `1px solid ${tokens.color.line}`,
        borderLeft: `3px solid ${tokens.color.orange}`,
        borderRadius: '0 9px 9px 0',
        padding: 16,
      }}>
        <Eyebrow>Strategic Intent &middot; CEO Mandate</Eyebrow>
        <h3 style={{
          fontFamily: tokens.font.display, fontWeight: 400, fontSize: 15,
          color: tokens.color.ink, margin: '8px 0 4px', lineHeight: 1.3,
        }}>
          &ldquo;{profile.strategicContext.ceoMandate}&rdquo;
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12 }}>
          {Object.entries(profile.strategicContext).filter(([k]) => k !== 'ceoMandate' && k !== 'transformationFrom' && k !== 'transformationTo').map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute }}>{k}</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: tokens.color.ink }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Three-state toggle */}
      <div>
        <Eyebrow>Structural State</Eyebrow>
        <div style={{
          display: 'flex', marginTop: 8, background: tokens.color.ivoryDeep,
          borderRadius: 8, padding: 3, position: 'relative',
        }}>
          {(['current', 'future', 'diff'] as StructuralState[]).map((s, i) => (
            <button
              key={s}
              onClick={() => setStructState(s)}
              style={{
                flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
                fontFamily: tokens.font.body, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: structState === s
                  ? (s === 'current' ? tokens.color.navy : s === 'future' ? tokens.color.blue : tokens.color.orange)
                  : 'transparent',
                color: structState === s ? tokens.color.ivory : tokens.color.inkMute,
                transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
                position: 'relative', zIndex: 1,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reporting Depth */}
      <div>
        <Eyebrow>Reporting Depth</Eyebrow>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {DEPTH_VALUES.map((d, i) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              style={{
                flex: 1, padding: '5px 0', fontSize: 10,
                fontFamily: tokens.font.mono, fontWeight: depth === d ? 700 : 500,
                borderRadius: 5, border: `1px solid ${depth === d ? tokens.color.navy : tokens.color.lineSoft}`,
                background: depth === d ? tokens.color.navy : 'transparent',
                color: depth === d ? tokens.color.ivory : tokens.color.inkMute,
                cursor: 'pointer',
                transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
              }}
            >
              {DEPTH_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Overlays */}
      <div>
        <Eyebrow>Diagnostic Overlays</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {([
            { id: 'span' as DiagnosticOverlay, label: 'Span of Control', hint: '8\u201310 tgt' },
            { id: 'om' as DiagnosticOverlay, label: 'Operating Model (C/E/S)', hint: 'C/E/S' },
            { id: 'cost' as DiagnosticOverlay, label: 'Cost per Layer', hint: '$M' },
            { id: 'decision' as DiagnosticOverlay, label: 'Decision Density', hint: 'DACI' },
          ]).map((o) => (
            <button
              key={o.id}
              onClick={() => toggleOverlay(o.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: overlays.has(o.id) ? tokens.color.navy : tokens.color.ivoryCard,
                transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: `1.5px solid ${overlays.has(o.id) ? tokens.color.ivory : tokens.color.line}`,
                background: overlays.has(o.id) ? tokens.color.blue : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {overlays.has(o.id) && (
                  <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={tokens.color.ivory} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span style={{
                fontSize: 11.5, fontWeight: 500,
                color: overlays.has(o.id) ? tokens.color.ivory : tokens.color.ink,
                flex: 1,
              }}>
                {o.label}
              </span>
              <span style={{
                fontFamily: tokens.font.mono, fontSize: 8.5, letterSpacing: '0.06em',
                color: overlays.has(o.id) ? 'rgba(255,255,255,0.5)' : tokens.color.inkFaint,
              }}>
                {o.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Structural Diagnostics */}
      <div>
        <Eyebrow>Structural Diagnostics</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <DiagRow label="Avg span" current={diag.current.avgSpan} future={diag.future.avgSpan} inverted />
          <DiagRow label="Layers (CEO→IC)" current={diag.current.layers} future={diag.future.layers} />
          <DiagRow label="Duplicated roles" current={diag.current.duplicated} future={diag.future.duplicated} />
          <DiagRow label="Manager:IC ratio" current={diag.current.mgrToIC} future={diag.future.mgrToIC} inverted />
          <DiagRow label="G&A as % revenue" current={diag.current.gaAsPctRev} future={diag.future.gaAsPctRev} unit="%" />
        </div>
      </div>
    </div>
  );

  /* ── Right Rail ─────────────────────── */
  const rightRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Galbraith Star */}
      <div>
        <Eyebrow>Galbraith Star Model</Eyebrow>
        <GalbraithStar />
        <p style={{ fontSize: 11.5, color: tokens.color.inkSoft, lineHeight: 1.5, marginTop: 8 }}>
          Three of five star points are actively addressed in this design: Strategy, Organization, and People.
          Processes and Rewards alignment follows in the execution phase.
        </p>
      </div>

      {/* Archetype Comparison */}
      <div>
        <Eyebrow>Archetype Comparison</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
          {Object.entries(profile.archetypeRanking).map(([id, fit]) => {
            const isChosen = id === profile.chosenArchetype;
            const ARCH_NAMES: Record<string, string> = { functional: 'Functional', regionalHolding: 'Regional Holding', frontBack: 'Front-Back', matrix: 'Matrix', productDivisional: 'Product Divisional', ambidextrous: 'Ambidextrous', platform: 'Platform', networked: 'Networked' };
            const fitColor = fit === 'strong' ? tokens.color.green : fit === 'partial' ? tokens.color.gold : fit === 'current' ? tokens.color.blue : tokens.color.danger;
            return (
            <div
              key={id}
              style={{
                padding: 9,
                borderRadius: 7,
                border: `1px solid ${isChosen ? tokens.color.orange : tokens.color.lineSoft}`,
                background: isChosen ? tokens.color.orangeWash : tokens.color.ivoryCard,
                position: 'relative',
              }}
            >
              {isChosen && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: tokens.color.orange,
                }} />
              )}
              <div style={{ fontFamily: tokens.font.display, fontSize: 12, fontWeight: 450, color: tokens.color.ink }}>
                {ARCH_NAMES[id] || id}
              </div>
              <div style={{
                fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 600,
                letterSpacing: '0.06em', marginTop: 2,
                color: fitColor,
              }}>
                {fit}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Design Rationale */}
      <div>
        <Eyebrow>Design Rationale</Eyebrow>
        <h3 style={{
          fontFamily: tokens.font.display, fontWeight: 450, fontSize: 15,
          color: tokens.color.ink, margin: '10px 0 8px', lineHeight: 1.3,
        }}>
          {profile.designRationaleHeadline}
        </h3>
        <p style={{ fontSize: 12, color: tokens.color.inkSoft, lineHeight: 1.6, margin: '0 0 12px' }}>
          {profile.designRationaleBody}
        </p>
        <PullQuote attribution={profile.pullQuote.attr}>
          {profile.pullQuote.text}
        </PullQuote>
      </div>

      {/* Decision Rights */}
      <div>
        <Eyebrow>Decision Rights &middot; Top 5</Eyebrow>
        <div style={{ marginTop: 10 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 26px)', gap: 2, marginBottom: 6 }}>
            <span />
            {['R', 'A', 'C', 'I'].map(h => (
              <span key={h} style={{
                fontFamily: tokens.font.mono, fontSize: 8.5, fontWeight: 600,
                letterSpacing: '0.1em', textAlign: 'center', color: tokens.color.inkMute,
              }}>{h}</span>
            ))}
          </div>
          {RACI_DECISIONS.map((d) => (
            <div key={d.decision} style={{
              display: 'grid', gridTemplateColumns: '1fr repeat(4, 26px)', gap: 2,
              padding: '5px 0', borderTop: `1px solid ${tokens.color.lineFaint}`, alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: tokens.color.ink }}>{d.decision}</span>
              {[d.r, d.a, d.c, d.i].map((val, i) => {
                const colors = [tokens.color.orange, tokens.color.navy, tokens.color.blue, tokens.color.green];
                const bgs = [tokens.color.orangeWash, tokens.color.ivoryDeep, tokens.color.blueWash, tokens.color.greenPale];
                return (
                  <span key={i} style={{
                    fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 600,
                    textAlign: 'center', color: colors[i],
                    background: bgs[i], borderRadius: 3, padding: '2px 0',
                  }}>
                    {val}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* N−1 Changes */}
      <div>
        <Eyebrow>N&minus;1 Changes</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {futureState.n1.filter(r => r.status).map((r) => (
            <div
              key={r.id}
              style={{
                padding: '8px 10px',
                borderLeft: `3px solid ${r.status === 'new' ? tokens.color.orange : r.status === 'moved' ? tokens.color.blue : tokens.color.danger}`,
                borderRadius: '0 6px 6px 0',
                background: tokens.color.ivoryCard,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontFamily: tokens.font.mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: r.status === 'new' ? tokens.color.orange : r.status === 'moved' ? tokens.color.blue : tokens.color.danger,
                }}>
                  {r.status === 'new' ? 'NEW' : r.status === 'moved' ? 'MOVED' : 'EXIT'}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: tokens.color.ink }}>{r.title}</div>
              {r.note && (
                <div style={{ fontSize: 10.5, color: tokens.color.inkMute, marginTop: 2, lineHeight: 1.4 }}>{r.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Canvas (Org Tree) ──────────────── */
  const canvas = (
    <CanvasSurface>
      <div style={{ padding: '32px 40px' }}>
        {/* Editorial header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ maxWidth: 600 }}>
            <Eyebrow>Structure &middot; {structState === 'current' ? 'Current State' : structState === 'future' ? 'Future State' : 'Current → Future'}</Eyebrow>
            <h1 style={{
              fontFamily: tokens.font.display, fontWeight: 300, fontSize: 26,
              letterSpacing: '-0.02em', color: tokens.color.ink, margin: '8px 0 0',
              lineHeight: 1.2,
            }}>
              {profile.company} &mdash; <Gold>N&minus;1 reporting structure</Gold>
            </h1>
            <p style={{ fontSize: 13, color: tokens.color.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
              {structState === 'current'
                ? 'Current organizational structure with brand-by-brand P&L ownership.'
                : structState === 'future'
                ? 'Future state: regional enterprise model with shared functional capabilities.'
                : 'Overlay showing structural changes from current to future state.'}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 20,
            background: tokens.color.ivoryCard,
            border: `1px solid ${tokens.color.line}`,
          }}>
            <span style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.06em', color: tokens.color.inkMute }}>
              ARCHETYPE
            </span>
            <span style={{ fontFamily: tokens.font.display, fontSize: 12, fontWeight: 450, color: tokens.color.ink }}>
              {profile.future.archetype}
            </span>
            <span style={{ color: tokens.color.inkFaint, fontSize: 11 }}>&middot;</span>
            <span style={{ fontFamily: tokens.font.mono, fontSize: 9.5, color: tokens.color.inkMute }}>
              {profile.strategicContext.transformationFrom} → {profile.strategicContext.transformationTo}
            </span>
          </div>
        </div>

        {/* Org Tree SVG Canvas */}
        <div
          ref={canvasRef}
          style={{
            overflow: 'auto',
            border: `1px solid ${tokens.color.lineFaint}`,
            borderRadius: 12,
            background: tokens.color.ivoryPaper,
            position: 'relative',
          }}
        >
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', padding: '30px 20px 40px', minWidth: totalWidth + 60 }}>
            {/* SVG connector layer */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              viewBox={`0 0 ${totalWidth + 60} ${n1Y + 180}`}
              preserveAspectRatio="none"
            >
              {state.n1.map((role, i) => {
                const x2 = 30 + i * (nodeWidth + gapX) + nodeWidth / 2;
                return (
                  <BezierConnector
                    key={role.id}
                    x1={rootX + 30}
                    y1={rootY + 70}
                    x2={x2}
                    y2={n1Y}
                    status={role.status}
                  />
                );
              })}
              {/* N-2 connectors */}
              {showDepth && state.n1.map((role, i) => {
                const parentX = 30 + i * (nodeWidth + gapX) + nodeWidth / 2;
                const parentY = n1Y + 90;
                return (role.children || []).map((child, j) => {
                  const childX = parentX + (j - ((role.children?.length || 1) - 1) / 2) * (nodeWidth * 0.7);
                  return (
                    <BezierConnector
                      key={child.id}
                      x1={parentX}
                      y1={parentY}
                      x2={childX}
                      y2={parentY + gapY - 20}
                      status={child.status}
                    />
                  );
                });
              })}
            </svg>

            {/* Root node */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: gapY - 20 }}>
              <RoleNode
                title={state.rootTitle}
                sub={state.rootSub}
                fn="exec"
                variant="root"
                metrics={[
                  { label: 'SPAN', value: String(state.n1.length) },
                  { label: 'N\u22121', value: String(state.n1.length) },
                ]}
              />
            </div>

            {/* N-1 nodes */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: gapX, flexWrap: 'nowrap' }}>
              {state.n1.map((role) => (
                <div key={role.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <RoleNode
                    title={role.title}
                    sub={role.sub}
                    fn={role.fn}
                    om={role.om}
                    variant={role.status === 'new' ? 'new' : role.status === 'moved' ? 'moved' : role.status === 'eliminated' ? 'eliminated' : 'default'}
                    warn={role.warn}
                    metrics={overlays.has('span') ? [{ label: 'SPAN', value: String(role.span) }] : undefined}
                  />

                  {/* N-2 children */}
                  {showDepth && role.children && role.children.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: gapY - 20 }}>
                      {role.children.map((child) => (
                        <RoleNode
                          key={child.id}
                          title={child.title}
                          sub={child.sub}
                          fn={child.fn}
                          om={child.om}
                          variant={child.status === 'new' ? 'new' : child.status === 'moved' ? 'moved' : child.status === 'eliminated' ? 'eliminated' : 'default'}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar: scenarios + zoom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          {/* Scenarios */}
          <div style={{ display: 'flex', gap: 4 }}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                style={{
                  padding: '5px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontFamily: tokens.font.mono, fontSize: 10, fontWeight: activeScenario === s.id ? 700 : 500,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: activeScenario === s.id ? tokens.color.navy : tokens.color.ivoryCard,
                  color: activeScenario === s.id ? tokens.color.ivory : tokens.color.inkMute,
                  transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${tokens.color.lineSoft}`,
                background: tokens.color.ivoryCard, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tokens.color.inkMute, fontSize: 14,
              }}
            >
              −
            </button>
            <span style={{ fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 600, color: tokens.color.inkMute, minWidth: 36, textAlign: 'center' }}>
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${tokens.color.lineSoft}`,
                background: tokens.color.ivoryCard, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tokens.color.inkMute, fontSize: 14,
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoom(100)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${tokens.color.lineSoft}`,
                background: tokens.color.ivoryCard, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tokens.color.inkMute,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </CanvasSurface>
  );

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <aside style={{
        width: 280, minWidth: 280,
        borderRight: `1px solid ${tokens.color.lineSoft}`,
        background: tokens.color.ivoryPaper,
        overflowY: 'auto', padding: 16,
      }}>
        {leftRail}
      </aside>
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {canvas}
      </main>
      <aside style={{
        width: 340, minWidth: 340,
        borderLeft: `1px solid ${tokens.color.lineSoft}`,
        background: tokens.color.ivoryPaper,
        overflowY: 'auto', padding: 16,
      }}>
        {rightRail}
      </aside>
    </div>
  );
}
