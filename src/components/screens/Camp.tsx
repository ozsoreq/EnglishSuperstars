"use client";
/**
 * Explorer's Camp: where stars are spent on visible, permanent things —
 * explorer gear, camp builds, pet companions (who learn English tricks),
 * and parent-defined real-world wishes.
 */
import { AnimatePresence, m as motion } from "framer-motion";
import { useState } from "react";
import { sayWord, sfx } from "@/lib/audio";
import { CAMP, GEAR, PETS, PET_FOOD_PRICE, PET_HAPPY_DAYS, PET_TRICKS, item, type ShopItem } from "@/lib/catalog";
import { dayKey, daysBetween } from "@/lib/dates";
import { emit } from "@/lib/events";
import { balance } from "@/lib/ledger";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import {
  buyItem,
  equip,
  feedPet,
  learnTrick,
  requestReward,
  updateProfile,
  useFamily,
  type Profile,
} from "@/lib/store";
import { Avatar } from "../Avatar";
import { Btn } from "../Btn";
import { En } from "../En";
import { Luna } from "../Luna";
import { MicButton } from "../MicButton";
import { StarJar } from "../StarJar";
import { Emoji, EmojiText } from "@/components/Emoji";

type Tab = "gear" | "camp" | "pets" | "wishes";

const TABS: { id: Tab; he: string; icon: string }[] = [
  { id: "gear", he: "ציוד", icon: "🎒" },
  { id: "camp", he: "המחנה", icon: "⛺" },
  { id: "pets", he: "חיות", icon: "🐾" },
  { id: "wishes", he: "משאלות", icon: "🎁" },
];

export function Camp({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("gear");
  const stars = balance(profile.ledger);
  const ownedCamp = CAMP.filter((c) => profile.owned.includes(c.id));
  const pet = profile.activePet ? item(profile.activePet) : undefined;

  const buy = (it: ShopItem, el: HTMLElement) => {
    const r = buyItem(it.id);
    if (r === "ok") {
      sfx("fanfare");
      const rect = el.getBoundingClientRect();
      emit("celebrate", { size: it.price >= 100 ? 3 : 2 });
      emit("answer.correct", { x: rect.left, y: rect.top });
      void lunaSay(L.bought(it));
      if (it.kind === "gear") equip(it.slot, it.id);
    } else if (r === "insufficient") {
      sfx("soft");
      void lunaSay(L.needMoreStars(it));
    }
  };

  const saveFor = (it: ShopItem) => {
    sfx("chime");
    updateProfile({ savingGoal: it.id });
    void lunaSay(L.savingFor(it));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-3 px-4 pb-10 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between">
        <Btn tone="ghost" onClick={onBack} className="text-2xl" aria-label="חזרה">
          <Emoji e="➜" />
        </Btn>
        <h1 className="text-2xl font-bold">
          <Emoji e="⛺" /> מחנה המגלים
        </h1>
        <StarJar profile={profile} />
      </header>

      {/* Camp scene: everything bought stays here */}
      <section className="chunky relative h-44 overflow-hidden bg-gradient-to-b from-[#3d3f7a] via-[#5a5aa0] to-sand">
        <div className="stars-bg twinkle absolute inset-0" />
        <div className="absolute bottom-3 start-4 flex items-end gap-2">
          <Avatar profile={profile} size={64} />
          {pet && (
            <motion.span className="text-4xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 1, repeat: Infinity }}>
              <Emoji e={pet.emoji} />
            </motion.span>
          )}
        </div>
        <div className="absolute bottom-2 end-3 flex max-w-[60%] flex-wrap-reverse justify-end gap-1 text-4xl">
          {ownedCamp.map((c) => (
            <motion.span key={c.id} initial={{ scale: 0, y: -30 }} animate={{ scale: [0, 1.25, 0.9, 1], y: 0 }} transition={{ duration: 0.5 }} title={c.he}>
              <Emoji e={c.emoji} />
            </motion.span>
          ))}
          {ownedCamp.length === 0 && <span className="text-base text-night-deep/70">המחנה מחכה לבנייה…</span>}
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <Btn key={t.id} tone={tab === t.id ? "gold" : "ghost"} onClick={() => setTab(t.id)} className="flex flex-col items-center px-1 text-sm">
            <span className="text-2xl">{t.icon}</span>
            {t.he}
          </Btn>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === "gear" && <Shop items={GEAR} profile={profile} stars={stars} onBuy={buy} onSave={saveFor} />}
          {tab === "camp" && <Shop items={CAMP} profile={profile} stars={stars} onBuy={buy} onSave={saveFor} />}
          {tab === "pets" && (
            <>
              <Pets profile={profile} />
              <Shop items={PETS} profile={profile} stars={stars} onBuy={buy} onSave={saveFor} />
            </>
          )}
          {tab === "wishes" && <Wishes profile={profile} stars={stars} />}
        </motion.section>
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-3 start-3 z-30">
        <Luna size={90} bubbleSide="above-start" />
      </div>
    </div>
  );
}

