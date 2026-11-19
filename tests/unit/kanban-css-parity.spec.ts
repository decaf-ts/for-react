/**
 * @module for-react/kanban-css-parity.spec
 * @summary SAA-2010 — kanban stylesheet accessibility, token, drag-state and
 * reduced-motion contract.
 * @description Parses the kanban stylesheet with postcss (no Vite involvement)
 * and pins the acceptance criteria the jsdom suites cannot observe:
 *
 * - `--dcf-*` design-token usage instead of hard-coded colours/metrics;
 * - `:focus-visible` treatment on the board, retry button and cards;
 * - `@media (prefers-reduced-motion: reduce)` removes the spinner animation
 *   and the dropzone/card transitions;
 * - `@media (forced-colors: active)` keeps selected/grabbed cards visible and
 *   gives the card a CanvasText focus outline;
 * - the drag classes (`.dcf-kanban-card--dragging`, `.dcf-kanban-drag-preview`,
 *   `.dcf-kanban-column__dropzone--receiving`, `--over-limit`) are shipped;
 * - `.dcf-kanban__sr-only` implements the visually-hidden live region.
 *
 * It runs against `src/kanban/kanban.css` and, when a build has emitted it,
 * `lib/kanban/styles.css` — never against a bundler transform.
 */
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const ROOT = path.resolve(__dirname, "../..");

const CANDIDATES = [
  path.join(ROOT, "src/kanban/kanban.css"),
  path.join(ROOT, "lib/kanban/styles.css"),
].filter((file) => fs.existsSync(file));

function rulesOf(root: postcss.Root): postcss.Rule[] {
  const rules: postcss.Rule[] = [];
  root.walkRules((rule) => {
    rules.push(rule);
  });
  return rules;
}

function selectorsOf(root: postcss.Root): string[] {
  const selectors: string[] = [];
  for (const rule of rulesOf(root)) {
    for (const selector of rule.selectors ?? [rule.selector]) {
      selectors.push(selector);
    }
  }
  return selectors;
}

function mediaAtRule(
  root: postcss.Root,
  pattern: RegExp
): postcss.AtRule | undefined {
  let match: postcss.AtRule | undefined;
  root.walkAtRules("media", (rule) => {
    if (!match && pattern.test(rule.params)) {
      match = rule;
    }
  });
  return match;
}

function rulesWithin(container: postcss.Container): postcss.Rule[] {
  const rules: postcss.Rule[] = [];
  container.walkRules((rule) => {
    rules.push(rule);
  });
  return rules;
}

function ruleWithSelector(
  container: postcss.Container,
  target: string
): postcss.Rule | undefined {
  return rulesWithin(container).find((rule) =>
    (rule.selectors ?? [rule.selector]).includes(target)
  );
}

function declaration(
  rule: postcss.Rule | undefined,
  property: string
): postcss.Declaration | undefined {
  if (!rule) {
    return undefined;
  }
  return rule.nodes.find(
    (node): node is postcss.Declaration =>
      node.type === "decl" && node.prop.toLowerCase() === property
  );
}

function valueOf(rule: postcss.Rule | undefined, property: string): string | undefined {
  return declaration(rule, property)?.value;
}

function expectVisibleOutline(rule: postcss.Rule | undefined): void {
  expect(rule).toBeDefined();
  const outline = declaration(rule, "outline");
  expect(outline).toBeDefined();
  expect(outline?.value).not.toBe("none");
  expect(outline?.value).not.toBe("0");
}

