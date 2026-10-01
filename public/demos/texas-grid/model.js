// Pure functions for the Texas grid demo: settings in, what to draw out. No DOM here.
import {
  GEN_GROUPS, SEASONS, TIMES, MIN_MW,
  TX_YEARS, TX_SECTORS, TX_POWER, TX_TABLE1,
  DER_N, DER, DC, DC_GRID_BASELINE, DC_LOAD_MW,
} from "./data.js";

// ---------------------------------------------------------------- (a) map
/** Index of a season x time-of-day view in hex.json (season-major, as in the source map). */
export function viewIndex(season, time) {
  const s = SEASONS.findIndex((o) => o.key === season);
  const t = TIMES.findIndex((o) => o.key === time);
  if (s < 0 || t < 0) throw new Error(`bad view ${season}/${time}`);
  return s * TIMES.length + t;
}

/** SVG path for one pointy-top hexagon centered at (cx, cy). */
export function hexPath(cx, cy, hx, hr) {
  const r = (v) => Math.round(v * 10) / 10;
  const h2 = hr / 2;
  return `M${r(cx)} ${r(cy - hr)}l${hx} ${h2}v${hr}l${-hx} ${h2}l${-hx} ${-h2}v${-hr}z`;
}

/** Fill strength for a hexagon's average output: log scale from MIN_MW (0.35) to 1 GW (1.0). */
export function cellStrength(mw) {
  if (!(mw >= MIN_MW)) return 0;
  const lo = Math.log10(MIN_MW), hi = Math.log10(1000);
  const t = Math.min(1, Math.max(0, (Math.log10(mw) - lo) / (hi - lo)));
  return 0.35 + 0.65 * t;
}

/**
 * Per-hexagon drawing instructions for one view.
 * lead: index into GEN_GROUPS, or -1 when the hexagon averages under MIN_MW.
 * dim: true when a highlight is set and this hexagon is led by a different source.
 */
export function mapCells(hex, k, highlight = "all") {
  const leadStr = hex.lead[k], mw = hex.mw[k];
  const hi = highlight === "all" ? -1 : GEN_GROUPS.findIndex((g) => g.key === highlight);
  const out = new Array(leadStr.length);
  for (let i = 0; i < leadStr.length; i++) {
    const m = mw[i];
    const lead = leadStr[i] === "." || m < MIN_MW ? -1 : Number(leadStr[i]);
    out[i] = { lead, mw: m, strength: cellStrength(m), dim: hi >= 0 && lead !== hi };
  }
  return out;
}

/** ERCOT-wide mix for one view: total GW, share by source, and how many hexagons each source leads. */
export function mixSummary(hex, k) {
  const mw = hex.totals[k];
  const total = mw.reduce((s, v) => s + v, 0);
  const leads = GEN_GROUPS.map(() => 0);
  let blank = 0;
  for (const c of mapCells(hex, k)) { if (c.lead < 0) blank++; else leads[c.lead]++; }
  return {
    totalGW: total / 1000,
    mw,
    shares: mw.map((v) => (total > 0 ? v / total : 0)),
    leads,
    blank,
  };
}

// ---------------------------------------------------------------- (b) sectors
export const TX_VIEWS = [
  { key: "buildings", label: "Buildings", sector: "Buildings" },
  { key: "industry", label: "Industry", sector: "Industry" },
  { key: "transport", label: "Transportation", sector: "Transportation" },
  { key: "power", label: "Power plants", sector: null },
];
export const FUEL_GROUPS = [
  { key: "electricity", label: "Electricity", parts: ["electricity"] },
  { key: "gas", label: "Natural gas", parts: ["gas"] },
  { key: "liquids", label: "Refined liquids", parts: ["refined liquids"] },
  { key: "otherfuel", label: "Coal, biomass, hydrogen", parts: ["coal", "biomass", "hydrogen"] },
];
export const POWER_GROUPS = [
  { key: "gas", label: "Gas", parts: ["gas"] },
  { key: "coal", label: "Coal", parts: ["coal"] },
  { key: "nuclear", label: "Nuclear", parts: ["nuclear"] },
  { key: "wind", label: "Wind", parts: ["wind"] },
  { key: "solar", label: "Solar (incl. rooftop)", parts: ["solar", "rooftop_pv"] },
  { key: "othergen", label: "Hydro, biomass, oil, battery", parts: ["hydro", "biomass", "refined liquids", "battery"] },
];

