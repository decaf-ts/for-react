import { CrudOperations, OperationKeys } from "@decaf-ts/db-decorators";
import { Model, Primitives } from "@decaf-ts/decorator-validation";
import { ComponentEventNames } from "./constants.js";
import { IBaseCustomEvent } from "./interfaces.js";
import { DecafRepository, FunctionLike, KeyValue } from "./types.js";
import { getLocaleContext } from "../i18n/Loader.js";
import { generateRandomValue, cleanSpaces, stringToBoolean } from "../utils/helpers.js";
import { getModelRepository } from "../for-react-common.js";
import { RgxEventEmitter } from "./RgxEventHandler.js";

/**
 * Base class used by the React components to share metadata/events.
 * Mirrors the Angular directive but drops framework-specific dependencies.
 */
export abstract class RgxComponentDirective {
  name?: string;
  childOf?: string;
  uid: string;
  model?: Model | string;
  modelId?: string | number;
  pk = "id";
  mapper: Record<string, string> | FunctionLike = {};
  operations: CrudOperations[] = [OperationKeys.READ];
  operation: CrudOperations = OperationKeys.READ;
  props?: KeyValue;
  locale: string;
  localeRoot = "locale";
  translatable: boolean | string = true;
  className = "";
  initialized = false;
  isDarkMode = false;
  enableDarkMode = true;

  protected repository?: DecafRepository;
  protected eventEmitter = new RgxEventEmitter<IBaseCustomEvent>();

  constructor(protected componentName: string) {
    this.uid = generateRandomValue(12);
    this.locale = getLocaleContext(componentName);
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (this.model) this.resolveRepository();
  }

  protected resolveRepository(): void {
    if (!this.model || typeof this.model === Primitives.STRING) {
      try {
        this.repository = getModelRepository(this.model || "") as DecafRepository;
      } catch {
        this.repository = undefined;
      }
    } else {
      this.repository = getModelRepository(this.model) as DecafRepository;
    }
  }

  setModel(model?: Model | string): void {
    this.model = model;
    if (model) this.resolveRepository();
  }

  translate(value: string, fallback = true): string {
    if (!value) return "";
    if (!this.translatable || stringToBoolean(this.translatable as any) === false) {
      return value;
    }
    const key = cleanSpaces(value, true).replace(/\s+/g, ".");
    const localeKey = `${this.locale}.${key}`;
    return fallback ? localeKey : value;
  }

  emit(event: IBaseCustomEvent): void {
    this.eventEmitter.emit({
      component: event.component ?? this.componentName,
      name: event.name ?? ComponentEventNames.CLICK,
      data: event.data,
      target: event.target,
    });
  }

  onEvent(listener: (event: IBaseCustomEvent) => void): () => void {
    return this.eventEmitter.subscribe(listener);
  }
}
