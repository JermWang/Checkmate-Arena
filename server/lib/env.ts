import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  chessMint: process.env.CHESS_MINT || process.env.VITE_CHESS_MINT || "",
  privyAppId: process.env.VITE_PRIVY_APP_ID || "",
  privyAppSecret: process.env.PRIVY_APP_SECRET || "",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || "",
  realWagersEnabled: process.env.ENABLE_REAL_WAGERS === "true" ||
    process.env.VITE_ENABLE_REAL_WAGERS === "true",
  // Enforce the $CHESS holding requirement for ranked play. Off by default so
  // the arena stays open before the token launches; flip on once $CHESS is live.
  tokenGateEnabled: process.env.ENABLE_TOKEN_GATE === "true" ||
    process.env.VITE_ENABLE_TOKEN_GATE === "true",
  wagerEscrowTransactionsEnabled:
    process.env.WAGER_ESCROW_TRANSACTIONS_ENABLED === "true" ||
    process.env.VITE_WAGER_ESCROW_TRANSACTIONS_ENABLED === "true",
  matchEscrowProgramId:
    process.env.MATCH_ESCROW_PROGRAM_ID ||
    process.env.VITE_MATCH_ESCROW_PROGRAM_ID ||
    "",
  wagerServerAuthority:
    process.env.WAGER_SERVER_AUTHORITY ||
    process.env.VITE_WAGER_SERVER_AUTHORITY ||
    "",
  wagerTreasury:
    process.env.WAGER_TREASURY || process.env.VITE_WAGER_TREASURY || "",
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};

// Custodial wager readiness. There is no on-chain program — the server holds a
// hot-wallet escrow and signs payouts — so readiness is purely env-driven:
// flip ENABLE_REAL_WAGERS once the escrow secret + RPC + mint are set.
export function getWagerReadiness() {
  const escrowConfigured = Boolean(
    process.env.WAGER_ESCROW_SECRET_KEY || (!env.isProduction && env.wagerTreasury)
  );
  const blockers = [
    !env.realWagersEnabled && "ENABLE_REAL_WAGERS must be true",
    !env.solanaRpcUrl && "SOLANA_RPC_URL is missing",
    !env.chessMint && "CHESS_MINT (or VITE_CHESS_MINT) is missing",
    !escrowConfigured && "Escrow wallet (WAGER_ESCROW_SECRET_KEY) is not configured",
  ].filter(Boolean) as string[];

  return {
    ready: blockers.length === 0,
    blockers,
    configured: {
      solanaRpcUrl: Boolean(env.solanaRpcUrl),
      chessMint: Boolean(env.chessMint),
      escrowConfigured,
      realWagersEnabled: env.realWagersEnabled,
    },
  };
}
