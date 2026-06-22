/**
 * Demo-mode smoke: onboarding → reveal → start workout → log 3 sets
 * (incl. a PR) → PR card → analytics renders all 6 modules.
 * Runs headless at the 375×812 mobile viewport (playwright.config.ts).
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function tapOption(page: Page, label: string | RegExp) {
  await page.getByRole("button", { name: label }).first().click();
}

test("complete onboarding to reveal and into the app", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/onboarding");

  // Phase 1 — Körperdaten
  await tapOption(page, "Männlich");
  await page.locator('input[type="date"]').fill("1995-04-12");
  await page.getByRole("button", { name: "Weiter" }).click(); // birthdate
  await page.getByRole("button", { name: "Weiter" }).click(); // height (default)
  await page.getByRole("button", { name: "Weiter" }).click(); // weight (default)
  await tapOption(page, /13–16/); // bodyfat range

  // BMR teaser interstitial — proof of intelligence early
  await expect(page.getByText("Grundumsatz", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Phase 2 — Ziel
  await tapOption(page, "Muskelaufbau");
  await page.getByRole("button", { name: "Überspringen" }).click(); // target weight
  await page.getByRole("button", { name: "Überspringen" }).click(); // motivation

  // Medical gate
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Phase 3 — Trainingsprofil
  await tapOption(page, "2–4 Jahre");
  await page.getByRole("button", { name: "4", exact: true }).click(); // days
  await page.getByRole("button", { name: "60", exact: true }).click(); // session length
  await tapOption(page, "Gym"); // environment (preselects equipment)
  await page.getByRole("button", { name: "Weiter" }).click(); // equipment defaults
  await page.getByRole("button", { name: "Keine" }).click(); // injuries
  await page.getByRole("button", { name: "Überspringen" }).click(); // preferences

  // anchors: enter a squat anchor so the reveal shows an e1RM baseline
  await page.locator('input[placeholder="kg"]').first().fill("100");
  await page.locator('input[placeholder="Reps"]').first().fill("5");
  await page.getByRole("button", { name: "Weiter" }).click();

  // Split teaser
  await expect(page.getByText("Upper / Lower")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Phase 4 — Lifestyle
  await tapOption(page, /Überwiegend sitzend/);
  await page.getByRole("button", { name: "Weiter" }).click(); // sleep
  await page.getByRole("button", { name: "2", exact: true }).click(); // stress
  await tapOption(page, "Mischkost");
  await page.getByRole("button", { name: "4", exact: true }).click(); // meals
  await tapOption(page, "kg");

  // Reveal — real computation behind the 1.5s sequence
  await expect(page.getByTestId("reveal-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Grundumsatz (BMR)")).toBeVisible();

  // Signup wall (demo path) → paywall stub → app
  await page.getByTestId("reveal-continue").click();
  await page.getByTestId("signup-demo").click();
  await expect(page.getByTestId("paywall-continue")).toBeVisible();
  await page.getByTestId("paywall-continue").click();
  await expect(page).toHaveURL(/\/app\/today/);
});

test("start a workout, log 3 sets incl. PR, see the PR card", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/app/train");
  // The demo seed creates history; the freshly generated plan renders day cards.
  await page.getByRole("button", { name: "Starten" }).first().click();
  await expect(page).toHaveURL(/\/app\/train\/player/);

  // Log 3 working sets; crank the weight far above history → guaranteed PR.
  const logSet = page.getByTestId("log-set");
  const plus = page.getByRole("button", { name: "Gewicht erhöhen" });
  for (let i = 0; i < 40; i++) await plus.click();
  await logSet.click();
  await page.getByRole("button", { name: "Pause beenden" }).click();
  await logSet.click();
  await page.getByRole("button", { name: "Pause beenden" }).click();
  await logSet.click();

  await page.getByTestId("finish-workout").click();
  await expect(page.getByText("Session abgeschlossen")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("pr-card")).toBeVisible();
});

test("analytics renders all six modules", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/app/analytics");
  await expect(page.getByTestId("module-readiness")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("module-trajectory")).toBeVisible();
  await expect(page.getByTestId("module-report")).toBeVisible();
  await expect(page.getByTestId("module-heatmap")).toBeVisible();
  await expect(page.getByTestId("module-bodycomp")).toBeVisible();
  await expect(page.getByTestId("module-plateau")).toBeVisible();
});
