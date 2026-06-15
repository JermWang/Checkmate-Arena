import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDailyLeaderboard, getLifetimeLeaderboard } from "./queries/users";
import { getLeaderboardForEpoch, getCurrentEpoch } from "./queries/leaderboard";
import { getRatingBucket } from "../src/config/game";

export const leaderboardRouter = createRouter({
  daily: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const players = await getDailyLeaderboard(limit);
      return players.map((p, i) => ({
        walletAddress: p.walletAddress,
        username: p.username,
        rating: p.currentRating,
        score: p.dailyScore,
        wins: p.dailyWins,
        losses: p.dailyLosses,
        draws: p.dailyDraws,
        rank: i + 1,
        bucket: getRatingBucket(p.currentRating),
      }));
    }),

  lifetime: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const players = await getLifetimeLeaderboard(limit);
      return players.map((p, i) => ({
        walletAddress: p.walletAddress,
        username: p.username,
        rating: p.currentRating,
        wins: p.lifetimeWins,
        losses: p.lifetimeLosses,
        draws: p.lifetimeDraws,
        gamesPlayed: p.lifetimeWins + p.lifetimeLosses + p.lifetimeDraws,
        rank: i + 1,
        bucket: getRatingBucket(p.currentRating),
      }));
    }),

  epoch: publicQuery
    .input(z.object({ epochId: z.number().optional(), limit: z.number().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      let epochId = input?.epochId;
      const limit = input?.limit ?? 100;

      if (!epochId) {
        const epoch = await getCurrentEpoch();
        if (!epoch) return [];
        epochId = epoch.id;
      }

      const entries = await getLeaderboardForEpoch(epochId, limit);
      return entries.map((e, i) => ({
        walletAddress: e.walletAddress,
        rating: e.rating,
        score: e.score,
        wins: e.wins,
        losses: e.losses,
        draws: e.draws,
        gamesPlayed: e.gamesPlayed,
        rank: i + 1,
        eligible: e.eligibleForRewards,
        disqualified: e.disqualified,
      }));
    }),
});
