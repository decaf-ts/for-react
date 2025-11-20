import { RgxParentComponentDirective } from "./RgxParentComponentDirective";
import { FieldDefinition } from "@decaf-ts/ui-decorators";

/**
 * Tracks pagination metadata for multi-step experiences.
 */
export abstract class RgxPageDirective extends RgxParentComponentDirective {
  page = 1;
  pages: number | FieldDefinition[] = 1;
  activePage?: number;

  constructor(componentName: string) {
    super(componentName);
  }
}
