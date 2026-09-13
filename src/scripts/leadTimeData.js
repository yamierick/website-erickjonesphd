/**
 * Stage durations for a new mine, discovery to full production.
 *
 * THIS FILE IS THE MODEL. leadTimeModel.js only adds and subtracts years.
 *
 * ---------------------------------------------------------------------------
 * HONESTY ABOUT THE NUMBERS
 *
 * The TOTAL is the well-attested figure: S&P Global Market Intelligence put the
 * average at 15.7 years for mines that entered production in the 2010s, and the
 * IEA uses roughly 16 years in its critical minerals work. Those are real,
 * published, and the number this page rests on.
 *
 * The SPLIT between stages is not equally solid. Every source carves the
 * pipeline up differently and the boundaries are genuinely fuzzy — feasibility
 * work overlaps permitting, permitting overlaps early construction. The stage
 * figures below are an order-of-magnitude apportionment that sums to the
 * published total, and each says so.
 *
 * The spread matters more than the middle. Permitting in particular runs from
 * about two years in the fastest jurisdictions to more than a decade in the
 * slowest, and that single stage accounts for most of the variance between two
 * otherwise identical projects. The model exposes every stage as a control for
 * exactly that reason: the honest answer to "how long does a mine take" is a
 * range, and a reader who can move the range gets a truer picture than one
 * handed a single number.
 */

export const STAGES = [
  {
    key: "discovery",
    label: "Discovery to resource",
    years: 4,
    min: 1,
    max: 15,
    source: "estimate",
    note: "From first drilling to a resource anyone will finance. Highly variable, and "
      + "survivorship-biased: the deposits that never get there are not in the average.",
  },
  {
    key: "feasibility",
    label: "Studies and feasibility",
    years: 3,
    min: 1,
    max: 8,
    source: "estimate",
    note: "Scoping, pre-feasibility and bankable feasibility, plus the financing that waits on them.",
  },
  {
    key: "permitting",
    label: "Permitting",
    years: 4,
    min: 1,
    max: 15,
    source: "estimate",
    note: "The widest stage by far — roughly two years in the fastest jurisdictions to "
      + "beyond a decade in the slowest. Most of the difference between two similar "
      + "projects lives here.",
  },
  {
    key: "construction",
    label: "Construction",
    years: 3,
    min: 1,
    max: 8,
    source: "estimate",
    note: "Earthworks through commissioning. The most predictable stage, and the one "
      + "people picture when they imagine 'building a mine'.",
  },
  {
    key: "rampUp",
    label: "Ramp-up",
    years: 2,
    min: 0,
    max: 6,
    source: "estimate",
    note: "Commissioning to nameplate. Rarely smooth, and routinely underestimated.",
  },
];

/** The figure the stage split is calibrated to sum to. */
export const PUBLISHED_TOTAL = {
  years: 15.7,
  source: "S&P Global Market Intelligence",
  note: "Average years from discovery to production, mines entering production 2010–2019. "
    + "The IEA uses a comparable ~16 years in its critical minerals analysis.",
};

export const SOURCES = {
  "S&P Global Market Intelligence": "Discovery-to-production lead times, mines entering production 2010–2019.",
  estimate: "Order-of-magnitude apportionment made for this page, summing to the published total. "
    + "Not from a published stage-by-stage breakdown.",
};
