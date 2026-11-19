import type { I18nResourceConfig } from "../engine/interfaces.js";
import { FunctionLike, KeyValue } from "../engine/types.js";
import { cleanSpaces, getLocaleFromClassName } from "../utils/helpers.js";
import { en } from "./data/en.js";

const libLanguage: Record<string, KeyValue> = {
  en: en as KeyValue,
};

/**
 * @description A single translation resource descriptor or a list of them.
 * @summary Normalises the two shapes accepted by {@link I18nLoader} and
 * {@link provideI18nLoader} so callers may pass one config object or many
 * without branching.
 * @memberOf module:for-react
 */
export type I18nResourceConfigType = I18nResourceConfig | I18nResourceConfig[];

/**
 * @description Resolves the locale/context key for a class, instance or name.
 * @summary Delegates to {@link getLocaleFromClassName} so i18n keys can be
 * derived from a component class consistently across the library.
 * @param {FunctionLike | object | string} clazz - Class, instance or name to derive the context from.
 * @param {string} [suffix] - Optional suffix appended to the derived context.
 * @returns {string} The locale context string for the supplied class.
 * @memberOf module:for-react
 */
export function getLocaleContext(
  clazz: FunctionLike | object | string,
  suffix?: string
): string {
  return getLocaleFromClassName(clazz as unknown as KeyValue, suffix);
}

/**
 * @description Builds a dotted translation key from a locale and a phrase.
 * @summary Returns the phrase untouched when no phrase, no locale, or an
 * already-prefixed phrase is supplied; otherwise prefixes the locale and
 * collapses whitespace into dots.
 * @param {string} locale - Locale prefix to prepend to the phrase.
 * @param {string} [phrase] - Human-readable phrase to convert into a key.
 * @returns {string} The locale-prefixed, dot-separated translation key.
 * @memberOf module:for-react
 */
export function getLocaleContextByKey(locale: string, phrase?: string): string {
  if (!phrase) return locale;
  if (!locale || phrase.includes(`${locale}.`)) return phrase;
  const parts = phrase.split(" ");
  return `${locale}.${cleanSpaces(parts.join("."), true)}`;
}

/**
 * @description Convenience factory for an i18n loader configuration token.
 * @summary Wraps one or more resource descriptors and the versioned-suffix
 * flag into the plain object consumed when the translation loader is mounted.
 * @param {I18nResourceConfigType} [resources=[]] - Resource descriptor(s) to load translations from.
 * @param {boolean} [versionedSuffix=false] - When `true`, cache-busts each resource request with a version query.
 * @returns {object} A configuration object with `resources` and `versionedSuffix` fields.
 * @memberOf module:for-react
 */
export function provideI18nLoader(
  resources: I18nResourceConfigType = [],
  versionedSuffix = false
) {
  const arr = Array.isArray(resources) ? resources : [resources];
  return {
    resources: [...arr],
    versionedSuffix,
  };
}

const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.includes(key);
}

/**
 * @description Deep-merges one translation tree into another.
 * @summary Returns a new object, recursively combining nested objects while
 * letting `source` values win. Prototype-polluting keys (`__proto__`,
 * `constructor`, `prototype`) are skipped, so untrusted payloads cannot alter
 * object prototypes.
 * @param {KeyValue} target - Base translation tree to merge into.
 * @param {KeyValue} source - Overrides to apply on top of `target`.
 * @returns {KeyValue} A new merged translation tree.
 * @memberOf module:for-react
 */
export function mergeTranslations(target: KeyValue, source: KeyValue): KeyValue {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (isUnsafeKey(key)) continue;
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = mergeTranslations(
        (result[key] as KeyValue) || {},
        value as KeyValue
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * @description Fetches, merges and caches translation dictionaries per locale.
 * @summary Loads the library's built-in English dictionary plus every
 * configured remote resource for a language, deep-merges them through
 * {@link mergeTranslations}, and stores the result in {@link I18nLoader.cache}.
 * Failed or non-OK requests contribute an empty object rather than throwing.
 * @memberOf module:for-react
 */
export class I18nLoader {
  /**
   * @description Global switch for translation lookups.
   * @summary When `false`, {@link getTranslation} skips the library defaults and
   * the translation pipes pass values through unchanged.
   * @memberOf module:for-react
   */
  static enabled = true;

  /**
   * @description In-memory dictionary of merged translations keyed by language.
   * @summary Populated by {@link getTranslation} and read by the translation
   * service when resolving keys.
   * @memberOf module:for-react
   */
  static cache: Record<string, KeyValue> = {};

  /**
   * @description Creates a loader bound to a set of resources.
   * @summary Stores the resources and versioning preference used on every
   * subsequent {@link getTranslation} call.
   * @param {I18nResourceConfig[]} [resources=[]] - Remote translation resources to fetch.
   * @param {boolean} [versionedSuffix=false] - Whether to append a cache-busting version to resource URLs.
   * @memberOf module:for-react
   */
  constructor(
    private resources: I18nResourceConfig[] = [],
    private versionedSuffix = false
  ) {}

  /**
   * @description Loads and merges all translations for a language.
   * @summary Resolves the built-in dictionary and configured resources in
   * parallel, merges them with the library keys taking precedence, caches the
   * result under `lang`, and returns it.
   * @param {string} lang - Language code to load (for example `"en"`).
   * @returns {Promise<KeyValue>} The merged translation dictionary for the language.
   * @memberOf module:for-react
   */
  async getTranslation(lang: string): Promise<KeyValue> {
    const libKeys: KeyValue =
      !I18nLoader.enabled ? {} : libLanguage[lang] || libLanguage.en || {};
    const requests = await Promise.all(
      this.resources.map((config) => this.fetchResource(lang, config))
    );

    const merged = requests.reduce<KeyValue>((acc, current) => {
      return mergeTranslations(acc, current);
    }, {});

    const result = mergeTranslations(libKeys, merged);
    I18nLoader.cache[lang] = result;
    return result;
  }

  private async fetchResource(
    lang: string,
    config: I18nResourceConfig
  ): Promise<KeyValue> {
    const suffix = this.versionedSuffix
      ? this.versionSuffix(config.suffix || ".json")
      : config.suffix || ".json";
    try {
      const response = await fetch(`${config.prefix}${lang}${suffix}`);
      if (!response.ok) return {};
      return (await response.json()) as KeyValue;
    } catch {
      return {};
    }
  }

  private versionSuffix(suffix: string): string {
    const today = new Date();
    return `${suffix}?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}`;
  }
}
