// The landscape: a continuous field that assigns a full neurochemical
// configuration to every point in 3D space.
//
// There are no diagnosis spheres in here. The world is built from
// unlabeled "weather systems" (smooth basins where several systems shift
// together, because that's how real neurochemistry covaries) plus
// independent drift per system. Where basins overlap you get blends; that's
// where comorbidity lives.
//
// Labels get computed *afterwards* by the lens (lenses.ts), the same way
// a clinician applies criteria to whatever a person walks in with.

import { equilibriumSignal } from "./network";
import { createSimplex3, mulberry32, Noise3 } from "./random";
import { N_SYSTEMS } from "./systems";

export const WORLD_HALF = 240;

export interface LocalParams {
  /** log set point per system (0 = population typical, ±0.7 ≈ ×2 / ÷2). */
  logLevel: Float32Array;
  /** log receptor sensitivity per system. */
  logSensitivity: Float32Array;
  /** log clearance (transport) rate per system. Higher = cleared faster. */
  logClearance: Float32Array;
  /** Jitter multiplier: how noisy moment-to-moment chemistry is here. */
  volatility: number;
  /** Mood-loop excitability (FitzHugh–Nagumo input current I). */
  drive: number;
  /** Mood-loop tempo (FHN ε). Higher = faster cycling. */
  tempo: number;
}

export function createLocalParams(): LocalParams {
  return {
    logLevel: new Float32Array(N_SYSTEMS),
    logSensitivity: new Float32Array(N_SYSTEMS),
    logClearance: new Float32Array(N_SYSTEMS),
    volatility: 1,
    drive: 0,
    tempo: 0.08,
  };
}

export function copyLocalParams(src: LocalParams, dst: LocalParams) {
  dst.logLevel.set(src.logLevel);
  dst.logSensitivity.set(src.logSensitivity);
  dst.logClearance.set(src.logClearance);
  dst.volatility = src.volatility;
  dst.drive = src.drive;
  dst.tempo = src.tempo;
}

// Basin templates in log space, ordered like SYSTEM_IDS:
// [daReward, daFocus, serotonin, norepinephrine, gaba, glutamate, cortisol, opioid, oxytocin]
// These are deliberately unnamed in the UI. They're weather, not diagnoses.
interface BasinTemplate {
  level: number[];
  sensitivity?: number[];
  drive: number;
  volatility: number;
  copies: number;
}

const TEMPLATES: BasinTemplate[] = [
  // stress storm: HPA + LC loop running hot, brakes weak
  { level: [-0.2, -0.25, -0.35, 0.7, -0.45, 0.35, 0.8, -0.2, -0.3], drive: 0.1, volatility: 0.35, copies: 2 },
  // depletion: reward, serotonin and comfort systems running low under chronic cortisol
  { level: [-0.75, -0.35, -0.55, -0.3, 0.1, -0.2, 0.45, -0.55, -0.35], sensitivity: [-0.25, 0, -0.1, 0, 0, 0, 0, -0.2, 0], drive: -0.15, volatility: -0.2, copies: 2 },
  // high drive: reward + arousal + excitation, mood loop near/inside its cycling band
  { level: [0.7, 0.2, -0.15, 0.5, -0.25, 0.5, 0.0, 0.3, 0.1], drive: 1.05, volatility: 0.25, copies: 1 },
  // scattered: plenty of arousal, not much prefrontal dopamine to steer it
  { level: [0.15, -0.8, 0.0, 0.45, -0.1, 0.2, 0.0, 0.0, 0.0], sensitivity: [0, -0.2, 0, 0, 0, 0, 0, 0, 0], drive: 0.15, volatility: 0.3, copies: 2 },
  // aberrant salience: limbic dopamine high, cortical dopamine low, glutamate unstable
  { level: [0.85, -0.6, -0.1, 0.25, -0.3, 0.55, 0.3, 0.0, -0.3], sensitivity: [0.3, 0, 0, 0, 0, 0, 0, 0, 0], drive: 0.3, volatility: 0.3, copies: 1 },
  // warm & safe: oxytocin, opioids and serotonin up, stress axis quiet
  { level: [0.2, 0.15, 0.35, -0.3, 0.3, -0.1, -0.45, 0.45, 0.8], drive: 0.0, volatility: -0.2, copies: 1 },
  // muffled: heavy inhibition, everything turned down
  { level: [-0.3, -0.2, 0.2, -0.5, 0.75, -0.45, -0.2, 0.0, 0.0], drive: -0.2, volatility: -0.3, copies: 1 },
  // keyed up but good: everything a notch up, near the mood loop's tipping point
  { level: [0.4, 0.4, 0.2, 0.3, 0.0, 0.2, 0.1, 0.25, 0.2], drive: 0.3, volatility: 0.1, copies: 1 },
  // rested and even: a little more braking, a little less noise
  { level: [0.0, 0.1, 0.15, -0.25, 0.25, -0.1, -0.2, 0.05, 0.1], drive: -0.2, volatility: -0.25, copies: 2 },
];

interface Basin {
  cx: number;
  cy: number;
  cz: number;
  invTwoSigma2: number;
  level: Float32Array;
  sensitivity: Float32Array;
  drive: number;
  volatility: number;
}

export interface World {
  seed: number;
  basins: Basin[];
  evaluate(x: number, y: number, z: number, out: LocalParams): LocalParams;
}

