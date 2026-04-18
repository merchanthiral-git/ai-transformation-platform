"use client";

import React, { ReactNode, useEffect, useCallback } from "react";
import { X } from "@/lib/icons";

interface DrilldownDrawerProps {
  title: string;
  anchor?: "right" | "bottom";
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function DrilldownDrawer({
  title,
  anchor = "right",
  isOpen,
  onClose,
  children,
}: DrilldownDrawerProps) {
  // Esc key handler
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  const isRight = anchor === "right";

  const drawerStyle: React.CSSProperties = isRight
    ? {
        position: "fixed",
        top: 0,
        right: 0,
        height: "100%",
        width: "min(420px, 92vw)",
        backgroundColor: "var(--surface-1)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-4)",
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        animation: "drawerSlideRight var(--duration-slow) var(--ease-out) forwards",
      }
    : {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "min(60vh, 520px)",
        backgroundColor: "var(--surface-1)",
        borderTop: "1px solid var(--border)",
        boxShadow: "var(--shadow-4)",
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        animation: "drawerSlideBottom var(--duration-slow) var(--ease-out) forwards",
      };

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes drawerSlideRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
        @keyframes drawerSlideBottom {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
      `}</style>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "var(--overlay-bg)",
          zIndex: 399,
          animation: "fadeIn var(--duration-base) var(--ease-out) forwards",
        }}
      />

      {/* Drawer panel */}
      <div role="dialog" aria-modal="true" aria-label={title} style={drawerStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--fw-semi)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              background: "none",
              border: "none",
              borderRadius: 6,
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "background var(--duration-fast) var(--ease-out)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "")
            }
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 18,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export default DrilldownDrawer;
