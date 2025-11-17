"use client";
import { Vector3 } from "three";
import { NEURO_AXES } from "./NEURO_AXES";

/**
 * Enhanced neurochemistry model with realistic interactions
 * Based on actual neurotransmitter dynamics and symptom emergence
 */

export interface NeurochemicalState {
  // Raw 10D vector (0-100 per axis)
  vector: number[];

  // Derived symptom profile
  symptoms: {
    anhedonia: number;          // 0-1
    anxiety: number;            // 0-1
    executiveDysfunction: number; // 0-1
    moodLability: number;       // 0-1
    psychosis: number;          // 0-1
    motivation: number;         // 0-1
    sleep: number;              // 0-1
    cognition: number;          // 0-1
  };

  // Stability metrics
  stability: number;            // 0-1 (how stable is this state)
  homeostasis: number;          // 0-1 (how well regulated)

  // Spatial properties
  position: Vector3;
  density: number;              // Local probability density
}

/**
 * Attractor regions in neurochemical space
 * These represent stable states, not discrete diagnoses
 */
export const ATTRACTOR_REGIONS = {
  // Low dopamine + low serotonin → depression-like attractor
  depressive: {
    center: [25, 40, 20, 60, 20, 35, 60, 40, 55, 70],
    radius: 25,
    strength: 0.8,
    color: "#3498db",
  },

  // High NE + low GABA + high amygdala → anxiety-like attractor
  anxious: {
    center: [50, 65, 30, 50, 55, 75, 25, 55, 85, 70],
    radius: 22,
    strength: 0.75,
    color: "#27ae60",
  },

  // Low PFC DA + high NE → ADHD-like attractor
  inattentive: {
    center: [25, 80, 15, 25, 60, 70, 50, 50, 45, 45],
    radius: 20,
    strength: 0.7,
    color: "#ff6b35",
  },

  // High phasic DA + unstable 5-HT → manic attractor
  manic: {
    center: [70, 95, 30, 45, 40, 70, 50, 60, 60, 55],
    radius: 18,
    strength: 0.6,
    color: "#f7931e",
  },

  // High salience error + low PFC DA → psychotic attractor
  psychotic: {
    center: [20, 50, 85, 50, 45, 55, 40, 80, 65, 60],
    radius: 15,
    strength: 0.5,
    color: "#9b59b6",
  },

  // Balanced neurochemistry → neurotypical attractor
  balanced: {
    center: [55, 55, 15, 55, 55, 55, 55, 55, 50, 50],
    radius: 30,
    strength: 1.0,
    color: "#ecf0f1",
  },
};

/**
 * Calculate symptom profile from neurochemical state
 */
export function calculateSymptoms(vector: number[]): NeurochemicalState["symptoms"] {
  const [
    tonicDA_PFC,
    phasicDA_amplitude,
    salienceError,
    DAT_reuptake,
    tonic5HT,
    NE,
    GABA,
    glutamate,
    amygdalaReactivity,
    HPAaxis,
  ] = vector;

  // Symptom emergence from neurochemical patterns
  return {
    // Anhedonia: low mesolimbic DA + low 5-HT
    anhedonia: Math.max(0, Math.min(1,
      (1 - phasicDA_amplitude / 100) * 0.6 + (1 - tonic5HT / 100) * 0.4
    )),

    // Anxiety: high NE + low GABA + high amygdala reactivity
    anxiety: Math.max(0, Math.min(1,
      (NE / 100) * 0.4 + (1 - GABA / 100) * 0.3 + (amygdalaReactivity / 100) * 0.3
    )),

    // Executive dysfunction: low PFC DA + high glutamate
    executiveDysfunction: Math.max(0, Math.min(1,
      (1 - tonicDA_PFC / 100) * 0.6 + (glutamate / 100) * 0.4
    )),

    // Mood lability: high phasic amplitude + unstable serotonin (distance from 50)
    moodLability: Math.max(0, Math.min(1,
      (phasicDA_amplitude / 100) * 0.5 + (Math.abs(tonic5HT - 50) / 50) * 0.5
    )),

    // Psychosis: high salience error + low PFC DA + high glutamate
    psychosis: Math.max(0, Math.min(1,
      (salienceError / 100) * 0.5 + (1 - tonicDA_PFC / 100) * 0.25 + (glutamate / 100) * 0.25
    )),

    // Motivation: mesolimbic DA + PFC DA - HPA axis tone
    motivation: Math.max(0, Math.min(1,
      (phasicDA_amplitude / 100) * 0.4 + (tonicDA_PFC / 100) * 0.3 - (HPAaxis / 100) * 0.3
    )),

    // Sleep quality: inverse of HPA axis + GABA tone
    sleep: Math.max(0, Math.min(1,
      (1 - HPAaxis / 100) * 0.6 + (GABA / 100) * 0.4
    )),

    // Cognition: PFC DA + balanced glutamate (not too high or low)
    cognition: Math.max(0, Math.min(1,
      (tonicDA_PFC / 100) * 0.6 + (1 - Math.abs(glutamate - 55) / 50) * 0.4
    )),
  };
}

