# NYC LIFE: One Day in New York — Build Plan

UB Hacking 2026 · solo beginner · **hard deadline: Sun Nov 8, 11:30 AM EDT** (PDF says 11:30, Devpost says 1:30 PM; plan for 11:30).
Targets: **Best Use of Solana** (primary), Best Freshman, Best UI/UX. ElevenLabs is a **stretch goal only**.
Builder: Claude Code (Sonnet), one stage per session. The user runs commands and does the manual Solana Playground and wallet steps.
**Product form: a website (one public URL on Vercel) that is playable in desktop browsers AND mobile browsers.** No native or installable app, no app stores.

This plan replaces the "Phaser + Vite, no React" rules in `t2.txt`. Where they conflict, follow this file.

---

## 0. How Sonnet should use this file

- Run **one stage per session**. Start each session with: "Read PLAN.md section 5, do Stage N only." Run `/clear` between stages.
- Do not start Stage N+1 until Stage N's verification step passes and the user confirms it.
- When something breaks, fix that one thing. Do not rewrite files that already work.
- Never ask for a private key or seed phrase. Never invent a program ID. It comes from the user (see 4.4).
- Anything marked **[VERIFY]** is uncertain. Check it against the installed package or the official docs before relying on it.

---

## 1. Stack decision

### Recommendation: (a) Next.js App Router + Phaser 3 canvas (client-only) + Solana wallet adapter

| Factor | (a) Next.js + Phaser | (b) Vite + Phaser |
|---|---|---|
| Wallet UX | Official `@solana/wallet-adapter-react(-ui)` gives a connect modal, `useWallet().sendTransaction`, and auto-detects Phantom/Solflare/Backpack. Very little code. | No React, so the adapter UI is not available. You would hand-roll `window.phantom.solana` (Phantom only) or rebuild a wallet modal. |
| Deploy | Vercel deploys Next natively from GitHub with zero config. | Also easy on Vercel (static). |
| Server secret (ElevenLabs stretch) | `app/api/voice/route.js` keeps the key on the server, in the same project. | Needs a separate `api/` function setup or a Node server. |
| Beginner simplicity | Two known pitfalls (SSR `window` errors, StrictMode double-mount). Both are solved once in Stage 2 and never touched again. | Simplest possible game setup. |
| Fallback (drop Solana) | Hide one React panel. The game is unaffected. | Same. |
| Mobile web | The adapter bundles Solana Mobile Wallet Adapter, so Android Chrome can open the Phantom/Solflare app. Responsive site sections are easy to build in React/CSS. | Wallet support on mobile would have to be hand-rolled. |

**Why (a):** the Solana track is the main prize, and the wallet adapter is the biggest time-saver available for it. React only appears in a thin shell (providers, wallet button, on-chain panel). **All game code stays plain JavaScript inside Phaser**, so Sonnet never mixes game logic into React.

Rules that still hold: **JavaScript (no TypeScript), Phaser 3 (not 4), 2D only, no Tailwind, no state libraries, no multiplayer.**

### Exact packages (versions checked on the npm registry, Nov 7 2026)

| Package | Pin | Note |
|---|---|---|
| `next` | `16.4.5` (via `create-next-app@16.4.5`) | Needs Node >= 20.9. The user has Node 24. |
| `react`, `react-dom` | whatever create-next-app installs (19.x) | |
| `phaser` | **`3.90.0`** | **The npm `latest` tag is now 4.2.1.** A bare `npm i phaser` installs v4. Always pin `phaser@3.90.0`, the final v3 release. |
| `@solana/web3.js` | **`1.99.0`** | **The npm `latest` tag is now 3.2.0 (Kit-based).** The wallet adapter peer-depends on `^1.99.0`. Always pin `@solana/web3.js@1.99.0`. |
| `@solana/wallet-adapter-react` | `0.15.40` | |
| `@solana/wallet-adapter-react-ui` | `0.9.40` | Provides `WalletMultiButton` and the modal CSS. |
| `@solana/wallet-adapter-base` | `0.9.28` | |

Not used:
- `@solana/wallet-adapter-wallets`. It is heavy and unnecessary because Wallet Standard auto-detects Phantom and Solflare. Pass `wallets={[]}`.
- `@coral-xyz/anchor` / `@anchor-lang/core`. The front end builds Anchor instructions by hand (see 4.5), so it does not depend on which IDL format Playground exports. Optional fallback: `@coral-xyz/anchor@0.32.1`, which depends on web3.js 1.x.
- Stretch only: no ElevenLabs SDK. Use plain `fetch` to the REST API from the API route.

