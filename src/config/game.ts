// ============================================================
// CHECKMATE ARENA — Game Configuration Constants
// ============================================================

export const GAME_CONFIG = {
  // Token gating
  requiredTokenBalance: 0,
  tokenMint: "CM Token", // Placeholder — set via env in production
  tokenDecimals: 6,

  // Daily rewards
  dailyRewardPercentage: 0.5,
  minimumGamesForRewards: 5,

  // Match settings
  reconnectGraceSeconds: 60,
  defaultStartingRating: 1000,
  maxRepeatOpponentMatchesPerDay: 2,
  epochLengthHours: 24,
  topRewardRanks: 10,

  // Time control
  timeControlSeconds: 300, // 5 minutes
  incrementSeconds: 0,

  // Rating system
  kFactorDefault: 32,
  kFactorNewPlayer: 40,
  kFactorHighRated: 24,
  newPlayerGameThreshold: 20,
  highRatingThreshold: 2000,

  // Daily score
  scoreWin: 30,
  scoreLoss: -12,
  scoreDraw: 5,
  scoreCheckmateBonus: 5,
  scoreStreakBonusPerWin: 2,
  scoreStreakBonusMax: 10,
  scoreBeatHigherRatedBase: 5,
  scoreBeatHigherRatedMax: 20,
  scoreTimeoutLoss: -15,
  scoreDisconnectLoss: -20,

  // Payout split (top 10)
  payoutSplit: {
    1: 0.25,
    2: 0.18,
    3: 0.14,
    4: 0.10,
    5: 0.08,
    6: 0.07,
    7: 0.06,
    8: 0.05,
    9: 0.04,
    10: 0.03,
  } as Record<number, number>,

  // Fee distribution
  feeToLeaderboard: 0.5,
  feeToTreasury: 0.3,
  feeToSeasonal: 0.1,
  feeToReserve: 0.1,

  // Rating buckets
  ratingBuckets: {
    bronze: { min: 0, max: 999, label: "Bronze" },
    silver: { min: 1000, max: 1299, label: "Silver" },
    gold: { min: 1300, max: 1599, label: "Gold" },
    diamond: { min: 1600, max: 1999, label: "Diamond" },
    king: { min: 2000, max: 9999, label: "King" },
  } as Record<string, { min: number; max: number; label: string }>,

  // Anti-cheat thresholds
  cheatThresholds: {
    suspiciousWinRate: 0.9,
    suspiciousWinRateMinGames: 10,
    fastMoveMinMoves: 20,
    fastMoveMaxAvgTimeMs: 800,
    maxRepeatedOpponent: 2,
  },

  cheatScoreWeights: {
    low: 10,
    medium: 25,
    high: 50,
  },
} as const;

export function getRatingBucket(rating: number): string {
  for (const [, bucket] of Object.entries(GAME_CONFIG.ratingBuckets)) {
    if (rating >= bucket.min && rating <= bucket.max) {
      return bucket.label;
    }
  }
  return "Unrated";
}

export function getKFactor(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < GAME_CONFIG.newPlayerGameThreshold) {
    return GAME_CONFIG.kFactorNewPlayer;
  }
  if (rating >= GAME_CONFIG.highRatingThreshold) {
    return GAME_CONFIG.kFactorHighRated;
  }
  return GAME_CONFIG.kFactorDefault;
}
