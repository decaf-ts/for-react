/**
 * SAA-2010 — `/kanban` demo board states, host controls, filtering and WIP.
 *
 * Ports the eight Angular story scenarios (Default, Empty, ReadOnly, Disabled,
 * Loading, ErrorState, WipLimitReached, Filtered) onto the for-react demo
 * toolbar controls. The demo has no storybook and no login gate.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  cardIds,
  column,
  dragHandleTo,
  dropzone,
  focusCard,
  lastEvent,
  live,
  openKanban,
  resetBoard,
} from "./kanban-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openKanban(page);
});

test.afterEach(async ({ page }) => {
  await resetBoard(page).catch(() => undefined);
});

function countOf(page: Page, columnId: string) {
  return column(page, columnId).locator(".dcf-kanban-column__count");
}

test("default board renders four columns and seven cards", async ({ page }) => {
  await expect(page.locator(".dcf-kanban-column")).toHaveCount(4);
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(7);
  await expect(page.locator(".dcf-kanban-column__title")).toHaveText([
    "To do",
    "In progress",
    "Review",
    "Done",
  ]);
  await expect(cardIds(page, "todo")).toHaveCount(3);
  await expect(cardIds(page, "doing")).toHaveCount(2);
  await expect(cardIds(page, "review")).toHaveCount(1);
  await expect(cardIds(page, "done")).toHaveCount(1);
  await expect(
    page.locator('[data-testid="kanban-board"] .dcf-kanban')
  ).toHaveAttribute("aria-label", "Sprint board");
});

test("add, reset and clear drive the demo task list", async ({ page }) => {
  await page.locator('[data-testid="kanban-add"]').click();
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(8);
  await expect(cardIds(page, "todo")).toHaveCount(4);
  await expect(page.locator('[data-kanban-task-id="task-8"]')).toContainText(
    "New task 8"
  );
  await expect(lastEvent(page)).toContainText("taskAdded: task-8");

  await resetBoard(page);
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(7);
  await expect(lastEvent(page)).toContainText("Board reset.");

  await page.locator('[data-testid="kanban-clear"]').click();
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(0);
  await expect(page.locator(".dcf-kanban-column__empty")).toHaveCount(4);
  await expect(lastEvent(page)).toContainText("All tasks cleared.");
});

test("read-only removes drag handles but keeps selection", async ({ page }) => {
  await page.locator('[data-testid="kanban-readonly"]').check();

  await expect(page.locator(".dcf-kanban-card__handle")).toHaveCount(0);
  await expect(page.locator(".dcf-kanban--readonly")).toBeVisible();
  await page.locator('[data-kanban-task-id="task-1"]').click();
  await expect(lastEvent(page)).toContainText("taskSelected: task-1");
});

test("disabled removes handles and suppresses selection", async ({ page }) => {
  await resetBoard(page);
  await page.locator('[data-testid="kanban-disabled"]').check();

  await expect(page.locator(".dcf-kanban-card__handle")).toHaveCount(0);
  const first = page.locator('[data-kanban-task-id="task-1"]');
  await expect(first).not.toHaveAttribute("tabindex", /.*/);
  await first.click();
  await expect(lastEvent(page)).toHaveText("Board reset.");
});

test("loading replaces the board and restores it", async ({ page }) => {
  await page.locator('[data-testid="kanban-loading"]').check();

  await expect(page.locator(".dcf-kanban__state--loading")).toBeVisible();
  await expect(page.locator(".dcf-kanban__state--loading")).toContainText(
    "Loading tasks..."
  );
  await expect(page.locator(".dcf-kanban__board")).toHaveCount(0);

  await page.locator('[data-testid="kanban-loading"]').uncheck();
  await expect(page.locator(".dcf-kanban__board")).toBeVisible();
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(7);
});

test("error state raises an alert and retry clears it", async ({ page }) => {
  await page.locator('[data-testid="kanban-error"]').check();

  const alert = page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Unable to load tasks.");
  await expect(page.locator(".dcf-kanban__board")).toHaveCount(0);

  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.locator(".dcf-kanban__board")).toBeVisible();
  await expect(lastEvent(page)).toContainText("retryRequested");
});

test("filter keeps four columns and only Ada cards", async ({ page }) => {
  await page.locator('[data-testid="kanban-filter"]').check();

  await expect(page.locator(".dcf-kanban-column")).toHaveCount(4);
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(3);
  for (const id of ["task-1", "task-4", "task-7"]) {
    await expect(page.locator(`[data-kanban-task-id="${id}"]`)).toBeVisible();
  }
  for (const id of ["task-2", "task-3", "task-5", "task-6"]) {
    await expect(page.locator(`[data-kanban-task-id="${id}"]`)).toHaveCount(0);
  }
  await expect(countOf(page, "todo")).toHaveText("1 / 4");
  await expect(countOf(page, "doing")).toHaveText("1 / 2");
  await expect(countOf(page, "review")).toHaveText("0");
});

test("a column that exceeds its WIP limit shows the over-limit state", async ({
  page,
}) => {
  // The demo toolbar only appends to `todo`, whose WIP limit is 4. Adding two
  // cards drives that column past the limit; the `doing` column is protected
  // by the board itself, so it can never be host-committed over its limit.
  await page.locator('[data-testid="kanban-add"]').click();
  await page.locator('[data-testid="kanban-add"]').click();

  await expect(cardIds(page, "todo")).toHaveCount(5);
  await expect(column(page, "todo")).toHaveClass(
    /dcf-kanban-column--over-limit/
  );
  await expect(dropzone(page, "todo")).toHaveClass(
    /dcf-kanban-column__dropzone--over-limit/
  );
  await expect(countOf(page, "todo")).toHaveText("5 / 4");
  await expect(countOf(page, "doing")).toHaveText("2 / 2");
});

test("moving a third card into the full doing column is rejected", async ({
  page,
}) => {
  await focusCard(page, "task-1");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");

  await expect(lastEvent(page)).toContainText(
    "taskMoveRejected: task-1 wip-limit"
  );
  await expect(live(page)).toContainText("work-in-progress limit");
  await expect(cardIds(page, "todo")).toHaveCount(3);
  await expect(cardIds(page, "doing")).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(lastEvent(page)).toContainText("cancelled");
});

test("a pointer drop into the full doing column is rejected with the WIP reason", async ({
  page,
}) => {
  await dragHandleTo(page, "task-1", dropzone(page, "doing"));

  await expect(lastEvent(page)).toContainText(
    "taskMoveRejected: task-1 wip-limit"
  );
  await expect(live(page)).toContainText("work-in-progress limit");
  await expect(cardIds(page, "todo")).toHaveCount(3);
  await expect(cardIds(page, "doing")).toHaveCount(2);
  await expect(
    page.locator('[data-column-id="todo"] [data-kanban-task-id="task-1"]')
  ).toBeVisible();
});