Install line (Stage 0):
```
npm i phaser@3.90.0 @solana/web3.js@1.99.0 @solana/wallet-adapter-react@0.15.40 @solana/wallet-adapter-react-ui@0.9.40 @solana/wallet-adapter-base@0.9.28
```
**[VERIFY]**
- If npm throws ERESOLVE (React 19 peer ranges in the mobile adapter), retry with `--legacy-peer-deps`.
- If the browser shows `Buffer is not defined`, run `npm i buffer` and add `import { Buffer } from 'buffer'; if (!window.Buffer) window.Buffer = Buffer;` at the top of `components/App.js`.

**Project location:** create the repo at `C:\dev\nyc-life`, **not inside OneDrive**. OneDrive sync on `node_modules` and `.next` causes file-lock errors and very slow installs.

---

## 2. File / folder structure

```
C:\dev\nyc-life\
  app/
    layout.js              # html shell, imports globals.css + wallet-adapter styles.css
    page.js                # server component: renders <ClientRoot />
    globals.css            # palette tokens, overlay panel styles
    api/voice/route.js     # STRETCH ONLY (ElevenLabs proxy)
  components/
    ClientRoot.js          # 'use client'; const App = dynamic(() => import('./App'), { ssr: false })
    App.js                 # SolanaProviders > <Hero/> <GameCanvas/> <ChainPanel/> <HowItWorks/> <Footer/>
    SiteSections.js        # Hero (title, tagline, Play button), HowItWorks (3 steps), Footer (GitHub/Explorer links)
    RotateHint.js          # overlay on the game section when a phone is in portrait: "Rotate your phone to play"
    SolanaProviders.js     # ConnectionProvider(devnet) > WalletProvider(wallets=[], autoConnect) > WalletModalProvider
    GameCanvas.js          # creates Phaser.Game once in useEffect, destroys it in cleanup
    ChainPanel.js          # WalletMultiButton, "Record day on Solana", status, Explorer links
  game/
    config.js              # Phaser config: 960x540, pixelArt, Scale.FIT + CENTER_BOTH, arcade physics
    bus.js                 # export const bus = new Phaser.Events.EventEmitter()  (Phaser <-> React bridge)
    rules.js               # PURE scoring rules, identical to Rust (section 3.5)
    rules.test.mjs         # node:test with the 5 test vectors
    textures.js            # generateTexture() for every sprite (no image files)
    scenes/
      BootScene.js         # builds textures, then starts TitleScene
      TitleScene.js        # title, how-to-play, "press ENTER"
      CityScene.js         # map, player, doors, HUD, action menu, day loop
      ResultScene.js       # breakdown + score, emits 'day-complete'
    ui/
      HUD.js               # money, energy bar, happiness bar, time-of-day, action pips 1/3
      ActionMenu.js        # 2-option popup per location (keys 1/2, mouse, Esc)
  solana/
    constants.js           # PROGRAM_ID (from env), CLUSTER='devnet', explorerTx(), explorerAddr()
    nycLifeClient.js       # PDA, discriminators, ix builders, recordDay(), fetchPlayerStats()
    idl/nyc_life.json      # exported from Playground (for reference and the README)
  program/
    lib.rs                 # source-of-truth copy of the Anchor program pasted into Playground
  .env.local               # NEXT_PUBLIC_PROGRAM_ID=<from Playground>  (not secret, but don't commit)
  next.config.mjs
  README.md
```

---

## 3. Game design spec (strict MVP)

### 3.1 Premise
You just moved to NYC with $20. One day, three choices. Make it count. Your day is recorded on Solana.

### 3.2 Screen and map
- One fixed screen, 960x540, top-down, no camera scrolling.
- Layout:
  - One horizontal street (gray asphalt, dashed yellow center line) and one vertical avenue, crossing in the middle with zebra crosswalks.
  - Sidewalks in light gray.
  - Decorative: a parked yellow taxi, a hot-dog cart, 2 trees, streetlights.
- Three buildings, each with a door zone (a glowing rectangle in front of the entrance):
  1. **Apartment** (brick red, fire escape lines). Bottom-left.
  2. **Office** (blue-glass tower, window grid). Top-right.
  3. **Joe's Pizza** (cream storefront, red-white awning). Bottom-right.
