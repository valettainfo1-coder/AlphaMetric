import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { kgToLbs, lbsToKg, roundToPlate } from "@/lib/engine/units";

describe("units", () => {
  it.each([
    [100, 220.5],
    [82.5, 181.9],
    [60, 132.3],
  ])("%d kg → %d lbs", (kg, lbs) => {
    expect(kgToLbs(kg)).toBeCloseTo(lbs, 1);
  });

  it("round-trip kg → lbs → kg stays within 0.1", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 500, noNaN: true }), (raw) => {
        const kg = Math.round(raw * 10) / 10;
        return Math.abs(lbsToKg(kgToLbs(kg)) - kg) <= 0.1 + 1e-9;
      }),
    );
  });

  it("round-trip lbs → kg → lbs stays within 0.1", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1100, noNaN: true }), (raw) => {
        const lbs = Math.round(raw * 10) / 10;
        return Math.abs(kgToLbs(lbsToKg(lbs)) - lbs) <= 0.1 + 1e-9;
      }),
    );
  });

  it("plate rounding snaps to 2.5 kg / 5 lbs", () => {
    expect(roundToPlate(81.2, "kg")).toBe(80);
    expect(roundToPlate(81.3, "kg")).toBe(82.5);
    expect(roundToPlate(182, "lbs")).toBe(180);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 500, noNaN: true }), (w) => {
        return (
          roundToPlate(w, "kg") % 2.5 === 0 &&
          roundToPlate(w, "lbs") % 5 === 0 &&
          Math.abs(roundToPlate(w, "kg") - w) <= 1.25 + 1e-9
        );
      }),
    );
  });
});
