import { trpc } from "@/providers/trpc";
import { Gift, Clock, Trophy, Wallet } from "lucide-react";

export default function Rewards() {
  const { data: currentReward, isLoading: rewardLoading } = trpc.rewards.current.useQuery();
  const { data: history } = trpc.rewards.history.useQuery({ limit: 10 });

  const timeRemaining = currentReward?.timeRemaining ?? 0;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Gift className="w-8 h-8 text-[#14F195]" />
            Rewards
          </h1>
          <p className="text-[#8A8F98] mt-1">
            50% of creator fees distributed to top 10 players every 24 hours
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current Epoch Card */}
          <div className="p-6 rounded-xl border border-[#14F195]/20 bg-gradient-to-br from-[#14F195]/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#14F195]" />
              <h2 className="text-lg font-semibold">Current Epoch</h2>
            </div>

            {rewardLoading ? (
              <div className="py-8 text-center text-[#8A8F98]">
                <div className="w-6 h-6 border-2 border-[#14F195] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : currentReward && currentReward.status !== "no_epoch" ? (
              <div className="space-y-4">
                {/* Countdown */}
                <div className="text-center py-4">
                  <p className="text-xs text-[#8A8F98] uppercase tracking-widest mb-2">Payout In</p>
                  <div className="flex items-center justify-center gap-2">
                    <TimeBox value={hours} label="HRS" />
                    <span className="text-2xl text-[#14F195]">:</span>
                    <TimeBox value={minutes} label="MIN" />
                    <span className="text-2xl text-[#14F195]">:</span>
                    <TimeBox value={seconds} label="SEC" />
                  </div>
                </div>

                {/* Reward Pool */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#8A8F98]">Reward Pool</span>
                    <span className="text-2xl font-bold text-[#14F195]">
                      {currentReward.rewardPool.toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8A8F98]">
                    <span>Creator Fees</span>
                    <span>{currentReward.creatorFees?.toFixed(2)} SOL</span>
                  </div>
                </div>

                {/* Payout Distribution */}
                <div>
                  <p className="text-xs text-[#8A8F98] uppercase tracking-widest mb-3">Estimated Payouts</p>
                  <div className="space-y-1.5">
                    {currentReward.estimatedPayouts?.slice(0, 5).map((p) => (
                      <div key={p.rank} className="flex items-center gap-3">
                        <span className="text-xs text-[#8A8F98] w-6">{p.rank}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#14F195] rounded-full"
                            style={{ width: `${(p.percentage / 25) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-16 text-right">{p.amount.toFixed(2)} SOL</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#8A8F98]">
                <p>No active epoch found.</p>
              </div>
            )}
          </div>

          {/* Payout Rules */}
          <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-[#14F195]" />
              <h2 className="text-lg font-semibold">Payout Distribution</h2>
            </div>

            <div className="space-y-2">
              {[
                { rank: "1st", pct: "25%", desc: "Top player takes the throne" },
                { rank: "2nd", pct: "18%", desc: "Runner up still cashes in" },
                { rank: "3rd", pct: "14%", desc: "Bronze pays the bills" },
                { rank: "4th", pct: "10%", desc: "Solid reward for skill" },
                { rank: "5th", pct: "8%", desc: "Top half gets paid" },
                { rank: "6th", pct: "7%", desc: "Consistency rewarded" },
                { rank: "7th", pct: "6%", desc: "Keep grinding" },
                { rank: "8th", pct: "5%", desc: "Earn your spot" },
                { rank: "9th", pct: "4%", desc: "Top 10 earns" },
                { rank: "10th", pct: "3%", desc: "Every bit counts" },
              ].map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#14F195] w-12">{item.rank}</span>
                    <span className="text-xs text-[#8A8F98]">{item.desc}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold">{item.pct}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs text-[#8A8F98]">
                <span>Leaderboard Pool</span>
                <span className="text-[#14F195]">50%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A8F98] mt-1">
                <span>Treasury</span>
                <span>30%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A8F98] mt-1">
                <span>Seasonal Pool</span>
                <span>10%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A8F98] mt-1">
                <span>Reserve</span>
                <span>10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payout History */}
        {history && history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#14F195]" />
              Recent Payouts
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[100px_1fr_120px_100px] gap-4 px-4 py-3 bg-white/[0.03] text-xs text-[#8A8F98] uppercase tracking-wider sm:px-6">
                  <span>Epoch</span>
                  <span>Winners</span>
                  <span className="text-right">Pool</span>
                  <span className="text-right">Date</span>
                </div>
                {history.map((epoch) => (
                  <div key={epoch.epochId} className="grid grid-cols-[100px_1fr_120px_100px] gap-4 px-4 py-3 border-t border-white/5 hover:bg-white/[0.02] sm:px-6">
                    <span className="text-sm font-mono">#{epoch.epochId}</span>
                    <div className="flex items-center gap-2">
                      {epoch.winners.slice(0, 3).map((w, i) => (
                        <span key={i} className="text-xs text-[#8A8F98] font-mono">
                          {w.walletAddress.slice(0, 6)}...
                        </span>
                      ))}
                      {epoch.winners.length > 3 && (
                        <span className="text-xs text-[#8A8F98]">+{epoch.winners.length - 3}</span>
                      )}
                    </div>
                    <span className="text-sm font-mono text-right text-[#14F195]">{epoch.totalPool.toFixed(2)} SOL</span>
                    <span className="text-xs text-[#8A8F98] text-right">
                      {new Date(epoch.endsAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-mono font-bold text-white">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-[10px] text-[#8A8F98] mt-1 tracking-widest">{label}</p>
    </div>
  );
}
