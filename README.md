# כוכבים · Kochavim English

A web app (installable PWA) that takes a Hebrew-speaking 8-year-old from zero to confident spoken and read English through 10-minute daily play sessions. Every star she earns goes into a world she owns.

This repository is the **Prototype phase** from the design spec: Island 1 (Sound Shore), Luna the fox, the star jar and earning. It also includes some Alpha items: the camp shop, pets and the parent dashboard. The whole experience is built as an **adventure game**.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests: ledger, scheduler, missions, speech matching, streak
npm run lint       # type-check
npm run build
npm run test:e2e   # Playwright end-to-end suite (phone + tablet); see docs/QA.md
```

## How it plays as an adventure

The core promise is *"every word you learn makes your world bigger."* In this build that promise is literal: English is the magic that restores the island.

- **An explorable island.** Sound Shore is a map with 8 places along a winding path that runs right to left in Hebrew mode. The child's explorer walks between places with her gear and pet companion. Places she hasn't reached are hidden in fog.
- **Each place is a quest with a problem.** At Rainbow Falls the waterfall has lost its colours. At Counting Rocks the stepping stones have sunk. At Echo Cave the echo has forgotten its sounds. At the lighthouse the light has gone out and Dolly the dolphin is lost. Luna tells the problem in Hebrew, then in English.
- **The words do the fixing.** In the story moment, each new word is heard, then said, then read. The word then flies into the scene and brings part of the place back: grey becomes colour.
- **Challenges are quest steps.** Each mission is three challenge stones (warm-up, new words, practice), shown as a path. Each game has a story line: pop the colour bubbles to refill the rainbow, hook sound carriages onto the shell train, sort letters with the detective's magnifying glass.
- **Rewards from the world.** Restoring a place gives a treasure for the Explorer's Backpack. The golden path unrolls to the next place and the fog lifts. Finishing the island gives the trophy, +50 stars and a fireworks finale.
- **The sea chart.** All six islands from the curriculum appear, each with its friend (owl, bear, bunny baker, cat, unicorn). Islands 2–6 wait under fog for later releases.
- **Explorer's Camp.** Stars buy gear the explorer wears on the map, camp builds (up to a castle), pets that follow her on the adventure and learn spoken English tricks, and the parent's real-world wishes.

## What's in this build (mapped to the spec)

| Spec area | Implemented |
|---|---|
| Session flow | Welcome on the map (Luna greets her by name and names today's quest) → warm-up with due review words → story moment with 4–6 new words → practice → star moment (spend, or keep exploring) |
| Game types | Bubble Pop, Say It to Luna, Sound Train (first sound + c-a-b blending), Memory Garden, b/d Detective, plus the story moment |
| Feedback rules | No red X and no buzzer. A wrong answer makes the item wiggle and Luna gives a Hebrew hint. The second miss shows the answer and schedules the word for early review. Speaking gets 3 lenient tries, then "Great try!". The last activity of each mission ends with a celebration sized 1–3 |
| Spaced repetition | SM-2-style scheduler tuned for kids (`src/lib/srs.ts`). Only the first result of the day counts. Words go grey → silver → gold, and gold earns +2 |
| Star economy | Append-only ledger with idempotency keys, earning-table validation, a 60/day cap and price validation (`src/lib/ledger.ts`). Covers the mission bonus, a streak with a weekly snow day, the island bonus, the weekly speaking challenge and parent bonus stars. Level 1–50 comes from lifetime stars, so spending never lowers it |
| Spending | Gear (shown on the avatar), camp items (shown in the camp scene), pets (feeding for 2⭐ keeps them happy for 2 days; they never die, they just get sleepy; tricks by voice), real-world rewards with parent approval or refund, and saving goals shown in the jar |
| Progression | Word Book (Explorer's Journal), treasure backpack, trophy shelf, level ribbon. Comparisons are only with her own past |
| RTL / LTR | The Hebrew UI is `dir="rtl"`. Every English word is its own `dir="ltr"` element in Andika. The reading-finger sparkle runs left to right. Maps and progress run right to left |
| Characters and motion | Luna is an SVG state machine (idle, listening, happy, thinking, hint, celebrate) driven by the typed event bus. She looks toward taps. Stars fly to the jar on an arc with rising chimes. Buttons use spring squash. `prefers-reduced-motion` is respected |
| Guardrails | Daily time limit (default 15 min) and allowed hours, ending in a calm goodnight scene. No timers, no FOMO offers, no leaderboards, no notifications to the child |
| Parent area | Gate (a math question plus PIN). Progress (mastery, sounds, minutes per day, island progress, speaking scores only), time settings, rewards editor and approvals, bonus stars, up to 4 child profiles, data export and delete |
| PWA | Manifest plus a service worker that caches the app shell for offline play |

## Prototype stand-ins

These are stand-ins for the full production stack in the spec. Each sits behind a small interface so it can be swapped out.

- **Persistence.** State lives on the device in `localStorage` (`src/lib/store.ts`). All star movement already goes through the pure ledger module, which is the validation a server route would run. The next step is to put it behind `/api/ledger` with Neon Postgres + Drizzle and Upstash for daily caps. That step is what makes the ledger truly server-authoritative.
- **Voice.** Neural text-to-speech stands in for the voice-actor recordings (see [Voice](#voice)).
- **Speech recognition.** The browser Web Speech API, which is the spec's fallback. Matching is lenient for Hebrew-accented child speech (`src/lib/speech-match.ts`). If no recogniser or microphone is available, the mic becomes an "I said it!" button. Self-reports don't earn the +1 speaking star.
- **Art and motion.** Luna and the map are hand-drawn SVG animated with Motion. Pictures use Fluent 3D emoji art (see [Pictures](#pictures)). This replaces Rive, PixiJS, GSAP and dotLottie for now. SFX are synthesised with Web Audio.

## Not yet built

- Islands 2–6
- Letter Trace, Dress Up Doll, Snack Shop, Story Time and Sing Along
- Fun Zone, gifts and friends, badges
- Parent accounts (Auth.js/Clerk)
- First-party learning events (beyond Vercel's page-view analytics)
- The weekly email summary

## Debug mode

For testing every stage and level without playing through:

- **Turn it on** with `?debug=1` in the URL (asks for the parent gate first, then is remembered on that device), or in the parent area under **משפחה → מצב מפתחים**. Turn it off with `?debug=0` or from the panel.
- **While on**, every stage on the map is unlocked, the daily time limit and bedtime are ignored, and quests show a **⏭ skip** button that completes the current step perfectly.
- **The 🐞 panel** (bottom-left) offers:
  - **Stages**: for every stage, play the full quest as a first visit (with the story) or a revisit, or jump straight into any single game that stage supports. You can also mark a whole island restored or reset it. Islands 2–6 are listed as not built yet.
  - **Levels & stars**: reach any level 1–50 (adds exactly the stars needed), preview the level-up animation, or add stars.
  - **Screens & effects**: island map, sea chart, camp, journal, parent area, onboarding, both goodnight screens, and the three celebration sizes and star flight.
  - **Profile**: create a test explorer, or reset the current profile.

Debug actions change the active profile. Stars they add are labelled `debug` in the ledger, but it's best to use a test explorer.

## Voice

Luna's voice is pre-recorded with natural neural voices and shipped as small MP3s in `public/voice/` (~2 MB). Playback needs no API key and costs nothing, and the files are cached for offline play. The app plays, best first:

1. **The voice pack.** A recording of every line in the catalog (`src/lib/lines.ts`), every word, item name and pet trick, and every letter sound.
2. **Live Azure AI Speech** (`/api/tts`), if `AZURE_SPEECH_KEY` is set, for anything not in the pack.
3. **The device's own voice**, preferring its "Natural"/"Enhanced" voices. This is only a last resort.

| What | Voice |
|---|---|
| Luna in English, model words | Kokoro-82M `af_heart`, a warm adult female voice (Apache-2.0, generated offline) |
| Child model voice in "Say It to Luna" | Kokoro `af_bella` |
| Letter sounds | Kokoro from IPA phonemes, so /bə/ is a sound rather than "bee" |
| Luna in Hebrew | Google Cloud TTS he-IL (Chirp 3 HD, else Neural2/WaveNet), recorded once with `GOOGLE_TTS_API_KEY` |

**Recording the pack**

```bash
npm run voice:setup                         # once: Kokoro weights + voices from npm, Python venv in .cache/voice
npm run voice                               # English (offline); skips Hebrew without a key
GOOGLE_TTS_API_KEY=… npm run voice          # also records the Hebrew lines (~10k characters)
```

`scripts/voice/collect.ts` lists every clip from the same catalog the screens use. `scripts/voice/generate.py` records whatever is missing, checks each clip's length and loudness, trims and normalises it, prunes stale files, and writes `src/lib/voice-pack.ts`.

When you add or change a line, put it in `src/lib/lines.ts` and run `npm run voice`. Tests fail if an English line has no recording, or if a screen passes Luna a literal string.

The child's name appears in captions but is never spoken, so it is never sent to any voice service.

## Pictures

All emoji are drawn with **Microsoft Fluent Emoji 3D** (MIT), taken from the `@lobehub/fluent-emoji-3d` package. They are not left to the device's emoji font, which looks dated and different on every phone.

- `npm run emoji` (`scripts/sync-emoji.mjs`) scans `src/` and copies only the art in use into `public/emoji/` (~120 files, ~800 KB). It also writes the lookup table and the offline pre-cache list.
- `<Emoji>` (`src/components/Emoji.tsx`) renders the art with optional idle motion (float, breathe, wiggle, bounce, spin). Motion is off under `prefers-reduced-motion`. Buttons convert emoji in their labels automatically.
- Re-run `npm run emoji` after adding an emoji to content or UI. A unit test fails if any content emoji has no art.

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) is installed (`@vercel/analytics`; `<Analytics />` is in `src/app/layout.tsx`). It is cookieless and records anonymous page views only, with no third-party ad or tracking SDKs, which fits the spec's privacy rules. The service worker never caches `/_vercel/*`.

To turn it on, open the project in the Vercel dashboard, go to **Analytics**, click **Enable**, and redeploy. Data appears after the next production visit. Locally the component does nothing. In development it only logs page views to the console.

## Layout

```
src/lib/                 pure logic (ledger, srs, mission, streak, speech-match) + store, audio, events
src/lib/content/         Island content packs (words, chapters, quest stories)
src/components/games/    the mini-games
src/components/screens/  map, quest, camp, journal, sea chart, parent area
```