function groupSeries(raw, groups) {
  const out = {};
  for (const g of groups) {
    out[g.key] = TX_YEARS.map((_, i) => g.parts.reduce((s, p) => s + (raw[p] ? raw[p][i] : 0), 0));
  }
  return out;
}

/** Stacked series for a view: { groups, ref: {key: [EJ by year]}, sw: {...} }. */
export function txSeries(viewKey) {
  const v = TX_VIEWS.find((o) => o.key === viewKey);
  if (!v) throw new Error(`bad view ${viewKey}`);
  if (!v.sector) {
    return { groups: POWER_GROUPS, ref: groupSeries(TX_POWER.ref, POWER_GROUPS), sw: groupSeries(TX_POWER.sw, POWER_GROUPS) };
  }
  return {
    groups: FUEL_GROUPS,
    ref: groupSeries(TX_SECTORS.ref[v.sector], FUEL_GROUPS),
    sw: groupSeries(TX_SECTORS.sw[v.sector], FUEL_GROUPS),
  };
}

/** Targeted minus reference, by group and year. */
export function txDiff(series) {
  const d = {};
  for (const g of series.groups) d[g.key] = series.sw[g.key].map((v, i) => v - series.ref[g.key][i]);
  return d;
}

const sumAt = (obj, i) => Object.values(obj).reduce((s, a) => s + a[i], 0);

/** Headline numbers for one view and year. */
export function txYearSummary(viewKey, year) {
  const i = TX_YEARS.indexOf(year);
  if (i < 0) throw new Error(`bad year ${year}`);
  const s = txSeries(viewKey);
  const refTot = sumAt(s.ref, i), swTot = sumAt(s.sw, i);
  const out = { year, refTotal: refTot, swTotal: swTot };
  if (viewKey === "power") {
    const ws = (o) => o.wind[i] + o.solar[i];
    out.refWindSolarShare = ws(s.ref) / refTot;
    out.swWindSolarShare = ws(s.sw) / swTot;
    out.coalRef = s.ref.coal[i];
    out.coalSw = s.sw.coal[i];
    out.gasRef = s.ref.gas[i];
    out.gasSw = s.sw.gas[i];
  } else {
    out.refElecShare = s.ref.electricity[i] / refTot;
    out.swElecShare = s.sw.electricity[i] / swTot;
    out.dElec = s.sw.electricity[i] - s.ref.electricity[i];
    out.dGas = s.sw.gas[i] - s.ref.gas[i];
    out.dLiquids = s.sw.liquids[i] - s.ref.liquids[i];
  }
  const t = TX_TABLE1.year.indexOf(year);
  out.table1 = t < 0 ? null : { solarGW: TX_TABLE1.solarGW[t], windGW: TX_TABLE1.windGW[t] };
  return out;
}

/** Electrification gain by sector in one year: extra EJ of electricity, and change in electricity's share (points). */
export function electrificationGain(year) {
  return TX_VIEWS.filter((v) => v.sector).map((v) => {
    const s = txYearSummary(v.key, year);
    return { key: v.key, label: v.label, dElec: s.dElec, dSharePts: (s.swElecShare - s.refElecShare) * 100,
      refShare: s.refElecShare, swShare: s.swElecShare };
  });
}

// ---------------------------------------------------------------- (c) communities
export const DER_METRICS = [
  { key: "share", label: "Community share" },
  { key: "cost", label: "System cost" },
  { key: "price", label: "Utility price" },
];

/** Bars for one metric: categories, two series, optional base values, unit. */
export function derChart(metric) {
  if (metric === "share") {
    return { unit: "%", cats: DER_N.map(String), published: DER.sharePublished, corrected: DER.shareCorrected, base: null,
      label: "Share of all the system's electricity made by communities' own generation" };
  }
  if (metric === "cost") {
    return { unit: "$M", cats: ["none", ...DER_N.map(String)],
      published: [DER.costPublishedBase, ...DER.costPublished], corrected: [DER.costBase, ...DER.costCorrected],
      base: DER.costBase, label: "Total cost of serving the system, $ million a year" };
  }
  if (metric === "price") {
    const c = (a) => a.map((v) => v * 100);
    return { unit: "¢", cats: ["none", ...DER_N.map(String)],
      published: c([DER.utilPricePublishedBase, ...DER.utilPricePublished]),
      corrected: c([DER.utilPriceCorrectedBase, ...DER.utilPriceCorrected]),
      base: null, label: "Utility's price to its remaining customers, cents per kWh" };
  }
  throw new Error(`bad metric ${metric}`);
}

