"use client";
/** Bubble Pop (listening): hear a word, pop the bubble with the right picture. */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORDS } from "@/lib/content/words";
import { lunaSay } from "@/lib/luna";
import { Picture } from "../Picture";
import { En } from "../En";
import { Pips, SpeakerButton, cheer, distractors, hearWord, nudge, shuffle, useTracker, wait, type GameProps } from "./shared";

const SPOTS = [
  { x: 27, y: 24 },
  { x: 73, y: 20 },
  { x: 30, y: 70 },
  { x: 72, y: 64 },
];

export function BubblePop({ activity, onDone }: GameProps) {
  const rounds = useMemo(() => shuffle(activity.words).slice(0, 5), [activity.words]);
  const [round, setRound] = useState(0);
  const [popped, setPopped] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const busy = useRef(false);
  const tracker = useTracker();
  const reduce = useReducedMotion();

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
    if (round + 1 >= rounds.length) onDone(tracker.result());
    else setRound((r) => r + 1);
  };

  const tap = async (id: string, el: HTMLElement) => {
    if (busy.current || !target) return;
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
      await lunaSay(`${w.he}! נסו שוב`);
      void hearWord(target);
    } else {
      busy.current = true;
      nudge(target, misses);
      setReveal(true);
      await lunaSay("הנה היא!", w.en);
      await wait(600);
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
                ✨
              </motion.div>
            ) : (
              <motion.button
                key={`${round}-${id}`}
                type="button"
                aria-label={WORDS[id].he}
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
