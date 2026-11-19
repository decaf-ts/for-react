/**
 * @note Adapted to for-react from for-angular `src/diagrams/components/graph/bundle-wall.spec.ts`.
 *
 * @module for-react/graph/bundle-wall.spec
 * @summary DECAF-50 §4.20 verification bar 1 — bundle/boundary import wall
 * (React port).
 * @description Proves the diagrams subpath keeps the frontend-only boundary:
 * no production diagram source imports the backend engine, executor,
 * catalogue-runtime, validator, integrations backend or Node-only modules. The
 * Angular suite also scanned its `www/` production bundle; React has no demo
 * route in this ticket's scope, so only the static import wall (the part that
 * protects the shipped `./diagrams` subpath) is asserted here.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/** `for-react` package root (this module's grandparent directory). */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Diagram production sources. */
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'src', 'diagrams');

/** Import specifiers that never may appear in the browser diagram bundle. */
const FORBIDDEN_IMPORT_SPECIFIERS = [
  '@decaf-ts/integrations',
  '@decaf-ts/for-nest',
  '@decaf-ts/for-server',
  '@decaf-ts/ui-decorators/graph',
  'node:',
  'isolated-vm',
  'vm:',
] as const;

/** Visits every `.ts`/`.tsx` production source file under one root. */
function walkSources(root: string, visit: (file: string) => void): void {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkSources(full, visit);
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) visit(full);
  }
}

/** Import specifiers declared by one source file. */
function importSpecifiersOf(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

/** Forbidden specifiers present in one list of import specifiers. */
function violationsOf(specifiers: string[]): string[] {
  return specifiers.filter((specifier) =>
    FORBIDDEN_IMPORT_SPECIFIERS.some(
      (forbidden) =>
        specifier === forbidden ||
        specifier.startsWith(`${forbidden}/`) ||
        // Node builtins are written `node:` + name, with no slash.
        (forbidden.endsWith(':') && specifier.startsWith(forbidden))
    )
  );
}

describe('diagrams bundle wall (DECAF_50 §4.20 verification bar 1)', () => {
  it('static import wall: no backend import is reachable from the diagram sources', () => {
    const violations: string[] = [];
    walkSources(SOURCE_ROOT, (file) => {
      for (const specifier of violationsOf(importSpecifiersOf(fs.readFileSync(file, 'utf8')))) {
        violations.push(`${path.relative(SOURCE_ROOT, file)} imports '${specifier}'`);
      }
    });
    expect(violations).toEqual([]);
  });

  it('scanner control: a frontend-safe specifier never counts as backend code', () => {
    const safe = [
      '@decaf-ts/as-graph/shared',
      '@xyflow/react',
      'react',
      './GraphWorkflowDocumentStore.js',
      '../internal/reactive.js',
    ];
    expect(violationsOf(safe)).toEqual([]);
  });

  it('scanner control: a deliberately injected backend import is detected', () => {
    const probe = [
      '@decaf-ts/integrations',
      '@decaf-ts/integrations/secrets',
      '@decaf-ts/for-nest',
      '@decaf-ts/ui-decorators/graph',
      'node:fs',
      'isolated-vm',
    ];
    expect(violationsOf(probe)).toEqual(probe);
  });

  it('reads real production bytes (the source walk finds the diagrams entrypoint)', () => {
    let count = 0;
    walkSources(SOURCE_ROOT, () => {
      count += 1;
    });
    expect(count).toBeGreaterThan(50);
  });
});
