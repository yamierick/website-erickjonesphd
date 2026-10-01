// Published numbers behind the battery recycling demo. Every value carries its source.
//
// [L] Atitebi, O.S., & Jones, E.C., Jr. (2025). Centralized vs. decentralized black-mass production:
//     A comparative analysis of lithium reverse logistics supply chain networks. Logistics 9(3), 97.
//     doi:10.3390/logistics9030097 (CC BY 4.0). U.S. network, 48 contiguous states, 2021-2040.
//     The model code is private and its input data are not available, so only the published
//     tables are used; nothing is recomputed.
// [E] Atitebi, O.S., Dumre, K., & Jones, E.C., Jr. (2025). Supporting a lithium circular economy via
//     reverse logistics: Improving the preprocessing stage of the lithium-ion battery recycling
//     supply chain. Energies 18, 651. doi:10.3390/en18030651 (CC BY 4.0).
// [D] Atitebi, O.S., Dumre, K., Shelor, C.P., & Jones, E.C., Jr. (2026). Experimental design for
//     optimized recovery of critical minerals from lithium-ion battery black mass. Proceedings of the
//     IISE Annual Conference & Expo 2026. DESIGN ONLY (Section 3, Table 1); no results are used.

// ---------------------------------------------------------------------------------------------
// [L] Table 1 (p. 10): operating and transportation cost, USD billion, 2021-2040.
// [L] Table 4 (p. 11): infrastructure, operations and total, USD billion.
export const NET_COST = {
  cen: { libFreight: 59.62, bmFreight: 0.322, bmProd: 63.848, recycling: 16.381, infra: 1.70,
         opsPrinted: 140.18, totalPrinted: 141.88, table1Total: 140.2 },
  dec: { libFreight: 0, bmFreight: 0.317, bmProd: 63.848, recycling: 16.381, infra: 1.82,
         opsPrinted: 80.55, totalPrinted: 82.37, table1Total: 80.5 },
};
export const COST_PARTS = [
  ["libFreight", "Whole batteries to black-mass plants (hazardous freight)"],
  ["bmFreight", "Black mass to recyclers"],
  ["bmProd", "Making black mass"],
  ["recycling", "Recycling"],
  ["infra", "Building facilities"],
];
// [L] Section 6.1 (ii), p. 13: if whole batteries shipped as ordinary (non-hazardous) freight, the
// centralized network "still incurs a higher total cost of USD 82.5 billion"; the decentralized one
// is cheaper "by approximately 1.1%, equating to a savings of around USD 1 billion".
export const NONHAZ = { cenTotal: 82.5, claimedPct: 1.1, claimedBn: 1 };
// [L] Section 5 (p. 10) gives the decentralized total as USD 81.5 billion; Tables 1 and 4 give 80.5
// (operations) and 82.37 (total). The 1.1% / $1 billion above matches 81.5, not 82.37.
export const DEC_TOTAL_SECTION5 = 81.5;

// [L] Table 3 (p. 11): CO2-equivalent, "MT CO2eq" (the Discussion reads it as megatons), 2021-2040.
export const NET_CO2 = {
  cen: { libFreight: 1.05, bmFreight: 0.35, bmProd: 14.2, recycling: 5.6, totalPrinted: 21.18 },
  dec: { libFreight: 0, bmFreight: 0.88, bmProd: 14.2, recycling: 5.6, totalPrinted: 20.66 },
};
export const CO2_PARTS = COST_PARTS.slice(0, 4);

// [L] Table 5 (p. 12): material moved, million tonnes, 2021-2040 (same in both networks).
export const FLOWS = { batteriesMt: 16.8, blackMassMt: 6.55 };
// [L] Parameter table (p. 7) and Sections 3.1 and 4.
export const NET_SETUP = {
  cen: { bmSites: 10, bmCapacityT: 100000, bmFixedUSD: 10000000 },
  dec: { bmSites: 48, bmCapacityT: 1000, bmFixedUSD: 150000 },      // one per state; fixed cost includes a 50% overhead (assumption vi)
  recyclers: 5, recyclerCapacityT: 50000,
  freightPerKgMile: { hazardous: 0.0092, ordinary: 0.00015 },         // USD per kg-mile, whole batteries
  batteryToBlackMass: 0.39,                                            // conversion factor
  growthPerYear: 20, years: [2021, 2040], states: 48,
};
// [L] Table 2 (p. 11): facilities ADDED in the listed years (the table shows only these years, so
// its columns do not sum to Table 4's totals). bm = black-mass facilities, rc = recycling centers.
export const BUILD_YEARS = [
  { year: 2021, bm: { cen: 10, dec: 121 }, rc: { cen: 3, dec: 5 } },
  { year: 2025, bm: { cen: 0, dec: 94 }, rc: { cen: 0, dec: 0 } },
  { year: 2030, bm: { cen: 1, dec: 276 }, rc: { cen: 0, dec: 1 } },
  { year: 2035, bm: { cen: 6, dec: 687 }, rc: { cen: 6, dec: 6 } },
  { year: 2040, bm: { cen: 15, dec: 1724 }, rc: { cen: 12, dec: 11 } },
];
// [L] Table 2 black-mass facility cost row, USD million, same years (checks the unit costs above).
export const BUILD_BM_COST = { cen: [100, 0, 10, 60, 150], dec: [18.15, 14.1, 41.4, 103.05, 258.6] };

