import { useState } from "react";
import { useNavigate } from "react-router";
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
import {
  STAKE_TIERS,
  TIME_CONTROLS,
  type TimeControl,
  type ColorPref,
  payoutFromStake,
  generateRoomCode,
} from "@/config/wager";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "public" | "private";
}

export function CreateWagerDialog({ open, onOpenChange, mode }: Props) {
  const navigate = useNavigate();
  const [stake, setStake] = useState(1000);
  const [customStake, setCustomStake] = useState("1000");
  const [tc, setTc] = useState<TimeControl>("3+0");
  const [color, setColor] = useState<ColorPref>("random");
  const [spectators, setSpectators] = useState(mode === "public");
  const [ranked, setRanked] = useState(mode === "public");

  const handleCreate = () => {
    // TODO: call tRPC `wager.create` → build escrow tx → sign → submit
    if (mode === "private") {
      const code = generateRoomCode();
      navigate(
        `/lobby/private/created?code=${code}&stake=${stake}&tc=${tc}&color=${color}&specs=${spectators}&ranked=${ranked}`
      );
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {mode === "private" ? (
              <Lock className="w-4 h-4 text-[#14F195]" />
            ) : (
              <Coins className="w-4 h-4 text-[#14F195]" />
            )}
            {mode === "private" ? "Create private room" : "Post public challenge"}
          </DialogTitle>
          <DialogDescription className="text-[#8A8F98]">
            Both sides lock the same stake. Winner takes the pot minus a 2% house fee.
            Each player pays their own network gas.
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
                      ? "border-[#14F195]/60 bg-[#14F195]/15 text-[#14F195]"
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
              <span className="text-xs font-mono text-[#14F195] whitespace-nowrap">
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
                      ? "border-[#14F195]/60 bg-[#14F195]/15 text-[#14F195]"
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
                      ? "border-[#14F195]/60 bg-[#14F195]/15 text-[#14F195]"
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
          <div className="rounded-lg border border-[#14F195]/25 bg-[#14F195]/[0.05] p-3 font-mono text-xs text-[#14F195]">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3 h-3" />
              Escrow summary
            </div>
            <div className="text-[#8A8F98]">
              You lock <span className="text-[#14F195]">{stake.toLocaleString()} $CHESS</span>.
              Opponent matches it.
              Winner takes{" "}
              <span className="text-[#14F195]">
                {payoutFromStake(stake).toLocaleString()}
              </span>{" "}
              ({" "}<span className="text-white">{(stake * 2).toLocaleString()}</span> pot · 2% house fee){" "}.
              You pay your own network gas when signing.
            </div>
          </div>

          <Button
            onClick={handleCreate}
            className="w-full bg-[#14F195] text-black hover:bg-[#14F195]/90"
            size="lg"
          >
            {mode === "private" ? "Lock stake & generate code" : "Lock stake & post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
