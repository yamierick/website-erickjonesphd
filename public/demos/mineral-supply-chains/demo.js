// DOM + SVG rendering and event wiring. All numbers come from model.js / data.js.
import { STAGE_LABEL, LI_TABLE4, HHI_BANDS } from "./data.js";
import {
  metalView, hhiRows, planView, agreementView, parseState, serializeState, DEFAULTS,
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
/** Clear an SVG (keeping its <title>) and size it to its rendered width, so text stays legible. */
function begin(svg, height) {
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width || svg.parentNode.clientWidth || 640));
  [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title") svg.removeChild(c); });
  svg.setAttribute("viewBox", `0 0 ${W} ${height}`);
  return W;
}
const fmt = (v, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtProd = (v, unit) => `${v >= 100 ? fmt(v) : v >= 10 ? fmt(v, 1) : fmt(v, 2)} ${unit}`;
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
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

// ------------------------------------------------------------------ panel 1
function drawHHI() {
  const svg = $("#hhi-chart");
  const rows = hhiRows();
  const rowH = 24, T = 22, B = 26;
  const H = T + rows.length * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? 78 : 96, R = 44;
  const max = 3500;
  const x = (v) => L + (v / max) * (W - L - R);
  // bands
  let lo = 0;
  for (const b of HHI_BANDS) {
    const hi = Math.min(b.max, max);
    svg.appendChild(el("rect", { x: x(lo), y: T - 4, width: x(hi) - x(lo), height: rows.length * rowH + 4,
      fill: `var(--band-${b.id})`, opacity: 0.08 }));
    const short = narrow(W) ? { low: "Unconc.", mid: "Moderate", high: "High" }[b.id] : b.label;
    svg.appendChild(el("text", { x: (x(lo) + x(hi)) / 2, y: 12, "text-anchor": "middle", "font-size": 11 }, short));
    lo = b.max;
  }
  for (const v of [0, 1500, 2500, 3500]) {
    svg.appendChild(el("text", { x: x(v), y: H - 8, "text-anchor": "middle", "font-size": 11 }, fmt(v)));
    svg.appendChild(el("line", { x1: x(v), x2: x(v), y1: T - 4, y2: T + rows.length * rowH, stroke: "var(--rule)" }));
  }
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const sel = r.id === state.m;
    const g = el("g", { opacity: sel ? 1 : 0.55 });
    g.appendChild(el("text", { x: L - 8, y: y + 15, "text-anchor": "end", "font-size": 12, class: sel ? "strong" : "" }, r.name));
    const bandId = HHI_BANDS.find((b) => r.value < b.max).id;
    if (r.corrected) {
      g.appendChild(tip(el("rect", { x: x(0), y: y + 4, width: x(r.published) - x(0), height: rowH - 9,
        fill: "none", stroke: "var(--muted)", "stroke-dasharray": "4 3" }), `Published in Table 13: ${fmt(r.published)}`));
    }
    g.appendChild(tip(el("rect", { x: x(0), y: y + 4, width: x(r.value) - x(0), height: rowH - 9, rx: 2,
      fill: `var(--band-${bandId})`, opacity: sel ? 0.9 : 0.6 }), `${r.name}: ${fmt(r.value)}`));
    g.appendChild(el("text", { x: x(r.value) + 5, y: y + 15, "font-size": 11,
      class: sel ? "strong" : "" }, r.corrected ? `${fmt(r.value)} (printed ${fmt(r.published)})` : fmt(r.value)));
    svg.appendChild(g);
  });
}

