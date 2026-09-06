/**
 * Coefficient table for the demand -> generation -> materials -> ore cascade.
 *
 * THIS FILE IS THE MODEL. Everything in materialModel.js is arithmetic on the
 * numbers below, so this is the only file to edit to change what the page says.
 *
 * ---------------------------------------------------------------------------
 * HONESTY ABOUT THE NUMBERS
 *
 * Every entry carries a `source`. There are three kinds and they are not
 * equally strong, so they are labelled rather than blended:
 *
 *   "IEA 2021"   published mineral intensity, rounded to two significant
 *                figures. Trustworthy to the precision shown.
 *   "EIA" /      published operating statistic or commodity figure, rounded.
 *   "USGS"       Trustworthy to the precision shown.
 *   "estimate"   an order-of-magnitude engineering estimate made for this toy.
 *                Bulk steel and aluminum are not in the IEA table, and the
 *                grid allowance is a stand-in for a real interconnection study.
 *                These are the numbers to distrust first.
 *
 * Roughly a third of the table is "estimate". That is fine for the point the
 * page makes -- the conclusion turns on ratios of 200:1, not on 10% accuracy --
 * but it is not fine to hide, which is why the label travels with the number.
 *
 * ---------------------------------------------------------------------------
 * UNITS -- the single easiest thing to get wrong here
 *
 * Generation intensity is kg per MW of NAMEPLATE capacity.
 * Storage intensity is kg per MWh of ENERGY capacity.
 * Those are different denominators and must never be added together.
 *
 * All metal figures are CONTAINED METAL, not oxide, not carbonate, not alloy
 * mass. Lithium quoted as lithium carbonate equivalent (LCE) is ~5.3x the
 * contained-metal figure; mixing the two is how you end up wrong by a factor
 * of five. Steel is the one exception and is flagged where it appears: it is
 * alloy mass, because nobody quotes a wind tower in tonnes of contained iron.
 */

// ---------------------------------------------------------------------------
// Sets. The order here is the order everything renders in.

export const TECHS = ["gas", "solar", "wind", "battery"];
export const COMPONENTS = ["turbine", "module", "cell", "structure", "wiring", "transformer"];
export const MATERIALS = ["copper", "aluminum", "steel", "lithium", "nickel"];
export const ORES = ["copper ore", "bauxite", "iron ore", "lithium ore", "nickel ore"];

export const LABELS = {
  gas: "Gas",
  solar: "Solar",
  wind: "Wind",
  battery: "Storage",
  turbine: "Turbine",
  module: "Module",
  cell: "Cell",
  structure: "Structure",
  wiring: "Wiring",
  transformer: "Transformer",
  grid: "Grid connection",
  copper: "Copper",
  aluminum: "Aluminum",
  steel: "Steel",
  lithium: "Lithium",
  nickel: "Nickel",
};

/** Which ore each material comes out of. */
export const ORE_OF = {
  copper: "copper ore",
  aluminum: "bauxite",
  steel: "iron ore",
  lithium: "lithium ore",
  nickel: "nickel ore",
};

// ---------------------------------------------------------------------------
// Capacity factors. Turns energy served into capacity that has to exist.
//
// This is the first of the two multipliers the page is about. Solar and gas
// differ by more than a factor of two here, and that difference multiplies
// through every material row below before anything else happens.

export const CAPACITY_FACTOR = {
  gas: { value: 0.56, source: "EIA", note: "US combined-cycle fleet average" },
  solar: { value: 0.24, source: "EIA", note: "US utility-scale PV average" },
  wind: { value: 0.34, source: "EIA", note: "US onshore fleet average" },
};

// ---------------------------------------------------------------------------
// Material intensity.
//
// Rows are {tech, component, material, qty}. The component is an ATTRIBUTION,
// not a second multiplication -- it says which part of the machine the metal is
// in, so the diagram can show a middle column without inventing a coefficient.
//
// Units: kg per MW for gas/solar/wind, kg per MWh for battery.

