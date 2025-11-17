"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { ATTRACTOR_REGIONS, projectTo3D, calculateSymptoms } from "./NeurochemistryModel";

interface AxisRailsProps {
  length?: number;
  showLabels?: boolean;
  activeAxes?: Set<number>;
}

export function AxisRails({
  length = 150,
  showLabels = true,
  activeAxes,
}: AxisRailsProps) {
  // Calculate attractor positions in 3D space
  const attractorPositions = useMemo(() => {
    return Object.entries(ATTRACTOR_REGIONS).map(([name, attractor]) => {
      const symptoms = calculateSymptoms(attractor.center);
      const position = projectTo3D(attractor.center, symptoms);
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        position,
        color: attractor.color,
      };
    });
  }, []);

  // Create connections between attractors
  // Strategy: Connect each attractor to its 2-3 nearest neighbors for a network effect
  const connections = useMemo(() => {
    const conns: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      distance: number;
      color1: string;
      color2: string;
      name1: string;
      name2: string;
    }> = [];

    for (let i = 0; i < attractorPositions.length; i++) {
      const a1 = attractorPositions[i];

      // Calculate distances to all other attractors
      const distances = attractorPositions
        .map((a2, j) => ({
          index: j,
          distance: a1.position.distanceTo(a2.position),
          attractor: a2,
        }))
        .filter((d) => d.index !== i) // Exclude self
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      // Connect to 2 nearest neighbors
      for (let k = 0; k < Math.min(2, distances.length); k++) {
        const neighbor = distances[k];

        // Avoid duplicate connections (only add if i < j)
        if (i < neighbor.index) {
          conns.push({
            start: a1.position,
            end: neighbor.attractor.position,
            distance: neighbor.distance,
            color1: a1.color,
            color2: neighbor.attractor.color,
            name1: a1.name,
            name2: neighbor.attractor.name,
          });
        }
      }
    }

    return conns;
  }, [attractorPositions]);

  return (
    <group>
      {connections.map((conn, idx) => (
        <AxisRail
          key={idx}
          start={conn.start}
          end={conn.end}
          color1={conn.color1}
          color2={conn.color2}
          name1={conn.name1}
          name2={conn.name2}
          showLabels={showLabels}
        />
      ))}
    </group>
  );
}

interface AxisRailProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color1: string;
  color2: string;
  name1: string;
  name2: string;
  showLabels: boolean;
}

function AxisRail({ start, end, color1, color2, name1, name2, showLabels }: AxisRailProps) {
  const railRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Rail geometry
  const railGeometry = useMemo(() => {
    const points = [start, end];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  // Particles flowing along rail
  const { particleGeometry, particleCount } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = i / count; // 0 to 1 along rail
      const pos = start.clone().lerp(end, t);

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      phases[i] = t;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

    return { particleGeometry: geom, particleCount: count };
  }, [start, end]);

  // Mix colors for gradient effect
  const mixedColor = useMemo(() => {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return new THREE.Color().lerpColors(c1, c2, 0.5);
  }, [color1, color2]);

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
        },
        vertexShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          attribute float phase;

          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            // Flow animation
            float flow = fract(phase + time * 0.3);

            // Color gradient along rail
            vColor = mix(color1, color2, phase);

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Pulsing particles
            float pulse = sin(flow * 3.14159);
            gl_PointSize = (2.0 + pulse * 1.0) * (800.0 / -mvPosition.z);

            vAlpha = pulse * 0.8;
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;

            float alpha = (1.0 - dist * 2.0) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color1, color2]
  );

  // Animate particles
  useFrame((state) => {
    if (particleMaterial.uniforms) {
      particleMaterial.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Midpoint for label
  const midpoint = useMemo(() => {
    return new THREE.Vector3().lerpVectors(start, end, 0.5);
  }, [start, end]);

  return (
    <group>
      {/* Rail line */}
      <line ref={railRef} geometry={railGeometry}>
        <lineBasicMaterial
          color={mixedColor}
          transparent
          opacity={0.3}
          linewidth={2}
        />
      </line>

      {/* Flowing particles */}
      <points
        ref={particlesRef}
        geometry={particleGeometry}
        material={particleMaterial}
      />

      {/* Optional label at midpoint showing connection */}
      {showLabels && (
        <Text
          position={midpoint}
          fontSize={2}
          color={mixedColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
          opacity={0.5}
        >
          {`${name1} ↔ ${name2}`}
        </Text>
      )}
    </group>
  );
}
