import type { Chapter, Island } from "./types";

const soundShore: Chapter[] = [
  {
    id: "luna-den",
    name: { he: "המאורה של לונה", en: "Luna's Den" },
    landmark: "🏕️",
    quest: "להעיר את חברי האי",
    problem: {
      he: "אוי! כל החברים באי נרדמו ולא מתעוררים. רק מילים באנגלית יכולות להעיר אותם!",
      en: "Oh no! Everyone on the island is fast asleep.",
    },
    restoreLine: "עוד חבר התעורר!",
    resolved: {
      he: "כולם ערים! אמרתם שלום באנגלית והאי חזר לחיים. השביל לחוף נפתח!",
      en: "Everyone is awake! Hello, island!",
    },
    treasure: { emoji: "🐚", he: "צדף השלום", en: "Hello Shell" },
    words: ["hello", "goodbye", "yes", "no", "thank-you", "ok"],
    games: ["greet", "say", "bubble", "memory"],
    gameIntro: {
      greet: "חברים באים ויוצאים מהמאורה. בחרו מה אומרים להם באנגלית!",
      say: "תגידו את המילה ללונה, והחבר הישן יתעורר!",
      bubble: "הקשיבו למילה ופוצצו את הבועה הנכונה כדי להעיר את הציפורים.",
      memory: "מצאו זוגות בגן הפרחים כדי שהפרחים יפתחו.",
    },
  },
  {
    id: "rainbow-falls",
    name: { he: "מפל הקשת", en: "Rainbow Falls" },
    landmark: "🌈",
    quest: "להחזיר את הצבעים למפל",
    problem: {
      he: "המפל איבד את כל הצבעים שלו! הוא אפור ועצוב. כל צבע שתלמדו יחזיר פס לקשת.",
      en: "The waterfall lost its colors!",
    },
    restoreLine: "פס צבע חזר לקשת!",
    resolved: {
      he: "המפל צבעוני שוב! איזו קשת יפה. מצאתם נוצת קשת!",
      en: "The rainbow is back!",
    },
    treasure: { emoji: "🪶", he: "נוצת הקשת", en: "Rainbow Feather" },
    words: ["red", "blue", "yellow", "green"],
    games: ["paint", "bubble", "memory", "say"],
    gameIntro: {
      paint: "טבלו את המכחול בצבע שאתם שומעים, וצבעו את הקשת!",
      bubble: "בועות צבע עפות מהמפל. פוצצו את הצבע שאתם שומעים!",
      memory: "מצאו זוגות של צבע ומילה כדי למלא את הקשת.",
      say: "אמרו את שם הצבע, והוא יזרום חזרה למפל!",
    },
  },
  {
    id: "shell-beach",
    name: { he: "חוף הצדפים", en: "Shell Beach" },
    landmark: "🐚",
    letters: ["a", "b", "c", "d"],
    quest: "לאסוף את צדפי הצלילים",
    problem: {
      he: "הרוח פיזרה את צדפי הצלילים על כל החוף! כל צדף שר צליל של אות. בואו נאסוף אותם.",
      en: "The wind scattered the sound shells!",
    },
    restoreLine: "אספנו צדף שר!",
    resolved: {
      he: "כל הצדפים חזרו ושרים יחד! מצאתם פנינה מבריקה.",
      en: "The shells are singing again!",
    },
    treasure: { emoji: "🦪", he: "פנינת הצלילים", en: "Sound Pearl" },
    words: ["apple", "ball", "cat", "dog"],
    trainWords: [
      { word: "cab", pic: "🚕", he: "מונית" },
      { word: "dad", pic: "👨", he: "אבא" },
    ],
    games: ["train", "detective", "trace", "bubble"],
    gameIntro: {
      trace: "ציירו את האות עם האצבע על החול, לפי הנקודות הנוצצות.",
      train: "רכבת הצדפים צריכה קרונות! חברו את הצלילים הנכונים.",
      detective: "הבלשית לונה צריכה עזרה: מיינו כל אות לזכוכית המגדלת הנכונה.",
      bubble: "צדפים בתוך בועות! פוצצו את הצדף של המילה שאתם שומעים.",
    },
  },
  {
    id: "counting-rocks",
    name: { he: "אבני הספירה", en: "Counting Rocks" },
    landmark: "🪨",
    quest: "לבנות שביל אבנים מעל הנחל",
    problem: {
      he: "אבני הקפיצה שקעו בנחל ואי אפשר לעבור! כל מספר שתלמדו יעלה אבן אחת.",
      en: "The stepping stones sank into the river!",
    },
    restoreLine: "אבן עלתה מהמים!",
    resolved: {
      he: "אחת, שתיים, שלוש, ארבע, חמש — עברנו את הנחל! מצאתם מצפן קסום.",
      en: "We crossed the river!",
    },
    treasure: { emoji: "🧭", he: "מצפן קסום", en: "Magic Compass" },
    words: ["one", "two", "three", "four", "five"],
    games: ["count", "bubble", "memory", "say"],
    gameIntro: {
      count: "הדולפינה רעבה! הקשיבו למספר ותנו לה בדיוק כמה דגים.",
      bubble: "ספרו את הכוכבים בכל בועה ופוצצו את המספר הנכון.",
      memory: "מצאו זוגות של מספר ומילה כדי להרים את האבנים.",
      say: "אמרו את המספר בקול, והאבן תקפוץ מהמים!",
    },
  },
  {
    id: "paint-cove",
    name: { he: "מפרץ הצבעים", en: "Paint Cove" },
    landmark: "🦋",
    quest: "לצבוע מחדש את הפרפרים",
    problem: {
      he: "הפרפרים של המפרץ איבדו את הצבעים שלהם ולא יכולים לעוף! בואו נצבע אותם.",
      en: "The butterflies lost their colors!",
    },
    restoreLine: "פרפר קיבל צבע ועף!",
    resolved: {
      he: "כל הפרפרים עפים בכל הצבעים! הם השאירו לכם מכחול קסום.",
      en: "The butterflies can fly again!",
    },
    treasure: { emoji: "🖌️", he: "מכחול קסום", en: "Magic Brush" },
    words: ["pink", "purple", "orange", "brown", "black", "white"],
    games: ["paint", "memory", "say", "bubble"],
    gameIntro: {
      paint: "הפרפר מחכה לצבעים! הקשיבו, טבלו וצבעו כל כנף.",
      memory: "מצאו זוגות של צבע ומילה, וכל זוג יצבע פרפר.",
      bubble: "בועות צבע! פוצצו את הצבע שהפרפר מבקש.",
      say: "אמרו את הצבע בקול כדי לצבוע את הכנפיים.",
    },
  },
  {
    id: "echo-cave",
    name: { he: "מערת ההד", en: "Echo Cave" },
    landmark: "⛰️",
    letters: ["e", "f", "g", "h"],
    quest: "להחזיר את ההד למערה",
    problem: {
      he: "ההד של המערה שכח את הצלילים שלו! כשקוראים לו, הוא שותק. בואו נלמד אותו מחדש.",
      en: "The echo forgot its sounds!",
    },
    restoreLine: "ההד חזר על הצליל!",
    resolved: {
      he: "המערה מהדהדת שוב! בפנים מצאתם פנס זוהר.",
      en: "Hello... hello... hello! The echo is back!",
    },
    treasure: { emoji: "🔦", he: "פנס זוהר", en: "Glow Lantern" },
    words: ["egg", "fish", "goat", "hat"],
    trainWords: [
      { word: "bag", pic: "👜", he: "תיק" },
      { word: "bed", pic: "🛏️", he: "מיטה" },
      { word: "cab", pic: "🚕", he: "מונית" },
    ],
    games: ["trace", "train", "say", "bubble"],
    gameIntro: {
      trace: "ציירו את האות על קיר המערה, וההד יזכור אותה.",
      train: "רכבת המערה יוצאת! בנו מילה מקרונות של צלילים.",
      bubble: "בועות הד מרחפות במערה. פוצצו את המילה שאתם שומעים!",
      say: "צעקו את המילה לתוך המערה, וההד יחזור!",
    },
  },
  {
    id: "starfish-bridge",
    name: { he: "גשר כוכבי הים", en: "Starfish Bridge" },
    landmark: "🌉",
    quest: "לתקן את הגשר",
    problem: {
      he: "חסרים קרשים בגשר אל המגדלור! כל מספר שתלמדו יחזיר קרש.",
      en: "The bridge is missing its planks!",
    },
    restoreLine: "קרש חדש בגשר!",
    resolved: {
      he: "שש, שבע, שמונה, תשע, עשר — הגשר שלם! כוכבי הים נתנו לכם מפתח זהב.",
      en: "The bridge is fixed!",
    },
    treasure: { emoji: "🗝️", he: "מפתח הזהב", en: "Golden Key" },
    words: ["six", "seven", "eight", "nine", "ten"],
    games: ["count", "memory", "bubble", "say"],
    gameIntro: {
      count: "כוכבי הים רעבים! הקשיבו למספר ותנו בדיוק כמה דגים.",
      memory: "הפכו את הקלפים ומצאו זוגות כדי לבנות את הגשר.",
      bubble: "ספרו את הכוכבים ופוצצו את הבועה הנכונה.",
      say: "אמרו את המספר בקול, וקרש יקפוץ למקום!",
    },
  },
  {
    id: "lighthouse",
    name: { he: "המגדלור", en: "The Lighthouse" },
    landmark: "🗼",
    letters: ["i", "j", "k", "l", "m"],
    quest: "להדליק את המגדלור",
    problem: {
      he: "האור של המגדלור כבה, ודולי הדולפינה לא מוצאת את הדרך הביתה! כל צליל ידליק עוד ניצוץ.",
      en: "The lighthouse went dark! Dolly the dolphin is lost.",
    },
    restoreLine: "ניצוץ אור נדלק!",
    resolved: {
      he: "המגדלור זוהר! דולי הדולפינה מצאה את הדרך הביתה, והיא מביאה לכם את גביע חוף הצלילים!",
      en: "The light is on! Dolly is home!",
    },
    treasure: { emoji: "🏆", he: "גביע חוף הצלילים", en: "Sound Shore Trophy" },
    words: ["insect", "jellyfish", "kite", "lemon", "moon"],
    trainWords: [
      { word: "jam", pic: "🍓", he: "ריבה" },
      { word: "kid", pic: "🧒", he: "ילד" },
      { word: "leg", pic: "🦵", he: "רגל" },
      { word: "dig", pic: "⛏️", he: "לחפור" },
    ],
    games: ["trace", "train", "bubble", "memory"],
    gameIntro: {
      trace: "ציירו את האות באור, ניצוץ אחרי ניצוץ.",
      memory: "מצאו זוגות של תמונה ומילה, וכל זוג ידליק אור.",
      train: "רכבת האור מובילה ניצוצות למגדלור. בנו את המילה!",
      bubble: "בועות אור מרחפות. פוצצו את המילה שאתם שומעים!",
      detective: "מיינו את האותיות הדומות לזכוכית המגדלת הנכונה כדי לנקות את הזכוכית של המגדלור.",
    },
  },
];

