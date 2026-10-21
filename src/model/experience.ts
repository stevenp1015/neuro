// From chemistry to "what it's like".
//
// Experiential dimensions are computed from the *effective* signal of each
// system (level × sensitivity, after adaptation), not from raw levels.
// That's the core argument of the whole project in one function: what you
// feel is a function of the entire configuration, and the same "amount" of
// a transmitter can land completely differently depending on everything
// else around it.

import { clamp, sigmoid } from "./random";
import { SYS } from "./systems";

export const EXPERIENCE_IDS = [
  "mood",
  "energy",
  "motivation",
  "pleasure",
  "calm",
  "threat",
  "focus",
  "thoughtSpeed",
  "salience",
  "connection",
  "fatigue",
] as const;

export type ExperienceId = (typeof EXPERIENCE_IDS)[number];
export const N_EXPERIENCE = EXPERIENCE_IDS.length;

export const EXP: Record<ExperienceId, number> = Object.fromEntries(
  EXPERIENCE_IDS.map((id, i) => [id, i]),
) as Record<ExperienceId, number>;

export interface ExperienceMeta {
  id: ExperienceId;
  label: string;
  low: string;
  high: string;
  color: string;
  /** Which systems mostly drive it (for tooltips). */
  drivers: string;
}

export const EXPERIENCES: ExperienceMeta[] = [
  { id: "mood", label: "Mood", low: "heavy, grey", high: "bright, elevated", color: "#ffd43b", drivers: "5-HT, DA·R, opioids, oxytocin, minus cortisol, plus the mood loop and plasticity" },
  { id: "energy", label: "Energy", low: "drained", high: "wired", color: "#ff922b", drivers: "NE, DA·R, glutamate minus GABA, minus sleep pressure" },
  { id: "motivation", label: "Wanting", low: "can't start", high: "driven", color: "#ff9a3c", drivers: "DA·R mostly (incentive salience)" },
  { id: "pleasure", label: "Liking", low: "anhedonic", high: "everything's delicious", color: "#f783ac", drivers: "Opioids mostly; dopamine is wanting, not liking" },
  { id: "calm", label: "Calm", low: "restless, irritable", high: "settled", color: "#63e6be", drivers: "GABA, 5-HT, oxytocin minus NE and cortisol" },
  { id: "threat", label: "Threat", low: "safe", high: "dread, on guard", color: "#ff6b6b", drivers: "NE, cortisol minus GABA, 5-HT, oxytocin" },
  { id: "focus", label: "Focus", low: "scattered", high: "locked in", color: "#74c0fc", drivers: "Inverted-U of prefrontal dopamine + NE (too little or too much both fail)" },
  { id: "thoughtSpeed", label: "Thought speed", low: "slowed", high: "racing", color: "#b197fc", drivers: "Glutamate, NE, DA minus GABA, plus the mood loop" },
  { id: "salience", label: "Meaning-loading", low: "ordinary", high: "everything's a sign", color: "#e599f7", drivers: "Limbic dopamine high while prefrontal dopamine is low (aberrant salience)" },
  { id: "connection", label: "Connection", low: "behind glass", high: "close, safe with people", color: "#ffe066", drivers: "Oxytocin, opioids, 5-HT minus stress" },
  { id: "fatigue", label: "Tiredness", low: "fresh", high: "heavy, sleepy", color: "#868e96", drivers: "Sleep pressure (adenosine-like), circadian clock, minus arousal" },
];

/**
 * @param z    effective log signal per system (0 = typical)
 * @param m    mood-loop deviation (FitzHugh–Nagumo output, ~[-0.8, 1.1])
 * @param P    slow plasticity state (~[-1, 1])
 * @param fatigueFelt  sleep pressure as felt, ~0 (just woke) to 1+ (exhausted)
 */
export function computeExperience(
  z: ArrayLike<number>,
  m: number,
  P: number,
  fatigueFelt: number,
  out: Float32Array,
): Float32Array {
  const dar = z[SYS.daReward];
  const daf = z[SYS.daFocus];
  const sht = z[SYS.serotonin];
  const ne = z[SYS.norepinephrine];
  const gaba = z[SYS.gaba];
  const glu = z[SYS.glutamate];
  const cort = z[SYS.cortisol];
  const opi = z[SYS.opioid];
  const oxt = z[SYS.oxytocin];
  const fat = fatigueFelt - 0.45;

  const threat = sigmoid(1.4 * ne + 1.2 * cort - 1.3 * gaba - 0.8 * sht - 0.8 * oxt + 0.4 * glu - 0.6 * P - 1.0);

  out[0] = sigmoid(0.35 * sht + 0.7 * dar + 0.6 * opi + 0.5 * oxt - 1.0 * cort + 1.6 * m + 1.6 * P);
  out[1] = sigmoid(1.3 * ne + 0.9 * dar + 0.5 * glu - 0.7 * gaba + 1.4 * m - 1.6 * fat);
  out[2] = sigmoid(1.8 * dar + 0.5 * daf - 0.6 * cort + 0.9 * m + 0.8 * P);
  out[3] = sigmoid(1.7 * opi + 0.6 * dar + 0.4 * sht - 0.5 * cort + 0.5 * m + 0.5 * P);
  out[4] = sigmoid(1.5 * gaba + 0.9 * sht + 0.6 * oxt + 0.4 * opi - 1.2 * ne - 1.0 * cort - 0.5 * glu - 0.8 * m);
  out[5] = threat;
  const c = 0.65 * daf + 0.35 * ne + 0.3 * m - 0.1;
  out[6] = clamp(
    0.88 * Math.exp(-(c * c) / (2 * 0.38 * 0.38)) * (1 - 0.45 * threat) * (1 - 0.35 * Math.max(0, fat)),
    0,
    1,
  );
  out[7] = sigmoid(1.1 * glu + 0.9 * ne + 0.7 * dar - 0.9 * gaba + 1.8 * m - 0.6 * fat);
  out[8] = sigmoid(3.0 * dar - 1.6 * daf + 1.0 * Math.abs(glu) + 0.6 * m + 0.3 * ne - 2.6);
  out[9] = sigmoid(1.8 * oxt + 0.7 * opi + 0.5 * sht - 0.45 * ne - 0.6 * cort + 0.4 * P);
  out[10] = sigmoid(3.2 * (fatigueFelt - 0.55) - 0.8 * m - 0.5 * ne);
  return out;
}

