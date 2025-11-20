import { FieldUpdateMode, KeyValue } from "./types";
import { RgxComponentDirective } from "./RgxComponentDirective";
import { HTML5InputTypes } from "@decaf-ts/ui-decorators";

/**
 * React equivalent of NgxFormFieldDirective providing shared field metadata.
 */
export abstract class RgxFormFieldDirective extends RgxComponentDirective {
  name = "";
  path = "";
  childOf = "";
  type: string = HTML5InputTypes.TEXT;
  placeholder?: string;
  disabled = false;
  readonly = false;
  value?: unknown;
  required = false;
  updateMode: FieldUpdateMode = "change";
  props?: KeyValue;

  constructor(componentName: string) {
    super(componentName);
  }
}
