/**
 * @module for-react/diagrams/diagram-css-parity.spec
 * @summary Row 8 — emitted diagram CSS parity with the for-angular stylesheet.
 * @description Parses the generated diagrams stylesheet with postcss (already a
 * project dependency, no Vite involvement) and pins the parity contract:
 *
 * - the file parses cleanly;
 * - no Angular view-encapsulation selectors remain (`:host`, `::ng-deep`,
 *   `/deep/`, `_nghost-*`/`_ngcontent-*`, `ng-reflect-*`);
 * - no Angular app host tags (`app-*`) are introduced, and the only legacy
 *   `ng-diagram` element selectors that survive are scoped under the React root
 *   class instead of acting as an Angular host root;
 * - the React root-class scoping that replaces `:host` is present;
 * - both dark-mode triggers exist (`html.dcf-palette-dark` and
 *   `@media (prefers-color-scheme: dark)`);
 * - `--dcf-*` / `--ngd-*` custom-property fallbacks survive.
 *
 * It runs against `src/diagrams/diagrams.css` and, when a build has emitted it,
 * `lib/diagrams/styles.css` — never against a bundler transform.
 */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const ROOT = path.resolve(__dirname, '../../..');

const CANDIDATES = [
  path.join(ROOT, 'src/diagrams/diagrams.css'),
  path.join(ROOT, 'lib/diagrams/styles.css'),
].filter((file) => fs.existsSync(file));

function selectorsOf(root: postcss.Root): string[] {
  const selectors: string[] = [];
  root.walkRules((rule) => {
    for (const selector of rule.selectors ?? [rule.selector]) selectors.push(selector);
  });
  return selectors;
}

function declarationValues(root: postcss.Root): string[] {
  const values: string[] = [];
  root.walkDecls((decl) => values.push(decl.value));
  return values;
}

function hasVarFallback(values: string[], prefix: 'dcf' | 'ngd'): boolean {
  const pattern = new RegExp(`var\\(\\s*--${prefix}-[a-z0-9-]+\\s*,`, 'i');
  return values.some((value) => pattern.test(value));
}

describe.each(CANDIDATES)('diagram CSS parity — %s', (file) => {
  const css = fs.readFileSync(file, 'utf8');
  let root: postcss.Root;

  beforeAll(() => {
    root = postcss.parse(css, { from: file });
  });

  it('parses without a postcss error', () => {
    expect(() => postcss.parse(css, { from: file })).not.toThrow();
    expect(root.nodes.length).toBeGreaterThan(0);
  });

  it('keeps no Angular view-encapsulation selectors', () => {
    const offenders = selectorsOf(root).filter((selector) =>
      /:host|::ng-deep|\/deep\/|_nghost-|_ngcontent-|ng-reflect-/.test(selector)
    );
    expect(offenders).toEqual([]);
  });

  it('introduces no Angular application host tags', () => {
    const offenders = selectorsOf(root).filter((selector) => /(^|[\s>+~(,])(app-[a-z][\w-]*)/.test(selector));
    expect(offenders).toEqual([]);
  });

  it('scopes legacy ng-diagram element selectors under the React root class', () => {
    const legacy = selectorsOf(root).filter((selector) => /(^|[\s>+~(,])ng-diagram([.#:\s>+~]|$)/.test(selector));
    for (const selector of legacy) {
      // A React root class must lead the selector; the legacy element may only
      // be a descendant, never the host root Angular used to render.
      expect(selector.trim().startsWith('.graph-renderer')).toBe(true);
    }
  });

  it('carries the React root-class scoping that replaces :host', () => {
    const selectors = selectorsOf(root);
    expect(selectors).toEqual(expect.arrayContaining(['.graph-renderer']));
    expect(selectors.some((selector) => /^\.graph-node\b/.test(selector))).toBe(true);
    expect(selectors.some((selector) => /^\.graph-logs-dock\b/.test(selector))).toBe(true);
    expect(selectors.some((selector) => /^\.graph-badge\b/.test(selector))).toBe(true);
  });

  it('keeps both dark-mode triggers', () => {
    const selectors = selectorsOf(root);
    expect(selectors.some((selector) => selector.includes('html.dcf-palette-dark'))).toBe(true);
    const mediaQueries: string[] = [];
    root.walkAtRules('media', (rule) => mediaQueries.push(rule.params));
    expect(mediaQueries.some((params) => /prefers-color-scheme:\s*dark/.test(params))).toBe(true);
  });

  it('keeps --dcf-* and --ngd-* custom-property fallbacks', () => {
    const values = declarationValues(root);
    expect(hasVarFallback(values, 'dcf')).toBe(true);
    expect(hasVarFallback(values, 'ngd')).toBe(true);
  });

  it('keeps the --gx-* editor token layer the dark scope remaps', () => {
    const values = declarationValues(root);
    expect(values.some((value) => /--gx-[a-z0-9-]+/i.test(value) || /var\(--gx-/.test(value))).toBe(true);
  });
});
