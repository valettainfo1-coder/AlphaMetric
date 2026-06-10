/**
 * Demo-mode seed: 10 weeks of training history from a FIXED RNG seed.
 * Deterministic by design — stable snapshots, reproducible investor demos.
 * Dates are anchored to "now" so the dashboard always looks live.
 */
import type { AssessmentInput } from "@/lib/engine/types";
import { computeProfile, ASSESSMENT_SCHEMA_VERSION } from "@/lib/engine/profile";
import { readiness } from "@/lib/engine/readiness";
import { EXERCISES } from "./exercises";
import { FOODS } from "./foods";
import { uuidv7FromBytes } from "@/lib/uuid";
import type { LocalRepository } from "./local-repository";
import { DEMO_USER_ID } from "./index";
import type { WorkoutSetRow } from "./types";

/** mulberry32 — small deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RNG_SEED = 0x4d475947; // "MGYG"

export const DEMO_ASSESSMENT: AssessmentInput = {
  sex: "male",
  birthdate: "1997-04-12",
  heightCm: 181,
  weightKg: 82.4,
  bodyFatPct: 17,
  goal: "muscle_gain",
  motivation: "Mehr Kraft, sichtbarer Aufbau, endlich strukturiert trainieren.",
  experience: "intermediate",
  daysPerWeek: 4,
  sessionLengthMin: 60,
  environment: "gym",
  equipment: ["barbell", "dumbbell", "machine", "cable", "bench", "pullup_bar"],
  injuries: [],
  lovedPatterns: ["squat", "horizontal_push"],
  avoidedPatterns: [],
  anchors: [
    { lift: "squat", weightKg: 110, reps: 5 },
    { lift: "bench", weightKg: 85, reps: 5 },
    { lift: "deadlift", weightKg: 140, reps: 5 },
    { lift: "ohp", weightKg: 50, reps: 5 },
  ],
  activityLevel: "light",
  avgSleepH: 7,
  stress: 2,
  dietStyle: "omnivore",
  mealsPerDay: 4,
  units: "kg",
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function seedDemoData(repo: LocalRepository): Promise<void> {
  const rng = mulberry32(RNG_SEED);
  const randBytes = (): Uint8Array => {
    const b = new Uint8Array(10);
    for (let i = 0; i < 10; i++) b[i] = Math.floor(rng() * 256);
    return b;
  };
  const id = (ts: number): string => uuidv7FromBytes(ts, randBytes());

  const now = new Date();
  const dayMs = 86_400_000;
  const start = new Date(now.getTime() - 9.5 * 7 * dayMs); // ~10 weeks back
  const profile = computeProfile(DEMO_ASSESSMENT, EXERCISES, now);

  await repo.upsertProfile({
    id: DEMO_USER_ID,
    display_name: "Demo Athlet",
    units: "kg",
    locale: "de",
    created_at: start.toISOString(),
    updated_at: start.toISOString(),
  });

  await repo.saveAssessment({
    id: id(start.getTime()),
    user_id: DEMO_USER_ID,
    schema_version: ASSESSMENT_SCHEMA_VERSION,
    raw_input: DEMO_ASSESSMENT,
    computed_output: profile,
    created_at: start.toISOString(),
    updated_at: start.toISOString(),
  });

  const planId = id(start.getTime() + 1);
  await repo.savePlan({
    id: planId,
    user_id: DEMO_USER_ID,
    mesocycle: profile.plan,
    started_at: start.toISOString(),
    active: true,
    updated_at: start.toISOString(),
  });

  // -- 10 weeks of workouts following the plan ---------------------------
  // Per-exercise progression base: anchors → ~75% e1RM, others by class.
  const baseWeight = new Map<string, number>([
    ["back-squat", 92.5],
    ["bench-press", 72.5],
    ["deadlift", 120],
    ["ohp", 42.5],
  ]);
  if (!profile.plan.weeks[0]) return;

  for (let week = 0; week < 10; week++) {
    const mesoWeek = profile.plan.weeks[week % 4];
    if (!mesoWeek) continue;
    for (const day of mesoWeek.days) {
      // Skip ~8% of sessions for realistic adherence.
      if (rng() < 0.08) continue;
      const workoutDate = new Date(
        start.getTime() + week * 7 * dayMs + day.dayIndex * 1.5 * dayMs + 18 * 3600_000,
      );
      if (workoutDate > now) continue;
      const workoutId = id(workoutDate.getTime());
      const sets: WorkoutSetRow[] = [];
      let setIndex = 0;
      for (const pe of day.exercises) {
        const base = baseWeight.get(pe.exerciseId) ?? 20 + Math.floor(rng() * 8) * 2.5;
        if (!baseWeight.has(pe.exerciseId)) baseWeight.set(pe.exerciseId, base);
        // Saturating progression + deload dip + noise.
        const progress = 1 + 0.09 * (1 - Math.exp(-week / 4));
        const deloadFactor = mesoWeek.isDeload ? 0.9 : 1;
        const weight =
          Math.round(((base * progress * deloadFactor) / 2.5) * (1 + (rng() - 0.5) * 0.02)) * 2.5;
        for (let s = 0; s < pe.sets; s++) {
          const reps = Math.max(
            pe.repMin,
            Math.min(pe.repMax, pe.repMin + Math.floor(rng() * (pe.repMax - pe.repMin + 1))),
          );
          const completedAt = new Date(workoutDate.getTime() + setIndex * 3 * 60_000);
          sets.push({
            id: id(completedAt.getTime()),
            user_id: DEMO_USER_ID,
            workout_id: workoutId,
            exercise_id: pe.exerciseId,
            set_index: setIndex++,
            weight_kg: weight,
            reps,
            rpe: 7 + Math.floor(rng() * 3),
            is_warmup: false,
            completed_at: completedAt.toISOString(),
            updated_at: completedAt.toISOString(),
          });
        }
      }
      const completedAt = new Date(workoutDate.getTime() + 62 * 60_000);
      await repo.upsertWorkout({
        id: workoutId,
        user_id: DEMO_USER_ID,
        plan_id: planId,
        week_index: week,
        day_index: day.dayIndex,
        label: day.label,
        started_at: workoutDate.toISOString(),
        completed_at: completedAt > now ? null : completedAt.toISOString(),
        updated_at: workoutDate.toISOString(),
      });
      for (const s of sets) await repo.upsertSet(s);
    }
  }

  // -- daily check-ins (weight trends slowly up: lean bulk) ---------------
  for (let d = 66; d >= 0; d--) {
    const date = new Date(now.getTime() - d * dayMs);
    if (rng() < 0.15) continue; // some skipped days
    const weight = 81.2 + (66 - d) * 0.018 + (rng() - 0.5) * 0.6;
    const sleep = 2 + Math.floor(rng() * 4);
    const soreness = 1 + Math.floor(rng() * 4);
    const stress = 1 + Math.floor(rng() * 3);
    await repo.upsertCheckin({
      id: id(date.getTime()),
      user_id: DEMO_USER_ID,
      date: isoDate(date),
      weight_kg: Math.round(weight * 10) / 10,
      sleep_quality: sleep,
      soreness,
      stress,
      updated_at: date.toISOString(),
    });
    if (d <= 30) {
      const r = readiness({
        sleepQuality: sleep,
        soreness,
        stress,
        acwr: 0.9 + rng() * 0.4,
        daysSinceRest: 1 + Math.floor(rng() * 3),
      });
      await repo.upsertReadiness({
        id: id(date.getTime() + 1),
        user_id: DEMO_USER_ID,
        date: isoDate(date),
        score: r.score,
        tier: r.tier,
        calibrating: false,
        updated_at: date.toISOString(),
      });
    }
  }

  // -- meals: last 14 days -----------------------------------------------
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now.getTime() - d * dayMs);
    const mealsToday = 3 + Math.floor(rng() * 2);
    for (let m = 0; m < mealsToday; m++) {
      const item = FOODS[Math.floor(rng() * FOODS.length)];
      if (!item) continue;
      const eatenAt = new Date(date.getTime() - (18 - m * 4) * 3600_000);
      if (eatenAt > now) continue;
      await repo.upsertMeal({
        id: id(eatenAt.getTime()),
        user_id: DEMO_USER_ID,
        eaten_at: eatenAt.toISOString(),
        name: item.nameDe,
        kcal: item.kcal,
        protein_g: item.proteinG,
        carbs_g: item.carbsG,
        fat_g: item.fatG,
        updated_at: eatenAt.toISOString(),
      });
    }
  }

  // -- consents: medical disclaimer accepted during onboarding ------------
  await repo.upsertConsent({
    id: id(start.getTime() + 2),
    user_id: DEMO_USER_ID,
    kind: "medical_disclaimer",
    granted: true,
    granted_at: start.toISOString(),
    updated_at: start.toISOString(),
  });
}
