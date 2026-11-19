import { useState } from 'react';
import type { IHomeTabItem } from '../../interfaces.js';

type HomeTabIds = 'workflows' | 'credentials' | 'executions';

/**
 * @description Props accepted by the graph landing page.
 * @summary Props accepted by the graph landing page.
 * @memberOf module:for-react.diagrams
 */
export interface GraphHomeProps {
  tabs?: IHomeTabItem<HomeTabIds>[];
  initialTab?: HomeTabIds;
}

const DEFAULT_TABS: IHomeTabItem<HomeTabIds>[] = [
  { id: 'workflows', label: 'Workflows' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'executions', label: 'Executions' },
];

/**
 * @description Graph landing page: tabbed home area for workflows, credentials and executions.
 * @summary Graph landing page: tabbed home area for workflows, credentials and executions.
 * @memberOf module:for-react.diagrams
 */
export function GraphHomeComponent({ tabs = DEFAULT_TABS, initialTab = 'workflows' }: GraphHomeProps) {
  const [activeTab, setActiveTab] = useState<HomeTabIds>(initialTab);
  return (
    <section className="graph-home">
      <nav className="dcf-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`dcf-tabs-button${activeTab === tab.id ? ' dcf-tabs-button-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="dcf-tabs-content">
        <section role="tabpanel" aria-label={activeTab}>
          <div className="dcf-card">{activeTab}</div>
        </section>
      </div>
    </section>
  );
}

/**
 * @description Graph editor home page composing the renderer, sidebar and workflow picker.
 * @summary Graph editor home page composing the renderer, sidebar and workflow picker.
 * @memberOf module:for-react.diagrams
 */
export const GraphHome = GraphHomeComponent;
export default GraphHomeComponent;
