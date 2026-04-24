"use client";
import React from "react";
import { tokens } from "./design-tokens";

export function CanvasSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
        background: `radial-gradient(ellipse at top left, #151821 0%, #0B0D12 100%)`,
      }}
    >
      {/* Dot grid pattern */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
}

/** Color-tinted card utility. Semantic meaning via background + border tinting. */
export function TintedCard({
  children,
  tint,
  className,
  style: extraStyle,
}: {
  children: React.ReactNode;
  tint: 'green' | 'amber' | 'blue' | 'red' | 'orange' | 'neutral';
  className?: string;
  style?: React.CSSProperties;
}) {
  const TINT_MAP: Record<string, { bg: string; border: string; label: string }> = {
    green:   { bg: 'rgba(61,220,151,0.06)', border: 'rgba(61,220,151,0.15)', label: '#3DDC97' },
    amber:   { bg: 'rgba(245,196,81,0.06)', border: 'rgba(245,196,81,0.15)', label: '#F5C451' },
    blue:    { bg: 'rgba(91,141,239,0.06)', border: 'rgba(91,141,239,0.15)', label: '#5B8DEF' },
    red:     { bg: 'rgba(255,90,95,0.06)',  border: 'rgba(255,90,95,0.15)',  label: '#FF5A5F' },
    orange:  { bg: 'rgba(255,138,61,0.06)', border: 'rgba(255,138,61,0.15)', label: '#FF8A3D' },
    neutral: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', label: '#9BA1B0' },
  };
  const t = TINT_MAP[tint] || TINT_MAP.neutral;

  return (
    <div
      className={className}
      style={{
        background: t.bg,
        border: `0.5px solid ${t.border}`,
        borderRadius: 10,
        padding: '14px 18px',
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}

/** Mono metadata label — uppercase, spaced, 9px. The system's "metadata voice". */
export function MonoLabel({ children, style: extraStyle }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: tokens.font.mono,
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: tokens.color.inkMute,
      ...extraStyle,
    }}>
      {children}
    </span>
  );
}

/** Status pill with halo dot */
export function StatusPill({ label, color, active }: { label: string; color: string; active?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 20,
      border: `0.5px solid rgba(${color === '#3DDC97' ? '61,220,151' : color === '#F5C451' ? '245,196,81' : color === '#FF8A3D' ? '255,138,61' : '91,141,239'},0.2)`,
      background: `rgba(${color === '#3DDC97' ? '61,220,151' : color === '#F5C451' ? '245,196,81' : color === '#FF8A3D' ? '255,138,61' : '91,141,239'},0.08)`,
      fontSize: 11,
      fontWeight: 500,
      color,
    }}>
      {active && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 0 3px rgba(${color === '#3DDC97' ? '61,220,151' : color === '#F5C451' ? '245,196,81' : color === '#FF8A3D' ? '255,138,61' : '91,141,239'},0.2)`,
        }} />
      )}
      {label}
    </span>
  );
}

/** Primary CTA button with gradient + glow */
export function PrimaryButton({ children, onClick, disabled, style: extraStyle }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 18px',
        borderRadius: 8,
        border: 'none',
        background: 'linear-gradient(180deg, #FF8A3D, #E06A20)',
        boxShadow: '0 4px 16px rgba(255,138,61,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: tokens.font.body,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: `opacity 150ms ease`,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

/** Secondary button — quiet */
export function SecondaryButton({ children, onClick, style: extraStyle }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 7,
        border: '0.5px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.04)',
        color: tokens.color.inkSoft,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: tokens.font.body,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}
