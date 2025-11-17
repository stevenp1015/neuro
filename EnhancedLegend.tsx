"use client";
import React from "react";
import { NEURO_CLUSTERS } from "./NEURO_CLUSTERS";
import { useStore } from "./useStore";

// Legend with enhanced information
export function EnhancedLegend() {
  const showLegend = useStore((state) => state.showLegend);
  const updateVisualizationOptions = useStore(
    (state) => state.updateVisualizationOptions
  );

  if (!showLegend) return null;

  return (
    <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-90 rounded-lg p-3 shadow-xl backdrop-blur-sm border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lime-400">Neural Clusters</span>
        <button
          onClick={() => updateVisualizationOptions({ showLegend: false })}
          className="text-gray-400 hover:text-white"
        >
          X
        </button>
      </div>
      <div className="space-y-1 text-xs">
        {Object.entries(NEURO_CLUSTERS).map(([name, cluster]) => (
          <div key={name} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: cluster.color,
                boxShadow: `0 0 6px ${cluster.color}40`,
              }} />
            <span className="text-white">{name}</span>
            <span className="text-gray-400 ml-auto">
              {cluster.prevalence
                ? `${(cluster.prevalence * 100).toFixed(1)}%`
                : "Mixed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
