// Pure functions: settings in, what to draw out. No DOM, so test.mjs can run them in node.
import {
  METALS, METAL_ORDER, HHI_BANDS, POLICY, COBALT_OLD_WORLD_KT,
  LI_PLANS, LI_TABLE4, IISE_T2,
} from "./data.js";

// ---------------------------------------------------------------- concentration (Akhter et al.)
/** Herfindahl-Hirschman Index: the sum of squared percentage shares. */
export function hhi(sharesPct) {
  return sharesPct.reduce((s, x) => s + x * x, 0);
}

export function band(value) {
  return HHI_BANDS.find((b) => value < b.max) ?? HHI_BANDS[HHI_BANDS.length - 1];
}

/** The HHI the demo shows (corrected where the paper's own tables disagree with Table 13). */
export function shownHHI(id) {
  const m = METALS[id];
  return m.hhiCorrected ?? m.hhi;
}

/** HHI recomputed from a metal's company table (printed shares). */
export function hhiFromTable(id) {
  return hhi(METALS[id].companies.map((c) => c.share));
}

/** Cobalt: what Table 7's outputs give on the older ~230.5 kt world total. */
export function cobaltHHIOnOldTotal() {
  const c = METALS.co;
  return hhi(c.companies.map((x) => (100 * x.prod) / COBALT_OLD_WORLD_KT));
}

export function metalView(id, maxCompanies = 10) {
  const m = METALS[id];
  const companies = [...m.companies].sort((a, b) => b.share - a.share);
  const shown = companies.slice(0, maxCompanies).map((c) => ({ ...c, china: /China/.test(c.proc) }));
  const rest = companies.slice(maxCompanies);
  const countries = [...m.countries]
    .sort((a, b) => b.total - a.total)
    .map((c) => ({ ...c, shareOfWorld: (100 * c.total) / m.world }));
  const value = shownHHI(id);
  return {
    id,
    name: m.name,
    unit: m.unit,
    world: m.world,
    hhi: value,
    hhiPublished: m.hhi,
    corrected: m.hhiCorrected != null,
    band: band(value),
    companies: shown,
    moreCount: rest.length,
    moreShare: rest.reduce((s, c) => s + c.share, 0),
    top: companies[0],
    top3Share: companies.slice(0, 3).reduce((s, c) => s + c.share, 0),
    listedShare: companies.reduce((s, c) => s + c.share, 0),
    countries,
    topCountry: countries[0],
    policy: POLICY[m.policy],
    hub: m.hub,
    tables: m.tables,
  };
}

/** One row per metal for the HHI strip, in display order. */
export function hhiRows() {
  return METAL_ORDER.map((id) => ({
    id,
    name: METALS[id].name,
    value: shownHHI(id),
    published: METALS[id].hhi,
    corrected: METALS[id].hhiCorrected != null,
  }));
}

// ---------------------------------------------------------------- lithium plans (Jones 2024)
export const PLANS = ["cost", "co2"];

export function yearsArray() {
  const [a, b] = LI_PLANS.years;
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function mineTotals(plan) {
  const m = LI_PLANS[plan].mine;
  return m.spod.map((_, i) => m.spod[i] + m.clay[i] + m.brine[i]);
}

export function planView(plan, year, metric) {
  const other = plan === "cost" ? "co2" : "cost";
  const yi = LI_TABLE4.years.indexOf(year);
  const stages = LI_TABLE4.stages;
  const facilities = stages.map((s) => ({
    stage: s, cost: LI_TABLE4.cost[s][yi], co2: LI_TABLE4.co2[s][yi],
  }));
  const key = metric === "cost" ? "stageCost" : "stageCO2";
  const scale = metric === "cost" ? 1e-6 : 1e-6; // USD million -> trillion; kt -> Gt
  const byStage = stages.map((s) => ({
    stage: s,
    cost: LI_PLANS.cost[key][s] * scale,
    co2: LI_PLANS.co2[key][s] * scale,
  }));
  return {
    plan,
    other,
    years: yearsArray(),
    mine: LI_PLANS[plan].mine,
    total: mineTotals(plan),
    otherTotal: mineTotals(other),
    year,
    facilities,
    byStage,
    metric,
    totalCost: LI_TABLE4.totalCostTrillion[plan],
    totalCO2: LI_TABLE4.totalCO2Gt[plan],
    recyclingPlants: LI_TABLE4[plan].rec[yi],
    mines: LI_TABLE4[plan].mine[yi],
  };
}

/** Share of whole-horizon CO2 from cell and pack making (published least-cost solution). */
export function cellPackShare(plan = "cost") {
  const s = LI_PLANS[plan].stageCO2;
  return (s.cell + s.pack) / LI_PLANS[plan].totalCO2;
}

// ---------------------------------------------------------------- U.S.-Australia (Alavi et al.)
export const ALLOCS = IISE_T2.map((r) => r.alloc);

export function snapAlloc(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const c = Math.min(60, Math.max(0, n));
  return Math.round(c / 10) * 10;
}

export function agreementView(alloc) {
  const a = snapAlloc(alloc) ?? 0;
  const row = IISE_T2.find((r) => r.alloc === a);
  const base = IISE_T2[0];
  return {
    alloc: a,
    row,
    rows: IISE_T2,
    usChange: row.usTotal - base.usTotal,
    usMultiple: row.usTotal / base.usTotal,
    importChangePct: (100 * (row.usImport - base.usImport)) / base.usImport,
    chinaChangePct: (100 * (row.china - base.china)) / base.china,
    combined: row.usTotal + row.china,
    combinedChange: row.usTotal + row.china - (base.usTotal + base.china),
    domesticShareOfUS: row.usTotal > 0 ? (100 * row.usDomestic) / row.usTotal : 0,
  };
}

/** Increase in U.S. total cost from one published scenario to the next. */
export function usSteps() {
  return IISE_T2.slice(1).map((r, i) => ({
    from: IISE_T2[i].alloc, to: r.alloc, step: r.usTotal - IISE_T2[i].usTotal,
  }));
}

// ---------------------------------------------------------------- URL state
export const DEFAULTS = { m: "li", p: "cost", y: 2050, k: "co2", a: 30 };

/** Read a query string; unknown keys ignored, bad values fall back to defaults. */
export function parseState(search) {
  const q = new URLSearchParams(search);
  const s = { ...DEFAULTS };
  if (METAL_ORDER.includes(q.get("m"))) s.m = q.get("m");
  if (PLANS.includes(q.get("p"))) s.p = q.get("p");
  const y = Number(q.get("y"));
  if (q.has("y") && LI_TABLE4.years.includes(y)) s.y = y;
  if (["co2", "cost"].includes(q.get("k"))) s.k = q.get("k");
  if (q.has("a")) {
    const a = snapAlloc(q.get("a"));
    if (a != null) s.a = a;
  }
  return s;
}

/** Only values that differ from the defaults are written. */
export function serializeState(s) {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) if (s[k] !== DEFAULTS[k]) q.set(k, String(s[k]));
  return q.toString();
}
