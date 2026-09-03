/**
 * Sanity checks for the toy model. Not a test of reality — a test that the
 * model behaves the way the page claims it does.
 *
 * Run: node src/scripts/linkedModel.test.mjs
 */
import { run, DEFAULTS, intensity } from "./linkedModel.js";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}

console.log("units and intensity");
check("100% LFP contains no nickel", intensity("nickel", 1) === 0);
check("100% LFP contains no cobalt", intensity("cobalt", 1) === 0);
check("100% LFP still contains lithium", intensity("lithium", 1) > 0);
check(
  "lithium intensity is contained metal, not LCE (< 200 t/GWh)",
  intensity("lithium", 0.5) < 200,
  `got ${intensity("lithium", 0.5)}`
);

console.log("\ndefault regime is plausible, not instantly broken");
const base = run({}, "lithium");
check(
  "no shortfall in the first year at defaults",
  base.gap[0] === 0,
  `gap[0]=${base.gap[0].toFixed(1)}`
);
check(
  "a shortfall does eventually appear at defaults",
  base.summary.firstShortfallYear !== null,
  "never short — model has nothing to teach"
);
check(
  "shortfall arrives mid-horizon, not at either edge",
  base.summary.firstShortfallYear > 2030 && base.summary.firstShortfallYear < 2049,
  `first shortfall ${base.summary.firstShortfallYear}`
);

console.log("\nthe mechanism the page claims");
const fastDemand = run({ demandGrowth: 0.25 }, "lithium");
const fastPlusRecovery = run(
  { demandGrowth: 0.25, recovery: 0.95, collection: 1.0 },
  "lithium"
);
check(
  "raising demand growth brings the shortfall forward",
  fastDemand.summary.firstShortfallYear < base.summary.firstShortfallYear,
  `${fastDemand.summary.firstShortfallYear} vs ${base.summary.firstShortfallYear}`
);
check(
  "max recovery cannot fully close a fast-growth gap (the decade lag)",
  fastPlusRecovery.summary.cumulativeGap > 0
);
check(
  "but max recovery does reduce it",
  fastPlusRecovery.summary.cumulativeGap < fastDemand.summary.cumulativeGap
);
check(
  "recovery cannot move the FIRST shortfall year much (nothing retired yet)",
  fastPlusRecovery.summary.firstShortfallYear >= fastDemand.summary.firstShortfallYear
);

console.log("\nchemistry switch");
const nickelLFP = run({ lfpShare: 1 }, "nickel");
check("100% LFP removes all nickel demand", nickelLFP.summary.finalDemand === 0);
check("100% LFP removes all nickel shortfall", nickelLFP.summary.cumulativeGap === 0);
const lithiumLFP = run({ lfpShare: 1 }, "lithium");
check("100% LFP does NOT remove lithium demand", lithiumLFP.summary.finalDemand > 0);

console.log("\nrecovery loop timing");
const noLoop = run({ collection: 0 }, "lithium");
check("with zero collection there is no recovered supply", noLoop.recycled.every((v) => v === 0));
check(
  "recovered supply is zero until the first packs retire",
  base.recycled.slice(0, DEFAULTS.life).every((v) => v === 0),
  "material appearing before anything retired"
);
check(
  "recovered supply is positive after packs retire",
  base.recycled[DEFAULTS.life] > 0
);

console.log("\nmonotonicity");
const lowRec = run({ recovery: 0.1 }, "lithium");
const highRec = run({ recovery: 0.9 }, "lithium");
check(
  "more recovery never means less recovered supply",
  highRec.recycled.every((v, i) => v >= lowRec.recycled[i] - 1e-9)
);
check("more recovery never increases the gap", highRec.summary.cumulativeGap <= lowRec.summary.cumulativeGap);

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
