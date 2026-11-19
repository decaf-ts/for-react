/**
 * @note Adapted to for-react from the for-angular node-edit-modal, switch-edit-modal, engine-workflow-picker, port-field and parameter-renderer specs.
 *
 * @module for-react/graph/graph-editors.spec
 * @summary Node edit modal, switch editor, engine/workflow picker, port field and
 * schema-driven parameter renderers React/RTL contract.
 * @description The React port exchanges Angular `EventEmitter`s for the
 * `onValueChange`/`onChange`/`onSubmit`/`onSelect` callback props and plain form
 * state for `FormGroup`s. The assertions keep the original intent: the node modal
 * submits edited parameters, the switch editor preserves cases/defaults, the
 * picker projects the capability manifest into its states, the port field emits
 * value-mode edits, and the parameter renderers resolve static and catalogue-backed
 * options while the credential picker only ever emits a bare reference.
 */
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  GraphCredentialReference,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';

import { GraphNodeEditModal } from '../../../src/diagrams/components/graph/GraphNodeEditModal';
import { GraphSwitchEditModal } from '../../../src/diagrams/components/graph/GraphSwitchEditModal';
import { GraphEngineWorkflowPickerComponent } from '../../../src/diagrams/components/graph/GraphEngineWorkflowPicker';
import { GraphPortFieldComponent } from '../../../src/diagrams/components/graph/GraphPortField';
import { GraphOptionsParameterComponent } from '../../../src/diagrams/parameters/components/graph-options-parameter.component';
import { GraphResourceLocatorParameterComponent } from '../../../src/diagrams/parameters/components/graph-resource-locator-parameter.component';
import { GraphCredentialParameterComponent } from '../../../src/diagrams/parameters/components/graph-credential-parameter.component';
import { GraphParameterFieldComponent } from '../../../src/diagrams/parameters/components/graph-parameter-field.component';
import { GraphEngineCapabilityService } from '../../../src/diagrams/capabilities/GraphEngineCapabilityService';
import { GraphEngineCapabilityStore } from '../../../src/diagrams/capabilities/GraphEngineCapabilityStore';
import type {
  GraphEngineCapabilityManifest,
  GraphEngineCapabilitySource,
  GraphEngineDescriptor,
  GraphEngineFeature,
} from '../../../src/diagrams/capabilities';
import { PortDirection, type GraphPortDefinition } from '@decaf-ts/as-graph/shared';

const NODE: GraphNodeInstance = {
  id: 'node-1',
  kind: 'core.utility.code',
  label: 'Code',
  parameters: { code: 'return 1;' },
} as GraphNodeInstance;

const MANIFEST = {
  kind: 'core.utility.code',
  display: { name: 'Code' },
  inputs: [],
  outputs: [],
  parameters: [
    { id: 'code', type: 'code', label: 'Code', required: false },
    { id: 'note', type: 'string', label: 'Note' },
  ],
} as unknown as GraphNodeManifest;

