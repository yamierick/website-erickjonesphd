// node src/scripts/teach/simplex.test.mjs — checks the engine against the hand-worked
// product mix on /teaching/operations-research/examples/ (and scipy's answer there).
import assert from "node:assert/strict";
import * as S from "./simplex.js";

const near = (a, b) => Math.abs(a - b) < 1e-9;
const c = [40, 50], A = [[1, 2], [4, 3]], b = [40, 120];

// Largest-coefficient rule: A (0,0) → C (0,20) → D (24,8), as the page works it.
let s = S.init(c, A, b);
const path = [S.point(s)];
while (!S.optimal(s)) {
  const j = S.dantzig(s);
  s = S.pivot(s, S.leaving(s, j), j);
  path.push(S.point(s));
}
assert.deepEqual(path.map((p) => p.map((v) => Math.round(v * 1e6) / 1e6)), [[0, 0], [0, 20], [24, 8]]);
assert.ok(near(S.objective(s), 1360));
// Final objective row: shadow prices 16 and 6 under the slack columns.
assert.ok(near(s.T[2][2], 16) && near(s.T[2][3], 6));

// First step's ratio test: labor 40/2 = 20, wood 120/3 = 40.
const s0 = S.init(c, A, b);
assert.deepEqual(S.ratios(s0, 1), [20, 40]);
assert.deepEqual(S.candidates(s0), [0, 1]);

// Entering x1 first walks the other way round: A → B (30,0) → D (24,8).
s = S.init(c, A, b);
s = S.pivot(s, S.leaving(s, 0), 0);
assert.deepEqual(S.point(s), [30, 0]);
assert.ok(near(S.objective(s), 1200));
const j = S.dantzig(s);
assert.equal(j, 1);
s = S.pivot(s, S.leaving(s, j), j);
assert.ok(near(S.point(s)[0], 24) && near(S.point(s)[1], 8) && S.optimal(s));

// Unbounded: no positive entry in the entering column.
const u = S.init([1, 1], [[1, -1]], [2]);
assert.equal(S.leaving(u, 1), null);

console.log("simplex: all tests passed");
