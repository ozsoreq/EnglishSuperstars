"use client";
/**
 * Parent area (Hebrew, RTL), behind a parent gate: a math question plus PIN.
 * Time limits, progress (scores only — never audio), real-world rewards,
 * bonus stars, profiles, and privacy controls.
 */
import { useMemo, useState } from "react";
import { ISLANDS } from "@/lib/content/islands";
import { ALL_WORDS } from "@/lib/content/words";
import { addDays, dayKey } from "@/lib/dates";
import { balance, earnedOn, spentTotal, totalEarned, levelFor } from "@/lib/ledger";
import { mastery } from "@/lib/srs";
import {
  eraseAll,
  exportData,
  grantExtraMinutes,
  parentBonus,
  removeProfile,
  resolveRequest,
  updateParent,
  useFamily,
  MAX_PROFILES,
  type Profile,
} from "@/lib/store";
import { Avatar } from "../Avatar";
import { Btn } from "../Btn";
import { Emoji, EmojiText } from "@/components/Emoji";

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const { parent } = useFamily();
  const q = useMemo(() => {
    const a = 6 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    return { a, b, ans: a * b };
  }, []);
  const [answer, setAnswer] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const creating = !parent.pin;

  const submit = () => {
    if (Number(answer) !== q.ans) return setError("התשובה לתרגיל לא נכונה");
    if (!/^\d{4}$/.test(pin)) return setError("קוד בן 4 ספרות");
    if (creating) {
      if (pin !== pin2) return setError("הקודים לא תואמים");
      updateParent({ pin });
      return onPass();
    }
    if (pin !== parent.pin) return setError("קוד שגוי");
    onPass();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">
        <Emoji e="🔒" /> כניסת הורים
      </h1>
      <label className="flex flex-col gap-1">
        <span>
          כמה זה <b style={{ direction: "ltr", display: "inline-block" }}>{q.a} × {q.b}</b>?
        </span>
        <input inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} className="rounded-2xl bg-white/10 px-4 py-3 text-xl" />
      </label>
      <label className="flex flex-col gap-1">
        <span>{creating ? "בחרו קוד הורים (4 ספרות)" : "קוד הורים"}</span>
        <input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} className="rounded-2xl bg-white/10 px-4 py-3 text-xl" />
      </label>
      {creating && (
        <label className="flex flex-col gap-1">
          <span>הקלידו שוב את הקוד</span>
          <input inputMode="numeric" type="password" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value)} className="rounded-2xl bg-white/10 px-4 py-3 text-xl" />
        </label>
      )}
      {error && <p className="text-coral">{error}</p>}
      <div className="flex gap-3">
        <Btn tone="gold" onClick={submit} className="flex-1">
          כניסה
        </Btn>
        <Btn tone="ghost" onClick={onCancel}>
          ביטול
        </Btn>
      </div>
    </div>
  );
}

type Tab = "progress" | "time" | "rewards" | "family" | "privacy";

