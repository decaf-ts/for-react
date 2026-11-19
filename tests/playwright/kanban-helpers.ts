/**
 * Shared helpers for the SAA-2010 `/kanban` browser verification.
 * The for-react demo has no login gate; Playwright's `webServer` serves Vite.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export const KANBAN_ROUTE = "/kanban";

export async function openKanban(page: Page): Promise<void> {
  await page.goto(KANBAN_ROUTE);
  await expect(
    page.locator('[data-testid="kanban-board"] .dcf-kanban')
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(7);
}

export function lastEvent(page: Page): Locator {
  return page.locator('[data-testid="kanban-last-event"]');
}

export function column(page: Page, columnId: string): Locator {
  return page.locator(`[data-column-id="${columnId}"]`);
}

export function dropzone(page: Page, columnId: string): Locator {
  return column(page, columnId).locator(".dcf-kanban-column__dropzone");
}

export function cardIds(page: Page, columnId: string): Locator {
  return column(page, columnId).locator("[data-kanban-task-id]");
}

export function live(page: Page): Locator {
  return page.locator(".dcf-kanban__live");
}

export async function resetBoard(page: Page): Promise<void> {
  await page.locator('[data-testid="kanban-reset"]').click();
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(7);
}

export async function focusCard(page: Page, cardId: string): Promise<void> {
  const card = page.locator(`[data-kanban-task-id="${cardId}"]`);
  await card.focus();
  await expect(card).toBeFocused();
}

async function activeTaskId(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.dataset["kanbanTaskId"] ??
      null
  );
}

export async function tabToFirstCard(page: Page): Promise<void> {
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  );
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press("Tab");
    if (await activeTaskId(page)) {
      return;
    }
  }
  throw new Error("Could not reach a Kanban card with Tab");
}

/**
 * Real pointer drag from a card's drag handle to a target element. Mirrors the
 * Angular board helper: move a few pixels to clear the 4px activation
 * constraint, then travel to the target and release.
 */
export async function dragHandleTo(
  page: Page,
  cardId: string,
  target: Locator,
  options: { targetY?: "top" | "middle" | "bottom"; holdMs?: number } = {}
): Promise<void> {
  await page
    .locator('[data-testid="kanban-board"]')
    .scrollIntoViewIfNeeded();
  const handle = page.locator(
    `[data-kanban-task-id="${cardId}"] .dcf-kanban-card__handle`
  );
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error(`No drag handle box for ${cardId}`);
  }
  const targetBox = await target.boundingBox();
  if (!targetBox) {
    throw new Error("No target box for drop");
  }
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 6 });
  await page.waitForTimeout(120);
  const y =
    options.targetY === "top"
      ? targetBox.y + 8
      : options.targetY === "bottom"
        ? targetBox.y + targetBox.height - 8
        : targetBox.y + targetBox.height / 2;
  await page.mouse.move(targetBox.x + targetBox.width / 2, y, { steps: 20 });
  await page.waitForTimeout(options.holdMs ?? 200);
  await page.mouse.up();
  await page.waitForTimeout(250);
}
