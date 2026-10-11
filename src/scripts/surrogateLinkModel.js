/**
 * Teaching toy: two optimization models linked through a surrogate.
 *
 * Upstream, a planning model picks the cheapest way to meet a fixed demand for
 * power. Downstream, a supply-chain model picks which processors to open to
 * supply the metal that build needs. The link: upstream build x material
 * intensity = material demand D, which the downstream model must meet. The
 * upstream cost depends on a material price index p, so D(p) is a staircase:
 * the cheapest plan jumps between a few corner solutions as p moves, the way a
 * linear program's optimum jumps between vertices.
 *
 * Running the upstream model is treated as expensive, so a Gaussian-process
 * surrogate is fitted to a handful of runs and its prediction of D is handed
 * downstream instead. The page's point: the surrogate can fit D well on
 * average and still send the downstream model to the wrong decision, because
 * near a step a small error flips which processors are opened.
 *
 * Every number here is illustrative, made up for this page. Nothing comes from
 * a paper, a proposal, or real plants. No dependencies.
 */

export const PRICE = { min: 0.5, max: 2.5, today: 1 };

// Upstream corner solutions. Cost = a + 0.1 * D * p: fixed and fuel cost a,
// plus the materials in the build priced at index p. Builds are in GW, D in kt.
export const MIXES = [
  { key: "solarStorage", label: "Solar + storage", build: { solar: 150, battery: 80, gas: 0 },  a: 20 },
  { key: "solarGas",     label: "Solar + gas",     build: { solar: 90,  battery: 20, gas: 50 }, a: 53 },
  { key: "mostlyGas",    label: "Mostly gas",      build: { solar: 30,  battery: 0,  gas: 90 }, a: 92 },
  { key: "allGas",       label: "All gas",         build: { solar: 0,   battery: 0,  gas: 110 }, a: 113 },
];
// kt of metal per GW built.
export const INTENSITY = { solar: 4, battery: 3, gas: 1 };
const MAT_COST = 0.1;

export const demandOf = (mix) =>
  Object.entries(mix.build).reduce((s, [k, gw]) => s + gw * INTENSITY[k], 0);

/** The upstream model: cheapest mix at price p, and the material it needs. */
export function upstream(p) {
  let best = null;
  for (const m of MIXES) {
    const D = demandOf(m);
    const cost = m.a + MAT_COST * D * p;
    if (!best || cost < best.cost - 1e-9) best = { mix: m, D, cost };
  }
  return best;
}

/** Prices where the upstream optimum changes, with the mixes on each side. */
export function upstreamBreaks() {
  const out = [];
  const N = 2000;
  let prev = upstream(PRICE.min).mix;
  for (let i = 1; i <= N; i++) {
    const p = PRICE.min + ((PRICE.max - PRICE.min) * i) / N;
    const m = upstream(p).mix;
    if (m !== prev) {
      // Exact crossing of the two cost lines.
      const Da = demandOf(prev), Db = demandOf(m);
      const px = (m.a - prev.a) / (MAT_COST * (Da - Db));
      out.push({ p: px, from: prev, to: m });
      prev = m;
    }
  }
  return out;
}

// Downstream processors: capacity (kt), fixed cost to open, cost per kt.
export const PROCESSORS = [
  { key: "A", label: "Large refinery",  cap: 500, fixed: 40, unit: 0.05 },
  { key: "B", label: "Mid-size plant",  cap: 300, fixed: 22, unit: 0.07 },
  { key: "C", label: "Small plant",     cap: 200, fixed: 10, unit: 0.10 },
];
// Metal the opened plants cannot supply has to be bought in a hurry: a fixed
// cost for the emergency contract plus a premium per kt. The fixed part
// matters: with a per-kt price alone, falling a few kt short could cost less
// than opening the plant the plan needed, and a wrong plan would look cheaper
// than the right one.
export const SHORTFALL = { fixed: 30, perKt: 1.0 };

const SUBSETS = (() => {
  const s = [];
  for (let mask = 1; mask < 1 << PROCESSORS.length; mask++) {
    s.push(PROCESSORS.filter((_, i) => mask & (1 << i)));
  }
  return s;
})();

/** Cost of running an opened set of plants against a true demand D. */
export function operate(open, D) {
  let left = D, cost = 0;
  for (const pr of [...open].sort((a, b) => a.unit - b.unit)) {
    const q = Math.min(pr.cap, left);
    cost += pr.fixed + pr.unit * q;
    left -= q;
  }
  const short = Math.max(0, left);
  const penalty = short > 1e-9 ? SHORTFALL.fixed + SHORTFALL.perKt * short : 0;
  return { cost: cost + penalty, short };
}

/**
 * The downstream model: cheapest set of plants that can supply D. If even all
 * of them cannot (a surrogate can overshoot), it opens all and buys the rest.
 */
export function downstream(D) {
  let best = null;
  for (const open of SUBSETS) {
    const cap = open.reduce((s, p) => s + p.cap, 0);
    if (cap < D - 1e-9) continue;
    const { cost } = operate(open, D);
    if (!best || cost < best.cost - 1e-9) best = { open, cost, key: open.map((p) => p.key).join("") };
  }
  if (!best) {
    const all = SUBSETS[SUBSETS.length - 1];
    best = { open: all, cost: operate(all, D).cost, key: all.map((p) => p.key).join("") };
  }
  return best;
}

/** Demand levels where the downstream decision changes. */
export function downstreamBreaks(Dmax = 1000) {
  const out = [];
  let prev = downstream(0.01).key;
  for (let D = 1; D <= Dmax; D += 1) {
    const k = downstream(D).key;
    if (k !== prev) { out.push({ D: D - 0.5, from: prev, to: k }); prev = k; }
  }
  return out;
}

