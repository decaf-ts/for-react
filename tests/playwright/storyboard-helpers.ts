/**
 * Shared helpers for the SAA-2055 `/storyboard` browser verification.
 * The for-react demo has no login gate; Playwright's `webServer` serves Vite on
 * `FOR_REACT_E2E_PORT` (8111 by default).
 */
import { expect, type Locator, type Page } from "@playwright/test";

export const STORYBOARD_ROUTE = "/storyboard";

export type ScenarioKey =
  | "feature-tour"
  | "placements"
  | "timeout"
  | "click"
  | "input"
  | "keys"
  | "labels";

export const STATUS = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  aborted: "Aborted",
} as const;

export const STATUS_PT = {
  idle: "Inativo",
  running: "Em curso",
  completed: "Concluído",
  aborted: "Abortado",
} as const;

export async function openStoryboard(page: Page): Promise<void> {
  await page.goto(STORYBOARD_ROUTE);
  await expect(scenarioSelect(page)).toBeVisible({ timeout: 30_000 });
  await expect(status(page)).toHaveText(STATUS.idle);
}

export function scenarioSelect(page: Page): Locator {
  return page.locator('[data-testid="storyboard-scenario"]');
}

export function startControl(page: Page): Locator {
  return page.locator('[data-testid="storyboard-start"]');
}

export function nextControl(page: Page): Locator {
  return page.locator('[data-testid="storyboard-next"]');
}

export function previousControl(page: Page): Locator {
  return page.locator('[data-testid="storyboard-previous"]');
}

export function abortControl(page: Page): Locator {
  return page.locator('[data-testid="storyboard-abort"]');
}

export function endControl(page: Page): Locator {
  return page.locator('[data-testid="storyboard-end"]');
}

export function status(page: Page): Locator {
  return page.locator('[data-testid="storyboard-status"]');
}

export function activeStep(page: Page): Locator {
  return page.locator('[data-testid="storyboard-active-step"]');
}

export function lastEvent(page: Page): Locator {
  return page.locator('[data-testid="storyboard-last-event"]');
}

export function host(page: Page): Locator {
  return page.locator(".dcf-storyboard-tutorial");
}

export function overlay(page: Page): Locator {
  return page.locator(".dcf-storyboard-tutorial__overlay");
}

export function bubble(page: Page): Locator {
  return page.locator(".dcf-storyboard-tutorial__bubble");
}

export function bubbleProgress(page: Page): Locator {
  return bubble(page).locator(".dcf-storyboard-tutorial__bubble-progress");
}

export function bubblePrimary(page: Page): Locator {
  return bubble(page).locator(".dcf-storyboard-tutorial__bubble-primary");
}

export function bubblePrevious(page: Page): Locator {
  return bubble(page).locator(".dcf-storyboard-tutorial__bubble-button").first();
}

export function bubbleAbort(page: Page): Locator {
  return bubble(page).locator(".dcf-storyboard-tutorial__bubble-abort");
}

export function panel(page: Page): Locator {
  return page.locator(".storyboard-page__panel-message");
}

export function panelButton(page: Page, label: string): Locator {
  return panel(page).getByRole("button", { name: label, exact: true });
}

export function panelProgress(page: Page): Locator {
  return page.locator(".storyboard-page__panel-message-progress");
}

export function playground(page: Page): Locator {
  return page.locator('[data-tutorial="playground"]');
}

export function nameField(page: Page): Locator {
  return page.locator("#tutorial-name");
}

export function notesField(page: Page): Locator {
  return page.locator("#tutorial-notes");
}

export function confirmButton(page: Page): Locator {
  return page.locator('[data-tutorial="confirm"]');
}

export function confirmedValue(page: Page): Locator {
  return page.locator('[data-testid="storyboard-confirmed"]');
}

export async function selectScenario(
  page: Page,
  key: ScenarioKey
): Promise<void> {
  await scenarioSelect(page).selectOption(key);
  await expect(scenarioSelect(page)).toHaveValue(key);
}

export async function startScenario(
  page: Page,
  key: ScenarioKey
): Promise<void> {
  await selectScenario(page, key);
  await startControl(page).click();
  await expect(status(page)).toHaveText(STATUS.running);
  await expect(host(page)).toHaveClass(/dcf-storyboard-tutorial--active/);
}

export async function clickBubbleNext(page: Page): Promise<void> {
  await bubblePrimary(page).click();
}

export async function clickBubblePrevious(page: Page): Promise<void> {
  await bubblePrevious(page).click();
}

export async function clickBubbleAbort(page: Page): Promise<void> {
  await bubbleAbort(page).click();
}

export async function bubbleTransform(page: Page): Promise<string> {
  return bubble(page).evaluate(
    (element) => (element as HTMLElement).style.transform
  );
}

export async function setLanguage(
  page: Page,
  lang: "en" | "pt"
): Promise<void> {
  await page.locator("#language-select").selectOption(lang);
}

/**
 * Clicks at the centre of `locator` through the real pointer pipeline, without
 * Playwright's actionability fallback, so an active blocking overlay decides
 * whether the underlying element receives the interaction.
 */
export async function clickThroughOverlay(
  page: Page,
  locator: Locator
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
