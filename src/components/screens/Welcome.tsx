"use client";
/** Profile picker (tap your explorer — no passwords for kids) and new-explorer setup. */
import { motion } from "motion/react";
import { useState } from "react";
import { AVATARS } from "@/lib/catalog";
import { lunaSay } from "@/lib/luna";
import { createProfile, selectProfile, useFamily, MAX_PROFILES } from "@/lib/store";
import { Avatar } from "../Avatar";
import { Btn } from "../Btn";
import { En } from "../En";
import { Luna } from "../Luna";
import { Emoji } from "@/components/Emoji";

export function ProfilePicker({ onNew }: { onNew: () => void }) {
  const fam = useFamily();
  return (
    <div className="stars-bg flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Luna size={150} bubbleSide="top" />
      <h1 className="text-3xl font-bold">מי יוצא להרפתקה?</h1>
      <div className="flex flex-wrap justify-center gap-4">
        {fam.profiles.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => selectProfile(p.id)}
            className="chunky flex w-32 flex-col items-center gap-2 bg-lavender/30 p-4"
          >
            <Avatar profile={p} size={64} />
            <span className="text-lg font-bold">{p.name}</span>
          </motion.button>
        ))}
        {fam.profiles.length < MAX_PROFILES && (
          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onNew} className="chunky flex w-32 flex-col items-center justify-center gap-2 bg-white/10 p-4">
            <span className="text-5xl">
              <Emoji e="➕" />
            </span>
            <span>מגלה חדש</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

export function NewExplorer({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [step, setStep] = useState<"hello" | "setup">("hello");

  if (step === "hello") {
    return (
      <div className="stars-bg flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.h1 className="text-5xl font-black text-gold glow-gold" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          כוכבים <Emoji e="⭐" anim="spin" />
        </motion.h1>
        <p className="max-w-md text-xl">כל מילה שלומדים מגדילה את העולם שלכם.</p>
        <Luna size={180} bubbleSide="top" />
        <Btn
          tone="gold"
          className="px-10 text-2xl"
          onClick={() => {
            void lunaSay("שלום! אני לונה. בואו נצא יחד להרפתקה באי הצלילים!", "Hello! I'm Luna!");
            setStep("setup");
          }}
        >
          נעים מאוד, לונה! 👋
        </Btn>
        <p className="text-sm text-cream/60">
          <En>Hello! I&apos;m Luna.</En>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6">
      <Luna size={120} bubbleSide="top" />
      <h1 className="text-2xl font-bold">איך קוראים למגלה?</h1>
      <p className="-mt-3 text-sm text-cream/70">(מבוגר יכול לעזור להקליד)</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="שם או כינוי"
        className="w-full rounded-3xl border-[3px] border-lavender bg-white/10 px-5 py-4 text-center text-2xl"
        autoComplete="off"
      />
      <h2 className="text-xl font-bold">בחרו דמות</h2>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {AVATARS.map((a, i) => (
          <motion.button
            key={a}
            aria-label={`דמות ${i + 1}`}
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => setAvatar(a)}
            className={`grid h-16 w-16 place-items-center rounded-3xl text-4xl ${avatar === a ? "bg-gold" : "bg-white/10"}`}
            aria-pressed={avatar === a}
          >
            <Emoji e={a} size="1em" />
          </motion.button>
        ))}
      </div>
      <div className="flex gap-3">
        <Btn
          tone="gold"
          className="px-10 text-2xl"
          disabled={!name.trim()}
          onClick={() => {
            createProfile(name, avatar);
            onDone();
          }}
        >
          יוצאים לדרך! 🧭
        </Btn>
        {onCancel && (
          <Btn tone="ghost" onClick={onCancel}>
            ביטול
          </Btn>
        )}
      </div>
    </div>
  );
}
