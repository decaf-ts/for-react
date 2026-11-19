import type { OrderDirection } from "@decaf-ts/core";
import type { FieldProperties, IPagedComponentProperties, CrudOperationKeys } from "@decaf-ts/ui-decorators";
import type { Model } from "@decaf-ts/decorator-validation";
import type { ComponentType } from "react";
import type { FieldUpdateMode, FormServiceControl, KeyValue, StringOrBoolean } from "./types.js";

/**
 * @description Marker for outputs that are rendered by a specific renderer.
 * @summary Carries the renderer identifier so the engine can route the output
 * to the correct React renderer instance.
 * @memberOf module:for-react
 */
export interface IRenderedModel {
  rendererId?: string;
}

/**
 * @description Base properties shared by all renderable components.
 * @summary Merges decaf field metadata and paged-component options with the
 * model binding and tag used by the React rendering engine.
 * @memberOf module:for-react
 */
export interface IComponentProperties extends FieldProperties, IPagedComponentProperties {
  model?: Model | string;
  props?: FieldProperties;
  tag?: string;
}

/**
 * @description Component properties specific to form fields.
 * @summary Adds the validation update mode, the owning form identifier and the
 * CRUD operation being performed to {@link IComponentProperties}.
 * @memberOf module:for-react
 */
export interface IFormComponentProperties extends IComponentProperties {
  updateMode?: FieldUpdateMode;
  formId?: string;
  operation?: CrudOperationKeys;
}

/**
 * @description Declarative description of a component subtree.
 * @summary Names the component to render, its inputs and any nested child
 * configurations, allowing the engine to build a render tree from data.
 * @memberOf module:for-react
 */
export interface IComponentConfig {
  component: string;
  inputs: IComponentProperties;
  children?: IComponentConfig[];
}

/**
 * @description A fieldset tab or step entry.
 * @summary Describes the ordering, title and optional help text of a grouped
 * section within a form.
 * @memberOf module:for-react
 */
export interface IFieldSetItem {
  index: number;
  title: string;
  description?: string;
}

/**
 * @description Payload emitted when a fieldset group is validated.
 * @summary Reports the group's values and whether the group currently passes
 * validation.
 * @memberOf module:for-react
 */
export interface IFieldSetValidationEvent {
  formGroup: KeyValue;
  value: unknown;
  isValid: boolean;
}

/**
 * @description A single clause of a filter query.
 * @summary Pairs an optional attribute index and comparison condition with the
 * value to match.
 * @memberOf module:for-react
 */
export interface IFilterQueryItem {
  index?: string;
  condition?: string;
  value?: string;
}

/**
 * @description Sort instruction for a list query.
 * @summary Names the attribute to sort by and the direction to apply.
 * @memberOf module:for-react
 */
export interface ISortObject {
  value: string;
  direction: OrderDirection;
}

/**
 * @description Structured filter and sort description.
 * @summary Bundles an optional list of filter clauses with the sort to apply,
 * as used by list and table components.
 * @memberOf module:for-react
 */
export interface IFilterQuery {
  query: IFilterQueryItem[] | undefined;
  sort: ISortObject;
}

/**
 * @description A node emitted by the dynamic component renderer.
 * @summary Describes a component to mount, its inputs, children and form
 * binding so dynamic output can be rendered recursively.
 * @memberOf module:for-react
 */
export interface ReactDynamicOutput {
  component?: ComponentType<any>;
  rendererId?: string;
  inputs?: Record<string, unknown>;
  children?: ReactDynamicOutput[];
  formId?: string;
  projectable?: boolean;
}

/**
 * @description Option rendered by a select or choice input.
 * @summary Pairs display text with the submitted value and optional styling or
 * disabled state.
 * @memberOf module:for-react
 */
export interface InputOption {
  text: string;
  value: string | number;
  disabled?: StringOrBoolean;
  className?: string;
  icon?: string;
}

/**
 * @description Payload emitted when a list component refreshes.
 * @summary Carries the records that should be rendered by the list.
 * @memberOf module:for-react
 */
export interface IListComponentRefreshEvent {
  data: KeyValue[];
}

/**
 * @description Custom list-item event.
 * @summary Extends the base event with the triggered action and the primary key
 * of the affected record.
 * @memberOf module:for-react
 */