export const INTENSITY = [
  // --- Gas, combined cycle -------------------------------------------------
  { tech: "gas", component: "turbine", material: "steel", qty: 8000,
    source: "estimate", note: "turbine hall, HRSG and casing; gas is compact per MW" },
  { tech: "gas", component: "turbine", material: "nickel", qty: 15,
    source: "IEA 2021", note: "hot-section superalloy" },
  { tech: "gas", component: "structure", material: "steel", qty: 2000,
    source: "estimate", note: "foundations and balance of plant" },
  { tech: "gas", component: "wiring", material: "copper", qty: 1100,
    source: "IEA 2021", note: "generator, plant cabling" },

  // --- Solar PV, utility scale ---------------------------------------------
  { tech: "solar", component: "module", material: "copper", qty: 1400,
    source: "IEA 2021", note: "cell interconnect and module wiring; half the IEA total" },
  { tech: "solar", component: "module", material: "aluminum", qty: 8000,
    source: "estimate", note: "module frames" },
  { tech: "solar", component: "structure", material: "steel", qty: 25000,
    source: "estimate", note: "tracker torque tubes and driven piles" },
  { tech: "solar", component: "wiring", material: "copper", qty: 1400,
    source: "IEA 2021", note: "string cabling, inverters, collection; other half" },

  // --- Wind, onshore -------------------------------------------------------
  { tech: "wind", component: "turbine", material: "copper", qty: 1900,
    source: "IEA 2021", note: "generator windings" },
  { tech: "wind", component: "turbine", material: "nickel", qty: 400,
    source: "IEA 2021", note: "drivetrain alloy steels" },
  { tech: "wind", component: "turbine", material: "steel", qty: 35000,
    source: "estimate", note: "nacelle, hub, gearbox" },
  { tech: "wind", component: "structure", material: "steel", qty: 85000,
    source: "estimate", note: "tower and foundation reinforcement" },
  { tech: "wind", component: "wiring", material: "copper", qty: 1000,
    source: "IEA 2021", note: "array cabling" },

  // --- Battery storage -- per MWh, not per MW ------------------------------
  // Lithium and nickel are chemistry-dependent and live in CHEMISTRY below.
  { tech: "battery", component: "cell", material: "aluminum", qty: 900,
    source: "estimate", note: "cathode foil, cell can, module housing" },
  { tech: "battery", component: "wiring", material: "copper", qty: 700,
    source: "estimate", note: "anode foil, busbars, pack harness" },
  { tech: "battery", component: "structure", material: "steel", qty: 2500,
    source: "estimate", note: "racks and enclosure" },
];

// ---------------------------------------------------------------------------
// Battery chemistry, kg of contained metal per MWh.
//
// These are the same numbers as the toy linked model on /model/, deliberately.
// Two pages on one site disagreeing about the lithium content of a cell would
// be worse than either page being wrong on its own.

export const CHEMISTRY = {
  LFP: {
    lithium: { qty: 90, source: "IEA 2021", note: "contained metal, not LCE" },
    nickel: { qty: 0, source: "IEA 2021", note: "LFP contains no nickel -- that is the point of it" },
  },
  NMC: {
    lithium: { qty: 100, source: "IEA 2021", note: "contained metal, not LCE" },
    nickel: { qty: 650, source: "IEA 2021", note: "NMC622-ish" },
  },
};

// ---------------------------------------------------------------------------
// Grid connection. Charged per MW of anything built, which is the coupling.
//
// Every technology above hangs off a step-up transformer and a line, so this
// row applies to the whole mix at once and does not care what the mix is.
// It is the reason copper never goes away no matter which scenario you pick.
//
// The softest numbers in the file. A real figure comes from an interconnection
// study of a specific plant at a specific distance from a specific substation,
// and would vary by an order of magnitude across sites.

export const GRID = [
  { component: "transformer", material: "copper", qty: 200,
    source: "estimate", note: "step-up transformer windings, per MVA" },
  { component: "transformer", material: "steel", qty: 550,
    source: "estimate", note: "grain-oriented electrical steel core" },
  { component: "wiring", material: "aluminum", qty: 1500,
    source: "estimate", note: "nominal ACSR interconnection allowance" },
];

// ---------------------------------------------------------------------------
// Ore. Tonnes of rock moved per tonne of contained metal delivered.
//
// This is the second of the two multipliers, and the larger one. Copper at
// 0.5% head grade means a tonne of copper is a couple of hundred tonnes of
// rock; steel at 55% iron means a tonne of steel is under two. A mix shift
// that looks small in metal is enormous in rock, and this column is why.

export const ORE = {
  "copper ore": {
    material: "copper", tPerT: 220,
    grade: 0.0053, recovery: 0.85,
    source: "USGS", note: "global average head grade, declining; mine-to-cathode recovery" },
  bauxite: {
    material: "aluminum", tPerT: 4.2,
    grade: null, recovery: null,
    source: "USGS", note: "4 t bauxite -> 2 t alumina -> 1 t aluminum, the standard chain" },
  "iron ore": {
    material: "steel", tPerT: 1.6,
    grade: 0.55, recovery: 0.95,
    source: "estimate", note: "primary blast-furnace route; a scrap-fed arc furnace is far lower" },
  "lithium ore": {
    material: "lithium", tPerT: 240,
    grade: 0.006, recovery: 0.70,
    source: "USGS", note: "1.3% Li2O spodumene = 0.60% contained Li; brine moves no rock at all" },
  "nickel ore": {
    material: "nickel", tPerT: 105,
    grade: 0.012, recovery: 0.80,
    source: "USGS", note: "laterite; sulfide ore is richer and nearly exhausted" },
};

// ---------------------------------------------------------------------------
// Provenance summary, for the page to render rather than for the model to use.

export const SOURCES = {
  "IEA 2021": "IEA, The Role of Critical Minerals in Clean Energy Transitions (2021), mineral intensity annex.",
  EIA: "US Energy Information Administration, Electric Power Monthly, fleet-average capacity factors.",
  USGS: "US Geological Survey, Mineral Commodity Summaries, grades and processing ratios.",
  estimate: "Order-of-magnitude engineering estimate made for this page. Not from a published table.",
};
