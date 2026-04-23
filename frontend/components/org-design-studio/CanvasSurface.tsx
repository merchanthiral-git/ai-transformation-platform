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
        background: `radial-gradient(ellipse at 18% 20%, rgba(14,71,184,0.025) 0%, transparent 50%), radial-gradient(ellipse at 82% 80%, rgba(214,97,26,0.025) 0%, transparent 50%), ${tokens.color.ivory}`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${tokens.color.lineFaint} 1px, transparent 1px), linear-gradient(90deg, ${tokens.color.lineFaint} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          opacity: 0.45,
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
