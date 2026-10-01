// Published numbers behind "A second life for fossil-fuel infrastructure".
// Every value below is printed in one of three papers; the comment on each block says where.
// Nothing here is interpolated or estimated. Totals that the demo shows are either printed in
// the papers (and checked against the rows in test.mjs) or are sums of printed rows, labelled so.

// ---------------------------------------------------------------------------------------------
// [1] Jones, E.C., Jr., Munjurpet Sridharan, C., Aghapour, R., & Rodriguez, A. (2025).
//     Re-energizing legacy fossil infrastructure: Evaluating geothermal power in tribal lands and
//     HUBZones. Sustainability, 17(6), 2558. https://doi.org/10.3390/su17062558 (CC BY 4.0)
// ---------------------------------------------------------------------------------------------

export const GEO_STATES = ["AZ", "AR", "LA", "MS", "NV", "NM", "OK", "TX"]; // Section 4.1 and Conclusions

// Table 1: temperature range by geothermal class (temperature at depth).
export const GEO_CLASSES = [
  { id: 1, label: "Class 1", temp: ">150 °C" },
  { id: 2, label: "Class 2", temp: "130–150 °C" },
  { id: 3, label: "Class 3", temp: "110–130 °C" },
  { id: 4, label: "Class 4", temp: "90–110 °C" },
  { id: 5, label: "Class 5", temp: "<90 °C" },
];

// Table 3: calculated land area (square miles) and orphaned oil and gas wells (count),
// by geothermal class and land type. Row "Total" is printed in the table.
export const GEO_TABLE3 = {
  area:  { all: [32050, 144141, 196118, 221513, 236160], hub: [10090, 38776, 74051, 22641, 31320], tribal: [1838, 10832, 48026, 18729, 18845] },
  wells: { all: [20, 2200, 12000, 2000, 2300],           hub: [1, 201, 5964, 334, 663],            tribal: [0, 22, 5752, 290, 370] },
  total: { area: { all: 829982, hub: 176878, tribal: 98270 }, wells: { all: 18520, hub: 7163, tribal: 6434 } },
};

// Table 4: technical geothermal potential (GW), Classes 1-3 only (the paper counts only
// land at 120 °C or more, Section 3.5.2). "egs" = enhanced geothermal plants on the land;
// "wellsGW" = orphaned wells converted to small geothermal plants. Row "Total" as printed.
export const GEO_TABLE4 = {
  egs:     { all: [339.3, 1002.6, 1031.0], hub: [106.8, 269.7, 389.3], tribal: [19.4, 75.3, 252.5] },
  wellsGW: { all: [0.0, 0.7, 3.5],         hub: [0.0, 0.1, 1.8],       tribal: [0.0, 0.0, 1.7] },
  total:   { egs: { all: 2372.8, hub: 765.8, tribal: 347.2 }, wellsGW: { all: 4.3, hub: 1.8, tribal: 1.7 } },
};

// Table 5: maximum number of potential geothermal facilities, and average plant capacity (MW).
// The table's "Total" average (94.94 MW) is the sum of the three class averages, not an average,
// so the demo does not show it.
export const GEO_TABLE5 = {
  facilities: { all: [7696, 34613, 47095], hub: [2423, 9311, 17782], tribal: [441, 2601, 11532] },
  totalFacilities: { all: 89404, hub: 29516, tribal: 14574 },
  avgMW: [44.08, 28.97, 21.89],
};

// Section 4.1: existing U.S. geothermal plants shown in the paper's Figure 1 total about 2.5 GW.
export const GEO_EXISTING_US_GW = 2.5;
// Table 2: gross output of one converted well at 164 °F (73 °C), this study's calibration value.
export const GEO_WELL_KW_AT_73C = 249;

// Conclusions (Section 6) print different totals from Tables 3-4. Shown as a correction.
export const GEO_CONCLUSIONS = { egsGW: 2328, wellsGW: 3, hubWellsOnClass123: 6166, areaClass123: 372309 };

