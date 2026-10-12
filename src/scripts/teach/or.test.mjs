// node src/scripts/teach/or.test.mjs — every number checked against the hand-worked pages
// (which were themselves checked with scipy and Gurobi).
import assert from "node:assert/strict";
import * as O from "./or.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
const c = [40, 50], A = [[1, 2], [4, 3]];

// Product mix and its shadow prices; the labor ranges 30–80 from the page.
let r = O.lp2(c, A, [40, 120]);
assert.ok(near(r.x[0], 24) && near(r.x[1], 8) && near(r.z, 1360));
let y = O.shadow(c, A, r.x, r.tight);
assert.ok(near(y[0], 16) && near(y[1], 6));
let k = O.kkt(c, A, [40, 120], r.x, y);
assert.ok(k.primal && k.dual && near(k.cs1, 0) && near(k.cs2, 0));
// Labor below 30: only chairs, labor priced at a chair's whole profit.
r = O.lp2(c, A, [20, 120]); y = O.shadow(c, A, r.x, r.tight);
assert.ok(near(r.x[0], 20) && near(r.x[1], 0) && near(y[0], 40) && near(y[1], 0));
// Labor above 80: only tables, labor free, wood worth 50/3.
r = O.lp2(c, A, [90, 120]); y = O.shadow(c, A, r.x, r.tight);
assert.ok(near(r.x[0], 0) && near(r.x[1], 40) && near(y[0], 0) && near(y[1], 50 / 3));
// Inside the range the slope of z is the shadow price.
assert.ok(near(O.lp2(c, A, [41, 120]).z - O.lp2(c, A, [40, 120]).z, 16));
// A wrong y fails complementary slackness even when dual feasible.
k = O.kkt(c, A, [40, 120], [24, 8], [20, 6]);
assert.ok(k.dual && !near(k.cs2, 0));

// Transportation 3×2: $540, the page's plan.
const t = O.transport([[4, 6], [5, 3], [3, 7]], [50, 60, 40], [70, 80]);
assert.equal(t.z, 540);
assert.deepEqual(t.x, [[30, 20], [0, 60], [40, 0]]);

// Branch and bound: same LPs as the page, same answer.
const bb = O.branchAndBound([5, 8], [[1, 1], [5, 9]], [6, 45]);
assert.deepEqual(bb.best.x, [0, 5]);
assert.ok(near(bb.best.z, 40));
const zs = bb.nodes.map((n) => (n.z === null || n.z === undefined ? null : Math.round(n.z * 100) / 100));
assert.deepEqual(zs, [41.25, 39, 41, 40.56, 37, 40, null]);
assert.deepEqual(bb.nodes.map((n) => n.status), ["branched", "integer", "branched", "branched", "pruned", "integer", "infeasible"]);

// Gradient descent on x⁴ − 3x² + x: right start → local 1.1309, left start → global −1.3008.
const df = (x) => 4 * x ** 3 - 6 * x + 1;
assert.ok(near(O.descend(df, 1.85).at(-1), 1.1309, 1e-3));
assert.ok(near(O.descend(df, -0.5).at(-1), -1.3008, 1e-3));

// Markov: 10/11 up; 0.725 two days after a breakdown.
const m = O.twoState(0.05, 0.5);
assert.ok(near(m.up, 10 / 11) && near(m.fromDown(2), 0.725));

// Queues: M/M/1 at 3/4 and M/M/2 at 3.5/4 from the page.
let q = O.mmc(3, 4, 1);
assert.ok(near(q.L, 3) && near(q.Lq, 2.25) && near(q.W, 1) && near(q.Wq, 0.75));
q = O.mmc(3.5, 4, 2);
assert.ok(near(q.Lq, 0.20713, 1e-4) && near(q.Wq * 60, 3.5507, 1e-3) && near(q.p0, 0.391304, 1e-5));
assert.equal(O.mmc(4, 4, 1), null);
// A long simulation agrees with the formula (within noise).
const sim = O.simulate(3, 4, 1, 20000, 11);
const simWq = sim.reduce((s, x) => s + (x.start - x.arrive), 0) / sim.length;
assert.ok(Math.abs(simWq - 0.75) < 0.05, `simulated Wq ${simWq}`);

// Decision tree: EVs, EVPI and break-even from the page.
const d = O.chargerTree();
assert.ok(near(d.ev1, -103.0909, 1e-3) && near(d.ev2, 85.1952, 1e-3) && d.best === 2);
assert.ok(near(d.evpi, 46.8793, 1e-3) && near(d.breakEven, 0.117308, 1e-5));

console.log("or: all tests passed");
