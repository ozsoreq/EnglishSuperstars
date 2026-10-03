"use client";
/** b/d Detective (look-alike letters): sort floating letters into the right magnifying glass. */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { saySound } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { En } from "../En";
import { Picture } from "../Picture";
import { Pips, cheer, nudge, shuffle, useTracker, wait, type GameProps, useRounds } from "./shared";
import { Emoji } from "@/components/Emoji";

const GLASSES = [
  { letter: "b", wordId: "ball" },
  { letter: "d", wordId: "dog" },
] as const;

export function Detective({ onDone }: GameProps) {
  const rounds = useMemo(() => shuffle(["b", "d", "b", "d", "b", "d", "b", "d"]).slice(0, 6), []);
  const [flyTo, setFlyTo] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showTummy, setShowTummy] = useState(false);
  const busy = useRef(false);
  const tracker = useTracker();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const reduce = useReducedMotion();
  const letter = rounds[round];

  useEffect(() => {
    setFlyTo(null);
    setShowTummy(false);
    busy.current = false;
    if (round === 0) void lunaSay(L.detectiveIntro());
  }, [round]);

  const choose = async (gi: number, el: HTMLElement) => {
    if (busy.current || !letter) return;
    const g = GLASSES[gi];
    const key = `${round}`;
    const wordId = GLASSES.find((x) => x.letter === letter)!.wordId;
    if (g.letter === letter) {
      busy.current = true;
      setFlyTo(gi);
      cheer(el, wordId);
      void saySound(letter);
      tracker.finish(key, { wordId, shown: showTummy });
      await wait(900);
      advance(round);
      return;
    }
    setWrong(gi);
    setTimeout(() => setWrong(null), 450);
    const misses = tracker.miss(key);
    setShowTummy(true);
    nudge(wordId, misses, misses === 1 ? L.detectiveHint() : L.detectiveShow());
  };

  if (!letter) return null;
  const tummyRight = letter === "b";

  return (
    <div className="flex h-full flex-col items-center gap-4">
      <Pips done={round} total={rounds.length} />
      <div className="relative grid h-44 w-full max-w-md place-items-center">
        <AnimatePresence mode="popLayout">
          <motion.button
            key={round}
            type="button"
            onClick={() => void saySound(letter)}
            className="relative grid h-36 w-36 place-items-center rounded-full bg-white/10"
            initial={{ y: -80, opacity: 0, rotate: -20 }}
            animate={
              flyTo === null
                ? { y: reduce ? 0 : [0, -10, 0], opacity: 1, rotate: reduce ? 0 : [-4, 4, -4] }
                : { y: 160, x: (flyTo === 0 ? -1 : 1) * 110, scale: 0.3, opacity: 0 }
            }
            transition={flyTo === null ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
            aria-label="השמיעו את הצליל"
          >
            <En className="font-bold text-cream">
              <span style={{ fontSize: 110, lineHeight: 1 }}>{letter}</span>
            </En>
            {showTummy && (
              <motion.span
                className="absolute text-3xl"
                style={{ top: "52%", [tummyRight ? "right" : "left"]: 6 }}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Emoji e={tummyRight ? "👉" : "👈"} />
              </motion.span>
            )}
          </motion.button>
        </AnimatePresence>
      </div>
      <div className="flex gap-6" dir="ltr">
        {GLASSES.map((g, i) => (
          <motion.button
            key={g.letter}
            type="button"
            onClick={(e) => choose(i, e.currentTarget)}
            whileTap={{ scale: 0.9 }}
            animate={{ x: wrong === i ? [0, -10, 10, -6, 6, 0] : 0 }}
            className="relative flex flex-col items-center"
            aria-label={`זכוכית מגדלת של ${WORDS[g.wordId].he}`}
          >
            <span className="chunky grid h-32 w-32 place-items-center rounded-full bg-cream/90" style={{ borderRadius: 999, borderWidth: 8, borderColor: "#B9A7F5" }}>
              <span className="flex flex-col items-center">
                <En className="font-bold text-night-deep">
                  <span style={{ fontSize: 48, lineHeight: 1 }}>{g.letter}</span>
                </En>
                <Picture pic={WORDS[g.wordId].pic} size={40} />
              </span>
            </span>
            <span className="-mt-2 h-12 w-4 rotate-[-25deg] rounded-full bg-[#8b6b4a]" />
          </motion.button>
        ))}
      </div>
      <p className="text-base text-cream/80">לחצו על האות כדי לשמוע אותה, ואז על הזכוכית המגדלת</p>
    </div>
  );
}
