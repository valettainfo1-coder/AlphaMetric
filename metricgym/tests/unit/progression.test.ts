import { describe, expect, it } from "vitest";
import { INCREMENT_KG, progressExercise, restSeconds } from "@/lib/engine/progression";

const base = {
  repMin: 5,
  repMax: 8,
  consecutiveMisses: 0,
  inScheduledDeload: false,
};

describe("progression — double progression", () => {
  it("increments load at top of range @ RPE ≤ 8", () => {
    const r = progressExercise({
      ...base,
      incrementClass: "barbell_lower",
      lastSession: [
        { weightKg: 100, reps: 8, rpe: 8 },
        { weightKg: 100, reps: 8, rpe: 7 },
        { weightKg: 100, reps: 8, rpe: 8 },
      ],
    });
    expect(r.action).toBe("increment");
    expect(r.nextWeightKg).toBe(100 + INCREMENT_KG.barbell_lower);
  });

  it("holds load and chases reps inside the range", () => {
    const r = progressExercise({
      ...base,
      incrementClass: "barbell_upper",
      lastSession: [{ weightKg: 80, reps: 6, rpe: 8 }],
    });
    expect(r.action).toBe("add_rep");
    expect(r.nextWeightKg).toBe(80);
  });

  it("does NOT increment at top of range when RPE > 8", () => {
    const r = progressExercise({
      ...base,
      incrementClass: "barbell_upper",
      lastSession: [{ weightKg: 80, reps: 8, rpe: 9.5 }],
    });
    expect(r.action).not.toBe("increment");
  });

  it("reactive deload after 2 consecutive missed sessions: −10%", () => {
    const firstMiss = progressExercise({
      ...base,
      incrementClass: "barbell_lower",
      lastSession: [{ weightKg: 100, reps: 4, rpe: 10 }],
    });
    expect(firstMiss.action).toBe("hold");
    expect(firstMiss.consecutiveMisses).toBe(1);

    const secondMiss = progressExercise({
      ...base,
      incrementClass: "barbell_lower",
      consecutiveMisses: firstMiss.consecutiveMisses,
      lastSession: [{ weightKg: 100, reps: 4, rpe: 10 }],
    });
    expect(secondMiss.action).toBe("reactive_deload");
    expect(secondMiss.nextWeightKg).toBe(90);
    expect(secondMiss.consecutiveMisses).toBe(0);
  });

  it("scheduled deload suppresses reactive deload AND resets the counter", () => {
    const r = progressExercise({
      ...base,
      incrementClass: "barbell_lower",
      consecutiveMisses: 1,
      inScheduledDeload: true,
      lastSession: [{ weightKg: 100, reps: 3, rpe: 10 }],
    });
    expect(r.action).toBe("hold");
    expect(r.consecutiveMisses).toBe(0); // no double deload after the week
  });

  it("isolation progresses reps before load", () => {
    const r = progressExercise({
      ...base,
      repMin: 10,
      repMax: 15,
      incrementClass: "isolation",
      lastSession: [{ weightKg: 20, reps: 15, rpe: 8 }],
    });
    expect(r.action).toBe("add_rep");
    expect(r.nextWeightKg).toBe(20);
  });

  it("isolation increments load once rep headroom is exhausted", () => {
    const r = progressExercise({
      ...base,
      repMin: 10,
      repMax: 15,
      incrementClass: "isolation",
      lastSession: [{ weightKg: 20, reps: 17, rpe: 8 }],
    });
    expect(r.action).toBe("increment");
    expect(r.nextWeightKg).toBe(20 + INCREMENT_KG.isolation);
  });

  it("increment table matches the spec", () => {
    expect(INCREMENT_KG.barbell_lower).toBeGreaterThanOrEqual(2.5);
    expect(INCREMENT_KG.barbell_lower).toBeLessThanOrEqual(5);
    expect(INCREMENT_KG.barbell_upper).toBe(2.5);
    expect(INCREMENT_KG.dumbbell).toBe(2);
    expect(INCREMENT_KG.machine).toBe(5);
  });

  it("rest: compounds 150-180s, isolation 60-90s", () => {
    expect(restSeconds(true)).toBeGreaterThanOrEqual(150);
    expect(restSeconds(true)).toBeLessThanOrEqual(180);
    expect(restSeconds(false)).toBeGreaterThanOrEqual(60);
    expect(restSeconds(false)).toBeLessThanOrEqual(90);
  });
});
