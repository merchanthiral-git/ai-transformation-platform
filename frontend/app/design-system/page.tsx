'use client';

import { useState } from 'react';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { GlassPanel } from '../components/ui/GlassPanel';
import { GradientTitle } from '../components/ui/GradientTitle';
import { KpiCard } from '../components/ui/KpiCard';
import { SlidingTabs } from '../components/ui/SlidingTabs';
import { AIInsight } from '../components/ui/AIInsight';
import { RoleCard } from '../components/ui/RoleCard';

export default function DesignSystemPage() {
  const [tab, setTab] = useState('Overview');
  const [counter, setCounter] = useState(1247);

  return (
    <div className="relative z-10 min-h-screen p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
      {/* Header */}
      <div className="mb-12">
        <div className="font-jetbrains uppercase tracking-widest text-xs mb-3" style={{ color: 'var(--cr-text-dim)' }}>
          Design System Preview
        </div>
        <GradientTitle as="h1" className="text-5xl mb-3">
          Computed Reality
        </GradientTitle>
        <p style={{ color: 'var(--cr-text-dim)', fontSize: 17 }}>
          Dark, cinematic, futuristic UI primitives for the AI Transformation Platform.
        </p>
      </div>

      {/* Section: GradientTitle */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>GradientTitle</h2>
        <GlassPanel>
          <GradientTitle as="h2" className="text-4xl">Workforce Intelligence</GradientTitle>
          <GradientTitle as="h3" className="text-2xl mt-3">Organizational Design</GradientTitle>
        </GlassPanel>
      </section>

      {/* Section: AnimatedNumber */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>AnimatedNumber</h2>
        <GlassPanel>
          <div className="flex items-center gap-6">
            <span className="font-heading italic text-5xl" style={{ color: 'var(--cr-text)' }}>
              <AnimatedNumber value={counter} suffix="%" />
            </span>
            <button
              onClick={() => setCounter(prev => prev + Math.floor(Math.random() * 500))}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.3)',
                color: 'var(--cyan)',
              }}
            >
              Randomize
            </button>
          </div>
        </GlassPanel>
      </section>

      {/* Section: GlassPanel */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>GlassPanel</h2>
        <div className="grid grid-cols-2 gap-4">
          <GlassPanel>
            <div className="font-jetbrains text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--cr-text-dim)' }}>Default</div>
            <p style={{ color: 'var(--cr-text)' }}>Standard glass panel with subtle border.</p>
          </GlassPanel>
          <GlassPanel hot>
            <div className="font-jetbrains text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--cyan)' }}>Hot</div>
            <p style={{ color: 'var(--cr-text)' }}>Highlighted panel with hot border.</p>
          </GlassPanel>
        </div>
      </section>

      {/* Section: KpiCard */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>KpiCard</h2>
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Headcount" value={3847} delta={4.2} sparkline={[30, 45, 38, 52, 48, 60, 55]} />
          <KpiCard label="AI Readiness" value={67} suffix="%" delta={-2.1} sparkline={[20, 35, 42, 38, 50, 45, 55]} />
          <KpiCard label="Roles Redesigned" value={142} delta={12.5} />
          <KpiCard label="Cost Savings" value={2.4} suffix="M" prefix="$" decimals={1} delta={8.3} sparkline={[10, 20, 15, 30, 25, 40, 35]} />
        </div>
      </section>

      {/* Section: SlidingTabs */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>SlidingTabs</h2>
        <GlassPanel>
          <SlidingTabs
            tabs={['Overview', 'Diagnose', 'Design', 'Simulate', 'Mobilize']}
            activeTab={tab}
            onTabChange={setTab}
          />
          <p className="mt-4 text-sm" style={{ color: 'var(--cr-text-dim)' }}>
            Active: <span style={{ color: 'var(--cyan)' }}>{tab}</span>
          </p>
        </GlassPanel>
      </section>

      {/* Section: AIInsight */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>AIInsight</h2>
        <AIInsight>
          <div className="flex items-start gap-3">
            <span style={{ color: 'var(--cyan)', fontSize: 20 }}>✦</span>
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--cr-text)' }}>AI Analysis</div>
              <p className="text-sm" style={{ color: 'var(--cr-text-dim)' }}>
                Based on the current workforce composition, 34% of roles in the Technology function
                have high augmentation potential. Consider prioritizing reskilling for the 127 employees
                in these roles.
              </p>
            </div>
          </div>
        </AIInsight>
      </section>

      {/* Section: RoleCard */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>RoleCard</h2>
        <div className="grid grid-cols-3 gap-4">
          {['Senior Data Analyst', 'HR Business Partner', 'Product Manager'].map((role) => (
            <RoleCard key={role} onClick={() => {}}>
              <div className="font-heading italic text-lg mb-1" style={{ color: 'var(--cr-text)' }}>{role}</div>
              <div className="font-jetbrains text-xs mb-3" style={{ color: 'var(--cr-text-dim)' }}>L5 · Technology · 24 FTE</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(130,180,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: '72%', background: 'linear-gradient(90deg, var(--cyan), var(--violet))' }} />
                </div>
                <span className="font-jetbrains text-xs" style={{ color: 'var(--cyan)' }}>72%</span>
              </div>
            </RoleCard>
          ))}
        </div>
      </section>

      {/* Color tokens */}
      <section className="mb-12">
        <h2 className="font-heading italic text-2xl mb-4" style={{ color: 'var(--cr-text)' }}>Color Tokens</h2>
        <GlassPanel>
          <div className="grid grid-cols-6 gap-3">
            {[
              { name: 'Void', color: 'var(--bg-void)' },
              { name: 'Deep', color: 'var(--bg-deep)' },
              { name: 'Panel', color: 'var(--bg-panel)' },
              { name: 'Cyan', color: 'var(--cyan)' },
              { name: 'Violet', color: 'var(--violet)' },
              { name: 'Rose', color: 'var(--cr-rose)' },
              { name: 'Amber', color: 'var(--cr-amber)' },
              { name: 'Emerald', color: 'var(--cr-emerald)' },
              { name: 'Text', color: 'var(--cr-text)' },
              { name: 'Text Dim', color: 'var(--cr-text-dim)' },
              { name: 'Text Faint', color: 'var(--cr-text-faint)' },
              { name: 'Border', color: 'var(--cr-border-hot)' },
            ].map((t) => (
              <div key={t.name} className="text-center">
                <div className="w-12 h-12 rounded-lg mx-auto mb-1 border border-[var(--cr-border)]" style={{ background: t.color }} />
                <div className="font-jetbrains text-[10px]" style={{ color: 'var(--cr-text-dim)' }}>{t.name}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
