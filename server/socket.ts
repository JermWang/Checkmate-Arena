import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { Chess } from "chess.js";
import {
  createMatch,
  getMatchById,
  saveMove,
  finalizeMatch,
  getRecentOpponents,
} from "./queries/matches";
import {
  findOrCreateUser,
  getUserByWallet,
  updateUserRating,
  recordMatchResult,
  updateDailyScore,
} from "./queries/users";
import { updateLeaderboardScore, getCurrentEpoch } from "./queries/leaderboard";
import { createAdminFlag } from "./queries/admin";
import { GAME_CONFIG, getKFactor, getRatingBucket } from "../src/config/game";
import type { ClientToServerEvents, LiveMatchSummary, ServerToClientEvents } from "../contracts/types";

// ============================================================
// In-memory matchmaking and game state
// ============================================================

interface QueueEntry {
  walletAddress: string;
  socketId: string;
  rating: number;
  joinedAt: number;
}

interface ActiveGame {
  matchId: number;
  chess: Chess;
  whiteWallet: string;
  blackWallet: string;
  whiteSocket: string;
  blackSocket: string;
  whiteTime: number;
  blackTime: number;
  currentTurn: "w" | "b";
  lastMoveTime: number;
  moveCount: number;
  disconnectTimer?: ReturnType<typeof setTimeout>;
  timerInterval?: ReturnType<typeof setInterval>;
}

const queue: QueueEntry[] = [];
const activeGames = new Map<number, ActiveGame>();
const walletToSocket = new Map<string, string>();
const socketToWallet = new Map<string, string>();
const socketToMatch = new Map<string, number>();
const spectatorsByMatch = new Map<number, Set<string>>();
const socketToSpectatedMatch = new Map<string, number>();

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

function spectatorRoom(matchId: number) {
  return `spectators:${matchId}`;
}

function spectatorCount(matchId: number) {
  return spectatorsByMatch.get(matchId)?.size ?? 0;
}

function getLiveMatchSummary(game: ActiveGame): LiveMatchSummary {
  return {
    matchId: game.matchId,
    whiteWallet: game.whiteWallet,
    blackWallet: game.blackWallet,
    fen: game.chess.fen(),
    moveCount: game.moveCount,
    whiteTime: game.whiteTime,
    blackTime: game.blackTime,
    viewers: spectatorCount(game.matchId),
  };
}

function emitSpectatorCount(matchId: number) {
  const game = activeGames.get(matchId);
  if (!game) return;

  const data = { matchId, viewers: spectatorCount(matchId) };
  io.to(game.whiteSocket).to(game.blackSocket).to(spectatorRoom(matchId)).emit("match:spectator_count", data);
}

function leaveSpectatedMatch(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  requestedMatchId?: number
) {
  const matchId = socketToSpectatedMatch.get(socket.id);
  if (!matchId || (requestedMatchId && requestedMatchId !== matchId)) return;

  const spectators = spectatorsByMatch.get(matchId);
  spectators?.delete(socket.id);
  if (spectators?.size === 0) {
    spectatorsByMatch.delete(matchId);
  }

  socketToSpectatedMatch.delete(socket.id);
  socket.leave(spectatorRoom(matchId));
  emitSpectatorCount(matchId);
}

// ============================================================
// ELO Rating Calculation
// ============================================================

function calculateElo(
  whiteRating: number,
  blackRating: number,
  result: "1-0" | "0-1" | "1/2-1/2"
): { whiteNew: number; blackNew: number; whiteDelta: number; blackDelta: number } {
  const kWhite = getKFactor(0, whiteRating); // simplified
  const kBlack = getKFactor(0, blackRating);

  const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
  const expectedBlack = 1 / (1 + Math.pow(10, (whiteRating - blackRating) / 400));

  let actualWhite: number, actualBlack: number;
  if (result === "1-0") {
    actualWhite = 1;
    actualBlack = 0;
  } else if (result === "0-1") {
    actualWhite = 0;
    actualBlack = 1;
  } else {
    actualWhite = 0.5;
    actualBlack = 0.5;
  }

  const whiteDelta = Math.round(kWhite * (actualWhite - expectedWhite));
  const blackDelta = Math.round(kBlack * (actualBlack - expectedBlack));

  return {
    whiteNew: whiteRating + whiteDelta,
    blackNew: blackRating + blackDelta,
    whiteDelta,
    blackDelta,
  };
}