export function ParentDashboard({ onExit, onAddChild }: { onExit: () => void; onAddChild: () => void }) {
  const fam = useFamily();
  const [tab, setTab] = useState<Tab>("progress");
  const [kidId, setKidId] = useState(fam.activeId ?? fam.profiles[0]?.id ?? null);
  const kid = fam.profiles.find((p) => p.id === kidId) ?? fam.profiles[0];

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 bg-night-deep px-4 pb-12 pt-[max(env(safe-area-inset-top),12px)] text-base">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אזור הורים</h1>
        <Btn tone="cream" onClick={onExit}>
          חזרה למשחק
        </Btn>
      </header>

      {fam.profiles.length > 1 && (
        <div className="flex gap-2">
          {fam.profiles.map((p) => (
            <button key={p.id} type="button" onClick={() => setKidId(p.id)} className={`rounded-2xl px-3 py-2 ${p.id === kid?.id ? "bg-lavender text-night-deep" : "bg-white/10"}`}>
              <Emoji e={p.avatar} /> {p.name}
            </button>
          ))}
        </div>
      )}

      <nav className="flex flex-wrap gap-2">
        {(
          [
            ["progress", "התקדמות"],
            ["time", "זמן מסך"],
            ["rewards", "פרסים וכוכבים"],
            ["family", "משפחה"],
            ["privacy", "פרטיות"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`min-h-12 rounded-2xl px-4 ${tab === id ? "bg-gold text-night-deep" : "bg-white/10"}`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "progress" && kid && <Progress kid={kid} />}
      {tab === "time" && <TimeSettings kid={kid} />}
      {tab === "rewards" && kid && <Rewards kid={kid} />}
      {tab === "family" && <Family onAddChild={onAddChild} />}
      {tab === "privacy" && <Privacy />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/10 p-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Progress({ kid }: { kid: Profile }) {
  const today = dayKey();
  const met = ALL_WORDS.filter((w) => kid.memory[w.id]);
  const counts = { grey: 0, silver: 0, gold: 0 };
  for (const w of met) {
    const m = mastery(kid.memory[w.id]);
    if (m !== "unseen") counts[m] += 1;
  }
  const letters = ALL_WORDS.filter((w) => w.letter);
  const soundsMastered = letters.filter((w) => mastery(kid.memory[w.id]) === "gold").length;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const maxMin = Math.max(1, ...week.map((d) => (kid.playSeconds[d] ?? 0) / 60));
  const weekWords = met.filter((w) => kid.memory[w.id].firstSeen >= week[0]).length;
  const isl = ISLANDS[0];
  const restored = isl.chapters.filter((c) => (kid.visits[c.id] ?? 0) > 0).length;
  const speaking = kid.speakScores.slice(-12).reverse();
  const earned = totalEarned(kid.ledger);

  return (
    <div className="flex flex-col gap-4">
      <Card title="סיכום שבועי">
        <p className="text-lg">
          {kid.name} למד/ה <b className="text-mint">{weekWords}</b> מילים חדשות השבוע. רצף נוכחי: {kid.streak.count} ימים <Emoji e="🔥" />
        </p>
      </Card>
      <Card title="מילים לפי שליטה">
        <div className="flex gap-4 text-center">
          <Stat label="אפור (פגשו)" value={counts.grey} color="#9aa0b5" />
          <Stat label="כסף (מתחזק)" value={counts.silver} color="#d9e2ec" />
          <Stat label="זהב (שולט)" value={counts.gold} color="#FFC53D" />
          <Stat label="צלילים שנשלטו" value={`${soundsMastered}/${letters.length}`} color="#7FE3C4" />
        </div>
      </Card>
      <Card title="דקות משחק — 7 ימים אחרונים">
        <div className="flex h-32 items-end gap-2" dir="rtl">
          {week.map((d) => {
            const m = (kid.playSeconds[d] ?? 0) / 60;
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs">{Math.round(m)}</span>
                <div className="w-full rounded-t-lg bg-mint" style={{ height: `${(m / maxMin) * 90}px`, minHeight: 2 }} />
                <span className="text-xs text-cream/60">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title={`התקדמות באי: ${isl.name.he}`}>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gold" style={{ width: `${(restored / isl.chapters.length) * 100}%` }} />
        </div>
        <p className="mt-2">
          {restored} מתוך {isl.chapters.length} מקומות הוצלו. בסוף האי: {isl.canDo}.
        </p>
      </Card>
      <Card title="ניסיונות דיבור אחרונים (ציונים בלבד, ללא הקלטות)">
        {speaking.length === 0 ? (
          <p className="text-cream/70">עוד אין ניסיונות דיבור.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {speaking.map((s, i) => (
              <li key={i} className="rounded-xl bg-white/5 px-3 py-1">
                <span dir="ltr" className="en">
                  {s.word}
                </span>{" "}
                <Emoji e={s.ok ? "✅" : "🔁"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="כלכלת הכוכבים">
        <p>
          יתרה: {balance(kid.ledger)} · הורווחו סה״כ: {earned} · הוצאו: {spentTotal(kid.ledger)} · היום: {earnedOn(kid.ledger, today)} · רמה {levelFor(earned)}
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex-1">
      <div className="text-3xl font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function TimeSettings({ kid }: { kid?: Profile }) {
  const { parent } = useFamily();
  const used = kid ? Math.round((kid.playSeconds[dayKey()] ?? 0) / 60) : 0;
  return (
    <div className="flex flex-col gap-4">
      <Card title="מגבלת זמן יומית">
        <label className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={45}
            step={5}
            value={parent.dailyMinutes}
            onChange={(e) => updateParent({ dailyMinutes: Number(e.target.value) })}
            className="flex-1 accent-[#FFC53D]"
          />
          <b>{parent.dailyMinutes} דק׳</b>
        </label>
        {kid && (
          <p className="mt-2 text-cream/80">
            {kid.name} שיחק/ה היום {used} דקות.
          </p>
        )}
        <Btn tone="mint" className="mt-3" onClick={() => grantExtraMinutes(10)}>
          + 10 דקות להיום
        </Btn>
      </Card>
      <Card title="שעות מותרות">
        <label className="flex items-center gap-3">
          לא אחרי
          <input type="time" value={parent.bedtime} onChange={(e) => updateParent({ bedtime: e.target.value })} className="rounded-xl bg-white/10 px-3 py-2" />
        </label>
      </Card>
      <Card title="צלילים">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={parent.sound} onChange={(e) => updateParent({ sound: e.target.checked })} /> אפקטים קוליים
        </label>
        <label className="mt-2 flex items-center gap-3">
          <input type="checkbox" checked={parent.voice} onChange={(e) => updateParent({ voice: e.target.checked })} /> קריינות
        </label>
      </Card>
    </div>
  );
}

function Rewards({ kid }: { kid: Profile }) {
  const { parent } = useFamily();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(100);
  const [bonus, setBonus] = useState(5);
  const [bonusNote, setBonusNote] = useState("אמרת תודה באנגלית!");
  const [msg, setMsg] = useState("");
  const pending = kid.requests.filter((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <Card title="בקשות לאישור">
        {pending.length === 0 ? (
          <p className="text-cream/70">אין בקשות פתוחות.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span>
                  {r.title} (<bdi dir="ltr">{r.price}</bdi> <Emoji e="⭐" />)
                </span>
                <span className="flex gap-2">
                  <Btn tone="mint" className="text-sm" onClick={() => resolveRequest(kid.id, r.id, true)}>
                    אישור
                  </Btn>
                  <Btn tone="ghost" className="text-sm" onClick={() => resolveRequest(kid.id, r.id, false)}>
                    החזרת כוכבים
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="פרסים מהעולם האמיתי">
        <ul className="mb-3 space-y-2">
          {parent.rewards.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span>
                <Emoji e="🎁" /> {r.title} — <bdi dir="ltr">{r.price}</bdi> <Emoji e="⭐" />
              </span>
              <button type="button" className="min-h-10 px-2 text-coral" onClick={() => updateParent({ rewards: parent.rewards.filter((x) => x.id !== r.id) })}>
                מחיקה
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input placeholder="שם הפרס" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2" />
          <input type="number" min={10} max={2000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-24 rounded-xl bg-white/10 px-3 py-2" />
          <Btn
            tone="gold"
            onClick={() => {
              if (!title.trim() || !Number.isInteger(price) || price < 1) return;
              updateParent({ rewards: [...parent.rewards, { id: `r-${Date.now().toString(36)}`, title: title.trim(), price }] });
              setTitle("");
            }}
          >
            הוספה
          </Btn>
        </div>
      </Card>
      <Card title="כוכבי בונוס על שימוש באנגלית בעולם האמיתי">
        <div className="flex flex-wrap gap-2">
          <input value={bonusNote} onChange={(e) => setBonusNote(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2" />
          <input type="number" min={1} max={50} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="w-20 rounded-xl bg-white/10 px-3 py-2" />
          <Btn
            tone="mint"
            onClick={() => {
              const ok = parentBonus(kid.id, Math.max(1, Math.min(50, Math.round(bonus))), bonusNote);
              setMsg(ok ? `נשלחו ${bonus} כוכבים ל${kid.name} ⭐` : "לא הצלחנו להוסיף");
            }}
          >
            שליחה
          </Btn>
        </div>
        {msg && (
          <p className="mt-2 text-mint">
            <EmojiText text={msg} />
          </p>
        )}
      </Card>
    </div>
  );
}

function Family({ onAddChild }: { onAddChild: () => void }) {
  const fam = useFamily();
  return (
    <Card title={`ילדים (עד ${MAX_PROFILES})`}>
      <ul className="mb-3 space-y-2">
        {fam.profiles.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Avatar profile={p} size={32} /> {p.name}
            </span>
            <button
              type="button"
              className="min-h-10 px-2 text-coral"
              onClick={() => {
                if (confirm(`למחוק את הפרופיל של ${p.name}? כל ההתקדמות תימחק.`)) removeProfile(p.id);
              }}
            >
              מחיקה
            </button>
          </li>
        ))}
      </ul>
      {fam.profiles.length < MAX_PROFILES && (
        <Btn tone="gold" onClick={onAddChild}>
          + הוספת ילד/ה
        </Btn>
      )}
    </Card>
  );
}

function Privacy() {
  return (
    <div className="flex flex-col gap-4">
      <Card title="מה נאסף">
        <ul className="list-disc space-y-1 ps-5">
          <li>שם או כינוי, דמות, התקדמות ולוח הכוכבים — בלבד.</li>
          <li>אין תמונות, אין מיקום, אין אנשי קשר, אין צ׳אט ואין פרסומות.</li>
          <li>זיהוי דיבור רץ בדפדפן; ההקלטה לא נשמרת ולא משמשת לאימון. נשמר רק ציון (הצליח/לנסות שוב).</li>
          <li>בגרסת האב־טיפוס הנתונים נשמרים רק במכשיר הזה.</li>
        </ul>
      </Card>
      <Card title="ספקי צד שלישי">
        <ul className="list-disc space-y-1 ps-5">
          <li>הקראה: הקולות מוקלטים מראש ונשמרים באפליקציה, כך שלא נשלח דבר. אם הוגדר Microsoft Azure AI Speech, הוא מקבל רק את הטקסט הכללי שלונה אומרת — לא את שם הילד/ה ולא את הקול שלו/ה.</li>
          <li>זיהוי דיבור: מנוע הדיבור המובנה של הדפדפן/מערכת ההפעלה.</li>
          <li>גופנים: Google Fonts (נטענים פעם אחת בזמן הבנייה).</li>
          <li>סטטיסטיקת ביקורים: Vercel Web Analytics — ללא עוגיות וללא זיהוי אישי.</li>
        </ul>
      </Card>
      <Card title="הנתונים שלכם">
        <div className="flex flex-wrap gap-2">
          <Btn
            tone="cream"
            onClick={() => {
              const blob = new Blob([exportData()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `kochavim-${dayKey()}.json`;
              a.click();
            }}
          >
            ייצוא נתונים
          </Btn>
          <Btn
            tone="coral"
            onClick={() => {
              if (confirm("למחוק את כל הנתונים של המשפחה מהמכשיר?")) eraseAll();
            }}
          >
            מחיקת כל הנתונים
          </Btn>
        </div>
      </Card>
    </div>
  );
}
