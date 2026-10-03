"use client";
/** Memory Garden (vocabulary): flip flower cards to match a picture with its English word. */
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { sfx } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { emit } from "@/lib/events";
import { En } from "../En";
import { Picture } from "../Picture";
import { cheer, hearWord, shuffle, useTracker, wait, type GameProps } from "./shared";
import { Emoji } from "@/components/Emoji";

interface Card {
  key: string;
  wordId: string;
  face: "pic" | "word";
}

export function MemoryGarden({ activity, onDone }: GameProps) {
  const pairs = useMemo(() => shuffle(activity.words).slice(0, activity.words.length >= 4 ? 4 : 3), [activity.words]);
  const cards = useMemo<Card[]>(
    () => shuffle(pairs.flatMap((id) => [{ key: `${id}-p`, wordId: id, face: "pic" as const }, { key: `${id}-w`, wordId: id, face: "word" as const }])),
    [pairs],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const lock = useRef(false);
  const tracker = useTracker();
  const mismatches = useRef(0);

  const flip = async (card: Card, el: HTMLElement) => {
    if (lock.current || open.includes(card.key) || matched.includes(card.wordId)) return;
    sfx("flip");
    if (card.face === "word") void hearWord(card.wordId);
    const now = [...open, card.key];
    setOpen(now);
    if (now.length < 2) return;

    lock.current = true;
    const [a, b] = now.map((k) => cards.find((c) => c.key === k)!);
    if (a.wordId === b.wordId) {
      cheer(el, a.wordId);
      void hearWord(a.wordId);
      tracker.finish(a.wordId);
      const done = [...matched, a.wordId];
      setMatched(done);
      setOpen([]);
      lock.current = false;
      if (done.length === pairs.length) {
        await wait(1100);
        // Memory is partly luck: score on how many extra flips it took.
        const r = tracker.result();
        const extra = Math.max(0, mismatches.current - pairs.length);
        onDone({ ...r, firstTry: Math.max(0, pairs.length - extra), total: pairs.length });
      }
    } else {
      mismatches.current += 1;
      sfx("soft");
      emit("luna.mood", { mood: "thinking" });
      await wait(950);
      setOpen([]);
      lock.current = false;
    }
  };

  const cols = cards.length === 8 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3";
  return (
    <div className="flex h-full flex-col items-center gap-4">
      <p className="text-lg text-cream/90">הפכו שני פרחים ומצאו תמונה ומילה שמתאימות</p>
      <div className={`grid ${cols} gap-3`} dir="ltr">
        {cards.map((c) => {
          const shown = open.includes(c.key) || matched.includes(c.wordId);
          const w = WORDS[c.wordId];
          return (
            <motion.button
              key={c.key}
              type="button"
              onClick={(e) => flip(c, e.currentTarget)}
              whileTap={{ scale: 0.92 }}
              className="relative h-28 w-[6.5rem] sm:h-32 sm:w-28"
              style={{ perspective: 600 }}
              aria-label={shown ? (c.face === "word" ? w.en : w.he) : "פרח סגור"}
            >
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: shown ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div
                  className="chunky absolute inset-0 grid place-items-center bg-coral text-4xl"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Emoji e="🌷" />
                </div>
                <div
                  className={`chunky absolute inset-0 grid place-items-center ${matched.includes(c.wordId) ? "bg-gold" : "bg-cream"} text-night-deep`}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {c.face === "pic" ? (
                    <Picture pic={w.pic} size={56} />
                  ) : (
                    <En className="px-1 text-center font-bold leading-tight">
                      <span style={{ fontSize: w.en.length > 6 ? 22 : 28 }}>{w.en}</span>
                    </En>
                  )}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