// ---------------------------------------------------------------------------
// The inner voice: turns the experiential state into a sentence or two, so
// the abstraction is grounded in something you'd recognize from a Tuesday.

interface Line {
  test: (d: Float32Array) => number; // strength; > 0 means applicable
  text: string;
}

const LINES: Line[] = [
  { test: (d) => (0.32 - d[0]) * 3 + (0.32 - d[3]) * 2, text: "Everything has a grey filter on it. Things you love feel like chores you forgot you agreed to." },
  { test: (d) => (0.3 - d[2]) * 4, text: "You know what you should do. Your body just declines the meeting invite." },
  { test: (d) => (0.28 - d[3]) * 4, text: "Food tastes like cardboard. Your favorite song is just sound in a particular order." },
  { test: (d) => (d[5] - 0.62) * 4, text: "Your chest is tight and your brain keeps scanning for whatever's about to go wrong. It hasn't found it yet. It's still looking." },
  { test: (d) => (d[5] - 0.55) * 2 + (0.35 - d[4]) * 3, text: "Can't sit still. Every small noise lands like a notification you didn't ask for." },
  { test: (d) => (d[7] - 0.72) * 3 + (d[1] - 0.7) * 3, text: "Thoughts are arriving faster than you can catch them. Sleep sounds optional. Plans sound incredible." },
  { test: (d) => (d[0] - 0.75) * 4, text: "You feel bright, magnetic and slightly invincible. Everyone should hear your ideas. Right now." },
  { test: (d) => (d[8] - 0.45) * 5, text: "Random things feel loaded with meaning, like the world is leaving you clues and only you can read them." },
  { test: (d) => (0.38 - d[6]) * 3 + (d[1] - 0.5) * 2, text: "Your attention keeps sliding off the thing in front of you toward literally anything else. Ooh, a tab." },
  { test: (d) => (d[6] - 0.82) * 6, text: "Locked in. The task and you are the same shape right now." },
  { test: (d) => (d[4] - 0.7) * 3 + (d[0] - 0.55) * 2, text: "Steady. Quiet. Your body isn't asking you for anything." },
  { test: (d) => (d[9] - 0.72) * 4, text: "People feel safe right now. You want to be near them and they want you around." },
  { test: (d) => (0.28 - d[9]) * 4, text: "Other people feel far away, like you're watching them through glass." },
  { test: (d) => (d[10] - 0.72) * 4, text: "Your limbs are heavy, like someone turned gravity up a notch." },
  { test: (d) => (0.3 - d[1]) * 3 + (0.35 - d[7]) * 2, text: "Moving through syrup. Even thinking takes a running start." },
  { test: (d) => (d[4] - 0.75) * 3 + (0.35 - d[1]) * 3, text: "Muffled. Calm, sure, but the volume knob on everything is turned way down." },
  { test: (d) => (d[3] - 0.75) * 4, text: "Everything feels good in your body. A warm drink, a soft blanket, a good song, all of it hits." },
];

/**
 * @param previous  the sentence currently shown; it stays as long as its lead
 *                  line is still within reach of the best one (stickiness),
 *                  so the voice doesn't flip-flop between near-ties
 */
export function innerVoice(d: Float32Array, asleep: boolean, previous?: string): string {
  if (asleep) {
    return "Asleep. Noradrenaline goes quiet, cortisol bottoms out around midnight and then climbs toward morning, and sleep pressure drains away.";
  }
  const scored = LINES.map((l) => ({ l, s: l.test(d) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length === 0) {
    return "Nothing dramatic. Just a regular brain having a regular moment, which is also a configuration, by the way.";
  }
  if (previous) {
    const kept = scored.find((x) => previous.startsWith(x.l.text));
    if (kept && kept.s >= scored[0].s * 0.7) return previous;
  }
  const first = scored[0].l.text;
  const second = scored.find((x) => x.l !== scored[0].l && x.s > 0.15);
  return second ? `${first} ${second.l.text}` : first;
}
