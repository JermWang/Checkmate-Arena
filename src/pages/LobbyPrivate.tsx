import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, LogIn, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { CreateWagerDialog } from "@/components/wager/CreateWagerDialog";
import { RoomCodeInput } from "@/components/wager/RoomCodeInput";
import { useWallet } from "@/components/wallet/WalletProvider";

export default function LobbyPrivate() {
  const { connected, connect } = useWallet();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState(false);

  const tryJoin = (code: string) => {
    if (code.length !== 6) {
      setJoinError(true);
      setTimeout(() => setJoinError(false), 500);
      return;
    }
    navigate(`/lobby/private/join?code=${code}`);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-6">
          <Lock className="w-16 h-16 text-[#14F195] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Private rooms need a wallet</h1>
          <p className="text-[#8A8F98] mb-6">
            Connect to create or join a private $CHESS wager. No minimum token balance is required.
          </p>
          <Button
            onClick={connect}
            className="bg-[#14F195] text-black hover:bg-[#14F195]/90"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <Link
          to="/lobby"
          className="inline-flex items-center gap-1.5 text-xs text-[#8A8F98] hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Back to public lobby
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-5 h-5 text-[#14F195]" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Private room
          </h1>
        </div>
        <p className="text-sm text-[#8A8F98] mb-8">
          Create a 6-character code and share it. Rooms use $CHESS stakes only and do not require a holding minimum.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <Plus className="w-5 h-5 text-[#14F195] mb-3" />
            <h2 className="text-lg font-semibold">Create a room</h2>
            <p className="text-sm text-[#8A8F98] mt-1 mb-5">
              Set the $CHESS stake and match terms, then get a code to share.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              size="lg"
              className="w-full bg-[#14F195] text-black hover:bg-[#14F195]/90"
            >
              New private room
            </Button>
          </div>

          {/* Join */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <LogIn className="w-5 h-5 text-[#8A8F98] mb-3" />
            <h2 className="text-lg font-semibold">Enter a code</h2>
            <p className="text-sm text-[#8A8F98] mt-1 mb-4">
              Paste a 6-character code below.
            </p>
            <RoomCodeInput
              value={joinCode}
              onChange={setJoinCode}
              onComplete={tryJoin}
              error={joinError}
            />
            <Button
              onClick={() => tryJoin(joinCode)}
              disabled={joinCode.length !== 6}
              size="lg"
              variant="outline"
              className="mt-4 w-full border-white/20 text-white hover:bg-white/5"
            >
              Join room
            </Button>
          </div>
        </div>
      </div>

      <CreateWagerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="private"
      />
    </div>
  );
}
