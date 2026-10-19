"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { engine } from "../engine/engine";
import { innerVoice, N_EXPERIENCE } from "../model/experience";
import { sampleGrid } from "../model/grid";
import { evaluateLens, LENSES } from "../model/lenses";
import { useUI } from "../store";
import { Panel, usePoll } from "./common";

export function Loading() {
  const progress = useUI((s) => s.progress);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--nv-bg)]">
      <div className="w-[320px] text-center">
        <div className="nv-label mb-3">growing the landscape</div>
        <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-300 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="text-[11px] text-[var(--nv-faint)] mt-3">Sampling 46,656 brain configurations…</div>
      </div>
    </div>
  );
}

export function Intro() {
  const setPhase = useUI((s) => s.setPhase);
  const toggleAudio = useUI((s) => s.toggleAudio);
  const audio = useUI((s) => s.audio);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-6">
      <Panel className="max-w-[640px] !p-7 nv-fade-in">
        <div className="nv-label mb-2">NeuroVector Explorer · v4</div>
        <h1 className="text-[28px] leading-tight font-semibold mb-4">
          The space <span className="text-emerald-300">is</span> the state.
        </h1>
        <div className="space-y-3 text-[13.5px] text-[var(--nv-dim)] leading-relaxed">
          <p>
            Every point in this world is a complete brain configuration: nine neurochemical systems, each with its own <b className="text-white">level</b>,{" "}
            <b className="text-white">receptor sensitivity</b>, <b className="text-white">transport</b> (how fast it&apos;s cleared) and{" "}
            <b className="text-white">timing</b>. They all push on each other through a live network.
          </p>
          <p>
            Wherever you fly, you <i>are</i> that brain. Color, light, sound, your speed and your focus all change with it. Leave it running and time does its
            thing too: sleep, rhythms, tolerance, and in some regions, cycles that nobody scripted.
          </p>
          <p>
            Diagnostic labels aren&apos;t places on this map. They&apos;re rules laid on top of it, with cutoffs, symptom counts and durations you can turn
            yourself. Watch what moves and what doesn&apos;t.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-[var(--nv-dim)] mt-5">
          <span><kbd>click</kbd> + mouse · look</span>
          <span><kbd>WASD</kbd> · fly, <kbd>Space</kbd>/<kbd>Shift</kbd> up/down</span>
          <span><kbd>1</kbd>–<kbd>4</kbd> · time scale</span>
          <span><kbd>H</kbd> · hide HUD</span>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button
            className="nv-btn !px-5 !py-2 !text-[13px] !bg-emerald-300/15 !border-emerald-300/50"
            onClick={() => setPhase("explore")}
          >
            Enter
          </button>
          <label className="flex items-center gap-2 text-[12px] text-[var(--nv-dim)] cursor-pointer">
            <input type="checkbox" checked={audio} onChange={toggleAudio} /> with sound
          </label>
          <div className="flex-1" />
          <span className="text-[10.5px] text-[var(--nv-faint)] max-w-[220px] text-right">
            A conceptual model with illustrative numbers. Not a diagnostic tool, not medical advice.
          </span>
        </div>
      </Panel>
    </div>
  );
}

export function TitleVoice() {
  const snap = usePoll(4);
  // Rate limit: the sentence changes at most every ~1.5s, so it doesn't
  // flicker at thresholds but still keeps up at fast time scales.
  const shown = useRef<{ text: string; at: number } | null>(null);
  if (!snap) return null;
  const candidate = innerVoice(snap.experience, snap.asleep, shown.current?.text);
  const now = performance.now();
  if (!shown.current || (candidate !== shown.current.text && now - shown.current.at > 1500)) {
    shown.current = { text: candidate, at: now };
  }
  const voice = shown.current.text;
  return (
    <Panel className="w-[300px]">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[13px] font-semibold tracking-wide">
          NeuroVector <span className="text-emerald-300">v4</span>
        </div>
        <div className="nv-mono text-[10px] text-[var(--nv-faint)]">
          {engine.position.map((v) => v.toFixed(0)).join(" · ")}
        </div>
      </div>
      <div className="nv-label mb-1">Inner voice</div>
      <div key={voice} className="text-[13px] leading-relaxed text-[var(--nv-text)] nv-soft-in min-h-[60px]">
        {voice}
      </div>
    </Panel>
  );
}

interface Toast {
  id: number;
  text: string;
  color: string;
  entered: boolean;
}

/** Announces when you fly across a label boundary (by the current criteria). */
export function BoundaryToasts() {
  const lens = useUI((s) => s.lens);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prev = useRef<Record<string, boolean> | null>(null);
  const dims = useMemo(() => new Float32Array(N_EXPERIENCE), []);
  const counter = useRef(0);

  // when the rules change, re-baseline silently (that's a different lesson)
  useEffect(() => {
    prev.current = null;
  }, [lens]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!engine.grid) return;
      sampleGrid(engine.grid, engine.grid.experience, N_EXPERIENCE, ...engine.position, dims);
      const now: Record<string, boolean> = {};
      for (const l of LENSES) now[l.id] = evaluateLens(l, dims, lens).metNow;
      if (prev.current) {
        for (const l of LENSES) {
          if (now[l.id] !== prev.current[l.id]) {
            const t: Toast = { id: ++counter.current, text: l.name, color: l.color, entered: now[l.id] };
            setToasts((ts) => [...ts.slice(-2), t]);
            setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 5200);
          }
        }
      }
      prev.current = now;
    }, 250);
    return () => clearInterval(id);
  }, [lens, dims]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="nv-panel !py-2 !px-4 text-[12px] nv-fade-in text-center" style={{ borderColor: t.color + "88" }}>
          <span style={{ color: t.color }}>{t.entered ? "Crossed into" : "Crossed out of"}</span> {t.text}{" "}
          <span className="text-[var(--nv-faint)]">territory.</span>
          <div className="text-[10.5px] text-[var(--nv-faint)]">Nothing about the chemistry jumped. You just crossed a line someone drew.</div>
        </div>
      ))}
    </div>
  );
}
