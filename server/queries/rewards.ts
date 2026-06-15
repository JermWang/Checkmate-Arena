import { getDb } from "./connection";
import { epochRewards, tokenSnapshots } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export async function createEpochReward(data: {
  epochId: number;
  walletAddress: string;
  rank: number;
  score: number;
  payoutPercentage: string;
  payoutAmount: string;
  payoutToken: string;
}) {
  await getDb().insert(epochRewards).values(data);
}

export async function getRewardsForEpoch(epochId: number) {
  return getDb()
    .select()
    .from(epochRewards)
    .where(eq(epochRewards.epochId, epochId))
    .orderBy(epochRewards.rank);
}

export async function getRewardsForWallet(walletAddress: string) {
  return getDb()
    .select()
    .from(epochRewards)
    .where(eq(epochRewards.walletAddress, walletAddress))
    .orderBy(desc(epochRewards.createdAt));
}

export async function markRewardPaid(rewardId: number, tx: string) {
  await getDb()
    .update(epochRewards)
    .set({ payoutStatus: "paid", payoutTx: tx })
    .where(eq(epochRewards.id, rewardId));
}

export async function markRewardWithheld(rewardId: number) {
  await getDb()
    .update(epochRewards)
    .set({ payoutStatus: "withheld" })
    .where(eq(epochRewards.id, rewardId));
}

export async function getRecentPayouts(limit: number = 50) {
  return getDb()
    .select()
    .from(epochRewards)
    .where(eq(epochRewards.payoutStatus, "paid"))
    .orderBy(desc(epochRewards.createdAt))
    .limit(limit);
}

export async function saveTokenSnapshot(data: {
  walletAddress: string;
  tokenMint: string;
  tokenBalance: string;
  isEligible: boolean;
}) {
  await getDb().insert(tokenSnapshots).values({
    ...data,
    checkedAt: new Date(),
  });
}

export async function getLatestTokenSnapshot(walletAddress: string) {
  return getDb()
    .select()
    .from(tokenSnapshots)
    .where(eq(tokenSnapshots.walletAddress, walletAddress))
    .orderBy(desc(tokenSnapshots.checkedAt))
    .limit(1);
}
