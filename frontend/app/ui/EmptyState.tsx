"use client";

import React from "react";

interface ActionConfig {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  headline: string;
  explanation: string;
  primaryAction: ActionConfig;
  secondaryAction?: ActionConfig;
  previewGhost?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  headline,
  explanation,
  primaryAction,
  secondaryAction,
  previewGhost,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        minHeight: 320,
        overflow: "hidden",
      }}
    >
      {/* Ghost preview layer */}
      {previewGhost && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.3,
            pointerEvents: "none",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          {previewGhost}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          maxWidth: 400,
        }}
      >
        {/* Icon */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: "var(--surface-2)",
            color: "var(--text-muted)",
          }}
        >
          {icon}
        </span>

        {/* Text block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            {headline}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            {explanation}
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          {/* Primary — amber CTA */}
          <button
            type="button"
            onClick={primaryAction.onClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
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
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          >
            {primaryAction.icon && (
              <span style={{ display: "flex", alignItems: "center" }}>
                {primaryAction.icon}
              </span>
            )}
            {primaryAction.label}
          </button>

          {/* Secondary — ghost */}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
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
              {secondaryAction.icon && (
                <span style={{ display: "flex", alignItems: "center" }}>
                  {secondaryAction.icon}
                </span>
              )}
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmptyState;
