import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useArenaStats } from "@/providers/arenaStats";
import { GAME_CONFIG, getRatingBucket } from "@/config/game";
import { Swords, Shield, LogOut, RotateCcw, Flag, Eye, Box, Grid3x3, Users, Radio, Clock, Trophy, Gamepad2, Lock } from "lucide-react";
import type { ServerToClientEvents, ClientToServerEvents } from "../../contracts/types";
import { io, type Socket } from "socket.io-client";
import { Board3D } from "@/components/three/Board3D";
import { Board2D } from "@/components/Board2D";
import { ChatPanel } from "@/components/ChatPanel";
import { playGameSound, primeGameAudio } from "@/lib/gameAudio";
import type { Chess, Move, Square } from "chess.js";
import { useSearchParams } from "react-router";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.DEV ? "http://localhost:3001" : window.location.origin
);
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function Play() {
  const { walletAddress, connected, connect, checkEligibility, isEligible, tokenBalance } = useWallet();
  const arena = useArenaStats();
  const [searchParams] = useSearchParams();
  const spectateParam = searchParams.get("spectate");
  const spectateMatchId = spectateParam ? Number(spectateParam) : null;
  const isSpectatingRoute = Number.isFinite(spectateMatchId) && (spectateMatchId ?? 0) > 0;
  const wagerParam = searchParams.get("match");
  const wagerMatchId = wagerParam ? Number(wagerParam) : null;
  const isWagerJoin = Number.isFinite(wagerMatchId) && (wagerMatchId ?? 0) > 0;
  const [gameState, setGameState] = useState<"idle" | "checking" | "ineligible" | "queue" | "matched" | "playing" | "spectating" | "ended">("idle");
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [color, setColor] = useState<"white" | "black">("white");
  const [opponent, setOpponent] = useState<string>("");
  const [whitePlayer, setWhitePlayer] = useState<string>("");
  const [blackPlayer, setBlackPlayer] = useState<string>("");
  const [fen, setFen] = useState(START_FEN);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [whiteTime, setWhiteTime] = useState(300000);
  const [blackTime, setBlackTime] = useState(300000);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [ratingChange, setRatingChange] = useState(0);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [boardMode, setBoardMode] = useState<"3d" | "2d">(() => {
    if (typeof window === "undefined") return "3d";
    const stored = localStorage.getItem("checkmate.boardMode");
    if (stored === "2d" || stored === "3d") return stored;
    // No saved preference: default phones to the lightweight 2D board so the
    // match loads fast and stays smooth on low-memory devices.
    return window.matchMedia("(max-width: 767px)").matches ? "2d" : "3d";
  });
  const chessRef = useRef<Chess | null>(null);
  const colorRef = useRef(color);
  const matchIdRef = useRef(matchId);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    import("chess.js").then(({ Chess }) => {
      chessRef.current = new Chess();
    });
  }, []);

  // Tick the "searching for…" timer while in queue.
  useEffect(() => {
    if (gameState !== "queue" || !queuedAt) {
      setQueueElapsed(0);
      return;
    }
    setQueueElapsed(Math.floor((Date.now() - queuedAt) / 1000));
    const id = window.setInterval(() => {
      setQueueElapsed(Math.floor((Date.now() - queuedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [gameState, queuedAt]);

  useEffect(() => {
    let cancelled = false;
    if (isSpectatingRoute) {
      setGameState("idle");
      return () => {
        cancelled = true;
      };
    }
    if (connected && walletAddress) {
      setIsDemoMode(false);
      setGameState("idle");
      checkEligibility().then((eligible) => {
        if (cancelled) return;
        // Only the gate can move us out of idle here; never override an active game.
        if (eligible === false) setGameState((s) => (s === "idle" ? "ineligible" : s));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [connected, walletAddress, checkEligibility, isSpectatingRoute]);

  useEffect(() => {
    if (!walletAddress && !isSpectatingRoute) return;

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SOCKET_URL,
      { path: "/socket.io" }
    );

    newSocket.on("connect", () => {
      if (walletAddress) {
        newSocket.emit("wallet:connect", { walletAddress });
      }
      if (isSpectatingRoute && spectateMatchId) {
        newSocket.emit("spectate:join", { matchId: spectateMatchId });
      }
      // Auto-join an accepted wager match (both stakes already escrowed).
      if (isWagerJoin && wagerMatchId && walletAddress) {
        newSocket.emit("match:join_wager", { matchId: wagerMatchId, walletAddress });
      }
    });

    newSocket.on("queue:joined", ({ position }) => {
      setQueuePosition(position);
      setGameState("queue");
    });

    newSocket.on("match:found", ({ matchId: mid, opponent: opp, color: c }) => {
      setMatchId(mid);
      setOpponent(opp);
      setColor(c as "white" | "black");
      setSpectatorCount(0);
      setGameState("matched");
    });

    newSocket.on("match:start", ({ fen: startFen, white, black, whiteTime: wt, blackTime: bt }) => {
      setFen(startFen);
      if (chessRef.current) {
        chessRef.current.load(startFen);
      }
      setWhitePlayer(white);
      setBlackPlayer(black);
      setWhiteTime(wt);
      setBlackTime(bt);
      setMoveHistory([]);
      setResult(null);
      setGameState("playing");
    });

    newSocket.on("match:move_applied", ({ san, fen: newFen, whiteTime: wt, blackTime: bt }) => {
      setFen(newFen);
      setWhiteTime(wt);
      setBlackTime(bt);
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
      const isWhite = colorRef.current === "white";
      setRatingChange(isSpectatingRoute ? 0 : isWhite ? whiteRatingChange : blackRatingChange);
      setGameState("ended");
    });

    newSocket.on("match:spectator_count", ({ matchId: mid, viewers }) => {
      if (matchIdRef.current === mid || (isSpectatingRoute && spectateMatchId === mid)) {
        setSpectatorCount(viewers);
      }
    });

    newSocket.on("spectate:started", (liveMatch) => {
      setMatchId(liveMatch.matchId);
      setWhitePlayer(liveMatch.whiteWallet);
      setBlackPlayer(liveMatch.blackWallet);
      setOpponent(liveMatch.blackWallet);
      setColor("white");
      setFen(liveMatch.fen);
      setWhiteTime(liveMatch.whiteTime);
      setBlackTime(liveMatch.blackTime);
      setMoveHistory(liveMatch.moveHistory);
      setSpectatorCount(liveMatch.viewers);
      setSelectedSquare(null);
      setLegalMoves([]);
      setResult(null);
      if (chessRef.current) {
        chessRef.current.load(liveMatch.fen);
      }
      setGameState("spectating");
    });

    newSocket.on("spectate:error", ({ message }) => {
      setResult(message);
      setRatingChange(0);
      setGameState("ended");
    });

    newSocket.on("match:opponent_disconnected", ({ remainingSeconds }) => {
      console.log(`Opponent disconnected. ${remainingSeconds}s to reconnect.`);
    });

    setSocket(newSocket);

    return () => {
      if (isSpectatingRoute && spectateMatchId) {
        newSocket.emit("spectate:leave", { matchId: spectateMatchId });
      }
      setSocket(null);
      newSocket.close();
    };
  }, [walletAddress, isSpectatingRoute, spectateMatchId, isWagerJoin, wagerMatchId]);

  // Wager join: keep re-emitting until the match goes active and starts. Covers
  // the creator who lands on /play?match= before the opponent has accepted.
  useEffect(() => {
    if (!socket || !isWagerJoin || !wagerMatchId || !walletAddress) return;
    if (gameState === "playing" || gameState === "ended") return;
    const tryJoin = () => {
      if (socket.connected) socket.emit("match:join_wager", { matchId: wagerMatchId, walletAddress });
    };
    tryJoin();
    const id = setInterval(tryJoin, 2500);
    return () => clearInterval(id);
  }, [socket, isWagerJoin, wagerMatchId, walletAddress, gameState]);

  const joinQueue = useCallback(() => {
    if (!socket || !walletAddress) return;
    // Token gate: block entry and surface the requirement instead of queueing.
    if (isEligible === false) {
      setGameState("ineligible");
      return;
    }
    setIsDemoMode(false);
    setQueuedAt(Date.now());
    // Optimistically flip to the queue view so the click feels instant; the
    // server's queue:joined confirms it a beat later.
    setGameState("queue");

    if (!socket.connected) {
      socket.once("connect", () => {
        socket.emit("queue:join", { walletAddress, rating: 1000 });
      });
      socket.connect();
    } else {
      socket.emit("queue:join", { walletAddress, rating: 1000 });
    }
  }, [socket, walletAddress, isEligible]);

  const leaveQueue = useCallback(() => {
    socket?.emit("queue:leave");
    setQueuedAt(null);
    setGameState("idle");
  }, [socket]);

  const startDemo = useCallback(async () => {
    void primeGameAudio();
    const { Chess } = await import("chess.js");
    const chess = new Chess();
    chessRef.current = chess;
    setIsDemoMode(true);
    setGameState("playing");
    setMatchId(null);
    setColor("white");
    setOpponent("Demo Bot");
    setWhitePlayer("You");
    setBlackPlayer("Demo Bot");
    setFen(START_FEN);
    setSelectedSquare(null);
    setLegalMoves([]);
    setWhiteTime(300000);
    setBlackTime(300000);
    setMoveHistory([]);
    setResult(null);
    setRatingChange(0);
    setSpectatorCount(0);
  }, []);

  const selectBoardMode = useCallback((mode: "3d" | "2d") => {
    setBoardMode(mode);
    try {
      localStorage.setItem("checkmate.boardMode", mode);
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }, []);

  const handlePieceHover = useCallback(() => {
    playGameSound("piece-hover");
  }, []);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (gameState !== "playing" || !chessRef.current) return;
      if (!isDemoMode && (!socket || !matchId)) return;

      const chess = chessRef.current;
      const isPlayerTurn = chess.turn() === (color === "white" ? "w" : "b");
      if (!isPlayerTurn) return;

      if (selectedSquare) {
        const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
        const targetMove = moves.find((m: Move) => m.to === square);

        if (targetMove) {
          playGameSound("piece-move");

          if (isDemoMode) {
            const played = chess.move({
              from: selectedSquare,
              to: square,
              promotion: targetMove.promotion || "q",
            });
            if (!played) return;

            const nextHistory = [played.san];
            if (!chess.isGameOver()) {
              const replies = chess.moves({ verbose: true }) as Move[];
              const reply = replies[Math.floor(Math.random() * replies.length)];
              if (reply) {
                const botMove = chess.move({
                  from: reply.from,
                  to: reply.to,
                  promotion: reply.promotion || "q",
                });
                if (botMove) nextHistory.push(botMove.san);
              }
            }

            setFen(chess.fen());
            setMoveHistory((prev) => [...prev, ...nextHistory]);
            setSelectedSquare(null);
            setLegalMoves([]);
            if (chess.isGameOver()) {
              setResult(chess.isCheckmate() ? "checkmate" : "draw");
              setGameState("ended");
            }
            return;
          }

          if (!socket || matchId === null) return;

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
          playGameSound("piece-select");
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
          playGameSound("piece-select");
          setSelectedSquare(square);
          const possibleMoves = chess.moves({ square: square as Square, verbose: true });
          setLegalMoves(possibleMoves.map((m: Move) => m.to));
        }
      }
    },
    [gameState, isDemoMode, socket, matchId, selectedSquare, color]
  );

  const handleResign = useCallback(() => {
    if (isDemoMode) {
      setResult("demo ended");
      setGameState("ended");
      return;
    }
    if (socket && matchId) {
      socket.emit("match:resign", { matchId });
    }
  }, [isDemoMode, socket, matchId]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const shortWallet = (value?: string | null, length = 8) => {
    if (!value) return "Waiting";
    return `${value.slice(0, length)}...${value.slice(-4)}`;
  };

  const isSpectating = gameState === "spectating";
  const isLiveBoard = gameState === "playing" || isSpectating;
  const boardOrientation = isSpectating ? "white" : color;
  const topClock = boardOrientation === "white" ? blackTime : whiteTime;
  const bottomClock = boardOrientation === "white" ? whiteTime : blackTime;
  const topLabel = isSpectating
    ? `Black ${shortWallet(blackPlayer)}`
    : isDemoMode
      ? "Black Demo Bot"
      : shortWallet(opponent);
  const bottomLabel = isSpectating
    ? `White ${shortWallet(whitePlayer)}`
    : isDemoMode
      ? "White You"
      : `You (${color})`;

  if (!connected && !isSpectatingRoute && !isDemoMode) {
    return (
      <div
        className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 pt-16"
        onPointerDownCapture={() => {
          void primeGameAudio();
        }}
      >
        <div className="w-full max-w-md text-center">
          <Shield className="w-16 h-16 text-[#E6B84F] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-[#8A8F98] mb-8">
            Connect your Solana wallet to enter the ranked arena.
          </p>
          <button
            onClick={connect}
            className="w-full px-8 py-3 bg-[#E6B84F] text-black font-semibold rounded-full hover:bg-[#E6B84F]/90 transition-all"
          >
            Connect Wallet
          </button>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#666C76]">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            onClick={() => {
              void startDemo();
            }}
            className="w-full rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            Try Gameplay Demo
          </button>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-[#8A8F98]">
            Demo mode is local only. Play White against a quick bot without connecting a wallet.
          </p>
        </div>
      </div>
    );
  }

  if (gameState === "checking") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E6B84F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8A8F98]">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (gameState === "ineligible") {
    const required = GAME_CONFIG.requiredTokenBalance;
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 pt-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E6B84F]/30 bg-[#E6B84F]/[0.06]">
            <Lock className="h-7 w-7 text-[#E6B84F]" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Ranked is token-gated</h1>
          <p className="text-[#A6ABB4] mb-5 leading-7">
            Hold <span className="font-semibold text-[#E6B84F]">{required.toLocaleString()} $CHESS</span> to
            enter ranked matchmaking. Your balance is checked on-chain when you connect.
          </p>
          <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-[#8A8F98]">You're holding</span>
            <span className="font-mono font-semibold text-white">
              {Math.floor(tokenBalance).toLocaleString()} / {required.toLocaleString()} $CHESS
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => void checkEligibility()}
              className="w-full rounded-xl bg-[#E6B84F] py-3 text-sm font-semibold text-black transition-all hover:bg-[#E6B84F]/90"
            >
              I've bought $CHESS — check again
            </button>
            <button
              onClick={() => void startDemo()}
              className="inline-flex items-center justify-center gap-2 text-sm text-[#8A8F98] transition-colors hover:text-white"
            >
              <Gamepad2 className="h-4 w-4" />
              Try demo vs bot (no tokens needed)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Focused ranked-queue screen ──────────────────────────────
  // Before a match exists, lead the player straight to matchmaking with a big,
  // unambiguous Join action and live arena activity — no empty board to parse.
  if ((gameState === "idle" || gameState === "queue") && !isSpectatingRoute && !isDemoMode) {
    const inQueue = Math.max(arena.inQueue, gameState === "queue" ? 1 : 0);
    const searching = gameState === "queue";
    const elapsedLabel = `${Math.floor(queueElapsed / 60)}:${String(queueElapsed % 60).padStart(2, "0")}`;

    return (
      <div className="min-h-screen bg-[#050505] text-white pt-16" onPointerDownCapture={primeGameAudio}>
        <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-10 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E6B84F]/30 bg-[#E6B84F]/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#E6B84F]">
            <Trophy className="h-3.5 w-3.5" />
            Ranked · {GAME_CONFIG.requiredTokenBalance.toLocaleString()} $CHESS to play
          </div>
          <h1 className="mt-5 text-center text-4xl font-bold tracking-tight sm:text-5xl">
            Ranked Queue
          </h1>
          <p className="mt-3 max-w-md text-center text-sm leading-6 text-[#A6ABB4] sm:text-base">
            Get matched with an opponent near your rating and play a rated 5-minute
            game. Holding {GAME_CONFIG.requiredTokenBalance.toLocaleString()} $CHESS unlocks ranked — no per-game stake.
          </p>

          {/* Live arena activity */}
          <div className="mt-8 grid w-full grid-cols-3 gap-3">
            <QueueStat
              icon={<Users className="h-4 w-4 text-[#E6B84F]" />}
              value={inQueue}
              label="In queue"
              emphasize
            />
            <QueueStat
              icon={<Radio className="h-4 w-4 text-[#E6B84F]" />}
              value={arena.online}
              label="Players online"
            />
            <QueueStat
              icon={<Eye className="h-4 w-4 text-[#E6B84F]" />}
              value={arena.liveMatches}
              label="Live matches"
            />
          </div>

          {/* Primary action */}
          <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-center">
            {searching ? (
              <>
                <div className="mx-auto mb-4 flex items-center justify-center gap-3">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#E6B84F] border-t-transparent" />
                  <span className="text-lg font-semibold text-[#E6B84F]">Searching for an opponent…</span>
                </div>
                <p className="font-mono text-sm text-[#8A8F98]">
                  {inQueue > 1
                    ? `${inQueue} players in the queue`
                    : "You're first in line — hang tight"}{" "}
                  · <span className="text-white">{elapsedLabel}</span>
                </p>
                <button
                  onClick={leaveQueue}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 px-5 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Leave queue
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={joinQueue}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E6B84F] py-4 text-base font-semibold text-black transition-all hover:bg-[#E6B84F]/90"
                >
                  <Swords className="h-5 w-5" />
                  Join Ranked Queue
                </button>
                <p className="mt-3 text-xs text-[#8A8F98]">
                  {arena.inQueue > 0
                    ? `${arena.inQueue} ${arena.inQueue === 1 ? "player is" : "players are"} waiting — you'll likely match instantly.`
                    : "Be the first in the queue. The moment someone else joins, you're matched."}
                </p>
              </>
            )}
          </div>

          {/* Match facts */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-[#8A8F98]">
            <Fact icon={<Clock className="h-3.5 w-3.5 text-[#E6B84F]" />}>
              {GAME_CONFIG.timeControlSeconds / 60}+0 blitz
            </Fact>
            <Fact icon={<Shield className="h-3.5 w-3.5 text-[#E6B84F]" />}>Server-validated</Fact>
            <Fact icon={<Trophy className="h-3.5 w-3.5 text-[#E6B84F]" />}>ELO rated · climbs leaderboard</Fact>
          </div>

          {/* Secondary paths */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/lobby"
              className="inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-white"
            >
              <Eye className="h-4 w-4" />
              Watch live matches
            </Link>
            <span className="hidden text-white/15 sm:inline">·</span>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-white"
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Link>
            <span className="hidden text-white/15 sm:inline">·</span>
            <button
              onClick={() => void startDemo()}
              className="inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-white"
            >
              <Gamepad2 className="h-4 w-4" />
              Try demo vs bot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16" onPointerDownCapture={primeGameAudio}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        <div className="grid lg:grid-cols-[280px_1fr_280px] gap-6">
          {/* Left Panel */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#E6B84F]/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-[#E6B84F]" />
                </div>
                <div>
                  <p className="text-sm font-medium">{isSpectating ? "Spectator" : "You"}</p>
                  <p className="text-xs text-[#8A8F98] font-mono">
                    {walletAddress ? shortWallet(walletAddress, 6) : isDemoMode ? "Demo player" : "Read-only view"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8A8F98]">
                <Shield className="w-3.5 h-3.5 text-[#E6B84F]" />
                <span>{isDemoMode ? "Demo mode" : isSpectating ? "Watching live" : "Wallet connected"}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-medium mb-3">Status</h3>
              {gameState === "idle" && (
                <p className="text-xs text-[#8A8F98]">
                  {isSpectatingRoute ? "Joining spectator feed..." : "Ready to queue"}
                </p>
              )}
              {gameState === "queue" && (
                <div>
                  <p className="text-xs text-[#E6B84F] animate-pulse">In queue...</p>
                  <p className="text-xs text-[#8A8F98] mt-1">Position: {queuePosition}</p>
                </div>
              )}
              {gameState === "matched" && <p className="text-xs text-[#E6B84F]">Match found!</p>}
              {gameState === "playing" && <p className="text-xs text-[#E6B84F]">Game in progress</p>}
              {gameState === "spectating" && <p className="text-xs text-[#E6B84F]">Spectating live match</p>}
              {gameState === "ended" && result && (
                <div>
                  <p className="text-xs text-[#8A8F98]">Game ended: {result}</p>
                  {ratingChange !== 0 && (
                    <p className={`text-sm font-semibold mt-1 ${ratingChange > 0 ? "text-[#E6B84F]" : "text-red-400"}`}>
                      {ratingChange > 0 ? "+" : ""}{ratingChange} rating
                    </p>
                  )}
                </div>
              )}
              {!isDemoMode && (gameState === "matched" || isLiveBoard) && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[#8A8F98]">
                  <Eye className="h-3.5 w-3.5 text-[#E6B84F]" />
                  <span>{spectatorCount} watching</span>
                </div>
              )}
            </div>

            {gameState === "idle" && !isSpectatingRoute && (
              <button
                onClick={joinQueue}
                className="w-full py-3 bg-[#E6B84F] text-black font-semibold rounded-xl hover:bg-[#E6B84F]/90 transition-all flex items-center justify-center gap-2"
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
            {gameState === "ended" && !isSpectatingRoute && (
              <button
                onClick={() => {
                  if (isDemoMode) {
                    void startDemo();
                    return;
                  }
                  setGameState("idle");
                  setSelectedSquare(null);
                  setLegalMoves([]);
                  setMoveHistory([]);
                  setResult(null);
                  setFen(START_FEN);
                }}
                className="w-full py-3 bg-[#E6B84F] text-black font-semibold rounded-xl hover:bg-[#E6B84F]/90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            )}
          </div>

          {/* Center - Chess Board */}
          <div className="flex flex-col items-center">
            {isLiveBoard && (
              <div className="w-full max-w-[520px] flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                    {boardOrientation === "white" ? "B" : "W"}
                  </div>
                  <span className="text-xs text-[#8A8F98] font-mono">{topLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[#8A8F98]">
                    <Eye className="h-3.5 w-3.5 text-[#E6B84F]" />
                    {spectatorCount}
                  </div>
                  <div className={`text-xl font-mono font-bold px-3 py-1 rounded-lg ${
                    topClock < 30000 ? "bg-red-500/20 text-red-400" : "bg-white/5"
                  }`}>
                    {formatTime(topClock)}
                  </div>
                </div>
              </div>
            )}

            {/* Board view toggle: 3D (rich) vs 2D (simple, low-memory) */}
            <div className="w-full max-w-[920px] flex justify-end mb-2">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs">
                <button
                  onClick={() => selectBoardMode("3d")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                    boardMode === "3d" ? "bg-[#E6B84F] text-black font-medium" : "text-[#8A8F98] hover:text-white"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  3D
                </button>
                <button
                  onClick={() => selectBoardMode("2d")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                    boardMode === "2d" ? "bg-[#E6B84F] text-black font-medium" : "text-[#8A8F98] hover:text-white"
                  }`}
                  title="Simple, low-memory board"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                  2D
                </button>
              </div>
            </div>

            <div
              className={
                boardMode === "3d"
                  ? "w-full max-w-[520px] aspect-square rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/50 md:aspect-video md:max-w-[920px]"
                  : "w-full max-w-[520px] aspect-square rounded-xl overflow-hidden"
              }
            >
              {boardMode === "3d" ? (
                <Board3D
                  fen={fen}
                  orientation={boardOrientation}
                  onSquareClick={handleSquareClick}
                  onPieceHover={handlePieceHover}
                  selectedSquare={selectedSquare}
                  legalMoves={legalMoves}
                  interactive={gameState === "playing" && !isSpectating}
                />
              ) : (
                <Board2D
                  fen={fen}
                  orientation={boardOrientation}
                  onSquareClick={handleSquareClick}
                  onPieceHover={handlePieceHover}
                  selectedSquare={selectedSquare}
                  legalMoves={legalMoves}
                  interactive={gameState === "playing" && !isSpectating}
                />
              )}
            </div>

            {isLiveBoard && (
              <div className="w-full max-w-[520px] flex justify-between items-center mt-2 px-1">
                <div className={`text-xl font-mono font-bold px-3 py-1 rounded-lg ${
                  bottomClock < 30000 ? "bg-red-500/20 text-red-400" : "bg-white/5"
                }`}>
                  {formatTime(bottomClock)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8A8F98] font-mono">{bottomLabel}</span>
                  <div className="w-6 h-6 rounded-full bg-[#E6B84F]/20 flex items-center justify-center text-xs text-[#E6B84F]">
                    {boardOrientation === "white" ? "W" : "B"}
                  </div>
                </div>
              </div>
            )}

            {gameState === "ended" && result && (
              <div className="mt-4 p-4 rounded-xl border border-[#E6B84F]/30 bg-[#E6B84F]/5 text-center">
                <p className="text-lg font-semibold capitalize">{result.replace("_", " ")}</p>
                {ratingChange !== 0 && (
                  <p className={`text-2xl font-bold mt-1 ${ratingChange > 0 ? "text-[#E6B84F]" : "text-red-400"}`}>
                    {ratingChange > 0 ? "+" : ""}{ratingChange}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {(opponent || isSpectating) && (
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-[#8A8F98]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isSpectating ? "Live Match" : "Opponent"}</p>
                    <p className="text-xs text-[#8A8F98] font-mono">
                      {isSpectating
                        ? `${shortWallet(whitePlayer, 6)} vs ${shortWallet(blackPlayer, 6)}`
                        : shortWallet(opponent, 12)}
                    </p>
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
                  <span className="text-[#E6B84F]">{getRatingBucket(1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Viewers</span>
                  <span className="inline-flex items-center gap-1 text-white">
                    <Eye className="h-3.5 w-3.5 text-[#E6B84F]" />
                    {spectatorCount}
                  </span>
                </div>
              </div>
            </div>

            {!isDemoMode && (
              <ChatPanel
                walletAddress={walletAddress}
                channel={matchId && isLiveBoard ? `match:${matchId}` : "lobby"}
                title={matchId && isLiveBoard ? "Match Chat" : "Arena Chat"}
                className="h-[420px]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueStat({
  icon,
  value,
  label,
  emphasize,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-4 text-center ${
        emphasize
          ? "border-[#E6B84F]/30 bg-[#E6B84F]/[0.06]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {icon}
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${
          emphasize ? "text-[#E6B84F]" : "text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-[#8A8F98]">{label}</span>
    </div>
  );
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5">
      {icon}
      {children}
    </span>
  );
}
