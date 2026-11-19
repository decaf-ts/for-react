/**
 * SAA-2042 — `/scrum` accessibility contract: landmark names, select labels,
 * card roles and live-region wiring.
 */
import { expect, test } from "@playwright/test";
import {
  assignSelect,
  backlog,
  focusBacklogCard,
  lastEvent,
  openScrum,
  pressBacklogCard,
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

test("names both boards and labels the sprint and assignment selects", async ({
  page,
}) => {
  await expect(
    page.getByRole("region", { name: "Backlog tasks" })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Sprint board tasks" })
  ).toBeVisible();

  const selector = sprintSelector(page);
  await expect(selector).toHaveAccessibleName("Sprint");
  await expect(page.locator('label[for="' + (await selector.getAttribute("id")) + '"]')).toHaveText(
    "Sprint"
  );
  await expect(selector).not.toHaveAttribute("aria-busy", "true");

  const assignment = assignSelect(page, "task-1");
  await expect(assignment).toHaveAccessibleName(
    "Assign to sprint: Refine backlog ordering rules"
  );
  await expect(
    backlog(page).locator('label:has(select[data-scrum-assign-task-id="task-1"])')
  ).toContainText("Assign to sprint");
});

test("renders cards as labelled listitems with the keyboard help wired", async ({
  page,
}) => {
  const card = backlog(page).locator('[data-kanban-task-id="task-1"]');
  await expect(card).toHaveAttribute("role", "listitem");
  await expect(card).toHaveAttribute(
    "aria-label",
    "Refine backlog ordering rules, Backlog, position 1 of 4"
  );
  await expect(card).toHaveAttribute("aria-grabbed", "false");
  await expect(card).toHaveAttribute("tabindex", "0");

  const helpId = await card.getAttribute("aria-describedby");
  expect(helpId).toBeTruthy();
  await expect(page.locator(`#${helpId}`)).toContainText(
    "Press Space to pick up a card"
  );

  const boardCard = sprintBoard(page).locator(
    '[data-kanban-task-id="task-5"]'
  );
  await expect(boardCard).toHaveAttribute("role", "listitem");
  await expect(boardCard).toHaveAttribute("aria-grabbed", "false");
});

test("announces keyboard pickup through each board live region", async ({
  page,
}) => {
  const live = backlog(page).locator(".dcf-kanban__live");
  const boardLive = sprintBoard(page).locator(".dcf-kanban__live");
  await expect(live).toHaveAttribute("role", "status");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveAttribute("aria-atomic", "true");
  await expect(boardLive).toHaveAttribute("role", "status");

  await focusBacklogCard(page, "task-1");
  await pressBacklogCard(page, "task-1", "Space");

  await expect(live).toContainText(
    "Refine backlog ordering rules picked up in Backlog"
  );
  await expect(
    backlog(page).locator('[data-kanban-task-id="task-1"]')
  ).toHaveAttribute("aria-grabbed", "true");
});

test("exports the loading status through role=status and aria-describedby", async ({
  page,
}) => {
  await page.locator('[data-testid="scrum-loading"]').check();

  const selector = sprintSelector(page);
  await expect(selector).toHaveAttribute("aria-busy", "true");
  await expect(selector).toBeDisabled();

  const status = page.locator(".dcf-sprint-selector__status");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveText("Loading sprints...");
  await expect(selector).toHaveAttribute(
    "aria-describedby",
    (await status.getAttribute("id")) as string
  );

  await expect(
    page.getByRole("region", { name: "Backlog tasks" })
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("region", { name: "Sprint board tasks" })
  ).toHaveAttribute("aria-busy", "true");
});

test("read-only marks the regions aria-disabled while keeping cards focusable", async ({
  page,
}) => {
  await page.locator('[data-testid="scrum-readonly"]').check();

  await expect(
    page.getByRole("region", { name: "Backlog tasks" })
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByRole("region", { name: "Sprint board tasks" })
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    backlog(page).locator('[data-kanban-task-id="task-1"]')
  ).toHaveAttribute("tabindex", "0");

  await focusBacklogCard(page, "task-1");
  await pressBacklogCard(page, "task-1", "Space");
  await expect(lastEvent(page)).toContainText("readonly");
});
