"use client";
import { Vector3 } from "three";
import { NEURO_CLUSTER_NAMES } from "./NEURO_CLUSTERS";
import { ConnectionSegment, NeuroClusterKey } from "./src/types/NeuroClusterKey";
import { Star } from "./ClusteringResult";
import { NEURO_AXES } from "./NEURO_AXES";
import { NEURO_CLUSTERS } from "./NEURO_CLUSTERS";

// Advanced star generation with network topology
export function generateAdvancedStarData({ numStars = 15000 }: { numStars?: number; } = {}): {
  stars: Star[];
  connections: ConnectionSegment[];
} {
  const stars: Star[] = [];
  const connections: ConnectionSegment[] = [];

  // Generate stars based on prevalence rates
  NEURO_CLUSTER_NAMES.forEach((clusterKey) => {
    if (clusterKey === "Comorbid") return; // Special case handled later

    const cluster = NEURO_CLUSTERS[clusterKey];
    const starCount = Math.floor(numStars * cluster.prevalence);

    for (let i = 0; i < starCount; i++) {
      // Generate 10D vector with multivariate normal distribution
      const vector = NEURO_AXES.map((axis, idx) => {
        const base = cluster.centroid[idx] + (Math.random() - 0.5) * 20;
        const volatility = axis.volatility * cluster.covariance;
        const noise = (Math.random() - 0.5) * volatility * 40;
        return Math.max(0, Math.min(100, base + noise));
      });

      // 3D projection with enhanced clustering
      const center = new Vector3(
        (clusterKey === "ADHD" ? 80 : clusterKey === "Bipolar" ? -80 : 0) +
        (Math.random() - 0.5) * 40,
        (clusterKey === "Schizophrenia"
          ? 80
          : clusterKey === "Anxiety"
            ? -80
            : 0) +
        (Math.random() - 0.5) * 40,
        (clusterKey === "Depression" ? 80 : 0) + (Math.random() - 0.5) * 40
      );

      const projection = new Vector3(
        center.x + (Math.random() - 0.5) * 30,
        center.y + (Math.random() - 0.5) * 30,
        center.z + (Math.random() - 0.5) * 30
      );

      stars.push({
        id: stars.length,
        vector,
        clusterName: clusterKey,
        constellation: cluster,
        projection,
        volatility: NEURO_AXES.reduce(
          (sum, axis, idx) => sum +
            Math.abs(vector[idx] - cluster.centroid[idx]) * axis.volatility,
          0
        ) / NEURO_AXES.length,
        phase: Math.random() * Math.PI * 2,
        centrality: Math.random(), // Network centrality
        anomalyScore: 0,
        community: clusterKey,
      });
    }
  });

  // Generate comorbid stars with mixed characteristics
  const comorbidCount = Math.floor(numStars * 0.05);
  for (let i = 0; i < comorbidCount; i++) {
    const vector = NEURO_AXES.map((axis, idx) => {
      const clusterChoices: NeuroClusterKey[] = [
        "ADHD",
        "Anxiety",
        "Depression",
      ];
      const randomCluster = clusterChoices[Math.floor(Math.random() * clusterChoices.length)];
      const cluster = NEURO_CLUSTERS[randomCluster];
      return Math.max(
        0,
        Math.min(100, cluster.centroid[idx] + (Math.random() - 0.5) * 30)
      );
    });

    stars.push({
      id: stars.length,
      vector,
      clusterName: "Comorbid",
      constellation: NEURO_CLUSTERS.Comorbid,
      projection: new Vector3(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      ),
      volatility: 0.8,
      phase: Math.random() * Math.PI * 2,
      centrality: 0.8,
      anomalyScore: 0,
      community: "Comorbid",
    });
  }

  return { stars, connections };
}
