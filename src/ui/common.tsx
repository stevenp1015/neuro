"use client";

import { ReactNode, useEffect, useState } from "react";
import { engine } from "../engine/engine";

/** Re-render the calling component `hz` times per second (reads engine directly). */
export function usePoll(hz = 10) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
  return engine.snapshot;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`nv-panel ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="nv-label">{children}</div>
      {right}
    </div>
  );
}

/** Horizontal bar for a 0..1 value with an optional marker at `mark`. */
export function Bar({ value, color, mark, height = 6 }: { value: number; color: string; mark?: number; height?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative w-full rounded-full bg-white/[0.06] overflow-hidden" style={{ height }}>
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v * 100}%`, background: color, boxShadow: `0 0 8px ${color}66` }} />
      {mark !== undefined && <div className="absolute inset-y-0 w-px bg-white/50" style={{ left: `${mark * 100}%` }} />}
    </div>
  );
}

/** Centered bar for a signed log value (0 = typical). */
export function SignedBar({ value, color, range = 1, height = 6 }: { value: number; color: string; range?: number; height?: number }) {
  const v = Math.max(-1, Math.min(1, value / range));
  const left = v < 0 ? 50 + v * 50 : 50;
  const width = Math.abs(v) * 50;
  return (
    <div className="relative w-full rounded-full bg-white/[0.06] overflow-hidden" style={{ height }}>
      <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: "50%" }} />
      <div className="absolute inset-y-0 rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: v < 0 ? 0.55 : 1 }} />
    </div>
  );
}

export function Chip({ active, onClick, children, color, title }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`nv-chip ${active ? "nv-chip-on" : ""}`}
      style={active && color ? { borderColor: color, color, boxShadow: `0 0 12px ${color}33 inset` } : undefined}
    >
      {children}
    </button>
  );
}

/** Format a log ratio as ×N. */
export function ratio(log: number) {
  const r = Math.exp(log);
  return r >= 1 ? `×${r.toFixed(2)}` : `÷${(1 / r).toFixed(2)}`;
}

export function clockString(hour: number) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
