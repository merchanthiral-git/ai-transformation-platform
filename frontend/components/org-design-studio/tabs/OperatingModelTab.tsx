"use client";
import React, { useState, useCallback, useMemo } from "react";
import { tokens } from "../design-tokens";
import { CanvasSurface, TintedCard, MonoLabel, PrimaryButton, SecondaryButton, StatusPill } from "../CanvasSurface";
import { Em } from "../SectionHead";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";
import type { TabId } from "../design-tokens";

const ARCH_NAMES: Record<string, { name: string; sub: string }> = {
  functional: { name: 'Functional', sub: 'Grouped by expertise' },
  regionalHolding: { name: 'Regional Holding', sub: 'P&L by geography' },
  frontBack: { name: 'Front-Back', sub: 'Customer-facing / ops' },
  matrix: { name: 'Matrix', sub: 'Dual reporting lines' },
  productDivisional: { name: 'Product Divisional', sub: 'Product-line P&L' },
  ambidextrous: { name: 'Ambidextrous', sub: 'Explore + exploit' },
  platform: { name: 'Platform', sub: 'Shared platform teams' },
  networked: { name: 'Networked', sub: 'Alliance / ecosystem' },
};

const FIT_TIERS = { strong: { color: '#3DDC97', label: 'Strong', tier: 1 }, partial: { color: '#F5C451', label: 'Partial', tier: 2 }, poor: { color: '#6B7180', label: 'Poor', tier: 3 }, current: { color: '#5B8DEF', label: 'Current', tier: 0 } };

const DOWNSTREAM: { id: TabId; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'work-talent', label: 'Work & Talent' },
  { id: 'execution', label: 'Execution' },
];

const MODULE_REFS = [
  { name: 'Archetype Library', desc: '12 archetypes · full detail' },
  { name: 'Capability Taxonomy', desc: 'Core / Enable / Shared' },
  { name: 'Service Catalog Templates', desc: 'Engagement templates' },
  { name: 'Build/Buy/Partner/Bot', desc: 'Sourcing decision frame' },
  { name: 'Global/Regional/Local', desc: 'Geographic cut framework' },
];

interface Props {
  profile: SandboxProfile;
  onNavigateToTab?: (tab: TabId) => void;
  onBack?: () => void;
}

