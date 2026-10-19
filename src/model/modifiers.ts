// Things that change the factors: medications, substances and habits.
//
// Every one of these works by pushing on exactly the knobs from the core
// idea: release (level), transport (clearance), sensitivity, or rhythm.
// That's why "boosts serotonin" and "makes serotonin linger" and "makes
// receptors more sensitive" are genuinely different things that feel different.
//
// Magnitudes are illustrative, not pharmacology. Not medical advice.

import { SystemId } from "./systems";

export type Factor = "level" | "transport" | "sensitivity" | "rhythm";

export interface Modifier {
  id: string;
  name: string;
  kind: "medication" | "substance" | "habit";
  factor: Factor;
  summary: string;
  mechanism: string;
  /** Hours to reach full effect (first-order ramp). */
  onsetHours: number;
  /** Hours to wash out after stopping. */
  washoutHours: number;
  /** log-unit changes */
  release?: Partial<Record<SystemId, number>>;
  clearance?: Partial<Record<SystemId, number>>;
  sensitivity?: Partial<Record<SystemId, number>>;
  /** Pulls the mood loop toward stability (0..1). */
  loopDamping?: number;
  /** Pushes slow plasticity up (log-ish). */
  plasticity?: number;
  /** Masks felt tiredness (0..1). */
  wake?: number;
}

export const MODIFIERS: Modifier[] = [
  {
    id: "ssri",
    name: "SSRI",
    kind: "medication",
    factor: "transport",
    summary: "Slows serotonin reuptake so it lingers longer.",
    mechanism:
      "Blocks SERT, the serotonin transporter. Synaptic serotonin rises within hours, but mood effects usually take weeks. Here that delay comes from the slow plasticity variable catching up, which is one leading hypothesis (BDNF / neuroplasticity).",
    onsetHours: 72,
    washoutHours: 96,
    clearance: { serotonin: -1.0 },
    plasticity: 0.25,
  },
  {
    id: "stimulant",
    name: "Stimulant",
    kind: "medication",
    factor: "transport",
    summary: "Blocks dopamine + norepinephrine reuptake (and boosts release).",
    mechanism:
      "Methylphenidate blocks DAT and NET; amphetamines also reverse them to push extra release. Prefrontal dopamine climbs toward the top of its inverted-U, so focus can sharpen. Overshoot it and you get jittery and rigid. Receptors adapt with repeated use.",
    onsetHours: 1,
    washoutHours: 5,
    clearance: { daReward: -0.5, daFocus: -0.7, norepinephrine: -0.55 },
    release: { daReward: 0.15, norepinephrine: 0.1 },
  },
  {
    id: "benzo",
    name: "Benzodiazepine",
    kind: "medication",
    factor: "sensitivity",
    summary: "Makes GABA-A receptors respond harder to the GABA already there.",
    mechanism:
      "A positive allosteric modulator. It doesn't add GABA, it turns up the receptor's response to it (the sensitivity factor). Fast calm. Receptors downregulate with sustained use, and stopping leaves you with less braking than you started with: rebound anxiety and insomnia.",
    onsetHours: 0.5,
    washoutHours: 10,
    sensitivity: { gaba: 0.6 },
  },
  {
    id: "antipsychotic",
    name: "Antipsychotic (D2 blocker)",
    kind: "medication",
    factor: "sensitivity",
    summary: "Blocks D2 receptors, turning down how loudly dopamine lands.",
    mechanism:
      "Lowers the effective dopamine signal, especially in limbic pathways, which quiets aberrant salience. It doesn't distinguish 'meaningful' from 'aberrant', so motivation and pleasure can flatten too. That's a real and common tradeoff.",
    onsetHours: 6,
    washoutHours: 48,
    sensitivity: { daReward: -0.7, daFocus: -0.15 },
  },
  {
    id: "lithium",
    name: "Lithium",
    kind: "medication",
    factor: "rhythm",
    summary: "Stabilizes the mood loop so cycles damp out.",
    mechanism:
      "Its mechanism is still debated (GSK-3, inositol signaling, circadian genes). Here it's modeled as damping the mood loop's excitability and shrinking its swings, plus a nudge to plasticity. It works for many people, but not every region of the map: in the strongest-drive zones the loop keeps cycling, just smaller.",
    onsetHours: 120,
    washoutHours: 72,
    loopDamping: 0.65,
    plasticity: 0.15,
  },
  {
    id: "caffeine",
    name: "Caffeine",
    kind: "substance",
    factor: "level",
    summary: "Blocks adenosine, which masks tiredness and nudges arousal up.",
    mechanism:
      "Adenosine builds up the longer you're awake (sleep pressure). Caffeine blocks its receptors, so you don't feel the pressure, and noradrenaline and prefrontal dopamine tick up. It doesn't remove the sleep debt.",
    onsetHours: 0.5,
    washoutHours: 6,
    release: { norepinephrine: 0.22, daFocus: 0.12 },
    wake: 0.45,
  },
  {
    id: "alcohol",
    name: "Alcohol",
    kind: "substance",
    factor: "sensitivity",
    summary: "Boosts GABA-A, blunts NMDA glutamate, releases opioids.",
    mechanism:
      "Calm and warm on the way up. The brain then compensates by adapting GABA and glutamate receptors, so as it wears off, braking is weak and excitation is loud: the 3am wake-up and the next-day 'hangxiety'. Watch the adaptation do this in the timeline.",
    onsetHours: 0.5,
    washoutHours: 4,
    sensitivity: { gaba: 0.45, glutamate: -0.4 },
    release: { opioid: 0.3, daReward: 0.2 },
  },
  {
    id: "exercise",
    name: "Regular exercise",
    kind: "habit",
    factor: "transport",
    summary: "Endorphins + dopamine up, faster cortisol recovery, more plasticity.",
    mechanism:
      "Exercise clears the stress response faster, releases endogenous opioids (and endocannabinoids, not modeled) and raises BDNF. It's slow-acting as a habit, like the SSRI.",
    onsetHours: 48,
    washoutHours: 72,
    release: { opioid: 0.22, daReward: 0.1 },
    clearance: { cortisol: 0.25 },
    plasticity: 0.25,
  },
  {
    id: "connection",
    name: "Time with your people",
    kind: "habit",
    factor: "level",
    summary: "Oxytocin and opioids up, stress axis down.",
    mechanism:
      "Social safety is a neurochemical event. Oxytocin damps cortisol and amygdala-driven arousal through the network edges you can see on the graph.",
    onsetHours: 2,
    washoutHours: 12,
    release: { oxytocin: 0.5, opioid: 0.12 },
  },
];

export interface SimEvent {
  id: string;
  name: string;
  description: string;
}

export const EVENTS: SimEvent[] = [
  { id: "stressor", name: "Stressor", description: "Bad news hits. Cortisol + noradrenaline spike, then decay over hours." },
  { id: "panic", name: "Panic surge", description: "A noradrenaline spike out of nowhere, with brakes briefly overwhelmed." },
  { id: "reward", name: "Good news", description: "A burst of phasic dopamine and opioids." },
  { id: "hug", name: "A real hug", description: "Oxytocin pulse. Watch it pull cortisol down through the network." },
  { id: "allnighter", name: "All-nighter", description: "Skip tonight's sleep. Sleep loss is a classic trigger for the mood loop to take off." },
];
