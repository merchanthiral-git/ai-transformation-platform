"use client";
import React from "react";
import { tokens } from "./design-tokens";
import type { SandboxProfile } from "@/data/org-design/sandbox-profiles";

export function SandboxGate({
  profile,
  children,
  onNavigateToSandbox,
}: {
  profile: SandboxProfile | null;
  children: React.ReactNode;
  onNavigateToSandbox?: () => void;
}) {
  if (profile) return <>{children}</>;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: tokens.color.ivory,
        fontFamily: tokens.font.body,
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 500, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: tokens.font.mono,
            fontWeight: 600,
            fontSize: 9.5,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: tokens.color.inkMute,
            marginBottom: 16,
          }}
        >
          Org Design Studio
        </div>
        <h1
          style={{
            fontFamily: tokens.font.display,
            fontWeight: 300,
            fontSize: 32,
            letterSpacing: '-0.02em',
            color: tokens.color.ink,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}
        >
          Select a sandbox to explore the Studio
        </h1>
        <p
          style={{
            fontSize: 14,
            color: tokens.color.inkSoft,
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}
        >
          The Org Design Studio is populated from the active sandbox. Pick a company
          to see its current and future state, principles positioning, and archetype
          recommendation.
        </p>
        {onNavigateToSandbox && (
          <button
            onClick={onNavigateToSandbox}
            style={{
              height: 36,
              padding: '0 20px',
              borderRadius: 7,
              border: 'none',
              background: tokens.color.navy,
              color: tokens.color.ivory,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: tokens.font.body,
              cursor: 'pointer',
            }}
          >
            Select a sandbox company
          </button>
        )}
      </div>
    </div>
  );
}
