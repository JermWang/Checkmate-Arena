# CHECKMATE ARENA — Wager Flow & Escrow Architecture

Detailed spec for the **on-chain wager** system: public lobby challenges + private room-code matches, both staking the future **$CHESS** SPL token. Designed to be safe pre-launch (placeholder mint) and identical in behavior post-launch.

---

## 1. Mental model

> The escrow program is a **trustless pot holder**. Two players each fund it with equal stake. A single off-chain authority (our server) signs the result and triggers settlement. Settlement is deterministic; the authority cannot drain or redirect funds — it can only pick *winner / loser / draw*.

Why a server authority and not an on-chain chess judge? Validating chess moves on-chain costs more than the wagers in v1. Off-chain authority with full game log (PGN + signed moves) is the pragmatic v1 design. v2 can add ZK move proofs or a fraud-window challenge period.

---

## 2. Accounts

```
match_escrow PDA   seeds = ["match", match_id (16 bytes)]
                   owner  = MatchEscrowProgram
                   data   = {
                     match_id, mint, stake_amount,
                     creator_pubkey, challenger_pubkey,
                     creator_deposited bool, challenger_deposited bool,
                     status enum { Open, Live, Settled, Cancelled },
                     created_at, server_authority pubkey
                   }

match_vault ATA    associated token account for match_escrow PDA, holds stake_mint
treasury_pda       single global PDA receiving the house fee
house_fee_vault ATA ATA for treasury_pda holding stake_mint
```

---

## 3. Instructions

### 3.1 `create_match`
- Signer: creator wallet.
- Args: `match_id`, `mint`, `stake_amount`, `is_private`, `time_control_ix`.
- Effects:
  - Initializes `match_escrow` PDA.
  - Transfers `stake_amount` of `mint` from creator's ATA → `match_vault`.
  - Sets `creator_deposited = true`, `status = Open`.

### 3.2 `accept_match`
- Signer: challenger wallet.
- Args: `match_id`.
- Effects:
  - Verifies `status = Open` and challenger ≠ creator.
  - Transfers `stake_amount` from challenger's ATA → `match_vault`.
  - Sets `challenger_deposited = true`, `status = Live`.

### 3.3 `cancel_match`
- Signer: creator (only before acceptance).
- Effects:
  - Verifies `status = Open`, `challenger_deposited = false`.
  - Refunds full creator stake from `match_vault` → creator ATA.
  - Sets `status = Cancelled`.

### 3.4 `settle_match`
- Signer: server authority (single pubkey, stored in KMS).
- Args: `match_id`, `result enum { CreatorWins, ChallengerWins, Draw }`, `result_sig` (server signature over match outcome bytes).
- Effects:
  - Verifies `status = Live`.
  - Computes house fee = `2 * stake_amount * 2 / 100`.
  - On `Draw`: refunds each player `stake_amount * 98/100`, sends house fee to `house_fee_vault`.
  - On `Wins`: sends `(2 * stake_amount - house_fee)` to winner ATA, sends house fee to `house_fee_vault`.
  - Sets `status = Settled`.

### 3.5 `force_refund` (emergency)
- Signer: server authority.
- Used only when a match cannot complete (server outage > 24h, dispute resolution).
- Refunds each side full stake, no house fee. Status → `Cancelled`.

---

## 4. Off-chain match lifecycle

```
USER FLOW                          SERVER FLOW                       ON-CHAIN
─────────────────────────────────────────────────────────────────────────────
1. Creator opens "Create wager"
2. Picks stake, time control,
   color, public/private
3. Clicks "Create"  ─────────────► POST /api/matches
                                   - generate match_id (uuid → 16-byte)
                                   - generate room_code if private
                                   - insert matches row (status=open_pending)
                                   - return unsigned create_match ix
4. Wallet signs + sends  ──────────────────────────────────────────►  create_match
                                                                     match_escrow init
                                                                     creator stake locked
                                   ◄──────  webhook / RPC poll  ─────
                                   matches.status = open
                                   for public: appears in lobby
                                   for private: code is shareable

5. Challenger sees / pastes code
6. Clicks "Accept"  ─────────────► POST /api/matches/:id/accept
                                   - return unsigned accept_match ix
7. Wallet signs + sends  ──────────────────────────────────────────►  accept_match
                                                                     challenger stake locked
                                                                     status = Live
                                   ◄────── webhook ───────────────
                                   matches.status = live
                                   matches.started_at = now()
                                   broadcast "match_start" to both

8. Game plays out
   moves go via realtime channel ► /api/matches/:id/move (validated)
                                   moves table row per ply
                                   clock decremented server-side

9. Result reached (mate/timeout/
   resign/draw) ───────────────►  /api/matches/:id/finish (internal)
                                   - server signs result blob
                                   - calls settle_match with authority
                                                                  ►  settle_match
                                                                     pot → winner (or split)
                                                                     house fee → treasury
                                   ◄────── tx confirmed ──────────
                                   matches.status = settled
                                   broadcast result + replay link
```