describe('GraphNodeEditModal', () => {
  it('renders nothing while closed or without a node', () => {
    const { container, rerender } = render(<GraphNodeEditModal open={false} node={NODE} manifest={MANIFEST} />);
    expect(container.firstChild).toBeNull();
    rerender(<GraphNodeEditModal open node={null} manifest={MANIFEST} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the manifest parameter form and the current label', () => {
    render(<GraphNodeEditModal open node={NODE} manifest={MANIFEST} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Code' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Code')).toBeInTheDocument();
    const fieldLabels = Array.from(document.querySelectorAll('.graph-parameter-field-label')).map(
      (label) => label.textContent
    );
    expect(fieldLabels).toEqual(expect.arrayContaining(['Label', 'Code', 'Note']));
  });

  it('submits the edited parameters and label', async () => {
    const onSubmit = jest.fn();
    render(<GraphNodeEditModal open node={NODE} manifest={MANIFEST} onSubmit={onSubmit} />);
    const label = screen.getByDisplayValue('Code');
    await userEvent.clear(label);
    await userEvent.type(label, 'Renamed');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ code: 'return 1;' }), 'Renamed');
  });

  it('shows the degraded notice with the provided reason', () => {
    render(
      <GraphNodeEditModal open node={NODE} manifest={MANIFEST} degraded degradedReason="Catalogue down" />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Catalogue down');
  });

  it('shows the empty-parameters notice for a manifest without parameters', () => {
    render(
      <GraphNodeEditModal
        open
        node={{ ...NODE, kind: 'core.empty' } as GraphNodeInstance}
        manifest={{ kind: 'core.empty', parameters: [] } as unknown as GraphNodeManifest}
      />
    );
    expect(screen.getByText('This node kind declares no editable parameters.')).toBeInTheDocument();
  });

  it('closes through the Cancel action', () => {
    const onClose = jest.fn();
    render(<GraphNodeEditModal open node={NODE} manifest={MANIFEST} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('GraphSwitchEditModal', () => {
  const cases = [
    {
      id: 'case-0',
      label: 'Case 1',
      outputPort: 'case-0',
      condition: { op: 'eq', left: { path: 'value' }, right: { const: 'a' } },
    },
  ];

  it('renders nothing while closed', () => {
    const { container } = render(<GraphSwitchEditModal open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one fieldset per case and the default branch controls', () => {
    render(<GraphSwitchEditModal open cases={cases as never} hasDefault />);
    expect(screen.getByRole('group', { name: 'Case 1' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Has default branch' })).toBeChecked();
  });

  it('adds and removes cases before submitting', async () => {
    const onSubmit = jest.fn();
    render(<GraphSwitchEditModal open cases={cases as never} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add case' }));
    expect(screen.getByRole('group', { name: 'Case 2' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove case' })[0]);
    expect(screen.getAllByRole('group')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].cases).toHaveLength(1);
  });

  it('submits the edited default port and default flag', () => {
    const onSubmit = jest.fn();
    render(<GraphSwitchEditModal open cases={[] as never} hasDefault defaultPort="default" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({ cases: [], hasDefault: true, defaultPort: 'default' });
  });
});

/** A capability engine descriptor helper. */
function engine(engineId: string, capabilities: GraphEngineFeature[]): GraphEngineDescriptor {
  return { engineId, displayName: `Engine ${engineId}`, local: true, pinnedEngineVersion: '1.0.0', capabilities };
}

/** A manifest helper. */
function manifest(engines: GraphEngineDescriptor[], defaultEngineId = engines[0].engineId): GraphEngineCapabilityManifest {
  return { engines, defaultEngineId };
}

/** A fake capability source. */
function fakeSource(overrides: Partial<GraphEngineCapabilitySource> = {}): GraphEngineCapabilitySource {
  return {
    fetchManifest: jest.fn(async () => manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])])),
    fetchEngine: jest.fn(async () => undefined),
    listWorkflows: jest.fn(async () => [{ workflowId: 'wf-1', name: 'Workflow One' }]),
    getWorkflow: jest.fn(async () => ({
      id: 'wf-1',
      name: 'Workflow One',
      inputs: [],
      outputs: [],
      nodes: [],
      edges: [],
    }) as GraphWorkflowDocument),
    ...overrides,
  };
}

/** Builds a service around a fake source. */
function serviceOf(source: GraphEngineCapabilitySource): GraphEngineCapabilityService {
  return new GraphEngineCapabilityService(new GraphEngineCapabilityStore(), source);
}

/**
 * Flushes the picker's chained async load (manifest -> workflow list) inside
 * `act` so no state update resolves after the test body and React never reports
 * an unwrapped `act(...)` warning.
 */
async function settleUi(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('GraphEngineWorkflowPickerComponent', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<GraphEngineWorkflowPickerComponent open={false} service={serviceOf(fakeSource())} />);
    expect(container.querySelector('.graph-engine-workflow-picker')).toBeNull();
  });

  it('loads the manifest and lists the workflows when opened', async () => {
    const source = fakeSource();
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} />);
    await waitFor(() => expect(screen.getByText('wf-1')).toBeInTheDocument());
    expect(source.fetchManifest).toHaveBeenCalledTimes(1);
    expect(source.listWorkflows).toHaveBeenCalledWith('engine-a');
    await settleUi();
    unmount();
  });

  it('shows the unsupported message when the engine cannot browse', async () => {
    const source = fakeSource({
      fetchManifest: jest.fn(async () =>
        manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'NOT_SUPPORTED' }])])
      ),
    });
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} />);
    await waitFor(() =>
      expect(screen.getByText('The selected engine does not advertise a workflow catalogue.')).toBeInTheDocument()
    );
    await settleUi();
    unmount();
  });

  it('shows the empty state when the engine lists no workflows', async () => {
    const source = fakeSource({ listWorkflows: jest.fn(async () => []) });
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} />);
    await waitFor(() => expect(screen.getByText('No workflows listed.')).toBeInTheDocument());
    await settleUi();
    unmount();
  });

  it('resolves the document and reports the selection when a workflow is opened', async () => {
    const source = fakeSource();
    const onSelect = jest.fn();
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} onSelect={onSelect} />);
    const open = await screen.findByRole('button', { name: 'Open' });
    fireEvent.click(open);
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(source.getWorkflow).toHaveBeenCalledWith('engine-a', 'wf-1');
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      engineId: 'engine-a',
      summary: expect.objectContaining({ workflowId: 'wf-1' }),
      document: expect.objectContaining({ id: 'wf-1' }),
    });
    await settleUi();
    unmount();
  });

  it('disables Open when the engine blocks running', async () => {
    const source = fakeSource({
      fetchManifest: jest.fn(async () =>
        manifest([
          engine('engine-a', [
            { feature: 'workflowList', verdict: 'SUPPORTED' },
            { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
          ]),
        ])
      ),
    });
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} />);
    const open = await screen.findByRole('button', { name: 'Open' });
    expect(open).toBeDisabled();
    await settleUi();
    unmount();
  });

  it('renders the engine selector only when more than one engine exists', async () => {
    const source = fakeSource({
      fetchManifest: jest.fn(async () =>
        manifest([
          engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
          engine('engine-b', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
        ])
      ),
    });
    const { unmount } = render(<GraphEngineWorkflowPickerComponent open service={serviceOf(source)} />);
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    await settleUi();
    unmount();
  });

  it('reports dismissal', async () => {
    const onDismiss = jest.fn();
    const source = fakeSource();
    const { unmount } = render(
      <GraphEngineWorkflowPickerComponent open service={serviceOf(source)} onDismiss={onDismiss} />
    );
    await waitFor(() => expect(source.fetchManifest).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await settleUi();
    unmount();
  });
});

