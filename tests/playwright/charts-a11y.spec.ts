/**
 * Accessibility gate for the `/charts` demo route.
 *
 * The scan runs once the page is settled (chart canvas and curve editor
 * mounted) and scores the route against the WCAG rule sets the other for-react
 * exports use. Like the dashboard-builder and storyboard gates, the scan reuses
 * an axe-core build already installed in the monorepo (the security gate for
 * this export allows no new dependency beyond `@playwright/test`). When no
 * axe-core build is resolvable the scan reports the reason and skips instead of
 * silently passing.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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
        run: (context: Document, options: unknown) => Promise<AxeResults>;
      };
    }).axe;
    return axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
  }, WCAG_TAGS);
}

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
  const scopedScore = accessibilityScore({ ...results, violations: unexpected });

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
    `unexpected axe ${label}-state violations:\n${formatViolations(
      unexpected
    )}`
  ).toHaveLength(0);
  expect(scopedScore).toBeGreaterThanOrEqual(95);
  expect(rawScore).toBeGreaterThanOrEqual(95);
  expect(known).toBeLessThanOrEqual(1);
}

test.describe("charts accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/charts");
    await expect(page.getByTestId("charts-chart").locator("canvas")).toBeVisible();
    await expect(
      page.getByTestId("charts-curve-editor").getByRole("img", {
        name: "Curve editor",
      })
    ).toBeVisible();
  });

  test("scores by axe on the rendered charts route", async ({
    page,
  }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await recordAxe(page, testInfo, "charts");
  });
});
