// The nodes of the network: nine neurochemical systems.
//
// Each system is described by the four "factors" that matter for how it
// actually lands in experience — not just how much of it there is:
//
//   level        how much is out there (release / synthesis / tone)
//   sensitivity  how strongly receptors respond to it (affinity, density,
//                up/down-regulation). Same level + different sensitivity
//                = different experience.
//   transport    how fast it gets cleared (reuptake transporters like
//                SERT/DAT/NET, enzymes, metabolism). Slower clearance
//                = it lingers and accumulates.
//   time         how fast it responds (time constant) and how jumpy it is
//                (volatility), plus its rhythms.

export const SYSTEM_IDS = [
  "daReward",
  "daFocus",
  "serotonin",
  "norepinephrine",
  "gaba",
  "glutamate",
  "cortisol",
  "opioid",
  "oxytocin",
] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];
export const N_SYSTEMS = SYSTEM_IDS.length;

export interface NeuroSystem {
  id: SystemId;
  index: number;
  short: string;
  name: string;
  color: string;
  /** What it does, in plain language. */
  role: string;
  /** Where the signal lands. */
  receptors: string;
  /** What clears it (the "transport" factor). */
  clearance: string;
  /** Response time constant in simulated hours. */
  tauHours: number;
  /** Moment-to-moment jitter amplitude (fraction of level). */
  volatility: number;
  /** How quickly receptors adapt to sustained signal (days). */
  adaptDays: number;
  /** How hard receptors push back against sustained signal (0 = never adapt). */
  adaptStrength: number;
}

const defs: Omit<NeuroSystem, "index">[] = [
  {
    id: "daReward",
    short: "DA·R",
    name: "Dopamine — reward / wanting",
    color: "#ff9a3c",
    role:
      "Mesolimbic dopamine (VTA → nucleus accumbens). Drives wanting, motivation and the sense that something matters. Too little: nothing seems worth doing. Too much without cortical control: everything seems to matter.",
    receptors: "D1 / D2 (striatum)",
    clearance: "DAT reuptake transporter",
    tauHours: 0.25,
    volatility: 0.16,
    adaptDays: 4,
    adaptStrength: 0.45,
  },
  {
    id: "daFocus",
    short: "DA·F",
    name: "Dopamine — focus / prefrontal",
    color: "#ffd166",
    role:
      "Mesocortical dopamine (VTA → prefrontal cortex). Holds a thought steady in working memory. Follows an inverted-U: too little and attention leaks, too much and thinking goes rigid.",
    receptors: "D1 (prefrontal cortex)",
    clearance: "COMT enzyme + NET (the PFC has few DATs)",
    tauHours: 0.35,
    volatility: 0.12,
    adaptDays: 5,
    adaptStrength: 0.35,
  },
  {
    id: "serotonin",
    short: "5-HT",
    name: "Serotonin",
    color: "#4dabf7",
    role:
      "Raphe nuclei project everywhere. Sets patience, mood floor and how loudly threats register. It's a modulator of mood, not a 'happiness chemical'.",
    receptors: "5-HT1A, 5-HT2A, 5-HT2C and ~11 more",
    clearance: "SERT reuptake transporter (what SSRIs block)",
    tauHours: 2.0,
    volatility: 0.08,
    adaptDays: 9,
    adaptStrength: 0.3,
  },
  {
    id: "norepinephrine",
    short: "NE",
    name: "Norepinephrine",
    color: "#ff5c7a",
    role:
      "Locus coeruleus. The alertness dial: vigilance, arousal and the 'something's happening' signal. Moderate is sharp; high is jittery and hyper-scanning.",
    receptors: "α1, α2 (brake), β",
    clearance: "NET reuptake transporter",
    tauHours: 0.15,
    volatility: 0.2,
    adaptDays: 5,
    adaptStrength: 0.35,
  },
  {
    id: "gaba",
    short: "GABA",
    name: "GABA",
    color: "#63e6be",
    role:
      "The main inhibitory transmitter, the brakes. Quiets runaway activity, lets the body settle and lets sleep happen.",
    receptors: "GABA-A (benzo & alcohol site), GABA-B",
    clearance: "GAT transporters (neurons + astrocytes)",
    tauHours: 0.3,
    volatility: 0.08,
    adaptDays: 6,
    adaptStrength: 0.55,
  },
  {
    id: "glutamate",
    short: "GLU",
    name: "Glutamate",
    color: "#b197fc",
    role:
      "The main excitatory transmitter, the accelerator. Speed of thought, learning and plasticity. It has to stay balanced against GABA (E/I balance).",
    receptors: "AMPA, NMDA, mGluR",
    clearance: "EAAT transporters (mostly astrocytes)",
    tauHours: 0.2,
    volatility: 0.12,
    adaptDays: 6,
    adaptStrength: 0.4,
  },
  {
    id: "cortisol",
    short: "CORT",
    name: "Cortisol (HPA axis)",
    color: "#e8590c",
    role:
      "The stress hormone loop (hypothalamus → pituitary → adrenals). Mobilizes energy for a threat. Fine in bursts; chronically high, it erodes mood, reward and memory.",
    receptors: "GR / MR (glucocorticoid receptors, brain-wide)",
    clearance: "Liver metabolism + 11β-HSD; shuts itself off via GR negative feedback",
    tauHours: 1.2,
    volatility: 0.1,
    adaptDays: 14,
    adaptStrength: 0.25,
  },
  {
    id: "opioid",
    short: "OPI",
    name: "Endogenous opioids",
    color: "#f783ac",
    role:
      "Endorphins and enkephalins. The 'liking' system: pleasure itself, comfort and pain relief. It's a different thing from dopamine's 'wanting'.",
    receptors: "μ (mu), δ, κ opioid receptors",
    clearance: "Peptidase enzymes",
    tauHours: 0.5,
    volatility: 0.14,
    adaptDays: 5,
    adaptStrength: 0.5,
  },
  {
    id: "oxytocin",
    short: "OXT",
    name: "Oxytocin",
    color: "#ffe066",
    role:
      "Hypothalamic neuropeptide for bonding, trust and social safety. Turns down the amygdala and the stress axis when people feel safe.",
    receptors: "OXTR",
    clearance: "Peptidase enzymes (oxytocinase)",
    tauHours: 0.6,
    volatility: 0.15,
    adaptDays: 7,
    adaptStrength: 0.3,
  },
];

export const SYSTEMS: NeuroSystem[] = defs.map((d, index) => ({ ...d, index }));

export const SYS: Record<SystemId, number> = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s.index]),
) as Record<SystemId, number>;
