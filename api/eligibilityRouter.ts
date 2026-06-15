import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { findOrCreateUser } from "./queries/users";
import { saveTokenSnapshot, getLatestTokenSnapshot } from "./queries/rewards";
import { GAME_CONFIG } from "../src/config/game";

export const eligibilityRouter = createRouter({
  check: publicQuery
    .input(z.object({ walletAddress: z.string().min(32).max(44) }))
    .mutation(async ({ input }) => {
      const balance = 0;
      const isEligible = true;

      await saveTokenSnapshot({
        walletAddress: input.walletAddress,
        tokenMint: GAME_CONFIG.tokenMint,
        tokenBalance: balance.toString(),
        isEligible,
      });

      await findOrCreateUser(input.walletAddress);

      return {
        walletAddress: input.walletAddress,
        tokenBalance: balance,
        isEligible,
        requiredBalance: GAME_CONFIG.requiredTokenBalance,
      };
    }),

  status: publicQuery
    .input(z.object({ walletAddress: z.string().min(32).max(44) }))
    .query(async ({ input }) => {
      const snapshots = await getLatestTokenSnapshot(input.walletAddress);
      const latest = snapshots[0];

      if (!latest) {
        return {
          walletAddress: input.walletAddress,
          tokenBalance: 0,
          isEligible: true,
          lastChecked: null,
        };
      }

      return {
        walletAddress: latest.walletAddress,
        tokenBalance: Number(latest.tokenBalance),
        isEligible: true,
        lastChecked: latest.checkedAt,
      };
    }),
});
