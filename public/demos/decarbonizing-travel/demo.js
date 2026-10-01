// DOM, SVG and events for the Decarbonizing travel demo. All numbers come from
// model.js (which reads data.js); this file only draws them.

import {
  normalizeSav, applyChange, savSummary, viewLayers, stack, niceMax, linear, bandPath,
  linePath, parseQuery, toQuery, SAV_DEFAULTS, EREV_DEFAULTS, snapRange, erevPoint, nextStep,
  fmtInt, fmt1,
} from "./model.js";
import { EREV_RANGES, EREV_CASES, EREV_ICE_CO2_MT } from "./data.js";

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
function setReadout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v, sub] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
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

// ------------------------------------------------------------------ state ----
const init = parseQuery(location.search);
const state = { sav: init.sav, erev: init.erev };

let urlTimer = null;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = toQuery(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, 150);
}

// ---------------------------------------------------------------- panel A ----
const LAYER_STYLE = {
  privateFuel: ["var(--c-orange)", "Private: gasoline & hybrid", "sw-pf"],
  privateEV: ["var(--c-blue)", "Private: battery-electric", "sw-pe"],
  sharedFuel: ["var(--c-yellow)", "Shared: gasoline & hybrid", "sw-sf"],
  sharedEV: ["var(--c-aqua)", "Shared: battery-electric", "sw-se"],
  coal: ["var(--c-red)", "Coal", "sw-coal"],
  nuclear: ["var(--c-violet)", "Nuclear", "sw-nuclear"],
  gas: ["var(--c-orange)", "Natural gas", "sw-gas"],
  other: ["var(--c-aqua)", "Hydro & biomass", "sw-other"],
  wind: ["var(--c-blue)", "Wind", "sw-wind"],
  solar: ["var(--c-yellow)", "Solar", "sw-solar"],
  electricity: ["var(--c-violet)", "Power plants", "sw-elec"],
  vehicles: ["var(--c-orange)", "Vehicles", "sw-veh"],
};
const VIEW_HEAD = {
  veh: "Vehicles on Austin's roads, thousands",
  elc: "Electricity generated in Austin's model, TWh a year",
  co2: "CO₂ from Austin's electricity and vehicles, million tonnes a year",
};

// Charts are drawn in viewBox units. On a narrow screen the viewBox narrows to
// the rendered width so 11-unit text stays about 11 px instead of shrinking.
function fitWidth(svg, h) {
  const px = svg.getBoundingClientRect().width || 720;
  const w = px < 600 ? Math.max(320, Math.round(px)) : 720;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  return w;
}
let W = 720;
const H = 360, L = 48, R = 14, T = 14, B = 30;
let savGeom = null;

