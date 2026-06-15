import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getMatchHistoryForWallet, getMatchById, getMatchMoves } from "./queries/matches";
import { getUserByWallet } from "./queries/users";
import { getRewardsForWallet } from "./queries/rewards";
import { getRatingBucket } from "../src/config/game";

export const matchRouter = createRouter({
  history: publicQuery
    .input(z.object({ walletAddress: z.string(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const matches = await getMatchHistoryForWallet(input.walletAddress, input.limit);
      return matches.map((m) => ({
        id: m.id,
        whiteWallet: m.whiteWallet,
        blackWallet: m.blackWallet,
        winnerWallet: m.winnerWallet,
        resultType: m.resultType,
        whiteRatingBefore: m.whiteRatingBefore,
        blackRatingBefore: m.blackRatingBefore,
        whiteRatingAfter: m.whiteRatingAfter,
        blackRatingAfter: m.blackRatingAfter,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
      }));
    }),

  detail: publicQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      const match = await getMatchById(input.matchId);
      if (!match) return null;

      const moves = await getMatchMoves(input.matchId);
      return {
        ...match,
        moves: moves.map((m) => ({
          moveNumber: m.moveNumber,
          san: m.san,
          walletAddress: m.walletAddress,
          fromSquare: m.fromSquare,
          toSquare: m.toSquare,
          fenAfter: m.fenAfter,
          moveTimeMs: m.moveTimeMs,
        })),
      };
    }),

  profile: publicQuery
    .input(z.object({ walletAddress: z.string() }))
    .query(async ({ input }) => {
      const user = await getUserByWallet(input.walletAddress);
      if (!user) return null;

      const recentMatches = await getMatchHistoryForWallet(input.walletAddress, 20);
      const rewards = await getRewardsForWallet(input.walletAddress);

      return {
        walletAddress: user.walletAddress,
        username: user.username,
        currentRating: user.currentRating,
        dailyScore: user.dailyScore,
        lifetimeWins: user.lifetimeWins,
        lifetimeLosses: user.lifetimeLosses,
        lifetimeDraws: user.lifetimeDraws,
        currentStreak: user.currentStreak,
        gamesPlayedToday: user.gamesPlayedToday,
        bucket: getRatingBucket(user.currentRating),
        isBanned: user.isBanned,
        cheatScore: user.cheatScore,
        recentMatches: recentMatches.map((m) => ({
          id: m.id,
          resultType: m.resultType,
          opponent: m.whiteWallet === input.walletAddress ? m.blackWallet : m.whiteWallet,
          won: m.winnerWallet === input.walletAddress,
          ratingChange:
            m.whiteWallet === input.walletAddress
              ? (m.whiteRatingAfter ?? m.whiteRatingBefore) - m.whiteRatingBefore
              : (m.blackRatingAfter ?? m.blackRatingBefore) - m.blackRatingBefore,
          endedAt: m.endedAt,
        })),
        rewardHistory: rewards.map((r) => ({
          epochId: r.epochId,
          rank: r.rank,
          amount: Number(r.payoutAmount),
          status: r.payoutStatus,
          createdAt: r.createdAt,
        })),
      };
    }),
});
