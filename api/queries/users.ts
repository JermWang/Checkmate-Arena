import { getDb } from "./connection";
import { users, chessPlayers } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

// ============================================================
// AUTH USERS (for Kimi OAuth)
// ============================================================

export async function findUserByUnionId(unionId: string) {
  return getDb().query.users.findFirst({
    where: eq(users.unionId, unionId),
  });
}

export async function upsertUser(data: {
  unionId: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  lastSignInAt?: Date;
}) {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.unionId, data.unionId),
  });

  if (existing) {
    await db
      .update(users)
      .set({
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        avatar: data.avatar ?? existing.avatar,
        lastSignInAt: data.lastSignInAt ?? new Date(),
      })
      .where(eq(users.id, existing.id));
    return { ...existing, ...data, lastSignInAt: data.lastSignInAt ?? new Date() };
  }

  const result = await db
    .insert(users)
    .values({
      unionId: data.unionId,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: "user",
      lastSignInAt: data.lastSignInAt ?? new Date(),
    })
    .returning({ id: users.id });

  const newUser = await db.query.users.findFirst({
    where: eq(users.id, Number(result[0].id)),
  });
  return newUser!;
}

export async function findOrCreateUser(walletAddress: string) {
  const db = getDb();
  let user = await db.query.chessPlayers.findFirst({
    where: eq(chessPlayers.walletAddress, walletAddress),
  });

  if (!user) {
    await db.insert(chessPlayers).values({
      walletAddress,
      currentRating: 1000,
      dailyScore: 0,
      lifetimeWins: 0,
      lifetimeLosses: 0,
      lifetimeDraws: 0,
      dailyWins: 0,
      dailyLosses: 0,
      dailyDraws: 0,
      currentStreak: 0,
      cheatScore: 0,
      isBanned: false,
      gamesPlayedToday: 0,
    });

    user = await db.query.chessPlayers.findFirst({
      where: eq(chessPlayers.walletAddress, walletAddress),
    });
  }

  return user!;
}

export async function getUserByWallet(walletAddress: string) {
  return getDb().query.chessPlayers.findFirst({
    where: eq(chessPlayers.walletAddress, walletAddress),
  });
}

export async function updateUserRating(walletAddress: string, newRating: number) {
  await getDb()
    .update(chessPlayers)
    .set({ currentRating: newRating })
    .where(eq(chessPlayers.walletAddress, walletAddress));
}

export async function updateDailyScore(walletAddress: string, scoreDelta: number) {
  await getDb()
    .update(chessPlayers)
    .set({
      dailyScore: sql`${chessPlayers.dailyScore} + ${scoreDelta}`,
    })
    .where(eq(chessPlayers.walletAddress, walletAddress));
}

export async function recordMatchResult(
  walletAddress: string,
  result: "win" | "loss" | "draw",
  scoreDelta: number
) {
  const db = getDb();
  const user = await db.query.chessPlayers.findFirst({
    where: eq(chessPlayers.walletAddress, walletAddress),
  });

  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);
  const isNewDay = user.lastGameDate !== today;

  const updates: Record<string, unknown> = {
    dailyScore: user.dailyScore + scoreDelta,
  };

  if (result === "win") {
    updates.lifetimeWins = user.lifetimeWins + 1;
    updates.dailyWins = isNewDay ? 1 : user.dailyWins + 1;
    updates.currentStreak = user.currentStreak > 0 ? user.currentStreak + 1 : 1;
  } else if (result === "loss") {
    updates.lifetimeLosses = user.lifetimeLosses + 1;
    updates.dailyLosses = isNewDay ? 1 : user.dailyLosses + 1;
    updates.currentStreak = 0;
  } else {
    updates.lifetimeDraws = user.lifetimeDraws + 1;
    updates.dailyDraws = isNewDay ? 1 : user.dailyDraws + 1;
  }

  updates.gamesPlayedToday = isNewDay ? 1 : user.gamesPlayedToday + 1;
  updates.lastGameDate = today;

  await db.update(chessPlayers).set(updates).where(eq(chessPlayers.walletAddress, walletAddress));
}

export async function getLifetimeLeaderboard(limit: number = 100) {
  return getDb()
    .select()
    .from(chessPlayers)
    .where(eq(chessPlayers.isBanned, false))
    .orderBy(desc(chessPlayers.currentRating))
    .limit(limit);
}

export async function getDailyLeaderboard(limit: number = 100) {
  return getDb()
    .select()
    .from(chessPlayers)
    .where(eq(chessPlayers.isBanned, false))
    .orderBy(desc(chessPlayers.dailyScore))
    .limit(limit);
}

export async function resetDailyStats() {
  await getDb().update(chessPlayers).set({
    dailyScore: 0,
    dailyWins: 0,
    dailyLosses: 0,
    dailyDraws: 0,
    gamesPlayedToday: 0,
  });
}

export async function addCheatScore(walletAddress: string, score: number) {
  await getDb()
    .update(chessPlayers)
    .set({
      cheatScore: sql`${chessPlayers.cheatScore} + ${score}`,
    })
    .where(eq(chessPlayers.walletAddress, walletAddress));
}

export async function banUser(walletAddress: string) {
  await getDb()
    .update(chessPlayers)
    .set({ isBanned: true })
    .where(eq(chessPlayers.walletAddress, walletAddress));
}
