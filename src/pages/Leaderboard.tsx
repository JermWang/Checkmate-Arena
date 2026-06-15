import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Trophy, Medal, Crown, Swords, Clock } from "lucide-react";
import { getRatingBucket } from "@/config/game";

export default function Leaderboard() {
  const [view, setView] = useState<"daily" | "lifetime">("daily");
  const { data: dailyPlayers, isLoading: dailyLoading } = trpc.leaderboard.daily.useQuery({ limit: 100 });
  const { data: lifetimePlayers, isLoading: lifetimeLoading } = trpc.leaderboard.lifetime.useQuery({ limit: 100 });
  const { data: epochData } = trpc.rewards.current.useQuery();

  const players = view === "daily" ? dailyPlayers : lifetimePlayers;
  const isLoading = view === "daily" ? dailyLoading : lifetimeLoading;

  const timeRemaining = epochData?.timeRemaining ?? 0;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-[#14F195]" />
              Leaderboard
            </h1>
            <p className="text-[#8A8F98] mt-1">
              {view === "daily" ? "Daily rankings reset every 24 hours" : "All-time rated players"}
            </p>
          </div>

          {/* Epoch countdown */}
          {epochData && epochData.status !== "no_epoch" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#14F195]/20 bg-[#14F195]/5">
              <Clock className="w-5 h-5 text-[#14F195]" />
              <div>
                <p className="text-xs text-[#8A8F98]">Next payout in</p>
                <p className="text-lg font-mono font-bold text-[#14F195]">
                  {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView("daily")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              view === "daily"
                ? "bg-[#14F195] text-black"
                : "border border-white/10 text-[#8A8F98] hover:border-white/20"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView("lifetime")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              view === "lifetime"
                ? "bg-[#14F195] text-black"
                : "border border-white/10 text-[#8A8F98] hover:border-white/20"
            }`}
          >
            Lifetime
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_120px_100px_100px] md:grid-cols-[80px_1fr_120px_120px_120px_120px] gap-4 px-4 md:px-6 py-3 bg-white/[0.03] text-xs text-[#8A8F98] uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="text-right">{view === "daily" ? "Score" : "Wins"}</span>
            <span className="text-right hidden md:block">{view === "daily" ? "W/L/D" : "Games"}</span>
            <span className="text-right hidden md:block">Bucket</span>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-6 py-12 text-center text-[#8A8F98]">
              <div className="w-6 h-6 border-2 border-[#14F195] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : players && players.length > 0 ? (
            <div className="divide-y divide-white/5">
              {players.map((player, i) => (
                <div
                  key={player.walletAddress}
                  className={`grid grid-cols-[60px_1fr_120px_100px_100px] md:grid-cols-[80px_1fr_120px_120px_120px_120px] gap-4 px-4 md:px-6 py-3 items-center hover:bg-white/[0.02] transition-colors ${
                    i < 3 ? "bg-[#14F195]/[0.02]" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-center">
                    {i === 0 ? (
                      <Crown className="w-5 h-5 text-yellow-400" />
                    ) : i === 1 ? (
                      <Medal className="w-5 h-5 text-gray-300" />
                    ) : i === 2 ? (
                      <Medal className="w-5 h-5 text-amber-600" />
                    ) : (
                      <span className="text-sm text-[#8A8F98] ml-1">{i + 1}</span>
                    )}
                  </div>

                  {/* Player */}
                  <div>
                    <p className="text-sm font-medium">
                      {player.username || `${player.walletAddress.slice(0, 6)}...${player.walletAddress.slice(-4)}`}
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold">{player.rating}</span>
                  </div>

                  {/* Score/Wins */}
                  <div className="text-right">
                    <span className="text-sm text-[#14F195]">
                      {view === "daily" ? (player as any).score : (player as any).wins}
                    </span>
                  </div>

                  {/* W/L/D or Games */}
                  <div className="text-right hidden md:block">
                    <span className="text-xs text-[#8A8F98]">
                      {view === "daily"
                        ? `${(player as any).wins}/${(player as any).losses}/${(player as any).draws}`
                        : (player as any).gamesPlayed}
                    </span>
                  </div>

                  {/* Bucket */}
                  <div className="text-right hidden md:block">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#8A8F98]">
                      {getRatingBucket(player.rating)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[#8A8F98]">
              <Swords className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No players yet. Be the first to play!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
