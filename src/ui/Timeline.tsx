"use client";

// Time. The last 60 seconds of real time at the current time scale:
// an hour of moment-to-moment jitter, 2.5 days of circadian rhythm,
// two months of mood-loop cycles, or a year of seasons. Night is shaded.

import { useEffect, useRef, useState } from "react";
import { CH_ASLEEP, CH_M, engine, TIME_SCALES } from "../engine/engine";
import { EXP, EXPERIENCES } from "../model/experience";
import { EVENTS } from "../model/modifiers";
import { N_SYSTEMS, SYSTEMS } from "../model/systems";
import { useUI } from "../store";
import { Chip, clockString, Panel, usePoll } from "./common";

const FEELING_TRACES = ["mood", "energy", "threat", "calm", "focus", "salience"] as const;

export function Timeline() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<"feelings" | "chemistry">("feelings");
  const timeScale = useUI((s) => s.timeScale);
  const setTimeScale = useUI((s) => s.setTimeScale);
  const paused = useUI((s) => s.paused);
  const togglePaused = useUI((s) => s.togglePaused);
  const visible = useUI((s) => s.visibleSystems);
  const snap = usePoll(4);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 66) return;
      last = now;
      const c = canvas.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const scaleIdx = TIME_SCALES.findIndex((s) => s.id === useUI.getState().timeScale);
      const ring = engine.history[scaleIdx];
      const cap = ring.capacity;
      const n = ring.count;
      const xAt = (i: number) => w - ((n - 1 - i) / (cap - 1)) * w;
      const scaleId = TIME_SCALES[scaleIdx].id;
      // at the Weeks scale, a 1-day moving average shows cycles instead of day/night zig-zag
      const smooth = scaleId === "weeks" ? 4 : 1;
      const val = (i: number, ch: number) => {
        if (smooth === 1) return ring.get(i, ch);
        let sum = 0;
        let k = 0;
        for (let j = Math.max(0, i - smooth + 1); j <= i; j++, k++) sum += ring.get(j, ch);
        return sum / k;
      };

      // night shading (only meaningful when a bucket is shorter than a night)
      ctx.fillStyle = "rgba(90, 110, 200, 0.10)";
      for (let i = 0; i < n && (scaleId === "moment" || scaleId === "day"); i++) {
        const asleep = ring.get(i, CH_ASLEEP);
        if (asleep > 0.05) {
          const x = xAt(i);
          ctx.globalAlpha = Math.min(1, asleep * 1.5);
          ctx.fillRect(x - w / cap, 0, w / cap + 1, h);
        }
      }
      ctx.globalAlpha = 1;

      // midline
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const traces =
        view === "feelings"
          ? FEELING_TRACES.map((id) => ({ ch: N_SYSTEMS + EXP[id], color: EXPERIENCES[EXP[id]].color, y: (v: number) => h - 6 - v * (h - 12) }))
          : SYSTEMS.filter((s) => visible[s.index] !== false).map((s) => ({ ch: s.index, color: s.color, y: (v: number) => h / 2 - (Math.max(-1.3, Math.min(1.3, v)) / 1.3) * (h / 2 - 6) }));

      ctx.lineWidth = 1.5;
      for (const t of traces) {
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = xAt(i);
          const y = t.y(val(i, t.ch));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // the mood loop, dashed
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "#c0eb75";
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xAt(i);
        const y = h / 2 - Math.max(-1, Math.min(1, val(i, CH_M))) * (h / 2 - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [view, visible]);

  const scale = TIME_SCALES.find((s) => s.id === timeScale)!;
  const windowLabel = { moment: "last hour", day: "last 2.5 days", weeks: "last 2 months", months: "last 14 months" }[timeScale];

  return (
    <Panel className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="nv-label mr-1">Time</div>
        {TIME_SCALES.map((s, i) => (
          <Chip key={s.id} active={timeScale === s.id} onClick={() => setTimeScale(s.id)} title={`${s.rate} (key ${i + 1})`}>
            {s.label}
          </Chip>
        ))}
        <Chip active={paused} onClick={togglePaused} title="Pause time (P)">
          {paused ? "Paused" : "Pause"}
        </Chip>
        <span className="text-[10.5px] text-[var(--nv-faint)] nv-mono ml-1">{scale.rate}</span>
        <div className="flex-1" />
        {snap && (
          <span className="nv-mono text-[11px] text-[var(--nv-dim)]">
            day {snap.day + 1} · {clockString(snap.hourOfDay)} {snap.asleep ? "· asleep" : ""}
          </span>
        )}
      </div>
      <div className="relative">
        <canvas ref={canvas} className="w-full h-[92px] block rounded-md bg-black/20" />
        <span className="absolute left-2 top-1 text-[9.5px] text-[var(--nv-faint)]">{windowLabel}</span>
        <span className="absolute right-2 top-1 text-[9.5px] text-[var(--nv-faint)]">now</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Chip active={view === "feelings"} onClick={() => setView("feelings")}>Feelings</Chip>
        <Chip active={view === "chemistry"} onClick={() => setView("chemistry")}>Chemistry</Chip>
        <div className="flex flex-wrap gap-x-2 text-[10px] text-[var(--nv-faint)]">
          {view === "feelings"
            ? FEELING_TRACES.map((id) => (
                <span key={id} style={{ color: EXPERIENCES[EXP[id]].color }}>
                  {EXPERIENCES[EXP[id]].label}
                </span>
              ))
            : <span>signal relative to typical (midline)</span>}
          <span style={{ color: "#c0eb75" }}>- - mood loop</span>
        </div>
        <div className="flex-1" />
        <span className="nv-label">Happen</span>
        {EVENTS.map((ev) => (
          <button key={ev.id} className="nv-btn !py-1 !px-2 !text-[11px]" title={ev.description} onClick={() => engine.sim?.triggerEvent(ev.id)}>
            {ev.name}
          </button>
        ))}
      </div>
    </Panel>
  );
}
