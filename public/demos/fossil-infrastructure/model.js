// Pure functions (no DOM) that turn the demo's settings into what is drawn.
// Only published values from data.js go in; only those values, their sums, and exact arithmetic
// on them (e.g. cost per year x years) come out. Nothing is interpolated between scenarios.

import {
  GEO_CLASSES, GEO_TABLE3, GEO_TABLE4, GEO_TABLE5, GEO_LENSES, GEO_STATES,
  CCS, DC, DC_LOAD_MW,
} from "./data.js";

export const sum = (a) => a.reduce((s, v) => s + v, 0);
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// ---- Panel A: geothermal potential by class --------------------------------------------------

export const GEO_MEASURES = {
  area:       { label: "Land area",              unit: "sq mi", table: "Table 3", classes: 5 },
  wells:      { label: "Orphaned wells",         unit: "wells", table: "Table 3", classes: 5 },
  egs:        { label: "Geothermal potential",   unit: "GW",    table: "Table 4", classes: 3 },
  wellsGW:    { label: "Converted-well capacity", unit: "GW",   table: "Table 4", classes: 3 },
  facilities: { label: "Possible plants",        unit: "plants", table: "Table 5", classes: 3 },
};
export const GEO_CATS = { all: "All land", hub: "HUBZones", tribal: "Tribal lands" };

/** Values by class for one measure and land category, with the printed total. */
export function geoSeries(measure, cat) {
  const m = GEO_MEASURES[measure];
  let values, printed;
  if (measure === "area" || measure === "wells") {
    values = GEO_TABLE3[measure][cat];
    printed = GEO_TABLE3.total[measure][cat];
  } else if (measure === "facilities") {
    values = GEO_TABLE5.facilities[cat];
    printed = GEO_TABLE5.totalFacilities[cat];
  } else {
    values = GEO_TABLE4[measure][cat];
    printed = GEO_TABLE4.total[measure][cat];
  }
  const classes = GEO_CLASSES.slice(0, values.length);
  return { ...m, measure, cat, classes, values, printedTotal: printed, rowSum: round(sum(values), 1) };
}

/** Share of the "all land" value that falls in HUBZones or on tribal lands. */
export function geoShare(measure, cat) {
  if (cat === "all") return 1;
  const a = geoSeries(measure, "all").printedTotal;
  return a ? geoSeries(measure, cat).printedTotal / a : 0;
}

/** The set of state codes a lens highlights. */
export function lensStates(lens) {
  return new Set((GEO_LENSES[lens] || GEO_LENSES.study).states);
}
export const isStudyState = (abbr) => GEO_STATES.includes(abbr);

// ---- Panel B: CO2 pipelines built at once vs in phases ----------------------------------------

export const CCS_MEASURES = {
  transport:  { label: "Transport cost per year", unit: "$M/yr" },
  cumulative: { label: "Transport cost so far",   unit: "$M" },
  pipeKm:     { label: "Pipeline in use",         unit: "km" },
  captured:   { label: "CO₂ stored per year",     unit: "Mt/yr" },
};

/** Year-by-year cumulative transport cost, 0..30, for both designs. Exact: each phase has a
 *  constant published annual cost, so the running total is that cost times the years elapsed. */
export function ccsCumulative(mode) {
  const t = CCS[mode].transport;
  const single = [0], phased = [0];
  for (let y = 1; y <= 30; y++) {
    single.push(round(single[y - 1] + t.single, 2));
    phased.push(round(phased[y - 1] + t.phases[Math.floor((y - 1) / 5)], 2));
  }
  return { single, phased };
}

/** Totals through the end of a phase (1..6). */
export function ccsThrough(mode, phase) {
  const p = clampInt(phase, 1, 6, 6);
  const c = ccsCumulative(mode);
  const y = p * 5;
  const single = c.single[y], phased = c.phased[y];
  return {
    phase: p, year: y, single, phased,
    saving: round(single - phased, 2),
    savingPct: single ? Math.round((1 - phased / single) * 100) : 0,
    pipeSingle: CCS[mode].pipeKm.single,
    pipePhased: CCS[mode].pipeKm.phases[p - 1],
    capSingle: CCS[mode].captured.single,
    capPhased: CCS[mode].captured.phases[p - 1],
  };
}

/** Full-project results as the papers compute them (30 years). */
export function ccsProject(mode) {
  const m = CCS[mode];
  const phasedTransport = round(5 * sum(m.transport.phases), 2);
  const singleTransport = round(30 * m.transport.single, 2);
  const phasedNet = round(5 * sum(m.annual.phases), 1);   // negative = net revenue
  const singleNet = round(30 * m.annual.single, 1);
  return {
    singleTransport, phasedTransport,
    transportSavingPct: Math.round((1 - phasedTransport / singleTransport) * 100),
    singleNet, phasedNet,
    profitGainPct: Math.round((phasedNet / singleNet - 1) * 100),
    storedGainPct: Math.round((m.captured.full / m.captured.single - 1) * 100),
    meanPhasedTransport: round(sum(m.transport.phases) / 6, 2),
  };
}

// ---- Panel C: firm power for a data center ----------------------------------------------------

export function dcScenario(id) {
  return DC.find((d) => d.id === id) || DC[2];
}

/** Share of the 250 MW load the site can carry alone during a grid outage (Table 15 Max BTM). */
export function dcCoverage(id) {
  const s = dcScenario(id);
  return Math.min(1, s.maxMW / DC_LOAD_MW);
}

/** Installed capacity by source for a scenario (Table 11), largest first, battery last. */
export function dcMix(id) {
  const s = dcScenario(id);
  return Object.entries(s.mix)
    .sort((a, b) => (a[0] === "bess") - (b[0] === "bess") || b[1] - a[1])
    .map(([k, mw]) => ({ key: k, mw }));
}

export const dcIsGeothermal = (id) => "geo" in dcScenario(id).mix;

// ---- URL state --------------------------------------------------------------------------------

export function clampInt(v, lo, hi, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export const DEFAULTS = {
  lens: "study", st: "", gm: "egs", gc: "all",
  cm: "cap", cq: "transport", ph: 6,
  dc: "S3", dg: "all",
};
const KEYS = { lens: "lens", st: "st", gm: "gm", gc: "gc", cm: "cm", cq: "cq", ph: "ph", dc: "dc", dg: "dg" };
const DC_IDS = DC.map((d) => d.id);
const OPTIONS = {
  lens: Object.keys(GEO_LENSES), gm: Object.keys(GEO_MEASURES), gc: Object.keys(GEO_CATS),
  cm: Object.keys(CCS), cq: Object.keys(CCS_MEASURES), dc: DC_IDS, dg: ["all", "geo"],
};

/** Parse a query string into a full, validated state. Unknown keys and bad values are ignored. */
export function parseState(search) {
  const q = new URLSearchParams(search || "");
  const s = { ...DEFAULTS };
  for (const k of Object.keys(KEYS)) {
    if (!q.has(k)) continue;
    const raw = q.get(k);
    if (k === "ph") s.ph = clampInt(raw, 1, 6, DEFAULTS.ph);
    else if (k === "st") s.st = GEO_STATES.includes(String(raw).toUpperCase()) ? String(raw).toUpperCase() : "";
    else if (OPTIONS[k].includes(raw)) s[k] = raw;
  }
  return s;
}

/** Serialize only the values that differ from the defaults. */
export function serializeState(s) {
  const q = new URLSearchParams();
  for (const k of Object.keys(KEYS)) {
    if (s[k] !== undefined && s[k] !== DEFAULTS[k]) q.set(k, String(s[k]));
  }
  return q.toString();
}
