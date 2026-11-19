/**
 * @note Ported to for-react from for-angular `src/diagrams/components/graph/parameters/GraphParameterFormControls.spec.ts`.
 *
 * @module for-react/graph/parameters/GraphParameterFormControls.spec
 * @summary DECAF-50 §4.12 follow-up (SAA-596): schema-driven parameter form state,
 * renderer registry, and validation-mapper contract.
 * @description React port of the framework-agnostic half of the original suite.
 * The Angular component mounts are covered with React Testing Library in
 * `tests/integration/diagrams/parameter-renderers.spec.tsx`; here we prove:
 *
 * - {@link GraphParameterFormBuilder} discovers dynamic-option parameters,
 *   preserves hidden values verbatim, and applies manifest defaults;
 * - the renderer registry resolves every registered parameter type to its
 *   dedicated React component and falls back to the generic renderer;
 * - {@link graphParameterValidationIssuesOf} maps malformed option, resource
 *   locator, and credential values to parameter errors.
 */
import type {
  GraphCredentialReference,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';
import { GraphParameterFormBuilder } from '../../../../src/diagrams/parameters/GraphParameterFormBuilder';
// Import the field dispatcher first: it owns the default registry instance and
// breaks the registry<->component module cycle that would otherwise leave the
// registry class in TDZ when the cycle initializes through the registry barrel.
import '../../../../src/diagrams/parameters/components/graph-parameter-field.component';
import {
  GraphParameterRendererRegistry,
  graphRegisterParameterRenderers,
} from '../../../../src/diagrams/parameters/GraphParameterRendererRegistry';
import { graphParameterValidationIssuesOf } from '../../../../src/diagrams/parameters/GraphParameterValidationMapper';
import { GraphGenericParameterComponent } from '../../../../src/diagrams/parameters/components/graph-generic-parameter.component';
import { GraphOptionsParameterComponent } from '../../../../src/diagrams/parameters/components/graph-options-parameter.component';
import { GraphResourceLocatorParameterComponent } from '../../../../src/diagrams/parameters/components/graph-resource-locator-parameter.component';
import { GraphCredentialParameterComponent } from '../../../../src/diagrams/parameters/components/graph-credential-parameter.component';

const NODE_ID = 'node-1';
const NODE_KIND = 'test/http-request';

/** Manifest fixture covering every parameter shape under test. */
function manifestFixture(): GraphNodeManifest {
  return {
    kind: NODE_KIND,
    label: 'HTTP Request',
    parameters: [
      {
        id: 'method',
        type: 'options',
        label: 'HTTP Method',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
        ],
      },
      {
        id: 'workspace',
        type: 'options',
        label: 'Workspace',
        loadOptionsMethod: 'listWorkspaces',
      } as GraphParameterDefinition,
      {
        id: 'resource',
        type: 'resourceLocator',
        label: 'Target Resource',
        modes: ['list', 'dynamic'],
      } as unknown as GraphParameterDefinition,
      {
        id: 'auth',
        type: 'credential',
        label: 'Credentials',
        credentialType: 'http-basic',
      } as GraphParameterDefinition,
      {
        id: 'token',
        type: 'hidden',
        label: 'Internal Token',
      } as GraphParameterDefinition,
    ],
  } as unknown as GraphNodeManifest;
}

/** Node instance fixture with pre-set parameter values. */
function nodeFixture(parameters: Record<string, GraphJsonValue | undefined>): GraphNodeInstance {
  return {
    id: NODE_ID,
    kind: NODE_KIND,
    parameters,
  } as unknown as GraphNodeInstance;
}

