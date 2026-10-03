"use client";
/**
 * Family state: up to 4 child profiles plus parent settings.
 *
 * Prototype persistence is the device (localStorage). All star movement goes
 * through the pure ledger module, which is the same validation a server
 * route would run when the Postgres-backed ledger is wired up.
 */
import { useSyncExternalStore } from "react";
import { catalogPrice, type GearSlot } from "./catalog";
import { ISLANDS, findChapter } from "./content/islands";
import { WORDS } from "./content/words";
import { dayKey, weekKey } from "./dates";
import { emit } from "./events";
import {
  earn as ledgerEarn,
  levelFor,
  spend as ledgerSpend,
  totalEarned,
  type EarnReason,
  type Ledger,
} from "./ledger";
import type { ActivityResult } from "./mission";
import { starsFor } from "./mission";
import { GOLD_REPS, review, type Quality, type WordMemory } from "./srs";
import { EMPTY_STREAK, completeDay, streakBonus, type Streak } from "./streak";

export const MAX_PROFILES = 4;
export const WEEKLY_SPEAK_GOAL = 20;

export interface Pet {
  itemId: string;
  name: string;
  fedDay: string;
  tricks: string[];
}

export interface RewardRequest {
  id: string;
  rewardId: string;
  title: string;
  price: number;
  day: string;
  status: "pending" | "approved" | "declined";
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
  ledger: Ledger;
  memory: Record<string, WordMemory>;
  /** Missions completed per chapter. */
  visits: Record<string, number>;
  /** Chapter the explorer is standing at on the map. */
  location: string;
  islandsDone: string[];
  streak: Streak;
  owned: string[];
  equipped: Partial<Record<GearSlot, string>>;
  pets: Pet[];
  activePet?: string;
  savingGoal?: string;
  playSeconds: Record<string, number>;
  spokenByWeek: Record<string, number>;
  /** Score-only log of speaking attempts for the parent (never audio). */
  speakScores: { day: string; word: string; ok: boolean }[];
  requests: RewardRequest[];
  levelSeen: number;
}

export interface ParentReward {
  id: string;
  title: string;
  price: number;
}

export interface ParentSettings {
  pin: string | null;
  dailyMinutes: number;
  bedtime: string;
  rewards: ParentReward[];
  sound: boolean;
  voice: boolean;
  /** Extra minutes granted for a specific day. */
  extraMinutes: Record<string, number>;
}

export interface FamilyState {
  version: 1;
  profiles: Profile[];
  activeId: string | null;
  parent: ParentSettings;
}

const KEY = "kochavim:v1";

const DEFAULT_PARENT: ParentSettings = {
  pin: null,
  dailyMinutes: 15,
  bedtime: "19:30",
  rewards: [
    { id: "r-icecream", title: "גלידה עם אבא", price: 200 },
    { id: "r-movie", title: "לבחור את סרט יום שישי", price: 150 },
  ],
  sound: true,
  voice: true,
  extraMinutes: {},
};

const EMPTY: FamilyState = { version: 1, profiles: [], activeId: null, parent: DEFAULT_PARENT };

let state: FamilyState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): FamilyState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as FamilyState;
    if (parsed.version !== 1) return EMPTY;
    return { ...EMPTY, ...parsed, parent: { ...DEFAULT_PARENT, ...parsed.parent } };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    state = load();
  }
}

function commit(next: FamilyState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — keep playing in memory */
  }
  listeners.forEach((l) => l());
}

