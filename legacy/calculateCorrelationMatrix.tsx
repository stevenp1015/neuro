"use client";
import { Star } from "./ClusteringResult";
import { NEURO_AXES } from "./NEURO_AXES";

// Correlation analysis
export function calculateCorrelationMatrix({ stars }: { stars: Star[]; }): number[][] {
  const matrix = Array.from({ length: NEURO_AXES.length }, () => Array.from({ length: NEURO_AXES.length }, () => 0)
  );

  for (let i = 0; i < NEURO_AXES.length; i++) {
    for (let j = 0; j < NEURO_AXES.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      const valuesI = stars.map((star) => star.vector[i] ?? 0);
      const valuesJ = stars.map((star) => star.vector[j] ?? 0);

      if (valuesI.length === 0 || valuesJ.length === 0) {
        matrix[i][j] = 0;
        continue;
      }

      const meanI = valuesI.reduce((sum, val) => sum + val, 0) / valuesI.length;
      const meanJ = valuesJ.reduce((sum, val) => sum + val, 0) / valuesJ.length;

      let numerator = 0;
      let sumI = 0;
      let sumJ = 0;

      for (let k = 0; k < valuesI.length; k++) {
        const diffI = valuesI[k] - meanI;
        const diffJ = valuesJ[k] - meanJ;
        numerator += diffI * diffJ;
        sumI += diffI * diffI;
        sumJ += diffJ * diffJ;
      }

      matrix[i][j] = sumI && sumJ ? numerator / Math.sqrt(sumI * sumJ) : 0;
    }
  }

  return matrix;
}
