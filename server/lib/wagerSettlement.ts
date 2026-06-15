// Settlement for custodial wager matches. Called from the socket layer when a
// wagered game ends: pay the winner the pot minus the house fee, or refund both
// sides on a draw. The house fee simply stays in the escrow wallet.
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { matches } from "../../db/schema";
import { payout } from "./escrow";

const CHESS_DECIMALS = 6;
function baseUnits(wholeTokens: number): bigint {
  return BigInt(Math.round(wholeTokens * 10 ** CHESS_DECIMALS));
}

const WAGER_MODES = new Set(["wager_public", "wager_private"]);

/**
 * Settle a finished wager match. Idempotent: a match with escrowSettleSig
 * already set is skipped. `winnerWallet` null = draw (refund both).
 */
export async function settleWager(
  matchId: number,
  winnerWallet: string | null
): Promise<void> {
  const db = await getDb();
  const [row] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!row) return;
  if (!WAGER_MODES.has(row.matchMode)) return; // free match — nothing to settle
  if (!row.stakeAmount || row.stakeAmount <= 0 || !row.stakeMint) return;
  if (row.escrowSettleSig) return; // already settled

  const mint = row.stakeMint;
  const pot = row.stakeAmount * 2;
  const fee = Math.floor((pot * (row.rakeBps ?? 200)) / 10_000);

  try {
    let settleSig: string;
    if (winnerWallet && (winnerWallet === row.whiteWallet || winnerWallet === row.blackWallet)) {
      // Winner takes the pot minus the house fee (fee retained in escrow).
      settleSig = await payout({
        toWallet: winnerWallet,
        mint,
        amountBaseUnits: baseUnits(pot - fee),
        decimals: CHESS_DECIMALS,
      });
    } else {
      // Draw / no winner: refund each side their original stake.
      await payout({
        toWallet: row.whiteWallet,
        mint,
        amountBaseUnits: baseUnits(row.stakeAmount),
        decimals: CHESS_DECIMALS,
      });
      settleSig = await payout({
        toWallet: row.blackWallet,
        mint,
        amountBaseUnits: baseUnits(row.stakeAmount),
        decimals: CHESS_DECIMALS,
      });
    }

    await db
      .update(matches)
      .set({ escrowSettleSig: settleSig })
      .where(eq(matches.id, matchId));
  } catch (err) {
    // Never throw into the game loop. Leave escrowSettleSig null so a retry
    // (manual or a future sweep) can re-attempt payout.
    console.error(`[settleWager] match ${matchId} payout failed:`, (err as Error).message);
  }
}
