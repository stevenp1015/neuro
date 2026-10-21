"use client";

import { useMemo, useState } from "react";
import { engine } from "../engine/engine";
import { EXPERIENCES, N_EXPERIENCE } from "../model/experience";
import { sampleGrid } from "../model/grid";
import { durationStatus, evaluateLens, LENSES } from "../model/lenses";
import { MODIFIERS, Factor } from "../model/modifiers";
import { findPlace, PLACES } from "../model/places";
import { SYSTEMS } from "../model/systems";
import { LayerId, TabId, useUI } from "../store";
import { Bar, Chip, Panel, ratio, SectionTitle, SignedBar, usePoll } from "./common";

const TABS: { id: TabId; label: string }[] = [
  { id: "here", label: "Here" },
  { id: "labels", label: "Labels" },
  { id: "modifiers", label: "Modifiers" },
  { id: "go", label: "Go" },
  { id: "view", label: "View" },
];

export function SidePanel() {
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);
  return (
    <Panel className="w-[360px] h-full flex flex-col !p-0 overflow-hidden">
      <div className="flex px-3 pt-1 border-b border-white/10">
        {TABS.map((t) => (
          <button key={t.id} className={`nv-tab ${tab === t.id ? "nv-tab-on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 nv-scroll p-4">
        {tab === "here" && <HereTab />}
        {tab === "labels" && <LabelsTab />}
        {tab === "modifiers" && <ModifiersTab />}
        {tab === "go" && <GoTab />}
        {tab === "view" && <ViewTab />}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

const REGIME_TEXT: Record<string, { label: string; color: string; text: string }> = {
  resting: { label: "Resting", color: "#8ce99a", text: "The mood loop is stable here. Kicks fade without echoing." },
  excitable: {
    label: "Excitable",
    color: "#ffd43b",
    text: "Stable until kicked. A big enough push (try an all-nighter) fires a full episode, a high and then a crash, before it settles.",
  },
  cycling: {
    label: "Self-cycling",
    color: "#ff922b",
    text: "Fast positive feedback + slow negative feedback = the loop cycles on its own here. Switch time to Weeks and watch it.",
  },
  "sustained-high": { label: "Locked high", color: "#ff6b6b", text: "The drive is so strong the loop pins itself at the top." },
};

function HereTab() {
  const snap = usePoll(6);
  if (!snap) return null;
  const regime = REGIME_TEXT[snap.loopRegime];
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>What it&apos;s like here</SectionTitle>
        <div className="space-y-[7px]">
          {EXPERIENCES.map((e, i) => (
            <div key={e.id} title={`Driven by: ${e.drivers}`}>
              <div className="flex justify-between text-[11px] mb-[3px]">
                <span style={{ color: e.color }}>{e.label}</span>
                <span className="text-[var(--nv-faint)] text-[10px]">
                  {snap.experience[i] < 0.35 ? e.low : snap.experience[i] > 0.65 ? e.high : ""}
                </span>
              </div>
              <Bar value={snap.experience[i]} color={e.color} mark={e.id === "threat" ? 0.27 : e.id === "salience" ? 0.08 : 0.5} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Mood loop</SectionTitle>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold px-2 py-[2px] rounded-full border" style={{ color: regime.color, borderColor: regime.color + "66" }}>
            {regime.label}
          </span>
          <span className="nv-mono text-[10.5px] text-[var(--nv-faint)]">drive {snap.loopDrive.toFixed(2)} · swing {snap.m >= 0 ? "+" : ""}{snap.m.toFixed(2)}</span>
        </div>
        <div className="text-[11px] text-[var(--nv-dim)] leading-relaxed">{regime.text}</div>
      </div>

      <div>
        <SectionTitle right={<span className="text-[10px] text-[var(--nv-faint)]">vs typical</span>}>The four factors</SectionTitle>
        <div className="grid grid-cols-[52px_1fr_1fr_1fr] gap-x-2 gap-y-[6px] items-center text-[10px]">
          <span />
          <span className="text-[var(--nv-faint)]">level</span>
          <span className="text-[var(--nv-faint)]">sensitivity</span>
          <span className="text-[var(--nv-faint)]">clearance</span>
          {SYSTEMS.map((s) => (
            <FactorRow key={s.id} color={s.color} short={s.short} level={snap.level[s.index]} sens={snap.sensitivity[s.index]} clear={snap.clearance[s.index]} />
          ))}
        </div>
        <div className="text-[10.5px] text-[var(--nv-faint)] mt-2 leading-relaxed">
          Two places with identical levels can feel completely different because sensitivity and clearance differ. Same &ldquo;amount&rdquo;, different signal.
        </div>
      </div>

      <div>
        <SectionTitle>Slow variables</SectionTitle>
        <div className="space-y-2 text-[11px]">
          <SlowRow label="Plasticity (weeks)" value={snap.plasticity} hint="follows sustained serotonin/dopamine, erodes under chronic cortisol" />
          <SlowRow label="Sleep pressure" value={snap.sleepPressure - 0.5} hint={snap.sleepDebt > 0.1 ? `sleep debt ${snap.sleepDebt.toFixed(2)}` : "builds while awake"} />
        </div>
      </div>
    </div>
  );
}

function FactorRow({ color, short, level, sens, clear }: { color: string; short: string; level: number; sens: number; clear: number }) {
  return (
    <>
      <span className="nv-mono" style={{ color }}>
        {short}
      </span>
      <span title={ratio(level)}>
        <SignedBar value={level} color={color} range={1} height={5} />
      </span>
      <span title={ratio(sens)}>
        <SignedBar value={sens} color={color} range={0.6} height={5} />
      </span>
      <span title={ratio(clear)}>
        <SignedBar value={clear} color={color} range={0.8} height={5} />
      </span>
    </>
  );
}

function SlowRow({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex justify-between mb-[3px]">
        <span className="text-[var(--nv-dim)]">{label}</span>
        <span className="text-[10px] text-[var(--nv-faint)]">{hint}</span>
      </div>
      <SignedBar value={value} color="#c0eb75" range={0.8} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function LabelsTab() {
  usePoll(4);
  const lens = useUI((s) => s.lens);
  const setSeverity = useUI((s) => s.setSeverity);
  const setRequired = useUI((s) => s.setRequired);
  const resetLens = useUI((s) => s.resetLens);
  const membranes = useUI((s) => s.membranes);
  const toggleMembrane = useUI((s) => s.toggleMembrane);
  const showCycling = useUI((s) => s.showCycling);
  const toggleCycling = useUI((s) => s.toggleCycling);
  const [open, setOpen] = useState<string | null>(null);

  const snap = engine.snapshot;
  const mapDims = useMemo(() => new Float32Array(N_EXPERIENCE), []);
  if (!snap || !engine.grid) return null;
  sampleGrid(engine.grid, engine.grid.experience, N_EXPERIENCE, ...engine.position, mapDims);

  return (
    <div className="space-y-4">
      <div className="text-[11.5px] text-[var(--nv-dim)] leading-relaxed">
        Labels are rules applied on top of a continuous state: a cutoff decides what counts as a symptom, you need N of them, for long enough.
        Turn the knobs. <span className="text-[var(--nv-text)]">The chemistry doesn&apos;t move. The labels do.</span>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="nv-label">What counts as a symptom</span>
          <button className="text-[10px] text-[var(--nv-faint)] hover:text-white" onClick={resetLens}>
            reset
          </button>
        </div>
        <input type="range" className="nv-range" min={-1} max={1} step={0.05} value={lens.severity} onChange={(e) => setSeverity(Number(e.target.value))} />
        <div className="flex justify-between text-[10px] text-[var(--nv-faint)] mt-1">
          <span>loose (mild counts)</span>
          <span className="nv-mono">{lens.severity.toFixed(2)}</span>
          <span>strict (only extreme)</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[9.5px] text-[var(--nv-faint)] uppercase tracking-wider px-1">
        <span />
        <span className="w-12 text-center" title="Baseline chemistry of this spot (what the membranes show)">map</span>
        <span className="w-12 text-center" title="Your live state right now, including rhythms, meds and the mood loop">now</span>
        <span className="w-14 text-center" title="Duration criterion, checked on daily averages of the time you've spent">over time</span>
      </div>

      {LENSES.map((l) => {
        const mapEval = evaluateLens(l, mapDims, lens);
        const nowEval = evaluateLens(l, snap.experience, lens);
        const metByDay = engine.days.map((d) => evaluateLens(l, d.experience, lens).metNow);
        const dur = durationStatus(metByDay, l.durationDays);
        const isOpen = open === l.id;
        return (
          <div key={l.id} className="rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-2 py-2 cursor-pointer" onClick={() => setOpen(isOpen ? null : l.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                <span className="text-[12px] truncate">{l.name}</span>
              </div>
              <Status met={mapEval.metNow} margin={mapEval.margin} color={l.color} />
              <Status met={nowEval.metNow} margin={nowEval.margin} color={l.color} />
              <div className="w-14 text-center nv-mono text-[10px]" title={l.durationNote}>
                {dur.satisfied ? (
                  <span style={{ color: l.color }}>meets</span>
                ) : dur.enoughData ? (
                  <span className="text-[var(--nv-faint)]">{dur.metDays}/{l.durationDays}d</span>
                ) : (
                  <span className="text-[var(--nv-faint)]">{dur.observedDays}/{l.durationDays}d</span>
                )}
              </div>
            </div>
            {isOpen && (
              <div className="px-3 pb-3 text-[11px] nv-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[var(--nv-dim)]">
                    Needs{" "}
                    <button className="nv-chip !px-2 !py-[2px]" onClick={() => setRequired(l.id, Math.max(1, lens.required[l.id] - 1))}>
                      −
                    </button>{" "}
                    <span className="nv-mono text-white">{lens.required[l.id]}</span>{" "}
                    <button className="nv-chip !px-2 !py-[2px]" onClick={() => setRequired(l.id, Math.min(l.symptoms.length, lens.required[l.id] + 1))}>
                      +
                    </button>{" "}
                    of {l.symptoms.length}, incl. a ★
                  </span>
                  <Chip active={membranes[l.id]} color={l.color} onClick={() => toggleMembrane(l.id)} title="Show this label's boundary in the world">
                    {membranes[l.id] ? "boundary on" : "show boundary"}
                  </Chip>
                </div>
                <div className="space-y-1 mb-2">
                  {nowEval.symptoms.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-3 text-center ${s.present ? "" : "opacity-30"}`} style={{ color: s.present ? l.color : undefined }}>
                        {s.present ? "●" : "○"}
                      </span>
                      <span className={`flex-1 ${s.present ? "text-white" : "text-[var(--nv-faint)]"}`}>
                        {s.label}
                        {l.symptoms[i].core ? " ★" : ""}
                      </span>
                      <span className="nv-mono text-[10px] text-[var(--nv-faint)]">
                        {s.value.toFixed(2)} {s.dir === "high" ? "≥" : "≤"} {s.cutoff.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[10.5px] text-[var(--nv-faint)] leading-relaxed">
                  Duration: {l.durationNote}. {l.caveat}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2 flex items-center justify-between">
        <div className="text-[11.5px]">
          <div>Self-cycling zones</div>
          <div className="text-[10px] text-[var(--nv-faint)]">where the mood loop oscillates on its own</div>
        </div>
        <Chip active={showCycling} color="#c0eb75" onClick={toggleCycling}>
          {showCycling ? "on" : "show"}
        </Chip>
      </div>

      <div className="text-[10px] text-[var(--nv-faint)] leading-relaxed">
        Cartoons of the <i>structure</i> of DSM-5 criteria, not the real text. Not a diagnostic tool. The duration column uses daily averages of the time
        you&apos;ve spent; switch to Weeks/Months time to see it fill.
      </div>
    </div>
  );
}

function Status({ met, margin, color }: { met: boolean; margin: number; color: string }) {
  // margin near 0 = on the fence
  const near = !met && margin > -0.12;
  return (
    <div className="w-12 flex justify-center" title={met ? "criteria met" : near ? "almost: one knob away" : "not met"}>
      <span
        className="w-3 h-3 rounded-full border"
        style={{
          borderColor: met || near ? color : "rgba(255,255,255,0.2)",
          background: met ? color : "transparent",
          boxShadow: met ? `0 0 10px ${color}` : undefined,
          opacity: near ? 0.7 : 1,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

const FACTOR_COLORS: Record<Factor, string> = {
  level: "#ffd43b",
  transport: "#63e6be",
  sensitivity: "#e599f7",
  rhythm: "#ff922b",
};

function ModifiersTab() {
  const snap = usePoll(4);
  const modifiers = useUI((s) => s.modifiers);
  const toggleModifier = useUI((s) => s.toggleModifier);
  const [open, setOpen] = useState<string | null>(null);
  const groups: { kind: string; title: string }[] = [
    { kind: "medication", title: "Medications" },
    { kind: "substance", title: "Substances" },
    { kind: "habit", title: "Habits" },
  ];
  return (
    <div className="space-y-4">
      <div className="text-[11.5px] text-[var(--nv-dim)] leading-relaxed">
        Everything here works by turning one of the four knobs: <Tag f="level" />, <Tag f="transport" />, <Tag f="sensitivity" /> or <Tag f="rhythm" />.
        Effects ramp in and wash out on their own clocks, and receptors adapt, so watch the timeline (Weeks is good) when you switch something on or off.
      </div>
      {groups.map((g) => (
        <div key={g.kind}>
          <SectionTitle>{g.title}</SectionTitle>
          <div className="space-y-2">
            {MODIFIERS.map((m, i) =>
              m.kind !== g.kind ? null : (
                <div key={m.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleModifier(i)}
                      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${modifiers[i] ? "bg-emerald-400/70" : "bg-white/10"}`}
                      aria-label={`toggle ${m.name}`}
                    >
                      <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${modifiers[i] ? "left-[18px]" : "left-[2px]"}`} />
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(open === m.id ? null : m.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px]">{m.name}</span>
                        <Tag f={m.factor} />
                      </div>
                      <div className="text-[10.5px] text-[var(--nv-faint)] truncate">{m.summary}</div>
                    </div>
                  </div>
                  {snap && (snap.doses[i] > 0.01 || modifiers[i]) && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9.5px] text-[var(--nv-faint)] w-12">on board</span>
                      <Bar value={snap.doses[i]} color={FACTOR_COLORS[m.factor]} height={4} />
                    </div>
                  )}
                  {open === m.id && <div className="mt-2 text-[11px] text-[var(--nv-dim)] leading-relaxed nv-fade-in">{m.mechanism}</div>}
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      <div className="text-[10px] text-[var(--nv-faint)]">Illustrative magnitudes, not pharmacology. Not medical advice.</div>
    </div>
  );
}

function Tag({ f }: { f: Factor }) {
  return (
    <span className="text-[9px] uppercase tracking-wider px-[6px] py-[1px] rounded-full border" style={{ color: FACTOR_COLORS[f], borderColor: FACTOR_COLORS[f] + "55" }}>
      {f}
    </span>
  );
}

// ---------------------------------------------------------------------------

function GoTab() {
  const flyTo = useUI((s) => s.flyTo);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="text-[11.5px] text-[var(--nv-dim)] leading-relaxed">
        Pick a feeling. We search the whole landscape for the chemistry that produces it and fly you there. Then check the Labels tab: two places that feel alike
        can get different labels, and some intense places get none.
      </div>
      <div className="grid grid-cols-1 gap-2">
        {PLACES.map((p) => (
          <button
            key={p.id}
            className={`text-left rounded-lg border p-2 transition-colors ${last === p.id ? "border-emerald-300/50 bg-emerald-300/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"}`}
            onClick={() => {
              if (!engine.grid) return;
              const r = findPlace(engine.grid, p.target, last === p.id ? engine.position : undefined);
              flyTo(r.position, p.name);
              setLast(p.id);
            }}
          >
            <div className="text-[12px]">{p.name}</div>
            <div className="text-[10.5px] text-[var(--nv-faint)]">{p.blurb}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button className="nv-btn flex-1" onClick={() => flyTo([...engine.startPosition], "start")}>
          Back to start
        </button>
        <button
          className="nv-btn flex-1"
          onClick={() => {
            const r = () => (Math.random() * 2 - 1) * 200;
            flyTo([r(), r() * 0.8, r()], "somewhere");
          }}
        >
          Somewhere random
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const LAYERS: { id: LayerId; label: string; text: string }[] = [
  { id: "level", label: "Chemistry", text: "Which system is most off-typical at each spot. Dots = abundant, rings = depleted." },
  { id: "sensitivity", label: "Sensitivity", text: "How strongly receptors respond, independent of level. Invisible on a blood test." },
  { id: "clearance", label: "Transport", text: "How fast each system gets cleared (reuptake / metabolism)." },
  { id: "experience", label: "Feelings", text: "The same space colored by what it feels like instead of what it's made of." },
];

function ViewTab() {
  const layer = useUI((s) => s.layer);
  const setLayer = useUI((s) => s.setLayer);
  const visible = useUI((s) => s.visibleSystems);
  const toggleSystem = useUI((s) => s.toggleSystem);
  const soloSystem = useUI((s) => s.soloSystem);
  const perception = useUI((s) => s.perception);
  const setPerception = useUI((s) => s.setPerception);
  const compass = useUI((s) => s.compass);
  const setCompass = useUI((s) => s.setCompass);
  const audio = useUI((s) => s.audio);
  const toggleAudio = useUI((s) => s.toggleAudio);
  const newWorld = useUI((s) => s.newWorld);
  const seed = useUI((s) => s.seed);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Layer</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              className={`text-left rounded-lg border p-2 ${layer === l.id ? "border-emerald-300/50 bg-emerald-300/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"}`}
              onClick={() => setLayer(l.id)}
            >
              <div className="text-[12px]">{l.label}</div>
              <div className="text-[10px] text-[var(--nv-faint)] leading-snug">{l.text}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle right={<span className="text-[10px] text-[var(--nv-faint)]">double-click = solo</span>}>Systems shown</SectionTitle>
        <div className="flex flex-wrap gap-[6px]">
          {SYSTEMS.map((s) => (
            <span key={s.id} onDoubleClick={() => soloSystem(s.index)}>
              <Chip active={visible[s.index]} color={s.color} onClick={() => toggleSystem(s.index)} title={s.name}>
                {s.short}
              </Chip>
            </span>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>First-person ↔ observer</SectionTitle>
        <input type="range" className="nv-range" min={0} max={1} step={0.01} value={perception} onChange={(e) => setPerception(Number(e.target.value))} />
        <div className="flex justify-between text-[10px] text-[var(--nv-faint)] mt-1">
          <span>see it plainly</span>
          <span>feel it</span>
        </div>
      </div>

      <div>
        <SectionTitle>Compass</SectionTitle>
        <div className="flex gap-2">
          {(["chemistry", "feelings", "off"] as const).map((m) => (
            <Chip key={m} active={compass === m} onClick={() => setCompass(m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Sound</SectionTitle>
        <Chip active={audio} onClick={toggleAudio} color="#8ce99a">
          {audio ? "soundscape on" : "turn on soundscape"}
        </Chip>
        <div className="text-[10px] text-[var(--nv-faint)] mt-1">Drone detunes with threat, heartbeat follows arousal, pings for aberrant salience. Headphones recommended.</div>
      </div>

      <div>
        <SectionTitle>World</SectionTitle>
        <div className="flex items-center gap-2">
          <button
            className="nv-btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await newWorld();
              setLoading(false);
            }}
          >
            {loading ? "Growing…" : "Roll a new world"}
          </button>
          <span className="nv-mono text-[10.5px] text-[var(--nv-faint)]">seed {seed}</span>
        </div>
        <div className="text-[10px] text-[var(--nv-faint)] mt-1">Same rules, different weather. The labels and the cycling zones move with it.</div>
      </div>

      <div>
        <SectionTitle>Controls</SectionTitle>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-[var(--nv-dim)]">
          <span><kbd>click</kbd></span><span>look around (Esc releases)</span>
          <span><kbd>WASD</kbd></span><span>fly</span>
          <span><kbd>Space</kbd>/<kbd>Shift</kbd></span><span>up / down</span>
          <span><kbd>F</kbd></span><span>hold to boost</span>
          <span><kbd>wheel</kbd></span><span>base speed</span>
          <span><kbd>1</kbd>–<kbd>4</kbd></span><span>time scale</span>
          <span><kbd>P</kbd></span><span>pause time</span>
          <span><kbd>H</kbd></span><span>hide HUD</span>
        </div>
      </div>
    </div>
  );
}
