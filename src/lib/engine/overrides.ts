import { AxiosFlavour, AxiosHttpAdapter, HttpConfig } from "@decaf-ts/for-http";
import type { AxiosRequestConfig } from "axios";
type DirectionLimitOffset = { offset?: number | string; limit?: number | string; bookmark?: number | string };
import { KeyValue } from "./types.js";

/**
 * @description Configuration accepted by {@link DecafAxiosHttpAdapter}.
 * @summary Extends the HTTP config with a toggle for event handling.
 * @memberOf module:for-react
 */
export interface DecafAxiosConfig extends Partial<HttpConfig> {
  events?: boolean;
}

const STATEMENT_KEY = "statement";
const PAGE_BY_KEY = "page";
const FIND_KEY = "find";

/**
 * @description Axios HTTP adapter with decaf pagination and statement handling.
 * @summary Extends {@link AxiosHttpAdapter} to translate decaf statement URLs,
 * track offset bookmarks and inject authentication and JSON headers.
 * @memberOf module:for-react
 */
export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  /** @description Bookmarked offset/limit entries keyed by model. */
  bookmark: Record<string, DirectionLimitOffset[]> = {};
  /** @description When true, event headers are suppressed. */
  static disableEvents = false;
  /** @description Bearer token injected into outgoing requests. */
  static token = "";
  /** @description Identifier of the last received event. */
  static lastEventId?: string;

  /**
   * @description Creates a decaf-aware Axios adapter.
   * @summary Merges the supplied config with default event handling and applies
   * the adapter alias.
   * @param {DecafAxiosConfig} [config] - Adapter configuration and event toggle.
   * @param {string} [alias] - Adapter flavour alias; defaults to {@link AxiosFlavour}.
   * @memberOf module:for-react
   */
  constructor(
    config: DecafAxiosConfig = {},
    alias: string = AxiosFlavour
  ) {
    super(
      {
        eventHeaderResolver: DecafAxiosHttpAdapter.getEventHeaders,
        eventsListenerPath: "/events",
        ...config,
      } as HttpConfig,
      alias
    );
    if (config?.events === false) {
      DecafAxiosHttpAdapter.disableEvents = true;
    }
  }

  /**
   * @description Builds event request headers from the current auth token.
   * @summary Returns an empty object when events are disabled or no token is set,
   * otherwise enables credentials and a bearer authorization header.
   * @returns {KeyValue} Header configuration for event requests.
   * @memberOf module:for-react
   */
  static getEventHeaders(): KeyValue {
    return !this.token || DecafAxiosHttpAdapter.disableEvents
      ? {}
      : {
          withCredentials: true,
          headers: { authorization: `Bearer ${this.token}` },
        };
  }

  /**
   * @description Parses all raw query parameters from a URL.
   * @summary Splits the query string into a plain key/value record.
   * @param {string} url - Absolute URL to inspect.
   * @returns {Record<string, string>} The parsed query parameters.
   * @memberOf module:for-react
   */
  getAllRawQueryParams(url: string): Record<string, string> {
    const query = new URL(url).search.slice(1);
    if (!query) return {};
    const params: Record<string, string> = {};
    for (const pair of query.split("&")) {
      const [key, value = ""] = pair.split("=");
      params[key] = value;
    }
    return params;
  }

  /**
   * @description Derives the bookmark key from a statement URL.
   * @summary Returns the path segment immediately preceding `statement`.
   * @param {string} url - Statement URL to inspect.
   * @returns {string | undefined} The bookmark key, or `undefined` when absent.
   * @memberOf module:for-react
   */
  getBookmarkEntryKey(url: string): string | undefined {
    const parts = url.split("/");
    const index = parts.indexOf(STATEMENT_KEY);
    return index > 0 ? parts[index - 1] : undefined;
  }

  /**
   * @description Records the current pagination parameters for a statement URL.
   * @summary Stores or updates the offset/limit entry for the URL's bookmark key.
   * @param {string} url - Statement URL to bookmark.
   * @returns {void}
   * @memberOf module:for-react
   */
  setOnBookmark(url: string): void {
    const key = this.getBookmarkEntryKey(url);
    if (!key) return;
    if (!this.bookmark[key]) this.bookmark[key] = [];
    const params = this.getAllRawQueryParams(url);
    const offset = Number(params["offset"]);
    const existingIndex = this.bookmark[key].findIndex(
      (item) => Number(item.offset) === offset
    );
    if (existingIndex >= 0) {
      this.bookmark[key][existingIndex] = params as DirectionLimitOffset;
    } else {
      this.bookmark[key].push(params as DirectionLimitOffset);
    }
  }

  /**
   * @description Sets or removes a query parameter on a URL.
   * @summary Deletes the parameter when the value is `undefined`, otherwise sets it.
   * @param {string} url - URL to modify.
   * @param {string} param - Query parameter name.
   * @param {string | undefined} value - Value to set, or `undefined` to remove it.
   * @returns {string} The updated URL.
   * @memberOf module:for-react
   */
  setQueryParam(url: string, param: string, value: string | undefined): string {
    const parsed = new URL(url);
    if (typeof value === "undefined") {
      parsed.searchParams.delete(param);
    } else {
      parsed.searchParams.set(param, value);
    }
    return parsed.toString();
  }

  /**
   * @description Reads a single query parameter from a URL.
   * @summary Returns the parameter value or an empty string when it is absent.
   * @param {string} url - URL to inspect.
   * @param {string} param - Query parameter name.
   * @returns {string} The parameter value, or `""` when missing.
   * @memberOf module:for-react
   */
  getOnQueryParams(url: string, param: string): string {
    return new URL(url).searchParams.get(param) || "";
  }

  /**
   * @description Resolves the bookmark entry matching a URL's offset.
   * @summary Clears the bookmark list for offsets below two and otherwise returns
   * the cached entry for the requested offset.
   * @param {string} url - Statement URL to inspect.
   * @returns {DirectionLimitOffset | undefined} The matching entry, if any.
   * @memberOf module:for-react
   */
  getFromBookmark(url: string): DirectionLimitOffset | undefined {
    const key = this.getBookmarkEntryKey(url);
    if (!key) return undefined;
    const offset = Number(this.getOnQueryParams(url, "offset"));
    if (offset < 2) {
      this.bookmark[key] = [];
      return undefined;
    }
    return this.bookmark[key]?.find((item) => Number(item.offset) === offset);
  }

  /**
   * @description Normalises the bookmark parameter of a statement URL.
   * @summary Aligns the URL's `bookmark` query value with the cached entry for its
   * offset, recording new entries when needed.
   * @param {string} url - Statement URL to normalise.
   * @returns {string} The normalised URL.
   * @memberOf module:for-react
   */
  parseBookmarkURL(url: string): string {
    const offset = Number(this.getOnQueryParams(url, "offset"));
    const cached = this.getFromBookmark(url);
    const bookmark = this.getOnQueryParams(url, "bookmark");
    if (offset < 2) {
      return bookmark ? this.setQueryParam(url, "bookmark", undefined) : url;
    }
    if (!bookmark) {
      return cached?.bookmark
        ? this.setQueryParam(url, "bookmark", String(cached.bookmark))
        : url;
    }
    if (cached?.bookmark && bookmark !== cached.bookmark) {
      return this.setQueryParam(url, "bookmark", String(cached.bookmark));
    }
    this.setOnBookmark(url);
    return url;
  }

  /**
   * @description Rewrites decaf statement URLs into requestable URLs.
   * @summary Removes the `statement` segment, resolves page bookmarks and converts
   * find URLs into directed queries.
   * @param {string} url - Statement URL to rewrite.
   * @returns {string} The rewritten URL.
   * @memberOf module:for-react
   */
  parseStatementURL(url: string): string {
    const urlArray = url.split("/");
    if (!urlArray.includes(STATEMENT_KEY)) return url;
    if (urlArray.includes(PAGE_BY_KEY)) {
      return this.parseBookmarkURL(url);
    }
    if (urlArray.includes(FIND_KEY)) {
      const direction = urlArray.pop();
      const base = urlArray
        .filter((part) => part !== STATEMENT_KEY)
        .join("/");
      return `${base}?direction=${direction}`;
    }
    return urlArray.filter((part) => part !== STATEMENT_KEY).join("/");
  }

  /**
   * @description Performs an HTTP request with decaf overrides applied.
   * @summary Adds bearer authentication, JSON content type for write methods and
   * rewrites statement URLs before delegating to the Axios client.
   * @param {AxiosRequestConfig} details - Request configuration.
   * @returns {Promise<V>} The response body.
   * @memberOf module:for-react
   */
  override async request<V>(details: AxiosRequestConfig): Promise<V> {
    let overrides: AxiosRequestConfig = {};
    if (DecafAxiosHttpAdapter.token) {
      overrides = {
        withCredentials: true,
        headers: { authorization: `Bearer ${DecafAxiosHttpAdapter.token}` },
      };
    }
    if (["PUT", "POST", "PATCH"].includes(details?.method || "")) {
      overrides = {
        ...overrides,
        headers: {
          ...(overrides.headers || {}),
          "Content-Type": "application/json; charset=utf-8",
        },
      };
    }
    return (await this.client.request(
      Object.assign({}, details, { url: this.parseStatementURL(details.url || "") }, overrides)
    )) as unknown as V;
  }
}
