"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { engine } from "./engine/engine";
import { TIME_SCALES } from "./engine/engine";
import { Soundscape } from "./audio/soundscape";
import { Nebulae } from "./scene/Nebulae";
import { Membranes } from "./scene/Membranes";
import { Flight } from "./scene/Flight";
import { Perception } from "./scene/Perception";
import { Backdrop, Distractors, Driver, Trail } from "./scene/Ambient";
import { NetworkGraph } from "./ui/NetworkGraph";
import { SidePanel } from "./ui/SidePanel";
import { Timeline } from "./ui/Timeline";
import { Compass } from "./ui/Compass";
import { BoundaryToasts, Intro, Loading, TitleVoice } from "./ui/Overlays";
import { useUI } from "./store";

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const ui = useUI.getState();
      if (ui.phase !== "explore") return;
      if (e.code === "KeyH") ui.toggleHud();
      if (e.code === "KeyP") ui.togglePaused();
      const n = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
      if (n >= 0) ui.setTimeScale(TIME_SCALES[n].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useSoundscape() {
  const audio = useUI((s) => s.audio);
  const phase = useUI((s) => s.phase);
  const sound = useRef<Soundscape | null>(null);
  useEffect(() => {
    if (!sound.current) sound.current = new Soundscape();
    const on = audio && phase === "explore";
    if (on) sound.current.start();
    else sound.current.stop();
    if (!on) return;
    const id = setInterval(() => {
      const s = engine.snapshot;
      if (s) sound.current?.update(s.experience, s.asleep, useUI.getState().perception);
    }, 100);
    return () => clearInterval(id);
  }, [audio, phase]);
}

let worldRequested = false;

export default function App() {
  const phase = useUI((s) => s.phase);
  const hud = useUI((s) => s.hud);
  const worldVersion = useUI((s) => s.worldVersion);
  const newWorld = useUI((s) => s.newWorld);
  useKeyboard();
  useSoundscape();

  useEffect(() => {
    // StrictMode runs effects twice in dev; only grow the first world once
    if (worldRequested) return;
    worldRequested = true;
    newWorld(useUI.getState().seed);
  }, [newWorld]);

  const ready = worldVersion > 0;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {ready && (
        <Canvas
          camera={{ fov: 68, near: 0.5, far: 4000, position: engine.startPosition }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          dpr={[1, 1.75]}
        >
          <Driver />
          <Flight />
          <Backdrop />
          <Nebulae />
          <Membranes />
          <Trail />
          <Distractors />
          <Perception />
        </Canvas>
      )}

      {phase === "loading" && <Loading />}
      {phase === "intro" && <Intro />}

      {phase === "explore" && hud && (
        <div className="absolute inset-0 pointer-events-none">
          <Compass />
          <BoundaryToasts />
          <div className="absolute left-4 top-4 bottom-[200px] flex flex-col gap-3 nv-scroll pointer-events-auto" style={{ width: 300 }}>
            <TitleVoice />
            <NetworkGraph />
          </div>
          <div className="absolute right-4 top-4 bottom-4">
            <SidePanel />
          </div>
          <div className="absolute left-4 bottom-4 right-[392px]">
            <Timeline />
          </div>
        </div>
      )}
      {phase === "explore" && !hud && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-[var(--nv-faint)] pointer-events-none">
          press <kbd>H</kbd> to bring the HUD back
        </div>
      )}
    </div>
  );
}
