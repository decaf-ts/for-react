/**
 * @file
 * @summary Translation helper with the mandatory English fallback used by the
 * agent chat surface (React port of the Angular `translateFallback` pipe).
 * @description Resolves `agent.chat.*` keys through the shared for-react i18n
 * runtime (`RgxTranslateService` / `I18nLoader` cache) and returns the supplied
 * fallback whenever the key is missing or not yet loaded, so the chat never
 * renders a raw locale key. Hosts may inject their own resolver through the
 * provider's `translate` prop (e.g. an i18next `t` proxy) with the same
 * contract.
 */
import { RgxTranslateService } from "../../lib/services/RgxTranslateService.js";

/**
 * Resolver contract: returns the translation for `key`, or `fallback` when the
 * key is absent/empty.
 * @memberOf module:for-react.agent
 */
export type AgentChatTranslate = (key: string, fallback: string) => string;

const defaultService = new RgxTranslateService();

/**
 * Default resolver backed by the for-react i18n cache. Missing keys (or a
 * disabled loader) render the fallback, mirroring the Angular pipe.
 *
 * @param key - Translation key (the `agent.chat.*` subtree).
 * @param fallback - Text rendered when the key is absent or empty.
 * @returns The translated string, or the fallback.
 * @memberOf module:for-react.agent
 */
export function defaultAgentChatTranslate(
  key: string,
  fallback: string
): string {
  if (!key) return fallback;
  const translated = defaultService.instant(key);
  return !translated || translated === key ? fallback : translated;
}

/**
 * Resolves one agent chat key through `translate` (or the shared default).
 *
 * @param translate - Host-supplied resolver, or `undefined` for the default.
 * @param key - Translation key.
 * @param fallback - Text rendered when the key is absent or empty.
 * @returns The translated string, or the fallback.
 * @memberOf module:for-react.agent
 */
export function agentChatTranslate(
  translate: AgentChatTranslate | undefined,
  key: string,
  fallback: string
): string {
  return (translate ?? defaultAgentChatTranslate)(key, fallback);
}
