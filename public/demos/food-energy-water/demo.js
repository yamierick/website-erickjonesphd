// DOM, SVG and events for the Food, energy and water demo. Numbers come from
// model.js / data.js; this file only draws them.

import {
  normalizeCoop, coopScenario, costLines, normalizeFarm, valueBars, climateView,
  parseQuery, toQuery, COOP_DEFAULTS, FARM_DEFAULTS, linear, usd, usdCents, usdM, pct,
} from "./model.js";
import {
  COOPT, SIZES, SIZE_LABEL, PLANS, PLAN_LABEL, PLAN_SHORT, CLIMATES, CLIMATE_LABEL,
  BELIEFS, BELIEF_LABEL, BELIEF_PROB, PRECIP_PCT, PRECIP_LEVELS_IN, PRECIP_MEAN_IN,
  PROFIT_BY_CLIMATE, VALUES, PROFIT,
} from "./data.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function clearSvg(svg) {
  [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title" && c.nodeName !== "desc") svg.removeChild(c); });
}
function fitWidth(svg, h) {
  const px = svg.getBoundingClientRect().width || 720;
  const w = px < 600 ? Math.max(320, Math.round(px)) : 720;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  return w;
}
function setReadout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v, sub] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.innerHTML = v;
    if (sub) { const s = document.createElement("small"); s.textContent = sub; dd.appendChild(s); }
    d.append(dt, dd); dl.appendChild(d);
  }
}
function syncSeg(id, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    const on = b.dataset.v === String(value);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
function table(container, head, rows) {
  const t = document.createElement("table");
  const tr = document.createElement("tr");
  head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
  t.appendChild(tr);
  rows.forEach((r) => {
    const row = document.createElement("tr");
    r.forEach((c) => { const td = document.createElement("td"); td.textContent = c; row.appendChild(td); });
    t.appendChild(row);
  });
  container.innerHTML = "";
  container.appendChild(t);
}

const init = parseQuery(location.search);
const state = { coop: init.coop, farm: init.farm };
let urlTimer = null;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = toQuery(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, 150);
}

// ---------------------------------------------------------------- panel A ----
const SIZE_TICK = { 1: "Alone", 32: "32 homes", 320: "320 homes", 3200: "3,200 homes" };

