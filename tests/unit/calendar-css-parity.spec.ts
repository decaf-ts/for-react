/**
 * @module for-react/calendar-css-parity.spec
 * @summary SAA-1995 — calendar stylesheet accessibility, responsive and marker-contrast contract.
 * @description Parses the calendar stylesheet with postcss (already a project
 * dependency, no Vite involvement) and pins the acceptance criteria the
 * component suites cannot observe in jsdom:
 *
 * - a `:focus-visible` outline covers the previous/next navigation, the today
 *   shortcut and the day buttons;
 * - `@media (forced-colors: active)` paints the selected day with
 *   `Highlight`/`HighlightText` and gives today a visible border;
 * - `@media (prefers-reduced-motion: reduce)` removes the control transitions;
 * - `@media (max-width: 640px)` carries the responsive adjustments;
 * - the selected state repaints event markers white (high contrast) on the
 *   primary background.
 *
 * It runs against `src/calendar/calendar.css` and, when a build has emitted it,
 * `lib/calendar/styles.css` — never against a bundler transform.
 */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const ROOT = path.resolve(__dirname, '../..');

const CANDIDATES = [
  path.join(ROOT, 'src/calendar/calendar.css'),
  path.join(ROOT, 'lib/calendar/styles.css'),
].filter((file) => fs.existsSync(file));

const FOCUS_SELECTORS = [
  '.dcf-calendar__nav:focus-visible',
  '.dcf-calendar__today:focus-visible',
  '.dcf-calendar__day-button:focus-visible',
];

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
    for (const selector of rule.selectors ?? [rule.selector]) selectors.push(selector);
  }
  return selectors;
}

function mediaAtRule(root: postcss.Root, pattern: RegExp): postcss.AtRule | undefined {
  let match: postcss.AtRule | undefined;
  root.walkAtRules('media', (rule) => {
    if (!match && pattern.test(rule.params)) match = rule;
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

function ruleWithSelector(container: postcss.Container, target: string): postcss.Rule | undefined {
  return rulesWithin(container).find((rule) =>
    (rule.selectors ?? [rule.selector]).includes(target)
  );
}

function declaration(rule: postcss.Rule | undefined, property: string): postcss.Declaration | undefined {
  if (!rule) return undefined;
  return rule.nodes.find(
    (node): node is postcss.Declaration =>
      node.type === 'decl' && node.prop.toLowerCase() === property
  );
}

function valueOf(rule: postcss.Rule | undefined, property: string): string | undefined {
  return declaration(rule, property)?.value;
}

describe.each(CANDIDATES)('calendar CSS parity — %s', (file) => {
  const css = fs.readFileSync(file, 'utf8');
  let root: postcss.Root;

  beforeAll(() => {
    root = postcss.parse(css, { from: file });
  });

  it('parses without a postcss error', () => {
    expect(() => postcss.parse(css, { from: file })).not.toThrow();
    expect(root.nodes.length).toBeGreaterThan(0);
  });

  it('draws a :focus-visible outline on nav, today and day buttons', () => {
    const selectors = selectorsOf(root);
    for (const selector of FOCUS_SELECTORS) {
      expect(selectors).toContain(selector);
      const outline = declaration(ruleWithSelector(root, selector), 'outline');
      expect(outline).toBeDefined();
      expect(outline?.value).not.toBe('none');
      expect(outline?.value).not.toBe('0');
    }
  });

  it('keeps a forced-colors block that paints the selected day with Highlight/HighlightText', () => {
    const forced = mediaAtRule(root, /forced-colors:\s*active/);
    expect(forced).toBeDefined();

    const selected = ruleWithSelector(
      forced as postcss.AtRule,
      '.dcf-calendar__day--selected .dcf-calendar__day-button'
    );
    expect(valueOf(selected, 'background')).toBe('Highlight');
    expect(valueOf(selected, 'color')).toBe('HighlightText');
  });

  it('keeps a visible forced-colors border on today', () => {
    const forced = mediaAtRule(root, /forced-colors:\s*active/);
    expect(forced).toBeDefined();

    const today = ruleWithSelector(
      forced as postcss.AtRule,
      '.dcf-calendar__day--today .dcf-calendar__day-button'
    );
    const border = valueOf(today, 'border-color') ?? valueOf(today, 'border');
    expect(border).toBeDefined();
    expect(border?.toLowerCase()).not.toBe('transparent');
    expect(border?.toLowerCase()).not.toBe('none');
  });

  it('disables the control transitions under prefers-reduced-motion', () => {
    const reduced = mediaAtRule(root, /prefers-reduced-motion:\s*reduce/);
    expect(reduced).toBeDefined();

    for (const selector of [
      '.dcf-calendar__nav',
      '.dcf-calendar__today',
      '.dcf-calendar__day-button',
    ]) {
      const control = ruleWithSelector(reduced as postcss.AtRule, selector);
      expect(control).toBeDefined();
      expect(valueOf(control, 'transition')).toBe('none');
    }
  });

  it('keeps the narrow-viewport responsive adjustments', () => {
    const narrow = mediaAtRule(root, /max-width:\s*640px/);
    expect(narrow).toBeDefined();

    const responsive = rulesWithin(narrow as postcss.AtRule);
    expect(responsive.length).toBeGreaterThan(0);

    const title = ruleWithSelector(narrow as postcss.AtRule, '.dcf-calendar__title');
    expect(valueOf(title, 'font-size')).toBeDefined();

    const dayButton = ruleWithSelector(narrow as postcss.AtRule, '.dcf-calendar__day-button');
    expect(valueOf(dayButton, 'min-height')).toBeDefined();

    const weekday = ruleWithSelector(narrow as postcss.AtRule, '.dcf-calendar__weekday');
    expect(valueOf(weekday, 'font-size')).toBeDefined();
  });

  it('repaints selected-day markers white on the primary background', () => {
    const selectedButton = ruleWithSelector(
      root,
      '.dcf-calendar__day--selected .dcf-calendar__day-button'
    );
    expect(valueOf(selectedButton, 'background')).toContain('--dcf-color-primary');

    const selectedMarker = ruleWithSelector(
      root,
      '.dcf-calendar__day--selected .dcf-calendar__marker'
    );
    const background = declaration(selectedMarker, 'background');
    expect(background).toBeDefined();
    const normalized = background?.value.toLowerCase().replace(/\s/g, '');
    expect(['#ffffff', '#fff', 'white']).toContain(normalized);
    expect(background?.important).toBe(true);
    expect(parseFloat(valueOf(selectedMarker, 'opacity') ?? '0')).toBeGreaterThan(0);
  });
});
