/**
 * @note Adapted to for-react from the for-angular toolbar/header/sidebar/home component specs.
 *
 * @module for-react/graph/graph-chrome.spec
 * @summary Graph editor chrome (toolbar, headerbar, sidebar, home) React/RTL contract.
 * @description The Angular components emitted outputs through `EventEmitter`s and
 * read the capability store through DI. The React port is prop-driven: hosts pass
 * the resolved gates and receive callbacks. These tests pin the same user-facing
 * intent — Run is blocked/titled on validity, engine and per-workflow gates; Save
 * honours its availability; Cancel/Edit appear only in their windows; undo/redo
 * and autosave callbacks fire — against the React prop surface.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GraphToolbar } from '../../../src/diagrams/components/graph/GraphToolbar';
import { GraphHeaderbar } from '../../../src/diagrams/components/graph/GraphHeaderbar';
import { GraphSidebarMenu } from '../../../src/diagrams/components/graph/GraphSidebarMenu';
import { GraphHomeComponent } from '../../../src/diagrams/components/graph/GraphHome';

/** Renders the toolbar with the given props and returns probes. */
function renderToolbar(props: Partial<React.ComponentProps<typeof GraphToolbar>> = {}) {
  const handlers = {
    onRun: jest.fn(),
    onCancel: jest.fn(),
    onSave: jest.fn(),
    onEdit: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onArrange: jest.fn(),
    onAutoSaveToggle: jest.fn(),
  };
  const utils = render(<GraphToolbar workflowId="text-pipeline-workflow" {...handlers} {...props} />);
  return { ...utils, ...handlers };
}

