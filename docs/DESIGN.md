# CHECKMATE ARENA — Visual Design System

A **dark, hot-pink-on-obsidian** arena aesthetic. Brutalist serif headers, ultra-clean mono numbers, neon accents only when something is **at stake**. Casual matches feel calm; wagered matches feel *loud* — the UI literally lights up red the moment a stake is locked.

Reference vibe: "if Cyberpunk and a Grandmasters championship had a baby that lived on Solana."

---

## 1. Color tokens

```css
/* Base — Obsidian */
--bg-0:        #0A0A0F;   /* page background */
--bg-1:        #12121A;   /* card surface */
--bg-2:        #1B1B26;   /* elevated / modal */
--bg-3:        #262635;   /* input fields, table rows */

/* Ink */
--ink-100:     #F4F4F8;   /* primary text */
--ink-80:      #C9C9D6;   /* secondary text */
--ink-60:      #8A8AA0;   /* tertiary, helper text */
--ink-40:      #55556B;   /* muted, disabled */
--ink-20:      #2E2E40;   /* hairlines / dividers */

/* Brand — Checkmate Red (the "stakes are on" signal) */
--brand:       #FF2D55;   /* hot crimson — primary actions, wager mode */
--brand-hot:   #FF5577;   /* hover */
--brand-deep:  #B81A3C;   /* pressed */
--brand-glow:  rgba(255, 45, 85, 0.35);

/* Token — $CHESS gold (used ONLY for $CHESS amounts) */
--chess:       #F5C24B;   /* warm honey gold */
--chess-glow:  rgba(245, 194, 75, 0.30);

/* Semantic */
--win:         #34D399;   /* win / connected / online */
--loss:        #FF2D55;   /* loss (reuses brand) */
--draw:        #8A8AA0;
--warn:        #FBBF24;
--info:        #60A5FA;

/* Board (default skin "Obsidian") */
--sq-light:    #2B2B3A;
--sq-dark:     #1A1A24;
--sq-move:     rgba(255, 45, 85, 0.25);
--sq-last:     rgba(245, 194, 75, 0.18);
--sq-check:    rgba(255, 45, 85, 0.55);
```

Three additional **board skins** ship in v1 cosmetics shop: *Ivory*, *Neon Grid*, *Tournament Wood*.

---

## 2. Typography

```
Display    "Cormorant Garamond" 700  — page titles, "CHECKMATE", winner reveals
Heading    "Inter" 700               — section headers, modal titles
Body       "Inter" 400/500           — UI copy
Mono       "JetBrains Mono" 500      — clocks, $CHESS amounts, room codes, ELO
```

Scale:
```
Display-XL   72/76   tight (-0.02em)   — checkmate reveal
Display-L    48/52   tight (-0.02em)   — landing hero
H1           32/38
H2           22/28
H3           17/22
Body         15/22
Small        13/18
Mono-clock   28/28   feature-tabular-nums
Mono-stake   22/22   feature-tabular-nums
Mono-small   12/16   feature-tabular-nums
```

---

## 3. Component library

### 3.1 Button
- **Primary**: solid `--brand`, white text, subtle glow when in wager flow.
- **Secondary**: outlined `--ink-20`, hover fills `--bg-2`.
- **Ghost**: text-only with hover underline.
- **Token-CTA**: solid `--chess`, black text — *reserved for "Deposit Stake" only*.
- Heights: 32 (sm), 40 (md), 48 (lg). Radius: 10px. Press scale: 0.97.

### 3.2 Card
- `bg: --bg-1`, `border: 1px solid --ink-20`, radius: 16px, padding: 20.
- **Wager card** (lobby tile) gets a red 1px gradient border + faint `--brand-glow` shadow when stake > 0.

### 3.3 Input
- 44px tall, `--bg-3`, focus ring `--brand` 2px, mono font for codes/amounts.
- Room-code input is **6 separated boxes**, autofocuses next on keypress.

### 3.4 Modal / Sheet
- Full-screen overlay `rgba(10,10,15,0.8)` + backdrop blur 12px.
- Sheet: max-w 480px, `--bg-2`, radius 20, slides up on mobile.

### 3.5 Clock
- Mono, 28px. **Green** when active, **white** when paused, **red pulse** when <10s.

### 3.6 Avatar
- Round, 1px brand border for opponent during wagered match. Online dot bottom-right.

### 3.7 Toast
- Top-right slide-in. 4s default. Icon left, text mid, dismiss right.
- Wager events ("Pot locked: 5,000 $CHESS") use gold accent left bar.

---

## 4. Layout grid

- 12-col, 80px max gutter, 1280px content max.
- Mobile: single column, sticky bottom nav (Home / Play / Profile / Wallet).
- Match screen: board centered, side rails for clocks/move list — collapses to overlay on mobile.

---

## 5. Screen-by-screen

