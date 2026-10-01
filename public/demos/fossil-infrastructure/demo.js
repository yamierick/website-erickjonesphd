// DOM + SVG rendering, event wiring and URL state for the fossil-infrastructure demo.
import { GEO_LENSES, GEO_STATE_NOTES, GEO_EXISTING_US_GW, GEO_TABLE5, CCS, DC, DC_LOAD_MW, DC_BASELINE_LCOE,
  DC_FUEL, DC_SOURCES, DC_ISLANDING } from "./data.js";
import { geoSeries, geoShare, lensStates, isStudyState, GEO_MEASURES, GEO_CATS, ccsCumulative, ccsThrough,
  ccsProject, CCS_MEASURES, dcScenario, dcMix, dcCoverage, dcIsGeothermal, parseState, serializeState, DEFAULTS } from "./model.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const state = parseState(location.search);

function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
const narrow = (svg) => (svg.getBoundingClientRect().width || 720) < 560;
function clear(svg) { [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title") svg.removeChild(c); }); }
const fmt = (v, d = 0) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (v) => "$" + pub(v) + "M";
const pub = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
function readout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    d.append(dt, dd); dl.appendChild(d);
  }
}
function syncSeg(id, v) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    const on = b.dataset.v === v;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

// ---------- tooltip ----------
const tip = $("#tip");
function showTip(e, text) {
  tip.textContent = text; tip.style.display = "block";
  const x = e.pageX + 12, y = e.pageY + 12;
  tip.style.left = Math.min(x, window.scrollX + document.documentElement.clientWidth - tip.offsetWidth - 8) + "px";
  tip.style.top = y + "px";
}
const hideTip = () => { tip.style.display = "none"; };

// ================= Panel A =================
let STATES = null;
async function loadStates() {
  const r = await fetch(new URL("./states.json", import.meta.url));
  STATES = await r.json();
  const svg = $("#map");
  svg.setAttribute("viewBox", STATES.viewBox.join(" "));
}

function drawMap() {
  const svg = $("#map");
  clear(svg);
  if (!STATES) return;
  const lit = lensStates(state.lens);
  const g = el("g");
  const labels = el("g");
  for (const s of STATES.states) {
    const study = isStudyState(s.abbr);
    const cls = ["st"];
    if (study) cls.push("study");
    if (study && lit.has(s.abbr)) cls.push("lit");
    if (s.abbr === state.st) cls.push("sel");
    const p = el("path", { d: s.d, class: cls.join(" ") });
    if (study) {
      p.addEventListener("click", () => { state.st = state.st === s.abbr ? "" : s.abbr; update(); });
      p.addEventListener("mousemove", (e) => showTip(e, s.name + (lit.has(s.abbr) ? " — named for this finding" : "")));
      p.addEventListener("mouseleave", hideTip);
      labels.appendChild(el("text", { x: s.cx, y: s.cy + 4, "text-anchor": "middle", class: "ab" }, s.abbr));
    }
    g.appendChild(p);
  }
  // Draw the selected state last so its outline is on top.
  const sel = [...g.childNodes].find((n) => n.classList.contains("sel"));
  if (sel) g.appendChild(sel);
  svg.append(g, labels);
  const L = GEO_LENSES[state.lens];
  $("#lens-label").textContent = `${L.label} (${L.cite})`;
  $("#map-title").textContent = `Map of the contiguous United States with the eight study states; highlighted: ${[...lit].join(", ")}`;

  const ul = $("#st-notes");
  ul.innerHTML = "";
  const notes = state.st ? GEO_STATE_NOTES[state.st] : null;
  const name = state.st ? STATES.states.find((s) => s.abbr === state.st).name : "";
  if (notes) {
    for (const n of notes) { const li = document.createElement("li"); li.textContent = `${name}: ${n}`; ul.appendChild(li); }
  } else {
    const li = document.createElement("li"); li.style.listStyle = "none"; li.style.marginLeft = "-1.1rem";
    li.textContent = "Click a study state, or choose one from the list, to read what the paper says about it.";
    ul.appendChild(li);
  }
}

