// Numbers behind "Access and health". Two kinds, kept apart and labelled on the page:
//   PAPER  printed in the paper (table or sentence given in the comment);
//   REPO   regenerated from a PUBLIC SEAR Lab repository, as stated on each block.
// No individual-level data anywhere. The per-ZIP map layer (zips.json) holds ZIP totals only.

// ---------------------------------------------------------------------------------------------
// Jones, E.C., Azeem, G., Jones, E.C., Jr., Jefferson, F., Henry, M., Abolmaali, S., & Sparks, J.
// (2021). Understanding the last mile transportation concept impacting underserved global
// communities to save lives during COVID-19 pandemic. Frontiers in Future Transportation, 2,
// 732331. https://doi.org/10.3389/ffutr.2021.732331 (CC BY)
// ---------------------------------------------------------------------------------------------

// PAPER, Table 2: assumptions and data collection details.
export const TABLE2 = {
  zips: 97,              // "Total Zip Codes considered in Harris County (77002-77099)"
  providers: 278,        // hospitals, pharmacies and nursing homes
  hubs: 5,               // vaccine hubs in Houston
  population: 3270360,   // all ZIP codes in Harris County
  target: 654072,        // 20% of population: people over 60 and health care workers
  costPerMile: 1,        // $
  penaltyLow: 35, penaltyHigh: 70, // $ per person left unserved
  communities: 10,       // "complete communities" prioritized in scenarios 5-8
};

// PAPER, Table 3: the eight scenarios. Supply and provider capacity at 1x (supply when the
// data were collected), 2x, 3x and 4x, with equal or prioritized distribution.
export const MULTIPLIERS = [1, 2, 3, 4];
export const POLICIES = {
  equal: "Equal distribution",
  prioritized: "Prioritized: 10 complete communities (by Community Health Index)",
};

// PAPER, Results text (the paper prints its scenario results mainly as bar charts, Figures 5-12;
// only these values are printed as numbers). Keys: policy -> multiplier -> value.
export const PRINTED = {
  penaltyM: { equal: { 1: 34, 2: 22, 4: 0 }, prioritized: { 4: 0 } },  // "$34 Million ... to 22 Million"; zero at scenario 4 (both policies)
  servicePct: { equal: { 1: 32, 4: 100 }, prioritized: { 1: 31 } },     // "only 32%"; "reach 100% in scenario 4"; "low service level of 31%"
  // Prioritized, scenario 1: underserved communities served "approximately close to 100%".
  underservedPct: { prioritized: { 1: 100 } },
};

// The correction the paper's code write-up records: under equal distribution, the printed
// penalties imply scenario-1 supply of about 26% of demand, not the printed 32%.
// unmet2/unmet1 = (1 - 2s)/(1 - s) = 22/34  =>  s = 12/46 = 0.261 (impliedSupplyShare in model.js).
export const CORRECTION_NOTE = "32% (printed) vs ≈26% implied by the printed $34M and $22M penalties";

// ---------------------------------------------------------------------------------------------
// REPO: sear-labs/covid-optsc-ffutr-2021 (public, MIT; code DOI 10.5281/zenodo.22309107).
// results/reconstructed_scenarios.csv (equal distribution, committed) and the prioritized rows
// regenerated with the repo's own scripts/make_figures.py `run()` on its committed
// data/derived_paper_instance.csv (96 ZIPs; $70 per unserved person; scenario-1 supply 26% of
// demand; prioritized order by CDC Social Vulnerability Index as a stand-in for the paper's
// Community Health Index, which is not public). Rebuild: _build/regen_scenarios.py.
// "topThird" = share served in the most-vulnerable third of ZIPs (by that stand-in).
// Units: service %, penalty and transport in $ million.
// ---------------------------------------------------------------------------------------------
export const REPO = {
  zips: 96,
  target: 654072,
  equal: [
    { k: 1, service: 26.0, penalty: 33.88, transport: 0.16, topThird: 26.0 },
    { k: 2, service: 52.0, penalty: 21.98, transport: 0.33, topThird: 52.0 },
    { k: 3, service: 78.0, penalty: 10.07, transport: 0.49, topThird: 78.0 },
    { k: 4, service: 100.0, penalty: 0.0, transport: 0.63, topThird: 100.0 },
  ],
  prioritized: [
    { k: 1, service: 26.0, penalty: 33.88, transport: 0.19, topThird: 77.0 },
    { k: 2, service: 52.0, penalty: 21.98, transport: 0.38, topThird: 100.0 },
    { k: 3, service: 78.0, penalty: 10.07, transport: 0.49, topThird: 100.0 },
    { k: 4, service: 100.0, penalty: 0.0, transport: 0.63, topThird: 100.0 },
  ],
};

// ---------------------------------------------------------------------------------------------
// REPO: sear-labs/houston-covid-gis (public, MIT; code DOI 10.5281/zenodo.22309109).
// data/geometry/covid_regions.gpkg -> zips.json (built by _build/build_zips.py): 147 ZIP codes in
// eight regions, per-ZIP totals of confirmed, active and recovered cases and deaths, from one
// snapshot whose date is not recorded. The paper models 97 ZIP codes (Table 2); the GIS covers a
// wider area. The paper's Community Health Index is not in the public repo, so it is not mapped.
// ---------------------------------------------------------------------------------------------
export const GIS_TOTALS = { zips: 147, cases: 49365, deaths: 487, regions: 8 };

export const LAYERS = {
  cases:  { label: "Confirmed cases", breaks: [100, 250, 400, 600] },
  active: { label: "Active cases",    breaks: [50, 150, 250, 400] },
  deaths: { label: "Deaths",          breaks: [1, 3, 6, 10] },
};
export const REGIONS = { N: "North", NE: "Northeast", E: "East", SE: "Southeast", S: "South", SW: "Southwest", W: "West", NW: "Northwest" };
