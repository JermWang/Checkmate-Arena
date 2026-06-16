import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../../contracts/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.DEV ? "http://localhost:3001" : window.location.origin
);

export interface ArenaStats {
  /** Players currently waiting in the ranked matchmaking queue. */
  inQueue: number;
  /** Distinct wallets connected to the arena right now. */
  online: number;
  /** Live matches in progress. */
  liveMatches: number;
  /** Whether the stats socket is currently connected. */
  live: boolean;
}

const DEFAULT_STATS: ArenaStats = { inQueue: 0, online: 0, liveMatches: 0, live: false };

const ArenaStatsContext = createContext<ArenaStats>(DEFAULT_STATS);

/**
 * Opens a single, app-wide socket purely to read live arena activity (queue
 * size, players online, live matches) and shares it via context. Keeping it in
 * one place means the navbar, landing page, and play screen all reflect the
 * same numbers without each opening its own connection.
 */
export function ArenaStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<ArenaStats>(DEFAULT_STATS);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SOCKET_URL,
      { path: "/socket.io" }
    );

    const requestStats = () => {
      setStats((s) => ({ ...s, live: true }));
      socket.emit("queue:stats");
    };

    socket.on("connect", requestStats);
    socket.on("disconnect", () => setStats((s) => ({ ...s, live: false })));
    socket.on("queue:stats", ({ inQueue, online, liveMatches }) => {
      setStats({ inQueue, online, liveMatches, live: true });
    });

    // Safety-net poll in case an event-driven update is missed.
    const interval = window.setInterval(() => {
      if (socket.connected) socket.emit("queue:stats");
    }, 5000);

    return () => {
      window.clearInterval(interval);
      socket.close();
    };
  }, []);

  return <ArenaStatsContext.Provider value={stats}>{children}</ArenaStatsContext.Provider>;
}

export function useArenaStats(): ArenaStats {
  return useContext(ArenaStatsContext);
}
