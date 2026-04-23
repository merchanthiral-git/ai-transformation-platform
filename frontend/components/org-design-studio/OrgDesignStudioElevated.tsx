"use client";
import React, { useState, useCallback } from "react";
import { StudioShell } from "./StudioShell";
import { CanvasSurface } from "./CanvasSurface";
import { SectionHead, Em, Gold } from "./SectionHead";
import { PullQuote } from "./PullQuote";
import { tokens, type TabId } from "./design-tokens";
import { StructureTab } from "./tabs/StructureTab";
import { PrinciplesTab } from "./tabs/PrinciplesTab";
import { MethodologyTab } from "./tabs/MethodologyTab";

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
        <div
          style={{
            marginTop: 32,
            padding: '20px 24px',
            background: tokens.color.ivoryCard,
            border: `1px dashed ${tokens.color.lineSoft}`,
            borderRadius: 9,
          }}
        >
          <div
            style={{
              fontFamily: tokens.font.mono,
              fontWeight: 600,
              fontSize: 9.5,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: tokens.color.inkMute,
              marginBottom: 8,
            }}
          >
            Coming in v0.4
          </div>
          <p style={{ fontSize: 13, color: tokens.color.inkSoft, margin: 0, lineHeight: 1.6 }}>
            This territory is mapped in the <span style={{ fontWeight: 600 }}>Methodology</span> tab.
            Switch to Methodology to see the full capability map and what&apos;s planned for this area.
          </p>
        </div>
      </div>
    </CanvasSurface>
  );
}

export function OrgDesignStudioElevated({ onBack, model, f, odsState, setOdsState, viewCtx, jobStates }: ElevatedProps) {
  const initialTab = VIEW_TO_TAB[odsState.view] || 'structure';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    const mappedView = TAB_TO_VIEW[tab] || tab;
    setOdsState({ ...odsState, view: mappedView });
  }, [odsState, setOdsState]);

  const renderTab = () => {
    switch (activeTab) {
      case 'structure': {
        const { leftRail, rightRail, canvas } = StructureTab();
        return { leftRail, rightRail, content: canvas };
      }
      case 'principles': {
        const pr = PrinciplesTab();
        return { leftRail: pr.leftRail, rightRail: pr.rightRail, content: pr.canvas };
      }
      case 'methodology':
        return { content: <MethodologyTab /> };
      default:
        return {
          content: (
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
          ),
        };
    }
  };

  const tabResult = renderTab();
  const leftRail = 'leftRail' in tabResult ? tabResult.leftRail : undefined;
  const rightRail = 'rightRail' in tabResult ? tabResult.rightRail : undefined;

  return (
    <StudioShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onBack={onBack}
      leftRail={leftRail}
      rightRail={rightRail}
    >
      {tabResult.content}
    </StudioShell>
  );
}
