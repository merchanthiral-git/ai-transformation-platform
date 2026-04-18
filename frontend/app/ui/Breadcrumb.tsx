"use client";

import React from "react";

interface BreadcrumbSegment {
  label: string;
  id?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (id: string) => void;
  className?: string;
}

export function Breadcrumb({ segments, onNavigate, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {segments.map((segment, idx) => {
          const isLast    = idx === segments.length - 1;
          const isFirst   = idx === 0;
          const clickable = !isLast && segment.id !== undefined;

          return (
            <li
              key={`${segment.id ?? segment.label}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
              }}
            >
              {!isFirst && (
                <span
                  aria-hidden
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 12,
                    padding: "0 5px",
                    userSelect: "none",
                    lineHeight: 1,
                  }}
                >
                  /
                </span>
              )}

              {clickable ? (
                <button
                  type="button"
                  onClick={() => onNavigate(segment.id!)}
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    lineHeight: 1,
                    textDecoration: "none",
                    transition: "color var(--duration-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
                  }
                >
                  {segment.label}
                </button>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  style={{
                    fontSize: 12,
                    fontWeight: isLast ? 600 : 400,
                    color: isLast ? "var(--text-primary)" : "var(--text-muted)",
                    lineHeight: 1,
                    cursor: "default",
                  }}
                >
                  {segment.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
