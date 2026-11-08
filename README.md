# NYC LIFE: One Day in New York

A tiny New York life sim for the web (desktop + mobile browsers). You just moved to the city with $20.
Make three choices, live one day, and save your score on **Solana Devnet**, where an Anchor program
re-plays your day and computes the score itself, so a modified client cannot fake a high score.

Built for UB Hacking 2026 (Best Use of Solana · Best Freshman · Best UI/UX).

## How it works

1. **Play** (Phaser 3): walk the block, enter the Apartment, Office or Joe's Pizza, pick one action per visit. 3 actions = 1 day.
2. **Send choices**: the wallet signs a transaction containing only the 3 action ids (never a score).
3. **Solana scores it**: the `nyc_life` Anchor program runs the same rules, computes the score, and stores
   `best_score`, `days_completed`, `last_score`, `last_actions` in a per-wallet PDA (`["player", wallet]`), and emits a `DayCompleted` event.
4. The site shows the on-chain score next to the local score, plus Solana Explorer links.

### Rules (identical in `game/rules.js` and `program/lib.rs`)

Start: $20, 60 energy, 50 happiness. Energy/happiness are clamped to 0–100 after each action.

| id | Place | Action | If | Effect | Else |
|---|---|---|---|---|---|
| 0 | Apartment | Nap | always | E+40, H+5 | — |
| 1 | Apartment | Cook at home | $≥5 | $-5, E+10, H+10 | H-5 |
| 2 | Office | Work a shift | E≥30 | $+60, E-30, H-10 | $+25, E-20, H-20 |
| 3 | Office | Pull a double | E≥50 | $+100, E-50, H-25 | $+40, E-40, H-30 |
| 4 | Joe's Pizza | Grab a slice | $≥15 | $-15, E+15, H+20 | H-10 |
| 5 | Joe's Pizza | Hang with friends | $≥10 | $-10, H+30, E-10 | H+10, E-10 |

`score = money + energy + 2 × happiness + 50 (if all 3 places visited)`

## Run locally

```
npm install
npm test          # rules + Solana encoding tests
npm run dev       # http://localhost:3000
```

On-chain features are off until you set the program ID:

```
cp .env.example .env.local
# NEXT_PUBLIC_PROGRAM_ID=<your program id from Solana Playground>
```

## Deploying the program (Solana Playground)

See PLAN.md section 4.3. Paste `program/lib.rs` into https://beta.solpg.io (Anchor project), Build, Deploy on Devnet,
then copy the Program ID into `.env.local` (and Vercel env vars) and export the IDL to `solana/idl/nyc_life.json`.

- Program ID: _TBD after deploy_
- Example transaction: _TBD_

## Tech

Next.js 16 (App Router, client-only game) · Phaser 3.90 · @solana/web3.js 1.x · Solana wallet adapter ·
Anchor (Solana Playground) · Devnet. All art is drawn in code; no image or audio files.

## Project layout

```
app/            Next.js page, layout, global CSS
components/     React shell: GameCanvas, ChainPanel (wallet + record), site sections
game/           Phaser scenes, rules.js (shared scoring rules), HUD/menu, generated textures, sfx
solana/         constants, byte encoding (discriminators, PDA layout), transaction client
program/lib.rs  Anchor program source (deployed via Solana Playground)
```
