/**
 * Readiness score 0-100.
 *
 * EXPLICITLY HEURISTIC: a directional indicator, not a diagnostic.
 * It weights subjective inputs against acute:chronic workload and
 * exists to nudge session intensity, nothing more.
 *
 * Weights: sleep 30%, soreness 25%, stress 15%, ACWR 20%, days-since-rest 10%.
 *
 * Cold start: with < 14 days of data there is no meaningful chronic load,
 * so the ACWR term is omitted and the remaining weights renormalized.
 * The UI labels the score "Kalibrierung" with reduced-confidence styling.
 */
import type { ReadinessInput, ReadinessResult, ReadinessTier } from "./types";

const WEIGHTS = {
  sleep: 0.3,
  soreness: 0.25,
  stress: 0.15,
  acwr: 0.2,
  daysSinceRest: 0.1,
} as const;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** ACWR sweet spot ~0.8-1.3; both detraining and spiking reduce the score. */
function acwrScore(acwr: number): number {
  if (acwr <= 0) return 0.5;
  if (acwr < 0.8) return clamp01(acwr / 0.8) * 0.3 + 0.7; // mild penalty for undertraining
  if (acwr <= 1.3) return 1;
  return clamp01(1 - (acwr - 1.3) / 0.7); // 2.0+ → 0
}

export function readiness(input: ReadinessInput): ReadinessResult {
  const calibrating = input.acwr === undefined;

  const components: Array<{ weight: number; score: number }> = [
    { weight: WEIGHTS.sleep, score: clamp01((input.sleepQuality - 1) / 4) },
    { weight: WEIGHTS.soreness, score: clamp01(1 - (input.soreness - 1) / 4) },
    { weight: WEIGHTS.stress, score: clamp01(1 - (input.stress - 1) / 4) },
    {
      weight: WEIGHTS.daysSinceRest,
      score: clamp01(1 - Math.max(0, input.daysSinceRest - 2) / 4),
    },
  ];
  if (!calibrating && input.acwr !== undefined) {
    components.push({ weight: WEIGHTS.acwr, score: acwrScore(input.acwr) });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.weight * c.score, 0);
  const score = Math.round((weighted / totalWeight) * 100);

  return {
    score,
    tier: tierFor(score),
    calibrating,
    adjustmentKey: adjustmentFor(score, input),
  };
}

function tierFor(score: number): ReadinessTier {
  if (score >= 80) return "primed";
  if (score >= 60) return "ready";
  if (score >= 40) return "caution";
  return "recover";
}

/** Returns an i18n key — copy lives in messages/de.json. */
function adjustmentFor(score: number, input: ReadinessInput): string {
  if (score < 40) return "readiness.adjust.recover";
  if (score < 60) {
    if (input.soreness >= 4) return "readiness.adjust.reduceVolume";
    if (input.sleepQuality <= 2) return "readiness.adjust.reduceLoad";
    return "readiness.adjust.keepRpeLow";
  }
  if (score >= 80) return "readiness.adjust.push";
  return "readiness.adjust.asPlanned";
}
