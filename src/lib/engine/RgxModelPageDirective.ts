import { Model } from "@decaf-ts/decorator-validation";
import { RgxPageDirective } from "./RgxPageDirective";

/**
 * Adds model awareness to the page directive used by stepped forms.
 */
export abstract class RgxModelPageDirective extends RgxPageDirective {
  model?: Model | string;

  constructor(componentName: string) {
    super(componentName);
  }
}