describe('GraphParameterFormBuilder (schema-driven form state)', () => {
  it('discovers dynamic-option parameters and preserves hidden values verbatim', () => {
    const builder = new GraphParameterFormBuilder();
    const manifest = manifestFixture();
    const node = nodeFixture({ token: 'secret-internal-token', method: 'POST' });

    const state = builder.buildForm(node, manifest);

    expect(state.dynamicOptionsParameters).toEqual(['workspace']);
    expect(state.values['token']).toBe('secret-internal-token');
    expect(state.values['method']).toBe('POST');
    expect(state.renderedParameters.map((parameter) => parameter.id)).toEqual([
      'method',
      'workspace',
      'resource',
      'auth',
    ]);
    expect(state.renderedParameters).not.toContain(
      expect.objectContaining({ id: 'token' }) as unknown as GraphParameterDefinition
    );
  });

  it('applies manifest defaultValues for unset parameters', () => {
    const builder = new GraphParameterFormBuilder();
    const manifest = {
      kind: NODE_KIND,
      parameters: [{ id: 'region', type: 'string', defaultValue: 'eu-west-1' }],
    } as unknown as GraphNodeManifest;

    const state = builder.buildForm(nodeFixture({}), manifest);

    expect(state.values['region']).toBe('eu-west-1');
  });
});

describe('GraphParameterRendererRegistry (registered-UI fallback)', () => {
  it('resolves every registered parameter type to its dedicated component', () => {
    const registry = graphRegisterParameterRenderers(new GraphParameterRendererRegistry());

    expect(registry.resolve({ id: 'p', type: 'options' } as GraphParameterDefinition)).toBe(
      GraphOptionsParameterComponent
    );
    expect(
      registry.resolve({ id: 'p', type: 'resourceLocator' } as unknown as GraphParameterDefinition)
    ).toBe(GraphResourceLocatorParameterComponent);
    expect(
      registry.resolve({ id: 'p', type: 'credential' } as unknown as GraphParameterDefinition)
    ).toBe(GraphCredentialParameterComponent);
    expect(registry.has('options')).toBe(true);
  });

  it('falls back to the generic renderer for unregistered control types', () => {
    const registry = graphRegisterParameterRenderers(new GraphParameterRendererRegistry());
    const unregistered = {
      id: 'p',
      type: 'vendor-custom-control',
    } as unknown as GraphParameterDefinition;

    expect(registry.has('vendor-custom-control')).toBe(false);
    expect(registry.resolve(unregistered)).toBe(GraphGenericParameterComponent);
  });
});

describe('graphParameterValidationIssuesOf (value mapping)', () => {
  it('maps option values to validation issues', () => {
    const single = { id: 'method', type: 'options' } as GraphParameterDefinition;
    const multi = { id: 'tags', type: 'options', multiple: true } as GraphParameterDefinition;

    expect(graphParameterValidationIssuesOf(single, { not: 'primitive' })).toEqual([
      expect.objectContaining({ parameterId: 'method', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(multi, 'not-an-array')).toEqual([
      expect.objectContaining({ parameterId: 'tags', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(multi, ['a', { object: true }])).toEqual([
      expect.objectContaining({ parameterId: 'tags', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(single, 'GET')).toEqual([]);
  });

  it('maps malformed resource-locator values to validation issues', () => {
    const parameter = {
      id: 'resource',
      type: 'resourceLocator',
      label: 'Target Resource',
      modes: ['list', 'dynamic'],
    } as unknown as GraphParameterDefinition;

    expect(graphParameterValidationIssuesOf(parameter, 'res-1')).toEqual([
      expect.objectContaining({ parameterId: 'resource', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(parameter, { mode: 'bogus' })).toEqual([
      expect.objectContaining({ parameterId: 'resource', level: 'error' }),
    ]);
    expect(graphParameterValidationIssuesOf(parameter, { mode: 'list', value: 'res-1' })).toEqual([]);
  });

  it('rejects credential references whose type does not match the parameter', () => {
    const parameter = {
      id: 'auth',
      type: 'credential',
      label: 'Credentials',
      credentialType: 'http-basic',
    } as GraphParameterDefinition;

    const matching = graphParameterValidationIssuesOf(parameter, {
      credentialId: 'ci-jenkins',
      credentialType: 'http-basic',
    });
    expect(matching).toEqual([]);

    expect(
      graphParameterValidationIssuesOf(parameter, {
        credentialId: 'vault-token',
        credentialType: 'vault-token',
      })
    ).toEqual([expect.objectContaining({ parameterId: 'auth', level: 'error' })]);

    expect(graphParameterValidationIssuesOf(parameter, 'ci-jenkins')).toEqual([
      expect.objectContaining({ parameterId: 'auth', level: 'error' }),
    ]);
  });
});
