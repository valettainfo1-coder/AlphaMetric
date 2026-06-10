/**
 * Quiz → 4-week mesocycle.
 *
 * The exercise library is injected (dependency inversion) so this module
 * stays pure and React-Native-liftable; the app passes lib/data/exercises.
 *
 * Split by training days:
 *   2 → Full Body ×2
 *   3 → Full Body ×3 (NOT 3-day PPL: it would break the ≥2×/week
 *       frequency guarantee for every trained muscle)
 *   4 → Upper/Lower ×2
 *   5 → PPL + Upper/Lower
 *   6 → PPL ×2
 *
 * Volume bands (hard sets / muscle / week, secondary counts 0.5):
 *   beginner 8-12 · novice 10-14 · intermediate 12-16 · advanced 14-20
 *
 * Time budget: estimated session time = 10 min warm-up overhead +
 * Σ sets × (40 s set + rest). Accessory volume is trimmed until the
 * session fits sessionLengthMin. When trimming pushes core muscles
 * below the band minimum, the plan is flagged volumeConstrainedByTime
 * instead of silently violating the band.
 *
 * Week 4 = planned deload: −40% volume (sets), −10% load (applied by
 * the player via the isDeload flag).
 */
import type {
  Equipment,
  ExerciseDef,
  ExperienceLevel,
  InjuryFlag,
  Mesocycle,
  MovementPattern,
  MuscleGroup,
  PlanDay,
  PlannedExercise,
  PlanWeek,
  SplitType,
  StrengthAnchor,
  WarmupSet,
} from "./types";
import { EngineInputError } from "./bmr";
import { e1rm } from "./e1rm";
import { restSeconds } from "./progression";

export interface PlanInput {
  experience: ExperienceLevel;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionLengthMin: 30 | 45 | 60 | 75 | 90;
  equipment: Equipment[];
  injuries: InjuryFlag[];
  lovedPatterns: MovementPattern[];
  avoidedPatterns: MovementPattern[];
  anchors: StrengthAnchor[];
}

export interface GeneratedPlan extends Mesocycle {
  /** True when the time budget forced volume below the experience band. */
  volumeConstrainedByTime: boolean;
}

export const VOLUME_BANDS: Record<ExperienceLevel, { min: number; max: number }> = {
  beginner: { min: 8, max: 12 },
  novice: { min: 10, max: 14 },
  intermediate: { min: 12, max: 16 },
  advanced: { min: 14, max: 20 },
};

/**
 * Muscles the band minimum is enforced for. Glutes/arms/calves/abs ride
 * along as secondary volume on the compounds (band counts primary only).
 */
export const CORE_MUSCLES: ReadonlyArray<MuscleGroup> = [
  "chest",
  "back",
  "shoulders",
  "quads",
  "hamstrings",
];

const SET_SECONDS = 40;
const WARMUP_OVERHEAD_MIN = 10;
const DELOAD_VOLUME_FACTOR = 0.6; // −40%

type SlotRole = "primary" | "secondary" | "accessory";

interface Slot {
  pattern: MovementPattern;
  preferMuscles: MuscleGroup[];
  role: SlotRole;
  baseSets: number;
}

type DayTemplate = { label: string; slots: Slot[] };

function slot(
  pattern: MovementPattern,
  preferMuscles: MuscleGroup[],
  role: SlotRole,
  baseSets: number,
): Slot {
  return { pattern, preferMuscles, role, baseSets };
}

const FULL_BODY_A: DayTemplate = {
  label: "Full Body A",
  slots: [
    slot("squat", ["quads"], "primary", 3),
    slot("horizontal_push", ["chest"], "primary", 3),
    slot("horizontal_pull", ["back"], "secondary", 3),
    slot("hinge", ["hamstrings", "glutes"], "secondary", 3),
    slot("isolation", ["shoulders"], "accessory", 3),
    slot("core", ["abs"], "accessory", 2),
  ],
};

const FULL_BODY_B: DayTemplate = {
  label: "Full Body B",
  slots: [
    slot("hinge", ["hamstrings", "glutes"], "primary", 3),
    slot("vertical_push", ["shoulders"], "primary", 3),
    slot("vertical_pull", ["back"], "secondary", 3),
    slot("lunge", ["quads", "glutes"], "secondary", 3),
    slot("isolation", ["biceps"], "accessory", 2),
    slot("isolation", ["triceps"], "accessory", 2),
  ],
};

