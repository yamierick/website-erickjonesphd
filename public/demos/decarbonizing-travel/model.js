// Pure functions: settings in, numbers and geometry out. No DOM here, so
// test.mjs can run every function under node.

import {
  SAV_RESULTS, SAV_SCENARIOS, EREV_RANGES, EREV_CASES, EREV_ELECTRIC_VMT_B,
  EREV_EV_SHARE_PCT, EREV_BATTERY_KWH, EREV_FLEET_TWH, EREV_CO2_SAVED_MT,
} from "./data.js";

export const PJ_PER_TWH = 3.6; // 1 TWh = 3.6 PJ (unit conversion only)

// ---------------------------------------------------------------- panel A ----

export const SAV_DEFAULTS = { sav: "70", tax: false, chg: "optimized", dm: 1, view: "veh" };
export const VIEWS = ["veh", "elc", "co2"];

/**
 * Apply one control change and snap to a published scenario. The paper ran
 * night-only charging only with a travel multiplier of 1, so choosing night
 * charging sets the multiplier to 1, and choosing 0.5 or 2 sets charging back
 * to "any idle hour". With no shared fleet, charging and multiplier do not
 * apply (the state keeps them, so switching the fleet back restores them).
 */
export function applyChange(state, key, value) {
  const s = { ...state, [key]: value };
  if (key === "chg" && value === "night") s.dm = 1;
  if (key === "dm" && value !== 1) s.chg = "optimized";
  return normalizeSav(s);
}

/** Force any state onto a combination the paper ran. */
export function normalizeSav(state) {
  const s = { ...SAV_DEFAULTS, ...state };
  if (s.sav !== "70" && s.sav !== "none") s.sav = SAV_DEFAULTS.sav;
  s.tax = !!s.tax;
  if (s.chg !== "optimized" && s.chg !== "night") s.chg = SAV_DEFAULTS.chg;
  if (![0.5, 1, 2].includes(s.dm)) s.dm = SAV_DEFAULTS.dm;
  if (s.chg === "night" && s.dm !== 1) s.dm = 1;
  if (!VIEWS.includes(s.view)) s.view = SAV_DEFAULTS.view;
  return s;
}

/** Table 2 scenario number for a (normalized) state. */
export function scenarioId(state) {
  const s = normalizeSav(state);
  const hit = SAV_SCENARIOS.find((c) => c.tax === s.tax && (s.sav === "none"
    ? c.sav === "none"
    : c.sav === "70" && c.charging === s.chg && c.dm === s.dm));
  return hit ? hit.id : null;
}

/** The private-cars-only scenario under the same carbon policy. */
export const privateOnlyId = (state) => (normalizeSav(state).tax ? 10 : 5);

const sum = (a) => a.reduce((t, v) => t + v, 0);
const yearIndex = (y) => SAV_RESULTS.years.indexOf(y);

export function scenarioData(id) {
  const d = SAV_RESULTS.scenarios[String(id)];
  if (!d) throw new Error(`no scenario ${id}`);
  return d;
}

/** Electricity generation in TWh by group, each an array over SAV_RESULTS.years. */
export function generationTWh(id) {
  const g = scenarioData(id).generationPJ;
  const out = {};
  for (const k of Object.keys(g)) out[k] = g[k].map((v) => v / PJ_PER_TWH);
  return out;
}

export function generationShares(id, year) {
  const g = scenarioData(id).generationPJ, i = yearIndex(year);
  const tot = sum(Object.keys(g).map((k) => g[k][i]));
  const out = {};
  for (const k of Object.keys(g)) out[k] = tot > 0 ? (100 * g[k][i]) / tot : 0;
  return out;
}

export function gasPeak(id) {
  let best = { year: null, share: -1 };
  for (const y of SAV_RESULTS.years) {
    const s = generationShares(id, y).gas;
    if (s > best.share) best = { year: y, share: s };
  }
  return best;
}

export function vehicleTotal(id, year) {
  const v = scenarioData(id).vehicles, i = yearIndex(year);
  return v.privateFuel[i] + v.privateEV[i] + v.sharedFuel[i] + v.sharedEV[i];
}

