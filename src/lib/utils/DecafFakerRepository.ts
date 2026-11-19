import { faker } from '@faker-js/faker';
import { parseToNumber } from '@decaf-ts/ui-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { uses } from '@decaf-ts/decoration';
import { Repository } from '@decaf-ts/core';
import { DB_ADAPTER_PROVIDER } from '../for-react-common.js';
import { DecafRepository, KeyValue, FunctionLike } from '../engine/types.js';
import { formatDate, getOnWindow } from './helpers.js';

/**
 * @description Generates fake records for a decaf model using faker.
 * @summary Resolves the model (by name or instance), binds it to the configured
 * database adapter flavour and produces randomised, type-aware sample data.
 * Public primary-key overrides can be injected so generated rows reference
 * existing entities. Intended for demos, tests and seeded UI states.
 * @template T - The decaf model type being generated.
 * @memberOf module:for-react
 */
export class DecafFakerRepository<T extends Model> {

  /**
   * @description Last batch of generated records, retained on the instance.
   * @memberOf module:for-react
   */
  protected data: T[] = [];

  /**
   * @description Lazily resolved repository backing the bound model.
   * @memberOf module:for-react
   */
  protected _repository: DecafRepository | undefined = undefined;

  /**
   * @description Creates a generator for a model.
   * @summary Stores the model reference (name or instance) and the default
   * number of records to generate per batch.
   * @param {string | Model} model - Registered model name or model instance.
   * @param {number} [limit=36] - Default number of records generated per batch.
   * @memberOf module:for-react
   */
  constructor(protected model: string | Model, protected limit: number = 36) {}

  /**
   * @description Resolves and caches the repository for the bound model.
   * @summary Looks up the model constructor, applies the adapter flavour found
   * on the window (when present) and obtains a repository via
   * `Repository.forModel`, throwing when the model is not registered.
   * @returns {DecafRepository} The repository bound to the model.
   * @memberOf module:for-react
   */
  protected get repository():  DecafRepository {
    if (!this._repository) {
      const modelName = typeof this.model === 'string' ? this.model : (this.model as Model).constructor.name;
      const constructor = Model.get(modelName);
      if (!constructor)
        throw new InternalError(
          `Cannot find model ${modelName}. was it registered with @model?`,
        );
      try {
        this.model = new constructor();
        const dbAdapterFlavour = getOnWindow(DB_ADAPTER_PROVIDER) || undefined;
        if (dbAdapterFlavour)
          uses(dbAdapterFlavour as string)(constructor);
        this._repository  = Repository.forModel(constructor);
      } catch (error: unknown) {
        throw new InternalError(
          (error as Error)?.message || error as string
        );
      }
    }
    return this._repository;
  }

  /**
   * @description Eagerly resolves the backing repository.
   * @summary Forces repository resolution so later calls do not pay the lookup
   * cost. Safe to call repeatedly; an already-resolved repository is reused.
   * @returns {Promise<void>} Resolves once the repository is ready.
   * @memberOf module:for-react
   */
  public async initialize(): Promise<void> {
    if (!this._repository)
      this._repository = this.repository;
  }