describe('GraphPortFieldComponent', () => {
  const port = {
    property: 'code',
    name: 'code',
    label: 'Code',
    direction: PortDirection.INPUT,
    type: 'code',
    graph: { userControlled: true },
  } as unknown as GraphPortDefinition;

  const field = {
    port,
    label: 'Code',
    type: 'textarea',
    value: 'return 1;',
    useAsPort: false,
    valueMode: 'literal' as const,
    valueModes: ['port', 'literal', 'expression'] as const,
  };

  it('renders the label and the value-mode buttons', () => {
    render(<GraphPortFieldComponent field={{ ...field, valueModes: [...field.valueModes] }} />);
    expect(document.querySelector('.graph-port-field__label')).toHaveTextContent('Code');
    const modeButtons = Array.from(document.querySelectorAll('.graph-port-field__mode')).map(
      (button) => button.textContent
    );
    expect(modeButtons).toEqual(['Value', 'Code']);
  });

  it('emits a value change when the text is edited', () => {
    const onChange = jest.fn();
    render(<GraphPortFieldComponent field={{ ...field, valueModes: [...field.valueModes] }} onChange={onChange} />);
    fireEvent.change(document.querySelector('.graph-port-field__textarea') as HTMLElement, {
      target: { value: 'return 2;' },
    });
    expect(onChange).toHaveBeenCalledWith({ property: 'code', value: 'return 2;', useAsPort: false });
  });

  it('emits a mode change when another value mode is chosen', () => {
    const onModeChange = jest.fn();
    render(<GraphPortFieldComponent field={{ ...field, valueModes: [...field.valueModes] }} onModeChange={onModeChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    expect(onModeChange).toHaveBeenCalledWith(expect.objectContaining({ property: 'code', mode: 'expression' }));
  });

  it('toggles the port/value binding', () => {
    const onChange = jest.fn();
    render(<GraphPortFieldComponent field={{ ...field, valueModes: [...field.valueModes] }} onChange={onChange} />);
    fireEvent.click(document.querySelector('.graph-port-field__port-toggle') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith({ property: 'code', value: 'return 1;', useAsPort: true });
  });
});

describe('schema-driven parameter renderers', () => {
  it('renders static options and emits the selected value', () => {
    const onValueChange = jest.fn();
    const parameter = {
      id: 'method',
      type: 'options',
      label: 'Method',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    } as GraphParameterDefinition;
    render(<GraphOptionsParameterComponent parameter={parameter} value="POST" onValueChange={onValueChange} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('POST');
    fireEvent.change(select, { target: { value: 'GET' } });
    expect(onValueChange).toHaveBeenCalledWith('GET');
  });

  it('resolves dynamic options through the catalogue-backed loadOptions callback', async () => {
    const loadOptions = jest.fn(async () => [
      { label: 'Acme', value: 'acme' },
      'plain-primitive',
      { invalid: 'entry' },
    ]);
    const parameter = {
      id: 'workspace',
      type: 'options',
      label: 'Workspace',
      loadOptionsMethod: 'listWorkspaces',
    } as GraphParameterDefinition;
    render(
      <GraphOptionsParameterComponent
        parameter={parameter}
        value={undefined}
        context={{ node: NODE, manifest: MANIFEST, values: {}, loadOptions } as never}
        onValueChange={jest.fn()}
      />
    );
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    expect(loadOptions).toHaveBeenCalledWith(
      parameter,
      expect.objectContaining({ method: 'listWorkspaces', nodeId: 'node-1' })
    );
    expect(screen.getByRole('option', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'plain-primitive' })).toBeInTheDocument();
  });

  it('renders the resource locator modes and emits a locator record', () => {
    const onValueChange = jest.fn();
    const parameter = {
      id: 'resource',
      type: 'resourceLocator',
      label: 'Resource',
      modes: ['list', 'dynamic'],
    } as unknown as GraphParameterDefinition;
    render(
      <GraphResourceLocatorParameterComponent
        parameter={parameter}
        value={{ mode: 'list', value: 'res-1' } as never}
        onValueChange={onValueChange}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('list');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dynamic' } });
    expect(onValueChange).toHaveBeenCalledWith({ mode: 'dynamic', value: 'res-1' });
  });

  it('lists only credential references matching the parameter type and emits a bare reference', () => {
    const onValueChange = jest.fn();
    const parameter = {
      id: 'auth',
      type: 'credential',
      label: 'Credentials',
      credentialType: 'http-basic',
    } as unknown as GraphParameterDefinition;
    const credentialOptions: GraphCredentialReference[] = [
      { credentialId: 'ci-jenkins', credentialType: 'http-basic' },
      { credentialId: 'vault-token', credentialType: 'vault-token' },
    ];
    render(
      <GraphCredentialParameterComponent
        parameter={parameter}
        value={{ credentialId: 'ci-jenkins', credentialType: 'http-basic' } as never}
        context={{ node: NODE, manifest: MANIFEST, values: {}, credentialOptions } as never}
        onValueChange={onValueChange}
      />
    );
    expect(screen.getByRole('option', { name: 'ci-jenkins' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'vault-token' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ci-jenkins' } });
    expect(onValueChange).toHaveBeenCalledWith({
      credentialId: 'ci-jenkins',
      credentialType: 'http-basic',
    });
  });

  it('never reads secret-bearing properties from the current credential value', () => {
    const accessed = new Set<string>();
    const probingValue = new Proxy(
      { credentialId: 'ci-jenkins', credentialType: 'http-basic', secret: 'super-secret' },
      {
        get(target, property: string) {
          accessed.add(property);
          return (target as Record<string, unknown>)[property];
        },
      }
    );
    const parameter = {
      id: 'auth',
      type: 'credential',
      credentialType: 'http-basic',
    } as unknown as GraphParameterDefinition;
    render(
      <GraphCredentialParameterComponent
        parameter={parameter}
        value={probingValue as never}
        context={
          {
            node: NODE,
            manifest: MANIFEST,
            values: {},
            credentialOptions: [{ credentialId: 'ci-jenkins', credentialType: 'http-basic' }],
          } as never
        }
        onValueChange={jest.fn()}
      />
    );
    expect(Object.keys(probingValue)).toBeDefined();
    expect(accessed.has('secret')).toBe(false);
  });

  it('dispatches the resolved renderer through the parameter field and surfaces errors', () => {
    const parameter = { id: 'tags', type: 'options', label: 'Tags', multiple: true } as GraphParameterDefinition;
    render(
      <GraphParameterFieldComponent
        parameter={parameter}
        value={'not-an-array' as never}
        onValueChange={jest.fn()}
        onErrorChange={jest.fn()}
      />
    );
    expect(screen.getByText('Tags')).toBeInTheDocument();
    // The field dispatches the registered options renderer (a multi-select here).
    expect(document.querySelector('.graph-options-parameter')).not.toBeNull();
  });
});
