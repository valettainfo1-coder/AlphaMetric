/**
 * Strength forecast — NOT linear regression.
 *
 * Strength gains saturate, so we fit y = a − b·e^(−c·t) (monotone
 * saturating toward asymptote a). For a fixed c the model is linear in
 * (a, b), so we solve the small least-squares system in closed form and
 * grid-search c. With < 8 data points the curve is under-determined and
 * we fall back to damped linear: the fitted slope decays 15% per
 * projected month.
 *
 * Confidence band: residual standard deviation around the fit, widening
 * with the projection horizon.
 *
 * Sanity clamp: never project more than +15% over 12 weeks (intermediate+
 * lifters do not gain faster than that; beginners just beat the forecast).
 */
import type { E1RMPoint, ForecastPoint, ForecastResult } from "./types";

const MAX_GAIN_12W = 0.15;
const HORIZONS: ReadonlyArray<4 | 8 | 12> = [4, 8, 12];

interface SaturatingFit {
  a: number;
  b: number;
  c: number;
  residualStd: number;
}

/** For fixed c, y = a − b·x with x = e^(−c·t) is ordinary least squares. */
function fitForC(points: E1RMPoint[], c: number): SaturatingFit | null {
  const n = points.length;
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (const p of points) {
    const x = Math.exp(-c * p.t);
    sx += x;
    sy += p.value;
    sxx += x * x;
    sxy += x * p.value;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (n * sxy - sx * sy) / denom; // slope = −b
  const intercept = (sy - slope * sx) / n; // intercept = a
  const a = intercept;
  const b = -slope;
  if (b < 0 || a <= 0) return null; // must be increasing & positive

  let ss = 0;
  for (const p of points) {
    const yHat = a - b * Math.exp(-c * p.t);
    ss += (p.value - yHat) ** 2;
  }
  return { a, b, c, residualStd: Math.sqrt(ss / Math.max(1, n - 2)) };
}

function fitSaturating(points: E1RMPoint[]): SaturatingFit | null {
  // c grid: time constants from ~2 weeks to ~1 year.
  let best: SaturatingFit | null = null;
  for (const c of [0.003, 0.005, 0.01, 0.02, 0.04, 0.07]) {
    const fit = fitForC(points, c);
    if (fit && (best === null || fit.residualStd < best.residualStd)) best = fit;
  }
  return best;
}

interface LinearFit {
  intercept: number;
  slopePerDay: number;
  residualStd: number;
}

function fitLinear(points: E1RMPoint[]): LinearFit {
  const n = points.length;
  let st = 0,
    sy = 0,
    stt = 0,
    sty = 0;
  for (const p of points) {
    st += p.t;
    sy += p.value;
    stt += p.t * p.t;
    sty += p.t * p.value;
  }
  const denom = n * stt - st * st;
  const slope = denom === 0 ? 0 : (n * sty - st * sy) / denom;
  const intercept = n === 0 ? 0 : (sy - slope * st) / n;
  let ss = 0;
  for (const p of points) {
    ss += (p.value - (intercept + slope * p.t)) ** 2;
  }
  return {
    intercept,
    slopePerDay: slope,
    residualStd: Math.sqrt(ss / Math.max(1, n - 2)),
  };
}

/** Damped linear projection: slope decays 15% per projected month. */
function dampedLinearValue(fit: LinearFit, lastT: number, daysAhead: number): number {
  const decayPerMonth = 0.85;
  let value = fit.intercept + fit.slopePerDay * lastT;
  let remaining = daysAhead;
  let slope = fit.slopePerDay;
  while (remaining > 0) {
    const chunk = Math.min(30, remaining);
    value += slope * chunk;
    slope *= decayPerMonth;
    remaining -= chunk;
  }
  return value;
}

/** Trailing-window plateau: ~zero slope across the last 6 sessions. */
export function detectPlateau(points: E1RMPoint[]): boolean {
  if (points.length < 6) return false;
  const tail = points.slice(-6);
  const fit = fitLinear(tail);
  const first = tail[0];
  const last = tail[tail.length - 1];
  if (!first || !last) return false;
  const span = Math.max(1, last.t - first.t);
  const totalChange = fit.slopePerDay * span;
  const mean = tail.reduce((s, p) => s + p.value, 0) / tail.length;
  // Less than 1% movement across 6 sessions counts as flat.
  return Math.abs(totalChange) < mean * 0.01;
}

export function forecast(points: E1RMPoint[]): ForecastResult | null {
  if (points.length < 3) return null;
  const sorted = [...points].sort((x, y) => x.t - y.t);
  const last = sorted[sorted.length - 1];
  if (!last) return null;

  const useSaturating = sorted.length >= 8;
  const satFit = useSaturating ? fitSaturating(sorted) : null;
  const linFit = satFit === null ? fitLinear(sorted) : null;

  const current = last.value;
  const maxAllowed = current * (1 + MAX_GAIN_12W);

  const resultPoints: ForecastPoint[] = HORIZONS.map((weeksAhead) => {
    const daysAhead = weeksAhead * 7;
    let value: number;
    let residualStd: number;
    if (satFit) {
      value = satFit.a - satFit.b * Math.exp(-satFit.c * (last.t + daysAhead));
      residualStd = satFit.residualStd;
    } else if (linFit) {
      value = dampedLinearValue(linFit, last.t, daysAhead);
      residualStd = linFit.residualStd;
    } else {
      value = current;
      residualStd = 0;
    }
    // Never regress below current in the projection, never exceed the clamp.
    value = Math.min(Math.max(value, current), maxAllowed);
    const band = residualStd * (1 + weeksAhead / 12);
    return {
      weeksAhead,
      value: round1(value),
      low: round1(Math.max(0, value - band)),
      high: round1(Math.min(maxAllowed, value + band)),
    };
  });

  return {
    points: resultPoints,
    model: satFit ? "saturating" : "damped_linear",
    plateau: detectPlateau(sorted),
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
