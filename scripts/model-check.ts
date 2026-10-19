// Behavioral checks for the model. Run with: npm run check:model
//
// These assert the *qualitative* properties the project depends on, so a
// tweak to a weight or template that quietly breaks the science fails loudly.

import assert from "node:assert/strict";
import { createLocalParams, createWorld, LocalParams } from "../src/model/field";
import { buildGrid, cellToWorld } from "../src/model/grid";
import { BrainSim, FHN_BAND } from "../src/model/dynamics";
import { EXP, N_EXPERIENCE } from "../src/model/experience";
import { defaultLensSettings, LENSES, lensMargin } from "../src/model/lenses";
import { MODIFIERS } from "../src/model/modifiers";
import { findPlace, PLACES } from "../src/model/places";
import { equilibriumSignal } from "../src/model/network";
import { N_SYSTEMS } from "../src/model/systems";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}

/** Run the sim at a location and return the 2pm experience for each day. */
function simulate(p: LocalParams, days: number, schedule: (sim: BrainSim, hour: number) => void = () => {}) {
  const sim = new BrainSim(p, 9);
  const daily: Float32Array[] = [];
  for (let h = 0; h < days * 24; h++) {
    schedule(sim, h);
    sim.step(1, p);
    const s = sim.snapshot(p);
    if (Math.round(s.hourOfDay) === 14) daily.push(s.experience.slice());
  }
  return daily;
}

const mod = (id: string) => MODIFIERS.findIndex((m) => m.id === id);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

