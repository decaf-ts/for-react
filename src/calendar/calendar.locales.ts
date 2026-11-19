import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { enGB } from "date-fns/locale/en-GB";
import { enAU } from "date-fns/locale/en-AU";
import { enCA } from "date-fns/locale/en-CA";
import { enIE } from "date-fns/locale/en-IE";
import { enNZ } from "date-fns/locale/en-NZ";
import { enZA } from "date-fns/locale/en-ZA";
import { pt } from "date-fns/locale/pt";
import { ptBR } from "date-fns/locale/pt-BR";
import { es } from "date-fns/locale/es";
import { fr } from "date-fns/locale/fr";
import { de } from "date-fns/locale/de";
import { it } from "date-fns/locale/it";
import { nl } from "date-fns/locale/nl";
import { pl } from "date-fns/locale/pl";
import { ru } from "date-fns/locale/ru";
import { uk } from "date-fns/locale/uk";
import { tr } from "date-fns/locale/tr";
import { ar } from "date-fns/locale/ar";
import { he } from "date-fns/locale/he";
import { hi } from "date-fns/locale/hi";
import { ja } from "date-fns/locale/ja";
import { ko } from "date-fns/locale/ko";
import { zhCN } from "date-fns/locale/zh-CN";
import { zhTW } from "date-fns/locale/zh-TW";
import { sv } from "date-fns/locale/sv";
import { da } from "date-fns/locale/da";
import { nb } from "date-fns/locale/nb";
import { fi } from "date-fns/locale/fi";
import { cs } from "date-fns/locale/cs";
import { el } from "date-fns/locale/el";
import { id } from "date-fns/locale/id";
import { ms } from "date-fns/locale/ms";
import { th } from "date-fns/locale/th";
import { vi } from "date-fns/locale/vi";
import { ro } from "date-fns/locale/ro";
import { hu } from "date-fns/locale/hu";
import { bg } from "date-fns/locale/bg";
import { sk } from "date-fns/locale/sk";
import { hr } from "date-fns/locale/hr";
import { sr } from "date-fns/locale/sr";
import { sl } from "date-fns/locale/sl";
import { lt } from "date-fns/locale/lt";
import { lv } from "date-fns/locale/lv";
import { et } from "date-fns/locale/et";

const LOCALES: Record<string, Locale> = {
  en: enGB,
  "en-us": enUS,
  "en-gb": enGB,
  "en-au": enAU,
  "en-ca": enCA,
  "en-ie": enIE,
  "en-nz": enNZ,
  "en-za": enZA,
  pt,
  "pt-pt": pt,
  "pt-br": ptBR,
  es,
  fr,
  de,
  it,
  nl,
  pl,
  ru,
  uk,
  tr,
  ar,
  he,
  hi,
  ja,
  ko,
  "zh-cn": zhCN,
  "zh-tw": zhTW,
  sv,
  da,
  nb,
  fi,
  cs,
  el,
  id,
  ms,
  th,
  vi,
  ro,
  hu,
  bg,
  sk,
  hr,
  sr,
  sl,
  lt,
  lv,
  et,
};

/**
 * @description Normalizes a BCP 47 language tag for locale lookup.
 * @summary Trims surrounding whitespace, converts underscores to hyphens, and
 * lowercases the tag, so `" PT_br "` and `"pt-BR"` both become `"pt-br"`. Empty
 * or falsy input falls back to `"en"`.
 * @param {string} language - BCP 47 language tag, possibly with underscores,
 * mixed case, or surrounding whitespace.
 * @returns {string} The normalized lowercase hyphenated tag, or `"en"` when the
 * input is empty.
 * @function normalizeCalendarLocaleTag
 * @memberOf module:for-react.calendar
 */
export function normalizeCalendarLocaleTag(language: string): string {
  return (language || "en").trim().replace(/_/g, "-").toLowerCase();
}

/**
 * @description Resolves a language tag to a bundled date-fns `Locale` object.
 * @summary Normalizes the tag with {@link normalizeCalendarLocaleTag}, looks up
 * the full tag first, then the base language, and finally falls back to
 * `enGB`. The mapping covers the bundled English variants plus the common
 * European, American, Asian, and Cyrillic locales listed in `LOCALES`; the bare
 * `en` tag resolves to `enGB`.
 * @param {string} language - BCP 47 language tag, for example `"pt-BR"` or
 * `"en_GB"`.
 * @returns {Locale} The matching date-fns locale, or `enGB` when the tag is
 * unknown.
 * @function resolveDateFnsLocale
 * @memberOf module:for-react.calendar
 */
export function resolveDateFnsLocale(language: string): Locale {
  const tag = normalizeCalendarLocaleTag(language);
  if (LOCALES[tag]) {
    return LOCALES[tag];
  }
  const base = tag.split("-")[0];
  return LOCALES[base] ?? enGB;
}
