"use client";

// Perception: the world is rendered *through* the current state.
//
//   low mood / anhedonia  → color drains out, everything dims
//   pleasure              → things glow
//   threat                → edges close in (tunnel vision), contrast hardens,
//                           the fog turns red-black
//   aberrant salience     → chromatic fringing, grain, random flares
//   racing thoughts       → fringing + wider view (in Flight)
//   asleep                → near-black
//
// The `perception` slider blends between first-person (1) and a neutral
// observer camera (0), so you can compare "what it is" with "what it's like".

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import {
  BlendFunction,
  BloomEffect,
  BrightnessContrastEffect,
  ChromaticAberrationEffect,
  HueSaturationEffect,
  NoiseEffect,
  VignetteEffect,
} from "postprocessing";
import * as THREE from "three";
import { engine } from "../engine/engine";
import { useUI } from "../store";

export function Perception() {
  // Effects are built here and handed to the composer as plain objects
  // (<primitive>) instead of via the JSX wrappers + refs: older versions of
  // @react-three/postprocessing JSON.stringify their props, and with React 19
  // a ref *is* a prop, so a ref holding an effect blows up as a circular structure.
  const fx = useMemo(() => {
    const noise = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE, premultiply: true });
    noise.blendMode.opacity.value = 0.02;
    return {
      bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, mipmapBlur: true, luminanceThreshold: 0.08, luminanceSmoothing: 0.3, intensity: 1, radius: 0.7 }),
      hue: new HueSaturationEffect({ hue: 0, saturation: 0 }),
      bc: new BrightnessContrastEffect({ brightness: 0, contrast: 0 }),
      ca: new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0005, 0.0005), radialModulation: false, modulationOffset: 0 }),
      noise,
      vignette: new VignetteEffect({ eskil: false, offset: 0.3, darkness: 0.35 }),
    };
  }, []);
  useEffect(() => () => Object.values(fx).forEach((effect) => effect.dispose()), [fx]);
  const { scene } = useThree();
  const bg = useMemo(() => new THREE.Color("#02030a"), []);
  const fog = useMemo(() => new THREE.FogExp2("#02030a", 0.0011), []);
  const s = useRef({ mood: 0.5, pleasure: 0.5, threat: 0.3, salience: 0.1, thought: 0.5, calm: 0.5, sleep: 0, energy: 0.5 });
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const snap = engine.snapshot;
    if (!snap) return;
    const perception = useUI.getState().perception;
    const e = snap.experience;
    const st = s.current;
    const a = 1 - Math.exp(-Math.min(dt, 0.1) * 2.5);
    st.mood += (e[0] - st.mood) * a;
    st.pleasure += (e[3] - st.pleasure) * a;
    st.threat += (e[5] - st.threat) * a;
    st.salience += (e[8] - st.salience) * a;
    st.thought += (e[7] - st.thought) * a;
    st.calm += (e[4] - st.calm) * a;
    st.energy += (e[1] - st.energy) * a;
    st.sleep += ((snap.asleep ? 1 : 0) - st.sleep) * a * 0.6;

    const p = perception;
    const dMood = (st.mood - 0.5) * p;
    const dPleasure = (st.pleasure - 0.5) * p;
    const threat = Math.max(0, st.threat - 0.3) * p;
    const salience = Math.max(0, st.salience - 0.15) * p;
    const racing = Math.max(0, st.thought - 0.6) * p;
    const sleep = st.sleep * p;

    {
      // anhedonia drains color; good mood saturates it
      fx.hue.saturation = THREE.MathUtils.clamp(dMood * 1.1 + dPleasure * 0.9 - sleep * 0.6, -0.92, 0.28);
      fx.hue.hue = -threat * 0.12 + salience * 0.25 * Math.sin(performance.now() / 900);
    }
    {
      fx.bc.brightness = THREE.MathUtils.clamp(dMood * 0.22 - sleep * 0.35, -0.4, 0.12);
      fx.bc.contrast = THREE.MathUtils.clamp(threat * 0.5 - Math.max(0, -dMood) * 0.25, -0.3, 0.35);
    }
    {
      fx.bloom.intensity = THREE.MathUtils.clamp(0.9 + dPleasure * 1.6 + dMood * 0.8 + salience * 1.0 - sleep * 0.7, 0.2, 2.2);
    }
    {
      const off = 0.0003 + salience * 0.0045 + racing * 0.0025 + threat * 0.001;
      fx.ca.offset.set(off, off * 0.6);
    }
    {
      fx.noise.blendMode.opacity.value = THREE.MathUtils.clamp(0.02 + salience * 0.5 + threat * 0.15, 0, 0.45);
    }
    {
      fx.vignette.darkness = THREE.MathUtils.clamp(0.35 + threat * 1.3 + Math.max(0, -dMood) * 0.6 + sleep * 0.7, 0, 1.25);
      fx.vignette.offset = THREE.MathUtils.clamp(0.3 - threat * 0.25, 0.05, 0.5);
    }

    // background + fog: deep blue baseline, warm when good, red-black under threat, grey when flat
    const base = tmpColor.setRGB(0.008, 0.012, 0.04);
    bg.copy(base);
    bg.r += threat * 0.05 + Math.max(0, dMood) * 0.012;
    bg.g += Math.max(0, dMood) * 0.01;
    bg.b += Math.max(0, dPleasure) * 0.012 - threat * 0.02;
    const grey = Math.max(0, -dMood) * 0.6;
    const lum = (bg.r + bg.g + bg.b) / 3;
    bg.r += (lum - bg.r) * grey;
    bg.g += (lum - bg.g) * grey;
    bg.b += (lum - bg.b) * grey;
    bg.multiplyScalar(1 - sleep * 0.8);
    scene.background = bg;
    fog.color.copy(bg);
    // flat mood thickens the fog: the world gets smaller
    fog.density = 0.0009 + Math.max(0, -dMood) * 0.0022 + sleep * 0.002;
    scene.fog = fog;
  });

  return (
    <EffectComposer multisampling={0}>
      <primitive object={fx.bloom} />
      <primitive object={fx.hue} />
      <primitive object={fx.bc} />
      <primitive object={fx.ca} />
      <primitive object={fx.noise} />
      <primitive object={fx.vignette} />
    </EffectComposer>
  );
}