export function getState(): FamilyState {
  ensureLoaded();
  return state;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFamily(): FamilyState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

export function useProfile(): Profile | null {
  const s = useFamily();
  return s.profiles.find((p) => p.id === s.activeId) ?? null;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateActive(fn: (p: Profile) => Profile) {
  const s = getState();
  commit({ ...s, profiles: s.profiles.map((p) => (p.id === s.activeId ? fn(p) : p)) });
}

function active(): Profile {
  const s = getState();
  const p = s.profiles.find((x) => x.id === s.activeId);
  if (!p) throw new Error("No active profile");
  return p;
}

// ------------------------------------------------------------- profiles

export function createProfile(name: string, avatar: string): Profile {
  const first = ISLANDS[0].chapters[0].id;
  const p: Profile = {
    id: uid("kid"),
    name: name.trim().slice(0, 20),
    avatar,
    createdAt: Date.now(),
    ledger: [],
    memory: {},
    visits: {},
    location: first,
    islandsDone: [],
    streak: EMPTY_STREAK,
    owned: [],
    equipped: {},
    pets: [],
    playSeconds: {},
    spokenByWeek: {},
    speakScores: [],
    requests: [],
    levelSeen: 1,
  };
  const s = getState();
  commit({ ...s, profiles: [...s.profiles, p].slice(0, MAX_PROFILES), activeId: p.id });
  return p;
}

export function selectProfile(id: string | null) {
  commit({ ...getState(), activeId: id });
}

export function removeProfile(id: string) {
  const s = getState();
  commit({
    ...s,
    profiles: s.profiles.filter((p) => p.id !== id),
    activeId: s.activeId === id ? null : s.activeId,
  });
}

export function updateProfile(patch: Partial<Pick<Profile, "name" | "avatar" | "location" | "savingGoal" | "activePet">>) {
  updateActive((p) => ({ ...p, ...patch }));
}

// ------------------------------------------------------------- stars

function grant(reason: EarnReason, amount: number, key: string, note?: string): number {
  const p = active();
  const r = ledgerEarn(p.ledger, { key, reason, amount, day: dayKey(), note });
  if (!r.ok || r.duplicate) return 0;
  updateActive((x) => ({ ...x, ledger: r.ledger }));
  checkLevel();
  return r.amount;
}

function checkLevel() {
  const p = active();
  const level = levelFor(totalEarned(p.ledger));
  if (level > p.levelSeen) {
    updateActive((x) => ({ ...x, levelSeen: level }));
    emit("level.up", { level });
  }
}

export type SpendOutcome = "ok" | "insufficient" | "error";

function pay(itemId: string, key: string, note?: string): SpendOutcome {
  const p = active();
  const price = catalogPrice(itemId);
  if (price === undefined) return "error";
  const r = ledgerSpend(p.ledger, { key, itemId, price, day: dayKey(), note }, catalogPrice);
  if (!r.ok) return r.error === "insufficient" ? "insufficient" : "error";
  updateActive((x) => ({ ...x, ledger: r.ledger }));
  return "ok";
}

export function buyItem(itemId: string): SpendOutcome {
  const p = active();
  if (p.owned.includes(itemId)) return "ok";
  const outcome = pay(itemId, `buy:${itemId}`);
  if (outcome !== "ok") return outcome;
  updateActive((x) => {
    const next: Profile = { ...x, owned: [...x.owned, itemId] };
    if (itemId.startsWith("pet-")) {
      next.pets = [...x.pets, { itemId, name: "", fedDay: dayKey(), tricks: [] }];
      next.activePet = itemId;
    }
    if (x.savingGoal === itemId) next.savingGoal = undefined;
    return next;
  });
  return "ok";
}

export function equip(slot: GearSlot, itemId: string | undefined) {
  updateActive((p) => ({ ...p, equipped: { ...p.equipped, [slot]: itemId } }));
}

export function feedPet(itemId: string): SpendOutcome {
  const today = dayKey();
  const pet = active().pets.find((x) => x.itemId === itemId);
  if (!pet) return "error";
  if (pet.fedDay === today) return "ok";
  const outcome = pay("pet-food", `feed:${itemId}:${today}`);
  if (outcome !== "ok") return outcome;
  updateActive((p) => ({
    ...p,
    pets: p.pets.map((x) => (x.itemId === itemId ? { ...x, fedDay: today } : x)),
  }));
  return "ok";
}

export function learnTrick(itemId: string, trick: string) {
  updateActive((p) => ({
    ...p,
    pets: p.pets.map((x) =>
      x.itemId === itemId && !x.tricks.includes(trick) ? { ...x, tricks: [...x.tricks, trick] } : x,
    ),
  }));
}

// ------------------------------------------------------------- learning

export interface ActivityReward {
  stars: number;
  speakStars: number;
  masteredStars: number;
  newlyGold: string[];
}

/** Record an activity: schedule words, then award stars (idempotent per mission step). */
export function completeActivity(missionId: string, step: number, result: ActivityResult): ActivityReward {
  const today = dayKey();
  const before = active().memory;
  const memory = { ...before };
  for (const [wordId, q] of Object.entries(result.quality)) {
    memory[wordId] = review(memory[wordId], q as Quality, today);
  }
  const week = weekKey(today);
  const spokenCount = result.spoken.length;
  updateActive((p) => ({
    ...p,
    memory,
    spokenByWeek: spokenCount ? { ...p.spokenByWeek, [week]: (p.spokenByWeek[week] ?? 0) + spokenCount } : p.spokenByWeek,
  }));

  const stars = grant("activity", starsFor(result), `act:${missionId}:${step}`);
  let speakStars = 0;
  for (const w of result.spoken) speakStars += grant("speak", 1, `speak:${missionId}:${step}:${w}`);

  const newlyGold = Object.keys(result.quality).filter(
    (id) => (before[id]?.reps ?? 0) < GOLD_REPS && memory[id].reps >= GOLD_REPS,
  );
  let masteredStars = 0;
  for (const id of newlyGold) masteredStars += grant("mastered", 2, `mastered:${id}`);

  const weekly = active().spokenByWeek[week] ?? 0;
  if (weekly >= WEEKLY_SPEAK_GOAL) masteredStars += grant("weekly", 15, `weekly:${week}`);

  return { stars, speakStars, masteredStars, newlyGold };
}

export function logSpeech(word: string, ok: boolean) {
  updateActive((p) => ({ ...p, speakScores: [...p.speakScores, { day: dayKey(), word, ok }].slice(-200) }));
}

export interface MissionReward {
  missionBonus: number;
  streakBonus: number;
  streakCount: number;
  usedSnowDay: boolean;
  islandBonus: number;
  firstRestore: boolean;
  islandComplete: boolean;
  nextChapter: string | null;
}

export function completeMission(chapterId: string): MissionReward {
  const today = dayKey();
  const { island, index } = findChapter(chapterId);
  const p = active();
  const firstRestore = !p.visits[chapterId];

  const missionBonus = grant("mission", 5, `mission:${today}`);
  const s = completeDay(p.streak, today);
  updateActive((x) => ({ ...x, streak: s.streak, visits: { ...x.visits, [chapterId]: (x.visits[chapterId] ?? 0) + 1 } }));
  let sBonus = 0;
  if (s.advanced) {
    sBonus = grant("streak", streakBonus(s.streak.count), `streak:${today}`);
    emit("streak.up", { count: s.streak.count });
  }

  const after = active();
  const islandComplete = island.chapters.every((c) => (after.visits[c.id] ?? 0) > 0);
  let islandBonus = 0;
  if (islandComplete && !after.islandsDone.includes(island.id)) {
    islandBonus = grant("island", 50, `island:${island.id}`);
    updateActive((x) => ({ ...x, islandsDone: [...x.islandsDone, island.id] }));
  }

  const next = island.chapters[index + 1]?.id ?? null;
  if (firstRestore && next) updateActive((x) => ({ ...x, location: next }));

  return {
    missionBonus,
    streakBonus: sBonus,
    streakCount: s.streak.count,
    usedSnowDay: s.usedSnowDay,
    islandBonus,
    firstRestore,
    islandComplete,
    nextChapter: next,
  };
}

/** Words the child has met, with their memory. */
export function metWords(p: Profile) {
  return Object.keys(p.memory).filter((id) => WORDS[id]);
}

export function chapterUnlocked(p: Profile, islandIndex: number, chapterIndex: number): boolean {
  const isl = ISLANDS[islandIndex];
  if (!isl?.playable) return false;
  if (chapterIndex === 0) return true;
  return (p.visits[isl.chapters[chapterIndex - 1].id] ?? 0) > 0;
}

// ------------------------------------------------------------- debug

/** Debug mode: mark every stage of an island restored (n = 1) or reset (n = 0). */
export function debugSetIslandProgress(islandId: string, restored: boolean) {
  const isl = ISLANDS.find((i) => i.id === islandId);
  if (!isl) return;
  updateActive((p) => {
    const visits = { ...p.visits };
    for (const c of isl.chapters) {
      if (restored) visits[c.id] = Math.max(1, visits[c.id] ?? 0);
      else delete visits[c.id];
    }
    return {
      ...p,
      visits,
      location: restored ? isl.chapters[isl.chapters.length - 1].id : isl.chapters[0].id,
      islandsDone: restored ? [...new Set([...p.islandsDone, isl.id])] : p.islandsDone.filter((x) => x !== isl.id),
    };
  });
}

export function debugAddStars(amount: number) {
  grant("debug", Math.max(1, Math.round(amount)), `debug:${Date.now()}:${Math.random()}`);
}

/** Add exactly enough lifetime stars to reach a level. */
export function debugReachLevel(level: number) {
  const need = 10 * (Math.min(50, Math.max(1, level)) - 1) ** 2 - totalEarned(active().ledger);
  if (need > 0) debugAddStars(need);
}

export function debugResetProgress() {
  updateActive((p) => ({
    ...p,
    ledger: [],
    memory: {},
    visits: {},
    location: ISLANDS[0].chapters[0].id,
    islandsDone: [],
    streak: EMPTY_STREAK,
    owned: [],
    equipped: {},
    pets: [],
    activePet: undefined,
    savingGoal: undefined,
    playSeconds: {},
    requests: [],
    levelSeen: 1,
  }));
}

// ------------------------------------------------------------- time

export function addPlaySeconds(n: number) {
  const today = dayKey();
  updateActive((p) => ({ ...p, playSeconds: { ...p.playSeconds, [today]: (p.playSeconds[today] ?? 0) + n } }));
}

export type TimeGate = { ok: true; secondsLeft: number } | { ok: false; reason: "limit" | "bedtime" };

export function timeGate(p: Profile, parent: ParentSettings, now = new Date()): TimeGate {
  const today = dayKey(now);
  const [bh, bm] = parent.bedtime.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const extra = parent.extraMinutes[today] ?? 0;
  if (!extra && minutesNow >= bh * 60 + bm) return { ok: false, reason: "bedtime" };
  if (minutesNow < 6 * 60) return { ok: false, reason: "bedtime" };
  const limit = (parent.dailyMinutes + extra) * 60;
  const left = limit - (p.playSeconds[today] ?? 0);
  if (left <= 0) return { ok: false, reason: "limit" };
  return { ok: true, secondsLeft: left };
}

// ------------------------------------------------------------- rewards

export function requestReward(rewardId: string): SpendOutcome {
  const reward = getState().parent.rewards.find((r) => r.id === rewardId);
  if (!reward) return "error";
  const p = active();
  const id = uid("req");
  const r = ledgerSpend(
    p.ledger,
    { key: `reward:${id}`, itemId: rewardId, price: reward.price, day: dayKey(), note: reward.title },
    (rid) => getState().parent.rewards.find((x) => x.id === rid)?.price,
  );
  if (!r.ok) return r.error === "insufficient" ? "insufficient" : "error";
  updateActive((x) => ({
    ...x,
    ledger: r.ledger,
    requests: [
      ...x.requests,
      { id, rewardId, title: reward.title, price: reward.price, day: dayKey(), status: "pending" },
    ],
  }));
  return "ok";
}

// ------------------------------------------------------------- parent

export function updateParent(patch: Partial<ParentSettings>) {
  const s = getState();
  commit({ ...s, parent: { ...s.parent, ...patch } });
}

function updateProfileById(id: string, fn: (p: Profile) => Profile) {
  const s = getState();
  commit({ ...s, profiles: s.profiles.map((p) => (p.id === id ? fn(p) : p)) });
}

export function parentBonus(profileId: string, amount: number, note: string): boolean {
  const p = getState().profiles.find((x) => x.id === profileId);
  if (!p) return false;
  const r = ledgerEarn(p.ledger, { key: uid("bonus"), reason: "parent", amount, day: dayKey(), note });
  if (!r.ok) return false;
  updateProfileById(profileId, (x) => ({ ...x, ledger: r.ledger }));
  return true;
}

export function resolveRequest(profileId: string, requestId: string, approve: boolean) {
  const p = getState().profiles.find((x) => x.id === profileId);
  const req = p?.requests.find((r) => r.id === requestId);
  if (!p || !req || req.status !== "pending") return;
  let ledger = p.ledger;
  if (!approve) {
    const r = ledgerEarn(ledger, { key: `refund:${req.id}`, reason: "refund", amount: req.price, day: dayKey(), note: req.title });
    if (r.ok) ledger = r.ledger;
  }
  updateProfileById(profileId, (x) => ({
    ...x,
    ledger,
    requests: x.requests.map((r) => (r.id === requestId ? { ...r, status: approve ? "approved" : "declined" } : r)),
  }));
}

export function grantExtraMinutes(minutes: number) {
  const today = dayKey();
  const s = getState();
  updateParent({ extraMinutes: { ...s.parent.extraMinutes, [today]: (s.parent.extraMinutes[today] ?? 0) + minutes } });
}

export function exportData(): string {
  return JSON.stringify(getState(), null, 2);
}

export function eraseAll() {
  commit(EMPTY);
}