/** Battery-electric share of the shared fleet in a year (null when no fleet). */
export function sharedEVShare(id, year) {
  const v = scenarioData(id).vehicles, i = yearIndex(year);
  const tot = v.sharedFuel[i] + v.sharedEV[i];
  return tot > 0.5 ? v.sharedEV[i] / tot : null;
}

export function annualCO2(id) {
  const c = scenarioData(id).co2Mt;
  return SAV_RESULTS.years.map((_, i) => c.electricity[i] + c.vehicles[i] + c.fuels[i]);
}

export const cumulativeCO2 = (id) => sum(annualCO2(id));

/** Everything the panel-A readout shows, for one state. */
export function savSummary(state) {
  const s = normalizeSav(state);
  const id = scenarioId(s), base = privateOnlyId(s);
  const mix = generationShares(id, 2050);
  return {
    id, base, state: s,
    vehicles2050: vehicleTotal(id, 2050),
    vehiclesPrivateOnly2050: vehicleTotal(base, 2050),
    sharedEV2030: sharedEVShare(id, 2030),
    gas2035: generationShares(id, 2035).gas,
    gasPeak: gasPeak(id),
    mix2050: mix,
    renewables2050: mix.solar + mix.wind,
    cumCO2: cumulativeCO2(id),
    cumCO2PrivateOnly: cumulativeCO2(base),
    costVsPrivateOnlyPct: 100 * (scenarioData(id).objective / scenarioData(base).objective - 1),
  };
}

/** Stacked layers for the chosen view: [{key, values}] bottom to top, plus the years shown. */
export const VEHICLE_KEYS = ["privateFuel", "privateEV", "sharedFuel", "sharedEV"];
export const GEN_KEYS = ["coal", "nuclear", "gas", "other", "wind", "solar"];
export const CO2_KEYS = ["electricity", "vehicles"];

export function viewLayers(state) {
  const s = normalizeSav(state);
  const id = scenarioId(s), base = privateOnlyId(s);
  const years = SAV_RESULTS.years;
  if (s.view === "veh") {
    // From 2020: the 2015 column carries inherited stock (180 thousand fleet
    // gasoline cars even with no fleet) that the model retires in its first years.
    const i0 = years.indexOf(2020);
    const v = scenarioData(id).vehicles;
    return {
      years: years.slice(i0), unit: "thousand vehicles",
      layers: VEHICLE_KEYS.map((k) => ({ key: k, values: v[k].slice(i0) })),
      compare: s.sav === "none" ? null
        : { label: "Private cars only", values: years.slice(i0).map((y) => vehicleTotal(base, y)) },
    };
  }
  if (s.view === "elc") {
    const g = generationTWh(id);
    return { years, unit: "TWh a year", layers: GEN_KEYS.map((k) => ({ key: k, values: g[k] })), compare: null };
  }
  const c = scenarioData(id).co2Mt;
  return {
    years, unit: "Mt CO₂ a year",
    layers: CO2_KEYS.map((k) => ({ key: k, values: c[k] })),
    compare: s.sav === "none" ? null : { label: "Private cars only", values: annualCO2(base) },
  };
}

// ---------------------------------------------------------------- panel B ----

export const EREV_DEFAULTS = { rng: 50, cs: "avg" };

/** Snap any number to the nearest published range (25-150 in steps of 25). */
export function snapRange(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return EREV_DEFAULTS.rng;
  let best = EREV_RANGES[0];
  for (const r of EREV_RANGES) if (Math.abs(r - n) < Math.abs(best - n)) best = r;
  return best;
}

export function erevPoint(range, cs) {
  const c = EREV_CASES[cs] ? cs : "avg";
  const r = range === "ev" ? "ev" : snapRange(range);
  return {
    range: r,
    evSharePct: EREV_EV_SHARE_PCT[r],
    electricVMT: EREV_ELECTRIC_VMT_B[r],
    batteryKWh: EREV_BATTERY_KWH[c][r],
    fleetTWh: EREV_FLEET_TWH[c][r],
    co2Saved: EREV_CO2_SAVED_MT[c][r],
  };
}