/**
 * Apply neurotransmitter interaction constraints
 * (e.g., DA-5HT antagonism, GABA-glutamate balance)
 */
export function applyNeurochemicalConstraints(vector: number[]): number[] {
  const constrained = [...vector];

  // Dopamine-serotonin antagonism (weak inverse relationship) - SOFTENED
  const avgDA = (vector[0] + vector[1]) / 2;
  const serotonin = vector[4];
  const daSerotoninBalance = (avgDA + (100 - serotonin)) / 2;
  constrained[4] = serotonin * 0.85 + (100 - avgDA) * 0.15; // was 0.7/0.3, now softer

  // GABA-glutamate balance (should sum to ~100-120) - SOFTENED
  const gabaGlutSum = vector[6] + vector[7];
  if (gabaGlutSum > 0) {
    const targetSum = 110;
    const ratio = targetSum / gabaGlutSum;
    // Only apply constraint if far from target (softer enforcement)
    const weight = Math.min(1, Math.abs(gabaGlutSum - targetSum) / 50);
    constrained[6] = Math.max(10, Math.min(90, vector[6] * (1 - weight) + vector[6] * ratio * weight));
    constrained[7] = Math.max(10, Math.min(90, vector[7] * (1 - weight) + vector[7] * ratio * weight));
  }

  // NE-DA coupling (often co-released) - SOFTENED
  const avgDA_NE = (vector[0] + vector[5]) / 2;
  constrained[5] = vector[5] * 0.9 + avgDA_NE * 0.1; // was 0.8/0.2, now softer

  // HPA axis regulation (cortisol suppresses DA and 5-HT) - SOFTENED
  if (vector[9] > 60) {
    const suppressionFactor = (vector[9] - 60) / 40; // 0-1
    constrained[0] = vector[0] * (1 - suppressionFactor * 0.15); // was 0.3, now 0.15
    constrained[4] = vector[4] * (1 - suppressionFactor * 0.12); // was 0.25, now 0.12
  }

  return constrained.map(v => Math.max(0, Math.min(100, v)));
}

/**
 * Calculate distance to nearest attractor
 */
export function calculateAttractorInfluence(vector: number[]): {
  nearest: string;
  distance: number;
  pull: number; // 0-1, how strongly pulled toward attractor
} {
  let nearest = "balanced";
  let minDist = Infinity;

  Object.entries(ATTRACTOR_REGIONS).forEach(([name, attractor]) => {
    const dist = euclideanDistance(vector, attractor.center);
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  });

  const nearestAttractor = ATTRACTOR_REGIONS[nearest as keyof typeof ATTRACTOR_REGIONS];
  const pull = Math.max(0, 1 - minDist / nearestAttractor.radius);

  return { nearest, distance: minDist, pull };
}

/**
 * Calculate stability (how far from attractor edges)
 */
export function calculateStability(vector: number[]): number {
  const { distance, pull } = calculateAttractorInfluence(vector);

  // High stability when deep inside attractor
  // Low stability when far from attractors or at edges
  return pull;
}

/**
 * Calculate homeostasis (how well-regulated)
 */
