/**
 * The cascade: energy demand -> generation capacity -> components -> materials
 * -> ore. Three snapshots, today and five and ten years out.
 *
 * This is a teaching toy, not research. It runs one direction with fixed
 * coefficients and nothing is optimized: you hand it a generation mix and it
 * tells you what that mix is made of. There is no cost, no siting, no lead
 * time, no substitution, no recycling, and no reason any number it prints
 * should be cited. Every coefficient lives in materialData.js.
 *
 * The two things it exists to show, both of which are multipliers rather than
 * additions, which is why they are easy to miss:
 *
 *   1. CAPACITY FACTOR, at the top. Demand is energy; materials are bought per
 *      unit of capacity. Solar runs about a quarter of the time and gas better
 *      than half, so the same terawatt-hour asks for more than twice the
 *      nameplate from one as from the other -- before a single kilogram of
 *      anything is counted.
 *
 *   2. ORE GRADE, at the bottom. Copper ore runs near half a percent, so a
 *      tonne of copper is a couple of hundred tonnes of rock. Steel is under
 *      two. A mix that looks like a modest shift in metal is a mountain in rock.
 *
 * Between them, a change in the mix that reads as incremental at the top comes
 * out the bottom as something else entirely. That is the whole page.
 */

import {
  TECHS, COMPONENTS, MATERIALS, ORES, ORE_OF,
  CAPACITY_FACTOR, INTENSITY, CHEMISTRY, GRID, ORE,
} from "./materialData.js";

const HOURS_PER_YEAR = 8760;
const GEN_TECHS = ["gas", "solar", "wind"];

/** Where the fleet starts. Roughly the current US mix, collapsed to three techs. */
export const MIX_TODAY = { gas: 0.62, solar: 0.13, wind: 0.25 };

export const DEFAULTS = {
  demand0: 4000, // TWh/yr served by these three technologies today
  demandGrowth: 0.02, // per year, compounded
  mixTarget: { gas: 0.30, solar: 0.35, wind: 0.35 },
  storageHours: 3, // GWh of storage built per GW of wind + solar
  lfpShare: 0.6, // fraction of storage energy that is LFP rather than NMC
  years: [0, 5, 10],
};

/** Normalize a mix to sum to one. A mix that does not sum to one is a bug. */
export function normalizeMix(mix) {
  const total = GEN_TECHS.reduce((s, t) => s + (mix[t] || 0), 0);
  if (total <= 0) return { ...MIX_TODAY };
  const out = {};
  for (const t of GEN_TECHS) out[t] = (mix[t] || 0) / total;
  return out;
}

/**
 * Nameplate GW needed to serve `twh` terawatt-hours a year at capacity factor
 * `cf`. This is multiplier one, and the only place it is applied.
 */
export function capacityForEnergy(twh, cf) {
  return (twh * 1000) / (HOURS_PER_YEAR * cf);
}

/** kg of `material` per MW (or per MWh, for storage) of `tech`. */
export function intensityOf(tech, material, lfpShare) {
  let kg = 0;
  for (const row of INTENSITY) {
    if (row.tech === tech && row.material === material) kg += row.qty;
  }
  if (tech === "battery" && (material === "lithium" || material === "nickel")) {
    kg += lfpShare * CHEMISTRY.LFP[material].qty
        + (1 - lfpShare) * CHEMISTRY.NMC[material].qty;
  }
  return kg;
}

/**
 * Every (tech, component, material) row for a technology, with the
 * chemistry-dependent storage rows folded in so the caller sees one list.
 */
function rowsFor(tech, lfpShare) {
  const rows = INTENSITY.filter((r) => r.tech === tech).map((r) => ({ ...r }));
  if (tech === "battery") {
    for (const material of ["lithium", "nickel"]) {
      const qty = lfpShare * CHEMISTRY.LFP[material].qty
                + (1 - lfpShare) * CHEMISTRY.NMC[material].qty;
      if (qty > 0) rows.push({ tech, component: "cell", material, qty });
    }
  }
  return rows;
}