### 5.1 Landing (logged out)
- Hero with massive "CHECKMATE ARENA" in Cormorant, kerned tight.
- Tagline: *"Chess. With everything on the line."*
- Centered ghost board with looping famous-checkmate replay behind a 60% scrim.
- Two CTAs: **Connect Wallet** (primary) / **Watch live matches** (ghost).
- Below the fold: 3 live wagered matches with stake amounts ticking.

### 5.2 Home (logged in)
- Top: handle + avatar + $CHESS balance pill.
- Hero card: "Quick match" — big primary button → casual matchmaking.
- Row of mode cards: Casual / Ranked / **Wager Public** / **Wager Private**.
- Live matches feed (scroll horizontally).
- Daily missions strip.

### 5.3 Play → mode picker
- 4 large clickable cards. Wager cards have gold $CHESS coin glyph.
- Click "Wager Public" → public lobby. Click "Wager Private" → split: **Create Room** | **Enter Code**.

### 5.4 Public wager lobby
- Filter bar: time control, stake range slider, color preference.
- Table of open challenges (creator avatar, ELO, stake in mono gold, time control, "Accept" button).
- Floating bottom-right: **+ Create Challenge** FAB.
- Create modal: stake input (snap chips), time control, color, "Create" button glows red as you fill it.

### 5.5 Private room — create
- Modal centered.
- Stake / time / color same as public.
- Toggle: "Show in spectator feed", "Mark as ranked".
- On confirm: full-screen reveal of **room code** in 6 huge mono boxes, with **Copy Link** button + countdown "expires in 15:00".

### 5.6 Private room — join
- Single screen, 6-box code input + optional password field.
- "Join Room" button — fails fast with shake animation on bad code.

### 5.7 Match screen (live)
- Center: board.
- Left rail: opponent avatar, ELO, clock, captured pieces.
- Right rail: your stuff + move history (PGN scroll).
- Top bar (wagered): **POT: 10,000 $CHESS** in gold mono, pulsing 1px brand border around whole viewport while stake is locked.
- Bottom: resign / draw offer / report buttons.
- Spectator count chip (public wagered only).

### 5.8 Result screen
- Full-screen takeover, 0.6s slow-mo of final move.
- "CHECKMATE" in 96px Cormorant, gold-foil shimmer if you won the stake.
- Stat strip: ELO change, pot won, badges earned.
- Buttons: **Rematch** (primary) / **Replay** / **Home**.

### 5.9 Profile
- Banner with avatar, handle, country.
- ELO per time control as 3 stat tiles.
- Lifetime: games played, win rate, **$CHESS won** (gold).
- Match history table, badges grid, recent wagers.

### 5.10 Leaderboard
- Tabs: ELO / Weekly Earnings / Streak.
- Top 3 podium with avatars, then table to rank 100.
- Weekly Earnings tab shows current prize-pool snapshot (live).

---

## 6. Motion language

- **Default ease**: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth out).
- **Durations**: micro 120ms, ui 200ms, scene 400ms, reveal 800ms.
- **Wager locked**: viewport border fades in over 600ms, then a subtle 4s pulse loop.
- **Move played**: piece tween 140ms, square highlight fades 600ms.
- **Checkmate**: 0.2s freeze → 0.6s slow-mo zoom-in on the mating piece → reveal screen.
- **Reduce motion**: respect `prefers-reduced-motion` — disable pulses, keep transitions.

---

## 7. Sound (optional, off by default after first session)

| Event | Sound |
|---|---|
| Piece moved | Soft wood click |
| Capture | Deeper thud |
| Check | Low metallic ping |
| Checkmate | Big arena horn + crowd |
| Pot locked | Coin stack drop + sub-bass thump |
| 10-second clock | Heartbeat ticks |
| Win wager | Cha-ching + horn |
| Lose wager | Single muted bell |

---

## 8. Iconography

- **Lucide-react** as base set.
- Custom glyphs: $CHESS coin (gold king-crown silhouette), Pot icon (chess clock + flame), Shield-Lock (private room).

---

## 9. Accessibility

- All interactive elements: visible focus ring `--brand` 2px, 4px offset.
- Color is never the only signal — every win/loss/draw also uses an icon + text label.
- Min contrast: AA for body text, AAA for clocks and stake amounts.
- Keyboard: full board nav via arrow keys + Enter to move, Tab through lobby table.
- Screen reader: live region announces "white plays Nf3", "you are in check", "stake locked: 5000 CHESS".

---

## 10. Tone of voice

- Headlines: **terse, declarative, slightly cocky.** "Play for keeps." "Bring stakes."
- Confirmations: short, no exclamation marks. "Pot locked." "Stake refunded." "Code copied."
- Errors: blame the system, not the user. "Couldn't reach the escrow. Tap to retry."
- Never use "buddy", "champ", "rockstar", or any emoji in core UI copy.
