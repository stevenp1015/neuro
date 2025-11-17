"use client";
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { ATTRACTOR_REGIONS, projectTo3D, calculateSymptoms } from "./NeurochemistryModel";

interface DiagnosisBoundariesProps {
  showLabels?: boolean;
  opacity?: number;
}

export function DiagnosisBoundaries({
  showLabels = true,
  opacity = 0.15,
}: DiagnosisBoundariesProps) {
  // Convert attractor centers to 3D positions using the SAME projection as particles
  const boundaryData = useMemo(() => {
    return Object.entries(ATTRACTOR_REGIONS).map(([name, attractor]) => {
      // Use the same projectTo3D function that particles use
      const symptoms = calculateSymptoms(attractor.center);
      const position = projectTo3D(attractor.center, symptoms);

      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        position,
        radius: attractor.radius,
        color: attractor.color,
        strength: attractor.strength,
      };
    });
  }, []);

  return (
    <group>
      {boundaryData.map((boundary) => (
        <group key={boundary.name} position={boundary.position}>
          {/* Semi-transparent sphere boundary */}
          <mesh>
            <sphereGeometry args={[boundary.radius, 32, 32]} />
            <meshBasicMaterial
              color={boundary.color}
              transparent
              opacity={opacity * boundary.strength}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Wireframe overlay for visibility */}
          <mesh>
            <sphereGeometry args={[boundary.radius, 16, 16]} />
            <meshBasicMaterial
              color={boundary.color}
              transparent
              opacity={opacity * 2}
              wireframe
              depthWrite={false}
            />
          </mesh>

          {/* Floating label */}
          {showLabels && (
            <Text
              position={[0, boundary.radius + 5, 0]}
              fontSize={5}
              color={boundary.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.3}
              outlineColor="#000000"
            >
              {boundary.name.toUpperCase()}
            </Text>
          )}

          {/* Subtle inner glow sphere */}
          <mesh>
            <sphereGeometry args={[boundary.radius * 0.95, 32, 32]} />
            <meshBasicMaterial
              color={boundary.color}
              transparent
              opacity={opacity * 0.2}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Overlap indicators (simplified - show connections between overlapping regions) */}
      <OverlapConnections boundaries={boundaryData} />
    </group>
  );
}

/**
 * Draw lines between overlapping boundary regions to show comorbidity zones
 */
function OverlapConnections({
  boundaries,
}: {
  boundaries: Array<{
    name: string;
    position: THREE.Vector3;
    radius: number;
    color: string;
  }>;
}) {
  const connections = useMemo(() => {
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < boundaries.length; i++) {
      for (let j = i + 1; j < boundaries.length; j++) {
        const b1 = boundaries[i];
        const b2 = boundaries[j];

        const distance = b1.position.distanceTo(b2.position);
        const sumRadii = b1.radius + b2.radius;

        // If boundaries overlap
        if (distance < sumRadii) {
          pairs.push([i, j]);
        }
      }
    }

    return pairs;
  }, [boundaries]);

  return (
    <>
      {connections.map(([i, j]) => {
        const b1 = boundaries[i];
        const b2 = boundaries[j];

        const points = [b1.position, b2.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Mix colors for overlap connection
        const color1 = new THREE.Color(b1.color);
        const color2 = new THREE.Color(b2.color);
        const mixedColor = new THREE.Color().lerpColors(color1, color2, 0.5);

        return (
          <line key={`${i}-${j}`} geometry={geometry}>
            <lineBasicMaterial
              color={mixedColor}
              transparent
              opacity={0.3}
              linewidth={2}
            />
          </line>
        );
      })}
    </>
  );
}
