import type { OrderDirection } from "@decaf-ts/core";
import type { FieldProperties, IPagedComponentProperties, CrudOperationKeys } from "@decaf-ts/ui-decorators";
import type { Model } from "@decaf-ts/decorator-validation";
import type { ComponentType } from "react";
import type { FieldUpdateMode, FormServiceControl, KeyValue, StringOrBoolean } from "./types";

export interface IRenderedModel {
  rendererId?: string;
}

export interface IComponentProperties extends FieldProperties, IPagedComponentProperties {
  model?: Model | string;
  props?: FieldProperties;
  tag?: string;
}

export interface IFormComponentProperties extends IComponentProperties {
  updateMode?: FieldUpdateMode;
  formId?: string;
  operation?: CrudOperationKeys;
}

export interface IComponentConfig {
  component: string;
  inputs: IComponentProperties;
  children?: IComponentConfig[];
}

export interface IFieldSetItem {
  index: number;
  title: string;
  description?: string;
}

export interface IFieldSetValidationEvent {
  formGroup: KeyValue;
  value: unknown;
  isValid: boolean;
}

export interface IFilterQueryItem {
  index?: string;
  condition?: string;
  value?: string;
}

export interface ISortObject {
  value: string;
  direction: OrderDirection;
}

export interface IFilterQuery {
  query: IFilterQueryItem[] | undefined;
  sort: ISortObject;
}

export interface ReactDynamicOutput {
  component?: ComponentType<any>;
  rendererId?: string;
  inputs?: Record<string, unknown>;
  children?: ReactDynamicOutput[];
  formId?: string;
  projectable?: boolean;
}

export interface InputOption {
  text: string;
  value: string | number;
  disabled?: StringOrBoolean;
  className?: string;
  icon?: string;
}

export interface IListComponentRefreshEvent {
  data: KeyValue[];
}

export interface ListItemCustomEvent extends IBaseCustomEvent {
  action: string;
  pk?: string;
}

export interface IBaseCustomEvent {
  name: string;
  component?: string;
  data?: unknown;
  target?: EventTarget | null;
}

export interface IModelPageCustomEvent extends IBaseCustomEvent {
  success: boolean;
  message?: string;
}

export interface I18nResourceConfig {
  prefix: string;
  suffix: string;
}

export interface I18nToken {
  resources: I18nResourceConfig[];
  versionedSuffix: boolean;
}

export interface ICrudFormEvent extends IBaseCustomEvent {
  handlers?: Record<string, unknown>;
}

export interface IPaginationCustomEvent extends IBaseCustomEvent {
  data: {
    page: number;
    direction: "next" | "previous";
  };
}

export interface IMenuItem {
  label: string;
  title?: string;
  url?: string;
  icon?: string;
  color?: string;
}

export interface IFormReactiveSubmitEvent {
  data: Record<string, unknown>;
}

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

export interface IListEmptyOptions {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}

export interface IWindowResizeEvent {
  width: number;
  height: number;
}

export interface IFileUploadError {
  name: string;
  size?: number;
  error: string;
}

export interface ListableResults {
  items: KeyValue[];
  metadata?: Record<string, unknown>;
}

export interface FormServiceRegistryEntry {
  id: string;
  controls: Map<string, FormServiceControl>;
}
