import { useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { Link } from "react-router";
import { Coins, Filter, Plus, Lock, FlaskConical, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateWagerDialog } from "@/components/wager/CreateWagerDialog";
import { IS_PLACEHOLDER } from "@/config/wager";

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

export default function Lobby() {
  const { connected, connect } = useWallet();
  const [tc, setTc] = useState("Any");
  const [band, setBand] = useState(STAKE_BANDS[0]);
  const [createOpen, setCreateOpen] = useState(false);

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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Public wager lobby
            </h1>
            <p className="text-sm text-[#8A8F98] mt-1">
              Open challenges. Accept any to lock the matching stake.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/lobby/private"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white/5 transition-all"
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
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

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <table className="w-full">
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
