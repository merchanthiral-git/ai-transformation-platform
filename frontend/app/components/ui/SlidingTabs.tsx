'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface SlidingTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function SlidingTabs({ tabs, activeTab, onTabChange, className = '' }: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const idx = tabs.indexOf(activeTab);
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button');
    if (buttons[idx]) {
      const rect = buttons[idx].getBoundingClientRect();
      const parentRect = containerRef.current.getBoundingClientRect();
      setPill({ left: rect.left - parentRect.left, width: rect.width });
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center rounded-xl p-1 ${className}`}
      style={{ background: 'rgba(14,20,36,0.6)', border: '1px solid var(--cr-border)' }}
    >
      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 rounded-lg"
        style={{
          left: pill.left,
          width: pill.width,
          background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
          transition: 'left 0.3s var(--ease-spring), width 0.3s var(--ease-spring)',
          zIndex: 0,
        }}
      />

      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="relative z-10 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
          style={{
            color: activeTab === tab ? 'var(--bg-void)' : 'var(--cr-text-dim)',
            fontFamily: "'Inter Tight', sans-serif",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