// ============================================================
// Daily Score Calculation
// ============================================================

function calculateDailyScore(
  result: "win" | "loss" | "draw",
  isCheckmate: boolean,
  streak: number,
  ratingDiff: number,
  resultType: string
): number {
  let score = 0;

  if (result === "win") {
    score += GAME_CONFIG.scoreWin;
    if (isCheckmate) score += GAME_CONFIG.scoreCheckmateBonus;
    const streakBonus = Math.min(streak * GAME_CONFIG.scoreStreakBonusPerWin, GAME_CONFIG.scoreStreakBonusMax);
    score += streakBonus;
    if (ratingDiff > 0) {
      score += Math.min(
        GAME_CONFIG.scoreBeatHigherRatedBase + Math.floor(ratingDiff / 50),
        GAME_CONFIG.scoreBeatHigherRatedMax
      );
    }
  } else if (result === "loss") {
    if (resultType === "timeout") score += GAME_CONFIG.scoreTimeoutLoss;
    else if (resultType === "disconnect") score += GAME_CONFIG.scoreDisconnectLoss;
    else score += GAME_CONFIG.scoreLoss;
  } else {
    score += GAME_CONFIG.scoreDraw;
  }

  return score;
}

// ============================================================
// Matchmaking
// ============================================================

function findOpponent(entry: QueueEntry): QueueEntry | null {
  const now = Date.now();
  // Rating range expands over time (max +/- 500)
  const waitTime = now - entry.joinedAt;
  const ratingRange = Math.min(200 + Math.floor(waitTime / 5000) * 50, 500);

  for (const other of queue) {
    if (other.socketId === entry.socketId) continue;
    if (other.walletAddress === entry.walletAddress) continue;

    const ratingDiff = Math.abs(other.rating - entry.rating);
    if (ratingDiff <= ratingRange) {
      return other;
    }
  }
  return null;
}

async function startMatch(player1: QueueEntry, player2: QueueEntry) {
  // Remove both from queue
  const idx1 = queue.findIndex((e) => e.socketId === player1.socketId);
  const idx2 = queue.findIndex((e) => e.socketId === player2.socketId);
  if (idx1 > -1) queue.splice(idx1, 1);
  if (idx2 > -1) queue.splice(idx2, 1);

  // Random colors
  const whiteEntry = Math.random() > 0.5 ? player1 : player2;
  const blackEntry = whiteEntry === player1 ? player2 : player1;

  // Get/create users
  const whiteUser = await findOrCreateUser(whiteEntry.walletAddress);
  const blackUser = await findOrCreateUser(blackEntry.walletAddress);

  // Create match in DB
  const matchId = await createMatch({
    whiteWallet: whiteEntry.walletAddress,
    blackWallet: blackEntry.walletAddress,
    whiteRatingBefore: whiteUser.currentRating,
    blackRatingBefore: blackUser.currentRating,
  });

  // Create game state
  const chess = new Chess();
  const game: ActiveGame = {
    matchId,
    chess,
    whiteWallet: whiteEntry.walletAddress,
    blackWallet: blackEntry.walletAddress,
    whiteSocket: whiteEntry.socketId,
    blackSocket: blackEntry.socketId,
    whiteTime: GAME_CONFIG.timeControlSeconds * 1000,
    blackTime: GAME_CONFIG.timeControlSeconds * 1000,
    currentTurn: "w",
    lastMoveTime: Date.now(),
    moveCount: 0,
  };

  activeGames.set(matchId, game);
  socketToMatch.set(whiteEntry.socketId, matchId);
  socketToMatch.set(blackEntry.socketId, matchId);

  // Notify both players
  io.to(whiteEntry.socketId).emit("match:found", {
    matchId,
    opponent: blackEntry.walletAddress,
    color: "white",
  });
  io.to(blackEntry.socketId).emit("match:found", {
    matchId,
    opponent: whiteEntry.walletAddress,
    color: "black",
  });

  // Start match
  io.to(whiteEntry.socketId).to(blackEntry.socketId).emit("match:start", {
    matchId,
    fen: chess.fen(),
    white: whiteEntry.walletAddress,
    black: blackEntry.walletAddress,
    whiteTime: game.whiteTime,
    blackTime: game.blackTime,
  });

  // Start timer
  startGameTimer(matchId);
}

