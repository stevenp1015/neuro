"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NeurochemicalState, ATTRACTOR_REGIONS } from "./NeurochemistryModel";

interface SymptomCloudsProps {
  states: NeurochemicalState[];
  particleSize?: number;
  animationSpeed?: number;
}

export function SymptomClouds({
  states,
  particleSize = 3.0,
  animationSpeed = 1.0,
}: SymptomCloudsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  
  // Custom shader material for volumetric cloud effect
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          pointSize: { value: particleSize },
          animationSpeed: { value: animationSpeed },
        },
        vertexShader: `
          uniform float time;
          uniform float pointSize;
          uniform float animationSpeed;

          attribute float density;
          attribute float stability;
          attribute vec3 baseColor;
          attribute float phase;

          varying float vDensity;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vDensity = density;
            vColor = baseColor;

            // Pulsation based on stability (less stable = more pulsating)
            float pulse = 0.85 + 0.15 * sin(time * animationSpeed * (2.0 + (1.0 - stability) * 3.0) + phase * 6.28);

            // Flow/drift effect (particles drift slowly)
            vec3 offset = vec3(
              sin(time * 0.1 + phase) * 0.5,
              cos(time * 0.15 + phase * 1.5) * 0.5,
              sin(time * 0.12 + phase * 2.0) * 0.5
            );

            vec3 pos = position + offset * (1.0 - stability) * 10.0;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Size based on density and distance
            float size = pointSize * density * pulse * (300.0 / -mvPosition.z);
            gl_PointSize = max(1.0, size);

            // Alpha based on density
            vAlpha = density * 0.7;
          }
        `,
        fragmentShader: `
          varying float vDensity;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            // Circular gradient (soft edges)
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);

            if (dist > 0.5) discard;

            // Smooth falloff
            float alpha = (1.0 - dist * 2.0) * vAlpha;

            // Add soft glow
            float glow = 1.0 - dist * 2.0;
            glow = pow(glow, 2.0);

            vec3 finalColor = vColor * (0.7 + glow * 0.3);

            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [particleSize, animationSpeed]
  );

  // Build geometry from neurochemical states
  useEffect(() => {
    if (!geometryRef.current) return;

    const positions = new Float32Array(states.length * 3);
    const colors = new Float32Array(states.length * 3);
    const densities = new Float32Array(states.length);
    const stabilities = new Float32Array(states.length);
    const phases = new Float32Array(states.length);

    states.forEach((state, i) => {
      const idx = i * 3;

      // Position
      positions[idx] = state.position.x;
      positions[idx + 1] = state.position.y;
      positions[idx + 2] = state.position.z;

      // Color based on nearest attractor
      const attractorColor = getAttractorColor(state.vector);
      const color = new THREE.Color(attractorColor);
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;

      // Attributes
      densities[i] = state.density;
      stabilities[i] = state.stability;
      phases[i] = Math.random();
    });

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geometryRef.current.setAttribute(
      "baseColor",
      new THREE.BufferAttribute(colors, 3)
    );
    geometryRef.current.setAttribute(
      "density",
      new THREE.BufferAttribute(densities, 1)
    );
    geometryRef.current.setAttribute(
      "stability",
      new THREE.BufferAttribute(stabilities, 1)
    );
    geometryRef.current.setAttribute(
      "phase",
      new THREE.BufferAttribute(phases, 1)
    );
  }, [states]);

  // Animation
  useFrame((state) => {
    if (material.uniforms) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry ref={geometryRef} />
    </points>
  );
}

/**
 * Determine color based on which attractor is closest
 */
function getAttractorColor(vector: number[]): string {
  let nearest = "balanced";
  let minDist = Infinity;

  Object.entries(ATTRACTOR_REGIONS).forEach(([name, attractor]) => {
    const dist = euclideanDistance(vector, attractor.center);
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  });

  return ATTRACTOR_REGIONS[nearest as keyof typeof ATTRACTOR_REGIONS].color;
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}
