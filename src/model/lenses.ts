// The label lens.
//
// Categorical labels computed on top of the continuous state, using the
// *structure* of DSM-style criteria: a severity cutoff decides what counts
// as a symptom, you need N of M symptoms including a core one, and it has
// to persist for some duration.
//
// Every one of those numbers is a choice. The UI lets you turn the knobs and
// watch the same brain gain or lose a label. These are cartoons of the
// criteria's shape, not the actual DSM text, and not a diagnostic tool.

import { EXP, ExperienceId } from "./experience";
import { sigmoid } from "./random";

interface SymptomDef {
  label: string;
  dim: ExperienceId;
  dir: "high" | "low";
  cutoff: number;
  core?: boolean;
}

export interface LensDef {
  id: string;
  name: string;
  color: string;
  symptoms: SymptomDef[];
  /** default required count (including the core symptom) */
  required: number;
  durationDays: number;
  durationNote: string;
  caveat: string;
}

export const LENSES: LensDef[] = [
  {
    id: "depressive",
    name: "Depressive episode",
    color: "#4dabf7",
    required: 5,
    durationDays: 14,
    durationNote: "≥ 2 weeks, most of the day, nearly every day",
    caveat:
      "Real criteria: 5 of 9 symptoms, with depressed mood or loss of interest required. Two people can share exactly one symptom and get the same label.",
    symptoms: [
      { label: "Low mood", dim: "mood", dir: "low", cutoff: 0.3, core: true },
      { label: "Loss of pleasure", dim: "pleasure", dir: "low", cutoff: 0.3, core: true },
      { label: "Low energy", dim: "energy", dir: "low", cutoff: 0.32 },
      { label: "Fatigue", dim: "fatigue", dir: "high", cutoff: 0.68 },
      { label: "Poor concentration", dim: "focus", dir: "low", cutoff: 0.4 },
      { label: "Loss of drive", dim: "motivation", dir: "low", cutoff: 0.3 },
      { label: "Slowed thinking", dim: "thoughtSpeed", dir: "low", cutoff: 0.32 },
      { label: "Withdrawal", dim: "connection", dir: "low", cutoff: 0.32 },
    ],
  },
  {
    id: "hypomanic",
    name: "Hypomanic episode",
    color: "#ff922b",
    required: 4,
    durationDays: 4,
    durationNote: "≥ 4 consecutive days (≥ 7 days + severe = manic)",
    caveat:
      "Real criteria: elevated or irritable mood + increased energy, plus 3 more (4 if only irritable). A 3-day episode doesn't count. A 4-day one does. Same brain.",
    symptoms: [
      { label: "Elevated energy", dim: "energy", dir: "high", cutoff: 0.72, core: true },
      { label: "Elevated mood", dim: "mood", dir: "high", cutoff: 0.72, core: true },
      { label: "Irritability", dim: "calm", dir: "low", cutoff: 0.28 },
      { label: "Racing thoughts", dim: "thoughtSpeed", dir: "high", cutoff: 0.72 },
      { label: "Less need for sleep", dim: "fatigue", dir: "low", cutoff: 0.22 },
      { label: "Goal-driven overdrive", dim: "motivation", dir: "high", cutoff: 0.72 },
      { label: "Distractibility", dim: "focus", dir: "low", cutoff: 0.4 },
      { label: "Pleasure-seeking", dim: "pleasure", dir: "high", cutoff: 0.72 },
    ],
  },
  {
    id: "anxiety",
    name: "Generalized anxiety",
    color: "#ff6b6b",
    required: 4,
    durationDays: 180,
    durationNote: "≥ 6 months, more days than not",
    caveat:
      "Real criteria: excessive worry + 3 of 6 symptoms for 6 months. Five months and 29 days of identical chemistry is officially something else.",
    symptoms: [
      { label: "Persistent threat / worry", dim: "threat", dir: "high", cutoff: 0.6, core: true },
      { label: "Restlessness", dim: "calm", dir: "low", cutoff: 0.32 },
      { label: "Fatigue", dim: "fatigue", dir: "high", cutoff: 0.65 },
      { label: "Poor concentration", dim: "focus", dir: "low", cutoff: 0.42 },
      { label: "Tension / arousal", dim: "energy", dir: "high", cutoff: 0.62 },
      { label: "Mind won't shut off", dim: "thoughtSpeed", dir: "high", cutoff: 0.62 },
    ],
  },
  {
    id: "adhd",
    name: "ADHD (inattentive) pattern",
    color: "#74c0fc",
    required: 3,
    durationDays: 180,
    durationNote: "≥ 6 months, onset in childhood, in 2+ settings",
    caveat:
      "Real criteria: 6 of 9 inattention symptoms (5 for adults), present before age 12, in multiple settings. A static brain state can't check most of that, which is the point.",
    symptoms: [
      { label: "Attention won't stay put", dim: "focus", dir: "low", cutoff: 0.36, core: true },
      { label: "Restless energy", dim: "energy", dir: "high", cutoff: 0.55 },
      { label: "Hard to start boring things", dim: "motivation", dir: "low", cutoff: 0.4 },
      { label: "Mind-wandering", dim: "thoughtSpeed", dir: "high", cutoff: 0.6 },
      { label: "Restlessness", dim: "calm", dir: "low", cutoff: 0.38 },
    ],
  },
  {
    id: "psychotic",
    name: "Psychotic features",
    color: "#e599f7",
    required: 2,
    durationDays: 30,
    durationNote: "≥ 1 month (≥ 6 months total for schizophrenia)",
    caveat:
      "Real criteria for schizophrenia: 2 of 5 symptom groups for a month, 6 months total. The dopamine story here (limbic high, cortical low) is a hypothesis with good evidence, not the whole picture.",
    symptoms: [
      { label: "Aberrant salience", dim: "salience", dir: "high", cutoff: 0.5, core: true },
      { label: "Suspicion / threat", dim: "threat", dir: "high", cutoff: 0.6 },
      { label: "Disorganized focus", dim: "focus", dir: "low", cutoff: 0.35 },
      { label: "Social withdrawal", dim: "connection", dir: "low", cutoff: 0.3 },
      { label: "Flattened drive", dim: "motivation", dir: "low", cutoff: 0.3 },
    ],
  },
];

