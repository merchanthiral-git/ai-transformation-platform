"use client";
import React from "react";
import { tokens } from "./design-tokens";

export function PullQuote({
  children,
  attribution,
}: {
  children: React.ReactNode;
  attribution?: string;
}) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${tokens.color.gold}`,
        background: tokens.color.ivoryWash,
        padding: '16px 20px',
        borderRadius: '0 7px 7px 0',
      }}
    >
      <p
        style={{
          fontFamily: tokens.font.display,
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: 13,
          lineHeight: 1.6,
          color: tokens.color.ink,
          margin: 0,
        }}
      >
        {children}
      </p>
      {attribution && (
        <span
          style={{
            display: 'block',
            marginTop: 8,
            fontFamily: tokens.font.mono,
            fontWeight: 500,
            fontSize: 9.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: tokens.color.inkMute,
          }}
        >
          {attribution}
        </span>
      )}
    </div>
  );
}
