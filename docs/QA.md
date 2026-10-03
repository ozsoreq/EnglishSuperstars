# QA report — 2026-10-03

Scope: the whole app as built (Island 1 "Sound Shore", camp, journal, sea chart, parent area, debug mode, voice, PWA). Checked on a phone (Pixel 7, 412×915) and a tablet (1024×768) in Chromium.

## Result

| Check | Result |
|---|---|
| Type-check, production build | ✅ clean |
| Unit tests (`npm test`) | ✅ 51 passed |
| End-to-end (`npm run test:e2e`) | ✅ 92 passed, 0 failed (38 skipped by design) |
| React dev-build sweep (`npm run test:e2e:dev`) | ✅ no warnings or errors |
| Dependency audit | ✅ 0 vulnerabilities |
| Secrets in repo | ✅ none |
| Initial JS (spec budget < 200 KB gz) | ✅ 179 KB (was 225 KB) |
| Accessibility (axe) | ✅ no critical/serious issues on any screen |
| Offline (PWA) | ✅ loads with the network off; 124 art files and 237 voice clips cached |

The 38 skipped tests are the stage × game matrix on the phone (it runs on tablet only) and the dev-build sweep, which needs `next dev`.

## What the end-to-end suite covers

- **Every stage × every game.** All 8 Sound Shore stages, each with every game it supports (34 combinations), are played to completion with correct answers. Each earns 3 stars with no page errors.
- **Quest flow.** A perfect first quest gives 3+3+3 activity stars, the +5 mission bonus and +1 streak. The place is restored, the treasure appears, the explorer moves on and the words enter the scheduler.
- **Mistakes.** Answering wrong gives a Hebrew hint, then shows the answer. The child still earns at least 1 star, never 0, and the missed words come back sooner.
- **Locks.** Fogged stages stay locked without debug mode.
- **Star economy.**
  - The daily cap stops at exactly 60.
  - The mission bonus is paid once per day.
  - The streak continues from yesterday with a +N bonus, is saved once a week by a snow day, and resets after a longer gap.
  - Finishing the island pays +50, gives the trophy and marks the island done.
- **Camp.**
  - Not enough stars gives a gentle message, and the child can save toward the item.
  - Gear can be bought, worn and taken off, and is never charged twice.
  - A sleepy pet is fed for 2 stars and learns a trick by voice.
  - A real-world wish holds the stars; if the parent declines, the stars come back.
- **Parent area.**
  - The gate rejects a wrong math answer and a wrong PIN.
  - A first-time PIN must be entered twice.
  - The daily time limit shows the goodnight screen, and "+10 minutes" lifts it.
  - Bedtime works.
  - Bonus stars, the rewards editor, data export and erase all work.
  - A second child gets a separate profile and progress.
  - `?debug=1` needs the parent gate.
- **Quality, on every screen.**
  - No sideways scrolling.
  - The app is right-to-left, and English text is always isolated left-to-right.
  - Touch-target audit.
  - Axe accessibility scan.
  - Reduced-motion play.
  - Offline load.

## Bugs found and fixed

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | High | A bedtime of **00:00** blocked the child all day, because every time is ≥ 00:00. | The quiet window now runs from bedtime to 06:00, including bedtimes after midnight. Unit-tested. |
| 2 | Medium | Anyone could turn on debug mode with `?debug=1` and give themselves stars, then spend them on parent-approved real-world rewards. | `?debug=1` now opens the parent gate first, and the parameter is removed from the URL. |
| 3 | Medium | Initial JS was 225 KB gzipped, over the 200 KB budget. | Screens load on demand. Howler loads with the first clip. Animations use `LazyMotion`, imported from `framer-motion` directly, because the `motion/react` barrel blocked tree-shaking. Now 179 KB. |
| 4 | Medium (a11y) | Journal: 38 "not met yet" tiles had `aria-label` on a plain `div`. | They now have `role="img"`. |
| 5 | Low (a11y) | Pinch-zoom was disabled (`user-scalable=no`). | Zoom is allowed; buttons keep `touch-action: manipulation` so a double-tap doesn't zoom. |
| 6 | Low (a11y) | The app had no `<main>` landmark, and the map had no page heading. | Added both. |
| 7 | Low | The camp's "לחסוך לזה" (save for this) link was 40 px tall, under the 56 px touch-target spec. | Now 56 px. |

## Known issues and notes (not fixed)

- **Hebrew voice.** Hebrew still uses the device's robotic voice until the Hebrew pack is recorded. That needs `GOOGLE_TTS_API_KEY`; see the README's Voice section. English is pre-recorded.
- **Taps during screen transitions.** A tap in the ~¼ s while one screen fades into the next (View Transitions) is ignored. The child just taps again. Accepted; tests retry.
- **Parent lock size.** The lock is 44 px, under the 56 px spec, on purpose so it's less inviting to children.
- **Time limit before 06:00.** Extra minutes lift the evening bedtime, but not the hours between midnight and 06:00.
- **Device-only storage.** Progress is stored on the device. The server-authoritative ledger is the planned next step.
- **Not built yet.** Islands 2–6 and several spec games are out of the prototype's scope.

## How to re-run

```bash
npm run build && npm run test:e2e        # full suite (starts `next start` on :3200)
npm run dev & npm run test:e2e:dev       # React warning sweep against the dev server
```
