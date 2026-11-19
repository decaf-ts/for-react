/**
 * SAA-2042 — `/scrum` demo board states, host controls, filtering,
 * assignment and sprint switching.
 *
 * Ports the seven Angular `scrum.stories.ts` scenarios (Overview, Backlog,
 * SprintBoard, Empty, ReadOnly, Loading, ErrorState) onto the for-react demo
 * toolbar controls. The demo composes selector + backlog + sprint board on one
 * route, so the separate Backlog/SprintBoard stories are verified as scoping
 * states of the single composed route rather than as isolated templates —
 * the acknowledged deviation from Storybook. SAA-2050 adds the rendered proof
 * that the per-card assignment select never selects or drags its card.
 */
import { expect, test } from "@playwright/test";
import {
  assignSelect,
  backlog,
  backlogCardIds,
  backlogCardSequence,
  boardCardIds,
  boardCardSequence,
  boardColumnCardIds,
  focusBacklogCard,
  focusBoardCard,
  lastEvent,
  openScrum,
  pressBacklogCard,
  pressBoardCard,
  resetScrum,
  sprintBoard,
  sprintSelector,
} from "./scrum-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openScrum(page);
});

test.afterEach(async ({ page }) => {
  await resetScrum(page).catch(() => undefined);
});

test("overview renders sprint-1 with four backlog and four sprint cards", async ({
  page,
}) => {
  await expect(sprintSelector(page)).toHaveValue("sprint-1");
  await expect(lastEvent(page)).toHaveText("No scrum event yet.");

  expect(await backlogCardSequence(page)).toEqual([
    "task-1",
    "task-2",
    "task-3",
    "task-4",
  ]);
  expect(await boardCardSequence(page)).toEqual([
    "task-8",
    "task-6",
    "task-7",
    "task-5",
  ]);
  await expect(
    sprintBoard(page).locator(".dcf-scrum-sprint-board-host")
  ).toHaveAttribute("data-sprint-id", "sprint-1");
  await expect(sprintBoard(page).locator(".dcf-kanban-column")).toHaveCount(4);
  await expect(
    sprintBoard(page).locator(".dcf-kanban-column__title")
  ).toHaveText(["To do", "In progress", "Review", "Done"]);
});

test("backlog view shows only unscheduled tasks in one backlog column", async ({
  page,
}) => {
  await expect(backlog(page).locator(".dcf-kanban-column")).toHaveCount(1);
  await expect(
    backlog(page).locator('[data-column-id="backlog"] .dcf-kanban-column__title')
  ).toHaveText("Backlog");
  expect(await backlogCardSequence(page)).toEqual([
    "task-1",
    "task-2",
    "task-3",
    "task-4",
  ]);
  for (const scheduled of ["task-5", "task-6", "task-7", "task-8"]) {
    await expect(
      backlog(page).locator(`[data-kanban-task-id="${scheduled}"]`)
    ).toHaveCount(0);
  }
});

test("sprint board view is scoped to the selected sprint", async ({ page }) => {
  await expect(sprintBoard(page).locator(".dcf-kanban-column")).toHaveCount(4);
  expect(await boardCardSequence(page)).toEqual([
    "task-8",
    "task-6",
    "task-7",
    "task-5",
  ]);

  await sprintSelector(page).selectOption("sprint-2");

  await expect(lastEvent(page)).toHaveText("sprintSelected: sprint-2");
  await expect(
    sprintBoard(page).locator(".dcf-scrum-sprint-board-host")
  ).toHaveAttribute("data-sprint-id", "sprint-2");
  expect(await boardCardSequence(page)).toEqual(["task-9", "task-10"]);
  // The backlog is unaffected by the sprint selection.
  await expect(backlogCardIds(page)).toHaveCount(4);
});

test("selecting an empty sprint shows the empty sprint state", async ({
  page,
}) => {
  await sprintSelector(page).selectOption("sprint-3");

  await expect(lastEvent(page)).toHaveText("sprintSelected: sprint-3");
  await expect(boardCardIds(page)).toHaveCount(0);
  await expect(
    sprintBoard(page).locator(".dcf-kanban-column__empty")
  ).toHaveCount(4);
  await expect(
    sprintBoard(page).locator(".dcf-kanban-column__empty").first()
  ).toHaveText("No tasks in this sprint");
  await expect(backlogCardIds(page)).toHaveCount(4);
});

test("assigning every backlog task empties the backlog", async ({ page }) => {
  for (const taskId of ["task-1", "task-2", "task-3", "task-4"]) {
    await assignSelect(page, taskId).selectOption("sprint-1");
    await expect(
      page.locator(`select[data-scrum-assign-task-id="${taskId}"]`)
    ).toHaveCount(0);
  }

  await expect(lastEvent(page)).toContainText(
    "sprintAssignmentRequested: task-4 -> sprint-1"
  );
  await expect(backlogCardIds(page)).toHaveCount(0);
  await expect(
    backlog(page).locator(".dcf-kanban-column__empty")
  ).toHaveText("No backlog tasks");
  await expect(boardCardIds(page)).toHaveCount(8);
});

test("sprint selector change swaps the board", async ({ page }) => {
  await sprintSelector(page).selectOption("sprint-2");
  await expect(lastEvent(page)).toHaveText("sprintSelected: sprint-2");
  await expect(boardCardIds(page)).toHaveCount(2);

  await sprintSelector(page).selectOption("");
  await expect(lastEvent(page)).toHaveText("sprintSelected: none");
  await expect(page.locator('[data-testid="scrum-no-sprint"]')).toBeVisible();
  await expect(sprintBoard(page)).toHaveCount(0);

  await sprintSelector(page).selectOption("sprint-1");
  await expect(lastEvent(page)).toHaveText("sprintSelected: sprint-1");
  await expect(sprintBoard(page)).toHaveAttribute("data-testid", "scrum-sprint-board");
  await expect(boardCardIds(page)).toHaveCount(4);
});

