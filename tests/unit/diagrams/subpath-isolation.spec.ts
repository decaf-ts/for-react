/**
 * @module for-react/diagrams/subpath-isolation.spec
 * @summary Row 10 — `./diagrams` subpath isolation and the optional `@decaf-ts/as-graph` peer.
 * @description Proves the package contract outside the Jest module registry by
 * probing the emitted bundles in child Node processes:
 *
 * - `package.json` declares `@decaf-ts/as-graph@^0.11.5` and marks it optional;
 * - importing the package root (CJS `require` and ESM dynamic `import`) never
 *   loads `@xyflow/react`/`reactflow`;
 * - the `./diagrams` subpath exports the full diagram surface and is the only
 *   entrypoint that evaluates React Flow.
 *
 * Each probe runs in a fresh process so the module cache cannot leak between
 * assertions and the result is independent of Jest's own module graph. The
 * suite skips with an explicit message only when `lib/` has not been built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../../..');

const CJS_ROOT = path.join(ROOT, 'lib/cjs/index.cjs');
const CJS_DIAGRAMS = path.join(ROOT, 'lib/cjs/diagrams/index.cjs');
const ESM_ROOT = path.join(ROOT, 'lib/esm/index.js');
const ESM_DIAGRAMS = path.join(ROOT, 'lib/esm/diagrams/index.js');

const HAS_LIB = [CJS_ROOT, CJS_DIAGRAMS, ESM_ROOT, ESM_DIAGRAMS].every((file) => fs.existsSync(file));
const SKIP_REASON = HAS_LIB ? undefined : 'lib/ is not built; run the package build before this probe';

const XYFLOW_CACHE = /[\\/]node_modules[\\/](@xyflow[\\/](react|system)|reactflow)[\\/]/;
const XYFLOW_SPECIFIER = /^@xyflow\/(react|system)$|^reactflow$/;

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
const loaded = Object.keys(require.cache).filter((key) => ${XYFLOW_CACHE.toString()}.test(key));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod) }));
`;

const ESM_PROBE = (entry: string) => `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('${entry}');
const loaded = seen.filter((specifier) => ${XYFLOW_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ count: Object.keys(mod).length, loaded, keys: Object.keys(mod) }));
`;

(HAS_LIB ? describe : describe.skip)('diagrams subpath isolation', () => {
  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  };

  it('declares @decaf-ts/as-graph as an optional ^0.11.5 peer', () => {
    expect(packageJson.peerDependencies?.['@decaf-ts/as-graph']).toBe('^0.11.5');
    expect(packageJson.peerDependenciesMeta?.['@decaf-ts/as-graph']?.optional).toBe(true);
  });

  it('does not load React Flow from the CJS package root', () => {
    const result = probe(CJS_PROBE('./lib/cjs/index.cjs'));
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it('does not load React Flow from the ESM package root', () => {
    const result = probe(ESM_PROBE('./lib/esm/index.js'), ['--input-type=module']);
    expect(result.loaded).toEqual([]);
    expect(result.count as number).toBeGreaterThan(100);
  });

  it('exports the diagram surface from ./diagrams and loads React Flow there (CJS)', () => {
    const result = probe(CJS_PROBE('./lib/cjs/diagrams/index.cjs'));
    expect(result.count as number).toBeGreaterThanOrEqual(200);
    expect(result.loaded as string[]).toEqual(expect.arrayContaining([expect.stringMatching(XYFLOW_CACHE)]));

    const keys = result.keys as string[];
    expect(keys).toEqual(
      expect.arrayContaining(['GraphRenderer', 'GraphNodeTemplate', 'GraphDiagramAdapter'])
    );
  });

  it('exports the diagram surface from ./diagrams and loads React Flow there (ESM)', () => {
    const result = probe(ESM_PROBE('./lib/esm/diagrams/index.js'), ['--input-type=module']);
    expect(result.count as number).toBeGreaterThanOrEqual(200);
    expect(result.loaded as string[]).toEqual(expect.arrayContaining([expect.stringMatching(XYFLOW_SPECIFIER)]));
  });

  it('keeps the diagram surface out of the package root export', () => {
    const root = probe(CJS_PROBE('./lib/cjs/index.cjs'));
    const keys = root.keys as string[];
    expect(keys).not.toContain('GraphRenderer');
    expect(keys).not.toContain('GraphNodeTemplate');
    expect(keys).not.toContain('GraphDiagramAdapter');
  });
});
