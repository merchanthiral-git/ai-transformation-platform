"use client";

import React, { ReactNode, useState, useRef, useId } from "react";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: TooltipSide;
}

const OFFSET = 8;

function getPositionStyles(
  side: TooltipSide,
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number
): React.CSSProperties {
  switch (side) {
    case "top":
      return {
        top: rect.top + window.scrollY - tipHeight - OFFSET,
        left: rect.left + window.scrollX + rect.width / 2 - tipWidth / 2,
      };
    case "bottom":
      return {
        top: rect.bottom + window.scrollY + OFFSET,
        left: rect.left + window.scrollX + rect.width / 2 - tipWidth / 2,
      };
    case "left":
      return {
        top: rect.top + window.scrollY + rect.height / 2 - tipHeight / 2,
        left: rect.left + window.scrollX - tipWidth - OFFSET,
      };
    case "right":
      return {
        top: rect.top + window.scrollY + rect.height / 2 - tipHeight / 2,
        left: rect.right + window.scrollX + OFFSET,
      };
  }
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const show = () => {
    if (!triggerRef.current) return;
    setVisible(true);
    // Position on next frame so tip dimensions are available
    requestAnimationFrame(() => {
      if (!triggerRef.current || !tipRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const tip = tipRef.current.getBoundingClientRect();
      setPos(getPositionStyles(side, rect, tip.width, tip.height));
    });
  };

  const hide = () => setVisible(false);

  return (
    <>
      <span
        ref={triggerRef}
        aria-describedby={id}
        style={{ display: "inline-flex" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>

      <div
        ref={tipRef}
        id={id}
        role="tooltip"
        style={{
          position: "absolute",
          zIndex: 600,
          pointerEvents: "none",
          maxWidth: 220,
          padding: "5px 9px",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-medium)",
          color: "var(--text-primary)",
          backgroundColor: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          boxShadow: "var(--shadow-2)",
          lineHeight: 1.4,
          whiteSpace: "normal",
          wordBreak: "break-word",
          opacity: visible ? 1 : 0,
          transition: `opacity var(--duration-fast) var(--ease-out)`,
          ...pos,
        }}
      >
        {content}
      </div>
    </>
  );
}

export default Tooltip;
