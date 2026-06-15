import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ============================================================
// Enums (each needs a unique Postgres type name)
// ============================================================
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const matchResultEnum = pgEnum("match_result", [
  "checkmate",
  "resignation",
  "timeout",
  "draw",
  "disconnect",
  "abandoned",
  "admin_cancelled",
]);
export const matchStatusEnum = pgEnum("match_status", [
  "waiting",
  "active",
  "completed",
  "flagged",
  "voided",
]);
export const cheatReviewEnum = pgEnum("cheat_review_status", [
  "clear",
  "pending_review",
  "flagged",
  "confirmed_cheat",
]);
export const matchModeEnum = pgEnum("match_mode", [
  "ranked",
  "casual",
  "wager_public",
  "wager_private",
]);
export const epochStatusEnum = pgEnum("epoch_status", [
  "active",
  "frozen",
  "reviewing",
  "paid",
  "cancelled",
]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "paid",
  "withheld",
  "failed",
]);
export const flagSeverityEnum = pgEnum("flag_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const flagStatusEnum = pgEnum("flag_status", [
  "open",
  "reviewed",
  "dismissed",
  "confirmed",
]);

// ============================================================
// AUTH USERS — managed by Kimi OAuth
// ============================================================
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// CHESS PLAYERS — tracked by Solana wallet
// ============================================================
export const chessPlayers = pgTable(
  "chess_players",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 255 }),
    avatar: text("avatar"),
    bio: varchar("bio", { length: 280 }),
    // Denormalized wager totals (base token units). Match settlement updates these.
    totalEarnings: bigint("total_earnings", { mode: "number" }).default(0).notNull(),
    totalWagered: bigint("total_wagered", { mode: "number" }).default(0).notNull(),
    currentRating: integer("current_rating").default(1000).notNull(),
    dailyScore: integer("daily_score").default(0).notNull(),
    lifetimeWins: integer("lifetime_wins").default(0).notNull(),
    lifetimeLosses: integer("lifetime_losses").default(0).notNull(),
    lifetimeDraws: integer("lifetime_draws").default(0).notNull(),
    dailyWins: integer("daily_wins").default(0).notNull(),
    dailyLosses: integer("daily_losses").default(0).notNull(),
    dailyDraws: integer("daily_draws").default(0).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    cheatScore: integer("cheat_score").default(0).notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    gamesPlayedToday: integer("games_played_today").default(0).notNull(),
    lastGameDate: varchar("last_game_date", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    walletIdx: index("chess_wallet_idx").on(table.walletAddress),
    ratingIdx: index("chess_rating_idx").on(table.currentRating),
    dailyScoreIdx: index("chess_daily_score_idx").on(table.dailyScore),
    bannedIdx: index("chess_banned_idx").on(table.isBanned),
  })
);

export type ChessPlayer = typeof chessPlayers.$inferSelect;
export type InsertChessPlayer = typeof chessPlayers.$inferInsert;

// ============================================================
// TOKEN_SNAPSHOTS
// ============================================================
export const tokenSnapshots = pgTable(
  "token_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    tokenMint: varchar("token_mint", { length: 255 }).notNull(),
    tokenBalance: numeric("token_balance", { precision: 20, scale: 0 }).notNull(),
    isEligible: boolean("is_eligible").notNull(),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    walletCheckedIdx: index("wallet_checked_idx").on(
      table.walletAddress,
      table.checkedAt
    ),
  })
);

export type TokenSnapshot = typeof tokenSnapshots.$inferSelect;

// ============================================================
// MATCHES
// ============================================================
export const matches = pgTable(
  "matches",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    whiteWallet: varchar("white_wallet", { length: 255 }).notNull(),
    blackWallet: varchar("black_wallet", { length: 255 }).notNull(),
    winnerWallet: varchar("winner_wallet", { length: 255 }),
    loserWallet: varchar("loser_wallet", { length: 255 }),
    resultType: matchResultEnum("result_type").notNull(),
    pgn: text("pgn"),
    moveHistory: jsonb("move_history").$type<string[]>().notNull(),
    whiteRatingBefore: integer("white_rating_before").notNull(),
    blackRatingBefore: integer("black_rating_before").notNull(),
    whiteRatingAfter: integer("white_rating_after"),
    blackRatingAfter: integer("black_rating_after"),
    whiteScoreDelta: integer("white_score_delta").default(0).notNull(),
    blackScoreDelta: integer("black_score_delta").default(0).notNull(),
    status: matchStatusEnum("status").default("waiting").notNull(),
    cheatReviewStatus: cheatReviewEnum("cheat_review_status")
      .default("clear")
      .notNull(),

    // Wager fields (null/0 = free ranked/casual match)
    matchMode: matchModeEnum("match_mode").default("ranked").notNull(),
    stakeAmount: bigint("stake_amount", { mode: "number" }).default(0).notNull(),
    stakeMint: varchar("stake_mint", { length: 255 }),
    isPrivate: boolean("is_private").default(false).notNull(),
    roomCode: varchar("room_code", { length: 6 }),
    roomPasswordHash: varchar("room_password_hash", { length: 255 }),
    allowSpectators: boolean("allow_spectators").default(true).notNull(),
    escrowPda: varchar("escrow_pda", { length: 255 }),
    escrowSettleSig: varchar("escrow_settle_sig", { length: 255 }),
    rakeBps: integer("rake_bps").default(400).notNull(),
    expiresAt: timestamp("expires_at"),

    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    whiteIdx: index("white_idx").on(table.whiteWallet),
    blackIdx: index("black_idx").on(table.blackWallet),
    winnerIdx: index("winner_idx").on(table.winnerWallet),
    statusIdx: index("status_idx").on(table.status),
    createdIdx: index("created_idx").on(table.createdAt),
    matchModeIdx: index("match_mode_idx").on(table.matchMode),
    roomCodeIdx: index("room_code_idx").on(table.roomCode),
  })
);

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ============================================================
// MATCH_MOVES
// ============================================================
export const matchMoves = pgTable(
  "match_moves",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matchId: bigint("match_id", { mode: "number" }).notNull(),
    moveNumber: integer("move_number").notNull(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    san: varchar("san", { length: 10 }).notNull(),
    fromSquare: varchar("from_square", { length: 2 }).notNull(),
    toSquare: varchar("to_square", { length: 2 }).notNull(),
    promotion: varchar("promotion", { length: 1 }),
    fenAfter: text("fen_after").notNull(),
    moveTimeMs: integer("move_time_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    matchIdx: index("match_move_idx").on(table.matchId),
  })
);

