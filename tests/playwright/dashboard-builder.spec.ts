/**
 * End-to-end tests for the editable dashboard-builder demo route.
 *
 * Ported from `for-angular/tests/playwright/dashboard-builder.spec.ts`. The
 * for-react demo has no login gate and does not talk to a backend, so the spec
 * navigates straight to `/dashboard-builder`. Covers the three riskiest
 * behaviours: snap/collision palette composition, per-component delete
 * confirmation, and read mode rendering without editing affordances.
 */
import { expect, test } from "@playwright/test";

const STORAGE_KEY = "dashboard-builder:composition";

test.describe("dashboard builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard-builder");
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await expect(page.locator(".dcf-dashboard-palette")).toBeVisible();
  });

  test("composes from the palette and persists it (create -> read)", async ({
    page,
  }) => {
    const paletteItems = page.locator(".dcf-dashboard-palette button");
    await expect(paletteItems).toHaveCount(3);

    await paletteItems.first().click();
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(1);

    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);
    await expect(
      page.locator(".dcf-dashboard-placement-header button")
    ).toHaveCount(0);

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    const parsed = JSON.parse(stored || "{}");
    expect(parsed.placements).toHaveLength(1);
    expect(parsed.placements[0].tag).toBe("demo-stats");
  });

  test("delete confirmation removes a placed component", async ({ page }) => {
    await page.locator(".dcf-dashboard-palette button").first().click();
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(1);

    await page
      .locator(".dcf-dashboard-placement-header button")
      .first()
      .click();
    await expect(page.locator(".dcf-dashboard-confirm")).toBeVisible();

    await page
      .locator(".dcf-dashboard-confirm")
      .getByRole("button", { name: /confirm/i })
      .click();
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(0);
  });

  test("read mode renders the saved composition with no editing affordances", async ({
    page,
  }) => {
    await page.locator(".dcf-dashboard-palette button").first().click();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);

    await page.getByRole("button", { name: "Read" }).click();
    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);
    await expect(
      page.locator(".dcf-dashboard-placement-header button")
    ).toHaveCount(0);
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(1);
  });

  test("moves the focused tile with the keyboard", async ({ page }) => {
    await page.locator(".dcf-dashboard-palette button").first().click();

    const tile = page.locator(".dcf-dashboard-placement").first();
    await expect(tile).toHaveAttribute("role", "group");
    await expect(tile).toHaveAttribute("tabindex", "0");

    await tile.focus();
    await tile.press("ArrowRight");
    await expect(tile).toHaveAttribute(
      "aria-label",
      /Column 2, row 1, 2 by 1 cells/
    );
  });

  test("renders the whole builder in Portuguese from the real assets", async ({
    page,
  }) => {
    await page.selectOption("#language-select", "pt");

    const toolbar = page.getByRole("toolbar");
    await expect(toolbar.getByRole("button", { name: "Criar" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Ler" })).toBeVisible();
    await expect(
      toolbar.getByRole("button", { name: "Actualizar" })
    ).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Apagar" })).toBeVisible();

    await expect(page.locator(".dcf-dashboard-palette-title")).toHaveText(
      "Componentes"
    );
    await expect(
      page.getByRole("button", { name: "Estatística" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Lista" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nota" })).toBeVisible();

    await page.getByRole("button", { name: "Estatística" }).click();
    const tile = page.locator(".dcf-dashboard-placement").first();
    await expect(tile).toHaveAttribute(
      "aria-label",
      "Coluna 1, linha 1, 2 por 1 células"
    );
    await expect(tile.locator(".dcf-sr-only")).toHaveText(
      "Use as setas para mover; segure Shift com as setas para redimensionar"
    );

    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Dashboard guardado.")).toBeVisible();

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY
    );
    const parsed = JSON.parse(stored || "{}");
    expect(parsed.placements).toHaveLength(1);
    expect(parsed.placements[0].tag).toBe("demo-stats");
  });

  test("update mode reloads the persisted composition with editing affordances", async ({
    page,
  }) => {
    await page.locator(".dcf-dashboard-palette button").first().click();
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(1);

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);

    await page.getByRole("button", { name: "Update" }).click();

    await expect(page.locator(".dcf-dashboard-palette")).toBeVisible();
    await expect(page.locator(".dcf-dashboard-placement")).toHaveCount(1);
    await expect(
      page.locator(".dcf-dashboard-placement .demo-stat")
    ).toContainText("Revenue");
    await expect(
      page.locator(".dcf-dashboard-placement-header button")
    ).toHaveCount(1);
    const tile = page.locator(".dcf-dashboard-placement").first();
    await expect(tile).toHaveAttribute("tabindex", "0");
    await expect(tile.locator(".dcf-sr-only")).toHaveText(
      "Use the arrow keys to move; hold Shift with the arrow keys to resize"
    );
  });
});