- Buildings are static arcade-physics bodies, so the player cannot walk through them.

### 3.2b Website layout (desktop + mobile)
- One page, top to bottom:
  1. Hero: title, one-line tagline, Play button that scrolls to the game.
  2. Game section: the canvas, max width 1280px, 16:9.
  3. ChainPanel: wallet + on-chain record.
  4. How it works: 3 steps (Play → the program scores your day → the record lives on Devnet).
  5. Footer.
- Body uses `100dvh`-aware CSS with 16px side gutters and no horizontal scroll at 360px width. Site text uses CSS (crisp at any size).
- Phaser: `Scale.FIT` + `CENTER_BOTH` inside a 16:9 container that fills the viewport width (in landscape on phones, it fills the viewport height).
- Phones are **landscape-only for the game**. In portrait on a narrow screen (`(orientation: portrait) and (max-width: 900px)`), RotateHint covers the game section. The rest of the site still works in portrait.
- In-game text is **at least 22px logical** (about 16px on screen on a landscape phone). Touch targets are at least 64 logical px.
- Optional Fullscreen button via `this.scale.startFullscreen()`. Hide it where the API is unsupported; iPhone Safari does not support it. **[VERIFY]**

### 3.3 Player and controls
- 16x24 pixel character generated in code (skin, hoodie, jeans), scaled 2x, with a 2-frame walk bob via tween. No spritesheet needed.
- **Desktop:** WASD/arrows to move. **E or Space** at a door opens the ActionMenu. **1/2** or a click picks an action. **Esc** closes the menu.
- **Tap/click-to-move (all devices, the only control mobile needs):**
  - Tap the street: the player walks toward that point (arcade velocity toward target, stops within 4px or on collision).
  - Tap a building or its door: the player walks to the door, then the ActionMenu opens automatically.
  - No virtual joystick.
- ActionMenu options are large buttons (at least 64 logical px tall) with a visible Close (X). Pointer input only, no hover-dependent UI.
- The door prompt reads "Press E / tap to enter Office" on desktop and "Tap to enter Office" on touch devices (detect with `this.sys.game.device.input.touch`).

### 3.4 Day loop
- State starts at `money 20, energy 60, happiness 50`, `actions []`.
- Each action:
  - applies the rules (3.5);
  - shows floating deltas ("+$60", "-30 energy");
  - advances time **Morning → Afternoon → Evening** (screen tint overlay deepens each step);
  - lights one of 3 HUD pips.
- After the 3rd action: fade to ResultScene with `{ actions, finalState, score }`.
- Repeats are allowed (e.g., work 3 times).
- ResultScene shows:
  - each action with its deltas;
  - final stats;
  - the score formula breakdown;
  - the "Balanced day +50" bonus if earned;
  - buttons **Play again** and **Record on Solana** (the second is handled by ChainPanel through `bus.emit('day-complete', {actions, score})`).

### 3.5 Rules (single source of truth: implemented identically in `game/rules.js` and `lib.rs`)
Integer math. After **every** action, clamp `energy` and `happiness` to [0,100]. Money never goes negative (the affordability checks guarantee it).

| id | Location (id/2) | Name | If condition | Effect | Else |
|---|---|---|---|---|---|
| 0 | Apartment | Nap | always | E+40, H+5 | — |
| 1 | Apartment | Cook at home | M>=5 | M-5, E+10, H+10 | H-5 |
| 2 | Office | Work a shift | E>=30 | M+60, E-30, H-10 | M+25, E-20, H-20 |
| 3 | Office | Pull a double | E>=50 | M+100, E-50, H-25 | M+40, E-40, H-30 |
| 4 | Joe's Pizza | Grab a slice | M>=15 | M-15, E+15, H+20 | H-10 |
| 5 | Joe's Pizza | Hang with friends | M>=10 | M-10, H+30, E-10 | H+10, E-10 |

`score = money + energy + 2*happiness + (all 3 locations visited ? 50 : 0)`. Any id > 5 is invalid.

**Test vectors** (must pass in `rules.test.mjs` AND in the Playground on-chain test):

| actions | final M/E/H | score |
|---|---|---|
| [2,4,0] | 65/85/65 | **330** |
| [3,3,3] | 200/0/0 | **200** |
| [0,0,0] | 20/100/65 | **250** |
| [5,5,5] | 0/30/100 | **230** |
| [1,2,5] | 65/30/80 | **305** |