function drawCompanies(v) {
  const svg = $("#company-chart");
  const n = v.companies.length;
  const rowH = 34, T = 4, B = v.moreCount ? 22 : 6;
  const H = T + n * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? Math.min(150, W * 0.44) : 210, R = 50;
  const max = Math.max(40, Math.ceil(v.companies[0].share / 10) * 10);
  const x = (s) => L + (s / max) * (W - L - R);
  const chars = Math.floor((L - 10) / 6.4);
  v.companies.forEach((c, i) => {
    const y = T + i * rowH;
    svg.appendChild(el("text", { x: 0, y: y + 13, "font-size": 12, class: "strong" }, truncate(c.name, chars)));
    svg.appendChild(el("text", { x: 0, y: y + 27, "font-size": 10.5 }, truncate(`processed in ${c.proc}`, Math.floor((L - 10) / 5.6))));
    svg.appendChild(tip(el("rect", { x: L, y: y + 6, width: Math.max(1, x(c.share) - L), height: 18, rx: 2,
      fill: c.china ? "var(--c3)" : "var(--c4)", opacity: 0.85 }),
      `${c.name} (HQ ${c.hq}): ${fmtProd(c.prod, v.unit)}, ${c.share}% of world. Main processing: ${c.proc}`));
    svg.appendChild(el("text", { x: x(c.share) + 5, y: y + 19, "font-size": 11.5 }, `${c.share.toFixed(1)}%`));
  });
  if (v.moreCount) {
    svg.appendChild(el("text", { x: 0, y: H - 6, "font-size": 11 },
      `+ ${v.moreCount} more listed companies, ${v.moreShare.toFixed(1)}% of world output combined`));
  }
}

function drawCountries(v) {
  const svg = $("#country-chart");
  const n = v.countries.length;
  const rowH = 34, T = 4, B = 6;
  const H = T + n * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? Math.min(118, W * 0.34) : 170, R = 110;
  const max = Math.max(...v.countries.map((c) => c.shareOfWorld));
  const x = (s) => L + (s / max) * (W - L - R);
  v.countries.forEach((c, i) => {
    const y = T + i * rowH;
    const star = c.est || c.combined ? "*" : "";
    svg.appendChild(el("text", { x: 0, y: y + 13, "font-size": 12, class: "strong" }, truncate(c.name, Math.floor((L - 8) / 6.4)) + star));
    const cos = c.cos.slice(0, narrow(W) ? 2 : 3).map(([nm, p]) => `${nm} ${fmt(p, p % 1 ? 0 : 0)}%`).join(", ");
    svg.appendChild(el("text", { x: 0, y: y + 27, "font-size": 10.5 }, truncate(cos, Math.floor((W - 8) / 5.6))));
    svg.appendChild(tip(el("rect", { x: L, y: y + 5, width: Math.max(1, x(c.shareOfWorld) - L), height: 12, rx: 2,
      fill: "var(--c1)", opacity: 0.8 }),
      `${c.name}: ${fmtProd(c.total, v.unit)} (${c.shareOfWorld.toFixed(1)}% of world). Listed companies: ${c.cos.map(([a, b]) => `${a} ${b}%`).join(", ")}`));
    svg.appendChild(el("text", { x: x(c.shareOfWorld) + 5, y: y + 15, "font-size": 11.5 },
      `${fmtProd(c.total, v.unit)} · ${c.shareOfWorld.toFixed(0)}%`));
  });
  const notes = [];
  if (v.countries.some((c) => c.est)) notes.push("* The paper's estimate from company production, which differs from the USGS figure.");
  if (v.countries.some((c) => c.combined)) notes.push("* One USGS total the paper gives for Qatar, Spain and New Zealand combined.");
  if (v.countries.some((c) => c.cos.some(([, p]) => p > 100))) notes.push("Company shares above 100% of a country are printed that way in the paper.");
  notes.push("Under each country: the largest listed companies' shares of that country's output, as printed.");
  $("#country-hint").textContent = notes.join(" ");
}

