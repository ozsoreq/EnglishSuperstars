"use client";
/**
 * A quest at one place on the island: arrive, discover the problem, complete
 * three challenges (warm-up, new words, practice), see the place restored,
 * open the treasure, then the star moment.
 */
import { AnimatePresence, m as motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { preloadSpeech, sfx, stopSpeaking } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { findChapter } from "@/lib/content/islands";
import type { ActivityType, Island } from "@/lib/content/types";
import { dayKey } from "@/lib/dates";
import { emit } from "@/lib/events";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import type { QuestOverride } from "@/lib/debug";
import { buildMission, starsFor, type ActivityResult } from "@/lib/mission";
import { completeActivity, completeMission, type MissionReward, type Profile } from "@/lib/store";
import { Btn } from "../Btn";
import { En } from "../En";
import { Caption } from "../Caption";
import { Luna } from "../Luna";
import { StarJar } from "../StarJar";
import { BubblePop } from "../games/BubblePop";
import { Detective } from "../games/Detective";
import { MemoryGarden } from "../games/MemoryGarden";
import { SayIt } from "../games/SayIt";
import { SoundTrain } from "../games/SoundTrain";
import { StoryMoment } from "../games/StoryMoment";
import type { GameProps } from "../games/shared";
import { Emoji } from "@/components/Emoji";

const GAMES: Record<ActivityType, (p: GameProps) => React.ReactNode> = {
  bubble: BubblePop,
  say: SayIt,
  memory: MemoryGarden,
  train: SoundTrain,
  detective: Detective,
  story: StoryMoment,
};

const GAME_NAMES: Record<ActivityType, { he: string; icon: string }> = {
  bubble: { he: "בועות קסם", icon: "🫧" },
  say: { he: "אומרים ללונה", icon: "🎤" },
  memory: { he: "גן הזיכרון", icon: "🌷" },
  train: { he: "רכבת הצלילים", icon: "🚂" },
  detective: { he: "הבלשית b/d", icon: "🔍" },
  story: { he: "מילות הקסם", icon: "✨" },
};

const ROLE_NAMES = { warmup: "חימום", new: "מילים חדשות", practice: "אימון" } as const;

type Phase = { kind: "arrive" } | { kind: "play"; step: number } | { kind: "restored" } | { kind: "stars" };

export function Quest({
  profile,
  chapterId,
  onExit,
  onCamp,
  override,
  debug = false,
}: {
  profile: Profile;
  chapterId: string;
  onExit: () => void;
  onCamp: () => void;
  /** Debug mode: play one specific activity, or force first visit / revisit. */
  override?: QuestOverride;
  debug?: boolean;
}) {
  const { chapter, island } = findChapter(chapterId);
  const realVisits = profile.visits[chapterId] ?? 0;
  const visits = override?.visit === "first" ? 0 : override?.visit === "revisit" ? Math.max(1, realVisits) : realVisits;
  const [missionId] = useState(() => `${chapterId}:${Date.now().toString(36)}`);
  const activities = useMemo(
    () =>
      override?.only
        ? [{ type: override.only, role: override.only === "story" ? ("new" as const) : ("practice" as const), words: chapter.words }]
        : buildMission(chapter, profile.memory, dayKey(), visits),
    // Build once per quest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [missionId],
  );
  const [phase, setPhase] = useState<Phase>({ kind: "arrive" });
  const [earned, setEarned] = useState(0);
  const [stepStars, setStepStars] = useState<number[]>([]);
  const [reward, setReward] = useState<MissionReward | null>(null);
  const [between, setBetween] = useState(false);
  // Fixed for this quest: completing it bumps `visits` mid-screen.
  const [firstVisit] = useState(visits === 0);
  const hebrewFirst = island.index < 4;
  const done = useRef(false);

  useEffect(() => () => stopSpeaking(), []);

  // Warm up the voice for this quest so prompts play without a pause.
  useEffect(() => {
    const words = [...new Set(activities.flatMap((a) => a.words))].map((id) => WORDS[id]?.en).filter(Boolean) as string[];
    preloadSpeech([
      { text: chapter.problem.he, lang: "he" },
      { text: chapter.problem.en, lang: "en" },
      ...words.map((w) => ({ text: w, lang: "en" as const, kind: "word" as const })),
      ...activities.map((a) => ({ text: chapter.gameIntro[a.type as keyof typeof chapter.gameIntro] ?? "", lang: "he" as const })).filter((x) => x.text),
    ]);
  }, [activities, chapter]);

  // Arrival: Luna tells the problem.
  useEffect(() => {
    if (phase.kind !== "arrive") return;
    const t = setTimeout(() => {
      if (firstVisit) void lunaSay(L.problem(chapter), { englishFirst: !hebrewFirst });
      else void lunaSay(L.welcomeBack(chapter));
    }, 600);
    return () => clearTimeout(t);
  }, [phase.kind, chapter, firstVisit, hebrewFirst]);

  // Each challenge starts with its story line.
  useEffect(() => {
    if (phase.kind !== "play") return;
    const a = activities[phase.step];
    if (a.type !== "story") void lunaSay(L.gameIntro(chapter, a.type));
  }, [phase, activities, chapter]);

  const handledSteps = useRef(new Set<number>());
  const onActivityDone = async (step: number, result: ActivityResult) => {
    if (handledSteps.current.has(step)) return;
    handledSteps.current.add(step);
    const r = completeActivity(missionId, step, result);
    const total = r.stars + r.speakStars + r.masteredStars;
    setEarned((e) => e + total);
    setStepStars((s) => [...s, starsFor(result)]);
    if (total > 0) emit("star.earned", { amount: total });
    if (r.newlyGold.length) void lunaSay(L.wordWentGold());

    // Every 3rd activity ends with a celebration scaled to the result.
    if (step === activities.length - 1) emit("celebrate", { size: starsFor(result) });

    setBetween(true);
    await new Promise((res) => setTimeout(res, 1600));
    setBetween(false);
    if (step + 1 < activities.length) setPhase({ kind: "play", step: step + 1 });
    else finish();
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const m = completeMission(chapterId);
    setReward(m);
    const bonus = m.missionBonus + m.streakBonus + m.islandBonus;
    setEarned((e) => e + bonus);
    setPhase({ kind: "restored" });
    sfx("fanfare");
    if (firstVisit) {
      emit("celebrate", { size: 3 });
      void lunaSay(L.resolved(chapter), { englishFirst: !hebrewFirst });
    } else {
      emit("celebrate", { size: 2 });
      void lunaSay(L.shinesMore(chapter));
    }
    setTimeout(() => {
      if (bonus > 0) emit("star.earned", { amount: bonus });
    }, 1200);
  };

  const exit = () => {
    stopSpeaking();
    onExit();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <Btn tone="ghost" onClick={exit} aria-label="חזרה למפה" className="text-2xl">
          <Emoji e="🗺️" />
        </Btn>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-sm text-cream/70">{chapter.quest}</span>
          <h1 className="text-xl font-bold">
            <Emoji e={chapter.landmark} /> {chapter.name.he}
          </h1>
        </div>
        {debug && (phase.kind === "play" || phase.kind === "arrive") && (
          <Btn
            tone="lavender"
            className="px-3 text-sm"
            aria-label="Debug: skip this step"
            onClick={() => {
              stopSpeaking();
              if (phase.kind === "arrive") setPhase({ kind: "play", step: 0 });
              else {
                const n = activities[phase.step].words.length;
                void onActivityDone(phase.step, { firstTry: n, total: n, quality: {}, spoken: [] });
              }
            }}
          >
            ⏭ skip
          </Btn>
        )}
        <StarJar profile={profile} compact />
      </header>

      {/* Quest path: three challenge stones, right to left in Hebrew */}
      {phase.kind === "play" && (
        <div className="mt-2 flex items-center justify-center gap-2" aria-label="שלבי המשימה">
          {activities.map((a, i) => {
            const state = i < phase.step ? "done" : i === phase.step ? "now" : "next";
            return (
              <div key={i} className="flex items-center gap-2">
                <motion.div
                  className={`chunky grid h-12 w-12 place-items-center text-2xl ${state === "done" ? "bg-gold" : state === "now" ? "bg-mint" : "bg-white/15"}`}
                  animate={{ scale: state === "now" ? [1, 1.08, 1] : 1 }}
                  transition={{ duration: 2, repeat: state === "now" ? Infinity : 0 }}
                  title={ROLE_NAMES[a.role]}
                >
                  <Emoji e={state === "done" ? "⭐" : GAME_NAMES[a.type].icon} anim={state === "now" ? "breathe" : undefined} />
                </motion.div>
                {i < activities.length - 1 && <span className="h-1 w-6 rounded bg-white/25" />}
              </div>
            );
          })}
        </div>
      )}

      <section className="relative flex flex-1 flex-col items-center px-4 pb-24 pt-3">
        <AnimatePresence mode="wait">
          {phase.kind === "arrive" && (
            <motion.section
              key="arrive"
              className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <motion.div
                className="text-[120px] leading-none"
                animate={{ filter: firstVisit ? "grayscale(1) brightness(0.7)" : "grayscale(0)", y: [0, -6, 0] }}
                transition={{ y: { duration: 5, repeat: Infinity } }}
              >
                <Emoji e={chapter.landmark} size="1em" />
              </motion.div>
              <div className="max-w-md">
                <p className="text-xl leading-relaxed">{firstVisit ? chapter.problem.he : `חזרנו ל${chapter.name.he}!`}</p>
                <p className="mt-2 text-2xl font-bold text-lavender">
                  <En>{firstVisit ? chapter.problem.en : "Welcome back!"}</En>
                </p>
              </div>
              <Luna size={130} bubble={false} />
              <Btn tone="gold" className="px-10 text-2xl" onClick={() => setPhase({ kind: "play", step: 0 })}>
                {firstVisit ? "יוצאים להרפתקה! ✨" : "מתחילים!"}
              </Btn>
            </motion.section>
          )}

          {phase.kind === "play" && (
            <motion.section
              key={`play-${phase.step}`}
              className="flex w-full max-w-2xl flex-1 flex-col items-center"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: between ? 0.4 : 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
            >
              <Caption className="mb-1 w-full" />
              <div className="mb-2 flex items-center gap-2 text-lg font-bold text-mint">
                <Emoji e={GAME_NAMES[activities[phase.step].type].icon} />
                <span>{GAME_NAMES[activities[phase.step].type].he}</span>
                <span className="text-sm font-normal text-cream/60">· {ROLE_NAMES[activities[phase.step].role]}</span>
              </div>
              <div className="w-full flex-1" style={{ pointerEvents: between ? "none" : undefined }}>
                {(() => {
                  const Game = GAMES[activities[phase.step].type];
                  return <Game activity={activities[phase.step]} chapter={chapter} onDone={(r) => onActivityDone(phase.step, r)} />;
                })()}
              </div>
            </motion.section>
          )}

          {phase.kind === "restored" && (
            <motion.section
              key="restored"
              className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-[130px] leading-none glow-gold"
                initial={{ filter: "grayscale(1)" }}
                animate={{ filter: "grayscale(0)", rotate: [0, -4, 4, 0] }}
                transition={{ duration: 1.4 }}
              >
                {chapter.landmark}
              </motion.div>
              <p className="max-w-md text-xl leading-relaxed">{firstVisit ? chapter.resolved.he : "המקום זוהר ושמח שחזרתם!"}</p>
              {firstVisit && (
                <motion.div
                  className="chunky flex items-center gap-3 bg-cream px-5 py-3 text-night-deep"
                  initial={{ y: 60, opacity: 0, rotate: -10 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ delay: 1, type: "spring", stiffness: 200, damping: 12 }}
                >
                  <motion.span className="text-5xl" animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 1.6, duration: 0.8 }}>
                    <Emoji e={chapter.treasure.emoji} size="1em" />
                  </motion.span>
                  <div className="text-start">
                    <div className="text-sm">מצאתם אוצר!</div>
                    <div className="text-lg font-bold">{chapter.treasure.he}</div>
                    <En className="text-base text-[#5b4bc4]">{chapter.treasure.en}</En>
                  </div>
                </motion.div>
              )}
              <Btn tone="gold" className="px-10 text-2xl" onClick={() => setPhase({ kind: "stars" })}>
                הלאה ⭐
              </Btn>
            </motion.section>
          )}

          {phase.kind === "stars" && reward && (
            <StarMoment
              key="stars"
              earned={earned}
              stepStars={stepStars}
              reward={reward}
              island={island}
              trophy={chapter.treasure.emoji}
              onMap={exit}
              onCamp={() => {
                stopSpeaking();
                onCamp();
              }}
            />
          )}
        </AnimatePresence>
      </section>

      {phase.kind === "play" && (
        <div className="pointer-events-none fixed bottom-2 start-2 z-30 sm:bottom-4 sm:start-4">
          <Luna size={84} bubble={false} />
        </div>
      )}
    </div>
  );
}

