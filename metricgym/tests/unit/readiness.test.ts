import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { readiness } from "@/lib/engine/readiness";

describe("readiness", () => {
  it("perfect inputs score 100, primed", () => {
    const r = readiness({ sleepQuality: 5, soreness: 1, stress: 1, acwr: 1.0, daysSinceRest: 1 });
    expect(r.score).toBe(100);
    expect(r.tier).toBe("primed");
    expect(r.calibrating).toBe(false);
  });

  it("worst inputs land in recover", () => {
    const r = readiness({ sleepQuality: 1, soreness: 5, stress: 5, acwr: 2.5, daysSinceRest: 8 });
    expect(r.tier).toBe("recover");
  });

  it("missing ACWR (cold start) renormalizes and flags calibration", () => {
    const cold = readiness({ sleepQuality: 5, soreness: 1, stress: 1, daysSinceRest: 1 });
    expect(cold.calibrating).toBe(true);
    expect(cold.score).toBe(100); // renormalized, not penalized for missing data
  });

  it("score is always within 0-100 and tier matches score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.option(fc.double({ min: 0, max: 3, noNaN: true }), { nil: undefined }),
        fc.integer({ min: 0, max: 14 }),
        (sleepQuality, soreness, stress, acwr, daysSinceRest) => {
          const r = readiness({ sleepQuality, soreness, stress, acwr, daysSinceRest });
          if (r.score < 0 || r.score > 100) return false;
          if (r.score >= 80) return r.tier === "primed";
          if (r.score >= 60) return r.tier === "ready";
          if (r.score >= 40) return r.tier === "caution";
          return r.tier === "recover";
        },
      ),
    );
  });

  it("better sleep never lowers the score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 10 }),
        (sleep, soreness, stress, daysSinceRest) => {
          const lo = readiness({ sleepQuality: sleep, soreness, stress, daysSinceRest });
          const hi = readiness({ sleepQuality: sleep + 1, soreness, stress, daysSinceRest });
          return hi.score >= lo.score;
        },
      ),
    );
  });

  it("always returns a concrete adjustment key", () => {
    const r = readiness({ sleepQuality: 2, soreness: 4, stress: 3, acwr: 1.1, daysSinceRest: 3 });
    expect(r.adjustmentKey).toMatch(/^readiness\.adjust\./);
  });
});