function renderP1() {
  const v = metalView(state.m);
  segSync("metal", state.m);
  drawHHI();
  drawCompanies(v);
  drawCountries(v);
  $("#cobalt-note").hidden = false;
  $("#cobalt-note").style.fontWeight = state.m === "co" ? "600" : "";
  $("#hub").textContent = `Where the ore goes: ${v.hub}`;
  readout($("#r1"), [
    ["Concentration (HHI)", fmt(v.hhi), v.band.label + (v.corrected ? "; corrected" : "")],
    ["Largest company", `${v.top.share.toFixed(1)}%`, v.top.name],
    ["Top three companies", `${v.top3Share.toFixed(0)}%`, "of world output"],
    ["Largest producer", `${v.topCountry.shareOfWorld.toFixed(0)}%`, `${v.topCountry.name}, ${fmtProd(v.topCountry.total, v.unit)} of ${fmtProd(v.world, v.unit)}`],
    ["Paper's policy group", v.policy, v.tables],
  ]);
}

// ------------------------------------------------------------------ panel 2
const DEPOSITS = [["spod", "var(--c1)"], ["clay", "var(--c2)"], ["brine", "var(--c3)"]];

function drawMine(pv) {
  const svg = $("#mine-chart");
  const H = 260;
  const W = begin(svg, H);
  const L = 46, R = 12, T = 12, B = 26;
  const n = pv.years.length;
  const yMax = 2500;
  const x = (i) => L + (i / (n - 1)) * (W - L - R);
  const y = (v) => H - B - (v / yMax) * (H - T - B);
  for (let v = 0; v <= yMax; v += 500) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, fmt(v)));
  }
  for (let i = 0; i < n; i += narrow(W) ? 20 : 10) {
    svg.appendChild(el("text", { x: x(i), y: H - 8, "text-anchor": "middle", "font-size": 11 }, pv.years[i]));
  }
  let base = pv.years.map(() => 0);
  for (const [k, color] of DEPOSITS) {
    const top = base.map((b, i) => b + pv.mine[k][i]);
    let d = `M ${x(0)} ${y(base[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(base[i])}`;
    for (let i = n - 1; i >= 0; i--) d += ` L ${x(i)} ${y(top[i])}`;
    svg.appendChild(el("path", { d: d + " Z", fill: color, opacity: 0.78 }));
    base = top;
  }
  let d = `M ${x(0)} ${y(pv.otherTotal[0])}`;
  for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(pv.otherTotal[i])}`;
  svg.appendChild(el("path", { d, fill: "none", stroke: "var(--text)", "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
  const last = n - 1;
  svg.appendChild(el("text", { x: x(last) - 4, y: y(pv.total[last]) - 6, "text-anchor": "end", "font-size": 11, class: "strong" },
    `${fmt(pv.total[last])} kt in 2100`));
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: "var(--muted)" }));
}

function pairedBars(svg, rows, { unit, digits, labels, sel, rowH = 36 }) {
  const T = 4, B = 20;
  const H = T + rows.length * rowH + B;
  const W = begin(svg, H);
  const L = narrow(W) ? 84 : 110, R = 64;
  const max = Math.max(...rows.flatMap((r) => [r.cost, r.co2]), 1e-9);
  const x = (v) => L + (v / max) * (W - L - R);
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    svg.appendChild(el("text", { x: L - 8, y: y + rowH / 2 + 4, "text-anchor": "end", "font-size": 12 }, STAGE_LABEL[r.stage]));
    [["cost", 0], ["co2", 1]].forEach(([k, j]) => {
      const on = k === sel;
      const bh = (rowH - 8) / 2;
      const yy = y + 3 + j * bh;
      svg.appendChild(tip(el("rect", { x: L, y: yy, width: Math.max(r[k] > 0 ? 1.5 : 0, x(r[k]) - L), height: bh - 1, rx: 1.5,
        fill: k === "cost" ? "var(--c4)" : "var(--c1)", opacity: on ? 0.95 : 0.4 }),
        `${labels[k]}, ${STAGE_LABEL[r.stage]}: ${fmt(r[k], digits)} ${unit}`));
      svg.appendChild(el("text", { x: x(r[k]) + 4, y: yy + bh - 3, "font-size": 11, class: on ? "strong" : "" }, fmt(r[k], digits)));
    });
  });
  const ly = H - 6;
  svg.appendChild(el("rect", { x: L, y: ly - 9, width: 10, height: 9, fill: "var(--c4)", opacity: sel === "cost" ? 0.95 : 0.4 }));
  svg.appendChild(el("text", { x: L + 14, y: ly, "font-size": 11 }, labels.cost));
  const off = L + 24 + labels.cost.length * 6;
  svg.appendChild(el("rect", { x: off, y: ly - 9, width: 10, height: 9, fill: "var(--c1)", opacity: sel === "co2" ? 0.95 : 0.4 }));
  svg.appendChild(el("text", { x: off + 14, y: ly, "font-size": 11 }, labels.co2));
}

function renderP2() {
  const pv = planView(state.p, state.y, state.k);
  segSync("plan", state.p);
  segSync("year", state.y);
  segSync("metric", state.k);
  drawMine(pv);
  $("#other-label").textContent = state.p === "cost" ? "Lowest-CO₂ plan, total" : "Least-cost plan, total";
  $("#fac-label").textContent = `Facilities open in ${state.y} (paper's Table 4)`;
  pairedBars($("#fac-chart"), pv.facilities, { unit: "facilities", digits: 0, sel: state.p,
    labels: { cost: "Least cost", co2: "Lowest CO₂" } });
  $("#stage-label").textContent = state.k === "co2" ? "CO₂ by stage, 2020–2100 (Gt)" : "Discounted cost by stage, 2020–2100 (USD trillion)";
  pairedBars($("#stage-chart"), pv.byStage, { unit: state.k === "co2" ? "Gt CO₂" : "USD trillion", digits: 2, sel: state.p,
    labels: { cost: "Least cost", co2: "Lowest CO₂ (re-solved)" } });
  const yi = LI_TABLE4.years.indexOf(state.y);
  readout($("#r2"), [
    ["Total cost", `$${pv.totalCost} trillion`, "discounted, 2020–2100"],
    ["Total CO₂", `${pv.totalCO2} Gt`, "2020–2100"],
    [`Recycling plants, ${state.y}`, fmt(pv.recyclingPlants), state.p === "cost" ? "none in the least-cost plan" : "Table 4"],
    [`Mines, ${state.y}`, fmt(pv.mines), `vs ${fmt(LI_TABLE4[pv.other].mine[yi])} in the other plan`],
  ]);
}