function drawGeoChart() {
  const svg = $("#geo-chart");
  clear(svg);
  const s = geoSeries(state.gm, state.gc);
  const all = geoSeries(state.gm, "all");
  const n = s.values.length;
  const nw = narrow(svg);
  const W = nw ? 420 : 720, rowH = 40, T = 8, L = nw ? 92 : 150, R = nw ? 84 : 110;
  const H = T + n * rowH + 8;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const max = Math.max(...all.values) || 1;
  const x = (v) => L + (v / max) * (W - L - R);
  s.classes.forEach((c, i) => {
    const y = T + i * rowH;
    svg.appendChild(el("text", { x: 0, y: y + 17, class: "lbl strong" }, c.label));
    svg.appendChild(el("text", { x: 0, y: y + 32, class: "small" }, c.temp));
    if (state.gc !== "all") {
      svg.appendChild(el("rect", { x: L, y: y + 6, width: Math.max(0, x(all.values[i]) - L), height: 24, rx: 3, fill: "var(--ghost)" }));
    }
    const w = Math.max(s.values[i] > 0 ? 1.5 : 0, x(s.values[i]) - L);
    const r = el("rect", { x: L, y: y + 6, width: w, height: 24, rx: 3, fill: "var(--geo)", "fill-opacity": .78 });
    r.appendChild(el("title", {}, `${c.label}: ${fmt(s.values[i], s.unit === "GW" ? 1 : 0)} ${s.unit}`));
    svg.appendChild(r);
    const vx = Math.max(x(s.values[i]), state.gc !== "all" ? x(all.values[i]) : 0) + 6;
    svg.appendChild(el("text", { x: vx, y: y + 23, class: "val" }, `${fmt(s.values[i], s.unit === "GW" ? 1 : 0)} ${s.unit === "sq mi" ? "sq mi" : s.unit === "GW" ? "GW" : ""}`.trim()));
  });
  svg.appendChild(el("line", { x1: L, x2: L, y1: T, y2: T + n * rowH, class: "axis" }));
  $("#geo-title").textContent = `${s.label} by geothermal class, ${GEO_CATS[state.gc]} (${s.table})`;
  $("#geo-sub").textContent = `${s.label} by geothermal class · ${GEO_CATS[state.gc]} · ${s.table}`;
  const lg = $("#geo-legend");
  lg.innerHTML = state.gc === "all" ? "" :
    `<span><i class="sw sw-geo"></i>${GEO_CATS[state.gc]}</span><span><i class="sw sw-ghost"></i>All land in the study area</span>`;

  const unit = s.unit === "GW" ? " GW" : s.unit === "sq mi" ? " sq mi" : "";
  const items = [[`Total, ${GEO_CATS[state.gc]} (${s.table})`, fmt(s.printedTotal, s.unit === "GW" ? 1 : 0) + unit]];
  if (state.gc !== "all") items.push(["Share of all land's total", Math.round(geoShare(state.gm, state.gc) * 100) + "%"]);
  if (state.gm === "egs") items.push(["Existing U.S. geothermal plants (§4.1)", "≈" + GEO_EXISTING_US_GW + " GW"]);
  if (state.gm === "facilities") items.push(["Average plant size, Class 1 / 2 / 3", GEO_TABLE5.avgMW.map((v) => fmt(v, 1)).join(" / ") + " MW"]);
  if (state.gm === "wellsGW") items.push(["Orphaned wells on Class 1–3 ground", fmt(geoSeries("wells", state.gc).values.slice(0, 3).reduce((a, b) => a + b, 0))]);
  if (state.gm === "wells" || state.gm === "area") items.push(["Of which Class 1–3 (hot enough)", fmt(s.values.slice(0, 3).reduce((a, b) => a + b, 0)) + unit]);
  readout($("#geo-readout"), items);
}