describe.each(CANDIDATES)("kanban CSS parity — %s", (file) => {
  const css = fs.readFileSync(file, "utf8");
  let root: postcss.Root;

  beforeAll(() => {
    root = postcss.parse(css, { from: file });
  });

  it("parses without a postcss error", () => {
    expect(() => postcss.parse(css, { from: file })).not.toThrow();
    expect(root.nodes.length).toBeGreaterThan(0);
  });

  it("styles the board through --dcf-* design tokens", () => {
    expect(css.match(/var\(--dcf-/g)?.length ?? 0).toBeGreaterThanOrEqual(40);

    expect(valueOf(ruleWithSelector(root, ".dcf-kanban"), "color")).toContain(
      "var(--dcf-color-text"
    );
    expect(
      valueOf(ruleWithSelector(root, ".dcf-kanban__board"), "gap")
    ).toContain("var(--dcf-padding-small");
    expect(
      valueOf(ruleWithSelector(root, ".dcf-kanban-column__count"), "border-radius")
    ).toContain("var(--dcf-border-radius-large");
    expect(
      valueOf(ruleWithSelector(root, ".dcf-kanban-card"), "background")
    ).toContain("var(--dcf-card-background");
  });

  it("uses the primary and warning tokens for the interaction states", () => {
    const receiving = ruleWithSelector(
      root,
      ".dcf-kanban-column__dropzone--receiving"
    );
    const overLimit = ruleWithSelector(
      root,
      ".dcf-kanban-column__dropzone--over-limit"
    );
    const selected = ruleWithSelector(
      root,
      ".dcf-kanban-card.dcf-kanban-card--selected"
    );
    const grabbed = ruleWithSelector(
      root,
      ".dcf-kanban-card.dcf-kanban-card--grabbed"
    );

    expect(valueOf(receiving, "box-shadow")).toContain("var(--dcf-color-primary");
    expect(valueOf(overLimit, "box-shadow")).toContain("var(--dcf-color-warning");
    expect(valueOf(selected, "border-color")).toContain("var(--dcf-color-primary");
    expect(valueOf(grabbed, "border-color")).toContain("var(--dcf-color-tertiary");
  });

  it("draws a :focus-visible outline on the board and the retry button", () => {
    expectVisibleOutline(
      ruleWithSelector(root, ".dcf-kanban__board:focus-visible")
    );
    expectVisibleOutline(
      ruleWithSelector(root, ".dcf-kanban__retry:focus-visible")
    );
  });

  it("draws a visible focus ring on cards and a forced-colors outline", () => {
    const card = ruleWithSelector(root, ".dcf-kanban-card:focus-visible");
    expect(card).toBeDefined();
    expect(valueOf(card, "border-color")).toContain("var(--dcf-color-primary");
    expect(valueOf(card, "box-shadow")).toContain("var(--dcf-color-primary");

    const forced = mediaAtRule(root, /forced-colors:\s*active/);
    expect(forced).toBeDefined();
    expectVisibleOutline(
      ruleWithSelector(
        forced as postcss.AtRule,
        ".dcf-kanban-card:focus-visible"
      )
    );
  });

  it("keeps a forced-colors block that makes selected and grabbed cards visible", () => {
    const forced = mediaAtRule(root, /forced-colors:\s*active/);
    expect(forced).toBeDefined();

    for (const selector of [
      ".dcf-kanban-card.dcf-kanban-card--selected",
      ".dcf-kanban-card.dcf-kanban-card--grabbed",
    ]) {
      const rule = ruleWithSelector(forced as postcss.AtRule, selector);
      expect(rule).toBeDefined();
      expect(valueOf(rule, "forced-color-adjust")).toBe("none");
      expect(valueOf(rule, "background")).toBe("Highlight");
      expect(valueOf(rule, "color")).toBe("HighlightText");
      expect(valueOf(rule, "border-color")).toBe("Highlight");
    }
  });

  it("disables the spinner animation and transitions under prefers-reduced-motion", () => {
    const reduced = mediaAtRule(root, /prefers-reduced-motion:\s*reduce/);
    expect(reduced).toBeDefined();

    const spinner = ruleWithSelector(
      reduced as postcss.AtRule,
      ".dcf-kanban__spinner"
    );
    expect(spinner).toBeDefined();
    expect(valueOf(spinner, "animation")).toBe("none");

    for (const selector of [
      ".dcf-kanban-column__dropzone",
      ".dcf-kanban-card",
    ]) {
      const rule = ruleWithSelector(reduced as postcss.AtRule, selector);
      expect(rule).toBeDefined();
      expect(valueOf(rule, "transition")).toBe("none");
    }
  });

  it("ships the drag-state classes", () => {
    const selectors = selectorsOf(root);

    expect(selectors).toContain(".dcf-kanban-card.dcf-kanban-card--dragging");
    expect(selectors).toContain(".dcf-kanban-card.dcf-kanban-drag-preview");
    expect(selectors).toContain(
      ".dcf-kanban-column__dropzone--receiving"
    );
    expect(selectors).toContain(".dcf-kanban-column__dropzone--over-limit");
    expect(selectors).toContain(".dcf-kanban-card__handle");
  });

  it("styles the dragging and preview cards distinctly", () => {
    const dragging = ruleWithSelector(
      root,
      ".dcf-kanban-card.dcf-kanban-card--dragging"
    );
    const preview = ruleWithSelector(
      root,
      ".dcf-kanban-card.dcf-kanban-drag-preview"
    );

    expect(parseFloat(valueOf(dragging, "opacity") ?? "1")).toBeLessThan(1);
    expect(valueOf(dragging, "border-style")).toBe("dashed");
    expect(valueOf(preview, "box-shadow")).toContain("var(--dcf-box-shadow-large");
    expect(valueOf(preview, "pointer-events")).toBe("none");
    expect(valueOf(preview, "cursor")).toBe("grabbing");
  });

  it("implements the live region with the standard visually-hidden recipe", () => {
    const srOnly = ruleWithSelector(root, ".dcf-kanban__sr-only");
    expect(srOnly).toBeDefined();
    expect(valueOf(srOnly, "position")).toBe("absolute");
    expect(valueOf(srOnly, "width")).toBe("1px");
    expect(valueOf(srOnly, "height")).toBe("1px");
    expect(valueOf(srOnly, "overflow")).toBe("hidden");

    const live = ruleWithSelector(
      root,
      ".dcf-kanban__live.dcf-kanban__sr-only"
    );
    expect(live).toBeDefined();
  });

  it("keeps the over-limit dropzone and the read-only column styled", () => {
    expect(
      ruleWithSelector(root, ".dcf-kanban-column__dropzone--over-limit")
    ).toBeDefined();
    const readonly = ruleWithSelector(
      root,
      ".dcf-kanban-column--readonly .dcf-kanban-column__dropzone"
    );
    expect(valueOf(readonly, "opacity")).toBeDefined();
  });
});
