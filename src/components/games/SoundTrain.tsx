"use client";
/**
 * Sound Train (phonics): hook letter-sound carriages onto the engine.
 * First-sound rounds ("which sound starts 🍎?") then blending rounds
 * (c-a-b → "cab!"). The train chugs off when the word blends.
 */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx, saySound, sayWord } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { En } from "../En";
import { Picture } from "../Picture";
import { Pips, SpeakerButton, cheer, nudge, shuffle, useTracker, wait, type GameProps, useRounds } from "./shared";
import { Emoji } from "@/components/Emoji";

type Round =
  | { kind: "first"; key: string; wordId: string; pic: string; answer: string[]; options: string[]; en: string; he: string }
  | { kind: "build"; key: string; pic: string; answer: string[]; options: string[]; en: string; he: string };

const CARRIAGE_COLORS = ["#FF8FA3", "#7FE3C4", "#B9A7F5", "#5AB8D6", "#FFC53D"];
const A_TO_M = "abcdefghijklm".split("");

function buildRounds(activity: GameProps["activity"], chapter: GameProps["chapter"]): Round[] {
  const letters = chapter.letters ?? [];
  const anchors = activity.words.filter((id) => WORDS[id]?.letter);
  const pool = anchors.length ? anchors : chapter.words.filter((id) => WORDS[id]?.letter);
  const first: Round[] = shuffle(pool)
    .slice(0, 3)
    .map((id) => {
      const w = WORDS[id];
      const others = shuffle([...letters, ...A_TO_M].filter((l, i, a) => l !== w.letter && a.indexOf(l) === i)).slice(0, 2);
      return { kind: "first", key: id, wordId: id, pic: w.pic, answer: [w.letter!], options: shuffle([w.letter!, ...others]), en: w.en, he: w.he };
    });
  const build: Round[] = shuffle(chapter.trainWords ?? [])
    .slice(0, 2)
    .map((t) => {
      const extra = shuffle(A_TO_M.filter((l) => !t.word.includes(l)))[0];
      return { kind: "build", key: t.word, pic: t.pic, answer: t.word.split(""), options: shuffle([...t.word.split(""), extra]), en: t.word, he: t.he };
    });
  return [...first, ...build];
}

export function SoundTrain({ activity, chapter, onDone }: GameProps) {
  const rounds = useMemo(() => buildRounds(activity, chapter), [activity, chapter]);
  const [placed, setPlaced] = useState<number[]>([]); // option indexes attached, in order
  const [shake, setShake] = useState<number | null>(null);
  const [departing, setDeparting] = useState(false);
  const [hint, setHint] = useState(false);
  const busy = useRef(false);
  const tracker = useTracker();
  const qa = useDebug();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const reduce = useReducedMotion();
  const roundRef = useRef(round);
  roundRef.current = round;
  const r = rounds[round];

  const promptRound = async (x: Round) => {
    if (x.kind === "first") await lunaSay(L.firstSound(x.en));
    else await lunaSay(L.buildWord(x.en));
  };

  useEffect(() => {
    if (!r) return;
    setPlaced([]);
    setDeparting(false);
    setHint(false);
    busy.current = false;
    void promptRound(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  if (!r) return null;

  const tapCarriage = async (optIndex: number, el: HTMLElement) => {
    // Carriages from a finished round can still be tapped while they animate out.
    if (roundRef.current !== round || busy.current || placed.includes(optIndex)) return;
    const letter = r.options[optIndex];
    void saySound(letter);
    const need = r.answer[placed.length];
    if (letter !== need) {
      setShake(optIndex);
      setTimeout(() => setShake(null), 450);
      const misses = tracker.miss(r.key);
      // First miss: a hint. Second miss: the right carriage glows to show the way.
      nudge(r.kind === "first" ? r.wordId : undefined, misses, misses === 1 ? L.trainHint() : L.trainShow());
      if (misses >= 2) setHint(true);
      return;
    }
    const next = [...placed, optIndex];
    setPlaced(next);
    sfx("pop");
    if (next.length < r.answer.length) return;

    busy.current = true;
    cheer(el, r.kind === "first" ? r.wordId : undefined);
    tracker.finish(r.key, { wordId: r.kind === "first" ? r.wordId : undefined, shown: hint });
    await wait(300);
    if (r.kind === "build") {
      for (const l of r.answer) await saySound(l);
    }
    setDeparting(true);
    sfx("chug");
    await sayWord(r.en);
    await wait(reduce ? 300 : 1100);
    advance(round);
  };

  const needLetter = r.answer[placed.length];

  return (
    <div className="flex h-full w-full flex-col items-center gap-4">
      <Pips done={round} total={rounds.length} />
      <div className="flex items-center gap-4">
        <SpeakerButton onClick={() => void sayWord(r.en)} />
        <div className="chunky grid h-28 w-28 place-items-center bg-cream">
          <Picture pic={r.pic} size={80} />
        </div>
      </div>

      {/* Track + train, always left-to-right like English reading. */}
      <div className="relative w-full max-w-xl overflow-hidden py-2" dir="ltr">
        <motion.div
          className="flex items-end gap-1 px-2"
          animate={{ x: departing && !reduce ? [0, 8, -700] : 0 }}
          transition={{ duration: 1.2, ease: "easeIn" }}
        >
          <span className="text-6xl" aria-hidden>
            <Emoji e="🚂" />
          </span>
          {r.answer.map((_, slot) => {
            const opt = placed[slot];
            const letter = opt !== undefined ? r.options[opt] : null;
            return (
              <motion.div
                key={slot}
                className="chunky grid h-20 w-16 place-items-center text-4xl font-bold text-night-deep"
                style={{ background: letter ? CARRIAGE_COLORS[slot % CARRIAGE_COLORS.length] : "#ffffff18", borderStyle: letter ? "solid" : "dashed" }}
                animate={letter ? { scale: [0.6, 1.1, 1] } : {}}
              >
                {letter && <En>{letter}</En>}
              </motion.div>
            );
          })}
        </motion.div>
        <div className="mx-2 mt-1 h-2 rounded-full bg-[#8b6b4a]" />
      </div>

      {/* Carriage yard */}
      <div className="flex flex-wrap justify-center gap-3" dir="ltr">
        <AnimatePresence>
          {r.options.map((l, i) =>
            placed.includes(i) ? null : (
              <motion.button
                key={`${round}-${i}`}
                type="button"
                onClick={(e) => tapCarriage(i, e.currentTarget)}
                className="chunky grid h-20 w-20 place-items-center text-5xl font-bold text-night-deep"
                style={{
                  background: CARRIAGE_COLORS[i % CARRIAGE_COLORS.length],
                  boxShadow: hint && l === needLetter ? "0 0 28px 8px #FFC53D" : undefined,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1, x: shake === i ? [0, -10, 10, -6, 6, 0] : 0 }}
                exit={{ scale: 0, y: -40 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`האות ${l}`}
                data-qa={qa ? (l === needLetter ? "answer" : "wrong") : undefined}
              >
                <En>{l}</En>
              </motion.button>
            ),
          )}
        </AnimatePresence>
      </div>
      <p className="text-center text-base text-cream/80">
        {r.kind === "first" ? "לחצו על הקרון עם הצליל הראשון" : "חברו את הקרונות לפי הסדר, משמאל לימין"}
      </p>
      <span className="sr-only">{r.he}</span>
    </div>
  );
}