### 3.6 Art approach
- Every texture is drawn with `Phaser.GameObjects.Graphics` in `textures.js` and baked with `generateTexture(key, w, h)` in BootScene.
- No downloaded images, fonts, or audio.
- `pixelArt: true` for crisp scaling.
- Palette (CSS vars in `globals.css`, mirrored as hex constants in `config.js`):
  - night navy `#1b1f3b`
  - asphalt `#3a3d4a`
  - sidewalk `#a9adb8`
  - brick `#b5523b`
  - taxi yellow `#f7c948`
  - glass blue `#4aa3df`
  - awning red `#e63946`
  - cream `#f1e3c6`
  - UI white `#f8f8f2`
- Phaser text uses `monospace` with a 2px dark stroke. Panels are rounded rectangles at 85% opacity.
- Polish ("juice", Stage 8): door glow pulse, a squash tween on action, floating delta text, a fade between scenes, and short WebAudio-generated beeps (oscillator, no files).

### 3.7 Explicitly out of scope
NPC dialogue, inventory, character creator, multiple days in one session (each run is one day; days accumulate on-chain), saving, virtual joystick, portrait-mode game layout, PWA/installable app, native app, 3D, multiplayer, leaderboards, NFTs/tokens.

---

## 4. Solana: Anchor program and front-end integration

### 4.1 Why this counts as "meaningful"
- The **client never sends a score**. It sends only the 3 action ids.
- The program re-runs the day's rules on-chain, computes the score, and stores `best_score` and `days_completed` in a per-player PDA.
- So the on-chain record is the authority. A tampered client cannot fake a high score, only a real sequence of choices.
- The UI shows the local score next to the **on-chain verified score** and links both the transaction and the player's account on Solana Explorer.

### 4.2 Program design (`program/lib.rs`, program name `nyc_life`)

**Account `PlayerStats`** (`#[account] #[derive(InitSpace)]`):

| field | type |
|---|---|
| authority | Pubkey |
| best_score | u32 |
| days_completed | u32 |
| last_score | u32 |
| last_actions | [u8; 3] |
| last_played | i64 (unix timestamp) |
| bump | u8 |

- Size: 8 (discriminator) + 32 + 4 + 4 + 4 + 3 + 8 + 1 = **64 bytes**. Use `space = 8 + PlayerStats::INIT_SPACE`.
- **PDA seeds:** `[b"player", authority.key().as_ref()]`.

**Instruction `init_player()`** (accounts in this order):
1. `player_stats`: `init, payer = authority, space, seeds, bump`
2. `authority`: `Signer`, mut
3. `system_program`

It sets `authority` and `bump = ctx.bumps.player_stats`.

**Instruction `submit_day(actions: [u8; 3])`** (accounts in this order):
1. `player_stats`: `mut, seeds, bump = player_stats.bump, has_one = authority`
2. `authority`: `Signer`

Logic:
1. Require every action <= 5, else `NycError::InvalidAction`.
2. Run the 3.5 rules in `i32` with clamps.
3. Set `score: u32`.
4. `days_completed = days_completed.checked_add(1)`.
5. Set `last_score`, `last_actions`, `last_played = Clock::get()?.unix_timestamp`.
6. If `score > best_score`, update `best_score`.
7. `emit!` the event.

**Event `DayCompleted`:** `{ player: Pubkey, day_number: u32, actions: [u8;3], score: u32, best_score: u32, is_new_best: bool }`

**Error enum `NycError`:** `InvalidAction`, `Overflow`.

Design choices:
- Two instructions instead of `init_if_needed`. That feature requires editing Cargo.toml, which Playground may not expose. **[VERIFY]**
- The front end bundles `init_player` + `submit_day` in one transaction on a player's first day.
- **[VERIFY]** `ctx.bumps.player_stats` needs Anchor >= 0.29. If Playground's Anchor version is older, use `*ctx.bumps.get("player_stats").unwrap()`. Note the Anchor version Playground shows.
- No rate limiting. That is acceptable on Devnet. Mention it under "What's next" on Devpost.

