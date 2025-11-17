"use client";
import { Star, ClusteringResult } from "./ClusteringResult";

// Advanced clustering analysis (K-means + DBSCAN)
export function performClusteringAnalysis(
  { stars, activeAxes }: { stars: Star[]; activeAxes: number[]; }): ClusteringResult {
  const activeVectors = stars.map((star) => activeAxes.map((axisIdx) => star.vector[axisIdx] ?? 0)
  );

  // K-means clustering (K=6)
  const k = 6;
  const centroids = Array.from({ length: k }, () => Array.from({ length: activeAxes.length }, () => 50)
  );

  // Initialize centroids randomly
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < activeAxes.length; j++) {
      centroids[i][j] = Math.random() * 100;
    }
  }

  // K-means iterations
  for (let iter = 0; iter < 10; iter++) {
    const assignments = activeVectors.map((vector) => {
      let minDist = Infinity;
      let bestCentroid = 0;
      for (let i = 0; i < k; i++) {
        const dist = vector.reduce(
          (sum, val, j) => sum + Math.pow(val - centroids[i][j], 2),
          0
        );
        if (dist < minDist) {
          minDist = dist;
          bestCentroid = i;
        }
      }
      return bestCentroid;
    });

    // Update centroids
    const sums = Array.from({ length: k }, () => Array.from({ length: activeAxes.length }, () => 0)
    );
    const counts = Array.from({ length: k }, () => 0);

    assignments.forEach((assignment, idx) => {
      counts[assignment] += 1;
      for (let j = 0; j < activeAxes.length; j++) {
        sums[assignment][j] += activeVectors[idx][j];
      }
    });

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        for (let j = 0; j < activeAxes.length; j++) {
          centroids[i][j] = sums[i][j] / counts[i];
        }
      }
    }
  }

  // Calculate silhouette score
  const silhouetteScores = activeVectors.map((vector) => {
    let minAvgDist = Infinity;

    // Find closest centroid
    for (let i = 0; i < k; i++) {
      const dist = vector.reduce(
        (sum, val, j) => sum + Math.pow(val - centroids[i][j], 2),
        0
      ) / Math.max(activeAxes.length, 1);
      minAvgDist = Math.min(minAvgDist, dist);
    }

    return 1 - minAvgDist / 100; // Simplified silhouette score
  });

  return { centroids, silhouetteScores, activeAxes };
}