// ================= Panel B =================
function drawCcs() {
  const svg = $("#ccs-chart");
  clear(svg);
  const m = CCS[state.cm];
  const nw = narrow(svg);
  const W = nw ? 420 : 720, H = nw ? 320 : 360, L = nw ? 44 : 58, R = nw ? 10 : 16, T = 18, B = 40;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x = (yr) => L + (yr / 30) * (W - L - R);
  const q = state.cq;
  let yMax, series;
  if (q === "cumulative") {
    series = ccsCumulative(state.cm);
    yMax = Math.max(...series.single, ...series.phased) * 1.08;
  } else {
    const v = m[q];
    yMax = Math.max(v.single, ...v.phases) * 1.15;
  }
  const y = (v) => H - B - (v / yMax) * (H - T - B);
  // grid + y labels
  const step = niceStep(yMax / 5);
  for (let v = 0; v <= yMax; v += step) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "gridl" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "small" }, fmt(v, step < 1 ? 1 : 0)));
  }
  svg.appendChild(el("text", { x: L - 6, y: T - 5, "text-anchor": "end", class: "small" }, CCS_MEASURES[q].unit));
  for (let p = 0; p <= 6; p++) {
    svg.appendChild(el("text", { x: x(p * 5), y: H - B + 16, "text-anchor": "middle", class: "small" }, p === 0 ? "Year 0" : String(p * 5)));
  }
  for (let p = 1; p <= 6; p++) {
    svg.appendChild(el("text", { x: x(p * 5 - 2.5), y: H - B + 32, "text-anchor": "middle", class: "small" }, (nw ? "P" : "Phase ") + p));
  }
  const cut = state.ph * 5;
  if (q === "cumulative") {
    const line = (arr, attrs) => {
      let d = "";
      arr.forEach((v, i) => { d += (i ? " L " : "M ") + x(i) + " " + y(v); });
      svg.appendChild(el("path", { d, fill: "none", ...attrs }));
    };
    svg.appendChild(el("rect", { x: x(cut), y: T, width: x(30) - x(cut), height: H - T - B, fill: "var(--bg)", opacity: 0 }));
    line(series.single, { stroke: "var(--text)", "stroke-width": 2, "stroke-dasharray": "6 4" });
    line(series.phased, { stroke: "var(--geo)", "stroke-width": 3 });
    svg.appendChild(el("line", { x1: x(cut), x2: x(cut), y1: T, y2: H - B, stroke: "var(--muted)", "stroke-width": 1 }));
    const a = series.single[cut], b = series.phased[cut];
    const right = cut > (nw ? 14 : 24);
    const lx = right ? x(cut) - 6 : x(cut) + 6, anchor = right ? "end" : "start";
    svg.appendChild(el("circle", { cx: x(cut), cy: y(a), r: 4, fill: "var(--text)" }));
    svg.appendChild(el("circle", { cx: x(cut), cy: y(b), r: 4, fill: "var(--geo)" }));
    svg.appendChild(el("text", { x: lx, y: y(a) - 8, "text-anchor": anchor, class: "val" }, "All at once " + money(a)));
    svg.appendChild(el("text", { x: lx, y: y(b) + 18, "text-anchor": anchor, class: "val" }, "Phased " + money(b)));
  } else {
    const v = m[q];
    v.phases.forEach((val, i) => {
      const x0 = x(i * 5) + 5, x1 = x(i * 5 + 5) - 5;
      const r = el("rect", { x: x0, y: y(val), width: x1 - x0, height: y(0) - y(val), rx: 2, fill: "var(--geo)",
        "fill-opacity": i < state.ph ? .8 : .22 });
      r.appendChild(el("title", {}, `Phase ${i + 1}: ${pub(val)} ${CCS_MEASURES[q].unit}`));
      svg.appendChild(r);
      svg.appendChild(el("text", { x: (x0 + x1) / 2, y: y(val) - 5, "text-anchor": "middle", class: "val",
        opacity: i < state.ph ? 1 : .45 }, pub(val)));
    });
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v.single), y2: y(v.single), stroke: "var(--text)", "stroke-width": 2, "stroke-dasharray": "6 4" }));
    svg.appendChild(el("text", { x: L + 6, y: y(v.single) - 6, "text-anchor": "start", class: "val" }, `All at once: ${pub(v.single)}`));
  }
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(0), y2: y(0), class: "axis" }));
  $("#ccs-title").textContent = `${CCS_MEASURES[q].label}, phased design versus all at once, ${m.label} (${m.table})`;
  $("#ph-out").textContent = `${state.ph} (year ${state.ph * 5})`;
  $("#cm-hint").textContent = state.cm === "cap"
    ? "Both designs must store 3 million tonnes of CO₂ a year (Table 1)."
    : "Each design stores only CO₂ that pays under 45Q credits of $50/t (saline) and $35/t (oil recovery) (Table 2).";

  const t = ccsThrough(state.cm, state.ph);
  const p = ccsProject(state.cm);
  const items = [
    [`Transport, years 1–${t.year}: phased`, money(t.phased)],
    [`Transport, years 1–${t.year}: all at once`, money(t.single)],
    [`Pipeline in phase ${t.phase}`, `${pub(t.pipePhased)} km vs ${pub(t.pipeSingle)} km`],
  ];
  if (state.cm === "cap") {
    items.push(["30-year transport (§4.2)", `${money(m.printedTotals.phased)} vs ${money(m.printedTotals.single)}, −${m.printedTotals.savingPct}%`]);
  } else {
    items.push(["Phased design (§4.2)", `${m.printedTotals.profitPct}% more profitable, ${m.printedTotals.storedPct}% more CO₂`]);
  }
  readout($("#ccs-readout"), items);
}
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

