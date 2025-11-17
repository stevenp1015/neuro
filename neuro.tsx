"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Vector2 } from "three";
// WebXR support - temporarily disabled, will add back when needed for Quest testing
import { FlyThroughCamera } from "./FlyThroughCamera";
import { SymptomClouds } from "./SymptomClouds";
import { DiagnosisBoundaries } from "./DiagnosisBoundaries";
import { AxisRails } from "./AxisRails";
import { PathTracer } from "./PathTracer";
import { generateNeurochemicalField } from "./NeurochemistryModel";
import { useStore } from "./useStore";
import { NEURO_AXES } from "./NEURO_AXES";

// Main application component
export default function NeuroVectorExplorerV3() {
  const chromaticOffset = useMemo(() => new Vector2(0.001, 0.001), []);

  // Store state
  const moveSpeed = useStore((state) => state.moveSpeed);
  const mouseSensitivity = useStore((state) => state.mouseSensitivity);
  const showAxisRails = useStore((state) => state.showAxisRails);
  const showDiagnosisBoundaries = useStore((state) => state.showDiagnosisBoundaries);
  const pointSize = useStore((state) => state.pointSize);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const activeAxes = useStore((state) => state.activeAxes);
  

  // Neurochemical states
  const [neurochemicalStates, setNeurochemicalStates] = useState<any[]>([]);

  // Initialize data
  useEffect(() => {
    console.log("Generating neurochemical field...");
    const states = generateNeurochemicalField(15000);
    setNeurochemicalStates(states);
    console.log(`Generated ${states.length} neurochemical states`);
  }, []);

  // Regenerate function for button
  const regenerateField = () => {
    console.log("Regenerating field...");
    const states = generateNeurochemicalField(15000);
    setNeurochemicalStates(states);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 50, 150], fov: 75, near: 0.1, far: 2000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "low-power",
        }}
      >
        {/* Scene Setup */}
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 300, 1500]} />

        {/* Lighting */}
        <ambientLight intensity={0.2} color="#202040" />
        <pointLight position={[100, 100, 100]} intensity={0.8} color="#ffffff" />
        <pointLight
          position={[-100, -100, -100]}
          intensity={0.6}
          color="#0080ff"
        />
        <pointLight position={[0, 200, 0]} intensity={0.5} color="#ff0080" />

        {/* 3D Content - New Components */}
        <SymptomClouds
          states={neurochemicalStates}
          particleSize={pointSize}
          animationSpeed={animationSpeed}
        />

        {showDiagnosisBoundaries && (
          <DiagnosisBoundaries showLabels={true} opacity={0.15} />
        )}

        {showAxisRails && (
          <AxisRails
            showLabels={true}
          />
        )}

        <PathTracer lineWidth={2} color="#00ff00" />

        {/* Navigation - Fly-through camera */}
        <FlyThroughCamera
          moveSpeed={moveSpeed}
          mouseSensitivity={mouseSensitivity}
          dampingFactor={0.9}
        />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.5}
            luminanceSmoothing={0.5}
            height={300}
            intensity={1.5}
            radius={0.2}
          />
          <ChromaticAberration
            offset={chromaticOffset}
            radialModulation={true}
            modulationOffset={0.15}
          />
        </EffectComposer>
      </Canvas>

      {/* UI Overlays */}
      <NavigationHUD />
      <RegenerateButton onRegenerate={regenerateField} />
      <ControlsOverlay />

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-black bg-opacity-70 border-t border-cyan-900">
        <div className="flex justify-between items-center text-xs text-gray-300">
          <div>
            <span className="text-cyan-400 font-bold">NeuroVector Explorer v3.0</span>
            <span className="mx-2">|</span>
            <span className="text-lime-400">Fluid Neurochemical Landscape</span>
          </div>
          <div className="flex space-x-6 text-sm">
            <span className="text-purple-400">
              {neurochemicalStates.length.toLocaleString()} States
            </span>
            <span className="text-blue-400">10D Neurochemistry</span>
            <span className="text-green-400">Real-time Dynamics</span>
          </div>
        </div>
      </div>

      {/* Instructions overlay */}
      <InstructionsOverlay />
    </div>
  );
}

// Navigation HUD - Shows camera position and controls
function NavigationHUD() {
  const moveSpeed = useStore((state) => state.moveSpeed);
  const setMoveSpeed = useStore((state) => state.setMoveSpeed);
  const toggleAxisRails = useStore((state) => state.toggleAxisRails);
  const toggleDiagnosisBoundaries = useStore((state) => state.toggleDiagnosisBoundaries);
  const showAxisRails = useStore((state) => state.showAxisRails);
  const showDiagnosisBoundaries = useStore((state) => state.showDiagnosisBoundaries);

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-80 border border-cyan-900 rounded-lg p-4 text-white text-sm space-y-3 w-64">
      <div className="text-cyan-400 font-bold border-b border-cyan-900 pb-2 mb-2">
        NAVIGATION
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Move Speed</span>
          <input
            type="range"
            min="10"
            max="150"
            value={moveSpeed}
            onChange={(e) => setMoveSpeed(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-cyan-400 w-12 text-right">{moveSpeed}</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showAxisRails}
            onChange={toggleAxisRails}
            className="form-checkbox"
          />
          <span>Axis Rails</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showDiagnosisBoundaries}
            onChange={toggleDiagnosisBoundaries}
            className="form-checkbox"
          />
          <span>Diagnosis Boundaries</span>
        </div>
      </div>
    </div>
  );
}

// Regenerate button component
function RegenerateButton({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <button
      onClick={onRegenerate}
      className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded border-2 border-cyan-400"
    >
      Regenerate Field
    </button>
  );
}

// Controls overlay - Shows keyboard/mouse controls
function ControlsOverlay() {
  return null; // Simplified for now
}

// Instructions overlay
function InstructionsOverlay() {
  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-80 border border-purple-900 rounded-lg p-4 text-white text-sm w-72">
      <div className="text-purple-400 font-bold border-b border-purple-900 pb-2 mb-3">
        CONTROLS
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">CLICK</span>
          <span className="text-gray-300">Lock pointer / Start flying</span>
        </div>
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">WASD</span>
          <span className="text-gray-300">Move forward/back/left/right</span>
        </div>
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">SPACE</span>
          <span className="text-gray-300">Move up</span>
        </div>
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">SHIFT</span>
          <span className="text-gray-300">Move down</span>
        </div>
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">MOUSE</span>
          <span className="text-gray-300">Look around</span>
        </div>
        <div className="flex">
          <span className="text-cyan-400 w-24 font-mono">ESC</span>
          <span className="text-gray-300">Unlock pointer</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-purple-900 text-xs text-gray-400">
        Fly through the neurochemical space. Each cloud represents symptoms emerging from brain chemistry. Diagnosis boundaries are translucent and permeable.
      </div>
    </div>
  );
}