describe('GraphToolbar — Run gate', () => {
  it('enables Run and titles it with the start affordance when the graph is valid', () => {
    renderToolbar({ canRun: true, invalid: false });
    const run = screen.getByRole('button', { name: 'Start workflow' });
    expect(run).toBeEnabled();
    expect(run).toHaveTextContent('Start');
    expect(document.querySelector('.graph-float-btn--invalid')).toBeNull();
  });

  it('disables and titles Run, and renders the Invalid (n) badge, when the graph is invalid', () => {
    const issues = [
      { code: 'graph.edge.dangling', path: 'edges.0', message: 'Edge target is missing' },
      { code: 'graph.node.missing', path: 'nodes.1', message: 'Node kind is not registered' },
    ];
    renderToolbar({ canRun: false, invalid: true, validationIssues: issues });
    const run = screen.getByRole('button', { name: 'Fix 2 validation issue(s) before running' });
    const badge = document.querySelector('.graph-float-btn--invalid') as HTMLElement;
    expect(run).toBeDisabled();
    expect(run).toHaveAttribute('aria-disabled', 'true');
    expect(badge).toHaveTextContent('Invalid (2)');
    expect(badge).toHaveAttribute('title', 'Fix 2 validation issue(s) before running');
  });

  it('does not call onRun when Run is clicked on an invalid graph', () => {
    const { onRun } = renderToolbar({
      canRun: false,
      invalid: true,
      validationIssues: [{ code: 'c', path: 'p', message: 'm' }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fix 1 validation issue(s) before running' }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('disables Run when the backend is unavailable even though the graph is not invalid', () => {
    renderToolbar({ canRun: false, invalid: false });
    const run = screen.getByRole('button', { name: 'Start workflow' });
    expect(run).toBeDisabled();
    expect(document.querySelector('.graph-float-btn--invalid')).toBeNull();
  });

  it('calls onRun when Run is clicked on a valid, available graph', () => {
    const { onRun } = renderToolbar({ canRun: true, invalid: false });
    fireEvent.click(screen.getByRole('button', { name: 'Start workflow' }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('renders no Cancel affordance while no run is in flight', () => {
    renderToolbar({ canRun: true, isRunning: false });
    expect(document.querySelector('.graph-float-btn--cancel')).toBeNull();
  });

  it('calls onCancel once when Cancel is clicked on a running workflow', () => {
    const { onCancel } = renderToolbar({ canRun: false, isRunning: true });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('GraphToolbar — per-workflow and engine run gates', () => {
  it('disables Run and names the per-workflow read-only block for a runnable:false row', () => {
    renderToolbar({ canRun: true, workflowRunnable: false, invalid: false });
    const run = screen.getByRole('button', { name: 'This workflow is read-only and cannot be run' });
    expect(run).toBeDisabled();
    expect(run).toHaveAttribute('aria-disabled', 'true');
    expect(run.getAttribute('title')).not.toBe('Start workflow');
  });

  it('keeps Run enabled and named with the normal action for a runnable:true row', () => {
    renderToolbar({ canRun: true, workflowRunnable: true, invalid: false });
    const run = screen.getByRole('button', { name: 'Start workflow' });
    expect(run).toBeEnabled();
    expect(run).toHaveAttribute('aria-disabled', 'false');
  });

  it('does not call onRun for a runnable:false row even when clicked', () => {
    const { onRun } = renderToolbar({ canRun: true, workflowRunnable: false, invalid: false });
    fireEvent.click(screen.getByRole('button', { name: 'This workflow is read-only and cannot be run' }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('disables and titles Run when the engine explicitly blocks running', () => {
    renderToolbar({ canRun: true, invalid: false, canRunWorkflow: false });
    const run = screen.getByRole('button', {
      name: 'The selected engine does not support running workflows',
    });
    expect(run).toBeDisabled();
    expect(run).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps Run enabled when the engine leaves running undeclared', () => {
    renderToolbar({ canRun: true, invalid: false, canRunWorkflow: true });
    expect(screen.getByRole('button', { name: 'Start workflow' })).toBeEnabled();
  });
});

describe('GraphToolbar — Save gate', () => {
  it('enables Save and titles it with the save affordance when saving is available', () => {
    renderToolbar({ canSaveWorkflow: true });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    expect(save).toHaveAttribute('aria-disabled', 'false');
    expect(save).toHaveAttribute('title', 'Save workflow');
  });

  it('disables Save and swaps the title when saving is unavailable', () => {
    renderToolbar({ canSaveWorkflow: false, saveTitle: 'Fix 2 validation issue(s) before saving' });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(save).toHaveAttribute('title', 'Fix 2 validation issue(s) before saving');
  });

  it('does not call onSave when Save is disabled', () => {
    const { onSave } = renderToolbar({ canSaveWorkflow: false });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave once when Save is clicked on an available graph', () => {
    const { onSave } = renderToolbar({ canSaveWorkflow: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows the saving affordance while a save is in flight', () => {
    renderToolbar({ isSaving: true });
    const save = screen.getByRole('button', { name: 'Saving…' });
    expect(save).toBeDisabled();
  });
});

describe('GraphToolbar — edit, undo/redo and autosave affordances', () => {
  it('renders no Edit affordance before a run has happened', () => {
    renderToolbar({ hasRun: false, isRunning: false });
    expect(document.querySelector('.graph-float-btn--edit')).toBeNull();
  });

  it('renders and wires the Edit affordance once a run has happened', () => {
    const { onEdit } = renderToolbar({ hasRun: true, isRunning: false });
    const edit = screen.getByRole('button', { name: 'Edit' });
    expect(edit).toHaveAttribute('title', 'Back to edit mode');
    fireEvent.click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders no Edit affordance while a run is in flight', () => {
    renderToolbar({ hasRun: true, isRunning: true });
    expect(document.querySelector('.graph-float-btn--edit')).toBeNull();
  });

  it('disables undo/redo until the history allows them and forwards clicks', () => {
    const { onUndo, onRedo } = renderToolbar({ canUndo: true, canRedo: false });
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toBeEnabled();
    expect(redo).toBeDisabled();
    fireEvent.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(redo);
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('forwards the autosave toggle state', () => {
    const { onAutoSaveToggle } = renderToolbar({ autoSaveEnabled: false });
    const toggle = screen.getByRole('checkbox', { name: 'Auto-Save' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(onAutoSaveToggle).toHaveBeenCalledWith(true);
  });
});

describe('GraphHeaderbar', () => {
  it('renames the workflow on Enter and emits the trimmed name', async () => {
    const onWorkflowNameChange = jest.fn();
    render(<GraphHeaderbar workflowName="My workflow" onWorkflowNameChange={onWorkflowNameChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'My workflow' }));
    const input = screen.getByRole('textbox', { name: 'Workflow name' });
    await userEvent.clear(input);
    await userEvent.type(input, '  Renamed  {enter}');
    expect(onWorkflowNameChange).toHaveBeenCalledWith('Renamed');
  });

  it('reverts a blank rename instead of emitting it', async () => {
    const onWorkflowNameChange = jest.fn();
    render(<GraphHeaderbar workflowName="My workflow" onWorkflowNameChange={onWorkflowNameChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'My workflow' }));
    const input = screen.getByRole('textbox', { name: 'Workflow name' });
    await userEvent.clear(input);
    await userEvent.type(input, '   {enter}');
    expect(onWorkflowNameChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'My workflow' })).toBeInTheDocument();
  });

  it('switches tabs and reports the active tab', () => {
    const onTabChange = jest.fn();
    render(<GraphHeaderbar onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: 'Editor' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Executions' }));
    expect(screen.getByRole('tab', { name: 'Executions' })).toHaveAttribute('aria-selected', 'true');
    expect(onTabChange).toHaveBeenCalledWith('executions');
  });

  it('opens the actions menu and reports the chosen action', () => {
    const onAction = jest.fn();
    render(<GraphHeaderbar onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Workflow actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate workflow' }));
    expect(onAction).toHaveBeenCalledWith('duplicate');
  });

  it('adds and removes tags locally', async () => {
    render(<GraphHeaderbar />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add tag' }));
    const tagInput = screen.getByRole('textbox', { name: 'Tag name' });
    await userEvent.type(tagInput, 'prod{enter}');
    expect(screen.getByText('prod')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag prod' }));
    expect(screen.queryByText('prod')).not.toBeInTheDocument();
  });
});

describe('GraphSidebarMenu', () => {
  it('hides item labels when collapsed and shows them when expanded', () => {
    const { rerender } = render(<GraphSidebarMenu collapsed />);
    expect(document.querySelector('.dcf-sidebar-nav-label')).toBeNull();
    rerender(<GraphSidebarMenu collapsed={false} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('reports the collapsed-state toggle', () => {
    const onCollapsedChange = jest.fn();
    render(<GraphSidebarMenu collapsed={false} onCollapsedChange={onCollapsedChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('reports the selected item and marks it active', () => {
    const onSelectItem = jest.fn();
    render(<GraphSidebarMenu collapsed={false} activeItem="overview" onSelectItem={onSelectItem} />);
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveClass('dcf-sidebar-nav-btn-active');
    fireEvent.click(screen.getByRole('button', { name: 'Templates' }));
    expect(onSelectItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'templates' }));
  });
});

describe('GraphHomeComponent', () => {
  it('renders the default tabs and selects the initial tab', () => {
    render(<GraphHomeComponent />);
    expect(screen.getByRole('tab', { name: 'Workflows' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'workflows' })).toBeInTheDocument();
  });

  it('switches the active tab and panel content', () => {
    render(<GraphHomeComponent />);
    fireEvent.click(screen.getByRole('tab', { name: 'Credentials' }));
    expect(screen.getByRole('tab', { name: 'Credentials' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'credentials' })).toBeInTheDocument();
  });

  it('honours an explicit initial tab and custom tab set', () => {
    render(
      <GraphHomeComponent
        initialTab="executions"
        tabs={[{ id: 'executions', label: 'Runs' }]}
      />
    );
    expect(screen.getByRole('tab', { name: 'Runs' })).toHaveAttribute('aria-selected', 'true');
  });
});
