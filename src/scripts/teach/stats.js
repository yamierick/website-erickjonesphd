/**
 * Probability and statistics for the IE 3301 interactives: distributions with
 * their means and variances, sampling, normal and t tails, a z-test's power,
 * least squares, a joint table's moments and a 2×2 factorial's effects.
 */
import { rng } from "./or.js";
export { rng };

export function lgamma(z) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let a = c[0];
  const t = z + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Standard normal cdf (Abramowitz–Stegun 7.1.26 via erf, |error| < 1.5e-7). */
export function phi(z) {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
/** Inverse standard normal cdf (Acklam's rational approximation, ~1e-9). */
export function phiInv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(p, 1 - p);
  let x;
  if (q > 0.02425) {
    const u = p - 0.5, r = u * u;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * u / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const u = Math.sqrt(-2 * Math.log(q));
  x = (((((c[0] * u + c[1]) * u + c[2]) * u + c[3]) * u + c[4]) * u + c[5]) / ((((d[0] * u + d[1]) * u + d[2]) * u + d[3]) * u + 1);
  return p < 0.5 ? x : -x;
}
export const normalPdf = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
export const tPdf = (x, v) => Math.exp(lgamma((v + 1) / 2) - lgamma(v / 2) - 0.5 * Math.log(v * Math.PI) - ((v + 1) / 2) * Math.log(1 + (x * x) / v));

/**
 * The distributions the explorer offers. Each: parameter specs, discrete or not,
 * the pmf/pdf, mean, variance, a plotting range and a sampler.
 */
export const DISTS = {
  binomial: {
    name: "Binomial", discrete: true, params: [["n", "trials n", 1, 30, 1, 10], ["p", "success chance p", 0.05, 0.95, 0.05, 0.3]],
    f: (k, { n, p }) => (k < 0 || k > n ? 0 : Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p))),
    mean: ({ n, p }) => n * p, var: ({ n, p }) => n * p * (1 - p), range: ({ n }) => [0, n],
    sample: (R, { n, p }) => { let s = 0; for (let i = 0; i < n; i++) s += R() < p; return s; },
    formula: "P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ", mv: "mean np, variance np(1 − p)",
  },
  poisson: {
    name: "Poisson", discrete: true, params: [["lambda", "rate λ", 0.5, 15, 0.5, 4]],
    f: (k, { lambda }) => (k < 0 ? 0 : Math.exp(-lambda + k * Math.log(lambda) - lgamma(k + 1))),
    mean: ({ lambda }) => lambda, var: ({ lambda }) => lambda, range: ({ lambda }) => [0, Math.ceil(lambda + 4 * Math.sqrt(lambda) + 2)],
    sample: (R, { lambda }) => { let k = 0, p = 1; const L = Math.exp(-lambda); do { k++; p *= R(); } while (p > L); return k - 1; },
    formula: "P(X = k) = e^(−λ) λᵏ / k!", mv: "mean λ, variance λ",
  },
  geometric: {
    name: "Geometric", discrete: true, params: [["p", "success chance p", 0.05, 0.95, 0.05, 0.3]],
    f: (k, { p }) => (k < 1 ? 0 : (1 - p) ** (k - 1) * p),
    mean: ({ p }) => 1 / p, var: ({ p }) => (1 - p) / p ** 2, range: ({ p }) => [1, Math.max(8, Math.ceil(1 / p + 4 * Math.sqrt(1 - p) / p))],
    sample: (R, { p }) => Math.ceil(Math.log(1 - R()) / Math.log(1 - p)) || 1,
    formula: "P(X = k) = (1 − p)ᵏ⁻¹ p, trials until the first success", mv: "mean 1/p, variance (1 − p)/p²",
  },
  uniform: {
    name: "Uniform", discrete: false, params: [["a", "low a", 0, 10, 0.5, 2], ["b", "high b", 0.5, 12, 0.5, 8]],
    f: (x, { a, b }) => (x >= a && x <= b && b > a ? 1 / (b - a) : 0),
    mean: ({ a, b }) => (a + b) / 2, var: ({ a, b }) => (b - a) ** 2 / 12, range: ({ a, b }) => [Math.min(a, b) - 1, Math.max(a, b) + 1],
    sample: (R, { a, b }) => a + (b - a) * R(),
    formula: "f(x) = 1/(b − a) for a ≤ x ≤ b", mv: "mean (a + b)/2, variance (b − a)²/12",
  },
  exponential: {
    name: "Exponential", discrete: false, params: [["mean", "mean 1/λ", 0.5, 10, 0.5, 2]],
    f: (x, { mean }) => (x < 0 ? 0 : Math.exp(-x / mean) / mean),
    mean: ({ mean }) => mean, var: ({ mean }) => mean * mean, range: ({ mean }) => [0, mean * 6],
    sample: (R, { mean }) => -mean * Math.log(1 - R()),
    formula: "f(x) = λ e^(−λx), x ≥ 0", mv: "mean 1/λ, variance 1/λ²",
  },
  normal: {
    name: "Normal", discrete: false, params: [["mu", "mean μ", -5, 5, 0.5, 0], ["sigma", "SD σ", 0.5, 4, 0.25, 1]],
    f: (x, { mu, sigma }) => normalPdf(x, mu, sigma),
    mean: ({ mu }) => mu, var: ({ sigma }) => sigma * sigma, range: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],
    sample: (R, { mu, sigma }) => mu + sigma * Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R()),
    formula: "f(x) = e^(−(x − μ)²/2σ²) / (σ√2π)", mv: "mean μ, variance σ²",
  },
  t: {
    name: "t", discrete: false, params: [["df", "degrees of freedom", 1, 30, 1, 4]],
    f: (x, { df }) => tPdf(x, df),
    mean: ({ df }) => (df > 1 ? 0 : NaN), var: ({ df }) => (df > 2 ? df / (df - 2) : Infinity), range: () => [-5, 5],
    sample: (R, { df }) => { const z = () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R()); let c = 0; for (let i = 0; i < df; i++) c += z() ** 2; return z() / Math.sqrt(c / df); },
    formula: "like the normal, with heavier tails; used when σ is estimated", mv: "mean 0, variance df/(df − 2)",
  },
};

