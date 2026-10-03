"use client";
/** The explorer: the child's avatar with any gear they've bought. */
import { item } from "@/lib/catalog";
import type { Profile } from "@/lib/store";

export function Avatar({ profile, size = 64 }: { profile: Pick<Profile, "avatar" | "equipped">; size?: number }) {
  const g = (slot: keyof Profile["equipped"]) => {
    const id = profile.equipped[slot];
    return id ? item(id)?.emoji : undefined;
  };
  const head = g("head");
  const face = g("face");
  const back = g("back");
  const hand = g("hand");
  return (
    <span className="relative inline-block" style={{ width: size, height: size, fontSize: size * 0.8, lineHeight: 1 }} aria-hidden>
      {back && (
        <span className="absolute" style={{ fontSize: size * 0.55, top: size * 0.25, insetInlineEnd: size * 0.62 }}>
          {back}
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center">{profile.avatar}</span>
      {head && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ fontSize: size * 0.5, top: -size * 0.32 }}>
          {head}
        </span>
      )}
      {face && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ fontSize: size * 0.32, top: size * 0.22 }}>
          {face}
        </span>
      )}
      {hand && (
        <span className="absolute" style={{ fontSize: size * 0.42, bottom: 0, insetInlineStart: size * 0.72 }}>
          {hand}
        </span>
      )}
    </span>
  );
}
