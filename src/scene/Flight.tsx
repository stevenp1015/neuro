"use client";

// First-person flight. Your current chemistry changes how you move:
// energy sets speed, fatigue adds inertia, threat adds a tremor and a
// heartbeat pulse, racing thoughts widen your field of view.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "../engine/engine";
import { WORLD_HALF } from "../model/field";
import { useUI } from "../store";

const UP = new THREE.Vector3(0, 1, 0);

export function Flight() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const look = useRef({ yaw: 0, pitch: 0, dragging: false });
  const velocity = useRef(new THREE.Vector3());
  const baseSpeed = useRef(55);
  const fly = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number; duration: number } | null>(null);
  const smooth = useRef({ energy: 0.5, fatigue: 0.4, threat: 0.3, speed: 0.5, beat: 0 });

  const worldVersion = useUI((s) => s.worldVersion);
  const flyRequest = useUI((s) => s.flyRequest);

  // spawn at the world's typical place, looking toward the center
  useEffect(() => {
    camera.position.set(...engine.startPosition);
    const toCenter = new THREE.Vector3().sub(camera.position).normalize();
    look.current.yaw = Math.atan2(-toCenter.x, -toCenter.z);
    look.current.pitch = Math.asin(THREE.MathUtils.clamp(toCenter.y, -1, 1)) * 0.5;
    velocity.current.set(0, 0, 0);
    fly.current = null;
  }, [worldVersion, camera]);

  useEffect(() => {
    if (!flyRequest) return;
    const to = new THREE.Vector3(...flyRequest.position);
    const from = camera.position.clone();
    const dist = from.distanceTo(to);
    fly.current = { from, to, t: 0, duration: THREE.MathUtils.clamp(dist / 120, 1.2, 4) };
  }, [flyRequest, camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const isTyping = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
    };
    const FLIGHT_KEYS = ["Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyQ", "KeyC", "KeyF", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      keys.current[e.code] = true;
      if (FLIGHT_KEYS.includes(e.code)) {
        // a HUD button keeps focus after a click; without this, Space would re-click it mid-flight
        const active = document.activeElement as HTMLElement | null;
        if (active && active.tagName === "BUTTON") active.blur();
        if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onBlur = () => (keys.current = {});
    const sens = 0.0022;
    const onMouseMove = (e: MouseEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !look.current.dragging) return;
      look.current.yaw -= e.movementX * sens;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - e.movementY * sens, -1.5, 1.5);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      look.current.dragging = true;
      if (document.pointerLockElement !== canvas) {
        // pointer lock can be refused (iframes, some browsers); drag-to-look still works
        const req = canvas.requestPointerLock?.() as unknown;
        if (req instanceof Promise) req.catch(() => {});
      }
    };
    const onMouseUp = () => (look.current.dragging = false);
    const onWheel = (e: WheelEvent) => {
      if (e.target !== canvas) return;
      baseSpeed.current = THREE.MathUtils.clamp(baseSpeed.current * (e.deltaY > 0 ? 0.88 : 1.14), 8, 260);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  const tmp = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    wish: new THREE.Vector3(),
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qShake: new THREE.Quaternion(),
    euler: new THREE.Euler(),
  });

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const k = keys.current;
    const s = smooth.current;
    const v = tmp.current;
    const perception = useUI.getState().perception;
    const exp = engine.snapshot?.experience;

    if (exp) {
      const a = 1 - Math.exp(-dt * 2);
      s.energy += (exp[1] - s.energy) * a;
      s.fatigue += (exp[10] - s.fatigue) * a;
      s.threat += (exp[5] - s.threat) * a;
      s.speed += (exp[7] - s.speed) * a;
    }
    const mix = (felt: number, neutral: number) => neutral + (felt - neutral) * perception;
    const energy = mix(s.energy, 0.5);
    const fatigue = mix(s.fatigue, 0.4);
    const threat = mix(s.threat, 0.25);
    const thought = mix(s.speed, 0.5);

    // orientation
    v.qYaw.setFromAxisAngle(UP, look.current.yaw);
    v.qPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), look.current.pitch);
    const orient = v.qYaw.clone().multiply(v.qPitch);

    if (fly.current) {
      const f = fly.current;
      // real elapsed time (not the clamped physics step) so low frame rates don't crawl
      f.t = Math.min(1, f.t + Math.min(dtRaw, 0.25) / f.duration);
      const e = f.t < 0.5 ? 4 * f.t * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 3) / 2;
      camera.position.lerpVectors(f.from, f.to, e);
      const dir = f.to.clone().sub(f.from);
      if (dir.lengthSq() > 1 && f.t < 0.85) {
        dir.normalize();
        const targetYaw = Math.atan2(-dir.x, -dir.z);
        let dy = targetYaw - look.current.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        look.current.yaw += dy * Math.min(1, dt * 3);
        look.current.pitch += (Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) * 0.6 - look.current.pitch) * Math.min(1, dt * 3);
      }
      velocity.current.set(0, 0, 0);
      if (f.t >= 1) fly.current = null;
    } else {
      v.forward.set(0, 0, -1).applyQuaternion(orient);
      v.right.set(1, 0, 0).applyQuaternion(orient);
      v.wish.set(0, 0, 0);
      if (k.KeyW || k.ArrowUp) v.wish.add(v.forward);
      if (k.KeyS || k.ArrowDown) v.wish.sub(v.forward);
      if (k.KeyD || k.ArrowRight) v.wish.add(v.right);
      if (k.KeyA || k.ArrowLeft) v.wish.sub(v.right);
      if (k.Space || k.KeyE) v.wish.add(UP);
      if (k.ShiftLeft || k.ShiftRight || k.KeyQ || k.KeyC) v.wish.sub(UP);
      const boost = k.KeyF ? 2.5 : 1;
      const speed = baseSpeed.current * boost * (0.45 + energy * 1.2);
      if (v.wish.lengthSq() > 0) v.wish.normalize().multiplyScalar(speed);
      // fatigue = heavier, laggier body
      const responsiveness = 5.5 - 3.8 * THREE.MathUtils.clamp(fatigue, 0, 1);
      velocity.current.lerp(v.wish, 1 - Math.exp(-dt * responsiveness));
      camera.position.addScaledVector(velocity.current, dt);

      // soft world boundary
      const limit = WORLD_HALF * 1.1;
      for (const axis of ["x", "y", "z"] as const) {
        const p = camera.position[axis];
        if (Math.abs(p) > limit) camera.position[axis] = Math.sign(p) * (limit + (Math.abs(p) - limit) * 0.9);
      }
    }

    // tremor from threat
    const t = state.clock.elapsedTime;
    const tremor = Math.max(0, threat - 0.4) * 0.012;
    v.euler.set(
      Math.sin(t * 37.1) * tremor + Math.sin(t * 23.3) * tremor * 0.6,
      Math.sin(t * 29.7) * tremor,
      Math.sin(t * 19.9) * tremor * 0.5,
    );
    v.qShake.setFromEuler(v.euler);
    camera.quaternion.copy(orient).multiply(v.qShake);

    // field of view: wider and pulsing with arousal
    const bpm = 55 + 75 * THREE.MathUtils.clamp(energy * 0.5 + threat * 0.7, 0, 1);
    s.beat += dt * (bpm / 60) * Math.PI * 2;
    const pulse = Math.pow(Math.max(0, Math.sin(s.beat)), 12) * Math.max(0, threat - 0.35) * 5;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = 68 + (energy - 0.5) * 14 + (thought - 0.5) * 12 + pulse;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }

    engine.position[0] = camera.position.x;
    engine.position[1] = camera.position.y;
    engine.position[2] = camera.position.z;
    engine.cameraQuat[0] = orient.x;
    engine.cameraQuat[1] = orient.y;
    engine.cameraQuat[2] = orient.z;
    engine.cameraQuat[3] = orient.w;
  }, -2);

  return null;
}
