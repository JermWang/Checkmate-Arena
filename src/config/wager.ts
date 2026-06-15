// ============================================================
// Wagered match configuration
// ============================================================

/**
 * $CHESS SPL mint.
 *
 * Pre-launch: read from VITE_CHESS_MINT, defaults to a devnet placeholder.
 * Launch day: set VITE_CHESS_MINT to the real mint and VITE_CHESS_LAUNCHED=true,
 * redeploy. The Anchor escrow program checks the mint on every instruction so
 * no contract change is needed.
 */
export const CHESS_MINT =
  import.meta.env.VITE_CHESS_MINT ||
  "ChESSpLAcEHoLdErMiNTpUbKey1111111111111111";

export const IS_PLACEHOLDER = !import.meta.env.VITE_CHESS_MINT;

export const CHESS_DECIMALS = 6;

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
