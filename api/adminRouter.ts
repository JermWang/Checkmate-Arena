import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getFlagsByStatus, resolveFlag, getRecentAdminActions, logAdminAction } from "./queries/admin";
import { voidMatch } from "./queries/matches";
import { banUser } from "./queries/users";
import { markRewardWithheld } from "./queries/rewards";

export const adminRouter = createRouter({
  flags: adminQuery
    .input(z.object({ status: z.enum(["open", "reviewed", "dismissed", "confirmed"]) }))
    .query(async ({ input }) => {
      return getFlagsByStatus(input.status);
    }),

  resolveFlag: adminQuery
    .input(z.object({ flagId: z.number(), status: z.enum(["reviewed", "dismissed", "confirmed"]) }))
    .mutation(async ({ input, ctx }) => {
      await resolveFlag(input.flagId, input.status);
      await logAdminAction({
        adminWallet: ctx.user.unionId ?? "admin",
        actionType: "resolve_flag",
        notes: `Flag ${input.flagId} marked as ${input.status}`,
      });
      return { success: true };
    }),

  voidMatch: adminQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await voidMatch(input.matchId);
      await logAdminAction({
        adminWallet: ctx.user.unionId ?? "admin",
        actionType: "void_match",
        matchId: input.matchId,
      });
      return { success: true };
    }),

  banPlayer: adminQuery
    .input(z.object({ walletAddress: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await banUser(input.walletAddress);
      await logAdminAction({
        adminWallet: ctx.user.unionId ?? "admin",
        actionType: "ban_player",
        targetWallet: input.walletAddress,
      });
      return { success: true };
    }),

  withholdPayout: adminQuery
    .input(z.object({ rewardId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markRewardWithheld(input.rewardId);
      await logAdminAction({
        adminWallet: ctx.user.unionId ?? "admin",
        actionType: "withhold_payout",
        notes: `Reward ${input.rewardId} withheld`,
      });
      return { success: true };
    }),

  actions: adminQuery
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      return getRecentAdminActions(input?.limit ?? 100);
    }),
});
