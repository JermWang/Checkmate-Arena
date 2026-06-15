import { io } from "socket.io-client";
import { Chess } from "chess.js";

const URL = "http://localhost:3001";
const WALLET = "BotOpponentArena9xKpLrSt7uVwZbQ2mNcDeFgHjKpQ";
const chess = new Chess();
let myColor = null;
let matchId = null;

const s = io(URL, { path: "/socket.io" });

function maybeMove() {
  if (!matchId || !myColor) return;
  const turn = chess.turn(); // 'w' | 'b'
  if ((myColor === "white" ? "w" : "b") !== turn) return;
  if (chess.isGameOver()) return;
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return;
  // Prefer a simple developing move, else random.
  const pick = moves[Math.floor(Math.random() * moves.length)];
  setTimeout(() => {
    console.log(`[bot] (${myColor}) plays ${pick.san}`);
    s.emit("match:move", { matchId, from: pick.from, to: pick.to, promotion: pick.promotion });
  }, 700);
}

s.on("connect", () => {
  console.log("[bot] connected", s.id);
  s.emit("wallet:connect", { walletAddress: WALLET });
  s.emit("queue:join", { walletAddress: WALLET, rating: 1000 });
});

s.on("match:found", ({ matchId: mid, color }) => {
  matchId = mid;
  myColor = color;
  console.log(`[bot] matched mid=${mid} as ${color}`);
});

s.on("match:start", ({ fen }) => {
  chess.load(fen);
  console.log("[bot] match start");
  maybeMove();
});

s.on("match:move_applied", ({ san, fen }) => {
  chess.load(fen);
  console.log(`[bot] move applied: ${san} | turn=${chess.turn()}`);
  maybeMove();
});

s.on("match:ended", ({ result, winner }) => {
  console.log(`[bot] match ended: ${result} winner=${winner}`);
});

s.on("disconnect", () => console.log("[bot] disconnected"));
console.log("[bot] starting, connecting to", URL);
