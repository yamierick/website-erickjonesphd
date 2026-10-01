// DOM + SVG rendering and event wiring. All numbers come from model.js / data.js.
import { BUILD_YEARS, NET_SETUP, DOE, FEED_G, P_UNIT } from "./data.js";
import {
  networkView, grindView, doeView, parseState, serializeState, DEFAULTS, nonHazGap,
} from "./model.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const state = { ...DEFAULTS };

// ------------------------------------------------------------------ helpers
function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function tip(node, text) { node.appendChild(el("title", {}, text)); return node; }
function begin(svg, height) {
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width || svg.parentNode.clientWidth || 640));
  [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title") svg.removeChild(c); });
  svg.setAttribute("viewBox", `0 0 ${W} ${height}`);
  return W;
}
const fmt = (v, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const narrow = (W) => W < 520;
function readout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v, sub] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    if (String(v).length > 14) dd.className = "text";
    if (sub) { const s = document.createElement("small"); s.textContent = sub; dd.appendChild(s); }
    d.append(dt, dd); dl.appendChild(d);
  }
}
function segSync(id, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    const on = b.dataset.v === String(value);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
const PART_COLOR = { libFreight: "var(--c2)", bmFreight: "var(--c3)", bmProd: "var(--c1)", recycling: "var(--c4)", infra: "var(--c5)" };

// ------------------------------------------------------------------ panel 1
function box(svg, x, y, w, h, title, sub, strong) {
  svg.appendChild(el("rect", { x, y, width: w, height: h, rx: 6, fill: "var(--code-bg)",
    stroke: strong ? "var(--accent)" : "var(--rule)", "stroke-width": strong ? 2 : 1 }));
  svg.appendChild(el("text", { x: x + w / 2, y: y + (sub ? 19 : h / 2 + 5), "text-anchor": "middle", "font-size": 13, class: "strong" }, title));
  if (sub) svg.appendChild(el("text", { x: x + w / 2, y: y + 36, "text-anchor": "middle", "font-size": 11 }, sub));
}
function arrow(svg, x, y1, y2, color, width, label, sub, hazard) {
  svg.appendChild(el("line", { x1: x, x2: x, y1, y2: y2 - 7, stroke: color, "stroke-width": width,
    "stroke-dasharray": hazard ? "none" : "none" }));
  svg.appendChild(el("path", { d: `M ${x - 7} ${y2 - 9} L ${x} ${y2} L ${x + 7} ${y2 - 9} Z`, fill: color }));
  svg.appendChild(el("text", { x: x + width / 2 + 12, y: (y1 + y2) / 2 - 2, "font-size": 12, class: "strong" }, label));
  if (sub) svg.appendChild(el("text", { x: x + width / 2 + 12, y: (y1 + y2) / 2 + 13, "font-size": 11 }, sub));
}

function drawFlow(v) {
  const svg = $("#flow-chart");
  const cen = v.net === "cen";
  const H = cen ? 360 : 262;
  const W = begin(svg, H);
  const bw = Math.min(250, W * 0.5), bh = 46, x = narrow(W) ? 4 : 24, cx = x + bw * 0.3;
  const setup = NET_SETUP;
  let y = 4;
  box(svg, x, y, bw, bh, "Spent batteries", `${setup.states} states, +${setup.growthPerYear}% a year`);
  arrow(svg, cx, y + bh, y + bh + 50, "var(--c4)", 6, `${fmt(v.flows.batteriesMt, 1)} Mt of batteries`, "to the nearest collection center");
  y += bh + 50;
  if (cen) {
    box(svg, x, y, bw, bh, "Collection centers", "a holding stop only");
    arrow(svg, cx, y + bh, y + bh + 58, "var(--c2)", 14, `${fmt(v.flows.batteriesMt, 1)} Mt, hazardous freight`,
      v.ordinaryFreight ? "what-if: shipped as ordinary freight" : "$59.6 bn to haul, 1.05 Mt CO₂e");
    y += bh + 58;
    box(svg, x, y, bw, bh, "10 black-mass plants", "100,000 t each", true);
  } else {
    box(svg, x, y, bw, bh, "Collection centers", "each grinds its own: 1,000-t modules", true);
  }
  arrow(svg, cx, y + bh, y + bh + 52, "var(--c3)", 5, `${fmt(v.flows.blackMassMt, 2)} Mt of black mass`,
    cen ? "$0.32 bn to haul, 0.35 Mt CO₂e" : "$0.32 bn to haul, 0.88 Mt CO₂e");
  y += bh + 52;
  box(svg, x, y, bw, bh, `${setup.recyclers} recycling hubs`, "recover the metals");
}

function stackChart(svg, rows, sel, unit, digits, max) {
  const rowH = 44, T = 6, B = 22;
  const H = T + rows.length * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? 92 : 150, R = 62;
  const x = (val) => L + (val / max) * (W - L - R);
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const on = r.key === sel;
    const g = el("g", { opacity: on ? 1 : 0.45 });
    g.appendChild(el("text", { x: L - 8, y: y + 20, "text-anchor": "end", "font-size": 12, class: on ? "strong" : "" }, r.label));
    if (r.sub) g.appendChild(el("text", { x: L - 8, y: y + 34, "text-anchor": "end", "font-size": 10 }, r.sub));
    if (r.parts) {
      let acc = 0;
      for (const p of r.parts) {
        if (p.value <= 0) continue;
        g.appendChild(tip(el("rect", { x: x(acc), y: y + 6, width: Math.max(1, x(acc + p.value) - x(acc)), height: 24,
          fill: PART_COLOR[p.key], opacity: 0.85 }), `${p.label}: ${fmt(p.value, p.value < 1 ? 2 : 1)} ${unit}`));
        acc += p.value;
      }
    } else {
      g.appendChild(tip(el("rect", { x: L, y: y + 6, width: x(r.total) - L, height: 24, fill: "none",
        stroke: "var(--text)", "stroke-dasharray": "4 3" }), `${r.label}: ${fmt(r.total, 1)} ${unit} (only the total is published)`));
    }
    g.appendChild(el("text", { x: x(r.total) + 5, y: y + 22, "font-size": 12, class: on ? "strong" : "" }, fmt(r.total, digits)));
    svg.appendChild(g);
  });
  for (let t = 0; t <= max; t += max > 50 ? 50 : 5) {
    svg.appendChild(el("text", { x: x(t), y: H - 6, "text-anchor": "middle", "font-size": 10.5 }, fmt(t)));
  }
}

