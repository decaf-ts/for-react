import { Metadata } from "@decaf-ts/decoration";
import { Model } from "@decaf-ts/decorator-validation";
import { Repository, uses } from "@decaf-ts/core";
import { getOnWindow } from "../utils/helpers.js";
import { DB_ADAPTER_PROVIDER } from "../for-react-common.js";
import { DecafRepository } from "./types.js";

/**
 * @description Re-export of the shared decaf logger factory.
 * @summary Exposes {@link getLogger} from the common module so engine helpers
 * can import their logger from a single entry point.
 * @memberOf module:for-react
 */
export { getLogger } from "../for-react-common.js";

/**
 * @description Resolved model and repository bundle produced by the engine.
 * @summary Carries the repository instance, a materialised model instance and
 * the primary key metadata required to drive CRUD operations.
 * @memberOf module:for-react
 */
export interface IRepositoryModelProps<M extends Model = Model> {
  repository: unknown;
  model: M;
  pk: string;
  pkType: string;
}

/**
 * @description Holder that can be populated with resolved model metadata.
 * @summary Passed to {@link getModelAndRepository} so the caller receives the
 * repository, model instance, primary key and names in place.
 * @memberOf module:for-react
 */
export interface RepositoryAware {
  repository?: DecafRepository;
  model?: Model | string;
  pk?: string;
  modelName?: string;
  pkType?: string;
}

/**
 * @description Reads the configured database adapter flavour from the host window.
 * @summary Returns the flavour registered on the window, or an empty string when
 * no adapter has been provided.
 * @returns {string} The adapter flavour, or `""` when none is registered.
 * @memberOf module:for-react
 */
export function getDbAdapterFlavour(): string {
  return (getOnWindow(DB_ADAPTER_PROVIDER) as string) || "";
}

/**
 * @description Resolves the model constructor, repository and primary key for a
 * model name or instance.
 * @summary Looks up the registered model, applies the active adapter flavour,
 * builds a repository and materialises a model instance. When a
 * {@link RepositoryAware} target is supplied it is populated in place.
 * @param {M | string} model - Model instance or registered model name.
 * @param {RepositoryAware} [clazz] - Optional holder populated with the resolved repository, model, primary key and names.
 * @returns {IRepositoryModelProps<Model> | undefined} The resolved bundle, or `undefined` when the model cannot be resolved.
 * @memberOf module:for-react
 */
export function getModelAndRepository<M extends Model>(
  model: M | string,
  clazz?: RepositoryAware
): IRepositoryModelProps<Model> | undefined {
  if (!model) return undefined;
  try {
    const modelName: string =
      typeof model === "string" ? model : (model as Model).constructor.name;
    const constructor = Model.get(
      modelName.charAt(0).toUpperCase() + modelName.slice(1)
    );
    if (!constructor) return undefined;
    const dbAdapterFlavour = getDbAdapterFlavour();
    if (dbAdapterFlavour) uses(dbAdapterFlavour)(constructor);
    const repository = Repository.forModel(constructor);
    const instance = new constructor() as Model;
    const pk = (repository as unknown as { pk?: string })?.pk || "id";
    if (!pk) return undefined;
    let pkType = "string";
    try {
      pkType = Metadata.type(constructor, pk).name;
    } catch {
      pkType = "string";
    }
    if (clazz) {
      clazz.repository = repository as DecafRepository;
      clazz.model = instance;
      clazz.pk = pk;
      clazz.modelName = modelName;
      clazz.pkType = pkType;
    }
    return { repository, model: instance, pk, pkType };
  } catch {
    return undefined;
  }
}
