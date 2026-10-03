"use client";
/**
 * Developer debug mode: unlocks every stage, ignores the time limit and
 * shows the debug panel. `?debug=1` in the URL asks for the parent gate
 * before turning it on (so a child can't grant themselves stars); the
 * switch in the parent area works too. `?debug=0` turns it off. Stored per
 * device.
 */
import { useSyncExternalStore } from "react";
import type { ActivityType } from "./content/types";

const KEY = "kochavim:debug";
let on = false;
let pending = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("debug");
    if (param === "0") window.localStorage.setItem(KEY, "0");
    on = window.localStorage.getItem(KEY) === "1";
    if (param === "1" && !on) pending = true;
    if (param !== null) {
      url.searchParams.delete("debug");
      window.history.replaceState(null, "", url);
    }
  } catch {
    on = false;
  }
}

export function isDebug(): boolean {
  load();
  return on;
}

/** A `?debug=1` request waiting for the parent gate. */
export function isDebugRequested(): boolean {
  load();
  return pending;
}

export function setDebug(value: boolean) {
  on = value;
  pending = false;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* storage blocked — still works for this visit */
  }
  listeners.forEach((l) => l());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function useDebug(): boolean {
  return useSyncExternalStore(subscribe, isDebug, () => false);
}

export function useDebugRequest(): boolean {
  return useSyncExternalStore(subscribe, isDebugRequested, () => false);
}

export function cancelDebugRequest() {
  pending = false;
  listeners.forEach((l) => l());
}

/** How the debug panel asks a quest to run. */
export interface QuestOverride {
  /** Play just this one activity type. */
  only?: ActivityType;
  /** Force the first-visit story path, or the revisit path. */
  visit?: "first" | "revisit";
}
