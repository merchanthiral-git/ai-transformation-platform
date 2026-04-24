"use client";
import React, { useEffect, useCallback } from "react";
import { tokens } from "./design-tokens";
import { TintedCard, MonoLabel, PrimaryButton, SecondaryButton } from "./CanvasSurface";

export interface DossierArchetypeData {
  type: 'archetype';
  id: string;
  rank: number;
  name: string;
  subtitle: string;
  fitPct: number;
  fitLabel: string;
  tierColor: string;
  aiAnalysis?: string;
  strengths?: string[];
  watchOuts?: string[];
}

export interface DossierImplicationData {
  type: 'implication';
  id: string;
  territory: string;
  title: string;
  constraintChain?: string;
  aiRationale?: string;
  impact?: string;
}

export type DossierData = DossierArchetypeData | DossierImplicationData;

interface Props {
  data: DossierData | null;
  onClose: () => void;
  onSelect?: (id: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function DossierPanel({ data, onClose, onSelect, onNext, onPrev }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!data) return null;

  const isArchetype = data.type === 'archetype';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 80,
          transition: 'opacity 220ms ease-out',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 52, // below shell top bar
          right: 0,
          bottom: 0,
          width: 560,
          background: '#0B0D12',
          borderLeft: '0.5px solid rgba(255,255,255,0.1)',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          animation: 'dossierSlideIn 220ms ease-out',
        }}
      >
        <style>{`
          @keyframes dossierSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header band */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          {isArchetype && (
            <span style={{
              padding: '3px 8px',
              borderRadius: 4,
              background: `rgba(${(data as DossierArchetypeData).tierColor === '#3DDC97' ? '61,220,151' : '245,196,81'},0.15)`,
              color: (data as DossierArchetypeData).tierColor,
              fontFamily: tokens.font.mono,
              fontSize: 10,
              fontWeight: 700,
            }}>
              #{(data as DossierArchetypeData).rank}
            </span>
          )}
          <div style={{ flex: 1 }}>
            <MonoLabel>
              {isArchetype ? `Archetype · Ranked #${(data as DossierArchetypeData).rank}` : `Implication · ${(data as DossierImplicationData).territory}`}
            </MonoLabel>
            {isArchetype && (
              <div style={{ fontSize: 11, color: tokens.color.inkSoft, marginTop: 2 }}>
                {(data as DossierArchetypeData).fitLabel} · {(data as DossierArchetypeData).fitPct}% alignment
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {onPrev && <SecondaryButton onClick={onPrev}>&larr;</SecondaryButton>}
            {onNext && <SecondaryButton onClick={onNext}>&rarr;</SecondaryButton>}
            <SecondaryButton onClick={onClose}>&times;</SecondaryButton>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Title */}
          <h2 style={{
            fontFamily: tokens.font.display,
            fontWeight: 300,
            fontSize: 24,
            letterSpacing: '-0.01em',
            color: tokens.color.ink,
            margin: '0 0 6px',
          }}>
            {isArchetype ? (data as DossierArchetypeData).name : (data as DossierImplicationData).title}
          </h2>
          <p style={{ fontSize: 13, color: '#8A9AAB', margin: '0 0 20px' }}>
            {isArchetype ? (data as DossierArchetypeData).subtitle : (data as DossierImplicationData).constraintChain || ''}
          </p>

          {/* Archetype-specific content */}
          {isArchetype && (
            <>
              {/* Fit score breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'Strategic Fit', value: 'Strong', tint: 'green' as const },
                  { label: 'Constraint Fit', value: 'All clear', tint: 'green' as const },
                  { label: 'Transition Cost', value: 'Moderate', tint: 'amber' as const },
                  { label: 'Partner Support', value: 'Likely', tint: 'blue' as const },
                ].map(m => (
                  <TintedCard key={m.label} tint={m.tint}>
                    <MonoLabel>{m.label}</MonoLabel>
                    <div style={{ fontSize: 20, fontWeight: 600, color: tokens.color.ink, marginTop: 4 }}>{m.value}</div>
                  </TintedCard>
                ))}
              </div>

              {/* AI Analysis */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <MonoLabel>AI Analysis</MonoLabel>
                  <MonoLabel style={{ color: tokens.color.inkMute }}>Claude Opus</MonoLabel>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '0.5px solid rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: 14,
                }}>
                  <p style={{ fontSize: 13, color: '#B8C2CC', lineHeight: 1.6, margin: 0 }}>
                    {(data as DossierArchetypeData).aiAnalysis || 'Analysis will generate on first view. Click to trigger.'}
                  </p>
                </div>
              </div>

              {/* Strengths / Watch-outs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DDC97' }} />
                    <MonoLabel style={{ color: '#3DDC97' }}>Strengths</MonoLabel>
                  </div>
                  {((data as DossierArchetypeData).strengths || ['Aligns with strategic direction', 'Proven in similar contexts', 'Low transition friction', 'Partner network compatible']).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#B8C2CC', padding: '3px 0', lineHeight: 1.4 }}>
                      &bull; {s}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C451' }} />
                    <MonoLabel style={{ color: '#F5C451' }}>Watch-Outs</MonoLabel>
                  </div>
                  {((data as DossierArchetypeData).watchOuts || ['Requires new capability in 1-2 areas', 'Change management complexity', 'Timeline pressure', 'Talent gap in key roles']).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#B8C2CC', padding: '3px 0', lineHeight: 1.4 }}>
                      &bull; {s}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Implication-specific content */}
          {!isArchetype && (
            <>
              <div style={{ marginBottom: 24 }}>
                <MonoLabel>AI Rationale</MonoLabel>
                <div style={{
                  marginTop: 8,
                  background: 'rgba(0,0,0,0.2)',
                  border: '0.5px solid rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: 14,
                }}>
                  <p style={{ fontSize: 13, color: '#B8C2CC', lineHeight: 1.6, margin: 0 }}>
                    {(data as DossierImplicationData).aiRationale || 'Rationale will generate on first view.'}
                  </p>
                </div>
              </div>
              <div>
                <MonoLabel>Impact on {(data as DossierImplicationData).territory}</MonoLabel>
                <p style={{ fontSize: 13, color: '#B8C2CC', lineHeight: 1.6, marginTop: 8 }}>
                  {(data as DossierImplicationData).impact || 'Impact analysis pending.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action bar */}
        <div style={{
          padding: '12px 20px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'linear-gradient(to top, #0B0D12 60%, transparent)',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <SecondaryButton>Defer</SecondaryButton>
            <SecondaryButton>Compare</SecondaryButton>
          </div>
          {isArchetype && onSelect && (
            <PrimaryButton onClick={() => { onSelect(data.id); onClose(); }}>
              Select this archetype &rarr;
            </PrimaryButton>
          )}
          {!isArchetype && (
            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryButton onClick={onClose} style={{ background: 'linear-gradient(180deg, #3DDC97, #2BC880)' }}>
                Accept
              </PrimaryButton>
              <SecondaryButton onClick={onClose} style={{ borderColor: 'rgba(255,90,95,0.2)', color: '#FF5A5F' }}>
                Reject
              </SecondaryButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
