import { getDb } from "./connection";
import { matches, matchMoves } from "@db/schema";
import { eq, desc, and, or } from "drizzle-orm";

export async function createMatch(data: {
  whiteWallet: string;
  blackWallet: string;
  whiteRatingBefore: number;
  blackRatingBefore: number;
}) {
  const db = getDb();
  const result = await db
    .insert(matches)
    .values({
      whiteWallet: data.whiteWallet,
      blackWallet: data.blackWallet,
      resultType: "draw",
      moveHistory: [],
      whiteRatingBefore: data.whiteRatingBefore,
      blackRatingBefore: data.blackRatingBefore,
      status: "active",
      startedAt: new Date(),
    })
    .returning({ id: matches.id });
  return Number(result[0].id);
}

export async function getMatchById(matchId: number) {
  return getDb().query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
}

export async function saveMove(data: {
  matchId: number;
  moveNumber: number;
  walletAddress: string;
  san: string;
  fromSquare: string;
  toSquare: string;
  promotion?: string;
  fenAfter: string;
  moveTimeMs: number;
}) {
  await getDb().insert(matchMoves).values(data);
}

export async function getMatchMoves(matchId: number) {
  return getDb()
    .select()
    .from(matchMoves)
    .where(eq(matchMoves.matchId, matchId))
    .orderBy(matchMoves.moveNumber);
}

export async function finalizeMatch(
  matchId: number,
  data: {
    winnerWallet: string | null;
    loserWallet: string | null;
    resultType: "checkmate" | "resignation" | "timeout" | "draw" | "disconnect" | "abandoned" | "admin_cancelled";
    pgn: string;
    moveHistory: string[];
    whiteRatingAfter: number;
    blackRatingAfter: number;
  }
) {
  await getDb()
    .update(matches)
    .set({
      winnerWallet: data.winnerWallet,
      loserWallet: data.loserWallet,
      resultType: data.resultType,
      pgn: data.pgn,
      moveHistory: data.moveHistory,
      whiteRatingAfter: data.whiteRatingAfter,
      blackRatingAfter: data.blackRatingAfter,
      status: "completed",
      endedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function getMatchHistoryForWallet(walletAddress: string, limit: number = 50) {
  return getDb()
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "completed"),
        or(
          eq(matches.whiteWallet, walletAddress),
          eq(matches.blackWallet, walletAddress)
        )
      )
    )
    .orderBy(desc(matches.endedAt))
    .limit(limit);
}

export async function flagMatch(matchId: number) {
  await getDb()
    .update(matches)
    .set({ status: "flagged", cheatReviewStatus: "pending_review" })
    .where(eq(matches.id, matchId));
}

export async function voidMatch(matchId: number) {
  await getDb()
    .update(matches)
    .set({ status: "voided" })
    .where(eq(matches.id, matchId));
}

export async function getRecentOpponents(walletAddress: string) {
  const rows = await getDb()
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "completed"),
        or(
          eq(matches.whiteWallet, walletAddress),
          eq(matches.blackWallet, walletAddress)
        )
      )
    )
    .orderBy(desc(matches.createdAt))
    .limit(100);

  const opponents = new Map<string, number>();
  for (const row of rows) {
    const opponent = row.whiteWallet === walletAddress ? row.blackWallet : row.whiteWallet;
    opponents.set(opponent, (opponents.get(opponent) || 0) + 1);
  }
  return opponents;
}
