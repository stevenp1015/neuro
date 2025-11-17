"use client";
import { NeuroClusterKey } from "./src/types/NeuroClusterKey";
import { NeuroCluster } from "./src/types/NeuroCluster";

// Enhanced cluster definitions with statistical properties

export const NEURO_CLUSTER_NAMES = [
  "ADHD",
  "Bipolar",
  "Schizophrenia",
  "Anxiety",
  "Depression",
  "Neurotypical",
  "Comorbid",
] as const;

export const NEURO_CLUSTERS: Record<NeuroClusterKey, NeuroCluster> = {
  ADHD: {
    weather: [
      "High Executive Dysfunction",
      "Low Motivation",
      "High Norepinephrine",
    ],
    color: "#ff6b35",
    prevalence: 0.08,
    centroid: [25, 80, 15, 25, 60, 70, 50, 50, 45, 45],
    covariance: 0.15,
    connections: ["Anxiety", "Depression"],
  },
  Bipolar: {
    weather: [
      "High Mood Lability",
      "High Phasic Amplitude",
      "Unstable Serotonin",
    ],
    color: "#f7931e",
    prevalence: 0.02,
    centroid: [60, 90, 25, 50, 50, 65, 55, 55, 55, 55],
    covariance: 0.25,
    connections: ["Schizophrenia", "Depression"],
  },
  Schizophrenia: {
    weather: ["High Salience Error", "Low Tonic Dopamine", "High Glutamate"],
    color: "#9b59b6",
    prevalence: 0.01,
    centroid: [20, 50, 85, 50, 45, 55, 40, 80, 65, 60],
    covariance: 0.2,
    connections: ["Bipolar", "Anxiety"],
  },
  Anxiety: {
    weather: [
      "High Amygdala Reactivity",
      "Low GABA Tone",
      "High Norepinephrine",
    ],
    color: "#27ae60",
    prevalence: 0.15,
    centroid: [50, 65, 30, 50, 55, 75, 25, 55, 85, 70],
    covariance: 0.18,
    connections: ["ADHD", "Depression"],
  },
  Depression: {
    weather: ["Low Tonic Serotonin", "Low Tonic Dopamine", "Low Motivation"],
    color: "#3498db",
    prevalence: 0.12,
    centroid: [25, 40, 20, 60, 20, 35, 60, 40, 55, 70],
    covariance: 0.12,
    connections: ["Bipolar", "Anxiety"],
  },
  Neurotypical: {
    weather: ["Stable", "Optimal Functioning"],
    color: "#ecf0f1",
    prevalence: 0.62,
    centroid: [55, 55, 15, 55, 55, 55, 55, 55, 50, 50],
    covariance: 0.08,
    connections: [],
  },
  Comorbid: {
    weather: ["Multiple Conditions", "Complex Presentation"],
    color: "#00ffff",
    prevalence: 0.0,
    centroid: [35, 65, 50, 40, 35, 60, 40, 65, 70, 65],
    covariance: 0.3,
    connections: ["ADHD", "Anxiety", "Depression"],
  },
};
