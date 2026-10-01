// Published numbers behind the mineral supply chains demo. Every value carries its source.
//
// [A] Akhter, R., Palli, S.R., Walanjuwani, M., & Jones, E.C., Jr. (2026). Mapping the supply chain
//     of lithium-ion battery metals from mine to primary processing by country and corporation.
//     Commodities 5(1), 2. doi:10.3390/commodities5010002 (CC BY 4.0). 2024 production.
// [J] Jones, E.C., Jr. (2024). Lithium supply chain optimization: A global analysis of critical
//     minerals for batteries. Energies 17, 2685. doi:10.3390/en17112685 (CC BY 4.0).
//     Public code: github.com/sear-labs/lithium-optsc-energies-2024 (see li-plans.js).
// [I] Alavi, S., Aghapour, R., & Jones, E.C., Jr. (2026). Modeling policy-driven dynamics in the
//     multi-regional lithium supply chain. Proceedings of the IISE Annual Conference & Expo 2026.
//     Table 2 and Section 5 (camera-ready; the same values are Table 1 of the review copy).

export { LI_PLANS } from "./li-plans.js";

// ---------------------------------------------------------------------------------------------
// [A] Concentration thresholds, Section 3 (p. 8): above 2,500 highly concentrated; 1,500-2,500
// moderately; below 1,500 unconcentrated.
export const HHI_BANDS = [
  { id: "low", label: "Unconcentrated", max: 1500 },
  { id: "mid", label: "Moderately concentrated", max: 2500 },
  { id: "high", label: "Highly concentrated", max: 10000 },
];

// [A] Section 6 (p. 26): the paper's three-way policy typology.
export const POLICY = {
  reinforce: "Reinforce supply that is already diverse",
  redistribute: "Build refining outside today's hubs",
  substitute: "Recycling, substitution or stockpiles",
};

