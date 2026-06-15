import { getDb } from "./connection";
import { adminFlags, adminActions } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function createAdminFlag(data: {
  walletAddress: string;
  matchId?: number;
  epochId?: number;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}) {
  await getDb().insert(adminFlags).values(data);
}

export async function getFlagsByStatus(status: "open" | "reviewed" | "dismissed" | "confirmed") {
  return getDb()
    .select()
    .from(adminFlags)
    .where(eq(adminFlags.status, status))
    .orderBy(desc(adminFlags.createdAt));
}

export async function getFlagsForWallet(walletAddress: string) {
  return getDb()
    .select()
    .from(adminFlags)
    .where(eq(adminFlags.walletAddress, walletAddress))
    .orderBy(desc(adminFlags.createdAt));
}

export async function resolveFlag(flagId: number, status: "reviewed" | "dismissed" | "confirmed") {
  await getDb()
    .update(adminFlags)
    .set({ status, resolvedAt: new Date() })
    .where(eq(adminFlags.id, flagId));
}

export async function getHighRiskFlags() {
  return getDb()
    .select()
    .from(adminFlags)
    .where(
      and(
        eq(adminFlags.status, "open"),
        eq(adminFlags.severity, "high")
      )
    )
    .orderBy(desc(adminFlags.createdAt));
}

export async function logAdminAction(data: {
  adminWallet: string;
  actionType: string;
  targetWallet?: string;
  matchId?: number;
  epochId?: number;
  notes?: string;
}) {
  await getDb().insert(adminActions).values(data);
}

export async function getRecentAdminActions(limit: number = 100) {
  return getDb()
    .select()
    .from(adminActions)
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
}
