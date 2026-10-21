"use client";

// The live network graph. Node size = current level, ring thickness =
// receptor sensitivity, edge glow + flow speed = how hard one system is
// pushing another *right now*. Hover a node for its four factors; click to
// solo it in the world.

import { useState } from "react";
import { EDGES } from "../model/network";
import { SYS, SYSTEMS, SystemId } from "../model/systems";
import { useUI } from "../store";
import { Panel, ratio, SectionTitle, usePoll } from "./common";

const POS: Record<SystemId, [number, number]> = {
  daFocus: [150, 28],
  glutamate: [62, 72],
  gaba: [238, 72],
  daReward: [38, 150],
  norepinephrine: [150, 122],
  serotonin: [262, 150],
  opioid: [70, 226],
  cortisol: [150, 200],
  oxytocin: [230, 226],
};

export function NetworkGraph() {
  const snap = usePoll(8);
  const [hover, setHover] = useState<SystemId | null>(null);
  const soloSystem = useUI((s) => s.soloSystem);
  const visible = useUI((s) => s.visibleSystems);
  if (!snap) return null;

  const hoverSys = hover ? SYSTEMS[SYS[hover]] : null;
  const hi = hover ? SYS[hover] : -1;

  return (
    <Panel className="w-[300px]">
      <SectionTitle right={<span className="text-[10px] text-[var(--nv-faint)]">hover / click a node</span>}>The network, live</SectionTitle>
      <svg viewBox="0 0 300 268" className="w-full h-auto select-none">
        <defs>
          <marker id="nv-arrow-pos" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffa94d" />
          </marker>
          <marker id="nv-arrow-neg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <rect x="6" y="0" width="3" height="10" fill="#74c0fc" />
          </marker>
        </defs>
        {EDGES.map((e, idx) => {
          const a = POS[e.from];
          const b = POS[e.to];
          const fromI = SYS[e.from];
          const toI = SYS[e.to];
          const influence = e.weight * (Math.exp(snap.z[fromI]) - 1);
          const mag = Math.min(1, Math.abs(influence) * 2.5);
          const involved = hi < 0 || hi === fromI || hi === toI;
          // bend each edge a little so A→B and B→A don't overlap
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len = Math.hypot(dx, dy) || 1;
          const bend = 14;
          const cx = mx - (dy / len) * bend;
          const cy = my + (dx / len) * bend;
          // shorten so the arrow sits outside the target node
          const tx = b[0] - ((b[0] - cx) / Math.hypot(b[0] - cx, b[1] - cy)) * 16;
          const ty = b[1] - ((b[1] - cy) / Math.hypot(b[0] - cx, b[1] - cy)) * 16;
          const positive = e.weight > 0;
          const color = positive ? "#ffa94d" : "#74c0fc";
          const flowing = influence * Math.sign(e.weight) >= 0;
          return (
            <path
              key={idx}
              d={`M ${a[0]} ${a[1]} Q ${cx} ${cy} ${tx} ${ty}`}
              fill="none"
              stroke={color}
              strokeWidth={0.8 + Math.abs(e.weight) * 3}
              strokeOpacity={involved ? 0.12 + mag * 0.75 : 0.04}
              strokeDasharray="3 5"
              markerEnd={`url(#${positive ? "nv-arrow-pos" : "nv-arrow-neg"})`}
              style={{
                animation: `nv-dash ${Math.max(0.35, 2.4 - mag * 2)}s linear infinite`,
                animationDirection: flowing ? "normal" : "reverse",
              }}
            >
              <title>{`${SYSTEMS[fromI].short} → ${SYSTEMS[toI].short} (${positive ? "+" : "−"}): ${e.mechanism}`}</title>
            </path>
          );
        })}
        {SYSTEMS.map((s) => {
          const [x, y] = POS[s.id];
          const z = snap.z[s.index];
          const r = Math.max(6, Math.min(21, 12 * Math.exp(0.5 * snap.level[s.index])));
          const sensW = Math.max(0.6, Math.min(5, 1.8 * Math.exp(snap.sensitivity[s.index] * 1.2)));
          const dim = hi >= 0 && hi !== s.index && !EDGES.some((e) => (SYS[e.from] === hi && e.to === s.id) || (SYS[e.to] === hi && e.from === s.id));
          const off = visible[s.index] === false;
          return (
            <g
              key={s.id}
              transform={`translate(${x} ${y})`}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => soloSystem(s.index)}
              style={{ cursor: "pointer", opacity: dim ? 0.25 : off ? 0.4 : 1, transition: "opacity 0.2s" }}
            >
              <circle r={r + 7} fill={s.color} opacity={Math.max(0, z) * 0.25} />
              <circle r={r} fill={s.color} fillOpacity={0.28 + Math.max(-0.2, Math.min(0.6, z * 0.5))} stroke={s.color} strokeWidth={1} />
              <circle r={r + 3.5} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={sensW} strokeDasharray={snap.clearance[s.index] < -0.2 ? "2 2" : undefined} />
              <text y={r + 15} textAnchor="middle" fontSize="9.5" fill="#c9d1e8" className="nv-mono">
                {s.short}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-[var(--nv-faint)] mt-1">
        <span>
          <span className="inline-block w-3 h-[2px] align-middle mr-1" style={{ background: "#ffa94d" }} />
          excites
        </span>
        <span>
          <span className="inline-block w-3 h-[2px] align-middle mr-1" style={{ background: "#74c0fc" }} />
          inhibits
        </span>
        <span>size = level · ring = sensitivity · dashed = slow clearance</span>
      </div>
      {hoverSys && (
        <div className="mt-3 border-t border-white/10 pt-3 text-[11.5px] leading-relaxed nv-fade-in">
          <div className="font-semibold mb-1" style={{ color: hoverSys.color }}>
            {hoverSys.name}
          </div>
          <div className="text-[var(--nv-dim)] mb-2">{hoverSys.role}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 nv-mono text-[10.5px]">
            <span className="text-[var(--nv-faint)]">level</span>
            <span>{ratio(snap.level[hoverSys.index])}</span>
            <span className="text-[var(--nv-faint)]">sensitivity</span>
            <span>{ratio(snap.sensitivity[hoverSys.index])}</span>
            <span className="text-[var(--nv-faint)]">clearance</span>
            <span>{ratio(snap.clearance[hoverSys.index])}</span>
            <span className="text-[var(--nv-faint)]">net signal</span>
            <span>{ratio(snap.z[hoverSys.index])}</span>
            <span className="text-[var(--nv-faint)]">responds in</span>
            <span>{hoverSys.tauHours < 1 ? `${Math.round(hoverSys.tauHours * 60)} min` : `${hoverSys.tauHours} h`}</span>
          </div>
          <div className="mt-2 text-[10.5px] text-[var(--nv-faint)]">
            Receptors: {hoverSys.receptors}
            <br />
            Cleared by: {hoverSys.clearance}
          </div>
        </div>
      )}
    </Panel>
  );
}