// ------------------------------------------------------------------ panel 3
function drawUS(av) {
  const svg = $("#us-chart");
  const H = 230;
  const W = begin(svg, H);
  const L = 48, R = 8, T = 18, B = 34;
  const n = av.rows.length;
  const max = 2000;
  const bw = (W - L - R) / n;
  const y = (v) => H - B - (v / max) * (H - T - B);
  for (let v = 0; v <= max; v += 500) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, fmt(v)));
  }
  av.rows.forEach((r, i) => {
    const sel = r.alloc === av.alloc;
    const x0 = L + i * bw + bw * 0.18, w = bw * 0.64;
    const g = el("g", { opacity: sel ? 1 : 0.45 });
    g.appendChild(tip(el("rect", { x: x0, y: y(r.usDomestic), width: w, height: y(0) - y(r.usDomestic), fill: "var(--c1)" }),
      `${r.alloc}%: U.S. domestic production $${fmt(r.usDomestic, 2)} bn`));
    g.appendChild(tip(el("rect", { x: x0, y: y(r.usTotal), width: w, height: y(r.usDomestic) - y(r.usTotal), fill: "var(--c4)" }),
      `${r.alloc}%: U.S. imports $${fmt(r.usImport, 2)} bn`));
    g.appendChild(el("text", { x: x0 + w / 2, y: y(r.usTotal) - 4, "text-anchor": "middle", "font-size": narrow(W) ? 9.5 : 11, class: sel ? "strong" : "" }, fmt(r.usTotal)));
    g.appendChild(el("text", { x: x0 + w / 2, y: H - B + 14, "text-anchor": "middle", "font-size": 11, class: sel ? "strong" : "" }, `${r.alloc}%`));
    g.appendChild(el("text", { x: x0 + w / 2, y: H - B + 27, "text-anchor": "middle", "font-size": 9.5 }, `US ${r.usShare}%`));
    svg.appendChild(g);
  });
}