/** What the next 25 miles of range adds (null at 150). */
export function nextStep(range, cs) {
  const r = snapRange(range), i = EREV_RANGES.indexOf(r);
  if (i === EREV_RANGES.length - 1) return null;
  const a = erevPoint(r, cs), b = erevPoint(EREV_RANGES[i + 1], cs);
  return { to: EREV_RANGES[i + 1], sharePts: b.evSharePct - a.evSharePct, twh: b.fleetTWh - a.fleetTWh };
}

// ------------------------------------------------------------- URL state ----

/** Query string -> state. Unknown keys ignored, bad values fall back to defaults. */
export function parseQuery(search) {
  const q = new URLSearchParams(search || "");
  const a = { ...SAV_DEFAULTS };
  if (q.get("sav") === "0") a.sav = "none";
  if (q.get("tax") === "1") a.tax = true;
  if (q.get("chg") === "night") a.chg = "night";
  if (q.has("dm")) { const d = Number(q.get("dm")); if ([0.5, 1, 2].includes(d)) a.dm = d; }
  if (VIEWS.includes(q.get("view"))) a.view = q.get("view");
  // If both were given and conflict (night + dm != 1), night wins, as in the UI.
  const sav = normalizeSav(a);
  const b = { ...EREV_DEFAULTS };
  if (q.has("rng")) b.rng = snapRange(q.get("rng"));
  if (EREV_CASES[q.get("case")]) b.cs = q.get("case");
  return { sav, erev: b };
}

/** State -> query string, writing only what differs from the defaults. */
export function toQuery({ sav, erev }) {
  const s = normalizeSav(sav), q = new URLSearchParams();
  if (s.sav !== SAV_DEFAULTS.sav) q.set("sav", "0");
  if (s.tax !== SAV_DEFAULTS.tax) q.set("tax", "1");
  if (s.chg !== SAV_DEFAULTS.chg) q.set("chg", "night");
  if (s.dm !== SAV_DEFAULTS.dm) q.set("dm", String(s.dm));
  if (s.view !== SAV_DEFAULTS.view) q.set("view", s.view);
  const r = snapRange(erev.rng);
  if (r !== EREV_DEFAULTS.rng) q.set("rng", String(r));
  if (erev.cs !== EREV_DEFAULTS.cs && EREV_CASES[erev.cs]) q.set("case", erev.cs);
  return q.toString();
}

// ----------------------------------------------------------- chart maths ----

export function linear(d0, d1, r0, r1) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v) => r0 + (v - d0) * k;
}

/** Round axis maximum and tick step for a positive maximum. */
export function niceMax(max, ticks = 5) {
  if (!(max > 0)) return { max: 1, step: 0.2 };
  const raw = max / ticks, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw);
  return { max: Math.ceil(max / step) * step, step };
}

/** Cumulative stack: returns [{key, lo[], hi[]}] bottom to top. */
export function stack(layers) {
  const n = layers[0]?.values.length || 0;
  let base = new Array(n).fill(0);
  return layers.map((l) => {
    const lo = base, hi = base.map((b, i) => b + l.values[i]);
    base = hi;
    return { key: l.key, lo, hi };
  });
}

/** SVG path for a band between lo and hi. */
export function bandPath(xs, lo, hi, x, y) {
  let d = `M${x(xs[0]).toFixed(1)} ${y(hi[0]).toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) d += `L${x(xs[i]).toFixed(1)} ${y(hi[i]).toFixed(1)}`;
  for (let i = xs.length - 1; i >= 0; i--) d += `L${x(xs[i]).toFixed(1)} ${y(lo[i]).toFixed(1)}`;
  return d + "Z";
}

export function linePath(xs, vs, x, y) {
  return vs.map((v, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)} ${y(v).toFixed(1)}`).join("");
}

export const fmtInt = (v) => Math.round(v).toLocaleString("en-US");
export const fmt1 = (v) => (Math.round(v * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
