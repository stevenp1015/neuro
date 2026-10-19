// Time. The local brain simulation that runs wherever you're standing.
//
// The field gives a location's *set points*. This module turns them into a
// living, moving state with:
//
//   • network coupling       each system's drive depends on the others' signal
//   • first-order kinetics   each system relaxes toward its target at its own speed
//   • receptor adaptation    sustained signal → receptors push back (tolerance),
//                            and when the push goes away you get rebound (withdrawal)
//   • circadian rhythm       cortisol peaks in the morning, arousal in the afternoon
//   • sleep pressure         builds while awake, drains while asleep; high arousal
//                            blocks sleep onset (insomnia emerges, it isn't scripted)
//   • slow plasticity        a weeks-scale variable (think BDNF) that follows
//                            sustained serotonin/dopamine and erodes under stress
//   • the mood loop          a FitzHugh–Nagumo oscillator: fast positive feedback
//                            + slow negative feedback. Depending on the local
//                            "drive" it rests, fires single episodes when kicked,
//                            or cycles on its own. Cycles are emergent behavior
//                            of parameters, not a category.
//
// Units: simulated hours.

import { INDEXED_EDGES } from "./network";
import { LocalParams } from "./field";
import { Modifier, MODIFIERS } from "./modifiers";
import { gaussian, mulberry32 } from "./random";
import { N_SYSTEMS, SYS, SYSTEMS } from "./systems";
import { computeExperience, N_EXPERIENCE } from "./experience";

// FitzHugh–Nagumo constants (the classic textbook pair).
const FHN_A = 0.7;
const FHN_B = 0.8;
/** Simulated hours per FHN time unit. Period ≈ 35–45 units ≈ 2–3 weeks. */
const FHN_HOURS = 10;
/** Oscillation band for the input current with these constants. */
export const FHN_BAND: [number, number] = [0.34, 1.4];

// How the mood loop's deviation pushes each system (log units per unit m).
const LOOP_COUPLING = new Float32Array(N_SYSTEMS);
LOOP_COUPLING[SYS.daReward] = 0.35;
LOOP_COUPLING[SYS.daFocus] = 0.08;
LOOP_COUPLING[SYS.norepinephrine] = 0.3;
LOOP_COUPLING[SYS.glutamate] = 0.28;
LOOP_COUPLING[SYS.gaba] = -0.15;
LOOP_COUPLING[SYS.opioid] = 0.12;
LOOP_COUPLING[SYS.cortisol] = 0.08;

/** Equilibrium of the fast FHN variable for input I (unique root for b=0.8). */
export function fhnEquilibrium(I: number): number {
  let v = -1;
  for (let i = 0; i < 12; i++) {
    const f = v - (v * v * v) / 3 - (v + FHN_A) / FHN_B + I;
    const df = 1 - v * v - 1 / FHN_B;
    v -= f / df;
  }
  return v;
}

export interface SimSnapshot {
  t: number;
  hourOfDay: number;
  day: number;
  asleep: boolean;
  sleepPressure: number;
  sleepDebt: number;
  /** effective log signal per system */
  z: Float32Array;
  /** current log level per system */
  level: Float32Array;
  /** current total log sensitivity (field + meds + adaptation) */
  sensitivity: Float32Array;
  /** adaptation component only */
  adaptation: Float32Array;
  /** total log clearance (field + meds) */
  clearance: Float32Array;
  experience: Float32Array;
  m: number;
  plasticity: number;
  loopDrive: number;
  loopRegime: "resting" | "excitable" | "cycling" | "sustained-high";
  doses: Float32Array;
}

export class BrainSim {
  t = 0;
  // state
  x = new Float32Array(N_SYSTEMS); // log level
  adapt = new Float32Array(N_SYSTEMS);
  noise = new Float32Array(N_SYSTEMS);
  pulse = new Float32Array(N_SYSTEMS);
  pulseTau = new Float32Array(N_SYSTEMS).fill(4);
  v = 0;
  w = 0;
  P = 0;
  S = 0.15; // sleep pressure
  debt = 0;
  asleep = false;
  forceAwakeUntil = -1;
  loopKick = 0;
  doses = new Float32Array(MODIFIERS.length);
  active = new Uint8Array(MODIFIERS.length);

