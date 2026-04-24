"use client";
import React, { useState, useCallback, useRef } from "react";
import { tokens } from "../design-tokens";
import { CanvasSurface, TintedCard, MonoLabel, PrimaryButton, SecondaryButton, StatusPill } from "../CanvasSurface";
import { SectionHead, Em, Gold } from "../SectionHead";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";
import type { TabId } from "../design-tokens";

const QUADRANTS = [
  { id: 'play', label: 'Where we play', tint: 'blue' as const, prompt: 'markets, segments, geographies' },
  { id: 'win', label: 'How we win', tint: 'blue' as const, prompt: 'competitive advantages, differentiation' },
  { id: 'true', label: 'What must be true', tint: 'blue' as const, prompt: 'capabilities, conditions, prerequisites' },
  { id: 'wont', label: "What we won't do", tint: 'orange' as const, prompt: 'boundaries, exclusions, constraints' },
];

const STRESS_ROLES = [
  { role: 'The skeptical board member', mono: 'BOARD MEMBER' },
  { role: 'The departing partner', mono: 'DEPARTING PARTNER' },
  { role: 'The activist investor', mono: 'ACTIVIST INVESTOR' },
  { role: 'The competitor CEO', mono: 'COMPETITOR CEO' },
  { role: 'The 2028 post-mortem', mono: 'POST-MORTEM 2028' },
];

const DOWNSTREAM_TERRITORIES: { id: TabId; label: string }[] = [
  { id: 'operating-model', label: 'Operating Model' },
  { id: 'structure', label: 'Structure' },
  { id: 'principles', label: 'Principles' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'work-talent', label: 'Work & Talent' },
  { id: 'execution', label: 'Execution' },
];

async function callAI(system: string, message: string): Promise<string> {
  try {
    const resp = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, message }),
    });
    const data = await resp.json();
    return data?.response || data?.text || "";
  } catch { return ""; }
}

interface Props {
  profile: SandboxProfile;
  onNavigateToTab?: (tab: TabId) => void;
}

