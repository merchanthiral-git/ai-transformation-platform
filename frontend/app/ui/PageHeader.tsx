"use client";

import React from "react";

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  methodology?: React.ReactNode;
  density?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  methodology,
  density,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 16,
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
      }}
    >
      {/* Top row: icon + title/subtitle + controls */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Icon */}
        {icon && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 9,
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {icon}
          </div>
        )}

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              letterSpacing: "-0.3px",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Right controls */}
        {(methodology || density || actions) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {methodology}
            {density}
            {actions}
          </div>
        )}
      </div>

      {/* Optional children slot (e.g., TabBar, ContextStrip) */}
      {children && <div>{children}</div>}
    </header>
  );
}

export default PageHeader;
