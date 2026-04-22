'use client';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
  syncLabel?: string;
  className?: string;
}

export function TopBar({ breadcrumbs, syncLabel, className = '' }: TopBarProps) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${className}`}
      style={{
        background: 'var(--paper)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span style={{ color: 'var(--ink-whisper)' }}>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--amber)',
                    boxShadow: '0 0 6px var(--amber-glow)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{crumb.label}</span>
              </span>
            ) : (
              <span style={{ color: 'var(--ink-faint)' }}>{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      {syncLabel && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(139,168,122,0.1)',
            border: '1px solid rgba(139,168,122,0.2)',
            color: 'var(--sage)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sage)' }} />
          {syncLabel}
        </div>
      )}
    </div>
  );
}
