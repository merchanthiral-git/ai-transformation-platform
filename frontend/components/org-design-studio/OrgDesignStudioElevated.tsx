"use client";
import React, { useState, useCallback, useEffect } from "react";
import { StudioShell } from "./StudioShell";
import { CanvasSurface } from "./CanvasSurface";
import { SectionHead, Em, Gold } from "./SectionHead";
import { PullQuote } from "./PullQuote";
import { tokens, type TabId } from "./design-tokens";
import { StructureTab } from "./tabs/StructureTab";
import { PrinciplesTab } from "./tabs/PrinciplesTab";
import { StrategyTab } from "./tabs/StrategyTab";
import { OperatingModelTab } from "./tabs/OperatingModelTab";
import dynamic from "next/dynamic";
const MethodologyTab = dynamic(() => import("./tabs/MethodologyTab").then(m => ({ default: m.MethodologyTab })), { ssr: false });
import { TERRITORIES } from "@/data/methodology/capability-map";
import { useActiveSandbox } from "@/hooks/useActiveSandbox";
import { SandboxGate } from "./SandboxGate";
import { seedTakaraTomyActivity } from "@/lib/feature-activity";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";

interface ElevatedProps {
  onBack: () => void;
  model: string;
  f: Record<string, unknown>;
  odsState: { activeScenario: number; view: string };
  setOdsState: (s: { activeScenario: number; view: string }) => void;
  viewCtx?: Record<string, unknown>;
  jobStates?: Record<string, unknown>;
}

const VIEW_TO_TAB: Record<string, TabId> = {
  current: 'strategy',
  design: 'structure',
  analyze: 'work-talent',
  compare: 'execution',
  present: 'methodology',
};

const TAB_TO_VIEW: Record<TabId, string> = {
  strategy: 'current',
  'operating-model': 'operating-model',
  structure: 'design',
  principles: 'principles',
  accountability: 'accountability',
  'work-talent': 'analyze',
  execution: 'compare',
  methodology: 'methodology',
};

function TabPlaceholder({ tabId, tabLabel, profile, onNavigateToTab }: { tabId: TabId; tabLabel: string; profile?: SandboxProfile | null; onNavigateToTab?: (tab: TabId) => void }) {
  const descriptions: Record<string, { headline: React.ReactNode; sub: string; quote: string; attr: string }> = {
    accountability: {
      headline: <>Clear <Em>accountability</Em> turns structure into action &mdash; <Gold>who decides what</Gold>.</>,
      sub: 'Map decision rights, governance forums, escalation paths, and role mandates across the enterprise.',
      quote: 'Accountability is the connective tissue of an organization. Without it, even the best structures fail to deliver outcomes.',
      attr: '— Neilson, Martin & Powers, The Secrets to Successful Strategy Execution',
    },
    'work-talent': {
      headline: <>Design the <Em>work</Em>, then fit the <Gold>talent</Gold> to it.</>,
      sub: 'Job architecture, role profiles, leveling, skills maps, and talent flows — where work meets people.',
      quote: 'The work should be designed before the jobs. Too many organizations start with the boxes and fill them with whatever work exists.',
      attr: '— Ravin Jesuthasan, Work Without Jobs',
    },
    execution: {
      headline: <>From design to <Em>reality</Em> &mdash; the <Gold>transformation roadmap</Gold>.</>,
      sub: 'Cost modeling, change impact, risk registers, wave planning, and milestone tracking for the transition.',
      quote: 'A good design on paper is worth nothing until it survives contact with the humans who must live inside it.',
      attr: '— Amy Kates, Designing Your Organization',
    },
  };

  const d = descriptions[tabId];
  if (!d) return null;

  return (
    <CanvasSurface>
      <div style={{ padding: '48px 56px', maxWidth: 900 }}>
        <SectionHead
          eyebrow={tabLabel}
          headline={d.headline}
          support={d.sub}
        />
        <PullQuote attribution={d.attr}>
          {d.quote}
        </PullQuote>
        {/* Planned features grid */}
        <div style={{ marginTop: 32 }}>
          {(() => {
            const territoryMap: Record<string, string> = {
              accountability: 'accountability',
              'work-talent': 'worktalent',
              execution: 'execution',
            };
            const t = TERRITORIES.find(t => t.id === territoryMap[tabId]);
            if (!t) return null;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {t.features.slice(0, 6).map((f) => (
                  <div key={f.id} style={{
                    padding: '10px 12px',
                    background: f.inUse ? tokens.color.orangeWash : tokens.color.ivoryCard,
                    border: `1px solid ${f.inUse ? tokens.color.orange : tokens.color.lineSoft}`,
                    borderRadius: 7,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: tokens.color.ink }}>{f.name}</span>
                      <span style={{
                        fontFamily: tokens.font.mono, fontSize: 8, fontWeight: 600,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: 3,
                        background: f.status === 'live' ? tokens.color.greenPale : f.status === 'beta' ? tokens.color.bluePale : tokens.color.ivoryDeep,
                        color: f.status === 'live' ? tokens.color.green : f.status === 'beta' ? tokens.color.blue : tokens.color.inkMute,
                      }}>
                        {f.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 10.5, color: tokens.color.inkMute, margin: 0, lineHeight: 1.4 }}>{f.description}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

      </div>
    </CanvasSurface>
  );
}

export function OrgDesignStudioElevated({ onBack, model, f, odsState, setOdsState, viewCtx, jobStates }: ElevatedProps) {
  const initialTab = VIEW_TO_TAB[odsState.view] || 'structure';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { profile } = useActiveSandbox(model);

  // Seed engagement activity on first mount
  useEffect(() => { seedTakaraTomyActivity(); }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const mappedView = TAB_TO_VIEW[tab] || tab;
    setOdsState({ ...odsState, view: mappedView });
  }, [odsState, setOdsState]);

  const renderTabContent = () => {
    if (!profile) return null;
    switch (activeTab) {
      case 'strategy':
        return <StrategyTab profile={profile} onNavigateToTab={handleTabChange} />;
      case 'operating-model':
        return <OperatingModelTab profile={profile} onNavigateToTab={handleTabChange} onBack={onBack} />;
      case 'structure':
        return <StructureTab profile={profile} />;
      case 'principles':
        return <PrinciplesTab profile={profile} />;
      case 'methodology':
        return <MethodologyTab onNavigateToTab={handleTabChange as (tab: string) => void} onBack={onBack} />;
      default:
        return (
          <TabPlaceholder
            tabId={activeTab}
            tabLabel={
              activeTab === 'accountability' ? 'Accountability'
              : activeTab === 'work-talent' ? 'Work & Talent'
              : 'Execution'
            }
            profile={profile}
            onNavigateToTab={handleTabChange}
          />
        );
    }
  };

  return (
    <SandboxGate profile={profile} onNavigateToSandbox={onBack}>
      <StudioShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onBack={onBack}
        clientName={profile?.company}
        profile={profile}
      >
        {renderTabContent()}
      </StudioShell>
    </SandboxGate>
  );
}
