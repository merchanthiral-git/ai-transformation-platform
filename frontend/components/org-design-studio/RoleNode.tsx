"use client";
import React from "react";
import { tokens, FUNC_BANDS } from "./design-tokens";

export type RoleVariant = 'default' | 'root' | 'new' | 'moved' | 'eliminated' | 'aggregate';

export interface RoleNodeProps {
  title: string;
  sub?: string;
  fn?: string;
  om?: 'core' | 'enable' | 'shared';
  span?: number;
  variant?: RoleVariant;
  warn?: boolean;
  metrics?: { label: string; value: string }[];
  aggregateCount?: number;
  onClick?: () => void;
}

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  new: { bg: tokens.color.orangeWash, fg: tokens.color.orange },
  moved: { bg: tokens.color.blueWash, fg: tokens.color.blue },
  eliminated: { bg: tokens.color.dangerPale, fg: tokens.color.danger },
};

export function RoleNode({
  title, sub, fn, om, span, variant = 'default', warn, metrics, aggregateCount, onClick,
}: RoleNodeProps) {
  const band = fn ? FUNC_BANDS[fn] || FUNC_BANDS.exec : FUNC_BANDS.exec;
  const isRoot = variant === 'root';
  const isAggregate = variant === 'aggregate';
  const isEliminated = variant === 'eliminated';

  const bg = isRoot ? tokens.color.navy
    : variant === 'new' ? tokens.color.orangeWash
    : variant === 'moved' ? tokens.color.blueWash
    : isEliminated ? 'transparent'
    : isAggregate ? 'transparent'
    : tokens.color.ivoryCard;

  const border = isEliminated ? `1.5px dashed ${tokens.color.danger}`
    : variant === 'moved' ? `1.5px dashed ${tokens.color.blue}`
    : isAggregate ? `1.5px dashed ${tokens.color.navyLine}`
    : `1px solid ${tokens.color.line}`;

  const width = isRoot ? 240 : 160;

  return (
    <div
      onClick={onClick}
      style={{
        width,
        background: bg,
        border,
        borderRadius: 9,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: tokens.shadow.sm,
        transition: `box-shadow ${tokens.motion.fast} ${tokens.motion.ease}`,
      }}
    >
      {/* Function color band */}
      {!isAggregate && (
        <div
          style={{
            height: isRoot ? 4 : 3,
            borderRadius: '9px 9px 0 0',
            background: isRoot
              ? `linear-gradient(90deg, ${tokens.color.gold}, ${tokens.color.orange})`
              : `linear-gradient(90deg, ${band.from}, ${band.to})`,
          }}
        />
      )}

      {/* Badge */}
      {(variant === 'new' || variant === 'moved' || variant === 'eliminated') && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            left: 8,
            fontFamily: tokens.font.mono,
            fontWeight: 600,
            fontSize: 8,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 4,
            background: BADGE_COLORS[variant]?.bg || tokens.color.ivoryCard,
            color: BADGE_COLORS[variant]?.fg || tokens.color.ink,
            border: `1px solid ${BADGE_COLORS[variant]?.fg || tokens.color.line}`,
          }}
        >
          {variant === 'new' ? 'NEW' : variant === 'moved' ? 'MOVED' : 'EXIT'}
        </span>
      )}

      {/* Span warning */}
      {warn && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: tokens.color.danger,
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          !
        </span>
      )}

      {/* OM tag */}
      {om && !isRoot && !isAggregate && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 6,
            fontFamily: tokens.font.mono,
            fontWeight: 600,
            fontSize: 7.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '1px 4px',
            borderRadius: 3,
            background: om === 'core' ? tokens.color.bluePale
              : om === 'enable' ? tokens.color.greenPale
              : tokens.color.ivoryDeep,
            color: om === 'core' ? tokens.color.blue
              : om === 'enable' ? tokens.color.green
              : tokens.color.inkMute,
          }}
        >
          {om === 'core' ? 'C' : om === 'enable' ? 'E' : 'S'}
        </span>
      )}

      <div style={{ padding: isAggregate ? '16px 12px' : '10px 12px 10px' }}>
        {isAggregate ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: tokens.font.display,
                fontWeight: 300,
                fontSize: 28,
                color: tokens.color.navyLine,
              }}
            >
              {aggregateCount}
            </div>
            <div
              style={{
                fontFamily: tokens.font.mono,
                fontSize: 9,
                letterSpacing: '0.06em',
                color: tokens.color.inkMute,
              }}
            >
              +{aggregateCount} more
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '-0.008em',
                color: isRoot ? tokens.color.ivory : tokens.color.ink,
                textDecoration: isEliminated ? 'line-through' : undefined,
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            {sub && (
              <div
                style={{
                  fontSize: 10,
                  color: isRoot ? tokens.color.ivoryDeep : tokens.color.inkMute,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {sub}
              </div>
            )}
          </>
        )}
      </div>

      {/* Metrics footer */}
      {metrics && metrics.length > 0 && !isAggregate && (
        <div
          style={{
            borderTop: `1px solid ${isRoot ? 'rgba(255,255,255,0.15)' : tokens.color.lineFaint}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
            padding: '6px 12px 8px',
            gap: 8,
          }}
        >
          {metrics.map((m) => (
            <div key={m.label}>
              <div
                style={{
                  fontFamily: tokens.font.mono,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: isRoot ? tokens.color.ivory : tokens.color.ink,
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontFamily: tokens.font.mono,
                  fontWeight: 500,
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isRoot ? 'rgba(255,255,255,0.5)' : tokens.color.inkMute,
                }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
