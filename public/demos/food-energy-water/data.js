// Published numbers behind the "Food, energy and water under climate risk" demo.
// Every value says where it comes from. Nothing is interpolated for the page.

// ---------------------------------------------------------------------------
// Panel A. Jones, E.C., & Leibowicz, B.D. (2021). Co-optimization and community:
// Maximizing the benefits of distributed electricity and water technologies.
// Sustainable Cities and Society 64, 102515. doi:10.1016/j.scs.2020.102515
// ---------------------------------------------------------------------------

// Scenario aggregates (Fig. 1 costs and fractions, Figs. 6-7 technologies),
// regenerated from the public repo by _build/extract_coopt.py. Only
// scenario-level averages; no household data. See coopt-results.js.
export { COOPT } from "./coopt-results.js";

// Section 4 (pp. 8-9): four aggregation levels. 320 and 3,200 homes are 10 and
// 100 identical copies of each of the 32 homes in the dataset.
export const SIZES = ["1", "32", "320", "3200"];
export const SIZE_LABEL = { 1: "Each home alone", 32: "32 homes", 320: "320 homes", 3200: "3,200 homes" };

// Section 4: optimization schemes. "cap" is the paper's Limited Utility scheme:
// Co-Optimized, with utility purchases capped at 500 kWh and 20 kGal per home
// per month (21 kGal for two very large users).
export const PLANS = ["coop", "elc", "water", "cap"];
export const PLAN_LABEL = {
  coop: "Electricity and water together",
  elc: "Electricity only",
  water: "Water only",
  cap: "Together, with utility purchases capped",
};
export const PLAN_SHORT = { coop: "Together", elc: "Electricity only", water: "Water only", cap: "Capped utility" };

// Section 3.5 (p. 5): technology names. Repo codes -> the paper's names.
export const TECH_LABEL = {
  H_PV: "Rooftop solar (RFT-PV)",
  H_BAT: "Home battery (IND-BAT)",
  C_PV: "Community solar (COM-PV)",
  C_BAT: "Community battery (COM-BAT)",
  C_WND: "Wind turbines (WIND)",
  C_HB: "2.5 MW wind–solar hybrid plant (HBRD)",
  H_RW: "Rainwater harvesting (RWH)",
  H_RWTANK: "Rainwater tanks (RWTANK)",
  H_GW: "Graywater recycling (GWR)",
  C_VRF: "Water recycling facility (WRF)",
};

// ---------------------------------------------------------------------------
// Panel B. Jones, E.C., Jr., & Leibowicz, B.D. (2022). Climate risk management in
// agriculture using alternative electricity and water resources: A stochastic
// programming framework. Environment Systems and Decisions 42(1), 117-135.
// doi:10.1007/s10669-021-09838-8
// All dollar values are expected profit over the 25-year horizon for the
// 200-hectare wheat farm (Section 3; Table 5).
// ---------------------------------------------------------------------------

export const CLIMATES = ["dry", "dm", "mod", "wet"];
export const CLIMATE_LABEL = { dry: "Dry", dm: "Dry-moderate", mod: "Moderate", wet: "Wet" };

// Table 1: probability (%) of each annual (effective) precipitation level, in
// inches, by climate - the stationary distribution of each climate's Markov chain.
export const PRECIP_LEVELS_IN = [5, 15, 30, 45, 60];
export const PRECIP_PCT = {
  dry: [20, 50, 25, 5, 0],
  dm: [5, 25, 55, 10, 5],
  mod: [20, 20, 20, 20, 20],
  wet: [0, 5, 20, 45, 30],
};
// Table 2: mean annual precipitation (inches) of the sampled weather, by climate.
export const PRECIP_MEAN_IN = { dry: 18.3, dm: 27.93, mod: 30.96, wet: 45.09 };

// Section 3.3 (p. 123): the two beliefs (climate probability distributions).
export const BELIEFS = ["ep", "dml"];
export const BELIEF_LABEL = { ep: "All four equally likely", dml: "Dry most likely" };
export const BELIEF_PROB = {
  ep: { dry: 0.25, dm: 0.25, mod: 0.25, wet: 0.25 },
  dml: { dry: 0.6, dm: 0.25, mod: 0.1, wet: 0.05 },
};

// Table 5: expected profit (mean over 4,000 simulated 25-year weather paths) of
// the four solutions. PI = perfect information (climate and weather known),
// KCUW = climate known, weather unknown, Stoch = hedged across all climates
// (two-stage stochastic program), EV = planned for the average climate.
export const PROFIT = {
  ep: { pi: 2355663, kcuw: 2345267, stoch: 2246938, ev: 2246937 },
  dml: { pi: 1975827, kcuw: 1964087, stoch: 1899221, ev: 1898280 },
};

// Table 4: EVPI (value of perfect information), VSS (value of the stochastic
// solution, i.e. of hedging over planning for the average), EVKW (value of
// knowing the weather, given the climate), EVKC (value of knowing the climate).
export const VALUES = {
  ep: { evpi: 108725.10, vss: 0.49, evkw: 10396.32, evkc: 98328.78 },
  dml: { evpi: 76606.01, vss: 940.90, evkw: 11740.03, evkc: 64865.98 },
};

// The paper's public repo (sear-labs/fews-stochopt-esd-2022,
// results/clean/value_of_information.csv, regenerated 2026-09-30 by its
// scripts/run_all.py) reproduces Table 4 to about $1, except VSS under the
// Dry-most-likely belief: $964.89 against $940.90 published. The repo traces the
// gap to the Expected Value plan's first-stage decision, which sits on a flat
// objective (capacities 0.08% apart differ by $0.43 there and by about $20 in
// realized profit). The demo shows the published $940.90 with this note.
export const REPO_VALUES = {
  ep: { evpi: 108724.48, vss: 0.34, evkw: 10395.27, evkc: 98329.22 },
  dml: { evpi: 76605.57, vss: 964.89, evkw: 11739.31, evkc: 64866.26 },
};

// Tables 6 (EP) and 7 (DML): mean 25-year profit in each climate for the hedged
// plan made under the belief (Stoch) and for the plan made knowing the climate
// (KCUW). The KCUW plan does not depend on the belief; the two tables differ
// slightly because they average different numbers of weather samples.
export const PROFIT_BY_CLIMATE = {
  ep: {
    dry: { kcuw: 1652488, stoch: 1486498 },
    dm: { kcuw: 2416584, stoch: 2416521 },
    mod: { kcuw: 2025712, stoch: 2024500 },
    wet: { kcuw: 3286282, stoch: 3060232 },
  },
  dml: {
    dry: { kcuw: 1648352, stoch: 1616243 },
    dm: { kcuw: 2430358, stoch: 2361189 },
    mod: { kcuw: 2026811, stoch: 1994689 },
    wet: { kcuw: 3296111, stoch: 2794189 },
  },
};
// Section 3.3: weather samples per climate (4,000 in all per belief).
export const SAMPLES = { ep: { dry: 1000, dm: 1000, mod: 1000, wet: 1000 }, dml: { dry: 2400, dm: 1000, mod: 400, wet: 200 } };
