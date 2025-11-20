import { UIKeys } from "@decaf-ts/ui-decorators";
import { VALIDATION_PARENT_KEY } from "@decaf-ts/decorator-validation";
import type { ICrudFormOptions, IListEmptyOptions } from "./interfaces";

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

export const CssClasses = {
  BUTTONS_CONTAINER: "buttons-container",
};

export const FormConstants = {
  VALID: "VALID",
  INVALID: "INVALID",
} as const;

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

export enum RouteDirections {
  BACK = "back",
  FORWARD = "forward",
  ROOT = "root",
}

export enum ListComponentsTypes {
  INFINITE = "infinite",
  PAGINATED = "paginated",
}

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

export const DefaultListEmptyOptions: IListEmptyOptions = {
  title: "empty.title",
  subtitle: "empty.subtitle",
  showButton: false,
  icon: "folder-open-outline",
  buttonText: "locale.empty.button",
  link: "",
};

export const ActionRoles = {
  cancel: "cancel",
  confirm: "confirm",
  submit: "submit",
  clear: "clear",
  back: "back",
} as const;

export const WindowColorSchemes = {
  light: "light",
  dark: "dark",
  undefined: "undefined",
} as const;

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

export const ElementPositions = {
  left: "left",
  center: "center",
  right: "right",
  top: "top",
  bottom: "bottom",
} as const;

export const LayoutGridGaps = {
  small: "small",
  medium: "medium",
  large: "large",
  collapse: "collapse",
  none: "",
} as const;

export const ListItemPositions = {
  uid: "uid",
  title: "title",
  description: "description",
  info: "info",
  subinfo: "subinfo",
} as const;
