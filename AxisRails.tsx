"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NEURO_AXES } from "./NEURO_AXES";

interface AxisRailsProps {
  length?: number;
  showLabels?: boolean;
  activeAxes?: Set<number>;
}

export function AxisRails({
  length = 150,
  showLabels = true,
  activeAxes = new Set(NEURO_AXES.map((_, i) => i)),
}: AxisRailsProps) {
  return (
    <group>
      {NEURO_AXES.map((axis, index) => {
        const isActive = activeAxes.has(index);
        return (
          <AxisRail
            key={axis.id}
            axis={axis}
            index={index}
            length={length}
            showLabels={showLabels}
            isActive={isActive}
          />
        );
      })}
    </group>
  );
}

interface AxisRailProps {
  axis: (typeof NEURO_AXES)[number];
  index: number;
  length: number;
  showLabels: boolean;
  isActive: boolean;
}

function AxisRail({ axis, index, length, showLabels, isActive }: AxisRailProps) {
  const railRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Map each neurochemical dimension to its contribution in the 3D projection
  // Based on projectTo3D function: X=(DA0+DA1)/2, Y=(NE+(100-GABA))/2, Z=(5HT+(100-HPA))/2
  const direction = useMemo(() => {
    const projectionMap: Record<number, THREE.Vector3> = {
      0: new THREE.Vector3(1, 0, 0),      // Tonic DA → +X
      1: new THREE.Vector3(1, 0, 0),      // Phasic DA → +X
      2: new THREE.Vector3(0.3, 0.3, 0),  // Salience error (not in projection, show weakly)
      3: new THREE.Vector3(0.2, 0, 0.2),  // DAT reuptake (not in projection, show weakly)
      4: new THREE.Vector3(0, 0, 1),      // Serotonin → +Z
      5: new THREE.Vector3(0, 1, 0),      // NE → +Y
      6: new THREE.Vector3(0, -1, 0),     // GABA → -Y (inverted in projection)
      7: new THREE.Vector3(0.2, 0.3, 0),  // Glutamate (not in projection, show weakly)
      8: new THREE.Vector3(0, 0.3, 0.2),  // Amygdala (not in projection, show weakly)
      9: new THREE.Vector3(0, 0, -1),     // HPA → -Z (inverted in projection)
    };

    return (projectionMap[index] || new THREE.Vector3(1, 0, 0)).normalize();
  }, [index]);

  const startPoint = direction.clone().multiplyScalar(-length);
  const endPoint = direction.clone().multiplyScalar(length);

  // Rail geometry
  const railGeometry = useMemo(() => {
    const points = [startPoint, endPoint];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [startPoint, endPoint]);

  // Particles flowing along rail
  const { particleGeometry, particleCount } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = i / count; // 0 to 1 along rail
      const pos = startPoint.clone().lerp(endPoint, t);

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      phases[i] = t;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

    return { particleGeometry: geom, particleCount: count };
  }, [startPoint, endPoint]);

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(axis.color) },
          isActive: { value: isActive ? 1.0 : 0.3 },
        },
        vertexShader: `
          uniform float time;
          uniform float isActive;
          attribute float phase;

          varying float vAlpha;

          void main() {
            // Flow animation
            float flow = fract(phase + time * 0.5);

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Pulsing particles
            float pulse = sin(flow * 3.14159) * isActive;
            gl_PointSize = (1.0 - pulse * 0.5) * (1000.0 / -mvPosition.z);

            vAlpha = pulse * 2.6;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float vAlpha;

          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.8) discard;

            float alpha = (1.5 - dist * 2.5) * vAlpha;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [axis.color, isActive]
  );

  // Animate particles
  useFrame((state) => {
    if (particleMaterial.uniforms) {
      particleMaterial.uniforms.time.value = state.clock.elapsedTime;
      particleMaterial.uniforms.isActive.value = isActive ? 1.0 : 0.3;
    }
  });

  const railColor = new THREE.Color(axis.color);
  const railOpacity = isActive ? 0.4 : 0.1;

  return (
    <group>
      {/* Rail line */}
      <line ref={railRef} geometry={railGeometry}>
        <lineBasicMaterial
          color={railColor}
          transparent
          opacity={railOpacity}
          linewidth={2}
        />
      </line>

      {/* Flowing particles */}
      <points
        ref={particlesRef}
        geometry={particleGeometry}
        material={particleMaterial}
      />

      {/* Axis labels at endpoints */}
      {showLabels && (
        <>
          <Text
            position={endPoint}
            fontSize={3}
            color={axis.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.15}
            outlineColor="#000000"
          >
            {axis.name}
          </Text>
          <Text
            position={startPoint}
            fontSize={2}
            color={axis.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#000000"
            opacity={0.6}
          >
            Low
          </Text>
          <Text
            position={endPoint.clone().multiplyScalar(0.9)}
            fontSize={2}
            color={axis.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#000000"
            opacity={0.6}
          >
            High
          </Text>
        </>
      )}
    </group>
  );
}
