/**
 * Real-time collaboration client.
 * Connects to the backend Socket.IO server and provides hooks for
 * presence, editing indicators, state broadcast, and activity feed.
 *
 * DISABLED by default. Set NEXT_PUBLIC_COLLAB_ENABLED=true to activate.
 * When disabled, all exports are no-ops so consuming components don't crash.
 */

import { useEffect, useRef, useCallback, useState } from "react";

// ── Types ──

export interface CollabUser {
  user_id: string;
  username: string;
  display_name: string;
  active_tab: string;
  color: string;
  editing: { module: string; started_at: number } | null;
}

export interface ActivityEntry {
  id: string;
  type: "join" | "leave" | "change";
  kind?: string;
  user_id: string;
  username: string;
  display_name: string;
  message: string;
  summary?: string;
  detail?: string;
  timestamp: string;
}

export interface RemoteChange {
  user_id: string;
  display_name: string;
  kind: string;
  summary: string;
  detail?: string;
}

// ── Feature gate ──

const COLLAB_ENABLED = process.env.NEXT_PUBLIC_COLLAB_ENABLED === "true";

// ── Singleton socket (lazy, only if enabled) ──

let _socket: import("socket.io-client").Socket | null = null;
let _failedPermanently = false;

async function getSocket(): Promise<import("socket.io-client").Socket | null> {
  if (!COLLAB_ENABLED || _failedPermanently) return null;

  if (!_socket) {
    // Dynamic import — socket.io-client is only loaded when collaboration is enabled
    const { io } = await import("socket.io-client");
    _socket = io({
      path: "/ws/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
    });

    // After exhausting retries, stop permanently to avoid console spam
    let errorCount = 0;
    _socket.on("connect_error", () => {
      errorCount++;
      if (errorCount >= 3) {
        console.warn("[Collab] Server unavailable, running in offline mode");
        _failedPermanently = true;
        _socket?.disconnect();
        _socket = null;
      }
    });
  }
  return _socket;
}

// ── Hook ──

export function useCollaboration(opts: {
  projectId: string;
  userId: string;
  username: string;
  displayName: string;
  currentTab: string;
  onRemoteChange?: (change: RemoteChange) => void;
}) {
  const { projectId, userId, username, displayName, currentTab, onRemoteChange } = opts;
  const [presence, setPresence] = useState<CollabUser[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const joinedRef = useRef(false);

  // Connect and join
  useEffect(() => {
    if (!projectId || !userId || !COLLAB_ENABLED || _failedPermanently) return;

    let cancelled = false;

    getSocket().then((socket) => {
      if (cancelled || !socket) return;
      socketRef.current = socket;

      const onConnect = () => {
        setConnected(true);
        if (!joinedRef.current) {
          socket.emit("join_project", {
            user_id: userId,
            username,
            display_name: displayName,
            project_id: projectId,
          });
          joinedRef.current = true;
        }
      };

      const onDisconnect = (reason: string) => {
        setConnected(false);
        joinedRef.current = false;
        if (reason === "io server disconnect" || reason === "transport close") {
          console.warn("[Collab] Disconnected:", reason);
        }
      };

      const onPresence = (users: CollabUser[]) => {
        setPresence(users.filter(u => u.user_id !== userId));
      };

      const onActivityFeed = (entries: ActivityEntry[]) => {
        setActivity(entries);
      };

      const onActivityUpdate = (entry: ActivityEntry) => {
        setActivity(prev => [...prev.slice(-49), entry]);
      };

      const onRemoteChangeEvt = (change: RemoteChange) => {
        onRemoteChangeRef.current?.(change);
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("presence", onPresence);
      socket.on("activity_feed", onActivityFeed);
      socket.on("activity_update", onActivityUpdate);
      socket.on("remote_change", onRemoteChangeEvt);

      if (!socket.connected) {
        socket.connect();
      } else {
        onConnect();
      }
    });

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave_project", { project_id: projectId });
        joinedRef.current = false;
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [projectId, userId, username, displayName]);

  // Track tab changes
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("tab_change", { tab: currentTab });
  }, [currentTab]);

  // ── Actions (no-ops when disconnected) ──

  const broadcastChange = useCallback((kind: string, summary: string, detail?: string) => {
    socketRef.current?.emit("state_change", { kind, summary, detail });
  }, []);

  const startEditing = useCallback((module: string) => {
    socketRef.current?.emit("editing_start", { module });
  }, []);

  const stopEditing = useCallback(() => {
    socketRef.current?.emit("editing_stop", {});
  }, []);

  return {
    presence,
    activity,
    connected,
    broadcastChange,
    startEditing,
    stopEditing,
  };
}