  // scratch
  private z = new Float32Array(N_SYSTEMS);
  private target = new Float32Array(N_SYSTEMS);
  private medRelease = new Float32Array(N_SYSTEMS);
  private medClear = new Float32Array(N_SYSTEMS);
  private medSens = new Float32Array(N_SYSTEMS);
  private exp = new Float32Array(N_EXPERIENCE);
  private rand = mulberry32(12345);
  private mCache = 0;
  private lastI = 0;

  constructor(start: LocalParams, startHour = 9) {
    this.t = startHour;
    this.reset(start);
  }

  /** Snap the state to a location's set points (used on teleport / new world). */
  reset(p: LocalParams) {
    for (let i = 0; i < N_SYSTEMS; i++) {
      this.x[i] = p.logLevel[i] - p.logClearance[i];
      this.adapt[i] = 0;
      this.noise[i] = 0;
      this.pulse[i] = 0;
    }
    const I = p.drive;
    this.v = fhnEquilibrium(I);
    this.w = (this.v + FHN_A) / FHN_B;
    this.P = 0;
    this.loopKick = 0;
  }

  setModifier(index: number, on: boolean) {
    this.active[index] = on ? 1 : 0;
  }

  triggerEvent(id: string) {
    const p = this.pulse;
    const tau = this.pulseTau;
    const kick = (sys: number, amt: number, hours: number) => {
      p[sys] += amt;
      tau[sys] = hours;
    };
    switch (id) {
      case "stressor":
        kick(SYS.cortisol, 0.9, 6);
        kick(SYS.norepinephrine, 0.7, 3);
        kick(SYS.daReward, -0.3, 8);
        break;
      case "panic":
        kick(SYS.norepinephrine, 1.3, 0.7);
        kick(SYS.cortisol, 0.5, 2);
        kick(SYS.gaba, -0.4, 0.7);
        break;
      case "reward":
        kick(SYS.daReward, 0.8, 2);
        kick(SYS.opioid, 0.45, 3);
        break;
      case "hug":
        kick(SYS.oxytocin, 0.9, 1.5);
        kick(SYS.opioid, 0.25, 1.5);
        break;
      case "allnighter": {
        // stay awake through the coming night
        const hour = this.t % 24;
        const hoursToMorning = hour < 7 ? 7 - hour : 31 - hour;
        this.forceAwakeUntil = this.t + hoursToMorning;
        this.loopKick += 0.55;
        break;
      }
    }
  }

  get hourOfDay() {
    return ((this.t % 24) + 24) % 24;
  }

  step(dtHours: number, p: LocalParams) {
    // substep so the mood loop and adaptation integrate sanely at any time scale
    const maxDt = 0.4;
    const n = Math.max(1, Math.ceil(dtHours / maxDt));
    const h = dtHours / n;
    for (let s = 0; s < n; s++) this.substep(h, p);
  }