// [A] Company tables (share = "% of global" as printed; prod in the table's unit) and country
// tables (total = country production; pct = company's printed % of that country). "est" marks a
// country total the paper flags with * ("differs from USGS; estimated from company production +
// Bloomberg"). hhi = Table 13 global HHI as printed (p. 21).
export const METALS = {
  li: {
    name: "Lithium", unit: "kt", world: 225, hhi: 1241, policy: "redistribute",
    tables: "Tables 5 and 6 (pp. 17-18)",
    hub: "Ore from Australia's hard-rock mines and South America's brines goes overwhelmingly to China to be refined into battery chemicals (Section 5.3).",
    companies: [ // Table 5, world total 225 kt
      { name: "Sinomine Resource Group", hq: "China", prod: 39, share: 17.82, proc: "China" },
      { name: "Albemarle", hq: "USA", prod: 35, share: 15.99, proc: "China" },
      { name: "Pilbara Minerals", hq: "Australia", prod: 28, share: 12.71, proc: "China" },
      { name: "SQM", hq: "Chile", prod: 27, share: 12.16, proc: "Chile" },
      { name: "Sichuan Yahua", hq: "China", prod: 25, share: 11.40, proc: "China" },
      { name: "Mineral Resources", hq: "Australia", prod: 19, share: 8.74, proc: "Australia" },
      { name: "Ganfeng Lithium", hq: "China", prod: 18, share: 8.10, proc: "China" },
      { name: "Rio Tinto (Arcadium)", hq: "UK/Australia", prod: 16, share: 7.20, proc: "Australia" },
      { name: "Tianqi Lithium", hq: "China", prod: 13, share: 5.87, proc: "China" },
    ],
    countries: [ // Table 6
      { name: "Australia", total: 88, cos: [["Pilbara Minerals", 32], ["Mineral Resources", 22], ["Albemarle", 18], ["Rio Tinto", 12], ["Tianqi", 6], ["Ganfeng", 6], ["Sichuan Yahua", 4]] },
      { name: "Chile", total: 49, cos: [["SQM", 55], ["Albemarle", 40], ["Tianqi", 5]] },
      { name: "China", total: 41, cos: [["Sichuan Yahua", 53], ["Other domestic producers", 34], ["Tianqi", 13]] },
      { name: "Zimbabwe", total: 22, cos: [["Sinomine", 100]] },
      { name: "Argentina", total: 18, cos: [["Ganfeng", 70], ["Rio Tinto", 30]] },
    ],
  },
  co: {
    name: "Cobalt", unit: "kt", world: 290, hhi: 3214, hhiCorrected: 2031, policy: "substitute",
    tables: "Tables 7 and 8 (pp. 18-19)",
    hub: "Mined mostly in the DRC and shipped almost exclusively to China, which holds an estimated 72% of world cobalt refining capacity (Section 5.4).",
    companies: [ // Table 7, world total 290 kt
      { name: "CMOC", hq: "China", prod: 114.17, share: 39.37, proc: "China" },
      { name: "Zhejiang Huayou", hq: "China", prod: 46.80, share: 16.14, proc: "China" },
      { name: "Glencore", hq: "Switzerland", prod: 38.20, share: 13.17, proc: "Philippines" },
      { name: "Eurasian Resources Group", hq: "Luxembourg", prod: 19.00, share: 6.55, proc: "Kazakhstan" },
      { name: "Nornickel", hq: "Russia", prod: 4.20, share: 1.45, proc: "Russia" },
      { name: "Sherritt International", hq: "Canada", prod: 3.21, share: 1.11, proc: "Cuba (Moa JV)" },
      { name: "Vale", hq: "Brazil", prod: 2.50, share: 0.86, proc: "Canada" },
      { name: "Wheaton Precious Metals", hq: "Canada", prod: 1.20, share: 0.41, proc: "Canada" },
      { name: "Jinchuan Group", hq: "China", prod: 0.89, share: 0.31, proc: "China" },
      { name: "Panoramic Resources", hq: "Australia", prod: 0.37, share: 0.13, proc: "Australia" },
    ],
    countries: [ // Table 8
      { name: "DR Congo", total: 220, cos: [["CMOC", 51.89], ["Zhejiang Huayou", 18.68], ["Glencore", 17.08], ["ERG", 8.64], ["Jinchuan", 0.33]] },
      { name: "Indonesia", total: 28, cos: [["Zhejiang Huayou", 18.57], ["Vale", 7.57]] },
      { name: "Russia", total: 8.7, cos: [["Nornickel", 48.28]] },
      { name: "Canada", total: 4.5, cos: [["Vale", 6.80]] },
      { name: "Australia", total: 3.6, cos: [["Glencore", 17.08], ["Panoramic", 10.22]] },
      { name: "Cuba", total: 3.5, cos: [["Sherritt", 48.57]] },
      { name: "China", total: 2.7, cos: [["Zhejiang Huayou", 7.41], ["Jinchuan", 6.00]] },
      { name: "Madagascar", total: 2.6, cos: [["Sherritt", 43.03]] },
    ],
  },
  ni: {
    name: "Nickel", unit: "kt", world: 3700, hhi: 1150, policy: "redistribute",
    tables: "Tables 3 and 4 (pp. 16-17)",
    hub: "A China-Indonesia corridor: Indonesian laterite mines feeding refineries built with Chinese partners, in Indonesia and in China (Section 5.2).",
    companies: [ // Table 3, world total 3,700 kt
      { name: "Tsingshan Holding Group", hq: "China", prod: 1120, share: 30.27, proc: "China; Indonesia" },
      { name: "Zhejiang Huayou Cobalt", hq: "China", prod: 380, share: 10.27, proc: "China; Indonesia" },
      { name: "Nornickel", hq: "Russia", prod: 210, share: 5.68, proc: "Russia; Finland" },
      { name: "Jinchuan Group", hq: "China", prod: 200, share: 5.41, proc: "China" },
      { name: "Vale", hq: "Brazil", prod: 160, share: 4.32, proc: "Brazil; Indonesia" },
      { name: "Trimegah Bangun Persada", hq: "Indonesia", prod: 136, share: 3.68, proc: "Indonesia" },
      { name: "Nickel Industries", hq: "Australia", prod: 127.3, share: 3.44, proc: "Indonesia" },
      { name: "Glencore", hq: "Switzerland", prod: 82.3, share: 2.22, proc: "Canada; Australia; Norway" },
      { name: "BHP (Nickel West)", hq: "Australia", prod: 81.6, share: 2.21, proc: "Australia" },
      { name: "Merdeka Battery Materials", hq: "Indonesia", prod: 80, share: 2.16, proc: "Indonesia" },
      { name: "Sumitomo Metal Mining", hq: "Japan", prod: 66, share: 1.78, proc: "Japan" },
      { name: "CNGR Advanced Material", hq: "China", prod: 50, share: 1.35, proc: "China" },
      { name: "Anglo American", hq: "UK", prod: 39.4, share: 1.06, proc: "Brazil" },
      { name: "South32", hq: "Australia", prod: 37.1, share: 1.00, proc: "Australia; Colombia" },
      { name: "Eramet / SLN", hq: "New Caledonia", prod: 32.9, share: 0.89, proc: "New Caledonia" },
    ],
    countries: [ // Table 4
      { name: "Indonesia", total: 2200, cos: [["Tsingshan", 50.91], ["Zhejiang Huayou", 17.27], ["Trimegah", 6.18], ["Nickel Industries", 5.77], ["Merdeka", 3.64], ["Vale", 3.55], ["Eramet", 1.00]] },
      { name: "Philippines", total: 330, cos: [["Sumitomo Metal Mining", 20.00]] },
      { name: "Russia", total: 210, cos: [["Nornickel", 100.00]] },
      { name: "Canada", total: 190, cos: [["Vale", 34.74], ["Glencore", 26.32]] },
      { name: "China", total: 120, cos: [["Jinchuan", 166.67]] },
      { name: "New Caledonia", total: 110, cos: [["Eramet / SLN", 27.73], ["Glencore (Koniambo JV)", 11.82]] },
      { name: "Australia", total: 110, cos: [["BHP", 74.18], ["South32", 33.73], ["Glencore", 17.27]] },
      { name: "Brazil", total: 77, cos: [["Anglo American", 51.17], ["Vale (Onça Puma)", 20.78]] },
    ],
  },
  mn: {
    name: "Manganese", unit: "Mt", world: 21.673, hhi: 2096, policy: "substitute",
    tables: "Tables 11 and 12 (pp. 20-21)",
    hub: "Mined in southern Africa and Australia, then made into alloys and battery chemicals at plants in Asia and Europe (Section 5.6).",
    companies: [ // Table 11, world total 21.673 Mt
      { name: "Eramet", hq: "France", prod: 6.80, share: 31.38, proc: "Spain; China; UK; Mexico; Australia" },
      { name: "South32", hq: "Australia", prod: 4.50, share: 20.76, proc: "South Korea" },
      { name: "Assmang", hq: "South Africa", prod: 3.70, share: 17.07, proc: "South Africa; Malaysia" },
      { name: "Jupiter Mines", hq: "Australia", prod: 3.50, share: 16.15, proc: "South Africa (JVs)" },
      { name: "MOIL", hq: "India", prod: 1.80, share: 8.32, proc: "India" },
      { name: "South Manganese", hq: "Hong Kong", prod: 1.66, share: 7.66, proc: "China; Gabon (JVs)" },
    ],
    countries: [ // Table 12
      { name: "Gabon", total: 7.91, est: true, cos: [["Eramet", 85.97], ["South Manganese", 14.03]] },
      { name: "South Africa", total: 7.40, cos: [["Jupiter Mines", 47.30], ["Assmang", 29.46], ["South32", 15.14]] },
      { name: "Australia", total: 3.38, est: true, cos: [["South32", 100.00]] },
      { name: "India", total: 1.80, est: true, cos: [["MOIL", 100.00]] },
      { name: "China", total: 0.77, cos: [["South Manganese", 71.43]] },
      { name: "Malaysia", total: 0.41, cos: [["Assmang", 17.07]] },
    ],
  },
  cu: {
    name: "Copper", unit: "Mt", world: 20.29, hhi: 457, policy: "reinforce",
    tables: "Tables 9 and 10 (pp. 19-20)",
    hub: "Mined across the Americas, Africa and Oceania, then shipped as concentrate to smelters and refineries in China, Japan and South Korea (Section 5.5).",
    companies: [ // Table 9, world total 20.29 Mt (table note)
      { name: "Volcan Cia Minera", hq: "Peru", prod: 2.23, share: 10.99, proc: "China; UK" },
      { name: "Freeport-McMoRan", hq: "USA", prod: 2.11, share: 10.38, proc: "Japan; Peru" },
      { name: "BHP", hq: "Australia", prod: 2.06, share: 10.13, proc: "China; South Korea; Japan" },
      { name: "Yunnan Copper", hq: "China", prod: 1.21, share: 5.94, proc: "China" },
      { name: "Grupo Mexico", hq: "Mexico", prod: 1.09, share: 5.35, proc: "USA; Japan" },
      { name: "Southern Copper", hq: "USA", prod: 0.97, share: 4.80, proc: "UK" },
      { name: "Glencore", hq: "UK", prod: 0.95, share: 4.69, proc: "South Korea" },
      { name: "Zijin Mining", hq: "Hong Kong", prod: 0.84, share: 4.13, proc: "China" },
    ],
    countries: [ // Table 10
      { name: "Peru", total: 6.19, est: true, cos: [["Volcan", 36.03], ["BHP", 17.93], ["Freeport-McMoRan", 16.96], ["Southern Copper", 11.79], ["Grupo Mexico", 10.34], ["Glencore", 6.95]] },
      { name: "Chile", total: 5.30, cos: [["BHP", 10.38], ["Freeport-McMoRan", 9.81], ["Glencore", 3.96]] },
      { name: "DR Congo", total: 3.30, cos: [["Zijin", 12.73], ["Glencore", 4.24]] },
      { name: "China", total: 1.80, cos: [["Yunnan Copper", 67.00], ["Zijin", 23.33]] },
      { name: "United States", total: 1.10, cos: [["Freeport-McMoRan", 31.82], ["Grupo Mexico", 19.09]] },
      { name: "Indonesia", total: 1.10, cos: [["Freeport-McMoRan", 15.45]] },
      { name: "Australia", total: 0.80, cos: [["BHP", 46.25], ["Glencore", 17.50]] },
      { name: "Mexico", total: 0.70, cos: [["Southern Copper", 34.29], ["Grupo Mexico", 30.00]] },
    ],
  },
  al: {
    name: "Aluminum", unit: "Mt", world: 72, hhi: 312, policy: "reinforce",
    tables: "Tables 1 and 2 (pp. 15-16)",
    hub: "Bauxite from Guinea and Australia is refined mostly in China, which makes roughly three-fifths of the world's metal; smelters elsewhere follow cheap power (Section 5.1).",
    companies: [ // Table 1, world total 72 Mt
      { name: "Chalco", hq: "China", prod: 7.10, share: 9.86, proc: "China" },
      { name: "China Hongqiao", hq: "China", prod: 5.84, share: 8.11, proc: "China" },
      { name: "SPIC", hq: "China", prod: 4.30, share: 5.97, proc: "China" },
      { name: "UC RUSAL", hq: "Russia", prod: 3.99, share: 5.54, proc: "Russia; Australia; Guinea" },
      { name: "Xinfa Group", hq: "China", prod: 3.60, share: 5.00, proc: "China" },
      { name: "Rio Tinto (Aluminium)", hq: "UK/Australia", prod: 3.30, share: 4.58, proc: "Canada; Australia; Oman; Guinea" },
      { name: "Emirates Global Aluminium", hq: "UAE", prod: 2.69, share: 3.74, proc: "UAE; Guinea" },
      { name: "Vedanta Aluminium", hq: "India", prod: 2.37, share: 3.29, proc: "India" },
      { name: "Aluminium Bahrain", hq: "Bahrain", prod: 1.62, share: 2.25, proc: "Bahrain" },
      { name: "Hindalco", hq: "India", prod: 1.30, share: 1.81, proc: "India" },
      { name: "Norsk Hydro", hq: "Norway", prod: 1.30, share: 1.81, proc: "Norway; Brazil" },
      { name: "NALCO", hq: "India", prod: 0.45, share: 0.63, proc: "India" },
      { name: "Century Aluminum", hq: "USA", prod: 0.23, share: 0.32, proc: "USA; Iceland" },
      { name: "Alcoa", hq: "USA", prod: 0.13, share: 0.18, proc: "USA; Australia; Canada" },
    ],
    countries: [ // Table 2 (the 6.80 Mt row is "the combined total for Qatar, Spain, and New Zealand" per its note)
      { name: "China", total: 43, cos: [["Chalco", 16.51], ["Hongqiao", 13.49], ["SPIC", 10.00], ["Xinfa", 8.37]] },
      { name: "Qatar, Spain, N. Zealand", total: 6.80, combined: true, cos: [["Norsk Hydro (Qatar)", 9.12], ["Rio Tinto (N. Zealand)", 5.15], ["Alcoa (Spain)", 0.59]] },
      { name: "India", total: 4.20, cos: [["Vedanta", 56.43], ["Hindalco", 30.95], ["NALCO", 10.71]] },
      { name: "Russia", total: 3.80, cos: [["UC RUSAL", 100.00]] },
      { name: "Canada", total: 3.30, cos: [["Rio Tinto", 54.55]] },
      { name: "UAE", total: 2.70, cos: [["EGA", 99.63]] },
      { name: "Bahrain", total: 1.60, cos: [["Alba", 100.00]] },
      { name: "Australia", total: 1.50, cos: [["Rio Tinto", 53.33], ["Alcoa", 20.00]] },
      { name: "Norway", total: 1.30, cos: [["Norsk Hydro", 96.15], ["Alcoa", 3.85]] },
      { name: "Brazil", total: 1.10, cos: [["Norsk Hydro", 6.36], ["Alcoa", 4.55]] },
      { name: "Iceland", total: 0.78, cos: [["Rio Tinto", 46.15], ["Century", 28.21]] },
      { name: "United States", total: 0.67, cos: [["Century", 34.33], ["Alcoa", 19.40]] },
    ],
  },
};
export const METAL_ORDER = ["li", "co", "ni", "mn", "cu", "al"];

