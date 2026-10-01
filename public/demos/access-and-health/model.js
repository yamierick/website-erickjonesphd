// Pure functions (no DOM) for the access-and-health demo.
// Values come only from data.js (paper-printed or regenerated from public repos) and zips.json.
// The supply control snaps to the paper's four scenarios; nothing is computed between them.

import { TABLE2, MULTIPLIERS, POLICIES, PRINTED, REPO, LAYERS, REGIONS } from "./data.js";

// ---- Panel A: map ------------------------------------------------------------------------------

/** Class index 0..breaks.length for a value (value < breaks[0] -> 0). */
export function classify(v, breaks) {
  let i = 0;
  while (i < breaks.length && v >= breaks[i]) i++;
  return i;
}

/** Legend labels for integer breaks, e.g. [1,3,6,10] -> ["0","1–2","3–5","6–9","10+"]. */
export function legendLabels(breaks) {
  const out = [];
  out.push(breaks[0] === 1 ? "0" : `<${breaks[0]}`);
  for (let i = 0; i < breaks.length - 1; i++) {
    const lo = breaks[i], hi = breaks[i + 1] - 1;
    out.push(lo === hi ? String(lo) : `${lo}–${hi}`);
  }
  out.push(`${breaks[breaks.length - 1]}+`);
  return out;
}

/** Totals for all ZIPs, one region, or one ZIP. */
export function totals(zips, { region = "", zip = "" } = {}) {
  const sel = zips.filter((z) => (zip ? z.zip === zip : region ? z.region === region : true));
  const t = { zips: sel.length, cases: 0, active: 0, recovered: 0, deaths: 0 };
  for (const z of sel) { t.cases += z.cases; t.active += z.active; t.recovered += z.recovered; t.deaths += z.deaths; }
  return t;
}

// ---- Panel B: the eight scenarios --------------------------------------------------------------

/** Scenario-1 supply share implied by two printed penalties under equal distribution:
 *  (1 - 2s)/(1 - s) = p2/p1  =>  s = (1 - r)/(2 - r), r = p2/p1. */
export function impliedSupplyShare(p1, p2) {
  const r = p2 / p1;
  return (1 - r) / (2 - r);
}

const get = (obj, policy, k) => (obj[policy] && obj[policy][k] !== undefined ? obj[policy][k] : null);

/** Everything known about one scenario: paper-printed values (or null) and the repo rows. */
export function scenario(policy, k) {
  const pol = POLICIES[policy] ? policy : "equal";
  const kk = MULTIPLIERS.includes(k) ? k : 1;
  const repo = REPO[pol].find((r) => r.k === kk);
  const printed = {
    penaltyM: get(PRINTED.penaltyM, pol, kk),
    servicePct: get(PRINTED.servicePct, pol, kk),
    underservedPct: get(PRINTED.underservedPct, pol, kk),
  };
  const people = (pct) => (pct == null ? null : Math.round((TABLE2.target * pct) / 100));
  return {
    policy: pol, k: kk, scenarioNumber: (pol === "equal" ? 0 : 4) + kk,
    printed, repo,
    peoplePrinted: people(printed.servicePct),
    peopleRepo: people(repo.service),
  };
}

export const METRICS = {
  service:   { label: "Share of target group served", unit: "%" },
  penalty:   { label: "Shortage penalty",              unit: "$M" },
  transport: { label: "Transport cost",                unit: "$M" },
  both:      { label: "Penalty and transport, same scale", unit: "$M" },
};

/** Series for the chart: repo values by multiplier, plus printed markers where they exist. */
export function series(policy, metric) {
  const rows = MULTIPLIERS.map((k) => scenario(policy, k));
  if (metric === "service") {
    return rows.map((s) => ({ k: s.k, bar: s.repo.service, line: s.repo.topThird,
      printed: s.printed.servicePct, printedUnderserved: s.printed.underservedPct }));
  }
  if (metric === "penalty") return rows.map((s) => ({ k: s.k, bar: s.repo.penalty, printed: s.printed.penaltyM }));
  if (metric === "transport") return rows.map((s) => ({ k: s.k, bar: s.repo.transport, printed: null }));
  return rows.map((s) => ({ k: s.k, bar: s.repo.penalty, bar2: s.repo.transport, printed: s.printed.penaltyM }));
}

// ---- URL state --------------------------------------------------------------------------------

export const DEFAULTS = { m: "cases", r: "", z: "", k: 1, p: "equal", q: "service" };

export function parseState(search, zipIds = null) {
  const q = new URLSearchParams(search || "");
  const s = { ...DEFAULTS };
  if (q.has("m") && LAYERS[q.get("m")]) s.m = q.get("m");
  if (q.has("r") && REGIONS[q.get("r")]) s.r = q.get("r");
  if (q.has("z") && /^\d{5}$/.test(q.get("z")) && (!zipIds || zipIds.includes(q.get("z")))) s.z = q.get("z");
  if (q.has("k")) {
    const n = Math.round(Number(q.get("k")));
    if (Number.isFinite(n)) s.k = Math.min(4, Math.max(1, n));
  }
  if (q.has("p") && POLICIES[q.get("p")]) s.p = q.get("p");
  if (q.has("q") && METRICS[q.get("q")]) s.q = q.get("q");
  return s;
}

export function serializeState(s) {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) if (s[k] !== undefined && s[k] !== DEFAULTS[k]) q.set(k, String(s[k]));
  return q.toString();
}
