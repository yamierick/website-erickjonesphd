/**
 * Small, exact solvers for the IE 3315 / 5301 interactives. Each problem is tiny
 * (two variables, or a 3×2 transportation table), so the solvers enumerate rather
 * than iterate: every answer can be checked against the hand-worked page.
 */
const EPS = 1e-9;

/**
 * max c·x over the polygon { A x ≤ b, lo ≤ x ≤ hi } in two variables, by checking
 * every vertex. Returns { x, z, tight } or null when infeasible. `tight` lists the
 * indices of the A-rows that hold with equality at the optimum.
 */
export function lp2(c, A, b, lo = [0, 0], hi = [Infinity, Infinity]) {
  const rows = A.map((a, i) => [a[0], a[1], b[i]]);
  const lines = [...rows];
  if (lo[0] > -Infinity) lines.push([-1, 0, -lo[0]]);
  if (lo[1] > -Infinity) lines.push([0, -1, -lo[1]]);
  if (hi[0] < Infinity) lines.push([1, 0, hi[0]]);
  if (hi[1] < Infinity) lines.push([0, 1, hi[1]]);
  const ok = ([x, y]) => lines.every(([p, q, r]) => p * x + q * y <= r + 1e-7);
  let best = null;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const [a1, b1, c1] = lines[i], [a2, b2, c2] = lines[j];
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < EPS) continue;
    const v = [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
    if (!ok(v)) continue;
    const z = c[0] * v[0] + c[1] * v[1];
    if (!best || z > best.z + 1e-9) best = { x: v, z };
  }
  if (!best) return null;
  best.tight = rows.map(([p, q, r], i) => (Math.abs(p * best.x[0] + q * best.x[1] - r) < 1e-7 ? i : -1)).filter((i) => i >= 0);
  return best;
}

/**
 * Shadow prices for max c·x, A x ≤ b, x ≥ 0 at an optimal x: solve the dual
 * constraints of the positive variables using only the tight rows. Two variables,
 * so at most a 2×2 system. Returns y (one per row).
 */
export function shadow(c, A, x, tight) {
  const y = A.map(() => 0);
  const pos = [0, 1].filter((j) => x[j] > 1e-7);
  if (pos.length === 2 && tight.length >= 2) {
    const [i, k] = tight;
    const det = A[i][0] * A[k][1] - A[k][0] * A[i][1];
    // Aᵀ y = c on the two tight rows.
    y[i] = (c[0] * A[k][1] - c[1] * A[k][0]) / det;
    y[k] = (A[i][0] * c[1] - A[i][1] * c[0]) / det;
  } else if (pos.length === 1 && tight.length >= 1) {
    const j = pos[0], i = tight.find((t) => A[t][j] > 0) ?? tight[0];
    y[i] = c[j] / A[i][j];
  }
  return y;
}

/** The four LP KKT lines for max c·x, A x ≤ b, x ≥ 0, as numbers the page can show. */
export function kkt(c, A, b, x, y) {
  const Ax = A.map((a) => a[0] * x[0] + a[1] * x[1]);
  const ATy = [0, 1].map((j) => A.reduce((s, a, i) => s + a[j] * y[i], 0));
  return {
    Ax, ATy,
    primal: Ax.every((v, i) => v <= b[i] + 1e-7) && x.every((v) => v >= -1e-9),
    dual: ATy.every((v, j) => v >= c[j] - 1e-7) && y.every((v) => v >= -1e-9),
    cs1: y.reduce((s, v, i) => s + v * (b[i] - Ax[i]), 0),
    cs2: x.reduce((s, v, j) => s + v * (c[j] - ATy[j]), 0),
  };
}

/** Balanced 3-supplier, 2-customer transportation problem, solved by enumerating whole-number plans. */
export function transport(cost, supply, demand) {
  let best = null;
  for (let a1 = 0; a1 <= Math.min(supply[0], demand[0]); a1++) {
    for (let a2 = 0; a2 <= Math.min(supply[1], demand[0] - a1); a2++) {
      const a3 = demand[0] - a1 - a2;
      if (a3 < 0 || a3 > supply[2]) continue;
      const x = [[a1, supply[0] - a1], [a2, supply[1] - a2], [a3, supply[2] - a3]];
      if (x.some((r) => r[1] < 0)) continue;
      const z = x.reduce((s, r, i) => s + r[0] * cost[i][0] + r[1] * cost[i][1], 0);
      if (!best || z < best.z) best = { x, z };
    }
  }
  return best;
}

/**
 * Branch and bound for max c·x, A x ≤ b, x ≥ 0 integer, in two variables. Depth-first,
 * "≤" branch first, branching on the variable with the larger fractional part.
 * Returns the nodes in the order they were solved, for stepping through.
 */
