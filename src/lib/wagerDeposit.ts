// Client-side stake deposit for custodial wagering. The player signs a plain
// SPL token transfer of their stake into the server's escrow wallet — no smart
// contract, just @solana/spl-token. The returned signature is handed to the
// server (wager.create / wager.accept), which verifies the deposit landed.
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";

export async function depositStake(params: {
  connection: Connection;
  owner: PublicKey;
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>;
  escrowAddress: string;
  mint: string;
  amountBaseUnits: bigint;
  decimals: number;
}): Promise<string> {
  const { connection, owner, sendTransaction, escrowAddress, mint, amountBaseUnits, decimals } = params;
  const mintPk = new PublicKey(mint);
  const escrowPk = new PublicKey(escrowAddress);
  const sourceAta = getAssociatedTokenAddressSync(mintPk, owner, false);
  const destAta = getAssociatedTokenAddressSync(mintPk, escrowPk, true);

  const tx = new Transaction().add(
    // Create the escrow's token account if it doesn't exist yet (no-op if it does).
    createAssociatedTokenAccountIdempotentInstruction(owner, destAta, escrowPk, mintPk),
    createTransferCheckedInstruction(sourceAta, mintPk, destAta, owner, amountBaseUnits, decimals)
  );

  const sig = await sendTransaction(tx, connection);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  return sig;
}
