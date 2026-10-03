"use client";
/** Bubble Pop (listening): hear a word, pop the bubble with the right picture. */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { Picture } from "../Picture";
import { En } from "../En";
import { Pips, SpeakerButton, cheer, distractors, hearWord, nudge, shuffle, useTracker, wait, type GameProps, useRounds } from "./shared";
import { Emoji } from "@/components/Emoji";

const SPOTS = [
  { x: 27, y: 24 },
  { x: 73, y: 20 },
  { x: 30, y: 70 },
  { x: 72, y: 64 },
];

export function BubblePop({ activity, onDone }: GameProps) {
  const rounds = useMemo(() => shuffle(activity.words).slice(0, 5), [activity.words]);
  const [popped, setPopped] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const busy = useRef(false);
  const tracker = useTracker();
  // Debug mode marks the answer so automated QA can play correctly.
  const qa = useDebug();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const reduce = useReducedMotion();
  // Bubbles from a finished round stay on screen while they animate out;
  // their taps (and any delayed follow-ups) must not touch the new round.
  const roundRef = useRef(round);
  roundRef.current = round;

  const target = rounds[round];
  const choices = useMemo(() => {
    if (!target) return [];
    const n = activity.words.length >= 4 ? 3 : 2;
    return shuffle([target, ...distractors(target, activity.words, n)]);
  }, [target, activity.words]);

  const prompt = useCallback(() => {
    if (target) void hearWord(target);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    setPopped(null);
    setReveal(false);
    busy.current = false;
    const t = setTimeout(prompt, 450);
    return () => clearTimeout(t);
  }, [target, prompt]);

  const next = async () => {
    await wait(900);
    advance(round);
  };

  const tap = async (id: string, el: HTMLElement) => {
    const mine = round;
    const stale = () => roundRef.current !== mine;
    if (stale() || busy.current || !target) return;
    if (id === target) {
      busy.current = true;
      setPopped(id);
      cheer(el, id);
      tracker.finish(target, { shown: reveal });
      await next();
      return;
    }
    setWiggle(id);
    setTimeout(() => setWiggle(null), 500);
    const misses = tracker.miss(target);
    const w = WORDS[target];
    if (misses === 1) {
      nudge(target, misses);
      await lunaSay(L.tryAgainWord(w));
      if (!stale()) void hearWord(target);
    } else {
      busy.current = true;
      nudge(target, misses);
      setReveal(true);
      await lunaSay(L.hereItIs(w));
      await wait(600);
      if (stale()) return;
      setPopped(target);
      tracker.finish(target, { shown: true });
      await next();
    }
  };

  if (!target) return null;

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <Pips done={round} total={rounds.length} />
      <div className="flex items-center gap-3">
        <SpeakerButton onClick={prompt} />
        <span className="text-lg text-cream/90">מה שמעתם? פוצצו את הבועה!</span>
      </div>
      <div className="relative w-full max-w-xl flex-1" style={{ minHeight: 340 }}>
        <AnimatePresence>
          {choices.map((id, i) => {
            const spot = SPOTS[i % SPOTS.length];
            const isTarget = id === target;
            return popped === id ? (
              <motion.div
                key={`${round}-${id}-pop`}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl"
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <Emoji e="✨" />
              </motion.div>
            ) : (
              <motion.button
                key={`${round}-${id}`}
                type="button"
                aria-label={WORDS[id].he}
                data-qa={qa ? (id === target ? "answer" : "wrong") : undefined}
                onClick={(e) => tap(id, e.currentTarget)}
                className="absolute grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full sm:h-36 sm:w-36"
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  background: "radial-gradient(circle at 30% 30%, #ffffffcc, #ffffff22 40%, #7FE3C433 70%, #B9A7F555)",
                  border: "3px solid #ffffff99",
                  boxShadow: reveal && isTarget ? "0 0 40px 10px #FFC53D" : "inset -8px -10px 20px #B9A7F555",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: reveal && isTarget ? 1.15 : 1,
                  opacity: 1,
                  y: reduce ? 0 : [0, -12, 0],
                  x: wiggle === id ? [0, -10, 10, -6, 6, 0] : 0,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  scale: { type: "spring", stiffness: 300, damping: 14, delay: i * 0.08 },
                  y: { duration: 3 + i * 0.6, repeat: Infinity, ease: "easeInOut" },
                  x: { duration: 0.4 },
                }}
                whileTap={{ scale: 0.9 }}
              >
                <Picture pic={WORDS[id].pic} size={70} />
                {reveal && isTarget && (
                  <span className="absolute -bottom-8 rounded-full bg-cream px-3 text-xl font-bold text-night-deep">
                    <En>{WORDS[id].en}</En>
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
