"use client";
/**
 * Feed the Dolphin (numbers, listening + counting): Luna says a number in
 * English; the child feeds exactly that many fish into the bucket (tap a fed
 * fish to take it back) and presses done. No digits on screen — the child has
 * to understand the word and count. A second miss counts together out loud.
 */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx, sayWord } from "@/lib/audio";
import { ALL_WORDS, WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { Emoji } from "../Emoji";
import { Btn } from "../Btn";
import { Pips, SpeakerButton, cheer, hearWord, nudge, shuffle, useRounds, useTracker, wait, type GameProps } from "./shared";

const valueOf = (id: string) => Number(WORDS[id]?.pic.replace("num:", "")) || 0;
const wordFor = (n: number) => ALL_WORDS.find((w) => w.pic === `num:${n}`);

export function FeedDolphin({ activity, chapter, onDone }: GameProps) {
  const numbers = useMemo(() => activity.words.filter((id) => WORDS[id]?.theme === "numbers"), [activity.words]);
  const rounds = useMemo(() => shuffle(numbers).slice(0, 4), [numbers]);
  const friend = chapter.id === "starfish-bridge" ? "⭐" : "🐬";

  const tracker = useTracker();
  const qa = useDebug();
  const reduce = useReducedMotion();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const [fed, setFed] = useState(0);
  const [happy, setHappy] = useState(false);
  const busy = useRef(false);
  const roundRef = useRef(round);
  roundRef.current = round;
  const target = rounds[round];
  const n = target ? valueOf(target) : 0;
  const pond = Math.min(10, Math.max(n + 3, 6));

  useEffect(() => {
    if (!target) return;
    setFed(0);
    setHappy(false);
    busy.current = false;
    void lunaSay(L.countAsk(WORDS[target]));
  }, [target]);

  const feed = (delta: 1 | -1) => {
    if (busy.current) return;
    sfx(delta > 0 ? "pop" : "flip");
    setFed((f) => Math.max(0, Math.min(pond, f + delta)));
  };

  const done = async (el: HTMLElement) => {
    const mine = round;
    if (busy.current || !target) return;
    if (fed === n) {
      busy.current = true;
      setHappy(true);
      cheer(el, target);
      tracker.finish(target);
      await lunaSay(L.countYum());
      advance(mine);
      return;
    }
    const misses = tracker.miss(target);
    nudge(target, misses);
    if (misses === 1) {
      await lunaSay(fed < n ? L.countMore() : L.countLess());
      if (roundRef.current === mine) void hearWord(target);
      return;
    }
    // Count together, one fish at a time.
    busy.current = true;
    await lunaSay(L.countTogether());
    setFed(0);
    for (let k = 1; k <= n; k++) {
      if (roundRef.current !== mine) return;
      setFed(k);
      sfx("pop");
      const w = wordFor(k);
      if (w) await sayWord(w.en);
      else await wait(400);
    }
    setHappy(true);
    tracker.finish(target, { shown: true });
    await wait(700);
    advance(mine);
  };

  if (!target) return null;

  return (
    <div className="flex h-full flex-col items-center gap-3" data-qa-count={qa ? n : undefined}>
      <Pips done={round} total={rounds.length} />
      <div className="flex items-center gap-3">
        <SpeakerButton onClick={() => void hearWord(target)} />
        <span className="text-lg text-cream/90">כמה דגים לתת?</span>
      </div>

      {/* The friend and the bucket */}
      <div className="flex items-end gap-4" dir="ltr">
        <motion.span
          className="text-7xl"
          animate={happy && !reduce ? { y: [0, -40, 0], rotate: [0, -20, 0] } : { y: [0, -4, 0] }}
          transition={happy ? { duration: 0.8 } : { duration: 2.5, repeat: Infinity }}
        >
          <Emoji e={friend} />
        </motion.span>
        <div className="chunky flex min-h-24 min-w-56 flex-wrap items-center justify-center gap-1 bg-sea/40 p-2" aria-label="דלי">
          <AnimatePresence>
            {Array.from({ length: fed }, (_, i) => (
              <motion.button
                key={`fed-${i}`}
                type="button"
                aria-label="להחזיר דג"
                onClick={() => feed(-1)}
                initial={{ scale: 0, y: -30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                className="grid h-14 w-14 place-items-center text-4xl"
              >
                <Emoji e="🐟" />
              </motion.button>
            ))}
          </AnimatePresence>
          {fed === 0 && <span className="text-sm text-cream/70">הדלי ריק</span>}
        </div>
      </div>

      {/* The pond */}
      <div className="flex max-w-md flex-wrap justify-center gap-2 rounded-[28px] bg-gradient-to-b from-[#3a8fb5] to-[#2b4f86] p-3" dir="ltr">
        {Array.from({ length: pond - fed }, (_, i) => (
          <motion.button
            key={`pond-${i}`}
            type="button"
            aria-label="דג"
            data-qa={qa ? "fish" : undefined}
            onClick={() => feed(1)}
            whileTap={{ scale: 0.85 }}
            animate={reduce ? {} : { x: [0, i % 2 ? 6 : -6, 0] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity }}
            className="grid h-14 w-14 place-items-center text-4xl"
          >
            <Emoji e="🐟" />
          </motion.button>
        ))}
      </div>

      <Btn tone="gold" className="px-8 text-xl" data-qa={qa ? "done" : undefined} onClick={(e) => void done(e.currentTarget)}>
        ✓ סיימתי
      </Btn>
    </div>
  );
}
