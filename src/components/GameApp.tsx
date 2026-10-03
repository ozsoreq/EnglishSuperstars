"use client";
/**
 * App shell: picks the screen, tracks play time against the parent's daily
 * limit, and hosts the global overlays (star flight, celebrations, level-up).
 * Screen changes use the native View Transitions API where available.
 */
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { setSound, setVoice, stopSpeaking } from "@/lib/audio";
import { addPlaySeconds, selectProfile, timeGate, useFamily, useProfile } from "@/lib/store";
import { Celebration } from "./Celebration";
import { Goodnight } from "./Goodnight";
import { LevelUp } from "./LevelUp";
import { StarFlight } from "./StarFlight";
import { Camp } from "./screens/Camp";
import { IslandMap } from "./screens/IslandMap";
import { Journal } from "./screens/Journal";
import { ParentDashboard, ParentGate } from "./screens/Parent";
import { Quest } from "./screens/Quest";
import { NewExplorer, ProfilePicker } from "./screens/Welcome";
import { WorldMap } from "./screens/WorldMap";
import { DebugPanel } from "./DebugPanel";
import { useDebug, type QuestOverride } from "@/lib/debug";
import { Emoji } from "@/components/Emoji";

type Screen = "map" | "world" | "quest" | "camp" | "journal" | "gate" | "parent" | "new";

const TICK = 5;

export function GameApp() {
  const fam = useFamily();
  const profile = useProfile();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("map");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [greeted, setGreeted] = useState<string | null>(null);
  const [, setNow] = useState(0);
  const debug = useDebug();
  const [override, setOverride] = useState<QuestOverride | undefined>(undefined);
  const [launch, setLaunch] = useState(0);
  const [goodnightPreview, setGoodnightPreview] = useState<"limit" | "bedtime" | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSound(fam.parent.sound);
    setVoice(fam.parent.voice);
  }, [fam.parent.sound, fam.parent.voice]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const go = useCallback((next: Screen) => {
    stopSpeaking();
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(() => setScreen(next)));
    else setScreen(next);
  }, []);

  const inParentArea = screen === "gate" || screen === "parent";
  const gate = profile ? timeGate(profile, fam.parent) : null;
  // Debug mode ignores the daily limit and bedtime.
  const blocked = Boolean(profile && gate && !gate.ok && !inParentArea && !debug);

  // Count play time while a child is playing and the tab is visible.
  useEffect(() => {
    if (!profile || inParentArea || blocked) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") addPlaySeconds(TICK);
      setNow(Date.now());
    }, TICK * 1000);
    return () => clearInterval(id);
  }, [profile, inParentArea, blocked]);

  if (!mounted) {
    return <div className="grid min-h-dvh place-items-center text-6xl"><Emoji e="⭐" anim="spin" /></div>;
  }

  const overlays = (
    <>
      <StarFlight />
      <Celebration />
      {profile && <LevelUp profile={profile} />}
    </>
  );

  if (screen === "gate") {
    return <ParentGate onPass={() => go("parent")} onCancel={() => go("map")} />;
  }
  if (screen === "parent") {
    return <ParentDashboard onExit={() => go("map")} onAddChild={() => go("new")} />;
  }

  if (fam.profiles.length === 0 || screen === "new") {
    return (
      <>
        <NewExplorer onDone={() => go("map")} onCancel={fam.profiles.length ? () => go("map") : undefined} />
        {overlays}
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <ProfilePicker onNew={() => go("new")} />
        {overlays}
      </>
    );
  }

  const nav = (to: "camp" | "journal" | "world" | "parent" | "profiles") => {
    if (to === "parent") return go("gate");
    if (to === "profiles") {
      stopSpeaking();
      selectProfile(null);
      return;
    }
    go(to);
  };

  let body: React.ReactNode;
  switch (screen) {
    case "quest":
      body = chapterId ? (
        <Quest
          key={`${chapterId}:${launch}`}
          profile={profile}
          chapterId={chapterId}
          onExit={() => go("map")}
          onCamp={() => go("camp")}
          override={debug ? override : undefined}
          debug={debug}
        />
      ) : null;
      break;
    case "camp":
      body = <Camp profile={profile} onBack={() => go("map")} />;
      break;
    case "journal":
      body = <Journal profile={profile} onBack={() => go("map")} />;
      break;
    case "world":
      body = <WorldMap profile={profile} onIsland={() => go("map")} onBack={() => go("map")} />;
      break;
    default:
      body = (
        <IslandMap
          profile={profile}
          greet={greeted !== profile.id}
          onNav={(to) => {
            setGreeted(profile.id);
            nav(to);
          }}
          onEnter={(id) => {
            setGreeted(profile.id);
            setOverride(undefined);
            setChapterId(id);
            setLaunch((n) => n + 1);
            go("quest");
          }}
        />
      );
  }

  return (
    <>
      {body}
      {overlays}
      {blocked && gate && !gate.ok && <Goodnight name={profile.name} reason={gate.reason} onParent={() => go("gate")} />}
      {goodnightPreview && (
        <div onClick={() => setGoodnightPreview(null)}>
          <Goodnight name={profile.name} reason={goodnightPreview} onParent={() => setGoodnightPreview(null)} />
        </div>
      )}
      {debug && (
        <DebugPanel
          profile={profile}
          onPlay={(id, o) => {
            setGreeted(profile.id);
            setOverride(o);
            setChapterId(id);
            setLaunch((n) => n + 1);
            go("quest");
          }}
          onScreen={(s) => go(s)}
          onGoodnight={(reason) => setGoodnightPreview(reason)}
        />
      )}
    </>
  );
}