  private substep(dt: number, p: LocalParams) {
    this.t += dt;
    const hour = this.hourOfDay;

    // --- modifiers: first-order dose ramps -------------------------------
    this.medRelease.fill(0);
    this.medClear.fill(0);
    this.medSens.fill(0);
    let damping = 0;
    let plastPush = 0;
    let wake = 0;
    for (let k = 0; k < MODIFIERS.length; k++) {
      const mod: Modifier = MODIFIERS[k];
      const tau = this.active[k] ? mod.onsetHours : mod.washoutHours;
      const target = this.active[k] ? 1 : 0;
      this.doses[k] += (target - this.doses[k]) * (1 - Math.exp(-dt / Math.max(0.05, tau / 3)));
      const d = this.doses[k];
      if (d < 1e-4) continue;
      for (let i = 0; i < N_SYSTEMS; i++) {
        const id = SYSTEMS[i].id;
        this.medRelease[i] += (mod.release?.[id] ?? 0) * d;
        this.medClear[i] += (mod.clearance?.[id] ?? 0) * d;
        this.medSens[i] += (mod.sensitivity?.[id] ?? 0) * d;
      }
      damping += (mod.loopDamping ?? 0) * d;
      plastPush += (mod.plasticity ?? 0) * d;
      wake += (mod.wake ?? 0) * d;
    }

    // --- the mood loop -----------------------------------------------------
    const I = p.drive + this.loopKick + 0.35 * this.debt - 0.55 * damping;
    if (Math.abs(I - this.lastI) > 1e-4) {
      this.mCache = fhnEquilibrium(I);
      this.lastI = I;
    }
    const dTau = dt / FHN_HOURS;
    const eps = p.tempo;
    const dv = this.v - (this.v * this.v * this.v) / 3 - this.w + I;
    const dw = eps * (this.v + FHN_A - FHN_B * this.w);
    this.v += dv * dTau;
    this.w += dw * dTau;
    this.loopKick *= Math.exp(-dt / 36);
    const dev = this.v - this.mCache;
    const amp = 1 - 0.35 * damping;
    const m = (dev > 0 ? 0.38 * dev : 0.6 * dev) * amp;

    // --- sleep ---------------------------------------------------------------
    const zNE = this.z[SYS.norepinephrine];
    const arousal = 0.8 * zNE + 1.0 * m + 0.5 * Math.max(0, this.z[SYS.cortisol] - 0.6) - 0.5 * this.z[SYS.gaba];
    const nightWindow = hour >= 23 || hour < 7;
    if (this.asleep) {
      this.S = Math.max(0, this.S - (dt / 8) * 1.25);
      this.debt = Math.max(0, this.debt - dt / 24);
      if ((hour >= 7 && hour < 23 && this.S < 0.35) || this.S <= 0 || arousal > 1.2) this.asleep = false;
    } else {
      this.S += dt / 16;
      if (this.S > 1.05) this.debt += (dt / 24) * (this.S - 1.05) * 2;
      const wantsSleep = nightWindow || this.S > 1.25;
      const canSleep = arousal < 0.55 && this.t >= this.forceAwakeUntil;
      if (wantsSleep && canSleep && this.S > 0.5) this.asleep = true;
    }
    this.debt = Math.min(this.debt, 2.5);
    const asleep = this.asleep;

    // --- circadian + sleep modulation (log units) -----------------------------
    const tc = (2 * Math.PI) / 24;
    const circ = (sys: number) => {
      switch (sys) {
        case SYS.cortisol: return 0.45 * Math.cos(tc * (hour - 8));
        case SYS.norepinephrine: return 0.16 * Math.cos(tc * (hour - 15)) + (asleep ? -0.5 : 0);
        case SYS.serotonin: return 0.08 * Math.cos(tc * (hour - 13)) + (asleep ? -0.2 : 0);
        case SYS.daFocus: return 0.1 * Math.cos(tc * (hour - 11)) - 0.25 * this.debt;
        case SYS.daReward: return asleep ? -0.25 : 0;
        case SYS.gaba: return asleep ? 0.2 : 0;
        case SYS.glutamate: return asleep ? -0.2 : 0;
        default: return 0;
      }
    };

    // --- network drive + kinetics ---------------------------------------------
    const drive = this.target; // reuse buffer: first accumulate coupling
    drive.fill(1);
    for (const e of INDEXED_EDGES) {
      drive[e.to] += e.weight * (Math.exp(this.z[e.from]) - 1);
    }
    for (let i = 0; i < N_SYSTEMS; i++) {
      const sys = SYSTEMS[i];
      const logTarget =
        p.logLevel[i] +
        this.medRelease[i] -
        p.logClearance[i] -
        this.medClear[i] +
        Math.log(Math.max(0.08, drive[i])) +
        LOOP_COUPLING[i] * m +
        circ(i) +
        this.pulse[i] +
        this.noise[i];
      this.x[i] += (logTarget - this.x[i]) * (1 - Math.exp(-dt / sys.tauHours));

      // Ornstein–Uhlenbeck jitter (θ ≈ 1.5h)
      const sigma = sys.volatility * p.volatility;
      this.noise[i] += -this.noise[i] * (dt / 1.5) + sigma * Math.sqrt((2 * dt) / 1.5) * gaussian(this.rand) * 0.6;

      this.pulse[i] *= Math.exp(-dt / this.pulseTau[i]);

      // receptor adaptation: push back against signal above/below local baseline
      const baselineSignal = p.logLevel[i] - p.logClearance[i] + p.logSensitivity[i];
      const preAdapt = this.x[i] + p.logSensitivity[i] + this.medSens[i];
      const adaptTarget = -sys.adaptStrength * (preAdapt - baselineSignal);
      this.adapt[i] += (adaptTarget - this.adapt[i]) * (1 - Math.exp(-dt / (sys.adaptDays * 24)));

      this.z[i] = preAdapt + this.adapt[i];
    }

    // --- slow plasticity (weeks) ------------------------------------------------
    const z = this.z;
    const pTarget =
      0.55 * Math.tanh(1.2 * z[SYS.serotonin]) +
      0.25 * Math.tanh(z[SYS.daReward]) -
      0.5 * Math.tanh(Math.max(0, z[SYS.cortisol])) +
      plastPush;
    this.P += (pTarget - this.P) * (1 - Math.exp(-dt / (14 * 24)));

    // --- experience ------------------------------------------------------------
    const fatigueFelt = Math.max(0, this.S - 0.4 * wake + 0.25 * this.debt);
    computeExperience(z, m, this.P, fatigueFelt, this.exp);
    this.lastM = m;
    this.lastI2 = I;
    this.lastFatigue = fatigueFelt;
  }

