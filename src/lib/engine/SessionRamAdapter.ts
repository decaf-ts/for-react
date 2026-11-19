import { RamAdapter, RamConfig, RamStorage } from "@decaf-ts/core/ram";

type Snapshot = Record<string, [string | number, unknown][]>;

/**
 * @description Configuration accepted by {@link SessionRamAdapter}.
 * @summary Extends the core {@link RamConfig} with the localStorage key used to
 * persist the adapter's tables between page reloads.
 * @memberOf module:for-react
 */
export interface SessionRamConfig extends RamConfig {
  dbName?: string;
}

/**
 * @description A RAM adapter that mirrors its tables into `localStorage`.
 * @summary Behaves like the core {@link RamAdapter} in memory, but loads any
 * previously stored snapshot on construction and writes back after every
 * create, update or delete. This lets demo and session-scoped React
 * applications survive a page reload without a real database.
 * @memberOf module:for-react
 */
export class SessionRamAdapter extends RamAdapter {
  private readonly persistentDbName: string;

  /**
   * @description Creates a session-backed RAM adapter.
   * @summary Initialises the underlying RAM adapter and records the
   * `localStorage` key used for persistence. Falls back to `"for-react"` when no
   * database name is supplied.
   * @param {Partial<SessionRamConfig>} conf - Adapter configuration; only `user`
   * and `dbName` are honoured.
   * @param {string} alias - Flavour alias under which the adapter is registered.
   * @memberOf module:for-react
   */
  constructor(
    conf: Partial<SessionRamConfig> = { user: "", dbName: "for-react" },
    alias: string = "session"
  ) {
    super({ user: conf?.user || "" }, alias);
    this.persistentDbName = conf?.dbName || "for-react";
  }

  protected override getClient(): RamStorage {
    const client: RamStorage = new Map();
    let raw: string | null = null;
    try {
      raw = globalThis.localStorage?.getItem(this.persistentDbName) || null;
    } catch {
      return client;
    }
    if (!raw) return client;
    try {
      const snapshot = JSON.parse(raw) as Snapshot;
      if (snapshot && typeof snapshot === "object") {
        for (const [table, records] of Object.entries(snapshot)) {
          if (Array.isArray(records)) client.set(table, new Map(records));
        }
      }
    } catch {
      try {
        globalThis.localStorage?.removeItem(this.persistentDbName);
      } catch {
        // ignore storage cleanup failures
      }
    }
    return client;
  }

  private persistToStorage(): void {
    const snapshot: Snapshot = {};
    for (const [table, records] of this.client.entries()) {
      snapshot[table] = Array.from(records.entries());
    }
    try {
      globalThis.localStorage?.setItem(
        this.persistentDbName,
        JSON.stringify(snapshot)
      );
    } catch {
      // ignore quota / privacy mode failures
    }
  }

  /**
   * @description Creates a record and persists the updated snapshot.
   * @summary Delegates to the parent RAM create, then writes all tables to
   * `localStorage` so the new row survives a reload.
   * @param {string} tableName - Target table.
   * @param {string | number} id - Primary key of the new record.
   * @param {Record<string, unknown>} model - Record payload.
   * @returns {Promise<Record<string, unknown>>} The created record.
   * @memberOf module:for-react
   */
  override async create(
    tableName: string,
    id: string | number,
    model: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = await super.create(tableName, id, model);
    this.persistToStorage();
    return result;
  }

  /**
   * @description Updates a record and persists the updated snapshot.
   * @summary Delegates to the parent RAM update, then writes all tables to
   * `localStorage` so the change survives a reload.
   * @param {string} tableName - Target table.
   * @param {string | number} id - Primary key of the record to update.
   * @param {Record<string, unknown>} model - Updated record payload.
   * @returns {Promise<Record<string, unknown>>} The updated record.
   * @memberOf module:for-react
   */
  override async update(
    tableName: string,
    id: string | number,
    model: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = await super.update(tableName, id, model);
    this.persistToStorage();
    return result;
  }

  /**
   * @description Deletes a record and persists the updated snapshot.
   * @summary Delegates to the parent RAM delete, then writes all tables to
   * `localStorage` so the removal survives a reload.
   * @param {string} tableName - Target table.
   * @param {string | number} id - Primary key of the record to delete.
   * @returns {Promise<Record<string, unknown>>} The deleted record.
   * @memberOf module:for-react
   */
  override async delete(
    tableName: string,
    id: string | number
  ): Promise<Record<string, unknown>> {
    const result = await super.delete(tableName, id);
    this.persistToStorage();
    return result;
  }
}

/**
 * @description Flavour name under which {@link SessionRamAdapter} is registered.
 * @summary Use this value with `Adapter.flavour` or repository lookup helpers
 * when selecting the session-persisted RAM adapter instead of the plain one.
 * @memberOf module:for-react
 */
export const SESSION_RAM_FLAVOUR = "session";
