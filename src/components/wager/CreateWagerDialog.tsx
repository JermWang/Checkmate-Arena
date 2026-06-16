import { useState } from "react";
import { useNavigate } from "react-router";
import { useConnection, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Coins, Lock, ShieldCheck } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { depositStake } from "@/lib/wagerDeposit";
import {
  STAKE_TIERS,
  TIME_CONTROLS,
  type TimeControl,
  type ColorPref,
  payoutFromStake,
  toBaseUnits,
  CHESS_MINT,
  CAN_CREATE_REAL_WAGERS,
  WAGER_READINESS_BLOCKERS,
} from "@/config/wager";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "public" | "private";
}

export function CreateWagerDialog({ open, onOpenChange, mode }: Props) {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useSolanaWallet();
  const wagerConfig = trpc.wager.config.useQuery(undefined, { staleTime: 60_000 });
  const createMut = trpc.wager.create.useMutation();
  const [stake, setStake] = useState(1000);
  const [customStake, setCustomStake] = useState("1000");
  const [tc, setTc] = useState<TimeControl>("3+0");
  const [color, setColor] = useState<ColorPref>("random");
  const [spectators, setSpectators] = useState(mode === "public");
  const [ranked, setRanked] = useState(mode === "public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mintLabel = `${CHESS_MINT.slice(0, 4)}...${CHESS_MINT.slice(-4)}`;
  const readinessMessage = WAGER_READINESS_BLOCKERS[0] ?? "";

  const handleCreate = async () => {
    if (!CAN_CREATE_REAL_WAGERS || busy) return;
    setError(null);
    const cfg = wagerConfig.data;
    if (!publicKey || !sendTransaction) {
      setError("Connect a Solana wallet (Phantom/Solflare) to wager.");
      return;
    }
    if (!cfg?.ready || !cfg.escrowAddress || !cfg.mint) {
      setError(`Wagering isn't enabled on the server${cfg?.blockers?.[0] ? `: ${cfg.blockers[0]}` : "."}`);
      return;
    }
    try {
      setBusy(true);
      // 1) Lock the stake: sign + submit the SPL transfer into escrow.
      const sig = await depositStake({
        connection,
        owner: publicKey,
        sendTransaction,
        escrowAddress: cfg.escrowAddress,
        mint: cfg.mint,
        amountBaseUnits: toBaseUnits(stake),
        decimals: cfg.decimals,
      });
      // 2) Register the wager server-side (server verifies the deposit).
      const res = await createMut.mutateAsync({
        creatorWallet: publicKey.toBase58(),
        stakeAmount: stake,
        timeControl: tc,
        colorPref: color,
        isPrivate: mode === "private",
        allowSpectators: spectators,
        ranked,
        escrowCreateSig: sig,
      });
      onOpenChange(false);
      if (mode === "private" && res.roomCode) {
        navigate(`/lobby/private/created?code=${res.roomCode}&match=${res.matchId}`);
      } else {
        navigate(`/play?match=${res.matchId}`);
      }
    } catch (e) {
      setError((e as Error).message || "Failed to create wager.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {mode === "private" ? (
              <Lock className="w-4 h-4 text-[#E6B84F]" />
            ) : (
              <Coins className="w-4 h-4 text-[#E6B84F]" />
            )}
            {mode === "private" ? "Create private room" : "Post public challenge"}
          </DialogTitle>
          <DialogDescription className="text-[#8A8F98]">
            No holding minimum is required. Both sides escrow the same $CHESS stake
            using mint {mintLabel}; winner takes the pot minus a 2% house fee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Stake */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#8A8F98]">
              Stake
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STAKE_TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setStake(t);
                    setCustomStake(t.toString());
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-mono transition-all ${
                    stake === t
                      ? "border-[#E6B84F]/60 bg-[#E6B84F]/15 text-[#E6B84F]"
                      : "border-white/10 bg-white/[0.02] text-[#8A8F98] hover:border-white/30"
                  }`}
                >
                  {t.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={customStake}
                onChange={(e) => {
                  setCustomStake(e.target.value);
                  const n = parseFloat(e.target.value.replace(/,/g, ""));
                  if (Number.isFinite(n) && n > 0) setStake(n);
                }}
                className="font-mono bg-white/[0.02] border-white/10"
                placeholder="Custom"
              />
              <span className="text-xs font-mono text-[#E6B84F] whitespace-nowrap">
                $CHESS
              </span>
            </div>
          </div>

          {/* Time control */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#8A8F98]">
              Time control
            </Label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {TIME_CONTROLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTc(t)}
                  className={`rounded-md border px-2 py-2 text-xs font-mono transition-all ${
                    tc === t
                      ? "border-[#E6B84F]/60 bg-[#E6B84F]/15 text-[#E6B84F]"
                      : "border-white/10 bg-white/[0.02] text-[#8A8F98] hover:border-white/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#8A8F98]">
              Your color
            </Label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(["white", "black", "random"] as ColorPref[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`rounded-md border px-2 py-2 text-xs capitalize transition-all ${
                    color === c
                      ? "border-[#E6B84F]/60 bg-[#E6B84F]/15 text-[#E6B84F]"
                      : "border-white/10 bg-white/[0.02] text-[#8A8F98] hover:border-white/30"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Private-only toggles */}
          {mode === "private" && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Allow spectators</p>
                  <p className="text-xs text-[#8A8F98]">Off by default for private</p>
                </div>
                <Switch checked={spectators} onCheckedChange={setSpectators} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Affect ELO (ranked)</p>
                  <p className="text-xs text-[#8A8F98]">Off by default for private</p>
                </div>
                <Switch checked={ranked} onCheckedChange={setRanked} />
              </div>
            </div>
          )}

          {/* Payout summary */}
          <div className="rounded-lg border border-[#E6B84F]/25 bg-[#E6B84F]/[0.05] p-3 font-mono text-xs text-[#E6B84F]">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3 h-3" />
              Escrow summary
            </div>
            <div className="text-[#8A8F98]">
              You lock <span className="text-[#E6B84F]">{stake.toLocaleString()} $CHESS</span>.
              Opponent matches it.
              Winner takes{" "}
              <span className="text-[#E6B84F]">
                {payoutFromStake(stake).toLocaleString()}
              </span>{" "}
              ({" "}<span className="text-white">{(stake * 2).toLocaleString()}</span> pot · 2% house fee){" "}.
              You pay your own network gas when signing.
            </div>
          </div>

          {!CAN_CREATE_REAL_WAGERS && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-200">
              Live wagering is disabled until production escrow and Privy signing are fully configured.
              Next blocker: {readinessMessage}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/[0.06] p-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!CAN_CREATE_REAL_WAGERS || busy}
            className="w-full bg-[#E6B84F] text-black hover:bg-[#E6B84F]/90 disabled:cursor-not-allowed disabled:opacity-45"
            size="lg"
          >
            {busy ? (
              <>
                <ShieldCheck className="w-4 h-4 animate-pulse" />
                Locking stake…
              </>
            ) : CAN_CREATE_REAL_WAGERS ? (
              mode === "private" ? "Lock stake & generate code" : "Lock stake & post"
            ) : (
              "Live wager config required"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
