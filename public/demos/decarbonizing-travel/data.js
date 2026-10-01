// Published numbers behind the "Decarbonizing travel" demo. Every value says where
// it comes from. Nothing here is interpolated or estimated for the page.

// ---------------------------------------------------------------------------
// Panel A. Jones, E.C., & Leibowicz, B.D. (2019). Contributions of shared
// autonomous vehicles to climate change mitigation. Transportation Research
// Part D 72, 279-298. doi:10.1016/j.trd.2019.05.005
// ---------------------------------------------------------------------------

// Year-by-year results for the ten scenarios, regenerated from the paper's
// public repository (sear-labs/sav-osemosys-trd-2019, results/clean/annual.csv)
// by _build/extract_sav.py. See the header of sav-results.js.
export { SAV_RESULTS } from "./sav-results.js";

// Table 2 (p. 286): the ten scenarios. sav "70" = shared VMT replace ~70% of
// private VMT by 2050 (logistic curve, k = 0.7, inflection 2025, b = 0.19;
// Section 4.2, p. 286-287). tax: $20/tCO2 in the base year rising 5% a year
// (Section 4.1). charging: "optimized" = fleet EVs may charge at any hour they
// are not driving; "night" = fleet EVs charge only at night (Section 4.3).
// Private EVs charge only at night in every scenario. dm = shared VMT per
// private VMT replaced (0.5, 1 or 2; Section 4.2).
export const SAV_SCENARIOS = [
  { id: 1, sav: "70", tax: false, charging: "optimized", dm: 0.5 },
  { id: 2, sav: "70", tax: false, charging: "optimized", dm: 2 },
  { id: 3, sav: "70", tax: false, charging: "optimized", dm: 1 },
  { id: 4, sav: "70", tax: false, charging: "night", dm: 1 },
  { id: 5, sav: "none", tax: false, charging: null, dm: null },
  { id: 6, sav: "70", tax: true, charging: "optimized", dm: 0.5 },
  { id: 7, sav: "70", tax: true, charging: "optimized", dm: 2 },
  { id: 8, sav: "70", tax: true, charging: "optimized", dm: 1 },
  { id: 9, sav: "70", tax: true, charging: "night", dm: 1 },
  { id: 10, sav: "none", tax: true, charging: null, dm: null },
];

// Numbers the paper states in its text, used by test.mjs to check the
// regenerated results and quoted on the page.
export const SAV_PAPER = {
  taxStart: 20, taxGrowth: 0.05, tax2030: 41.58, tax2050: 110.32, // Section 4.1, p. 286
  sharePrivateReplaced2050: 0.7,                                  // Table 2 / Section 4.2
  gasShare2035NoTax: 80,                                          // Section 5.2, p. 289
  gasPeakShareTax: 56, gasPeakYearTax: 2021,                      // Section 5.2, p. 289
  mix2050NoTax: { solar: 68, gas: 32 },                           // Section 5.2, p. 289
  mix2050Tax: { solar: 55, wind: 44, gas: 1 },                    // Section 5.2, p. 289
  bevOverHalfOfFleetBy: 2030,                                     // Section 5.1, p. 287 (scenarios 3, 4, 8, 9)
  chargingCostSavingPct: { noTax: 3.6, tax: 3.5 },                // Section 5.4, p. 293
};

// ---------------------------------------------------------------------------
// Panel B. Patil, H.V., Kumbhar, A.A., & Jones, E.C., Jr. (2025). Contributions
// of extended-range electric vehicles (EREVs) to electrified miles, emissions
// and transportation cost reduction. Energies 18(24), 6448.
// doi:10.3390/en18246448 (open access, CC BY 4.0). Values transcribed from the
// published HTML tables (mdpi.com/1996-1073/18/24/6448), read 2026-09-30.
// ---------------------------------------------------------------------------

export const EREV_RANGES = [25, 50, 75, 100, 125, 150]; // miles of electric range

export const EREV_TOTAL_VMT_B = 3262.8;     // Table 4 / Table 5: 2023 U.S. light-duty VMT, billion miles
export const EREV_VEHICLES_M = 286.1;       // Table 4: vehicle count (Equation 1)

