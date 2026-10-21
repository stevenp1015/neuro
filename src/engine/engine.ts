// The live engine: owns the world, the precomputed grid and the brain
// simulation that runs wherever the camera is. It lives outside React on
// purpose: the scene mutates it every frame, and the HUD polls it at a
// calmer rate, so 60fps chemistry never turns into 60fps re-renders.

import { createLocalParams, createWorld, LocalParams, World } from "../model/field";
import { buildGrid, FieldGrid } from "../model/grid";
import { BrainSim, SimSnapshot } from "../model/dynamics";
import { N_EXPERIENCE } from "../model/experience";
import { N_SYSTEMS } from "../model/systems";
import { findPlace, PLACES } from "../model/places";

export const TIME_SCALES = [
  { id: "moment", label: "Moment", rate: "1 min / s", hoursPerSecond: 1 / 60, bucketHours: 1 / 240 },
  { id: "day", label: "Day", rate: "1 hour / s", hoursPerSecond: 1, bucketHours: 0.25 },
  { id: "weeks", label: "Weeks", rate: "1 day / s", hoursPerSecond: 24, bucketHours: 6 },
  { id: "months", label: "Months", rate: "1 week / s", hoursPerSecond: 168, bucketHours: 42 },
] as const;
export type TimeScaleId = (typeof TIME_SCALES)[number]["id"];

/** z (9) + experience (11) + mood loop + asleep */
export const HISTORY_CHANNELS = N_SYSTEMS + N_EXPERIENCE + 2;
export const CH_M = N_SYSTEMS + N_EXPERIENCE;
export const CH_ASLEEP = CH_M + 1;
const HISTORY_CAP = 240;

/** Fixed-capacity ring buffer of averaged buckets. */
export class HistoryRing {
  data = new Float32Array(HISTORY_CAP * HISTORY_CHANNELS);
  count = 0;
  head = 0; // next write slot
  private acc = new Float64Array(HISTORY_CHANNELS);
  private accW = 0;
  private bucketEnd = -1;

  constructor(public bucketHours: number) {}

  push(t: number, sample: Float32Array, weight: number) {
    if (this.bucketEnd < 0) this.bucketEnd = Math.ceil(t / this.bucketHours) * this.bucketHours || this.bucketHours;
    for (let c = 0; c < HISTORY_CHANNELS; c++) this.acc[c] += sample[c] * weight;
    this.accW += weight;
    while (t >= this.bucketEnd) {
      this.commit();
      this.bucketEnd += this.bucketHours;
    }
  }

  private commit() {
    const base = this.head * HISTORY_CHANNELS;
    if (this.accW > 0) {
      for (let c = 0; c < HISTORY_CHANNELS; c++) this.data[base + c] = this.acc[c] / this.accW;
    } else if (this.count > 0) {
      // big time step skipped buckets: repeat the previous value
      const prev = ((this.head - 1 + HISTORY_CAP) % HISTORY_CAP) * HISTORY_CHANNELS;
      this.data.copyWithin(base, prev, prev + HISTORY_CHANNELS);
    }
    this.acc.fill(0);
    this.accW = 0;
    this.head = (this.head + 1) % HISTORY_CAP;
    this.count = Math.min(HISTORY_CAP, this.count + 1);
  }

  /** i = 0 is the oldest retained sample. */
  get(i: number, channel: number) {
    const start = (this.head - this.count + HISTORY_CAP) % HISTORY_CAP;
    return this.data[((start + i) % HISTORY_CAP) * HISTORY_CHANNELS + channel];
  }

  clear() {
    this.count = 0;
    this.head = 0;
    this.acc.fill(0);
    this.accW = 0;
    this.bucketEnd = -1;
  }

  get capacity() {
    return HISTORY_CAP;
  }
}

export interface DaySummary {
  day: number;
  /** mean experience while awake */
  experience: Float32Array;
  sleepHours: number;
}

class Engine {
  world: World | null = null;
  grid: FieldGrid | null = null;
  seed = 0;
  local: LocalParams = createLocalParams();
  sim: BrainSim | null = null;
  snapshot: SimSnapshot | null = null;

  position: [number, number, number] = [0, 0, 0];
  /** camera orientation as a quaternion [x, y, z, w], written by the flight controls */
  cameraQuat: [number, number, number, number] = [0, 0, 0, 1];
  startPosition: [number, number, number] = [0, 0, 0];

  hoursPerSecond: number = TIME_SCALES[1].hoursPerSecond;
  paused = false;

  history = TIME_SCALES.map((s) => new HistoryRing(s.bucketHours));
  days: DaySummary[] = [];
  private dayAcc = new Float64Array(N_EXPERIENCE);
  private dayAwake = 0;
  private daySleep = 0;
  private currentDay = -1;
  private sample = new Float32Array(HISTORY_CHANNELS);

  async loadWorld(seed: number, onProgress?: (f: number) => void) {
    this.seed = seed;
    this.world = createWorld(seed);
    this.grid = null;
    const grid = await buildGrid(this.world, 36, onProgress);
    this.grid = grid;
    const typical = PLACES.find((p) => p.id === "typical")!;
    this.startPosition = findPlace(grid, typical.target).position;
    this.position = [...this.startPosition];
    this.world.evaluate(...this.position, this.local);
    this.sim = new BrainSim(this.local, 9);
    this.snapshot = this.sim.snapshot(this.local);
    this.history.forEach((h) => h.clear());
    this.days = [];
    this.currentDay = -1;
  }

  /** Advance the brain at the camera's current location. */
  tick(dtReal: number) {
    if (!this.world || !this.sim) return;
    this.world.evaluate(this.position[0], this.position[1], this.position[2], this.local);
    const dtHours = this.paused ? 0 : Math.min(dtReal, 0.1) * this.hoursPerSecond;
    if (dtHours > 0) this.sim.step(dtHours, this.local);
    this.snapshot = this.sim.snapshot(this.local, this.snapshot ?? undefined);
    if (dtHours > 0) this.record(dtHours);
  }

  private record(dtHours: number) {
    const s = this.snapshot!;
    this.sample.set(s.z, 0);
    this.sample.set(s.experience, N_SYSTEMS);
    this.sample[CH_M] = s.m;
    this.sample[CH_ASLEEP] = s.asleep ? 1 : 0;
    for (const h of this.history) h.push(s.t, this.sample, dtHours);

    if (this.currentDay < 0) this.currentDay = s.day;
    if (s.day !== this.currentDay) {
      if (this.dayAwake > 1) {
        const experience = new Float32Array(N_EXPERIENCE);
        for (let i = 0; i < N_EXPERIENCE; i++) experience[i] = this.dayAcc[i] / this.dayAwake;
        this.days.push({ day: this.currentDay, experience, sleepHours: this.daySleep });
        if (this.days.length > 800) this.days.shift();
      }
      this.dayAcc.fill(0);
      this.dayAwake = 0;
      this.daySleep = 0;
      this.currentDay = s.day;
    }
    if (s.asleep) this.daySleep += dtHours;
    else {
      for (let i = 0; i < N_EXPERIENCE; i++) this.dayAcc[i] += s.experience[i] * dtHours;
      this.dayAwake += dtHours;
    }
  }

  resetTimeline() {
    this.history.forEach((h) => h.clear());
    this.days = [];
    this.currentDay = -1;
  }
}

export const engine = new Engine();