export function OperatingModelTab({ profile, onNavigateToTab, onBack }: Props) {
  const [filter, setFilter] = useState('all');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(profile.chosenArchetype);
  const [decisions, setDecisions] = useState<{ title: string; timestamp: string; rationale: string }[]>([]);

  const ranked = useMemo(() => {
    const entries = Object.entries(profile.archetypeRanking).map(([id, fit], i) => ({
      id,
      name: ARCH_NAMES[id]?.name || id,
      sub: ARCH_NAMES[id]?.sub || '',
      fit: fit as keyof typeof FIT_TIERS,
      tier: FIT_TIERS[fit as keyof typeof FIT_TIERS]?.tier ?? 3,
      rank: i + 1,
    }));
    entries.sort((a, b) => a.tier - b.tier);
    entries.forEach((e, i) => { e.rank = i + 1; });

    if (filter === 'fit70') return entries.filter(e => e.fit === 'strong' || e.fit === 'current');
    return entries;
  }, [profile.archetypeRanking, filter]);

  const fitBarWidth = (fit: string) => fit === 'strong' || fit === 'current' ? 92 : fit === 'partial' ? 60 : 28;

  const rightRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Module reference card */}
      <TintedCard tint="neutral">
        <MonoLabel>OM Module · Workshop</MonoLabel>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MODULE_REFS.map(m => (
            <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: tokens.color.ink }}>{m.name}</div>
                <div style={{ fontSize: 10, color: tokens.color.inkMute }}>{m.desc}</div>
              </div>
              <span style={{ fontSize: 11, color: '#5B8DEF', cursor: 'pointer' }}>&rarr;</span>
            </div>
          ))}
        </div>
      </TintedCard>

      {/* Mental model note */}
      <TintedCard tint="orange" style={{ borderLeft: '2px solid #FF8A3D', borderRadius: '0 10px 10px 0' }}>
        <p style={{ fontSize: 12, color: '#D4DAE0', margin: 0, lineHeight: 1.5, fontStyle: 'italic', fontFamily: tokens.font.display, fontWeight: 300 }}>
          Module is the workshop. This tab is the {profile.company} case file. Work done here is engagement-specific.
        </p>
      </TintedCard>
    </div>
  );

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <CanvasSurface>
          <div style={{ padding: '36px 40px', maxWidth: 960 }}>
            {/* Hero */}
            <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
              <div style={{ flex: 1.5 }}>
                <h1 style={{
                  fontFamily: tokens.font.display, fontWeight: 300, fontSize: 32,
                  letterSpacing: '-0.01em', color: tokens.color.ink, margin: 0, lineHeight: 1.2,
                }}>
                  The <Em>operating model</Em> is where strategy becomes structural choice.
                </h1>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: tokens.color.inkSoft, lineHeight: 1.6, margin: '0 0 12px' }}>
                  This is the {profile.company} case file — your strategic intent projected onto archetypes,
                  decisions traced to consequences, choices preserved with rationale.
                </p>
                <SecondaryButton onClick={onBack}>
                  Open OM module &rarr;
                </SecondaryButton>
                <div style={{ marginTop: 4 }}>
                  <MonoLabel>Workshop · Frameworks · Library</MonoLabel>
                </div>
              </div>
            </div>

            {/* Inherited-from-Strategy ribbon */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
              background: 'rgba(91,141,239,0.06)',
              borderLeft: '2px solid #5B8DEF',
              borderRadius: '0 8px 8px 0',
              marginBottom: 32,
            }}>
              <MonoLabel style={{ color: '#5B8DEF' }}>Inherited from Strategy</MonoLabel>
              <span style={{ fontSize: 12, color: '#D4DAE0', flex: 1, fontStyle: 'italic', fontFamily: tokens.font.display, fontWeight: 300 }}>
                &ldquo;{profile.strategicContext.ceoMandate}&rdquo;
              </span>
              <button
                onClick={() => onNavigateToTab?.('strategy')}
                style={{ fontSize: 10, color: '#5B8DEF', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                View Strategy &rarr;
              </button>
            </div>

            {/* Module 1: Strategic Alignment */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <MonoLabel>01 · Strategic Alignment</MonoLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['all', 'fit70'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: filter === f ? tokens.color.ink : tokens.color.inkMute,
                        cursor: 'pointer',
                      }}
                    >
                      {f === 'all' ? 'All' : 'Fit > 70%'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ranked.map(a => {
                  const ft = FIT_TIERS[a.fit];
                  const isSelected = a.id === selectedArchetype;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedArchetype(a.id)}
                      style={{
                        display: 'grid', gridTemplateColumns: '36px 1fr 120px 1fr 60px',
                        alignItems: 'center', gap: 12, padding: '10px 14px',
                        borderRadius: 8, cursor: 'pointer',
                        background: isSelected ? 'rgba(91,141,239,0.08)' : 'transparent',
                        border: isSelected ? '0.5px solid rgba(91,141,239,0.2)' : '0.5px solid transparent',
                        transition: 'background 150ms ease',
                      }}
                    >
                      {/* Rank */}
                      <span style={{
                        fontFamily: tokens.font.mono, fontSize: 13, fontWeight: 700,
                        color: ft.color, textAlign: 'center',
                      }}>
                        #{a.rank}
                      </span>

                      {/* Name */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.color.ink }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: tokens.color.inkMute }}>{a.sub}</div>
                      </div>

                      {/* Fit bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ width: `${fitBarWidth(a.fit)}%`, height: '100%', borderRadius: 2, background: ft.color }} />
                        </div>
                        <span style={{ fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 600, color: ft.color }}>
                          {fitBarWidth(a.fit)}%
                        </span>
                      </div>

                      {/* AI reasoning stub */}
                      <div style={{ fontSize: 11, color: tokens.color.inkMute, lineHeight: 1.4 }}>
                        {a.fit === 'strong' || a.fit === 'current'
                          ? 'Aligns with strategic direction and capability base.'
                          : a.fit === 'partial'
                          ? 'Partial fit — requires capability build in 1-2 areas.'
                          : 'Weak alignment with current constraints.'}
                      </div>

                      {/* Detail action */}
                      <span style={{ fontSize: 11, color: '#5B8DEF', textAlign: 'right' }}>Detail &rarr;</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Module 2: Downstream Propagation */}
            <div style={{ marginBottom: 40 }}>
              <MonoLabel>02 · Downstream Propagation</MonoLabel>
              <p style={{ fontSize: 13, color: tokens.color.inkSoft, margin: '8px 0 16px' }}>
                What your current OM choice means for every other territory.
              </p>

              {selectedArchetype ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <StatusPill label={`${ARCH_NAMES[selectedArchetype]?.name || selectedArchetype} SELECTED`} color="#3DDC97" active />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {DOWNSTREAM.map(t => (
                      <TintedCard key={t.id} tint="neutral">
                        <MonoLabel>{t.label}</MonoLabel>
                        <StatusPill label="CLEAR" color="#3DDC97" />
                        <p style={{ fontSize: 11, color: tokens.color.inkMute, margin: '6px 0 0' }}>
                          No blocking implications from current archetype selection.
                        </p>
                        <button
                          onClick={() => onNavigateToTab?.(t.id)}
                          style={{ marginTop: 6, fontSize: 11, color: '#5B8DEF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Go to {t.label} &rarr;
                        </button>
                      </TintedCard>
                    ))}
                  </div>
                </>
              ) : (
                <TintedCard tint="neutral">
                  <p style={{ fontSize: 12, color: tokens.color.inkMute, margin: 0 }}>
                    Select an archetype above to see propagation to downstream territories.
                  </p>
                </TintedCard>
              )}
            </div>

            {/* Module 3: Decision Ledger */}
            <div>
              <MonoLabel>03 · Decision Ledger</MonoLabel>
              <p style={{ fontSize: 13, color: tokens.color.inkSoft, margin: '8px 0 16px' }}>
                Every OM choice, preserved with rationale.
              </p>
              {decisions.length === 0 ? (
                <TintedCard tint="neutral">
                  <p style={{ fontSize: 12, color: tokens.color.inkMute, margin: 0 }}>
                    No decisions recorded yet. Select an archetype and confirm your choice to create the first entry.
                  </p>
                </TintedCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {decisions.map((d, i) => (
                    <TintedCard key={i} tint="neutral">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: tokens.color.ink }}>{d.title}</span>
                        <MonoLabel>{d.timestamp}</MonoLabel>
                      </div>
                      <p style={{ fontSize: 12, color: tokens.color.inkSoft, margin: 0 }}>{d.rationale}</p>
                    </TintedCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CanvasSurface>
      </main>

      {/* Right rail */}
      <aside style={{
        width: 280, minWidth: 280,
        borderLeft: '0.5px solid rgba(255,255,255,0.1)',
        background: tokens.color.ivoryPaper,
        overflowY: 'auto', padding: 16,
      }}>
        {rightRail}
      </aside>
    </div>
  );
}
