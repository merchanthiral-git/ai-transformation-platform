/**
 * Real-time collaboration client.
 * Connects to the backend Socket.IO server and provides hooks for
 * presence, editing indicators, state broadcast, and activity feed.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

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

// ── Singleton socket ──

let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io({
      path: "/ws/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
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
  const socketRef = useRef<Socket | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const joinedRef = useRef(false);

  // Connect and join
  useEffect(() => {
    if (!projectId || !userId) return;

    const socket = getSocket();
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

    const onDisconnect = () => {
      setConnected(false);
      joinedRef.current = false;
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

    return () => {
      socket.emit("leave_project", { project_id: projectId });
      joinedRef.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence", onPresence);
      socket.off("activity_feed", onActivityFeed);
      socket.off("activity_update", onActivityUpdate);
      socket.off("remote_change", onRemoteChangeEvt);
      socket.disconnect();
    };
  }, [projectId, userId, username, displayName]);

  // Track tab changes
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("tab_change", { tab: currentTab });
  }, [currentTab]);

  // ── Actions ──

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
