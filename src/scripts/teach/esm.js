/**
 * Calculations for the Energy Systems Modeling worked examples, one block per
 * module. Each follows the course notebook it shadows, so a student who opens the
 * Colab notebook meets the same numbers:
 *   M0  toy dispatch LP (M0_Toy_LP_to_PyPSA: 100 MW, solar $0, gas $22.14)
 *   M1  a day's load built from sectors, including EV charging
 *   M2  merit-order dispatch, and LCOE (SB3_Capital_and_LCOE)
 *   M3  DC power flow on the three-bus Texas triangle (M3_PowerFlow_Companion)
 *   M4  battery arbitrage, and the materials a build plan needs (the /materials/
 *       coefficients, so the two pages cannot disagree)
 *   M5  one facility at two sizes: price taker or price maker (M5_Facility_Decision)
 * Illustrative numbers are labeled as such on the page; none is a forecast.
 */
import { INTENSITY, CHEMISTRY, GRID, ORE, ORE_OF, CAPACITY_FACTOR } from "../materialData.js";

// ---- M0: the toy LP ---------------------------------------------------------
/** Dispatch cheapest-first; price = cost of the marginal unit (the balance constraint's dual). */
export function dispatch(units, demand) {
  const order = units.map((u, i) => ({ ...u, i })).sort((a, b) => a.cost - b.cost);
  let left = demand, cost = 0;
  const out = units.map(() => 0);
  for (const u of order) {
    const q = Math.min(u.cap, Math.max(0, left));
    out[u.i] = q; cost += q * u.cost; left -= q;
  }
  // The price is what one more MW would cost: the first unit, cheapest first, with room left.
  const next = order.find((u) => out[u.i] < u.cap - 1e-9);
  return { out, cost, price: next ? next.cost : Infinity, marginal: next ? next.name : null, unmet: Math.max(0, left) };
}

// ---- M1: a day's load ---------------------------------------------------------
const gauss = (h, c, w) => Math.exp(-((h - c) ** 2) / w);
/** Hourly shapes (peak = 1) for each sector, hour 0..23. */
export const SHAPES = {
  residential: (h) => 0.45 + 0.55 * gauss(h, 19, 6) + 0.25 * gauss(h, 7, 3),
  commercial: (h) => 0.35 + 0.65 * (h >= 8 && h <= 18 ? 1 : gauss(h, h < 8 ? 8 : 18, 2)),
  industrial: (h) => 0.9 + 0.1 * (h >= 6 && h <= 22 ? 1 : 0),
};
/**
 * EV charging, MW in each hour, for `evs` cars using `kwh` each a day.
 * mode "evening": start when people get home (spread 17-22); "night": smart, spread 0-6;
 * "work": at the workplace, spread 9-15.
 */
export function evProfile(evs, kwh, mode) {
  const win = { evening: [17, 18, 19, 20, 21, 22], night: [0, 1, 2, 3, 4, 5], work: [9, 10, 11, 12, 13, 14] }[mode];
  const weights = { evening: [0.25, 0.25, 0.2, 0.15, 0.1, 0.05], night: [1, 1, 1, 1, 1, 1].map((v) => v / 6), work: [1, 1, 1, 1, 1, 1].map((v) => v / 6) }[mode];
  const mwh = (evs * kwh) / 1000;
  const out = Array(24).fill(0);
  win.forEach((h, i) => (out[h] += mwh * weights[i]));
  return out;
}
export function dayLoad({ res = 300, com = 200, ind = 150, evs = 0, evKwh = 10, mode = "evening" }) {
  const ev = evProfile(evs, evKwh, mode);
  const hours = Array.from({ length: 24 }, (_, h) => ({
    h, res: res * SHAPES.residential(h), com: com * SHAPES.commercial(h), ind: ind * SHAPES.industrial(h), ev: ev[h],
  }));
  hours.forEach((x) => (x.total = x.res + x.com + x.ind + x.ev));
  const energy = hours.reduce((s, x) => s + x.total, 0);
  const peak = Math.max(...hours.map((x) => x.total));
  const peakHour = hours.find((x) => x.total === peak).h;
  return { hours, energy, peak, peakHour, loadFactor: energy / 24 / peak };
}

