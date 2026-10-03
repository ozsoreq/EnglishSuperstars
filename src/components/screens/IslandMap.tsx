"use client";
/**
 * The island adventure map. The explorer walks a winding path (right to left
 * in Hebrew mode); every restored place glows in colour, the path unrolls as
 * missions complete, and fog hides what hasn't been reached yet.
 */
import { m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/lib/audio";
import { item } from "@/lib/catalog";
import { ISLANDS } from "@/lib/content/islands";
import { emojiSrc } from "@/lib/emoji";
import { L } from "@/lib/lines";
import { useDebug } from "@/lib/debug";
import { lunaSay } from "@/lib/luna";
import { chapterUnlocked, type Profile } from "@/lib/store";
import { Avatar } from "../Avatar";
import { Btn } from "../Btn";
import { Luna } from "../Luna";
import { Hud } from "./Hud";
import { Emoji } from "@/components/Emoji";

// Path stops in a 400×720 viewBox, starting bottom-right (RTL).
const STOPS = [
  { x: 300, y: 640 },
  { x: 120, y: 580 },
  { x: 90, y: 460 },
  { x: 280, y: 400 },
  { x: 310, y: 280 },
  { x: 120, y: 230 },
  { x: 95, y: 120 },
  { x: 275, y: 70 },
];

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function IslandMap({
  profile,
  onEnter,
  onNav,
  greet,
}: {
  profile: Profile;
  onEnter: (chapterId: string) => void;
  onNav: (to: "camp" | "journal" | "world" | "parent" | "profiles") => void;
  greet: boolean;
}) {
  const debug = useDebug();
  const unlocked = (i: number) => debug || chapterUnlocked(profile, 0, i);
  const isl = ISLANDS[0];
  const chapters = isl.chapters;
  const reduce = useReducedMotion();
  const restoredCount = chapters.filter((c) => (profile.visits[c.id] ?? 0) > 0).length;
  const nextIndex = chapters.findIndex((c) => !(profile.visits[c.id] ?? 0));
  const locIndex = Math.max(0, chapters.findIndex((c) => c.id === profile.location));
  const [walkTo, setWalkTo] = useState<number | null>(null);
  const [pos, setPos] = useState(locIndex);
  const scroller = useRef<HTMLDivElement>(null);
  const pet = profile.activePet ? item(profile.activePet) : undefined;

  const fullPath = useMemo(() => smoothPath(STOPS), []);
  const unrolled = (restoredCount === 0 ? 0 : Math.min(restoredCount, STOPS.length - 1)) / (STOPS.length - 1);

  useEffect(() => setPos(locIndex), [locIndex]);

  // Centre the explorer on screen.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const y = (STOPS[pos].y / 720) * el.scrollHeight - el.clientHeight / 2;
    el.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
  }, [pos, reduce]);

  useEffect(() => {
    if (!greet) return;
    const t = setTimeout(() => {
      const target = chapters[nextIndex === -1 ? locIndex : nextIndex];
      if (nextIndex === -1) void lunaSay(L.greetAllDone(profile.name));
      else void lunaSay(L.greetQuest(profile.name, target));
    }, 700);
    return () => clearTimeout(t);
  }, [greet, chapters, nextIndex, locIndex, profile.name]);

  const tapStop = async (i: number) => {
    if (walkTo !== null) return;
    const ch = chapters[i];
    if (!unlocked(i)) {
      sfx("soft");
      void lunaSay(L.fogChapter(chapters[i - 1]));
      return;
    }
    sfx("whoosh");
    setWalkTo(i);
    setPos(i);
    await new Promise((r) => setTimeout(r, reduce ? 150 : 1100));
    setWalkTo(null);
    onEnter(ch.id);
  };

  const p = STOPS[pos];

  return (
    <div className="flex h-dvh flex-col">
      <h1 className="sr-only">{isl.name.he}</h1>
      <Hud profile={profile} onNav={onNav} title={isl.name.he} />

      <div ref={scroller} className="relative flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative mx-auto w-full max-w-[560px]" style={{ aspectRatio: "400 / 720" }}>
          <svg viewBox="0 0 400 720" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <radialGradient id="sea" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#4fa9c9" />
                <stop offset="100%" stopColor="#2b4f86" />
              </radialGradient>
              <radialGradient id="land" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#9fe6b5" />
                <stop offset="100%" stopColor="#5cbf8a" />
              </radialGradient>
            </defs>
            <rect width="400" height="720" fill="url(#sea)" />
            {/* waves */}
            {[60, 180, 330, 520, 680].map((y, i) => (
              <motion.path
                key={y}
                d={`M${10 + (i % 2) * 300} ${y} q10 -8 20 0 t20 0`}
                stroke="#ffffff66"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                animate={reduce ? {} : { x: [0, 12, 0] }}
                transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            {/* island + beach */}
            <path d="M200 20c110 0 180 60 180 170s-30 160-10 260 0 230-170 250S30 680 30 560s40-150 20-250S90 20 200 20z" fill="#f6deb0" />
            <path d="M200 40c95 0 160 55 160 150s-30 160-10 255-10 210-150 228S50 660 50 555s40-150 20-245S105 40 200 40z" fill="url(#land)" />
            {/* trees and rocks */}
            {[
              [200, 160, "🌴"],
              [210, 330, "🌳"],
              [40, 380, "🌴"],
              [350, 520, "🌴"],
              [200, 520, "🌺"],
              [190, 640, "🌼"],
              [350, 170, "🌳"],
            ].map(([x, y, e], i) => (
              <motion.image
                key={i}
                href={emojiSrc(e as string) ?? undefined}
                x={(x as number) - 16}
                y={(y as number) - 28}
                width="32"
                height="32"
                style={{ originX: "50%", originY: "100%" }}
                animate={reduce ? {} : { rotate: [-3, 3, -3] }}
                transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            <motion.image
              href={emojiSrc("⛵") ?? undefined}
              x="350"
              y="672"
              width="38"
              height="38"
              animate={reduce ? {} : { y: [672, 666, 672], rotate: [-4, 4, -4] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* the path: dotted full route, golden unrolled part */}
            <path d={fullPath} stroke="#ffffff55" strokeWidth="7" strokeDasharray="2 14" strokeLinecap="round" fill="none" />
            <motion.path
              d={fullPath}
              stroke="#FFC53D"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              initial={false}
              animate={{ pathLength: unrolled }}
              transition={{ duration: reduce ? 0 : 1.6, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 6px #FFC53D)" }}
            />
          </svg>

          {/* Stops */}
          {chapters.map((c, i) => {
            const s = STOPS[i];
            const restored = (profile.visits[c.id] ?? 0) > 0;
            const open = unlocked(i);
            const isNext = i === nextIndex;
            return (
              <div
                key={c.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(s.x / 400) * 100}%`, top: `${(s.y / 720) * 100}%` }}
              >
                <motion.button
                  type="button"
                  onClick={() => tapStop(i)}
                  whileTap={{ scale: 0.9 }}
                  className="relative grid h-20 w-20 place-items-center rounded-full border-[3px] border-night-deep text-4xl"
                  style={{
                    background: restored ? "#FFF4D6" : open ? "#ffffffcc" : "#ffffff55",
                    boxShadow: restored ? "0 0 22px 6px #FFC53D99" : "0 5px 0 #1d1f4588",
                    filter: restored ? "none" : open ? "grayscale(0.85)" : "grayscale(1) blur(0.5px)",
                  }}
                  animate={isNext && !reduce ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  aria-label={`${c.name.he}${restored ? " — הוצל" : open ? "" : " — נעול"}`}
                >
                  <Emoji e={c.landmark} size="1em" />
                  {restored && <span className="absolute -top-2 -end-2 text-xl">
                      <Emoji e={c.treasure.emoji} anim="wiggle" />
                    </span>}
                </motion.button>
                <div className="pointer-events-none mt-1 whitespace-nowrap rounded-full bg-night-deep/70 px-2 text-center text-xs font-bold">
                  {c.name.he}
                </div>
                {isNext && (
                  <motion.div
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-2xl"
                    animate={reduce ? {} : { y: [0, -8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Emoji e="❗" />
                  </motion.div>
                )}
                {/* fog */}
                {!open && (
                  <motion.div
                    className="pointer-events-none absolute -inset-8 grid place-items-center text-6xl opacity-90"
                    animate={reduce ? {} : { x: [-4, 4, -4] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Emoji e="☁️" />
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* The explorer (and pet) */}
          <motion.div
            className="pointer-events-none absolute z-10"
            initial={false}
            animate={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 720) * 100}%` }}
            transition={{ duration: reduce ? 0 : 1, ease: "easeInOut" }}
            style={{ translate: "-125% -95%" }}
          >
            <motion.div animate={walkTo !== null && !reduce ? { y: [0, -10, 0, -10, 0], rotate: [0, -6, 6, -6, 0] } : { y: [0, -3, 0] }} transition={{ duration: walkTo !== null ? 1 : 3, repeat: walkTo !== null ? 0 : Infinity }}>
              <Avatar profile={profile} size={52} />
            </motion.div>
            {pet && (
              <motion.span
                className="absolute -bottom-1 text-3xl"
                style={{ insetInlineStart: 44 }}
                animate={reduce ? {} : { y: [0, -6, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              >
                <Emoji e={pet.emoji} />
              </motion.span>
            )}
          </motion.div>
        </div>
      </div>

      <footer className="relative flex items-end justify-between gap-2 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
        <div className="pointer-events-none -mb-2">
          <Luna size={100} bubbleSide="above-start" />
        </div>
        <nav className="flex gap-2">
          {(
            [
              ["camp", "coral", "⛺", "מחנה"],
              ["journal", "lavender", "📖", "יומן"],
              ["world", "mint", "🗺️", "ים"],
            ] as const
          ).map(([to, tone, icon, label]) => (
            <Btn key={to} tone={tone} onClick={() => onNav(to)} className="flex flex-col items-center px-3 py-1 text-sm leading-tight">
              <span className="text-2xl">{icon}</span>
              {label}
            </Btn>
          ))}
        </nav>
      </footer>
    </div>
  );
}
