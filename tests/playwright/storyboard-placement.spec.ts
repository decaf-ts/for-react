/**
 * SAA-2055 — `/storyboard` instruction placement values.
 *
 * Exercises all five `TutorialPlacement` values (top, bottom, left, right,
 * center) and proves the bubble is actually positioned on the requested side of
 * its anchor, not just labelled with the placement.
 */
import { expect, test } from "@playwright/test";
import {
  activeStep,
  bubble,
  bubbleProgress,
  bubbleTransform,
  clickBubbleNext,
  confirmButton,
  nameField,
  notesField,
  openStoryboard,
  playground,
  startScenario,
} from "./storyboard-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStoryboard(page);
});

test("positions the bubble for top, bottom, left, right and center placements", async ({
  page,
}) => {
  await startScenario(page, "placements");

  await expect(activeStep(page)).toHaveText("Top placement");
  await expect(bubbleProgress(page)).toHaveText("1 / 5");
  await expect(bubble(page)).toContainText(
    "The instruction bubble is anchored above the playground."
  );
  expect(await bubbleTransform(page)).toBe("translateY(-100%)");
  {
    const anchor = await playground(page).boundingBox();
    const box = await bubble(page).boundingBox();
    expect(anchor).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(anchor!.y);
  }

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Bottom placement");
  await expect(bubbleProgress(page)).toHaveText("2 / 5");
  expect(await bubbleTransform(page)).toBe("");
  {
    const anchor = await nameField(page).boundingBox();
    const box = await bubble(page).boundingBox();
    expect(anchor).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(anchor!.y + anchor!.height);
  }

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Left placement");
  await expect(bubbleProgress(page)).toHaveText("3 / 5");
  expect(await bubbleTransform(page)).toBe("translateX(-100%)");
  {
    const anchor = await confirmButton(page).boundingBox();
    const box = await bubble(page).boundingBox();
    expect(anchor).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(anchor!.x);
  }

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Right placement");
  await expect(bubbleProgress(page)).toHaveText("4 / 5");
  expect(await bubbleTransform(page)).toBe("");
  {
    const anchor = await notesField(page).boundingBox();
    const box = await bubble(page).boundingBox();
    expect(anchor).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(anchor!.x + anchor!.width);
  }

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Center placement");
  await expect(bubbleProgress(page)).toHaveText("5 / 5");
  await expect(bubble(page)).toContainText(
    "The instruction bubble is centered over the tutorial."
  );
  expect(await bubbleTransform(page)).toBe("translate(-50%, -50%)");
  const inline = await bubble(page).evaluate((element) => {
    const style = (element as HTMLElement).style;
    return { top: style.top, left: style.left };
  });
  expect(inline).toEqual({ top: "50%", left: "50%" });
});
