import { Model } from "@decaf-ts/decorator-validation";
import { RgxPageDirective } from "./RgxPageDirective.js";

/**
 * Adds model awareness to the page directive used by stepped forms.
 */
export abstract class RgxModelPageDirective extends RgxPageDirective {
  declare model?: Model | string;

  constructor(componentName: string) {
    super(componentName);
  }
}
