// The edges of the network: how each system pushes on the others.
//
// weight > 0: more signal from `from` raises `to`'s release drive.
// weight < 0: more signal from `from` suppresses `to`.
//
// Magnitudes are illustrative (nobody has measured "the" number for any of
// these, and they differ by brain region). The signs and the mechanisms
// are textbook.

import { N_SYSTEMS, SYS, SystemId } from "./systems";

export interface NetworkEdge {
  from: SystemId;
  to: SystemId;
  weight: number;
  mechanism: string;
}

export const EDGES: NetworkEdge[] = [
  { from: "glutamate", to: "daReward", weight: 0.25, mechanism: "Cortical glutamate drives VTA dopamine neurons" },
  { from: "serotonin", to: "daReward", weight: -0.22, mechanism: "5-HT2C receptors brake VTA dopamine" },
  { from: "gaba", to: "daReward", weight: -0.2, mechanism: "VTA GABA interneurons inhibit dopamine cells" },
  { from: "opioid", to: "gaba", weight: -0.3, mechanism: "μ-opioid receptors silence VTA GABA interneurons (disinhibiting dopamine)" },
  { from: "cortisol", to: "daReward", weight: -0.2, mechanism: "Chronic stress blunts reward signaling" },
  { from: "glutamate", to: "daFocus", weight: 0.15, mechanism: "Prefrontal glutamate recruits mesocortical dopamine" },
  { from: "cortisol", to: "daFocus", weight: -0.12, mechanism: "High stress takes the prefrontal cortex offline" },
  { from: "cortisol", to: "serotonin", weight: -0.25, mechanism: "Stress shunts tryptophan away from serotonin synthesis (kynurenine pathway)" },
  { from: "norepinephrine", to: "cortisol", weight: 0.3, mechanism: "Locus coeruleus activates CRH release (stress loop)" },
  { from: "cortisol", to: "norepinephrine", weight: 0.25, mechanism: "CRH excites the locus coeruleus (the loop closes)" },
  { from: "gaba", to: "norepinephrine", weight: -0.35, mechanism: "GABA inhibits the locus coeruleus" },
  { from: "gaba", to: "glutamate", weight: -0.4, mechanism: "Inhibition restrains excitation (E/I balance)" },
  { from: "glutamate", to: "gaba", weight: 0.3, mechanism: "Excitation recruits inhibitory interneurons (negative feedback)" },
  { from: "serotonin", to: "norepinephrine", weight: -0.15, mechanism: "5-HT inhibits locus coeruleus firing" },
  { from: "norepinephrine", to: "serotonin", weight: 0.12, mechanism: "α1 receptors excite raphe serotonin neurons" },
  { from: "oxytocin", to: "cortisol", weight: -0.25, mechanism: "Oxytocin dampens the HPA stress axis" },
  { from: "oxytocin", to: "norepinephrine", weight: -0.15, mechanism: "Oxytocin quiets amygdala-driven arousal" },
  { from: "opioid", to: "cortisol", weight: -0.15, mechanism: "Endorphins buffer the stress response" },
  { from: "cortisol", to: "glutamate", weight: 0.2, mechanism: "Stress increases glutamate release (PFC, hippocampus)" },
  { from: "daReward", to: "norepinephrine", weight: 0.1, mechanism: "Dopamine is the precursor of norepinephrine; they co-activate" },
  { from: "serotonin", to: "oxytocin", weight: 0.2, mechanism: "5-HT1A receptors trigger oxytocin release" },
  { from: "daReward", to: "opioid", weight: 0.1, mechanism: "Reward pursuit recruits hedonic hotspots" },
];

export interface IndexedEdge {
  from: number;
  to: number;
  weight: number;
}

export const INDEXED_EDGES: IndexedEdge[] = EDGES.map((e) => ({
  from: SYS[e.from],
  to: SYS[e.to],
  weight: e.weight,
}));

/**
 * Network-coupled equilibrium of the effective signal, given set points:
 * each system's level gets multiplied by the drive the others give it.
 */
export function equilibriumSignal(
  logLevel: ArrayLike<number>,
  logClearance: ArrayLike<number>,
  logSensitivity: ArrayLike<number>,
  out: Float32Array,
  scratch: Float32Array,
) {
  for (let i = 0; i < N_SYSTEMS; i++) out[i] = logLevel[i] - logClearance[i] + logSensitivity[i];
  for (let iter = 0; iter < 4; iter++) {
    scratch.fill(1);
    for (const e of INDEXED_EDGES) scratch[e.to] += e.weight * (Math.exp(out[e.from]) - 1);
    for (let i = 0; i < N_SYSTEMS; i++) {
      out[i] = logLevel[i] - logClearance[i] + logSensitivity[i] + Math.log(Math.max(0.08, scratch[i]));
    }
  }
  return out;
}