// What the paper says about each study state (Sections 4.3, 4.5, 4.6, 4.7 and 5). The paper
// publishes NO state-level numbers, so the map carries only these statements.
export const GEO_STATE_NOTES = {
  AZ: ["Most of its tribal land with geothermal sites sits on Class 1–3 ground; a priority for feasibility studies with tribal partners (§4.3)."],
  NM: ["Most of its tribal land with geothermal sites sits on Class 1–3 ground; a priority for feasibility studies with tribal partners (§4.3).",
       "Named among the states with the highest geothermal potential (§5)."],
  OK: ["Most of its tribal land with geothermal sites sits on Class 1–3 ground (§4.3).",
       "Many orphaned wells sit on medium-to-high potential ground (§4.5).",
       "One of the two states where orphaned wells and tribal lands mainly overlap (§4.6)."],
  AR: ["Large areas of high-potential ground, but few or no tribal lands (§4.3)."],
  TX: ["Large areas of high-potential ground, but few or no tribal lands (§4.3).",
       "Many orphaned wells sit on medium-to-high potential ground (§4.5).",
       "Named among the states with the highest geothermal potential (§5)."],
  LA: ["Large areas of high-potential ground, but few or no tribal lands (§4.3).",
       "Many orphaned wells sit on medium-to-high potential ground (§4.5).",
       "One of the two states where orphaned wells and tribal lands mainly overlap (§4.6)."],
  NV: ["A known geothermal hotspot: significant Class 1 potential, but not on tribal lands (§4.3).",
       "Many orphaned wells sit on medium-to-high potential ground (§4.5).",
       "Named among the states with the highest geothermal potential (§5)."],
  MS: ["In the study area; the paper makes no statement specific to Mississippi."],
};

// Map lenses: which states the paper names for each finding.
export const GEO_LENSES = {
  study:   { label: "Study area",              cite: "§4.1",  states: GEO_STATES },
  tribal:  { label: "Tribal land on hot rock", cite: "§4.3",  states: ["AZ", "NM", "OK"] },
  wells:   { label: "Orphaned wells on hot rock", cite: "§4.5", states: ["TX", "NV", "OK", "LA"] },
  overlap: { label: "Wells meet tribal land",  cite: "§4.6",  states: ["OK", "LA"] },
  hottest: { label: "Highest potential",       cite: "§5",    states: ["NV", "TX", "NM"] },
};

// ---------------------------------------------------------------------------------------------
// [2] Jones, E.C., Jr., Yaw, S., Bennett, J.A., Ogland-Hand, J.D., Strahan, C., & Middleton, R.S.
//     (2022). Designing multi-phased CO2 capture and storage infrastructure deployments.
//     Renewable and Sustainable Energy Transition, 2, 100023.
//     https://doi.org/10.1016/j.rset.2022.100023 (CC BY-NC-ND 4.0: numbers only, no figures reused)
// Gulf-region case: 80 sources, 125 sinks, 30 years split into six 5-year phases (Section 4.1).
// ---------------------------------------------------------------------------------------------

export const CCS_SETUP = { sources: 80, sinks: 125, years: 30, phases: 6, phaseYears: 5, credit45Q: { saline: 50, eor: 35 } };

// Table 1 (CAP mode: capture a fixed 3 MtCO2/yr) and Table 2 (PRICE mode: capture only what is
// profitable under 45Q). "single" = single-phase design, one value for the whole project.
// "full" = the multi-phased design's full-project column; "phases" = its six phase columns.
// Units: $M/yr for costs (negative = net revenue), MtCO2/yr, km.
export const CCS = {
  cap: {
    label: "Capture a set 3 Mt/yr", table: "Table 1",
    annual:    { single: -34.8, full: -41.7, phases: [-45.9, -45.9, -45.9, -44.3, -37.2, -31.1] },
    capture$:  { single: 126,   full: 126,   phases: [126, 126, 126, 126, 126, 126] },
    storage$:  { single: -180,  full: -180,  phases: [-180, -180, -180, -180, -180, -180] },
    transport: { single: 18.5,  full: 12.1,  phases: [7.94, 7.94, 7.94, 9.51, 16.6, 22.8] },
    captured:  { single: 3,     full: 3,     phases: [3, 3, 3, 3, 3, 3] },
    pipeKm:    { single: 333,   full: 378,   phases: [103, 103, 103, 124, 205, 378] },
    // Section 4.2 text: full-project transport cost and saving.
    printedTotals: { single: 555, phased: 363.65, savingPct: 34 },
  },
  price: {
    label: "Capture only what pays", table: "Table 2",
    annual:    { single: -36.8, full: -42.3, phases: [-31.5, -48.0, -48.0, -46.6, -43.8, -36.0] },
    capture$:  { single: 120,   full: 127.6, phases: [75.6, 135, 135, 135, 135, 150] },
    storage$:  { single: -172,  full: -181.5, phases: [-113, -191, -191, -191, -191, -212] },
    transport: { single: 15.0,  full: 11.81, phases: [5.33, 8.54, 8.54, 9.95, 12.8, 25.7] },
    captured:  { single: 2.87,  full: 3.03,  phases: [1.87, 3.19, 3.19, 3.19, 3.19, 3.53] },
    pipeKm:    { single: 252.3, full: 338,   phases: [57.8, 104, 104, 124, 172, 338] },
    // Section 4.2 text: phased design 15% more profitable, stores 5% more CO2.
    printedTotals: { profitPct: 15, storedPct: 5 },
  },
};

