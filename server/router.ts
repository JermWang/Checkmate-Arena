import { authRouter } from "./auth-router";
import { eligibilityRouter } from "./eligibilityRouter";
import { leaderboardRouter } from "./leaderboardRouter";
import { matchRouter } from "./matchRouter";
import { rewardsRouter } from "./rewardsRouter";
import { adminRouter } from "./adminRouter";
import { wagerRouter } from "./wagerRouter";
import { profileRouter } from "./profileRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  eligibility: eligibilityRouter,
  leaderboard: leaderboardRouter,
  match: matchRouter,
  rewards: rewardsRouter,
  admin: adminRouter,
  wager: wagerRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