// Table 4 assumptions per scenario, AS APPLIED in Table 5. Table 4 prints
// fuel economy as "18/26.4/36 mpg" and grid intensity as "125/348/714 g/kWh"
// under the heading Worst/Average/Best, but Table 5 and the text (Section 4.2:
// in the worst case ICEVs are efficient and the grid is dirtier) use 36 mpg and
// 714 g/kWh for Worst and 18 mpg and 125 g/kWh for Best. mi/kWh is in the
// heading's order in both tables.
export const EREV_CASES = {
  worst: { label: "Worst", mpg: 36, miPerKWh: 2.9, gridG: 714 },
  avg: { label: "Average", mpg: 26.4, miPerKWh: 3.6, gridG: 348 },
  best: { label: "Best", mpg: 18, miPerKWh: 4.2, gridG: 125 },
};

// Table 5 (annual): electric VMT (billion miles) by range. Same in all three
// scenarios. The all-electric car (EV row) drives all 3262.8 B miles on power.
export const EREV_ELECTRIC_VMT_B = { 25: 1936.7, 50: 2391.1, 75: 2551.0, 100: 2710.9, 125: 2771.6, 150: 2832.2, ev: 3262.8 };

// Table 6: share of VMT electrified ("% EV VMT"), same in all scenarios.
export const EREV_EV_SHARE_PCT = { 25: 59.4, 50: 73.3, 75: 78.2, 100: 83.1, 125: 84.9, 150: 86.8, ev: 100.0 };

// Table 6: average battery size per vehicle (kWh) and fleet battery capacity
// (TWh) needed to convert every U.S. light-duty vehicle, by scenario.
export const EREV_BATTERY_KWH = {
  worst: { 25: 8.6, 50: 17.2, 75: 25.9, 100: 34.5, 125: 43.1, 150: 51.7, ev: 103.4 },
  avg: { 25: 6.9, 50: 13.9, 75: 20.8, 100: 27.8, 125: 34.7, 150: 41.7, ev: 83.3 },
  best: { 25: 6.0, 50: 11.9, 75: 17.9, 100: 23.8, 125: 29.8, 150: 35.7, ev: 71.4 },
};
export const EREV_FLEET_TWH = {
  worst: { 25: 2.2, 50: 4.4, 75: 6.7, 100: 8.9, 125: 11.1, 150: 13.3, ev: 26.7 },
  avg: { 25: 1.8, 50: 3.6, 75: 5.4, 100: 7.2, 125: 8.9, 150: 10.7, ev: 21.5 },
  best: { 25: 1.5, 50: 3.1, 75: 4.6, 100: 6.1, 125: 7.7, 150: 9.2, ev: 18.4 },
};

// Table 5: annual CO2 saved against an all-gasoline fleet (Mt CO2) and the
// all-gasoline (ICE) total it is measured against, by scenario.
export const EREV_CO2_SAVED_MT = {
  worst: { 25: 1.3, 50: 1.6, 75: 1.7, 100: 1.8, 125: 1.9, 150: 1.9, ev: 2.2 },
  avg: { 25: 464.8, 50: 573.9, 75: 612.2, 100: 650.6, 125: 665.2, 150: 679.7, ev: 783.1 },
  best: { 25: 898.7, 50: 1109.5, 75: 1183.7, 100: 1257.9, 125: 1286.1, 150: 1314.2, ev: 1514.0 },
};
export const EREV_ICE_CO2_MT = { worst: 805.5, avg: 1098.5, best: 1611.1 }; // Table 5, ICE rows

// Where the paper prints a number more than one way (recorded in the write-up
// project-pages/_papers/extended-range-evs-2025/content.json -> review):
//  - 50-mile battery: 13.7 kWh in the Abstract, 13.9 kWh in Table 6 (50 / 3.6 = 13.9).
//  - CO2 saved at 150 miles: 679 Mt (Introduction), 679.7 (Table 5), 680 (Conclusions).
// Found while building this demo: Table 6's fleet capacities are about 10%
// below battery size x Table 4's 286.1 million vehicles (13.9 kWh x 286.1 M =
// 4.0 TWh, printed 3.6; 83.3 kWh -> 23.8 TWh, printed 21.5). They imply about
// 258 million vehicles. The demo shows the printed capacities and says so.
export const EREV_NOTES = {
  battery50Abstract: 13.7,
  co2Saved150Variants: [679, 679.7, 680],
};