// ---------------------------------------------------------------------------------------------
// [3] Jones, E.C., Jr., & Jones, E.C., Sr. (2026). Megawatts to zettaflops: A techno-economic
//     framework for grid-tied behind-the-meter architectures in AI data centers.
//     Electricity, 7(2), 43. https://doi.org/10.3390/electricity7020043 (CC BY 4.0)
// A 250 MW Phase-3 data center in ERCOT. Table 8 (scenarios), Table 11 (installed MW),
// Table 14 (blended LCOE), Table 15 (fuel dependency, max on-site output, ALOLP).
// ALOLP = avoided loss-of-load probability: how much of the grid's outage risk the site removes.
// ---------------------------------------------------------------------------------------------

export const DC_LOAD_MW = 250;
export const DC_BASELINE_LCOE = 75.0; // Table 14, pure grid

export const DC = [
  { id: "S1", name: "Gas engines + battery island", lcoe: 85.5, alolp: 72.5, alolpGT: false, maxMW: 180, fuel: "gas",
    mix: { rice: 150, grid: 100, bess: 30 }, bessMWh: 150 },
  { id: "S2", name: "Solar PPA + gas engines",      lcoe: 72.4, alolp: 91.2, alolpGT: false, maxMW: 245, fuel: "gas",
    mix: { solar: 120, rice: 210, grid: 10, bess: 35 }, bessMWh: 175 },
  { id: "S3", name: "100% geothermal",              lcoe: 68.0, alolp: 99.9, alolpGT: true,  maxMW: 250, fuel: "none",
    mix: { geo: 250 }, bessMWh: 0 },
  { id: "S4", name: "Geothermal + solar PPA + grid", lcoe: 64.5, alolp: 58.0, alolpGT: false, maxMW: 145, fuel: "none",
    mix: { geo: 120, solar: 80, grid: 130, bess: 25 }, bessMWh: 125 },
  { id: "S5", name: "Small modular reactor + solar", lcoe: 94.2, alolp: 72.0, alolpGT: false, maxMW: 180, fuel: "uranium",
    mix: { smr: 180, solar: 50, grid: 70 }, bessMWh: 0 },
  { id: "S6", name: "Geothermal + microturbines",   lcoe: 77.8, alolp: 84.0, alolpGT: false, maxMW: 210, fuel: "gas",
    mix: { geo: 100, micro: 80, grid: 50, bess: 30 }, bessMWh: 150 },
];

// Table 15 "Islanding Capability": seamless for all but S2, which is "Interrupted".
export const DC_ISLANDING = { S1: "Seamless", S2: "Interrupted", S3: "Seamless", S4: "Seamless", S5: "Seamless", S6: "Seamless" };
export const DC_FUEL = { none: "None", gas: "Natural gas pipeline", uranium: "Uranium (multi-year)" }; // Table 15
export const DC_SOURCES = { geo: "Geothermal", smr: "Small modular reactor", solar: "Solar PPA", rice: "Gas engines",
  micro: "Microturbines", grid: "Grid", bess: "Hybrid battery" }; // Table 11 column heads, spelled out
