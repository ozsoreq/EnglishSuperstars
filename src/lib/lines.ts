/**
 * Everything Luna says, in one place.
 *
 * Screens call these functions; the voice generator calls `allLines()` to
 * pre-record every possible line with a natural voice. Keeping both on the
 * same functions means a new line can't silently miss its recording.
 *
 * `heSpeak` / `enSpeak` override what is spoken when the caption contains
 * something we can't pre-record (the child's name).
 */
import type { Chapter, GameType, Island, Word } from "./content/types";
import { ISLANDS } from "./content/islands";
import { ALL_WORDS } from "./content/words";
import { ALL_ITEMS, type ShopItem } from "./catalog";

export interface Line {
  he?: string;
  en?: string;
  heSpeak?: string;
  enSpeak?: string;
}

type Named = Pick<ShopItem, "he" | "en">;

export const L = {
  // Welcome & map
  meetLuna: (): Line => ({ he: "שלום! אני לונה. בואו נצא יחד להרפתקה באי הצלילים!", en: "Hello! I'm Luna!" }),
  greetAllDone: (name: string): Line => ({
    he: `שלום ${name}! כל האי זוהר. בואו נבקר חברים ונתאמן!`,
    heSpeak: "שלום! כל האי זוהר. בואו נבקר חברים ונתאמן!",
    en: `Hello, ${name}!`,
    enSpeak: "Hello, explorer!",
  }),
  greetQuest: (name: string, c: Chapter): Line => ({
    he: `שלום ${name}! המשימה של היום: ${c.quest}. לחצו על ${c.name.he}!`,
    heSpeak: `שלום! המשימה של היום: ${c.quest}. לחצו על ${c.name.he}!`,
    en: `Hello, ${name}!`,
    enSpeak: "Hello, explorer!",
  }),
  fogChapter: (blocking: Chapter): Line => ({ he: `הערפל סמיך מדי! קודם צריך להציל את ${blocking.name.he}.` }),
  fogIsland: (isl: Island): Line => ({ he: `${isl.name.he} עוד מכוסה בערפל. ${isl.friend.name.he} מחכה לנו שם בקרוב!` }),

  // Quest
  problem: (c: Chapter): Line => ({ he: c.problem.he, en: c.problem.en }),
  welcomeBack: (c: Chapter): Line => ({ he: `חזרנו ל${c.name.he}! בואו נתאמן כדי שהקסם יישאר חזק.`, en: "Welcome back!" }),
  gameIntro: (c: Chapter, g: GameType): Line => ({ he: c.gameIntro[g] }),
  wordWentGold: (): Line => ({ he: "מילה הפכה לזהב בספר המילים!" }),
  resolved: (c: Chapter): Line => ({ he: c.resolved.he, en: c.resolved.en }),
  shinesMore: (c: Chapter): Line => ({ he: `${c.name.he} זוהר עוד יותר!`, en: "Great job!" }),
  islandDone: (isl: Island): Line => ({ he: `סיימתם את כל ${isl.name.he}! קיבלתם גביע וחמישים כוכבים!`, en: "You did it, superstar!" }),
  missionDone: (): Line => ({ he: "המשימה של היום הושלמה! עכשיו אפשר לבחור: לבזבז כוכבים, או להמשיך לחקור.", en: "Done for today!" }),
  wellDone: (): Line => ({ he: "כל הכבוד! מה עושים עכשיו?", en: "Well done!" }),

  // Games
  tryAgainWord: (w: Word): Line => ({ he: `${w.he}! נסו שוב` }),
  hereItIs: (w: Word): Line => ({ he: "הנה היא!", en: w.en }),
  echoWord: (w: Word): Line => ({ en: w.en }),
  excellent: (w: Word): Line => ({ he: "מצוין!", en: w.en }),
  greatTry: (): Line => ({ he: "איזה ניסיון יפה!", en: "Great try!" }),
  almostListen: (): Line => ({ he: "כמעט! הקשיבו ונסו שוב" }),
  almostAgain: (): Line => ({ he: "כמעט! עוד פעם" }),
  letsLearn: (): Line => ({ he: "בואו נלמד את מילות הקסם!" }),
  wordIntro: (w: Word): Line => ({ he: `${w.he}. באנגלית אומרים:`, en: w.en }),
  restore: (c: Chapter): Line => ({ he: c.restoreLine }),
  firstSound: (en: string): Line => ({ he: "באיזה צליל מתחילה המילה?", en }),
  buildWord: (en: string): Line => ({ he: "בנו את המילה מהצלילים!", en }),
  trainHint: (): Line => ({ he: "הקשיבו לצליל ונסו שוב" }),
  trainShow: (): Line => ({ he: "הקרון הזוהר הוא הנכון!" }),
  detectiveIntro: (): Line => ({ he: "לאיזו זכוכית מגדלת שייכת האות?" }),
  detectiveHint: (): Line => ({ he: "הסתכלו לאן פונה הבטן של האות, ונסו שוב" }),
  detectiveShow: (): Line => ({ he: "הבטן מראה לנו את הדרך!" }),

  // Camp
  bought: (it: Named): Line => ({ he: `יש! ${it.he} שלכם לתמיד!`, en: it.en }),
  needMoreStars: (it: Named): Line => ({ he: `עוד קצת כוכבים! אפשר לחסוך ל${it.he} — לחצו על הצנצנת שליד.` }),
  savingFor: (it: Named): Line => ({ he: `מעולה! חוסכים ל${it.he}. כל כוכב ממלא את הצנצנת.` }),
  yummy: (): Line => ({ he: "ממממ! טעים!", en: "Yummy!" }),
  needFood: (): Line => ({ he: "צריך עוד כוכב או שניים לאוכל." }),
  petDidntHear: (): Line => ({ he: "החיה לא שמעה. אמרו שוב בקול!" }),
  wishSent: (): Line => ({ he: "שלחנו את הבקשה להורים!" }),
  wishShort: (): Line => ({ he: "עוד לא מספיק כוכבים. ממשיכים לחסוך!" }),

  // Goodnight
  goodnight: (name: string, reason: "limit" | "bedtime"): Line =>
    reason === "bedtime"
      ? { he: `לילה טוב ${name}! עכשיו זמן לנוח. נתראה מחר!`, heSpeak: "לילה טוב! עכשיו זמן לנוח. נתראה מחר!", en: "Good night!" }
      : {
          he: `איזו הרפתקה! לונה צריכה לנוח עכשיו. הכוכבים שמורים בצנצנת. נתראה מחר, ${name}!`,
          heSpeak: "איזו הרפתקה! לונה צריכה לנוח עכשיו. הכוכבים שמורים בצנצנת. נתראה מחר!",
          en: "Good night!",
        },
};

