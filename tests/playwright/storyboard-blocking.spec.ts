/**
 * SAA-2055 — `/storyboard` whitelist blocking.
 *
 * A step with no soft-spotlight focus blocks the whole page except its
 * whitelisted selectors. This suite proves the blocking overlay really
 * intercepts pointer events for non-whitelisted controls while the whitelisted
 * target keeps receiving them through the clip-path hole.
 */
import { expect, test } from "@playwright/test";
import {
  abortControl,
  activeStep,
  clickBubbleNext,
  clickThroughOverlay,
  confirmButton,
  confirmedValue,
  nameField,
  openStoryboard,
  overlay,
  playground,
  startScenario,
  status,
  STATUS,
} from "./storyboard-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStoryboard(page);
});

test("blocks a non-whitelisted page control while the whitelisted target stays interactive", async ({
  page,
}) => {
  await startScenario(page, "placements");
  await expect(activeStep(page)).toHaveText("Top placement");
  await expect(overlay(page)).toHaveCSS("pointer-events", "auto");

  // The playground (and its fields/confirm button) is whitelisted on step 1,
  // so the pointer reaches them through the overlay's clip-path hole.
  await nameField(page).fill("Ada");
  await expect(nameField(page)).toHaveValue("Ada");
  await confirmButton(page).click();
  await expect(confirmedValue(page)).toContainText("Ada");

  // The tour controls live outside that whitelist, so the overlay must swallow
  // the click and the run must keep going.
  await clickThroughOverlay(page, abortControl(page));
  await page.waitForTimeout(150);
  await expect(status(page)).toHaveText(STATUS.running);
  await expect(activeStep(page)).toHaveText("Top placement");
});

test("blocks page controls and allows the name field once the whitelist changes", async ({
  page,
}) => {
  await startScenario(page, "placements");
  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Bottom placement");

  // Step 2 whitelists only the name field.
  await nameField(page).fill("Ada");
  await expect(nameField(page)).toHaveValue("Ada");

  await clickThroughOverlay(page, abortControl(page));
  await page.waitForTimeout(150);
  await expect(status(page)).toHaveText(STATUS.running);
  await expect(activeStep(page)).toHaveText("Bottom placement");

  // The playground is no longer whitelisted but remains visible under the
  // overlay.
  await expect(playground(page)).toBeVisible();
});
