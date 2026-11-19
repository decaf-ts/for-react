import type React from "react";
import type { FieldProperties, FieldDefinition } from "@decaf-ts/ui-decorators";

/**
 * @description Generic string-keyed record used for loosely typed option bags.
 * @summary A convenience alias for `Record<string, unknown>`, used across the
 * engine wherever callers pass arbitrary configuration objects.
 * @memberOf module:for-react
 */
export type KeyValue = Record<string, unknown>;

/**
 * @description Signature for any function value.
 * @summary Accepted wherever the engine only needs to know that a value is
 * callable, for example when resolving a logger or a callback option.
 * @memberOf module:for-react
 */
export type FunctionLike = (...args: unknown[]) => unknown;

/**
 * @description A boolean that may also arrive as the strings `"true"`/`"false"`.
 * @summary Models HTML attribute values that the engine normalises before use.
 * @memberOf module:for-react
 */
export type StringOrBoolean = "true" | "false" | boolean;

/**
 * @description Supported moments at which a field control commits its value.
 * @summary Drives when validation and form-provider updates run for a control.
 * @memberOf module:for-react
 */
export type FieldUpdateMode = "change" | "blur" | "submit";

/**
 * @description React-facing alias of the decaf field definition shape.
 * @summary Pairs {@link FieldDefinition} with {@link FieldProperties} so
 * components can accept the same metadata the decorators emit.
 * @memberOf module:for-react
 */
export type ReactFieldDefinition = FieldDefinition<FieldProperties>;

/**
 * @description Validator that returns an error message for an invalid value.
 * @summary Returns `undefined` when the value passes validation.
 * @memberOf module:for-react
 */
export type ControlValidator = (value: unknown) => string | undefined;

/**
 * @description Per-field validation bookkeeping exposed to controls.
 * @summary Tracks whether a field has been touched or modified and the current
 * validation error, if any.
 * @memberOf module:for-react
 */
export interface FieldValidationState {
  touched: boolean;
  dirty: boolean;
  error?: string;
}

/**
 * @description Aggregate result of validating a form.
 * @summary Reports overall validity plus a path-to-message error map.
 * @memberOf module:for-react
 */
export interface FormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * @description Minimal form-provider contract consumed by CRUD components.
 * @summary Describes the value access, validation and subscription methods a
 * host form service may implement. All optional members allow lightweight
 * adapters that support only the basics.
 * @memberOf module:for-react
 */
export interface FormServiceLike {
  getValues(path?: string): unknown;
  setValue(path: string, value: unknown): void;
  getParsedData(): Record<string, unknown>;
  reset(): void;
  submit(): Record<string, unknown> | null;
  addFormControl?(props: ControlFieldProps): ControlFieldProps;
  getControl?(path: string): unknown;
  validateField?(path: string): string | undefined;
  validateFields?(): FormValidationResult;
  markAsTouched?(path: string): void;
  markAsDirty?(path: string): void;
  getFieldState?(path: string): FieldValidationState | undefined;
  getFieldError?(path: string): string | undefined;
  subscribe?(listener: () => void): () => void;
}

/**
 * @description Internal control descriptor held by a form service.
 * @summary Extends field properties with the control path, parent link and
 * optional validator used to build nested control trees.
 * @memberOf module:for-react
 */
export interface FormServiceControl extends Partial<FieldProperties> {
  name?: string;
  path?: string;
  childOf?: string;
  multiple?: boolean;
  validateFn?: ControlValidator;
  [key: string]: unknown;
}

/**
 * @description Recursive container of form controls.
 * @summary Maps control names to either a {@link FormServiceControl} or a
 * nested {@link FormParent}, supporting arbitrarily deep form structures.
 * @memberOf module:for-react
 */
export type FormParent = {
  controls: Record<string, FormServiceControl | FormParent>;
};

/**
 * @description Selectable option rendered by choice controls.
 * @summary Pairs the display text with the submitted value and an optional
 * disabled flag.
 * @memberOf module:for-react
 */
export type Option = {
  text: string;
  value: string;
  disabled?: boolean;
};

/**
 * @description Public props accepted by a React CRUD field.
 * @summary Extends the decaf field properties with React-specific affordances
 * such as labels, options, a form provider and the current value.
 * @memberOf module:for-react
 */
export interface RgxCrudFieldProps extends Partial<FieldProperties> {
  label?: string;
  placeholder?: string;
  className?: string;
  inline?: boolean;
  description?: string;
  options?: Option[];
  defaultValue?: unknown;
  formProvider?: FormServiceLike;
  children?: React.ReactNode;
  value?: string | number | Date | string[] | number[] | Date[];
  [key: string]: unknown;
}

/**
 * @description Props used when a field is rendered as a registered form control.
 * @summary Carries form- and renderer-scoped identifiers together with child
 * field definitions so nested controls can be materialised by the engine.
 * @memberOf module:for-react
 */
export interface ControlFieldProps extends RgxCrudFieldProps {
  rendererId?: string;
  formId?: string;
  path?: string;
  childOf?: string;
  defaultValue?: unknown;
  childrenDefinitions?: FieldDefinition<any>[];
  validateFn?: ControlValidator;
}

/**
 * @description Opaque alias for a decaf repository reference.
 * @summary Used where components hold a repository without depending on its
 * concrete type.
 * @memberOf module:for-react
 */
export type DecafRepository = unknown;