function renderP1() {
  const v = networkView(state.n, !!state.f);
  segSync("net", state.n);
  $("#freight").checked = !!state.f;
  drawFlow(v);
  const rows = [
    { key: "cen", label: "Centralized", sub: "10 plants", parts: v.cost.cen, total: v.totals.cen },
    { key: "dec", label: "Decentralized", sub: "48 states", parts: v.cost.dec, total: v.totals.dec },
  ];
  if (state.f) rows.splice(1, 0, { key: "cen", label: "Centralized*", sub: "ordinary freight", total: v.nonHazCen });
  stackChart($("#cost-chart"), rows, state.n, "USD bn", 1, 150);
  const legend = $("#cost-legend");
  legend.innerHTML = "";
  for (const p of v.cost.cen) {
    const s = document.createElement("span");
    s.innerHTML = `<i class="sw" style="background:${PART_COLOR[p.key]}"></i>`;
    s.append(p.label);
    legend.appendChild(s);
  }
  if (state.f) {
    const s = document.createElement("span");
    s.textContent = "* dashed: the paper's what-if; only its total is published";
    legend.appendChild(s);
  }
  stackChart($("#co2-chart"), [
    { key: "cen", label: "Centralized", parts: v.co2.cen, total: v.co2Totals.cen },
    { key: "dec", label: "Decentralized", parts: v.co2.dec, total: v.co2Totals.dec },
  ], state.n, "Mt CO₂e", 2, 25);
  const cen = state.n === "cen";
  const total = cen && state.f ? v.nonHazCen : v.totals[state.n];
  readout($("#r1"), [
    ["Total cost", `$${fmt(total, 2)} bn`, cen ? (state.f ? "what-if: ordinary freight" : "Table 4") : `${Math.round(v.reductionPct)}% less than centralized`],
    ["Operating + transport", cen && state.f ? "not published" : `$${fmt(v.ops[state.n], 2)} bn`, "Table 4"],
    ["Building facilities", `$${fmt(v.infra[state.n], 2)} bn`, cen ? "10 large plants" : "about 7% more than centralized"],
    ["Hazardous battery freight", cen ? `${fmt(v.flows.batteriesMt, 1)} Mt` : "none", cen ? (state.f ? "treated as ordinary in the what-if" : "whole batteries to the plants") : "only black mass travels"],
    ["Emissions", `${fmt(v.co2Totals[state.n], 2)} Mt CO₂e`, "Table 3"],
  ]);
  const t = $("#build");
  const c = (a, b) => `<td class="${cen ? "on" : "off"}">${fmt(a)}</td><td class="${cen ? "off" : "on"}">${fmt(b)}</td>`;
  t.innerHTML = `<thead><tr><th scope="col">Year</th><th scope="col">Centralized plants</th><th scope="col">Decentralized modules</th></tr></thead><tbody>${
    BUILD_YEARS.map((r) => `<tr><td>${r.year}</td>${c(r.bm.cen, r.bm.dec)}</tr>`).join("")}</tbody>`;
  $("#nonhaz-note").dataset.gap = nonHazGap().bn.toFixed(2);
}