export function StrategyTab({ profile, onNavigateToTab }: Props) {
  const [intent, setIntent] = useState(profile.strategicContext.ceoMandate);
  const [quadrants, setQuadrants] = useState<Record<string, string>>({
    play: '', win: '', true: '', wont: '',
  });
  const [stressResults, setStressResults] = useState<{ role: string; challenge: string }[]>([]);
  const [stressLoading, setStressLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [implications, setImplications] = useState<Record<string, { count: number; preview: string }>>({});

  const handleAIDraft = useCallback(async (quadrantId: string, prompt: string) => {
    setAiLoading(prev => ({ ...prev, [quadrantId]: true }));
    const result = await callAI(
      `You are a strategy consultant. Draft content for the "${prompt}" quadrant of a strategic intent canvas. Be specific to this company.`,
      `Company: ${profile.company}. Strategic intent: "${intent}". Draft 2-3 bullet points for: ${prompt}`
    );
    setQuadrants(prev => ({ ...prev, [quadrantId]: result }));
    setAiLoading(prev => ({ ...prev, [quadrantId]: false }));
  }, [intent, profile.company]);

  const handleStressTest = useCallback(async () => {
    setStressLoading(true);
    setStressResults([]);
    const result = await callAI(
      'You are five different stakeholder personas stress-testing a strategic intent. For each persona, write a 1-2 sentence specific challenge. Return JSON array: [{"role":"...", "challenge":"..."}]',
      `Company: ${profile.company}. Strategic intent: "${intent}". Generate challenges from: board member, departing partner, activist investor, competitor CEO, 2028 post-mortem.`
    );
    try {
      const parsed = JSON.parse(result);
      setStressResults(Array.isArray(parsed) ? parsed : []);
    } catch {
      setStressResults(STRESS_ROLES.map(r => ({ role: r.role, challenge: 'Stress test result pending — retry to generate.' })));
    }
    setStressLoading(false);
  }, [intent, profile.company]);

  // Build right rail
  const rightRail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Engagement card */}
      <TintedCard tint="neutral">
        <MonoLabel>Engagement</MonoLabel>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: tokens.color.ink }}>{profile.company}</div>
          <div style={{ fontSize: 11, color: tokens.color.inkSoft, marginTop: 4 }}>{profile.industry} · {profile.cap}-cap · {profile.headcount.toLocaleString()} HC</div>
          <div style={{ fontSize: 11, color: tokens.color.inkMute, marginTop: 2 }}>Horizon: {profile.strategicContext.horizon}</div>
        </div>
      </TintedCard>

      {/* Decision ledger */}
      <TintedCard tint="neutral">
        <MonoLabel>Decision Ledger</MonoLabel>
        <div style={{ marginTop: 8, fontSize: 12, color: tokens.color.inkMute }}>
          No strategy decisions recorded yet. Decisions will appear here as you edit the intent canvas and run stress tests.
        </div>
      </TintedCard>

      {/* On this page */}
      <TintedCard tint="neutral">
        <MonoLabel>On This Page</MonoLabel>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Strategic Intent', 'Stress Test', 'Downstream Propagation'].map((s, i) => (
            <div key={s} style={{ fontSize: 12, color: tokens.color.inkSoft, padding: '4px 0', borderLeft: i === 0 ? `2px solid #FF8A3D` : '2px solid transparent', paddingLeft: 10 }}>
              {s}
            </div>
          ))}
        </div>
      </TintedCard>

      {/* Next territory */}
      <TintedCard tint="blue">
        <MonoLabel style={{ color: '#5B8DEF' }}>Next Territory</MonoLabel>
        <div style={{ marginTop: 6, fontSize: 12, color: tokens.color.inkSoft }}>
          Operating Model inherits from this page
        </div>
        <button
          onClick={() => onNavigateToTab?.('operating-model')}
          style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#5B8DEF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Continue &rarr;
        </button>
      </TintedCard>
    </div>
  );

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Main canvas */}
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
                  Strategic <Em>intent</Em> drives every structural decision — <span style={{ textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: 'rgba(255,255,255,0.2)' }}>start here</span>.
                </h1>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: tokens.color.inkSoft, lineHeight: 1.6, margin: 0 }}>
                  Define the organizing logic, stress-test it against five adversarial lenses, and watch
                  implications propagate to every downstream territory.
                </p>
                <SecondaryButton onClick={() => {}} style={{ marginTop: 12 }}>
                  Open engagement brief &rarr;
                </SecondaryButton>
              </div>
            </div>

            {/* Inherited context ribbon */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
              background: 'rgba(91,141,239,0.06)',
              borderLeft: '2px solid #5B8DEF',
              borderRadius: '0 8px 8px 0',
              marginBottom: 32,
            }}>
              <MonoLabel style={{ color: '#5B8DEF' }}>Engagement</MonoLabel>
              <span style={{ fontSize: 12, color: tokens.color.ink }}>{profile.company}</span>
              <span style={{ color: tokens.color.inkMute }}>·</span>
              <span style={{ fontSize: 11, color: tokens.color.inkMute }}>{profile.strategicContext.regions}</span>
              <span style={{ color: tokens.color.inkMute }}>·</span>
              <span style={{ fontSize: 11, color: tokens.color.inkMute }}>{profile.strategicContext.revenue}</span>
            </div>

            {/* Module 1: Strategic Intent Canvas */}
            <div style={{ marginBottom: 40 }}>
              <MonoLabel>01 · Strategic Intent</MonoLabel>
              <textarea
                value={intent}
                onChange={e => setIntent(e.target.value)}
                style={{
                  width: '100%', marginTop: 12, padding: '14px 16px',
                  background: '#1D2130', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: tokens.color.ink,
                  fontFamily: tokens.font.display, fontStyle: 'italic', fontWeight: 300,
                  fontSize: 16, lineHeight: 1.5, resize: 'vertical', minHeight: 60, outline: 'none',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                {QUADRANTS.map(q => (
                  <TintedCard key={q.id} tint={q.tint}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <MonoLabel>{q.label}</MonoLabel>
                      <button
                        onClick={() => handleAIDraft(q.id, q.prompt)}
                        disabled={aiLoading[q.id]}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: tokens.color.inkMute,
                          fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, opacity: aiLoading[q.id] ? 0.5 : 1,
                        }}
                      >
                        {aiLoading[q.id] ? 'Drafting...' : 'AI draft'}
                      </button>
                    </div>
                    <textarea
                      value={quadrants[q.id]}
                      onChange={e => setQuadrants(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={`Define: ${q.prompt}...`}
                      style={{
                        width: '100%', minHeight: 72, padding: '8px 10px',
                        background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(255,255,255,0.04)',
                        borderRadius: 6, color: '#D4DAE0', fontSize: 12, lineHeight: 1.5,
                        resize: 'vertical', outline: 'none', fontFamily: tokens.font.body,
                      }}
                    />
                  </TintedCard>
                ))}
              </div>
            </div>

            {/* Module 2: Stress Test */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <MonoLabel>02 · Stress Test</MonoLabel>
                <PrimaryButton onClick={handleStressTest} disabled={stressLoading}>
                  {stressLoading ? 'Running...' : 'Run stress test on current intent'}
                </PrimaryButton>
              </div>

              {stressResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stressResults.map((sr, i) => (
                    <TintedCard key={i} tint="amber">
                      <MonoLabel style={{ color: '#F5C451' }}>{STRESS_ROLES[i]?.mono || sr.role.toUpperCase()}</MonoLabel>
                      <p style={{ fontSize: 13, color: '#D4DAE0', margin: '8px 0 10px', lineHeight: 1.5 }}>{sr.challenge}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <SecondaryButton>Revise intent to address</SecondaryButton>
                        <SecondaryButton>Note as known risk</SecondaryButton>
                        <SecondaryButton>Dismiss</SecondaryButton>
                      </div>
                    </TintedCard>
                  ))}
                </div>
              )}

              {stressResults.length === 0 && !stressLoading && (
                <TintedCard tint="neutral">
                  <p style={{ fontSize: 12, color: tokens.color.inkMute, margin: 0 }}>
                    Run the stress test to generate five adversarial challenges against your strategic intent.
                  </p>
                </TintedCard>
              )}
            </div>

            {/* Module 3: Downstream Propagation */}
            <div>
              <MonoLabel>03 · Downstream Propagation</MonoLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
                {DOWNSTREAM_TERRITORIES.map(t => {
                  const imp = implications[t.id];
                  return (
                    <TintedCard key={t.id} tint="neutral">
                      <MonoLabel>{t.label}</MonoLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <StatusPill
                          label={imp ? `${imp.count} NEW` : 'CLEAR'}
                          color={imp ? '#F5C451' : '#3DDC97'}
                        />
                      </div>
                      {imp && <p style={{ fontSize: 11, color: tokens.color.inkSoft, margin: '6px 0 0', lineHeight: 1.4 }}>{imp.preview}</p>}
                      <button
                        onClick={() => onNavigateToTab?.(t.id)}
                        style={{ marginTop: 8, fontSize: 11, color: '#5B8DEF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Go to {t.label} &rarr;
                      </button>
                    </TintedCard>
                  );
                })}
              </div>
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
