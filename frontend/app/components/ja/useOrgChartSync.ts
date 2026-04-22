"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type SyncEventType =
  | "NODE_SELECTED"
  | "NODES_EXPANDED"
  | "FILTER_CHANGED"
  | "STATUS_FILTER_CHANGED"
  | "ROOT_CHANGED"
  | "HEARTBEAT";

interface SyncMessage {
  type: SyncEventType;
  payload: unknown;
  sender: string;
  ts: number;
}

interface SyncActions {
  setSelectedId: (id: string | null) => void;
  setExpandedIds: (ids: Set<string>) => void;
  setFuncFilter: (ids: Set<string>) => void;
  setStatusFilter: (v: string) => void;
  setRootId: (id: string) => void;
}

/* ═══════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════ */

export function useOrgChartSync(sessionId: string, actions: SyncActions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const senderIdRef = useRef<string>(
    `oc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const isRemoteUpdate = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<SyncMessage | null>(null);

  // ── Publish with 50ms debounce ──
  const publishRaw = useCallback((msg: SyncMessage) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const publish = useCallback(
    (type: SyncEventType, payload: unknown) => {
      if (isRemoteUpdate.current) return; // prevent echo
      const msg: SyncMessage = {
        type,
        payload,
        sender: senderIdRef.current,
        ts: Date.now(),
      };
      // Debounce NODES_EXPANDED; others go immediately
      if (type === "NODES_EXPANDED") {
        pendingRef.current = msg;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (pendingRef.current) publishRaw(pendingRef.current);
          pendingRef.current = null;
        }, 50);
      } else {
        publishRaw(msg);
      }
    },
    [publishRaw]
  );

  // ── Create channel and subscribe ──
  useEffect(() => {
    if (!sessionId) return;
    const channel = new BroadcastChannel(`orgchart_${sessionId}`);
    channelRef.current = channel;
    setIsConnected(true);

    // Send heartbeat to discover peers
    const hb = () =>
      channel.postMessage({
        type: "HEARTBEAT",
        payload: null,
        sender: senderIdRef.current,
        ts: Date.now(),
      } satisfies SyncMessage);

    // Track peers via heartbeat timestamps
    const peerMap = new Map<string, number>();
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of peerMap) {
        if (now - v > 5000) peerMap.delete(k);
      }
      setPeerCount(peerMap.size);
      hb();
    }, 2000);
    hb();

    channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
      const msg = ev.data;
      if (!msg || msg.sender === senderIdRef.current) return;

      // Track peer
      peerMap.set(msg.sender, msg.ts);
      setPeerCount(peerMap.size);

      if (msg.type === "HEARTBEAT") return;

      // Apply remote state
      isRemoteUpdate.current = true;
      try {
        switch (msg.type) {
          case "NODE_SELECTED":
            actions.setSelectedId(msg.payload as string | null);
            break;
          case "NODES_EXPANDED":
            actions.setExpandedIds(new Set(msg.payload as string[]));
            break;
          case "FILTER_CHANGED":
            actions.setFuncFilter(new Set(msg.payload as string[]));
            break;
          case "STATUS_FILTER_CHANGED":
            actions.setStatusFilter(msg.payload as string);
            break;
          case "ROOT_CHANGED":
            actions.setRootId(msg.payload as string);
            break;
        }
      } finally {
        // Use microtask to reset after React state updates are batched
        Promise.resolve().then(() => {
          isRemoteUpdate.current = false;
        });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
      setIsConnected(false);
      clearInterval(pruneInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // actions is expected to be stable (refs or memoized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return { publish, isConnected, peerCount, isRemoteUpdate };
}
