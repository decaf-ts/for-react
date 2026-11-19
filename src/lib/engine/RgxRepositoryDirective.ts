import { Condition, OrderDirection } from "@decaf-ts/core";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Model } from "@decaf-ts/decorator-validation";
import { getModelAndRepository } from "./helpers.js";
import { IFilterQuery } from "./interfaces.js";
import { DecafRepository, KeyValue } from "./types.js";

/**
 * @description Primary key value types handled by the directive.
 * @summary Covers the string, number and bigint identifiers supported by decaf
 * repositories when reading, deleting or paging records.
 * @memberOf module:for-react
 */
export type PrimaryKeyType = string | number | bigint;

/**
 * @description A page of repository results.
 * @summary Pairs the retrieved records with optional paginator metadata so
 * list components can render both data and paging controls.
 * @memberOf module:for-react
 */
export interface RepositoryPage<M> {
  data: M[];
  paginator?: { page: number; limit: number; totalPages?: number };
}

type RepositoryLike = {
  read(id: PrimaryKeyType): Promise<unknown>;
  delete(id: PrimaryKeyType): Promise<unknown>;
  deleteAll(ids: PrimaryKeyType[]): Promise<unknown>;
  query(
    condition: Condition<Model>,
    orderBy: string,
    order?: OrderDirection,
    limit?: number,
    skip?: number
  ): Promise<unknown>;
  create?(model: unknown): Promise<unknown>;
  update?(model: unknown): Promise<unknown>;
  [key: string]: unknown;
};

/**
 * @description Thin React-friendly wrapper around a decaf repository.
 * @summary Resolves a model to its repository and exposes simple read, delete,
 * query and paginate helpers along with the current filter, sort and paging
 * state. Components use it to drive CRUD lists without importing repository
 * plumbing directly.
 * @memberOf module:for-react
 */
export class RgxRepositoryDirective<M extends Model> {
  /**
   * @description Model class or model name this directive operates on.
   * @memberOf module:for-react
   */
  model?: Model | string;
  /**
   * @description Identifier of the currently selected record.
   * @memberOf module:for-react
   */
  modelId: PrimaryKeyType = "";
  /**
   * @description Resolved model name, populated during initialization.
   * @memberOf module:for-react
   */
  modelName?: string;
  /**
   * @description Name of the primary key attribute.
   * @memberOf module:for-react
   */
  pk = "id";
  /**
   * @description Declared type of the primary key (`"string"`, `"number"`, ...).
   * @memberOf module:for-react
   */
  pkType = "string";
  /**
   * @description Explicit query condition used by {@link RgxRepositoryDirective.query}.
   * @memberOf module:for-react
   */
  filter?: Condition<Model>;
  /**
   * @description Attribute the implicit filter condition is built against.
   * @memberOf module:for-react
   */
  filterBy?: string;
  /**
   * @description Current search term or structured filter/sort query.
   * @memberOf module:for-react
   */
  searchValue?: string | IFilterQuery;
  /**
   * @description Current page number used by {@link RgxRepositoryDirective.paginate}.
   * @memberOf module:for-react
   */
  page = 1;
  /**
   * @description Page size used by query and paginate calls.
   * @memberOf module:for-react
   */
  limit = 10;
  /**
   * @description Last loaded payload, either a model, an array of models or raw records.
   * @memberOf module:for-react
   */
  _data?: M | M[] | KeyValue | KeyValue[] = {};
  /**
   * @description Cached result of the most recent query.
   * @memberOf module:for-react
   */
  _query: M[] = [];

  protected _repository?: RepositoryLike;

  /**
   * @description Creates a repository directive, optionally binding a model.
   * @summary When a model is supplied the repository is resolved immediately;
   * otherwise call {@link RgxRepositoryDirective.setModel} later.
   * @param {Model | string} [model] - Model class or registered model name.
   * @memberOf module:for-react
   */
  constructor(model?: Model | string) {
    this.model = model;
    if (model) this.initialize();
  }

  /**
   * @description Resolves and caches the repository for the current model.
   * @summary Looks up the repository and primary key metadata via
   * {@link getModelAndRepository}. It is a no-op when a repository is already
   * resolved or when no model is set.
   * @returns {void}
   * @memberOf module:for-react
   */
  initialize(): void {
    if (this._repository) return;
    const source = this.model || this.modelName;
    if (!source) return;
    const resolved = getModelAndRepository(source as Model | string);
    if (resolved) {
      this._repository = resolved.repository as RepositoryLike;
      this.model = resolved.model;
      this.pk = resolved.pk;
      this.pkType = resolved.pkType;
      this.modelName =
        this.modelName ||
        (typeof this.model === "string"
          ? this.model
          : this.model.constructor.name);
    }
  }

  /**
   * @description Replaces the bound model and re-resolves the repository.
   * @summary Clears the cached repository before initializing against the new
   * model.
   * @param {Model | string} [model] - Model class or registered model name.
   * @returns {void}
   * @memberOf module:for-react
   */
  setModel(model?: Model | string): void {
    this.model = model;
    this._repository = undefined;
    this.initialize();
  }

  /**
   * @description Binds an externally supplied repository.
   * @summary Useful when the repository cannot be resolved from the model name,
   * for example with a custom adapter instance.
   * @param {DecafRepository} repository - Repository to use for subsequent operations.
   * @returns {this} The directive, allowing fluent chaining.
   * @memberOf module:for-react
   */
  from(repository: DecafRepository): this {
    this._repository = repository as RepositoryLike;
    return this;
  }

