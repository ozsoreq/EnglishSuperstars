"use client";
/** The star jar with Pip the star. Fill shows progress toward the saving goal. */
import { m as motion } from "framer-motion";
import { useEffect, useState } from "react";
import { item } from "@/lib/catalog";
import { balance } from "@/lib/ledger";
import type { Profile } from "@/lib/store";
import { Emoji } from "@/components/Emoji";

export const JAR_BUMP = "kochavim:jar-bump";

export function goalFor(p: Profile): { id: string; price: number; emoji: string } {
  const g = p.savingGoal ? item(p.savingGoal) : undefined;
  if (g && !p.owned.includes(g.id)) return { id: g.id, price: g.price, emoji: g.emoji };
  return { id: "", price: 100, emoji: "⭐" };
}

export function StarJar({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const stars = balance(profile.ledger);
  const goal = goalFor(profile);
  const fill = Math.min(1, stars / goal.price);
  // Each landing star bumps a counter; the jar re-runs its wobble per bump.
  const [bumps, setBumps] = useState(0);

  useEffect(() => {
    const bump = () => setBumps((n) => n + 1);
    window.addEventListener(JAR_BUMP, bump);
    return () => window.removeEventListener(JAR_BUMP, bump);
  }, []);

  const h = compact ? 52 : 64;
  return (
    <div className="flex items-center gap-2" aria-label={`${stars} כוכבים`}>
      <motion.div
        id="star-jar"
        key={bumps}
        initial={false}
        animate={bumps ? { scale: [1, 1.18, 0.95, 1], rotate: [0, -6, 4, 0] } : undefined}
        transition={{ duration: 0.45 }}
        className="relative"
        style={{ width: h * 0.85, height: h }}
      >
        <svg viewBox="0 0 60 72" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <clipPath id="jar-clip">
              <path d="M10 22h40v40a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" />
            </clipPath>
          </defs>
          <rect x="14" y="8" width="32" height="10" rx="4" fill="#B9A7F5" stroke="#1D1F45" strokeWidth="3" />
          <path d="M10 22h40v40a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" fill="#ffffff22" stroke="#1D1F45" strokeWidth="3" />
          <g clipPath="url(#jar-clip)">
            <motion.rect
              x="0"
              width="60"
              height="72"
              fill="#FFC53D"
              initial={false}
              animate={{ y: 70 - fill * 48 }}
              transition={{ type: "spring", stiffness: 80, damping: 14 }}
            />
          </g>
          {/* Pip */}
          <g transform="translate(30 46)">
            <path d="M0-11l3.3 6.8 7.5 1-5.4 5.3 1.3 7.4L0 6l-6.7 3.5 1.3-7.4-5.4-5.3 7.5-1z" fill="#FFF4D6" stroke="#1D1F45" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="-2.4" cy="-1" r="1.1" fill="#1D1F45" />
            <circle cx="2.4" cy="-1" r="1.1" fill="#1D1F45" />
          </g>
          <path d="M16 28v28" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </motion.div>
      <div className="leading-tight">
        <div className="text-2xl font-black text-gold" style={{ direction: "ltr" }}>
          {stars}
        </div>
        {!compact && goal.id && (
          <div className="text-xs text-cream/80">
            חוסכים ל־<Emoji e={goal.emoji} /> ({goal.price})
          </div>
        )}
      </div>
    </div>
  );
}
