"use client";
/**
 * Developer debug panel (only in debug mode): jump to any island, stage or
 * single game, preview every screen and overlay, and move through levels.
 * Debug actions change the active profile — use a test explorer.
 */
import { AnimatePresence, m as motion } from "framer-motion";
import { useState } from "react";
import type { ActivityType, GameType } from "@/lib/content/types";
import { ISLANDS } from "@/lib/content/islands";
import { setDebug, type QuestOverride } from "@/lib/debug";
import { emit } from "@/lib/events";
import { balance, levelFor, starsForLevel, totalEarned } from "@/lib/ledger";
import { gameFits } from "@/lib/mission";
import {
  createProfile,
  debugAddStars,
  debugReachLevel,
  debugResetProgress,
  debugSetIslandProgress,
  type Profile,
} from "@/lib/store";
import { Emoji } from "./Emoji";

const GAMES: { type: ActivityType; label: string; icon: string }[] = [
  { type: "story", label: "Story", icon: "✨" },
  { type: "bubble", label: "Bubble Pop", icon: "🫧" },
  { type: "say", label: "Say It", icon: "🎤" },
  { type: "memory", label: "Memory", icon: "🌷" },
  { type: "train", label: "Sound Train", icon: "🚂" },
  { type: "detective", label: "b/d Detective", icon: "🔍" },
  { type: "paint", label: "Paint", icon: "🎨" },
  { type: "count", label: "Feed the Dolphin", icon: "🐟" },
  { type: "trace", label: "Letter Trace", icon: "✍️" },
  { type: "greet", label: "What Do We Say?", icon: "💬" },
];

export type DebugScreen = "map" | "world" | "camp" | "journal" | "gate" | "new";

export function DebugPanel({
  profile,
  onPlay,
  onScreen,
  onGoodnight,
}: {
  profile: Profile;
  onPlay: (chapterId: string, override: QuestOverride) => void;
  onScreen: (s: DebugScreen) => void;
  onGoodnight: (reason: "limit" | "bedtime") => void;
}) {
  const [open, setOpen] = useState(false);
  const [levelInput, setLevelInput] = useState(10);
  const total = totalEarned(profile.ledger);
  const level = levelFor(total);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div dir="ltr" lang="en" className="font-[system-ui]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 left-3 z-[70] grid h-12 w-12 place-items-center rounded-full border-2 border-white/40 bg-black/70 text-2xl shadow-lg"
        aria-label="Debug panel"
      >
        <Emoji e="🐞" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-[71] w-[min(420px,100vw)] overflow-y-auto bg-[#111226]/95 p-4 text-sm text-white shadow-2xl backdrop-blur"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">🐞 Debug mode</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-3 py-1">
                Close
              </button>
            </header>
            <p className="mb-3 text-xs text-white/60">
              Explorer: <b>{profile.name}</b> · level {level} · {total} lifetime ⭐ · {balance(profile.ledger)} in jar. All stages are
              unlocked and the time limit is off. Actions change this profile.
            </p>

            <Section title="Stages">
              {ISLANDS.map((isl) => (
                <div key={isl.id} className="mb-3 rounded-xl bg-white/5 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <b>
                      <Emoji e={isl.friend.emoji} /> {isl.index}. {isl.name.en}
                    </b>
                    {isl.playable ? (
                      <span className="flex gap-1">
                        <Small onClick={() => debugSetIslandProgress(isl.id, true)}>restore all</Small>
                        <Small onClick={() => debugSetIslandProgress(isl.id, false)}>reset</Small>
                      </span>
                    ) : (
                      <span className="text-xs text-white/50">not built yet</span>
                    )}
                  </div>
                  {isl.chapters.map((c, i) => {
                    const visits = profile.visits[c.id] ?? 0;
                    return (
                      <div key={c.id} className="border-t border-white/10 py-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span>
                            <Emoji e={c.landmark} /> {i + 1}. {c.name.en}
                          </span>
                          <span className="text-xs text-white/50">{visits ? `restored ×${visits}` : "not restored"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Small onClick={run(() => onPlay(c.id, { visit: "first" }))}>▶ quest (first visit)</Small>
                          <Small onClick={run(() => onPlay(c.id, { visit: "revisit" }))}>▶ quest (revisit)</Small>
                          {GAMES.filter((g) => g.type === "story" || gameFits(g.type as GameType, c.words, c)).map((g) => (
                            <Small key={g.type} onClick={run(() => onPlay(c.id, { only: g.type }))}>
                              <Emoji e={g.icon} /> {g.label}
                            </Small>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Section>

            <Section title="Levels & stars">
              <div className="mb-2 flex flex-wrap items-center gap-1">
                <label className="flex items-center gap-1">
                  Level
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={levelInput}
                    onChange={(e) => setLevelInput(Number(e.target.value))}
                    className="w-16 rounded bg-white/10 px-2 py-1"
                  />
                </label>
                <Small onClick={() => debugReachLevel(levelInput)}>reach level ({starsForLevel(Math.min(50, Math.max(1, levelInput)))} ⭐)</Small>
                <Small onClick={() => emit("level.up", { level: levelInput })}>preview level-up</Small>
              </div>
              <div className="flex flex-wrap gap-1">
                <Small onClick={() => debugAddStars(50)}>+50 ⭐</Small>
                <Small onClick={() => debugAddStars(500)}>+500 ⭐</Small>
                <Small onClick={() => debugAddStars(5000)}>+5000 ⭐</Small>
              </div>
            </Section>

            <Section title="Screens">
              <div className="flex flex-wrap gap-1">
                <Small onClick={run(() => onScreen("map"))}>Island map</Small>
                <Small onClick={run(() => onScreen("world"))}>Sea chart</Small>
                <Small onClick={run(() => onScreen("camp"))}>Camp</Small>
                <Small onClick={run(() => onScreen("journal"))}>Journal</Small>
                <Small onClick={run(() => onScreen("gate"))}>Parent area</Small>
                <Small onClick={run(() => onScreen("new"))}>Onboarding</Small>
                <Small onClick={run(() => onGoodnight("limit"))}>Goodnight (time limit)</Small>
                <Small onClick={run(() => onGoodnight("bedtime"))}>Goodnight (bedtime)</Small>
              </div>
            </Section>

            <Section title="Effects">
              <div className="flex flex-wrap gap-1">
                <Small onClick={run(() => emit("celebrate", { size: 1 }))}>Sparkle (1⭐)</Small>
                <Small onClick={run(() => emit("celebrate", { size: 2 }))}>Confetti (2⭐)</Small>
                <Small onClick={run(() => emit("celebrate", { size: 3 }))}>Fireworks (3⭐)</Small>
                <Small onClick={run(() => emit("star.earned", { amount: 5 }))}>Star flight</Small>
              </div>
            </Section>

            <Section title="Profile">
              <div className="flex flex-wrap gap-1">
                <Small onClick={run(() => createProfile("Test", "🧒🏽"))}>New test explorer</Small>
                <Small
                  onClick={() => {
                    if (confirm(`Reset all progress, stars and purchases for ${profile.name}?`)) debugResetProgress();
                  }}
                >
                  Reset this profile
                </Small>
                <Small onClick={() => setDebug(false)}>Turn debug mode off</Small>
              </div>
            </Section>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">{title}</h3>
      {children}
    </section>
  );
}

function Small({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-9 rounded-lg bg-white/10 px-2.5 py-1 text-left hover:bg-white/20 active:bg-white/30">
      {children}
    </button>
  );
}