const FULL_BODY_C: DayTemplate = {
  label: "Full Body C",
  slots: [
    slot("squat", ["quads"], "primary", 3),
    slot("horizontal_push", ["chest"], "primary", 3),
    slot("horizontal_pull", ["back"], "secondary", 3),
    slot("isolation", ["calves"], "accessory", 3),
    slot("isolation", ["shoulders"], "accessory", 2),
    slot("core", ["abs"], "accessory", 2),
  ],
};

const PUSH: DayTemplate = {
  label: "Push",
  slots: [
    slot("horizontal_push", ["chest"], "primary", 4),
    slot("vertical_push", ["shoulders"], "primary", 3),
    slot("horizontal_push", ["chest"], "secondary", 3),
    slot("isolation", ["shoulders"], "accessory", 3),
    slot("isolation", ["triceps"], "accessory", 3),
  ],
};

const PULL: DayTemplate = {
  label: "Pull",
  slots: [
    slot("vertical_pull", ["back"], "primary", 4),
    slot("horizontal_pull", ["back"], "primary", 3),
    slot("hinge", ["hamstrings", "glutes"], "secondary", 3),
    slot("isolation", ["biceps"], "accessory", 3),
    slot("isolation", ["shoulders"], "accessory", 2),
  ],
};

const LEGS: DayTemplate = {
  label: "Legs",
  slots: [
    slot("squat", ["quads"], "primary", 4),
    slot("hinge", ["hamstrings", "glutes"], "primary", 3),
    slot("lunge", ["quads", "glutes"], "secondary", 3),
    slot("isolation", ["hamstrings"], "accessory", 3),
    slot("isolation", ["calves"], "accessory", 3),
  ],
};

const UPPER_A: DayTemplate = {
  label: "Upper A",
  slots: [
    slot("horizontal_push", ["chest"], "primary", 4),
    slot("horizontal_pull", ["back"], "primary", 4),
    slot("vertical_push", ["shoulders"], "secondary", 3),
    slot("vertical_pull", ["back"], "secondary", 3),
    slot("isolation", ["biceps"], "accessory", 2),
    slot("isolation", ["triceps"], "accessory", 2),
  ],
};

const UPPER_B: DayTemplate = {
  label: "Upper B",
  slots: [
    slot("vertical_push", ["shoulders"], "primary", 4),
    slot("vertical_pull", ["back"], "primary", 4),
    slot("horizontal_push", ["chest"], "secondary", 3),
    slot("horizontal_pull", ["back"], "secondary", 3),
    slot("isolation", ["shoulders"], "accessory", 2),
    slot("isolation", ["biceps"], "accessory", 2),
  ],
};

const LOWER_A: DayTemplate = {
  label: "Lower A",
  slots: [
    slot("squat", ["quads"], "primary", 4),
    slot("hinge", ["hamstrings", "glutes"], "primary", 3),
    slot("lunge", ["quads", "glutes"], "secondary", 3),
    slot("isolation", ["calves"], "accessory", 3),
    slot("core", ["abs"], "accessory", 2),
  ],
};

const LOWER_B: DayTemplate = {
  label: "Lower B",
  slots: [
    slot("hinge", ["hamstrings", "glutes"], "primary", 4),
    slot("squat", ["quads"], "primary", 3),
    slot("isolation", ["hamstrings"], "accessory", 3),
    slot("isolation", ["calves"], "accessory", 3),
    slot("core", ["abs"], "accessory", 2),
  ],
};

function templatesFor(days: number): { split: SplitType; templates: DayTemplate[] } {
  switch (days) {
    case 2:
      return { split: "full_body", templates: [FULL_BODY_A, FULL_BODY_B] };
    case 3:
      return { split: "full_body", templates: [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C] };
    case 4:
      return { split: "upper_lower", templates: [UPPER_A, LOWER_A, UPPER_B, LOWER_B] };
    case 5:
      return { split: "ppl_ul", templates: [PUSH, PULL, LEGS, UPPER_A, LOWER_A] };
    case 6:
      return { split: "ppl", templates: [PUSH, PULL, LEGS, PUSH, PULL, LEGS] };
    default:
      throw new EngineInputError(`daysPerWeek must be 2-6, got ${days}`);
  }
}

// ---------------------------------------------------------------------------

function filterLibrary(library: ExerciseDef[], input: PlanInput): ExerciseDef[] {
  const equipment = new Set<Equipment>([...input.equipment, "bodyweight"]);
  return library.filter(
    (e) =>
      e.equipment.some((eq) => equipment.has(eq)) &&
      !e.contraindications.some((c) => input.injuries.includes(c)),
  );
}