// ---- M2: merit order and LCOE -------------------------------------------------
/** An ERCOT-flavored fleet in GW (illustrative). Fuel costs follow the gas and coal price sliders. */
export function fleet({ gas = 3.5, coal = 2.0, wind = 15, solar = 10 }) {
  return [
    { name: "Wind", cap: wind, cost: 0 },
    { name: "Solar", cap: solar, cost: 0 },
    { name: "Nuclear", cap: 5, cost: 10.4 * 0.7 + 2 },          // heat rate 10,400, fuel $0.70/MMBtu, VOM $2
    { name: "Coal", cap: 13, cost: 10.0 * coal + 4.5 },         // heat rate 10,000
    { name: "Gas combined cycle", cap: 35, cost: 6.6 * gas + 2 }, // heat rate 6,600
    { name: "Gas peaker", cap: 12, cost: 10.5 * gas + 5 },      // heat rate 10,500
  ];
}
/** Capital recovery factor: turns an up-front cost into an equal yearly payment. */
export const crf = (r, n) => (r * (1 + r) ** n) / ((1 + r) ** n - 1);
/**
 * Levelized cost, $/MWh. capex $/kW, fom $/kW-yr, vom $/MWh, heat rate Btu/kWh,
 * fuel $/MMBtu, cf 0-1, r discount rate, n years.
 */
export function lcoe({ capex, fom, vom = 0, hr = 0, fuel = 0, cf, r = 0.07, n = 30 }) {
  const mwhPerKw = (8760 * cf) / 1000;
  const capital = (crf(r, n) * capex) / mwhPerKw, fixed = fom / mwhPerKw, fuelC = (hr / 1000) * fuel;
  return { capital, fixed, vom, fuel: fuelC, total: capital + fixed + vom + fuelC };
}
export const TECH = {
  "Gas combined cycle": { capex: 1100, fom: 15, vom: 2, hr: 6600, fuelKey: "gas", cf: 0.56 },
  Coal: { capex: 4000, fom: 45, vom: 4.5, hr: 10000, fuelKey: "coal", cf: 0.5 },
  Nuclear: { capex: 7500, fom: 120, vom: 2, hr: 10400, fuelKey: "uranium", cf: 0.92 },
  Wind: { capex: 1500, fom: 30, cf: CAPACITY_FACTOR.wind.value },
  Solar: { capex: 1300, fom: 20, cf: CAPACITY_FACTOR.solar.value },
};

// ---- M3: DC power flow on the Texas triangle --------------------------------------
/**
 * Three buses, equal reactance: West Texas (wind), Houston (gas), Dallas.
 * With Dallas as the reference, a MW injected at West Texas splits 2/3 on the
 * direct line to Dallas and 1/3 the long way through Houston (and the mirror for
 * Houston). Returns the cheapest feasible dispatch, the line flows and the price
 * at each bus. physics=false is the transport (pipeline) model: flows are chosen.
 */
export function triangle({ wind = 150, gasCap = 100, gasCost = 40, load = { W: 0, H: 0, D: 120 }, limit = 70, physics = true }) {
  const total = load.W + load.H + load.D;
  function solve(L) {
    const T = L.W + L.H + L.D;
    // Feasible wind range: 0 ≤ w ≤ wind, 0 ≤ g = T − w ≤ gasCap, and the W–D line within ±limit.
    let lo = Math.max(0, T - gasCap), hi = Math.min(wind, T);
    if (physics) {
      // F_WD = 2/3 (w − L.W) + 1/3 (g − L.H), with g = T − w: = w/3 + (T − L.H)/3 − 2 L.W/3
      const k = (T - L.H - 2 * L.W) / 3;
      hi = Math.min(hi, 3 * (limit - k));
      lo = Math.max(lo, 3 * (-limit - k));
    } else {
      // Transport: wind can route W→H→D freely, so only the direct line's capacity... and the
      // detour are both available; the W–D limit caps nothing that the detour can carry.
    }
    if (lo > hi + 1e-9) return null;
    const w = gasCost > 0 ? hi : lo, g = T - w;
    return { w, g, cost: g * gasCost };
  }
  const r = solve(load);
  if (!r) return null;
  const eps = 0.01, price = {};
  for (const b of ["W", "H", "D"]) {
    const s = solve({ ...load, [b]: load[b] + eps });
    price[b] = s ? (s.cost - r.cost) / eps : Infinity;
  }
  let flow;
  if (physics) {
    const iw = r.w - load.W, ih = r.g - load.H;
    flow = { WD: (2 * iw + ih) / 3, HD: (iw + 2 * ih) / 3, WH: (iw - ih) / 3 };
  } else {
    // Route wind direct up to the limit, the rest via Houston.
    const direct = Math.min(limit, Math.max(0, r.w - load.W));
    flow = { WD: direct, WH: r.w - load.W - direct, HD: r.w - load.W - direct + r.g - load.H };
  }
  const rent = flow.WD * (price.D - price.W) + flow.HD * (price.D - price.H) + flow.WH * (price.H - price.W);
  return { ...r, total, price, flow, rent };
}

// ---- M4: storage and materials ------------------------------------------------
/** A day of hourly prices, $/MWh: cheap at night, solar-depressed midday, an evening ramp. */
export const PRICES = [28, 26, 25, 24, 25, 28, 34, 38, 30, 22, 16, 12, 10, 11, 14, 22, 38, 62, 95, 120, 88, 55, 40, 32];
/**
 * One charge–discharge cycle a day: charge in the cheapest hours, discharge in the
 * dearest later ones, `mw` per hour for `hours` hours, round-trip efficiency `eff`.
 */
