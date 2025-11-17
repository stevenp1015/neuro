"use client";
import { Star } from "./ClusteringResult";
import { NEURO_AXES } from "./NEURO_AXES";
import { NEURO_CLUSTERS } from "./NEURO_CLUSTERS";

// Anomaly detection using isolation forest concept
export function detectAnomalies({ stars }: { stars: Star[]; }): number[] {
  return stars.map((star) => {
    let anomalyScore = 0;

    // Calculate distance from cluster centroid
    const cluster = NEURO_CLUSTERS[star.clusterName];
    if (cluster) {
      const distance = NEURO_AXES.reduce((sum, axis, idx) => {
        return sum + Math.pow(star.vector[idx] - cluster.centroid[idx], 2);
      }, 0);
      anomalyScore = Math.sqrt(distance) / Math.sqrt(NEURO_AXES.length);
    }

    return Math.min(1, anomalyScore / 100);
  });
}
