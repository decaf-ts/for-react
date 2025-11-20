import { Logger, Logging } from "@decaf-ts/logging";
import { Repository, uses } from "@decaf-ts/core";
import { Constructor, Model, Primitives } from "@decaf-ts/decorator-validation";
import { InternalError } from "@decaf-ts/db-decorators";
import { FunctionLike, KeyValue } from "./engine/types";
import { getWindow } from "./utils/helpers";

export const DB_ADAPTER_PROVIDER = "DB_ADAPTER_PROVIDER";
export const LOCALE_ROOT_TOKEN = Symbol("LOCALE_ROOT_TOKEN");
export const I18N_CONFIG_TOKEN = Symbol("I18N_CONFIG_TOKEN");

const log = Logging.for("for-react");

export function provideDynamicComponents<T extends Constructor<unknown>>(...components: T[]): T[] {
  return components;
}

export function getLogger(instance: string | FunctionLike | unknown): Logger {
  return log.for(instance as string | FunctionLike);
}

export function getModelRepository(model: Model | string) {
  try {
    const modelName = typeof model === Primitives.STRING ? model : (model as Model).constructor.name;
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
