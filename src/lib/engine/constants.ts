import { UIKeys } from "@decaf-ts/ui-decorators";
import { VALIDATION_PARENT_KEY } from "@decaf-ts/decorator-validation";
import type { ICrudFormOptions, IListEmptyOptions } from "./interfaces.js";

/**
 * @description Metadata keys used by the React rendering engine.
 * @summary Centralises the property names the engine reads and writes on
 * models, components and metadata, including renderer markers, child
 * definitions, flavour identity and theme state. Consumers should reference
 * these values rather than hard-coding the strings.
 * @memberOf module:for-react
 */
export const ReactEngineKeys = {
  REFLECT: `${UIKeys.REFLECT}.react.`,
  DYNAMIC: "dynamic-component",
  RENDERED: "rendered-as-",
  CHILDREN: "children",
  CHILDREN_DEFINITIONS: "__rgxChildren",
  LISTABLE: "listable",
  RENDER: "render",
  RENDERED_ID: "rendered-as-{0}",
  PARENT: "_parent",
  VALIDATION_PARENT_KEY,
  FLAVOUR: "react",
  LOADED: "engineLoaded",
  DARK_PALETTE_CLASS: "dcf-palette-dark",
} as const;

/**
 * @description Names of the base props shared by engine components.
 * @summary Enumerates the input and state keys (model, locale, primary key,
 * items, operations and so on) that base components read. Use it when
 * forwarding props or matching component inputs by name.
 * @memberOf module:for-react
 */
export enum BaseComponentProps {
  MODEL = "model",
  LOCALE = "locale",
  LOCALE_ROOT = "locale_root",
  PK = "pk",
  ITEMS = "items",
  ROUTE = "route",
  OPERATIONS = "operations",
  UID = "uid",
  TRANSLATABLE = "translatable",
  MAPPER = "mapper",
  INITIALIZED = "initialized",
  COMPONENT_NAME = "componentName",
  PARENT_FORM = "parentForm",
  FORM_GROUP_COMPONENT_PROPS = "componentProps",
}

/**
 * @description CSS class names applied by engine components.
 * @summary Holds the styling hooks emitted by the rendered markup so host
 * applications can target and theme engine output.
 * @memberOf module:for-react
 */
export const CssClasses = {
  BUTTONS_CONTAINER: "buttons-container",
};

/**
 * @description Validation state markers for forms.
 * @summary Used to compare and broadcast whether a form or field is currently
 * valid or invalid, typically when emitting validation events.
 * @memberOf module:for-react
 */
export const FormConstants = {
  VALID: "VALID",
  INVALID: "INVALID",
} as const;

/**
 * @description Names of the events emitted by engine components.
 * @summary Provides the canonical event names for navigation, refresh, input
 * changes, submission, validation and fieldset and theme changes, so listeners
 * can subscribe without hard-coding strings.
 * @memberOf module:for-react
 */
export const ComponentEventNames = {
  BACK_BUTTON_NAVIGATION: "backButtonNavigationEndEvent",
  REFRESH: "RefreshEvent",
  CLICK: "ClickEvent",
  CHANGE: "ChangeEvent",
  SUBMIT: "SubmitEvent",
  VALIDATION_ERROR: "validationErrorEvent",
  FIELDSET_ADD_GROUP: "fieldsetAddGroupEvent",
  FIELDSET_UPDATE_GROUP: "fieldsetUpdateGroupEvent",
  FIELDSET_REMOVE_GROUP: "fieldsetRemoveGroupEvent",
  THEME_CHANGE: "themeChangeEvent",
} as const;

/**
 * @description Navigation directions emitted by routing components.
 * @summary Identifies whether a navigation request goes back, forward or to the
 * root, letting handlers interpret the intent of a route change.
 * @memberOf module:for-react
 */
export enum RouteDirections {
  BACK = "back",
  FORWARD = "forward",
  ROOT = "root",
}

/**
 * @description Available list rendering modes.
 * @summary Selects whether a list loads data incrementally (infinite scroll) or
 * page by page (paginated), driving how the list component fetches data.
 * @memberOf module:for-react
 */
export enum ListComponentsTypes {
  INFINITE = "infinite",
  PAGINATED = "paginated",
}

/**
 * @description Default button configuration for reactive CRUD forms.
 * @summary Supplies the label text for the submit and clear buttons used when a
 * form does not provide its own {@link ICrudFormOptions}.
 * @memberOf module:for-react
 */
export const DefaultFormReactiveOptions: ICrudFormOptions = {
  buttons: {
    submit: {
      text: "Submit",
    },
    clear: {
      text: "Clear",
    },
  },
};

/**
 * @description Default copy for a list's empty state.
 * @summary Provides translated keys for the empty title and subtitle, hides the
 * call-to-action button by default and supplies a fallback icon.
 * @memberOf module:for-react
 */
export const DefaultListEmptyOptions: IListEmptyOptions = {
  title: "empty.title",
  subtitle: "empty.subtitle",
  showButton: false,
  icon: "folder-open-outline",
  buttonText: "locale.empty.button",
  link: "",
};

/**
 * @description Semantic roles assigned to action buttons.
 * @summary Classifies each action (cancel, confirm, submit, clear, back) so
 * styling and behaviour can be applied by role rather than by label.
 * @memberOf module:for-react
 */
export const ActionRoles = {
  cancel: "cancel",
  confirm: "confirm",
  submit: "submit",
  clear: "clear",
  back: "back",
} as const;

/**
 * @description Supported window colour schemes.
 * @summary Identifies light and dark themes (plus an explicit "undefined" value)
 * for theme-aware components and palette switching.
 * @memberOf module:for-react
 */
export const WindowColorSchemes = {
  light: "light",
  dark: "dark",
  undefined: "undefined",
} as const;

/**
 * @description Standard element size tokens.
 * @summary Maps friendly size names to the class-friendly values used by
 * components for sizing controls, icons and layout elements.
 * @memberOf module:for-react
 */
export const ElementSizes = {
  xsmall: "xsmall",
  small: "small",
  medium: "medium",
  default: "default",
  large: "large",
  xLarge: "xlarge",
  "2xLarge": "2xlarge",
  auto: "auto",
  expand: "expand",
  block: "block",
} as const;

/**
 * @description Standard alignment position tokens.
 * @summary Names the horizontal and vertical alignments components accept when
 * laying out their content.
 * @memberOf module:for-react
 */
export const ElementPositions = {
  left: "left",
  center: "center",
  right: "right",
  top: "top",
  bottom: "bottom",
} as const;

/**
 * @description Standard gap tokens for layout grids.
 * @summary Lists the spacing options a grid can use between its cells, from
 * small through collapse to none.
 * @memberOf module:for-react
 */
export const LayoutGridGaps = {
  small: "small",
  medium: "medium",
  large: "large",
  collapse: "collapse",
  none: "",
} as const;

/**
 * @description Slots available in a list item layout.
 * @summary Names the regions (uid, title, description, info, subinfo) into which
 * a list component projects field content.
 * @memberOf module:for-react
 */
export const ListItemPositions = {
  uid: "uid",
  title: "title",
  description: "description",
  info: "info",
  subinfo: "subinfo",
} as const;