### 4.3 Manual deploy steps (user, in Solana Playground)
1. Open **https://beta.solpg.io**.
2. Bottom-left: click **Not connected** and create a **Playground wallet**. Save the backup file privately. **Never paste it anywhere.**
3. Confirm the cluster is **Devnet** (bottom bar / settings).
4. Terminal: run `solana airdrop 2` and repeat until `solana balance` shows **>= 3 SOL** (program deploy rent is roughly 1.5–2.5 SOL). **[VERIFY]**
   - If the airdrop is rate-limited, use **https://faucet.solana.com** (sign in with GitHub for higher limits) with the Playground wallet address.
5. **Create a new project** named `nyc-life`, framework **Anchor (Rust)**.
6. Replace `src/lib.rs` with the contents of `program/lib.rs` from the repo.
7. Click **Build**. On the first build, Playground fills in `declare_id!` with a new program ID automatically. **[VERIFY]**
8. Click **Deploy** and wait for "Deployment successful". Copy the deploy transaction signature.
9. **Test tab:**
   - Run `initPlayer` (let it auto-derive `playerStats` from seeds `"player"` + your wallet; set authority = your wallet).
   - Run `submitDay` with `actions = [2,4,0]`.
   - Open the `PlayerStats` account. Expect `bestScore 330, daysCompleted 1, lastScore 330`.
   - Run `submitDay [3,3,3]`. Expect `lastScore 200, bestScore 330, daysCompleted 2`.
10. **Build & Deploy tab:** copy the **Program ID**. Click **Export IDL** and save it.

**Hand back to the front end (paste into the Claude Code chat or the files):**
- `NEXT_PUBLIC_PROGRAM_ID=<Program ID>` in `.env.local` **and** in Vercel → Project → Settings → Environment Variables, then redeploy. NEXT_PUBLIC vars are baked in at build time.
- The IDL JSON saved to `solana/idl/nyc_life.json`.
- The Anchor version Playground used, and the deploy transaction signature (for the README and Devpost).

### 4.4 Player wallet setup (user)
1. Install the **Phantom** browser extension and create a wallet (separate from the Playground wallet).
2. Phantom settings → Developer Settings → enable **Testnet mode** and choose **Solana Devnet**. **[VERIFY: menu names change]**
3. Fund it with Devnet SOL from faucet.solana.com. 0.1 SOL is plenty; the PDA rent is about 0.0013 SOL.

**Mobile wallets**

The game itself never needs a wallet. Recording on-chain does.
- **Android Chrome:** the wallet modal lists "Mobile Wallet Adapter", which hands off to the installed Phantom/Solflare app and comes back.
  - **[VERIFY]** Confirm the wallet app is set to Devnet. Confirm the adapter passes the devnet chain (if the tx lands on the wrong cluster, the Explorer link will not find it).
- **iPhone (and as a universal fallback):** there is no extension or MWA. ChainPanel shows an **"Open in Phantom"** button only on mobile when no wallet is detected.
  - It links to `https://phantom.app/ul/browse/${encodeURIComponent(siteUrl)}?ref=${encodeURIComponent(siteUrl)}`, which opens the site inside Phantom's in-app browser, where the wallet is injected and auto-detected. **[VERIFY Phantom universal-link format]**
- Wallet flows need HTTPS, so test mobile on the **Vercel URL**, not localhost.

### 4.5 Front-end transaction (`solana/nycLifeClient.js`, web3.js 1.99, no Anchor client)
- `PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID)`. If it is missing, ChainPanel shows "On-chain disabled" (this is the fallback switch).
- PDA: `PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), wallet.toBytes()], PROGRAM_ID)`.
- Discriminator: the first 8 bytes of `sha256("global:init_player")` / `sha256("global:submit_day")`, computed via `crypto.subtle.digest`. Cross-check them against the `discriminator` arrays in the exported IDL if present.
- `submit_day` data = `disc(8) ++ Uint8Array([a0,a1,a2])`. Borsh encodes `[u8;3]` as 3 raw bytes with no length prefix.
- Account metas follow 4.2 order exactly:
  - init: `[pda w, wallet s+w, SystemProgram.programId]`
  - submit: `[pda w, wallet s]`
- `recordDay(actions)`:
  1. `connection.getAccountInfo(pda)`. If null, add the init ix first.
  2. Add the submit ix.
  3. `const sig = await sendTransaction(tx, connection)` (from `useWallet`).
  4. `getLatestBlockhash` + `confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed')`.
  5. `fetchPlayerStats(pda)`.
