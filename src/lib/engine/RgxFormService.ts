import { escapeHtml, HTML5CheckTypes, HTML5InputTypes, parseToNumber } from "@decaf-ts/ui-decorators";
import { ControlFieldProps } from "./types";
import { ValidatorFactory } from "./ValidatorFactory";

const PARENT_TOKEN = "$parent";

function tokenize(path?: string): string[] {
  return (path || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

export class RgxFormService {
  private static registry = new Map<string, RgxFormService>();

  static get(id?: string): RgxFormService {
    const formId = id ?? "root";
    let form = this.registry.get(formId);
    if (!form) {
      form = new RgxFormService(formId);
      this.registry.set(formId, form);
    }
    return form;
  }

  static remove(id: string): void {
    this.registry.delete(id);
  }

  static mountFormIdPath(renderId: string, path?: string): string {
    return path ? `${renderId}.${path}` : renderId;
  }

  readonly controls = new Map<string, ControlFieldProps | RgxFormService>();
  private values: Record<string, unknown> = {};

  constructor(
    private readonly formId: string,
    private readonly parent?: RgxFormService
  ) {}

  getFormIdPath() {
    return { formId: this.formId };
  }

  getParent(): RgxFormService | undefined {
    return this.parent;
  }

  addChild(id: string): RgxFormService {
    const existing = this.controls.get(id);
    if (existing instanceof RgxFormService) return existing;
    const child = new RgxFormService(id, this);
    this.controls.set(id, child);
    return child;
  }

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
    if (childOf && childOf !== this.getFormIdPath().path) {
      const childForm = this.addChild(childOf);
      return childForm.addFormControl(control);
    }

    // Attach validator if validation keys are present.
    const validatorKeys = Object.keys(control).filter((k) =>
      ValidatorFactory.supportedKeys().includes(k)
    );
    if (validatorKeys.length) {
      const validateFn = ValidatorFactory.validatorsFromProps(control, validatorKeys);
      control.validateFn = validateFn;
    }

    this.controls.set(key, control);
    if (typeof control.defaultValue !== "undefined") {
      this.setInternalValue(control.path || key, control.defaultValue);
    }
    return control;
  }

  getControl(path: string): ControlFieldProps | RgxFormService | undefined {
    const tokens = tokenize(path);
    let current: RgxFormService | undefined = this;
    for (let i = 0; i < tokens.length; i++) {
      const part = tokens[i];
      if (part === PARENT_TOKEN) {
        current = current?.parent;
        continue;
      }
      if (!current) return undefined;
      const control = current.controls.get(part);
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

  submit(): Record<string, unknown> {
    return this.getParsedData();
  }

  reset(): void {
    this.values = {};
  }

  setValue(path: string, value: unknown): void {
    this.setInternalValue(path, value);
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

  getValues(path?: string): unknown {
    if (!path) return this.values;
    return tokenize(path).reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, this.values);
  }

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
            value = parseToNumber(value);
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