function Shop({
  items,
  profile,
  stars,
  onBuy,
  onSave,
}: {
  items: ShopItem[];
  profile: Profile;
  stars: number;
  onBuy: (it: ShopItem, el: HTMLElement) => void;
  onSave: (it: ShopItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((it) => {
        const owned = profile.owned.includes(it.id);
        const equipped = it.kind === "gear" && profile.equipped[it.slot] === it.id;
        const canBuy = stars >= it.price;
        const saving = profile.savingGoal === it.id;
        return (
          <div key={it.id} className="chunky flex flex-col items-center gap-1 bg-white/10 p-3 text-center">
            <motion.span className="text-5xl" whileTap={{ scale: 1.2 }} onClick={() => void sayWord(it.en)}>
              <Emoji e={it.emoji} />
            </motion.span>
            <span className="font-bold">{it.he}</span>
            <En className="text-lg text-lavender">{it.en}</En>
            {owned ? (
              it.kind === "gear" ? (
                <Btn tone={equipped ? "mint" : "ghost"} className="w-full text-base" onClick={() => equip(it.slot, equipped ? undefined : it.id)}>
                  {equipped ? "✓ לבוש" : "ללבוש"}
                </Btn>
              ) : (
                <span className="py-3 text-mint">✓ שלכם</span>
              )
            ) : (
              <div className="flex w-full flex-col gap-1">
                <Btn tone={canBuy ? "gold" : "ghost"} className="w-full text-base" onClick={(e) => onBuy(it, e.currentTarget)}>
                  <span style={{ direction: "ltr", display: "inline-block" }}>{it.price} ⭐</span>
                </Btn>
                {!canBuy && (
                  <button type="button" className="min-h-14 text-sm text-cream/80 underline" onClick={() => onSave(it)}>
                    {saving ? <><Emoji e="🫙" /> חוסכים לזה</> : "לחסוך לזה"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Pets({ profile }: { profile: Profile }) {
  const [trickAnim, setTrickAnim] = useState<{ pet: string; trick: string } | null>(null);
  if (profile.pets.length === 0) {
    return <p className="mb-3 text-center text-cream/80">אמצו חבר לדרך! חיות מחמד הולכות איתכם במפה ולומדות טריקים באנגלית.</p>;
  }
  const today = dayKey();
  return (
    <div className="mb-4 flex flex-col gap-3">
      {profile.pets.map((p) => {
        const it = item(p.itemId)!;
        const sleepy = daysBetween(p.fedDay, today) >= PET_HAPPY_DAYS;
        const anim = trickAnim?.pet === p.itemId ? trickAnim.trick : null;
        return (
          <div key={p.itemId} className="chunky flex flex-col gap-2 bg-white/10 p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-6xl"
                animate={
                  anim === "jump"
                    ? { y: [0, -50, 0] }
                    : anim === "spin"
                      ? { rotate: [0, 360] }
                      : anim === "dance"
                        ? { rotate: [0, -15, 15, -15, 15, 0], y: [0, -10, 0, -10, 0] }
                        : anim === "sit"
                          ? { scaleY: [1, 0.75, 0.75, 1] }
                          : { y: sleepy ? 0 : [0, -4, 0] }
                }
                transition={anim ? { duration: 0.9 } : { duration: 2, repeat: Infinity }}
                onAnimationComplete={() => anim && setTrickAnim(null)}
              >
                <Emoji e={it.emoji} />
              </motion.span>
              <div>
                <div className="font-bold">
                  {it.he} <Emoji e={sleepy ? "💤" : "💖"} anim="breathe" />
                </div>
                <div className="text-sm text-cream/70">{sleepy ? "מנומנם ומחכה לכם" : "שמח ושבע"}</div>
                <div className="mt-1 flex gap-2">
                  <Btn
                    tone="mint"
                    className="text-sm"
                    onClick={() => {
                      const r = feedPet(p.itemId);
                      if (r === "ok") {
                        sfx("pop");
                        void lunaSay(L.yummy());
                      } else if (r === "insufficient") void lunaSay(L.needFood());
                    }}
                    disabled={p.fedDay === today}
                  >
                    🍖 להאכיל · <bdi dir="ltr">{PET_FOOD_PRICE} ⭐</bdi>
                  </Btn>
                  {profile.activePet !== p.itemId && (
                    <Btn tone="ghost" className="text-sm" onClick={() => updateProfile({ activePet: p.itemId })}>
                      לקחת להרפתקה
                    </Btn>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
              {PET_TRICKS.map((t) => (
                <div key={t.id} className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 p-2">
                  <En className="text-2xl font-bold">{t.en}</En>
                  <MicButton
                    size={56}
                    target={t.en}
                    onResult={({ matched }) => {
                      if (matched) {
                        learnTrick(p.itemId, t.id);
                        setTrickAnim({ pet: p.itemId, trick: t.id });
                        emit("answer.correct", {});
                        void sayWord(t.en);
                      } else {
                        void lunaSay(L.petDidntHear());
                      }
                    }}
                  />
                  {p.tricks.includes(t.id) && <span className="text-xs text-mint">✓ יודע</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Wishes({ profile, stars }: { profile: Profile; stars: number }) {
  const { parent } = useFamily();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-cream/80">משאלות אמיתיות שההורים הכינו. הם יאשרו כשתבקשו.</p>
      {parent.rewards.map((r) => (
        <div key={r.id} className="chunky flex items-center justify-between gap-2 bg-white/10 p-3">
          <span className="text-lg font-bold">
            <Emoji e="🎁" /> {r.title}
          </span>
          <Btn
            tone={stars >= r.price ? "gold" : "ghost"}
            onClick={() => {
              const res = requestReward(r.id);
              if (res === "ok") {
                emit("celebrate", { size: 2 });
                void lunaSay(L.wishSent());
              } else void lunaSay(L.wishShort());
            }}
          >
            <span style={{ direction: "ltr", display: "inline-block" }}>{r.price} ⭐</span>
          </Btn>
        </div>
      ))}
      {profile.requests.length > 0 && (
        <div>
          <h3 className="mb-1 font-bold">הבקשות שלי</h3>
          <ul className="space-y-1">
            {profile.requests
              .slice()
              .reverse()
              .map((r) => (
                <li key={r.id} className="flex justify-between rounded-2xl bg-white/5 px-3 py-2">
                  <span>{r.title}</span>
                  <span><EmojiText text={r.status === "pending" ? "⏳ מחכה להורים" : r.status === "approved" ? "✅ אושר!" : "↩️ הכוכבים חזרו"} /></span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
