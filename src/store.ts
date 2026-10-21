// UI state (what's toggled, which panel is open). Chemistry lives in the
// engine; this is only the stuff React needs to render controls.

import { create } from "zustand";
import { defaultLensSettings, LENSES, LensSettings } from "./model/lenses";
import { MODIFIERS } from "./model/modifiers";
import { N_SYSTEMS } from "./model/systems";
import { engine, TIME_SCALES, TimeScaleId } from "./engine/engine";

export type LayerId = "level" | "sensitivity" | "clearance" | "experience";
export type TabId = "here" | "labels" | "modifiers" | "go" | "view";
export type CompassMode = "chemistry" | "feelings" | "off";

export interface FlyRequest {
  position: [number, number, number];
  label: string;
  nonce: number;
}

interface UIState {
  phase: "loading" | "intro" | "explore";
  progress: number;
  seed: number;
  worldVersion: number;

  timeScale: TimeScaleId;
  paused: boolean;

  layer: LayerId;
  visibleSystems: boolean[];
  membranes: Record<string, boolean>;
  showCycling: boolean;
  lens: LensSettings;
  modifiers: boolean[];
  /** 0 = see the world as an observer, 1 = full first-person distortion */
  perception: number;
  compass: CompassMode;
  audio: boolean;
  hud: boolean;
  tab: TabId;
  flyRequest: FlyRequest | null;

  setPhase: (phase: UIState["phase"]) => void;
  setProgress: (p: number) => void;
  newWorld: (seed?: number) => Promise<void>;
  setTimeScale: (id: TimeScaleId) => void;
  togglePaused: () => void;
  setLayer: (layer: LayerId) => void;
  toggleSystem: (i: number) => void;
  soloSystem: (i: number) => void;
  toggleMembrane: (id: string) => void;
  toggleCycling: () => void;
  setSeverity: (v: number) => void;
  setRequired: (id: string, n: number) => void;
  resetLens: () => void;
  toggleModifier: (i: number) => void;
  setPerception: (v: number) => void;
  setCompass: (m: CompassMode) => void;
  toggleAudio: () => void;
  toggleHud: () => void;
  setTab: (t: TabId) => void;
  flyTo: (position: [number, number, number], label: string) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  phase: "loading",
  progress: 0,
  seed: 7,
  worldVersion: 0,

  timeScale: "day",
  paused: false,

  layer: "level",
  visibleSystems: Array(N_SYSTEMS).fill(true),
  membranes: Object.fromEntries(LENSES.map((l) => [l.id, false])),
  showCycling: false,
  lens: defaultLensSettings(),
  modifiers: Array(MODIFIERS.length).fill(false),
  perception: 1,
  compass: "chemistry",
  audio: false,
  hud: true,
  tab: "here",
  flyRequest: null,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),

  newWorld: async (seed) => {
    const next = seed ?? Math.floor(Math.random() * 1e9);
    set({ seed: next, progress: 0, phase: get().phase === "explore" ? "explore" : "loading" });
    await engine.loadWorld(next, (p) => set({ progress: p }));
    // re-apply toggles to the fresh simulation
    get().modifiers.forEach((on, i) => engine.sim?.setModifier(i, on));
    set((s) => ({ worldVersion: s.worldVersion + 1, phase: s.phase === "loading" ? "intro" : s.phase }));
  },

  setTimeScale: (id) => {
    const scale = TIME_SCALES.find((s) => s.id === id)!;
    engine.hoursPerSecond = scale.hoursPerSecond;
    set({ timeScale: id });
  },
  togglePaused: () => {
    engine.paused = !engine.paused;
    set({ paused: engine.paused });
  },

  setLayer: (layer) => set({ layer }),
  toggleSystem: (i) =>
    set((s) => {
      const v = [...s.visibleSystems];
      v[i] = !v[i];
      return { visibleSystems: v };
    }),
  soloSystem: (i) =>
    set((s) => {
      const alreadySolo = s.visibleSystems.every((on, j) => on === (j === i));
      return { visibleSystems: s.visibleSystems.map((_, j) => alreadySolo || j === i) };
    }),
  toggleMembrane: (id) => set((s) => ({ membranes: { ...s.membranes, [id]: !s.membranes[id] } })),
  toggleCycling: () => set((s) => ({ showCycling: !s.showCycling })),
  setSeverity: (v) => set((s) => ({ lens: { ...s.lens, severity: v } })),
  setRequired: (id, n) => set((s) => ({ lens: { ...s.lens, required: { ...s.lens.required, [id]: n } } })),
  resetLens: () => set({ lens: defaultLensSettings() }),
  toggleModifier: (i) =>
    set((s) => {
      const m = [...s.modifiers];
      m[i] = !m[i];
      engine.sim?.setModifier(i, m[i]);
      return { modifiers: m };
    }),
  setPerception: (perception) => set({ perception }),
  setCompass: (compass) => set({ compass }),
  toggleAudio: () => set((s) => ({ audio: !s.audio })),
  toggleHud: () => set((s) => ({ hud: !s.hud })),
  setTab: (tab) => set({ tab }),
  flyTo: (position, label) => set({ flyRequest: { position, label, nonce: Date.now() } }),
}));