// ------------------------------------------------------------------ panel 2
const METHOD_LABEL = { m: "By hand", e: "Electric" };
const STAGE_LABEL = {
  pre: "Ground material per 50 g of shredded battery (g)",
  post: "Fine black mass per 50 g of shredded battery (g)",
  res: "Residue left on the sieve per 50 g (g)",
};

function drawDots(g) {
  const svg = $("#dot-chart");
  const H = 290;
  const W = begin(svg, H);
  const L = 40, R = 10, T = 14, B = 30;
  const yMax = 60;
  const y = (v) => H - B - (v / yMax) * (H - T - B);
  for (let v = 0; v <= yMax; v += 10) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, v));
  }
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(FEED_G), y2: y(FEED_G), stroke: "var(--muted)", "stroke-dasharray": "3 3" }));
  const colW = (W - L - R) / 2;
  g.methods.forEach((m, j) => {
    const cx = L + colW * (j + 0.5);
    const on = m.key === g.method;
    const color = m.key === "e" ? "var(--c1)" : "var(--c2)";
    const grp = el("g", { opacity: on ? 1 : 0.5 });
    grp.appendChild(el("text", { x: cx, y: H - 10, "text-anchor": "middle", "font-size": 12.5, class: on ? "strong" : "" }, METHOD_LABEL[m.key]));
    const span = Math.min(colW * 0.7, 190);
    m.points.forEach((p) => {
      const px = cx - span / 2 + ((p.unit - 1) * 3 + (p.trial - 1) + 0.5) * (span / 12);
      const hl = !g.unit || p.unit === g.unit;
      grp.appendChild(tip(el("circle", { cx: px, cy: y(p.g), r: hl ? 5 : 3.5, fill: color,
        opacity: hl ? 0.9 : 0.25, stroke: "var(--bg)", "stroke-width": 1 }),
        `${METHOD_LABEL[m.key]}, unit ${p.unit}, trial ${p.trial}: ${p.g} g`));
    });
    if (m.ci) {
      grp.appendChild(el("rect", { x: cx - span / 2 - 6, y: y(m.mean + m.ci), width: span + 12, height: y(m.mean - m.ci) - y(m.mean + m.ci),
        fill: color, opacity: 0.12 }));
    }
    grp.appendChild(el("line", { x1: cx - span / 2 - 10, x2: cx + span / 2 + 10, y1: y(m.mean), y2: y(m.mean), stroke: "var(--text)", "stroke-width": 2 }));
    grp.appendChild(el("text", { x: cx + span / 2 + 12 > W - 40 ? cx : cx + span / 2 + 12, y: g.stage === "pre" ? y(m.mean) + 16 : y(m.mean) - 6,
      "text-anchor": cx + span / 2 + 12 > W - 40 ? "middle" : "start", "font-size": 11.5, class: "strong" },
      m.ci ? `${fmt(m.mean, 1)} ± ${m.ci}` : `mean ${fmt(m.mean, 1)}`));
    svg.appendChild(grp);
  });
}