export const ISLANDS: Island[] = [
  {
    id: "sound-shore",
    index: 1,
    name: { he: "חוף הצלילים", en: "Sound Shore" },
    focus: "צלילי האותיות a–m, ברכות, צבעים, מספרים 1–10",
    canDo: "אומרים שלום, קוראים בשם 8 צבעים, סופרים עד 10",
    friend: { emoji: "🐬", name: { he: "דולי הדולפינה", en: "Dolly the Dolphin" } },
    playable: true,
    chapters: soundShore,
    tint: "#7FE3C4",
  },
  {
    id: "letter-forest",
    index: 2,
    name: { he: "יער האותיות", en: "Letter Forest" },
    focus: "צלילי האותיות n–z, חיבור מילים, חיות",
    canDo: "קוראים מילים של 3 אותיות",
    friend: { emoji: "🦉", name: { he: "אולי הינשוף", en: "Ollie the Owl" } },
    playable: false,
    chapters: [],
    tint: "#9CCC65",
  },
  {
    id: "family-village",
    index: 3,
    name: { he: "כפר המשפחה", en: "Family Village" },
    focus: "sh / ch / th, משפחה, גוף, I have",
    canDo: "מציגים את המשפחה ב-3 משפטים",
    friend: { emoji: "🐻", name: { he: "בני הדובון", en: "Benny the Bear" } },
    playable: false,
    chapters: [],
    tint: "#FFB74D",
  },
  {
    id: "snack-market",
    index: 4,
    name: { he: "שוק החטיפים", en: "Snack Market" },
    focus: "אוכל, מספרים עד 20, I like / I don't like",
    canDo: "מזמינים ארוחה דמיונית",
    friend: { emoji: "🐰", name: { he: "בלה הארנבת האופה", en: "Bella the Bunny Baker" } },
    playable: false,
    chapters: [],
    tint: "#FF8FA3",
  },
  {
    id: "dream-room",
    index: 5,
    name: { he: "חדר החלומות", en: "Dream Room" },
    focus: "בית, בגדים, in / on / under",
    canDo: "מתארים את החדר",
    friend: { emoji: "🐱", name: { he: "מימי החתולה", en: "Mimi the Cat" } },
    playable: false,
    chapters: [],
    tint: "#B9A7F5",
  },
  {
    id: "star-festival",
    index: 6,
    name: { he: "פסטיבל הכוכבים", en: "Star Festival" },
    focus: "רגשות, פעלים, עבר פשוט, סיפורים קצרים",
    canDo: "קוראים בקול ספר תמונות של 6 עמודים",
    friend: { emoji: "🦄", name: { he: "סטלה החד-קרן", en: "Stella the Unicorn" } },
    playable: false,
    chapters: [],
    tint: "#FFC53D",
  },
];

export function island(id: string): Island {
  const i = ISLANDS.find((x) => x.id === id);
  if (!i) throw new Error(`Unknown island: ${id}`);
  return i;
}

export function findChapter(chapterId: string): { island: Island; chapter: Chapter; index: number } {
  for (const isl of ISLANDS) {
    const index = isl.chapters.findIndex((c) => c.id === chapterId);
    if (index >= 0) return { island: isl, chapter: isl.chapters[index], index };
  }
  throw new Error(`Unknown chapter: ${chapterId}`);
}

/** All words an island teaches, in order. */
export function islandWords(isl: Island): string[] {
  return isl.chapters.flatMap((c) => c.words);
}
