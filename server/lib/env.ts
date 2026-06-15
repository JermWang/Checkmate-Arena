import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

const PLACEHOLDER_ESCROW_PROGRAM_ID =
  "MaTcHeScRoWpRoGrAm111111111111111111111111";
const CLIENT_ESCROW_SIGNING_IMPLEMENTED = false;

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

export function getWagerReadiness() {
  const blockers = [
    !env.realWagersEnabled && "ENABLE_REAL_WAGERS must be true",
    !env.wagerEscrowTransactionsEnabled &&
      "WAGER_ESCROW_TRANSACTIONS_ENABLED must be true",
    !CLIENT_ESCROW_SIGNING_IMPLEMENTED &&
      "Client escrow transaction signing is not implemented",
    !env.privyAppId && "VITE_PRIVY_APP_ID is missing",
    !env.privyAppSecret && "PRIVY_APP_SECRET is missing",
    !env.solanaRpcUrl && "SOLANA_RPC_URL is missing",
    !env.chessMint && "CHESS_MINT or VITE_CHESS_MINT is missing",
    !env.matchEscrowProgramId && "MATCH_ESCROW_PROGRAM_ID is missing",
    env.matchEscrowProgramId === PLACEHOLDER_ESCROW_PROGRAM_ID &&
      "MATCH_ESCROW_PROGRAM_ID is still the placeholder program id",
    !env.wagerServerAuthority && "WAGER_SERVER_AUTHORITY is missing",
    !env.wagerTreasury && "WAGER_TREASURY is missing",
  ].filter(Boolean) as string[];

  return {
    ready: blockers.length === 0,
    blockers,
    configured: {
      privyAppId: Boolean(env.privyAppId),
      privyAppSecret: Boolean(env.privyAppSecret),
      solanaRpcUrl: Boolean(env.solanaRpcUrl),
      chessMint: Boolean(env.chessMint),
      matchEscrowProgramId: Boolean(env.matchEscrowProgramId),
      wagerServerAuthority: Boolean(env.wagerServerAuthority),
      wagerTreasury: Boolean(env.wagerTreasury),
      realWagersEnabled: env.realWagersEnabled,
      wagerEscrowTransactionsEnabled: env.wagerEscrowTransactionsEnabled,
      clientEscrowSigningImplemented: CLIENT_ESCROW_SIGNING_IMPLEMENTED,
    },
  };
}
