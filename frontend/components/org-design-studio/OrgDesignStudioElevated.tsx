"use client";
import React, { useState, useCallback, useEffect } from "react";
import { StudioShell } from "./StudioShell";
import { CanvasSurface } from "./CanvasSurface";
import { SectionHead, Em, Gold } from "./SectionHead";
import { PullQuote } from "./PullQuote";
import { tokens, type TabId } from "./design-tokens";
import { StructureTab } from "./tabs/StructureTab";
import { PrinciplesTab } from "./tabs/PrinciplesTab";
import dynamic from "next/dynamic";
const MethodologyTab = dynamic(() => import("./tabs/MethodologyTab").then(m => ({ default: m.MethodologyTab })), { ssr: false });
import { TERRITORIES } from "@/data/methodology/capability-map";
import { takaraTomy } from "@/data/org-design/takara-tomy";
import { seedTakaraTomyActivity } from "@/lib/feature-activity";

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

function TabPlaceholder({ tabId, tabLabel }: { tabId: TabId; tabLabel: string }) {
  const descriptions: Record<string, { headline: React.ReactNode; sub: string; quote: string; attr: string }> = {
    strategy: {
      headline: <>Strategic <Em>intent</Em> drives every structural decision &mdash; <Gold>start here</Gold>.</>,
      sub: 'Define the CEO mandate, strategic context, and the organizing principles that constrain the design.',
      quote: 'Strategy is the foundation of organization design. Without a clear strategy, structure becomes arbitrary.',
      attr: '— Jay Galbraith, Designing Organizations',
    },
    'operating-model': {
      headline: <>The <Em>operating model</Em> bridges strategy and structure &mdash; <Gold>how work flows</Gold>.</>,
      sub: 'Map the core, enabling, and shared capabilities. Define what\'s global, regional, and local.',
      quote: 'The operating model defines the bridge between strategy and structure — how work flows, where decisions are made, and what capabilities matter most.',
      attr: '— Kates & Kesler, Bridging Organization Design and Performance',
    },
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
        {/* Strategic context for Strategy tab */}
        {tabId === 'strategy' && (
          <div style={{
            marginTop: 32, padding: 16,
            background: tokens.color.ivoryCard,
            border: `1px solid ${tokens.color.line}`,
            borderLeft: `3px solid ${tokens.color.orange}`,
            borderRadius: '0 9px 9px 0',
          }}>
            <div style={{
              fontFamily: tokens.font.mono, fontWeight: 600, fontSize: 9.5,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: tokens.color.orange, marginBottom: 8,
            }}>
              Strategic Context &middot; Takara Tomy International
            </div>
            <h3 style={{
              fontFamily: tokens.font.display, fontWeight: 400, fontSize: 17,
              color: tokens.color.ink, margin: '0 0 12px', lineHeight: 1.3,
            }}>
              &ldquo;Compete as an <em style={{ fontStyle: 'italic', color: tokens.color.orange }}>enterprise</em>, not a portfolio of brands.&rdquo;
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
              {Object.entries(takaraTomy.strategicContext).filter(([k]) => k !== 'ceoMandate').map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.color.inkMute }}>{k}</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 600, color: tokens.color.ink }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Planned features grid */}
        <div style={{ marginTop: 32 }}>
          <div style={{
            fontFamily: tokens.font.mono, fontWeight: 600, fontSize: 9.5,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: tokens.color.inkMute, marginBottom: 12,
          }}>
            Planned for this territory
          </div>
          {(() => {
            const territoryMap: Record<string, string> = {
              strategy: 'strategy',
              'operating-model': 'opmodel',
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

        <div style={{
          marginTop: 24, padding: '16px 20px',
          background: tokens.color.ivoryCard,
          border: `1px dashed ${tokens.color.lineSoft}`,
          borderRadius: 9,
        }}>
          <p style={{ fontSize: 13, color: tokens.color.inkSoft, margin: 0, lineHeight: 1.6 }}>
            See the full capability map in the <span style={{ fontWeight: 600 }}>Methodology</span> tab
            for planned features and engagement progress across all six territories.
          </p>
        </div>
      </div>
    </CanvasSurface>
  );
}

export function OrgDesignStudioElevated({ onBack, model, f, odsState, setOdsState, viewCtx, jobStates }: ElevatedProps) {
  const initialTab = VIEW_TO_TAB[odsState.view] || 'structure';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Seed Takara Tomy engagement activity on first mount
  useEffect(() => { seedTakaraTomyActivity(); }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const mappedView = TAB_TO_VIEW[tab] || tab;
    setOdsState({ ...odsState, view: mappedView });
  }, [odsState, setOdsState]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'structure':
        return <StructureTab />;
      case 'principles':
        return <PrinciplesTab />;
      case 'methodology':
        return <MethodologyTab />;
      default:
        return (
          <TabPlaceholder
            tabId={activeTab}
            tabLabel={
              activeTab === 'strategy' ? 'Strategy'
              : activeTab === 'operating-model' ? 'Operating Model'
              : activeTab === 'accountability' ? 'Accountability'
              : activeTab === 'work-talent' ? 'Work & Talent'
              : 'Execution'
            }
          />
        );
    }
  };

  return (
    <StudioShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onBack={onBack}
    >
      {renderTabContent()}
    </StudioShell>
  );
}
