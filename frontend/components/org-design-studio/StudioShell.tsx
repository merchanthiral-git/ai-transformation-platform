"use client";
import React, { useState } from "react";
import { tokens, TABS, type TabId } from "./design-tokens";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";

const PAPER_NOISE = `url("data:image/svg+xml;utf8,<svg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.02 0 0 0 0 0.08 0 0 0 0 0.19 0 0 0 0.09 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

export interface StudioShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
  clientName?: string;
  profile?: SandboxProfile | null;
  onBack?: () => void;
}

function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: `radial-gradient(circle at 70% 70%, rgba(214,97,26,0.35), transparent 60%), ${tokens.color.navy}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: tokens.font.display,
            fontStyle: 'italic',
            fontSize: 14,
            fontWeight: 400,
            color: tokens.color.ivory,
            lineHeight: 1,
          }}
        >
          hr
        </span>
      </div>
      <div>
        <div
          style={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: 14,
            color: tokens.color.ink,
            lineHeight: 1.2,
          }}
        >
          HR Digital Playground
        </div>
        <div
          style={{
            fontFamily: tokens.font.mono,
            fontWeight: 500,
            fontSize: 9.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: tokens.color.inkMute,
            lineHeight: 1,
          }}
        >
          Org Design Studio
        </div>
      </div>
    </div>
  );
}

function EngagementChip({ profile, onSwitchSandbox }: { profile?: SandboxProfile | null; onSwitchSandbox?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const clientName = profile?.company || 'No sandbox';

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setDropdownOpen(false); }}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          borderRadius: 20,
          border: `0.5px solid rgba(255,255,255,0.06)`,
          background: tokens.color.ivoryCard,
          fontSize: 12,
          fontWeight: 500,
          color: tokens.color.ink,
          cursor: 'pointer',
          transition: `border-color ${tokens.motion.fast} ${tokens.motion.ease}`,
          ...(hovered ? { borderColor: tokens.color.orange } : {}),
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: tokens.color.green,
            boxShadow: `0 0 0 2px ${tokens.color.greenPale}`,
            animation: 'studioPulse 2s ease-in-out infinite',
          }}
        />
        {clientName}
        <span style={{ color: tokens.color.inkMute }}>&middot;</span>
        <span style={{ color: tokens.color.green, fontSize: 11 }}>Active</span>
      </div>

      {/* Hover popover */}
      {hovered && !dropdownOpen && profile && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          padding: '10px 14px', borderRadius: 9,
          background: tokens.color.ivoryCard, border: `0.5px solid rgba(255,255,255,0.06)`,
          boxShadow: tokens.shadow.md, zIndex: 80, minWidth: 200,
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: tokens.font.display, fontSize: 14, fontWeight: 450, color: tokens.color.ink }}>{profile.company}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 6 }}>
            {profile.ticker && <div><span style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, letterSpacing: '0.08em' }}>TICKER</span><div style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: tokens.color.ink }}>{profile.ticker}</div></div>}
            <div><span style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, letterSpacing: '0.08em' }}>INDUSTRY</span><div style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: tokens.color.ink }}>{profile.industry}</div></div>
            <div><span style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, letterSpacing: '0.08em' }}>CAP</span><div style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: tokens.color.ink }}>{profile.cap}</div></div>
            <div><span style={{ fontFamily: tokens.font.mono, fontSize: 8.5, color: tokens.color.inkMute, letterSpacing: '0.08em' }}>HEADCOUNT</span><div style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 600, color: tokens.color.ink }}>{profile.headcount.toLocaleString()}</div></div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setDropdownOpen(false); }}
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            padding: 6, borderRadius: 9,
            background: tokens.color.ivoryCard, border: `0.5px solid rgba(255,255,255,0.06)`,
            boxShadow: tokens.shadow.md, zIndex: 80, minWidth: 180,
          }}
        >
          <button
            onClick={() => { setDropdownOpen(false); onSwitchSandbox?.(); }}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, border: 'none',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              fontSize: 12, fontWeight: 500, color: tokens.color.ink,
              fontFamily: tokens.font.body,
            }}
          >
            Switch Sandbox
          </button>
        </div>
      )}
    </div>
  );
}

