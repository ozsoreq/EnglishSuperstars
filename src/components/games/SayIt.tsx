"use client";
/**
 * Say It to Luna (speaking): hear the word, say it; Luna's ears perk up and
 * she repeats it back when recognised. Three tries, then "Great try!".
 */
import { m as motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { WORDS } from "@/lib/content/words";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { logSpeech } from "@/lib/store";
import { MicButton, type MicOutcome } from "../MicButton";
import { Picture } from "../Picture";
import { ReadingWord } from "../ReadingWord";
import { Pips, SpeakerButton, cheer, hearWord, shuffle, useTracker, wait, type GameProps, useRounds } from "./shared";

export function SayIt({ activity, onDone }: GameProps) {
  const rounds = useMemo(() => shuffle(activity.words).slice(0, 4), [activity.words]);
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [play, setPlay] = useState(0);
  const tracker = useTracker();
  const { round, advance: nextRound } = useRounds(rounds.length, () => onDone(tracker.result()));
  const id = rounds[round];
  const w = id ? WORDS[id] : undefined;

  useEffect(() => {
    if (!id) return;
    setTries(0);
    setBusy(false);
    handling.current = false;
    const t = setTimeout(() => {
      setPlay((p) => p + 1);
      void hearWord(id, "child");
    }, 400);
    return () => clearTimeout(t);
  }, [id]);

  const advance = async () => {
    await wait(700);
    nextRound(round);
  };

  const handling = useRef(false);
  const onResult = async ({ matched, recognized }: MicOutcome) => {
    if (!w || !id || handling.current) return;
    handling.current = true;
    setBusy(true);
    if (recognized) logSpeech(w.en, true);
    if (matched) {
      cheer(document.getElementById("say-card"), id);
      if (recognized) tracker.spoke(id);
      tracker.finish(id);
      await lunaSay(L.echoWord(w));
      await advance();
      return;
    }
    logSpeech(w.en, false);
    const n = tracker.miss(id);
    setTries(n);
    if (n >= 3) {
      await lunaSay(L.greatTry());
      tracker.finish(id);
      await advance();
    } else {
      await lunaSay(L.almostListen());
      setPlay((p) => p + 1);
      await hearWord(id, "child");
      handling.current = false;
      setBusy(false);
    }
  };

  if (!w || !id) return null;

  return (
    <div className="flex h-full flex-col items-center gap-4">
      <Pips done={round} total={rounds.length} />
      <motion.div
        id="say-card"
        key={id}
        initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="chunky flex flex-col items-center gap-2 bg-white/10 px-8 py-5"
      >
        <Picture pic={w.pic} size={110} />
        <ReadingWord text={w.en} play={play} />
        <span className="text-base text-cream/70">{w.he}</span>
      </motion.div>
      <div className="flex items-center gap-4">
        <SpeakerButton
          onClick={() => {
            setPlay((p) => p + 1);
            void hearWord(id, "child");
          }}
        />
        <MicButton target={w.en} onResult={onResult} disabled={busy} />
      </div>
      <p className="text-lg text-cream/90">{tries === 0 ? "לחצו על המיקרופון ואמרו את המילה ללונה" : `ניסיון ${tries + 1} מתוך 3`}</p>
    </div>
  );
}
