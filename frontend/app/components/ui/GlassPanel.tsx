import type { ReactNode, HTMLAttributes } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hot?: boolean;
  variant?: 'solid' | 'glass';
  className?: string;
}

export function GlassPanel({ children, hot = false, variant = 'solid', className = '', ...rest }: GlassPanelProps) {
  const isGlass = variant === 'glass';

  return (
    <div
      className={`
        rounded-2xl p-5
        transition-all duration-[240ms]
        ${isGlass ? 'backdrop-blur-[24px]' : ''}
        ${hot
          ? 'border border-[var(--border-hot)]'
          : 'border border-[var(--border)]'
        }
        hover:border-[var(--border-hot)]
        ${className}
      `}
      style={{
        transitionTimingFunction: 'var(--ease-spring)',
        background: isGlass
          ? (hot ? 'var(--bg-panel-hover)' : 'var(--paper)')
          : (hot ? 'var(--surface-2)' : 'var(--paper-solid)'),
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
