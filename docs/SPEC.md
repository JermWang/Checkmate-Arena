# CHECKMATE ARENA — Functional Specification

A Solana-native PvP chess arena. Players queue casual matches for free, or stake the native **$CHESS** SPL token in **public-lobby** or **private room-code** wagered matches. Winner takes the pot, minus a small house rake that funds buybacks/burns.

> **Token status:** `$CHESS` SPL mint **has not launched**. The app is built so every wager touchpoint reads the mint from a single config constant. Until the mint exists, wager mode runs in **"Practice Pot" mode** using a devnet placeholder mint so the UX is fully exercised pre-launch. Flip a single env var on launch day → live.

---

## 1. Product pillars

| Pillar | What it means |
|---|---|
| **Fair** | On-chain escrow, deterministic move validation server-side, signed move log. No "the server says you lost". |
| **Fast** | 90-second average lobby → first move. Wallet pre-warmed, deposits batched. |
| **Loud** | Big numbers, big sounds, kill-cam style checkmate replay. This is an **arena**, not chess.com. |
| **Sticky** | ELO, daily missions, leaderboards with weekly $CHESS prize pool from rake. |

---

## 2. Top-level screens / routes

```
/                       Landing + wallet connect
/home                   Logged-in hub (live matches, your stats, CTA cards)
/play                   Mode picker (Casual / Ranked / Wager Public / Wager Private)
/lobby/public           Browse open public-wager lobbies (filter by stake, time control)
/lobby/private/create   Create private room → returns 6-char code
/lobby/private/join     Enter 6-char code
/match/[id]             Live board (spectatable when public)
/match/[id]/replay      Post-game replay + analysis
/profile/[wallet]       Public profile (record, badges, history)
/me                     Your account (wallet, $CHESS balance, withdrawals)
/leaderboard            Global + weekly prize-pool standings
/missions               Daily/weekly challenges
/shop                   Cosmetic board skins, piece sets, profile frames
/admin                  (internal) match disputes, rake address, mint config
```

---

## 3. Match modes

### 3.1 Casual (free)
- No stake. ELO not affected. Used as warmup and tutorial.
- Time controls: 1+0 bullet, 3+0 blitz, 5+3 blitz, 10+5 rapid.

### 3.2 Ranked (free)
- No stake. ELO + global leaderboard.
- Same time controls. Anti-smurf: account must be ≥48h old AND ≥10 casual games played.

### 3.3 **Wager — Public Lobby** 🪙
- Open list of "challenges" anyone can accept.
- Creator sets: **stake** (in $CHESS), **time control**, **color preference** (white / black / random).
- Stake tiers (UI-snapped, but custom allowed): 100 / 500 / 1k / 5k / 10k / 50k / 100k $CHESS.
- Both players deposit to escrow at acceptance. Match auto-starts.
- Lobby auto-cancels and refunds creator after 5 min idle.

### 3.4 **Wager — Private Room** 🔒
- Creator generates a **6-character alphanumeric code** (no I/O/0/1) → shareable link `/match/join?code=XXXXXX`.
- Same stake/time/color params, plus: **password optional**, **expires in 15 min**, **single-use**.
- Useful for streamer challenges, friend duels, tournament brackets.
- Private rooms do **not** appear in any public lobby, do **not** affect ELO unless creator toggles "ranked" on.

### 3.5 Tournament (v2, post-launch)
- Bracketed events, weekly prize pool from rake. Out of scope for v1 build.

---

## 4. Wager / escrow flow ($CHESS)

### 4.1 Lifecycle (both public + private)

```
Create   → creator signs deposit tx (stake locked in escrow PDA)
Accept   → challenger signs deposit tx (matching stake locked)
Start    → server emits start signal once both deposits confirmed
Play     → moves validated server-side, signed and stored
Result   → checkmate / resign / timeout / draw
Settle   → escrow PDA releases pot to winner minus rake
           draw → both deposits refunded minus tiny network fee
```

### 4.2 On-chain components

- **Escrow program (Anchor)** with a single PDA per match: `["match", match_id]`.
- Instructions: `create_match`, `accept_match`, `cancel_match` (creator, pre-accept only), `settle_match` (server authority, signed result), `refund_draw`.
- **Server authority keypair** is the only signer that can `settle_match`. Stored in a KMS; rotated quarterly.
- **Rake** = 4% of pot, sent to `treasury_pda`. Of that: 50% → weekly leaderboard pool, 30% → buyback wallet, 20% → ops.

### 4.3 Anti-grief rules

| Behavior | Penalty |
|---|---|
| Accept then disconnect >60s before first move | 10% stake → opponent, 90% refund |
| Resign / abandon mid-match | Full pot → opponent (this is just a loss) |
| Repeated lobby-creation then cancellation (>3 in 10 min) | 15 min lobby-create cooldown |
| Detected engine assistance | Account flagged, escrow returned to opponent, ban |

### 4.4 Pre-launch placeholder

