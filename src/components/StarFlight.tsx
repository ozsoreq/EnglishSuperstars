"use client";
/** Earned stars fly on an arc from the activity into the jar, chiming up the scale. */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/audio";
import { on } from "@/lib/events";
import { JAR_BUMP } from "./StarJar";
import { Emoji } from "@/components/Emoji";

interface Flying {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  step: number;
}

let nextId = 1;

export function StarFlight() {
  const [stars, setStars] = useState<Flying[]>([]);
  const reduce = useReducedMotion();

  useEffect(
    () =>
      on("star.earned", ({ amount, x, y }) => {
        const jar = document.getElementById("star-jar")?.getBoundingClientRect();
        const to = jar ? { x: jar.left + jar.width / 2, y: jar.top + jar.height / 2 } : { x: window.innerWidth - 40, y: 40 };
        const from = { x: x ?? window.innerWidth / 2, y: y ?? window.innerHeight / 2 };
        const n = Math.min(amount, 12);
        if (reduce) {
          for (let i = 0; i < n; i++) setTimeout(() => sfx("chime", i), i * 90);
          window.dispatchEvent(new Event(JAR_BUMP));
          return;
        }
        const batch = Array.from({ length: n }, (_, i) => ({ id: nextId++, from, to, delay: i * 0.12, step: i }));
        setStars((s) => [...s, ...batch]);
      }),
    [reduce],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      <AnimatePresence>
        {stars.map((s) => {
          const midX = (s.from.x + s.to.x) / 2 + (s.step % 2 ? 40 : -40);
          const midY = Math.min(s.from.y, s.to.y) - 140;
          return (
            <motion.div
              key={s.id}
              className="absolute text-3xl glow-gold"
              style={{ left: 0, top: 0 }}
              initial={{ x: s.from.x - 16, y: s.from.y - 16, scale: 0.4, opacity: 0 }}
              animate={{
                x: [s.from.x - 16, midX - 16, s.to.x - 16],
                y: [s.from.y - 16, midY - 16, s.to.y - 16],
                scale: [0.4, 1.3, 0.6],
                opacity: [0, 1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 0.9, delay: s.delay, ease: "easeInOut" }}
              onAnimationComplete={() => {
                sfx("chime", s.step);
                window.dispatchEvent(new Event(JAR_BUMP));
                setStars((all) => all.filter((x) => x.id !== s.id));
              }}
            >
              <Emoji e="⭐" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
