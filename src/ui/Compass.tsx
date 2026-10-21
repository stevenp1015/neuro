"use client";

// The neurochemical compass. Arrows around the crosshair point toward
// *more* of each system (or each feeling) from where you're standing.
// Length = how steep the gradient is. A dot means "straight ahead",
// a ring means "behind you".

import { useEffect, useState } from "react";
import * as THREE from "three";
import { engine } from "../engine/engine";
import { createLocalParams } from "../model/field";
import { equilibriumSignal } from "../model/network";
import { sampleGrid } from "../model/grid";
import { EXP, EXPERIENCES, N_EXPERIENCE } from "../model/experience";
import { N_SYSTEMS, SYSTEMS } from "../model/systems";
import { useUI } from "../store";

interface Arrow {
  key: string;
  label: string;
  color: string;
  sx: number;
  sy: number;
  ahead: number; // +1 ahead, -1 behind
  strength: number;
}

const FEELINGS = ["mood", "calm", "threat", "focus", "energy", "connection", "pleasure"] as const;
const H = 6;

export function Compass() {
  const mode = useUI((s) => s.compass);
  const visible = useUI((s) => s.visibleSystems);
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useEffect(() => {
    if (mode === "off") return;
    const p = createLocalParams();
    const z = new Float32Array(N_SYSTEMS);
    const scratch = new Float32Array(N_SYSTEMS);
    const expTmp = new Float32Array(N_EXPERIENCE);
    const plus = Array.from({ length: 3 }, () => new Float32Array(Math.max(N_SYSTEMS, N_EXPERIENCE)));
    const minus = Array.from({ length: 3 }, () => new Float32Array(Math.max(N_SYSTEMS, N_EXPERIENCE)));
    const q = new THREE.Quaternion();
    const g = new THREE.Vector3();

    const sample = (x: number, y: number, zz: number, out: Float32Array) => {
      if (mode === "chemistry") {
        engine.world!.evaluate(x, y, zz, p);
        equilibriumSignal(p.logLevel, p.logClearance, p.logSensitivity, z, scratch);
        out.set(z);
      } else {
        sampleGrid(engine.grid!, engine.grid!.experience, N_EXPERIENCE, x, y, zz, expTmp);
        out.set(expTmp);
      }
    };

    const id = setInterval(() => {
      if (!engine.world || !engine.grid) return;
      const [x, y, zz] = engine.position;
      sample(x + H, y, zz, plus[0]);
      sample(x - H, y, zz, minus[0]);
      sample(x, y + H, zz, plus[1]);
      sample(x, y - H, zz, minus[1]);
      sample(x, y, zz + H, plus[2]);
      sample(x, y, zz - H, minus[2]);
      q.set(...engine.cameraQuat).invert();

      const items =
        mode === "chemistry"
          ? SYSTEMS.filter((s) => visible[s.index] !== false).map((s) => ({ key: s.id, label: s.short, color: s.color, idx: s.index, gain: 60 }))
          : FEELINGS.map((f) => {
              const meta = EXPERIENCES[EXP[f]];
              return { key: f, label: meta.label, color: meta.color, idx: EXP[f], gain: 260 };
            });

      const next: Arrow[] = items.map((it) => {
        g.set(plus[0][it.idx] - minus[0][it.idx], plus[1][it.idx] - minus[1][it.idx], plus[2][it.idx] - minus[2][it.idx]).divideScalar(2 * H);
        const mag = g.length();
        g.applyQuaternion(q); // into camera space: +x right, +y up, -z forward
        const lateral = Math.hypot(g.x, g.y) || 1e-9;
        return {
          key: it.key,
          label: it.label,
          color: it.color,
          sx: g.x / lateral,
          sy: -g.y / lateral,
          ahead: -g.z / (mag || 1e-9),
          strength: Math.min(1, mag * it.gain),
        };
      });
      setArrows(next);
    }, 125);
    return () => clearInterval(id);
  }, [mode, visible]);

  if (mode === "off") return null;
  const R0 = 46;
  const R1 = 120;

  // push labels outward when several arrows point the same way
  const labelPush = new Map<string, number>();
  const byAngle = arrows
    .filter((a) => a.strength >= 0.04 && Math.abs(a.ahead) <= 0.93)
    .map((a) => ({ key: a.key, ang: Math.atan2(a.sy, a.sx), len: R0 + (R1 - R0) * a.strength }))
    .sort((a, b) => a.ang - b.ang);
  const placed: { ang: number; r: number }[] = [];
  for (const a of byAngle) {
    let push = 0;
    for (const p of placed) {
      let d = Math.abs(a.ang - p.ang);
      d = Math.min(d, Math.PI * 2 - d);
      if (d < 0.32 && Math.abs(a.len + push - p.r) < 14) push += 14;
    }
    placed.push({ ang: a.ang, r: a.len + push });
    labelPush.set(a.key, push);
  }

  return (
    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" width={320} height={320} viewBox="-160 -160 320 320">
      <circle r={3} fill="none" stroke="#ffffff" strokeOpacity={0.6} />
      <circle r={R0} fill="none" stroke="#ffffff" strokeOpacity={0.06} />
      {arrows.map((a) => {
        if (a.strength < 0.04) return null;
        const facing = Math.abs(a.ahead);
        if (facing > 0.93) {
          // gradient points almost straight ahead/behind: mark on the inner ring
          const ang = (arrows.indexOf(a) / arrows.length) * Math.PI * 2;
          const x = Math.cos(ang) * (R0 - 10);
          const y = Math.sin(ang) * (R0 - 10);
          return (
            <g key={a.key} opacity={0.35 + a.strength * 0.65}>
              <circle cx={x} cy={y} r={4} fill={a.ahead > 0 ? a.color : "none"} stroke={a.color} strokeWidth={1.4} />
              <text x={x} y={y - 7} textAnchor="middle" fontSize={8.5} fill={a.color} className="nv-mono">
                {a.label}
              </text>
            </g>
          );
        }
        const len = R0 + (R1 - R0) * a.strength;
        const x0 = a.sx * R0;
        const y0 = a.sy * R0;
        const x1 = a.sx * len;
        const y1 = a.sy * len;
        const head = 6;
        const ang = Math.atan2(a.sy, a.sx);
        return (
          <g key={a.key} opacity={0.3 + a.strength * 0.7} strokeDasharray={a.ahead < -0.3 ? "3 3" : undefined}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={a.color} strokeWidth={1.6} strokeLinecap="round" />
            <path
              d={`M ${x1} ${y1} L ${x1 - head * Math.cos(ang - 0.45)} ${y1 - head * Math.sin(ang - 0.45)} M ${x1} ${y1} L ${x1 - head * Math.cos(ang + 0.45)} ${y1 - head * Math.sin(ang + 0.45)}`}
              stroke={a.color}
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
            <text
              x={x1 + a.sx * (12 + (labelPush.get(a.key) ?? 0))}
              y={y1 + a.sy * (12 + (labelPush.get(a.key) ?? 0)) + 3}
              textAnchor="middle"
              fontSize={9}
              fill={a.color}
              className="nv-mono"
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
