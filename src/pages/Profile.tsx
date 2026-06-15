import { useState } from "react";
import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { getRatingBucket } from "@/config/game";
import { useWallet } from "@/components/wallet/WalletProvider";
import { avatarUrl, displayName, shortWallet, avatarPresets } from "@/lib/profile";
import {
  User, Trophy, Swords, TrendingUp, TrendingDown, Minus, ArrowLeft,
  Pencil, Coins, Flame, Target,
} from "lucide-react";

export default function Profile() {
  const { wallet } = useParams<{ wallet: string }>();
  const { walletAddress } = useWallet();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = trpc.profile.get.useQuery(
    { walletAddress: wallet! },
    { enabled: !!wallet }
  );

  const isOwner = !!walletAddress && walletAddress === wallet;

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
          {isOwner ? (
            <button onClick={() => setEditing(true)} className="text-[#14F195] hover:underline">
              Create your profile
            </button>
          ) : (
            <Link to="/" className="text-[#14F195] hover:underline">Back to Arena</Link>
          )}
        </div>
        {editing && wallet && (
          <ProfileEditor wallet={wallet} initial={{ username: null, bio: null, avatar: null }} onClose={() => setEditing(false)} />
        )}
      </div>
    );
  }

  const winRate = profile.winRate.toFixed(1);
  const bucket = getRatingBucket(profile.currentRating);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>

        {/* Header */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] mb-6">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl(profile.avatar, profile.walletAddress)}
              alt=""
              className="w-16 h-16 rounded-full bg-white/5 border border-white/10 object-cover"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {displayName(profile.username, profile.walletAddress)}
              </h1>
              <p className="text-sm text-[#8A8F98] font-mono truncate">{profile.walletAddress}</p>
              {profile.bio && <p className="text-sm text-white/70 mt-1">{profile.bio}</p>}
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-[#8A8F98]">Rating</span>
              <p className="text-3xl font-bold text-[#14F195]">{profile.currentRating}</p>
            </div>
            {isOwner && (
              <button
                onClick={() => setEditing(true)}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/15 text-xs hover:bg-white/5 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total Games" value={profile.totalGames.toString()} icon={<Swords className="w-4 h-4" />} />
          <StatCard label="Win Rate" value={`${winRate}%`} icon={<Target className="w-4 h-4" />} iconColor="text-[#14F195]" />
          <StatCard label="Streak" value={profile.currentStreak.toString()} icon={<Flame className="w-4 h-4" />} iconColor="text-orange-400" />
          <StatCard label="Bucket" value={bucket} icon={<Trophy className="w-4 h-4" />} iconColor="text-yellow-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Wins" value={profile.lifetimeWins.toString()} iconColor="text-[#14F195]" />
          <StatCard label="Losses" value={profile.lifetimeLosses.toString()} iconColor="text-red-400" />
          <StatCard label="Draws" value={profile.lifetimeDraws.toString()} iconColor="text-[#8A8F98]" />
          <StatCard label="Earnings" value={`${profile.totalEarnings.toLocaleString()}`} icon={<Coins className="w-4 h-4" />} iconColor="text-[#14F195]" />
          <StatCard label="Wagered" value={`${profile.totalWagered.toLocaleString()}`} icon={<Coins className="w-4 h-4" />} />
        </div>

        {/* Head-to-head matchups */}
        {profile.topMatchups.length > 0 && (
          <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-[#14F195]" />
                Matchups
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {profile.topMatchups.map((m) => (
                <div key={m.opponent} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                  <Link to={`/profile/${m.opponent}`} className="flex items-center gap-3 min-w-0 group">
                    <img src={avatarUrl(null, m.opponent)} alt="" className="w-8 h-8 rounded-full bg-white/5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-[#14F195] transition-colors">
                        {displayName(m.opponentName, m.opponent)}
                      </p>
                      <p className="text-xs text-[#8A8F98]">{m.games} games</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 text-sm font-mono shrink-0">
                    <span className="text-[#14F195]">{m.wins}W</span>
                    <span className="text-red-400">{m.losses}L</span>
                    <span className="text-[#8A8F98]">{m.draws}D</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent matches */}
        <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Swords className="w-5 h-5 text-[#14F195]" />
              Recent Matches
            </h2>
          </div>
          {profile.recentMatches.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#8A8F98]"><p>No matches played yet.</p></div>
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
                      <p className="text-sm font-medium capitalize">
                        {match.resultType}
                        {match.stakeAmount > 0 && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-yellow-300">Wager</span>
                        )}
                      </p>
                      <Link to={`/profile/${match.opponent}`} className="text-xs text-[#8A8F98] font-mono hover:text-[#14F195]">
                        vs {shortWallet(match.opponent)}
                      </Link>
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

      {editing && wallet && (
        <ProfileEditor
          wallet={wallet}
          initial={{ username: profile.username, bio: profile.bio, avatar: profile.avatar }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function ProfileEditor({
  wallet,
  initial,
  onClose,
}: {
  wallet: string;
  initial: { username: string | null; bio: string | null; avatar: string | null };
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [username, setUsername] = useState(initial.username ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatar, setAvatar] = useState(initial.avatar ?? "");
  const presets = avatarPresets(wallet);

  const update = trpc.profile.update.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate({ walletAddress: wallet });
      onClose();
    },
  });

  const save = () => {
    update.mutate({
      walletAddress: wallet,
      username: username.trim() ? username.trim() : null,
      bio: bio.trim() ? bio.trim() : null,
      avatar: avatar.trim() ? avatar.trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0f] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

        <div className="flex items-center gap-3 mb-4">
          <img src={avatarUrl(avatar, wallet)} alt="" className="w-14 h-14 rounded-full bg-white/5 border border-white/10" />
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.url}
                onClick={() => setAvatar(p.url)}
                className={`w-9 h-9 rounded-full overflow-hidden border ${avatar === p.url ? "border-[#14F195]" : "border-white/10 hover:border-white/30"}`}
                title={p.label}
              >
                <img src={p.url} alt={p.label} className="w-full h-full" />
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs text-[#8A8F98] mb-1">Avatar URL (https)</label>
        <input
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://…"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#14F195]/40"
        />

        <label className="block text-xs text-[#8A8F98] mb-1">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="3-20 chars, letters/numbers/_/-"
          maxLength={20}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#14F195]/40"
        />

        <label className="block text-xs text-[#8A8F98] mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:border-[#14F195]/40"
        />

        {update.error && (
          <p className="text-xs text-red-400 mb-2">{update.error.message}</p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full text-sm text-[#8A8F98] hover:text-white">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={update.isPending}
            className="px-5 py-2 rounded-full bg-[#14F195] text-black text-sm font-semibold hover:bg-[#14F195]/90 disabled:opacity-50"
          >
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
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
