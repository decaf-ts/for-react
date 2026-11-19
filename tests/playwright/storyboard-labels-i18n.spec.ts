/**
 * SAA-2055 — `/storyboard` custom labels, the panel message strategy and the
 * en/pt localization toggle.
 */
import { expect, test } from "@playwright/test";
import {
  activeStep,
  bubbleAbort,
  bubblePrimary,
  bubbleProgress,
  clickBubbleNext,
  openStoryboard,
  panel,
  panelButton,
  panelProgress,
  scenarioSelect,
  selectScenario,
  setLanguage,
  startControl,
  startScenario,
  status,
  STATUS,
  STATUS_PT,
} from "./storyboard-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStoryboard(page);
});

test("renders the panel message strategy with custom labels and progress", async ({
  page,
}) => {
  await startScenario(page, "labels");

  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator("h4")).toHaveText("Custom labels");
  await expect(panelProgress(page)).toHaveText("Step 1 of 2");
  await expect(panelButton(page, "Back")).toBeDisabled();
  await expect(panelButton(page, "Continue")).toBeEnabled();
  await expect(panelButton(page, "Quit tour")).toBeEnabled();

  await panelButton(page, "Continue").click();

  await expect(panelProgress(page)).toHaveText("Step 2 of 2");
  await expect(panelButton(page, "Back")).toBeEnabled();
  await expect(panelButton(page, "Got it")).toBeEnabled();

  await panelButton(page, "Got it").click();

  await expect(status(page)).toHaveText(STATUS.completed);
  await expect(activeStep(page)).toHaveText("No step is active.");
});

test("localizes the built-in bubble labels into pt", async ({ page }) => {
  await setLanguage(page, "pt");
  await expect(
    scenarioSelect(page).locator('option[value="labels"]')
  ).toHaveText("Etiquetas e painel personalizados");

  await selectScenario(page, "feature-tour");
  await startControl(page).click();
  await expect(status(page)).toHaveText(STATUS_PT.running);

  await expect(activeStep(page)).toHaveText(
    "Bem-vindo à página de funcionalidades"
  );
  await expect(bubblePrimary(page)).toHaveText("Passo seguinte");
  await expect(bubbleAbort(page)).toHaveText("Abortar");
  await expect(bubbleProgress(page)).toHaveText("1 / 4");

  await clickBubbleNext(page);
  await expect(activeStep(page)).toHaveText("Introduza o seu nome");
  await expect(bubblePrimary(page)).toHaveText("Passo seguinte");
});

test("localizes the custom panel labels into pt", async ({ page }) => {
  await setLanguage(page, "pt");
  await expect(
    scenarioSelect(page).locator('option[value="labels"]')
  ).toHaveText("Etiquetas e painel personalizados");

  await selectScenario(page, "labels");
  await startControl(page).click();
  await expect(status(page)).toHaveText(STATUS_PT.running);

  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator("h4")).toHaveText("Etiquetas personalizadas");
  await expect(panelProgress(page)).toHaveText("Passo 1 de 2");
  await expect(panelButton(page, "Voltar")).toBeDisabled();
  await expect(panelButton(page, "Continuar")).toBeEnabled();
  await expect(panelButton(page, "Sair do tour")).toBeEnabled();

  await panelButton(page, "Sair do tour").click();
  await expect(status(page)).toHaveText(STATUS_PT.aborted);
});
