import type { FieldProperties, FieldDefinition } from "@decaf-ts/ui-decorators";
import type { Model } from "@decaf-ts/decorator-validation";

export type KeyValue = Record<string, unknown>;

export type FunctionLike = (...args: unknown[]) => unknown;

export type StringOrBoolean = "true" | "false" | boolean;

export type FieldUpdateMode = "change" | "blur" | "submit";

export type ReactFieldDefinition = FieldDefinition<FieldProperties>;

export interface FormServiceControl extends FieldProperties {
  path?: string;
  childOf?: string;
  multiple?: boolean;
}

export type FormParent = {
  controls: Record<string, FormServiceControl | FormParent>;
};

export interface RgxCrudFieldProps extends FieldProperties {
  label?: string;
  placeholder?: string;
  className?: string;
  inline?: boolean;
  options?: Option[];
}

export type Option = {
  text: string;
  value: string;
  disabled?: boolean;
};

export interface ControlFieldProps extends RgxCrudFieldProps {
  rendererId?: string;
  formId?: string;
  path?: string;
  childOf?: string;
  defaultValue?: unknown;
  childrenDefinitions?: FieldDefinition<any>[];
}

export type DecafRepository<M extends Model = Model> = unknown;
