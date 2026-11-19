/**
 * SAA-2055 — `/storyboard` pluggable step completion in a real browser.
 *
 * Covers timeout auto-advance, click completion, input `minLength` completion
 * and keyboard completion, each against the demo scenario that declares it.
 */
import { expect, test } from "@playwright/test";
import {
  activeStep,
  bubbleProgress,
  confirmButton,
  nameField,
  openStoryboard,
  startScenario,
  status,
  STATUS,
} from "./storyboard-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStoryboard(page);
});

test("auto-advances the timeout scenario without a user interaction", async ({
  page,
}) => {
  await startScenario(page, "timeout");
  await expect(bubbleProgress(page)).toHaveText("1 / 2");

  await expect(bubbleProgress(page)).toHaveText("2 / 2", { timeout: 5_000 });

  await expect(status(page)).toHaveText(STATUS.completed, { timeout: 5_000 });
  await expect(activeStep(page)).toHaveText("No step is active.");
});

test("advances when the declared click action is performed", async ({
  page,
}) => {
  await startScenario(page, "click");
  await expect(activeStep(page)).toHaveText("Confirm with a click");
  await expect(bubbleProgress(page)).toHaveText("1 / 2");

  await confirmButton(page).click();

  await expect(activeStep(page)).toHaveText("Done");
  await expect(status(page)).toHaveText(STATUS.running);
});

test("advances only after the input reaches the minimum length", async ({
  page,
}) => {
  await startScenario(page, "input");
  await expect(activeStep(page)).toHaveText("Type your name");

  await nameField(page).fill("ab");
  await page.waitForTimeout(400);
  await expect(activeStep(page)).toHaveText("Type your name");
  await expect(status(page)).toHaveText(STATUS.running);

  await nameField(page).fill("abc");
  await expect(activeStep(page)).toHaveText("Done", { timeout: 3_000 });
});

test("advances on the configured key press", async ({ page }) => {
  await startScenario(page, "keys");
  await expect(activeStep(page)).toHaveText("Confirm with the keyboard");

  await nameField(page).focus();
  await nameField(page).press("a");
  await page.waitForTimeout(200);
  await expect(activeStep(page)).toHaveText("Confirm with the keyboard");

  await nameField(page).press("Enter");
  await expect(activeStep(page)).toHaveText("Done", { timeout: 3_000 });
});
