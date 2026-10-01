// DOM + SVG rendering, event wiring and URL state for the Texas grid demo.
import { GEN_GROUPS, SEASONS, TIMES, HEX_URL, TX_YEARS, DER_N, DC, DC_GRID_BASELINE, DC_LOAD_MW, DC_CAP_KEYS } from "./data.js";
import {
  viewIndex, hexPath, mapCells, mixSummary,
  TX_VIEWS, txSeries, txDiff, txYearSummary, electrificationGain,
  DER_METRICS, derChart, derPoint,
  FUEL_KINDS, dcScenario, dcGasRange,
  DEFAULTS, parseState, serializeState,
} from "./model.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const state = parseState(location.search);

const COLOR = {
  gas: "var(--c-gas)", wind: "var(--c-wind)", solar: "var(--c-solar)", nuke: "var(--c-nuke)", other: "var(--c-other)",
  electricity: "var(--accent)", liquids: "var(--c-liq)", otherfuel: "var(--c-misc)",
  coal: "var(--c-coal)", nuclear: "var(--c-nuke)", othergen: "var(--c-misc)",
  none: "var(--accent)", uranium: "var(--c-nuke)",
};

function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function clearSvg(svg) {
  [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title") svg.removeChild(c); });
}
function readout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v, sub] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    if (sub) { const s = document.createElement("small"); s.textContent = sub; dd.appendChild(s); }
    d.append(dt, dd); dl.appendChild(d);
  }
}
function legend(div, items) {
  div.innerHTML = "";
  for (const [cls, color, label] of items) {
    const s = document.createElement("span");
    const i = document.createElement("i");
    i.className = `sw ${cls || ""}`;
    if (color) i.style.background = color;
    s.append(i, document.createTextNode(label));
    div.appendChild(s);
  }
}
/** Build a row of segmented buttons; returns a function that marks the current one. */
function seg(container, options, onPick) {
  container.innerHTML = "";
  for (const o of options) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.v = o.key;
    if (o.color) { const i = document.createElement("i"); i.className = "sw"; i.style.background = o.color; b.appendChild(i); }
    b.appendChild(document.createTextNode(o.label));
    b.addEventListener("click", () => onPick(o.key));
    container.appendChild(b);
  }
  return (v) => container.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.v === String(v);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