function drawSav() {
  const s = state.sav;
  const sum = savSummary(s);
  const v = viewLayers(s);
  const svg = $("#sav-chart");
  clearSvg(svg);
  W = fitWidth(svg, H);
  const st = stack(v.layers);
  const top = st[st.length - 1].hi;
  const peak = Math.max(...top, ...(v.compare ? v.compare.values : [0]));
  const nm = niceMax(peak);
  const x = linear(v.years[0], v.years[v.years.length - 1], L, W - R);
  const y = linear(0, nm.max, H - B, T);
  savGeom = { v, x, y, st };

  for (let t = 0; t <= nm.max + 1e-9; t += nm.step) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), stroke: "var(--rule)", "stroke-width": 1 }));
    svg.appendChild(el("text", { x: L - 7, y: y(t) + 4, "text-anchor": "end", "font-size": 11 }, fmtInt(t)));
  }
  for (const yr of v.years) {
    if (yr % 5) continue;
    svg.appendChild(el("text", { x: x(yr), y: H - B + 17, "text-anchor": "middle", "font-size": 11 }, yr));
  }
  st.forEach((band) => {
    const [fill] = LAYER_STYLE[band.key];
    svg.appendChild(el("path", {
      d: bandPath(v.years, band.lo, band.hi, x, y), fill, "fill-opacity": 0.85,
      stroke: "var(--bg)", "stroke-width": 1, "stroke-linejoin": "round",
    }));
  });
  if (v.compare) {
    svg.appendChild(el("path", {
      d: linePath(v.years, v.compare.values, x, y), fill: "none", stroke: "var(--text)",
      "stroke-width": 2, "stroke-dasharray": "5 4",
    }));
    const last = v.compare.values[v.compare.values.length - 1];
    const lx = s.view === "co2" ? x(2033) : x(v.years[v.years.length - 1]) - 4;
    const ly = s.view === "co2" ? y(v.compare.values[v.years.indexOf(2033)]) - 8 : y(last) - 8;
    svg.appendChild(el("text", { x: lx, y: ly, "text-anchor": s.view === "co2" ? "start" : "end", "font-size": 12, class: "strong" }, v.compare.label));
  }
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: "var(--muted)", "stroke-width": 1 }));
  svg.appendChild(el("line", { id: "sav-cross", x1: 0, x2: 0, y1: T, y2: H - B, stroke: "var(--text)", "stroke-width": 1, opacity: 0 }));
  svg.appendChild(el("rect", { id: "sav-hit", x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" }));

  $("#sav-chart-head").textContent = VIEW_HEAD[s.view];
  const leg = $("#sav-legend");
  leg.innerHTML = "";
  [...v.layers].reverse().forEach((l) => {
    const [, label, sw] = LAYER_STYLE[l.key];
    leg.insertAdjacentHTML("beforeend", `<span><i class="sw ${sw}"></i>${label}</span>`);
  });
  if (v.compare) leg.insertAdjacentHTML("beforeend", `<span><i class="sw sw-line"></i>${v.compare.label}, same carbon policy</span>`);

  const scen = s.sav === "none" ? "private cars only" : `shared fleet, ${s.chg === "night" ? "night-only" : "any-hour"} charging, ${s.dm}× miles`;
  $("#sav-desc").textContent = `Scenario ${sum.id} (${scen}, ${s.tax ? "carbon tax" : "no carbon tax"}). ${VIEW_HEAD[s.view]}, `
    + `${v.years[0]} to 2050. Vehicles in 2050: ${fmtInt(sum.vehicles2050)} thousand. Cumulative CO2 2015-2050: ${fmtInt(sum.cumCO2)} million tonnes.`;
  $("#sav-id").textContent = sum.id;

  const pct = (p) => `${Math.round(p)}%`;
  const items = [
    ["Vehicles in 2050", `${fmtInt(sum.vehicles2050)}k`, s.sav === "none" ? "private cars only" : `private cars only: ${fmtInt(sum.vehiclesPrivateOnly2050)}k`],
    ["Shared fleet electric, 2030", sum.sharedEV2030 == null ? "no fleet" : pct(100 * sum.sharedEV2030), "battery-electric share"],
    ["Natural gas, 2035", pct(sum.gas2035), `peak ${pct(sum.gasPeak.share)} in ${sum.gasPeak.year}`],
    ["Solar + wind, 2050", pct(sum.renewables2050), `solar ${pct(sum.mix2050.solar)}, wind ${pct(sum.mix2050.wind)}`],
    ["CO₂, 2015–2050", `${fmtInt(sum.cumCO2)} Mt`, s.sav === "none" ? "cumulative" : `private cars only: ${fmtInt(sum.cumCO2PrivateOnly)} Mt`],
    ["Total system cost", s.sav === "none" ? "baseline" : `${sum.costVsPrivateOnlyPct > 0 ? "+" : "−"}${fmt1(Math.abs(sum.costVsPrivateOnlyPct))}%`, "net present cost vs private cars only"],
  ];
  setReadout($("#sav-readout"), items);

  const rowsYears = v.years.filter((yr) => yr % 5 === 0);
  const head = ["Year", ...v.layers.map((l) => LAYER_STYLE[l.key][1]), "Total"].concat(v.compare ? [v.compare.label] : []);
  const rows = rowsYears.map((yr) => {
    const i = v.years.indexOf(yr);
    const vals = v.layers.map((l) => l.values[i]);
    const r = [String(yr), ...vals.map(fmt1), fmt1(vals.reduce((a, b) => a + b, 0))];
    if (v.compare) r.push(fmt1(v.compare.values[i]));
    return r;
  });
  table($("#sav-table"), head, rows);
}

function syncSavControls() {
  const s = state.sav;
  syncSeg("sav-sav", s.sav);
  syncSeg("sav-tax", s.tax ? "1" : "0");
  syncSeg("sav-chg", s.chg);
  syncSeg("sav-dm", s.dm);
  syncSeg("sav-view", s.view);
  const off = s.sav === "none";
  for (const id of ["fs-chg", "fs-dm"]) {
    $(`#${id}`).classList.toggle("off", off);
    $(`#${id}`).querySelectorAll("button").forEach((b) => { b.disabled = off; });
  }
}

function updateSav() { syncSavControls(); drawSav(); writeUrl(); }

const SAV_PARSE = { sav: (v) => v, tax: (v) => v === "1", chg: (v) => v, dm: Number, view: (v) => v };
for (const key of Object.keys(SAV_PARSE)) {
  document.querySelectorAll(`#sav-${key} button`).forEach((b) => {
    b.addEventListener("click", () => {
      state.sav = applyChange(state.sav, key, SAV_PARSE[key](b.dataset.v));
      updateSav();
    });
  });
}
$("#sav-reset").addEventListener("click", () => { state.sav = normalizeSav({ ...SAV_DEFAULTS }); updateSav(); });

// Crosshair tooltip on the year chart.
const tip = $("#sav-tip");
function svgX(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse()).x;
}
$("#sav-chart").addEventListener("pointermove", (evt) => {
  if (!savGeom) return;
  const svg = $("#sav-chart");
  const { v, x } = savGeom;
  const sx = svgX(svg, evt);
  if (sx < L || sx > W - R) { tip.style.display = "none"; $("#sav-cross").setAttribute("opacity", 0); return; }
  let i = 0;
  v.years.forEach((yr, k) => { if (Math.abs(x(yr) - sx) < Math.abs(x(v.years[i]) - sx)) i = k; });
  const cross = $("#sav-cross");
  cross.setAttribute("x1", x(v.years[i])); cross.setAttribute("x2", x(v.years[i])); cross.setAttribute("opacity", 0.35);
  let html = `<b>${v.years[i]}</b> · ${v.unit}<table>`;
  [...v.layers].reverse().forEach((l) => { html += `<tr><td>${LAYER_STYLE[l.key][1]}</td><td>${fmt1(l.values[i])}</td></tr>`; });
  if (v.compare) html += `<tr><td>${v.compare.label}</td><td>${fmt1(v.compare.values[i])}</td></tr>`;
  tip.innerHTML = html + "</table>";
  const box = svg.getBoundingClientRect(), out = svg.parentElement.getBoundingClientRect();
  const px = evt.clientX - out.left, left = px > out.width / 2 ? px - tip.offsetWidth - 12 : px + 12;
  tip.style.left = `${Math.max(0, left)}px`;
  tip.style.top = `${box.top - out.top + 10}px`;
  tip.style.display = "block";
});
$("#sav-chart").addEventListener("pointerleave", () => { tip.style.display = "none"; const c = $("#sav-cross"); if (c) c.setAttribute("opacity", 0); });

// ---------------------------------------------------------------- panel B ----
const CASE_HINT = (c) => `Gasoline cars ${c.mpg} mpg; EVs ${c.miPerKWh} miles per kWh; grid ${c.gridG} g CO₂ per kWh (Table 5).`;

function drawErev() {
  const { rng, cs } = state.erev;
  const pts = EREV_RANGES.map((r) => erevPoint(r, cs));
  const ev = erevPoint("ev", cs);
  const cur = erevPoint(rng, cs);

  // Chart 1: share vs fleet battery.
  const svg = $("#erev-chart");
  clearSvg(svg);
  const H1 = 330, L1 = 44, R1 = 20, T1 = 16, B1 = 40;
  const W1 = fitWidth(svg, H1), narrow = W1 < 600;
  const x = linear(0, 30, L1, W1 - R1), y = linear(50, 102, H1 - B1, T1);
  for (let t = 50; t <= 100; t += 10) {
    svg.appendChild(el("line", { x1: L1, x2: W1 - R1, y1: y(t), y2: y(t), stroke: "var(--rule)" }));
    svg.appendChild(el("text", { x: L1 - 7, y: y(t) + 4, "text-anchor": "end", "font-size": 11 }, `${t}%`));
  }
  for (let t = 0; t <= 30; t += 5) svg.appendChild(el("text", { x: x(t), y: H1 - B1 + 17, "text-anchor": "middle", "font-size": 11 }, t));
  svg.appendChild(el("text", { x: (L1 + W1 - R1) / 2, y: H1 - 6, "text-anchor": "middle", "font-size": 11 }, narrow ? "Fleet battery capacity (TWh)" : "Battery capacity to convert every U.S. light-duty vehicle (TWh)"));
  svg.appendChild(el("line", { x1: L1, x2: W1 - R1, y1: H1 - B1, y2: H1 - B1, stroke: "var(--muted)" }));
  svg.appendChild(el("path", { d: linePath(pts.map((p) => p.fleetTWh), pts.map((p) => p.evSharePct), x, y), fill: "none", stroke: "var(--c-blue)", "stroke-width": 2 }));
  svg.appendChild(el("path", { d: `M${x(pts[5].fleetTWh)} ${y(pts[5].evSharePct)}L${x(ev.fleetTWh)} ${y(ev.evSharePct)}`, fill: "none", stroke: "var(--c-blue)", "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
  pts.forEach((p) => {
    const sel = p.range === cur.range;
    const g = el("g", { class: "pt", style: "cursor:pointer" });
    g.appendChild(el("title", {}, `${p.range} miles: ${fmt1(p.evSharePct)}% of miles electric, ${fmt1(p.fleetTWh)} TWh`));
    g.appendChild(el("circle", { cx: x(p.fleetTWh), cy: y(p.evSharePct), r: 14, fill: "transparent" }));
    g.appendChild(el("circle", { cx: x(p.fleetTWh), cy: y(p.evSharePct), r: sel ? 8 : 5, fill: "var(--c-blue)", stroke: "var(--bg)", "stroke-width": 2 }));
    if (sel) g.appendChild(el("circle", { cx: x(p.fleetTWh), cy: y(p.evSharePct), r: 12, fill: "none", stroke: "var(--text)", "stroke-width": 1.5 }));
    if (sel) {
      const right = x(p.fleetTWh) + 130 < W1 - R1;
      g.appendChild(el("text", { x: x(p.fleetTWh) + (right ? 12 : -12), y: y(p.evSharePct) + 24, "text-anchor": right ? "start" : "end", "font-size": 12, class: "strong" },
        `${p.range} mi · ${fmt1(p.evSharePct)}%`));
    } else {
      g.appendChild(el("text", { x: x(p.fleetTWh), y: y(p.evSharePct) + (p.range === 25 ? 22 : -12), "text-anchor": "middle", "font-size": 11 }, `${p.range}`));
    }
    g.addEventListener("click", () => { state.erev.rng = p.range; updateErev(); });
    svg.appendChild(g);
  });
  svg.appendChild(el("circle", { cx: x(ev.fleetTWh), cy: y(ev.evSharePct), r: 6, fill: "var(--c-orange)", stroke: "var(--bg)", "stroke-width": 2 }))
    .appendChild(el("title", {}, `All-electric car: 100% electric, ${fmt1(ev.fleetTWh)} TWh`));
  svg.appendChild(el("text", { x: x(ev.fleetTWh) + 8, y: y(ev.evSharePct) - 11, "text-anchor": "end", "font-size": 11 }, `All-electric car, ${fmt1(ev.batteryKWh)} kWh`));
  $("#erev-desc").textContent = `${EREV_CASES[cs].label} assumptions. Electric share rises from 59.4% at 25 miles to 86.8% at 150 miles while fleet battery capacity rises from ${fmt1(pts[0].fleetTWh)} to ${fmt1(pts[5].fleetTWh)} TWh; an all-electric car needs ${fmt1(ev.fleetTWh)} TWh. Selected: ${cur.range} miles.`;

  // Chart 2: CO2 saved bars, fixed scale so the scenarios compare.
  const s2 = $("#erev-co2");
  clearSvg(s2);
  const H2 = 250, L2 = 44, R2 = 14, T2 = 28, B2 = 30;
  const W2 = fitWidth(s2, H2);
  const cats = [...EREV_RANGES, "ev"];
  const band = (W2 - L2 - R2) / cats.length;
  const y2 = linear(0, 1600, H2 - B2, T2);
  for (let t = 0; t <= 1600; t += 400) {
    s2.appendChild(el("line", { x1: L2, x2: W2 - R2, y1: y2(t), y2: y2(t), stroke: "var(--rule)" }));
    s2.appendChild(el("text", { x: L2 - 7, y: y2(t) + 4, "text-anchor": "end", "font-size": 11 }, fmtInt(t)));
  }
  s2.appendChild(el("text", { x: 4, y: 11, "text-anchor": "start", "font-size": 10 }, "Mt CO₂ a year"));
  cats.forEach((c, i) => {
    const p = c === "ev" ? ev : pts[i];
    const sel = c === cur.range || c === "ev";
    const bx = L2 + i * band + band * 0.2, bw = band * 0.6;
    const h = Math.max(1.5, y2(0) - y2(p.co2Saved));
    const r = el("rect", { x: bx, y: y2(0) - h, width: bw, height: h, rx: 3,
      fill: c === "ev" ? "var(--c-orange)" : "var(--c-aqua)", "fill-opacity": sel ? 0.95 : 0.4 });
    r.appendChild(el("title", {}, `${c === "ev" ? "All-electric car" : `${c} miles`}: ${fmt1(p.co2Saved)} Mt CO2 saved a year`));
    s2.appendChild(r);
    if (sel) s2.appendChild(el("text", { x: bx + bw / 2, y: y2(0) - h - 5, "text-anchor": "middle", "font-size": 11, class: "strong" }, fmt1(p.co2Saved)));
    s2.appendChild(el("text", { x: bx + bw / 2, y: H2 - B2 + 17, "text-anchor": "middle", "font-size": 11, class: c === cur.range ? "strong" : "" }, c === "ev" ? (narrow ? "All-EV" : "All-electric") : (narrow && c !== 25 ? `${c}` : `${c} mi`)));
  });
  s2.appendChild(el("line", { x1: L2, x2: W2 - R2, y1: y2(0), y2: y2(0), stroke: "var(--muted)" }));
  $("#erev-co2-desc").textContent = `${EREV_CASES[cs].label} assumptions: ${fmt1(cur.co2Saved)} million tonnes CO2 saved a year at ${cur.range} miles; ${fmt1(ev.co2Saved)} for an all-electric car.`;

  const nx = nextStep(cur.range, cs);
  setReadout($("#erev-readout"), [
    ["Miles on electricity", `${fmt1(cur.evSharePct)}%`, "of 2023 U.S. driving"],
    ["Electric miles", `${fmtInt(cur.electricVMT)} bn`, "a year"],
    ["Battery per car", `${fmt1(cur.batteryKWh)} kWh`, `${EREV_CASES[cs].miPerKWh} miles per kWh`],
    ["Fleet battery", `${fmt1(cur.fleetTWh)} TWh`, "every light-duty vehicle"],
    ["CO₂ saved", `${fmt1(cur.co2Saved)} Mt`, `a year, of ${fmt1(EREV_ICE_CO2_MT[cs])} all-gasoline`],
    ["Next 25 miles", nx ? `+${fmt1(nx.sharePts)} pts` : "—", nx ? `for +${fmt1(nx.twh)} TWh of battery` : "150 miles is the longest range studied"],
  ]);
  $("#erev-compare").textContent = `All-electric car (Table 6, “EV”, ${EREV_CASES[cs].label.toLowerCase()} case): 100% of miles, ${fmt1(ev.batteryKWh)} kWh per car, `
    + `${fmt1(ev.fleetTWh)} TWh for the fleet, ${fmt1(ev.co2Saved)} Mt of CO₂ saved a year.`;
  table($("#erev-table"), ["Range", "Electric share", "Electric miles (bn/yr)", "Battery (kWh)", "Fleet battery (TWh)", "CO₂ saved (Mt/yr)"],
    [...pts, ev].map((p) => [p.range === "ev" ? "All-electric" : `${p.range} mi`, `${fmt1(p.evSharePct)}%`, fmt1(p.electricVMT), fmt1(p.batteryKWh), fmt1(p.fleetTWh), fmt1(p.co2Saved)]));
}

function syncErevControls() {
  const { rng, cs } = state.erev;
  const inp = $("#erev-rng");
  inp.value = rng;
  inp.setAttribute("aria-valuetext", `${rng} miles`);
  $("#erev-rng-out").textContent = `${rng} miles`;
  syncSeg("erev-case", cs);
  $("#erev-case-hint").textContent = CASE_HINT(EREV_CASES[cs]);
}
function updateErev() { syncErevControls(); drawErev(); writeUrl(); }

$("#erev-rng").addEventListener("input", (e) => { state.erev.rng = snapRange(e.target.value); updateErev(); });
document.querySelectorAll("#erev-case button").forEach((b) => b.addEventListener("click", () => { state.erev.cs = b.dataset.v; updateErev(); }));
$("#erev-reset").addEventListener("click", () => { state.erev = { ...EREV_DEFAULTS }; updateErev(); });

// ------------------------------------------------------------- copy link ----
document.querySelectorAll(".copy-link").forEach((btn) => btn.addEventListener("click", async () => {
  const said = btn.textContent;
  const qs = toQuery(state);
  const url = `${location.origin}${location.pathname}${qs ? `?${qs}` : ""}`;
  try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; } catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
}));

updateSav();
updateErev();
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lastWidth) < 20) return;
  lastWidth = window.innerWidth;
  drawSav(); drawErev();
});
