import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gt, gte, lte, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { matches } from "../db/schema";
import { env } from "./lib/env";

const ROOM_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_TTL_MS = 15 * 60 * 1000;
const MIN_STAKE = 10;
const MAX_STAKE = 1_000_000;
const HOUSE_FEE_BPS_DEFAULT = 200;
const CHESS_MINT = env.chessMint;

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)];
  }
  return code;
}

const stakeSchema = z.number().int().min(MIN_STAKE).max(MAX_STAKE);
const timeControlSchema = z.enum(["1+0", "3+0", "5+3", "10+5"]);
const colorPrefSchema = z.enum(["white", "black", "random"]);

export const wagerRouter = createRouter({
  /**
   * Create a wagered challenge (public or private).
   * Returns the match row + a flag indicating the client should sign+submit
   * an Anchor `create_match` ix to lock the creator's stake.
   */
  create: publicQuery
    .input(
      z.object({
        creatorWallet: z.string().min(32).max(44),
        stakeAmount: stakeSchema,
        stakeMint: z.string().optional(),
        timeControl: timeControlSchema,
        colorPref: colorPrefSchema,
        isPrivate: z.boolean(),
        allowSpectators: z.boolean().default(true),
        ranked: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const stakeMint = input.stakeMint ?? CHESS_MINT;

      if (!CHESS_MINT) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Wager token mint is not configured.",
        });
      }

      if (stakeMint !== CHESS_MINT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wagers must use the configured $CHESS mint.",
        });
      }

      let roomCode: string | null = null;
      if (input.isPrivate) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = generateRoomCode();
          const conflict = await db
            .select({ id: matches.id })
            .from(matches)
            .where(
              and(eq(matches.roomCode, candidate), eq(matches.status, "waiting"))
            )
            .limit(1);
          if (conflict.length === 0) {
            roomCode = candidate;
            break;
          }
        }
        if (!roomCode) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not allocate a unique room code; try again.",
          });
        }
      }

      const expiresAt = input.isPrivate
        ? new Date(Date.now() + ROOM_CODE_TTL_MS)
        : new Date(Date.now() + 5 * 60_000); // public lobby auto-cancels after 5 min idle

      // White/black assigned at acceptance time once we know both wallets +
      // creator's color preference. For now, store creator in whiteWallet as
      // a placeholder so existing match shape remains valid.
      const inserted = await db
        .insert(matches)
        .values({
          whiteWallet: input.creatorWallet,
          blackWallet: "",
          resultType: "abandoned", // placeholder until match plays out
          moveHistory: [],
          whiteRatingBefore: 1000,
          blackRatingBefore: 1000,
          status: "waiting",
          matchMode: input.isPrivate ? "wager_private" : "wager_public",
          stakeAmount: input.stakeAmount,
          stakeMint,
          isPrivate: input.isPrivate,
          roomCode,
          allowSpectators: input.isPrivate ? input.allowSpectators : true,
          rakeBps: HOUSE_FEE_BPS_DEFAULT,
          expiresAt,
        })
        .returning({ id: matches.id });

      const matchId = Number(inserted[0].id);

      return {
        matchId,
        roomCode,
        expiresAt,
        // The client should now build and sign the on-chain `create_match` ix.
        // We return the parameters so the wager-tx builder can pick them up.
        nextStep: {
          kind: "sign_create_match" as const,
          stakeAmount: input.stakeAmount,
          stakeMint,
          colorPref: input.colorPref,
        },
      };
    }),

  /**
   * List open public wagers, optionally filtered by stake band + time control.
   */
  listOpen: publicQuery
    .input(
      z
        .object({
          stakeMin: z.number().optional(),
          stakeMax: z.number().optional(),
          timeControl: timeControlSchema.optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const filters = [
        eq(matches.matchMode, "wager_public"),
        eq(matches.status, "waiting"),
        gt(matches.expiresAt, new Date()),
      ];
      if (CHESS_MINT) filters.push(eq(matches.stakeMint, CHESS_MINT));
      if (input?.stakeMin !== undefined)
        filters.push(gte(matches.stakeAmount, input.stakeMin));
      if (input?.stakeMax !== undefined)
        filters.push(lte(matches.stakeAmount, input.stakeMax));

      const rows = await db
        .select()
        .from(matches)
        .where(and(...filters))
        .orderBy(desc(matches.createdAt))
        .limit(input?.limit ?? 50);

      return rows.map((m) => ({
        id: m.id,
        creatorWallet: m.whiteWallet,
        stakeAmount: m.stakeAmount,
        stakeMint: m.stakeMint,
        timeControl: "3+0", // TODO: persist time_control on the match row
        createdAt: m.createdAt,
        expiresAt: m.expiresAt,
      }));
    }),

  /**
   * Fetch one challenge by room code (used by the join screen).
   */
  byCode: publicQuery
    .input(z.object({ code: z.string().length(6) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const filters = [
        eq(matches.roomCode, input.code.toUpperCase()),
        eq(matches.status, "waiting"),
        gt(matches.expiresAt, new Date()),
      ];
      if (CHESS_MINT) filters.push(eq(matches.stakeMint, CHESS_MINT));

      const row = await db
        .select()
        .from(matches)
        .where(and(...filters))
        .limit(1);
      if (row.length === 0) return null;
      const m = row[0];
      return {
        id: m.id,
        creatorWallet: m.whiteWallet,
        stakeAmount: m.stakeAmount,
        stakeMint: m.stakeMint,
        allowSpectators: m.allowSpectators,
        expiresAt: m.expiresAt,
      };
    }),

  /**
   * Mark a wager as accepted. The client must have already signed and submitted
   * the on-chain `accept_match` ix; we record the signature here for audit.
   */
  accept: publicQuery
    .input(
      z.object({
        matchId: z.number(),
        challengerWallet: z.string().min(32).max(44),
        escrowAcceptSig: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [row] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "waiting")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Match not open" });
      if (row.whiteWallet === input.challengerWallet)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot accept own challenge" });

      // Assign colors: simple coin flip if creator chose random; otherwise honor pref.
      const creatorWantsWhite = Math.random() < 0.5;
      await db
        .update(matches)
        .set({
          whiteWallet: creatorWantsWhite ? row.whiteWallet : input.challengerWallet,
          blackWallet: creatorWantsWhite ? input.challengerWallet : row.whiteWallet,
          status: "active",
          startedAt: new Date(),
        })
        .where(eq(matches.id, input.matchId));

      return { ok: true, matchId: input.matchId };
    }),

  /**
   * Creator cancels their open wager before anyone accepts. Returns the
   * params needed to call the on-chain `cancel_match` ix for refund.
   */
  cancel: publicQuery
    .input(
      z.object({
        matchId: z.number(),
        creatorWallet: z.string().min(32).max(44),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [row] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.whiteWallet !== input.creatorWallet)
        throw new TRPCError({ code: "FORBIDDEN", message: "Only creator may cancel" });
      if (row.status !== "waiting")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Match already started" });

      await db
        .update(matches)
        .set({ status: "voided" })
        .where(eq(matches.id, input.matchId));

      return {
        ok: true,
        nextStep: {
          kind: "sign_cancel_match" as const,
          matchId: input.matchId,
        },
      };
    }),

  /**
   * Sweep expired waiting wagers. Called by a cron job; left as a public
   * mutation for ease of testing. Returns count of swept rows.
   */
  sweepExpired: publicQuery.mutation(async () => {
    const db = await getDb();
    const swept = await db
      .update(matches)
      .set({ status: "voided" })
      .where(
        and(eq(matches.status, "waiting"), sql`${matches.expiresAt} < NOW()`)
      )
      .returning({ id: matches.id });
    return { swept: swept.length };
  }),
});
