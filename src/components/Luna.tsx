"use client";
/**
 * Luna the fox — the guide. A small state machine (idle, listening, happy,
 * thinking, hint, celebrate) driven by game events, drawn in SVG and
 * animated with springs. She looks toward where the child taps.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { on, type LunaMood } from "@/lib/events";
import { En } from "./En";
import { emojiSrc } from "@/lib/emoji";

const ORANGE = "#F2914A";
const ORANGE_DARK = "#D9732E";
const WHITE = "#FFF8EE";
const INK = "#1D1F45";

export function Luna({
  size = 160,
  bubble = true,
  bubbleSide = "start",
  className = "",
}: {
  size?: number;
  bubble?: boolean;
  bubbleSide?: "start" | "end" | "top" | "above-start";
  className?: string;
}) {
  const [mood, setMood] = useState<LunaMood>("idle");
  const [caption, setCaption] = useState<{ he?: string; en?: string } | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const captionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const set = (m: LunaMood, ms?: number) => {
      clearTimeout(moodTimer.current);
      setMood(m);
      if (ms) moodTimer.current = setTimeout(() => setMood("idle"), ms);
    };
    const offs = [
      on("answer.correct", () => set("happy", 1400)),
      on("answer.wrong", () => set("hint", 2200)),
      on("listen.start", () => set("listening")),
      on("listen.end", ({ matched }) => set(matched ? "happy" : "thinking", 1600)),
      on("celebrate", () => set("celebrate", 2200)),
      on("luna.mood", ({ mood }) => set(mood, mood === "idle" ? undefined : 2500)),
      on("luna.say", (c) => {
        clearTimeout(captionTimer.current);
        setCaption(c);
        const len = (c.he?.length ?? 0) + (c.en?.length ?? 0);
        captionTimer.current = setTimeout(() => setCaption(null), 3500 + len * 70);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      clearTimeout(moodTimer.current);
      clearTimeout(captionTimer.current);
    };
  }, []);

  // Look toward taps.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.4);
      const d = Math.hypot(dx, dy) || 1;
      setLook({ x: (dx / d) * 3.5, y: (dy / d) * 3 });
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const loop = (dur: number) => (reduce ? { duration: 0 } : { duration: dur, repeat: Infinity, ease: "easeInOut" as const });

  const body = {
    idle: { y: reduce ? 0 : [0, -3, 0], rotate: 0, transition: loop(4) },
    listening: { y: -4, rotate: 6, transition: { type: "spring" as const, stiffness: 200, damping: 12 } },
    happy: { y: reduce ? 0 : [0, -18, 0, -10, 0], rotate: 0, transition: { duration: 0.9 } },
    thinking: { y: 0, rotate: -8, transition: { type: "spring" as const, stiffness: 120, damping: 14 } },
    hint: { y: -2, rotate: 4, scale: 1.04, transition: { type: "spring" as const, stiffness: 200, damping: 12 } },
    celebrate: {
      y: reduce ? 0 : [0, -40, 0],
      rotate: reduce ? 0 : [0, 360],
      transition: { duration: 1.1, ease: "easeOut" as const },
    },
  }[mood];

  const earsUp = mood === "listening" || mood === "happy" || mood === "celebrate";
  const eyesClosed = mood === "happy" || mood === "celebrate";
  const pupil = mood === "thinking" ? { x: -3, y: -4 } : look;

  return (
    <div ref={ref} className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        animate={body}
        style={{ originX: 0.5, originY: 0.9, overflow: "visible" }}
        role="img"
        aria-label="לונה השועלה"
      >
        {/* tail */}
        <motion.g
          style={{ originX: "140px", originY: "165px" }}
          animate={{ rotate: reduce ? 0 : mood === "happy" || mood === "celebrate" ? [-18, 18, -18] : [-6, 6, -6] }}
          transition={{ duration: mood === "happy" ? 0.5 : 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M140 165c30-5 52-30 48-62-2-14-14-18-20-8-8 14-6 40-34 52z" fill={ORANGE} stroke={INK} strokeWidth="4" />
          <path d="M184 104c-2-12-12-15-17-7l-4 10c8 0 15 0 21-3z" fill={WHITE} />
        </motion.g>

        {/* body */}
        <ellipse cx="100" cy="155" rx="42" ry="36" fill={ORANGE} stroke={INK} strokeWidth="4" />
        <ellipse cx="100" cy="162" rx="24" ry="24" fill={WHITE} />
        {/* paws */}
        <ellipse cx="80" cy="188" rx="12" ry="8" fill={ORANGE_DARK} stroke={INK} strokeWidth="3.5" />
        <ellipse cx="120" cy="188" rx="12" ry="8" fill={ORANGE_DARK} stroke={INK} strokeWidth="3.5" />
        {/* scarf */}
        <path d="M66 124q34 16 68 0l-2 12q-32 14-64 0z" fill="#B9A7F5" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M118 132l6 22-12-4z" fill="#B9A7F5" stroke={INK} strokeWidth="3" strokeLinejoin="round" />

        {/* head */}
        <g>
          {/* ears */}
          <motion.g
            style={{ originX: "64px", originY: "62px" }}
            animate={{ rotate: earsUp ? -8 : mood === "hint" ? 14 : 0, scaleY: earsUp ? 1.18 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <path d="M58 70L50 18l38 30z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M60 56l-4-26 18 16z" fill="#FFB3C1" />
          </motion.g>
          <motion.g
            style={{ originX: "136px", originY: "62px" }}
            animate={{ rotate: earsUp ? 8 : 0, scaleY: earsUp ? 1.18 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <path d="M142 70l8-52-38 30z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M140 56l4-26-18 16z" fill="#FFB3C1" />
          </motion.g>

          <path
            d="M100 40c30 0 50 18 50 44 0 26-22 44-50 44S50 110 50 84c0-26 20-44 50-44z"
            fill={ORANGE}
            stroke={INK}
            strokeWidth="4"
          />
          {/* muzzle */}
          <path d="M60 96c10 22 30 30 40 30s30-8 40-30c-14 4-26-2-40-2s-26 6-40 2z" fill={WHITE} />
          {/* cheeks */}
          <ellipse cx="66" cy="96" rx="8" ry="5" fill="#FF8FA3" opacity="0.6" />
          <ellipse cx="134" cy="96" rx="8" ry="5" fill="#FF8FA3" opacity="0.6" />

          {/* eyes */}
          {eyesClosed ? (
            <g stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round">
              <path d="M70 82q10-10 20 0" />
              <path d="M110 82q10-10 20 0" />
            </g>
          ) : (
            <motion.g animate={{ scaleY: reduce ? 1 : [1, 1, 0.1, 1] }} transition={{ duration: 4, times: [0, 0.9, 0.95, 1], repeat: Infinity }} style={{ originY: "80px" }}>
              <ellipse cx="80" cy="80" rx="9" ry="11" fill={INK} />
              <ellipse cx="120" cy="80" rx="9" ry="11" fill={INK} />
              <motion.g animate={{ x: pupil.x, y: pupil.y }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                <circle cx="83" cy="76" r="3.5" fill="#fff" />
                <circle cx="123" cy="76" r="3.5" fill="#fff" />
              </motion.g>
            </motion.g>
          )}
          {/* nose + mouth */}
          <ellipse cx="100" cy="98" rx="7" ry="5" fill={INK} />
          {mood === "happy" || mood === "celebrate" ? (
            <path d="M88 106q12 16 24 0z" fill="#E85D75" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          ) : mood === "listening" ? (
            <ellipse cx="100" cy="110" rx="4" ry="5" fill={INK} />
          ) : (
            <path d="M92 106q8 6 16 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          )}
        </g>

        {/* mood props */}
        {mood === "listening" && !reduce && (
          <g stroke="#7FE3C4" strokeWidth="4" fill="none" strokeLinecap="round">
            <motion.path d="M160 40q10 12 0 24" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <motion.path d="M170 32q16 20 0 40" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} />
          </g>
        )}
        {mood === "hint" && (
          <image href={emojiSrc("💡") ?? undefined} x="148" y="8" width="38" height="38" />
        )}
        {mood === "thinking" && (
          <image href={emojiSrc("💭") ?? undefined} x="144" y="10" width="36" height="36" />
        )}
      </motion.svg>

      <AnimatePresence>
        {bubble && caption && (
          <motion.div
            key={(caption.he ?? "") + (caption.en ?? "")}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={`absolute z-20 w-max max-w-[min(70vw,340px)] rounded-3xl border-[3px] border-night-deep bg-cream px-4 py-3 text-night-deep shadow-lg ${
              bubbleSide === "top"
                ? "bottom-full mb-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2"
                : bubbleSide === "above-start"
                  ? "bottom-full mb-1 start-0"
                  : bubbleSide === "start"
                  ? "top-0 start-full ms-2"
                  : "top-0 end-full me-2"
            }`}
            aria-live="polite"
          >
            {caption.he && <p className="text-base leading-snug font-medium">{caption.he}</p>}
            {caption.en && (
              <p className="mt-1 text-lg font-bold text-[#5b4bc4]">
                <En>{caption.en}</En>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