/** CLT sources: skewed or lumpy populations whose sample means still go normal. */
export const SOURCES = {
  exponential: { name: "Exponential (skewed)", mean: 1, sd: 1, draw: (R) => -Math.log(1 - R()), range: [0, 5] },
  die: { name: "One die (flat, lumpy)", mean: 3.5, sd: Math.sqrt(35 / 12), draw: (R) => 1 + Math.floor(6 * R()), range: [0.5, 6.5] },
  defects: { name: "Defects per box (0–3)", mean: 0.75, sd: Math.sqrt(0.7875), draw: (R) => { const u = R(); return u < 0.5 ? 0 : u < 0.8 ? 1 : u < 0.95 ? 2 : 3; }, range: [-0.5, 3.5] },
};

/** Two-sided z test of H0: μ = μ0 with known σ: critical values and power at a true mean. */
export function zPower({ mu0 = 50, mu = 50.3, sigma = 0.4, n = 10, alpha = 0.05 }) {
  const se = sigma / Math.sqrt(n), zc = phiInv(1 - alpha / 2);
  const lo = mu0 - zc * se, hi = mu0 + zc * se;
  const beta = phi((hi - mu) / se) - phi((lo - mu) / se);
  return { se, zc, lo, hi, beta, power: 1 - beta };
}

export function regress(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const xb = pts.reduce((s, p) => s + p[0], 0) / n, yb = pts.reduce((s, p) => s + p[1], 0) / n;
  const Sxx = pts.reduce((s, p) => s + (p[0] - xb) ** 2, 0), Sxy = pts.reduce((s, p) => s + (p[0] - xb) * (p[1] - yb), 0);
  if (Sxx < 1e-12) return null;
  const b1 = Sxy / Sxx, b0 = yb - b1 * xb;
  const SSE = pts.reduce((s, p) => s + (p[1] - b0 - b1 * p[0]) ** 2, 0), SST = pts.reduce((s, p) => s + (p[1] - yb) ** 2, 0);
  return { n, xb, yb, Sxx, Sxy, b0, b1, SSE, SST, r2: SST > 0 ? 1 - SSE / SST : 1 };
}

/** P(T <= x) for Student's t with v degrees of freedom (Simpson's rule on the density). */
export function tCdf(x, v) {
  const a = Math.abs(x), n = 400, h = a / n;
  let s = tPdf(0, v) + tPdf(a, v);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * tPdf(i * h, v);
  return 0.5 + Math.sign(x) * (s * h) / 3;
}

