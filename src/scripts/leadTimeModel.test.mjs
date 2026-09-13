/**
 * Sanity checks for the lead-time model. Not a test of reality — a test that
 * the arithmetic is self-consistent and that the model claims what the page
 * says it claims.
 *
 * Run: node src/scripts/leadTimeModel.test.mjs
 */
import { run, totalYears, currentYear, DEFAULTS } from "./leadTimeModel.js";
import { STAGES, PUBLISHED_TOTAL } from "./leadTimeData.js";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}

console.log("the stage split matches the figure it claims to sum to");
{
  const t = totalYears(DEFAULTS.durations);
  check(
    "default stages sum to within a year of the published total",
    Math.abs(t - PUBLISHED_TOTAL.years) <= 1,
    `stages ${t}, published ${PUBLISHED_TOTAL.years}`
  );
  check("every stage has a positive default", STAGES.every((s) => s.years > 0));
  check("every stage's default sits inside its own slider range",
    STAGES.every((s) => s.years >= s.min && s.years <= s.max),
    STAGES.filter((s) => s.years < s.min || s.years > s.max).map((s) => s.key).join(","));
}

console.log("\nthe two schedules are laid out consistently");
{
  const r = run({ today: 2026, targetYear: 2035 });
  check("required schedule ends exactly on the target",
    r.required[r.required.length - 1].end === 2035);
  check("required schedule is contiguous — no gaps, no overlaps",
    r.required.every((s, i) => i === 0 || s.start === r.required[i - 1].end));
  check("earliest schedule starts today",
    r.earliest[0].start === 2026);
  check("earliest schedule is contiguous",
    r.earliest.every((s, i) => i === 0 || s.start === r.earliest[i - 1].end));
  check("both schedules span the same total",
    (r.required[r.required.length - 1].end - r.requiredStart)
      === (r.earliestDelivery - r.earliest[0].start));
  check("required start is the target minus the total",
    r.requiredStart === 2035 - r.total, `${r.requiredStart} vs ${2035 - r.total}`);
}

console.log("\nthe thesis: a near target is already out of reach");
{
  const r = run({ today: 2026, targetYear: 2035 });
  check("a 2035 target required starting before today", r.requiredStart < 2026,
    `required start ${r.requiredStart}`);
  check("and is therefore flagged unreachable", r.reachable === false);
  check("yearsLate is positive and equals today minus required start",
    r.yearsLate > 0 && r.yearsLate === 2026 - r.requiredStart);
  check("missedBy equals earliest delivery minus target",
    r.missedBy === r.earliestDelivery - 2035);
}

console.log("\na far enough target is reachable, and the boundary is exact");
{
  const r = run({ today: 2026, targetYear: 2060 });
  check("a 2060 target is reachable", r.reachable === true);
  check("its required start is in the future", r.requiredStart > 2026);
  check("yearsLate is negative when there is slack", r.yearsLate < 0);

  const total = totalYears(DEFAULTS.durations);
  const exact = run({ today: 2026, targetYear: 2026 + total });
  check("a target exactly one lead time away is reachable",
    exact.reachable === true, `earliest ${exact.earliestDelivery}, target ${exact.targetYear}`);
  const oneLess = run({ today: 2026, targetYear: 2026 + total - 1 });
  check("one year sooner is not", oneLess.reachable === false);
}

console.log("\nthe controls move the answer in the right direction");
{
  const base = run({ today: 2026, targetYear: 2040 });
  const slowPermit = run({
    today: 2026, targetYear: 2040,
    durations: { ...DEFAULTS.durations, permitting: DEFAULTS.durations.permitting + 6 },
  });
  check("slower permitting pushes the required start earlier",
    slowPermit.requiredStart < base.requiredStart);
  check("and pushes the earliest delivery later",
    slowPermit.earliestDelivery > base.earliestDelivery);

  const fast = run({
    today: 2026, targetYear: 2040,
    durations: Object.fromEntries(STAGES.map((s) => [s.key, s.min])),
  });
  check("every stage at its fastest still takes years, not months",
    fast.total >= 4, `total ${fast.total}`);
  check("even the fastest case cannot deliver in under its own total",
    fast.earliestDelivery === 2026 + fast.total);
}

console.log("\nnothing is silently nonsense");
{
  const r = run({ today: 2026, targetYear: 2035 });
  check("elapsedShare is a fraction", r.elapsedShare >= 0 && r.elapsedShare <= 1);
  check("every year in both schedules is an integer",
    [...r.required, ...r.earliest].every((s) => Number.isInteger(s.start) && Number.isInteger(s.end)));
  check("every reported number is finite",
    [r.total, r.requiredStart, r.earliestDelivery, r.yearsLate, r.missedBy].every(Number.isFinite));
  check("currentYear() returns a plausible year",
    currentYear() >= 2024 && currentYear() < 2100, String(currentYear()));
}

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