/** Everything the readout needs for one community count (index into DER_N). */
export function derPoint(i) {
  const n = DER_N[i];
  return {
    n,
    sharePublished: DER.sharePublished[i], shareCorrected: DER.shareCorrected[i],
    costPublished: DER.costPublished[i], costCorrected: DER.costCorrected[i],
    costChange: DER.costCorrected[i] - DER.costBase,
    costBothCorrected: DER.costBothCorrected[i],
    utilPricePublished: DER.utilPricePublished[i], utilPriceCorrected: DER.utilPriceCorrected[i],
    commPricePublished: DER.commPricePublished[i], commPriceCorrected: DER.commPriceCorrected[i],
    backupPublished: DER.backupPublished[i], backupCorrected: DER.backupCorrected[i],
    buildPublished: DER.buildPublished[i], buildCorrected: DER.buildCorrected[i],
  };
}

// ---------------------------------------------------------------- (d) data centers
export const FUEL_KINDS = [
  { key: "none", label: "No fuel supply needed" },
  { key: "gas", label: "Needs a gas pipeline" },
  { key: "uranium", label: "Needs uranium fuel" },
];

export function dcScenario(id) {
  const s = DC.find((d) => d.id === id);
  if (!s) throw new Error(`bad scenario ${id}`);
  return {
    ...s,
    vsGrid: s.lcoe - DC_GRID_BASELINE,
    cheaperThanGrid: s.lcoe < DC_GRID_BASELINE,
    firmMw: dcFirmMw(s),
    loadMw: DC_LOAD_MW,
  };
}

/** On-site output that does not depend on the grid or the sun: geothermal + reactor + engines + turbines + battery. */
export function dcFirmMw(s) {
  const c = s.cap;
  return c.geo + c.smr + c.rice + c.micro + c.bess;
}

/** ALOLP range of the scenarios whose Table 15 fuel dependency is a gas pipeline. */
export function dcGasRange() {
  const v = DC.filter((d) => d.fuel === "gas").map((d) => d.alolp);
  return [Math.min(...v), Math.max(...v)];
}

/** Scenarios that are both cheaper than the grid baseline and protect at least `minAlolp` %. */
export function dcCheaperAndSafer(minAlolp) {
  return DC.filter((d) => d.lcoe < DC_GRID_BASELINE && d.alolp >= minAlolp).map((d) => d.id);
}

// ---------------------------------------------------------------- URL state
export const DEFAULTS = {
  season: "all", time: "all", hi: "all",
  txView: "industry", txMode: "levels", txYear: 2050,
  derMetric: "share", derN: 40,
  dc: "S3",
};
const KEYS = { as: "season", at: "time", ah: "hi", bv: "txView", bm: "txMode", by: "txYear", cm: "derMetric", cn: "derN", ds: "dc" };
const ALLOWED = {
  season: SEASONS.map((o) => o.key),
  time: TIMES.map((o) => o.key),
  hi: ["all", ...GEN_GROUPS.map((g) => g.key)],
  txView: TX_VIEWS.map((o) => o.key),
  txMode: ["levels", "diff"],
  derMetric: DER_METRICS.map((o) => o.key),
  dc: DC.map((d) => d.id),
};

/** Nearest allowed value (ties go to the smaller one); clamps to the ends. */
export function snap(allowed, v) {
  return allowed.reduce((b, a) => (Math.abs(a - v) < Math.abs(b - v) ? a : b), allowed[0]);
}

/** Query string -> full state. Unknown keys ignored; bad values fall back; numbers clamped and snapped. */
export function parseState(search) {
  const q = new URLSearchParams(search);
  const st = { ...DEFAULTS };
  for (const [k, prop] of Object.entries(KEYS)) {
    if (!q.has(k)) continue;
    const raw = q.get(k).trim();
    if (raw === "") continue;
    if (prop === "txYear") {
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      st.txYear = snap(TX_YEARS, v);
    } else if (prop === "derN") {
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      st.derN = snap(DER_N, v);
    } else if (ALLOWED[prop].includes(raw)) {
      st[prop] = raw;
    }
  }
  return st;
}

/** Full state -> query string holding only the values that differ from the defaults. */
export function serializeState(st) {
  const q = new URLSearchParams();
  for (const [k, prop] of Object.entries(KEYS)) {
    if (st[prop] !== DEFAULTS[prop]) q.set(k, String(st[prop]));
  }
  return q.toString();
}
