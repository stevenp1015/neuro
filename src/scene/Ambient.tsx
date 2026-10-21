"use client";

// Small things that make the space legible and the state felt:
//   • Driver      ticks the brain simulation once per frame
//   • Backdrop    distant stars + faint world bounds for orientation
//   • Distractors when focus collapses, bright motes drift across your view
//   • Trail       the path you've flown, colored by how it felt

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "../engine/engine";
import { WORLD_HALF } from "../model/field";
import { mulberry32 } from "../model/random";
import { useUI } from "../store";

export function Driver() {
  useFrame((_, dt) => engine.tick(dt), -1);
  return null;
}

export function Backdrop() {
  const stars = useMemo(() => {
    const rand = mulberry32(99);
    const n = 2500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const r = 1600 + rand() * 400;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const box = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(WORLD_HALF * 2, WORLD_HALF * 2, WORLD_HALF * 2)), []);

  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial size={1.6} sizeAttenuation={false} color="#8899bb" transparent opacity={0.55} fog={false} depthWrite={false} />
      </points>
      <lineSegments geometry={box}>
        <lineBasicMaterial color="#3a4a6b" transparent opacity={0.18} />
      </lineSegments>
    </group>
  );
}

const MOTES = 60;

export function Distractors() {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const rand = mulberry32(5);
    return Array.from({ length: MOTES }, () => ({
      x: rand() * 2 - 1,
      y: rand() * 2 - 1,
      vx: (rand() - 0.5) * 0.6,
      vy: (rand() - 0.5) * 0.6,
      phase: rand() * 10,
      hue: rand(),
    }));
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    return g;
  }, []);
  const level = useRef(0);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const exp = engine.snapshot?.experience;
    const perception = useUI.getState().perception;
    const target = exp ? Math.max(0, 0.5 - exp[6]) * 2.2 * perception : 0;
    level.current += (target - level.current) * Math.min(1, dt * 1.5);
    const visibleCount = Math.floor(level.current * MOTES);
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MOTES; i++) {
      const m = data[i];
      m.x += m.vx * dt * (0.4 + level.current);
      m.y += m.vy * dt * (0.4 + level.current);
      if (m.x > 1.2) m.x = -1.2;
      if (m.x < -1.2) m.x = 1.2;
      if (m.y > 1.2) m.y = -1.2;
      if (m.y < -1.2) m.y = 1.2;
      const on = i < visibleCount ? 1 : 0;
      pos[i * 3] = m.x * 9;
      pos[i * 3 + 1] = m.y * 5.5;
      pos[i * 3 + 2] = -6 - (i % 5);
      const blink = 0.5 + 0.5 * Math.sin(t * 3 + m.phase);
      tmp.setHSL(m.hue, 0.9, 0.6).multiplyScalar(on * blink);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    if (group.current) {
      group.current.position.copy(camera.position);
      group.current.quaternion.copy(camera.quaternion);
    }
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */ `
          uniform float uPixelRatio;
          varying vec3 vColor;
          void main() {
            vColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 9.0 * uPixelRatio;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            gl_FragColor = vec4(vColor, pow(1.0 - d, 1.5));
          }
        `,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame((state) => (material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()));

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />
    </group>
  );
}

const TRAIL = 600;

export function Trail() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const state = useRef({ count: 0, last: new THREE.Vector3(1e9, 0, 0), acc: 0 });
  const worldVersion = useUI((s) => s.worldVersion);
  const versionRef = useRef(worldVersion);
  const c = useMemo(() => new THREE.Color(), []);
  const low = useMemo(() => new THREE.Color("#4c6ef5"), []);
  const high = useMemo(() => new THREE.Color("#ffd43b"), []);

  useFrame((_, dt) => {
    const st = state.current;
    if (versionRef.current !== worldVersion) {
      versionRef.current = worldVersion;
      st.count = 0;
    }
    st.acc += dt;
    if (st.acc < 0.2) return;
    st.acc = 0;
    const [x, y, z] = engine.position;
    if (st.last.distanceToSquared(new THREE.Vector3(x, y, z)) < 4) return;
    st.last.set(x, y, z);
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    if (st.count >= TRAIL) {
      pos.copyWithin(0, 3);
      col.copyWithin(0, 3);
      st.count = TRAIL - 1;
    }
    const i = st.count;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y - 1.5;
    pos[i * 3 + 2] = z;
    const mood = engine.snapshot?.experience[0] ?? 0.5;
    c.copy(low).lerp(high, mood);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    st.count++;
    geometry.setDrawRange(0, st.count);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  const line = useMemo(
    () => new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 })),
    [geometry],
  );
  line.frustumCulled = false;

  return <primitive object={line} />;
}
