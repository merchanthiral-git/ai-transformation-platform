"use client";

import React, { useRef } from "react";
import { Check, Lock } from "lucide-react";

type StageStatus = "locked" | "available" | "in-progress" | "complete";
type Orientation = "horizontal" | "vertical";

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  tooltip?: string;
}

interface StageStepperProps {
  stages: Stage[];
  active: string;
  onStageClick: (id: string) => void;
  orientation?: Orientation;
  className?: string;
}

function stageVisuals(
  status: StageStatus,
  isActive: boolean
): {
  ringColor: string;
  bgColor: string;
  iconColor: string;
  labelColor: string;
  borderWidth: number;
  cursor: string;
} {
  if (status === "complete") {
    return {
      ringColor: "var(--sem-success-border)",
      bgColor:   "var(--sem-success-bg)",
      iconColor: "var(--sem-success)",
      labelColor: "var(--text-primary)",
      borderWidth: 2,
      cursor: "pointer",
    };
  }
  if (status === "in-progress") {
    return {
      ringColor: "var(--accent-primary)",
      bgColor:   "var(--surface-1)",
      iconColor: "var(--accent-primary)",
      labelColor: "var(--text-primary)",
      borderWidth: 2,
      cursor: "pointer",
    };
  }
  if (status === "available") {
    return {
      ringColor: isActive ? "var(--accent-primary)" : "var(--border)",
      bgColor:   "var(--surface-2)",
      iconColor: "var(--text-muted)",
      labelColor: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      borderWidth: isActive ? 2 : 1,
      cursor: "pointer",
    };
  }
  // locked
  return {
    ringColor: "var(--border)",
    bgColor:   "var(--surface-2)",
    iconColor: "var(--text-muted)",
    labelColor: "var(--text-muted)",
    borderWidth: 1,
    cursor: "not-allowed",
  };
}

export function StageStepper({
  stages,
  active,
  onStageClick,
  orientation = "horizontal",
  className = "",
}: StageStepperProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    const idx = stages.findIndex((s) => s.id === id);
    const isHorizontal = orientation === "horizontal";

    const forwardKey  = isHorizontal ? "ArrowRight" : "ArrowDown";
    const backwardKey = isHorizontal ? "ArrowLeft"  : "ArrowUp";

    if (e.key === forwardKey) {
      e.preventDefault();
      for (let i = idx + 1; i < stages.length; i++) {
        if (stages[i].status !== "locked") {
          onStageClick(stages[i].id);
          break;
        }
      }
    } else if (e.key === backwardKey) {
      e.preventDefault();
      for (let i = idx - 1; i >= 0; i--) {
        if (stages[i].status !== "locked") {
          onStageClick(stages[i].id);
          break;
        }
      }
    }
  }

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      ref={listRef}
      className={className}
      role="tablist"
      aria-orientation={orientation}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: isHorizontal ? "center" : "flex-start",
        gap: 0,
        overflowX: isHorizontal ? "auto" : undefined,
      }}
    >
      {stages.map((stage, idx) => {
        const isActive = stage.id === active;
        const isLast   = idx === stages.length - 1;
        const v        = stageVisuals(stage.status, isActive);

        const nodeEl = (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={stage.status === "locked"}
            tabIndex={stage.status !== "locked" ? (isActive ? 0 : -1) : -1}
            title={stage.tooltip ?? stage.label}
            disabled={stage.status === "locked"}
            onClick={() => {
              if (stage.status !== "locked") onStageClick(stage.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, stage.id)}
            style={{
              display: "flex",
              flexDirection: isHorizontal ? "column" : "row",
              alignItems: "center",
              gap: isHorizontal ? 6 : 10,
              background: "none",
              border: "none",
              padding: isHorizontal ? "0 8px" : "8px 0",
              cursor: v.cursor,
              outline: "none",
              flexShrink: 0,
            }}
          >
            {/* Circle node */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `${v.borderWidth}px solid ${v.ringColor}`,
                backgroundColor: v.bgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow:
                  status === "in-progress" || isActive
                    ? `0 0 0 3px color-mix(in srgb, ${v.ringColor} 20%, transparent)`
                    : undefined,
                transition: "border-color var(--duration-fast) var(--ease-out)",
              }}
            >
              {stage.status === "complete" && (
                <Check size={14} style={{ color: v.iconColor }} />
              )}
              {stage.status === "locked" && (
                <Lock size={12} style={{ color: v.iconColor }} />
              )}
              {(stage.status === "available" || stage.status === "in-progress") && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: v.iconColor,
                    lineHeight: 1,
                  }}
                >
                  {idx + 1}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: v.labelColor,
                whiteSpace: "nowrap",
                maxWidth: isHorizontal ? 80 : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: isHorizontal ? "center" : "left",
                lineHeight: 1.3,
              }}
            >
              {stage.label}
            </span>
          </button>
        );

        if (isLast) return nodeEl;

        // Connector line between stages
        return (
          <React.Fragment key={stage.id}>
            {nodeEl}
            <div
              aria-hidden
              style={{
                flexShrink: 0,
                backgroundColor: "var(--border)",
                width:  isHorizontal ? 24 : 1,
                height: isHorizontal ? 1  : 20,
                alignSelf: isHorizontal ? "flex-start" : "flex-start",
                marginTop: isHorizontal ? 16 : 0,
                marginLeft: isHorizontal ? 0 : 16,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StageStepper;
