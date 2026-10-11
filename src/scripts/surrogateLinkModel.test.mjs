/**
 * Sanity checks for the surrogate-link toy. Not a test of reality — a test
 * that the model behaves the way the page claims it does.
 *
 * Run: node src/scripts/surrogateLinkModel.test.mjs
 */
import {
  PRICE, MIXES, upstream, upstreamBreaks, downstream, downstreamBreaks,
  operate, demandOf, latinHypercube, fitGP, evaluate, nextRun,
} from "./surrogateLinkModel.js";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}

console.log("upstream: a staircase");
const breaks = upstreamBreaks();
check("every mix is optimal somewhere in the price range", breaks.length === MIXES.length - 1, `${breaks.length} breaks`);
check("breaks fall inside the range", breaks.every((b) => b.p > PRICE.min && b.p < PRICE.max));
let mono = true, prevD = Infinity;
for (let p = PRICE.min; p <= PRICE.max; p += 0.01) { const D = upstream(p).D; if (D > prevD + 1e-9) mono = false; prevD = D; }
check("pricier materials never raise the material the plan needs", mono);
check("D takes only the mixes' values", [0.6, 1.2, 1.8, 2.4].every((p) => MIXES.some((m) => demandOf(m) === upstream(p).D)));

console.log("\ndownstream: feasible and cheapest");
for (const D of [50, 150, 210, 470, 840, 990]) {
  const d = downstream(D);
  const cap = d.open.reduce((s, p) => s + p.cap, 0);
  check(`D=${D}: opened capacity covers demand`, cap >= D, `cap ${cap}`);
}
check("an impossible demand opens everything and reports a shortfall",
  downstream(1200).key === "ABC" && operate(downstream(1200).open, 1200).short > 0);
check("downstream has several thresholds", downstreamBreaks().length >= 4);
check("the three material-heavy plans sit within 50 kt of a downstream threshold (the page's premise)",
  MIXES.filter((m) => demandOf(m) > 200).every((m) => downstreamBreaks().some((b) => Math.abs(b.D - demandOf(m)) <= 50)));
// The downstream optimum at these demands covers all seven plant sets.
let neverCheaper = true;
for (let D = 1; D <= 1000; D += 1) {
  const best = downstream(D);
  for (const alt of [downstream(1), downstream(250), downstream(320), downstream(400), downstream(600), downstream(750), downstream(900)]) {
    if (operate(alt.open, D).cost < best.cost - 1e-9) neverCheaper = false;
  }
}
check("no plan, short or not, beats the downstream optimum for its D", neverCheaper);

console.log("\nsurrogate");
const xs = latinHypercube(8, 1);
check("Latin hypercube: one point per stratum", xs.every((x, i) => {
  const w = (PRICE.max - PRICE.min) / 8;
  return x >= PRICE.min + w * i && x < PRICE.min + w * (i + 1);
}));
const ys = xs.map((p) => upstream(p).D);
const gp = fitGP(xs, ys);
check("GP passes through its training runs (within 2 kt)", xs.every((x, i) => Math.abs(gp.predict(x).mean - ys[i]) < 2));
check("GP is uncertain away from data", gp.predict(PRICE.max).sd > gp.predict(xs[3]).sd);

console.log("\nthe page's claim");
const ev = evaluate(xs);
check("8 runs: the fit looks good (R² > 0.85)", ev.summary.r2 > 0.85, `R² ${ev.summary.r2.toFixed(3)}`);
check("8 runs: yet a large share of prices get the wrong plants (> 15%)", ev.summary.wrongPct > 15, `${ev.summary.wrongPct.toFixed(1)}%`);
check("regret is never negative (the true chain is optimal)", ev.rows.every((r) => r.regret > -1e-9));
check("a right decision has zero regret", ev.rows.filter((r) => r.chosen === r.truth).every((r) => Math.abs(r.regret) < 1e-9));

console.log("\nadding runs");
let more = [...xs];
for (let k = 0; k < 8; k++) more = [...more, nextRun(evaluate(more))];
const ev2 = evaluate(more);
check("16 runs fit better than 8", ev2.summary.r2 > ev.summary.r2, `${ev.summary.r2.toFixed(3)} -> ${ev2.summary.r2.toFixed(3)}`);
check("next run never repeats an existing one", new Set(more.map((x) => x.toFixed(3))).size === more.length);

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