function drawEquip() {
  const svg = $("#equip-chart");
  const rows = ["m", "e"].map((k) => ({ k, ...grindView(k, "post", 0).line }));
  const rowH = 54, T = 4, B = 2;
  const H = T + rows.length * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? 64 : 80, R = 56;
  const max = 800;
  const x = (v) => L + (v / max) * (W - L - R);
  const colors = ["var(--c4)", null, "var(--c3)"];
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const on = r.k === state.g;
    const g = el("g", { opacity: on ? 1 : 0.45 });
    g.appendChild(el("text", { x: L - 8, y: y + 22, "text-anchor": "end", "font-size": 12, class: on ? "strong" : "" }, METHOD_LABEL[r.k]));
    let acc = 0;
    r.parts.forEach((p, j) => {
      const fill = colors[j] ?? (r.k === "e" ? "var(--c1)" : "var(--c2)");
      g.appendChild(tip(el("rect", { x: x(acc), y: y + 6, width: x(acc + p.usd) - x(acc), height: 24, fill, opacity: 0.85,
        stroke: "var(--bg)", "stroke-width": 1 }), `${p.label}: $${fmt(p.usd, p.usd % 1 ? 2 : 0)}`));
      acc += p.usd;
    });
    g.appendChild(el("text", { x: x(acc) + 5, y: y + 23, "font-size": 12, class: on ? "strong" : "" }, `$${fmt(acc)}`));
    const SHORT = ["shredder", r.k === "e" ? "grain mill" : "pulverizer + stand", "sieve"];
    g.appendChild(el("text", { x: narrow(W) ? 0 : L, y: y + 44, "font-size": 10.5 },
      r.parts.map((p, j) => `${SHORT[j]} $${fmt(p.usd, p.usd % 1 ? 2 : 0)}`).join(" + ")));
    svg.appendChild(g);
  });
}

function renderP2() {
  const g = grindView(state.g, state.s, state.u);
  segSync("method", state.g);
  segSync("stage", state.s);
  segSync("unit", state.u);
  $("#dot-label").textContent = STAGE_LABEL[state.s];
  $("#ci-key").hidden = state.s !== "post";
  drawDots(g);
  drawEquip();
  const other = g.methods.find((m) => m.key !== state.g);
  readout($("#r2"), [
    ["Mean", `${fmt(g.sel.mean, 1)} g`, `${fmt(g.pctOfFeed, 0)}% of the 50 g fed in${state.s === "post" ? `; 99% interval ± ${g.sel.ci} g` : ""}`],
    ["Other method", `${fmt(other.mean, 1)} g`, METHOD_LABEL[other.key]],
    ["Hand vs electric", g.significant ? "Different" : "Not different", `p = ${g.pMethod}${g.significant ? ", significant at 1%" : ", not significant"}`],
    ["Battery unit", state.u ? `${fmt(g.unitMean, 1)} g` : "No effect", state.u ? `mean of unit ${state.u}'s three trials` :
      (P_UNIT[state.s] ? `p = ${P_UNIT[state.s]} across the four units` : "not tested for residue")],
    ["Equipment", `$${fmt(g.line.total)}`, `shredder + ${state.g === "e" ? "mill" : "pulverizer"} + sieve`],
  ]);
}

// ------------------------------------------------------------------ panel 3
function buildDoeControls() {
  const box = $("#doe-controls");
  DOE.factors.forEach((f) => {
    const fs = document.createElement("fieldset");
    const lg = document.createElement("legend"); lg.textContent = f.name;
    const seg = document.createElement("div");
    seg.className = "seg"; seg.id = `f-${f.key}`; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", f.name);
    f.levels.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.v = String(i + 1); b.textContent = lv;
      b.addEventListener("click", () => { state[f.key] = i + 1; renderP3(); writeURL(); });
      seg.appendChild(b);
    });
    fs.append(lg, seg);
    box.appendChild(fs);
  });
}

