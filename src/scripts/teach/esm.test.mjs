// node src/scripts/teach/esm.test.mjs — checks against the course notebooks' own numbers.
import assert from "node:assert/strict";
import * as E from "./esm.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

// M0 (M0_Toy_LP_to_PyPSA Part A): 100 MW, solar 40 MW at $0, gas 500 MW at $22.14 -> $1,328.40, price $22.14.
let r = E.dispatch([{ name: "solar", cap: 40, cost: 0 }, { name: "gas", cap: 500, cost: 22.14 }], 100);
assert.deepEqual(r.out, [40, 60]);
assert.ok(near(r.cost, 1328.4) && near(r.price, 22.14) && r.marginal === "gas");
// Demand at or below solar: price is solar's $0; above every unit: unmet, no finite price.
assert.equal(E.dispatch([{ name: "solar", cap: 40, cost: 0 }, { name: "gas", cap: 500, cost: 22.14 }], 30).price, 0);
assert.ok(near(E.dispatch([{ name: "solar", cap: 40, cost: 0 }, { name: "gas", cap: 500, cost: 22.14 }], 40).price, 22.14));
r = E.dispatch([{ name: "solar", cap: 40, cost: 0 }, { name: "gas", cap: 500, cost: 22.14 }], 600);
assert.ok(r.unmet === 60 && r.price === Infinity);

// M1: the shapes peak at 1 within rounding, and EV energy is conserved in every mode.
for (const mode of ["evening", "night", "work"]) assert.ok(near(E.evProfile(50000, 10, mode).reduce((a, b) => a + b, 0), 500, 1e-9));
const day = E.dayLoad({ evs: 0 });
assert.ok(day.peakHour >= 17 && day.peakHour <= 20 && day.loadFactor > 0.6 && day.loadFactor < 0.95);
const evE = E.dayLoad({ evs: 60000, mode: "evening" }), evN = E.dayLoad({ evs: 60000, mode: "night" });
assert.ok(near(evE.energy, evN.energy, 1e-6) && evE.peak > evN.peak); // same energy, different peak

// M2: CRF and LCOE by hand. CRF(7%, 30) = 0.080586; solar 1300 $/kW, 20 fom, cf 0.24 -> 59.4 $/MWh.
assert.ok(near(E.crf(0.07, 30), 0.0805864, 1e-6));
const sol = E.lcoe({ capex: 1300, fom: 20, cf: 0.24 });
assert.ok(near(sol.total, (0.0805864 * 1300 + 20) * 1000 / (8760 * 0.24), 1e-3), `solar ${sol.total}`);
const gcc = E.lcoe({ capex: 1100, fom: 15, vom: 2, hr: 6600, fuel: 3.5, cf: 0.56 });
assert.ok(near(gcc.fuel, 23.1, 1e-9) && gcc.total > 40 && gcc.total < 55, `gas cc ${gcc.total}`);
// Merit order: at $3.50 gas, a combined-cycle unit (25.1) runs before coal (24.5)? No: coal first.
const f = E.fleet({ gas: 3.5, coal: 2.0 });
assert.ok(f.find((u) => u.name === "Coal").cost < f.find((u) => u.name === "Gas combined cycle").cost);
const f2 = E.fleet({ gas: 2.0, coal: 2.0 });
assert.ok(f2.find((u) => u.name === "Coal").cost > f2.find((u) => u.name === "Gas combined cycle").cost); // cheap gas reorders

// M3 (M3_PowerFlow_Companion): wind 90, gas 30; flows 70 / 50 / 20; LMPs 0 / 40 / 80; rent $8,400/h.
let t = E.triangle({});
assert.ok(near(t.w, 90) && near(t.g, 30));
assert.ok(near(t.flow.WD, 70) && near(t.flow.HD, 50) && near(t.flow.WH, 20));
assert.ok(near(t.price.W, 0, 1e-6) && near(t.price.H, 40, 1e-6) && near(t.price.D, 80, 1e-6));
assert.ok(near(t.rent, 8400, 1e-6));
// Exercise C.2: raise the limit past 80 -> wind serves all 120 and every price is $0. (At exactly 80
// the line is still binding, so the price is degenerate: $80 one way, $0 the other.)
t = E.triangle({ limit: 85 });
assert.ok(near(t.w, 120) && near(t.price.D, 0, 1e-6) && near(t.rent, 0, 1e-6));
// The transport (pipeline) model has no loop flow: wind serves all 120, Dallas pays $0.
t = E.triangle({ physics: false });
assert.ok(near(t.w, 120) && near(t.price.D, 0, 1e-6) && near(t.flow.WD, 70) && near(t.flow.WH, 50));

// M4: arbitrage charges before it discharges; materials match the /materials/ coefficients.
const a = E.arbitrage(E.PRICES, 100, 4, 0.85);
assert.ok(Math.max(...a.cheap) < Math.min(...a.dear) && a.profit > 0);
assert.deepEqual(a.cheap.slice().sort((x, y) => x - y), [11, 12, 13, 14]);
assert.deepEqual(a.dear.slice().sort((x, y) => x - y), [17, 18, 19, 20]);
const m = E.materials({ solar: 1 }, 0);
assert.ok(near(m.metal.copper, 1400 + 1400 + 200) && near(m.metal.steel, 25000 + 550) && near(m.ore.copper, 3000 * 220));
const b = E.materials({}, 1, 1); // 1 GWh, all LFP: 90 t lithium, no nickel
assert.ok(near(b.metal.lithium, 90) && near(b.metal.nickel, 0));
assert.ok(near(E.gwFor(8.76, "solar"), 1000 / 0.24 / 1000 * 1, 1e-9)); // 8.76 TWh at cf 0.24 = 4.17 GW

console.log("esm: all tests passed");

// M5: a 50 MW site barely moves the local price; a 500 MW site moves it a lot (price taker vs maker).
const small = E.facilityDay({ site: 50 }), big = E.facilityDay({ site: 500 });
assert.ok(small.avgWith - small.avgWithout < 10, `small ${small.avgWith - small.avgWithout}`);
assert.ok(big.avgWith - big.avgWithout > 30, `big ${big.avgWith - big.avgWithout}`);
assert.ok(big.cityBill - big.cityBefore > 10 * (small.cityBill - small.cityBefore));
// On-site solar never serves more than the site, and lowers what it buys.
const sun = E.facilityDay({ site: 50, onsite: 80 });
assert.ok(sun.hours.every((x) => x.own <= 50 + 1e-9) && sun.bill < small.bill && sun.solarMwh > 0);
console.log("esm M5: passed", { smallShift: +(small.avgWith - small.avgWithout).toFixed(2), bigShift: +(big.avgWith - big.avgWithout).toFixed(2) });