export function calculateHomeostasis(vector: number[]): number {
  // Check balance of key regulatory systems
  const gabaGlutBalance = 1 - Math.abs((vector[6] - vector[7]) / 100);
  const hpaRegulation = 1 - Math.abs((vector[9] - 50) / 50);
  const serotoninRegulation = 1 - Math.abs((vector[4] - 55) / 50);

  return (gabaGlutBalance + hpaRegulation + serotoninRegulation) / 3;
}

/**
 * Generate continuous probability density field
 * Higher density where multiple attractors overlap or where prevalence is high
 */
export function calculateDensity(position: Vector3): number {
  let density = 0;

  Object.entries(ATTRACTOR_REGIONS).forEach(([name, attractor]) => {
    // Convert position to neurochemical vector (rough spatial mapping)
    const dist = Math.sqrt(
      Math.pow(position.x, 2) +
      Math.pow(position.y, 2) +
      Math.pow(position.z, 2)
    );

    // Gaussian density function
    const sigma = attractor.radius;
    const contribution = attractor.strength * Math.exp(-(dist * dist) / (2 * sigma * sigma));
    density += contribution;
  });

  return Math.min(1, density);
}

/**
 * Project 10D vector to 3D space using custom projection
 * (More meaningful than PCA - based on key symptom dimensions)
 */
export function projectTo3D(vector: number[], symptoms: NeurochemicalState["symptoms"]): Vector3 {
  // X-axis: Dopamine dominance (high DA → positive X)
  const xAxis = (vector[0] + vector[1]) / 2 - 50; // -50 to +50

  // Y-axis: Arousal (high NE + low GABA → positive Y)
  const yAxis = (vector[5] + (100 - vector[6])) / 2 - 50;

  // Z-axis: Mood valence (high 5-HT + low HPA → positive Z)
  const zAxis = (vector[4] + (100 - vector[9])) / 2 - 50;

  // Scale to reasonable 3D coordinates - reduced from 20 to 4 for tighter clustering
  return new Vector3(xAxis * 4, yAxis * 4, zAxis * 4);
}

// Utility functions
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

/**
 * Generate neurochemical state with realistic constraints
 */
export function generateNeurochemicalState(
  baseVector?: number[],
  noise: number = 15
): NeurochemicalState {
  // Start with base vector or random
  let vector = baseVector || NEURO_AXES.map(() => Math.random() * 100);

  // Add noise
  vector = vector.map(v => v + (Math.random() - 0.5) * noise * 2);

  // Apply neurochemical constraints
  vector = applyNeurochemicalConstraints(vector);

  // Calculate derived properties
  const symptoms = calculateSymptoms(vector);
  const stability = calculateStability(vector);
  const homeostasis = calculateHomeostasis(vector);
  const position = projectTo3D(vector, symptoms);
  const density = calculateDensity(position);

  return {
    vector,
    symptoms,
    stability,
    homeostasis,
    position,
    density,
  };
}

/**
 * Generate 10D vector that projects to a specific 3D position
 * Inverse of projectTo3D function
 */
function generate10DVectorFor3DPosition(
  position: Vector3,
  baseVector: number[]
): number[] {
  // Solve inverse projection equations (scale = 4):
  // X = ((v[0] + v[1])/2 - 50) * 4 → v[0] + v[1] = 2*(X/4 + 50)
  // Y = ((v[5] + (100-v[6]))/2 - 50) * 4 → v[5] + (100-v[6]) = 2*(Y/4 + 50)
  // Z = ((v[4] + (100-v[9]))/2 - 50) * 4 → v[4] + (100-v[9]) = 2*(Z/4 + 50)

  const targetDA = 2 * (position.x / 4 + 50);
  const targetArousal = 2 * (position.y / 4 + 50);
  const targetMood = 2 * (position.z / 4 + 50);

  const vector = [...baseVector];

  // Split dopamine between tonic and phasic (use base ratio + noise)
  const daRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[0] = Math.max(0, Math.min(100, targetDA * daRatio));
  vector[1] = Math.max(0, Math.min(100, targetDA * (1 - daRatio)));

  // Split arousal between NE and inverse GABA
  const neRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[5] = Math.max(0, Math.min(100, targetArousal * neRatio));
  vector[6] = Math.max(0, Math.min(100, 100 - targetArousal * (1 - neRatio)));

  // Split mood between serotonin and inverse HPA
  const serotoninRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[4] = Math.max(0, Math.min(100, targetMood * serotoninRatio));
  vector[9] = Math.max(0, Math.min(100, 100 - targetMood * (1 - serotoninRatio)));

  // Other dimensions stay near base with small noise
  vector[2] = Math.max(0, Math.min(100, baseVector[2] + (Math.random() - 0.5) * 10));
  vector[3] = Math.max(0, Math.min(100, baseVector[3] + (Math.random() - 0.5) * 10));
  vector[7] = Math.max(0, Math.min(100, baseVector[7] + (Math.random() - 0.5) * 10));
  vector[8] = Math.max(0, Math.min(100, baseVector[8] + (Math.random() - 0.5) * 10));

  return vector;
}

