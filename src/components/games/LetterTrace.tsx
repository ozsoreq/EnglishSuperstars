"use client";
/**
 * Letter Trace (writing): the letter is drawn as faint stroke guides with
 * sparkle dots in stroke order. The child drags a finger (or taps) through
 * the dots in order; the stroke lights up gold behind them. Done letters
 * play their sound and the anchor word ("b — ball").
 */
import { m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { saySound, sayWord, sfx } from "@/lib/audio";
import { ALL_WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { emit } from "@/lib/events";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { En } from "../En";
import { Picture } from "../Picture";
import { Pips, cheer, shuffle, useRounds, useTracker, wait, type GameProps } from "./shared";

type Pt = [number, number];
/** Lowercase letters as strokes (each a list of points, in writing order), in a 100×110 box. */
export const LETTER_STROKES: Record<string, Pt[][]> = {
  a: [[[64, 46], [50, 38], [36, 46], [32, 62], [40, 76], [54, 78], [64, 68]], [[66, 40], [66, 60], [66, 80]]],
  b: [[[34, 12], [34, 46], [34, 80]], [[34, 58], [48, 46], [62, 52], [66, 66], [56, 78], [36, 74]]],
  c: [[[66, 44], [52, 36], [38, 44], [34, 60], [42, 76], [56, 80], [66, 72]]],
  d: [[[64, 50], [50, 40], [36, 48], [34, 66], [46, 78], [62, 72]], [[66, 12], [66, 46], [66, 80]]],
  e: [[[34, 60], [50, 60], [66, 58], [60, 42], [46, 38], [34, 50], [38, 70], [52, 80], [66, 72]]],
  f: [[[66, 18], [54, 12], [44, 22], [44, 50], [44, 80]], [[30, 42], [46, 42], [62, 42]]],
  g: [[[64, 48], [50, 38], [36, 48], [36, 64], [50, 72], [64, 62]], [[66, 40], [66, 66], [64, 88], [50, 98], [34, 90]]],
  h: [[[34, 12], [34, 46], [34, 80]], [[34, 58], [48, 44], [64, 52], [66, 66], [66, 80]]],
  i: [[[50, 42], [50, 62], [50, 80]], [[50, 24]]],
  j: [[[56, 42], [56, 64], [54, 88], [42, 98], [30, 90]], [[56, 24]]],
  k: [[[34, 12], [34, 46], [34, 80]], [[64, 40], [48, 54], [36, 62]], [[46, 56], [56, 68], [66, 80]]],
  l: [[[50, 12], [50, 46], [50, 80]]],
  m: [[[22, 40], [22, 60], [22, 80]], [[22, 52], [34, 40], [46, 50], [48, 80]], [[48, 52], [60, 40], [74, 50], [76, 80]]],
};

const RADIUS = 9;

export function LetterTrace({ activity, chapter, onDone }: GameProps) {
  const letters = useMemo(() => {
    const fromWords = activity.words.map((id) => ALL_WORDS.find((w) => w.id === id)?.letter).filter(Boolean) as string[];
    const pool = (fromWords.length ? fromWords : chapter.letters ?? []).filter((l) => LETTER_STROKES[l]);
    return shuffle([...new Set(pool)]).slice(0, 4);
  }, [activity.words, chapter.letters]);

  const tracker = useTracker();
  const qa = useDebug();
  const reduce = useReducedMotion();
  const { round, advance } = useRounds(letters.length, () => onDone(tracker.result()));
  const letter = letters[round];
  const strokes = letter ? LETTER_STROKES[letter] : [];
  const dots = useMemo(() => strokes.flat(), [strokes]);
  const anchor = ALL_WORDS.find((w) => w.letter === letter);

  const strokeOf = (i: number) => {
    let n = 0;
    for (let s = 0; s < strokes.length; s++) {
      n += strokes[s].length;
      if (i < n) return s;
    }
    return -1;
  };

  const [reached, setReached] = useState(0);
  const [nudgeDot, setNudgeDot] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!letter) return;
    setReached(0);
    finished.current = false;
    if (round === 0) void lunaSay(L.traceIntro()).then(() => saySound(letter));
    else void saySound(letter);
  }, [letter, round]);

  const complete = async () => {
    if (finished.current || !letter) return;
    finished.current = true;
    const mine = round;
    cheer(svg.current, anchor?.id);
    if (anchor) tracker.finish(anchor.id);
    else tracker.finish(letter);
    await saySound(letter);
    if (anchor) await sayWord(anchor.en);
    await wait(500);
    advance(mine);
  };

  const hit = (x: number, y: number) => {
    if (finished.current) return;
    const next = dots[reached];
    if (!next) return;
    const near = (d?: Pt) => Boolean(d) && Math.hypot(d![0] - x, d![1] - y) <= RADIUS * 1.6;
    // A fast finger can pass a dot between pointer events: accept the dot
    // after next when it's on the same stroke.
    const skip = near(dots[reached + 1]) && strokeOf(reached + 1) === strokeOf(reached) ? 2 : 0;
    if (near(next) || skip) {
      const r = reached + (skip || 1);
      setReached(r);
      sfx("chime", r);
      if (r === dots.length) void complete();
      return;
    }
    // Touching a later dot out of order: point at the right one.
    const later = dots.slice(reached + 1).some((d) => Math.hypot(d[0] - x, d[1] - y) <= RADIUS);
    if (later && !nudgeDot) {
      setNudgeDot(true);
      emit("luna.mood", { mood: "hint" });
      void lunaSay(L.traceNext());
      setTimeout(() => setNudgeDot(false), 1500);
    }
  };

  const toSvg = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 110] as const;
  };

  if (!letter) return null;

  // Which dots belong to which stroke, for drawing progress.
  let idx = 0;
  const strokeIdx = strokes.map((s) => s.map(() => idx++));

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <Pips done={round} total={letters.length} />
      <div className="flex items-center gap-3" dir="ltr">
        <En className="text-5xl font-bold text-gold">{letter}</En>
        {anchor && <Picture pic={anchor.pic} size={56} />}
      </div>
      <svg
        ref={svg}
        viewBox="0 0 100 110"
        className="w-[min(78vw,340px)] touch-none select-none rounded-[32px] bg-white/5"
        onPointerDown={(e) => {
          drawing.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          hit(...toSvg(e));
        }}
        onPointerMove={(e) => drawing.current && hit(...toSvg(e))}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
        role="img"
        aria-label={`ציור האות ${letter}`}
      >
        {/* guides */}
        {strokes.map((s, i) => (
          <polyline key={`g${i}`} points={s.map((p) => p.join(",")).join(" ")} fill="none" stroke="#ffffff30" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* progress */}
        {strokes.map((s, i) => {
          const done = s.filter((_, j) => strokeIdx[i][j] < reached);
          return done.length > 1 ? (
            <polyline key={`p${i}`} points={done.map((p) => p.join(",")).join(" ")} fill="none" stroke="#FFC53D" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 3px #FFC53D)" }} />
          ) : null;
        })}
        {/* dots */}
        {dots.map((d, i) => {
          const isNext = i === reached;
          const isStart = strokeIdx.some((s) => s[0] === i);
          return (
            <motion.circle
              key={i}
              cx={d[0]}
              cy={d[1]}
              r={isNext ? RADIUS * 0.75 : isStart ? 4.5 : 3.2}
              fill={i < reached ? "#FFC53D" : isNext ? "#7FE3C4" : "#ffffff80"}
              data-qa={qa ? `dot-${i}` : undefined}
              animate={isNext && !reduce ? { scale: nudgeDot ? [1, 1.8, 1] : [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: nudgeDot ? 0.5 : 1.2, repeat: Infinity }}
              style={{ transformOrigin: `${d[0]}px ${d[1]}px` }}
            />
          );
        })}
      </svg>
      <p className="text-base text-cream/80">התחילו מהנקודה הירוקה והמשיכו לפי הסדר</p>
    </div>
  );
}
