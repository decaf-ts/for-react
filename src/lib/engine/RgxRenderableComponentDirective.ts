import { FieldDefinition } from "@decaf-ts/ui-decorators";
import { KeyValue } from "./types.js";
import { IBaseCustomEvent } from "./interfaces.js";
import { RgxComponentDirective } from "./RgxComponentDirective.js";
import { RgxEventEmitter } from "./RgxEventHandler.js";

/**
 * Wrapper for components that render child definitions from the rendering engine.
 */
export abstract class RgxRenderableComponentDirective extends RgxComponentDirective {
  globals?: KeyValue;
  listenEvent = new RgxEventEmitter<IBaseCustomEvent>();
  children: FieldDefinition[] = [];

  constructor(componentName: string) {
    super(componentName);
  }

  protected emitChildEvent(event: IBaseCustomEvent): void {
    this.listenEvent.emit(event);
  }
}