// [A] Cobalt correction. Table 13 prints a global HHI of 3,214; the paper's own Table 7 shares
// (on its stated 290 kt world total) give 2,031. 3,214 is what the same company outputs give on
// an older world total of about 230.5 kt (2,031 x (290/230.5)^2 = 3,215).
export const COBALT_OLD_WORLD_KT = 230.5;

// ---------------------------------------------------------------------------------------------
// [J] Table 4 (p. 18): facilities open in select years, by scenario, plus totals.
export const LI_TABLE4 = {
  years: [2023, 2030, 2040, 2050, 2100],
  stages: ["mine", "proc", "cath", "cell", "pack", "rec"],
  cost: {
    mine: [8, 13, 21, 36, 96], proc: [8, 12, 21, 32, 70], cath: [15, 19, 36, 59, 145],
    cell: [30, 30, 39, 64, 153], pack: [22, 33, 65, 110, 261], rec: [0, 0, 0, 0, 0],
  },
  co2: {
    mine: [8, 14, 20, 29, 77], proc: [8, 13, 27, 41, 97], cath: [15, 20, 37, 66, 157],
    cell: [30, 30, 39, 67, 160], pack: [22, 35, 68, 112, 266], rec: [0, 100, 150, 243, 283],
  },
  totalCostTrillion: { cost: 9.51, co2: 10.1 },   // Table 4, "Total Discounted Cost"
  totalCO2Gt: { cost: 56.8, co2: 55.7 },          // Table 4, "Total CO2 Emissions"
};
export const STAGE_LABEL = {
  mine: "Mining", proc: "Refining", cath: "Cathode", cell: "Cell", pack: "Battery pack", rec: "Recycling",
};
export const DEPOSIT_LABEL = { spod: "Hard-rock spodumene", clay: "Clay", brine: "Brine" };

