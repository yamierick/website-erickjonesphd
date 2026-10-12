/**
 * Shared plumbing for the teaching interactives: number formatting, and wiring
 * range inputs (data-k="name") to a state object and their <output data-o="name">.
 * Each panel's markup carries its own inputs, so with JavaScript off the page
 * shows the static worked example instead (in its fold-out).
 */

export function fmt(v, digits = 2) {
  if (v === Infinity) return "∞";
  if (!Number.isFinite(v)) return "—";
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return (r < 0 ? "−" : "") + Math.abs(r).toLocaleString("en-US", { maximumFractionDigits: digits });
}
// Money keeps its cents ($85.20, not $85.2); whole-dollar amounts pass digits = 0.
export const money = (v, digits = 2) =>
  (v < 0 ? "−$" : "$") + (Math.round(Math.abs(v) * 10 ** digits) / 10 ** digits)
    .toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const pct = (v, digits = 1) => fmt(100 * v, digits) + "%";

/**
 * Wire every [data-k] range input in root to state[k]. `show` maps a key to a
 * formatter for its <output data-o=k>. Calls draw() on every change and once now.
 */
export function bind(root, state, draw, show = {}) {
  const out = (k) => {
    const o = root.querySelector(`[data-o="${k}"]`);
    if (o) o.textContent = (show[k] || ((v) => fmt(v)))(state[k]);
  };
  for (const inp of root.querySelectorAll("[data-k]")) {
    const k = inp.dataset.k;
    if (state[k] === undefined) state[k] = Number(inp.value);
    inp.value = String(state[k]);
    inp.addEventListener("input", () => { state[k] = Number(inp.value); out(k); draw(); });
    out(k);
  }
  const set = (k, v) => {
    state[k] = v;
    const inp = root.querySelector(`[data-k="${k}"]`);
    if (inp) inp.value = String(v);
    out(k);
  };
  draw();
  return set;
}

/** A small two-column readout table: [[label, value], ...]. */
export const readout = (rows) =>
  `<table class="num sx-stats">${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join("")}</table>`;