export function createWorld(seed: number): World {
  const rand = mulberry32(seed);
  const basins: Basin[] = [];

  // Spread basin centers with a simple rejection rule so they overlap at the
  // edges instead of stacking on top of each other.
  const placed: [number, number, number][] = [];
  const pickCenter = (): [number, number, number] => {
    let best: [number, number, number] = [0, 0, 0];
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 30; attempt++) {
      const c: [number, number, number] = [
        (rand() * 2 - 1) * WORLD_HALF * 0.78,
        (rand() * 2 - 1) * WORLD_HALF * 0.6,
        (rand() * 2 - 1) * WORLD_HALF * 0.78,
      ];
      // keep the spawn point near the origin mostly neutral
      let minD = Math.hypot(c[0], c[1], c[2]) * 1.4;
      for (const p of placed) minD = Math.min(minD, Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]));
      if (minD > bestScore) {
        bestScore = minD;
        best = c;
      }
    }
    placed.push(best);
    return best;
  };

  for (const t of TEMPLATES) {
    for (let c = 0; c < t.copies; c++) {
      const [cx, cy, cz] = pickCenter();
      const sigma = 58 + rand() * 40;
      const jitter = () => 0.75 + rand() * 0.5;
      const level = new Float32Array(N_SYSTEMS);
      const sensitivity = new Float32Array(N_SYSTEMS);
      for (let i = 0; i < N_SYSTEMS; i++) {
        level[i] = t.level[i] * jitter();
        sensitivity[i] = (t.sensitivity?.[i] ?? 0) * jitter();
      }
      basins.push({
        cx, cy, cz,
        invTwoSigma2: 1 / (2 * sigma * sigma),
        level,
        sensitivity,
        drive: t.drive * jitter(),
        volatility: t.volatility,
      });
    }
  }

  // Independent noise fields: each system drifts on its own a bit, and the
  // sensitivity/transport factors vary across space independently of level.
  const levelNoise: Noise3[] = [];
  const sensNoise: Noise3[] = [];
  const clearNoise: Noise3[] = [];
  for (let i = 0; i < N_SYSTEMS; i++) {
    levelNoise.push(createSimplex3(rand));
    sensNoise.push(createSimplex3(rand));
    clearNoise.push(createSimplex3(rand));
  }
  const driveNoise = createSimplex3(rand);
  const tempoNoise = createSimplex3(rand);
  const volNoise = createSimplex3(rand);

  const weights = new Float32Array(basins.length);
  const levelOffset = new Float32Array(N_SYSTEMS);

  const evaluate = (x: number, y: number, z: number, out: LocalParams) => {
    for (let k = 0; k < basins.length; k++) {
      const b = basins[k];
      const dx = x - b.cx, dy = y - b.cy, dz = z - b.cz;
      weights[k] = Math.exp(-(dx * dx + dy * dy + dz * dz) * b.invTwoSigma2);
    }

    let drive = 0.0 + 0.2 * driveNoise(x / 170, y / 170, z / 170);
    let vol = 0.3 * volNoise(x / 200, y / 200, z / 200);
    for (let k = 0; k < basins.length; k++) {
      drive += basins[k].drive * weights[k];
      vol += basins[k].volatility * weights[k];
    }

    for (let i = 0; i < N_SYSTEMS; i++) {
      let lv =
        0.26 * levelNoise[i](x / 150, y / 150, z / 150) +
        0.1 * levelNoise[i](x / 55 + 17.3, y / 55, z / 55);
      let sv = 0.22 * sensNoise[i](x / 190, y / 190, z / 190);
      for (let k = 0; k < basins.length; k++) {
        const w = weights[k];
        if (w < 1e-4) continue;
        lv += basins[k].level[i] * w;
        sv += basins[k].sensitivity[i] * w;
      }
      out.logLevel[i] = lv - levelOffset[i];
      out.logSensitivity[i] = sv;
      out.logClearance[i] = 0.22 * clearNoise[i](x / 180, y / 180, z / 180);
    }

    out.drive = drive;
    out.volatility = Math.exp(vol);
    out.tempo = 0.075 * Math.exp(0.45 * tempoNoise(x / 210, y / 210, z / 210));
    return out;
  };

  // Define "typical" as the population median: sample the world and shift
  // levels so the median effective signal of every system sits at 0. (The
  // median, not the mean: a few intense weather systems shouldn't make the
  // quiet majority of the map read as "depleted".)
  const probe = createLocalParams();
  const zs = new Float32Array(N_SYSTEMS);
  const scratch = new Float32Array(N_SYSTEMS);
  const samples = 2500;
  const cols = Array.from({ length: N_SYSTEMS }, () => new Float32Array(samples));
  for (let pass = 0; pass < 2; pass++) {
    for (let s = 0; s < samples; s++) {
      evaluate((rand() * 2 - 1) * WORLD_HALF, (rand() * 2 - 1) * WORLD_HALF, (rand() * 2 - 1) * WORLD_HALF, probe);
      equilibriumSignal(probe.logLevel, probe.logClearance, probe.logSensitivity, zs, scratch);
      for (let i = 0; i < N_SYSTEMS; i++) cols[i][s] = zs[i];
    }
    for (let i = 0; i < N_SYSTEMS; i++) {
      cols[i].sort();
      levelOffset[i] += cols[i][samples >> 1];
    }
  }

  return { seed, basins, evaluate };
}
