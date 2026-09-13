/**
 * When did the decision have to be made?
 *
 * This is a teaching toy, not research. It is arithmetic on calendar years:
 * lay the stages of a mine end to end, put the last one's finish on the year
 * you want metal, and read off when the first one had to start. There is no
 * uncertainty, no probability of failure, no financing market, and no option
 * to go faster by spending more.
 *
 * The one thing it exists to make visible: for any target inside the next
 * decade and a half, the start date is in the PAST. The decision was either
 * taken years ago or the target cannot be met by new primary supply — and no
 * amount of urgency now moves that date. Every coefficient lives in
 * leadTimeData.js.
 */

import { STAGES } from "./leadTimeData.js";

export const DEFAULTS = {
  targetYear: 2035,
  durations: Object.fromEntries(STAGES.map((s) => [s.key, s.years])),
};

/** Today, as a year. The whole model turns on what "already too late" means. */
export function currentYear(now = new Date()) {
  return now.getFullYear();
}

export function totalYears(durations) {
  return STAGES.reduce((sum, s) => sum + (durations[s.key] ?? s.years), 0);
}

/**
 * Lay the stages out twice.
 *
 * `required` runs backwards from the target: the schedule that would have to
 * have been followed. `earliest` runs forwards from today: the schedule still
 * available. The gap between them is the answer, and when it is positive the
 * required schedule starts in the past, which is the point.
 */
export function run(params = {}) {
  const p = { ...DEFAULTS, ...params };
  const durations = { ...DEFAULTS.durations, ...(params.durations || {}) };
  const today = p.today ?? currentYear();
  const total = totalYears(durations);

  // Backwards from the target.
  const required = [];
  let cursor = p.targetYear;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const s = STAGES[i];
    const len = durations[s.key];
    required.unshift({ ...s, years: len, start: cursor - len, end: cursor });
    cursor -= len;
  }
  const requiredStart = cursor;

  // Forwards from today.
  const earliest = [];
  cursor = today;
  for (const s of STAGES) {
    const len = durations[s.key];
    earliest.push({ ...s, years: len, start: cursor, end: cursor + len });
    cursor += len;
  }
  const earliestDelivery = cursor;

  const yearsLate = today - requiredStart;      // > 0 means the window has closed
  const missedBy = earliestDelivery - p.targetYear;

  return {
    today,
    targetYear: p.targetYear,
    durations,
    total,
    required,
    requiredStart,
    earliest,
    earliestDelivery,
    yearsLate,
    missedBy,
    // A target is reachable by NEW primary supply only if starting now lands
    // on or before it. Everything else has to come from somewhere else:
    // existing mines, expansions, recycling, substitution, or less demand.
    reachable: earliestDelivery <= p.targetYear,
    // How much of the required schedule is already behind us, 0..1.
    elapsedShare: total > 0 ? Math.min(1, Math.max(0, yearsLate / total)) : 0,
  };
}
