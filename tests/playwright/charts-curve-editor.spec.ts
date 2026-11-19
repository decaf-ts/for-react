/**
 * SAA-2076 — `/charts` curve editor behaviour.
 *
 * Proves the curve editor renders a labelled ECharts host and canvas, and that
 * typing a formula samples it into the documented 21 control points.
 */
import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("charts curve editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/charts");
  });

  test("renders the labelled chart host and canvas", async ({ page }) => {
    const errors = trackErrors(page);

    const editor = page.getByTestId("charts-curve-editor");
    const host = editor.getByRole("img", { name: "Curve editor" });
    await expect(host).toBeVisible();
    await expect(host.locator("canvas")).toBeVisible();
    await expect(page.getByTestId("charts-points-count")).toHaveText(
      "5 control points"
    );

    expect(errors).toEqual([]);
  });

  test("switches the editor to 21 sampled points for a formula", async ({
    page,
  }) => {
    const errors = trackErrors(page);

    await page.getByTestId("charts-formula").fill("x^2");
    await expect(page.getByTestId("charts-points-count")).toHaveText(
      "21 control points"
    );
    await expect(
      page.getByTestId("charts-curve-editor").getByRole("img", {
        name: "Curve editor",
      })
    ).toBeVisible();

    expect(errors).toEqual([]);
  });
});
