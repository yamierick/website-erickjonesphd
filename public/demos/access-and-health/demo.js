// DOM + SVG rendering, event wiring and URL state for the access-and-health demo.
import { LAYERS, REGIONS, TABLE2, POLICIES } from "./data.js";
import { classify, legendLabels, totals, scenario, series, METRICS, parseState, serializeState, DEFAULTS,
  impliedSupplyShare } from "./model.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
let GEO = null;
const state = parseState(location.search);

function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
const clear = (svg) => [...svg.childNodes].forEach((c) => { if (c.nodeName !== "title") svg.removeChild(c); });
const narrow = (svg) => (svg.getBoundingClientRect().width || 720) < 560;
const fmt = (v, d = 0) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pub = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
function readout(dl, items) {
  dl.innerHTML = "";
  for (const [k, v, note] of items) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    if (note) { const s = document.createElement("small"); s.textContent = note; dd.appendChild(s); }
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
const tip = $("#tip");
function showTip(e, text) {
  tip.textContent = text; tip.style.display = "block";
  tip.style.left = Math.min(e.pageX + 12, window.scrollX + document.documentElement.clientWidth - tip.offsetWidth - 8) + "px";
  tip.style.top = e.pageY + 12 + "px";
}
const hideTip = () => { tip.style.display = "none"; };

// ================= Panel A: map =================
function drawMap() {
  const svg = $("#map");
  clear(svg);
  if (!GEO) return;
  const L = LAYERS[state.m];
  const g = el("g");
  let selNode = null;
  for (const z of GEO.zips) {
    const c = classify(z[state.m], L.breaks);
    const cls = ["z"];
    if (state.r && z.region !== state.r) cls.push("dim");
    if (z.zip === state.z) cls.push("sel");
    const p = el("path", { d: z.d, class: cls.join(" "), fill: `var(--q${c})` });
    p.addEventListener("mousemove", (e) => showTip(e,
      `ZIP ${z.zip} (${REGIONS[z.region]}): ${fmt(z.cases)} cases, ${fmt(z.active)} active, ${fmt(z.deaths)} deaths`));
    p.addEventListener("mouseleave", hideTip);
    p.addEventListener("click", () => { state.z = state.z === z.zip ? "" : z.zip; update(); });
    g.appendChild(p);
    if (z.zip === state.z) selNode = p;
  }
  if (selNode) g.appendChild(selNode);
  svg.appendChild(g);
  const rg = el("g");
  for (const r of GEO.regions) rg.appendChild(el("path", { d: r.d, class: "reg" + (r.id === state.r ? " on" : "") }));
  for (const r of GEO.regions) rg.appendChild(el("text", { x: r.cx, y: r.cy, "text-anchor": "middle", class: "rl" }, r.id));
  svg.appendChild(rg);

  const labels = legendLabels(L.breaks);
  $("#map-legend").innerHTML = `<span>${L.label} per ZIP code:</span>` +
    labels.map((t, i) => `<span><i class="sw q" style="background:var(--q${i})"></i>${t}</span>`).join("") +
    `<span>Heavy lines: the project's eight regions</span>`;
  $("#map-title").textContent = `Map of 147 Houston-area ZIP codes shaded by ${L.label.toLowerCase()}, in eight regions`;

  const t = totals(GEO.zips, { region: state.r, zip: state.z });
  const scope = state.z ? `ZIP ${state.z}` : state.r ? `${REGIONS[state.r]} region` : "All 147 ZIP codes";
  const items = [["Showing", scope, state.z ? `${REGIONS[GEO.zips.find((z) => z.zip === state.z).region]} region` : state.r ? `${t.zips} ZIP codes` : "8 regions"],
    ["Confirmed cases", fmt(t.cases)], ["Active cases", fmt(t.active)], ["Deaths", fmt(t.deaths)]];
  readout($("#map-readout"), items);
}

function fillZipSelect() {
  const sel = $("#z");
  for (const z of [...GEO.zips].sort((a, b) => a.zip.localeCompare(b.zip))) {
    const o = document.createElement("option"); o.value = z.zip; o.textContent = `${z.zip} (${REGIONS[z.region]})`; sel.appendChild(o);
  }
}

// ================= Panel B: scenarios =================
function drawScenarios() {
  const svg = $("#sc-chart");
  clear(svg);
  const nw = narrow(svg);
  const W = nw ? 420 : 720, H = nw ? 330 : 360, L = nw ? 46 : 60, R = nw ? 10 : 20, T = 26, B = 44;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const q = state.q;
  const data = series(state.p, q);
  const pct = q === "service";
  const yMax = pct ? 110 : q === "transport" ? 0.8 : 40; // fixed axes: every value fits (max $34M, $0.63M)
  const y = (v) => H - B - (v / yMax) * (H - T - B);
  const slot = (W - L - R) / 4;
  const cx = (i) => L + slot * (i + 0.5);
  const steps = pct ? [0, 25, 50, 75, 100] : q === "transport" ? [0, 0.2, 0.4, 0.6, 0.8] : [0, 10, 20, 30, 40];
  for (const v of steps) {
    svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "gridl" }));
    svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "small" }, pct ? v + "%" : "$" + pub(v) + "M"));
  }
  data.forEach((d, i) => {
    const on = d.k === state.k;
    const bw = slot * (q === "both" ? 0.34 : 0.56);
    const x0 = q === "both" ? cx(i) - bw - 2 : cx(i) - bw / 2;
    const r = el("rect", { x: x0, y: y(d.bar), width: bw, height: Math.max(0, y(0) - y(d.bar)), rx: 2, fill: "var(--repo)", "fill-opacity": on ? .85 : .4 });
    r.appendChild(el("title", {}, `${d.k}×: ${pub(d.bar)}${pct ? "%" : " $M"} (public reconstruction)`));
    svg.appendChild(r);
    const inside = y(0) - y(d.bar) > 30;
    if (!(d.bar === 0 && d.printed === 0)) svg.appendChild(el("text", { x: x0 + bw / 2, y: inside ? y(d.bar) + 17 : y(d.bar) - 5, "text-anchor": "middle", class: "val",
      style: inside ? (on ? "fill:var(--bg);font-weight:600" : "fill:var(--text)") : "" }, pct ? pub(d.bar) + "%" : "$" + pub(d.bar) + "M"));
    if (q === "both") {
      const x1 = cx(i) + 2;
      const h = Math.max(1.5, y(0) - y(d.bar2));
      svg.appendChild(el("rect", { x: x1, y: y(0) - h, width: bw, height: h, rx: 1, fill: "var(--line2)", "fill-opacity": on ? .9 : .45 }));
      svg.appendChild(el("text", { x: x1 + bw / 2, y: y(0) - h - 5, "text-anchor": "middle", class: "val" }, "$" + pub(d.bar2) + "M"));
    }
    if (d.printed != null) {
      const px = q === "both" ? x0 + bw / 2 : cx(i);
      svg.appendChild(el("circle", { cx: px, cy: y(d.printed), r: 6.5, fill: "none", stroke: "var(--paper)", "stroke-width": 2.2 }));
      const zero = d.printed === 0;
      const lx = zero ? px - 9 : px + (nw ? 9 : 10);
      svg.appendChild(el("text", { x: lx, y: y(d.printed) + (pct ? -8 : zero ? -8 : 4), "text-anchor": zero ? "end" : "start", class: "pv" }, (pct ? d.printed + "%" : "$" + d.printed + "M") + (nw ? "" : " paper")));
    }
    if (d.printedUnderserved != null) {
      const py = y(d.printedUnderserved);
      svg.appendChild(el("path", { d: `M ${cx(i)} ${py - 7} L ${cx(i) + 7} ${py} L ${cx(i)} ${py + 7} L ${cx(i) - 7} ${py} Z`, fill: "var(--paper)" }));
    }
    svg.appendChild(el("text", { x: cx(i), y: H - B + 17, "text-anchor": "middle", class: on ? "lbl strong" : "lbl" }, `${d.k}× supply`));
    svg.appendChild(el("text", { x: cx(i), y: H - B + 32, "text-anchor": "middle", class: "small" }, `Scenario ${(state.p === "equal" ? 0 : 4) + d.k}`));
  });
  if (pct && state.p === "prioritized") {
    let dd = "";
    data.forEach((d, i) => { dd += (i ? " L " : "M ") + cx(i) + " " + y(d.line); });
    svg.appendChild(el("path", { d: dd, fill: "none", stroke: "var(--line2)", "stroke-width": 2.2 }));
    data.forEach((d, i) => svg.appendChild(el("circle", { cx: cx(i), cy: y(d.line), r: 3.5, fill: "var(--line2)" })));
  }
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(0), y2: y(0), class: "axis" }));
  $("#sc-title").textContent = `${METRICS[q].label} at 1, 2, 3 and 4 times supply, ${POLICIES[state.p].toLowerCase()}`;

  let lg = `<span><i class="sw sw-repo"></i>${q === "both" ? "Shortage penalty" : METRICS[q].label} (public reconstruction)</span>`;
  if (q === "both") lg += `<span><i class="sw sw-tr"></i>Transport cost (public reconstruction)</span>`;
  if (pct && state.p === "prioritized") lg += `<span><i class="sw sw-line"></i>Most vulnerable third of ZIP codes (reconstruction)</span>`;
  if (q !== "transport") lg += `<span><i class="sw sw-paper"></i>Printed in the paper</span>`;
  if (pct && state.p === "prioritized") lg += `<span>◆ Paper: underserved communities "close to 100%"</span>`;
  $("#sc-legend").innerHTML = lg;

  // readout
  const s = scenario(state.p, state.k);
  const items = [];
  if (s.printed.servicePct != null) {
    const note = s.k === 1 && s.policy === "equal"
      ? `Printed; its penalties imply ≈${Math.round(impliedSupplyShare(34, 22) * 100)}% (see correction)` : "Printed in the paper";
    items.push(["Served (paper)", `${s.printed.servicePct}% ≈ ${fmt(s.peoplePrinted)}`, note]);
  } else {
    items.push(["Served (paper)", "Chart only", "The paper shows this scenario as a bar chart"]);
  }
  items.push(["Served (reconstruction)", `${pub(s.repo.service)}% ≈ ${fmt(s.peopleRepo)}`, `of ${fmt(TABLE2.target)} people`]);
  items.push(["Shortage penalty", s.printed.penaltyM != null ? `$${s.printed.penaltyM}M` : `$${pub(s.repo.penalty)}M`,
    s.printed.penaltyM != null ? `Printed; reconstruction $${pub(s.repo.penalty)}M` : "Reconstruction (chart only in the paper)"]);
  items.push(["Transport cost", `$${pub(s.repo.transport)}M`, "Reconstruction (chart only in the paper)"]);
  if (s.printed.underservedPct != null) items.push(["Underserved communities", "≈100%", "Printed: \"approximately close to 100%\""]);
  else items.push(["Most vulnerable third", `${pub(s.repo.topThird)}%`, "Reconstruction, by the SVI stand-in"]);
  readout($("#sc-readout"), items);
  $("#k-out").textContent = `${state.k}×`;
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
  syncSeg("m", state.m); syncSeg("p", state.p); syncSeg("q", state.q);
  $("#r").value = state.r; $("#z").value = state.z; $("#k").value = state.k;
  drawMap(); drawScenarios(); writeUrl();
}

