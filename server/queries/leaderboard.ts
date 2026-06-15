import { getDb } from "./connection";
import { leaderboardEntries, epochs } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function getOrCreateLeaderboardEntry(walletAddress: string, epochId: number) {
  const db = getDb();
  let entry = await db.query.leaderboardEntries.findFirst({
    where: and(
      eq(leaderboardEntries.walletAddress, walletAddress),
      eq(leaderboardEntries.epochId, epochId)
    ),
  });

  if (!entry) {
    const result = await db
      .insert(leaderboardEntries)
      .values({
        walletAddress,
        epochId,
        rating: 1000,
        score: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
      })
      .returning({ id: leaderboardEntries.id });
    entry = await db.query.leaderboardEntries.findFirst({
      where: eq(leaderboardEntries.id, Number(result[0].id)),
    });
  }

  return entry!;
}

export async function updateLeaderboardScore(
  walletAddress: string,
  epochId: number,
  scoreDelta: number,
  result: "win" | "loss" | "draw"
) {
  const entry = await getOrCreateLeaderboardEntry(walletAddress, epochId);
  const updates: Record<string, unknown> = {
    score: entry.score + scoreDelta,
    gamesPlayed: entry.gamesPlayed + 1,
  };

  if (result === "win") updates.wins = entry.wins + 1;
  else if (result === "loss") updates.losses = entry.losses + 1;
  else updates.draws = entry.draws + 1;

  await getDb()
    .update(leaderboardEntries)
    .set(updates)
    .where(eq(leaderboardEntries.id, entry.id));
}

export async function getLeaderboardForEpoch(epochId: number, limit: number = 100) {
  return getDb()
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.epochId, epochId))
    .orderBy(desc(leaderboardEntries.score))
    .limit(limit);
}

export async function getTopPlayersForEpoch(epochId: number, limit: number = 10) {
  return getDb()
    .select()
    .from(leaderboardEntries)
    .where(
      and(
        eq(leaderboardEntries.epochId, epochId),
        eq(leaderboardEntries.disqualified, false)
      )
    )
    .orderBy(desc(leaderboardEntries.score))
    .limit(limit);
}

export async function disqualifyPlayer(epochId: number, walletAddress: string, reason: string) {
  await getDb()
    .update(leaderboardEntries)
    .set({ disqualified: true, disqualificationReason: reason, eligibleForRewards: false })
    .where(
      and(
        eq(leaderboardEntries.epochId, epochId),
        eq(leaderboardEntries.walletAddress, walletAddress)
      )
    );
}

export async function getCurrentEpoch() {
  return getDb().query.epochs.findFirst({
    where: eq(epochs.status, "active"),
  });
}

export async function createNewEpoch() {
  const db = getDb();
  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const result = await db
    .insert(epochs)
    .values({
      startsAt: now,
      endsAt,
      status: "active",
    })
    .returning({ id: epochs.id });

  return Number(result[0].id);
}

export async function freezeEpoch(epochId: number) {
  await getDb()
    .update(epochs)
    .set({ status: "frozen" })
    .where(eq(epochs.id, epochId));
}

export async function markEpochPaid(epochId: number, payoutTx: string) {
  await getDb()
    .update(epochs)
    .set({ status: "paid", payoutTx })
    .where(eq(epochs.id, epochId));
}

export async function getRecentEpochs(limit: number = 10) {
  return getDb()
    .select()
    .from(epochs)
    .orderBy(desc(epochs.createdAt))
    .limit(limit);
}
