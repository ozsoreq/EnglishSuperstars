"use client";
/**
 * App shell: picks the screen, tracks play time against the parent's daily
 * limit, and hosts the global overlays (star flight, celebrations, level-up).
 * Screen changes use the native View Transitions API where available.
 */
import { LazyMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { setSound, setVoice, stopSpeaking } from "@/lib/audio";
import { addPlaySeconds, selectProfile, timeGate, useFamily, useProfile } from "@/lib/store";
import { Celebration } from "./Celebration";
import { LevelUp } from "./LevelUp";
import { StarFlight } from "./StarFlight";
import { IslandMap } from "./screens/IslandMap";
import { NewExplorer, ProfilePicker } from "./screens/Welcome";
import { cancelDebugRequest, setDebug, useDebug, useDebugRequest, type QuestOverride } from "@/lib/debug";
import { Emoji } from "@/components/Emoji";

// Only the map and onboarding are needed at start; everything else loads on
// demand to keep the first load small (spec budget: < 200 KB gzipped JS).
const Quest = dynamic(() => import("./screens/Quest").then((m) => m.Quest), { ssr: false });
const Camp = dynamic(() => import("./screens/Camp").then((m) => m.Camp), { ssr: false });
const Journal = dynamic(() => import("./screens/Journal").then((m) => m.Journal), { ssr: false });
const WorldMap = dynamic(() => import("./screens/WorldMap").then((m) => m.WorldMap), { ssr: false });
const ParentGate = dynamic(() => import("./screens/Parent").then((m) => m.ParentGate), { ssr: false });
const ParentDashboard = dynamic(() => import("./screens/Parent").then((m) => m.ParentDashboard), { ssr: false });
const Goodnight = dynamic(() => import("./Goodnight").then((m) => m.Goodnight), { ssr: false });
const DebugPanel = dynamic(() => import("./DebugPanel").then((m) => m.DebugPanel), { ssr: false });

type Screen = "map" | "world" | "quest" | "camp" | "journal" | "gate" | "parent" | "new";

const TICK = 5;

const loadMotion = () => import("@/lib/motion-features").then((m) => m.default);

/** Components use `m` (aliased as `motion`); the engine streams in lazily. */
export function GameApp() {
  return (
    <LazyMotion features={loadMotion} strict>
      <App />
    </LazyMotion>
  );
}

function App() {
  const fam = useFamily();
  const profile = useProfile();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("map");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [greeted, setGreeted] = useState<string | null>(null);
  const [, setNow] = useState(0);
  const debug = useDebug();
  const debugRequested = useDebugRequest();
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

  // `?debug=1` needs a grown-up: show the parent gate first.
  if (debugRequested && !debug && fam.profiles.length > 0) {
    return <ParentGate onPass={() => setDebug(true)} onCancel={cancelDebugRequest} />;
  }

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
