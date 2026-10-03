/** Everything stars can buy. Prices are authoritative here (see ledger.spend). */

export type GearSlot = "head" | "face" | "back" | "hand";

export interface GearItem {
  id: string;
  kind: "gear";
  slot: GearSlot;
  emoji: string;
  he: string;
  en: string;
  price: number;
}

export interface CampItem {
  id: string;
  kind: "camp";
  emoji: string;
  he: string;
  en: string;
  price: number;
}

export interface PetItem {
  id: string;
  kind: "pet";
  emoji: string;
  he: string;
  en: string;
  price: number;
}

export type ShopItem = GearItem | CampItem | PetItem;

export const GEAR: GearItem[] = [
  { id: "gear-cap", kind: "gear", slot: "head", emoji: "🧢", he: "כובע מצחייה", en: "cap", price: 10 },
  { id: "gear-flower", kind: "gear", slot: "head", emoji: "🌸", he: "פרח לשיער", en: "flower", price: 12 },
  { id: "gear-sunhat", kind: "gear", slot: "head", emoji: "👒", he: "כובע חוף", en: "sun hat", price: 20 },
  { id: "gear-crown", kind: "gear", slot: "head", emoji: "👑", he: "כתר", en: "crown", price: 80 },
  { id: "gear-glasses", kind: "gear", slot: "face", emoji: "🕶️", he: "משקפי שמש", en: "sunglasses", price: 15 },
  { id: "gear-paint", kind: "gear", slot: "face", emoji: "✨", he: "ציור פנים נוצץ", en: "face paint", price: 18 },
  { id: "gear-backpack", kind: "gear", slot: "back", emoji: "🎒", he: "תרמיל מגלים", en: "backpack", price: 25 },
  { id: "gear-wings", kind: "gear", slot: "back", emoji: "🪽", he: "כנפיים", en: "wings", price: 60 },
  { id: "gear-wand", kind: "gear", slot: "hand", emoji: "🪄", he: "שרביט קסמים", en: "magic wand", price: 40 },
  { id: "gear-balloon", kind: "gear", slot: "hand", emoji: "🎈", he: "בלון", en: "balloon", price: 15 },
];

export const CAMP: CampItem[] = [
  { id: "camp-flowers", kind: "camp", emoji: "🌻", he: "ערוגת חמניות", en: "sunflowers", price: 15 },
  { id: "camp-tent", kind: "camp", emoji: "⛺", he: "אוהל", en: "tent", price: 30 },
  { id: "camp-fire", kind: "camp", emoji: "🔥", he: "מדורה", en: "campfire", price: 25 },
  { id: "camp-lantern", kind: "camp", emoji: "🏮", he: "פנס נייר", en: "lantern", price: 20 },
  { id: "camp-palm", kind: "camp", emoji: "🌴", he: "עץ דקל", en: "palm tree", price: 35 },
  { id: "camp-telescope", kind: "camp", emoji: "🔭", he: "טלסקופ", en: "telescope", price: 60 },
  { id: "camp-chest", kind: "camp", emoji: "🧰", he: "תיבת אוצר", en: "treasure chest", price: 80 },
  { id: "camp-boat", kind: "camp", emoji: "⛵", he: "סירת מפרש", en: "sailboat", price: 150 },
  { id: "camp-castle", kind: "camp", emoji: "🏰", he: "טירה", en: "castle", price: 600 },
];

export const PETS: PetItem[] = [
  { id: "pet-puppy", kind: "pet", emoji: "🐶", he: "גור כלבים", en: "puppy", price: 60 },
  { id: "pet-kitten", kind: "pet", emoji: "🐱", he: "חתלתול", en: "kitten", price: 60 },
  { id: "pet-bunny", kind: "pet", emoji: "🐰", he: "ארנבון", en: "bunny", price: 80 },
  { id: "pet-turtle", kind: "pet", emoji: "🐢", he: "צב ים", en: "turtle", price: 100 },
  { id: "pet-dragon", kind: "pet", emoji: "🐉", he: "דרקון", en: "dragon", price: 300 },
];

export const PET_FOOD_PRICE = 2;
export const PET_HAPPY_DAYS = 2;

/** English command words pets learn as tricks. */
export const PET_TRICKS = [
  { id: "sit", en: "sit", he: "שב" },
  { id: "jump", en: "jump", he: "קפוץ" },
  { id: "spin", en: "spin", he: "הסתובב" },
  { id: "dance", en: "dance", he: "רקוד" },
] as const;

export const ALL_ITEMS: ShopItem[] = [...GEAR, ...CAMP, ...PETS];

export function item(id: string): ShopItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

export function catalogPrice(id: string): number | undefined {
  if (id === "pet-food") return PET_FOOD_PRICE;
  return item(id)?.price;
}

export const AVATARS = ["👧🏻", "👧🏼", "👧🏽", "👧🏾", "👧🏿", "👦🏻", "👦🏽", "👦🏿", "🧒🏻", "🧒🏽", "🧒🏾", "🧒🏿"];
