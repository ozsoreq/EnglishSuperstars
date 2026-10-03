"use client";
/**
 * Developer debug mode: unlocks every stage, ignores the time limit and
 * shows the debug panel. Turn on with `?debug=1` in the URL (or the switch
 * in the parent area); `?debug=0` turns it off. Stored per device.
 */
import { useSyncExternalStore } from "react";
import type { ActivityType } from "./content/types";

const KEY = "kochavim:debug";
let on = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const param = new URLSearchParams(window.location.search).get("debug");
    if (param === "1" || param === "0") window.localStorage.setItem(KEY, param);
    on = window.localStorage.getItem(KEY) === "1";
  } catch {
    on = false;
  }
}

export function isDebug(): boolean {
  load();
  return on;
}

export function setDebug(value: boolean) {
  on = value;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* storage blocked — still works for this visit */
  }
  listeners.forEach((l) => l());
}

export function useDebug(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    isDebug,
    () => false,
  );
}

/** How the debug panel asks a quest to run. */
export interface QuestOverride {
  /** Play just this one activity type. */
  only?: ActivityType;
  /** Force the first-visit story path, or the revisit path. */
  visit?: "first" | "revisit";
}