/**
 * Generate a field of neurochemical states
 * NEW APPROACH: Generate in 3D space first, then create 10D vectors
 */
export function generateNeurochemicalField(numPoints: number = 15000): NeurochemicalState[] {
  const states: NeurochemicalState[] = [];

  // Sample from attractor regions based on strength
  const totalStrength = Object.values(ATTRACTOR_REGIONS).reduce(
    (sum, a) => sum + a.strength,
    0
  );

  Object.entries(ATTRACTOR_REGIONS).forEach(([name, attractor]) => {
    const count = Math.floor((attractor.strength / totalStrength) * numPoints);

    // Get the 3D position this attractor projects to
    const attractorSymptoms = calculateSymptoms(attractor.center);
    const attractor3DPosition = projectTo3D(attractor.center, attractorSymptoms);

    for (let i = 0; i < count; i++) {
      // Generate random point in 3D sphere around attractor position
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1/3) * attractor.radius; // Uniform in volume

      const offset = new Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const position3D = new Vector3(
        attractor3DPosition.x + offset.x,
        attractor3DPosition.y + offset.y,
        attractor3DPosition.z + offset.z
      );

      // Create 10D vector that projects to this 3D position
      const vector = generate10DVectorFor3DPosition(position3D, attractor.center);

      // Calculate derived properties
      const symptoms = calculateSymptoms(vector);
      const stability = calculateStability(vector);
      const homeostasis = calculateHomeostasis(vector);
      const density = calculateDensity(position3D);

      states.push({
        vector,
        symptoms,
        stability,
        homeostasis,
        position: position3D,
        density,
      });
    }
  });

  // Add some outliers
  const outlierCount = Math.floor(numPoints * 0.05);
  for (let i = 0; i < outlierCount; i++) {
    const randomPos = new Vector3(
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400
    );
    const vector = generate10DVectorFor3DPosition(randomPos, NEURO_AXES.map(() => 50));
    const symptoms = calculateSymptoms(vector);
    const stability = calculateStability(vector);
    const homeostasis = calculateHomeostasis(vector);
    const density = calculateDensity(randomPos);

    states.push({
      vector,
      symptoms,
      stability,
      homeostasis,
      position: randomPos,
      density,
    });
  }

  // Debug logging
  console.log("=== PARTICLE GENERATION DEBUG ===");
  console.log(`Total particles: ${states.length}`);
  console.log("First 10 particle positions:");
  states.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i}: (${s.position.x.toFixed(1)}, ${s.position.y.toFixed(1)}, ${s.position.z.toFixed(1)})`);
  });
  console.log("Position range:");
  const xValues = states.map(s => s.position.x);
  const yValues = states.map(s => s.position.y);
  const zValues = states.map(s => s.position.z);
  console.log(`  X: ${Math.min(...xValues).toFixed(1)} to ${Math.max(...xValues).toFixed(1)}`);
  console.log(`  Y: ${Math.min(...yValues).toFixed(1)} to ${Math.max(...yValues).toFixed(1)}`);
  console.log(`  Z: ${Math.min(...zValues).toFixed(1)} to ${Math.max(...zValues).toFixed(1)}`);

  return states;
}
