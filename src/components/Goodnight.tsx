"use client";
/** The daily time cap ends calmly: a goodnight scene, and the stars stay safe in the jar. */
import { motion } from "motion/react";
import { useEffect } from "react";
import { sfx } from "@/lib/audio";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { Btn } from "./Btn";
import { En } from "./En";
import { Emoji } from "@/components/Emoji";

export function Goodnight({ name, reason, onParent }: { name: string; reason: "limit" | "bedtime"; onParent: () => void }) {
  useEffect(() => {
    sfx("goodnight");
    const t = setTimeout(
      () =>
        void lunaSay(L.goodnight(name, reason)),
      800,
    );
    return () => clearTimeout(t);
  }, [name, reason]);

  return (
    <motion.div
      className="stars-bg fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-night-deep/95 px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      <motion.div className="text-8xl" animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 8, repeat: Infinity }}>
        <Emoji e="🌙" />
      </motion.div>
      <motion.div className="text-7xl" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Emoji e="🦊" /><Emoji e="💤" />
      </motion.div>
      <h1 className="text-3xl font-bold">לילה טוב, {name}!</h1>
      <p className="max-w-md text-lg text-cream/85">
        {reason === "bedtime" ? "האי הולך לישון. נתראה מחר בבוקר!" : <>סיימנו את ההרפתקה של היום. הכוכבים שמורים בצנצנת <Emoji e="⭐" /></>}
      </p>
      <p className="text-2xl text-lavender">
        <En>Good night!</En>
      </p>
      <Btn tone="ghost" className="mt-8 text-sm opacity-70" onClick={onParent}>
        🔒 הורים
      </Btn>
    </motion.div>
  );
}
