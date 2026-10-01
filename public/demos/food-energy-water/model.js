// Pure functions: settings in, numbers and geometry out. No DOM, so test.mjs can
// run everything under node.

import {
  COOPT, SIZES, PLANS, TECH_LABEL, CLIMATES, BELIEFS, BELIEF_PROB, PRECIP_PCT,
  PROFIT, VALUES, PROFIT_BY_CLIMATE, REPO_VALUES,
} from "./data.js";

// ---------------------------------------------------------------- panel A ----
export const COOP_DEFAULTS = { size: "32", plan: "coop" };

export function normalizeCoop(s) {
  const out = { ...COOP_DEFAULTS, ...s };
  out.size = String(out.size);
  if (!SIZES.includes(out.size)) out.size = COOP_DEFAULTS.size;
  if (!PLANS.includes(out.plan)) out.plan = COOP_DEFAULTS.plan;
  return out;
}

/** Everything the panel-A readout shows. */
export function coopScenario(state) {
  const { size, plan } = normalizeCoop(state);
  const p = COOPT.plans[plan];
  const cost = p.cost[size];
  return {
    size, plan, cost,
    utilityCost: COOPT.utilityCost,
    saving: COOPT.utilityCost - cost,
    savingPct: 100 * (1 - cost / COOPT.utilityCost),
    elecShare: p.elecShare[size],
    waterShare: p.waterShare[size],
    built: (p.built[size] || []).map((t) => TECH_LABEL[t] || t),
    builtCodes: p.built[size] || [],
  };
}

/** Cost per home by size for every plan (for the line chart). */
export const costLines = () => PLANS.map((plan) => ({ plan, values: SIZES.map((s) => COOPT.plans[plan].cost[s]) }));

/** The cheapest plan at a size. */
export function cheapestPlan(size) {
  return PLANS.reduce((best, p) => (COOPT.plans[p].cost[size] < COOPT.plans[best].cost[size] ? p : best), PLANS[0]);
}

// ---------------------------------------------------------------- panel B ----
export const FARM_DEFAULTS = { belief: "ep", clim: "dry" };

export function normalizeFarm(s) {
  const out = { ...FARM_DEFAULTS, ...s };
  if (!BELIEFS.includes(out.belief)) out.belief = FARM_DEFAULTS.belief;
  if (!CLIMATES.includes(out.clim)) out.clim = FARM_DEFAULTS.clim;
  return out;
}

/** The three published values of information for a belief (Table 4). */
export function valueBars(belief) {
  const v = VALUES[belief];
  return [
    { key: "evkc", value: v.evkc },
    { key: "evkw", value: v.evkw },
    { key: "vss", value: v.vss },
  ];
}

/** Probability-weighted profit of a plan across climates (checks Tables 5-7 agree). */
export function weightedProfit(belief, which) {
  return CLIMATES.reduce((t, c) => t + BELIEF_PROB[belief][c] * PROFIT_BY_CLIMATE[belief][c][which], 0);
}

export function climateView(state) {
  const { belief, clim } = normalizeFarm(state);
  const row = PROFIT_BY_CLIMATE[belief][clim];
  return {
    belief, clim,
    probability: BELIEF_PROB[belief][clim],
    precipPct: PRECIP_PCT[clim],
    knownProfit: row.kcuw,
    hedgedProfit: row.stoch,
    shortfall: row.kcuw - row.stoch,
    expected: PROFIT[belief],
    values: VALUES[belief],
    repoValues: REPO_VALUES[belief],
  };
}

// ------------------------------------------------------------- URL state ----
export function parseQuery(search) {
  const q = new URLSearchParams(search || "");
  const coop = normalizeCoop({
    ...(q.has("size") ? { size: q.get("size") } : {}),
    ...(q.has("plan") ? { plan: q.get("plan") } : {}),
  });
  const farm = normalizeFarm({
    ...(q.has("belief") ? { belief: q.get("belief") } : {}),
    ...(q.has("clim") ? { clim: q.get("clim") } : {}),
  });
  return { coop, farm };
}

export function toQuery({ coop, farm }) {
  const c = normalizeCoop(coop), f = normalizeFarm(farm), q = new URLSearchParams();
  if (c.size !== COOP_DEFAULTS.size) q.set("size", c.size);
  if (c.plan !== COOP_DEFAULTS.plan) q.set("plan", c.plan);
  if (f.belief !== FARM_DEFAULTS.belief) q.set("belief", f.belief);
  if (f.clim !== FARM_DEFAULTS.clim) q.set("clim", f.clim);
  return q.toString();
}

// ----------------------------------------------------------- chart maths ----
export function linear(d0, d1, r0, r1) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v) => r0 + (v - d0) * k;
}

export const usd = (v) => `$${Math.round(v).toLocaleString("en-US")}`;
export const usdCents = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const usdM = (v) => `$${(v / 1e6).toFixed(2)}M`;
export const pct = (f) => `${Math.round(100 * f)}%`;