- `fetchPlayerStats`: a DataView over the account data, little-endian:
  - offset 8 authority
  - 40 best_score u32
  - 44 days_completed u32
  - 48 last_score u32
  - 52 last_actions [3]
  - 55 last_played i64
  - 63 bump
- ChainPanel states: `disconnected → ready → signing → confirming → verified | error`.
  - Verified: "On-chain score 330 (matches) · Best 330 · Day #3", plus links:
    - `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    - `https://explorer.solana.com/address/${pda}?cluster=devnet`
  - Errors:
    - user rejected: "Cancelled"
    - insufficient funds: "Get Devnet SOL at faucet.solana.com"
    - otherwise: show the program log message
- Nice-to-have (Stage 7, if time): TitleScene shows "Your NYC record: Best X · Days Y", read from the PDA after the wallet connects.

---

## 5. Staged build order

Start time is assumed to be **~9:00 PM Sat**. Shift every clock time by your actual start.

| # | Stage | Who | Definition of done | Verify |
|---|---|---|---|---|
| S0 | Scaffold + first deploy | User + Sonnet | `npx create-next-app@16.4.5 nyc-life` in `C:\dev` with answers: JavaScript, no ESLint (or None), no Tailwind, no `src/`, App Router yes, Turbopack default, alias default **[VERIFY prompts]**. Pinned installs from section 1. Page shows "NYC LIFE". Git repo pushed to **public** GitHub. Vercel project imported. | `npm run dev` → localhost:3000 shows the title. `npm run build` passes. The Vercel URL loads. |
| S1 | Rules + program source | Sonnet | `game/rules.js`, `game/rules.test.mjs` (5 vectors), `program/lib.rs` per 4.2. | `node --test game/rules.test.mjs` shows all pass. Then **the user starts 4.3 in parallel** while S2–S5 run. |
| S2 | Phaser mount | Sonnet | `ClientRoot` → dynamic `App` (ssr:false) → `GameCanvas` creates the game once and destroys it on unmount. BootScene builds textures; TitleScene renders the title + "Press ENTER". | No `window is not defined` error. **Exactly one `<canvas>`** in DevTools after refresh (StrictMode safe). `npm run build` passes. |
| S3 | City map + movement | Sonnet | CityScene draws the map from 3.2. The player moves with WASD/arrows **and tap/click-to-move**, collides with buildings, and has door zones with prompt text. Tapping a building walks to its door. | The player cannot walk through buildings. The prompt appears only at each of the 3 doors. DevTools device mode (iPhone 14 landscape): tapping works and the canvas fits with no scroll. |
| S4 | Day loop + HUD | Sonnet | ActionMenu (2 big touch buttons per location + Close), HUD bars, floating deltas, time-of-day tint, 3 pips. The 3rd action transitions to ResultScene. | Play [Work, Slice, Nap] → HUD ends at M65/E85/H65, both with the keyboard and with mouse taps only. |
| S5 | Results | Sonnet | ResultScene breakdown + score, Play again, emits `day-complete` on the bus. | [2,4,0] shows **330**. [0,0,0] shows **250** with no bonus line. Play again resets the state. **Push + Vercel deploy = FALLBACK-READY BUILD.** |
| S6 | Wallet connect | Sonnet | SolanaProviders (devnet, `wallets=[]`), ChainPanel with WalletMultiButton, address + SOL balance shown. The mobile "Open in Phantom" button from 4.4. | Desktop: Phantom (Devnet) connects, the balance shows, disconnect works, the game is still playable. Phone (Vercel URL): the Open-in-Phantom link loads the site inside Phantom and connects. |
| S7 | Record day on-chain | Sonnet + user (Program ID) | `nycLifeClient.js` + ChainPanel flow per 4.5. | The first record (init+submit) confirms. The Explorer tx shows **Success** with a `DayCompleted` log. The verified score equals the local score. A second day increments `days_completed`. |
| S8 | Website + polish (UI/UX) | Sonnet | Site sections from 3.2b (Hero, HowItWorks, Footer), RotateHint, juice items from 3.6, an onboarding hint line, ChainPanel spinner/error copy, favicon, page title, and OG meta (title/description) so the link previews nicely. | Layout checks at 360x800 portrait (site OK, rotate hint over the game), 844x390 landscape (game playable), 1280x720, and 1920x1080, with no horizontal scroll. A cold play-through **on a real phone and a PC** by someone who has not seen it, with no explanation needed. No console errors. |
| S9 | Docs | Sonnet | README: pitch, screenshot, architecture diagram (text), rules table, program ID + Explorer links, run instructions, "built with". Devpost text draft. | The README renders on GitHub. The links work. |
| S10 | **STRETCH: ElevenLabs** | Sonnet | `app/api/voice/route.js`: POST `{text}` → `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}` with header `xi-api-key: process.env.ELEVENLABS_API_KEY`, returns audio/mpeg. One voiced line per location entry ("Ayo, you here for a slice?"). It fails silently if the key is missing. **[VERIFY model id and voice id in the ElevenLabs docs]** | The line plays locally and on Vercel (key set as a server env var with **no** NEXT_PUBLIC prefix). Only start S10 if S0–S9 are done before 8:30 AM. |

