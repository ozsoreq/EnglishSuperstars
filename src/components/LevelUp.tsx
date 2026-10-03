"use client";
/** Level-up: the avatar spins and a ribbon unfurls with the new level number. */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/audio";
import { emit, on } from "@/lib/events";
import type { Profile } from "@/lib/store";
import { Avatar } from "./Avatar";
import { Emoji } from "@/components/Emoji";

export function LevelUp({ profile }: { profile: Profile }) {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(
    () =>
      on("level.up", ({ level }) => {
        setTimeout(() => {
          setLevel(level);
          sfx("fanfare");
          emit("celebrate", { size: 2 });
        }, 1800);
        setTimeout(() => setLevel(null), 5200);
      }),
    [],
  );

  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          className="fixed inset-0 z-[55] grid place-items-center bg-night-deep/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setLevel(null)}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div initial={{ rotate: 0, scale: 0.5 }} animate={{ rotate: 720, scale: 1.4 }} transition={{ duration: 1.2, ease: "easeOut" }}>
              <Avatar profile={profile} size={90} />
            </motion.div>
            <motion.div
              className="chunky bg-coral px-10 py-3 text-3xl font-black text-night-deep"
              initial={{ clipPath: "inset(0 50% 0 50%)" }}
              animate={{ clipPath: "inset(0 0% 0 0%)" }}
              transition={{ delay: 1, duration: 0.7, ease: "easeOut" }}
            >
              רמה {level}! <Emoji e="🎀" anim="wiggle" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
