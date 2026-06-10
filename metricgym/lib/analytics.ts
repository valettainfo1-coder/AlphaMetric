/**
 * Product analytics — typed event contract, instrumented from day 1.
 * PostHog when NEXT_PUBLIC_POSTHOG_KEY is set, typed no-op shim otherwise.
 */

export type AnalyticsEvent =
  | { name: "onboarding_step_completed"; props: { step_id: string } }
  | { name: "onboarding_abandoned"; props: { step_id: string } }
  | { name: "profile_revealed"; props: { bmr: number; goal: string } }
  | { name: "signup_completed"; props: { method: "magic_link" | "google" | "demo" } }
  | { name: "workout_started"; props: { label: string; week_index: number } }
  | { name: "workout_completed"; props: { label: string; total_volume_kg: number } }
  | { name: "set_logged"; props: { exercise_id: string; weight_kg: number; reps: number } }
  | { name: "pr_achieved"; props: { exercise_id: string; e1rm: number } }
  | { name: "report_shared"; props: { kind: "pr_card" | "weekly_report" } }
  | { name: "paywall_viewed"; props: { source: string } }
  | { name: "coach_message_sent"; props: { suggested_chip: boolean } };

type PostHogLike = {
  capture: (name: string, props?: Record<string, unknown>) => void;
};

let posthogClient: PostHogLike | null = null;
let initStarted = false;

async function ensurePosthog(): Promise<PostHogLike | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return null;
  if (!initStarted) {
    initStarted = true;
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      capture_pageview: true,
      persistence: "localStorage+cookie",
    });
    posthogClient = posthog;
  }
  return posthogClient;
}

export function track<E extends AnalyticsEvent>(name: E["name"], props: E["props"]): void {
  void ensurePosthog().then((client) => {
    if (client) {
      client.capture(name, props);
    } else if (process.env.NODE_ENV === "development") {
      console.debug(`[analytics] ${name}`, props);
    }
  });
}
