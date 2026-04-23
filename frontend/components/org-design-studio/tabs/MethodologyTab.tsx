"use client";
import React, { useState, useRef, useCallback } from "react";
import { tokens } from "../design-tokens";
import { CanvasSurface } from "../CanvasSurface";
import { SectionHead, Em, Gold, Eyebrow } from "../SectionHead";
import { PullQuote } from "../PullQuote";
import { RoleNode } from "../RoleNode";
import { TERRITORIES, getCapabilityStats, type Feature, type Territory } from "@/data/methodology/capability-map";

const STATUS_CHIP: Record<string, { bg: string; fg: string; border?: string }> = {
  live:    { bg: tokens.color.greenPale, fg: tokens.color.green },
  beta:    { bg: tokens.color.bluePale, fg: tokens.color.blue },
  stub:    { bg: tokens.color.orangePale, fg: tokens.color.orange },
  planned: { bg: tokens.color.ivoryDeep, fg: tokens.color.inkMute, border: `1px dashed ${tokens.color.lineSoft}` },
};

const SUB_NAV = ['Capability Map', 'Engagement-Ready Features', 'Edge Cases & Constraints', 'Platform Foundations'];

const EDGE_CASES = [
  { num: 1, title: 'The 40-principle framework', body: 'Some enterprise HR maturity models have 30+ dimensions. Current row-based plot assumes ~10.', treatment: 'Category grouping + collapsible sections; max 8 visible per pane.' },
  { num: 2, title: 'The non-binary principle', body: "'Hire, buy, borrow, or bot' is four-way \u2014 left-right spectrum breaks.", treatment: 'Quadrant and composition visual modes alongside the spectrum default.' },
  { num: 3, title: 'Greenfield orgs', body: 'No current state to anchor against; newco builds from zero.', treatment: "Disable current-state dots; switch comparators to 'Peer benchmark' and 'Aspiration.'" },
  { num: 4, title: 'Multi-entity holding cos', body: 'Parent + 8 OpCos, each with its own structure and principles.', treatment: 'Entity switcher + parent-level aggregation; nested navigation.' },
  { num: 5, title: 'Non-English workshops', body: 'Global engagements across JP, FR, DE, CN, ES need native-language anchors and framework labels.', treatment: 'i18n from v1; framework + principle libraries translatable.' },
  { num: 6, title: 'Accessibility \u2014 keyboard & SR', body: 'Draggable dots are mouse-only today. Enterprise clients with procurement accessibility requirements will need keyboard and screen-reader support.', treatment: 'Arrow-key nudging, numeric input fallback, ARIA narration.' },
  { num: 7, title: 'Framework switching mid-engagement', body: 'Kates-Kesler \u2192 McKinsey 7S: does calibration survive?', treatment: 'Principle-mapping dictionary; flag unmapped dimensions.' },
  { num: 8, title: 'Mobile executive summary', body: "Execs open engagement links on phones between meetings. A desktop-only lockout feels punishing for read-only browsing.", treatment: "Read-only mobile 'executive summary' view \u2014 no editing." },
  { num: 9, title: 'The benchmark confidence problem', body: 'Market median drawn with same visual weight as calibrated judgment.', treatment: 'Confidence halo on each dot; n= and recency surfaced.' },
];

const PLATFORM_CARDS = [
  { name: 'Version History', desc: "Every change tracked; revert, compare, annotate. 'The March 4 workshop version' always recoverable.", status: 'Planned', version: 'v0.4' },
  { name: 'Multi-Rater Input', desc: 'Each stakeholder places their own calibration. Spread, median, divergence zones made visible.', status: 'Planned', version: 'Shown above' },
  { name: 'AI Design Copilot', desc: "Claude-powered: 'What archetype fits?' 'Draft the change narrative.' 'Critique this structure.'", status: 'v0.5', version: 'Claude API' },
  { name: 'Benchmark Engine', desc: 'Industry, size, region, public/private filters. Long-term: Mercer DB integration.', status: 'Vision', version: 'Mercer partnership' },
  { name: 'Export Studio', desc: 'Frame-perfect PNG/SVG per component; PPTX with Mercer branding; Word narrative docs.', status: 'Planned', version: 'v0.4' },
  { name: 'Commenting & Annotation', desc: 'Threaded comments on any dot, role, decision. @mentions, resolve, audit trail.', status: 'Planned', version: 'v0.5' },
  { name: 'HRIS Integrations', desc: 'Workday, SuccessFactors, Oracle HCM. Bi-directional sync of roles and incumbents.', status: 'Vision', version: 'Enterprise tier' },
  { name: 'Permissions & Audit', desc: 'Engagement-scoped access. Consultant / client / read-only tiers. Full audit log.', status: 'Planned', version: 'v0.4' },
];

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIP[status] || STATUS_CHIP.planned;
  return (
    <span style={{
      fontFamily: tokens.font.mono, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
      background: s.bg, color: s.fg, border: s.border || 'none',
    }}>
      {status}
    </span>
  );
}

