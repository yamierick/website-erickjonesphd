// node src/scripts/teach/quadform.test.mjs — the two worked examples on the IE 3315 page, plus edge cases.
import assert from "node:assert/strict";
import { eig2, classify } from "./quadform.js";

const near = (u, v) => Math.abs(u - v) < 1e-9;

// Example A: 2x² + 2xy + 2y², H = [[4, 2], [2, 4]]: eigenvalues 6 and 2, minors 4 and 12.
let r = classify(2, 2, 2);
assert.equal(r.kind, "pd");
assert.ok(near(r.d1, 4) && near(r.d2, 12) && near(r.values[0], 6) && near(r.values[1], 2));
const { vectors } = eig2(4, 2, 4);
assert.ok(near(Math.abs(vectors[0][0]), Math.SQRT1_2) && near(vectors[0][0], vectors[0][1])); // λ = 6 along (1, 1)

// Example B: x² + 4xy + y², H = [[2, 4], [4, 2]]: eigenvalues 6 and −2, minors 2 and −12.
r = classify(1, 4, 1);
assert.equal(r.kind, "indefinite");
assert.ok(near(r.d2, -12) && near(r.values[0], 6) && near(r.values[1], -2));

// A trap for "leading minors only": H = [[0, 0], [0, −2]] has leading minors 0 and 0, yet is not convex.
r = classify(0, 0, -1);
assert.equal(r.kind, "nsd");
assert.equal(r.convex, false);

assert.equal(classify(1, 2, 1).kind, "psd"); // (x + y)²
assert.equal(classify(-1, 0, -1).kind, "nd");
assert.equal(classify(1, 0, 3).kind, "pd");
// Eigenvectors are orthonormal and satisfy H v = λ v.
for (const [p, q, s] of [[4, 2, 4], [2, -3, 5], [0, 1, 0], [3, 0, 1]]) {
  const e = eig2(p, q, s);
  e.vectors.forEach((v, k) => {
    assert.ok(near(p * v[0] + q * v[1], e.values[k] * v[0]) && near(q * v[0] + s * v[1], e.values[k] * v[1]));
  });
  assert.ok(near(e.vectors[0][0] * e.vectors[1][0] + e.vectors[0][1] * e.vectors[1][1], 0));
}
console.log("quadform: all tests passed");
