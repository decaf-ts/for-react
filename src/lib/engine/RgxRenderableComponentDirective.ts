import { FieldDefinition } from "@decaf-ts/ui-decorators";
import { KeyValue } from "./types";
import { IBaseCustomEvent } from "./interfaces";
import { RgxComponentDirective } from "./RgxComponentDirective";
import { RgxEventEmitter } from "./RgxEventHandler";

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
