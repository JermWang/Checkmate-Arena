import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { GAME_CONFIG, getRatingBucket } from "@/config/game";
import { Swords, Shield, LogOut, RotateCcw, Flag } from "lucide-react";
import type { ServerToClientEvents, ClientToServerEvents } from "../../contracts/types";
import { io, type Socket } from "socket.io-client";
import { Board3D } from "@/components/three/Board3D";
import type { Chess, Move, Square } from "chess.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.DEV ? "http://localhost:3001" : window.location.origin
);

export default function Play() {
  const { walletAddress, connected, connect, checkEligibility } = useWallet();
  const [gameState, setGameState] = useState<"idle" | "checking" | "ineligible" | "queue" | "matched" | "playing" | "ended">("idle");
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [color, setColor] = useState<"white" | "black">("white");
  const [opponent, setOpponent] = useState<string>("");
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [whiteTime, setWhiteTime] = useState(300000);
  const [blackTime, setBlackTime] = useState(300000);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [ratingChange, setRatingChange] = useState(0);
  const [queuePosition, setQueuePosition] = useState(0);
  const chessRef = useRef<Chess | null>(null);

  useEffect(() => {
    import("chess.js").then(({ Chess }) => {
      chessRef.current = new Chess();
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (connected && walletAddress) {
      setGameState("checking");
      checkEligibility().then((eligible) => {
        if (cancelled) return;
        setGameState(eligible ? "idle" : "ineligible");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [connected, walletAddress, checkEligibility]);

  useEffect(() => {
    if (!walletAddress) return;

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SOCKET_URL,
      { path: "/socket.io" }
    );

    newSocket.on("connect", () => {
      newSocket.emit("wallet:connect", { walletAddress });
    });

    newSocket.on("queue:joined", ({ position }) => {
      setQueuePosition(position);
      setGameState("queue");
    });

    newSocket.on("match:found", ({ matchId: mid, opponent: opp, color: c }) => {
      setMatchId(mid);
      setOpponent(opp);
      setColor(c as "white" | "black");
      setGameState("matched");
    });

    newSocket.on("match:start", ({ fen: startFen }) => {
      setFen(startFen);
      if (chessRef.current) {
        chessRef.current.load(startFen);
      }
      setMoveHistory([]);
      setResult(null);
      setGameState("playing");
    });

    newSocket.on("match:move_applied", ({ san, fen: newFen }) => {
      setFen(newFen);
      setMoveHistory((prev) => [...prev, san]);
      if (chessRef.current) {
        chessRef.current.load(newFen);
      }
      setSelectedSquare(null);
      setLegalMoves([]);
    });

    newSocket.on("match:invalid_move", ({ reason }) => {
      console.warn("Invalid move:", reason);
    });

    newSocket.on("match:timer_update", ({ whiteTime: wt, blackTime: bt }) => {
      setWhiteTime(wt);
      setBlackTime(bt);
    });

    newSocket.on("match:ended", ({ result: r, whiteRatingChange, blackRatingChange }) => {
      setResult(r);
      const isWhite = color === "white";
      setRatingChange(isWhite ? whiteRatingChange : blackRatingChange);
      setGameState("ended");
    });

    newSocket.on("match:opponent_disconnected", ({ remainingSeconds }) => {
      console.log(`Opponent disconnected. ${remainingSeconds}s to reconnect.`);
    });

    setSocket(newSocket);

    return () => {
      setSocket(null);
      newSocket.close();
    };
  }, [walletAddress, color]);

  const joinQueue = useCallback(() => {
    if (!socket || !walletAddress) return;

    if (!socket.connected) {
      socket.once("connect", () => {
        socket.emit("queue:join", { walletAddress, rating: 1000 });
      });
      socket.connect();
    } else {
      socket.emit("queue:join", { walletAddress, rating: 1000 });
    }
  }, [socket, walletAddress]);

  const leaveQueue = useCallback(() => {
    socket?.emit("queue:leave");
    setGameState("idle");
  }, [socket]);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (gameState !== "playing" || !socket || !matchId || !chessRef.current) return;

      const chess = chessRef.current;
      const isPlayerTurn = chess.turn() === (color === "white" ? "w" : "b");
      if (!isPlayerTurn) return;

      if (selectedSquare) {
        const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
        const targetMove = moves.find((m: Move) => m.to === square);

        if (targetMove) {
          socket.emit("match:move", {
            matchId,
            from: selectedSquare,
            to: square,
            promotion: targetMove.promotion,
          });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        const piece = chess.get(square as Square);
        if (piece && piece.color === (color === "white" ? "w" : "b")) {
          setSelectedSquare(square);
          const possibleMoves = chess.moves({ square: square as Square, verbose: true });
          setLegalMoves(possibleMoves.map((m: Move) => m.to));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        const piece = chess.get(square as Square);
        if (piece && piece.color === (color === "white" ? "w" : "b")) {
          setSelectedSquare(square);
          const possibleMoves = chess.moves({ square: square as Square, verbose: true });
          setLegalMoves(possibleMoves.map((m: Move) => m.to));
        }
      }
    },
    [gameState, socket, matchId, selectedSquare, color]
  );

  const handleResign = useCallback(() => {
    if (socket && matchId) {
      socket.emit("match:resign", { matchId });
    }
  }, [socket, matchId]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#14F195] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-[#8A8F98] mb-8 max-w-md">
            Connect your Solana wallet to check token eligibility and enter the ranked arena.
          </p>
          <button
            onClick={connect}
            className="px-8 py-3 bg-[#14F195] text-black font-semibold rounded-full hover:bg-[#14F195]/90 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "checking") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#14F195] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8A8F98]">Checking token eligibility...</p>
        </div>
      </div>
    );
  }

  if (gameState === "ineligible") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Not Eligible</h1>
          <p className="text-[#8A8F98] mb-4">
            You need at least {GAME_CONFIG.requiredTokenBalance.toLocaleString()} $CM tokens to enter the arena.
          </p>
          <button
            onClick={checkEligibility}
            className="px-6 py-2 border border-white/20 rounded-full text-sm hover:bg-white/5 transition-colors"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        <div className="grid lg:grid-cols-[280px_1fr_280px] gap-6">
          {/* Left Panel */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-[#14F195]" />
                </div>
                <div>
                  <p className="text-sm font-medium">You</p>
                  <p className="text-xs text-[#8A8F98] font-mono">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8A8F98]">
                <Shield className="w-3.5 h-3.5 text-[#14F195]" />
                <span>Eligible</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-medium mb-3">Status</h3>
              {gameState === "idle" && <p className="text-xs text-[#8A8F98]">Ready to queue</p>}
              {gameState === "queue" && (
                <div>
                  <p className="text-xs text-[#14F195] animate-pulse">In queue...</p>
                  <p className="text-xs text-[#8A8F98] mt-1">Position: {queuePosition}</p>
                </div>
              )}
              {gameState === "matched" && <p className="text-xs text-[#14F195]">Match found!</p>}
              {gameState === "playing" && <p className="text-xs text-[#14F195]">Game in progress</p>}
              {gameState === "ended" && result && (
                <div>
                  <p className="text-xs text-[#8A8F98]">Game ended: {result}</p>
                  {ratingChange !== 0 && (
                    <p className={`text-sm font-semibold mt-1 ${ratingChange > 0 ? "text-[#14F195]" : "text-red-400"}`}>
                      {ratingChange > 0 ? "+" : ""}{ratingChange} rating
                    </p>
                  )}
                </div>
              )}
            </div>

            {gameState === "idle" && (
              <button
                onClick={joinQueue}
                className="w-full py-3 bg-[#14F195] text-black font-semibold rounded-xl hover:bg-[#14F195]/90 transition-all flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                Join Ranked Queue
              </button>
            )}
            {gameState === "queue" && (
              <button
                onClick={leaveQueue}
                className="w-full py-3 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Queue
              </button>
            )}
            {(gameState === "playing" || gameState === "matched") && (
              <button
                onClick={handleResign}
                className="w-full py-3 border border-white/10 text-[#8A8F98] font-medium rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Resign
              </button>
            )}
            {gameState === "ended" && (
              <button
                onClick={() => {
                  setGameState("idle");
                  setSelectedSquare(null);
                  setLegalMoves([]);
                  setMoveHistory([]);
                  setResult(null);
                  setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                }}
                className="w-full py-3 bg-[#14F195] text-black font-semibold rounded-xl hover:bg-[#14F195]/90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            )}
          </div>

          {/* Center — Chess Board */}
          <div className="flex flex-col items-center">
            {gameState === "playing" && (
              <div className="w-full max-w-[520px] flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                    {color === "white" ? "B" : "W"}
                  </div>
                  <span className="text-xs text-[#8A8F98] font-mono">{opponent?.slice(0, 8)}...</span>
                </div>
                <div className={`text-xl font-mono font-bold px-3 py-1 rounded-lg ${
                  (color === "white" ? blackTime : whiteTime) < 30000 ? "bg-red-500/20 text-red-400" : "bg-white/5"
                }`}>
                  {formatTime(color === "white" ? blackTime : whiteTime)}
                </div>
              </div>
            )}

            <div className="w-full max-w-[520px] aspect-square rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/50">
              <Board3D
                fen={fen}
                orientation={color}
                onSquareClick={handleSquareClick}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
              />
            </div>

            {gameState === "playing" && (
              <div className="w-full max-w-[520px] flex justify-between items-center mt-2 px-1">
                <div className={`text-xl font-mono font-bold px-3 py-1 rounded-lg ${
                  (color === "white" ? whiteTime : blackTime) < 30000 ? "bg-red-500/20 text-red-400" : "bg-white/5"
                }`}>
                  {formatTime(color === "white" ? whiteTime : blackTime)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8A8F98] font-mono">You ({color})</span>
                  <div className="w-6 h-6 rounded-full bg-[#14F195]/20 flex items-center justify-center text-xs text-[#14F195]">
                    {color === "white" ? "W" : "B"}
                  </div>
                </div>
              </div>
            )}

            {gameState === "ended" && result && (
              <div className="mt-4 p-4 rounded-xl border border-[#14F195]/30 bg-[#14F195]/5 text-center">
                <p className="text-lg font-semibold capitalize">{result.replace("_", " ")}</p>
                {ratingChange !== 0 && (
                  <p className={`text-2xl font-bold mt-1 ${ratingChange > 0 ? "text-[#14F195]" : "text-red-400"}`}>
                    {ratingChange > 0 ? "+" : ""}{ratingChange}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {opponent && (
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-[#8A8F98]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Opponent</p>
                    <p className="text-xs text-[#8A8F98] font-mono">{opponent?.slice(0, 12)}...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-medium mb-3">Moves</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {moveHistory.length === 0 ? (
                  <p className="text-xs text-[#8A8F98]">No moves yet</p>
                ) : (
                  moveHistory.map((move, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-[#8A8F98] w-6">{Math.floor(i / 2) + 1}.</span>
                      <span className={i % 2 === 0 ? "text-white" : "text-[#8A8F98]"}>{move}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-medium mb-3">Game Info</h3>
              <div className="space-y-2 text-xs text-[#8A8F98]">
                <div className="flex justify-between">
                  <span>Time Control</span>
                  <span className="text-white">{GAME_CONFIG.timeControlSeconds / 60}+0</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating</span>
                  <span className="text-white">1000</span>
                </div>
                <div className="flex justify-between">
                  <span>Bucket</span>
                  <span className="text-[#14F195]">{getRatingBucket(1000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
