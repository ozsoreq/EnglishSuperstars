"use client";
/**
 * The Explorer's Journal (Word Book): every word met, grey → silver → gold by
 * mastery; tap to hear it. Plus the treasure shelf and island trophies.
 * Comparisons are only with the child's own past.
 */
import { motion } from "motion/react";
import { sayWord } from "@/lib/audio";
import { ISLANDS } from "@/lib/content/islands";
import { ALL_WORDS } from "@/lib/content/words";
import type { Theme } from "@/lib/content/types";
import { addDays, dayKey } from "@/lib/dates";
import { mastery } from "@/lib/srs";
import type { Profile } from "@/lib/store";
import { Btn } from "../Btn";
import { En } from "../En";
import { Picture } from "../Picture";
import { Emoji } from "@/components/Emoji";

const THEMES: { id: Theme; he: string }[] = [
  { id: "greetings", he: "ברכות" },
  { id: "colors", he: "צבעים" },
  { id: "numbers", he: "מספרים" },
  { id: "letters", he: "צלילי אותיות" },
];

const RING: Record<string, string> = {
  grey: "#9aa0b5",
  silver: "#d9e2ec",
  gold: "#FFC53D",
};

export function Journal({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const met = ALL_WORDS.filter((w) => profile.memory[w.id]);
  const gold = met.filter((w) => mastery(profile.memory[w.id]) === "gold").length;
  const monthAgo = addDays(dayKey(), -30);
  const before = met.filter((w) => profile.memory[w.id].firstSeen <= monthAgo).length;
  // Only compare with the past once there is a month of past to compare with.
  const growth = profile.createdAt < Date.now() - 30 * 86_400_000 ? met.length - before : 0;
  const treasures = ISLANDS.flatMap((i) => i.chapters).filter((c) => (profile.visits[c.id] ?? 0) > 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 pb-10 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between">
        <Btn tone="ghost" onClick={onBack} className="text-2xl" aria-label="חזרה">
          <Emoji e="➜" />
        </Btn>
        <h1 className="text-2xl font-bold">
          <Emoji e="📖" /> יומן המגלים
        </h1>
        <span className="w-14" />
      </header>

      <section className="chunky flex flex-wrap items-center justify-around gap-3 bg-white/10 p-4 text-center">
        <div>
          <div className="text-4xl font-black text-mint">{met.length}</div>
          <div className="text-sm">מילים שפגשתם</div>
        </div>
        <div>
          <div className="text-4xl font-black text-gold">{gold}</div>
          <div className="text-sm">מילים של זהב</div>
        </div>
        {growth > 0 && (
          <div className="max-w-40 text-base">
            אתם יודעים <b className="text-coral">{growth}</b> מילים יותר מלפני חודש! <Emoji e="🌱" anim="wiggle" />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">
          <Emoji e="🎒" /> תרמיל האוצרות
        </h2>
        <div className="flex flex-wrap gap-2">
          {ISLANDS[0].chapters.map((c) => {
            const has = treasures.includes(c);
            return (
              <div key={c.id} className="chunky grid h-16 w-16 place-items-center bg-white/10 text-3xl" title={has ? c.treasure.he : "עוד לא נמצא"}>
                {has ? <Emoji e={c.treasure.emoji} anim="float" /> : <span className="opacity-30">?</span>}
              </div>
            );
          })}
        </div>
      </section>

      {THEMES.map((t) => (
        <section key={t.id}>
          <h2 className="mb-2 text-lg font-bold">{t.he}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {ALL_WORDS.filter((w) => w.theme === t.id).map((w) => {
              const m = mastery(profile.memory[w.id]);
              if (m === "unseen") {
                return (
                  <div key={w.id} className="chunky grid h-28 place-items-center bg-white/5 text-3xl opacity-40" aria-label="מילה שעוד לא פגשתם">
                    <Emoji e="❔" />
                  </div>
                );
              }
              return (
                <motion.button
                  key={w.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void sayWord(w.en)}
                  className="flex h-28 flex-col items-center justify-center gap-1 rounded-[24px] bg-cream text-night-deep"
                  style={{ border: `4px solid ${RING[m]}`, boxShadow: m === "gold" ? "0 0 16px #FFC53D" : "0 5px 0 #1d1f4588" }}
                  aria-label={`${w.en} — ${w.he}`}
                >
                  <Picture pic={w.pic} size={44} anim={false} />
                  <En className="font-bold">
                    <span style={{ fontSize: w.en.length > 6 ? 20 : 26 }}>{w.en}</span>
                  </En>
                </motion.button>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-lg font-bold">
          <Emoji e="🏆" /> מדף הגביעים
        </h2>
        <div className="chunky flex gap-3 bg-[#8b6b4a]/60 p-3">
          {ISLANDS.map((i) => (
            <span key={i.id} className="text-4xl" title={i.name.he} style={{ opacity: profile.islandsDone.includes(i.id) ? 1 : 0.2 }}>
              <Emoji e={profile.islandsDone.includes(i.id) ? "🏆" : "🏅"} />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
