import { Primitives } from "@decaf-ts/decorator-validation";
import { RouteDirections } from "../engine/constants.js";
import { KeyValue } from "../engine/types.js";

function getWindow(): (Window & KeyValue) | undefined {
  return (globalThis as KeyValue)["window"] as (Window & KeyValue) | undefined;
}

function currentUrl(): string {
  return getWindow()?.location?.href || "";
}

function queryParams(): URLSearchParams {
  try {
    return new URL(currentUrl()).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

/**
 * @description Options accepted by {@link RgxRouterService.navigate}.
 * @summary Controls whether the history entry is replaced and the state stored
 * with the new entry.
 * @memberOf module:for-react
 */
export interface RouterNavigateOptions {
  replace?: boolean;
  state?: KeyValue;
}

/**
 * @description React-idiomatic replacement for the Angular router service.
 * @summary Uses the browser History API directly, exposing query-param helpers,
 * navigation helpers and previous-URL tracking that work in any React runtime.
 * @memberOf module:for-react
 */
export class RgxRouterService {
  private previousUrl?: string;

  /**
   * @description Parses query parameters from the current URL.
   * @summary Returns an array of single-key records. When no parameter names are
   * given, every query key is included.
   * @param {string | string[]} [params] - A parameter name or list of names to parse; all keys when omitted.
   * @returns {KeyValue[]} One record per requested parameter, with `null` for missing values.
   * @memberOf module:for-react
   */
  parseAllQueryParams(params?: string | string[]): KeyValue[] {
    const search = queryParams();
    const keys =
      !params
        ? Array.from(search.keys())
        : typeof params === Primitives.STRING
        ? [params as string]
        : (params as string[]);
    return keys.map((param) => ({ [param]: search.get(param) || null }));
  }

  /**
   * @description Checks whether the current URL contains a query parameter.
   * @summary Tests for the presence of the named parameter regardless of its value.
   * @param {string} param - The query parameter name.
   * @returns {boolean} True when the parameter is present.
   * @memberOf module:for-react
   */
  hasQueryParam(param: string): boolean {
    return queryParams().has(param);
  }

  /**
   * @description Returns a single query parameter as a record.
   * @summary Wraps {@link parseAllQueryParams} for a single parameter.
   * @param {string} param - The query parameter name.
   * @returns {KeyValue | undefined} A single-key record for the parameter, or undefined when absent.
   * @memberOf module:for-react
   */
  getQueryParam(param: string): KeyValue | undefined {
    return this.parseAllQueryParams(param)?.[0] || undefined;
  }

  /**
   * @description Returns the raw value of a query parameter.
   * @summary Reads the named parameter directly from the URL search parameters.
   * @param {string} param - The query parameter name.
   * @returns {string | undefined} The parameter value, or undefined when absent.
   * @memberOf module:for-react
   */
  getQueryParamValue(param: string): string | undefined {
    const value = queryParams().get(param);
    return value === null ? undefined : value;
  }

  /**
   * @description Returns the last path segment of the current URL.
   * @summary Splits the full URL on `/` and returns the final segment.
   * @returns {string} The trailing URL segment.
   * @memberOf module:for-react
   */
  getLastUrlSegment(): string {
    const url = currentUrl() || "";
    return url.split("/").pop() as string;
  }

  /**
   * @description Returns the current pathname without a leading slash.
   * @summary Reads `window.location.pathname`, defaulting to `/`, and strips the
   * leading `/`.
   * @returns {string} The current path relative to the site root.
   * @memberOf module:for-react
   */
  getCurrentUrl(): string {
    const url = getWindow()?.location?.pathname || "/";
    return url.replace(/^\//, "");
  }

  /**
   * @description Returns the URL recorded before the last navigation.
   * @summary Returns the value captured by {@link navigate} or {@link backToLastPage}.
   * @returns {string} The previous full URL, or an empty string when unknown.
   * @memberOf module:for-react
   */
  getPreviousUrl(): string {
    return this.previousUrl || "";
  }

  /**
   * @description Navigates to the previous history entry.
   * @summary Records the current URL, dispatches a `BackButtonClickEvent` and asks
   * the browser history to go back. No-op outside a browser environment.
   * @returns {void}
   * @memberOf module:for-react
   */
  backToLastPage(): void {
    const win = getWindow();
    if (!win) return;
    win.dispatchEvent(
      new CustomEvent("BackButtonClickEvent", {
        bubbles: true,
        composed: true,
        cancelable: false,
        detail: { refresh: true },
      })
    );
    this.previousUrl = currentUrl();
    win.history?.back();
  }

  /**
   * @description Navigates to a page using the History API.
   * @summary Pushes or replaces a history entry depending on the direction and
   * options, then dispatches a synthetic `popstate` event. Returns false when the
   * History API is unavailable or the operation throws.
   * @param {string} page - The destination URL.
   * @param {RouteDirections} [direction] - The navigation direction; `BACK` invokes history back and `ROOT` forces a replace.
   * @param {RouterNavigateOptions} [options] - Optional replace flag and history state.
   * @returns {Promise<boolean>} True when the navigation was applied, false otherwise.
   * @memberOf module:for-react
   */
  async navigate(
    page: string,
    direction?: RouteDirections,
    options?: RouterNavigateOptions
  ): Promise<boolean> {
    const win = getWindow();
    if (!win?.history) return false;
    this.previousUrl = currentUrl();
    const replace = options?.replace || direction === RouteDirections.ROOT;
    if (direction === RouteDirections.BACK) {
      win.history.back();
      return true;
    }
    try {
      if (replace) {
        win.history.replaceState(options?.state || {}, "", page);
      } else {
        win.history.pushState(options?.state || {}, "", page);
      }
      win.dispatchEvent(
        new PopStateEvent("popstate", { state: options?.state || {} })
      );
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * @description Shared default router service instance.
 * @summary Used by the providers when no custom router service is supplied.
 * @memberOf module:for-react
 */
export const defaultRouterService = new RgxRouterService();
