import { KeyValue } from "../engine/types.js";
import { I18nLoader } from "../i18n/Loader.js";

/**
 * @description Parameters accepted by translation lookups.
 * @summary Either a named parameter bag, a single positional string, or
 * undefined when the message has no placeholders.
 * @memberOf module:for-react
 */
export type TranslateParams = Record<string, unknown> | string | undefined;

function interpolate(value: string, params?: TranslateParams): string {
  if (!params) return value;
  const normalized: Record<string, unknown> =
    typeof params === "string" ? { "0": params } : params;
  return value
    .replace(/\{\s*([\w.]+)\s*\}/g, (match, key: string) => {
      const resolved = key
        .split(".")
        .reduce<unknown>((acc, part) => {
          if (acc && typeof acc === "object") {
            return (acc as Record<string, unknown>)[part];
          }
          return undefined;
        }, normalized);
      return typeof resolved === "undefined" ? match : String(resolved);
    })
    .replace(/undefined/g, "");
}

function lookup(
  key: string,
  lang: string,
  fallbackLang: string
): string | KeyValue | undefined {
  const sources = [
    I18nLoader.cache[lang],
    I18nLoader.cache[fallbackLang],
    I18nLoader.cache["en"],
  ].filter(Boolean) as KeyValue[];
  for (const source of sources) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key] as string | KeyValue;
    }
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);
    if (typeof value !== "undefined") {
      return value as string | KeyValue;
    }
  }
  return undefined;
}

type TranslateListener = () => void;

/**
 * @description Standalone translation service for the React runtime.
 * @summary Resolves translation keys from the shared i18n loader cache,
 * supports fallback languages, placeholder interpolation and a subscription
 * mechanism compatible with `useSyncExternalStore`.
 * @memberOf module:for-react
 */
export class RgxTranslateService {
  private lang = "en";
  private fallbackLang = "en";
  private version = 0;
  private listeners = new Set<TranslateListener>();

  /**
   * @description Creates a translation service.
   * @summary Initialises the service with the active and fallback language codes.
   * @param {string} [lang='en'] - The initial active language code.
   * @param {string} [fallbackLang='en'] - The language used when a key is missing from the active language.
   * @memberOf module:for-react
   */
  constructor(lang = "en", fallbackLang = "en") {
    this.lang = lang;
    this.fallbackLang = fallbackLang;
  }

  /**
   * @description Indicates whether translations are currently enabled.
   * @summary Mirrors the global {@link I18nLoader} enabled flag; when false,
   * lookups return their keys unchanged.
   * @memberOf module:for-react
   */
  get enabled(): boolean {
    return I18nLoader.enabled;
  }

  /**
   * @description Translates a key synchronously.
   * @summary Returns the interpolated translation for the active language, falling
   * back to the fallback language, then English, and finally the key itself.
   * @param {string} key - The translation key; dot notation is supported.
   * @param {TranslateParams} [params] - Optional interpolation parameters.
   * @returns {string} The translated string, or the key when no translation exists.
   * @memberOf module:for-react
   */
  instant(key: string, params?: TranslateParams): string {
    if (!key) return key;
    if (!this.enabled) return key;
    const value = lookup(key, this.lang, this.fallbackLang);
    if (typeof value === "string") {
      return interpolate(value, params);
    }
    if (value && typeof value === "object") {
      return value as unknown as string;
    }
    return key;
  }

  /**
   * @description Translates a key asynchronously.
   * @summary Resolves the value for the active language and interpolates string
   * results. Object values are returned as-is for bulk translation.
   * @param {string} key - The translation key.
   * @param {TranslateParams} [params] - Optional interpolation parameters.
   * @returns {Promise<string | KeyValue>} The translated string or the resolved object.
   * @memberOf module:for-react
   */
  async translate(
    key: string,
    params?: TranslateParams
  ): Promise<string | KeyValue> {
    if (!key) return key;
    if (!this.enabled) return key;
    const value = lookup(key, this.lang, this.fallbackLang);
    if (typeof value === "string") return interpolate(value, params);
    if (typeof value === "undefined") return key;
    return value;
  }

