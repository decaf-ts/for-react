import { CrudOperations, OperationKeys } from "@decaf-ts/db-decorators";
import { ICrudFormEvent } from "./interfaces";
import { DefaultFormReactiveOptions } from "./constants";
import { RgxParentComponentDirective } from "./RgxParentComponentDirective";
import { RgxFormService } from "./RgxFormService";
import { RgxEventEmitter } from "./RgxEventHandler";

/**
 * React equivalent of the Angular NgxFormDirective.
 * Manages shared props for CRUD forms and exposes events for submit/reset.
 */
export abstract class RgxFormDirective extends RgxParentComponentDirective {
  operation: CrudOperations = OperationKeys.READ;
  action?: string;
  rendererId?: string;
  options = DefaultFormReactiveOptions;
  allowClear = true;
  formProvider?: RgxFormService;
  submitEvent = new RgxEventEmitter<ICrudFormEvent>();

  constructor(componentName: string) {
    super(componentName);
  }

  protected emitSubmit(data: Record<string, unknown>): void {
    this.submitEvent.emit({
      name: this.action || "submit",
      component: this.componentName,
      data,
    });
  }
}
