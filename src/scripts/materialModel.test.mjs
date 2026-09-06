/**
 * Sanity checks for the cascade. Not a test of reality — a test that the model
 * behaves the way the page claims it does, and that the arithmetic conserves
 * what it has to conserve.
 *
 * Run: node src/scripts/materialModel.test.mjs
 */
import {
  run, DEFAULTS, MIX_TODAY, normalizeMix, capacityForEnergy, intensityOf,
} from "./materialModel.js";
import { MATERIALS, ORE, ORE_OF, CAPACITY_FACTOR, CHEMISTRY } from "./materialData.js";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

console.log("units: energy to capacity");
{
  const gw = capacityForEnergy(100, 0.24);
  check("round-trips back to the energy it came from",
    near(gw * 0.24 * 8760 / 1000, 100, 1e-12), `got ${gw.toFixed(2)} GW`);
  check("solar needs more nameplate than gas for the same TWh",
    capacityForEnergy(100, CAPACITY_FACTOR.solar.value) >
    capacityForEnergy(100, CAPACITY_FACTOR.gas.value));
  check("that ratio is the capacity-factor ratio and nothing else",
    near(capacityForEnergy(100, CAPACITY_FACTOR.solar.value) /
         capacityForEnergy(100, CAPACITY_FACTOR.gas.value),
         CAPACITY_FACTOR.gas.value / CAPACITY_FACTOR.solar.value));
}

console.log("\nchemistry");
{
  check("100% LFP storage contains no nickel", intensityOf("battery", "nickel", 1) === 0);
  check("100% LFP storage still contains lithium", intensityOf("battery", "lithium", 1) > 0);
  check("an all-NMC fleet carries the full NMC nickel figure",
    intensityOf("battery", "nickel", 0) === CHEMISTRY.NMC.nickel.qty,
    `got ${intensityOf("battery", "nickel", 0)}`);
  check("the chemistry blend is linear between the two endpoints",
    near(intensityOf("battery", "nickel", 0.5),
         0.5 * (CHEMISTRY.LFP.nickel.qty + CHEMISTRY.NMC.nickel.qty)));
  check("lithium is contained metal, not LCE (< 200 kg/MWh)",
    intensityOf("battery", "lithium", 0.5) < 200,
    `got ${intensityOf("battery", "lithium", 0.5)}`);
}

console.log("\nmix normalization");
{
  const m = normalizeMix({ gas: 2, solar: 1, wind: 1 });
  check("a mix that does not sum to one is rescaled", near(m.gas + m.solar + m.wind, 1));
  check("and keeps its proportions", near(m.gas, 0.5));
  const z = normalizeMix({ gas: 0, solar: 0, wind: 0 });
  check("an all-zero mix falls back to today rather than dividing by zero",
    near(z.gas, MIX_TODAY.gas));
}

console.log("\nflow conservation — every tonne is counted once on each layer");
{
  const r = run();
  for (const per of r.periods) {
    const tc = per.edges.filter((e) => e.layer === "tech-component")
      .reduce((s, e) => s + e.value, 0);
    const cm = per.edges.filter((e) => e.layer === "component-material")
      .reduce((s, e) => s + e.value, 0);
    check(`${per.label}: tech->component total equals component->material total`,
      near(tc, cm, 1e-9), `${tc.toFixed(3)} vs ${cm.toFixed(3)}`);
    check(`${per.label}: layer totals equal the material total`,
      near(cm, per.totalMetal, 1e-9), `${cm.toFixed(3)} vs ${per.totalMetal.toFixed(3)}`);
    const mo = per.edges.filter((e) => e.layer === "material-ore")
      .reduce((s, e) => s + e.value, 0);
    check(`${per.label}: material->ore total equals the ore total`,
      near(mo, per.totalOre, 1e-9), `${mo.toFixed(3)} vs ${per.totalOre.toFixed(3)}`);
  }
}

console.log("\nore is the second multiplier and it is large");
{
  const r = run();
  check("rock moved exceeds metal delivered by more than 10x",
    r.summary.rockPerMetal > 10, `got ${r.summary.rockPerMetal.toFixed(1)}x`);
  check("but not by more than the worst single ore ratio",
    r.summary.rockPerMetal <= Math.max(...Object.values(ORE).map((o) => o.tPerT)),
    `got ${r.summary.rockPerMetal.toFixed(1)}x`);
  for (const m of MATERIALS) {
    check(`every material has an ore: ${m}`, ORE_OF[m] in ORE);
  }
}

console.log("\nthe build is an increment, not a stock");
{
  const r = run();
  check("period 0 is flagged as the fleet already standing", r.periods[0].isExisting);
  check("and is excluded from the headline",
    r.summary.metalAhead < r.periods.reduce((s, p) => s + p.totalMetal, 0));
  const flat = run({ demandGrowth: 0, mixTarget: { ...MIX_TODAY } });
  const ahead = flat.periods.filter((p) => !p.isExisting);
  check("flat demand and an unchanged mix build nothing",
    ahead.every((p) => p.totalMetal < 1e-6),
    `got ${ahead.map((p) => p.totalMetal.toFixed(3)).join(", ")}`);
  check("no technology ever builds a negative amount",
    r.periods.every((p) => Object.values(p.builtGW).every((v) => v >= 0)));
}

console.log("\nthe mix actually moves the answer");
{
  const gassy = run({ mixTarget: { gas: 0.8, solar: 0.1, wind: 0.1 } });
  const clean = run({ mixTarget: { gas: 0.1, solar: 0.45, wind: 0.45 } });
  check("a renewables-heavy target needs more copper than a gas-heavy one",
    clean.summary.copperAhead > gassy.summary.copperAhead,
    `${Math.round(clean.summary.copperAhead)} vs ${Math.round(gassy.summary.copperAhead)} t`);
  check("and more capacity per TWh served",
    clean.summary.capacityIntensity > gassy.summary.capacityIntensity);
  check("a gas-heavy target still needs copper — the grid does not care about the mix",
    gassy.summary.copperAhead > 0);

  const lfp = run({ lfpShare: 1 });
  const nmc = run({ lfpShare: 0 });
  check("an all-LFP fleet needs no nickel from storage",
    lfp.periods.every((p) => p.byMaterial.nickel < nmc.periods[1].byMaterial.nickel));
  check("storage hours drive lithium",
    run({ storageHours: 6 }).summary.lithiumAhead >
    run({ storageHours: 1 }).summary.lithiumAhead);
  check("zero storage hours means zero lithium",
    run({ storageHours: 0 }).summary.lithiumAhead === 0);
}

console.log("\nnothing is silently nonsense");
{
  const r = run();
  check("demand grows", r.summary.finalDemandTWh > DEFAULTS.demand0);
  check("every reported number is finite",
    Object.values(r.summary).every((v) => Number.isFinite(v)),
    JSON.stringify(r.summary));
  check("no negative flows anywhere",
    r.periods.every((p) => p.edges.every((e) => e.value > 0)));
}

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