- `lib/token.ts` exports `CHESS_MINT` read from `NEXT_PUBLIC_CHESS_MINT`.
- Until real mint: `NEXT_PUBLIC_CHESS_MINT=<devnet_placeholder_mint>` and a banner reads **"Practice Pot — $CHESS launches soon. Test wagers settle in placeholder token."**
- Launch day: update env var to real mint pubkey, redeploy, banner auto-hides.

---

## 5. Account / wallet

- **Wallet connect**: Phantom, Solflare, Backpack via Wallet Adapter. Magic-link / email fallback (Privy embedded wallet) so non-degens can play casual.
- **First-time login**: pick a handle (3–16 chars, unique), pick avatar (8 starter avatars).
- **Profile** stores: handle, avatar, ELO (per time control), W/L/D, total $CHESS won, badges, country flag (optional).
- **$CHESS balance** shown in header — pulled from wallet's associated token account.
- **Deposit/withdraw**: not needed — wagers transfer directly from wallet ATA to escrow PDA each match.

---

## 6. Matchmaking + game engine

- **Engine**: server-side chess engine using `chess.js` for legal-move validation; clients render with `react-chessboard`. Engine state of truth lives on the server, never on the client.
- **Realtime**: Supabase Realtime channels per match, fallback to Socket.io. Moves are PGN-encoded, signed by the moving player, stored in DB.
- **Clock**: server-authoritative. Client shows interpolated clock; server's clock decides timeouts.
- **Disconnect protection**: 30-second reconnect grace. After grace, clock resumes ticking against the disconnected player.
- **Spectators**: public wagered matches are spectatable; private rooms are not (unless creator toggles "allow spectators").

---

## 7. Economy & progression

### 7.1 ELO
- Glicko-2, per time control. Starts at 1200. Decay if inactive >30 days.

### 7.2 Daily missions (cosmetic + small $CHESS rewards)
- "Win 3 casual games" / "Play 1 wagered match" / "Win as black" / "Mate in <20 moves".
- Reward: 10–100 $CHESS from treasury, or cosmetic unlock.

### 7.3 Badges
- First Blood (first wager win), High Roller (50k+ stake won), Streaker (10 wins in a row), Comeback Kid (win from -5 material), Stone Cold (win on time with <1s left), Untouchable (win without losing a piece).

### 7.4 Cosmetics (shop)
- Board skins, piece sets, profile frames, victory animations, taunt emotes.
- Sold for $CHESS, no real-money cosmetics in v1.

### 7.5 Leaderboards
- All-time ELO, weekly $CHESS earnings, current streak. Weekly $CHESS earnings pool pays top 100.

---

## 8. Anti-cheat (v1 minimum)

- Move-time fingerprinting (engines move suspiciously fast on critical moves).
- Top-engine-match-rate analysis per match (Stockfish comparison run async post-match).
- Velocity heuristics: wallet age, win rate vs ELO delta, suspicious deposit/withdraw patterns.
- Reports + manual review queue in `/admin`. Flagged accounts have wagers held pending review.

---

## 9. Tech stack

```
Frontend     Next.js 14 (app router), React 18, TypeScript, Tailwind, Framer Motion
Chess UI     react-chessboard, chess.js
Wallet       @solana/wallet-adapter-react + Phantom/Solflare/Backpack, Privy fallback
On-chain     Anchor (Rust) escrow program on Solana mainnet (devnet first)
Backend      Supabase (Postgres + Realtime + Auth + Edge Functions)
Server logic Edge functions for: settle_match, validate_move, leaderboard cron
Hosting      Vercel (frontend) + Supabase (everything else)
Analytics    PostHog
Errors       Sentry
```

---

## 10. Database schema (Supabase)

```sql
profiles(id pk, wallet text unique, handle text unique, avatar text,
         elo_bullet int, elo_blitz int, elo_rapid int,
         created_at, last_seen_at)

matches(id pk, mode enum, time_control text, white_id fk, black_id fk,
        stake_amount bigint, stake_mint text, status enum,
        result enum, pgn text, escrow_pda text,
        is_private bool, room_code text, created_at, started_at, ended_at)

moves(id pk, match_id fk, ply int, san text, time_left_ms int,
      signature text, created_at)

escrow_events(id pk, match_id fk, type enum, signature text,
              amount bigint, wallet text, created_at)

leaderboard_snapshots(week_start date, profile_id fk, earnings bigint,
                      rank int)

reports(id pk, reporter_id fk, reported_id fk, match_id fk,
        reason text, status enum, created_at)
```

---

## 11. v1 feature checklist (build order)

- [ ] Project scaffolding (Next.js + Tailwind + wallet adapter + Supabase)
- [ ] Landing + wallet connect + handle picker
- [ ] Casual match (no stake) end-to-end: lobby → board → result
- [ ] ELO + ranked matchmaking
- [ ] Public wager lobby (placeholder token on devnet)
- [ ] Private room code wager
- [ ] Anchor escrow program (devnet)
- [ ] Settle/refund/dispute server flows
- [ ] Profile + leaderboard + missions
- [ ] Shop + cosmetics
- [ ] Anti-cheat pipeline (Stockfish async analysis)
- [ ] Mainnet deploy + $CHESS mint swap
