"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "@/lib/icons";
import OrgChart from "../../../../components/ja/OrgChart";

export default function OrgChartPopoutPage() {
  const searchParams = useSearchParams();
  const model = searchParams.get("model") || "";
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);

  // Signal to opener that popout has loaded
  useEffect(() => {
    setReady(true);
  }, []);

  const handleSyncStatus = useCallback((s: boolean) => {
    setSynced(s);
  }, []);

  if (!model) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#e8ecf5", color: "rgba(5,7,13,0.5)",
        fontSize: 14,
      }}>
        Missing model parameter.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#e8ecf5", overflow: "hidden" }}>
      {/* Slim top bar */}
      <div style={{
        display: "flex", alignItems: "center", height: 40, padding: "0 16px",
        background: "#fff", borderBottom: "0.5px solid rgba(5,7,13,0.12)",
        flexShrink: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#05070d", whiteSpace: "nowrap" }}>
          Org Chart &middot; Popout
        </span>

        {/* Sync status */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: !ready ? "#fbbf24" : synced ? "#22C55E" : "#94A3B8",
          }} />
          <span style={{ fontSize: 11, color: "rgba(5,7,13,0.5)" }}>
            {!ready ? "Loading..." : synced ? "Synced" : "Standalone"}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => window.close()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", fontSize: 11, fontWeight: 500,
            border: "0.5px solid rgba(5,7,13,0.15)", borderRadius: 6,
            background: "#fff", color: "#05070d", cursor: "pointer",
          }}
          title="Close popout"
        >
          <X size={11} /> Close
        </button>
      </div>

      {/* Chart fills remaining space */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <OrgChart model={model} isPopout onSyncStatus={handleSyncStatus} />
      </div>
    </div>
  );
}
