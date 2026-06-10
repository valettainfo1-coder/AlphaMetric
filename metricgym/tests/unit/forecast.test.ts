import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { detectPlateau, forecast } from "@/lib/engine/forecast";
import type { E1RMPoint } from "@/lib/engine/types";

function series(values: number[], stepDays = 7): E1RMPoint[] {
  return values.map((value, i) => ({ t: i * stepDays, value }));
}

describe("forecast", () => {
  it("returns null with < 3 points", () => {
    expect(forecast(series([100, 102]))).toBeNull();
  });

  it("uses damped linear with < 8 points", () => {
    const result = forecast(series([100, 102, 104, 106]));
    expect(result?.model).toBe("damped_linear");
  });

  it("uses the saturating model with ≥ 8 points", () => {
    const values = Array.from({ length: 12 }, (_, i) => 100 + 20 * (1 - Math.exp(-0.04 * i * 7)));
    const result = forecast(series(values));
    expect(result?.model).toBe("saturating");
  });

  it("saturating fit converges toward the asymptote, not past it", () => {
    // True curve: a=130, b=30, c≈0.02/day → asymptote 130.
    const values = Array.from({ length: 16 }, (_, i) => 130 - 30 * Math.exp(-0.02 * i * 7));
    const result = forecast(series(values));
    expect(result).not.toBeNull();
    const p12 = result?.points.find((p) => p.weeksAhead === 12);
    expect(p12 && p12.value).toBeLessThanOrEqual(132);
  });

  it("never projects more than +15% over 12 weeks (sanity clamp)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 40, max: 250, noNaN: true }), { minLength: 3, maxLength: 30 }),
        (values) => {
          const result = forecast(series(values));
          if (!result) return true;
          const lastValue = values[values.length - 1];
          if (lastValue === undefined) return true;
          return result.points.every(
            (p) => p.value <= lastValue * 1.15 + 0.11 && p.high <= lastValue * 1.15 + 0.11,
          );
        },
      ),
    );
  });

  it("forecast is monotone non-decreasing across horizons", () => {
    const result = forecast(series([100, 103, 105, 108, 110, 111, 113, 114, 116]));
    expect(result).not.toBeNull();
    const [p4, p8, p12] = result?.points ?? [];
    expect(p4 && p8 && p12 && p4.value <= p8.value && p8.value <= p12.value).toBe(true);
  });

  it("band: low ≤ value ≤ high", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 40, max: 250, noNaN: true }), { minLength: 3, maxLength: 25 }),
        (values) => {
          const result = forecast(series(values));
          if (!result) return true;
          return result.points.every((p) => p.low <= p.value && p.value <= p.high);
        },
      ),
    );
  });

  it("detects a plateau on flat trailing data", () => {
    expect(detectPlateau(series([100, 105, 110, 112, 112.2, 112.1, 112.3, 112.2, 112.1, 112.2]))).toBe(true);
    expect(detectPlateau(series([100, 104, 108, 112, 116, 120, 124, 128]))).toBe(false);
    expect(detectPlateau(series([100, 100, 100]))).toBe(false); // < 6 points
  });
});