(async () => {
  for (const seed of [7, 2024]) {
    console.log(`\nworld seed ${seed}`);
    const world = createWorld(seed);
    const grid = await buildGrid(world, 32);
    const n3 = grid.n ** 3;
    const at = (pos: [number, number, number]) => world.evaluate(...pos, createLocalParams());

    check("typical is the median: each system's median signal ≈ 0", () => {
      const z = new Float32Array(N_SYSTEMS);
      const scratch = new Float32Array(N_SYSTEMS);
      const cols = Array.from({ length: N_SYSTEMS }, () => [] as number[]);
      const p = createLocalParams();
      for (let i = 0; i < 1500; i++) {
        world.evaluate((Math.random() * 2 - 1) * 240, (Math.random() * 2 - 1) * 240, (Math.random() * 2 - 1) * 240, p);
        equilibriumSignal(p.logLevel, p.logClearance, p.logSensitivity, z, scratch);
        for (let k = 0; k < N_SYSTEMS; k++) cols[k].push(z[k]);
      }
      for (const c of cols) {
        c.sort((a, b) => a - b);
        assert.ok(Math.abs(c[c.length >> 1]) < 0.08, `median ${c[c.length >> 1].toFixed(3)}`);
      }
    });

    check("every label exists somewhere, but each covers a minority of the map", () => {
      const s = defaultLensSettings();
      for (const lens of LENSES) {
        let inside = 0;
        for (let c = 0; c < n3; c++) if (lensMargin(lens, grid.experience, c * N_EXPERIENCE, s.severity, s.required[lens.id]) > 0) inside++;
        const pct = (inside / n3) * 100;
        assert.ok(pct > 0.3 && pct < 15, `${lens.id}: ${pct.toFixed(1)}%`);
      }
    });

    check("most of the map carries no label at all", () => {
      const s = defaultLensSettings();
      let none = 0;
      for (let c = 0; c < n3; c++) {
        if (!LENSES.some((l) => lensMargin(l, grid.experience, c * N_EXPERIENCE, s.severity, s.required[l.id]) > 0)) none++;
      }
      assert.ok(none / n3 > 0.7, `${((none / n3) * 100).toFixed(1)}% unlabeled`);
    });

    check("loosening the severity cutoff grows every label's territory", () => {
      for (const lens of LENSES) {
        const count = (sev: number) => {
          let k = 0;
          for (let c = 0; c < n3; c++) if (lensMargin(lens, grid.experience, c * N_EXPERIENCE, sev, lens.required) > 0) k++;
          return k;
        };
        assert.ok(count(-0.6) > count(0.6), lens.id);
      }
    });

    check("self-cycling zones exist and are a minority", () => {
      let cyc = 0;
      for (let c = 0; c < n3; c++) if (grid.drive[c] >= FHN_BAND[0] && grid.drive[c] <= FHN_BAND[1]) cyc++;
      const pct = (cyc / n3) * 100;
      assert.ok(pct > 1 && pct < 20, `${pct.toFixed(1)}%`);
    });

    check("every 'feels like' place has a close match", () => {
      for (const place of PLACES) {
        const r = findPlace(grid, place.target);
        assert.ok(r.distance < 0.2, `${place.id}: ${r.distance.toFixed(3)}`);
      }
    });

    // locate a cycling cell for the dynamics checks
    let cycCell = -1;
    for (let c = 0; c < n3 && cycCell < 0; c++) if (grid.drive[c] > 0.6 && grid.drive[c] < 1.1) cycCell = c;
    const n = grid.n;
    const cellPos = (c: number): [number, number, number] => [cellToWorld(c % n, n), cellToWorld(Math.floor(c / n) % n, n), cellToWorld(Math.floor(c / (n * n)), n)];

    check("the mood loop cycles on its own in a cycling zone (highs and crashes)", () => {
      assert.ok(cycCell >= 0, "no cycling cell found");
      const daily = simulate(at(cellPos(cycCell)), 70).map((e) => e[EXP.mood]);
      const late = daily.slice(10);
      assert.ok(Math.max(...late) - Math.min(...late) > 0.4, `mood range ${Math.min(...late).toFixed(2)}–${Math.max(...late).toFixed(2)}`);
    });

    const typical = at(findPlace(grid, PLACES.find((p) => p.id === "typical")!.target).position);

    check("a typical place does not cycle on its own", () => {
      const daily = simulate(typical, 40).map((e) => e[EXP.mood]);
      const late = daily.slice(5);
      assert.ok(Math.max(...late) - Math.min(...late) < 0.3, `mood range ${(Math.max(...late) - Math.min(...late)).toFixed(2)}`);
    });

    check("SSRI: mood keeps improving for weeks after serotonin has already risen", () => {
      const k = mod("ssri");
      const daily = simulate(typical, 42, (sim, h) => sim.setModifier(k, h >= 24)).map((e) => e[EXP.mood]);
      const week1 = mean(daily.slice(4, 8));
      const week5 = mean(daily.slice(32, 40));
      assert.ok(week5 - week1 > 0.04, `week1 ${week1.toFixed(2)} → week5 ${week5.toFixed(2)}`);
    });

    check("benzodiazepine: calm rises, tolerance erodes it, stopping rebounds below baseline", () => {
      const k = mod("benzo");
      const daily = simulate(typical, 30, (sim, h) => sim.setModifier(k, h >= 3 * 24 && h < 17 * 24)).map((e) => e[EXP.calm]);
      const baseline = mean(daily.slice(1, 3));
      const early = mean(daily.slice(4, 6));
      const late = mean(daily.slice(13, 16));
      const rebound = mean(daily.slice(18, 20));
      assert.ok(early > baseline + 0.1, `early ${early.toFixed(2)} vs baseline ${baseline.toFixed(2)}`);
      assert.ok(late < early, `tolerance: late ${late.toFixed(2)} vs early ${early.toFixed(2)}`);
      assert.ok(rebound < baseline, `rebound ${rebound.toFixed(2)} vs baseline ${baseline.toFixed(2)}`);
    });

    check("an all-nighter in an excitable zone fires an episode (a high, then a crash)", () => {
      let exc = -1;
      for (let c = 0; c < n3 && exc < 0; c++) if (grid.drive[c] > FHN_BAND[0] - 0.14 && grid.drive[c] < FHN_BAND[0] - 0.04) exc = c;
      assert.ok(exc >= 0, "no excitable cell");
      const p = at(cellPos(exc));
      const daily = simulate(p, 30, (sim, h) => h === 5 * 24 + 5 && sim.triggerEvent("allnighter")).map((e) => e[EXP.mood]);
      const before = mean(daily.slice(2, 5));
      const peak = Math.max(...daily.slice(5, 16));
      const trough = Math.min(...daily.slice(8, 26));
      assert.ok(peak > before + 0.15, `peak ${peak.toFixed(2)} vs before ${before.toFixed(2)}`);
      assert.ok(trough < before - 0.05, `crash ${trough.toFixed(2)} vs before ${before.toFixed(2)}`);
    });
  }

  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
