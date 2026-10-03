"use client";
/** The sea chart: six islands, one adventure each. The fog lifts island by island. */
import { motion, useReducedMotion } from "motion/react";
import { sfx } from "@/lib/audio";
import { ISLANDS } from "@/lib/content/islands";
import { lunaSay } from "@/lib/luna";
import type { Profile } from "@/lib/store";
import { Btn } from "../Btn";
import { En } from "../En";
import { Luna } from "../Luna";
import { Emoji } from "@/components/Emoji";

const SPOTS = [
  { x: 78, y: 80 },
  { x: 28, y: 68 },
  { x: 70, y: 52 },
  { x: 25, y: 37 },
  { x: 72, y: 22 },
  { x: 35, y: 10 },
];

export function WorldMap({ profile, onIsland, onBack }: { profile: Profile; onIsland: (id: string) => void; onBack: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <Btn tone="ghost" onClick={onBack} className="text-2xl" aria-label="חזרה">
          <Emoji e="➜" />
        </Btn>
        <h1 className="text-2xl font-bold">מפת הים</h1>
        <span className="w-14" />
      </header>
      <div className="relative mx-auto my-4 w-full max-w-[560px] flex-1 overflow-hidden rounded-[32px] border-[3px] border-night-deep bg-gradient-to-b from-[#2b4f86] to-[#3a8fb5]" style={{ minHeight: 560 }}>
        {/* dotted sea route, right-to-left upward */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <polyline
            points={SPOTS.map((s) => `${s.x},${s.y}`).join(" ")}
            fill="none"
            stroke="#ffffff66"
            strokeWidth="0.8"
            strokeDasharray="1.5 2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {ISLANDS.map((isl, i) => {
          const s = SPOTS[i];
          const done = profile.islandsDone.includes(isl.id);
          return (
            <div key={isl.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (isl.playable) {
                    sfx("whoosh");
                    onIsland(isl.id);
                  } else {
                    sfx("soft");
                    void lunaSay(`${isl.name.he} עוד מכוסה בערפל. ${isl.friend.name.he} מחכה לנו שם בקרוב!`);
                  }
                }}
                className="relative flex flex-col items-center"
                aria-label={isl.name.he}
              >
                <motion.span
                  className="grid h-24 w-28 place-items-center rounded-[50%] border-[3px] border-night-deep text-4xl"
                  style={{ background: isl.tint, filter: isl.playable ? "none" : "grayscale(0.6) brightness(0.8)" }}
                  animate={reduce ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Emoji e={isl.friend.emoji} size="1em" anim={isl.playable ? "wiggle" : undefined} />
                  {done && (
                    <span className="absolute -top-3 text-2xl">
                      <Emoji e="🏆" anim="wiggle" />
                    </span>
                  )}
                </motion.span>
                <span className="mt-1 rounded-full bg-night-deep/80 px-2 text-sm font-bold">{isl.name.he}</span>
                <En className="text-xs text-cream/70">{isl.name.en}</En>
                {!isl.playable && (
                  <motion.span
                    className="pointer-events-none absolute -inset-6 grid place-items-center text-7xl opacity-80"
                    animate={reduce ? {} : { x: [-5, 5, -5] }}
                    transition={{ duration: 8, repeat: Infinity }}
                  >
                    <Emoji e="☁️" />
                  </motion.span>
                )}
              </motion.button>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none fixed bottom-3 start-3">
        <Luna size={100} bubbleSide="above-start" />
      </div>
    </div>
  );
}
