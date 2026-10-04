"use client";
/**
 * What Do We Say? (greetings, comprehension + reading): a little scene plays —
 * a friend arrives, leaves, brings a gift, offers something, asks if all is
 * well — and the child picks the English words that fit from word cards.
 */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { WORDS } from "@/lib/content/words";
import { useDebug } from "@/lib/debug";
import { GREET_SCENES, L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { En } from "../En";
import { Emoji } from "../Emoji";
import { Pips, SpeakerButton, cheer, distractors, hearWord, nudge, shuffle, useRounds, useTracker, wait, type GameProps } from "./shared";

/** How the child feels about an offer — tells them which answer fits. */
const FEELING: Record<string, string> = { yes: "😋", no: "🤢", ok: "😊" };

export function GreetTalk({ activity, onDone }: GameProps) {
  const pool = useMemo(() => activity.words.filter((id) => GREET_SCENES[id]), [activity.words]);
  const rounds = useMemo(() => shuffle(pool).slice(0, 4), [pool]);
  const tracker = useTracker();
  const qa = useDebug();
  const reduce = useReducedMotion();
  const { round, advance } = useRounds(rounds.length, () => onDone(tracker.result()));
  const [reveal, setReveal] = useState(false);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const [hearts, setHearts] = useState(false);
  const busy = useRef(false);
  const roundRef = useRef(round);
  roundRef.current = round;
  const target = rounds[round];
  const scene = target ? GREET_SCENES[target] : undefined;
  const cards = useMemo(
    () => (target ? shuffle([target, ...distractors(target, pool.length >= 3 ? pool : Object.keys(GREET_SCENES), 2)]) : []),
    [target, pool],
  );

  useEffect(() => {
    if (!target) return;
    setReveal(false);
    setHearts(false);
    busy.current = false;
    const t = setTimeout(() => void lunaSay(L.greetScene(target)), 700);
    return () => clearTimeout(t);
  }, [target]);

  const choose = async (id: string, el: HTMLElement) => {
    const mine = round;
    if (busy.current || !target || roundRef.current !== mine) return;
    if (id === target) {
      busy.current = true;
      setHearts(true);
      cheer(el, id);
      tracker.finish(target, { shown: reveal });
      await hearWord(target);
      await wait(800);
      advance(mine);
      return;
    }
    setWiggle(id);
    setTimeout(() => setWiggle(null), 500);
    const misses = tracker.miss(target);
    nudge(target, misses, misses === 1 ? L.tryAgainWord(WORDS[target]) : undefined);
    if (misses >= 2) setReveal(true);
  };

  if (!target || !scene) return null;

  const enter = { arrive: { x: 160, opacity: 0 }, leave: { x: 0, opacity: 1 }, give: { y: 0 }, offer: { y: 0 }, ask: { y: 0 } }[scene.action];
  const play = reduce
    ? {}
    : {
        arrive: { x: 0, opacity: 1 },
        leave: { x: [0, 0, -150], scale: [1, 1, 0.6], opacity: [1, 1, 0.5] },
        give: { y: [0, -8, 0] },
        offer: { y: [0, -6, 0] },
        ask: { rotate: [0, -8, 8, 0] },
      }[scene.action];

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <Pips done={round} total={rounds.length} />

      {/* The scene */}
      <div className="chunky relative h-48 w-full max-w-md overflow-hidden bg-gradient-to-b from-[#5a5aa0] to-[#7fc7a8]" dir="ltr">
        <motion.div
          key={`friend-${round}`}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-7xl"
          initial={enter}
          animate={play}
          transition={{ duration: scene.action === "leave" ? 2.4 : 1.2, delay: 0.3 }}
        >
          <Emoji e={scene.friend} />
          {(scene.action === "arrive" || scene.action === "leave") && (
            <motion.span className="absolute -right-8 top-0 text-4xl" animate={reduce ? {} : { rotate: [0, 20, -10, 20, 0] }} transition={{ duration: 1, repeat: Infinity }}>
              <Emoji e="👋" />
            </motion.span>
          )}
          {scene.prop && (
            <motion.span
              className="absolute -right-10 bottom-0 text-5xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1, x: scene.action === "give" ? [0, 30] : 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <Emoji e={scene.prop} />
            </motion.span>
          )}
          {(scene.action === "offer" || scene.action === "ask") && (
            <span className="absolute -left-6 -top-6 rounded-full bg-cream px-2 text-2xl text-night-deep">?</span>
          )}
          <AnimatePresence>
            {hearts && (
              <motion.span className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl" initial={{ y: 0, opacity: 0 }} animate={{ y: -20, opacity: 1 }} exit={{ opacity: 0 }}>
                <Emoji e="💖" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        {FEELING[target] && (
          <motion.div
            className="absolute bottom-3 right-3 grid h-16 w-16 place-items-center rounded-full bg-cream text-4xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, type: "spring" }}
            aria-label="מה אתם מרגישים"
          >
            <Emoji e={FEELING[target]} />
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SpeakerButton label="להקשיב לסיפור שוב" onClick={() => void lunaSay(L.greetScene(target))} />
        <span className="text-lg text-cream/90">מה אומרים באנגלית?</span>
      </div>

      <div className="flex flex-wrap justify-center gap-3" dir="ltr">
        {cards.map((id) => (
          <motion.button
            key={`${round}-${id}`}
            type="button"
            data-qa={qa ? (id === target ? "answer" : "wrong") : undefined}
            onClick={(e) => choose(id, e.currentTarget)}
            whileTap={{ scale: 0.9 }}
            animate={{ x: wiggle === id ? [0, -10, 10, -6, 6, 0] : 0, scale: reveal && id === target ? [1, 1.08, 1] : 1 }}
            transition={reveal && id === target ? { duration: 0.8, repeat: Infinity } : { duration: 0.4 }}
            className={`chunky flex min-h-20 min-w-28 flex-col items-center justify-center bg-cream px-4 py-2 text-night-deep ${reveal && id === target ? "ring-4 ring-gold" : ""}`}
          >
            <En className="font-bold">
              <span style={{ fontSize: 30 }}>{WORDS[id].en}</span>
            </En>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
