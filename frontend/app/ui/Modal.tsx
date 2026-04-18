"use client";

import React, {
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { X } from "@/lib/icons";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  title,
  isOpen,
  onClose,
  children,
  footer,
  maxWidth = "600px",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Basic focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
      // Auto-focus close button
      requestAnimationFrame(() => firstFocusRef.current?.focus());
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
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
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 501,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth,
            maxHeight: "min(80vh, calc(100vh - 80px))",
            backgroundColor: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
            animation: "modalFadeIn var(--duration-slow) var(--ease-out) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <span
              id="modal-title"
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--fw-semi)",
                color: "var(--text-primary)",
              }}
            >
              {title}
            </span>
            <button
              ref={firstFocusRef}
              onClick={onClose}
              aria-label="Close modal"
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

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Modal;
