/**
 * Small SVG figures for the worked-example pages, drawn at build time.
 *
 * Every figure is computed from the same numbers the text works through, so a
 * corner, a curve or a shaded area cannot disagree with the arithmetic beside
 * it. Colours are CSS variables (see .fig in examples.css), so figures follow
 * the reader's light or dark theme. The output is a plain string for set:html.
 */

// Each figure gets its own arrowhead id, so ids stay unique on a page of many figures.
let seq = 0;
const f = (v) => (Math.round(v * 10) / 10).toString();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A plot area mapping data coordinates to an SVG viewBox. */
export function plot({ w = 520, h = 340, x: [x0, x1], y: [y0, y1], pad = [28, 16, 40, 50] }) {
  const [pt, pr, pb, pl] = pad;
  const id = `ah${++seq}`;
  const X = (x) => pl + ((x - x0) / (x1 - x0)) * (w - pl - pr);
  const Y = (y) => h - pb - ((y - y0) / (y1 - y0)) * (h - pt - pb);
  const parts = [];
  const add = (s) => (parts.push(s), api);
  const api = {
    X, Y, w, h,
    add,
    /** Axes with ticks; labels in data units. */
    axes({ xt = [], yt = [], xl = "", yl = "", grid = false, xfmt = String, yfmt = String } = {}) {
      const bx = X(x0), by = Y(y0);
      for (const v of xt) {
        if (grid) add(`<line class="grid" x1="${f(X(v))}" y1="${f(Y(y1))}" x2="${f(X(v))}" y2="${f(by)}"/>`);
        add(`<line class="axis" x1="${f(X(v))}" y1="${f(by)}" x2="${f(X(v))}" y2="${f(by + 4)}"/>`);
        add(`<text class="tick" x="${f(X(v))}" y="${f(by + 16)}" text-anchor="middle">${esc(xfmt(v))}</text>`);
      }
      for (const v of yt) {
        if (grid) add(`<line class="grid" x1="${f(bx)}" y1="${f(Y(v))}" x2="${f(X(x1))}" y2="${f(Y(v))}"/>`);
        add(`<line class="axis" x1="${f(bx - 4)}" y1="${f(Y(v))}" x2="${f(bx)}" y2="${f(Y(v))}"/>`);
        add(`<text class="tick" x="${f(bx - 7)}" y="${f(Y(v) + 4)}" text-anchor="end">${esc(yfmt(v))}</text>`);
      }
      add(`<line class="axis" x1="${f(bx)}" y1="${f(by)}" x2="${f(X(x1))}" y2="${f(by)}"/>`);
      add(`<line class="axis" x1="${f(bx)}" y1="${f(by)}" x2="${f(bx)}" y2="${f(Y(y1))}"/>`);
      if (xl) add(`<text class="lab" x="${f((bx + X(x1)) / 2)}" y="${f(h - 6)}" text-anchor="middle">${esc(xl)}</text>`);
      if (yl) add(`<text class="lab" x="12" y="${f((by + Y(y1)) / 2)}" text-anchor="middle" transform="rotate(-90 12 ${f((by + Y(y1)) / 2)})">${esc(yl)}</text>`);
      return api;
    },
    line(pts, cls = "ln", extra = "") {
      return add(`<polyline class="${cls}" ${extra} points="${pts.map(([a, b]) => `${f(X(a))},${f(Y(b))}`).join(" ")}"/>`);
    },
    area(pts, cls = "fill") {
      return add(`<polygon class="${cls}" points="${pts.map(([a, b]) => `${f(X(a))},${f(Y(b))}`).join(" ")}"/>`);
    },
    fn(g, a, b, cls = "ln", n = 200) {
      const pts = [];
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, g(x)]); }
      return api.line(pts, cls);
    },
    /** Area under g between a and b, down to y = base. */
    under(g, a, b, cls = "fill", base = 0, n = 120) {
      const pts = [[a, base]];
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, g(x)]); }
      pts.push([b, base]);
      return api.area(pts, cls);
    },
    dot(x, y, cls = "pt", r = 4) { return add(`<circle class="${cls}" cx="${f(X(x))}" cy="${f(Y(y))}" r="${r}"/>`); },
    text(x, y, s, { cls = "note", anchor = "start", dx = 0, dy = 0 } = {}) {
      return add(`<text class="${cls}" x="${f(X(x) + dx)}" y="${f(Y(y) + dy)}" text-anchor="${anchor}">${esc(s)}</text>`);
    },
    arrow(xa, ya, xb, yb, cls = "arr") {
      return add(`<line class="${cls}" x1="${f(X(xa))}" y1="${f(Y(ya))}" x2="${f(X(xb))}" y2="${f(Y(yb))}" marker-end="url(#${id})"/>`);
    },
    rect(xa, ya, xb, yb, cls = "fill") {
      const L = Math.min(X(xa), X(xb)), T = Math.min(Y(ya), Y(yb));
      return add(`<rect class="${cls}" x="${f(L)}" y="${f(T)}" width="${f(Math.abs(X(xb) - X(xa)))}" height="${f(Math.abs(Y(yb) - Y(ya)))}"/>`);
    },
    svg(label) { return svg(w, h, parts.join(""), label, id); },
  };
  return api;
}

