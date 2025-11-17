"use client";
import React, { useState, useMemo } from "react";
import { Star } from "./ClusteringResult";
import { DetailPanel } from "./src/types/ColorMode";
import { NEURO_AXES } from "./NEURO_AXES";
import { NEURO_CLUSTERS } from "./NEURO_CLUSTERS";
import { useStore } from "./useStore";

// Enhanced detail panel with analytics
export function EnhancedDetailPanel() {
  const selectedStars = useStore((state) => state.selectedStars);
  const hoveredStar = useStore((state) => state.hoveredStar);
  const stars = useStore((state) => state.stars);
  const updateVisualizationOptions = useStore(
    (state) => state.updateVisualizationOptions
  );
  const pointSize = useStore((state) => state.pointSize);
  const correlationMatrix = useStore((state) => state.correlationMatrix);
  const [activeTab, setActiveTab] = useState<DetailPanel>("vector");

  const selectedStarData = useMemo(() => {
    if (selectedStars.size === 0) return null;
    const starIds = Array.from(selectedStars);
    return starIds
      .map((id) => stars.find((s) => s.id === id))
      .filter((value): value is Star => Boolean(value));
  }, [selectedStars, stars]);

  const star = selectedStarData?.[0] || hoveredStar;
  if (!star) return null;

  const cluster = NEURO_CLUSTERS[star.clusterName];

  return (
    <div className="absolute bottom-2 right-2 w-80 max-h-[70vh] overflow-y-auto rounded-lg bg-gray-900 bg-opacity-90 p-4 shadow-xl text-sm text-white backdrop-blur-sm border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-amber-400">
          {selectedStars.size > 1
            ? `${selectedStars.size} Stars`
            : "Star Analysis"}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => updateVisualizationOptions({ pointSize: pointSize + 0.5 })}
            className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-500"
          >
            Zoom In
          </button>
          <button
            onClick={() => updateVisualizationOptions({
              pointSize: Math.max(0.5, pointSize - 0.5),
            })}
            className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-500"
          >
            Zoom Out
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 border-b border-gray-700">
        {(["vector", "cluster", "statistics"] as DetailPanel[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs capitalize transition-colors ${activeTab === tab
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-gray-400 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "vector" && (
        <div className="space-y-2">
          <div className="mb-3 p-2 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">Vector Values</span>
              <span className="text-gray-400 text-xs">
                Volatility: {(star.volatility * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          {NEURO_AXES.map((axis, i) => (
            <div
              key={axis.id}
              className="flex items-center justify-between p-2 bg-gray-800 rounded"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: axis.color }} />
                <span className="text-xs">
                  [{axis.id}] {axis.name}
                </span>
              </div>
              <div className="text-right">
                <div className="font-bold" style={{ color: axis.color }}>
                  {star.vector[i].toFixed(1)}
                </div>
                <div className="text-xs text-gray-400">
                  Range: {Math.abs(star.vector[i] - 50).toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "cluster" && (
        <div className="space-y-3">
          <div className="p-3 bg-gray-800 rounded">
            <div className="flex items-center space-x-2 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: cluster?.color || "#888888",
                  boxShadow: `0 0 10px ${cluster?.color || "#888888"}40`,
                }} />
              <span className="font-bold">{star.clusterName}</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <div>
                Prevalence:{" "}
                {cluster?.prevalence
                  ? `${(cluster.prevalence * 100).toFixed(1)}%`
                  : "Unknown"}
              </div>
              <div>Centrality: {(star.centrality * 100).toFixed(1)}%</div>
              <div>Community: {star.community}</div>
            </div>
          </div>

          {cluster?.connections && cluster.connections.length > 0 && (
            <div className="p-3 bg-gray-800 rounded">
              <div className="font-semibold mb-2">Related Conditions</div>
              <div className="flex flex-wrap gap-1">
                {cluster.connections.map((conn) => (
                  <span
                    key={conn}
                    className="px-2 py-1 bg-blue-900 text-blue-200 rounded-full text-xs"
                  >
                    {conn}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-800 rounded">
            <div className="font-semibold mb-2">Weather Patterns</div>
            <div className="space-y-1">
              {cluster?.weather.map((pattern, i) => (
                <div key={i} className="text-xs text-gray-300">
                  • {pattern}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "statistics" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-800 rounded text-center">
              <div className="text-xs text-gray-400">Anomaly Score</div>
              <div className="text-lg font-bold text-red-400">
                {(star.anomalyScore * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-2 bg-gray-800 rounded text-center">
              <div className="text-xs text-gray-400">Phase</div>
              <div className="text-lg font-bold text-purple-400">
                {(((star.phase % (Math.PI * 2)) / (Math.PI * 2)) * 360).toFixed(
                  0
                )}
                °
              </div>
            </div>
          </div>

          {correlationMatrix && (
            <div className="p-3 bg-gray-800 rounded">
              <div className="font-semibold mb-2">Top Correlations</div>
              <div className="space-y-1 text-xs">
                {[...Array(3)].map((_, i) => {
                  const axis1 = NEURO_AXES[i];
                  const axis2 = NEURO_AXES[(i + 1) % NEURO_AXES.length];
                  const correlation = correlationMatrix[i][(i + 1) % NEURO_AXES.length];
                  return (
                    <div key={i} className="flex justify-between">
                      <span>{`${axis1.id} -> ${axis2.id}`}</span>
                      <span
                        className={correlation > 0 ? "text-green-400" : "text-red-400"}
                      >
                        {correlation.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