// ---------------------------------------------------------------------------------------------
// [E] Table 2 (p. 9): grams from a 50 g sample of shredded battery, 4 units x 3 trials per method.
// pre = after grinding, before sieving; post = fine black mass through the 100-micron sieve;
// res = residue left on the sieve. Grams as printed (read in ounces and converted; see README).
export const TRIALS = [
  // unit, trial, manual{pre,post,res}, electric{pre,post,res}
  { unit: 1, trial: 1, m: [36.3, 22.7, 22.7], e: [45.4, 31.8, 22.7] },
  { unit: 1, trial: 2, m: [40.8, 18.1, 22.7], e: [54.4, 27.2, 27.2] },
  { unit: 1, trial: 3, m: [49.9, 18.1, 27.2], e: [45.4, 22.7, 31.8] },
  { unit: 2, trial: 1, m: [36.3, 22.7, 27.2], e: [49.9, 27.2, 18.1] },
  { unit: 2, trial: 2, m: [40.8, 18.1, 18.1], e: [49.9, 18.1, 31.8] },
  { unit: 2, trial: 3, m: [45.4, 18.1, 18.1], e: [45.4, 27.2, 27.2] },
  { unit: 3, trial: 1, m: [49.9, 13.6, 18.1], e: [49.9, 22.7, 27.2] }, // manual post printed "13.6 (63.2%)": 27.2% is right
  { unit: 3, trial: 2, m: [40.8, 18.1, 18.1], e: [45.4, 27.2, 18.1] },
  { unit: 3, trial: 3, m: [45.4, 18.1, 22.7], e: [45.4, 27.2, 27.2] },
  { unit: 4, trial: 1, m: [49.9, 22.7, 22.7], e: [59.0, 22.7, 22.7] },
  { unit: 4, trial: 2, m: [49.9, 22.7, 31.8], e: [40.8, 22.7, 27.2] },
  { unit: 4, trial: 3, m: [49.9, 22.7, 27.2], e: [49.9, 36.3, 22.7] },
];
export const STAGES = ["pre", "post", "res"];
export const FEED_G = 50;
// [E] Table 2 mean and "σ (Variance)" rows (the σ row holds standard deviations; see README).
export const T2_STATS = {
  pre: { m: { mean: 44.6, sd: 5.4 }, e: { mean: 48.4, sd: 4.9 } },
  post: { m: { mean: 19.6, sd: 2.9 }, e: { mean: 26.1, sd: 4.8 } },
  res: { m: { mean: 23.0, sd: 4.5 }, e: { mean: 25.3, sd: 4.5 } },
};
// [E] Table 3 (p. 10) and Section 3.3: fine black mass, n = 12 per method, 99% intervals.
export const T3 = { m: { mean: 19.656, sd: 2.954, n: 12 }, e: { mean: 26.082, sd: 4.787, n: 12 }, ci99: 3.49 };
// [E] ANOVA p-values (Sections 3.3, 4.1-4.4): method effect by stage, and unit (battery layer) effect.
export const P_METHOD = { pre: 0.0914, post: 0.0016, res: 0.4381 };
export const P_UNIT = { pre: 0.3256, post: 0.4254 };
// [E] Table 4 (p. 11): fine black mass as a share of the ground (pre-sieve) material.
export const T4_PCT = { m: 44, e: 54 };
// [E] Appendix A (pp. 16-18): equipment, USD.
export const EQUIPMENT = {
  shredder: { label: "Paper shredder", usd: 40 },
  manual: { label: "Hand-crank pulverizer + stand", usd: 345 + 150 },
  electric: { label: "Electric grain mill", usd: 98 },
  sieve: { label: "100-micron sieve roll", usd: 198.78 },
};

// ---------------------------------------------------------------------------------------------
// [D] Section 3 and Table 1 (pp. 2-3): a full 3 x 3 x 3 factorial, 27 conditions, each run in
// triplicate (81 leaching experiments); 60 °C for 24 h on an orbital shaker at 200-225 rpm;
// leachate analysed by ICP-MS for Li, Mn, Co, Cu and Ni (plus Al).
export const DOE = {
  factors: [
    { key: "h", name: "Sulfuric acid (leaching agent)", levels: ["1 M", "2 M", "4 M"] },
    { key: "o", name: "Hydrogen peroxide (oxidizer)", levels: ["0.3%", "1.5%", "3%"] },
    { key: "d", name: "Pulp density (black mass : liquid)", levels: ["1:5", "1.5:5", "2:5"] },
  ],
  replicates: 3,
  conditions: { tempC: 60, hours: 24, rpm: "200–225" },
  metals: ["Li", "Mn", "Co", "Ni", "Cu", "Al"],
};
