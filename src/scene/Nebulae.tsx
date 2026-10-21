"use client";

// The visible landscape: particle nebulae sampled from the field.
// Filled glowing dots = this system is abundant here. Hollow rings = it's
// depleted here. Where colors interleave, systems overlap.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "../engine/engine";
import { FieldGrid, sampleGrid } from "../model/grid";
import { EXPERIENCES, N_EXPERIENCE } from "../model/experience";
import { mulberry32 } from "../model/random";
import { N_SYSTEMS, SYSTEMS } from "../model/systems";
import { WORLD_HALF } from "../model/field";
import { LayerId, useUI } from "../store";

const CANDIDATES = 220_000;
const MAX_POINTS = 70_000;

interface Built {
  geometry: THREE.BufferGeometry;
  count: number;
}

function buildLayer(grid: FieldGrid, layer: LayerId, seed: number): Built {
  const rand = mulberry32(seed * 31 + layer.length * 7);
  const positions = new Float32Array(MAX_POINTS * 3);
  const colors = new Float32Array(MAX_POINTS * 3);
  const sizes = new Float32Array(MAX_POINTS);
  const signs = new Float32Array(MAX_POINTS);
  const phases = new Float32Array(MAX_POINTS);
  const groups = new Float32Array(MAX_POINTS);

  const isExp = layer === "experience";
  const stride = isExp ? N_EXPERIENCE : N_SYSTEMS;
  const data =
    layer === "level" ? grid.z
    : layer === "sensitivity" ? grid.logSensitivity
    : layer === "clearance" ? grid.logClearance
    : grid.experience;
  // Normalize each channel by its own spread across the world, so a system
  // with naturally bigger swings doesn't claim every particle.
  const n3 = grid.n * grid.n * grid.n;
  const center = new Float32Array(stride);
  const spread = new Float32Array(stride);
  for (let i = 0; i < stride; i++) {
    let sum = 0;
    let sq = 0;
    for (let c = 0; c < n3; c++) {
      const v = data[c * stride + i];
      sum += v;
      sq += v * v;
    }
    const mean = sum / n3;
    center[i] = isExp ? mean : 0;
    spread[i] = Math.sqrt(Math.max(1e-6, sq / n3 - mean * mean));
  }
  const SATURATE = 2.1; // standard deviations
  const palette = (isExp ? EXPERIENCES.map((e) => e.color) : SYSTEMS.map((s) => s.color)).map(
    (c) => new THREE.Color(c),
  );
  const tmp = new Float32Array(stride);
  const extent = WORLD_HALF * 0.97;

  let count = 0;
  for (let c = 0; c < CANDIDATES && count < MAX_POINTS; c++) {
    const x = (rand() * 2 - 1) * extent;
    const y = (rand() * 2 - 1) * extent;
    const z = (rand() * 2 - 1) * extent;
    sampleGrid(grid, data, stride, x, y, z, tmp);

    // the most deviant channel at this spot claims the particle
    let best = -1;
    let bestDev = 0;
    for (let i = 0; i < stride; i++) {
      if (isExp && EXPERIENCES[i].id === "fatigue") continue;
      const dev = (tmp[i] - center[i]) / spread[i];
      if (Math.abs(dev) > Math.abs(bestDev)) {
        bestDev = dev;
        best = i;
      }
    }
    if (best < 0) continue;
    // only clearly-off-typical spots get a particle; typical space stays open
    const strength = Math.min(1, Math.max(0, (Math.abs(bestDev) - 0.9) / (SATURATE - 0.9)));
    const keep = (Math.pow(strength, 1.3) * 0.85 + 0.004) * (bestDev >= 0 ? 1 : 0.6);
    if (rand() > keep) continue;

    positions[count * 3] = x;
    positions[count * 3 + 1] = y;
    positions[count * 3 + 2] = z;
    const col = palette[best];
    colors[count * 3] = col.r;
    colors[count * 3 + 1] = col.g;
    colors[count * 3 + 2] = col.b;
    sizes[count] = 0.35 + strength * 1.1;
    signs[count] = bestDev >= 0 ? 1 : 0;
    phases[count] = rand();
    groups[count] = best;
    count++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, count * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors.subarray(0, count * 3), 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes.subarray(0, count), 1));
  geometry.setAttribute("aSign", new THREE.BufferAttribute(signs.subarray(0, count), 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases.subarray(0, count), 1));
  geometry.setAttribute("aGroup", new THREE.BufferAttribute(groups.subarray(0, count), 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), WORLD_HALF * 1.8);
  return { geometry, count };
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMask[12];
  uniform float uEnergy;
  uniform float uSalience;
  uniform float uThreat;
  attribute float aSize;
  attribute float aSign;
  attribute float aPhase;
  attribute float aGroup;
  varying vec3 vColor;
  varying float vSign;
  varying float vAlpha;
  varying float vFlare;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float visible = uMask[int(aGroup + 0.5)];
    vColor = color;
    vSign = aSign;

    // slow drift; faster and jumpier when energy / threat are high
    float speed = 0.15 + uEnergy * 0.9;
    vec3 p = position;
    float t = uTime * speed + aPhase * 6.2831;
    p += vec3(sin(t * 0.7 + aPhase * 11.0), cos(t * 0.53 + aPhase * 7.0), sin(t * 0.61 + aPhase * 5.0)) * (2.0 + uThreat * 3.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // aberrant salience: random particles suddenly flare with "meaning"
    float slot = floor(uTime * 1.3 + aPhase * 50.0);
    float flare = step(1.0 - uSalience * 0.035, hash(slot * 13.17 + aPhase * 977.0));
    vFlare = flare;

    float twinkle = 0.75 + 0.25 * sin(uTime * (1.0 + aPhase * 2.0) + aPhase * 40.0);
    float size = aSize * twinkle * (1.0 + flare * 2.0);
    float depth = -mv.z;
    gl_PointSize = min(visible * size * uPixelRatio * (420.0 / max(1.0, depth)), 48.0 * uPixelRatio);
    // fade out with distance, and right in front of your face
    vAlpha = visible * clamp(1.0 - depth / 1400.0, 0.0, 1.0) * smoothstep(4.0, 22.0, depth);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vSign;
  varying float vAlpha;
  varying float vFlare;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float alpha;
    if (vSign > 0.5) {
      // abundant: soft filled glow
      alpha = pow(1.0 - d, 1.8);
    } else {
      // depleted: a hollow ring
      alpha = smoothstep(0.6, 0.78, d) * (1.0 - smoothstep(0.86, 1.0, d)) * 0.6;
    }
    vec3 col = mix(vColor, vec3(1.0), vFlare * 0.6);
    gl_FragColor = vec4(col * (0.8 + vFlare), alpha * vAlpha * (0.85 + vFlare));
  }
