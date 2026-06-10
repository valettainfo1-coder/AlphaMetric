import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { e1rm, epley, brzycki } from "@/lib/engine/e1rm";
import { EngineInputError } from "@/lib/engine/bmr";

describe("e1rm — table-driven", () => {
  it.each([
    // weight, reps, rpe, expected (Epley, effective reps = reps + 10 - rpe)
    [100, 1, 10, 100], // a single IS the 1RM
    [100, 1, 8, 100], // singles ignore RPE by spec
    [100, 5, 10, 116.7],
    [100, 5, 8, 123.3], // 2 RIR → 7 effective reps
    [80, 8, 8, 106.7], // 10 effective reps
    [60, 10, 10, 80],
  ])("%d kg × %d @ RPE %d → %d", (weight, reps, rpe, expected) => {
    expect(e1rm({ weightKg: weight, reps, rpe }).value).toBeCloseTo(expected, 1);
  });

  it("assumes RPE 8 when missing", () => {
    expect(e1rm({ weightKg: 100, reps: 5 }).value).toBe(
      e1rm({ weightKg: 100, reps: 5, rpe: 8 }).value,
    );
  });

  it("flags lowConfidence beyond 10 reps", () => {
    expect(e1rm({ weightKg: 60, reps: 11, rpe: 10 }).lowConfidence).toBe(true);
    expect(e1rm({ weightKg: 60, reps: 10, rpe: 10 }).lowConfidence).toBe(false);
  });

  it("supports Brzycki", () => {
    expect(e1rm({ weightKg: 100, reps: 5, rpe: 10, formula: "brzycki" }).value).toBeCloseTo(
      (100 * 36) / 32,
      1,
    );
  });

  it("throws typed errors on invalid input", () => {
    expect(() => e1rm({ weightKg: 0, reps: 5 })).toThrow(EngineInputError);
    expect(() => e1rm({ weightKg: 100, reps: 0 })).toThrow(EngineInputError);
    expect(() => e1rm({ weightKg: 100, reps: 5, rpe: 11 })).toThrow(EngineInputError);
  });
});

describe("e1rm — properties", () => {
  const weightArb = fc.double({ min: 1, max: 500, noNaN: true });
  const repsArb = fc.integer({ min: 1, max: 10 });
  const rpeArb = fc.integer({ min: 6, max: 10 });

  it("is monotonic in weight", () => {
    fc.assert(
      fc.property(weightArb, weightArb, repsArb, rpeArb, (w1, w2, reps, rpe) => {
        const [lo, hi] = w1 < w2 ? [w1, w2] : [w2, w1];
        return (
          e1rm({ weightKg: lo, reps, rpe }).value <= e1rm({ weightKg: hi, reps, rpe }).value
        );
      }),
    );
  });

  it("is monotonic in reps (same weight & RPE, reps ≥ 2)", () => {
    fc.assert(
      fc.property(
        weightArb,
        fc.integer({ min: 2, max: 9 }),
        rpeArb,
        (weight, reps, rpe) =>
          e1rm({ weightKg: weight, reps, rpe }).value <=
          e1rm({ weightKg: weight, reps: reps + 1, rpe }).value,
      ),
    );
  });

  it("reps = 1 ⇒ e1RM = weight exactly (to 0.1)", () => {
    fc.assert(
      fc.property(weightArb, rpeArb, (weight, rpe) => {
        const result = e1rm({ weightKg: weight, reps: 1, rpe });
        return Math.abs(result.value - weight) < 0.05 + 1e-9;
      }),
    );
  });

  it("reps > 10 ⇒ lowConfidence", () => {
    fc.assert(
      fc.property(weightArb, fc.integer({ min: 11, max: 30 }), rpeArb, (weight, reps, rpe) => {
        return e1rm({ weightKg: weight, reps, rpe }).lowConfidence === true;
      }),
    );
  });

  it("never returns less than the lifted weight", () => {
    fc.assert(
      fc.property(weightArb, repsArb, rpeArb, (weight, reps, rpe) => {
        return e1rm({ weightKg: weight, reps, rpe }).value >= weight - 0.05;
      }),
    );
  });

  it("raw formulas increase with reps", () => {
    fc.assert(
      fc.property(weightArb, fc.integer({ min: 1, max: 30 }), (w, r) => {
        return epley(w, r + 1) > epley(w, r) && brzycki(w, r + 1) > brzycki(w, r);
      }),
    );
  });
});
