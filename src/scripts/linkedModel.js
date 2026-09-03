/**
 * Toy linked model: battery demand -> critical mineral demand -> supply from
 * primary mining and from end-of-life recovery.
 *
 * This is a teaching model, not research output. It is a deterministic
 * stock-and-flow sketch with order-of-magnitude parameters. It is deliberately
 * simple enough to read in one sitting.
 *
 * The point it exists to make: the recovery loop ("and back") is a supply
 * source whose size is set by decisions taken 10-15 years earlier. You cannot
 * ramp it in the year you discover you need it.
 */

// Illustrative material intensity, tonnes of CONTAINED METAL per GWh of cells.
// Public order-of-magnitude figures, rounded hard. Not calibrated.
//
// Note on units: lithium is often quoted as lithium carbonate equivalent (LCE),
// which is ~5.3x the contained-metal figure. Everything here is contained metal
// so the three minerals can share one axis. Mixing the two is the single
// easiest way to be wrong by a factor of five.
export const CHEMISTRY = {
  LFP: { lithium: 90, nickel: 0, cobalt: 0 },
  NMC: { lithium: 100, nickel: 650, cobalt: 80 },
};

export const MINERALS = ["lithium", "nickel", "cobalt"];

export const DEFAULTS = {
  years: 26, // 2025..2050
  startYear: 2025,
  demand0: 1000, // GWh/yr of cells in the start year
  demandGrowth: 0.12, // per year
  primary0: {
    // kilotonnes/yr of contained metal reaching the battery market in the start
    // year. Nickel is battery-suitable (Class 1) rather than total nickel.
    lithium: 200,
    nickel: 1000,
    cobalt: 200,
  },
  primaryGrowth: 0.06, // per year, mine capacity expansion
  lfpShare: 0.5, // fraction of cells that are LFP
  recovery: 0.5, // fraction of contained metal recovered from what is collected
  collection: 0.7, // fraction of retired packs that reach a recycler
  life: 12, // years before a pack retires
  secondLifeShare: 0.25, // fraction of retired packs redeployed instead
  secondLifeExtra: 6, // extra years those packs last before recycling
};

/** Tonnes of a mineral per GWh at a given LFP share. */
export function intensity(mineral, lfpShare) {
  const lfp = CHEMISTRY.LFP[mineral];
  const nmc = CHEMISTRY.NMC[mineral];
  return lfpShare * lfp + (1 - lfpShare) * nmc;
}

/**
 * Run the model.
 * Returns per-year arrays in kilotonnes/yr of contained metal.
 */
export function run(params, mineral) {
  const p = { ...DEFAULTS, ...params };
  const n = p.years;
  const inten = intensity(mineral, p.lfpShare) / 1000; // t/GWh -> kt/GWh

  const year = [];
  const demandGWh = [];
  const demand = [];
  const primary = [];
  const recycled = [];
  const gap = [];

  for (let t = 0; t < n; t++) {
    year.push(p.startYear + t);
    const gwh = p.demand0 * Math.pow(1 + p.demandGrowth, t);
    demandGWh.push(gwh);
    demand.push(gwh * inten);
    primary.push(p.primary0[mineral] * Math.pow(1 + p.primaryGrowth, t));
  }

  for (let t = 0; t < n; t++) {
    // Packs built at t-life retire now. Those not redeployed are collected and
    // recycled; the redeployed share comes back later.
    let rec = 0;
    const a = t - p.life;
    if (a >= 0) {
      rec += demand[a] * (1 - p.secondLifeShare) * p.collection * p.recovery;
    }
    const b = t - p.life - p.secondLifeExtra;
    if (b >= 0) {
      rec += demand[b] * p.secondLifeShare * p.collection * p.recovery;
    }
    recycled.push(rec);
    gap.push(Math.max(0, demand[t] - primary[t] - rec));
  }

  const last = n - 1;
  const supplyLast = primary[last] + recycled[last];
  return {
    year,
    demand,
    primary,
    recycled,
    gap,
    demandGWh,
    summary: {
      intensity: inten * 1000,
      finalDemand: demand[last],
      finalPrimary: primary[last],
      finalRecycled: recycled[last],
      recycledShare: supplyLast > 0 ? recycled[last] / supplyLast : 0,
      finalGap: gap[last],
      cumulativeGap: gap.reduce((s, v) => s + v, 0),
      firstShortfallYear: (() => {
        const i = gap.findIndex((g) => g > 0.001);
        return i === -1 ? null : year[i];
      })(),
      metDemandShare: demand[last] > 0 ? Math.min(1, supplyLast / demand[last]) : 1,
    },
  };
}