export function branchAndBound(c, A, b) {
  const nodes = [];
  let incumbent = null;
  const frac = (v) => v - Math.floor(v + 1e-9);
  function visit(lo, hi, parent, label) {
    const id = nodes.length;
    const r = lp2(c, A, b, lo, hi);
    const node = { id, parent, label, lo: lo.slice(), hi: hi.slice(), x: r && r.x, z: r && r.z };
    nodes.push(node);
    if (!r) { node.status = "infeasible"; return; }
    if (incumbent && r.z <= incumbent.z + 1e-9) { node.status = "pruned"; node.bestThen = incumbent.z; return; }
    const f = r.x.map(frac).map((v) => (v > 1e-6 && v < 1 - 1e-6 ? v : 0));
    if (f[0] === 0 && f[1] === 0) {
      node.status = "integer";
      incumbent = { x: r.x.map((v) => Math.round(v)), z: r.z, id };
      return;
    }
    const j = f[1] >= f[0] ? 1 : 0, v = r.x[j];
    node.status = "branched"; node.on = j; node.at = v;
    const hiL = hi.slice(); hiL[j] = Math.floor(v);
    visit(lo, hiL, id, `x${j + 1} ≤ ${Math.floor(v)}`);
    const loR = lo.slice(); loR[j] = Math.ceil(v);
    visit(loR, hi, id, `x${j + 1} ≥ ${Math.ceil(v)}`);
  }
  visit([0, 0], [Infinity, Infinity], null, "root");
  return { nodes, best: incumbent };
}

/** Gradient descent on a 1-D function from x0, with a fixed step, clamped to [lo, hi]. */
export function descend(df, x0, { step = 0.02, iters = 400, lo = -2, hi = 2 } = {}) {
  const path = [x0];
  let x = x0;
  for (let k = 0; k < iters; k++) {
    const nx = Math.min(hi, Math.max(lo, x - step * df(x)));
    path.push(nx);
    if (Math.abs(nx - x) < 1e-7) break;
    x = nx;
  }
  return path;
}

// ---- IE 5301 -------------------------------------------------------------

/** Two-state chain [[1−a, a], [r, 1−r]]: steady state and P(up after n days | down today). */
export function twoState(a, r) {
  const up = r / (a + r);
  return { up, down: 1 - up, fromDown: (n) => up * (1 - (1 - a - r) ** n) };
}

/** M/M/c measures (Erlang C). Rates per hour; times returned in hours. null if unstable. */
export function mmc(lambda, mu, c) {
  const a = lambda / mu, rho = a / c;
  if (rho >= 1) return null;
  let sum = 0, term = 1;
  for (let n = 0; n < c; n++) { if (n > 0) term *= a / n; sum += term; }
  const last = (term * a) / c / (1 - rho); // a^c / (c! (1 − ρ))
  const p0 = 1 / (sum + last);
  const Lq = (p0 * last * rho) / (1 - rho);
  const pWait = p0 * last;
  return { rho, p0, Lq, L: Lq + a, Wq: Lq / lambda, W: Lq / lambda + 1 / mu, pWait };
}

/**
 * M/M/c state probabilities: the long-run share of time with n cars there, for
 * n = 0..N, and the rest (more than N) as `tail`. The birth-death balance gives
 * p_n = p_0 a^n / n! while n <= c, and p_0 a^n / (c! c^(n-c)) above. null if unstable.
 */
export function mmcStates(lambda, mu, c, N = 7) {
  const q = mmc(lambda, mu, c);
  if (!q) return null;
  const a = lambda / mu, p = [];
  let term = 1; // a^n / n! up to c, then times a/c per step
  for (let n = 0; n <= N; n++) {
    if (n > 0) term *= n <= c ? a / n : a / c;
    p.push(q.p0 * term);
  }
  return { p, tail: Math.max(0, 1 - p.reduce((s, v) => s + v, 0)) };
}

/** Seeded random numbers (mulberry32), so a simulation replays the same way. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate an M/M/c queue for `hours`; returns each car's arrival, start and end times,
 * which the page animates and averages.
 */
export function simulate(lambda, mu, c, hours, seed = 7) {
  const R = rng(seed), exp = (rate) => -Math.log(1 - R()) / rate;
  const free = Array(c).fill(0), cars = [];
  for (let t = exp(lambda); t < hours; t += exp(lambda)) {
    let k = 0;
    for (let i = 1; i < c; i++) if (free[i] < free[k]) k = i;
    const start = Math.max(t, free[k]), end = start + exp(mu);
    free[k] = end;
    cars.push({ arrive: t, start, end, server: k });
  }
  return cars;
}

/** The charger decision tree: daily value of each option in each demand state. */
export function chargerTree({ pHigh = 0.4, lowRate = 2, highRate = 3.5, mu = 4, hours = 12, margin = 8, waitCost = 10, secondCost = 150, a1 = 10 / 11 } = {}) {
  const a2 = 1 - (1 - a1) ** 2;
  const leaf = (rate, c) => {
    const q = mmc(rate, mu, c);
    const rev = rate * hours * margin * (c === 1 ? a1 : a2);
    const wait = q ? waitCost * q.Lq * hours : Infinity;
    return { rev, wait, value: rev - wait - (c === 2 ? secondCost : 0), Lq: q ? q.Lq : Infinity };
  };
  const v = { oneLow: leaf(lowRate, 1), oneHigh: leaf(highRate, 1), twoLow: leaf(lowRate, 2), twoHigh: leaf(highRate, 2) };
  const ev1 = (1 - pHigh) * v.oneLow.value + pHigh * v.oneHigh.value;
  const ev2 = (1 - pHigh) * v.twoLow.value + pHigh * v.twoHigh.value;
  const perfect = (1 - pHigh) * Math.max(v.oneLow.value, v.twoLow.value) + pHigh * Math.max(v.oneHigh.value, v.twoHigh.value);
  const dLow = v.oneLow.value - v.twoLow.value, dHigh = v.twoHigh.value - v.oneHigh.value;
  return { v, ev1, ev2, best: ev2 > ev1 ? 2 : 1, evpi: perfect - Math.max(ev1, ev2), breakEven: dLow / (dLow + dHigh), a2 };
}