  /**
   * @description Retrieves one or many translations.
   * @summary Accepts a single key or an array of keys. Array input returns an
   * object keyed by the requested keys.
   * @param {string | string[]} key - A key or list of keys to translate.
   * @param {TranslateParams} [params] - Optional interpolation parameters.
   * @returns {Promise<string | KeyValue>} The translated string, or an object of translations for array input.
   * @memberOf module:for-react
   */
  async get(
    key: string | string[],
    params?: TranslateParams
  ): Promise<string | KeyValue> {
    if (Array.isArray(key)) {
      const result: KeyValue = {};
      key.forEach((item) => {
        result[item] = this.instant(item, params);
      });
      return result;
    }
    return this.translate(key, params);
  }

  /**
   * @description Switches the active language.
   * @summary Updates the active language and notifies subscribers. No-op when the
   * language is empty or already active.
   * @param {string} lang - The language code to activate.
   * @returns {void}
   * @memberOf module:for-react
   */
  use(lang: string): void {
    if (!lang || lang === this.lang) return;
    this.lang = lang;
    this.notify();
  }

  /**
   * @description Sets the fallback language.
   * @summary Stores the language used when keys are missing from the active language
   * and notifies subscribers.
   * @param {string} lang - The fallback language code.
   * @returns {void}
   * @memberOf module:for-react
   */
  setFallbackLang(lang: string): void {
    this.fallbackLang = lang || this.fallbackLang;
    this.notify();
  }

  /**
   * @description Returns the active language code.
   * @summary Reads the language currently used for lookups.
   * @returns {string} The active language code.
   * @memberOf module:for-react
   */
  getCurrentLang(): string {
    return this.lang;
  }

  /**
   * @description Returns the fallback language code.
   * @summary Reads the language used when keys are missing from the active language.
   * @returns {string} The fallback language code.
   * @memberOf module:for-react
   */
  getFallbackLang(): string {
    return this.fallbackLang;
  }

  /**
   * @description Returns the cached translations for a language.
   * @summary Reads the shared loader cache, defaulting to the active language.
   * @param {string} [lang] - The language to read; defaults to the active language.
   * @returns {KeyValue} The cached translation tree, or an empty object when absent.
   * @memberOf module:for-react
   */
  getOnCache(lang?: string): KeyValue {
    return I18nLoader.cache[lang || this.lang] || {};
  }

  /**
   * @description Stores translations in the shared cache.
   * @summary Writes the translation tree for a language and notifies subscribers.
   * @param {string} lang - The language the translations belong to.
   * @param {KeyValue} translations - The translation tree to cache.
   * @returns {void}
   * @memberOf module:for-react
   */
  setCache(lang: string, translations: KeyValue): void {
    I18nLoader.cache[lang] = translations;
    this.notify();
  }

  /**
   * @description Subscribes to translation changes.
   * @summary Registers a listener invoked whenever the language, fallback or cache
   * changes, and returns an unsubscribe function.
   * @param {Function} listener - Callback invoked on changes.
   * @returns {Function} A function that removes the listener.
   * @memberOf module:for-react
   */
  subscribe(listener: TranslateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * @description Returns the current change version.
   * @summary Provides a stable snapshot for `useSyncExternalStore`, incrementing on
   * every notification.
   * @returns {number} The monotonically increasing change version.
   * @memberOf module:for-react
   */
  getSnapshot(): number {
    return this.version;
  }

  private notify(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * @description Shared default translation service instance.
 * @summary Used by the providers and helpers when no custom service is supplied.
 * @memberOf module:for-react
 */
export const defaultTranslateService = new RgxTranslateService();

/**
 * @description Translates a key using the default translation service.
 * @summary Convenience wrapper around {@link defaultTranslateService} for code
 * that runs outside React context.
 * @param {string} key - The translation key.
 * @param {TranslateParams} [params] - Optional interpolation parameters.
 * @returns {string} The translated string, or the key when no translation exists.
 * @memberOf module:for-react
 */
export function translateKey(key: string, params?: TranslateParams): string {
  return defaultTranslateService.instant(key, params);
}
