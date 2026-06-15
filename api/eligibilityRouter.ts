import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { findOrCreateUser } from "./queries/users";
import { saveTokenSnapshot, getLatestTokenSnapshot } from "./queries/rewards";
import { GAME_CONFIG } from "../src/config/game";

// Mock token balance check — in production this queries Solana RPC
async function checkTokenBalanceMock(walletAddress: string): Promise<number> {
  // For demo: wallets starting with "Elite" have tokens
  const hasTokens = walletAddress.length > 30;
  if (hasTokens) {
    // Deterministic "random" based on wallet address
    let hash = 0;
    for (let i = 0; i < walletAddress.length; i++) {
      hash = ((hash << 5) - hash + walletAddress.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 500000 + 50000;
  }
  return 0;
}

export const eligibilityRouter = createRouter({
  check: publicQuery
    .input(z.object({ walletAddress: z.string().min(32).max(44) }))
    .mutation(async ({ input }) => {
      const balance = await checkTokenBalanceMock(input.walletAddress);
      const isEligible = balance >= GAME_CONFIG.requiredTokenBalance;

      await saveTokenSnapshot({
        walletAddress: input.walletAddress,
        tokenMint: GAME_CONFIG.tokenMint,
        tokenBalance: balance.toString(),
        isEligible,
      });

      // Ensure user record exists
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
          isEligible: false,
          lastChecked: null,
        };
      }

      return {
        walletAddress: latest.walletAddress,
        tokenBalance: Number(latest.tokenBalance),
        isEligible: latest.isEligible,
        lastChecked: latest.checkedAt,
      };
    }),
});