// ================= Panel C =================
const FUEL_COLOR = { none: "var(--geo)", gas: "var(--gas)", uranium: "var(--uranium)" };
const SRC_COLOR = { geo: "var(--geo)", solar: "var(--solar)", rice: "var(--gas)", micro: "var(--gas)", smr: "var(--uranium)", grid: "var(--grid)", bess: "var(--battery)" };

function drawDc() {
  const svg = $("#dc-chart");
  clear(svg);
  const nw = narrow(svg);
  const W = nw ? 420 : 720, H = nw ? 340 : 380, L = nw ? 50 : 56, R = nw ? 14 : 20, T = 16, B = 44;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x0 = 60, x1 = 100, y0 = 50, y1 = 102;
  const x = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const y = (v) => H - B - ((v - y0) / (y1 - y0)) * (H - T - B);
  for (let v = 60; v <= 100; v += 10) {
    svg.appendChild(el("line", { x1: x(v), x2: x(v), y1: T, y2: H - B, class: "gridl" }));
    svg.appendChild(el("text", { x: x(v), y: H - B + 16, "text-anchor": "middle", class: "small" }, "$" + v));
  }
  for (let v = 50; v <= 100; v += 10) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "gridl" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "small" }, v + "%"));
  }
  svg.appendChild(el("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", class: "lbl" }, nw ? "Blended cost, $/MWh (Table 14)" : "Blended cost of electricity ($/MWh, Table 14) — cheaper to the left"));
  const yl = el("text", { x: 14, y: (T + H - B) / 2, "text-anchor": "middle", class: "lbl", transform: `rotate(-90 14 ${(T + H - B) / 2})` }, nw ? "Outage protection (Table 15)" : "Outage protection (ALOLP, Table 15)");
  svg.appendChild(yl);
  svg.appendChild(el("line", { x1: x(DC_BASELINE_LCOE), x2: x(DC_BASELINE_LCOE), y1: T, y2: H - B, stroke: "var(--text)", "stroke-width": 1.5, "stroke-dasharray": "6 4" }));
  svg.appendChild(el("text", { x: x(DC_BASELINE_LCOE) + 5, y: T + 12, class: "small" }, "Grid only $75"));
  const labelPos = { S1: [10, 4, "start"], S2: [10, 4, "start"], S3: [10, 4, "start"], S4: [10, 4, "start"], S5: [-10, 4, "end"], S6: [10, 4, "start"] };
  for (const d of DC) {
    const faded = state.dg === "geo" && !dcIsGeothermal(d.id);
    const sel = d.id === state.dc;
    const g = el("g", { opacity: faded ? .25 : 1, style: "cursor:pointer" });
    if (sel) g.appendChild(el("circle", { cx: x(d.lcoe), cy: y(d.alolp), r: 13, fill: "none", stroke: "var(--text)", "stroke-width": 2 }));
    const c = el("circle", { cx: x(d.lcoe), cy: y(d.alolp), r: 8, fill: FUEL_COLOR[d.fuel], stroke: "var(--bg)", "stroke-width": 1.5 });
    c.appendChild(el("title", {}, `${d.id} ${d.name}: $${d.lcoe.toFixed(2)}/MWh, ${d.alolpGT ? ">" : ""}${d.alolp}%`));
    g.appendChild(c);
    const [dx, dy, anchor] = labelPos[d.id];
    g.appendChild(el("text", { x: x(d.lcoe) + dx + (sel ? 5 * Math.sign(dx) : 0), y: y(d.alolp) + dy, "text-anchor": anchor, class: sel ? "val strong" : "val" }, d.id));
    g.addEventListener("click", () => { state.dc = d.id; update(); });
    svg.appendChild(g);
  }
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, class: "axis" }));

  // Mix bar
  const s = dcScenario(state.dc);
  const mix = dcMix(state.dc);
  const mv = $("#mix-chart");
  clear(mv);
  const mnw = narrow(mv);
  const MW = mnw ? 420 : 720, ML = mnw ? 96 : 150, MR = 12, maxMW = 400;
  mv.setAttribute("viewBox", `0 0 ${MW} 130`);
  const mx = (v) => ML + (v / maxMW) * (MW - ML - MR);
  mv.appendChild(el("text", { x: 0, y: 30, class: "lbl strong" }, "Installed (MW)"));
  mv.appendChild(el("text", { x: 0, y: 78, class: "lbl strong" }, "Carries alone"));
  let acc = 0;
  for (const part of mix) {
    const w = mx(acc + part.mw) - mx(acc);
    const r = el("rect", { x: mx(acc), y: 14, width: Math.max(0, w - 1), height: 26, fill: SRC_COLOR[part.key], "fill-opacity": .85 });
    r.appendChild(el("title", {}, `${DC_SOURCES[part.key]}: ${part.mw} MW`));
    mv.appendChild(r);
    if (w > 28) mv.appendChild(el("text", { x: mx(acc) + w / 2, y: 32, "text-anchor": "middle", class: "small", style: "fill:var(--bg);font-weight:600" }, part.mw));
    acc += part.mw;
  }
  const cov = el("rect", { x: ML, y: 62, width: mx(s.maxMW) - ML, height: 26, fill: FUEL_COLOR[s.fuel], "fill-opacity": .85 });
  mv.appendChild(cov);
  mv.appendChild(el("text", { x: mx(s.maxMW) + 6, y: 80, class: "val" }, `${s.maxMW} MW of ${DC_LOAD_MW}`));
  mv.appendChild(el("line", { x1: mx(DC_LOAD_MW), x2: mx(DC_LOAD_MW), y1: 6, y2: 96, stroke: "var(--text)", "stroke-width": 2 }));
  mv.appendChild(el("text", { x: mx(DC_LOAD_MW), y: 112, "text-anchor": "middle", class: "small" }, "250 MW load"));
  for (let v = 0; v <= maxMW; v += 100) mv.appendChild(el("text", { x: mx(v), y: 126, "text-anchor": "middle", class: "small" }, v));
  $("#mix-title").textContent = `${s.id} installed capacity: ` + mix.map((p) => `${DC_SOURCES[p.key]} ${p.mw} MW`).join(", ") + `; carries ${s.maxMW} of 250 MW alone`;
  $("#dc-name").textContent = `${s.id}: ${s.name}`;

  readout($("#dc-readout"), [
    ["Blended cost (Table 14)", `$${s.lcoe.toFixed(2)}/MWh`],
    ["vs grid only", `${s.lcoe < DC_BASELINE_LCOE ? "−" : "+"}$${Math.abs(s.lcoe - DC_BASELINE_LCOE).toFixed(2)}/MWh`],
    ["Outage protection (Table 15)", `${s.alolpGT ? ">" : ""}${s.alolp.toFixed(1)}%`],
    ["Carries alone in an outage", `${Math.round(dcCoverage(s.id) * 100)}% of the load`],
    ["Fuel it depends on", DC_FUEL[s.fuel]],
    ["Islanding", DC_ISLANDING[s.id]],
  ]);
}

