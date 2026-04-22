import type { ReactNode, HTMLAttributes } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hot?: boolean;
  className?: string;
}

export function GlassPanel({ children, hot = false, className = '', ...rest }: GlassPanelProps) {
  return (
    <div
      className={`
        rounded-2xl backdrop-blur-[24px] p-5
        transition-all duration-[240ms]
        ${hot
          ? 'border border-[var(--cr-border-hot)] bg-[var(--bg-panel-hover)]'
          : 'border border-[var(--cr-border)] bg-[var(--bg-panel)]'
        }
        hover:border-[var(--cr-border-hot)] hover:bg-[var(--bg-panel-hover)]
        ${className}
      `}
      style={{ transitionTimingFunction: 'var(--ease-spring)' }}
      {...rest}
    >
      {children}
    </div>
  );
}