/** Interpolate today's mix toward the target, linearly across the horizon. */
function mixAt(t, horizon, target) {
  const f = horizon > 0 ? t / horizon : 1;
  const out = {};
  for (const tech of GEN_TECHS) {
    out[tech] = MIX_TODAY[tech] + f * (target[tech] - MIX_TODAY[tech]);
  }
  return out;
}

/**
 * The capacity STOCK at year t: what has to be standing to serve demand.
 * Storage is sized off the wind and solar in the stock, not off demand.
 */
function stockAt(t, p, target) {
  const demandTWh = p.demand0 * Math.pow(1 + p.demandGrowth, t);
  const mix = mixAt(t, p.years[p.years.length - 1], target);

  const capacityGW = {};
  for (const tech of GEN_TECHS) {
    capacityGW[tech] = capacityForEnergy(demandTWh * mix[tech], CAPACITY_FACTOR[tech].value);
  }
  const vreGW = capacityGW.solar + capacityGW.wind;
  const storageGWh = p.storageHours * vreGW;

  return { demandTWh, mix, capacityGW, storageGWh };
}

/**
 * Materials for one period's BUILD.
 *
 * Capacity is a stock; materials are bought for the increment. A technology
 * whose share falls builds nothing rather than un-building something, so the
 * increment is floored at zero -- which is also why the shares in a period's
 * build do not match the shares in its stock, and should not be expected to.
 */
function buildOf(prev, now) {
  const builtGW = {};
  for (const tech of GEN_TECHS) {
    builtGW[tech] = Math.max(0, now.capacityGW[tech] - (prev ? prev.capacityGW[tech] : 0));
  }
  const builtStorageGWh = Math.max(0, now.storageGWh - (prev ? prev.storageGWh : 0));
  return { builtGW, builtStorageGWh };
}

/**
 * Turn a build into tonnes, and tonnes into ore.
 *
 * Returns the flow edges the diagram draws as well as the totals, because
 * deriving the edges separately from the totals is how the two drift apart.
 */
function materialize(builtGW, builtStorageGWh, lfpShare) {
  // tech -> component -> material, in tonnes. kg/MW * GW*1000 MW / 1000 kg = t.
  const edges = [];
  const byMaterial = {};
  const byComponent = {};
  for (const m of MATERIALS) byMaterial[m] = 0;
  for (const c of COMPONENTS) byComponent[c] = 0;

  const add = (tech, component, material, tonnes) => {
    if (tonnes <= 0) return;
    edges.push({ layer: "tech-component", from: tech, to: component, material, value: tonnes });
    edges.push({ layer: "component-material", from: component, to: material, material, value: tonnes });
    byMaterial[material] += tonnes;
    byComponent[component] += tonnes;
  };

  for (const tech of GEN_TECHS) {
    const mw = builtGW[tech] * 1000;
    for (const r of rowsFor(tech, lfpShare)) add(tech, r.component, r.material, (r.qty * mw) / 1000);
  }

  const mwh = builtStorageGWh * 1000;
  for (const r of rowsFor("battery", lfpShare)) {
    add("battery", r.component, r.material, (r.qty * mwh) / 1000);
  }

  // Grid connection, charged on every MW of generation built. It does not care
  // which technology paid for it, which is exactly why it is worth having.
  const gridMW = GEN_TECHS.reduce((s, t) => s + builtGW[t], 0) * 1000;
  for (const r of GRID) {
    const tonnes = (r.qty * gridMW) / 1000;
    if (tonnes <= 0) continue;
    edges.push({ layer: "tech-component", from: "grid", to: r.component, material: r.material, value: tonnes });
    edges.push({ layer: "component-material", from: r.component, to: r.material, material: r.material, value: tonnes });
    byMaterial[r.material] += tonnes;
    byComponent[r.component] += tonnes;
  }

  // Ore. Multiplier two, and the only place it is applied.
  const byOre = {};
  for (const ore of ORES) byOre[ore] = 0;
  for (const material of MATERIALS) {
    const tonnes = byMaterial[material];
    if (tonnes <= 0) continue;
    const ore = ORE_OF[material];
    const rock = tonnes * ORE[ore].tPerT;
    byOre[ore] += rock;
    edges.push({ layer: "material-ore", from: material, to: ore, material, value: rock });
  }

  return { edges, byMaterial, byComponent, byOre };
}