function startGameTimer(matchId: number) {
  const game = activeGames.get(matchId);
  if (!game) return;

  game.timerInterval = setInterval(() => {
    const g = activeGames.get(matchId);
    if (!g || g.chess.isGameOver()) {
      if (g?.timerInterval) clearInterval(g.timerInterval);
      return;
    }

    const now = Date.now();
    const elapsed = now - g.lastMoveTime;

    if (g.currentTurn === "w") {
      g.whiteTime = Math.max(0, g.whiteTime - elapsed);
      if (g.whiteTime <= 0) {
        endMatch(matchId, "timeout", g.blackWallet);
        return;
      }
    } else {
      g.blackTime = Math.max(0, g.blackTime - elapsed);
      if (g.blackTime <= 0) {
        endMatch(matchId, "timeout", g.whiteWallet);
        return;
      }
    }

    g.lastMoveTime = now;

    io.to(g.whiteSocket).to(g.blackSocket).to(spectatorRoom(matchId)).emit("match:timer_update", {
      whiteTime: g.whiteTime,
      blackTime: g.blackTime,
    });
  }, 1000);
}

async function endMatch(
  matchId: number,
  resultType: "checkmate" | "resignation" | "timeout" | "draw" | "disconnect" | "abandoned" | "admin_cancelled",
  winnerWallet: string | null
) {
  const game = activeGames.get(matchId);
  if (!game) return;

  // Stop timer
  if (game.timerInterval) clearInterval(game.timerInterval);
  if (game.disconnectTimer) clearTimeout(game.disconnectTimer);

  // Determine loser
  let loserWallet: string | null = null;
  if (winnerWallet) {
    loserWallet = winnerWallet === game.whiteWallet ? game.blackWallet : game.whiteWallet;
  }

  // Determine chess result
  let chessResult: "1-0" | "0-1" | "1/2-1/2";
  if (!winnerWallet) chessResult = "1/2-1/2";
  else if (winnerWallet === game.whiteWallet) chessResult = "1-0";
  else chessResult = "0-1";

  // Calculate ELO
  const whiteUser = await getUserByWallet(game.whiteWallet);
  const blackUser = await getUserByWallet(game.blackWallet);
  if (!whiteUser || !blackUser) return;

  const { whiteNew, blackNew, whiteDelta, blackDelta } = calculateElo(
    whiteUser.currentRating,
    blackUser.currentRating,
    chessResult
  );

  // Calculate daily scores
  const whiteResult = chessResult === "1-0" ? "win" : chessResult === "0-1" ? "loss" : "draw";
  const blackResult = chessResult === "0-1" ? "win" : chessResult === "1-0" ? "loss" : "draw";
  const isCheckmate = resultType === "checkmate";
  const ratingDiff = blackUser.currentRating - whiteUser.currentRating;

  const whiteScoreDelta = calculateDailyScore(
    whiteResult,
    isCheckmate,
    whiteUser.currentStreak,
    -ratingDiff,
    resultType
  );
  const blackScoreDelta = calculateDailyScore(
    blackResult,
    isCheckmate,
    blackUser.currentStreak,
    ratingDiff,
    resultType
  );

  // Update ratings
  await updateUserRating(game.whiteWallet, whiteNew);
  await updateUserRating(game.blackWallet, blackNew);

  // Record match results
  await recordMatchResult(game.whiteWallet, whiteResult, whiteScoreDelta);
  await recordMatchResult(game.blackWallet, blackResult, blackScoreDelta);

  // Update leaderboard
  const epoch = await getCurrentEpoch();
  if (epoch) {
    await updateLeaderboardScore(game.whiteWallet, epoch.id, whiteScoreDelta, whiteResult);
    await updateLeaderboardScore(game.blackWallet, epoch.id, blackScoreDelta, blackResult);
  }

  // Finalize match in DB
  await finalizeMatch(matchId, {
    winnerWallet,
    loserWallet,
    resultType,
    pgn: game.chess.pgn(),
    moveHistory: game.chess.history(),
    whiteRatingAfter: whiteNew,
    blackRatingAfter: blackNew,
  });

  // Emit result
  io.to(game.whiteSocket).to(game.blackSocket).to(spectatorRoom(matchId)).emit("match:ended", {
    result: resultType,
    winner: winnerWallet,
    whiteRatingChange: whiteDelta,
    blackRatingChange: blackDelta,
  });

  // Cleanup
  const spectators = spectatorsByMatch.get(matchId);
  if (spectators) {
    for (const socketId of spectators) {
      socketToSpectatedMatch.delete(socketId);
    }
    spectatorsByMatch.delete(matchId);
  }
  socketToMatch.delete(game.whiteSocket);
  socketToMatch.delete(game.blackSocket);
  activeGames.delete(matchId);

  // Anti-cheat check
  runAntiCheat(matchId, game);
}