function StarMoment({
  earned,
  stepStars,
  reward,
  island,
  trophy,
  onMap,
  onCamp,
}: {
  earned: number;
  stepStars: number[];
  reward: MissionReward;
  island: Island;
  trophy: string;
  onMap: () => void;
  onCamp: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      if (reward.islandComplete && reward.islandBonus) {
        emit("celebrate", { size: 3 });
        void lunaSay(L.islandDone(island));
      } else if (reward.missionBonus) {
        void lunaSay(L.missionDone());
      } else {
        void lunaSay(L.wellDone());
      }
    }, 500);
    return () => clearTimeout(t);
  }, [reward, island]);

  return (
    <motion.section
      className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex gap-3" aria-label="כוכבים לכל אתגר">
        {stepStars.map((n, i) => (
          <motion.div
            key={i}
            className="chunky flex bg-white/10 px-3 py-2 text-2xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.25, type: "spring" }}
          >
            {Array.from({ length: n }, (_, k) => (
              <Emoji key={k} e="⭐" />
            ))}
            <span className="opacity-25 grayscale">
              {Array.from({ length: 3 - n }, (_, k) => (
                <Emoji key={k} e="⭐" />
              ))}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="text-5xl font-black text-gold glow-gold" style={{ direction: "ltr" }}>
        +{earned} <Emoji e="⭐" anim="spin" />
      </div>
      <ul className="space-y-1 text-lg">
        {reward.missionBonus > 0 && (
          <li>
            <Emoji e="🎯" /> בונוס משימה יומית: <Plus n={reward.missionBonus} />
          </li>
        )}
        {reward.streakBonus > 0 && (
          <li>
            <Emoji e="🔥" /> רצף של {reward.streakCount} ימים: <Plus n={reward.streakBonus} />
            {reward.usedSnowDay && <> (יום שלג <Emoji e="❄️" /> שמר על הרצף)</>}
          </li>
        )}
        {reward.islandBonus > 0 && (
          <li>
            <Emoji e={trophy} /> סיימתם את האי: <Plus n={reward.islandBonus} />
          </li>
        )}
      </ul>
      {reward.streakBonus > 0 && (
        <motion.div className="text-6xl" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: 2 }}>
          <Emoji e="🔥" />
        </motion.div>
      )}
      <Luna size={120} bubble bubbleSide="top" />
      <div className="flex flex-wrap justify-center gap-3">
        <Btn tone="coral" className="text-xl" onClick={onCamp}>
          ⛺ למחנה — לבזבז כוכבים
        </Btn>
        <Btn tone="mint" className="text-xl" onClick={onMap}>
          🧭 להמשיך לחקור
        </Btn>
      </div>
    </motion.section>
  );
}

/** A "+N" that stays "+N" inside right-to-left text. */
function Plus({ n }: { n: number }) {
  return <bdi dir="ltr">+{n}</bdi>;
}
