// A sampled copy of the field on a regular 3D lattice.
//
// Used for: the particle nebulae, the label membranes (marching cubes) and
// "find a place that feels like…". Indexing matches three.js MarchingCubes:
// cell (i, j, k) sits at world ((i - N/2) / (N/2)) * WORLD_HALF.

import { equilibriumSignal } from "./network";
import { computeExperience, N_EXPERIENCE } from "./experience";
import { createLocalParams, World, WORLD_HALF } from "./field";
import { N_SYSTEMS } from "./systems";

export interface FieldGrid {
  n: number;
  logLevel: Float32Array;
  logSensitivity: Float32Array;
  logClearance: Float32Array;
  /** equilibrium effective signal (with network coupling) */
  z: Float32Array;
  drive: Float32Array;
  experience: Float32Array;
}

export const cellToWorld = (i: number, n: number) => ((i - n / 2) / (n / 2)) * WORLD_HALF;
export const worldToCell = (w: number, n: number) => (w / WORLD_HALF) * (n / 2) + n / 2;

export async function buildGrid(
  world: World,
  n: number,
  onProgress?: (fraction: number) => void,
): Promise<FieldGrid> {
  const n3 = n * n * n;
  const grid: FieldGrid = {
    n,
    logLevel: new Float32Array(n3 * N_SYSTEMS),
    logSensitivity: new Float32Array(n3 * N_SYSTEMS),
    logClearance: new Float32Array(n3 * N_SYSTEMS),
    z: new Float32Array(n3 * N_SYSTEMS),
    drive: new Float32Array(n3),
    experience: new Float32Array(n3 * N_EXPERIENCE),
  };
  const p = createLocalParams();
  const z = new Float32Array(N_SYSTEMS);
  const scratch = new Float32Array(N_SYSTEMS);
  const exp = new Float32Array(N_EXPERIENCE);

  for (let k = 0; k < n; k++) {
    const wz = cellToWorld(k, n);
    for (let j = 0; j < n; j++) {
      const wy = cellToWorld(j, n);
      for (let i = 0; i < n; i++) {
        const wx = cellToWorld(i, n);
        const idx = i + j * n + k * n * n;
        world.evaluate(wx, wy, wz, p);
        grid.logLevel.set(p.logLevel, idx * N_SYSTEMS);
        grid.logSensitivity.set(p.logSensitivity, idx * N_SYSTEMS);
        grid.logClearance.set(p.logClearance, idx * N_SYSTEMS);
        grid.drive[idx] = p.drive;
        equilibriumSignal(p.logLevel, p.logClearance, p.logSensitivity, z, scratch);
        grid.z.set(z, idx * N_SYSTEMS);
        computeExperience(z, 0, 0, 0.45, exp);
        grid.experience.set(exp, idx * N_EXPERIENCE);
      }
    }
    if (k % 4 === 3) {
      onProgress?.((k + 1) / n);
      // yield to the browser so the loading screen can paint
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(1);
  return grid;
}

/** Trilinear sample of a strided per-cell array at a world position. */
export function sampleGrid(
  grid: FieldGrid,
  data: Float32Array,
  stride: number,
  x: number,
  y: number,
  z: number,
  out: Float32Array,
) {
  const n = grid.n;
  const fx = Math.min(n - 1.001, Math.max(0, worldToCell(x, n)));
  const fy = Math.min(n - 1.001, Math.max(0, worldToCell(y, n)));
  const fz = Math.min(n - 1.001, Math.max(0, worldToCell(z, n)));
  const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
  const tx = fx - i0, ty = fy - j0, tz = fz - k0;
  out.fill(0);
  for (let c = 0; c < 8; c++) {
    const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
    const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
    const base = ((i0 + di) + (j0 + dj) * n + (k0 + dk) * n * n) * stride;
    for (let s = 0; s < stride; s++) out[s] += data[base + s] * w;
  }
  return out;
}
