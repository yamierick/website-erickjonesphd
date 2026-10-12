/**
 * A tableau simplex for small maximization LPs, max c·x s.t. A x ≤ b, x ≥ 0, b ≥ 0,
 * kept as plain data so the interactive can show every intermediate tableau.
 *
 * The point of the interactive is the link between the table and the graph: each
 * basis is a corner, and each pivot is a walk along one edge to a neighbouring
 * corner. So the engine exposes the steps a student does by hand (pick an entering
 * column, run the ratio test, pivot) rather than just solving.
 *
 * Tableau layout, one row per constraint then the objective row:
 *   columns 0..n-1 decision variables, n..n+m-1 slacks, last column the RHS.
 *   The objective row holds z − c·x = 0, so a negative entry means "entering
 *   this variable still raises z".
 */

export function init(c, A, b) {
  const m = A.length, n = c.length;
  const T = A.map((row, i) => [...row, ...Array.from({ length: m }, (_, k) => (k === i ? 1 : 0)), b[i]]);
  T.push([...c.map((v) => -v), ...Array(m).fill(0), 0]);
  return { T, basis: Array.from({ length: m }, (_, i) => n + i), n, m };
}

const EPS = 1e-9;

/** Columns whose objective-row entry is negative: entering any of them improves z. */
export function candidates(s) {
  const z = s.T[s.m];
  return z.slice(0, -1).map((v, j) => [v, j]).filter(([v]) => v < -EPS).map(([, j]) => j);
}

/** The textbook rule: the most negative objective-row entry. */
export function dantzig(s) {
  const c = candidates(s);
  return c.length ? c.reduce((a, j) => (s.T[s.m][j] < s.T[s.m][a] ? j : a)) : null;
}

/** Ratio test for entering column j: RHS / column entry where the entry is positive. */
export function ratios(s, j) {
  return s.T.slice(0, s.m).map((row) => (row[j] > EPS ? row[row.length - 1] / row[j] : null));
}

/** The row that leaves: the smallest ratio (first one on ties). null means unbounded. */
export function leaving(s, j) {
  const r = ratios(s, j);
  let best = null;
  r.forEach((v, i) => { if (v !== null && (best === null || v < r[best] - EPS)) best = i; });
  return best;
}

export function pivot(s, i, j) {
  const T = s.T.map((row) => row.slice());
  const p = T[i][j];
  T[i] = T[i].map((v) => v / p);
  for (let k = 0; k < T.length; k++) {
    if (k === i) continue;
    const f = T[k][j];
    if (Math.abs(f) > EPS) T[k] = T[k].map((v, q) => v - f * T[i][q]);
  }
  const basis = s.basis.slice();
  basis[i] = j;
  return { ...s, T, basis };
}

/** Values of the decision variables at the current basis (non-basic ones are zero). */
export function point(s) {
  const x = Array(s.n).fill(0);
  s.basis.forEach((b, i) => { if (b < s.n) x[b] = s.T[i][s.T[i].length - 1]; });
  return x;
}

export const objective = (s) => s.T[s.m][s.T[s.m].length - 1];
export const optimal = (s) => candidates(s).length === 0;