// ---------------------------------------------------------------- sampling --
/** Small seeded PRNG so a "resample" is reproducible from the URL. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-dimensional Latin hypercube: one random point in each of n strata. */
export function latinHypercube(n, seed) {
  const r = rng(seed);
  const w = (PRICE.max - PRICE.min) / n;
  return Array.from({ length: n }, (_, i) => PRICE.min + w * (i + r()));
}

// ------------------------------------------------------- Gaussian process --
const sq = (x) => x * x;

function cholesky(A) {
  const n = A.length, L = A.map(() => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) return null;
        L[i][i] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
  }
  return L;
}
const solveL = (L, b) => {
  const n = b.length, y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
  return y;
};
const solveLT = (L, y) => {
  const n = y.length, x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
  return x;
};

const NOISE = 1e-4;   // jitter, in standardized units

function fitAt(xs, z, ell) {
  const n = xs.length;
  const K = xs.map((a) => xs.map((b) => Math.exp(-sq(a - b) / (2 * sq(ell)))));
  for (let i = 0; i < n; i++) K[i][i] += NOISE;
  const L = cholesky(K);
  if (!L) return null;
  const alpha = solveLT(L, solveL(L, z));
  let logdet = 0;
  for (let i = 0; i < n; i++) logdet += Math.log(L[i][i]);
  const lml = -0.5 * z.reduce((s, v, i) => s + v * alpha[i], 0) - logdet;
  return { L, alpha, lml };
}

/**
 * Fit a zero-mean GP with a squared-exponential kernel to standardized y.
 * The length scale is chosen by maximum marginal likelihood over a grid,
 * the usual default, unless one is given.
 */
export function fitGP(xs, ys, ell = null) {
  const mu = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sd = Math.sqrt(ys.reduce((a, b) => a + sq(b - mu), 0) / ys.length) || 1;
  const z = ys.map((y) => (y - mu) / sd);
  let best = null;
  const grid = ell ? [ell] : Array.from({ length: 40 }, (_, i) => 0.05 * Math.pow(1.1, i));
  for (const e of grid) {
    const f = fitAt(xs, z, e);
    if (f && (!best || f.lml > best.lml)) best = { ...f, ell: e };
  }
  const { L, alpha } = best;
  const predict = (x) => {
    const k = xs.map((a) => Math.exp(-sq(a - x) / (2 * sq(best.ell))));
    const mean = k.reduce((s, v, i) => s + v * alpha[i], 0);
    const v = solveL(L, k);
    const varz = Math.max(0, 1 + NOISE - v.reduce((s, q) => s + q * q, 0));
    return { mean: mu + sd * mean, sd: sd * Math.sqrt(varz) };
  };
  return { predict, ell: best.ell };
}

// --------------------------------------------------------------- evaluate --
/**
 * Evaluate the linked system on a grid of prices: the true chain (upstream,
 * then downstream on the true D) against the surrogate chain (downstream on
 * the surrogate's D, then operated against the true D).
 */
export function evaluate(xs, { ell = null, points = 401 } = {}) {
  const ys = xs.map((p) => upstream(p).D);
  const gp = fitGP(xs, ys, ell);
  const rows = [];
  for (let i = 0; i < points; i++) {
    const p = PRICE.min + ((PRICE.max - PRICE.min) * i) / (points - 1);
    const up = upstream(p);
    const pred = gp.predict(p);
    const truth = downstream(up.D);
    const chosen = downstream(Math.max(0.01, pred.mean));
    const ran = operate(chosen.open, up.D);
    rows.push({
      p, D: up.D, mix: up.mix, Dhat: pred.mean, sd: pred.sd,
      truth: truth.key, chosen: chosen.key,
      regret: ran.cost - truth.cost, short: ran.short,
    });
  }
  const range = Math.max(...rows.map((r) => r.D)) - Math.min(...rows.map((r) => r.D));
  const mae = rows.reduce((s, r) => s + Math.abs(r.Dhat - r.D), 0) / rows.length;
  const ssr = rows.reduce((s, r) => s + sq(r.Dhat - r.D), 0);
  const mD = rows.reduce((s, r) => s + r.D, 0) / rows.length;
  const sst = rows.reduce((s, r) => s + sq(r.D - mD), 0);
  return {
    xs, ys, ell: gp.ell, rows,
    summary: {
      r2: 1 - ssr / sst,
      maePct: (100 * mae) / range,
      wrongPct: (100 * rows.filter((r) => r.chosen !== r.truth).length) / rows.length,
      shortPct: (100 * rows.filter((r) => r.short > 1e-6).length) / rows.length,
      meanRegret: rows.reduce((s, r) => s + r.regret, 0) / rows.length,
    },
  };
}

/**
 * Where to run the expensive model next: where the surrogate is least certain,
 * the textbook rule. Two simple decision-aware rules were tried on 2026-10-11
 * (sample only where the surrogate's downstream plan changes; sample where its
 * D is most likely to cross a downstream threshold). Over ten seeds and ten
 * added runs neither beat this one (mean wrong-plan share 25% and 27% against
 * 20%), so the page does not offer them. A rule that does is the research.
 */
export function nextRun(ev) {
  const taken = (p) => ev.xs.some((x) => Math.abs(x - p) < 0.01);
  let best = null;
  for (const r of ev.rows) {
    if (taken(r.p)) continue;
    if (!best || r.sd > best.sd) best = { p: r.p, sd: r.sd };
  }
  return best ? best.p : null;
}