export function StudioButton({
  children,
  variant = 'default',
  onClick,
  style: extraStyle,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'ivory' | 'ghost';
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    height: 32,
    padding: '0 13px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: tokens.font.body,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
    position: 'relative',
    overflow: 'hidden',
  };

  const variants: Record<string, React.CSSProperties> = {
    default: {
      background: tokens.color.ivoryCard,
      color: tokens.color.ink,
      border: `0.5px solid rgba(255,255,255,0.06)`,
    },
    primary: {
      background: tokens.color.navy,
      color: tokens.color.ivory,
      border: '1px solid transparent',
    },
    ivory: {
      background: tokens.color.ivory,
      color: tokens.color.navy,
      border: `0.5px solid rgba(255,255,255,0.06)`,
    },
    ghost: {
      background: 'transparent',
      color: tokens.color.inkSoft,
      border: '1px solid transparent',
    },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...extraStyle }}
    >
      {children}
    </button>
  );
}

export function StudioShell({
  activeTab,
  onTabChange,
  leftRail,
  rightRail,
  children,
  clientName,
  profile,
  onBack,
}: StudioShellProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: tokens.color.ivory,
        color: tokens.color.ink,
        fontFamily: tokens.font.body,
        fontSize: 13,
        WebkitFontSmoothing: 'antialiased',
        zIndex: 50,
      }}
    >
      {/* Pulse animation */}
      <style>{`
        @keyframes studioPulse {
          0%, 100% { box-shadow: 0 0 0 2px ${tokens.color.greenPale}; }
          50% { box-shadow: 0 0 0 5px ${tokens.color.greenPale}; }
        }
      `}</style>

      {/* Top bar */}
      <header
        style={{
          height: 52,
          minHeight: 52,
          background: tokens.color.ivoryPaper,
          borderBottom: `0.5px solid rgba(255,255,255,0.06)`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          position: 'relative',
          zIndex: 60,
        }}
      >
        {/* Back button */}
        {onBack && (
          <>
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                color: tokens.color.inkMute,
              }}
              aria-label="Back"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div style={{ width: 1, height: 20, background: tokens.color.lineSoft }} />
          </>
        )}

        <BrandMark />

        <div style={{ width: 1, height: 20, background: tokens.color.lineSoft, margin: '0 4px' }} />

        {/* Tab nav */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                background: activeTab === t.id ? tokens.color.ivoryCard : 'transparent',
                border: activeTab === t.id ? `0.5px solid rgba(255,255,255,0.1)` : '1px solid transparent',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: activeTab === t.id ? 600 : 450,
                fontFamily: tokens.font.body,
                color: activeTab === t.id ? tokens.color.ink : tokens.color.inkMute,
                cursor: 'pointer',
                transition: `all ${tokens.motion.fast} ${tokens.motion.ease}`,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EngagementChip profile={profile} onSwitchSandbox={onBack} />
        </div>
      </header>

      {/* Workspace grid */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left rail */}
        {leftRail && (
          <aside
            style={{
              width: 280,
              minWidth: 280,
              borderRight: `0.5px solid rgba(255,255,255,0.1)`,
              background: tokens.color.ivoryPaper,
              overflowY: 'auto',
              padding: 16,
            }}
          >
            {leftRail}
          </aside>
        )}

        {/* Main canvas */}
        <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {children}
        </main>

        {/* Right rail */}
        {rightRail && (
          <aside
            style={{
              width: 340,
              minWidth: 340,
              borderLeft: `0.5px solid rgba(255,255,255,0.1)`,
              background: tokens.color.ivoryPaper,
              overflowY: 'auto',
              padding: 16,
            }}
          >
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}