export interface ListItemCustomEvent extends IBaseCustomEvent {
  action: string;
  pk?: string;
}

/**
 * @description Common shape for all engine custom events.
 * @summary Records the event name plus optional component, payload and DOM
 * target so handlers can dispatch and route events uniformly.
 * @memberOf module:for-react
 */
export interface IBaseCustomEvent {
  name: string;
  component?: string;
  data?: unknown;
  target?: EventTarget | null;
}

/**
 * @description Event reporting the outcome of a model page action.
 * @summary Extends the base event with a success flag and an optional message
 * for display to the user.
 * @memberOf module:for-react
 */
export interface IModelPageCustomEvent extends IBaseCustomEvent {
  success: boolean;
  message?: string;
}

/**
 * @description Prefix and suffix configuration for i18n resources.
 * @summary Defines how translation resource keys are composed for a feature.
 * @memberOf module:for-react
 */
export interface I18nResourceConfig {
  prefix: string;
  suffix: string;
}

/**
 * @description i18n token describing a translation resource set.
 * @summary Lists the resource key configurations and whether the suffix is
 * versioned.
 * @memberOf module:for-react
 */
export interface I18nToken {
  resources: I18nResourceConfig[];
  versionedSuffix: boolean;
}

/**
 * @description Event emitted by a CRUD form.
 * @summary Extends the base event with optional action handlers supplied by the
 * form.
 * @memberOf module:for-react
 */
export interface ICrudFormEvent extends IBaseCustomEvent {
  handlers?: Record<string, unknown>;
}

/**
 * @description Event emitted when a list paginator changes page.
 * @summary Carries the target page and the navigation direction.
 * @memberOf module:for-react
 */
export interface IPaginationCustomEvent extends IBaseCustomEvent {
  data: {
    page: number;
    direction: "next" | "previous";
  };
}

/**
 * @description Entry in a navigation menu.
 * @summary Describes the label, optional title, link, icon and accent colour of
 * a menu item.
 * @memberOf module:for-react
 */
export interface IMenuItem {
  label: string;
  title?: string;
  url?: string;
  icon?: string;
  color?: string;
}

/**
 * @description Payload emitted when a reactive form is submitted.
 * @summary Carries the submitted form data.
 * @memberOf module:for-react
 */
export interface IFormReactiveSubmitEvent {
  data: Record<string, unknown>;
}

/**
 * @description Configuration of CRUD form action buttons.
 * @summary Defines the submit button and an optional clear button, including
 * their icons, icon placement and labels.
 * @memberOf module:for-react
 */
export interface ICrudFormOptions {
  buttons: {
    submit: {
      icon?: string;
      iconSlot?: "start" | "end";
      text?: string;
    };
    clear?: {
      icon?: string;
      iconSlot?: "start" | "end";
      text?: string;
    };
  };
}

/**
 * @description Copy and behaviour shown when a list has no items.
 * @summary Provides the empty-state title, subtitle, optional call-to-action
 * button and its link and icon.
 * @memberOf module:for-react
 */
export interface IListEmptyOptions {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}

/**
 * @description Payload describing a window resize.
 * @summary Carries the new viewport width and height.
 * @memberOf module:for-react
 */
export interface IWindowResizeEvent {
  width: number;
  height: number;
}

/**
 * @description Describes a failed file upload.
 * @summary Pairs the file name and optional size with the error that caused the
 * failure.
 * @memberOf module:for-react
 */
export interface IFileUploadError {
  name: string;
  size?: number;
  error: string;
}

/**
 * @description Result of a listable data fetch.
 * @summary Carries the rendered items plus optional metadata such as totals or
 * cursor information.
 * @memberOf module:for-react
 */
export interface ListableResults {
  items: KeyValue[];
  metadata?: Record<string, unknown>;
}

/**
 * @description Registry entry for a form service instance.
 * @summary Records the form identifier and the map of its controls, used to
 * look up controls by path.
 * @memberOf module:for-react
 */
export interface FormServiceRegistryEntry {
  id: string;
  controls: Map<string, FormServiceControl>;
}

/**
 * @description Configuration of a tooltip.
 * @summary Defines the tooltip text, placement and optional truncation rules
 * for long content.
 * @memberOf module:for-react
 */
export interface ITooltipConfig {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  truncate?: boolean;
  limit?: number;
  trail?: string;
}
