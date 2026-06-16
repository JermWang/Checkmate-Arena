// On-chain SPL token balance lookup for the ranked token gate.
import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./env";

/**
 * Returns the owner's UI balance (decimals applied) of `mint`, summed across all
 * of their token accounts. Returns 0 on any error or when RPC/mint isn't
 * configured — callers decide how to fail (the ranked gate fails OPEN when the
 * gate flag is off).
 */
export async function getTokenUiBalance(owner: string, mint: string): Promise<number> {
  if (!env.solanaRpcUrl || !mint) return 0;
  try {
    const conn = new Connection(env.solanaRpcUrl, "confirmed");
    const res = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), {
      mint: new PublicKey(mint),
    });
    let total = 0;
    for (const { account } of res.value) {
      const amount = account.data.parsed?.info?.tokenAmount?.uiAmount;
      if (typeof amount === "number") total += amount;
    }
    return total;
  } catch (err) {
    console.error("[eligibility] token balance fetch failed:", (err as Error)?.message ?? err);
    return 0;
  }
}