function drawCoop() {
  const sc = coopScenario(state.coop);
  const svg = $("#coop-chart");
  clearSvg(svg);
  const H = 320, L = 50, T = 14, B = 30;
  const W = fitWidth(svg, H), narrow = W < 600, R = narrow ? 16 : 130;
  const x = (i) => L + 20 + i * ((W - L - R - 40) / (SIZES.length - 1));
  const y = linear(2000, 4000, H - B, T);
  for (let v = 2000; v <= 4000; v += 500) {
    svg.appendChild(el("line", { x1: L, x2: W - R + (narrow ? 0 : 10), y1: y(v), y2: y(v), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L - 7, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, usd(v)));
  }
  SIZES.forEach((s, i) => svg.appendChild(el("text", { x: x(i), y: H - B + 18, "text-anchor": "middle", "font-size": 11, class: s === sc.size ? "strong" : "" }, narrow && s === "1" ? "Alone" : (narrow ? s === "3200" ? "3,200" : s : SIZE_TICK[s]))));
  // Utility-only baseline.
  svg.appendChild(el("line", { x1: L, x2: W - R + (narrow ? 0 : 10), y1: y(COOPT.utilityCost), y2: y(COOPT.utilityCost), stroke: "var(--text)", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
  svg.appendChild(el("text", { x: (x(2) + x(3)) / 2, y: y(COOPT.utilityCost) - 7, "text-anchor": "middle", "font-size": 11 }, `Utilities only ${usd(COOPT.utilityCost)}`));
  const lines = costLines();
  // Others first (muted), selected on top.
  [...lines.filter((l) => l.plan !== sc.plan), lines.find((l) => l.plan === sc.plan)].forEach((l) => {
    const sel = l.plan === sc.plan;
    const d = l.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    svg.appendChild(el("path", { d, fill: "none", stroke: sel ? "var(--c-blue)" : "var(--muted)", "stroke-width": sel ? 2.5 : 1.5, "stroke-opacity": sel ? 1 : 0.55 }));
    l.values.forEach((v, i) => {
      const g = el("g", { style: "cursor:pointer" });
      g.appendChild(el("title", {}, `${PLAN_LABEL[l.plan]}, ${SIZE_LABEL[SIZES[i]]}: ${usd(v)} a year per home`));
      g.appendChild(el("circle", { cx: x(i), cy: y(v), r: 12, fill: "transparent" }));
      g.appendChild(el("circle", { cx: x(i), cy: y(v), r: sel ? 5 : 3.5, fill: sel ? "var(--c-blue)" : "var(--muted)", stroke: "var(--bg)", "stroke-width": 1.5, "fill-opacity": sel ? 1 : 0.7 }));
      g.addEventListener("click", () => { state.coop = normalizeCoop({ size: SIZES[i], plan: l.plan }); updateCoop(); });
      svg.appendChild(g);
    });
    if (!narrow) {
      svg.appendChild(el("text", { x: x(3) + 12, y: y(l.values[3]) + 4 + (l.plan === "elc" ? 0 : 0), "font-size": 11, class: sel ? "strong" : "" }, PLAN_SHORT[l.plan]));
    }
  });
  const i = SIZES.indexOf(sc.size);
  svg.appendChild(el("circle", { cx: x(i), cy: y(sc.cost), r: 10, fill: "none", stroke: "var(--text)", "stroke-width": 1.5 }));
  svg.appendChild(el("text", { x: x(i), y: y(sc.cost) + 24, "text-anchor": "middle", "font-size": 12, class: "strong" }, usd(sc.cost)));
  svg.appendChild(el("line", { x1: L, x2: W - R + (narrow ? 0 : 10), y1: H - B, y2: H - B, stroke: "var(--muted)" }));
  $("#coop-leg-sel").textContent = PLAN_LABEL[sc.plan];
  $("#coop-desc").textContent = `${PLAN_LABEL[sc.plan]}: ${SIZES.map((s) => `${SIZE_LABEL[s]} ${usd(COOPT.plans[sc.plan].cost[s])}`).join(", ")} a year per home, against ${usd(COOPT.utilityCost)} from the utilities.`;

  // Local-share bars for the selected plan.
  const s2 = $("#coop-share");
  clearSvg(s2);
  const H2 = 220, L2 = 50, R2 = 14, T2 = 16, B2 = 30;
  const W2 = fitWidth(s2, H2);
  const y2 = linear(0, 1, H2 - B2, T2);
  for (let v = 0; v <= 1.0001; v += 0.25) {
    s2.appendChild(el("line", { x1: L2, x2: W2 - R2, y1: y2(v), y2: y2(v), stroke: "var(--rule)" }));
    s2.appendChild(el("text", { x: L2 - 7, y: y2(v) + 4, "text-anchor": "end", "font-size": 11 }, pct(v)));
  }
  const band = (W2 - L2 - R2) / SIZES.length;
  const p = COOPT.plans[sc.plan];
  SIZES.forEach((s, k) => {
    const sel = s === sc.size;
    const bw = Math.min(34, band * 0.3);
    [["elecShare", "var(--c-orange)", "Electricity"], ["waterShare", "var(--c-blue)", "Water"]].forEach(([key, fill, lab], j) => {
      const v = p[key][s];
      const bx = L2 + k * band + band / 2 + (j ? 2 : -bw - 2);
      const h = Math.max(v > 0 ? 1.5 : 0, y2(0) - y2(v));
      const r = el("rect", { x: bx, y: y2(0) - h, width: bw, height: h, rx: 3, fill, "fill-opacity": sel ? 0.95 : 0.35 });
      r.appendChild(el("title", {}, `${SIZE_LABEL[s]}: ${lab.toLowerCase()} ${pct(v)} produced locally`));
      s2.appendChild(r);
      if (sel) s2.appendChild(el("text", { x: bx + bw / 2, y: y2(0) - h - 5, "text-anchor": "middle", "font-size": 11, class: "strong" }, pct(v)));
    });
    s2.appendChild(el("text", { x: L2 + k * band + band / 2, y: H2 - B2 + 18, "text-anchor": "middle", "font-size": 11, class: sel ? "strong" : "" }, W2 < 600 ? (s === "1" ? "Alone" : s === "3200" ? "3,200" : s) : SIZE_TICK[s]));
  });
  s2.appendChild(el("line", { x1: L2, x2: W2 - R2, y1: y2(0), y2: y2(0), stroke: "var(--muted)" }));
  $("#coop-share-desc").textContent = `${PLAN_LABEL[sc.plan]}, ${SIZE_LABEL[sc.size]}: ${pct(sc.elecShare)} of electricity and ${pct(sc.waterShare)} of water produced by the homes' own systems.`;

  setReadout($("#coop-readout"), [
    ["Cost per home", usd(sc.cost), "a year, electricity and water"],
    ["Against utilities only", sc.saving >= 0 ? `−${usd(sc.saving)}` : `+${usd(-sc.saving)}`, `${sc.saving >= 0 ? "saves" : "costs"} ${Math.abs(sc.savingPct).toFixed(0)}% vs ${usd(sc.utilityCost)}`],
    ["Electricity made locally", pct(sc.elecShare), "Electricity Fraction"],
    ["Water made locally", pct(sc.waterShare), "Water Fraction"],
  ]);
  $("#coop-built-head").textContent = `What gets built (${SIZE_LABEL[sc.size].toLowerCase()}, ${PLAN_SHORT[sc.plan].toLowerCase()}):`;
  const ul = $("#coop-built");
  ul.innerHTML = "";
  sc.built.forEach((b) => { const li = document.createElement("li"); li.textContent = b; ul.appendChild(li); });

  table($("#coop-table"), ["Approach", ...SIZES.map((s) => SIZE_LABEL[s]), "Utilities only"],
    PLANS.flatMap((pl) => [
      [`${PLAN_SHORT[pl]}: cost per home`, ...SIZES.map((s) => usd(COOPT.plans[pl].cost[s])), usd(COOPT.utilityCost)],
      [`${PLAN_SHORT[pl]}: electricity local`, ...SIZES.map((s) => pct(COOPT.plans[pl].elecShare[s])), "0%"],
      [`${PLAN_SHORT[pl]}: water local`, ...SIZES.map((s) => pct(COOPT.plans[pl].waterShare[s])), "0%"],
    ]));
}

function updateCoop() {
  syncSeg("coop-size", state.coop.size);
  syncSeg("coop-plan", state.coop.plan);
  drawCoop();
  writeUrl();
}
document.querySelectorAll("#coop-size button").forEach((b) => b.addEventListener("click", () => { state.coop = normalizeCoop({ ...state.coop, size: b.dataset.v }); updateCoop(); }));
document.querySelectorAll("#coop-plan button").forEach((b) => b.addEventListener("click", () => { state.coop = normalizeCoop({ ...state.coop, plan: b.dataset.v }); updateCoop(); }));
$("#coop-reset").addEventListener("click", () => { state.coop = { ...COOP_DEFAULTS }; updateCoop(); });

// ---------------------------------------------------------------- panel B ----
const VALUE_LABEL = {
  evkc: "Knowing the climate",
  evkw: "Also knowing each year's weather",
  vss: "Hedging vs planning for the average",
};

function drawFarm() {
  const cv = climateView(state.farm);
  const { belief, clim } = cv;
  const other = belief === "ep" ? "dml" : "ep";

  // Chart 1: values of information, both beliefs, selected emphasized.
  const s1 = $("#farm-values");
  clearSvg(s1);
  const H1 = 230, T1 = 10, B1 = 26;
  const W1 = fitWidth(s1, H1), narrow = W1 < 600;
  const L1 = narrow ? 12 : 230, R1 = narrow ? 70 : 90;
  const x = linear(0, 100000, L1, W1 - R1);
  for (let v = 0; v <= 100000; v += 25000) {
    s1.appendChild(el("line", { x1: x(v), x2: x(v), y1: T1, y2: H1 - B1, stroke: "var(--rule)" }));
    s1.appendChild(el("text", { x: x(v), y: H1 - B1 + 16, "text-anchor": "middle", "font-size": 11 }, v === 0 ? "$0" : `$${v / 1000}k`));
  }
  const rows = valueBars(belief).map((b) => b.key);
  const rowH = (H1 - T1 - B1) / rows.length;
  rows.forEach((key, r) => {
    const top = T1 + r * rowH;
    const labY = narrow ? top + 12 : top + rowH / 2 + 4;
    s1.appendChild(el("text", { x: narrow ? L1 + 5 : L1 - 10, y: labY, "text-anchor": narrow ? "start" : "end", "font-size": 12, class: "strong" }, VALUE_LABEL[key]));
    const barTop = narrow ? top + 18 : top + rowH / 2 - 15;
    [belief, other].forEach((bl, j) => {
      const v = VALUES[bl][key];
      const w = Math.max(1.5, x(v) - x(0));
      const yb = barTop + j * 14;
      const sel = bl === belief;
      const rect = el("rect", { x: x(0), y: yb, width: w, height: 12, rx: 3, fill: bl === "ep" ? "var(--c-blue)" : "var(--c-orange)", "fill-opacity": sel ? 0.95 : 0.35 });
      rect.appendChild(el("title", {}, `${BELIEF_LABEL[bl]}: ${usdCents(v)}`));
      s1.appendChild(rect);
      const star = key === "vss" && bl === "dml" ? "*" : "";
      s1.appendChild(el("text", { x: x(0) + w + 5, y: yb + 10, "font-size": 11, class: sel ? "strong" : "" }, (v < 1000 ? usdCents(v) : usd(v)) + star));
    });
  });
  s1.appendChild(el("line", { x1: x(0), x2: x(0), y1: T1, y2: H1 - B1, stroke: "var(--muted)" }));
  const V = VALUES[belief];
  $("#farm-values-desc").textContent = `${BELIEF_LABEL[belief]}: knowing the climate is worth ${usd(V.evkc)}, also knowing the weather ${usd(V.evkw)}, hedging over planning for the average climate ${usdCents(V.vss)}.`;

  // Chart 2: rainfall distributions (Table 1).
  const s2 = $("#farm-rain");
  clearSvg(s2);
  const H2 = 230, T2 = 8, B2 = 44, L2 = 44, R2 = 10;
  const W2 = fitWidth(s2, H2);
  const band = (W2 - L2 - R2) / CLIMATES.length;
  const y2 = linear(0, 100, H2 - B2, T2);
  for (let v = 0; v <= 100; v += 25) {
    s2.appendChild(el("line", { x1: L2, x2: W2 - R2, y1: y2(v), y2: y2(v), stroke: "var(--rule)" }));
    s2.appendChild(el("text", { x: L2 - 7, y: y2(v) + 4, "text-anchor": "end", "font-size": 11 }, `${v}%`));
  }
  CLIMATES.forEach((c, k) => {
    const sel = c === clim;
    const bw = Math.min(90, band * 0.55), bx = L2 + k * band + (band - bw) / 2;
    let acc = 0;
    PRECIP_PCT[c].forEach((p, lv) => {
      if (p <= 0) return;
      const y0 = y2(acc), y1 = y2(acc + p);
      const r = el("rect", { x: bx, y: y1, width: bw, height: Math.max(0, y0 - y1 - 1.5), fill: `var(--r${lv + 1})`, "fill-opacity": sel ? 1 : 0.6 });
      r.appendChild(el("title", {}, `${CLIMATE_LABEL[c]}: ${p}% of years at ${PRECIP_LEVELS_IN[lv]} inches`));
      s2.appendChild(r);
      if (sel && p >= 10) s2.appendChild(el("text", { x: bx + bw / 2, y: (y0 + y1) / 2 + 4, "text-anchor": "middle", "font-size": 11, style: `fill:${lv >= 2 ? "#ffffff" : "#0b0b0b"}` }, `${p}%`));
      acc += p;
    });
    if (sel) s2.appendChild(el("rect", { x: bx - 3, y: y2(100) - 3, width: bw + 6, height: y2(0) - y2(100) + 6, fill: "none", stroke: "var(--text)", "stroke-width": 1.5, rx: 3 }));
    s2.appendChild(el("text", { x: bx + bw / 2, y: H2 - B2 + 17, "text-anchor": "middle", "font-size": 12, class: sel ? "strong" : "" }, CLIMATE_LABEL[c]));
    s2.appendChild(el("text", { x: bx + bw / 2, y: H2 - B2 + 32, "text-anchor": "middle", "font-size": 11 }, `${Math.round(100 * BELIEF_PROB[belief][c])}% likely`));
  });
  $("#farm-rain-desc").textContent = CLIMATES.map((c) => `${CLIMATE_LABEL[c]}: ${PRECIP_PCT[c].map((p, i) => `${p}% at ${PRECIP_LEVELS_IN[i]} in`).join(", ")}`).join(". ") + ".";

  // Chart 3: profit by climate, known vs hedged (Tables 6-7).
  const s3 = $("#farm-profit");
  clearSvg(s3);
  const H3 = 240, T3 = 18, B3 = 30, L3 = 50, R3 = 10;
  const W3 = fitWidth(s3, H3);
  const band3 = (W3 - L3 - R3) / CLIMATES.length;
  const y3 = linear(0, 3500000, H3 - B3, T3);
  for (let v = 0; v <= 3500000; v += 1000000) {
    s3.appendChild(el("line", { x1: L3, x2: W3 - R3, y1: y3(v), y2: y3(v), stroke: "var(--rule)" }));
    s3.appendChild(el("text", { x: L3 - 7, y: y3(v) + 4, "text-anchor": "end", "font-size": 11 }, v === 0 ? "$0" : `$${v / 1e6}M`));
  }
  CLIMATES.forEach((c, k) => {
    const sel = c === clim;
    const row = PROFIT_BY_CLIMATE[belief][c];
    const bw = Math.min(34, band3 * 0.3);
    [["kcuw", "var(--c-aqua)", "built knowing the climate"], ["stoch", "var(--c-violet)", "built for the belief"]].forEach(([key, fill, lab], j) => {
      const v = row[key];
      const bx = L3 + k * band3 + band3 / 2 + (j ? 2 : -bw - 2);
      const h = y3(0) - y3(v);
      const r = el("rect", { x: bx, y: y3(v), width: bw, height: h, rx: 3, fill, "fill-opacity": sel ? 0.95 : 0.35 });
      r.appendChild(el("title", {}, `${CLIMATE_LABEL[c]}, ${lab}: ${usd(v)}`));
      s3.appendChild(r);
      if (sel) s3.appendChild(el("text", { x: bx + bw / 2, y: y3(v) - 5, "text-anchor": "middle", "font-size": 11, class: "strong" }, usdM(v)));
    });
    s3.appendChild(el("text", { x: L3 + k * band3 + band3 / 2, y: H3 - B3 + 18, "text-anchor": "middle", "font-size": 12, class: sel ? "strong" : "" }, CLIMATE_LABEL[c]));
  });
  s3.appendChild(el("line", { x1: L3, x2: W3 - R3, y1: y3(0), y2: y3(0), stroke: "var(--muted)" }));
  $("#farm-profit-desc").textContent = `${BELIEF_LABEL[belief]} belief. ` + CLIMATES.map((c) => `${CLIMATE_LABEL[c]}: ${usdM(PROFIT_BY_CLIMATE[belief][c].stoch)} with the hedged plan, ${usdM(PROFIT_BY_CLIMATE[belief][c].kcuw)} knowing the climate`).join("; ") + ".";

  const E = PROFIT[belief];
  setReadout($("#farm-readout"), [
    ["Expected profit, hedged plan", usdM(E.stoch), `25 years; ${usdM(E.pi)} with perfect foresight`],
    ["Knowing the climate", usd(V.evkc), `of ${usd(V.evpi)} for perfect information`],
    ["Also knowing the weather", usd(V.evkw), "given the climate"],
    ["Hedging vs average plan", belief === "dml" ? `${usdCents(V.vss)}<span class="star">*</span>` : usdCents(V.vss), belief === "dml" ? "published; the public code gives $964.89" : "planning for the average climate is almost as good"],
    [`If ${CLIMATE_LABEL[clim].toLowerCase()} arrives`, usdM(cv.hedgedProfit), `hedged plan; knowing it: ${usdM(cv.knownProfit)}`],
    ["Cost of the wrong plan", usd(cv.shortfall), `in the ${CLIMATE_LABEL[clim].toLowerCase()} climate`],
  ]);
  $("#farm-belief-hint").textContent = `Chance of each climate: ${CLIMATES.map((c) => `${CLIMATE_LABEL[c]} ${Math.round(100 * BELIEF_PROB[belief][c])}%`).join(", ")}.`;

  table($("#farm-table"), ["", "Dry", "Dry-moderate", "Moderate", "Wet"], [
    ...PRECIP_LEVELS_IN.map((lv, i) => [`Years at ${lv} in (%)`, ...CLIMATES.map((c) => String(PRECIP_PCT[c][i]))]),
    ["Mean rainfall (in)", ...CLIMATES.map((c) => String(PRECIP_MEAN_IN[c]))],
    ...BELIEFS.flatMap((bl) => [
      [`${BELIEF_LABEL[bl]}: chance`, ...CLIMATES.map((c) => `${Math.round(100 * BELIEF_PROB[bl][c])}%`)],
      [`${BELIEF_LABEL[bl]}: profit, hedged`, ...CLIMATES.map((c) => usd(PROFIT_BY_CLIMATE[bl][c].stoch))],
      [`${BELIEF_LABEL[bl]}: profit, climate known`, ...CLIMATES.map((c) => usd(PROFIT_BY_CLIMATE[bl][c].kcuw))],
    ]),
  ]);
}

function updateFarm() {
  syncSeg("farm-belief", state.farm.belief);
  syncSeg("farm-clim", state.farm.clim);
  drawFarm();
  writeUrl();
}
document.querySelectorAll("#farm-belief button").forEach((b) => b.addEventListener("click", () => { state.farm = normalizeFarm({ ...state.farm, belief: b.dataset.v }); updateFarm(); }));
document.querySelectorAll("#farm-clim button").forEach((b) => b.addEventListener("click", () => { state.farm = normalizeFarm({ ...state.farm, clim: b.dataset.v }); updateFarm(); }));
$("#farm-reset").addEventListener("click", () => { state.farm = { ...FARM_DEFAULTS }; updateFarm(); });

document.querySelectorAll(".copy-link").forEach((btn) => btn.addEventListener("click", async () => {
  const said = btn.textContent;
  const qs = toQuery(state);
  const url = `${location.origin}${location.pathname}${qs ? `?${qs}` : ""}`;
  try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; } catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
}));

updateCoop();
updateFarm();
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lastWidth) < 20) return;
  lastWidth = window.innerWidth;
  drawCoop(); drawFarm();
});