/** The t quantile: the x with P(T <= x) = p (bisection). */
export function tInv(p, v) {
  let lo = -60, hi = 60;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (tCdf(mid, v) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Confidence band for the mean response and prediction band for one new
 * observation at x, from a fit made by regress():
 *   ŷ ± t·s·sqrt(1/n + (x − x̄)²/Sxx)        (the mean at x)
 *   ŷ ± t·s·sqrt(1 + 1/n + (x − x̄)²/Sxx)    (one new y at x)
 * with s² = SSE/(n − 2) and t at n − 2 degrees of freedom. null below 3 points.
 */
export function regressBand(r, x, level = 0.95) {
  if (!r || r.n < 3) return null;
  const t = tInv(1 - (1 - level) / 2, r.n - 2), s = Math.sqrt(r.SSE / (r.n - 2));
  const fit = r.b0 + r.b1 * x, lev = 1 / r.n + (x - r.xb) ** 2 / r.Sxx;
  const ci = t * s * Math.sqrt(lev), pi = t * s * Math.sqrt(1 + lev);
  return { fit, ciLo: fit - ci, ciHi: fit + ci, piLo: fit - pi, piHi: fit + pi, t, s };
}

/** Moments of a joint pmf given as a matrix p[i][j] over x-values xs and y-values ys. */
export function joint(p, xs, ys) {
  const px = p.map((r) => r.reduce((a, b) => a + b, 0)), py = ys.map((_, j) => p.reduce((s, r) => s + r[j], 0));
  const total = px.reduce((a, b) => a + b, 0);
  const EX = px.reduce((s, v, i) => s + v * xs[i], 0), EY = py.reduce((s, v, j) => s + v * ys[j], 0);
  const VX = px.reduce((s, v, i) => s + v * xs[i] ** 2, 0) - EX ** 2, VY = py.reduce((s, v, j) => s + v * ys[j] ** 2, 0) - EY ** 2;
  const EXY = p.reduce((s, r, i) => s + r.reduce((t, v, j) => t + v * xs[i] * ys[j], 0), 0);
  const cov = EXY - EX * EY, corr = VX > 1e-12 && VY > 1e-12 ? cov / Math.sqrt(VX * VY) : 0;
  const independent = p.every((r, i) => r.every((v, j) => Math.abs(v - px[i] * py[j]) < 1e-9));
  return { px, py, total, EX, EY, VX, VY, EXY, cov, corr, independent };
}

/** 2×2 factorial: yields at (A, B) = (−,−), (+,−), (−,+), (+,+). */
export function effects([y1, y2, y3, y4]) {
  const A = (y2 + y4) / 2 - (y1 + y3) / 2, B = (y3 + y4) / 2 - (y1 + y2) / 2, AB = (y1 + y4) / 2 - (y2 + y3) / 2;
  return { mean: (y1 + y2 + y3 + y4) / 4, A, B, AB };
}

/** Regularized incomplete beta I_x(a, b), by the continued fraction (Numerical Recipes 6.4). */
export function betaInc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  // The fraction converges fast below the mean; use the symmetry I_x(a,b) = 1 − I_{1−x}(b,a) above it.
  if (x > (a + 1) / (a + b + 2)) return 1 - betaInc(1 - x, b, a);
  const tiny = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < tiny ? tiny : d);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    for (const num of [(m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)), -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))]) {
      d = 1 + num * d; d = 1 / (Math.abs(d) < tiny ? tiny : d);
      c = 1 + num / c; if (Math.abs(c) < tiny) c = tiny;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-14) break;
  }
  return (front * h) / a;
}

/** P(F > f) for an F distribution with d1 and d2 degrees of freedom. */
export const fSf = (f, d1, d2) => (f <= 0 ? 1 : betaInc(d2 / (d2 + d1 * f), d2 / 2, d1 / 2));

/**
 * Balanced two-way ANOVA. cells[i][j] holds the replicate observations for level i
 * of A and level j of B (the same number n in every cell). Returns the cell,
 * row and column means, the sums of squares, degrees of freedom, mean squares,
 * F and p for A, B and AB, and s = sqrt(MSE). With one observation per cell the
 * error has no degrees of freedom, so F, p and s are null: nothing can be tested.
 * When B has three equally spaced levels, B's sum of squares is also split into a
 * linear part (contrast −1, 0, 1) and a curvature part (1, −2, 1), one df each.
 */
export function anova2(cells) {
  const a = cells.length, b = cells[0].length, n = cells[0][0].length, N = a * b * n;
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const cell = cells.map((r) => r.map(mean));
  const row = cell.map(mean), col = Array.from({ length: b }, (_, j) => mean(cell.map((r) => r[j])));
  const grand = mean(row);
  const SS = {
    A: b * n * row.reduce((s, m) => s + (m - grand) ** 2, 0),
    B: a * n * col.reduce((s, m) => s + (m - grand) ** 2, 0),
    AB: n * cell.reduce((s, r, i) => s + r.reduce((t, m, j) => t + (m - row[i] - col[j] + grand) ** 2, 0), 0),
    E: cells.reduce((s, r, i) => s + r.reduce((t, ys, j) => t + ys.reduce((u, y) => u + (y - cell[i][j]) ** 2, 0), 0), 0),
  };
  const df = { A: a - 1, B: b - 1, AB: (a - 1) * (b - 1), E: a * b * (n - 1) };
  const MSE = df.E > 0 ? SS.E / df.E : null;
  const test = (ss, d) => (MSE ? { F: ss / d / MSE, p: fSf(ss / d / MSE, d, df.E) } : { F: null, p: null });
  const out = { a, b, n, N, cell, row, col, grand, SS, df, MSE, s: MSE == null ? null : Math.sqrt(MSE) };
  for (const k of ["A", "B", "AB"]) out[k] = { ss: SS[k], df: df[k], ms: SS[k] / df[k], ...test(SS[k], df[k]) };
  if (b === 3) {
    const contrast = (c) => { const v = c.reduce((s, ci, j) => s + ci * col[j], 0), ss = (a * n * v * v) / c.reduce((s, ci) => s + ci * ci, 0); return { value: v, ss, ...test(ss, 1) }; };
    out.lin = contrast([-1, 0, 1]);
    out.curve = contrast([1, -2, 1]);
  }
  return out;
}
