"use client";

import React from "react";
import { Loader2 } from "@/lib/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

// ── Style maps ────────────────────────────────────────────────────────────────

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2";

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--accent-primary)",
    color: "#fff",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid transparent",
  },
  destructive: {
    background: "var(--sem-risk-bg)",
    color: "var(--sem-risk)",
    border: "1px solid var(--sem-risk-border)",
  },
  link: {
    background: "transparent",
    color: "var(--accent-primary)",
    border: "1px solid transparent",
    padding: 0,
    height: "auto",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    textDecorationColor: "transparent",
    borderRadius: 0,
  },
};

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: "12px", height: "30px", padding: "0 10px", gap: "6px" },
  md: { fontSize: "13px", height: "36px", padding: "0 14px", gap: "8px" },
  lg: { fontSize: "15px", height: "44px", padding: "0 20px", gap: "10px" },
};

const ICON_SIZE: Record<ButtonSize, number> = {
  sm: 13,
  md: 15,
  lg: 17,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  className = "",
  type = "button",
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconPx = ICON_SIZE[size];

  const composedStyle: React.CSSProperties = {
    ...VARIANT_STYLES[variant],
    ...SIZE_STYLES[size],
    width: fullWidth ? "100%" : undefined,
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: [
      "background 200ms var(--ease-out)",
      "box-shadow 200ms var(--ease-out)",
      "transform 120ms var(--ease-spring)",
      "opacity 200ms var(--ease-out)",
      "text-decoration-color 150ms ease",
    ].join(", "),
  };

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    const el = e.currentTarget;
    if (variant === "primary") {
      el.style.filter = "brightness(1.08)";
    } else if (variant === "ghost") {
      el.style.background = "var(--hover)";
    } else if (variant === "secondary") {
      el.style.background = "var(--hover)";
    } else if (variant === "link") {
      el.style.textDecorationColor = "var(--accent-primary)";
    } else if (variant === "destructive") {
      el.style.background = "var(--sem-risk-bg)";
      el.style.filter = "brightness(1.1)";
    }
    if (variant !== "link") {
      el.style.transform = "translateY(-1px)";
      el.style.boxShadow = "var(--shadow-2)";
    }
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget;
    el.style.filter = "";
    el.style.background = (VARIANT_STYLES[variant].background as string) ?? "";
    el.style.transform = "";
    el.style.boxShadow = "";
    if (variant === "link") el.style.textDecorationColor = "transparent";
  }

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    if (variant !== "link") {
      e.currentTarget.style.transform = "scale(0.97) translateY(0)";
      e.currentTarget.style.boxShadow = "var(--shadow-1)";
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLButtonElement>) {
    if (variant !== "link") {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = "";
    }
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${BASE} ${className}`}
      style={composedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {loading ? (
        <Loader2
          size={iconPx}
          style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
        />
      ) : (
        leftIcon && (
          <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {leftIcon}
          </span>
        )
      )}

      {children}

      {!loading && rightIcon && (
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
}
