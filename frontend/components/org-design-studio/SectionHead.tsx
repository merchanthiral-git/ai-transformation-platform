"use client";
import React from "react";
import { tokens } from "./design-tokens";

export function SectionHead({
  eyebrow,
  headline,
  support,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  support?: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: support ? '1fr 340px' : '1fr', gap: 40, marginBottom: 40 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: tokens.font.mono,
              fontWeight: 600,
              fontSize: 9.5,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: tokens.color.inkMute,
            }}
          >
            {eyebrow}
          </span>
          <span
            style={{
              display: 'inline-block',
              width: 50,
              height: 1,
              background: tokens.color.line,
            }}
          />
        </div>
        <h2
          style={{
            fontFamily: tokens.font.display,
            fontWeight: 300,
            fontSize: 40,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            color: tokens.color.ink,
            margin: 0,
          }}
        >
          {headline}
        </h2>
      </div>
      {support && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: tokens.color.inkSoft,
            maxWidth: 340,
            paddingTop: 32,
            margin: 0,
          }}
        >
          {support}
        </p>
      )}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: tokens.font.mono,
        fontWeight: 600,
        fontSize: 9.5,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: tokens.color.inkMute,
      }}
    >
      {children}
    </span>
  );
}

export function Em({ children }: { children: React.ReactNode }) {
  return (
    <em
      style={{
        fontFamily: tokens.font.display,
        fontStyle: 'italic',
        fontWeight: 400,
        color: tokens.color.orange,
      }}
    >
      {children}
    </em>
  );
}

export function Gold({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        textDecoration: 'underline',
        textDecorationColor: tokens.color.gold,
        textDecorationThickness: 1,
        textUnderlineOffset: 5,
      }}
    >
      {children}
    </span>
  );
}
