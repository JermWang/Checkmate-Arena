import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getCurrentEpoch, getRecentEpochs } from "./queries/leaderboard";
import { getRewardsForEpoch } from "./queries/rewards";
import { GAME_CONFIG } from "../src/config/game";

export const rewardsRouter = createRouter({
  current: publicQuery.query(async () => {
    const epoch = await getCurrentEpoch();
    if (!epoch) {
      // Create initial epoch
      return {
        epochId: 0,
        status: "no_epoch" as const,
        timeRemaining: 0,
        rewardPool: 0,
        estimatedPayouts: [] as { rank: number; percentage: number; amount: number }[],
      };
    }

    const now = Date.now();
    const endsAt = epoch.endsAt.getTime();
    const timeRemaining = Math.max(0, Math.floor((endsAt - now) / 1000));

    // Mock reward pool calculation
    const creatorFees = 100; // SOL — would come from vault balance in production
    const pool = creatorFees * GAME_CONFIG.dailyRewardPercentage;

    const payouts = Object.entries(GAME_CONFIG.payoutSplit)
      .map(([rank, pct]) => ({
        rank: Number(rank),
        percentage: pct * 100,
        amount: pool * pct,
      }))
      .sort((a, b) => a.rank - b.rank);

    return {
      epochId: epoch.id,
      status: epoch.status,
      startsAt: epoch.startsAt,
      endsAt: epoch.endsAt,
      timeRemaining,
      rewardPool: pool,
      creatorFees,
      estimatedPayouts: payouts,
    };
  }),

  history: publicQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 10;
      const epochs = await getRecentEpochs(limit);

      const results = [];
      for (const epoch of epochs) {
        if (epoch.status !== "paid") continue;
        const rewards = await getRewardsForEpoch(epoch.id);
        results.push({
          epochId: epoch.id,
          startsAt: epoch.startsAt,
          endsAt: epoch.endsAt,
          totalPool: Number(epoch.leaderboardRewardPool),
          winners: rewards.map((r) => ({
            walletAddress: r.walletAddress,
            rank: r.rank,
            amount: Number(r.payoutAmount),
            tx: r.payoutTx,
          })),
        });
      }
      return results;
    }),
});