/** Narrow screens get a narrower drawing so text stays legible when the SVG scales down. */
function chartW(svg) {
  const w = svg.parentElement.clientWidth;
  return w && w < 560 ? 420 : 720;
}
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const pct = (v) => `${Math.round(v * 100)}%`;
const signed = (v, d = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;

// ---------------------------------------------------------------- URL state
let urlTimer = null;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = serializeState(state);
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}${location.hash}` : `${location.pathname}${location.hash}`);
  }, 120);
}
document.querySelectorAll(".copy-link").forEach((btn) => btn.addEventListener("click", async () => {
  const said = btn.textContent;
  const qs = serializeState(state);
  const url = `${location.origin}${location.pathname}${qs ? `?${qs}` : ""}`;
  try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; } catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
}));
const RESET = {
  a: ["season", "time", "hi"], b: ["txView", "txMode", "txYear"], c: ["derMetric", "derN"], d: ["dc"],
};
document.querySelectorAll("[data-reset]").forEach((btn) => btn.addEventListener("click", () => {
  for (const k of RESET[btn.dataset.reset]) state[k] = DEFAULTS[k];
  renderAll();
}));

// ---------------------------------------------------------------- (a) map
let HEX = null;
const aSvg = $("#a-map"), aTip = $("#a-tip");
let hexNodes = [];
const markSeason = seg($("#a-season"), SEASONS, (v) => { state.season = v; renderA(); writeUrl(); });
const markTime = seg($("#a-time"), TIMES, (v) => { state.time = v; renderA(); writeUrl(); });
const markHi = seg($("#a-hi"), [{ key: "all", label: "All" }, ...GEN_GROUPS.map((g) => ({ ...g, color: COLOR[g.key] }))],
  (v) => { state.hi = v; renderA(); writeUrl(); });

function buildMap() {
  clearSvg(aSvg);
  // Fit the view to the hexagons themselves (they are the ERCOT footprint).
  const pad = 6, hx = HEX.hex.hx, hr = HEX.hex.hr;
  const x0 = Math.min(...HEX.cx) - hx - pad, x1 = Math.max(...HEX.cx) + hx + pad;
  const y0 = Math.min(...HEX.cy) - hr - pad, y1 = Math.max(...HEX.cy) + hr + pad;
  aSvg.setAttribute("viewBox", `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`);
  const g = el("g", { class: "hexes" });
  const paths = HEX.cx.map((cx, i) => hexPath(cx, HEX.cy[i], hx, hr));
  hexNodes = paths.map((d, i) => {
    const p = el("path", { d, "data-i": i });
    g.appendChild(p);
    return p;
  });
  aSvg.appendChild(g);
  // Weather-zone lines are clipped to the hexagon footprint so they stop at the ERCOT edge.
  const defs = el("defs");
  const clip = el("clipPath", { id: "ercot-clip" });
  clip.appendChild(el("path", { d: paths.join("") }));
  defs.appendChild(clip);
  aSvg.appendChild(defs);
  const z = el("g", { "clip-path": "url(#ercot-clip)" });
  for (const w of HEX.wz) z.appendChild(el("path", { d: w.d, class: "zone" }));
  aSvg.appendChild(z);
  const c = el("g");
  for (const p of HEX.places) {
    c.appendChild(el("circle", { cx: p.x, cy: p.y, r: 3.5, class: "dot" }));
    const east = p.x > x1 - 110; // labels near the right edge go on the left of their dot
    c.appendChild(el("text", { x: east ? p.x - 7 : p.x + 7, y: p.y - 5, class: "city", "font-size": 13,
      "text-anchor": east ? "end" : "start" }, p.name));
  }
  aSvg.appendChild(c);

  const showTip = (evt) => {
    const t = evt.target.closest("path[data-i]");
    if (!t) { aTip.style.display = "none"; return; }
    const i = Number(t.dataset.i);
    const k = viewIndex(state.season, state.time);
    const cell = mapCells(HEX, k)[i];
    const county = HEX.counties[HEX.county[i]] || "";
    const src = cell.lead < 0 ? "Under 5 MW on average" : `Largest source: ${GEN_GROUPS[cell.lead].label}`;
    aTip.textContent = `${county ? county + " · " : ""}${src} · ${cell.mw >= 10 ? Math.round(cell.mw).toLocaleString() : cell.mw} MW average`;
    const box = aSvg.parentElement.getBoundingClientRect();
    aTip.style.display = "block";
    aTip.style.left = `${Math.min(evt.clientX - box.left + 12, box.width - 220)}px`;
    aTip.style.top = `${evt.clientY - box.top + 12}px`;
  };
  aSvg.addEventListener("pointermove", showTip);
  aSvg.addEventListener("pointerleave", () => { aTip.style.display = "none"; });
}

function renderA() {
  markSeason(state.season); markTime(state.time); markHi(state.hi);
  const t = TIMES.find((o) => o.key === state.time);
  $("#a-hours").textContent = `${t.label}: ${t.hours}, local time.${state.season === "winter" ? " Winter is December to February." : ""}`;
  if (!HEX) return;
  // Keep city labels legible at any width: about 11 px on screen, never smaller than 13 map units.
  const vbw = aSvg.viewBox.baseVal.width, cw = aSvg.clientWidth || vbw;
  const unit = vbw / cw;
  aSvg.querySelectorAll(".city").forEach((t) => t.setAttribute("font-size", Math.max(13, 11 * unit).toFixed(1)));
  aSvg.querySelectorAll(".dot").forEach((d) => d.setAttribute("r", Math.max(3.5, 2.5 * unit).toFixed(1)));
  const k = viewIndex(state.season, state.time);
  const cells = mapCells(HEX, k, state.hi);
  cells.forEach((c, i) => {
    const p = hexNodes[i];
    if (c.lead < 0) {
      p.setAttribute("fill", "var(--rule)"); p.setAttribute("fill-opacity", c.dim ? ".25" : ".7");
    } else {
      p.setAttribute("fill", COLOR[GEN_GROUPS[c.lead].key]);
      p.setAttribute("fill-opacity", String(c.dim ? 0.08 : c.strength.toFixed(2)));
    }
  });
  const m = mixSummary(HEX, k);
  // Mix bar
  const mix = $("#a-mix");
  clearSvg(mix);
  let x = 0;
  const W = chartW(mix);
  mix.setAttribute("viewBox", `0 0 ${W} 64`);
  m.shares.forEach((s, j) => {
    const w = s * W;
    if (w <= 0) return;
    const g = GEN_GROUPS[j];
    const r = el("rect", { x: x + 1, y: 4, width: Math.max(0, w - 2), height: 26, rx: 3, fill: COLOR[g.key],
      "fill-opacity": state.hi === "all" || state.hi === g.key ? 1 : 0.25 });
    r.appendChild(el("title", {}, `${g.label}: ${pct(s)} (${(m.mw[j] / 1000).toFixed(1)} GW)`));
    mix.appendChild(r);
    if (w > 70) mix.appendChild(el("text", { x: x + 6, y: 48, "font-size": 13 }, `${g.label} ${pct(s)}`));
    else if (w > 30) mix.appendChild(el("text", { x: x + 4, y: 48, "font-size": 12 }, pct(s)));
    x += w;
  });
  const season = SEASONS.find((o) => o.key === state.season).label;
  const top = m.shares.indexOf(Math.max(...m.shares));
  const hexTop = m.leads.indexOf(Math.max(...m.leads));
  readout($("#a-readout"), [
    ["ERCOT average output", `${m.totalGW.toFixed(1)} GW`, `${season}, ${t.label.toLowerCase()}`],
    ["Largest source, all ERCOT", GEN_GROUPS[top].label, `${pct(m.shares[top])} of output`],
    ["Leads the most hexagons", GEN_GROUPS[hexTop].label, `${m.leads[hexTop]} of ${m.leads.reduce((a, b) => a + b, 0)} with 5 MW or more`],
    ["Solar share", pct(m.shares[2]), `wind ${pct(m.shares[1])}, gas ${pct(m.shares[0])}`],
  ]);
  $("#a-table").innerHTML = `<table><thead><tr><th>Source</th><th>Average GW</th><th>Share</th><th>Hexagons led</th></tr></thead><tbody>${
    GEN_GROUPS.map((g, j) => `<tr><td>${g.label}</td><td>${(m.mw[j] / 1000).toFixed(1)}</td><td>${pct(m.shares[j])}</td><td>${m.leads[j]}</td></tr>`).join("")
  }</tbody></table>`;
}
legend($("#a-legend"), [...GEN_GROUPS.map((g) => ["", COLOR[g.key], g.label]), ["faint", null, "Under 5 MW"]]);

// ---------------------------------------------------------------- (b) sectors
const markView = seg($("#b-view"), TX_VIEWS, (v) => { state.txView = v; renderB(); writeUrl(); });
const bMode = $("#b-mode");
bMode.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.txMode = b.dataset.v; renderB(); writeUrl(); }));
const bYear = $("#b-year");
bYear.addEventListener("input", () => { state.txYear = Number(bYear.value); renderB(); writeUrl(); });

function niceStep(range, n = 5) {
  const raw = range / n, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

function renderB() {
  markView(state.txView);
  bMode.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.v === state.txMode; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
  });
  bYear.value = state.txYear; $("#b-year-out").textContent = state.txYear;
  const s = txSeries(state.txView);
  const svg = $("#b-chart"); clearSvg(svg);
  const W = chartW(svg), H = 380, L = 44, R = 6, T = 30, B = 34;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const n = TX_YEARS.length, slot = (W - L - R) / n;
  const sel = TX_YEARS.indexOf(state.txYear);
  const view = TX_VIEWS.find((v) => v.key === state.txView);
  svg.querySelector("title").textContent = `${view.label}: energy ${view.sector ? "use by fuel" : "generation by source"}, reference and solar-and-wind targeted scenarios, ${state.txMode === "diff" ? "difference" : "levels"}, 2015 to 2050`;

  let lo = 0, hi = 0, vals;
  if (state.txMode === "levels") {
    vals = null;
    for (let i = 0; i < n; i++) for (const sc of ["ref", "sw"]) hi = Math.max(hi, s.groups.reduce((a, g) => a + s[sc][g.key][i], 0));
  } else {
    vals = txDiff(s);
    for (let i = 0; i < n; i++) {
      let p = 0, q = 0;
      for (const g of s.groups) { const v = vals[g.key][i]; if (v > 0) p += v; else q += v; }
      hi = Math.max(hi, p); lo = Math.min(lo, q);
    }
    const m = Math.max(hi, -lo, 0.01); hi = Math.max(hi, m * 0.15); lo = Math.min(lo, -m * 0.15);
  }
  const step = niceStep(hi - lo);
  hi = Math.ceil(hi / step - 1e-9) * step; lo = Math.floor(lo / step + 1e-9) * step;
  if (hi === lo) hi = lo + step;
  const y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);

  svg.appendChild(el("rect", { x: L + sel * slot + 2, y: T - 6, width: slot - 4, height: H - T - B + 6, fill: "var(--code-bg)", rx: 4 }));
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: Math.abs(v) < 1e-9 ? "axis" : "grid", "stroke-width": Math.abs(v) < 1e-9 ? 1.5 : 1 }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, (state.txMode === "diff" && v > 0 ? "+" : "") + (+v.toFixed(3)).toString()));
  }
  svg.appendChild(el("text", { x: 4, y: 12, "font-size": 11 }, state.txMode === "diff" ? "EJ, targeted − reference" : "EJ a year"));
  TX_YEARS.forEach((yr, i) => {
    svg.appendChild(el("text", { x: L + (i + 0.5) * slot, y: H - B + 16, "text-anchor": "middle", "font-size": 12, class: i === sel ? "strong" : "" }, yr));
  });

  const bw = Math.min(26, slot * 0.34);
  if (state.txMode === "levels") {
    for (let i = 0; i < n; i++) {
      ["ref", "sw"].forEach((sc, j) => {
        const bx = L + (i + 0.5) * slot + (j === 0 ? -bw - 1.5 : 1.5);
        let acc = 0;
        for (const g of s.groups) {
          const v = s[sc][g.key][i];
          if (v <= 0) continue;
          const y0 = y(acc), y1 = y(acc + v);
          const r = el("rect", { x: bx, y: y1 + 0.5, width: bw, height: Math.max(0, y0 - y1 - 1), fill: COLOR[g.key], "fill-opacity": sc === "ref" ? 0.55 : 1 });
          r.appendChild(el("title", {}, `${yr(i)} ${sc === "ref" ? "reference" : "solar-and-wind targeted"}: ${g.label} ${v.toFixed(3)} EJ`));
          svg.appendChild(r);
          acc += v;
        }
        if (i === sel) svg.appendChild(el("text", { x: bx + bw / 2, y: y(acc) - 5, "text-anchor": "middle", "font-size": 10 }, j === 0 ? "Ref" : "S&W"));
      });
    }
  } else {
    for (let i = 0; i < n; i++) {
      const bx = L + (i + 0.5) * slot - bw / 2;
      let up = 0, dn = 0, net = 0;
      for (const g of s.groups) {
        const v = vals[g.key][i]; net += v;
        if (Math.abs(v) < 1e-9) continue;
        const a = v > 0 ? up : dn, b = a + v;
        const r = el("rect", { x: bx, y: Math.min(y(a), y(b)) + 0.5, width: bw, height: Math.max(0, Math.abs(y(a) - y(b)) - 1), fill: COLOR[g.key] });
        r.appendChild(el("title", {}, `${yr(i)}: ${g.label} ${signed(v, 3)} EJ (targeted − reference)`));
        svg.appendChild(r);
        if (v > 0) up = b; else dn = b;
      }
      svg.appendChild(el("circle", { cx: bx + bw / 2, cy: y(net), r: 3.5, fill: "var(--text)", stroke: "var(--bg)", "stroke-width": 1.5 }));
    }
  }
  function yr(i) { return TX_YEARS[i]; }

  legend($("#b-legend"), [
    ...s.groups.map((g) => ["", COLOR[g.key], g.label]),
    ...(state.txMode === "levels" ? [["", "var(--muted)", "left bar (paler): reference · right bar: solar-and-wind targeted"]] : [["", "var(--text)", "dot: net change"]]),
  ]);
  const legendItems = $("#b-legend").lastChild.querySelector("i");
  if (state.txMode === "levels") legendItems.style.opacity = ".55"; else legendItems.style.borderRadius = "50%";

  const ys = txYearSummary(state.txView, state.txYear);
  const items = [];
  if (state.txView === "power") {
    items.push(["Wind + solar share", `${pct(ys.refWindSolarShare)} → ${pct(ys.swWindSolarShare)}`, "reference → targeted"]);
    items.push(["Coal power", `${f2(ys.coalRef)} → ${f2(ys.coalSw)} EJ`, "reference → targeted"]);
    items.push(["Gas power", `${f2(ys.gasRef)} → ${f2(ys.gasSw)} EJ`, "reference → targeted"]);
  } else {
    items.push(["Electricity's share", `${pct(ys.refElecShare)} → ${pct(ys.swElecShare)}`, `of ${view.label.toLowerCase()} energy, reference → targeted`]);
    items.push(["Extra electricity", `${signed(ys.dElec)} EJ`, "targeted − reference"]);
    items.push(["Gas / refined liquids", `${signed(ys.dGas)} / ${signed(ys.dLiquids)} EJ`, "targeted − reference"]);
  }
  items.push(["Solar and wind targets (Table 1)", ys.table1 ? `${f1(ys.table1.solarGW)} + ${f1(ys.table1.windGW)} GW` : "none (2015)", ys.table1 ? "solar + wind capacity" : "Table 1 starts in 2020"]);
  readout($("#b-readout"), items);

  // Correction note, computed from the data for the chosen year (2050 by default).
  const gain = electrificationGain(state.txYear);
  const byAbs = [...gain].sort((a, b) => b.dElec - a.dElec)[0];
  const byPts = [...gain].sort((a, b) => b.dSharePts - a.dSharePts)[0];
  const bld = gain.find((g) => g.key === "buildings"), ind = gain.find((g) => g.key === "industry");
  $("#b-correction").innerHTML = `<strong>Correction note.</strong> The abstract says buildings "exhibit the strongest shift toward
    electrification." The model outputs behind Figure 2 do not show that. In ${state.txYear}, the targeted scenario adds
    ${signed(ind.dElec)} EJ of electricity in industry against ${signed(bld.dElec)} EJ in buildings; the largest gain is in
    ${byAbs.label.toLowerCase()} in energy terms and in ${byPts.label.toLowerCase()} in share of the sector's energy
    (${signed(byPts.dSharePts, 1)} points). Buildings already run mostly on electricity (${pct(bld.refShare)} in the reference case), so they
    have the highest share, not the biggest shift. The body text also says transportation's gas use falls; in the data it is refined
    liquids that fall.`;
}

// ---------------------------------------------------------------- (c) communities
const markMetric = seg($("#c-metric"), DER_METRICS, (v) => { state.derMetric = v; renderC(); writeUrl(); });
const cN = $("#c-n");
cN.addEventListener("input", () => { state.derN = DER_N[Number(cN.value)]; renderC(); writeUrl(); });

function renderC() {
  markMetric(state.derMetric);
  const idx = DER_N.indexOf(state.derN);
  cN.value = idx; $("#c-n-out").textContent = state.derN;
  cN.setAttribute("aria-valuetext", `${state.derN} communities`);
  const c = derChart(state.derMetric);
  const svg = $("#c-chart"); clearSvg(svg);
  svg.querySelector("title").textContent = `${c.label}: published and corrected values by number of communities generating their own power`;
  const W = chartW(svg), H = 340, L = 48, R = 6, T = 24, B = 40;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const n = c.cats.length, slot = (W - L - R) / n;
  const all = [...c.published, ...c.corrected];
  let lo = 0; // bars always start at zero
  let hi = Math.max(...all);
  const step = niceStep(hi - lo);
  hi = Math.ceil(hi / step) * step; lo = Math.floor(lo / step) * step;
  const y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
  const selSlot = c.cats.indexOf(String(state.derN));
  svg.appendChild(el("rect", { x: L + selSlot * slot + 2, y: T - 14, width: slot - 4, height: H - T - B + 14, fill: "var(--code-bg)", rx: 4 }));
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v === lo ? "axis" : "grid" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, `${+v.toFixed(2)}${c.unit === "%" ? "%" : ""}`));
  }
  svg.appendChild(el("text", { x: 4, y: 12, "font-size": 11 }, c.unit === "%" ? "% of all electricity" : c.unit === "$M" ? "$ million a year" : "cents per kWh"));
  const bw = Math.min(34, slot * 0.36);
  const fmt = (v) => (c.unit === "%" ? `${f1(v)}%` : c.unit === "$M" ? `$${v.toFixed(2)}M` : `${f1(v)}¢`);
  c.cats.forEach((cat, i) => {
    const cx = L + (i + 0.5) * slot;
    svg.appendChild(el("text", { x: cx, y: H - B + 16, "text-anchor": "middle", "font-size": 12, class: i === selSlot ? "strong" : "" }, cat === "none" ? "none" : cat));
    [["published", c.published[i]], ["corrected", c.corrected[i]]].forEach(([kind, v], j) => {
      const bx = cx + (j === 0 ? -bw - 2 : 2);
      const r = el("rect", { x: bx, y: y(v), width: bw, height: Math.max(0, y(lo) - y(v)), rx: 2,
        fill: kind === "published" ? "url(#hatch)" : "var(--accent)", stroke: kind === "published" ? "var(--muted)" : "none", "stroke-width": 1 });
      r.appendChild(el("title", {}, `${cat === "none" ? "No community generating" : `${cat} communities`}, ${kind}: ${fmt(v)}`));
      svg.appendChild(r);
      if (i === selSlot) svg.appendChild(el("text", { x: bx + bw / 2, y: y(v) - 5, "text-anchor": "middle", "font-size": 11, class: "strong" }, fmt(v)));
    });
  });
  const defs = el("defs");
  const pat = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  pat.appendChild(el("rect", { width: 6, height: 6, fill: "var(--bg)" }));
  pat.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--muted)", "stroke-width": 2.2 }));
  defs.appendChild(pat); svg.appendChild(defs);
  if (c.base != null) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(c.base), y2: y(c.base), class: "base" }));
    svg.appendChild(el("text", { x: W - R, y: y(c.base) - 6, "text-anchor": "end", "font-size": 11 }, `no community generating: $${c.base.toFixed(3)}M (corrected)`));
  }
  svg.appendChild(el("text", { x: L + (W - L - R) / 2, y: H - 6, "text-anchor": "middle", "font-size": 11 }, "communities generating their own power"));
  legend($("#c-legend"), [["pub", null, "Published (2020)"], ["fix", null, "Corrected (2026 erratum)"], ...(c.base != null ? [["base", null, "Corrected cost with no community generating"]] : [])]);

  const p = derPoint(idx);
  readout($("#c-readout"), [
    ["Community share", `${f1(p.shareCorrected)}%`, `published ${f1(p.sharePublished)}%`],
    ["Total system cost", `$${p.costCorrected.toFixed(2)}M`, `${signed(p.costChange)}M vs no community; published $${p.costPublished.toFixed(2)}M`],
    ["Utility price", `${f1(p.utilPriceCorrected * 100)}¢/kWh`, `published ${f1(p.utilPricePublished * 100)}¢`],
    ["Adopting community pays", `${f1(p.commPriceCorrected * 100)}¢/kWh`, `published ${f1(p.commPricePublished * 100)}¢`],
    ["Bought from utility as backup", `${Math.round(p.backupCorrected)}%`, `of its own use; published ${Math.round(p.backupPublished)}%`],
    ["Each community builds", p.buildCorrected, `published: ${p.buildPublished}`],
  ]);
  const foot = {
    share: "Share of the whole system's 120 GWh a year made by communities' own generation (each community uses 3.0 GWh). Published: paper Figure 2. Corrected: erratum, Erratum 2 (fixed operating costs were subtracted instead of added).",
    cost: `Published: paper Figure 1 labels, which counted transmission and distribution twice; the "none" bar is Figure 1's base bar. Corrected: erratum, Erratum 1 table, against the true no-community base of $9.649M. Fixing the second error as well raises costs further, from $10.75M with no community generating to $${derPoint(5).costBothCorrected.toFixed(2)}M at 40 (repository run).`,
    price: "Published: paper Figure 1 (the repository reproduces these exactly). Corrected: both errors fixed, from the repository's committed corrected run. Corrected, the price rises steadily as the utility sells less; the published dip at 30 and jump at 40 come from the coding errors.",
  }[state.derMetric];
  $("#c-foot").textContent = foot;
}

