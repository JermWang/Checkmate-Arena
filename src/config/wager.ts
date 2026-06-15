// ============================================================
// Wagered match configuration
// ============================================================

/**
 * $CHESS SPL mint.
 *
 * Read from VITE_CHESS_MINT, falling back to a dev placeholder only when the
 * env var is absent. The Anchor escrow program checks the mint on every
 * instruction so no contract change is needed when the mint is configured.
 */
export const CHESS_MINT =
  import.meta.env.VITE_CHESS_MINT ||
  "ChESSpLAcEHoLdErMiNTpUbKey1111111111111111";

export const IS_PLACEHOLDER = !import.meta.env.VITE_CHESS_MINT;

export const CHESS_DECIMALS = 6;

export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "";
export const REAL_WAGERS_ENABLED =
  import.meta.env.VITE_ENABLE_REAL_WAGERS === "true";

// Custodial wagering (server-held escrow, no smart contract). The client only
// needs the mint, an RPC, and the master switch; the escrow deposit address is
// fetched from the server at create/accept time. Gating is purely env-driven —
// nothing is hardwired off.
export const WAGER_READINESS_BLOCKERS = [
  !REAL_WAGERS_ENABLED && "VITE_ENABLE_REAL_WAGERS must be true",
  !SOLANA_RPC_URL && "VITE_SOLANA_RPC_URL is missing",
  IS_PLACEHOLDER && "VITE_CHESS_MINT is missing",
].filter(Boolean) as string[];

export const CAN_CREATE_REAL_WAGERS = WAGER_READINESS_BLOCKERS.length === 0;

/** Convert a whole-token stake (e.g. 1000) to base units for the mint. */
export function toBaseUnits(wholeTokens: number): bigint {
  return BigInt(Math.round(wholeTokens * 10 ** CHESS_DECIMALS));
}

export const STAKE_TIERS = [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000];
export const STAKE_MIN = 10;
export const STAKE_MAX = 1_000_000;

/** 2% house fee of pot, taken from total before payout. */
export const HOUSE_FEE_BPS = 200;

export const TIME_CONTROLS = ["1+0", "3+0", "5+3", "10+5"] as const;
export type TimeControl = (typeof TIME_CONTROLS)[number];

export type ColorPref = "white" | "black" | "random";

/** Private room code: 6 chars from a 32-char alphabet (excludes I/O/0/1). */
export const ROOM_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_TTL_MS = 15 * 60 * 1000;

export function generateRoomCode(): string {
  const arr = new Uint8Array(ROOM_CODE_LENGTH);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < ROOM_CODE_LENGTH; i++)
      arr[i] = Math.floor(Math.random() * 256);
  }
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++)
    code += ROOM_CODE_CHARSET[arr[i] % ROOM_CODE_CHARSET.length];
  return code;
}

export function formatChess(amount: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && amount > 0 ? "+" : "";
  return `${sign}${amount.toLocaleString()}`;
}

export function payoutFromStake(stakePerSide: number): number {
  const pot = stakePerSide * 2;
  const houseFee = Math.floor((pot * HOUSE_FEE_BPS) / 10_000);
  return pot - houseFee;
}
