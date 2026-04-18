"use client";

import React from "react";
import { Sparkle, Pencil } from "@/lib/icons";

interface Finding {
  heading: string;
  body: string;
}

interface NarrativePanelProps {
  title: string;
  findings: Finding[];
  source?: string;
  editable?: boolean;
  onEdit?: () => void;
}

export function NarrativePanel({
  title,
  findings,
  source,
  editable = false,
  onEdit,
}: NarrativePanelProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--sem-insight-bg)",
        border: "1px solid var(--sem-insight-border)",
        borderRadius: 10,
        padding: "var(--card-padding, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--sem-insight)",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <Sparkle size={15} />
        </span>

        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-semi)",
              color: "var(--text-primary)",
              lineHeight: 1.3,
              flex: 1,
              minWidth: 0,
            }}
          >
            {title}
          </span>

          {source && (
            <span
              style={{
                fontSize: "var(--text-2xs)",
                fontWeight: "var(--fw-medium)",
                color: "var(--sem-insight)",
                backgroundColor: "var(--sem-insight-bg)",
                border: "1px solid var(--sem-insight-border)",
                borderRadius: 4,
                padding: "1px 6px",
                whiteSpace: "nowrap",
                lineHeight: 1.6,
              }}
            >
              {source}
            </span>
          )}

          {editable && onEdit && (
            <button
              onClick={onEdit}
              aria-label="Edit narrative"
              style={{
                display: "flex",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 2,
                borderRadius: 4,
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "color var(--duration-fast) var(--ease-out)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "var(--sem-insight)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
              }
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Findings list */}
      {findings.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            paddingLeft: 23,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {findings.map((finding, i) => (
            <li key={i} style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "var(--sem-insight)",
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--fw-medium)",
                    color: "var(--text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {finding.heading}
                </span>
                {finding.body && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.55,
                    }}
                  >
                    {finding.body}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NarrativePanel;
