/**
 * BINDING terminology glossary — single source of truth.
 * Copy in messages/de.json MUST use these terms and never mix
 * (e.g. "Wdh." is forbidden because "Reps" is canonical).
 */
export const GLOSSARY = {
  set: "Set",
  reps: "Reps",
  e1rm: "e1RM",
  deload: "Deload",
  readiness: "Readiness",
  mesocycle: "Mesozyklus",
  volume: "Volumen",
  warmupSets: "Aufwärmsätze",
  workingSets: "Arbeitssätze",
  bmr: "Grundumsatz (BMR)",
  tdee: "Gesamtumsatz (TDEE)",
  calorieTarget: "Kalorienziel",
  trainingDay: "Trainingstag",
  restDay: "Ruhetag",
} as const;

/**
 * Verboten-Liste — terms and registers that must never appear in UI copy:
 * "Du schaffst das!", "Lass uns durchstarten", "Auf geht's!",
 * emoji in metric contexts, exclamation marks in data UI.
 */
export type GlossaryTerm = keyof typeof GLOSSARY;