export function arbitrage(prices, mw, hours, eff) {
  // Every charging hour must come before every discharging hour, so try each split s:
  // charge in the cheapest `hours` hours before s, discharge in the dearest `hours` after.
  let best = null;
  for (let s = hours; s <= prices.length - hours; s++) {
    const before = prices.slice(0, s).map((p, h) => [p, h]).sort((a, b) => a[0] - b[0]).slice(0, hours);
    const after = prices.slice(s).map((p, h) => [p, h + s]).sort((a, b) => b[0] - a[0]).slice(0, hours);
    const buy = before.reduce((t, [p]) => t + p * mw, 0), sell = after.reduce((t, [p]) => t + p * mw * eff, 0);
    if (!best || sell - buy > best.profit) best = { cheap: before.map(([, h]) => h), dear: after.map(([, h]) => h), buy, sell, profit: sell - buy };
  }
  return best;
}

/**
 * Materials for a build plan, with the same coefficients as /materials/:
 * gw = { gas, solar, wind } nameplate, gwh = storage energy, lfp = LFP share.
 * Returns tonnes of each metal and tonnes of ore moved for it.
 */
export function materials({ gas = 0, solar = 0, wind = 0 }, gwh = 0, lfp = 0.6) {
  const t = { copper: 0, aluminum: 0, steel: 0, lithium: 0, nickel: 0 };
  const mw = { gas: gas * 1000, solar: solar * 1000, wind: wind * 1000 };
  for (const r of INTENSITY) {
    if (r.tech === "battery") t[r.material] += (r.qty * gwh * 1000) / 1000;
    else t[r.material] += (r.qty * mw[r.tech]) / 1000;
  }
  for (const m of ["lithium", "nickel"]) t[m] += (gwh * 1000 * (lfp * CHEMISTRY.LFP[m].qty + (1 - lfp) * CHEMISTRY.NMC[m].qty)) / 1000;
  const allMw = mw.gas + mw.solar + mw.wind;
  for (const r of GRID) t[r.material] += (r.qty * allMw) / 1000;
  const ore = Object.fromEntries(Object.keys(t).map((m) => [m, t[m] * ORE[ORE_OF[m]].tPerT]));
  return { metal: t, ore };
}
// ---- M5: one facility, two sizes -------------------------------------------------
/** Solar output shape, 0..1 by hour (sunrise ~6, sunset ~20, noon peak). */
export const solarShape = (h) => Math.max(0, Math.sin((Math.PI * (h - 6)) / 14));
/**
 * The city from Module 1 as a small local market, with a local fleet (MW, $/MWh):
 * grid solar follows the sun, wind is flat, then combined-cycle gas, then peakers,
 * then an emergency price when nothing is left. All illustrative.
 */
export function localFleet(h) {
  return [
    { name: "Solar", cap: 150 * solarShape(h), cost: 0 },
    { name: "Wind", cap: 120, cost: 0 },
    { name: "Gas combined cycle", cap: 600, cost: 35 },
    { name: "Gas peaker", cap: 400, cost: 90 },
    { name: "Emergency", cap: 1e6, cost: 500 },
  ];
}
/**
 * A day in the local market with and without a flat site load of `site` MW, of
 * which `onsite` MW of rooftop/yard solar (following the sun) is served on site.
 * Returns hourly prices both ways, the site's daily bill, and its solar energy.
 */
export function facilityDay({ site = 50, onsite = 0, city = {} } = {}) {
  const base = dayLoad(city).hours;
  const hours = base.map((x) => {
    const own = Math.min(site, onsite * solarShape(x.h));
    const without = dispatch(localFleet(x.h), x.total).price;
    const withSite = dispatch(localFleet(x.h), x.total + site - own).price;
    return { h: x.h, city: x.total, own, net: site - own, without, with: withSite };
  });
  const bill = hours.reduce((s, x) => s + x.net * x.with, 0);           // $ a day for grid purchases
  const cityBill = hours.reduce((s, x) => s + x.city * x.with, 0), cityBefore = hours.reduce((s, x) => s + x.city * x.without, 0);
  const solarMwh = hours.reduce((s, x) => s + x.own, 0);
  const avg = (k) => hours.reduce((s, x) => s + x[k] * (x.city + (k === "with" ? x.net : 0)), 0) / hours.reduce((s, x) => s + x.city + (k === "with" ? x.net : 0), 0);
  return { hours, bill, solarMwh, cityBill, cityBefore, avgWith: avg("with"), avgWithout: avg("without") };
}

/** Nameplate GW for an energy target, by capacity factor (the materials page's first multiplier). */
export const gwFor = (twh, tech) => (twh * 1000) / (8760 * CAPACITY_FACTOR[tech].value);
