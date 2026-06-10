/**
 * Code-defined exercise library.
 *
 * DECISION: exercises live in code, not in the database. DB rows reference
 * them via stable string ids in FK-less columns. Rationale: the library
 * versions with the app (contraindication tags, increment classes and
 * substitution logic are code), and we avoid sync/migration overhead for
 * static content. Ids are append-only and never renamed.
 */
import type {
  Equipment,
  ExerciseDef,
  IncrementClass,
  InjuryFlag,
  MovementPattern,
  MuscleGroup,
} from "@/lib/engine/types";

function ex(
  id: string,
  nameDe: string,
  nameEn: string,
  pattern: MovementPattern,
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  equipment: Equipment[],
  incrementClass: IncrementClass,
  repRange: { min: number; max: number },
  contraindications: InjuryFlag[] = [],
  isCompound = true,
): ExerciseDef {
  return {
    id,
    nameDe,
    nameEn,
    pattern,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    incrementClass,
    repRange,
    contraindications,
    isCompound,
  };
}

export const EXERCISES: ExerciseDef[] = [
  // ---- Squat pattern ----
  ex("back-squat", "Kniebeuge (Langhantel)", "Barbell Back Squat", "squat", ["quads"], ["glutes", "hamstrings", "abs"], ["barbell"], "barbell_lower", { min: 5, max: 8 }, ["lower_back", "knees"]),
  ex("front-squat", "Frontkniebeuge", "Front Squat", "squat", ["quads"], ["glutes", "abs"], ["barbell"], "barbell_lower", { min: 5, max: 8 }, ["knees", "wrists"]),
  ex("goblet-squat", "Goblet Squat", "Goblet Squat", "squat", ["quads"], ["glutes", "abs"], ["dumbbell", "kettlebell"], "dumbbell", { min: 8, max: 12 }, ["knees"]),
  ex("hack-squat", "Hackenschmidt-Maschine", "Hack Squat (Machine)", "squat", ["quads"], ["glutes"], ["machine"], "machine", { min: 8, max: 12 }, ["knees"]),
  ex("leg-press", "Beinpresse", "Leg Press", "squat", ["quads"], ["glutes", "hamstrings"], ["machine"], "machine", { min: 8, max: 12 }, ["knees"]),
  ex("bw-squat", "Kniebeuge (Körpergewicht)", "Bodyweight Squat", "squat", ["quads"], ["glutes"], ["bodyweight"], "bodyweight", { min: 12, max: 20 }, []),
  ex("pistol-squat", "Pistol Squat", "Pistol Squat", "squat", ["quads"], ["glutes", "abs"], ["bodyweight"], "bodyweight", { min: 5, max: 10 }, ["knees"]),

  // ---- Hinge pattern ----
  ex("deadlift", "Kreuzheben", "Deadlift", "hinge", ["hamstrings"], ["glutes", "back", "quads", "forearms"], ["barbell"], "barbell_lower", { min: 4, max: 6 }, ["lower_back"]),
  ex("rdl", "Rumänisches Kreuzheben", "Romanian Deadlift", "hinge", ["hamstrings"], ["glutes", "back"], ["barbell"], "barbell_lower", { min: 6, max: 10 }, ["lower_back"]),
  ex("db-rdl", "Rumänisches Kreuzheben (KH)", "Dumbbell RDL", "hinge", ["hamstrings"], ["glutes", "back"], ["dumbbell"], "dumbbell", { min: 8, max: 12 }, ["lower_back"]),
  ex("hip-thrust", "Hip Thrust", "Hip Thrust", "hinge", ["glutes"], ["hamstrings"], ["barbell", "bench"], "barbell_lower", { min: 8, max: 12 }, []),
  ex("glute-bridge", "Glute Bridge", "Glute Bridge", "hinge", ["glutes"], ["hamstrings"], ["bodyweight"], "bodyweight", { min: 12, max: 20 }, []),
  ex("kb-swing", "Kettlebell Swing", "Kettlebell Swing", "hinge", ["glutes"], ["hamstrings", "back", "abs"], ["kettlebell"], "dumbbell", { min: 12, max: 20 }, ["lower_back"]),
  ex("back-extension", "Rückenstrecker", "Back Extension", "hinge", ["hamstrings"], ["glutes", "back"], ["machine", "bodyweight"], "isolation", { min: 10, max: 15 }, ["lower_back"], false),
  ex("nordic-curl", "Nordic Hamstring Curl", "Nordic Curl", "hinge", ["hamstrings"], [], ["bodyweight"], "bodyweight", { min: 5, max: 10 }, ["knees"]),

  // ---- Horizontal push ----
  ex("bench-press", "Bankdrücken (Langhantel)", "Barbell Bench Press", "horizontal_push", ["chest"], ["triceps", "shoulders"], ["barbell", "bench"], "barbell_upper", { min: 5, max: 8 }, ["shoulders"]),
  ex("db-bench", "Bankdrücken (Kurzhantel)", "Dumbbell Bench Press", "horizontal_push", ["chest"], ["triceps", "shoulders"], ["dumbbell", "bench"], "dumbbell", { min: 8, max: 12 }, ["shoulders"]),
  ex("incline-db-press", "Schrägbankdrücken (KH)", "Incline Dumbbell Press", "horizontal_push", ["chest"], ["shoulders", "triceps"], ["dumbbell", "bench"], "dumbbell", { min: 8, max: 12 }, ["shoulders"]),
  ex("machine-chest-press", "Brustpresse (Maschine)", "Machine Chest Press", "horizontal_push", ["chest"], ["triceps", "shoulders"], ["machine"], "machine", { min: 8, max: 12 }, []),
  ex("pushup", "Liegestütz", "Push-up", "horizontal_push", ["chest"], ["triceps", "shoulders", "abs"], ["bodyweight"], "bodyweight", { min: 8, max: 20 }, ["wrists"]),
  ex("dips", "Dips", "Dips", "horizontal_push", ["chest"], ["triceps", "shoulders"], ["bodyweight"], "bodyweight", { min: 6, max: 12 }, ["shoulders"]),
  ex("cable-fly", "Cable Fly", "Cable Fly", "horizontal_push", ["chest"], [], ["cable"], "isolation", { min: 10, max: 15 }, [], false),

  // ---- Vertical push ----
  ex("ohp", "Schulterdrücken (Langhantel)", "Overhead Press", "vertical_push", ["shoulders"], ["triceps", "abs"], ["barbell"], "barbell_upper", { min: 5, max: 8 }, ["shoulders"]),
  ex("db-shoulder-press", "Schulterdrücken (KH)", "Dumbbell Shoulder Press", "vertical_push", ["shoulders"], ["triceps"], ["dumbbell"], "dumbbell", { min: 8, max: 12 }, ["shoulders"]),
  ex("machine-shoulder-press", "Schulterpresse (Maschine)", "Machine Shoulder Press", "vertical_push", ["shoulders"], ["triceps"], ["machine"], "machine", { min: 8, max: 12 }, []),
  ex("pike-pushup", "Pike Push-up", "Pike Push-up", "vertical_push", ["shoulders"], ["triceps"], ["bodyweight"], "bodyweight", { min: 6, max: 15 }, ["shoulders", "wrists"]),
  ex("lateral-raise", "Seitheben", "Lateral Raise", "isolation", ["shoulders"], [], ["dumbbell", "cable"], "isolation", { min: 12, max: 20 }, [], false),

  // ---- Horizontal pull ----
  ex("barbell-row", "Langhantelrudern", "Barbell Row", "horizontal_pull", ["back"], ["biceps", "forearms"], ["barbell"], "barbell_upper", { min: 6, max: 10 }, ["lower_back"]),
  ex("db-row", "Kurzhantelrudern", "Dumbbell Row", "horizontal_pull", ["back"], ["biceps"], ["dumbbell", "bench"], "dumbbell", { min: 8, max: 12 }, []),
  ex("cable-row", "Kabelrudern", "Seated Cable Row", "horizontal_pull", ["back"], ["biceps"], ["cable"], "machine", { min: 8, max: 12 }, []),
  ex("machine-row", "Rudermaschine", "Machine Row", "horizontal_pull", ["back"], ["biceps"], ["machine"], "machine", { min: 8, max: 12 }, []),
  ex("inverted-row", "Inverted Row", "Inverted Row", "horizontal_pull", ["back"], ["biceps"], ["bodyweight", "barbell"], "bodyweight", { min: 8, max: 15 }, []),
  ex("band-row", "Rudern (Band)", "Band Row", "horizontal_pull", ["back"], ["biceps"], ["bands"], "isolation", { min: 12, max: 20 }, []),

  // ---- Vertical pull ----
  ex("pullup", "Klimmzug", "Pull-up", "vertical_pull", ["back"], ["biceps", "forearms"], ["pullup_bar", "bodyweight"], "bodyweight", { min: 5, max: 12 }, ["shoulders"]),
  ex("chinup", "Klimmzug (Untergriff)", "Chin-up", "vertical_pull", ["back"], ["biceps", "forearms"], ["pullup_bar", "bodyweight"], "bodyweight", { min: 5, max: 12 }, []),
  ex("lat-pulldown", "Latzug", "Lat Pulldown", "vertical_pull", ["back"], ["biceps"], ["cable", "machine"], "machine", { min: 8, max: 12 }, []),
  ex("band-pulldown", "Latzug (Band)", "Band Pulldown", "vertical_pull", ["back"], ["biceps"], ["bands"], "isolation", { min: 12, max: 20 }, []),

  // ---- Lunge pattern ----
  ex("bulgarian-split-squat", "Bulgarian Split Squat", "Bulgarian Split Squat", "lunge", ["quads"], ["glutes", "hamstrings"], ["dumbbell", "bodyweight", "bench"], "dumbbell", { min: 8, max: 12 }, ["knees"]),
  ex("walking-lunge", "Ausfallschritte", "Walking Lunge", "lunge", ["quads"], ["glutes", "hamstrings"], ["dumbbell", "bodyweight"], "dumbbell", { min: 10, max: 15 }, ["knees"]),
  ex("step-up", "Step-up", "Step-up", "lunge", ["quads"], ["glutes"], ["dumbbell", "bodyweight", "bench"], "dumbbell", { min: 8, max: 12 }, []),
  ex("reverse-lunge", "Ausfallschritt rückwärts", "Reverse Lunge", "lunge", ["quads"], ["glutes", "hamstrings"], ["dumbbell", "bodyweight"], "dumbbell", { min: 8, max: 12 }, []),

  // ---- Isolation: arms ----
  ex("bb-curl", "Langhantel-Curl", "Barbell Curl", "isolation", ["biceps"], ["forearms"], ["barbell"], "isolation", { min: 8, max: 12 }, ["wrists"], false),
  ex("db-curl", "Kurzhantel-Curl", "Dumbbell Curl", "isolation", ["biceps"], ["forearms"], ["dumbbell"], "isolation", { min: 10, max: 15 }, [], false),
  ex("hammer-curl", "Hammer-Curl", "Hammer Curl", "isolation", ["biceps"], ["forearms"], ["dumbbell"], "isolation", { min: 10, max: 15 }, [], false),
  ex("cable-curl", "Kabel-Curl", "Cable Curl", "isolation", ["biceps"], [], ["cable"], "isolation", { min: 10, max: 15 }, [], false),
  ex("band-curl", "Band-Curl", "Band Curl", "isolation", ["biceps"], [], ["bands"], "isolation", { min: 12, max: 20 }, [], false),
  ex("triceps-pushdown", "Trizepsdrücken (Kabel)", "Triceps Pushdown", "isolation", ["triceps"], [], ["cable"], "isolation", { min: 10, max: 15 }, [], false),
  ex("skull-crusher", "French Press", "Skull Crusher", "isolation", ["triceps"], [], ["barbell", "dumbbell", "bench"], "isolation", { min: 8, max: 12 }, ["wrists"], false),
  ex("overhead-triceps-ext", "Trizepsdrücken über Kopf", "Overhead Triceps Extension", "isolation", ["triceps"], [], ["dumbbell", "cable"], "isolation", { min: 10, max: 15 }, ["shoulders"], false),
  ex("band-pushdown", "Trizepsdrücken (Band)", "Band Pushdown", "isolation", ["triceps"], [], ["bands"], "isolation", { min: 12, max: 20 }, [], false),
  ex("diamond-pushup", "Diamant-Liegestütz", "Diamond Push-up", "isolation", ["triceps"], ["chest"], ["bodyweight"], "bodyweight", { min: 8, max: 15 }, ["wrists"], false),

  // ---- Isolation: shoulders/back ----
  ex("rear-delt-fly", "Reverse Fly", "Rear Delt Fly", "isolation", ["shoulders"], ["back"], ["dumbbell", "cable", "machine"], "isolation", { min: 12, max: 20 }, [], false),
  ex("face-pull", "Face Pull", "Face Pull", "isolation", ["shoulders"], ["back"], ["cable", "bands"], "isolation", { min: 12, max: 20 }, [], false),
  ex("shrug", "Shrugs", "Shrug", "isolation", ["back"], ["forearms"], ["barbell", "dumbbell"], "isolation", { min: 10, max: 15 }, [], false),

  // ---- Isolation: legs ----
  ex("leg-extension", "Beinstrecker", "Leg Extension", "isolation", ["quads"], [], ["machine"], "isolation", { min: 10, max: 15 }, ["knees"], false),
  ex("leg-curl", "Beinbeuger", "Leg Curl", "isolation", ["hamstrings"], [], ["machine"], "isolation", { min: 10, max: 15 }, [], false),
  ex("calf-raise", "Wadenheben (stehend)", "Standing Calf Raise", "isolation", ["calves"], [], ["machine", "dumbbell", "bodyweight"], "isolation", { min: 12, max: 20 }, [], false),
  ex("seated-calf-raise", "Wadenheben (sitzend)", "Seated Calf Raise", "isolation", ["calves"], [], ["machine"], "isolation", { min: 15, max: 20 }, [], false),
  ex("hip-abduction", "Abduktion (Maschine)", "Hip Abduction", "isolation", ["glutes"], [], ["machine"], "isolation", { min: 12, max: 20 }, [], false),

  // ---- Core ----
  ex("plank", "Plank", "Plank", "core", ["abs"], [], ["bodyweight"], "bodyweight", { min: 30, max: 90 }, []),
  ex("hanging-leg-raise", "Beinheben hängend", "Hanging Leg Raise", "core", ["abs"], ["forearms"], ["pullup_bar"], "bodyweight", { min: 8, max: 15 }, []),
  ex("cable-crunch", "Kabel-Crunch", "Cable Crunch", "core", ["abs"], [], ["cable"], "isolation", { min: 10, max: 15 }, [], false),
  ex("ab-wheel", "Ab-Wheel Rollout", "Ab Wheel Rollout", "core", ["abs"], ["shoulders"], ["bodyweight"], "bodyweight", { min: 6, max: 12 }, ["lower_back", "wrists"]),
  ex("dead-bug", "Dead Bug", "Dead Bug", "core", ["abs"], [], ["bodyweight"], "bodyweight", { min: 10, max: 16 }, []),
  ex("side-plank", "Seitstütz", "Side Plank", "core", ["abs"], ["shoulders"], ["bodyweight"], "bodyweight", { min: 20, max: 60 }, []),

  // ---- Carry ----
  ex("farmers-carry", "Farmer's Carry", "Farmer's Carry", "carry", ["forearms"], ["abs", "back"], ["dumbbell", "kettlebell"], "dumbbell", { min: 30, max: 60 }, []),
];

export const EXERCISE_BY_ID: ReadonlyMap<string, ExerciseDef> = new Map(
  EXERCISES.map((e) => [e.id, e]),
);

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISE_BY_ID.get(id);
}

/** Same-pattern substitutes that fit the available equipment. */
export function substitutesFor(
  exerciseId: string,
  availableEquipment: Equipment[],
  injuries: InjuryFlag[],
): ExerciseDef[] {
  const source = EXERCISE_BY_ID.get(exerciseId);
  if (!source) return [];
  return EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      e.pattern === source.pattern &&
      e.equipment.some((eq) => availableEquipment.includes(eq)) &&
      !e.contraindications.some((c) => injuries.includes(c)) &&
      e.primaryMuscles.some((m) => source.primaryMuscles.includes(m)),
  );
}

/** Ids of the four main lifts used for strength anchors and forecasts. */
export const MAIN_LIFT_EXERCISE: Record<"squat" | "bench" | "deadlift" | "ohp", string> = {
  squat: "back-squat",
  bench: "bench-press",
  deadlift: "deadlift",
  ohp: "ohp",
};