export type MatchMove = typeof matchMoves.$inferSelect;

// ============================================================
// LEADERBOARD_ENTRIES
// ============================================================
export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    epochId: bigint("epoch_id", { mode: "number" }).notNull(),
    rating: integer("rating").notNull(),
    score: integer("score").default(0).notNull(),
    wins: integer("wins").default(0).notNull(),
    losses: integer("losses").default(0).notNull(),
    draws: integer("draws").default(0).notNull(),
    gamesPlayed: integer("games_played").default(0).notNull(),
    rank: integer("rank"),
    eligibleForRewards: boolean("eligible_for_rewards").default(false).notNull(),
    disqualified: boolean("disqualified").default(false).notNull(),
    disqualificationReason: text("disqualification_reason"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    epochWalletIdx: index("epoch_wallet_idx").on(table.epochId, table.walletAddress),
    scoreIdx: index("score_idx").on(table.epochId, table.score),
  })
);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;

// ============================================================
// EPOCHS
// ============================================================
export const epochs = pgTable(
  "epochs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    startsAt: timestamp("starts_at").defaultNow().notNull(),
    endsAt: timestamp("ends_at").notNull(),
    rewardVaultStartBalance: numeric("reward_vault_start_balance", {
      precision: 30,
      scale: 9,
    })
      .default("0")
      .notNull(),
    rewardVaultEndBalance: numeric("reward_vault_end_balance", {
      precision: 30,
      scale: 9,
    })
      .default("0")
      .notNull(),
    totalCreatorFees: numeric("total_creator_fees", { precision: 30, scale: 9 })
      .default("0")
      .notNull(),
    leaderboardRewardPool: numeric("leaderboard_reward_pool", {
      precision: 30,
      scale: 9,
    })
      .default("0")
      .notNull(),
    treasuryAmount: numeric("treasury_amount", { precision: 30, scale: 9 })
      .default("0")
      .notNull(),
    status: epochStatusEnum("status").default("active").notNull(),
    payoutTx: text("payout_tx"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    statusIdx: index("epoch_status_idx").on(table.status),
  })
);

export type Epoch = typeof epochs.$inferSelect;

// ============================================================
// EPOCH_REWARDS
// ============================================================
export const epochRewards = pgTable(
  "epoch_rewards",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    epochId: bigint("epoch_id", { mode: "number" }).notNull(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    rank: integer("rank").notNull(),
    score: integer("score").notNull(),
    payoutPercentage: numeric("payout_percentage", { precision: 5, scale: 2 }).notNull(),
    payoutAmount: numeric("payout_amount", { precision: 30, scale: 9 }).notNull(),
    payoutToken: varchar("payout_token", { length: 255 }).notNull(),
    payoutStatus: payoutStatusEnum("payout_status").default("pending").notNull(),
    payoutTx: text("payout_tx"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    epochIdx: index("epoch_reward_idx").on(table.epochId),
    walletIdx: index("reward_wallet_idx").on(table.walletAddress),
  })
);

export type EpochReward = typeof epochRewards.$inferSelect;

// ============================================================
// ADMIN_FLAGS
// ============================================================
export const adminFlags = pgTable(
  "admin_flags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    matchId: bigint("match_id", { mode: "number" }),
    epochId: bigint("epoch_id", { mode: "number" }),
    reason: text("reason").notNull(),
    severity: flagSeverityEnum("severity").notNull(),
    status: flagStatusEnum("status").default("open").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    walletIdx: index("flag_wallet_idx").on(table.walletAddress),
    statusIdx: index("flag_status_idx").on(table.status),
  })
);

export type AdminFlag = typeof adminFlags.$inferSelect;

// ============================================================
// ADMIN_ACTIONS
// ============================================================
export const adminActions = pgTable(
  "admin_actions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adminWallet: varchar("admin_wallet", { length: 255 }).notNull(),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    targetWallet: varchar("target_wallet", { length: 255 }),
    matchId: bigint("match_id", { mode: "number" }),
    epochId: bigint("epoch_id", { mode: "number" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    adminIdx: index("admin_idx").on(table.adminWallet),
    createdIdx: index("action_created_idx").on(table.createdAt),
  })
);

export type AdminAction = typeof adminActions.$inferSelect;
