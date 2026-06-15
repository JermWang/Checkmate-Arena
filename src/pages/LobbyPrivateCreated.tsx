import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { Copy, Clock, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { ROOM_CODE_TTL_MS } from "@/config/wager";

export default function LobbyPrivateCreated() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { publicKey } = useSolanaWallet();
  const code = (params.get("code") || "").toUpperCase();
  const matchId = Number(params.get("match") || 0);

  // Poll the open challenge: once it's accepted it drops out of byCode (returns
  // null), which is our signal to send the creator into the match.
  const challenge = trpc.wager.byCode.useQuery(
    { code },
    { enabled: code.length === 6, refetchInterval: 3000 }
  );
  const cancelMut = trpc.wager.cancel.useMutation();
  const sawOpenRef = useRef(false);

  const stake = challenge.data?.stakeAmount ?? Number(params.get("stake") || 0);
  const tc = params.get("tc") || "—";
  const color = params.get("color") || "random";
  const spectators = challenge.data?.allowSpectators ?? params.get("specs") === "true";
  const ranked = params.get("ranked") === "true";

  const [remaining, setRemaining] = useState(ROOM_CODE_TTL_MS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (challenge.data) sawOpenRef.current = true;
    // Was open, now gone -> opponent accepted; jump into the board.
    if (sawOpenRef.current && challenge.isFetched && !challenge.data && matchId > 0) {
      navigate(`/play?match=${matchId}`);
    }
  }, [challenge.data, challenge.isFetched, matchId, navigate]);

  useEffect(() => {
    const t = setInterval(
      () => setRemaining((r) => Math.max(0, r - 1000)),
      1000
    );
    return () => clearInterval(t);
  }, []);

  const onCancel = async () => {
    if (matchId > 0 && publicKey) {
      try {
        await cancelMut.mutateAsync({ matchId, creatorWallet: publicKey.toBase58() });
      } catch {
        /* fall through to navigation regardless */
      }
    }
    navigate("/lobby/private");
  };

  const min = Math.floor(remaining / 60_000);
  const sec = Math.floor((remaining % 60_000) / 1000)
    .toString()
    .padStart(2, "0");

  const copyLink = async () => {
    const link = `${window.location.origin}/lobby/private/join?code=${code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-[#14F195]" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Room created
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-5">
          {/* Terms */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-medium mb-3">Match terms</h2>
            <Row k="Stake" v={`${stake.toLocaleString()} $CHESS`} green />
            <Row k="Time control" v={`${tc} blitz`} />
            <Row k="Your color" v={cap(color)} />
            <Row k="Spectators" v={spectators ? "Allowed" : "Disabled"} />
            <Row k="Ranked" v={ranked ? "Yes (affects ELO)" : "No"} />
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-wider text-[#8A8F98] mb-1">
                Status
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm text-[#14F195]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Stake locked in escrow
              </div>
            </div>
          </div>

          {/* Code reveal */}
          <div className="rounded-2xl border border-[#14F195]/30 bg-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(20,241,149,0.15),0_0_32px_rgba(20,241,149,0.10)]">
            <h2 className="text-sm font-medium">Share this code</h2>
            <p className="text-xs text-[#8A8F98] mt-1">
              Single-use. The first person to enter it joins.
            </p>
            <div className="my-4 grid grid-cols-6 gap-1.5">
              {code.split("").map((ch, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg border border-[#14F195]/30 bg-white/[0.02] font-mono text-2xl text-[#14F195]"
                >
                  {ch}
                </div>
              ))}
            </div>
            <div className="text-center font-mono text-xs text-amber-400 mb-3 inline-flex items-center justify-center w-full">
              <Clock className="w-3 h-3 mr-1" />
              Expires in {min}:{sec}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/5"
                onClick={copyLink}
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                className="flex-1 bg-[#14F195] text-black hover:bg-[#14F195]/90"
                onClick={onCancel}
                disabled={cancelMut.isPending}
              >
                {cancelMut.isPending ? "Refunding…" : "Cancel & refund"}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#8A8F98]">
          Waiting for opponent to join… you'll be redirected to the board automatically.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-[#8A8F98]">{k}</span>
      <span className={green ? "font-mono text-[#14F195]" : "font-mono text-white"}>
        {v}
      </span>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
