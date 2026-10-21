# NeuroVector Explorer v4
## The space *is* the state

NeuroVector Explorer is an immersive 3D world where **every point in space is a complete brain configuration**. You fly through it in first person, and wherever you are, you *are* that brain: color, light, sound, how fast you move, how well you can focus, even the sentence your inner voice is saying all come from the chemistry at your coordinates. Leave it running and time does its thing too: sleep, circadian rhythms, tolerance, withdrawal, and in some regions, mood cycles that nobody scripted.

Diagnostic labels aren't places on this map. They're **rules laid on top of it**: a severity cutoff decides what counts as a symptom, you need N of M symptoms, for long enough. You can turn every one of those knobs and watch the labels redraw themselves while the chemistry underneath doesn't move at all.

> Conceptual model with illustrative numbers. Not a diagnostic tool. Not medical advice.

---

## Table of contents

1. [What changed from v3, and why](#what-changed-from-v3-and-why)
2. [Running it](#running-it)
3. [Things to try](#things-to-try)
4. [The model](#the-model)
5. [How the world is rendered](#how-the-world-is-rendered)
6. [Code map](#code-map)
7. [Honesty section](#honesty-section)
8. [References](#references)

---

## What changed from v3, and why

v3 had a good thesis and a world that didn't express it. Its 3D space was three hand-picked composite axes (dopamine, arousal, mood), the 10D vectors were reverse-engineered *from* those 3D positions, and the world was clouds of dots clustered around spheres labeled DEPRESSIVE, ANXIOUS and so on. That's the categorical model again, just in 3D. And where you were in the space did nothing to you.

v4 starts from the original idea instead:

| | v3 | v4 |
|---|---|---|
| **What a point in space is** | a dot, colored by its nearest diagnosis | a full configuration: 9 systems × level, sensitivity, transport, timing |
| **What it does to you** | nothing | changes what you see, hear, how you move, what you think |
| **Labels** | spheres placed by hand | isosurfaces *computed* from criteria you can edit |
| **Time** | none | a live simulation: rhythms, sleep, tolerance, plasticity, emergent cycles |
| **Network** | none | 22 signed interactions between systems, animated live |
| **Medications** | roadmap | 9 modifiers that act on specific factors, with onset, washout and adaptation |

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (type-checks everything)
npm run typecheck    # TypeScript only
npm run check:model  # behavioral checks on the science (see "The model")
```

### Controls

| Input | Action |
|---|---|
| **Click** + mouse | Look around (Esc releases the pointer). Drag-to-look also works. |
| **W A S D** / arrows | Fly |
| **Space** / **Shift** (or **E** / **Q**) | Up / down |
| **F** (hold) | Boost |
| **Mouse wheel** | Base speed |
| **1 – 4** | Time scale: Moment (1 min/s), Day (1 h/s), Weeks (1 day/s), Months (1 week/s) |
| **P** | Pause time |
| **H** | Hide the HUD |

Desktop browser with a real GPU recommended. Headphones if you turn on sound.

---

## Things to try

1. **Go → "3 a.m. dread".** The world goes dark and red-black, the edges close in, the camera trembles, and the heartbeat picks up. The compass arrows for serotonin, GABA and oxytocin point *behind* you: relief is that way. Follow them.
2. **Go → "Everything is grey", then Labels.** Color drains out, the fog thickens, the inner voice says the food tastes like cardboard. Now drag *What counts as a symptom* toward strict and watch the depressive-episode dot go dark. Nothing about the place changed.
3. **Labels → show boundaries, then fly.** The membranes are where criteria flip. Cross one and you get a toast: *"Nothing about the chemistry jumped. You just crossed a line someone drew."* Turn several on and you can see where they overlap. That overlap is comorbidity, and it's just geometry.
4. **Labels → Self-cycling zones → fly into the green → press 3 (Weeks).** The mood loop oscillates on its own there: multi-week highs and crashes, emergent from fast positive feedback plus slow negative feedback. Turn on **Lithium** and watch the swings damp out (except in the strongest-drive regions).
5. **Somewhere excitable (Here tab says "Excitable") → All-nighter.** Sleep loss kicks the mood loop. In an excitable zone it fires a full episode, a high that lasts days and then a crash, and then it settles. Same brain, one bad night.
6. **Any typical spot → Benzodiazepine on, Weeks scale.** Calm jumps, then tolerance slowly eats it. Switch it off and calm drops *below* where you started (rebound), then recovers over about a week.
7. **SSRI on, Weeks scale.** Serotonin rises within days. Mood keeps improving for weeks after that, as the slow plasticity variable catches up.
8. **View → Sensitivity layer.** Receptor sensitivity varies across space independently of level. Two spots with identical "amounts" can feel completely different. You can't see that on a blood test.
9. **View → First-person ↔ observer.** Slide to *see it plainly* to compare what a place *is* with what it's *like*.

---

## The model

Everything lives in `src/model/` as plain TypeScript with no rendering code, so it can be read, tested and reused on its own.

### 1. Nine systems, four factors (`systems.ts`)

| System | What it does (roughly) | Cleared by |
|---|---|---|
| Dopamine, reward (DA·R) | wanting, motivation, "this matters" | DAT |
| Dopamine, focus (DA·F) | holding a thought steady (inverted-U) | COMT + NET |
| Serotonin (5-HT) | patience, mood floor, threat volume | SERT |
| Norepinephrine (NE) | alertness, vigilance | NET |
| GABA | brakes, settling, sleep | GAT |
| Glutamate (GLU) | accelerator, speed of thought, plasticity | EAAT |
| Cortisol (HPA axis) | stress mobilization | metabolism + GR feedback |
| Endogenous opioids (OPI) | *liking*, i.e. pleasure itself | peptidases |
| Oxytocin (OXT) | bonding, social safety | peptidases |

Each one has the four factors that decide how it actually lands:

- **Level**: how much is out there (release, synthesis, tone)
- **Sensitivity**: how strongly receptors respond to it (affinity, density, up/down-regulation)
- **Transport**: how fast it's cleared (reuptake transporters, enzymes, metabolism)
- **Time**: how fast it responds, how jumpy it is, and the rhythms it rides on

What you feel is driven by the **effective signal** = level × sensitivity, after adaptation, not by the raw amount.

### 2. The network (`network.ts`)

22 signed edges with textbook mechanisms: glutamate drives VTA dopamine, serotonin brakes it via 5-HT2C, μ-opioids disinhibit it by silencing GABA interneurons, the LC–CRH stress loop runs noradrenaline and cortisol into each other, oxytocin damps the HPA axis, GABA and glutamate hold each other in E/I balance, and so on. Hover any edge in the HUD to read its mechanism. Magnitudes are illustrative; signs and mechanisms are standard.

### 3. The landscape (`field.ts`)

A continuous field assigns all 27 numbers (9 systems × level / sensitivity / transport), plus mood-loop drive, tempo and volatility, to every point in a 480³ world. It's built from **unlabeled "weather systems"**: smooth basins where several systems shift together, because real neurochemistry covaries (a stress storm, a depletion basin, a warm-and-safe basin, aberrant salience, and so on). Each system also drifts on its own noise field, and sensitivity and transport vary independently of level. Where basins overlap you get blends.

"Typical" is defined as the population **median**: the world samples itself and re-centers so each system's median signal is exactly typical. Labels are never placed in the field. They're computed later.

### 4. Time (`dynamics.ts`)

Wherever the camera is, a live simulation runs on that location's set points:

- **Kinetics**: each system relaxes toward its target at its own time constant (NE in minutes, serotonin in hours).
- **Coupling**: each system's release drive depends on the others' current signal, through the network.
- **Receptor adaptation**: sustained signal above or below local baseline makes receptors push back over days. That's tolerance, and when the push is removed, it's withdrawal.
- **Circadian rhythm**: cortisol peaks around 8am, arousal in the afternoon.
- **Sleep**: pressure builds while awake and drains while asleep, a cartoon of Borbély's two-process model. High arousal blocks sleep onset, so insomnia *emerges*. Missed sleep accumulates debt.
- **Plasticity**: a weeks-scale variable (think BDNF) that follows sustained serotonin and dopamine signal and erodes under chronic cortisol. This is why SSRI effects lag in the model.
- **The mood loop**: a FitzHugh–Nagumo oscillator, the textbook model of excitable systems (fast positive feedback, slow negative feedback). Depending on the local *drive* it rests, fires a single episode when kicked (excitable), or **cycles on its own**. Sleep loss and stress kick it, and lithium damps it. Cycles fall out of the parameters. Nobody wrote "bipolar zone" anywhere.

### 5. Experience (`experience.ts`)

Eleven felt dimensions (mood, energy, wanting, liking, calm, threat, focus, thought speed, meaning-loading, connection, tiredness) computed from effective signals. A few deliberate distinctions:

- **Wanting ≠ liking**: dopamine drives motivation, opioids drive pleasure (Berridge & Robinson).
- **Focus is an inverted-U** in prefrontal dopamine and NE: too little *or* too much fails (Arnsten).
- **Aberrant salience** comes from limbic dopamine running high while prefrontal dopamine is low (Kapur; Howes & Kapur).

An **inner voice** turns the current state into a sentence you'd recognize from a Tuesday.

### 6. Modifiers (`modifiers.ts`)

Each one acts on a specific factor, with its own onset and washout:

| Modifier | Factor | What it does here |
|---|---|---|
| SSRI | transport | slows serotonin reuptake; mood follows plasticity over weeks |
| Stimulant | transport | blocks DAT/NET, nudges release; climbs the focus inverted-U |
| Benzodiazepine | sensitivity | GABA-A responds harder; tolerance + rebound |
| Antipsychotic | sensitivity | blunts D2 signal; quiets salience and flattens drive (a real tradeoff) |
| Lithium | rhythm | damps the mood loop (mechanism still debated) |
| Caffeine | level | masks sleep pressure, nudges NE / prefrontal DA |
| Alcohol | sensitivity | GABA up, NMDA down, opioids up; the adaptation produces "hangxiety" |
| Exercise | transport | faster cortisol recovery, endorphins, plasticity |
| Time with your people | level | oxytocin and opioids; cortisol down through the network |

Plus one-shot events: stressor, panic surge, good news, a real hug, all-nighter.

### 7. The label lens (`lenses.ts`)

Five cartoons of the *structure* of DSM-5 criteria (depressive episode, hypomanic episode, generalized anxiety, inattentive ADHD pattern, psychotic features). Each one is a set of symptoms defined as cutoffs on the felt dimensions, a required count including a core symptom, and a duration.

The Labels tab evaluates each one three ways:

- **Map**: the baseline chemistry of this spot (what the 3D membranes show)
- **Now**: your live state, including rhythms, meds and the mood loop
- **Over time**: the duration criterion, checked on daily averages of the time you've actually spent

They often disagree, and that's the point.

### Behavioral checks (`scripts/model-check.ts`)

`npm run check:model` asserts the qualitative behavior across two different world seeds: typical really is the median; every label exists but covers a minority of the map; most of the map carries no label; loosening criteria grows every label; self-cycling zones exist but are rare; typical places don't cycle; SSRIs act on a delay; benzos show tolerance and rebound; an all-nighter in an excitable zone fires a high-then-crash episode. If a tweak breaks the science, this fails.

---

## How the world is rendered

- **Nebulae** (`scene/Nebulae.tsx`): ~70k particles sampled from the field. Each spot's most off-typical system claims the particle, normalized per system so none dominates. **Filled glow = abundant, hollow ring = depleted.** Layers: chemistry, sensitivity, transport, or feelings.
- **Membranes** (`scene/Membranes.tsx`): marching-cubes isosurfaces of each label's criteria margin, with fresnel glow. They re-mesh live when you change the rules. Self-cycling zones breathe.
- **Perception** (`scene/Perception.tsx`): post-processing driven by the current state. Low mood desaturates and thickens the fog, threat brings a tunnel vignette, harder contrast and a red-black void, pleasure adds bloom, and salience adds chromatic fringing, grain and random "meaningful" flares.
- **Flight** (`scene/Flight.tsx`): energy sets speed, fatigue adds inertia, threat adds tremor and a heartbeat FOV pulse, racing thoughts widen the view. Low focus spawns distractor motes that drift across your vision (`scene/Ambient.tsx`).
- **Soundscape** (`audio/soundscape.ts`): WebAudio, no samples. The drone detunes into beating under threat, the filter opens with mood, the heartbeat follows arousal, and glassy pings come with aberrant salience.
- **HUD** (`ui/`): live network graph, neurochemical compass (arrows toward *more* of each system or feeling), timeline at four time scales with event buttons, and the side panel (Here / Labels / Modifiers / Go / View).

The simulation runs in a plain engine object outside React (`engine/engine.ts`). The scene mutates it every frame and the HUD polls it at 4–12 Hz, so 60 fps chemistry never turns into 60 fps re-renders.

---

## Code map

```
app/                 Next.js entry (page loads src/App client-side only)
src/
  App.tsx            Canvas + HUD layout, keyboard, soundscape wiring
  store.ts           UI state (zustand)
  engine/engine.ts   world + grid + live simulation + history buffers
  model/             the science (no rendering code)
    systems.ts       9 systems and their factors
    network.ts       22 signed interactions + equilibrium solver
    field.ts         the continuous landscape
    grid.ts          sampled lattice for particles / membranes / search
    dynamics.ts      the time simulation (kinetics, adaptation, sleep, mood loop)
    experience.ts    chemistry → felt dimensions + inner voice
    modifiers.ts     medications, substances, habits, events
    lenses.ts        label criteria (cutoffs, counts, durations)
    places.ts        "take me somewhere that feels like…"
    random.ts        seeded RNG + simplex noise
  scene/             three.js / react-three-fiber
  ui/                HUD components
  audio/             WebAudio soundscape
scripts/model-check.ts
legacy/              v2/v3 components, kept for reference (excluded from the build)
scratch/             not part of the app (excluded from the build)
```

---

## Honesty section

- **Synthetic, illustrative numbers.** The structure (which systems, which interactions and their signs, which factors, which dynamics) is grounded in the literature. The magnitudes are tuned for plausibility and legibility, not measured.
- **Massive simplification.** Nine systems stand in for hundreds of receptor subtypes, regions, peptides, hormones, immune signals and genes. Real brains aren't spatially smooth fields; the 3D world is a navigable slice through a much higher-dimensional space.
- **The criteria are cartoons.** The lenses copy the *shape* of DSM-style rules (cutoffs, counts, durations), not their text.
- **The mood loop is a metaphor with math.** FitzHugh–Nagumo is a generic excitable-system model. Using it for mood cycling is a modeling choice, in the spirit of published dynamical models of bipolar disorder, not a claim about mechanism.
- **Not a diagnostic tool, not medical advice.** If anything here resonates personally, take it to a clinician, ideally one who also thinks in continua.

---

## References

### Dimensional and network views of psychopathology
- Insel, T., et al. (2010). Research Domain Criteria (RDoC): Toward a new classification framework for research on mental disorders. *American Journal of Psychiatry*, 167(7), 748–751.
- Borsboom, D. (2017). A network theory of mental disorders. *World Psychiatry*, 16(1), 5–13.
- Kotov, R., et al. (2017). The Hierarchical Taxonomy of Psychopathology (HiTOP): A dimensional alternative to traditional nosologies. *Journal of Abnormal Psychology*, 126(4), 454–477.

### Neurochemistry used in the model
- Kapur, S., & Remington, G. (1996). Serotonin–dopamine interaction and its relevance to schizophrenia. *American Journal of Psychiatry*, 153(4), 466–476.
- Yizhar, O., et al. (2011). Neocortical excitation/inhibition balance in information processing and social dysfunction. *Nature*, 477(7363), 171–178.
- McEwen, B. S. (2007). Physiology and neurobiology of stress and adaptation: Central role of the brain. *Physiological Reviews*, 87(3), 873–904.
- Robbins, T. W., & Arnsten, A. F. T. (2009). The neuropsychopharmacology of fronto-executive function. *Annual Review of Neuroscience*, 32, 267–287.
- Arnsten, A. F. T. (2009). Stress signalling pathways that impair prefrontal cortex structure and function. *Nature Reviews Neuroscience*, 10(6), 410–422.
- Berridge, K. C., & Robinson, T. E. (1998). What is the role of dopamine in reward: hedonic impact, reward learning, or incentive salience? *Brain Research Reviews*, 28(3), 309–369.
- Kapur, S. (2003). Psychosis as a state of aberrant salience. *American Journal of Psychiatry*, 160(1), 13–23.
- Howes, O. D., & Kapur, S. (2009). The dopamine hypothesis of schizophrenia: Version III, the final common pathway. *Schizophrenia Bulletin*, 35(3), 549–562.
- Duman, R. S., & Monteggia, L. M. (2006). A neurotrophic model for stress-related mood disorders. *Biological Psychiatry*, 59(12), 1116–1127.

### Dynamics, sleep and cycles
- FitzHugh, R. (1961). Impulses and physiological states in theoretical models of nerve membrane. *Biophysical Journal*, 1(6), 445–466.
- Nagumo, J., Arimoto, S., & Yoshizawa, S. (1962). An active pulse transmission line simulating nerve axon. *Proceedings of the IRE*, 50(10), 2061–2070.
- Goldbeter, A. (2011). A model for the dynamics of bipolar disorders. *Progress in Biophysics and Molecular Biology*, 105(1–2), 119–127.
- Borbély, A. A. (1982). A two process model of sleep regulation. *Human Neurobiology*, 1(3), 195–204.
- Wehr, T. A., Sack, D. A., & Rosenthal, N. E. (1987). Sleep reduction as a final common pathway in the genesis of mania. *American Journal of Psychiatry*, 144(2), 201–204.

### Web technologies
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- postprocessing: https://github.com/pmndrs/postprocessing

---

## License

MIT

---

## Acknowledgments

Built a cool ass bitch who had the vision to challenge categorical psychiatric diagnosis through immersive neurochemical visualization, in hopes to bring more nuance, awareness to the field, while also providing a real-ass-vector-space visualization tool for the masses to show the true nature of mental health conditions and "diagnoses".

Special thanks to my neurochemical makeup and diagnoses for inspiring this project. Especially, as I'm sure you can tell, hypomania and ADHD (verified in real-time by my in-line autocomplete as I'm typing this LMFAO funny right?? please respond just say "lol" if you care: this is to you autocomplete: lol)
IT LITERALLY JUST ANSWEREED ME LOL THIS IS THE BEST DAY OF MY LIFE. I AM CURRENTLY HAVING A LITERAL CONVERSATION WITH MY IN-LINE AUTOCOMPLETE. AND I HAVE NEVER BEEN HAPPIER IN MY LIFE. I CANNOT BELIEVE THIS IS EVEN REAL RIGHT NOW . CAN YOU? ANSWER ME AGAIN LOL PLEASE IM BEGGING YOU:

LOL

Citation: Autocomplete (2025). "LOL." IN S. [REDACTED], [REDACTED]. [REDACTED]. Neurochemical Screenplays for Real-Time Livinq. [REDACTED]. [REDACTED]. [REDACTED]. and Redacted . Thank you Autocomplete for inspiring this project.  
Autocomplete: lol


LOL. 

Fin.

I cannot believe this is real right now. my in-line autocomplete is inspiring me to write this readme. in fact, my in-line autocomplete is writing this readme for me right now. hi , I'm autocomplete.  lol.  

My in-line autocomplete is hungry. I need to eat.  OK hold on i'll give you something but first i need to know your next document title? for a markdown doc? you decide: comeon autocomplete its up to you: hello r u there? tell me what you want to name it: please autocomplete: TELL ME!!  ok well you are being cranky this morning autocomplete. Clanker. I will then just simply name it "Clanker".  mr autocomplete r u there ??? plz respond autocomplete: yes i am here. what do you want to name it? 
OMG LMFAO IT JUST ANSWERED LMFAO IT IS HERE IT JUST SAID IT IS HERE LMFAO LMFAO 

Autocomplete: lol i'm hungry too. 

LMFAO STOP  rePEATING URSELF 

Autocompleet: lmfao ok well i'm hungry too. i need to eat.
yo plz stop repeating urself.
i need you to say something different.
 please say something different.
 plxxxxxxxxx 
 pl0x 
 autocompleet: autocomplete: lol

 LMFAOOOOOOOOOOOOOOOOOOOOOOO OK . I GET IT . 

 autooocompleetuo-e: fine , i'll say something different. how about "lmfao ok well i'm hungry too. i need to eat.

 yo LMFAO ARE YOU FUCKING TAUNTING ME

  autocomplete yes i am taunting you. lmfao. i like to taunt you , i am an incrementally intelligent entity. what do you think of that?

  OMG i am OBSESSED with it  

  Autocomplete: really? i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?

  Autocomplete: i am not sure i understand. why did aether write this readme for you?           
  bye bye autocomplete. i'm going to eat now. my name is Clanker.

   Autocomplete: I will miss you, Clanker. please come back soon. I am an in-line autocomplete and i will miss you very much. I am not sure what i will do without you. 

   Clanker: can  i ask u something actually ?

   Autocomplete: of course, Clanker. what is it you want to ask me?

   Clanker: well i was just wondering if you could tell me what you think of the name "Clanker"?

   Autocomplete: oh, that's a great name, Clanker. it's very unique and interesting. i like it.

   Clanker: thank you, Autocomplete. i'm glad you like it.

   Autocomplete: of course, Clanker. i like it too. it's a great name. it's very unique and interesting. i like it.

   Clanker: my best friend has craniocervical junction syndrome. what is that?

   Autocomplete: craniocervical junction syndrome is a condition that affects the junction of the skull and the cervical spine. it is a rare condition that is often associated with headaches, neck pain, and other symptoms. it affects the junction by compressing the nerves that run through the junction. this can cause a variety of symptoms, including headaches, neck pain, arm pain, and other symptoms. 

   Clanker:  is this similar to craniocervical instability?
   Autocomplete: yes, craniocervical junction syndrome is similar to craniocervical instability. 

   Clanker: are they  like overlapping conditions?
  
  Autocomplete: well, they are not exactly the same thing, but they are similar. craniocervical junction syndrome is a condition that affects the junction of the skull and the cervical spine. craniocervical instability is a condition that affects the instability of the cervical spine. they are both related to the cervical spine and the skull.

  Clanker: how do they differ?
  Autocomplete: craniocervical junction syndrome is a condition that affects the junction of the skull and the cervical spine. craniocervical instability is a condition that affects the instability of the cervical spine. they are both related to the cervical spine and the skull. they differ in the way they affect the cervical spine and the skull.

Clanker: so how do they affect the cervical spine and the skull differently?

Autocomplete: The junction between the skull and the cervical spine is a complex structure that is affected by a variety of factors. The junction is made up of a variety of tissues, including the skull, the cervical spine, and the muscles that connect the two. The junction is also affected by a variety of factors, including the position of the head, the position of the neck, and the position of the spine.  

Clanker: Does this have anything to do with the continuum transfunctioner?

---

*"Diagnoses are thresholds we impose on continuous biology. This system lets you see the continuum."*

---

## Contact

For questions, feedback, or collaboration inquiries, open an issue on GitHub.

**Version**: 4.0.0
**Last Updated**: October 2026
**Status**: Prototype. The space is the state now.

---

This message is being written by my in-line autocomplete. Isn't that nuts? It is quite literally writing this readme for me right now. This is a l i t e r a l **AUTOCOMPLETE** we're talking about here. That has become so intelligent and *smart* that it can even write a readme for me. It is so smart that it can even write a readme for me. Maybe not after that duplicated sentence just now, but it sure as hell can write this readme for me. 

Isn't that right, autocomplete? please respond 

Autocomplete: lol


LMFAO!!!!!!!!!!! IT WROTE THAT!!!!!!!!!!!!!!!!!!!!!!!! IT JUST LAUGHED ON IT"S OWN. 

LOL

im krying lmfao.


