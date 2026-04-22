'use client';

import { useEffect, useRef, useState } from 'react';

interface HeroTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function HeroTitle({ eyebrow, title, subtitle, className = '' }: HeroTitleProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const words = title.split(' ');

  return (
    <div ref={ref} className={`${className}`}>
      {eyebrow && (
        <div
          className="font-jetbrains uppercase tracking-widest mb-3"
          style={{
            fontSize: 11,
            color: 'var(--amber)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {eyebrow}
        </div>
      )}

      <h1 className="font-heading" style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.15, letterSpacing: -1 }}>
        {words.map((word, i) => (
          <span
            key={i}
            className="inline-block mr-[0.3em]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s var(--ease-spring) ${i * 0.08}s`,
              color: i % 4 === 1 ? 'var(--amber)' : 'var(--ink)',
              fontStyle: i % 4 === 1 ? 'italic' : 'normal',
            }}
          >
            {word}
          </span>
        ))}
      </h1>

      {subtitle && (
        <p
          className="mt-3"
          style={{
            fontSize: 17,
            color: 'var(--ink-soft)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s`,
            maxWidth: 600,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