---

## 5. Stake parameters

| Field | Type | Constraints |
|---|---|---|
| `stake_amount` | u64 | min 10 $CHESS, max 1,000,000 $CHESS per match (v1) |
| `mint` | pubkey | must equal `CHESS_MINT` constant (v1 — single token only) |
| `time_control` | enum | 1+0 / 3+0 / 5+3 / 10+5 |
| `color_pref` | enum | White / Black / Random |
| `is_private` | bool | If true, requires room_code |
| `room_code` | string | 6 chars, alphanumeric excl. I/O/0/1, single-use, 15-min TTL |
| `room_password` | string? | Optional, hashed server-side |
| `allow_spectators` | bool | Public defaults true, Private defaults false |
| `ranked` | bool | Affects ELO. Public always true, Private optional |

---

## 6. Room code generation (private)

- 6 chars, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars after excluding ambiguous I/O/0/1).
- 32^6 ≈ 1.07 billion combinations. Collision check against active rooms only.
- TTL: 15 min from creation, single-use (consumed on accept).
- Stored as `matches.room_code`, indexed, nulled after consumption.

---

## 7. Pre-launch placeholder strategy

```ts
// lib/token.ts
export const CHESS_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_CHESS_MINT!
);

export const IS_PLACEHOLDER =
  process.env.NEXT_PUBLIC_CHESS_LAUNCHED !== "true";
```

**Pre-launch state:**
- `NEXT_PUBLIC_CHESS_MINT` = devnet test mint we control + mint dust to any new wallet via faucet.
- `NEXT_PUBLIC_CHESS_LAUNCHED=false`
- Persistent banner: *"Practice Pot — $CHESS launches soon. Test wagers settle in placeholder mint."*
- All flows work end-to-end. Real wallets, real signing, real settlement. Just a placeholder mint.
- Leaderboard shows "placeholder" tag during this period.

**Launch day:**
1. Deploy the real $CHESS mint, fix supply.
2. Update Vercel env: `NEXT_PUBLIC_CHESS_MINT=<real mint>`, `NEXT_PUBLIC_CHESS_LAUNCHED=true`.
3. Redeploy.
4. Banner auto-hides. Active matches keep settling in old mint (they finish out).
5. New matches use real $CHESS.
6. Optional: convert placeholder-era leaderboard winners to real $CHESS airdrop.

---

## 8. Edge cases & how we handle them

| Case | Handling |
|---|---|
| Creator funds, no one accepts in 5 min | Auto-call `cancel_match` from server; full refund. |
| Both sides funded, server dies mid-game | Cron task notices `status=Live` + no moves for 2h → server signs `force_refund`. |
| Player wallet runs out of $CHESS between create + accept | Acceptance tx fails on insufficient funds; lobby stays open. |
| Wrong mint passed somehow | Program rejects (checks `mint == expected_mint`). |
| Player tries to accept own match | Program rejects (`challenger != creator`). |
| Network congestion → settle tx delays | UI shows "Settling…" state with tx link. Auto-retry with priority fee bump. |
| Player claims they were cheated | `/admin` dispute queue. If found, `force_refund`, ban abuser. |
| Stockfish detects engine assistance post-match | Settled funds already moved → claw back via ban + treasury makewhole to opponent. |

---

## 9. Security checklist

- [ ] Server authority keypair in cloud KMS, never in env vars or repo.
- [ ] All settle_match calls require server signature over (`match_id` ‖ `result` ‖ `timestamp`).
- [ ] Rate-limit `/api/matches` create endpoint per wallet (anti-griefing).
- [ ] Verify mint pubkey on every instruction (defense against fake-token swap attacks).
- [ ] Verify both ATAs are the canonical associated token accounts.
- [ ] Anchor program: cover with full unit tests + a localnet integration test for the full lifecycle.
- [ ] External audit before mainnet $CHESS launch.

---

## 10. Files this will touch when we build it

```
programs/match-escrow/                      # Anchor program (Rust)
  src/lib.rs
  src/state.rs
  src/instructions/{create,accept,cancel,settle,refund}.rs
  tests/match-escrow.ts

app/api/matches/route.ts                    # POST create
app/api/matches/[id]/accept/route.ts        # POST accept
app/api/matches/[id]/cancel/route.ts        # POST cancel
app/api/matches/[id]/move/route.ts          # POST move (server-validated)
app/api/matches/[id]/finish/route.ts        # internal: triggers settle

lib/token.ts                                # CHESS_MINT, IS_PLACEHOLDER
lib/escrow.ts                               # client-side ix builders
lib/server-authority.ts                     # KMS-backed signer (server only)

components/wager/CreateWagerModal.tsx
components/wager/PublicLobbyTable.tsx
components/wager/PrivateRoomCreate.tsx
components/wager/PrivateRoomJoin.tsx
components/wager/PotBadge.tsx
components/match/Board.tsx
components/match/Clock.tsx
components/match/MoveList.tsx
components/match/ResultScreen.tsx
```
