"use client";
/**
 * Celebrate in proportion: 1 = a sparkle, 2 = confetti, 3 = fireworks.
 * With prefers-reduced-motion it shrinks to a glow and a sound.
 */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/audio";
import { on } from "@/lib/events";

const COLORS = ["#FFC53D", "#FF8FA3", "#7FE3C4", "#B9A7F5", "#FFF4D6", "#5AB8D6"];

export function Celebration() {
  const [burst, setBurst] = useState<{ id: number; size: 1 | 2 | 3 } | null>(null);
  const reduce = useReducedMotion();

  useEffect(
    () =>
      on("celebrate", ({ size }) => {
        sfx(size === 3 ? "fanfare" : "chime", size * 3);
        const id = Date.now();
        setBurst({ id, size });
        setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), size === 3 ? 3200 : 2000);
      }),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {burst && reduce && (
          <motion.div
            key={burst.id}
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, #FFC53D55, transparent 60%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        {burst && !reduce && burst.size === 1 && <Sparkle key={burst.id} x={50} y={45} count={14} />}
        {burst && !reduce && burst.size === 2 && <Confetti key={burst.id} />}
        {burst && !reduce && burst.size === 3 && (
          <motion.div key={burst.id} className="absolute inset-0" exit={{ opacity: 0 }}>
            <Confetti />
            {[
              [25, 30, 0],
              [70, 25, 0.4],
              [50, 45, 0.8],
              [30, 55, 1.2],
              [75, 50, 1.5],
            ].map(([x, y, d], i) => (
              <Sparkle key={i} x={x} y={y} count={18} delay={d} big />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sparkle({ x, y, count, delay = 0, big = false }: { x: number; y: number; count: number; delay?: number; big?: boolean }) {
  return (
    <motion.div className="absolute" style={{ left: `${x}%`, top: `${y}%` }} exit={{ opacity: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = big ? 140 : 90;
        return (
          <motion.span
            key={i}
            className="absolute block rounded-full"
            style={{ width: big ? 10 : 8, height: big ? 10 : 8, background: COLORS[i % COLORS.length], boxShadow: `0 0 12px ${COLORS[i % COLORS.length]}` }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0, 1.4, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 1.1, delay, ease: "easeOut" }}
          />
        );
      })}
    </motion.div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 48 }, (_, i) => i);
  return (
    <motion.div className="absolute inset-0" exit={{ opacity: 0 }}>
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const rot = (i * 73) % 360;
        return (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: `${left}%`, top: -20, width: 10, height: 16, borderRadius: 4, background: COLORS[i % COLORS.length] }}
            initial={{ y: -20, rotate: rot }}
            animate={{ y: "110vh", rotate: rot + 540, x: [0, (i % 2 ? 1 : -1) * 30, 0] }}
            transition={{ duration: 2 + (i % 5) * 0.25, delay: (i % 8) * 0.06, ease: "easeIn" }}
          />
        );
      })}
    </motion.div>
  );
}