for (const id of ["m", "p", "q"]) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener("click", () => { state[id] = b.dataset.v; update(); }));
}
$("#r").addEventListener("change", (e) => { state.r = e.target.value; state.z = ""; update(); });
$("#z").addEventListener("change", (e) => { state.z = e.target.value; update(); });
$("#k").addEventListener("input", (e) => { state.k = Number(e.target.value); update(); });
const PANEL_KEYS = { map: ["m", "r", "z"], sc: ["k", "p", "q"] };
document.querySelectorAll(".js-reset").forEach((b) => b.addEventListener("click", () => {
  for (const k of PANEL_KEYS[b.dataset.panel]) state[k] = DEFAULTS[k];
  update();
}));
document.querySelectorAll(".js-share").forEach((b) => b.addEventListener("click", async (e) => {
  const btn = e.currentTarget, said = btn.textContent;
  const qs = serializeState(state);
  try { await navigator.clipboard.writeText(location.origin + location.pathname + (qs ? "?" + qs : "")); btn.textContent = "Copied"; }
  catch { btn.textContent = "Copy failed"; }
  setTimeout(() => { btn.textContent = said; }, 1600);
}));
let rsz = null;
window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(drawScenarios, 150); });

update();
fetch(new URL("./zips.json", import.meta.url)).then((r) => r.json()).then((g) => {
  GEO = g;
  $("#map").setAttribute("viewBox", g.viewBox.join(" "));
  fillZipSelect();
  // Re-validate the ZIP from the URL now that the list is known.
  const s2 = parseState(location.search, g.zips.map((z) => z.zip));
  state.z = s2.z;
  update();
}).catch(() => { $("#map-readout").textContent = "The map file could not be loaded."; });
