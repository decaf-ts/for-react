import type { IMenuItem } from '../lib/engine/interfaces.js';
/**
 * @description Callback invoked by a graph sidebar menu item.
 * @summary Callback invoked by a graph sidebar menu item.
 * @memberOf module:for-react.diagrams
 */
export type GraphSidebarHandler = (...args: unknown[]) => unknown;

/**
 * @description Graph sidebar menu item: a {@link IMenuItem} extended with grouping and a UI-function handler.
 * @summary Graph sidebar menu item: a {@link IMenuItem} extended with grouping and a UI-function handler.
 * @property id - Stable item identifier.
 * @property label - Display label.
 * @property icon - Icon identifier rendered by the sidebar.
 * @property group - Whether the item renders in the primary or secondary group.
 * @property handler - Optional handler invoked when the item is activated.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export interface IGraphSidebarItem extends IMenuItem {
  id: string;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
  handler?: GraphSidebarHandler;
}
/**
 * @description One tab of the graph home page.
 * @summary One tab of the graph home page.
 * @property id - Stable tab identifier.
 * @property label - Display label of the tab.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export interface IHomeTabItem<T extends string> {
  id: T;
  label: string;
}