/** Every line Luna can say, expanded over all content — the recording script's input. */
export function allLines(): Line[] {
  const chapters = ISLANDS.flatMap((i) => i.chapters);
  const items: Named[] = ALL_ITEMS;
  const trainWords = chapters.flatMap((c) => (c.trainWords ?? []).map((t) => t.word));
  const games: GameType[] = ["bubble", "say", "train", "memory", "detective"];
  const name = "";
  return [
    L.meetLuna(),
    L.greetAllDone(name),
    ...chapters.map((c) => L.greetQuest(name, c)),
    ...chapters.map((c) => L.fogChapter(c)),
    ...ISLANDS.map((i) => L.fogIsland(i)),
    ...chapters.flatMap((c) => [L.problem(c), L.welcomeBack(c), L.resolved(c), L.shinesMore(c), L.restore(c)]),
    ...chapters.flatMap((c) => games.filter((g) => c.gameIntro[g]).map((g) => L.gameIntro(c, g))),
    L.wordWentGold(),
    ...ISLANDS.map((i) => L.islandDone(i)),
    L.missionDone(),
    L.wellDone(),
    ...ALL_WORDS.flatMap((w) => [L.tryAgainWord(w), L.hereItIs(w), L.echoWord(w), L.excellent(w), L.wordIntro(w)]),
    L.greatTry(),
    L.almostListen(),
    L.almostAgain(),
    L.letsLearn(),
    ...[...ALL_WORDS.map((w) => w.en), ...trainWords].flatMap((en) => [L.firstSound(en), L.buildWord(en)]),
    L.trainHint(),
    L.trainShow(),
    L.detectiveIntro(),
    L.detectiveHint(),
    L.detectiveShow(),
    ...items.flatMap((it) => [L.bought(it), L.needMoreStars(it), L.savingFor(it)]),
    L.yummy(),
    L.needFood(),
    L.petDidntHear(),
    L.wishSent(),
    L.wishShort(),
    L.goodnight(name, "bedtime"),
    L.goodnight(name, "limit"),
  ];
}
