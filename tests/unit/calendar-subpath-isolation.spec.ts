/**
 * @module for-react/calendar-subpath-isolation.spec
 * @summary SAA-1995 — `./calendar` subpath isolation from the package root.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in child Node processes:
 *
 * - `package.json` maps `./calendar` to the emitted ESM/CJS entrypoints;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   evaluates `react-day-picker` or `date-fns`;
 * - the `./calendar` subpath exports the calendar surface and is the only
 *   entrypoint that evaluates those dependencies.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions and the result is independent of Jest's own module graph. The
 * suite skips with an explicit message only when `lib/` has not been built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../..');

const CJS_ROOT = path.join(ROOT, 'lib/cjs/index.cjs');
const CJS_CALENDAR = path.join(ROOT, 'lib/cjs/calendar/index.cjs');
const ESM_ROOT = path.join(ROOT, 'lib/esm/index.js');
const ESM_CALENDAR = path.join(ROOT, 'lib/esm/calendar/index.js');

const HAS_LIB = [CJS_ROOT, CJS_CALENDAR, ESM_ROOT, ESM_CALENDAR].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : 'lib/ is not built; run the package build before this probe';

const DEP_CACHE = /[\\/]node_modules[\\/](react-day-picker|date-fns|@date-fns)[\\/]/;
const DEP_SPECIFIER = /^(react-day-picker|date-fns)(\/|$)|^@date-fns\//;

function probe(script: string, flags: string[] = []): Record<string, unknown> {
  const stdout = execFileSync(process.execPath, [...flags, '-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim());
}

const CJS_PROBE = (entry: string) => `
const mod = require('${entry}');
const loaded = Object.keys(require.cache).filter((key) => ${DEP_CACHE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod) }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('${entry}');
const loaded = seen.filter((specifier) => ${DEP_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod) }));
`;

function expectBothDependencies(loaded: unknown): void {
  const specifiers = loaded as string[];
  expect(specifiers).toEqual(
    expect.arrayContaining([expect.stringMatching(/react-day-picker/)])
  );
  expect(specifiers).toEqual(
    expect.arrayContaining([expect.stringMatching(/date-fns/)])
  );
}

(HAS_LIB ? describe : describe.skip)('calendar subpath isolation', () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
  ) as {
    exports?: Record<string, { import?: { default?: string }; require?: { default?: string } }>;
  };

  it('maps the ./calendar subpath to the emitted ESM and CJS entrypoints', () => {
    const calendar = packageJson.exports?.['./calendar'];
    expect(calendar?.import?.default).toBe('./lib/esm/calendar/index.js');
    expect(calendar?.require?.default).toBe('./lib/cjs/calendar/index.cjs');
  });

  it('does not load react-day-picker or date-fns from the CJS package root', () => {
    const result = probe(CJS_PROBE('./lib/cjs/index.cjs'));
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it('does not load react-day-picker or date-fns from the ESM package root', () => {
    const result = probe(ESM_PROBE('./lib/esm/index.js'), ['--input-type=module']);
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it('loads react-day-picker and date-fns from ./calendar and exports the calendar surface (CJS)', () => {
    const result = probe(CJS_PROBE('./lib/cjs/calendar/index.cjs'));
    expect(result.count as number).toBeGreaterThanOrEqual(10);
    expectBothDependencies(result.loaded);

    const keys = result.keys as string[];
    expect(keys).toEqual(
      expect.arrayContaining(['Calendar', 'CalendarComponent', 'RgxCalendar'])
    );
  });

  it('loads react-day-picker and date-fns from ./calendar and exports the calendar surface (ESM)', () => {
    const result = probe(ESM_PROBE('./lib/esm/calendar/index.js'), [
      '--input-type=module',
    ]);
    expect(result.count as number).toBeGreaterThanOrEqual(10);
    expectBothDependencies(result.loaded);

    const keys = result.keys as string[];
    expect(keys).toEqual(
      expect.arrayContaining(['Calendar', 'CalendarComponent', 'RgxCalendar'])
    );
  });

  it('keeps the calendar surface out of the package root export', () => {
    const root = probe(CJS_PROBE('./lib/cjs/index.cjs'));
    const keys = root.keys as string[];
    expect(keys).not.toContain('Calendar');
    expect(keys).not.toContain('CalendarComponent');
    expect(keys).not.toContain('RgxCalendar');
  });
});
