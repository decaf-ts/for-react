/**
 * Shared helpers for the SAA-2042 `/scrum` browser verification.
 * The for-react demo has no login gate; Playwright's `webServer` serves Vite.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export const SCRUM_ROUTE = "/scrum";

export async function openScrum(page: Page): Promise<void> {
  await page.goto(SCRUM_ROUTE);
  await expect(page.locator('[data-testid="scrum-backlog"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.locator('[data-testid="scrum-sprint-selector"] select')
  ).toBeVisible();
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
}

export function lastEvent(page: Page): Locator {
  return page.locator('[data-testid="scrum-last-event"]');
}

export function sprintSelector(page: Page): Locator {
  return page.locator('[data-testid="scrum-sprint-selector"] select');
}

export function backlog(page: Page): Locator {
  return page.locator('[data-testid="scrum-backlog"]');
}

export function sprintBoard(page: Page): Locator {
  return page.locator('[data-testid="scrum-sprint-board"]');
}

export function backlogCardIds(page: Page): Locator {
  return backlog(page).locator("[data-scrum-backlog-task-id]");
}

export function boardCardIds(page: Page): Locator {
  return sprintBoard(page).locator("[data-kanban-task-id]");
}

export async function backlogCardSequence(page: Page): Promise<string[]> {
  return backlogCardIds(page).evaluateAll((nodes) =>
    nodes.map(
      (node) => (node as HTMLElement).dataset["scrumBacklogTaskId"] ?? ""
    )
  );
}

export async function boardCardSequence(page: Page): Promise<string[]> {
  return boardCardIds(page).evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset["kanbanTaskId"] ?? "")
  );
}

export function assignSelect(page: Page, taskId: string): Locator {
  return page.locator(`select[data-scrum-assign-task-id="${taskId}"]`);
}

export function boardColumn(page: Page, columnId: string): Locator {
  return sprintBoard(page).locator(`[data-column-id="${columnId}"]`);
}

export function boardColumnCardIds(
  page: Page,
  columnId: string
): Locator {
  return boardColumn(page, columnId).locator("[data-kanban-task-id]");
}

export async function resetScrum(page: Page): Promise<void> {
  await page.locator('[data-testid="scrum-reset"]').click();
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
}

export async function focusBacklogCard(
  page: Page,
  cardId: string
): Promise<void> {
  const card = backlog(page).locator(`[data-kanban-task-id="${cardId}"]`);
  await card.focus();
  await expect(card).toBeFocused();
}

export async function focusBoardCard(
  page: Page,
  cardId: string
): Promise<void> {
  const card = sprintBoard(page).locator(
    `[data-kanban-task-id="${cardId}"]`
  );
  await card.focus();
  await expect(card).toBeFocused();
}

/**
 * Presses a keyboard key against a freshly resolved card. Cards can be
 * re-rendered (and occasionally replaced) between preview and commit, so the
 * locator is re-evaluated for every step.
 */
export async function pressBacklogCard(
  page: Page,
  cardId: string,
  key: string
): Promise<void> {
  await backlog(page)
    .locator(`[data-kanban-task-id="${cardId}"]`)
    .press(key);
}

export async function pressBoardCard(
  page: Page,
  cardId: string,
  key: string
): Promise<void> {
  await sprintBoard(page)
    .locator(`[data-kanban-task-id="${cardId}"]`)
    .press(key);
}