  /**
   * @description Generates a batch of fake records for the bound model.
   * @summary Inspects each property's reflected design type and fills it with a
   * matching faker value, then optionally assigns primary-key values drawn from
   * `pkValues`. When overrides are supplied, duplicate or missing keys are
   * filtered out and values are coerced to the detected key type.
   * @param {KeyValue} [pkValues] - Pool of candidate primary-key values to assign.
   * @param {string} [pk] - Primary-key property name; inferred from the repository when omitted.
   * @param {string} [pkType] - Primary-key type name; read from reflected metadata when omitted.
   * @returns {Promise<T[]>} The generated (and optionally key-stamped) records.
   * @memberOf module:for-react
   */
  async generateData<T extends Model>(pkValues?: KeyValue, pk?: string, pkType?: string): Promise<T[]> {

    const limit = pkValues ? Object.values(pkValues || {}).length - 1 : this.limit;
    if (!pk)
      pk = (this._repository as unknown as { pk?: string })?.pk as string;
    if (!pkType)
      pkType = Reflect.getMetadata("design:type", this.model as unknown as KeyValue, pk).name.toLowerCase();

    const props = Object.keys(this.model as unknown as KeyValue).filter((k) => {
      if (pkType === Primitives.STRING)
        return !['updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k);
      return ![pk, 'updatedBy', 'createdAt', 'createdBy', 'updatedAt'].includes(k)
    });
    const dataProps: Record < string, FunctionLike > = {};
    for (const prop of props) {
      const type = Reflect.getMetadata("design:type", this.model as unknown as KeyValue, prop);
      switch ((type?.name || "").toLowerCase()) {
        case 'string':
          dataProps[prop] = () => `${faker.lorem.word()} ${pk === prop  ? ' - ' + faker.number.int({min: 1, max: 200}) : ''}`;
          break;
        case 'step':
          dataProps[prop] = () => faker.lorem.word();
          break;
        case 'email':
          dataProps[prop] = () => faker.internet.email();
          break;
        case 'number':
          dataProps[prop] = () => faker.number.int({min: 1, max: 5});
          break;
        case 'boolean':
          dataProps[prop] = () => faker.datatype.boolean();
          break;
        case 'date':
          dataProps[prop] = () => faker.date.past();
          break;
        case 'url':
          dataProps[prop] = () => faker.internet.url();
          break;
        case 'array':
          dataProps[prop] = () => faker.lorem.words({min: 2, max: 5}).split(' ');
          break;
      }
    }

    const data = getFakerData < T > (limit, dataProps, typeof this.model === 'string' ? this.model : this.model?.constructor.name);

    if (!pkValues)
      return data;

    const values = Object.values(pkValues as KeyValue);
    const iterated: (string | number)[] = [];

    function getPkValue(item: KeyValue): T {
      if (values.length > 0) {
        const randomIndex = Math.floor(Math.random() * values.length);
        const selected = values.splice(randomIndex, 1)[0];
        const value = pkType === Primitives.STRING ? selected : pkType === Primitives.NUMBER ?
          parseToNumber(selected as string | number) : pkType === Array.name ? [selected] : selected;
        item[pk as string] = value
      }
      if (!iterated.includes(item[pk as string] as string | number)) {
        iterated.push(item[pk as string] as string | number);
        return item as T;
      }
      return undefined as unknown as T;
    }
    const uids = new Set();
    return data
      .map((d) => getPkValue(d as unknown as KeyValue))
      .filter((item) => {
        const record = item as unknown as KeyValue;
        const pkValue = record[pk as string];
        if (!record || uids.has(pkValue) || !pkValue || pkValue === undefined)
          return false;
        uids.add(pkValue);
        return true;
      })
      .filter(Boolean) as T[];
  }
}


/**
 * @description Materialises a list of fake records from generator functions.
 * @summary Invokes each generator in `data` per record, formats `Date` values
 * through {@link formatDate}, and—when a `model` name is given—builds typed
 * model instances via `Model.build`; otherwise returns plain objects.
 * @template T - The model type produced.
 * @param {number} [limit=100] - Number of records to generate.
 * @param {Record<string, FunctionLike>} data - Map of property names to value generators.
 * @param {string} [model] - Optional registered model name used to build real model instances.
 * @returns {T[]} The generated records.
 * @memberOf module:for-react
 */
export function getFakerData<T extends Model>(
  limit = 100,
  data: Record<string, FunctionLike>,
  model?: string,
): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item = {} as T & { id: number; createdAt: Date };
    for (const [key, value] of Object.entries(data)) {
      const val = value() as unknown;
      const typedVal = val as { constructor?: unknown };
      item[key as keyof T] = (typedVal?.constructor === Date
        ? formatDate(val as Date)
        : val) as (T & { id: number; createdAt: Date })[keyof T];
    }
    // if ((item as any)?.['code'])
    //   (item as any).code = `${index}`;
    // item.id = index;
    // item.createdAt = faker.date.past({ refDate: '2025-01-01' });
    index  = index + 1;
    return (!model ? item : Model.build(item, model)) as T;
  });
}
