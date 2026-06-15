import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import {
  getUserByWallet,
  findOrCreateUser,
  isUsernameTaken,
  updateChessPlayerProfile,
} from "./queries/users";
import { getMatchHistoryForWallet } from "./queries/matches";
import { getRewardsForWallet } from "./queries/rewards";
import { getRatingBucket } from "../src/config/game";

const WALLET = z.string().min(32).max(44);

// Usernames: 3-20 chars, letters/numbers/_/-, no leading/trailing separators.
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/, {
    message: "Use 3-20 letters, numbers, _ or -",
  });

// Avatar: either an https URL (preset/generated or user-supplied) OR an uploaded
// image sent as a data: URL. Uploads are compressed client-side (downscaled to a
// small thumbnail), so the stored string stays tiny; MAX_AVATAR_LEN is a safety
// ceiling for the DB, not the user-facing upload limit (that's 5 MB pre-compression).
const HTTPS_RE = /^https:\/\/[^\s]+$/;
const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_AVATAR_LEN = 2_000_000; // ~1.5 MB of base64; compressed avatars are far smaller

const avatarSchema = z
  .string()
  .trim()
  .max(MAX_AVATAR_LEN, { message: "Image is too large after processing." })
  .refine((u) => HTTPS_RE.test(u) || DATA_IMAGE_RE.test(u), {
    message: "Avatar must be an https link or an uploaded image.",
  })
  .refine((u) => !HTTPS_RE.test(u) || u.length <= 500, {
    message: "Avatar link is too long (max 500 characters).",
  });

export const profileRouter = createRouter({
  /** Full public profile incl. computed stats, head-to-head matchups, earnings. */
  get: publicQuery
    .input(z.object({ walletAddress: WALLET }))
    .query(async ({ input }) => {
      const player = await getUserByWallet(input.walletAddress);
      if (!player) return null;

      // Pull a generous window of completed matches for stat aggregation, and a
      // smaller slice for the "recent" list.
      const matches = await getMatchHistoryForWallet(input.walletAddress, 500);
      const rewards = await getRewardsForWallet(input.walletAddress);

      // Head-to-head aggregation by opponent.
      const h2h = new Map<
        string,
        { opponent: string; opponentName: string | null; wins: number; losses: number; draws: number; games: number }
      >();
      let wagerEarnings = 0;
      let wagerStaked = 0;

      for (const m of matches) {
        const isWhite = m.whiteWallet === input.walletAddress;
        const opponent = isWhite ? m.blackWallet : m.whiteWallet;
        if (!opponent) continue;
        const rec =
          h2h.get(opponent) ??
          { opponent, opponentName: null, wins: 0, losses: 0, draws: 0, games: 0 };
        rec.games++;
        if (m.resultType === "draw") rec.draws++;
        else if (m.winnerWallet === input.walletAddress) rec.wins++;
        else rec.losses++;
        h2h.set(opponent, rec);

        // Earnings from wagered matches (stake in base token units).
        const stake = Number(m.stakeAmount ?? 0);
        if (stake > 0 && (m.matchMode === "wager_public" || m.matchMode === "wager_private")) {
          wagerStaked += stake;
          const pot = stake * 2;
          const houseFee = Math.floor((pot * (m.rakeBps ?? 200)) / 10000);
          if (m.winnerWallet === input.walletAddress) wagerEarnings += stake - houseFee;
          else if (m.resultType !== "draw") wagerEarnings -= stake;
        }
      }

      const topMatchups = [...h2h.values()]
        .sort((a, b) => b.games - a.games)
        .slice(0, 8);

      const totalGames = player.lifetimeWins + player.lifetimeLosses + player.lifetimeDraws;
      const winRate = totalGames > 0 ? (player.lifetimeWins / totalGames) * 100 : 0;

      return {
        walletAddress: player.walletAddress,
        username: player.username,
        avatar: player.avatar,
        bio: player.bio,
        currentRating: player.currentRating,
        bucket: getRatingBucket(player.currentRating),
        dailyScore: player.dailyScore,
        lifetimeWins: player.lifetimeWins,
        lifetimeLosses: player.lifetimeLosses,
        lifetimeDraws: player.lifetimeDraws,
        currentStreak: player.currentStreak,
        gamesPlayedToday: player.gamesPlayedToday,
        isBanned: player.isBanned,
        totalGames,
        winRate,
        // Prefer denormalized counters when present, else the computed value.
        totalEarnings: player.totalEarnings || wagerEarnings,
        totalWagered: player.totalWagered || wagerStaked,
        topMatchups,
        recentMatches: matches.slice(0, 20).map((m) => ({
          id: m.id,
          resultType: m.resultType,
          matchMode: m.matchMode,
          stakeAmount: Number(m.stakeAmount ?? 0),
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

  /**
   * Update the profile for a wallet. NOTE: auth here is wallet-scoped only — there
   * is no on-chain signature check yet, so this trusts the caller's walletAddress.
   * Add a signed-message check before mainnet launch.
   */
  update: publicQuery
    .input(
      z.object({
        walletAddress: WALLET,
        username: usernameSchema.nullish(),
        avatar: avatarSchema.nullish(),
        bio: z.string().trim().max(280).nullish(),
      })
    )
    .mutation(async ({ input }) => {
      // Ensure the player row exists.
      await findOrCreateUser(input.walletAddress);

      if (input.username) {
        const taken = await isUsernameTaken(input.username, input.walletAddress);
        if (taken) {
          throw new TRPCError({ code: "CONFLICT", message: "That username is taken." });
        }
      }

      await updateChessPlayerProfile(input.walletAddress, {
        username: input.username ?? undefined,
        avatar: input.avatar ?? undefined,
        bio: input.bio ?? undefined,
      });

      const updated = await getUserByWallet(input.walletAddress);
      return {
        walletAddress: input.walletAddress,
        username: updated?.username ?? null,
        avatar: updated?.avatar ?? null,
        bio: updated?.bio ?? null,
      };
    }),
});
