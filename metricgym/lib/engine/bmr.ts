/**
 * Basal metabolic rate.
 *
 * Default: Mifflin-St Jeor (best validated for the general population).
 * When body-fat % is known: Katch-McArdle (lean-mass based, more accurate
 * for trained individuals).
 */
import type { Sex } from "./types";

export class EngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineInputError";
  }
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new EngineInputError(`${name} must be a positive finite number, got ${value}`);
  }
}

/** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + (male ? +5 : −161). */
export function mifflinStJeor(sex: Sex, ageYears: number, heightCm: number, weightKg: number): number {
  assertPositive(ageYears, "ageYears");
  assertPositive(heightCm, "heightCm");
  assertPositive(weightKg, "weightKg");
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(base + (sex === "male" ? 5 : -161));
}

/** Katch-McArdle: 370 + 21.6 · FFM(kg). Requires body-fat %. */
export function katchMcArdle(weightKg: number, bodyFatPct: number): number {
  assertPositive(weightKg, "weightKg");
  if (!Number.isFinite(bodyFatPct) || bodyFatPct <= 0 || bodyFatPct >= 75) {
    throw new EngineInputError(`bodyFatPct must be in (0, 75), got ${bodyFatPct}`);
  }
  const ffm = weightKg * (1 - bodyFatPct / 100);
  return Math.round(370 + 21.6 * ffm);
}

export interface BmrInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
}

/** Picks Katch-McArdle when body fat is known, Mifflin-St Jeor otherwise. */
export function bmr(input: BmrInput): number {
  if (input.bodyFatPct !== undefined) {
    return katchMcArdle(input.weightKg, input.bodyFatPct);
  }
  return mifflinStJeor(input.sex, input.ageYears, input.heightCm, input.weightKg);
}

export function ageFromBirthdate(birthdateIso: string, now: Date = new Date()): number {
  const birth = new Date(birthdateIso);
  if (Number.isNaN(birth.getTime())) {
    throw new EngineInputError(`invalid birthdate: ${birthdateIso}`);
  }
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  if (age <= 0) {
    throw new EngineInputError(`birthdate must be in the past: ${birthdateIso}`);
  }
  return age;
}
