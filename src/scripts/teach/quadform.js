/**
 * Two-variable quadratic forms f(x, y) = a x² + b xy + c y², for the convexity
 * explorer. The Hessian is constant, H = [[2a, b], [b, 2c]], so one classification
 * holds everywhere, which is what makes this the cleanest place to learn the checks.
 */

/** Eigen-decomposition of the symmetric 2×2 matrix [[p, q], [q, r]]: values high to low, unit vectors. */
export function eig2(p, q, r) {
  const m = (p + r) / 2, d = Math.hypot((p - r) / 2, q);
  const l1 = m + d, l2 = m - d;
  // Eigenvector for l1: (q, l1 − p), or an axis when q = 0.
  let v1 = Math.abs(q) > 1e-12 ? [q, l1 - p] : p >= r ? [1, 0] : [0, 1];
  const n = Math.hypot(...v1);
  v1 = [v1[0] / n, v1[1] / n];
  return { values: [l1, l2], vectors: [v1, [-v1[1], v1[0]]] };
}

export function hessian(a, b, c) {
  return [[2 * a, b], [b, 2 * c]];
}

/**
 * Sylvester's criterion and the eigenvalue test, both, so the page can show they agree.
 * kind: "pd" | "nd" | "psd" | "nsd" | "indefinite" | "zero"
 */
export function classify(a, b, c, tol = 1e-9) {
  const [[h11, h12], [, h22]] = hessian(a, b, c);
  const d1 = h11, d2 = h11 * h22 - h12 * h12;
  const { values } = eig2(h11, h12, h22);
  let kind;
  if (d2 < -tol) kind = "indefinite";
  else if (d2 > tol) kind = d1 > 0 ? "pd" : "nd";
  // det = 0: semidefinite; the sign comes from the diagonal (all principal minors, not just leading).
  else if (h11 > tol || h22 > tol) kind = "psd";
  else if (h11 < -tol || h22 < -tol) kind = "nsd";
  else kind = "zero";
  return { d1, d2, values, kind, convex: kind === "pd" || kind === "psd" || kind === "zero" };
}

export const KIND = {
  pd: ["positive definite", "convex: a bowl with a single lowest point"],
  nd: ["negative definite", "concave: a dome with a single highest point"],
  psd: ["positive semidefinite", "convex, but flat along one direction: a valley with a line of lowest points"],
  nsd: ["negative semidefinite", "concave, but flat along one direction: a ridge"],
  indefinite: ["indefinite", "neither convex nor concave: a saddle"],
  zero: ["zero", "flat everywhere"],
};