export interface LensSettings {
  /** -1 (loose: mild things count) … +1 (strict: only extreme things count) */
  severity: number;
  /** per-lens required symptom count */
  required: Record<string, number>;
}

export function defaultLensSettings(): LensSettings {
  return {
    severity: 0,
    required: Object.fromEntries(LENSES.map((l) => [l.id, l.required])),
  };
}

const STEEP = 0.035;

function cutoffFor(s: SymptomDef, severity: number) {
  return s.dir === "high" ? s.cutoff + severity * 0.08 : s.cutoff - severity * 0.08;
}

export interface SymptomEval {
  label: string;
  present: boolean;
  value: number;
  cutoff: number;
  dir: "high" | "low";
}

export interface LensEval {
  lens: LensDef;
  required: number;
  symptoms: SymptomEval[];
  count: number;
  corePresent: boolean;
  /** criteria met right now (ignoring duration) */
  metNow: boolean;
  /** continuous margin: > 0 inside the label, < 0 outside */
  margin: number;
}

export function evaluateLens(lens: LensDef, dims: ArrayLike<number>, settings: LensSettings): LensEval {
  const required = settings.required[lens.id] ?? lens.required;
  let count = 0;
  let core = false;
  const symptoms: SymptomEval[] = lens.symptoms.map((s) => {
    const value = dims[EXP[s.dim]];
    const cutoff = cutoffFor(s, settings.severity);
    const present = s.dir === "high" ? value >= cutoff : value <= cutoff;
    if (present) {
      count++;
      if (s.core) core = true;
    }
    return { label: s.label, present, value, cutoff, dir: s.dir };
  });
  return {
    lens,
    required,
    symptoms,
    count,
    corePresent: core,
    metNow: core && count >= required,
    margin: lensMargin(lens, dims, 0, settings.severity, required),
  };
}

/**
 * Smooth version of "core present AND count ≥ required", for drawing
 * isosurfaces in 3D. `offset` lets callers read from a strided array.
 */
export function lensMargin(
  lens: LensDef,
  dims: ArrayLike<number>,
  offset: number,
  severity: number,
  required: number,
): number {
  let soft = 0;
  let coreSoft = 0;
  for (const s of lens.symptoms) {
    const value = dims[offset + EXP[s.dim]];
    const c = cutoffFor(s, severity);
    const ind = sigmoid((s.dir === "high" ? value - c : c - value) / STEEP);
    soft += ind;
    if (s.core && ind > coreSoft) coreSoft = ind;
  }
  return Math.min(coreSoft - 0.5, (soft - (required - 0.5)) / 2);
}

/**
 * Duration check on daily summaries: the criterion must be met on at least
 * `fraction` of the most recent `durationDays` days.
 */
export function durationStatus(
  metByDay: boolean[],
  durationDays: number,
  fraction = 0.8,
): { observedDays: number; metDays: number; satisfied: boolean; enoughData: boolean } {
  const window = metByDay.slice(-durationDays);
  const metDays = window.filter(Boolean).length;
  const enoughData = metByDay.length >= durationDays;
  return {
    observedDays: metByDay.length,
    metDays,
    enoughData,
    satisfied: enoughData && metDays >= Math.ceil(durationDays * fraction),
  };
}
