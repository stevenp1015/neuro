"use client";
import * as THREE from "three";
import { create } from "zustand";
import { ConnectionSegment } from "./src/types/NeuroClusterKey";
import { Star, ClusteringResult } from "./ClusteringResult";
import { VisualizationOptions, AnalyticsSlice } from "./src/types/VisualizationOptions";
import { StoreState } from "./StoreState";
import { RangeFilter } from "./src/types/NeuroCluster";
import { ColorMode, DetailPanel, ThemePreference } from "./src/types/ColorMode";
import { NEURO_AXES } from "./NEURO_AXES";

// Advanced state management

export const useStore = create<StoreState>()((set, get) => ({
  // Core data
  stars: [] as Star[],
  connections: [] as ConnectionSegment[],
  filters: NEURO_AXES.map<RangeFilter>(() => ({ min: 0, max: 100 })),
  activeAxes: new Set<number>(NEURO_AXES.map((_, i) => i)),

  // Interaction state
  hoveredStar: null as Star | null,
  selectedStars: new Set<number>(),
  lassoSelection: false,
  lassoPoints: [] as THREE.Vector2[],

  // Visualization options
  showConnections: false,
  showConstellations: true,
  animationSpeed: 1.0,
  colorMode: "cluster" as ColorMode,
  pointSize: 2.0,

  // Analytics
  clustering: null as ClusteringResult | null,
  pca: null as unknown,
  correlationMatrix: null as number[][] | null,
  anomalyThreshold: 0.05,
  anomalyScores: null as number[] | null,

  // UI state
  detailPanel: "vector" as DetailPanel,
  searchQuery: "",
  showLegend: true,
  theme: "dark" as ThemePreference,

  // Navigation (new)
  moveSpeed: 50,
  mouseSensitivity: 0.002,
  showAxisRails: true,
  showDiagnosisBoundaries: true,

  // Profile system (new)
  profiles: [],
  currentProfile: null,

  // Path tracing (new)
  pathPoints: [],
  isDrawingPath: false,

  // WebXR (new)
  isVRMode: false,

  // Actions
  setStars: (stars: Star[]) => set({ stars }),
  setConnections: (connections: ConnectionSegment[]) => set({ connections }),
  setFilters: (filters: RangeFilter[]) => set({ filters }),
  toggleAxis: (axisIndex: number) => set((state) => {
    const newActiveAxes = new Set(state.activeAxes);
    if (newActiveAxes.has(axisIndex)) newActiveAxes.delete(axisIndex);
    else newActiveAxes.add(axisIndex);
    return { activeAxes: newActiveAxes };
  }),
  setHoveredStar: (star: Star | null) => set({ hoveredStar: star }),
  toggleSelectedStar: (starId: number) => set((state) => {
    const newSelected = new Set(state.selectedStars);
    if (newSelected.has(starId)) newSelected.delete(starId);
    else newSelected.add(starId);
    return { selectedStars: newSelected };
  }),
  clearSelection: () => set({ selectedStars: new Set<number>() }),
  updateVisualizationOptions: (options: Partial<VisualizationOptions>) => set((state) => ({ ...state, ...options })),
  setAnalytics: (analytics: Partial<AnalyticsSlice>) => set((state) => ({ ...state, ...analytics })),

  // Navigation actions (new)
  setMoveSpeed: (speed: number) => set({ moveSpeed: speed }),
  setMouseSensitivity: (sensitivity: number) => set({ mouseSensitivity: sensitivity }),
  toggleAxisRails: () => set((state) => ({ showAxisRails: !state.showAxisRails })),
  toggleDiagnosisBoundaries: () => set((state) => ({ showDiagnosisBoundaries: !state.showDiagnosisBoundaries })),

  // Profile actions (new)
  saveProfile: (profile) => set((state) => ({
    profiles: [...state.profiles, profile],
    currentProfile: profile,
  })),
  loadProfile: (profileId: string) => set((state) => {
    const profile = state.profiles.find((p) => p.id === profileId);
    return { currentProfile: profile || null };
  }),
  deleteProfile: (profileId: string) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== profileId),
  })),

  // Path tracing actions (new)
  addPathPoint: (point) => set((state) => ({
    pathPoints: [...state.pathPoints, point],
  })),
  clearPath: () => set({ pathPoints: [] }),
  togglePathDrawing: () => set((state) => ({ isDrawingPath: !state.isDrawingPath })),

  // WebXR actions (new)
  setVRMode: (enabled: boolean) => set({ isVRMode: enabled }),
}));