// ================= State, URL, wiring =================
let urlTimer = null;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = serializeState(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, 120);
}

function update() {
  syncSeg("lens", state.lens); syncSeg("gm", state.gm); syncSeg("gc", state.gc);
  syncSeg("cm", state.cm); syncSeg("cq", state.cq); syncSeg("dcsel", state.dc); syncSeg("dg", state.dg);
  $("#st").value = state.st; $("#ph").value = state.ph;
  drawMap(); drawGeoChart(); drawCcs(); drawDc();
  writeUrl();
}

const segKeys = { lens: "lens", gm: "gm", gc: "gc", cm: "cm", cq: "cq", dcsel: "dc", dg: "dg" };
for (const [id, key] of Object.entries(segKeys)) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { state[key] = b.dataset.v; update(); }));
}
$("#st").addEventListener("change", (e) => { state.st = e.target.value; update(); });
$("#ph").addEventListener("input", (e) => { state.ph = Number(e.target.value); update(); });
const PANEL_KEYS = { geo: ["lens", "st", "gm", "gc"], ccs: ["cm", "cq", "ph"], dc: ["dc", "dg"] };
document.querySelectorAll(".js-reset").forEach((b) => b.addEventListener("click", () => {
  for (const k of PANEL_KEYS[b.dataset.panel]) state[k] = DEFAULTS[k];
  update();
}));
document.querySelectorAll(".js-share").forEach((b) => b.addEventListener("click", async (e) => {
  const btn = e.currentTarget, said = btn.textContent;
  const qs = serializeState(state);
  const url = location.origin + location.pathname + (qs ? "?" + qs : "");
  try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; } catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
}));

update();
let rsz = null;
window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { drawGeoChart(); drawCcs(); drawDc(); }, 150); });
loadStates().then(drawMap).catch(() => {
  $("#st-notes").innerHTML = "<li>The map outline file could not be loaded.</li>";
});
