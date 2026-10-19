// "Take me somewhere that feels like…"
//
// You describe an experience; we search the landscape for the nearest
// configuration that produces it. This is the reverse of the old approach
// (start from a label, place points around it): start from what it's like
// and see where in chemistry-space that lives. Often several very
// different places feel similar, and the label lens disagrees about them.

import { EXP, ExperienceId, N_EXPERIENCE } from "./experience";
import { cellToWorld, FieldGrid } from "./grid";

export interface PlaceTarget {
  id: string;
  name: string;
  blurb: string;
  target: Partial<Record<ExperienceId, number>>;
}

export const PLACES: PlaceTarget[] = [
  { id: "sunday", name: "Slow Sunday morning", blurb: "Coffee, nowhere to be.", target: { calm: 0.8, mood: 0.65, threat: 0.12, energy: 0.45, connection: 0.65 } },
  { id: "dread", name: "3 a.m. dread", blurb: "Awake for no reason, replaying everything.", target: { threat: 0.9, calm: 0.08, mood: 0.2, thoughtSpeed: 0.7 } },
  { id: "grey", name: "Everything is grey", blurb: "Nothing is wrong. Nothing is anything.", target: { mood: 0.12, pleasure: 0.12, motivation: 0.12, energy: 0.25 } },
  { id: "cantstart", name: "Can't start anything", blurb: "Twelve tabs open, zero tasks started.", target: { motivation: 0.25, focus: 0.2, energy: 0.5, mood: 0.45 } },
  { id: "deadline", name: "Deadline tunnel vision", blurb: "Locked in, slightly scared, weirdly productive.", target: { focus: 0.85, energy: 0.72, threat: 0.5, calm: 0.3 } },
  { id: "limitless", name: "Lit up and limitless", blurb: "Who needs sleep when ideas are this good.", target: { energy: 0.92, mood: 0.88, thoughtSpeed: 0.9, motivation: 0.9, fatigue: 0.1 } },
  { id: "wired", name: "Wired but scattered", blurb: "Buzzing, but the buzz has no direction.", target: { energy: 0.8, focus: 0.15, thoughtSpeed: 0.75, calm: 0.25 } },
  { id: "signs", name: "The world is sending signs", blurb: "Everything means something. Something big.", target: { salience: 0.85, threat: 0.6, focus: 0.3 } },
  { id: "warm", name: "Warm and connected", blurb: "Good people, good food, nothing to prove.", target: { connection: 0.9, mood: 0.75, calm: 0.7, pleasure: 0.7 } },
  { id: "muffled", name: "Muffled", blurb: "Calm, sure. Also kind of not there.", target: { calm: 0.85, energy: 0.2, pleasure: 0.35, thoughtSpeed: 0.2 } },
  { id: "typical", name: "Regular Tuesday", blurb: "The middle of the map. Also a configuration.", target: { mood: 0.5, energy: 0.5, calm: 0.5, threat: 0.27, focus: 0.7, motivation: 0.5, pleasure: 0.5 } },
];

export function findPlace(grid: FieldGrid, target: PlaceTarget["target"], avoid?: [number, number, number]) {
  const n = grid.n;
  const entries = Object.entries(target) as [ExperienceId, number][];
  let best = Infinity;
  let bestIdx = 0;
  const margin = 3; // stay away from the world's edge
  for (let k = margin; k < n - margin; k++) {
    for (let j = margin; j < n - margin; j++) {
      for (let i = margin; i < n - margin; i++) {
        const idx = i + j * n + k * n * n;
        const base = idx * N_EXPERIENCE;
        let d = 0;
        for (const [id, v] of entries) {
          const diff = grid.experience[base + EXP[id]] - v;
          d += diff * diff;
        }
        if (avoid) {
          const dx = cellToWorld(i, n) - avoid[0];
          const dy = cellToWorld(j, n) - avoid[1];
          const dz = cellToWorld(k, n) - avoid[2];
          if (dx * dx + dy * dy + dz * dz < 40 * 40) d += 0.05;
        }
        if (d < best) {
          best = d;
          bestIdx = idx;
        }
      }
    }
  }
  const i = bestIdx % n;
  const j = Math.floor(bestIdx / n) % n;
  const k = Math.floor(bestIdx / (n * n));
  return {
    position: [cellToWorld(i, n), cellToWorld(j, n), cellToWorld(k, n)] as [number, number, number],
    distance: Math.sqrt(best / entries.length),
  };
}
