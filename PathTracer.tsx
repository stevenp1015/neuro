"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useStore } from "./useStore";
import { Line } from "@react-three/drei";

interface PathTracerProps {
  lineWidth?: number;
  color?: string;
}

export function PathTracer({
  lineWidth = 2,
  color = "#00ff00",
}: PathTracerProps) {
  const pathPoints = useStore((state) => state.pathPoints);
  const isDrawingPath = useStore((state) => state.isDrawingPath);

  // Convert path points to line geometry
  const pathGeometry = useMemo(() => {
    if (pathPoints.length < 2) return null;

    const points = pathPoints.map((p) => p.position);
    return { points, pathPoints };
  }, [pathPoints]);

  if (!pathGeometry || pathPoints.length < 2) return null;

  return (
    <group>
      {/* Main path line */}
      <Line
        points={pathGeometry.points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={0.8}
      />

      {/* Path markers at each point */}
      {pathGeometry.pathPoints.map((point, index) => {
        // Color gradient along path (start = green, end = red)
        const t = index / (pathGeometry.pathPoints.length - 1);
        const markerColor = new THREE.Color().lerpColors(
          new THREE.Color("#00ff00"),
          new THREE.Color("#ff0000"),
          t
        );

        return (
          <mesh key={index} position={point.position}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={markerColor}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}

      {/* Current drawing indicator (pulsing sphere at last point) */}
      {isDrawingPath && pathPoints.length > 0 && (
        <PulsingIndicator
          position={pathPoints[pathPoints.length - 1].position}
        />
      )}
    </group>
  );
}

function PulsingIndicator({ position }: { position: THREE.Vector3 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial
        color="#00ff00"
        transparent
        opacity={0.5}
        emissive="#00ff00"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
