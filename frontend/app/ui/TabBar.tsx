"use client";

import React, { useRef } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

type TabVariant = "pill" | "underline";

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  variant: TabVariant;
  className?: string;
}

export function TabBar({
  tabs,
  active,
  onChange,
  variant,
  className = "",
}: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent, currentId: string) {
    const idx = tabs.findIndex((t) => t.id === currentId);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabs[(idx + 1) % tabs.length];
      onChange(next.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      onChange(prev.id);
    }
  }

  if (variant === "pill") {
    return (
      <div
        ref={listRef}
        role="tablist"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          backgroundColor: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: 3,
          gap: 2,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                backgroundColor: isActive ? "var(--surface-1)" : "transparent",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                cursor: "pointer",
                boxShadow: isActive ? "var(--shadow-1)" : "none",
                transition:
                  "background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
                whiteSpace: "nowrap",
                lineHeight: 1,
                outline: "none",
              }}
            >
              {tab.icon && (
                <span style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant
  return (
    <div
      ref={listRef}
      role="tablist"
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-end",
        borderBottom: "1px solid var(--border)",
        gap: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--accent-primary)"
                : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              transition: "color var(--duration-fast) var(--ease-out)",
              whiteSpace: "nowrap",
              lineHeight: 1,
              outline: "none",
            }}
          >
            {tab.icon && (
              <span style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
