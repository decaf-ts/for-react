import { useState } from 'react';

type GraphHeaderTab = 'editor' | 'executions' | 'evaluations';

interface GraphHeaderAction {
  id: string;
  label: string;
  icon: 'download' | 'copy' | 'settings';
}

/**
 * @description Props accepted by the graph page header bar.
 * @summary Props accepted by the graph page header bar.
 * @memberOf module:for-react.diagrams
 */
export interface GraphHeaderbarProps {
  projectName?: string;
  workflowName?: string;
  activeTab?: GraphHeaderTab;
  actions?: GraphHeaderAction[];
  onWorkflowNameChange?: (name: string) => void;
  onTabChange?: (tab: GraphHeaderTab) => void;
  onAction?: (actionId: string) => void;
}

const DEFAULT_ACTIONS: GraphHeaderAction[] = [
  { id: 'duplicate', label: 'Duplicate workflow', icon: 'copy' },
  { id: 'download', label: 'Download JSON', icon: 'download' },
  { id: 'settings', label: 'Workflow settings', icon: 'settings' },
];

/**
 * @description Graph page header bar: project/workflow identity, tabs, tags and actions.
 * @summary Graph page header bar: project/workflow identity, tabs, tags and actions.
 * @memberOf module:for-react.diagrams
 */
export function GraphHeaderbar({
  projectName = 'Personal',
  workflowName = 'My workflow',
  activeTab = 'editor',
  actions = DEFAULT_ACTIONS,
  onWorkflowNameChange,
  onTabChange,
  onAction,
}: GraphHeaderbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(workflowName);
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [draftTag, setDraftTag] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [tab, setTab] = useState<GraphHeaderTab>(activeTab);

  const saveName = () => {
    const next = draftName.trim();
    if (!next) {
      setEditingName(false);
      setDraftName(workflowName);
      return;
    }
    setEditingName(false);
    onWorkflowNameChange?.(next);
  };

  const selectTab = (next: GraphHeaderTab) => {
    setTab(next);
    onTabChange?.(next);
  };

  return (
    <header className="dcf-header">
      <div className="dcf-header-identity">
        <div className="dcf-breadcrumbs">
          <span className="dcf-project-chip">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{projectName}</span>
          </span>
          <span className="dcf-breadcrumbs-separator">/</span>
          {editingName ? (
            <input
              className="dcf-workflow-name-input"
              type="text"
              value={draftName}
              aria-label="Workflow name"
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveName();
                if (event.key === 'Escape') setEditingName(false);
              }}
            />
          ) : (
            <button type="button" className="dcf-workflow-name" onClick={() => { setDraftName(workflowName); setEditingName(true); }}>
              {workflowName}
            </button>
          )}
        </div>
        <div className="dcf-tags">
          {tags.map((tag) => (
            <span key={tag} className="dcf-tag-pill">
              {tag}
              <button type="button" className="dcf-tag-pill-remove" aria-label={`Remove tag ${tag}`} onClick={() => setTags((current) => current.filter((entry) => entry !== tag))}>
                ×
              </button>
            </span>
          ))}
          {addingTag ? (
            <div className="dcf-tag-editor">
              <input
                className="dcf-tag-editor-input"
                type="text"
                value={draftTag}
                placeholder="Tag name"
                aria-label="Tag name"
                onChange={(event) => setDraftTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const next = draftTag.trim();
                    if (next && !tags.includes(next)) setTags((current) => [...current, next]);
                    setAddingTag(false);
                    setDraftTag('');
                  }
                  if (event.key === 'Escape') setAddingTag(false);
                }}
              />
              <button type="button" className="dcf-tag-editor-save" onClick={() => {
                const next = draftTag.trim();
                if (next && !tags.includes(next)) setTags((current) => [...current, next]);
                setAddingTag(false);
                setDraftTag('');
              }}>
                Add
              </button>
            </div>
          ) : (
            <button type="button" className="dcf-add-tag" onClick={() => setAddingTag(true)}>
              + Add tag
            </button>
          )}
        </div>
      </div>
      <div className="dcf-header-tabs" role="tablist" aria-label="Workflow sections">
        {(['editor', 'executions', 'evaluations'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            className={`dcf-tab${tab === entry ? ' dcf-tab-active' : ''}`}
            onClick={() => selectTab(entry)}
          >
            {entry[0].toUpperCase() + entry.slice(1)}
          </button>
        ))}
      </div>
      <div className="dcf-header-actions">
        <button
          type="button"
          className="dcf-header-actions-btn"
          aria-expanded={actionsOpen}
          aria-label="Workflow actions"
          onClick={() => setActionsOpen((open) => !open)}
        >
          ⋯
        </button>
        {actionsOpen ? (
          <ul className="dcf-header-actions-menu" role="menu">
            {actions.map((action) => (
              <li key={action.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsOpen(false);
                    onAction?.(action.id);
                  }}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </header>
  );
}

export default GraphHeaderbar;
