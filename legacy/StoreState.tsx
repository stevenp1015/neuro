"use client";
import * as THREE from "three";
import { ConnectionSegment } from "./src/types/NeuroClusterKey";
import { Star, ClusteringResult } from "./ClusteringResult";
import { VisualizationOptions, AnalyticsSlice } from "./src/types/VisualizationOptions";
import { ColorMode, DetailPanel, ThemePreference } from "./src/types/ColorMode";
import { RangeFilter } from "./src/types/NeuroCluster";
import { NeurochemicalState } from "./NeurochemistryModel";

// Profile snapshot for saving/loading states
export interface ProfileSnapshot {
  id: string;
  name: string;
  timestamp: number;
  cameraPosition: THREE.Vector3;
  cameraRotation: THREE.Euler;
  neurochemicalState?: NeurochemicalState;
  notes?: string;
}

// Path trajectory point
export interface PathPoint {
  position: THREE.Vector3;
  timestamp: number;
  neurochemicalState?: NeurochemicalState;
}

export interface StoreState {
  // Data
  stars: Star[];
  connections: ConnectionSegment[];
  filters: RangeFilter[];
  activeAxes: Set<number>;

  // Interaction
  hoveredStar: Star | null;
  selectedStars: Set<number>;
  lassoSelection: boolean;
  lassoPoints: THREE.Vector2[];

  // Visualization
  showConnections: boolean;
  showConstellations: boolean;
  animationSpeed: number;
  colorMode: ColorMode;
  pointSize: number;

  // Analytics
  clustering: ClusteringResult | null;
  pca: unknown;
  correlationMatrix: number[][] | null;
  anomalyThreshold: number;
  anomalyScores: number[] | null;

  // UI
  detailPanel: DetailPanel;
  searchQuery: string;
  showLegend: boolean;
  theme: ThemePreference;

  // Navigation (new)
  moveSpeed: number;
  mouseSensitivity: number;
  showAxisRails: boolean;
  showDiagnosisBoundaries: boolean;

  // Profile system (new)
  profiles: ProfileSnapshot[];
  currentProfile: ProfileSnapshot | null;

  // Path tracing (new)
  pathPoints: PathPoint[];
  isDrawingPath: boolean;

  // WebXR (new)
  isVRMode: boolean;

  // Actions
  setStars: (stars: Star[]) => void;
  setConnections: (connections: ConnectionSegment[]) => void;
  setFilters: (filters: RangeFilter[]) => void;
  toggleAxis: (axisIndex: number) => void;
  setHoveredStar: (star: Star | null) => void;
  toggleSelectedStar: (starId: number) => void;
  clearSelection: () => void;
  updateVisualizationOptions: (options: Partial<VisualizationOptions>) => void;
  setAnalytics: (analytics: Partial<AnalyticsSlice>) => void;

  // Navigation actions (new)
  setMoveSpeed: (speed: number) => void;
  setMouseSensitivity: (sensitivity: number) => void;
  toggleAxisRails: () => void;
  toggleDiagnosisBoundaries: () => void;

  // Profile actions (new)
  saveProfile: (profile: ProfileSnapshot) => void;
  loadProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;

  // Path tracing actions (new)
  addPathPoint: (point: PathPoint) => void;
  clearPath: () => void;
  togglePathDrawing: () => void;

  // WebXR actions (new)
  setVRMode: (enabled: boolean) => void;
}
