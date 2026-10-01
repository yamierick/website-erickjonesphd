// Pure functions: settings in, what to draw out. No DOM, so test.mjs can run them in node.
import {
  NET_COST, COST_PARTS, NET_CO2, CO2_PARTS, NONHAZ, FLOWS, NET_SETUP,
  TRIALS, STAGES, FEED_G, T2_STATS, T3, P_METHOD, P_UNIT, EQUIPMENT, DOE,
} from "./data.js";

// ---------------------------------------------------------------- networks (Logistics 2025)
export const sumParts = (obj, parts) => parts.reduce((s, [k]) => s + obj[k], 0);

export function networkView(net, ordinaryFreight = false) {
  const cost = (n) => COST_PARTS.map(([k, label]) => ({ key: k, label, value: NET_COST[n][k] }));
  const co2 = (n) => CO2_PARTS.map(([k, label]) => ({ key: k, label, value: NET_CO2[n][k] }));
  const hazFreight = net === "cen" ? FLOWS.batteriesMt : 0;
  return {
    net,
    ordinaryFreight,
    cost: { cen: cost("cen"), dec: cost("dec") },
    co2: { cen: co2("cen"), dec: co2("dec") },
    totals: { cen: NET_COST.cen.totalPrinted, dec: NET_COST.dec.totalPrinted },
    ops: { cen: NET_COST.cen.opsPrinted, dec: NET_COST.dec.opsPrinted },
    infra: { cen: NET_COST.cen.infra, dec: NET_COST.dec.infra },
    co2Totals: { cen: NET_CO2.cen.totalPrinted, dec: NET_CO2.dec.totalPrinted },
    nonHazCen: NONHAZ.cenTotal,
    reductionPct: 100 * (1 - NET_COST.dec.totalPrinted / NET_COST.cen.totalPrinted),
    hazardousMt: hazFreight,
    flows: FLOWS,
    setup: NET_SETUP[net],
  };
}

/** Gap between the ordinary-freight centralized total and the tables' decentralized total. */
export function nonHazGap() {
  const bn = NONHAZ.cenTotal - NET_COST.dec.totalPrinted;
  return { bn, pct: (100 * bn) / NONHAZ.cenTotal };
}

// ---------------------------------------------------------------- grinding (Energies 2025)
const IDX = { pre: 0, post: 1, res: 2 };

export function trialValues(method, stage, unit = 0) {
  return TRIALS.filter((t) => !unit || t.unit === unit).map((t) => t[method][IDX[stage]]);
}
export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
export function sd(a) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

export function grindView(method, stage, unit) {
  const methods = ["m", "e"].map((k) => ({
    key: k,
    points: TRIALS.map((t) => ({ unit: t.unit, trial: t.trial, g: t[k][IDX[stage]] })),
    mean: stage === "post" ? T3[k].mean : T2_STATS[stage][k].mean, // published means
    sd: stage === "post" ? T3[k].sd : T2_STATS[stage][k].sd,
    ci: stage === "post" ? T3.ci99 : null,                           // 99% interval published only after sieving
  }));
  const sel = methods.find((x) => x.key === method);
  const line = lineCost(method);
  return {
    method, stage, unit, methods, sel,
    pctOfFeed: (100 * sel.mean) / FEED_G,
    pMethod: P_METHOD[stage],
    pUnit: P_UNIT[stage] ?? null,
    significant: P_METHOD[stage] < 0.01,
    unitMean: unit ? mean(trialValues(method, stage, unit)) : null,
    line,
  };
}

export function lineCost(method) {
  const parts = [EQUIPMENT.shredder, method === "m" ? EQUIPMENT.manual : EQUIPMENT.electric, EQUIPMENT.sieve];
  return { parts, total: parts.reduce((s, p) => s + p.usd, 0) };
}
export const allEquipment = () => Object.values(EQUIPMENT).reduce((s, p) => s + p.usd, 0);

// ---------------------------------------------------------------- leaching design (IISE 2026)
/** 1-based condition number in standard order (acid slowest, pulp density fastest). */
export function conditionNumber(h, o, d) { return (h - 1) * 9 + (o - 1) * 3 + d; }
export function doeView(h, o, d) {
  return {
    n: conditionNumber(h, o, d),
    total: DOE.factors.reduce((p, f) => p * f.levels.length, 1),
    runs: DOE.factors.reduce((p, f) => p * f.levels.length, 1) * DOE.replicates,
    labels: [DOE.factors[0].levels[h - 1], DOE.factors[1].levels[o - 1], DOE.factors[2].levels[d - 1]],
  };
}

// ---------------------------------------------------------------- URL state
export const DEFAULTS = { n: "dec", f: 0, g: "e", s: "post", u: 0, h: 2, o: 2, d: 2 };

export function parseState(search) {
  const q = new URLSearchParams(search);
  const s = { ...DEFAULTS };
  if (["dec", "cen"].includes(q.get("n"))) s.n = q.get("n");
  if (["0", "1"].includes(q.get("f"))) s.f = Number(q.get("f"));
  if (["m", "e"].includes(q.get("g"))) s.g = q.get("g");
  if (STAGES.includes(q.get("s"))) s.s = q.get("s");
  const int = (k, lo, hi) => {
    if (!q.has(k)) return;
    const v = Number(q.get(k));
    if (Number.isInteger(v)) s[k] = Math.min(hi, Math.max(lo, v));
  };
  int("u", 0, 4); int("h", 1, 3); int("o", 1, 3); int("d", 1, 3);
  return s;
}

export function serializeState(s) {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) if (s[k] !== DEFAULTS[k]) q.set(k, String(s[k]));
  return q.toString();
}
