/**
 * SAA-2010 — `/kanban` keyboard-only flow: Tab to a card, Space grab, arrow
 * preview, Enter drop/select/edit, Escape cancel and spoken WIP rejection.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  cardIds,
  focusCard,
  lastEvent,
  live,
  openKanban,
  resetBoard,
  tabToFirstCard,
} from "./kanban-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openKanban(page);
});

test.afterEach(async ({ page }) => {
  await resetBoard(page).catch(() => undefined);
});

async function activeTaskId(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.dataset["kanbanTaskId"] ??
      null
  );
}

test("Tab reaches a card; Space, arrows and Enter reorder it", async ({
  page,
}) => {
  await tabToFirstCard(page);
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toBeFocused();

  await page.keyboard.press("Space");
  await expect(live(page)).toContainText("picked up in");
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    "aria-grabbed",
    "true"
  );

  await page.keyboard.press("ArrowDown");
  await expect(live(page)).toContainText("position 2");

  await page.keyboard.press("Enter");
  await expect(lastEvent(page)).toContainText("taskReordered: task-1");
  await expect(live(page)).toContainText("moved to");
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    "aria-grabbed",
    "false"
  );
  await expect.poll(() => activeTaskId(page)).toBe("task-1");
});

test("Space, ArrowRight and Enter move a card across columns", async ({
  page,
}) => {
  await focusCard(page, "task-6");
  await page.keyboard.press("Space");
  await expect(live(page)).toContainText("picked up in");

  await page.keyboard.press("ArrowRight");
  await expect(live(page)).toContainText("Done, position 1");

  await page.keyboard.press("Enter");
  await expect(lastEvent(page)).toContainText("taskMoved: task-6 -> done");
  await expect(live(page)).toContainText("moved to Done");
  await expect(cardIds(page, "done")).toHaveCount(2);
  await expect(
    page.locator('[data-column-id="done"] [data-kanban-task-id="task-6"]')
  ).toBeVisible();
});

test("Escape cancels a preview without moving the card", async ({ page }) => {
  await focusCard(page, "task-1");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");

  await expect(lastEvent(page)).toContainText(
    "taskMoveRejected: task-1 cancelled"
  );
  await expect(live(page)).toContainText("Move cancelled");
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    "aria-grabbed",
    "false"
  );
  await expect(lastEvent(page)).not.toContainText("taskReordered");
});

test("Enter selects and a second Enter requests edit", async ({ page }) => {
  await focusCard(page, "task-1");

  await page.keyboard.press("Enter");
  await expect(lastEvent(page)).toContainText("taskSelected: task-1");
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    "aria-current",
    "true"
  );

  await page.keyboard.press("Enter");
  await expect(lastEvent(page)).toContainText("taskEditRequested: task-1");
});

test("E requests edit on the focused card", async ({ page }) => {
  await focusCard(page, "task-2");

  await page.keyboard.press("e");

  await expect(lastEvent(page)).toContainText("taskEditRequested: task-2");
});

test("a WIP-limited cross-column move is rejected with a spoken reason", async ({
  page,
}) => {
  await focusCard(page, "task-1");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");

  await expect(lastEvent(page)).toContainText(
    "taskMoveRejected: task-1 wip-limit"
  );
  await expect(live(page)).toContainText("work-in-progress limit");

  await page.keyboard.press("Escape");
  await expect(lastEvent(page)).toContainText("cancelled");
});
