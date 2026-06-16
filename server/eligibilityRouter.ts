import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { findOrCreateUser } from "./queries/users";
import { saveTokenSnapshot, getLatestTokenSnapshot } from "./queries/rewards";
import { GAME_CONFIG } from "../src/config/game";
import { env } from "./lib/env";
import { getTokenUiBalance } from "./lib/tokenBalance";

export const eligibilityRouter = createRouter({
  check: publicQuery
    .input(z.object({ walletAddress: z.string().min(32).max(44) }))
    .mutation(async ({ input }) => {
      const mint = env.chessMint || GAME_CONFIG.tokenMint;
      const required = GAME_CONFIG.requiredTokenBalance;

      // Gate OFF (default, pre-launch): arena stays open and we don't bother
      // hitting RPC. Gate ON: require holding `required` $CHESS to play ranked.
      let balance = 0;
      let isEligible = true;
      if (env.tokenGateEnabled) {
        balance = await getTokenUiBalance(input.walletAddress, mint);
        isEligible = balance >= required;
      }

      await saveTokenSnapshot({
        walletAddress: input.walletAddress,
        tokenMint: mint,
        tokenBalance: balance.toString(),
        isEligible,
      });

      await findOrCreateUser(input.walletAddress);

      return {
        walletAddress: input.walletAddress,
        tokenBalance: balance,
        isEligible,
        requiredBalance: required,
        gateEnabled: env.tokenGateEnabled,
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
