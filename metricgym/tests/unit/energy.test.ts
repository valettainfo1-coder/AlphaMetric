import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ageFromBirthdate, bmr, katchMcArdle, mifflinStJeor, EngineInputError } from "@/lib/engine/bmr";
import { NEAT_MULTIPLIERS, sessionKcal, tdee } from "@/lib/engine/tdee";
import { calorieTarget } from "@/lib/engine/calorieTarget";
import type { ActivityLevel, Goal, Sex } from "@/lib/engine/types";

describe("bmr — table-driven", () => {
  it.each([
    ["male", 30, 180, 80, 1780] as const, // 800 + 1125 - 150 + 5
    ["female", 25, 165, 60, 1345.25] as const, // 600 + 1031.25 - 125 - 161
  ])("mifflin %s age %d %dcm %dkg → ~%d", (sex, age, h, w, expected) => {
    expect(mifflinStJeor(sex as Sex, age, h, w)).toBe(Math.round(expected));
  });

  it("katch-mcardle: 80 kg @ 15% → 370 + 21.6·68", () => {
    expect(katchMcArdle(80, 15)).toBe(Math.round(370 + 21.6 * 68));
  });

  it("prefers katch-mcardle when body fat known", () => {
    const withBf = bmr({ sex: "male", ageYears: 30, heightCm: 180, weightKg: 80, bodyFatPct: 15 });
    expect(withBf).toBe(katchMcArdle(80, 15));
  });

  it("throws typed errors on non-positive inputs", () => {
    expect(() => mifflinStJeor("male", 0, 180, 80)).toThrow(EngineInputError);
    expect(() => mifflinStJeor("male", 30, -1, 80)).toThrow(EngineInputError);
    expect(() => katchMcArdle(80, 0)).toThrow(EngineInputError);
    expect(() => ageFromBirthdate("not-a-date")).toThrow(EngineInputError);
  });
});

describe("tdee — no double counting", () => {
  it("training day = rest day + session kcal", () => {
    const result = tdee(1800, "sedentary", 80, 60, 4);
    expect(result.restDay).toBe(Math.round(1800 * 1.2));
    expect(result.trainingDay).toBe(result.restDay + sessionKcal(80, 60));
  });

  it("NEAT multipliers stay within the 1.2-1.55 non-exercise window", () => {
    for (const m of Object.values(NEAT_MULTIPLIERS)) {
      expect(m).toBeGreaterThanOrEqual(1.2);
      expect(m).toBeLessThanOrEqual(1.55);
    }
  });

  it("TDEE(training day) > TDEE(rest day) — property", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 3000, noNaN: true }),
        fc.constantFrom<ActivityLevel>("sedentary", "light", "moderate", "active", "very_active"),
        fc.double({ min: 40, max: 200, noNaN: true }),
        fc.constantFrom(30, 45, 60, 75, 90),
        fc.integer({ min: 2, max: 6 }),
        (bmrKcal, activity, weight, len, days) => {
          const r = tdee(bmrKcal, activity, weight, len, days);
          return r.trainingDay > r.restDay && r.weeklyAvg >= r.restDay && r.weeklyAvg <= r.trainingDay;
        },
      ),
    );
  });
});

describe("calorieTarget — safety floors", () => {
  const goals: Goal[] = ["muscle_gain", "fat_loss", "recomp", "strength", "general_fitness"];

  it("fat loss for a small female clamps to the hard floor and flags it", () => {
    const bmrKcal = 1300;
    const result = calorieTarget({
      sex: "female",
      goal: "fat_loss",
      bmrKcal,
      tdee: tdee(bmrKcal, "sedentary", 50, 45, 3),
      weightKg: 50,
      heightCm: 158,
    });
    expect(result.restDay.kcal).toBeGreaterThanOrEqual(1400);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("property: target ≥ BMR and ≥ hard floor, always", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Sex>("male", "female"),
        fc.constantFrom(...goals),
        fc.double({ min: 800, max: 2600, noNaN: true }),
        fc.double({ min: 40, max: 180, noNaN: true }),
        fc.double({ min: 140, max: 210, noNaN: true }),
        fc.constantFrom<ActivityLevel>("sedentary", "light", "moderate", "active", "very_active"),
        (sex, goal, bmrKcal, weight, height, activity) => {
          const r = calorieTarget({
            sex,
            goal,
            bmrKcal,
            tdee: tdee(bmrKcal, activity, weight, 60, 3),
            weightKg: weight,
            heightCm: height,
          });
          const floor = sex === "female" ? 1400 : 1600;
          return (
            r.trainingDay.kcal >= Math.min(bmrKcal, r.trainingDay.kcal) &&
            r.trainingDay.kcal >= floor - 0.5 &&
            r.restDay.kcal >= floor - 0.5 &&
            r.restDay.kcal >= bmrKcal - 0.5 &&
            r.trainingDay.kcal >= bmrKcal - 0.5
          );
        },
      ),
    );
  });

  it("protein uses FFM when body fat is known", () => {
    const bmrKcal = 1800;
    const r = calorieTarget({
      sex: "male",
      goal: "muscle_gain",
      bmrKcal,
      tdee: tdee(bmrKcal, "light", 80, 60, 4),
      weightKg: 80,
      heightCm: 180,
      bodyFatPct: 20,
    });
    expect(r.trainingDay.proteinG).toBe(Math.round(2.2 * 80 * 0.8));
  });

  it("protein reference weight is capped at BMI-25 equivalent for high BMI", () => {
    const bmrKcal = 2200;
    const r = calorieTarget({
      sex: "male",
      goal: "fat_loss",
      bmrKcal,
      tdee: tdee(bmrKcal, "light", 140, 60, 3),
      weightKg: 140,
      heightCm: 175,
    });
    const bmi25Weight = 25 * 1.75 * 1.75;
    expect(r.trainingDay.proteinG).toBe(Math.round(1.8 * bmi25Weight));
  });

  it("macros are internally consistent (kcal ≈ 4P + 9F + 4C, carbs ≥ 0)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...goals),
        fc.double({ min: 1200, max: 2400, noNaN: true }),
        fc.double({ min: 45, max: 150, noNaN: true }),
        (goal, bmrKcal, weight) => {
          const r = calorieTarget({
            sex: "male",
            goal,
            bmrKcal,
            tdee: tdee(bmrKcal, "moderate", weight, 60, 4),
            weightKg: weight,
            heightCm: 178,
          });
          for (const day of [r.trainingDay, r.restDay]) {
            const fromMacros = day.proteinG * 4 + day.fatG * 9 + day.carbsG * 4;
            if (day.carbsG < 0) return false;
            // carbs absorb the remainder; only positive-remainder days must match
            if (day.carbsG > 0 && Math.abs(fromMacros - day.kcal) > 4) return false;
          }
          return true;
        },
      ),
    );
  });
});
