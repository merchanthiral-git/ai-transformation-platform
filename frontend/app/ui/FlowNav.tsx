"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "@/lib/icons";

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FlowNavProps {
  previous: NavItem | null;
  next: NavItem | null;
  onNavigate: (id: string) => void;
  className?: string;
}

export function FlowNav({ previous, next, onNavigate, className = "" }: FlowNavProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "12px 0",
        borderTop: "1px solid var(--border)",
        gap: 8,
      }}
    >
      {/* Previous — ghost */}
      {previous ? (
        <button
          type="button"
          onClick={() => onNavigate(previous.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 7,
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontWeight: 500,
            fontSize: 14,
            border: "1px solid var(--border)",
            cursor: "pointer",
            lineHeight: 1,
            transition: "background-color var(--duration-fast) var(--ease-out)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--hover)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")
          }
        >
          {previous.icon ? (
            <span style={{ display: "flex", alignItems: "center" }}>{previous.icon}</span>
          ) : (
            <ChevronLeft size={15} />
          )}
          {previous.label}
        </button>
      ) : (
        /* Spacer so Next stays right-aligned */
        <div />
      )}

      {/* Next — amber */}
      {next ? (
        <button
          type="button"
          onClick={() => onNavigate(next.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 7,
            backgroundColor: "var(--accent-primary)",
            color: "#000",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            lineHeight: 1,
            boxShadow: "var(--shadow-1)",
            transition: "opacity var(--duration-fast) var(--ease-out)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
          }
        >
          {next.label}
          {next.icon ? (
            <span style={{ display: "flex", alignItems: "center" }}>{next.icon}</span>
          ) : (
            <ChevronRight size={15} />
          )}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

export default FlowNav;