  /**
   * @description The resolved repository, if any.
   * @summary Triggers lazy initialization on access so the repository is
   * available even when the model was set after construction.
   * @returns {DecafRepository | undefined} The bound repository or `undefined`.
   * @memberOf module:for-react
   */
  get repository(): DecafRepository | undefined {
    this.initialize();
    return this._repository as DecafRepository | undefined;
  }

  protected buildCondition(attr?: keyof M): Condition<Model> {
    this.initialize();
    const attribute = (attr as string) || this.filterBy || this.pk || "id";
    return Condition.attribute<Model>(attribute as keyof Model).eq(
      this.modelId
    );
  }

  /**
   * @description Reloads the cached query result from the repository.
   * @summary Runs {@link RgxRepositoryDirective.query} and stores the result in
   * `_query`. The optional argument is accepted for API symmetry and ignored.
   * @param {unknown} [_model] - Ignored; present for signature compatibility.
   * @returns {Promise<void>} Resolves once the cache is refreshed.
   * @memberOf module:for-react
   */
  async refresh(_model?: unknown): Promise<void> {
    void _model;
    this.initialize();
    if (!this._repository) return;
    this._query = (await this.query()) as M[];
  }

  /**
   * @description Reads a single record by primary key.
   * @summary Delegates to the repository's `read` method and returns the raw
   * result cast to the model type.
   * @param {PrimaryKeyType} uid - Primary key of the record.
   * @returns {Promise<M>} The requested record.
   * @memberOf module:for-react
   */
  async read(uid: PrimaryKeyType): Promise<M> {
    this.initialize();
    return (await this._repository?.read(uid)) as M;
  }

  /**
   * @description Deletes one or more records.
   * @summary A single primary key deletes one record; an array of keys or
   * models is mapped to identifiers and removed with `deleteAll`.
   * @param {PrimaryKeyType | PrimaryKeyType[] | M[]} data - Key, keys or models to delete.
   * @param {PrimaryKeyType} pk - Primary key attribute name used to extract ids from models.
   * @returns {Promise<void>} Resolves when deletion completes.
   * @memberOf module:for-react
   */
  async delete(
    data: PrimaryKeyType | PrimaryKeyType[] | M[],
    pk: PrimaryKeyType
  ): Promise<void> {
    this.initialize();
    if (!this._repository) return;
    if (Array.isArray(data)) {
      const ids = data.map((entry) =>
        typeof entry === "object"
          ? ((entry as unknown as KeyValue)[String(pk)] as PrimaryKeyType)
          : (entry as PrimaryKeyType)
      );
      await this._repository.deleteAll(ids);
      return;
    }
    await this._repository.delete(data as PrimaryKeyType);
  }

  /**
   * @description Queries records from the repository.
   * @summary Uses the supplied condition, or builds one from `modelId` and
   * `filterBy`, then applies sorting and limit/offset paging.
   * @param {Condition<Model>} [condition] - Explicit query condition.
   * @param {string} [sortBy] - Attribute to sort by; defaults to the primary key.
   * @param {OrderDirection} [sortDirection] - Sort direction; defaults to ascending.
   * @param {number} [limit] - Maximum number of records; defaults to {@link RgxRepositoryDirective.limit}.
   * @param {number} [offset] - Number of records to skip; defaults to `0`.
   * @returns {Promise<M[]>} Matching records.
   * @memberOf module:for-react
   */
  async query(
    condition?: Condition<Model>,
    sortBy: keyof M | string = this.pk,
    sortDirection: OrderDirection = OrderDirection.ASC,
    limit = this.limit,
    offset = 0
  ): Promise<M[]> {
    this.initialize();
    if (!this._repository) return [];
    const queryCondition = condition || this.buildCondition();
    return (await this._repository.query(
      queryCondition,
      sortBy as string,
      sortDirection,
      limit,
      offset
    )) as M[];
  }

  /**
   * @description Retrieves a single page of records.
   * @summary Converts the one-based page number into an offset and returns the
   * page data together with paginator metadata.
   * @param {Condition<Model>} [condition] - Explicit query condition.
   * @param {string} [sortBy] - Attribute to sort by; defaults to the primary key.
   * @param {OrderDirection} [sortDirection] - Sort direction; defaults to ascending.
   * @param {number} [page] - One-based page number; defaults to {@link RgxRepositoryDirective.page}.
   * @param {number} [limit] - Page size; defaults to {@link RgxRepositoryDirective.limit}.
   * @returns {Promise<RepositoryPage<M>>} The page of records and its paginator info.
   * @memberOf module:for-react
   */
  async paginate(
    condition?: Condition<Model>,
    sortBy: keyof M | string = this.pk,
    sortDirection: OrderDirection = OrderDirection.ASC,
    page = this.page,
    limit = this.limit
  ): Promise<RepositoryPage<M>> {
    this.initialize();
    if (!this._repository) return { data: [] };
    const offset = Math.max(0, (page - 1) * limit);
    const data = await this.query(
      condition,
      sortBy,
      sortDirection,
      limit,
      offset
    );
    return { data, paginator: { page, limit } };
  }

  protected async transactionBegin(
    repository: DecafRepository,
    data: KeyValue,
    operation: OperationKeys
  ): Promise<unknown> {
    const repo = repository as RepositoryLike;
    if (operation === OperationKeys.CREATE && repo.create) {
      return repo.create(data);
    }
    if (operation === OperationKeys.UPDATE && repo.update) {
      return repo.update(data);
    }
    return undefined;
  }

  protected async transactionEnd(_result?: unknown): Promise<void> {
    void _result;
    return undefined;
  }
}
