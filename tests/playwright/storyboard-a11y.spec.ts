/**
 * Accessibility gate for the `/storyboard` demo route.
 *
 * The axe scan covers the three states the export must remain accessible in:
 * idle before a tutorial starts, running mid-tour with the bubble/overlay
 * mounted, and completed after the feature tour finishes.
 *
 * Like the dashboard-builder gate, the scan reuses an axe-core build that is
 * already installed in the monorepo (the security gate for this export allows
 * no new dependency beyond `@playwright/test`). When no axe-core build is
 * resolvable the scan reports the reason and skips instead of silently passing.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  bubblePrimary,
  bubbleProgress,
  clickBubbleNext,
  openStoryboard,
  startScenario,
  status,
  STATUS,
} from "./storyboard-helpers";

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
    `unexpected axe ${label}-state violations:\n${formatViolations(
      unexpected
    )}`
  ).toHaveLength(0);
  expect(scopedScore).toBeGreaterThanOrEqual(95);
  expect(rawScore).toBeGreaterThanOrEqual(95);
  expect(known).toBeLessThanOrEqual(1);
}

async function finishFeatureTour(page: Page): Promise<void> {
  await startScenario(page, "feature-tour");
  await expect(bubbleProgress(page)).toHaveText("1 / 4");
  for (const expected of ["2 / 4", "3 / 4", "4 / 4"]) {
    await clickBubbleNext(page);
    await expect(bubbleProgress(page)).toHaveText(expected, {
      timeout: 5_000,
    });
  }
  await expect(bubblePrimary(page)).toHaveText(/end tutorial/i);
  await bubblePrimary(page).click();
  await expect(status(page)).toHaveText(STATUS.completed);
}

test.describe("storyboard accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStoryboard(page);
  });

  test("scores by axe in the idle state before start", async ({
    page,
  }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await expect(status(page)).toHaveText(STATUS.idle);
    await recordAxe(page, testInfo, "idle");
  });

  test("scores by axe in the running mid-tour state", async ({
    page,
  }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await startScenario(page, "feature-tour");
    await expect(bubbleProgress(page)).toHaveText("1 / 4");
    await clickBubbleNext(page);
    await expect(bubbleProgress(page)).toHaveText("2 / 4");
    await recordAxe(page, testInfo, "running");
  });

  test("scores by axe in the completed state", async ({ page }, testInfo) => {
    test.skip(
      !AXE_SOURCE,
      "axe-core is not resolvable in this workspace; run with AXE_CORE_PATH=/path/to/axe.min.js"
    );
    await finishFeatureTour(page);
    await recordAxe(page, testInfo, "completed");
  });
});
