import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { getRatingBucket } from "@/config/game";
import { User, Trophy, Swords, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";

export default function Profile() {
  const { wallet } = useParams<{ wallet: string }>();
  const { data: profile, isLoading } = trpc.match.profile.useQuery(
    { walletAddress: wallet! },
    { enabled: !!wallet }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="w-8 h-8 border-2 border-[#14F195] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center">
          <User className="w-12 h-12 text-[#8A8F98] mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Player Not Found</h1>
          <p className="text-[#8A8F98] mb-4">No player found with this wallet address.</p>
          <Link to="/" className="text-[#14F195] hover:underline">Back to Arena</Link>
        </div>
      </div>
    );
  }

  const totalGames = profile.lifetimeWins + profile.lifetimeLosses + profile.lifetimeDraws;
  const winRate = totalGames > 0 ? ((profile.lifetimeWins / totalGames) * 100).toFixed(1) : "0";
  const bucket = getRatingBucket(profile.currentRating);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8">
        {/* Back link */}
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>

        {/* Profile Header */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#14F195]/20 to-[#9945FF]/20 flex items-center justify-center">
              <User className="w-8 h-8 text-[#14F195]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {profile.username || `${profile.walletAddress.slice(0, 8)}...${profile.walletAddress.slice(-4)}`}
              </h1>
              <p className="text-sm text-[#8A8F98] font-mono">{profile.walletAddress}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#8A8F98]">Rating</span>
              <p className="text-3xl font-bold text-[#14F195]">{profile.currentRating}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Games" value={totalGames.toString()} icon={<Swords className="w-4 h-4" />} />
          <StatCard label="Win Rate" value={`${winRate}%`} icon={<TrendingUp className="w-4 h-4" />} iconColor="text-[#14F195]" />
          <StatCard label="Current Streak" value={profile.currentStreak.toString()} icon={<Trophy className="w-4 h-4" />} />
          <StatCard label="Bucket" value={bucket} icon={<Trophy className="w-4 h-4 text-yellow-400" />} iconColor="text-yellow-400" />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Wins" value={profile.lifetimeWins.toString()} iconColor="text-[#14F195]" />
          <StatCard label="Losses" value={profile.lifetimeLosses.toString()} iconColor="text-red-400" />
          <StatCard label="Draws" value={profile.lifetimeDraws.toString()} iconColor="text-[#8A8F98]" />
        </div>

        {/* Recent Matches */}
        <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Swords className="w-5 h-5 text-[#14F195]" />
              Recent Matches
            </h2>
          </div>
          {profile.recentMatches.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#8A8F98]">
              <p>No matches played yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {profile.recentMatches.map((match) => (
                <div key={match.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    {match.won ? (
                      <TrendingUp className="w-4 h-4 text-[#14F195]" />
                    ) : match.resultType === "draw" ? (
                      <Minus className="w-4 h-4 text-[#8A8F98]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{match.resultType}</p>
                      <p className="text-xs text-[#8A8F98] font-mono">vs {match.opponent.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-mono ${match.ratingChange > 0 ? "text-[#14F195]" : match.ratingChange < 0 ? "text-red-400" : "text-[#8A8F98]"}`}>
                      {match.ratingChange > 0 ? "+" : ""}{match.ratingChange}
                    </span>
                    {match.endedAt && (
                      <p className="text-xs text-[#8A8F98]">{new Date(match.endedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reward History */}
        {profile.rewardHistory.length > 0 && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#14F195]" />
                Reward History
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {profile.rewardHistory.map((reward, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium">Epoch #{reward.epochId}</p>
                    <p className="text-xs text-[#8A8F98]">Rank {reward.rank}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-[#14F195]">{reward.amount.toFixed(2)} SOL</p>
                    <p className="text-xs text-[#8A8F98]">{reward.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconColor }: { label: string; value: string; icon?: React.ReactNode; iconColor?: string }) {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={iconColor}>{icon}</span>}
        <span className="text-xs text-[#8A8F98]">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
