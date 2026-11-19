import {
  escapeHtml,
  HTML5CheckTypes,
  HTML5InputTypes,
  parseToNumber,
} from "@decaf-ts/ui-decorators";
import type { FieldProperties } from "@decaf-ts/ui-decorators";
import {
  ControlFieldProps,
  FieldValidationState,
  FormValidationResult,
} from "./types.js";
import { ValidatorFactory } from "./ValidatorFactory.js";

const PARENT_TOKEN = "$parent";

const NON_VALIDATOR_KEYS = ["type", "design:type"];

const TYPE_VALIDATORS = ["email", "url", "password"];

function tokenize(path?: string): string[] {
  return (path || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @description Runtime form state container for React-rendered decaf fields.
 * @summary Tracks controls, values, validation state and change subscriptions
 * for a form tree and can be composed into nested child forms. Instances are
 * cached by form identifier so rendering and components can share state.
 * @memberOf module:for-react
 */
export class RgxFormService {
  private static registry = new Map<string, RgxFormService>();

  /**
   * @description Retrieves or creates the form service for an identifier.
   * @summary Returns the cached instance for `id` (defaulting to `"root"`),
   * creating and registering a new service when none exists.
   * @param {string} [id] - Form identifier; defaults to `"root"`.
   * @returns {RgxFormService} The matching form service instance.
   */
  static get(id?: string): RgxFormService {
    const formId = id ?? "root";
    let form = this.registry.get(formId);
    if (!form) {
      form = new RgxFormService(formId);
      this.registry.set(formId, form);
    }
    return form;
  }

  /**
   * @description Removes a form service from the registry.
   * @summary Drops the cached instance for `id` so a later
   * {@link RgxFormService.get} creates a fresh service.
   * @param {string} id - Identifier of the form service to remove.
   */
  static remove(id: string): void {
    this.registry.delete(id);
  }

  /**
   * @description Builds a nested renderer identifier.
   * @summary Joins a parent renderer id and an optional child path with a dot,
   * returning the parent id unchanged when no path is supplied.
   * @param {string} renderId - Parent renderer identifier.
   * @param {string} [path] - Optional child path to append.
   * @returns {string} The composed renderer identifier.
   */
  static mountFormIdPath(renderId: string, path?: string): string {
    return path ? `${renderId}.${path}` : renderId;
  }

  /**
   * @description Map of registered controls and nested child forms keyed by name.
   * @summary Entries are either {@link ControlFieldProps} descriptors or nested
   * {@link RgxFormService} instances representing child forms.
   */
  readonly controls = new Map<string, ControlFieldProps | RgxFormService>();
  private values: Record<string, unknown> = {};
  private validation = new Map<string, FieldValidationState>();
  private listeners = new Set<() => void>();
  private revision = 0;

  /**
   * @description Creates a form service for the given identifier.
   * @summary Stores the form id and optional parent link used when resolving
   * `$parent` paths and composing nested forms.
   * @param {string} formId - Identifier for this form service.
   * @param {RgxFormService} [parent] - Optional parent form service.
   */
  constructor(
    private readonly formId: string,
    private readonly parent?: RgxFormService
  ) {}

  /**
   * @description Returns the form identifier wrapped in an object.
   * @summary Convenience accessor for consumers that expect a `formId` payload.
   * @returns {Object} Object containing this form's identifier.
   */
  getFormIdPath() {
    return { formId: this.formId };
  }

  /**
   * @description Returns the parent form service, if any.
   * @summary Exposes the parent link used for `$parent` path resolution.
   * @returns {RgxFormService|undefined} The parent service, or `undefined` for a
   * root form.
   */
  getParent(): RgxFormService | undefined {
    return this.parent;
  }

  /**
   * @description Adds or returns a nested child form.
   * @summary Reuses an existing {@link RgxFormService} stored under `id`, or
   * creates and registers a new child form bound to this service as parent.
   * @param {string} id - Identifier of the child form.
   * @returns {RgxFormService} The existing or newly created child service.
   */
  addChild(id: string): RgxFormService {
    const existing = this.controls.get(id);
    if (existing instanceof RgxFormService) return existing;
    const child = new RgxFormService(id, this);
    this.controls.set(id, child);
    return child;
  }

  /**
   * @description Registers a control and prepares its validation.
   * @summary Normalises the control path and form ids, delegates to child forms
   * when `childOf` points elsewhere, attaches validators derived from supported
   * props and input types, and seeds the control's default value.
   * @param {ControlFieldProps} props - Control descriptor to register.
   * @returns {ControlFieldProps} The normalised control descriptor.
   */
  addFormControl(props: ControlFieldProps): ControlFieldProps {
    const { childOf } = props;
    const tokens = tokenize(props.path ?? props.name ?? "");
    const key = tokens[tokens.length - 1] || props.name || props.path || Math.random().toString(36).slice(2);
    const control: ControlFieldProps = {
      ...props,
      path: props.path || tokens.join("."),
      formId: this.formId,
      rendererId: props.rendererId ?? this.formId,
    };

    // If control belongs to a child form, delegate creation to that form.
    if (childOf && childOf !== this.formId) {
      const childForm = this.addChild(childOf);
      return childForm.addFormControl(control);
    }

    // Attach validators for explicit validation keys and for pattern types
    // (email/url/password) declared through the field `type`.
    const supportedKeys = ValidatorFactory.supportedKeys();
    const validatorKeys = Object.keys(control).filter(
      (k) =>
        supportedKeys.includes(k) &&
        !NON_VALIDATOR_KEYS.includes(k) &&
        control[k] !== undefined &&
        control[k] !== false
    );
    const typeKey = control.type as string | undefined;
    if (
      typeKey &&
      TYPE_VALIDATORS.includes(typeKey) &&
      !validatorKeys.includes(typeKey) &&
      control[typeKey] !== false
    ) {
      validatorKeys.push(typeKey);
    }
    if (validatorKeys.length) {
      const validateFn = ValidatorFactory.validatorsFromProps(
        control as unknown as FieldProperties,
        validatorKeys
      );
      control.validateFn = validateFn;
    }

    this.controls.set(key, control);
    if (typeof control.defaultValue !== "undefined") {
      this.setInternalValue(control.path || key, control.defaultValue);
    }
    return control;
  }

  /**
   * @description Resolves a control by its dotted path.
   * @summary Walks the control tree, following nested form services and the
   * `$parent` token, and returns the matching control or child form.
   * @param {string} path - Dotted control path to resolve.
   * @returns {ControlFieldProps|RgxFormService|undefined} The resolved entry, or
   * `undefined` when not found.
   */
  getControl(path: string): ControlFieldProps | RgxFormService | undefined {
    const tokens = tokenize(path);
    let current: RgxFormService | undefined;
    for (let i = 0; i < tokens.length; i++) {
      const part = tokens[i];
      if (part === PARENT_TOKEN) {
        current = (current ?? this).parent;
        continue;
      }
      const scope = current ?? this;
      const control = scope.controls.get(part);
      if (!control) return undefined;
      if (i === tokens.length - 1) {
        return control;
      }
      if (control instanceof RgxFormService) {
        current = control;
      }
    }
    return undefined;
  }

  /**
   * @description Subscribes to form state changes.
   * @summary Registers a listener invoked whenever values or validation state
   * change.
   * @param {Function} listener - Callback invoked on each change.
   * @returns {Function} Unsubscribe function that removes the listener.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * @description Returns the current revision counter.
   * @summary Monotonically increases on every notification and can be used to
   * detect state changes.
   * @returns {number} The current revision.
   */
  getRevision(): number {
    return this.revision;
  }

  private notify(): void {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }

  private stateFor(path: string): FieldValidationState {
    let state = this.validation.get(path);
    if (!state) {
      state = { touched: false, dirty: false };
      this.validation.set(path, state);
    }
    return state;
  }

  /**
   * @description Returns validation state for a field path.
   * @summary Reports touched, dirty and error state when the field has been
   * observed; otherwise returns `undefined`.
   * @param {string} path - Field path.
   * @returns {FieldValidationState|undefined} Validation state, or `undefined`
   * when the field is unknown.
   */
  getFieldState(path: string): FieldValidationState | undefined {
    return this.validation.get(path);
  }

  /**
   * @description Returns the current error message for a field path.
   * @summary Reads the stored validation error without triggering validation.
   * @param {string} path - Field path.
   * @returns {string|undefined} The error message, if any.
   */
  getFieldError(path: string): string | undefined {
    return this.validation.get(path)?.error;
  }

  /**
   * @description Marks a field as touched.
   * @summary Sets the touched flag and notifies subscribers the first time the
   * field transitions to touched.
   * @param {string} path - Field path.
   */
  markAsTouched(path: string): void {
    const state = this.stateFor(path);
    if (!state.touched) {
      state.touched = true;
      this.notify();
    }
  }

  /**
   * @description Marks a field as dirty.
   * @summary Sets the dirty flag and notifies subscribers the first time the
   * field transitions to dirty.
   * @param {string} path - Field path.
   */
  markAsDirty(path: string): void {
    const state = this.stateFor(path);
    if (!state.dirty) {
      state.dirty = true;
      this.notify();
    }
  }

  /**
   * @description Validates a single field.
   * @summary Runs the control's validator against its current value, stores the
   * resulting error, and returns it.
   * @param {string} path - Field path to validate.
   * @returns {string|undefined} Validation error, or `undefined` when valid or
   * when the path does not resolve to a control.
   */
  validateField(path: string): string | undefined {
    const control = this.getControl(path);
    if (!control || control instanceof RgxFormService) return undefined;
    const error =
      typeof control.validateFn === "function"
        ? control.validateFn(this.getValues(control.path || path))
        : undefined;
    this.updateError(control.path || path, error);
    return error;
  }

  /**
   * @description Validates every control in the form tree.
   * @summary Marks controls touched and dirty, runs their validators, and
   * aggregates any errors into a path-to-message map before notifying
   * subscribers.
   * @returns {FormValidationResult} Overall validity and the collected errors.
   */
  validateFields(): FormValidationResult {
    const errors: Record<string, string> = {};
    this.validateScope("", errors);
    this.notify();
    return { valid: Object.keys(errors).length === 0, errors };
  }

  private validateScope(prefix: string, errors: Record<string, string>): void {
    for (const [key, control] of this.controls) {
      if (control instanceof RgxFormService) {
        control.validateScope(prefix ? `${prefix}.${key}` : key, errors);
        continue;
      }
      const path = control.path || (prefix ? `${prefix}.${key}` : key);
      const state = this.stateFor(path);
      state.touched = true;
      state.dirty = true;
      const error =
        typeof control.validateFn === "function"
          ? control.validateFn(this.getValues(path))
          : undefined;
      state.error = error;
      if (error) errors[path] = error;
    }
  }

  private updateError(path: string, error: string | undefined): void {
    const state = this.stateFor(path);
    const changed = state.error !== error;
    state.error = error;
    if (changed) this.notify();
  }

  /**
   * @description Submits the form.
   * @summary Validates all controls and returns parsed data when valid, or
   * `null` when any field fails validation.
   * @returns {Record<string, unknown>|null} Parsed form data, or `null` when
   * invalid.
   */
  submit(): Record<string, unknown> | null {
    const { valid } = this.validateFields();
    if (!valid) return null;
    return this.getParsedData();
  }

  /**
   * @description Clears values and validation state.
   * @summary Resets stored values, removes all field validation state, and
   * notifies subscribers.
   */
  reset(): void {
    this.values = {};
    this.validation.clear();
    this.notify();
  }

  /**
   * @description Sets a field value by path.
   * @summary Writes the value into the nested values structure and notifies
   * subscribers.
   * @param {string} path - Dotted path of the field.
   * @param {unknown} value - Value to store.
   */
  setValue(path: string, value: unknown): void {
    this.setInternalValue(path, value);
    this.notify();
  }

  private setInternalValue(path: string, value: unknown): void {
    const steps = tokenize(path);
    let ctx: Record<string, unknown> = this.values;
    steps.forEach((step, idx) => {
      if (idx === steps.length - 1) {
        ctx[step] = value;
        return;
      }
      if (typeof ctx[step] !== "object" || ctx[step] === null) {
        ctx[step] = {};
      }
      ctx = ctx[step] as Record<string, unknown>;
    });
  }

  /**
   * @description Reads values from the form.
   * @summary Returns the full value object when no path is given, or resolves a
   * dotted path to its nested value.
   * @param {string} [path] - Optional dotted path to read.
   * @returns {unknown} The full value object, or the value stored at `path`.
   */
  getValues(path?: string): unknown {
    if (!path) return this.values;
    return tokenize(path).reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, this.values);
  }

  /**
   * @description Produces parsed form data for submission.
   * @summary Walks registered controls, applying defaults where values are
   * missing and converting numbers, dates and strings according to control
   * type. Nested child forms are included recursively.
   * @returns {Record<string, unknown>} Parsed form data keyed by control name.
   */
  getParsedData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, control] of this.controls) {
      if (control instanceof RgxFormService) {
        data[key] = control.getParsedData();
        continue;
      }
      let value = this.getValues(control.path ?? key);
      if (typeof value === "undefined" && typeof control.defaultValue !== "undefined") {
        value = control.defaultValue;
      }
      if (!HTML5CheckTypes.includes(control.type || "")) {
        switch (control.type) {
          case HTML5InputTypes.NUMBER:
            value = parseToNumber(value as string | number);
            break;
          case HTML5InputTypes.DATE:
          case HTML5InputTypes.DATETIME_LOCAL:
            value = value ? new Date(value as string) : value;
            break;
          default:
            value = typeof value === "string" ? escapeHtml(value) : value;
        }
      }
      data[key] = value;
    }
    return data;
  }
}