function drawChina(av) {
  const svg = $("#cn-chart");
  const H = 170;
  const W = begin(svg, H);
  const L = 48, R = 8, T = 18, B = 22;
  const n = av.rows.length;
  const max = 10000;
  const bw = (W - L - R) / n;
  const y = (v) => H - B - (v / max) * (H - T - B);
  for (let v = 0; v <= max; v += 5000) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, fmt(v)));
  }
  av.rows.forEach((r, i) => {
    const sel = r.alloc === av.alloc;
    const x0 = L + i * bw + bw * 0.18, w = bw * 0.64;
    const g = el("g", { opacity: sel ? 1 : 0.45 });
    g.appendChild(tip(el("rect", { x: x0, y: y(r.china), width: w, height: y(0) - y(r.china), fill: "var(--c3)" }),
      `${r.alloc}%: China total $${fmt(r.china, 2)} bn`));
    g.appendChild(el("text", { x: x0 + w / 2, y: y(r.china) - 4, "text-anchor": "middle", "font-size": narrow(W) ? 9.5 : 11, class: sel ? "strong" : "" }, fmt(r.china)));
    g.appendChild(el("text", { x: x0 + w / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, class: sel ? "strong" : "" }, `${r.alloc}%`));
    svg.appendChild(g);
  });
}

function renderP3() {
  const av = agreementView(state.a);
  $("#alloc").value = av.alloc;
  $("#alloc-out").textContent = `${av.alloc}%`;
  $("#alloc").setAttribute("aria-valuetext", `${av.alloc}% of Australia's refined lithium, U.S. midstream share ${av.row.usShare}%`);
  drawUS(av);
  drawChina(av);
  const r = av.row;
  const sign = (v, d = 0) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);
  readout($("#r3"), [
    ["U.S. midstream share", `${r.usShare}%`, `${av.alloc}% × Australia's 28.65%`],
    ["U.S. total cost", `$${fmt(r.usTotal)} bn`, av.alloc ? `${sign(av.usChange)} bn vs baseline (${av.usMultiple.toFixed(1)}×)` : "baseline: all imported"],
    ["U.S. import cost", `$${fmt(r.usImport)} bn`, av.alloc ? `${sign(av.importChangePct)}% vs baseline` : "baseline"],
    ["China total cost", `$${fmt(r.china)} bn`, av.alloc ? `${sign(av.chinaChangePct)}% vs baseline` : "baseline"],
    ["U.S. + China", `$${fmt(av.combined)} bn`, av.alloc ? `${sign(av.combinedChange)} bn vs baseline` : "sum of the two columns"],
  ]);
}

// ------------------------------------------------------------------ state + wiring
let urlTimer = null;
function writeURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = serializeState(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, 150);
}
function renderAll() { renderP1(); renderP2(); renderP3(); }

function bindSeg(id, key, cast = (v) => v, render) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    b.addEventListener("click", () => { state[key] = cast(b.dataset.v); render(); writeURL(); });
  });
}
bindSeg("metal", "m", String, renderP1);
bindSeg("plan", "p", String, renderP2);
bindSeg("year", "y", Number, renderP2);
bindSeg("metric", "k", String, renderP2);
$("#alloc").addEventListener("input", (e) => { state.a = Number(e.target.value); renderP3(); writeURL(); });

$("#reset").addEventListener("click", () => { Object.assign(state, DEFAULTS); renderAll(); writeURL(); });
$("#share").addEventListener("click", async (e) => {
  const btn = e.currentTarget, said = btn.textContent;
  const qs = serializeState(state);
  const url = location.origin + location.pathname + (qs ? `?${qs}` : "");
  try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; }
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