test("backlog assignment emits and moves the task into the chosen sprint", async ({
  page,
}) => {
  const select = assignSelect(page, "task-1");
  await expect(select).toHaveValue("");

  await select.selectOption("sprint-1");

  await expect(lastEvent(page)).toHaveText(
    "sprintAssignmentRequested: task-1 -> sprint-1"
  );
  await expect(backlogCardIds(page)).toHaveCount(3);
  await expect(boardCardIds(page)).toHaveCount(5);
  await expect(boardColumnCardIds(page, "todo")).toHaveCount(2);
  await expect(
    sprintBoard(page).locator('[data-kanban-task-id="task-1"]')
  ).toBeVisible();
});

test("clicking the assignment select neither selects nor drags the card", async ({
  page,
}) => {
  const select = assignSelect(page, "task-1");

  await select.dispatchEvent("pointerdown");
  await select.dispatchEvent("click");

  await expect(lastEvent(page)).toHaveText("No scrum event yet.");
  const card = backlog(page).locator('[data-kanban-task-id="task-1"]');
  await expect(card).toHaveAttribute("aria-grabbed", "false");
  await expect(card).not.toHaveAttribute("aria-current");
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(select).toHaveValue("");
});

test("sprint board keyboard move commits through the kanban layer", async ({
  page,
}) => {
  await focusBoardCard(page, "task-8");
  await pressBoardCard(page, "task-8", "Space");
  await pressBoardCard(page, "task-8", "ArrowRight");
  await pressBoardCard(page, "task-8", "Enter");

  await expect(lastEvent(page)).toContainText(
    "taskMoved: task-8 -> doing @ 0"
  );
  await expect(boardColumnCardIds(page, "doing")).toHaveCount(2);
  await expect(
    page.locator('[data-column-id="doing"] [data-kanban-task-id="task-8"]')
  ).toBeVisible();
});

test("sprint board keyboard reorder commits within a column", async ({
  page,
}) => {
  await assignSelect(page, "task-1").selectOption("sprint-1");
  await expect(boardColumnCardIds(page, "todo")).toHaveCount(2);

  await focusBoardCard(page, "task-1");
  await pressBoardCard(page, "task-1", "Space");
  await pressBoardCard(page, "task-1", "ArrowDown");
  await pressBoardCard(page, "task-1", "Enter");

  await expect(lastEvent(page)).toContainText("taskReordered: task-1");
  await expect
    .poll(async () => (await boardCardSequence(page)).slice(0, 2))
    .toEqual(["task-8", "task-1"]);
});

test("read-only disables handles and assignment, and rejects mutation", async ({
  page,
}) => {
  await page.locator('[data-testid="scrum-readonly"]').check();

  await expect(page.locator(".dcf-kanban-card__handle")).toHaveCount(0);
  const selects = page.locator("select[data-scrum-assign-task-id]");
  await expect(selects).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(selects.nth(index)).toBeDisabled();
  }

  await focusBacklogCard(page, "task-1");
  await pressBacklogCard(page, "task-1", "Space");

  await expect(lastEvent(page)).toContainText(
    "backlogReorderRejected: task-1 readonly"
  );
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
});

test("loading replaces both views and disables the selector", async ({
  page,
}) => {
  await page.locator('[data-testid="scrum-loading"]').check();

  await expect(sprintSelector(page)).toBeDisabled();
  await expect(sprintSelector(page)).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Loading sprints..." })
  ).toBeVisible();
  await expect(backlog(page).locator(".dcf-kanban__state--loading")).toContainText(
    "Loading backlog..."
  );
  await expect(
    sprintBoard(page).locator(".dcf-kanban__state--loading")
  ).toContainText("Loading sprint...");
  await expect(page.locator("[data-kanban-task-id]")).toHaveCount(0);

  await page.locator('[data-testid="scrum-loading"]').uncheck();
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
});

test("error raises alerts and retry clears both views", async ({ page }) => {
  await page.locator('[data-testid="scrum-error"]').check();

  const alerts = page.getByRole("alert");
  await expect(alerts).toHaveCount(2);
  await expect(alerts.first()).toContainText(
    "The sprint could not be loaded. Try again."
  );

  await alerts.first().getByRole("button", { name: "Retry" }).click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(lastEvent(page)).toHaveText("retryRequested");
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
});

test("search filter scopes both views and restores on clear", async ({
  page,
}) => {
  const search = page.locator('[data-testid="scrum-search"]');

  await search.fill("Ada");
  await expect(backlogCardIds(page)).toHaveCount(2);
  expect(await backlogCardSequence(page)).toEqual(["task-1", "task-4"]);
  await expect(boardCardIds(page)).toHaveCount(2);
  expect(await boardCardSequence(page)).toEqual(["task-8", "task-5"]);

  await search.fill("");
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);

  await search.fill("zzzz-no-match");
  await expect(backlogCardIds(page)).toHaveCount(0);
  await expect(boardCardIds(page)).toHaveCount(0);
  await expect(
    backlog(page).locator(".dcf-kanban-column__empty")
  ).toHaveText("No backlog tasks");
  await expect(
    sprintBoard(page).locator(".dcf-kanban-column__empty")
  ).toHaveCount(4);
});
