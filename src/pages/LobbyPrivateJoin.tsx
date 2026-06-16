import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useConnection, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { Clock, Coins, ShieldCheck, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { depositStake } from "@/lib/wagerDeposit";
import { shortWallet } from "@/lib/profile";
import {
  CAN_CREATE_REAL_WAGERS,
  WAGER_READINESS_BLOCKERS,
  payoutFromStake,
  toBaseUnits,
} from "@/config/wager";

export default function LobbyPrivateJoin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = (params.get("code") || "").toUpperCase();

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useSolanaWallet();
  const challenge = trpc.wager.byCode.useQuery({ code }, { enabled: code.length === 6 });
  const wagerConfig = trpc.wager.config.useQuery(undefined, { staleTime: 60_000 });
  const acceptMut = trpc.wager.accept.useMutation();

  const stake = challenge.data?.stakeAmount ?? 0;
  const tc = "match settings";
  const opponent = {
    handle: challenge.data ? shortWallet(challenge.data.creatorWallet) : "creator",
    rating: 0,
  };
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readinessMessage = WAGER_READINESS_BLOCKERS[0] ?? "";

  const onAccept = async () => {
    if (!CAN_CREATE_REAL_WAGERS || accepting) return;
    setError(null);
    const cfg = wagerConfig.data;
    const row = challenge.data;
    if (!row) {
      setError("This challenge is no longer available (expired or already accepted).");
      return;
    }
    if (!publicKey || !sendTransaction) {
      setError("Connect a Solana wallet (Phantom/Solflare) to accept.");
      return;
    }
    if (!cfg?.ready || !cfg.escrowAddress || !cfg.mint) {
      setError(`Wagering isn't enabled on the server${cfg?.blockers?.[0] ? `: ${cfg.blockers[0]}` : "."}`);
      return;
    }
    try {
      setAccepting(true);
      const sig = await depositStake({
        connection,
        owner: publicKey,
        sendTransaction,
        escrowAddress: cfg.escrowAddress,
        mint: cfg.mint,
        amountBaseUnits: toBaseUnits(row.stakeAmount),
        decimals: cfg.decimals,
      });
      await acceptMut.mutateAsync({
        matchId: row.id,
        challengerWallet: publicKey.toBase58(),
        escrowAcceptSig: sig,
      });
      navigate(`/play?match=${row.id}`);
    } catch (e) {
      setError((e as Error).message || "Failed to accept challenge.");
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-md mx-auto px-4 md:px-8 py-6">
        <Link
          to="/lobby/private"
          className="inline-flex items-center gap-1.5 text-xs text-[#8A8F98] hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-5">
          Accept challenge
        </h1>

        <div className="rounded-2xl border border-[#E6B84F]/30 bg-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(230, 184, 79,0.15),0_0_32px_rgba(230, 184, 79,0.10)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5A4A18] font-mono text-xs font-medium text-[#EFE2B8]">
                {opponent.handle.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{opponent.handle}</div>
                <div className="font-mono text-[11px] text-[#8A8F98]">
                  Rating {opponent.rating}
                </div>
              </div>
            </div>
            <div className="font-mono text-[10px] text-[#8A8F98]">
              Code:{" "}
              <span className="text-[#E6B84F]">{code || "------"}</span>
            </div>
          </div>

          <div className="space-y-2 border-y border-white/5 py-4">
            <Line icon={<Coins className="w-3.5 h-3.5" />} k="Stake">
              <span className="font-mono text-[#E6B84F]">
                {stake.toLocaleString()} $CHESS
              </span>
            </Line>
            <Line icon={<Clock className="w-3.5 h-3.5" />} k="Time control">
              <span className="font-mono text-white">{tc}</span>
            </Line>
            <Line icon={<User className="w-3.5 h-3.5" />} k="Your color">
              <span className="text-white">Auto-assigned</span>
            </Line>
          </div>

          <div className="mt-4 rounded-lg border border-[#E6B84F]/25 bg-[#E6B84F]/[0.05] p-3 font-mono text-xs text-[#E6B84F]">
            Accepting locks {stake.toLocaleString()} $CHESS in escrow. Winner takes{" "}
            {payoutFromStake(stake).toLocaleString()} after the 2% house fee.
            You pay your own network gas when signing.
          </div>

          {!CAN_CREATE_REAL_WAGERS && (
            <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-200">
              Live wagering is disabled until it is enabled in the server env. Next blocker: {readinessMessage}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/[0.06] p-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          <Button
            size="lg"
            onClick={onAccept}
            disabled={accepting || !code || !CAN_CREATE_REAL_WAGERS || !challenge.data}
            className="mt-4 w-full bg-[#E6B84F] text-black hover:bg-[#E6B84F]/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {accepting ? (
              <>
                <ShieldCheck className="w-4 h-4 animate-pulse" />
                Locking stake…
              </>
            ) : (
              CAN_CREATE_REAL_WAGERS ? "Accept & lock stake" : "Live wager config required"
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-[#8A8F98] mt-4">
          This room is single-use and expires 15 minutes after creation.
        </p>
      </div>
    </div>
  );
}

function Line({
  icon,
  k,
  children,
}: {
  icon: React.ReactNode;
  k: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2 text-[#8A8F98]">
        {icon}
        {k}
      </span>
      {children}
    </div>
  );
}