`;

export function Nebulae() {
  const layer = useUI((s) => s.layer);
  const worldVersion = useUI((s) => s.worldVersion);
  const visible = useUI((s) => s.visibleSystems);
  const pointsRef = useRef<THREE.Points>(null);

  const built = useMemo(() => {
    if (!engine.grid) return null;
    return buildLayer(engine.grid, layer, engine.seed);
    // worldVersion: rebuild when a new world finishes loading
  }, [layer, worldVersion]);

  useEffect(() => () => built?.geometry.dispose(), [built]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uMask: { value: new Array(12).fill(1) },
          uEnergy: { value: 0.5 },
          uSalience: { value: 0 },
          uThreat: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // the visibility mask only applies to chemistry layers
  useEffect(() => {
    const mask = material.uniforms.uMask.value as number[];
    for (let i = 0; i < 12; i++) mask[i] = layer === "experience" ? 1 : visible[i] === false ? 0 : 1;
  }, [visible, layer, material]);

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    const exp = engine.snapshot?.experience;
    const perception = useUI.getState().perception;
    if (exp) {
      const k = 0.05;
      u.uEnergy.value += ((0.3 + (exp[1] - 0.5) * perception) - u.uEnergy.value) * k;
      u.uSalience.value += (Math.max(0, exp[8] - 0.2) * 1.6 * perception - u.uSalience.value) * k;
      u.uThreat.value += (Math.max(0, exp[5] - 0.35) * perception - u.uThreat.value) * k;
    }
  });

  if (!built) return null;
  return <points ref={pointsRef} geometry={built.geometry} material={material} frustumCulled={false} />;
}