/**
 * Merge duplicate edges so the diagram draws one ribbon per (pair, material).
 *
 * Material stays in the key rather than being summed away, so a copper ribbon
 * is copper-coloured the whole way across and the reader can follow one metal
 * from the technology that wanted it to the rock it came out of.
 */
function collapse(edges) {
  const seen = new Map();
  for (const e of edges) {
    const key = `${e.layer}|${e.from}|${e.to}|${e.material}`;
    const hit = seen.get(key);
    if (hit) hit.value += e.value;
    else seen.set(key, { ...e });
  }
  return [...seen.values()];
}

const sum = (o) => Object.values(o).reduce((s, v) => s + v, 0);

/**
 * Run the cascade.
 *
 * Returns one entry per period. Period 0 is the fleet that already exists:
 * its build is measured against nothing, so its materials are reported as the
 * embodied cost of what is standing today rather than as something anyone is
 * about to buy.
 */
export function run(params = {}) {
  const p = { ...DEFAULTS, ...params };
  const target = normalizeMix(p.mixTarget ?? DEFAULTS.mixTarget);
  const lfp = Math.min(1, Math.max(0, p.lfpShare));

  const periods = [];
  let prev = null;
  for (const t of p.years) {
    const stock = stockAt(t, p, target);
    const { builtGW, builtStorageGWh } = buildOf(prev, stock);
    const mat = materialize(builtGW, builtStorageGWh, lfp);

    periods.push({
      year: t,
      label: t === 0 ? "Today" : `+${t} yr`,
      isExisting: t === 0,
      demandTWh: stock.demandTWh,
      mix: stock.mix,
      capacityGW: stock.capacityGW,
      storageGWh: stock.storageGWh,
      builtGW,
      builtStorageGWh,
      edges: collapse(mat.edges),
      byComponent: mat.byComponent,
      byMaterial: mat.byMaterial,
      byOre: mat.byOre,
      totalMetal: sum(mat.byMaterial),
      totalOre: sum(mat.byOre),
    });
    prev = stock;
  }

  // The headline is the build ahead, so period 0 -- the fleet already standing
  // -- is excluded from it.
  const ahead = periods.filter((x) => !x.isExisting);
  const metal = ahead.reduce((s, x) => s + x.totalMetal, 0);
  const rock = ahead.reduce((s, x) => s + x.totalOre, 0);
  const last = periods[periods.length - 1];

  return {
    periods,
    target,
    summary: {
      metalAhead: metal,
      rockAhead: rock,
      rockPerMetal: metal > 0 ? rock / metal : 0,
      copperAhead: ahead.reduce((s, x) => s + x.byMaterial.copper, 0),
      lithiumAhead: ahead.reduce((s, x) => s + x.byMaterial.lithium, 0),
      // The sharpest number the model produces, and the reason the ore column
      // is worth drawing at all: copper is a rounding error in the metal and
      // most of the rock. Steel dominates the tonnage; copper dominates the
      // mining. Those are different sentences about the same build.
      copperShareOfMetal: metal > 0
        ? ahead.reduce((s, x) => s + x.byMaterial.copper, 0) / metal : 0,
      copperShareOfRock: rock > 0
        ? ahead.reduce((s, x) => s + x.byOre["copper ore"], 0) / rock : 0,
      finalDemandTWh: last.demandTWh,
      finalCapacityGW: sum(last.capacityGW),
      finalStorageGWh: last.storageGWh,
      // Capacity per unit of energy served -- multiplier one, made visible.
      capacityIntensity: last.demandTWh > 0 ? sum(last.capacityGW) / last.demandTWh : 0,
    },
  };
}