// ---------------------------------------------------------------- (d) data centers
const markDc = seg($("#d-sc"), DC.map((d) => ({ key: d.id, label: d.id })), (v) => { state.dc = v; renderD(); writeUrl(); });
const dTip = $("#d-tip");

function renderD() {
  markDc(state.dc);
  const s = dcScenario(state.dc);
  $("#d-name").textContent = `${s.id}: ${s.name}`;
  const svg = $("#d-chart"); clearSvg(svg);
  const W = chartW(svg), H = 360, L = 50, R = 12, T = 18, B = 44;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x0 = 60, x1 = 100, y0 = 50, y1 = 105;
  const x = (v) => L + (v - x0) / (x1 - x0) * (W - L - R);
  const y = (v) => T + (y1 - v) / (y1 - y0) * (H - T - B);
  for (let v = 60; v <= 100; v += 10) {
    svg.appendChild(el("line", { x1: x(v), x2: x(v), y1: T, y2: H - B, class: "grid" }));
    svg.appendChild(el("text", { x: x(v), y: H - B + 16, "text-anchor": "middle", "font-size": 11 }, `$${v}`));
  }
  for (let v = 50; v <= 100; v += 10) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "grid" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, `${v}%`));
  }
  svg.appendChild(el("text", { x: L + (W - L - R) / 2, y: H - 8, "text-anchor": "middle", "font-size": 11 }, "Blended cost of electricity, $/MWh (2026 basis) → more expensive"));
  svg.appendChild(el("text", { x: 12, y: T + (H - T - B) / 2, "text-anchor": "middle", "font-size": 11, transform: `rotate(-90 12 ${T + (H - T - B) / 2})` }, "Outage protection (ALOLP)"));
  svg.appendChild(el("line", { x1: x(DC_GRID_BASELINE), x2: x(DC_GRID_BASELINE), y1: T, y2: H - B, class: "base" }));
  svg.appendChild(el("text", { x: x(DC_GRID_BASELINE) + 5, y: H - B - 8, "font-size": 11, class: "strong halo" }, `Grid only: $${DC_GRID_BASELINE.toFixed(2)}`));

  for (const d of DC) {
    const g = el("g", { class: `pt${d.id === state.dc ? " on" : ""}`, tabindex: 0, role: "button",
      "aria-label": `${d.id}, ${d.name}: $${d.lcoe.toFixed(2)} per MWh, ${d.alolpText} outage protection`, "data-id": d.id });
    g.appendChild(el("circle", { cx: x(d.lcoe), cy: y(d.alolp), r: 16, fill: "transparent" }));
    g.appendChild(el("circle", { class: "ring", cx: x(d.lcoe), cy: y(d.alolp), r: d.id === state.dc ? 10 : 8, fill: COLOR[d.fuel], stroke: "var(--bg)", "stroke-width": 2 }));
    const left = d.lcoe > 90;
    g.appendChild(el("text", { x: x(d.lcoe) + (left ? -14 : 14), y: y(d.alolp) + 4, "text-anchor": left ? "end" : "start", "font-size": 13, class: d.id === state.dc ? "strong" : "" },
      d.id === state.dc ? `${d.id} · $${d.lcoe.toFixed(2)} · ${d.alolpText}` : d.id));
    g.addEventListener("click", () => { state.dc = d.id; renderD(); writeUrl(); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.dc = d.id; renderD(); writeUrl(); svg.querySelector(`[data-id="${d.id}"]`)?.focus(); } });
    g.addEventListener("pointerenter", (e) => {
      dTip.textContent = `${d.id} ${d.name}: $${d.lcoe.toFixed(2)}/MWh · ${d.alolpText} · fuel: ${d.fuelLabel.toLowerCase()}`;
      const box = svg.parentElement.getBoundingClientRect();
      dTip.style.display = "block";
      dTip.style.left = `${Math.min(e.clientX - box.left + 12, box.width - 240)}px`;
      dTip.style.top = `${e.clientY - box.top + 12}px`;
    });
    g.addEventListener("pointerleave", () => { dTip.style.display = "none"; });
    svg.appendChild(g);
  }
  legend($("#d-legend"), [...FUEL_KINDS.map((f) => ["", COLOR[f.key], f.label]), ["base", null, "Grid-only baseline"]]);

  // Installed capacity of the chosen mix (Table 11), one row per technology, against the 250 MW load.
  const cap = $("#d-cap"); clearSvg(cap);
  const rows = DC_CAP_KEYS.filter((k) => s.cap[k.key] > 0);
  const CW = chartW(cap), CL = CW < 720 ? 130 : 150, CR = 70, CT = 26, RH = 22;
  const CH = CT + rows.length * RH + 34;
  cap.setAttribute("viewBox", `0 0 ${CW} ${CH}`);
  const cx = (v) => CL + v / 300 * (CW - CL - CR);
  cap.appendChild(el("text", { x: 0, y: 14, "font-size": 12, class: "strong" }, `${s.id} installed capacity (Table 11), MW`));
  rows.forEach((k, i) => {
    const yy = CT + i * RH;
    const firm = !["solar", "grid"].includes(k.key);
    cap.appendChild(el("text", { x: CL - 8, y: yy + 14, "text-anchor": "end", "font-size": 12 }, k.label));
    const r = el("rect", { x: CL, y: yy + 3, width: cx(s.cap[k.key]) - CL, height: RH - 7, rx: 3,
      fill: firm ? "var(--text)" : "var(--muted)", "fill-opacity": firm ? 0.8 : 0.35 });
    r.appendChild(el("title", {}, `${k.label}: ${s.cap[k.key]} MW${k.key === "bess" ? ` (${s.bessText})` : ""}`));
    cap.appendChild(r);
    cap.appendChild(el("text", { x: cx(s.cap[k.key]) + 6, y: yy + 14, "font-size": 12 }, `${s.cap[k.key]}${k.key === "bess" ? " MW battery" : ""}`));
  });
  const yb = CT + rows.length * RH;
  cap.appendChild(el("line", { x1: cx(DC_LOAD_MW), x2: cx(DC_LOAD_MW), y1: CT - 4, y2: yb + 4, class: "base" }));
  cap.appendChild(el("text", { x: cx(DC_LOAD_MW), y: yb + 18, "text-anchor": "middle", "font-size": 11 }, "250 MW load"));
  cap.appendChild(el("text", { x: 0, y: yb + 30, "font-size": 11 }, "Dark bars keep running in a grid outage; solar contracts and the grid do not."));

  readout($("#d-readout"), [
    ["Blended cost", `$${s.lcoe.toFixed(2)}/MWh`, `${signed(s.vsGrid)} vs grid only`],
    ["Outage protection", s.alolpText, s.shortfall ? "Table 15: cannot carry the full load indefinitely"
      : s.maxBtm < DC_LOAD_MW ? "not marked short in Table 15" : "can carry the full load"],
    ["Max on-site output", `${s.maxBtm} MW`, `of the ${DC_LOAD_MW} MW load`],
    ["Critical fuel", s.fuelLabel, `islanding: ${s.islanding.toLowerCase()}`],
    ["Price volatility risk", s.volatility, "grid only: extremely high"],
  ]);
  const [a, b] = dcGasRange();
  $("#d-gasrange").textContent = `${f1(a)}% to ${f1(b)}%`;
}

// ---------------------------------------------------------------- boot
function renderAll() { renderA(); renderB(); renderC(); renderD(); writeUrl(); }
let resizeTimer = null;
let lastWide = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const wide = chartW($("#b-chart")) === 720;
    if (wide !== lastWide) { lastWide = wide; renderB(); renderC(); renderD(); }
    renderA();
  }, 150);
});
renderAll();
fetch(HEX_URL).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => {
  HEX = j; buildMap(); renderA();
}).catch((e) => {
  const t = el("text", { x: 480, y: 480, "text-anchor": "middle", "font-size": 18 }, `Map data could not be loaded (${e.message}).`);
  aSvg.appendChild(t);
});