// ---------------------------------------------------------------------------------------------
// [I] Table 2 (p. 4): scenarios = share of Australia's refined lithium allocated to the U.S.
// usShare = U.S. midstream (cathode + cell) market share = allocation x 28.65% (Section 5.1).
// USD billion.
export const IISE_T2 = [
  { alloc: 0, usShare: 0, usDomestic: 0.00, usImport: 258.39, usTotal: 258.39, china: 9515.46 },
  { alloc: 10, usShare: 3, usDomestic: 246.60, usImport: 242.45, usTotal: 489.05, china: 9302.93 },
  { alloc: 20, usShare: 6, usDomestic: 570.68, usImport: 216.82, usTotal: 787.50, china: 9024.33 },
  { alloc: 30, usShare: 9, usDomestic: 890.15, usImport: 191.97, usTotal: 1082.12, china: 8749.60 },
  { alloc: 40, usShare: 11, usDomestic: 1100.05, usImport: 176.16, usTotal: 1276.21, china: 8569.88 },
  { alloc: 50, usShare: 14, usDomestic: 1422.74, usImport: 151.22, usTotal: 1573.95, china: 8293.33 },
  { alloc: 60, usShare: 17, usDomestic: 1742.63, usImport: 125.97, usTotal: 1868.60, china: 8021.46 },
];
// [I] Section 2 and 5.1: Australia's share of global lithium production by company headquarters.
export const IISE_AUS_SHARE = 28.65;
// [I] Section 5: statements the demo quotes.
export const IISE_TEXT = { domesticShareAt60: 93, importDropPct: 51, chinaDropPct: 16 };
