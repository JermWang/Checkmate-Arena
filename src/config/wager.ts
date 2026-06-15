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

const PLACEHOLDER_ESCROW_PROGRAM_ID =
  "MaTcHeScRoWpRoGrAm111111111111111111111111";

export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "";
export const MATCH_ESCROW_PROGRAM_ID =
  import.meta.env.VITE_MATCH_ESCROW_PROGRAM_ID || "";
export const WAGER_SERVER_AUTHORITY =
  import.meta.env.VITE_WAGER_SERVER_AUTHORITY || "";
export const WAGER_TREASURY = import.meta.env.VITE_WAGER_TREASURY || "";
export const REAL_WAGERS_ENABLED =
  import.meta.env.VITE_ENABLE_REAL_WAGERS === "true";
export const WAGER_ESCROW_TRANSACTIONS_ENABLED =
  import.meta.env.VITE_WAGER_ESCROW_TRANSACTIONS_ENABLED === "true";
export const CLIENT_ESCROW_SIGNING_IMPLEMENTED = false;

export const WAGER_READINESS_BLOCKERS = [
  !REAL_WAGERS_ENABLED && "VITE_ENABLE_REAL_WAGERS must be true",
  !WAGER_ESCROW_TRANSACTIONS_ENABLED &&
    "VITE_WAGER_ESCROW_TRANSACTIONS_ENABLED must be true",
  !CLIENT_ESCROW_SIGNING_IMPLEMENTED &&
    "Client escrow transaction signing is not implemented",
  !PRIVY_APP_ID && "VITE_PRIVY_APP_ID is missing",
  !SOLANA_RPC_URL && "VITE_SOLANA_RPC_URL is missing",
  IS_PLACEHOLDER && "VITE_CHESS_MINT is missing",
  !MATCH_ESCROW_PROGRAM_ID && "VITE_MATCH_ESCROW_PROGRAM_ID is missing",
  MATCH_ESCROW_PROGRAM_ID === PLACEHOLDER_ESCROW_PROGRAM_ID &&
    "VITE_MATCH_ESCROW_PROGRAM_ID is still the placeholder program id",
  !WAGER_SERVER_AUTHORITY && "VITE_WAGER_SERVER_AUTHORITY is missing",
  !WAGER_TREASURY && "VITE_WAGER_TREASURY is missing",
].filter(Boolean) as string[];

export const CAN_CREATE_REAL_WAGERS = WAGER_READINESS_BLOCKERS.length === 0;

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
