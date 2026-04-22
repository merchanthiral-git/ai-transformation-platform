'use client';

import type { ReactNode } from 'react';
import VistaScene from './VistaScene';
import VistaHud from './VistaHud';

interface VistaSurfaceProps {
  children?: ReactNode;
  compact?: boolean;
  className?: string;
  showHud?: boolean;
}

/**
 * Opt-in wrapper that renders the Vista landscape behind its children.
 * Used for hero banners, sidebar cards, and any section that wants
 * the illustrated world visible. All other pages use solid --app-bg.
 *
 * Adds a .vista-surface class so child .glass-card and .kpi-glass
 * elements automatically get the glass (blur) variant.
 */
export default function VistaSurface({
  children,
  compact = false,
  className = '',
  showHud = false,
}: VistaSurfaceProps) {
  return (
    <div
      className={`vista-surface relative overflow-hidden ${className}`}
      style={{
        minHeight: compact ? 200 : 400,
        borderRadius: compact ? 16 : 0,
      }}
    >
      {/* Vista scene — positioned absolute within this container */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div className="relative w-full h-full overflow-hidden">
          <VistaScene />
        </div>
      </div>

      {/* Readability vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: compact
            ? 'linear-gradient(to bottom, transparent 40%, rgba(15,18,32,0.6) 100%)'
            : 'linear-gradient(to bottom, transparent 20%, rgba(15,18,32,0.4) 60%, rgba(15,18,32,0.85) 100%)',
        }}
      />

      {/* HUD (optional) */}
      {showHud && (
        <div className="absolute top-3 right-3" style={{ zIndex: 3 }}>
          <VistaHud />
        </div>
      )}

      {/* Content over the scene */}
      {children && (
        <div className="relative" style={{ zIndex: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}