/** Wrap drawn parts in an <svg> with an arrowhead marker and an accessible label. */
export function svg(w, h, body, label, id = "ah") {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>${body}</svg>`;
}

/** Free-form drawing in raw SVG units (diagrams: networks, trees, chains). */
export function canvas(w, h) {
  const parts = [];
  const id = `ah${++seq}`;
  const head = ` marker-end="url(#${id})"`;
  const api = {
    add(s) { parts.push(s); return api; },
    box(x, y, bw, bh, lines, cls = "node") {
      parts.push(`<rect class="${cls}" x="${f(x - bw / 2)}" y="${f(y - bh / 2)}" width="${bw}" height="${bh}" rx="6"/>`);
      const lh = 15, top = y - ((lines.length - 1) * lh) / 2 + 4;
      lines.forEach((s, i) => parts.push(`<text class="${i ? "note" : "nodet"}" x="${f(x)}" y="${f(top + i * lh)}" text-anchor="middle">${esc(s)}</text>`));
      return api;
    },
    circle(x, y, r, label, cls = "node") {
      parts.push(`<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`);
      if (label) parts.push(`<text class="nodet" x="${f(x)}" y="${f(y + 4)}" text-anchor="middle">${esc(label)}</text>`);
      return api;
    },
    /** Line from (x1,y1) to (x2,y2) trimmed by r1/r2 at the ends, with an arrowhead.
     *  `tag: true` puts the label in a small box centred on the line, `at` of the way along. */
    edge(x1, y1, x2, y2, { r1 = 0, r2 = 0, cls = "arr", label, at = 0.5, lx = 0, ly = -6, lcls = "note", arrow = true, tag = false } = {}) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
      const a = [x1 + (dx * r1) / L, y1 + (dy * r1) / L], b = [x2 - (dx * r2) / L, y2 - (dy * r2) / L];
      parts.push(`<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${arrow ? head : ""}/>`);
      if (label != null) {
        const cx = a[0] + (b[0] - a[0]) * at + (tag ? 0 : lx), cy = a[1] + (b[1] - a[1]) * at + (tag ? 0 : ly);
        if (tag) {
          const tw = String(label).length * 6.4 + 12; // rough width of 11–12px system-ui text
          parts.push(`<rect class="tagbg" x="${f(cx - tw / 2)}" y="${f(cy - 9)}" width="${f(tw)}" height="18" rx="9"/>`);
        }
        parts.push(`<text class="${lcls}" x="${f(cx)}" y="${f(tag ? cy + 4 : cy)}" text-anchor="middle">${esc(label)}</text>`);
      }
      return api;
    },
    path(dAttr, cls = "arr", arrow = true) {
      parts.push(`<path class="${cls}" d="${dAttr}"${arrow ? head : ""}/>`);
      return api;
    },
    text(x, y, s, cls = "note", anchor = "middle") {
      parts.push(`<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${esc(s)}</text>`);
      return api;
    },
    svg(label) { return svg(w, h, parts.join(""), label, id); },
  };
  return api;
}

/** Densities used by the statistics figures. */
export const normalPdf = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
function lgamma(z) {
  // Lanczos approximation, good to ~1e-13 for z > 0.
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let a = c[0];
  const t = z + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}
export const tPdf = (x, v) =>
  Math.exp(lgamma((v + 1) / 2) - lgamma(v / 2) - 0.5 * Math.log(v * Math.PI) - ((v + 1) / 2) * Math.log(1 + (x * x) / v));
export function binomPmf(k, n, p) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}
export const poissonPmf = (k, l) => Math.exp(-l + k * Math.log(l) - lgamma(k + 1));