function pickExercise(
  pool: ExerciseDef[],
  slotDef: Slot,
  input: PlanInput,
  usedToday: Set<string>,
): ExerciseDef | null {
  const matches = (e: ExerciseDef) =>
    e.pattern === slotDef.pattern &&
    slotDef.preferMuscles.some((m) => e.primaryMuscles.includes(m)) &&
    !usedToday.has(e.id);

  // Avoid-preferences exclude first; same-pattern fallback re-admits them
  // so muscle coverage never silently disappears.
  const preferred = pool.filter(
    (e) => matches(e) && !input.avoidedPatterns.includes(e.pattern),
  );
  const candidates = preferred.length > 0 ? preferred : pool.filter(matches);
  if (candidates.length === 0) return null;

  const score = (e: ExerciseDef) =>
    (input.lovedPatterns.includes(e.pattern) ? 4 : 0) +
    (e.isCompound && slotDef.role !== "accessory" ? 2 : 0) +
    (e.equipment.includes("barbell") && input.equipment.includes("barbell") ? 1 : 0);

  return [...candidates].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function warmupRamp(workingWeightKg: number): WarmupSet[] {
  // Ramp for the first compound of the session: 50%×8, 70%×4, 85%×2.
  return [
    { pctOfWorking: 0.5, reps: 8, weightKg: roundPlate(workingWeightKg * 0.5) },
    { pctOfWorking: 0.7, reps: 4, weightKg: roundPlate(workingWeightKg * 0.7) },
    { pctOfWorking: 0.85, reps: 2, weightKg: roundPlate(workingWeightKg * 0.85) },
  ];
}

function roundPlate(w: number): number {
  return Math.round(w / 2.5) * 2.5;
}

function anchorWorkingWeight(ex: ExerciseDef, anchors: StrengthAnchor[]): number {
  const liftFor: Record<string, "squat" | "bench" | "deadlift" | "ohp"> = {
    "back-squat": "squat",
    "bench-press": "bench",
    deadlift: "deadlift",
    ohp: "ohp",
  };
  const lift = liftFor[ex.id];
  if (!lift) return 0;
  const anchor = anchors.find((a) => a.lift === lift);
  if (!anchor) return 0;
  const max = e1rm({ weightKg: anchor.weightKg, reps: anchor.reps }).value;
  return roundPlate(max * 0.75);
}

export function estimateDayMinutes(exercises: PlannedExercise[]): number {
  const work = exercises.reduce(
    (sum, e) => sum + e.sets * (SET_SECONDS + e.restSeconds),
    0,
  );
  return Math.round(WARMUP_OVERHEAD_MIN + work / 60);
}

/**
 * Weekly hard sets per muscle. Counts sets where the muscle is a PRIMARY
 * mover — secondary work is real stimulus but is intentionally not
 * band-counted, otherwise overlapping compounds make the band
 * unsatisfiable (e.g. back would blow past max from deadlift carry-over).
 */
export function weeklyMuscleVolume(
  days: PlanDay[],
  library: ReadonlyMap<string, ExerciseDef>,
): Map<MuscleGroup, number> {
  const volume = new Map<MuscleGroup, number>();
  for (const day of days) {
    for (const pe of day.exercises) {
      const def = library.get(pe.exerciseId);
      if (!def) continue;
      for (const m of def.primaryMuscles) {
        volume.set(m, (volume.get(m) ?? 0) + pe.sets);
      }
    }
  }
  return volume;
}

/** Weekly training frequency per muscle (days touching it, primary or secondary). */
export function weeklyMuscleFrequency(
  days: PlanDay[],
  library: ReadonlyMap<string, ExerciseDef>,
): Map<MuscleGroup, number> {
  const freq = new Map<MuscleGroup, number>();
  for (const day of days) {
    const touched = new Set<MuscleGroup>();
    for (const pe of day.exercises) {
      const def = library.get(pe.exerciseId);
      if (!def) continue;
      def.primaryMuscles.forEach((m) => touched.add(m));
      def.secondaryMuscles.forEach((m) => touched.add(m));
    }
    touched.forEach((m) => freq.set(m, (freq.get(m) ?? 0) + 1));
  }
  return freq;
}

// ---------------------------------------------------------------------------

export function generatePlan(input: PlanInput, library: ExerciseDef[]): GeneratedPlan {
  const { split, templates } = templatesFor(input.daysPerWeek);
  const pool = filterLibrary(library, input);
  if (pool.length === 0) {
    throw new EngineInputError("no exercises available for the given equipment/injuries");
  }
  const byId = new Map(library.map((e) => [e.id, e]));
  const band = VOLUME_BANDS[input.experience];

  // 1. Assign exercises to template slots.
  const days: PlanDay[] = templates.map((tpl, dayIndex) => {
    const usedToday = new Set<string>();
    const exercises: PlannedExercise[] = [];
    let firstCompoundDone = false;
    for (const s of tpl.slots) {
      const def = pickExercise(pool, s, input, usedToday);
      if (!def) continue;
      usedToday.add(def.id);
      const needsWarmup = !firstCompoundDone && def.isCompound;
      if (needsWarmup) firstCompoundDone = true;
      exercises.push({
        exerciseId: def.id,
        sets: s.baseSets,
        repMin: def.repRange.min,
        repMax: def.repRange.max,
        restSeconds: restSeconds(def.isCompound),
        warmup: needsWarmup ? warmupRamp(anchorWorkingWeight(def, input.anchors)) : [],
      });
    }
    return { dayIndex, label: tpl.label, exercises, estimatedMinutes: 0 };
  });

  // 2. Cap muscles above the band maximum: trim accessory sets first,
  //    then compound sets down to a floor of 2.
  let volume = weeklyMuscleVolume(days, byId);
  for (const [muscle, vol] of volume) {
    let excess = vol - band.max;
    if (excess <= 0) continue;
    const passes: ReadonlyArray<{ compound: boolean; floor: number }> = [
      { compound: false, floor: 0 },
      { compound: true, floor: 2 },
    ];
    for (const pass of passes) {
      for (const day of days) {
        for (const pe of [...day.exercises].reverse()) {
          if (excess <= 0) break;
          const def = byId.get(pe.exerciseId);
          if (!def || def.isCompound !== pass.compound || !def.primaryMuscles.includes(muscle)) {
            continue;
          }
          while (pe.sets > pass.floor && excess > 0) {
            pe.sets -= 1;
            excess -= 1;
          }
        }
      }
    }
    for (const day of days) day.exercises = day.exercises.filter((pe) => pe.sets > 0);
  }

  // 3. Trim to the session time budget: accessory sets → compound sets
  //    (floor 2) → drop whole exercises from the back (keep ≥ 2).
  for (const day of days) {
    const trimOrder: ReadonlyArray<(def: ExerciseDef) => boolean> = [
      (def) => !def.isCompound,
      (def) => def.isCompound,
    ];
    for (const isTrimmable of trimOrder) {
      let guard = 100;
      while (estimateDayMinutes(day.exercises) > input.sessionLengthMin && guard-- > 0) {
        const candidates = day.exercises.filter((pe) => {
          const def = byId.get(pe.exerciseId);
          return def !== undefined && isTrimmable(def) && pe.sets > (def.isCompound ? 2 : 0);
        });
        const target = candidates[candidates.length - 1];
        if (!target) break;
        if (target.sets <= 1) {
          day.exercises = day.exercises.filter((pe) => pe !== target);
        } else {
          target.sets -= 1;
        }
      }
    }
    while (
      estimateDayMinutes(day.exercises) > input.sessionLengthMin &&
      day.exercises.length > 2
    ) {
      day.exercises = day.exercises.slice(0, -1);
    }
    day.exercises = day.exercises.filter((pe) => pe.sets > 0);
    day.estimatedMinutes = estimateDayMinutes(day.exercises);
  }

  // 3b. Frequency guarantee: any muscle trained with ≥ 2 weekly primary
  //     sets must be hit on ≥ 2 days. Duplicate the exercise onto another
  //     day when time allows; otherwise drop the orphaned accessory.
  let volumeConstrainedByTime = false;
  volume = weeklyMuscleVolume(days, byId);
  const freq = weeklyMuscleFrequency(days, byId);
  for (const [muscle, vol] of volume) {    if (vol < 2 || (freq.get(muscle) ?? 0) >= 2) continue;
    const sourceDay = days.find((d) =>
      d.exercises.some((pe) => byId.get(pe.exerciseId)?.primaryMuscles.includes(muscle)),
    );
    const sourceExercise = sourceDay?.exercises.find((pe) =>
      byId.get(pe.exerciseId)?.primaryMuscles.includes(muscle),
    );
    if (!sourceDay || !sourceExercise) continue;
    let fixed = false;
    if (vol + 2 <= band.max) {
      for (const day of days) {
        if (day === sourceDay) continue;
        if (day.exercises.some((pe) => pe.exerciseId === sourceExercise.exerciseId)) continue;
        const duplicate: PlannedExercise = { ...sourceExercise, sets: 2, warmup: [] };
        if (estimateDayMinutes([...day.exercises, duplicate]) <= input.sessionLengthMin) {
          day.exercises.push(duplicate);
          fixed = true;
          break;
        }
      }
    }
    if (!fixed) {
      // No room for a second day: drop orphaned accessories so the plan
      // never claims to train a muscle it only touches once a week.
      // Compound contributors stay (they anchor core-muscle coverage) —
      // the plan is flagged time-constrained instead.
      for (const day of days) {
        day.exercises = day.exercises.filter((pe) => {
          const def = byId.get(pe.exerciseId);
          if (!def || def.isCompound) return true;
          return !def.primaryMuscles.includes(muscle);
        });
      }
      volumeConstrainedByTime = true;
    }
  }
  for (const day of days) day.estimatedMinutes = estimateDayMinutes(day.exercises);

  // 4. Top up core muscles below the band minimum while time allows:
  //    first raise existing sets (cap 5/exercise), then add a dedicated
  //    accessory for the muscle on the day with the most spare time.
  volume = weeklyMuscleVolume(days, byId);
  for (const muscle of CORE_MUSCLES) {
    let deficit = band.min - (volume.get(muscle) ?? 0);
    if (deficit <= 0) continue;
    let progressed = true;
    while (deficit > 0 && progressed) {
      progressed = false;
      for (const day of days) {
        if (deficit <= 0) break;
        for (const pe of day.exercises) {
          if (deficit <= 0) break;
          const def = byId.get(pe.exerciseId);
          if (!def || !def.primaryMuscles.includes(muscle) || pe.sets >= 5) continue;
          const withExtra = day.exercises.map((e) => (e === pe ? { ...e, sets: e.sets + 1 } : e));
          if (estimateDayMinutes(withExtra) <= input.sessionLengthMin) {
            pe.sets += 1;
            deficit -= 1;
            progressed = true;
          }
        }
      }
    }
    // Existing slots saturated — add a single-primary accessory if it fits.
    let guard = 4;
    while (deficit > 0 && guard-- > 0) {
      const spareSorted = [...days].sort(
        (a, b) => estimateDayMinutes(a.exercises) - estimateDayMinutes(b.exercises),
      );
      let added = false;
      for (const day of spareSorted) {
        const candidate = pool.find(
          (def) =>
            def.primaryMuscles.length === 1 &&
            def.primaryMuscles.includes(muscle) &&
            !day.exercises.some((pe) => pe.exerciseId === def.id),
        );
        if (!candidate) continue;
        const sets = Math.min(3, deficit);
        const extra: PlannedExercise = {
          exerciseId: candidate.id,
          sets,
          repMin: candidate.repRange.min,
          repMax: candidate.repRange.max,
          restSeconds: restSeconds(candidate.isCompound),
          warmup: [],
        };
        if (estimateDayMinutes([...day.exercises, extra]) <= input.sessionLengthMin) {
          day.exercises.push(extra);
          deficit -= sets;
          added = true;
          break;
        }
      }
      if (!added) break;
    }
    if (deficit > 0) volumeConstrainedByTime = true;
  }
  for (const day of days) day.estimatedMinutes = estimateDayMinutes(day.exercises);

  // Final honesty check: if any meaningfully trained muscle still sits at
  // 1×/week (e.g. a compound orphan that could not be duplicated), the
  // plan must carry the constrained flag rather than claim the guarantee.
  const finalVolume = weeklyMuscleVolume(days, byId);
  const finalFreq = weeklyMuscleFrequency(days, byId);
  for (const [muscle, vol] of finalVolume) {
    if (vol >= 2 && (finalFreq.get(muscle) ?? 0) < 2) volumeConstrainedByTime = true;
  }

  // 5. 4-week wave; week 4 is the planned deload (−40% volume, −10% load).
  const weeks: PlanWeek[] = [0, 1, 2, 3].map((weekIndex) => {
    const isDeload = weekIndex === 3;
    return {
      weekIndex,
      isDeload,
      days: days.map((day) => ({
        ...day,
        exercises: day.exercises.map((pe) => ({
          ...pe,
          sets: isDeload ? Math.max(1, Math.round(pe.sets * DELOAD_VOLUME_FACTOR)) : pe.sets,
          warmup: pe.warmup.map((w) => ({ ...w })),
        })),
        estimatedMinutes: 0,
      })),
    };
  });
  for (const week of weeks) {
    for (const day of week.days) day.estimatedMinutes = estimateDayMinutes(day.exercises);
  }

  return {
    splitType: split,
    daysPerWeek: input.daysPerWeek,
    weeks,
    medicalNote: input.injuries.length > 0,
    volumeConstrainedByTime,
  };
}
