"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { tokens } from "../design-tokens";
import { CanvasSurface } from "../CanvasSurface";
import { SectionHead, Em, Gold, Eyebrow } from "../SectionHead";
import { PullQuote } from "../PullQuote";

/* ── Types ─────────────────────────── */
interface Principle {
  num: string;
  name: string;
  leftAnchor: string;
  rightAnchor: string;
  positions: Record<string, number>;
}

interface Framework {
  id: string;
  name: string;
  year: string;
  origin: string;
  description: string;
  principles: Principle[];
}

interface Comparator {
  id: string;
  name: string;
  color: string;
  style: 'solid' | 'dashed';
  visible: boolean;
}

const FIT_COLORS: Record<string, string> = {
  Strong: tokens.color.green,
  Partial: tokens.color.gold,
  Poor: tokens.color.danger,
};

/* ── Seed Data ─────────────────────── */
const KATES_KESLER: Framework = {
  id: 'kates-kesler',
  name: 'Kates-Kesler 10 Principles',
  year: '2011',
  origin: 'Accenture',
  description: 'Ten directional principles spanning strategy, accountability, design orientation, capability location, decision geography, layers, functions, shared services, governance, and culture.',
  principles: [
    { num: "01", name: "Strategic Clarity",    leftAnchor: "Ambiguous, brand-by-brand",     rightAnchor: "One shared enterprise thesis", positions: { current: 0.20, future: 0.88, market: 0.62, custom: 0.70 } },
    { num: "02", name: "Accountability",       leftAnchor: "Shared, diffused ownership",     rightAnchor: "Single-threaded owners",        positions: { current: 0.15, future: 0.65, market: 0.88, custom: 0.80 } },
    { num: "03", name: "Design Orientation",   leftAnchor: "Inside-out, product-led",        rightAnchor: "Outside-in, customer-led",      positions: { current: 0.28, future: 0.78, market: 0.70, custom: 0.75 } },
    { num: "04", name: "Capability Location",  leftAnchor: "Distributed across brands",      rightAnchor: "Concentrated at center",        positions: { current: 0.20, future: 0.72, market: 0.55, custom: 0.62 } },
    { num: "05", name: "Decision Geography",   leftAnchor: "Global, centralized",            rightAnchor: "Regional, near-market",         positions: { current: 0.25, future: 0.90, market: 0.58, custom: 0.60 } },
    { num: "06", name: "Layer Economy",        leftAnchor: "Deep hierarchy, many layers",    rightAnchor: "Flat, few layers",              positions: { current: 0.22, future: 0.80, market: 0.62, custom: 0.70 } },
    { num: "07", name: "Functional Posture",   leftAnchor: "Functions as policy police",     rightAnchor: "Functions as expert partners",  positions: { current: 0.45, future: 0.78, market: 0.68, custom: 0.80 } },
    { num: "08", name: "Shared Services",      leftAnchor: "Duplicated in each BU",          rightAnchor: "Consolidated, scaled",          positions: { current: 0.25, future: 0.48, market: 0.72, custom: 0.78 } },
    { num: "09", name: "Governance Speed",     leftAnchor: "Bureaucratic, gated",            rightAnchor: "Tiered, stakes-matched",        positions: { current: 0.25, future: 0.74, market: 0.60, custom: 0.58 } },
    { num: "10", name: "Culture Congruence",   leftAnchor: "Design fights the culture",      rightAnchor: "Design reinforces the culture", positions: { current: 0.40, future: 0.80, market: 0.55, custom: 0.66 } },
  ],
};

const FRAMEWORKS: { id: string; name: string; year: string; meta: string }[] = [
  { id: 'galbraith', name: 'Galbraith Star Model', year: "'77", meta: '5 dims · Galbraith · 1977' },
  { id: 'kates-kesler', name: 'Kates-Kesler 10 Principles', year: "'11", meta: '10 dims · Accenture · 2011' },
  { id: 'mckinsey-7s', name: 'McKinsey 7S', year: "'80", meta: '7 dims · McKinsey · 1980' },
  { id: 'weisbord', name: 'Weisbord Six-Box', year: "'76", meta: '6 dims · Weisbord · 1976' },
  { id: 'nadler-tushman', name: 'Nadler-Tushman Congruence', year: "'80", meta: '4 dims · Nadler · 1980' },
  { id: 'burke-litwin', name: 'Burke-Litwin Causal', year: "'92", meta: '12 dims · Burke-Litwin · 1992' },
  { id: 'stanford', name: 'Stanford Fit-for-Purpose', year: "'05", meta: '5 dims · Stanford · 2005' },
  { id: 'holbeche', name: 'Holbeche Agile Org', year: "'15", meta: '6 dims · Holbeche · 2015' },
  { id: 'takara-custom', name: 'Takara Tomy Custom', year: 'active', meta: 'Custom · Active engagement' },
];