### Fallback rule (hard gates, enforced by the clock)
- **Gate A, 1:30 AM:** if the program is not deployed **and** the 4.3 step-9 test values do not match, **drop Solana**:
  - leave `NEXT_PUBLIC_PROGRAM_ID` unset (ChainPanel shows "On-chain coming soon" or is hidden);
  - go to S8;
  - drop the Solana track from Devpost.
- **Gate B, 3:30 AM:** if S7 has not confirmed a real Devnet transaction, stop and sleep. Allow **one** 45-minute retry at 8:00–8:45 AM. If it still fails at 8:45, drop Solana as in Gate A. No exceptions.
- The S5 deploy must exist before any Solana work counts. It is always the build you would submit.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| `npm i phaser` installs v4, or `@solana/web3.js` installs v3 | Always use the exact pins in section 1. Check `npm ls phaser @solana/web3.js`. |
| Project inside OneDrive → EBUSY/locks | Build in `C:\dev\nyc-life`. |
| SSR crash (`window`), double Phaser game in dev | Whole app loaded with `dynamic(..., {ssr:false})`. useEffect cleanup calls `game.destroy(true)`. Verified in S2. |
| Devnet faucet rate limits block the deploy | Start 4.3 right after S1 (~10 PM), with time to retry. Use faucet.solana.com + GitHub login. |
| Playground Anchor version differences (bumps API, IDL format, Test UI) | Hand-built instructions (no IDL dependence). Note the version. See the bumps fallback in 4.2. |
| JS rules and Rust rules drift | The same 5 test vectors are checked in node and in the Playground Test tab. The UI shows a "matches" check against the on-chain score. |
| Account decode offsets wrong | Fixed 64-byte layout in 4.5. S7 verify compares against the Playground account view. |
| Phantom not on Devnet / no SOL | Section 4.4 checklist. The error message links the faucet. |
| Vercel build missing the program ID | Set the env var in Vercel, then **redeploy** (build-time inlining). |
| Public Devnet RPC 429s | Retry once. Optionally use a free Helius/QuickNode Devnet URL via `NEXT_PUBLIC_RPC_URL`. |
| Claude Pro usage cap mid-build | One stage per session, `/clear` between stages, paste exact error text instead of asking for a rewrite. The S5 checkpoint means a cap never leaves you with nothing. |
| Scope creep | Section 3.7 list. S10 only after S9. |
| Unreadable or tiny on phones | Landscape-only game + RotateHint, text at least 22 logical px, touch targets at least 64 px. Site text in CSS. Check on a real phone in S3/S8. |
| Mobile wallet friction (iOS has no extension or MWA; Android MWA cluster handling) | The game never needs a wallet. "Open in Phantom" deep link. Record the demo's on-chain part on desktop. Mobile on-chain is a bonus, not a gate. |
| Fullscreen API missing on iPhone | The button is hidden when unsupported. The layout does not depend on it. |
| Eligibility (age of majority on Devpost; freshman status) | Confirm with contact@ubhacking.com / Discord @Organizer tonight. |

---

## 7. Claude token usage estimate (Sonnet in Claude Code)

Units are thousands of total tokens processed per stage (input including cached context re-reads, plus output). Output is typically about 10–15% of the total.

