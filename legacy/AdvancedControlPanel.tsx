"use client";
import React, { useState, useCallback } from "react";
import { RangeFilter } from "./src/types/NeuroCluster";
import { NEURO_AXES } from "./NEURO_AXES";
import { useStore } from "./useStore";

// Advanced control panel
export function AdvancedControlPanel() {
  const filters = useStore((state) => state.filters);
  const activeAxes = useStore((state) => state.activeAxes);
  const showConnections = useStore((state) => state.showConnections);
  const showConstellations = useStore((state) => state.showConstellations);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const pointSize = useStore((state) => state.pointSize);
  const updateVisualizationOptions = useStore(
    (state) => state.updateVisualizationOptions
  );
  const toggleAxis = useStore((state) => state.toggleAxis);
  const setFilters = useStore((state) => state.setFilters);

  const [searchQuery, setSearchQuery] = useState("");
  const [presets, setPresets] = useState<Record<string, RangeFilter[]>>({});

  const resetFilters = useCallback(() => {
    setFilters(NEURO_AXES.map(() => ({ min: 0, max: 100 })));
  }, [setFilters]);

  const loadPreset = useCallback(
    (presetName: string) => {
      const preset = presets[presetName];
      if (preset) {
        setFilters(preset);
      }
    },
    [presets, setFilters]
  );

  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prevExpanded) => !prevExpanded);
  }, []);

  return (
    <div
      className={`relative bottom-2 left-2 w-96 max-h-[${
        expanded ? "70vh" : "10vh"
      }] overflow-y-auto rounded-lg bg-gray-900 bg-opacity-90 p-4 shadow-xl text-sm text-white backdrop-blur-sm border border-gray-700 transition-all duration-300 ${
        expanded ? "max-h-[70vh] overflow-y-auto" : "max-h-[10vh]"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-lime-400">
          Neural Interface v2.0
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleExpanded}
            className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-500"
          >
            {expanded ? "Hide" : "Expand"}
          </button>
        </div>
      </div>
      {expanded && (
        <>
         
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search axis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Visualization Options */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <div className="font-semibold mb-2">Visualization</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Show Connections</span>
            <input
              type="checkbox"
              checked={showConnections}
              onChange={(e) =>
                updateVisualizationOptions({
                  showConnections: e.target.checked,
                })
              }
              className="form-checkbox"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Show Constellations</span>
            <input
              type="checkbox"
              checked={showConstellations}
              onChange={(e) =>
                updateVisualizationOptions({
                  showConstellations: e.target.checked,
                })
              }
              className="form-checkbox"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Point Size</span>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={pointSize}
              onChange={(e) =>
                updateVisualizationOptions({
                  pointSize: parseFloat(e.target.value),
                })
              }
              className="w-20"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Animation Speed</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={animationSpeed}
              onChange={(e) =>
                updateVisualizationOptions({
                  animationSpeed: parseFloat(e.target.value),
                })
              }
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Axis Filters */}
      <div className="mb-4">
        <div className="font-semibold mb-2">Neural Axes</div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {NEURO_AXES.map((axis, index) => {
            const isActive = activeAxes.has(index);
            const matchesSearch =
              searchQuery === "" ||
              axis.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              axis.id.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return null;

            return (
              <div key={axis.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: axis.color }}
                    />
                    <span
                      className={`cursor-pointer ${
                        !isActive ? "opacity-50" : ""
                      }`}
                      onClick={() => toggleAxis(index)}
                    >
                      [{axis.id}] {axis.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    w:{axis.weight.toFixed(1)}
                  </div>
                </div>

                {isActive && (
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={filters[index].min}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        const newFilters = filters.map((filter, filterIndex) =>
                          filterIndex === index
                            ? { ...filter, min: value }
                            : filter
                        );
                        setFilters(newFilters);
                      }}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-red"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={filters[index].max}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        const newFilters = filters.map((filter, filterIndex) =>
                          filterIndex === index
                            ? { ...filter, max: value }
                            : filter
                        );
                        setFilters(newFilters);
                      }}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{filters[index].min}</span>
                      <span>{filters[index].max}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-3 bg-gray-800 rounded">
        <div className="font-semibold mb-2">Statistics</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-400">Active Axes</div>
            <div className="font-bold">{activeAxes.size}/10</div>
          </div>
          <div>
            <div className="text-gray-400">Visible Stars</div>
            <div className="font-bold">~8.2k</div>
          </div>
        </div>
      </div>

        </>
      )}
    </div>
  );
}
