// ============================================================
// Custodial wager escrow — server-held hot wallet (no smart contract)
//
// Players deposit their stake (a plain SPL token transfer they sign with their
// own wallet) into the escrow wallet's associated token account. The server
// holds the pot and, when a match settles, signs the payout to the winner with
// the escrow keypair. The 2% house fee simply stays in the escrow wallet.
//
// The escrow secret key is loaded from WAGER_ESCROW_SECRET_KEY (a JSON byte
// array, the format `solana-keygen` writes). In local dev it falls back to
// .keys/wager-treasury.json. NEVER commit the secret; on Railway set it as an
// env var (the .keys/ dir is gitignored and absent in prod).
// ============================================================
import {
  Connection,
  Keypair,
  PublicKey,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "./env";

let cachedKeypair: Keypair | null = null;

function loadSecretKeyBytes(): Uint8Array | null {
  const raw = process.env.WAGER_ESCROW_SECRET_KEY?.trim();
  if (raw) {
    try {
      return Uint8Array.from(JSON.parse(raw));
    } catch {
      throw new Error("WAGER_ESCROW_SECRET_KEY is set but is not a valid JSON byte array.");
    }
  }
  // Dev fallback: read the scaffolded keypair file if present.
  if (!env.isProduction) {
    try {
      const file = resolve(process.cwd(), ".keys/wager-treasury.json");
      return Uint8Array.from(JSON.parse(readFileSync(file, "utf8")));
    } catch {
      return null;
    }
  }
  return null;
}

/** The escrow hot wallet keypair, or null if not configured. */
export function getEscrowKeypair(): Keypair | null {
  if (cachedKeypair) return cachedKeypair;
  const bytes = loadSecretKeyBytes();
  if (!bytes) return null;
  cachedKeypair = Keypair.fromSecretKey(bytes);
  return cachedKeypair;
}

/** Escrow wallet public key (where players send their stake), or null. */
export function getEscrowPublicKey(): PublicKey | null {
  return getEscrowKeypair()?.publicKey ?? null;
}

export function isEscrowConfigured(): boolean {
  return getEscrowKeypair() !== null;
}

function connection(): Connection {
  if (!env.solanaRpcUrl) throw new Error("SOLANA_RPC_URL is not configured.");
  return new Connection(env.solanaRpcUrl, "confirmed");
}

/** Net base-unit change to the escrow ATA for `mint` within a parsed tx. */
function escrowDeltaForMint(
  tx: ParsedTransactionWithMeta,
  escrowAta: string,
  mint: string
): bigint {
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const keys = tx.transaction.message.accountKeys;
  const idxOfAta = keys.findIndex((k) => k.pubkey.toBase58() === escrowAta);
  if (idxOfAta < 0) return 0n;
  const preBal = pre.find((b) => b.accountIndex === idxOfAta && b.mint === mint);
  const postBal = post.find((b) => b.accountIndex === idxOfAta && b.mint === mint);
  const preAmt = BigInt(preBal?.uiTokenAmount.amount ?? "0");
  const postAmt = BigInt(postBal?.uiTokenAmount.amount ?? "0");
  return postAmt - preAmt;
}

/**
 * Verify a player's stake deposit landed in escrow: the signature must be a
 * confirmed, successful tx in which the escrow ATA for `mint` increased by at
 * least `amountBaseUnits`, signed by `payerWallet`.
 */
export async function verifyDeposit(params: {
  signature: string;
  payerWallet: string;
  mint: string;
  amountBaseUnits: bigint;
}): Promise<void> {
  const escrow = getEscrowPublicKey();
  if (!escrow) throw new Error("Escrow wallet is not configured.");

  const conn = connection();
  const tx = await conn.getParsedTransaction(params.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) throw new Error("Deposit transaction not found or not yet confirmed.");
  if (tx.meta?.err) throw new Error("Deposit transaction failed on-chain.");

  // Bind the deposit to the claiming wallet: it must be a signer of the tx.
  const signers = tx.transaction.message.accountKeys
    .filter((k) => k.signer)
    .map((k) => k.pubkey.toBase58());
  if (!signers.includes(params.payerWallet)) {
    throw new Error("Deposit was not signed by the staking wallet.");
  }

  const escrowAta = getAssociatedTokenAddressSync(
    new PublicKey(params.mint),
    escrow,
    true
  ).toBase58();
  const delta = escrowDeltaForMint(tx, escrowAta, params.mint);
  if (delta < params.amountBaseUnits) {
    throw new Error(
      `Deposit too small: escrow received ${delta} base units, expected ${params.amountBaseUnits}.`
    );
  }
}

/**
 * Pay `amountBaseUnits` of `mint` from escrow to `toWallet`, signed by the
 * escrow keypair. Creates the recipient ATA if needed (rent paid by escrow).
 * Returns the confirmed signature.
 */
export async function payout(params: {
  toWallet: string;
  mint: string;
  amountBaseUnits: bigint;
  decimals: number;
}): Promise<string> {
  const escrow = getEscrowKeypair();
  if (!escrow) throw new Error("Escrow wallet is not configured.");
  if (params.amountBaseUnits <= 0n) throw new Error("Payout amount must be positive.");

  const conn = connection();
  const mintPk = new PublicKey(params.mint);

  const sourceAta = await getOrCreateAssociatedTokenAccount(conn, escrow, mintPk, escrow.publicKey);
  const destAta = await getOrCreateAssociatedTokenAccount(
    conn,
    escrow,
    mintPk,
    new PublicKey(params.toWallet)
  );

  const ix = createTransferCheckedInstruction(
    sourceAta.address,
    mintPk,
    destAta.address,
    escrow.publicKey,
    params.amountBaseUnits,
    params.decimals
  );

  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [escrow], {
    commitment: "confirmed",
  });
  return sig;
}
