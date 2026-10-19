"use client";

// Label membranes: the isosurface where a lens's criteria flip from
// "doesn't qualify" to "qualifies", computed from the continuous field.
// They move when you change the severity cutoff or the symptom count.
// The chemistry underneath doesn't move at all.

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { engine } from "../engine/engine";
import { LENSES, lensMargin } from "../model/lenses";
import { N_EXPERIENCE } from "../model/experience";
import { FHN_BAND } from "../model/dynamics";
import { WORLD_HALF } from "../model/field";
import { useUI } from "../store";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vView = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uStripes;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    float fres = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    float rim = pow(fres, 2.2);
    // faint contour lines so you can read the surface's shape
    float lines = smoothstep(0.92, 1.0, sin(vWorld.y * 0.35 + uTime * 0.6) * 0.5 + 0.5) * 0.35;
    // the cycling membrane breathes
    float breathe = uStripes > 0.5 ? 0.6 + 0.4 * sin(uTime * 1.7 + vWorld.x * 0.05) : 1.0;
    float a = (0.06 + rim * 0.55 + lines) * uOpacity * breathe;
    gl_FragColor = vec4(uColor * (0.6 + rim), a);
  }
`;

function makeMaterial(color: string, stripes = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uStripes: { value: stripes ? 1 : 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function LensMembrane({ lensId }: { lensId: string }) {
  const lens = LENSES.find((l) => l.id === lensId)!;
  const severity = useUI((s) => s.lens.severity);
  const required = useUI((s) => s.lens.required[lensId]);
  const worldVersion = useUI((s) => s.worldVersion);

  const mesh = useMemo(() => {
    const grid = engine.grid;
    if (!grid) return null;
    const mc = new MarchingCubes(grid.n, makeMaterial(lens.color), false, false, 120000);
    mc.scale.setScalar(WORLD_HALF);
    mc.isolation = 0;
    mc.frustumCulled = false;
    return mc;
  }, [lens.color, worldVersion]);

  useEffect(() => {
    const grid = engine.grid;
    if (!mesh || !grid) return;
    const n3 = grid.n * grid.n * grid.n;
    for (let c = 0; c < n3; c++) {
      mesh.field[c] = lensMargin(lens, grid.experience, c * N_EXPERIENCE, severity, required);
    }
    mesh.update();
  }, [mesh, severity, required, lens]);

  useEffect(
    () => () => {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
    },
    [mesh],
  );

  useFrame((state) => {
    if (mesh) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
  });

  return mesh ? <primitive object={mesh} /> : null;
}

function CyclingMembrane() {
  const worldVersion = useUI((s) => s.worldVersion);
  const mesh = useMemo(() => {
    const grid = engine.grid;
    if (!grid) return null;
    const mc = new MarchingCubes(grid.n, makeMaterial("#c0eb75", true), false, false, 120000);
    mc.scale.setScalar(WORLD_HALF);
    mc.isolation = 0;
    mc.frustumCulled = false;
    const n3 = grid.n ** 3;
    for (let c = 0; c < n3; c++) {
      const I = grid.drive[c];
      mc.field[c] = Math.min(I - FHN_BAND[0], FHN_BAND[1] - I);
    }
    mc.update();
    return mc;
  }, [worldVersion]);

  useEffect(
    () => () => {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
    },
    [mesh],
  );

  useFrame((state) => {
    if (mesh) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
  });

  return mesh ? <primitive object={mesh} /> : null;
}

export function Membranes() {
  const membranes = useUI((s) => s.membranes);
  const showCycling = useUI((s) => s.showCycling);
  return (
    <group>
      {LENSES.filter((l) => membranes[l.id]).map((l) => (
        <LensMembrane key={l.id} lensId={l.id} />
      ))}
      {showCycling && <CyclingMembrane />}
    </group>
  );
}
