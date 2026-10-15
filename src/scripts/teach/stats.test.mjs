// node src/scripts/teach/stats.test.mjs — against the IE 3301 page (checked with scipy.stats).
import assert from "node:assert/strict";
import * as S from "./stats.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

// Normal tails and quantiles.
assert.ok(near(1 - S.phi(2), 0.02275, 1e-5));
assert.ok(near(S.phiInv(0.975), 1.959964, 1e-6) && near(S.phiInv(0.05), -1.644854, 1e-6));
assert.ok(near(S.tPdf(0, 9), 0.388034, 1e-5));

// Each distribution's pmf/pdf sums or integrates to 1, and matches its stated mean and variance.
for (const [key, D] of Object.entries(S.DISTS)) {
  const prm = Object.fromEntries(D.params.map(([k, , , , , v]) => [k, v]));
  if (key === "t") prm.df = 6;
  let tot = 0, m = 0, m2 = 0;
  if (D.discrete) {
    for (let k = 0; k <= 400; k++) { const p = D.f(k, prm); tot += p; m += k * p; m2 += k * k * p; }
  } else {
    const [a, b] = key === "t" ? [-200, 200] : key === "exponential" ? [0, 200] : D.range(prm), h = (b - a) / 200000;
    for (let x = a + h / 2; x < b; x += h) { const p = D.f(x, prm) * h; tot += p; m += x * p; m2 += x * x * p; }
  }
  assert.ok(near(tot, 1, 2e-3), `${key} total ${tot}`);
  assert.ok(near(m, D.mean(prm), 2e-3), `${key} mean ${m}`);
  assert.ok(near(m2 - m * m, D.var(prm), 2e-2), `${key} var ${m2 - m * m}`);
  // Sampling agrees with the mean.
  const R = S.rng(3); let s = 0; const N = 40000;
  for (let i = 0; i < N; i++) s += D.sample(R, prm);
  assert.ok(Math.abs(s / N - D.mean(prm)) < 0.05 * Math.max(1, Math.abs(D.mean(prm))), `${key} sample mean ${s / N}`);
}
assert.ok(near(S.DISTS.binomial.f(3, { n: 10, p: 0.3 }), 0.266828, 1e-6));
assert.ok(near(S.DISTS.poisson.f(0, { lambda: 4 }), 0.018316, 1e-6));

// Power: at the null mean, "power" equals α.
assert.ok(near(S.zPower({ mu: 50 }).power, 0.05, 1e-6));
const pw = S.zPower({ mu0: 50, mu: 50.3, sigma: 0.4, n: 10, alpha: 0.05 });
assert.ok(near(pw.power, 0.659744, 1e-5), `power ${pw.power}`); // scipy: 0.6597440

// Regression on the reactor data.
const rx = [150, 160, 170, 180, 190, 200, 210, 220], ry = [62.1, 64.8, 66.0, 69.3, 70.1, 73.4, 74.0, 77.2];
const g = S.regress(rx.map((x, i) => [x, ry[i]]));
assert.ok(near(g.b1, 0.2079762, 1e-6) && near(g.b0, 31.136905, 1e-5) && near(g.r2, 0.986524, 1e-5));
// t quantiles and the bands, against scipy and statsmodels' get_prediction().summary_frame().
assert.ok(near(S.tInv(0.975, 6), 2.4469119, 1e-5) && near(S.tInv(0.975, 3), 3.1824463, 1e-5) && near(S.tInv(0.9, 20), 1.3253407, 1e-5));
let b = S.regressBand(g, 185);
assert.ok(near(b.fit, 69.6125, 1e-4) && near(b.ciLo, 69.056136, 1e-4) && near(b.ciHi, 70.168864, 1e-4) && near(b.piLo, 67.943408, 1e-4) && near(b.piHi, 71.281592, 1e-4));
b = S.regressBand(g, 150);
assert.ok(near(b.ciLo, 61.317556, 1e-4) && near(b.piHi, 64.206334, 1e-4));

// Joint table: covariance 0.175, correlation 0.4418, not independent.
const J = S.joint([[0.30, 0.15, 0.05], [0.10, 0.20, 0.20]], [0, 1], [0, 1, 2]);
assert.ok(near(J.cov, 0.175) && near(J.corr, 0.441836, 1e-5) && !J.independent);
assert.ok(S.joint([[0.2, 0.2, 0.1], [0.2, 0.2, 0.1]], [0, 1], [0, 1, 2]).independent);

// 2×2 factorial: A 16, B 8, AB 4, mean 70.
assert.deepEqual(S.effects([60, 72, 64, 84]), { mean: 70, A: 16, B: 8, AB: 4 });
// F and incomplete beta, against scipy.
assert.ok(near(S.betaInc(0.3, 2.5, 4), 0.3521975859, 1e-8) && near(1 - S.fSf(3.2, 2, 6), 0.8867107516, 1e-8) && near(S.fSf(6.4, 1, 4), 0.0646768940, 1e-8));
// Replicated 2×2 (cell averages 60, 72, 64, 84; two runs each), against statsmodels' anova_lm.
let av = S.anova2([[[58, 62], [63, 65]], [[70, 74], [83, 85]]]); // rows: A low, A high; columns: B low, B high
assert.ok(near(av.A.ss, 512) && near(av.B.ss, 128) && near(av.AB.ss, 32) && near(av.SS.E, 20) && av.df.E === 4);
assert.ok(near(av.A.F, 102.4) && near(av.A.p, 0.000537, 1e-5) && near(av.AB.F, 6.4) && near(av.AB.p, 0.064677, 1e-5) && near(av.s, 2.236068, 1e-5));
// Unreplicated: no error degrees of freedom, so nothing can be tested.
av = S.anova2([[[60], [64]], [[72], [84]]]);
assert.ok(av.df.E === 0 && av.s === null && av.A.p === null && near(av.A.ss, 256));
// 2×3 with two replicates, and B's linear and curvature split.
av = S.anova2([[[59, 61], [65, 69], [63, 65]], [[70, 74], [80, 82], [83, 85]]]); // B: low, mid, high
assert.ok(near(av.A.ss, 705.333333, 1e-5) && near(av.B.ss, 170.666667, 1e-5) && near(av.AB.ss, 34.666667, 1e-5) && near(av.SS.E, 24));
assert.ok(near(av.A.p, 0.000011, 1e-6) && near(av.B.F, 21.333333, 1e-5) && near(av.B.p, 0.001874, 1e-5) && near(av.AB.p, 0.068464, 1e-5));
assert.ok(near(av.lin.ss, 128) && near(av.lin.p, 0.0013107, 1e-6) && near(av.curve.ss, 42.666667, 1e-5) && near(av.curve.p, 0.01712, 1e-6));
console.log("stats: all tests passed");