const ARCHETYPES = [
  { id: 'functional', name: 'Functional', sub: 'Grouped by expertise', fit: 'Partial' },
  { id: 'regional-holding', name: 'Regional Holding', sub: 'P&L by geography', fit: 'Strong' },
  { id: 'front-back', name: 'Front-Back', sub: 'Customer-facing / ops', fit: 'Partial' },
  { id: 'matrix', name: 'Matrix', sub: 'Dual reporting', fit: 'Poor' },
  { id: 'product-divisional', name: 'Product Divisional', sub: 'Product-line P&L', fit: 'Poor' },
  { id: 'ambidextrous', name: 'Ambidextrous', sub: 'Explore + exploit', fit: 'Partial' },
  { id: 'platform', name: 'Platform', sub: 'Shared platform teams', fit: 'Partial' },
];

const DEFAULT_COMPARATORS: Comparator[] = [
  { id: 'current', name: 'Current State', color: tokens.color.navy, style: 'solid', visible: true },
  { id: 'future', name: 'Future State', color: tokens.color.blue, style: 'solid', visible: true },
  { id: 'market', name: 'Toy Industry Median', color: tokens.color.gold, style: 'dashed', visible: true },
  { id: 'custom', name: 'Mattel (peer)', color: tokens.color.orange, style: 'solid', visible: true },
];

