/**
 * Accessibility gate for the editable dashboard-builder demo route.
 *
 * The always-on part asserts the WCAG-relevant semantics the builder owns:
 * named toolbar, named palette entries, tile group roles/names and the absence
 * of editing affordances in read mode.
 *
 * The axe scan reuses an axe-core build that is already installed in the
 * monorepo (the security gate for this export allows no new dependency beyond
 * `@playwright/test`). When no axe-core build is resolvable the scan reports
 * the reason and skips instead of silently passing.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const STORAGE_KEY = "dashboard-builder:composition";

/*
 * The demo shell is a fixed Ionic layout (`@ionic/react/css/structure.css`
 * sets `body { position: fixed; overflow: hidden; height: 100% }`), so the
 * document cannot scroll. The dashboard builder page is ~990px tall at this
 * width; rendering it at the default 1280x720 viewport clips the footer and
 * makes the Save button unreachable. Use a viewport tall enough to show the
 * whole page so these behavioural assertions can actually run.
 */
test.use({ viewport: { width: 1280, height: 1000 } });

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

function resolveAxeSource(): string | null {
  const candidates = [
    process.env["AXE_CORE_PATH"],
    path.resolve(process.cwd(), "node_modules/axe-core/axe.min.js"),
    path.resolve(
      process.cwd(),
      "../for-angular/node_modules/axe-core/axe.min.js"
    ),
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const AXE_SOURCE = resolveAxeSource();

interface AxeNode {
  target: string[];
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: AxeNode[];
}

interface AxeResults {
  violations: AxeViolation[];
  passes: unknown[];
  incomplete: unknown[];
}

const KNOWN_SHELL_RULES = new Set(["label-content-name-mismatch"]);
const KNOWN_SHELL_TARGET = ".app-theme-toggle";

function isKnownShellViolation(violation: AxeViolation): boolean {
  if (!KNOWN_SHELL_RULES.has(violation.id)) return false;
  return violation.nodes.every((node) =>
    node.target.some((target) => target.includes(KNOWN_SHELL_TARGET))
  );
}

function accessibilityScore(results: AxeResults): number {
  const total = results.passes.length + results.violations.length;
  if (total === 0) return 100;
  return Math.round((results.passes.length / total) * 1000) / 10;
}

function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact || "unknown"}): ${
          violation.help
        } -> ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(" | ")}`
    )
    .join("\n");
}

async function runAxe(page: Page): Promise<AxeResults> {
  await page.addScriptTag({ content: readFileSync(AXE_SOURCE!, "utf8") });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: Document,
          options: unknown
        ) => Promise<AxeResults>;
      };
    }).axe;
    return axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
  }, WCAG_TAGS);
}

test.describe("dashboard builder accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard-builder");
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await expect(page.locator(".dcf-dashboard-palette")).toBeVisible();
  });

  test("exposes named toolbar and palette controls in create mode", async ({
    page,
  }) => {
    const toolbar = page.getByRole("toolbar");
    await expect(toolbar).toHaveAccessibleName("Dashboard Builder");
    for (const name of ["Create", "Read", "Update", "Delete"]) {
      await expect(toolbar.getByRole("button", { name })).toBeVisible();
    }

    await expect(page.locator(".dcf-dashboard-palette-title")).toHaveText(
      "Components"
    );
    for (const name of ["Stat", "List", "Note"]) {
      await expect(page.getByRole("button", { name })).toHaveAccessibleName(
        name
      );
    }

    const canvas = page.locator(".dcf-dashboard-canvas");
    await expect(canvas).toHaveAttribute("data-cols", "4");
    await expect(canvas).toHaveAttribute("data-rows", "4");
  });

  test("exposes tile group semantics without editing affordances in read mode", async ({
    page,
  }) => {
    await page.locator(".dcf-dashboard-palette button").first().click();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);

    const tile = page.locator(".dcf-dashboard-placement").first();
    await expect(tile).toHaveAttribute("role", "group");
    await expect(tile).toHaveAccessibleName("Column 1, row 1, 2 by 1 cells");
    await expect(tile).not.toHaveAttribute("tabindex", /.*/);
    await expect(
      page.locator(".dcf-dashboard-placement-header button")
    ).toHaveCount(0);
  });

  async function recordAxe(
    page: Page,
    testInfo: TestInfo,
    label: string
  ): Promise<void> {
    const results = await runAxe(page);
    const unexpected = results.violations.filter(
      (violation) => !isKnownShellViolation(violation)
    );
    const known = results.violations.length - unexpected.length;
    const rawScore = accessibilityScore(results);
    const scopedScore = accessibilityScore({
      ...results,
      violations: unexpected,
    });

    console.log(
      `axe ${label} score: raw=${rawScore}% scoped=${scopedScore}% passes=${
        results.passes.length
      } knownShellViolations=${known} unexpected=${unexpected.length}`
    );

    await testInfo.attach(`axe-${label}`, {
      body: JSON.stringify(
        {
          rawScore,
          scopedScore,
          passes: results.passes.length,
          knownShellViolations: known,
          knownShellDetail: results.violations.filter(isKnownShellViolation),
          unexpectedViolations: unexpected,
          incomplete: results.incomplete.length,
        },
        null,
        2
      ),
      contentType: "application/json",
    });

    expect(
      unexpected,
      `unexpected axe ${label}-mode violations:\n${formatViolations(
        unexpected
      )}`
    ).toHaveLength(0);
    expect(scopedScore).toBeGreaterThanOrEqual(95);
    expect(rawScore).toBeGreaterThanOrEqual(95);
    expect(known).toBeLessThanOrEqual(1);
  }

  test("scores by axe in create mode", async ({ page }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await recordAxe(page, testInfo, "create");
  });

  test("scores by axe in read mode", async ({ page }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await page.locator(".dcf-dashboard-palette button").first().click();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator(".dcf-dashboard-palette")).toHaveCount(0);

    await recordAxe(page, testInfo, "read");
  });
});
