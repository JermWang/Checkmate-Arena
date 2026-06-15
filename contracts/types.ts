// ============================================================
// Shared Types — Frontend <-> Backend
// ============================================================

export interface TokenEligibility {
  walletAddress: string;
  tokenBalance: number;
  isEligible: boolean;
}

export interface MatchResult {
  matchId: number;
  whiteWallet: string;
  blackWallet: string;
  winnerWallet: string | null;
  loserWallet: string | null;
  resultType: string;
  pgn: string | null;
  whiteRatingBefore: number;
  blackRatingBefore: number;
  whiteRatingAfter: number | null;
  blackRatingAfter: number | null;
  whiteScoreDelta: number;
  blackScoreDelta: number;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

export interface LeaderboardPlayer {
  walletAddress: string;
  username: string | null;
  rating: number;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  rank: number | null;
  bucket: string;
}

export interface PlayerProfile {
  walletAddress: string;
  username: string | null;
  currentRating: number;
  dailyScore: number;
  dailyRank: number;
  lifetimeWins: number;
  lifetimeLosses: number;
  lifetimeDraws: number;
  currentStreak: number;
  bucket: string;
  gamesPlayedToday: number;
  isBanned: boolean;
}

export interface EpochInfo {
  id: number;
  startsAt: Date;
  endsAt: Date;
  rewardVaultStartBalance: string;
  totalCreatorFees: string;
  leaderboardRewardPool: string;
  status: string;
  timeRemaining: number; // seconds
}

export interface RewardDistribution {
  rank: number;
  percentage: number;
  estimatedAmount: number;
}

export interface AntiCheatFlag {
  id: number;
  walletAddress: string;
  matchId: number | null;
  reason: string;
  severity: string;
  status: string;
  createdAt: Date;
}

// Socket.IO event types
export interface ServerToClientEvents {
  "eligibility:updated": (data: TokenEligibility) => void;
  "queue:joined": (data: { position: number }) => void;
  "queue:left": () => void;
  "match:found": (data: { matchId: number; opponent: string; color: "white" | "black" }) => void;
  "match:start": (data: { matchId: number; fen: string; white: string; black: string; whiteTime: number; blackTime: number }) => void;
  "match:move_applied": (data: { san: string; fen: string; moveNumber: number; whiteTime: number; blackTime: number }) => void;
  "match:invalid_move": (data: { reason: string }) => void;
  "match:timer_update": (data: { whiteTime: number; blackTime: number }) => void;
  "match:ended": (data: { result: string; winner: string | null; whiteRatingChange: number; blackRatingChange: number }) => void;
  "match:opponent_disconnected": (data: { remainingSeconds: number }) => void;
  "match:opponent_reconnected": () => void;
  "leaderboard:updated": () => void;
}

export interface ClientToServerEvents {
  "wallet:connect": (data: { walletAddress: string }) => void;
  "queue:join": (data: { walletAddress: string; rating: number }) => void;
  "queue:leave": () => void;
  "match:move": (data: { matchId: number; from: string; to: string; promotion?: string }) => void;
  "match:resign": (data: { matchId: number }) => void;
  "match:draw_offer": (data: { matchId: number }) => void;
  "match:draw_accept": (data: { matchId: number }) => void;
}
