"use client";
/**
 * Paint the Picture (colours, listening): one part of the picture glows,
 * Luna says a colour, the child dips the brush in that paint pot and the
 * part fills in. A rainbow at Rainbow Falls, a butterfly at Paint Cove.
 */
import { m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { Pips, SpeakerButton, cheer, distractors, hearWord, nudge, shuffle, useRounds, useTracker, wait, type GameProps } from "./shared";

const hex = (id: string) => WORDS[id]?.pic.replace("color:", "") ?? "#ccc";

/** Paintable regions, in painting order. */
const BUTTERFLY = [
  { d: "M100 70 C 70 20, 20 20, 30 60 C 36 84, 80 86, 100 74 Z" },
  { d: "M100 70 C 130 20, 180 20, 170 60 C 164 84, 120 86, 100 74 Z" },
  { d: "M100 78 C 78 92, 40 104, 56 126 C 70 140, 94 112, 100 84 Z" },
  { d: "M100 78 C 122 92, 160 104, 144 126 C 130 140, 106 112, 100 84 Z" },
  { d: "M94 46 C 94 38, 106 38, 106 46 L 106 116 C 106 126, 94 126, 94 116 Z" },
  { d: "M52 52 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M132 52 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" },
];

function rainbowArc(i: number) {
  const r = 86 - i * 12;
  return { d: `M ${100 - r} 120 A ${r} ${r} 0 0 1 ${100 + r} 120` };
}

export function PaintPicture({ activity, chapter, onDone }: GameProps) {
  const colors = useMemo(() => activity.words.filter((id) => WORDS[id]?.theme === "colors"), [activity.words]);
  const rounds = useMemo(() => shuffle(colors).slice(0, 6), [colors]);
  const butterfly = chapter.id === "paint-cove";
  const regions = butterfly ? BUTTERFLY.slice(0, rounds.length) : rounds.map((_, i) => rainbowArc(i));

  const tracker = useTracker();
  const qa = useDebug();
  const reduce = useReducedMotion();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const [painted, setPainted] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const busy = useRef(false);
  const roundRef = useRef(round);
  roundRef.current = round;
  const target = rounds[round];

  const pots = useMemo(() => (target ? shuffle([target, ...distractors(target, colors, 2)]) : []), [target, colors]);

  useEffect(() => {
    if (!target) return;
    setReveal(false);
    busy.current = false;
    if (round === 0) void lunaSay(L.paintIntro()).then(() => hearWord(target));
    else {
      const t = setTimeout(() => void hearWord(target), 400);
      return () => clearTimeout(t);
    }
  }, [target, round]);

  const dip = async (id: string, el: HTMLElement) => {
    const mine = round;
    if (busy.current || !target || roundRef.current !== mine) return;
    if (id === target) {
      busy.current = true;
      setPainted((p) => [...p, id]);
      cheer(el, id);
      tracker.finish(target, { shown: reveal });
      void hearWord(target);
      await wait(1100);
      if (mine === rounds.length - 1) await lunaSay(L.paintDone());
      advance(mine);
      return;
    }
    setWiggle(id);
    setTimeout(() => setWiggle(null), 500);
    const misses = tracker.miss(target);
    nudge(target, misses, misses === 1 ? L.tryAgainWord(WORDS[target]) : undefined);
    if (misses >= 2) setReveal(true);
    await wait(900);
    if (roundRef.current === mine) void hearWord(target);
  };

  if (!target) return null;

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <Pips done={round} total={rounds.length} />
      <svg viewBox={butterfly ? "0 0 200 140" : "0 0 200 130"} className="w-full max-w-md" aria-hidden>
        {regions.map((r, i) => {
          const color = painted[i] ? hex(painted[i]) : undefined;
          const active = i === round && !painted[i];
          return (
            <motion.path
              key={i}
              d={r.d}
              fill={butterfly ? color ?? "#ffffff18" : "none"}
              stroke={butterfly ? "#1D1F45" : color ?? "#ffffff22"}
              strokeWidth={butterfly ? 2.5 : 10}
              strokeLinecap="round"
              initial={false}
              animate={
                active && !reduce
                  ? { opacity: [0.45, 1, 0.45], strokeDasharray: butterfly ? "4 4" : "6 6" }
                  : { opacity: 1, strokeDasharray: "0 0", scale: color ? [1, 1.04, 1] : 1 }
              }
              transition={active ? { duration: 1.4, repeat: Infinity } : { duration: 0.4 }}
              style={{ transformOrigin: "100px 80px" }}
            />
          );
        })}
        {!butterfly && <path d="M10 122 H190" stroke="#7FE3C4" strokeWidth="4" strokeLinecap="round" opacity="0.5" />}
      </svg>
      <div className="flex items-center gap-3">
        <SpeakerButton onClick={() => void hearWord(target)} />
        <span className="text-lg text-cream/90">באיזה צבע לצבוע?</span>
      </div>
      <div className="flex gap-4" dir="ltr">
        {pots.map((id) => (
          <motion.button
            key={`${round}-${id}`}
            type="button"
            aria-label={WORDS[id].he}
            data-qa={qa ? (id === target ? "answer" : "wrong") : undefined}
            onClick={(e) => dip(id, e.currentTarget)}
            whileTap={{ scale: 0.88 }}
            animate={{ x: wiggle === id ? [0, -10, 10, -6, 6, 0] : 0, scale: reveal && id === target ? [1, 1.12, 1] : 1 }}
            transition={reveal && id === target ? { duration: 0.8, repeat: Infinity } : { duration: 0.4 }}
            className="relative grid h-24 w-20 place-items-end pb-2"
          >
            <svg viewBox="0 0 60 70" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d="M8 22 h44 l-5 40 a6 6 0 0 1 -6 5 H19 a6 6 0 0 1 -6 -5 Z" fill="#e8e1ff" stroke="#1D1F45" strokeWidth="3" />
              <ellipse cx="30" cy="22" rx="22" ry="7" fill={hex(id)} stroke="#1D1F45" strokeWidth="3" />
              <path d="M44 24 q4 10 -2 16" stroke={hex(id)} strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>
            {reveal && id === target && <span className="absolute -inset-1 rounded-3xl ring-4 ring-gold" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
