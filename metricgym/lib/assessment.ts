/**
 * Fills unanswered (skipped) quiz fields with conservative defaults so
 * the engine always receives a complete AssessmentInput.
 */
import type { AssessmentInput } from "@/lib/engine/types";
import type { OnboardingAnswers } from "@/lib/stores/onboarding";

export function buildAssessmentInput(answers: OnboardingAnswers): AssessmentInput {
  return {
    sex: answers.sex ?? "male",
    birthdate: answers.birthdate ?? "1995-01-01",
    heightCm: answers.heightCm ?? 175,
    weightKg: answers.weightKg ?? 78,
    bodyFatPct: answers.bodyFatPct,
    goal: answers.goal ?? "general_fitness",
    targetWeightKg: answers.targetWeightKg,
    targetDate: answers.targetDate,
    motivation: answers.motivation,
    experience: answers.experience ?? "beginner",
    daysPerWeek: answers.daysPerWeek ?? 3,
    sessionLengthMin: answers.sessionLengthMin ?? 60,
    environment: answers.environment ?? "gym",
    equipment: answers.equipment ?? ["barbell", "dumbbell", "bench"],
    injuries: answers.injuries ?? [],
    lovedPatterns: answers.lovedPatterns ?? [],
    avoidedPatterns: answers.avoidedPatterns ?? [],
    anchors: answers.anchors ?? [],
    activityLevel: answers.activityLevel ?? "light",
    avgSleepH: answers.avgSleepH ?? 7,
    stress: answers.stress ?? 3,
    dietStyle: answers.dietStyle ?? "omnivore",
    mealsPerDay: answers.mealsPerDay ?? 3,
    units: answers.units ?? "kg",
  };
}
