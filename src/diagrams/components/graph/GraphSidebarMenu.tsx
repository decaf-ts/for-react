import { useState } from 'react';
import type { IGraphSidebarItem } from '../../interfaces.js';

type GraphSidebarActionId = 'add' | 'search' | 'toggle';

/**
 * @description Props accepted by the collapsible graph sidebar menu.
 * @summary Props accepted by the collapsible graph sidebar menu.
 * @memberOf module:for-react.diagrams
 */
export interface GraphSidebarMenuProps {
  collapsed?: boolean;
  activeItem?: string;
  primaryItems?: IGraphSidebarItem[];
  secondaryItems?: IGraphSidebarItem[];
  onCollapsedChange?: (collapsed: boolean) => void;
  onSelectItem?: (item: IGraphSidebarItem) => void;
}

const DEFAULT_PRIMARY: IGraphSidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: 'home-dot', group: 'primary' },
  { id: 'chat', label: 'Chat', icon: 'brand-line', group: 'primary' },
];
const DEFAULT_SECONDARY: IGraphSidebarItem[] = [
  { id: 'templates', label: 'Templates', icon: 'package-open', group: 'secondary' },
  { id: 'insights', label: 'Insights', icon: 'chart-line', group: 'secondary' },
  { id: 'help', label: 'Help', icon: 'help-octagon', group: 'secondary' },
  { id: 'settings', label: 'Settings', icon: 'settings', group: 'secondary' },
];

/**
 * @description Collapsible graph page sidebar: grouped primary/secondary menu items.
 * @summary Collapsible graph page sidebar: grouped primary/secondary menu items.
 * @memberOf module:for-react.diagrams
 */
export function GraphSidebarMenu({
  collapsed = true,
  activeItem = 'overview',
  primaryItems = DEFAULT_PRIMARY,
  secondaryItems = DEFAULT_SECONDARY,
  onCollapsedChange,
  onSelectItem,
}: GraphSidebarMenuProps) {
  const [selectedTopAction, setSelectedTopAction] = useState<GraphSidebarActionId | null>(null);
  const expanded = !collapsed;

  const selectTopAction = (action: GraphSidebarActionId) => {
    if (action === 'toggle') {
      onCollapsedChange?.(!collapsed);
    }
    setSelectedTopAction(action);
  };

  const renderItem = (item: IGraphSidebarItem) => (
    <button
      key={item.id}
      type="button"
      className={`dcf-sidebar-nav-btn${activeItem === item.id ? ' dcf-sidebar-nav-btn-active' : ''}`}
      title={item.label}
      aria-label={item.label}
      onClick={() => onSelectItem?.(item)}
    >
      <span className={`ti ti-${item.icon}`} aria-hidden="true" />
      {expanded ? <span className="dcf-sidebar-nav-label">{item.label}</span> : null}
    </button>
  );

  return (
    <aside className={`dcf-sidebar${expanded ? ' dcf-sidebar-expanded' : ''}`}>
      <div className="dcf-sidebar-rail">
        <div className="dcf-sidebar-header">
          {(['add', 'search', 'toggle'] as const).map((action) => (
            <button
              key={action}
              type="button"
              className={`dcf-sidebar-icon-btn${selectedTopAction === action ? ' dcf-sidebar-icon-btn-selected' : ''}`}
              title={action === 'add' ? 'Add new item' : action === 'search' ? 'Open command palette' : expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={action === 'add' ? 'Add new item' : action === 'search' ? 'Open command palette' : expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => selectTopAction(action)}
            >
              {expanded ? <span className="dcf-sidebar-button-label">{action === 'toggle' ? 'Collapse' : action[0].toUpperCase() + action.slice(1)}</span> : null}
            </button>
          ))}
        </div>
        <div className="dcf-sidebar-scroll">
          <nav className="dcf-sidebar-menu dcf-sidebar-menu-primary" aria-label="Primary sidebar">
            {primaryItems.map(renderItem)}
          </nav>
        </div>
        <div className="dcf-sidebar-footer">
          <nav className="dcf-sidebar-menu dcf-sidebar-menu-secondary" aria-label="Secondary sidebar">
            {secondaryItems.map(renderItem)}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default GraphSidebarMenu;
