import type { GraphValidationIssue } from '../../validation/GraphWorkflowValidateClient.js';

/**
 * @description Props accepted by the graph editor toolbar.
 * @summary Props accepted by the graph editor toolbar.
 * @memberOf module:for-react.diagrams
 */
export interface GraphToolbarProps {
  workflowId: string;
  canRun?: boolean;
  workflowRunnable?: boolean;
  isRunning?: boolean;
  invalid?: boolean;
  validationIssues?: GraphValidationIssue[];
  hasRun?: boolean;
  autoSaveEnabled?: boolean;
  isSaving?: boolean;
  canSaveWorkflow?: boolean;
  canRunWorkflow?: boolean;
  engineLabel?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  saveTitle?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  onArrange?: () => void;
  onAutoSaveToggle?: (enabled: boolean) => void;
  onSave?: () => void;
  onRun?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

/**
 * @description Graph editor toolbar: run/autosave toggles plus undo/redo/save controls.
 * @summary Graph editor toolbar: run/autosave toggles plus undo/redo/save controls.
 * @memberOf module:for-react.diagrams
 */
export function GraphToolbar({
  workflowId,
  canRun = true,
  workflowRunnable = true,
  isRunning = false,
  invalid = false,
  validationIssues = [],
  hasRun = false,
  autoSaveEnabled = false,
  isSaving = false,
  canSaveWorkflow = true,
  canRunWorkflow = true,
  engineLabel = '',
  canUndo = false,
  canRedo = false,
  saveTitle,
  onUndo,
  onRedo,
  onArrange,
  onAutoSaveToggle,
  onSave,
  onRun,
  onCancel,
  onEdit,
}: GraphToolbarProps) {
  const runDisabled =
    !canRun || isRunning || invalid || !workflowRunnable || !canRunWorkflow;
  const runTitle = !canRunWorkflow
    ? 'The selected engine does not support running workflows'
    : !workflowRunnable
      ? 'This workflow is read-only and cannot be run'
      : invalid
        ? `Fix ${validationIssues.length} validation issue(s) before running`
        : 'Start workflow';
  const saveDisabled = isSaving || !canSaveWorkflow || !workflowId;
  const effectiveSaveTitle = saveTitle ?? (saveDisabled ? 'Saving is unavailable' : 'Save workflow');

  return (
    <div className="graph-float-controls" data-workflow-id={workflowId}>
      <div className="graph-float-controls__group graph-float-controls__group--left">
        <button type="button" className="graph-float-btn" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
          ↩
        </button>
        <button type="button" className="graph-float-btn" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo">
          ↪
        </button>
        <button type="button" className="graph-float-btn graph-float-btn--arrange" disabled={isRunning} onClick={onArrange} title="Auto-arrange graph">
          Arrange
        </button>
      </div>
      <div className="graph-float-controls__group graph-float-controls__group--right">
        {engineLabel ? (
          <span className="graph-float-btn graph-float-btn--engine" role="status" title={engineLabel}>
            {engineLabel}
          </span>
        ) : null}
        <label className="graph-float-toggle" title="Auto-Save">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            aria-label="Auto-Save"
            onChange={(event) => onAutoSaveToggle?.(event.target.checked)}
          />
        </label>
        <button
          type="button"
          className="graph-float-btn graph-float-btn--save"
          disabled={saveDisabled}
          aria-disabled={saveDisabled}
          title={effectiveSaveTitle}
          onClick={onSave}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {invalid ? (
          <span className="graph-float-btn graph-float-btn--invalid" role="status" title={runTitle}>
            Invalid ({validationIssues.length})
          </span>
        ) : null}
        {isRunning ? (
          <button type="button" className="graph-float-btn graph-float-btn--cancel" onClick={onCancel} title="Cancel run">
            Cancel
          </button>
        ) : null}
        {hasRun && !isRunning ? (
          <button type="button" className="graph-float-btn graph-float-btn--edit" onClick={onEdit} title="Back to edit mode">
            Edit
          </button>
        ) : null}
        <button
          type="button"
          className={`graph-float-btn graph-float-btn--run${isRunning ? ' graph-float-btn--running' : ''}`}
          disabled={runDisabled}
          aria-disabled={runDisabled}
          aria-label={runTitle}
          title={runTitle}
          onClick={onRun}
        >
          {isRunning ? '…' : 'Start'}
        </button>
      </div>
    </div>
  );
}

export default GraphToolbar;
