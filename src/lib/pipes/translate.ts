import { useTranslate } from "../services/RgxContext.js";
import { translateKey, TranslateParams } from "../services/RgxTranslateService.js";
import { I18nLoader } from "../i18n/Loader.js";

/**
 * @description Translates a key synchronously using the active dictionary.
 * @summary Returns the input untouched for empty values or when
 * {@link I18nLoader.enabled} is off, otherwise resolves the key and
 * interpolates the optional parameters via the translation service.
 * @param {string} value - Translation key or phrase to resolve.
 * @param {TranslateParams} [args] - Optional interpolation parameters passed to the translation service.
 * @returns {string} The translated string, or the original value when translation is unavailable.
 * @memberOf module:for-react
 */
export function translate(value: string, ...args: [] | [TranslateParams]): string {
  if (!value?.length) return value;
  if (!I18nLoader.enabled) return value;
  return translateKey(value, args[0]);
}

/**
 * @description Hook that translates a key and re-renders on language changes.
 * @summary Subscribes to the translation context through {@link useTranslate}
 * so the component updates when the active language changes. Empty values and
 * a disabled loader short-circuit to the original value.
 * @param {string} value - Translation key or phrase to resolve.
 * @param {TranslateParams} [params] - Optional interpolation parameters.
 * @returns {string} The translated string for the current language.
 * @memberOf module:for-react
 */
export function useTranslated(value: string, params?: TranslateParams): string {
  const t = useTranslate();
  if (!value?.length) return value;
  if (!I18nLoader.enabled) return value;
  return t(value, params);
}