/* ── Draggable Dot ─────────────────── */
function DotOnTrack({
  position, color, style: dotStyle, name, onDrag,
}: {
  position: number; color: string; style: 'solid' | 'dashed'; name: string;
  onDrag?: (newPos: number) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onDrag) return;
    e.preventDefault();
    setDragging(true);
    const track = (e.currentTarget as HTMLElement).parentElement;
    if (track) trackRef.current = track;

    const handleMove = (ev: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      onDrag(pct);
    };
    const handleUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [onDrag]);

  const isDashed = dotStyle === 'dashed';

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'absolute',
        left: `${position * 100}%`,
        top: '50%',
        transform: `translate(-50%, -50%) scale(${dragging ? 1.3 : hovering ? 1.25 : 1})`,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: isDashed ? 'transparent' : color,
        border: isDashed ? `1.5px dashed ${color}` : 'none',
        cursor: onDrag ? (dragging ? 'grabbing' : 'grab') : 'default',
        zIndex: dragging ? 20 : hovering ? 10 : 5,
        boxShadow: hovering || dragging
          ? `0 0 0 ${dragging ? 8 : 6}px ${color}22`
          : 'none',
        transition: dragging ? 'none' : `transform ${tokens.motion.fast} ${tokens.motion.ease}, box-shadow ${tokens.motion.fast} ${tokens.motion.ease}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDashed && <span style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />}

      {/* Tooltip */}
      {hovering && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          padding: '3px 8px',
          borderRadius: 4,
          background: tokens.color.navy,
          color: tokens.color.ivory,
          fontSize: 9.5,
          fontFamily: tokens.font.body,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {name}
        </div>
      )}
    </div>
  );
}

/* ── Principle Row ─────────────────── */
function PrincipleRow({
  principle, comparators, onPositionChange, onNameChange,
}: {
  principle: Principle;
  comparators: Comparator[];
  onPositionChange: (comparatorId: string, newPos: number) => void;
  onNameChange: (newName: string) => void;
}) {
  const currentPos = principle.positions.current ?? 0;
  const futurePos = principle.positions.future ?? 0;
  const deltaLeft = Math.min(currentPos, futurePos);
  const deltaRight = Math.max(currentPos, futurePos);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      gap: 16,
      padding: '14px 0',
      borderBottom: `1px solid ${tokens.color.lineFaint}`,
    }}>
      {/* Label column */}
      <div style={{ paddingTop: 4 }}>
        <div style={{
          fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em',
          color: tokens.color.inkFaint, marginBottom: 2,
        }}>
          P{principle.num}
        </div>
        <input
          type="text"
          value={principle.name}
          onChange={(e) => onNameChange(e.target.value)}
          style={{
            fontFamily: tokens.font.body, fontSize: 13, fontWeight: 500,
            color: tokens.color.ink, background: 'transparent',
            border: 'none', borderBottom: '1px dashed transparent',
            padding: 0, width: '100%', outline: 'none',
            transition: `border-color ${tokens.motion.fast} ${tokens.motion.ease}`,
          }}
          onFocus={(e) => e.currentTarget.style.borderBottomColor = tokens.color.lineSoft}
          onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
        />
      </div>

      {/* Plot column */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Left anchor */}
        <div style={{
          width: 110, textAlign: 'right', fontFamily: tokens.font.display,
          fontStyle: 'italic', fontWeight: 400, fontSize: 11.5,
          color: tokens.color.inkSoft, lineHeight: 1.3,
        }}>
          {principle.leftAnchor}
        </div>

        {/* Track */}
        <div style={{
          flex: 1, height: 34, position: 'relative',
          display: 'flex', alignItems: 'center',
        }}>
          {/* Dashed center line */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: 0, borderTop: `1px dashed ${tokens.color.lineSoft}`,
          }} />

          {/* Center tick */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1, height: 10, background: tokens.color.lineSoft,
          }} />

          {/* Delta arrow */}
          <div style={{
            position: 'absolute',
            left: `${deltaLeft * 100}%`,
            width: `${(deltaRight - deltaLeft) * 100}%`,
            height: 2,
            top: '50%',
            transform: 'translateY(-50%)',
            background: `linear-gradient(90deg, ${tokens.color.navy}, ${tokens.color.blue})`,
            opacity: 0.28,
            borderRadius: 1,
            zIndex: 1,
          }} />

          {/* Dots */}
          {comparators.filter(c => c.visible).map((c) => (
            <DotOnTrack
              key={c.id}
              position={principle.positions[c.id] ?? 0.5}
              color={c.color}
              style={c.style}
              name={c.name}
              onDrag={(pos) => onPositionChange(c.id, pos)}
            />
          ))}
        </div>

        {/* Right anchor */}
        <div style={{
          width: 110, textAlign: 'left', fontFamily: tokens.font.display,
          fontStyle: 'italic', fontWeight: 400, fontSize: 11.5,
          color: tokens.color.inkSoft, lineHeight: 1.3,
        }}>
          {principle.rightAnchor}
        </div>
      </div>
    </div>
  );
}

/* ── Auto-Generated Insights ───────── */
const INSIGHTS = [
  {
    type: 'gap',
    tag: 'Widest distance · Future vs. Market',
    title: 'Shared Services lags the market',
    note: 'Future state (0.48) sits well below the toy-industry median (0.72). The brand-by-brand duplication is only half resolved — consider accelerating the HR and Finance SSC consolidation.',
    borderColor: tokens.color.danger,
    tagColor: tokens.color.danger,
  },
  {
    type: 'lead',
    tag: 'Direction leadership',
    title: 'Decision Geography leads the pack',
    note: 'At 0.90 future vs. 0.58 market, the regional near-market design is more aggressive than any peer. Validate with regional MDs that local decision authority is matched by local capability.',
    borderColor: tokens.color.green,
    tagColor: tokens.color.green,
  },
  {
    type: 'watch',
    tag: 'Watch item',
    title: 'Accountability gap vs. peer',
    note: 'Mattel scores 0.80 on single-threaded accountability. Takara Tomy future is at 0.65. The regional P&L model helps, but shared-service escalation paths need RACI clarity.',
    borderColor: tokens.color.gold,
    tagColor: tokens.color.gold,
  },
];

/* ── Main Principles Tab ───────────── */
export function PrinciplesTab() {
  const [activeFramework, setActiveFramework] = useState('kates-kesler');
  const [frameworkOpen, setFrameworkOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dot' | 'radar' | 'slope'>('dot');
  const [selectedArchetype, setSelectedArchetype] = useState('regional-holding');
  const [comparators, setComparators] = useState<Comparator[]>(DEFAULT_COMPARATORS);
  const [principles, setPrinciples] = useState<Principle[]>(KATES_KESLER.principles);

  const handlePositionChange = useCallback((principleNum: string, comparatorId: string, newPos: number) => {
    setPrinciples(prev => prev.map(p =>
      p.num === principleNum
        ? { ...p, positions: { ...p.positions, [comparatorId]: Math.round(newPos * 100) / 100 } }
        : p
    ));
  }, []);

  const handleNameChange = useCallback((principleNum: string, newName: string) => {
    setPrinciples(prev => prev.map(p =>
      p.num === principleNum ? { ...p, name: newName } : p
    ));
  }, []);

  const toggleComparator = useCallback((id: string) => {
    setComparators(prev => prev.map(c =>
      c.id === id ? { ...c, visible: !c.visible } : c
    ));
  }, []);

  const renameComparator = useCallback((id: string, name: string) => {
    setComparators(prev => prev.map(c =>
      c.id === id ? { ...c, name } : c
    ));
  }, []);

  const handleTrackDoubleClick = useCallback((principleNum: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handlePositionChange(principleNum, 'future', pct);
  }, [handlePositionChange]);

  const activeFrameworkMeta = FRAMEWORKS.find(f => f.id === activeFramework);

  /* ── Left Rail ──────────────────── */
  const leftRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Framework picker */}
      <div>
        <Eyebrow>Framework</Eyebrow>
        <div
          onClick={() => setFrameworkOpen(!frameworkOpen)}
          style={{
            marginTop: 8,
            padding: 12,
            background: tokens.color.ivoryCard,
            border: `1px solid ${tokens.color.line}`,
            borderLeft: `3px solid ${tokens.color.orange}`,
            borderRadius: '0 9px 9px 0',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontFamily: tokens.font.display, fontSize: 15, fontWeight: 450, color: tokens.color.ink }}>
              {activeFrameworkMeta?.name}
            </div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.06em', color: tokens.color.inkMute, marginTop: 2 }}>
              {activeFrameworkMeta?.meta}
            </div>
          </div>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={tokens.color.inkMute} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: frameworkOpen ? 'rotate(180deg)' : 'none', transition: `transform ${tokens.motion.fast} ${tokens.motion.ease}` }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {frameworkOpen && (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                onClick={() => { setActiveFramework(fw.id); setFrameworkOpen(false); }}
                style={{
                  padding: '8px 10px',
                  background: fw.id === activeFramework ? tokens.color.ivoryDeep : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  ...(fw.id === 'takara-custom' ? { background: tokens.color.orangeWash } : {}),
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 500, color: tokens.color.ink,
                  ...(fw.id === 'takara-custom' ? { fontFamily: tokens.font.display, fontStyle: 'italic' } : {}),
                }}>
                  {fw.name}
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, marginTop: 1 }}>
                  {fw.meta}
                </div>
              </button>
            ))}
            <button style={{
              padding: '8px 10px', border: 'none', borderTop: `1px dashed ${tokens.color.lineSoft}`,
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              fontSize: 12, color: tokens.color.inkSoft, marginTop: 4,
            }}>
              + Build new framework
            </button>
          </div>
        )}
      </div>

      {/* View Mode toggle */}
      <div>
        <Eyebrow>View Mode</Eyebrow>
        <div style={{ display: 'flex', marginTop: 8, background: tokens.color.ivoryDeep, borderRadius: 8, padding: 3 }}>
          {(['dot', 'radar', 'slope'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
                fontFamily: tokens.font.body, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === m ? tokens.color.navy : 'transparent',
                color: viewMode === m ? tokens.color.ivory : tokens.color.inkMute,
                transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
              }}
            >
              {m === 'dot' ? 'Dot Plot' : m === 'radar' ? 'Radar' : 'Slope'}
            </button>
          ))}
        </div>
      </div>

      {/* Comparators */}
      <div>
        <Eyebrow>Comparators</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {comparators.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => toggleComparator(c.id)}
                style={{
                  width: 14, height: 14, borderRadius: c.style === 'dashed' ? '50%' : 3,
                  border: c.visible ? 'none' : `1.5px solid ${tokens.color.lineSoft}`,
                  background: c.visible ? c.color : 'transparent',
                  cursor: 'pointer', flexShrink: 0,
                  ...(c.style === 'dashed' && c.visible ? {
                    background: 'transparent',
                    border: `1.5px dashed ${c.color}`,
                  } : {}),
                }}
              />
              {c.id === 'market' || c.id === 'custom' ? (
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => renameComparator(c.id, e.target.value)}
                  style={{
                    flex: 1, fontSize: 12, fontWeight: 500, color: tokens.color.ink,
                    background: 'transparent', border: 'none', padding: 0, outline: 'none',
                    borderBottom: '1px dashed transparent',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = tokens.color.lineSoft}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: tokens.color.ink }}>{c.name}</span>
              )}
            </div>
          ))}
          <button style={{
            fontSize: 11, color: tokens.color.inkSoft, background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', padding: '4px 0',
          }}>
            + Add
          </button>
        </div>
      </div>

      {/* Target Archetype */}
      <div>
        <Eyebrow>Target Archetype</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 10 }}>
          {ARCHETYPES.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArchetype(a.id)}
              style={{
                padding: 8, borderRadius: 7, border: 'none', cursor: 'pointer',
                textAlign: 'left', position: 'relative',
                background: selectedArchetype === a.id ? tokens.color.orangeWash : tokens.color.ivoryCard,
                outline: selectedArchetype === a.id ? `1px solid ${tokens.color.orange}` : `1px solid ${tokens.color.lineFaint}`,
              }}
            >
              {selectedArchetype === a.id && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: tokens.color.orange }} />
              )}
              <div style={{ fontFamily: tokens.font.display, fontSize: 12, fontWeight: 450, color: tokens.color.ink }}>{a.name}</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, marginTop: 1 }}>{a.sub}</div>
              <div style={{
                fontFamily: tokens.font.mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.06em', marginTop: 3,
                color: FIT_COLORS[a.fit] || tokens.color.inkMute,
              }}>
                {a.fit}
              </div>
            </button>
          ))}
          <button style={{
            padding: 8, borderRadius: 7, border: `1px dashed ${tokens.color.lineSoft}`,
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: tokens.color.inkSoft }}>+ Custom</div>
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Right Rail ─────────────────── */
  const rightRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Benchmark Source */}
      <div style={{
        background: tokens.color.ivoryCard, border: `1px solid ${tokens.color.line}`, borderRadius: 9, padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Eyebrow>Market Data</Eyebrow>
          <span style={{
            fontFamily: tokens.font.mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.08em',
            padding: '1px 5px', borderRadius: 3, background: tokens.color.gold + '22', color: tokens.color.gold,
          }}>SEED</span>
        </div>
        <div style={{ fontFamily: tokens.font.display, fontSize: 15, fontWeight: 450, color: tokens.color.ink, marginBottom: 4 }}>
          Toy Industry Median
        </div>
        <p style={{ fontSize: 11, color: tokens.color.inkSoft, lineHeight: 1.5, margin: '0 0 12px' }}>
          Illustrative sandbox data &middot; n=14 peer set &middot; Hasbro, Mattel, LEGO, MGA, Spin Master, Ravensburger, Bandai Namco, and 7 others.
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{
            flex: 1, padding: '6px 0', borderRadius: 6, border: `1px solid ${tokens.color.line}`,
            background: tokens.color.ivoryPaper, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            color: tokens.color.ink,
          }}>Upload CSV</button>
          <button style={{
            flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
            background: 'linear-gradient(135deg, #001F52, #0B41AD)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            color: '#fff',
          }}>Mercer DB</button>
        </div>
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 6,
          border: `1px dashed ${tokens.color.orange}`, background: tokens.color.orangeWash + '44',
        }}>
          <p style={{ fontSize: 10, color: tokens.color.inkSoft, margin: 0, lineHeight: 1.4 }}>
            The Mercer DB connector will pull principle benchmarks filtered by industry, size, region, and ownership structure. Planned for v0.5.
          </p>
        </div>
      </div>

      {/* Auto-Generated Insights */}
      {INSIGHTS.map((ins) => (
        <div
          key={ins.type}
          style={{
            borderLeft: `3px solid ${ins.borderColor}`,
            padding: '10px 12px',
            borderRadius: '0 7px 7px 0',
            background: tokens.color.ivoryCard,
          }}
        >
          <span style={{
            fontFamily: tokens.font.mono, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: ins.tagColor,
          }}>
            {ins.tag}
          </span>
          <div style={{
            fontFamily: tokens.font.display, fontSize: 14, fontWeight: 450,
            color: tokens.color.ink, margin: '6px 0 4px', lineHeight: 1.3,
          }}>
            {ins.title}
          </div>
          <p style={{ fontSize: 11, color: tokens.color.inkSoft, lineHeight: 1.5, margin: 0 }}>
            {ins.note}
          </p>
        </div>
      ))}

      {/* Design Philosophy */}
      <div>
        <Eyebrow>Design Philosophy</Eyebrow>
        <h3 style={{
          fontFamily: tokens.font.display, fontWeight: 450, fontSize: 15,
          color: tokens.color.ink, margin: '10px 0 8px', lineHeight: 1.3,
        }}>
          Principles as <em style={{ fontStyle: 'italic', color: tokens.color.orange }}>directional spectra</em>
        </h3>
        <p style={{ fontSize: 12, color: tokens.color.inkSoft, lineHeight: 1.6, margin: '0 0 12px' }}>
          Each principle represents a directional choice between two legitimate organizing ideas.
          There is no universally correct position &mdash; the right answer depends on strategy,
          industry context, and organizational maturity.
        </p>
        <PullQuote attribution="— Kates & Kesler, Bridging Organization Design and Performance">
          The best designs are not optimal in any single dimension &mdash; they are coherent across all of them.
        </PullQuote>
      </div>

      {/* Framework Library */}
      <div>
        <Eyebrow>Framework Library</Eyebrow>
        <p style={{ fontSize: 11.5, color: tokens.color.inkSoft, lineHeight: 1.5, marginTop: 8 }}>
          Nine built-in frameworks plus custom-built options. Switch between them using the framework picker
          in the left rail. Principle names, anchors, and positions are fully editable.
        </p>
      </div>
    </div>
  );

  /* ── Canvas ─────────────────────── */
  const canvas = (
    <CanvasSurface>
      <div style={{ padding: '32px 40px' }}>
        {/* Editorial header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ maxWidth: 600 }}>
            <Eyebrow>Design Principles &middot; Comparator</Eyebrow>
            <h1 style={{
              fontFamily: tokens.font.display, fontWeight: 300, fontSize: 26,
              letterSpacing: '-0.02em', color: tokens.color.ink, margin: '8px 0 0', lineHeight: 1.2,
            }}>
              Where we <Em>stand</Em>, where we&apos;re <Em>going</Em>, where the <Gold>market</Gold> is.
            </h1>
            <p style={{ fontSize: 13, color: tokens.color.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
              Each principle is a directional spectrum between two organizing ideas. Drag any dot to reposition.
            </p>
          </div>

          {/* Legend */}
          <div style={{
            padding: '8px 14px', borderRadius: 9,
            background: tokens.color.ivoryCard, border: `1px solid ${tokens.color.line}`,
            display: 'flex', gap: 12,
          }}>
            {comparators.filter(c => c.visible).map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: c.style === 'dashed' ? 'transparent' : c.color,
                  border: c.style === 'dashed' ? `1.5px dashed ${c.color}` : 'none',
                }} />
                <span style={{ fontSize: 10, color: tokens.color.inkSoft }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Framework panel */}
        <div style={{
          background: tokens.color.ivoryPaper,
          border: `1px solid ${tokens.color.lineSoft}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Framework header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${tokens.color.lineFaint}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: tokens.font.display, fontSize: 17, fontWeight: 400, color: tokens.color.ink }}>
                {activeFrameworkMeta?.name}
              </div>
              <p style={{ fontSize: 12, color: tokens.color.inkSoft, margin: '4px 0 0', maxWidth: 500 }}>
                {KATES_KESLER.description}
              </p>
            </div>
            <span style={{
              fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: tokens.color.inkMute,
            }}>
              10 Principles &middot; Directional Spectrum
            </span>
          </div>

          {/* Principle rows */}
          <div style={{ padding: '0 24px' }}>
            {principles.map((p) => (
              <PrincipleRow
                key={p.num}
                principle={p}
                comparators={comparators}
                onPositionChange={(cId, pos) => handlePositionChange(p.num, cId, pos)}
                onNameChange={(name) => handleNameChange(p.num, name)}
              />
            ))}
          </div>
        </div>

        {/* Radar/Slope empty states */}
        {viewMode !== 'dot' && (
          <div style={{
            marginTop: 24, padding: '40px 24px', textAlign: 'center',
            background: tokens.color.ivoryCard, border: `1px dashed ${tokens.color.lineSoft}`,
            borderRadius: 12,
          }}>
            <div style={{ fontFamily: tokens.font.display, fontSize: 18, fontWeight: 300, color: tokens.color.inkMute }}>
              {viewMode === 'radar' ? 'Radar' : 'Slope'} view
            </div>
            <p style={{ fontSize: 12, color: tokens.color.inkFaint, marginTop: 6 }}>
              Coming in next release. The dot plot remains the primary calibration interface.
            </p>
          </div>
        )}
      </div>
    </CanvasSurface>
  );

  return { leftRail, rightRail, canvas };
}
