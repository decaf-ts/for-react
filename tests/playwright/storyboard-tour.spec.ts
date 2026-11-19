/**
 * SAA-2055 — `/storyboard` feature tour and host controls.
 *
 * Verifies the four-step feature tour, the soft-spotlight non-blocking overlay,
 * the progress indicator, the active class, the lifecycle events and the demo's
 * start/next/previous/abort/end controls.
 */
import { expect, test } from "@playwright/test";
import {
  abortControl,
  activeStep,
  bubblePrimary,
  bubbleProgress,
  clickBubbleNext,
  clickBubblePrevious,
  endControl,
  host,
  lastEvent,
  nextControl,
  openStoryboard,
  overlay,
  previousControl,
  scenarioSelect,
  startControl,
  startScenario,
  status,
  STATUS,
} from "./storyboard-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStoryboard(page);
});

test("exposes the seven scenario values and the demo status/testid surface", async ({
  page,
}) => {
  const values = await scenarioSelect(page)
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
  expect(values).toEqual([
    "feature-tour",
    "placements",
    "timeout",
    "click",
    "input",
    "keys",
    "labels",
  ]);

  for (const id of [
    "storyboard-start",
    "storyboard-next",
    "storyboard-previous",
    "storyboard-abort",
    "storyboard-end",
    "storyboard-status",
    "storyboard-active-step",
    "storyboard-last-event",
  ]) {
    await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
  }
});

test("runs the four-step feature tour with a non-blocking soft spotlight overlay", async ({
  page,
}) => {
  await startScenario(page, "feature-tour");

  await expect(status(page)).toHaveText(STATUS.running);
  await expect(activeStep(page)).toHaveText("Welcome to the feature page");
  await expect(lastEvent(page)).toContainText("Tutorial started");
  await expect(host(page)).toHaveClass(/dcf-storyboard-tutorial--active/);
  await expect(overlay(page)).toHaveCSS("pointer-events", "none");
  await expect(bubbleProgress(page)).toHaveText("1 / 4");
  await expect(bubblePrimary(page)).toHaveText("Next step");

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Type your name");
  await expect(bubbleProgress(page)).toHaveText("2 / 4");
  await expect(lastEvent(page)).toContainText("Now on step");

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Confirm the value");
  await expect(bubbleProgress(page)).toHaveText("3 / 4");

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Tour complete");
  await expect(bubbleProgress(page)).toHaveText("4 / 4");
  await expect(bubblePrimary(page)).toHaveText("End tutorial");

  await bubblePrimary(page).click();

  await expect(status(page)).toHaveText(STATUS.completed);
  await expect(activeStep(page)).toHaveText("No step is active.");
  await expect(lastEvent(page)).toContainText("Tutorial finished: Completed");
  await expect(host(page)).not.toHaveClass(/dcf-storyboard-tutorial--active/);
});

test("walks backwards and forwards between feature tour steps", async ({
  page,
}) => {
  await startScenario(page, "feature-tour");

  await clickBubbleNext(page);
  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Confirm the value");
  await expect(bubbleProgress(page)).toHaveText("3 / 4");

  await clickBubblePrevious(page);
  await expect(activeStep(page)).toHaveText("Type your name");
  await expect(bubbleProgress(page)).toHaveText("2 / 4");

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Confirm the value");
});

test("drives start, next, previous, abort and end from the demo controls", async ({
  page,
}) => {
  await expect(startControl(page)).toBeEnabled();
  await expect(nextControl(page)).toBeDisabled();
  await expect(previousControl(page)).toBeDisabled();
  await expect(abortControl(page)).toBeDisabled();
  await expect(endControl(page)).toBeDisabled();

  await startScenario(page, "feature-tour");
  await expect(startControl(page)).toBeDisabled();
  await expect(nextControl(page)).toBeEnabled();

  await nextControl(page).click();
  await expect(activeStep(page)).toHaveText("Type your name");

  await previousControl(page).click();
  await expect(activeStep(page)).toHaveText("Welcome to the feature page");

  await abortControl(page).click();
  await expect(status(page)).toHaveText(STATUS.aborted);
  await expect(activeStep(page)).toHaveText("No step is active.");
  await expect(lastEvent(page)).toContainText("Tutorial finished: Aborted");
  await expect(startControl(page)).toBeEnabled();
  await expect(nextControl(page)).toBeDisabled();

  await startControl(page).click();
  await expect(status(page)).toHaveText(STATUS.running);

  await endControl(page).click();
  await expect(status(page)).toHaveText(STATUS.completed);
  await expect(lastEvent(page)).toContainText("Tutorial finished: Completed");
});
