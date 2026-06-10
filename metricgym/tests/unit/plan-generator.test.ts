/**
 * Plan-generator invariants across a generated matrix of
 * days × equipment × injuries × preferences (50 cases).
 */
import { describe, expect, it } from "vitest";
import {
  CORE_MUSCLES,
  generatePlan,
  VOLUME_BANDS,
  weeklyMuscleFrequency,
  weeklyMuscleVolume,
  type PlanInput,
} from "@/lib/engine/planGenerator";
import { EXERCISES, EXERCISE_BY_ID } from "@/lib/data/exercises";
import type { Equipment, ExperienceLevel, InjuryFlag, MovementPattern } from "@/lib/engine/types";

const DAYS = [2, 3, 4, 5, 6] as const;
const LENGTHS = [30, 45, 60, 75, 90] as const;
const EXPERIENCES: ExperienceLevel[] = ["beginner", "novice", "intermediate", "advanced"];
const EQUIPMENT_SETS: Equipment[][] = [
  ["barbell", "dumbbell", "machine", "cable", "bench", "pullup_bar"], // commercial gym
  ["barbell", "dumbbell", "bench", "pullup_bar"], // homegym
  ["dumbbell", "bands", "bench"], // minimal
  ["bodyweight", "pullup_bar"], // bodyweight
  ["machine", "cable"], // machines only
];
const INJURY_SETS: InjuryFlag[][] = [[], ["lower_back"], ["knees"], ["shoulders"], ["lower_back", "knees"]];
const AVOID_SETS: MovementPattern[][] = [[], ["squat"], ["hinge"], ["vertical_push"], ["lunge"]];

// Deterministic 50-case matrix: cycle through each dimension.
const CASES: PlanInput[] = Array.from({ length: 50 }, (_, i) => ({
  experience: EXPERIENCES[i % EXPERIENCES.length] as ExperienceLevel,
  daysPerWeek: DAYS[i % DAYS.length] as PlanInput["daysPerWeek"],
  sessionLengthMin: LENGTHS[(i * 3) % LENGTHS.length] as PlanInput["sessionLengthMin"],
  equipment: EQUIPMENT_SETS[(i * 7) % EQUIPMENT_SETS.length] as Equipment[],
  injuries: INJURY_SETS[(i * 11) % INJURY_SETS.length] as InjuryFlag[],
  lovedPatterns: i % 4 === 0 ? (["squat"] as MovementPattern[]) : [],
  avoidedPatterns: AVOID_SETS[(i * 13) % AVOID_SETS.length] as MovementPattern[],
  anchors: i % 5 === 0 ? [{ lift: "squat" as const, weightKg: 100, reps: 5 }] : [],
}));

describe("plan generator — invariants over 50-case matrix", () => {
  it.each(CASES.map((c, i) => [i, c] as const))("case %d satisfies all invariants", (_, input) => {
    const plan = generatePlan(input, EXERCISES);
    const week1 = plan.weeks[0];
    const week4 = plan.weeks[3];
    expect(week1).toBeDefined();
    expect(week4).toBeDefined();
    if (!week1 || !week4) return;

    // Structure: 4-week wave, correct day count, week 4 flagged deload.
    expect(plan.weeks).toHaveLength(4);
    expect(week1.days).toHaveLength(input.daysPerWeek);
    expect(week4.isDeload).toBe(true);

    for (const week of plan.weeks) {
      for (const day of week.days) {
        expect(day.exercises.length).toBeGreaterThan(0);
        for (const pe of day.exercises) {
          const def = EXERCISE_BY_ID.get(pe.exerciseId);
          expect(def, `unknown exercise ${pe.exerciseId}`).toBeDefined();
          if (!def) continue;

          // 1. No contraindicated exercise present.
          for (const injury of input.injuries) {
            expect(def.contraindications).not.toContain(injury);
          }
          // Equipment respected (bodyweight always available).
          const available = new Set([...input.equipment, "bodyweight"]);
          expect(def.equipment.some((eq) => available.has(eq))).toBe(true);
        }

        // 4. Estimated session time ≤ chosen session length + 10%.
        expect(day.estimatedMinutes).toBeLessThanOrEqual(input.sessionLengthMin * 1.1);
      }
    }

    // 2. Every trained muscle ≥ 2×/week frequency (best-effort once the
    //    time budget forced trimming — then the flag must be set).
    const freq = weeklyMuscleFrequency(week1.days, EXERCISE_BY_ID);
    const volume = weeklyMuscleVolume(week1.days, EXERCISE_BY_ID);
    if (!plan.volumeConstrainedByTime) {
      for (const [muscle, sets] of volume) {
        if (sets >= 2) {
          expect(
            freq.get(muscle) ?? 0,
            `${muscle} trained ${sets} sets but only ${freq.get(muscle)}×/week`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }

    // 3. Weekly sets within the experience band (max is unconditional;
    //    min only when the time budget did not force trimming).
    const band = VOLUME_BANDS[input.experience];
    for (const [muscle, sets] of volume) {
      expect(sets, `${muscle} over band max`).toBeLessThanOrEqual(band.max + 0.5);
    }
    if (!plan.volumeConstrainedByTime) {
      for (const muscle of CORE_MUSCLES) {
        expect(
          volume.get(muscle) ?? 0,
          `${muscle} below band min without time-constraint flag`,
        ).toBeGreaterThanOrEqual(band.min);
      }
    }

    // 5. Week 4 volume ≈ −40%.
    const normalSets = week1.days.reduce(
      (s, d) => s + d.exercises.reduce((x, e) => x + e.sets, 0),
      0,
    );
    const deloadSets = week4.days.reduce(
      (s, d) => s + d.exercises.reduce((x, e) => x + e.sets, 0),
      0,
    );
    expect(deloadSets / normalSets).toBeGreaterThanOrEqual(0.4);
    expect(deloadSets / normalSets).toBeLessThanOrEqual(0.75);

    // Warm-up ramp exists on the first compound of each day.
    for (const day of week1.days) {
      const firstCompound = day.exercises.find(
        (pe) => EXERCISE_BY_ID.get(pe.exerciseId)?.isCompound,
      );
      if (firstCompound) {
        expect(firstCompound.warmup.length).toBe(3);
      }
    }

    // Medical note set iff injuries declared.
    expect(plan.medicalNote).toBe(input.injuries.length > 0);
  });

  it("the strict (unconstrained) path is actually exercised by the matrix", () => {
    const unconstrained = CASES.filter((c) => !generatePlan(c, EXERCISES).volumeConstrainedByTime);
    expect(unconstrained.length).toBeGreaterThanOrEqual(10);
  });

  it("library sanity: 60+ exercises, unique stable ids", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it("anchors produce non-zero warm-up weights on the matching lift", () => {
    const input = CASES[0];
    expect(input).toBeDefined();
    if (!input) return;
    const plan = generatePlan(
      { ...input, daysPerWeek: 3, equipment: ["barbell", "bench"], injuries: [], avoidedPatterns: [], anchors: [{ lift: "squat", weightKg: 100, reps: 5 }] },
      EXERCISES,
    );
    const week = plan.weeks[0];
    const squatDay = week?.days.find((d) =>
      d.exercises.some((e) => e.exerciseId === "back-squat" && e.warmup.length > 0),
    );
    if (squatDay) {
      const squat = squatDay.exercises.find((e) => e.exerciseId === "back-squat");
      expect(squat?.warmup.every((w) => w.weightKg > 0)).toBe(true);
    }
  });
});
