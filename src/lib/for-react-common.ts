import * as DecafLogging from "@decaf-ts/logging";
import { Repository } from "@decaf-ts/core";
import { Constructor, uses } from "@decaf-ts/decoration";
import { Model } from "@decaf-ts/decorator-validation";
import { InternalError } from "@decaf-ts/db-decorators";
import { FunctionLike, KeyValue } from "./engine/types.js";
import { getWindow } from "./utils/window.js";

/**
 * @description Window key holding the active database adapter flavour.
 * @summary Used as the storage key when the engine records its adapter.
 * @memberOf module:for-react
 */
export const DB_ADAPTER_PROVIDER = "DB_ADAPTER_PROVIDER";
/**
 * @description Injection token for the locale root.
 * @summary Identifies the locale root when wiring internationalisation.
 * @memberOf module:for-react
 */
export const LOCALE_ROOT_TOKEN = Symbol("LOCALE_ROOT_TOKEN");
/**
 * @description Injection token for the i18n configuration.
 * @summary Identifies the i18n configuration object when wiring translations.
 * @memberOf module:for-react
 */
export const I18N_CONFIG_TOKEN = Symbol("I18N_CONFIG_TOKEN");

/**
 * @description Minimal logging contract consumed by the engine.
 * @summary Describes the methods a scoped logger must expose and allows
 * additional provider-specific members.
 * @memberOf module:for-react
 */
export interface Logger {
  for(instance: string | FunctionLike | unknown): Logger;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  [key: string]: unknown;
}

const LoggingRuntime = (DecafLogging as unknown as { Logging?: { for(value: string): Logger } })
  .Logging;

const log: Logger = LoggingRuntime ? LoggingRuntime.for("for-react") : (console as unknown as Logger);

/**
 * @description Collects components for dynamic registration.
 * @summary Returns the supplied constructors unchanged so callers can declare
 * their dynamic component set.
 * @param {...T} components - Component constructors to register.
 * @returns {T[]} The same components that were provided.
 * @memberOf module:for-react
 */
export function provideDynamicComponents<T extends Constructor<unknown>>(...components: T[]): T[] {
  return components;
}

/**
 * @description Creates a scoped logger from the shared decaf logging runtime.
 * @summary Falls back to the console when the logging runtime is unavailable.
 * @param {string | FunctionLike | unknown} instance - Scope used to derive the logger.
 * @returns {Logger} A logger bound to the supplied scope.
 * @memberOf module:for-react
 */
export function getLogger(instance: string | FunctionLike | unknown): Logger {
  return log.for(instance as string | FunctionLike);
}

/**
 * @description Resolves the repository for a registered model.
 * @summary Finds the model constructor, applies the active adapter flavour and
 * returns its repository, wrapping failures in an {@link InternalError}.
 * @param {Model | string} model - Model instance or registered model name.
 * @returns {Repository<Model>} The repository for the model.
 * @throws {InternalError} When the model cannot be resolved or the repository lookup fails.
 * @memberOf module:for-react
 */
export function getModelRepository(model: Model | string) {
  try {
    const modelName: string =
      typeof model === "string" ? model : (model as Model).constructor.name;
    const constructor = Model.get(modelName.charAt(0).toUpperCase() + modelName.slice(1));
    if (!constructor) {
      throw new InternalError(`Cannot find model for ${modelName}. was it registered with @model?`);
    }
    const dbAdapterFlavour = getWindow()?.[DB_ADAPTER_PROVIDER] || undefined;
    if (dbAdapterFlavour) uses(dbAdapterFlavour as string)(constructor);
    const repo = Repository.forModel(constructor);
    return repo;
  } catch (error) {
    throw new InternalError((error as Error)?.message || (error as string));
  }
}

/**
 * @description Instantiates a database adapter and records its flavour.
 * @summary Constructs the adapter, resolves the effective flavour and stores it
 * on the window for later lookups.
 * @param {Constructor<DbAdapter>} adapterClass - Adapter constructor to instantiate.
 * @param {KeyValue} [options] - Constructor options passed to the adapter.
 * @param {string} [flavour] - Optional flavour override; defaults to the adapter's own flavour.
 * @returns {DbAdapter} The constructed adapter.
 * @memberOf module:for-react
 */
export function provideDbAdapter<DbAdapter extends { flavour: string }>(
  adapterClass: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
) {
  const adapter = new adapterClass(options);
  const adapterFlavour = flavour || adapter.flavour;
  getWindow()[DB_ADAPTER_PROVIDER] = adapterFlavour;
  return adapter;
}
