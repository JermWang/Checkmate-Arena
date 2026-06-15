import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { Link } from "react-router";
import { Coins, Filter, Plus, Lock, FlaskConical, Shield, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateWagerDialog } from "@/components/wager/CreateWagerDialog";
import { IS_PLACEHOLDER } from "@/config/wager";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, LiveMatchSummary, ServerToClientEvents } from "../../contracts/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.DEV ? "http://localhost:3001" : window.location.origin
);

type Color = "white" | "black" | "random";
interface Challenge {
  id: string;
  handle: string;
  initials: string;
  bg: string;
  rating: number;
  stake: number;
  tc: string;
  color: Color;
}

const SEED: Challenge[] = [
  { id: "1", handle: "vladkasp",   initials: "VK", bg: "bg-[#3C3489] text-[#CECBF6]", rating: 1842, stake: 10000, tc: "3+0",  color: "white"  },
  { id: "2", handle: "queennight", initials: "QN", bg: "bg-[#0F6E56] text-[#9FE1CB]", rating: 1604, stake: 5000,  tc: "5+3",  color: "black"  },
  { id: "3", handle: "pawnxxx",    initials: "PX", bg: "bg-[#993C1D] text-[#F5C4B3]", rating: 1431, stake: 1000,  tc: "3+0",  color: "random" },
  { id: "4", handle: "checkstop",  initials: "CK", bg: "bg-[#72243E] text-[#F4C0D1]", rating: 1987, stake: 50000, tc: "10+5", color: "white"  },
  { id: "5", handle: "rookxox",    initials: "RX", bg: "bg-[#3C3489] text-[#CECBF6]", rating: 1295, stake: 500,   tc: "1+0",  color: "random" },
];

const TC_FILTERS = ["Any", "1+0", "3+0", "5+3", "10+5"];
const STAKE_BANDS = [
  { label: "All",     min: 0,     max: Infinity },
  { label: "100–1k",  min: 100,   max: 1000     },
  { label: "1k–10k",  min: 1000,  max: 10000    },
  { label: "10k+",    min: 10000, max: Infinity },
];

function shortWallet(value: string, length = 6) {
  return `${value.slice(0, length)}...${value.slice(-4)}`;
}

export default function Lobby() {
  const { connected, connect } = useWallet();
  const [tc, setTc] = useState("Any");
  const [band, setBand] = useState(STAKE_BANDS[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [liveMatches, setLiveMatches] = useState<LiveMatchSummary[]>([]);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SOCKET_URL,
      { path: "/socket.io" }
    );

    const requestMatches = () => {
      socket.emit("spectate:list");
    };

    socket.on("connect", requestMatches);
    socket.on("spectate:list", ({ matches }) => {
      setLiveMatches(matches);
    });
    socket.on("match:spectator_count", ({ matchId, viewers }) => {
      setLiveMatches((matches) =>
        matches.map((match) => (match.matchId === matchId ? { ...match, viewers } : match))
      );
    });

    const interval = window.setInterval(requestMatches, 4000);

    return () => {
      window.clearInterval(interval);
      socket.close();
    };
  }, []);

  const filtered = SEED.filter(
    (c) =>
      (tc === "Any" || c.tc === tc) &&
      c.stake >= band.min &&
      c.stake <= band.max
  );

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-6">
          <Shield className="w-16 h-16 text-[#14F195] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Connect to enter the lobby</h1>
          <p className="text-[#8A8F98] mb-6">
            Wagered matches require a connected wallet. Ranked is free — wagering is opt-in.
          </p>
          <Button
            onClick={connect}
            className="bg-[#14F195] text-black hover:bg-[#14F195]/90"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        {IS_PLACEHOLDER && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#14F195]/30 bg-[#14F195]/[0.05] px-3 py-2 text-xs font-mono text-[#14F195]">
            <FlaskConical className="w-3.5 h-3.5" />
            Practice pot — $CHESS launches soon. Wagers settle in a placeholder mint until then.
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Public wager lobby
            </h1>
            <p className="text-sm text-[#8A8F98] mt-1">
              Open challenges. Accept any to lock the matching stake.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              to="/lobby/private"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white/5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              Private room
            </Link>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#14F195] text-black hover:bg-[#14F195]/90"
            >
              <Plus className="w-4 h-4" />
              Create challenge
            </Button>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div>
              <h2 className="text-sm font-medium">Live matches</h2>
              <p className="text-xs text-[#8A8F98]">Spectate active boards and live viewer counts.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#8A8F98]">
              <Eye className="h-3.5 w-3.5 text-[#14F195]" />
              {liveMatches.length}
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {liveMatches.length === 0 ? (
              <div className="px-4 py-5 text-sm text-[#8A8F98]">No live matches yet.</div>
            ) : (
              liveMatches.map((match) => (
                <div
                  key={match.matchId}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-white">
                      {shortWallet(match.whiteWallet)} vs {shortWallet(match.blackWallet)}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8F98]">
                      Match #{match.matchId} · {match.moveCount} moves
                    </p>
                  </div>
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[#8A8F98]">
                    <Eye className="h-3.5 w-3.5 text-[#14F195]" />
                    {match.viewers} watching
                  </div>
                  <Link
                    to={`/play?spectate=${match.matchId}`}
                    className="inline-flex w-fit items-center justify-center rounded-full bg-[#14F195] px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-[#14F195]/90"
                  >
                    Spectate
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Filters */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8A8F98]" />
            {STAKE_BANDS.map((b) => (
              <Chip
                key={b.label}
                on={band.label === b.label}
                onClick={() => setBand(b)}
              >
                {b.label}
              </Chip>
            ))}
            <div className="mx-2 h-4 w-px bg-white/10" />
            {TC_FILTERS.map((t) => (
              <Chip key={t} on={tc === t} onClick={() => setTc(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#8A8F98]">
                <th className="px-4 py-3 font-normal">Player</th>
                <th className="px-4 py-3 font-normal">Rating</th>
                <th className="px-4 py-3 font-normal">Stake</th>
                <th className="px-4 py-3 font-normal">Time</th>
                <th className="px-4 py-3 font-normal">Color</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-white/5 transition-colors hover:bg-[#14F195]/[0.03]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-medium ${c.bg}`}
                      >
                        {c.initials}
                      </div>
                      <span className="text-sm">{c.handle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#8A8F98]">
                    {c.rating}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-[#14F195] inline-flex items-center gap-1.5">
                      <Coins className="w-3 h-3" />
                      {c.stake.toLocaleString()} $CHESS
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#8A8F98]">
                    {c.tc}
                  </td>
                  <td className="px-4 py-3">
                    <ColorDot color={c.color} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      className="bg-[#14F195] text-black hover:bg-[#14F195]/90"
                    >
                      Accept
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-[#8A8F98]">
              No open challenges match your filters. Create one.
            </div>
          )}
        </div>
      </div>

      <CreateWagerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="public"
      />
    </div>
  );
}

function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode;
  on?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-all ${
        on
          ? "border-[#14F195]/60 bg-[#14F195]/15 text-[#14F195]"
          : "border-white/10 bg-white/[0.02] text-[#8A8F98] hover:border-white/30"
      }`}
    >
      {children}
    </button>
  );
}

function ColorDot({ color }: { color: Color }) {
  if (color === "white")
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20 bg-white" />
    );
  if (color === "black")
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20 bg-[#1A1A24]" />
    );
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full border border-white/20"
      style={{ background: "linear-gradient(90deg, #fff 50%, #1A1A24 50%)" }}
    />
  );
}