function FeatureTile({ feature }: { feature: Feature }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: feature.inUse
        ? `linear-gradient(135deg, ${tokens.color.orangeWash}, ${tokens.color.ivoryPaper})`
        : tokens.color.ivoryPaper,
      borderRadius: 7,
      border: `1px solid ${tokens.color.lineFaint}`,
      position: 'relative',
    }}>
      {feature.inUse && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 6, height: 6, borderRadius: '50%', background: tokens.color.orange,
          boxShadow: `0 0 0 2px ${tokens.color.orangePale}`,
          animation: 'studioPulse 2s ease-in-out infinite',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: tokens.color.ink, flex: 1 }}>
          {feature.name}
        </span>
        <StatusChip status={feature.status} />
      </div>
      <p style={{ fontSize: 10.5, color: tokens.color.inkMute, margin: 0, lineHeight: 1.4 }}>
        {feature.description}
      </p>
      {feature.note && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${tokens.color.lineFaint}`,
          fontSize: 9.5, fontStyle: 'italic', color: tokens.color.danger, lineHeight: 1.4,
        }}>
          <span style={{ color: tokens.color.orange }}>&#9733; </span>{feature.note}
        </div>
      )}
      {feature.inUse && feature.inUseContext && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: `1px solid ${tokens.color.orangePale}`,
          fontFamily: tokens.font.mono, fontSize: 9.5, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.color.orange,
        }}>
          {feature.inUseContext}
        </div>
      )}
    </div>
  );
}

function TerritoryCard({ territory, defaultExpanded }: { territory: Territory; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const liveCount = territory.features.filter(f => f.status === 'live' || f.status === 'beta').length;
  const total = territory.features.length;
  const pct = Math.round((liveCount / total) * 100);

  return (
    <div style={{
      background: tokens.color.ivoryCard,
      border: `1px solid ${tokens.color.line}`,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', background: 'transparent',
          display: 'grid', gridTemplateColumns: '280px 1fr 160px',
          alignItems: 'center', padding: '14px 16px', gap: 16,
          borderLeft: `3px solid ${territory.accentColor}`,
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute }}>
            Territory {territory.num}
          </div>
          <div style={{ fontFamily: tokens.font.display, fontSize: 20, fontWeight: 400, color: tokens.color.ink, marginTop: 2 }}>
            {territory.title.split(territory.titleEmphasis).map((part, i, arr) =>
              i < arr.length - 1
                ? <React.Fragment key={i}>{part}<em style={{ fontStyle: 'italic', color: tokens.color.orange }}>{territory.titleEmphasis}</em></React.Fragment>
                : <React.Fragment key={i}>{part}</React.Fragment>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: tokens.color.inkSoft, lineHeight: 1.5 }}>
          {territory.description}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            width: 140, height: 4, borderRadius: 2,
            background: tokens.color.lineFaint, overflow: 'hidden',
            marginBottom: 4, marginLeft: 'auto',
          }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: territory.accentColor }} />
          </div>
          <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute, letterSpacing: '0.04em' }}>
            {liveCount} / {total} features &middot; {pct}%
          </span>
        </div>
      </button>

      {/* Feature grid */}
      {expanded && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, padding: '1px 16px 16px', background: tokens.color.lineFaint,
        }}>
          {territory.features.map((f) => (
            <FeatureTile key={f.id} feature={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Preview Cards ────────────────── */
function PreviewIncumbent() {
  return (
    <div style={{ padding: 12, background: tokens.color.ivoryPaper, borderRadius: 8 }}>
      <div style={{
        width: '100%', borderRadius: 8,
        border: `1px solid ${tokens.color.line}`,
        overflow: 'hidden', background: tokens.color.ivoryCard,
      }}>
        {/* Teal band */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #2A7A78, #3F9A98)' }} />
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: tokens.color.ink }}>Chief Marketing Officer</div>
          <div style={{ fontSize: 10, color: tokens.color.inkMute, marginTop: 2 }}>New role &middot; Future state &middot; Enterprise</div>
          {/* Person block */}
          <div style={{
            marginTop: 8, padding: 8, background: tokens.color.ivoryWash,
            border: `1px solid ${tokens.color.lineFaint}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `linear-gradient(135deg, ${tokens.color.navy}, ${tokens.color.blue})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: tokens.color.ivory,
              position: 'relative',
            }}>
              MC
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: '50%',
                background: tokens.color.gold, border: `1.5px solid ${tokens.color.ivoryWash}`,
              }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: tokens.color.ink }}>Maya Castellano</div>
              <div style={{ fontSize: 10, color: tokens.color.inkMute }}>Current: VP Brand &middot; Tenure 4.2y</div>
            </div>
          </div>
          {/* Flags */}
          <div style={{
            marginTop: 8, display: 'flex', gap: 8,
            paddingTop: 8, borderTop: `1px dashed ${tokens.color.lineFaint}`,
          }}>
            {[
              { label: 'Ready', value: 'Now', color: tokens.color.green },
              { label: 'Retention', value: 'Medium', color: tokens.color.gold },
              { label: 'Perf', value: 'Exceeds', color: tokens.color.ink },
            ].map((f) => (
              <div key={f.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.color.inkMute }}>{f.label}</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 600, color: f.color, marginTop: 1 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMultiRater() {
  const raters = [
    { name: 'CEO', color: tokens.color.orange, pos1: 28, pos2: 82 },
    { name: 'CFO', color: tokens.color.navy, pos1: 22, pos2: 79 },
    { name: 'CHRO', color: tokens.color.blue, pos1: 35, pos2: 85 },
    { name: 'COO', color: tokens.color.purple, pos1: 48, pos2: 88 },
    { name: 'MD-Americas', color: tokens.color.teal, pos1: 64, pos2: 90 },
  ];

  return (
    <div style={{ padding: 12, background: tokens.color.ivoryPaper, borderRadius: 8 }}>
      {[
        { label: 'Decision Geography \u00b7 Current', spread: '0.42', spreadColor: tokens.color.danger, minPos: 22, maxPos: 64, median: 37, raterKey: 'pos1' as const },
        { label: 'Decision Geography \u00b7 Future', spread: '0.12', spreadColor: tokens.color.green, minPos: 78, maxPos: 90, median: 85, raterKey: 'pos2' as const },
      ].map((row) => (
        <div key={row.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: tokens.color.ink }}>{row.label}</span>
            <span style={{ fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 600, color: row.spreadColor }}>
              spread {row.spread} {row.raterKey === 'pos2' ? '\u2193' : ''}
            </span>
          </div>
          <div style={{ position: 'relative', height: 22, background: tokens.color.ivoryCard, borderRadius: 4, border: `1px solid ${tokens.color.lineFaint}` }}>
            {/* Range band */}
            <div style={{
              position: 'absolute', left: `${row.minPos}%`, width: `${row.maxPos - row.minPos}%`,
              top: 4, bottom: 4, background: tokens.color.lineSoft, borderRadius: 2, opacity: 0.5,
            }} />
            {/* Median tick */}
            <div style={{
              position: 'absolute', left: `${row.median}%`, top: 2, bottom: 2,
              width: 2, background: tokens.color.navy, borderRadius: 1,
            }} />
            {/* Dots */}
            {raters.map((r) => (
              <div key={r.name} style={{
                position: 'absolute', left: `${r[row.raterKey]}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10, borderRadius: '50%', background: r.color,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: tokens.font.display, fontStyle: 'italic', fontSize: 10, color: tokens.color.inkMute }}>Global, centralized</span>
            <span style={{ fontFamily: tokens.font.display, fontStyle: 'italic', fontSize: 10, color: tokens.color.inkMute }}>Regional, near-market</span>
          </div>
        </div>
      ))}
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        {raters.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
            <span style={{ fontSize: 9, color: tokens.color.inkMute }}>{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewLinkedEvidence() {
  const evidence = [
    { icon: '+', color: tokens.color.orange, title: 'MD Americas', sub: 'New regional P&L owner' },
    { icon: '+', color: tokens.color.orange, title: 'MD Europe', sub: 'New regional P&L owner' },
    { icon: '\u25C7', color: tokens.color.blue, title: 'COO scope narrowed', sub: 'Pure ops, no brand P&L' },
    { icon: '+', color: tokens.color.orange, title: 'MD Australia & NZ', sub: 'New market entry' },
  ];

  return (
    <div style={{ padding: 12, background: tokens.color.ivoryPaper, borderRadius: 8 }}>
      {/* Top card */}
      <div style={{
        padding: 10, background: tokens.color.orangeWash, border: `1px solid ${tokens.color.orange}`,
        borderRadius: 7,
      }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.color.orange }}>
          Principle &middot; Future state
        </div>
        <div style={{ fontFamily: tokens.font.display, fontSize: 14, fontWeight: 450, color: tokens.color.ink, marginTop: 4 }}>
          Decision Geography
        </div>
        <div style={{ fontSize: 10.5, fontStyle: 'italic', color: tokens.color.inkSoft, marginTop: 2 }}>
          Why it sits at &lsquo;Regional, near-market&rsquo;:
        </div>
      </div>
      {/* Connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: tokens.color.orange }} />
        <div style={{ width: 1, height: 14, background: tokens.color.orange }} />
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: tokens.color.orange }} />
      </div>
      {/* Evidence rows */}
      {evidence.map((e, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
          borderBottom: i < evidence.length - 1 ? `1px solid ${tokens.color.lineFaint}` : 'none',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: e.color + '22', color: e.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {e.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: tokens.color.ink }}>{e.title}</div>
            <div style={{ fontSize: 10, color: tokens.color.inkMute }}>{e.sub}</div>
          </div>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={tokens.color.inkFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ── Main Methodology Tab ──────────── */
export function MethodologyTab() {
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stats = getCapabilityStats();

  const scrollToSection = useCallback((idx: number) => {
    setActiveSection(idx);
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <CanvasSurface>
      {/* Sub-nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '8px 56px',
        background: 'rgba(239, 233, 217, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${tokens.color.lineFaint}`,
        display: 'flex', gap: 4,
      }}>
        {SUB_NAV.map((label, i) => (
          <button
            key={label}
            onClick={() => scrollToSection(i)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: activeSection === i ? 700 : 500,
              fontFamily: tokens.font.body,
              background: activeSection === i ? tokens.color.navy : 'transparent',
              color: activeSection === i ? tokens.color.ivory : tokens.color.inkMute,
              transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 56px 80px' }}>
        {/* Section A: Hero */}
        <div ref={el => { sectionRefs.current[0] = el; }} style={{ paddingTop: 56 }}>
          <Eyebrow>Methodology &middot; Capability Map &middot; Engagement Progress</Eyebrow>
          <h1 style={{
            fontFamily: tokens.font.display, fontWeight: 300, fontSize: 40,
            letterSpacing: '-0.025em', color: tokens.color.ink, margin: '12px 0 0', lineHeight: 1.15,
          }}>
            The <Em>full method</Em> &mdash; what the studio covers, <Gold>what you&apos;ve used</Gold> on this engagement, what&apos;s next.
          </h1>
          <p style={{ fontSize: 14, color: tokens.color.inkSoft, marginTop: 12, maxWidth: 700, lineHeight: 1.6 }}>
            This view is a reference, a checklist, and a scoping tool for the current engagement. It maps every
            capability the studio offers across six territories of organizational design practice.
          </p>

          {/* Stat strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            borderTop: `1px solid ${tokens.color.line}`, marginTop: 28, paddingTop: 20,
          }}>
            {[
              { label: 'Capability Territories', value: String(stats.territories), highlight: true },
              { label: 'Features Mapped', value: String(stats.total) },
              { label: 'Available Today', value: String(stats.live) },
              { label: 'Used This Engagement', value: String(stats.inUse), highlight: true },
              { label: 'On the Roadmap', value: String(stats.planned) },
            ].map((s) => (
              <div key={s.label}>
                <div style={{
                  fontFamily: tokens.font.display,
                  fontSize: 32, fontWeight: 300,
                  color: tokens.color.ink,
                  ...(s.highlight ? { fontStyle: 'italic', color: tokens.color.orange } : {}),
                }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute, marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Capability Map */}
        <div ref={el => { sectionRefs.current[0] = el; }} style={{ marginTop: 56 }}>
          <SectionHead
            eyebrow="Capability Map"
            headline={<>Six <Em>territories</Em> span the discipline &mdash; <Gold>track where you are</Gold>.</>}
            support="Each territory contains the features that make up a complete org design engagement. The orange dot marks features active on the current engagement."
          />

          {TERRITORIES.map((t, i) => (
            <TerritoryCard key={t.id} territory={t} defaultExpanded={i === 2} />
          ))}
        </div>

        {/* Section C: Engagement-Ready Features */}
        <div ref={el => { sectionRefs.current[1] = el; }} style={{ marginTop: 56 }}>
          <SectionHead
            eyebrow="Engagement-Ready Features &middot; Preview"
            headline={<>Three <Em>next-up</Em> features in <Gold>active preview</Gold>.</>}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {/* Preview 1: Incumbent Layer */}
            <div style={{ background: tokens.color.ivoryCard, border: `1px solid ${tokens.color.line}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tokens.color.lineFaint}` }}>
                <div style={{
                  fontFamily: tokens.font.display, fontStyle: 'italic', fontWeight: 300, fontSize: 14,
                  color: tokens.color.ink, borderLeft: `2px solid ${tokens.color.orange}`, paddingLeft: 12, lineHeight: 1.5,
                }}>
                  People data layered onto the org chart. &lsquo;Who sits in this seat today, and are they ready for where they&apos;re going?&rsquo;
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute, marginTop: 6 }}>
                  Feature preview &middot; Structure tab
                </div>
              </div>
              <PreviewIncumbent />
            </div>

            {/* Preview 2: Multi-Rater Mode */}
            <div style={{ background: tokens.color.ivoryCard, border: `1px solid ${tokens.color.line}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tokens.color.lineFaint}` }}>
                <div style={{
                  fontFamily: tokens.font.display, fontStyle: 'italic', fontWeight: 300, fontSize: 14,
                  color: tokens.color.ink, borderLeft: `2px solid ${tokens.color.orange}`, paddingLeft: 12, lineHeight: 1.5,
                }}>
                  Stakeholder-by-stakeholder calibration on the same principle. Spread shrinks as alignment builds &mdash; and the narrowing itself is the story.
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute, marginTop: 6 }}>
                  Feature preview &middot; Principles tab
                </div>
              </div>
              <PreviewMultiRater />
            </div>

            {/* Preview 3: Linked Evidence */}
            <div style={{ background: tokens.color.ivoryCard, border: `1px solid ${tokens.color.line}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tokens.color.lineFaint}` }}>
                <div style={{
                  fontFamily: tokens.font.display, fontStyle: 'italic', fontWeight: 300, fontSize: 14,
                  color: tokens.color.ink, borderLeft: `2px solid ${tokens.color.orange}`, paddingLeft: 12, lineHeight: 1.5,
                }}>
                  Every principle dot links to the structural moves, operating-model shifts, and governance changes that justify its position.
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute, marginTop: 6 }}>
                  Feature preview &middot; Cross-tab
                </div>
              </div>
              <PreviewLinkedEvidence />
            </div>
          </div>
        </div>

        {/* Section D: Edge Cases & Constraints */}
        <div ref={el => { sectionRefs.current[2] = el; }} style={{ marginTop: 56 }}>
          <SectionHead
            eyebrow="Edge Cases & Constraints"
            headline={<>What the <Em>method</Em> needs to handle.</>}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {EDGE_CASES.map((ec) => (
              <div key={ec.num} style={{
                background: tokens.color.ivoryCard,
                border: `1px solid ${tokens.color.line}`,
                borderTop: `3px solid ${tokens.color.gold}`,
                borderRadius: '0 0 9px 9px',
                padding: '14px 16px',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: 8, right: 12,
                  fontFamily: tokens.font.display, fontStyle: 'italic',
                  fontSize: 28, fontWeight: 300, color: tokens.color.lineSoft,
                }}>
                  {ec.num}
                </span>
                <h5 style={{
                  fontFamily: tokens.font.display, fontSize: 14, fontWeight: 450,
                  color: tokens.color.ink, margin: '0 0 6px', lineHeight: 1.3,
                }}>
                  {ec.title}
                </h5>
                <p style={{ fontSize: 11, color: tokens.color.inkSoft, lineHeight: 1.5, margin: '0 0 10px' }}>
                  {ec.body}
                </p>
                <div style={{ borderTop: `1px dashed ${tokens.color.lineFaint}`, paddingTop: 8 }}>
                  <span style={{
                    fontFamily: tokens.font.mono, fontSize: 8.5, fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: tokens.color.gold,
                  }}>
                    Treatment
                  </span>
                  <p style={{ fontSize: 10.5, color: tokens.color.inkSoft, lineHeight: 1.4, margin: '4px 0 0' }}>
                    {ec.treatment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section E: Platform Foundations */}
        <div ref={el => { sectionRefs.current[3] = el; }} style={{ marginTop: 56 }}>
          <SectionHead
            eyebrow="Platform Foundations"
            headline={<>The <Em>connective tissue</Em> underneath.</>}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {PLATFORM_CARDS.map((card) => (
              <div key={card.name} style={{
                background: tokens.color.ivoryCard,
                border: `1px solid ${tokens.color.line}`,
                borderRadius: 9,
                overflow: 'hidden',
              }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${tokens.color.navy}, ${tokens.color.blue})` }} />
                <div style={{ padding: '14px 14px 12px' }}>
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `radial-gradient(circle at 70% 70%, rgba(214,97,26,0.2), transparent 60%), ${tokens.color.navy}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={tokens.color.ivory} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <rect x={3} y={3} width={18} height={18} rx={2} />
                      <path d="M9 3v18M3 9h18" />
                    </svg>
                  </div>
                  <h5 style={{
                    fontFamily: tokens.font.display, fontSize: 14, fontWeight: 450,
                    color: tokens.color.ink, margin: '0 0 6px',
                  }}>
                    {card.name}
                  </h5>
                  <p style={{ fontSize: 11, color: tokens.color.inkSoft, lineHeight: 1.5, margin: '0 0 10px' }}>
                    {card.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: card.status === 'Planned' ? tokens.color.green
                        : card.status.startsWith('v') ? tokens.color.orange
                        : tokens.color.inkFaint,
                    }} />
                    <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute, letterSpacing: '0.06em' }}>
                      {card.status}
                    </span>
                    <span style={{ color: tokens.color.lineSoft }}>&middot;</span>
                    <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.inkMute }}>
                      {card.version}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section F: Closing Action Strip */}
        <div style={{
          marginTop: 56, padding: '40px 48px',
          background: tokens.color.navy,
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glows */}
          <div aria-hidden style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(214,97,26,0.15), transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div aria-hidden style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(14,71,184,0.12), transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <h2 style={{
            fontFamily: tokens.font.display, fontWeight: 300, fontSize: 28,
            color: tokens.color.ivory, margin: '0 0 12px', lineHeight: 1.2,
            position: 'relative',
          }}>
            Continue the <em style={{ fontStyle: 'italic', color: tokens.color.orange }}>Takara Tomy</em> engagement &mdash; or start something new.
          </h2>
          <p style={{
            fontSize: 14, color: tokens.color.ivoryDeep, lineHeight: 1.6, maxWidth: 700,
            margin: '0 0 24px', position: 'relative',
          }}>
            You&apos;ve touched 7 of 11 available features on this engagement. The next highest-leverage moves are
            completing the Role Profile Builder pass and stress-testing the structure against the Collapse CFO+COO scenario.
            Jump back into the work or switch context below.
          </p>
          <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            <button style={{
              padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tokens.color.ivory, color: tokens.color.navy,
              fontSize: 13, fontWeight: 600, fontFamily: tokens.font.body,
            }}>
              Resume on Structure tab
            </button>
            <button style={{
              padding: '8px 18px', borderRadius: 7, border: `1px solid rgba(255,255,255,0.25)`, cursor: 'pointer',
              background: 'transparent', color: tokens.color.ivory,
              fontSize: 13, fontWeight: 500, fontFamily: tokens.font.body,
            }}>
              Open Role Profile Builder
            </button>
            <button style={{
              padding: '8px 18px', borderRadius: 7, border: `1px solid rgba(255,255,255,0.25)`, cursor: 'pointer',
              background: 'transparent', color: tokens.color.ivory,
              fontSize: 13, fontWeight: 500, fontFamily: tokens.font.body,
            }}>
              New engagement
            </button>
          </div>
        </div>
      </div>
    </CanvasSurface>
  );
}
