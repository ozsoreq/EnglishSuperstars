"use client";
import { m as motion } from "framer-motion";
import { levelFor, starsForLevel, totalEarned } from "@/lib/ledger";
import type { Profile } from "@/lib/store";
import { Avatar } from "../Avatar";
import { StarJar } from "../StarJar";
import { Emoji } from "@/components/Emoji";

/** Top bar: explorer + level, streak flame, star jar, and the grown-ups' lock. */
export function Hud({
  profile,
  onNav,
  title,
}: {
  profile: Profile;
  onNav: (to: "parent" | "profiles") => void;
  title?: string;
}) {
  const total = totalEarned(profile.ledger);
  const level = levelFor(total);
  const from = starsForLevel(level);
  const to = starsForLevel(level + 1);
  const pct = level >= 50 ? 1 : (total - from) / (to - from);
  const streak = profile.streak.count;

  return (
    <header className="flex items-center justify-between gap-2 bg-night/70 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
      <button type="button" className="flex items-center gap-2" onClick={() => onNav("profiles")} aria-label="החלפת מגלה">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-lavender/30">
          <Avatar profile={profile} size={40} />
        </span>
        <span className="text-start leading-tight">
          <span className="block font-bold">{profile.name}</span>
          <span className="block text-xs text-cream/70">רמה {level}</span>
          <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-white/15">
            <motion.span className="block h-full bg-mint" initial={false} animate={{ width: `${pct * 100}%` }} />
          </span>
        </span>
      </button>
      {title && <span className="hidden text-lg font-bold text-cream/80 sm:block">{title}</span>}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-lg font-bold" title="רצף ימים">
          <motion.span animate={{ scale: streak ? [1, 1.15, 1] : 1 }} transition={{ duration: 2.5, repeat: Infinity }} style={{ filter: streak ? "none" : "grayscale(1)", fontSize: 18 + Math.min(streak, 7) * 2 }}>
            <Emoji e="🔥" />
          </motion.span>
          <span style={{ direction: "ltr" }}>{streak}</span>
        </span>
        <StarJar profile={profile} compact />
        <button type="button" onClick={() => onNav("parent")} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-lg opacity-70" aria-label="אזור הורים">
          <Emoji e="🔒" />
        </button>
      </div>
    </header>
  );
}