function drawDoe(d) {
  const svg = $("#doe-chart");
  const W0 = Math.max(300, Math.round(svg.getBoundingClientRect().width || 640));
  const stack = W0 < 560;
  const cell = stack ? 30 : 34, gap = stack ? 18 : 30, lab = 46;
  const gridW = lab + cell * 3;
  const H = stack ? 3 * (cell * 3 + 44) + 20 : cell * 3 + 76;
  const W = begin(svg, H);
  const [fh, fo, fd] = DOE.factors;
  fd.levels.forEach((pd, k) => {
    const gx = stack ? 8 : 8 + k * (gridW + gap);
    const gy = stack ? 8 + k * (cell * 3 + 44) : 8;
    const on = k + 1 === state.d;
    svg.appendChild(el("text", { x: gx + lab + cell * 1.5, y: gy + 10, "text-anchor": "middle", "font-size": 12, class: on ? "strong" : "" }, `Pulp density ${pd}`));
    fo.levels.forEach((o, j) => svg.appendChild(el("text", { x: gx + lab + cell * (j + 0.5), y: gy + 26, "text-anchor": "middle", "font-size": 10 }, o)));
    fh.levels.forEach((h, i) => {
      svg.appendChild(el("text", { x: gx + lab - 6, y: gy + 32 + cell * (i + 0.5) + 4, "text-anchor": "end", "font-size": 10 }, h));
      fo.levels.forEach((o, j) => {
        const sel = on && i + 1 === state.h && j + 1 === state.o;
        const n = (i) * 9 + (j) * 3 + (k + 1);
        svg.appendChild(tip(el("rect", { x: gx + lab + cell * j + 1, y: gy + 32 + cell * i + 1, width: cell - 2, height: cell - 2, rx: 3,
          fill: sel ? "var(--accent)" : "var(--code-bg)", stroke: sel ? "var(--accent)" : "var(--rule)" }),
          `Condition ${n}: ${h} acid, ${o} peroxide, pulp density ${pd}`));
        svg.appendChild(el("text", { x: gx + lab + cell * (j + 0.5), y: gy + 32 + cell * (i + 0.5) + 4, "text-anchor": "middle", "font-size": 10,
          fill: sel ? "var(--bg)" : "var(--muted)" }, n));
      });
    });
  });
  if (!stack) {
    svg.appendChild(el("text", { x: 8, y: H - 6, "font-size": 10.5 }, "Rows: sulfuric acid. Columns: hydrogen peroxide. Numbers: condition, in standard order."));
  }
}

function renderP3() {
  DOE.factors.forEach((f) => segSync(`f-${f.key}`, state[f.key]));
  const d = doeView(state.h, state.o, state.d);
  drawDoe(d);
  readout($("#r3"), [
    ["Condition", `${d.n} of ${d.total}`, d.labels.join(", ")],
    ["Runs", `${d.runs}`, `${d.total} conditions × ${DOE.replicates} repeats`],
    ["Held fixed", `${DOE.conditions.tempC} °C, ${DOE.conditions.hours} h`, `shaken at ${DOE.conditions.rpm} rpm`],
    ["Measured", DOE.metals.slice(0, 5).join(", "), "by ICP-MS, plus aluminum"],
  ]);
}

// ------------------------------------------------------------------ wiring
let urlTimer = null;
function writeURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = serializeState(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, 150);
}
function renderAll() { renderP1(); renderP2(); renderP3(); }
function bindSeg(id, key, cast, render) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    b.addEventListener("click", () => { state[key] = cast(b.dataset.v); render(); writeURL(); });
  });
}
buildDoeControls();
bindSeg("net", "n", String, renderP1);
bindSeg("method", "g", String, renderP2);
bindSeg("stage", "s", String, renderP2);
bindSeg("unit", "u", Number, renderP2);
$("#freight").addEventListener("change", (e) => { state.f = e.target.checked ? 1 : 0; renderP1(); writeURL(); });
$("#reset").addEventListener("click", () => { Object.assign(state, DEFAULTS); renderAll(); writeURL(); });
$("#share").addEventListener("click", async (e) => {
  const btn = e.currentTarget, said = btn.textContent;
  const qs = serializeState(state);
  try { await navigator.clipboard.writeText(location.origin + location.pathname + (qs ? `?${qs}` : "")); btn.textContent = "Copied"; }
  catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
});
let lastW = 0, resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const w = document.querySelector("main").clientWidth;
    if (w !== lastW) { lastW = w; renderAll(); }
  }, 120);
});
Object.assign(state, parseState(location.search));
lastW = document.querySelector("main").clientWidth;
renderAll();