  private lastM = 0;
  private lastI2 = 0;
  private lastFatigue = 0;

  regime(I: number): SimSnapshot["loopRegime"] {
    if (I > FHN_BAND[1]) return "sustained-high";
    if (I >= FHN_BAND[0]) return "cycling";
    if (I >= FHN_BAND[0] - 0.22) return "excitable";
    return "resting";
  }

  /** Fill a snapshot (allocates once; pass the same object back in). */
  snapshot(p: LocalParams, out?: SimSnapshot): SimSnapshot {
    const s: SimSnapshot = out ?? {
      t: 0,
      hourOfDay: 0,
      day: 0,
      asleep: false,
      sleepPressure: 0,
      sleepDebt: 0,
      z: new Float32Array(N_SYSTEMS),
      level: new Float32Array(N_SYSTEMS),
      sensitivity: new Float32Array(N_SYSTEMS),
      adaptation: new Float32Array(N_SYSTEMS),
      clearance: new Float32Array(N_SYSTEMS),
      experience: new Float32Array(N_EXPERIENCE),
      m: 0,
      plasticity: 0,
      loopDrive: 0,
      loopRegime: "resting",
      doses: new Float32Array(MODIFIERS.length),
    };
    s.t = this.t;
    s.hourOfDay = this.hourOfDay;
    s.day = Math.floor(this.t / 24);
    s.asleep = this.asleep;
    s.sleepPressure = this.lastFatigue;
    s.sleepDebt = this.debt;
    s.z.set(this.z);
    s.level.set(this.x);
    for (let i = 0; i < N_SYSTEMS; i++) {
      s.sensitivity[i] = p.logSensitivity[i] + this.medSens[i] + this.adapt[i];
      s.clearance[i] = p.logClearance[i] + this.medClear[i];
    }
    s.adaptation.set(this.adapt);
    s.experience.set(this.exp);
    s.m = this.lastM;
    s.plasticity = this.P;
    s.loopDrive = this.lastI2;
    s.loopRegime = this.regime(this.lastI2);
    s.doses.set(this.doses);
    return s;
  }
}
