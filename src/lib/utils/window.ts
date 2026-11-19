import type { KeyValue } from "../engine/types.js";

/**
 * @description Retrieves the global window object.
 * @summary Provides a safe way to access the global window object. It uses
 * `globalThis` to ensure compatibility across different JavaScript environments
 * and is the core function used by other window-related utilities.
 * @returns {Window} The global window object, augmented with arbitrary properties.
 * @memberOf module:for-react
 */
export function getWindow(): Window & KeyValue {
  return (globalThis as KeyValue)?.["window"] as Window & KeyValue;
}
