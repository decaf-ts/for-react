import { FieldDefinition } from "@decaf-ts/ui-decorators";
import { RgxComponentDirective } from "./RgxComponentDirective";
import { KeyValue } from "./types";

/**
 * React equivalent of the Angular NgxParentComponentDirective.
 * Stores layout metadata (children, grid configuration) used by layout-aware components.
 */
export abstract class RgxParentComponentDirective extends RgxComponentDirective {
  children: FieldDefinition[] | KeyValue[] = [];
  parentForm?: KeyValue;
  cols: number | string[] = 1;
  rows: number | KeyValue[] | string[] = 1;
  cardBody: "default" | "small" | "blank" = "default";
  cardType: "clear" | "shadow" = "clear";
  match = false;
  borders = false;
  gap: "small" | "medium" | "large" | "collapse" | "" = "small";

  constructor(componentName: string) {
    super(componentName);
  }

  protected normalizeArray<T>(input: T[] | number | string[]): T[] {
    if (typeof input === "number") {
      return Array.from({ length: input }) as T[];
    }
    return input as T[];
  }
}