async function runAntiCheat(matchId: number, game: ActiveGame) {
  const moves = game.chess.history();
  const avgMoveTime = game.moveCount > 0
    ? (Date.now() - game.lastMoveTime) / game.moveCount
    : 0;

  const flags: string[] = [];

  if (game.moveCount > GAME_CONFIG.cheatThresholds.fastMoveMinMoves && avgMoveTime < GAME_CONFIG.cheatThresholds.fastMoveMaxAvgTimeMs) {
    flags.push("very_fast_complex_game");
  }

  if (flags.length > 0 && game.chess.turn() === "b" ? game.blackWallet : game.whiteWallet) {
    const flaggedWallet = game.chess.turn() === "b" ? game.whiteWallet : game.blackWallet;
    await createAdminFlag({
      walletAddress: flaggedWallet,
      matchId,
      reason: flags.join(", "),
      severity: flags.includes("very_fast_complex_game") ? "medium" : "low",
    });
  }
}

// ============================================================
// Socket.IO Setup
// ============================================================

export function setupSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    // Wallet connect
    socket.on("wallet:connect", async ({ walletAddress }) => {
      walletToSocket.set(walletAddress, socket.id);
      socketToWallet.set(socket.id, walletAddress);
      await findOrCreateUser(walletAddress);
    });

    // Join queue
    socket.on("queue:join", async ({ walletAddress, rating }) => {
      // Remove from queue if already there
      const existingIdx = queue.findIndex((e) => e.walletAddress === walletAddress);
      if (existingIdx > -1) queue.splice(existingIdx, 1);

      const entry: QueueEntry = {
        walletAddress,
        socketId: socket.id,
        rating,
        joinedAt: Date.now(),
      };
      queue.push(entry);

      socket.emit("queue:joined", { position: queue.length });

      // Try to find match immediately
      const opponent = findOpponent(entry);
      if (opponent) {
        await startMatch(entry, opponent);
      }
    });

    // Leave queue
    socket.on("queue:leave", () => {
      const wallet = socketToWallet.get(socket.id);
      if (wallet) {
        const idx = queue.findIndex((e) => e.walletAddress === wallet);
        if (idx > -1) queue.splice(idx, 1);
      }
      socket.emit("queue:left");
    });

    socket.on("spectate:list", () => {
      socket.emit("spectate:list", {
        matches: Array.from(activeGames.values()).map(getLiveMatchSummary),
      });
    });

    socket.on("spectate:join", ({ matchId }) => {
      const game = activeGames.get(matchId);
      if (!game) {
        socket.emit("spectate:error", { message: "That match is no longer live." });
        return;
      }

      leaveSpectatedMatch(socket);

      let spectators = spectatorsByMatch.get(matchId);
      if (!spectators) {
        spectators = new Set();
        spectatorsByMatch.set(matchId, spectators);
      }

      spectators.add(socket.id);
      socketToSpectatedMatch.set(socket.id, matchId);
      socket.join(spectatorRoom(matchId));

      socket.emit("spectate:started", {
        ...getLiveMatchSummary(game),
        moveHistory: game.chess.history(),
      });
      emitSpectatorCount(matchId);
    });

    socket.on("spectate:leave", ({ matchId }) => {
      leaveSpectatedMatch(socket, matchId);
    });

    // Make a move
    socket.on("match:move", async ({ matchId, from, to, promotion }) => {
      const game = activeGames.get(matchId);
      if (!game) return;

      const wallet = socketToWallet.get(socket.id);
      if (!wallet) return;

      // Verify it's this player's turn
      const isWhite = wallet === game.whiteWallet;
      const isBlack = wallet === game.blackWallet;
      if (!isWhite && !isBlack) return;

      const expectedTurn = game.currentTurn === "w" ? isWhite : isBlack;
      if (!expectedTurn) {
        socket.emit("match:invalid_move", { reason: "Not your turn" });
        return;
      }

      // Validate and apply move
      try {
        const move = game.chess.move({ from, to, promotion });
        if (!move) {
          socket.emit("match:invalid_move", { reason: "Illegal move" });
          return;
        }

        // Save move to DB
        await saveMove({
          matchId,
          moveNumber: ++game.moveCount,
          walletAddress: wallet,
          san: move.san,
          fromSquare: from,
          toSquare: to,
          promotion,
          fenAfter: game.chess.fen(),
          moveTimeMs: Date.now() - game.lastMoveTime,
        });

        // Update clock
        const now = Date.now();
        const elapsed = now - game.lastMoveTime;
        if (isWhite) {
          game.whiteTime = Math.max(0, game.whiteTime - elapsed);
        } else {
          game.blackTime = Math.max(0, game.blackTime - elapsed);
        }
        game.lastMoveTime = now;
        game.currentTurn = game.chess.turn();

        // Broadcast move
        io.to(game.whiteSocket).to(game.blackSocket).to(spectatorRoom(matchId)).emit("match:move_applied", {
          san: move.san,
          fen: game.chess.fen(),
          moveNumber: game.moveCount,
          whiteTime: game.whiteTime,
          blackTime: game.blackTime,
        });

        // Check game over
        if (game.chess.isGameOver()) {
          let winner: string | null = null;
          let resultType: "checkmate" | "draw" = "draw";

          if (game.chess.isCheckmate()) {
            winner = game.chess.turn() === "w" ? game.blackWallet : game.whiteWallet;
            resultType = "checkmate";
          }

          await endMatch(matchId, resultType, winner);
        }
      } catch {
        socket.emit("match:invalid_move", { reason: "Invalid move format" });
      }
    });

    // Resign
    socket.on("match:resign", async ({ matchId }) => {
      const game = activeGames.get(matchId);
      if (!game) return;

      const wallet = socketToWallet.get(socket.id);
      if (!wallet || (wallet !== game.whiteWallet && wallet !== game.blackWallet)) return;

      const winner = wallet === game.whiteWallet ? game.blackWallet : game.whiteWallet;
      await endMatch(matchId, "resignation", winner);
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      const wallet = socketToWallet.get(socket.id);
      const matchId = socketToMatch.get(socket.id);

      leaveSpectatedMatch(socket);

      // Remove from queue
      if (wallet) {
        const idx = queue.findIndex((e) => e.walletAddress === wallet);
        if (idx > -1) queue.splice(idx, 1);
      }

      // Handle active match disconnect
      if (matchId) {
        const game = activeGames.get(matchId);
        if (game) {
          const opponentSocket = socket.id === game.whiteSocket ? game.blackSocket : game.whiteSocket;
          io.to(opponentSocket).emit("match:opponent_disconnected", {
            remainingSeconds: GAME_CONFIG.reconnectGraceSeconds,
          });

          game.disconnectTimer = setTimeout(async () => {
            const stillGame = activeGames.get(matchId);
            if (stillGame) {
              const disconnectedWallet = socket.id === stillGame.whiteSocket ? stillGame.whiteWallet : stillGame.blackWallet;
              const winner = disconnectedWallet === stillGame.whiteWallet ? stillGame.blackWallet : stillGame.whiteWallet;
              await endMatch(matchId, "disconnect", winner);
            }
          }, GAME_CONFIG.reconnectGraceSeconds * 1000);
        }
      }

      walletToSocket.delete(wallet ?? "");
      socketToWallet.delete(socket.id);
      socketToMatch.delete(socket.id);
    });
  });

  // Matchmaking interval — check queue periodically
  setInterval(() => {
    if (queue.length < 2) return;

    const processed = new Set<string>();
    for (const entry of queue) {
      if (processed.has(entry.socketId)) continue;
      const opponent = findOpponent(entry);
      if (opponent && !processed.has(opponent.socketId)) {
        processed.add(entry.socketId);
        processed.add(opponent.socketId);
        startMatch(entry, opponent).catch(console.error);
      }
    }
  }, 3000);

  return io;
}
