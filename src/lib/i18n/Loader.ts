import type { I18nResourceConfig } from "../engine/interfaces";
import { FunctionLike, KeyValue } from "../engine/types";
import { cleanSpaces, getLocaleFromClassName } from "../utils/helpers";
import en from "./data/en.json";

const libLanguage: Record<string, KeyValue> = { en };

export type I18nResourceConfigType = I18nResourceConfig | I18nResourceConfig[];

export function getLocaleContext(clazz: FunctionLike | object | string, suffix?: string): string {
  return getLocaleFromClassName(clazz, suffix);
}

export function getLocaleContextByKey(locale: string, phrase?: string): string {
  if (!phrase) return locale;
  if (!locale || phrase.includes(`${locale}.`)) return phrase;
  const parts = phrase.split(" ");
  return `${locale}.${cleanSpaces(parts.join("."), true)}`;
}

export function provideI18nLoader(resources: I18nResourceConfigType = [], versionedSuffix = false) {
  const arr = Array.isArray(resources) ? resources : [resources];
  return {
    resources: [...arr],
    versionedSuffix,
  };
}

export class I18nLoader {
  constructor(private resources: I18nResourceConfig[] = [], private versionedSuffix = false) {}

  async getTranslation(lang: string): Promise<KeyValue> {
    const defaults = libLanguage[lang] || libLanguage.en || {};
    const requests = await Promise.all(
      this.resources.map((config) => this.fetchResource(lang, config))
    );

    const merged = requests.reduce<KeyValue>((acc, current) => {
      return mergeDeep(acc, current);
    }, {});

    return mergeDeep(defaults, merged);
  }

  private async fetchResource(lang: string, config: I18nResourceConfig): Promise<KeyValue> {
    const suffix = this.versionedSuffix ? this.versionSuffix(config.suffix || ".json") : config.suffix || ".json";
    const response = await fetch(`${config.prefix}${lang}${suffix}`);
    if (!response.ok) return {};
    return (await response.json()) as KeyValue;
  }

  private versionSuffix(suffix: string): string {
    const today = new Date();
    return `${suffix}?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}`;
  }
}

function mergeDeep(target: KeyValue, source: KeyValue): KeyValue {
  const result = { ...target };
  Object.keys(source).forEach((key) => {
    if (source[key] && typeof source[key] === "object") {
      result[key] = mergeDeep((result[key] as KeyValue) || {}, source[key] as KeyValue);
    } else {
      result[key] = source[key];
    }
  });
  return result;
}
