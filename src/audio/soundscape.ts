// The soundscape: what the current state sounds like.
//
//   drone       two detuned oscillators; threat widens the detune → beating, unease
//   brightness  low-pass filter opens with mood and pleasure, closes when flat
//   heartbeat   thump rate follows arousal, loudness follows threat
//   shimmer     high partials for pleasure; random glassy pings for aberrant salience
//   sleep       everything ducks to a low hum
//
// Pure WebAudio, no samples. Starts only after a user gesture.

export class Soundscape {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private filter!: BiquadFilterNode;
  private oscA!: OscillatorNode;
  private oscB!: OscillatorNode;
  private sub!: OscillatorNode;
  private droneGain!: GainNode;
  private shimmer!: OscillatorNode;
  private shimmerGain!: GainNode;
  private nextBeat = 0;
  private nextPing = 0;
  private running = false;

  start() {
    if (this.running) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx ?? new AC();
    this.ctx = ctx;
    ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 800;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.master);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.12;
    this.droneGain.connect(this.filter);

    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.sub = ctx.createOscillator();
    this.oscA.type = "sawtooth";
    this.oscB.type = "sawtooth";
    this.sub.type = "sine";
    this.oscA.frequency.value = 110;
    this.oscB.frequency.value = 110;
    this.sub.frequency.value = 55;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.6;
    this.oscA.connect(this.droneGain);
    this.oscB.connect(this.droneGain);
    this.sub.connect(subGain).connect(this.droneGain);

    this.shimmer = ctx.createOscillator();
    this.shimmer.type = "sine";
    this.shimmer.frequency.value = 880;
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0;
    this.shimmer.connect(this.shimmerGain).connect(this.master);

    this.oscA.start();
    this.oscB.start();
    this.sub.start();
    this.shimmer.start();
    this.nextBeat = ctx.currentTime + 0.5;
    this.nextPing = ctx.currentTime + 1;
    this.running = true;
  }

  stop() {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    const nodes = [this.oscA, this.oscB, this.sub, this.shimmer];
    setTimeout(() => nodes.forEach((n) => n.stop()), 1200);
    this.running = false;
  }

  /** exp = experience vector (see EXPERIENCE_IDS order). Call ~10×/s. */
  update(exp: Float32Array, asleep: boolean, perception: number) {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const p = perception;
    const mood = 0.5 + (exp[0] - 0.5) * p;
    const energy = 0.5 + (exp[1] - 0.5) * p;
    const pleasure = 0.5 + (exp[3] - 0.5) * p;
    const threat = 0.25 + (exp[5] - 0.25) * p;
    const thought = 0.5 + (exp[7] - 0.5) * p;
    const salience = 0.1 + (exp[8] - 0.1) * p;
    const sleepDuck = asleep ? 0.25 : 1;

    // root pitch drifts with mood (a minor sixth of range)
    const root = 82.4 * Math.pow(2, (mood - 0.5) * 0.66);
    const detuneCents = 4 + Math.max(0, threat - 0.3) * 70;
    this.oscA.frequency.setTargetAtTime(root, now, 0.6);
    this.oscB.frequency.setTargetAtTime(root * Math.pow(2, detuneCents / 1200), now, 0.6);
    this.sub.frequency.setTargetAtTime(root / 2, now, 0.6);
    this.filter.frequency.setTargetAtTime(180 + Math.pow(Math.max(0, mood * 0.6 + pleasure * 0.4), 2) * 2600 * sleepDuck, now, 0.5);
    this.filter.Q.setTargetAtTime(0.7 + Math.max(0, threat - 0.4) * 8, now, 0.5);
    this.droneGain.gain.setTargetAtTime((0.07 + energy * 0.08) * sleepDuck, now, 0.5);

    this.shimmer.frequency.setTargetAtTime(root * 8 * (1 + (thought - 0.5) * 0.25), now, 0.3);
    this.shimmerGain.gain.setTargetAtTime(Math.max(0, pleasure - 0.55) * 0.05 * sleepDuck, now, 0.6);

    // heartbeat
    const bpm = 52 + 80 * Math.min(1, Math.max(0, energy * 0.45 + threat * 0.8 - 0.2));
    const beatVol = (0.1 + Math.max(0, threat - 0.35) * 0.8) * sleepDuck;
    while (this.nextBeat < now + 0.2) {
      this.thump(this.nextBeat, beatVol);
      this.thump(this.nextBeat + 0.16, beatVol * 0.6);
      this.nextBeat += 60 / bpm;
    }
    if (this.nextBeat > now + 2) this.nextBeat = now + 0.1;

    // aberrant salience: unexpected pings
    if (salience > 0.3 && now > this.nextPing) {
      this.ping(now + 0.02, salience);
      this.nextPing = now + 0.3 + Math.random() * (2.5 - salience * 2);
    }
  }

  private thump(at: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(70, at);
    o.frequency.exponentialRampToValueAtTime(38, at + 0.12);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 0.2);
  }

  private ping(at: number, salience: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    const notes = [1, 1.189, 1.335, 1.498, 1.782, 2];
    o.frequency.value = 660 * notes[Math.floor(Math.random() * notes.length)] * (Math.random() < 0.3 ? 2 : 1);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.03 + salience * 0.05, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.2);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 1.3);
  }
}