| Stage | Low | Likely | High |
|---|---|---|---|
| S0 scaffold | 40 | 80 | 150 |
| S1 rules + lib.rs | 40 | 70 | 120 |
| S2 Phaser mount | 60 | 100 | 180 |
| S3 map + movement (+ tap-to-move) | 90 | 170 | 280 |
| S4 day loop + HUD | 80 | 140 | 250 |
| S5 results | 40 | 70 | 120 |
| S6 wallet connect (+ mobile link) | 50 | 90 | 170 |
| S7 on-chain record | 60 | 100 | 200 |
| S8 website + polish + responsive | 80 | 150 | 270 |
| S9 docs | 30 | 50 | 80 |
| **Total (S0–S9)** | **~570k** | **~1.02M** | **~1.82M** |
| S10 stretch | +50 | +90 | +160 |

Assumptions:
- Each stage runs in a fresh session that reads PLAN.md plus only the files it touches.
- 1–3 fix iterations per stage. The high column assumes 4+ debug loops in S3/S4/S7.
- Most input tokens are cached re-reads, which count against limits at a discount.
- Anthropic does not publish fixed Pro quotas, so treat these as relative. The likely total may hit one 5-hour window cap. The plan's checkpoints are built to survive that.
- Biggest overrun risks: S7 debugging and large file rewrites. Forbid both.

---

## 8. Timeline for tonight (assumes 9:00 PM start)

| Time | Work |
|---|---|
| 9:00–9:40 PM | S0 (incl. GitHub + Vercel). Confirm eligibility via Discord. |
| 9:40–10:10 | S1. Then the **user does 4.3 (Playground deploy) + 4.4 (Phantom)** in the gaps while Sonnet works. |
| 10:10–10:40 | S2 |
| 10:40–11:40 | S3 |
| 11:40 PM–12:40 AM | S4 |
| 12:40–1:10 AM | S5 → deploy the fallback-ready build |
| **1:30 AM** | **Gate A** |
| 1:30–1:50 | S6 |
| 1:50–3:20 | S7 |
| **3:30 AM** | **Gate B**. Sleep 3:30–7:30 (do not skip). |
| 7:30–8:00 | Smoke test on Vercel, on a PC **and a phone**. (8:00–8:45 is the Gate B retry if needed.) |
| 8:00–9:30 | S8 website + polish + responsive → deploy → re-test on the phone |
| 9:30–9:50 | S9 README + Devpost text |
| 9:50–10:40 | Record and upload the demo video |
| 10:40–11:10 | Fill in Devpost and submit |
| **11:10–11:30** | Buffer. **Do not start new features after 9:30 AM.** |

---

## 9. Submission checklist

**GitHub (public repo)**
- [ ] README with pitch, screenshot/GIF, live Vercel link, Program ID, Explorer links (program + a sample tx), rules table, architecture, and how to run locally.
- [ ] `program/lib.rs` and `solana/idl/nyc_life.json` committed. No `.env.local`, no keypairs (check `.gitignore`).

**Live build**
- [ ] Vercel production URL works in an incognito window with a fresh Phantom on Devnet.
- [ ] `NEXT_PUBLIC_PROGRAM_ID` is set in Vercel.
- [ ] Full day playable on a real phone (landscape, tap controls) and on a PC (keyboard + mouse). The rotate hint shows in portrait.
- [ ] The video includes a 5–10 second clip of the game running on a phone (screen record), to support the UI/UX claim.

**Demo video (< 3:00; judges watch only the first 3 minutes)**. YouTube unlisted, recorded with Win+Alt+R (Xbox Game Bar) or OBS at 1080p.
- 0:00–0:15 Hook: "One day in NYC. Every choice is verified on Solana."
- 0:15–1:20 Play a full day: walk, enter 3 places, show the stats changing.
- 1:20–2:10 Results → Record on Solana → Phantom approve → "On-chain score matches" → open Explorer tx + account (best score, days).
- 2:10–2:45 How it works: the client sends actions only, the program computes the score, the PDA stores the record. Stack: Next.js + Phaser 3 + Anchor.
- 2:45–2:55 What's next.

**Devpost**
- [ ] Title, tagline, and story (Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next).
- [ ] "Built with": nextjs, phaser, javascript, solana, anchor, rust, vercel. Add elevenlabs only if S10 shipped.
- [ ] Links: GitHub, Vercel, video, Explorer program page.
- [ ] Screenshots: city, action menu, results, Explorer tx.
- [ ] Prize tracks selected: **Best Use of Solana** (only if S7 passed), **Best Freshman**, **Best UI/UX**.
- [ ] Note what works and what doesn't (Devpost requires it).
- [ ] **Submitted by 11:15 AM.** Confirmation email received.
