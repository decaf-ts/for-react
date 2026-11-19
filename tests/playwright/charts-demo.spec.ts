/**
 * SAA-2076 — `/charts` demo behaviour.
 *
 * Proves the family switcher swaps the rendered ECharts family, and that
 * editing, adding and removing dataset rows updates the chart without emitting
 * console errors or page exceptions.
 */
import { expect, test, type Page } from "@playwright/test";

const FAMILY_LABELS: Record<string, string> = {
  line: "Line chart preview",
  bar: "Bar chart preview",
  pie: "Pie chart preview",
  scatter: "Scatter chart preview",
};

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function openCharts(page: Page): Promise<void> {
  await page.goto("/charts");
  await expect(page.getByTestId("charts-chart").locator("canvas")).toBeVisible();
}

test.describe("charts demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
  });

  test("switches the rendered chart family", async ({ page }) => {
    const errors = trackErrors(page);
    await openCharts(page);

    const chart = page.getByTestId("charts-chart");
    await expect(chart.getByRole("img", { name: FAMILY_LABELS.line })).toBeVisible();

    for (const family of ["bar", "pie", "scatter", "line"]) {
      await page.getByTestId("charts-family").selectOption(family);
      await expect(
        chart.getByRole("img", { name: FAMILY_LABELS[family] })
      ).toBeVisible();
      await expect(chart.locator("canvas")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("edits, adds and removes dataset rows without console errors", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openCharts(page);

    const rows = page.locator(".charts-page__table tbody tr");
    await expect(rows).toHaveCount(5);

    const category = page.getByLabel("Category 1");
    const value = page.getByLabel("Value 1");
    await category.fill("East");
    await value.fill("99");
    await expect(category).toHaveValue("East");
    await expect(value).toHaveValue("99");
    await expect(page.getByTestId("charts-chart").locator("canvas")).toBeVisible();

    await page.getByTestId("charts-add-row").click();
    await expect(rows).toHaveCount(6);
    await expect(page.getByLabel("Category 6")).toBeVisible();

    await page.getByRole("button", { name: "Remove row 6" }).click();
    await expect(rows).toHaveCount(5);
    await expect(page.getByTestId("charts-chart").locator("canvas")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
